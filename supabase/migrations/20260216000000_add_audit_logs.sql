-- Create audit_logs table for tracking sensitive operations
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone default now()
);

-- Add indexes for performance
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

-- RLS policies
alter table public.audit_logs enable row level security;

-- Only admins can view audit logs (for now, users can't see their own)
-- In production, you might want to allow users to see their own audit logs
create policy "Admins can view all audit logs" on public.audit_logs
  for select using (false); -- Disabled for now, enable with proper admin check

-- Service role can insert audit logs
create policy "Service role can insert audit logs" on public.audit_logs
  for insert with check (true);

-- Define audit event types
comment on table public.audit_logs is 'Audit log for tracking sensitive operations';
comment on column public.audit_logs.action is 'Action performed: auth.login, auth.signup, auth.logout, settings.ai_update, account.connect, account.sync, transaction.import, etc.';
comment on column public.audit_logs.entity_type is 'Type of entity affected: user, account, transaction, etc.';
comment on column public.audit_logs.entity_id is 'ID of the affected entity';
comment on column public.audit_logs.metadata is 'Additional context about the operation';