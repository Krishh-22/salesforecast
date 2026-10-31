'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FileText, BarChart2, Table2, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useDatasets } from '@/contexts/DatasetContext';
import { buildForecastCsv, buildReportHtml, buildSegmentCsv, type ReportRun } from '@/lib/forecast/report';
import { downloadText, openHtmlInNewTab, safeFileName } from '@/lib/download';

export type ExportEntry = {
  id: string;
  name: string;
  kind: string;
  runName: string;
  createdAt: string;
  bytes: number;
};

type Props = { onExported: (entry: ExportEntry) => void };

export default function ReportTemplates({ onExported }: Props) {
  const { forecastRuns, isLoadingForecasts } = useDatasets();
  const runs = forecastRuns.filter((r) => r.status === 'completed' && r.forecastData);
  const [runId, setRunId] = useState('');
  const run = runs.find((r) => r.id === runId) ?? runs[0];

  const record = (name: string, kind: string, bytes: number) => {
    onExported({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, kind, runName: run?.runName ?? '', createdAt: new Date().toISOString(), bytes });
  };

  const asReportRun = (): ReportRun | null => (run ? (run as unknown as ReportRun) : null);

  const downloadReport = () => {
    const r = asReportRun();
    if (!r || !run) return;
    const name = `${safeFileName(run.runName)}_report.html`;
    const bytes = downloadText(name, 'text/html', buildReportHtml(r));
    record(name, 'Report (HTML)', bytes);
    toast.success('Report downloaded — open it and use "Print / Save as PDF"');
  };

  const previewReport = () => {
    const r = asReportRun();
    if (!r) return;
    if (!openHtmlInNewTab(buildReportHtml(r))) toast.error('Your browser blocked the new tab — use Download instead');
  };

  const downloadForecastCsv = () => {
    const r = asReportRun();
    if (!r || !run) return;
    const name = `${safeFileName(run.runName)}_forecast.csv`;
    record(name, 'Forecast data (CSV)', downloadText(name, 'text/csv', buildForecastCsv(r)));
    toast.success('Forecast data downloaded');
  };

  const downloadSegmentCsv = () => {
    const r = asReportRun();
    if (!r || !run) return;
    if (!run.segmentData?.length) {
      toast.error('This run has no category column, so there are no segments to export');
      return;
    }
    const name = `${safeFileName(run.runName)}_segments.csv`;
    record(name, 'Segment outlook (CSV)', downloadText(name, 'text/csv', buildSegmentCsv(r)));
    toast.success('Segment outlook downloaded');
  };

  const cards = [
    {
      id: 'summary',
      icon: BarChart2,
      name: 'Forecast Report',
      desc: 'One-page summary: key numbers, actual-vs-predicted chart, takeaways, model comparison and segment outlook. Open it and print to PDF.',
      tag: 'HTML → PDF',
      color: 'var(--primary)',
      bg: 'var(--info-bg)',
      action: downloadReport,
      label: 'Download report',
      extra: { label: 'Preview', onClick: previewReport },
    },
    {
      id: 'data',
      icon: Table2,
      name: 'Forecast Data',
      desc: 'Every week as a row: actual, predicted and the lower/upper range. Opens in Excel or Google Sheets.',
      tag: 'CSV',
      color: 'var(--positive)',
      bg: 'var(--positive-bg)',
      action: downloadForecastCsv,
      label: 'Download CSV',
    },
    {
      id: 'segments',
      icon: FileText,
      name: 'Segment Outlook',
      desc: 'Last period versus forecast for each category, with the percentage change. Needs a category column in your upload.',
      tag: 'CSV',
      color: 'var(--warning)',
      bg: 'var(--warning-bg)',
      action: downloadSegmentCsv,
      label: 'Download CSV',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-base font-semibold text-foreground">Reports</h2>
        {runs.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="report-run" className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              Forecast run
            </label>
            <select id="report-run" value={run?.id ?? ''} onChange={(e) => setRunId(e.target.value)} className="input-field text-xs py-1" style={{ minWidth: 220 }}>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.runName} · {new Date(r.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {runs.length === 0 ? (
        <div className="card-elevated p-8 text-center">
          <FileText size={32} style={{ color: 'var(--muted-foreground)' }} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground mb-1">{isLoadingForecasts ? 'Loading runs…' : 'No forecast to report on yet'}</p>
          {!isLoadingForecasts && (
            <>
              <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
                Upload a dataset and run a forecast, then come back to download reports.
              </p>
              <Link href="/data-upload" className="btn-primary text-xs px-3 py-1.5 h-auto">
                Upload Data
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.id} className="card-elevated-hover p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
                    <Icon size={20} style={{ color: c.color }} />
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                    {c.tag}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                    {c.desc}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={c.action} className="btn-primary flex-1 justify-center">
                    <Download size={14} />
                    {c.label}
                  </button>
                  {c.extra && (
                    <button onClick={c.extra.onClick} className="btn-secondary justify-center" title="Open in a new tab">
                      <ExternalLink size={14} />
                      {c.extra.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
