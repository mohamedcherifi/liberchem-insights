import { useMemo } from 'react';
import DATA from '../data/dashboard_data.json';
import {
  fmtNum, fmtCur, fmtNum1, sum, groupSum, sortedEntries, monthRange, monthKey, monthLabel,
  daysBetween, previousPeriod, delta,
} from '../lib/format';
import { catColor } from '../lib/svg';
import { KpiTile, Chip } from './Kpi';
import BarChart from './charts/BarChart';
import GroupedBarChart from './charts/GroupedBarChart';
import DataTable from './DataTable';

const setOK = (arr, v) => !arr.length || arr.includes(v);
const inRangeFn = (start, end) => (iso) => iso && iso >= start && iso <= end;

function orderWindow(start, end, family, segment, region) {
  const inRange = inRangeFn(start, end);
  const rows = DATA.sales.filter((r) => inRange(r.d) && setOK(family, r.fam) && setOK(segment, r.seg) && setOK(region, r.region));
  const open = rows.filter((r) => r.open);
  const late = rows.filter((r) => r.late);
  const shipped = rows.filter((r) => r.lineStatus === 'Shipped');
  const deliveryRate = rows.length ? (shipped.length / rows.length) * 100 : 0;
  const remainingToShip = sum(rows, (r) => r.qOpen);
  return { rows, open, late, deliveryRate, remainingToShip };
}
function incomingPoQty(start, end) {
  const inRange = inRangeFn(start, end);
  const rows = DATA.pos.filter((r) => inRange(r.d) && r.open);
  return sum(rows, (r) => r.qOpen);
}

