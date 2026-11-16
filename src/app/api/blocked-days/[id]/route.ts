import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";

export const DELETE = route<{ id: string }>(async (_req, guideId, { id }) => {
  // deleteMany scopes the delete to this guide; a missing row is already the desired result.
  await prisma.blockedDay.deleteMany({ where: { id, guideId } });
  return NextResponse.json({ ok: true });
});
