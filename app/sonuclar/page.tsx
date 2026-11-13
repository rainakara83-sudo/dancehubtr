import Link from "next/link"
import { getSupabasePublic } from "@/lib/supabase"
import { SiteHeader } from "@/components/SiteHeader"

// Sonuçlar her yayında değişir -> her istekte taze çekilir
export const dynamic = "force-dynamic"

type EventRow = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  city: string | null
  start_date: string
}

type CategoryRow = {
  id: string
  event_id: string
  name: string
  title: string | null
  discipline: string | null
  display_order: number
}

type ResultRow = {
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

type ScoreRow = {
  result_id: string
  label: string
  full_name: string
  mark: number
}

function trDate(iso: string) {
  try {
    return new Date(iso + "T00:00:00Z").toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    })
  } catch {
    return iso
  }
}

export default async function SonuclarPage({
  searchParams
}: {
  searchParams: Promise<{ e?: string }>
}) {
  const { e: wanted } = await searchParams
  const supabase = getSupabasePublic()

  const empty = (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <div className="shell py-24 text-center">
        <h1 className="display text-4xl text-navy">Resmî Sonuçlar</h1>
        <p className="mx-auto mt-4 max-w-xl text-navy/70">
          Sonuçlar yarışma bittiğinde masa hakemi tarafından yüklenir ve burada
          yayınlanır.
        </p>
      </div>
    </main>
  )

  if (!supabase) return empty

  // 1) Yayınlanmış etkinlikler
  const { data: eventData } = await supabase
    .from("events")
    .select("id, slug, title, subtitle, city, start_date")
    .eq("status", "published")
    .order("start_date", { ascending: false })

  const events = (eventData ?? []) as EventRow[]
  if (!events.length) return empty

  // 2) Kategoriler
  const { data: catData } = await supabase
    .from("event_categories")
    .select("id, event_id, name, title, discipline, display_order")
    .in(
      "event_id",
      events.map((e) => e.id)
    )

  const categories = (catData ?? []) as CategoryRow[]
  const catIds = categories.map((c) => c.id)

  // 3) Sonuçlar + jüri puanları (public view'lar -> gerçek isimler dışarı çıkmaz)
  let results: ResultRow[] = []
  let scores: ScoreRow[] = []
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
    results = (res.data ?? []) as ResultRow[]
    scores = (sc.data ?? []) as ScoreRow[]
  }

  const resultCountByEvent = new Map<string, number>()
  for (const r of results) {
    const cat = categories.find((c) => c.id === r.event_category_id)
    if (!cat) continue
    resultCountByEvent.set(cat.event_id, (resultCountByEvent.get(cat.event_id) ?? 0) + 1)
  }

  // Sonucu olan etkinlikler
  const eventsWithResults = events.filter((e) => (resultCountByEvent.get(e.id) ?? 0) > 0)
  if (!eventsWithResults.length) return empty

  const selected =
    eventsWithResults.find((e) => e.slug === wanted) ?? eventsWithResults[0]

  const selCategories = categories
    .filter((c) => c.event_id === selected.id)
    .sort((a, b) => a.display_order - b.display_order)

  const scoresByResult = new Map<string, ScoreRow[]>()
  for (const s of scores) {
    const list = scoresByResult.get(s.result_id) ?? []
    list.push(s)
    scoresByResult.set(s.result_id, list)
  }

  const judgesOf = (catId: string) => {
    const names = new Map<string, string>()
    for (const s of scores) {
      if (s.label && !names.has(s.label)) names.set(s.label, s.full_name)
    }
    void catId
    return [...names.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }

  return (
    <main className="bg-paper text-ink">
      <SiteHeader />

      {/* ---------------- BAŞLIK ---------------- */}
      <section className="relative overflow-hidden border-b border-navy/10">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-70" />
        <div className="pointer-events-none absolute -right-32 -top-40 h-[26rem] w-[26rem] rounded-full bg-sun/30 blur-3xl" />

        <div className="shell relative py-16 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">
            Arşiv
          </p>
          <h1 className="display mt-3 text-4xl leading-tight text-navy sm:text-5xl">
            Resmî Sonuçlar
          </h1>
          <p className="mt-4 max-w-2xl text-navy/70">
            Her yarışmanın sonucu, jüri puanlarıyla birlikte. Kimliğin korunur:
            sitede koreografi adı ya da <strong>Guest N</strong> görünür, dansçı
            adları yalnızca masa hakemi panelinde saklanır.
          </p>
        </div>
      </section>

      {/* ---------------- ETKİNLİK SEÇİCİ ---------------- */}
      {eventsWithResults.length > 1 && (
        <div className="border-b border-navy/10 bg-cream">
          <div className="shell flex flex-wrap items-center gap-3 py-5">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-navy/50">
              Yarışma
            </span>
            {eventsWithResults.map((e) => (
              <Link
                key={e.id}
                href={`/sonuclar?e=${e.slug}`}
                className={
                  e.id === selected.id
                    ? "btn-primary !px-4 !py-2 text-sm"
                    : "btn-ghost !px-4 !py-2 text-sm"
                }
              >
                {e.title}
                <span className="ml-2 opacity-60">{trDate(e.start_date)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- ETKİNLİK BAŞLIĞI ---------------- */}
      <section className="shell py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-navy/10 pb-6">
          <div>
            <h2 className="display text-3xl text-navy">{selected.title}</h2>
            <p className="mt-1 text-sm text-navy/60">
              {[selected.subtitle, selected.city].filter(Boolean).join(" · ")}
            </p>
          </div>
          <p className="text-sm font-semibold text-navy/60">
            {resultCountByEvent.get(selected.id) ?? 0} performans ·{" "}
            {selCategories.length} kategori
          </p>
        </div>

        {/* ---------------- KATEGORİLER ---------------- */}
        <div className="mt-10 space-y-10">
          {selCategories.map((cat) => {
            const catResults = results
              .filter((r) => r.event_category_id === cat.id)
              .sort((a, b) => {
                const pa = a.place ?? Number.MAX_SAFE_INTEGER
                const pb = b.place ?? Number.MAX_SAFE_INTEGER
                if (pa !== pb) return pa - pb
                return (a.bib_number ?? 0) - (b.bib_number ?? 0)
              })

            if (!catResults.length) return null

            const judges = judgesOf(cat.id)

            return (
              <div key={cat.id} className="notch overflow-hidden rounded-xl2 border border-navy/10 bg-white shadow-card">
                <div className="border-b border-navy/10 bg-cream px-6 py-5">
                  <h3 className="display text-xl text-navy">
                    {cat.title || cat.name}
                  </h3>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-navy/45">
                    {cat.name !== cat.title ? cat.name : ""}
                    {cat.discipline ? ` · ${cat.discipline}` : ""}
                  </p>
                  {judges.length > 0 && (
                    <p className="mt-3 text-xs text-navy/60">
                      <span className="font-bold uppercase tracking-[0.12em] text-orange">
                        Jüri
                      </span>{" "}
                      {judges.map(([label, full]) => `${label}: ${full}`).join(" · ")}
                    </p>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[38rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-navy/10 text-[0.65rem] uppercase tracking-[0.15em] text-navy/50">
                        <th className="px-6 py-3">Sıra</th>
                        <th className="px-6 py-3">Performans</th>
                        <th className="px-6 py-3">Kulüp</th>
                        <th className="px-6 py-3">Jüri Puanları</th>
                        <th className="px-6 py-3 text-right">Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catResults.map((r) => {
                        const s = scoresByResult.get(r.id) ?? []
                        const byLabel = [...s].sort((a, b) =>
                          a.label.localeCompare(b.label)
                        )
                        return (
                          <tr
                            key={r.id}
                            className="border-b border-navy/5 transition hover:bg-cream/60"
                          >
                            <td className="px-6 py-3">
                              <span className="display text-lg text-orange">
                                {r.place_label ?? r.place ?? "—"}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <span className="font-semibold text-navy">
                                {r.display_name}
                              </span>
                              {r.choreography_title && (
                                <span className="ml-2 rounded-full bg-orange/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-orange">
                                  koreografi
                                </span>
                              )}
                              {r.round && r.round !== "Final" && (
                                <span className="ml-2 text-xs text-navy/45">
                                  {r.round}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-navy/60">
                              {r.club_name ?? "—"}
                            </td>
                            <td className="px-6 py-3">
                              {byLabel.length ? (
                                <span className="font-mono text-xs text-navy/70">
                                  {byLabel
                                    .map((j) => `${j.label} ${j.mark}`)
                                    .join("  ·  ")}
                                </span>
                              ) : (
                                <span className="text-xs text-navy/40">—</span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-right font-semibold text-navy">
                              {r.sum ?? "—"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-12 text-xs leading-relaxed text-navy/45">
          Sonuçlar yarışma sonunda masa hakemi tarafından yüklenen METAM4
          çıktısından oluşur. Jüri puanları her jüri için ayrı ayrı gösterilir.
          Dansçı adları gizlilik gereği herkese açık sayfalarda yer almaz.
        </p>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="border-t border-navy/10 bg-cream py-10">
        <div className="shell flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-semibold text-navy/60">dancehub.</p>
          <Link href="/" className="text-sm font-semibold text-navy/60 transition hover:text-orange">
            Ana sayfa
          </Link>
        </div>
      </footer>
    </main>
  )
}
