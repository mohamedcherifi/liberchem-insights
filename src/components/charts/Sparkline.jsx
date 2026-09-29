const W = 72, H = 24, PAD = 2;

export default function Sparkline({ values, color }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const n = values.length;
  const xAt = (i) => PAD + (i * (W - PAD * 2)) / (n - 1);
  const yAt = (v) => H - PAD - ((v - min) / range) * (H - PAD * 2);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(v)}`).join(' ');
  const lastX = xAt(n - 1), lastY = yAt(values[n - 1]);

  return (
    <svg className="sparkline" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <path d={d} fill="none" stroke={color || 'var(--muted)'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2" fill={color || 'var(--muted)'} />
    </svg>
  );
}
