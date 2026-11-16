// Tide curve for one day, drawn from NOAA high/low predictions.
// The curve between two extremes is a half cosine, which is how tide tables are
// conventionally interpolated. The band shows when the trip is on the water.
import type { TidePrediction } from "@/lib/tides";
import { fmtTideTime, fmtTime, minutesOfDay } from "@/lib/dates";

const DAY = 1440;
const HALF_CYCLE = 372; // 6h 12m: typical time between a high and the next low

type Extreme = { m: number; h: number; type: "H" | "L"; real: boolean; time: string };

function buildExtremes(tides: TidePrediction[]): Extreme[] {
  const real = tides
    .map(t => ({ m: minutesOfDay(t.time), h: Number(t.height), type: t.type, real: true, time: t.time }))
    .filter((t): t is Extreme => t.m != null && Number.isFinite(t.h))
    .sort((a, b) => a.m - b.m);
  if (real.length === 0) return [];

  // Extend one extreme past each end of the day so the curve reaches midnight on both sides.
  const first = real[0], second = real[1], last = real[real.length - 1], beforeLast = real[real.length - 2];
  const swing = 3;
  const lead: Extreme = {
    m: first.m - (second ? second.m - first.m : HALF_CYCLE),
    h: second ? second.h : first.h + (first.type === "H" ? -swing : swing),
    type: first.type === "H" ? "L" : "H", real: false, time: "",
  };
  const tail: Extreme = {
    m: last.m + (beforeLast ? last.m - beforeLast.m : HALF_CYCLE),
    h: beforeLast ? beforeLast.h : last.h + (last.type === "H" ? -swing : swing),
    type: last.type === "H" ? "L" : "H", real: false, time: "",
  };
  return [lead, ...real, tail];
}

function heightAt(ex: Extreme[], m: number): number {
  for (let i = 0; i < ex.length - 1; i++) {
    const a = ex[i], b = ex[i + 1];
    if (m >= a.m && m <= b.m) {
      const t = (m - a.m) / (b.m - a.m || 1);
      return a.h + ((b.h - a.h) * (1 - Math.cos(Math.PI * t))) / 2;
    }
  }
  return m < ex[0].m ? ex[0].h : ex[ex.length - 1].h;
}

export function TideChart({ tides, startTime, durationHours, mini = false }: { tides: TidePrediction[]; startTime?: string | null; durationHours?: number | null; mini?: boolean }) {
  const ex = buildExtremes(tides);
  if (ex.length === 0) return null;
  const real = ex.filter(e => e.real);

  const samples: { m: number; h: number }[] = [];
  for (let m = 0; m <= DAY; m += 10) samples.push({ m, h: heightAt(ex, m) });
  const lo = Math.min(...samples.map(s => s.h)), hi = Math.max(...samples.map(s => s.h));
  // Keep the curve in the middle band of the plot so labels fit above highs and below lows.
  const TOP = 34, BOTTOM = 66;
  const y = (h: number) => (hi === lo ? 50 : BOTTOM - ((h - lo) / (hi - lo)) * (BOTTOM - TOP));

  const line = samples.map((s, i) => `${i === 0 ? "M" : "L"}${s.m} ${y(s.h).toFixed(2)}`).join(" ");
  const area = `${line} L${DAY} 100 L0 100 Z`;

  const start = minutesOfDay(startTime);
  const span = start != null && durationHours ? Math.min(durationHours * 60, DAY - start) : 0;
  const end = start != null ? start + span : null;

  const summary = real.map(e => `${e.type === "H" ? "High" : "Low"} ${fmtTideTime(e.time)}, ${e.h.toFixed(1)} feet`).join("; ");

  return (
    <figure className={`tide${mini ? " tide--mini" : ""}`}>
      <div className="tide-plot" role="img" aria-label={`Tide curve. ${summary}.`}>
        <svg viewBox={`0 0 ${DAY} 100`} preserveAspectRatio="none" aria-hidden="true">
          <path d={area} fill="var(--water)" opacity="0.13" />
          {[360, 720, 1080].map(x => (
            <line key={x} x1={x} x2={x} y1="0" y2="100" stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="2 4" />
          ))}
          <path d={line} fill="none" stroke="var(--water)" strokeWidth="2.25" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {start != null && span > 0 && (
          <div className="tide-window" style={{ left: `${(start / DAY) * 100}%`, width: `${(span / DAY) * 100}%` }} />
        )}
        {real.map(e => {
          const left = (e.m / DAY) * 100;
          const edge = left < 9 ? " is-start" : left > 91 ? " is-end" : "";
          return (
            <span key={e.time}>
              <span className="tide-dot" style={{ left: `${left}%`, top: `${y(e.h)}%` }} />
              <span className={`tide-mark${e.type === "L" ? " is-low" : ""}${edge}`} style={{ left: `${left}%`, top: `${y(e.h)}%` }} aria-hidden="true">
                <strong>{fmtTideTime(e.time)}</strong>
                {!mini && <span>{e.type === "H" ? "High" : "Low"} {e.h.toFixed(1)} ft</span>}
              </span>
            </span>
          );
        })}
      </div>
      <div className="tide-axis" aria-hidden="true">
        <span>12 AM</span><span>6 AM</span><span>Noon</span><span>6 PM</span><span>12 AM</span>
      </div>
      {start != null && end != null && span > 0 && (
        <figcaption className="tide-key">
          <i aria-hidden="true" />
          On the water {fmtTime(startTime)} to {fmtTime(`${Math.floor((end % DAY) / 60)}:${String(end % 60).padStart(2, "0")}`)}
        </figcaption>
      )}
    </figure>
  );
}
