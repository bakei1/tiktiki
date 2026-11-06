import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function defaultKey(raw: string | undefined): string {
  if (!raw) return ''
  try {
    const keys = JSON.parse(raw) as Record<string, unknown>
    if (typeof keys.default === 'string') return keys.default
    const first = Object.values(keys).find((value) => typeof value === 'string')
    return typeof first === 'string' ? first : ''
  } catch {
    return ''
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Yöntem desteklenmiyor.' }, 405)

  let username = ''
  let password = ''
  try {
    const body = await request.json()
    username = String(body?.username || '').trim().toLowerCase()
    password = String(body?.password || '')
  } catch {
    return json({ error: 'Giriş bilgileri hatalı.' }, 400)
  }

  if (!/^[a-z0-9._-]{3,24}$/.test(username) || password.length < 6) {
    return json({ error: 'Giriş bilgileri hatalı.' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey =
    Deno.env.get('SUPABASE_ANON_KEY') ||
    defaultKey(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'))
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    defaultKey(Deno.env.get('SUPABASE_SECRET_KEYS'))
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Giriş hizmeti yapılandırılmamış.' }, 503)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let email = 'username-not-found@invalid.example'
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('email')
    .eq('username_lower', username)
    .maybeSingle()

  if (profileError) return json({ error: 'Kullanıcı adıyla giriş yapılandırılmamış.' }, 503)
  if (profile?.email) email = profile.email

  // Delegate password verification and rate limiting to Supabase Auth.
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!authResponse.ok) return json({ error: 'Giriş bilgileri hatalı.' }, 400)

  return new Response(await authResponse.text(), {
    status: authResponse.status,
    headers: corsHeaders,
  })
})
