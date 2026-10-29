import { useEffect, useMemo, useState } from 'react'
import { localeFor } from './i18n.js'
import { supabase } from './supabase.js'

const DAY = 864e5
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no look-alike characters
const makePassword = () => Array.from(crypto.getRandomValues(new Uint32Array(12)), n => ALPHABET[n % ALPHABET.length]).join('')
const blank = () => ({ full_name: '', business_name: '', email: '', password: makePassword() })

export default function Admin({ t, locale, me }) {
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)
  const [copied, setCopied] = useState(false)

  const load = () => supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500)
    .then(({ data, error }) => (error ? setErr(error.message) : setRows(data)))
  useEffect(() => { load() }, [])

  async function setStatus(u) {
    setErr('')
    const status = u.status === 'active' ? 'suspended' : 'active'
    const { error } = await supabase.from('profiles').update({ status }).eq('id', u.id)
    if (error) setErr(error.message)
    else setRows(r => r.map(x => (x.id === u.id ? { ...x, status } : x)))
  }

  async function create(e) {
    e.preventDefault()
    setErr(''); setCreated(null); setCopied(false)
    if (form.password.length < 8) return setErr(t('passwordShort'))
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('create-client', { body: form })
    let msg = data?.error
    if (error && !msg) { try { msg = (await error.context.json()).error } catch { msg = error.message } }
    setBusy(false)
    if (msg) return setErr(msg)
    setCreated({ email: form.email.trim().toLowerCase(), password: form.password })
    setForm(blank()); setOpen(false); load()
  }

  async function copyLogin() {
    try { await navigator.clipboard.writeText(`${created.email}\n${created.password}`); setCopied(true) } catch { /* clipboard blocked */ }
  }

  const now = Date.now()
  const stats = useMemo(() => {
    const r = rows || []
    return {
      total: r.length,
      active: r.filter(u => u.status === 'active').length,
      suspended: r.filter(u => u.status === 'suspended').length,
      fresh: r.filter(u => now - new Date(u.created_at) < 7 * DAY).length,
    }
  }, [rows]) // eslint-disable-line react-hooks/exhaustive-deps

  const needle = q.trim().toLowerCase()
  const shown = (rows || []).filter(u => !needle || [u.email, u.full_name, u.business_name].some(x => (x || '').toLowerCase().includes(needle)))
  const date = x => (x ? new Date(x).toLocaleDateString(localeFor(locale)) : '–')
  const up = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <main className="admin shell">
      <section className="english-hero">
        <div><h1>{t('adminTitle')}</h1><p>{t('adminDesc')}</p></div>
        <button className="btn-primary" onClick={() => { setOpen(o => !o); setCreated(null) }}>{open ? t('cancel') : '+ ' + t('addClient')}</button>
      </section>

      {open && (
        <form className="panel add-client" onSubmit={create}>
          <label className="field"><span>{t('fullName')}</span><input value={form.full_name} onChange={up('full_name')} required /></label>
          <label className="field"><span>{t('businessName')}</span><input value={form.business_name} onChange={up('business_name')} /></label>
          <label className="field"><span>{t('email')}</span><input type="email" value={form.email} onChange={up('email')} required /></label>
          <label className="field"><span>{t('password')}</span>
            <div className="pw-row"><input value={form.password} onChange={up('password')} required minLength={8} />
              <button type="button" className="mini-btn" onClick={() => setForm(f => ({ ...f, password: makePassword() }))}>{t('generate')}</button></div></label>
          <div className="form-actions"><button className="btn-primary" disabled={busy}>{busy ? t('loading') : t('createClient')}</button></div>
        </form>
      )}

      {created && (
        <div className="auth-msg ok" role="status">
          {t('clientCreated')} <b>{created.email}</b> · <code>{created.password}</code>{' '}
          <button className="mini-btn" onClick={copyLogin}>{copied ? t('copied') : t('copyLogin')}</button>
        </div>
      )}
      {err && <div className="auth-msg error" role="alert">{err}</div>}

      <section className="english-kpis">
        {[['statUsers', 'total'], ['statActive', 'active'], ['statSuspended', 'suspended'], ['statNew', 'fresh']]
          .map(([label, k]) => <div key={k}>{t(label)}<strong>{stats[k]}</strong></div>)}
      </section>
      <input className="admin-search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} />
      <div className="table-wrap">
        <table className="admin-table">
          <thead><tr>{['colUser', 'colBusiness', 'colStatus', 'colJoined', 'colLastSeen', 'colActions'].map(k => <th key={k}>{t(k)}</th>)}</tr></thead>
          <tbody>
            {rows === null && <tr><td colSpan="6">{t('loading')}</td></tr>}
            {rows && !shown.length && <tr><td colSpan="6">{t('noUsers')}</td></tr>}
            {shown.map(u => {
              const self = u.id === me.id
              return (
                <tr key={u.id}>
                  <td>{u.full_name || '–'}{self && <> ({t('you')})</>}<small>{u.email}</small></td>
                  <td>{u.business_name || '–'}</td>
                  <td><span className={'pill ' + u.status}>{t(u.status === 'active' ? 'statusActive' : 'statusSuspended')}</span></td>
                  <td>{date(u.created_at)}</td>
                  <td>{date(u.last_seen_at)}</td>
                  <td className="row-actions">
                    <button className="mini-btn danger" disabled={self} onClick={() => setStatus(u)}>{t(u.status === 'active' ? 'suspend' : 'reactivate')}</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}
