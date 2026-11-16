// Public client trip page. No login; the unguessable slug is the key.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CalendarDays, Check, ChevronDown, Clock, MapPin, MessageSquare, Navigation, Shirt, Users, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { daysBetween, fmtDate, fmtTime, plural, todayInTz } from "@/lib/dates";
import { readTides, readWeather, wearTips } from "@/lib/conditions";
import { Mark, Swell } from "@/components/ui";
import { Conditions } from "@/components/Conditions";
import { TideChart } from "@/components/TideChart";

type Section = {
  id: string;
  kind: string;
  title: string;
  body?: string;
  items?: string[];
  qas?: { q: string; a: string }[];
  lat?: number | null;
  lng?: number | null;
  order: number;
};

const loadPage = cache(async (slug: string) =>
  prisma.tripPage.findUnique({
    where: { slug },
    include: { booking: { include: { tripType: true, guide: true, pinnedMessages: { orderBy: { sentAt: "asc" } } } } },
  }),
);

function readSections(json: unknown): Section[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter((s): s is Section => !!s && typeof s === "object" && typeof (s as Section).kind === "string")
    .map((s, i) => ({
      ...s,
      id: String(s.id ?? i),
      title: typeof s.title === "string" ? s.title : "",
      items: Array.isArray(s.items) ? s.items.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [],
      qas: Array.isArray(s.qas) ? s.qas.filter(q => q && typeof q.q === "string" && q.q.trim() !== "") : [],
      order: typeof s.order === "number" ? s.order : i,
    }))
    .sort((a, b) => a.order - b.order);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  const b = page?.booking;
  if (!b || b.status === "CANCELLED") return { title: "Trip page", robots: { index: false, follow: false } };
  return {
    title: { absolute: `${b.tripType.name} with ${b.guide.businessName ?? b.guide.name}` },
    description: `Where to meet, what to bring, and the forecast for your trip on ${fmtDate(b.date, { weekday: "long", month: "long", day: "numeric" })}.`,
    // Private to the client holding the link; keep it out of search results.
    robots: { index: false, follow: false },
  };
}

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page || page.booking.status === "CANCELLED") notFound();

  const b = page.booking;
  const guideName = b.guide.name;
  const outfit = b.guide.businessName ?? guideName;
  const weather = readWeather(page.weatherSnapshot);
  const tides = readTides(page.tidePredictions);
  const sections = readSections(page.sections);
  const meet = sections.find(s => s.kind === "meet");
  const bring = sections.find(s => s.kind === "bring" && s.items!.length > 0);
  const notBring = sections.find(s => s.kind === "not_bring" && s.items!.length > 0);
  const faq = sections.find(s => s.kind === "faq" && s.qas!.length > 0);
  const custom = sections.filter(s => s.kind === "custom" && s.body);

  const daysOut = daysBetween(todayInTz(b.guide.timezone), b.date);
  const countdown = daysOut === 0 ? "Today" : daysOut === 1 ? "Tomorrow" : daysOut > 1 ? `In ${daysOut} days` : null;
  const past = daysOut < 0;
  const tips = weather ? wearTips(weather) : [];
  const mapsUrl =
    meet?.lat != null && meet?.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${meet.lat},${meet.lng}`
      : meet?.body
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meet.body)}`
        : null;

  return (
    <main className="trip">
      <header className="trip-hero">
        <Swell />
        <div className="inner">
          <div className="by"><Mark size={20} />{outfit}</div>
          <p className="kicker">Field notes for your trip</p>
          <h1>{b.tripType.name}</h1>
          <div className="when">
            <span><CalendarDays size={18} aria-hidden="true" />{fmtDate(b.date, { weekday: "long", month: "long", day: "numeric" })}</span>
            <span><Clock size={18} aria-hidden="true" />{fmtTime(b.startTime)}</span>
            <span><Users size={18} aria-hidden="true" />{plural(b.anglers, "angler")}</span>
          </div>
          {b.status === "INQUIRY" && !past ? (
            <span className="trip-countdown">Waiting on {guideName} to confirm this date</span>
          ) : countdown ? (
            <span className="trip-countdown">{countdown}</span>
          ) : null}
          {b.tripType.description && <p className="trip-desc">{b.tripType.description}</p>}
        </div>
      </header>

      <div className="trip-body">
        {b.pinnedMessages.length > 0 && (
          <section className="trip-card trip-card--note" aria-labelledby="from-guide">
            <h2 id="from-guide">From {guideName}</h2>
            {b.pinnedMessages.map(m => <p key={m.id} className="quote">{m.body}</p>)}
          </section>
        )}

        {meet?.body && (
          <section className="trip-card" aria-labelledby="meet">
            <h2 id="meet">{meet.title || "Where to meet"}</h2>
            <div className="meet">
              <p className="place inline-icon"><MapPin size={20} aria-hidden="true" />{meet.body}</p>
              <p className="muted">Be there by {fmtTime(b.startTime)}. The trip runs about {b.tripType.durationHours} {b.tripType.durationHours === 1 ? "hour" : "hours"}.</p>
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn" style={{ justifySelf: "start" }}>
                  <Navigation size={17} aria-hidden="true" />
                  <span>Open in Maps</span>
                </a>
              )}
            </div>
          </section>
        )}

        <section className="trip-card" aria-labelledby="conditions">
          <h2 id="conditions">{tides.length > 0 ? "Weather and tides" : "Weather"}</h2>
          {weather ? (
            <>
              <Conditions weather={weather} />
              {page.weatherStatus === "STALE" && page.weatherFetchedAt && (
                <p className="meta" style={{ marginTop: 8 }}>
                  Forecast last updated {page.weatherFetchedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: b.guide.timezone })}. It may have changed.
                </p>
              )}
              {tips.length > 0 && !past && (
                <div className="wear">
                  <Shirt size={20} aria-hidden="true" />
                  <div>
                    <strong>What to wear</strong>
                    <ul>{tips.map(t => <li key={t}>{t}</li>)}</ul>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="muted">
              {past ? "The forecast for this day is no longer available." : "The forecast shows up here about a week before your trip, and updates every day until then."}
            </p>
          )}
          {tides.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <TideChart tides={tides} startTime={b.startTime} durationHours={b.tripType.durationHours} />
            </div>
          )}
        </section>

        {(bring || notBring) && (
          <div className={bring && notBring ? "trip-split" : undefined}>
            {bring && (
              <section className="trip-card" aria-labelledby="bring">
                <h2 id="bring">{bring.title || "What to bring"}</h2>
                <ul className="checklist">
                  {bring.items!.map(it => (
                    <li key={it}><span className="tick"><Check size={14} strokeWidth={3} aria-hidden="true" /></span>{it}</li>
                  ))}
                </ul>
              </section>
            )}
            {notBring && (
              <section className="trip-card" aria-labelledby="not-bring">
                <h2 id="not-bring">Leave at home</h2>
                <ul className="checklist is-no">
                  {notBring.items!.map(it => (
                    <li key={it}><span className="tick"><X size={14} strokeWidth={3} aria-hidden="true" /></span>{it}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {custom.map(s => (
          <section className="trip-card" key={s.id}>
            {s.title && <h2>{s.title}</h2>}
            <p className="notes">{s.body}</p>
          </section>
        ))}

        {faq && (
          <section className="trip-card" aria-labelledby="faq">
            <h2 id="faq">Common questions</h2>
            <div className="faq">
              {faq.qas!.map(qa => (
                <details key={qa.q}>
                  <summary>{qa.q}<ChevronDown size={18} aria-hidden="true" /></summary>
                  <p>{qa.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>

      <p className="trip-foot">
        {tides.length > 0 || weather ? "Weather from the National Weather Service. Tide predictions from NOAA. " : ""}
        This page updates as your trip gets closer.
      </p>

      {b.guide.twilioNumber && !past && (
        <div className="trip-cta">
          <div className="inner">
            <a className="btn btn--primary" href={`sms:${b.guide.twilioNumber}`}>
              <MessageSquare size={20} aria-hidden="true" />
              <span>Text {guideName}</span>
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
