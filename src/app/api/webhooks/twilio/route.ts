import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { handleInboundSms } from "@/lib/sms";

// Twilio posts form-encoded. Validate signature or anyone can inject messages.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const params = Object.fromEntries(new URLSearchParams(raw));
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = process.env.TWILIO_WEBHOOK_URL!; // exact public URL Twilio is configured with

  const valid = twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN!, signature, url, params);
  if (!valid) return new NextResponse("Invalid signature", { status: 403 });

  await handleInboundSms({
    From: params.From,
    To: params.To,
    Body: params.Body ?? "",
    MessageSid: params.MessageSid,
  });

  // Empty TwiML = no auto-reply
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { "Content-Type": "text/xml" },
  });
}
