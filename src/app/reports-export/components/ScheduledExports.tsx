'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

export default function ScheduledExports() {
  return (
    <div className="card-elevated p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Scheduled Exports</h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
          Planned
        </span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
        <Calendar size={32} style={{ color: 'var(--muted-foreground)' }} className="mb-3 opacity-40" />
        <p className="text-sm font-medium text-foreground mb-1">Not available yet</p>
        <p className="text-xs max-w-[220px]" style={{ color: 'var(--muted-foreground)' }}>
          Recurring exports need a background job on a server. For now, generate a report from the cards on the left whenever you need one.
        </p>
      </div>
    </div>
  );
}
