// Pooled DOM damage numerals (§17 Zone 3, ruling A7): world->screen projected
// divs that rise and fade. Grammar (binding):
//   outgoing damage  = Parchment, rise-and-fade, scale with magnitude
//   incoming (party) = Bruise Umber with Parchment outline, drops w/ lateral shake
//   heals            = Bright Heal, rising, "+HP" glyph
// 2 px contrast outline, no plate; tabular numerals; numeral floor 20 px.
// Cap 12 simultaneous — when the cap is reached the OLDEST fades early (it is
// recycled immediately for the newcomer, so the on-screen count can never
// exceed 12 even under cmd-driven spam). Pool never shrinks; nodes are reused.
import { Vector3 } from 'three';
import { DAMAGE_NUMBERS } from '../core/constants.js';
import { PALETTE } from '../data/palette.js';

const OUTLINE_W = 2; // px (§17: 2 px contrast outline)

function outlineShadow(color) {
  const w = OUTLINE_W;
  const d = Math.round(w * 0.7071 * 10) / 10;
  return [
    `${w}px 0 0 ${color}`,
    `-${w}px 0 0 ${color}`,
    `0 ${w}px 0 ${color}`,
    `0 -${w}px 0 ${color}`,
    `${d}px ${d}px 0 ${color}`,
    `-${d}px ${d}px 0 ${color}`,
    `${d}px -${d}px 0 ${color}`,
    `-${d}px -${d}px 0 ${color}`,
  ].join(', ');
}

// kind -> { color, outline, prefix, rises }
const KINDS = {
  damage: { color: PALETTE.parchment, outline: PALETTE.voidCharcoal, prefix: '', rises: true },
  heal: { color: PALETTE.brightHeal, outline: PALETTE.voidCharcoal, prefix: '+', rises: true },
  incoming: { color: PALETTE.bruiseUmber, outline: PALETTE.parchment, prefix: '', rises: false },
};

export function createNumberPool({ camera, cosmetic, container = document.body }) {
  if (!document.getElementById('dmg-num-style')) {
    const style = document.createElement('style');
    style.id = 'dmg-num-style';
    style.textContent = `
      #dmg-num-layer {
        position: fixed;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
        z-index: 9;
      }
      .dmg-num {
        position: absolute;
        left: 0;
        top: 0;
        font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        line-height: 1;
        white-space: nowrap;
        will-change: transform, opacity;
        visibility: hidden;
      }
    `;
    document.head.appendChild(style);
  }
  const layer = document.createElement('div');
  layer.id = 'dmg-num-layer';
  container.appendChild(layer);

  const active = []; // oldest first: { el, x, z, age, jx, kind, crit }
  const pool = [];
  const v = new Vector3();

  function acquire() {
    let el = pool.pop();
    if (!el) {
      el = document.createElement('div');
      el.className = 'dmg-num';
      layer.appendChild(el);
    }
    return el;
  }

  function release(rec) {
    const i = active.indexOf(rec);
    if (i >= 0) active.splice(i, 1);
    rec.el.style.visibility = 'hidden';
    pool.push(rec.el);
  }

  // spawn({ x, z, amount, kind: 'damage'|'heal'|'incoming', crit })
  function spawn({ x, z, amount, kind = 'damage', crit = false }) {
    if (active.length >= DAMAGE_NUMBERS.cap) release(active[0]); // oldest fades early (§1)
    const k = KINDS[kind] ?? KINDS.damage;
    const el = acquire();
    // Scale with magnitude (§17); crits render visibly larger.
    let px = DAMAGE_NUMBERS.minPx + Math.abs(amount) * DAMAGE_NUMBERS.pxPerPoint;
    if (crit) px *= DAMAGE_NUMBERS.critScale;
    // Whole points print whole; a fractional instance keeps ONE decimal so a
    // pinned value like the Siphon drain (5.5) is not rounded into a lie.
    const shown = Math.round(amount * 10) / 10;
    el.textContent = `${k.prefix}${Number.isInteger(shown) ? shown : shown.toFixed(1)}`;
    el.style.fontSize = `${Math.round(px)}px`;
    el.style.color = k.color;
    el.style.textShadow = outlineShadow(k.outline);
    el.style.visibility = 'visible';
    active.push({
      el,
      x,
      z,
      age: 0,
      jx: cosmetic.range(-16, 16), // px lateral spread so stacked hits fan out
      rises: k.rises,
      crit,
    });
  }

  function update(dt) {
    if (active.length === 0) return;
    camera.updateMatrixWorld(); // camera moved this frame; project fresh
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = active.length - 1; i >= 0; i--) {
      const rec = active[i];
      rec.age += dt;
      const t = rec.age / DAMAGE_NUMBERS.lifeSec;
      if (t >= 1) {
        release(rec);
        continue;
      }
      const ease = 1 - (1 - t) * (1 - t); // easeOutQuad — fast rise, settle
      const dy = DAMAGE_NUMBERS.riseU * ease * (rec.rises ? 1 : -1);
      v.set(rec.x, DAMAGE_NUMBERS.baseY + dy, rec.z).project(camera);
      if (v.z > 1) {
        rec.el.style.opacity = '0';
        continue;
      }
      const sx = (v.x * 0.5 + 0.5) * w + rec.jx;
      const sy = (0.5 - v.y * 0.5) * h;
      // 120 ms pop-in overshoot settling to 1, stronger on crits.
      const popT = Math.min(1, rec.age / 0.12);
      const over = rec.crit ? 0.55 : 0.3;
      const scale = 1 + over * (1 - popT);
      rec.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -100%) scale(${scale.toFixed(3)})`;
      rec.el.style.opacity = t < 0.55 ? '1' : `${(1 - (t - 0.55) / 0.45).toFixed(3)}`;
    }
  }

  return { spawn, update, count: () => active.length };
}
