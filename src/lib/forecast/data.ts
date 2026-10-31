/**
 * Data layer: CSV parsing, column detection, validation and weekly aggregation.
 * Self-contained (no imports) so it can be unit-tested with plain Node.
 */

export type ParsedTable = { headers: string[]; rows: string[][]; delimiter: string };
export type DateOrder = 'dmy' | 'mdy';
export type ColumnMapping = { date: number | null; value: number | null; category: number | null };

export type Issue = {
  id: string;
  level: 'error' | 'warning';
  message: string;
  suggestion?: string;
  column?: string;
  count?: number;
};

export type SeriesData = {
  weeks: string[]; // ISO date (Monday) of each week
  values: number[]; // total of the value column per week
  categories: { name: string; values: number[] }[]; // same grid as weeks
  dateColumn: string;
  valueColumn: string;
  categoryColumn: string | null;
};

export type BuildResult = {
  ok: boolean;
  series: SeriesData | null;
  issues: Issue[];
  passed: string[];
  stats: {
    totalRows: number;
    usedRows: number;
    skippedRows: number;
    dateMin: string | null;
    dateMax: string | null;
    weeks: number;
    imputedWeeks: number;
    droppedPartialWeeks: number;
    negativeValues: number;
    categoryCount: number;
  };
};

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.search(/\r?\n/) === -1 ? text.length : text.search(/\r?\n/));
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch]++;
  }
  let best = ',';
  for (const d of Object.keys(counts)) if (counts[d] > counts[best]) best = d;
  return best;
}

export function parseCsv(input: string): ParsedTable {
  const text = input.replace(/^﻿/, '');
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0].trim() !== '') rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0].trim() !== '') rows.push(row);
  }

  const headers = (rows.shift() ?? []).map((h, i) => h.trim() || `column_${i + 1}`);
  return { headers, rows, delimiter };
}

// ---------------------------------------------------------------------------
// Value parsing
// ---------------------------------------------------------------------------

export function parseNumber(raw: string | undefined): number | null {
  if (raw == null) return null;
  let s = raw.trim();
  if (s === '' || s === '-' || /^(n\/?a|null|nan|none)$/i.test(s)) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[^\d.,\-+eE]/g, '');
  if (s === '') return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    // the later separator is the decimal separator
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma !== -1) {
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Returns UTC day number (days since epoch) or null. */
export function parseDateToDay(raw: string | undefined, order: DateOrder): number | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (s === '') return null;

  const toDay = (y: number, m: number, d: number): number | null => {
    if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const t = Date.UTC(y, m - 1, d);
    const dt = new Date(t);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return Math.floor(t / 86400000);
  };

  // ISO: 2024-03-15, 2024/03/15, 2024-03-15T10:00:00
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/);
  if (m) return toDay(+m[1], +m[2], +m[3]);

  // 15/03/2024, 03/15/2024, 15-03-24
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:[T\s].*)?$/);
  if (m) {
    let y = +m[3];
    if (m[3].length === 2) y += y < 70 ? 2000 : 1900;
    const a = +m[1];
    const b = +m[2];
    return order === 'dmy' ? toDay(y, b, a) : toDay(y, a, b);
  }

  // 15 Mar 2024, Mar 15, 2024, 15-Mar-24
  m = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3,9})[\s,-]+(\d{2}|\d{4})$/);
  if (m) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    if (mi >= 0) {
      let y = +m[3];
      if (m[3].length === 2) y += y < 70 ? 2000 : 1900;
      return toDay(y, mi + 1, +m[1]);
    }
  }
  m = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const mi = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    if (mi >= 0) return toDay(+m[3], mi + 1, +m[2]);
  }
  return null;
}

export function dayToIso(day: number): string {
  return new Date(day * 86400000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Column detection
// ---------------------------------------------------------------------------

const SAMPLE = 2000;

function sampleColumn(table: ParsedTable, col: number): string[] {
  const out: string[] = [];
  const step = Math.max(1, Math.floor(table.rows.length / SAMPLE));
  for (let i = 0; i < table.rows.length && out.length < SAMPLE; i += step) {
    const v = table.rows[i][col];
    if (v != null && v.trim() !== '') out.push(v);
  }
  return out;
}

function share(values: string[], test: (v: string) => boolean): number {
  if (values.length === 0) return 0;
  let ok = 0;
  for (const v of values) if (test(v)) ok++;
  return ok / values.length;
}

export function detectDateOrder(table: ParsedTable, col: number): DateOrder {
  let firstOver12 = false;
  let secondOver12 = false;
  for (const v of sampleColumn(table, col)) {
    const m = v.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})/);
    if (!m) continue;
    if (+m[1] > 12) firstOver12 = true;
    if (+m[2] > 12) secondOver12 = true;
  }
  if (secondOver12 && !firstOver12) return 'mdy';
  return 'dmy'; // default to day-first (India / UK style) when ambiguous
}

