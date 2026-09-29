import { roundedTopPath, wrapLabel, catColor } from '../../lib/svg';
import { fmtNum } from '../../lib/format';
import { useTooltip } from '../Tooltip';

function CatLabel({ x, y, text, maxChars = 14 }) {
  const lines = wrapLabel(text, maxChars);
  return (
    <text x={x} y={y} textAnchor="middle" className="cat-label">
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : 12}>{line}</tspan>
      ))}
    </text>
  );
}

export default function BarChart({ items, height = 220, fmt, fmtShort, color, ariaLabel, maxLabels = 10 }) {
  const { show, hide } = useTooltip();
  if (!items.length) return <p className="cap">No data in range.</p>;

  const H = height, padL = 6, padR = 6, padT = 18, padB = 46;
  const barMinW = 64, gap = 14;
  const n = items.length;
  const W = Math.max(480, n * (barMinW + gap) + padL + padR);
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxV = Math.max(...items.map((d) => d.value), 1);
  const bw = innerW / n - gap;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={ariaLabel || ''}>
      <line className="axis-line" x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} />
      {items.map((d, i) => {
        const x = padL + i * (innerW / n) + gap / 2;
        const bh = maxV > 0 ? (d.value / maxV) * innerH : 0;
        const y = H - padB - bh;
        const c = color ? color(d, i) : catColor(0);
        return (
          <g key={d.label}>
            <path
              d={roundedTopPath(x, y, bw, bh, 4)}
              className="bar"
              fill={c}
              onMouseMove={(e) => show(e.clientX, e.clientY, `<div class="t-title">${d.label}</div>${fmt ? fmt(d.value) : fmtNum.format(d.value)}`)}
              onMouseLeave={hide}
            />
            {n <= maxLabels && (
              <>
                <CatLabel x={x + bw / 2} y={H - padB + 16} text={d.label} />
                <text x={x + bw / 2} y={y - 6} textAnchor="middle" className="value-label">
                  {fmtShort ? fmtShort(d.value) : fmtNum.format(d.value)}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
