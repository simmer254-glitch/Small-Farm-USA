import { useEffect } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useStore } from '@/store/store';
import {
  DISCOVERY_ISSUER,
  GOOGLE_SCOPES,
  getClientId,
  getRedirectUri,
  exchangeCode,
  getValidAccessToken,
  loadTokens,
} from '@/lib/googleAuth';
import { createEvent, updateEvent, deleteEvent, type EventInput } from '@/lib/googleCalendar';
import type { Task, User } from '@/domain/types';

function taskDescription(task: Task, assigneeLabel: string): string {
  return `Small Farm USA · ${task.type} · for ${assigneeLabel}`;
}

// Per the owner's confirmed preference: a task assigned to a specific family
// member (not the 'everyone'/'kids' sentinels) automatically invites that
// person using their app sign-in email, on top of any manually-typed guests.
function buildAttendees(task: Task, profiles: User[]): string[] {
  const assigneeEmail =
    task.assigneeUserId !== 'everyone' && task.assigneeUserId !== 'kids' ? profiles.find((p) => p.id === task.assigneeUserId)?.email : undefined;
  const emails = [assigneeEmail, ...(task.guestEmails ?? [])].filter((e): e is string => !!e);
  return Array.from(new Set(emails));
}

type GoogleCalendarState = {
  connected: boolean;
  connectedByMe: boolean; // whether THIS device holds the token (only meaningful device for sync)
  lastSyncAt: string | null;
  lastSyncError: string | null;
  syncing: boolean;
  promptAsync: (() => Promise<AuthSession.AuthSessionResult>) | null;

  fetchStatus: () => Promise<void>;
  subscribeStatusRealtime: () => () => void;
  syncPendingTasks: () => Promise<void>;
  syncTaskUpdate: (task: Task, assigneeLabel: string) => Promise<void>;
  deleteTaskEvent: (eventId: string, hadAttendees?: boolean) => Promise<void>;
  disconnect: () => Promise<void>;
};

