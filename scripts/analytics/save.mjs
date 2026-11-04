#!/usr/bin/env node
// Saves browser-snippet results to .drafts/analytics/raw/<date>/<name>.json.
//   node scripts/analytics/save.mjs --downloads [hours]   import snippet downloads from the T3 browser (default: last 12 h)
//   node scripts/analytics/save.mjs [file] < result.json   save one envelope (bare or preview_evaluate's {value})
// Snippet downloads are marked `louppe_stats: 1`; other downloads are ignored and nothing is deleted.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { localDate, writeRaw } from './lib.mjs';

const downloadsRoot = process.env.T3_BROWSER_DOWNLOADS || join(homedir(), '.t3', 'userdata', 'server-browser', 'downloads');

function save(payload) {
  if (!payload?.source || !payload.collected_at) throw new Error('Expected a snippet envelope with source and collected_at');
  if (payload.status === 'navigating') throw new Error('Snippet only navigated; run it again before saving');
  const file = writeRaw(payload, localDate(new Date(payload.collected_at)));
  console.log(`${payload.source}: ${payload.status}${payload.remaining?.length ? ` (remaining ${payload.remaining.join(', ')})` : ''} -> ${file}`);
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

if (process.argv[2] === '--downloads') {
  const since = Date.now() - Number(process.argv[3] || 12) * 3600000;
  const found = [];
  for (const path of walk(downloadsRoot)) {
    const stat = statSync(path);
    if (stat.mtimeMs < since || stat.size > 20 << 20) continue;
    let json;
    try { json = JSON.parse(readFileSync(path, 'utf8')); } catch { continue; }
    if (json?.louppe_stats === 1) found.push({ json, mtime: stat.mtimeMs });
  }
  // Oldest first, so a later re-collection with the same name wins.
  found.sort((a, b) => a.mtime - b.mtime).forEach(({ json }) => save(json));
  if (!found.length) console.log(`No Louppe stats downloads in ${downloadsRoot} from the last ${process.argv[3] || 12} h`);
} else {
  const input = JSON.parse(readFileSync(process.argv[2] || 0, 'utf8'));
  save(input && typeof input.value === 'object' && !input.source ? input.value : input);
}
