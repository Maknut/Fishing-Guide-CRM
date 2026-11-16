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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
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
});

/** The signed-in guide, or null. Memoized for the duration of one server render. */
export const currentGuide = cache(async () => {
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
