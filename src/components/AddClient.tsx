"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddClient() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    setErr(null);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone ? "+1" + form.phone.replace(/\D/g, "").replace(/^1/, "") : undefined,
        email: form.email || undefined,
      }),
    });
    if (!res.ok) { setErr("Couldn't add client — check phone format (US 10-digit)"); return; }
    setForm({ name: "", phone: "", email: "" });
    setOpen(false);
    router.refresh();
  }

  if (!open) return <button className="btn primary" style={{ marginBottom: 12 }} onClick={() => setOpen(true)}>+ Add client</button>;
  return (
    <div className="card">
      <h2>New client</h2>
      <label>Name</label>
      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <label>Phone (US)</label>
      <input placeholder="555 010 2233" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
      <label>Email</label>
      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      {err && <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 6 }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="btn primary small" onClick={submit} disabled={!form.name}>Save</button>
        <button className="btn small" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
