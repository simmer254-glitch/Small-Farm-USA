-- Same bug category as 0011/0013: pending_invites was never added to the
-- realtime publication, so it's had no live-update support at all. This
-- matters now that the Family screen shows pending invites — an admin
-- adding or cancelling one on their device should reflect live on everyone
-- else's Family screen (only admins can see this data at all, per the
-- existing pending_invites_admin_all RLS policy).
alter publication supabase_realtime add table public.pending_invites;
