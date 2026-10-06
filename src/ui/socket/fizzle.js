// Siphon fizzle cue (§15.3 / §17 Zone 3): when a Siphon'd heal finds no enemy
// within 2.0 u of the healed ally, a momentary "nobody near" tag pops at the
// ally. §17 combat-text rules: opaque charcoal plate, ≥16 px, tabular grammar
// family; Bone ink (neutral — a fizzle is not damage, heal, or danger, so it
// takes none of the reserved accents). World→screen projected DOM, pooled.
import { Vector3 } from 'three';
import { PALETTE } from '../../data/palette.js';
import { t } from '../../i18n/index.js';

const LIFE_SEC = 0.9;
const RISE_U = 0.22;
// The §17 heal numerals rise OUT of DAMAGE_NUMBERS.baseY 1.15; this plate hangs
// top-anchored just under the ally's feet (0.16 u, drifting to 0.38) with a
// small lateral bias, so the two Zone-3 cues from one heal never stack.
const BASE_Y = 0.16;
const LATERAL_PX = -30;
const CAP = 4;

export function createSiphonFizzleCue({ bus, camera, container = document.body }) {
  if (!document.getElementById('nd-fizzle-style')) {
    const style = document.createElement('style');
    style.id = 'nd-fizzle-style';
    style.textContent = `
      #nd-fizzle-layer {
        position: fixed; inset: 0; overflow: hidden;
        pointer-events: none; z-index: 9;
      }
      .nd-fizzle {
        position: absolute; left: 0; top: 0;
        font-family: system-ui, -apple-system, 'Segoe UI', var(--i18n-font, sans-serif);
        font-size: 16px; font-weight: 700; letter-spacing: 0.04em;
        color: ${PALETTE.bone};
        background: ${PALETTE.voidCharcoal};
        border: 1px solid ${PALETTE.warmGrey}77;
        border-radius: 7px; padding: 2px 8px;
        white-space: nowrap; will-change: transform, opacity;
        visibility: hidden;
      }
    `;
    document.head.appendChild(style);
  }
  const layer = document.createElement('div');
  layer.id = 'nd-fizzle-layer';
  container.appendChild(layer);

  const active = []; // { el, x, z, age }
  const pool = [];
  const v = new Vector3();

  bus.on('siphon_fizzle', (ev) => {
    if (active.length >= CAP) {
      const oldest = active.shift();
      oldest.el.style.visibility = 'hidden';
      pool.push(oldest.el);
    }
    let el = pool.pop();
    if (!el) {
      el = document.createElement('div');
      el.className = 'nd-fizzle';
      el.textContent = t('nobody near');
      layer.appendChild(el);
    }
    el.style.visibility = 'visible';
    active.push({ el, x: ev.x, z: ev.z, age: 0 });
  });

  let lastT = null;
  function update(tSec) {
    const dt = lastT === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - lastT));
    lastT = tSec;
    if (active.length === 0) return;
    camera.updateMatrixWorld();
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = active.length - 1; i >= 0; i--) {
      const rec = active[i];
      rec.age += dt;
      const t = rec.age / LIFE_SEC;
      if (t >= 1) {
        rec.el.style.visibility = 'hidden';
        pool.push(rec.el);
        active.splice(i, 1);
        continue;
      }
      const ease = 1 - (1 - t) * (1 - t);
      v.set(rec.x, BASE_Y + RISE_U * ease, rec.z).project(camera);
      if (v.z > 1) {
        rec.el.style.opacity = '0';
        continue;
      }
      const sx = (v.x * 0.5 + 0.5) * w + LATERAL_PX;
      const sy = (0.5 - v.y * 0.5) * h;
      rec.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, 0%)`;
      rec.el.style.opacity = t < 0.55 ? '1' : `${(1 - (t - 0.55) / 0.45).toFixed(3)}`;
    }
  }

  return { update, count: () => active.length };
}
