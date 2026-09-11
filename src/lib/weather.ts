// NOAA/NWS weather client (free, no API key; US only).
// Flow: lat/lng -> /points -> forecast URL -> daily periods -> snapshot for trip date.

const NWS = "https://api.weather.gov";
const UA = "guidebook (contact@example.com)"; // NWS requires a User-Agent; set real contact in env

export type WeatherSnapshot = {
  tempLow: number | null;
  tempHigh: number | null;
  windDir: string | null;
  windMph: number | null;
  precipPct: number | null;
  shortForecast: string | null;
  wearRec: string;
};

async function nws(path: string) {
  const res = await fetch(path.startsWith("http") ? path : `${NWS}${path}`, {
    headers: { "User-Agent": process.env.NWS_USER_AGENT ?? UA, Accept: "application/geo+json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`NWS ${res.status}: ${path}`);
  return res.json();
}

export async function getForecastForDate(
  lat: number,
  lng: number,
  tripDateISO: string // "2026-08-01"
): Promise<WeatherSnapshot | null> {
  const points = await nws(`/points/${lat.toFixed(4)},${lng.toFixed(4)}`);
  const forecastUrl: string = points.properties.forecast;
  const fc = await nws(forecastUrl);
  const periods: any[] = fc.properties.periods ?? [];

  // NWS gives day + night periods; match both for the trip date.
  const day = periods.find(p => p.startTime.startsWith(tripDateISO) && p.isDaytime);
  const night = periods.find(p => p.startTime.startsWith(tripDateISO) && !p.isDaytime);
  if (!day && !night) return null; // out of forecast range (~7 days)

  const tempHigh = day?.temperature ?? null;
  const tempLow = night?.temperature ?? null;
  const windMph = parseWind(day?.windSpeed);
  const precipPct = day?.probabilityOfPrecipitation?.value ?? null;

  const snapshot: WeatherSnapshot = {
    tempLow,
    tempHigh,
    windDir: day?.windDirection ?? null,
    windMph,
    precipPct,
    shortForecast: day?.shortForecast ?? null,
    wearRec: "",
  };
  snapshot.wearRec = buildWearRec(snapshot);
  return snapshot;
}

function parseWind(s?: string): number | null {
  // "8 mph" or "5 to 10 mph" -> take upper bound
  if (!s) return null;
  const nums = s.match(/\d+/g);
  return nums ? Number(nums[nums.length - 1]) : null;
}

// Rules engine: forecast -> "what to wear". Deterministic, no AI, cheap to extend.
export function buildWearRec(w: WeatherSnapshot): string {
  const parts: string[] = [];
  const low = w.tempLow, high = w.tempHigh;

  if (low != null && high != null) {
    if (low < 45) parts.push(`Cold ${low}° start — insulated jacket, beanie, gloves`);
    else if (low < 60) parts.push(`Cool ${low}° start warming to ${high}° — dress in layers`);
    else if (high >= 90) parts.push(`Hot day (${high}°) — lightweight, light-colored sun shirts`);
    else parts.push(`Mild ${low}–${high}° — light layers`);
  }
  if ((w.precipPct ?? 0) >= 40) parts.push("rain jacket a must");
  else if ((w.precipPct ?? 0) >= 20) parts.push("pack a rain jacket just in case");
  if ((w.windMph ?? 0) >= 12) parts.push("breezy — hat with a chin strap or buff");
  if ((high ?? 0) >= 75 && (w.precipPct ?? 0) < 40) parts.push("sun protection a must (long sleeves, SPF)");
  parts.push("non-marking, deck-safe footwear");

  return parts.join(". ").replace(/\.\s*\./g, ".") + ".";
}
