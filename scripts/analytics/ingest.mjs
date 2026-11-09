#!/usr/bin/env node
// Rebuilds metrics.csv from every <analytics>/raw/<date>/*.json (see lib.mjs; deduplicated, newest
// collection wins) and regenerates summary.md. Raw files are the record: metrics.csv is derived, so a
// parser fix applies to all earlier collections. Usage: node scripts/analytics/ingest.mjs
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { addDays, dataDir, daysBetween, localDate, rawDir, writeAtomic } from './lib.mjs';
import { cloudflareSince, columns, finishStoreReports, parseEnvelope } from './parsers.mjs';

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

// All raw envelopes -> the rows of metrics.csv.
export function buildRows(envelopes) {
  return merge(finishStoreReports(merge(envelopes.flatMap(({ path, env }) => parseEnvelope(env, path)))));
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

// Sum of day rows in [start, end] → { value, days, of }, or null when no day in the window has data.
// Every source here lists each covered day (zeros included), so days < of means partial coverage.
function sumDays(rows, q, start, end) {
  const d = match(rows, { granularity: 'day', dimension: '', ...q }).filter((r) => r.period_start >= start && r.period_start <= end);
  if (!d.length) return null;
  return { value: d.reduce((n, r) => n + r.value, 0), days: new Set(d.map((r) => r.period_start)).size, of: daysBetween(start, end) + 1 };
}
const complete = (s) => s != null && s.days === s.of;
const fmtSum = (s) => (!s ? '—' : complete(s) ? fmt(s.value) : `${fmt(s.value)} (${s.days} of ${s.of} days)`);
const lastDay = (rows, q) => match(rows, { granularity: 'day', dimension: '', ...q }).map((r) => r.period_start).sort().at(-1) || null;

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

const signIn = { 'app-store-connect': 'App Store Connect', ga4: 'Google Analytics', 'search-console': 'Search Console' };

export function summarize(rows, envelopes, now = new Date()) {
  const out = [];
  const line = (s = '') => out.push(s);
  // App Store figures come from the dashboard snippet (app_store) or the API reports (app_store_reports),
  // whichever has the later processed day; the dashboard wins a tie.
  const storeEnd = (source) => lastDay(rows, { source, metric: 'units' });
  const store = (storeEnd('app_store_reports') || '') > (storeEnd('app_store') || '') ? 'app_store_reports' : 'app_store';
  const storeLabel = store === 'app_store' ? 'App Store Connect' : 'App Store Connect API';
  // Fresh API reports make a browser sign-in to App Store Connect unnecessary.
  const apiCovers = store === 'app_store_reports' && daysBetween(storeEnd(store), localDate(now)) <= 5;
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
  const signedOut = new Set();
  for (const [name, { env }] of [...latest].sort()) {
    const day = env.collected_at ? localDate(new Date(env.collected_at)) : '';
    const stale = day && daysBetween(day, localDate(now)) > 8;
    const note = [env.error, env.remaining?.length ? `remaining: ${env.remaining.join(', ')}` : '', env.truncated ? 'truncated pages' : '', stale ? 'stale (>8 days)' : ''].filter(Boolean).join('; ');
    const covered = apiCovers && env.source === 'app-store-connect';
    if (!covered && (env.status !== 'ok' || env.truncated || stale)) problems.push(`${name}: ${env.status}${note ? ` (${note})` : ''}`);
    if (!covered && env.status === 'signed_out') signedOut.add(signIn[env.source] || env.source);
    line(`| ${cell(name)} | ${day} | ${env.status} | ${cell(clip([note, covered && 'not needed: API reports are fresh'].filter(Boolean).join('; '), 90))} |`);
  }
  line();
  if (signedOut.size) {
    line(`**Needs Alex:** sign in to ${[...signedOut].sort().join(' and ')} in T3's built-in browser (Default profile). Earlier data is kept; the next run collects again.`);
    line();
  }

  // Windows: each source's latest 7 complete days.
  const wk = (end) => end && { last: [addDays(end, -6), end], prev: [addDays(end, -13), addDays(end, -7)] };
  const gaLast = pickRange(rows, { source: 'ga4', metric: 'sessions' }, 7);
  const ga = gaLast && daysBetween(gaLast.period_start, gaLast.period_end) === 6 ? wk(gaLast.period_end) : null;
  const gaIn = (metric, w, extra = {}) => (w ? match(rows, { source: 'ga4', granularity: 'range', metric, dimension: '', ...extra }).find((r) => r.period_start === w[0] && r.period_end === w[1])?.value ?? null : null);
  const ascEnd = lastDay(rows, { source: store, metric: 'units' });
  const asc = wk(ascEnd);
  const scEnd = lastDay(rows, { source: 'search_console', metric: 'impressions' });
  const sc = wk(scEnd);
  const cfEnd = lastDay(rows, { source: 'cloudflare', metric: 'visits' });
  const cf = wk(cfEnd);
  const ghRepo = 'github/louppe-media-culler';
  const ghEnd = lastDay(rows, { source: ghRepo, metric: 'views' });
  const gh = wk(ghEnd);
  const sum = (source, metric, w) => (w ? sumDays(rows, { source, metric }, ...w) : null);
  const span = (w) => (w ? `${w[0]}…${w[1]}` : 'no data');

  // GitHub Louppe.zip downloads between the snapshots that bracket a window.
  const relSnaps = match(rows, { source: ghRepo, granularity: 'snapshot', metric: 'release_downloads', dimension: '' }).sort((a, b) => a.period_start.localeCompare(b.period_start));
  const zipDelta = (w) => {
    const base = relSnaps.filter((r) => r.period_start < w[0] && r.period_start >= addDays(w[0], -3)).at(-1);
    const top = relSnaps.find((r) => r.period_start >= w[1] && r.period_start <= addDays(w[1], 2));
    return base && top ? `${top.value - base.value} (snapshots ${base.period_start}→${top.period_start})` : '—';
  };

  // Funnel: one shared window, GA4's latest 7 days (GA4 has no daily rows), else the earliest
  // latest-day among daily sources, so every step covers the same dates.
  const fEnd = ga?.last[1] || [cfEnd, ascEnd].filter(Boolean).sort()[0];
  const fw = fEnd ? [addDays(fEnd, -6), fEnd] : null;
  line(`## Funnel (${fw ? span(fw) : 'no data'})`);
  line();
  line('All steps use the same 7 days. Days are UTC for Cloudflare and GitHub and Europe/Copenhagen for GA4. Sources differ in coverage, so read them side by side, not as conversion rates. "n of 7 days" marks a source that covers only part of the window; "—" means unknown, not zero.');
  line();
  line('| Step | Value | Source |');
  line('| --- | --- | --- |');
  if (fw) {
    line(`| Website visits (all visitors) | ${fmtSum(sum('cloudflare', 'visits', fw))} | Cloudflare Web Analytics |`);
    line(`| Website sessions (consented) | ${fmt(gaIn('sessions', fw))} | GA4 |`);
    line(`| Download clicks (consented) | ${fmt(gaIn('louppe_download_event_count', fw))} | GA4 \`louppe_download\` |`);
    line(`| – of which App Store clicks | ${fmt(gaIn('louppe_download_event_count', fw, { dimension: 'download_method', dimension_value: 'app_store' }))} | GA4 \`download_method\` |`);
    line(`| Store product page views | ${fmtSum(sum(store, 'page_view_count', fw))} | ${storeLabel} |`);
    line(`| Store first-time downloads | ${fmtSum(sum(store, 'units', fw))} | ${storeLabel} |`);
    line(`| GitHub Louppe.zip downloads (include updates) | ${zipDelta(fw)} | GitHub release assets |`);
  }
  line();

  const storeRange = pickRange(rows, { source: store, metric: 'units' }, 9999);
  if (storeRange) {
    const web = match(rows, { source: store, granularity: 'range', metric: 'units', dimension: 'domain_referrer', dimension_value: 'louppe.eu' }).find((r) => r.period_start === storeRange.period_start && r.period_end === storeRange.period_end);
    const gaLife = match(rows, { source: 'ga4', granularity: 'range', metric: 'louppe_download_event_count', dimension: 'download_method', dimension_value: 'app_store' }).sort((a, b) => b.period_end.localeCompare(a.period_end) || a.period_start.localeCompare(b.period_start))[0];
    line(`Since Store release (${storeRange.period_start}…${storeRange.period_end}, the last day Apple has processed): ${fmt(storeRange.value)} Store first-time downloads, ${fmt(web?.value ?? null)} of them referred by louppe.eu. GA4 recorded ${fmt(gaLife?.value ?? null)} consented App Store clicks (${gaLife ? `${gaLife.period_start}…${gaLife.period_end}` : '—'}).`);
    line();
  }

  line('## Week over week (latest 7 days per source)');
  line();
  line('| Metric | Last 7 days | Previous 7 | Change | Last window |');
  line('| --- | --- | --- | --- | --- |');
  const wow = (label, a, b, w) => {
    const change = complete(a) && complete(b) ? pct(a.value, b.value) : '—';
    line(`| ${label} | ${fmtSum(a)} | ${fmtSum(b)} | ${change} | ${w ? span(w.last) : 'no data'} |`);
  };
  const gaWow = (label, metric) => {
    const [a, b] = ['last', 'prev'].map((k) => gaIn(metric, ga?.[k]));
    line(`| ${label} | ${fmt(a)} | ${fmt(b)} | ${pct(a, b)} | ${ga ? span(ga.last) : 'no data'} |`);
  };
  wow('Cloudflare visits', sum('cloudflare', 'visits', cf?.last), sum('cloudflare', 'visits', cf?.prev), cf);
  wow('Cloudflare page views', sum('cloudflare', 'page_views', cf?.last), sum('cloudflare', 'page_views', cf?.prev), cf);
  gaWow('GA4 sessions', 'sessions');
  gaWow('GA4 download clicks', 'louppe_download_event_count');
  wow('Search clicks', sum('search_console', 'clicks', sc?.last), sum('search_console', 'clicks', sc?.prev), sc);
  wow('Search impressions', sum('search_console', 'impressions', sc?.last), sum('search_console', 'impressions', sc?.prev), sc);
  wow('Store impressions', sum(store, 'impressions_total', asc?.last), sum(store, 'impressions_total', asc?.prev), asc);
  wow('Store page views', sum(store, 'page_view_count', asc?.last), sum(store, 'page_view_count', asc?.prev), asc);
  wow('Store first-time downloads', sum(store, 'units', asc?.last), sum(store, 'units', asc?.prev), asc);
  wow('GitHub repo views (app)', sum(ghRepo, 'views', gh?.last), sum(ghRepo, 'views', gh?.prev), gh);
  // Star dates cover all history, so a day without stars is a real zero.
  const stars = (w) => w && { value: sumDays(rows, { source: ghRepo, metric: 'new_stars' }, ...w)?.value ?? 0, days: 7, of: 7 };
  wow('GitHub new stars (app)', stars(gh?.last), stars(gh?.prev), gh);
  line();

  line('## Latest totals');
  line();
  line('| Metric | Value | Window | Source |');
  line('| --- | --- | --- | --- |');
  const total = (label, source, metric, days) => {
    const r = pickRange(rows, { source, metric }, days);
    if (r) line(`| ${label} | ${fmt(r.value)} | ${r.period_start}…${r.period_end} | ${source} |`);
  };
  total('Sessions, 28 days', 'ga4', 'sessions', 28);
  total('Sessions, all time', 'ga4', 'sessions', 9999);
  total('Download clicks, 28 days', 'ga4', 'louppe_download_event_count', 28);
  total('Download clicks, all time', 'ga4', 'louppe_download_event_count', 9999);
  total('Search clicks, 3 months', 'search_console', 'clicks', 9999);
  total('Search impressions, 3 months', 'search_console', 'impressions', 9999);
  total('Average search position, 3 months', 'search_console', 'position', 9999);
  total('Store first-time downloads, since release', store, 'units', 9999);
  total('Store redownloads, since release', store, 'redownloads', 9999);
  total('Store updates, since release', store, 'updates', 9999);
  total('Store impressions, since release', store, 'impressions_total', 9999);
  total('Store page views, since release', store, 'page_view_count', 9999);
  total('Store app installs (sharing users), since release', store, 'installs', 9999);
  total('Store app sessions (sharing users), since release', store, 'sessions', 9999);
  total('Store app deletions (sharing users), since release', store, 'uninstalls', 9999);
  total('Store app crashes (sharing users), since release', store, 'crashes', 9999);
  total('Store tip purchases, since release', store, 'iap', 9999);
  total('Store tip proceeds, since release', store, 'proceeds', 9999);
  total('Store tip proceeds (USD), since release', store, 'proceeds_usd', 9999);
  const rolling = lastDataDay(rows, { source: store, metric: 'rolling_active_devices' });
  const rollingRow = rolling && match(rows, { source: store, granularity: 'day', dimension: '', metric: 'rolling_active_devices' }).find((r) => r.period_start === rolling);
  if (rollingRow) line(`| Store active devices, 30 days (sharing users) | ${fmt(rollingRow.value)} | 30 days to ${rolling} | ${store} |`);
  total('Cloudflare visits, up to 28 days', 'cloudflare', 'visits', 28);
  total('GitHub repo views, 14 days (app)', ghRepo, 'views', 14);
  const snap = (label, source, metric, dimension = '') => {
    const r = match(rows, { source, granularity: 'snapshot', metric, dimension }).sort((a, b) => a.period_start.localeCompare(b.period_start)).at(-1);
    if (r) line(`| ${label} | ${dimension ? r.dimension_value : fmt(r.value)} | ${r.period_start} | ${source} |`);
  };
  snap('GitHub Louppe.zip downloads since v1.11 (include updates)', ghRepo, 'release_downloads');
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
  // louppe_download is the property's only key event, so key events by session source and landing page attribute download intent.
  list('GA4 download clicks by source / medium', { source: 'ga4', metric: 'key_events', dimension: 'session_source_medium' }, 28, 'key events');
  list('GA4 download clicks by landing page', { source: 'ga4', metric: 'key_events', dimension: 'landing_page' }, 28, 'key events');
  list('Cloudflare referrers', { source: 'cloudflare', metric: 'visits', dimension: 'referrer' }, 28, 'visits');
  list('Cloudflare paths', { source: 'cloudflare', metric: 'page_views', dimension: 'path' }, 28, 'page views');
  list('Cloudflare countries', { source: 'cloudflare', metric: 'visits', dimension: 'country' }, 28, 'visits');
  list('Search queries', { source: 'search_console', metric: 'impressions', dimension: 'query' }, 9999, 'impressions');
  list('Search pages', { source: 'search_console', metric: 'impressions', dimension: 'page' }, 9999, 'impressions');
  list('Search countries', { source: 'search_console', metric: 'clicks', dimension: 'country' }, 9999, 'clicks');
  list('Store downloads by source', { source: store, metric: 'units', dimension: 'source' }, 9999, 'downloads');
  list('Store downloads by web referrer', { source: store, metric: 'units', dimension: 'domain_referrer' }, 9999, 'downloads');
  list('Store downloads by campaign (ct)', { source: store, metric: 'units', dimension: 'campaign_id' }, 9999, 'downloads');
  list('Store downloads by storefront', { source: store, metric: 'units', dimension: 'storefront' }, 9999, 'downloads');
  list('GitHub referrers (app)', { source: ghRepo, metric: 'referrer_views', dimension: 'referrer' }, 14, 'views');
  const relDay = relSnaps.at(-1)?.period_start;
  const rel = match(rows, { source: ghRepo, granularity: 'snapshot', metric: 'release_downloads', dimension: 'release', period_start: relDay });
  if (rel.length) line(`**GitHub Louppe.zip downloads by release** (cumulative, ${relDay}): ${rel.sort((a, b) => b.dimension_value.localeCompare(a.dimension_value, 'en', { numeric: true })).map((r) => `${r.dimension_value} ${fmt(r.value)}`).join(' · ')}\n`);

  line('## Data quality');
  line();
  const notes = [
    'GA4 loads only after consent, so sessions and download clicks are a sample, not totals; Cloudflare counts all visitors without cookies and differs by design. Never sum the two.',
    "GA4 Denmark traffic includes Alex's own and verification visits; the 21–22 October consent tests generated page views.",
    'App Store Connect first-time downloads are the install figure; GA4 clicks are intent. Campaign (ct) tokens exist since 2026-11-04, so campaign rows start then.',
    `App Store Connect lags 1–2 days; days Apple has not processed are left out, not counted as zero (last processed day ${ascEnd || '—'}). Search Console lags 2–3 days (last day ${scEnd || '—'}).`,
    'Store app installs, sessions, deletions, crashes, and active devices count only users who share analytics with developers, so they undercount. Apple hides groups below its privacy threshold.',
    "GitHub Louppe.zip downloads count every fetch of the release ZIP: new direct and Homebrew installs, Sparkle auto-updates of existing installs (on by default, checked daily), and one fetch per release by the Homebrew workflow. They are not first-time installs. Assets of v1.0–v1.10 were deleted, so downloads before v1.11 (2026-10-15) are unknown. The direct build has no app analytics.",
    'GitHub keeps traffic for 14 days and counts days in UTC; unique visitor counts per day cannot be summed into unique people. Referrer and path lists are GitHub\'s top 10.',
    `Cloudflare figures are exact: each UTC day is queried separately because longer windows come back 10% sampled, and sampled days are rejected. The beacon went live on ${cloudflareSince} (about 05:50 CET), so earlier days are unknown.`,
    'Rows with granularity `approx_range` come from hand-written receipts whose exact window is unknown.',
  ];
  notes.push(store === 'app_store_reports'
    ? `Store figures come from Apple's Analytics Reports through the App Store Connect API (source \`app_store_reports\`, newer than the dashboard's last day ${storeEnd('app_store') || '—'}). They can differ slightly from the dashboard; deletions, sessions, and crashes still count only users who share analytics.`
    : `Store figures come from the App Store Connect dashboard (source \`app_store\`); API reports reach ${storeEnd('app_store_reports') || 'no day yet'}.`);
  const both = [...new Set(match(rows, { source: 'app_store', granularity: 'day', dimension: '', metric: 'units' }).map((r) => r.period_start))]
    .filter((d) => match(rows, { source: 'app_store_reports', granularity: 'day', dimension: '', metric: 'units', period_start: d }).length);
  if (both.length) {
    const tot = (source) => both.reduce((n, d) => n + (match(rows, { source, granularity: 'day', dimension: '', metric: 'units', period_start: d })[0]?.value || 0), 0);
    notes.push(`First-time downloads on the ${both.length} day(s) both App Store sources cover: ${tot('app_store')} (dashboard) and ${tot('app_store_reports')} (API reports).`);
  }
  if (!cfEnd) notes.push('Cloudflare Web Analytics has no exact daily data yet.');
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
  const rows = buildRows(envelopes);
  const csvPath = join(dataDir, 'metrics.csv');
  writeAtomic(csvPath, toCsv(rows));
  writeAtomic(join(dataDir, 'summary.md'), summarize(rows, envelopes));
  console.log(`${envelopes.length} raw files, ${rows.length} rows in ${csvPath}`);
  console.log(join(dataDir, 'summary.md'));
}
