/**
 * Forecast engine — real time-series models running in the browser.
 * Self-contained (no imports) so it can be unit-tested with plain Node.
 *
 * Models
 *  - holt_winters   : damped additive Holt-Winters (level + trend + seasonality), parameters grid-searched
 *  - linear_seasonal: linear trend (OLS) + additive seasonal indices
 *  - seasonal_naive : repeat the value from one season ago
 *  - moving_avg     : flat average of the last 4 weeks (benchmark)
 *  - auto           : backtest every model on a hold-out window and keep the most accurate one
 */

export type ModelId = 'auto' | 'holt_winters' | 'linear_seasonal' | 'seasonal_naive' | 'moving_avg';

export const MODEL_LABELS: Record<ModelId, string> = {
  auto: 'Auto (best of all)',
  holt_winters: 'Holt-Winters',
  linear_seasonal: 'Linear Trend + Seasonality',
  seasonal_naive: 'Seasonal Naive',
  moving_avg: 'Moving Average',
};

export type ForecastOptions = {
  model: ModelId;
  horizon: number; // weeks
  confidence: number; // 50..99
  /** 'auto' = detect, 0 = none, otherwise season length in weeks (4, 13, 52…) */
  seasonLength?: 'auto' | number;
  allowYearly?: boolean;
  clipOutliers?: boolean;
};

export type ForecastPoint = {
  week: string; // display label
  isoDate: string;
  actual: number | null;
  predicted: number;
  lower: number | null;
  upper: number | null;
};

export type LeaderboardRow = { model: ModelId; label: string; mape: number | null; rmse: number | null };

export type SeasonalPoint = { label: string; effect: number };

/** Stored with every run (forecast_runs.diagnostics) so the Analysis page can show real, not invented, numbers. */
export type RunDiagnostics = {
  modelLabel: string;
  seasonLength: number;
  backtestWeeks: number;
  historyWeeks: number;
  mape: number | null;
  rmse: number | null;
  leaderboard: LeaderboardRow[];
  seasonalProfile: SeasonalPoint[];
  notes: string[];
};

export type ForecastResult = {
  modelUsed: ModelId;
  modelLabel: string;
  seasonLength: number;
  forecastData: ForecastPoint[];
  leaderboard: LeaderboardRow[];
  seasonalProfile: SeasonalPoint[];
  metrics: {
    mape: number | null; // % on hold-out
    rmse: number | null;
    backtestWeeks: number;
    projectedTotal: number;
    growthRate: number; // % vs previous `horizon` weeks
    avgCiWidthPct: number; // ± % around the prediction
    historyWeeks: number;
  };
  notes: string[];
};

type Fit = { fitted: number[]; predict: (h: number) => number[] };

const MIN_WEEKS = 8;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

