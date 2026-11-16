import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireGuideRecord } from "@/lib/auth";
import { fmtClock, fmtDayDivider, fmtRelativeDayInline, todayInTz } from "@/lib/dates";
import { Avatar } from "@/components/ui";
import { ThreadView, type ThreadMessage } from "@/components/ThreadView";

export const metadata: Metadata = { title: "Conversation" };

export default async function Thread({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ draft?: string }> }) {
  const guide = await requireGuideRecord();
  const { id } = await params;
  const { draft } = await searchParams;
  const today = todayInTz(guide.timezone);

  const convo = await prisma.conversation.findFirst({
    where: { id, guideId: guide.id },
    include: {
      client: {
        include: {
          // The trip a pinned message attaches to: the client's next active booking, today included.
          bookings: { where: { status: { in: ["INQUIRY", "CONFIRMED"] }, date: { gte: today } }, orderBy: { date: "asc" }, take: 1, include: { tripType: true } },
        },
      },
      messages: { orderBy: { sentAt: "asc" } },
    },
  });
  if (!convo) notFound();

  // Opening the thread marks it read.
  const hadUnread = convo.unreadCount > 0;
  if (hadUnread) await prisma.conversation.update({ where: { id: convo.id }, data: { unreadCount: 0 } });

  const client = convo.client;
  const nextBooking = client.bookings[0];
  const now = new Date();

  const messages: ThreadMessage[] = convo.messages.map(m => ({
    id: m.id,
    body: m.body,
    outbound: m.direction === "OUTBOUND",
    channel: m.channel,
    failed: m.status === "FAILED",
    time: fmtClock(m.sentAt, guide.timezone),
    day: fmtDayDivider(m.sentAt, guide.timezone, now),
    pinnedTo: m.pinnedToBookingId,
  }));

  const smsReady = Boolean(guide.twilioNumber && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

  return (
    <div className="thread">
      <header className="thread-head">
        <Link href="/inbox" className="icon-btn back-btn" aria-label="Back to inbox">
          <ChevronLeft size={22} aria-hidden="true" />
        </Link>
        <Avatar name={client.name} />
        <div className="who">
          <strong className="truncate">{client.name}</strong>
          <span className="truncate">
            {nextBooking
              ? `${nextBooking.tripType.name}, ${fmtRelativeDayInline(nextBooking.date, today)}`
              : client.phone ?? client.email ?? "No upcoming trip"}
          </span>
        </div>
        <Link href={`/clients/${client.id}`} className="icon-btn" aria-label={`${client.name}'s profile`} title="Client profile">
          <UserRound size={20} aria-hidden="true" />
        </Link>
      </header>

      <ThreadView
        conversationId={convo.id}
        clientId={client.id}
        clientName={client.name}
        messages={messages}
        pinBooking={nextBooking ? { id: nextBooking.id, label: nextBooking.tripType.name } : null}
        hasPhone={Boolean(client.phone)}
        hasEmail={Boolean(client.email)}
        smsReady={smsReady}
        refreshOnMount={hadUnread}
        initialDraft={typeof draft === "string" ? draft.slice(0, 1600) : ""}
      />
    </div>
  );
}
