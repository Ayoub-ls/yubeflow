// Pure calculation module: no React, easy to test.
export const DEFAULTS = {
  price: 2500, cogs: 1100, cpa: 550, returnFee: 300, deliveryRate: 65,
  adTestCost: 44000, importedUnits: 120,
  cashNow: 150000, dailyAdBudget: 4500, leadTime: 20, currentStock: 70, nextOrderUnits: 40,
  reinvestEvery: 7,
  testOrders: 4, gpToAds: 100,
}

const clean = raw => Object.fromEntries(Object.entries(raw).map(([k, x]) => [k, Math.max(0, Number(x) || 0)]))
const div = (a, b) => (b > 0 ? a / b : null)
const fmt = x => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(x || 0))
export const num = fmt
export const money = x => fmt(x) + ' DA'

// Shared unit economics. Every delivered order also "pays" for the failed orders
// around it (return fees) and for the ads that produced it (CAC = CPA / delivery rate).
export function unitEconomics(v) {
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

// Inventory and cash forecast. Sales are continuous within each daily rate, while
// ad reinvestment happens in discrete rounds of `reinvestEvery` days.
export function inventoryPlan(raw, xOverride) {
  const v = clean(raw)
  const { cac, returnCost } = unitEconomics(v)
  const x = Math.min(100, Math.max(0, xOverride ?? v.gpToAds)) / 100
  const g = v.price - (returnCost ?? 0) - v.cogs
  const R = v.reinvestEvery
  const H = 365
  if (!(g > 0) || !(cac > 0) || !(v.dailyAdBudget > 0) || !(v.deliveryRate > 0) || !(R > 0)) {
    return { v, valid: false, cac, g }
  }

  const u0 = v.dailyAdBudget / cac
  const r = (x * g) / cac
  const f = v.cogs + (1 - x) * g
  const cost = v.nextOrderUnits * v.cogs
  const ordersNeeded = Math.max(0, (cost - v.cashNow) / f)
  const rateAt = day => u0 * (r ** Math.floor((Math.max(day, 1) - 1) / R))
  const uncappedSalesAt = time => {
    if (time <= 0) return 0
    let total = 0
    for (let day = 1; day <= Math.ceil(Math.min(time, H)); day++) total += rateAt(day) * Math.min(1, Math.max(0, time - (day - 1)))
    return total
  }
  const timeToSales = target => {
    if (target <= 0) return 0
    let sold = 0
    for (let day = 1; day <= H; day++) {
      const rate = rateAt(day)
      if (sold + rate >= target) return (day - 1) + (target - sold) / rate
      sold += rate
    }
    return null
  }
  const tOut = v.currentStock > 0 ? timeToSales(v.currentStock) : 0
  const stockSalesAt = time => Math.min(v.currentStock, uncappedSalesAt(time))
  const cashAt = time => v.cashNow + f * stockSalesAt(Math.min(Math.max(time, 0), H))
  const canFundWithStock = ordersNeeded <= v.currentStock
  const tCash = canFundWithStock ? timeToSales(ordersNeeded) : null
  const maxCash = cashAt(H)
  const missing = Math.max(0, cost - maxCash)
  const latestOrderDay = tOut === null ? null : tOut - v.leadTime
  const cashAtD = latestOrderDay === null ? cashAt(H) : cashAt(Math.max(latestOrderDay, 0))
  const missingCash = Math.max(0, cost - cashAtD)
  const lateDays = tCash === null ? Infinity : tOut === null ? 0 : Math.max(0, tCash + v.leadTime - tOut)
  const possible = lateDays === 0
  const roundAtOut = tOut === null ? null : Math.floor(Math.max(tOut - 1e-9, 0) / R)
  const lastRoundRate = tOut === null ? null : rateAt(Math.max(tOut, 1))
  const chart = Array.from({ length: H + 1 }, (_, day) => ({ day, cash: cashAt(day), cost }))

  return { v, valid: true, x: x * 100, cac, returnCost, g, r, f, u0, cost, ordersNeeded, tOut, tCash,
    maxCash, missing, arrival: tCash === null ? Infinity : tCash + v.leadTime, lateDays, latestOrderDay,
    cashAtD, missingCash, possible, roundAtOut, lastRoundRate, chart }
}

export function inventoryRecommendation(raw) {
  const runs = Array.from({ length: 101 }, (_, x) => inventoryPlan(raw, x))
  const valid = runs.filter(run => run.valid)
  if (!valid.length) return { valid: false, runs }
  const feasible = valid.filter(run => run.possible)
  const best = feasible.length
    ? feasible[feasible.length - 1]
    : valid.reduce((a, b) => b.lateDays < a.lateDays || (b.lateDays === a.lateDays && b.missingCash < a.missingCash) ? b : a)
  return { valid: true, runs, recommended: best, noneWorks: !feasible.length,
    feasibleRange: feasible.length ? [feasible[0].x, feasible[feasible.length - 1].x] : null,
    shrinking: best.r < 1 }
}

// ---- Reinvestment rounds ("snowball") ----
// The ad test gives `testOrders` orders; their gross profit (GP) funds round 1.
// Each round, gpToAds % of the previous round's GP buys ads at CAC and the rest is kept as cash.
// Money recovered = cash kept so far + GP of the current round. Break-even = when it reaches the investment.
export function snowball(raw) {
  const v = clean(raw)
  const u = unitEconomics(v)
  const gpPerOrder = u.cac === null ? 0 : v.price - u.returnCost - v.cogs
  const share = Math.min(v.gpToAds, 100) / 100
  const investment = v.importedUnits * v.cogs + v.adTestCost
  const out = { v, g: gpPerOrder, cac: u.cac, investment, rounds: [], hit: null }

  if (!(gpPerOrder > 0) || !(v.testOrders > 0) || !(u.cac > 0)) return out

  const first = {
    k: 0,
    orders: v.testOrders,
    total: v.testOrders,
    gp: v.testOrders * gpPerOrder,
    inventoryRecovered: v.testOrders * v.cogs,
    start: 0,
    end: v.testOrders * (gpPerOrder + v.cogs),
  }
  out.rounds.push(first)

  if (first.end >= investment) out.hit = { k: 0, orders: investment / (gpPerOrder + v.cogs) }

  for (let k = 1; k <= 60 && !out.hit; k++) {
    const prev = out.rounds[k - 1]
    const start = prev.start + (1 - share) * prev.gp + prev.inventoryRecovered
    const orders = (share * prev.gp) / u.cac
    const gp = orders * gpPerOrder
    const inventoryRecovered = orders * v.cogs
    const round = {
      k,
      orders,
      total: prev.total + orders,
      gp,
      inventoryRecovered,
      start,
      end: start + gp + inventoryRecovered,
    }

    out.rounds.push(round)

    if (round.end >= investment) {
      out.hit = {
        k,
        orders: prev.total + (investment - start) / (gpPerOrder + v.cogs),
      }
    } else if (orders < 1e-6) break
  }

  return out
}
