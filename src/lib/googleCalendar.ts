// Thin wrapper over the Google Calendar v3 endpoints this app needs — create,
// update, and delete events (all-day or timed) on the owner's 'primary' calendar.
import { addDays } from '@/domain/dates';

const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

async function calendarFetch(accessToken: string, path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${CALENDAR_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google Calendar API ${path} failed: ${res.status} ${body}`);
  }
  return res;
}

export type EventInput = {
  title: string;
  date: string; // "YYYY-MM-DD"
  time?: string; // "HH:MM", 24-hour, local — unset means an all-day event
  description: string;
  reminderMinutes?: number; // unset means Google's calendar-default reminders
  attendees?: string[]; // email addresses — invites a real person when this is non-empty
};

// A timed event needs an end too; no end-time field was asked for, so this
// defaults to a 1-hour block, matching ordinary calendar-app behavior for a
// single start time. Handles the day-rollover case (e.g. 23:30 start).
function addOneHour(date: string, time: string): { date: string; time: string } {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + 60;
  if (totalMinutes >= 1440) {
    return { date: addDays(date, 1), time: `${String(Math.floor((totalMinutes - 1440) / 60)).padStart(2, '0')}:${String((totalMinutes - 1440) % 60).padStart(2, '0')}` };
  }
  return { date, time: `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}` };
}

// Google's all-day events use an EXCLUSIVE end date — a one-day event needs
// end.date set to the day *after* start.date, not the same day. Getting this
// wrong makes every task appear as a two-day event on the calendar.
function eventBody(input: EventInput) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startEnd = input.time
    ? (() => {
        const end = addOneHour(input.date, input.time!);
        return {
          start: { dateTime: `${input.date}T${input.time}:00`, timeZone },
          end: { dateTime: `${end.date}T${end.time}:00`, timeZone },
        };
      })()
    : {
        start: { date: input.date },
        end: { date: addDays(input.date, 1) },
      };

  return {
    summary: input.title,
    description: input.description,
    ...startEnd,
    reminders:
      input.reminderMinutes !== undefined
        ? { useDefault: false, overrides: [{ method: 'popup', minutes: input.reminderMinutes }] }
        : { useDefault: true },
    ...(input.attendees?.length ? { attendees: input.attendees.map((email) => ({ email })) } : {}),
  };
}

// Explicitly requests Google actually send invite/update/cancellation emails
// to attendees — this is real external communication, not a simulation, and
// the whole point of inviting a guest in the first place.
function sendUpdatesQuery(hasAttendees: boolean): string {
  return hasAttendees ? '?sendUpdates=all' : '';
}

export async function createEvent(accessToken: string, input: EventInput): Promise<{ eventId: string }> {
  const res = await calendarFetch(accessToken, sendUpdatesQuery(!!input.attendees?.length), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventBody(input)),
  });
  const json = await res.json();
  return { eventId: json.id };
}

export async function updateEvent(accessToken: string, eventId: string, input: EventInput): Promise<void> {
  await calendarFetch(accessToken, `/${eventId}${sendUpdatesQuery(!!input.attendees?.length)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventBody(input)),
  });
}

export async function deleteEvent(accessToken: string, eventId: string, hadAttendees = false): Promise<void> {
  // A 404 here means the event's already gone (deleted directly in Google
  // Calendar, say) — that's the same end state we wanted, not a real failure.
  try {
    await calendarFetch(accessToken, `/${eventId}${sendUpdatesQuery(hadAttendees)}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('404')) return;
    throw e;
  }
}
