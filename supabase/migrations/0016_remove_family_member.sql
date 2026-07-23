-- "Remove a family member" cannot be a hard delete of the profiles row:
-- tasks.creator_user_id and chores.actor_user_id are both NOT NULL foreign
-- keys to profiles with no cascade, so any member who ever created a task
-- or logged a chore would make deletion fail outright — and even where FKs
-- are nullable (docs, feedback, pending_invites), losing the profiles row
-- would break "by {name}" attribution on old records, contradicting this
-- app's whole "history survives" design already used for animals/audit_log.
-- Instead: mark the profile removed (hidden from the Family screen and any
-- future assignment, but still resolvable for old records' attribution)
-- and delete their auth.users row, which immediately revokes their session
-- and ability to sign in again.
alter table public.profiles add column removed_at timestamptz;

create or replace function public.remove_family_member(target uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_name text;
begin
  if not public.is_admin() then
    raise exception 'only an admin can remove a family member';
  end if;
  if target = auth.uid() then
    raise exception 'cannot remove your own account';
  end if;

  select name into target_name from public.profiles where id = target;

  update public.profiles set removed_at = now() where id = target;
  delete from auth.users where id = target;

  insert into public.audit_log (id, actor, kind, ref_type, ref_id, business, summary, date_occurred)
  select gen_random_uuid(), p.name, 'Member removed', 'profile', target::text, 'General',
         coalesce(target_name, 'Member') || ' — removed from the family account', current_date
  from public.profiles p where p.id = auth.uid();
end;
$$;

revoke execute on function public.remove_family_member(uuid) from public;
grant execute on function public.remove_family_member(uuid) to authenticated;
