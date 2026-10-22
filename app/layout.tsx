import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "DanceHubTr — Türkiye'nin dans sahnesi tek adreste",
  description:
    "Dans yarışmaları için takvim, bilet, canlı skorboard ve kulüp paneli. Çok yakında.",
  openGraph: {
    title: "DanceHubTr",
    description: "Türkiye'nin dans sahnesi tek adreste. Çok yakında.",
    locale: "tr_TR",
    type: "website"
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-ink font-sans text-bone antialiased">{children}</body>
    </html>
  )
}
