-- =============================================================================
--  IS GROUP DANCEHUBTR — VERITABANI ŞEMASI v1
--  Supabase SQL Editor'da tek seferde çalıştır.
--  Hedef: PostgreSQL 15+ / Supabase
--
--  MODEL:
--    Platform yalnızca IS Group'ın kendi organizasyonları içindir.
--    Katılımcılar IS Group + akrediteli diğer kulüplerden gelir.
--    Kamuya açık kimlik = Koreografi adı, yoksa "Guest N".
--    Gerçek isim/kişisel veri hiçbir zaman herkese açık değildir.
--    Sonuçlar masa hakemi tarafından METAM4 export (RAR) olarak yüklenir.
-- =============================================================================
--  EKLENTİLER
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- =============================================================================
--  1. KİMLİK VE KULÜPLER
-- =============================================================================

-- Kullanıcı profili. id = auth.users.id (Supabase Auth ile birebir).
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       citext unique,
  full_name   text,
  role        text not null default 'user'
                check (role in ('admin','staff','user')),
  avatar_url  text,
  phone       text,
  created_at  timestamptz not null default now()
);

-- Kulüpler: IS Group + akrediteli misafir kulüpler
create table if not exists public.clubs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          citext unique not null,
  city          text,
  logo_url      text,
  bio           text,
  accreditation text not null default 'accredited'
                  check (accreditation in ('accredited','pending','suspended')),
  is_organizer  boolean not null default false,
  website       text,
  created_at    timestamptz not null default now()
);

