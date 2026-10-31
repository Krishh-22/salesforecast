'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Play, RefreshCw, ChevronDown, ChevronUp, UploadCloud, Trophy } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';
import { toast } from 'sonner';
import { useNotifications } from '@/contexts/NotificationContext';
import { useDatasets } from '@/contexts/DatasetContext';
import { createClient } from '@/lib/supabase/client';
import { buildRunPayload, MODEL_LABELS, type ForecastResult, type ModelId } from '@/lib/forecast/engine';
import { loadDefaults } from '@/lib/settings';

type FormValues = {
  runName: string;
  dataset: string;
  model: ModelId;
  horizonWeeks: number;
  confidenceLevel: number;
  seasonality: string; // 'auto' | 'none' | '4' | '13' | '52'
  outlierHandling: 'clip' | 'keep';
};

const models: { value: ModelId; label: string; desc: string }[] = [
  { value: 'auto', label: MODEL_LABELS.auto, desc: 'Backtests every model on recent weeks and keeps the most accurate one' },
  { value: 'holt_winters', label: MODEL_LABELS.holt_winters, desc: 'Level + damped trend + seasonality; parameters tuned automatically' },
  { value: 'linear_seasonal', label: MODEL_LABELS.linear_seasonal, desc: 'Straight-line growth plus a repeating seasonal pattern' },
  { value: 'seasonal_naive', label: MODEL_LABELS.seasonal_naive, desc: 'Repeats the same week from the previous cycle — a strong benchmark' },
  { value: 'moving_avg', label: MODEL_LABELS.moving_avg, desc: 'Flat 4-week average — the simple baseline other models must beat' },
];

