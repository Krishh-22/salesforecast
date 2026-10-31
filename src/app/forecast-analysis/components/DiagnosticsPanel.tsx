'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ui/LoadingSkeleton';
import type { SeasonalPoint } from '@/lib/forecast/engine';

const ResidualsChart = dynamic(() => import('./ResidualsChart'), { ssr: false, loading: () => <ChartSkeleton height="h-48" /> });
const SeasonalityChart = dynamic(() => import('./SeasonalityChart'), { ssr: false, loading: () => <ChartSkeleton height="h-48" /> });

interface ForecastPoint {
  week: string;
  actual: number | null;
  predicted: number;
  lower: number | null;
  upper: number | null;
}

interface Props {
  data: ForecastPoint[];
  seasonalProfile: SeasonalPoint[];
  seasonLength: number;
}

export default function DiagnosticsPanel({ data, seasonalProfile, seasonLength }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="card-elevated p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Residuals (in-sample)</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
          Actual minus fitted value per week — a good model scatters around zero with no pattern
        </p>
        <ResidualsChart data={data ?? []} />
      </div>
      <div className="card-elevated p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Seasonal Pattern</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
          {seasonLength > 0
            ? `Average effect on weekly sales across the detected ${seasonLength}-week cycle, after removing the trend`
            : 'Average repeating effect on weekly sales after removing the trend'}
        </p>
        <SeasonalityChart profile={seasonalProfile ?? []} />
      </div>
    </div>
  );
}
