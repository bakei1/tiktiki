import { createClient } from '@supabase/supabase-js'

const rawUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// Dashboard'dan kopyalanan REST endpoint'i de kabul et:
// https://<ref>.supabase.co/rest/v1/ -> https://<ref>.supabase.co
export const SUPABASE_URL = rawUrl
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/i, '')

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && anonKey && /^https?:\/\//i.test(SUPABASE_URL),
)

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 8 },
      },
    })
  : null

export function friendlyDataError(error) {
  const message = String(error?.message || error || 'Bilinmeyen bir hata oluştu.')
  if (/relation .* does not exist|schema cache|could not find the table/i.test(message)) {
    return 'Veri tabloları bulunamadı. Proje yapılandırmasını kontrol et.'
  }
  if (/invalid api key|jwt/i.test(message)) {
    return 'Bağlantı anahtarı geçersiz. Proje ayarlarını kontrol et.'
  }
  if (/row-level security|permission denied/i.test(message)) {
    return 'Bu işlem için izin yok. Hesap erişimini kontrol et.'
  }
  if (/failed to fetch|network|fetch error/i.test(message)) {
    return 'Sunucuya bağlanılamadı. İnternet bağlantını kontrol edip yeniden dene.'
  }
  return message
}
