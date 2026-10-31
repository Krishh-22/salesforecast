# 📈 SalesForecast

A web app that turns a sales CSV into a forecast you can trust: upload your history, the app validates it, trains several
time-series models, **backtests them on recent weeks**, picks the most accurate one and shows the next weeks with a
confidence band.

> Built with Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts and Supabase (auth + Postgres with Row Level Security).

## ✨ What it does

| Feature | Details |
| --- | --- |
| **Real CSV import** | Parses quoted fields, `, ; \| tab` delimiters, `DD/MM/YYYY` and `MM/DD/YYYY` dates, `₹ 1,23,456.50`-style numbers |
| **Auto column detection** | Finds the date, sales and category columns; you can override each one |
| **Honest validation** | Reports unreadable dates, non-numeric values, negatives, missing weeks (interpolated), partial edge weeks, monthly data (rejected) and too-short history |
| **4 forecasting models** | Holt-Winters (damped), Linear trend + seasonality, Seasonal naive, Moving average |
| **Auto model selection** | Each model is backtested on the most recent weeks; the lowest-error model is used. A leaderboard shows all of them |
| **Seasonality detection** | Autocorrelation picks a 4 / 13 / 52-week cycle, or none |
| **Confidence intervals** | Band width comes from the hold-out error and widens with the horizon |
| **Segment outlook** | Per-category actual-vs-forecast bars when a category column exists |
| **Accounts & privacy** | Supabase Auth; every table is protected by Row Level Security so users only see their own data |
| **Try sample data** | One click loads a synthetic 3-year retail dataset |

## 🧠 How the forecast is computed

1. The CSV is aggregated into **weekly totals** (Monday-based weeks). Partial first/last weeks are dropped; empty weeks are
   filled by linear interpolation and reported as a warning.
2. The seasonal cycle is chosen from the autocorrelation of the de-trended series (candidates: 4, 13, 52 weeks).
3. Every model is fitted on all-but-the-last *N* weeks and scored on those *N* weeks (**MAPE** and **RMSE**).
4. The best model is refitted on all the data and projected forward. The interval is `prediction ± z·σ·√(1 + 0.1·h)`, where σ
   is the larger of the hold-out and in-sample RMSE and *h* is the weeks ahead (a pragmatic approximation, not an exact
   statistical interval).

All of this runs in the browser (`src/lib/forecast/`) — there is no separate ML server. The engine has no dependencies and
is covered by Node tests (see below).

## 🚀 Getting started

```bash
git clone https://github.com/Maxx825/salesforecast.git
cd salesforecast
npm install
cp .env.example .env.local     # then fill in your Supabase URL + anon key
npm run dev                    # http://localhost:4028
```

### Database setup (Supabase)

Run the SQL files in `supabase/migrations/` **in order** in the Supabase SQL editor (or with `supabase db push`). The latest
one, `20261030000000_dataset_series.sql`, adds the `series_data` column that stores each dataset's weekly series.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on port 4028 |
| `npm run build` | Production build |
| `npm run start` | Run the production build (after `build`) |
| `npm run type-check` | TypeScript check |
| `npm run lint` | ESLint |

## 📂 Project structure

```
src/
├── app/                    # Next.js routes (dashboard, data-upload, forecast-configuration, …)
├── components/             # Layout + reusable UI
├── contexts/               # Auth, datasets/forecast runs, notifications, theme
└── lib/
    ├── forecast/
    │   ├── data.ts         # CSV parsing, column detection, validation, weekly aggregation, sample data
    │   └── engine.ts       # Models, backtesting, confidence intervals, run payloads
    └── supabase/           # Browser/server Supabase clients
supabase/migrations/        # Tables, Row Level Security, series storage
```

## ⚠️ Current limitations

- CSV only (Excel files must be saved as CSV first).
- Forecasts weekly totals — monthly-only data is rejected with an explanation.
- Models are classical statistical methods; they do not use external signals (holidays, promotions, price changes).
- The Forecast Analysis, Reports & Export, Data Management, Workspace Admin and Help pages are still UI prototypes with
  static content.

## 🗺️ Roadmap

- Excel import, monthly granularity
- Festival / promotion calendar features (Diwali, Eid, sales events)
- What-if scenarios (price / discount sliders)
- PDF / Excel report export
- Python (FastAPI) service for Prophet / gradient-boosting models
- Automated tests and CI

## 📝 License

MIT