export default function StockView({ state, minDate }) {
  const { start, end, family, brand, segment, region, compareMode, topN, expiringDays } = state;

  const computed = useMemo(() => {
    const dimFiltered = family.length > 0 || brand.length > 0;
    const invRows = DATA.inv.filter((r) => (!dimFiltered) ? true : (r.fg && setOK(family, r.fam) && setOK(brand, r.brand)));
    const invFam = DATA.inv.filter((r) => r.fg && setOK(family, r.fam) && setOK(brand, r.brand));

    const availByItem = groupSum(invFam, (r) => r.item, (r) => r.avail);
    const reorderByItem = new Map();
    const maxByItem = new Map();
    invFam.forEach((r) => {
      if (!reorderByItem.has(r.item)) reorderByItem.set(r.item, r.reorder);
      if (!maxByItem.has(r.item)) maxByItem.set(r.item, r.maxStk);
    });

    const availTotal = sum(invFam, (r) => r.avail);
    const blockedRows = invRows.filter((r) => r.blocked);
    const blockedValue = sum(blockedRows, (r) => r.value);
    const expiring = invRows.filter((r) => r.daysExp !== null && r.daysExp >= 0 && r.daysExp <= expiringDays);
    const quarantined = invRows.filter((r) => r.status === 'Quarantine');
    const agedRows = invRows.filter((r) => r.received);
    const avgLotAge = agedRows.length ? sum(agedRows, (r) => daysBetween(r.received, DATA.snapshotDate)) / agedRows.length : 0;

    const cur = orderWindow(start, end, family, segment, region);
    const curIncoming = incomingPoQty(start, end);

    const demandByProd = groupSum(cur.open, (r) => r.prod, (r) => r.qOpen);
    const atRisk = [];
    demandByProd.forEach((demand, prod) => {
      const avail = availByItem.get(prod) || 0;
      if (avail < demand) atRisk.push({ prod, avail, demand, gap: demand - avail });
    });
    atRisk.sort((a, b) => b.gap - a.gap);

    const belowReorder = [];
    availByItem.forEach((avail, item) => {
      const rp = reorderByItem.get(item);
      if (rp != null && avail < rp) belowReorder.push({ item, avail, reorder: rp, gap: rp - avail });
    });
    belowReorder.sort((a, b) => b.gap - a.gap);

    const overstock = [];
    availByItem.forEach((avail, item) => {
      const mx = maxByItem.get(item);
      if (mx != null && mx > 0 && avail > mx) overstock.push({ item, avail, maxStk: mx, excess: avail - mx });
    });
    overstock.sort((a, b) => b.excess - a.excess);

    const valByFam = sortedEntries(groupSum(invFam, (r) => r.fam, (r) => r.value)).map(([label, value]) => ({ label, value }));
    const availByLoc = sortedEntries(groupSum(invRows, (r) => r.loc, (r) => r.avail)).map(([label, value]) => ({ label, value }));

    const months = monthRange(start, end);
    const openByMonth = groupSum(cur.open, (r) => monthKey(r.d), () => 1);
    const lateByMonth = groupSum(cur.late, (r) => monthKey(r.d), () => 1);

    const rangeDays = Math.max(1, daysBetween(start, end) + 1);
    const shipRange = DATA.shipments.filter((r) => inRangeFn(start, end)(r.d) && setOK(family, r.fam));
    const shippedByProd = groupSum(shipRange, (r) => r.prod, (r) => r.qty);
    const daysOfSupply = [];
    availByItem.forEach((avail, item) => {
      if (avail <= 0) return; // already-stocked-out items are covered by "at risk of stockout" above
      const shipped = shippedByProd.get(item) || 0;
      const dailyRate = shipped / rangeDays;
      if (dailyRate > 0) daysOfSupply.push({ label: item, value: Math.round(avail / dailyRate) });
    });
    daysOfSupply.sort((a, b) => a.value - b.value);

    const posInRange = DATA.pos.filter((r) => inRangeFn(start, end)(r.d) && r.open);
    const incomingByMonthMap = groupSum(posInRange, (r) => monthKey(r.expd), (r) => r.qOpen);
    const incomingByMonth = Array.from(incomingByMonthMap.keys()).sort()
      .map((k) => ({ label: monthLabel(k), value: incomingByMonthMap.get(k) }));

    // comparison period
    let prevDelta = { open: null, late: null, delivery: null, remain: null, incoming: null };
    if (compareMode !== 'none') {
      const pw = previousPeriod(start, end, compareMode, minDate);
      if (pw) {
        const prev = orderWindow(pw.start, pw.end, family, segment, region);
        const prevIncoming = incomingPoQty(pw.start, pw.end);
        prevDelta = {
          open: delta(cur.open.length, prev.open.length),
          late: delta(cur.late.length, prev.late.length),
          delivery: delta(cur.deliveryRate, prev.deliveryRate),
          remain: delta(cur.remainingToShip, prev.remainingToShip),
          incoming: delta(curIncoming, prevIncoming),
        };
      }
    }

    const expiringSorted = expiring.slice().sort((a, b) => a.daysExp - b.daysExp);

    return {
      invRowsLen: invRows.length, availTotal, blockedRows, blockedValue, expiring, quarantined, avgLotAge,
      cur, curIncoming, atRisk, belowReorder, overstock, valByFam, availByLoc, months, openByMonth, lateByMonth,
      daysOfSupply, incomingByMonth, prevDelta, expiringSorted,
    };
  }, [start, end, family, brand, segment, region, compareMode, expiringDays, minDate]);

  const {
    availTotal, blockedRows, blockedValue, expiring, quarantined, avgLotAge, cur, curIncoming,
    atRisk, belowReorder, overstock, valByFam, availByLoc, months, openByMonth, lateByMonth,
    daysOfSupply, incomingByMonth, prevDelta, expiringSorted,
  } = computed;

  const compareOn = compareMode !== 'none';

  return (
    <main className="view active">
      <section className="kpi-row">
        <KpiTile label="Available stock" value={`${fmtNum.format(availTotal)} units`} sub={`As of ${DATA.snapshotDate}`} />
        <KpiTile
          label="At risk of stockout" value={`${fmtNum.format(atRisk.length)} products`}
          sub={atRisk.length ? <Chip kind="critical" label="Needs attention" /> : <Chip kind="good" label="On track" />}
        />
        <KpiTile
          label="Blocked inventory" value={fmtCur.format(blockedValue)}
          sub={<>{blockedRows.length} lots &middot; <Chip kind={blockedRows.length ? 'serious' : 'good'} label={blockedRows.length ? 'Review' : 'Clear'} /></>}
        />
        <KpiTile
          label={`Expiring ≤${expiringDays} days`} value={`${fmtNum.format(expiring.length)} lots`}
          sub={expiring.length ? <Chip kind="warning" label="Plan usage" /> : <Chip kind="good" label="Clear" />}
        />
        <KpiTile
          label="Open order lines" value={fmtNum.format(cur.open.length)} sub="In selected range"
          delta={compareOn ? prevDelta.open : undefined} goodDirection="down"
        />
        <KpiTile
          label="Late order lines" value={fmtNum.format(cur.late.length)}
          sub={cur.late.length
            ? <Chip kind="critical" label={`${fmtNum1.format((100 * cur.late.length) / Math.max(cur.rows.length, 1))}% of lines`} />
            : <Chip kind="good" label="None late" />}
          delta={compareOn ? prevDelta.late : undefined} goodDirection="down"
        />
      </section>

      <section className="kpi-row">
        <KpiTile
          label="Below reorder point" value={`${fmtNum.format(belowReorder.length)} items`}
          sub={belowReorder.length ? <Chip kind="warning" label="Replenish soon" /> : <Chip kind="good" label="Clear" />}
        />
        <KpiTile
          label="Overstock" value={`${fmtNum.format(overstock.length)} items`}
          sub={overstock.length ? <Chip kind="serious" label="Above max" /> : <Chip kind="good" label="Clear" />}
        />
        <KpiTile
          label="Quarantined lots" value={fmtNum.format(quarantined.length)}
          sub={quarantined.length ? <Chip kind="serious" label="QC review" /> : <Chip kind="good" label="Clear" />}
        />
        <KpiTile label="Avg. lot age" value={`${fmtNum1.format(avgLotAge)} days`} sub="Since receipt, all held lots" />
        <KpiTile
          label="Incoming (open POs)" value={`${fmtNum.format(curIncoming)} units`} sub="Selected range"
          delta={compareOn ? prevDelta.incoming : undefined} goodDirection="up"
        />
        <KpiTile
          label="Complete delivery rate" value={`${fmtNum1.format(cur.deliveryRate)}%`}
          sub={cur.deliveryRate >= 80 ? <Chip kind="good" label="Healthy" /> : <Chip kind="warning" label="Watch" />}
          delta={compareOn ? prevDelta.delivery : undefined} goodDirection="up"
        />
      </section>

      <section className="chart-grid">
        <div className="card">
          <h3>Inventory value by product family</h3>
          <p className="cap">As of the current snapshot &middot; finished goods only</p>
          <div className="chart-scroll">
            <BarChart items={valByFam} height={220} fmt={(v) => fmtCur.format(v)} fmtShort={(v) => '$' + Math.round(v / 1000) + 'k'} color={(d, i) => catColor(i)} ariaLabel="Inventory value by product family" />
          </div>
        </div>
        <div className="card">
          <h3>Available stock by warehouse zone</h3>
          <p className="cap">As of the current snapshot &middot; all items</p>
          <div className="chart-scroll">
            <BarChart items={availByLoc} height={220} fmt={(v) => fmtNum.format(v) + ' units'} color={(d, i) => catColor(i + 2)} />
          </div>
        </div>
        <div className="card full">
          <h3>Order lines by month &mdash; open vs. late</h3>
          <p className="cap">Sales order lines, grouped by order month</p>
          <div className="chart-scroll">
            <GroupedBarChart buckets={months} seriesA={openByMonth} seriesB={lateByMonth} height={230} colorA="var(--cat1)" colorB="var(--critical)" labelFn={monthLabel} />
          </div>
          <div className="legend">
            <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--cat1)' }} />Open order lines</span>
            <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--critical)' }} />Late order lines</span>
          </div>
        </div>
      </section>

      <section className="chart-grid">
        <div className="card">
          <h3>Days of supply, most urgent</h3>
          <p className="cap">Available stock &divide; average daily shipments in range &middot; lower = more urgent</p>
          <div className="chart-scroll">
            <BarChart items={daysOfSupply.slice(0, topN)} height={220} fmt={(v) => `${fmtNum.format(v)} days`} color={(d, i) => (d.value <= 14 ? 'var(--critical)' : d.value <= 30 ? 'var(--warning)' : catColor(2))} />
          </div>
        </div>
        <div className="card">
          <h3>Incoming purchase orders by expected month</h3>
          <p className="cap">Open PO quantity, by expected receipt month</p>
          <div className="chart-scroll">
            <BarChart items={incomingByMonth} height={220} maxLabels={24} fmt={(v) => fmtNum.format(v) + ' units'} color={(d, i) => catColor(i + 4)} />
          </div>
        </div>
      </section>

      <section className="chart-grid">
        <div className="card">
          <h3>Products at risk of stockout</h3>
          <p className="cap">Available stock below open demand</p>
          <div className="table-wrap">
            <DataTable
              rows={atRisk} topN={topN} searchKeys={['prod']}
              cols={[
                { key: 'prod', label: 'Product', render: (v) => v },
                { key: 'avail', label: 'Available', num: true, render: (v) => fmtNum.format(v) },
                { key: 'demand', label: 'Open demand', num: true, render: (v) => fmtNum.format(v) },
                { key: 'gap', label: 'Gap', num: true, render: (v) => fmtNum.format(v) },
              ]}
              chipFn={() => '<span class="chip critical"><span class="dot" style="background:var(--critical);"></span>At risk</span>'}
            />
          </div>
        </div>
        <div className="card">
          <h3>Lots nearing expiration</h3>
          <p className="cap">{expiringDays} days or fewer remaining, not yet expired</p>
          <div className="table-wrap">
            <DataTable
              rows={expiringSorted} topN={topN} searchKeys={['item', 'lot']}
              cols={[
                { key: 'lot', label: 'Lot', mono: true, render: (v) => v },
                { key: 'item', label: 'Item', render: (v) => v },
                { key: 'daysExp', label: 'Days left', num: true, render: (v) => fmtNum.format(v) },
                { key: 'loc', label: 'Location', render: (v) => v },
              ]}
              chipFn={(r) => `<span class="chip ${r.daysExp <= 30 ? 'critical' : 'warning'}"><span class="dot" style="background:var(--${r.daysExp <= 30 ? 'critical' : 'warning'});"></span>${r.expStatus}d</span>`}
            />
          </div>
        </div>
        <div className="card">
          <h3>Below reorder point</h3>
          <p className="cap">Available stock under the item's reorder point</p>
          <div className="table-wrap">
            <DataTable
              rows={belowReorder} topN={topN} searchKeys={['item']}
              cols={[
                { key: 'item', label: 'Item', render: (v) => v },
                { key: 'avail', label: 'Available', num: true, render: (v) => fmtNum.format(v) },
                { key: 'reorder', label: 'Reorder pt.', num: true, render: (v) => fmtNum.format(v) },
                { key: 'gap', label: 'Gap', num: true, render: (v) => fmtNum.format(v) },
              ]}
              chipFn={() => '<span class="chip warning"><span class="dot" style="background:var(--warning);"></span>Replenish</span>'}
            />
          </div>
        </div>
        <div className="card">
          <h3>Overstock</h3>
          <p className="cap">Available stock above the item's maximum</p>
          <div className="table-wrap">
            <DataTable
              rows={overstock} topN={topN} searchKeys={['item']}
              cols={[
                { key: 'item', label: 'Item', render: (v) => v },
                { key: 'avail', label: 'Available', num: true, render: (v) => fmtNum.format(v) },
                { key: 'maxStk', label: 'Max stock', num: true, render: (v) => fmtNum.format(v) },
                { key: 'excess', label: 'Excess', num: true, render: (v) => fmtNum.format(v) },
              ]}
              chipFn={() => '<span class="chip serious"><span class="dot" style="background:var(--serious);"></span>Above max</span>'}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
