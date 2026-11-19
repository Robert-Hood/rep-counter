-- run once in the Neon SQL editor
create table if not exists counters (
  id         int primary key,
  data       jsonb       not null,
  updated_at timestamptz not null default now()
);

-- push notifications: one row per subscribed device
create table if not exists push_subscriptions (
  endpoint     text primary key,
  subscription jsonb       not null,
  settings     jsonb       not null,
  updated_at   timestamptz not null default now()
);
