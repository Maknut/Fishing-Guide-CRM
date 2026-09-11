import { NextRequest, NextResponse } from "next/server";
import { requireGuide } from "@/lib/auth";
import { listTideStations } from "@/lib/tides";

// GET ?q=savannah  or  ?lat=..&lng=..  -> nearest/matching NOAA tide stations
export async function GET(req: NextRequest) {
  await requireGuide();
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.toLowerCase();
  const lat = Number(sp.get("lat")), lng = Number(sp.get("lng"));
  let stations = await listTideStations();

  if (q) stations = stations.filter(s => s.name.toLowerCase().includes(q) || s.state?.toLowerCase() === q);
  if (!Number.isNaN(lat) && !Number.isNaN(lng) && sp.get("lat")) {
    stations = stations
      .map(s => ({ ...s, dist: Math.hypot(s.lat - lat, (s.lng - lng) * Math.cos(lat * Math.PI / 180)) }))
      .sort((a, b) => a.dist - b.dist);
  }
  return NextResponse.json(stations.slice(0, 15));
}
