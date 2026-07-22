-- Private bucket for document bytes. This is the "hot" copy every device
-- reads from — OneDrive (synced later by the owner's device) is the
-- README-required archival copy, not the primary read path. The Storage
-- copy is kept permanently, never deleted once OneDrive has it: the owner's
-- single device holding the Microsoft token is a real single point of
-- failure if lost/reset, and this is exactly the document class (receipts,
-- insurance, brand inspections) the README flags as important.
insert into storage.buckets (id, name, public, file_size_limit)
values ('docs', 'docs', false, 26214400) -- 25 MB
on conflict (id) do nothing;

-- Storage policies live on storage.objects — a different schema than the
-- public.* tables RLS lives on elsewhere in this project. A new bucket
-- denies every operation by default; the bucket's "Public" toggle above is
-- an unrelated all-or-nothing anonymous-read setting, not access control.
-- These mirror the docs table's own RLS shape exactly, with helper
-- functions schema-qualified (public.is_admin() etc.) since `public` isn't
-- guaranteed on search_path for a policy defined on storage.objects.
create policy "docs_bucket_select_authenticated" on storage.objects
  for select to authenticated
  using (bucket_id = 'docs');

create policy "docs_bucket_insert_member_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'docs' and public.is_member_or_admin());

create policy "docs_bucket_update_member_admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'docs' and public.is_member_or_admin())
  with check (bucket_id = 'docs' and public.is_member_or_admin());

create policy "docs_bucket_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'docs' and public.is_admin());

-- Path to this doc's object in the bucket above. docs.onedrive_id already
-- exists (added in phase 2) — no change needed there.
alter table public.docs add column storage_path text;

-- Singleton table (enforced at the schema level, not by convention) tracking
-- whether the owner's device currently holds a live Microsoft OneDrive
-- connection. Every family member's Docs screen reads this for accurate
-- status even though only the owner's device ever holds the actual token.
create table public.onedrive_status (
  id boolean primary key default true check (id),
  connected boolean not null default false,
  connected_by uuid references public.profiles (id),
  last_sync_at timestamptz,
  last_sync_error text
);

insert into public.onedrive_status (id) values (true);

alter table public.onedrive_status enable row level security;

create policy "onedrive_status_select_all" on public.onedrive_status
  for select to authenticated using (true);

create policy "onedrive_status_update_admin" on public.onedrive_status
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
