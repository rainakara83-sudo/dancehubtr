import { getSupabasePublic } from "@/lib/supabase"

export type EventRow = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  city: string | null
  start_date: string
}

export type CategoryRow = {
  id: string
  event_id: string
  name: string
  title: string | null
  discipline: string | null
  display_order: number
}

export type ResultRow = {
  id: string
  performance_id: string
  round: string
  place: number | null
  place_label: string | null
  sum: number | null
  marks: string | null
  display_name: string
  choreography_title: string | null
  guest_number: number | null
  bib_number: number | null
  club_name: string | null
  event_category_id: string
}

export type ScoreRow = {
  result_id: string
  label: string
  full_name: string
  mark: number
}

export type EventResults = {
  events: EventRow[]
  selected: EventRow | null
  categories: CategoryRow[]
  results: ResultRow[]
  scores: ScoreRow[]
  resultCount: number
}

/**
 * Yayınlanmış etkinliklerin sonuçlarını okur.
 * Yalnızca public_* view'ları kullanılır -> gerçek isimler (real_name)
 * hiçbir koşulda dışarı çıkmaz.
 */
export async function getEventResults(slug?: string | null): Promise<EventResults> {
  const empty: EventResults = {
    events: [],
    selected: null,
    categories: [],
    results: [],
    scores: [],
    resultCount: 0
  }

  const supabase = getSupabasePublic()
  if (!supabase) return empty

  const { data: eventData } = await supabase
    .from("events")
    .select("id, slug, title, subtitle, city, start_date")
    .eq("status", "published")
    .order("start_date", { ascending: false })

  const events = (eventData ?? []) as EventRow[]
  if (!events.length) return empty

  const { data: catData } = await supabase
    .from("event_categories")
    .select("id, event_id, name, title, discipline, display_order")
    .in(
      "event_id",
      events.map((e) => e.id)
    )

  const allCategories = (catData ?? []) as CategoryRow[]
  const catIds = allCategories.map((c) => c.id)

  let allResults: ResultRow[] = []
  let allScores: ScoreRow[] = []
  if (catIds.length) {
    const [res, sc] = await Promise.all([
      supabase
        .from("public_results")
        .select(
          "id, performance_id, round, place, place_label, sum, marks, display_name, choreography_title, guest_number, bib_number, club_name, event_category_id"
        )
        .in("event_category_id", catIds),
      supabase
        .from("public_judge_scores")
        .select("result_id, label, full_name, mark")
        .in("event_category_id", catIds)
    ])
    allResults = (res.data ?? []) as ResultRow[]
    allScores = (sc.data ?? []) as ScoreRow[]
  }

  // Sonucu olan etkinlikler
  const withResults = new Set(
    allResults.map((r) => allCategories.find((c) => c.id === r.event_category_id)?.event_id)
  )
  const eventsWithResults = events.filter((e) => withResults.has(e.id))
  if (!eventsWithResults.length) return { ...empty, events }

  const selected = eventsWithResults.find((e) => e.slug === slug) ?? eventsWithResults[0]
  const categories = allCategories
    .filter((c) => c.event_id === selected.id)
    .sort((a, b) => a.display_order - b.display_order)

  return {
    events: eventsWithResults,
    selected,
    categories,
    results: allResults.filter((r) =>
      categories.some((c) => c.id === r.event_category_id)
    ),
    scores: allScores,
    resultCount: allResults.filter((r) =>
      allCategories.some(
        (c) => c.id === r.event_category_id && c.event_id === selected.id
      )
    ).length
  }
}

/**
 * METAM4'te iki farklı puanlama biçimi vardır:
 *  - PUAN veren disiplinler  : hücre "311" gibi  -> yüksek = iyi
 *  - SIRALAMA veren disiplinler: hücre "XXXXX 5 12222" gibi -> küçük = iyi
 * "marks" içindeki X/- deseni (jüri sıralama turları) ayrımı sağlar.
 */
export function isPlacementMode(rows: ResultRow[]): boolean {
  return rows.some((r) => !!r.marks && /[X-]/.test(r.marks))
}

/** Sonuçları sıraya göre sıralar (boş sıra en sona). */
export function sortByPlace(rows: ResultRow[]) {
  return [...rows].sort((a, b) => {
    const pa = a.place ?? Number.MAX_SAFE_INTEGER
    const pb = b.place ?? Number.MAX_SAFE_INTEGER
    if (pa !== pb) return pa - pb
    return (a.bib_number ?? 0) - (b.bib_number ?? 0)
  })
}
