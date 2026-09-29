export function Chip({ kind, label }) {
  return (
    <span className={`chip ${kind}`}>
      <span className="dot" style={{ background: `var(--${kind === 'good' ? 'good' : kind})` }} />
      {label}
    </span>
  );
}

// goodDirection: 'up' means an increase is favorable (e.g. revenue); 'down' means a decrease is favorable (e.g. late orders).
export function DeltaChip({ d, goodDirection = 'up', suffix = '' }) {
  if (!d) return <span className="delta-chip flat">No prior period</span>;
  if (d.dir === 'flat') return <span className="delta-chip flat">Flat vs. prior</span>;
  const favorable = goodDirection === 'up' ? d.dir === 'up' : d.dir === 'down';
  const arrow = d.dir === 'up' ? '▲' : '▼';
  return (
    <span className={`delta-chip ${favorable ? 'good' : 'bad'}`}>
      {arrow} {Math.abs(d.pct).toFixed(1)}%{suffix} vs. prior
    </span>
  );
}

export function KpiTile({ label, value, sub, delta: d, goodDirection }) {
  return (
    <div className="kpi-tile">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">{sub}</div>
      {d !== undefined && <DeltaChip d={d} goodDirection={goodDirection} />}
    </div>
  );
}