function median(a: number[]): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Inverse of the standard normal CDF (Acklam's approximation). */
export function zScore(confidencePct: number): number {
  const p = 0.5 + Math.min(0.999, Math.max(0.5, confidencePct / 100)) / 2;
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pl = 0.02425;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= 1 - pl) {
    const q = p - 0.5;
    const r = q * q;
    return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

function olsLine(y: number[]): { a: number; b: number } {
  const n = y.length;
  const tMean = (n - 1) / 2;
  const yMean = mean(y);
  let num = 0;
  let den = 0;
  for (let t = 0; t < n; t++) {
    num += (t - tMean) * (y[t] - yMean);
    den += (t - tMean) * (t - tMean);
  }
  const b = den === 0 ? 0 : num / den;
  return { a: yMean - b * tMean, b };
}

/** Pick a seasonal cycle length (weeks) using autocorrelation of the de-trended series. */
export function detectSeasonLength(y: number[], allowYearly = true): number {
  const n = y.length;
  if (n < 16) return 0;
  const { a, b } = olsLine(y);
  const r = y.map((v, t) => v - (a + b * t));
  const rMean = mean(r);
  let denom = 0;
  for (const v of r) denom += (v - rMean) * (v - rMean);
  if (denom === 0) return 0;
  const acf = (lag: number) => {
    let s = 0;
    for (let t = lag; t < n; t++) s += (r[t] - rMean) * (r[t - lag] - rMean);
    return s / denom;
  };
  const candidates = [52, 13, 4].filter((m) => (m !== 52 || allowYearly) && n >= 2 * m);
  let best = 0;
  let bestAcf = 0.3; // minimum evidence
  for (const m of candidates) {
    const v = acf(m);
    if (v > bestAcf) {
      bestAcf = v;
      best = m;
    }
  }
  return best;
}

/**
 * Average de-trended deviation at each position of the seasonal cycle (centred on zero).
 * Positions are counted from the first week of the series; labels use the dates of the first cycle.
 */
export function computeSeasonalProfile(weeks: string[], y: number[], m: number): SeasonalPoint[] {
  if (m < 2 || y.length < 2 * m) return [];
  const { a, b } = olsLine(y);
  const sums = new Array(m).fill(0);
  const counts = new Array(m).fill(0);
  for (let t = 0; t < y.length; t++) {
    sums[t % m] += y[t] - (a + b * t);
    counts[t % m]++;
  }
  const raw: number[] = sums.map((s: number, j: number) => s / counts[j]);
  const c = mean(raw);
  return raw.map((v, j) => {
    const d = new Date(weeks[j] + 'T00:00:00Z');
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
    return { label: m >= 26 ? `${d.getUTCDate()} ${mon}` : `Wk ${j + 1}`, effect: Math.round(v - c) };
  });
}

function nonNegative(y: number[]): boolean {
  return y.every((v) => v >= 0);
}

function winsorize(y: number[]): { out: number[]; clipped: number } {
  const med = median(y);
  const mad = median(y.map((v) => Math.abs(v - med))) * 1.4826;
  if (mad === 0) return { out: y, clipped: 0 };
  const lo = med - 4 * mad;
  const hi = med + 4 * mad;
  let clipped = 0;
  const out = y.map((v) => {
    if (v < lo) {
      clipped++;
      return lo;
    }
    if (v > hi) {
      clipped++;
      return hi;
    }
    return v;
  });
  return { out, clipped };
}

// ---------------------------------------------------------------------------
// models
// ---------------------------------------------------------------------------

function fitMovingAvg(y: number[], k = 4): Fit {
  const n = y.length;
  const fitted = y.map((_, t) => (t === 0 ? y[0] : mean(y.slice(Math.max(0, t - k), t))));
  const level = mean(y.slice(Math.max(0, n - k)));
  return { fitted, predict: (h) => Array.from({ length: h }, () => level) };
}

function fitSeasonalNaive(y: number[], m: number): Fit {
  const n = y.length;
  if (m < 2 || n < m) return fitMovingAvg(y);
  const fitted = y.map((_, t) => (t >= m ? y[t - m] : t > 0 ? y[t - 1] : y[0]));
  return { fitted, predict: (h) => Array.from({ length: h }, (_, i) => y[n - m + (i % m)]) };
}

function fitLinearSeasonal(y: number[], m: number): Fit {
  const n = y.length;
  const { a, b } = olsLine(y);
  const seasonal = new Array(Math.max(m, 1)).fill(0);
  if (m >= 2 && n >= 2 * m) {
    const sums = new Array(m).fill(0);
    const counts = new Array(m).fill(0);
    for (let t = 0; t < n; t++) {
      sums[t % m] += y[t] - (a + b * t);
      counts[t % m]++;
    }
    const raw = sums.map((s, j) => s / counts[j]);
    const c = mean(raw);
    for (let j = 0; j < m; j++) seasonal[j] = raw[j] - c;
  }
  const s = (t: number) => (m >= 2 && n >= 2 * m ? seasonal[t % m] : 0);
  const fitted = y.map((_, t) => a + b * t + s(t));
  return { fitted, predict: (h) => Array.from({ length: h }, (_, i) => a + b * (n + i) + s(n + i)) };
}

const PHI = 0.98; // trend damping

function hwRun(y: number[], m: number, alpha: number, beta: number, gamma: number) {
  const n = y.length;
  const seasonal = m >= 2 && n >= 2 * m;
  const mm = seasonal ? m : 1;
  let level: number;
  let trend: number;
  const s = new Array(mm).fill(0);
  if (seasonal) {
    level = mean(y.slice(0, m));
    trend = (mean(y.slice(m, 2 * m)) - mean(y.slice(0, m))) / m;
    for (let j = 0; j < m; j++) s[j] = y[j] - level;
  } else {
    level = y[0];
    trend = 0;
  }
  const start = seasonal ? m : 1;
  const fitted = y.slice();
  let sse = 0;
  for (let t = start; t < n; t++) {
    const sj = seasonal ? s[t % m] : 0;
    const pred = level + PHI * trend + sj;
    fitted[t] = pred;
    const err = y[t] - pred;
    sse += err * err;
    const newLevel = alpha * (y[t] - sj) + (1 - alpha) * (level + PHI * trend);
    trend = beta * (newLevel - level) + (1 - beta) * PHI * trend;
    if (seasonal) s[t % m] = gamma * (y[t] - newLevel) + (1 - gamma) * sj;
    level = newLevel;
  }
  return { fitted, sse, level, trend, s, seasonal, mm };
}

function fitHoltWinters(y: number[], m: number): Fit {
  const alphas = [0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9];
  const betas = [0.01, 0.05, 0.1, 0.2, 0.3];
  const gammas = m >= 2 && y.length >= 2 * m ? [0.05, 0.1, 0.2, 0.4, 0.6] : [0];
  let best: ReturnType<typeof hwRun> | null = null;
  for (const al of alphas)
    for (const be of betas)
      for (const ga of gammas) {
        const r = hwRun(y, m, al, be, ga);
        if (best === null || r.sse < best.sse) best = r;
      }
  const r = best as ReturnType<typeof hwRun>;
  const n = y.length;
  return {
    fitted: r.fitted,
    predict: (h) => {
      const out: number[] = [];
      let phiSum = 0;
      let phiPow = 1;
      for (let i = 0; i < h; i++) {
        phiPow *= PHI;
        phiSum += phiPow;
        out.push(r.level + phiSum * r.trend + (r.seasonal ? r.s[(n + i) % r.mm] : 0));
      }
      return out;
    },
  };
}

function fitModel(model: Exclude<ModelId, 'auto'>, y: number[], m: number): Fit {
  switch (model) {
    case 'holt_winters':
      return fitHoltWinters(y, m);
    case 'linear_seasonal':
      return fitLinearSeasonal(y, m);
    case 'seasonal_naive':
      return fitSeasonalNaive(y, m);
    default:
      return fitMovingAvg(y);
  }
}

// ---------------------------------------------------------------------------
// accuracy
// ---------------------------------------------------------------------------

function accuracy(actual: number[], pred: number[]): { mape: number | null; rmse: number } {
  let se = 0;
  let ape = 0;
  let apeN = 0;
  for (let i = 0; i < actual.length; i++) {
    const e = actual[i] - pred[i];
    se += e * e;
    if (actual[i] !== 0) {
      ape += Math.abs(e / actual[i]);
      apeN++;
    }
  }
  return { mape: apeN ? (ape / apeN) * 100 : null, rmse: Math.sqrt(se / Math.max(1, actual.length)) };
}

const FITTABLE: Exclude<ModelId, 'auto'>[] = ['holt_winters', 'linear_seasonal', 'seasonal_naive', 'moving_avg'];

function backtest(y: number[], model: Exclude<ModelId, 'auto'>, m: number, hb: number) {
  const train = y.slice(0, y.length - hb);
  const test = y.slice(y.length - hb);
  const mTrain = m >= 2 && train.length >= 2 * m ? m : 0;
  const fit = fitModel(model, train, mTrain);
  let pred = fit.predict(hb);
  if (nonNegative(y)) pred = pred.map((v) => Math.max(0, v));
  return accuracy(test, pred);
}

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------

export function formatWeekLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
  return `${d.getUTCDate()} ${mon} ${String(d.getUTCFullYear()).slice(2)}`;
}

function addWeeks(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 7 * n);
  return d.toISOString().slice(0, 10);
}

