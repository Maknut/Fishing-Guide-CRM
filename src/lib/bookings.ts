import { Slot, BookingStatus, Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { prisma } from "./prisma";

const slugId = customAlphabet("abcdefghjkmnpqrstuvwxyz23456789", 12); // unguessable public URL token

// Slot conflict rules: FULL conflicts with everything; AM/PM conflict with themselves and FULL.
function conflictingSlots(slot: Slot): Slot[] {
  return slot === "FULL" ? ["FULL", "AM", "PM"] : [slot, "FULL"];
}

export async function assertSlotAvailable(guideId: string, date: Date, slot: Slot, excludeBookingId?: string) {
  const conflicts = conflictingSlots(slot);
  const [booking, blocked] = await Promise.all([
    prisma.booking.findFirst({
      where: {
        guideId,
        date,
        slot: { in: conflicts },
        status: { in: ["INQUIRY", "CONFIRMED"] },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
    }),
    prisma.blockedDay.findFirst({ where: { guideId, date, slot: { in: conflicts } } }),
  ]);
  if (booking) throw new SlotConflictError(`Slot taken: ${booking.slot} booking already exists for that date`);
  if (blocked) throw new SlotConflictError(`Day is blocked${blocked.reason ? ` (${blocked.reason})` : ""}`);
}

export class SlotConflictError extends Error {}

export async function createBooking(input: {
  guideId: string;
  clientId: string;
  tripTypeId: string;
  date: Date;
  slot?: Slot;
  startTime: string;
  anglers?: number;
  notes?: string;
}) {
  const tripType = await prisma.tripType.findFirstOrThrow({
    where: { id: input.tripTypeId, guideId: input.guideId },
  });
  const slot = input.slot ?? tripType.slot;
  await assertSlotAvailable(input.guideId, input.date, slot);

  return prisma.booking.create({
    data: {
      guideId: input.guideId,
      clientId: input.clientId,
      tripTypeId: tripType.id,
      date: input.date,
      slot,
      startTime: input.startTime,
      anglers: input.anglers ?? 1,
      notes: input.notes,
      status: "INQUIRY",
      tripPage: {
        create: {
          slug: slugId(),
          tideStationId: tripType.tideStationId ?? undefined,
          sections: seedSections(tripType) as unknown as Prisma.InputJsonValue,
        },
      },
    },
    include: { tripPage: true, client: true, tripType: true },
  });
}

// Seed guide-editable trip page sections from the trip type template.
function seedSections(t: { meetingSpot: string; meetingLat: number | null; meetingLng: number | null; gearBring: string[]; gearNotBring: string[]; faqs: unknown }) {
  return [
    { id: "meet", kind: "meet", title: "Where to meet", body: t.meetingSpot, lat: t.meetingLat, lng: t.meetingLng, order: 1 },
    { id: "bring", kind: "bring", title: "What to bring", items: t.gearBring, order: 2 },
    { id: "not_bring", kind: "not_bring", title: "What NOT to bring", items: t.gearNotBring, order: 3 },
    { id: "faq", kind: "faq", title: "FAQs", qas: t.faqs ?? [], order: 4 },
  ];
}

export async function setBookingStatus(guideId: string, bookingId: string, status: BookingStatus) {
  // findFirst with guideId (not findUnique by id) — tenant isolation
  const booking = await prisma.booking.findFirstOrThrow({ where: { id: bookingId, guideId } });
  return prisma.booking.update({ where: { id: booking.id }, data: { status } });
}
