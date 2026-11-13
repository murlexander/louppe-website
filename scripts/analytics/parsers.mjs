// Pure parsers: raw envelopes -> long-format metric rows.
// Row: { collected_at, source, granularity, period_start, period_end, metric, dimension, dimension_value, value, origin }
// granularity: day | week | month | range | snapshot | approx_range (receipt figures whose exact window is unknown).
// Percentages stay 0-100; durations are seconds.
import { addDays, daysBetween } from './lib.mjs';

export const columns = ['collected_at', 'source', 'granularity', 'period_start', 'period_end', 'metric', 'dimension', 'dimension_value', 'value', 'origin'];

const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const icons = /[-]/g;

export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
export const snake = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

// "Nov 1, 2026" or "September 22, 2026" -> 2026-11-01
export function parseLongDate(s) {
  const m = /([A-Za-z]{3})[a-z]*\.? (\d{1,2}), (\d{4})/.exec(s);
  if (!m || !months[m[1].toLowerCase()]) return null;
  return `${m[3]}-${String(months[m[1].toLowerCase()]).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

// "10/23/26" -> 2026-10-23
export function parseShortDate(s) {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s);
  if (!m) return null;
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

// GA/SC cell -> number: "24 (80%)" 24, "46.67%" 46.67, "1m 5s" 65, "1,234" 1234, "—" null.
export function parseNumber(cell) {
  const s = String(cell ?? '').replace(icons, '').trim();
  if (!s || /^[—–-]$/.test(s)) return null;
  const dur = /^(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+(?:\.\d+)?)s)?$/.exec(s);
  if (dur && (dur[1] || dur[2] || dur[3])) return Number(dur[1] || 0) * 3600 + Number(dur[2] || 0) * 60 + Number(dur[3] || 0);
  const m = /^[^\d-]*(-?[\d,]*\.?\d+)/.exec(s);
  return m ? Number(m[1].replaceAll(',', '')) : null;
}

const skipHeader = (h) => /revenue|^actions$/i.test(h);

function rowMaker(env, origin) {
  return (r) => ({ collected_at: env.collected_at, source: env.source, dimension: '', dimension_value: '', origin, ...r });
}

// GA4 explorer table text (one page) -> { dimension, metrics, totals, rows: [{ value, values }] }
export function parseGa4Table(text) {
  const t = text.replace(icons, '');
  const idx = t.indexOf('\nIndex\n');
  const totalsAt = t.indexOf('Empty Summary Totals cell for Index column');
  if (idx < 0 || totalsAt < 0) return null;
  const headText = t.slice(idx + 7, t.lastIndexOf('Empty Summary Totals cell for', totalsAt - 1) > idx ? t.lastIndexOf('Empty Summary Totals cell for', totalsAt - 1) : totalsAt);
  const headers = headText.split(/\n\t\n/).map((seg) => seg.split('\n').map((l) => l.trim()).find(Boolean)).filter(Boolean);
  const [dimension, ...metrics] = headers;
  const afterTotals = t.slice(totalsAt);
  const rowStart = afterTotals.search(/\n\n\t?1\t/);
  const totalsText = (rowStart < 0 ? afterTotals : afterTotals.slice(0, rowStart)).replace(/^.*?\tTotal\t/s, '');
  const totals = totalsText.split(/\n\t\n/).map((seg) => {
    const lines = seg.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines[0]?.startsWith('Empty Summary Totals cell for')) return lines[1] ?? null;
    return lines[0] ?? null;
  });
  const rows = [];
  if (rowStart >= 0) {
    for (const chunk of afterTotals.slice(rowStart).split(/\n\s*\n(?=\t?\d+\t)/)) {
      const row = chunk.replace(/^\n+/, '');
      if (!/^\t?\d+\t/.test(row)) continue;
      let value, cells;
      if (/^\t?\d+\t\n/.test(row)) {
        const lines = row.split('\n');
        value = lines[1].trim();
        cells = lines.slice(2).join('\t').replace(/^\t/, '').split('\t');
      } else {
        const parts = row.replace(/^\t/, '').split('\n')[0].split('\t');
        value = parts[1];
        cells = parts.slice(2);
      }
      rows.push({ value: value === '' ? '(empty)' : value, values: cells });
    }
  }
  return { dimension, metrics, totals, rows };
}

// GA4 event dashboard text -> { event, totals: {event_count, total_users}, cards: [{ dimension, rows: [[value, count, users]] }] }
export function parseGa4EventDashboard(text) {
  const t = text.replace(icons, '');
  const lines = t.split('\n');
  const head = /\n([a-z0-9_]+)\nEvent count\n([\d.,]+)\nTotal users\n([\d.,]+)/.exec(t);
  const out = { event: head?.[1] || null, totals: head ? { event_count: parseNumber(head[2]), total_users: parseNumber(head[3]) } : {}, cards: [] };
  for (let i = 0; i < lines.length; i++) {
    const custom = lines[i] === 'CUSTOM PARAMETER\tEVENT COUNT\tTOTAL USERS';
    const country = lines[i] === 'COUNTRY\tEVENT COUNT';
    if (!custom && !country) continue;
    let title = country ? 'Country' : null;
    for (let j = i - 1; j >= 0 && !title; j--) if (lines[j] && !lines[j].startsWith('This card uses')) title = lines[j].trim();
    const card = { dimension: slug(title), rows: [] };
    let started = false;
    for (let j = i + 1; j < lines.length; j++) {
      const m = custom ? /^([^\t]+)\t([\d.,]+)\t([\d.,]+)$/.exec(lines[j]) : /^([^\t]+)\t([\d.,]+)$/.exec(lines[j]);
      if (m && !m[1].startsWith('(total)')) { started = true; card.rows.push([m[1], parseNumber(m[2]), custom ? parseNumber(m[3]) : null]); }
      else if (started && !lines[j].trim()) break;
    }
    out.cards.push(card);
  }
  return out;
}

export function parseGa4(env, origin) {
  const make = rowMaker({ ...env, source: 'ga4' }, origin);
  const rows = [];
  const dashboard = env.options?.report === 'download';
  for (const part of env.data || []) {
    const { start, end } = part.range;
    const base = { granularity: 'range', period_start: start, period_end: end };
    if (dashboard) {
      const d = parseGa4EventDashboard(part.pages.join('\n'));
      if (!d.event) continue;
      for (const [k, v] of Object.entries(d.totals)) if (v != null) rows.push(make({ ...base, metric: `${d.event}_${k}`, value: v }));
      for (const card of d.cards) {
        for (const [value, count, users] of card.rows) {
          rows.push(make({ ...base, metric: `${d.event}_event_count`, dimension: card.dimension, dimension_value: value, value: count }));
          if (users != null) rows.push(make({ ...base, metric: `${d.event}_total_users`, dimension: card.dimension, dimension_value: value, value: users }));
        }
      }
      continue;
    }
    const seen = new Set();
    for (const [p, page] of part.pages.entries()) {
      const table = parseGa4Table(page);
      if (!table) continue;
      const dim = slug(table.dimension);
      table.metrics.forEach((m, i) => {
        if (p > 0 || skipHeader(m)) return;
        const v = parseNumber(table.totals[i]);
        if (v != null) rows.push(make({ ...base, metric: slug(m), value: v }));
      });
      for (const r of table.rows) {
        if (seen.has(r.value)) continue;
        seen.add(r.value);
        table.metrics.forEach((m, i) => {
          if (skipHeader(m)) return;
          const v = parseNumber(r.values[i]);
          if (v != null) rows.push(make({ ...base, metric: slug(m), dimension: dim, dimension_value: r.value, value: v }));
        });
      }
    }
  }
  return rows;
}

const scDimensions = { QUERIES: 'query', PAGES: 'page', COUNTRIES: 'country', DEVICES: 'device', DAYS: 'date' };

// Search Console table text -> { metrics, rows: [[value, ...numbers]] }
export function parseSearchConsoleTable(text) {
  const t = text.replace(icons, '');
  const end = t.indexOf('Rows per page');
  const body = end < 0 ? t : t.slice(0, end);
  const blocks = body.split(/\n\n/);
  const headerIdx = blocks.findIndex((b) => /\n\t\nClicks/.test(b) || /^\s*[^\n]+\n\t\nClicks/.test(b));
  const header = (blocks[headerIdx] || '').trim().split(/\n\t\n/).map((h) => h.trim());
  const metrics = header.slice(1).map(slug);
  const rows = [];
  for (const line of blocks.slice(headerIdx + 1).join('\n').split('\n')) {
    const cells = line.split('\t');
    if (cells.length < metrics.length + 1) continue;
    const values = cells.slice(-metrics.length);
    rows.push([cells.slice(0, -metrics.length).join('\t'), ...values.map(parseNumber)]);
  }
  return { metrics, rows };
}

export function parseSearchConsole(env, origin) {
  const make = rowMaker({ ...env, source: 'search_console' }, origin);
  const rows = [];
  const view = env.options?.view;
  const day = env.collected_at.slice(0, 10);
  for (const part of env.data || []) {
    const text = (part.text || '').replace(icons, '');
    if (view === 'sitemaps') {
      for (const line of text.split('\n')) {
        const c = line.split('\t');
        if (!/^https?:\/\//.test(c[0]) || c.length < 6) continue;
        const base = { granularity: 'snapshot', period_start: day, period_end: day, dimension: 'sitemap', dimension_value: c[0] };
        rows.push(make({ ...base, metric: 'sitemap_fetch_ok', value: /success/i.test(c[4]) ? 1 : 0 }));
        rows.push(make({ ...base, metric: 'sitemap_discovered_pages', value: parseNumber(c[5]) ?? 0 }));
      }
    } else if (view === 'indexing') {
      const updated = parseShortDate(/Last update:\s*([\d/]+)/.exec(text)?.[1] || '') || day;
      const base = { granularity: 'snapshot', period_start: updated, period_end: updated };
      const indexed = /\nIndexed\n(\d+)/.exec(text);
      const notIndexed = /\nNot indexed\n(\d+)/.exec(text);
      if (indexed) rows.push(make({ ...base, metric: 'indexed_pages', value: Number(indexed[1]) }));
      if (notIndexed) rows.push(make({ ...base, metric: 'not_indexed_pages', value: Number(notIndexed[1]) }));
      for (const m of text.matchAll(/\n([^\n\t]+)\t(Website|Google systems|Google)\t[\s\S]*?\n\t\t(\d+)/g)) {
        rows.push(make({ ...base, metric: 'not_indexed_pages', dimension: 'reason', dimension_value: m[1].trim(), value: Number(m[3]) }));
      }
    }
  }
  if (view !== 'performance') return rows;
  const totals = (env.data || []).find((p) => p.tab === 'TOTALS');
  const caption = /from ([A-Z][a-z]+ \d{1,2}, \d{4}) to ([A-Z][a-z]+ \d{1,2}, \d{4})/.exec(totals?.text || '');
  const range = { granularity: 'range', period_start: parseLongDate(caption?.[1] || ''), period_end: parseLongDate(caption?.[2] || '') };
  if (!range.period_start) Object.assign(range, { granularity: 'approx_range', period_start: addDays(day, -92), period_end: addDays(day, -2) });
  const t = (totals?.text || '').replace(icons, '');
  for (const [label, metric] of [['Total clicks', 'clicks'], ['Total impressions', 'impressions'], ['Average CTR', 'ctr'], ['Average position', 'position']]) {
    const m = new RegExp(`${label}\\n+([\\d.,]+%?)`).exec(t);
    if (m) rows.push(make({ ...range, metric, value: parseNumber(m[1]) }));
  }
  for (const part of env.data || []) {
    const dim = scDimensions[part.tab];
    if (!dim) continue;
    const seen = new Set();
    for (const page of part.pages || []) {
      const table = parseSearchConsoleTable(page);
      for (const [value, ...nums] of table.rows) {
        if (seen.has(value)) continue;
        seen.add(value);
        table.metrics.forEach((metric, i) => {
          if (nums[i] == null) return;
          if (dim === 'date') {
            const d = parseLongDate(value);
            if (d) rows.push(make({ granularity: 'day', period_start: d, period_end: d, metric, value: nums[i] }));
          } else rows.push(make({ ...range, metric, dimension: dim, dimension_value: value, value: nums[i] }));
        });
      }
    }
  }
  return rows;
}

// Apple returns zeros for days it has not processed yet (1–2 days). The last processed day is the last
// day with any non-zero daily total in that family; later days are left out (unknown, not zero) and
// ranges end there. Store-funnel figures and opt-in usage figures are processed separately.
const usageMeasures = new Set(['installs', 'sessions', 'activeDevices', 'rollingActiveDevices', 'uninstalls', 'crashes']);
const familyOf = (measure) => (usageMeasures.has(measure) ? 'usage' : 'store');

export function lastProcessedDays(env) {
  const { end } = env.options || {};
  const last = {};
  for (const resp of env.data || []) {
    if (resp.error || !resp.results || resp.request.group || resp.request.frequency !== 'day') continue;
    const family = familyOf(resp.request.measures[0]);
    for (const r of resp.results) {
      for (const [date, value] of r.data || []) {
        if (value && (!end || date < end) && !(date <= (last[family] || ''))) last[family] = date;
      }
    }
  }
  const fallback = end ? addDays(end, -1) : null;
  last.store ||= fallback;
  last.usage ||= last.store;
  return last;
}

export function parseAppStoreConnect(env, origin) {
  const make = rowMaker({ ...env, source: 'app_store' }, origin);
  const rows = [];
  const { start } = env.options || {};
  const processed = lastProcessedDays(env);
  for (const resp of env.data || []) {
    if (resp.error || !resp.results) continue;
    const measure = resp.request.measures[0];
    const metric = snake(measure);
    const last = processed[familyOf(measure)];
    const dimension = resp.request.group ? snake(resp.request.group.dimension) : '';
    const freq = resp.request.frequency;
    for (const r of resp.results) {
      const dv = r.group?.title ?? '';
      for (const [date, value] of r.data || []) {
        if (value == null || (last && date > last)) continue;
        let periodEnd = freq === 'week' ? addDays(date, 6) : date;
        if (freq === 'month') periodEnd = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7), 0)).toISOString().slice(0, 10);
        if (last && periodEnd > last) periodEnd = last;
        const periodStart = start && date < start ? start : date;
        rows.push(make({ granularity: freq, period_start: periodStart, period_end: periodEnd, metric, dimension, dimension_value: dv, value }));
      }
      if (r.totals?.type === 'COUNT' && start && last) {
        rows.push(make({ granularity: 'range', period_start: start, period_end: last, metric, dimension, dimension_value: dv, value: r.totals.value }));
      }
      if (r.meetsThreshold === false) {
        rows.push(make({ granularity: 'range', period_start: start, period_end: last, metric: `${metric}_below_threshold`, dimension, dimension_value: dv, value: 1 }));
      }
    }
  }
  return rows;
}

// Accepts the collector envelope ({data: {repos}}) and the older snapshot ({recorded_at, repos}).
export function parseGithub(env, origin) {
  const collected = env.collected_at || env.recorded_at;
  const repos = env.data?.repos || env.repos || {};
  const day = collected.slice(0, 10);
  const rows = [];
  for (const [full, r] of Object.entries(repos)) {
    const make = rowMaker({ collected_at: collected, source: `github/${full.split('/')[1]}` }, origin);
    const snap = { granularity: 'snapshot', period_start: day, period_end: day };
    for (const k of ['stars', 'forks', 'watchers']) if (r[k] != null) rows.push(make({ ...snap, metric: k, value: r[k] }));
    // Releases whose assets were deleted (v1.0–v1.10) have unknown downloads, not zero; the legacy
    // snapshot recorded those as 0, so its zeros are skipped too.
    const releases = r.releases
      ? r.releases.filter((x) => x.assets.length).map((x) => [x.tag, x.assets.reduce((n, a) => n + a.download_count, 0)])
      : Object.entries(r.release_downloads || {}).filter(([, v]) => v > 0);
    if (releases.length) {
      rows.push(make({ ...snap, metric: 'release_downloads', value: releases.reduce((n, [, v]) => n + v, 0) }));
      for (const [tag, v] of releases) rows.push(make({ ...snap, metric: 'release_downloads', dimension: 'release', dimension_value: tag, value: v }));
    }
    for (const [key, list, count, unique] of [['views', 'views', 'views', 'unique_visitors'], ['clones', 'clones', 'clones', 'unique_cloners']]) {
      const series = r[key]?.[list] || [];
      for (const p of series) {
        const d = p.timestamp.slice(0, 10);
        rows.push(make({ granularity: 'day', period_start: d, period_end: d, metric: count, value: p.count }));
        rows.push(make({ granularity: 'day', period_start: d, period_end: d, metric: unique, value: p.uniques }));
      }
    }
    // GitHub's 14 days are the days its views series lists (UTC, ending yesterday or earlier), not today-13…today.
    const listed = (r.views?.views || []).map((p) => p.timestamp.slice(0, 10)).sort();
    const window = { granularity: 'range', period_start: listed[0] || addDays(day, -14), period_end: listed.at(-1) || addDays(day, -1) };
    if (r.views?.count != null) {
      rows.push(make({ ...window, metric: 'views', value: r.views.count }));
      rows.push(make({ ...window, metric: 'unique_visitors', value: r.views.uniques }));
    }
    for (const ref of r.referrers || []) {
      rows.push(make({ ...window, metric: 'referrer_views', dimension: 'referrer', dimension_value: ref.referrer, value: ref.count }));
      rows.push(make({ ...window, metric: 'referrer_unique_visitors', dimension: 'referrer', dimension_value: ref.referrer, value: ref.uniques }));
    }
    for (const p of r.paths || []) rows.push(make({ ...window, metric: 'path_views', dimension: 'path', dimension_value: p.path, value: p.count }));
    if (r.stargazers) {
      const perDay = {};
      for (const s of r.stargazers) if (s.starred_at) perDay[s.starred_at.slice(0, 10)] = (perDay[s.starred_at.slice(0, 10)] || 0) + 1;
      for (const [d, n] of Object.entries(perDay)) rows.push(make({ granularity: 'day', period_start: d, period_end: d, metric: 'new_stars', value: n }));
    }
  }
  return rows;
}

// The Cloudflare beacon went live on 2026-11-04 (about 05:50 CET); earlier days are unknown, not zero.
export const cloudflareSince = '2026-11-04';
const cloudflareDims = [['byCountry', 'country', 'countryName'], ['byReferer', 'referrer', 'refererHost'], ['byPath', 'path', 'requestPath'], ['byDevice', 'device', 'deviceType']];

// Envelopes from before 2026-11-09 held one 28-day query that Cloudflare answered with 10% sampled
// estimates, so they are ignored; the per-day collector (data.days) supersedes them. Day rows only, with
// their breakdowns: Cloudflare later samples even single days, so each raw file holds only days not yet
// collected exactly, and finishCloudflare derives the ranges from the merged days.
export function parseCloudflare(env, origin) {
  if (!['ok', 'partial'].includes(env.status) || !Array.isArray(env.data?.days)) return [];
  const make = rowMaker({ ...env, source: 'cloudflare' }, origin);
  const start = [env.options.start, cloudflareSince].sort().at(-1);
  const { end } = env.options;
  const rows = [];
  for (const d of env.data.days) {
    if (d.date < start || d.date > end) continue;
    const groups = [d.byDate, ...cloudflareDims.map(([k]) => d[k])].flat().filter(Boolean);
    if (groups.some((g) => (g.avg?.sampleInterval ?? 0) !== 1)) continue; // sampled or unknown sampling
    const day = { granularity: 'day', period_start: d.date, period_end: d.date };
    const pv = (d.byDate || []).reduce((n, g) => n + g.count, 0);
    const v = (d.byDate || []).reduce((n, g) => n + (g.sum?.visits ?? 0), 0);
    rows.push(make({ ...day, metric: 'page_views', value: pv }), make({ ...day, metric: 'visits', value: v }));
    for (const [key, dim, field] of cloudflareDims) {
      const byValue = new Map();
      for (const g of d[key] || []) {
        const k = g.dimensions[field] || '(none)';
        const t = byValue.get(k) || { page_views: 0, visits: 0 };
        t.page_views += g.count;
        t.visits += g.sum?.visits ?? 0;
        byValue.set(k, t);
      }
      for (const [dimension_value, t] of byValue) for (const [metric, value] of Object.entries(t)) rows.push(make({ ...day, metric, dimension: dim, dimension_value, value }));
    }
  }
  return rows;
}

// Range totals and breakdowns over the latest up-to-28 merged Cloudflare days, only when every day of the
// window is exact; a gap ends the window just after it.
export function finishCloudflare(rows) {
  const totals = rows.filter((r) => r.source === 'cloudflare' && r.granularity === 'day' && !r.dimension && r.metric === 'visits');
  const days = new Set(totals.map((r) => r.period_start));
  const end = [...days].sort().at(-1);
  if (!end) return rows;
  let start = end;
  while (daysBetween(start, end) < 27 && addDays(start, -1) >= cloudflareSince && days.has(addDays(start, -1))) start = addDays(start, -1);
  const sums = new Map();
  for (const r of rows) {
    if (r.source !== 'cloudflare' || r.granularity !== 'day' || r.period_start < start || r.period_start > end) continue;
    const k = [r.metric, r.dimension, r.dimension_value].join('\u0001');
    const prev = sums.get(k) || { value: 0, collected_at: '' };
    sums.set(k, { value: prev.value + r.value, collected_at: r.collected_at > prev.collected_at ? r.collected_at : prev.collected_at });
  }
  const derived = [...sums].map(([k, { value, collected_at }]) => {
    const [metric, dimension, dimension_value] = k.split('\u0001');
    return { collected_at, source: 'cloudflare', granularity: 'range', period_start: start, period_end: end, metric, dimension, dimension_value, value, origin: 'derived from cloudflare day rows' };
  });
  return [...rows, ...derived];
}

export function parseItunes(env, origin) {
  if (env.status !== 'ok' || !env.data) return [];
  const make = rowMaker({ ...env, source: 'itunes' }, origin);
  const day = env.collected_at.slice(0, 10);
  const snap = { granularity: 'snapshot', period_start: day, period_end: day };
  const a = env.data;
  const rows = [make({ ...snap, metric: 'user_rating_count', value: a.userRatingCount ?? 0 })];
  if (a.userRatingCount > 0 && a.averageUserRating != null) rows.push(make({ ...snap, metric: 'average_user_rating', value: a.averageUserRating }));
  if (a.version) rows.push(make({ ...snap, metric: 'current_version', dimension: 'version', dimension_value: a.version, value: 1 }));
  return rows;
}

// Hand-written discovery-review receipts (analytics/receipts/discovery-review-*.json) recorded before the collectors existed.
export function parseDiscoveryReview(json, origin) {
  const date = json.recorded_at.slice(0, 10);
  const collected_at = `${date}T00:00:00.000Z`;
  const rows = [];
  const add = (source, granularity, period_start, period_end, metric, value, dimension = '', dimension_value = '') => {
    if (typeof value === 'number') rows.push({ collected_at, source, granularity, period_start, period_end, metric, dimension, dimension_value, value, origin });
  };
  const sm = (k) => k.replace(/\s*\/\s*/, ' / ');
  const g = json.ga4 || {};
  const span = (s) => /(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/.exec(s || '')?.slice(1);
  const r1 = span(g.range);
  if (r1) {
    for (const k of ['sessions', 'engaged_sessions', 'key_events']) add('ga4', 'range', ...r1, k, g[k]);
    for (const [k, v] of Object.entries(g.channels || {})) add('ga4', 'range', ...r1, 'sessions', v, 'session_primary_channel_group', k);
    for (const [k, v] of Object.entries(g.views_by_page || {})) add('ga4', 'range', ...r1, 'views', v, 'page_path_and_screen_class', k);
  }
  const life = span(g.range_lifetime);
  if (life) {
    add('ga4', 'range', ...life, 'total_users', g.users);
    add('ga4', 'range', ...life, 'sessions', g.sessions);
    add('ga4', 'range', ...life, 'views', g.page_views);
    for (const [k, v] of Object.entries(g.source_medium_sessions || {})) add('ga4', 'range', ...life, 'sessions', v, 'session_source_medium', sm(k));
    const dl = g.louppe_download || {};
    add('ga4', 'range', ...life, 'louppe_download_event_count', dl.events);
    add('ga4', 'range', ...life, 'louppe_download_total_users', dl.users);
    for (const [card, dim] of [['method', 'download_method'], ['placement', 'download_placement'], ['country', 'country']]) {
      for (const [k, v] of Object.entries(dl[card] || {})) add('ga4', 'range', ...life, 'louppe_download_event_count', v, dim, k);
    }
    for (const [k, v] of Object.entries(g.users_by_country_top || {})) add('ga4', 'range', ...life, 'active_users', v, 'country', k);
  }
  const r28 = /^(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2}): (\d+) sessions, (\d+) users, (\d+) key events/.exec(g.range_28d || '');
  if (r28) {
    add('ga4', 'range', r28[1], r28[2], 'sessions', Number(r28[3]));
    add('ga4', 'range', r28[1], r28[2], 'total_users', Number(r28[4]));
    add('ga4', 'range', r28[1], r28[2], 'key_events', Number(r28[5]));
  }
  const sc = json.search_console || {};
  const approx = (days) => [addDays(date, -days - 1), addDays(date, -2)];
  for (const [k, days] of [['last_3_months', 92], ['last_28_days', 28]]) {
    const b = sc[k];
    if (!b) continue;
    for (const m of ['clicks', 'impressions']) add('search_console', 'approx_range', ...approx(days), m, b[m]);
    add('search_console', 'approx_range', ...approx(days), 'position', b.avg_position);
  }
  for (const [page, [clicks, impressions]] of Object.entries(sc.pages_with_impressions || {})) {
    const url = `https://louppe.eu${page}`;
    add('search_console', 'approx_range', ...approx(92), 'clicks', clicks, 'page', url);
    add('search_console', 'approx_range', ...approx(92), 'impressions', impressions, 'page', url);
  }
  const gh = json.github || {};
  const repo = 'github/louppe-media-culler';
  for (const k of ['stars', 'forks']) add(repo, 'snapshot', date, date, k, gh[k]);
  add(repo, 'approx_range', addDays(date, -14), addDays(date, -1), 'views', gh.views_14d);
  add(repo, 'approx_range', addDays(date, -14), addDays(date, -1), 'unique_visitors', gh.unique_14d);
  for (const [k, v] of Object.entries(gh.referrers || {})) add(repo, 'approx_range', addDays(date, -14), addDays(date, -1), 'referrer_views', v, 'referrer', k);
  const tags = Object.entries(gh).filter(([k, v]) => /^v[\d.]+_zip_downloads$/.test(k) && v > 0);
  for (const [k, v] of tags) add(repo, 'snapshot', date, date, 'release_downloads', v, 'release', k.replace('_zip_downloads', ''));
  if (tags.length) add(repo, 'snapshot', date, date, 'release_downloads', tags.reduce((n, [, v]) => n + v, 0));
  const as = json.app_store || {};
  const ar = span(as.range?.replace(/ \(.*/, ''));
  if (ar) {
    const m = { first_time_downloads: 'units', redownloads: 'redownloads', updates: 'updates', impressions: 'impressions_total', product_page_views: 'page_view_count' };
    for (const [k, metric] of Object.entries(m)) add('app_store', 'range', ...ar, metric, as[k]);
    for (const [k, v] of Object.entries(as.by_source || {})) add('app_store', 'range', ...ar, 'units', v.downloads, 'source', k);
    for (const [k, v] of Object.entries(as.web_referrer_domains || {})) add('app_store', 'range', ...ar, 'units', v, 'domain_referrer', k);
    for (const [k, v] of Object.entries(as.top_storefronts || {})) add('app_store', 'range', ...ar, 'units', v, 'storefront', k);
  }
  if (typeof as.ratings === 'number') add('itunes', 'snapshot', date, date, 'user_rating_count', as.ratings);
  return rows;
}

