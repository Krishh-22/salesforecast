/**
 * Saved forecast defaults (stored in this browser's localStorage).
 * Parsing is separate from storage so it can be unit-tested with plain Node.
 */

export type ModelChoice = 'auto' | 'holt_winters' | 'linear_seasonal' | 'seasonal_naive' | 'moving_avg';
export type SeasonalityChoice = 'auto' | 'none' | '4' | '13' | '52';

export type ForecastDefaults = {
  model: ModelChoice;
  horizonWeeks: number;
  confidence: number;
  seasonality: SeasonalityChoice;
  clipOutliers: boolean;
};

export const FACTORY_DEFAULTS: ForecastDefaults = {
  model: 'auto',
  horizonWeeks: 12,
  confidence: 80,
  seasonality: 'auto',
  clipOutliers: true,
};

export const SETTINGS_KEY = 'salesforecast.forecastDefaults.v1';

const MODELS: ModelChoice[] = ['auto', 'holt_winters', 'linear_seasonal', 'seasonal_naive', 'moving_avg'];
const SEASONS: SeasonalityChoice[] = ['auto', 'none', '4', '13', '52'];

function clampStep(v: unknown, min: number, max: number, step: number, fallback: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  const snapped = Math.round((n - min) / step) * step + min;
  return Math.min(max, Math.max(min, snapped));
}

/** Never throws: anything missing or invalid falls back to the factory value. */
export function parseDefaults(raw: string | null | undefined): ForecastDefaults {
  let obj: Record<string, unknown> = {};
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) obj = parsed as Record<string, unknown>;
  } catch {
    /* corrupted value — use factory defaults */
  }
  return {
    model: MODELS.includes(obj.model as ModelChoice) ? (obj.model as ModelChoice) : FACTORY_DEFAULTS.model,
    horizonWeeks: clampStep(obj.horizonWeeks, 4, 52, 4, FACTORY_DEFAULTS.horizonWeeks),
    confidence: clampStep(obj.confidence, 50, 99, 5, FACTORY_DEFAULTS.confidence),
    seasonality: SEASONS.includes(obj.seasonality as SeasonalityChoice) ? (obj.seasonality as SeasonalityChoice) : FACTORY_DEFAULTS.seasonality,
    clipOutliers: typeof obj.clipOutliers === 'boolean' ? obj.clipOutliers : FACTORY_DEFAULTS.clipOutliers,
  };
}

export function loadDefaults(): ForecastDefaults {
  try {
    return parseDefaults(window.localStorage.getItem(SETTINGS_KEY));
  } catch {
    return { ...FACTORY_DEFAULTS };
  }
}

/** Returns false if the browser refused to store it (private window etc.). */
export function saveDefaults(d: ForecastDefaults): boolean {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}
