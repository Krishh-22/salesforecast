'use client';

import React from 'react';
import { UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { money } from '@/lib/forecast/report';

interface ForecastPoint {
  week: string;
  actual: number | null;
  predicted: number;
  lower: number | null;
  upper: number | null;
}

interface Props {
  data: ForecastPoint[];
  showCI: boolean;
  showActual: boolean;
  zoomed: boolean;
}

const formatK = money;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as (ForecastPoint & { band?: [number, number] | null }) | undefined;
  return (
    <div className="card-elevated p-3 text-xs space-y-1 min-w-[170px]">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {row?.actual != null && (
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--muted-foreground)' }}>Actual</span>
          <span className="font-mono font-semibold text-foreground">{formatK(row.actual)}</span>
        </div>
      )}
      {row && (
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--primary)' }}>{row.actual == null ? 'Forecast' : 'Fitted'}</span>
          <span className="font-mono font-semibold text-foreground">{formatK(row.predicted)}</span>
        </div>
      )}
      {row?.lower != null && row?.upper != null && row.actual == null && (
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--muted-foreground)' }}>Range</span>
          <span className="font-mono text-foreground">
            {formatK(row.lower)} – {formatK(row.upper)}
          </span>
        </div>
      )}
    </div>
  );
};

export default function AnalysisChartInner({ data, showCI, showActual, zoomed }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[360px] text-center">
        <UploadCloud size={36} style={{ color: 'var(--muted-foreground)' }} className="mb-3 opacity-40" />
        <p className="text-sm font-medium text-foreground mb-1">No forecast data yet</p>
        <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
          No data yet — upload a file to get started
        </p>
        <Link href="/data-upload" className="btn-primary text-xs px-3 py-1.5 h-auto">
          Upload Data
        </Link>
      </div>
    );
  }

  const futureCount = data.filter((d) => d.actual == null).length;
  const historyCount = data.length - futureCount;
  // Zoom keeps the forecast and only the most recent history around it
  const visible = zoomed ? data.slice(Math.max(0, historyCount - Math.max(12, futureCount * 2))) : data;
  const lastActual = [...visible].reverse().find((d) => d.actual != null);
  const chartData = visible.map((d) => ({
    ...d,
    band: showCI && d.lower != null && d.upper != null ? [d.lower, d.upper] : null,
  }));

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={32}
          />
          <YAxis tickFormatter={formatK} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={64} />
          <Tooltip content={<CustomTooltip />} />
          {showCI && <Area dataKey="band" stroke="none" fill="url(#ciGrad)" name="Confidence range" isAnimationActive={false} legendType="none" />}
          <Line type="monotone" dataKey="predicted" stroke="var(--primary)" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Predicted" />
          {showActual && <Line type="monotone" dataKey="actual" stroke="var(--foreground)" strokeWidth={2.5} dot={false} name="Actual" />}
          {lastActual && (
            <ReferenceLine
              x={lastActual.week}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 2"
              label={{ value: 'Forecast →', position: 'insideTopRight', fontSize: 10, fill: 'var(--muted-foreground)' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
