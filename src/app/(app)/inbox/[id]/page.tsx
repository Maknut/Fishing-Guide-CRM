import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";
import { ReplyBox } from "@/components/ReplyBox";
import { PinButton } from "@/components/PinButton";

export default async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const guideId = await requireGuide();
  const { id } = await params;
  const convo = await prisma.conversation.findFirst({
    where: { id, guideId },
    include: {
      client: { include: { bookings: { where: { status: { in: ["INQUIRY", "CONFIRMED"] }, date: { gte: new Date() } }, orderBy: { date: "asc" }, take: 1, include: { tripType: true } } } },
      messages: { orderBy: { sentAt: "asc" } },
    },
  });
  if (!convo) notFound();

  // Opening the thread clears unread
  if (convo.unreadCount > 0) {
    await prisma.conversation.update({ where: { id: convo.id }, data: { unreadCount: 0 } });
  }

  const nextBooking = convo.client.bookings[0];

  return (
    <>
      <div className="card">
        <div className="row">
          <div>
            <div className="title-sm">{convo.client.name}</div>
            {nextBooking && (
              <div className="dim">
                Next: {nextBooking.date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", timeZone: "UTC" })} · {nextBooking.tripType.name} · {nextBooking.status.toLowerCase()}
              </div>
            )}
          </div>
          <Link href={`/clients/${convo.client.id}`} className="btn small">Profile</Link>
        </div>
      </div>

      <div className="thread-scroll">
        {convo.messages.map(m => (
          <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.direction === "OUTBOUND" ? "flex-end" : "flex-start" }}>
            <div className={`msg ${m.direction === "OUTBOUND" ? "out" : "in"} ${m.pinnedToBookingId ? "pinned" : ""}`}>{m.body}</div>
            <div className="msg-meta">
              {m.channel} · {m.sentAt.toLocaleString("en-US", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" })}
              {m.pinnedToBookingId && " · 📌 pinned"}
              {nextBooking && <PinButton messageId={m.id} bookingId={nextBooking.id} pinned={!!m.pinnedToBookingId} />}
            </div>
          </div>
        ))}
        {convo.messages.length === 0 && <p className="dim">No messages yet.</p>}
      </div>

      <ReplyBox conversationId={convo.id} clientId={convo.client.id} hasPhone={!!convo.client.phone} hasEmail={!!convo.client.email} />
    </>
  );
}
