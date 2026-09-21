// App shell + state machine (docs/gauntlet/PLAN.md §1 / §3.1). Owner: M1.
// ARCH stub: wires the shared seams (settings store, screen manager, service
// registry, app events) and reports state 'playing' — i.e. v0.4.63 behaviour.
// M1 turns it into the real machine:
//
//   boot ──► title ──► playing(camp ⇄ run) ──► (pause overlay) ──► title
//     │        │  ▲                                     ▲
//     │        │  └──── farewell ◄── Exit (confirm) ─────┘ (from title only)
//     └── menu-skip (?menu=0 / legacy harness params) ──► playing
//
// CALL ORDER in main.js (anchors `@gnt:APP-BOOT`, `@gnt:APP-ATTACH`):
//   1. const app = createApp({ params })       BEFORE createInputController —
//      M1 installs its window capture-phase keydown gate here, so it runs
//      before every game listener (ui/run/index.js also listens in capture).
//   2. app.attach({ stage, world, clock, bus, rng, registry, input, scene,
//      runUi, socket, hud, scheduler })       after every layer exists
//   3. app.boot()                              decides title vs menu-skip
//
// Queries main.js's loop makes every frame:
//   app.simPaused()   -> true while the sim clock must not advance
//                        (title, farewell, blocking overlay in single-player,
//                        auto-pause on blur). Never true in a network session
//                        (the shared sim cannot pause for one player).
//   app.update(now)   -> per-frame hook (gamepad polling, latency probes)
import { appEvents } from './events.js';
import { provide, service } from './registry.js';
import { createSettingsStore } from './settings.js';
import { createScreenManager } from './screens.js';
import { widgets } from './widgets.js';

export const APP_STATES = Object.freeze(['boot', 'title', 'playing', 'farewell']);
export const APP_UI_ROOT_ID = 'app-ui';

export function createApp({ params }) {
  let state = 'boot';
  let ctx = null;

  const settings = createSettingsStore();
  provide('settings', settings);

  // #app-ui: the one DOM root every app-layer screen mounts under (z-index
  // band 1000-1599, PLAN §3.3). Empty + pointer-transparent until a screen
  // is pushed, so the stub changes nothing on screen.
  let root = document.getElementById(APP_UI_ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = APP_UI_ROOT_ID;
    root.style.cssText = 'position:fixed;inset:0;z-index:1000;pointer-events:none;';
    document.body.appendChild(root);
  }

  const screens = createScreenManager({
    root,
    ctx: { app: null, settings, widgets, services: { service }, params },
  });
  screens.on('change', (p) => appEvents.emit('overlay', p));

  function setState(next) {
    if (next === state) return;
    const prev = state;
    state = next;
    appEvents.emit('app_state', { state, prev, mode: mode(), overlay: screens.top() });
  }

  // 'camp' | 'run' — which half of the hosted camp scene is live.
  function mode() {
    const run = ctx && ctx.world && ctx.world.runSystem ? ctx.world.runSystem() : null;
    return run && run.isActive() ? 'run' : 'camp';
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
    attach(c) {
      ctx = c;
      return app;
    },
    // ARCH stub: always straight into play (a title screen arrives with M1;
    // until then the plain URL behaves exactly like v0.4.63).
    boot() {
      if (params.showTitle && screens.push('title')) setState('title');
      else setState('playing');
      return state;
    },
    simPaused() {
      return false;
    },
    inputBlocked() {
      return screens.isBlocking();
    },
    update() {},
    // confirm({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
    //           danger = false, defaultFocus = 'cancel', timeoutMs = 0,
    //           timeoutResult = false }) -> Promise<boolean>
    // M1 implements it as the 'confirm' dialog screen (z-band 1200). ARCH
    // stub: without that screen nothing is confirmed (resolves false), so no
    // destructive action can slip through before M1 lands.
    // The 'confirm' screen receives params.resolve(bool) and must call it
    // exactly once (confirm, cancel, back, timeout) before popping itself.
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
          console.warn('[app] confirm() before the confirm screen exists — treated as Cancel', opts.title);
          once(false);
        }
      });
    },
    // toast(text, { tone = 'info'|'good'|'warn'|'error', ms = 2600 }) — M1
    // renders it (z-band 1300). ARCH stub logs it.
    toast(text, opts = {}) {
      console.info(`[toast:${opts.tone || 'info'}] ${text}`);
    },
    // Debug surface (window.__echoes.app) — M1 extends per PLAN §6.
    debug: {
      get state() {
        return state;
      },
      get overlay() {
        return screens.top();
      },
      stack: () => screens.stack(),
      open: (id, p) => screens.push(id, p),
      back: () => screens.nav('back', 'api'),
      press: (action) => screens.nav(action, 'api'),
      focus: () => screens.focused(),
      responses: () => [],
      frameStats: () => (ctx && ctx.scheduler ? ctx.scheduler.stats() : null),
    },
  };
  provide('app', app);
  return app;
}
