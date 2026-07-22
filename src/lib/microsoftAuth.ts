// Web-only for now (see plan): custom-scheme OAuth redirects don't work in
// Expo Go at all — they need a native "development build," infrastructure
// this project has never needed since everything's been built/tested via
// web browser. Web has no such restriction, just a smaller redirect nuance
// (handled below by always redirecting to the app root).
import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLIENT_ID = process.env.EXPO_PUBLIC_MS_CLIENT_ID;

// `common` tenant — required for personal Microsoft/OneDrive accounts, not
// just organizational ones ("organizations" would reject a personal account).
export const DISCOVERY_ISSUER = 'https://login.microsoftonline.com/common/v2.0';

export const MS_SCOPES = ['Files.ReadWrite', 'offline_access', 'User.Read'];

const TOKEN_STORAGE_KEY = 'sfusa-onedrive-tokens';

// Never throws — this is read at render time by useAuthRequest (mounted at
// the app root), and a missing/misconfigured client ID must only disable the
// OneDrive feature, not crash the whole app for every family member.
export function getClientId(): string {
  return CLIENT_ID ?? '';
}

// Throws only where it's actually needed: inside the async OAuth calls below,
// which every caller already wraps in a try/catch.
function requireClientId(): string {
  if (!CLIENT_ID) {
    throw new Error('Missing EXPO_PUBLIC_MS_CLIENT_ID — set it in .env and restart the dev server.');
  }
  return CLIENT_ID;
}

// Always the app root, never the current path. This is a full top-level
// navigation (this app has no server-side rendering — app.json's
// web.output: "single" — so the whole client bundle remounts on return);
// redirecting anywhere but root would need an SPA-fallback rewrite this
// project doesn't have configured. Root works with zero extra hosting config.
export function getRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // ms epoch
};

// Explicit accepted tradeoff, not an oversight: this token is broader-scoped
// than the Supabase session token already stored in AsyncStorage (delegated
// Files.ReadWrite on a personal Microsoft account grants the whole OneDrive,
// not just this app's folder). Acceptable here because this is a private
// single-family app with no third-party scripts, and web-only scope means
// there's no expo-secure-store option to reach for anyway.
export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

export async function loadTokens(): Promise<StoredTokens | null> {
  const raw = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
}

function tokenResponseToStored(res: AuthSession.TokenResponse): StoredTokens {
  return {
    accessToken: res.accessToken,
    refreshToken: res.refreshToken ?? '',
    expiresAt: Date.now() + (res.expiresIn ?? 3600) * 1000,
  };
}

export async function exchangeCode(
  code: string,
  codeVerifier: string,
  discovery: AuthSession.DiscoveryDocument
): Promise<StoredTokens> {
  const res = await AuthSession.exchangeCodeAsync(
    {
      clientId: requireClientId(),
      code,
      redirectUri: getRedirectUri(),
      extraParams: { code_verifier: codeVerifier },
    },
    discovery
  );
  const tokens = tokenResponseToStored(res);
  await saveTokens(tokens);
  return tokens;
}

// Returns a valid (unexpired) access token, or null if it's missing or
// expired. Deliberately does NOT attempt a silent refresh: Microsoft's token
// endpoint only returns CORS headers for the authorization_code+PKCE
// exchange, not for a direct grant_type=refresh_token POST from browser JS —
// that's blocked by design for SPA app registrations, not a config gap here.
// Callers should treat a null return as "reconnect via promptAsync," which
// goes through the CORS-permitted code exchange and is normally instant
// (no password prompt) since the browser still holds Microsoft's SSO cookie.
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;

  const oneMinute = 60 * 1000;
  if (tokens.expiresAt - oneMinute > Date.now()) {
    return tokens.accessToken;
  }
  return null;
}
