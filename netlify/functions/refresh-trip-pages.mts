// Netlify scheduled function: once a day, ask the app to refresh tides and forecasts
// on upcoming trip pages. (On Vercel the same job is configured in vercel.json.)
export default async () => {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) return new Response("CRON_SECRET is not set", { status: 500 });

  const res = await fetch(`${base}/api/cron/refresh-trip-pages`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  return new Response(await res.text(), { status: res.status });
};

export const config = { schedule: "0 9 * * *" };
