import { localDateString, parseLocalDate } from './dates';

export type ReportPeriodMode = 'month' | 'quarter' | 'year';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// end is inclusive (the last real day of the period), matching how the Money
// screen compares transaction dates (string <= end) rather than an exclusive
// boundary like Google Calendar's all-day end date.
export type ReportPeriod = { label: string; start: string; end: string };

// offset 0 = the period containing `now`, -1 = the previous period, etc.
// Pure and local-date-safe throughout (parseLocalDate/localDateString), never
// raw Date/ms math, matching this codebase's established convention.
export function periodRange(mode: ReportPeriodMode, offset: number, now: Date = new Date()): ReportPeriod {
  const base = parseLocalDate(localDateString(now));
  const year = base.getFullYear();
  const month = base.getMonth();

  if (mode === 'month') {
    const d = new Date(year, month + offset, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, start: localDateString(start), end: localDateString(end) };
  }

  if (mode === 'quarter') {
    const currentQuarter = Math.floor(month / 3);
    const totalQuarters = year * 4 + currentQuarter + offset;
    const qYear = Math.floor(totalQuarters / 4);
    const qIndex = ((totalQuarters % 4) + 4) % 4;
    const startMonth = qIndex * 3;
    const start = new Date(qYear, startMonth, 1);
    const end = new Date(qYear, startMonth + 3, 0);
    return { label: `Q${qIndex + 1} ${qYear}`, start: localDateString(start), end: localDateString(end) };
  }

  const y = year + offset;
  const start = new Date(y, 0, 1);
  const end = new Date(y, 11, 31);
  return { label: `${y}`, start: localDateString(start), end: localDateString(end) };
}