export function detectColumns(table: ParsedTable): ColumnMapping & { dateOrder: DateOrder } {
  const n = table.headers.length;
  const samples = table.headers.map((_, i) => sampleColumn(table, i));
  const lower = table.headers.map((h) => h.toLowerCase());

  // --- date column
  let date: number | null = null;
  let dateOrder: DateOrder = 'dmy';
  const dateCandidates: { i: number; score: number }[] = [];
  for (let i = 0; i < n; i++) {
    const order = detectDateOrder(table, i);
    const frac = share(samples[i], (v) => parseDateToDay(v, order) != null);
    if (frac >= 0.8) {
      const nameBonus = /date|day|time|period|week|month|dt$/.test(lower[i]) ? 1 : 0;
      dateCandidates.push({ i, score: frac + nameBonus });
    }
  }
  dateCandidates.sort((a, b) => b.score - a.score || a.i - b.i);
  if (dateCandidates.length) {
    date = dateCandidates[0].i;
    dateOrder = detectDateOrder(table, date);
  }

  // --- value column (numeric, prefer revenue-like names)
  const priority = ['revenue', 'sales', 'amount', 'turnover', 'income', 'total', 'value', 'sale', 'quantity', 'units', 'qty', 'demand', 'price'];
  let value: number | null = null;
  let bestScore = -1;
  for (let i = 0; i < n; i++) {
    if (i === date) continue;
    const frac = share(samples[i], (v) => parseNumber(v) != null);
    if (frac < 0.8) continue;
    if (/(^|_|\s)(id|code|zip|pin|phone|index)(\s|_|$)/.test(lower[i])) continue;
    let score = frac;
    const pi = priority.findIndex((p) => lower[i].includes(p));
    if (pi !== -1) score += 2 + (priority.length - pi) * 0.1;
    if (score > bestScore) {
      bestScore = score;
      value = i;
    }
  }

  // --- optional category column
  let category: number | null = null;
  const catNames = ['category', 'segment', 'region', 'product', 'channel', 'type', 'group', 'department', 'store', 'branch', 'state'];
  let bestCat = -1;
  for (let i = 0; i < n; i++) {
    if (i === date || i === value) continue;
    const vals = samples[i];
    if (vals.length === 0) continue;
    if (share(vals, (v) => parseNumber(v) != null) > 0.5) continue;
    const distinct = new Set(vals).size;
    if (distinct < 2 || distinct > 30) continue;
    const ni = catNames.findIndex((p) => lower[i].includes(p));
    if (ni === -1) continue;
    const score = 10 - ni;
    if (score > bestCat) {
      bestCat = score;
      category = i;
    }
  }

  return { date, value, category, dateOrder };
}

// ---------------------------------------------------------------------------
// Validation + weekly aggregation
// ---------------------------------------------------------------------------

/** Monday-based week index (integer) for a UTC day number. */
function weekIndex(day: number): number {
  // 1970-01-01 was a Thursday. Shift so weeks start on Monday.
  return Math.floor((day + 3) / 7);
}
function weekIndexToDay(w: number): number {
  return w * 7 - 3;
}

