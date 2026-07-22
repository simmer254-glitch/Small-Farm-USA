-- Safety preamble: makes the combined migration file re-runnable from
-- scratch regardless of what partially committed on a previous failed
-- attempt. Drops everything this schema creates, in dependency order.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.toggle_task(uuid);
drop function if exists public.set_user_role(uuid, text);
drop function if exists public.is_member_or_admin();
drop function if exists public.is_admin();
drop function if exists public.current_role();

drop table if exists public.feedback cascade;
drop table if exists public.chores cascade;
drop table if exists public.equipment_service_records cascade;
drop table if exists public.equipment cascade;
drop table if exists public.tasks cascade;
drop table if exists public.transactions cascade;
drop table if exists public.animal_events cascade;
drop table if exists public.animals cascade;
drop table if exists public.docs cascade;
drop table if exists public.pending_invites cascade;
drop table if exists public.profiles cascade;
drop table if exists public.audit_log cascade;


-- ============================================================
-- migrations/0001_audit_log.sql
-- ============================================================
-- Append-only audit trail. Deliberately NOT foreign-keyed to any live entity
-- table, so a row's history survives the referenced animal/transaction/etc.
-- being deleted (matches the phase-1 client-side design).
create table public.audit_log (
  id uuid primary key,
  ts timestamptz not null default now(),
  actor text not null,
  kind text not null,
  ref_type text not null,
  ref_id text not null,
  business text not null,
  summary text not null,
  date_occurred date not null
);

alter table public.audit_log enable row level security;

-- INSERT-only for every authenticated role, no UPDATE/DELETE ever — even for
-- admin. This enforces true append-only at the database level.
create policy "audit_log_select_all" on public.audit_log
  for select to authenticated using (true);

create policy "audit_log_insert_all" on public.audit_log
  for insert to authenticated with check (true);

-- No UPDATE or DELETE policy is created — with RLS enabled and no matching
-- policy, those operations are rejected for every role, including admin.


-- ============================================================
-- migrations/0002_profiles_and_invites.sql
-- ============================================================
-- One row per authenticated family member, 1:1 with auth.users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member', 'kid')),
  created_at timestamptz not null default now()
);

-- Admin pre-authorizes a family member by email + role before they ever sign
-- in. No invite email is sent by this app — the admin tells the person
-- directly to open the app and sign in with this exact email. The
-- handle_new_user trigger (next migration) consumes rows here on first
-- sign-in and assigns the pre-authorized role.
create table public.pending_invites (
  email text primary key,
  role text not null check (role in ('admin', 'member', 'kid')),
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.pending_invites enable row level security;

-- Helper functions used by every other table's RLS policies. SECURITY DEFINER
-- + a pinned search_path so they work regardless of what policy exists on
-- profiles itself, and can't be hijacked via a mutable search_path.
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

create or replace function public.is_member_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_role() in ('admin', 'member'), false);
$$;

revoke execute on function public.current_role() from public;
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_member_or_admin() from public;
grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_member_or_admin() to authenticated;

-- Names are shown all over the app ("logged by {actor}"), so every
-- authenticated user can see every profile.
create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

-- RLS gates ROWS, not COLUMNS: a policy like "update your own row" would
-- still let a member set their own `role` column to 'admin' in the same
-- statement. Column-level grants close that gap independently of RLS.
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;

