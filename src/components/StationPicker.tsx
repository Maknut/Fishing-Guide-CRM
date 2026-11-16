"use client";
import { useId, useState } from "react";
import { Search } from "lucide-react";
import { api, errorMessage } from "@/lib/fetcher";
import { Button } from "./ui";

type Station = { id: string; name: string; state: string | null };

/** NOAA tide station field: type an ID, or search by town and pick from the results. */
export function StationPicker({ value, onChange, near, label, hint }: {
  value: string;
  onChange: (id: string) => void;
  near?: { lat: number; lng: number } | null;
  label: string;
  hint?: string;
}) {
  const uid = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Station[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(url: string) {
    setBusy(true);
    setError(null);
    try {
      setResults(await api<Station[]>(url));
    } catch (e) {
      setResults(null);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <label htmlFor={`${uid}-id`}>{label}</label>
      <input
        id={`${uid}-id`} className="input" inputMode="numeric" value={value} placeholder="7-digit station ID, e.g. 8670870"
        onChange={e => { onChange(e.target.value.replace(/\D/g, "").slice(0, 7)); setPicked(null); }}
      />
      {picked ? <span className="hint">{picked}</span> : hint ? <span className="hint">{hint}</span> : null}

      <div className="station-search">
        <div className="input-icon" style={{ flex: 1 }}>
          <Search size={18} aria-hidden="true" />
          <input
            className="input" type="search" value={query} placeholder="Find by town, e.g. Savannah, GA" aria-label="Find a tide station by town"
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (query.trim()) search(`/api/tide-stations?q=${encodeURIComponent(query.trim())}`);
              }
            }}
          />
        </div>
        <Button pending={busy} disabled={!query.trim()} onClick={() => search(`/api/tide-stations?q=${encodeURIComponent(query.trim())}`)}>Find</Button>
      </div>
      {near && (
        <button type="button" className="link" style={{ justifySelf: "start", fontSize: "var(--t-13)" }} onClick={() => search(`/api/tide-stations?lat=${near.lat}&lng=${near.lng}`)}>
          Show stations nearest the meeting spot
        </button>
      )}

      {error && <span className="error" role="alert">{error}</span>}
      {results && results.length === 0 && <span className="hint" role="status">No stations match. Try a nearby town or the two-letter state.</span>}
      {results && results.length > 0 && (
        <div className="station-results" role="listbox" aria-label="Matching tide stations">
          {results.map(s => (
            <button
              key={s.id} type="button" role="option" aria-selected={value === s.id}
              onClick={() => { onChange(s.id); setPicked(`${s.name}${s.state ? `, ${s.state}` : ""}`); setResults(null); setQuery(""); }}
            >
              {s.name}{s.state ? `, ${s.state}` : ""}
              <span>{s.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
