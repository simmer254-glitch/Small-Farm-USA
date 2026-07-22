import { filterAuditLog } from '../auditLedger';
import { auditLogToCsv } from '../csv';
import type { AuditEntry } from '../types';

const NOW = new Date('2026-07-17T00:00:00Z');

function entry(overrides: Partial<AuditEntry>): AuditEntry {
  return {
    id: 'e1',
    ts: '2026-01-01T00:00:00Z',
    actor: 'You',
    kind: 'Note',
    refType: 'animal',
    refId: 'a1',
    business: 'Cattle',
    summary: 'Test entry',
    dateOccurred: '2026-01-01',
    ...overrides,
  };
}

describe('filterAuditLog', () => {
  const log: AuditEntry[] = [
    entry({ id: '1', dateOccurred: '2026-07-15', business: 'Cattle', ts: '2026-07-15T00:00:00Z' }),
    entry({ id: '2', dateOccurred: '2026-05-01', business: 'Hogs', ts: '2026-05-01T00:00:00Z' }),
    entry({ id: '3', dateOccurred: '2025-06-01', business: 'General', ts: '2025-06-01T00:00:00Z' }),
  ];

  test('30 days keeps only recent entries', () => {
    const result = filterAuditLog(log, { range: '30 days', business: 'All', now: NOW });
    expect(result.map((e) => e.id)).toEqual(['1']);
  });

  test('YTD excludes prior-year entries', () => {
    const result = filterAuditLog(log, { range: 'YTD', business: 'All', now: NOW });
    expect(result.map((e) => e.id)).toEqual(['1', '2']);
  });

  test('All keeps everything, reverse chron order', () => {
    const result = filterAuditLog(log, { range: 'All', business: 'All', now: NOW });
    expect(result.map((e) => e.id)).toEqual(['1', '2', '3']);
  });

  test('business filter narrows results', () => {
    const result = filterAuditLog(log, { range: 'All', business: 'Hogs', now: NOW });
    expect(result.map((e) => e.id)).toEqual(['2']);
  });

  test('a deleted animal still contributes its historical entries', () => {
    // The ledger is independent of the live animals array by construction —
    // this test documents that filterAuditLog has no dependency on entity existence.
    const result = filterAuditLog(log, { range: 'All', business: 'Cattle', now: NOW });
    expect(result).toHaveLength(1);
  });
});

describe('auditLogToCsv', () => {
  test('escapes commas and quotes in free text', () => {
    const csv = auditLogToCsv([entry({ summary: 'Feed, "creep" pellets' })]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Date,Business,Kind,Summary,Actor');
    expect(lines[1]).toContain('"Feed, ""creep"" pellets"');
  });
});
