"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { CircleAlert, Minus, Plus } from "lucide-react";
import { api, errorMessage } from "@/lib/fetcher";
import { Button } from "./ui";
import { useToast } from "./Toast";

type ClientOption = { id: string; name: string };
type TripTypeOption = { id: string; name: string; slot: "AM" | "PM" | "FULL"; maxAnglers: number; durationHours: number; meetingSpot: string };
type Availability = { blocked: string | null; am: string | null; pm: string | null };

const DEFAULT_START = { AM: "06:00", PM: "13:00", FULL: "06:30" } as const;

export function BookingForm({ clients, tripTypes, initialClientId, initialDate, today }: {
  clients: ClientOption[];
  tripTypes: TripTypeOption[];
  initialClientId: string;
  initialDate: string;
  today: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const uid = useId();
  const [clientId, setClientId] = useState(initialClientId);
  const [tripTypeId, setTripTypeId] = useState(tripTypes.length === 1 ? tripTypes[0].id : "");
  const [date, setDate] = useState(initialDate);
  const [half, setHalf] = useState<"AM" | "PM">("AM");
  const [startTime, setStartTime] = useState<string>(DEFAULT_START.AM);
  const [timeEdited, setTimeEdited] = useState(false);
  const [anglers, setAnglers] = useState(1);
  const [notes, setNotes] = useState("");
  const [avail, setAvail] = useState<Availability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const type = tripTypes.find(t => t.id === tripTypeId) ?? null;
  const slot: "AM" | "PM" | "FULL" | null = type ? (type.slot === "FULL" ? "FULL" : half) : null;
  const maxAnglers = type?.maxAnglers ?? 6;

  // Choosing a trip type sets sensible defaults for the half of the day and the party size.
  useEffect(() => {
    if (!type) return;
    if (type.slot !== "FULL") setHalf(type.slot);
    setAnglers(n => Math.min(n, type.maxAnglers));
  }, [type]);

  // Keep the start time in step with the slot until the guide types their own.
  useEffect(() => {
    if (slot && !timeEdited) setStartTime(DEFAULT_START[slot]);
  }, [slot, timeEdited]);

  // Look up what's already on that day so conflicts show before submitting.
  useEffect(() => {
    setAvail(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    let stale = false;
    api<Availability>(`/api/availability?date=${date}`)
      .then(a => { if (!stale) setAvail(a); })
      .catch(() => {}); // the server still enforces conflicts on submit
    return () => { stale = true; };
  }, [date]);

  const conflict = (() => {
    if (!avail || !slot) return null;
    if (avail.blocked !== null) return `That day is blocked off${avail.blocked ? ` (${avail.blocked})` : ""}.`;
    if (slot === "FULL" && (avail.am || avail.pm)) return `${avail.am ?? avail.pm} is already booked that day, so a full-day trip won't fit.`;
    if (slot === "AM" && avail.am) return `${avail.am} already has the morning.`;
    if (slot === "PM" && avail.pm) return `${avail.pm} already has the afternoon.`;
    return null;
  })();

  const ready = Boolean(clientId && tripTypeId && date && startTime) && !conflict;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setError(null);
    setBusy(true);
    try {
      const booking = await api<{ id: string }>("/api/bookings", {
        body: { clientId, tripTypeId, date, slot: slot ?? undefined, startTime, anglers, notes: notes.trim() || undefined },
      });
      toast("Booking created");
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form className="panel panel-pad" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor={`${uid}-client`}>Client</label>
        <select id={`${uid}-client`} className="select" value={clientId} onChange={e => setClientId(e.target.value)} required>
          <option value="">Choose a client</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="hint">Someone new? <Link href="/clients?new=1" className="link">Add them first</Link>.</span>
      </div>

      <div className="field">
        <label htmlFor={`${uid}-type`}>Trip type</label>
        <select id={`${uid}-type`} className="select" value={tripTypeId} onChange={e => setTripTypeId(e.target.value)} required>
          <option value="">Choose a trip type</option>
          {tripTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {type && <span className="hint">{type.durationHours} hours, meets at {type.meetingSpot}.</span>}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={`${uid}-date`}>Date</label>
          <input id={`${uid}-date`} className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required aria-invalid={conflict ? true : undefined} />
          {date && date < today && <span className="hint">That date has already passed.</span>}
        </div>
        <div className="field">
          <label htmlFor={`${uid}-time`}>Start time</label>
          <input id={`${uid}-time`} className="input" type="time" value={startTime} onChange={e => { setStartTime(e.target.value); setTimeEdited(true); }} required />
        </div>
      </div>

      {type && type.slot !== "FULL" && (
        <div className="field">
          <span className="field-label" id={`${uid}-half`}>Which half of the day?</span>
          <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-half`}>
            {(["AM", "PM"] as const).map(h => {
              const takenBy = h === "AM" ? avail?.am : avail?.pm;
              return (
                <label key={h}>
                  <input type="radio" name={`${uid}-half`} value={h} checked={half === h} onChange={() => setHalf(h)} />
                  <span>{h === "AM" ? "Morning" : "Afternoon"}{takenBy ? " (taken)" : ""}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {conflict && (
        <p className="form-error" role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          <span>{conflict}</span>
        </p>
      )}

      <div className="field">
        <span className="field-label" id={`${uid}-anglers`}>Anglers</span>
        <div className="stepper" role="group" aria-labelledby={`${uid}-anglers`}>
          <button type="button" className="icon-btn" onClick={() => setAnglers(n => Math.max(1, n - 1))} disabled={anglers <= 1} aria-label="One fewer angler">
            <Minus size={18} aria-hidden="true" />
          </button>
          <output aria-live="polite">{anglers}</output>
          <button type="button" className="icon-btn" onClick={() => setAnglers(n => Math.min(maxAnglers, n + 1))} disabled={anglers >= maxAnglers} aria-label="One more angler">
            <Plus size={18} aria-hidden="true" />
          </button>
          {type && <span className="hint">Up to {type.maxAnglers} on this trip.</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor={`${uid}-notes`}>Private notes <span className="meta">(optional)</span></label>
        <textarea id={`${uid}-notes`} className="textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="First-timer, wants to target reds" maxLength={4000} />
      </div>

      {error && (
        <p className="form-error" role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      <div className="form-actions">
        <Button type="submit" variant="primary" pending={busy} disabled={!ready}>Create booking</Button>
        <Link href="/calendar" className="btn btn--ghost"><span>Cancel</span></Link>
      </div>
    </form>
  );
}
