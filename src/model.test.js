import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULTS, breakEven, inventoryPlan, inventoryRecommendation, snowball, unitEconomics } from './model.js'
import { dictionaries } from './i18n.js'

test('full break-even does not deduct COGS twice', () => {
  const m = breakEven({ ...DEFAULTS, deliveryRate: 100, cpa: 500, returnFee: 0, price: 2000, cogs: 1000, importedUnits: 100, adTestCost: 10000 })
  assert.equal(m.fullQ, Math.ceil((10000 + 100000) / (2000 - 500)))
  assert.equal(m.adQ, Math.ceil(10000 / (2000 - 500 - 1000)))
})
test('return cost per delivery follows delivery rate', () => {
  assert.ok(Math.abs(breakEven({ ...DEFAULTS, deliveryRate: 70, returnFee: 300 }).returnCost - (0.3 / 0.7) * 300) < 1e-9)
})
test('unprofitable units give no break-even', () => {
  assert.equal(breakEven({ ...DEFAULTS, cogs: 5000 }).adQ, null)
  assert.equal(breakEven({ ...DEFAULTS, deliveryRate: 0 }).fullQ, null)
})
const inventoryExample = { ...DEFAULTS, price: 3000, cogs: 1000, cpa: 250, deliveryRate: 50, returnFee: 0, testOrders: 4, currentStock: 80, cashNow: 5000, nextOrderUnits: 40, leadTime: 20, reinvestEvery: 7 }
const close = (actual, expected, tolerance = 0.02) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} is not close to ${expected}`)

test('ad budget after the test = X% x GP x orders from the ad test, spread over one round', () => {
  const p = inventoryPlan({ ...inventoryExample, gpToAds: 75 })
  assert.equal(p.adBudgetAfterTest, 0.75 * 2000 * 4) // 6000
  close(p.dailyAdBudget, 6000 / 7)
  close(p.u0, 6000 / 7 / 500) // delivered units per day at CAC 500
})
test('inventory plan calculates the 75% scenario continuously', () => {
  const p = inventoryPlan({ ...inventoryExample, gpToAds: 75 })
  assert.equal(p.valid, true)
  close(p.tOut, 16.074)
  close(p.ordersNeeded, 23.333)
  close(p.tCash, 9.204)
  close(p.latestOrderDay, -3.926)
  assert.equal(p.missingCash, 35000)
  close(p.lateDays, 13.13)
  assert.equal(p.possible, false)
})
test('inventory plan finds the 25% scenario feasible', () => {
  const p = inventoryPlan({ ...inventoryExample, gpToAds: 25 })
  close(p.tOut, 140)
  close(p.ordersNeeded, 14)
  close(p.tCash, 24.5)
  close(p.latestOrderDay, 120)
  close(p.cashAtD, 176428.57, 1)
  assert.equal(p.missingCash, 0)
  assert.equal(p.lateDays, 0)
  assert.equal(p.possible, true)
})
test('inventory recommendation chooses the highest feasible reinvestment rate', () => {
  const r = inventoryRecommendation(inventoryExample)
  assert.equal(r.recommended.x, 38)
  assert.deepEqual(r.feasibleRange, [20, 38])
})
test('inventory plan handles funded orders and invalid inputs', () => {
  assert.equal(inventoryPlan({ ...inventoryExample, cashNow: 50000 }).ordersNeeded, 0)
  assert.equal(inventoryPlan({ ...inventoryExample, deliveryRate: 0 }).valid, false)
  assert.equal(inventoryPlan({ ...inventoryExample, testOrders: 0 }).valid, false) // no test orders = no budget
  assert.equal(inventoryPlan({ ...inventoryExample, gpToAds: 0 }).valid, false) // 0% reinvested = no budget
})

test('French and Arabic dictionaries fully translate the English interface keys', () => {
  for (const locale of ['fr', 'ar']) {
    for (const [key, english] of Object.entries(dictionaries.en)) {
      assert.ok(key in dictionaries[locale], `${locale} is missing ${key}`)
      assert.notDeepEqual(dictionaries[locale][key], english, `${locale} still uses English for ${key}`)
    }
  }
})

test('snowball: 100% of GP reinvested gives 20 orders in 1 round', () => {
  const r = snowball({ ...DEFAULTS, price: 3000, cogs: 1000, cpa: 250, deliveryRate: 50, returnFee: 0, adTestCost: 2000, importedUnits: 30, testOrders: 4, gpToAds: 100 })
  assert.equal(r.investment, 32000)
  assert.equal(r.hit.k, 1)
  assert.equal(r.hit.orders, 20)
})
test('snowball: 75% needs 2 rounds and 28 orders; 0% never breaks even', () => {
  const base = { ...DEFAULTS, price: 3000, cogs: 1000, cpa: 250, deliveryRate: 50, returnFee: 0, adTestCost: 2000, importedUnits: 30, testOrders: 4 }
  const r = snowball({ ...base, gpToAds: 75 })
  assert.equal(r.hit.k, 2)
  assert.ok(Math.abs(r.hit.orders - 28) < 1e-9)
  assert.equal(snowball({ ...base, gpToAds: 0 }).hit, null)
})


// ---- rising CAC ("scaling" tabs) ----
const nearly = (actual, expected, tolerance = 0.02) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} is not close to ${expected}`)
const scalingBase = { ...DEFAULTS, price: 3000, cogs: 1000, cpa: 250, deliveryRate: 50, returnFee: 0, adTestCost: 44000, importedUnits: 120, testOrders: 4, gpToAds: 100 }

