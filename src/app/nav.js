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
// @gnt:M3 POINTER-NAV-SOUND begin (import)
import { appEvents } from './events.js';
// @gnt:M3 POINTER-NAV-SOUND end (import)
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

  function inTopScreen(el) {
    const top = screens.top();
    const host = el && el.closest ? el.closest('[data-screen]') : null;
    return !!top && !!host && host.dataset.screen === top && root.contains(host);
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
      // Text fields take typing; Enter confirms, Tab / arrows up-down move on
      // (leaving a field keeps what was typed, like any form), and Esc is
      // CANCEL: it never commits. A field with an uncommitted edit reverts to
      // its saved value and keeps the caret (screens.nav 'back' asks the
      // field's __navCancelEdit first); with nothing to cancel, Esc backs one
      // level. The field is not blurred before 'back' — a blur fires the
      // native 'change' a live-commit field saves on (MENU-R4-F1).
      e.stopImmediatePropagation();
      // An IME composition owns its keys (Esc drops, Enter picks the
      // candidate): never a menu action.
      if (e.isComposing || e.keyCode === 229) return;
      let action = null;
      if (e.code === 'Enter' || e.code === 'NumpadEnter') action = 'confirm';
      else if (e.code === 'Escape') action = 'back';
      else if (e.code === 'ArrowUp') action = 'up';
      else if (e.code === 'ArrowDown') action = 'down';
      else if (e.code === 'Tab') action = e.shiftKey ? 'up' : 'down';
      if (action) {
        e.preventDefault();
        if (action === 'up' || action === 'down') active.blur();
        act(action, 'keyboard', { inputTs: e.timeStamp, repeat: e.repeat });
        // Backed out of the field's screen: a caret must not stay in a
        // hidden field (its screen closed with no other screen to focus).
        if (action === 'back' && document.activeElement === active && !inTopScreen(active)) active.blur();
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

  // A real press of the pointer is pointer input from that moment — before
  // the control's own click handler runs. The click listener below only
  // switched the source after the control had already acted (and never for
  // the ‹ › step buttons), so a click with no pointer motion since a gamepad
  // press reached the display service as 'gamepad' and fullscreen was
  // refused although a click is a user gesture (fix-M1-r6, MENU-R6-F1).
  root.addEventListener(
    'pointerdown',
    (e) => {
      if (!e.isTrusted) return;
      setSource('mouse');
      lastInputAt = performance.now();
    },
    { capture: true, passive: true }
  );

  // @gnt:M3 POINTER-NAV-SOUND begin — a pointer activation of a menu item is
  // the same nav 'confirm' a key / pad press is (fix-M3-r6, AUD6-F1: a click
  // was silent while Enter / A played ui_confirm). It is announced on the
  // app 'nav' event BEFORE the control's own click handler runs (capture
  // phase) — as screens.nav announces Enter before it presses the item — so
  // the audio engine plays one activation cue whatever the device, and a
  // setting the control changes folds its own tick into it exactly as for
  // Enter. `el` lets the engine tell a Back / Cancel item, a tab chip or a
  // disabled / locked item (ui_deny) from a plain button (PLAN §3.5).
  // Only a real press-and-release on ONE item of the top screen counts: the
  // press began on that item (a click that dismissed the splash and lands on
  // a title item is not an activation), a keyboard-made click (detail 0) is
  // left to the nav that made it, and sliders / text fields are adjusted or
  // typed into, never activated. A natively [disabled] button gets no click
  // event at all, so its release announces the (denied) activation.
  let pressItem = null;
  const pointerItem = (e) => (e.target && e.target.closest ? e.target.closest('[data-nav]') : null);
  const activatable = (el) =>
    !!el && inTopScreen(el) && el.tagName !== 'SELECT' && !isTextInput(el) && !(el.tagName === 'INPUT' && el.type === 'range');
  const announceActivation = (el) =>
    appEvents.emit('nav', { action: 'confirm', source: 'mouse', screen: screens.top(), repeat: false, pointer: true, el });
  root.addEventListener(
    'pointerdown',
    (e) => {
      if (!e.isTrusted) return;
      pressItem = e.button === 0 ? pointerItem(e) : null;
    },
    { capture: true, passive: true }
  );
  root.addEventListener(
    'pointerup',
    (e) => {
      if (!e.isTrusted || e.button !== 0) return;
      const item = pointerItem(e);
      if (item && item === pressItem && item.disabled === true && activatable(item)) {
        pressItem = null;
        announceActivation(item);
      }
    },
    { capture: true, passive: true }
  );
  root.addEventListener(
    'click',
    (e) => {
      if (!e.isTrusted || !(e.detail > 0)) return;
      const item = pointerItem(e);
      const pressed = pressItem;
      pressItem = null;
      if (item && item === pressed && activatable(item)) announceActivation(item);
    },
    { capture: true, passive: true }
  );
  // @gnt:M3 POINTER-NAV-SOUND end

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

  // Right-click is 'back', and back from a field with an uncommitted edit is
  // cancel — but the right button's mousedown would first move focus off the
  // field, and that blur commits it. Keep the caret where it is; the
  // contextmenu below then cancels the edit (or backs out).
  root.addEventListener(
    'mousedown',
    (e) => {
      if (e.button !== 2) return;
      const ae = document.activeElement;
      if (ae && typeof ae.__navCancelEdit === 'function' && root.contains(ae)) e.preventDefault();
    },
    { capture: true }
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
