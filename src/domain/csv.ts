import type { AuditEntry, Transaction } from './types';

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

export function transactionsToCsv(transactions: Transaction[]): string {
  const header = ['Date', 'Kind', 'Description', 'Business', 'Schedule F Line', 'Amount'];
  const rows = transactions.map((t) => [t.date, t.kind, t.desc, t.business, t.scheduleFLine, t.amount.toFixed(2)]);
  return [header, ...rows]
    .map((row) => row.map((field) => escapeCsvField(String(field))).join(','))
    .join('\r\n');
}