test('snowball: CAC rise of 0 changes nothing, a rising CAC delays break-even', () => {
  assert.deepEqual(snowball(scalingBase, 0).hit, snowball(scalingBase).hit)
  const flat = snowball(scalingBase, 0)
  const rising = snowball(scalingBase, 50)
  assert.equal(flat.hit.k, 2)
  nearly(flat.hit.orders, 68)
  assert.equal(rising.hit.k, 3)
  nearly(rising.hit.orders, 96.44)
})
test('snowball: CAC grows by the rise in every round after the first', () => {
  const s = snowball(scalingBase, 50)
  nearly(s.rounds[1].cac, 500)
  nearly(s.rounds[2].cac, 750)
  nearly(s.rounds[3].cac, 1125)
})
test('snowball: finds the round where CAC reaches the gross profit per order', () => {
  assert.equal(snowball(scalingBase, 0).stopRound, null)
  assert.equal(snowball(scalingBase, 50).stopRound, 5) // 500 x 1.5^4 = 2531 > 2000
  assert.equal(snowball(scalingBase, 100).stopRound, 3) // 500 x 2^2 = 2000
})
test('inventory plan: a rising CAC makes the stock last longer and reports the CAC at stock-out', () => {
  const ex = { ...scalingBase, currentStock: 80, cashNow: 5000, nextOrderUnits: 40, leadTime: 20, reinvestEvery: 7, gpToAds: 75 }
  const flat = inventoryPlan(ex)
  const rising = inventoryPlan(ex, undefined, 25)
  nearly(flat.tOut, 16.074)
  nearly(rising.tOut, 18.962)
  nearly(rising.cacAtOut, 781.25)
  assert.equal(flat.fading, false)
  assert.equal(rising.fading, true)
  assert.equal(inventoryPlan(ex, undefined, 0).tOut, flat.tOut)
})
test('inventory recommendation with a rising CAC', () => {
  const ex = { ...scalingBase, currentStock: 80, cashNow: 5000, nextOrderUnits: 40, leadTime: 20, reinvestEvery: 7 }
  assert.equal(inventoryRecommendation(ex, 0).recommended.x, 38)
  const r = inventoryRecommendation(ex, 25)
  assert.equal(r.recommended.x, 54)
  nearly(r.feasibleRange[0], 29, 0.01)
})


// ---- confirmation rate ----
test('CAC uses confirmation x delivery rate, but the return cost uses the delivery rate alone', () => {
  const u = unitEconomics({ ...DEFAULTS, cpa: 400, confirmationRate: 80, deliveryRate: 50, returnFee: 300 })
  assert.ok(Math.abs(u.cac - 1000) < 1e-9) // 400 / (0.8 x 0.5)
  assert.equal(u.returnCost, 300) // 0.5 failed parcels per 0.5 delivered x 300, NOT based on 0.8 x 0.5
  const all = unitEconomics({ ...DEFAULTS, cpa: 400, confirmationRate: 100, deliveryRate: 50, returnFee: 300 })
  assert.ok(Math.abs(all.cac - 800) < 1e-9)
  assert.equal(all.returnCost, 300) // the confirmation rate never changes the return cost
})
test('a missing confirmation rate counts as 100%, and 0% makes CAC unavailable', () => {
  const { confirmationRate, ...old } = DEFAULTS
  assert.equal(unitEconomics({ ...old, cpa: 500, deliveryRate: 50 }).cac, 1000)
  assert.equal(unitEconomics({ ...DEFAULTS, confirmationRate: 0 }).cac, null)
})
