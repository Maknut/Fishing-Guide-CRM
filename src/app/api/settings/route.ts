import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";

const Input = z.object({
  name: z.string().min(1),
  businessName: z.string().optional().nullable(),
  timezone: z.string().min(1),
  twilioNumber: z.string().regex(/^\+1\d{10}$/).optional().nullable(),
  defaultTideStationId: z.string().optional().nullable(),
});

export async function GET() {
  const guideId = await requireGuide();
  const guide = await prisma.guide.findUniqueOrThrow({ where: { id: guideId } });
  return NextResponse.json(guide);
}

export async function PATCH(req: NextRequest) {
  const guideId = await requireGuide();
  const parsed = Input.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Check phone format (+1 and 10 digits)" }, { status: 400 });
  const guide = await prisma.guide.update({ where: { id: guideId }, data: parsed.data });
  return NextResponse.json(guide);
}