export function runForecast(weeks: string[], values: number[], opts: ForecastOptions): ForecastResult {
  const n = values.length;
  if (n < MIN_WEEKS) throw new Error(`Need at least ${MIN_WEEKS} weeks of history to forecast (got ${n}).`);
  const horizon = Math.max(1, Math.min(104, Math.round(opts.horizon)));
  const notes: string[] = [];

  let y = values.slice();
  if (opts.clipOutliers) {
    const w = winsorize(y);
    y = w.out;
    if (w.clipped > 0) notes.push(`${w.clipped} outlier week(s) were clipped before training.`);
  }

  // season length
  let m: number;
  if (opts.seasonLength === undefined || opts.seasonLength === 'auto') m = detectSeasonLength(y, opts.allowYearly !== false);
  else m = opts.seasonLength;
  if (m >= 2 && n < 2 * m) {
    notes.push(`Not enough history for a ${m}-week season (need ${2 * m}+ weeks) — seasonality was switched off.`);
    m = 0;
  }
  notes.push(m >= 2 ? `Seasonal cycle of ${m} weeks ${opts.seasonLength === undefined || opts.seasonLength === 'auto' ? 'detected from autocorrelation' : 'set manually'}.` : 'No reliable seasonal cycle — trend-only forecast.');

  // hold-out backtest
  const hb = Math.max(4, Math.min(horizon, Math.floor(n * 0.25)));
  const canBacktest = n - hb >= MIN_WEEKS;
  const leaderboard: LeaderboardRow[] = FITTABLE.map((id) => {
    if (!canBacktest) return { model: id, label: MODEL_LABELS[id], mape: null, rmse: null };
    const r = backtest(y, id, m, hb);
    return { model: id, label: MODEL_LABELS[id], mape: r.mape, rmse: r.rmse };
  });

  let chosen: Exclude<ModelId, 'auto'>;
  if (opts.model === 'auto') {
    const ranked = leaderboard
      .filter((r) => r.rmse !== null)
      .sort((a, b) => (a.mape ?? Infinity) - (b.mape ?? Infinity) || (a.rmse as number) - (b.rmse as number));
    chosen = ranked.length ? (ranked[0].model as Exclude<ModelId, 'auto'>) : m >= 2 ? 'holt_winters' : 'linear_seasonal';
    if (!canBacktest) notes.push('History too short to backtest — defaulted to a safe model.');
  } else {
    chosen = opts.model;
  }
  const row = leaderboard.find((r) => r.model === chosen);
  if (!canBacktest) notes.push('Accuracy could not be measured on a hold-out window (history too short).');

  // final fit on all data
  const fit = fitModel(chosen, y, m);
  const keepNonNeg = nonNegative(values);
  let future = fit.predict(horizon);
  if (keepNonNeg) future = future.map((v) => Math.max(0, v));
  const fitted = keepNonNeg ? fit.fitted.map((v) => Math.max(0, v)) : fit.fitted;

  // uncertainty: error scale from hold-out RMSE (preferred) or in-sample RMSE
  const inSample = accuracy(values.slice(m >= 2 ? m : 1), fitted.slice(m >= 2 ? m : 1)).rmse;
  const sigma = Math.max(row?.rmse ?? 0, inSample);
  const z = zScore(opts.confidence);

  // chart data: up to 78 weeks of history + forecast
  const histStart = Math.max(0, n - 78);
  const data: ForecastPoint[] = [];
  for (let t = histStart; t < n; t++) {
    data.push({
      week: formatWeekLabel(weeks[t]),
      isoDate: weeks[t],
      actual: Math.round(values[t]),
      predicted: Math.round(fitted[t]),
      lower: null,
      upper: null,
    });
  }
  let widthSum = 0;
  let widthN = 0;
  for (let i = 0; i < horizon; i++) {
    const half = z * sigma * Math.sqrt(1 + 0.1 * i);
    const iso = addWeeks(weeks[n - 1], i + 1);
    const lower = keepNonNeg ? Math.max(0, future[i] - half) : future[i] - half;
    const upper = future[i] + half;
    if (future[i] > 0) {
      widthSum += (half / future[i]) * 100;
      widthN++;
    }
    data.push({
      week: formatWeekLabel(iso),
      isoDate: iso,
      actual: null,
      predicted: Math.round(future[i]),
      lower: Math.round(lower),
      upper: Math.round(upper),
    });
  }
  // connect the CI band to the last actual point so the chart reads continuously
  const joint = data[n - histStart - 1];
  joint.lower = joint.predicted;
  joint.upper = joint.predicted;

  const projectedTotal = future.reduce((s, v) => s + v, 0);
  const prevAvg = mean(values.slice(Math.max(0, n - horizon)));
  const growthRate = prevAvg !== 0 ? (mean(future) / prevAvg - 1) * 100 : 0;

  return {
    modelUsed: chosen,
    modelLabel: MODEL_LABELS[chosen],
    seasonLength: m >= 2 ? m : 0,
    forecastData: data,
    leaderboard,
    seasonalProfile: computeSeasonalProfile(weeks, y, m),
    metrics: {
      mape: row?.mape ?? null,
      rmse: row?.rmse ?? null,
      backtestWeeks: canBacktest ? hb : 0,
      projectedTotal,
      growthRate,
      avgCiWidthPct: widthN ? widthSum / widthN : 0,
      historyWeeks: n,
    },
    notes,
  };
}

