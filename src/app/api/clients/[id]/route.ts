import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, body, HttpError } from "@/lib/api";

const Patch = z.object({
  name: z.string().trim().min(1, "Add the client's name.").max(120).optional(),
  phone: z.string().regex(/^\+1\d{10}$/, "Enter a 10-digit US phone number.").nullable().optional(),
  email: z.string().trim().email("That email address doesn't look right.").nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const PATCH = route<{ id: string }>(async (req, guideId, { id }) => {
  const data = await body(req, Patch);
  const existing = await prisma.client.findFirst({ where: { id, guideId }, select: { id: true } });
  if (!existing) throw new HttpError(404, "That client no longer exists.");
  try {
    return NextResponse.json(await prisma.client.update({ where: { id }, data }));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "Another client already has that phone number.");
    }
    throw e;
  }
});
