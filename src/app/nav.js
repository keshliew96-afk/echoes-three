// App input gate + menu navigation sources (docs/gauntlet/PLAN.md §1.5, §3.3).
// Owner: M1.
//
// ORDER (binding): the committed gesture hook (src/app/app.js) is the FIRST
// window capture-phase listener and has already handed the event to
// service('audio').unlock when this gate runs, so the gate may stop the event
// freely. Both are installed by createApp() before core/input.js and
// ui/run/index.js add theirs.
//
// While a BLOCKING screen is open:
//   keydown   -> nav action, preventDefault (except F5/F11/F12, Ctrl/Meta combos
//                and typing into a focused text input) + stopImmediatePropagation:
//                no game listener ever sees it.
//   keyup / mouseup / blur -> always pass through (they only clear held state).
//   mouse / pointer / wheel / contextmenu inside #app-ui -> reach their target;
//                the #app-ui root stops them in the bubble phase so window-level
//                game listeners never see them. Right-click on a menu = back.
// Always (open screen or not): Alt+Enter toggles fullscreen (a user gesture).
//
// Keyboard map (PLAN §3.3): arrows + WASD = directions; Enter / NumpadEnter /
// Space = confirm; Esc / Backspace = back; Q / E and PageUp / PageDown = tabs;
// Delete = secondary; F2 = tertiary; Tab / Shift+Tab = down / up (web habit).
//
// Latency probe: every nav action records { action, source, inputTs, paintTs,
// ms } — inputTs is the event's timeStamp (gamepad: the poll that saw the
// press), paintTs the first task after the next rendered frame (rAF -> message),
// i.e. when the change could first be on screen. Last 50 kept (G1.3).
const KEYMAP = Object.freeze({
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  Space: 'confirm',
  Escape: 'back',
  Backspace: 'back',
  KeyQ: 'tabPrev',
  KeyE: 'tabNext',
  PageUp: 'tabPrev',
  PageDown: 'tabNext',
  Delete: 'secondary',
  F2: 'tertiary',
});
const DIRECTIONS = new Set(['up', 'down', 'left', 'right']);
const PASS_DEFAULT = new Set(['F5', 'F11', 'F12']);
const MODIFIER_CODES = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'CapsLock']);
// Mouse/pointer traffic the #app-ui root keeps away from the game's window
// listeners (mouseup / pointerup pass: they only release held state).
const STOP_BUBBLE = ['mousedown', 'pointerdown', 'click', 'dblclick', 'auxclick', 'contextmenu', 'wheel', 'mousemove', 'pointermove', 'touchstart', 'touchmove', 'touchend'];
const RESPONSES_MAX = 50;

function isTextInput(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName !== 'INPUT') return false;
  const t = (el.type || 'text').toLowerCase();
  return !['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color', 'file'].includes(t);
}

