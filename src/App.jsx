import { useMemo, useState } from 'react';
import DATA from './data/dashboard_data.json';
import FilterRail from './components/FilterRail';
import StockView from './components/StockView';
import CostView from './components/CostView';

function computeDateBounds() {
  const dates = [];
  const push = (v) => v && dates.push(v);
  DATA.sales.forEach((r) => push(r.d));
  DATA.invoices.forEach((r) => push(r.d));
  DATA.pos.forEach((r) => push(r.d));
  DATA.receipts.forEach((r) => push(r.d));
  DATA.shipments.forEach((r) => push(r.d));
  DATA.mos.forEach((r) => push(r.comp));
  DATA.costs.forEach((r) => push(r.d));
  dates.sort();
  return { min: dates[0], max: dates[dates.length - 1] };
}

const { min: MIN_DATE, max: MAX_DATE } = computeDateBounds();

const DIMS = {
  families: Array.from(new Set(DATA.inv.map((r) => r.fam).filter(Boolean))).sort(),
  brands: Array.from(new Set(DATA.inv.map((r) => r.brand).filter(Boolean))).sort(),
  segments: Array.from(new Set(DATA.invoices.map((r) => r.seg).filter(Boolean))).sort(),
  regions: Array.from(new Set(DATA.invoices.map((r) => r.region).filter(Boolean))).sort(),
};

const DEFAULT_FILTERS = {
  start: MIN_DATE, end: MAX_DATE, family: [], brand: [], segment: [], region: [],
  compareMode: 'none', topN: 10, expiringDays: 90,
};

export default function App() {
  const [tab, setTab] = useState('stock');
  const [activePreset, setActivePreset] = useState('all');
  const [filterState, setFilterState] = useState(DEFAULT_FILTERS);

  const rowCount = useMemo(() => {
    const { start, end, family, segment, region } = filterState;
    const inRange = (iso) => iso && iso >= start && iso <= end;
    const setOK = (arr, v) => !arr.length || arr.includes(v);
    let n = 0;
    n += DATA.sales.filter((r) => inRange(r.d) && setOK(family, r.fam)).length;
    n += DATA.invoices.filter((r) => inRange(r.d) && setOK(family, r.fam) && setOK(segment, r.seg) && setOK(region, r.region)).length;
    n += DATA.inv.filter((r) => !family.length || family.includes(r.fam) || !r.fg).length;
    return n;
  }, [filterState]);

  return (
    <div className="app">
      <header className="masthead">
        <div className="mark">
          <div className="wordmark">Liberchem</div>
          <div className="wordmark-sub">Insights &middot; Phase 1 POC</div>
        </div>
        <nav className="tabs" role="tablist" aria-label="Dashboard view">
          <button className={`tab${tab === 'stock' ? ' active' : ''}`} role="tab" aria-selected={tab === 'stock'} onClick={() => setTab('stock')}>Stock Tracking</button>
          <button className={`tab${tab === 'cost' ? ' active' : ''}`} role="tab" aria-selected={tab === 'cost'} onClick={() => setTab('cost')}>Cost Analysis</button>
        </nav>
        <div className="meta">Inventory as of {DATA.snapshotDate}</div>
      </header>
      <div className="amber-rule" />

      <FilterRail
        state={filterState} setState={setFilterState}
        minDate={MIN_DATE} maxDate={MAX_DATE} dims={DIMS}
        rowCount={rowCount} activePreset={activePreset} setActivePreset={setActivePreset}
      />

      {tab === 'stock'
        ? <StockView state={filterState} minDate={MIN_DATE} />
        : <CostView state={filterState} minDate={MIN_DATE} />}

      <div className="footer">
        <span>Liberchem Phase 1 &middot; mock POC data, not production figures</span>
        <span>Built for internal review</span>
      </div>
    </div>
  );
}
