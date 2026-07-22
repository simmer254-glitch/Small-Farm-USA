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
