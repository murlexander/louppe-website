import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('draft isolation, publication, validation and withdrawal', async () => {
  const root = await mkdtemp(resolve(tmpdir(),'louppe-blog-'));
  try {
    for (const name of ['scripts','templates','content/posts','.drafts','media','privacy']) await mkdir(resolve(root,name),{recursive:true});
    for (const name of ['scripts/build-blog.mjs','scripts/build-locales.mjs','content/translations.json','content/translation-ui-keys.json','templates/home.html','templates/privacy.html','templates/blog.html','index.html','styles.css','site.js','keyboard.js','analytics-consent.js','blog.css','favicon.ico','favicon.png','privacy/index.html']) await cp(resolve(source,name),resolve(root,name));
    await symlink(resolve(source,'node_modules'),resolve(root,'node_modules'),'dir');
    const save = (name,body) => writeFile(resolve(root,name),body);
    const load = name => readFile(resolve(root,name),'utf8');
    const run = (...args) => spawnSync(process.execPath,['scripts/build-blog.mjs',...args],{cwd:root,encoding:'utf8'});
    const record = {slug:'sample',title:'One & two',description:'A "quoted" description',file:'sample.md',status:'published',date:'2026-01-01',cta:{label:'try Louppe',href:'https://louppe.eu/'}};
    await save('content/posts.json',JSON.stringify([record]));
    const articleBody = 'A published paragraph\n\n<!-- try-louppe -->\n\nA closing paragraph';
    await save('content/posts/sample.md',articleBody);
    await save('.drafts/posts.json',JSON.stringify([{...record,slug:'unreleased',status:'draft',file:'draft.md'}]));
    await save('.drafts/draft.md','PRIVATE_DRAFT_SENTINEL\n\n<!-- try-louppe -->\n\nA closing draft paragraph');
    assert.equal(run().status,0);
    const publicPage = await load('blog/sample/index.html');
    assert.match(publicPage,/One &amp; two/);
    assert.match(publicPage,/application\/ld\+json/);
    assert.equal((publicPage.match(/rel="author"/g) ?? []).length,1);
    assert.ok(publicPage.indexOf('A published paragraph') > publicPage.indexOf('class="article-author"'));
    assert.doesNotMatch(publicPage,/RSS|application\/rss\+xml/);
    assert.match(publicPage,/try Louppe/);
    assert.equal((publicPage.match(/class="download-button"/g) ?? []).length,2);
    assert.ok(publicPage.indexOf('class="article-cta"') > publicPage.indexOf('A published paragraph'));
    assert.ok(publicPage.indexOf('class="article-cta"') < publicPage.indexOf('A closing paragraph'));
    assert.ok(publicPage.lastIndexOf('class="article-cta"') > publicPage.indexOf('A closing paragraph'));
    for (const invalidBody of ['No CTA', '<!-- try-louppe -->Only after', 'Only before<!-- try-louppe -->']) {
      await save('content/posts/sample.md',invalidBody);
      assert.notEqual(run().status,0);
      assert.equal(await load('blog/sample/index.html'),publicPage);
    }
    await save('content/posts/sample.md',articleBody);
    await assert.rejects(load('blog/feed.xml'),{code:'ENOENT'});
    assert.doesNotMatch(await load('sitemap.xml'),/unreleased/);
    assert.match(await load('sitemap.xml'),/https:\/\/louppe\.eu\/privacy\//);
    assert.doesNotMatch(await load('blog/index.html'),/rel="author"|post-meta/);
    await assert.rejects(load('blog/unreleased/index.html'),{code:'ENOENT'});
    assert.equal(run('--preview').status,0);
    assert.match(await load('_preview/blog/unreleased/index.html'),/PRIVATE_DRAFT_SENTINEL/);
    assert.match(await load('_preview/privacy/index.html'),/privacy policy/);
    assert.equal(await load('_preview/keyboard.js'), await load('keyboard.js'));
    assert.match(await load('_preview/blog/unreleased/index.html'),/noindex, nofollow/);
    assert.doesNotMatch(await load('_preview/blog/index.html'),/local preview|draft-notice/);
    assert.doesNotMatch(await load('_preview/blog/unreleased/index.html'),/draft-notice|unpublished draft/);
    await assert.rejects(load('_preview/blog/feed.xml'),{code:'ENOENT'});
    assert.doesNotMatch(await load('_preview/sitemap.xml'),/unreleased/);
    assert.equal(await load('blog/sample/index.html'),publicPage);
    for (const invalid of [{status:'draft'},{date:'2026-02-30'},{slug:'../escape'},{cta:null}]) {
      await save('content/posts.json',JSON.stringify([{...record,...invalid}]));
      assert.notEqual(run().status,0);
      assert.equal(await load('blog/sample/index.html'),publicPage);
    }
    // Publication is explicit; an editorial date does not schedule or hide a post.
    await save('content/posts.json',JSON.stringify([{...record,date:'2999-01-01'}]));
    assert.equal(run().status,0);
    assert.match(await load('blog/sample/index.html'),/"datePublished":"2999-01-01"/);
    await save('content/posts.json','[]');
    assert.equal(run().status,0);
    await assert.rejects(load('blog/sample/index.html'),{code:'ENOENT'});
    await assert.rejects(load('blog/feed.xml'),{code:'ENOENT'});
  } finally { await rm(root,{recursive:true,force:true}); }
});
