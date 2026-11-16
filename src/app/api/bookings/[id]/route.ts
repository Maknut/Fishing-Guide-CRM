import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, body, HttpError } from "@/lib/api";
import { setBookingStatus, SlotConflictError } from "@/lib/bookings";

const Patch = z.object({
  status: z.enum(["INQUIRY", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});

export const PATCH = route<{ id: string }>(async (req, guideId, { id }) => {
  const data = await body(req, Patch);
  const existing = await prisma.booking.findFirst({ where: { id, guideId }, select: { id: true } });
  if (!existing) throw new HttpError(404, "That booking no longer exists.");
  try {
    if (data.notes !== undefined) await prisma.booking.update({ where: { id }, data: { notes: data.notes || null } });
    const booking = data.status ? await setBookingStatus(guideId, id, data.status) : await prisma.booking.findUnique({ where: { id } });
    return NextResponse.json(booking);
  } catch (e) {
    if (e instanceof SlotConflictError) throw new HttpError(409, e.message);
    throw e;
  }
});
