'use client';

import React from 'react';
import Toggle from '@/components/ui/Toggle';
import { Filter, RotateCcw } from 'lucide-react';
import { useDatasets } from '@/contexts/DatasetContext';

interface Props {
  selectedRunId: string;
  onSelectRun: (id: string) => void;
  showCI: boolean;
  onShowCI: (v: boolean) => void;
  showActual: boolean;
  onShowActual: (v: boolean) => void;
}

export default function AnalysisFilterPanel({ selectedRunId, onSelectRun, showCI, onShowCI, showActual, onShowActual }: Props) {
  const { forecastRuns, isLoadingForecasts } = useDatasets();
  const completedRuns = forecastRuns.filter((r) => r.status === 'completed');
  const selected = completedRuns.find((r) => r.id === selectedRunId) ?? completedRuns[0];

  const reset = () => {
    onShowCI(true);
    onShowActual(true);
    if (completedRuns.length > 0) onSelectRun(completedRuns[0].id);
  };

  return (
    <div className="card-elevated p-5 space-y-5 sticky top-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={15} style={{ color: 'var(--primary)' }} />
          <h2 className="text-sm font-semibold text-foreground">Filters</h2>
        </div>
        <button onClick={reset} className="btn-ghost text-xs h-7 px-2 gap-1">
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
          Forecast Run
        </label>
        {isLoadingForecasts ? (
          <p className="text-xs italic" style={{ color: 'var(--muted-foreground)' }}>
            Loading…
          </p>
        ) : completedRuns.length === 0 ? (
          <p className="text-xs italic" style={{ color: 'var(--muted-foreground)' }}>
            No runs yet
          </p>
        ) : (
          <>
            <select value={selected?.id ?? ''} onChange={(e) => onSelectRun(e.target.value)} className="input-field text-xs">
              {completedRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.runName}
                </option>
              ))}
            </select>
            {selected && (
              <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                {selected.horizonWeeks}-week horizon · {selected.confidenceLevel}% interval
                <br />
                {new Date(selected.createdAt).toLocaleString()}
              </p>
            )}
          </>
        )}
      </div>

      <div className="space-y-3 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide pt-3" style={{ color: 'var(--muted-foreground)' }}>
          Chart Overlays
        </p>
        <Toggle checked={showCI} onChange={onShowCI} label="Confidence range" size="sm" />
        <Toggle checked={showActual} onChange={onShowActual} label="Actual sales" size="sm" />
      </div>
    </div>
  );
}
