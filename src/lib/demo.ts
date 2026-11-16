// Demo accounts: one-click access for testers, no email needed.
// Each visitor who chooses "Try the demo" gets a private account filled with sample data.
// Demo accounts can't send texts (no SMS number) and are deleted after a week.
// Off unless DEMO_ENABLED=true, so a production site doesn't hand out accounts by accident.
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { createBooking } from "./bookings";
import { refreshTripPage } from "./tripPageRefresh";
import { addDays, todayInTz } from "./dates";

const DEMO_DOMAIN = "@demo.invalid"; // .invalid can never be a real mailbox
export const DEMO_LIFETIME_DAYS = 7;
const MAX_NEW_PER_HOUR = 40;
const MAX_ACTIVE = 400;

export function demoEnabled(): boolean {
  return process.env.DEMO_ENABLED === "true" && Boolean(process.env.DATABASE_URL);
}

export function isDemoEmail(email: string | null | undefined): boolean {
  return Boolean(email?.endsWith(DEMO_DOMAIN));
}

export class DemoUnavailable extends Error {}

/** Fill a guide's account with realistic sample data, dated relative to today. */
export async function seedDemoData(guideId: string, timezone: string) {
  const halfDay = await prisma.tripType.create({
    data: {
      guideId, name: "Half-Day Inshore", slot: "AM", durationHours: 4, maxAnglers: 2,
      description: "Sight-casting to redfish and trout in the marsh on a moving tide.",
      meetingSpot: "North Ramp, Bay Access Rd", meetingLat: 31.9926, meetingLng: -80.8494,
      gearBring: ["Sunscreen and a hat", "Polarized glasses", "Water and snacks", "Fishing license"],
      gearNotBring: ["Bananas (ask any captain)", "Hard-sole boots; deck-safe shoes only", "Glass bottles"],
      faqs: [
        { q: "Where do I park?", a: "Free lot at the North Ramp, with plenty of space before 7am." },
        { q: "What if weather cancels the trip?", a: "I make the call by 8pm the night before. You get a full reschedule at no charge." },
        { q: "Do I need a fishing license?", a: "Yes, a Georgia saltwater license. It takes five minutes online." },
      ],
    },
  });
  const fullFly = await prisma.tripType.create({
    data: {
      guideId, name: "Full-Day Fly", slot: "FULL", durationHours: 8, maxAnglers: 1,
      description: "A full day wading the tailwater for browns and rainbows.",
      meetingSpot: "Tailwater access lot", meetingLat: 34.3541, meetingLng: -84.0407,
      gearBring: ["Layers", "Rain jacket", "Polarized glasses", "Lunch"],
      gearNotBring: ["Felt-sole waders (invasive species rules)"],
      faqs: [{ q: "Do you provide rods?", a: "Yes. Quality 5-weight setups are included, or bring your own." }],
    },
  });

  const client = (name: string, phone: string, email: string, tags: string[], notes?: string) =>
    prisma.client.create({ data: { guideId, name, phone, email, tags, notes } });
  const mike = await client("Mike Reyes", "+15550102233", "mike@example.com", ["repeat", "inshore"], "Gets seasick in chop, so keep him in the marsh. Brings his own 7wt.");
  const sarah = await client("Sarah Tran", "+15550104455", "sarah@example.com", ["new", "fly"], "First time fly fishing. Wants to target browns.");
  const dave = await client("Dave Kowalski", "+15550106677", "dave@example.com", ["repeat", "prefers artificials"]);
  const lena = await client("Lena Park", "+15550108899", "lena@example.com", ["corporate"], "Books for her team twice a year.");

  const today = todayInTz(timezone);
  const book = (clientId: string, tripTypeId: string, offset: number, startTime: string, extra: { slot?: "AM" | "PM"; anglers?: number; notes?: string } = {}) =>
    createBooking({ guideId, clientId, tripTypeId, date: addDays(today, offset), startTime, ...extra });

  const past = await book(lena.id, halfDay.id, -9, "06:00", { anglers: 2 });
  const todayTrip = await book(mike.id, halfDay.id, 0, "06:00", { anglers: 2 });
  const flyTrip = await book(sarah.id, fullFly.id, 2, "06:30", { notes: "First-timer, vegetarian lunch." });
  const afternoon = await book(dave.id, halfDay.id, 5, "13:00", { slot: "PM" });
  await prisma.booking.update({ where: { id: past.id }, data: { status: "COMPLETED" } });
  await prisma.booking.updateMany({ where: { id: { in: [todayTrip.id, afternoon.id] } }, data: { status: "CONFIRMED" } });
  await prisma.blockedDay.create({ data: { guideId, date: addDays(today, 4), reason: "Boat maintenance" } });

  const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);
  const sarahThread = await prisma.conversation.create({ data: { guideId, clientId: sarah.id, lastMessageAt: ago(10), unreadCount: 1 } });
  await prisma.message.create({ data: { conversationId: sarahThread.id, channel: "SMS", direction: "INBOUND", body: "Hey! Excited for the trip. What should I bring?", sentAt: ago(125) } });
  await prisma.message.create({ data: { conversationId: sarahThread.id, channel: "SMS", direction: "OUTBOUND", body: "Rods and flies are covered. Bring layers, a rain jacket and polarized glasses. Waders too if you have them; I have loaners if not.", sentAt: ago(118), pinnedToBookingId: flyTrip.id } });
  await prisma.message.create({ data: { conversationId: sarahThread.id, channel: "SMS", direction: "INBOUND", body: "Perfect. Can we push the start to 7am?", sentAt: ago(10) } });

  const mikeThread = await prisma.conversation.create({ data: { guideId, clientId: mike.id, lastMessageAt: ago(60 * 20), unreadCount: 0 } });
  await prisma.message.create({ data: { conversationId: mikeThread.id, channel: "SMS", direction: "OUTBOUND", body: "Tide looks great for tomorrow morning. See you at the North Ramp at 6.", sentAt: ago(60 * 21) } });
  await prisma.message.create({ data: { conversationId: mikeThread.id, channel: "SMS", direction: "INBOUND", body: "We'll be there. Bringing my brother-in-law.", sentAt: ago(60 * 20) } });

  return [todayTrip, flyTrip, afternoon].flatMap(b => (b.tripPage ? [b.tripPage.id] : []));
}

