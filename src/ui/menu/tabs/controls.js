// Settings ▸ Controls (docs/gauntlet/PLAN.md §3.2; Controls slice v0.5.229,
// docs/CONTROLS.md). Owner: M1.
//
// KEYBOARD & MOUSE view: every play action and camp key is a row whose key
// cap is a button. Enter / A / a click arms it ("Press a key…"); the next key
// or mouse button becomes the binding. A key already used by another action
// swaps with it (the other action takes the old key), so no key ever drives
// two actions and no action is left unbound. Esc, Enter, F5 / F9, F11 / F12
// and the OS keys keep their fixed jobs and are refused. Esc or any gamepad
// button cancels. "Reset to defaults" restores every key (settings
// `controls.key.*`, src/app/controls.js).
//
// GAMEPAD view: the fixed pad layout for play, camp and menus (pad buttons
// are not rebindable in this version).
//
// The view follows the device in use when the tab opens and can be switched
// with the "Show controls for" row. Key caps and pad buttons are not
// translated; the words are (docs/I18N.md rule 5).
import { t, tn } from '../../../i18n/index.js';
import { bindings, ACTIONS, MOUSE_BUTTON_CODE, PAD_LABEL } from '../../../core/bindings.js';
import { keyCap, rebind, resetControls, onHintsChange } from '../../../app/controls.js';

function actionLabel(id) {
  switch (id) {
    case 'moveUp':
      return t('Move up');
    case 'moveLeft':
      return t('Move left');
    case 'moveDown':
      return t('Move down');
    case 'moveRight':
      return t('Move right');
    case 'attack':
      return t('Basic attack (hold)');
    case 'dodge':
      return t('Dodge');
    case 'interact':
      return t('Interact · Revive (hold)');
    case 'rally':
      return t('Rally the party');
    case 'markEnemy':
      return t('Mark the next enemy');
    case 'backpack':
      return t('Build workbench (between rooms)');
    case 'pause':
      return t('Pause (Esc works too)');
    case 'levels':
      return t('Levels');
    case 'unlocks':
      return t('Unlocks');
    case 'classes':
      return t('Class select');
    case 'story':
      return t('Story so far');
    default: {
      const m = /^(skill|ally)(\d)$/.exec(id);
      if (m && m[1] === 'skill') return t('Skill {n}', { n: m[2] });
      if (m) return t('Heal target: ally {n}', { n: m[2] });
      return id;
    }
  }
}

// ------------------------------------------------------------- capture --
// The rebind capture listens in the window CAPTURE phase, registered at
// import (before src/app/nav.js installs the menu gate), so the key it takes
// never also navigates the menu. Idle, it lets every event through.
let capture = null; // { id, done(code | null, reason?) }
let swallowMouseUntil = 0;
function swallow(e) {
  e.preventDefault();
  e.stopImmediatePropagation();
}
if (typeof window !== 'undefined') {
  window.addEventListener(
    'keydown',
    (e) => {
      if (!capture) return;
      swallow(e);
      if (e.repeat) return;
      if (e.code === 'Escape') capture.done(null, 'cancel');
      else capture.done(e.code);
    },
    { capture: true }
  );
  window.addEventListener(
    'keyup',
    (e) => {
      if (capture) swallow(e);
    },
    { capture: true }
  );
  window.addEventListener(
    'mousedown',
    (e) => {
      if (!capture) return;
      swallow(e);
      swallowMouseUntil = performance.now() + 600;
      const code = MOUSE_BUTTON_CODE[e.button];
      // A left click elsewhere cancels (the player clicked away); on the
      // armed key itself it binds the left button.
      const onKey = e.target && e.target.closest && e.target.closest(`#ap-bind-${capture.id}`);
      if (code === 'MouseLeft' && !onKey) capture.done(null, 'cancel');
      else if (code) capture.done(code);
    },
    { capture: true }
  );
  for (const type of ['mouseup', 'click', 'auxclick', 'contextmenu', 'pointerup']) {
    window.addEventListener(
      type,
      (e) => {
        if (capture || performance.now() < swallowMouseUntil) swallow(e);
      },
      { capture: true }
    );
  }
}

function chip(text, pad = false) {
  const k = document.createElement('span');
  k.className = pad ? 'ap-kbd ap-pad' : 'ap-kbd';
  k.textContent = text;
  return k;
}

function refRow(action, keys, pad = false) {
  const r = document.createElement('div');
  r.className = 'ap-ref-row';
  const a = document.createElement('span');
  a.className = 'ap-ref-act';
  a.textContent = action;
  const k = document.createElement('span');
  k.className = 'ap-ref-keys';
  for (const key of keys) k.appendChild(chip(key, pad));
  r.append(a, k);
  return r;
}

