#!/usr/bin/env node
// Collects the command-line sources into <analytics>/raw/<date>/<source>.json (see lib.mjs).
// Usage: node scripts/analytics/collect.mjs [github] [cloudflare] [itunes]   (default: all)
// A failed or skipped source is still written, with its status and reason, so
// ingest and the summary report it instead of treating it as zero.
import { execFileSync } from 'node:child_process';
import { addDays, envelope, localDate, writeRaw } from './lib.mjs';

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

// Cloudflare Web Analytics (RUM) through the GraphQL Analytics API, last 28 complete days.
export function cloudflareQuery() {
  const group = (alias, dims, orderBy) => `
      ${alias}: rumPageloadEventsAdaptiveGroups(filter: $filter, limit: 1000, orderBy: [${orderBy}]) {
        count
        sum { visits }
        dimensions { ${dims} }
      }`;
  return `query LouppeWebAnalytics($account: String!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!) {
  viewer {
    accounts(filter: { accountTag: $account }) {${group('byDate', 'date', 'date_ASC')}${group('byCountry', 'countryName', 'count_DESC')}${group('byReferer', 'refererHost', 'count_DESC')}${group('byPath', 'requestPath', 'count_DESC')}${group('byDevice', 'deviceType', 'count_DESC')}
    }
  }
}`;
}

export async function cloudflare() {
  const token = keychain('api-token');
  const siteTag = keychain('site-tag');
  if (!token || !siteTag) {
    return envelope('cloudflare', {
      status: 'skipped',
      error: `Keychain service "${keychainService}" lacks ${token ? '' : 'account "api-token" '}${siteTag ? '' : 'account "site-tag"'}`.trim(),
    });
  }
  const end = addDays(localDate(), -1);
  const start = addDays(end, -27);
  const variables = {
    account: cloudflareAccount,
    filter: { AND: [{ date_geq: start, date_leq: end }, { siteTag }, { requestHost: 'louppe.eu' }, { bot: 0 }] },
  };
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: cloudflareQuery(), variables }),
  });
  const body = await res.json().catch(() => ({ errors: [{ message: `HTTP ${res.status}, non-JSON body` }] }));
  const options = { start, end, host: 'louppe.eu' };
  if (!res.ok || body.errors?.length) {
    return envelope('cloudflare', { status: 'failed', options, error: (body.errors || []).map((e) => e.message).join('; ') || `HTTP ${res.status}`, data: body.data ?? null });
  }
  return envelope('cloudflare', { options, data: body.data });
}

const collectors = { github, cloudflare, itunes };

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
    if (payload.status === 'failed') failed++;
    console.log(`${name}: ${payload.status}${payload.error ? ` (${payload.error})` : ''} -> ${writeRaw(payload)}`);
  }
  process.exitCode = failed ? 1 : 0;
}
