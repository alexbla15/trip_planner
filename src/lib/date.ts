/** Converts an ISO datetime string to a `YYYY-MM-DD` value suitable for a date `<input>`; returns "" on an invalid input. */
export function toDateValue(isoString: string): string {
  try { return new Date(isoString).toISOString().split("T")[0]; } catch { return ""; }
}

/** Joins a `YYYY-MM-DD` date and `HH:mm` time into an ISO-like datetime string (no timezone conversion). */
export function buildISODateTime(date: string, time: string): string {
  return `${date}T${time}`;
}

/** Returns the `YYYY-MM-DD` value one UTC day after `dateStr`. */
export function addOneDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

/** Returns every `YYYY-MM-DD` date from `start` to `end`, inclusive. */
export function getTripDays(start: string, end: string): string[] {
  const days: string[] = [];
  const d = new Date(start);
  const last = new Date(end);
  while (d <= last) {
    days.push(d.toISOString().split("T")[0]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

/** Formats an ISO date as a short display label, e.g. "Mon, Jan 5" (UTC, so it matches the stored date regardless of viewer timezone). */
export function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });
}

/** Returns a time-of-day greeting ("Good morning/afternoon/evening") based on the viewer's local clock. */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
