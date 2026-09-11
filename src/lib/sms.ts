// Twilio SMS channel. One dedicated number per guide (A2P 10DLC registered).
// Inbound: Twilio webhook -> match guide by To number -> match/create client by From -> append to conversation.
import twilio from "twilio";
import { prisma } from "./prisma";

const client = () => twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

export async function sendSms(guideId: string, clientId: string, body: string) {
  const [guide, contact] = await Promise.all([
    prisma.guide.findUniqueOrThrow({ where: { id: guideId } }),
    prisma.client.findFirstOrThrow({ where: { id: clientId, guideId } }),
  ]);
  if (!guide.twilioNumber) throw new Error("Guide has no provisioned SMS number");
  if (!contact.phone) throw new Error("Client has no phone number");

  const msg = await client().messages.create({
    from: guide.twilioNumber,
    to: contact.phone,
    body,
  });

  const conversation = await ensureConversation(guideId, clientId);
  return prisma.message.create({
    data: {
      conversationId: conversation.id,
      channel: "SMS",
      direction: "OUTBOUND",
      body,
      externalId: msg.sid,
      status: "SENT",
    },
  });
}

// Called from /api/webhooks/twilio (validate X-Twilio-Signature before calling this)
export async function handleInboundSms(params: { From: string; To: string; Body: string; MessageSid: string }) {
  // Idempotency — Twilio retries webhooks
  const existing = await prisma.message.findFirst({ where: { externalId: params.MessageSid } });
  if (existing) return existing;

  const guide = await prisma.guide.findUnique({ where: { twilioNumber: params.To } });
  if (!guide) throw new Error(`No guide for number ${params.To}`);

  // Match client by phone, or create a lead
  let contact = await prisma.client.findUnique({
    where: { guideId_phone: { guideId: guide.id, phone: params.From } },
  });
  if (!contact) {
    contact = await prisma.client.create({
      data: { guideId: guide.id, name: params.From, phone: params.From, tags: ["lead"] },
    });
  }

  const conversation = await ensureConversation(guide.id, contact.id);
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      channel: "SMS",
      direction: "INBOUND",
      body: params.Body,
      externalId: params.MessageSid,
    },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
  });
  return message;
}

export async function ensureConversation(guideId: string, clientId: string) {
  return prisma.conversation.upsert({
    where: { clientId },
    create: { guideId, clientId },
    update: {},
  });
}
