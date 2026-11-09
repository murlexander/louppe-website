// Parser tests for scripts/analytics/. Fixtures are synthetic; no real visitor data.
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { cloudflare } from './analytics/collect.mjs';
import { fromCsv, merge, summarize, toCsv } from './analytics/ingest.mjs';
import { normalizeStatus, writeRaw } from './analytics/lib.mjs';
import {
  parseAppStoreConnect, parseCloudflare, parseDiscoveryReview, parseGa4, parseGa4EventDashboard,
  parseGa4Table, parseGithub, parseItunes, parseLongDate, parseNumber, parseSearchConsole,
} from './analytics/parsers.mjs';

const at = '2026-11-04T02:00:00.000Z';
const find = (rows, q) => rows.filter((r) => Object.entries(q).every(([k, v]) => r[k] === v));

test('parseNumber handles GA and Search Console cells', () => {
  assert.equal(parseNumber('24 (80%)'), 24);
  assert.equal(parseNumber('46.67%'), 46.67);
  assert.equal(parseNumber('18s'), 18);
  assert.equal(parseNumber('1m 5s'), 65);
  assert.equal(parseNumber('1,234'), 1234);
  assert.equal(parseNumber('12.00 (100%)'), 12);
  assert.equal(parseNumber('—'), null);
  assert.equal(parseLongDate('Nov 1, 2026'), '2026-11-01');
  assert.equal(parseLongDate('September 22, 2026'), '2026-09-22');
});

const exploreText = [
  'Add comparison\nCustom\nOct 1 - 7, 2026\nRows per page:\n10\t\n1-3 of 3\nselection column\n\t\nIndex\n\t\nSession source / medium\nSession source / medium\n\t',
  '\nSessions\n\t\nAverage engagement time per session\n\t\nKey events\nAll events\nAll events\n\t\nTotal revenue\n\n\nEmpty Summary Totals cell for\n\t',
  '\nEmpty Summary Totals cell for Index column\n\tTotal\t\n9\n100% of total\n\t\n1m 2s\nAvg 0%\n\t\n3.00\n100% of total\n\t',
  '\nEmpty Summary Totals cell for Total revenue column\nkr.0.00\n\n\n',
  '\t1\t(direct) / (none)\t6 (66.67%)\t20s\t2.00 (66.67%)\tkr.0.00 (–)\n\n',
  '\t2\texample.org / referral\t2 (22.22%)\t5s\t1.00 (33.33%)\tkr.0.00 (–)\n\n',
  '\t3\t\t1 (11.11%)\t0s\t0.00 (0%)\tkr.0.00 (–)\n',
].join('');

test('parseGa4Table reads headers, totals, and single-line rows', () => {
  const t = parseGa4Table(exploreText);
  assert.equal(t.dimension, 'Session source / medium');
  assert.deepEqual(t.metrics, ['Sessions', 'Average engagement time per session', 'Key events', 'Total revenue']);
  assert.deepEqual(t.totals.slice(0, 3), ['9', '1m 2s', '3.00']);
  assert.deepEqual(t.rows.map((r) => r.value), ['(direct) / (none)', 'example.org / referral', '(empty)']);
});

test('parseGa4Table reads multi-line event rows and untabbed query rows', () => {
  const events = 'selection column\n\t\nIndex\n\t\nEvent name\n\t\nEvent count\n\t\nTotal users\n\t\nActions\n\n\nEmpty Summary Totals cell for\n\t\nEmpty Summary Totals cell for Index column\n\tTotal\t\n50\n100% of total\n\t\n9\n100% of total\n\t\nEmpty Summary Totals cell for Actions column\n\n\n\t1\t\npage_view\n\t40 (80%)\t9 (100%)\t\n\n\n\t2\t\nlouppe_download\n\t10 (20%)\t3 (33%)\t\n';
  const e = parseGa4Table(events);
  assert.deepEqual(e.rows.map((r) => [r.value, parseNumber(r.values[0]), parseNumber(r.values[1])]), [['page_view', 40, 9], ['louppe_download', 10, 3]]);
  const queries = 'Rows per page:\n10\t\n1-1 of 1\nIndex\n\t\nOrganic Google Search query\nOrganic Google Search query\n\t\nOrganic Google Search clicks\n\n\nEmpty Summary Totals cell for Index column\n\tTotal\t\n4\n100% of total\n\n1\texample query\t4 (100%)\n';
  const q = parseGa4Table(queries);
  assert.deepEqual(q.totals, ['4']);
  assert.deepEqual(q.rows, [{ value: 'example query', values: ['4 (100%)'] }]);
});

