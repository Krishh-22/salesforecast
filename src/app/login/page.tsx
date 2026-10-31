'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, TrendingUp, BarChart2, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signIn('demo@salesforecast.com', 'demo1234');
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Demo login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--background)' }}
    >
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: 'var(--card)', borderRight: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--primary)' }}
          >
            <TrendingUp size={18} className="text-white" />
          </div>
          <span className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            SalesForecast
          </span>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h1
              className="text-4xl font-bold leading-tight"
              style={{ color: 'var(--foreground)' }}
            >
              Revenue Intelligence
              <br />
              <span style={{ color: 'var(--primary)' }}>for Sales Teams</span>
            </h1>
            <p className="text-base leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              Upload your sales history, compare forecasting models by backtest, and get
              predictions with confidence ranges.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: BarChart2, label: 'Accuracy', value: 'Measured by backtest' },
              { icon: TrendingUp, label: 'Forecast Range', value: 'Confidence bands' },
              { icon: BarChart2, label: 'Models', value: '4 + auto-select' },
              { icon: TrendingUp, label: 'Data Import', value: 'CSV up to 50 MB' },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-4 rounded-xl"
                style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
              >
                <stat.icon size={16} style={{ color: 'var(--primary)' }} className="mb-2" />
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {stat.label}
                </p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--foreground)' }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          © 2026 SalesForecast · Enterprise Revenue Intelligence
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--primary)' }}
            >
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              SalesForecast
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Welcome back
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Sign in to access your forecasting dashboard
            </p>
          </div>

          {/* Demo credentials banner */}
          <div
            className="p-4 rounded-xl text-sm"
            style={{
              background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
            }}
          >
            <p className="font-medium mb-1" style={{ color: 'var(--primary)' }}>
              Demo Account
            </p>
            <p style={{ color: 'var(--muted-foreground)' }}>
              Email: <span className="font-mono text-xs">demo@salesforecast.com</span>
            </p>
            <p style={{ color: 'var(--muted-foreground)' }}>
              Password: <span className="font-mono text-xs">demo1234</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                className="p-3 rounded-lg text-sm"
                style={{
                  background: 'color-mix(in srgb, var(--negative) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--negative) 30%, transparent)',
                  color: 'var(--negative)',
                }}
              >
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium"
                style={{ color: 'var(--foreground)' }}
              >
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)' }}
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-field w-full pl-9 h-10 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium"
                style={{ color: 'var(--foreground)' }}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)' }}
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field w-full pl-9 pr-10 h-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ background: 'var(--primary)', color: 'white' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                or
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full h-10 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            >
              Continue with demo account
            </button>
          </form>

          <p className="text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
