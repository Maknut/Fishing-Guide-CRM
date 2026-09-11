import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";
import { ScreenTitle } from "@/components/ScreenTitle";
import { AddClient } from "@/components/AddClient";

export default async function Clients() {
  const guideId = await requireGuide();
  const clients = await prisma.client.findMany({
    where: { guideId },
    include: { _count: { select: { bookings: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <ScreenTitle>Clients</ScreenTitle>
      <AddClient />
      {clients.map(c => (
        <Link key={c.id} href={`/clients/${c.id}`} className="card">
          <div className="row">
            <div>
              <div className="title-sm">{c.name}</div>
              <div className="dim">{c.tags.join(" · ") || c.phone || c.email || "—"}</div>
            </div>
            <span className="dim">{c._count.bookings} trip{c._count.bookings === 1 ? "" : "s"}</span>
          </div>
        </Link>
      ))}
      {clients.length === 0 && <p className="dim">No clients yet — add your first above.</p>}
    </>
  );
}
