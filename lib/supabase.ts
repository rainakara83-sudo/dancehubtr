import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

let browserClient: SupabaseClient | null = null

/** Tarayıcı tarafı istemci (giriş, oturum kontrolü). */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
  }
  return browserClient
}

/**
 * Sunucu tarafı istemci.
 * - Authorization başlığı verilirse o token doğrulanır (kullanıcı kimliği).
 * - SUPABASE_SERVICE_ROLE_KEY varsa RLS atlanır (yazma işlemleri için).
 */
export function getSupabaseServer(token?: string | null): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) {
    return createClient(SUPABASE_URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  }
  if (token) {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
  }
  return null
}

/** Bearer token'ı doğrular, geçerliyse kullanıcı nesnesini döndürür. */
export async function verifyToken(token?: string | null) {
  if (!token || !isSupabaseConfigured) return null
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

/** Authorization başlığından bearer token'ı çıkarır. */
export function bearerFrom(headers: Headers): string | null {
  const raw = headers.get("authorization") ?? headers.get("Authorization")
  if (!raw) return null
  const m = /^Bearer\s+(.+)$/i.exec(raw.trim())
  return m ? m[1].trim() : null
}
