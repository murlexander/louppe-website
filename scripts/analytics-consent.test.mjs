import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../analytics-consent.js', import.meta.url), 'utf8');
const key = 'louppe.analytics-consent.v1';
const disableKey = 'ga-disable-G-9P9KKLZ5BN';
const lifetime = 180 * 24 * 60 * 60 * 1000;

function browser(initial = null) {
  const storage = new Map(initial === null ? [] : [[key, JSON.stringify(initial)]]);
  const tabs = [];
  const clock = { now: Date.now() };
  function page({ blocked = false, writeBlocked = false, removeBlocked = false, hostname = 'louppe.eu', protocol = 'https:', pathname = '/', query = '', hash = '', canonical, referrer = '' } = {}) {
    const handlers = new Map();
    const scripts = [];
    const timers = new Map();
    let nextTimer = 0;
    let reloads = 0;
    const banner = { hidden: true };
    const settings = { focus() {}, addEventListener(type, fn) { handlers.set('settings:' + type, fn); } };
    const choices = ['rejected', 'accepted'].map(value => ({ focus() {}, getAttribute() { return value; }, addEventListener(type, fn) { handlers.set(value + ':' + type, fn); } }));
    const document = {
      cookie: '', visibilityState: 'visible', referrer,
      getElementById() { return banner; },
      querySelector(selector) {
        if (selector === 'link[rel="canonical"]') return canonical === null ? null : { getAttribute() { return canonical ?? protocol + '//' + hostname + pathname; } };
        return settings;
      },
      querySelectorAll() { return choices; },
      createElement() { return {}; }, head: { appendChild(script) { scripts.push(script); } },
      addEventListener(type, fn) { handlers.set('document:' + type, fn); }
    };
    const location = { hostname, protocol, href: protocol + '//' + hostname + pathname + query + hash, reload() { reloads++; } };
    const context = {
      document, location, JSON, Number, URL,
      Date: class extends Date { static now() { return clock.now; } },
      localStorage: {
        getItem(k) { if (blocked) throw Error('blocked'); return storage.get(k) ?? null; },
        setItem(k, value) { if (blocked || writeBlocked) throw Error('blocked'); storage.set(k, value); },
        removeItem(k) { if (blocked || removeBlocked) throw Error('blocked'); storage.delete(k); }
      },
      addEventListener(type, fn) { handlers.set('window:' + type, fn); },
      setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, at: clock.now + delay }); return id; },
      clearTimeout(id) { timers.delete(id); }
    };
    context.window = context;
    vm.runInNewContext(source, context, { filename: 'analytics-consent.js' });
    const tab = {
      context, scripts, banner, timers,
      get reloads() { return reloads; },
      choose(value) { handlers.get(value + ':click')(); },
      event(type, event = {}) { handlers.get(type)?.(event); },
      click(href, { within = [], defaultPrevented = false, button = 0 } = {}) {
        const link = { href, closest(selector) { return selector.split(',').some(part => within.includes(part.trim())) ? {} : null; } };
        handlers.get('document:click')({ defaultPrevented, button, target: { closest() { return link; } } });
      },
      download(href = 'https://github.com/murlexander/louppe-media-culler/releases/latest/download/Louppe.zip', options) { this.click(href, options); },
      events(name) { return Array.from(context.dataLayer ?? []).filter(args => args[0] === 'event' && args[1] === name).map(args => JSON.parse(JSON.stringify(args[2]))); },
      configs() { return Array.from(context.dataLayer ?? []).filter(args => args[0] === 'config').map(args => JSON.parse(JSON.stringify(args[2]))); },
      downloads() { return (context.dataLayer ?? []).filter(args => args[0] === 'event' && args[1] === 'louppe_download').length; },
      fireTimers() { for (const [id, timer] of [...timers]) if (timer.at <= clock.now) { timers.delete(id); timer.fn(); } }
    };
    tabs.push(tab);
    return tab;
  }
  function notifyStorage(origin = null, changedKey = key) {
    for (const tab of tabs) if (tab !== origin) tab.event('window:storage', { key: changedKey });
  }
  return { storage, clock, page, notifyStorage };
}

