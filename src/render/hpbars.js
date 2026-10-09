// Overhead party health bars (docs/HP_BARS.md). One small bar floats over the
// head of each of the four party seats — the player's own hero and the three
// allies, human or AI, and in co-op every player sees all four. Enemies and
// bosses keep what they had (their own rings / the boss plate).
//
// Grammar (the command bar's portrait HP bar, carried into the world):
//   - charcoal plate + rim, a fill in the hero's identity-ring colour
//   - a hit flashes the fill Parchment-white for a beat and pops the bar a
//     touch, and the lost chunk stays behind as a Parchment "lag" segment that
//     holds, then drains down to the new value, so every hit reads as a size
//   - a heal snaps the lag to the new value and glints the rim Bright Heal
//     (§19.1: Bright Heal is heal output, which this is)
//   - under 25% the rim pulses Void Charcoal <-> Bone like the portrait frame
//   - a downed body hides its bar: the §10 revive ring owns that body
//
// Render-only and DOM: one pooled <div> per seat projected world -> screen
// every frame, exactly like the damage numerals (render/numbers.js). Nothing
// reads or writes the sim, so the golden traces cannot move, and the layer
// adds no geometry, texture or shader to the GPU (the bars cost four
// transforms per frame). The `gameplay.hpBars` setting (ui/run/hpbars.js) is
// read every frame, so a flip applies at once.
import { Vector3 } from 'three';
import { PALETTE } from '../data/palette.js';
import { ACCENTS, CHROME } from '../ui/hud/style.js';
import { classOfSeat } from '../data/lineup.js';

// Seat -> class: the run's party lineup (data/lineup.js; the default is
// Healer, Tank, Swordsman, Archer). A bar re-bands when its seat's class
// changes (a run start or a load), checked each frame.

// World height of the bar's anchor over each rig's feet (measured top of the
// head / hat / helm at the 12 u / 52° gameplay rig, plus a little air).
const HEAD_Y = Object.freeze({ healer: 1.42, tank: 1.5, swordsman: 1.38, archer: 1.42 });
const LIFT_PX = 6; // screen-space air between the anchor and the bar's bottom edge

// Bar size at the 1920x1080 reference; scaled with the window like the HUD.
const BAR_W = 80;
const BAR_H = 10;

