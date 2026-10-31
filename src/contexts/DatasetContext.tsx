'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SeriesData } from '@/lib/forecast/data';

export interface Dataset {
  id: string;
  userId: string;
  name: string;
  fileName: string;
  rowCount: number;
  colCount: number;
  fileSize: string;
  status: string;
  uploadedAt: string;
  /** Parsed weekly series (null for datasets uploaded before real parsing existed). */
  seriesData: SeriesData | null;
}

export interface ForecastRun {
  id: string;
  userId: string;
  datasetId: string;
  runName: string;
  model: string;
  horizonWeeks: number;
  confidenceLevel: number;
  status: string;
  projectedRevenue: number | null;
  mape: number | null;
  growthRate: number | null;
  avgCiWidth: number | null;
  dataCoverage: string | null;
  forecastData: any | null;
  segmentData: any | null;
  createdAt: string;
  completedAt: string | null;
}

interface DatasetContextValue {
  datasets: Dataset[];
  forecastRuns: ForecastRun[];
  latestForecast: ForecastRun | null;
  isLoadingDatasets: boolean;
  isLoadingForecasts: boolean;
  refreshDatasets: () => Promise<void>;
  refreshForecasts: () => Promise<void>;
  addDataset: (dataset: Dataset) => void;
  addForecastRun: (run: ForecastRun) => void;
  updateForecastRun: (id: string, updates: Partial<ForecastRun>) => void;
}

const DatasetContext = createContext<DatasetContextValue | null>(null);

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [forecastRuns, setForecastRuns] = useState<ForecastRun[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [isLoadingForecasts, setIsLoadingForecasts] = useState(false);

  const refreshDatasets = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsLoadingDatasets(true);
    try {
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.log('Datasets fetch error:', error.message);
        return;
      }

      setDatasets(
        (data || []).map((row) => ({
          id: row.id,
          userId: row.user_id,
          name: row.name,
          fileName: row.file_name,
          rowCount: row.row_count,
          colCount: row.col_count,
          fileSize: row.file_size,
          status: row.status,
          uploadedAt: row.uploaded_at,
          seriesData: row.series_data ?? null,
        }))
      );
    } catch (err: any) {
      console.log('Datasets fetch failed:', err.message);
    } finally {
      setIsLoadingDatasets(false);
    }
  }, []);

  const refreshForecasts = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsLoadingForecasts(true);
    try {
      const { data, error } = await supabase
        .from('forecast_runs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Forecast runs fetch error:', error.message);
        return;
      }

      setForecastRuns(
        (data || []).map((row) => ({
          id: row.id,
          userId: row.user_id,
          datasetId: row.dataset_id,
          runName: row.run_name,
          model: row.model,
          horizonWeeks: row.horizon_weeks,
          confidenceLevel: row.confidence_level,
          status: row.status,
          projectedRevenue: row.projected_revenue,
          mape: row.mape,
          growthRate: row.growth_rate,
          avgCiWidth: row.avg_ci_width,
          dataCoverage: row.data_coverage,
          forecastData: row.forecast_data,
          segmentData: row.segment_data,
          createdAt: row.created_at,
          completedAt: row.completed_at,
        }))
      );
    } catch (err: any) {
      console.log('Forecast runs fetch failed:', err.message);
    } finally {
      setIsLoadingForecasts(false);
    }
  }, []);

  const addDataset = useCallback((dataset: Dataset) => {
    setDatasets((prev) => [dataset, ...prev]);
  }, []);

  const addForecastRun = useCallback((run: ForecastRun) => {
    setForecastRuns((prev) => [run, ...prev]);
  }, []);

  const updateForecastRun = useCallback((id: string, updates: Partial<ForecastRun>) => {
    setForecastRuns((prev) =>
      prev.map((run) => (run.id === id ? { ...run, ...updates } : run))
    );
  }, []);

  useEffect(() => {
    refreshDatasets();
    refreshForecasts();
  }, [refreshDatasets, refreshForecasts]);

  const latestForecast = forecastRuns.find((r) => r.status === 'completed') ?? null;

  return (
    <DatasetContext.Provider
      value={{
        datasets,
        forecastRuns,
        latestForecast,
        isLoadingDatasets,
        isLoadingForecasts,
        refreshDatasets,
        refreshForecasts,
        addDataset,
        addForecastRun,
        updateForecastRun,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export function useDatasets() {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error('useDatasets must be used within DatasetProvider');
  return ctx;
}
