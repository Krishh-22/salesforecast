'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';
import {
  LayoutDashboard,
  Upload,
  TrendingUp,
  Settings2,
  FileBarChart,
  Database,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LogOut,
  Users,
  UserCog,
} from 'lucide-react';


interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  badgeVariant?: 'primary' | 'warning' | 'negative';
}

const navItems: NavItem[] = [
  { id: 'nav-dashboard', label: 'Forecasting Dashboard', href: '/', icon: LayoutDashboard },
  { id: 'nav-upload', label: 'Data Upload', href: '/data-upload', icon: Upload },
  { id: 'nav-analysis', label: 'Forecast Analysis', href: '/forecast-analysis', icon: TrendingUp },
  { id: 'nav-config', label: 'Forecast Configuration', href: '/forecast-configuration', icon: Settings2 },
  { id: 'nav-reports', label: 'Reports & Export', href: '/reports-export', icon: FileBarChart },
  { id: 'nav-data', label: 'Data Management', href: '/data-management', icon: Database },
  { id: 'nav-workspace', label: 'Account', href: '/workspace-admin', icon: Users },
  { id: 'nav-settings', label: 'User Settings', href: '/user-settings', icon: UserCog },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const displayName: string = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Account';
  const initials =
    displayName
      .split(/[\s._-]+/)
      .filter(Boolean)
      .map((p: string) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <aside
      className={`sidebar-transition flex flex-col h-full relative z-30 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      style={{ background: 'var(--card)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-3 border-b ${collapsed ? 'justify-center' : 'gap-3'}`}
        style={{ borderColor: 'var(--border)' }}>
        <AppLogo size={32} />
        {!collapsed && (
          <span className="font-semibold text-base text-foreground tracking-tight">
            SalesForecast
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {!collapsed && (
          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Analytics
          </p>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (collapsed) {
            return (
              <div key={item.id} className="tooltip-wrapper">
                <Link
                  href={item.href}
                  className={`nav-item justify-center px-0 w-full h-10 ${isActive ? 'active' : ''}`}
                >
                  <Icon size={20} />
                </Link>
                <span className="tooltip-label top-1/2 -translate-y-1/2">{item.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="px-2 py-3 border-t space-y-0.5" style={{ borderColor: 'var(--border)' }}>
        {collapsed ? (
          <>
            <div className="tooltip-wrapper">
              <Link href="/help-docs" className="nav-item justify-center px-0 w-full h-10">
                <HelpCircle size={18} />
              </Link>
              <span className="tooltip-label top-1/2 -translate-y-1/2">Help & Docs</span>
            </div>
          </>
        ) : (
          <>
            <Link href="/help-docs" className="nav-item w-full">
              <HelpCircle size={18} />
              <span>Help & Docs</span>
            </Link>
          </>
        )}

        {/* User */}
        <div className={`flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg ${collapsed ? 'justify-center' : ''}`}
          style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '12px' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold text-white"
            style={{ background: 'var(--primary)' }}>
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email ?? ''}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 z-40"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          color: 'var(--muted-foreground)',
        }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}