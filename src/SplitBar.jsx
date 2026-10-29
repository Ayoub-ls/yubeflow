import { useRef } from 'react'
import { formatMoney } from './i18n.js'

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))
export const FORECAST_KEYS = { custom: 'splitCustom', inv: 'invShare', ads: 'adsShare' }
export const SOLD_KEYS = { custom: 'soldCustom', inv: 'soldInv', ads: 'soldAds' }
const SEGS = [['net', 'net'], ['ads', 'ads'], ['inv', 'inventory']]

// Three-part bar: net | ads | inventory. Handle A moves net/ads, handle B moves ads/inventory.
export default function SplitBar({ s, set, reset, keys = FORECAST_KEYS, title, intro, t, locale }) {
  const money = x => formatMoney(x, locale)
  const ref = useRef(null)
  const apply = (inv, ads) => { set(keys.inv, +inv.toFixed(1)); set(keys.ads, +ads.toFixed(1)); set(keys.custom, 1) }
  const move = (which, p) => {
    if (which === 'A') apply(s.inv, 100 - s.inv - clamp(p, 0, 100 - s.inv))
    else { const b = clamp(p, s.net, 100); apply(100 - b, b - s.net) }
  }
  const drag = which => e => {
    if (e.buttons !== 1) return
    const r = ref.current.getBoundingClientRect()
    move(which, ((e.clientX - r.left) / r.width) * 100)
  }
  const key = (which, pos) => e => {
    const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    if (d) { e.preventDefault(); move(which, pos + d) }
  }
  const grip = (which, pos, label) => (
    <button className="grip" role="slider" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos)}
      style={{ left: pos + '%' }} onPointerDown={e => e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={drag(which)} onKeyDown={key(which, pos)} />
  )
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title || t('splitTitle')}</h2><p>{intro || t('splitIntro')}</p>
        </div>
        <button onClick={reset} disabled={!s.custom}>{t('backDefaults')}</button>
      </div>
      <div className="legend-row">{SEGS.map(([k, n]) => <span key={k}><i className={'dot ' + k} />{t(n)}</span>)}</div>
      <div className="splitbar" ref={ref}>
        {SEGS.map(([k, n]) => (
          <div key={k} className={'seg ' + k} style={{ width: s[k] + '%' }}>
            <b>{s[k].toFixed(0)}%</b><small>{money((s[k] * s.base) / 100)}</small>
          </div>
        ))}
        {grip('A', s.net, t('boundaryA'))}{grip('B', s.net + s.ads, t('boundaryB'))}
      </div>
      <p className="split-note">{s.custom
        ? t('customSplit', { ads: s.defAds.toFixed(0), inventory: s.defInv.toFixed(0) }) : t('defaultSplit')}</p>
    </section>
  )
}
