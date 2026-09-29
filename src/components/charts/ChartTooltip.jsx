// Custom Recharts tooltip content, styled to match the dashboard's tooltip design.
export function ChartTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload || !payload.length) return null;
  const title = labelFormatter ? labelFormatter(label) : label;
  return (
    <div className="tooltip" style={{ position: 'static' }}>
      {title !== undefined && <div className="t-title">{title}</div>}
      {payload.map((p, i) => (
        <div key={i}>
          {payload.length > 1 && p.name ? `${p.name}: ` : ''}
          {formatter ? formatter(p.value, p.name, p) : p.value}
        </div>
      ))}
    </div>
  );
}
