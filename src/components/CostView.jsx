import { useMemo } from 'react';
import DATA from '../data/dashboard_data.json';
import {
  fmtNum1, fmtCur, fmtCurP, fmtPct, sum, groupSum, sortedEntries, monthRange, monthKey, monthLabel,
  previousPeriod, delta, daysBetween,
} from '../lib/format';
import { catColor, cssVar } from '../lib/svg';
import { KpiTile, Chip } from './Kpi';
import BarChart from './charts/BarChart';
import LineChart from './charts/LineChart';
import DivergingChart from './charts/DivergingChart';
import DataTable from './DataTable';

const setOK = (arr, v) => !arr.length || arr.includes(v);
const inRangeFn = (start, end) => (iso) => iso && iso >= start && iso <= end;

// PONumber -> order date, built once (structural join, not range-dependent).
const PO_ORDER_DATE = new Map();
DATA.pos.forEach((r) => { if (!PO_ORDER_DATE.has(r.po)) PO_ORDER_DATE.set(r.po, r.d); });
const VENDOR_STATED = new Map(DATA.vendors.map((v) => [v.name, v.leadTimeDays]));

function vendorLeadTime(start, end) {
  const inRange = inRangeFn(start, end);
  const rows = DATA.receipts.filter((r) => inRange(r.d) && PO_ORDER_DATE.get(r.po));
  const byVendor = new Map();
  rows.forEach((r) => {
    const orderDate = PO_ORDER_DATE.get(r.po);
    const actual = daysBetween(orderDate, r.d);
    if (actual === null || actual < 0) return;
    if (!byVendor.has(r.vendor)) byVendor.set(r.vendor, []);
    byVendor.get(r.vendor).push(actual);
  });
  const items = [];
  byVendor.forEach((arr, vendor) => {
    const stated = VENDOR_STATED.get(vendor);
    if (stated == null) return;
    const actualAvg = arr.reduce((a, b) => a + b, 0) / arr.length;
    items.push({ label: vendor, value: actualAvg - stated, actualAvg, stated, n: arr.length });
  });
  const avgVariance = items.length ? items.reduce((a, d) => a + d.value, 0) / items.length : 0;
  return { items, avgVariance };
}

function revenueWindow(start, end, family, segment, region) {
  const inRange = inRangeFn(start, end);
  const invLines = DATA.invoices.filter((r) => inRange(r.d) && setOK(family, r.fam) && setOK(segment, r.seg) && setOK(region, r.region));
  const costRows = DATA.costs.filter((r) => inRange(r.d) && setOK(family, r.fam));
  const revenue = sum(invLines, (r) => r.amt);
  const materialCost = sum(costRows, (r) => r.totCost);
  const margin = revenue - materialCost;
  const marginRate = revenue ? (margin / revenue) * 100 : 0;
  const avgUnitCost = costRows.length ? sum(costRows, (r) => r.unitCost) / costRows.length : 0;
  const avgVarPct = costRows.length ? sum(costRows, (r) => r.varPct) / costRows.length : 0;
  const outstanding = sum(invLines.filter((r) => r.status !== 'Paid'), (r) => r.amt);
  const distinctInvoices = new Set(invLines.map((r) => r.inv)).size;
  const avgRevPerOrder = distinctInvoices ? revenue / distinctInvoices : 0;
  return { invLines, costRows, revenue, materialCost, margin, marginRate, avgUnitCost, avgVarPct, outstanding, avgRevPerOrder };
}

