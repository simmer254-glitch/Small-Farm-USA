-- Supabase Realtime only broadcasts postgres_changes for tables explicitly
-- added to this publication — none of the previous migrations did this, so
-- every table's live sync was silently inert (writes worked, RLS worked,
-- but the app only ever saw new data after a manual refetch).
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.animals;
alter publication supabase_realtime add table public.animal_events;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.equipment;
alter publication supabase_realtime add table public.equipment_service_records;
alter publication supabase_realtime add table public.chores;
alter publication supabase_realtime add table public.docs;
alter publication supabase_realtime add table public.feedback;
alter publication supabase_realtime add table public.audit_log;
