// Creates a client account. Only an active admin can call it.
// The service_role key lives here on the server (Supabase injects it), never in the browser.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return reply({ error: 'Not signed in' }, 401)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: me } = await admin.from('profiles').select('role,status').eq('id', user.id).single()
    if (me?.role !== 'admin' || me?.status !== 'active') return reply({ error: 'Admins only' }, 403)

    const { email, password, full_name, business_name } = await req.json()
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ error: 'Invalid email' }, 400)
    if (typeof password !== 'string' || password.length < 8) return reply({ error: 'Password must be at least 8 characters' }, 400)

    const { data, error } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // the client can sign in right away
      user_metadata: { full_name: String(full_name ?? '').slice(0, 120), business_name: String(business_name ?? '').slice(0, 120) },
    })
    if (error) return reply({ error: error.message }, 400)
    return reply({ id: data.user.id })
  } catch {
    return reply({ error: 'Server error' }, 500)
  }
})
