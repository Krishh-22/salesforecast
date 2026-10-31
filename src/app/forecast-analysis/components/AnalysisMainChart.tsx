'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ui/LoadingSkeleton';
import { Download, ZoomIn } from 'lucide-react';

const AnalysisChartInner = dynamic(() => import('./AnalysisChartInner'), {
  ssr: false,
  loading: () => <ChartSkeleton height="h-96" />,
});

interface ForecastPoint {
  week: string;
  isoDate?: string;
  actual: number | null;
  predicted: number;
  lower: number | null;
  upper: number | null;
}

interface Props {
  data: ForecastPoint[];
  runName?: string;
  modelLabel?: string;
  showCI: boolean;
  showActual: boolean;
}

function downloadCsv(runName: string | undefined, data: ForecastPoint[]) {
  const header = 'week,actual,predicted,lower,upper';
  const lines = data.map((d) => [d.isoDate ?? d.week, d.actual ?? '', d.predicted, d.lower ?? '', d.upper ?? ''].join(','));
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(runName ?? 'forecast').replace(/[^\w-]+/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AnalysisMainChart({ data, runName, modelLabel, showCI, showActual }: Props) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">Actual vs. Predicted — Full Detail View</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {runName ? `${runName}${modelLabel ? ` · ${modelLabel}` : ''}` : 'Upload data and run a forecast to see the full detail view'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoomed((v) => !v)} disabled={!data?.length} className="btn-ghost text-xs gap-1.5">
            <ZoomIn size={14} />
            {zoomed ? 'Show all history' : 'Zoom to forecast'}
          </button>
          <button onClick={() => downloadCsv(runName, data ?? [])} disabled={!data?.length} className="btn-secondary text-xs gap-1.5">
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-5 mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        {[
          { color: 'var(--foreground)', label: 'Actual sales', type: 'solid', show: showActual },
          { color: 'var(--primary)', label: `Forecast${modelLabel ? ` (${modelLabel})` : ''}`, type: 'dashed', show: true },
          { color: 'rgba(59,111,212,0.25)', label: 'Confidence range', type: 'area', show: showCI },
        ]
          .filter((i) => i.show)
          .map((item) => (
            <div key={`legend-a-${item.label}`} className="flex items-center gap-2">
              {item.type === 'area' ? (
                <div className="w-5 h-3 rounded" style={{ background: item.color }} />
              ) : (
                <div
                  className="w-5"
                  style={{
                    height: 0,
                    borderTop: `2px ${item.type === 'dashed' ? 'dashed' : 'solid'} ${item.color}`,
                  }}
                />
              )}
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {item.label}
              </span>
            </div>
          ))}
      </div>
      <AnalysisChartInner data={data ?? []} showCI={showCI} showActual={showActual} zoomed={zoomed} />
    </div>
  );
}
