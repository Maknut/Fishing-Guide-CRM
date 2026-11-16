import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, body } from "@/lib/api";
import { TripTypeInput } from "@/lib/tripTypeShape";

export const GET = route(async (_req, guideId) => {
  const types = await prisma.tripType.findMany({ where: { guideId, archived: false }, orderBy: { name: "asc" } });
  return NextResponse.json(types);
});

export const POST = route(async (req, guideId) => {
  const data = await body(req, TripTypeInput);
  const type = await prisma.tripType.create({ data: { ...data, guideId } });
  return NextResponse.json(type, { status: 201 });
});
