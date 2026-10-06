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
import { transitShort, roman, slotDisplayName } from '../../save/describe.js';
import { t } from '../../i18n/index.js';

const OPEN_GUARD_MS = 350; // a touch/click that dismissed the splash never lands on an item

function ago(iso) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return t('just now');
  if (s < 3600) return t('{n} min ago', { n: Math.round(s / 60) });
  if (s < 86400) return t('{n} h ago', { n: Math.round(s / 3600) });
  return t('{n} d ago', { n: Math.round(s / 86400) });
}

// "Level I · The Hollow Wood · Room 1 · just now · Autosave": where and when
// first, the slot name last — the caption is clamped to two lines (a 32-char
// slot name is what an ellipsis trims; the aria-label keeps the full line).
function slotCaption(meta) {
  if (!meta) return '';
  const m = meta.meta || meta;
  const parts = [];
  const name = (meta.slot && meta.slot.name) || meta.name;
  // CAMPAIGN (PLAN §12.8): "Level II · The Sunken Mill · Room 3"; a save on
  // a level card reads "Level I cleared" (clear card) or "Setting out ·
  // Level II · The Sunken Mill" (a Level-N start) — src/save/describe.js (M2, r3 F2).
  const lv = m.level ?? m.act;
  if (m.mode === 'run' && m.phase === 'transit') parts.push(transitShort(m) || t('Level {level}', { level: roman(lv) }));
  else if (m.mode === 'run' && m.room) {
    const nm = m.levelName || m.actName ? t(m.levelName || m.actName) : t('Run');
    parts.push(lv ? t('Level {level} · {name} · Room {room}', { level: roman(lv), name: nm, room: m.room }) : t('{name} · Room {room}', { name: nm, room: m.room }));
  } else if (m.mode === 'camp') parts.push(t('Camp'));
  const when = ago(meta.savedAt || (meta.meta && meta.meta.savedAt));
  if (when) parts.push(when);
  if (name) parts.push(slotDisplayName(name));
  return parts.join(' · ');
}

export function createTitleScreen(ctx) {
  const { app, manager } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-title';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', t('Echoes — title'));
  el.innerHTML = `
    <div class="ap-title-scrim"></div>
    <div class="ap-title-col">
      <div class="ap-logo">
        <div class="ap-logo-word">ECHOES</div>
        <div class="ap-logo-rule">◆</div>
        <div class="ap-logo-sub">${t('A healer, three friends, and a world going wrong')}</div>
      </div>
      <div class="ap-menu" role="menu"></div>
    </div>
    <div class="ap-title-foot"></div>`;
  const menu = el.querySelector('.ap-menu');
  const foot = el.querySelector('.ap-title-foot');
  const hints = createHints(app, [
    ['move', t('Select')],
    ['confirm', t('Choose')],
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

  // New Game over a run in progress (gauntlet r3 J3-F3; Slay the Spire /
  // Dead Cells ask before a new run touches a saved one). The autosave slots
  // rotate per game (src/save/index.js pickAutoSlot), so the confirm says
  // truthfully what happens to each run in progress: kept in Load Game, or —
  // only when both autosave slots already hold other runs — the older one is
  // replaced by the new game's autosaves (then Cancel is the default).
  // app.newGame() itself stays confirm-free (harness / API path).
  let asking = false;
  async function newGameFlow(save) {
    if (asking) return false;
    let impact = null;
    try {
      impact = save && typeof save.newGameImpact === 'function' ? save.newGameImpact() : null;
    } catch {
      impact = null;
    }
    // TUTORIAL (docs/TUTORIAL.md): the first New Game offers the guided room.
    const tut = service('tutorial');
    const startGame = () => (tut && typeof tut.offerOnNewGame === 'function' ? tut.offerOnNewGame(() => app.newGame()) : app.newGame());
    if (!impact || !impact.runs || !impact.runs.length) return startGame();
    const where = (m) => slotCaption(m);
    let body;
    const lost = impact.replaced;
    if (lost) {
      const kept = impact.kept && impact.kept[0];
      body =
        t("The new game's autosaves will replace your older run in progress:\n{run}", { run: where(lost) }) +
        (kept ? `\n\n${t('Your latest run stays in Load Game:\n{run}', { run: where(kept) })}` : '') +
        `\n\n${t('To keep both, load the older run from Load Game and save it to a numbered slot first.')}`;
    } else {
      const n = impact.runs.length;
      const runs = impact.runs.map(where).join('\n');
      body =
        (n > 1 ? t('Your runs in progress stay in Load Game:\n{runs}', { runs }) : t('Your run in progress stays in Load Game:\n{runs}', { runs })) +
        `\n\n${t('The new game autosaves to its own slot.')}`;
    }
    asking = true;
    let ok = false;
    try {
      ok = await app.confirm({
        title: lost ? t('Replace a saved run?') : t('Start a new game?'),
        body,
        confirmLabel: t('Start New Game'),
        cancelLabel: lost ? t('Keep My Run') : t('Cancel'),
        danger: !!lost,
        defaultFocus: lost ? 'cancel' : 'confirm',
      });
    } finally {
      asking = false;
    }
    if (!ok) return false;
    return startGame();
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
      // (CAMPAIGN: a refused Continue — a save in a locked level, a damaged
      // file — says why instead of doing nothing.)
      list.push({
        id: 'continue',
        label: t('Continue'),
        caption: slotCaption(latest),
        primary: true,
        onPress: () =>
          Promise.resolve(app.continueGame()).then((r) => {
            if (r && r.ok === false && typeof app.toast === 'function') {
              const errs = save && save.errors ? save.errors : {};
              app.toast(r.reason || errs[r.error] || t("Couldn't continue that save"), { tone: 'warn' });
            }
            return r;
          }),
      });
    }
    list.push({ id: 'new', label: t('New Game'), primary: list.length === 0, onPress: () => newGameFlow(save) });
    const savesScreen = !!screenFactory('saves');
    list.push({
      id: 'load',
      label: t('Load Game'),
      disabled: !(save && savesScreen && hasAny),
      reason: t('No saved games yet'),
      onPress: () => manager.push('saves', { mode: 'load' }),
    });
    if (screenFactory('mp-menu')) list.push({ id: 'multiplayer', label: t('Multiplayer'), onPress: () => manager.push('mp-menu') });
    list.push({ id: 'settings', label: t('Settings'), onPress: () => manager.push('settings') });
    if (save && screenFactory('records')) list.push({ id: 'records', label: t('Records'), onPress: () => manager.push('records') });
    list.push({ id: 'exit', label: t('Exit'), onPress: () => app.exit() });
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
  // @gnt:M2 TABS — another tab of the game saved / deleted (SAVE4-F1): Continue follows.
  app.events.on('saves_changed', schedule);

  const screen = {
    el,
    blocking: true,
    layer: 'screen',
    root: true,
    defaultFocus: null,
    onOpen() {
      // A fresh open (boot, Quit / Save & Quit to Title, farewell -> Return)
      // lands on the primary item — Continue whenever a save exists, else New
      // Game (PLAN §3.3 "opening a screen focuses its primary"). The focus
      // memory of an earlier visit (this screen object is cached) only applies
      // when the title is uncovered again (pop -> onFocus), never across a
      // session: otherwise New Game, focused on a first visit with no save,
      // stays the default after Save & Quit and Enter starts a fresh game
      // (SAVE-R1-F2).
      focusedId = null;
      screen.defaultFocus = null;
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
