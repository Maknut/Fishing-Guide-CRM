import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CloudOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireGuideRecord } from "@/lib/auth";
import { daysBetween, fmtDate, fmtTime, isoDate, plural, todayInTz } from "@/lib/dates";
import { readTides, readWeather } from "@/lib/conditions";
import { fmtPhone, slotLabel } from "@/lib/labels";
import { Avatar, BackLink, StatusPill } from "@/components/ui";
import { MessageButton } from "@/components/MessageButton";
import { StatusActions } from "@/components/StatusActions";
import { TripLink } from "@/components/TripLink";
import { NotesEditor } from "@/components/NotesEditor";
import { Conditions } from "@/components/Conditions";
import { TideChart } from "@/components/TideChart";

export const metadata: Metadata = { title: "Booking" };

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const guide = await requireGuideRecord();
  const { id } = await params;
  const b = await prisma.booking.findFirst({
    where: { id, guideId: guide.id },
    include: { client: true, tripType: true, tripPage: true, pinnedMessages: { orderBy: { sentAt: "asc" } } },
  });
  if (!b) notFound();

  const today = todayInTz(guide.timezone);
  const daysOut = daysBetween(today, b.date);
  const weather = readWeather(b.tripPage?.weatherSnapshot);
  const tides = readTides(b.tripPage?.tidePredictions);
  const hasStation = Boolean(b.tripPage?.tideStationId ?? b.tripType.tideStationId ?? guide.defaultTideStationId);
  const hasPoint = b.tripType.meetingLat != null && b.tripType.meetingLng != null;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const tripPath = b.tripPage ? `/trip/${b.tripPage.slug}` : null;
  const month = `${b.date.getUTCFullYear()}-${b.date.getUTCMonth() + 1}`;

  return (
    <div className="page">
      <BackLink href={`/calendar?m=${month}&d=${isoDate(b.date)}`}>Calendar</BackLink>

      <header className="booking-hero">
        <div>
          <StatusPill status={b.status} />
          <h1 style={{ marginTop: 10 }}>{b.tripType.name}</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            with <Link href={`/clients/${b.client.id}`} className="link">{b.client.name}</Link>
          </p>
        </div>
        <div className="panel panel-pad">
          <dl className="facts-grid">
            <div className="fact">
              <dt className="k">Date</dt>
              <dd className="v">{fmtDate(b.date, { weekday: "short", month: "short", day: "numeric", year: daysOut > 300 || daysOut < -300 ? "numeric" : undefined })}</dd>
            </div>
            <div className="fact">
              <dt className="k">{slotLabel(b.slot)}</dt>
              <dd className="v">{fmtTime(b.startTime)}, {b.tripType.durationHours} hr</dd>
            </div>
            <div className="fact">
              <dt className="k">Party</dt>
              <dd className="v">{plural(b.anglers, "angler")}</dd>
            </div>
            <div className="fact">
              <dt className="k">Meet at</dt>
              <dd className="v">{b.tripType.meetingSpot}</dd>
            </div>
          </dl>
        </div>
        <StatusActions bookingId={b.id} status={b.status} clientName={b.client.name} />
      </header>

      <div className="two-col section">
        <div className="stack">
          <section className="panel">
            <div className="panel-head"><h2>Conditions on trip day</h2></div>
            <div className="panel-pad" style={{ paddingTop: 4 }}>
              {weather ? (
                <Conditions weather={weather} />
              ) : (
                <p className="muted inline-icon" style={{ alignItems: "flex-start" }}>
                  <CloudOff size={16} aria-hidden="true" style={{ marginTop: 3 }} />
                  <span>
                    {!hasPoint
                      ? "Add a latitude and longitude to this trip type to get a forecast."
                      : daysOut > 7
                        ? `The forecast arrives about a week out, around ${fmtDate(new Date(b.date.getTime() - 7 * 86_400_000), { month: "short", day: "numeric" })}.`
                        : daysOut < 0
                          ? "No forecast was saved for this trip."
                          : "The forecast is on its way. Check back in a few minutes."}
                  </span>
                </p>
              )}
              {tides.length > 0 ? (
                <div style={{ marginTop: 20 }}>
                  <TideChart tides={tides} startTime={b.startTime} durationHours={b.tripType.durationHours} />
                </div>
              ) : (
                hasStation && daysOut >= 0 && <p className="meta" style={{ marginTop: 12 }}>Tide times load shortly after booking.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Private notes</h2></div>
            <div className="panel-pad" style={{ paddingTop: 4 }}>
              <NotesEditor endpoint={`/api/bookings/${b.id}`} initial={b.notes ?? ""} label="Private notes for this booking" placeholder="First-timer, wants to target reds, vegetarian lunch" />
              <p className="meta" style={{ marginTop: 8 }}>Only you see these. They never appear on the trip page.</p>
            </div>
          </section>
        </div>

        <div className="stack">
          {tripPath && b.status !== "CANCELLED" && (
            <section className="panel">
              <div className="panel-head"><h2>Trip page for {b.client.name.split(/\s+/)[0]}</h2></div>
              <div className="panel-pad" style={{ paddingTop: 4 }}>
                <TripLink url={`${proto}://${host}${tripPath}`} path={tripPath} clientId={b.client.id} clientName={b.client.name} canText={Boolean(b.client.phone)} />
              </div>
            </section>
          )}

          <section className="panel">
            <div className="panel-head"><h2>Pinned to the trip page</h2></div>
            <div className="panel-pad" style={{ paddingTop: 4 }}>
              {b.pinnedMessages.length === 0 ? (
                <p className="muted">Nothing pinned. Pin a message in the conversation and it shows at the top of their trip page.</p>
              ) : (
                b.pinnedMessages.map(m => <p key={m.id} className="quote">{m.body}</p>)
              )}
            </div>
          </section>

          <section className="panel">
            <div className="row">
              <Avatar name={b.client.name} />
              <div className="grow">
                <div className="title truncate">{b.client.name}</div>
                <div className="meta truncate">{fmtPhone(b.client.phone) || b.client.email || "No contact details"}</div>
              </div>
              <MessageButton clientId={b.client.id} size="sm" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
