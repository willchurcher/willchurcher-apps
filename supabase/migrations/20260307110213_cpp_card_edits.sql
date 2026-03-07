-- Append-only audit log of every card edit.
-- Useful for model training and few-shot context engineering.
create table cpp_card_edits (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  card_id    bigint      not null,
  q          text        not null,
  a          text        not null,
  -- 'manual' | 'ai-enhance' | 'ai-generate' | 'import'
  source     text        not null default 'manual',
  created_at timestamptz not null default now()
);

create index cpp_card_edits_user_card on cpp_card_edits(user_id, card_id);
create index cpp_card_edits_created   on cpp_card_edits(created_at);

alter table cpp_card_edits enable row level security;

create policy "Users can read own edits"
  on cpp_card_edits for select
  using (auth.uid() = user_id);

create policy "Users can insert own edits"
  on cpp_card_edits for insert
  with check (auth.uid() = user_id);
