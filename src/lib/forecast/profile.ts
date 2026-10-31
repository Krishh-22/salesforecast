/**
 * Facts about an uploaded weekly series. Pure functions (no imports) so they can be unit-tested with plain Node.
 */

export type ProfileInput = {
  weeks: string[];
  values: number[];
  categories: { name: string; values: number[] }[];
  dateColumn: string;
  valueColumn: string;
  categoryColumn: string | null;
};

export type SeriesProfile = {
  weeks: number;
  first: string;
  last: string;
  total: number;
  mean: number;
  median: number;
  std: number;
  min: { value: number; week: string };
  max: { value: number; week: string };
  zeroWeeks: number;
  outlierWeeks: { week: string; value: number }[];
  /** % change per year implied by the straight-line trend (null if < 26 weeks) */
  trendPerYearPct: number | null;
  categories: { name: string; total: number; sharePct: number }[];
  spark: number[]; // up to 60 points for a sparkline
};

const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

function median(a: number[]): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function profileSeries(s: ProfileInput): SeriesProfile | null {
  const n = s.values.length;
  if (n === 0 || s.weeks.length !== n) return null;
  const mu = mean(s.values);
  const med = median(s.values);
  const variance = mean(s.values.map((v) => (v - mu) * (v - mu)));
  let minI = 0;
  let maxI = 0;
  s.values.forEach((v, i) => {
    if (v < s.values[minI]) minI = i;
    if (v > s.values[maxI]) maxI = i;
  });
  const mad = median(s.values.map((v) => Math.abs(v - med))) * 1.4826;
  const outlierWeeks =
    mad === 0
      ? []
      : s.values
          .map((v, i) => ({ week: s.weeks[i], value: v }))
          .filter((p) => Math.abs(p.value - med) > 4 * mad)
          .slice(0, 10);

  let trendPerYearPct: number | null = null;
  if (n >= 26 && mu !== 0) {
    const tMean = (n - 1) / 2;
    let num = 0;
    let den = 0;
    s.values.forEach((v, t) => {
      num += (t - tMean) * (v - mu);
      den += (t - tMean) * (t - tMean);
    });
    const slope = den === 0 ? 0 : num / den;
    trendPerYearPct = ((slope * 52) / mu) * 100;
  }

  const total = s.values.reduce((a, b) => a + b, 0);
  const catTotals = s.categories.map((c) => ({ name: c.name, total: c.values.reduce((a, b) => a + b, 0) }));
  const catSum = catTotals.reduce((a, c) => a + Math.max(0, c.total), 0);
  const step = Math.max(1, Math.ceil(n / 60));
  const spark = s.values.filter((_, i) => i % step === 0 || i === n - 1);

  return {
    weeks: n,
    first: s.weeks[0],
    last: s.weeks[n - 1],
    total,
    mean: mu,
    median: med,
    std: Math.sqrt(variance),
    min: { value: s.values[minI], week: s.weeks[minI] },
    max: { value: s.values[maxI], week: s.weeks[maxI] },
    zeroWeeks: s.values.filter((v) => v === 0).length,
    outlierWeeks,
    trendPerYearPct,
    categories: catTotals
      .map((c) => ({ ...c, sharePct: catSum > 0 ? (Math.max(0, c.total) / catSum) * 100 : 0 }))
      .sort((a, b) => b.total - a.total),
    spark,
  };
}

export function seriesToCsv(s: ProfileInput): string {
  const cats = s.categories;
  const head = ['week_starting', s.valueColumn, ...cats.map((c) => c.name)];
  const q = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = s.weeks.map((w, i) => [w, String(Math.round(s.values[i] * 100) / 100), ...cats.map((c) => String(Math.round((c.values[i] ?? 0) * 100) / 100))]);
  return [head.map(q).join(','), ...rows.map((r) => r.map(q).join(','))].join('\n');
}
