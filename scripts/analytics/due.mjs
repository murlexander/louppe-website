#!/usr/bin/env node
// Lists the browser-collected sources that are missing, failed, partial, or older than
// --days (default 6), so a daily run refreshes them about once a week and retries failures.
// Usage: node scripts/analytics/due.mjs [--days 6]   → JSON {due:[{name,reason,run}], fresh:[…]}
import { daysBetween, localDate } from './lib.mjs';
import { readRaw } from './ingest.mjs';

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

export function dueSources(envelopes, today = localDate(), maxAge = 6) {
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
    const age = env?.collected_at ? daysBetween(env.collected_at.slice(0, 10), today) : null;
    const reason = !env ? 'missing' : env.status !== 'ok' ? env.status : age >= maxAge ? `${age} days old` : null;
    (reason ? due : fresh).push(reason ? { name, reason, run } : name);
  }
  return { today, maxAge, due, fresh };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf('--days');
  const maxAge = i > 0 ? Number(process.argv[i + 1]) : 6;
  console.log(JSON.stringify(dueSources(readRaw(), localDate(), maxAge), null, 2));
}
