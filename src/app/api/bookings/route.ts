import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";
import { createBooking, SlotConflictError } from "@/lib/bookings";

const BookingInput = z.object({
  clientId: z.string(),
  tripTypeId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(["AM", "PM", "FULL"]).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  anglers: z.number().int().min(1).max(6).optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const guideId = await requireGuide();
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from"), to = sp.get("to"), status = sp.get("status");
  const bookings = await prisma.booking.findMany({
    where: {
      guideId,
      ...(from || to ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      ...(status ? { status: status as any } : {}),
    },
    include: { client: { select: { id: true, name: true } }, tripType: { select: { id: true, name: true, slot: true } }, tripPage: { select: { slug: true } } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(bookings);
}

export async function POST(req: NextRequest) {
  const guideId = await requireGuide();
  const parsed = BookingInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const booking = await createBooking({
      guideId,
      ...parsed.data,
      date: new Date(parsed.data.date + "T00:00:00Z"),
    });
    return NextResponse.json(booking, { status: 201 });
  } catch (e) {
    if (e instanceof SlotConflictError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
