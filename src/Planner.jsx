import { useMemo } from 'react'
import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import InputPanel from './Inputs.jsx'
import { inventoryPlan, inventoryRecommendation } from './model.js'
import { formatMoney, formatNumber } from './i18n.js'

const KEYS = ['price', 'cogs', 'cpa', 'returnFee', 'deliveryRate', 'gpToAds', 'reinvestEvery', 'dailyAdBudget', 'currentStock', 'cashNow', 'nextOrderUnits', 'leadTime']
const TIP = { background: 'var(--tooltip)', border: '1px solid var(--card-border)', borderRadius: 10, color: 'var(--ink)', boxShadow: 'var(--tooltip-shadow)' }
const TICK = { fill: 'var(--muted)', fontSize: 12 }
function Card({ title, value, note, tone = '' }) { return <article className={'simple-card ' + tone}><span>{title}</span><strong>{value}</strong><small>{note}</small></article> }

function CashChart({ m, t, locale }) {
  const money = x => formatMoney(x, locale), num = x => formatNumber(x, locale)
  return <section className="english-chart"><h2>{t('cashChartTitle')}<small>{t('cashChartSubtitle')}</small></h2><ResponsiveContainer width="100%" height={320}><ComposedChart data={m.chart}>
    <defs><linearGradient id="inventory-cash" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--cyan)" stopOpacity={0.42} /><stop offset="55%" stopColor="var(--blue)" stopOpacity={0.16} /><stop offset="100%" stopColor="var(--blue)" stopOpacity={0} /></linearGradient><filter id="inventory-cash-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
    <CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="day" tick={TICK} stroke="var(--chart-grid)" label={{ value: t('days'), position: 'insideBottom', offset: -3, fill: 'var(--muted)' }} /><YAxis width={70} tickFormatter={num} tick={TICK} stroke="var(--chart-grid)" /><Tooltip contentStyle={TIP} formatter={money} labelFormatter={day => t('dayNumber', { value: num(day) })} /><Legend />
    <Area type="monotone" dataKey="cash" name={t('freeCash')} stroke="var(--cyan)" strokeWidth={3} fill="url(#inventory-cash)" filter="url(#inventory-cash-glow)" dot={false} /><Line type="linear" dataKey="cost" name={t('cashNeeded')} stroke="var(--blue)" strokeWidth={2.5} dot={false} />
    {m.tOut !== null && <ReferenceLine x={m.tOut} stroke="var(--red)" strokeDasharray="6 4" label={{ value: t('stockRunsOut'), fill: 'var(--red)', fontSize: 12 }} />}{m.latestOrderDay !== null && m.latestOrderDay >= 0 && <ReferenceLine x={m.latestOrderDay} stroke="var(--cyan)" strokeDasharray="6 4" label={{ value: t('latestOrder'), fill: 'var(--cyan)', fontSize: 12 }} />}
  </ComposedChart></ResponsiveContainer></section>
}

