import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmail() {
  return (
    <AuthShell>
      <div className="mail-icon"><MailCheck size={26} aria-hidden="true" /></div>
      <h2>Check your email</h2>
      <p>We sent you a sign-in link. Open it on this device to finish signing in. The link works once and expires after 24 hours.</p>
      <p className="fine">
        Nothing after a minute? Look in spam, or <Link href="/signin" className="link">send the link again</Link>.
      </p>
    </AuthShell>
  );
}
