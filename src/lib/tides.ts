// NOAA Tides & Currents (CO-OPS) — free, no key. Astronomical predictions: available years ahead.

const COOPS = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";

export type TidePrediction = {
  type: "H" | "L";
  time: string; // ISO local to station
  height: number; // feet MLLW
};

export async function getTidePredictions(
  stationId: string,
  dateISO: string // "2026-08-01"
): Promise<TidePrediction[]> {
  const d = dateISO.replaceAll("-", "");
  const params = new URLSearchParams({
    product: "predictions",
    application: "guidebook",
    begin_date: d,
    end_date: d,
    datum: "MLLW",
    station: stationId,
    time_zone: "lst_ldt", // local station time w/ DST — matches what the client experiences
    units: "english",
    interval: "hilo", // highs/lows only
    format: "json",
  });
  const res = await fetch(`${COOPS}?${params}`, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`CO-OPS ${res.status} for station ${stationId}`);
  const data = await res.json();
  if (data.error) throw new Error(`CO-OPS: ${data.error.message}`);
  return (data.predictions ?? []).map((p: any) => ({
    type: p.type as "H" | "L",
    time: p.t,
    height: Number(p.v),
  }));
}

// Station finder (guide settings UX): CO-OPS metadata API lists stations;
// we fetch once and let the guide pick nearest to each meeting spot.
export async function listTideStations(): Promise<{ id: string; name: string; lat: number; lng: number; state: string }[]> {
  const res = await fetch(
    "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions",
    { next: { revalidate: 604800 } }
  );
  if (!res.ok) throw new Error(`CO-OPS metadata ${res.status}`);
  const data = await res.json();
  return (data.stations ?? []).map((s: any) => ({
    id: s.id, name: s.name, lat: s.lat, lng: s.lng, state: s.state,
  }));
}
