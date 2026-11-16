// Date and time helpers.
//
// Booking dates are stored as UTC midnight of the calendar day the trip happens on
// ("2026-08-01T00:00:00Z" means Aug 1 wherever the guide is). They are calendar dates,
// not instants, so they are always formatted with timeZone: "UTC" and compared against
// "today" as the guide sees it in their own time zone, never the server's.

const DAY_MS = 86_400_000;

function safeTz(tz?: string | null): string {
  if (!tz) return "America/New_York";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "America/New_York";
  }
}

/** Calendar parts (year, month 1-12, day) for an instant, as seen in a time zone. */
export function partsInTz(instant: Date, tz?: string | null) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTz(tz), year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Today's calendar date in the guide's time zone, as a UTC-midnight Date (matches Booking.date). */
export function todayInTz(tz?: string | null, now: Date = new Date()): Date {
  const { year, month, day } = partsInTz(now, tz);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * DAY_MS);
}

/** Whole calendar days from `from` to `to` (both UTC-midnight calendar dates). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

/** "2026-08-01" for a calendar date. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parse "YYYY-MM-DD" strictly. Returns null for anything that is not a real calendar day. */
export function parseIsoDate(s: string | null | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || isoDate(d) !== s ? null : d;
}

/** Format a calendar date (never shifts across time zones). */
export function fmtDate(date: Date, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }): string {
  return date.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

/** "Today", "Tomorrow", or "Sat, Aug 1" relative to the guide's today. */
export function fmtRelativeDay(date: Date, today: Date): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return fmtDate(date);
}

/** "06:00" -> "6:00 AM". Anything unexpected is returned unchanged. */
export function fmtTime(hhmm: string | null | undefined): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? "");
  if (!m) return hhmm ?? "";
  const h = Number(m[1]);
  if (h > 23) return hhmm ?? "";
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

/** Minutes after midnight for "06:00", or a NOAA "2026-08-01 05:42" stamp. */
export function minutesOfDay(stamp: string | null | undefined): number | null {
  const m = /(\d{1,2}):(\d{2})(?!.*\d{1,2}:\d{2})/.exec(stamp ?? "");
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** NOAA tide stamp "2026-08-01 05:42" -> "5:42 AM" (already in station-local time). */
export function fmtTideTime(stamp: string): string {
  const mins = minutesOfDay(stamp);
  if (mins == null) return stamp;
  return fmtTime(`${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`);
}

/** Message timestamp in the guide's time zone: "8:12 AM", "Yesterday", "Thu", "Aug 3". */
export function fmtStamp(instant: Date, tz?: string | null, now: Date = new Date()): string {
  const zone = safeTz(tz);
  const diff = daysBetween(todayInTz(zone, instant), todayInTz(zone, now));
  if (diff <= 0) return instant.toLocaleTimeString("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" });
  if (diff === 1) return "Yesterday";
  if (diff < 7) return instant.toLocaleDateString("en-US", { timeZone: zone, weekday: "short" });
  return instant.toLocaleDateString("en-US", { timeZone: zone, month: "short", day: "numeric" });
}

/** Like fmtRelativeDay, but reads naturally mid-sentence: "today", "tomorrow", "Wed, Nov 18". */
export function fmtRelativeDayInline(date: Date, today: Date): string {
  const label = fmtRelativeDay(date, today);
  return /^(Today|Tomorrow|Yesterday)$/.test(label) ? label.toLowerCase() : label;
}

/** Time of day only, in the guide's zone: "8:12 AM". */
export function fmtClock(instant: Date, tz?: string | null): string {
  return instant.toLocaleTimeString("en-US", { timeZone: safeTz(tz), hour: "numeric", minute: "2-digit" });
}

/** Full message timestamp for inside a thread: "Aug 3, 8:12 AM". */
export function fmtStampLong(instant: Date, tz?: string | null): string {
  return instant.toLocaleString("en-US", {
    timeZone: safeTz(tz), month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

/** Day label used as a divider between messages: "Today", "Yesterday", "Monday, Aug 3". */
export function fmtDayDivider(instant: Date, tz?: string | null, now: Date = new Date()): string {
  const zone = safeTz(tz);
  const diff = daysBetween(todayInTz(zone, instant), todayInTz(zone, now));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return instant.toLocaleDateString("en-US", { timeZone: zone, weekday: "long", month: "short", day: "numeric" });
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
