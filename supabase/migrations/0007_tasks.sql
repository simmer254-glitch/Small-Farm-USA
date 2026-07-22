create table public.tasks (
  id uuid primary key,
  title text not null,
  date date not null,
  type text not null check (type in ('Butcher', 'Maintenance', 'Vaccination', 'Other')),
  -- Holds the sentinels 'everyone'/'kids' alongside real profile ids, so this
  -- can't be a plain FK. Postgres CHECK constraints can't contain subqueries
  -- against other tables, so validating this against real profile ids isn't
  -- enforceable at the DB level here — the app is the only place that
  -- assigns this field, so it's left as a plain text column.
  assignee_user_id text not null,
  creator_user_id uuid not null references public.profiles (id),
  done boolean not null default false,
  gcal_event_id text,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "tasks_select_all" on public.tasks
  for select to authenticated using (true);
create policy "tasks_insert_member_admin" on public.tasks
  for insert to authenticated with check (public.is_member_or_admin());
create policy "tasks_update_member_admin" on public.tasks
  for update to authenticated
  using (public.is_member_or_admin())
  with check (public.is_member_or_admin());
create policy "tasks_delete_admin" on public.tasks
  for delete to authenticated using (public.is_admin());

-- Lets a kid flip their own task's `done` flag without a blanket UPDATE grant
-- on tasks. SECURITY DEFINER bypasses RLS entirely, so the permission check
-- below is mandatory, not optional — without it, any authenticated user could
-- toggle any task regardless of assignment.
create or replace function public.toggle_task(task_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  t public.tasks%rowtype;
begin
  select * into t from public.tasks where id = task_id;
  if not found then
    raise exception 'task not found';
  end if;

  if not (
    public.is_member_or_admin()
    or t.assignee_user_id = auth.uid()::text
    or t.assignee_user_id in ('everyone', 'kids')
  ) then
    raise exception 'not permitted';
  end if;

  update public.tasks set done = not done where id = task_id;
end;
$$;

revoke execute on function public.toggle_task(uuid) from public;
grant execute on function public.toggle_task(uuid) to authenticated;
