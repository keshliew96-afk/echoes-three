// Control bindings (Controls slice, v0.5.229): which keyboard key or mouse
// button drives each player action, plus which device the player is using
// right now (keyboard & mouse vs gamepad) so hints can name the right button.
//
// Per-browser input settings only: nothing here reaches the sim or the wire.
// core/input.js turns the bound codes into the same intent snapshots as
// before, so the golden traces and the co-op protocol are untouched. The app
// layer (src/app/controls.js) persists the codes as settings `controls.key.*`
// and hands them in through setAll(); this module stays DOM-free and
// translation-free (labels live in src/app/controls.js).
//
// Codes are KeyboardEvent.code strings (physical keys: 'KeyW', 'Space',
// 'Digit1', 'F1') or one of the mouse codes below.

export const MOUSE_CODES = Object.freeze(['MouseLeft', 'MouseMiddle', 'MouseRight', 'Mouse4', 'Mouse5']);
// MouseEvent.button -> code
export const MOUSE_BUTTON_CODE = Object.freeze({ 0: 'MouseLeft', 1: 'MouseMiddle', 2: 'MouseRight', 3: 'Mouse4', 4: 'Mouse5' });

// Every rebindable action, in the order the Controls tab lists it. `group`
// picks the column: 'play' (sim intents) or 'camp' (screens and camp keys).
export const ACTIONS = Object.freeze([
  { id: 'moveUp', def: 'KeyW', group: 'play' },
  { id: 'moveLeft', def: 'KeyA', group: 'play' },
  { id: 'moveDown', def: 'KeyS', group: 'play' },
  { id: 'moveRight', def: 'KeyD', group: 'play' },
  { id: 'attack', def: 'MouseRight', group: 'play' },
  { id: 'dodge', def: 'Space', group: 'play' },
  { id: 'skill1', def: 'Digit1', group: 'play' },
  { id: 'skill2', def: 'Digit2', group: 'play' },
  { id: 'skill3', def: 'Digit3', group: 'play' },
  { id: 'skill4', def: 'Digit4', group: 'play' },
  { id: 'interact', def: 'KeyE', group: 'play' },
  { id: 'rally', def: 'KeyR', group: 'play' },
  { id: 'markEnemy', def: 'Tab', group: 'play' },
  { id: 'ally1', def: 'F1', group: 'play' },
  { id: 'ally2', def: 'F2', group: 'play' },
  { id: 'ally3', def: 'F3', group: 'play' },
  { id: 'ally4', def: 'F4', group: 'play' },
  { id: 'backpack', def: 'KeyB', group: 'camp' },
  { id: 'pause', def: 'KeyP', group: 'camp' },
  { id: 'levels', def: 'KeyL', group: 'camp' },
  { id: 'unlocks', def: 'KeyU', group: 'camp' },
  { id: 'classes', def: 'KeyC', group: 'camp' },
]);
export const ACTION_IDS = Object.freeze(ACTIONS.map((a) => a.id));
export const DEFAULT_BINDINGS = Object.freeze(Object.fromEntries(ACTIONS.map((a) => [a.id, a.def])));

// Keys that keep their fixed job and can never be bound: Esc (pause, back,
// cancels a rebind), Enter (menus), F5 / F9 (quicksave / quickload), the
// browser's own F11 / F12 and the OS keys.
export const RESERVED_CODES = Object.freeze(
  new Set(['Escape', 'Enter', 'NumpadEnter', 'F5', 'F9', 'F11', 'F12', 'MetaLeft', 'MetaRight', 'OSLeft', 'OSRight', 'ContextMenu', 'PrintScreen'])
);

export function validCode(code) {
  if (typeof code !== 'string' || code.length === 0 || code.length > 32) return false;
  if (RESERVED_CODES.has(code)) return false;
  return MOUSE_CODES.includes(code) || /^[A-Za-z][A-Za-z0-9]*$/.test(code);
}