test('parseGa4 emits range rows and keeps only first-page totals', () => {
  const env = { source: 'ga4', collected_at: at, status: 'ok', options: { report: 'traffic' }, data: [{ range: { start: '2026-10-01', end: '2026-10-07' }, pages: [exploreText] }] };
  const rows = parseGa4(env, 'x');
  assert.equal(find(rows, { metric: 'sessions', dimension: '' })[0].value, 9);
  assert.equal(find(rows, { metric: 'average_engagement_time_per_session', dimension: '' })[0].value, 62);
  assert.equal(find(rows, { metric: 'sessions', dimension_value: 'example.org / referral' })[0].value, 2);
  assert.equal(find(rows, { metric: 'total_revenue' }).length, 0);
  assert.ok(rows.every((r) => r.granularity === 'range' && r.period_start === '2026-10-01'));
});

test('parseGa4EventDashboard reads totals and parameter cards', () => {
  const text = 'Add comparison\nOct 1 - 7, 2026\nlouppe_download\nEvent count\n5\nTotal users\n3\nEvent count per active user\n1.7\nCOUNTRY\tEVENT COUNT\nNorway\t4\nChile\t1\n\n\nDownload method\nThis card uses mostly complete data. Click to view more information.\nCUSTOM PARAMETER\tEVENT COUNT\tTOTAL USERS\n\n(total) 2 items\n\t\n5\n\t\n3\n\napp_store\t4\t2\ngithub\t1\t1\n\n';
  const d = parseGa4EventDashboard(text);
  assert.equal(d.event, 'louppe_download');
  assert.deepEqual(d.totals, { event_count: 5, total_users: 3 });
  assert.deepEqual(d.cards.map((c) => c.dimension), ['country', 'download_method']);
  assert.deepEqual(d.cards[1].rows, [['app_store', 4, 2], ['github', 1, 1]]);
});

test('parseSearchConsole reads totals, tables, days, sitemaps, and indexing', () => {
  const perf = {
    source: 'search-console', collected_at: at, status: 'ok', options: { view: 'performance' },
    data: [
      { tab: 'TOTALS', text: 'Total clicks\n7\n\nTotal impressions\n70\nAverage CTR\n10%\nAverage position\n4.5\nChart, containing counts of Total clicks from October 1, 2026 to October 31, 2026\n' },
      { tab: 'QUERIES', pages: ['\n\nTop queries\n\t\nClicks\n\t\nImpressions\n\t\nCTR\n\t\nPosition\n\nphoto culling mac\t3\t30\t10%\t5.0\nraw viewer\t0\t9\t0%\t12.1\nRows per page:\n1-2 of 2\n'] },
      { tab: 'DAYS', pages: ['\n\nDay\n\t\nClicks\n\t\nImpressions\n\t\nCTR\n\t\nPosition\n\nOct 31, 2026\t2\t5\t40%\t3.0\nOct 30, 2026\t0\t0\t—\t—\nRows per page:\n'] },
    ],
  };
  const rows = parseSearchConsole(perf, 'x');
  assert.deepEqual(find(rows, { metric: 'clicks', dimension: '', granularity: 'range' })[0], { ...find(rows, { metric: 'clicks', dimension: '', granularity: 'range' })[0], period_start: '2026-10-01', period_end: '2026-10-31', value: 7 });
  assert.equal(find(rows, { metric: 'impressions', dimension_value: 'raw viewer' })[0].value, 9);
  assert.equal(find(rows, { granularity: 'day', metric: 'clicks', period_start: '2026-10-31' })[0].value, 2);
  assert.equal(find(rows, { granularity: 'day', metric: 'ctr', period_start: '2026-10-30' }).length, 0);

  const idx = parseSearchConsole({ source: 'search-console', collected_at: at, status: 'ok', options: { view: 'indexing' }, data: [{ text: 'Page indexing\nLast update: 10/23/26\nNot indexed\n2\n1 reason\nIndexed\n4\nReason\n\tSource\nPages\nPage with redirect\tWebsite\t\nNot Started\n\t\t2\nRows per page:' }] }, 'x');
  assert.deepEqual(idx.map((r) => [r.metric, r.dimension_value, r.value, r.period_start]), [['indexed_pages', '', 4, '2026-10-23'], ['not_indexed_pages', '', 2, '2026-10-23'], ['not_indexed_pages', 'Page with redirect', 2, '2026-10-23']]);

  const maps = parseSearchConsole({ source: 'search-console', collected_at: at, status: 'ok', options: { view: 'sitemaps' }, data: [{ text: "Submitted sitemaps\nhttps://example.com/sitemap.xml\tSitemap\tNov 2, 2026\t\tCouldn't fetch\t0\t0\t\nRows per page:" }] }, 'x');
  assert.deepEqual(maps.map((r) => [r.metric, r.value]), [['sitemap_fetch_ok', 0], ['sitemap_discovered_pages', 0]]);
});

