// Display helpers for the cached weather snapshot and tide predictions stored on a TripPage.
// Both are JSON columns, so everything here is defensive about shape.
import type { WeatherSnapshot } from "./weather";
import type { TidePrediction } from "./tides";

export function readWeather(json: unknown): WeatherSnapshot | null {
  if (!json || typeof json !== "object") return null;
  const w = json as Partial<WeatherSnapshot>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const snap: WeatherSnapshot = {
    tempLow: num(w.tempLow),
    tempHigh: num(w.tempHigh),
    windDir: typeof w.windDir === "string" ? w.windDir : null,
    windMph: num(w.windMph),
    precipPct: num(w.precipPct),
    shortForecast: typeof w.shortForecast === "string" ? w.shortForecast : null,
    wearRec: typeof w.wearRec === "string" ? w.wearRec : "",
    wear: Array.isArray(w.wear) ? w.wear.filter((t): t is string => typeof t === "string") : undefined,
  };
  const hasAnything = snap.tempLow != null || snap.tempHigh != null || snap.windMph != null || snap.shortForecast;
  return hasAnything ? snap : null;
}

export function readTides(json: unknown): TidePrediction[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (t): t is TidePrediction =>
      !!t && typeof t === "object" && (t.type === "H" || t.type === "L") && typeof t.time === "string" && Number.isFinite(Number(t.height)),
  );
}

export function tempRange(w: WeatherSnapshot): string | null {
  if (w.tempLow != null && w.tempHigh != null) return `${w.tempLow}–${w.tempHigh}°`;
  if (w.tempHigh != null) return `${w.tempHigh}°`;
  if (w.tempLow != null) return `${w.tempLow}°`;
  return null;
}

export function windText(w: WeatherSnapshot): string | null {
  if (w.windMph == null) return null;
  return `${w.windDir ? `${w.windDir} ` : ""}${w.windMph}`;
}

export function wearTips(w: WeatherSnapshot): string[] {
  if (w.wear?.length) return w.wear;
  return w.wearRec ? [w.wearRec] : [];
}
