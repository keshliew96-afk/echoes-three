// Pooled DOM damage numerals (§17 Zone 3, ruling A7): world->screen projected
// divs that rise and fade. Grammar (binding):
//   outgoing damage  = Parchment, rise-and-fade, scale with magnitude
//   incoming (party) = Bruise Umber with Parchment outline, drops w/ lateral shake
//   heals            = Bright Heal, rising, "+HP" glyph
// ATTACK FEEDBACK (docs/HIT_FEEDBACK.md, "Your damage numbers"): outgoing
// damage splits by WHO dealt it. The viewer's own hits (their seat, the same
// rule as hit feedback's own body) print Hearth Amber, heavier, larger, with a
// 3 px outline and a stronger pop, drawn above everything else in the layer;
// everyone else's outgoing damage (AI seats, co-op partners, hazards, kegs)
// prints Bone, lighter, at 0.7x size and 45 % opacity, so it reads as
// background. Heals and party-incoming numerals are unchanged.
// 2 px contrast outline, no plate; tabular numerals; numeral floor 20 px.
// Cap 12 simultaneous — when the cap is reached the OLDEST fades early (it is
// recycled immediately for the newcomer, so the on-screen count can never
// exceed 12 even under cmd-driven spam). Pool never shrinks; nodes are reused.
// THE HIT AND THE KILL (docs/HIT_FEEDBACK.md, VFX_HIT_RULES N1-N3): outgoing
// numerals fly a ballistic arc that drifts to alternating sides; your own pop
// big and WHITE, hold through the hitstop, then settle to Hearth Amber within
// 3 frames; your crits print 1.55x with a "CRIT!" tag that pops a frame later.
// Others' keep Bone at 0.7x and 45 % with their own small pop, never amber or
// white; heals stay Bright Heal from their first frame; incoming still drop.
import { Color, Vector3 } from 'three';
import { DAMAGE_NUMBERS, TICK_HZ, HITSTOP } from '../core/constants.js';
import { PALETTE } from '../data/palette.js';
import { t } from '../i18n/index.js';
import { renderHold } from './hold.js';

const OUTLINE_W = 2; // px (§17: 2 px contrast outline)

// Own vs other outgoing damage (ATTACK FEEDBACK). `own` is the viewer's hit,
// `other` anyone else's; a spawn with no `who` keeps the old look exactly.
// flash: the colour an own numeral pops in before it settles (N1); critScale:
// an own crit's size against its plain hit (N3; others keep DAMAGE_NUMBERS').
export const NUMERAL_WHO = Object.freeze({
  own: Object.freeze({ color: PALETTE.hearthAmber, outlineW: 3, weight: 900, sizeMul: 1.22, opacity: 1, pop: 0.5, critPop: 0.8, z: 2, flash: PALETTE.parchment, critScale: 1.55, tag: true }),
  other: Object.freeze({ color: PALETTE.bone, outlineW: 2, weight: 600, sizeMul: 0.7, opacity: 0.45, pop: 0.2, critPop: 0.4, z: 1 }),
});

// The numeral's flight and settle (N1-N3), render seconds and world units.
export const NUMERAL_FEEL = Object.freeze({
  settleSec: 0.1, // the pop shrinks to rest and white turns to amber (3 frames)
  driftU: 0.3, // sideways drift over the life (~0.45 body widths, v3)
  apexT: 0.68, // the arc tops out at 68 % of the life, then sinks a little
  tagDelaySec: 0.033, // the CRIT! tag pops one frame after the numeral
  tagPop: 0.35, // the tag's own overshoot
  tiltDeg: 7, // an own crit spawns tilted toward its side, then settles
  holdCap: HITSTOP.budgetTicks / TICK_HZ, // the most a hitstop can hold one
});

// The arc at t = 0..1 of the life: the sideways drift (u) and the rise (0..1
// of riseU; the apex at apexT, sinking about a fifth by the end).
export function numeralArc(tt, side) {
  const u = tt / NUMERAL_FEEL.apexT;
  return { dx: side * NUMERAL_FEEL.driftU * tt, rise: 2 * u - u * u };
}

// The pop and settle at `age` s of held time: 0..1 of the pop left, the
// colour step (0 the flash .. 3 the resting colour) and the tag's look.
export function numeralLook(age, { tagged = false } = {}) {
  const k = Math.min(1, Math.max(0, age) / NUMERAL_FEEL.settleSec);
  const step = k >= 1 ? 3 : Math.min(2, Math.floor(k * 3));
  let tagO = 0;
  let tagS = 1;
  if (tagged && age >= NUMERAL_FEEL.tagDelaySec) {
    tagO = 1;
    tagS = 1 + NUMERAL_FEEL.tagPop * (1 - Math.min(1, (age - NUMERAL_FEEL.tagDelaySec) / NUMERAL_FEEL.settleSec));
  }
  return { popLeft: 1 - k, step, phase: k >= 1 ? 'settled' : 'pop', tagO, tagS };
}

