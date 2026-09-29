import { cssVar } from '../../lib/svg';
import { useTooltip } from '../Tooltip';

export default function DivergingChart({ items, fmt }) {
  const { show, hide } = useTooltip();
  if (!items.length) return <p className="cap">No data in range.</p>;

  const rowH = 26, padL = 176, padR = 60, padT = 8, padB = 8;
  const n = items.length;
  const H = n * rowH + padT + padB;
  const W = 640;
  const innerW = W - padL - padR;
  const maxAbs = Math.max(...items.map((d) => Math.abs(d.value)), 0.01);
  const mid = padL + innerW / 2;
  const scale = innerW / 2 / maxAbs;
  const divA = cssVar('--div-a'), divB = cssVar('--div-b');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <line className="axis-line" x1={mid} y1={padT} x2={mid} y2={H - padB} />
      {items.map((d, i) => {
        const y = padT + i * rowH + 4;
        const bh = rowH - 10;
        const w = Math.abs(d.value) * scale;
        const x = d.value >= 0 ? mid : mid - w;
        const color = d.value >= 0 ? divB : divA;
        const label = d.label.length > 24 ? d.label.slice(0, 23) + '…' : d.label;
        return (
          <g key={d.label}>
            <rect
              x={x} y={y} width={Math.max(w, 1.5)} height={bh} rx={2} fill={color} className="bar"
              onMouseMove={(e) => show(e.clientX, e.clientY, `<div class="t-title">${d.label}</div>${fmt(d.value)}`)}
              onMouseLeave={hide}
            />
            <text x={padL - 10} y={y + bh / 2 + 3.5} textAnchor="end" className="cat-label">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}
