import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Issue } from '@/lib/forecast/data';

type Props = {
  issues: Issue[];
  passed: string[];
};

export default function ValidationErrors({ issues, passed }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
        Validation Results
      </p>
      {issues.map((err) => (
        <div
          key={err.id}
          className="flex gap-3 p-3 rounded-lg"
          style={{
            background: err.level === 'error' ? 'var(--negative-bg)' : 'var(--warning-bg)',
            border: `1px solid ${err.level === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
          }}
        >
          {err.level === 'error' ? (
            <AlertCircle size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--negative)' }} />
          ) : (
            <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold text-foreground">{err.message}</p>
              {err.column && (
                <span
                  className="font-mono text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                >
                  {err.column}
                </span>
              )}
            </div>
            {err.suggestion && (
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                💡 {err.suggestion}
              </p>
            )}
          </div>
        </div>
      ))}
      {passed.length > 0 && (
        <div className="rounded-lg p-3" style={{ background: 'var(--positive-bg)', border: '1px solid rgba(0,212,170,0.2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} style={{ color: 'var(--positive)' }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--positive)' }}>
              {passed.length} check{passed.length !== 1 ? 's' : ''} passed
            </p>
          </div>
          <ul className="space-y-0.5">
            {passed.map((p, i) => (
              <li key={`pass-${i}`} className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                ✓ {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
