export function dateInputToStableIso(dateOnly: string): string | null {
  // HTML date input gives YYYY-MM-DD. If we store "midnight local/UTC", it can shift
  // across calendar days when viewed in other timezones (DST/offset differences).
  // Storing midday UTC keeps the intended date stable everywhere.
  const t = dateOnly.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function normalizeIsoMidnightToMiddayUtc(iso: string | null | undefined): string | null {
  if (iso == null) return null;
  if (typeof iso !== 'string') return null;
  const t = iso.trim();
  if (!t) return null;
  // Migrate legacy date-only saves that used UTC midnight; keep the calendar day stable everywhere.
  const m = t.match(/^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.000)?Z$/);
  if (m?.[1]) return `${m[1]}T12:00:00.000Z`;
  return t;
}

