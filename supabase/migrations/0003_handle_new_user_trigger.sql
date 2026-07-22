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