test('parseAppStoreConnect drops the exclusive end day and clips weeks', () => {
  const env = {
    source: 'app-store-connect', collected_at: at, status: 'ok', options: { start: '2026-10-13', end: '2026-10-21' },
    data: [
      { request: { measures: ['units'], frequency: 'day' }, results: [{ group: null, meetsThreshold: true, totals: { type: 'COUNT', value: 3 }, data: [['2026-10-19', 1], ['2026-10-20', 2], ['2026-10-21', 0]] }] },
      { request: { measures: ['pageViewUnique'], frequency: 'week', group: { dimension: 'domainReferrer' } }, results: [{ group: { title: 'example.com' }, meetsThreshold: false, totals: { type: 'AVERAGE', value: 2 }, data: [['2026-10-19', 4]] }] },
      { request: { measures: ['units'], frequency: 'week', group: { dimension: 'campaignId' } }, status: 400, error: 'bad' },
    ],
  };
  const rows = parseAppStoreConnect(env, 'x');
  assert.deepEqual(find(rows, { granularity: 'day' }).map((r) => r.period_start), ['2026-10-19', '2026-10-20']);
  assert.deepEqual(find(rows, { granularity: 'range', metric: 'units' }).map((r) => [r.period_start, r.period_end, r.value]), [['2026-10-13', '2026-10-20', 3]]);
  const week = find(rows, { granularity: 'week' })[0];
  assert.deepEqual([week.metric, week.dimension, week.dimension_value, week.period_end], ['page_view_unique', 'domain_referrer', 'example.com', '2026-10-20']);
  assert.equal(find(rows, { metric: 'page_view_unique', granularity: 'range' }).length, 0, 'AVERAGE totals are not ranges');
  assert.equal(find(rows, { metric: 'page_view_unique_below_threshold' }).length, 1);
});

test('parseAppStoreConnect leaves out days Apple has not processed', () => {
  const daily = (measure, points) => ({ request: { measures: [measure], frequency: 'day' }, results: [{ group: null, meetsThreshold: true, totals: { type: 'COUNT', value: points.reduce((n, [, v]) => n + v, 0) }, data: points }] });
  const env = {
    source: 'app-store-connect', collected_at: at, status: 'ok', options: { start: '2026-10-13', end: '2026-11-09' },
    data: [
      daily('units', [['2026-11-06', 6], ['2026-11-07', 0], ['2026-11-08', 0], ['2026-11-09', 0]]),
      daily('impressionsTotal', [['2026-11-06', 50], ['2026-11-07', 48], ['2026-11-08', 0], ['2026-11-09', 0]]),
      daily('sessions', [['2026-11-05', 3], ['2026-11-06', 0], ['2026-11-07', 0], ['2026-11-08', 0]]),
      daily('rollingActiveDevices', [['2026-11-05', 9], ['2026-11-06', 9], ['2026-11-07', 0], ['2026-11-08', 0]]),
      { request: { measures: ['units'], frequency: 'week', group: { dimension: 'source' } }, results: [{ group: { title: 'Web Referrer' }, meetsThreshold: true, totals: { type: 'COUNT', value: 6 }, data: [['2026-10-12', 1], ['2026-11-02', 5], ['2026-11-09', 0]] }] },
    ],
  };
  const rows = parseAppStoreConnect(env, 'x');
  assert.deepEqual(find(rows, { granularity: 'day', metric: 'units' }).map((r) => [r.period_start, r.value]), [['2026-11-06', 6], ['2026-11-07', 0]], 'a real zero stays; unprocessed days are left out');
  assert.equal(find(rows, { granularity: 'range', metric: 'units', dimension: '' })[0].period_end, '2026-11-07');
  assert.deepEqual(find(rows, { granularity: 'day', metric: 'sessions' }).map((r) => r.period_start), ['2026-11-05', '2026-11-06'], 'usage figures have their own last day');
  const weeks = find(rows, { granularity: 'week' }).map((r) => [r.period_start, r.period_end]);
  assert.deepEqual(weeks, [['2026-10-13', '2026-10-18'], ['2026-11-02', '2026-11-07']]);
});

