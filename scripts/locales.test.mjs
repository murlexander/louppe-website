import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, symlink, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { languages, localizedPath } from './build-locales.mjs';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://louppe.eu';
const routes = ['/', '/privacy/', '/blog/', '/blog/a-proper-hello/'];

test('static language pages, crawl discovery, links, and withdrawal remain consistent', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'louppe-locales-'));
  try {
    for (const name of ['scripts','templates','content','media','privacy','index.html','styles.css','site.js','keyboard.js','analytics-consent.js','blog.css','favicon.ico','favicon.png']) await cp(resolve(source,name),resolve(root,name),{recursive:true});
    await symlink(resolve(source,'node_modules'),resolve(root,'node_modules'),'dir');
    const load = path => readFile(resolve(root,path),'utf8');
    const run = (...args) => spawnSync(process.execPath,['scripts/build-blog.mjs',...args],{cwd:root,encoding:'utf8'});
    let result = run();
    assert.equal(result.status,0,result.stderr);
    const sitemap = await load('sitemap.xml');
    assert.equal((sitemap.match(/<loc>/g) ?? []).length,24);
    const titles = new Set();
    for (const route of routes) {
      for (const language of languages) {
        const path = localizedPath(route,language);
        const html = await load(path.slice(1)+'index.html');
        assert.ok(html.includes(`<html lang="${language.code}"`));
        assert.equal((html.match(/rel="canonical"/g) ?? []).length,1);
        assert.ok(html.includes(`<link rel="canonical" href="${origin}${path}">`));
        assert.ok(sitemap.includes(`<loc>${origin}${path}</loc>`));
        assert.ok(html.includes(`hreflang="x-default" href="${origin}${route}"`));
        for (const other of languages) {
          const target = localizedPath(route,other);
          assert.ok(html.includes(`hreflang="${other.code}" href="${origin}${target}"`));
          assert.ok(html.includes(`href="${target}" hreflang="${other.code}" lang="${other.code}"`));
        }
        const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match=>JSON.parse(match[1]));
        const webpage = schemas.find(schema=>schema['@type']==='WebPage');
        assert.equal(webpage.inLanguage,language.code);
        assert.equal(webpage.url,origin+path);
        if (route==='/') {
          titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
          assert.equal((html.match(/class="download-button"/g) ?? []).length,2);
          assert.match(html,/Apple silicon|Apple 芯片/);
          assert.ok(html.includes('macOS 14'));
          assert.ok(html.includes('srclang="en" label="English"'));
          const ui = JSON.parse(html.match(/<script id="site-translations" type="application\/json">(.*?)<\/script>/s)[1]);
          assert.ok(ui['mark no']);
          assert.ok(ui['Enlarge Grid screenshot']);
          assert.ok(ui['Show Command shortcuts']);
          if (language.code!=='en') assert.notEqual(ui['mark no'],'mark no');
          const app = schemas.find(schema=>schema['@type']==='SoftwareApplication');
          assert.equal(app.offers.price,'0');
          assert.equal(app.aggregateRating,undefined);
          assert.equal(app.inLanguage,undefined); // Website translation does not promise a localized app.
          assert.ok(app.downloadUrl.endsWith('/Louppe.zip'));
        }
        if (route==='/blog/a-proper-hello/') {
          const article = schemas.find(schema=>schema['@type']==='BlogPosting');
          assert.equal(article.inLanguage,language.code);
          assert.equal(article.url,origin+path);
          assert.equal(article.datePublished,'2026-09-27');
        }
        if (language.code==='ar') assert.match(html,/dir="rtl"/);
        else assert.doesNotMatch(html,/<html[^>]*dir="rtl"/);
        assert.doesNotMatch(html,/<script[^>]+src="https:\/\/.*googletagmanager/);
        assert.ok(html.includes('data-analytics-settings'));
        assert.ok(html.includes('data-analytics-choice="rejected"'));
        // Resolve every local link and fragment, including prefixed privacy and blog links.
        for (const match of html.matchAll(/\b(?:href|src|poster)="([^"]+)"/g)) {
          const url = new URL(match[1],origin+path);
          if (url.origin!==origin) continue;
          const target = resolve(root,url.pathname.slice(1),url.pathname.endsWith('/')?'index.html':'');
          assert.ok((await stat(target)).isFile(),`${path} → ${url.pathname}`);
          if (url.hash && target.endsWith('.html')) assert.ok((await readFile(target,'utf8')).includes(`id="${url.hash.slice(1)}"`),`${path} → ${url.hash}`);
        }
        for (const match of html.matchAll(/\bsrcset="([^"]+)"/g)) {
          for (const candidate of match[1].split(',')) assert.ok((await stat(resolve(root,candidate.trim().split(' ')[0].slice(1)))).isFile());
        }
      }
    }
    assert.equal(titles.size,6);
    // Rebuilding must be deterministic, without duplicate navigation or alternate links.
    const arabic = await load('ar/index.html');
    result=run(); assert.equal(result.status,0,result.stderr);
    assert.equal(await load('ar/index.html'),arabic);
    const catalog = JSON.parse(await load('content/translations.json'));
    delete catalog['mark no'].ar;
    await writeFile(resolve(root,'content/translations.json'),JSON.stringify(catalog));
    result=run(); assert.notEqual(result.status,0);
    assert.match(result.stderr,/Missing ar translation: mark no/);
    assert.equal(await load('ar/index.html'),arabic);
    await cp(resolve(source,'content/translations.json'),resolve(root,'content/translations.json'));
    // Source edits cannot silently leave visible English text on a translated homepage.
    const template = await load('templates/home.html');
    await writeFile(resolve(root,'templates/home.html'),template.replace('start with a folder','new untranslated source text'));
    result=run(); assert.notEqual(result.status,0);
    assert.match(result.stderr,/Missing (?:en|es) translation: new untranslated source text/);
    assert.equal(await load('ar/index.html'),arabic);
    await writeFile(resolve(root,'templates/home.html'),template);
    result=run('--preview'); assert.equal(result.status,0,result.stderr);
    for (const language of languages) {
      const html=await load('_preview/'+localizedPath('/',language).slice(1)+'index.html');
      assert.match(html,/noindex, nofollow/);
    }
    assert.equal(await load('ar/index.html'),arabic);
    await writeFile(resolve(root,'content/posts.json'),'[]');
    result=run(); assert.equal(result.status,0,result.stderr);
    assert.doesNotMatch(await load('sitemap.xml'),/a-proper-hello/);
    for (const language of languages) await assert.rejects(load(localizedPath('/blog/a-proper-hello/',language).slice(1)+'index.html'),{code:'ENOENT'});
  } finally { await rm(root,{recursive:true,force:true}); }
});
