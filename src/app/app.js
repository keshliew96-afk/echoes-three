// App shell + state machine (docs/gauntlet/PLAN.md §1 / §3.1). Owner: M1.
//
//   boot ──► title ──► playing(camp ⇄ run) ──► (pause overlay, INT) ──► title
//     │        │  ▲                                     ▲
//     │        │  └──── farewell ◄── Exit (confirm) ─────┘ (from title only)
//     └── menu-skip (?menu=0 / legacy harness params) ──► playing
//
// CALL ORDER in main.js (anchors `@gnt:APP-BOOT`, `@gnt:APP-ATTACH`):
//   1. const app = createApp({ params })       BEFORE createInputController —
//      installs (a) the gesture hook (FIRST window capture listener, binding)
//      and (b) the app input gate (src/app/nav.js), so both run before every
//      game listener (ui/run/index.js also listens in the capture phase).
//   2. app.attach({ stage, world, clock, bus, rng, registry, input, scene,
//      runUi, socket, hud, overlay, scheduler, warmupPending })
//   3. app.boot()                              title vs menu-skip (PLAN §6.1)
//
// Queries main.js's loop makes every frame:
//   app.simPaused()      -> true while the sim clock must not advance (PLAN §1.6)
//   app.beforeRender(now)-> title backdrop camera (just before stage.render())
//   app.update(now)      -> audio engine update FIRST (committed), then gamepad
//                           poll, focus audit, sim_pause event
import { appEvents } from './events.js';
import { provide, service, screenFactory, screenIds } from './registry.js';
import { createSettingsStore } from './settings.js';
import { createScreenManager } from './screens.js';
import { widgets } from './widgets.js';
import { installAppStyle } from './style.js';
import { createNav } from './nav.js';
import { createGamepadPoller } from './gamepad.js';
import { createToaster } from './toast.js';
import { createDisplay } from './display.js';
import { createTitleCam } from './titlecam.js';
import { LEGACY_HARNESS_PARAMS } from './params.js';
import { registerCoreMenus } from '../ui/menu/index.js';

export const APP_STATES = Object.freeze(['boot', 'title', 'playing', 'farewell']);
export const APP_UI_ROOT_ID = 'app-ui';
const NET_SESSION_STATES = new Set(['host', 'guest', 'reconnecting', 'migrating']);
// Background work yields to menu input for this long after the last press /
// hover (app.backgroundHold). Menu navigation comes in bursts (presses a few
// hundred ms apart); 1.5 s covers a burst and the reading pause inside it.
const BACKGROUND_HOLD_MS = 1500;

// GESTURE HOOK (binding, PLAN §1.5 / §3.5 — M1 must keep it FIRST): the very
// first window capture-phase listener of the page. It hands every user
// activation gesture to the audio engine synchronously (AudioContext
// creation/resume is only allowed inside the gesture's own task) BEFORE the
// app input gate swallows the event. M1's gate runs after it and may stop
// propagation freely; M3 never adds window gesture listeners of its own.
// Escape does not grant user activation in browsers, so the loading screen's
// prompt reads "Press any key or click" and every other key works.
const GESTURE_EVENTS = ['pointerdown', 'mousedown', 'keydown', 'touchend'];
const gestureFns = new Set();
function onGesture(e) {
  const audio = service('audio');
  if (audio && typeof audio.unlock === 'function') {
    try {
      audio.unlock(e);
    } catch (err) {
      console.warn('[app] audio.unlock threw', err);
    }
  }
  for (const fn of gestureFns) {
    try {
      fn(e);
    } catch (err) {
      console.warn('[app] gesture hook threw', err);
    }
  }
}
let gestureHookInstalled = false;
function installGestureHook() {
  if (gestureHookInstalled || typeof window === 'undefined') return;
  gestureHookInstalled = true;
  for (const type of GESTURE_EVENTS) window.addEventListener(type, onGesture, { capture: true, passive: true });
}

const randomSeed = () => Math.floor(Math.random() * 0x100000000) >>> 0;

