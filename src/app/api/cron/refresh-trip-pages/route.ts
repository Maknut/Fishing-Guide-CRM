import { NextRequest, NextResponse } from "next/server";
import { refreshUpcomingTripPages } from "@/lib/tripPageRefresh";
import { cleanupDemoAccounts } from "@/lib/demo";

// Daily job (Vercel Cron via vercel.json, or the Netlify scheduled function). Protected by CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const results = await refreshUpcomingTripPages();
  const demoAccountsRemoved = await cleanupDemoAccounts().catch(e => {
    console.error("[demo] cleanup failed", e);
    return 0;
  });
  return NextResponse.json({ ...results, demoAccountsRemoved });
}
