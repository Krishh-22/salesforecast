'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Upload, CheckCircle2, ChevronRight, FileText, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/contexts/NotificationContext';
import { useDatasets } from '@/contexts/DatasetContext';
import { createClient } from '@/lib/supabase/client';
import {
  parseCsv,
  detectColumns,
  buildSeries,
  generateSampleCsv,
  type ParsedTable,
  type ColumnMapping,
  type DateOrder,
  type SeriesData,
} from '@/lib/forecast/data';
import { buildRunPayload, MODEL_LABELS, type ModelId } from '@/lib/forecast/engine';
import DataPreviewTable from './DataPreviewTable';
import ColumnMapper from './ColumnMapper';
import ValidationErrors from './ValidationErrors';

type Step = 'select' | 'validate' | 'confirm';

const steps: { id: Step; label: string; num: number }[] = [
  { id: 'select', label: 'Select File', num: 1 },
  { id: 'validate', label: 'Validate & Map', num: 2 },
  { id: 'confirm', label: 'Confirm Import', num: 3 },
];

const MAX_BYTES = 50 * 1024 * 1024;

type Loaded = { fileName: string; sizeLabel: string; table: ParsedTable };

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function DataUploadWizard() {
  const [step, setStep] = useState<Step>('select');
  const [isDragging, setIsDragging] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({ date: null, value: null, category: null });
  const [dateOrder, setDateOrder] = useState<DateOrder>('dmy');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [savedDatasetId, setSavedDatasetId] = useState<string | null>(null);
  const [savedSeries, setSavedSeries] = useState<SeriesData | null>(null);
  const [isRunningForecast, setIsRunningForecast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useNotifications();
  const { addDataset, addForecastRun } = useDatasets();
  const router = useRouter();

  const build = useMemo(
    () => (loaded ? buildSeries(loaded.table, mapping, dateOrder) : null),
    [loaded, mapping, dateOrder]
  );

  const acceptText = useCallback(
    (fileName: string, sizeBytes: number, text: string) => {
      const table = parseCsv(text);
      if (table.headers.length < 2 || table.rows.length === 0) {
        toast.error('That file looks empty or is not a valid CSV');
        setIsProcessing(false);
        return;
      }
      const det = detectColumns(table);
      setLoaded({ fileName, sizeLabel: formatSize(sizeBytes), table });
      setMapping({ date: det.date, value: det.value, category: det.category });
      setDateOrder(det.dateOrder);
      setIsProcessing(false);
      setStep('validate');
      addNotification({
        type: 'info',
        title: 'File Parsed',
        message: `"${fileName}" read — ${table.rows.length.toLocaleString()} rows, ${table.headers.length} columns. Review the column mapping before importing.`,
        href: '/data-upload',
      });
    },
    [addNotification]
  );

  const processFile = useCallback(
    async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        toast.error('Excel files are not supported yet — in Excel use File → Save As → CSV, then upload the CSV');
        return;
      }
      if (ext !== 'csv') {
        toast.error('Unsupported format — please upload a .csv file');
        addNotification({
          type: 'error',
          title: 'Upload Failed',
          message: `"${file.name}" is not a CSV file.`,
          href: '/data-upload',
        });
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error('File is larger than 50 MB');
        return;
      }
      setIsProcessing(true);
      try {
        const text = await file.text();
        acceptText(file.name, file.size, text);
      } catch (err: any) {
        console.log('File read error:', err?.message);
        toast.error('Could not read that file');
        setIsProcessing(false);
      }
    },
    [acceptText, addNotification]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) processFile(dropped);
    },
    [processFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
    e.target.value = '';
  };

  const loadSample = () => {
    setIsProcessing(true);
    // let the spinner paint before the (fast) synchronous work
    setTimeout(() => {
      const text = generateSampleCsv();
      acceptText('sample_retail_sales.csv', text.length, text);
    }, 30);
  };

  const handleConfirmImport = async () => {
    if (!loaded || !build?.ok || !build.series) return;
    setIsProcessing(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to import data');
        setIsProcessing(false);
        return;
      }

      const datasetName = loaded.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

      const { data: inserted, error } = await supabase
        .from('datasets')
        .insert({
          user_id: user.id,
          name: datasetName,
          file_name: loaded.fileName,
          row_count: build.stats.totalRows,
          col_count: loaded.table.headers.length,
          file_size: loaded.sizeLabel,
          status: 'ready',
          series_data: build.series,
        })
        .select()
        .single();

      if (error) {
        console.log('Dataset insert error:', error.message);
        if (/series_data/i.test(error.message)) {
          toast.error('Database is missing the "series_data" column — run supabase/migrations/20261030000000_dataset_series.sql');
        } else {
          toast.error('Failed to save dataset — please try again');
        }
        setIsProcessing(false);
        return;
      }

      addDataset({
        id: inserted.id,
        userId: inserted.user_id,
        name: inserted.name,
        fileName: inserted.file_name,
        rowCount: inserted.row_count,
        colCount: inserted.col_count,
        fileSize: inserted.file_size,
        status: inserted.status,
        uploadedAt: inserted.uploaded_at,
        seriesData: inserted.series_data ?? build.series,
      });
      setSavedDatasetId(inserted.id);
      setSavedSeries(build.series);

      setIsProcessing(false);
      setImportSuccess(true);
      toast.success('Dataset imported successfully — ready for forecasting');
      addNotification({
        type: 'success',
        title: 'Data Upload Complete',
        message: `"${loaded.fileName}" imported — ${build.stats.usedRows.toLocaleString()} rows (${build.stats.weeks} weeks) are ready for forecasting.`,
        href: '/data-management',
      });
    } catch (err: any) {
      console.log('Import error:', err?.message);
      toast.error('Import failed — please try again');
      setIsProcessing(false);
    }
  };

  const handleRunForecast = async () => {
    if (!savedDatasetId || !savedSeries || !loaded || !build) return;
    setIsRunningForecast(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to run a forecast');
        setIsRunningForecast(false);
        return;
      }

      // let the spinner paint, then run the real models
      await new Promise((r) => setTimeout(r, 50));
      const { result, row } = buildRunPayload(
        savedSeries,
        { model: 'auto', horizon: 12, confidence: 80, clipOutliers: true },
        build.stats.usedRows
      );

      const runName = `Auto Forecast — ${loaded.fileName.replace(/\.[^/.]+$/, '')}`;

      const { data: inserted, error } = await supabase
        .from('forecast_runs')
        .insert({
          user_id: user.id,
          dataset_id: savedDatasetId,
          run_name: runName,
          ...row,
        })
        .select()
        .single();

      if (error) {
        console.log('Forecast run insert error:', error.message);
        toast.error('Failed to save forecast — please try again');
        setIsRunningForecast(false);
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
        createdAt: inserted.created_at,
        completedAt: inserted.completed_at,
      });

      addNotification({
        type: 'success',
        title: 'Forecast Complete',
        message: `"${runName}" finished using ${MODEL_LABELS[result.modelUsed as ModelId]}${
          result.metrics.mape !== null ? ` (hold-out MAPE ${result.metrics.mape.toFixed(1)}%)` : ''
        }.`,
        href: '/',
      });
      toast.success('Forecast complete — results are on the dashboard');
      router.push('/');
    } catch (err: any) {
      console.log('Run forecast error:', err?.message);
      toast.error(err?.message ? `Forecast failed: ${err.message}` : 'Forecast failed — please try again');
      setIsRunningForecast(false);
    }
  };

  const resetWizard = () => {
    setStep('select');
    setLoaded(null);
    setMapping({ date: null, value: null, category: null });
    setImportSuccess(false);
    setIsProcessing(false);
    setSavedDatasetId(null);
    setSavedSeries(null);
    setIsRunningForecast(false);
  };

  if (importSuccess && loaded && build) {
    return (
      <div className="card-elevated p-8 flex flex-col items-center text-center gap-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'var(--positive-bg)' }}>
          <CheckCircle2 size={40} style={{ color: 'var(--positive)' }} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Import Complete</h2>
          <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>
            <span className="font-semibold font-mono text-foreground">{build.stats.usedRows.toLocaleString()} rows</span> ingested from{' '}
            <span className="font-semibold text-foreground">{loaded.fileName}</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Dataset ID: <span className="font-mono">{savedDatasetId?.slice(0, 13)}</span> · {build.stats.weeks} weeks · Status: Ready
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={resetWizard} className="btn-secondary">
            Upload Another
          </button>
          <button onClick={handleRunForecast} disabled={isRunningForecast} className="btn-primary">
            {isRunningForecast ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Running models…
              </>
            ) : (
              'Run Forecast on This Dataset'
            )}
          </button>
        </div>
      </div>
    );
  }

  const stats = build?.stats;
  const series = build?.series;

  return (
    <div className="card-elevated overflow-hidden">
      {/* Step Progress */}
      <div className="flex items-center px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        {steps.map((s, i) => {
          const isActive = s.id === step;
          const isDone = steps.findIndex((x) => x.id === step) > i;
          return (
            <React.Fragment key={`step-${s.id}`}>
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200"
                  style={{
                    background: isDone ? 'var(--positive)' : isActive ? 'var(--primary)' : 'var(--muted)',
                    color: isDone || isActive ? 'white' : 'var(--muted-foreground)',
                  }}
                >
                  {isDone ? <CheckCircle2 size={14} /> : s.num}
                </div>
                <span
                  className="text-sm font-medium hidden sm:block"
                  style={{ color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 mx-3 h-px" style={{ background: isDone ? 'var(--positive)' : 'var(--border)' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="p-6">
        {/* Step 1: Select File */}
        {step === 'select' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Upload Sales Data</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                CSV files up to 50 MB · At least 8 weeks of history (26+ recommended, 2+ years unlocks yearly seasonality)
              </p>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 transition-all duration-200 cursor-pointer ${isDragging ? 'drag-over' : ''}`}
              style={{
                borderColor: isDragging ? 'var(--primary)' : 'var(--border)',
                background: isDragging ? 'var(--info-bg)' : 'var(--secondary)',
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload sales data file"
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".csv" className="sr-only" onChange={handleFileSelect} />
              {isProcessing ? (
                <RefreshCw size={40} className="animate-spin" style={{ color: 'var(--primary)' }} />
              ) : (
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--info-bg)' }}>
                  <Upload size={28} style={{ color: 'var(--primary)' }} />
                </div>
              )}
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">
                  {isProcessing ? 'Reading file…' : 'Drop your CSV here, or click to browse'}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  CSV up to 50 MB
                </p>
              </div>
            </div>

            <div className="rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ background: 'var(--muted)' }}>
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">What your file needs</p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  A <span className="font-mono">date</span> column and a numeric sales/revenue column. An optional category column
                  (region, product, channel…) powers the segment chart. Everything else is ignored. Daily, weekly or
                  transaction-level rows all work.
                </p>
              </div>
              <button type="button" onClick={loadSample} disabled={isProcessing} className="btn-secondary shrink-0">
                <Sparkles size={14} />
                Try sample data
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Validate & Map */}
        {step === 'validate' && loaded && build && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-base font-semibold text-foreground">Validate & Map Columns</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  We detected the columns below — change anything that looks wrong
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--muted)' }}>
                <FileText size={14} style={{ color: 'var(--primary)' }} />
                <div>
                  <p className="text-xs font-semibold text-foreground">{loaded.fileName}</p>
                  <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                    {loaded.table.rows.length.toLocaleString()} rows · {loaded.table.headers.length} cols · {loaded.sizeLabel}
                  </p>
                </div>
              </div>
            </div>

            <ColumnMapper
              headers={loaded.table.headers}
              sampleRow={loaded.table.rows[0] ?? []}
              mapping={mapping}
              onMappingChange={setMapping}
              dateOrder={dateOrder}
              onDateOrderChange={setDateOrder}
            />
            <ValidationErrors issues={build.issues} passed={build.passed} />
            <DataPreviewTable
              headers={loaded.table.headers}
              rows={loaded.table.rows.slice(0, 8)}
              totalRows={loaded.table.rows.length}
            />

            <div className="flex justify-between pt-2">
              <button onClick={resetWizard} className="btn-ghost">
                ← Back
              </button>
              <button onClick={() => setStep('confirm')} disabled={!build.ok} className="btn-primary">
                Continue to Confirm
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm Import */}
        {step === 'confirm' && loaded && build?.ok && stats && series && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Confirm Import</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                Review the import summary before finalizing
              </p>
            </div>

            <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold text-foreground">Import Summary</h3>
              {[
                { label: 'File', value: loaded.fileName },
                { label: 'Rows in file', value: stats.totalRows.toLocaleString() },
                { label: 'Rows used', value: stats.usedRows.toLocaleString() },
                { label: 'Rows skipped', value: stats.skippedRows.toLocaleString() },
                { label: 'Date column', value: series.dateColumn },
                { label: 'Forecasting column', value: series.valueColumn },
                { label: 'Date range', value: `${stats.dateMin} → ${stats.dateMax}` },
                { label: 'Weekly data points', value: `${stats.weeks} weeks` },
                { label: 'Weeks filled by interpolation', value: String(stats.imputedWeeks) },
                {
                  label: 'Categories detected',
                  value: series.categoryColumn ? `${stats.categoryCount} in "${series.categoryColumn}"` : 'None',
                },
                { label: 'Warnings', value: String(build.issues.filter((i) => i.level === 'warning').length) },
              ].map((item) => (
                <div key={`summary-${item.label}`} className="flex justify-between gap-4 text-sm">
                  <span style={{ color: 'var(--muted-foreground)' }}>{item.label}</span>
                  <span className="font-medium text-foreground font-mono text-right">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep('validate')} className="btn-ghost">
                ← Back
              </button>
              <button onClick={handleConfirmImport} disabled={isProcessing} className="btn-primary">
                {isProcessing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Confirm Import
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
