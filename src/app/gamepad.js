// Gamepad menu navigation (docs/gauntlet/PLAN.md §3.3). Owner: M1.
//
// Polled once per rendered frame from app.update(). `navigator.getGamepads()`
// is called afresh every poll (never cached, never gated on a
// `gamepadconnected` event) so a pad mocked by a probe's eval drives the menus
// exactly like a real one (docs/TESTING.md "Gamepad probes").
//
// Standard mapping: D-pad (12-15) / left stick (axes 0-1, deadzone 0.5) =
// directions, first repeat after 400 ms then every 90 ms; A(0) confirm; B(1)
// back; X(2) secondary; Y(3) tertiary; LB(4) / RB(5) tabs; Start(9) = pause
// (no screen open) / back on the pause menu / confirm on the loading and title
// screens. Right stick Y (axis 3, deadzone 0.3) = onScroll(dy): continuous
// scrolling of the open menu's content, up to 1100 CSS px/s at full tilt
// (fix-M1-r5, MENU-R5-F2 — read-only content below the fold). Play on a
// gamepad (sticks, triggers, face buttons) is read by core/input.js once per
// sim tick (Controls slice, docs/CONTROLS.md); this poller keeps the menus,
// Start = pause, and cancels a rebind waiting on Settings ▸ Controls.
// Gamepad buttons are NOT user activation in browsers: fullscreen and audio
// unlock cannot be triggered from here, and the Display tab says so.
const DEADZONE = 0.5;
const REPEAT_DELAY_MS = 400;
const REPEAT_EVERY_MS = 90;
// PARTY (PLAN §16.4): LT (6) / RT (7) = rowPrev / rowNext — the socket screen's
// skill rows once LB / RB switch characters; menus ignore them.
const BUTTON_ACTIONS = Object.freeze({ 0: 'confirm', 1: 'back', 2: 'secondary', 3: 'tertiary', 4: 'tabPrev', 5: 'tabNext', 6: 'rowPrev', 7: 'rowNext' });
const DPAD = Object.freeze({ 12: 'up', 13: 'down', 14: 'left', 15: 'right' });
const START = 9;
const SCROLL_AXIS = 3;
const SCROLL_DEADZONE = 0.3;
const SCROLL_PX_PER_S = 1100;

function pressed(b) {
  if (!b) return false;
  if (typeof b === 'object') return !!b.pressed || (typeof b.value === 'number' && b.value > 0.5);
  return b > 0.5;
}

export function createGamepadPoller({ onAction, onStart, onScroll }) {
  const pads = new Map(); // index -> { buttons: bool[], dir, dirSince, dirLast }
  let connected = 0;
  let lastIds = [];

  function direction(pad) {
    const b = pad.buttons || [];
    for (const [i, a] of Object.entries(DPAD)) if (pressed(b[i])) return a;
    const ax = (pad.axes && pad.axes[0]) || 0;
    const ay = (pad.axes && pad.axes[1]) || 0;
    if (Math.abs(ax) < DEADZONE && Math.abs(ay) < DEADZONE) return null;
    if (Math.abs(ax) > Math.abs(ay)) return ax > 0 ? 'right' : 'left';
    return ay > 0 ? 'down' : 'up';
  }

  function poll(now = performance.now()) {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    if (!nav || typeof nav.getGamepads !== 'function') return;
    let list;
    try {
      list = nav.getGamepads();
    } catch {
      return;
    }
    if (!list) return;
    let n = 0;
    const ids = [];
    for (let i = 0; i < list.length; i++) {
      const pad = list[i];
      if (!pad || pad.connected === false) {
        pads.delete(i);
        continue;
      }
      n += 1;
      ids.push(pad.id || `pad${i}`);
      let st = pads.get(i);
      const buttons = pad.buttons || [];
      if (!st) {
        // First sight: adopt the current state so a button already held when
        // the pad appears does not fire.
        st = { buttons: buttons.map(pressed), dir: direction(pad), dirSince: now, dirLast: now, scrollArmed: Math.abs((pad.axes && pad.axes[SCROLL_AXIS]) || 0) <= SCROLL_DEADZONE };
        pads.set(i, st);
        continue;
      }
      const ts = typeof pad.timestamp === 'number' && pad.timestamp > 0 && pad.timestamp <= now && now - pad.timestamp < 200 ? pad.timestamp : now;
      for (let bi = 0; bi < buttons.length; bi++) {
        const down = pressed(buttons[bi]);
        const was = !!st.buttons[bi];
        st.buttons[bi] = down;
        if (!down || was) continue;
        if (bi === START) {
          if (onStart) onStart({ inputTs: ts });
          continue;
        }
        const a = BUTTON_ACTIONS[bi];
        if (a && onAction) onAction(a, { inputTs: ts, repeat: false });
      }
      // Right stick: scroll by tilt x elapsed time (the first polled frame of
      // a tilt already moves one frame's worth). Standard mapping only (axis 3
      // can be a trigger resting at -1 elsewhere), and an axis already tilted
      // when the pad appeared counts only after it has returned to centre.
      const ry = pad.mapping === 'standard' && pad.axes ? pad.axes[SCROLL_AXIS] || 0 : 0;
      if (!st.scrollArmed) st.scrollArmed = Math.abs(ry) <= SCROLL_DEADZONE;
      if (st.scrollArmed && Math.abs(ry) > SCROLL_DEADZONE) {
        const dt = st.scrollAt == null ? 16 : Math.min(100, Math.max(0, now - st.scrollAt));
        st.scrollAt = now;
        const mag = (Math.abs(ry) - SCROLL_DEADZONE) / (1 - SCROLL_DEADZONE);
        const dy = Math.sign(ry) * mag * SCROLL_PX_PER_S * (dt / 1000);
        if (onScroll && dy) onScroll(dy, { inputTs: ts });
      } else st.scrollAt = null;
      const dir = direction(pad);
      if (dir !== st.dir) {
        st.dir = dir;
        st.dirSince = now;
        st.dirLast = now;
        if (dir && onAction) onAction(dir, { inputTs: ts, repeat: false });
      } else if (dir && now - st.dirSince >= REPEAT_DELAY_MS && now - st.dirLast >= REPEAT_EVERY_MS) {
        st.dirLast = now;
        if (onAction) onAction(dir, { inputTs: now, repeat: true });
      }
    }
    connected = n;
    lastIds = ids;
  }

  return {
    poll,
    get connected() {
      return connected;
    },
    debug: () => ({ connected, ids: lastIds.slice() }),
  };
}
