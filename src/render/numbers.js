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

// --- ONE DRIVER, ONE FLUSH (run-block round-3 fix) ------------------------
// The pool used to be aged by whichever scene happened to own it, which meant
// a scene swap could STRAND it: camp.js stops calling arena.update() the
// moment a run ends, the pool's age-out never ran again, and whatever was in
// flight froze on the Victory card and followed the player into Camp forever
// (measured: 7 nodes byte-identical in position AND opacity across 9 s).
// Every live pool now registers here; main.js's frame loop is the SINGLE
// driver (`updateNumberPools`) and the run boundaries flush it
// (`flushNumberPools`), so no scene can ever freeze a numeral again.
const POOLS = new Set();

// Boot warm-up entry (see prewarm inside createNumberPool).
export function prewarmNumberPools(frames = 3) {
  for (const p of POOLS) if (p.prewarm) p.prewarm(frames);
}

export function updateNumberPools(dt) {
  for (const p of POOLS) p.tick(dt);
}

// Release-all: the cosmetic half of the run block's `sweepPlayerTransients`.
// Wired to run_start / room_cleared / run_end / return_to_camp in main.js.
export function flushNumberPools() {
  let n = 0;
  for (const p of POOLS) n += p.releaseAll();
  return n;
}

export function numberPoolCount() {
  let n = 0;
  for (const p of POOLS) n += p.count();
  return n;
}

// CAMPAIGN (PLAN §12.5 memory probe): numeral elements allocated (a pool that
// grows level after level would show here; live counts come and go).
export function numberPoolCapacity() {
  let n = 0;
  for (const p of POOLS) n += typeof p.capacity === 'function' ? p.capacity() : 0;
  return n;
}

