const RANGES = { cash: [0, 2000000, 1000], unit: [0, 20000, 50], percent: [0, 100, 1], days: [0, 120, 1], units: [0, 5000, 1] }
const SUFFIX = { cash: 'DA', unit: 'DA', percent: '%', days: 'days', units: 'units' }

// key: [label, hint, type]
export const FIELDS = {
  price: ['Selling price per unit', 'Amount you receive for one delivered unit', 'unit'],
  cogs: ['Unit COGS', 'Landed cost per unit: purchase, shipping and customs', 'unit'],
  cpa: ['CPA', 'Ad cost per placed order, before delivery', 'unit'],
  returnFee: ['Return fee', 'What you pay for each failed or returned parcel', 'unit'],
  deliveryRate: ['Delivery rate', 'Delivered orders as a % of placed orders', 'percent'],
  adTestCost: ['Ad test full cost', 'Total ad money spent testing the product before the inventory arrived', 'cash'],
  importedUnits: ['Imported units', 'Units in the inventory you bought', 'units'],
    testOrders: ['Orders from the ad test', 'Delivered orders the test produced; their gross profit funds the first round', 'units'],
  gpToAds: ['% of GP reinvested in ads', 'Share of each round\'s gross profit you put back into ads; the rest stays with you', 'percent'],
  cashNow: ['Cash available now for inventory', 'Money ready to spend on the next inventory order today', 'cash'],
  reinvestEvery: ['Reinvest ads every', 'Days between reinvestments: each time, the ads share of revenue becomes the next ad budget', 'days'],
  dailyAdBudget: ['Current daily ad budget', 'What you spend on ads per day right now', 'cash'],
  leadTime: ['Days until the new inventory can be sold', 'Days from placing the order until the new stock is sellable', 'days'],
  currentStock: ['Current stock', 'Sellable units you have now', 'units'],
  nextOrderUnits: ['Units in the next inventory order', 'How many units you will buy in the next order', 'units'],
}

function Slider({ id, value, onChange, t }) {
  const [, , type] = FIELDS[id]
  const [label, hint] = t(id)
  const [min, max, step] = RANGES[type]
  const shown = Math.min(Math.max(Number(value) || 0, min), max)
  return (
    <div className="slider-control">
      <div className="slider-head">
        <label htmlFor={id}>{label}<small>{hint}</small></label>
        <div className="value-entry">
          <input aria-label={label} type="number" min="0" step={step} value={value} onChange={e => onChange(id, e.target.value)} />
          <span>{SUFFIX[type]}</span>
        </div>
      </div>
      <input id={id} className="range" type="range" min={min} max={max} step={step} value={shown}
        style={{ '--fill': (shown / max) * 100 + '%' }} onChange={e => onChange(id, e.target.value)} />
    </div>
  )
}

export default function InputPanel({ title, keys, state, set, reset, t }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div><h2>{title}</h2><p>{t('inputsNote')}</p></div>
        <button onClick={reset}>{t('reset')}</button>
      </div>
      <div className="input-grid simple-inputs">{keys.map(k => <Slider key={k} id={k} value={state[k]} onChange={set} t={t} />)}</div>
    </section>
  )
}