/**
 * Create a private demo account and a signed-in session for it.
 * Returns the session token to set as the Auth.js session cookie.
 */
export async function createDemoAccount(): Promise<{ sessionToken: string; expires: Date }> {
  if (!demoEnabled()) throw new DemoUnavailable("The demo isn't turned on for this site.");

  // Light protection against someone hammering the button.
  const [lastHour, active] = await Promise.all([
    prisma.guide.count({ where: { email: { endsWith: DEMO_DOMAIN }, createdAt: { gte: new Date(Date.now() - 3_600_000) } } }),
    prisma.guide.count({ where: { email: { endsWith: DEMO_DOMAIN } } }),
  ]);
  if (lastHour >= MAX_NEW_PER_HOUR || active >= MAX_ACTIVE) {
    throw new DemoUnavailable("A lot of people are trying the demo right now. Try again in a little while.");
  }

  const email = `demo-${randomBytes(9).toString("hex")}${DEMO_DOMAIN}`;
  const expires = new Date(Date.now() + DEMO_LIFETIME_DAYS * 86_400_000);
  const sessionToken = randomBytes(32).toString("hex");

  const guide = await prisma.guide.create({
    data: { email, name: "Capt. Jay Morgan", businessName: "Marsh Light Charters", timezone: "America/New_York", defaultTideStationId: "8670870" },
  });
  await prisma.user.create({ data: { email, name: guide.name, emailVerified: new Date(), sessions: { create: { sessionToken, expires } } } });

  const pageIds = await seedDemoData(guide.id, guide.timezone);

  // Real tides and forecast for the sample trips. Give NOAA a few seconds, then move on;
  // the daily refresh fills in anything that didn't arrive in time.
  await Promise.race([
    Promise.allSettled(pageIds.map(id => refreshTripPage(id))),
    new Promise(resolve => setTimeout(resolve, 4000)),
  ]);

  return { sessionToken, expires };
}

/** Delete demo accounts past their lifetime. Run from the daily cron. */
export async function cleanupDemoAccounts(): Promise<number> {
  const cutoff = new Date(Date.now() - DEMO_LIFETIME_DAYS * 86_400_000);
  const stale = await prisma.guide.findMany({ where: { email: { endsWith: DEMO_DOMAIN }, createdAt: { lt: cutoff } }, select: { id: true, email: true } });
  if (stale.length === 0) return 0;
  const ids = stale.map(g => g.id), emails = stale.map(g => g.email);
  // Bookings first: they hold references to clients and trip types that block a plain cascade.
  await prisma.$transaction([
    prisma.booking.deleteMany({ where: { guideId: { in: ids } } }),
    prisma.guide.deleteMany({ where: { id: { in: ids } } }),
    prisma.user.deleteMany({ where: { email: { in: emails } } }),
  ]);
  return stale.length;
}
