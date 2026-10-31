'use client';

import React, { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import ReportTemplates, { type ExportEntry } from './components/ReportTemplates';
import ExportHistoryTable from './components/ExportHistoryTable';
import ScheduledExports from './components/ScheduledExports';

const STORAGE_KEY = 'salesforecast.exportHistory.v1';

function loadHistory(): ExportEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 50) : [];
  } catch {
    return [];
  }
}

function saveHistory(list: ExportEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* storage unavailable (private window etc.) — history just won't persist */
  }
}

export default function ReportsExportPage() {
  const [history, setHistory] = useState<ExportEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const onExported = useCallback((entry: ExportEntry) => {
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 50);
      saveHistory(next);
      return next;
    });
  }, []);

  const onClear = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  return (
    <AppLayout title="Reports & Export" subtitle="Download forecast reports and data from your runs">
      <div className="space-y-6">
        <ReportTemplates onExported={onExported} />
        <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <ExportHistoryTable history={history} onClear={onClear} />
          </div>
          <div>
            <ScheduledExports />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