// ---------- App Store Connect API analytics reports (asc-reports.mjs) ----------
// Source `app_store_reports`, kept apart from the dashboard's `app_store` so neither silently replaces
// the other; the summary reads whichever has the later processed day. Day rows only; ingest derives
// the since-release ranges with deriveStoreReportRanges, because each raw file holds only new days.
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const territory = (code) => { try { return /^[A-Z]{2}$/.test(code) ? regionNames.of(code) : code; } catch { return code; } };
const count = (v) => { const n = Number(String(v ?? '').replaceAll(',', '')); return v !== '' && Number.isFinite(n) ? n : null; };
const cellOf = (row, re) => { const k = Object.keys(row).find((h) => re.test(h)); return k ? row[k] : ''; };
const isoDay = (s) => (/^\d{4}-\d{2}-\d{2}/.test(s || '') ? s.slice(0, 10) : parseShortDate(s || ''));

const storeReports = {
  'App Downloads Standard': {
    zeros: ['units', 'redownloads', 'updates'],
    metrics: (r) => [[{ first_time_download: 'units', redownload: 'redownloads', manual_update: 'updates', auto_update: 'updates', restore: 'restores' }[slug(r['Download Type'])] || `downloads_${slug(r['Download Type']) || 'unknown'}`, count(r.Counts)]],
    split: ['units', 'redownloads'],
  },
  'App Store Discovery and Engagement Standard': {
    zeros: ['impressions_total', 'page_view_count'],
    // The dashboard's product page views are Page view events on the product page only; screenshot and
    // video views (Page Type "Media view", source Unavailable) and other pages get their own metrics.
    metrics: (r) => {
      const event = slug(r.Event || '');
      const page = slug(r['Page Type'] || '');
      if (event === 'page_view' && page !== 'product_page') return [[`${page.replace(/_view$/, '') || 'unknown'}_view_count`, count(r.Counts)]];
      return [[{ impression: 'impressions_total', page_view: 'page_view_count' }[event] || `${event || 'unknown'}_count`, count(r.Counts)]];
    },
    split: ['impressions_total', 'page_view_count'],
  },
  'App Store Installation and Deletion Standard': {
    zeros: ['installs', 'uninstalls'],
    metrics: (r) => [[{ install: 'installs', delete: 'uninstalls' }[slug(r.Event)] || `${slug(r.Event) || 'unknown'}_count`, count(r.Counts)]],
  },
  'App Sessions Standard': {
    zeros: ['sessions'],
    metrics: (r) => [['sessions', count(r.Sessions)], ['session_duration_seconds', count(cellOf(r, /session duration/i))]],
  },
  'App Crashes': { zeros: ['crashes'], metrics: (r) => [['crashes', count(r.Crashes)]] },
  'App Store Purchases Standard': {
    zeros: ['iap'],
    metrics: (r) => [['iap', count(cellOf(r, /^purchases$/i))], ['proceeds_usd', count(cellOf(r, /proceeds.*usd/i))]],
  },
};

