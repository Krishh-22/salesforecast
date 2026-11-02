# 📈 SalesForecast

A web app that turns a sales CSV into a forecast you can trust: upload your history, the app validates it, trains several
time-series models, **backtests them on recent weeks**, picks the most accurate one and shows the next weeks with a
confidence range. Every number on screen is computed from the data you upload.

> Built with Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts and Supabase (auth + Postgres with Row Level Security).

## ✨ What it does

| Area | What you get |
| --- | --- |
| **Data Upload** | Real CSV parsing (quoted fields, `, ; \| tab` delimiters, `DD/MM/YYYY` or `MM/DD/YYYY`, `₹ 1,23,456.50`-style numbers). Columns are auto-detected and can be changed. A "Try sample data" button loads a synthetic 3-year retail dataset |
| **Validation** | Reports unreadable dates, non-numeric values, negatives, missing weeks (interpolated), partial edge weeks, monthly-only data (rejected) and too-short history |
| **Forecasting** | Holt-Winters (damped), Linear trend + seasonality, Seasonal naive, Moving average — or **Auto**, which backtests all four and keeps the most accurate |
| **Seasonality** | Detects a 4 / 13 / 52-week cycle from autocorrelation, or you choose one |
| **Confidence range** | Band width comes from the hold-out error and widens with the horizon |
| **Dashboard** | Projected sales, growth, backtest error, range width, actual-vs-predicted chart, segment chart and **insights** (low accuracy, high uncertainty, decline, slowing segment) |
| **Forecast Analysis** | Model leaderboard (MAPE / RMSE), segment outlook, in-sample residuals, detected seasonal pattern, CSV export of the chart data |
| **Reports & Export** | Downloadable HTML report (print to PDF), forecast-data CSV and segment CSV, with a saved export history |
| **Data Management** | Dataset list, factual profile (trend, best/worst weeks, unusual weeks, category shares), weekly-data CSV download, delete |
| **Settings** | Default horizon, confidence range, model, seasonality and outlier handling, used to pre-fill new forecasts |
| **Accounts & privacy** | Supabase Auth; every table is protected by Row Level Security so users only see their own data |

## 🧠 How the forecast is computed

1. The CSV is aggregated into **weekly totals** (Monday-based weeks). Partial first/last weeks are dropped; empty weeks are
   filled by linear interpolation and reported as a warning.
2. The seasonal cycle is chosen from the autocorrelation of the de-trended series (candidates: 4, 13, 52 weeks).
3. Every model is fitted on all-but-the-last *N* weeks and scored on those *N* weeks (**MAPE** and **RMSE**).
4. The best model is refitted on all the data and projected forward. The range is `prediction ± z·σ·√(1 + 0.1·h)`, where σ
   is the larger of the hold-out and in-sample RMSE and *h* is the weeks ahead (a pragmatic approximation, not an exact
   statistical interval).

All of this runs in the browser (`src/lib/forecast/`) — there is no separate ML server. The engine has no dependencies and
is covered by Node tests.

## 🚀 Getting started

```bash
git clone https://github.com/Krishh-22/salesforecast.git
cd salesforecast
npm install
cp .env.example .env.local     # then fill in your Supabase URL + anon key
npm run dev                    # http://localhost:4028
```

### Database setup (Supabase)

Run the SQL files in `supabase/migrations/` **in order** in the Supabase SQL editor (or with `supabase db push`). The latest
one, `20261030000000_dataset_series.sql`, adds `datasets.series_data` (each dataset's weekly series) and
`forecast_runs.diagnostics` (leaderboard, seasonal profile). It is safe to run more than once.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on port 4028 |
| `npm run build` | Production build |
| `npm run start` | Run the production build (after `build`) |
| `npm test` | Unit tests for the forecasting engine, reports, profiling and settings (Node 22.6+) |
| `npm run type-check` | TypeScript check |
| `npm run lint` | ESLint |

GitHub Actions (`.github/workflows/ci.yml`) runs the tests, type-check and build on every push.

## 📂 Project structure

```
src/
├── app/                    # Next.js routes (dashboard, data-upload, forecast-configuration, forecast-analysis, reports-export, …)
├── components/             # Layout + reusable UI
├── contexts/               # Auth, datasets/forecast runs, notifications, theme
└── lib/
    ├── forecast/
    │   ├── data.ts         # CSV parsing, column detection, validation, weekly aggregation, sample data
    │   ├── engine.ts       # Models, backtesting, confidence ranges, run payloads, diagnostics
    │   ├── report.ts       # HTML/CSV report builders and dashboard insights
    │   └── profile.ts      # Dataset statistics
    ├── settings.ts         # Saved forecast defaults
    └── supabase/           # Browser/server Supabase clients
supabase/migrations/        # Tables, Row Level Security, series + diagnostics storage
tests/                      # Node tests for the pure logic
```

## ⚠️ Limitations

- CSV only (save Excel files as CSV first) and weekly totals only — monthly-only data is rejected with an explanation.
- Amounts are shown in Indian rupees (₹, K / L / Cr). Classical statistical models; they use only past sales, not holidays, promotions or price changes.
- The confidence range is an approximation.
- Reports are generated in the browser (print the HTML report to get a PDF); scheduled exports, e-mail notifications and
  team workspaces need a server and are not implemented.
- Export history and saved defaults live in the browser's local storage.

## 🗺️ Roadmap

- Excel import and monthly granularity
- Festival / promotion calendar features (Diwali, Eid, sales events)
- What-if scenarios (price / discount sliders)
- Python (FastAPI) service for Prophet / gradient-boosting models
- Team workspaces with shared datasets
- Scheduled report e-mails
