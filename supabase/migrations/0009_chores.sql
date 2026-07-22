create table public.chores (
  id uuid primary key,
  icon text not null,
  title text not null,
  date date not null,
  actor_user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.chores enable row level security;

create policy "chores_select_all" on public.chores
  for select to authenticated using (true);

-- Every role can log a chore — this is the one action a kid account exists to
-- do. No update/delete policy for anyone: chores, like the audit log, are an
-- append-only record of "this got done."
create policy "chores_insert_all" on public.chores
  for insert to authenticated with check (true);
