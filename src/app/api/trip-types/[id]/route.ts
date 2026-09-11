import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";

const Patch = z.object({
  name: z.string().min(1).optional(),
  slot: z.enum(["AM", "PM", "FULL"]).optional(),
  durationHours: z.number().positive().optional(),
  maxAnglers: z.number().int().min(1).max(6).optional(),
  meetingSpot: z.string().min(1).optional(),
  meetingLat: z.number().nullable().optional(),
  meetingLng: z.number().nullable().optional(),
  tideStationId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  gearBring: z.array(z.string()).optional(),
  gearNotBring: z.array(z.string()).optional(),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guideId = await requireGuide();
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const existing = await prisma.tripType.findFirst({ where: { id, guideId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const type = await prisma.tripType.update({ where: { id }, data: parsed.data });
  return NextResponse.json(type);
}
