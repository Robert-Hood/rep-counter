-- run once in the Neon SQL editor
create table if not exists counters (
  id         int primary key,
  data       jsonb       not null,
  updated_at timestamptz not null default now()
);
