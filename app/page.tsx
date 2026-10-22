import { site } from "../content/site"

export default function Home() {
  return (
    <main className="min-h-screen bg-ink text-bone">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(212,162,76,0.18),transparent)]" />
        <div className="relative mx-auto flex min-h-[85vh] max-w-5xl flex-col items-center justify-center px-6 py-24 text-center">
          <span className="mb-6 inline-block rounded-full border border-gold/40 px-4 py-1 text-xs uppercase tracking-[0.25em] text-gold">
            Çok yakında
          </span>
          <h1 className="font-display text-5xl font-bold leading-tight sm:text-7xl">
            Türkiye&apos;nin dans sahnesi
            <span className="block text-gold">tek adreste</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-bone/70">{site.tagline}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href={site.cta.primary.href}
              className="rounded-full bg-gold px-8 py-3 font-semibold text-ink transition hover:bg-bone"
            >
              {site.cta.primary.label}
            </a>
            <a
              href={site.cta.secondary.href}
              className="rounded-full border border-bone/30 px-8 py-3 font-semibold transition hover:border-gold hover:text-gold"
            >
              {site.cta.secondary.label}
            </a>
          </div>
        </div>
      </section>

      <section id="ozellikler" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Neler yapacağız</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {site.features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-bone/10 bg-bone/[0.03] p-6 transition hover:border-gold/40"
            >
              <h3 className="font-display text-xl font-semibold text-gold">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-bone/70">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-bone/10 bg-bone/[0.02]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Kimler için</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {site.who.map((w) => (
              <div key={w.role}>
                <div className="font-display text-lg font-semibold text-crimson">{w.role}</div>
                <p className="mt-2 text-sm leading-relaxed text-bone/70">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Erişim açılınca haber vereceğiz</h2>
        <p className="mx-auto mt-4 max-w-xl text-bone/70">
          Şimdilik kayıt formu kapalı. Açılıştan haberdar olmak istersen bize yaz.
        </p>
        <a
          href={`mailto:${site.contact}?subject=DanceHubTr — erişim açılışı`}
          className="mt-8 inline-block rounded-full border border-gold px-8 py-3 font-semibold text-gold transition hover:bg-gold hover:text-ink"
        >
          {site.contact}
        </a>
      </section>

      <footer className="border-t border-bone/10 py-10 text-center text-sm text-bone/40">
        © 2026 DanceHubTr · Türkiye
      </footer>
    </main>
  )
}
