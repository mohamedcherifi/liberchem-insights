import { BarChart as RBarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { cssVar } from '../../lib/svg';
import { fmtNum } from '../../lib/format';
import { ChartTooltip } from './ChartTooltip';
import { WrappedTick } from './WrappedTick';

export default function GroupedBarChart({ buckets, seriesA, seriesB, height = 240, colorA, colorB, labelFn }) {
  if (!buckets.length) return <p className="cap">No data in range.</p>;

  const n = buckets.length;
  const groupMinW = 46, gap = 16;
  const W = Math.max(560, n * (groupMinW + gap) + 40);
  const data = buckets.map((k) => ({ key: k, label: labelFn(k), Open: seriesA.get(k) || 0, Late: seriesB.get(k) || 0 }));

  return (
    <div style={{ width: W, height }}>
    <RBarChart width={W} height={height} data={data} margin={{ top: 10, right: 10, left: 10, bottom: 30 }} barGap={2}>
      <XAxis dataKey="label" axisLine={{ stroke: cssVar('--baseline') }} tickLine={false} tick={<WrappedTick maxChars={10} />} interval={0} />
      <YAxis hide domain={[0, 'dataMax']} />
      <Tooltip cursor={{ fill: cssVar('--grid') }} content={<ChartTooltip formatter={(v) => fmtNum.format(v)} />} />
      <Bar dataKey="Open" name="Open" fill={colorA} radius={[3, 3, 0, 0]} maxBarSize={22} />
      <Bar dataKey="Late" name="Late" fill={colorB} radius={[3, 3, 0, 0]} maxBarSize={22} />
    </RBarChart>
    </div>
  );
}
