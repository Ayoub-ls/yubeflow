import { useMemo } from 'react'
import InputPanel from './Inputs.jsx'
import SplitBar, { SOLD_KEYS } from './SplitBar.jsx'
import { plan, soldSoFar } from './model.js'
import { formatMoney, formatNumber } from './i18n.js'

const KEYS = ['price', 'cogs', 'cpa', 'deliveryRate', 'cashNow', 'dailyAdBudget', 'reinvestEvery', 'currentStock', 'importedUnits', 'leadTime', 'safetyDays', 'coverDays']
function Card({ title, value, note, tone = '' }) {
  return <article className={'simple-card ' + tone}><span>{title}</span><strong>{value}</strong><small>{note}</small></article>
}

export default function Planner({ state, set, reset, t, locale }) {
  const money = x => formatMoney(x, locale), num = x => formatNumber(x, locale)
  const m = useMemo(() => plan(state), [state])
  const sold = useMemo(() => soldSoFar(state), [state])
  const ok = m.valid
  const orderBy = !ok ? t('unavailable') : m.orderInDays <= 0 ? t('now') : t('inDays', { value: num(Math.floor(m.orderInDays)) })
  const status = !ok ? '' : m.tone === 'safe' ? t('statusSafe') : m.tone === 'danger' ? t('statusLate') : m.orderInDays <= 0 ? t('statusWarn') : t('statusSoon', { value: num(Math.ceil(m.orderInDays)) })
  const stockShare = ok ? Math.min(100, (m.v.currentStock / Math.max(m.unitsNeeded, 1)) * 100) : 0
  return (
    <main className="simple-planner shell">
      <section className="english-hero">
        <div>
          <h1>{t('plannerTitle')}</h1><p>{t('plannerDesc')}</p>
        </div>
        {ok && <div className={'english-status ' + m.tone}>{status}</div>}
      </section>
      <InputPanel title={t('planningInputs')} keys={KEYS} state={state} set={set} reset={reset} t={t} />
      <p className="assumption">{t('assumption')}</p>
      {sold && (
        <>
          <SplitBar s={sold.s} set={set} reset={() => set('soldCustom', 0)} keys={SOLD_KEYS} title={t('soldSplit')} intro={t('soldIntro')} t={t} locale={locale} />
          <section className="result-section">
            <div className="section-title"><h2>{t('soldTitle')}</h2></div>
            <div className="simple-grid">
              <Card title={t('unitsSold')} value={num(sold.units)} note={`${num(sold.v.importedUnits)} − ${num(sold.v.currentStock)}`} />
              <Card title={t('revenue')} value={money(sold.revenue)} note={t('afterFees')} />
              <Card title={t('reinvestedAds')} value={money(sold.ads)} note={`${sold.s.ads.toFixed(0)}%`} />
              <Card title={t('savedInventory')} value={money(sold.inventory)} note={t('buyAbout', { value: num(sold.buyable) })} />
              <Card title={t('netProfit')} value={money(sold.net)} note={`${sold.s.net.toFixed(0)}%`} tone="good" />
            </div>
          </section>
        </>
      )}
      {!ok ? <p className="empty-note">{t('forecastEmpty')}</p> : (
        <>
          <SplitBar s={m.s} set={set} reset={() => set('splitCustom', 0)}
            title={t('nextRevenue', { days: num(m.v.reinvestEvery) })} t={t} locale={locale} />
          <section className="result-section">
            <div className="section-title"><h2>{t('nextDays', { days: num(m.v.reinvestEvery) })}</h2></div>
            <div className="simple-grid">
              <Card title={t('adBudget')} value={money(m.nextBudget)} note={t('todayAfter', { value: money(m.v.dailyAdBudget) })} tone={m.s.custom ? 'featured' : ''} />
              <Card title={t('reinvestedAds')} value={money(m.cycle.ads)} note={`${m.s.ads.toFixed(0)}%`} />
              <Card title={t('savedInventory')} value={money(m.cycle.inventory)} note={t('buyAbout', { value: num(m.cycle.buyable) })} />
              <Card title={t('netProfit')} value={money(m.cycle.net)} note={`${m.s.net.toFixed(0)}%`} tone="good" />
            </div>
          </section>
          <section className="result-section">
            <div className="section-title"><h2>{t('whenOrder')}</h2></div>
            <div className="simple-grid">
              <Card title={t('dailySales')} value={`${m.daily.toFixed(1)} ${t('units')}`} note={`CAC: ${money(m.cac)}`} />
              <Card title={t('stockLeft')} value={`${m.stockDays.toFixed(1)} ${t('days')}`} note={t('currentStock')} tone={m.tone === 'danger' ? 'danger' : ''} />
              <Card title={t('placeOrder')} value={orderBy} note={t('stockMustLast', { value: num(m.v.leadTime + m.v.safetyDays) })} tone="featured" />
            </div>
          </section>
          <section className="result-section">
            <div className="section-title"><h2>{t('howMuch')}</h2></div>
            <div className="simple-grid">
              <Card title={t('recommended')} value={`${num(m.qty)} ${t('units')}`} note={t('covers', { value: num(m.v.coverDays) })} tone="featured" />
              <Card title={t('orderCost')} value={money(m.cost)} note={t('unitsCogs')} />
              <Card title={t('savedAfter')} value={money(m.leftover)} note={t('affordable', { value: num(m.affordable) })} />
              <Card title={t('shortfall')} value={money(m.shortfall)} note={t('costMinusSaved')} tone={m.shortfall > 0 ? 'danger' : 'good'} />
            </div>
          </section>
          <section className="coverage">
            <div className="section-title"><h2>{t('stockNeed')}</h2></div>
            <div className="coverage-bar"><i className="stock" style={{ width: stockShare + '%' }} /><i className="need" style={{ width: 100 - stockShare + '%' }} /></div>
            <div className="coverage-key">
              <span><i className="stock" />{t('currentStockLabel', { value: num(m.v.currentStock) })}</span>
              <span><i className="need" />{t('needed', { value: num(m.unitsNeeded) })}</span>
            </div>
          </section>
          <section className={'english-recommendation ' + m.tone}>
            
            <h2>{status}</h2>
            <p>{t('recommendation', { daily: m.daily.toFixed(1), stock: num(m.stockDays), qty: num(m.qty), cost: money(m.cost) })} {' '}{m.shortfall > 0 ? t('shortMessage', { value: money(m.shortfall) }) : t('covered')}</p>
            <small>{t('estimate')}</small>
          </section>
        </>
      )}
    </main>
  )
}
