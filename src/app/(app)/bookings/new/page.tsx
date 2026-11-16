import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireGuideRecord } from "@/lib/auth";
import { isoDate, parseIsoDate, todayInTz } from "@/lib/dates";
import { BackLink, Empty, PageHead, btnClass } from "@/components/ui";
import { BookingForm } from "@/components/BookingForm";

export const metadata: Metadata = { title: "New booking" };

export default async function NewBooking({ searchParams }: { searchParams: Promise<{ date?: string; client?: string }> }) {
  const guide = await requireGuideRecord();
  const sp = await searchParams;
  const [clients, tripTypes] = await Promise.all([
    prisma.client.findMany({ where: { guideId: guide.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.tripType.findMany({
      where: { guideId: guide.id, archived: false },
      select: { id: true, name: true, slot: true, maxAnglers: true, durationHours: true, meetingSpot: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const date = parseIsoDate(sp.date);
  const clientId = clients.some(c => c.id === sp.client) ? sp.client! : "";

  return (
    <div className="page page--form">
      <BackLink href="/calendar">Calendar</BackLink>
      <PageHead title="New booking" />

      {tripTypes.length === 0 ? (
        <div className="panel">
          <Empty icon={<ClipboardList size={22} />} title="Set up a trip type first">
            <p>A trip type is the template for a booking: how long it runs, where you meet and what clients should bring.</p>
            <Link href="/settings/trip-types" className={btnClass({ variant: "primary" })}><span>Create a trip type</span></Link>
          </Empty>
        </div>
      ) : clients.length === 0 ? (
        <div className="panel">
          <Empty icon={<Users size={22} />} title="Add a client first">
            <p>Bookings belong to a client, so their messages and trip history stay together.</p>
            <Link href="/clients?new=1" className={btnClass({ variant: "primary" })}><span>Add a client</span></Link>
          </Empty>
        </div>
      ) : (
        <BookingForm clients={clients} tripTypes={tripTypes} initialClientId={clientId} initialDate={date ? isoDate(date) : ""} today={isoDate(todayInTz(guide.timezone))} />
      )}
    </div>
  );
}
