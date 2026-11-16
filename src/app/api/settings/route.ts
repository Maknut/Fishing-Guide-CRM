import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, body, HttpError } from "@/lib/api";

function isTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const Input = z.object({
  name: z.string().trim().min(1, "Add your name.").max(120),
  businessName: z.string().trim().max(120).nullable().optional(),
  timezone: z.string().refine(isTimeZone, "Choose a time zone from the list."),
  twilioNumber: z.string().regex(/^\+1\d{10}$/, "Enter the number as +1 followed by 10 digits.").nullable().optional(),
  defaultTideStationId: z.string().trim().regex(/^\d{7}$/, "Tide station IDs are 7 digits. Use Find to look one up.").nullable().optional(),
});

const PUBLIC_FIELDS = { id: true, name: true, email: true, businessName: true, timezone: true, twilioNumber: true, defaultTideStationId: true } as const;

export const GET = route(async (_req, guideId) => {
  const guide = await prisma.guide.findUnique({ where: { id: guideId }, select: PUBLIC_FIELDS });
  return NextResponse.json(guide);
});

export const PATCH = route(async (req, guideId) => {
  const data = await body(req, Input);
  try {
    const guide = await prisma.guide.update({
      where: { id: guideId },
      data: { ...data, businessName: data.businessName || null },
      select: PUBLIC_FIELDS,
    });
    return NextResponse.json(guide);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "That SMS number is already in use on another account.");
    }
    throw e;
  }
});
