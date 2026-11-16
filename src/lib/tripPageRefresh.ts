// Keeps trip pages current.
//   Tides: fetched once per page (astronomical predictions never change).
//   Weather: fetched once the trip is inside the NWS forecast window (~7 days),
//            then refreshed daily until trip day.
// Runs from the daily cron (/api/cron/refresh-trip-pages) and right after a booking is
// created, so a guide who books tomorrow's trip sees tides and forecast straight away.
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getForecastForDate } from "./weather";
import { getTidePredictions } from "./tides";
import { daysBetween, isoDate, todayInTz } from "./dates";

const FORECAST_WINDOW_DAYS = 7;

type Result = { tides: boolean; weather: boolean; errors: string[] };

export async function refreshTripPage(pageId: string, now: Date = new Date()): Promise<Result> {
  const result: Result = { tides: false, weather: false, errors: [] };
  const page = await prisma.tripPage.findUnique({
    where: { id: pageId },
    include: { booking: { include: { tripType: true, guide: true } } },
  });
  if (!page) return result;

  const b = page.booking;
  const dateISO = isoDate(b.date);

  const stationId = page.tideStationId ?? b.tripType.tideStationId ?? b.guide.defaultTideStationId;
  if (stationId && !page.tidePredictions) {
    try {
      const tides = await getTidePredictions(stationId, dateISO);
      await prisma.tripPage.update({
        where: { id: page.id },
        data: { tidePredictions: tides as unknown as Prisma.InputJsonValue, tideStationId: stationId },
      });
      result.tides = true;
    } catch (e) {
      result.errors.push(`tides ${page.id}: ${(e as Error).message}`);
    }
  }

  const daysOut = daysBetween(todayInTz(b.guide.timezone, now), b.date);
  const lat = b.tripType.meetingLat, lng = b.tripType.meetingLng;
  if (daysOut >= 0 && daysOut <= FORECAST_WINDOW_DAYS && lat != null && lng != null) {
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
        result.weather = true;
      }
    } catch (e) {
      // Keep the last snapshot and mark it stale so the page can say "as of ...".
      if (page.weatherSnapshot) {
        await prisma.tripPage.update({ where: { id: page.id }, data: { weatherStatus: "STALE" } });
      }
      result.errors.push(`weather ${page.id}: ${(e as Error).message}`);
    }
  }
  return result;
}

export async function refreshUpcomingTripPages() {
  const now = new Date();
  // One day of slack so no time zone's "today" is skipped.
  const since = new Date(now.getTime() - 86_400_000);
  const pages = await prisma.tripPage.findMany({
    where: { booking: { status: { in: ["INQUIRY", "CONFIRMED"] }, date: { gte: since } } },
    select: { id: true },
  });

  const totals = { tides: 0, weather: 0, errors: [] as string[] };
  for (const { id } of pages) {
    const r = await refreshTripPage(id, now);
    if (r.tides) totals.tides++;
    if (r.weather) totals.weather++;
    totals.errors.push(...r.errors);
  }
  return totals;
}