const FLASH_S = 0.2; // hit flash fade
const POP_S = 0.16; // hit pop decay
const LAG_HOLD_S = 0.42; // the lost chunk holds this long before it drains
const LAG_RATE = 0.85; // fraction of the bar per second the lag drains
const GLINT_S = 0.45; // heal rim glint
const FADE_RATE = 7; // 1/s show/hide easing
const CRIT_FRAC = 0.25;
const CRIT_HZ = 1.6;

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const RIM = hexRgb(CHROME.rim);
const CHAR = hexRgb(PALETTE.voidCharcoal);
const BONE = hexRgb(PALETTE.bone);
const HEAL = hexRgb(PALETTE.brightHeal);
// The fill wears the identity ring's band (render/critters/common.js RING):
// the class accent's own hue and saturation, lifted in VALUE only, so a bar
// and the ring under the same hero read as one colour. The accents are dark
// by design; at their own value a 10 px bar went grey over the night ground.
// (The Healer keeps her low saturation, which keeps her bar out of the Bright
// Heal band exactly as her ring is.)
function hexToHsl(hex) {
  const [r, g, b] = hexRgb(hex).map((x) => x / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslCss([h, s], l) {
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}
const BAND = Object.fromEntries(
  Object.entries(ACCENTS).map(([k, a]) => {
    const hsl = hexToHsl(a.base);
    return [k, { lift: hslCss(hsl, 0.72), band: hslCss(hsl, 0.54), deep: hslCss(hsl, 0.36) }];
  })
);
const mixRgb = (a, b, k) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;

function injectStyle() {
  if (document.getElementById('hpbar-style')) return;
  const style = document.createElement('style');
  style.id = 'hpbar-style';
  style.textContent = `
    #hpbar-layer {
      position: fixed;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      user-select: none;
      z-index: 8;
    }
    /* The title / farewell own the screen (app.js body.ap-hide-game). */
    body.ap-hide-game #hpbar-layer { display: none; }
    .hpbar {
      position: absolute;
      left: 0;
      top: 0;
      width: ${BAR_W}px;
      height: ${BAR_H}px;
      border-radius: 3px;
      background: linear-gradient(180deg, ${CHROME.plateSunk} 0%, ${CHROME.plate} 100%);
      border: 1px solid ${CHROME.rim};
      box-shadow: 0 0 0 1px ${PALETTE.voidCharcoal}, 0 2px 3px rgba(0, 0, 0, 0.45);
      overflow: hidden;
      transform-origin: 50% 100%;
      will-change: transform, opacity;
      opacity: 0;
      visibility: hidden;
    }
    .hpbar > i {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 100%;
      transform-origin: 0 50%;
      display: block;
    }
    .hpbar-lag { background: ${PALETTE.parchment}; opacity: 0.82; }
    .hpbar-fill {
      background: linear-gradient(180deg, var(--bandLift) 0%, var(--bandLift) 30%, var(--band) 58%, var(--bandDeep) 100%);
      box-shadow: inset 0 -1px 0 ${CHROME.plateSunk};
    }
    .hpbar-flash { background: ${PALETTE.parchment}; opacity: 0; }
    /* The fill's leading edge: a hard ink cut, so the fill never melts into
       the Parchment lag chunk (the Tank's band is a near-grey). */
    .hpbar > i.hpbar-edge { width: 2px; left: -1px; background: ${PALETTE.voidCharcoal}; transform-origin: 50% 50%; }
    /* Quarter ticks: the bar reads as a quantity at a glance (75 / 50 / 25). */
    .hpbar-ticks {
      background: linear-gradient(90deg,
        transparent calc(25% - 0.5px), ${PALETTE.voidCharcoal}99 calc(25% - 0.5px), ${PALETTE.voidCharcoal}99 calc(25% + 0.5px), transparent calc(25% + 0.5px),
        transparent calc(50% - 0.5px), ${PALETTE.voidCharcoal}99 calc(50% - 0.5px), ${PALETTE.voidCharcoal}99 calc(50% + 0.5px), transparent calc(50% + 0.5px),
        transparent calc(75% - 0.5px), ${PALETTE.voidCharcoal}99 calc(75% - 0.5px), ${PALETTE.voidCharcoal}99 calc(75% + 0.5px), transparent calc(75% + 0.5px));
    }
  `;
  document.head.appendChild(style);
}

export function createHpBarLayer({ world, camera, enabled = () => true, container = document.body }) {
  injectStyle();
  const layer = document.createElement('div');
  layer.id = 'hpbar-layer';
  container.appendChild(layer);

  const bars = [];
  for (let i = 0; i < 4; i++) {
    const classId = classOfSeat(i);
    const acc = BAND[classId];
    const el = document.createElement('div');
    el.className = 'hpbar';
    el.dataset.index = String(i);
    el.dataset.class = classId;
    el.style.setProperty('--band', acc.band);
    el.style.setProperty('--bandLift', acc.lift);
    el.style.setProperty('--bandDeep', acc.deep);
    const lag = document.createElement('i');
    lag.className = 'hpbar-lag';
    const fill = document.createElement('i');
    fill.className = 'hpbar-fill';
    const flash = document.createElement('i');
    flash.className = 'hpbar-flash';
    const edge = document.createElement('i');
    edge.className = 'hpbar-edge';
    const ticks = document.createElement('i');
    ticks.className = 'hpbar-ticks';
    el.append(lag, fill, flash, edge, ticks);
    layer.appendChild(el);
    bars.push({
      i,
      classId,
      el,
      lagEl: lag,
      fillEl: fill,
      flashEl: flash,
      edgeEl: edge,
      id: null, // entity id the bar last tracked (a new body resets the lag)
      fill: 1,
      lag: 1,
      lagHold: 0,
      flash: 0,
      pop: 0,
      glint: 0,
      vis: 0, // eased 0..1 visibility
      shown: false,
      painted: { fill: -1, lag: -1, flash: -1, rim: '', tf: '', op: -1 },
    });
  }

  // PARTY LINEUP: a seat whose class changed takes the new class's band.
  function reband(b) {
    const cls = classOfSeat(b.i);
    if (cls === b.classId || !BAND[cls]) return;
    const acc = BAND[cls];
    b.classId = cls;
    b.el.dataset.class = cls;
    b.el.style.setProperty('--band', acc.band);
    b.el.style.setProperty('--bandLift', acc.lift);
    b.el.style.setProperty('--bandDeep', acc.deep);
  }

  const members = [null, null, null, null];
  const v = new Vector3();
  let last = null;

  function hideAll() {
    for (const b of bars) {
      b.vis = 0;
      if (b.shown) {
        b.shown = false;
        b.el.style.visibility = 'hidden';
        b.el.style.opacity = '0';
        b.painted.op = 0;
      }
    }
  }

  function update(tSec, alpha = 1) {
    const dt = last === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - last));
    last = tSec;
    if (!enabled()) {
      hideAll();
      return;
    }
    members[0] = members[1] = members[2] = members[3] = null;
    for (const e of world.entities()) {
      if (e.partyIndex !== undefined && e.partyIndex >= 0 && e.partyIndex < 4 && (e.kind === 'player' || e.kind === 'ally')) {
        members[e.partyIndex] = e;
      }
    }
    const W = window.innerWidth;
    const H = window.innerHeight;
    const s = Math.max(0.8, Math.min(1.6, Math.min(W / 1920, H / 1080)));
    const crit = 0.5 - 0.5 * Math.cos(2 * Math.PI * CRIT_HZ * tSec);

    for (const b of bars) {
      const m = members[b.i];
      const alive = !!m && m.hp > 0 && m.maxHp > 0;
      // --- state
      if (m && m.id !== b.id) {
        b.id = m.id;
        const f0 = m.maxHp > 0 ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
        b.fill = b.lag = f0;
        b.flash = b.pop = b.glint = b.lagHold = 0;
      }
      if (alive) {
        const f = Math.max(0, Math.min(1, m.hp / m.maxHp));
        if (f < b.fill - 1e-4) {
          // A hit: the lost chunk stays as the lag segment, the fill flashes.
          b.lag = Math.max(b.lag, b.fill);
          b.lagHold = LAG_HOLD_S;
          b.flash = 1;
          b.pop = Math.min(1, (b.fill - f) * 6 + 0.35);
        } else if (f > b.fill + 1e-4) {
          if (f - b.fill > 0.02) b.glint = 1;
          b.lag = Math.max(b.lag, f);
        }
        b.fill = f;
      }
      b.flash = Math.max(0, b.flash - dt / FLASH_S);
      b.pop = Math.max(0, b.pop - dt / POP_S);
      b.glint = Math.max(0, b.glint - dt / GLINT_S);
      if (b.lagHold > 0) b.lagHold -= dt;
      else b.lag = Math.max(b.fill, b.lag - LAG_RATE * dt);

      // --- placement
      let onScreen = false;
      let sx = 0;
      let sy = 0;
      if (m) {
        reband(b);
        const x = m.px !== undefined ? m.px + (m.x - m.px) * alpha : m.x;
        const z = m.pz !== undefined ? m.pz + (m.z - m.pz) * alpha : m.z;
        v.set(x, HEAD_Y[b.classId] ?? 1.4, z).project(camera);
        if (v.z < 1 && v.z > -1) {
          sx = (v.x * 0.5 + 0.5) * W;
          sy = (0.5 - v.y * 0.5) * H;
          onScreen = sx > -BAR_W * s && sx < W + BAR_W * s && sy > -BAR_H * s && sy < H + BAR_H * s * 4;
        }
      }
      const target = alive && onScreen ? 1 : 0;
      b.vis += (target - b.vis) * (1 - Math.exp(-FADE_RATE * dt));
      if (target === 0 && b.vis < 0.02) b.vis = 0;
      if (target === 1 && b.vis > 0.98) b.vis = 1;

      if (b.vis <= 0) {
        if (b.shown) {
          b.shown = false;
          b.el.style.visibility = 'hidden';
          b.el.style.opacity = '0';
          b.painted.op = 0;
        }
        continue;
      }
      if (!b.shown) {
        b.shown = true;
        b.el.style.visibility = 'visible';
      }

      // --- paint (only what changed)
      const P = b.painted;
      const sc = s * (1 + 0.12 * b.pop);
      const tf = `translate3d(${(sx - BAR_W / 2).toFixed(1)}px, ${(sy - BAR_H - LIFT_PX * s).toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
      if (tf !== P.tf) {
        P.tf = tf;
        b.el.style.transform = tf;
      }
      const op = Math.round(b.vis * 100) / 100;
      if (op !== P.op) {
        P.op = op;
        b.el.style.opacity = String(op);
      }
      const fq = Math.round(b.fill * 1000) / 1000;
      if (fq !== P.fill) {
        P.fill = fq;
        b.fillEl.style.transform = `scaleX(${fq})`;
        b.flashEl.style.transform = `scaleX(${fq})`;
        b.edgeEl.style.transform = `translateX(${(fq * BAR_W - 1).toFixed(1)}px)`;
        b.edgeEl.style.display = fq > 0.01 && fq < 0.99 ? '' : 'none';
      }
      const lq = Math.round(b.lag * 1000) / 1000;
      if (lq !== P.lag) {
        P.lag = lq;
        b.lagEl.style.transform = `scaleX(${lq})`;
      }
      const fl = Math.round(b.flash * 0.75 * 100) / 100;
      if (fl !== P.flash) {
        P.flash = fl;
        b.flashEl.style.opacity = String(fl);
      }
      let rim;
      if (b.glint > 0) rim = mixRgb(RIM, HEAL, b.glint);
      else if (alive && b.fill < CRIT_FRAC) rim = mixRgb(CHAR, BONE, crit);
      else rim = '';
      if (rim !== P.rim) {
        P.rim = rim;
        b.el.style.borderColor = rim;
      }
    }
  }

  // Probe surface: what each seat's bar shows right now.
  function debug() {
    return bars.map((b) => {
      const r = b.el.getBoundingClientRect();
      return {
        index: b.i,
        classId: b.classId,
        shown: b.shown,
        opacity: Number(b.el.style.opacity || 0),
        fill: Math.round(b.fill * 1000) / 1000,
        lag: Math.round(b.lag * 1000) / 1000,
        flash: Math.round(b.flash * 100) / 100,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      };
    });
  }

  return { el: layer, update, debug };
}