export function buildSeries(table: ParsedTable, mapping: ColumnMapping, order: DateOrder, maxCategories = 8): BuildResult {
  const issues: Issue[] = [];
  const passed: string[] = [];
  const empty: BuildResult = {
    ok: false,
    series: null,
    issues,
    passed,
    stats: {
      totalRows: table.rows.length,
      usedRows: 0,
      skippedRows: 0,
      dateMin: null,
      dateMax: null,
      weeks: 0,
      imputedWeeks: 0,
      droppedPartialWeeks: 0,
      negativeValues: 0,
      categoryCount: 0,
    },
  };

  if (mapping.date == null) {
    issues.push({ id: 'no-date', level: 'error', message: 'No date column selected', suggestion: 'Pick the column that holds the transaction or order date.' });
  }
  if (mapping.value == null) {
    issues.push({ id: 'no-value', level: 'error', message: 'No sales / revenue column selected', suggestion: 'Pick the numeric column you want to forecast (revenue, sales, units…).' });
  }
  if (mapping.date == null || mapping.value == null) return empty;

  const dcol = mapping.date;
  const vcol = mapping.value;
  const ccol = mapping.category;

  let badDates = 0;
  let badValues = 0;
  let negatives = 0;
  let used = 0;
  const firstBadDate: number[] = [];
  const byWeek = new Map<number, number>();
  const byCat = new Map<string, Map<number, number>>();
  const dayCount = new Map<number, number>(); // distinct days -> for granularity check
  let minDay = Infinity;
  let maxDay = -Infinity;

  for (let r = 0; r < table.rows.length; r++) {
    const row = table.rows[r];
    const day = parseDateToDay(row[dcol], order);
    if (day == null) {
      badDates++;
      if (firstBadDate.length < 3) firstBadDate.push(r + 2);
      continue;
    }
    const v = parseNumber(row[vcol]);
    if (v == null) {
      badValues++;
      continue;
    }
    if (v < 0) negatives++;
    used++;
    if (day < minDay) minDay = day;
    if (day > maxDay) maxDay = day;
    dayCount.set(day, 1);
    const w = weekIndex(day);
    byWeek.set(w, (byWeek.get(w) ?? 0) + v);
    if (ccol != null) {
      const name = (row[ccol] ?? '').trim() || '(blank)';
      let m = byCat.get(name);
      if (!m) {
        m = new Map();
        byCat.set(name, m);
      }
      m.set(w, (m.get(w) ?? 0) + v);
    }
  }

  empty.stats.usedRows = used;
  empty.stats.skippedRows = badDates + badValues;
  empty.stats.negativeValues = negatives;

  if (badDates > 0) {
    issues.push({
      id: 'bad-dates',
      level: badDates / Math.max(1, table.rows.length) > 0.2 ? 'error' : 'warning',
      column: table.headers[dcol],
      count: badDates,
      message: `${badDates.toLocaleString()} row(s) have a date that could not be read and were skipped (first at row ${firstBadDate.join(', ')})`,
      suggestion: `Check the date format — currently reading as ${order === 'dmy' ? 'DD/MM/YYYY' : 'MM/DD/YYYY'}.`,
    });
  }
  if (badValues > 0) {
    issues.push({
      id: 'bad-values',
      level: badValues / Math.max(1, table.rows.length) > 0.2 ? 'error' : 'warning',
      column: table.headers[vcol],
      count: badValues,
      message: `${badValues.toLocaleString()} row(s) have an empty or non-numeric "${table.headers[vcol]}" and were skipped`,
      suggestion: 'Remove text values from this column or choose a different value column.',
    });
  }
  if (negatives > 0) {
    issues.push({
      id: 'negatives',
      level: 'warning',
      column: table.headers[vcol],
      count: negatives,
      message: `${negatives.toLocaleString()} negative value(s) found in "${table.headers[vcol]}" (kept as-is, e.g. returns or credit notes)`,
      suggestion: 'If these are errors, fix them in the file before importing.',
    });
  }

  if (used === 0) {
    issues.push({ id: 'no-rows', level: 'error', message: 'No usable rows after reading dates and values', suggestion: 'Check the selected columns and the date format.' });
    return empty;
  }

  // Granularity check: this version forecasts weekly totals, so data must be at least ~weekly.
  const days = Array.from(dayCount.keys()).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < days.length; i++) gaps.push(days[i] - days[i - 1]);
  gaps.sort((a, b) => a - b);
  const medianGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 1;
  if (medianGap >= 25) {
    issues.push({
      id: 'monthly',
      level: 'error',
      message: `Dates are about ${Math.round(medianGap)} days apart — this looks like monthly data`,
      suggestion: 'This version forecasts weekly totals and needs daily, weekly or transaction-level records.',
    });
    return empty;
  }

  // Build the weekly grid
  let w0 = weekIndex(minDay);
  let w1 = weekIndex(maxDay);
  let dropped = 0;
  // Drop partial first / last week so they don't drag the numbers down
  if (w1 - w0 + 1 >= 12) {
    if (minDay !== weekIndexToDay(w0) && medianGap < 7) {
      w0++;
      dropped++;
    }
    if (maxDay !== weekIndexToDay(w1) + 6 && medianGap < 7) {
      w1--;
      dropped++;
    }
  }
  const nWeeks = w1 - w0 + 1;
  if (nWeeks < 8) {
    issues.push({
      id: 'too-short',
      level: 'error',
      message: `Only ${Math.max(0, nWeeks)} week(s) of history — at least 8 are needed (26+ recommended)`,
      suggestion: 'Upload a longer history so the model can learn trend and seasonality.',
    });
    return empty;
  }

  const weeks: string[] = [];
  const values: number[] = [];
  const present: boolean[] = [];
  for (let w = w0; w <= w1; w++) {
    weeks.push(dayToIso(weekIndexToDay(w)));
    const v = byWeek.get(w);
    present.push(v !== undefined);
    values.push(v ?? 0);
  }

  // Impute fully-missing weeks by linear interpolation between neighbours
  let imputed = 0;
  for (let i = 0; i < nWeeks; i++) {
    if (present[i]) continue;
    let lo = i - 1;
    while (lo >= 0 && !present[lo]) lo--;
    let hi = i + 1;
    while (hi < nWeeks && !present[hi]) hi++;
    if (lo >= 0 && hi < nWeeks) values[i] = values[lo] + ((values[hi] - values[lo]) * (i - lo)) / (hi - lo);
    else values[i] = lo >= 0 ? values[lo] : values[hi];
    imputed++;
  }
  if (imputed > 0) {
    issues.push({
      id: 'gaps',
      level: 'warning',
      count: imputed,
      message: `${imputed} week(s) had no records and were filled by linear interpolation`,
      suggestion: 'If those weeks truly had zero sales, add rows with 0 so they are not smoothed over.',
    });
  }
  if (dropped > 0) {
    issues.push({
      id: 'partial',
      level: 'warning',
      count: dropped,
      message: `${dropped} incomplete edge week(s) were dropped so partial weeks do not bias the forecast`,
    });
  }

  // Categories (top N by total)
  const categories: { name: string; values: number[] }[] = [];
  if (ccol != null && byCat.size > 0) {
    const totals = Array.from(byCat.entries()).map(([name, m]) => {
      let t = 0;
      m.forEach((v) => (t += Math.abs(v)));
      return { name, m, t };
    });
    totals.sort((a, b) => b.t - a.t);
    for (const { name, m } of totals.slice(0, maxCategories)) {
      const arr: number[] = [];
      for (let w = w0; w <= w1; w++) arr.push(m.get(w) ?? 0);
      categories.push({ name, values: arr });
    }
    if (byCat.size > maxCategories) {
      issues.push({
        id: 'many-categories',
        level: 'warning',
        count: byCat.size,
        message: `${byCat.size} categories found — showing the top ${maxCategories} by volume in segment charts`,
      });
    }
  }

  // Passed checks
  passed.push(`${used.toLocaleString()} of ${table.rows.length.toLocaleString()} rows are usable`);
  passed.push(`Date range ${weeks[0]} → ${weeks[weeks.length - 1]} (${nWeeks} weeks)`);
  if (nWeeks >= 104) passed.push('2+ years of history — yearly seasonality can be learned');
  else if (nWeeks >= 26) passed.push('26+ weeks of history — enough for a short seasonal cycle');
  if (imputed === 0) passed.push('No missing weeks in the date range');
  if (categories.length) passed.push(`${byCat.size} categories detected in "${table.headers[ccol as number]}"`);

  empty.ok = true;
  empty.series = {
    weeks,
    values,
    categories,
    dateColumn: table.headers[dcol],
    valueColumn: table.headers[vcol],
    categoryColumn: ccol != null ? table.headers[ccol] : null,
  };
  empty.stats = {
    totalRows: table.rows.length,
    usedRows: used,
    skippedRows: badDates + badValues,
    dateMin: dayToIso(minDay),
    dateMax: dayToIso(maxDay),
    weeks: nWeeks,
    imputedWeeks: imputed,
    droppedPartialWeeks: dropped,
    negativeValues: negatives,
    categoryCount: byCat.size,
  };
  return empty;
}

