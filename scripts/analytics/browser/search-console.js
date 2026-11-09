// Search Console reader for preview_evaluate on a signed-in search.google.com tab.
// Downloads its result and returns a short status; import with node scripts/analytics/save.mjs --downloads.
// Print a ready expression with: node scripts/analytics/snippet.mjs search-console '{"view":"performance","tabs":["QUERIES","PAGES"]}'
// Views: performance (tabs QUERIES, PAGES, COUNTRIES, DEVICES, DAYS; months 3 or days 7/28), sitemaps, indexing.
// If the tab is on another page, it navigates and returns status "navigating"; run it again.
// Stops before ~12 s and lists unfinished tabs in `remaining`. A sign-in page gives status "signed_out".
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
  const resource = opts.resource || 'sc-domain:louppe.eu';
  const view = opts.view || 'performance';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const period = opts.days ? `num_of_days=${opts.days}` : `num_of_months=${opts.months || 3}`;
  const paths = {
    performance: `/search-console/performance/search-analytics?resource_id=${encodeURIComponent(resource)}&${period}&metrics=CLICKS%2CIMPRESSIONS%2CCTR%2CPOSITION`,
    sitemaps: `/search-console/sitemaps?resource_id=${encodeURIComponent(resource)}`,
    indexing: `/search-console/index?resource_id=${encodeURIComponent(resource)}`,
  };
  const target = paths[view];
  const label = view === 'performance' ? [opts.days ? `${opts.days}d` : `${opts.months || 3}m`, ...(opts.tabs || [])].join('-').toLowerCase() : '';
  const envelope = {
    source: 'search-console', name: ['search-console', view, label].filter(Boolean).join('-'),
    collected_at: new Date().toISOString(), status: 'ok', options: { resource, view, months: opts.days ? null : opts.months || 3, days: opts.days || null },
    data: [], remaining: [],
  };
  if (!target) return finish({ ...envelope, status: 'failed', error: `Unknown view ${view}` });
  if (location.hostname === 'accounts.google.com' || (location.hostname === 'search.google.com' && /^\/search-console\/about/.test(location.pathname))) {
    return finish({ ...envelope, status: 'signed_out', error: 'Search Console shows a sign-in page' });
  }
  const here = location.pathname + location.search;
  if (location.hostname !== 'search.google.com' || !decodeURIComponent(here).startsWith(decodeURIComponent(target.split('&metrics')[0]))) {
    location.href = `https://search.google.com${target}`;
    return finish({ ...envelope, status: 'navigating', error: 'Opened the report; run the snippet again.' });
  }
  const waitFor = async (test, previous) => {
    let last = '';
    while (Date.now() - started < budget) {
      await sleep(600);
      const t = document.body.innerText;
      if (test(t) && t !== previous && t === last) return t;
      last = t;
    }
    return null;
  };
  if (view !== 'performance') {
    const t = await waitFor((x) => x.includes('Rows per page'));
    if (!t) return finish({ ...envelope, status: 'failed', error: 'Report text did not load in time' });
    envelope.data.push({ view, url: location.href, text: t.slice(t.indexOf(view === 'sitemaps' ? 'Submitted sitemaps' : 'Page indexing')) });
    return finish(envelope);
  }
  const first = await waitFor((x) => x.includes('Total clicks') && x.includes('Rows per page'));
  if (!first) return finish({ ...envelope, status: 'failed', error: 'Performance report did not load in time' });
  const head = first.slice(first.indexOf('Total clicks'), first.indexOf('QUERIES\nPAGES'));
  envelope.data.push({ tab: 'TOTALS', url: location.href, text: head });
  const tabs = opts.tabs || ['QUERIES', 'PAGES', 'COUNTRIES', 'DAYS'];
  const tableText = (t) => {
    const i = t.indexOf('SEARCH APPEARANCE\nDAYS');
    const j = t.indexOf('Previous page', i);
    return t.slice(i + 'SEARCH APPEARANCE\nDAYS'.length, j < 0 ? undefined : j);
  };
  for (const [i, name] of tabs.entries()) {
    if (Date.now() - started > budget - 2500) { envelope.remaining = tabs.slice(i); break; }
    const tab = [...document.querySelectorAll('[role=tab]')].find((e) => e.innerText.trim() === name);
    if (!tab) { envelope.data.push({ tab: name, error: 'tab not found', pages: [] }); continue; }
    const before = document.body.innerText;
    const selected = tab.getAttribute('aria-selected') === 'true';
    if (!selected) tab.click();
    const t = selected ? before : await waitFor((x) => x.includes('Rows per page'), before);
    if (!t) { envelope.remaining = tabs.slice(i); break; }
    const pages = [tableText(t)];
    for (;;) {
      const m = /(\d+)-(\d+) of (\d+)/.exec(pages.at(-1));
      if (!m || Number(m[2]) >= Number(m[3])) break;
      if (Date.now() - started > budget - 1200) { envelope.truncated = true; break; }
      const next = [...document.querySelectorAll('[aria-label="Next page"]')].find((e) => e.getBoundingClientRect().height > 0);
      if (!next) break;
      const prev = document.body.innerText;
      next.click();
      const n = await waitFor((x) => x.includes('Rows per page'), prev);
      if (!n) { envelope.truncated = true; break; }
      pages.push(tableText(n));
    }
    envelope.data.push({ tab: name, pages });
  }
  if (envelope.remaining.length) envelope.status = 'partial';
  return finish(envelope);
}
