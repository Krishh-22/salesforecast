'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, TrendingUp, Lock, Mail, User } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, { fullName });
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
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

        <div className="space-y-6">
          <div className="space-y-4">
            <h1
              className="text-4xl font-bold leading-tight"
              style={{ color: 'var(--foreground)' }}
            >
              Start forecasting
              <br />
              <span style={{ color: 'var(--primary)' }}>with confidence</span>
            </h1>
            <p className="text-base leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              Create your account and get instant access to ML-powered sales forecasting,
              interactive dashboards, and exportable reports.
            </p>
          </div>

          <ul className="space-y-3">
            {[
              'Upload a CSV with drag-and-drop — columns detected automatically',
              'Four forecasting models, auto-picked by backtesting',
              'Confidence ranges and measured accuracy (MAPE, RMSE)',
              'Download reports (print to PDF) and CSV data',
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: 'var(--primary)' }}
                  />
                </div>
                <span style={{ color: 'var(--muted-foreground)' }}>{feature}</span>
              </li>
            ))}
          </ul>
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
              Create your account
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Get started with your free forecasting workspace
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
                htmlFor="fullName"
                className="text-sm font-medium"
                style={{ color: 'var(--foreground)' }}
              >
                Full name
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)' }}
                />
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  className="input-field w-full pl-9 h-10 text-sm"
                />
              </div>
            </div>

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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
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

            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium"
                style={{ color: 'var(--foreground)' }}
              >
                Confirm password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)' }}
                />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="input-field w-full pl-9 h-10 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ background: 'var(--primary)', color: 'white' }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
