import { Slot, BookingStatus, Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { prisma } from "./prisma";

const slugId = customAlphabet("abcdefghjkmnpqrstuvwxyz23456789", 12); // unguessable public URL token

// Slot conflict rules: FULL conflicts with everything; AM/PM conflict with themselves and FULL.
function conflictingSlots(slot: Slot): Slot[] {
  return slot === "FULL" ? ["FULL", "AM", "PM"] : [slot, "FULL"];
}

type Db = Prisma.TransactionClient | typeof prisma;

export async function assertSlotAvailable(guideId: string, date: Date, slot: Slot, excludeBookingId?: string, db: Db = prisma) {
  const conflicts = conflictingSlots(slot);
  const [booking, blocked] = await Promise.all([
    db.booking.findFirst({
      where: {
        guideId,
        date,
        slot: { in: conflicts },
        status: { in: ["INQUIRY", "CONFIRMED"] },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      include: { client: { select: { name: true } } },
    }),
    db.blockedDay.findFirst({ where: { guideId, date, slot: { in: conflicts } } }),
  ]);
  if (booking) {
    const what = booking.slot === "FULL" ? "a full-day trip" : `${booking.slot === "AM" ? "a morning" : "an afternoon"} trip`;
    throw new SlotConflictError(`${booking.client.name} already has ${what} booked that day. Pick another date or slot.`);
  }
  if (blocked) throw new SlotConflictError(`That day is blocked off${blocked.reason ? ` (${blocked.reason})` : ""}.`);
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
  const [tripType, client] = await Promise.all([
    prisma.tripType.findFirst({ where: { id: input.tripTypeId, guideId: input.guideId } }),
    prisma.client.findFirst({ where: { id: input.clientId, guideId: input.guideId }, select: { id: true } }),
  ]);
  if (!tripType) throw new SlotConflictError("That trip type no longer exists. Pick another one.");
  if (!client) throw new SlotConflictError("That client no longer exists. Pick another one.");

  // A full-day trip always takes the whole day; half-day types can be moved between AM and PM.
  const slot: Slot = tripType.slot === "FULL" ? "FULL" : input.slot && input.slot !== "FULL" ? input.slot : tripType.slot;
  const anglers = Math.min(Math.max(input.anglers ?? 1, 1), tripType.maxAnglers);

  // Check and insert in one serializable transaction so two requests can't both claim a slot.
  return prisma.$transaction(
    async tx => {
      await assertSlotAvailable(input.guideId, input.date, slot, undefined, tx);
      return tx.booking.create({
        data: {
          guideId: input.guideId,
          clientId: client.id,
          tripTypeId: tripType.id,
          date: input.date,
          slot,
          startTime: input.startTime,
          anglers,
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
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

// Seed guide-editable trip page sections from the trip type template.
export function seedSections(t: { meetingSpot: string; meetingLat: number | null; meetingLng: number | null; gearBring: string[]; gearNotBring: string[]; faqs: unknown }) {
  return [
    { id: "meet", kind: "meet", title: "Where to meet", body: t.meetingSpot, lat: t.meetingLat, lng: t.meetingLng, order: 1 },
    { id: "bring", kind: "bring", title: "What to bring", items: t.gearBring, order: 2 },
    { id: "not_bring", kind: "not_bring", title: "What NOT to bring", items: t.gearNotBring, order: 3 },
    { id: "faq", kind: "faq", title: "FAQs", qas: t.faqs ?? [], order: 4 },
  ];
}

const ALLOWED: Record<BookingStatus, BookingStatus[]> = {
  INQUIRY: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "INQUIRY"],
  COMPLETED: ["CONFIRMED"],
  CANCELLED: ["INQUIRY"],
};

export async function setBookingStatus(guideId: string, bookingId: string, status: BookingStatus) {
  // findFirst with guideId (not findUnique by id): tenant isolation
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, guideId } });
  if (!booking) return null;
  if (booking.status === status) return booking;
  if (!ALLOWED[booking.status].includes(status)) {
    throw new SlotConflictError(`A ${booking.status.toLowerCase()} booking can't be marked ${status.toLowerCase()}.`);
  }
  // Restoring a cancelled booking must not double-book a slot that has since been taken.
  if (booking.status === "CANCELLED") await assertSlotAvailable(guideId, booking.date, booking.slot, booking.id);
  return prisma.booking.update({ where: { id: booking.id }, data: { status } });
}
