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
import { vfxFoeTone, vfxFoeWeight, vfxTemplate, FOE_TEMPLATE } from '../../data/vfx.js';
import { TICK_HZ } from '../../core/constants.js';

const KINDS = new Set(['bolt', 'skillbolt', 'eshot', 'eglob']);
const MODE = { blade: 'fire', magic: 'celestial', scifi: 'holo' };
const GLOB_PEAK = 1.7; // render/enemies/extras.js: a lob's arc height at mid-flight
const TRAIL_BUDGET = 70; // particles shed per frame across every shot

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
      if (!kind) return null;
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

  // ---------------------------------------------------------- per frame --
  function track(id, e, x, y, z, vx, vz, speed, traveled, dt) {
    let rec = live.get(id);
    if (!rec) {
      const tone = e.tone ?? toneOf(e);
      if (!tone) return null;
      rec = { ...tone, x, y, z, dx: 1, dz: 0, owe: 0, h: null, token: 0 };
      live.set(id, rec);
      count(rec.src, 'head');
      mark(`tpl:bolt_${rec.tp.id}_head`);
    }
    const vl = Math.hypot(vx, vz);
    if (vl > 1e-5) {
      rec.dx = vx / vl;
      rec.dz = vz / vl;
    }
    rec.x = x;
    rec.y = y;
    rec.z = z;
    const size = (rec.foe ? 0.56 : 0.52) * Math.sqrt(rec.w) * (rec.tp.id === 'blade' ? 1.25 : 1); // a comet's head is its whole body
    const len = Math.min(traveled + 0.05, Math.max(0.45, Math.min(2.0, speed * 0.1))) * Math.sqrt(rec.w);
    if (!rec.h || rec.h.token !== rec.token || !rec.h.live) {
      if (rec.h && rec.token) return rec; // recycled by a fuller pool: no head this flight
      const tp = rec.tp;
      const fire = tp.id === 'blade';
      rec.h = tk.head({ x, y, z, dx: rec.dx, dz: rec.dz, size, len, mode: MODE[tp.id] ?? 'celestial', core: tp.core, a: tp.a, b: fire ? tp.deep : tp.b, opacity: fire && !rec.foe ? 0.7 : 0.9, gain: fire && !rec.foe ? 1.0 : 1.1 }); // gold fire blooms hottest: a hero comet runs softer
      rec.token = rec.h.token;
    } else tk.moveHead(rec.h, x, y, z, rec.dx, rec.dz, len, size);
    rec.owe += (rec.tp.dust?.trail ?? 26 * rec.w) * dt;
    return rec;
  }
  function frame(dt, entities) {
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
      if (rec.h && rec.h.token === rec.token) tk.endHead(rec.h, 0.08);
      burst(rec, cause.get(id) ?? 'impact');
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
    for (const rec of live.values()) if (rec.h && rec.h.token === rec.token) tk.endHead(rec.h, 0.01);
    live.clear();
    shooter.clear();
    cause.clear();
    demos.length = 0;
  }
  const counts = () => Object.fromEntries([...tally].map(([k, v]) => [k, { ...v }]));
  return { frame, showcase, teardown, counts };
}
