'use client';

import React from 'react';
import { UploadCloud } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { money } from '@/lib/forecast/report';

interface ForecastPoint {
  week: string;
  actual: number | null;
  predicted: number;
}

interface Props {
  data: ForecastPoint[];
}

const formatK = money;

export default function ResidualsChart({ data }: Props) {
  const residuals = (data ?? [])
    .filter((d) => d.actual != null)
    .map((d) => ({
      week: d.week,
      residual: Math.round((d.actual as number) - d.predicted),
    }));

  if (residuals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[180px] text-center">
        <UploadCloud size={28} style={{ color: 'var(--muted-foreground)' }} className="mb-2 opacity-40" />
        <p className="text-xs font-medium text-foreground mb-1">No residuals data</p>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          No data yet — upload a file to get started
        </p>
      </div>
    );
  }

  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={residuals} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(v: number) => [formatK(v), 'Residual']}
            contentStyle={{ fontSize: 11 }}
          />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="3 2" />
          <Bar
            dataKey="residual"
            fill="var(--primary)"
            radius={[2, 2, 0, 0]}
            maxBarSize={16}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}