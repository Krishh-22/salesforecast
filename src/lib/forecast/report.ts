/**
 * Report + insight builders. Pure functions (no imports) so they can be unit-tested with plain Node.
 */

type Point = { week: string; isoDate?: string; actual: number | null; predicted: number; lower: number | null; upper: number | null };
type SegmentRow = { segment: string; actual: number; predicted: number; growth: number };
type LeaderRow = { label: string; mape: number | null; rmse: number | null };

export type ReportRun = {
  runName: string;
  model: string;
  horizonWeeks: number;
  confidenceLevel: number;
  projectedRevenue: number | null;
  mape: number | null;
  growthRate: number | null;
  avgCiWidth: number | null;
  dataCoverage: string | null;
  createdAt: string;
  forecastData: Point[] | null;
  segmentData: SegmentRow[] | null;
  diagnostics: {
    modelLabel: string;
    seasonLength: number;
    backtestWeeks: number;
    historyWeeks: number;
    leaderboard: LeaderRow[];
    notes: string[];
  } | null;
};

export type Insight = { level: 'warning' | 'info' | 'success'; title: string; message: string };

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function money(v: number): string {
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (a >= 1_000_000_000) return `${sign}$${(a / 1_000_000_000).toFixed(2)}B`;
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${sign}$${(a / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(a)}`;
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  // Neutralise spreadsheet formula injection for text cells that start with = + - @
  const safe = typeof v === 'string' && /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function toCsv(header: string[], rows: unknown[][]): string {
  return [header.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n');
}

export function buildForecastCsv(run: ReportRun): string {
  // rows without an actual value are future (forecast) weeks
  const rows = (run.forecastData ?? []).map((p) => [
    p.isoDate ?? p.week,
    p.actual == null ? 'forecast' : 'history',
    p.actual,
    p.predicted,
    p.lower,
    p.upper,
  ]);
  return toCsv(['week_starting', 'type', 'actual', 'predicted', `lower_${run.confidenceLevel}pct`, `upper_${run.confidenceLevel}pct`], rows);
}

export function buildSegmentCsv(run: ReportRun): string {
  return toCsv(
    ['segment', `last_${run.horizonWeeks}_weeks`, `forecast_next_${run.horizonWeeks}_weeks`, 'change_pct'],
    (run.segmentData ?? []).map((s) => [s.segment, s.actual, s.predicted, s.growth])
  );
}

// ---------------------------------------------------------------------------
// insights shown on the dashboard
// ---------------------------------------------------------------------------

export function deriveInsights(run: ReportRun | null): Insight[] {
  if (!run) return [];
  const out: Insight[] = [];
  if (run.mape != null) {
    if (run.mape > 25)
      out.push({
        level: 'warning',
        title: 'Low forecast accuracy',
        message: `The best model still missed by ${run.mape.toFixed(1)}% on the hold-out weeks. Treat this forecast as a rough guide, and check for one-off events or missing data.`,
      });
    else if (run.mape <= 10)
      out.push({
        level: 'success',
        title: 'Strong backtest accuracy',
        message: `Hold-out error was only ${run.mape.toFixed(1)}% (MAPE), so the model followed recent weeks closely.`,
      });
  } else {
    out.push({
      level: 'info',
      title: 'Accuracy not measured',
      message: 'There was not enough history to hold weeks out. Upload 6+ months of data to get a measured error.',
    });
  }
  if (run.avgCiWidth != null && run.avgCiWidth > 30)
    out.push({
      level: 'warning',
      title: 'High uncertainty',
      message: `The ${run.confidenceLevel}% range is about ±${run.avgCiWidth.toFixed(0)}% around the forecast — plan for a wide spread of outcomes.`,
    });
  if (run.growthRate != null) {
    if (run.growthRate <= -10)
      out.push({
        level: 'warning',
        title: 'Forecast shows a decline',
        message: `Average weekly sales are projected ${Math.abs(run.growthRate).toFixed(1)}% below the previous ${run.horizonWeeks} weeks.`,
      });
    else if (run.growthRate >= 10)
      out.push({
        level: 'info',
        title: 'Strong growth expected',
        message: `Average weekly sales are projected ${run.growthRate.toFixed(1)}% above the previous ${run.horizonWeeks} weeks — check stock and capacity.`,
      });
  }
  const seg = (run.segmentData ?? []).filter((s) => s.actual > 0);
  if (seg.length > 1) {
    const worst = [...seg].sort((a, b) => a.growth - b.growth)[0];
    if (worst.growth <= -10)
      out.push({
        level: 'warning',
        title: `${worst.segment} is slowing`,
        message: `${worst.segment} is forecast ${Math.abs(worst.growth).toFixed(1)}% lower than the last ${run.horizonWeeks} weeks.`,
      });
  }
  for (const n of run.diagnostics?.notes ?? []) {
    if (/switched off|too short|clipped/i.test(n)) out.push({ level: 'info', title: 'Model note', message: n });
  }
  return out;
}

// ---------------------------------------------------------------------------
// HTML report (self-contained; print to PDF from the browser)
// ---------------------------------------------------------------------------

function svgChart(points: Point[]): string {
  const W = 760;
  const H = 260;
  const pad = { l: 56, r: 12, t: 12, b: 28 };
  if (!points.length) return '';
  const vals: number[] = [];
  for (const p of points) {
    vals.push(p.predicted);
    if (p.actual != null) vals.push(p.actual);
    if (p.lower != null) vals.push(p.lower);
    if (p.upper != null) vals.push(p.upper);
  }
  const min = Math.min(0, ...vals);
  const max = Math.max(...vals) * 1.05 || 1;
  const x = (i: number) => pad.l + (i / Math.max(1, points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const line = (get: (p: Point) => number | null) => {
    let d = '';
    let pen = false;
    points.forEach((p, i) => {
      const v = get(p);
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };
  const bandIdx = points.map((p, i) => (p.lower != null && p.upper != null ? i : -1)).filter((i) => i >= 0);
  let band = '';
  if (bandIdx.length > 1) {
    const up = bandIdx.map((i) => `${x(i).toFixed(1)},${y(points[i].upper as number).toFixed(1)}`);
    const lo = [...bandIdx].reverse().map((i) => `${x(i).toFixed(1)},${y(points[i].lower as number).toFixed(1)}`);
    band = `<polygon points="${[...up, ...lo].join(' ')}" fill="#3b6fd4" opacity="0.18"/>`;
  }
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const v = min + (max - min) * t;
    return `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#e5e7eb"/><text x="${pad.l - 6}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#6b7280">${esc(money(v))}</text>`;
  });
  const firstFuture = points.findIndex((p) => p.actual == null);
  const divider =
    firstFuture > 0
      ? `<line x1="${x(firstFuture - 1).toFixed(1)}" x2="${x(firstFuture - 1).toFixed(1)}" y1="${pad.t}" y2="${H - pad.b}" stroke="#9ca3af" stroke-dasharray="4 3"/><text x="${(x(firstFuture - 1) + 4).toFixed(1)}" y="${pad.t + 10}" font-size="10" fill="#6b7280">Forecast →</text>`
      : '';
  const xl = (i: number) => {
    const anchor = i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle';
    return `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="${anchor}" font-size="10" fill="#6b7280">${esc(points[i].week)}</text>`;
  };
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Actual versus predicted weekly sales">
${ticks.join('\n')}${band}${divider}
<path d="${line((p) => p.predicted)}" fill="none" stroke="#3b6fd4" stroke-width="2" stroke-dasharray="5 3"/>
<path d="${line((p) => p.actual)}" fill="none" stroke="#111827" stroke-width="2"/>
${xl(0)}${xl(Math.floor(points.length / 2))}${xl(points.length - 1)}
</svg>`;
}

export function buildReportHtml(run: ReportRun): string {
  const d = run.diagnostics;
  const modelLabel = d?.modelLabel ?? run.model;
  const insights = deriveInsights(run);
  const kpi = (label: string, value: string, sub = '') =>
    `<div class="kpi"><div class="kl">${esc(label)}</div><div class="kv">${esc(value)}</div><div class="ks">${esc(sub)}</div></div>`;
  const board = [...(d?.leaderboard ?? [])].sort((a, b) => (a.mape ?? Infinity) - (b.mape ?? Infinity));
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(run.runName)} — Sales Forecast Report</title>
<style>
 body{font:14px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;max-width:820px;margin:32px auto;padding:0 20px}
 h1{font-size:24px;margin:0 0 4px} h2{font-size:16px;margin:28px 0 8px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
 .sub{color:#6b7280;font-size:13px} .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px}
 .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:12px}.kl{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280}
 .kv{font-size:22px;font-weight:700;margin-top:2px}.ks{font-size:11px;color:#6b7280}
 table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb}th{background:#f9fafb;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280}
 td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}.w{color:#b45309}.p{color:#047857}
 ul{padding-left:18px;margin:6px 0}.foot{margin-top:32px;color:#6b7280;font-size:12px}
 @media print{body{margin:0}.noprint{display:none}} @media(max-width:640px){.kpis{grid-template-columns:repeat(2,1fr)}}
</style></head><body>
<button class="noprint" onclick="window.print()" style="float:right;padding:6px 12px">Print / Save as PDF</button>
<h1>${esc(run.runName)}</h1>
<div class="sub">Generated ${esc(new Date().toLocaleString())} · Model: ${esc(modelLabel)} · ${esc(run.horizonWeeks)}-week horizon · ${esc(run.confidenceLevel)}% interval${run.dataCoverage ? ` · ${esc(run.dataCoverage)}` : ''}</div>
<div class="kpis">
${kpi(`Projected sales — next ${run.horizonWeeks} wks`, run.projectedRevenue != null ? money(run.projectedRevenue) : '—')}
${kpi('Projected growth', run.growthRate != null ? `${run.growthRate >= 0 ? '+' : ''}${run.growthRate.toFixed(1)}%` : '—', `vs previous ${run.horizonWeeks} weeks`)}
${kpi('Backtest error (MAPE)', run.mape != null ? `${run.mape.toFixed(1)}%` : 'n/a', d?.backtestWeeks ? `last ${d.backtestWeeks} weeks held out` : 'history too short')}
${kpi('Forecast range', run.avgCiWidth != null ? `±${run.avgCiWidth.toFixed(1)}%` : '—', `${run.confidenceLevel}% interval`)}
</div>
<h2>Actual vs predicted</h2>
${svgChart(run.forecastData ?? [])}
${
  insights.length
    ? `<h2>Key takeaways</h2><ul>${insights.map((i) => `<li class="${i.level === 'warning' ? 'w' : i.level === 'success' ? 'p' : ''}"><strong>${esc(i.title)}.</strong> ${esc(i.message)}</li>`).join('')}</ul>`
    : ''
}
${
  board.length
    ? `<h2>Model comparison (backtest)</h2><table><thead><tr><th>Model</th><th class="n">MAPE</th><th class="n">RMSE</th><th></th></tr></thead><tbody>${board
        .map(
          (r) =>
            `<tr><td>${esc(r.label)}</td><td class="n">${r.mape != null ? r.mape.toFixed(1) + '%' : '—'}</td><td class="n">${r.rmse != null ? esc(money(r.rmse)) : '—'}</td><td>${r.label === modelLabel ? '✓ used' : ''}</td></tr>`
        )
        .join('')}</tbody></table>`
    : ''
}
${
  (run.segmentData ?? []).length
    ? `<h2>Segment outlook</h2><table><thead><tr><th>Segment</th><th class="n">Last ${esc(run.horizonWeeks)} wks</th><th class="n">Forecast next ${esc(run.horizonWeeks)} wks</th><th class="n">Change</th></tr></thead><tbody>${(run.segmentData ?? [])
        .map(
          (s) =>
            `<tr><td>${esc(s.segment)}</td><td class="n">${esc(money(s.actual))}</td><td class="n">${esc(money(s.predicted))}</td><td class="n ${s.growth < 0 ? 'w' : 'p'}">${s.growth >= 0 ? '+' : ''}${s.growth.toFixed(1)}%</td></tr>`
        )
        .join('')}</tbody></table>`
    : ''
}
${(d?.notes ?? []).length ? `<h2>Method notes</h2><ul>${(d?.notes ?? []).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
<p class="foot">Forecasts are statistical estimates from past sales and do not account for events outside the data (promotions, price changes, supply issues). The range shown is approximate.</p>
</body></html>`;
}