export default function Planner({ state, set, reset, t, locale }) {
  const money = x => formatMoney(x, locale), num = x => formatNumber(x, locale)
  const m = useMemo(() => inventoryPlan(state), [state])
  const recommendation = useMemo(() => inventoryRecommendation(state), [state])
  if (!m.valid) return <main className="simple-planner shell"><section className="english-hero"><div><h1>{t('plannerTitle')}</h1><p>{t('plannerDesc')}</p></div></section><InputPanel title={t('planningInputs')} keys={KEYS} state={state} set={set} reset={reset} t={t} /><p className="empty-note">{t('inventoryEmpty')}</p></main>
  const stockOut = m.tOut === null ? t('stockMoreYear', { fading: m.r < 1 ? t('salesFading') : t('salesContinue') }) : `${num(m.tOut)} ${t('days')}`
  const cashDays = m.tCash === null ? t('unavailable') : `${num(m.tCash)} ${t('days')}`
  const latest = m.latestOrderDay === null ? t('unavailable') : m.latestOrderDay < 0 ? t('alreadyPassed') : t('dayNumber', { value: num(m.latestOrderDay) })
  const gap = m.lateDays === Infinity ? t('unavailable') : `${num(m.lateDays)} ${t('days')}`
  const status = m.possible ? t('inTime') : m.tCash === null ? t('cannotFund') : m.latestOrderDay < 0 ? t('cannotArrive') : t('lateShipment')
  return <main className="simple-planner shell">
    <section className="english-hero"><div><h1>{t('plannerTitle')}</h1><p>{t('plannerDesc')}</p></div></section><InputPanel title={t('planningInputs')} keys={KEYS} state={state} set={set} reset={reset} t={t} />
    <section className="result-section"><div className="section-title"><h2>{t('stockQuestion')}</h2></div><div className="simple-grid"><Card title={t('daysUntilStockOut')} value={stockOut} note={m.tOut === null ? t('stockForecastNote') : t('inRound', { value: num(m.roundAtOut + 1) })} tone={m.tOut === null ? 'featured' : ''} /><Card title={t('salesPerDay')} value={`${num(m.u0)} → ${m.tOut === null ? t('unavailable') : num(m.lastRoundRate)} ${t('units')}`} note={t('salesNowToLast')} /></div></section>
    <section className="result-section"><div className="section-title"><h2>{t('cashQuestion')}</h2></div><div className="simple-grid"><Card title={t('cashNeeded')} value={money(m.cost)} note={t('unitsTimesCogs', { units: num(m.v.nextOrderUnits) })} /><Card title={t('ordersNeeded')} value={num(m.ordersNeeded)} note={t('deliveredOrders')} /><Card title={t('daysToCash')} value={cashDays} note={m.tCash === null ? t('maxCashNote', { value: money(m.maxCash) }) : t('cashTargetNote')} tone={m.tCash === null ? 'danger' : ''} /></div>{m.tCash === null && <p className="chart-warning">{t('moreThanStock', { stock: num(m.v.currentStock), missing: money(m.missing) })}</p>}</section>
    <section className="result-section"><div className="section-title"><h2>{t('timingQuestion')}</h2></div><div className={'english-status ' + (m.possible ? 'safe' : 'danger')}>{status}</div><div className="simple-grid"><Card title={t('latestOrderDay')} value={latest} note={m.latestOrderDay !== null && m.latestOrderDay < 0 ? t('leadTimeTooLong') : t('toArriveInTime')} tone="featured" /><Card title={t('cashByThen')} value={money(m.cashAtD)} note={t('freeCash')} /><Card title={t('cashMissing')} value={money(m.missingCash)} note={t('cashNeeded')} tone={m.missingCash > 0 ? 'danger' : 'good'} /><Card title={t('daysWithoutStock')} value={gap} note={t('ifOrderWhenFunded')} tone={m.lateDays > 0 ? 'danger' : 'good'} /></div></section>
    <section className="result-section"><div className="section-title"><h2>{t('reinvestmentQuestion')}</h2></div><div className="simple-grid"><Card title={t('recommendedReinvestment')} value={`${num(recommendation.recommended.x)}%`} note={recommendation.noneWorks ? t('noneWorks') : t('highestWorks')} tone="featured" /><Card title={t('feasibleRange')} value={recommendation.feasibleRange ? `${num(recommendation.feasibleRange[0])}% – ${num(recommendation.feasibleRange[1])}%` : t('none')} note={t('reinvestmentRangeNote')} /><Card title={t('useRecommendation')} value={<button className="mini-btn" onClick={() => set('gpToAds', recommendation.recommended.x)}>{t('useThisPercent')}</button>} note={t('updatesAdsInput')} /></div>{recommendation.shrinking && <p className="chart-warning">{t('salesShrinking')}</p>}{recommendation.noneWorks && <p className="chart-warning">{t('noneWorksGap', { value: money(recommendation.recommended.missingCash) })}</p>}</section>
    <CashChart m={m} t={t} locale={locale} />
  </main>
}
