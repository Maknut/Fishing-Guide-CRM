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
  wear?: string[]; // one tip per line; older snapshots only have wearRec
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

  // The daytime period for the trip date carries the high, wind and rain chance.
  const day = periods.find(p => p.startTime.startsWith(tripDateISO) && p.isDaytime);
  // Once the trip day is over (or beyond the ~7 day range) there is nothing useful to store.
  // Returning null keeps whatever snapshot the page already has.
  if (!day) return null;

  // The low an angler feels at the ramp is the overnight low that ends on the trip morning,
  // not the following night's. Fall back to that evening's low when the earlier period has
  // already dropped out of the forecast.
  const morning = periods.find(p => !p.isDaytime && p.endTime?.startsWith(tripDateISO));
  const evening = periods.find(p => !p.isDaytime && p.startTime.startsWith(tripDateISO));

  const tempHigh = day.temperature ?? null;
  const tempLow = morning?.temperature ?? evening?.temperature ?? null;
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
  snapshot.wear = buildWear(snapshot);
  snapshot.wearRec = snapshot.wear.join(" ");
  return snapshot;
}

function parseWind(s?: string): number | null {
  // "8 mph" or "5 to 10 mph" -> take upper bound
  if (!s) return null;
  const nums = s.match(/\d+/g);
  return nums ? Number(nums[nums.length - 1]) : null;
}

// Rules engine: forecast -> "what to wear". Deterministic, no AI, cheap to extend.
// Footwear and gear live in each trip type's own lists, since a skiff and a trout stream
// call for different things; this only covers what the weather decides.
export function buildWear(w: Pick<WeatherSnapshot, "tempLow" | "tempHigh" | "windMph" | "precipPct">): string[] {
  const tips: string[] = [];
  const low = w.tempLow, high = w.tempHigh;
  const rain = w.precipPct ?? 0, wind = w.windMph ?? 0;
  const coolest = low ?? high, warmest = high ?? low;

  if (coolest != null && warmest != null) {
    if (coolest < 45) tips.push(`Cold start around ${coolest}°. Insulated jacket, beanie and gloves.`);
    else if (coolest < 60 && warmest - coolest >= 12) tips.push(`Cool ${coolest}° start, warming to ${warmest}°. Dress in layers you can peel off.`);
    else if (coolest < 60) tips.push(`Cool all day, around ${coolest}–${warmest}°. Bring a warm layer.`);
    else if (warmest >= 90) tips.push(`Hot, up to ${warmest}°. Lightweight, light-colored sun shirt.`);
    else tips.push(`Mild, ${coolest}–${warmest}°. Light layers.`);
  }
  if (rain >= 40) tips.push("Rain is likely. Bring a rain jacket.");
  else if (rain >= 20) tips.push("A shower is possible. Pack a rain jacket just in case.");
  if (wind >= 12) tips.push("Breezy on the water. Hat with a chin strap, or a buff.");
  if ((warmest ?? 0) >= 75 && rain < 40) tips.push("Strong sun. Long sleeves and sunscreen.");
  return tips;
}

export function buildWearRec(w: WeatherSnapshot): string {
  return buildWear(w).join(" ");
}
