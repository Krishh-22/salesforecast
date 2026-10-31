/** Browser helpers for saving generated files. Client-side only. */

export function downloadText(filename: string, mime: string, text: string): number {
  // BOM so Excel opens UTF-8 CSVs (₹, é, …) correctly
  const body = mime.startsWith('text/csv') ? '﻿' + text : text;
  const blob = new Blob([body], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return blob.size;
}

export function openHtmlInNewTab(html: string): boolean {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return w !== null;
}

export function safeFileName(name: string): string {
  return (name || 'forecast').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'forecast';
}
