import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, body, HttpError } from "@/lib/api";
import { ensureConversation } from "@/lib/sms";

// POST { clientId } -> the client's conversation, created if this is the first message.
export const POST = route(async (req, guideId) => {
  const { clientId } = await body(req, z.object({ clientId: z.string().min(1) }));
  const client = await prisma.client.findFirst({ where: { id: clientId, guideId }, select: { id: true } });
  if (!client) throw new HttpError(404, "That client no longer exists.");
  const conversation = await ensureConversation(guideId, client.id);
  return NextResponse.json({ id: conversation.id });
});
