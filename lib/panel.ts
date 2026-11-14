/**
 * Jüri / masa hakemi paneli için ortak tipler ve yardımcılar.
 * (Sunucu ve istemci tarafında kullanılabilir; Supabase bağımlılığı yok.)
 */

export type PanelEvent = {
  id: string
  title: string
  slug: string
  city: string | null
  start_date: string | null
  status: string | null
}

export type PanelCategory = {
  id: string
  event_id: string
  name: string
  title: string | null
  display_order: number | null
}

export type PanelPerformance = {
  id: string
  event_category_id: string
  real_name: string | null
  choreography_title: string | null
  guest_number: number | null
  is_guest: boolean
  bib_number: number | null
  club_id: string | null
  display_name: string
}

export type PanelResult = {
  id: string
  performance_id: string
  event_category_id?: string
  place: number | null
  place_label: string | null
  sum: number | null
  round: string | null
}

export type PanelJudge = {
  id: string
  event_category_id: string
  label: string
  full_name: string
}

export type PanelScore = {
  id: string
  result_id: string
  judge_id: string
  mark: number | null
  event_category_id?: string
}

export type PanelClub = { id: string; name: string }

/** Bir performansın puan tutarlılığı. */
export type MarkCheck = {
  /** Jüri puanlarının toplamı (sonuç satırı olmayabilir) */
  sumFromMarks: number | null
  /** Sonuç tablosundaki toplam */
  storedSum: number | null
  /** Puan var mı */
  hasMarks: boolean
  /** Toplamlar birbiriyle ve puanlarla uyuşuyor mu */
  consistent: boolean
  /** Kısa uyarı metni (uyumsuzsa) */
  issue: string | null
}

/**
 * Puan kontrolü: judge_scores toplamı ile results.sum karşılaştırılır.
 * Sonuç satırı yoksa / puan yoksa / toplam farklıysa uyarı üretir.
 */
export function checkMarks(
  result: PanelResult | undefined,
  scores: PanelScore[]
): MarkCheck {
  const marks = scores
    .map((s) => (typeof s.mark === 'number' ? s.mark : null))
    .filter((m): m is number => m !== null)

  const storedSum = result?.sum ?? null
  const hasMarks = marks.length > 0
  const sumFromMarks = hasMarks ? marks.reduce((a, b) => a + b, 0) : null

  if (!result) {
    return {
      sumFromMarks,
      storedSum,
      hasMarks,
      consistent: false,
      issue: 'Sonuç satırı yok'
    }
  }
  if (!hasMarks) {
    // Juri puani olmayan performanslar (son gecen finale ulasmamis olanlar)
    // TUTARSIZLIK DEGILDIR - sadece puan verilmemis. Panel bunlari
    // "puan yok" olarak gosterir, uyari olarak saymaz.
    return {
      sumFromMarks,
      storedSum,
      hasMarks,
      consistent: true,
      issue: null
    }
  }
  if (storedSum === null) {
    return {
      sumFromMarks,
      storedSum,
      hasMarks,
      consistent: false,
      issue: `Toplam boş (puanlar toplamı ${sumFromMarks})`
    }
  }
  if (sumFromMarks !== storedSum) {
    return {
      sumFromMarks,
      storedSum,
      hasMarks,
      consistent: false,
      issue: `Toplam farklı: puanlar ${sumFromMarks}, tabloda ${storedSum}`
    }
  }
  return { sumFromMarks, storedSum, hasMarks, consistent: true, issue: null }
}

/** Kategori içinde bir sonraki boş Guest numarası (1..N). */
export function nextGuestNumber(
  performances: PanelPerformance[],
  categoryId: string
): number {
  const max = performances
    .filter((p) => p.event_category_id === categoryId && p.guest_number !== null)
    .reduce((m, p) => Math.max(m, p.guest_number ?? 0), 0)
  return max + 1
}

/** Kategorinin başlığı (METAM4 "Title" = kategori adı). */
export function categoryLabel(c: PanelCategory): string {
  return c.title || c.name
}

/** Sıralama: önce sıra, sonra bib. */
export function byPlace(
  a: { place?: number | null; bib_number?: number | null },
  b: { place?: number | null; bib_number?: number | null }
): number {
  const ap = a.place ?? 9999
  const bp = b.place ?? 9999
  if (ap !== bp) return ap - bp
  return (a.bib_number ?? 9999) - (b.bib_number ?? 9999)
}

/** Tarih biçimi: 22.12.2024 */
export function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}
