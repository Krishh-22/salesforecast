-- Store the parsed weekly series with each dataset so forecasts are computed from real uploaded data.
-- Run this once in the Supabase SQL editor (or `supabase db push`) BEFORE using the new upload flow.

ALTER TABLE public.datasets
    ADD COLUMN IF NOT EXISTS series_data JSONB;

COMMENT ON COLUMN public.datasets.series_data IS
    'Weekly aggregated series: { weeks: string[], values: number[], categories: {name, values[]}[], dateColumn, valueColumn, categoryColumn }';

-- Existing RLS policy (users_manage_own_datasets) already covers the new column.

-- Real per-run diagnostics (model leaderboard, seasonal profile, hold-out error) shown on the Forecast Analysis page.
ALTER TABLE public.forecast_runs
    ADD COLUMN IF NOT EXISTS diagnostics JSONB;

COMMENT ON COLUMN public.forecast_runs.diagnostics IS
    'Run diagnostics: { modelLabel, seasonLength, backtestWeeks, historyWeeks, mape, rmse, leaderboard[], seasonalProfile[], notes[] }';
