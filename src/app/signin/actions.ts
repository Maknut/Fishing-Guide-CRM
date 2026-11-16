"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createDemoAccount, DemoUnavailable } from "@/lib/demo";
import { emailConfigured, emailLooksLikePlaceholder, signIn } from "@/lib/auth";

export type SignInState = { error: string | null };

export async function sendSignInLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter the email address you use for your guide business." };

  if (!emailConfigured()) {
    return { error: "Sign-in email isn't set up on this site yet. Add EMAIL_SERVER and EMAIL_FROM to the site's environment variables, then redeploy." };
  }

  if (emailLooksLikePlaceholder()) {
    return { error: "The EMAIL_SERVER setting still contains example text instead of a real mail key. Replace it with your Resend API key (it starts with re_), then redeploy." };
  }

  try {
    await signIn("nodemailer", { email, redirectTo: "/dashboard" });
  } catch (e) {
    // A successful send finishes with a redirect to the "check your email" screen; let it through.
    const digest = (e as { digest?: unknown })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
    console.error("[signin] could not send link", e);
    const detail = e instanceof Error ? `${e.name} ${e.message}` : "";
    if (/EAUTH|Invalid login|authentication|535|API key/i.test(detail)) {
      return { error: "The mail service rejected the site's key. Check the Resend API key in EMAIL_SERVER, then redeploy." };
    }
    if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|ESOCKET|timeout|Greeting/i.test(detail)) {
      return { error: "The site couldn't reach its mail service. Check the host and port in EMAIL_SERVER." };
    }
    if (/not authorized|own email|verify a domain|testing emails|403|450|550/i.test(detail)) {
      return { error: "The mail service refused to send to that address. Until a sending domain is verified in Resend, links can only go to the email you signed up to Resend with." };
    }
    return { error: "We couldn't send the sign-in email. Check the address and try again in a minute." };
  }
  return { error: null };
}

/** "Try the demo": make a private sample account and sign the visitor straight in. */
export async function startDemo(_prev: SignInState, _formData: FormData): Promise<SignInState> {
  let session: { sessionToken: string; expires: Date };
  try {
    session = await createDemoAccount();
  } catch (e) {
    if (e instanceof DemoUnavailable) return { error: e.message };
    console.error("[demo] could not create account", e);
    return { error: "The demo couldn't start. Try again in a moment." };
  }

  // Same cookie Auth.js sets after a magic-link sign-in (database sessions).
  const h = await headers();
  const secure = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim() === "https";
  (await cookies()).set(secure ? "__Secure-authjs.session-token" : "authjs.session-token", session.sessionToken, {
    httpOnly: true, sameSite: "lax", path: "/", secure, expires: session.expires,
  });
  redirect("/dashboard");
}
