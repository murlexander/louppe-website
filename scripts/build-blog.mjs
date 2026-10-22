import { access, readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { buildLocales, languages, translateHTML } from './build-locales.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const preview = process.argv.includes('--preview');
const out = preview ? resolve(root, '_preview') : root;
const origin = 'https://louppe.eu';
const defaultImage = {src:'/media/2026-09-26/social-preview.jpg',alt:'Louppe reviewing a local media folder on Mac'};
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read = path => readFile(resolve(root, path), 'utf8');
const json = async path => JSON.parse(await read(path));
const write = async (path, data) => { await mkdir(dirname(resolve(out, path)), {recursive:true}); await writeFile(resolve(out, path), data); };
const template = await read('templates/blog.html');
const mediaDimensions = await json('content/media-dimensions.json');
marked.use({renderer:{image({href, title, text}) {
  const dimensions = mediaDimensions[href];
  const size = dimensions ? ` width="${dimensions.width}" height="${dimensions.height}"` : '';
  return `<a class="article-image-link" href="${escape(href)}"><img src="${escape(href)}" alt="${escape(text)}"${size} loading="lazy" decoding="async"${title ? ` title="${escape(title)}"` : ''}></a>`;
}}});

async function loadPosts(manifest, directory, draft = false) {
  const records = await json(manifest);
  return Promise.all(records.map(async post => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) || ['feed','index'].includes(post.slug)) throw new Error('Invalid post slug');
    const content = await loadContent(post, directory, post.slug);
    if (post.status !== (draft ? 'draft' : 'published')) throw new Error(`Wrong publication status for ${post.slug}`);
    if (!draft && (!/^\d{4}-\d{2}-\d{2}$/.test(post.date ?? '') || Number.isNaN(Date.parse(post.date)) || new Date(post.date).toISOString().slice(0,10) !== post.date)) throw new Error(`Published posts need a real calendar date: ${post.slug}`);
    if (!post.cta?.label?.trim()) throw new Error(`Missing call to action for ${post.slug}`);
    if (!/^(https:\/\/|mailto:)/.test(post.cta.href ?? '')) throw new Error(`Invalid CTA URL for ${post.slug}`);
    const translations = {};
    if (post.translations !== undefined) {
      if (!post.translations || Array.isArray(post.translations) || typeof post.translations !== 'object') throw new Error(`Invalid translations for ${post.slug}`);
      for (const code of Object.keys(post.translations)) if (!languages.slice(1).some(language => language.code === code)) throw new Error(`Unknown translation ${code} for ${post.slug}`);
      for (const language of languages.slice(1)) {
        const translation = post.translations[language.code];
        if (!translation) throw new Error(`Missing ${language.code} article translation: ${post.slug}`);
        translations[language.code] = {...translation, ...await loadContent(translation, directory, `${post.slug} (${language.code})`)};
      }
    }
    return {...post, ...content, draft, translations:post.translations === undefined ? undefined : translations, path:`/blog/${post.slug}/`};
  }));
}

