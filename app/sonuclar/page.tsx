import Link from "next/link"
import { getEventResults, sortByPlace } from "@/lib/results"
import { SiteHeader } from "@/components/SiteHeader"

// Sonuçlar her yayında değişir -> her istekte taze çekilir
export const dynamic = "force-dynamic"

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

  const { events, selected, categories, results, scores, resultCount } =
    await getEventResults(wanted)

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

  if (!selected) return empty

  const scoresByResult = new Map<string, typeof scores>()
  for (const s of scores) {
    const list = scoresByResult.get(s.result_id) ?? []
    list.push(s)
    scoresByResult.set(s.result_id, list)
  }

  const judgesOf = (catId: string) => {
    const catResultIds = new Set(
      results.filter((r) => r.event_category_id === catId).map((r) => r.id)
    )
    const names = new Map<string, string>()
    for (const s of scores) {
      if (!catResultIds.has(s.result_id)) continue
      if (s.label && !names.has(s.label)) names.set(s.label, s.full_name)
    }
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
      {events.length > 1 && (
        <div className="border-b border-navy/10 bg-cream">
          <div className="shell flex flex-wrap items-center gap-3 py-5">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-navy/50">
              Yarışma
            </span>
            {events.map((e) => (
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
              {(() => {
                const sub = (selected.subtitle ?? "").trim()
                const city = (selected.city ?? "").trim()
                if (!sub) return city
                if (!city) return sub
                const norm = (t: string) =>
                  t.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]/g, "")
                return norm(sub).includes(norm(city)) ? sub : `${sub} · ${city}`
              })()}
            </p>
          </div>
          <p className="text-sm font-semibold text-navy/60">
            {resultCount} performans ·{" "}
            {categories.length} kategori
          </p>
        </div>

        {/* ---------------- KATEGORİLER ---------------- */}
        <div className="mt-10 space-y-10">
          {categories.map((cat) => {
            const catResults = sortByPlace(
              results.filter((r) => r.event_category_id === cat.id)
            )

            if (!catResults.length) return null

            const judges = judgesOf(cat.id)

            return (
              <div key={cat.id} className="notch-tr overflow-hidden rounded-xl2 border border-navy/10 bg-white shadow-card">
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

                {/* MOBİL: kart listesi (yatay kaydırma yok) */}
                <ul className="divide-y divide-navy/5 md:hidden">
                  {catResults.map((r) => {
                    const s = scoresByResult.get(r.id) ?? []
                    const byLabel = [...s].sort((a, b) =>
                      a.label.localeCompare(b.label)
                    )
                    return (
                      <li key={r.id} className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span className="display shrink-0 rounded-lg bg-orange px-2.5 py-1 text-base text-white">
                            {r.place_label ?? r.place ?? "—"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-semibold break-words text-navy">
                                {r.display_name}
                              </span>
                              {r.choreography_title && (
                                <span className="shrink-0 rounded-full bg-orange/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-orange">
                                  koreografi
                                </span>
                              )}
                              {r.round && r.round !== "Final" && (
                                <span className="text-xs text-navy/45">{r.round}</span>
                              )}
                            </div>
                            <p className="mt-1 text-xs break-words text-navy/60">
                              {r.club_name ?? "—"}
                            </p>
                            <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                              <p className="font-mono text-[0.7rem] text-navy/70">
                                {byLabel.length
                                  ? byLabel.map((j) => `${j.label} ${j.mark}`).join("  ·  ")
                                  : "—"}
                              </p>
                              <p className="display shrink-0 text-lg text-navy">
                                Toplam {r.sum ?? "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                {/* MASAÜSTÜ: tablo */}
                <div className="hidden overflow-x-auto md:block">
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
