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
