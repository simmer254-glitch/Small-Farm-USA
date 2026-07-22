import type { AuditEntry } from './types';

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function auditLogToCsv(entries: AuditEntry[]): string {
  const header = ['Date', 'Business', 'Kind', 'Summary', 'Actor'];
  const rows = entries.map((e) => [e.dateOccurred, e.business, e.kind, e.summary, e.actor]);
  return [header, ...rows]
    .map((row) => row.map((field) => escapeCsvField(String(field))).join(','))
    .join('\r\n');
}
