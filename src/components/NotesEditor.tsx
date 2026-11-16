"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { api, errorMessage } from "@/lib/fetcher";
import { Button } from "./ui";
import { useToast } from "./Toast";

/** Private notes that save in place. The Save button only appears once something changes. */
export function NotesEditor({ endpoint, initial, placeholder, label }: { endpoint: string; initial: string; placeholder: string; label: string }) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const dirty = value.trim() !== saved.trim();

  async function save() {
    setBusy(true);
    try {
      await api(endpoint, { method: "PATCH", body: { notes: value.trim() || null } });
      setSaved(value);
      toast("Notes saved");
      startTransition(() => router.refresh());
    } catch (e) {
      toast(errorMessage(e), { type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <textarea className="textarea" rows={4} value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} aria-label={label} maxLength={4000} />
      {dirty && (
        <div className="form-actions" style={{ marginTop: 12 }}>
          <Button size="sm" variant="primary" pending={busy} onClick={save}>Save notes</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setValue(saved)}>Discard</Button>
        </div>
      )}
    </div>
  );
}
