import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, symlink, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { languages, localizedPath } from './build-locales.mjs';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://louppe.eu';

test('complete Markdown translations preserve draft privacy and published search discovery', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'louppe-translated-blog-'));
  try {
    for (const name of ['scripts','templates','content','media','privacy','index.html','styles.css','prefetch.js','site.js','keyboard.js','analytics-consent.js','blog.css','favicon.ico','favicon.png']) await cp(resolve(source,name),resolve(root,name),{recursive:true});
    await mkdir(resolve(root,'.drafts'));
    await symlink(resolve(source,'node_modules'),resolve(root,'node_modules'),'dir');
    const save = (name,value) => writeFile(resolve(root,name),value);
    const load = name => readFile(resolve(root,name),'utf8');
    const run = (...args) => spawnSync(process.execPath,['scripts/build-blog.mjs',...args],{cwd:root,encoding:'utf8'});
    const success = (...args) => { const result=run(...args); assert.equal(result.status,0,result.stderr); };
    const dictionary=JSON.parse(await load('content/translations.json'));
    const posts=[];
    for (const slug of ['selection','pairs']) {
      const other=slug==='selection'?'pairs':'selection';
      const record={slug,title:`${slug} original title`,description:`${slug} original description`,file:`${slug}.md`,status:'draft',cta:{label:'Try Louppe',href:'https://louppe.eu/'},translations:{}};
      for (const language of languages) {
        const file=language.path?`${slug}-${language.path}.md`:record.file;
        await save(`.drafts/${file}`,`## ${language.code} PRIVATE_${slug}_BODY\n\n[Related guide](/blog/${other}/) and [demo](/#review-demo)\n\n\`DSC_0123.CR3\`\n\n<!-- try-louppe -->\n\n${language.code} PRIVATE_${slug}_ENDING`);
        if (language.path) record.translations[language.code]={file,title:`${language.code} ${slug} title`,description:`${language.code} ${slug} description`};
      }
      posts.push(record);
    }
    const draftManifest=JSON.stringify(posts);
    await save('.drafts/posts.json',draftManifest);
    await save('content/posts.json','[]');
    success();
    const publicIndex=await load('blog/index.html');
    assert.doesNotMatch(publicIndex,/selection original|PRIVATE_/);
    for (const language of languages) {
      for (const post of posts) await assert.rejects(load(localizedPath(`/blog/${post.slug}/`,language).slice(1)+'index.html'),{code:'ENOENT'});
    }
    success('--preview');
    const previewPage=await load('_preview/ar/blog/selection/index.html');
    assert.equal(await load('blog/index.html'),publicIndex);
    assert.doesNotMatch(await load('_preview/sitemap.xml'),/selection|pairs/);
    for (const language of languages) {
      for (const post of posts) {
        const path=localizedPath(`/blog/${post.slug}/`,language);
        const html=await load('_preview/'+path.slice(1)+'index.html');
        assert.match(html,/noindex, nofollow/);
        assert.ok(html.includes(`${language.code} PRIVATE_${post.slug}_BODY`));
        assert.doesNotMatch(html,/"@type":"BlogPosting"/);
        assert.ok(html.includes(`href="${localizedPath('/#review-demo',language)}"`));
      }
    }
    // Incomplete or missing translations must fail, preserving the previous preview.
    for (const invalid of [
      {...posts[0],translations:{...posts[0].translations,ar:undefined}},
      {...posts[0],translations:{...posts[0].translations,ar:{...posts[0].translations.ar,description:''}}},
      {...posts[0],translations:{...posts[0].translations,ar:{...posts[0].translations.ar,file:'missing.md'}}},
      {...posts[0],translations:{...posts[0].translations,ar:{...posts[0].translations.ar,file:'../escape.md'}}},
    ]) {
      await save('.drafts/posts.json',JSON.stringify([invalid,posts[1]]));
      assert.notEqual(run('--preview').status,0);
      assert.equal(await load('_preview/ar/blog/selection/index.html'),previewPage);
    }
    await save('.drafts/posts.json',draftManifest);
    const arabicBody=await load('.drafts/selection-ar.md');
    await save('.drafts/selection-ar.md','No inline CTA marker');
    assert.notEqual(run('--preview').status,0);
    assert.equal(await load('_preview/ar/blog/selection/index.html'),previewPage);
    await save('.drafts/selection-ar.md',arabicBody);
    // Rehearse publication: complete translations receive reciprocal URLs and localized schema.
    await cp(resolve(root,'.drafts'),resolve(root,'content/posts'),{recursive:true});
    await save('content/posts.json',JSON.stringify(posts.map(post=>({...post,status:'published',date:'2026-10-12'}))));
    await save('.drafts/posts.json','[]');
    success();
    const sitemap=await load('sitemap.xml');
    assert.equal((sitemap.match(/<loc>/g)??[]).length,30);
    for (const language of languages) {
      const index=await load(localizedPath('/blog/',language).slice(1)+'index.html');
      for (const post of posts) {
        const route=`/blog/${post.slug}/`;
        const path=localizedPath(route,language);
        const html=await load(path.slice(1)+'index.html');
        const metadata=language.path?post.translations[language.code]:post;
        assert.ok(html.includes(`<html lang="${language.code}"${language.code==='ar'?' dir="rtl"':''}>`));
        assert.ok(html.includes(`<title>${metadata.title} — Louppe</title>`));
        assert.ok(html.includes(`<meta name="description" content="${metadata.description}">`));
        assert.ok(html.includes(`<meta name="twitter:title" content="${metadata.title}">`));
        assert.ok(html.includes(`<meta name="twitter:description" content="${metadata.description}">`));
        assert.ok(html.includes(`${language.code} PRIVATE_${post.slug}_BODY`));
        if (language.path) assert.doesNotMatch(html,/<h2>en PRIVATE_/);
        assert.doesNotMatch(html,/noindex|\{\{\w+\}\}|undefined/);
        assert.equal((html.match(/rel="canonical"/g)??[]).length,1);
        assert.ok(html.includes(`<link rel="canonical" href="${origin}${path}">`));
        assert.ok(sitemap.includes(`<loc>${origin}${path}</loc>`));
        assert.ok(index.includes(`href="${path}">${metadata.title}</a>`));
        for (const other of languages) assert.ok(html.includes(`hreflang="${other.code}" href="${origin}${localizedPath(route,other)}"`));
        assert.ok(html.includes(`hreflang="x-default" href="${origin}${route}"`));
        const other=post.slug==='selection'?'pairs':'selection';
        assert.ok(html.includes(`href="${localizedPath(`/blog/${other}/`,language)}"`));
        assert.equal((html.match(/class="download-button"/g)??[]).length,2);
        assert.equal((html.match(/rel="author"/g)??[]).length,1);
        assert.ok(html.includes(`aria-label="${dictionary['Try Louppe'][language.code]}"`));
        const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match=>JSON.parse(match[1]));
        const article=schemas.find(schema=>schema['@type']==='BlogPosting');
        assert.equal(article.headline,metadata.title);
        assert.equal(article.description,metadata.description);
        assert.equal(article.datePublished,'2026-10-12');
        assert.equal(article.inLanguage,language.code);
        assert.equal(article.url,origin+path);
        assert.equal(article.mainEntityOfPage,origin+path);
        const webpage=schemas.find(schema=>schema['@type']==='WebPage');
        assert.equal(webpage.inLanguage,language.code);
        assert.equal(webpage.url,origin+path);
      }
    }
    await save('content/posts.json','[]');
    success();
    assert.doesNotMatch(await load('sitemap.xml'),/selection|pairs/);
    for (const language of languages) {
      for (const post of posts) await assert.rejects(load(localizedPath(`/blog/${post.slug}/`,language).slice(1)+'index.html'),{code:'ENOENT'});
    }
  } finally { await rm(root,{recursive:true,force:true}); }
});
