// Debug chrome: version label bottom-left (Magicraft reference, TESTING.md),
// fps meter top-right, and — with ?debug=1 — a sim panel top-left showing
// tick / entity count / RNG draw index / seed, updated every render frame so
// captures can watch the 60 Hz sim advance while render fps varies. Charcoal
// plates + parchment ink per HUD grammar; the full HUD arrives with its block.
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
  fpsEl.style.cssText = `${baseStyle} right: 10px; top: 8px; font-size: 13px;`;
  fpsEl.textContent = '-- fps';
  document.body.appendChild(fpsEl);

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
      const rounded = Math.round(fps);
      if (rounded !== lastShownFps) {
        lastShownFps = rounded;
        fpsEl.textContent = `${rounded} fps`;
      }
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