export const useGoogleCalendarStore = create<GoogleCalendarState>()((set, get) => ({
  connected: false,
  connectedByMe: false,
  lastSyncAt: null,
  lastSyncError: null,
  syncing: false,
  promptAsync: null,

  fetchStatus: async () => {
    const { data } = await supabase.from('google_calendar_status').select('*').single();
    if (!data) return;
    const myTokens = await loadTokens();
    set({
      connected: data.connected,
      connectedByMe: data.connected && !!myTokens,
      lastSyncAt: data.last_sync_at,
      lastSyncError: data.last_sync_error,
    });
  },

  subscribeStatusRealtime: () => {
    const channel = supabase
      .channel('google-calendar-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'google_calendar_status' }, async (payload) => {
        const row = payload.new as any;
        const myTokens = await loadTokens();
        set({
          connected: row.connected,
          connectedByMe: row.connected && !!myTokens,
          lastSyncAt: row.last_sync_at,
          lastSyncError: row.last_sync_error,
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },

  syncPendingTasks: async () => {
    if (get().syncing) return;
    const tokens = await loadTokens();
    if (!tokens) return; // only the device holding the token can sync

    set({ syncing: true });
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        // Expired and can't be silently refreshed (Google's token endpoint
        // CORS support for a browser-issued refresh grant is just as
        // uncertain as Microsoft's turned out to be — see getValidAccessToken).
        // Surface this as "disconnected" so the UI offers a one-click
        // reconnect instead of retrying the same doomed sync forever.
        const message = 'Google Calendar session expired — reconnect below.';
        await supabase
          .from('google_calendar_status')
          .update({ connected: false, last_sync_error: message })
          .eq('id', true);
        set({ connected: false, connectedByMe: false, lastSyncError: message, syncing: false });
        return;
      }

      const profiles = useStore.getState().profiles;
      const assigneeLabel = (assigneeUserId: string) =>
        assigneeUserId === 'everyone' ? 'Everyone' : assigneeUserId === 'kids' ? 'Kids' : profiles.find((p) => p.id === assigneeUserId)?.name || assigneeUserId;

      const pending = useStore.getState().tasks.filter((t) => !t.gcalEventId);
      // One task's failure must not block every other pending task behind
      // it — continue the batch and report failures together at the end.
      const failures: string[] = [];
      for (const task of pending) {
        try {
          const input: EventInput = {
            title: task.title,
            date: task.date,
            time: task.time,
            reminderMinutes: task.reminderMinutes,
            description: taskDescription(task, assigneeLabel(task.assigneeUserId)),
            attendees: buildAttendees(task, profiles),
          };
          const { eventId } = await createEvent(accessToken, input);
          await supabase.from('tasks').update({ gcal_event_id: eventId }).eq('id', task.id);
        } catch (e) {
          failures.push(`"${task.title}": ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      const nowIso = new Date().toISOString();
      const message = failures.length > 0 ? `${failures.length} task(s) failed to sync — ${failures.join('; ')}` : null;
      await supabase
        .from('google_calendar_status')
        .update({ last_sync_at: nowIso, last_sync_error: message })
        .eq('id', true);
      set({ lastSyncAt: nowIso, lastSyncError: message, syncing: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sync failed';
      await supabase.from('google_calendar_status').update({ last_sync_error: message }).eq('id', true);
      set({ lastSyncError: message, syncing: false });
    }
  },

  // Patches a single already-synced task's event in place — used by
  // updateTask, which knows exactly which event changed rather than needing
  // a full pending-tasks scan.
  syncTaskUpdate: async (task, assigneeLabel) => {
    if (!task.gcalEventId) return;
    const tokens = await loadTokens();
    if (!tokens) return;
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) return; // same expiry handling as syncPendingTasks, but a single-task patch isn't worth flipping global "connected" state over
      const profiles = useStore.getState().profiles;
      await updateEvent(accessToken, task.gcalEventId, {
        title: task.title,
        date: task.date,
        time: task.time,
        reminderMinutes: task.reminderMinutes,
        description: taskDescription(task, assigneeLabel),
        attendees: buildAttendees(task, profiles),
      });
    } catch {
      // Best-effort — a failed patch here isn't worth surfacing as a global
      // sync error; the next full syncPendingTasks pass isn't applicable
      // either since the task already has a gcal_event_id. Silently skip.
    }
  },

  deleteTaskEvent: async (eventId, hadAttendees = false) => {
    const tokens = await loadTokens();
    if (!tokens) return; // not the connected device — event is left orphaned, an accepted known gap (see plan)
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) return;
      await deleteEvent(accessToken, eventId, hadAttendees);
    } catch {
      // Best-effort, same reasoning as syncTaskUpdate.
    }
  },

  disconnect: async () => {
    const { clearTokens } = await import('@/lib/googleAuth');
    await clearTokens();
    await supabase.from('google_calendar_status').update({ connected: false }).eq('id', true);
    set({ connected: false, connectedByMe: false });
  },
}));

// Mounted once from src/app/_layout.tsx. useAuthRequest must live in a
// component (rules of hooks) — the redirect back from Google is a full
// top-level page reload (this app has no SSR, so nothing else survives that
// remount), which is why this lives at the root rather than in the Calendar
// or More screen that triggers it.
export function useGoogleCalendarAuthBridge() {
  const discovery = AuthSession.useAutoDiscovery(DISCOVERY_ISSUER);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: getClientId(),
      scopes: GOOGLE_SCOPES,
      redirectUri: getRedirectUri(),
      responseType: AuthSession.ResponseType.Code,
      // access_type=offline + prompt=consent guarantee a refresh token comes
      // back — Google otherwise silently omits one on a repeat consent.
      extraParams: { access_type: 'offline', prompt: 'consent' },
    },
    discovery
  );

  useEffect(() => {
    if (Platform.OS === 'web') WebBrowser.maybeCompleteAuthSession();
  }, []);

  useEffect(() => {
    useGoogleCalendarStore.setState({ promptAsync: request ? promptAsync : null });
  }, [request, promptAsync]);

  useEffect(() => {
    if (response?.type !== 'success' || !discovery || !request?.codeVerifier) return;
    const { code } = response.params;
    const profile = useAuthStore.getState().profile;

    (async () => {
      try {
        await exchangeCode(code, request.codeVerifier!, discovery);
        await supabase
          .from('google_calendar_status')
          .update({ connected: true, connected_by: profile?.id ?? null, last_sync_error: null })
          .eq('id', true);
        useGoogleCalendarStore.setState({ connected: true, connectedByMe: true });
        await useGoogleCalendarStore.getState().syncPendingTasks();
      } catch (e) {
        useGoogleCalendarStore.setState({ lastSyncError: e instanceof Error ? e.message : 'Connection failed' });
      }
    })();
  }, [response, discovery, request]);
}
