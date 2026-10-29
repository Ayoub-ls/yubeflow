import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULTS, breakEven, plan, soldSoFar } from './model.js'
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
test('reorder quantity covers lead time, safety and cover days', () => {
  const p = plan({ ...DEFAULTS, deliveryRate: 100, cpa: 500, dailyAdBudget: 5000, leadTime: 20, safetyDays: 5, coverDays: 30, currentStock: 100, cogs: 1000, cashNow: 0 })
  assert.equal(p.daily, 10)
  assert.equal(p.qty, 10 * 55 - 100)
  assert.equal(p.shortfall, p.cost)
})
test('stock exactly equal to lead time is not "safe"', () => {
  const p = plan({ ...DEFAULTS, deliveryRate: 100, cpa: 500, dailyAdBudget: 5000, leadTime: 20, safetyDays: 5, currentStock: 200 })
  assert.equal(p.tone, 'warn')
})

test('default split is inventory = COGS and ads = CAC, summing to 100%', () => {
  const s = plan({ ...DEFAULTS }).s
  const base = 2500 - (0.35 / 0.65) * 300
  assert.ok(Math.abs(s.inv - (1100 / base) * 100) < 1e-9)
  assert.ok(Math.abs(s.ads - ((550 / 0.65) / base) * 100) < 1e-9)
  assert.ok(Math.abs(s.inv + s.ads + s.net - 100) < 1e-9)
})
test('default split keeps the ad budget flat; a bigger ads share grows it', () => {
  assert.equal(plan({ ...DEFAULTS }).nextBudget, DEFAULTS.dailyAdBudget)
  const p = plan({ ...DEFAULTS, splitCustom: 1, invShare: 30, adsShare: 60 })
  assert.ok(p.nextBudget > DEFAULTS.dailyAdBudget)
})

test('sold so far splits the revenue of imported minus current stock', () => {
  const m = soldSoFar({ ...DEFAULTS, price: 5000, cogs: 2500, cpa: 1000, deliveryRate: 50, returnFee: 0, importedUnits: 100, currentStock: 60 })
  assert.equal(m.units, 40)
  assert.equal(m.revenue, 200000)
  assert.equal(m.inventory, 100000)
  assert.equal(m.ads, 80000)
  assert.equal(m.net, 20000)
})

test('French and Arabic dictionaries fully translate the English interface keys', () => {
  for (const locale of ['fr', 'ar']) {
    for (const [key, english] of Object.entries(dictionaries.en)) {
      assert.ok(key in dictionaries[locale], `${locale} is missing ${key}`)
      assert.notDeepEqual(dictionaries[locale][key], english, `${locale} still uses English for ${key}`)
    }
  }
})
