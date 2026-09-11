// Public client trip page — no login, unguessable slug. Nature Club design language.
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.tripPage.findUnique({
    where: { slug },
    include: { booking: { include: { tripType: true, guide: true, client: true, pinnedMessages: { orderBy: { sentAt: "asc" } } } } },
  });
  if (!page || page.booking.status === "CANCELLED") notFound();

  const b = page.booking;
  const w = page.weatherSnapshot as any;
  const tides = (page.tidePredictions as any[]) ?? [];
  const sections = ((page.sections as any[]) ?? []).sort((a, b) => a.order - b.order);
  const dateStr = b.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <main className="trip">
      <header className="hero">
        <p className="eyebrow">Field Notes · Your Trip</p>
        <h1>{b.tripType.name}</h1>
        <p>{dateStr} · {b.startTime} · with {b.guide.businessName ?? b.guide.name}</p>
      </header>

      <section className="card">
        <h2>Weather &amp; tides — trip day</h2>
        {page.weatherStatus === "AVAILABLE" && w ? (
          <>
            <p>{w.shortForecast} · {w.tempLow}–{w.tempHigh}°F · Wind {w.windDir} {w.windMph} mph · {w.precipPct ?? 0}% rain</p>
            <p className="wear"><strong>What to wear:</strong> {w.wearRec}</p>
          </>
        ) : (
          <p>Forecast will appear here as your trip date gets closer.</p>
        )}
        {tides.length > 0 && (
          <p>🌊 Tides: {tides.map(t => `${t.type === "H" ? "High" : "Low"} ${t.time.slice(11, 16)}`).join(" · ")}</p>
        )}
      </section>

      {sections.map(s => (
        <section className="card" key={s.id}>
          <h2>{s.title}</h2>
          {s.kind === "meet" && (
            <p>
              {s.body}{" "}
              {s.lat != null && (
                <a href={`https://maps.google.com/?q=${s.lat},${s.lng}`}>Open in Maps →</a>
              )}
            </p>
          )}
          {(s.kind === "bring" || s.kind === "not_bring") && (
            <ul>{(s.items ?? []).map((it: string, i: number) => <li key={i}>{s.kind === "bring" ? "✓" : "✗"} {it}</li>)}</ul>
          )}
          {s.kind === "faq" && (
            <div>{(s.qas ?? []).map((qa: any, i: number) => (
              <details key={i}><summary>{qa.q}</summary><p>{qa.a}</p></details>
            ))}</div>
          )}
          {s.kind === "custom" && <p>{s.body}</p>}
        </section>
      ))}

      {b.pinnedMessages.length > 0 && (
        <section className="card">
          <h2>From your guide</h2>
          {b.pinnedMessages.map(m => <p key={m.id}>📌 “{m.body}”</p>)}
        </section>
      )}

      {b.guide.twilioNumber && (
        <a className="cta" href={`sms:${b.guide.twilioNumber}`}>💬 Text {b.guide.name.split(" ")[0]}</a>
      )}
    </main>
  );
}
