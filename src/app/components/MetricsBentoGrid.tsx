'use client';

import React from 'react';
import MetricCard from '@/components/ui/MetricCard';
import { IndianRupee, Activity, Percent, BarChart2, Database } from 'lucide-react';
import { useDatasets } from '@/contexts/DatasetContext';
import { money } from '@/lib/forecast/report';

const EMPTY_VALUE = '—';
const EMPTY_SUB = 'No data yet — upload a file to get started';

export default function MetricsBentoGrid() {
  const { latestForecast, isLoadingForecasts } = useDatasets();

  const fmt = (n: number | null | undefined, prefix = '') =>
    n != null ? `${prefix}${n.toLocaleString()}` : EMPTY_VALUE;

  const projectedRevenue = latestForecast?.projectedRevenue != null
    ? money(latestForecast.projectedRevenue)
    : EMPTY_VALUE;

  const mape = latestForecast?.mape != null
    ? `${latestForecast.mape.toFixed(1)}%`
    : EMPTY_VALUE;

  const growthRate = latestForecast?.growthRate != null
    ? `${latestForecast.growthRate >= 0 ? '+' : ''}${latestForecast.growthRate.toFixed(1)}%`
    : EMPTY_VALUE;
  const horizon = latestForecast?.horizonWeeks ?? 12;
  const ciLevel = latestForecast?.confidenceLevel ?? 80;

  const avgCiWidth = latestForecast?.avgCiWidth != null
    ? `±${latestForecast.avgCiWidth.toFixed(1)}%`
    : EMPTY_VALUE;

  const dataCoverage = latestForecast?.dataCoverage ?? EMPTY_VALUE;

  const subValue = isLoadingForecasts ? 'Loading…' : EMPTY_SUB;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {/* Hero — Projected Revenue */}
      <div className="col-span-2">
        <MetricCard
          label={`Projected Revenue — Next ${horizon} Weeks`}
          value={projectedRevenue}
          subValue={latestForecast ? `Based on ${latestForecast.runName}` : subValue}
          variant="hero"
          icon={<IndianRupee size={16} style={{ color: 'var(--primary)' }} />}
          className="h-full"
        />
      </div>

      {/* MAPE */}
      <MetricCard
        label="Forecast Accuracy (MAPE)"
        value={mape}
        subValue={latestForecast ? (latestForecast.mape != null ? 'Hold-out error · lower is better' : 'Not enough history to measure') : subValue}
        variant="default"
        icon={<Activity size={16} style={{ color: 'var(--muted-foreground)' }} />}
      />

      {/* Growth Rate */}
      <MetricCard
        label="Projected Growth"
        value={growthRate}
        subValue={latestForecast ? `vs. previous ${horizon} weeks` : subValue}
        variant="default"
        icon={<Percent size={16} style={{ color: 'var(--muted-foreground)' }} />}
      />

      {/* Confidence Interval Width */}
      <MetricCard
        label="Avg. CI Width"
        value={avgCiWidth}
        subValue={latestForecast ? `${ciLevel}% confidence interval` : subValue}
        variant="default"
        icon={<BarChart2 size={16} style={{ color: 'var(--muted-foreground)' }} />}
      />

      {/* Data Coverage */}
      <MetricCard
        label="Data Coverage"
        value={dataCoverage}
        subValue={latestForecast ? 'Rows in training set' : subValue}
        variant="default"
        icon={<Database size={16} style={{ color: 'var(--muted-foreground)' }} />}
      />
    </div>
  );
}