import { wrapLabel } from '../../lib/svg';

export function WrappedTick({ x, y, payload, maxChars = 14 }) {
  const lines = wrapLabel(String(payload.value), maxChars);
  return (
    <text x={x} y={y + 12} textAnchor="middle" className="cat-label">
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : 12}>{line}</tspan>
      ))}
    </text>
  );
}
