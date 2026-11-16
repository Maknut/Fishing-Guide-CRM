import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { route, body, HttpError } from "@/lib/api";
import { TripTypePatch } from "@/lib/tripTypeShape";
import { seedSections } from "@/lib/bookings";
import { todayInTz } from "@/lib/dates";

export const PATCH = route<{ id: string }>(async (req, guideId, { id }) => {
  const data = await body(req, TripTypePatch);
  const existing = await prisma.tripType.findFirst({ where: { id, guideId }, include: { guide: { select: { timezone: true } } } });
  if (!existing) throw new HttpError(404, "That trip type no longer exists.");

  const type = await prisma.tripType.update({ where: { id }, data });

  // Upcoming trip pages are built from this template, so carry edits through to them.
  // (Past and cancelled trips keep the page the client actually saw.)
  const contentChanged = ["meetingSpot", "meetingLat", "meetingLng", "gearBring", "gearNotBring", "faqs"].some(k => k in data);
  if (contentChanged) {
    await prisma.tripPage.updateMany({
      where: { booking: { tripTypeId: id, guideId, status: { in: ["INQUIRY", "CONFIRMED"] }, date: { gte: todayInTz(existing.guide.timezone) } } },
      data: { sections: seedSections(type) as unknown as Prisma.InputJsonValue },
    });
  }
  return NextResponse.json(type);
});
