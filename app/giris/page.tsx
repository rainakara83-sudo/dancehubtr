"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase"

export default function GirisPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notReady, setNotReady] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) setNotReady(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setBusy(true)
    try {
      const supabase = getSupabaseBrowser()
      if (!supabase) {
        setNotReady(true)
        return
      }
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        setError(
          err.message === "Invalid login credentials"
            ? "E-posta veya şifre hatalı."
            : err.message
        )
        return
      }
      router.push("/yukle")
      router.refresh()
    } catch {
      setError("Giriş yapılamadı, tekrar dene.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-cream">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-60" />
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-orange/20 blur-3xl" />

      {/* Üst bar */}
      <div className="relative z-10 border-b border-navy/10 bg-white/80 backdrop-blur">
        <div className="shell flex h-16 items-center justify-between">
          <a href="/" className="display text-2xl tracking-tight text-navy">
            dancehub<span className="text-orange">.</span>
          </a>
          <a href="/" className="text-sm font-semibold text-navy/60 transition hover:text-orange">
            ← Ana sayfa
          </a>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md">
          <div className="rounded-xl3 border border-navy/10 bg-white p-8 shadow-card sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange">
              Yetkili Erişim
            </p>
            <h1 className="display mt-3 text-4xl text-navy">Sonuç yükle</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Sonuç yüklemek ve görevli olduğun yarışmaları yönetmek için hesabına giriş yap.
            </p>

            {notReady && (
              <div className="mt-6 rounded-xl2 border border-orange/30 bg-orange/[0.07] p-4 text-sm text-navy/80">
                <p className="font-bold text-navy">Giriş sistemi henüz hazır değil.</p>
                <p className="mt-1">
                  Supabase bağlantısı tamamlanınca bu sayfa çalışacak. Şimdilik{" "}
                  <a
                    href="mailto:iletisim@dancehubtr.com"
                    className="font-bold underline underline-offset-4"
                  >
                    iletisim@dancehubtr.com
                  </a>
                  adresine yazabilirsin.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-[0.16em] text-navy/60"
                >
                  E-posta
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl2 border-2 border-navy/15 bg-paper px-4 py-3 text-base text-navy outline-none transition focus:border-orange"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-[0.16em] text-navy/60"
                >
                  Şifre
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl2 border-2 border-navy/15 bg-paper px-4 py-3 text-base text-navy outline-none transition focus:border-orange"
                />
              </div>

              {error && (
                <p className="rounded-xl2 border border-orange/30 bg-orange/[0.07] px-4 py-3 text-sm font-semibold text-orange-dark">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || notReady}
                className="btn-primary w-full disabled:opacity-60"
              >
                {busy ? "Giriş yapılıyor…" : "Giriş Yap"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-relaxed text-navy/45">
              Hesabın yok mu? IS Group yönetimine yaz.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
