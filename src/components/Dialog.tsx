"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Modal built on the native <dialog>: focus is trapped, Escape closes it, and the page
 * behind is inert. On phones it presents as a bottom sheet.
 */
export function Dialog({ open, onClose, labelledBy, children }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={labelledBy}
      onClose={onClose}
      onCancel={onClose}
      onClick={e => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === ref.current) onClose();
      }}
    >
      {open && <div className="dialog-body">{children}</div>}
    </dialog>
  );
}
