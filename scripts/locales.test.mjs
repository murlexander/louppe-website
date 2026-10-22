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
const published = JSON.parse(await readFile(resolve(source,'content/posts.json'),'utf8'));
const translationCatalog = JSON.parse(await readFile(resolve(source,'content/translations.json'),'utf8'));
const articleRoutes = published.map(post=>`/blog/${post.slug}/`);
const routes = ['/', '/privacy/', '/blog/', ...articleRoutes];
const isLocalized = route => {
  const post = published.find(post=>route===`/blog/${post.slug}/`);
  return !post || post.translations || languages.every(language=>translationCatalog[post.title]?.[language.code]);
};

test('static language pages, crawl discovery, links, and withdrawal remain consistent', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'louppe-locales-'));
  try {
    for (const name of ['scripts','templates','content','media','privacy','index.html','styles.css','prefetch.js','site.js','keyboard.js','analytics-consent.js','blog.css','favicon.ico','favicon.png']) await cp(resolve(source,name),resolve(root,name),{recursive:true});
    await symlink(resolve(source,'node_modules'),resolve(root,'node_modules'),'dir');
    const load = path => readFile(resolve(root,path),'utf8');
    const run = (...args) => spawnSync(process.execPath,['scripts/build-blog.mjs',...args],{cwd:root,encoding:'utf8'});
    let result = run();
    assert.equal(result.status,0,result.stderr);
    const sitemap = await load('sitemap.xml');
    assert.equal((sitemap.match(/<loc>/g) ?? []).length,routes.reduce((count,route)=>count+(isLocalized(route)?languages.length:1),0));
    const titles = new Set();
    for (const route of routes) {
      for (const language of isLocalized(route) ? languages : languages.slice(0,1)) {
        const path = localizedPath(route,language);
        const html = await load(path.slice(1)+'index.html');
        assert.ok(html.includes(`<html lang="${language.code}"`));
        assert.equal((html.match(/rel="canonical"/g) ?? []).length,1);
        assert.ok(html.includes(`<link rel="canonical" href="${origin}${path}">`));
        assert.ok(sitemap.includes(`<loc>${origin}${path}</loc>`));
        if (isLocalized(route)) {
          assert.ok(html.includes(`hreflang="x-default" href="${origin}${route}"`));
          for (const other of languages) {
            const target = localizedPath(route,other);
            assert.ok(html.includes(`hreflang="${other.code}" href="${origin}${target}"`));
            assert.ok(html.includes(`href="${target}" hreflang="${other.code}" lang="${other.code}"`));
          }
        } else {
          assert.doesNotMatch(html,/hreflang=/);
          for (const other of languages.slice(1)) {
            await assert.rejects(load(localizedPath(route,other).slice(1)+'index.html'),{code:'ENOENT'});
            const index=await load(localizedPath('/blog/',other).slice(1)+'index.html');
            assert.ok(index.includes(`<li lang="en"><h2><a href="${route}">`));
            assert.match(index,/\(English\)/);
          }
        }
        const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match=>JSON.parse(match[1]));
        const webpage = schemas.find(schema=>schema['@type']==='WebPage');
        if (isLocalized(route)) {
          assert.equal(webpage.inLanguage,language.code);
          assert.equal(webpage.url,origin+path);
        }
        if (route==='/') {
          titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
          assert.equal((html.match(/class="download-button"/g) ?? []).length,2);
          assert.match(html,/Apple silicon|Apple 芯片/);
          assert.ok(html.includes('macOS 14'));
          assert.ok(html.includes('srclang="en" label="english"'));
          const ui = JSON.parse(html.match(/<script id="site-translations" type="application\/json">(.*?)<\/script>/s)[1]);
          assert.ok(ui['mark no']);
          assert.ok(ui['Enlarge Grid screenshot']);
          assert.ok(ui['Show Command shortcuts']);
          if (language.code!=='en') assert.notEqual(ui['mark no'],'mark no');
          const app = schemas.find(schema=>schema['@type']==='SoftwareApplication');
          assert.equal(app.offers.price,'0');
          assert.equal(app.aggregateRating,undefined);
          assert.equal(app.inLanguage,undefined); // Website translation does not promise a localized app.
          assert.equal(app.downloadUrl,'https://apps.apple.com/app/louppe/id6820131477');
          const primary = [...html.matchAll(/class="download-button" href="([^"]+)"/g)];
          assert.ok(primary.every(match=>match[1]===app.downloadUrl));
          assert.equal((html.match(/class="requirements download-alternatives"/g) ?? []).length,2);
          assert.equal((html.match(/href="https:\/\/github.com\/murlexander\/louppe-media-culler\/releases\/latest\/download\/Louppe.zip"/g) ?? []).length,2);
          assert.equal((html.match(/href="https:\/\/github.com\/murlexander\/louppe-media-culler\/blob\/main\/Docs\/HOMEBREW.md"/g) ?? []).length,2);
        }
        if (articleRoutes.includes(route)) {
          const article = schemas.find(schema=>schema['@type']==='BlogPosting');
          const post = published.find(post=>route===`/blog/${post.slug}/`);
          const imageAlt = post.image?.alt ?? translationCatalog['Louppe reviewing a local media folder on Mac'][language.code];
          const escapedAlt = imageAlt.replaceAll('&','&amp;').replaceAll('"','&quot;');
          assert.ok(html.includes(`<meta property="og:image:alt" content="${escapedAlt}">`));
          assert.ok(html.includes(`<meta name="twitter:image:alt" content="${escapedAlt}">`));
          const primary = [...html.matchAll(/class="download-button" href="([^"]+)"/g)];
          assert.equal(primary.length,2);
          assert.ok(primary.every(match=>match[1]==='https://apps.apple.com/app/louppe/id6820131477'));
          assert.equal(article.inLanguage,language.code);
          assert.equal(article.url,origin+path);
          assert.equal(article.datePublished,published.find(post=>route===`/blog/${post.slug}/`).date);
        }
        if (language.code==='ar') assert.match(html,/dir="rtl"/);
        else assert.doesNotMatch(html,/<html[^>]*dir="rtl"/);
        assert.doesNotMatch(html,/<script[^>]+src="https:\/\/.*googletagmanager/);
        assert.ok(html.includes('data-analytics-settings'));
        assert.ok(html.includes('<script src="/prefetch.js?v=20261008-1" defer></script>'));
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
    assert.equal(await load('_preview/prefetch.js'), await load('prefetch.js'));
    for (const language of languages) {
      const html=await load('_preview/'+localizedPath('/',language).slice(1)+'index.html');
      assert.match(html,/noindex, nofollow/);
    }
    assert.equal(await load('ar/index.html'),arabic);
    await writeFile(resolve(root,'content/posts.json'),'[]');
    result=run(); assert.equal(result.status,0,result.stderr);
    for (const route of articleRoutes) {
      assert.ok(!(await load('sitemap.xml')).includes(route));
      for (const language of languages) await assert.rejects(load(localizedPath(route,language).slice(1)+'index.html'),{code:'ENOENT'});
    }
  } finally { await rm(root,{recursive:true,force:true}); }
});
