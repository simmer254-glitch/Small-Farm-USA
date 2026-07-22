-- Metadata-only in phase 2 — file bytes stay device-local (Doc.localUri)
-- until phase 3 wires up OneDrive. A doc row syncs its name/folder/uploader
-- across devices, but only the uploading device can actually open the file
-- until then. This is accepted interim scope, not a bug.
create table public.docs (
  id uuid primary key,
  name text not null,
  folder text not null check (folder in ('Brand inspections', 'Receipts', 'Vet records', 'Insurance & titles')),
  onedrive_id text,
  uploaded_by text not null, -- display-name snapshot, kept even if the uploader later leaves
  uploaded_by_user_id uuid references public.profiles (id),
  uploaded_at timestamptz not null default now()
);

alter table public.docs enable row level security;

create policy "docs_select_all" on public.docs
  for select to authenticated using (true);

create policy "docs_insert_member_admin" on public.docs
  for insert to authenticated with check (public.is_member_or_admin());

create policy "docs_update_member_admin" on public.docs
  for update to authenticated
  using (public.is_member_or_admin())
  with check (public.is_member_or_admin());

create policy "docs_delete_admin" on public.docs
  for delete to authenticated using (public.is_admin());
