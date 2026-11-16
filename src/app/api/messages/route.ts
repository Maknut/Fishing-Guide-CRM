import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, body, HttpError } from "@/lib/api";
import { sendSms, SendError } from "@/lib/sms";

const Input = z.object({
  conversationId: z.string().min(1),
  channel: z.enum(["SMS", "EMAIL"]),
  body: z.string().trim().min(1, "Write a message first.").max(1600, "That message is too long to send as a text."),
});

export const POST = route(async (req, guideId) => {
  const data = await body(req, Input);
  // Tenant check: the conversation must belong to this guide.
  const convo = await prisma.conversation.findFirst({ where: { id: data.conversationId, guideId } });
  if (!convo) throw new HttpError(404, "That conversation no longer exists.");

  if (data.channel === "EMAIL") {
    // Email sending isn't connected yet. Refuse clearly so the thread never claims a message went out.
    throw new HttpError(501, "Email isn't connected yet, so this wasn't sent. Send it as a text instead.");
  }
  try {
    const msg = await sendSms(guideId, convo.clientId, data.body);
    return NextResponse.json(msg, { status: 201 });
  } catch (e) {
    if (e instanceof SendError) throw new HttpError(422, e.message);
    throw e;
  }
});