async function loadContent(record, directory, name) {
  if (!/^[a-z0-9-]+\.md$/.test(record.file)) throw new Error(`Invalid file for ${name}`);
  for (const key of ['title','description']) if (typeof record[key] !== 'string' || !record[key].trim()) throw new Error(`Missing ${key} for ${name}`);
  if (record.image !== undefined) {
    if (typeof record.image?.src !== 'string' || !/^\/media\/[a-zA-Z0-9/_-]+\.(?:jpg|png|webp)$/.test(record.image.src) || typeof record.image?.alt !== 'string' || !record.image.alt.trim()) throw new Error(`Invalid article image for ${name}`);
    await access(resolve(root, record.image.src.slice(1)));
  }
  if (record.cover !== undefined) {
    const {src,small,alt,width,height} = record.cover ?? {};
    if (![src,small].every(path => typeof path === 'string' && /^\/media\/[a-zA-Z0-9/_-]+\.(?:jpg|png|webp)$/.test(path)) || typeof alt !== 'string' || !alt.trim() || ![width,height].every(value => Number.isInteger(value) && value > 0)) throw new Error(`Invalid article cover for ${name}`);
    await Promise.all([src,small].map(path => access(resolve(root,path.slice(1)))));
    if (record.cover.thumbnail !== undefined) {
      const thumbnail = record.cover.thumbnail;
      const dimensions = mediaDimensions[thumbnail];
      if (typeof thumbnail !== 'string' || !/^\/media\/[a-zA-Z0-9/_-]+\.webp$/.test(thumbnail) || ![dimensions?.width,dimensions?.height].every(value => Number.isInteger(value) && value > 0)) throw new Error(`Invalid cover thumbnail for ${name}`);
      await access(resolve(root,thumbnail.slice(1)));
    }
    if (record.cover.caption !== undefined && (typeof record.cover.caption !== 'string' || !record.cover.caption.trim())) throw new Error(`Invalid cover caption for ${name}`);
  }
  const body = await read(`${directory}/${record.file}`);
  if (!body.trim()) throw new Error(`Empty article: ${name}`);
  const sections = body.split('<!-- try-louppe -->');
  if (sections.length < 2 || sections.some(section => !section.trim())) throw new Error(`Add a Try Louppe CTA between article sections: ${name}`);
  return {body, sections};
}

const published = (await loadPosts('content/posts.json','content/posts')).sort((a,b)=>b.date.localeCompare(a.date));
let drafts = [];
if (preview) {
  let hasDrafts = true;
  try { await read('.drafts/posts.json'); } catch (error) { if (error.code !== 'ENOENT') throw error; hasDrafts = false; }
  if (hasDrafts) drafts = await loadPosts('.drafts/posts.json','.drafts',true);
}
const posts = [...drafts,...published];
if (new Set(posts.map(p=>p.slug)).size !== posts.length) throw new Error('Duplicate post slugs');

