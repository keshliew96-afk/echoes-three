// Projectile templates (VFX rework PR 3, design-VFX.md §11 "Projectiles"):
// every shot in flight wears Kesh's template as its body, for the heroes,
// the enemies, the champions and the bosses alike.
//
//   the head   the flying body itself (tplkit head): a blazing comet for the
//              blade, a star orb in turning runes for magic, a neon laser
//              bolt for sci-fi; it stretches with the shot's speed
//   the trail  what it sheds as it flies: fire sparks and embers, stardust
//              that twinkles and hangs, holographic squares
//   the end    where it stops: an impactful little burst on a wall, a
//              blocker or a target, a fizzle when it runs out of range (a
//              lobbed glob's landing is its thrower's strike, foefx.js)
//
// Which template plays: a hero shot reads its skill's (templates.js toneFor,
// so a heal bolt is green and gold); an enemy shot or glob reads its
// shooter's (data/vfx.js vfxFoeTone and vfxFoeWeight, Foe Crimson for foe
// fire and spells). The class and enemy layers underneath keep their own
// bodies (the Healer's parchment bolt, an arrow, the enemy shot's core), so
// a shot is still told apart by shape while it plays its template.
//
// Render-only: reads sim entities and events, never writes either; all
// randomness from the COSMETIC stream.
import { CylinderGeometry, ConeGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { vfxFoeTone, vfxFoeWeight, vfxTemplate, vfxSkillClass, FOE_TEMPLATE } from '../../data/vfx.js';
import { TICK_HZ } from '../../core/constants.js';
import { PALETTE } from '../../data/palette.js';

const KINDS = new Set(['bolt', 'skillbolt', 'eshot', 'eglob']);
const MODE = { blade: 'fire', magic: 'celestial', scifi: 'holo' };
const GLOB_PEAK = 1.7; // render/enemies/extras.js: a lob's arc height at mid-flight
const TRAIL_BUDGET = 70; // particles shed per frame across every shot
// THE CAST AND THE SHOT (VFX_HIT_RULES §6.2 f, n; docs/HIT_FEEDBACK.md):
export const SHOT_FX = Object.freeze({
  swell: 0.6, // S1: the head starts 1.6x at the hand...
  settleSec: 0.1, // ...and settles to flight size over 0.1 s...
  settleU: 1.0, // ...or 1 u of flight, whichever comes first
  stretch: 1.8, // S3: in flight the head runs about 2 to 1 along its travel
  tailSec: 0.22, // S2: the tail is speed x 0.22 s...
  tailMin: 1.1, // ...between 1.1 u (about 2.3 target widths)...
  tailMax: 2.0, // ...and 2 u
  jitSize: [0.88, 1.14], // S4: each shot its own size,
  jitBright: [0.85, 1.1], // brightness
  jitY: [-0.05, 0.07], // and height (u), from the cosmetic stream
  drainSec: 0.083, // S5: the trail flows into the contact over 5 frames
  holdSec: 0.05, // n: a body hit holds the head at the contact 3 frames, then the burst
  light: 0.22, // S7: the floor glow under a shot in flight (opacity)
  lights: 6, // at most this many shots light the floor at once
  sparks: [5, 10], // P4: a star of short pale streaks where a shot lands
});
// D2: an arrow that lands stays stuck in the floor a few seconds.
export const STUCK = Object.freeze({ cap: 10, life: 3, fade: 0.3, tilt: 0.6, back: 0.28 });
const P4_PALE = '#E7D5A3';
const P4_CORE = '#FFFCC6';

export function createBoltFx({ kit, tk, bus, byId, after, rnd, mark, world, player, heroTone }) {
  // Per-kind tally for the probe (__echoes.content.vfx().bolt).
  const tally = new Map();
  const count = (src, beat) => {
    const row = tally.get(src) ?? {};
    row[beat] = (row[beat] ?? 0) + 1;
    tally.set(src, row);
  };
  const kindOf = (e) => (e ? (e.telegraph && e.telegraph.champion) || e.kind : null);
  const isFoe = (k) => k != null && Object.prototype.hasOwnProperty.call(FOE_TEMPLATE, k);
  const shooter = new Map(); // eshot / eglob id -> its shooter's kind
  const cause = new Map(); // shot id -> why it stopped (the despawn events)
  const live = new Map(); // shot id -> { h, token, tp, w, src, x, y, z, dx, dz, owe }
  const demos = []; // lab shots: { id, x, z, vx, vz, ttl, tp, w, src }
  let demoId = 0;

  bus.on('enemy_fire', (ev) => {
    const kind = kindOf(byId(ev.id));
    if (ev.shot != null && isFoe(kind)) shooter.set(ev.shot, kind);
  });
  bus.on('enemy_lob', (ev) => {
    const kind = kindOf(byId(ev.id));
    if (ev.glob != null && isFoe(kind)) shooter.set(ev.glob, kind);
  });
  for (const name of ['projectile_despawn', 'skill_bolt_despawn', 'eshot_despawn', 'eglob_despawn']) {
    bus.on(name, (ev) => {
      if (ev.id != null) cause.set(ev.id, ev.cause ?? 'impact');
    });
  }
  // ---------------------------------------------------------- the tones --
  function toneOf(e) {
    if (e.kind === 'eshot' || e.kind === 'eglob') {
      const kind = shooter.get(e.id) ?? (e.ownerKind && isFoe(e.ownerKind) ? e.ownerKind : null);
      if (!kind && e.kind === 'eglob') return null;
      if (!kind) return { tp: vfxFoeTone(null), w: 1, src: 'foe', foe: true }; // a shot whose shooter went unseen: Foe Crimson
      return { tp: vfxFoeTone(kind), w: vfxFoeWeight(kind), src: kind, foe: true };
    }
    if (e.faction === 'hostile') return null;
    const skill = e.kind === 'bolt' ? 'healer_basic' : e.skill;
    return { tp: heroTone(e), w: 1, src: skill ?? e.kind, foe: false };
  }

  // ------------------------------------------------------------ the end --
  // An impactful little burst where a shot stops on a wall, a blocker or a
  // body; a fizzle of its trail where it runs out of range.
  function burst(rec, why) {
    const { tp, w, x, z } = rec;
    const y = Math.max(0.35, rec.y);
    if (why === 'room_clear' || why === 'charm') return; // the room or the tonic plays these
    if (why === 'expired') {
      count(rec.src, 'fizzle');
      mark(`tpl:bolt_${tp.id}_fizzle`);
      if (tp.id === 'blade') tk.sparks(x, y, z, 4, { color: tp.a, color2: tp.core, speed: [0.4, 1.4], up: [0.2, 0.9], life: [0.15, 0.28], len: 0.03 });
      else tk.dust(x, y, z, 5, { tex: tp.id === 'scifi' ? 'square' : 'star', color: tp.b, color2: tp.a, radius: 0.15, speed: [0.1, 0.5], up: [0.1, 0.6], size: [0.04, 0.08], life: [0.4, 0.7], gravity: 0, drag: 1.6, twinkle: 30 });
      return;
    }
    count(rec.src, 'burst');
    mark(`tpl:bolt_${tp.id}_burst`);
    const s = (rec.foe ? 0.75 : 0.65) * Math.sqrt(w);
    const back = { x: -rec.dx, z: -rec.dz };
    if (tp.id === 'blade') {
      tk.blast({ x, y, z, size: s, mode: 'fire', core: tp.core, a: tp.a, b: tp.deep, life: 0.26 });
      tk.sparks(x, y, z, Math.round(7 * w), { color: tp.a, color2: tp.core, dir: back, dirBias: 0.5, spread: 1.1, speed: [2, 4.5], up: [0.6, 2], life: [0.16, 0.3], len: 0.045 });
    } else if (tp.id === 'scifi') {
      tk.blast({ x, y, z, size: s, mode: 'holo', core: tp.core, a: tp.a, b: tp.b, life: 0.24 });
      tk.dust(x, y, z, Math.round(6 * w), { tex: 'square', color: tp.a, color2: tp.b, radius: 0.15, speed: [0.6, 1.6], up: [0.2, 0.9], size: [0.04, 0.07], life: [0.3, 0.5], gravity: 0, drag: 2, twinkle: 40 });
    } else {
      tk.blast({ x, y, z, size: s, mode: 'celestial', core: tp.core, a: tp.a, b: tp.b, life: 0.3 });
      tk.dust(x, y, z, Math.round(7 * w), { color: tp.b, color2: tp.a, radius: 0.12, speed: [0.5, 1.4], up: [0.3, 1.1], size: [0.04, 0.09], life: [0.45, 0.8], gravity: -0.1, drag: 1.6, twinkle: 30 });
    }
    kit.light({ x, z, radius: 0.9 * w, color: tp.a, opacity: 0.32, life: 0.22, attack: 0.02 });
  }
  // ---------------------------------------------------------- the trail --
  function shed(rec, n) {
    const { tp, x, y, z } = rec;
    if (tp.id === 'blade') {
      // Fire sparks streaming back (motion blur) and embers that hang.
      tk.sparks(x, y, z, n, { color: tp.a, color2: tp.core, dir: { x: -rec.dx, z: -rec.dz }, dirBias: 0.9, spread: 0.35, speed: [0.8, 2.2], up: [-0.2, 0.6], life: [0.12, 0.25], gravity: 1.5, len: 0.06, width: [0.03, 0.06] });
      if (rnd(0, 1) < 0.35) tk.dust(x, y, z, 1, { color: tp.a, color2: tp.deep, radius: 0.08, speed: [0.05, 0.2], up: [0.2, 0.6], size: [0.04, 0.07], life: [0.4, 0.7], gravity: -0.3, drag: 2 });
    } else {
      tk.dust(x, y, z, n, { tex: tp.id === 'scifi' ? 'square' : 'star', color: tp.b, color2: tp.a, radius: 0.1, speed: [0.05, 0.3], up: [-0.1, 0.3], size: [0.04, 0.09], life: [0.35, 0.75], gravity: 0, drag: 2.5, twinkle: tp.id === 'scifi' ? 40 : 24 });
    }
  }

  // ------------------------------------------------- arrows in the floor --
  const stuck = [];
  {
    const shaftGeo = new CylinderGeometry(0.014, 0.014, 0.34, 5);
    shaftGeo.translate(0, 0.17, 0);
    const fletchGeo = new ConeGeometry(0.045, 0.1, 4);
    fletchGeo.translate(0, 0.3, 0);
    for (let i = 0; i < STUCK.cap; i++) {
      const g = new Group();
      const mat = new MeshBasicMaterial({ color: PALETTE.bone, transparent: true });
      g.add(new Mesh(shaftGeo, mat));
      g.add(new Mesh(fletchGeo, mat));
      g.visible = false;
      kit.root.add(g);
      stuck.push({ g, mat, t: 0, live: false });
    }
  }
  let stuckCursor = 0;
  function stick(x, z, dx, dz) {
    const s = stuck.find((q) => !q.live) ?? stuck[stuckCursor++ % stuck.length];
    s.g.position.set(x, 0, z);
    // Nose down, tail up and back along its flight.
    s.g.rotation.set(0, 0, 0);
    s.g.rotation.order = 'YXZ';
    s.g.rotation.y = Math.atan2(dx, dz);
    s.g.rotation.x = -STUCK.tilt;
    s.mat.opacity = 1;
    s.t = 0;
    s.live = true;
    s.g.visible = true;
    count('arrow', 'stuck');
  }
  function stuckFrame(dt) {
    for (const s of stuck) {
      if (!s.live) continue;
      s.t += dt;
      if (s.t >= STUCK.life) {
        s.live = false;
        s.g.visible = false;
        continue;
      }
      s.mat.opacity = Math.min(1, (STUCK.life - s.t) / STUCK.fade);
    }
  }
  const isArrow = (rec) => !rec.foe && vfxSkillClass(rec.src) === 'archer';

  const litCount = () => {
    let n = 0;
    for (const r of live.values()) if (r.lt) n++;
    return n;
  };
  // P4: a star of short pale streaks over a soft glow where a shot lands, on
  // a body or a wall; a foe's shot sparks in its own tone.
  function landSparks(rec) {
    const y = Math.max(0.35, rec.y);
    const n = Math.round(rnd(...SHOT_FX.sparks));
    const pale = rec.foe ? rec.tp.a : P4_PALE;
    const core = rec.foe ? rec.tp.core : P4_CORE;
    tk.sparks(rec.x, y, rec.z, n, { color: pale, color2: core, spread: Math.PI, speed: [1.4, 3.2], up: [0.2, 1.2], life: [0.12, 0.2], gravity: 2, len: 0.035, width: [0.025, 0.045] });
    kit.flash({ x: rec.x, y, z: rec.z, color: core, size: 0.45 * Math.sqrt(rec.w), life: 0.2, hold: 0.05, opacity: 0.35, grow: 0.2 });
  }

  // ---------------------------------------------------------- per frame --
  function track(id, e, x, y, z, vx, vz, speed, traveled, dt) {
    let rec = live.get(id);
    if (!rec) {
      const tone = e.tone ?? toneOf(e);
      if (!tone) return null;
      rec = {
        ...tone,
        x,
        y,
        z,
        dx: 1,
        dz: 0,
        owe: 0,
        h: null,
        token: 0,
        age: 0,
        jS: rnd(...SHOT_FX.jitSize),
        jB: rnd(...SHOT_FX.jitBright),
        jY: e.kind === 'eglob' ? 0 : rnd(...SHOT_FX.jitY),
        lt: null,
        ltTok: 0,
      };
      live.set(id, rec);
      count(rec.src, 'head');
      mark(`tpl:bolt_${rec.tp.id}_head`);
    }
    const vl = Math.hypot(vx, vz);
    if (vl > 1e-5) {
      rec.dx = vx / vl;
      rec.dz = vz / vl;
    }
    y += rec.jY;
    rec.x = x;
    rec.y = y;
    rec.z = z;
    rec.age += dt;
    // S1: big at the hand, settling to flight size; S3: round at the hand,
    // stretched along the travel once it flies.
    const k = Math.min(1, Math.max(rec.age / SHOT_FX.settleSec, traveled / SHOT_FX.settleU));
    const swell = 1 + SHOT_FX.swell * (1 - k) * (1 - k);
    const stretch = 1 + (SHOT_FX.stretch - 1) * k;
    const size = (rec.foe ? 0.56 : 0.52) * Math.sqrt(rec.w) * (rec.tp.id === 'blade' ? 1.25 : 1) * rec.jS * swell; // a comet's head is its whole body
    const len = Math.min(traveled + 0.05, Math.max(SHOT_FX.tailMin, Math.min(SHOT_FX.tailMax, speed * SHOT_FX.tailSec))) * Math.sqrt(rec.w);
    if (!rec.h || rec.h.token !== rec.token || !rec.h.live) {
      if (rec.h && rec.token) return rec; // recycled by a fuller pool: no head this flight
      const tp = rec.tp;
      const fire = tp.id === 'blade';
      rec.h = tk.head({ x, y, z, dx: rec.dx, dz: rec.dz, size, len, stretch, mode: MODE[tp.id] ?? 'celestial', core: tp.core, a: tp.a, b: fire ? tp.deep : tp.b, opacity: (fire && !rec.foe ? 0.7 : 0.9) * rec.jB, gain: fire && !rec.foe ? 1.0 : 1.1 }); // gold fire blooms hottest: a hero comet runs softer
      rec.token = rec.h.token;
    } else tk.moveHead(rec.h, x, y, z, rec.dx, rec.dz, len, size, stretch);
    // S7: the floor under the shot glows as it flies.
    if (rec.lt && !kit.moveLight(rec.lt, rec.ltTok, x, z)) rec.lt = null;
    if (!rec.lt && !rec.litOnce && litCount() < SHOT_FX.lights) {
      rec.litOnce = true;
      rec.lt = kit.light({ x, z, radius: 0.75 * Math.sqrt(rec.w), color: rec.tp.a, opacity: SHOT_FX.light, life: Infinity, attack: 0.05 });
      rec.ltTok = rec.lt ? rec.lt.token : 0;
    }
    rec.owe += (rec.tp.dust?.trail ?? 26 * rec.w) * dt;
    return rec;
  }
  function frame(dt, entities) {
    stuckFrame(dt);
    const seen = new Set();
    const tick = world.tick ?? 0;
    for (const e of entities) {
      if (!KINDS.has(e.kind)) continue;
      let x = e.x;
      let z = e.z;
      let y = 0.55;
      let vx = e.vx ?? 0;
      let vz = e.vz ?? 0;
      let speed = Math.hypot(vx, vz) * TICK_HZ; // u/tick -> u/s
      let traveled = e.traveled ?? 9;
      if (e.kind === 'eglob') {
        if (e.affix || e.weight) continue; // affix pools and the hanging weight keep their own look
        const span = Math.max(1, e.landTick - e.startTick);
        const u = Math.min(1, Math.max(0, (tick - e.startTick) / span));
        y = 0.35 + GLOB_PEAK * 4 * u * (1 - u);
        vx = e.tx - e.fromX;
        vz = e.tz - e.fromZ;
        speed = (Math.hypot(vx, vz) / span) * TICK_HZ;
        traveled = Math.hypot(e.x - e.fromX, e.z - e.fromZ);
      }
      if (track(e.id, e, x, y, z, vx, vz, speed, traveled, dt)) seen.add(e.id);
    }
    for (let i = demos.length - 1; i >= 0; i--) {
      const d = demos[i];
      d.ttl -= dt;
      if (d.ttl <= 0) {
        cause.set(d.id, d.end);
        demos.splice(i, 1);
        continue;
      }
      d.x += d.vx * dt;
      d.z += d.vz * dt;
      d.traveled += Math.hypot(d.vx, d.vz) * dt;
      if (track(d.id, d, d.x, 0.55, d.z, d.vx, d.vz, Math.hypot(d.vx, d.vz), d.traveled, dt)) seen.add(d.id);
    }
    // Trails, inside one frame budget (a volley stays cheap).
    let budget = TRAIL_BUDGET;
    for (const id of seen) {
      const rec = live.get(id);
      const n = Math.floor(rec.owe);
      if (n <= 0) continue;
      rec.owe -= n;
      const m = Math.min(n, budget);
      if (m > 0) shed(rec, m);
      budget -= m;
    }
    // Shots that stopped this frame: their end, then their head goes.
    for (const [id, rec] of live) {
      if (seen.has(id)) continue;
      const why = cause.get(id) ?? 'impact';
      const ended = why === 'expired' || why === 'room_clear' || why === 'charm';
      // S5: the trail drains into the contact; n: on a body the head holds
      // there 3 frames and the burst replaces it.
      if (rec.h && rec.h.token === rec.token) tk.endHead(rec.h, ended ? 0.08 : SHOT_FX.drainSec, !ended);
      if (rec.lt) kit.endLight(rec.lt, rec.ltTok, 0.1);
      if (!ended) landSparks(rec);
      if (why !== 'room_clear' && why !== 'charm' && isArrow(rec)) stick(rec.x - rec.dx * (why === 'impact' ? STUCK.back : 0), rec.z - rec.dz * (why === 'impact' ? STUCK.back : 0), rec.dx, rec.dz);
      if (why === 'impact') {
        const r = { ...rec };
        after(SHOT_FX.holdSec, () => burst(r, why));
      } else burst(rec, why);
      live.delete(id);
      cause.delete(id);
      shooter.delete(id);
    }
    if (cause.size > 256) cause.clear();
    if (shooter.size > 256) shooter.clear();
  }

  // The lab: one shot of each listed tone flies across in front of the
  // party. Names: 'magic' | 'blade' | 'scifi' (a hero's), 'heal' (a heal
  // bolt), or a foe kind (its shooter's tone and weight). Returns the count.
  function showcase(names, at) {
    const p = player();
    const x0 = at?.x ?? (p ? p.x : 0);
    const z0 = at?.z ?? (p ? p.z - 2.4 : -2.4);
    names.forEach((name, i) => {
      const foe = isFoe(name);
      const tone = foe
        ? { tp: vfxFoeTone(name), w: vfxFoeWeight(name), src: name, foe: true }
        : { tp: name === 'heal' ? heroTone({ kind: 'skillbolt', heal: true }) : vfxTemplate(name), w: 1, src: `lab_${name}`, foe: false };
      after(i * 0.45, () => {
        const id = `lab${++demoId}`;
        demos.push({ id, x: x0 - 3.4, z: z0 - 0.6 + (i % 4) * 0.8, vx: 5.5, vz: 0, ttl: 1.25, end: i % 2 ? 'expired' : 'wall', traveled: 0, tone });
      });
    });
    return names.length;
  }
  function teardown() {
    for (const rec of live.values()) {
      if (rec.h && rec.h.token === rec.token) tk.endHead(rec.h, 0.01);
      if (rec.lt) kit.endLight(rec.lt, rec.ltTok, 0.01);
    }
    live.clear();
    shooter.clear();
    cause.clear();
    demos.length = 0;
    for (const s of stuck) {
      s.live = false;
      s.g.visible = false;
    }
  }
  const counts = () => Object.fromEntries([...tally].map(([k, v]) => [k, { ...v }]));
  return { frame, showcase, teardown, counts };
}
