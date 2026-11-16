import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";
import { ClientList } from "@/components/ClientList";

export const metadata: Metadata = { title: "Clients" };

export default async function Clients({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const guideId = await requireGuide();
  const sp = await searchParams;
  const clients = await prisma.client.findMany({
    where: { guideId },
    include: { _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } } },
    orderBy: { name: "asc" },
  });

  return (
    <ClientList
      openNew={sp.new === "1"}
      clients={clients.map(c => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, tags: c.tags, trips: c._count.bookings, lastTrip: null }))}
    />
  );
}
