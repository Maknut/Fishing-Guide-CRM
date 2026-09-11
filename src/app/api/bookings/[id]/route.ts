import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireGuide } from "@/lib/auth";
import { setBookingStatus } from "@/lib/bookings";

const Patch = z.object({ status: z.enum(["INQUIRY", "CONFIRMED", "COMPLETED", "CANCELLED"]) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guideId = await requireGuide();
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const booking = await setBookingStatus(guideId, id, parsed.data.status);
  return NextResponse.json(booking);
}
