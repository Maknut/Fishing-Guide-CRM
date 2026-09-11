import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";
import { ScreenTitle } from "@/components/ScreenTitle";

export default async function Calendar({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const guideId = await requireGuide();
  const sp = await searchParams;
  const now = new Date();
  const [year, month] = sp.m ? sp.m.split("-").map(Number) : [now.getUTCFullYear(), now.getUTCMonth() + 1];

  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  const daysInMonth = last.getUTCDate();
  const startDow = first.getUTCDay();

  const [bookings, blocked] = await Promise.all([
    prisma.booking.findMany({
      where: { guideId, date: { gte: first, lte: last }, status: { in: ["INQUIRY", "CONFIRMED"] } },
      include: { client: true, tripType: true },
      orderBy: [{ date: "asc" }, { slot: "asc" }],
    }),
    prisma.blockedDay.findMany({ where: { guideId, date: { gte: first, lte: last } } }),
  ]);

  // day -> { am, pm } status classes
  const dayMap: Record<number, { am?: string; pm?: string }> = {};
  const mark = (d: number, slot: string, cls: string) => {
    dayMap[d] ??= {};
    if (slot === "FULL" || slot === "AM") dayMap[d].am = cls;
    if (slot === "FULL" || slot === "PM") dayMap[d].pm = cls;
  };
  for (const b of bookings) mark(b.date.getUTCDate(), b.slot, b.status.toLowerCase());
  for (const bl of blocked) mark(bl.date.getUTCDate(), bl.slot, "blocked");

  const prev = month === 1 ? `${year - 1}-12` : `${year}-${month - 1}`;
  const next = month === 12 ? `${year + 1}-1` : `${year}-${month + 1}`;
  const monthName = first.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const isToday = (d: number) => now.getUTCFullYear() === year && now.getUTCMonth() + 1 === month && now.getUTCDate() === d;

  return (
    <>
      <ScreenTitle>Calendar</ScreenTitle>
      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <Link href={`/calendar?m=${prev}`} className="btn small">←</Link>
          <h2 style={{ margin: 0 }}>{monthName}</h2>
          <Link href={`/calendar?m=${next}`} className="btn small">→</Link>
        </div>
        <div className="cal-grid">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="cal-dow">{d}</div>)}
          {Array.from({ length: startDow }).map((_, i) => <div key={`p${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
            <div key={d} className={`cal-day ${isToday(d) ? "today" : ""}`}>
              <div className="num">{d}</div>
              <div className="halves">
                <div className={`half ${dayMap[d]?.am ?? ""}`} />
                <div className={`half ${dayMap[d]?.pm ?? ""}`} />
              </div>
            </div>
          ))}
        </div>
        <div className="dim" style={{ marginTop: 10, fontSize: 11 }}>
          Each day: AM | PM · <span style={{ color: "var(--accent)" }}>■</span> Confirmed · <span style={{ color: "var(--warn)" }}>■</span> Inquiry · <span style={{ color: "var(--block)" }}>■</span> Blocked
        </div>
      </div>

      <div className="card">
        <h2>This month</h2>
        {bookings.length === 0 && <p className="dim">No bookings this month.</p>}
        {bookings.map(b => (
          <Link key={b.id} href={`/bookings/${b.id}`} className="row" style={{ color: "inherit", marginBottom: 8 }}>
            <div>
              <div className="title-sm">
                {b.date.getUTCDate()} {first.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} · {b.slot !== "FULL" ? `${b.slot} · ` : ""}{b.tripType.name}
              </div>
              <div className="dim">{b.client.name} · {b.startTime}</div>
            </div>
            <span className={`pill ${b.status.toLowerCase()}`}>{b.status}</span>
          </Link>
        ))}
      </div>

      <Link href="/bookings/new" className="btn primary">+ New booking</Link>
    </>
  );
}
