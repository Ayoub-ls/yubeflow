import { useMemo } from 'react'
import { Area, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import InputPanel from './Inputs.jsx'
import { breakEven } from './model.js'
import { formatMoney, formatNumber } from './i18n.js'

const KEYS = ['price', 'cogs', 'cpa', 'returnFee', 'deliveryRate', 'adTestCost', 'importedUnits']

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

export default function BreakEven({ state, set, reset, t, locale }) {
  const money = x => formatMoney(x, locale), num = x => formatNumber(x, locale)
  const m = useMemo(() => breakEven(state), [state])
  return (
    <main className="english-break shell">
      <section className="english-hero">
        <div>
          <h1>{t('breakTitle')}</h1><p>{t('breakDesc')}</p>
        </div>
      </section>
      <InputPanel title={t('breakInputs')} keys={KEYS} state={state} set={set} reset={reset} t={t} />
      <section className="english-kpis">
        <div>{t('totalInvested')}<strong>{money(m.totalInvestment)}</strong><small>{t('adTest')} {money(m.v.adTestCost)} + {t('inventory').toLowerCase()} {money(m.inventoryCost)}</small></div>
        <div>{t('realCac')}<strong>{m.cac === null ? t('unavailable') : money(m.cac)}</strong><small>CPA ÷ {t('deliveryRate')[0].toLowerCase()}</small></div>
        <div>{t('profitUnit')}<strong className={m.profit > 0 ? 'up' : 'down'}>{m.profit === null ? t('unavailable') : money(m.profit)}</strong><small>{t('afterFees')}</small></div>
        <div>{t('returnCost')}<strong>{m.returnCost === null ? t('unavailable') : money(m.returnCost)}</strong><small>{t('afterFees')}</small></div>
      </section>
      <div className="row2">
        <Chart gid="g1" eyebrow={t('step1')} title={t('winAd')} q={m.adQ} perUnit={m.profit} target={m.v.adTestCost} units={m.v.importedUnits} targetLabel={t('adTestCost')} why={t('whyProfit')} t={t} locale={locale} />
        <Split ad={m.v.adTestCost} inventory={m.inventoryCost} t={t} locale={locale} />
      </div>
      <Chart gid="g2" eyebrow={t('step2')} title={t('winFull')} q={m.fullQ} perUnit={m.beforeCogs} target={m.totalInvestment} units={m.v.importedUnits} targetLabel={t('fullInvestment')} why={t('whyBeforeCogs')} t={t} locale={locale} />
    </main>
  )
}
