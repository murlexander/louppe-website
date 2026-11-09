#!/usr/bin/env node
// Lists the browser-collected sources that are missing, not ok (failed, partial, signed_out), truncated,
// or at least --days old (default 5, in local days). The run every 48 h therefore refreshes them every
// third run (about 6 days, never more than 7) and retries failures on the next run.
// App Store Connect is skipped while the API reports (collect.mjs app-store-reports) reach a day at most
// 5 days back, so the browser sign-in is needed only as a fallback.
// Usage: node scripts/analytics/due.mjs [--days 5]   → JSON {due:[{name,reason,run}], fresh:[…]}
import { daysBetween, localDate } from './lib.mjs';
import { buildRows, readRaw } from './ingest.mjs';

export function apiStoreLastDay(rows) {
  return rows.filter((r) => r.source === 'app_store_reports' && r.granularity === 'day' && !r.dimension && r.metric === 'units')
    .map((r) => r.period_start).sort().at(-1) || null;
}

// Each expected raw file and the snippet call that produces it.
export const browserSources = {
  'app-store-connect': ['app-store-connect', {}],
  'ga4-traffic-last7+prev7': ['ga4', { report: 'traffic', ranges: ['last7', 'prev7'] }],
  'ga4-traffic-last28+lifetime': ['ga4', { report: 'traffic', ranges: ['last28', 'lifetime'] }],
  'ga4-download-last7+prev7': ['ga4', { report: 'download', ranges: ['last7', 'prev7'] }],
  'ga4-download-last28+lifetime': ['ga4', { report: 'download', ranges: ['last28', 'lifetime'] }],
  'ga4-landing-last28': ['ga4', { report: 'landing', ranges: ['last28'] }],
  'ga4-countries-last28': ['ga4', { report: 'countries', ranges: ['last28'] }],
  'ga4-events-last28': ['ga4', { report: 'events', ranges: ['last28'] }],
  'ga4-pages-last28': ['ga4', { report: 'pages', ranges: ['last28'] }],
  'ga4-search-queries-last28': ['ga4', { report: 'search-queries', ranges: ['last28'] }],
  'search-console-performance-3m-queries-pages-countries': ['search-console', { tabs: ['QUERIES', 'PAGES', 'COUNTRIES'] }],
  'search-console-performance-3m-days': ['search-console', { tabs: ['DAYS'] }],
  'search-console-sitemaps': ['search-console', { view: 'sitemaps' }],
  'search-console-indexing': ['search-console', { view: 'indexing' }],
};

export function dueSources(envelopes, today = localDate(), maxAge = 5, apiLastDay = null) {
  const latest = new Map();
  for (const { env } of envelopes) {
    const name = env.name || env.source;
    const prev = latest.get(name);
    if (!prev || (env.collected_at || '') >= (prev.collected_at || '')) latest.set(name, env);
  }
  const due = [], fresh = [];
  for (const [name, [snippet, options]] of Object.entries(browserSources)) {
    const env = latest.get(name);
    const run = `node scripts/analytics/snippet.mjs ${snippet} '${JSON.stringify(options)}'`;
    const age = env?.collected_at ? daysBetween(localDate(new Date(env.collected_at)), today) : null;
    if (name === 'app-store-connect' && apiLastDay && daysBetween(apiLastDay, today) <= 5) { fresh.push(name); continue; }
    const reason = !env ? 'missing' : env.status !== 'ok' ? env.status : env.truncated ? 'truncated' : age >= maxAge ? `${age} days old` : null;
    (reason ? due : fresh).push(reason ? { name, reason, run } : name);
  }
  return { today, maxAge, due, fresh };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf('--days');
  const maxAge = i > 0 ? Number(process.argv[i + 1]) : 5;
  const envelopes = readRaw();
  console.log(JSON.stringify(dueSources(envelopes, localDate(), maxAge, apiStoreLastDay(buildRows(envelopes))), null, 2));
}
