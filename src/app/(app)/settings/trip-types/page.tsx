"use client";
import { useEffect, useState } from "react";
import { ScreenTitle } from "@/components/ScreenTitle";

type TT = {
  id?: string; name: string; slot: "AM" | "PM" | "FULL"; durationHours: number; maxAnglers: number;
  meetingSpot: string; meetingLat: number | null; meetingLng: number | null; tideStationId: string | null;
  description: string | null; gearBring: string[]; gearNotBring: string[]; faqs: { q: string; a: string }[];
};

const blank: TT = {
  name: "", slot: "AM", durationHours: 4, maxAnglers: 2, meetingSpot: "", meetingLat: null, meetingLng: null,
  tideStationId: null, description: "", gearBring: [], gearNotBring: [], faqs: [],
};

export default function TripTypes() {
  const [list, setList] = useState<TT[]>([]);
  const [editing, setEditing] = useState<TT | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => fetch("/api/trip-types").then(r => r.json()).then(setList);
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    setMsg(null);
    const { id, ...body } = editing;
    const res = await fetch(id ? `/api/trip-types/${id}` : "/api/trip-types", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        durationHours: Number(body.durationHours), maxAnglers: Number(body.maxAnglers),
        meetingLat: body.meetingLat === null || body.meetingLat === ("" as any) ? undefined : Number(body.meetingLat),
        meetingLng: body.meetingLng === null || body.meetingLng === ("" as any) ? undefined : Number(body.meetingLng),
        tideStationId: body.tideStationId || undefined, description: body.description || undefined,
        faqs: body.faqs.filter(f => f.q.trim()),
        gearBring: body.gearBring.filter(Boolean), gearNotBring: body.gearNotBring.filter(Boolean),
      }),
    });
    if (!res.ok) { setMsg("Save failed — name and meeting spot are required"); return; }
    setEditing(null); load();
  }

  async function archive(id: string) {
    if (!confirm("Archive this trip type? Existing bookings keep it; it just won't be offered for new ones.")) return;
    await fetch(`/api/trip-types/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived: true }) });
    load();
  }

  if (editing) {
    const e = editing;
    const set = (k: keyof TT) => (ev: any) => setEditing({ ...e, [k]: ev.target.value });
    const setList = (k: "gearBring" | "gearNotBring") => (ev: any) => setEditing({ ...e, [k]: ev.target.value.split("\n") });
    return (
      <>
        <ScreenTitle>{e.id ? "Edit trip type" : "New trip type"}</ScreenTitle>
        <div className="card">
          <h2>Basics</h2>
          <label>Name</label><input value={e.name} onChange={set("name")} placeholder="Half-Day Inshore" />
          <label>Slot</label>
          <select value={e.slot} onChange={set("slot")}>
            <option value="AM">AM half-day</option><option value="PM">PM half-day</option><option value="FULL">Full day</option>
          </select>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><label>Hours</label><input type="number" step="0.5" value={e.durationHours} onChange={set("durationHours")} /></div>
            <div style={{ flex: 1 }}><label>Max anglers</label><input type="number" min={1} max={6} value={e.maxAnglers} onChange={set("maxAnglers")} /></div>
          </div>
          <label>Description (shown to clients)</label>
          <textarea rows={2} value={e.description ?? ""} onChange={set("description")} />
        </div>

        <div className="card">
          <h2>Meeting spot</h2>
          <label>Where to meet</label><input value={e.meetingSpot} onChange={set("meetingSpot")} placeholder="North Ramp, Bay Access Rd" />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><label>Latitude</label><input value={e.meetingLat ?? ""} onChange={set("meetingLat")} placeholder="31.9926" /></div>
            <div style={{ flex: 1 }}><label>Longitude</label><input value={e.meetingLng ?? ""} onChange={set("meetingLng")} placeholder="-80.8494" /></div>
          </div>
          <p className="dim" style={{ marginTop: 4 }}>Lat/lng powers the weather forecast and the "Open in Maps" link. Right-click a spot in Google Maps to copy them.</p>
          <label>Tide station override (optional)</label>
          <input value={e.tideStationId ?? ""} onChange={set("tideStationId")} placeholder="Leave blank to use your default" />
        </div>

        <div className="card">
          <h2>What to bring</h2>
          <p className="dim">One item per line.</p>
          <textarea rows={4} value={e.gearBring.join("\n")} onChange={setList("gearBring")} />
          <h2 style={{ marginTop: 12 }}>What NOT to bring</h2>
          <textarea rows={3} value={e.gearNotBring.join("\n")} onChange={setList("gearNotBring")} />
        </div>

        <div className="card">
          <h2>FAQs</h2>
          {e.faqs.map((f, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <input placeholder="Question" value={f.q} onChange={ev => { const faqs = [...e.faqs]; faqs[i] = { ...f, q: ev.target.value }; setEditing({ ...e, faqs }); }} />
              <textarea rows={2} placeholder="Answer" style={{ marginTop: 4 }} value={f.a} onChange={ev => { const faqs = [...e.faqs]; faqs[i] = { ...f, a: ev.target.value }; setEditing({ ...e, faqs }); }} />
            </div>
          ))}
          <button className="btn small" onClick={() => setEditing({ ...e, faqs: [...e.faqs, { q: "", a: "" }] })}>+ Add FAQ</button>
        </div>

        {msg && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 8 }}>{msg}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn primary" onClick={save} disabled={!e.name || !e.meetingSpot}>Save</button>
          <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenTitle>Trip types</ScreenTitle>
      <button className="btn primary" style={{ marginBottom: 12 }} onClick={() => setEditing({ ...blank })}>+ New trip type</button>
      {list.map(t => (
        <div key={t.id} className="card">
          <div className="row">
            <div>
              <div className="title-sm">{t.name} <span className="dim">· {t.slot === "FULL" ? "Full day" : `${t.slot} half`}</span></div>
              <div className="dim">{t.meetingSpot} · {t.durationHours}h · up to {t.maxAnglers}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn small" onClick={() => setEditing(t)}>Edit</button>
              <button className="btn small danger" onClick={() => archive(t.id!)}>Archive</button>
            </div>
          </div>
        </div>
      ))}
      {list.length === 0 && <p className="dim">No trip types yet. Create one — it's the template every booking and trip page is built from.</p>}
    </>
  );
}