test('parseGithub handles collector and legacy snapshot formats', () => {
  const repo = {
    stars: 3, forks: 1, views: { count: 5, uniques: 2, views: [{ timestamp: '2026-10-21T00:00:00Z', count: 0, uniques: 0 }, { timestamp: '2026-11-03T00:00:00Z', count: 5, uniques: 2 }] },
    clones: { clones: [] }, referrers: [{ referrer: 'example.com', count: 2, uniques: 1 }], paths: [],
    stargazers: [{ starred_at: '2026-11-01T10:00:00Z' }, { starred_at: '2026-11-01T11:00:00Z' }],
    releases: [{ tag: 'v2', assets: [{ name: 'A.zip', download_count: 4 }, { name: 'B.dmg', download_count: 1 }] }, { tag: 'v1', assets: [{ download_count: 2 }] }, { tag: 'v0', assets: [] }],
  };
  const rows = parseGithub({ source: 'github', collected_at: at, status: 'ok', data: { repos: { 'o/app': repo } } }, 'x');
  assert.equal(find(rows, { source: 'github/app', metric: 'release_downloads', dimension: '' })[0].value, 7);
  assert.equal(find(rows, { metric: 'release_downloads', dimension_value: 'v2' })[0].value, 5);
  assert.equal(find(rows, { metric: 'new_stars', period_start: '2026-11-01' })[0].value, 2);
  assert.equal(find(rows, { metric: 'release_downloads', dimension_value: 'v0' }).length, 0, 'deleted assets are unknown, not zero');
  const ref = find(rows, { metric: 'referrer_views' })[0];
  assert.deepEqual([ref.period_start, ref.period_end], ['2026-10-21', '2026-11-03'], "the window is GitHub's listed days, not today-13…today");
  const legacy = parseGithub({ recorded_at: at, repos: { 'o/app': { stars: 3, release_downloads: { v0: 0, v1: 2, v2: 5 } } } }, 'x');
  assert.equal(find(legacy, { metric: 'release_downloads', dimension: '' })[0].value, 7);
  assert.equal(find(legacy, { metric: 'release_downloads', dimension_value: 'v0' }).length, 0);
});

const cfDay = (date, pageViews, { si = 1, country = 'NO' } = {}) => ({
  date,
  byDate: pageViews ? [{ count: pageViews, sum: { visits: pageViews - 1 }, avg: { sampleInterval: si }, dimensions: { date } }] : [],
  byCountry: pageViews ? [{ count: pageViews, sum: { visits: pageViews - 1 }, avg: { sampleInterval: si }, dimensions: { countryName: country } }] : [],
  byReferer: pageViews ? [{ count: pageViews, sum: { visits: pageViews - 1 }, avg: { sampleInterval: si }, dimensions: { refererHost: '' } }] : [],
  byPath: [], byDevice: [],
});

