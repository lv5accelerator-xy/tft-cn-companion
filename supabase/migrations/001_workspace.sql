create table if not exists public.tft_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tft_workspaces enable row level security;

create policy "users can read own tft workspace"
on public.tft_workspaces
for select
to authenticated
using (auth.uid() = user_id);

create policy "users can insert own tft workspace"
on public.tft_workspaces
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users can update own tft workspace"
on public.tft_workspaces
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can delete own tft workspace"
on public.tft_workspaces
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_tft_workspace_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tft_workspace_updated_at on public.tft_workspaces;
create trigger set_tft_workspace_updated_at
before update on public.tft_workspaces
for each row
execute function public.set_tft_workspace_updated_at();
