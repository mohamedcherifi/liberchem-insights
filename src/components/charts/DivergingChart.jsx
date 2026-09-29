import { BarChart as RBarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from 'recharts';
import { cssVar } from '../../lib/svg';

export default function DivergingChart({ items, fmt }) {
  if (!items.length) return <p className="cap">No data in range.</p>;

  const rowH = 26;
  const H = items.length * rowH + 16;
  const W = 640;
  const maxAbs = Math.max(...items.map((d) => Math.abs(d.value)), 0.01);
  const divA = cssVar('--div-a'), divB = cssVar('--div-b');

  return (
    <div style={{ width: W, height: H }}>
    <RBarChart width={W} height={H} data={items} layout="vertical" margin={{ top: 8, right: 20, left: 10, bottom: 8 }} barCategoryGap={6}>
      <XAxis type="number" domain={[-maxAbs, maxAbs]} hide />
      <YAxis type="category" dataKey="label" width={176} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: cssVar('--muted') }} interval={0} />
      <ReferenceLine x={0} stroke={cssVar('--baseline')} />
      <Tooltip
        cursor={{ fill: cssVar('--grid') }}
        content={({ active, payload }) => {
          if (!active || !payload || !payload.length) return null;
          const d = payload[0].payload;
          return <div className="tooltip" style={{ position: 'static' }}><div className="t-title">{d.label}</div>{fmt(d.value)}</div>;
        }}
      />
      <Bar dataKey="value" radius={2} maxBarSize={18}>
        {items.map((d) => <Cell key={d.label} fill={d.value >= 0 ? divB : divA} />)}
      </Bar>
    </RBarChart>
    </div>
  );
}
