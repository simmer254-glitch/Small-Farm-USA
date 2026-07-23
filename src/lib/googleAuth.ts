// Web-only for now, same reasoning as microsoftAuth.ts: custom-scheme OAuth
// redirects don't work in Expo Go, and this project has never needed that
// infrastructure since everything's built/tested via web browser.
import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
// Explicit accepted tradeoff, not an oversight: unlike Microsoft's SPA
// registration (which needs no secret at all), Google's "Web application"
// OAuth client type rejects the token exchange without a client_secret even
// when PKCE is used — confirmed via a real "client_secret is missing" error
// live-testing this exact flow (Google has no distinct secret-less "SPA"
// client type the way Azure does). This secret ships in the browser bundle,
// so it isn't truly secret in this context — no worse a tradeoff than the
// already-accepted overly-broad OneDrive token scope, and standard practice
// for a backend-less Google OAuth integration like this one.
const CLIENT_SECRET = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET;

export const DISCOVERY_ISSUER = 'https://accounts.google.com';

// Narrowest scope that can create/edit/delete events — not the broader
// `calendar`/`calendar.calendars` scopes, which would also allow creating
// new calendars. That's a deliberate tradeoff (see plan): events land on
// the owner's own 'primary' calendar rather than a dedicated one, in
// exchange for not asking for more access than this app actually needs.
export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

const TOKEN_STORAGE_KEY = 'sfusa-gcal-tokens';

// Never throws — read at render time by useAuthRequest (mounted at the app
// root); a missing/misconfigured client ID must only disable this feature,
// not crash the whole app for every family member.
export function getClientId(): string {
  return CLIENT_ID ?? '';
}

// Throws only where actually needed: inside the async OAuth calls below,
// which every caller already wraps in a try/catch.
function requireClientId(): string {
  if (!CLIENT_ID) {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID — set it in .env and restart the dev server.');
  }
  return CLIENT_ID;
}

// Always the app root — this app has no SSR (app.json's web.output:
// "single"), so a top-level navigation back to any other path would need an
// SPA-fallback rewrite this project doesn't have configured.
export function getRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // ms epoch
};

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
      clientSecret: CLIENT_SECRET,
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

// Returns a valid (unexpired) access token, or null if missing/expired.
// Deliberately does NOT attempt a silent refresh — Google's token endpoint
// CORS support for a browser-issued grant_type=refresh_token request is just
// as uncertain as Microsoft's turned out to be (a real bug found and fixed
// in microsoftAuth.ts). Building for "expired means reconnect" from the
// start avoids repeating that exact discovery cycle. A null return should
// be treated as "reconnect via promptAsync" by the caller.
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;

  const oneMinute = 60 * 1000;
  if (tokens.expiresAt - oneMinute > Date.now()) {
    return tokens.accessToken;
  }
  return null;
}