test('parseCloudflare keeps exact days, real zeros, and the beacon start', () => {
  const env = { source: 'cloudflare', collected_at: at, status: 'ok', options: { start: '2026-10-12', end: '2026-11-08' },
    data: { days: [cfDay('2026-11-03', 9), cfDay('2026-11-04', 5), cfDay('2026-11-05', 0), cfDay('2026-11-06', 3, { country: 'CL' })] } };
  env.options.start = '2026-11-04';
  env.options.end = '2026-11-06';
  const rows = parseCloudflare(env, 'x');
  assert.deepEqual(find(rows, { granularity: 'day', metric: 'page_views' }).map((r) => [r.period_start, r.value]), [['2026-11-04', 5], ['2026-11-05', 0], ['2026-11-06', 3]], 'a day without page loads is zero; days before the beacon are unknown');
  const range = find(rows, { granularity: 'range', metric: 'visits', dimension: '' })[0];
  assert.deepEqual([range.period_start, range.period_end, range.value], ['2026-11-04', '2026-11-06', 6]);
  assert.equal(find(rows, { dimension: 'country', dimension_value: 'NO', metric: 'page_views' })[0].value, 5);
  assert.equal(find(rows, { dimension: 'referrer', metric: 'page_views' })[0].dimension_value, '(none)');
});

test('parseCloudflare rejects sampled days and ignores old 28-day envelopes', () => {
  const env = { source: 'cloudflare', collected_at: at, status: 'partial', options: { start: '2026-11-04', end: '2026-11-05' }, data: { days: [cfDay('2026-11-04', 20, { si: 10 }), cfDay('2026-11-05', 2)] } };
  const rows = parseCloudflare(env, 'x');
  assert.deepEqual(find(rows, { granularity: 'day', metric: 'page_views' }).map((r) => r.period_start), ['2026-11-05']);
  assert.equal(find(rows, { granularity: 'range' }).length, 0, 'no range total over a sampled day');
  const legacy = { source: 'cloudflare', collected_at: at, status: 'ok', options: { start: '2026-10-11', end: '2026-11-07' }, data: { viewer: { accounts: [{ byDate: [{ count: 20, sum: { visits: 20 }, dimensions: { date: '2026-11-04' } }] }] } } };
  assert.deepEqual(parseCloudflare(legacy, 'x'), []);
  assert.deepEqual(parseCloudflare({ ...env, status: 'skipped', data: null }, 'x'), []);
});

test('cloudflare collector queries each complete UTC day and flags sampling', async () => {
  const filters = [];
  const post = async (url, req) => {
    const { filter } = JSON.parse(req.body).variables;
    const day = filter.AND[0].date_geq;
    filters.push([day, filter.AND[0].date_leq]);
    const si = day === '2026-11-06' ? 10 : 1;
    return { ok: true, status: 200, json: async () => ({ data: { viewer: { accounts: [{ byDate: [{ count: 1, sum: { visits: 1 }, avg: { sampleInterval: si }, dimensions: { date: day } }], byCountry: [], byReferer: [], byPath: [], byDevice: [] }] } } }) };
  };
  // 00:30 CET on 9 November is still 8 November in UTC, so the last complete day is 7 November.
  const env = await cloudflare({ now: new Date('2026-11-08T23:30:00Z'), post, token: 't', siteTag: 's' });
  assert.deepEqual([env.options.start, env.options.end], ['2026-11-04', '2026-11-07']);
  assert.ok(filters.every(([a, b]) => a === b), 'one day per query');
  assert.equal(filters.length, 4);
  assert.equal(env.status, 'partial');
  assert.match(env.error, /2026-11-06: sampled/);
  const failing = await cloudflare({ now: new Date('2026-11-08T23:30:00Z'), post: async () => { throw new Error('offline'); }, token: 't', siteTag: 's' });
  assert.equal(failing.status, 'failed');
  assert.equal((await cloudflare({ token: null, siteTag: 's' })).status, 'skipped');
});

test('parseItunes records no average rating without ratings', () => {
  const rows = parseItunes({ source: 'itunes', collected_at: at, status: 'ok', data: { userRatingCount: 0, averageUserRating: 0, version: '1.0' } }, 'x');
  assert.deepEqual(rows.map((r) => r.metric), ['user_rating_count', 'current_version']);
});

