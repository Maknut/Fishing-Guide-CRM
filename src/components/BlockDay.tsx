"use client";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Ban, Undo2 } from "lucide-react";
import { api, errorMessage } from "@/lib/fetcher";
import { Button } from "./ui";
import { Dialog } from "./Dialog";
import { useToast } from "./Toast";

/** Block a day off (with an optional reason), or reopen one that's blocked. */
export function BlockDay({ date, dateLabel, blockedId }: { date: string; dateLabel: string; blockedId: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const pending = busy || refreshing;

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await fn();
      setOpen(false);
      setReason("");
      toast(done);
      startTransition(() => router.refresh());
    } catch (e) {
      toast(errorMessage(e), { type: "error" });
    } finally {
      setBusy(false);
    }
  }

  if (blockedId) {
    return (
      <Button size="sm" pending={pending} icon={<Undo2 size={16} aria-hidden="true" />} onClick={() => run(() => api(`/api/blocked-days/${blockedId}`, { method: "DELETE" }), "Day reopened")}>
        Reopen this day
      </Button>
    );
  }

  return (
    <>
      <Button size="sm" icon={<Ban size={16} aria-hidden="true" />} onClick={() => setOpen(true)}>
        Block day off
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy={titleId}>
        <form
          onSubmit={e => {
            e.preventDefault();
            run(() => api("/api/blocked-days", { body: { date, reason: reason.trim() || undefined } }), "Day blocked off");
          }}
        >
          <h2 id={titleId}>Block off {dateLabel}?</h2>
          <p>No one can be booked that day until you reopen it.</p>
          <div className="field" style={{ marginTop: 20 }}>
            <label htmlFor={`${titleId}-reason`}>Reason <span className="meta">(optional, only you see it)</span></label>
            <input id={`${titleId}-reason`} className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Boat maintenance" maxLength={120} autoFocus />
          </div>
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setOpen(false)}>Keep it open</Button>
            <Button type="submit" variant="primary" pending={pending}>Block day off</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
