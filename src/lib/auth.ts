// Auth.js (NextAuth v5): email magic link. Every guide is one tenant.
// The only way a page or API route learns the guideId is through the helpers below,
// never from request params.
import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

declare module "next-auth" {
  interface Session {
    guideId?: string;
  }
}

/** True when the server has what it needs to send sign-in emails. */
export function emailConfigured(): boolean {
  return Boolean(process.env.EMAIL_SERVER && process.env.EMAIL_FROM);
}

/** True when EMAIL_SERVER still holds example text from the setup guide instead of a real key. */
export function emailLooksLikePlaceholder(): boolean {
  return /YOUR[_-]|PASSWORD|<|>/i.test(process.env.EMAIL_SERVER ?? "");
}

/**
 * Turn EMAIL_SERVER ("smtp://user:pass@host:port") into explicit mail settings.
 * Two things the bare URL gets wrong on its own:
 *  - port 465 needs TLS from the first byte; with "smtp://" the mail library would wait
 *    forever for a plain-text greeting that never comes.
 *  - no timeouts, so a bad host or port hangs until the hosting platform kills the request.
 */
export function mailServer(raw = process.env.EMAIL_SERVER ?? "") {
  const timeouts = { connectionTimeout: 6000, greetingTimeout: 6000, socketTimeout: 8000 };
  try {
    const u = new URL(raw);
    const port = Number(u.port) || (u.protocol === "smtps:" ? 465 : 587);
    return {
      host: u.hostname,
      port,
      secure: u.protocol === "smtps:" || port === 465,
      auth: u.username ? { user: decodeURIComponent(u.username), pass: decodeURIComponent(u.password) } : undefined,
      ...timeouts,
    };
  } catch {
    return raw; // not a URL; let the mail library report what's wrong with it
  }
}

// The config is a function so it is read per request, not when the file loads. A build
// (or a preview deploy) without email settings then still succeeds; sign-in simply
// reports that email isn't set up instead of crashing the whole site.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: PrismaAdapter(prisma),
  providers: emailConfigured()
    ? [EmailProvider({ server: mailServer(), from: process.env.EMAIL_FROM })]
    : [],
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/check-email",
    error: "/signin",
  },
  callbacks: {
    async session({ session, user }) {
      // Guide row is provisioned on first login, keyed by email.
      const email = user.email;
      if (!email) return session;
      const guide = await prisma.guide.upsert({
        where: { email },
        update: {},
        create: { email, name: user.name ?? email.split("@")[0] },
        select: { id: true },
      });
      session.guideId = guide.id;
      return session;
    },
  },
}));

/** The signed-in guide, or null. Memoized for the duration of one server render. */
export const currentGuide = cache(async () => {
  // No database configured yet: treat everyone as signed out rather than erroring.
  if (!process.env.DATABASE_URL) return null;
  const session = await auth();
  if (!session?.guideId) return null;
  return prisma.guide.findUnique({ where: { id: session.guideId } });
});

/** For pages: the signed-in guide's full record. Sends signed-out visitors to the sign-in screen. */
export async function requireGuideRecord() {
  const guide = await currentGuide();
  if (!guide) redirect("/signin");
  return guide;
}

/** For pages: just the guide id. */
export async function requireGuide(): Promise<string> {
  return (await requireGuideRecord()).id;
}
