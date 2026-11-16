import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, body, HttpError } from "@/lib/api";

// POST { bookingId: string | null } pins or unpins a message. Pinned messages show on the client's trip page.
export const POST = route<{ id: string }>(async (req, guideId, { id }) => {
  const { bookingId } = await body(req, z.object({ bookingId: z.string().min(1).nullable() }));

  const message = await prisma.message.findFirst({
    where: { id, conversation: { guideId } },
    include: { conversation: { select: { clientId: true } } },
  });
  if (!message) throw new HttpError(404, "That message no longer exists.");

  if (bookingId) {
    // The booking must be this guide's, and for the same client the message is from.
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, guideId, clientId: message.conversation.clientId } });
    if (!booking) throw new HttpError(404, "That booking no longer exists.");
  }

  const updated = await prisma.message.update({ where: { id }, data: { pinnedToBookingId: bookingId } });
  return NextResponse.json({ id: updated.id, pinnedToBookingId: updated.pinnedToBookingId });
});
