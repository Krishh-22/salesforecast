import { parseCsv, detectColumns, buildSeries, generateSampleCsv, parseNumber, parseDateToDay } from '../src/lib/forecast/data.ts';
import { runForecast, buildRunPayload, zScore, computeSeasonalProfile } from '../src/lib/forecast/engine.ts';

let fail = 0;
const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };

// --- unit: parsing
ok(parseNumber('₹1,23,456.50') === 123456.5, 'indian-style number');
ok(parseNumber('(1,200)') === -1200, 'parentheses negative');
ok(parseNumber('1.234,50') === 1234.5, 'european number');
ok(parseNumber('abc') === null, 'non-numeric -> null');
ok(parseDateToDay('15/03/2024', 'dmy') === parseDateToDay('2024-03-15', 'dmy'), 'dmy == iso');
ok(parseDateToDay('31/02/2024', 'dmy') === null, 'invalid date rejected');
ok(Math.abs(zScore(95) - 1.96) < 0.01 && Math.abs(zScore(80) - 1.2816) < 0.01, 'z-scores');

// --- quoted CSV
const q = parseCsv('date,"name, full",revenue\r\n2024-01-01,"A ""x"" B",10\r\n2024-01-02,C,20\r\n');
ok(q.headers.length === 3 && q.rows.length === 2 && q.rows[0][1] === 'A "x" B', 'quoted csv parse');

// --- sample data end to end
const t0 = Date.now();
const csv = generateSampleCsv();
const table = parseCsv(csv);
const det = detectColumns(table);
console.log('detected', table.headers[det.date!], table.headers[det.value!], det.category != null ? table.headers[det.category] : null, det.dateOrder);
ok(table.headers[det.date!] === 'date' && table.headers[det.value!] === 'revenue' && table.headers[det.category!] === 'category', 'column detection on sample');
const built = buildSeries(table, det, det.dateOrder);
console.log('stats', built.stats, built.issues.map(i => i.message));
ok(built.ok && built.series!.weeks.length > 150, 'series built');
ok(built.series!.categories.length === 4, '4 categories');
const s = built.series!;
for (const model of ['auto', 'holt_winters', 'linear_seasonal', 'seasonal_naive', 'moving_avg'] as const) {
  const r = runForecast(s.weeks, s.values, { model, horizon: 12, confidence: 80 });
  console.log(model.padEnd(16), '->', r.modelUsed.padEnd(16), 'season', r.seasonLength, 'MAPE', r.metrics.mape?.toFixed(1), 'growth', r.metrics.growthRate.toFixed(1), 'ci±', r.metrics.avgCiWidthPct.toFixed(1));
}
const auto = runForecast(s.weeks, s.values, { model: 'auto', horizon: 12, confidence: 80 });
console.log('leaderboard', auto.leaderboard.map(l => `${l.model}:${l.mape?.toFixed(1)}`).join('  '));
console.log(auto.notes);
const best = Math.min(...auto.leaderboard.map(l => l.mape ?? 1e9));
ok(auto.metrics.mape !== null && auto.metrics.mape === best, 'auto picks lowest-MAPE model');
ok(auto.metrics.mape! < 25, 'auto MAPE sane (<25%) on seasonal synthetic data: ' + auto.metrics.mape?.toFixed(1));
const fut = auto.forecastData.filter(p => p.actual === null);
ok(fut.length === 12 && fut.every(p => p.lower! <= p.predicted && p.predicted <= p.upper!), '12 future points with lower<=pred<=upper');
const w95 = runForecast(s.weeks, s.values, { model: 'auto', horizon: 12, confidence: 95 });
ok(w95.metrics.avgCiWidthPct > auto.metrics.avgCiWidthPct, '95% CI wider than 80%');
const payload = buildRunPayload(s, { model: 'auto', horizon: 12, confidence: 80 }, built.stats.usedRows);
ok(payload.row.segment_data !== null && payload.row.segment_data.length === 4, 'segment data for 4 categories');
console.log('segment', payload.row.segment_data);
console.log('payload', { ...payload.row, forecast_data: `[${payload.row.forecast_data.length} pts]`, segment_data: '...' });
console.log('elapsed ms', Date.now() - t0);

