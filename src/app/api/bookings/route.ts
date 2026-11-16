import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, body, HttpError } from "@/lib/api";
import { createBooking, SlotConflictError } from "@/lib/bookings";
import { parseIsoDate } from "@/lib/dates";
import { refreshTripPage } from "@/lib/tripPageRefresh";

const BookingInput = z.object({
  clientId: z.string().min(1, "Choose a client."),
  tripTypeId: z.string().min(1, "Choose a trip type."),
  date: z.string().refine(s => parseIsoDate(s) !== null, "Choose a valid date."),
  slot: z.enum(["AM", "PM", "FULL"]).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a start time."),
  anglers: z.number().int().min(1).max(6).optional(),
  notes: z.string().trim().max(4000).optional(),
});

const STATUSES = ["INQUIRY", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

export const GET = route(async (req, guideId) => {
  const sp = req.nextUrl.searchParams;
  const from = parseIsoDate(sp.get("from")), to = parseIsoDate(sp.get("to"));
  const status = STATUSES.find(s => s === sp.get("status"));
  const bookings = await prisma.booking.findMany({
    where: {
      guideId,
      ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(status ? { status } : {}),
    },
    include: { client: { select: { id: true, name: true } }, tripType: { select: { id: true, name: true, slot: true } }, tripPage: { select: { slug: true } } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(bookings);
});

export const POST = route(async (req, guideId) => {
  const data = await body(req, BookingInput);
  try {
    const booking = await createBooking({ guideId, ...data, date: parseIsoDate(data.date)! });
    // Fetch tides and forecast after responding, so the new trip page isn't empty until the nightly refresh.
    const pageId = booking.tripPage?.id;
    if (pageId) after(() => refreshTripPage(pageId).catch(e => console.error("[trip page] refresh failed", e)));
    return NextResponse.json(booking, { status: 201 });
  } catch (e) {
    if (e instanceof SlotConflictError) throw new HttpError(409, e.message);
    // Two requests raced for the same slot; the serializable transaction rejected one.
    if ((e as { code?: string }).code === "P2034") throw new HttpError(409, "That slot was just taken. Refresh and pick another.");
    throw e;
  }
});