export default function CostView({ state, minDate }) {
  const { start, end, family, brand, segment, region, compareMode, topN } = state;

  const computed = useMemo(() => {
    const cur = revenueWindow(start, end, family, segment, region);

    const months = monthRange(start, end);
    const revByMonth = groupSum(cur.invLines, (r) => monthKey(r.d), (r) => r.amt);
    const costByMonth = groupSum(cur.costRows, (r) => monthKey(r.d), (r) => r.totCost);
    const marginByMonth = new Map(months.map((k) => [k, (revByMonth.get(k) || 0) - (costByMonth.get(k) || 0)]));

    const revByFam = sortedEntries(groupSum(cur.invLines, (r) => r.fam, (r) => r.amt)).map(([label, value]) => ({ label, value }));
    const revBySegment = sortedEntries(groupSum(cur.invLines, (r) => r.seg, (r) => r.amt)).map(([label, value]) => ({ label, value }));

    const arByStatus = ['Paid', 'Partial', 'Open'].map((label) => ({
      label, value: sum(cur.invLines.filter((r) => r.status === label), (r) => r.amt),
    })).filter((d) => d.value > 0);
    const arColor = { Paid: cssVar('--good'), Partial: cssVar('--warning'), Open: cssVar('--critical') };

    const varByProd = new Map();
    cur.costRows.forEach((r) => {
      if (!varByProd.has(r.prod)) varByProd.set(r.prod, []);
      varByProd.get(r.prod).push(r.varAbs);
    });
    const varItems = Array.from(varByProd.entries())
      .map(([label, arr]) => ({ label, value: arr.reduce((a, b) => a + b, 0) / arr.length }));
    varItems.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    const custRevMap = groupSum(cur.invLines, (r) => r.cust, (r) => r.amt);
    const custRev = sortedEntries(custRevMap).map(([cust, amt]) => ({ cust, amt }));
    const top3CustRev = sortedEntries(custRevMap).slice(0, 3).reduce((a, [, v]) => a + v, 0);
    const custConcentration = cur.revenue ? (top3CustRev / cur.revenue) * 100 : 0;

    const posInRange = DATA.pos.filter((r) => inRangeFn(start, end)(r.d));
    const spendByVendor = groupSum(posInRange, (r) => r.vendor, (r) => r.amt);
    const vendorSpend = sortedEntries(spendByVendor).map(([vendor, amt]) => ({ vendor, amt }));
    const totalSpend = sum(posInRange, (r) => r.amt);
    const top3VendorSpend = sortedEntries(spendByVendor).slice(0, 3).reduce((a, [, v]) => a + v, 0);
    const vendorConcentration = totalSpend ? (top3VendorSpend / totalSpend) * 100 : 0;

    // purchase cost variation by item category: current-range avg unit cost vs all-time avg unit cost
    const allTimeByCat = groupSum(DATA.pos, (r) => r.cat, (r) => 1);
    const allTimeSumByCat = groupSum(DATA.pos, (r) => r.cat, (r) => r.cost);
    const rangeSumByCat = groupSum(posInRange, (r) => r.cat, (r) => r.cost);
    const rangeCountByCat = groupSum(posInRange, (r) => r.cat, () => 1);
    const costVariation = [];
    allTimeByCat.forEach((count, cat) => {
      const allTimeAvg = (allTimeSumByCat.get(cat) || 0) / count;
      const rangeCount = rangeCountByCat.get(cat) || 0;
      if (!rangeCount || !allTimeAvg) return;
      const rangeAvg = (rangeSumByCat.get(cat) || 0) / rangeCount;
      costVariation.push({ label: cat, value: ((rangeAvg - allTimeAvg) / allTimeAvg) * 100 });
    });
    costVariation.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    // per-product margin ranking
    const revByProd = groupSum(cur.invLines, (r) => r.prod, (r) => r.amt);
    const costByProd = groupSum(cur.costRows, (r) => r.prod, (r) => r.totCost);
    const prodSet = new Set([...revByProd.keys(), ...costByProd.keys()]);
    const marginByProd = [];
    prodSet.forEach((prod) => {
      const revenue = revByProd.get(prod) || 0, cost = costByProd.get(prod) || 0;
      const margin = revenue - cost;
      marginByProd.push({ prod, revenue, cost, margin, marginRate: revenue ? (margin / revenue) * 100 : 0 });
    });
    marginByProd.sort((a, b) => b.margin - a.margin);

    const leadTime = vendorLeadTime(start, end);

    let prevDelta = { revenue: null, margin: null, marginRate: null, outstanding: null, avgRevPerOrder: null, leadTime: null };
    if (compareMode !== 'none') {
      const pw = previousPeriod(start, end, compareMode, minDate);
      if (pw) {
        const prev = revenueWindow(pw.start, pw.end, family, segment, region);
        const prevLeadTime = vendorLeadTime(pw.start, pw.end);
        prevDelta = {
          revenue: delta(cur.revenue, prev.revenue),
          margin: delta(cur.margin, prev.margin),
          marginRate: delta(cur.marginRate, prev.marginRate),
          outstanding: delta(cur.outstanding, prev.outstanding),
          avgRevPerOrder: delta(cur.avgRevPerOrder, prev.avgRevPerOrder),
          leadTime: delta(leadTime.avgVariance, prevLeadTime.avgVariance),
        };
      }
    }

    const revSpark = months.map((k) => revByMonth.get(k) || 0);
    const marginSpark = months.map((k) => marginByMonth.get(k) || 0);

    return {
      cur, months, revByMonth, marginByMonth, revByFam, revBySegment, arByStatus, arColor, varItems,
      custRev, custConcentration, vendorSpend, vendorConcentration, costVariation, marginByProd, leadTime,
      prevDelta, revSpark, marginSpark,
    };
  }, [start, end, family, brand, segment, region, compareMode, minDate]);

  const {
    cur, months, revByMonth, marginByMonth, revByFam, revBySegment, arByStatus, arColor, varItems,
    custRev, custConcentration, vendorSpend, vendorConcentration, costVariation, marginByProd, leadTime,
    prevDelta, revSpark, marginSpark,
  } = computed;

  const compareOn = compareMode !== 'none';

  return (
    <main className="view active">
      <section className="kpi-row">
        <KpiTile label="Invoiced revenue" value={fmtCur.format(cur.revenue)} sub="Selected range" delta={compareOn ? prevDelta.revenue : undefined} goodDirection="up" spark={revSpark} sparkColor={catColor(0)} />
        <KpiTile label="Material cost" value={fmtCur.format(cur.materialCost)} sub="Completed manufacturing orders" />
        <KpiTile label="Est. gross margin" value={fmtCur.format(cur.margin)} sub={cur.margin >= 0 ? <Chip kind="good" label="Positive" /> : <Chip kind="critical" label="Negative" />} delta={compareOn ? prevDelta.margin : undefined} goodDirection="up" spark={marginSpark} sparkColor={catColor(2)} />
        <KpiTile label="Est. margin rate" value={`${fmtNum1.format(cur.marginRate)}%`} sub={cur.marginRate >= 30 ? <Chip kind="good" label="Healthy" /> : <Chip kind="warning" label="Watch" />} delta={compareOn ? prevDelta.marginRate : undefined} goodDirection="up" />
        <KpiTile label="Avg. unit material cost" value={fmtCurP.format(cur.avgUnitCost)} sub="Per unit produced" />
        <KpiTile label="Avg. cost variance" value={fmtPct(cur.avgVarPct)} sub={cur.avgVarPct > 0 ? <Chip kind="warning" label="Over standard" /> : <Chip kind="good" label="Under standard" />} />
      </section>

      <section className="kpi-row">
        <KpiTile label="Outstanding invoiced" value={fmtCur.format(cur.outstanding)} sub="Open + partial invoices" delta={compareOn ? prevDelta.outstanding : undefined} goodDirection="down" />
        <KpiTile label="Avg. revenue per order" value={fmtCur.format(cur.avgRevPerOrder)} sub="Per distinct invoice" delta={compareOn ? prevDelta.avgRevPerOrder : undefined} goodDirection="up" />
        <KpiTile label="Top-3 customer share" value={`${fmtNum1.format(custConcentration)}%`} sub={custConcentration >= 40 ? <Chip kind="warning" label="Concentrated" /> : <Chip kind="good" label="Diversified" />} />
        <KpiTile label="Top-3 vendor share" value={`${fmtNum1.format(vendorConcentration)}%`} sub={vendorConcentration >= 40 ? <Chip kind="warning" label="Concentrated" /> : <Chip kind="good" label="Diversified" />} />
        <KpiTile
          label="Vendor lead-time variance" value={leadTime.items.length ? `${leadTime.avgVariance >= 0 ? '+' : ''}${fmtNum1.format(leadTime.avgVariance)} days` : '—'}
          sub={leadTime.items.length ? (leadTime.avgVariance <= 0 ? <Chip kind="good" label="On time" /> : <Chip kind="warning" label="Running late" />) : 'No receipts in range'}
          delta={compareOn ? prevDelta.leadTime : undefined} goodDirection="down"
        />
      </section>

      <section className="chart-grid">
        <div className="card">
          <h3>Invoiced revenue by month</h3>
          <p className="cap">Sum of invoice line amounts</p>
          <div className="chart-scroll">
            <LineChart buckets={months} seriesMap={revByMonth} height={220} color={catColor(0)} labelFn={monthLabel} fmt={(v) => fmtCur.format(v)} fmtShort={(v) => '$' + Math.round(v / 1000) + 'k'} />
          </div>
        </div>
        <div className="card">
          <h3>Estimated gross margin by month</h3>
          <p className="cap">Revenue minus material cost of completed orders, by month</p>
          <div className="chart-scroll">
            <LineChart buckets={months} seriesMap={marginByMonth} height={220} color={catColor(2)} labelFn={monthLabel} fmt={(v) => fmtCur.format(v)} fmtShort={(v) => '$' + Math.round(v / 1000) + 'k'} />
          </div>
        </div>
        <div className="card">
          <h3>Revenue by product family</h3>
          <p className="cap">Sum of invoice line amounts</p>
          <div className="chart-scroll">
            <BarChart items={revByFam} height={220} fmt={(v) => fmtCur.format(v)} fmtShort={(v) => '$' + Math.round(v / 1000) + 'k'} color={(d, i) => catColor(i)} />
          </div>
        </div>
        <div className="card">
          <h3>Material cost variance vs. standard</h3>
          <p className="cap">Top products by absolute variance &middot; actual minus standard, per unit</p>
          <div className="chart-scroll">
            <DivergingChart items={varItems.slice(0, topN)} fmt={(v) => (v >= 0 ? '+' : '') + fmtCurP.format(v) + ' / unit'} />
          </div>
          <div className="legend">
            <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--div-a)' }} />Below standard</span>
            <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--div-b)' }} />Above standard</span>
          </div>
        </div>
      </section>

      <section className="chart-grid">
        <div className="card">
          <h3>Revenue by customer segment</h3>
          <p className="cap">Sum of invoice line amounts</p>
          <div className="chart-scroll">
            <BarChart items={revBySegment} height={220} fmt={(v) => fmtCur.format(v)} fmtShort={(v) => '$' + Math.round(v / 1000) + 'k'} color={(d, i) => catColor(i + 3)} />
          </div>
        </div>
        <div className="card">
          <h3>Accounts receivable by status</h3>
          <p className="cap">Invoiced amount, by payment status</p>
          <div className="chart-scroll">
            <BarChart items={arByStatus} height={220} fmt={(v) => fmtCur.format(v)} fmtShort={(v) => '$' + Math.round(v / 1000) + 'k'} color={(d) => arColor[d.label]} />
          </div>
        </div>
        <div className="card full">
          <h3>Purchase cost variation by material category</h3>
          <p className="cap">Selected-range average unit cost vs. all-time average, per item category</p>
          <div className="chart-scroll">
            <DivergingChart items={costVariation.slice(0, topN)} fmt={(v) => (v >= 0 ? '+' : '') + fmtNum1.format(v) + '% vs. all-time avg'} />
          </div>
          <div className="legend">
            <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--div-a)' }} />Cheaper than usual</span>
            <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--div-b)' }} />Pricier than usual</span>
          </div>
        </div>
      </section>

      <section className="chart-grid">
        <div className="card full">
          <h3>Vendor lead time: actual vs. stated</h3>
          <p className="cap">Average days from PO order date to receipt, minus the vendor's stated lead time</p>
          <div className="chart-scroll">
            {leadTime.items.length
              ? <DivergingChart items={leadTime.items.slice().sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, topN)} fmt={(v) => `${v >= 0 ? '+' : ''}${fmtNum1.format(v)} days vs. stated`} />
              : <p className="cap">No receipts in range.</p>}
          </div>
          <div className="legend">
            <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--div-a)' }} />Faster than stated</span>
            <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--div-b)' }} />Slower than stated</span>
          </div>
        </div>
      </section>

      <section className="chart-grid">
        <div className="card">
          <h3>Top customers by revenue</h3>
          <p className="cap">Within the selected range and filters</p>
          <div className="table-wrap">
            <DataTable
              rows={custRev} topN={topN} searchKeys={['cust']}
              cols={[
                { key: 'cust', label: 'Customer', render: (v) => v },
                { key: 'amt', label: 'Revenue', num: true, render: (v) => fmtCur.format(v) },
              ]}
            />
          </div>
        </div>
        <div className="card">
          <h3>Top vendors by spend</h3>
          <p className="cap">Purchase order line amounts, within the selected range</p>
          <div className="table-wrap">
            <DataTable
              rows={vendorSpend} topN={topN} searchKeys={['vendor']}
              cols={[
                { key: 'vendor', label: 'Vendor', render: (v) => v },
                { key: 'amt', label: 'Spend', num: true, render: (v) => fmtCur.format(v) },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="chart-grid">
        <div className="card full">
          <h3>Product margin ranking</h3>
          <p className="cap">Revenue minus material cost, by product, within the selected range</p>
          <div className="table-wrap">
            <DataTable
              rows={marginByProd} topN={topN} searchKeys={['prod']}
              cols={[
                { key: 'prod', label: 'Product', render: (v) => v },
                { key: 'revenue', label: 'Revenue', num: true, render: (v) => fmtCur.format(v) },
                { key: 'cost', label: 'Material cost', num: true, render: (v) => fmtCur.format(v) },
                { key: 'margin', label: 'Margin', num: true, render: (v) => fmtCur.format(v) },
                { key: 'marginRate', label: 'Margin rate', num: true, render: (v) => fmtNum1.format(v) + '%' },
              ]}
              chipFn={(r) => r.margin >= 0
                ? '<span class="chip good"><span class="dot" style="background:var(--good);"></span>Positive</span>'
                : '<span class="chip critical"><span class="dot" style="background:var(--critical);"></span>Negative</span>'}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
