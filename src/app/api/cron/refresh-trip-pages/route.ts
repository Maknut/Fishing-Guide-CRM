import { NextRequest, NextResponse } from "next/server";
import { refreshUpcomingTripPages } from "@/lib/tripPageRefresh";

// Vercel Cron (vercel.json) hits this daily. Protect with CRON_SECRET.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const results = await refreshUpcomingTripPages();
  return NextResponse.json(results);
}
