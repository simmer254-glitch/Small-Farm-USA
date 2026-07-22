create table public.animals (
  id uuid primary key,
  cls text not null check (cls in ('livestock', 'pet')),
  species text not null,
  tag text not null,
  name text not null default '',
  sex text not null default '',
  born date not null,
  color text not null default '',
  dam text not null default '',
  count int not null default 1,
  status text not null default 'active' check (status in ('active', 'sold', 'butchered')),
  created_at timestamptz not null default now()
);

create table public.animal_events (
  id uuid primary key,
  animal_id uuid not null references public.animals (id) on delete cascade,
  date date not null,
  type text not null check (type in ('born', 'tag', 'weight', 'vax', 'note', 'sold', 'butchered')),
  title text not null,
  lb numeric,
  actor text not null,
  created_at timestamptz not null default now()
);

alter table public.animals enable row level security;
alter table public.animal_events enable row level security;

create policy "animals_select_all" on public.animals
  for select to authenticated using (true);
create policy "animals_insert_member_admin" on public.animals
  for insert to authenticated with check (public.is_member_or_admin());
create policy "animals_update_member_admin" on public.animals
  for update to authenticated
  using (public.is_member_or_admin())
  with check (public.is_member_or_admin());
create policy "animals_delete_admin" on public.animals
  for delete to authenticated using (public.is_admin());

create policy "animal_events_select_all" on public.animal_events
  for select to authenticated using (true);
create policy "animal_events_insert_member_admin" on public.animal_events
  for insert to authenticated with check (public.is_member_or_admin());
create policy "animal_events_update_member_admin" on public.animal_events
  for update to authenticated
  using (public.is_member_or_admin())
  with check (public.is_member_or_admin());
create policy "animal_events_delete_admin" on public.animal_events
  for delete to authenticated using (public.is_admin());
