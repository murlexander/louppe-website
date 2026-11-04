#!/usr/bin/env node
// Parses every .drafts/analytics/raw/<date>/*.json into metrics.csv (deduplicated, newest
// collection wins) and regenerates summary.md. Usage: node scripts/analytics/ingest.mjs
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { addDays, dataDir, daysBetween, rawDir } from './lib.mjs';
import { columns, parseEnvelope } from './parsers.mjs';

export function toCsv(rows) {
  const cell = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\n') + '\n';
}

export function fromCsv(text) {
  const records = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); records.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); records.push(row); }
  const [head, ...body] = records;
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, h === 'value' ? Number(r[i]) : r[i] ?? ''])));
}

export const rowKey = (r) => [r.source, r.granularity, r.period_start, /range/.test(r.granularity) ? r.period_end : '', r.metric, r.dimension, r.dimension_value].join('\u0001');

export function merge(...lists) {
  const best = new Map();
  for (const r of lists.flat()) {
    const k = rowKey(r);
    const prev = best.get(k);
    if (!prev || r.collected_at >= prev.collected_at) best.set(k, r);
  }
  return [...best.values()].sort((a, b) => a.source.localeCompare(b.source) || a.metric.localeCompare(b.metric)
    || a.dimension.localeCompare(b.dimension) || a.period_start.localeCompare(b.period_start) || String(a.dimension_value).localeCompare(String(b.dimension_value)));
}

export function readRaw(dir = rawDir) {
  const envelopes = [];
  if (!existsSync(dir)) return envelopes;
  for (const date of readdirSync(dir).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()) {
    for (const file of readdirSync(join(dir, date)).filter((f) => f.endsWith('.json')).sort()) {
      const path = join(dir, date, file);
      try {
        envelopes.push({ path: relative(dataDir, path), env: JSON.parse(readFileSync(path, 'utf8')) });
      } catch (error) {
        envelopes.push({ path: relative(dataDir, path), env: { source: file, status: 'failed', error: `Unreadable JSON: ${error.message}`, collected_at: `${date}T00:00:00Z` } });
      }
    }
  }
  return envelopes;
}

// ---------- summary helpers ----------
const fmt = (v) => (v == null || Number.isNaN(v) ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(v < 10 ? 2 : 1));
const pct = (a, b) => (a == null || b == null ? '—' : b === 0 ? (a === 0 ? '0%' : 'new') : `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}%`);
const match = (rows, q) => rows.filter((r) => Object.entries(q).every(([k, v]) => (v instanceof RegExp ? v.test(r[k]) : r[k] === v)));

// Range row whose window ends latest, preferring a length near `days`.
export function pickRange(rows, q, days) {
  const c = match(rows, { granularity: 'range', dimension: '', ...q });
  if (!c.length) return null;
  const end = c.reduce((m, r) => (r.period_end > m ? r.period_end : m), '');
  return c.filter((r) => r.period_end === end).sort((a, b) => Math.abs(daysBetween(a.period_start, a.period_end) + 1 - days) - Math.abs(daysBetween(b.period_start, b.period_end) + 1 - days))[0];
}

function exactRange(rows, q, start, end) {
  return match(rows, { granularity: 'range', dimension: '', ...q }).find((r) => r.period_start === start && r.period_end === end) || null;
}

function sumDays(rows, q, start, end) {
  const d = match(rows, { granularity: 'day', dimension: '', ...q }).filter((r) => r.period_start >= start && r.period_start <= end);
  return d.length ? d.reduce((n, r) => n + r.value, 0) : null;
}

// Last day with data; trailing all-zero days are treated as not yet processed.
function lastDataDay(rows, q) {
  const d = match(rows, { granularity: 'day', dimension: '', ...q });
  const nonzero = d.filter((r) => r.value !== 0).map((r) => r.period_start).sort();
  return nonzero.at(-1) || null;
}