export function createApp({ params }) {
  installGestureHook(); // FIRST — before the gate below and every game listener
  let state = 'boot';
  let ctx = null;
  let display = null;
  let titleCam = null;
  let frameCount = 0;
  let freshWorld = true; // the world behind the title is the untouched boot state
  let lastPaused = null;
  let lastPauseReason = null;
  let focusLost = false;
  let pauseHandler = null;
  let loadReported = false;
  let wasBlocking = false;
  let exiting = false;

  const settings = createSettingsStore();
  provide('settings', settings);
  installAppStyle();

  // #app-ui: the one DOM root every app-layer screen mounts under. It has no
  // box and no stacking context; each screen is position:fixed in its own
  // z-band (screens 1000, overlays 1100, dialogs 1200, toasts 1300, loading
  // 1400, farewell 1500 — PLAN §2.3), and mouse traffic inside it is kept from
  // the game's window listeners by src/app/nav.js.
  let root = document.getElementById(APP_UI_ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = APP_UI_ROOT_ID;
    document.body.appendChild(root);
  }
  root.style.cssText = '';

  const screenCtx = { app: null, settings, widgets, services: { service }, params };
  const screens = createScreenManager({ root, ctx: screenCtx });
  const toaster = createToaster(root);
  const nav = createNav({
    screens,
    root,
    onFullscreenToggle: (src) => display && display.toggleFullscreen(src),
    isRecentFullscreenChange: (ms) => !!display && display.recentFullscreenChange(ms),
  });
  const gamepad = createGamepadPoller({
    onAction(action, meta) {
      if (!screens.isOpen()) {
        // PARTY (PLAN §16.4): the build pages — the socket screen, then the
        // run's party page / shop — take the pad (LB/RB characters, D-pad,
        // A / X / Y). Gameplay on a gamepad stays out of scope.
        const sock = ctx && ctx.socket;
        if (sock && typeof sock.isOpen === 'function' && sock.isOpen() && typeof sock.padAction === 'function') {
          sock.padAction(action, meta);
          return;
        }
        const ru = ctx && ctx.runUi;
        if (ru && typeof ru.isOpen === 'function' && ru.isOpen() && typeof ru.padAction === 'function') ru.padAction(action, meta);
        return;
      }
      nav.act(action, 'gamepad', meta);
    },
    onStart(meta) {
      const top = screens.top();
      if (!top) {
        if (state === 'playing') app.requestPause('gamepad');
        return;
      }
      if (top === 'pause') nav.act('back', 'gamepad', meta);
      else if (top === 'loading' || top === 'title') nav.act('confirm', 'gamepad', meta);
    },
  });

  function toast(text, opts = {}) {
    return toaster.toast(text, opts);
  }

  function updateBodyClass() {
    const hide = state === 'boot' || state === 'title' || state === 'farewell';
    document.body.classList.toggle('ap-hide-game', hide);
  }

  function setState(next) {
    if (next === state) return;
    const prev = state;
    state = next;
    updateBodyClass();
    appEvents.emit('app_state', { state, prev, mode: mode(), overlay: screens.top() });
  }

  // 'camp' | 'run' — which half of the hosted camp scene is live.
  function mode() {
    const run = ctx && ctx.world && ctx.world.runSystem ? ctx.world.runSystem() : null;
    return run && run.isActive() ? 'run' : 'camp';
  }

  function netActive() {
    const n = service('net');
    if (!n) return false;
    try {
      if (typeof n.inSession === 'function') return !!n.inSession();
      const st = n.debug && n.debug.state !== undefined ? n.debug.state : n.state;
      return NET_SESSION_STATES.has(st);
    } catch {
      return false;
    }
  }

  function autoPaused() {
    return (
      focusLost &&
      state === 'playing' &&
      !params.menuSkip &&
      settings.get('gameplay.autoPause') === true &&
      !netActive()
    );
  }

  function pauseReason() {
    if (state === 'title') return 'title';
    if (state === 'farewell') return 'farewell';
    if (state === 'boot') return params.menuSkip ? null : 'boot';
    if (netActive()) return null;
    if (screens.isBlocking()) return `overlay:${screens.top()}`;
    if (autoPaused()) return 'focus_lost';
    return null;
  }

  screens.on('change', (p) => {
    appEvents.emit('overlay', p);
    if (p.blocking !== wasBlocking) {
      wasBlocking = p.blocking;
      const input = ctx && ctx.input;
      if (input) {
        if (p.blocking) {
          if (typeof input.releaseAll === 'function') input.releaseAll();
          if (typeof input.setEnabled === 'function') input.setEnabled(false);
        } else if (typeof input.setEnabled === 'function') input.setEnabled(true);
      }
    }
  });
  screens.on('nav', (p) => appEvents.emit('nav', p));

  // Focus loss (single-player auto-pause, PLAN §1.6). Only real blur /
  // visibility events count (never a hasFocus() poll: headless harness pages
  // report no focus without ever blurring).
  window.addEventListener('blur', () => {
    focusLost = true;
    if (autoPaused() && !screens.isOpen() && screenFactory('pause')) app.requestPause('focus_lost');
  });
  window.addEventListener('focus', () => {
    focusLost = false;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      focusLost = true;
      if (autoPaused() && !screens.isOpen() && screenFactory('pause')) app.requestPause('focus_lost');
    } else if (document.hasFocus()) focusLost = false;
  });

  function announceLoadReport() {
    if (loadReported) return;
    loadReported = true;
    const r = settings.loadReport;
    if (r.status === 'recovered') toast('Settings were reset — the saved file was unreadable', { tone: 'warn', ms: 5200 });
    else if (r.status === 'newer') toast('Your settings were saved by a newer version of Echoes — using defaults for now', { tone: 'warn', ms: 5200 });
    else if (r.storage === 'memory') toast("Settings can't be saved in this browser mode", { tone: 'warn', ms: 4200 });
  }

  function showTitle() {
    screens.clear();
    screens.push('title');
    setState('title');
    announceLoadReport();
    prebuildMenus();
  }

  // Warm the menus the player opens next in idle time (first open = no DOM build).
  let prebuilt = false;
  let prebuildMs = null;
  function prebuildMenus() {
    if (prebuilt) return;
    prebuilt = true;
    const idle = typeof window.requestIdleCallback === 'function' ? (f) => window.requestIdleCallback(f, { timeout: 2500 }) : (f) => setTimeout(f, 400);
    idle(() => {
      const t0 = performance.now();
      for (const id of ['settings', 'farewell']) screens.prebuild(id);
      prebuildMs = Math.round((performance.now() - t0) * 10) / 10;
    });
  }

  function enterPlaying() {
    screens.clear();
    freshWorld = false;
    setState('playing');
    announceLoadReport();
  }

  // A navigation into a genuinely fresh boot — the truthful fallback while no
  // save service can reset the live world in place (decision D6).
  function freshReload({ skipTitle }) {
    settings.persist();
    const u = new URL(window.location.href);
    for (const k of [...LEGACY_HARNESS_PARAMS, 'menu', 'slot', 'fresh', 'freeze', 'act']) u.searchParams.delete(k);
    if (skipTitle) u.searchParams.set('menu', '0');
    window.location.replace(u.toString());
  }

  const app = {
    params,
    settings,
    screens,
    events: appEvents,
    get state() {
      return state;
    },
    get mode() {
      return mode();
    },
    get input() {
      return ctx ? ctx.input : null;
    },
    get scheduler() {
      return ctx ? ctx.scheduler : null;
    },
    get display() {
      return display;
    },
    get nav() {
      return nav;
    },
    get frameCount() {
      return frameCount;
    },
    warmupPending() {
      try {
        return ctx && typeof ctx.warmupPending === 'function' ? ctx.warmupPending() : 0;
      } catch {
        return 0;
      }
    },
    attach(c) {
      ctx = c;
      display = createDisplay({
        settings,
        stage: c.stage,
        scheduler: c.scheduler,
        toast,
        lastSource: () => nav.lastSource,
      });
      provide('display', display);
      display.init();
      if (c.stage && c.stage.camera) {
        let hearth;
        let colAt = -Infinity;
        let colFrac = null;
        titleCam = createTitleCam({
          camera: c.stage.camera,
          // The camp scene's framing inputs (camp.js CAMP-CMD 'titleCam'); other scenes: none.
          getHearth: () => {
            if (hearth === undefined) {
              let r = null;
              try {
                r = c.scene && typeof c.scene.cmd === 'function' ? c.scene.cmd('titleCam', []) : null;
              } catch {
                r = null;
              }
              hearth = r && r.hearth ? r.hearth : null;
            }
            return hearth;
          },
          // Right edge of the title's menu column as a fraction of the width.
          getColumnFraction: () => {
            const now = performance.now();
            if (now - colAt > 500) {
              colAt = now;
              const col = document.querySelector('.ap-title.ap-open .ap-title-col');
              const r = col ? col.getBoundingClientRect() : null;
              colFrac = r && r.width > 0 ? r.right / window.innerWidth : colFrac;
            }
            return colFrac;
          },
        });
      }
      // FPS meter (display.showFps; forced on by ?fps=1 / ?debug=1 / harness boots — D4).
      const forced = !!(params.fps || params.debug || params.menuSkip);
      const applyFps = () => {
        if (c.overlay && typeof c.overlay.setFpsVisible === 'function') c.overlay.setFpsVisible(forced || settings.get('display.showFps') === true);
      };
      applyFps();
      settings.subscribe('display.showFps', applyFps);
      app.fpsForced = forced;
      return app;
    },
    boot() {
      if (params.menuSkip) {
        setState('playing'); // == the v0.4.63 boot: sim ticking from tick 1
        freshWorld = false;
        announceLoadReport();
        prebuildMenus();
        return state;
      }
      updateBodyClass();
      screens.push('loading', {});
      return state;
    },
    // The loading screen hands over here once warm (+ the audio-unlock gesture).
    finishBoot() {
      if (state !== 'boot') return state;
      const save = service('save');
      if (params.slot && save && typeof save.load === 'function') {
        Promise.resolve()
          .then(() => save.load(params.slot))
          .then((r) => {
            if (r && r.ok) enterPlaying();
            else {
              showTitle();
              toast(`Couldn't load save "${params.slot}"`, { tone: 'warn' });
            }
          })
          .catch(() => showTitle());
        return state;
      }
      showTitle();
      return state;
    },
    simPaused() {
      if (state === 'title' || state === 'farewell') return true;
      if (state === 'boot') return !params.menuSkip;
      if (netActive()) return false; // the shared sim never pauses for one player
      if (screens.isBlocking()) return true;
      return autoPaused();
    },
    inputBlocked() {
      return screens.isBlocking();
    },
    // backgroundHold() -> true while the player is working a menu: an app
    // screen is open and a menu input (key, pad, click, hover) arrived within
    // the last BACKGROUND_HOLD_MS. Background streaming (the arena's dressing
    // pre-builder, render/hazards/layers.js) pauses its main-thread slices
    // while it holds, so no build step (texture uploads, prop builds: 10-50 ms
    // tasks) lands between a press and its visual response (G1.3; gauntlet
    // MENU-R1-F1). Idle menus (the title left alone, a paused game) still
    // build at full budget.
    backgroundHold(now = performance.now()) {
      return screens.isOpen() && now - nav.lastInputAt < BACKGROUND_HOLD_MS;
    },
    // Per rendered frame (called from main.js frame() after stage.render()).
    // Binding: the audio engine's per-frame work (listener = camera ground
    // focus, music intensity, meters) runs HERE via service('audio').update,
    // so M3 never edits main.js's LOOP region. M1 keeps this call first.
    update(now) {
      const audio = service('audio');
      if (audio && typeof audio.update === 'function') audio.update(now);
      frameCount += 1;
      gamepad.poll(now);
      screens.audit();
      const paused = app.simPaused();
      const reason = paused ? pauseReason() : null;
      if (paused !== lastPaused || reason !== lastPauseReason) {
        lastPaused = paused;
        lastPauseReason = reason;
        appEvents.emit('sim_pause', { paused, reason });
      }
    },
    // Just before stage.render(): the title backdrop framing (src/app/titlecam.js).
    beforeRender(now) {
      if (titleCam) titleCam.apply(now, state === 'title' || state === 'boot');
    },
    // onGesture(fn) -> unsubscribe: other modules that need a user-activation
    // gesture (e.g. fullscreen retry prompts) subscribe here, never to window.
    onGesture(fn) {
      gestureFns.add(fn);
      return () => gestureFns.delete(fn);
    },
    // New Game: a fresh camp. At the boot title the world IS the boot state;
    // later (after Quit to Title) save.resetToFresh() rebuilds it in place, or
    // — before the save system exists — a fresh boot straight into camp.
    newGame({ seed } = {}) {
      // M2: an explicit seed (PLAN §3.1 newGame({ seed? })) always rebuilds
      // the camp with it — also when Quit to Title already left a fresh camp.
      if (!freshWorld || (seed !== undefined && seed !== null && service('save'))) {
        const save = service('save');
        if (save && typeof save.resetToFresh === 'function') {
          const r = save.resetToFresh({ seed: seed ?? randomSeed() });
          if (r && r.ok === false) {
            toast("Couldn't start a new game", { tone: 'error' });
            return Promise.resolve(false);
          }
        } else {
          freshReload({ skipTitle: true });
          return Promise.resolve(false);
        }
      }
      enterPlaying();
      return Promise.resolve(true);
    },
    async loadSlot(slotId) {
      const save = service('save');
      if (!save || typeof save.load !== 'function') return { ok: false, error: 'unavailable' };
      const r = await save.load(slotId);
      if (r && r.ok) enterPlaying();
      return r;
    },
    async continueGame() {
      const save = service('save');
      const latest = save && typeof save.latest === 'function' ? save.latest() : null;
      if (!latest) return { ok: false, error: 'missing' };
      return app.loadSlot(latest.id ?? latest.slot ?? latest.slotId);
    },
    // Quit to Title (pause menu, INT): optional save, then a fresh camp behind
    // the title.
    async quitToTitle({ save = false } = {}) {
      const svc = service('save');
      if (save && svc) {
        try {
          if (typeof svc.autosave === 'function') await svc.autosave('quit');
          else if (typeof svc.save === 'function') await svc.save('auto-1', { kind: 'auto' });
        } catch (err) {
          console.warn('[app] save before quit failed', err);
        }
      }
      settings.persist();
      if (svc && typeof svc.resetToFresh === 'function') {
        const r = svc.resetToFresh({ seed: randomSeed() });
        freshWorld = !(r && r.ok === false);
        showTitle();
        return true;
      }
      freshReload({ skipTitle: false });
      return false;
    },
    // Exit: confirm -> flush -> window.close() -> farewell card if the tab
    // stays open 300 ms later (browsers only close windows script opened, or
    // a tab with a single history entry).
    async exit() {
      if (exiting) return false;
      exiting = true;
      try {
        const hasSave = !!service('save');
        const ok = await app.confirm({
          title: 'Exit Echoes?',
          body: hasSave ? 'Your progress and settings are saved.' : 'Your settings are saved.',
          confirmLabel: 'Exit',
          cancelLabel: 'Cancel',
          danger: true,
          defaultFocus: 'cancel',
        });
        if (!ok) return false;
        settings.persist();
        const svc = service('save');
        if (svc && typeof svc.flush === 'function') {
          try {
            svc.flush();
          } catch {
            /* best effort */
          }
        }
        try {
          window.close();
        } catch {
          /* not closable */
        }
        setTimeout(() => {
          if (window.closed) return;
          screens.clear();
          screens.push('farewell');
          setState('farewell');
        }, 300);
        return true;
      } finally {
        exiting = false;
      }
    },
    returnToTitle() {
      showTitle();
    },
    // Pause requests (gamepad Start, focus loss). INT registers the handler
    // (or the 'pause' screen) in W5; until then nothing opens.
    setPauseHandler(fn) {
      pauseHandler = typeof fn === 'function' ? fn : null;
    },
    requestPause(source = 'api') {
      if (state !== 'playing' || screens.isOpen()) return false;
      if (pauseHandler) return pauseHandler(source) !== false;
      if (screenFactory('pause')) return screens.push('pause', { source });
      return false;
    },
    // confirm({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
    //           danger = false, defaultFocus = 'cancel', timeoutMs = 0,
    //           timeoutResult = false }) -> Promise<boolean>
    // The 'confirm' screen receives params.resolve(bool) and calls it exactly
    // once (confirm, cancel, back, timeout) before popping itself.
    confirm(opts = {}) {
      return new Promise((resolve) => {
        let done = false;
        const once = (v) => {
          if (!done) {
            done = true;
            resolve(!!v);
          }
        };
        if (!screens.push('confirm', { ...opts, resolve: once })) {
          console.warn('[app] confirm() could not open the dialog — treated as Cancel', opts.title);
          once(false);
        }
      });
    },
    // keepDisplay({ changes: [text], seconds = 10 }) -> Promise<'keep'|'revert'>
    keepDisplay({ changes = [], seconds = 10 } = {}) {
      return new Promise((resolve) => {
        let done = false;
        const once = (v) => {
          if (!done) {
            done = true;
            resolve(v === 'keep' ? 'keep' : 'revert');
          }
        };
        if (!screens.push('keep-display', { changes, seconds, resolve: once })) once('revert');
      });
    },
    // toast(text, { tone = 'info'|'good'|'warn'|'error', ms = 2600 })
    toast,
    fpsForced: false,
  };

  // Debug surface (window.__echoes.app, PLAN §6.4).
  app.debug = {
    get state() {
      return state;
    },
    get overlay() {
      return screens.top();
    },
    get mode() {
      return mode();
    },
    stack: () => screens.stack(),
    open: (id, p) => screens.push(id, p),
    back: () => nav.act('back', 'api'),
    press: (action) => nav.act(action, 'api'),
    focus: () => screens.focused(),
    focusables: () => screens.focusables(),
    ringCount: () => screens.ringCount(),
    responses: () => nav.responses(),
    clearResponses: () => nav.clearResponses(),
    frameStats: () => (ctx && ctx.scheduler ? ctx.scheduler.stats() : null),
    display: () => (display ? display.state() : null),
    displayLog: () => (display ? display.debug.log() : []),
    screens: () => screenIds(),
    simPaused: () => app.simPaused(),
    backgroundHold: () => app.backgroundHold(),
    pauseReason: () => pauseReason(),
    lastSource: () => nav.lastSource,
    gamepad: () => gamepad.debug(),
    toasts: () => toaster.log(),
    titleCam: () => (titleCam ? titleCam.debug() : null),
    // Probe seam (G1.13): swap a service (e.g. a recording audio stub) in the
    // app's own registry instance.
    provide: (name, impl) => provide(name, impl),
    service: (name) => service(name),
    confirm: (o) => app.confirm(o),
    keepDisplay: (o) => app.keepDisplay(o),
    toast: (t, o) => app.toast(t, o),
    requestPause: (src) => app.requestPause(src),
    newGame: (o) => app.newGame(o),
    exit: () => app.exit(),
    quitToTitle: (o) => app.quitToTitle(o),
    get freshWorld() {
      return freshWorld;
    },
    get prebuildMs() {
      return prebuildMs;
    },
    get frameCount() {
      return frameCount;
    },
  };

  screenCtx.app = app;
  registerCoreMenus();
  provide('app', app);
  return app;
}