function page({title,description,path,content,post,shell=template}) {
  const image = post?.image ?? defaultImage;
  const robots = preview ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${origin}${path}"><meta property="og:url" content="${origin}${path}">`;
  const schema = !post || post.draft ? '' : `<script type="application/ld+json">${JSON.stringify({
    '@context':'https://schema.org','@type':'BlogPosting',headline:title,description,url:origin+path,
    datePublished:post.date,author:{'@type':'Person',name:'Alex Markin',url:'https://alex-markin.com/'},
    image:origin+image.src,mainEntityOfPage:origin+path,inLanguage:'en'
  }).replaceAll('<','\\u003c')}</script>`;
  const values = {title:escape(title),description:escape(description),image:escape(origin+image.src),imageAlt:escape(image.alt),discovery:robots,structured:schema,type:post?'article':'website',current:post?'false':'page',content};
  return shell.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]).replace(/^[ \t]+$/gm, '');
}
function callToAction(post) {
  return `<aside class="article-cta" aria-label="${escape(post.cta.label)}"><a class="download-button" href="${escape(post.cta.href)}">${escape(post.cta.label)}</a></aside>`;
}
function byline() {
  return `<div class="post-meta"><a href="https://alex-markin.com/" rel="author">Alex Markin</a></div>`;
}
function coverImage(cover, thumbnail = false) {
  if (!cover) return '';
  const sizes = thumbnail ? '(max-width: 600px) calc(100vw - 40px), 172px' : '(max-width: 680px) calc(100vw - 40px), (max-width: 1104px) calc(100vw - 64px), 1040px';
  const smallWidth = mediaDimensions[cover.small]?.width ?? 800;
  const thumbnailSource = cover.thumbnail ?? cover.small;
  const candidates = `${cover.thumbnail ? `${escape(cover.thumbnail)} ${mediaDimensions[cover.thumbnail].width}w, ` : ''}${escape(cover.small)} ${smallWidth}w, ${escape(cover.src)} ${cover.width}w`;
  return `<img${thumbnail ? ' class="post-thumbnail"' : ''} src="${escape(thumbnail ? thumbnailSource : cover.src)}" srcset="${candidates}" sizes="${sizes}" alt="${thumbnail ? '' : escape(cover.alt)}" width="${cover.width}" height="${cover.height}"${thumbnail ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async">`;
}
const listing = posts.length ? `<ol class="post-list">${posts.map(post => `<li><h2><a href="${post.path}">${escape(post.title)}</a></h2>${coverImage(post.cover,true)}<p>${escape(post.description)}</p></li>`).join('')}</ol>` : `<section class="blog-empty"><h2>no posts yet</h2><p>notes will appear here</p><a href="/">explore Louppe</a></section>`;
const index = page({title:'Photo culling guides and Louppe news',description:'Photo culling guides for Mac, RAW + JPEG workflows, and Louppe development notes by Alex Markin.',path:'/blog/',content:`<header class="blog-heading"><h1>notes on Louppe</h1><p>photo culling guides and development notes</p></header>${listing}`});
const generated = {'blog/index.html':index};
function article(post, {shell=template, backLabel='all notes'} = {}) {
  const html = post.sections.map(section => marked.parse(section)).join(callToAction(post));
  const caption = post.cover?.caption ? `<figcaption>${escape(post.cover.caption)}</figcaption>` : '';
  const cover = post.cover ? `<figure class="article-cover"><a href="${escape(post.cover.src)}">${coverImage(post.cover)}</a>${caption}</figure>` : '';
  return page({title:post.title,description:post.description,path:post.path,post,shell,content:`<a class="article-back" href="/blog/">${escape(backLabel)}</a><article><header class="post-header"><h1>${escape(post.title)}</h1><p class="post-deck">${escape(post.description)}</p><div class="article-author">${byline()}</div></header>${cover}<div class="article-body">${html}</div>${callToAction(post)}</article>`});
}
function renderTranslation(post, language, dictionary) {
  const label = dictionary[post.cta.label]?.[language.code];
  if (!label) throw new Error(`Missing ${language.code} translation: ${post.cta.label}`);
  if (post.cover && !dictionary[post.cover.alt]?.[language.code]) throw new Error(`Missing ${language.code} cover description: ${post.cover.alt}`);
  if (post.cover?.caption && !dictionary[post.cover.caption]?.[language.code]) throw new Error(`Missing ${language.code} cover caption: ${post.cover.caption}`);
  const cover = post.cover ? {...post.cover,alt:dictionary[post.cover.alt][language.code],caption:post.cover.caption ? dictionary[post.cover.caption][language.code] : undefined} : undefined;
  const localized = {...post, ...post.translations[language.code], cover, image:post.translations[language.code].image ?? post.image ?? {...defaultImage,alt:dictionary[defaultImage.alt][language.code]}, cta:{...post.cta,label}};
  return article(localized, {shell:translateHTML(template,dictionary,language), backLabel:dictionary['all notes'][language.code]});
}
for (const post of posts) generated[`blog/${post.slug}/index.html`] = article(post);

if (preview) {
  // Dedicated ignored output; nothing from drafts is written into deployable paths.
  await mkdir(out,{recursive:true});
  for (const name of ['index.html','styles.css','prefetch.js','site.js','keyboard.js','analytics-consent.js','blog.css','favicon.ico','favicon.png','media','privacy']) await cp(resolve(root,name),resolve(out,name),{recursive:true});
}
let previous = [];
try { previous = JSON.parse(await readFile(resolve(out,'blog/generated-files.json'),'utf8')); } catch(error) { if(error.code !== 'ENOENT') throw error; }
for (const path of previous) {
  if (!/^blog\/(?:[a-z0-9-]+\/)?(?:index\.html|feed\.xml)$/.test(path)) throw new Error('Invalid generated-file manifest');
  if (!(path in generated)) await rm(resolve(out,path),{force:true});
}
for (const [path,content] of Object.entries(generated)) await write(path,content);
await write('blog/generated-files.json',JSON.stringify(Object.keys(generated),null,2)+'\n');
await buildLocales({ root, out, published, drafts, preview, renderTranslation });
if(preview) await write('robots.txt','User-agent: *\nDisallow: /\n');
console.log(`${preview?'Private preview':'Public blog'}: ${published.length} published, ${drafts.length} drafts → ${out}`);
