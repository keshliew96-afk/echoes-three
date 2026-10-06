// Display service (docs/gauntlet/PLAN.md §3.3 + §5 platform-honest display
// settings). Owner: M1. provide('display', ...).
//
// The settings store is the single source of truth; this service subscribes to
// the display.* keys and applies each one to the live renderer / scheduler:
//   display.renderScale -> stage.setRenderScale(s): renderer pixel ratio =
//                          min(dpr, 2) x s (drawing buffer clamped to 3840x2160),
//                          composer + bloom resized; DOM HUD/menus untouched
//   display.vsync       -> scheduler source 'raf' (paced to the display) or
//                          'uncapped' (MessageChannel loop)
//   display.frameLimit  -> scheduler pacing (0 = unlimited); the sim stays 60 Hz
//   display.fullscreen  -> Fullscreen API on <html> — SESSION-ONLY (never
//                          stored: browsers leave fullscreen on every navigation
//                          and entering needs a user gesture). A live mirror of
//                          document.fullscreenElement, synced on fullscreenchange
//                          so Esc / F11 / the browser leaving keeps it truthful.
//   display.showFps     -> the fps meter (src/ui/debug.js)
// Entering fullscreen must run inside a user gesture: the settings UI changes
// the key from its keydown / click handler (settings emits synchronously), and
// Alt+Enter calls toggleFullscreen() from the gate's keydown. Gamepad buttons
// are not user activation: the request is refused and the UI says so.
// Keyboard Lock (Chromium) keeps Esc for the game while fullscreen: a short Esc
// reaches the page, holding Esc leaves fullscreen.
import { t } from '../i18n/index.js';

const MAX_BUFFER = Object.freeze({ w: 3840, h: 2160 });