test('parseDiscoveryReview maps receipt figures with their windows', () => {
  const rows = parseDiscoveryReview({
    recorded_at: '2026-11-04',
    ga4: { range_lifetime: '2026-09-01 to 2026-11-03', sessions: 9, source_medium_sessions: { '(direct)/(none)': 7 }, louppe_download: { events: 2, method: { app_store: 2 } } },
    search_console: { last_3_months: { clicks: 1, impressions: 5, avg_position: 3.2 } },
    app_store: { range: '2026-10-13 to 2026-11-02 (since Store release)', first_time_downloads: 4, by_source: { 'Web Referrer': { downloads: 3 } } },
  }, 'x');
  assert.equal(find(rows, { source: 'ga4', metric: 'sessions', dimension: '' })[0].period_end, '2026-11-03');
  assert.equal(find(rows, { dimension_value: '(direct) / (none)' })[0].value, 7);
  assert.equal(find(rows, { source: 'search_console', metric: 'clicks' })[0].granularity, 'approx_range');
  assert.equal(find(rows, { source: 'app_store', metric: 'units', dimension: 'source' })[0].value, 3);
  assert.ok(rows.every((r) => r.collected_at === '2026-11-04T00:00:00.000Z'));
});

test('merge keeps the newest row per key and CSV round-trips', () => {
  const base = { source: 's', granularity: 'range', period_start: '2026-10-01', period_end: '2026-10-07', metric: 'm', dimension: 'q', dimension_value: 'a, "quoted"\nline', origin: 'o' };
  const rows = merge([{ ...base, collected_at: '2026-11-01T00:00:00Z', value: 1 }], [{ ...base, collected_at: '2026-11-02T00:00:00Z', value: 2 }, { ...base, period_end: '2026-10-08', collected_at: '2026-11-01T00:00:00Z', value: 3 }]);
  assert.deepEqual(rows.map((r) => r.value).sort(), [2, 3]);
  const week = { ...base, granularity: 'week' };
  assert.equal(merge([{ ...week, collected_at: '1', value: 1 }, { ...week, period_end: '2026-10-05', collected_at: '2', value: 2 }]).length, 1, 'partial weeks are replaced');
  assert.deepEqual(fromCsv(toCsv(rows)), rows);
});

