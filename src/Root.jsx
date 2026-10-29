import App from './App.jsx'
import { AuthProvider, useAuth } from './auth.jsx'
import { AuthPage, NewPassword, Notice } from './AuthScreens.jsx'
import { accessState } from './access.js'
import { translator } from './i18n.js'
import { usePrefs } from './prefs.js'
import { configured } from './supabase.js'

function Gate({ prefs }) {
  const { loading, session, profile, recovering, signOut } = useAuth()
  const t = translator(prefs.locale)
  if (!configured) return <Notice prefs={prefs} title={t('notConfigured')} text={t('notConfiguredText')} />
  if (loading || session === undefined) return <Notice prefs={prefs} title={t('loading')} />
  if (recovering) return <NewPassword prefs={prefs} />
  if (!session) return <AuthPage prefs={prefs} />
  const access = accessState(profile)
  if (access === 'suspended') return <Notice prefs={prefs} title={t('suspendedTitle')} text={t('suspendedText')} onSignOut={signOut} />
  if (access === 'error') return <Notice prefs={prefs} title={t('profileError')} onSignOut={signOut} />
  return <App prefs={prefs} user={session.user} profile={profile} signOut={signOut} />
}

export default function Root() {
  const prefs = usePrefs()
  return <AuthProvider><Gate prefs={prefs} /></AuthProvider>
}
