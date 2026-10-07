// Controls service (Controls slice, v0.5.229): saves the player's key
// bindings with the other settings and names keys and gamepad buttons for
// every hint on screen. Owner of the `controls.key.<action>` settings keys.
//
//   installControls(settings)  registers the keys, loads them into
//                              core/bindings.js and keeps the two in step
//                              (Settings ▸ Controls "Reset to defaults" is
//                              settings.reset('controls'))
//   rebind(id, code)           binds a key / mouse button to an action; a
//                              code already in use swaps with it -> plan
//   keyCap(code)               'W', 'Space', '↑', 'Right mouse' …
//   cap(id)                    the action's key on keyboard & mouse, its
//                              button while a gamepad is in use
//   onHintsChange(fn)          a binding, the active device or the keyboard
//                              layout changed: repaint hints
//
// Key caps and gamepad buttons stay English on purpose (docs/I18N.md rule 5);
// only the mouse button words are translated.
import { bindings, ACTION_IDS, DEFAULT_BINDINGS, PAD_LABEL, validCode } from '../core/bindings.js';
import { t } from '../i18n/index.js';

export const CONTROLS_PREFIX = 'controls';
const keyPath = (id) => `${CONTROLS_PREFIX}.key.${id}`;

let store = null;
let syncing = false;

export function installControls(settings) {
  if (store || !settings) return;
  store = settings;
  const validate = (v) => (validCode(v) ? v : undefined);
  for (const id of ACTION_IDS) settings.register(keyPath(id), { default: DEFAULT_BINDINGS[id], validate });
  const load = () => {
    const map = {};
    for (const id of ACTION_IDS) map[id] = settings.get(keyPath(id));
    bindings.setAll(map);
  };
  load();
  settings.subscribe(CONTROLS_PREFIX, () => {
    if (!syncing) load();
  });
  loadLayout();
}

// rebind(id, code) -> bindings.plan() result; applied when ok.
export function rebind(id, code) {
  const plan = bindings.plan(id, code);
  if (!plan.ok || plan.same) return plan;
  if (store) {
    syncing = true;
    try {
      if (plan.swap) store.set(keyPath(plan.swap.id), plan.swap.code, { source: 'controls' });
      store.set(keyPath(id), code, { source: 'controls' });
    } finally {
      syncing = false;
    }
    const map = {};
    for (const a of ACTION_IDS) map[a] = store.get(keyPath(a));
    bindings.setAll(map);
  } else {
    const map = bindings.all();
    if (plan.swap) map[plan.swap.id] = plan.swap.code;
    map[id] = code;
    bindings.setAll(map);
  }
  return plan;
}

export function resetControls() {
  if (store) store.reset(CONTROLS_PREFIX);
  else bindings.setAll(DEFAULT_BINDINGS);
}

// ------------------------------------------------------------ key names --
const NAMED = {
  Space: 'Space',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Del',
  Insert: 'Ins',
  Home: 'Home',
  End: 'End',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  CapsLock: 'Caps',
  ShiftLeft: 'Shift',
  ShiftRight: 'R-Shift',
  ControlLeft: 'Ctrl',
  ControlRight: 'R-Ctrl',
  AltLeft: 'Alt',
  AltRight: 'AltGr',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  IntlBackslash: '\\',
  NumpadAdd: 'Num +',
  NumpadSubtract: 'Num -',
  NumpadMultiply: 'Num *',
  NumpadDivide: 'Num /',
  NumpadDecimal: 'Num .',
  Mouse4: 'Mouse 4',
  Mouse5: 'Mouse 5',
};

// The browser's keyboard layout (Chromium): an AZERTY player reads "Z" on the
// key KeyW names. Loaded once, best-effort.
let layout = null;
function loadLayout() {
  try {
    const kb = typeof navigator !== 'undefined' ? navigator.keyboard : null;
    if (!kb || typeof kb.getLayoutMap !== 'function') return;
    kb.getLayoutMap()
      .then((m) => {
        layout = m;
        fireHints();
      })
      .catch(() => {});
  } catch {
    /* no layout API */
  }
}

export function keyCap(code) {
  if (!code) return '—';
  if (code === 'MouseLeft') return t('Left mouse');
  if (code === 'MouseRight') return t('Right mouse');
  if (code === 'MouseMiddle') return t('Middle mouse');
  if (NAMED[code]) return NAMED[code];
  if (/^Key/.test(code) && layout && typeof layout.get === 'function') {
    const ch = layout.get(code);
    if (ch && ch.trim()) return ch.toUpperCase();
  }
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return `Num ${code.slice(6)}`;
  return code;
}

export const usingPad = () => bindings.device === 'gamepad';
export const padCap = (id) => PAD_LABEL[id] || '';

// cap(id): what the player presses for an action on the device in use.
export function cap(id, { pad = usingPad() } = {}) {
  if (pad) {
    if (/^ally\d$/.test(id)) return PAD_LABEL.allyCycle;
    return PAD_LABEL[id] || keyCap(bindings.code(id));
  }
  return keyCap(bindings.code(id));
}

// The four movement keys in W A S D order.
export function moveCaps({ pad = usingPad() } = {}) {
  if (pad) return [PAD_LABEL.move];
  return ['moveUp', 'moveLeft', 'moveDown', 'moveRight'].map((id) => keyCap(bindings.code(id)));
}

// The four skill keys as one compact cap: "1–4" for a consecutive digit run,
// else "1 / 2 / 3 / 4"; on a pad "X / Y / B / RB".
export function skillsCap({ pad = usingPad() } = {}) {
  const ids = ['skill1', 'skill2', 'skill3', 'skill4'];
  if (pad) return ids.map((id) => PAD_LABEL[id]).join(' / ');
  const codes = ids.map((id) => bindings.code(id));
  const digits = codes.map((c) => (/^Digit\d$/.test(c || '') ? Number(c.slice(5)) : NaN));
  if (digits.every((d, i) => i === 0 || d === digits[i - 1] + 1) && !digits.some(Number.isNaN)) return `${digits[0]}–${digits[3]}`;
  return codes.map(keyCap).join(' / ');
}

const hintFns = new Set();
function fireHints() {
  for (const fn of [...hintFns]) {
    try {
      fn();
    } catch (err) {
      console.warn('[controls] hint listener threw', err);
    }
  }
}
bindings.on(() => fireHints());
export function onHintsChange(fn) {
  hintFns.add(fn);
  return () => hintFns.delete(fn);
}