test('writeRaw never replaces an earlier collection and is idempotent', () => {
  const root = mkdtempSync(join(tmpdir(), 'louppe-raw-'));
  try {
    const first = { source: 'github', name: 'github', collected_at: '2026-11-04T02:14:17.520Z', status: 'ok', data: 1 };
    const later = { ...first, collected_at: '2026-11-04T22:48:20.205Z', status: 'failed', data: null };
    assert.equal(writeRaw(first, '2026-11-04', root), writeRaw(first, '2026-11-04', root));
    writeRaw(later, '2026-11-04', root);
    writeRaw(later, '2026-11-04', root);
    assert.deepEqual(readdirSync(join(root, '2026-11-04')).sort(), ['github.json', 'github@224820Z.json']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('normalizeStatus marks truncated or incomplete snippets partial', () => {
  assert.equal(normalizeStatus({ status: 'ok', truncated: true, data: [] }).status, 'partial');
  assert.match(normalizeStatus({ status: 'ok', data: [{ tab: 'PAGES', error: 'tab not found' }] }).error, /PAGES: tab not found/);
  assert.equal(normalizeStatus({ status: 'ok', data: [{ tab: 'TOTALS' }] }).status, 'ok');
  assert.equal(normalizeStatus({ status: 'signed_out', truncated: true }).status, 'signed_out');
});

test('summarize uses one funnel window and labels partial coverage', () => {
  const r = (source, granularity, period_start, period_end, metric, value, dimension = '', dimension_value = '') => ({ collected_at: at, source, granularity, period_start, period_end, metric, dimension, dimension_value, value, origin: 'x' });
  const days = (source, metric, from, values) => values.map((v, i) => { const d = new Date(Date.parse(`${from}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10); return r(source, 'day', d, d, metric, v); });
  const rows = [
    r('ga4', 'range', '2026-11-02', '2026-11-08', 'sessions', 10),
    r('ga4', 'range', '2026-10-26', '2026-11-01', 'sessions', 8),
    ...days('cloudflare', 'visits', '2026-11-04', [5, 0, 3, 2, 0, 0]),
    ...days('app_store', 'units', '2026-10-27', [1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2]),
    r('app_store', 'range', '2026-10-13', '2026-11-09', 'units', 40),
  ];
  const envelopes = [{ path: 'raw/2026-11-09/app-store-connect.json', env: { source: 'app-store-connect', name: 'app-store-connect', collected_at: '2026-11-09T08:00:00Z', status: 'signed_out', error: 'App Store Connect shows its sign-in page' } }];
  const md = summarize(rows, envelopes, new Date('2026-11-10T08:00:00Z'));
  assert.match(md, /## Funnel \(2026-11-02…2026-11-08\)/);
  assert.match(md, /\| Website visits \(all visitors\) \| 10 \(5 of 7 days\) \|/);
  assert.match(md, /\| Website sessions \(consented\) \| 10 \|/);
  assert.match(md, /\| Store first-time downloads \| 13 \|/);
  assert.match(md, /\| Cloudflare visits \| 10 \(6 of 7 days\) \| — \| — \| 2026-11-03…2026-11-09 \|/, 'zero days at the end keep the window current');
  assert.match(md, /\| Store first-time downloads, since release \| 40 \| 2026-10-13…2026-11-09 \|/);
  assert.match(md, /\*\*Needs Alex:\*\* sign in to App Store Connect in T3's built-in browser/);
});

test('summarize reports collection problems instead of zeros', () => {
  const envelopes = [{ path: 'raw/2026-11-04/cloudflare.json', env: { source: 'cloudflare', name: 'cloudflare', collected_at: at, status: 'skipped', error: 'no token' } }];
  const md = summarize([], envelopes, new Date(at));
  assert.match(md, /## Funnel/);
  assert.match(md, /\| cloudflare \| 2026-11-04 \| skipped \| no token \|/);
  assert.match(md, /Collection problem — cloudflare: skipped \(no token\)\. Missing data is unknown, not zero\./);
});

test('due.mjs lists missing, failed, and stale browser sources', async () => {
  const { dueSources, browserSources } = await import('./analytics/due.mjs');
  const env = (name, day, status = 'ok') => ({ env: { name, status, collected_at: `${day}T08:00:00Z` } });
  const envelopes = [
    env('app-store-connect', '2026-11-01'),
    env('app-store-connect', '2026-11-05'),
    env('ga4-landing-last28', '2026-10-30'),
    env('search-console-indexing', '2026-11-05', 'failed'),
  ];
  const { due, fresh } = dueSources(envelopes, '2026-11-05', 6);
  assert.ok(fresh.includes('app-store-connect'));
  const reasons = Object.fromEntries(due.map((d) => [d.name, d.reason]));
  assert.equal(reasons['ga4-landing-last28'], '6 days old');
  assert.equal(reasons['search-console-indexing'], 'failed');
  assert.equal(reasons['ga4-pages-last28'], 'missing');
  assert.equal(due.length + fresh.length, Object.keys(browserSources).length);
  assert.match(due.find((d) => d.name === 'ga4-pages-last28').run, /snippet\.mjs ga4 '\{"report":"pages","ranges":\["last28"\]\}'/);
});

test('due.mjs refreshes after 5 local days and retries signed-out or truncated sources', async () => {
  const { dueSources } = await import('./analytics/due.mjs');
  const env = (name, collected_at, extra = {}) => ({ env: { name, status: 'ok', collected_at, ...extra } });
  const { due, fresh } = dueSources([
    env('app-store-connect', '2026-11-04T23:30:00Z', { status: 'signed_out' }),
    env('ga4-landing-last28', '2026-11-04T08:00:00Z'),
    env('ga4-pages-last28', '2026-11-05T08:00:00Z', { truncated: true }),
    env('ga4-events-last28', '2026-11-05T08:00:00Z'),
  ], '2026-11-09');
  const reasons = Object.fromEntries(due.map((d) => [d.name, d.reason]));
  assert.equal(reasons['app-store-connect'], 'signed_out');
  assert.equal(reasons['ga4-landing-last28'], '5 days old');
  assert.equal(reasons['ga4-pages-last28'], 'truncated');
  assert.ok(fresh.includes('ga4-events-last28'));
});
