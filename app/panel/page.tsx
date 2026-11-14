"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase"
import { SiteHeader } from "@/components/SiteHeader"
import {
  PanelCategory,
  PanelClub,
  PanelEvent,
  PanelJudge,
  PanelPerformance,
  PanelResult,
  PanelScore,
  byPlace,
  categoryLabel,
  checkMarks,
  formatDate,
  nextGuestNumber
} from "@/lib/panel"

type Phase = "loading" | "unauth" | "forbidden" | "ready" | "error"

const EMPTY_CHECK = {
  sumFromMarks: null,
  storedSum: null,
  hasMarks: false,
  consistent: false,
  issue: "Sonuç satırı yok"
}

export default function PanelPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("loading")
  const [msg, setMsg] = useState("")
  const [email, setEmail] = useState("")

  const [events, setEvents] = useState<PanelEvent[]>([])
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({})
  const [eventId, setEventId] = useState<string>("")
  const [categories, setCategories] = useState<PanelCategory[]>([])
  const [catId, setCatId] = useState<string>("")
  const [performances, setPerformances] = useState<PanelPerformance[]>([])
  const [results, setResults] = useState<PanelResult[]>([])
  const [scores, setScores] = useState<PanelScore[]>([])
  const [judges, setJudges] = useState<PanelJudge[]>([])
  const [clubs, setClubs] = useState<PanelClub[]>([])

  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [editing, setEditing] = useState<PanelPerformance | null>(null)

  /* ---------------- oturum + yetki ---------------- */
  useEffect(() => {
    let alive = true
    const boot = async () => {
      if (!isSupabaseConfigured) {
        if (alive) {
          setPhase("error")
          setMsg("Supabase ortam değişkenleri eksik.")
        }
        return
      }
      const sb = getSupabaseBrowser()
      if (!sb) {
        if (alive) {
          setPhase("error")
          setMsg("Supabase bağlantısı kurulamadı.")
        }
        return
      }
      const { data } = await sb.auth.getSession()
      const user = data.session?.user
      if (!user) {
        if (alive) {
          setPhase("unauth")
          router.replace("/giris")
        }
        return
      }
      if (alive) setEmail(user.email ?? "")
      const { data: prof } = await sb
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()
      const role = (prof as { role?: string } | null)?.role ?? "user"
      if (role !== "staff" && role !== "admin") {
        if (alive) {
          setPhase("forbidden")
          setMsg(`Bu panel için staff yetkisi gerekir. Mevcut rolünüz: ${role}`)
        }
        return
      }

      const { data: evs } = await sb
        .from("events")
        .select("id,title,slug,city,start_date,status")
        .order("start_date", { ascending: false })
      const { data: cl } = await sb.from("clubs").select("id,name").order("name")

      // Etkinlik basina performans sayisi: verisi olan etkinligi one cikar,
      // dropdown'da goster (bos yeni etkinlik otomatik secilmesin).
      const { data: allCats } = await sb
        .from("event_categories")
        .select("id,event_id")
      const { data: allPerf } = await sb
        .from("performances")
        .select("id,event_category_id")
      const catEvent = new Map<string, string>(
        ((allCats as { id: string; event_id: string }[]) ?? []).map((c) => [
          c.id,
          c.event_id
        ])
      )
      const counts: Record<string, number> = {}
      for (const p of (allPerf as { id: string; event_category_id: string }[]) ??
        []) {
        const eid = catEvent.get(p.event_category_id)
        if (eid) counts[eid] = (counts[eid] ?? 0) + 1
      }

      const list = ((evs as PanelEvent[]) ?? []).slice().sort((a, b) => {
        const d = (counts[b.id] ?? 0) - (counts[a.id] ?? 0)
        if (d !== 0) return d
        return (
          new Date(b.start_date ?? 0).getTime() -
          new Date(a.start_date ?? 0).getTime()
        )
      })

      if (!alive) return
      setEvents(list)
      setEventCounts(counts)
      setClubs((cl as PanelClub[]) ?? [])
      setPhase("ready")
      if (list[0]) setEventId(list[0].id)
    }
    boot()
    return () => {
      alive = false
    }
  }, [router])

  /* ---------------- etkinlik verisini çek ---------------- */
  const loadEvent = useCallback(async (id: string) => {
    if (!id) return
    setLoading(true)
    setNote(null)
    const sb = getSupabaseBrowser()
    if (!sb) return
    const { data: cats } = await sb
      .from("event_categories")
      .select("id,event_id,name,title,display_order")
      .eq("event_id", id)
      .order("display_order", { ascending: true })
    const list = (cats as PanelCategory[]) ?? []
    setCategories(list)
    const ids = list.map((c) => c.id)
    if (!ids.length) {
      setPerformances([])
      setResults([])
      setScores([])
      setJudges([])
      setCatId("")
      setLoading(false)
      return
    }
    const [pRes, rRes, sRes, jRes] = await Promise.all([
      sb
        .from("performances")
        .select(
          "id,event_category_id,real_name,choreography_title,guest_number,is_guest,bib_number,club_id,display_name"
        )
        .in("event_category_id", ids),
      sb
        .from("public_results")
        .select("id,performance_id,place,place_label,sum,round,event_category_id")
        .in("event_category_id", ids),
      sb
        .from("public_judge_scores")
        .select("id,result_id,judge_id,mark,event_category_id")
        .in("event_category_id", ids),
      sb
        .from("judges")
        .select("id,event_category_id,label,full_name")
        .in("event_category_id", ids)
    ])
    setPerformances((pRes.data as PanelPerformance[]) ?? [])
    setResults((rRes.data as PanelResult[]) ?? [])
    setScores((sRes.data as PanelScore[]) ?? [])
    setJudges((jRes.data as PanelJudge[]) ?? [])
    const firstWithResult = list.find((c) =>
      ((rRes.data as PanelResult[]) ?? []).some((r) => r.event_category_id === c.id)
    )
    setCatId((firstWithResult ?? list[0]).id)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (phase === "ready" && eventId) loadEvent(eventId)
  }, [phase, eventId, loadEvent])

  /* ---------------- türetilmiş veri ---------------- */
  const cat = categories.find((c) => c.id === catId) ?? null
  const catJudges = useMemo(
    () =>
      judges
        .filter((j) => j.event_category_id === catId)
        .sort((a, b) => a.label.localeCompare(b.label, "tr")),
    [judges, catId]
  )
  const catPerf = useMemo(
    () => performances.filter((p) => p.event_category_id === catId),
    [performances, catId]
  )
  const rows = useMemo(() => {
    const byPerf = new Map(results.map((r) => [r.performance_id, r]))
    return catPerf
      .map((p) => ({
        perf: p,
        result: byPerf.get(p.id),
        scores: scores.filter((s) => s.result_id === byPerf.get(p.id)?.id)
      }))
      .sort((a, b) =>
        byPlace(
          { place: a.result?.place ?? null, bib_number: a.perf.bib_number ?? null },
          { place: b.result?.place ?? null, bib_number: b.perf.bib_number ?? null }
        )
      )
  }, [catPerf, results, scores])

  const stats = useMemo(() => {
    const all = performances.map((p) => {
      const r = results.find((x) => x.performance_id === p.id)
      const sc = scores.filter((s) => s.result_id === r?.id)
      return { p, r, check: checkMarks(r, sc) }
    })
    return {
      performances: all.length,
      results: all.filter((x) => x.r).length,
      scores: scores.length,
      inconsistent: all.filter((x) => x.check.issue && x.check.issue !== "Sonuç satırı yok")
        .length,
      noResult: all.filter((x) => !x.r).length,
      noRealName: all.filter((x) => !x.p.real_name).length
    }
  }, [performances, results, scores])

  /* ---------------- düzenleme ---------------- */
  const save = async (
    id: string,
    patch: Record<string, unknown>,
    okText: string
  ): Promise<boolean> => {
    const sb = getSupabaseBrowser()
    if (!sb) return false
    const { error } = await sb.from("performances").update(patch).eq("id", id)
    if (error) {
      setNote({ kind: "err", text: `Kaydedilemedi: ${error.message}` })
      return false
    }
    setPerformances((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const merged = { ...p, ...(patch as Partial<PanelPerformance>) }
        const display =
          patch.guest_number !== undefined
            ? `Guest ${patch.guest_number as number}`
            : patch.choreography_title !== undefined
              ? ((patch.choreography_title as string) || "Guest")
              : p.display_name
        return { ...merged, display_name: display }
      })
    )
    setNote({ kind: "ok", text: okText })
    setEditing((cur) =>
      cur && cur.id === id ? { ...cur, ...(patch as Partial<PanelPerformance>) } : cur
    )
    return true
  }

  /* ---------------- çıkış ---------------- */
  const logout = async () => {
    const sb = getSupabaseBrowser()
    await sb?.auth.signOut()
    router.replace("/giris")
  }

  /* ---------------- ekranlar ---------------- */
  if (phase === "loading") {
    return (
      <main className="min-h-screen bg-cream">
        <SiteHeader />
        <div className="shell py-24 text-center text-muted">Panel yükleniyor…</div>
      </main>
    )
  }

  if (phase === "unauth") {
    return (
      <main className="min-h-screen bg-cream">
        <SiteHeader />
        <div className="shell py-24 text-center text-muted">
          Giriş yapmanız gerekiyor. Giriş sayfasına yönlendiriliyorsunuz…
        </div>
      </main>
    )
  }

  if (phase === "forbidden" || phase === "error") {
    return (
      <main className="min-h-screen bg-cream">
        <SiteHeader />
        <div className="shell py-24">
          <div className="card mx-auto max-w-xl p-8 text-center">
            <h1 className="display text-3xl text-navy">Erişim yok</h1>
            <p className="mt-3 text-sm text-muted">{msg}</p>
            <div className="mt-6 flex justify-center gap-3">
              <a href="/" className="btn-ghost">
                Ana sayfa
              </a>
              <button onClick={logout} className="btn-navy">
                Çıkış yap
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const ev = events.find((e) => e.id === eventId) ?? null

  return (
    <main className="min-h-screen bg-cream">
      <SiteHeader />

      {/* panel başlığı */}
      <section className="bg-navy text-white">
        <div className="shell flex flex-wrap items-center justify-between gap-4 py-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-sun">IS GROUP · İÇ PANEL</p>
            <h1 className="display text-3xl sm:text-4xl">Jüri &amp; Masa Hakemi Paneli</h1>
            <p className="mt-1 text-sm text-white/60">
              Gerçek ad eşleme · puan kontrolü · yayınlanan kimlik yönetimi
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white/10 px-4 py-2 text-xs text-white/70">
              {email}
            </span>
            <button onClick={logout} className="btn-ghost !border-white/30 !text-white">
              Çıkış yap
            </button>
          </div>
        </div>
      </section>

      <div className="shell py-8">
        {/* etkinlik seçici */}
        <div className="card flex flex-wrap items-center gap-4 p-5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted">
            Etkinlik
          </label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="min-w-[280px] flex-1 rounded-xl border border-navy/15 bg-white px-4 py-2.5 text-sm font-semibold text-navy outline-none focus:border-orange"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} · {formatDate(e.start_date)} · {e.city ?? "—"} ·{" "}
                {eventCounts[e.id] ?? 0} performans ·{" "}
                {e.status === "published" ? "YAYINDA" : "TASLAK"}
              </option>
            ))}
          </select>
          {ev && (
            <span className="rounded-full bg-orange/10 px-3 py-1.5 text-xs font-bold text-orange-dark">
              {ev.status === "published" ? "YAYINDA" : "TASLAK"}
            </span>
          )}
        </div>

        {/* özet */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Kategori" value={categories.length} />
          <Stat label="Performans" value={stats.performances} />
          <Stat label="Sonuç" value={stats.results} />
          <Stat label="Jüri puanı" value={stats.scores} />
          <Stat
            label="⚠ Puan uyuşmazlığı"
            value={stats.inconsistent}
            tone={stats.inconsistent ? "warn" : "ok"}
          />
          <Stat
            label="Sonuçsuz kayıt"
            value={stats.noResult}
            tone={stats.noResult ? "warn" : "ok"}
          />
        </div>

        {note && (
          <div
            className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
              note.kind === "ok"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {note.text}
          </div>
        )}

        {/* kategori + tablo */}
        <div className="mt-6 grid gap-5 lg:grid-cols-[300px_1fr]">
          <aside className="card max-h-[70vh] overflow-y-auto p-3">
            <p className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-muted">
              Kategoriler ({categories.length})
            </p>
            <ul className="space-y-0.5">
              {categories.map((c) => {
                const n = performances.filter(
                  (p) => p.event_category_id === c.id
                ).length
                const active = c.id === catId
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setCatId(c.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                        active
                          ? "bg-navy text-white"
                          : "text-navy/70 hover:bg-cream"
                      }`}
                    >
                      <span className="truncate">{categoryLabel(c)}</span>
                      <span className={active ? "text-white/60" : "text-muted"}>{n}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 bg-cream/60 px-5 py-4">
              <div>
                <h2 className="display text-xl text-navy">
                  {cat ? categoryLabel(cat) : "Kategori seçin"}
                </h2>
                <p className="text-xs text-muted">
                  {catJudges.length
                    ? `Jüri: ${catJudges
                        .map((j) => `${j.label} — ${j.full_name}`)
                        .join(" · ")}`
                    : "Bu kategoride jüri kaydı yok"}
                </p>
              </div>
              <span className="rounded-full bg-navy px-3 py-1 text-xs font-bold text-white">
                {rows.length} performans
              </span>
            </div>

            {loading ? (
              <div className="p-10 text-center text-sm text-muted">Yükleniyor…</div>
            ) : !rows.length ? (
              <div className="p-10 text-center text-sm text-muted">
                Bu kategoride performans yok.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-navy/10 text-[11px] uppercase tracking-wider text-muted">
                      <th className="px-4 py-3">Sıra</th>
                      <th className="px-4 py-3">Sitede görünecek</th>
                      <th className="bg-sun/20 px-4 py-3 text-navy">
                        Gerçek ad <span className="text-orange">(gizli)</span>
                      </th>
                      <th className="px-4 py-3">Kulüp</th>
                      <th className="px-4 py-3">No</th>
                      {catJudges.map((j) => (
                        <th key={j.id} className="px-3 py-3 text-center">
                          {j.label}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center">Toplam</th>
                      <th className="px-4 py-3">Durum</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ perf, result, scores: sc }) => {
                      const check = checkMarks(result, sc)
                      const markOf = (judgeId: string) =>
                        sc.find((s) => s.judge_id === judgeId)?.mark ?? null
                      return (
                        <tr
                          key={perf.id}
                          className="border-b border-navy/5 align-middle hover:bg-cream/50"
                        >
                          <td className="px-4 py-3 font-bold text-navy">
                            {result?.place_label ?? result?.place ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-navy">
                            {perf.guest_number !== null ? (
                              <span className="rounded-md bg-navy/5 px-2 py-1 text-xs">
                                Guest {perf.guest_number}
                              </span>
                            ) : (
                              <span className="rounded-md bg-orange/10 px-2 py-1 text-xs text-orange-dark">
                                {perf.choreography_title || "—"}
                              </span>
                            )}
                          </td>
                          <td className="bg-sun/10 px-4 py-3 font-semibold text-navy">
                            {perf.real_name || (
                              <span className="text-xs font-normal text-muted">
                                isim yok
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-navy/70">
                            {clubs.find((c) => c.id === perf.club_id)?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted">
                            {perf.bib_number ?? "—"}
                          </td>
                          {catJudges.map((j) => (
                            <td
                              key={j.id}
                              className="px-3 py-3 text-center font-bold text-navy"
                            >
                              {markOf(j.id) ?? "—"}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center font-bold text-navy">
                            {result?.sum ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            {check.consistent ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                                ✓ tutarlı
                              </span>
                            ) : (
                              <span
                                className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800"
                                title={check.issue ?? ""}
                              >
                                ! {check.issue}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setEditing(perf)}
                              className="rounded-lg border border-navy/15 px-3 py-1.5 text-xs font-bold text-navy transition hover:border-orange hover:text-orange"
                            >
                              Düzenle
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      {editing && (
        <EditDrawer
          perf={editing}
          clubs={clubs}
          judges={catJudges}
          scores={scores.filter((s) => s.result_id === results.find((r) => r.performance_id === editing.id)?.id)}
          result={results.find((r) => r.performance_id === editing.id)}
          nextGuest={nextGuestNumber(performances, editing.event_category_id)}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </main>
  )
}

function Stat({
  label,
  value,
  tone
}: {
  label: string
  value: number
  tone?: "ok" | "warn"
}) {
  return (
    <div
      className={`card px-4 py-3 ${
        tone === "warn" && value > 0 ? "border-amber-300 bg-amber-50" : ""
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="display text-2xl text-navy">{value}</p>
    </div>
  )
}

function EditDrawer({
  perf,
  clubs,
  judges,
  scores,
  result,
  nextGuest,
  onClose,
  onSave
}: {
  perf: PanelPerformance
  clubs: PanelClub[]
  judges: PanelJudge[]
  scores: PanelScore[]
  result: PanelResult | undefined
  nextGuest: number
  onClose: () => void
  onSave: (
    id: string,
    patch: Record<string, unknown>,
    okText: string
  ) => Promise<boolean>
}) {
  const [realName, setRealName] = useState(perf.real_name ?? "")
  const [title, setTitle] = useState(perf.choreography_title ?? "")
  const [bib, setBib] = useState(perf.bib_number?.toString() ?? "")
  const [clubId, setClubId] = useState(perf.club_id ?? "")
  const [busy, setBusy] = useState(false)

  const check = checkMarks(result, scores)

  const run = async (patch: Record<string, unknown>, text: string) => {
    setBusy(true)
    await onSave(perf.id, patch, text)
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-navy/40 backdrop-blur-sm">
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-navy/10 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange">KAYIT DÜZENLE</p>
            <h3 className="display text-2xl text-navy">
              {perf.display_name} · No {perf.bib_number ?? "—"}
            </h3>
          </div>
          <button onClick={onClose} className="btn-ghost !px-3 !py-1.5 text-sm">
            Kapat
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {/* gerçek ad */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-navy">
              Gerçek ad <span className="text-orange">(sadece panelde görünür)</span>
            </h4>
            <p className="mt-1 text-xs text-muted">
              METAM4&apos;ten gelen isim. Yanlışsa düzeltin; kamuya açık sayfalarda
              asla gösterilmez.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="Örn. Ayşe Yılmaz"
                className="flex-1 rounded-xl border border-navy/15 px-4 py-2.5 text-sm outline-none focus:border-orange"
              />
              <button
                disabled={busy}
                onClick={() =>
                  run({ real_name: realName.trim() || null }, "Gerçek ad güncellendi.")
                }
                className="btn-navy !px-4 !py-2.5 text-sm"
              >
                Kaydet
              </button>
            </div>
          </section>

          {/* yayınlanan kimlik */}
          <section className="rounded-xl border border-navy/10 bg-cream/60 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-navy">
              Yayınlanan kimlik
            </h4>
            <p className="mt-1 text-xs text-muted">
              Sitede ya <b>koreografi adı</b> ya da <b>Guest N</b> görünür.
            </p>

            <div className="mt-3 rounded-xl border border-navy/10 bg-white p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Koreografi adı
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn. KIRMIZI SÝYAH"
                  className="flex-1 rounded-lg border border-navy/15 px-3 py-2 text-sm outline-none focus:border-orange"
                />
                <button
                  disabled={busy || !title.trim()}
                  onClick={() =>
                    run(
                      {
                        choreography_title: title.trim(),
                        guest_number: null,
                        is_guest: false
                      },
                      "Koreografi adı yayınlanıyor."
                    )
                  }
                  className="btn-primary !px-4 !py-2 text-xs"
                >
                  YAYINLA
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-navy/10 bg-white p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Guest numarası
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm text-navy">
                  Şu an:{" "}
                  <b>
                    {perf.guest_number !== null
                      ? `Guest ${perf.guest_number}`
                      : "atanmamış"}
                  </b>
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(
                      {
                        choreography_title: null,
                        guest_number: nextGuest,
                        is_guest: true
                      },
                      `Guest ${nextGuest} olarak yayınlanıyor.`
                    )
                  }
                  className="btn-ghost !px-4 !py-2 text-xs"
                >
                  Guest {nextGuest} OL
                </button>
              </div>
            </div>
          </section>

          {/* kulüp + no */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-navy">
              Kulüp &amp; numara
            </h4>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <select
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
                className="rounded-xl border border-navy/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange"
              >
                <option value="">— kulüp yok —</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                value={bib}
                onChange={(e) => setBib(e.target.value.replace(/\D/g, ""))}
                placeholder="No"
                className="rounded-xl border border-navy/15 px-3 py-2.5 text-sm outline-none focus:border-orange"
              />
            </div>
            <button
              disabled={busy}
              onClick={() =>
                run(
                  {
                    club_id: clubId || null,
                    bib_number: bib ? Number(bib) : null
                  },
                  "Kulüp ve numara güncellendi."
                )
              }
              className="btn-navy mt-3 !px-4 !py-2 text-xs"
            >
              KULÜP VE NUMARA KAYDET
            </button>
          </section>

          {/* puan kontrolü */}
          <section className="rounded-xl border border-navy/10 bg-cream/60 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-navy">
              Puan kontrolü
            </h4>
            <table className="mt-3 w-full text-left text-xs">
              <tbody>
                {judges.map((j) => {
                  const s = scores.find((x) => x.judge_id === j.id)
                  return (
                    <tr key={j.id} className="border-b border-navy/5">
                      <td className="py-1.5 font-bold text-navy">{j.label}</td>
                      <td className="py-1.5 text-muted">{j.full_name}</td>
                      <td className="py-1.5 text-right font-bold text-navy">
                        {s?.mark ?? "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-2 font-bold text-navy" colSpan={2}>
                    Toplam
                  </td>
                  <td className="pt-2 text-right font-bold text-navy">
                    {result?.sum ?? "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
            <p
              className={`mt-3 rounded-lg px-3 py-2 text-xs font-bold ${
                check.consistent
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {check.consistent
                ? `✓ Puanlar tutarlı (Σ ${check.sumFromMarks} = toplam ${check.storedSum})`
                : `! ${check.issue}`}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
