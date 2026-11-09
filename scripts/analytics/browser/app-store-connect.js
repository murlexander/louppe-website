// App Store Connect analytics reader for preview_evaluate on a signed-in appstoreconnect.apple.com tab.
// Print a ready expression with: node scripts/analytics/snippet.mjs app-store-connect '{}'
// Defaults: Store release (2026-10-13) through yesterday; daily totals (Store funnel, plus app usage and
// tips from users who share analytics with developers) and weekly breakdowns by source, storefront,
// web referrer, app referrer, platform, and campaign (ct token).
// Downloads the timeseries responses (points compacted to [date, value]) and returns a short status;
// import with: node scripts/analytics/save.mjs --downloads. A sign-in page or HTTP 401/403 gives
// status "signed_out" (saved, so the summary shows it); it never records zeros.
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
  const adamId = opts.adamId || '6820131477';
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const start = opts.start || '2026-10-13';
  const end = opts.end || iso(today);
  const envelope = {
    source: 'app-store-connect', name: 'app-store-connect', collected_at: new Date().toISOString(), status: 'ok',
    options: { adamId, start, end, note: 'endTime is exclusive; data runs through the day before end' }, data: [],
  };
  const signedOut = (error) => finish({ ...envelope, data: [], status: 'signed_out', error });
  if (/(^|\.)idmsa\.apple\.com$/.test(location.hostname) || (location.hostname === 'appstoreconnect.apple.com' && /^\/login/.test(location.pathname))) {
    return signedOut('App Store Connect shows its sign-in page');
  }
  if (location.hostname !== 'appstoreconnect.apple.com') {
    location.href = `https://appstoreconnect.apple.com/analytics/app/d30/${adamId}/overview`;
    return finish({ ...envelope, status: 'navigating', error: 'Opened App Store Connect; run the snippet again.' });
  }
  const totals = opts.totals || ['units', 'redownloads', 'updates', 'impressionsTotalUnique', 'impressionsTotal', 'pageViewUnique', 'pageViewCount', 'conversionRate',
    'installs', 'sessions', 'activeDevices', 'rollingActiveDevices', 'uninstalls', 'crashes', 'iap', 'proceeds', 'payingUsers'];
  const grouped = opts.grouped || ['units', 'pageViewUnique', 'impressionsTotalUnique'];
  const dimensions = opts.dimensions || ['source', 'storefront', 'domainReferrer', 'appReferrer', 'platform', 'campaignId'];
  const requests = [
    ...totals.map((m) => ({ measures: [m], frequency: 'day' })),
    ...dimensions.flatMap((d) => grouped.map((m) => ({ measures: [m], frequency: 'week', group: { metric: m, dimension: d, rank: 'DESCENDING', limit: 200 } }))),
  ];
  const call = async (req) => {
    const body = { adamId: [adamId], startTime: `${start}T00:00:00Z`, endTime: `${end}T00:00:00Z`, ...req };
    try {
      const res = await fetch('/analytics/api/v1/data/timeseries', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-By': 'appstoreconnect.apple.com' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) return { request: req, status: res.status, error: text.slice(0, 300) };
      const json = JSON.parse(text);
      return {
        request: req, status: res.status, meta: json.meta,
        // Grouped requests pad with zero rows; drop groups that are zero throughout.
        results: (json.results || []).filter((r) => !r.group || r.totals?.value || (r.data || []).some((p) => p[req.measures[0]])).map((r) => ({
          group: r.group ? { key: r.group.key, title: r.group.title } : null,
          meetsThreshold: r.meetsThreshold,
          totals: r.totals,
          data: (r.data || []).map((p) => [p.date.slice(0, 10), p[req.measures[0]] ?? null]),
        })),
      };
    } catch (error) {
      return { request: req, status: 0, error: String(error) };
    }
  };
  envelope.data = await Promise.all(requests.map(call));
  if (envelope.data.every((r) => r.status === 401 || r.status === 403)) return signedOut(`App Store Connect API returned HTTP ${envelope.data[0]?.status}`);
  const failed = envelope.data.filter((r) => r.error);
  if (failed.length === envelope.data.length) { envelope.status = 'failed'; envelope.error = failed[0]?.error; }
  else if (failed.length) envelope.status = 'partial';
  return finish(envelope);
}
