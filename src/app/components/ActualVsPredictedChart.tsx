'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ui/LoadingSkeleton';

const ActualVsPredictedInner = dynamic(
  () => import('./ActualVsPredictedChartInner'),
  { ssr: false, loading: () => <ChartSkeleton height="h-72" /> }
);

export default function ActualVsPredictedChart() {
  const [range, setRange] = useState<'6m' | '12m' | '18m'>('12m');

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Actual vs. Predicted Sales</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Weekly sales: actual, fitted and forecast, with confidence range
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--muted)' }}>
          {(['6m', '12m', '18m'] as const).map((r) => (
            <button
              key={`range-${r}`}
              onClick={() => setRange(r)}
              className="px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150"
              style={{
                background: range === r ? 'var(--card)' : 'transparent',
                color: range === r ? 'var(--foreground)' : 'var(--muted-foreground)',
                boxShadow: range === r ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        {[
          { color: 'var(--foreground)', label: 'Actual', dashed: false },
          { color: 'var(--primary)', label: 'Predicted', dashed: false },
          { color: 'var(--primary)', label: '80% CI', dashed: true, opacity: true },
        ].map((item) => (
          <div key={`legend-${item.label}`} className="flex items-center gap-1.5">
            <div
              className="w-6 h-0.5 rounded"
              style={{
                background: item.opacity ? 'rgba(59,111,212,0.25)' : item.color,
                borderTop: item.dashed ? '2px dashed' : 'none',
                height: item.dashed ? '0' : '2px',
              }}
            />
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{item.label}</span>
          </div>
        ))}
      </div>

      <ActualVsPredictedInner range={range} />
    </div>
  );
}