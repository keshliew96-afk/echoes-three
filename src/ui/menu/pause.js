// In-game pause menu (docs/gauntlet/PLAN.md §1.2 / §1.3 'pause' / §7 GI.2).
// Owner: INT.
//
// Opened by Esc / P on EVERY page (combat, draft, path, shop, victory/defeat
// card — an open socket screen closes first and consumes its own Esc) and by
// the gamepad Start button (src/app/gamepad.js -> app.requestPause). The page
// underneath keeps its DOM, its focus and its settle state: the pause screen is
// a blocking app overlay (z 1100) that never touches the run UI.
//
// Items (Hades / Celeste / Slay the Spire grammar — one column, the safe item
// first, the destructive one last and confirmed):
//   Resume · Settings · Save Game · Load Game · Save & Quit to Title ·
//   Quit to Title           (single player)
//   Resume · Settings · Leave Session                       (network session)
// Unavailable items stay VISIBLE and disabled with the reason the owning
// service gives (save.canSave().reason / canLoad().reason), never hidden —
// a disabled row with a reason is navigation information; a missing row is a
// dead end (PLAN §3.3 "disabled items are skipped but stay visible").
//
// SINGLE PLAYER the sim is paused by app.simPaused() (a blocking screen is
// open) — 0 ticks elapse, so a pause is invisible to determinism. In a NETWORK
// session the shared sim never pauses: the menu says so honestly and the local
// inputs are zeroed by M1's input gate (PLAN §1.6).
import { service, registerScreen } from '../../app/registry.js';
import { createHints } from './hints.js';
import { px } from '../../app/style.js';
import { PALETTE as P } from '../../data/palette.js';

const CSS = `
.pz-pause .pz-wrap {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  padding: ${px(40)};
}
.pz-pause .pz-veil {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, ${P.voidCharcoal}9E 0%, ${P.voidCharcoal}E6 100%);
}
.pz-pause .pz-plate {
  position: relative; display: flex; flex-direction: column; gap: ${px(16)};
  width: min(${px(560)}, 92vw); max-height: 92vh; padding: ${px(30)} ${px(32)} ${px(22)};
}
.pz-pause .pz-head { display: flex; flex-direction: column; gap: ${px(6)}; align-items: center; text-align: center; }
.pz-pause .pz-where { font-size: ${px(24)}; color: ${P.bone}; letter-spacing: 0.04em; }
.pz-pause .pz-online {
  font-size: ${px(22)}; color: ${P.hearthAmber}; letter-spacing: 0.04em;
  border: 1px solid ${P.hearthAmber}66; border-radius: ${px(10)};
  padding: ${px(5)} ${px(12)}; background: ${P.voidCharcoal}AA;
}
.pz-pause .pz-items { display: flex; flex-direction: column; gap: ${px(10)}; overflow-y: auto; padding: ${px(4)}; }
.pz-pause .pz-item {
  display: flex; flex-direction: column; align-items: flex-start; justify-content: center;
  gap: ${px(2)}; width: 100%; min-height: ${px(58)}; padding: ${px(8)} ${px(20)};
  text-align: left;
}
.pz-pause .pz-lab { font-size: ${px(26)}; font-weight: 700; letter-spacing: 0.06em; }
.pz-pause .pz-cap { font-size: ${px(22)}; font-weight: 500; letter-spacing: 0.02em; color: ${P.warmGrey}; }
.pz-pause .pz-item.ap-focus .pz-cap { color: ${P.bone}; }
.pz-pause .pz-foot { display: flex; align-items: center; justify-content: center; gap: ${px(18)}; padding-top: ${px(4)}; }
`;

