// Input abstraction (§1): the ONLY module that reads input DOM events. Raw
// keyboard/mouse is converted into per-tick intent snapshots (core/intents.js);
// game logic never sees a DOM event. AI controllers implement the same
// interface ({ sample() }) so the sim treats humans and AI identically.
//
// Key-repeat discipline: a held key produces exactly ONE discrete press —
// `e.repeat` keydowns and keydowns for already-held codes are dropped, so OS
// auto-repeat can never manufacture duplicate intents. Presses accumulate in a
// queue between ticks; sample() drains it (so a press always lands on exactly
// one tick, the first tick sampled after the keydown).
import { emptySnapshot } from './intents.js';
import { SKILL_SLOTS } from './constants.js';

// §3 control map -> discrete intent presses. Skill keys Digit1..DigitN are
// derived from SKILL_SLOTS (4 at v0.4.63, 8 after the content extension).
// @gnt:M4a INPUT-KEYS begin — skill keys derive from SKILL_SLOTS; KeyE
// `interact` is already bound below (M4b needs no edit in this file).
const SKILL_KEYS = {};
for (let i = 0; i < SKILL_SLOTS; i++) SKILL_KEYS[`Digit${i + 1}`] = { kind: `skill_${i + 1}`, slot: i };
// @gnt:M4a INPUT-KEYS end
const KEY_TO_PRESS = Object.freeze({
  Space: { kind: 'dodge' },
  ...SKILL_KEYS,
  // KeyE is ALSO the held revive channel (sample() reads it as reviveHeld);
  // the discrete press feeds interactables (PLAN §4.6).
  KeyE: { kind: 'interact' },
  KeyR: { kind: 'rally' },
  Tab: { kind: 'target_cycle' },
  F1: { kind: 'target_select', index: 0 },
  F2: { kind: 'target_select', index: 1 },
  F3: { kind: 'target_select', index: 2 },
  F4: { kind: 'target_select', index: 3 },
});

// WASD on the XZ ground plane. Camera looks from +z toward origin, so
// screen-up is -z and screen-right is +x.
const MOVE_KEYS = Object.freeze({
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
});

// Keys whose browser default behavior would fight the game.
const PREVENT_DEFAULT = new Set(['Space', 'Tab', 'F1', 'F2', 'F3', 'F4']);

// screenToWorld(clientX, clientY) -> { x, z } | null is injected by the boot
// layer (it needs the camera); the controller itself stays render-agnostic.
export function createInputController({ target = window, screenToWorld = null } = {}) {
  const held = new Set(); // KeyboardEvent.code strings currently down
  let pressQueue = [];
  let mouseScreen = null; // last cursor position in client px
  let basicHeld = false; // right mouse button (§3 basic attack, hold-to-repeat)

  function onKeyDown(e) {
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    if (e.repeat || held.has(e.code)) return; // auto-repeat is never a press
    held.add(e.code);
    const press = KEY_TO_PRESS[e.code];
    if (press) pressQueue.push({ ...press });
  }

  function onKeyUp(e) {
    held.delete(e.code);
  }

  function onBlur() {
    // Focus loss drops held state (queued presses already happened — keep them).
    held.clear();
    basicHeld = false;
  }

  function onMouseMove(e) {
    mouseScreen = { x: e.clientX, y: e.clientY };
  }

  function onMouseDown(e) {
    if (e.button === 2) basicHeld = true;
  }

  function onMouseUp(e) {
    if (e.button === 2) basicHeld = false;
  }

  function onContextMenu(e) {
    e.preventDefault(); // right-click is the basic attack, never a menu
  }

  const bindings = [
    ['keydown', onKeyDown],
    ['keyup', onKeyUp],
    ['blur', onBlur],
    ['mousemove', onMouseMove],
    ['mousedown', onMouseDown],
    ['mouseup', onMouseUp],
    ['contextmenu', onContextMenu],
  ];
  for (const [type, fn] of bindings) target.addEventListener(type, fn);

  // Called once per sim tick. Continuous states are re-read from live held
  // state; discrete presses are drained (each press lands on exactly one tick).
  function sample() {
    const snap = emptySnapshot();

    let x = 0;
    let z = 0;
    for (const [code, [dx, dz]] of Object.entries(MOVE_KEYS)) {
      if (held.has(code)) {
        x += dx;
        z += dz;
      }
    }
    const len = Math.hypot(x, z);
    if (len > 0) snap.move = { x: x / len, z: z / len }; // §3 pre-normalized

    if (mouseScreen && screenToWorld) {
      snap.aim = screenToWorld(mouseScreen.x, mouseScreen.y);
    }
    snap.basicAttackHeld = basicHeld;
    snap.reviveHeld = held.has('KeyE');
    snap.presses = pressQueue;
    pressQueue = [];
    return snap;
  }

  function detach() {
    for (const [type, fn] of bindings) target.removeEventListener(type, fn);
  }

  // @gnt:M1 INPUT-GATE begin — releaseAll() (clear held keys, basicHeld,
  // pending presses) and setEnabled(on) for the app input gate (PLAN §1.5).
  // The app calls releaseAll() on every transition to a blocking screen (a key
  // held when the menu opened must not stay "down" behind it — its keyup may
  // be one the menu consumed) and setEnabled(false) while one is open, so a
  // tick sampled under a menu (network sessions never pause the sim) carries
  // neutral intents; aim rides through (it mutates nothing). controlMap()
  // lists the live control map for the Controls reference tab.
  let enabled = true;
  function releaseAll() {
    held.clear();
    basicHeld = false;
    pressQueue = [];
  }
  function setEnabled(on) {
    enabled = !!on;
    if (!enabled) releaseAll();
  }
  function gatedSample() {
    if (enabled) return sample();
    releaseAll();
    const snap = emptySnapshot();
    if (mouseScreen && screenToWorld) snap.aim = screenToWorld(mouseScreen.x, mouseScreen.y);
    return snap;
  }
  function controlMap() {
    return {
      presses: Object.entries(KEY_TO_PRESS).map(([code, press]) => ({ code, ...press })),
      move: Object.keys(MOVE_KEYS),
      basicAttack: 'MouseRight',
      reviveHeld: 'KeyE',
    };
  }
  // @gnt:M1 INPUT-GATE end

  return {
    sample: gatedSample,
    detach,
    releaseAll,
    setEnabled,
    bindings: controlMap,
    get enabled() {
      return enabled;
    },
  };
}
