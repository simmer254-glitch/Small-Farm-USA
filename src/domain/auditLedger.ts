import { localDateString } from './dates';
import type { AuditEntry, Business } from './types';

export type AuditRange = '30 days' | 'YTD' | 'All';

function cutoffFor(range: AuditRange, now: number | Date = Date.now()): string {
  const nowDate = now instanceof Date ? now : new Date(now);
  if (range === '30 days') {
    const d = new Date(nowDate);
    d.setDate(d.getDate() - 30);
    return localDateString(d);
  }
  if (range === 'YTD') {
    return `${nowDate.getFullYear()}-01-01`;
  }
  return '0000-00-00';
}

export function filterAuditLog(
  log: AuditEntry[],
  opts: { range: AuditRange; business: Business | 'All'; now?: number | Date }
): AuditEntry[] {
  const cutoff = cutoffFor(opts.range, opts.now);
  return log
    .filter((e) => (opts.business === 'All' || e.business === opts.business) && e.dateOccurred >= cutoff)
    .sort((a, b) => b.ts.localeCompare(a.ts));
}
