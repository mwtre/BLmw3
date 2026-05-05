export function dateInputToStableIso(dateOnly: string): string | null {
  // HTML date input gives YYYY-MM-DD. If we store "midnight local/UTC", it can shift
  // across calendar days when viewed in other timezones (DST/offset differences).
  // Storing midday UTC keeps the intended date stable everywhere.
  const t = dateOnly.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

