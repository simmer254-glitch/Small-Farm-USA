import { icsForTask } from '../ics';
import type { Task } from '../types';

const task: Task = {
  id: '12345',
  title: 'Butcher pigs P-14, P-15',
  date: '2026-08-02',
  type: 'Butcher',
  assigneeUserId: 'everyone',
  creatorUserId: 'u1',
  done: false,
};

test('icsForTask produces exact RFC-5545 structure', () => {
  const ics = icsForTask(task);
  expect(ics).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Small Farm USA//EN\r\n');
  expect(ics).toContain('UID:12345@smallfarmusa\r\n');
  expect(ics).toContain('DTSTART;VALUE=DATE:20260802\r\n');
  expect(ics).toContain('SUMMARY:Butcher pigs P-14, P-15\r\n');
  expect(ics).toContain('DESCRIPTION:Small Farm USA · Butcher · for Everyone\r\n');
  expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true);
});
