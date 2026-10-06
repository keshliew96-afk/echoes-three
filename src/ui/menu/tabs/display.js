// Settings ▸ Display (docs/gauntlet/PLAN.md §5 — binding UI copy). Owner: M1.
//
// Every row applies LIVE to the renderer / frame loop (src/app/display.js) and
// prints what it measurably did:
//   Resolution scale 50–150 %  -> drawing buffer (readout "1200 × 675 (75%)")
//   Display mode               -> Fullscreen API (session-only, honest notes)
//   V-Sync                     -> scheduler source raf | uncapped (measured fps)
//   Frame-rate limit           -> measured rendered fps + the display-cap note
//   Show FPS counter           -> the fps meter
// plus the always-on measured line "Display ~161 Hz · rendering 160 fps ·
// frame work 2.1 ms".
// Keep/Revert (PLAN §5): a resolution-scale change or ENTERING fullscreen made
// on this visit of the tab arms the 10 s keep-display dialog, opened by the
// settings screen when the player leaves the tab or closes Settings. Leaving
// fullscreen applies at once and disarms (re-entering from a timeout would
// need a gesture the timer does not have). V-Sync and the limit never prompt.
import { t } from '../../../i18n/index.js';

const LIMITS = [30, 60, 120, 144, 0];

// Looked up when the tab is built (after boot picks the language).
const helpText = () => ({
  scale: t('Renders the 3D scene at a fraction or multiple of your window’s pixels. The menus and HUD are drawn separately and stay sharp at every scale.\nBelow 100%: sharper UI, softer 3D, faster.\nAbove 100%: supersampled — slower.'),
  mode: t('Windowed keeps the browser tab as it is. Fullscreen (browser) fills your screen with the game.\nFullscreen lasts for this visit — browsers leave it when the page reloads.\nPress Enter or click to switch — browsers don’t let a gamepad button switch to fullscreen.'),
  vsyncOn: t('On: one frame per display refresh — smooth, no wasted work.'),
  vsyncOff: t("Off: Renders uncapped. Browsers always show frames at your display's refresh and never tear, so extra frames are not displayed; this can lower input latency slightly and raises power use."),
  limit: t('Caps how many frames the game renders per second. The game simulation always runs at 60 steps per second, whatever this is set to.'),
  fps: t('Shows the rendered frames per second in the bottom-right corner.'),
});

