import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";
import { BackLink, PageHead } from "@/components/ui";
import { TripTypeEditor } from "@/components/TripTypeEditor";

export const metadata: Metadata = { title: "Edit trip type" };

export default async function EditTripType({ params }: { params: Promise<{ id: string }> }) {
  const guideId = await requireGuide();
  const { id } = await params;
  const t = await prisma.tripType.findFirst({ where: { id, guideId, archived: false } });
  if (!t) notFound();

  const faqs = Array.isArray(t.faqs)
    ? (t.faqs as unknown[]).flatMap(f => {
        const item = f as { q?: unknown; a?: unknown };
        return typeof item?.q === "string" ? [{ q: item.q, a: typeof item.a === "string" ? item.a : "" }] : [];
      })
    : [];

  return (
    <div className="page page--narrow">
      <BackLink href="/settings">Settings</BackLink>
      <PageHead title={t.name} />
      <TripTypeEditor
        initial={{
          id: t.id, name: t.name, slot: t.slot, durationHours: t.durationHours, maxAnglers: t.maxAnglers,
          meetingSpot: t.meetingSpot, meetingLat: t.meetingLat, meetingLng: t.meetingLng, tideStationId: t.tideStationId,
          description: t.description, gearBring: t.gearBring, gearNotBring: t.gearNotBring, faqs,
        }}
      />
    </div>
  );
}
