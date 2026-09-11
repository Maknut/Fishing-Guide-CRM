"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReplyBox({ conversationId, clientId, hasPhone, hasEmail }:
  { conversationId: string; clientId: string; hasPhone: boolean; hasEmail: boolean }) {
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState(hasPhone ? "SMS" : "EMAIL");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function send() {
    if (!body.trim() || busy) return;
    setBusy(true); setErr(null);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, clientId, channel, body }),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error ?? "Send failed"); return; }
    setBody("");
    router.refresh();
  }

  return (
    <div className="card" style={{ position: "sticky", bottom: 74 }}>
      <textarea rows={2} placeholder="Type a message…" value={body} onChange={e => setBody(e.target.value)} />
      {err && <p className="dim" style={{ color: "var(--danger)" }}>{err}</p>}
      <div className="row" style={{ marginTop: 8 }}>
        <select value={channel} onChange={e => setChannel(e.target.value)} style={{ width: "auto" }}>
          {hasPhone && <option value="SMS">Send via SMS</option>}
          {hasEmail && <option value="EMAIL">Send via Email</option>}
        </select>
        <button className="btn primary small" onClick={send} disabled={busy}>{busy ? "Sending…" : "Send"}</button>
      </div>
    </div>
  );
}