-- Kulüp üyeliği (panel ekibi birden fazla kulüpte olabilir)
create table if not exists public.club_members (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references public.clubs(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role_in_club text not null default 'member'
                 check (role_in_club in ('owner','manager','coach','member')),
  created_at   timestamptz not null default now(),
  unique (club_id, user_id)
);


-- =============================================================================
--  2. ETKİNLİKLER VE KATEGORİLER
-- =============================================================================

create table if not exists public.venues (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  address  text,
  city     text,
  lat      numeric(9,6),
  lng      numeric(9,6),
  capacity int
);

-- Bir etkinlik = METAM4'teki bir yarışma günü
create table if not exists public.events (
  id                uuid primary key default gen_random_uuid(),
  slug              citext unique not null,
  title             text not null,             -- "4.METAMORFOZ SHOW DANCE"
  subtitle          text,                      -- "22.12.2024 - NEV-İ"
  organizer_club_id uuid references public.clubs(id) on delete set null,
  venue_id          uuid references public.venues(id) on delete set null,
  discipline        text not null default 'show_dance'
                      check (discipline in ('show_dance','couple_dance','hip_hop','improvisation','other')),
  start_date        date not null,
  end_date          date,
  city              text,
  status            text not null default 'draft'
                      check (status in ('draft','published','archived')),
  cover_url         text,
  -- METAM4 yüklemesinden gelen ham meta
  source            text not null default 'manual'
                      check (source in ('manual','metam4')),
  source_ref        text,                      -- orijinal export klasör adı
  -- Yayın kontrolü
  results_published boolean not null default false,
  published_at      timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists events_status_idx on public.events(status, start_date desc);
create index if not exists events_org_idx    on public.events(organizer_club_id);

-- Etkinlik altı yarışma kategorileri
-- METAM4'teki "Competition" + "Title" çiftine karşılık gelir
-- ör. Competition: "TDSFART Juvenile S.KADIN Show Dance", Title: "KARAYIP SOLO KADIN ADULT"
create table if not exists public.event_categories (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  name           text not null,          -- Competition (yarışma adı)
  title          text,                   -- Title (kategori alt adı)
  age_group      text,                   -- "Juvenile", "Adult", "Children 2"
  dance_style    text,                   -- "Show Dance", "Modern", "Latin"
  discipline     text,                   -- "couple", "solo", "duo", "group"
  max_place      int,                    -- 1., 2., 3-4. gibi final sınırı
  display_order  int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists event_categories_event_idx on public.event_categories(event_id, display_order);


-- =============================================================================
--  3. KATILIMCILAR (PERFORMANSLAR)
-- =============================================================================

-- Bir dansçı = bir performans satırı.
-- Kamuya açık kimlik: choreography_title, yoksa "Guest N".
-- real_name yalnızca panelde görünür.
create table if not exists public.performances (
  id                 uuid primary key default gen_random_uuid(),
  event_category_id  uuid not null references public.event_categories(id) on delete cascade,
  club_id            uuid references public.clubs(id) on delete set null,
  bib_number         int,                   -- METAM4 "No." (ör. 179)
  real_name          text,                  -- GİZLİ — panel/publika asla görmez
  choreography_title text,                  -- "SICAK BIR YUVA" gibi
  guest_number       int,                   -- koreografi adı yoksa 1..N
  is_guest           boolean not null default false,
  display_name       text generated always as (
                       case
                         when guest_number is not null then 'Guest ' || guest_number::text
                         else coalesce(choreography_title, 'Guest')
                       end
                     ) stored,
  created_at         timestamptz not null default now(),
  constraint guest_pair unique (event_category_id, guest_number),
  constraint identity_present check (choreography_title is not null or guest_number is not null)
);
create index if not exists performances_cat_idx  on public.performances(event_category_id);
create index if not exists performances_club_idx on public.performances(club_id);


-- =============================================================================
--  4. JÜRİLER VE SONUÇLAR
-- =============================================================================

-- Jüri üyeleri (METAM4 "Adjudicator(s)")
-- Jüri paneli KATEGORİYE bağlıdır: her yarışma kategorisinin kendi jüri ekibi vardır.
-- (Aynı etkinlikte farklı kategorilerde farklı jüri olabilir — unique (event_id,label) YANLIŞ olurdu.)
create table if not exists public.judges (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events(id) on delete cascade,
  event_category_id uuid not null references public.event_categories(id) on delete cascade,
  label             text not null,        -- "A", "B", "C" ...
  full_name         text not null,
  country           text,
  role              text not null default 'adjudicator'
                      check (role in ('adjudicator','chairman','scrutineer')),
  created_at        timestamptz not null default now(),
  unique (event_category_id, label)
);
create index if not exists judges_event_idx on public.judges(event_id);

-- Bir performansın bir turdaki sonucu
create table if not exists public.results (
  id                 uuid primary key default gen_random_uuid(),
  performance_id     uuid not null references public.performances(id) on delete cascade,
  round              text not null default 'Final',   -- "Final", "1", "2", "Heat"
  place              int,                              -- 1,2,3...
  place_label        text,                             -- "1.", "2.", "3-4.", "Finalist"
  sum                numeric,                          -- jüri puanlarının toplamı
  marks              text,                             -- ham string: "311", "11111", "2,0"
  qualified_for_final boolean,
  withdrawn          boolean not null default false,
  created_at         timestamptz not null default now(),
  unique (performance_id, round)
);
create index if not exists results_perf_idx on public.results(performance_id);
create index if not exists results_place_idx on public.results(round, place);

-- Jüri bazlı detay: her jüri her performansa ne verdi
--   ordinal (skating): 1,2,3
--   marks   (puanlı)  : 3.25, 4.00 ...
create table if not exists public.judge_scores (
  id        uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.results(id) on delete cascade,
  judge_id  uuid not null references public.judges(id) on delete cascade,
  mark      numeric(6,3) not null,
  is_tie    boolean not null default false,   -- "1.-2." gibi beraberlik
  unique (result_id, judge_id)
);
create index if not exists judge_scores_result_idx on public.judge_scores(result_id);


-- =============================================================================
--  5. YÜKLEME (MASA HAKEMİ)
-- =============================================================================

-- Masa hakemi için tek kullanımlık / süreli link
create table if not exists public.import_tokens (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  token        text not null unique,
  label        text,                      -- "Masa hakemi - Ahmet"
  expires_at   timestamptz not null,
  max_uses     int not null default 3,
  used_count   int not null default 0,
  revoked_at   timestamptz,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists import_tokens_event_idx on public.import_tokens(event_id);

-- Yüklenen dosya denetim izi
create table if not exists public.imports (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  token_id       uuid references public.import_tokens(id) on delete set null,
  file_name      text not null,
  file_size      bigint,
  file_hash      text,
  storage_path   text,
  status         text not null default 'uploaded'
                   check (status in ('uploaded','parsing','parsed','committed','failed','discarded')),
  parser_version text,
  stats          jsonb,                    -- {"events":1,"categories":12,"performances":48,...}
  error_message  text,
  uploaded_by    uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  committed_at   timestamptz
);
create index if not exists imports_event_idx on public.imports(event_id, created_at desc);

-- Parse edilen ham satırlar (hata ayıklaması / onay ekranı)
create table if not exists public.import_rows (
  id           uuid primary key default gen_random_uuid(),
  import_id    uuid not null references public.imports(id) on delete cascade,
  row_no       int not null,
  category_ref text,                       -- kaynak klasör: "show_dans/0001"
  raw          jsonb,                      -- ham htm satırı
  matched      boolean not null default false,
  performance_id uuid references public.performances(id) on delete set null,
  error        text,
  created_at   timestamptz not null default now()
);
create index if not exists import_rows_import_idx on public.import_rows(import_id, row_no);


-- =============================================================================
--  6. MEDYA (FOTOĞRAF / VİDEO)
-- =============================================================================

create table if not exists public.media (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  performance_id uuid references public.performances(id) on delete cascade,
  category_id    uuid references public.event_categories(id) on delete cascade,
  uploaded_by    uuid references public.profiles(id) on delete set null,
  type           text not null default 'photo'
                   check (type in ('photo','video')),
  url            text not null,
  thumbnail_url  text,
  captions       text,
  tags           text[] not null default '{}',
  is_public      boolean not null default true,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists media_event_idx on public.media(event_id, sort_order);
create index if not exists media_perf_idx  on public.media(performance_id);

create table if not exists public.media_albums (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  name       text not null,
  cover_url  text,
  created_at timestamptz not null default now()
);

create table if not exists public.media_album_items (
  album_id uuid not null references public.media_albums(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  sort_order int not null default 0,
  primary key (album_id, media_id)
);


-- =============================================================================
--  7. BEKLEME LİSTESİ (ERKEN ERİŞİM)
-- =============================================================================

create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      citext unique not null,
  source     text not null default 'landing',
  created_at timestamptz not null default now()
);

-- Policies RLS bölümünde tanımlanır (is_staff() fonksiyonu önce gelmeli).
alter table public.waitlist enable row level security;


-- =============================================================================
--  8. BİLDİRİMLER
-- =============================================================================

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null default 'info',
  title      text not null,
  body       text,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, is_read, created_at desc);


-- =============================================================================
--  9. YARDIMCI FONKSİYONLAR (RLS politikaları bunları kullanır)
--     NOT: Tablolar oluşturulduktan SONRA tanımlanır — aksi halde
--     Postgres fonksiyonu doğrularken "relation does not exist" hatası verir.
-- -----------------------------------------------------------------------------

-- Kullanıcının rolü
create or replace function public.current_role()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'guest');
$$;

-- Platform yöneticisi (IS Group ekibi)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select public.current_role() = 'admin'; $$;

-- Panel ekibi (sonuç onaylayan, içerek yöneten)
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select public.current_role() in ('admin','staff'); $$;

-- Verilen kulüpte yetkili mi?
create or replace function public.is_club_member(p_club_id uuid, p_roles text[] default null)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.club_members m
    where m.club_id = p_club_id
      and m.user_id = auth.uid()
      and (p_roles is null or m.role_in_club = any(p_roles))
  );
$$;

-- Etkinliği düzenleyebilir mi? (organizatör kulübün yöneticisi veya admin/staff)
create or replace function public.can_edit_event(p_event_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_staff() or exists (
    select 1 from public.events e
    join public.club_members m on m.club_id = e.organizer_club_id and m.user_id = auth.uid()
    where e.id = p_event_id and m.role_in_club in ('owner','manager')
  );
$$;

-- Yükleme tokenı geçerli mi? (masa hakemi linki)
create or replace function public.valid_import_token(p_token text)
returns uuid language sql stable security definer set search_path = public
as $$
  select t.event_id from public.import_tokens t
  where t.token = p_token
    and t.expires_at > now()
    and t.used_count < t.max_uses
    and t.revoked_at is null
  limit 1;
$$;


-- =============================================================================
--  10. GÖRÜNÜMLER (VIEW'LER) — GİZLİLİK KATMANI
--     Gerçek isim burada ASLA görünmez.
-- =============================================================================

-- Performansların kamuya açık hali
create or replace view public.public_performances
with (security_invoker = false) as
select
  p.id,
  p.event_category_id,
  p.club_id,
  c.name  as club_name,
  c.slug  as club_slug,
  p.bib_number,
  p.display_name,
  p.is_guest,
  p.guest_number,
  p.choreography_title
from public.performances p
left join public.clubs c on c.id = p.club_id;

-- Sonuçların kamuya açık hali (jüri detayıyla birlikte)
create or replace view public.public_results
with (security_invoker = false) as
select
  r.id,
  r.performance_id,
  r.round,
  r.place,
  r.place_label,
  r.sum,
  r.marks,
  r.qualified_for_final,
  pp.display_name,
  pp.choreography_title,
  pp.guest_number,
  pp.bib_number,
  pp.club_id,
  pp.club_name,
  pp.event_category_id
from public.results r
join public.public_performances pp on pp.id = r.performance_id;

-- Jüri puanlarının kamuya açık hali
create or replace view public.public_judge_scores
with (security_invoker = false) as
select
  js.id,
  js.result_id,
  js.judge_id,
  j.label,
  j.full_name,
  j.role,
  js.mark,
  js.is_tie,
  pp.display_name,
  pp.club_name,
  pp.event_category_id
from public.judge_scores js
join public.judges j on j.id = js.judge_id
join public.public_results pp on pp.id = js.result_id;


-- =============================================================================

-- -----------------------------------------------------------------------------
--  11. RLS — SATIR SEVİYESİ GÜVENLİK
-- =============================================================================

-- ---- Bekleme listesi -------------------------------------------------------
drop policy if exists "waitlist: herkes ekleyebilir" on public.waitlist;
create policy "waitlist: herkes ekleyebilir" on public.waitlist
  for insert to anon, authenticated with check (true);

drop policy if exists "waitlist: sadece staff okur" on public.waitlist;
create policy "waitlist: sadece staff okur" on public.waitlist
  for select to authenticated using (public.is_staff());

alter table public.profiles          enable row level security;
alter table public.clubs             enable row level security;
alter table public.club_members      enable row level security;
alter table public.venues            enable row level security;
alter table public.events            enable row level security;
alter table public.event_categories  enable row level security;
alter table public.performances      enable row level security;
alter table public.judges            enable row level security;
alter table public.results           enable row level security;
alter table public.judge_scores      enable row level security;
alter table public.import_tokens     enable row level security;
alter table public.imports           enable row level security;
alter table public.import_rows       enable row level security;
alter table public.media             enable row level security;
alter table public.media_albums      enable row level security;
alter table public.media_album_items enable row level security;
alter table public.notifications     enable row level security;

-- ---- profiles ----
drop policy if exists "profiles: kendi profilini oku" on public.profiles;
create policy "profiles: kendi profilini oku" on public.profiles
  for select using (id = auth.uid() or public.is_staff());

drop policy if exists "profiles: kendi profilini guncelle" on public.profiles;
create policy "profiles: kendi profilini guncelle" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles: staff her seyi yonetir" on public.profiles;
create policy "profiles: staff her seyi yonetir" on public.profiles
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- Rol yükseltme koruması ----------------------------------------------
-- "profiles: kendi profilini guncelle" politikası id = auth.uid() olan herkesin
-- kendi satırını güncellemesine izin verir. Bu, rol kolonu da dahil olduğu için
-- TEHLİKELİDİR: herhangi bir kullanıcı kendini staff/admin yapabilirdi.
-- Bu trigger, rol değişikliğini yalnızca staff/admin için izinli kılar.
create or replace function public.profiles_role_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Sadece staff/admin, service_role veya DB yoneticisi (SQL Editor) rol degistirebilir.
  -- session_user: PostgREST isteklerinde 'authenticated'/'anon', SQL Editor'da 'postgres'.
  if new.role is distinct from old.role
     and not public.is_staff()
     and coalesce(session_user, '') not in ('postgres', 'supabase_admin', 'service_role')
     and coalesce(auth.role(), '') <> 'service_role'
  then
    raise exception 'Rol degistirilemez: yetki gerekiyor.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_guard_trg on public.profiles;
create trigger profiles_role_guard_trg
before update on public.profiles
for each row execute function public.profiles_role_guard();

-- ---- clubs: herkese açık okunur, yalnız yetkili yazar ----
drop policy if exists "clubs: herkes okur" on public.clubs;
create policy "clubs: herkes okur" on public.clubs
  for select using (true);

drop policy if exists "clubs: yetkili yazar" on public.clubs;
create policy "clubs: yetkili yazar" on public.clubs
  for all using (public.is_staff() or public.is_club_member(id, array['owner','manager']))
  with check (public.is_staff() or public.is_club_member(id, array['owner','manager']));

-- ---- club_members ----
drop policy if exists "club_members: kendi kulubu" on public.club_members;
create policy "club_members: kendi kulubu" on public.club_members
  for select using (user_id = auth.uid() or public.is_staff()
                    or public.is_club_member(club_id, array['owner','manager']));

drop policy if exists "club_members: yetkili yazar" on public.club_members;
create policy "club_members: yetkili yazar" on public.club_members
  for all using (public.is_staff() or public.is_club_member(club_id, array['owner','manager']))
  with check (public.is_staff() or public.is_club_member(club_id, array['owner','manager']));

-- ---- venues ----
drop policy if exists "venues: herkes okur" on public.venues;
create policy "venues: herkes okur" on public.venues for select using (true);

drop policy if exists "venues: staff yazar" on public.venues;
create policy "venues: staff yazar" on public.venues
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- events: yayınlananlar herkese açık ----
drop policy if exists "events: yayinlanan herkese acik" on public.events;
create policy "events: yayinlanan herkese acik" on public.events
  for select using (status = 'published' or public.can_edit_event(id));

drop policy if exists "events: yetkili yazar" on public.events;
create policy "events: yetkili yazar" on public.events
  for all using (public.can_edit_event(id)) with check (public.can_edit_event(id));

-- ---- event_categories ----
drop policy if exists "categories: yayinlanan etkinlige ait" on public.event_categories;
create policy "categories: yayinlanan etkinlige ait" on public.event_categories
  for select using (
    exists (select 1 from public.events e
            where e.id = event_id and (e.status = 'published' or public.can_edit_event(e.id)))
  );

drop policy if exists "categories: yetkili yazar" on public.event_categories;
create policy "categories: yetkili yazar" on public.event_categories
  for all using (public.can_edit_event(event_id)) with check (public.can_edit_event(event_id));

-- ---- performances: HERKES okur ama gerçek isim gizli kalır ----
-- Not: Gerçek isim (real_name) kolon seviyesinde gizlenemez.
-- Çözüm: anon/authenticated için SELECT yetkisi performances'a verilmez,
--         herkes public_performances view'ini okur.
drop policy if exists "performances: panel gorur" on public.performances;
create policy "performances: panel gorur" on public.performances
  for select using (public.is_staff() or public.can_edit_event(
    (select ec.event_id from public.event_categories ec where ec.id = event_category_id)
  ));

drop policy if exists "performances: yetkili yazar" on public.performances;
create policy "performances: yetkili yazar" on public.performances
  for all using (public.can_edit_event(
    (select ec.event_id from public.event_categories ec where ec.id = event_category_id)
  )) with check (public.can_edit_event(
    (select ec.event_id from public.event_categories ec where ec.id = event_category_id)
  ));

-- ---- judges ----
drop policy if exists "judges: herkes okur" on public.judges;
create policy "judges: herkes okur" on public.judges
  for select using (exists (select 1 from public.events e
                            where e.id = event_id and (e.status = 'published' or public.is_staff())));

drop policy if exists "judges: staff yazar" on public.judges;
create policy "judges: staff yazar" on public.judges
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- results ----
drop policy if exists "results: herkes okur" on public.results;
create policy "results: herkes okur" on public.results
  for select using (exists (select 1 from public.performances p
                            join public.event_categories ec on ec.id = p.event_category_id
                            join public.events e on e.id = ec.event_id
                            where p.id = performance_id
                              and (e.status = 'published' or public.is_staff())));

drop policy if exists "results: yetkili yazar" on public.results;
create policy "results: yetkili yazar" on public.results
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- judge_scores ----
drop policy if exists "judge_scores: herkes okur" on public.judge_scores;
create policy "judge_scores: herkes okur" on public.judge_scores
  for select using (exists (select 1 from public.results r
                            join public.performances p on p.id = r.performance_id
                            join public.event_categories ec on ec.id = p.event_category_id
                            join public.events e on e.id = ec.event_id
                            where r.id = result_id
                              and (e.status = 'published' or public.is_staff())));

drop policy if exists "judge_scores: yetkili yazar" on public.judge_scores;
create policy "judge_scores: yetkili yazar" on public.judge_scores
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- import_tokens ----
drop policy if exists "import_tokens: staff yonetir" on public.import_tokens;
create policy "import_tokens: staff yonetir" on public.import_tokens
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- imports ----
drop policy if exists "imports: staff yonetir" on public.imports;
create policy "imports: staff yonetir" on public.imports
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "import_rows: staff yonetir" on public.import_rows;
create policy "import_rows: staff yonetir" on public.import_rows
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- media ----
drop policy if exists "media: herkes okur" on public.media;
create policy "media: herkes okur" on public.media
  for select using (is_public or public.is_staff());

drop policy if exists "media: yetkili yazar" on public.media;
create policy "media: yetkili yazar" on public.media
  for all using (public.can_edit_event(event_id) or public.is_staff())
  with check (public.can_edit_event(event_id) or public.is_staff());

-- ---- media_albums ----
drop policy if exists "media_albums: herkes okur" on public.media_albums;
create policy "media_albums: herkes okur" on public.media_albums
  for select using (true);

drop policy if exists "media_albums: yetkili yazar" on public.media_albums;
create policy "media_albums: yetkili yazar" on public.media_albums
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- media_album_items ----
drop policy if exists "media_album_items: herkes okur" on public.media_album_items;
create policy "media_album_items: herkes okur" on public.media_album_items
  for select using (true);

drop policy if exists "media_album_items: yetkili yazar" on public.media_album_items;
create policy "media_album_items: yetkili yazar" on public.media_album_items
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- notifications: sadece sahibi ----
drop policy if exists "notifications: sadece sahibi" on public.notifications;
create policy "notifications: sadece sahibi" on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());


-- =============================================================================
--  12. VIEW ERİŞİM İZİNLERİ
--     performances tablosunun kendisi anon'a KAPALI; herkes view üzerinden okur.
-- =============================================================================

revoke all on public.performances from anon, authenticated;
grant  select on public.public_performances to anon, authenticated;
grant  select on public.public_results     to anon, authenticated;
grant  select on public.public_judge_scores to anon, authenticated;

-- ---- Herkese açık okuma ---------------------------------------------------
grant select on public.clubs, public.venues, public.events, public.event_categories,
               public.judges, public.results, public.judge_scores, public.media,
               public.media_albums, public.media_album_items
  to anon, authenticated;

-- ---- Bekleme listesi: form herkese açık, INSERT gerekli --------------------
grant insert on public.waitlist to anon, authenticated;
grant select on public.waitlist to authenticated;   -- okuma RLS ile staff'a açık

-- ---- Panel üyeleri (staff) yazma yetkileri --------------------------------
grant insert, update, delete on public.clubs, public.venues, public.events,
                public.event_categories, public.performances, public.judges,
                public.results, public.judge_scores, public.import_tokens,
                public.imports, public.import_rows, public.media,
                public.media_albums, public.media_album_items,
                public.notifications
  to authenticated;

grant insert, update on public.profiles to authenticated;
grant select on public.profiles to authenticated;

-- service_role: tüm yetkiler (sunucu tarafı API import için)
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Panel üyeleri performansları gerçek isimleriyle görebilsin
grant select on public.performances to authenticated;
drop policy if exists "performances: staff gercek isim gorur" on public.performances;
create policy "performances: staff gercek isim gorur" on public.performances
  for select using (public.is_staff());


-- =============================================================================
--  13. YÜKLEME AKIŞI — FONKSİYONLAR
-- =============================================================================

-- Token'ı kullanıp import kaydı oluştur (masa hakemi çağırır)
create or replace function public.begin_import(p_token text, p_file_name text, p_file_size bigint)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_event_id uuid;
  v_token_id uuid;
  v_import_id uuid;
begin
  select t.id, t.event_id into v_token_id, v_event_id
    from public.import_tokens t
   where t.token = p_token
     and t.expires_at > now()
     and t.used_count < t.max_uses
     and t.revoked_at is null
   limit 1;

  if v_event_id is null then
    raise exception 'Gecersiz veya suresi dolmus yukleme linki';
  end if;

  update public.import_tokens
     set used_count = used_count + 1
   where id = v_token_id;

  insert into public.imports (event_id, token_id, file_name, file_size, status)
  values (v_event_id, v_token_id, p_file_name, p_file_size, 'uploaded')
  returning id into v_import_id;

  return v_import_id;
end;
$$;

grant execute on function public.begin_import(text, text, bigint) to anon, authenticated;

-- Yüklemeyi onayla -> sonuçlar yazılır, yayın durumu güncellenir
create or replace function public.commit_import(p_import_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_import public.imports%rowtype;
begin
  select * into v_import from public.imports where id = p_import_id;
  if v_import.id is null then raise exception 'Import bulunamadi'; end if;
  if not public.is_staff() and not public.can_edit_event(v_import.event_id) then
    raise exception 'Yetkin yok';
  end if;

  update public.imports set status = 'committed', committed_at = now() where id = p_import_id;
  update public.events set results_published = true, published_at = coalesce(published_at, now())
   where id = v_import.event_id;

  return jsonb_build_object('ok', true, 'event_id', v_import.event_id);
end;
$$;

grant execute on function public.commit_import(uuid) to authenticated;


-- =============================================================================
--  14. TRIGGER'LAR
-- =============================================================================

-- Yeni kullanıcı kaydı -> profil satırı
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================================
--  15. ÖRNEK VERİ — IS GROUP KURULUMU
-- =============================================================================

insert into public.clubs (name, slug, city, accreditation, is_organizer)
values ('IS Group','is-group','Istanbul','accredited', true)
on conflict (slug) do nothing;

insert into public.clubs (name, slug, city, accreditation, is_organizer)
values ('ISIL SOZGUZEL GENCLIK VE SPOR KULUBU DER','isil-sozguzel','Istanbul','accredited', false)
on conflict (slug) do nothing;


-- =============================================================================
--  16. STORAGE — results-imports bucket'ı
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('results-imports','results-imports', false)
on conflict (id) do nothing;

-- Masa hakemi token ile yükleyebilir
drop policy if exists "results-imports: token ile yukleme" on storage.objects;
create policy "results-imports: token ile yukleme" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'results-imports'
    and exists (
      select 1 from public.import_tokens t
      where t.token = (storage.foldername(name))[1]
        and t.expires_at > now()
        and t.used_count <= t.max_uses
        and t.revoked_at is null
    )
  );

-- Panel yönetebilir
drop policy if exists "results-imports: staff yonetir" on storage.objects;
create policy "results-imports: staff yonetir" on storage.objects
  for all to authenticated
  using (bucket_id = 'results-imports' and public.is_staff())
  with check (bucket_id = 'results-imports' and public.is_staff());

-- Medya bucket'ı: herkese açık okuma, panel yazma
insert into storage.buckets (id, name, public)
values ('event-media','event-media', true)
on conflict (id) do nothing;

drop policy if exists "event-media: herkes okur" on storage.objects;
create policy "event-media: herkes okur" on storage.objects
  for select to anon, authenticated using (bucket_id = 'event-media');

drop policy if exists "event-media: yetkili yazar" on storage.objects;
create policy "event-media: yetkili yazar" on storage.objects
  for insert to authenticated with check (bucket_id = 'event-media' and public.is_staff());

drop policy if exists "event-media: yetkili siler" on storage.objects;
create policy "event-media: yetkili siler" on storage.objects
  for delete to authenticated using (bucket_id = 'event-media' and public.is_staff());


-- =============================================================================
--  BİTTİ
--  Sonraki adım: METAM4 RAR parser (Node/TS) + admin panel ekranları
-- =============================================================================
