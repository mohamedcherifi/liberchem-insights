import { useMemo, useState } from 'react';

export default function DataTable({ rows, cols, chipFn, searchKeys, topN }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(-1);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchKeys || !query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
  }, [rows, query, searchKeys]);

  const sorted = useMemo(() => {
    const base = sortKey
      ? filtered.slice().sort((a, b) => {
          const av = a[sortKey], bv = b[sortKey];
          if (typeof av === 'number') return (av - bv) * sortDir;
          return String(av).localeCompare(String(bv)) * sortDir;
        })
      : filtered;
    return topN ? base.slice(0, topN) : base;
  }, [filtered, sortKey, sortDir, topN]);

  function onSort(key) {
    if (sortKey === key) setSortDir((d) => d * -1);
    else { setSortKey(key); setSortDir(-1); }
  }

  return (
    <>
      {searchKeys && (
        <div className="table-toolbar">
          <input
            type="text" className="table-search" placeholder="Search…"
            value={query} onChange={(e) => setQuery(e.target.value)}
          />
          <span className="table-count">{sorted.length} of {filtered.length}{filtered.length !== rows.length ? ` (of ${rows.length})` : ''} rows</span>
        </div>
      )}
      {!sorted.length ? (
        <p className="cap">No rows match.</p>
      ) : (
        <table>
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key} className={c.num ? 'num' : ''} onClick={() => onSort(c.key)}>
                  {c.label}
                  {sortKey === c.key && <span className="sort-arrow">{sortDir === 1 ? '▲' : '▼'}</span>}
                </th>
              ))}
              {chipFn && <th />}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c.key} className={(c.num ? 'num tab-nums' : '') + (c.mono ? ' mono' : '')}>
                    {c.render(r[c.key])}
                  </td>
                ))}
                {chipFn && <td dangerouslySetInnerHTML={{ __html: chipFn(r) }} />}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
