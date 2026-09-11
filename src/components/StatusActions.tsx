"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export function StatusActions({ bookingId, status, tripSlug, clientConversationId }:
  { bookingId: string; status: string; tripSlug: string | null; clientConversationId: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: string) {
    if (busy) return;
    if (next === "CANCELLED" && !confirm("Cancel this booking? The trip page link will stop working.")) return;
    setBusy(true);
    await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {status === "INQUIRY" && <button className="btn primary small" onClick={() => setStatus("CONFIRMED")} disabled={busy}>Confirm booking</button>}
      {status === "CONFIRMED" && <button className="btn small" onClick={() => setStatus("COMPLETED")} disabled={busy}>Mark completed</button>}
      {tripSlug && <Link href={`/trip/${tripSlug}`} className="btn small" target="_blank">View trip page</Link>}
      {tripSlug && <ShareTripPage slug={tripSlug} conversationId={clientConversationId} />}
      {(status === "INQUIRY" || status === "CONFIRMED") && <button className="btn small danger" onClick={() => setStatus("CANCELLED")} disabled={busy}>Cancel</button>}
    </div>
  );
}

function ShareTripPage({ slug, conversationId }: { slug: string; conversationId: string | null }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/trip/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return <button className="btn small" onClick={copy}>{copied ? "Copied ✓" : "Copy trip page link"}</button>;
}
