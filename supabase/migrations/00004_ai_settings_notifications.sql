create type public.app_ai_provider as enum ('openai', 'anthropic', 'ollama', 'gemini', 'minimax', 'moonshot');
create type public.app_notification_type as enum ('large_transaction', 'budget_warning', 'budget_exceeded', 'goal_milestone', 'system');

create table public.ai_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  provider app_ai_provider not null default 'openai',
  api_key text,
  base_url text,
  model text not null default 'gpt-4o-mini',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type app_notification_type not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_unread on public.notifications (user_id, is_read) where not is_read;
create index idx_notifications_user_date on public.notifications (user_id, created_at desc);

alter table public.ai_settings enable row level security;
alter table public.notifications enable row level security;

create policy "Users manage own AI settings" on public.ai_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own notifications" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger set_ai_settings_updated_at
  before update on public.ai_settings
  for each row execute function public.update_updated_at();