export function buildDisplayTab(ctx) {
  const { settings, widgets, app } = ctx;
  const HELP = helpText();
  const el = document.createElement('div');
  el.className = 'ap-tabcontent ap-display';
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.gap = 'calc(10px * var(--ap-s, 1))';

  const display = () => app.display;
  const stats = () => (app.scheduler ? app.scheduler.stats() : null);
  const fmtHz = (n) => (n > 0 ? String(Math.round(n)) : '…');

  // ------------------------------------------------------ keep / revert --
  let baseline = { scale: settings.get('display.renderScale'), fullscreen: false };
  let armed = { scale: false, fullscreen: false };
  const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

  const scale = widgets.slider({
    id: 'ap-display-renderScale',
    label: t('Resolution scale'),
    min: 50,
    max: 150,
    step: 5,
    value: Math.round(settings.get('display.renderScale') * 100),
    format: (v) => `${Math.round(v)}%`,
    help: HELP.scale,
    onInput: (v) => {
      settings.set('display.renderScale', v / 100, { source: 'ui' });
      armed.scale = Math.abs(settings.get('display.renderScale') - baseline.scale) > 1e-6;
      paint();
    },
    onChange: (v) => {
      settings.set('display.renderScale', v / 100, { source: 'ui' });
      armed.scale = Math.abs(settings.get('display.renderScale') - baseline.scale) > 1e-6;
      paint();
    },
  });

  // The Display-mode chip shows the REAL state — document.fullscreenElement —
  // never the requested one (PLAN §3.3 "a live mirror"; benchmark S2). A
  // press asks the browser; the chip moves when fullscreenchange says it took
  // and stays put when the request is refused (a gamepad press, a blocked
  // request), so no frame ever shows a mode the game is not in (fix-M1-r6,
  // MENU-R6-F1).
  const syncMode = () => {
    if (mode.get() !== isFs()) mode.set(isFs());
  };
  const mode = widgets.select({
    id: 'ap-display-mode',
    label: t('Display mode'),
    options: [
      { value: false, label: t('Windowed') },
      { value: true, label: t('Fullscreen (browser)') },
    ],
    value: isFs(),
    help: HELP.mode,
    onChange: (v) => {
      // Inside the keydown / click that changed it: the Fullscreen API's user
      // gesture requirement is met synchronously by display.js. The request
      // is made against the real state (the chip always shows it), so the
      // first Enter / click / arrow always switches.
      const want = !!v;
      if (want !== isFs() && settings.get('display.fullscreen') === want) {
        // The store already holds this request (one still in flight, or a
        // mirror that has not caught up): ask again from this gesture.
        settings.set('display.fullscreen', !want, { source: 'system' });
      }
      settings.set('display.fullscreen', want, { source: 'ui' });
      // Entering arms Keep/Revert (it only counts while fullscreen actually
      // took: hasPendingChanges() checks document.fullscreenElement, so a
      // refused request never prompts); leaving applies at once, no dialog.
      armed.fullscreen = want && !baseline.fullscreen;
      syncMode();
      paint();
    },
  });

  const vsync = widgets.toggle({
    id: 'ap-display-vsync',
    label: t('V-Sync'),
    value: settings.get('display.vsync'),
    help: `${HELP.vsyncOn}\n${HELP.vsyncOff}`,
    onChange: (v) => {
      settings.set('display.vsync', !!v, { source: 'ui' });
      paint();
    },
  });

  const limit = widgets.select({
    id: 'ap-display-frameLimit',
    label: t('Frame-rate limit'),
    options: LIMITS.map((n) => ({ value: n, label: n === 0 ? t('Unlimited') : t('{n} fps', { n }) })),
    value: settings.get('display.frameLimit'),
    help: HELP.limit,
    onChange: (v) => {
      settings.set('display.frameLimit', v, { source: 'ui' });
      paint();
    },
  });

  const fps = widgets.toggle({
    id: 'ap-display-showFps',
    label: t('Show FPS counter'),
    value: settings.get('display.showFps'),
    help: HELP.fps,
    onChange: (v) => {
      settings.set('display.showFps', !!v, { source: 'ui' });
      paint();
    },
  });

  const measured = document.createElement('div');
  measured.className = 'ap-measured';
  measured.id = 'ap-display-measured';

  el.append(scale.el, mode.el, vsync.el, limit.el, fps.el, measured);

  // ------------------------------------------------------------- notes --
  function bufferText() {
    const d = display();
    const st = d ? d.state() : null;
    if (!st || !st.drawingBuffer) return '';
    return `${st.drawingBuffer.w} × ${st.drawingBuffer.h}`;
  }

  function scaleNote() {
    const s = settings.get('display.renderScale');
    const pct = Math.round(s * 100);
    const d = display();
    const st = d ? d.state() : null;
    const vars = { size: bufferText(), pct };
    let out =
      s < 0.999
        ? t('Render resolution {size} ({pct}%) · sharper UI, softer 3D, faster', vars)
        : s > 1.001
          ? t('Render resolution {size} ({pct}%) · supersampled — slower', vars)
          : t('Render resolution {size} ({pct}%) · native', vars);
    if (st && st.clamped) out += ` · ${t('limited to {w} × {h}', { w: st.maxBuffer.w, h: st.maxBuffer.h })}`;
    return out;
  }

  function modeNote() {
    const d = display();
    if (d && !d.fullscreenSupported()) return t("This browser doesn't allow fullscreen here");
    const parts = [];
    if (d && d.browserFullscreen()) parts.push(t('Browser fullscreen (F11) is on — press F11 to leave'));
    else if (isFs() && d && d.keyboardLock) parts.push(t('Hold Esc to leave fullscreen'));
    else if (!isFs() && settings.get('display.fullscreen')) parts.push(t('Switching to fullscreen…'));
    // A gamepad button can LEAVE fullscreen (no gesture needed) but not enter it.
    if (!isFs() && app.nav && app.nav.lastSource === 'gamepad') parts.push(t("Press Enter or click — browsers don't let a gamepad button switch to fullscreen"));
    parts.push(t('Fullscreen lasts for this visit — browsers leave it when the page reloads.'));
    return parts.join(' · ');
  }

  // The display's own refresh (the scheduler's vsync-period estimate; rafHz
  // itself falls to the render rate when frames are slower than a refresh).
  const hz = (st) => st.displayHz || st.rafHz;
  // GPU/CPU-bound (PLAN §5): a frame costs >= 80% of a refresh, so uncapped
  // cannot render meaningfully faster than the display.
  function gpuBound(st) {
    if (!st || st.vsync || !(hz(st) > 0)) return false;
    return st.workMsP50 >= 0.8 * (1000 / hz(st));
  }

  function vsyncNote() {
    const st = stats();
    if (!st) return '';
    if (st.vsync) return t('Frames paced to your display (~{hz} Hz)', { hz: fmtHz(hz(st)) });
    if (st.samples < 20) return t('Renders uncapped — measuring…');
    if (gpuBound(st)) return t("Your device renders about {fps} fps here — uncapped can't go faster than your GPU", { fps: Math.round(st.renderedFps) });
    // PLAN §5 binding copy, always on the row (not only in the info panel).
    return t("Renders uncapped. Browsers always show frames at your display's refresh and never tear, so extra frames are not displayed; this can lower input latency slightly and raises power use.");
  }

  function limitNote() {
    const st = stats();
    if (!st) return '';
    if (st.samples < 20) return t('Rendering … fps (measuring)');
    const lim = st.limit;
    const fps = Math.round(st.renderedFps);
    const cap = hz(st);
    if (st.vsync && cap > 0 && (lim === 0 || lim > cap * 1.02)) return t('Rendering {fps} fps · Your display caps this at ~{cap} fps', { fps, cap: Math.round(cap) });
    if (lim > 0 && st.renderedFps < lim * 0.93) return t('Rendering {fps} fps · your device renders about {fps} fps here, below the limit', { fps });
    return t('Rendering {fps} fps', { fps });
  }

  function fpsNote() {
    if (app.fpsForced) return t('Always shown for this page address (?fps / ?debug / a harness boot)');
    return '';
  }

  function measuredText() {
    const st = stats();
    if (!st) return '';
    return t('Display ~{hz} Hz · rendering {fps} fps · frame work {ms} ms', { hz: fmtHz(hz(st)), fps: st.samples < 20 ? '…' : Math.round(st.renderedFps), ms: st.workMsP50.toFixed(1) });
  }

  function paint() {
    syncMode();
    scale.setNote(scaleNote());
    mode.setNote(modeNote());
    vsync.setNote(vsyncNote());
    limit.setNote(limitNote());
    fps.setNote(fpsNote());
    measured.textContent = measuredText();
    const d = display();
    const supported = !d || d.fullscreenSupported();
    mode.setDisabled(!supported, t("This browser doesn't allow fullscreen here"));
  }

  // Live mirror of the store (the fullscreen mirror flips on Esc / F11 /
  // a refused request; another source may reset the tab).
  const offs = [];
  offs.push(
    settings.subscribe('display', (v, path, prev, source) => {
      if (path === 'display.renderScale') scale.set(Math.round(v * 100));
      else if (path === 'display.fullscreen') {
        syncMode(); // the real state, whatever the store event says
        if (source === 'system') {
          if (v && !baseline.fullscreen && visible) armed.fullscreen = true; // entered on this visit
          if (!v) armed.fullscreen = false;
        }
      } else if (path === 'display.vsync') vsync.set(!!v);
      else if (path === 'display.frameLimit') limit.set(v);
      else if (path === 'display.showFps') fps.set(!!v);
      if (source === 'reset' || source === 'revert') armed.scale = false;
      paint();
    })
  );

  // The chip follows the browser the moment fullscreen takes or ends, even
  // when the store already held the value (a request made from this tab).
  const onFsChange = () => paint();
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  offs.push(() => {
    document.removeEventListener('fullscreenchange', onFsChange);
    document.removeEventListener('webkitfullscreenchange', onFsChange);
  });

  let visible = false;
  let timer = 0;

  function describe() {
    const out = [];
    if (armed.scale) out.push(t('Resolution scale {pct}% — render resolution {size}', { pct: Math.round(settings.get('display.renderScale') * 100), size: bufferText() }));
    if (armed.fullscreen && isFs()) out.push(t('Fullscreen'));
    return out;
  }

  return {
    el,
    onShow() {
      visible = true;
      baseline = { scale: settings.get('display.renderScale'), fullscreen: isFs() };
      armed = { scale: false, fullscreen: false };
      scale.set(Math.round(settings.get('display.renderScale') * 100));
      mode.set(isFs());
      vsync.set(settings.get('display.vsync'));
      limit.set(settings.get('display.frameLimit'));
      fps.set(settings.get('display.showFps'));
      paint();
      clearInterval(timer);
      timer = setInterval(paint, 250);
    },
    onHide() {
      visible = false;
      clearInterval(timer);
      timer = 0;
    },
    hasPendingChanges: () => armed.scale || (armed.fullscreen && isFs()),
    pendingDescription: describe,
    // Keep: the new values become the baseline.
    confirm() {
      baseline = { scale: settings.get('display.renderScale'), fullscreen: isFs() };
      armed = { scale: false, fullscreen: false };
      paint();
    },
    // Revert / timeout: restore the setting AND its observable effect.
    revert() {
      if (armed.scale) settings.set('display.renderScale', baseline.scale, { source: 'revert' });
      if (armed.fullscreen && isFs()) settings.set('display.fullscreen', false, { source: 'revert' });
      armed = { scale: false, fullscreen: false };
      paint();
    },
    reset() {
      settings.reset('display');
      armed = { scale: false, fullscreen: false };
      baseline = { scale: settings.get('display.renderScale'), fullscreen: isFs() };
      paint();
    },
    // Live numbers for the info panel (the focused row).
    info(node) {
      const st = stats();
      if (!st) return '';
      const id = node && node.id;
      if (id === 'ap-display-vsync') {
        const lines = [st.vsync ? HELP.vsyncOn : HELP.vsyncOff, measuredText()];
        if (!st.vsync && gpuBound(st)) lines.push(t("Your device renders about {fps} fps here — uncapped can't go faster than your GPU", { fps: Math.round(st.renderedFps) }));
        return lines.join('\n');
      }
      if (id === 'ap-display-frameLimit') return `${limitNote()}\n${measuredText()}`;
      if (id === 'ap-display-renderScale') return scaleNote();
      if (id === 'ap-display-mode') return modeNote();
      return measuredText();
    },
    destroy() {
      for (const off of offs) off();
      clearInterval(timer);
    },
  };
}
