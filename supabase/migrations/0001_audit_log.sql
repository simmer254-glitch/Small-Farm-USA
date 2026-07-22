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
