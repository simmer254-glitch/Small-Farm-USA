import { useEffect } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useStore } from '@/store/store';
import {
  DISCOVERY_ISSUER,
  MS_SCOPES,
  getClientId,
  getRedirectUri,
  exchangeCode,
  getValidAccessToken,
  loadTokens,
} from '@/lib/microsoftAuth';
import { bootstrapFolders, uploadFile } from '@/lib/msGraph';

type OneDriveState = {
  connected: boolean;
  connectedByMe: boolean; // whether THIS device holds the token (only meaningful device for sync)
  lastSyncAt: string | null;
  lastSyncError: string | null;
  syncing: boolean;
  promptAsync: (() => Promise<AuthSession.AuthSessionResult>) | null;

  fetchStatus: () => Promise<void>;
  subscribeStatusRealtime: () => () => void;
  syncPendingDocs: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export const useOneDriveStore = create<OneDriveState>()((set, get) => ({
  connected: false,
  connectedByMe: false,
  lastSyncAt: null,
  lastSyncError: null,
  syncing: false,
  promptAsync: null,

  fetchStatus: async () => {
    const { data } = await supabase.from('onedrive_status').select('*').single();
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
      .channel('onedrive-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'onedrive_status' }, async (payload) => {
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

  syncPendingDocs: async () => {
    if (get().syncing) return;
    const tokens = await loadTokens();
    if (!tokens) return; // only the device holding the token can sync

    set({ syncing: true });
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        // Expired and can't be silently refreshed (Microsoft blocks
        // grant_type=refresh_token via CORS for SPA registrations, by
        // design — see getValidAccessToken). Surface this as "disconnected"
        // so the UI offers a one-click reconnect instead of retrying the
        // same doomed sync forever.
        const message = 'OneDrive session expired — reconnect below.';
        await supabase
          .from('onedrive_status')
          .update({ connected: false, last_sync_error: message })
          .eq('id', true);
        set({ connected: false, connectedByMe: false, lastSyncError: message, syncing: false });
        return;
      }

      const pending = useStore.getState().docs.filter((d) => !d.oneDriveId && d.storagePath);
      // One doc's failure must not block every other pending doc behind it —
      // continue the batch and report failures together at the end, rather
      // than throwing out of the loop on the first bad file.
      const failures: string[] = [];
      for (const doc of pending) {
        try {
          const { data: blob, error: dlErr } = await supabase.storage.from('docs').download(doc.storagePath!);
          if (dlErr || !blob) throw new Error(dlErr?.message ?? 'no data');
          const arrayBuffer = await blob.arrayBuffer();
          const { itemId } = await uploadFile(accessToken, doc.folder, doc.name, arrayBuffer);
          await supabase.from('docs').update({ onedrive_id: itemId }).eq('id', doc.id);
        } catch (e) {
          failures.push(`"${doc.name}": ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      const nowIso = new Date().toISOString();
      const message = failures.length > 0 ? `${failures.length} file(s) failed to sync — ${failures.join('; ')}` : null;
      await supabase
        .from('onedrive_status')
        .update({ last_sync_at: nowIso, last_sync_error: message })
        .eq('id', true);
      set({ lastSyncAt: nowIso, lastSyncError: message, syncing: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sync failed';
      await supabase.from('onedrive_status').update({ last_sync_error: message }).eq('id', true);
      set({ lastSyncError: message, syncing: false });
    }
  },

  disconnect: async () => {
    const { clearTokens } = await import('@/lib/microsoftAuth');
    await clearTokens();
    await supabase.from('onedrive_status').update({ connected: false }).eq('id', true);
    set({ connected: false, connectedByMe: false });
  },
}));

// Mounted once from src/app/_layout.tsx. useAuthRequest must live in a
// component (rules of hooks) — the redirect back from Microsoft is a full
// top-level page reload (this app has no SSR, so nothing else survives that
// remount), which is why this lives at the root rather than in the Docs or
// More screen that triggers it.
export function useOneDriveAuthBridge() {
  const discovery = AuthSession.useAutoDiscovery(DISCOVERY_ISSUER);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: getClientId(),
      scopes: MS_SCOPES,
      redirectUri: getRedirectUri(),
      responseType: AuthSession.ResponseType.Code,
    },
    discovery
  );

  useEffect(() => {
    if (Platform.OS === 'web') WebBrowser.maybeCompleteAuthSession();
  }, []);

  useEffect(() => {
    useOneDriveStore.setState({ promptAsync: request ? promptAsync : null });
  }, [request, promptAsync]);

  useEffect(() => {
    if (response?.type !== 'success' || !discovery || !request?.codeVerifier) return;
    const { code } = response.params;
    const profile = useAuthStore.getState().profile;

    (async () => {
      try {
        const tokens = await exchangeCode(code, request.codeVerifier!, discovery);
        await bootstrapFolders(tokens.accessToken);
        await supabase
          .from('onedrive_status')
          .update({ connected: true, connected_by: profile?.id ?? null, last_sync_error: null })
          .eq('id', true);
        useOneDriveStore.setState({ connected: true, connectedByMe: true });
        await useOneDriveStore.getState().syncPendingDocs();
      } catch (e) {
        useOneDriveStore.setState({ lastSyncError: e instanceof Error ? e.message : 'Connection failed' });
      }
    })();
  }, [response, discovery, request]);
}
