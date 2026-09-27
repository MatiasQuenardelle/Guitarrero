-- Per-user state for each published piece. Users live in neon_auth.user (Neon Auth).
create table if not exists piece_progress (
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  piece_slug text not null,
  favorite boolean not null default false,
  -- Playback speed as a ratio of the written tempo (what alphaTab takes).
  speed real,
  last_opened_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, piece_slug)
);

create index if not exists piece_progress_recent
  on piece_progress (user_id, last_opened_at desc);

-- Pieces kept out of the public repo, e.g. arrangements bought as a PDF. Same shape as
-- content/pieces/<slug>/, and like everything in the app only the owner accounts see them.
create table if not exists private_pieces (
  slug text primary key,
  piece jsonb not null,
  alphatex text not null,
  updated_at timestamptz not null default now()
);
