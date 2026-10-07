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
import { bindings, MOUSE_BUTTON_CODE, PAD, PAD_PLAY } from './bindings.js';

// §3 control map -> discrete intent presses, by ACTION (core/bindings.js maps
// the player's keys to actions; Controls slice v0.5.229). Skill actions
// derive from SKILL_SLOTS (4: the player equips at most 4 skills — the content
// extension's 8 are NODE SOCKETS per skill, M4c).
// @gnt:M4a INPUT-KEYS begin — skill actions derive from SKILL_SLOTS; the
// `interact` action is already bound below (M4b needs no edit in this file).
const SKILL_PRESSES = {};
for (let i = 0; i < SKILL_SLOTS; i++) SKILL_PRESSES[`skill${i + 1}`] = { kind: `skill_${i + 1}`, slot: i };
// @gnt:M4a INPUT-KEYS end
const ACTION_TO_PRESS = Object.freeze({
  dodge: { kind: 'dodge' },
  ...SKILL_PRESSES,
  // The interact key is ALSO the held revive channel (sample() reads it as
  // reviveHeld); the discrete press feeds interactables (PLAN §4.6).
  interact: { kind: 'interact' },
  rally: { kind: 'rally' },
  markEnemy: { kind: 'target_cycle' },
  ally1: { kind: 'target_select', index: 0 },
  ally2: { kind: 'target_select', index: 1 },
  ally3: { kind: 'target_select', index: 2 },
  ally4: { kind: 'target_select', index: 3 },
});

// Movement actions on the XZ ground plane. Camera looks from +z toward
// origin, so screen-up is -z and screen-right is +x.
const MOVE_ACTIONS = Object.freeze({
  moveUp: [0, -1],
  moveDown: [0, 1],
  moveLeft: [-1, 0],
  moveRight: [1, 0],
});

// Keys whose browser default behavior would fight the game. A rebound
// non-letter key (an arrow, a quote, Backspace) is also kept from the page.
const PREVENT_DEFAULT = new Set(['Space', 'Tab', 'F1', 'F2', 'F3', 'F4']);
const isTyping = (e) => {
  const tg = e && e.target;
  const tag = tg && tg.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!(tg && tg.isContentEditable);
};

// GAMEPAD PLAY (Controls slice). Standard mapping, polled once per sim tick
// inside sample(): left stick moves (radial deadzone, full speed past it —
// the sim's move is pre-normalised), right stick aims, RT holds the basic
// attack, A holds the revive and presses interact, the rest per
// core/bindings.js PAD_PLAY. Start (pause) and View (backpack) belong to the
// menu poller (src/app/gamepad.js) and the socket screen.
const MOVE_DEADZONE = 0.28;
const AIM_DEADZONE = 0.3;
const TRIGGER_ON = 0.35;
const STICK_HOT = 0.6;
const padPressed = (b) => {
  if (!b) return false;
  if (typeof b === 'object') return !!b.pressed || (typeof b.value === 'number' && b.value > 0.5);
  return b > 0.5;
};
const padValue = (b) => (!b ? 0 : typeof b === 'object' ? (typeof b.value === 'number' ? b.value : b.pressed ? 1 : 0) : Number(b) || 0);

function firstPad() {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  if (!nav || typeof nav.getGamepads !== 'function') return null;
  let list;
  try {
    list = nav.getGamepads();
  } catch {
    return null;
  }
  if (!list) return null;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p && p.connected !== false) return p;
  }
  return null;
}

