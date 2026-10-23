import type { Metadata } from "next"
import { Anton, Inter } from "next/font/google"
import "./globals.css"

const display = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap"
})

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
})

export const metadata: Metadata = {
  title: "DanceHubTr — Türkiye'nin dans sahnesi tek adreste",
  description:
    "IS Group'ın dans yarışmaları için tek adres: yarışma takvimi, resmî sonuçlar, jüri detayı ve fotoğraf–video galerisi.",
  openGraph: {
    title: "DanceHubTr",
    description: "Türkiye'nin dans sahnesi tek adreste. Çok yakında.",
    locale: "tr_TR",
    type: "website"
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
