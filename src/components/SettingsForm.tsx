"use client";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { api, errorMessage } from "@/lib/fetcher";
import { fmtPhone, toE164 } from "@/lib/labels";
import { Button } from "./ui";
import { StationPicker } from "./StationPicker";
import { useToast } from "./Toast";

const ZONES = [
  ["America/New_York", "Eastern"],
  ["America/Chicago", "Central"],
  ["America/Denver", "Mountain"],
  ["America/Phoenix", "Arizona (no daylight saving)"],
  ["America/Los_Angeles", "Pacific"],
  ["America/Anchorage", "Alaska"],
  ["Pacific/Honolulu", "Hawaii"],
] as const;

export type SettingsValues = { name: string; businessName: string; timezone: string; twilioNumber: string | null; defaultTideStationId: string };

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const router = useRouter();
  const toast = useToast();
  const uid = useId();
  const start = { ...initial, phone: fmtPhone(initial.twilioNumber) };
  const [saved, setSaved] = useState(start);
  const [v, setV] = useState(start);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; station?: string }>({});
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const dirty = (Object.keys(v) as (keyof typeof v)[]).some(k => v[k] !== saved[k]);
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV(prev => ({ ...prev, [k]: value }));
  const zones = ZONES.some(([z]) => z === v.timezone) ? ZONES : [...ZONES, [v.timezone, v.timezone] as const];

  async function save() {
    const next: typeof errors = {};
    const e164 = v.phone.trim() ? toE164(v.phone) : null;
    if (!v.name.trim()) next.name = "Add your name.";
    if (v.phone.trim() && !e164) next.phone = "Enter the 10-digit number, like 555 010 2233.";
    if (v.defaultTideStationId && !/^\d{7}$/.test(v.defaultTideStationId)) next.station = "Station IDs are 7 digits. Use Find to look one up.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast("Fix the highlighted fields, then save again.", { type: "error" });
      return;
    }

    setBusy(true);
    try {
      await api("/api/settings", {
        method: "PATCH",
        body: { name: v.name.trim(), businessName: v.businessName.trim() || null, timezone: v.timezone, twilioNumber: e164, defaultTideStationId: v.defaultTideStationId || null },
      });
      const clean = { ...v, name: v.name.trim(), businessName: v.businessName.trim(), phone: fmtPhone(e164), twilioNumber: e164 };
      setSaved(clean);
      setV(clean);
      toast("Settings saved");
      startTransition(() => router.refresh());
    } catch (e) {
      toast(errorMessage(e), { type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (dirty && !busy) save();
      }}
      noValidate
    >
      <div className="settings-grid">
        <section className="settings-section">
          <header>
            <h2>Your business</h2>
            <p>Clients see the business name on their trip page.</p>
          </header>
          <div className="panel panel-pad">
            <div className="field">
              <label htmlFor={`${uid}-name`}>Your name</label>
              <input id={`${uid}-name`} className="input" value={v.name} onChange={e => set("name", e.target.value)} autoComplete="name" aria-invalid={errors.name ? true : undefined} maxLength={120} />
              {errors.name && <span className="error">{errors.name}</span>}
            </div>
            <div className="field">
              <label htmlFor={`${uid}-biz`}>Business name</label>
              <input id={`${uid}-biz`} className="input" value={v.businessName} onChange={e => set("businessName", e.target.value)} placeholder="Marsh Light Charters" autoComplete="organization" maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor={`${uid}-tz`}>Time zone</label>
              <select id={`${uid}-tz`} className="select" value={v.timezone} onChange={e => set("timezone", e.target.value)}>
                {zones.map(([zone, label]) => <option key={zone} value={zone}>{label}</option>)}
              </select>
              <span className="hint">Decides what counts as "today" and how message times are shown.</span>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <header>
            <h2>Texting</h2>
            <p>A dedicated business line. Carriers don't allow apps to send from a personal cell number.</p>
          </header>
          <div className="panel panel-pad">
            <div className="field">
              <label htmlFor={`${uid}-sms`}>Business SMS number</label>
              <input id={`${uid}-sms`} className="input" type="tel" inputMode="tel" value={v.phone} onChange={e => set("phone", e.target.value)} placeholder="555 010 2233" aria-invalid={errors.phone ? true : undefined} />
              {errors.phone ? <span className="error">{errors.phone}</span> : <span className="hint">The Twilio number clients text. It also appears as the "Text your guide" button on trip pages.</span>}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <header>
            <h2>Tides</h2>
            <p>Used for trip pages unless a trip type names a closer station. Leave empty if you only fish fresh water.</p>
          </header>
          <div className="panel panel-pad">
            <StationPicker label="Default NOAA tide station" value={v.defaultTideStationId} onChange={id => set("defaultTideStationId", id)} />
            {errors.station && <span className="error" style={{ display: "block", marginTop: 6, fontSize: "var(--t-13)", color: "var(--danger)" }}>{errors.station}</span>}
          </div>
        </section>
      </div>

      {dirty && (
        <div className="savebar" role="region" aria-label="Unsaved changes">
          <span>Unsaved changes</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setV(saved); setErrors({}); }}>Discard</Button>
            <Button type="submit" size="sm" pending={busy}>Save settings</Button>
          </div>
        </div>
      )}
    </form>
  );
}
