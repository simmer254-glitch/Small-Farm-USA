-- Structural mirror of onedrive_status (0012) — same singleton pattern,
-- same reason: every family member's Calendar screen needs to show
-- accurate connection status even though only the owner's device ever
-- holds the actual Google OAuth token.
create table public.google_calendar_status (
  id boolean primary key default true check (id),
  connected boolean not null default false,
  connected_by uuid references public.profiles (id),
  last_sync_at timestamptz,
  last_sync_error text
);

insert into public.google_calendar_status (id) values (true);

alter table public.google_calendar_status enable row level security;

create policy "google_calendar_status_select_all" on public.google_calendar_status
  for select to authenticated using (true);

create policy "google_calendar_status_update_admin" on public.google_calendar_status
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Added in the same migration this time, not a follow-up fix — this exact
-- omission has already bitten onedrive_status, pending_invites, and every
-- original phase-1 table once each.
alter publication supabase_realtime add table public.google_calendar_status;