// Breakdowns kept for the split metrics, named like the dashboard's.
function storeDimensions(r) {
  const type = r['Source Type'] || '';
  const info = r['Source Info'] || '';
  return [
    ['source', type],
    ['storefront', territory(r.Territory || '')],
    ['device', r.Device || ''],
    ['campaign_id', r.Campaign || ''],
    [/web/i.test(type) ? 'domain_referrer' : /app ref/i.test(type) ? 'app_referrer' : '', info],
  ].filter(([d, v]) => d && v && !/^(none|null|unavailable)$/i.test(v));
}

export function parseAppStoreReports(env, origin) {
  const make = rowMaker({ ...env, source: 'app_store_reports' }, origin);
  // The newest instance per report and day wins (ONGOING over the one-time snapshot on the same date).
  const order = (i) => `${i.processing_date}|${i.access_type === 'ONGOING' ? 1 : 0}`;
  const instances = [...(env.data?.instances || [])].filter((i) => storeReports[i.report]).sort((a, b) => order(a).localeCompare(order(b)));
  const owner = new Map();
  const daysOf = (i) => {
    const d = [...new Set(i.rows.map((r) => isoDay(r.Date)).filter(Boolean))];
    if (d.length || !i.processing_date) return d;
    // An empty instance is a processed day with nothing to count. A daily (ONGOING) instance's rows end
    // the day before its processing_date (it restates the last 2–3 days); a snapshot's include that day.
    if (i.access_type !== 'ONGOING') return [i.processing_date];
    const prev = new Date(`${i.processing_date}T00:00:00Z`);
    prev.setUTCDate(prev.getUTCDate() - 1);
    return [prev.toISOString().slice(0, 10)];
  };
  for (const i of instances) for (const d of daysOf(i)) owner.set(`${i.report}|${d}`, i.instance_id);
  const sums = new Map();
  const add = (d, metric, dimension, dv, v) => {
    const k = [d, metric, dimension, dv].join('\u0001');
    sums.set(k, (sums.get(k) || 0) + v);
  };
  for (const i of instances) {
    const spec = storeReports[i.report];
    for (const d of daysOf(i)) {
      if (owner.get(`${i.report}|${d}`) !== i.instance_id) continue;
      for (const m of spec.zeros) add(d, m, '', '', 0);
    }
    for (const r of i.rows) {
      const d = isoDay(r.Date);
      if (!d || owner.get(`${i.report}|${d}`) !== i.instance_id) continue;
      for (const [metric, v] of spec.metrics(r)) {
        if (v == null) continue;
        add(d, metric, '', '', v);
        if (spec.split?.includes(metric)) for (const [dim, dv] of storeDimensions(r)) add(d, metric, dim, dv, v);
      }
    }
  }
  return [...sums].map(([k, value]) => {
    const [d, metric, dimension, dv] = k.split('\u0001');
    return make({ granularity: 'day', period_start: d, period_end: d, metric, dimension, dimension_value: dv, value });
  });
}

