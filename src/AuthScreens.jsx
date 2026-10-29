import { useState } from 'react'
import { useAuth } from './auth.jsx'
import { LANGUAGES, translator } from './i18n.js'

function Shell({ prefs, children }) {
  const { theme, setTheme, locale, setLocale } = prefs
  const t = translator(locale)
  return (
    <div className={'auth-page theme-' + theme + (locale === 'ar' ? ' rtl' : '')}>
      <div className="auth-top">
        <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? t('light') : t('dark')}</button>
        <label className="language-select"><span className="sr-only">{t('language')}</span>
          <select value={locale} onChange={e => setLocale(e.target.value)} aria-label={t('language')}>
            {LANGUAGES.map(({ code, label, name }) => <option key={code} value={code}>{label} · {name}</option>)}
          </select>
        </label>
      </div>
      <div className="auth-card">
        <div className="brand"><span className="brand-mark">Y</span><span>Yube <b>Flow</b></span></div>
        {children}
      </div>
    </div>
  )
}

export function Notice({ prefs, title, text, onSignOut }) {
  const t = translator(prefs.locale)
  return (
    <Shell prefs={prefs}>
      <h1>{title}</h1>
      {text && <p className="sub">{text}</p>}
      {onSignOut && <button className="btn-primary" onClick={onSignOut}>{t('signOut')}</button>}
    </Shell>
  )
}

const Field = ({ label, ...p }) => <label className="field"><span>{label}</span><input {...p} /></label>

export function AuthPage({ prefs }) {
  const t = translator(prefs.locale)
  const { signIn, resetPassword } = useAuth()
  const [forgot, setForgot] = useState(false)
  const [f, setF] = useState({ email: '', password: '' })
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const up = k => e => setF(x => ({ ...x, [k]: e.target.value }))
  const go = v => { setForgot(v); setMsg(null) }

  async function submit(e) {
    e.preventDefault()
    setMsg(null)
    setBusy(true)
    const r = forgot ? await resetPassword(f.email) : await signIn(f.email, f.password)
    setBusy(false)
    if (r.error) setMsg({ type: 'error', text: r.error.message })
    else if (forgot) setMsg({ type: 'ok', text: t('resetSent') })
  }

  return (
    <Shell prefs={prefs}>
      <div>
        <h1>{t(forgot ? 'authTitleForgot' : 'authTitleLogin')}</h1>
        <p className="sub">{t('authSub')}</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <Field label={t('email')} type="email" value={f.email} onChange={up('email')} autoComplete="email" required />
        {!forgot && <Field label={t('password')} type="password" value={f.password} onChange={up('password')} autoComplete="current-password" required />}
        {msg && <div className={'auth-msg ' + msg.type} role="alert">{msg.text}</div>}
        <button className="btn-primary" disabled={busy}>{busy ? t('loading') : t(forgot ? 'sendReset' : 'signIn')}</button>
      </form>
      <button className="link-btn" onClick={() => go(!forgot)}>{t(forgot ? 'backToLogin' : 'forgot')}</button>
    </Shell>
  )
}

// Shown after the person opens the reset link from their email.
export function NewPassword({ prefs }) {
  const t = translator(prefs.locale)
  const { updatePassword } = useAuth()
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState(null)
  async function submit(e) {
    e.preventDefault()
    if (pw.length < 8) return setMsg(t('passwordShort'))
    const { error } = await updatePassword(pw)
    if (error) setMsg(error.message)
  }
  return (
    <Shell prefs={prefs}>
      <h1>{t('setNewPassword')}</h1>
      <form className="auth-form" onSubmit={submit}>
        <Field label={t('newPassword')} type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" required />
        {msg && <div className="auth-msg error" role="alert">{msg}</div>}
        <button className="btn-primary">{t('savePassword')}</button>
      </form>
    </Shell>
  )
}
