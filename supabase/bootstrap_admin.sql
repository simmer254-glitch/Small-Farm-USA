-- Run once: pre-authorizes the owner's email as the first admin, so signing
-- in for the first time assigns 'admin' instead of the default 'member'.
insert into public.pending_invites (email, role) values ('simmer254@gmail.com', 'admin');
