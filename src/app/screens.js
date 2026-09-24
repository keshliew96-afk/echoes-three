// Screen / menu manager (docs/gauntlet/PLAN.md §3.3). Owner: M1.
//
// SCREEN CONTRACT — registerScreen(id, factory) (src/app/registry.js):
//   factory(ctx) -> {
//     el: HTMLElement,              // mounted under #app-ui while on the stack
//     blocking?: true,              // true: gates game input; single-player sim pauses
//     layer?: 'screen'|'overlay'|'dialog'|'loading'|'farewell'   // z-band (PLAN §2.3)
//     reusable?: true,              // false: rebuilt on every push, removed on pop (dialogs)
//     root?: false,                 // true: Esc/B on it is a no-op (the title root)
//     onOpen?(params), onClose?(),  // pushed / popped
//     onFocus?(), onBlur?(),        // became top again / covered by another screen
//     onNav?(action, source, meta) -> bool,   // screen-specific handling first; true = consumed
//     back?(source) -> bool,        // Esc / B / Backspace / right-click; true = handled
//                                   //   (default when absent or false: pop this screen)
//     onFocusChange?(el, source),   // the focused item changed (info panels)
//     defaultFocus?: string,        // CSS selector of the primary item
//   }
//   ctx: { manager, app, settings, widgets, services: { service }, params }
//
// NAV ACTIONS (one vocabulary for keyboard, mouse and gamepad):
//   'up' 'down' 'left' 'right' 'confirm' 'back' 'tabPrev' 'tabNext' 'secondary' 'tertiary'
// FOCUS MODEL: focusable items carry [data-nav]; [data-nav-default] marks the
// primary; [disabled] / [aria-disabled="true"] items are skipped by movement
// but stay visible with their reason text. Movement is SPATIAL (nearest item
// in the pressed direction by DOM rect), so lists, rows of buttons, tab bars
// and grids all navigate without per-screen code; up/down wrap at the ends,
// left/right adjust the focused control when it exposes __navAdjust. Exactly
// one element carries the ring class `ap-focus` — the focused item of the top
// screen — and every screen remembers its last focus for when it is uncovered.
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

const FADE_OUT_MS = 160;
const LAYERS = new Set(['screen', 'overlay', 'dialog', 'loading', 'farewell']);

function isShown(el) {
  if (!el || !el.isConnected) return false;
  if (el.getClientRects().length === 0) return false;
  return getComputedStyle(el).visibility !== 'hidden';
}

function isEnabled(el) {
  return !!el && !el.disabled && el.getAttribute('aria-disabled') !== 'true';
}

function rectOf(el) {
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.left * 10) / 10, y: Math.round(r.top * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
}

