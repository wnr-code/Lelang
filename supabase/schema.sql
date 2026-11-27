-- ============================================================
-- Lelang Kebaikan Cigatas — Skema Supabase (PostgreSQL)
-- Jalankan via Supabase SQL Editor atau connector migration.
-- Aplikasi memakai service-role key di server (bypass RLS).
-- ============================================================

create table if not exists public.events (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  description text not null default '',
  event_date date,
  location text not null default '',
  status text not null default 'draft' check (status in ('draft','active','completed','archived')),
  cover_image text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.items (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  name text not null,
  target_qty double precision,
  target_label text not null,
  unit text not null default '',
  note text not null default '',
  sort_order integer not null default 0,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  item_id bigint not null references public.items(id) on delete cascade,
  nickname text not null,
  qty double precision,
  qty_label text not null default '',
  message text not null default '',
  contact text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  track_code text not null unique,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decision_note text not null default ''
);

create table if not exists public.fulfillments (
  id bigint generated always as identity primary key,
  item_id bigint not null references public.items(id) on delete cascade,
  submission_id bigint references public.submissions(id) on delete set null,
  person_name text not null,
  qty double precision,
  qty_label text not null default '',
  is_pic boolean not null default false,
  received boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.surplus (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  item_id bigint references public.items(id) on delete set null,
  item_name text not null,
  qty double precision,
  qty_label text not null default '',
  condition text not null default 'sisa' check (condition in ('sisa','berlebih')),
  decision text not null default 'disimpan' check (decision in ('disimpan','kegiatan_berikutnya','ditukar','dijual','didonasikan','lainnya')),
  decision_note text not null default '',
  pic_name text not null default '',
  outcome text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.photos (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  file_path text not null,
  caption text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_items_event on public.items(event_id);
create index if not exists idx_submissions_event on public.submissions(event_id);
create index if not exists idx_submissions_item on public.submissions(item_id);
create index if not exists idx_fulfillments_item on public.fulfillments(item_id);
create index if not exists idx_surplus_event on public.surplus(event_id);
create index if not exists idx_photos_event on public.photos(event_id);

-- ------------------------------------------------------------
-- Row Level Security: aplikasi mengakses via service-role key
-- di server (bypass RLS). Kebijakan baca publik disiapkan untuk
-- data yang memang ditampilkan ke anggota (tanpa login).
-- ------------------------------------------------------------
alter table public.events enable row level security;
alter table public.items enable row level security;
alter table public.submissions enable row level security;
alter table public.fulfillments enable row level security;
alter table public.surplus enable row level security;
alter table public.photos enable row level security;

-- Baca publik untuk data papan kegiatan (anon key bila dipakai di klien).
drop policy if exists "public read active events" on public.events;
create policy "public read active events" on public.events
  for select using (status in ('active','completed','archived'));

drop policy if exists "public read items" on public.items;
create policy "public read items" on public.items for select using (true);

drop policy if exists "public read photos" on public.photos;
create policy "public read photos" on public.photos for select using (true);

drop policy if exists "public read surplus" on public.surplus;
create policy "public read surplus" on public.surplus for select using (true);

-- submissions & fulfillments memuat data pribadi (kontak) → hanya service-role.
-- (Tidak ada policy select untuk anon; service-role melewati RLS.)
