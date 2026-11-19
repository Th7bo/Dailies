const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTimeZone(tz: string | undefined | null): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** YYYY-MM-DD for `date` in the given IANA time zone. */
export function dayKey(tz: string, date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isDayKey(s: unknown): s is string {
  return typeof s === "string" && DAY_RE.test(s);
}

/** Shift a YYYY-MM-DD key by n days (calendar math in UTC, tz-independent). */
export function shiftDay(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/**
 * Current streak: consecutive days with a completion, ending today
 * (or yesterday, so a streak isn't "broken" before you've played today).
 */
export function currentStreak(days: Set<string>, today: string): number {
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor = shiftDay(cursor, -1);
  }
  return n;
}

export function formatDayLong(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
