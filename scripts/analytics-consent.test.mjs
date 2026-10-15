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
  function page({ blocked = false, writeBlocked = false, removeBlocked = false, hostname = 'louppe.eu', protocol = 'https:' } = {}) {
    const handlers = new Map();
    const scripts = [];
    const timers = new Map();
    let nextTimer = 0;
    let reloads = 0;
    const banner = { hidden: true };
    const settings = { focus() {}, addEventListener(type, fn) { handlers.set('settings:' + type, fn); } };
    const choices = ['rejected', 'accepted'].map(value => ({ focus() {}, getAttribute() { return value; }, addEventListener(type, fn) { handlers.set(value + ':' + type, fn); } }));
    const document = {
      cookie: '', visibilityState: 'visible',
      getElementById() { return banner; }, querySelector() { return settings; }, querySelectorAll() { return choices; },
      createElement() { return {}; }, head: { appendChild(script) { scripts.push(script); } },
      addEventListener(type, fn) { handlers.set('document:' + type, fn); }
    };
    const location = { hostname, protocol, href: protocol + '//' + hostname + '/', reload() { reloads++; } };
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
      download(href = 'https://github.com/murlexander/louppe-media-culler/releases/latest/download/Louppe.zip') { handlers.get('document:click')({ target: { closest() { return { href }; } } }); },
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
  for (const args of events) assert.deepEqual(Object.keys(args[2]).sort(),['download_method','send_to']);
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
