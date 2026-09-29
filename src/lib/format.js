export const fmtCur = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
export const fmtCurP = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 });
export const fmtNum = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 });
export const fmtNum1 = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 1 });

export function fmtPct(n) {
  return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
}
export function fmtShortCur(v) {
  return '$' + Math.round(v / 1000) + 'k';
}
export function monthKey(iso) {
  return iso ? iso.slice(0, 7) : null;
}
export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}
export function sum(arr, fn) {
  let t = 0;
  for (const x of arr) t += fn(x) || 0;
  return t;
}
export function groupSum(rows, keyFn, valFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (k === null || k === undefined) continue;
    m.set(k, (m.get(k) || 0) + (valFn(r) || 0));
  }
  return m;
}
export function sortedEntries(map, desc = true) {
  return Array.from(map.entries()).sort((a, b) => (desc ? b[1] - a[1] : a[1] - b[1]));
}
export function daysBetween(a, b) {
  if (!a || !b) return null;
  const da = new Date(a + 'T00:00:00Z'), db = new Date(b + 'T00:00:00Z');
  return Math.round((db - da) / 86400000);
}

// Given the currently selected [start,end], compute the window to compare against.
// mode: 'prev' = immediately preceding window of the same length; 'yoy' = same dates, one year earlier.
export function previousPeriod(start, end, mode, floorDate) {
  if (mode === 'none' || !mode) return null;
  if (mode === 'yoy') {
    const s = new Date(start + 'T00:00:00Z'); s.setUTCFullYear(s.getUTCFullYear() - 1);
    const e = new Date(end + 'T00:00:00Z'); e.setUTCFullYear(e.getUTCFullYear() - 1);
    const pStart = s.toISOString().slice(0, 10), pEnd = e.toISOString().slice(0, 10);
    if (floorDate && pEnd < floorDate) return null;
    return { start: pStart, end: pEnd };
  }
  // prev: same length, immediately before `start`
  const lenDays = daysBetween(start, end);
  const e = new Date(start + 'T00:00:00Z'); e.setUTCDate(e.getUTCDate() - 1);
  const s = new Date(e); s.setUTCDate(s.getUTCDate() - lenDays);
  const pStart = s.toISOString().slice(0, 10), pEnd = e.toISOString().slice(0, 10);
  if (floorDate && pEnd < floorDate) return null;
  return { start: pStart, end: pEnd };
}

// Returns { pct, dir } where dir is 'up'|'down'|'flat', or null if no baseline.
export function delta(curr, prev) {
  if (prev === null || prev === undefined) return null;
  if (prev === 0) return curr === 0 ? { pct: 0, dir: 'flat' } : null;
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  return { pct, dir: pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat' };
}

const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Returns 0=Monday..6=Sunday to match a conventional business-week reading order.
export function dayOfWeekMon0(iso) {
  const d = new Date(iso + 'T00:00:00Z').getUTCDay(); // 0=Sun..6=Sat
  return (d + 6) % 7;
}
export function dowLabel(mon0Index) {
  return DOW_LABELS[(mon0Index + 1) % 7];
}

export function monthRange(startIso, endIso) {
  const out = [];
  let [y, m] = startIso.slice(0, 7).split('-').map(Number);
  const [ey, em] = endIso.slice(0, 7).split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}
