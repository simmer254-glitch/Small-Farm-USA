import type { Task } from './types';
import { addDays } from './dates';

// A timed event needs an end too; matches the same 1-hour-default behavior
// used for Google Calendar sync (no end-time field exists on Task).
function addOneHour(date: string, time: string): { date: string; time: string } {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + 60;
  const wrapped = total >= 1440;
  const mins = wrapped ? total - 1440 : total;
  return {
    date: wrapped ? addDays(date, 1) : date,
    time: `${String(Math.floor(mins / 60)).padStart(2, '0')}${String(mins % 60).padStart(2, '0')}`,
  };
}

// RFC-5545 .ics builder, ported exactly from the prototype's `invite:` handler,
// extended for time-of-day, guest attendees, and a reminder — this stays a
// genuine parallel option to Google Calendar sync, not a degraded fallback.
// Pure string output so it's testable without touching expo-file-system/expo-sharing.
export function icsForTask(task: Task): string {
  const dateCompact = task.date.split('-').join('');
  const start = task.time ? `DTSTART:${dateCompact}T${task.time.replace(':', '')}00\r\n` : `DTSTART;VALUE=DATE:${dateCompact}\r\n`;
  const end = task.time
    ? (() => {
        const e = addOneHour(task.date, task.time!);
        return `DTEND:${e.date.split('-').join('')}T${e.time}00\r\n`;
      })()
    : '';
  const attendees = (task.guestEmails ?? []).map((email) => `ATTENDEE:mailto:${email}\r\n`).join('');
  const alarm =
    task.reminderMinutes !== undefined
      ? `BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:${task.title}\r\nTRIGGER:-PT${task.reminderMinutes}M\r\nEND:VALARM\r\n`
      : '';

  return (
    'BEGIN:VCALENDAR\r\n' +
    'VERSION:2.0\r\n' +
    'PRODID:-//Small Farm USA//EN\r\n' +
    'BEGIN:VEVENT\r\n' +
    `UID:${task.id}@smallfarmusa\r\n` +
    start +
    end +
    `SUMMARY:${task.title}\r\n` +
    `DESCRIPTION:Small Farm USA · ${task.type} · for ${task.assigneeUserId === 'everyone' ? 'Everyone' : task.assigneeUserId}\r\n` +
    attendees +
    alarm +
    'END:VEVENT\r\n' +
    'END:VCALENDAR'
  );
}

export function icsFilename(task: Task): string {
  return task.title.replace(/[^a-z0-9]+/gi, '-') + '.ics';
}
