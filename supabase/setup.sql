-- TanyaAja! — setup database Supabase
-- Jalankan sekali di Supabase Dashboard > SQL Editor pada project baru.
-- Aman dijalankan ulang (memakai "if not exists" / "or replace").
--
-- Model akses:
-- - Aplikasi hanya mengakses database dari server Next.js memakai secret key
--   (role service_role). Browser tidak pernah memegang key apa pun.
-- - Role anon dan authenticated (publishable/anon key) TIDAK diberi akses
--   ke tabel maupun fungsi. RLS aktif tanpa policy, jadi semua akses anon ditolak.
-- - Pembatasan per kelompok (group_id) dilakukan di kode server,
--   memakai GROUP_ID dari environment. Pemegang secret key tetap bisa
--   mengakses semua kelompok. Lihat README.

-- ---------------------------------------------------------------------------
-- 1. Tabel pertanyaan
-- ---------------------------------------------------------------------------
create table if not exists public.questions (
  id           uuid primary key default gen_random_uuid(),
  group_id     text not null,
  question     text not null,
  answer       text not null default '',
  is_published boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- group_id: huruf kecil, angka, tanda hubung. Contoh: kelompok-01
  constraint questions_group_id_format
    check (group_id ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  -- pertanyaan: 3–500 karakter, tidak boleh hanya spasi
  constraint questions_question_length
    check (char_length(btrim(question)) between 3 and 500),
  -- jawaban: maksimal 2000 karakter (boleh kosong selama belum dipublikasikan)
  constraint questions_answer_length
    check (char_length(answer) <= 2000),
  -- tidak boleh memublikasikan jawaban kosong
  constraint questions_publish_needs_answer
    check (not is_published or char_length(btrim(answer)) > 0),
  -- published_at terisi hanya jika dipublikasikan
  constraint questions_published_at_matches
    check (is_published = (published_at is not null))
);

-- Daftar publik: per kelompok, yang sudah dipublikasikan, terbaru di atas
create index if not exists questions_public_idx
  on public.questions (group_id, published_at desc)
  where is_published;

-- Daftar pemilik: per kelompok, terbaru di atas
create index if not exists questions_group_created_idx
  on public.questions (group_id, created_at desc);

-- updated_at otomatis
create or replace function public.tanyaaja_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.tanyaaja_set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Sesi pemilik (setelah login PIN)
--    Cookie browser hanya berisi token acak. Database menyimpan hash-nya.
-- ---------------------------------------------------------------------------
create table if not exists public.owner_sessions (
  token_hash text primary key,
  group_id   text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),

  constraint owner_sessions_group_id_format
    check (group_id ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  constraint owner_sessions_token_hash_format
    check (token_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists owner_sessions_expires_idx
  on public.owner_sessions (expires_at);

-- ---------------------------------------------------------------------------
-- 3. Pembatasan percobaan (rate limit)
--    Disimpan di database supaya tetap berlaku di Vercel (serverless).
--    bucket berisi jenis + kelompok + hash IP, bukan IP asli.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket       text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (bucket, window_start),

  constraint rate_limits_bucket_length check (char_length(bucket) <= 200)
);

-- Tambah 1 hitungan ke bucket pada jendela waktu saat ini.
-- Mengembalikan true jika masih di bawah batas, false jika sudah melewati batas.
create or replace function public.tanyaaja_hit_rate_limit(
  p_bucket text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  if p_max < 1 or p_window_seconds < 1 then
    raise exception 'batas tidak valid';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as r (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start)
  do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Bersihkan jendela lama milik bucket ini, dan sesekali seluruh data lama.
  delete from public.rate_limits
  where bucket = p_bucket and window_start < v_window;

  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
    delete from public.owner_sessions where expires_at < now();
  end if;

  return v_hits <= p_max;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Hak akses
--    RLS aktif tanpa policy: anon/authenticated tidak bisa membaca/mengubah apa pun.
--    service_role (secret key) melewati RLS dan dipakai hanya oleh server aplikasi.
-- ---------------------------------------------------------------------------
alter table public.questions      enable row level security;
alter table public.owner_sessions enable row level security;
alter table public.rate_limits    enable row level security;

revoke all on table public.questions      from public, anon, authenticated;
revoke all on table public.owner_sessions from public, anon, authenticated;
revoke all on table public.rate_limits    from public, anon, authenticated;

grant select, insert, update, delete on table public.questions      to service_role;
grant select, insert, update, delete on table public.owner_sessions to service_role;
grant select, insert, update, delete on table public.rate_limits    to service_role;

revoke all on function public.tanyaaja_hit_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.tanyaaja_hit_rate_limit(text, integer, integer)
  to service_role;

revoke all on function public.tanyaaja_set_updated_at() from public, anon, authenticated;
