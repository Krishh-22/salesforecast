'use client';

import React from 'react';
import { Bell, CheckCircle2, AlertCircle, AlertTriangle, Info, CheckCheck } from 'lucide-react';
import { useNotifications, AppNotification } from '@/contexts/NotificationContext';
import { useRouter } from 'next/navigation';
import { useDatasets } from '@/contexts/DatasetContext';
import { deriveInsights, type ReportRun } from '@/lib/forecast/report';

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotifIcon({ type }: { type: AppNotification['type'] }) {
  const size = 14;
  if (type === 'success') return <CheckCircle2 size={size} style={{ color: 'var(--positive)' }} />;
  if (type === 'error') return <AlertCircle size={size} style={{ color: 'var(--negative)' }} />;
  if (type === 'warning') return <AlertTriangle size={size} style={{ color: 'var(--warning)' }} />;
  return <Info size={size} style={{ color: 'var(--primary)' }} />;
}

export default function AlertsPanel() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();
  const { latestForecast } = useDatasets();
  const insights = deriveInsights(latestForecast ? (latestForecast as unknown as ReportRun) : null);

  const handleClick = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.href) router.push(n.href);
  };

  return (
    <div className="card-elevated p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Alerts & Notices</h2>
          {unreadCount > 0 && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ background: 'var(--negative)' }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="btn-ghost h-7 px-2 text-xs flex items-center gap-1"
            title="Mark all as read"
          >
            <CheckCheck size={12} />
            Mark all read
          </button>
        )}
      </div>

      {insights.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
            Insights from your latest forecast
          </p>
          {insights.map((i) => (
            <div
              key={`insight-${i.title}`}
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{
                background: i.level === 'warning' ? 'var(--warning-bg)' : i.level === 'success' ? 'var(--positive-bg)' : 'var(--info-bg)',
              }}
            >
              <div className="mt-0.5 shrink-0">
                <NotifIcon type={i.level} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-snug text-foreground">{i.title}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                  {i.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {notifications.length === 0 && insights.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <Bell size={32} style={{ color: 'var(--muted-foreground)' }} className="mb-3 opacity-50" />
          <p className="text-sm font-medium text-foreground mb-1">No alerts</p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            No data yet — upload a file to get started
          </p>
        </div>
      ) : notifications.length === 0 ? null : (
        <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
          {notifications.slice(0, 10).map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
              style={{
                background: n.read ? 'transparent' : 'color-mix(in srgb, var(--primary) 5%, transparent)',
                border: `1px solid ${n.read ? 'transparent' : 'color-mix(in srgb, var(--primary) 15%, transparent)'}`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'var(--muted)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = n.read
                  ? 'transparent' :'color-mix(in srgb, var(--primary) 5%, transparent)';
              }}
              onClick={() => handleClick(n)}
            >
              <div className="mt-0.5 shrink-0">
                <NotifIcon type={n.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <p
                    className="text-xs font-semibold leading-snug"
                    style={{ color: n.read ? 'var(--muted-foreground)' : 'var(--foreground)' }}
                  >
                    {n.title}
                  </p>
                  <span className="text-xs shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                    {timeAgo(n.timestamp)}
                  </span>
                </div>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                  {n.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}