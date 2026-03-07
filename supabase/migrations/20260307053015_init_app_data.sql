-- App data table: one row per user per app, stores JSON blob
create table app_data (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users(id) on delete cascade not null,
  app        text        not null,
  data       jsonb       not null default '{}',
  updated_at timestamptz default now(),
  unique(user_id, app)
);

-- Row Level Security: users can only read/write their own rows
alter table app_data enable row level security;

create policy "Users can read own data"
  on app_data for select
  using (auth.uid() = user_id);

create policy "Users can upsert own data"
  on app_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update own data"
  on app_data for update
  using (auth.uid() = user_id);

-- Auto-update updated_at on change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger app_data_updated_at
  before update on app_data
  for each row execute function update_updated_at();