// ---------------------------------------------------------------------------
// Sample data (synthetic) so anyone can try the app in seconds
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ~3 years of synthetic daily sales with trend, yearly + weekly seasonality, festival spikes and noise. */
export function generateSampleCsv(): string {
  const rand = mulberry32(42);
  const cats = [
    { name: 'Electronics', base: 52000, growth: 0.0012, amp: 0.22 },
    { name: 'Clothing', base: 38000, growth: 0.0007, amp: 0.3 },
    { name: 'Home & Kitchen', base: 26000, growth: 0.0009, amp: 0.15 },
    { name: 'Grocery', base: 31000, growth: 0.0004, amp: 0.08 },
  ];
  const lines = ['date,category,revenue,units'];
  const start = Date.UTC(2023, 0, 2); // Monday
  const days = 3 * 364;
  for (let d = 0; d < days; d++) {
    const t = new Date(start + d * 86400000);
    const dow = (t.getUTCDay() + 6) % 7;
    const doy = d % 364;
    const weekend = dow >= 5 ? 1.18 : dow === 0 ? 0.95 : 1;
    // festival-season bump (Oct–Nov) and a smaller mid-year bump
    const fest = Math.exp(-Math.pow((doy - 300) / 22, 2)) * 0.45 + Math.exp(-Math.pow((doy - 170) / 14, 2)) * 0.12;
    for (const c of cats) {
      const trend = 1 + c.growth * d;
      const season = 1 + c.amp * Math.sin((2 * Math.PI * (doy - 60)) / 364) * 0.5 + fest;
      const noise = 1 + (rand() - 0.5) * 0.18;
      const revenue = Math.max(0, (c.base / 7) * trend * season * weekend * noise);
      const units = Math.max(1, Math.round(revenue / (350 + rand() * 200)));
      lines.push(`${t.toISOString().slice(0, 10)},${c.name},${revenue.toFixed(2)},${units}`);
    }
  }
  return lines.join('\n');
}
