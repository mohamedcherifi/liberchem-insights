import { useState } from 'react';
import { fmtNum } from '../lib/format';

function CheckGroup({ label, options, selected, onChange }) {
  function toggle(opt) {
    const next = selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt];
    onChange(next);
  }
  return (
    <div className="check-group">
      <span className="filter-label">{label}</span>
      <div className="check-list">
        {options.map((opt) => (
          <label key={opt} className="check-item">
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function FilterRail({
  state, setState, minDate, maxDate, dims, rowCount, activePreset, setActivePreset,
}) {
  const [expanded, setExpanded] = useState(false);
  const activeDimCount = state.family.length + state.brand.length + state.segment.length + state.region.length;

  function applyPreset(p) {
    if (p === 'all') {
      setState((s) => ({ ...s, start: minDate, end: maxDate }));
    } else {
      const months = parseInt(p, 10);
      const endD = new Date(maxDate + 'T00:00:00Z');
      const startD = new Date(endD);
      startD.setUTCMonth(startD.getUTCMonth() - months);
      const iso = startD.toISOString().slice(0, 10);
      setState((s) => ({ ...s, start: iso < minDate ? minDate : iso, end: maxDate }));
    }
    setActivePreset(p);
  }

  function reset() {
    setState({
      start: minDate, end: maxDate, family: [], brand: [], segment: [], region: [],
      compareMode: 'none', topN: 10, expiringDays: 90,
    });
    setActivePreset('all');
  }

  return (
    <div className="filter-rail-wrap">
      <div className="filter-rail">
        <div className="filter-group">
          <span className="filter-label">Range</span>
          {['3', '6', '12'].map((p) => (
            <button key={p} className={`preset-btn${activePreset === p ? ' active' : ''}`} onClick={() => applyPreset(p)}>{p} mo</button>
          ))}
          <button className={`preset-btn${activePreset === 'all' ? ' active' : ''}`} onClick={() => applyPreset('all')}>Full range</button>
          <input
            type="date" className="date-input" min={minDate} max={maxDate} value={state.start}
            onChange={(e) => { setState((s) => ({ ...s, start: e.target.value })); setActivePreset(null); }}
          />
          <span style={{ color: 'var(--muted)' }}>&ndash;</span>
          <input
            type="date" className="date-input" min={minDate} max={maxDate} value={state.end}
            onChange={(e) => { setState((s) => ({ ...s, end: e.target.value })); setActivePreset(null); }}
          />
        </div>
        <div className="filter-group">
          <span className="filter-label">Compare to</span>
          <select className="dim-select" value={state.compareMode} onChange={(e) => setState((s) => ({ ...s, compareMode: e.target.value }))}>
            <option value="none">None</option>
            <option value="prev">Previous period</option>
            <option value="yoy">Same period last year</option>
          </select>
        </div>
        <button className={`preset-btn${expanded ? ' active' : ''}`} onClick={() => setExpanded((v) => !v)}>
          Filters{activeDimCount ? ` (${activeDimCount})` : ''} {expanded ? '▲' : '▼'}
        </button>
        <button className="reset-btn" onClick={reset}>Reset</button>
        <div className="filter-summary">
          {state.start} &rarr; {state.end} · {fmtNum.format(rowCount)} rows
        </div>
      </div>

      {expanded && (
        <div className="filter-panel">
          <CheckGroup label="Product family" options={dims.families} selected={state.family} onChange={(v) => setState((s) => ({ ...s, family: v }))} />
          <CheckGroup label="Brand" options={dims.brands} selected={state.brand} onChange={(v) => setState((s) => ({ ...s, brand: v }))} />
          <CheckGroup label="Customer segment" options={dims.segments} selected={state.segment} onChange={(v) => setState((s) => ({ ...s, segment: v }))} />
          <CheckGroup label="Region" options={dims.regions} selected={state.region} onChange={(v) => setState((s) => ({ ...s, region: v }))} />
          <div className="check-group">
            <span className="filter-label">List depth</span>
            <div className="check-list">
              <select className="dim-select" value={state.topN} onChange={(e) => setState((s) => ({ ...s, topN: Number(e.target.value) }))}>
                {[5, 10, 15, 25].map((n) => <option key={n} value={n}>Top {n}</option>)}
              </select>
            </div>
          </div>
          <div className="check-group">
            <span className="filter-label">Expiring within</span>
            <div className="check-list">
              <select className="dim-select" value={state.expiringDays} onChange={(e) => setState((s) => ({ ...s, expiringDays: Number(e.target.value) }))}>
                {[30, 60, 90, 120].map((n) => <option key={n} value={n}>{n} days</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
