import { NextResponse } from "next/server"
import { getSupabaseServer, bearerFrom, verifyToken } from "@/lib/supabase"

export const runtime = "nodejs"
export const maxDuration = 60

type Mode = "preview" | "commit"

async function parseUploaded(file: File) {
  const { parseUpload } = await import("@/lib/metam4-parser.mjs")
  const buffer = Buffer.from(await file.arrayBuffer())
  return parseUpload(buffer, file.name)
}

/**
 * METAM4 sonuç dosyasını işler.
 *
 * POST /api/import            → önizleme (parse + özet)   [mode=preview]
 * POST /api/import?mode=commit → veritabanına yaz          [mode=commit]
 *
 * Form alanları:
 *   file      : .rar veya .zip (METAM4 export)
 *   event_id  : commit modunda zorunlu
 *   payload   : commit modunda, preview yanıtındaki payload (JSON string)
 *
 * Kimlik: Authorization: Bearer <supabase access token> — giriş zorunlu.
 */
export async function POST(req: Request) {
  const token = bearerFrom(req.headers)
  const user = await verifyToken(token)
  if (!user) {
    return NextResponse.json({ error: "Bu işlem için giriş yapmalısın." }, { status: 401 })
  }

  const url = new URL(req.url)
  const mode = (url.searchParams.get("mode") ?? "preview") as Mode

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 })
  }

  // ---------------- COMMIT ----------------
  if (mode === "commit") {
    const eventId = String(form.get("event_id") ?? "")
    const rawPayload = String(form.get("payload") ?? "")

    if (!eventId) {
      return NextResponse.json({ error: "Etkinlik seçilmedi." }, { status: 400 })
    }
    if (!rawPayload) {
      return NextResponse.json({ error: "Yükleme verisi bulunamadı, dosyayı tekrar yükle." }, { status: 400 })
    }

    let payload: unknown
    try {
      payload = JSON.parse(rawPayload)
    } catch {
      return NextResponse.json({ error: "Yükleme verisi okunamadı." }, { status: 400 })
    }

    const supabase = getSupabaseServer(token)
    if (!supabase) {
      return NextResponse.json({ error: "Veritabanına bağlanılamadı." }, { status: 503 })
    }

    const { data, error } = await supabase.rpc("apply_metam4_import", {
      p_event_id: eventId,
      p_payload: payload,
      p_import_id: null
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, result: data })
  }

  // ---------------- PREVIEW ----------------
  const file = form.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Dosya seçilmedi." }, { status: 400 })
  }
  if (!/\.(rar|zip)$/i.test(file.name)) {
    return NextResponse.json({ error: "Sadece .rar veya .zip dosyası yüklenebilir." }, { status: 400 })
  }

  let parsed
  try {
    parsed = await parseUploaded(file)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dosya okunamadı."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Önizleme için kısa özet + ham veri (commit'te geri gönderilecek)
  const disciplines = Object.entries(parsed.disciplines).map(([name, nodes]) => {
    const list = Object.values(nodes) as Record<string, unknown>[]
    const performances = list.flatMap((n) => (n as { performances?: unknown[] }).performances ?? [])
    return {
      discipline: name,
      competitions: list.length,
      performances: performances.length,
      judges: list.reduce(
        (acc, n) => acc + ((n as { judges?: unknown[] }).judges?.length ?? 0),
        0
      )
    }
  })

  return NextResponse.json({
    ok: true,
    stats: parsed.stats,
    disciplines,
    payload: parsed
  })
}
