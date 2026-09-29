import { roundedTopPath } from '../../lib/svg';
import { fmtNum } from '../../lib/format';
import { useTooltip } from '../Tooltip';

export default function GroupedBarChart({ buckets, seriesA, seriesB, height = 240, colorA, colorB, labelFn }) {
  const { show, hide } = useTooltip();
  if (!buckets.length) return <p className="cap">No data in range.</p>;

  const H = height, padL = 6, padR = 6, padT = 18, padB = 34;
  const groupMinW = 46, gap = 16;
  const n = buckets.length;
  const W = Math.max(560, n * (groupMinW + gap) + padL + padR);
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxV = Math.max(1, ...buckets.map((k) => Math.max(seriesA.get(k) || 0, seriesB.get(k) || 0)));
  const groupW = innerW / n;
  const barW = (groupW - gap) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <line className="axis-line" x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} />
      {buckets.map((k, i) => {
        const gx = padL + i * groupW + gap / 2;
        const va = seriesA.get(k) || 0, vb = seriesB.get(k) || 0;
        return (
          <g key={k}>
            {[[va, colorA, 0, 'Open'], [vb, colorB, 1, 'Late']].map(([v, c, j, label]) => {
              const bh = (v / maxV) * innerH;
              const x = gx + j * (barW + 2);
              const y = H - padB - bh;
              return (
                <path
                  key={j}
                  d={roundedTopPath(x, y, barW, bh, 3)}
                  className="bar"
                  fill={c}
                  onMouseMove={(e) => show(e.clientX, e.clientY, `<div class="t-title">${labelFn(k)}</div>${label}: ${fmtNum.format(v)}`)}
                  onMouseLeave={hide}
                />
              );
            })}
            {n <= 24 && (
              <text x={gx + barW + 1} y={H - padB + 16} textAnchor="middle" className="cat-label">{labelFn(k)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