// Two raw files can hold the same day (the snapshot and the ongoing feed); keep only the newest file's
// rows for each metric and day, so a breakdown only the older file has is not counted twice. Then add
// since-first-day totals.
export function finishStoreReports(rows) {
  const newest = new Map();
  const key = (r) => `${r.metric}|${r.period_start}`;
  for (const r of rows) if (r.source === 'app_store_reports' && r.granularity === 'day' && !(r.collected_at <= (newest.get(key(r)) || ''))) newest.set(key(r), r.collected_at);
  const kept = rows.filter((r) => !(r.source === 'app_store_reports' && r.granularity === 'day' && r.collected_at !== newest.get(key(r))));
  return [...kept, ...deriveStoreReportRanges(kept)];
}

// Since-first-day totals over the merged day rows, per metric and breakdown. A breakdown with no rows
// on a day counted zero, so it sums over the same window as its metric's total.
export function deriveStoreReportRanges(rows) {
  const days = rows.filter((r) => r.source === 'app_store_reports' && r.granularity === 'day');
  const span = new Map();
  for (const r of days.filter((x) => !x.dimension)) {
    const s = span.get(r.metric) || { start: r.period_start, end: r.period_start, days: 0 };
    s.start = r.period_start < s.start ? r.period_start : s.start;
    s.end = r.period_start > s.end ? r.period_start : s.end;
    s.days++;
    span.set(r.metric, s);
  }
  const sums = new Map();
  for (const r of days) {
    if (!span.has(r.metric)) continue;
    const k = [r.metric, r.dimension, r.dimension_value].join('\u0001');
    const prev = sums.get(k) || { value: 0, collected_at: '' };
    sums.set(k, { value: prev.value + r.value, collected_at: r.collected_at > prev.collected_at ? r.collected_at : prev.collected_at });
  }
  return [...sums].map(([k, { value, collected_at }]) => {
    const [metric, dimension, dimension_value] = k.split('\u0001');
    const { start, end } = span.get(metric);
    return { collected_at, source: 'app_store_reports', granularity: 'range', period_start: start, period_end: end, metric, dimension, dimension_value, value, origin: 'derived from app_store_reports day rows' };
  });
}

export function parseEnvelope(env, origin) {
  if (env.recorded_at && (env.ga4 || env.search_console || env.app_store)) return parseDiscoveryReview(env, origin);
  if (env.recorded_at && env.repos) return parseGithub(env, origin);
  if (!['ok', 'partial'].includes(env.status)) return [];
  switch (env.source) {
    case 'ga4': return parseGa4(env, origin);
    case 'search-console': return parseSearchConsole(env, origin);
    case 'app-store-connect': return parseAppStoreConnect(env, origin);
    case 'app-store-reports': return parseAppStoreReports(env, origin);
    case 'github': return parseGithub(env, origin);
    case 'cloudflare': return parseCloudflare(env, origin);
    case 'itunes': return parseItunes(env, origin);
    default: return [];
  }
}
