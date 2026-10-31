import React from 'react';

type Props = {
  headers: string[];
  rows: string[][];
  totalRows: number;
};

export default function DataPreviewTable({ headers, rows, totalRows }: Props) {
  const shown = headers.slice(0, 12);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
          Data Preview — First {rows.length} Rows
        </p>
        <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
          {totalRows.toLocaleString()} total rows in file
          {headers.length > shown.length ? ` · showing ${shown.length} of ${headers.length} columns` : ''}
        </p>
      </div>
      <div className="rounded-xl overflow-hidden overflow-x-auto scrollbar-thin" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr style={{ background: 'var(--muted)' }}>
              {shown.map((c, i) => (
                <th
                  key={`prev-h-${i}`}
                  className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr
                key={`prev-r-${r}`}
                style={{ background: r % 2 === 0 ? 'var(--card)' : 'var(--secondary)', borderBottom: '1px solid var(--border)' }}
              >
                {shown.map((_, c) => (
                  <td key={`prev-c-${r}-${c}`} className="px-3 py-2 font-mono max-w-[200px] truncate">
                    {row[c] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
