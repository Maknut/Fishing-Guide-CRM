import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";

// POST { bookingId: string | null } — pin/unpin a message to a booking (surfaces on trip page)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guideId = await requireGuide();
  const { id } = await params;
  const { bookingId } = await req.json();

  const message = await prisma.message.findFirst({
    where: { id, conversation: { guideId } },
  });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (bookingId) {
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, guideId } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const updated = await prisma.message.update({ where: { id }, data: { pinnedToBookingId: bookingId } });
  return NextResponse.json(updated);
}
