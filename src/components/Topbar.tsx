'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Sun, Moon, RefreshCw, LogOut, CheckCheck, Trash2, X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications, AppNotification } from '@/contexts/NotificationContext';
import { useDatasets } from '@/contexts/DatasetContext';
import { useRouter } from 'next/navigation';

interface TopbarProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
}

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

export default function Topbar({ title, subtitle, lastUpdated }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [searchValue, setSearchValue] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAll } = useNotifications();
  const notifRef = useRef<HTMLDivElement>(null);
  const { datasets, forecastRuns } = useDatasets();
  const [searchOpen, setSearchOpen] = useState(false);

  // Search the user's own datasets and forecast runs
  const q = searchValue.trim().toLowerCase();
  const searchResults = q
    ? [
        ...datasets
          .filter((d) => `${d.name} ${d.fileName}`.toLowerCase().includes(q))
          .map((d) => ({ key: `d-${d.id}`, kind: 'Dataset', label: d.name, href: '/data-management' })),
        ...forecastRuns
          .filter((r) => r.runName.toLowerCase().includes(q))
          .map((r) => ({ key: `r-${r.id}`, kind: 'Forecast', label: r.runName, href: '/forecast-analysis' })),
      ].slice(0, 6)
    : [];
  const goToResult = (href: string) => {
    setSearchOpen(false);
    setSearchValue('');
    router.push(href);
  };

  // Close notification panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    }
    if (showNotifPanel) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifPanel]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleNotifClick = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.href) {
      router.push(n.href);
      setShowNotifPanel(false);
    }
  };

  const userInitial = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? 'U';

  const displayName = user?.user_metadata?.full_name || user?.email || 'User';

  return (
    <header
      className="h-16 flex items-center justify-between px-6 shrink-0"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}
    >
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold text-foreground leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search datasets, forecasts…"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchOpen(false);
              if (e.key === 'Enter' && searchResults[0]) goToResult(searchResults[0].href);
            }}
            className="input-field pl-8 w-56 h-9 text-sm"
            aria-label="Search datasets and forecasts"
          />
          {searchOpen && q && (
            <div
              className="absolute top-full mt-1 left-0 w-72 rounded-lg z-30 shadow-lg overflow-hidden"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              {searchResults.length === 0 ? (
                <p className="px-3 py-3 text-xs text-muted-foreground">No datasets or forecasts match “{searchValue.trim()}”</p>
              ) : (
                searchResults.map((r) => (
                  <button
                    key={r.key}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goToResult(r.href)}
                    className="flex items-center justify-between gap-3 w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <span className="truncate text-foreground">{r.label}</span>
                    <span className="text-xs shrink-0 text-muted-foreground">{r.kind}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw size={12} />
            <span>Updated {lastUpdated}</span>
          </div>
        )}

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            className="relative btn-ghost h-9 w-9 p-0 justify-center"
            onClick={() => setShowNotifPanel((v) => !v)}
            aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: 'var(--negative)', fontSize: '10px', lineHeight: 1, padding: '0 3px' }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifPanel && (
            <div
              className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-xl z-30 overflow-hidden flex flex-col"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                maxHeight: '420px',
              }}
            >
              {/* Panel header */}
              <div
                className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  <Bell size={14} style={{ color: 'var(--primary)' }} />
                  <span className="text-sm font-semibold text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: 'var(--negative)' }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="btn-ghost h-7 w-7 p-0 justify-center"
                      title="Mark all as read"
                    >
                      <CheckCheck size={13} />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="btn-ghost h-7 w-7 p-0 justify-center"
                      title="Clear all"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifPanel(false)}
                    className="btn-ghost h-7 w-7 p-0 justify-center"
                    title="Close"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Notification list */}
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <Bell size={28} style={{ color: 'var(--muted-foreground)' }} className="mb-2 opacity-40" />
                    <p className="text-sm font-medium text-foreground">No notifications yet</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                      Events like forecast completions and uploads will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                      style={{
                        background: n.read ? 'transparent' : 'color-mix(in srgb, var(--primary) 5%, transparent)',
                        borderBottom: '1px solid var(--border)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = 'var(--muted)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = n.read
                          ? 'transparent' :'color-mix(in srgb, var(--primary) 5%, transparent)';
                      }}
                      onClick={() => handleNotifClick(n)}
                    >
                      <div className="mt-0.5 shrink-0">
                        <NotifIcon type={n.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
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
                      <button
                        className="shrink-0 btn-ghost h-5 w-5 p-0 justify-center opacity-0 group-hover:opacity-100"
                        style={{ marginTop: '1px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(n.id);
                        }}
                        title="Dismiss"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          className="btn-ghost h-9 w-9 p-0 justify-center"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            className="flex items-center gap-2 h-9 px-2 rounded-lg transition-colors"
            style={{ background: showUserMenu ? 'var(--background)' : 'transparent' }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
              style={{ background: 'var(--primary)' }}
            >
              {userInitial}
            </div>
            <span className="hidden md:block text-sm font-medium max-w-[120px] truncate" style={{ color: 'var(--foreground)' }}>
              {displayName}
            </span>
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div
                className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-lg z-20 overflow-hidden"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                    {displayName}
                  </p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    {user?.email}
                  </p>
                </div>
                <div className="p-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-opacity-10"
                    style={{ color: 'var(--negative)' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--negative) 10%, transparent)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }}
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}