#!/usr/bin/env node
// Prints a browser snippet as one preview_evaluate expression.
// Usage: node scripts/analytics/snippet.mjs <ga4|search-console|app-store-connect> ['{"option":"value"}']
//        node scripts/analytics/snippet.mjs --install <name>
// --install defines window.__louppe_<name> once per page load, so later calls are just
// `__louppe_ga4({...})`. Reinstall after a full page navigation (ReferenceError).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const install = process.argv[2] === '--install';
const [name, json = '{}'] = process.argv.slice(install ? 3 : 2);
const names = ['ga4', 'search-console', 'app-store-connect'];
if (!names.includes(name)) {
  console.error(`Usage: snippet.mjs <${names.join('|')}> ['{"option":"value"}']`);
  process.exit(2);
}
const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'browser', `${name}.js`), 'utf8');
const body = source.split('\n').filter((line) => !line.startsWith('//')).join('\n').trim();
const global = `__louppe_${name.replaceAll('-', '_')}`;
process.stdout.write(install
  ? `window.${global} = (${body}); '${global} installed'\n`
  : `(${body})(${JSON.stringify(JSON.parse(json))})\n`);
