'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import Link from 'next/link';
import { useDatasets } from '@/contexts/DatasetContext';
import { MODEL_LABELS, type ModelId } from '@/lib/forecast/engine';

export default function RunHistoryPanel() {
  const { forecastRuns, isLoadingForecasts } = useDatasets();
  const runs = forecastRuns.slice(0, 8);

  return (
    <div className="card-elevated p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Run History</h2>
        <Link href="/" className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
          View Dashboard →
        </Link>
      </div>

      {isLoadingForecasts ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Loading runs…
          </p>
        </div>
      ) : runs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <Clock size={32} style={{ color: 'var(--muted-foreground)' }} className="mb-3 opacity-50" />
          <p className="text-sm font-medium text-foreground mb-1">No runs yet</p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Configure a model and press Run Forecast
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {runs.map((r) => (
            <li
              key={`run-hist-${r.id}`}
              className="rounded-lg p-3"
              style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm font-semibold text-foreground truncate">{r.runName}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {MODEL_LABELS[r.model as ModelId] ?? r.model} · {r.horizonWeeks} wks
                {r.mape != null ? ` · MAPE ${Number(r.mape).toFixed(1)}%` : ''}
              </p>
              <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {new Date(r.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
