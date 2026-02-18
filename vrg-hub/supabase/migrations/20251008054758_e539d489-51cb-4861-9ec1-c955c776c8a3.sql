-- Create table to track fax sync history
create table if not exists public.notifyre_sync_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  synced_by uuid references auth.users(id),
  from_date timestamp with time zone not null,
  to_date timestamp with time zone not null,
  campaigns_synced integer not null default 0,
  faxes_synced integer not null default 0,
  status text not null default 'success',
  error_message text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable RLS
alter table public.notifyre_sync_history enable row level security;

-- Create policies
create policy "Users can view their company sync history"
  on public.notifyre_sync_history
  for select
  using (company_id = get_user_company(auth.uid()));

create policy "System can insert sync history"
  on public.notifyre_sync_history
  for insert
  with check (true);

-- Add index for better performance
create index idx_notifyre_sync_history_company_id on public.notifyre_sync_history(company_id);
create index idx_notifyre_sync_history_created_at on public.notifyre_sync_history(created_at desc);