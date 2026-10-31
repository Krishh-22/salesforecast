'use client';

import React, { useState } from 'react';
import { Search, FileText, Trash2 } from 'lucide-react';
import type { ExportEntry } from './ReportTemplates';

type Props = {
  history: ExportEntry[];
  onClear: () => void;
};

function size(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function ExportHistoryTable({ history, onClear }: Props) {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const rows = q ? history.filter((h) => `${h.name} ${h.kind} ${h.runName}`.toLowerCase().includes(q)) : history;

  return (
    <div className="card-elevated overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="text-base font-semibold text-foreground">Export History</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {history.length} export{history.length !== 1 ? 's' : ''} · saved in this browser only
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              placeholder="Search exports…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-8 h-8 text-xs w-48"
              aria-label="Search exports"
            />
          </div>
          {history.length > 0 && (
            <button onClick={onClear} className="btn-ghost h-8 px-2 text-xs gap-1" title="Clear history">
              <Trash2 size={12} />
              Clear
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText size={32} style={{ color: 'var(--muted-foreground)' }} className="mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground mb-1">{history.length === 0 ? 'No exports yet' : 'No matches'}</p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {history.length === 0 ? 'Files you download above will be listed here' : 'Try a different search'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--muted)' }}>
                {['File', 'Type', 'Forecast run', 'Size', 'When'].map((h) => (
                  <th key={`eh-${h}`} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3 text-xs font-mono text-foreground">{h.name}</td>
                  <td className="px-4 py-3 text-xs">{h.kind}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{h.runName}</td>
                  <td className="px-4 py-3 text-xs font-mono">{size(h.bytes)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{new Date(h.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
