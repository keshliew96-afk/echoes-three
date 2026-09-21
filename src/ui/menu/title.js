// Title screen (docs/gauntlet/PLAN.md §1.3 'title'). Owner: M1.
//
// A DOM overlay over the LIVE camp render (sim paused; fire, fireflies and
// critters keep animating; src/app/titlecam.js frames the hearth to the right
// of this column). Items, top to bottom:
//   Continue*     — only with a save service that has a save (M2)
//   New Game      — a fresh camp (app.newGame)
//   Load Game     — the saves screen (M2); disabled with its reason until
//                   service('save') + screen 'saves' exist and a save exists
//   Multiplayer*  — only when screenFactory('mp-menu') is registered (M5b, W4)
//   Settings
//   Records*      — only with the save service + screen 'records' (M2)
//   Exit          — confirm -> window.close() -> farewell card
// The list re-renders when a service or screen factory appears, keeping the
// focused item. Esc / B on the title root is a no-op (PLAN §1.2 / G1.2).
import { service, screenFactory } from '../../app/registry.js';
import { createHints } from './hints.js';
import { VERSION } from '../../version.js';

const OPEN_GUARD_MS = 350; // a touch/click that dismissed the splash never lands on an item

function ago(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

function slotCaption(meta) {
  if (!meta) return '';
  const m = meta.meta || meta;
  const parts = [];
  const name = (meta.slot && meta.slot.name) || meta.name;
  if (name) parts.push(name);
  if (m.mode === 'run' && m.room) parts.push(`${m.actName || (m.act ? `Act ${m.act}` : 'Run')} · Room ${m.room}`);
  else if (m.mode === 'camp') parts.push('Camp');
  const when = ago(meta.savedAt || (meta.meta && meta.meta.savedAt));
  if (when) parts.push(when);
  return parts.join(' · ');
}

export function createTitleScreen(ctx) {
  const { app, manager } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-title';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Echoes — title');
  el.innerHTML = `
    <div class="ap-title-scrim"></div>
    <div class="ap-title-col">
      <div class="ap-logo">
        <div class="ap-logo-word">ECHOES</div>
        <div class="ap-logo-rule">◆</div>
        <div class="ap-logo-sub">A healer, three friends, and a world going wrong</div>
      </div>
      <div class="ap-menu" role="menu"></div>
    </div>
    <div class="ap-title-foot"></div>`;
  const menu = el.querySelector('.ap-menu');
  const foot = el.querySelector('.ap-title-foot');
  const hints = createHints(app, [
    ['move', 'Select'],
    ['confirm', 'Choose'],
  ]);
  const ver = document.createElement('span');
  ver.textContent = `v${VERSION}`;
  foot.append(hints.el, ver);

  let openedAt = 0;
  let open = false;
  let focusedId = null;

  function guard() {
    return performance.now() - openedAt < OPEN_GUARD_MS && app.nav && app.nav.lastSource === 'mouse';
  }

  function item({ id, label, caption = '', onPress, disabled = false, reason = '', primary = false }) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ap-mbtn';
    b.id = `ap-title-${id}`;
    b.setAttribute('data-nav', '');
    b.setAttribute('role', 'menuitem');
    if (primary) b.setAttribute('data-nav-default', '');
    const l = document.createElement('span');
    l.className = 'ap-mlab';
    l.textContent = label;
    b.appendChild(l);
    const capText = disabled ? reason : caption;
    if (capText) {
      const c = document.createElement('span');
      c.className = 'ap-mcap';
      c.textContent = capText;
      b.appendChild(c);
    }
    b.setAttribute('aria-label', capText ? `${label} — ${capText}` : label);
    if (disabled) {
      b.disabled = true;
      b.setAttribute('aria-disabled', 'true');
    }
    b.addEventListener('click', () => {
      if (b.disabled || guard()) return;
      onPress();
    });
    return b;
  }

  function items() {
    const save = service('save');
    const list = [];
    let latest = null;
    let hasAny = false;
    try {
      hasAny = !!(save && typeof save.hasAny === 'function' && save.hasAny());
      latest = save && typeof save.latest === 'function' ? save.latest() : null;
    } catch {
      hasAny = false;
    }
    if (save && hasAny && latest) {
      list.push({ id: 'continue', label: 'Continue', caption: slotCaption(latest), primary: true, onPress: () => app.continueGame() });
    }
    list.push({ id: 'new', label: 'New Game', primary: list.length === 0, onPress: () => app.newGame() });
    const savesScreen = !!screenFactory('saves');
    list.push({
      id: 'load',
      label: 'Load Game',
      disabled: !(save && savesScreen && hasAny),
      reason: 'No saved games yet',
      onPress: () => manager.push('saves', { mode: 'load' }),
    });
    if (screenFactory('mp-menu')) list.push({ id: 'multiplayer', label: 'Multiplayer', onPress: () => manager.push('mp-menu') });
    list.push({ id: 'settings', label: 'Settings', onPress: () => manager.push('settings') });
    if (save && screenFactory('records')) list.push({ id: 'records', label: 'Records', onPress: () => manager.push('records') });
    list.push({ id: 'exit', label: 'Exit', onPress: () => app.exit() });
    return list;
  }

  function render() {
    const keep = focusedId;
    menu.textContent = '';
    for (const def of items()) menu.appendChild(item(def));
    hints.render(true);
    if (keep && open && manager.top() === 'title') {
      const n = menu.querySelector(`#${keep}`);
      if (n && !n.disabled) manager.focusElement(n, 'api');
    }
  }

  let pendingRender = 0;
  const schedule = () => {
    if (!open || pendingRender) return;
    pendingRender = requestAnimationFrame(() => {
      pendingRender = 0;
      if (open) render();
    });
  };
  app.events.on('service', schedule);
  app.events.on('screens', schedule);

  const screen = {
    el,
    blocking: true,
    layer: 'screen',
    root: true,
    defaultFocus: null,
    onOpen() {
      open = true;
      openedAt = performance.now();
      render();
    },
    onFocus() {
      render(); // a save may have appeared while a sub-screen was open
    },
    onClose() {
      open = false;
    },
    onFocusChange(node) {
      focusedId = node && node.id ? node.id : null;
      screen.defaultFocus = focusedId ? `#${focusedId}` : null;
    },
    back: () => true, // the title root: Esc / B do nothing
  };
  return screen;
}
