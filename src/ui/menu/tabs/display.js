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
const LIMITS = [30, 60, 120, 144, 0];

const HELP = {
  scale:
    'Renders the 3D scene at a fraction or multiple of your window’s pixels. The menus and HUD are drawn separately and stay sharp at every scale.\nBelow 100%: sharper UI, softer 3D, faster.\nAbove 100%: supersampled — slower.',
  mode:
    'Windowed keeps the browser tab as it is. Fullscreen (browser) fills your screen with the game.\nFullscreen lasts for this visit — browsers leave it when the page reloads.\nPress Enter or click to switch — browsers don’t let a gamepad button switch to fullscreen.',
  vsyncOn: 'On: one frame per display refresh — smooth, no wasted work.',
  vsyncOff:
    "Off: Renders uncapped. Browsers always show frames at your display's refresh and never tear, so extra frames are not displayed; this can lower input latency slightly and raises power use.",
  limit:
    'Caps how many frames the game renders per second. The game simulation always runs at 60 steps per second, whatever this is set to.',
  fps: 'Shows the rendered frames per second in the bottom-right corner.',
};

export function buildDisplayTab(ctx) {
  const { settings, widgets, app } = ctx;
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
  const isFs = () => !!document.fullscreenElement;

  const scale = widgets.slider({
    id: 'ap-display-renderScale',
    label: 'Resolution scale',
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

  const mode = widgets.select({
    id: 'ap-display-mode',
    label: 'Display mode',
    options: [
      { value: false, label: 'Windowed' },
      { value: true, label: 'Fullscreen (browser)' },
    ],
    value: isFs(),
    help: HELP.mode,
    onChange: (v) => {
      // Inside the keydown / click that changed it: the Fullscreen API's user
      // gesture requirement is met synchronously by display.js.
      settings.set('display.fullscreen', !!v, { source: 'ui' });
      // Entering arms Keep/Revert (it only counts while fullscreen actually
      // took: hasPendingChanges() checks document.fullscreenElement, so a
      // refused request never prompts); leaving applies at once, no dialog.
      armed.fullscreen = !!v && !baseline.fullscreen;
      paint();
    },
  });

  const vsync = widgets.toggle({
    id: 'ap-display-vsync',
    label: 'V-Sync',
    value: settings.get('display.vsync'),
    help: `${HELP.vsyncOn}\n${HELP.vsyncOff}`,
    onChange: (v) => {
      settings.set('display.vsync', !!v, { source: 'ui' });
      paint();
    },
  });

  const limit = widgets.select({
    id: 'ap-display-frameLimit',
    label: 'Frame-rate limit',
    options: LIMITS.map((n) => ({ value: n, label: n === 0 ? 'Unlimited' : `${n} fps` })),
    value: settings.get('display.frameLimit'),
    help: HELP.limit,
    onChange: (v) => {
      settings.set('display.frameLimit', v, { source: 'ui' });
      paint();
    },
  });

  const fps = widgets.toggle({
    id: 'ap-display-showFps',
    label: 'Show FPS counter',
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
    const tone = s < 0.999 ? 'sharper UI, softer 3D, faster' : s > 1.001 ? 'supersampled — slower' : 'native';
    let t = `Render resolution ${bufferText()} (${pct}%) · ${tone}`;
    if (st && st.clamped) t += ` · limited to ${st.maxBuffer.w} × ${st.maxBuffer.h}`;
    return t;
  }

  function modeNote() {
    const d = display();
    if (d && !d.fullscreenSupported()) return "This browser doesn't allow fullscreen here";
    const parts = [];
    if (d && d.browserFullscreen()) parts.push('Browser fullscreen (F11) is on — press F11 to leave');
    else if (isFs() && d && d.keyboardLock) parts.push('Hold Esc to leave fullscreen');
    if (app.nav && app.nav.lastSource === 'gamepad') parts.push("Press Enter or click — browsers don't let a gamepad button switch to fullscreen");
    parts.push('Fullscreen lasts for this visit — browsers leave it when the page reloads.');
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
    if (st.vsync) return `Frames paced to your display (~${fmtHz(hz(st))} Hz)`;
    if (st.samples < 20) return 'Renders uncapped — measuring…';
    if (gpuBound(st)) return `Your device renders about ${Math.round(st.renderedFps)} fps here — uncapped can't go faster than your GPU`;
    // PLAN §5 binding copy, always on the row (not only in the info panel).
    return "Renders uncapped. Browsers always show frames at your display's refresh and never tear, so extra frames are not displayed; this can lower input latency slightly and raises power use.";
  }

  function limitNote() {
    const st = stats();
    if (!st) return '';
    if (st.samples < 20) return 'Rendering … fps (measuring)';
    const lim = st.limit;
    let t = `Rendering ${Math.round(st.renderedFps)} fps`;
    const cap = hz(st);
    if (st.vsync && cap > 0 && (lim === 0 || lim > cap * 1.02)) t += ` · Your display caps this at ~${Math.round(cap)} fps`;
    else if (lim > 0 && st.renderedFps < lim * 0.93) t += ` · your device renders about ${Math.round(st.renderedFps)} fps here, below the limit`;
    return t;
  }

  function fpsNote() {
    if (app.fpsForced) return 'Always shown for this page address (?fps / ?debug / a harness boot)';
    return '';
  }

  function measuredText() {
    const st = stats();
    if (!st) return '';
    return `Display ~${fmtHz(hz(st))} Hz · rendering ${st.samples < 20 ? '…' : Math.round(st.renderedFps)} fps · frame work ${st.workMsP50.toFixed(1)} ms`;
  }

  function paint() {
    scale.setNote(scaleNote());
    mode.setNote(modeNote());
    vsync.setNote(vsyncNote());
    limit.setNote(limitNote());
    fps.setNote(fpsNote());
    measured.textContent = measuredText();
    const d = display();
    const supported = !d || d.fullscreenSupported();
    mode.setDisabled(!supported, "This browser doesn't allow fullscreen here");
  }

  // Live mirror of the store (the fullscreen mirror flips on Esc / F11 /
  // a refused request; another source may reset the tab).
  const offs = [];
  offs.push(
    settings.subscribe('display', (v, path, prev, source) => {
      if (path === 'display.renderScale') scale.set(Math.round(v * 100));
      else if (path === 'display.fullscreen') {
        mode.set(!!v);
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

  let visible = false;
  let timer = 0;

  function describe() {
    const out = [];
    if (armed.scale) out.push(`Resolution scale ${Math.round(settings.get('display.renderScale') * 100)}% — render resolution ${bufferText()}`);
    if (armed.fullscreen && isFs()) out.push('Fullscreen');
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
        if (!st.vsync && gpuBound(st)) lines.push(`Your device renders about ${Math.round(st.renderedFps)} fps here — uncapped can't go faster than your GPU`);
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
