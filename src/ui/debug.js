// Debug chrome: version label bottom-left (Magicraft reference, TESTING.md),
// fps meter bottom-right, and — with ?debug=1 — a sim panel top-left showing
// tick / entity count / RNG draw index / seed, updated every render frame so
// captures can watch the 60 Hz sim advance while render fps varies. Charcoal
// plates + parchment ink per HUD grammar; the full HUD arrives with its block.
//
// Gauntlet (M1): the fps meter is a player setting (display.showFps) — the app
// shell calls setFpsVisible(); ?fps=1 / ?debug=1 and the menu-skip harness boots
// keep it on (PLAN §3.2, decision D4 in docs/gauntlet/build-M1.md).
import { PALETTE } from '../data/palette.js';

export function createDebugOverlay(version, { debug = false, providers = null } = {}) {
  const baseStyle = `
    position: fixed;
    z-index: 10;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    font-variant-numeric: tabular-nums;
    color: ${PALETTE.parchment};
    background: ${PALETTE.voidCharcoal}CC;
    border-radius: 6px;
    padding: 3px 8px;
    pointer-events: none;
    user-select: none;
  `;

  const versionEl = document.createElement('div');
  versionEl.id = 'version-label';
  versionEl.style.cssText = `${baseStyle} left: 10px; bottom: 8px; font-size: 12px; opacity: 0.85;`;
  versionEl.textContent = `v${version}`;
  document.body.appendChild(versionEl);

  const fpsEl = document.createElement('div');
  fpsEl.id = 'fps-meter';
  // Bottom-right, mirroring the version label: the top-right corner belongs
  // to the HUD's Glint counter (Reference D currency chrome).
  fpsEl.style.cssText = `${baseStyle} right: 10px; bottom: 8px; font-size: 13px;`;
  fpsEl.textContent = '-- fps';
  document.body.appendChild(fpsEl);
  let fpsVisible = true;

  let panelEl = null;
  if (debug && providers) {
    panelEl = document.createElement('div');
    panelEl.id = 'debug-overlay';
    panelEl.style.cssText = `${baseStyle} left: 10px; top: 8px; font-size: 15px; line-height: 1.35; white-space: pre;`;
    document.body.appendChild(panelEl);
  }

  let lastShownFps = -1;
  let lastPanelText = '';
  return {
    setFps(fps) {
      if (!fpsVisible) return;
      const rounded = Math.round(fps);
      if (rounded !== lastShownFps) {
        lastShownFps = rounded;
        fpsEl.textContent = `${rounded} fps`;
      }
    },
    // display.showFps (M1): hidden = display:none, so it is gone from both
    // the frame and the layout audits.
    setFpsVisible(on) {
      fpsVisible = !!on;
      fpsEl.style.display = fpsVisible ? '' : 'none';
      if (fpsVisible) lastShownFps = -1;
    },
    get fpsVisible() {
      return fpsVisible;
    },
    // Called once per render frame; cheap (textContent only on change).
    update() {
      if (!panelEl) return;
      const text =
        `tick  ${providers.tick()}\n` +
        `ents  ${providers.entities()}\n` +
        `draws ${providers.draws()}\n` +
        `seed  ${providers.seed}`;
      if (text !== lastPanelText) {
        lastPanelText = text;
        panelEl.textContent = text;
      }
    },
  };
}
