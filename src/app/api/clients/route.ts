import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";

const ClientInput = z.object({
  name: z.string().min(1),
  phone: z.string().regex(/^\+1\d{10}$/, "E.164 US phone, e.g. +15550102233").optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  const guideId = await requireGuide();
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const clients = await prisma.client.findMany({
    where: {
      guideId,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { _count: { select: { bookings: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const guideId = await requireGuide();
  const parsed = ClientInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const client = await prisma.client.create({ data: { ...parsed.data, guideId } });
  return NextResponse.json(client, { status: 201 });
}
