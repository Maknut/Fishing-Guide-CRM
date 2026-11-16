import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="fullpage">
      <div className="inner">
        <span style={{ width: 56, height: 56, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--sunk)", color: "var(--ink-3)" }}>
          <Compass size={26} aria-hidden="true" />
        </span>
        <h1>That page doesn't exist</h1>
        <p>The link may be old, or the address has a typo.</p>
        <Link href="/dashboard" className="btn btn--primary"><span>Go to home</span></Link>
      </div>
    </main>
  );
}
