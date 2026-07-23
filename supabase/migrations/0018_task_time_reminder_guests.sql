-- Nullable columns, all optional: null time means the existing all-day
-- behavior every current task already has, so no backfill is needed.
alter table public.tasks add column time text;
alter table public.tasks add column reminder_minutes integer;
alter table public.tasks add column guest_emails text;
