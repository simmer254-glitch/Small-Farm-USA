create table public.equipment (
  id uuid primary key,
  name text not null,
  hours text not null default '0',
  unit text not null default 'hrs/mi',
  last_service text not null default '',
  created_at timestamptz not null default now()
);

create table public.equipment_service_records (
  id uuid primary key,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  date date not null,
  hours text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.equipment enable row level security;
alter table public.equipment_service_records enable row level security;

create policy "equipment_select_all" on public.equipment
  for select to authenticated using (true);
create policy "equipment_insert_member_admin" on public.equipment
  for insert to authenticated with check (public.is_member_or_admin());
create policy "equipment_update_member_admin" on public.equipment
  for update to authenticated
  using (public.is_member_or_admin())
  with check (public.is_member_or_admin());
create policy "equipment_delete_admin" on public.equipment
  for delete to authenticated using (public.is_admin());

create policy "equipment_service_records_select_all" on public.equipment_service_records
  for select to authenticated using (true);
create policy "equipment_service_records_insert_member_admin" on public.equipment_service_records
  for insert to authenticated with check (public.is_member_or_admin());
create policy "equipment_service_records_update_member_admin" on public.equipment_service_records
  for update to authenticated
  using (public.is_member_or_admin())
  with check (public.is_member_or_admin());
create policy "equipment_service_records_delete_admin" on public.equipment_service_records
  for delete to authenticated using (public.is_admin());
