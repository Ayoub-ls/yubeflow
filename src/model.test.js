import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULTS, breakEven, inventoryPlan, inventoryRecommendation, snowball } from './model.js'
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
const inventoryExample = { ...DEFAULTS, price: 3000, cogs: 1000, cpa: 250, deliveryRate: 50, returnFee: 0, dailyAdBudget: 1000, currentStock: 80, cashNow: 5000, nextOrderUnits: 40, leadTime: 20, reinvestEvery: 7 }
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.02, `${actual} is not close to ${expected}`)

test('inventory plan calculates the 75% scenario continuously', () => {
  const p = inventoryPlan({ ...inventoryExample, gpToAds: 75 })
  assert.equal(p.valid, true)
  close(p.tOut, 15.333)
  close(p.ordersNeeded, 23.333)
  close(p.tCash, 8.556)
  close(p.latestOrderDay, -4.667)
  assert.equal(p.missingCash, 35000)
  close(p.lateDays, 13.222)
  assert.equal(p.possible, false)
})
test('inventory plan finds the 25% scenario feasible', () => {
  const p = inventoryPlan({ ...inventoryExample, gpToAds: 25 })
  assert.equal(p.tOut, 40)
  assert.equal(p.ordersNeeded, 14)
  assert.equal(p.tCash, 7)
  assert.equal(p.latestOrderDay, 20)
  assert.equal(p.cashAtD, 105000)
  assert.equal(p.missingCash, 0)
  assert.equal(p.lateDays, 0)
  assert.equal(p.possible, true)
})
test('inventory recommendation chooses the highest feasible reinvestment rate', () => {
  const r = inventoryRecommendation(inventoryExample)
  assert.equal(r.recommended.x, 31)
  assert.deepEqual(r.feasibleRange, [0, 31])
})
test('inventory plan handles funded orders and invalid delivery rates', () => {
  assert.equal(inventoryPlan({ ...inventoryExample, cashNow: 50000 }).ordersNeeded, 0)
  const p = inventoryPlan({ ...inventoryExample, deliveryRate: 0 })
  assert.equal(p.valid, false)
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
