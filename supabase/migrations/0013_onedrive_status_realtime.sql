-- Same bug category as 0011: a new table isn't realtime-enabled just by
-- having RLS — it must be explicitly added to the publication, or every
-- other family member's Docs screen won't see sync status update live.
alter publication supabase_realtime add table public.onedrive_status;
