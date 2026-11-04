// Shared paths and helpers for the private analytics store. In Alex's workspace it is
// louppe/analytics/, beside (not inside) this public repository; set LOUPPE_ANALYTICS_DIR elsewhere.
import { mkdirSync, writeFileSync } from 'node:fs';
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

export function safeName(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9._+-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'payload';
}

export function writeRaw(payload, date = localDate()) {
  const dir = join(rawDir, date);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${safeName(payload.name || payload.source)}.json`);
  writeFileSync(file, JSON.stringify(payload, null, 2) + '\n');
  return file;
}
