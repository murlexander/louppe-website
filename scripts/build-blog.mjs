import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { buildLocales } from './build-locales.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const preview = process.argv.includes('--preview');
const out = preview ? resolve(root, '_preview') : root;
const origin = 'https://louppe.eu';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read = path => readFile(resolve(root, path), 'utf8');
const json = async path => JSON.parse(await read(path));
const write = async (path, data) => { await mkdir(dirname(resolve(out, path)), {recursive:true}); await writeFile(resolve(out, path), data); };
const template = await read('templates/blog.html');

async function loadPosts(manifest, directory, draft = false) {
  const records = await json(manifest);
  return Promise.all(records.map(async post => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) || ['feed','index'].includes(post.slug)) throw new Error('Invalid post slug');
    if (!/^[a-z0-9-]+\.md$/.test(post.file)) throw new Error(`Invalid file for ${post.slug}`);
    for (const key of ['title','description']) if (!post[key]?.trim()) throw new Error(`Missing ${key} for ${post.slug}`);
    if (post.status !== (draft ? 'draft' : 'published')) throw new Error(`Wrong publication status for ${post.slug}`);
    if (!draft && (!/^\d{4}-\d{2}-\d{2}$/.test(post.date ?? '') || Number.isNaN(Date.parse(post.date)) || new Date(post.date).toISOString().slice(0,10) !== post.date)) throw new Error(`Published posts need a real calendar date: ${post.slug}`);
    if (!post.cta?.label?.trim()) throw new Error(`Missing call to action for ${post.slug}`);
    if (!/^(https:\/\/|mailto:)/.test(post.cta.href ?? '')) throw new Error(`Invalid CTA URL for ${post.slug}`);
    const body = await read(`${directory}/${post.file}`);
    if (!body.trim()) throw new Error(`Empty article: ${post.slug}`);
    const sections = body.split('<!-- try-louppe -->');
    if (sections.length < 2 || sections.some(section => !section.trim())) throw new Error(`Add a Try Louppe CTA between article sections: ${post.slug}`);
    return {...post, draft, body, html:sections.map(section => marked.parse(section)).join(callToAction(post)), path:`/blog/${post.slug}/`};
  }));
}

const published = (await loadPosts('content/posts.json','content/posts')).sort((a,b)=>b.date.localeCompare(a.date));
let drafts = [];
if (preview) {
  try { drafts = await loadPosts('.drafts/posts.json','.drafts',true); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const posts = [...drafts,...published];
if (new Set(posts.map(p=>p.slug)).size !== posts.length) throw new Error('Duplicate post slugs');

function page({title,description,path,content,post}) {
  const robots = preview ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${origin}${path}"><meta property="og:url" content="${origin}${path}">`;
  const schema = !post || post.draft ? '' : `<script type="application/ld+json">${JSON.stringify({
    '@context':'https://schema.org','@type':'BlogPosting',headline:title,description,url:origin+path,
    datePublished:post.date,author:{'@type':'Person',name:'Alex Markin',url:'https://alex-markin.com/'},
    image:origin+'/media/2026-09-26/social-preview.jpg',mainEntityOfPage:origin+path
  }).replaceAll('<','\\u003c')}</script>`;
  const values = {title:escape(title),description:escape(description),discovery:robots,structured:schema,type:post?'article':'website',current:post?'false':'page',content};
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]).replace(/^[ \t]+$/gm, '');
}
function callToAction(post) {
  return `<aside class="article-cta" aria-label="Try Louppe"><a class="download-button" href="${escape(post.cta.href)}">${escape(post.cta.label)}</a></aside>`;
}
function byline() {
  return `<div class="post-meta"><a href="https://alex-markin.com/" rel="author">Alex Markin</a></div>`;
}
const listing = posts.length ? `<ol class="post-list">${posts.map(post => `<li><h2><a href="${post.path}">${escape(post.title)}</a></h2><p>${escape(post.description)}</p></li>`).join('')}</ol>` : `<section class="blog-empty"><h2>no posts yet</h2><p>notes will appear here</p><a href="/">explore Louppe</a></section>`;
const index = page({title:'blog',description:'Louppe development and release notes by Alex Markin.',path:'/blog/',content:`<header class="blog-heading"><h1>notes on Louppe</h1><p>development and release notes</p></header>${listing}`});
const generated = {'blog/index.html':index};
for (const post of posts) {
  generated[`blog/${post.slug}/index.html`] = page({title:post.title,description:post.description,path:post.path,post,content:`<a class="article-back" href="/blog/">all notes</a><article><header class="post-header"><h1>${escape(post.title)}</h1><p class="post-deck">${escape(post.description)}</p><div class="article-author">${byline()}</div></header><div class="article-body">${post.html}</div>${callToAction(post)}</article>`});
}

if (preview) {
  // Dedicated ignored output; nothing from drafts is written into deployable paths.
  await mkdir(out,{recursive:true});
  for (const name of ['index.html','styles.css','site.js','keyboard.js','analytics-consent.js','blog.css','favicon.ico','favicon.png','media','privacy']) await cp(resolve(root,name),resolve(out,name),{recursive:true});
}
let previous = [];
try { previous = JSON.parse(await readFile(resolve(out,'blog/generated-files.json'),'utf8')); } catch(error) { if(error.code !== 'ENOENT') throw error; }
for (const path of previous) {
  if (!/^blog\/(?:[a-z0-9-]+\/)?(?:index\.html|feed\.xml)$/.test(path)) throw new Error('Invalid generated-file manifest');
  if (!(path in generated)) await rm(resolve(out,path),{force:true});
}
for (const [path,content] of Object.entries(generated)) await write(path,content);
await write('blog/generated-files.json',JSON.stringify(Object.keys(generated),null,2)+'\n');
await buildLocales({ root, out, published, preview });
if(preview) await write('robots.txt','User-agent: *\nDisallow: /\n');
console.log(`${preview?'Private preview':'Public blog'}: ${published.length} published, ${drafts.length} drafts → ${out}`);
