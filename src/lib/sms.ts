// Twilio SMS channel. One dedicated number per guide (A2P 10DLC registered).
// Inbound: Twilio webhook -> match guide by To number -> match/create client by From -> append to conversation.
import twilio from "twilio";
import { prisma } from "./prisma";

/** A send failure with a message that is safe and useful to show the guide. */
export class SendError extends Error {}

function twilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new SendError("Texting isn't connected yet. Add your Twilio keys to finish setup.");
  return twilio(sid, token);
}

export async function sendSms(guideId: string, clientId: string, body: string) {
  const [guide, contact] = await Promise.all([
    prisma.guide.findUnique({ where: { id: guideId } }),
    prisma.client.findFirst({ where: { id: clientId, guideId } }),
  ]);
  if (!guide || !contact) throw new SendError("That client no longer exists.");
  if (!guide.twilioNumber) throw new SendError("Add your business SMS number in Settings before sending texts.");
  if (!contact.phone) throw new SendError(`${contact.name} doesn't have a phone number on file.`);

  let sid: string;
  try {
    const msg = await twilioClient().messages.create({ from: guide.twilioNumber, to: contact.phone, body });
    sid = msg.sid;
  } catch (e) {
    if (e instanceof SendError) throw e;
    console.error("[sms] send failed", e);
    // Twilio 21610: the recipient replied STOP.
    if ((e as { code?: number }).code === 21610) throw new SendError(`${contact.name} has opted out of texts from this number.`);
    throw new SendError("The text didn't send. Check the number and try again.");
  }

  const conversation = await ensureConversation(guideId, clientId);
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: conversation.id, channel: "SMS", direction: "OUTBOUND", body, externalId: sid, status: "SENT" },
    }),
    prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } }),
  ]);
  return message;
}

// Called from /api/webhooks/twilio (validate X-Twilio-Signature before calling this)
export async function handleInboundSms(params: { From: string; To: string; Body: string; MessageSid: string }) {
  // Idempotency — Twilio retries webhooks
  const existing = await prisma.message.findFirst({ where: { externalId: params.MessageSid } });
  if (existing) return existing;

  const guide = await prisma.guide.findUnique({ where: { twilioNumber: params.To } });
  if (!guide) {
    // Not one of our numbers. Nothing to store; don't make Twilio retry.
    console.warn(`[sms] inbound message for unknown number ${params.To}`);
    return null;
  }

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
