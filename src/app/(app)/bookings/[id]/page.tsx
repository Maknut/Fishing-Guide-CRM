import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";
import { StatusActions } from "@/components/StatusActions";

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const guideId = await requireGuide();
  const { id } = await params;
  const b = await prisma.booking.findFirst({
    where: { id, guideId },
    include: { client: { include: { conversation: true } }, tripType: true, tripPage: true, pinnedMessages: { orderBy: { sentAt: "asc" } } },
  });
  if (!b) notFound();

  const dateStr = b.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <>
      <div className="card">
        <div className="row">
          <div>
            <div className="title-sm display" style={{ fontSize: 18 }}>{b.tripType.name}</div>
            <div className="dim">
              {dateStr} · {b.slot !== "FULL" ? `${b.slot} · ` : ""}{b.startTime}<br />
              {b.client.name} · {b.anglers} angler{b.anglers > 1 ? "s" : ""} · {b.tripType.meetingSpot}
            </div>
          </div>
          <span className={`pill ${b.status.toLowerCase()}`}>{b.status}</span>
        </div>
      </div>

      <div className="card">
        <h2>Actions</h2>
        <StatusActions bookingId={b.id} status={b.status} tripSlug={b.tripPage?.slug ?? null} clientConversationId={b.client.conversation?.id ?? null} />
      </div>

      {b.notes && (
        <div className="card">
          <h2>Trip notes (internal)</h2>
          <p className="dim">{b.notes}</p>
        </div>
      )}

      <div className="card">
        <h2>Pinned messages (shown on trip page)</h2>
        {b.pinnedMessages.length === 0 && <p className="dim">None yet — pin messages from the client's thread.</p>}
        {b.pinnedMessages.map(m => <p key={m.id} className="dim">📌 “{m.body}”</p>)}
      </div>
    </>
  );
}
