import { useEffect, useState } from 'react'
import BreakEven from './BreakEven.jsx'
import Planner from './Planner.jsx'
import Admin from './Admin.jsx'
import { supabase } from './supabase.js'
import { DEFAULTS } from './model.js'
import { LANGUAGES, translator } from './i18n.js'

const KEY = 'yube-cashflow-v3'
const TABS = [['break', 'navBreak', 'M4 19V5m0 14h16M8 15l4-5 3 3 5-7'], ['planner', 'navPlanner', 'M4 8l8-4 8 4v8l-8 4-8-4V8zm8 4l8-4']]

const ADMIN_TAB = ['admin', 'navAdmin', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8']

function load(key) {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(key)) } } catch { return DEFAULTS }
}

export default function App({ prefs, user, profile, signOut }) {
  const [view, setView] = useState('break')
  const { theme, setTheme, locale, setLocale } = prefs
  const key = KEY + ':' + user.id // each account keeps its own copy on shared computers
  const [state, setState] = useState(() => load(key))
  const [cloudReady, setCloudReady] = useState(false)
  const isAdmin = profile.role === 'admin'
  const tabs = isAdmin ? [...TABS, ADMIN_TAB] : TABS

  // Load this person's saved inputs from Supabase once; they win over the local copy.
  useEffect(() => {
    let live = true
    supabase.from('user_settings').select('data').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (!live) return
      if (data && Object.keys(data.data || {}).length) setState({ ...DEFAULTS, ...data.data })
      setCloudReady(true)
    })
    return () => { live = false }
  }, [user.id])
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)) } catch { /* storage unavailable */ } }, [state, key])
  // Save to Supabase shortly after the last change (only after the first load, so defaults never overwrite cloud data).
  useEffect(() => {
    if (!cloudReady) return
    const id = setTimeout(() => supabase.from('user_settings').upsert({ user_id: user.id, data: state, updated_at: new Date().toISOString() }).then(() => {}), 800)
    return () => clearTimeout(id)
  }, [state, cloudReady, user.id])
  const set = (k, v) => setState(s => ({ ...s, [k]: Math.max(0, Number(v) || 0) }))
  const reset = () => setState(DEFAULTS)
  const t = translator(locale)
  const props = { state, set, reset, t, locale }
  return (
    <div className={'app theme-' + theme + (locale === 'ar' ? ' rtl' : '')}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">Y</span><span>Yube <b>Flow</b></span></div>
        <nav>
          {tabs.map(([id, label, d]) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
              {t(label)}
            </button>
          ))}
        </nav>
        <p className="side-note">{t('brandNote')}</p>
      </aside>
      <div className="content">
        <div className="topbar">
          <div className="search"><span>⌁</span> {t('topNote')}</div>
          <div className="top-actions">
            <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? t('light') : t('dark')}>
              {theme === 'dark' ? t('light') : t('dark')}
            </button>
            <label className="language-select"><span className="sr-only">{t('language')}</span><select value={locale} onChange={e => setLocale(e.target.value)} aria-label={t('language')}>{LANGUAGES.map(({ code, label, name }) => <option key={code} value={code}>{label} · {name}</option>)}</select></label>
            <span className="user-chip" title={profile.email}>{profile.business_name || profile.full_name || profile.email}</span>
            <button className="theme-toggle" onClick={signOut}>{t('signOut')}</button>
          </div>
        </div>
        {view === 'admin' && isAdmin ? <Admin t={t} locale={locale} me={profile} /> : view === 'break' ? <BreakEven {...props} /> : <Planner {...props} />}
      </div>
      <nav className="mobile-nav">
        {tabs.map(([id, label, d]) => (
          <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
            <span>{t(label)}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
