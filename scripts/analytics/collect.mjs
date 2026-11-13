#!/usr/bin/env node
// Collects the command-line sources into <analytics>/raw/<date>/<source>.json (see lib.mjs).
// Usage: node scripts/analytics/collect.mjs [github] [cloudflare] [itunes] [app-store-reports]   (default: all)
// A failed or skipped source is still written, with its status and reason, so
// ingest and the summary report it instead of treating it as zero.
import { execFileSync } from 'node:child_process';
import { appStoreReports, knownInstances } from './asc-reports.mjs';
import { readRaw } from './ingest.mjs';
import { addDays, envelope, utcDate, writeRaw } from './lib.mjs';
import { cloudflareSince } from './parsers.mjs';

export const githubRepos = ['murlexander/louppe-media-culler', 'murlexander/louppe-website'];
export const appStoreId = '6820131477';
const cloudflareAccount = 'f273a35c8f99d5f15f12fc44a35f150b';
const keychainService = 'louppe-cloudflare-analytics';

function gh(path, accept) {
  const args = ['api', '--paginate', '--slurp', path];
  if (accept) args.push('-H', `Accept: ${accept}`);
  const pages = JSON.parse(execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 << 20 }));
  return pages.length === 1 && !Array.isArray(pages[0]) ? pages[0] : pages.flat();
}

export async function github() {
  const repos = {};
  for (const repo of githubRepos) {
    const info = gh(`repos/${repo}`);
    const releases = gh(`repos/${repo}/releases?per_page=100`);
    repos[repo] = {
      stars: info.stargazers_count,
      forks: info.forks_count,
      watchers: info.subscribers_count,
      open_issues: info.open_issues_count,
      views: gh(`repos/${repo}/traffic/views`),
      clones: gh(`repos/${repo}/traffic/clones`),
      referrers: gh(`repos/${repo}/traffic/popular/referrers`),
      paths: gh(`repos/${repo}/traffic/popular/paths`),
      stargazers: gh(`repos/${repo}/stargazers?per_page=100`, 'application/vnd.github.star+json')
        .map((s) => ({ starred_at: s.starred_at })), // dates only; no usernames
      releases: releases.map((r) => ({
        tag: r.tag_name,
        published_at: r.published_at,
        assets: r.assets.map((a) => ({ name: a.name, download_count: a.download_count })),
      })),
    };
  }
  return envelope('github', { data: { repos } });
}

export async function itunes() {
  const url = `https://itunes.apple.com/lookup?id=${appStoreId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes lookup HTTP ${res.status}`);
  const body = await res.json();
  const app = body.results?.[0];
  if (!app) throw new Error('iTunes lookup returned no app');
  const keep = ['trackName', 'version', 'currentVersionReleaseDate', 'releaseDate', 'userRatingCount',
    'averageUserRating', 'userRatingCountForCurrentVersion', 'averageUserRatingForCurrentVersion',
    'price', 'minimumOsVersion', 'primaryGenreName', 'trackViewUrl'];
  return envelope('itunes', { options: { url }, data: Object.fromEntries(keep.filter((k) => k in app).map((k) => [k, app[k]])) });
}

