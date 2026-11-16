import { NextResponse } from "next/server";
import { route, HttpError } from "@/lib/api";
import { listTideStations } from "@/lib/tides";

// GET ?q=savannah or ?lat=..&lng=.. -> matching or nearest NOAA tide stations
export const GET = route(async req => {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim().toLowerCase();
  const hasPoint = sp.get("lat") !== null && sp.get("lng") !== null;
  const lat = Number(sp.get("lat")), lng = Number(sp.get("lng"));

  let stations;
  try {
    stations = await listTideStations();
  } catch (e) {
    console.error("[tides] station list failed", e);
    throw new HttpError(502, "NOAA's station list isn't responding right now. Try again in a minute.");
  }

  if (q) {
    // "Savannah, GA" -> match the town in the name and, when given, the state.
    const [town, state] = q.split(",").map(s => s.trim());
    stations = stations.filter(s => {
      const name = s.name.toLowerCase(), st = (s.state ?? "").toLowerCase();
      if (state) return name.includes(town) && st === state;
      return name.includes(town) || st === town;
    });
  }
  if (hasPoint && Number.isFinite(lat) && Number.isFinite(lng)) {
    stations = stations
      .map(s => ({ ...s, dist: Math.hypot(s.lat - lat, (s.lng - lng) * Math.cos((lat * Math.PI) / 180)) }))
      .sort((a, b) => a.dist - b.dist);
  }
  return NextResponse.json(stations.slice(0, 12));
});
