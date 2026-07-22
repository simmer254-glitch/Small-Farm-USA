import type { Task } from './types';

// RFC-5545 .ics builder, ported exactly from the prototype's `invite:` handler.
// Pure string output so it's testable without touching expo-file-system/expo-sharing.
export function icsForTask(task: Task): string {
  const dtstart = task.date.split('-').join('');
  return (
    'BEGIN:VCALENDAR\r\n' +
    'VERSION:2.0\r\n' +
    'PRODID:-//Small Farm USA//EN\r\n' +
    'BEGIN:VEVENT\r\n' +
    `UID:${task.id}@smallfarmusa\r\n` +
    `DTSTART;VALUE=DATE:${dtstart}\r\n` +
    `SUMMARY:${task.title}\r\n` +
    `DESCRIPTION:Small Farm USA · ${task.type} · for ${task.assigneeUserId === 'everyone' ? 'Everyone' : task.assigneeUserId}\r\n` +
    'END:VEVENT\r\n' +
    'END:VCALENDAR'
  );
}

export function icsFilename(task: Task): string {
  return task.title.replace(/[^a-z0-9]+/gi, '-') + '.ics';
}
