"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ScreenTitle } from "@/components/ScreenTitle";

const TZ = ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"];

export default function Settings() {
  const [g, setG] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { fetch("/api/settings").then(r => r.json()).then(setG); }, []);

  async function searchStations() {
    if (!q.trim()) return;
    setStations(await fetch(`/api/tide-stations?q=${encodeURIComponent(q)}`).then(r => r.json()));
  }

  async function save() {
    setMsg(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: g.name, businessName: g.businessName || null, timezone: g.timezone,
        twilioNumber: g.twilioNumber || null, defaultTideStationId: g.defaultTideStationId || null,
      }),
    });
    setMsg(res.ok ? "Saved ✓" : (await res.json()).error ?? "Save failed");
  }

  if (!g) return <p className="dim">Loading…</p>;
  const set = (k: string) => (e: any) => setG({ ...g, [k]: e.target.value });

  return (
    <>
      <ScreenTitle>Settings</ScreenTitle>

      <div className="card">
        <h2>Your business</h2>
        <label>Your name</label>
        <input value={g.name ?? ""} onChange={set("name")} />
        <label>Business name (shown to clients)</label>
        <input value={g.businessName ?? ""} onChange={set("businessName")} placeholder="Marsh Light Charters" />
        <label>Time zone</label>
        <select value={g.timezone} onChange={set("timezone")}>{TZ.map(t => <option key={t}>{t}</option>)}</select>
      </div>

      <div className="card">
        <h2>Texting</h2>
        <label>Business SMS number</label>
        <input value={g.twilioNumber ?? ""} onChange={set("twilioNumber")} placeholder="+15550102233" />
        <p className="dim" style={{ marginTop: 6 }}>
          This is the dedicated number clients text. Assigned during onboarding — you can't use your personal cell (carrier limitation).
        </p>
      </div>

      <div className="card">
        <h2>Tides</h2>
        <label>Default NOAA tide station</label>
        <input value={g.defaultTideStationId ?? ""} onChange={set("defaultTideStationId")} placeholder="e.g. 8670870" />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input placeholder="Search by town or state (e.g. Savannah, GA)" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && searchStations()} />
          <button className="btn small" onClick={searchStations}>Find</button>
        </div>
        {stations.map(s => (
          <button key={s.id} className="btn small" style={{ display: "block", width: "100%", textAlign: "left", marginTop: 6 }}
            onClick={() => { setG({ ...g, defaultTideStationId: s.id }); setStations([]); }}>
            {s.name}, {s.state} <span className="dim">· #{s.id}</span>
          </button>
        ))}
        <p className="dim" style={{ marginTop: 6 }}>Each trip type can override this with a station closer to its meeting spot.</p>
      </div>

      <div className="card">
        <h2>Email inbox</h2>
        <p className="dim">Connect Gmail or Outlook to see client emails alongside texts. Coming in the next build.</p>
      </div>

      <div className="card">
        <h2>Trip types</h2>
        <Link href="/settings/trip-types" className="btn small">Manage trip types →</Link>
      </div>

      {msg && <p className="dim" style={{ marginBottom: 8 }}>{msg}</p>}
      <button className="btn primary" onClick={save}>Save settings</button>
    </>
  );
}
