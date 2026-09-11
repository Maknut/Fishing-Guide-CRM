// Auth.js (NextAuth v5) — email magic link. Every guide = one tenant.
// The ONLY way API routes get a guideId is through this helper; never from request params.
import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma), // NOTE: requires Auth.js tables added to schema before first run — see README
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Guide row provisioned on first login, keyed by email
      let guide = await prisma.guide.findUnique({ where: { email: user.email! } });
      if (!guide) {
        guide = await prisma.guide.create({
          data: { email: user.email!, name: user.name ?? user.email!.split("@")[0] },
        });
      }
      (session as any).guideId = guide.id;
      return session;
    },
  },
});

export async function requireGuide(): Promise<string> {
  const session = await auth();
  const guideId = (session as any)?.guideId;
  if (!guideId) throw new Response("Unauthorized", { status: 401 });
  return guideId;
}
