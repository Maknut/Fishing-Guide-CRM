"use client";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { CircleAlert } from "lucide-react";
import { api, errorMessage } from "@/lib/fetcher";
import { fmtPhone, toE164 } from "@/lib/labels";
import { Button } from "./ui";
import { Dialog } from "./Dialog";
import { useToast } from "./Toast";

export type ClientValues = { id?: string; name: string; phone: string | null; email: string | null; tags: string[]; notes: string | null };

const BLANK: ClientValues = { name: "", phone: null, email: null, tags: [], notes: null };

/** Add or edit a client in a dialog. Pass `client` to edit; omit it to create. */
export function ClientForm({ open, onClose, client }: { open: boolean; onClose: () => void; client?: ClientValues }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="client-form-title">
      {/* Remount on open so each visit starts from the saved values. */}
      <ClientFormBody key={client?.id ?? "new"} client={client ?? BLANK} onClose={onClose} />
    </Dialog>
  );
}

function ClientFormBody({ client, onClose }: { client: ClientValues; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const uid = useId();
  const editing = Boolean(client.id);
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(fmtPhone(client.phone));
  const [email, setEmail] = useState(client.email ?? "");
  const [tags, setTags] = useState(client.tags.join(", "));
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    const e164 = phone.trim() ? toE164(phone) : null;
    if (!name.trim()) next.name = "Add the client's name.";
    if (phone.trim() && !e164) next.phone = "Enter a 10-digit US number, like 555 010 2233.";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "That email address doesn't look right.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const tagList = [...new Set(tags.split(",").map(t => t.trim()).filter(Boolean))];
    setBusy(true);
    try {
      if (editing) {
        await api(`/api/clients/${client.id}`, { method: "PATCH", body: { name: name.trim(), phone: e164, email: email.trim() || null, tags: tagList } });
        toast("Client updated");
        onClose();
        startTransition(() => router.refresh());
      } else {
        const created = await api<{ id: string }>("/api/clients", { body: { name: name.trim(), phone: e164 ?? undefined, email: email.trim() || undefined, tags: tagList } });
        toast("Client added");
        onClose();
        router.push(`/clients/${created.id}`);
      }
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 id="client-form-title">{editing ? "Edit client" : "New client"}</h2>

      <div className="field" style={{ marginTop: 20 }}>
        <label htmlFor={`${uid}-name`}>Name</label>
        <input id={`${uid}-name`} className="input" value={name} onChange={e => setName(e.target.value)} autoComplete="off" autoFocus={!editing} aria-invalid={errors.name ? true : undefined} maxLength={120} />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor={`${uid}-phone`}>Mobile number</label>
          <input id={`${uid}-phone`} className="input" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="555 010 2233" autoComplete="off" aria-invalid={errors.phone ? true : undefined} />
          {errors.phone ? <span className="error">{errors.phone}</span> : <span className="hint">Needed to text them.</span>}
        </div>
        <div className="field">
          <label htmlFor={`${uid}-email`}>Email</label>
          <input id={`${uid}-email`} className="input" type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" aria-invalid={errors.email ? true : undefined} />
          {errors.email && <span className="error">{errors.email}</span>}
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${uid}-tags`}>Tags</label>
        <input id={`${uid}-tags`} className="input" value={tags} onChange={e => setTags(e.target.value)} placeholder="repeat, fly, prefers artificials" autoComplete="off" />
        <span className="hint">Separate with commas.</span>
      </div>

      {errors.form && (
        <p className="form-error" role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          <span>{errors.form}</span>
        </p>
      )}

      <div className="form-actions">
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" variant="primary" pending={busy}>{editing ? "Save changes" : "Add client"}</Button>
      </div>
    </form>
  );
}
