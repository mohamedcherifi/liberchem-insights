import { useRef, useState } from 'react';
import { cssVar, catColor } from '../../lib/svg';
import { fmtNum } from '../../lib/format';
import { useTooltip } from '../Tooltip';

export default function LineChart({ buckets, seriesMap, height = 220, color, labelFn, fmt, fmtShort }) {
  const { show, hide } = useTooltip();
  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!buckets.length) return <p className="cap">No data in range.</p>;

  const H = height, padL = 8, padR = 26, padT = 20, padB = 32;
  const stepMinW = 46;
  const n = buckets.length;
  const W = Math.max(560, (n - 1) * stepMinW + padL + padR + 20);
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const values = buckets.map((k) => seriesMap.get(k) || 0);
  const maxV = Math.max(...values, 1);
  const minV = Math.min(0, ...values);
  const range = maxV - minV || 1;
  const xAt = (i) => padL + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const yAt = (v) => padT + innerH - ((v - minV) / range) * innerH;
  const lineColor = color || catColor(0);

  const zeroY = yAt(Math.max(minV, 0));
  let lineD = '';
  values.forEach((v, i) => { lineD += (i === 0 ? 'M' : 'L') + xAt(i) + ',' + yAt(v) + ' '; });
  let areaD = `M${xAt(0)},${zeroY} `;
  values.forEach((v, i) => { areaD += `L${xAt(i)},${yAt(v)} `; });
  areaD += `L${xAt(n - 1)},${zeroY} Z`;

  const peakIdx = values.indexOf(maxV);
  const selectiveIdx = Array.from(new Set([0, n - 1, peakIdx]));
  const labelEvery = Math.max(1, Math.ceil(n / 10));

  function onMove(e) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = (e.clientX - rect.left) * (W / rect.width);
    let idx = Math.round((relX - padL) / (innerW / Math.max(n - 1, 1)));
    idx = Math.max(0, Math.min(n - 1, idx));
    setHoverIdx(idx);
    show(e.clientX, e.clientY, `<div class="t-title">${labelFn(buckets[idx])}</div>${fmt ? fmt(values[idx]) : fmtNum.format(values[idx])}`);
  }
  function onLeave() { setHoverIdx(null); hide(); }

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      {[0, 1, 2].map((g) => {
        const gy = padT + (innerH * g) / 2;
        return <line key={g} className="grid-line" x1={padL} y1={gy} x2={W - padR} y2={gy} />;
      })}
      <line className="axis-line" x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} />
      <path d={areaD} fill={lineColor} opacity="0.10" stroke="none" />
      <path d={lineD.trim()} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {selectiveIdx.map((i) => {
        const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
        return (
          <text key={i} x={xAt(i)} y={yAt(values[i]) - 10} textAnchor={anchor} className="value-label">
            {fmtShort ? fmtShort(values[i]) : fmtNum.format(values[i])}
          </text>
        );
      })}
      {buckets.map((k, i) => {
        if (i % labelEvery !== 0 && i !== n - 1 && i !== 0) return null;
        const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
        return (
          <text key={k} x={xAt(i)} y={H - padB + 16} textAnchor={anchor} className="cat-label">{labelFn(k)}</text>
        );
      })}
      {hoverIdx !== null && (
        <>
          <line className="grid-line" x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={padT} y2={H - padB} />
          <circle r={4} cx={xAt(hoverIdx)} cy={yAt(values[hoverIdx])} fill={lineColor} stroke={cssVar('--surface')} strokeWidth="2" />
        </>
      )}
      <rect x={padL} y={padT} width={innerW} height={innerH} fill="transparent" onMouseMove={onMove} onMouseLeave={onLeave} />
    </svg>
  );
}
