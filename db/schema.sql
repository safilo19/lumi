-- Lumi schema (Neon Postgres). Mirrors the shapes the JSON file-store used
-- (src/lib/db/*.ts) so the repo interface is unchanged after the swap.
-- Apply with the DIRECT (unpooled) connection string. Additive + idempotent.

create extension if not exists pgcrypto; -- gen_random_uuid()

create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,            -- stored lowercased
  name       text not null,
  role       text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token      text primary key,                -- opaque 32-byte hex
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_user_id_idx on sessions (user_id);
create index if not exists sessions_expires_at_idx on sessions (expires_at);

create table if not exists magic_tokens (
  token      text primary key,                -- one-time 32-byte hex
  email      text not null,                   -- stored lowercased
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);
create index if not exists magic_tokens_email_idx on magic_tokens (email);
create index if not exists magic_tokens_expires_at_idx on magic_tokens (expires_at);

create table if not exists notes (
  id           text primary key,              -- slug-based id
  title        text not null,
  course_id    text not null,
  lecturer     text not null default 'You',
  duration_min integer not null default 0,
  recorded_at  timestamptz not null default now(),
  language     text not null check (language in ('English', 'Urdu', 'Mixed')),
  blocks       jsonb not null default '[]'::jsonb,
  owner_id     uuid references users(id) on delete set null, -- null = unattributed
  created_at   timestamptz not null default now()
);
create index if not exists notes_course_id_idx on notes (course_id);
create index if not exists notes_owner_id_idx on notes (owner_id);
create index if not exists notes_recorded_at_idx on notes (recorded_at desc);