// Flash -> rest in three steps (precomputed once per look).
function colourSteps(from, to) {
  const a = new Color(from);
  const b = new Color(to);
  return [0, 1 / 3, 2 / 3, 1].map((k) => '#' + a.clone().lerp(b, k).getHexString().toUpperCase());
}
const OWN_STEPS = colourSteps(NUMERAL_WHO.own.flash, NUMERAL_WHO.own.color);
// The tag's word, looked up once (a language switch reloads the page).
let critTag = null;
const critWord = () => (critTag ??= t('CRIT!'));

// Which party seat dealt this hit, or null (an enemy, a hazard, a keg, an
// unknown body). `byId(id)` looks an entity up in the live world. The one
// party carrier without an attacker id is the Healer's basic bolt (the
// world's projectile system, sim/world.js queueImpact): a basic projectile
// hit with no attacker on a non-party body is seat 0's.
export function hitterSeat(ev, byId) {
  if (!ev || ev.kind === 'player' || ev.kind === 'ally') return null;
  if (ev.attacker == null) return ev.delivery === 'basic' && ev.shape === 'projectile' ? 0 : null;
  const a = typeof byId === 'function' ? byId(ev.attacker) : null;
  return a && Number.isInteger(a.partyIndex) ? a.partyIndex : null;
}

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

// ATTACK FEEDBACK probe surface: outgoing numerals spawned per look since
// boot (window.__echoes.numerals()).
const TALLY = { own: 0, other: 0, plain: 0 };
export function numeralTally() {
  return { ...TALLY };
}

