import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";

export default async function ClientProfile({ params }: { params: Promise<{ id: string }> }) {
  const guideId = await requireGuide();
  const { id } = await params;
  const c = await prisma.client.findFirst({
    where: { id, guideId },
    include: {
      conversation: true,
      bookings: { include: { tripType: true }, orderBy: { date: "desc" } },
    },
  });
  if (!c) notFound();

  return (
    <>
      <div className="card">
        <div className="title-sm display" style={{ fontSize: 20 }}>{c.name}</div>
        <div className="dim" style={{ marginTop: 4 }}>
          {c.phone && <>📱 {c.phone}<br /></>}
          {c.email && <>✉️ {c.email}<br /></>}
          {c.tags.length > 0 && <>Tags: {c.tags.join(" · ")}</>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {c.conversation && <Link href={`/inbox/${c.conversation.id}`} className="btn primary small">Message</Link>}
          <Link href="/bookings/new" className="btn small">Book trip</Link>
        </div>
      </div>

      {c.notes && (
        <div className="card">
          <h2>Notes</h2>
          <p className="dim">{c.notes}</p>
        </div>
      )}

      <div className="card">
        <h2>Trip history</h2>
        {c.bookings.length === 0 && <p className="dim">No trips yet.</p>}
        {c.bookings.map(b => (
          <Link key={b.id} href={`/bookings/${b.id}`} className="row" style={{ color: "inherit", marginBottom: 6 }}>
            <span className="dim">
              {b.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })} — {b.tripType.name}
            </span>
            <span className={`pill ${b.status.toLowerCase()}`}>{b.status}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
