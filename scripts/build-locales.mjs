import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

export const languages = [
  { code: 'en', path: '', label: 'English', og: 'en_US' },
  { code: 'es', path: 'es', label: 'Español', og: 'es_ES' },
  { code: 'zh-Hans', path: 'zh', label: '简体中文', og: 'zh_CN' },
  { code: 'hi', path: 'hi', label: 'हिन्दी', og: 'hi_IN' },
  { code: 'pt', path: 'pt', label: 'Português', og: 'pt_BR' },
  { code: 'ar', path: 'ar', label: 'العربية', og: 'ar_AR' },
];
const origin = 'https://louppe.eu';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode = value => value.replace(/&(?:amp|lt|gt|quot|#39);/g, c => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[c]));
export const localizedPath = (path, language) => language.path ? `/${language.path}${path}` : path;
const invariant = /^(?:[A-Z0-9+\-=]|·|×|louppe|Alex Markin|a@alex-markin\.com|alex-markin\.com|English)$/;

// Translate text and accessible labels, never URLs, keys, code, or executable scripts.
// Unknown copy fails explicitly rather than shipping an English fallback as a translation.
export function translateHTML(html, dictionary, language) {
  const t = value => {
    const key = decode(value.trim());
    if (!key || invariant.test(key)) return value;
    const translated = dictionary[key]?.[language.code];
    if (typeof translated !== 'string' || !translated.trim()) throw new Error(`Missing ${language.code} translation: ${key}`);
    return value.replace(value.trim(), escape(translated));
  };
  let skip = 0;
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<li lang="en">[\s\S]*?<\/li>|<[^>]+>|[^<]+/g, token => {
    if (/^<script\b|^<li lang="en">/.test(token)) return token;
    if (/^<\/(?:kbd|code)\b/.test(token)) skip--;
    if (token.startsWith('<')) {
      const localized = token.replace(/\b(alt|aria-label)="([^"]*)"/g, (_, name, value) => `${name}="${t(value)}"`)
        .replace(/(<meta\b[^>]*(?:name|property)="(?:description|og:title|og:description|og:image:alt|twitter:title|twitter:description|twitter:image:alt)"[^>]*content=")([^"]*)/g, (_, prefix, value) => prefix + t(value));
      if (/^<(?:kbd|code)\b/.test(token)) skip++;
      return localized;
    }
    return skip ? token : t(token);
  });
}

