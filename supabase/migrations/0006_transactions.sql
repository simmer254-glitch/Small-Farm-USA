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
