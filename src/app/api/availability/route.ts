import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, HttpError } from "@/lib/api";
import { parseIsoDate } from "@/lib/dates";

// GET ?date=YYYY-MM-DD -> which halves of that day are free, so the booking form can say so before submit.
export const GET = route(async (req, guideId) => {
  const date = parseIsoDate(req.nextUrl.searchParams.get("date"));
  if (!date) throw new HttpError(400, "Choose a valid date.");

  const [bookings, blocked] = await Promise.all([
    prisma.booking.findMany({
      where: { guideId, date, status: { in: ["INQUIRY", "CONFIRMED"] } },
      select: { slot: true, client: { select: { name: true } } },
    }),
    prisma.blockedDay.findFirst({ where: { guideId, date } }),
  ]);

  const takenBy = (half: "AM" | "PM") => bookings.find(b => b.slot === half || b.slot === "FULL")?.client.name ?? null;
  return NextResponse.json({
    blocked: blocked ? blocked.reason ?? "" : null,
    am: takenBy("AM"),
    pm: takenBy("PM"),
  });
});
