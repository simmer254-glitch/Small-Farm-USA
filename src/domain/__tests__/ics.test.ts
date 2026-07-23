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

test('icsForTask handles a timed task with a reminder and a guest', () => {
  const timedTask: Task = { ...task, time: '14:30', reminderMinutes: 30, guestEmails: ['vet@example.com'] };
  const ics = icsForTask(timedTask);
  expect(ics).toContain('DTSTART:20260802T143000\r\n');
  expect(ics).toContain('DTEND:20260802T153000\r\n');
  expect(ics).toContain('ATTENDEE:mailto:vet@example.com\r\n');
  expect(ics).toContain('BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Butcher pigs P-14, P-15\r\nTRIGGER:-PT30M\r\nEND:VALARM\r\n');
});

test('icsForTask wraps DTEND to the next day when a timed task starts late in the day', () => {
  const lateTask: Task = { ...task, time: '23:30' };
  const ics = icsForTask(lateTask);
  expect(ics).toContain('DTSTART:20260802T233000\r\n');
  expect(ics).toContain('DTEND:20260803T003000\r\n');
});
