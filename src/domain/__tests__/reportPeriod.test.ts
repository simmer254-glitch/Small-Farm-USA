import { periodRange } from '../reportPeriod';

// Fixed reference point for every test: 2026-07-23 (a Thursday, mid Q3).
const now = new Date(2026, 6, 23);

test('periodRange month: current month', () => {
  expect(periodRange('month', 0, now)).toEqual({ label: 'July 2026', start: '2026-07-01', end: '2026-07-31' });
});

test('periodRange month: previous month', () => {
  expect(periodRange('month', -1, now)).toEqual({ label: 'June 2026', start: '2026-06-01', end: '2026-06-30' });
});

test('periodRange month: rolls back across a year boundary', () => {
  const jan = new Date(2026, 0, 15);
  expect(periodRange('month', -1, jan)).toEqual({ label: 'December 2025', start: '2025-12-01', end: '2025-12-31' });
});

test('periodRange month: rolls forward across a year boundary', () => {
  const dec = new Date(2026, 11, 15);
  expect(periodRange('month', 1, dec)).toEqual({ label: 'January 2027', start: '2027-01-01', end: '2027-01-31' });
});

test('periodRange quarter: current quarter', () => {
  expect(periodRange('quarter', 0, now)).toEqual({ label: 'Q3 2026', start: '2026-07-01', end: '2026-09-30' });
});

test('periodRange quarter: previous quarter', () => {
  expect(periodRange('quarter', -1, now)).toEqual({ label: 'Q2 2026', start: '2026-04-01', end: '2026-06-30' });
});

test('periodRange quarter: rolls back across a year boundary', () => {
  const janQ1 = new Date(2026, 1, 10);
  expect(periodRange('quarter', -1, janQ1)).toEqual({ label: 'Q4 2025', start: '2025-10-01', end: '2025-12-31' });
});

test('periodRange quarter: rolls forward across a year boundary', () => {
  const decQ4 = new Date(2026, 11, 10);
  expect(periodRange('quarter', 1, decQ4)).toEqual({ label: 'Q1 2027', start: '2027-01-01', end: '2027-03-31' });
});

test('periodRange year: current and previous year', () => {
  expect(periodRange('year', 0, now)).toEqual({ label: '2026', start: '2026-01-01', end: '2026-12-31' });
  expect(periodRange('year', -1, now)).toEqual({ label: '2025', start: '2025-01-01', end: '2025-12-31' });
});
