-- =====================================================================
-- METAM4 JÜRI PUANI ONARIMI (Production)
-- ---------------------------------------------------------------------
-- Sorun: Ilk import'ta (a) "Adjudicator(s)" satirindaki A jurisi atlandigi
-- icin degerler bir kaymisti, (b) hucredeki "juri sayisi" rakami deger
-- sanildigi icin degerler kaymis, (c) "Toplam" METAM4'teki "Sum" sutunundan
-- (siralayan juri sayisi) alindiigi icin yanlisti.
--
-- KULLANIM: Bu dosyayi Supabase SQL Editor'a yapistirip Run'a basin.
-- (Sonuc: "sonuc | juri_puani | performans | kategori | toplam_uyusmazlik |
--   degeri_olmayan_sonuc" satiri gelir; toplam_uyusmazlik 0 olmalidir.)
--
-- Cozum: Ham "marks" metninden GERCEK degerler yeniden cikarilir.
--   "311"                    -> degerler = 311        (puan veren disiplin)
--   "XXXXX 5 12222"          -> degerler = 12222      (siralama)
--   "XXX 3 XXX 3 -XX 2 411"  -> degerler = 411        (cok turlu / son tur)
--   "XXX 3 XXX 3 --- 0"       -> degerler = YOK        (finale ulasmamis)
-- Kural: hucre basinda "desen + juri sayisi" gruplari varsa onlar silinir,
-- kalan saf rakamlar jurilerin A,B,C... sirasiyla degerleridir.
-- =====================================================================

begin;

-- 1) Mevcut puanlari, dogru juriye (A,B,C...) yeniden ata.
with vals as (
  select r.id as result_id,
         nullif(regexp_replace(coalesce(r.marks, ''), '^(?:[X-]+\s+\d+\s*)+', ''), '') as v
    from public.results r
),
ordered as (
  select v.result_id,
         v.v,
         js.id as score_id,
         row_number() over (partition by v.result_id order by j.label) as ord
    from vals v
    join public.judge_scores js on js.result_id = v.result_id
    join public.judges j on j.id = js.judge_id
   where v.v is not null
)
update public.judge_scores js
   set mark = substr(o.v, o.ord::int, 1)::numeric
  from ordered o
 where js.id = o.score_id
   and o.ord <= length(o.v);

-- 2) Gercek degeri olmayan sonuclar (finale ulasmamis) -> puanlarini sil.
delete from public.judge_scores js
  using public.results r
 where js.result_id = r.id
   and nullif(regexp_replace(coalesce(r.marks, ''), '^(?:[X-]+\s+\d+\s*)+', ''), '') is null;

-- 3) Toplamlari juri degerlerinin toplami olarak yeniden hesapla.
update public.results r
   set sum = coalesce(s.t, 0)
  from (select result_id, sum(mark) as t
          from public.judge_scores
         group by result_id) s
 where r.id = s.result_id;

-- 4) Toplami hicbir puani olmayan sonuclar (0) -> temizle.
update public.results r
   set sum = 0
 where not exists (select 1 from public.judge_scores js where js.result_id = r.id);

commit;

-- =====================================================================
-- DOGRULAMA (calistirip sonucu oku)
-- =====================================================================
select
  (select count(*) from public.results)                              as sonuc,
  (select count(*) from public.judge_scores)                         as juri_puani,
  (select count(*) from public.performances)                         as performans,
  (select count(distinct event_category_id) from public.judges)      as kategori,
  (select count(*) from (
      select r.id
        from public.results r
        join public.judge_scores js on js.result_id = r.id
       group by r.id, r.sum
      having sum(js.mark) is distinct from r.sum
   ) x)                                                               as toplam_uyusmazlik,
  (select count(*) from public.results r
     where nullif(regexp_replace(coalesce(r.marks,''), '^(?:[X-]+\s+\d+\s*)+', ''),'') is not null
       and not exists (select 1 from public.judge_scores js where js.result_id=r.id)
   )                                                                  as degeri_olmayan_sonuc;
