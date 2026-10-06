// Boot splash (docs/gauntlet/PLAN.md §1.2 'boot' / §1.3 'loading'). Owner: M1.
//
// Shown on title boots only (menu-skip boots go straight to camp). It covers
// the boot warm-up (render/warmup.js parks one of every transient rig for a
// few frames so no shader compiles mid-fight): ready once warmupPending() is 0
// and 30 frames have rendered, or after 8 s at most. Then:
//   - audio engine present and still 'locked' (no AudioContext yet — browsers
//     only allow one inside a user gesture): "Press any key or click". The
//     gesture reaches service('audio').unlock through the committed app
//     gesture hook (it runs before the input gate), so keyboard-only, mouse-
//     only and touch players all start the title WITH sound. Esc is not
//     advertised and does not advance (it grants no user activation).
//   - otherwise (no audio service, already running, autoplay allowed): the
//     title follows at once.
// A gamepad A / Start also advances (pads cannot unlock audio — the title is
// then silent until the first key or click, which the hook still catches).
import { service } from '../../app/registry.js';
import { t } from '../../i18n/index.js';

const MIN_FRAMES = 30;
const MAX_MS = 8000;
const NO_ADVANCE_KEYS = new Set(['Escape', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab']);

export function createLoadingScreen(ctx) {
  const { app } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-loading';
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <div class="ap-load-col">
      <div class="ap-logo">
        <div class="ap-logo-word">ECHOES</div>
        <div class="ap-logo-rule">◆</div>
      </div>
      <div class="ap-bar"><i></i></div>
      <div class="ap-load-status">${t('Lighting the hearth…')}</div>
      <button type="button" class="ap-press ap-focusable" data-nav>${t('Press any key or click')}</button>
    </div>`;
  const bar = el.querySelector('.ap-bar > i');
  const status = el.querySelector('.ap-load-status');
  const press = el.querySelector('.ap-press');
  press.addEventListener('click', () => {
    if (waiting) advance('click');
  });

  let raf = 0;
  let t0 = 0;
  let f0 = 0;
  let maxPending = 1;
  let ready = false;
  let waiting = false;
  let done = false;
  let offGesture = null;
  const info = { readyAt: null, waitedForGesture: false, advancedBy: null, frames: 0, pendingMax: 0 };

  function advance(by) {
    if (done) return;
    done = true;
    waiting = false;
    info.advancedBy = by;
    press.classList.remove('ap-on');
    // Deferred: the gesture that advanced must finish dispatching (the input
    // gate still sees this screen on top and swallows it) before the title
    // exists, so the same key/click can never also choose a title item.
    setTimeout(() => app.finishBoot(), 0);
  }

  function audioLocked() {
    const a = service('audio');
    return !!a && a.state === 'locked';
  }

  function tick() {
    raf = 0;
    if (done) return;
    const frames = app.frameCount - f0;
    const pending = app.warmupPending();
    if (pending > maxPending) maxPending = pending;
    const warm = pending === 0 ? 1 : 1 - pending / Math.max(1, maxPending);
    const p = Math.min(1, Math.min(frames / MIN_FRAMES, 1) * 0.4 + warm * 0.6);
    bar.style.width = `${Math.round((ready ? 1 : p) * 100)}%`;
    const elapsed = performance.now() - t0;
    if (!ready && ((frames >= MIN_FRAMES && pending === 0) || elapsed >= MAX_MS)) {
      ready = true;
      info.readyAt = Math.round(elapsed);
      info.frames = frames;
      info.pendingMax = maxPending;
      bar.style.width = '100%';
      if (audioLocked()) {
        waiting = true;
        info.waitedForGesture = true;
        status.textContent = t('Ready');
        press.classList.add('ap-on');
      } else {
        status.textContent = t('Ready');
        advance('auto');
        return;
      }
    }
    if (waiting && !audioLocked()) {
      advance('audio_running'); // unlocked by some other route (autoplay policy)
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  const screen = {
    el,
    blocking: true,
    layer: 'loading',
    root: true,
    onOpen() {
      t0 = performance.now();
      f0 = app.frameCount;
      done = false;
      ready = false;
      waiting = false;
      maxPending = Math.max(1, app.warmupPending());
      press.classList.remove('ap-on');
      offGesture = app.onGesture((e) => {
        if (!waiting || done) return;
        if (e.type === 'keydown' && (NO_ADVANCE_KEYS.has(e.key) || e.repeat)) return;
        advance(e.type);
      });
      if (!raf) raf = requestAnimationFrame(tick);
    },
    onClose() {
      if (offGesture) offGesture();
      offGesture = null;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    // Every nav action is consumed here (nothing behind the splash reacts);
    // a pad's A / Start advances once ready.
    onNav(action, source) {
      if (waiting && source === 'gamepad' && action === 'confirm') advance('gamepad');
      return true;
    },
    back: () => true,
    debug: () => ({ ...info, ready, waiting, done, prompt: press.classList.contains('ap-on') }),
  };
  return screen;
}