function accepted() { return { value: 'accepted', at: Date.now() }; }

test('no analytics request before opt-in or from copied deployments', () => {
  const b = browser();
  const undecided = b.page();
  assert.equal(undecided.scripts.length, 0);
  assert.equal(undecided.banner.hidden, false);
  undecided.download();
  assert.equal(undecided.downloads(), 0);
  undecided.choose('accepted');
  assert.equal(undecided.scripts.length, 1);
  undecided.download();
  assert.equal(undecided.downloads(), 1);
  for (const options of [{ hostname: 'localhost' }, { protocol: 'http:' }]) {
    const preview = b.page(options);
    preview.choose('accepted');
    assert.equal(preview.scripts.length, 0);
    assert.equal(preview.context[disableKey], true);
  }
});

test('withdrawal disables every open tab before further download events', () => {
  const b = browser(accepted());
  const a = b.page();
  const other = b.page();
  a.download();
  other.choose('rejected');
  b.notifyStorage(other);
  assert.equal(a.context[disableKey], true);
  assert.equal(other.context[disableKey], true);
  assert.equal(a.reloads, 1);
  a.download(); other.download();
  assert.equal(a.downloads(), 1);
  assert.equal(other.downloads(), 0);
  assert.equal(a.banner.hidden, true);
});

test('download checks revoke consent even if the storage event was missed', () => {
  const b = browser(accepted());
  const a = b.page(); const other = b.page();
  other.choose('rejected');
  a.download();
  assert.equal(a.context[disableKey], true);
  assert.equal(a.downloads(), 0);
});

test('storage removal, clear, corrupt data, and expired consent fail closed', () => {
  for (const replacement of [null, 'broken JSON', JSON.stringify({ value: 'accepted', at: Date.now() - lifetime - 1 }), JSON.stringify({ value: 'accepted', at: Date.now() + 100000 })]) {
    const b = browser(accepted()); const tab = b.page();
    if (replacement === null) b.storage.delete(key); else b.storage.set(key, replacement);
    b.notifyStorage(null, null);
    assert.equal(tab.context[disableKey], true);
    tab.download();
    assert.equal(tab.downloads(), 0);
  }
});

test('focus and visibility reconcile missed consent changes', () => {
  for (const event of ['window:focus', 'document:visibilitychange']) {
    const b = browser(accepted()); const tab = b.page();
    b.storage.set(key, JSON.stringify({ value: 'rejected', at: b.clock.now }));
    tab.event(event);
    assert.equal(tab.context[disableKey], true);
    assert.equal(tab.reloads, 1);
  }
});

test('expiry timer disables an otherwise continuously active tab', () => {
  const b = browser({ value: 'accepted', at: Date.now() - lifetime + 100 });
  const tab = b.page();
  b.clock.now += 101;
  tab.fireTimers();
  assert.equal(tab.context[disableKey], true);
  assert.equal(tab.timers.size, 0);
  tab.download();
  assert.equal(tab.downloads(), 0);
});

test('revocation while the tag is loading disables it and reacceptance is explicit', () => {
  const b = browser(accepted()); const tab = b.page(); const other = b.page();
  assert.equal(tab.scripts.length, 1);
  other.choose('rejected'); b.notifyStorage(other);
  assert.equal(tab.context[disableKey], true);
  tab.download(); assert.equal(tab.downloads(), 0);
  tab.choose('accepted'); b.notifyStorage(tab);
  assert.equal(tab.context[disableKey], false);
  assert.equal(other.context[disableKey], false);
  assert.equal(tab.scripts.length, 1);
  assert.equal(tab.configs().length, 1);
  assert.equal(tab.events('page_view').length, 0);
  tab.download(); assert.equal(tab.downloads(), 1);
});

