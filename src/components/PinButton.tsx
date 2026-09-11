"use client";
import { useRouter } from "next/navigation";

export function PinButton({ messageId, bookingId, pinned }: { messageId: string; bookingId: string; pinned: boolean }) {
  const router = useRouter();
  async function toggle() {
    await fetch(`/api/messages/${messageId}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: pinned ? null : bookingId }),
    });
    router.refresh();
  }
  return (
    <button onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--dim)", padding: "0 4px", fontFamily: "inherit" }}>
      {pinned ? "unpin" : "📌 pin to trip"}
    </button>
  );
}
