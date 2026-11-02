// Submit sitemap URLs to IndexNow (Bing, Yandex, Seznam, Naver, Yep) after a deployment is live.
// Usage: npm run indexnow            — submit every sitemap URL
//        npm run indexnow -- /blog/x/ — submit specific paths
// Google does not use IndexNow; use Search Console for Google.
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const host = 'louppe.eu';
const keyFile = (await readdir(root)).find(name => /^[0-9a-f]{32}\.txt$/.test(name));
if (!keyFile) throw new Error('Missing IndexNow key file at the site root');
const key = (await readFile(resolve(root, keyFile), 'utf8')).trim();

const live = await fetch(`https://${host}/${keyFile}`);
if (!live.ok || (await live.text()).trim() !== key) throw new Error(`Key file is not live yet: https://${host}/${keyFile}`);

const paths = process.argv.slice(2);
const urlList = paths.length
  ? paths.map(path => new URL(path, `https://${host}`).href)
  : [...(await readFile(resolve(root, 'sitemap.xml'), 'utf8')).matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${keyFile}`, urlList }),
});
console.log(`IndexNow: ${response.status} ${response.statusText} for ${urlList.length} URLs`);
if (response.status >= 400) process.exitCode = 1;
