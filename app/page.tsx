import Link from "next/link"
import { site } from "../content/site"
import BeklemeFormu from "@/components/BeklemeFormu"
import { SiteHeader, Logo, NAV } from "@/components/SiteHeader"
import { getEventResults, sortByPlace } from "@/lib/results"

// Ana sayfa en fazla 5 dakikada bir yenilenir (sonuçlar değişebilir)
export const revalidate = 300

const STATS = [
  { value: "40+", label: "Yarışma" },
  { value: "184", label: "Performans" },
  { value: "5", label: "Disiplin" },
  { value: "110", label: "Jüri" }
]

export default async function Home() {
  const { selected, categories, results, scores } = await getEventResults()

  // Ana sayfadaki önizleme: en son yayınlanan yarışmanın ilk kategorisi
  const latest = (() => {
    if (!selected || !categories.length) return null
    // Sonucu olan ilk kategori (bazi kategorilerde sonuc olmayabilir)
    const cat =
      categories.find((c) => results.some((r) => r.event_category_id === c.id)) ??
      categories[0]
    const rows = sortByPlace(
      results.filter((r) => r.event_category_id === cat.id)
    ).slice(0, 3)
    if (!rows.length) return null
    const rowIds = new Set(rows.map((r) => r.id))
    const rel = scores.filter((s) => rowIds.has(s.result_id))
    const labels = [...new Set(rel.map((s) => s.label))].sort()
    const marks = new Map<string, Map<string, number>>()
    for (const r of rows) {
      const m = new Map<string, number>()
      for (const s of rel.filter((x) => x.result_id === r.id)) m.set(s.label, s.mark)
      marks.set(r.id, m)
    }
    const judges = [...new Map(rel.map((s) => [s.label, s.full_name])).entries()].sort(
      (a, b) => a[0].localeCompare(b[0])
    )
    return { event: selected, cat, rows, labels, marks, judges }
  })()

  return (
    <main className="bg-paper text-ink">
      {/* ---------------- HEADER ---------------- */}
      <SiteHeader />

      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-70" />
        <div className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-sun/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-orange/15 blur-3xl" />

        <div className="shell relative py-20 sm:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <h1 className="display mt-7 text-[clamp(3rem,10vw,7.5rem)] text-navy">
                Türkiye&apos;nin
                <br />
                <span className="highlight">dans sahnesi</span>
                <br />
                tek adreste
              </h1>

              <p className="display mt-8 text-2xl text-orange sm:text-3xl">{site.hero.lead}</p>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted text-pretty">
                {site.hero.body}
              </p>

              {/* SS2: butonlar yer değiştirdi — üstte Yarışmalar, altta Sonuç yükle */}
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <a href={site.cta.competitions.href} className="btn-primary">
                  {site.cta.competitions.label}
                  <span aria-hidden="true">→</span>
                </a>
                <a href={site.cta.upload.href} className="btn-navy">
                  {site.cta.upload.label}
                </a>
              </div>
            </div>

            {/* Görsel yerine grafik blok */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl3 bg-navy shadow-card">
                <div className="absolute inset-0 stripe-orange" />
                <div className="absolute inset-x-0 top-0 h-1/2 bg-orange" />
                <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border-[18px] border-sun/90" />
                <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                <div className="absolute bottom-0 inset-x-0 bg-navy/95 p-6">
                  {/* SS3: "IS GROUP PRESENTS" kaldırıldı */}
                  <p className="display text-xl leading-[1.05] text-white sm:text-2xl">
                    yaklaşan
                    <br />
                    etkinlikler<span className="text-sun">.</span>
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-7 -right-5 hidden rounded-xl2 bg-sun px-6 py-4 shadow-card sm:block">
                <p className="display text-3xl text-navy">2026</p>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-navy/60">sezon</p>
              </div>
            </div>
          </div>
        </div>

        {/* İstatistik şeridi */}
        <div className="relative border-y border-navy/10 bg-navy">
          <div className="shell py-10">
            <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-sun">
              Lansman Sezonu Verileri
            </p>
            <div className="mt-8 grid grid-cols-2 divide-navy/20 lg:grid-cols-4 lg:divide-x">
              {STATS.map((s) => (
                <div key={s.label} className="px-4 py-4 text-center">
                  <p className="display text-4xl text-sun sm:text-5xl">{s.value}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-white/55">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- TURUNCU BLOK ---------------- */}
      <section className="relative overflow-hidden bg-orange">
        <div className="absolute inset-0 stripe-orange opacity-60" />
        <div className="shell relative py-20">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              {/* SS4: "IS Group" üst başlığı kaldırıldı */}
              <h2 className="display mt-4 text-[clamp(2.5rem,7vw,5rem)] text-white">
                Sahne hazır.
                <br />
                <span className="text-sun">Sen gelsene.</span>
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:w-[30rem]">
              {site.pillars.map((p) => (
                <div key={p.title} className="rounded-xl2 bg-white p-5 shadow-card">
                  <p className="display text-lg text-navy">{p.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- PLATFORM ---------------- */}
      <section id="ozellikler" className="bg-cream py-24">
        <div className="shell">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange">Platform Rehberi</p>
            <h2 className="display mt-3 text-[clamp(2.25rem,6vw,4rem)] text-navy">Ne Sunuyoruz</h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {site.features.map((f, i) => {
              const accents = ["bg-orange", "bg-sun", "bg-navy"]
              return (
                <article key={f.title} className="card group hover:-translate-y-1.5">
                  <div className={`h-1.5 w-14 rounded-full ${accents[i % 3]}`} />
                  <h3 className="display mt-6 text-2xl text-navy">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{f.body}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------------- SONUÇLAR ---------------- */}
      <section id="sonuclar" className="bg-white py-24">
        <div className="shell">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange">Sonuçlar</p>
              <h2 className="display mt-3 text-[clamp(2.25rem,6vw,4rem)] text-navy">
                Her jüri puanı
                <br />
                <span className="highlight highlight-orange">açıkça</span> görünür
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted text-pretty">
                Masa hakemi yarışma bitiminde sonuçları yükler. Seyirci sırayı, toplamı ve
                hangi jüri kaç verdiğini tek ekranda görür. Dansçıların kimliği gizli kalır —
                sahnede <strong className="text-navy">koreografi adı</strong> ya da{" "}
                <strong className="text-navy">Guest N</strong> olarak anılır.
              </p>
            </div>
            <a href="#yarismalar" className="btn-ghost shrink-0">
              Tüm yarışmalar
            </a>
          </div>

          {/* Yarışmalar — üstte */}
          <div id="yarismalar" className="mt-14 scroll-mt-24">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-navy/50">
              Yarışmalar
            </p>
            <div className="mt-5 flex gap-4 overflow-x-auto pb-3">
              {site.competitions.map((c, i) => (
                <a
                  key={`${c.name}-${c.eps}-${i}`}
                  href="#sonuclar"
                  className={`min-w-[17rem] shrink-0 rounded-xl2 border p-5 shadow-card transition hover:-translate-y-1 ${
                    c.live
                      ? "border-orange/40 bg-orange/[0.06]"
                      : "border-navy/10 bg-white hover:border-navy/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.15em] ${
                        c.live ? "bg-orange text-white" : "bg-navy/10 text-navy/60"
                      }`}
                    >
                      {c.eps}
                    </span>
                    {c.live && (
                      <span className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-orange">
                        Yayında
                      </span>
                    )}
                  </div>
                  <p className="display mt-4 text-base leading-tight text-navy">{c.name}</p>
                  <p className="mt-3 text-xs font-semibold text-navy/55">
                    {c.date} · {c.city}
                  </p>
                </a>
              ))}
            </div>
          </div>

          {/* Sonuç tablosu — gerçek veriden */}
          {latest ? (
            <div className="mt-8 overflow-hidden rounded-xl3 border border-navy/10 bg-white shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 bg-navy px-6 py-5">
                <div>
                  <p className="display text-xl text-white">
                    {latest.event.title} · {latest.cat.title || latest.cat.name}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                    {latest.event.subtitle} · {latest.cat.discipline}
                  </p>
                </div>
                <Link
                  href="/sonuclar"
                  className="rounded-full bg-sun px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-navy transition hover:bg-sun-dark"
                >
                  Tüm sonuçlar
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[42rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-navy/10 bg-cream">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-navy/60">
                        Sıra
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-navy/60">
                        Performans
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-navy/60">
                        Kulüp
                      </th>
                      {latest.labels.map((j) => (
                        <th
                          key={j}
                          className="px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-navy/60"
                        >
                          {j}
                        </th>
                      ))}
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-[0.16em] text-navy/60">
                        Toplam
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest.rows.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-navy/5 last:border-0 hover:bg-cream/60"
                      >
                        <td className="px-6 py-5">
                          <span
                            className={`display grid h-10 w-10 place-items-center rounded-lg text-lg ${
                              r.place === 1
                                ? "bg-sun text-navy"
                                : r.place === 2
                                  ? "bg-navy/10 text-navy"
                                  : "bg-orange/20 text-orange-dark"
                            }`}
                          >
                            {r.place ?? "—"}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="display text-lg text-navy">{r.display_name}</p>
                          {r.choreography_title && (
                            <p className="mt-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-orange">
                              Koreografi adı
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-5 text-sm font-semibold text-navy/60">
                          {r.club_name ?? "—"}
                        </td>
                        {latest.labels.map((label) => {
                          const m = latest.marks.get(r.id)?.get(label)
                          return (
                            <td key={label} className="px-4 py-5 text-center">
                              <span
                                className={`inline-grid h-9 w-9 place-items-center rounded-lg text-sm font-bold ${
                                  m === 1
                                    ? "bg-orange text-white"
                                    : "bg-navy/10 text-navy/70"
                                }`}
                              >
                                {m ?? "—"}
                              </span>
                            </td>
                          )
                        })}
                        <td className="px-6 py-5 text-right">
                          <span className="display text-2xl text-navy">{r.sum ?? "—"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-navy/10 bg-cream px-6 py-4 text-xs text-muted">
                Jüri:{" "}
                {latest.judges.length
                  ? latest.judges.map(([label, full]) => `${full} (${label})`).join(" · ")
                  : "—"}
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-xl3 border border-navy/10 bg-white p-8 text-center shadow-card">
              <p className="display text-xl text-navy">Henüz yayınlanmış sonuç yok</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Yarışma bittiğinde masa hakemi sonuçları yükler; sonuçlar burada ve
                <Link href="/sonuclar" className="ml-1 font-semibold text-orange">
                  /sonuclar
                </Link>{" "}
                sayfasında yayınlanır.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- KİMLER İÇİN ---------------- */}
      <section id="hakkimizda" className="relative overflow-hidden bg-navy py-24">
        <div className="absolute inset-0 grid-lines opacity-[0.12]" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-96 w-96 rounded-full bg-orange/25 blur-3xl" />
        <div className="shell relative">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-sun">Kimler için</p>
            <h2 className="display mt-3 text-[clamp(2.25rem,6vw,4rem)] text-white">
              Herkes için
              <br />
              <span className="text-sun">bir yer.</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {site.who.map((w) => (
              <div
                key={w.role}
                className="rounded-xl2 border border-white/10 bg-white/[0.04] p-6 transition hover:border-sun/40 hover:bg-white/[0.07]"
              >
                <p className="display text-xl text-sun">{w.role}</p>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- GALERİ ---------------- */}
      <section id="galeri" className="bg-cream py-24">
        <div className="shell">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange">Galeri</p>
            <h2 className="display mt-3 text-[clamp(2.25rem,6vw,4rem)] text-navy">
              <span className="highlight">Sahnelerden</span>
              <br />
              kareler
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted text-pretty">{site.gallery.body}</p>
          </div>

          {/* SS7: kutucuklar organizasyon adlarını gösterir, en yeni en üstte */}
          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { h: "h-56", bg: "bg-navy", fg: "text-white/90" },
              { h: "h-40", bg: "bg-orange", fg: "text-white/95" },
              { h: "h-48", bg: "bg-sun", fg: "text-navy" },
              { h: "h-64", bg: "bg-navy-deep", fg: "text-white/90" }
            ].map((c, i) => (
              <div
                key={site.gallery.events[i]}
                className={`group relative overflow-hidden rounded-xl2 ${c.h} ${c.bg} shadow-card`}
              >
                <div className="absolute inset-0 stripe-orange opacity-0 transition group-hover:opacity-100" />
                <div className="absolute inset-0 grid place-items-center p-4">
                  <span className={`display text-center text-xl leading-tight sm:text-2xl ${c.fg}`}>
                    {site.gallery.events[i]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- ERKEN ERİŞİM / BEKLEME LİSTESİ ---------------- */}
      <section id="erken-erisim" className="bg-sun py-20">
        <div className="shell flex flex-col items-center text-center">
          <h2 className="display max-w-3xl text-[clamp(2.25rem,7vw,4.5rem)] text-navy">
            {site.waitlist.title}
          </h2>
          <p className="mt-5 max-w-xl text-lg text-navy/70">{site.waitlist.body}</p>
          <BeklemeFormu />
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="bg-navy-deep py-14">
        <div className="shell flex flex-col items-center justify-between gap-8 sm:flex-row">
          <Logo />
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-semibold text-white/50">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="transition hover:text-sun">
                {n.label}
              </a>
            ))}
          </div>
          <p className="text-sm text-white/35">{site.footer}</p>
        </div>
      </footer>
    </main>
  )
}
