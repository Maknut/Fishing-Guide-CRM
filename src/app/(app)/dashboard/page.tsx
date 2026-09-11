import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";
import { ScreenTitle } from "@/components/ScreenTitle";

export default async function Dashboard() {
  const guideId = await requireGuide();
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const week = new Date(today); week.setUTCDate(week.getUTCDate() + 7);

  const [todayTrips, unread, needsConfirm, upcoming] = await Promise.all([
    prisma.booking.findMany({
      where: { guideId, date: today, status: { in: ["INQUIRY", "CONFIRMED"] } },
      include: { client: true, tripType: true, tripPage: true },
      orderBy: { slot: "asc" },
    }),
    prisma.conversation.findMany({
      where: { guideId, unreadCount: { gt: 0 } },
      include: { client: true, messages: { orderBy: { sentAt: "desc" }, take: 1 } },
      orderBy: { lastMessageAt: "desc" },
    }),
    prisma.booking.findMany({
      where: { guideId, status: "INQUIRY", date: { gte: today } },
      include: { client: true, tripType: true },
      orderBy: { date: "asc" },
      take: 5,
    }),
    prisma.booking.findMany({
      where: { guideId, date: { gt: today, lte: week }, status: { in: ["INQUIRY", "CONFIRMED"] } },
      include: { client: true, tripType: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const fmt = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric", timeZone: "UTC" });

  return (
    <>
      <ScreenTitle>Dashboard</ScreenTitle>

      <div className="card">
        <h2>Today — {fmt(today)}</h2>
        {todayTrips.length === 0 && <p className="dim">No trips today.</p>}
        {todayTrips.map(b => {
          const w = b.tripPage?.weatherSnapshot as any;
          const tides = (b.tripPage?.tidePredictions as any[]) ?? [];
          return (
            <Link key={b.id} href={`/bookings/${b.id}`} style={{ display: "block", color: "inherit" }}>
              <div className="row">
                <div>
                  <div className="title-sm">{b.slot !== "FULL" ? `${b.slot} · ` : ""}{b.tripType.name} · {b.client.name}</div>
                  <div className="dim">{b.startTime} · {b.tripType.meetingSpot} · {b.anglers} angler{b.anglers > 1 ? "s" : ""}</div>
                </div>
                <span className={`pill ${b.status.toLowerCase()}`}>{b.status}</span>
              </div>
              {(w || tides.length > 0) && (
                <div className="dim" style={{ background: "var(--bg)", borderRadius: 8, padding: 8, marginTop: 8 }}>
                  {w && <>🌤 {w.tempLow}–{w.tempHigh}°F · Wind {w.windDir} {w.windMph}mph · {w.precipPct ?? 0}% rain<br /></>}
                  {tides.length > 0 && <>🌊 Tides: {tides.map((t: any) => `${t.type === "H" ? "High" : "Low"} ${t.time.slice(11, 16)}`).join(" · ")}</>}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {unread.length > 0 && (
        <Link href="/inbox" className="card">
          <h2>Unread messages</h2>
          <div className="row">
            <span className="dim">
              {unread.reduce((n, c) => n + c.unreadCount, 0)} unread · latest: {unread[0].client.name} — “{unread[0].messages[0]?.body.slice(0, 40)}”
            </span>
            <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 13 }}>Open →</span>
          </div>
        </Link>
      )}

      {needsConfirm.length > 0 && (
        <div className="card">
          <h2>Trips needing confirmation</h2>
          {needsConfirm.map(b => (
            <Link key={b.id} href={`/bookings/${b.id}`} className="row" style={{ color: "inherit", marginBottom: 6 }}>
              <span className="dim">{fmt(b.date)} — {b.tripType.name} · {b.client.name}</span>
              <span className="pill inquiry">INQUIRY</span>
            </Link>
          ))}
        </div>
      )}

      <Link href="/calendar" className="card">
        <h2>Next 7 days</h2>
        {upcoming.length === 0 && <p className="dim">Nothing on the calendar.</p>}
        {upcoming.map(b => (
          <div key={b.id} className="row" style={{ marginBottom: 4 }}>
            <span className="dim">{fmt(b.date)} — {b.slot !== "FULL" ? `${b.slot} ` : ""}{b.tripType.name} · {b.client.name}</span>
            <span className={`pill ${b.status.toLowerCase()}`}>{b.status}</span>
          </div>
        ))}
      </Link>

      <div className="row" style={{ display: "flex", gap: 10 }}>
        <Link href="/calendar" className="btn primary">+ New booking</Link>
        <Link href="/clients" className="btn">+ New client</Link>
      </div>
    </>
  );
}
