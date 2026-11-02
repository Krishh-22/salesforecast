'use client';

import React from 'react';
import { UploadCloud } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import type { SeasonalPoint } from '@/lib/forecast/engine';
import { moneyFull } from '@/lib/forecast/report';

interface Props {
  profile: SeasonalPoint[];
}

const formatK = (v: number) => (Math.abs(v) >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : `${v}`);

export default function SeasonalityChart({ profile }: Props) {
  if (!profile || profile.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[180px] text-center">
        <UploadCloud size={28} style={{ color: 'var(--muted-foreground)' }} className="mb-2 opacity-40" />
        <p className="text-xs font-medium text-foreground mb-1">No seasonal cycle</p>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          No repeating pattern was detected, or there was not enough history (needs 2 full cycles).
        </p>
      </div>
    );
  }

  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={profile} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(v: number) => [`${v >= 0 ? '+' : '−'}${moneyFull(Math.abs(v))}`, 'Effect on weekly sales']}
            contentStyle={{ fontSize: 11 }}
          />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="3 2" />
          <Bar dataKey="effect" fill="var(--accent)" radius={[2, 2, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
