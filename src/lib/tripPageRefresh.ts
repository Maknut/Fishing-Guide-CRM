// Background refresh for trip pages. Run daily (Vercel Cron / node-cron):
//   - Tides: fetch once (astronomical — never changes)
//   - Weather: fetch when trip is within NWS range (~7 days), refresh daily until trip day
import { prisma } from "./prisma";
import { getForecastForDate } from "./weather";
import { getTidePredictions } from "./tides";
import type { Prisma } from "@prisma/client";

const FORECAST_WINDOW_DAYS = 7;

export async function refreshUpcomingTripPages() {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + FORECAST_WINDOW_DAYS + 1);

  const pages = await prisma.tripPage.findMany({
    where: {
      booking: { status: { in: ["INQUIRY", "CONFIRMED"] }, date: { gte: startOfDay(now) } },
    },
    include: { booking: { include: { tripType: true, guide: true } } },
  });

  const results = { tides: 0, weather: 0, errors: [] as string[] };

  for (const page of pages) {
    const b = page.booking;
    const dateISO = b.date.toISOString().slice(0, 10);

    // Tides — once
    const stationId = page.tideStationId ?? b.tripType.tideStationId ?? b.guide.defaultTideStationId;
    if (stationId && !page.tidePredictions) {
      try {
        const tides = await getTidePredictions(stationId, dateISO);
        await prisma.tripPage.update({
          where: { id: page.id },
          data: { tidePredictions: tides as unknown as Prisma.InputJsonValue, tideStationId: stationId },
        });
        results.tides++;
      } catch (e) {
        results.errors.push(`tides ${page.id}: ${(e as Error).message}`);
      }
    }

    // Weather — inside window, refresh daily
    const daysOut = Math.ceil((b.date.getTime() - now.getTime()) / 86_400_000);
    const lat = b.tripType.meetingLat, lng = b.tripType.meetingLng;
    if (daysOut <= FORECAST_WINDOW_DAYS && lat != null && lng != null) {
      try {
        const snapshot = await getForecastForDate(lat, lng, dateISO);
        if (snapshot) {
          await prisma.tripPage.update({
            where: { id: page.id },
            data: {
              weatherSnapshot: snapshot as unknown as Prisma.InputJsonValue,
              weatherStatus: "AVAILABLE",
              weatherFetchedAt: now,
            },
          });
          results.weather++;
        }
      } catch (e) {
        // Keep last snapshot, mark stale so UI can show "as of {weatherFetchedAt}"
        await prisma.tripPage.update({ where: { id: page.id }, data: { weatherStatus: "STALE" } });
        results.errors.push(`weather ${page.id}: ${(e as Error).message}`);
      }
    }
  }
  return results;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
