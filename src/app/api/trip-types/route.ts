import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";

const Input = z.object({
  name: z.string().min(1),
  slot: z.enum(["AM", "PM", "FULL"]),
  durationHours: z.number().positive(),
  maxAnglers: z.number().int().min(1).max(6).default(2),
  meetingSpot: z.string().min(1),
  meetingLat: z.number().optional(),
  meetingLng: z.number().optional(),
  tideStationId: z.string().optional(),
  description: z.string().optional(),
  gearBring: z.array(z.string()).default([]),
  gearNotBring: z.array(z.string()).default([]),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
});

export async function GET() {
  const guideId = await requireGuide();
  const types = await prisma.tripType.findMany({ where: { guideId, archived: false }, orderBy: { name: "asc" } });
  return NextResponse.json(types);
}

export async function POST(req: NextRequest) {
  const guideId = await requireGuide();
  const parsed = Input.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const type = await prisma.tripType.create({ data: { ...parsed.data, guideId } });
  return NextResponse.json(type, { status: 201 });
}
