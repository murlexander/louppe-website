// Reference: app README.md, Keyboard shortcuts, and SessionView.handleKey
(() => {
  const explorer = document.querySelector('.key-explorer');
  if (!explorer) return;
  const review = {
    f: 'mark yes',
    d: 'mark no',
    g: 'Gallery / Grid',
    tab: 'Gallery / Grid',
    space: 'play / pause video or audio. next photo or text',
    k: 'play / pause',
    j: 'previous item',
    l: 'next item',
    arrowleft: 'previous / seek −0.5s',
    arrowright: 'next / seek +0.5s',
    arrowup: 'previous item / row',
    arrowdown: 'next item / row',
    s: '100% zoom',
    a: 'phone-sized preview',
    x: 'show / hide clipping',
    q: 'show / hide thumbnails',
    w: 'show / hide info',
    e: 'open Export',
    r: 'clear all decisions',
    z: 'undo last action',
    escape: 'cancel / deselect',
    0: 'clear stars',
  };
  for (let stars = 1; stars <= 5; stars++) {
    review[stars] = siteTranslations['rate {count} stars']
      ? translateSite(stars === 1 ? 'rate {count} star' : 'rate {count} stars').replace('{count}', stars)
      : `rate ${stars} ${stars === 1 ? 'star' : 'stars'}`;
  }
  const command = {
    o: 'open a folder',
    r: 'rescan folder',
    f: 'filter / search',
    k: 'command palette',
    a: 'select all visible',
    e: review.e,
    z: review.z,
    '-': 'smaller thumbnails',
    '=': 'larger thumbnails',
    backspace: 'move to Trash',
    arrowleft: 'slower / previous',
    arrowright: 'faster / next',
  };
  const shift = {
    ...Object.fromEntries(Object.entries(review).filter(([key]) => /^[a-z]$/.test(key))),
    arrowleft: 'seek back 5 seconds',
    arrowright: 'seek ahead 5 seconds',
  };
  const commandShift = {
    '=': command['='],
    arrowleft: 'select to first item',
    arrowright: 'select to last item',
  };
  const glyphs = { space: 'space', tab: 'tab', escape: 'esc', backspace: '⌫', arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', '=': '+' };
  const names = { space: 'Space', tab: 'Tab', escape: 'Escape', backspace: 'Delete', arrowleft: 'Left arrow', arrowright: 'Right arrow', arrowup: 'Up arrow', arrowdown: 'Down arrow', '=': 'Plus' };
  const buttons = [...explorer.querySelectorAll('[data-shortcut-key]')];
  const modifiers = [...explorer.querySelectorAll('[data-modifier]')];
  const chord = document.getElementById('shortcut-chord');
  const explanation = document.getElementById('shortcut-explanation');
  let commandOn = false;
  let shiftOn = false;
  let selectedKey = 'f';
  const map = () => commandOn ? (shiftOn ? commandShift : command) : (shiftOn ? shift : review);
  const prefix = () => `${commandOn ? '⌘' : ''}${shiftOn ? '⇧' : ''}`;

  function render() {
    const shortcuts = map();
    if (!shortcuts[selectedKey]) selectedKey = Object.keys(shortcuts)[0];
    for (const button of buttons) {
      const key = button.dataset.shortcutKey;
      const action = shortcuts[key] && translateSite(shortcuts[key]);
      button.disabled = !action;
      button.setAttribute('aria-pressed', String(key === selectedKey));
      button.setAttribute('aria-label', action ? `${prefix()}${translateSite(names[key] || key.toUpperCase())}: ${action}` : `${translateSite(names[key] || key.toUpperCase())}: ${translateSite('no shortcut')}`);
    }
    for (const button of modifiers) {
      const name = button.dataset.modifier;
      const on = name === 'command' ? commandOn : shiftOn;
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-label', translateSite(`${on ? 'Hide' : 'Show'} ${name === 'command' ? 'Command' : 'Shift'} shortcuts`));
    }
    const action = translateSite(shortcuts[selectedKey]);
    chord.textContent = `${prefix()}${glyphs[selectedKey] || selectedKey}`;
    explanation.textContent = action;
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    selectedKey = button.dataset.shortcutKey;
    render();
  }));
  modifiers.forEach(button => button.addEventListener('click', () => {
    if (button.dataset.modifier === 'command') commandOn = !commandOn;
    else shiftOn = !shiftOn;
    render();
  }));
  // Real review keys work only while the keyboard itself has focus.
  // Keep Tab, Escape, and browser modifier combinations with the browser.
  explorer.querySelector('.keyboard-layout').addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey || (event.shiftKey && !shiftOn) || ['Tab', 'Escape', 'Enter', 'Shift'].includes(event.key)) return;
    if (event.key === ' ' && event.target.matches('button')) return;
    const key = event.key === ' ' ? 'space' : event.key.toLowerCase();
    if (!map()[key]) return;
    event.preventDefault();
    selectedKey = key;
    render();
  });
  const compactQuery = window.matchMedia('(max-width: 600px)');
  const pad = explorer.querySelector('.shortcut-pad');
  const compactOrder = ['f', 'd', 'g', 'space', 's', 'a', 'x', 'z', 'j', 'k', 'l', 'q', 'w', 'e', 'r', 'tab', 'escape', 'o', '0', '1', '2', '3', '4', '5', 'arrowleft', 'arrowup', 'arrowdown', 'arrowright', '-', '=', 'backspace'];
  const compactButtons = [
    modifiers.find(button => button.dataset.modifier === 'command'),
    modifiers.find(button => button.dataset.modifier === 'shift'),
    ...compactOrder.map(key => buttons.find(button => button.dataset.shortcutKey === key))
  ];
  const positions = compactButtons.map(button => {
    const anchor = document.createComment('keyboard key position');
    button.before(anchor);
    return { button, anchor };
  });
  function arrangeKeyboard() {
    for (const { button, anchor } of positions) {
      if (compactQuery.matches) pad.append(button);
      else anchor.after(button);
    }
  }
  compactQuery.addEventListener('change', arrangeKeyboard);
  arrangeKeyboard();
  render();
})();