export type SegmentRow = { segment: string; actual: number; predicted: number; growth: number };

/** Per-category outlook: sum of the last `horizon` weeks vs the sum of the next `horizon` weeks, using a fixed model. */
export function runSegmentForecasts(
  categories: { name: string; values: number[] }[],
  model: Exclude<ModelId, 'auto'>,
  horizon: number,
  seasonLength: number
): SegmentRow[] {
  const rows: SegmentRow[] = [];
  for (const c of categories) {
    const n = c.values.length;
    if (n < MIN_WEEKS) continue;
    const m = seasonLength >= 2 && n >= 2 * seasonLength ? seasonLength : 0;
    const fit = fitModel(model, c.values, m);
    let future = fit.predict(horizon);
    if (nonNegative(c.values)) future = future.map((v) => Math.max(0, v));
    const actual = c.values.slice(Math.max(0, n - horizon)).reduce((s, v) => s + v, 0);
    const predicted = future.reduce((s, v) => s + v, 0);
    rows.push({
      segment: c.name,
      actual: Math.round(actual),
      predicted: Math.round(predicted),
      growth: actual !== 0 ? Math.round(((predicted / actual - 1) * 100) * 10) / 10 : 0,
    });
  }
  return rows;
}

/** Everything the app stores for a finished run (matches the forecast_runs table). */
export function buildRunPayload(
  series: { weeks: string[]; values: number[]; categories: { name: string; values: number[] }[] },
  opts: ForecastOptions,
  totalRows: number
) {
  const result = runForecast(series.weeks, series.values, opts);
  const segment = runSegmentForecasts(
    series.categories,
    result.modelUsed as Exclude<ModelId, 'auto'>,
    Math.max(1, Math.min(104, Math.round(opts.horizon))),
    result.seasonLength
  );
  return {
    result,
    row: {
      model: result.modelUsed,
      horizon_weeks: Math.round(opts.horizon),
      confidence_level: Math.round(opts.confidence),
      status: 'completed' as const,
      projected_revenue: Math.round(result.metrics.projectedTotal),
      mape: result.metrics.mape !== null ? Math.round(result.metrics.mape * 10) / 10 : null,
      growth_rate: Math.round(result.metrics.growthRate * 10) / 10,
      avg_ci_width: Math.round(result.metrics.avgCiWidthPct * 10) / 10,
      data_coverage: `${totalRows.toLocaleString()} rows`,
      forecast_data: result.forecastData,
      segment_data: segment.length ? segment : null,
      diagnostics: {
        modelLabel: result.modelLabel,
        seasonLength: result.seasonLength,
        backtestWeeks: result.metrics.backtestWeeks,
        historyWeeks: result.metrics.historyWeeks,
        mape: result.metrics.mape,
        rmse: result.metrics.rmse,
        leaderboard: result.leaderboard,
        seasonalProfile: result.seasonalProfile,
        notes: result.notes,
      } as RunDiagnostics,
      completed_at: new Date().toISOString(),
    },
  };
}
