// App Store Connect API: Apple's Analytics Reports for Louppe (aggregate counts only, no user data).
// Uses the read-only team key "louppe-stats-read" (Sales and Reports access) from Keychain service
// "louppe-asc-api": accounts "private-key" (PKCS#8 DER, base64, one line), "key-id", and "issuer-id".
// Apple generates one daily instance per report; each run downloads only instances that no earlier
// raw file holds, so every raw file is incremental and ingest combines them.
import { execFileSync } from 'node:child_process';
import { createHash, createPrivateKey, sign } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { envelope } from './lib.mjs';

export const keychainService = 'louppe-asc-api';
export const ascAppId = '6820131477';
// Standard reports only: Detailed variants add dimensions Apple thresholds away for an app this size.
export const wantedReports = [
  'App Downloads Standard',
  'App Store Discovery and Engagement Standard',
  'App Store Installation and Deletion Standard',
  'App Sessions Standard',
  'App Crashes',
  'App Store Purchases Standard',
];
// Columns that identify the app, not the data; dropped before saving.
const dropColumns = new Set(['App Name', 'App Apple Identifier']);
const api = 'https://api.appstoreconnect.apple.com';

function keychain(account) {
  try {
    return execFileSync('security', ['find-generic-password', '-s', keychainService, '-a', account, '-w'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

export function readKey(read = keychain) {
  const [der, keyId, issuerId] = ['private-key', 'key-id', 'issuer-id'].map(read);
  return der && keyId && issuerId ? { der, keyId, issuerId } : null;
}

// ES256 JWT, valid 15 minutes.
export function makeToken({ der, keyId, issuerId }, now = Date.now()) {
  const key = createPrivateKey({ key: Buffer.from(der, 'base64'), format: 'der', type: 'pkcs8' });
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const iat = Math.floor(now / 1000);
  const input = `${b64({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${b64({ iss: issuerId, iat, exp: iat + 900, aud: 'appstoreconnect-v1' })}`;
  return `${input}.${sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}

// Tab-separated report text -> objects, without the app-identifying columns.
export function parseTsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const header = lines[0].split('\t').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((l) => {
    const cells = l.split('\t');
    const row = {};
    header.forEach((h, i) => { if (!dropColumns.has(h)) row[h] = (cells[i] ?? '').trim().replace(/^"|"$/g, ''); });
    return row;
  });
}

// Earlier raw files' instance IDs, so each instance is downloaded once.
export function knownInstances(envelopes) {
  const ids = new Set();
  for (const { env } of envelopes) {
    if (env.source !== 'app-store-reports') continue;
    for (const i of env.data?.instances || []) ids.add(i.instance_id);
  }
  return ids;
}

export async function appStoreReports({ key = readKey(), get = fetch, known = new Set(), now = Date.now() } = {}) {
  if (!key) return envelope('app-store-reports', { status: 'skipped', error: `Keychain service "${keychainService}" lacks the API key` });
  let token = makeToken(key, now);
  let tokenAt = Date.now();
  const call = async (pathOrUrl, raw = false) => {
    if (Date.now() - tokenAt > 600000) { token = makeToken(key); tokenAt = Date.now(); }
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${api}${pathOrUrl}`;
    // Segment URLs are pre-signed and reject an Authorization header.
    const res = await get(url, raw ? {} : { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(`HTTP ${res.status} ${url.replace(/\?.*/, '')}${body?.errors?.[0]?.detail ? `: ${body.errors[0].detail}` : ''}`);
    }
    return raw ? Buffer.from(await res.arrayBuffer()) : res.json();
  };
  const all = async (path) => {
    const out = [];
    for (let next = path; next;) {
      const page = await call(next);
      out.push(...(page.data || []));
      next = page.links?.next || null;
    }
    return out;
  };

  const requests = await all(`/v1/apps/${ascAppId}/analyticsReportRequests`);
  if (!requests.length) return envelope('app-store-reports', { status: 'failed', error: 'No analytics report requests exist for the app; an Admin key must create them' });
  const options = { app: ascAppId, requests: requests.map((r) => ({ id: r.id, access_type: r.attributes.accessType, stopped: r.attributes.stoppedDueToInactivity })) };
  const instances = [];
  const problems = [];
  let seen = 0;
  for (const req of requests) {
    if (req.attributes.stoppedDueToInactivity) problems.push(`${req.attributes.accessType} request stopped due to inactivity`);
    const reports = (await all(`/v1/analyticsReportRequests/${req.id}/reports?limit=200`)).filter((r) => wantedReports.includes(r.attributes.name));
    for (const report of reports) {
      const list = await all(`/v1/analyticsReports/${report.id}/instances?filter[granularity]=DAILY&limit=200`);
      seen += list.length;
      for (const inst of list.filter((i) => !known.has(i.id))) {
        try {
          const rows = [];
          for (const seg of await all(`/v1/analyticsReportInstances/${inst.id}/segments`)) {
            const body = await call(seg.attributes.url, true);
            if (seg.attributes.checksum && createHash('md5').update(body).digest('hex') !== seg.attributes.checksum) throw new Error('segment checksum mismatch');
            rows.push(...parseTsv((body[0] === 0x1f && body[1] === 0x8b ? gunzipSync(body) : body).toString('utf8')));
          }
          instances.push({
            report: report.attributes.name,
            access_type: req.attributes.accessType,
            instance_id: inst.id,
            processing_date: inst.attributes.processingDate,
            rows,
          });
        } catch (error) {
          problems.push(`${report.attributes.name} ${inst.attributes.processingDate}: ${error.message}`);
        }
      }
    }
  }
  const data = { instances, available: seen, already_saved: seen - instances.length - problems.filter((p) => /\d{4}-\d{2}-\d{2}:/.test(p)).length };
  if (!seen) {
    return envelope('app-store-reports', { status: 'pending', options, error: 'Apple has not generated any report instances yet (they appear 1–2 days after a request)', data });
  }
  return envelope('app-store-reports', { status: problems.length ? 'partial' : 'ok', options, ...(problems.length ? { error: problems.slice(0, 5).join('; ') } : {}), data });
}
