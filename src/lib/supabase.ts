// Must be imported before `createClient` — supabase-js needs the `URL`
// global, which Hermes doesn't provide by default. This is the single most
// common "supabase-js silently fails on RN" issue.
import 'react-native-url-polyfill/auto';

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — set them in .env and restart the dev server (env var changes need a restart, not just a hot reload).'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // The primary sign-in UX is a typed 6-digit code (works identically on
    // web/iOS/Android with no deep-link setup). On web specifically, also
    // detect a session from the URL — this lets Supabase's *default* email
    // template's clickable link work too, without requiring the account
    // owner to customize the email template just to unblock testing.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