export function createNav({ screens, root, onFullscreenToggle, isRecentFullscreenChange }) {
  let lastSource = 'keyboard';
  let lastInputAt = 0;
  const responses = [];
  const pending = [];
  const channel = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
  let rafQueued = false;
  const sourceFns = new Set();

  function setSource(src) {
    if (src !== lastSource && (src === 'keyboard' || src === 'mouse' || src === 'gamepad')) {
      lastSource = src;
      for (const fn of sourceFns) {
        try {
          fn(src);
        } catch (err) {
          console.warn('[nav] source listener threw', err);
        }
      }
    }
  }

  if (channel) {
    channel.port1.onmessage = () => {
      const now = performance.now();
      const batch = pending.splice(0, pending.length);
      for (const rec of batch) {
        rec.paintTs = Math.round(now * 10) / 10;
        rec.ms = Math.round((now - rec.inputTs) * 10) / 10;
      }
    };
  }

  function markResponse(action, source, inputTs, screen) {
    const rec = {
      action,
      source,
      screen,
      inputTs: Math.round(inputTs * 10) / 10,
      paintTs: null,
      ms: null,
    };
    responses.push(rec);
    if (responses.length > RESPONSES_MAX) responses.shift();
    pending.push(rec);
    if (!rafQueued) {
      rafQueued = true;
      requestAnimationFrame(() => {
        rafQueued = false;
        if (channel) channel.port2.postMessage(0);
        else {
          const now = performance.now();
          for (const r of pending.splice(0)) {
            r.paintTs = now;
            r.ms = Math.round((now - r.inputTs) * 10) / 10;
          }
        }
      });
    }
  }

  // One entry point for every source. inputTs defaults to now.
  function act(action, source, { inputTs = performance.now(), repeat = false } = {}) {
    setSource(source);
    lastInputAt = performance.now();
    const screen = screens.top();
    const consumed = screens.nav(action, source, { repeat });
    if (screen) markResponse(action, source, inputTs, screen);
    return consumed;
  }

  // ------------------------------------------------------------ keyboard --
  function onKeyDown(e) {
    // Alt+Enter: fullscreen toggle anywhere (the keydown is a user gesture).
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'Enter' || e.code === 'NumpadEnter')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat && onFullscreenToggle) onFullscreenToggle('keyboard');
      return;
    }
    if (!screens.isBlocking()) return; // the game owns input
    // Any key on a menu is menu activity (app.backgroundHold) — also the ones
    // that map to no action, e.g. the "press any key" that opens the title.
    lastInputAt = performance.now();
    const active = document.activeElement;
    const typing = isTextInput(active) && root.contains(active);
    const combo = e.ctrlKey || e.metaKey;
    if (typing) {
      // Text fields take typing; Enter confirms, Esc backs, Tab / arrows up-down move.
      e.stopImmediatePropagation();
      let action = null;
      if (e.code === 'Enter' || e.code === 'NumpadEnter') action = 'confirm';
      else if (e.code === 'Escape') action = 'back';
      else if (e.code === 'ArrowUp') action = 'up';
      else if (e.code === 'ArrowDown') action = 'down';
      else if (e.code === 'Tab') action = e.shiftKey ? 'up' : 'down';
      if (action) {
        e.preventDefault();
        if (action === 'back' || action === 'up' || action === 'down') active.blur();
        act(action, 'keyboard', { inputTs: e.timeStamp, repeat: e.repeat });
      }
      return;
    }
    if (!PASS_DEFAULT.has(e.code) && !combo) e.preventDefault();
    e.stopImmediatePropagation();
    if (combo || e.altKey || MODIFIER_CODES.has(e.code)) return;
    let action = KEYMAP[e.code] || null;
    if (e.code === 'Tab') action = e.shiftKey ? 'up' : 'down';
    if (!action) return;
    if (e.repeat && !DIRECTIONS.has(action)) return;
    // An Esc that ended element fullscreen must not also back out of a menu.
    if (e.code === 'Escape' && isRecentFullscreenChange && isRecentFullscreenChange(150)) return;
    act(action, 'keyboard', { inputTs: e.timeStamp, repeat: e.repeat });
  }

  window.addEventListener('keydown', onKeyDown, { capture: true });

  // --------------------------------------------------------------- mouse --
  // Bubble-phase stops on the root: menu clicks reach their buttons, never the
  // window-level game listeners (aim, basic attack, context menu).
  for (const type of STOP_BUBBLE) {
    root.addEventListener(type, (e) => e.stopPropagation(), { passive: true });
  }

  root.addEventListener(
    'pointermove',
    (e) => {
      // Hover focuses — only on real pointer motion (a screen opening under a
      // still cursor never steals the keyboard's focus).
      if (e.pointerType === 'touch') return;
      if (e.movementX === 0 && e.movementY === 0) return;
      const item = e.target && e.target.closest ? e.target.closest('[data-nav]') : null;
      const row = !item && e.target && e.target.closest ? e.target.closest('.ap-row') : null;
      const target = item || (row ? row.querySelector('[data-nav]') : null);
      if (!target) return;
      setSource('mouse');
      lastInputAt = performance.now(); // menu activity (app.backgroundHold)
      screens.focusElement(target, 'mouse');
    },
    { passive: true }
  );

  root.addEventListener(
    'click',
    (e) => {
      // The nav 'confirm' action presses the focused item with el.click() — an
      // untrusted click. It is NOT mouse input: it must not flip the hint
      // glyphs to keyboard/mouse after a gamepad A (or arm the title's
      // mouse-only open guard after Enter), nor log a second response.
      if (!e.isTrusted) return;
      const item = e.target && e.target.closest ? e.target.closest('[data-nav]') : null;
      if (!item) {
        const row = e.target && e.target.closest ? e.target.closest('.ap-row') : null;
        const n = row ? row.querySelector('[data-nav]') : null;
        if (n) screens.focusElement(n, 'mouse');
        return;
      }
      setSource('mouse');
      lastInputAt = performance.now();
      screens.focusElement(item, 'mouse');
      const screen = screens.top();
      if (screen) markResponse('confirm', 'mouse', e.timeStamp, screen);
    },
    { capture: false }
  );

  root.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!screens.isOpen()) return;
    act('back', 'mouse', { inputTs: e.timeStamp });
  });

  // Range inputs dragged by the mouse: record the response too.
  root.addEventListener(
    'input',
    (e) => {
      if (e.target && e.target.type === 'range' && lastSource === 'mouse') {
        const screen = screens.top();
        if (screen) markResponse('adjust', 'mouse', e.timeStamp, screen);
      }
    },
    { passive: true }
  );

  return {
    act,
    markResponse,
    get lastSource() {
      return lastSource;
    },
    get lastInputAt() {
      return lastInputAt;
    },
    setSource,
    onSource(fn) {
      sourceFns.add(fn);
      return () => sourceFns.delete(fn);
    },
    responses: () => responses.map((r) => ({ ...r })),
    clearResponses: () => {
      responses.length = 0;
    },
  };
}
