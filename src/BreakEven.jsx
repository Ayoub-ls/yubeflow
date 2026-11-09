import { useMemo } from 'react'
import { Area, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import InputPanel from './Inputs.jsx'
import { breakEven, snowball } from './model.js'
import { formatMoney, formatNumber } from './i18n.js'
const KEYS = ['price', 'cogs', 'cpa', 'returnFee', 'confirmationRate', 'deliveryRate', 'adTestCost', 'testOrders', 'importedUnits', 'gpToAds', 'reinvestEvery']
const SCALE_KEYS = KEYS.flatMap(k => (k === 'gpToAds' ? [k, 'cacRise'] : [k])) // same inputs plus the CAC rise
const TIP = { background: 'var(--tooltip)', border: '1px solid var(--card-border)', borderRadius: 10, color: 'var(--ink)', boxShadow: 'var(--tooltip-shadow)' }
const TICK = { fill: 'var(--muted)', fontSize: 12 }

function Chart({ gid, eyebrow, title, q, perUnit, target, units, targetLabel, why, t, locale }) {
  const num = x => formatNumber(x, locale), money = x => formatMoney(x, locale)
  const max = Math.max(Math.ceil((q || 0) * 1.3), units, 10)
  const step = Math.max(1, Math.ceil(max / 40))
  const data = []
  for (let x = 0; x <= max; x += step) data.push({ x, recovered: x * perUnit, target })
  const tooMany = q !== null && q > units
  return (
    <section className="english-chart">
      <h2>{title}<small>{eyebrow}</small></h2>
      {q === null ? <p className="chart-warning">{t('chartUnavailable', { why })}</p> : (
        <>
          <b className="q">{t('needOrders', { value: num(q) })}</b>
          {tooMany && <p className="chart-warning">{t('tooMany', { units: num(units) })}</p>}
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data}>
              <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--cyan)" stopOpacity={0.42} /><stop offset="55%" stopColor="var(--blue)" stopOpacity={0.16} /><stop offset="100%" stopColor="var(--blue)" stopOpacity={0} /></linearGradient><filter id={gid + '-glow'} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="x" type="number" domain={[0, max]} tick={TICK} stroke="var(--chart-grid)" label={{ value: t('deliveredOrders'), position: 'insideBottom', offset: -3, fill: 'var(--muted)' }} />
              <YAxis width={70} tickFormatter={num} tick={TICK} stroke="var(--chart-grid)" />
              <Tooltip contentStyle={TIP} formatter={money} labelFormatter={x => `${num(x)} ${t('deliveredOrders')}`} />
              <Legend />
              <ReferenceArea x1={0} x2={q} fill="var(--red)" fillOpacity={0.05} />
              <ReferenceArea x1={q} x2={max} fill="var(--cyan)" fillOpacity={0.045} />
              <Area type="monotone" dataKey="recovered" name={t('moneyRecovered')} stroke="var(--cyan)" strokeWidth={3} fill={`url(#${gid})`} filter={`url(#${gid}-glow)`} dot={false} />
              <Line type="linear" dataKey="target" name={targetLabel} stroke="var(--blue)" strokeWidth={2.5} dot={false} />
              <ReferenceLine x={q} stroke="var(--cyan)" strokeDasharray="6 4" label={{ value: t('breakEven', { value: num(q) }), fill: 'var(--cyan)', fontSize: 12 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}
    </section>
  )
}
function Split({ ad, inventory, t, locale }) {
  const money = x => formatMoney(x, locale)
  const data = [{ name: t('adTest'), value: ad, color: 'var(--blue)' }, { name: t('inventory'), value: inventory, color: 'var(--cyan)' }]
  const total = ad + inventory
  return (
    <section className="english-chart">
      <h2>{t('moneyWent')}<small>{t('totalInvestment')}</small></h2>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart><Pie data={data} dataKey="value" innerRadius={55} outerRadius={85} stroke="none" paddingAngle={2}>{data.map(d => <Cell key={d.name} fill={d.color} />)}</Pie>
          <Tooltip contentStyle={TIP} formatter={money} /></PieChart>
      </ResponsiveContainer>
      <ul className="legend">{data.map(d => <li key={d.name}><i style={{ background: d.color }} />{d.name}<b>{total ? Math.round((d.value / total) * 100) : 0}%</b></li>)}</ul>
    </section>
  )
}
// Scaling only: CAC rises every round, gross profit per order does not. Where the lines cross, scaling stops paying.
function CacChart({ s, rise, t, locale }) {
  const num = x => formatNumber(x, locale), money = x => formatMoney(x, locale)
  const ok = s.g > 0 && s.cac > 0
  const last = Math.min(20, Math.max(6, (s.hit ? s.hit.k : 0) + 2, s.stopRound ? s.stopRound + 1 : 0))
  const data = ok ? Array.from({ length: last }, (_, i) => ({ x: i + 1, cac: s.cac * (1 + rise / 100) ** i, gp: s.g })) : []
  const stopCac = s.stopRound ? s.cac * (1 + rise / 100) ** (s.stopRound - 1) : null
  return (
    <section className="english-chart">
      <h2>{t('cacChartTitle')}<small>{t('step1')}</small></h2>
      {!ok ? <p className="chart-warning">{t('chartUnavailable', { why: t('whyProfit') })}</p> : (
        <>
          <b className="q">{s.stopRound ? t('cacStop', { round: num(s.stopRound), cac: money(stopCac), gp: money(s.g) }) : t('cacNeverStops')}</b>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data}>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="x" type="number" domain={[1, last]} ticks={data.map(d => d.x)} allowDecimals={false} tick={TICK} stroke="var(--chart-grid)" label={{ value: t('roundWord'), position: 'insideBottom', offset: -3, fill: 'var(--muted)' }} />
              <YAxis width={70} tickFormatter={num} tick={TICK} stroke="var(--chart-grid)" />
              <Tooltip contentStyle={TIP} formatter={money} labelFormatter={k => `${t('roundWord')} ${k}`} />
              <Legend />
              <Line type="linear" dataKey="gp" name={t('gpLine')} stroke="var(--cyan)" strokeWidth={2.5} dot={false} />
              <Line type="linear" dataKey="cac" name={t('cacLine')} stroke="var(--red)" strokeWidth={3} dot={{ r: 3 }} />
              {s.stopRound && s.stopRound <= last && <ReferenceLine x={s.stopRound} stroke="var(--red)" strokeDasharray="6 4" label={{ value: `${t('roundWord')} ${s.stopRound}`, position: 'insideTopLeft', fill: 'var(--red)', fontSize: 12 }} />}
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}
    </section>
  )
}

function Snowball({ s, t, locale }) {
  const num = x => formatNumber(x, locale), money = x => formatMoney(x, locale)
  const { hit, rounds, investment, v } = s
  const shown = hit ? rounds : []
  const headline = hit && t('needRounds', { rounds: num(hit.k), days: num(hit.k * v.reinvestEvery), orders: num(Math.ceil(hit.orders)) })
  const warning = hit && hit.orders > v.importedUnits ? t('tooMany', { units: num(v.importedUnits) }) : null

  const byRound = shown.map(r => ({ x: r.k, recovered: r.end, kept: r.start, target: investment }))
  const byOrders = shown.flatMap(r => [{ x: r.total - r.orders, recovered: r.start, target: investment }, { x: r.total, recovered: r.end, target: investment }])
  const lastOrders = shown.length ? Math.ceil(shown[shown.length - 1].total) : 0

  const defs = id => (
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--cyan)" stopOpacity={0.42} /><stop offset="100%" stopColor="var(--blue)" stopOpacity={0} /></linearGradient></defs>
  )
  const frame = (title, body) => (
    <section className="english-chart">
      <h2>{title}<small>{t('step2')}</small></h2>
      {!hit ? <p className="chart-warning">{t('chartUnavailable', { why: t('whyNoGrowth') })}</p> : (
        <>
          <b className="q">{headline}</b>
          {warning && <p className="chart-warning">{warning}</p>}
          {body}
        </>
      )}
    </section>
  )

  return (
    <>
      {frame(t('byRounds'), hit && (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={byRound}>
            {defs('g-rounds')}
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="x" type="number" domain={[0, Math.max(hit.k, 1)]} ticks={byRound.map(r => r.x)} allowDecimals={false} tick={TICK} stroke="var(--chart-grid)"
              tickFormatter={k => (k === 0 ? t('testRound') : k)} label={{ value: t('roundsAxis', { days: num(v.reinvestEvery) }), position: 'insideBottom', offset: -3, fill: 'var(--muted)' }} />
            <YAxis width={70} tickFormatter={num} tick={TICK} stroke="var(--chart-grid)" />
            <Tooltip contentStyle={TIP} formatter={money} labelFormatter={k => (k === 0 ? t('testRound') : `${t('roundWord')} ${k}`)} />
            <Legend />
            <Area type="linear" dataKey="recovered" name={t('recoveredEnd')} stroke="var(--cyan)" strokeWidth={3} fill="url(#g-rounds)" dot={{ r: 4 }} />
            <Line type="linear" dataKey="kept" name={t('keptCash')} stroke="var(--green)" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="linear" dataKey="target" name={t('fullInvestment')} stroke="var(--blue)" strokeWidth={2.5} dot={false} />
            <ReferenceLine x={hit.k} stroke="var(--cyan)" strokeDasharray="6 4" label={{ value: t('roundBreakEven', { value: hit.k }), position: 'insideTopLeft', fill: 'var(--cyan)', fontSize: 12 }} />
          </ComposedChart>
        </ResponsiveContainer>
      ))}
      {frame(t('byOrders'), hit && (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={byOrders}>
            {defs('g-orders')}
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="x" type="number" domain={[0, lastOrders]} tickFormatter={num} tick={TICK} stroke="var(--chart-grid)" label={{ value: t('deliveredOrders'), position: 'insideBottom', offset: -3, fill: 'var(--muted)' }} />
            <YAxis width={70} tickFormatter={num} tick={TICK} stroke="var(--chart-grid)" />
            <Tooltip contentStyle={TIP} formatter={money} labelFormatter={x => `${num(x)} ${t('deliveredOrders')}`} />
            <Legend />
            <Area type="linear" dataKey="recovered" name={t('moneyRecovered')} stroke="var(--cyan)" strokeWidth={3} fill="url(#g-orders)" dot={false} />
            <Line type="linear" dataKey="target" name={t('fullInvestment')} stroke="var(--blue)" strokeWidth={2.5} dot={false} />
            <ReferenceLine x={hit.orders} stroke="var(--cyan)" strokeDasharray="6 4" label={{ value: t('breakEven', { value: num(hit.orders) }), fill: 'var(--cyan)', fontSize: 12 }} />
          </ComposedChart>
        </ResponsiveContainer>
      ))}
    </>
  )
}

export default function BreakEven({ state, set, reset, t, locale, scaling = false }) {
  const money = x => formatMoney(x, locale), num = x => formatNumber(x, locale)
  const m = useMemo(() => breakEven(state), [state])
  const rise = scaling ? state.cacRise : 0 // the normal tab keeps CAC flat
  const s = useMemo(() => snowball(state, rise), [state, rise])
  const cacAtBreakEven = s.hit && s.hit.k >= 1 ? s.rounds[s.hit.k].cac : null
  return (
    <main className="english-break shell">
      <section className="english-hero">
        <div>
          <h1>{t(scaling ? 'breakScaleTitle' : 'breakTitle')}</h1><p>{t(scaling ? 'breakScaleDesc' : 'breakDesc')}</p>
        </div>
      </section>
      <InputPanel title={t('breakInputs')} keys={scaling ? SCALE_KEYS : KEYS} state={state} set={set} reset={reset} t={t} />
      <section className="english-kpis">
        <div>{t('totalInvested')}<strong>{money(m.totalInvestment)}</strong><small>{t('adTest')} {money(m.v.adTestCost)} + {t('inventory').toLowerCase()} {money(m.inventoryCost)}</small></div>
        <div>{t('realCac')}<strong>{m.cac === null ? t('unavailable') : money(m.cac)}</strong><small>{scaling ? t('cacRisesNote', { value: num(rise) }) : <>CPA ÷ ({t('confirmationRate')[0].toLowerCase()} × {t('deliveryRate')[0].toLowerCase()})</>}</small></div>
        <div>{t('profitUnit')}<strong className={m.profit > 0 ? 'up' : 'down'}>{m.profit === null ? t('unavailable') : money(m.profit)}</strong><small>{t('afterFees')}</small></div>
        {scaling && <div>{t('cacAtBreakEven')}<strong>{cacAtBreakEven === null ? t('unavailable') : money(cacAtBreakEven)}</strong><small>{cacAtBreakEven === null ? '' : t('inRound', { round: num(s.hit.k) })}</small></div>}
        <div>{t('returnCost')}<strong>{m.returnCost === null ? t('unavailable') : money(m.returnCost)}</strong><small>{t('afterFees')}</small></div>
      </section>
      <div className="row2">
        {scaling ? <CacChart s={s} rise={rise} t={t} locale={locale} /> : (
        <Chart gid="g1" eyebrow={t('step1')} title={t('winAd')} q={m.adQ} perUnit={m.profit} target={m.v.adTestCost} units={m.v.importedUnits} targetLabel={t('adTestCost')} why={t('whyProfit')} t={t} locale={locale} />
         )}
        <Split ad={m.v.adTestCost} inventory={m.inventoryCost} t={t} locale={locale} />
      </div>
        <Snowball s={s} t={t} locale={locale} />
    </main>
  )
}
