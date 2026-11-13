"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase"

type Session = { access_token: string; email?: string }
type EventRow = { id: string; title: string; city: string | null; start_date: string }

/** Dosyanın ait olduğu yarışmanın bilgisi (METAM4 başlığından). */
function fileEventMeta(payload: any) {
  const discs = (payload?.disciplines ?? {}) as Record<string, any>
  for (const d of Object.values(discs) as any[]) {
    for (const n of Object.values((d ?? {}) as Record<string, any>) as any[]) {
      if (n?.meta?.event_name) return n.meta as any
    }
  }
  return null
}

/** "İSTANBUL" / "Istanbul" / "İstanbul" -> aynı karşılaştırma için normalize. */
function normCity(s: string | null | undefined) {
  return String(s ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "")
}

export default function YuklePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [session, setSession] = useState<Session | null>(null)
  const [events, setEvents] = useState<EventRow[]>([])
  const [eventId, setEventId] = useState("")
  const [checking, setChecking] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<any>(null)
  const [published, setPublished] = useState(false)

  // Oturum kontrolü
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setChecking(false)
      router.replace("/giris")
      return
    }
    const supabase = getSupabaseBrowser()
    if (!supabase) {
      setChecking(false)
      router.replace("/giris")
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session
      if (!s) {
        setChecking(false)
        router.replace("/giris")
        return
      }
      setSession({ access_token: s.access_token, email: s.user.email ?? undefined })
      setChecking(false)
    })
  }, [router])

  // Yayınlanmış etkinlikler (yayınlama hedefi)
  useEffect(() => {
    if (!session) return
    const supabase = getSupabaseBrowser()
    if (!supabase) return
    supabase
      .from("events")
      .select("id, title, city, start_date")
      .eq("status", "published")
      .order("start_date", { ascending: false })
      .then(({ data }) => {
        if (!data) return
        const rows = data as EventRow[]
        setEvents(rows)
        if (rows.length === 1) setEventId(rows[0].id)
      })
  }, [session])

  const onPick = useCallback((f: File | undefined | null) => {
    setError("")
    setPreview(null)
    setPublished(false)
    if (!f) return
    if (!/\.(rar|zip)$/i.test(f.name)) {
      setError("Sadece .rar veya .zip dosyası yüklenebilir.")
      return
    }
    setFile(f)
  }, [])

  async function handleUpload() {
    if (!file || !session) return
    setBusy(true)
    setError("")
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Yükleme başarısız.")
      setPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yükleme başarısız.")
    } finally {
      setBusy(false)
    }
  }

  async function handlePublish(eventId: string) {
    if (!preview || !session) return
    setBusy(true)
    setError("")
    try {
      const fd = new FormData()
      fd.append("event_id", eventId)
      fd.append("payload", JSON.stringify(preview.payload))
      const res = await fetch("/api/import?mode=commit", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Yayınlanamadı.")
      setPublished(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yayınlanamadı.")
    } finally {
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream">
        <p className="text-sm font-semibold text-navy/60">Yükleniyor…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream">
      <div className="sticky top-0 z-50 border-b border-navy/10 bg-white/90 backdrop-blur-md">
        <div className="shell flex h-16 items-center justify-between">
          <a href="/" className="display text-2xl tracking-tight text-navy">
            dancehub<span className="text-orange">.</span>
          </a>
          <div className="flex items-center gap-4">
            {session?.email && (
              <span className="hidden text-sm text-navy/55 sm:inline">{session.email}</span>
            )}
            <button
              onClick={async () => {
                const supabase = getSupabaseBrowser()
                await supabase?.auth.signOut()
                router.replace("/giris")
              }}
              className="text-sm font-semibold text-navy/60 transition hover:text-orange"
            >
              Çıkış
            </button>
          </div>
        </div>
      </div>

      <div className="shell py-12">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange">Masa Hakemi</p>
        <h1 className="display mt-3 text-4xl text-navy sm:text-5xl">Sonuç yükle</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
          Yarışma sırasında tuttuğun METAM4 export dosyasını (.rar / .zip) yükle. Kayıtlar
          otomatik okunur; onayından sonra yayınlanır.
        </p>

        {/* Yükleme alanı */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            onPick(e.dataTransfer.files?.[0])
          }}
          onClick={() => fileRef.current?.click()}
          className={`mt-8 cursor-pointer rounded-xl3 border-2 border-dashed p-12 text-center transition ${
            dragging
              ? "border-orange bg-orange/[0.07]"
              : "border-navy/20 bg-white hover:border-navy/40"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".rar,.zip"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          {file ? (
            <>
              <p className="display text-xl text-navy">{file.name}</p>
              <p className="mt-1 text-sm text-navy/55">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <p className="mt-4 text-sm font-semibold text-orange">Değiştirmek için tıkla</p>
            </>
          ) : (
            <>
              <p className="display text-xl text-navy">Dosyayı buraya sürükle</p>
              <p className="mt-1 text-sm text-navy/55">ya da tıklayıp seç · .rar / .zip</p>
            </>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-xl2 border border-orange/30 bg-orange/[0.07] px-4 py-3 text-sm font-semibold text-orange-dark">
            {error}
          </p>
        )}

        {file && !preview && (
          <button onClick={handleUpload} disabled={busy} className="btn-primary mt-6 disabled:opacity-60">
            {busy ? "Okunuyor…" : "Dosyayı Oku"}
          </button>
        )}

        {/* Önizleme */}
        {preview && (
          <div className="mt-10 rounded-xl3 border border-navy/10 bg-white p-7 shadow-card">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange">Önizleme</p>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { v: preview.stats?.competitions ?? 0, l: "Yarışma" },
                { v: preview.stats?.performances ?? 0, l: "Performans" },
                { v: preview.stats?.judges ?? 0, l: "Jüri" },
                { v: preview.disciplines?.length ?? 0, l: "Disiplin" }
              ].map((s) => (
                <div key={s.l} className="rounded-xl2 bg-cream p-4 text-center">
                  <p className="display text-3xl text-navy">{s.v}</p>
                  <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-navy/50">
                    {s.l}
                  </p>
                </div>
              ))}
            </div>

            <ul className="mt-6 divide-y divide-navy/10 border-y border-navy/10">
              {(preview.disciplines ?? []).map((d: any) => (
                <li key={d.discipline} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-semibold text-navy">{d.discipline}</span>
                  <span className="text-navy/55">
                    {d.competitions} yarışma · {d.performances} performans · {d.judges} jüri
                  </span>
                </li>
              ))}
            </ul>

            {/* Dosyanın ait olduğu yarışma */}
            {(() => {
              const meta = fileEventMeta(preview.payload)
              if (!meta) return null
              return (
                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl2 bg-cream px-4 py-3 text-sm">
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-navy/50">
                    Dosyadaki yarışma
                  </span>
                  <span className="font-semibold text-navy">{meta.event_name}</span>
                  <span className="text-navy/55">
                    {meta.event_date} · {meta.event_place}
                  </span>
                </div>
              )
            })()}

            {/* KAMUYA AÇIK OLACAK İSİMLER — yayınlamadan önce kontrol et */}
            {(() => {
              const rows: any[] = []
              for (const disc of Object.values(preview.payload?.disciplines ?? {}) as any) {
                for (const node of Object.values(disc ?? {}) as any[]) {
                  for (const p of node?.performances ?? []) {
                    rows.push({
                      name: p.name,
                      realName: p.real_name,
                      guestNumber: p.guest_number,
                      club: p.club,
                      marks: p.marks,
                      place: p.place,
                      category: node?.category_title || node?.category_name || node?.ref || "",
                    })
                  }
                }
              }
              if (!rows.length) return null
              const titled = rows.filter((r) => r.name).length
              return (
                <div className="mt-8 rounded-xl2 border-2 border-orange/40 bg-orange/[0.05] p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">
                    Kamuya açık olacak isimler
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-navy/70">
                    Sitede <strong>koreografi adı</strong> varsa o, yoksa{" "}
                    <strong>Guest N</strong> görünecek. Gerçek dansçı adları{" "}
                    <strong>hiçbir zaman</strong> herkese açık sayfada yayınlanmaz; yalnızca
                    panelde görünür. {titled} kayıtta koreografi adı bulundu,{" "}
                    {rows.length - titled} kayıt <strong>Guest N</strong> olarak yayınlanacak.
                  </p>
                  <div className="mt-4 max-h-64 overflow-y-auto rounded-xl2 bg-white">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-cream">
                        <tr>
                          <th className="px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-navy/55">
                            Kategori
                          </th>
                          <th className="px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-navy/55">
                            Sitede görünecek
                          </th>
                          <th className="px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-navy/55">
                            Panel (gizli)
                          </th>
                          <th className="px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-navy/55">
                            Kulüp
                          </th>
                          <th className="px-4 py-2.5 text-right text-[0.65rem] font-bold uppercase tracking-[0.15em] text-navy/55">
                            Puanlar
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 60).map((r, i) => (
                          <tr key={i} className="border-t border-navy/5">
                            <td className="px-4 py-2 text-navy/45">{r.category}</td>
                            <td className="px-4 py-2 font-semibold text-navy">
                              {r.name || (
                                <span className="text-orange">Guest {r.guestNumber}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-navy/45">{r.realName || "—"}</td>
                            <td className="px-4 py-2 text-navy/55">{r.club || "—"}</td>
                            <td className="px-4 py-2 text-right font-mono text-xs text-navy/55">
                              {r.marks || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 60 && (
                    <p className="mt-2 text-xs text-navy/50">
                      … ve {rows.length - 60} performans daha
                    </p>
                  )}
                </div>
              )
            })()}

            {published ? (
              <div className="mt-6 rounded-xl2 border border-navy/15 bg-navy px-5 py-4 text-center">
                <p className="display text-lg text-sun">Yayınlandı</p>
                <p className="mt-1 text-sm text-white/70">
                  Sonuçlar kaydedildi ve etkinlik yayına alındı.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <select
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    className="flex-1 rounded-xl2 border-2 border-navy/15 bg-paper px-4 py-3 text-sm font-semibold text-navy outline-none transition focus:border-orange"
                  >
                    <option value="">Etkinlik seç…</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                        {ev.city ? ` — ${ev.city}` : ""} ({ev.start_date})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handlePublish(eventId)}
                    disabled={busy || !eventId}
                    className="btn-navy shrink-0 disabled:opacity-60"
                  >
                    {busy ? "Yayınlanıyor…" : "Yayınla"}
                  </button>
                </div>
                {events.length === 0 && (
                  <p className="mt-2 text-xs text-navy/50">
                    Yayınlanmış etkinlik bulunamadı. Supabase → events tablosuna etkinlik ekle.
                  </p>
                )}

                {/* Yanlış etkinliğe yayınlamayı engelleyen uyarı */}
                {(() => {
                  const sel = events.find((ev) => ev.id === eventId)
                  if (!sel) return null
                  const meta = fileEventMeta(preview?.payload)
                  if (!meta?.event_name) return null

                  const cityOk = normCity(sel.city) === normCity(meta.event_place)
                  const fileYear = (String(meta.event_date ?? "").match(/\d{4}/) || [])[0]
                  const eventYear = String(sel.start_date ?? "").slice(0, 4)
                  const yearOk = !fileYear || fileYear === eventYear
                  if (cityOk && yearOk) return null

                  return (
                    <div className="mt-4 rounded-xl2 border-2 border-orange bg-orange/[0.07] px-4 py-3 text-sm leading-relaxed text-navy">
                      <strong className="text-orange-dark">⚠️ Dikkat:</strong> Bu dosya{" "}
                      <strong>{meta.event_name}</strong> yarışmasına ait (
                      {meta.event_date} · {meta.event_place}). Seçtiğin etkinlik ise{" "}
                      <strong>{sel.title}</strong> ({sel.start_date} · {sel.city}).
                      Yanlış etkinliğe yayınlarsan sonuçlar yanlış yarışmada görünür.
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