function top(rows, q, days, n = 8) {
  const c = match(rows, { granularity: 'range', ...q }).filter((r) => r.dimension);
  if (!c.length) return { rows: [] };
  const end = c.reduce((m, r) => (r.period_end > m ? r.period_end : m), '');
  const atEnd = c.filter((r) => r.period_end === end);
  const best = atEnd.sort((a, b) => Math.abs(daysBetween(a.period_start, a.period_end) + 1 - days) - Math.abs(daysBetween(b.period_start, b.period_end) + 1 - days))[0];
  const list = atEnd.filter((r) => r.period_start === best.period_start).sort((a, b) => b.value - a.value || String(a.dimension_value).localeCompare(String(b.dimension_value)));
  return { start: best.period_start, end, rows: list.slice(0, n), more: Math.max(0, list.length - n) };
}

const clip = (s, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const cell = (s) => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ');

export function summarize(rows, envelopes, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const out = [];
  const line = (s = '') => out.push(s);
  line('# Louppe usage and discovery summary');
  line();
  line(`Generated ${now.toISOString().replace(/\.\d+Z$/, 'Z')} by \`node scripts/analytics/ingest.mjs\` from ${envelopes.length} raw files (${rows.length} rows in \`metrics.csv\`). Private: never copy visitor data into tracked files.`);
  line();

  // Collection status: newest envelope per name.
  line('## Collection status');
  line();
  line('| Source file | Latest | Status | Note |');
  line('| --- | --- | --- | --- |');
  const latest = new Map();
  for (const { path, env } of envelopes) {
    const name = env.name || env.source || path;
    if (/^receipt-/.test(path.split('/').pop())) continue;
    const prev = latest.get(name);
    if (!prev || (env.collected_at || '') >= (prev.env.collected_at || '')) latest.set(name, { path, env });
  }
  const problems = [];
  for (const [name, { env }] of [...latest].sort()) {
    const day = (env.collected_at || '').slice(0, 10);
    const stale = day && daysBetween(day, today) > 8;
    const note = [env.error, env.remaining?.length ? `remaining: ${env.remaining.join(', ')}` : '', env.truncated ? 'truncated pages' : '', stale ? 'stale (>8 days)' : ''].filter(Boolean).join('; ');
    if (env.status !== 'ok' || stale) problems.push(`${name}: ${env.status}${note ? ` (${note})` : ''}`);
    line(`| ${cell(name)} | ${day} | ${env.status} | ${cell(clip(note || '', 90))} |`);
  }
  line();

  // Windows
  const gaLast = pickRange(rows, { source: 'ga4', metric: 'sessions' }, 7);
  const gaEnd = gaLast?.period_end;
  const wk = (end) => end && { last: [addDays(end, -6), end], prev: [addDays(end, -13), addDays(end, -7)] };
  const ga = wk(gaEnd);
  const gaVal = (metric, w) => (ga ? exactRange(rows, { source: 'ga4', metric }, ...ga[w])?.value ?? null : null);
  const ascEnd = lastDataDay(rows, { source: 'app_store', metric: 'units' });
  const asc = wk(ascEnd);
  const ascSum = (metric, w) => (asc ? sumDays(rows, { source: 'app_store', metric }, ...asc[w]) : null);
  const scEnd = lastDataDay(rows, { source: 'search_console', metric: 'impressions' });
  const sc = wk(scEnd);
  const scSum = (metric, w) => (sc ? sumDays(rows, { source: 'search_console', metric }, ...sc[w]) : null);
  const cfEnd = match(rows, { source: 'cloudflare', granularity: 'day', metric: 'visits' }).map((r) => r.period_start).sort().at(-1);
  const cf = wk(cfEnd);
  const cfSum = (metric, w) => (cf ? sumDays(rows, { source: 'cloudflare', metric }, ...cf[w]) : null);
  const ghRepo = 'github/louppe-media-culler';
  const ghEnd = addDays(today, -1);
  const gh = wk(ghEnd);
  const ghSum = (metric, w) => sumDays(rows, { source: ghRepo, metric }, ...gh[w]);
  const span = (w) => (w ? `${w.last[0]}…${w.last[1]}` : 'no data');

  line('## Funnel (last 7 complete days per source)');
  line();
  line('Steps come from different systems with different coverage; read them side by side, not as exact conversion rates.');
  line();
  line('| Step | Value | Window | Source |');
  line('| --- | --- | --- | --- |');
  line(`| Website visits (all visitors) | ${fmt(cfSum('visits', 'last'))} | ${span(cf)} | Cloudflare Web Analytics |`);
  line(`| Website sessions (consented) | ${fmt(gaVal('sessions', 'last'))} | ${span(ga)} | GA4 |`);
  line(`| Download clicks (consented) | ${fmt(gaVal('louppe_download_event_count', 'last'))} | ${span(ga)} | GA4 \`louppe_download\` |`);
  const gaStoreClicks = ga && match(rows, { source: 'ga4', granularity: 'range', metric: 'louppe_download_event_count', dimension: 'download_method', dimension_value: 'app_store' }).find((r) => r.period_start === ga.last[0] && r.period_end === ga.last[1]);
  line(`| – of which App Store clicks | ${fmt(gaStoreClicks?.value ?? null)} | ${span(ga)} | GA4 \`download_method\` |`);
  line(`| Store product page views | ${fmt(ascSum('page_view_count', 'last'))} | ${span(asc)} | App Store Connect |`);
  line(`| Store first-time downloads | ${fmt(ascSum('units', 'last'))} | ${span(asc)} | App Store Connect |`);
  const relNow = match(rows, { source: ghRepo, granularity: 'snapshot', metric: 'release_downloads', dimension: '' }).sort((a, b) => a.period_start.localeCompare(b.period_start));
  const relLatest = relNow.at(-1);
  const earlier = relNow.filter((r) => r.period_start < (relLatest?.period_start || ''));
  const relBase = earlier.filter((r) => r.period_start <= addDays(relLatest?.period_start || today, -7)).at(-1) || earlier.at(-1);
  line(`| GitHub release downloads (cumulative) | ${fmt(relLatest?.value ?? null)}${relBase ? ` (+${relLatest.value - relBase.value} since ${relBase.period_start})` : ''} | snapshot ${relLatest?.period_start || '—'} | GitHub assets |`);
  line();

  const storeRange = pickRange(rows, { source: 'app_store', metric: 'units' }, 9999);
  if (storeRange) {
    const web = match(rows, { source: 'app_store', granularity: 'range', metric: 'units', dimension: 'domain_referrer', dimension_value: 'louppe.eu' }).find((r) => r.period_start === storeRange.period_start && r.period_end === storeRange.period_end);
    const gaLife = match(rows, { source: 'ga4', granularity: 'range', metric: 'louppe_download_event_count', dimension: 'download_method', dimension_value: 'app_store' }).sort((a, b) => b.period_end.localeCompare(a.period_end) || a.period_start.localeCompare(b.period_start))[0];
    line(`Since Store release (${storeRange.period_start}…${storeRange.period_end}): ${fmt(storeRange.value)} first-time downloads, ${fmt(web?.value ?? null)} of them referred by louppe.eu. GA4 recorded ${fmt(gaLife?.value ?? null)} App Store clicks (${gaLife ? `${gaLife.period_start}…${gaLife.period_end}` : '—'}).`);
    line();
  }

  line('## Week over week');
  line();
  line('| Metric | Last 7 days | Previous 7 | Change | Last window |');
  line('| --- | --- | --- | --- | --- |');
  const wow = (label, a, b, w) => line(`| ${label} | ${fmt(a)} | ${fmt(b)} | ${pct(a, b)} | ${span(w)} |`);
  wow('Cloudflare visits', cfSum('visits', 'last'), cfSum('visits', 'prev'), cf);
  wow('Cloudflare page views', cfSum('page_views', 'last'), cfSum('page_views', 'prev'), cf);
  wow('GA4 sessions', gaVal('sessions', 'last'), gaVal('sessions', 'prev'), ga);
  wow('GA4 download clicks', gaVal('louppe_download_event_count', 'last'), gaVal('louppe_download_event_count', 'prev'), ga);
  wow('Search clicks', scSum('clicks', 'last'), scSum('clicks', 'prev'), sc);
  wow('Search impressions', scSum('impressions', 'last'), scSum('impressions', 'prev'), sc);
  wow('Store impressions', ascSum('impressions_total', 'last'), ascSum('impressions_total', 'prev'), asc);
  wow('Store page views', ascSum('page_view_count', 'last'), ascSum('page_view_count', 'prev'), asc);
  wow('Store first-time downloads', ascSum('units', 'last'), ascSum('units', 'prev'), asc);
  wow('GitHub repo views (app)', ghSum('views', 'last'), ghSum('views', 'prev'), gh);
  wow('GitHub new stars (app)', ghSum('new_stars', 'last') ?? 0, ghSum('new_stars', 'prev') ?? 0, gh);
  line();

  line('## Latest totals');
  line();
  line('| Metric | Value | Window | Source |');
  line('| --- | --- | --- | --- |');
  const total = (label, source, metric, days) => {
    const r = pickRange(rows, { source, metric }, days);
    if (r) line(`| ${label} | ${fmt(r.value)} | ${r.period_start}…${r.period_end} | ${source} |`);
  };
  total('Sessions', 'ga4', 'sessions', 28);
  total('Sessions (all time)', 'ga4', 'sessions', 9999);
  total('Download clicks', 'ga4', 'louppe_download_event_count', 28);
  total('Download clicks (all time)', 'ga4', 'louppe_download_event_count', 9999);
  total('Search clicks', 'search_console', 'clicks', 9999);
  total('Search impressions', 'search_console', 'impressions', 9999);
  total('Average search position', 'search_console', 'position', 9999);
  total('Store first-time downloads', 'app_store', 'units', 9999);
  total('Store redownloads', 'app_store', 'redownloads', 9999);
  total('Store impressions', 'app_store', 'impressions_total', 9999);
  total('Store page views', 'app_store', 'page_view_count', 9999);
  total('Cloudflare visits', 'cloudflare', 'visits', 28);
  total('GitHub repo views, 14 days (app)', ghRepo, 'views', 14);
  const snap = (label, source, metric, dimension = '') => {
    const r = match(rows, { source, granularity: 'snapshot', metric, dimension }).sort((a, b) => a.period_start.localeCompare(b.period_start)).at(-1);
    if (r) line(`| ${label} | ${dimension ? r.dimension_value : fmt(r.value)} | ${r.period_start} | ${source} |`);
  };
  snap('GitHub stars (app)', ghRepo, 'stars');
  snap('GitHub stars (website)', 'github/louppe-website', 'stars');
  snap('Store ratings', 'itunes', 'user_rating_count');
  snap('Store version', 'itunes', 'current_version', 'version');
  snap('Indexed pages', 'search_console', 'indexed_pages');
  snap('Not indexed pages', 'search_console', 'not_indexed_pages');
  line();

  line('## Top lists');
  line();
  const list = (title, q, days, valueLabel) => {
    const t = top(rows, q, days);
    if (!t.rows.length) return;
    line(`**${title}** (${valueLabel}, ${t.start}…${t.end}): ${t.rows.map((r) => `${clip(String(r.dimension_value), 48)} ${fmt(r.value)}`).join(' · ')}${t.more ? ` · +${t.more} more` : ''}`);
    line();
  };
  list('GA4 source / medium', { source: 'ga4', metric: 'sessions', dimension: 'session_source_medium' }, 28, 'sessions');
  list('GA4 landing pages', { source: 'ga4', metric: 'sessions', dimension: 'landing_page' }, 28, 'sessions');
  list('GA4 countries', { source: 'ga4', metric: 'active_users', dimension: 'country' }, 28, 'active users');
  list('GA4 download placement', { source: 'ga4', metric: 'louppe_download_event_count', dimension: 'download_placement' }, 28, 'clicks');
  list('GA4 download method', { source: 'ga4', metric: 'louppe_download_event_count', dimension: 'download_method' }, 28, 'clicks');
  list('Cloudflare referrers', { source: 'cloudflare', metric: 'visits', dimension: 'referrer' }, 28, 'visits');
  list('Cloudflare paths', { source: 'cloudflare', metric: 'page_views', dimension: 'path' }, 28, 'page views');
  list('Cloudflare countries', { source: 'cloudflare', metric: 'visits', dimension: 'country' }, 28, 'visits');
  list('Search queries', { source: 'search_console', metric: 'impressions', dimension: 'query' }, 9999, 'impressions');
  list('Search pages', { source: 'search_console', metric: 'impressions', dimension: 'page' }, 9999, 'impressions');
  list('Search countries', { source: 'search_console', metric: 'clicks', dimension: 'country' }, 9999, 'clicks');
  list('Store downloads by source', { source: 'app_store', metric: 'units', dimension: 'source' }, 9999, 'downloads');
  list('Store downloads by web referrer', { source: 'app_store', metric: 'units', dimension: 'domain_referrer' }, 9999, 'downloads');
  list('Store downloads by campaign (ct)', { source: 'app_store', metric: 'units', dimension: 'campaign_id' }, 9999, 'downloads');
  list('Store downloads by storefront', { source: 'app_store', metric: 'units', dimension: 'storefront' }, 9999, 'downloads');
  list('GitHub referrers (app)', { source: ghRepo, metric: 'referrer_views', dimension: 'referrer' }, 14, 'views');
  list('GitHub release downloads (app)', { source: ghRepo, metric: 'release_downloads', dimension: 'release' }, 9999, 'downloads');

  line('## Data quality');
  line();
  const notes = [
    'GA4 loads only after consent, so sessions and download clicks are a sample, not totals; Cloudflare counts all visitors without cookies and differs by design. Never sum the two.',
    "GA4 Denmark traffic includes Alex's own and verification visits; the 21–22 October consent tests generated page views.",
    'App Store Connect first-time downloads are the install figure; GA4 clicks are intent. Campaign (ct) tokens exist since 2026-11-04, so campaign rows start then.',
    `App Store Connect lags 1–2 days; its windows end at the last day with data (${ascEnd || '—'}). Search Console lags 2–3 days (last day ${scEnd || '—'}).`,
    'GitHub keeps traffic for 14 days and counts days in UTC; unique visitor counts per day cannot be summed into unique people.',
    'Rows with granularity `approx_range` come from hand-written receipts whose exact window is unknown.',
  ];
  if (!cfEnd) notes.push('Cloudflare Web Analytics returned no page loads yet (beacon added 2026-11-04).');
  const below = match(rows, { metric: /_below_threshold$/ });
  if (below.length) notes.push(`${below.length} App Store Connect groups are below Apple's privacy threshold.`);
  const sitemapBad = match(rows, { source: 'search_console', metric: 'sitemap_fetch_ok', value: 0 }).sort((a, b) => a.period_start.localeCompare(b.period_start)).at(-1);
  if (sitemapBad) notes.push(`Search Console has not fetched ${sitemapBad.dimension_value} successfully (as of ${sitemapBad.period_start}).`);
  for (const p of problems) notes.push(`Collection problem — ${p}. Missing data is unknown, not zero.`);
  for (const n of notes) line(`- ${n}`);
  line();
  return out.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const envelopes = readRaw();
  const parsed = envelopes.flatMap(({ path, env }) => parseEnvelope(env, path));
  const csvPath = join(dataDir, 'metrics.csv');
  const existing = existsSync(csvPath) ? fromCsv(readFileSync(csvPath, 'utf8')) : [];
  const rows = merge(existing, parsed);
  writeFileSync(csvPath, toCsv(rows));
  writeFileSync(join(dataDir, 'summary.md'), summarize(rows, envelopes));
  console.log(`${envelopes.length} raw files, ${parsed.length} parsed rows, ${rows.length} rows in ${csvPath}`);
  console.log(join(dataDir, 'summary.md'));
}
