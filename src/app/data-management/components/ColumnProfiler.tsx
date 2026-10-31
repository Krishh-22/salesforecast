'use client';

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { profileSeries, type SeriesProfile } from '@/lib/forecast/profile';
import type { Dataset } from '@/contexts/DatasetContext';

function money(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${v < 0 ? '-' : ''}$${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${v < 0 ? '-' : ''}$${(a / 1_000).toFixed(1)}K`;
  return `${v < 0 ? '-' : ''}$${Math.round(a)}`;
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const W = 520;
  const H = 70;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => H - 4 - ((v - min) / (max - min || 1)) * (H - 8);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label="Weekly sales over time">
      <path d={`${d} L${W},${H} L0,${H} Z`} fill="var(--primary)" opacity="0.12" />
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}>
      <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </p>
      <p className="text-base font-semibold font-mono text-foreground mt-0.5">{value}</p>
      {sub && (
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export default function ColumnProfiler({ dataset, onClose }: { dataset: Dataset; onClose: () => void }) {
  const series = dataset.seriesData;
  const profile: SeriesProfile | null = useMemo(() => (series ? profileSeries(series) : null), [series]);

  return (
    <div className="card-elevated p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{dataset.name}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {series ? `Forecasting “${series.valueColumn}” by “${series.dateColumn}”` : dataset.fileName}
          </p>
        </div>
        <button onClick={onClose} className="btn-ghost h-8 w-8 p-0 justify-center" aria-label="Close profile">
          <X size={14} />
        </button>
      </div>

      {!profile ? (
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          This dataset was uploaded before real parsing was added, so there is no data to profile. Re-upload the file to see its statistics.
        </p>
      ) : (
        <>
          <Sparkline values={profile.spark} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="History" value={`${profile.weeks} wks`} sub={`${profile.first} → ${profile.last}`} />
            <Stat label="Avg per week" value={money(profile.mean)} sub={`median ${money(profile.median)}`} />
            <Stat label="Best week" value={money(profile.max.value)} sub={profile.max.week} />
            <Stat label="Weakest week" value={money(profile.min.value)} sub={profile.min.week} />
            <Stat label="Total" value={money(profile.total)} />
            <Stat
              label="Trend"
              value={profile.trendPerYearPct == null ? 'n/a' : `${profile.trendPerYearPct >= 0 ? '+' : ''}${profile.trendPerYearPct.toFixed(1)}%/yr`}
              sub={profile.trendPerYearPct == null ? 'needs 26+ weeks' : 'straight-line fit'}
            />
            <Stat label="Zero-sales weeks" value={String(profile.zeroWeeks)} />
            <Stat label="Unusual weeks" value={String(profile.outlierWeeks.length)} sub="far from the median" />
          </div>

          {profile.outlierWeeks.length > 0 && (
            <div className="rounded-lg p-3" style={{ background: 'var(--warning-bg)' }}>
              <p className="text-xs font-semibold text-foreground mb-1">Unusual weeks (may be promotions, errors or one-offs)</p>
              <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                {profile.outlierWeeks.map((o) => `${o.week}: ${money(o.value)}`).join('  ·  ')}
              </p>
            </div>
          )}

          {profile.categories.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>
                Share of sales by {series?.categoryColumn}
              </p>
              <div className="space-y-2">
                {profile.categories.map((c) => (
                  <div key={`cat-${c.name}`}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground font-medium">{c.name}</span>
                      <span className="font-mono" style={{ color: 'var(--muted-foreground)' }}>
                        {money(c.total)} · {c.sharePct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--muted)' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, c.sharePct)}%`, background: 'var(--primary)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
