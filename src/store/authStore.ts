import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/domain/types';

// `profiles` rows have exactly the same shape as the domain User type.
export type Profile = User;

type AuthState = {
  initializing: boolean;
  session: Session | null;
  profile: Profile | null;
  requestOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, code: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  _setSession: (session: Session | null) => Promise<void>;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  initializing: true,
  session: null,
  profile: null,

  requestOtp: async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // Lets Supabase's default email template's clickable link also work
        // on web (see detectSessionInUrl in lib/supabase.ts) — the typed
        // 6-digit code below remains the primary, cross-platform path.
        emailRedirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
      },
    });
    return { error: error?.message ?? null };
  },

  verifyOtp: async (email, code) => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) return { error: error.message };
    await get()._setSession(data.session);
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  _setSession: async (session) => {
    if (!session) {
      set({ session: null, profile: null, initializing: false });
      return;
    }
    const { data, error } = await supabase.from('profiles').select('id, name, email, role').eq('id', session.user.id).single();
    set({
      session,
      profile: error ? null : (data as Profile),
      initializing: false,
    });
  },
}));

const FALLBACK_PROFILE: Profile = { id: '', name: 'You', email: '', role: 'member' };

// Safe non-null profile accessor — screens render briefly before the
// profiles row resolves (or, in an edge case, if the fetch fails); this
// keeps call sites simple instead of null-checking everywhere.
export function useProfile(): Profile {
  const profile = useAuthStore((s) => s.profile);
  return profile ?? FALLBACK_PROFILE;
}

// Called once from the root layout. Subscribes to Supabase auth state and
// wires AppState — supabase-js's auto-refresh timer doesn't reliably run
// while an RN app is backgrounded, so without this, sync silently stops
// after the app's been backgrounded a while.
export function useInitAuth() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      useAuthStore.getState()._setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      useAuthStore.getState()._setSession(session);
    });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    return () => {
      authListener.subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);
}
