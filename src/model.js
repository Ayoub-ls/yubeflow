// Pure calculation module: no React, easy to test.
export const DEFAULTS = {
  price: 2500, cogs: 1100, cpa: 550, returnFee: 300, deliveryRate: 65,
  adTestCost: 44000, importedUnits: 120,
  cashNow: 150000, dailyAdBudget: 4500, leadTime: 20, safetyDays: 5, coverDays: 30, currentStock: 70,
  reinvestEvery: 7, splitCustom: 0, invShare: 0, adsShare: 0, soldCustom: 0, soldInv: 0, soldAds: 0,
}

const clean = raw => Object.fromEntries(Object.entries(raw).map(([k, x]) => [k, Math.max(0, Number(x) || 0)]))
const div = (a, b) => (b > 0 ? a / b : null)
const fmt = x => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(x || 0))
export const num = fmt
export const money = x => fmt(x) + ' DA'

// Shared unit economics. Every delivered order also "pays" for the failed orders
// around it (return fees) and for the ads that produced it (CAC = CPA / delivery rate).
function unitEconomics(v) {
  const d = Math.min(v.deliveryRate, 100) / 100
  const cac = div(v.cpa, d)
  if (cac === null) return { cac: null, returnCost: null, beforeCogs: null, profit: null }
  const returnCost = ((1 - d) / d) * v.returnFee
  const beforeCogs = v.price - returnCost - cac // what one delivered unit brings in, COGS not yet deducted
  return { cac, returnCost, beforeCogs, profit: beforeCogs - v.cogs }
}

export function breakEven(raw) {
  const v = clean(raw)
  const u = unitEconomics(v)
  const inventoryCost = v.importedUnits * v.cogs
  const totalInvestment = v.adTestCost + inventoryCost
  // Ad test: recovered from profit per unit (COGS of that unit already deducted).
  const adQ = u.profit > 0 ? Math.ceil(v.adTestCost / u.profit) : null
  // Full investment: inventory is paid upfront, so COGS is NOT deducted again per unit.
  const fullQ = u.beforeCogs > 0 ? Math.ceil(totalInvestment / u.beforeCogs) : null
  return { v, ...u, inventoryCost, totalInvestment, adQ, fullQ }
}

// Splits the revenue of one delivered unit (after failed-parcel fees) into inventory / ads / net, in %.
// Default: inventory = unit COGS, ads = CAC. Once the person drags the bar (splitCustom = 1) their shares win.
const FORECAST = { custom: 'splitCustom', inv: 'invShare', ads: 'adsShare' }
const SOLD = { custom: 'soldCustom', inv: 'soldInv', ads: 'soldAds' }

function splitOf(v, cac, returnCost, f = FORECAST) {
  const base = v.price - returnCost
  if (base <= 0) return null
  const defInv = Math.min(100, (v.cogs / base) * 100)
  const defAds = Math.min(100 - defInv, (cac / base) * 100)
  const custom = v[f.custom] === 1
  const inv = custom ? Math.min(100, v[f.inv]) : defInv
  const ads = custom ? Math.min(100 - inv, v[f.ads]) : defAds
  return { base, custom, inv, ads, net: 100 - inv - ads, defInv, defAds }
}

export function split(raw) {
  const v = clean(raw)
  const u = unitEconomics(v)
  return u.cac === null ? null : splitOf(v, u.cac, u.returnCost)
}

export function plan(raw) {
  const v = clean(raw)
  const { cac, returnCost } = unitEconomics(v)
  const s = cac ? splitOf(v, cac, returnCost) : null
  const dailyNow = cac ? div(v.dailyAdBudget, cac) : null // delivered units per day with today's budget
  if (!s || !dailyNow) return { v, cac, valid: false }
  // Every `reinvestEvery` days the ads share of revenue becomes the next ad budget.
  // Default share (= CAC) keeps the budget flat; a bigger share grows it, a smaller one shrinks it.
  const growth = s.custom ? ((s.ads / 100) * s.base) / cac : 1
  const nextBudget = v.dailyAdBudget * growth
  const daily = nextBudget / cac // forecasts use the budget you will run after reinvesting
  if (!(daily > 0)) return { v, cac, valid: false }
  const cycleRevenue = dailyNow * Math.max(1, v.reinvestEvery) * s.base
  const cycle = { ads: (cycleRevenue * s.ads) / 100, inventory: (cycleRevenue * s.inv) / 100, net: (cycleRevenue * s.net) / 100 }
  cycle.buyable = v.cogs > 0 ? Math.floor(cycle.inventory / v.cogs) : null
  const stockDays = v.currentStock / daily
  const orderInDays = stockDays - v.leadTime - v.safetyDays // <0 means the safe order date has passed
  const unitsNeeded = daily * (v.leadTime + v.safetyDays + v.coverDays)
  const qty = Math.max(0, Math.ceil(unitsNeeded - v.currentStock))
  const cost = qty * v.cogs
  const shortfall = Math.max(0, cost - v.cashNow)
  let tone = 'safe', status = 'Stock is healthy for now.'
  const days = Math.ceil(orderInDays)
  if (stockDays < v.leadTime) { tone = 'danger'; status = 'Late: you will run out before a new shipment can arrive.' }
  else if (orderInDays <= 0) { tone = 'warn'; status = 'Order now: you are inside your lead time plus safety buffer.' }
  else if (orderInDays <= 7) { tone = 'warn'; status = `Order within ${days} ${days === 1 ? 'day' : 'days'}.` }
  return { v, cac, valid: true, s, cycle, dailyNow, nextBudget, daily, stockDays, orderInDays, unitsNeeded, qty, cost, shortfall, tone, status,
    leftover: Math.max(0, v.cashNow - cost), affordable: v.cogs > 0 ? Math.floor(v.cashNow / v.cogs) : null }
}

// Money already earned: units sold = imported - still in stock, split with its own (editable) bar.
export function soldSoFar(raw) {
  const v = clean(raw)
  const u = unitEconomics(v)
  const s = u.cac === null ? null : splitOf(v, u.cac, u.returnCost, SOLD)
  if (!s) return null
  const units = Math.max(0, v.importedUnits - v.currentStock)
  const revenue = units * s.base // after failed-parcel fees
  const inventory = (revenue * s.inv) / 100
  return { v, s, units, revenue, ads: (revenue * s.ads) / 100, inventory, net: (revenue * s.net) / 100,
    buyable: v.cogs > 0 ? Math.floor(inventory / v.cogs) : null }
}
