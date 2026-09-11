// Demo data so the app is alive on first run: npx tsx scripts/seed.ts
// Creates guide demo@guidebook.local — log in with that email (magic link) to see it.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const guide = await prisma.guide.upsert({
    where: { email: "demo@guidebook.local" },
    update: {},
    create: {
      email: "demo@guidebook.local",
      name: "Capt. Jay Demo",
      businessName: "Marsh Light Charters",
      twilioNumber: "+15550100000",
      defaultTideStationId: "8670870", // Fort Pulaski, GA
    },
  });

  const halfAM = await prisma.tripType.create({
    data: {
      guideId: guide.id, name: "Half-Day Inshore", slot: "AM", durationHours: 4, maxAnglers: 2,
      meetingSpot: "North Ramp, Bay Access Rd", meetingLat: 31.9926, meetingLng: -80.8494,
      gearBring: ["Sunscreen & hat", "Polarized glasses", "Water & snacks", "Fishing license"],
      gearNotBring: ["Bananas (ask any captain)", "Hard-sole boots — deck-safe shoes only", "Glass bottles"],
      faqs: [
        { q: "Where do I park?", a: "Free lot at the North Ramp, plenty of space before 7am." },
        { q: "What if weather cancels the trip?", a: "I make the call by 8pm the night before — full reschedule, no charge." },
        { q: "Do I need a fishing license?", a: "Yes — GA saltwater license, link in the gear list. Takes 5 minutes online." },
      ],
    },
  });

  const fullFly = await prisma.tripType.create({
    data: {
      guideId: guide.id, name: "Full-Day Fly", slot: "FULL", durationHours: 8, maxAnglers: 1,
      meetingSpot: "Tailwater access lot", meetingLat: 34.3541, meetingLng: -84.0407,
      gearBring: ["Layers", "Rain jacket", "Polarized glasses", "Lunch (or add-on)"],
      gearNotBring: ["Felt-sole waders (invasive species rules)"],
      faqs: [{ q: "Do you provide rods?", a: "Yes — quality 5wt setups included, or bring your own." }],
    },
  });

  const mkClient = (name: string, phone: string, email: string, tags: string[], notes?: string) =>
    prisma.client.create({ data: { guideId: guide.id, name, phone, email, tags, notes } });

  const mike = await mkClient("Mike R.", "+15550102233", "mike@example.com", ["repeat", "inshore"], "Gets seasick in chop — keep him in the marsh. Brings his own 7wt.");
  const sarah = await mkClient("Sarah T.", "+15550104455", "sarah@example.com", ["new", "fly"], "First time fly fishing. Wants to target browns.");
  await mkClient("Dave K.", "+15550106677", "dave@example.com", ["repeat", "prefers artificials"]);

  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const addDays = (n: number) => { const d = new Date(today); d.setUTCDate(d.getUTCDate() + n); return d; };

  const { createBooking } = await import("../src/lib/bookings");
  const b1 = await createBooking({ guideId: guide.id, clientId: mike.id, tripTypeId: halfAM.id, date: today, startTime: "06:00", anglers: 2 });
  await prisma.booking.update({ where: { id: b1.id }, data: { status: "CONFIRMED" } });
  await createBooking({ guideId: guide.id, clientId: sarah.id, tripTypeId: fullFly.id, date: addDays(2), startTime: "06:30", notes: "First-timer, vegetarian lunch." });
  await prisma.blockedDay.create({ data: { guideId: guide.id, date: addDays(4), reason: "boat maintenance" } });

  // Conversation with pinned message
  const convo = await prisma.conversation.create({ data: { guideId: guide.id, clientId: sarah.id, lastMessageAt: new Date(), unreadCount: 1 } });
  await prisma.message.create({ data: { conversationId: convo.id, channel: "SMS", direction: "INBOUND", body: "Hey! Booked for Monday — what should I bring?", sentAt: new Date(Date.now() - 7200_000) } });
  const reply = await prisma.message.create({ data: { conversationId: convo.id, channel: "SMS", direction: "OUTBOUND", body: "Rods & tackle covered. Bring sunscreen, water, polarized glasses 👍", sentAt: new Date(Date.now() - 7000_000) } });
  await prisma.message.create({ data: { conversationId: convo.id, channel: "SMS", direction: "INBOUND", body: "Can we push to 7am?", sentAt: new Date(Date.now() - 600_000) } });

  const sarahBooking = await prisma.booking.findFirst({ where: { clientId: sarah.id } });
  if (sarahBooking) await prisma.message.update({ where: { id: reply.id }, data: { pinnedToBookingId: sarahBooking.id } });

  console.log("Seeded. Log in as demo@guidebook.local");
}

main().finally(() => prisma.$disconnect());
