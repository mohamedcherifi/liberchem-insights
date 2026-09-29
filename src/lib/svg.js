export function wrapLabel(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const words = text.split(' ');
  if (words.length === 1) return [text.slice(0, maxChars - 1) + '…'];
  let l1 = '', l2 = '';
  for (const w of words) {
    if ((l1 + ' ' + w).trim().length <= maxChars || !l1) l1 = (l1 + ' ' + w).trim();
    else l2 = (l2 + ' ' + w).trim();
  }
  if (!l2) return [l1];
  if (l2.length > maxChars) l2 = l2.slice(0, maxChars - 1) + '…';
  return [l1, l2];
}

const CAT_ORDER = ['--cat1', '--cat2', '--cat3', '--cat4', '--cat5', '--cat6', '--cat7', '--cat8'];

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
export function catColor(i) {
  return cssVar(CAT_ORDER[i % CAT_ORDER.length]);
}
