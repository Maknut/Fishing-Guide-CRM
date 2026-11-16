import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, body, HttpError } from "@/lib/api";
import { parseIsoDate } from "@/lib/dates";

const Input = z.object({
  date: z.string().refine(s => parseIsoDate(s) !== null, "Choose a valid date."),
  reason: z.string().trim().max(120).optional(),
});

// Block a whole day off so it can't be booked.
export const POST = route(async (req, guideId) => {
  const data = await body(req, Input);
  const date = parseIsoDate(data.date)!;

  const booked = await prisma.booking.findFirst({
    where: { guideId, date, status: { in: ["INQUIRY", "CONFIRMED"] } },
    include: { client: { select: { name: true } } },
  });
  if (booked) throw new HttpError(409, `${booked.client.name} is booked that day. Cancel or move that trip first.`);

  const existing = await prisma.blockedDay.findFirst({ where: { guideId, date } });
  if (existing) return NextResponse.json(existing);

  const blocked = await prisma.blockedDay.create({ data: { guideId, date, slot: "FULL", reason: data.reason || null } });
  return NextResponse.json(blocked, { status: 201 });
});
