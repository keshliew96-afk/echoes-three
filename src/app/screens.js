// Screen / menu manager (docs/gauntlet/PLAN.md §3.3). Owner: M1.
// ARCH stub: the API every module codes against, with a minimal working
// stack + linear focus model. M1 replaces the internals (focus rings, grid
// navigation, gamepad polling, latency probes, transitions) WITHOUT changing
// these signatures.
//
// SCREEN CONTRACT — registerScreen(id, factory) (src/app/registry.js):
//   factory(ctx) -> {
//     el: HTMLElement,              // mounted under #app-ui while on the stack
//     blocking?: true,              // true: gates game input; single-player sim pauses
//     onOpen?(params), onClose?(),  // pushed / popped
//     onFocus?(), onBlur?(),        // became top again / covered by another screen
//     onNav?(action, source) -> bool,   // screen-specific handling first; true = consumed
//     back?() -> bool,              // Esc / B / Backspace; return true when handled
//                                   //   (default when absent: pop this screen)
//     defaultFocus?: string,        // CSS selector of the primary item
//   }
//   ctx: { manager, app, settings, services: { service }, params }
//
// NAV ACTIONS (one vocabulary for keyboard, mouse and gamepad):
//   'up' 'down' 'left' 'right' 'confirm' 'back' 'tabPrev' 'tabNext' 'secondary' 'tertiary'
// Focusable items carry [data-nav]; optional [data-nav-default] marks the
// primary; [disabled] / [aria-disabled="true"] items are skipped by movement
// but stay visible with their reason text.
import { EventEmitterLite } from './emitter.js';
import { screenFactory } from './registry.js';

export const NAV_ACTIONS = Object.freeze([
  'up',
  'down',
  'left',
  'right',
  'confirm',
  'back',
  'tabPrev',
  'tabNext',
  'secondary',
  'tertiary',
]);

export function createScreenManager({ root, ctx = {} } = {}) {
  const emitter = new EventEmitterLite();
  const stack = []; // [{ id, screen, params, focusIndex }]
  const cache = new Map(); // id -> screen instance (built once)

  function build(id) {
    if (cache.has(id)) return cache.get(id);
    const factory = screenFactory(id);
    if (!factory) return null;
    const screen = factory({ ...ctx, manager: api });
    cache.set(id, screen);
    return screen;
  }

  function focusables(entry) {
    if (!entry) return [];
    return [...entry.screen.el.querySelectorAll('[data-nav]')].filter(
      (n) => !n.disabled && n.getAttribute('aria-disabled') !== 'true' && n.offsetParent !== null
    );
  }

  function applyFocus(entry, index) {
    const items = focusables(entry);
    if (items.length === 0) return;
    const i = Math.max(0, Math.min(items.length - 1, index));
    entry.focusIndex = i;
    for (const n of items) n.classList.toggle('ap-focus', n === items[i]);
    if (typeof items[i].focus === 'function') items[i].focus({ preventScroll: false });
  }

  function initialFocus(entry) {
    const items = focusables(entry);
    const sel = entry.screen.defaultFocus;
    const def = (sel && entry.screen.el.querySelector(sel)) || entry.screen.el.querySelector('[data-nav-default]');
    const idx = def ? items.indexOf(def) : 0;
    applyFocus(entry, idx >= 0 ? idx : 0);
  }

  function changed() {
    const t = top();
    emitter.emit('change', { top: t ? t.id : null, stack: stack.map((e) => e.id), blocking: isBlocking() });
  }

  function push(id, params = {}) {
    const screen = build(id);
    if (!screen) return false;
    const prev = stack[stack.length - 1];
    if (prev && prev.screen.onBlur) prev.screen.onBlur();
    const entry = { id, screen, params, focusIndex: 0 };
    stack.push(entry);
    if (root && screen.el.parentNode !== root) root.appendChild(screen.el);
    screen.el.style.display = '';
    if (screen.onOpen) screen.onOpen(params);
    initialFocus(entry);
    changed();
    return true;
  }

  function pop() {
    const entry = stack.pop();
    if (!entry) return null;
    if (entry.screen.onClose) entry.screen.onClose();
    entry.screen.el.style.display = 'none';
    const t = stack[stack.length - 1];
    if (t) {
      if (t.screen.onFocus) t.screen.onFocus();
      applyFocus(t, t.focusIndex); // focus memory per screen
    }
    changed();
    return entry.id;
  }

  function replace(id, params) {
    if (stack.length) pop();
    return push(id, params);
  }

  function popTo(id) {
    while (stack.length && stack[stack.length - 1].id !== id) pop();
    return stack.length > 0;
  }

  function clear() {
    while (stack.length) pop();
  }

  function top() {
    return stack[stack.length - 1] ?? null;
  }

  function isBlocking() {
    return stack.some((e) => e.screen.blocking !== false);
  }

  // nav(action, source = 'keyboard'|'mouse'|'gamepad'|'api') -> bool consumed
  function nav(action, source = 'api') {
    const t = top();
    if (!t) return false;
    emitter.emit('nav', { action, source, screen: t.id });
    if (t.screen.onNav && t.screen.onNav(action, source)) return true;
    const items = focusables(t);
    const cur = items[t.focusIndex];
    // Adjustable controls (sliders, selects, toggles — src/app/widgets.js)
    // take left/right while focused; up/down always move between rows.
    if ((action === 'left' || action === 'right') && cur && typeof cur.__navAdjust === 'function') {
      cur.__navAdjust(action === 'left' ? -1 : 1);
      return true;
    }
    switch (action) {
      case 'up':
      case 'left':
        applyFocus(t, (t.focusIndex - 1 + items.length) % Math.max(1, items.length));
        return true;
      case 'down':
      case 'right':
        applyFocus(t, (t.focusIndex + 1) % Math.max(1, items.length));
        return true;
      case 'confirm': {
        const el = items[t.focusIndex];
        if (el) el.click();
        return true;
      }
      case 'back':
        if (t.screen.back && t.screen.back()) return true;
        pop();
        return true;
      default:
        return false;
    }
  }

  const api = {
    push,
    pop,
    replace,
    popTo,
    clear,
    top: () => {
      const t = top();
      return t ? t.id : null;
    },
    stack: () => stack.map((e) => e.id),
    isOpen: () => stack.length > 0,
    isBlocking,
    nav,
    focused: () => {
      const t = top();
      const el = t ? focusables(t)[t.focusIndex] : null;
      return el ? { screen: t.id, id: el.id || null, label: (el.textContent || '').trim().slice(0, 80) } : null;
    },
    on: (type, fn) => emitter.on(type, fn),
  };
  return api;
}
