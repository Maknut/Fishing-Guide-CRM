"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Archive, CircleAlert, Plus, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/fetcher";
import { Button } from "./ui";
import { Dialog } from "./Dialog";
import { StationPicker } from "./StationPicker";
import { useToast } from "./Toast";

export type TripTypeValues = {
  id?: string;
  name: string;
  slot: "AM" | "PM" | "FULL";
  durationHours: number;
  maxAnglers: number;
  meetingSpot: string;
  meetingLat: number | null;
  meetingLng: number | null;
  tideStationId: string | null;
  description: string | null;
  gearBring: string[];
  gearNotBring: string[];
  faqs: { q: string; a: string }[];
};

export const BLANK_TRIP_TYPE: TripTypeValues = {
  name: "", slot: "AM", durationHours: 4, maxAnglers: 2, meetingSpot: "", meetingLat: null, meetingLng: null,
  tideStationId: null, description: null, gearBring: [], gearNotBring: [], faqs: [],
};

/** "31.9926, -80.8494" (as copied from a maps app) -> numbers, or null when it doesn't parse. */
function parseCoords(text: string): { lat: number; lng: number } | null {
  const m = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(text);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

const lines = (text: string) => text.split("\n").map(s => s.trim()).filter(Boolean);

export function TripTypeEditor({ initial }: { initial: TripTypeValues }) {
  const router = useRouter();
  const toast = useToast();
  const uid = useId();
  const editing = Boolean(initial.id);

  const [name, setName] = useState(initial.name);
  const [slot, setSlot] = useState(initial.slot);
  const [hours, setHours] = useState(String(initial.durationHours));
  const [maxAnglers, setMaxAnglers] = useState(String(initial.maxAnglers));
  const [description, setDescription] = useState(initial.description ?? "");
  const [spot, setSpot] = useState(initial.meetingSpot);
  const [coords, setCoords] = useState(initial.meetingLat != null && initial.meetingLng != null ? `${initial.meetingLat}, ${initial.meetingLng}` : "");
  const [station, setStation] = useState(initial.tideStationId ?? "");
  const [bring, setBring] = useState(initial.gearBring.join("\n"));
  const [notBring, setNotBring] = useState(initial.gearNotBring.join("\n"));
  const [faqs, setFaqs] = useState(initial.faqs.length ? initial.faqs : []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const point = parseCoords(coords);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const h = Number(hours), n = Number(maxAnglers);
    if (!name.trim()) next.name = "Give the trip type a name.";
    if (!spot.trim()) next.spot = "Add where clients should meet you.";
    if (!Number.isFinite(h) || h <= 0 || h > 24) next.hours = "Enter a length between 0.5 and 24 hours.";
    if (!Number.isInteger(n) || n < 1 || n > 6) next.anglers = "Enter a whole number from 1 to 6.";
    if (coords.trim() && !point) next.coords = "Paste as latitude, longitude. For example 31.9926, -80.8494.";
    if (station && !/^\d{7}$/.test(station)) next.station = "Station IDs are 7 digits.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      document.getElementById(`${uid}-${Object.keys(next)[0]}`)?.focus();
      return;
    }

    const payload = {
      name: name.trim(), slot, durationHours: h, maxAnglers: n,
      description: description.trim() || null,
      meetingSpot: spot.trim(), meetingLat: point?.lat ?? null, meetingLng: point?.lng ?? null,
      tideStationId: station || null,
      gearBring: lines(bring), gearNotBring: lines(notBring),
      faqs: faqs.map(f => ({ q: f.q.trim(), a: f.a.trim() })).filter(f => f.q),
    };
    setBusy(true);
    try {
      if (editing) await api(`/api/trip-types/${initial.id}`, { method: "PATCH", body: payload });
      else await api("/api/trip-types", { body: payload });
      toast(editing ? "Trip type saved" : "Trip type created");
      router.push("/settings");
      router.refresh();
    } catch (err) {
      setErrors({ form: errorMessage(err) });
      setBusy(false);
    }
  }

  async function archive() {
    setArchiving(true);
    try {
      await api(`/api/trip-types/${initial.id}`, { method: "PATCH", body: { archived: true } });
      toast("Trip type archived");
      router.push("/settings");
      router.refresh();
    } catch (err) {
      toast(errorMessage(err), { type: "error" });
      setArchiving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="stack">
      <section className="panel panel-pad">
        <h2 className="section-title">Basics</h2>
        <div className="field">
          <label htmlFor={`${uid}-name`}>Name</label>
          <input id={`${uid}-name`} className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Half-Day Inshore" aria-invalid={errors.name ? true : undefined} maxLength={120} />
          {errors.name && <span className="error">{errors.name}</span>}
        </div>
        <div className="field">
          <span className="field-label" id={`${uid}-slot`}>Takes up</span>
          <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-slot`}>
            {([["AM", "A morning"], ["PM", "An afternoon"], ["FULL", "The full day"]] as const).map(([value, label]) => (
              <label key={value}>
                <input type="radio" name={`${uid}-slot`} value={value} checked={slot === value} onChange={() => setSlot(value)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <span className="hint">Half-day trips can be booked into either half; you choose when booking.</span>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor={`${uid}-hours`}>Length in hours</label>
            <input id={`${uid}-hours`} className="input" type="number" inputMode="decimal" step="0.5" min="0.5" max="24" value={hours} onChange={e => setHours(e.target.value)} aria-invalid={errors.hours ? true : undefined} />
            {errors.hours && <span className="error">{errors.hours}</span>}
          </div>
          <div className="field">
            <label htmlFor={`${uid}-anglers`}>Most anglers</label>
            <input id={`${uid}-anglers`} className="input" type="number" inputMode="numeric" min="1" max="6" value={maxAnglers} onChange={e => setMaxAnglers(e.target.value)} aria-invalid={errors.anglers ? true : undefined} />
            {errors.anglers && <span className="error">{errors.anglers}</span>}
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${uid}-desc`}>Description <span className="meta">(optional, clients see it)</span></label>
          <textarea id={`${uid}-desc`} className="textarea" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Sight-casting to redfish on the flood tide." maxLength={2000} />
        </div>
      </section>

      <section className="panel panel-pad">
        <h2 className="section-title">Where you meet</h2>
        <div className="field">
          <label htmlFor={`${uid}-spot`}>Meeting spot</label>
          <input id={`${uid}-spot`} className="input" value={spot} onChange={e => setSpot(e.target.value)} placeholder="North Ramp, Bay Access Rd" aria-invalid={errors.spot ? true : undefined} maxLength={200} />
          {errors.spot && <span className="error">{errors.spot}</span>}
        </div>
        <div className="field">
          <label htmlFor={`${uid}-coords`}>Map coordinates <span className="meta">(optional)</span></label>
          <input id={`${uid}-coords`} className="input" value={coords} onChange={e => setCoords(e.target.value)} placeholder="31.9926, -80.8494" inputMode="text" aria-invalid={errors.coords ? true : undefined} />
          {errors.coords ? (
            <span className="error">{errors.coords}</span>
          ) : (
            <span className="hint">Powers the forecast and the "Open in Maps" button. In Google Maps, press and hold the spot, then copy the numbers.</span>
          )}
        </div>
        <StationPicker label="Tide station" value={station} onChange={setStation} near={point} hint="Leave empty to use your default station, or for freshwater trips." />
        {errors.station && <span className="error" style={{ display: "block", marginTop: 6, fontSize: "var(--t-13)", color: "var(--danger)" }}>{errors.station}</span>}
      </section>

      <section className="panel panel-pad">
        <h2 className="section-title">What clients see on the trip page</h2>
        <div className="field">
          <label htmlFor={`${uid}-bring`}>What to bring</label>
          <textarea id={`${uid}-bring`} className="textarea" rows={4} value={bring} onChange={e => setBring(e.target.value)} placeholder={"Sunscreen and hat\nPolarized glasses\nFishing license"} />
          <span className="hint">One item per line.</span>
        </div>
        <div className="field">
          <label htmlFor={`${uid}-notbring`}>What not to bring</label>
          <textarea id={`${uid}-notbring`} className="textarea" rows={3} value={notBring} onChange={e => setNotBring(e.target.value)} placeholder={"Bananas\nHard-sole boots"} />
          <span className="hint">One item per line.</span>
        </div>

        <div className="field">
          <span className="field-label">Common questions</span>
          {faqs.map((f, i) => (
            <div key={i} className="faq-edit">
              <div className="faq-top">
                <input className="input" value={f.q} placeholder="Where do I park?" aria-label={`Question ${i + 1}`} maxLength={300}
                  onChange={e => setFaqs(list => list.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
                <button type="button" className="icon-btn" aria-label={`Remove question ${i + 1}`} onClick={() => setFaqs(list => list.filter((_, j) => j !== i))}>
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
              <textarea className="textarea" rows={2} value={f.a} placeholder="Free lot at the ramp, plenty of room before 7." aria-label={`Answer ${i + 1}`} maxLength={2000}
                onChange={e => setFaqs(list => list.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
            </div>
          ))}
          <div>
            <Button size="sm" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setFaqs(list => [...list, { q: "", a: "" }])}>Add a question</Button>
          </div>
        </div>
      </section>

      {errors.form && (
        <p className="form-error" role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          <span>{errors.form}</span>
        </p>
      )}

      <div className="form-actions" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button type="submit" variant="primary" pending={busy}>{editing ? "Save trip type" : "Create trip type"}</Button>
          <Link href="/settings" className="btn btn--ghost"><span>Cancel</span></Link>
        </div>
        {editing && (
          <Button variant="danger" icon={<Archive size={16} aria-hidden="true" />} onClick={() => setConfirmArchive(true)}>Archive</Button>
        )}
      </div>
      {editing && <p className="meta">Saving also updates the trip pages of upcoming bookings for this trip type.</p>}

      <Dialog open={confirmArchive} onClose={() => setConfirmArchive(false)} labelledBy={`${uid}-archive`}>
        <h2 id={`${uid}-archive`}>Archive {initial.name}?</h2>
        <p>It stops being offered for new bookings. Trips already on the calendar keep it and their trip pages keep working.</p>
        <div className="form-actions">
          <Button variant="ghost" onClick={() => setConfirmArchive(false)}>Keep it</Button>
          <Button variant="danger-solid" pending={archiving} onClick={archive}>Archive trip type</Button>
        </div>
      </Dialog>
    </form>
  );
}
