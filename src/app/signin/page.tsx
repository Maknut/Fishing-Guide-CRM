import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentGuide } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { SignInForm } from "@/components/SignInForm";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  Verification: "That sign-in link has expired or was already used. Enter your email for a fresh one.",
  Configuration: "Sign-in isn't set up correctly on the server. If you run this site, check the email settings.",
  AccessDenied: "That account isn't allowed to sign in.",
};

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentGuide()) redirect("/dashboard");
  const { error } = await searchParams;

  return (
    <AuthShell>
      <h2>Sign in</h2>
      <p>Enter your email and we'll send a link that signs you in. No password needed.</p>
      <SignInForm initialError={error ? ERRORS[error] ?? "Something went wrong signing you in. Try again." : null} />
      <p className="fine">New here? Enter your email the same way and your account is created the first time you sign in.</p>
    </AuthShell>
  );
}
