const pad2 = (n: number) => (n < 10 ? '0' : '') + n;

// Formats a Date using its LOCAL calendar components — not toISOString(), which
// is UTC and can land on the wrong day for negative-UTC-offset timezones.
export function localDateString(now: number | Date = Date.now()): string {
  const d = now instanceof Date ? now : new Date(now);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Parses a "YYYY-MM-DD" string as a LOCAL date — new Date("YYYY-MM-DD") parses
// as UTC per spec, which shifts to the wrong calendar day in negative-UTC-offset
// timezones once you read back getFullYear/getMonth/getDate (local getters).
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function daysUntil(dateStr: string, now: number | Date = Date.now()): number {
  const nowDate = now instanceof Date ? now : new Date(now);
  const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
  const targetDay = parseLocalDate(dateStr);
  return Math.round((targetDay.getTime() - today.getTime()) / 86400000);
}

export function relativeDayLabel(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1) return `In ${days} days`;
  return `${-days}d ago`;
}

export function todayIso(now: number | Date = Date.now()): string {
  return localDateString(now);
}