test('blocked storage allows only the current visit’s explicit opt-in', () => {
  const b = browser(); const tab = b.page({ blocked: true });
  assert.equal(tab.scripts.length, 0);
  tab.choose('accepted'); tab.download();
  assert.equal(tab.scripts.length, 1);
  assert.equal(tab.downloads(), 1);
  tab.choose('rejected'); tab.download();
  assert.equal(tab.context[disableKey], true);
  assert.equal(tab.downloads(), 1);
  assert.equal(tab.timers.size, 0);
});

test('unrelated storage events do not change the current choice', () => {
  const b = browser(accepted()); const tab = b.page();
  b.notifyStorage(null, 'unrelated');
  assert.equal(tab.context[disableKey], false);
  assert.equal(tab.reloads, 0);
});


test('write-only storage failure cannot revive stale acceptance through reload', () => {
  const b = browser(accepted());
  const tab = b.page({ writeBlocked: true });
  const other = b.page();
  tab.choose('rejected');
  assert.equal(tab.context[disableKey], true);
  assert.equal(tab.reloads, 0);
  assert.equal(b.storage.has(key), false);
  b.notifyStorage(tab);
  assert.equal(other.context[disableKey], true);
  const nextPage = b.page({ writeBlocked: true });
  assert.equal(nextPage.scripts.length, 0);
  assert.equal(nextPage.context[disableKey], true);
});

test('unpersistable withdrawal stays disabled without an automatic reload', () => {
  const b = browser(accepted());
  const tab = b.page({ writeBlocked: true, removeBlocked: true });
  tab.choose('rejected');
  assert.equal(tab.context[disableKey], true);
  assert.equal(tab.reloads, 0);
  // A queued earlier acceptance event must not undo a later local refusal.
  b.notifyStorage();
  tab.event('window:focus'); tab.event('document:visibilitychange'); tab.download();
  assert.equal(tab.context[disableKey], true);
  assert.equal(tab.downloads(), 0);
  assert.equal(tab.timers.size, 0);
});


test('download routes are classified only for Louppe and require live consent', () => {
  const store = 'https://apps.apple.com/app/louppe/id6820131477';
  const github = 'https://github.com/murlexander/louppe-media-culler/releases/latest/download/Louppe.zip';
  const homebrew = 'https://github.com/murlexander/louppe-media-culler/blob/main/Docs/HOMEBREW.md';
  const routes = [
    [store, 'app_store'],
    ['https://apps.apple.com/us/app/louppe/id6820131477?mt=12', 'app_store'],
    ['https://apps.apple.com/es/app/id6820131477?l=es', 'app_store'],
    [github, 'github'],
    [homebrew, 'homebrew'],
  ];
  const b = browser(); const tab = b.page();
  for (const [url] of routes) tab.download(url);
  assert.equal(tab.downloads(),0);
  assert.equal(tab.scripts.length,0);
  tab.choose('accepted');
  for (const [url] of routes) tab.download(url);
  const events = tab.context.dataLayer.filter(args=>args[0]==='event');
  assert.deepEqual(Array.from(events, args=>args[2].download_method),routes.map(([,method])=>method));
  for (const args of events) assert.deepEqual(Object.keys(args[2]).sort(),['download_method','download_placement','send_to']);
  for (const url of [
    'https://apps.apple.com/app/id1234567890',
    'https://apps.apple.com/app/louppe/id68201314770',
    'https://apps.apple.com/app/louppe/id6820131477/reviews',
    'https://apps.apple.com.example.org/app/louppe/id6820131477',
    'http://apps.apple.com/app/louppe/id6820131477',
    'https://github.com/murlexander/louppe-media-culler',
    'https://revolut.me/murlexander',
  ]) tab.download(url);
  assert.equal(tab.downloads(),routes.length);
  b.storage.delete(key); // A missed cross-tab event must not permit the new routes.
  for (const [url] of routes) tab.download(url);
  assert.equal(tab.downloads(),routes.length);
  for (const options of [{hostname:'localhost'},{protocol:'http:'}]) {
    const preview = browser(accepted()).page(options);
    for (const [url] of routes) preview.download(url);
    assert.equal(preview.downloads(),0);
    assert.equal(preview.scripts.length,0);
  }
});

