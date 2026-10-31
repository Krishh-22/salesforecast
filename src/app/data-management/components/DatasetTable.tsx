'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { TableRowSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import ColumnProfiler from './ColumnProfiler';
import { Search, Trash2, Eye, Download, Database, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useDatasets } from '@/contexts/DatasetContext';
import { seriesToCsv } from '@/lib/forecast/profile';
import { downloadText, safeFileName } from '@/lib/download';

export default function DatasetTable() {
  const { datasets, forecastRuns, isLoadingDatasets, deleteDataset } = useDatasets();
  const [search, setSearch] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const runsPerDataset = useMemo(() => {
    const m = new Map<string, number>();
    forecastRuns.forEach((r) => m.set(r.datasetId, (m.get(r.datasetId) ?? 0) + 1));
    return m;
  }, [forecastRuns]);

  const q = search.trim().toLowerCase();
  const rows = q ? datasets.filter((d) => `${d.name} ${d.fileName}`.toLowerCase().includes(q)) : datasets;
  const profiled = datasets.find((d) => d.id === profileId) ?? null;
  const toDelete = datasets.find((d) => d.id === deleteId) ?? null;

  const handleDownload = (id: string) => {
    const d = datasets.find((x) => x.id === id);
    if (!d?.seriesData) {
      toast.error('No parsed data stored for this dataset — re-upload the file');
      return;
    }
    downloadText(`${safeFileName(d.name)}_weekly.csv`, 'text/csv', seriesToCsv(d.seriesData));
    toast.success('Weekly data downloaded');
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    const ok = await deleteDataset(toDelete.id);
    setIsDeleting(false);
    if (ok) {
      if (profileId === toDelete.id) setProfileId(null);
      toast.success(`“${toDelete.name}” and its forecast runs were deleted`);
      setDeleteId(null);
    } else {
      toast.error('Could not delete the dataset — please try again');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card-elevated overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-base font-semibold text-foreground">Datasets</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {datasets.length} dataset{datasets.length !== 1 ? 's' : ''} uploaded
            </p>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              placeholder="Search datasets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-8 h-8 text-xs w-56"
              aria-label="Search datasets"
            />
          </div>
        </div>

        {isLoadingDatasets ? (
          <table className="w-full">
            <tbody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRowSkeleton key={`sk-${i}`} cols={6} />
              ))}
            </tbody>
          </table>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Database size={28} />}
            title={datasets.length === 0 ? 'No datasets yet' : 'No matches'}
            description={datasets.length === 0 ? 'Upload a CSV of your sales history to get started.' : 'Try a different search.'}
            action={
              datasets.length === 0 ? (
                <Link href="/data-upload" className="btn-primary">
                  Upload Data
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--muted)' }}>
                  {['Dataset', 'Rows', 'Weeks', 'Date range', 'Forecast runs', 'Uploaded', ''].map((h, i) => (
                    <th key={`dt-h-${i}`} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const s = d.seriesData;
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-foreground">{d.name}</p>
                        <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                          {d.fileName} · {d.fileSize}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">{d.rowCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs font-mono">{s ? s.weeks.length : '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                        {s ? `${s.weeks[0]} → ${s.weeks[s.weeks.length - 1]}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {s ? (
                          <Badge variant={(runsPerDataset.get(d.id) ?? 0) > 0 ? 'complete' : 'neutral'}>{runsPerDataset.get(d.id) ?? 0}</Badge>
                        ) : (
                          <Badge variant="warning">Re-upload</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {new Date(d.uploadedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setProfileId(d.id === profileId ? null : d.id)} className="btn-ghost h-8 w-8 p-0 justify-center" title="View profile" aria-label="View profile">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => handleDownload(d.id)} className="btn-ghost h-8 w-8 p-0 justify-center" title="Download weekly data (CSV)" aria-label="Download weekly data">
                            <Download size={14} />
                          </button>
                          <button onClick={() => setDeleteId(d.id)} className="btn-ghost h-8 w-8 p-0 justify-center" title="Delete" aria-label="Delete dataset" style={{ color: 'var(--negative)' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {profiled && <ColumnProfiler dataset={profiled} onClose={() => setProfileId(null)} />}

      <Modal open={toDelete !== null} onClose={() => !isDeleting && setDeleteId(null)} title="Delete dataset?" size="sm">
        <div className="space-y-4">
          <div className="flex gap-3">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
            <p className="text-sm text-foreground">
              “{toDelete?.name}” will be removed together with{' '}
              <strong>{toDelete ? runsPerDataset.get(toDelete.id) ?? 0 : 0} forecast run(s)</strong> that use it. This cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteId(null)} disabled={isDeleting} className="btn-ghost">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={isDeleting} className="btn-primary" style={{ background: 'var(--negative)' }}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