// Gamepad layout (standard mapping, fixed in this version). Button index ->
// the action it drives in play. Holds: RT = basic attack, A = revive.
export const PAD = Object.freeze({ A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, START: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 });
export const PAD_PLAY = Object.freeze({
  [PAD.A]: 'interact',
  [PAD.X]: 'skill1',
  [PAD.Y]: 'skill2',
  [PAD.B]: 'skill3',
  [PAD.RB]: 'skill4',
  [PAD.LT]: 'dodge',
  [PAD.LB]: 'rally',
  [PAD.UP]: 'markEnemy',
  [PAD.LEFT]: 'allyPrev',
  [PAD.RIGHT]: 'allyNext',
  [PAD.DOWN]: 'allyAgain',
});
// The button each action reads as on a gamepad (hint text; English on purpose,
// docs/I18N.md "Left in English").
export const PAD_LABEL = Object.freeze({
  move: 'L-stick',
  aim: 'R-stick',
  attack: 'RT',
  dodge: 'LT',
  skill1: 'X',
  skill2: 'Y',
  skill3: 'B',
  skill4: 'RB',
  interact: 'A',
  rally: 'LB',
  markEnemy: 'D-pad ▲',
  allyCycle: 'D-pad ◀ ▶',
  allyAgain: 'D-pad ▼',
  backpack: 'View',
  pause: 'Start',
  // Camp (no fighting there, so the face buttons open the camp screens).
  levels: 'B',
  unlocks: 'Y',
  classes: 'X',
});

const codes = { ...DEFAULT_BINDINGS };
let byCode = new Map();
function reindex() {
  byCode = new Map();
  for (const id of ACTION_IDS) if (codes[id]) byCode.set(codes[id], id);
}
reindex();

const listeners = new Set(); // fn({ kind: 'bindings' | 'device', ... })
function emit(ev) {
  for (const fn of [...listeners]) {
    try {
      fn(ev);
    } catch (err) {
      console.warn('[bindings] listener threw', err);
    }
  }
}

let device = 'keyboard'; // 'keyboard' | 'gamepad'
const padListeners = new Set(); // fn(buttonIndex) — gameplay-time pad presses

export const bindings = {
  code: (id) => codes[id] || null,
  // The action bound to a code, or null.
  action: (code) => byCode.get(code) || null,
  is: (code, id) => !!code && codes[id] === code,
  all: () => ({ ...codes }),
  isDefault: (id) => codes[id] === DEFAULT_BINDINGS[id],
  // setAll({ id: code }) — adopt stored codes (unknown / invalid entries keep
  // their default). Emits once.
  setAll(map) {
    for (const id of ACTION_IDS) {
      const c = map && map[id];
      codes[id] = validCode(c) ? c : DEFAULT_BINDINGS[id];
    }
    reindex();
    emit({ kind: 'bindings' });
  },
  // plan(id, code) -> what binding `code` to `id` would do, without doing it:
  //   { ok: false, reason: 'reserved' } | { ok: true, same } |
  //   { ok: true, swap: { id: otherAction, code: oldCodeOfId } }
  plan(id, code) {
    if (!ACTION_IDS.includes(id)) return { ok: false, reason: 'unknown' };
    if (!validCode(code)) return { ok: false, reason: 'reserved' };
    if (codes[id] === code) return { ok: true, same: true };
    const other = byCode.get(code);
    return other ? { ok: true, swap: { id: other, code: codes[id] } } : { ok: true };
  },
  on(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  // ------------------------------------------------------ active device --
  get device() {
    return device;
  },
  setDevice(d) {
    if (d !== 'keyboard' && d !== 'gamepad') return;
    if (d === device) return;
    device = d;
    emit({ kind: 'device', device });
  },
  // ---------------------------------------------- gameplay pad presses --
  // core/input.js reports each fresh pad button press it sees while play
  // input is live (camp menus, the tutorial listen); index = PAD.*.
  onPad(fn) {
    padListeners.add(fn);
    return () => padListeners.delete(fn);
  },
  // -> true when a listener used the press (it then drives no intent).
  emitPad(index) {
    let used = false;
    for (const fn of [...padListeners]) {
      try {
        if (fn(index) === true) used = true;
      } catch (err) {
        console.warn('[bindings] pad listener threw', err);
      }
    }
    return used;
  },
  // A rebind in progress on the Controls tab (the menu gamepad poller cancels
  // it instead of navigating).
  capture: null, // { id, cancel() } | null
};
