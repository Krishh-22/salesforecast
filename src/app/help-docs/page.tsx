'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { BookOpen, Upload, TrendingUp, FileBarChart, ChevronDown, ChevronUp, Search,  } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How do I upload my sales data?',
    answer:
      'Open Data Upload in the sidebar, then drag a CSV file onto the upload area (or click to browse). The app reads the file, detects your date, sales and category columns, and shows what it found. You can change any column, check the validation messages, and then confirm the import. No file handy? Click "Try sample data".',
  },
  {
    question: 'What file formats are supported?',
    answer:
      'CSV files up to 50 MB. In Excel, use File → Save As → CSV first. The file needs a date column and a numeric sales/revenue column. A category column (region, product, channel…) is optional and powers the segment chart. Daily, weekly or one-row-per-transaction data all work; monthly-only data is not supported yet.',
  },
  {
    question: 'How much history do I need?',
    answer:
      'At least 8 weeks, but 26+ weeks is recommended. With about 2 years of history the app can learn a yearly seasonal pattern (for example a festival-season peak). With less history it falls back to shorter cycles or a trend-only forecast and tells you so.',
  },
  {
    question: 'How do I generate a forecast?',
    answer:
      'Go to Forecast Configuration, pick a dataset, set the horizon (weeks ahead) and confidence range, and choose a model. "Auto" tests every model on recent weeks and keeps the most accurate one. Click Run Forecast; results appear on the Dashboard and in Forecast Analysis. Your preferred defaults can be saved in Settings.',
  },
  {
    question: 'Which models are used?',
    answer:
      'Holt-Winters (level, damped trend and seasonality), Linear Trend + Seasonality, Seasonal Naive (repeat the same week from the last cycle) and a 4-week Moving Average as a baseline. They are classical statistical methods that run in your browser.',
  },
  {
    question: 'What do the accuracy metrics mean?',
    answer:
      'The app holds back the most recent weeks, trains on the rest, and compares the prediction with what really happened. MAPE is the average percentage error (lower is better; under 10% is strong, over 25% is rough). RMSE is the typical size of the error in sales units and punishes big misses more. These are measured on your own data, not claimed in advance.',
  },
  {
    question: 'What is the shaded band on the chart?',
    answer:
      'It is the confidence range: the zone where actual sales are expected to land at the chosen level (80% by default). It is estimated from how far the model missed on the held-out weeks and widens further into the future. It is an approximation, not a guarantee.',
  },
  {
    question: 'How do I export a report?',
    answer:
      'Open Reports & Export, choose a forecast run, and download the Forecast Report (an HTML page — open it and use Print / Save as PDF), the Forecast Data CSV, or the Segment Outlook CSV. A list of your downloads is kept in this browser.',
  },
  {
    question: 'Why is my forecast showing no data?',
    answer:
      'Forecasts need an uploaded dataset. Upload one in Data Upload, then run a forecast. Datasets uploaded before the importer was upgraded have no stored weekly data and need to be uploaded again.',
  },
];

const guides = [
  {
    icon: Upload,
    title: 'Getting Started: Upload Data',
    description: 'Learn how to prepare and upload your sales data for the first time.',
    steps: [
      'Go to Data Upload in the left sidebar.',
      'Drag and drop your CSV file onto the upload area.',
      'Check the detected columns (Date, Sales, optional Category).',
      'Review the validation summary and fix any errors.',
      'Click Import to save the dataset.',
    ],
  },
  {
    icon: TrendingUp,
    title: 'Running Your First Forecast',
    description: 'Configure and execute a sales forecast in minutes.',
    steps: [
      'Navigate to Forecast Configuration.',
      'Select the dataset you uploaded.',
      'Set the forecast horizon (e.g. 12 weeks).',
      'Choose Auto (best of all) or pick a model manually.',
      'Click Run Forecast and wait for results.',
    ],
  },
  {
    icon: FileBarChart,
    title: 'Exporting Reports',
    description: 'Download reports and data from any forecast run.',
    steps: [
      'Open Reports & Export from the sidebar.',
      'Choose the forecast run you want to report on.',
      'Download the Forecast Report, Forecast Data CSV or Segment Outlook CSV.',
      'For a PDF, open the report and click Print / Save as PDF.',
      'Find earlier downloads in Export History.',
    ],
  },
];

export default function HelpDocsPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout title="Help" subtitle="Guides and answers">
      <div className="p-6 max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--primary-bg)' }}
            >
              <BookOpen size={20} style={{ color: 'var(--primary)' }} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Help & Documentation</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Everything you need to get the most out of SalesForecast.
          </p>
        </div>

        {/* Quick Start Guides */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4">Quick Start Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {guides.map((guide) => {
              const GuideIcon = guide.icon;
              return (
                <div
                  key={guide.title}
                  className="rounded-xl p-5 space-y-3"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'var(--primary-bg)' }}
                    >
                      <GuideIcon size={16} style={{ color: 'var(--primary)' }} />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground leading-tight">{guide.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{guide.description}</p>
                  <ol className="space-y-1.5">
                    {guide.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-xs text-foreground">
                        <span
                          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5"
                          style={{ background: 'var(--primary)', color: '#fff' }}
                        >
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4">Frequently Asked Questions</h2>

          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <Search size={15} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search FAQs…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          <div className="space-y-2">
            {filteredFAQs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No FAQs match your search.
              </p>
            ) : (
              filteredFAQs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <button
                    onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                    style={{ background: 'var(--card)' }}
                  >
                    <span className="text-sm font-medium text-foreground pr-4">{faq.question}</span>
                    {openFAQ === index ? (
                      <ChevronUp size={16} className="text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {openFAQ === index && (
                    <div
                      className="px-4 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed"
                      style={{ background: 'var(--card)' }}
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* How it works */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4">How the forecast is built</h2>
          <ol className="space-y-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            <li><strong className="text-foreground">1. Weekly totals.</strong> Your rows are summed into Monday-to-Sunday weeks. Partial first/last weeks are dropped and empty weeks are filled by interpolation (you are told when this happens).</li>
            <li><strong className="text-foreground">2. Seasonality.</strong> The strongest repeating cycle (4, 13 or 52 weeks) is found from the autocorrelation of the de-trended series.</li>
            <li><strong className="text-foreground">3. Backtest.</strong> Every model is trained without the latest weeks and scored on predicting them.</li>
            <li><strong className="text-foreground">4. Forecast.</strong> The most accurate model is refitted on all data and projected forward, with a range based on its past error.</li>
          </ol>
          <p className="text-xs mt-3" style={{ color: 'var(--muted-foreground)' }}>
            Forecasts are based only on past sales. They do not know about promotions, price changes or events outside your data.
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