// --- SAME-TICK FAN (run-block round-3 fix) --------------------------------
// §17 authored a +/-16 px lateral jitter, which is nothing next to a 31-77 px
// glyph: four party members landing on the Stag in one tick stacked their
// numerals into an unreadable clump (REFERENCE_BAR "overlapping text").
// Numerals born inside FAN_WINDOW of each other are now fanned DETERMINISTIC-
// ALLY across alternating slots a full glyph-width apart AND staggered by ~3
// ticks each, so two numerals can never occupy one rect.
const FAN_WINDOW = 0.16; // s — "same moment", for the spawn stagger
const FAN_SLOT = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6]; // alternating outward
// (12 slots = the §1 cap of 12 simultaneous numerals: a full screen of them
// still has one free lane each.)
const FAN_STAGGER = 0.05; // s (~3 ticks) of spawn delay per same-tick arrival
const FAN_STAGGER_MAX = 3; // arrivals that take the delay; wider ones fan only
const FAN_GAP = 10; // px of clear air guaranteed between two fanned glyphs
const FAN_NEAR_X = 330; // px — how close two ANCHORS must be to share a cluster
const FAN_NEAR_Y = 150;
// Frame inset for an off-frame hit's clamped numeral. The bottom pad clears
// §17's command bar (Zones 1+2 are <= ~15% of screen height) so a clamped
// numeral is never swallowed by the HUD plate above it.
const EDGE_PAD = 34;
const BOTTOM_PAD_FRAC = 0.17;

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
  // --- boot warm-up (certification fix D-r3 S1): one numeral of every kind at
  // the smallest and the largest size the sim produces, drawn at 2/1000
  // opacity for a few frames, so the first crit / heal / incoming number of a
  // fight is rasterised on warm text pipelines and glyph atlases.
  let warm = null; // { els, left }
  function prewarm(frames = 3) {
    if (warm) return;
    const els = [];
    const cx = window.innerWidth * 0.5;
    const h = window.innerHeight;
    // Round 4: one numeral per raster strip (top / middle / bottom of the
    // frame), because the compositor draws each viewport-wide strip with its
    // own pipeline variant — see the note in ui/hud/threat.js paintWarm.
    const rows = [0.14, 0.5, 0.86, 0.3, 0.7];
    const specs = [
      ['damage', 3, false],
      ['damage', 40, false],
      ['damage', 34, true],
      ['heal', 18, false],
      ['incoming', 26, false],
    ];
    specs.forEach(([kind, amount, crit], i) => {
      const k = KINDS[kind] ?? KINDS.damage;
      const el = document.createElement('div');
      el.className = 'dmg-num';
      let px = DAMAGE_NUMBERS.minPx + amount * DAMAGE_NUMBERS.pxPerPoint;
      if (crit) px *= DAMAGE_NUMBERS.critScale;
      el.textContent = `${k.prefix}${amount}`;
      el.style.fontSize = `${Math.round(px)}px`;
      el.style.color = k.color;
      el.style.textShadow = outlineShadow(k.outline);
      el.style.visibility = 'visible';
      el.style.opacity = '0.002';
      el.style.transform = `translate(${(cx + (i - 2) * 90).toFixed(1)}px, ${(h * rows[i % rows.length]).toFixed(1)}px) translate(-50%, -100%) scale(${crit ? 1.25 : 1})`;
      layer.appendChild(el);
      els.push(el);
    });
    warm = { els, left: frames };
  }
  function tickWarm() {
    if (!warm) return;
    if (--warm.left > 0) return;
    for (const el of warm.els) el.remove();
    warm = null;
  }
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
    rec.el.style.opacity = '0';
    pool.push(rec.el);
  }

  // Hard release of everything in flight — the run boundaries' cosmetic sweep.
  function releaseAll() {
    const n = active.length;
    while (active.length) release(active[active.length - 1]);
    return n;
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
    // --- DETERMINISTIC FAN (see FAN_* above).
    // Project this numeral's ANCHOR to the screen now, find every live numeral
    // anchored near it, and take the first slot that cluster has not used.
    // Slots are laid out on a unit that is literally half of each pair's glyph
    // widths plus a 10 px gap, measured off the live element — so two numerals
    // in one cluster CANNOT share a rect, whatever their magnitudes. Same-tick
    // arrivals are additionally held back ~3 ticks each so they also arrive at
    // different moments rather than all at once.
    camera.updateMatrixWorld();
    v.set(x, DAMAGE_NUMBERS.baseY, z).project(camera);
    const ax = (v.x * 0.5 + 0.5) * window.innerWidth;
    const ay = (0.5 - v.y * 0.5) * window.innerHeight;
    const wpx = el.offsetWidth || Math.round(px * 0.62 * el.textContent.length);
    let unit = 0;
    let widest = wpx;
    let sameTick = 0;
    const used = new Set();
    for (const r of active) {
      if (Math.abs(r.ax - ax) > FAN_NEAR_X || Math.abs(r.ay - ay) > FAN_NEAR_Y) continue;
      used.add(r.slot);
      if (r.w > widest) widest = r.w;
      if (r.unit > unit) unit = r.unit;
      if (r.age < FAN_WINDOW) sameTick++;
    }
    unit = Math.max(unit, (wpx + widest) * 0.5 + FAN_GAP);
    let slot = 0;
    while (used.has(slot) && slot < FAN_SLOT.length - 1) slot++;
    const delay = Math.min(sameTick, FAN_STAGGER_MAX) * FAN_STAGGER;
    // Hidden until its staggered start (a delayed numeral must not sit in the
    // frame at its spawn point with stale geometry).
    el.style.visibility = delay > 0 ? 'hidden' : 'visible';
    active.push({
      el,
      x,
      z,
      ax,
      ay,
      w: wpx,
      slot,
      unit,
      age: -delay,
      jx: FAN_SLOT[slot] * unit,
      jy: -(slot % 3) * 14, // a touch of vertical separation on top of the fan
      rises: k.rises,
      crit,
    });
  }

  function update(dt) {
    tickWarm();
    if (active.length === 0) return;
    camera.updateMatrixWorld(); // camera moved this frame; project fresh
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = active.length - 1; i >= 0; i--) {
      const rec = active[i];
      rec.age += dt;
      if (rec.age < 0) continue; // staggered: not on screen yet (see FAN_*)
      if (rec.el.style.visibility !== 'visible') rec.el.style.visibility = 'visible';
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
      const rawX = (v.x * 0.5 + 0.5) * w + rec.jx;
      const rawY = (0.5 - v.y * 0.5) * h + (rec.jy ?? 0);
      // OFF-FRAME CLAMP. §9's juice contract says a damage number pops on
      // EVERY hit, but the camera frames ~17 u of a 24 u arena, so a hit on an
      // arena-edge enemy projected straight off the viewport (measured
      // x=-1213 px, y=1297 px at 1600x900) and the feedback was silently
      // dropped for exactly the enemies the off-screen threat pointers are
      // warning about. A numeral that leaves the frame is pinned to the frame
      // edge instead — smaller and dimmer, so it reads as "landing over
      // there" rather than as a hit at that spot — and lands beside that
      // enemy's pointer (ui/hud/threat.js, which ticks in the same moment).
      const sx = Math.min(w - EDGE_PAD, Math.max(EDGE_PAD, rawX));
      const sy = Math.min(h - h * BOTTOM_PAD_FRAC, Math.max(EDGE_PAD, rawY));
      const offFrame = sx !== rawX || sy !== rawY;
      // 120 ms pop-in overshoot settling to 1, stronger on crits.
      const popT = Math.min(1, rec.age / 0.12);
      const over = rec.crit ? 0.55 : 0.3;
      const scale = (1 + over * (1 - popT)) * (offFrame ? 0.78 : 1);
      rec.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -100%) scale(${scale.toFixed(3)})`;
      const fade = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
      rec.el.style.opacity = (fade * (offFrame ? 0.82 : 1)).toFixed(3);
    }
  }

  const api = {
    spawn,
    // DEPRECATED as a driver: main.js's frame loop drives every pool through
    // `updateNumberPools` so a scene swap can never freeze one (see the note
    // at the top of this file). Left callable — and inert — so the scenes that
    // still call it are neither broken nor double-ageing their numerals.
    update: () => {},
    releaseAll,
    count: () => active.length,
  };
  // (capacity — CAMPAIGN GC.6: numeral elements ever allocated, live + parked.)
  POOLS.add({ tick: update, releaseAll, count: () => active.length, capacity: () => active.length + pool.length, prewarm });
  return api;
}
