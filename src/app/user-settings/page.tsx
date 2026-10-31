'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import Toggle from '@/components/ui/Toggle';
import { toast } from 'sonner';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { FACTORY_DEFAULTS, loadDefaults, saveDefaults, type ForecastDefaults, type ModelChoice, type SeasonalityChoice } from '@/lib/settings';
import { MODEL_LABELS } from '@/lib/forecast/engine';

const modelOptions = Object.keys(MODEL_LABELS) as ModelChoice[];

const seasonOptions: { value: SeasonalityChoice; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'none', label: 'None (trend only)' },
  { value: '4', label: '4 weeks (monthly rhythm)' },
  { value: '13', label: '13 weeks (quarterly)' },
  { value: '52', label: '52 weeks (yearly)' },
];

export default function UserSettingsPage() {
  const [d, setD] = useState<ForecastDefaults>(FACTORY_DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setD(loadDefaults());
    setLoaded(true);
  }, []);

  const set = <K extends keyof ForecastDefaults>(key: K, value: ForecastDefaults[K]) => setD((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (saveDefaults(d)) toast.success('Defaults saved — new forecasts will start with these settings');
    else toast.error('Your browser blocked saving (private window?). Settings will reset when you close this tab.');
  };

  const handleReset = () => {
    setD(FACTORY_DEFAULTS);
    saveDefaults(FACTORY_DEFAULTS);
    toast.success('Restored the original defaults');
  };

  return (
    <AppLayout title="Settings" subtitle="Choose how new forecasts start">
      <div className="max-w-3xl space-y-6">
        <div className="card-elevated p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 gap-3 flex-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} style={{ color: 'var(--primary)' }} />
              <h2 className="text-sm font-semibold text-foreground">Default Forecast Settings</h2>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Saved in this browser · used to pre-fill Forecast Configuration
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="s-horizon" className="text-sm font-medium text-foreground">
                Forecast horizon
              </label>
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
                {d.horizonWeeks} weeks ({Math.round(d.horizonWeeks / 4.33)} months)
              </span>
            </div>
            <input id="s-horizon" type="range" min={4} max={52} step={4} value={d.horizonWeeks} onChange={(e) => set('horizonWeeks', Number(e.target.value))} className="w-full accent-primary" />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              <span>4 wks</span>
              <span>52 wks</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="s-ci" className="text-sm font-medium text-foreground">
                Confidence range
              </label>
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
                {d.confidence}%
              </span>
            </div>
            <input id="s-ci" type="range" min={50} max={99} step={5} value={d.confidence} onChange={(e) => set('confidence', Number(e.target.value))} className="w-full accent-primary" />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              <span>50%</span>
              <span>99%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="s-model" className="block text-sm font-medium text-foreground mb-2">
                Default model
              </label>
              <select id="s-model" value={d.model} onChange={(e) => set('model', e.target.value as ModelChoice)} className="input-field">
                {modelOptions.map((m) => (
                  <option key={`m-${m}`} value={m}>
                    {MODEL_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="s-season" className="block text-sm font-medium text-foreground mb-2">
                Seasonal cycle
              </label>
              <select id="s-season" value={d.seasonality} onChange={(e) => set('seasonality', e.target.value as SeasonalityChoice)} className="input-field">
                {seasonOptions.map((s) => (
                  <option key={`s-${s.value}`} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--muted)' }}>
            <div>
              <p className="text-sm font-medium text-foreground">Clip extreme weeks</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                Limits one-off spikes or dips before training so they do not distort the forecast
              </p>
            </div>
            <Toggle checked={d.clipOutliers} onChange={(v) => set('clipOutliers', v)} />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button onClick={handleReset} className="btn-ghost gap-1.5">
              <RotateCcw size={14} />
              Restore originals
            </button>
            <button onClick={handleSave} disabled={!loaded} className="btn-primary">
              Save defaults
            </button>
          </div>
        </div>

        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Email notifications and export-format preferences are not available: they would need a server to send mail, and exports are chosen per download on the Reports page.
        </p>
      </div>
    </AppLayout>
  );
}
