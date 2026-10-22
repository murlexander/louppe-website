import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../site.js', import.meta.url), 'utf8');

function setup(hash = '') {
  function element(attributes = {}) {
    const listeners = new Map();
    return {
      ...attributes,
      addEventListener(type, callback) {
        const handlers = listeners.get(type) ?? [];
        handlers.push(callback);
        listeners.set(type, handlers);
      },
      fire(type, event = {}) { for (const callback of listeners.get(type) ?? []) callback(event); },
      setAttribute(name, value) { this[name] = value; },
      removeAttribute(name) { delete this[name]; },
      getBoundingClientRect() { return {left: 0, top: 0, right: 100, bottom: 100}; },
    };
  }
  const appImage = element();
  const dialogImage = element();
  const imageLink = element();
  const imageDialog = element({open: false});
  imageDialog.showModal = () => { imageDialog.open = true; };
  imageDialog.close = () => { imageDialog.open = false; imageDialog.fire('close'); };
  const imagePanel = element({hidden: false});
  const media = [element({dataset: {src: '/media/showcase.mp4'}}), element({dataset: {src: '/media/showcase.vtt'}})];
  const video = element({
    dataset: {poster: '/media/showcase-poster.jpg'},
    loads: 0, pauses: 0,
    load() { this.loads++; },
    pause() { this.pauses++; },
    querySelectorAll() { return media; },
  });
  const demoPanel = element({hidden: true, scrolls: 0, querySelector: () => video, scrollIntoView() { this.scrolls++; }});
  const buttons = ['gallery', 'grid', 'demo'].map(view => element({dataset: {view}}));
  const elements = {'app-image': appImage, 'image-link': imageLink, 'image-dialog': imageDialog, 'dialog-image': dialogImage, 'image-panel': imagePanel, 'review-demo': demoPanel};
  const document = element({
    hidden: false,
    getElementById: id => elements[id],
    querySelectorAll: selector => selector === 'dialog' ? [imageDialog] : buttons,
    body: {style: {setProperty(name, value) { this[name] = value; }}},
  });
  let intersection;
  const window = element({IntersectionObserver: true});
  const context = {document, window, location: {hash}, IntersectionObserver: class {
    constructor(callback) { intersection = callback; }
    observe() {}
  }};
  vm.runInNewContext(source, context);
  const select = view => buttons.find(button => button.dataset.view === view).fire('click');
  return {appImage, dialogImage, imageLink, imageDialog, imagePanel, demoPanel, video, media, buttons, document, window, select, intersect: visible => intersection([{isIntersecting: visible}])};
}

test('ordinary visits leave demo media and full-size enlargement unloaded', () => {
  const page = setup();
  assert.equal(page.video.loads, 0);
  assert.equal(page.video.poster, undefined);
  assert.ok(page.media.every(media => media.src === undefined));
  assert.equal(page.dialogImage.src, undefined);
  page.select('grid');
  assert.equal(page.video.loads, 0);
  assert.equal(page.dialogImage.src, undefined);
});

test('Gallery and Grid use root-relative image candidates in every language', () => {
  const page = setup();
  for (const view of ['grid', 'gallery']) {
    page.select(view);
    assert.ok(page.appImage.src.startsWith('/media/'));
    assert.ok(page.appImage.srcset.split(',').every(candidate => candidate.trim().startsWith('/media/')));
    assert.equal(page.imageLink.href, page.appImage.src);
    assert.equal(page.imagePanel.hidden, false);
    assert.equal(page.demoPanel.hidden, true);
    assert.equal(page.buttons.find(button => button.dataset.view === view)['aria-pressed'], 'true');
  }
});

test('Demo attaches its poster, source, and captions once, without autoplay', () => {
  const page = setup();
  page.select('demo');
  assert.equal(page.video.poster, page.video.dataset.poster);
  assert.ok(page.media.every(media => media.src === media.dataset.src));
  assert.equal(page.video.loads, 1);
  assert.equal(page.imagePanel.hidden, true);
  assert.equal(page.demoPanel.hidden, false);
  page.select('grid');
  assert.ok(page.video.pauses > 0);
  page.select('demo');
  assert.equal(page.video.loads, 1);
});

test('written demo links load the selected view directly', () => {
  for (const hash of ['#review-demo', '#walkthrough']) {
    const page = setup(hash);
    assert.equal(page.video.loads, 1);
    assert.equal(page.demoPanel.hidden, false);
    assert.equal(page.demoPanel.scrolls, 1);
  }
  assert.equal(setup('#main').video.loads, 0);
});

test('enlargement releases its image on close and preserves modified navigation', () => {
  const page = setup();
  page.select('grid');
  let prevented = false;
  const click = overrides => page.imageLink.fire('click', {button: 0, preventDefault() { prevented = true; }, ...overrides});
  for (const overrides of [{metaKey: true}, {ctrlKey: true}, {shiftKey: true}, {altKey: true}, {button: 1}]) click(overrides);
  assert.equal(prevented, false);
  assert.equal(page.imageDialog.open, false);
  click();
  assert.equal(prevented, true);
  assert.equal(page.imageDialog.open, true);
  assert.equal(page.dialogImage.src, page.appImage.src);
  page.imageDialog.close();
  assert.equal(page.dialogImage.src, undefined);
  // A delayed close event must not clear a newly reopened image.
  click();
  page.imageDialog.fire('close');
  assert.equal(page.dialogImage.src, page.appImage.src);
});

test('leaving the viewport or page pauses playback; returning never resumes it', () => {
  const page = setup();
  page.select('demo');
  page.intersect(false);
  assert.equal(page.video.pauses, 1);
  page.intersect(true);
  assert.equal(page.video.pauses, 1);
  page.document.hidden = true;
  page.document.fire('visibilitychange');
  assert.equal(page.video.pauses, 2);
  assert.equal(page.document.body.style['--grain-play-state'], 'paused');
  page.document.hidden = false;
  page.document.fire('visibilitychange');
  assert.equal(page.video.pauses, 2);
  assert.equal(page.document.body.style['--grain-play-state'], 'running');
  page.window.fire('pagehide');
  assert.equal(page.video.pauses, 3);
});
