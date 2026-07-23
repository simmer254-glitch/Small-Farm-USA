// Thin wrapper over the Google Calendar v3 endpoints this app needs — create,
// update, and delete all-day events on the owner's 'primary' calendar.
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
  description: string;
};

// Google's all-day events use an EXCLUSIVE end date — a one-day event needs
// end.date set to the day *after* start.date, not the same day. Getting this
// wrong makes every task appear as a two-day event on the calendar.
function eventBody(input: EventInput) {
  return {
    summary: input.title,
    description: input.description,
    start: { date: input.date },
    end: { date: addDays(input.date, 1) },
  };
}

export async function createEvent(accessToken: string, input: EventInput): Promise<{ eventId: string }> {
  const res = await calendarFetch(accessToken, '', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventBody(input)),
  });
  const json = await res.json();
  return { eventId: json.id };
}

export async function updateEvent(accessToken: string, eventId: string, input: EventInput): Promise<void> {
  await calendarFetch(accessToken, `/${eventId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventBody(input)),
  });
}

export async function deleteEvent(accessToken: string, eventId: string): Promise<void> {
  // A 404 here means the event's already gone (deleted directly in Google
  // Calendar, say) — that's the same end state we wanted, not a real failure.
  try {
    await calendarFetch(accessToken, `/${eventId}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('404')) return;
    throw e;
  }
}
