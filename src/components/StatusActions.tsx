"use client";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Check, CircleCheckBig, RotateCcw, X } from "lucide-react";
import { api, errorMessage } from "@/lib/fetcher";
import { Button } from "./ui";
import { Dialog } from "./Dialog";
import { useToast } from "./Toast";

type Status = "INQUIRY" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

const DONE: Record<Status, string> = {
  CONFIRMED: "Booking confirmed",
  COMPLETED: "Marked completed",
  CANCELLED: "Booking cancelled",
  INQUIRY: "Booking restored",
};

/** Move a booking through its life: inquiry, confirmed, completed, or cancelled. */
export function StatusActions({ bookingId, status, clientName }: { bookingId: string; status: Status; clientName: string }) {
  const router = useRouter();
  const toast = useToast();
  const titleId = useId();
  const [target, setTarget] = useState<Status | null>(null);
  const [refreshing, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const busy = target !== null || refreshing;

  async function setStatus(next: Status, undoTo?: Status) {
    if (busy) return;
    setTarget(next);
    try {
      await api(`/api/bookings/${bookingId}`, { method: "PATCH", body: { status: next } });
      setConfirmCancel(false);
      toast(DONE[next], undoTo ? { action: { label: "Undo", onClick: () => setStatus(undoTo) } } : undefined);
      startTransition(() => router.refresh());
    } catch (e) {
      toast(errorMessage(e), { type: "error" });
    } finally {
      setTarget(null);
    }
  }

  return (
    <div className="actions-bar">
      {status === "INQUIRY" && (
        <Button variant="primary" pending={target === "CONFIRMED"} disabled={busy} icon={<Check size={18} aria-hidden="true" />} onClick={() => setStatus("CONFIRMED", "INQUIRY")}>
          Confirm booking
        </Button>
      )}
      {status === "CONFIRMED" && (
        <Button variant="primary" pending={target === "COMPLETED"} disabled={busy} icon={<CircleCheckBig size={18} aria-hidden="true" />} onClick={() => setStatus("COMPLETED", "CONFIRMED")}>
          Mark completed
        </Button>
      )}
      {status === "COMPLETED" && (
        <Button pending={target === "CONFIRMED"} disabled={busy} icon={<RotateCcw size={16} aria-hidden="true" />} onClick={() => setStatus("CONFIRMED")}>
          Reopen booking
        </Button>
      )}
      {status === "CANCELLED" && (
        <Button variant="primary" pending={target === "INQUIRY"} disabled={busy} icon={<RotateCcw size={16} aria-hidden="true" />} onClick={() => setStatus("INQUIRY")}>
          Restore booking
        </Button>
      )}
      {(status === "INQUIRY" || status === "CONFIRMED") && (
        <Button variant="danger" disabled={busy} icon={<X size={18} aria-hidden="true" />} onClick={() => setConfirmCancel(true)}>
          Cancel booking
        </Button>
      )}

      <Dialog open={confirmCancel} onClose={() => setConfirmCancel(false)} labelledBy={titleId}>
        <h2 id={titleId}>Cancel this booking?</h2>
        <p>
          The slot opens back up and {clientName}'s trip page link stops working. {clientName} isn't notified, so let them know. You can restore the booking later if the slot is still free.
        </p>
        <div className="form-actions">
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep booking</Button>
          <Button variant="danger-solid" pending={target === "CANCELLED"} onClick={() => setStatus("CANCELLED")}>Cancel booking</Button>
        </div>
      </Dialog>
    </div>
  );
}
