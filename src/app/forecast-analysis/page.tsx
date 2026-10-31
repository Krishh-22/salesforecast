'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import AnalysisFilterPanel from './components/AnalysisFilterPanel';
import AnalysisMainChart from './components/AnalysisMainChart';
import AccuracyMetricsTable from './components/AccuracyMetricsTable';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import { useDatasets } from '@/contexts/DatasetContext';
import { MODEL_LABELS, type ModelId } from '@/lib/forecast/engine';

export default function ForecastAnalysisPage() {
  const { forecastRuns, latestForecast } = useDatasets();
  const completedRuns = forecastRuns?.filter((r) => r?.status === 'completed');

  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [showCI, setShowCI] = useState(true);
  const [showActual, setShowActual] = useState(true);

  const selectedRun = completedRuns?.find((r) => r?.id === selectedRunId) ?? latestForecast ?? null;
  const forecastData = selectedRun?.forecastData ?? [];
  const segmentData = selectedRun?.segmentData ?? [];
  const diagnostics = selectedRun?.diagnostics ?? null;
  const modelLabel = selectedRun ? diagnostics?.modelLabel ?? MODEL_LABELS[selectedRun.model as ModelId] ?? selectedRun.model : undefined;

  return (
    <AppLayout
      title="Forecast Analysis"
      subtitle={selectedRun ? `Showing: ${selectedRun.runName} · ${modelLabel}` : 'Run a forecast to see detailed analysis'}
    >
      <div className="grid grid-cols-1 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1">
          <AnalysisFilterPanel
            selectedRunId={selectedRun?.id ?? ''}
            onSelectRun={setSelectedRunId}
            showCI={showCI}
            onShowCI={setShowCI}
            showActual={showActual}
            onShowActual={setShowActual}
          />
        </div>
        <div className="xl:col-span-3 space-y-6">
          <AnalysisMainChart
            data={forecastData}
            runName={selectedRun?.runName}
            modelLabel={modelLabel}
            showCI={showCI}
            showActual={showActual}
          />
          <AccuracyMetricsTable
            diagnostics={diagnostics}
            segmentData={segmentData}
            modelUsedLabel={modelLabel}
            horizonWeeks={selectedRun?.horizonWeeks}
          />
          <DiagnosticsPanel
            data={forecastData}
            seasonalProfile={diagnostics?.seasonalProfile ?? []}
            seasonLength={diagnostics?.seasonLength ?? 0}
          />
        </div>
      </div>
    </AppLayout>
  );
}
