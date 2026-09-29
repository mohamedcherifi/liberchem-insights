import { BarChart as RBarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';
import { catColor, cssVar } from '../../lib/svg';
import { fmtNum } from '../../lib/format';
import { ChartTooltip } from './ChartTooltip';
import { WrappedTick } from './WrappedTick';

export default function BarChart({ items, height = 220, fmt, fmtShort, color, ariaLabel, maxLabels = 10 }) {
  if (!items.length) return <p className="cap">No data in range.</p>;

  const n = items.length;
  const barMinW = 64, gap = 14;
  const W = Math.max(480, n * (barMinW + gap) + 40);
  const showLabels = n <= maxLabels;

  return (
    <div style={{ width: W, height }}>
    <RBarChart width={W} height={height} data={items} margin={{ top: 24, right: 10, left: 10, bottom: showLabels ? 30 : 8 }} role="img" aria-label={ariaLabel || ''}>
      <XAxis
        dataKey="label" axisLine={{ stroke: cssVar('--baseline') }} tickLine={false}
        tick={showLabels ? <WrappedTick /> : false} interval={0}
      />
      <YAxis hide domain={[0, 'dataMax']} />
      <Tooltip
        cursor={{ fill: cssVar('--grid') }}
        content={<ChartTooltip formatter={(v) => (fmt ? fmt(v) : fmtNum.format(v))} />}
      />
      <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
        {items.map((d, i) => (
          <Cell key={d.label} fill={color ? color(d, i) : catColor(0)} />
        ))}
        {showLabels && (
          <LabelList
            dataKey="value" position="top" className="value-label"
            formatter={(v) => (fmtShort ? fmtShort(v) : fmtNum.format(v))}
          />
        )}
      </Bar>
    </RBarChart>
    </div>
  );
}