test('one ordinary pageview config carries canonical path, page language, and content group in every locale', () => {
  const locales = [['', 'en'], ['es', 'es'], ['pt', 'pt-BR'], ['zh', 'zh-Hans'], ['hi', 'hi'], ['ar', 'ar']];
  for (const [locale, language] of locales) {
    const prefix = locale ? '/' + locale : '';
    for (const [suffix, group] of [['/', 'home'], ['/blog/', 'blog_index'], ['/blog/cull-raw-jpeg-pairs-mac/', 'blog_article'], ['/privacy/', 'privacy']]) {
      const path = prefix + suffix;
      const b = browser(accepted());
      const tab = b.page({ pathname: path, query: '?email=private@example.com&utm_source=untrusted', hash: '#private', referrer: 'https://www.perplexity.ai/search/private-question?secret=value#private' });
      const [config] = tab.configs();
      assert.equal(config.page_location, 'https://louppe.eu' + path);
      assert.equal(config.page_referrer, 'https://www.perplexity.ai/');
      assert.equal(config.page_language, language);
      assert.equal(config.content_group, group);
      assert.equal(config.send_page_view, undefined); // Keep GA4's single automatic config view.
      tab.event('window:focus'); tab.event('document:visibilitychange'); tab.choose('accepted');
      assert.equal(tab.configs().length, 1);
      assert.equal(tab.events('page_view').length, 0); // No second manually emitted view.
      assert.equal(tab.scripts.length, 1);
      assert.equal(JSON.stringify(tab.context.dataLayer).includes('private'), false);
    }
  }
});

test('canonical metadata and its safe fallback never send query, fragment, or unknown route labels', () => {
  const cases = [
    [{ pathname: '/blog/cull-raw-jpeg-pairs-mac/index.html', canonical: 'https://louppe.eu/blog/cull-raw-jpeg-pairs-mac/?secret=private#private' }, '/blog/cull-raw-jpeg-pairs-mac/', 'blog_article'],
    [{ pathname: '/es/blog/', canonical: null, query: '?secret=private', hash: '#private' }, '/es/blog/', 'blog_index'],
    [{ canonical: 'https://example.org/private' }, '/404.html', 'other'],
    [{ canonical: 'javascript:private' }, '/404.html', 'other'],
    [{ pathname: '/private@example.com', canonical: null }, '/404.html', 'other'],
    [{ pathname: '/blog/' + 'a'.repeat(121) + '/', canonical: null }, '/404.html', 'other'],
    [{ pathname: '/privacy/private/', canonical: null }, '/404.html', 'other'],
  ];
  for (const [options, path, group] of cases) {
    const [config] = browser(accepted()).page(options).configs();
    assert.equal(config.page_location, 'https://louppe.eu' + path);
    assert.equal(config.content_group, group);
    assert.equal(config.page_referrer, '');
    assert.equal(JSON.stringify(config).includes('private'), false);
  }
  for (const referrer of ['not a URL', 'file:///private', 'data:text/plain,private']) {
    assert.equal(browser(accepted()).page({ referrer }).configs()[0].page_referrer, '');
  }
  const longestArticle = '/blog/' + 'a'.repeat(93) + '/';
  assert.equal(longestArticle.length, 100);
  const tab = browser(accepted()).page();
  tab.click(longestArticle.slice(0, -1)); // Normalization must stay within GA4's label limit.
  tab.click('/blog/' + 'a'.repeat(94));
  assert.deepEqual(tab.events('louppe_article_open').map(event => event.article_path), [longestArticle]);
});