// screenToWorld(clientX, clientY) -> { x, z } | null is injected by the boot
// layer (it needs the camera); padAim(dir | null, info) -> { x, z } | null
// turns a right-stick direction (or none) into a world aim point (it needs
// the local body and the enemies). The controller itself stays render-agnostic.
export function createInputController({ target = window, screenToWorld = null, padAim = null } = {}) {
  const held = new Set(); // KeyboardEvent.code / mouse codes currently down
  let pressQueue = [];
  let mouseScreen = null; // last cursor position in client px

  // Gamepad state (see GAMEPAD PLAY above).
  let padPrev = null; // bool[] of the last sampled buttons, null = re-arm
  let padAttack = false;
  let padRevive = false;
  let padMoving = false;
  let padAllyIndex = -1;
  let padSuppressed = false;
  let stickHot = false;

  function onKeyDown(e) {
    const action = bindings.action(e.code);
    if ((PREVENT_DEFAULT.has(e.code) || (action && action !== 'pause' && !/^(Key|Digit)/.test(e.code))) && !isTyping(e)) e.preventDefault();
    if (e.repeat || held.has(e.code)) return; // auto-repeat is never a press
    held.add(e.code);
    bindings.setDevice('keyboard');
    const press = action ? ACTION_TO_PRESS[action] : null;
    if (press) pressQueue.push({ ...press });
  }

  function onKeyUp(e) {
    held.delete(e.code);
  }

  function onBlur() {
    // Focus loss drops held state (queued presses already happened — keep them).
    held.clear();
  }

  function onMouseMove(e) {
    mouseScreen = { x: e.clientX, y: e.clientY };
  }

  function onMouseDown(e) {
    const code = MOUSE_BUTTON_CODE[e.button];
    if (!code) return;
    bindings.setDevice('keyboard');
    if (held.has(code)) return;
    held.add(code);
    const action = bindings.action(code);
    const press = action ? ACTION_TO_PRESS[action] : null;
    if (press) pressQueue.push({ ...press });
  }

  function onMouseUp(e) {
    const code = MOUSE_BUTTON_CODE[e.button];
    if (code) held.delete(code);
  }

  function onContextMenu(e) {
    e.preventDefault(); // right-click is the basic attack, never a menu
  }

  const listeners = [
    ['keydown', onKeyDown],
    ['keyup', onKeyUp],
    ['blur', onBlur],
    ['mousemove', onMouseMove],
    ['mousedown', onMouseDown],
    ['mouseup', onMouseUp],
    ['contextmenu', onContextMenu],
  ];
  for (const [type, fn] of listeners) target.addEventListener(type, fn);

  const heldAction = (id) => {
    const c = bindings.code(id);
    return !!c && held.has(c);
  };

  // One pad read per tick: fresh button presses become intent presses (and
  // pad events for the camp / tutorial), sticks and triggers become holds.
  // `live` false (a menu, a build page) still records the buttons so a button
  // held through a menu never fires when the menu closes.
  function readPad(live) {
    const pad = firstPad();
    if (!pad) {
      padPrev = null;
      padAttack = padRevive = padMoving = false;
      return null;
    }
    const buttons = pad.buttons || [];
    const now = buttons.map(padPressed);
    const prev = padPrev;
    padPrev = now;
    const axes = pad.axes || [];
    const lx = axes[0] || 0;
    const lz = axes[1] || 0;
    const standard = pad.mapping === 'standard' || pad.mapping === undefined;
    const rx = standard ? axes[2] || 0 : 0;
    const rz = standard ? axes[3] || 0 : 0;
    const moveMag = Math.hypot(lx, lz);
    const aimMag = Math.hypot(rx, rz);
    const out = {
      move: moveMag > MOVE_DEADZONE ? { x: lx / moveMag, z: lz / moveMag } : null,
      aim: aimMag > AIM_DEADZONE ? { x: rx / aimMag, z: rz / aimMag } : null,
    };
    padAttack = live && padValue(buttons[PAD.RT]) > TRIGGER_ON;
    padRevive = live && now[PAD.A] === true;
    padMoving = !!out.move;
    // The device turns to gamepad on a fresh button press or a stick pushed
    // past STICK_HOT from rest — never on resting drift, so a drifting stick
    // cannot flip the hints back while the player types.
    const anyFresh = prev ? now.some((d, i) => d && !prev[i]) : false;
    const hot = Math.max(moveMag, aimMag) > STICK_HOT;
    const pushed = hot && !stickHot;
    stickHot = hot;
    if (anyFresh || pushed) bindings.setDevice('gamepad');
    if (!prev || !live) return out; // first sight / re-arm / not live: no presses
    for (let i = 0; i < now.length; i++) {
      if (!now[i] || prev[i]) continue;
      if (bindings.emitPad(i)) continue; // a camp screen took it
      const act = PAD_PLAY[i];
      if (!act) continue;
      if (act === 'allyPrev' || act === 'allyNext' || act === 'allyAgain') {
        if (act === 'allyNext') padAllyIndex = (padAllyIndex + 1) % 4;
        else if (act === 'allyPrev') padAllyIndex = padAllyIndex <= 0 ? 3 : padAllyIndex - 1;
        else if (padAllyIndex < 0) continue;
        pressQueue.push({ kind: 'target_select', index: padAllyIndex });
        continue;
      }
      const press = ACTION_TO_PRESS[act];
      if (press) pressQueue.push({ ...press });
    }
    return out;
  }

  // Called once per sim tick. Continuous states are re-read from live held
  // state; discrete presses are drained (each press lands on exactly one tick).
  function sample() {
    const snap = emptySnapshot();
    const pad = readPad(!padSuppressed);

    let x = 0;
    let z = 0;
    for (const [id, [dx, dz]] of Object.entries(MOVE_ACTIONS)) {
      if (heldAction(id)) {
        x += dx;
        z += dz;
      }
    }
    if (x === 0 && z === 0 && pad && pad.move && !padSuppressed) {
      x = pad.move.x;
      z = pad.move.z;
    }
    const len = Math.hypot(x, z);
    if (len > 0) snap.move = { x: x / len, z: z / len }; // §3 pre-normalized

    if (bindings.device === 'gamepad' && padAim) {
      const a = padAim(pad ? pad.aim : null, { move: snap.move, attacking: padAttack });
      if (a) snap.aim = a;
      else if (mouseScreen && screenToWorld) snap.aim = screenToWorld(mouseScreen.x, mouseScreen.y);
    } else if (mouseScreen && screenToWorld) {
      snap.aim = screenToWorld(mouseScreen.x, mouseScreen.y);
    }
    snap.basicAttackHeld = heldAction('attack') || padAttack;
    snap.reviveHeld = heldAction('interact') || padRevive;
    snap.presses = pressQueue;
    pressQueue = [];
    lastSnap = { move: snap.move, aim: snap.aim, attack: snap.basicAttackHeld, revive: snap.reviveHeld };
    for (const p of snap.presses) {
      pressLog.push(p.index !== undefined ? `${p.kind}:${p.index}` : p.kind);
      if (pressLog.length > 24) pressLog.shift();
    }
    return snap;
  }
  let lastSnap = null;
  const pressLog = []; // probe record of sampled press kinds

  function detach() {
    for (const [type, fn] of listeners) target.removeEventListener(type, fn);
  }

  // @gnt:M1 INPUT-GATE begin — releaseAll() (clear held keys and buttons,
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
    pressQueue = [];
    padPrev = null; // re-arm: buttons held now never fire on the way back
    padAttack = padRevive = false;
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
  // The socket screen and the run's between-room pages swallow play intents
  // (main.js sampleIntents); while they are up the pad is read but gives no
  // presses, and leaving them re-arms it (the A that closed a page is not an
  // interact). main.js calls this every frame, sim paused or not.
  function setPadSuppressed(on) {
    on = !!on;
    if (on === padSuppressed) return;
    padSuppressed = on;
    padPrev = null;
    padAttack = padRevive = false;
  }
  function controlMap() {
    return {
      presses: Object.entries(ACTION_TO_PRESS).map(([action, press]) => ({ action, code: bindings.code(action), ...press })),
      move: Object.keys(MOVE_ACTIONS).map((id) => bindings.code(id)),
      basicAttack: bindings.code('attack'),
      reviveHeld: bindings.code('interact'),
    };
  }
  // @gnt:M1 INPUT-GATE end

  return {
    sample: gatedSample,
    detach,
    releaseAll,
    setEnabled,
    bindings: controlMap,
    setPadSuppressed,
    // Live holds for presentation (the tutorial's attack lesson).
    attackHeld: () => enabled && (heldAction('attack') || padAttack),
    debug: () => ({ device: bindings.device, held: [...held], padArmed: !!padPrev, padSuppressed, padAllyIndex, padMoving, last: lastSnap, presses: pressLog.slice() }),
    get enabled() {
      return enabled;
    },
  };
}
