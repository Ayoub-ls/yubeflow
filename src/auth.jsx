import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

// The signup trigger creates the profile row; give it a moment on a brand-new account.
async function fetchProfile(id) {
  for (let i = 0; i < 3; i++) {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
    if (data) return data
    await new Promise(r => setTimeout(r, 500))
  }
  return null
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(supabase ? undefined : null) // undefined = not known yet
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [recovering, setRecovering] = useState(false)
  const uid = session?.user?.id
  const known = session !== undefined

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !known) return
    if (!uid) { setProfile(null); setLoading(false); return }
    let live = true
    setLoading(true)
    fetchProfile(uid).then(p => {
      if (!live) return
      setProfile(p)
      setLoading(false)
      if (p) supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', uid).then(() => {})
    })
    return () => { live = false }
  }, [uid, known])

  const api = {
    session, profile, loading, recovering,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }).then(({ data, error }) => ({ error, session: data?.session })),
    resetPassword: email => supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }).then(({ error }) => ({ error })),
    updatePassword: password => supabase.auth.updateUser({ password }).then(({ error }) => { if (!error) setRecovering(false); return { error } }),
    signOut: () => supabase.auth.signOut(),
  }
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
