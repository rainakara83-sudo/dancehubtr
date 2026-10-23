"use client"

import { useState } from "react"
import { site } from "@/content/site"

type State = "idle" | "loading" | "ok" | "error"

export default function BeklemeFormu() {
  const [email, setEmail] = useState("")
  const [state, setState] = useState<State>("idle")
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setState("error")
      setMessage("Geçerli bir e-posta adresi gir.")
      return
    }

    setState("loading")
    setMessage("")
    try {
      const res = await fetch("/api/bekleyen-liste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Bir şeyler ters gitti.")
      setState("ok")
      setMessage(data.message || "Listeye eklendin. Açılışta ilk sen haberdar olacaksın.")
      setEmail("")
    } catch (err) {
      setState("error")
      setMessage(err instanceof Error ? err.message : "Bir şeyler ters gitti.")
    }
  }

  return (
    <div className="mt-9 w-full max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={site.waitlist.placeholder}
          aria-label="E-posta adresin"
          className="w-full rounded-full border-2 border-navy/20 bg-white px-6 py-3.5 text-base text-navy outline-none transition placeholder:text-navy/45 focus:border-navy"
          disabled={state === "loading"}
        />
        <button type="submit" disabled={state === "loading"} className="btn-navy shrink-0 disabled:opacity-60">
          {state === "loading" ? "Gönderiliyor…" : site.waitlist.button}
        </button>
      </form>

      {message && (
        <p
          className={`mt-4 text-sm font-semibold ${
            state === "ok" ? "text-navy" : "text-orange-dark"
          }`}
        >
          {message}
        </p>
      )}

      <p className="mt-5 text-sm text-navy/55">
        Ya da direkt{" "}
        <a
          href={`mailto:${site.waitlist.email}`}
          className="font-bold text-navy underline decoration-sun decoration-2 underline-offset-4 hover:decoration-navy"
        >
          {site.waitlist.email}
        </a>{" "}
        adresine yaz.
      </p>
    </div>
  )
}