function keychain(account) {
  try {
    return execFileSync('security', ['find-generic-password', '-s', keychainService, '-a', account, '-w'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

// Cloudflare Web Analytics (RUM) through the GraphQL Analytics API, last 28 complete UTC days since the
// beacon went live. Windows longer than about a week come back 10% sampled (estimates in steps of 10 that
// can drop whole days), so each day is queried on its own and the parser rejects sampled groups.
export function cloudflareQuery() {
  const group = (alias, dims, orderBy) => `
      ${alias}: rumPageloadEventsAdaptiveGroups(filter: $filter, limit: 1000, orderBy: [${orderBy}]) {
        count
        sum { visits }
        avg { sampleInterval }
        dimensions { ${dims} }
      }`;
  return `query LouppeWebAnalytics($account: String!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!) {
  viewer {
    accounts(filter: { accountTag: $account }) {${group('byDate', 'date', 'date_ASC')}${group('byCountry', 'countryName', 'count_DESC')}${group('byReferer', 'refererHost', 'count_DESC')}${group('byPath', 'requestPath', 'count_DESC')}${group('byDevice', 'deviceType', 'count_DESC')}
    }
  }
}`;
}

// Days an earlier raw file already holds unsampled. Cloudflare samples older days even when queried alone,
// so those days are not queried again.
export function exactCloudflareDays(envelopes) {
  const exact = new Set();
  for (const { env } of envelopes) {
    if (env.source !== 'cloudflare' || !Array.isArray(env.data?.days)) continue;
    for (const d of env.data.days) {
      const groups = Object.values(d).filter(Array.isArray).flat();
      if (groups.length && groups.every((g) => g?.avg?.sampleInterval === 1)) exact.add(d.date);
    }
  }
  return exact;
}

export async function cloudflare({ now = new Date(), days = 28, post = fetch, token = keychain('api-token'), siteTag = keychain('site-tag'), exact = new Set() } = {}) {
  if (!token || !siteTag) {
    return envelope('cloudflare', {
      status: 'skipped',
      error: `Keychain service "${keychainService}" lacks ${token ? '' : 'account "api-token" '}${siteTag ? '' : 'account "site-tag"'}`.trim(),
    });
  }
  const end = addDays(utcDate(now), -1);
  const start = [addDays(end, -(days - 1)), cloudflareSince].sort().at(-1);
  const options = { start, end, host: 'louppe.eu', per: 'utc-day' };
  const queryDay = async (date) => {
    try {
      const res = await post('https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cloudflareQuery(), variables: {
          account: cloudflareAccount,
          filter: { AND: [{ date_geq: date, date_leq: date }, { siteTag }, { requestHost: 'louppe.eu' }, { bot: 0 }] },
        } }),
      });
      const body = await res.json().catch(() => ({ errors: [{ message: `HTTP ${res.status}, non-JSON body` }] }));
      const account = body.data?.viewer?.accounts?.[0];
      if (!res.ok || body.errors?.length || !account) {
        return { date, error: (body.errors || []).map((e) => e.message).join('; ') || (account ? `HTTP ${res.status}` : 'account not visible to token') };
      }
      return { date, ...account };
    } catch (error) {
      return { date, error: String(error.message || error) };
    }
  };
  const dates = [];
  for (let day = start; day <= end; day = addDays(day, 1)) if (!exact.has(day)) dates.push(day);
  const all = [];
  for (let i = 0; i < dates.length; i += 7) all.push(...await Promise.all(dates.slice(i, i + 7).map(queryDay)));
  const ok = all.filter((d) => !d.error);
  const sampled = ok.filter((d) => Object.values(d).flat().some((g) => (g?.avg?.sampleInterval ?? 1) !== 1)).map((d) => d.date);
  const problems = [...all.filter((d) => d.error).map((d) => `${d.date}: ${d.error}`), ...sampled.map((d) => `${d}: sampled`)];
  const status = dates.length && !ok.length ? 'failed' : problems.length ? 'partial' : 'ok';
  return envelope('cloudflare', { status, options, ...(problems.length ? { error: problems.slice(0, 5).join('; ') } : {}), data: { days: ok } });
}

const collectors = { github, cloudflare: () => cloudflare({ exact: exactCloudflareDays(readRaw()) }), itunes, 'app-store-reports': () => appStoreReports({ known: knownInstances(readRaw()) }) };

if (import.meta.url === `file://${process.argv[1]}`) {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(collectors);
  let failed = 0;
  for (const name of names) {
    if (!collectors[name]) throw new Error(`Unknown source ${name}; use ${Object.keys(collectors).join(', ')}`);
    let payload;
    try {
      payload = await collectors[name]();
    } catch (error) {
      payload = envelope(name, { status: 'failed', error: String(error.message || error).split('\n')[0] });
    }
    if (payload.status !== 'ok') failed++;
    console.log(`${name}: ${payload.status}${payload.error ? ` (${payload.error})` : ''} -> ${writeRaw(payload)}`);
  }
  process.exitCode = failed ? 1 : 0;
}
