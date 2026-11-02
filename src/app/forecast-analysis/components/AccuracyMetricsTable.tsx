'use client';

import React from 'react';
import { Trophy, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import type { RunDiagnostics } from '@/lib/forecast/engine';
import { money } from '@/lib/forecast/report';

interface SegmentRow {
  segment: string;
  actual: number;
  predicted: number;
  growth: number;
}

interface Props {
  diagnostics: RunDiagnostics | null;
  segmentData: SegmentRow[];
  modelUsedLabel?: string;
  horizonWeeks?: number;
}

const formatMoney = money;

export default function AccuracyMetricsTable({ diagnostics, segmentData, modelUsedLabel, horizonWeeks }: Props) {
  const board = [...(diagnostics?.leaderboard ?? [])].sort((a, b) => (a.mape ?? Infinity) - (b.mape ?? Infinity));
  const segments = [...(segmentData ?? [])].sort((a, b) => b.predicted - a.predicted);
  const hasAnything = board.length > 0 || segments.length > 0;

  if (!hasAnything) {
    return (
      <div className="card-elevated overflow-hidden">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <UploadCloud size={32} style={{ color: 'var(--muted-foreground)' }} className="mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground mb-1">No accuracy data yet</p>
          <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
            Run a forecast to see how each model performed
          </p>
          <Link href="/forecast-configuration" className="btn-primary text-xs px-3 py-1.5 h-auto">
            Run a Forecast
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {board.length > 0 && (
        <div className="card-elevated overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-base font-semibold text-foreground">Model Accuracy (Backtest)</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {diagnostics?.backtestWeeks
                ? `Each model was trained without the last ${diagnostics.backtestWeeks} weeks, then asked to predict them. Lower error is better.`
                : 'History was too short to measure accuracy on a hold-out window.'}
            </p>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--muted)' }}>
                  {['Model', 'MAPE', 'RMSE', ''].map((h, i) => (
                    <th
                      key={`lb-h-${i}`}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {board.map((r) => {
                  const used = r.label === (modelUsedLabel ?? diagnostics?.modelLabel);
                  return (
                    <tr key={`lb-${r.model}`} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-3 text-xs font-semibold text-foreground">{r.label}</td>
                      <td className="px-4 py-3 text-xs font-mono">{r.mape !== null ? `${r.mape.toFixed(1)}%` : '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono">{r.rmse !== null ? formatMoney(r.rmse) : '—'}</td>
                      <td className="px-4 py-3">
                        {used && (
                          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--positive)' }}>
                            <Trophy size={12} /> Used for this forecast
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-xs" style={{ color: 'var(--muted-foreground)', borderTop: '1px solid var(--border)' }}>
            MAPE = average percentage error · RMSE = typical size of the error in sales units.
          </p>
        </div>
      )}

      {segments.length > 0 && (
        <div className="card-elevated overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-base font-semibold text-foreground">Segment Outlook</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Total over the last {horizonWeeks ?? 12} weeks versus the forecast for the next {horizonWeeks ?? 12} weeks
            </p>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--muted)' }}>
                  {['Segment', 'Last period', 'Forecast', 'Change'].map((h) => (
                    <th
                      key={`seg-h-${h}`}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segments.map((s) => (
                  <tr key={`seg-${s.segment}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 text-xs font-semibold text-foreground">{s.segment}</td>
                    <td className="px-4 py-3 text-xs font-mono">{formatMoney(s.actual)}</td>
                    <td className="px-4 py-3 text-xs font-mono">{formatMoney(s.predicted)}</td>
                    <td
                      className="px-4 py-3 text-xs font-mono font-semibold"
                      style={{ color: s.growth >= 0 ? 'var(--positive)' : 'var(--negative)' }}
                    >
                      {s.growth >= 0 ? '↑ +' : '↓ '}
                      {s.growth.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
