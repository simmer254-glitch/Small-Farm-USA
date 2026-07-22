import { randomUUID } from 'expo-crypto';

// A real UUID (not a slug) — every row this is used for becomes a Postgres
// primary key, and generating it client-side (rather than relying on the
// database's default gen_random_uuid()) is what makes optimistic realtime
// updates idempotent: the local optimistic row and the realtime echo share
// the same id, so reconciling them is a plain upsert-by-id.
export function makeId(): string {
  return randomUUID();
}
