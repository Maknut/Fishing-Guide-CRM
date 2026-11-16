import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MapPin, Plus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireGuideRecord } from "@/lib/auth";
import { addDays, fmtDate, fmtRelativeDay, fmtRelativeDayInline, fmtStamp, fmtTime, plural, todayInTz } from "@/lib/dates";
import { readTides, readWeather } from "@/lib/conditions";
import { slotLabel } from "@/lib/labels";
import { Avatar, PageHead, StatusPill, btnClass } from "@/components/ui";
import { Conditions } from "@/components/Conditions";
import { TideChart } from "@/components/TideChart";

export const metadata: Metadata = { title: "Home" };

export default async function Dashboard() {
  const guide = await requireGuideRecord();
  const guideId = guide.id;
  const today = todayInTz(guide.timezone);
  const week = addDays(today, 7);
  const active = { in: ["INQUIRY", "CONFIRMED"] as ("INQUIRY" | "CONFIRMED")[] };

  const [todayTrips, unread, needsConfirm, upcoming, nextTrip] = await Promise.all([
    prisma.booking.findMany({
      where: { guideId, date: today, status: active },
      include: { client: true, tripType: true, tripPage: true },
      orderBy: [{ slot: "asc" }, { startTime: "asc" }],
    }),
    prisma.conversation.findMany({
      where: { guideId, unreadCount: { gt: 0 } },
      include: { client: true, messages: { orderBy: { sentAt: "desc" }, take: 1 } },
      orderBy: { lastMessageAt: "desc" },
      take: 5,
    }),
    prisma.booking.findMany({
      where: { guideId, status: "INQUIRY", date: { gte: today } },
      include: { client: true, tripType: true },
      orderBy: [{ date: "asc" }, { slot: "asc" }],
      take: 5,
    }),
    prisma.booking.findMany({
      where: { guideId, date: { gt: today, lte: week }, status: active },
      include: { client: true, tripType: true },
      orderBy: [{ date: "asc" }, { slot: "asc" }],
    }),
    prisma.booking.findFirst({
      where: { guideId, date: { gt: today }, status: active },
      include: { client: true, tripType: true },
      orderBy: [{ date: "asc" }, { slot: "asc" }],
    }),
  ]);

  const hasSide = unread.length > 0 || needsConfirm.length > 0;

  return (
    <div className="page">
      <PageHead
        title={fmtDate(today, { weekday: "long", month: "long", day: "numeric" })}
        sub={todayTrips.length > 0 ? `${plural(todayTrips.length, "trip")} on the water today.` : "No trips today."}
      >
        <Link href="/bookings/new" className={btnClass({ variant: "primary" })}>
          <Plus size={18} aria-hidden="true" />
          <span>New booking</span>
        </Link>
      </PageHead>

      <div className={`dash${hasSide ? "" : " dash--solo"}`}>
        <div className="dash-main">
          <section className="today" aria-label="Today's trips">
            {todayTrips.length === 0 ? (
              <div className="today-empty">
                <h3>Nothing on the water today</h3>
                {nextTrip ? (
                  <p className="muted">
                    Next up is {nextTrip.tripType.name} with {nextTrip.client.name}, {fmtRelativeDayInline(nextTrip.date, today)} at {fmtTime(nextTrip.startTime)}.
                  </p>
                ) : (
                  <p className="muted">Your calendar is clear. Book a trip to see it here with tides and weather.</p>
                )}
                {nextTrip && (
                  <Link href={`/bookings/${nextTrip.id}`} className={btnClass({ size: "sm" })} style={{ marginTop: 8 }}>
                    <span>Open next trip</span>
                  </Link>
                )}
              </div>
            ) : (
              todayTrips.map(b => {
                const weather = readWeather(b.tripPage?.weatherSnapshot);
                const tides = readTides(b.tripPage?.tidePredictions);
                return (
                  <div key={b.id} className="today-block">
                    <Link href={`/bookings/${b.id}`} className="today-trip">
                      <div className="when">
                        <StatusPill status={b.status} />
                        <span>{fmtTime(b.startTime)}</span>
                        <span className="meta">{slotLabel(b.slot)}</span>
                      </div>
                      <h3>{b.tripType.name} with {b.client.name}</h3>
                      <div className="facts">
                        <span className="inline-icon"><MapPin size={15} aria-hidden="true" />{b.tripType.meetingSpot}</span>
                        <span className="inline-icon"><Users size={15} aria-hidden="true" />{plural(b.anglers, "angler")}</span>
                      </div>
                    </Link>
                    {(weather || tides.length > 0) && (
                      <div className="today-cond">
                        {weather && <Conditions weather={weather} />}
                        {tides.length > 0 && <TideChart tides={tides} startTime={b.startTime} durationHours={b.tripType.durationHours} />}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>

          <section>
            <h2 className="section-title">Next 7 days</h2>
            <div className="panel">
              {upcoming.length === 0 ? (
                <p className="panel-pad muted">Nothing booked for the week ahead.</p>
              ) : (
                <div className="rows">
                  {upcoming.map(b => (
                    <Link key={b.id} href={`/bookings/${b.id}`} className="row">
                      <div className="datebox">
                        <div className="dow">{fmtDate(b.date, { weekday: "short" })}</div>
                        <div className="day">{b.date.getUTCDate()}</div>
                      </div>
                      <div className="grow">
                        <div className="title truncate">{b.tripType.name} with {b.client.name}</div>
                        <div className="meta">{slotLabel(b.slot)}, {fmtTime(b.startTime)}</div>
                      </div>
                      <StatusPill status={b.status} />
                      <ChevronRight className="chev" size={18} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              )}
              <div className="panel-foot">
                <Link href="/calendar" className="link">Open calendar</Link>
              </div>
            </div>
          </section>
        </div>

        {hasSide && (
          <aside className="dash-side" aria-label="Needs your attention">
            {unread.length > 0 && (
              <section className="panel attention">
                <div className="panel-head">
                  <h2>Unread messages</h2>
                  <span className="badge">{unread.reduce((n, c) => n + c.unreadCount, 0)}</span>
                </div>
                <div className="rows">
                  {unread.map(c => (
                    <Link key={c.id} href={`/inbox/${c.id}`} className="row thread-row is-unread">
                      <Avatar name={c.client.name} />
                      <div className="grow">
                        <div className="top">
                          <span className="name truncate">{c.client.name}</span>
                          {c.lastMessageAt && <span className="time">{fmtStamp(c.lastMessageAt, guide.timezone)}</span>}
                        </div>
                        <div className="preview">{c.messages[0]?.body ?? ""}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {needsConfirm.length > 0 && (
              <section className="panel attention">
                <div className="panel-head">
                  <h2>Trips needing confirmation</h2>
                </div>
                <div className="rows">
                  {needsConfirm.map(b => (
                    <Link key={b.id} href={`/bookings/${b.id}`} className="row">
                      <div className="grow">
                        <div className="title truncate">{b.client.name}</div>
                        <div className="meta">{fmtRelativeDay(b.date, today)}, {b.tripType.name}</div>
                      </div>
                      <ChevronRight className="chev" size={18} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