export async function buildLocales({ root, out, published, preview }) {
  const read = path => readFile(resolve(root, path), 'utf8');
  const load = path => readFile(resolve(out, path), 'utf8');
  const dictionary = JSON.parse(await read('content/translations.json'));
  for (const [key, translations] of Object.entries(dictionary)) {
    for (const language of languages) {
      if (typeof translations[language.code] !== 'string' || !translations[language.code].trim()) throw new Error(`Missing ${language.code} translation: ${key}`);
    }
  }
  const write = async (path, html) => {
    const target = resolve(out, path.slice(1), 'index.html');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, html);
  };
  const home = await read('templates/home.html');
  const privacy = await read('templates/privacy.html');
  const listing = await load('blog/index.html');
  const translatedPosts = [];
  const englishPosts = [];
  for (const post of published) {
    const source = await load(`blog/${post.slug}/index.html`);
    try {
      for (const language of languages.slice(1)) translateHTML(source, dictionary, language);
      translatedPosts.push({ ...post, source });
    } catch (error) {
      if (!error.message.startsWith('Missing ')) throw error;
      englishPosts.push(post);
      console.log(`English-only article (add translations to localize): ${post.slug}`);
    }
  }
  const listingSource = listing.replace(/<li>[\s\S]*?<\/li>/g, item => !translatedPosts.some(post => item.includes(`href="${post.path}"`)) ? item.replace('<li>', '<li lang="en">').replace('</h2>', ' <span class="small">(English)</span></h2>') : item);
  const pages = [
    { path: '/', source: home },
    { path: '/privacy/', source: privacy },
    { path: '/blog/', source: listing, localeSource: listingSource },
    ...translatedPosts.map(post => ({ path: post.path, source: post.source })),
  ];
  const localizablePaths = new Set(pages.map(page => page.path));
  const uiKeys = JSON.parse(await read('content/translation-ui-keys.json'));
  const written = [];
  const outputs = [];
  for (const page of pages) {
    for (const language of languages) {
      // Preserve the English blog generator's original editorial copy.
      let html = language.code === 'en' && page.path !== '/' ? page.source : translateHTML(page.localeSource ?? page.source, dictionary, language);
      const path = localizedPath(page.path, language);
      html = html.replace(/<html lang="en">/, `<html lang="${language.code}"${language.code === 'ar' ? ' dir="rtl"' : ''}>`);
      html = html.replace(/(?:src|href|poster)="media\//g, value => value.replace('media/', '/media/')).replace(/srcset="media\//g, 'srcset="/media/').replace(/, media\//g, ', /media/');
      html = html.replace(/href="(\/(?:[^"#]*))(#[^"]*)?"/g, (match, target, hash = '') => localizablePaths.has(target) ? `href="${localizedPath(target, language)}${hash}"` : match);
      html = html.replace(/<link rel="canonical"[^>]*>/g, '').replace(/<meta property="og:url"[^>]*>/g, '');
      const alternates = languages.map(other => `<link rel="alternate" hreflang="${other.code}" href="${origin}${localizedPath(page.path, other)}">`).join('\n  ');
      const discovery = `<link rel="canonical" href="${origin}${path}">\n  <meta property="og:url" content="${origin}${path}">\n  <meta property="og:locale" content="${language.og}">\n  ${alternates}\n  <link rel="alternate" hreflang="x-default" href="${origin}${page.path}">`;
      html = html.replace('</head>', `  ${discovery}\n</head>`);
      html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (_, json) => {
        const schema = JSON.parse(json);
        if (schema['@type'] === 'SoftwareApplication') {
          schema.description = dictionary['free photo, video, and audio culling for macOS. review, rate, organize, and export locally with Louppe.'][language.code];
          schema.featureList = ['photos, video, audio, and text','zoom and compare','filter, sort, and organise','export and clean up','local, free, and open source'].map(key => dictionary[key][language.code]);
          schema.offers = { '@type': 'Offer', price: '0', priceCurrency: 'USD' };
        } else if (schema['@type'] === 'BlogPosting') {
          schema.headline = dictionary[schema.headline]?.[language.code] ?? schema.headline;
          schema.description = dictionary[schema.description]?.[language.code] ?? schema.description;
          schema.url = origin + path;
          schema.mainEntityOfPage = origin + path;
          schema.inLanguage = language.code;
        }
        return `<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`;
      });
      const pageSchema = { '@context':'https://schema.org', '@type':'WebPage', '@id':origin+path+'#webpage', url:origin+path, inLanguage:language.code, name:decode(html.match(/<title>(.*?)<\/title>/s)[1]) };
      if (page.path === '/') pageSchema.mainEntity = { '@id': origin+'/#app' };
      html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(pageSchema).replaceAll('<', '\\u003c')}</script>\n</head>`);
      const switcher = `<details class="language-switch"><summary><svg class="language-globe" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg><span>${escape(dictionary.languages[language.code])}</span></summary><ul>${languages.map(other => `<li><a href="${localizedPath(page.path, other)}" hreflang="${other.code}" lang="${other.code}" dir="${other.code === 'ar' ? 'rtl' : 'ltr'}"${other.code === language.code ? ' aria-current="page"' : ''}>${other.label}</a></li>`).join('')}</ul></details>`;
      html = html.replace('</nav>\n  </header>', `${switcher}</nav>\n  </header>`);
      if (page.path === '/') {
        const ui = Object.fromEntries(uiKeys.map(key => [key, dictionary[key][language.code]]));
        html = html.replace('</head>', `<script id="site-translations" type="application/json">${JSON.stringify(ui).replaceAll('<', '\\u003c')}</script>\n</head>`);
      }
      if (preview) html = html.replace(/<meta name="robots"[^>]*>/g, '').replace('</head>', '<meta name="robots" content="noindex, nofollow">\n</head>');
      outputs.push({ path, html: html.replace(/^[ \t]+$/gm, '') });
      if (language.path) written.push(path.slice(1) + 'index.html');
    }
  }
  for (const { path, html } of outputs) await write(path, html);
  // English-only posts keep their original generator output and sitemap entries.
  const sitemapPaths = [...pages.flatMap(page => languages.map(language => localizedPath(page.path, language))), ...englishPosts.map(post => post.path)];
  await writeFile(resolve(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapPaths.map(path => `\n  <url><loc>${origin}${path}</loc></url>`).join('')}\n</urlset>\n`);
  let previous = [];
  try { previous = JSON.parse(await load('content/generated-locales.json')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const path of previous) {
    if (!/^(?:es|zh|hi|pt|ar)\/(?:privacy\/|blog\/(?:[a-z0-9-]+\/)?)?index\.html$/.test(path)) throw new Error('Invalid locale output manifest');
    if (!written.includes(path)) await rm(resolve(out, path), { force: true });
  }
  await mkdir(resolve(out, 'content'), { recursive: true });
  await writeFile(resolve(out, 'content/generated-locales.json'), JSON.stringify(written, null, 2)+'\n');
  console.log(`Localized site: ${pages.length} pages × ${languages.length} languages`);
}
