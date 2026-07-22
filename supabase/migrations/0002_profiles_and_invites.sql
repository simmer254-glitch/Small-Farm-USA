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
