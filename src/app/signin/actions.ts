"use server";
import { emailConfigured, signIn } from "@/lib/auth";

export type SignInState = { error: string | null };

export async function sendSignInLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter the email address you use for your guide business." };

  if (!emailConfigured()) {
    return { error: "Sign-in email isn't set up on this site yet. Add EMAIL_SERVER and EMAIL_FROM to the site's environment variables, then redeploy." };
  }

  try {
    await signIn("nodemailer", { email, redirectTo: "/dashboard" });
  } catch (e) {
    // A successful send finishes with a redirect to the "check your email" screen; let it through.
    const digest = (e as { digest?: unknown })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
    console.error("[signin] could not send link", e);
    return { error: "We couldn't send the sign-in email. Check the address and try again in a minute." };
  }
  return { error: null };
}
