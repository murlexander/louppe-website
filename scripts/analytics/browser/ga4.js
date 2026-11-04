// GA4 report reader for preview_evaluate on a signed-in analytics.google.com tab.
// Downloads its result and returns a short status; import with node scripts/analytics/save.mjs --downloads.
// Print a ready expression with: node scripts/analytics/snippet.mjs ga4 '{"report":"traffic","ranges":["last7","prev7"]}'
// Reports: traffic, landing, events, countries, pages, search-queries, download (louppe_download event cards).
// Ranges: last7, prev7, last28, lifetime (2026-09-01 on), or {"start":"YYYY-MM-DD","end":"YYYY-MM-DD"}; days end yesterday.
// It changes the SPA hash per range and returns the visible report text; ingest.mjs parses it.
// Stops before ~12 s and lists unfinished ranges in `remaining`; run again with those.
async (opts = {}) => {
  const finish = (env) => {
    env.louppe_stats = 1;
    if (opts.download !== false && env.status !== 'navigating') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(env)], { type: 'application/json' }));
      a.download = `${env.name}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return { source: env.source, name: env.name, status: env.status, error: env.error, remaining: env.remaining, downloaded: true, items: env.data?.length };
    }
    return env;
  };
  const started = Date.now();
  const budget = opts.budgetMs || 12000;
  const property = opts.property || 'a352736288p555464552';
  const reports = {
    traffic: { r: 'lifecycle-traffic-acquisition-v2', seldim: 'sessionSourceMedium' },
    landing: { r: 'landing-page' },
    events: { r: 'top-events' },
    countries: { r: 'user-demographics-detail', seldim: 'country' },
    pages: { r: 'all-pages-and-screens' },
    'search-queries': { r: 'search-query' },
    download: { r: 'events-overview', dashboard: true, event: 'louppe_download' },
  };
  const report = opts.report || 'traffic';
  const cfg = reports[report];
  if (!cfg) return finish({ source: 'ga4', status: 'failed', error: `Unknown report ${report}` });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const day = (offset) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + offset); return iso(d); };
  const named = { last7: [day(-7), day(-1)], prev7: [day(-14), day(-8)], last28: [day(-28), day(-1)], lifetime: ['2026-09-01', day(-1)] };
  const resolve = (r) => (typeof r === 'string' ? { label: r, start: named[r][0], end: named[r][1] } : { label: `${r.start}_${r.end}`, ...r });
  const ranges = (opts.ranges || ['last28']).map(resolve);
  const envelope = {
    source: 'ga4', name: `ga4-${report}-${ranges.map((r) => r.label).join('+')}`,
    collected_at: new Date().toISOString(), status: 'ok', options: { property, report, ranges }, data: [], remaining: [],
  };
  if (location.hostname !== 'analytics.google.com') {
    location.href = 'https://analytics.google.com/analytics/web/';
    return finish({ ...envelope, status: 'navigating', error: 'Opened analytics.google.com; run the snippet again.' });
  }
  // Dashboards load the custom-parameter cards last; wait for them.
  const marker = cfg.dashboard ? 'CUSTOM PARAMETER\tEVENT COUNT' : 'Empty Summary Totals cell for Index column';
  // GA shows the range as "Oct 6 - Nov 3, 2026" or "Oct 21 - 27, 2026"; require the new end date.
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const endLabels = (end) => {
    const [y, m, d] = end.split('-').map(Number);
    return [`- ${months[m - 1]} ${d}, ${y}`, `- ${d}, ${y}`];
  };
  const readStable = async (previous, end) => {
    let last = '';
    while (Date.now() - started < budget) {
      await sleep(700);
      const t = document.body.innerText;
      if (t.includes(marker) && endLabels(end).some((l) => t.includes(l)) && t !== previous && t === last) return t;
      last = t;
    }
    return null;
  };
  const cut = (t) => {
    const from = t.indexOf('Add comparison');
    const to = t.indexOf('© 20', from);
    return t.slice(from < 0 ? 0 : from, to < 0 ? undefined : to);
  };
  for (const [i, range] of ranges.entries()) {
    if (Date.now() - started > budget - 4000) { envelope.remaining = ranges.slice(i).map((r) => r.label); break; }
    const p = [`_u..nav=maui`, `_u.date00=${range.start.replaceAll('-', '')}`, `_u.date01=${range.end.replaceAll('-', '')}`];
    if (cfg.seldim) p.push(`_r.explorerCard..seldim=["${cfg.seldim}"]`);
    if (cfg.event) p.push(`_r..dimension-value={"dimension":"eventName","value":"${cfg.event}"}`);
    const before = document.body.innerText;
    location.hash = `#/${property}/reports/${cfg.dashboard ? 'dashboard' : 'explorer'}?params=${encodeURIComponent(p.join('&'))}&r=${cfg.r}`;
    const text = await readStable(before, range.end);
    if (!text) { envelope.remaining = ranges.slice(i).map((r) => r.label); break; }
    const pages = [cut(text)];
    while (!cfg.dashboard && Date.now() - started < budget - 1500) {
      const next = document.querySelector('[aria-label="Next Page"]');
      if (!next || next.disabled || next.classList.contains('mat-mdc-button-disabled')) break;
      const prev = document.body.innerText;
      next.click();
      const t = await readStable(prev, range.end);
      if (!t) { envelope.truncated = true; break; }
      pages.push(cut(t));
    }
    envelope.data.push({ range, url: location.href, pages });
  }
  if (envelope.remaining.length) envelope.status = envelope.data.length ? 'partial' : 'failed';
  if (!envelope.data.length) envelope.error = 'Report text did not load in time';
  return finish(envelope);
}