function head(text) {
  const h = document.createElement('h3');
  h.className = 'ap-section';
  h.textContent = text;
  return h;
}

function col() {
  const c = document.createElement('div');
  c.className = 'ap-ref-col';
  return c;
}

export function buildControlsTab(ctx) {
  const { widgets } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-tabcontent ap-controls';
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.gap = 'calc(8px * var(--ap-s, 1))';

  let view = bindings.device === 'gamepad' ? 'gamepad' : 'keyboard';
  const viewRow = widgets.select({
    id: 'ap-controls-view',
    label: t('Show controls for'),
    options: [
      { value: 'keyboard', label: t('Keyboard & mouse'), note: t('Click a key to change it') },
      { value: 'gamepad', label: t('Gamepad'), note: t('The gamepad layout is fixed') },
    ],
    value: view,
    help: t('Keyboard & mouse lists every key and lets you change it. Gamepad shows the button layout, which is fixed in this version.'),
    onChange: (v) => {
      view = v;
      showView();
    },
  });

  const status = widgets.note('', 'ref');
  status.classList.add('ap-controls-status');
  const kbGrid = document.createElement('div');
  kbGrid.className = 'ap-ref ap-binds';
  const padGrid = document.createElement('div');
  padGrid.className = 'ap-ref ap-padref';
  el.append(viewRow.el, status, kbGrid, padGrid);

  // ---------------------------------------------------- keyboard view --
  const HELP = t('Press Enter or click, then press the new key or mouse button. A key another action uses swaps with this one. Esc cancels.');
  const rows = new Map(); // id -> { btn }
  function bindRow(id) {
    const r = document.createElement('div');
    r.className = 'ap-ref-row ap-bind-row';
    const a = document.createElement('span');
    a.className = 'ap-ref-act';
    a.textContent = actionLabel(id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ap-kbd ap-bind ap-focusable';
    btn.id = `ap-bind-${id}`;
    btn.dataset.action = id;
    btn.setAttribute('data-nav', '');
    btn.dataset.help = HELP;
    btn.dataset.helpTitle = actionLabel(id);
    btn.addEventListener('click', () => startCapture(id));
    const k = document.createElement('span');
    k.className = 'ap-ref-keys';
    k.appendChild(btn);
    r.append(a, k);
    rows.set(id, { btn, row: r });
    return r;
  }
  const left = col();
  const right = col();
  left.appendChild(head(t('Play — keyboard & mouse')));
  const playIds = ACTIONS.filter((a) => a.group === 'play').map((a) => a.id);
  const LEFT_COUNT = 11; // move ×4, attack, dodge, skills ×4, interact
  playIds.slice(0, LEFT_COUNT).forEach((id) => left.appendChild(bindRow(id)));
  right.appendChild(head(t('Party')));
  playIds.slice(LEFT_COUNT).forEach((id) => right.appendChild(bindRow(id)));
  right.appendChild(head(t('Camp & between rooms')));
  ACTIONS.filter((a) => a.group === 'camp').forEach((a) => right.appendChild(bindRow(a.id)));
  const fixed = document.createElement('p');
  fixed.className = 'ap-note ap-note-ref ap-controls-fixed';
  fixed.textContent = t('Always: Esc pauses, Alt + Enter is fullscreen, F5 / F9 quicksave and quickload, the mouse aims.');
  kbGrid.append(left, right);
  kbGrid.after(fixed);

  function idleStatus() {
    return t('Click a key, or pick it and press Enter, then press the new key or mouse button.');
  }
  let message = idleStatus();
  function paint() {
    for (const [id, { btn, row }] of rows) {
      const armed = capture && capture.id === id;
      btn.textContent = armed ? t('Press a key…') : keyCap(bindings.code(id));
      btn.classList.toggle('ap-capturing', !!armed);
      row.classList.toggle('ap-bind-changed', !bindings.isDefault(id));
      btn.setAttribute('aria-label', `${actionLabel(id)}: ${keyCap(bindings.code(id))}`);
    }
    status.textContent = message;
  }

  function startCapture(id) {
    if (capture) capture.done(null, 'cancel');
    const done = (code, reason) => {
      if (!capture || capture.id !== id) return;
      if (code === null) {
        capture = null;
        bindings.capture = null;
        message = reason === 'cancel' ? t('No change.') : idleStatus();
        paint();
        return;
      }
      const plan = rebind(id, code);
      if (!plan.ok) {
        message = t('{key} keeps its own job and can’t be bound. Press another key, or Esc to cancel.', { key: keyCap(code) });
        paint();
        return; // still waiting
      }
      capture = null;
      bindings.capture = null;
      if (plan.same) message = t('{action} already uses {key}.', { action: actionLabel(id), key: keyCap(code) });
      else if (plan.swap)
        message = t('{action} now uses {key}. {other} took {old}.', {
          action: actionLabel(id),
          key: keyCap(code),
          other: actionLabel(plan.swap.id),
          old: keyCap(plan.swap.code),
        });
      else message = t('{action} now uses {key}.', { action: actionLabel(id), key: keyCap(code) });
      paint();
      const r = rows.get(id);
      if (r && document.activeElement !== r.btn) r.btn.focus({ preventScroll: true });
    };
    capture = { id, done };
    bindings.capture = { id, cancel: () => done(null, 'cancel') };
    message = t('Press a key or mouse button for {action} (click the key again for the left button). Esc cancels.', { action: actionLabel(id) });
    paint();
  }
  function cancelCapture() {
    if (capture) capture.done(null, 'cancel');
  }

  // ----------------------------------------------------- gamepad view --
  {
    const pl = col();
    const pr = col();
    pl.appendChild(head(t('Play — gamepad')));
    pl.appendChild(refRow(t('Move'), [PAD_LABEL.move], true));
    pl.appendChild(refRow(t('Aim · rests on the nearest foe'), [PAD_LABEL.aim], true));
    pl.appendChild(refRow(t('Basic attack (hold)'), [PAD_LABEL.attack], true));
    pl.appendChild(refRow(t('Dodge'), [PAD_LABEL.dodge], true));
    pl.appendChild(refRow(tn(4, 'Skills ({n} slot)', 'Skills ({n} slots)'), [PAD_LABEL.skill1, PAD_LABEL.skill2, PAD_LABEL.skill3, PAD_LABEL.skill4], true));
    pl.appendChild(refRow(t('Interact · Revive (hold)'), [PAD_LABEL.interact], true));
    pl.appendChild(refRow(t('Rally the party'), [PAD_LABEL.rally], true));
    pl.appendChild(refRow(t('Mark the next enemy'), [PAD_LABEL.markEnemy], true));
    pl.appendChild(refRow(t('Heal target: previous · next ally'), [PAD_LABEL.allyCycle], true));
    pl.appendChild(refRow(t('Heal target: press again to clear'), [PAD_LABEL.allyAgain], true));
    pl.appendChild(refRow(t('Build workbench (between rooms)'), [PAD_LABEL.backpack], true));
    pr.appendChild(head(t('Camp — gamepad')));
    pr.appendChild(refRow(t('Interact · Begin a run at the portal'), [PAD_LABEL.interact], true));
    pr.appendChild(refRow(t('Levels'), [PAD_LABEL.levels], true));
    pr.appendChild(refRow(t('Unlocks'), [PAD_LABEL.unlocks], true));
    pr.appendChild(refRow(t('Class select'), [PAD_LABEL.classes], true));
    pr.appendChild(head(t('Menus — gamepad')));
    pr.appendChild(refRow(t('Move · Choose · Back'), ['D-pad', 'A', 'B'], true));
    pr.appendChild(refRow(t('Tabs · Pause'), ['LB', 'RB', 'Start'], true));
    padGrid.append(pl, pr);
  }

  function showView() {
    const kb = view === 'keyboard';
    if (!kb) cancelCapture();
    kbGrid.style.display = kb ? '' : 'none';
    fixed.style.display = kb ? '' : 'none';
    padGrid.style.display = kb ? 'none' : '';
    status.style.display = kb ? '' : 'none';
    for (const { btn } of rows.values()) {
      if (kb) btn.setAttribute('data-nav', '');
      else btn.removeAttribute('data-nav');
    }
  }

  const off = onHintsChange(() => paint());
  paint();
  showView();

  return {
    el,
    resettable: true,
    reset() {
      cancelCapture();
      resetControls();
      message = t('Every key is back to its default.');
      paint();
    },
    onShow() {
      const want = bindings.device === 'gamepad' ? 'gamepad' : 'keyboard';
      if (want !== view) {
        view = want;
        viewRow.set(view, { silent: true });
      }
      message = idleStatus();
      paint();
      showView();
    },
    onHide: cancelCapture,
    destroy() {
      cancelCapture();
      if (typeof off === 'function') off();
    },
    debug: () => ({ view, capturing: capture ? capture.id : null, message, keys: bindings.all() }),
  };
}
