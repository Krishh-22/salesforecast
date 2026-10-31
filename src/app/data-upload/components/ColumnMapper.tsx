'use client';

import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { ColumnMapping, DateOrder } from '@/lib/forecast/data';

type Props = {
  headers: string[];
  sampleRow: string[];
  mapping: ColumnMapping;
  onMappingChange: (next: ColumnMapping) => void;
  dateOrder: DateOrder;
  onDateOrderChange: (next: DateOrder) => void;
};

const NONE = '-1';

export default function ColumnMapper({
  headers,
  sampleRow,
  mapping,
  onMappingChange,
  dateOrder,
  onDateOrderChange,
}: Props) {
  const fields: {
    key: keyof ColumnMapping;
    label: string;
    hint: string;
    required: boolean;
  }[] = [
    { key: 'date', label: 'Date', hint: 'When the sale happened', required: true },
    { key: 'value', label: 'Sales / Revenue', hint: 'The number to forecast', required: true },
    { key: 'category', label: 'Category (optional)', hint: 'Used for the segment chart', required: false },
  ];

  const setField = (key: keyof ColumnMapping, raw: string) => {
    const idx = Number(raw);
    onMappingChange({ ...mapping, [key]: idx < 0 ? null : idx });
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted-foreground)' }}>
        Column Mapping
      </p>
      <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--muted)' }}>
              {['Field', 'Column in your file', 'Example value', 'Status'].map((h) => (
                <th
                  key={`cm-h-${h}`}
                  className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => {
              const idx = mapping[f.key];
              const missing = f.required && idx == null;
              return (
                <tr
                  key={`cm-${f.key}`}
                  style={{ background: i % 2 === 0 ? 'var(--card)' : 'var(--secondary)', borderBottom: '1px solid var(--border)' }}
                >
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-semibold text-foreground">{f.label}</p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{f.hint}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={idx == null ? NONE : String(idx)}
                      onChange={(e) => setField(f.key, e.target.value)}
                      className="input-field text-xs py-1 font-mono"
                      style={{ width: '200px' }}
                      aria-label={`${f.label} column`}
                    >
                      <option value={NONE}>— none —</option>
                      {headers.map((h, hi) => (
                        <option key={`cm-opt-${f.key}-${hi}`} value={String(hi)}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs max-w-[160px] truncate" style={{ color: 'var(--muted-foreground)' }}>
                    {idx != null ? sampleRow[idx] ?? '' : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {missing ? (
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--negative)' }}>
                        <AlertCircle size={13} /> Required
                      </span>
                    ) : idx != null ? (
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--positive)' }}>
                        <CheckCircle2 size={13} /> Mapped
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Skipped</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <label className="text-xs font-semibold text-foreground" htmlFor="date-order">
          Date format
        </label>
        <select
          id="date-order"
          value={dateOrder}
          onChange={(e) => onDateOrderChange(e.target.value as DateOrder)}
          className="input-field text-xs py-1"
          style={{ width: '200px' }}
        >
          <option value="dmy">Day / Month / Year (15/03/2024)</option>
          <option value="mdy">Month / Day / Year (03/15/2024)</option>
        </select>
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Only matters for dates like 03/04/2024
        </span>
      </div>
    </div>
  );
}
