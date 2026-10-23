import { site } from "../content/site"
import BeklemeFormu from "@/components/BeklemeFormu"

const NAV = [
  { label: "Yarışmalar", href: "#yarismalar" },
  { label: "Sonuçlar", href: "#sonuclar" },
  { label: "Galeri", href: "#galeri" },
  { label: "Hakkımızda", href: "#hakkimizda" }
]

const STATS = [
  { value: "40+", label: "Yarışma" },
  { value: "184", label: "Performans" },
  { value: "5", label: "Disiplin" },
  { value: "110", label: "Jüri" }
]

// Demo sonuç tablosu — gerçek METAM4 çıktısından türetildi
const SAMPLE_RESULTS = [
  { place: 1, name: "Gece", club: "IS Group", marks: [3, 1, 1], sum: 5 },
  { place: 2, name: "Guest 4", club: "Ferdi", marks: [1, 2, 2], sum: 5 },
  { place: 3, name: "Kayıp Balık Nemo", club: "Kolezyum", marks: [2, 3, 3], sum: 8 }
]

function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M4 19c3.5 0 5-2.2 5.5-5.2.3-1.9-.6-3.4-.6-5C8.9 6.4 10.6 4.6 13 4.6c2.9 0 5 2.2 5 5 0 4.3-3.3 7.2-7.4 7.2-2.5 0-4.6-1-6.6-1"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="display text-2xl tracking-tight text-navy">
        dancehub<span className="text-orange">.</span>
      </span>
    </span>
  )
}

export default function Home() {
  return (
    <main className="bg-paper text-ink">
      {/* ---------------- HEADER ---------------- */}
      <header className="sticky top-0 z-50 border-b border-navy/10 bg-white/90 backdrop-blur-md">
        <div className="shell flex h-16 items-center justify-between gap-6">
          <a href="#" aria-label="DanceHubTr ana sayfa">
            <Logo />
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-sm font-semibold text-navy/70 transition hover:text-orange"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a href={site.cta.secondary.href} className="btn-ghost hidden !px-5 !py-2.5 text-sm sm:inline-flex">
              {site.cta.secondary.label}
            </a>
            <a href={site.cta.primary.href} className="btn-primary !px-5 !py-2.5 text-sm">
              {site.cta.primary.label}
            </a>
          </div>
        </div>
      </header>

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

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <a href={site.cta.primary.href} className="btn-primary">
                  {site.cta.primary.label}
                  <span aria-hidden="true">→</span>
                </a>
                <a href={site.cta.secondary.href} className="btn-navy">
                  {site.cta.secondary.label}
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
                  <p className="display text-xl leading-[1.05] text-white sm:text-2xl">
                    yaklaşan
                    <br />
                    etkinlikler<span className="text-sun">.</span>
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                    IS GROUP PRESENTS
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
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">IS Group</p>
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

          {/* Sonuç tablosu — altta */}
          <div className="mt-8 overflow-hidden rounded-xl3 border border-navy/10 bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 bg-navy px-6 py-5">
              <div>
                <p className="display text-xl text-white">IS GROUP KIŞ LİGİ · FINAL</p>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                  Show Dance · Solo Kadın · Junior
                </p>
              </div>
              <span className="rounded-full bg-sun px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-navy">
                Yayında
              </span>
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
                    {["A", "B", "C"].map((j) => (
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
                  {SAMPLE_RESULTS.map((r) => (
                    <tr key={r.place} className="border-b border-navy/5 last:border-0 hover:bg-cream/60">
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
                          {r.place}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="display text-lg text-navy">{r.name}</p>
                      </td>
                      <td className="px-6 py-5 text-sm font-semibold text-navy/60">{r.club}</td>
                      {r.marks.map((m, i) => (
                        <td key={i} className="px-4 py-5 text-center">
                          <span
                            className={`inline-grid h-9 w-9 place-items-center rounded-lg text-sm font-bold ${
                              m === 1 ? "bg-orange text-white" : "bg-navy/10 text-navy/70"
                            }`}
                          >
                            {m}
                          </span>
                        </td>
                      ))}
                      <td className="px-6 py-5 text-right">
                        <span className="display text-2xl text-navy">{r.sum}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-navy/10 bg-cream px-6 py-4 text-xs text-muted">
              Jüri: GIZEM CEBI TOHMA (A) · SELCAN CARKER (B) · OLESIA DENIZ (C) — Başkan: AHMET FEVZI KAZAN
            </div>
          </div>
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

          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { h: "h-56", bg: "bg-navy", label: "Final" },
              { h: "h-40", bg: "bg-orange", label: "Show" },
              { h: "h-48", bg: "bg-sun", label: "Rehber" },
              { h: "h-64", bg: "bg-navy-deep", label: "Gece" }
            ].map((c, i) => (
              <div
                key={i}
                className={`group relative overflow-hidden rounded-xl2 ${c.h} ${c.bg} shadow-card`}
              >
                <div className="absolute inset-0 stripe-orange opacity-0 transition group-hover:opacity-100" />
                <div className="absolute inset-0 grid place-items-center">
                  <span className="display text-2xl text-white/90">{c.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Arşiv listesi — geriye doğru */}
          <div id="arsiv" className="mt-16 scroll-mt-24">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-navy/50">
              Arşiv
            </p>
            <ul className="mt-5 divide-y divide-navy/10 border-y border-navy/10">
              {site.gallery.archive.map((a, i) => (
                <li key={a}>
                  <a
                    href="#galeri"
                    className="group flex items-center justify-between gap-4 py-4 transition hover:bg-white/60"
                  >
                    <span className="display text-base text-navy sm:text-lg">{a}</span>
                    <span className="shrink-0 text-xs font-bold uppercase tracking-[0.15em] text-navy/35 transition group-hover:text-orange">
                      →
                    </span>
                  </a>
                </li>
              ))}
            </ul>
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
