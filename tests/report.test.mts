import { generateSampleCsv, parseCsv, detectColumns, buildSeries } from '../src/lib/forecast/data.ts';
import { buildRunPayload } from '../src/lib/forecast/engine.ts';
import { buildForecastCsv, buildSegmentCsv, buildReportHtml, deriveInsights, esc, money } from '../src/lib/forecast/report.ts';

let fail = 0;
const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };

const t = parseCsv(generateSampleCsv());
const det = detectColumns(t);
const b = buildSeries(t, det, det.dateOrder);
const { row } = buildRunPayload(b.series!, { model: 'auto', horizon: 12, confidence: 80 }, b.stats.usedRows);
const run = { runName: 'Q4 <script>alert(1)</script> plan', model: row.model, horizonWeeks: 12, confidenceLevel: 80, projectedRevenue: row.projected_revenue,
  mape: row.mape, growthRate: row.growth_rate, avgCiWidth: row.avg_ci_width, dataCoverage: row.data_coverage, createdAt: row.completed_at,
  forecastData: row.forecast_data, segmentData: row.segment_data, diagnostics: row.diagnostics } as any;

const csv = buildForecastCsv(run).split('\n');
ok(csv[0] === 'week_starting,type,actual,predicted,lower_80pct,upper_80pct', 'forecast csv header');
ok(csv.length === run.forecastData.length + 1, 'forecast csv has one row per point');
ok(csv.filter(l => l.includes(',forecast,')).length === 12, 'exactly 12 forecast rows labelled');
ok(buildSegmentCsv(run).split('\n').length === 5, 'segment csv has 4 segments + header');

const evil = { ...run, segmentData: [{ segment: '=HYPERLINK("http://x")', actual: 1, predicted: 2, growth: 100 }] };
ok(buildSegmentCsv(evil).split('\n')[1].startsWith("\"'=HYPERLINK") || buildSegmentCsv(evil).split('\n')[1].startsWith("'=HYPERLINK"), 'csv formula injection neutralised');

const html = buildReportHtml(run);
ok(html.startsWith('<!doctype html>') && html.includes('<svg') && html.includes('Model comparison'), 'html has chart + leaderboard');
ok(!html.includes('<script>alert(1)</script>') && html.includes('&lt;script&gt;'), 'run name is HTML-escaped (no script injection)');
ok((html.match(/<path /g) ?? []).length === 2 && html.includes('<polygon'), 'chart draws two lines and a confidence band');
ok(!/NaN|undefined|Infinity/.test(html), 'no NaN/undefined/Infinity leaked into the report');
console.log('report size', html.length, 'bytes');

ok(esc(`<a href="x">&'`) === '&lt;a href=&quot;x&quot;&gt;&amp;&#39;', 'esc()');
ok(money(12345678) === '₹1.23 Cr' && money(1234567) === '₹12.35 L' && money(-2500) === '-₹2.5K' && money(12) === '₹12', 'money()');

// insights
ok(deriveInsights(null).length === 0, 'no insights without a run');
const bad = deriveInsights({ ...run, mape: 40, avgCiWidth: 55, growthRate: -18, segmentData: [{ segment: 'A', actual: 100, predicted: 70, growth: -30 }, { segment: 'B', actual: 100, predicted: 105, growth: 5 }] });
ok(bad.filter(i => i.level === 'warning').length === 4, 'bad run raises 4 warnings: ' + bad.map(i => i.title).join(' | '));
const good = deriveInsights({ ...run, mape: 4.2, avgCiWidth: 8, growthRate: 2, segmentData: null, diagnostics: { ...run.diagnostics, notes: [] } });
ok(good.length === 1 && good[0].level === 'success', 'good run -> single success insight');
ok(deriveInsights({ ...run, mape: null }).some(i => /not measured/i.test(i.title)), 'null MAPE explained');

// empty run must not crash
const empty = { ...run, forecastData: null, segmentData: null, diagnostics: null, mape: null, growthRate: null, projectedRevenue: null, avgCiWidth: null };
let threw = false; try { buildReportHtml(empty); buildForecastCsv(empty); buildSegmentCsv(empty); } catch { threw = true; }
ok(!threw, 'empty run does not crash any builder');
console.log(fail === 0 ? '\nALL PASSED' : `\n${fail} FAILED`);
process.exit(fail ? 1 : 0);