create policy "profiles_update_own_name" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Role changes go exclusively through this RPC (never a direct column grant),
-- which checks the caller is admin itself — SECURITY DEFINER bypasses RLS
-- entirely, so that check is mandatory, not optional.
create or replace function public.set_user_role(target uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'only an admin can change roles';
  end if;
  if new_role not in ('admin', 'member', 'kid') then
    raise exception 'invalid role %', new_role;
  end if;

  update public.profiles set role = new_role where id = target;

  insert into public.audit_log (id, actor, kind, ref_type, ref_id, business, summary, date_occurred)
  select gen_random_uuid(), p.name, 'Role changed', 'profile', target::text, 'General',
         p.name || ' — role changed to ' || new_role, current_date
  from public.profiles p where p.id = auth.uid();
end;
$$;

revoke execute on function public.set_user_role(uuid, text) from public;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- pending_invites: admin-only, in every direction.
create policy "pending_invites_admin_all" on public.pending_invites
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================
-- migrations/0003_handle_new_user_trigger.sql
-- ============================================================
-- Fires after Supabase Auth creates a new auth.users row (i.e. right after
-- someone completes OTP sign-in for the first time). Do NOT use auth.uid()
-- anywhere in here — there's no request-scoped JWT during this GoTrue-driven
-- insert, only NEW.id / NEW.email are reliable.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invite public.pending_invites%rowtype;
  invite_found boolean;
  assigned_role text;
  member_name text;
  inviter_name text;
begin
  select * into invite from public.pending_invites where email = new.email;
  invite_found := found; -- capture immediately: later statements overwrite FOUND

  if invite_found then
    assigned_role := invite.role;
  else
    assigned_role := 'member';
  end if;

  member_name := coalesce(split_part(new.email, '@', 1), 'New member');

  insert into public.profiles (id, name, email, role)
  values (new.id, member_name, new.email, assigned_role);

  if invite_found then
    select name into inviter_name from public.profiles where id = invite.invited_by;
  end if;

  insert into public.audit_log (id, actor, kind, ref_type, ref_id, business, summary, date_occurred)
  values (gen_random_uuid(), coalesce(inviter_name, 'System'), 'Member joined', 'profile',
          new.id::text, 'General', member_name || ' joined as ' || assigned_role, current_date);

  if invite_found then
    delete from public.pending_invites where email = new.email;
  end if;

  return new;
end;
$$;

-- Table owners bypass RLS by default (no FORCE ROW LEVEL SECURITY anywhere in
-- this schema), so this SECURITY DEFINER function can write to profiles/
-- audit_log and delete from pending_invites regardless of the RLS policies
-- defined on them.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- migrations/0004_docs.sql
-- ============================================================
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


-- ============================================================
-- migrations/0005_animals.sql
-- ============================================================
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


-- ============================================================
-- migrations/0006_transactions.sql
-- ============================================================
create table public.transactions (
  id uuid primary key,
  kind text not null check (kind in ('income', 'expense')),
  description text not null,
  amount numeric not null,
  date date not null,
  schedule_f_line text not null,
  business text not null check (business in ('Cattle', 'Poultry', 'Hogs', 'General')),
  -- SET NULL, not RESTRICT/CASCADE: RESTRICT would block deleting a doc that's
  -- referenced as a receipt with a confusing FK error; CASCADE would silently
  -- delete an unrelated transaction. SET NULL matches the optional
  -- `receiptDocId?` field already in the phase-1 TypeScript types.
  receipt_doc_id uuid references public.docs (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "transactions_select_all" on public.transactions
  for select to authenticated using (true);
create policy "transactions_insert_member_admin" on public.transactions
  for insert to authenticated with check (public.is_member_or_admin());
create policy "transactions_update_member_admin" on public.transactions
  for update to authenticated
  using (public.is_member_or_admin())
  with check (public.is_member_or_admin());
create policy "transactions_delete_admin" on public.transactions
  for delete to authenticated using (public.is_admin());


-- ============================================================
-- migrations/0007_tasks.sql
-- ============================================================
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


-- ============================================================
-- migrations/0008_equipment.sql
-- ============================================================
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


-- ============================================================
-- migrations/0009_chores.sql
-- ============================================================
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


-- ============================================================
-- migrations/0010_feedback.sql
-- ============================================================
create table public.feedback (
  id uuid primary key,
  who text not null, -- display-name snapshot
  author_user_id uuid references public.profiles (id),
  date date not null,
  text text not null,
  status text not null default 'New' check (status in ('New', 'Planned', 'Done')),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

create policy "feedback_select_all" on public.feedback
  for select to authenticated using (true);

-- Every role can submit feedback, including kids — the spec's kid-mode
-- restrictions are specifically money/deletes/admin surfaces, and a
-- suggestion box is none of those.
create policy "feedback_insert_all" on public.feedback
  for insert to authenticated with check (true);

create policy "feedback_update_member_admin" on public.feedback
  for update to authenticated
  using (public.is_member_or_admin())
  with check (public.is_member_or_admin());

create policy "feedback_delete_admin" on public.feedback
  for delete to authenticated using (public.is_admin());