test('download placement distinguishes home and article calls to action without duplicate events', () => {
  const store = 'https://apps.apple.com/app/louppe/id6820131477?private=value#private';
  for (const [within, placement] of [
    [['.hero'], 'home_hero'],
    [['.get-section'], 'home_footer'],
    [['.site-footer'], 'home_footer'],
    [['.article-body', '.article-cta'], 'article_body'],
    [['.article-cta'], 'article_end'],
    [[], 'other'],
  ]) {
    const tab = browser(accepted()).page();
    tab.download(store, { within });
    assert.deepEqual(tab.events('louppe_download'), [{ send_to: 'G-9P9KKLZ5BN', download_method: 'app_store', download_placement: placement }]);
    assert.equal(tab.events('louppe_article_open').length, 0);
    assert.equal(tab.configs().length, 1);
  }
});

test('article link intent uses only bounded public paths and fixed placement labels in every locale', () => {
  for (const locale of ['', '/es', '/pt', '/zh', '/hi', '/ar']) {
    const tab = browser(accepted()).page({ pathname: locale + '/blog/' });
    tab.click('https://louppe.eu' + locale + '/blog/cull-raw-jpeg-pairs-mac/?secret=private#private', { within: ['main'] });
    assert.deepEqual(tab.events('louppe_article_open'), [{ send_to: 'G-9P9KKLZ5BN', article_path: locale + '/blog/cull-raw-jpeg-pairs-mac/', link_placement: 'blog_index' }]);
    assert.equal(tab.downloads(), 0);
  }
  const home = browser(accepted()).page();
  home.click('/blog/cull-photos-mac-before-lightroom/', { within: ['header', 'nav'] });
  assert.equal(home.events('louppe_article_open')[0].link_placement, 'navigation');
  const article = browser(accepted()).page({ pathname: '/blog/cull-photos-mac-before-lightroom/' });
  article.click('/blog/cull-raw-jpeg-pairs-mac/', { within: ['.article-body'] });
  assert.equal(article.events('louppe_article_open')[0].link_placement, 'article_body');
});

test('non-article, self, unsafe, external, and prevented links produce no article or download event', () => {
  const tab = browser(accepted()).page({ pathname: '/blog/cull-raw-jpeg-pairs-mac/' });
  for (const href of [
    '/blog/cull-raw-jpeg-pairs-mac/?secret=private#section', '/blog/', '/privacy/', '/',
    'https://example.org/blog/article/', 'https://louppe.eu.example.org/blog/article/',
    'http://louppe.eu/blog/article/', 'javascript:alert(1)', 'https://[',
    '/blog/private@example.com/', '/blog/' + 'a'.repeat(121) + '/', '/blog/article/nested/',
  ]) tab.click(href);
  for (const options of [{ defaultPrevented: true }, { button: 2 }]) {
    tab.click('/blog/another-guide/', options);
    tab.download(undefined, options);
  }
  assert.equal(tab.events('louppe_article_open').length, 0);
  assert.equal(tab.downloads(), 0);
});

test('new attribution stays gated before consent, after missed withdrawal, and on previews in every locale', () => {
  for (const locale of ['', '/es', '/pt', '/zh', '/hi', '/ar']) {
    const b = browser();
    const tab = b.page({ pathname: locale + '/blog/' });
    tab.click('/blog/another-guide/'); tab.download();
    assert.equal(tab.context.dataLayer, undefined);
    tab.choose('accepted');
    assert.equal(tab.configs().length, 1);
    b.storage.set(key, JSON.stringify({ value: 'rejected', at: b.clock.now }));
    tab.click('/blog/another-guide/'); tab.download();
    assert.equal(tab.events('louppe_article_open').length, 0);
    assert.equal(tab.downloads(), 0);
    for (const options of [{ hostname: 'localhost' }, { hostname: 'copy.example.org' }, { protocol: 'http:' }]) {
      const preview = browser(accepted()).page({ ...options, pathname: locale + '/blog/' });
      preview.click('https://louppe.eu/blog/another-guide/'); preview.download();
      assert.equal(preview.context.dataLayer, undefined);
      assert.equal(preview.scripts.length, 0);
    }
  }
});