export function createScreenManager({ root, ctx = {} } = {}) {
  const emitter = new EventEmitterLite();
  const stack = []; // [{ id, screen, params, focusEl }]
  const cache = new Map(); // id -> screen instance (reusable screens)
  const hideTimers = new Map(); // el -> timeout id
  let ringEl = null;

  function build(id) {
    if (cache.has(id)) return cache.get(id);
    const factory = screenFactory(id);
    if (!factory) return null;
    const screen = factory({ ...ctx, manager: api });
    if (!screen || !screen.el) return null;
    const layer = LAYERS.has(screen.layer) ? screen.layer : 'screen';
    screen.el.classList.add('ap-screen', `ap-layer-${layer}`);
    if (screen.blocking === false) screen.el.classList.add('ap-nonblocking');
    screen.el.dataset.screen = id;
    if (screen.reusable !== false) cache.set(id, screen);
    return screen;
  }

  function topEntry() {
    return stack[stack.length - 1] ?? null;
  }

  function focusables(entry, { includeDisabled = false } = {}) {
    if (!entry) return [];
    return [...entry.screen.el.querySelectorAll('[data-nav]')].filter(
      (n) => isShown(n) && (includeDisabled || isEnabled(n))
    );
  }

  function validFocus(entry) {
    const el = entry && entry.focusEl;
    return !!el && entry.screen.el.contains(el) && isShown(el) && isEnabled(el);
  }

  function setRing(el) {
    if (ringEl && ringEl !== el) ringEl.classList.remove('ap-focus');
    ringEl = el || null;
    if (ringEl) ringEl.classList.add('ap-focus');
  }

  function focusEl(entry, el, { source = 'api', scroll = true } = {}) {
    if (!entry || !el) return false;
    const changedEl = entry.focusEl !== el;
    entry.focusEl = el;
    if (entry !== topEntry()) return true;
    setRing(el);
    try {
      if (document.activeElement !== el) el.focus({ preventScroll: true });
    } catch {
      /* detached */
    }
    if (scroll && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (changedEl) {
      if (entry.screen.onFocusChange) entry.screen.onFocusChange(el, source);
      emitter.emit('focus', { screen: entry.id, id: el.id || null, source });
    }
    return true;
  }

  function initialFocus(entry, source = 'api') {
    if (!entry) return false;
    if (validFocus(entry)) return focusEl(entry, entry.focusEl, { source, scroll: false });
    const items = focusables(entry);
    if (items.length === 0) {
      if (entry === topEntry()) setRing(null);
      entry.focusEl = null;
      return false;
    }
    const sel = entry.screen.defaultFocus;
    let def = null;
    try {
      def = (sel && entry.screen.el.querySelector(sel)) || entry.screen.el.querySelector('[data-nav-default]');
    } catch {
      def = null;
    }
    const pick = def && items.includes(def) ? def : items[0];
    return focusEl(entry, pick, { source, scroll: false });
  }

  function mount(el) {
    const t = hideTimers.get(el);
    if (t) {
      clearTimeout(t);
      hideTimers.delete(el);
    }
    if (root) root.appendChild(el); // (re-)append: DOM order follows the stack
    el.classList.remove('ap-out');
    el.classList.add('ap-open');
    void el.offsetWidth; // commit display before the fade starts
    el.classList.add('ap-in');
  }

  // STACKING INVARIANT: the top of the stack is drawn above — and takes the
  // pointer over — every screen beneath it, whatever z-band each declared
  // (a 'screen'-band menu opened from the 'overlay'-band pause menu must not
  // render under it; fix-M2-r1 SAVE-R1-F1). A pushed screen whose band is
  // lower than the highest band under it is lifted to that z-index; within
  // one z-index the later DOM node wins, and mount() re-appends in stack order.
  function zOf(el) {
    const z = parseInt(getComputedStyle(el).zIndex, 10);
    return Number.isFinite(z) ? z : 0;
  }
  function liftAbove(entry) {
    const el = entry.screen.el;
    el.style.zIndex = '';
    let floor = -Infinity;
    for (const e of stack) if (e !== entry) floor = Math.max(floor, zOf(e.screen.el));
    if (Number.isFinite(floor) && zOf(el) < floor) el.style.zIndex = String(floor);
  }

  function unmount(screen) {
    const el = screen.el;
    el.classList.remove('ap-in');
    el.classList.add('ap-out');
    const t = setTimeout(() => {
      hideTimers.delete(el);
      if (stack.some((e) => e.screen === screen)) return; // re-opened meanwhile
      el.classList.remove('ap-open', 'ap-out');
      if (screen.reusable === false) {
        if (screen.destroy) screen.destroy();
        el.remove();
      }
    }, FADE_OUT_MS);
    hideTimers.set(el, t);
  }

  function changed() {
    const t = topEntry();
    emitter.emit('change', { top: t ? t.id : null, stack: stack.map((e) => e.id), blocking: isBlocking() });
  }

  function push(id, params = {}) {
    const screen = build(id);
    if (!screen) return false;
    const existing = stack.findIndex((e) => e.screen === screen);
    if (existing >= 0) {
      if (existing === stack.length - 1) {
        stack[existing].params = params;
        if (screen.onOpen) screen.onOpen(params);
        initialFocus(stack[existing], 'open');
        return true;
      }
      console.warn(`[screens] '${id}' is already open under another screen`);
      return false;
    }
    const prev = topEntry();
    if (prev && prev.screen.onBlur) prev.screen.onBlur();
    const entry = { id, screen, params, focusEl: null };
    stack.push(entry);
    mount(screen.el);
    liftAbove(entry);
    if (screen.onOpen) screen.onOpen(params);
    initialFocus(entry, 'open');
    if (!entry.focusEl) setRing(null);
    changed();
    return true;
  }

  function pop() {
    const entry = stack.pop();
    if (!entry) return null;
    if (ringEl && entry.screen.el.contains(ringEl)) setRing(null);
    if (entry.screen.onClose) entry.screen.onClose();
    unmount(entry.screen);
    const t = topEntry();
    if (t) {
      if (t.screen.onFocus) t.screen.onFocus();
      initialFocus(t, 'restore'); // focus memory per screen
    }
    changed();
    return entry.id;
  }

  function replace(id, params) {
    if (stack.length) pop();
    return push(id, params);
  }

  function popTo(id) {
    while (stack.length && topEntry().id !== id) pop();
    return stack.length > 0;
  }

  function clear() {
    while (stack.length) pop();
  }

  function isBlocking() {
    return stack.some((e) => e.screen.blocking !== false);
  }

  // Spatial move: the nearest enabled item whose centre lies in `dir`, scored
  // by distance along the axis plus twice the cross-axis offset. up/down wrap
  // to the far end when nothing lies that way; left/right never wrap.
  function move(entry, dir, source) {
    const items = focusables(entry);
    if (items.length === 0) return false;
    const cur = validFocus(entry) ? entry.focusEl : null;
    if (!cur) return initialFocus(entry, source);
    const cr = cur.getBoundingClientRect();
    const cx = cr.left + cr.width / 2;
    const cy = cr.top + cr.height / 2;
    const vertical = dir === 'up' || dir === 'down';
    const sign = dir === 'down' || dir === 'right' ? 1 : -1;
    let best = null;
    let bestScore = Infinity;
    for (const el of items) {
      if (el === cur) continue;
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      let along;
      let across;
      if (vertical) {
        along = (y - cy) * sign;
        // Must start beyond the current item's edge in that direction (rows of
        // side-by-side buttons share a centre line and are not "below").
        const edgeOk = sign > 0 ? r.top >= cr.top + cr.height * 0.5 : r.bottom <= cr.bottom - cr.height * 0.5;
        if (along <= 1 || !edgeOk) continue;
        across = Math.max(0, Math.abs(x - cx) - (r.width + cr.width) / 4);
      } else {
        along = (x - cx) * sign;
        const edgeOk = sign > 0 ? r.left >= cr.left + cr.width * 0.5 : r.right <= cr.right - cr.width * 0.5;
        if (along <= 1 || !edgeOk) continue;
        // Horizontal moves stay on the same row band.
        if (Math.abs(y - cy) > Math.max(r.height, cr.height) * 0.75) continue;
        across = Math.abs(y - cy);
      }
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    if (!best && vertical) {
      // Wrap: the item at the opposite extreme, closest in x.
      let extreme = sign > 0 ? Infinity : -Infinity;
      for (const el of items) {
        const r = el.getBoundingClientRect();
        const y = r.top + r.height / 2;
        if (sign > 0 ? y < extreme - 1 : y > extreme + 1) extreme = y;
      }
      let bx = Infinity;
      for (const el of items) {
        if (el === cur) continue;
        const r = el.getBoundingClientRect();
        const y = r.top + r.height / 2;
        if (Math.abs(y - extreme) > r.height * 0.5 + 1) continue;
        const d = Math.abs(r.left + r.width / 2 - cx);
        if (d < bx) {
          bx = d;
          best = el;
        }
      }
    }
    if (!best) return false;
    return focusEl(entry, best, { source, scroll: true });
  }

  // nav(action, source = 'keyboard'|'mouse'|'gamepad'|'api', meta = { repeat }) -> bool consumed
  function nav(action, source = 'api', meta = {}) {
    const t = topEntry();
    if (!t) return false;
    emitter.emit('nav', { action, source, screen: t.id, repeat: !!meta.repeat });
    if (t.screen.onNav && t.screen.onNav(action, source, meta)) return true;
    if (!validFocus(t) && (action === 'up' || action === 'down' || action === 'left' || action === 'right')) {
      return initialFocus(t, source) || true;
    }
    const cur = validFocus(t) ? t.focusEl : null;
    switch (action) {
      case 'left':
      case 'right':
        if (cur && typeof cur.__navAdjust === 'function') {
          cur.__navAdjust(action === 'left' ? -1 : 1, meta);
          return true;
        }
        move(t, action, source);
        return true;
      case 'up':
      case 'down':
        move(t, action, source);
        return true;
      case 'confirm':
        if (!cur) {
          initialFocus(t, source);
          return true;
        }
        if (meta.repeat) return true;
        cur.click();
        return true;
      case 'back':
        if (meta.repeat) return true;
        if (t.screen.back && t.screen.back(source)) return true;
        if (t.screen.root) return true;
        pop();
        return true;
      default:
        return false;
    }
  }

  // Mouse hover / click focus: focus `el` if it is an enabled item of the top
  // screen (no scroll-jump for pointer focus).
  function focusElement(el, source = 'mouse') {
    const t = topEntry();
    if (!t || !el || !t.screen.el.contains(el)) return false;
    if (!el.matches('[data-nav]') || !isEnabled(el) || !isShown(el)) return false;
    return focusEl(t, el, { source, scroll: false });
  }

  // Per-frame audit (app.update): the top screen always shows exactly one ring
  // on a live item — content that re-rendered, disabled or hid the focused
  // item gets the nearest valid focus back instead of a ring-less screen.
  // Cheap every frame (no layout reads: the HUD dirties the DOM each frame, so
  // a rect / computed-style query here would force a full synchronous layout
  // per frame); the visibility check that needs layout runs every 15th frame.
  let auditN = 0;
  function audit() {
    const t = topEntry();
    if (!t) {
      if (ringEl) setRing(null);
      return;
    }
    auditN = (auditN + 1) % 15;
    const el = t.focusEl;
    if (!el) {
      // Nothing focusable yet (a splash): look again every 15th frame only.
      if (auditN === 0) initialFocus(t, 'audit');
      return;
    }
    const cheapOk = !!el && el.isConnected && t.screen.el.contains(el) && isEnabled(el);
    if (!cheapOk || (auditN === 0 && !isShown(el))) {
      initialFocus(t, 'audit');
      return;
    }
    if (ringEl !== el) setRing(el);
  }

  // Build (and let the screen pre-build its content) ahead of the first open,
  // in idle time — the first open then costs no DOM construction.
  function prebuild(id) {
    const screen = build(id);
    if (!screen) return false;
    if (typeof screen.prebuild === 'function') {
      try {
        screen.prebuild();
      } catch (err) {
        console.warn(`[screens] prebuild '${id}' failed`, err);
      }
    }
    return true;
  }

  const api = {
    push,
    prebuild,
    pop,
    replace,
    popTo,
    clear,
    top: () => {
      const t = topEntry();
      return t ? t.id : null;
    },
    topScreen: () => {
      const t = topEntry();
      return t ? t.screen : null;
    },
    params: (id) => {
      const e = stack.find((x) => x.id === id);
      return e ? e.params : null;
    },
    stack: () => stack.map((e) => e.id),
    isOpen: () => stack.length > 0,
    has: (id) => stack.some((e) => e.id === id),
    isBlocking,
    nav,
    focusElement,
    refocus: () => initialFocus(topEntry(), 'api'),
    audit,
    focusables: () => focusables(topEntry()).map((el) => ({ id: el.id || null, label: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 80), rect: rectOf(el) })),
    focused: () => {
      const t = topEntry();
      const el = t && validFocus(t) ? t.focusEl : null;
      if (!el) return null;
      const label = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      return { screen: t.id, id: el.id || null, label, rect: rectOf(el), ring: el.classList.contains('ap-focus') };
    },
    ringCount: () => document.querySelectorAll('.ap-focus').length,
    on: (type, fn) => emitter.on(type, fn),
  };
  return api;
}
