import { AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { cssVar, catColor } from '../../lib/svg';
import { fmtNum } from '../../lib/format';
import { ChartTooltip } from './ChartTooltip';

export default function LineChart({ buckets, seriesMap, height = 220, color, labelFn, fmt, fmtShort }) {
  if (!buckets.length) return <p className="cap">No data in range.</p>;

  const n = buckets.length;
  const stepMinW = 46;
  const W = Math.max(560, (n - 1) * stepMinW + 60);
  const lineColor = color || catColor(0);
  const data = buckets.map((k) => ({ key: k, label: labelFn(k), value: seriesMap.get(k) || 0 }));
  const values = data.map((d) => d.value);
  const maxV = Math.max(...values, 1);
  const peakIdx = values.indexOf(maxV);
  const selectiveIdx = new Set([0, n - 1, peakIdx]);
  const labelEvery = Math.max(1, Math.ceil(n / 10));

  return (
    <div style={{ width: W, height }}>
    <AreaChart width={W} height={height} data={data} margin={{ top: 24, right: 26, left: 8, bottom: 24 }}>
      <XAxis
        dataKey="label" axisLine={{ stroke: cssVar('--baseline') }} tickLine={false}
        tick={{ fontSize: 11, fill: cssVar('--muted') }}
        tickFormatter={(value, index) => (index % labelEvery === 0 || index === n - 1 || index === 0 ? value : '')}
        interval={0}
      />
      <YAxis hide domain={[Math.min(0, ...values), 'dataMax']} />
      <Tooltip
        cursor={{ stroke: cssVar('--grid') }}
        content={<ChartTooltip formatter={(v) => (fmt ? fmt(v) : fmtNum.format(v))} />}
      />
      <Area
        type="linear" dataKey="value" stroke={lineColor} strokeWidth={2} fill={lineColor} fillOpacity={0.1}
        dot={false} activeDot={{ r: 4, fill: lineColor, stroke: cssVar('--surface'), strokeWidth: 2 }}
        label={(props) => {
          const { x, y, index, value } = props;
          if (!selectiveIdx.has(index)) return null;
          const anchor = index === 0 ? 'start' : index === n - 1 ? 'end' : 'middle';
          return (
            <text key={index} x={x} y={y - 10} textAnchor={anchor} className="value-label">
              {fmtShort ? fmtShort(value) : fmtNum.format(value)}
            </text>
          );
        }}
      />
    </AreaChart>
    </div>
  );
}
