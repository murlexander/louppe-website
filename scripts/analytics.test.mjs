// Parser tests for scripts/analytics/. Fixtures are synthetic; no real visitor data.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fromCsv, merge, summarize, toCsv } from './analytics/ingest.mjs';
import {
  parseAppStoreConnect, parseCloudflare, parseDiscoveryReview, parseGa4, parseGa4EventDashboard,
  parseGa4Table, parseGithub, parseLongDate, parseNumber, parseSearchConsole,
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

test('parseGithub handles collector and legacy snapshot formats', () => {
  const repo = {
    stars: 3, forks: 1, views: { count: 5, uniques: 2, views: [{ timestamp: '2026-11-01T00:00:00Z', count: 5, uniques: 2 }] },
    clones: { clones: [] }, referrers: [{ referrer: 'example.com', count: 2, uniques: 1 }], paths: [],
    stargazers: [{ starred_at: '2026-11-01T10:00:00Z' }, { starred_at: '2026-11-01T11:00:00Z' }],
    releases: [{ tag: 'v2', assets: [{ name: 'A.zip', download_count: 4 }, { name: 'B.dmg', download_count: 1 }] }, { tag: 'v1', assets: [{ download_count: 2 }] }],
  };
  const rows = parseGithub({ source: 'github', collected_at: at, status: 'ok', data: { repos: { 'o/app': repo } } }, 'x');
  assert.equal(find(rows, { source: 'github/app', metric: 'release_downloads', dimension: '' })[0].value, 7);
  assert.equal(find(rows, { metric: 'release_downloads', dimension_value: 'v2' })[0].value, 5);
  assert.equal(find(rows, { metric: 'new_stars', period_start: '2026-11-01' })[0].value, 2);
  assert.equal(find(rows, { metric: 'referrer_views' })[0].period_start, '2026-10-22');
  const legacy = parseGithub({ recorded_at: at, repos: { 'o/app': { stars: 3, release_downloads: { v1: 2, v2: 5 } } } }, 'x');
  assert.equal(find(legacy, { metric: 'release_downloads', dimension: '' })[0].value, 7);
});

test('parseCloudflare treats an empty result as unknown, not zero', () => {
  const empty = { source: 'cloudflare', collected_at: at, status: 'ok', options: { start: '2026-10-01', end: '2026-10-28' }, data: { viewer: { accounts: [{ byDate: [] }] } } };
  assert.deepEqual(parseCloudflare(empty, 'x'), []);
  const full = { ...empty, data: { viewer: { accounts: [{ byDate: [{ count: 4, sum: { visits: 3 }, dimensions: { date: '2026-10-02' } }], byReferer: [{ count: 2, sum: { visits: 2 }, dimensions: { refererHost: '' } }] }] } } };
  const rows = parseCloudflare(full, 'x');
  assert.equal(find(rows, { granularity: 'range', metric: 'visits', dimension: '' })[0].value, 3);
  assert.equal(find(rows, { dimension: 'referrer' })[0].dimension_value, '(none)');
  assert.deepEqual(parseCloudflare({ ...empty, status: 'skipped', data: null }, 'x'), []);
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

test('summarize reports collection problems instead of zeros', () => {
  const envelopes = [{ path: 'raw/2026-11-04/cloudflare.json', env: { source: 'cloudflare', name: 'cloudflare', collected_at: at, status: 'skipped', error: 'no token' } }];
  const md = summarize([], envelopes, new Date(at));
  assert.match(md, /## Funnel/);
  assert.match(md, /\| cloudflare \| 2026-11-04 \| skipped \| no token \|/);
  assert.match(md, /Collection problem — cloudflare: skipped \(no token\)\. Missing data is unknown, not zero\./);
});