export function createDisplay({ settings, stage, scheduler, toast, lastSource }) {
  let lastFsChangeAt = -Infinity;
  let keyboardLock = false;
  let refusedAt = -Infinity;
  let lastRefusal = null;
  let pendingScale = null;
  let scaleRaf = 0;
  const log = [];
  const note = (e) => {
    log.push({ t: Math.round(performance.now()), ...e });
    if (log.length > 40) log.shift();
  };

  // --------------------------------------------------------- render scale --
  function applyScaleNow(s) {
    if (!stage || typeof stage.setRenderScale !== 'function') return;
    stage.setRenderScale(s);
    note({ ev: 'renderScale', s, buffer: stage.drawingBufferSize ? stage.drawingBufferSize() : null });
  }
  // Applied synchronously, so the very next rendered frame uses the new
  // buffer. A dragged slider cannot flood this: Chrome delivers continuous
  // pointer input (and so the range's input events) at most once per frame;
  // anything faster (a probe setting it in a loop) is coalesced per frame.
  let lastApplyFrame = -1;
  function applyScale(s) {
    const f = scheduler && typeof scheduler.frames === 'number' ? scheduler.frames : -2;
    if (f !== lastApplyFrame || f < 0) {
      lastApplyFrame = f;
      if (scaleRaf) cancelAnimationFrame(scaleRaf);
      scaleRaf = 0;
      pendingScale = null;
      applyScaleNow(s);
      return;
    }
    pendingScale = s;
    if (scaleRaf) return;
    scaleRaf = requestAnimationFrame(() => {
      scaleRaf = 0;
      const v = pendingScale;
      pendingScale = null;
      if (v !== null) applyScaleNow(v);
    });
  }

  // ------------------------------------------------------------ fullscreen --
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const fsSupported = () =>
    typeof document !== 'undefined' &&
    !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen) &&
    document.fullscreenEnabled !== false;

  function browserFullscreen() {
    if (fsElement()) return false;
    try {
      return Math.abs(window.innerWidth - screen.width) <= 1 && Math.abs(window.innerHeight - screen.height) <= 1;
    } catch {
      return false;
    }
  }

  function refuse(reason, source) {
    refusedAt = performance.now();
    lastRefusal = { reason, source };
    settings.set('display.fullscreen', !!fsElement(), { source: 'system' });
    const msg =
      source === 'gamepad'
        ? t("Press Enter or click — browsers don't let a gamepad button switch to fullscreen")
        : reason === 'unsupported'
          ? t("This browser doesn't allow fullscreen here")
          : t('The browser blocked fullscreen — press Enter or click to try again');
    if (toast) toast(msg, { tone: 'warn', ms: 3600 });
    note({ ev: 'fullscreen_refused', reason, source });
  }

  function enterFullscreen(source) {
    if (fsElement()) return true;
    if (!fsSupported()) {
      refuse('unsupported', source);
      return false;
    }
    if (source === 'gamepad') {
      // A gamepad press is not user activation: the browser would reject the
      // request anyway — say why instead of failing silently.
      refuse('no_gesture', source);
      return false;
    }
    const el = document.documentElement;
    try {
      const req = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen();
      note({ ev: 'fullscreen_request', source });
      // Chromium rejects a request without a user gesture with a TypeError
      // too ("Permissions check failed"): name it 'unsupported' only when the
      // browser really has no fullscreen here.
      if (req && typeof req.catch === 'function') req.catch(() => refuse(fsSupported() ? 'no_gesture' : 'unsupported', source));
      armWatchdog(source);
    } catch {
      refuse('no_gesture', source);
      return false;
    }
    return true;
  }

  // A request that neither enters nor rejects (old WebKit's prefixed API has
  // no promise) must not leave the setting claiming fullscreen: after 2 s
  // without a fullscreenchange the mirror returns to the real state.
  let watchdog = 0;
  function armWatchdog(source) {
    clearTimeout(watchdog);
    const askedAt = performance.now();
    watchdog = setTimeout(() => {
      watchdog = 0;
      if (lastFsChangeAt >= askedAt || fsElement()) return;
      if (settings.get('display.fullscreen')) refuse('no_gesture', source);
    }, 2000);
  }

  function exitFullscreen() {
    if (navigator.keyboard && typeof navigator.keyboard.unlock === 'function') {
      try {
        navigator.keyboard.unlock();
      } catch {
        /* ignore */
      }
    }
    keyboardLock = false;
    if (!fsElement()) return true;
    try {
      const p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      /* already out */
    }
    note({ ev: 'fullscreen_exit' });
    return true;
  }

  function onFullscreenChange() {
    lastFsChangeAt = performance.now();
    const on = !!fsElement();
    settings.set('display.fullscreen', on, { source: 'system' });
    note({ ev: 'fullscreenchange', on });
    if (on && navigator.keyboard && typeof navigator.keyboard.lock === 'function') {
      navigator.keyboard
        .lock(['Escape'])
        .then(() => {
          keyboardLock = !!fsElement();
        })
        .catch(() => {
          keyboardLock = false;
        });
    } else if (!on) {
      keyboardLock = false;
    }
    if (stage) stage.resize();
  }
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  // ------------------------------------------------------- subscriptions --
  settings.subscribe('display.renderScale', (v) => applyScale(v));
  const pacing = () => {
    if (scheduler) scheduler.configure({ vsync: settings.get('display.vsync'), limit: settings.get('display.frameLimit') });
  };
  settings.subscribe('display.vsync', pacing);
  settings.subscribe('display.frameLimit', pacing);
  settings.subscribe('display.fullscreen', (v, path, prev, source) => {
    if (source === 'system') return; // the mirror itself
    const src = source === 'ui' ? (lastSource ? lastSource() : 'keyboard') : source;
    if (v) enterFullscreen(src);
    else exitFullscreen();
  });

  // Applied once at attach, before the first rendered frame: persisted scale
  // and pacing; fullscreen is session-only and always starts windowed.
  function init() {
    applyScaleNow(settings.get('display.renderScale'));
    pacing();
    if (settings.get('display.fullscreen') !== !!fsElement()) settings.set('display.fullscreen', !!fsElement(), { source: 'system' });
  }

  function state() {
    const buf = stage && stage.drawingBufferSize ? stage.drawingBufferSize() : null;
    const st = scheduler ? scheduler.stats() : null;
    return {
      renderScale: settings.get('display.renderScale'),
      appliedScale: stage ? stage.renderScale : null,
      drawingBuffer: buf ? { w: buf.w, h: buf.h } : null,
      css: { w: window.innerWidth, h: window.innerHeight },
      canvasCss: buf ? buf.css : null,
      dpr: window.devicePixelRatio || 1,
      pixelRatio: buf ? buf.pixelRatio : null,
      clamped: buf ? !!buf.clamped : false,
      maxBuffer: { ...MAX_BUFFER },
      fullscreen: !!fsElement(),
      fullscreenSetting: settings.get('display.fullscreen'),
      fullscreenSupported: fsSupported(),
      browserFullscreen: browserFullscreen(),
      keyboardLock,
      vsync: settings.get('display.vsync'),
      limit: settings.get('display.frameLimit'),
      source: st ? st.source : null,
      rafHz: st ? st.rafHz : null,
      renderedFps: st ? st.renderedFps : null,
      lastRefusal,
    };
  }

  const api = {
    init,
    setRenderScale: (s) => settings.set('display.renderScale', s, { source: 'api' }),
    setFullscreen: (on, source = 'api') => {
      if (on) return enterFullscreen(source);
      return exitFullscreen();
    },
    toggleFullscreen(source = 'keyboard') {
      if (fsElement()) exitFullscreen();
      else enterFullscreen(source);
    },
    setVsync: (on) => settings.set('display.vsync', !!on, { source: 'api' }),
    setFrameLimit: (n) => settings.set('display.frameLimit', n, { source: 'api' }),
    state,
    browserFullscreen,
    fullscreenSupported: fsSupported,
    recentFullscreenChange: (ms = 150) => performance.now() - lastFsChangeAt < ms,
    recentRefusal: (ms = 4000) => performance.now() - refusedAt < ms,
    get keyboardLock() {
      return keyboardLock;
    },
    debug: {
      state,
      log: () => log.map((e) => ({ ...e })),
    },
  };
  return api;
}
