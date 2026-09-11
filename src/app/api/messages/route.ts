import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";
import { sendSms } from "@/lib/sms";

const Input = z.object({
  conversationId: z.string(),
  clientId: z.string(),
  channel: z.enum(["SMS", "EMAIL"]),
  body: z.string().min(1).max(1600),
});

export async function POST(req: NextRequest) {
  const guideId = await requireGuide();
  const parsed = Input.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { conversationId, clientId, channel, body } = parsed.data;

  // Tenant check
  const convo = await prisma.conversation.findFirst({ where: { id: conversationId, guideId, clientId } });
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    if (channel === "SMS") {
      const msg = await sendSms(guideId, clientId, body);
      await prisma.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: new Date() } });
      return NextResponse.json(msg, { status: 201 });
    }
    // EMAIL: provider integration pending — store locally so the thread is truthful about what happened
    return NextResponse.json({ error: "Email sending not connected yet — connect Gmail/Outlook in Settings (coming next build phase)" }, { status: 501 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
