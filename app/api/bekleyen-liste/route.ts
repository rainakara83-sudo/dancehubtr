import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase"

export const runtime = "nodejs"

/**
 * Bekleme listesi — erken erişim kaydı.
 * Tablo: public.waitlist (schema.sql içinde tanımlı)
 */
export async function POST(req: Request) {
  let email = ""
  try {
    const body = await req.json()
    email = String(body?.email ?? "").trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "Geçerli bir e-posta adresi gir." }, { status: 400 })
  }

  const supabase = getSupabaseServer()
  if (!supabase) {
    return NextResponse.json(
      { error: "Bekleme listesi şu an kapalı. Bize doğrudan e-posta yazabilirsin." },
      { status: 503 }
    )
  }

  const { error } = await supabase
    .from("waitlist")
    .upsert({ email }, { onConflict: "email", ignoreDuplicates: true })

  if (error) {
    // Tablo henüz oluşturulmadıysa sessizce geçme, kullanıcıya geri bildir.
    const missing = /relation .*waitlist.*does not exist|schema cache/i.test(error.message)
    return NextResponse.json(
      {
        error: missing
          ? "Bekleme listesi yakında açılıyor. Şimdilik iletisim@dancehubtr.com adresine yazabilirsin."
          : "Kayıt alınamadı, lütfen tekrar dene."
      },
      { status: missing ? 503 : 500 }
    )
  }

  return NextResponse.json({ ok: true, message: "Listeye eklendin. Açılışta ilk sen haberdar olacaksın." })
}
