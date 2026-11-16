import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, body, HttpError } from "@/lib/api";

const ClientInput = z.object({
  name: z.string().trim().min(1, "Add the client's name.").max(120),
  phone: z.string().regex(/^\+1\d{10}$/, "Enter a 10-digit US phone number.").optional(),
  email: z.string().trim().email("That email address doesn't look right.").optional(),
  notes: z.string().trim().max(4000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export const GET = route(async (req, guideId) => {
  const q = req.nextUrl.searchParams.get("q")?.trim() || undefined;
  const clients = await prisma.client.findMany({
    where: {
      guideId,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { _count: { select: { bookings: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(clients);
});

export const POST = route(async (req, guideId) => {
  const data = await body(req, ClientInput);
  try {
    const client = await prisma.client.create({ data: { ...data, guideId } });
    return NextResponse.json(client, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = data.phone ? await prisma.client.findFirst({ where: { guideId, phone: data.phone }, select: { name: true } }) : null;
      throw new HttpError(409, existing ? `That phone number already belongs to ${existing.name}.` : "A client with that phone number already exists.");
    }
    throw e;
  }
});
