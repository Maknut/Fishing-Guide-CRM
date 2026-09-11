"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenTitle } from "@/components/ScreenTitle";

export default function NewBooking() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [tripTypes, setTripTypes] = useState<any[]>([]);
  const [form, setForm] = useState({ clientId: "", tripTypeId: "", date: "", slot: "", startTime: "06:00", anglers: 1, notes: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/clients").then(r => r.json()).then(setClients);
    fetch("/api/trip-types").then(r => r.json()).then(setTripTypes);
  }, []);

  const selectedType = tripTypes.find(t => t.id === form.tripTypeId);

  async function submit() {
    setErr(null); setBusy(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        slot: form.slot || undefined,
        anglers: Number(form.anglers),
        notes: form.notes || undefined,
      }),
    });
    setBusy(false);
    const data = await res.json();
    if (!res.ok) { setErr(typeof data.error === "string" ? data.error : "Check the form and try again"); return; }
    router.push(`/bookings/${data.id}`);
  }

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <ScreenTitle>New booking</ScreenTitle>
      <div className="card">
        <label>Client</label>
        <select value={form.clientId} onChange={set("clientId")}>
          <option value="">Select client…</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label>Trip type</label>
        <select value={form.tripTypeId} onChange={set("tripTypeId")}>
          <option value="">Select trip type…</option>
          {tripTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.slot})</option>)}
        </select>

        <label>Date</label>
        <input type="date" value={form.date} onChange={set("date")} />

        {selectedType?.slot !== "FULL" && selectedType && (
          <>
            <label>Slot</label>
            <select value={form.slot || selectedType.slot} onChange={set("slot")}>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </>
        )}

        <label>Start time</label>
        <input type="time" value={form.startTime} onChange={set("startTime")} />

        <label>Anglers</label>
        <input type="number" min={1} max={6} value={form.anglers} onChange={set("anglers")} />

        <label>Internal notes</label>
        <textarea rows={2} value={form.notes} onChange={set("notes")} placeholder="First-timer, wants to target reds…" />

        {err && <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>{err}</p>}
        <button className="btn primary" style={{ marginTop: 14 }} onClick={submit} disabled={busy || !form.clientId || !form.tripTypeId || !form.date}>
          {busy ? "Creating…" : "Create booking"}
        </button>
      </div>
    </>
  );
}
