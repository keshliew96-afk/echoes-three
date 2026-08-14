// Debug chrome: version label bottom-left (Magicraft reference, TESTING.md)
// and an fps meter top-right. Charcoal plates + parchment ink per HUD grammar;
// the full HUD system arrives with the HUD block.
import { PALETTE } from '../data/palette.js';

export function createDebugOverlay(version) {
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

  let lastShown = -1;
  return {
    setFps(fps) {
      const rounded = Math.round(fps);
      if (rounded !== lastShown) {
        lastShown = rounded;
        fpsEl.textContent = `${rounded} fps`;
      }
    },
  };
}