// The live numerals of every pool (probe surface).
export function numeralsLive() {
  const out = [];
  for (const p of POOLS) if (p.live) out.push(...p.live());
  return out;
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

function outlineShadow(color, w = OUTLINE_W) {
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
        font-family: system-ui, -apple-system, 'Segoe UI', var(--i18n-font, sans-serif);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        line-height: 1;
        white-space: nowrap;
        will-change: transform, opacity;
        visibility: hidden;
      }
      .dmg-num[data-tag]::after {
        content: attr(data-tag);
        position: absolute;
        left: 50%;
        bottom: 100%;
        font-size: max(20px, 0.45em);
        transform: translateX(-50%) scale(var(--tag-s, 1));
        transform-origin: 50% 100%;
        opacity: var(--tag-o, 0);
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
      ['damage', 3, false, 'own'],
      ['damage', 40, true, 'own'],
      ['damage', 12, false, 'other'],
    ];
    specs.forEach(([kind, amount, crit, who], i) => {
      const k = KINDS[kind] ?? KINDS.damage;
      const el = document.createElement('div');
      el.className = 'dmg-num';
      el.textContent = `${k.prefix}${amount}`;
      styleNumeral(el, k, kind, amount, crit, who);
      if (el.dataset.tag) el.style.setProperty?.('--tag-o', '1'); // warm the tag's glyphs too
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

  // Font size, colour, weight, outline and stacking for one numeral. Returns
  // the style row (or null for the unsplit look) so the pop can read it.
  function styleNumeral(el, k, kind, amount, crit, who) {
    const w = kind === 'damage' ? NUMERAL_WHO[who] ?? null : null;
    // Scale with magnitude (§17); crits render visibly larger (your own
    // at 1.55x, N3).
    let px = DAMAGE_NUMBERS.minPx + Math.abs(amount) * DAMAGE_NUMBERS.pxPerPoint;
    if (crit) px *= w?.critScale ?? DAMAGE_NUMBERS.critScale;
    if (w) px = Math.max(DAMAGE_NUMBERS.minPx, px * w.sizeMul); // never under the §17 floor
    el.style.fontSize = `${Math.round(px)}px`;
    // Your own pop in their flash colour and settle to their own (N1).
    el.style.color = w ? w.flash ?? w.color : k.color;
    el.style.fontWeight = w ? String(w.weight) : '';
    el.style.zIndex = w ? String(w.z) : '';
    el.style.textShadow = outlineShadow(k.outline, w ? w.outlineW : OUTLINE_W);
    el.dataset.who = w ? who : '';
    el.dataset.phase = w ? 'pop' : '';
    // N3: your own crit carries the tag (an ::after, so the text stays the
    // bare number and the fan's width is the digits').
    if (crit && w?.tag) el.dataset.tag = critWord();
    else delete el.dataset.tag;
    el.style.removeProperty?.('--tag-s');
    el.style.removeProperty?.('--tag-o');
    return { px, w };
  }

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

  // spawn({ x, z, amount, kind: 'damage'|'heal'|'incoming', crit, who: 'own'|'other', tick, absorbed })
  // tick: the hit's sim tick (a hitstop on it holds the numeral's pop);
  // absorbed: a shield took part, so the arc leaves the shield's "(n)" side.
  const sideOf = { own: 1, other: 1 }; // slot-0 alternation per look
  function spawn({ x, z, amount, kind = 'damage', crit = false, who = null, tick = null, absorbed = 0 }) {
    if (active.length >= DAMAGE_NUMBERS.cap) {
      // Oldest fades early (§1). ATTACK FEEDBACK: someone else's numeral goes
      // first, so a crowd of ally hits never pushes the viewer's own off.
      const victim = active.find((r) => r.who !== 'own') ?? active[0];
      release(victim);
    }
    const k = KINDS[kind] ?? KINDS.damage;
    const el = acquire();
    // Whole points print whole; a fractional instance keeps ONE decimal so a
    // pinned value like the Siphon drain (5.5) is not rounded into a lie.
    const shown = Math.round(amount * 10) / 10;
    el.textContent = `${k.prefix}${Number.isInteger(shown) ? shown : shown.toFixed(1)}`;
    const { px, w } = styleNumeral(el, k, kind, amount, crit, who);
    if (kind === 'damage') TALLY[w ? who : 'plain'] += 1;
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
    // An own crit's tag can be wider than its digits (¡CRÍTICO!): fan on it.
    // The ::after is max(20px, 0.45em); kana, Hangul, CJK and full-width
    // marks run about 1 em, the rest about 0.62 em.
    const tag = el.dataset.tag;
    const tagPx = Math.max(20, px * 0.45);
    const tagEm = tag ? [...tag].reduce((n, ch) => n + (ch >= '\u2E80' ? 1 : 0.62), 0) : 0;
    const wFan = tag ? Math.max(wpx, Math.round(tagPx * tagEm)) : wpx;
    unit = Math.max(unit, (wFan + widest) * 0.5 + FAN_GAP);
    let slot = 0;
    while (used.has(slot) && slot < FAN_SLOT.length - 1) slot++;
    const delay = Math.min(sameTick, FAN_STAGGER_MAX) * FAN_STAGGER;
    // N2: the arc drifts to a side. A fanned numeral drifts the way its slot
    // leans (two never cross); the centre slot alternates hit to hit; a
    // shielded hit leaves the "(n)" share on the right alone.
    const arc = !!w;
    let side = Math.sign(FAN_SLOT[slot]);
    if (arc && side === 0) {
      side = sideOf[who] = -sideOf[who];
      if (absorbed > 0) side = -1;
    }
    // Hidden until its staggered start (a delayed numeral must not sit in the
    // frame at its spawn point with stale geometry).
    el.style.visibility = delay > 0 ? 'hidden' : 'visible';
    active.push({
      el,
      x,
      z,
      ax,
      ay,
      w: wFan,
      slot,
      unit,
      age: -delay,
      jx: FAN_SLOT[slot] * unit,
      jy: -(slot % 3) * 14, // a touch of vertical separation on top of the fan
      rises: k.rises,
      crit,
      who: w ? who : null,
      pop: w ? (crit ? w.critPop : w.pop) : crit ? 0.55 : 0.3,
      alpha: w ? w.opacity : 1,
      arc,
      side: side || 1,
      tick,
      hold: 0,
      popAge: -delay, // the pop's own clock: held through the hitstop (N1)
      steps: w && w.flash ? OWN_STEPS : null,
      step: -1,
      tagged: !!el.dataset.tag,
      // Digits plus the CRIT! tag above the bottom anchor: the top clamp
      // keeps that much headroom so the tag stays in the layer.
      head: tag ? Math.round(px + tagPx) : 0,
      phase: w ? 'pop' : '',
    });
  }

  // A hitstop on `tick` (the sim's `hitstop` event: ticks granted) holds the
  // pop of every outgoing numeral that hit printed: big, and white for your
  // own, through the freeze (N1). Co-op guests get the event replayed.
  function hold(tick, ticks) {
    if (tick == null || !(ticks > 0)) return;
    for (const r of active) if (r.arc && r.tick === tick) r.hold = Math.min(NUMERAL_FEEL.holdCap, r.hold + ticks / TICK_HZ);
  }

  function update(dt) {
    tickWarm();
    if (active.length === 0) return;
    camera.updateMatrixWorld(); // camera moved this frame; project fresh
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = active.length - 1; i >= 0; i--) {
      const rec = active[i];
      // The hitstop holds the numeral's pop (size, white, tag) while its arc
      // and fade run on, paid with the rigs (render/hold.js): on its spawn
      // frame only what froze after this frame's hits, then the frozen time
      // each frame pays. Once it is on screen and the freeze is over, what
      // is left is dropped, so a staggered numeral never holds while the
      // world moves.
      let d = dt;
      if (rec.hold > 0 && rec.age >= 0) {
        const pay = rec.age > 0 ? renderHold.paid : renderHold.dueBorn;
        const h = Math.min(rec.hold, pay, d);
        rec.hold = rec.age > 0 && renderHold.paid <= 0 ? 0 : rec.hold - h;
        d -= h;
      }
      rec.age += dt;
      rec.popAge += d;
      if (rec.age < 0) continue; // staggered: not on screen yet (see FAN_*)
      if (rec.el.style.visibility !== 'visible') rec.el.style.visibility = 'visible';
      const t = rec.age / DAMAGE_NUMBERS.lifeSec;
      if (t >= 1) {
        release(rec);
        continue;
      }
      // Outgoing hits fly the arc (N2); heals and incoming keep their path.
      let ease = 1 - (1 - t) * (1 - t); // easeOutQuad — fast rise, settle
      let ddx = 0;
      if (rec.arc) {
        const a = numeralArc(t, rec.side);
        ease = a.rise;
        ddx = a.dx;
      }
      const dy = DAMAGE_NUMBERS.riseU * ease * (rec.rises ? 1 : -1);
      v.set(rec.x + ddx, DAMAGE_NUMBERS.baseY + dy, rec.z).project(camera);
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
      const yMax = h - h * BOTTOM_PAD_FRAC;
      const sy = Math.min(yMax, Math.max(EDGE_PAD + rec.head, rawY));
      const offFrame = sx !== rawX || rawY < EDGE_PAD || rawY > yMax;
      // 120 ms pop-in overshoot settling to 1, stronger on crits.
      // (ATTACK FEEDBACK: the viewer's own numerals pop harder, others' softer.)
      // An outgoing numeral settles in 3 frames instead, held through the
      // hitstop, your own from white to Hearth Amber (N1).
      let popLeft;
      let rot = '';
      if (rec.arc) {
        const look = numeralLook(rec.popAge, { tagged: rec.tagged });
        popLeft = look.popLeft;
        if (rec.steps && look.step !== rec.step) {
          rec.step = look.step;
          rec.el.style.color = rec.steps[look.step];
        }
        if (look.phase !== rec.phase) {
          rec.phase = look.phase;
          rec.el.dataset.phase = look.phase;
        }
        if (rec.tagged) {
          rec.el.style.setProperty?.('--tag-o', String(look.tagO));
          rec.el.style.setProperty?.('--tag-s', look.tagS.toFixed(3));
          // N3: the crit spawns tilted toward its side, then settles upright.
          if (popLeft > 0) rot = ` rotate(${(-rec.side * NUMERAL_FEEL.tiltDeg * popLeft).toFixed(2)}deg)`;
        }
      } else popLeft = 1 - Math.min(1, rec.age / 0.12);
      const over = rec.pop;
      const scale = (1 + over * popLeft) * (offFrame ? 0.78 : 1);
      rec.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -100%) scale(${scale.toFixed(3)})${rot}`;
      const fade = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
      rec.el.style.opacity = (fade * rec.alpha * (offFrame ? 0.82 : 1)).toFixed(3);
    }
  }

  const api = {
    spawn,
    hold,
    // DEPRECATED as a driver: main.js's frame loop drives every pool through
    // `updateNumberPools` so a scene swap can never freeze one (see the note
    // at the top of this file). Left callable — and inert — so the scenes that
    // still call it are neither broken nor double-ageing their numerals.
    update: () => {},
    releaseAll,
    count: () => active.length,
  };
  // (capacity — CAMPAIGN GC.6: numeral elements ever allocated, live + parked.)
  // Probe surface (harness: __echoes.numeralsLive()): the live numerals' state.
  const live = () => active.map((r) => ({ who: r.who, crit: r.crit, age: Math.round(r.age * 1000) / 1000, popAge: Math.round(r.popAge * 1000) / 1000, hold: Math.round(r.hold * 1000) / 1000, side: r.arc ? r.side : 0, phase: r.phase, tag: r.tagged ? r.el.dataset.tag : null, color: r.el.style.color, text: r.el.textContent }));
  api.live = live;
  POOLS.add({ tick: update, releaseAll, count: () => active.length, capacity: () => active.length + pool.length, prewarm, live });
  return api;
}
