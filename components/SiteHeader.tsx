"use client"

import { useEffect, useState } from "react"
import { site } from "@/content/site"
import { NAV } from "@/content/nav"
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase"

export function Logo() {
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

/** Tüm sayfalarda ortak üst menü. Giriş yapılmışsa "Panel" butonu gösterir. */
export function SiteHeader() {
  const [logged, setLogged] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const sb = getSupabaseBrowser()
    if (!sb) return
    sb.auth.getSession().then(({ data }) => setLogged(!!data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setLogged(!!session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-navy/10 bg-white/90 backdrop-blur-md">
      <div className="shell flex h-16 items-center justify-between gap-6">
        <a href="/" aria-label="DanceHubTr ana sayfa">
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
          <a
            href={site.cta.competitions.href}
            className="btn-ghost hidden !px-5 !py-2.5 text-sm sm:inline-flex"
          >
            {site.cta.competitions.label}
          </a>
          {/* SS1: header'daki buton "Sonuç yükle" değil, "Üye girişi" */}
          {logged ? (
            <a href="/panel" className="btn-primary !px-5 !py-2.5 text-sm">
              Panel
            </a>
          ) : (
            <a href={site.cta.login.href} className="btn-primary !px-5 !py-2.5 text-sm">
              {site.cta.login.label}
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