// --- a series with a KNOWN pattern: forecast should follow it
const weeks: string[] = []; const vals: number[] = [];
for (let i = 0; i < 120; i++) { const d = new Date(Date.UTC(2022, 0, 3) + i * 7 * 86400000); weeks.push(d.toISOString().slice(0, 10)); vals.push(1000 + 10 * i + 200 * Math.sin(2 * Math.PI * i / 13)); }
const known = runForecast(weeks, vals, { model: 'auto', horizon: 13, confidence: 80 });
const truth = Array.from({ length: 13 }, (_, k) => 1000 + 10 * (120 + k) + 200 * Math.sin(2 * Math.PI * (120 + k) / 13));
let err = 0; const f = known.forecastData.filter(p => p.actual === null);
for (let k = 0; k < 13; k++) err += Math.abs(f[k].predicted - truth[k]) / truth[k];
ok(known.seasonLength === 13, 'detects 13-week season');
ok(err / 13 * 100 < 3, 'known-pattern forecast error < 3%: ' + (err / 13 * 100).toFixed(2) + '% via ' + known.modelUsed);


// --- diagnostics stored with each run
const diag = payload.row.diagnostics;
ok(diag.leaderboard.length === 4 && diag.modelLabel === auto.modelLabel, 'diagnostics carry leaderboard + model label');
ok(diag.seasonalProfile.length === 52 && diag.seasonLength === 52, 'seasonal profile has one point per week of the 52-week cycle');
const sp = diag.seasonalProfile.map((p: any) => p.effect);
ok(Math.abs(sp.reduce((a: number, b: number) => a + b, 0)) <= 52, 'seasonal effects are centred on zero');
const festPeak = diag.seasonalProfile.reduce((a: any, b: any) => (b.effect > a.effect ? b : a));
console.log('seasonal peak at', festPeak.label, '(+' + festPeak.effect + ') — sample data has a festival bump around Oct/Nov');
ok(/Oct|Nov|Sep/.test(festPeak.label), 'seasonal peak lands in the festival season (Sep-Nov)');
ok(computeSeasonalProfile(weeks.slice(0, 20), vals.slice(0, 20), 13).length === 0, 'no profile without 2 full cycles');
ok(JSON.stringify(payload.row).length < 200000, 'stored payload stays small (' + JSON.stringify(payload.row).length + ' bytes)');

// --- edge cases
const mon = parseCsv('date,sales\n2024-01-01,10\n2024-02-01,12\n2024-03-01,14\n2024-04-01,13\n2024-05-01,15\n2024-06-01,16\n2024-07-01,15\n2024-08-01,17\n2024-09-01,18\n2024-10-01,17\n2024-11-01,19\n2024-12-01,20');
const mb = buildSeries(mon, detectColumns(mon), 'dmy');
ok(!mb.ok && mb.issues.some(i => i.id === 'monthly'), 'monthly data rejected with clear message');
const shortT = parseCsv('date,sales\n2024-01-01,10\n2024-01-02,12\n2024-01-03,14');
ok(!buildSeries(shortT, detectColumns(shortT), 'dmy').ok, 'too-short data rejected');
let threw = false; try { runForecast(['2024-01-01'], [1], { model: 'auto', horizon: 4, confidence: 80 }); } catch { threw = true; }
ok(threw, 'engine throws on <8 weeks');
const zeros = runForecast(weeks.slice(0, 30), new Array(30).fill(0), { model: 'auto', horizon: 4, confidence: 80 });
ok(zeros.forecastData.every(p => Number.isFinite(p.predicted)), 'all-zero series -> finite output');
console.log(fail === 0 ? '\nALL PASSED' : `\n${fail} FAILED`);
process.exit(fail ? 1 : 0);