export default function ForecastConfigForm() {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [allowYearly, setAllowYearly] = useState(true);
  const [lastResult, setLastResult] = useState<{ name: string; result: ForecastResult } | null>(null);
  const { addNotification } = useNotifications();
  const { datasets, isLoadingDatasets, addForecastRun } = useDatasets();

  const readyDatasets = useMemo(() => datasets.filter((d) => d.status === 'ready' && d.seriesData), [datasets]);
  const legacyCount = datasets.length - readyDatasets.length;

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      runName: '',
      dataset: '',
      model: 'auto',
      horizonWeeks: 12,
      confidenceLevel: 80,
      seasonality: 'auto',
      outlierHandling: 'clip',
    },
  });

  // Start from the defaults saved on the Settings page
  useEffect(() => {
    const d = loadDefaults();
    setValue('model', d.model);
    setValue('horizonWeeks', d.horizonWeeks);
    setValue('confidenceLevel', d.confidence);
    setValue('seasonality', d.seasonality);
    setValue('outlierHandling', d.clipOutliers ? 'clip' : 'keep');
  }, [setValue]);

  useEffect(() => {
    if (!getValues('dataset') && readyDatasets[0]) setValue('dataset', readyDatasets[0].id);
  }, [readyDatasets, getValues, setValue]);

  const selectedModel = watch('model');
  const horizonWeeks = watch('horizonWeeks');
  const confidenceLevel = watch('confidenceLevel');
  const selectedDatasetId = watch('dataset') || readyDatasets[0]?.id;
  const selectedDataset = readyDatasets.find((d) => d.id === selectedDatasetId);

  const onSubmit = async (data: FormValues) => {
    const ds = readyDatasets.find((d) => d.id === (data.dataset || readyDatasets[0]?.id));
    if (!ds?.seriesData) {
      toast.error('Pick a dataset that was uploaded with the new importer');
      return;
    }
    setIsRunning(true);
    try {
      await new Promise((r) => setTimeout(r, 50)); // let the spinner paint
      const seasonLength: 'auto' | number = data.seasonality === 'auto' ? 'auto' : data.seasonality === 'none' ? 0 : Number(data.seasonality);
      const { result, row } = buildRunPayload(
        ds.seriesData,
        {
          model: data.model,
          horizon: data.horizonWeeks,
          confidence: data.confidenceLevel,
          seasonLength,
          allowYearly,
          clipOutliers: data.outlierHandling === 'clip',
        },
        ds.rowCount
      );

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to run a forecast');
        setIsRunning(false);
        return;
      }

      const runName = data.runName.trim() || 'Untitled Run';
      const { data: inserted, error } = await supabase
        .from('forecast_runs')
        .insert({ user_id: user.id, dataset_id: ds.id, run_name: runName, ...row })
        .select()
        .single();

      if (error) {
        console.log('Forecast run insert error:', error.message);
        toast.error(/diagnostics/i.test(error.message) ? 'Database is missing the "diagnostics" column — run the latest migration in supabase/migrations/' : 'Forecast finished but could not be saved — please try again');
        setIsRunning(false);
        return;
      }

      addForecastRun({
        id: inserted.id,
        userId: inserted.user_id,
        datasetId: inserted.dataset_id,
        runName: inserted.run_name,
        model: inserted.model,
        horizonWeeks: inserted.horizon_weeks,
        confidenceLevel: inserted.confidence_level,
        status: inserted.status,
        projectedRevenue: inserted.projected_revenue,
        mape: inserted.mape,
        growthRate: inserted.growth_rate,
        avgCiWidth: inserted.avg_ci_width,
        dataCoverage: inserted.data_coverage,
        forecastData: inserted.forecast_data,
        segmentData: inserted.segment_data,
        diagnostics: inserted.diagnostics ?? null,
        createdAt: inserted.created_at,
        completedAt: inserted.completed_at,
      });

      setLastResult({ name: runName, result });
      toast.success(`Forecast "${runName}" complete — ${result.modelLabel}`);
      addNotification({
        type: 'success',
        title: 'Forecast Complete',
        message: `"${runName}" finished using ${result.modelLabel}${
          result.metrics.mape !== null ? ` (hold-out MAPE ${result.metrics.mape.toFixed(1)}%)` : ''
        }. View it on the dashboard.`,
        href: '/',
      });
    } catch (err: any) {
      console.log('Forecast error:', err?.message);
      toast.error(err?.message ?? 'Forecast failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="card-elevated overflow-hidden">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-base font-semibold text-foreground">New Forecast Run</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Choose a dataset and model. The forecast is computed from your uploaded data.
          </p>
        </div>

        <div className="p-6 space-y-7">
          {/* Basic setup */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted-foreground)' }}>
              Basic Setup
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Run Name</label>
                <p className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>
                  A descriptive name to identify this run in history
                </p>
                <input
                  {...register('runName', { required: 'Run name is required' })}
                  placeholder="e.g. Next quarter — all categories"
                  className={`input-field ${errors.runName ? 'error' : ''}`}
                />
                {errors.runName && (
                  <p className="text-xs mt-1" style={{ color: 'var(--negative)' }}>
                    {errors.runName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Source Dataset</label>
                <p className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>
                  {selectedDataset?.seriesData
                    ? `${selectedDataset.seriesData.weeks.length} weeks · ${selectedDataset.seriesData.weeks[0]} → ${
                        selectedDataset.seriesData.weeks[selectedDataset.seriesData.weeks.length - 1]
                      }`
                    : 'Historical sales data to train the model on'}
                </p>
                {readyDatasets.length > 0 ? (
                  <select {...register('dataset')} className="input-field">
                    {readyDatasets.map((d) => (
                      <option key={`ds-opt-${d.id}`} value={d.id}>
                        {d.name} ({d.rowCount.toLocaleString()} rows)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    className="flex items-center gap-3 rounded-lg p-3"
                    style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                  >
                    <UploadCloud size={18} style={{ color: 'var(--muted-foreground)' }} />
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {isLoadingDatasets ? 'Loading datasets…' : 'No usable dataset yet.'}{' '}
                      {!isLoadingDatasets && (
                        <Link href="/data-upload" className="font-semibold" style={{ color: 'var(--primary)' }}>
                          Upload one
                        </Link>
                      )}
                    </p>
                  </div>
                )}
                {legacyCount > 0 && readyDatasets.length > 0 && (
                  <p className="text-xs mt-1.5" style={{ color: 'var(--muted-foreground)' }}>
                    {legacyCount} older dataset(s) are hidden because they were uploaded before real parsing — re-upload them to use them.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Model */}
          <section style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted-foreground)' }}>
              Forecasting Model
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {models.map((m) => {
                const isSelected = selectedModel === m.value;
                return (
                  <label
                    key={`model-card-${m.value}`}
                    className="flex gap-3 p-4 rounded-xl cursor-pointer transition-all duration-150"
                    style={{
                      background: isSelected ? 'var(--info-bg)' : 'var(--secondary)',
                      border: `1px solid ${isSelected ? 'rgba(59,111,212,0.4)' : 'var(--border)'}`,
                    }}
                  >
                    <input type="radio" value={m.value} {...register('model')} className="mt-0.5 accent-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{m.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                        {m.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Horizon & confidence */}
          <section style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted-foreground)' }}>
              Forecast Horizon & Confidence
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Forecast Horizon</label>
                <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
                  How many weeks ahead to predict
                </p>
                <input
                  type="range"
                  min={4}
                  max={52}
                  step={4}
                  {...register('horizonWeeks', { valueAsNumber: true })}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs font-mono mt-1.5" style={{ color: 'var(--muted-foreground)' }}>
                  <span>4 wks</span>
                  <span className="font-semibold text-foreground">
                    {horizonWeeks} weeks ({Math.round(horizonWeeks / 4.33)} months)
                  </span>
                  <span>52 wks</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Confidence Interval Level</label>
                <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
                  Width of the shaded band around the forecast
                </p>
                <input
                  type="range"
                  min={50}
                  max={99}
                  step={5}
                  {...register('confidenceLevel', { valueAsNumber: true })}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs font-mono mt-1.5" style={{ color: 'var(--muted-foreground)' }}>
                  <span>50%</span>
                  <span className="font-semibold text-foreground">{confidenceLevel}% CI</span>
                  <span>99%</span>
                </div>
              </div>
            </div>
          </section>

          {/* Seasonality */}
          <section style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted-foreground)' }}>
              Seasonality
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Seasonal Cycle</label>
                <p className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>
                  Auto picks the strongest repeating cycle using autocorrelation
                </p>
                <select {...register('seasonality')} className="input-field">
                  <option value="auto">Auto-detect</option>
                  <option value="none">None (trend only)</option>
                  <option value="4">4 weeks (monthly rhythm)</option>
                  <option value="13">13 weeks (quarterly)</option>
                  <option value="52">52 weeks (yearly)</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <Toggle checked={allowYearly} onChange={setAllowYearly} label="Allow yearly cycle in auto-detect (needs 2+ years)" />
              </div>
            </div>
          </section>

          {/* Advanced */}
          <section style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-foreground w-full text-left"
            >
              {advancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Advanced
              <span className="text-xs font-normal ml-1" style={{ color: 'var(--muted-foreground)' }}>
                (outlier handling)
              </span>
            </button>

            {advancedOpen && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Outlier Handling</label>
                  <p className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>
                    Clipping limits weeks that sit more than 4 robust standard deviations from the median before training
                  </p>
                  <select {...register('outlierHandling')} className="input-field">
                    <option value="clip">Clip extreme weeks</option>
                    <option value="keep">Keep as-is</option>
                  </select>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Sticky submit bar */}
        <div
          className="sticky bottom-0 px-6 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}
        >
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <span className="text-foreground font-semibold">{horizonWeeks}-week horizon</span> ·{' '}
            <span className="text-foreground font-semibold">{confidenceLevel}% interval</span> ·{' '}
            <span className="text-foreground font-semibold">{models.find((m) => m.value === selectedModel)?.label}</span>
          </div>
          <button type="submit" disabled={isRunning || readyDatasets.length === 0} className="btn-primary">
            {isRunning ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Running models…
              </>
            ) : (
              <>
                <Play size={14} />
                Run Forecast
              </>
            )}
          </button>
        </div>
      </form>

      {lastResult && (
        <div className="card-elevated p-6 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-semibold text-foreground">Result — {lastResult.name}</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                Model used: <span className="font-semibold text-foreground">{lastResult.result.modelLabel}</span>
                {lastResult.result.seasonLength > 0 ? ` · ${lastResult.result.seasonLength}-week seasonal cycle` : ' · trend only'}
              </p>
            </div>
            <Link href="/" className="btn-secondary">
              View on dashboard
            </Link>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>
              Model leaderboard — accuracy on the last {lastResult.result.metrics.backtestWeeks || '—'} weeks held out
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--muted)' }}>
                    {['Model', 'MAPE', 'RMSE', ''].map((h, i) => (
                      <th
                        key={`lb-h-${i}`}
                        className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...lastResult.result.leaderboard]
                    .sort((a, b) => (a.mape ?? Infinity) - (b.mape ?? Infinity))
                    .map((r, i) => (
                      <tr key={`lb-${r.model}`} style={{ borderTop: '1px solid var(--border)', background: i % 2 ? 'var(--secondary)' : 'var(--card)' }}>
                        <td className="px-4 py-2 text-foreground">{r.label}</td>
                        <td className="px-4 py-2 font-mono tabular-nums">{r.mape !== null ? `${r.mape.toFixed(1)}%` : '—'}</td>
                        <td className="px-4 py-2 font-mono tabular-nums">{r.rmse !== null ? Math.round(r.rmse).toLocaleString() : '—'}</td>
                        <td className="px-4 py-2">
                          {r.model === lastResult.result.modelUsed && (
                            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--positive)' }}>
                              <Trophy size={12} /> Used
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
              MAPE = average percentage error (lower is better). Confidence bands are estimated from the hold-out error and
              widen with the forecast horizon.
            </p>
          </div>

          {lastResult.result.notes.length > 0 && (
            <ul className="space-y-1">
              {lastResult.result.notes.map((n, i) => (
                <li key={`note-${i}`} className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  • {n}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