let styleInstalled = false;
function installStyle() {
  if (styleInstalled || typeof document === 'undefined') return;
  styleInstalled = true;
  const s = document.createElement('style');
  s.id = 'pz-pause-style';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const ROMAN = ['', 'I', 'II', 'III'];

// "Act II · Room 3/8 · Choosing a boon" — where the player is, so a pause that
// lasted a coffee break still lands them back in context.
const PAGE_WHERE = {
  draft: 'Choosing a boon',
  path: 'Choosing a door',
  shop: 'At the pedlar',
  end: 'Run over',
};
const PHASE_WHERE = {
  combat: 'In the fight',
  reward: 'Choosing a boon',
  path: 'Choosing a door',
  shop: 'At the pedlar',
  fade: 'Moving on',
};

// Injected by main.js's INT-WIRING block (the app shell knows nothing about
// the sim): getRun() -> runSystem().view() | null, getPage() -> the run UI's
// live page id | null. Both are optional — without them the menu still works
// and simply says less about where the player is.
let sources = { getRun: () => null, getPage: () => null };

export function createPauseScreen(ctx) {
  const { app, manager } = ctx;
  installStyle();

  const el = document.createElement('div');
  el.className = 'pz-pause';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Paused');
  el.innerHTML = `
    <div class="pz-veil"></div>
    <div class="pz-wrap">
      <div class="pz-plate ap-plate">
        <div class="pz-head">
          <div class="ap-orn">◆ ◆ ◆</div>
          <h2 class="ap-h2">Paused</h2>
          <div class="pz-where"></div>
          <div class="pz-online" hidden>Online — the game keeps running</div>
        </div>
        <div class="pz-items" role="menu"></div>
        <div class="pz-foot"></div>
      </div>
    </div>`;
  const whereEl = el.querySelector('.pz-where');
  const onlineEl = el.querySelector('.pz-online');
  const itemsEl = el.querySelector('.pz-items');
  const foot = el.querySelector('.pz-foot');
  const hints = createHints(app, [
    ['move', 'Select'],
    ['confirm', 'Choose'],
    ['back', 'Resume'],
  ]);
  foot.appendChild(hints.el);

  let open = false;
  let focusedId = null;
  let busy = false; // a quit/leave is running: the menu takes no further orders

  // ------------------------------------------------------------- state --
  function netSvc() {
    return service('net');
  }
  function inSession() {
    const n = netSvc();
    if (!n) return false;
    try {
      return typeof n.inSession === 'function' ? !!n.inSession() : false;
    } catch {
      return false;
    }
  }
  function netRole() {
    const n = netSvc();
    if (!n || !inSession()) return null;
    try {
      const s = n.session;
      if (s && s.role && s.role !== 'none') return s.role;
      return n.state === 'guest' ? 'guest' : n.state === 'host' ? 'host' : null;
    } catch {
      return null;
    }
  }

  function readRun() {
    try {
      return sources.getRun() || null;
    } catch {
      return null;
    }
  }

  function pageOf() {
    try {
      const p = sources.getPage();
      return p && p !== 'none' ? p : null;
    } catch {
      return null;
    }
  }

  function where() {
    const v = readRun();
    const page = pageOf();
    // The end card outlives the run (run.active flips false the moment the
    // summary is built), so it is read from the page, not from the run view.
    if (page === 'end') {
      const r = v && v.phase === 'defeat' ? 'defeat' : v && v.phase === 'victory' ? 'victory' : null;
      return r ? `Run over · ${r}` : 'Run over';
    }
    if (!v || !v.active) return 'The Camp';
    const bits = [];
    bits.push(v.actName || `Act ${ROMAN[v.act] || v.act || ''}`.trim());
    if (v.room) bits.push(`Room ${v.room}/${v.rooms}`);
    const w = (page && PAGE_WHERE[page]) || PHASE_WHERE[v.phase] || null;
    if (w) bits.push(w);
    return bits.filter(Boolean).join(' · ');
  }

  // --------------------------------------------------------------- DOM --
  function item({ id, label, caption = '', disabled = false, reason = '', primary = false, danger = false, onPress }) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `ap-btn pz-item${danger ? ' ap-danger' : ''}${primary ? ' ap-primary' : ''}`;
    b.id = `pz-${id}`;
    b.setAttribute('data-nav', '');
    b.setAttribute('role', 'menuitem');
    if (primary) b.setAttribute('data-nav-default', '');
    const l = document.createElement('span');
    l.className = 'pz-lab';
    l.textContent = label;
    b.appendChild(l);
    const cap = disabled ? reason || caption : caption;
    if (cap) {
      const c = document.createElement('span');
      c.className = 'pz-cap';
      c.textContent = cap;
      b.appendChild(c);
    }
    b.setAttribute('aria-label', cap ? `${label} — ${cap}` : label);
    if (disabled) {
      b.disabled = true;
      b.setAttribute('aria-disabled', 'true');
    }
    b.addEventListener('click', () => {
      if (b.disabled || busy) return;
      onPress();
    });
    return b;
  }

  function resume() {
    if (manager.top() === 'pause') manager.pop();
  }

  async function quit({ save }) {
    if (busy) return;
    const svc = service('save');
    const can = svc && typeof svc.canSave === 'function' ? svc.canSave() : { ok: false };
    const ok = await app.confirm({
      title: save ? 'Save and quit to the title?' : 'Quit to the title?',
      body: save
        ? 'Your run is written to the autosave slot first.'
        : svc && can.ok
          ? 'Anything since the last save is lost.'
          : 'This run is lost.',
      confirmLabel: save ? 'Save & Quit' : 'Quit',
      cancelLabel: 'Keep Playing',
      danger: !save,
      defaultFocus: 'cancel',
    });
    if (!ok) return;
    busy = true;
    try {
      await app.quitToTitle({ save });
    } finally {
      busy = false;
    }
  }

  async function leaveSession() {
    if (busy) return;
    const role = netRole();
    const ok = await app.confirm({
      title: 'Leave the session?',
      body: role === 'host' ? 'Your friends keep playing — another player takes over as host.' : 'You return to the title. Your single-player saves are untouched.',
      confirmLabel: 'Leave',
      cancelLabel: 'Stay',
      danger: true,
      defaultFocus: 'cancel',
    });
    if (!ok) return;
    busy = true;
    const n = netSvc();
    try {
      if (n && typeof n.leaveSession === 'function') await n.leaveSession();
      else if (n && typeof n.leave === 'function') await n.leave();
    } catch (err) {
      console.warn('[pause] leaving the session failed', err);
    }
    busy = false;
    if (manager.top() === 'pause') manager.pop();
    if (app.state === 'playing') await app.quitToTitle({ save: false });
  }

  function defs() {
    const list = [];
    list.push({ id: 'resume', label: 'Resume', primary: true, onPress: resume });
    list.push({ id: 'settings', label: 'Settings', caption: 'Display, audio, gameplay, controls', onPress: () => manager.push('settings') });

    const svc = service('save');
    const canSave = svc && typeof svc.canSave === 'function' ? svc.canSave() : { ok: false, reason: 'Saving is unavailable in this build' };
    const canLoad = svc && typeof svc.canLoad === 'function' ? svc.canLoad() : { ok: false, reason: 'Loading is unavailable in this build' };
    const hasAny = (() => {
      try {
        return !!(svc && typeof svc.hasAny === 'function' && svc.hasAny());
      } catch {
        return false;
      }
    })();
    list.push({
      id: 'save',
      label: 'Save Game',
      disabled: !(svc && canSave.ok),
      reason: svc ? canSave.reason || 'You cannot save right now' : 'Saving is unavailable in this build',
      onPress: () => manager.push('saves', { mode: 'save' }),
    });
    list.push({
      id: 'load',
      label: 'Load Game',
      disabled: !(svc && canLoad.ok && hasAny),
      reason: !svc ? 'Loading is unavailable in this build' : !canLoad.ok ? canLoad.reason : 'No saved games yet',
      onPress: () => manager.push('saves', { mode: 'load' }),
    });

    if (inSession()) {
      list.push({ id: 'leave', label: 'Leave Session', caption: 'Back to the title', danger: true, onPress: leaveSession });
      return list;
    }
    if (svc) {
      list.push({
        id: 'savequit',
        label: 'Save & Quit to Title',
        disabled: !canSave.ok,
        reason: canSave.reason || 'You cannot save right now',
        caption: 'Autosave, then the title',
        onPress: () => quit({ save: true }),
      });
    }
    list.push({ id: 'quit', label: 'Quit to Title', danger: true, caption: svc ? 'Without saving' : '', onPress: () => quit({ save: false }) });
    return list;
  }

  function render() {
    const keep = focusedId;
    itemsEl.textContent = '';
    for (const d of defs()) itemsEl.appendChild(item(d));
    whereEl.textContent = where();
    const session = inSession();
    onlineEl.hidden = !session;
    hints.render(true);
    if (keep && open && manager.top() === 'pause') {
      const n = itemsEl.querySelector(`[id="${keep}"]`);
      if (n && !n.disabled) manager.focusElement(n, 'api');
    }
  }

  let pending = 0;
  const schedule = () => {
    if (!open || pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      if (open) render();
    });
  };
  app.events.on('service', schedule);

  const screen = {
    el,
    blocking: true,
    layer: 'overlay',
    defaultFocus: '#pz-resume',
    onOpen() {
      open = true;
      busy = false;
      focusedId = null;
      screen.defaultFocus = '#pz-resume';
      render();
    },
    onFocus() {
      // A save may have been written (or the session may have ended) while a
      // sub-screen was up.
      render();
    },
    onClose() {
      open = false;
    },
    onFocusChange(node) {
      focusedId = node && node.id ? node.id : null;
      screen.defaultFocus = focusedId ? `#${focusedId}` : '#pz-resume';
    },
    back() {
      if (busy) return true;
      resume();
      return true;
    },
    debug: () => ({
      where: whereEl.textContent,
      online: !onlineEl.hidden,
      items: [...itemsEl.querySelectorAll('[data-nav]')].map((b) => ({
        id: b.id,
        label: b.querySelector('.pz-lab').textContent,
        caption: (b.querySelector('.pz-cap') || {}).textContent || '',
        disabled: !!b.disabled,
      })),
    }),
  };
  return screen;
}

let registered = false;
// registerPauseScreen({ getRun, getPage }) — called once from main.js's
// INT-WIRING block, after the world and the run UI exist.
export function registerPauseScreen({ getRun, getPage } = {}) {
  if (typeof getRun === 'function') sources.getRun = getRun;
  if (typeof getPage === 'function') sources.getPage = getPage;
  if (registered) return;
  registered = true;
  registerScreen('pause', createPauseScreen);
}
