// Shared paths and helpers for the private analytics store. In Alex's workspace it is
// louppe/analytics/, beside (not inside) this public repository; set LOUPPE_ANALYTICS_DIR elsewhere.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const siteRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const dataDir = process.env.LOUPPE_ANALYTICS_DIR || join(siteRoot, '..', 'analytics');
export const rawDir = join(dataDir, 'raw');

// Local calendar date (the GA4 property and Alex's Mac use Europe/Copenhagen).
export function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// UTC calendar date (Cloudflare and GitHub count days in UTC).
export const utcDate = (d = new Date()) => d.toISOString().slice(0, 10);

export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

// Every raw file is an envelope: { source, name, collected_at, status, options, data, error }.
export function envelope(source, fields) {
  return { source, name: source, collected_at: new Date().toISOString(), status: 'ok', ...fields };
}

// A snippet that skipped pages or tabs is partial, even if it reported ok.
export function normalizeStatus(env) {
  if (env.status !== 'ok') return env;
  const missing = [env.truncated && 'truncated pages', ...(env.data || []).filter((p) => p?.error).map((p) => `${p.tab || p.view || 'part'}: ${p.error}`)].filter(Boolean);
  return missing.length ? { ...env, status: 'partial', error: [env.error, ...missing].filter(Boolean).join('; ') } : env;
}

export function safeName(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9._+-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'payload';
}

// Write through a temporary file, so an interrupted run never leaves half a file.
export function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, file);
}

function collectedAt(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')).collected_at; } catch { return null; }
}

// Never replaces an earlier collection: another collection on the same day gets a time suffix.
// Saving the same payload again (same collected_at) rewrites its own file.
export function writeRaw(payload, date = localDate(), root = rawDir) {
  const dir = join(root, date);
  mkdirSync(dir, { recursive: true });
  const base = safeName(payload.name || payload.source);
  const time = String(payload.collected_at || '').slice(11, 19).replaceAll(':', '') || 'x';
  for (let i = 0; ; i++) {
    const file = join(dir, `${base}${i ? `@${time}Z${i > 1 ? `-${i}` : ''}` : ''}.json`);
    if (!existsSync(file) || collectedAt(file) === payload.collected_at) {
      writeAtomic(file, JSON.stringify(payload, null, 2) + '\n');
      return file;
    }
  }
}
