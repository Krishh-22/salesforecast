'use client';

import React from 'react';
import { UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { useDatasets } from '@/contexts/DatasetContext';
import { money, moneyFull } from '@/lib/forecast/report';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function SegmentChartInner({ segment }: { segment: string }) {
  const { latestForecast, isLoadingForecasts } = useDatasets();

  if (isLoadingForecasts) {
    return (
      <div className="flex flex-col items-center justify-center h-[220px] text-center">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mb-3"
          style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Loading segment data…</p>
      </div>
    );
  }

  if (!latestForecast?.segmentData) {
    return (
      <div className="flex flex-col items-center justify-center h-[220px] text-center">
        <UploadCloud size={32} style={{ color: 'var(--muted-foreground)' }} className="mb-3 opacity-40" />
        <p className="text-sm font-medium text-foreground mb-1">No segment data yet</p>
        <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
          No data yet — upload a file to get started
        </p>
        <Link href="/data-upload" className="btn-primary text-xs px-3 py-1.5 h-auto">
          Upload Data
        </Link>
      </div>
    );
  }

  const chartData = latestForecast.segmentData.map((d: any) => ({
    name: d.segment.length > 12 ? d.segment.slice(0, 12) + '…' : d.segment,
    Actual: Math.round(d.actual),
    Predicted: Math.round(d.predicted),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          tickFormatter={(v) => money(Number(v))} width={64} />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          formatter={(value: any, name: string) => [moneyFull(Number(value)), name]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Actual" fill="var(--positive)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Predicted" fill="var(--primary)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}