import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireGuideRecord } from "@/lib/auth";
import { fmtDate, fmtTime, isoDate, parseIsoDate, todayInTz } from "@/lib/dates";
import { SLOT_SHORT, slotLabel } from "@/lib/labels";
import { Empty, PageHead, StatusPill, btnClass } from "@/components/ui";
import { BlockDay } from "@/components/BlockDay";
import { LinkPending } from "@/components/LinkPending";

export const metadata: Metadata = { title: "Calendar" };

type SlotMark = { am?: string; pm?: string };

function parseMonth(m: string | undefined, fallback: Date): { year: number; month: number } {
  const match = /^(\d{4})-(\d{1,2})$/.exec(m ?? "");
  const year = Number(match?.[1]), month = Number(match?.[2]);
  if (match && year >= 2000 && year <= 2100 && month >= 1 && month <= 12) return { year, month };
  return { year: fallback.getUTCFullYear(), month: fallback.getUTCMonth() + 1 };
}

export default async function Calendar({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const guide = await requireGuideRecord();
  const sp = await searchParams;
  const today = todayInTz(guide.timezone);

  const pickedDay = parseIsoDate(sp.d);
  const { year, month } = parseMonth(sp.m, pickedDay ?? today);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  const daysInMonth = last.getUTCDate();
  const inMonth = (d: Date) => d >= first && d <= last;

  // The day shown in the side panel: the one picked, else today when it's in view.
  const selected = pickedDay && inMonth(pickedDay) ? pickedDay : inMonth(today) ? today : null;

  const [bookings, blocked] = await Promise.all([
    prisma.booking.findMany({
      where: { guideId: guide.id, date: { gte: first, lte: last }, status: { in: ["INQUIRY", "CONFIRMED", "COMPLETED"] } },
      include: { client: true, tripType: true },
      orderBy: [{ date: "asc" }, { slot: "asc" }, { startTime: "asc" }],
    }),
    prisma.blockedDay.findMany({ where: { guideId: guide.id, date: { gte: first, lte: last } } }),
  ]);

  const marks: Record<number, SlotMark> = {};
  const mark = (day: number, slot: string, cls: string) => {
    const m = (marks[day] ??= {});
    if (slot === "FULL" || slot === "AM") m.am = cls;
    if (slot === "FULL" || slot === "PM") m.pm = cls;
  };
  for (const bl of blocked) mark(bl.date.getUTCDate(), bl.slot, "blocked");
  for (const b of bookings) mark(b.date.getUTCDate(), b.slot, b.status.toLowerCase());

  const monthKey = `${year}-${month}`;
  const prev = month === 1 ? `${year - 1}-12` : `${year}-${month - 1}`;
  const next = month === 12 ? `${year + 1}-1` : `${year}-${month + 1}`;
  const monthName = fmtDate(first, { month: "long", year: "numeric" });
  const leading = first.getUTCDay();
  const trailing = (7 - ((leading + daysInMonth) % 7)) % 7;

  const dayBookings = selected ? bookings.filter(b => b.date.getTime() === selected.getTime()) : [];
  const dayBlocked = selected ? blocked.find(b => b.date.getTime() === selected.getTime()) ?? null : null;
  const dayActive = dayBookings.filter(b => b.status !== "COMPLETED");
  const dayFull = dayActive.some(b => b.slot === "FULL") || (dayActive.some(b => b.slot === "AM") && dayActive.some(b => b.slot === "PM"));
  const selectedIsPast = selected ? selected < today : false;
  const upcoming = bookings.filter(b => b.date >= today && b.status !== "COMPLETED");

  return (
    <div className="page">
      <PageHead title={monthName}>
        <div className="cal-nav">
          <Link href={`/calendar?m=${prev}`} className="icon-btn" aria-label="Previous month" scroll={false}>
            <LinkPending><ChevronLeft size={20} aria-hidden="true" /></LinkPending>
          </Link>
          <Link href="/calendar" className={btnClass({ size: "sm", variant: "ghost" })} scroll={false}>
            <span>Today</span>
          </Link>
          <Link href={`/calendar?m=${next}`} className="icon-btn" aria-label="Next month" scroll={false}>
            <LinkPending><ChevronRight size={20} aria-hidden="true" /></LinkPending>
          </Link>
        </div>
        <Link href={selected && !selectedIsPast ? `/bookings/new?date=${isoDate(selected)}` : "/bookings/new"} className={btnClass({ variant: "primary" })}>
          <Plus size={18} aria-hidden="true" />
          <span>New booking</span>
        </Link>
      </PageHead>

      <div className="cal-layout">
        <section className="panel cal" aria-label={monthName}>
          <div className="cal-dows" aria-hidden="true">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="cal-grid">
            {Array.from({ length: leading }, (_, i) => <div key={`lead-${i}`} className="cal-cell is-pad" aria-hidden="true" />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const date = new Date(Date.UTC(year, month - 1, day));
              const m = marks[day];
              const dayItems = bookings.filter(b => b.date.getUTCDate() === day);
              const isBlocked = blocked.some(b => b.date.getUTCDate() === day);
              const cls = [
                "cal-cell",
                date.getTime() === today.getTime() && "is-today",
                date < today && "is-past",
                selected && date.getTime() === selected.getTime() && "is-selected",
              ].filter(Boolean).join(" ");
              const summary = isBlocked ? "blocked off" : dayItems.length ? dayItems.map(b => `${slotLabel(b.slot)} ${b.client.name}`).join(", ") : "open";
              return (
                <Link
                  key={day}
                  href={`/calendar?m=${monthKey}&d=${isoDate(date)}`}
                  scroll={false}
                  className={cls}
                  aria-label={`${fmtDate(date, { weekday: "long", month: "long", day: "numeric" })}: ${summary}`}
                  aria-current={selected && date.getTime() === selected.getTime() ? "date" : undefined}
                >
                  <LinkPending overlay />
                  <span className="num">{day}</span>
                  <span className="halves" aria-hidden="true">
                    <span className={`half ${m?.am ?? ""}`} />
                    <span className={`half ${m?.pm ?? ""}`} />
                  </span>
                  <span className="cal-chips" aria-hidden="true">
                    {isBlocked && <span className="chip blocked"><span>Blocked</span></span>}
                    {dayItems.map(b => (
                      <span key={b.id} className={`chip ${b.status.toLowerCase()}`}>
                        <b>{SLOT_SHORT[b.slot]}</b>
                        <span>{b.client.name}</span>
                      </span>
                    ))}
                  </span>
                </Link>
              );
            })}
            {Array.from({ length: trailing }, (_, i) => <div key={`trail-${i}`} className="cal-cell is-pad" aria-hidden="true" />)}
          </div>
          <div className="cal-legend">
            <span><i style={{ background: "var(--green)" }} />Confirmed</span>
            <span><i style={{ background: "var(--sunrise)" }} />Inquiry</span>
            <span><i className="half completed" />Completed</span>
            <span><i className="half blocked" />Blocked</span>
            <span className="cal-legend-note">Each day splits into morning and afternoon.</span>
          </div>
        </section>

        <div className="cal-side stack">
          {selected && (
            <section className="panel" aria-label="Selected day">
              <div className="panel-head">
                <h2>{selected.getTime() === today.getTime() ? "Today" : selectedIsPast ? "Earlier" : "Selected day"}</h2>
                {dayBlocked && <span className="pill pill--blocked pill--plain">Blocked</span>}
              </div>
              <p className="day-title">{fmtDate(selected, { weekday: "long", month: "long", day: "numeric" })}</p>

              {dayBookings.length > 0 && (
                <div className="rows day-rows">
                  {dayBookings.map(b => (
                    <Link key={b.id} href={`/bookings/${b.id}`} className="row">
                      <div className="grow">
                        <div className="title truncate">{b.tripType.name} with {b.client.name}</div>
                        <div className="meta">{slotLabel(b.slot)}, {fmtTime(b.startTime)}</div>
                      </div>
                      <StatusPill status={b.status} />
                    </Link>
                  ))}
                </div>
              )}
              {dayBookings.length === 0 && (
                <p className="panel-pad muted day-note">
                  {dayBlocked ? `Blocked off${dayBlocked.reason ? `: ${dayBlocked.reason}` : ""}.` : selectedIsPast ? "Nothing was booked." : "Open all day."}
                </p>
              )}

              {!selectedIsPast && (
                <div className="panel-foot actions-bar">
                  {!dayBlocked && !dayFull && (
                    <Link href={`/bookings/new?date=${isoDate(selected)}`} className={btnClass({ size: "sm", variant: "primary" })}>
                      <Plus size={16} aria-hidden="true" />
                      <span>{dayActive.length > 0 ? "Book the open half" : "Book this day"}</span>
                    </Link>
                  )}
                  {(dayBlocked || dayActive.length === 0) && (
                    <BlockDay date={isoDate(selected)} dateLabel={fmtDate(selected, { weekday: "long", month: "short", day: "numeric" })} blockedId={dayBlocked?.id ?? null} />
                  )}
                  {dayFull && !dayBlocked && <span className="meta">Fully booked.</span>}
                </div>
              )}
            </section>
          )}

          <section className="panel" aria-label="Coming up this month">
            <div className="panel-head"><h2>Coming up in {fmtDate(first, { month: "long" })}</h2></div>
            {upcoming.length === 0 ? (
              <Empty compact icon={<CalendarDays size={22} />} title="Nothing coming up">
                <p>Pick a day on the calendar to book a trip.</p>
              </Empty>
            ) : (
              <div className="rows">
                {upcoming.map(b => (
                  <Link key={b.id} href={`/bookings/${b.id}`} className="row">
                    <div className={`datebox${b.date.getTime() === today.getTime() ? " is-today" : ""}`}>
                      <div className="dow">{fmtDate(b.date, { weekday: "short" })}</div>
                      <div className="day">{b.date.getUTCDate()}</div>
                    </div>
                    <div className="grow">
                      <div className="title truncate">{b.client.name}</div>
                      <div className="meta truncate">{b.tripType.name}, {fmtTime(b.startTime)}</div>
                    </div>
                    <StatusPill status={b.status} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
