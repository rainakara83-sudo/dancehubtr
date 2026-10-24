-- =============================================================================
--  METAM4 IMPORT FONKSİYONU
--  Parser'ın ürettiği JSON'u platform tablolarına yazar.
--
--  Kimlik kuralı (IS Group iş akışı):
--    METAM4 "Name" alanı = koreografi adı  ->  performanslar.choreography_title
--    METAM4 "Name" alanı boşsa               ->  otomatik "Guest N" atanır
--    Gerçek dansçı adı (real_name) panelde sonradan girilebilir, GİZLİ kalır.
--
--  Kullanım:
--    select public.apply_metam4_import('<import_id>', '<parsed_json>'::jsonb);
-- =============================================================================

create or replace function public.apply_metam4_import(
  p_event_id   uuid,
  p_payload    jsonb,
  p_import_id  uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_discipline text;
  v_discipline_obj jsonb;
  v_node_key   text;
  v_node       jsonb;
  v_category   uuid;
  v_event      uuid;
  v_judge      uuid;
  v_perf       uuid;
  v_result     uuid;
  v_club       uuid;
  v_guest_no   int := 0;
  v_label      text;
  v_full_name  text;
  v_judge_id   uuid;
  v_mark       numeric;
  v_bib        int;
  v_name       text;
  v_club_name  text;
  v_round      text;
  v_marks      text;
  v_sum        numeric;
  v_place      int;
  v_counter    int := 0;
  v_perf_count int := 0;
  v_cat_count  int := 0;
  v_judge_count int := 0;
  v_score_count int := 0;
  v_judge_labels text[];
  v_judge_mark  numeric[];
  v_k          int;
  v_perf_map   jsonb := '{}'::jsonb;
  v_perf_json  jsonb;
  v_ev_slug    citext;
  v_ev_title   text;
  v_discipline_slug text;
begin
  -- service_role (sunucu tarafi API) doğrudan geçer; kullanıcı token'ı için yetki kontrolü yapılır.
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    if not public.is_staff() and not public.can_edit_event(p_event_id) then
      raise exception 'Yetkin yok';
    end if;
  end if;

  select e.slug, e.title into v_ev_slug, v_ev_title
    from public.events e where e.id = p_event_id;
  if v_ev_slug is null then raise exception 'Etkinlik bulunamadi: %', p_event_id; end if;

  -- ---------------------------------------------------------------------------
  -- Her disiplin/numara çifti bir "kategori" olur
  -- ---------------------------------------------------------------------------
  for v_discipline, v_discipline_obj in
    select d.key, d.value from jsonb_each(p_payload->'disciplines') d
  loop
    for v_node_key, v_node in
      select n.key, n.value from jsonb_each(v_discipline_obj) n
    loop
      v_cat_count := v_cat_count + 1;

      v_discipline_slug := regexp_replace(lower(v_discipline), '[^a-z0-9]+', '-', 'g');

      insert into public.event_categories (event_id, name, title, discipline, display_order)
      values (
        p_event_id,
        coalesce(v_node#>>'{meta,competition}', v_node#>>'{meta,title}', v_node_key),
        v_node#>>'{meta,title}',
        v_discipline_slug,
        v_cat_count
      )
      on conflict do nothing;

      select id into v_category from public.event_categories
       where event_id = p_event_id
         and name = coalesce(v_node#>>'{meta,competition}', v_node#>>'{meta,title}', v_node_key)
         and discipline = v_discipline_slug
       order by display_order desc
       limit 1;

      if v_category is null then continue; end if;

      -- -----------------------------------------------------------------------
      -- JÜRİLER
      -- -----------------------------------------------------------------------
      for v_label, v_full_name in
        select j->>'label', j->>'full_name'
          from jsonb_array_elements(coalesce(v_node->'judges','[]'::jsonb)) j
      loop
        insert into public.judges (event_id, event_category_id, label, full_name, role)
        values (p_event_id, v_category, v_label, v_full_name, 'adjudicator')
        on conflict (event_category_id, label) do update set full_name = excluded.full_name;
        v_judge_count := v_judge_count + 1;
      end loop;

      -- -----------------------------------------------------------------------
      -- PERFORMANSLAR (koreografi adı veya Guest N)
      -- -----------------------------------------------------------------------
      v_guest_no := 0;
      v_perf_map := '{}'::jsonb;

      for v_perf_json in
        select p
          from jsonb_array_elements(coalesce(v_node->'performances','[]'::jsonb)) p
          order by (p->>'place') nulls last, (p->>'bib_number')
      loop
        v_bib       := (v_perf_json->>'bib_number')::int;
        v_name      := nullif(trim(v_perf_json->>'name'), '');
        v_club_name := nullif(trim(v_perf_json->>'club'), '');
        v_round     := coalesce(nullif(v_perf_json->>'round',''), 'Final');
        v_marks     := nullif(v_perf_json->>'marks', '');
        v_sum       := (v_perf_json->>'sum')::numeric;
        v_place     := (v_perf_json->>'place')::int;
        v_counter := v_counter + 1;

        -- Kulüp: yoksa organizatör (IS Group) atanır
        if v_club_name is not null then
          insert into public.clubs (name, slug, accreditation)
          values (v_club_name, regexp_replace(lower(v_club_name), '[^a-z0-9]+', '-', 'g'), 'accredited')
          on conflict (slug) do update set name = excluded.name
          returning id into v_club;
        else
          select id into v_club from public.clubs where is_organizer limit 1;
        end if;

        -- Koreografi adı yoksa Guest N
        if v_name is null then
          v_guest_no := v_guest_no + 1;
        end if;

        insert into public.performances (
          event_category_id, club_id, bib_number,
          choreography_title, guest_number, is_guest
        )
        values (
          v_category, v_club, v_bib,
          v_name, case when v_name is null then v_guest_no else null end,
          (v_name is null)
        )
        returning id into v_perf;

        v_perf_map := v_perf_map || jsonb_build_object(v_bib::text, v_perf::text);
        v_perf_count := v_perf_count + 1;

        -- ---------------------------------------------------------------------
        -- SONUÇ
        -- ---------------------------------------------------------------------
        insert into public.results (performance_id, round, place, sum, marks)
        values (v_perf, v_round, v_place, v_sum, v_marks)
        on conflict (performance_id, round) do update
          set place = excluded.place, sum = excluded.sum, marks = excluded.marks
        returning id into v_result;

        -- ---------------------------------------------------------------------
        -- JÜRİ PUNANLARI (marks: "311" -> A=3 B=1 C=1)
        -- ---------------------------------------------------------------------
        select array_agg(x.judge_json->>'label' order by x.judge_json->>'label'),
               array_agg((v_perf_json->'judge_marks'->>((x.idx-1)::int))::numeric order by x.judge_json->>'label')
          into v_judge_labels, v_judge_mark
          from jsonb_array_elements(coalesce(v_node->'judges','[]'::jsonb))
               with ordinality as x(judge_json, idx)
          where (v_perf_json->'judge_marks'->>((x.idx-1)::int)) is not null;

        if v_judge_labels is not null then
          for v_k in 1 .. array_length(v_judge_labels, 1) loop
            v_label := v_judge_labels[v_k];
            v_mark := v_judge_mark[v_k];

            select id into v_judge_id from public.judges
             where event_category_id = v_category and label = v_label;

            if v_judge_id is not null then
              insert into public.judge_scores (result_id, judge_id, mark)
              values (v_result, v_judge_id, v_mark)
              on conflict (result_id, judge_id) do update set mark = excluded.mark;
              v_score_count := v_score_count + 1;
            end if;
          end loop;
        end if;
      end loop;
    end loop;
  end loop;

  -- Etkinlik bilgisini güncelle
  update public.events
     set source = 'metam4',
         source_ref = p_payload#>>'{stats,source_ref}',
         city = coalesce(city, (select j.val->>'place' from jsonb_path_query(
             p_payload, '$.disciplines.**.meta.place') as j(val) limit 1))
   where id = p_event_id;

  -- Import durumunu güncelle
  if p_import_id is not null then
    update public.imports
       set status = 'parsed',
           stats = jsonb_build_object(
             'categories', v_cat_count,
             'performances', v_perf_count,
             'judges', v_judge_count,
             'judge_scores', v_score_count
           )
     where id = p_import_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'event_id', p_event_id,
    'categories', v_cat_count,
    'performances', v_perf_count,
    'judges', v_judge_count,
    'judge_scores', v_score_count
  );
end;
$$;

grant execute on function public.apply_metam4_import(uuid, jsonb, uuid) to authenticated;


-- =============================================================================
--  ÖRNEK KULLANIM
--  1) Parser çıktısını kaydet:
--       node scripts/parse-metam4.mjs upload.rar > parsed.json
--  2) Import kaydı oluştur (panel üzerinden de yapılabilir)
--  3) Uygula:
--       select public.apply_metam4_import(
--         '<event_id>'::uuid,
--         pg_read_file('/tmp/parsed.json')::jsonb,   -- ya da parametre olarak
--         '<import_id>'::uuid
--       );
-- =============================================================================
