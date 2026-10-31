'use client';

import React, { useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useDatasets } from '@/contexts/DatasetContext';
import { ShieldCheck, Users, Database, TrendingUp, Rows3 } from 'lucide-react';

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-elevated p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--info-bg)', color: 'var(--primary)' }}>
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--muted-foreground)' }}>
          {label}
        </p>
        <p className="text-lg font-semibold font-mono text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { user } = useAuth();
  const { datasets, forecastRuns } = useDatasets();

  const rows = useMemo(() => datasets.reduce((sum, d) => sum + (d.rowCount ?? 0), 0), [datasets]);
  const name: string = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';
  const initials = name
    .split(/\s+/)
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <AppLayout title="Account" subtitle="Your profile and what is stored in your workspace">
      <div className="max-w-3xl space-y-6">
        <div className="card-elevated p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ background: 'var(--primary)' }}>
            {initials || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground truncate">{name}</p>
            <p className="text-sm truncate" style={{ color: 'var(--muted-foreground)' }}>
              {user?.email ?? 'Not signed in'}
            </p>
            {user?.created_at && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                Member since {new Date(user.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat icon={<Database size={16} />} label="Datasets" value={String(datasets.length)} />
          <Stat icon={<Rows3 size={16} />} label="Rows imported" value={rows.toLocaleString()} />
          <Stat icon={<TrendingUp size={16} />} label="Forecast runs" value={String(forecastRuns.length)} />
        </div>

        <div className="card-elevated p-5 flex gap-3">
          <ShieldCheck size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--positive)' }} />
          <div>
            <p className="text-sm font-semibold text-foreground">Your data is private to your account</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              Datasets and forecasts are stored in the database with row-level security, so only the account that created them can read, change or delete them.
              You can remove a dataset (and the forecasts built from it) at any time from Data Management.
            </p>
          </div>
        </div>

        <div className="card-elevated p-5 flex gap-3">
          <Users size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--muted-foreground)' }} />
          <div>
            <p className="text-sm font-semibold text-foreground">Team workspaces are not available yet</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              Every account is its own workspace. Inviting teammates and sharing datasets or forecasts would need roles and shared-access rules in the database, which are on the roadmap.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
