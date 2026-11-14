-- =============================================================================
--  PANEL KURULUMU — Supabase SQL Editor'da TEK SEFER çalıştır
--  (Terminal: cat supabase/panel-setup.sql | pbcopy)
--
--  1) Rol yükseltme koruması (kullanıcı kendini staff yapamaz)
--  2) IS Group yetkilisini staff'a yükseltir
--  3) Gerçek ad / puan durumunu raporlar
-- =============================================================================

-- ---- 1) Rol koruma trigger'ı ---------------------------------------------
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

-- ---- 2) Yetkili hesabı staff yap ------------------------------------------
-- Not: auth.users'a kayit olan her kullanici icin profil satiri otomatik
-- olusur (handle_new_user trigger'i). Eski kayitlarda bu satir eksik
-- olabilir; o durumda auth.users'tan alinarak olusturulur.
insert into public.profiles (id, email, full_name, role)
select id, email, 'Selma Kara', 'staff'
from auth.users
where email = 'rainakara83@gmail.com'
on conflict (id) do update set role = 'staff';

-- ---- 3) Doğrulama raporu ----------------------------------------------------
select
  (select count(*) from public.profiles where role in ('staff','admin')) as staff_kullanici,
  (select count(*) from public.profiles)                              as toplam_profil,
  (select count(*) from auth.users)                                   as auth_kullanici,
  (select count(*) from public.performances)                          as performans,
  (select count(*) from public.performances where real_name is not null) as gercek_isimli,
  (select count(*) from public.performances where guest_number is not null) as guest_kayit,
  (select count(*) from public.performances where choreography_title is not null) as koreografi_kayit,
  (select count(*) from public.results)                               as sonuc,
  (select count(*) from public.judge_scores)                          as juri_puani,
  (select count(*) from public.events where status = 'published')      as yayindaki_etkinlik;
