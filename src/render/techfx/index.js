// Technique VFX (BUILD_BRIEF §15.3 reinterpretation × §19.4 layering rules).
//
// The build system's four technique primitives used to be legible only as
// extra numerals: `bounce_hop`, `siphon_drain`, `siphon_selfheal`, `detonate`
// and `echo_recast` had no render hooks at all. REFERENCE_BAR check 5 wants
// every attack effect to read as core + glow + particles (≥3 layers), so each
// primitive gets its own silhouette here:
//
//   bounce_hop      arced ribbon from the previous impact to the new victim —
//                   bright core tube + additive colored glow tube + a landing
//                   spark burst. One arc per hop, so a 2-hop chain draws two.
//   siphon_drain    a taut low tether from the healed ally to the drained
//                   enemy + a spark at the enemy (the heal→damage conversion
//                   made visible), core + glow + motes.
//   siphon_selfheal rising Bright Heal motes on the caster.
//   detonate        ground shock ring expanding to the authored 1.2 u radius +
//                   a white-hot core flash + a debris/mote burst.
//   echo_recast     a single ghost ring pulsing out of the caster — "again".
//
// Color discipline (§19.1/§19.4): heal-side output is Bright Heal ONLY;
// player damage output is parchment-white core + Hearth Amber glow. Ember
// Danger is reserved for enemy telegraphs and never appears here. God-stuff
// violet never touches friendly output.
//
// Render-only: subscribes to sim events, reads nothing back, mutates no sim
// state, and draws all randomness from the COSMETIC stream.
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { makeGlowSprite } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { PALETTE } from '../../data/palette.js';

const HEAL = PALETTE.brightHeal;
const CORE = PALETTE.parchment;
const AMBER = PALETTE.hearthAmber;

// Render scaffold tunables (cosmetic timings — no brief number is invented
// here; the only world-space measurements come off the sim events themselves).
const ARC_LIFE = 0.34; // s
const ARC_CAP = 10;
const RING_LIFE = 0.46; // s
const RING_CAP = 10;
const FLASH_LIFE = 0.24; // s
const FLASH_CAP = 14;
const MOTE_CAP = 110;
const ARC_Y = 0.62; // ribbon apex lift over the ground
const TETHER_Y = 0.42;

export function createTechFx({ stage, bus, cosmetic }) {
  const root = new Group();
  root.name = 'techfx';
  root.renderOrder = 6; // above ground VFX, below projectiles
  stage.scene.add(root);

  const arcs = []; // { core, glow, age, life }
  const rings = []; // { mesh, age, life, r0, r1 }
  const flashes = []; // { s, age, life, size }
  const motes = [];
  const flashPool = [];
  const motePool = [];

  // ------------------------------------------------------------- primitives --
  function tubeMat(color, opacity, additive) {
    const m = new MeshBasicMaterial({
      color: new Color(color),
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false,
    });
    if (additive) m.blending = AdditiveBlending;
    return m;
  }

  // POOLED (certification fix D-r1, in-wave hitches). A Bounce chain or a
  // Siphon tether used to MINT two TubeGeometries per hop and dispose them
  // 0.34 s later, i.e. four GL buffers created and destroyed per technique
  // proc in the middle of a fight. The tube's segment counts are fixed, so a
  // rig is built once per width and RESHAPED in place afterwards: the GL
  // buffers are rewritten, never reallocated, and `renderer.info.memory
  // .geometries` stops sawtoothing during combat.
  const TUBULAR = 18;
  const RADIAL = 6;
  const arcPool = new Map(); // width key -> [{ core, glow }]
  const arcKey = (w) => w.toFixed(4);
  const flatCurve = new CatmullRomCurve3([
    new Vector3(0, 0, 0),
    new Vector3(0.25, 0, 0),
    new Vector3(0.5, 0, 0),
    new Vector3(0.75, 0, 0),
    new Vector3(1, 0, 0),
  ]);

  function reshapeTube(mesh, curve, radius) {
    // Build the shape off to the side and copy it into the live buffers. The
    // scratch geometry is never drawn, so the renderer never registers it.
    const tmp = new TubeGeometry(curve, TUBULAR, radius, RADIAL, false);
    mesh.geometry.attributes.position.copyArray(tmp.attributes.position.array);
    mesh.geometry.attributes.normal.copyArray(tmp.attributes.normal.array);
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.attributes.normal.needsUpdate = true;
    mesh.geometry.computeBoundingSphere();
    tmp.dispose();
  }

  function acquireArc(width) {
    const key = arcKey(width);
    const list = arcPool.get(key);
    if (list && list.length > 0) return list.pop();
    const core = new Mesh(
      new TubeGeometry(flatCurve, TUBULAR, width, RADIAL, false),
      tubeMat(CORE, 0.95, true)
    );
    const glow = new Mesh(
      new TubeGeometry(flatCurve, TUBULAR, width * 3.4, RADIAL, false),
      tubeMat(CORE, 0.34, true)
    );
    core.renderOrder = 8;
    glow.renderOrder = 7;
    return { core, glow, width };
  }

  // Bowed ribbon between two ground points: a bright core tube wrapped in a
  // fatter additive glow tube (§19.4 layers 1 and 2).
  function spawnArc(x0, z0, x1, z1, { color, coreColor = CORE, lift = ARC_Y, width = 0.05 } = {}) {
    if (arcs.length >= ARC_CAP) retireArc(arcs.length - 1);
    const a = new Vector3(x0, 0.35, z0);
    const b = new Vector3(x1, 0.35, z1);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y += lift;
    const q1 = a.clone().lerp(mid, 0.55);
    const q2 = b.clone().lerp(mid, 0.55);
    const curve = new CatmullRomCurve3([a, q1, mid, q2, b]);
    const rec = acquireArc(width);
    reshapeTube(rec.core, curve, width);
    reshapeTube(rec.glow, curve, width * 3.4);
    rec.core.material.color.set(coreColor);
    rec.core.material.opacity = 0.95;
    rec.glow.material.color.set(color);
    rec.glow.material.opacity = 0.34;
    rec.glow.scale.setScalar(1);
    root.add(rec.glow);
    root.add(rec.core);
    arcs.push({ core: rec.core, glow: rec.glow, width, age: 0, life: ARC_LIFE });
  }

  function retireArc(i) {
    const rec = arcs[i];
    if (!rec) return;
    root.remove(rec.core);
    root.remove(rec.glow);
    const key = arcKey(rec.width);
    let list = arcPool.get(key);
    if (!list) arcPool.set(key, (list = []));
    if (list.length < ARC_CAP) list.push({ core: rec.core, glow: rec.glow, width: rec.width });
    else {
      // fix-CAMPAIGN-r6: a record the full pool cannot keep gives its GL
      // buffers back instead of leaking them (never reached at the current
      // caps; kept so a cap change cannot reopen the leak).
      rec.core.geometry.dispose();
      rec.glow.geometry.dispose();
      rec.core.material.dispose();
      rec.glow.material.dispose();
    }
    arcs.splice(i, 1);
  }

  // Ground shock ring: expands r0 → r1 and fades. The 1.2 u Detonate radius
  // arrives on the event, so the ring is the real blast footprint.
  // POOLED per rim thickness for the same reason as the arcs: the ring is a
  // UNIT ring scaled per frame, so one buffer serves every Detonate and Echo
  // of that thickness for the whole session.
  const ringPool = new Map(); // thick key -> [mesh]
  const ringKey = (t) => t.toFixed(3);

  function spawnRing(x, z, r1, color, { r0 = 0.12, life = RING_LIFE, opacity = 0.85, thick = 0.16 } = {}) {
    if (rings.length >= RING_CAP) retireRing(rings.length - 1);
    const key = ringKey(thick);
    const list = ringPool.get(key);
    let mesh = list && list.length > 0 ? list.pop() : null;
    if (!mesh) {
      mesh = new Mesh(
        sharedGeo(`techfx-ring:${key}`, () => new RingGeometry(1 - thick, 1, 48)),
        tubeMat(color, opacity, true)
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 5;
    }
    mesh.material.color.set(color);
    mesh.material.opacity = opacity;
    mesh.position.set(x, 0.045, z);
    mesh.scale.setScalar(r0);
    root.add(mesh);
    rings.push({ mesh, thick, age: 0, life, r0, r1, opacity });
  }

  function retireRing(i) {
    const rec = rings[i];
    if (!rec) return;
    root.remove(rec.mesh);
    const key = ringKey(rec.thick);
    let list = ringPool.get(key);
    if (!list) ringPool.set(key, (list = []));
    if (list.length < RING_CAP) list.push(rec.mesh);
    rings.splice(i, 1);
  }

  // White-hot core flash (§19.4 layer 1 on every impact).
  function spawnFlash(x, z, size, color = CORE, y = 0.5) {
    if (flashes.length >= FLASH_CAP) {
      const old = flashes.shift();
      root.remove(old.s);
      flashPool.push(old.s);
    }
    const s = flashPool.pop() ?? makeGlowSprite({ color, size: 1, opacity: 1 });
    s.material.color.set(color);
    s.material.opacity = 1;
    s.scale.set(size, size, 1);
    s.position.set(x, y, z);
    root.add(s);
    flashes.push({ s, age: 0, life: FLASH_LIFE, size });
  }

  // Particles (§19.4 layer 3).
  function spawnMotes(x, z, { color = HEAL, count = 8, spread = 0.3, y = 0.3, rise = 1.3, out = 1.1 } = {}) {
    for (let i = 0; i < count; i++) {
      if (motes.length >= MOTE_CAP) break;
      const s = motePool.pop() ?? makeGlowSprite({ color, size: 1, opacity: 0.9 });
      s.material.color.set(color);
      s.material.opacity = 0.9;
      const size = cosmetic.range(0.06, 0.16);
      s.scale.set(size, size, 1);
      const a = cosmetic.range(0, Math.PI * 2);
      const r = cosmetic.range(0, spread);
      s.position.set(x + Math.cos(a) * r, y + cosmetic.range(0, 0.2), z + Math.sin(a) * r);
      root.add(s);
      motes.push({
        s,
        age: 0,
        life: cosmetic.range(0.35, 0.7),
        vy: cosmetic.range(rise * 0.45, rise),
        vx: Math.cos(a) * cosmetic.range(0, out),
        vz: Math.sin(a) * cosmetic.range(0, out),
      });
    }
  }

  // ----------------------------------------------------------- subscriptions --
  // Bounce: one arc per hop, drawn from the previous impact point to the new
  // victim. Heal chains ride Bright Heal; ricochets ride parchment + amber.
  bus.on('bounce_hop', (ev) => {
    if (ev.fromX === undefined || ev.x === undefined) return;
    const heal = ev.mode === 'heal';
    const glowColor = heal ? HEAL : AMBER;
    spawnArc(ev.fromX, ev.fromZ, ev.x, ev.z, {
      color: glowColor,
      coreColor: heal ? HEAL : CORE,
    });
    spawnFlash(ev.x, ev.z, heal ? 1.05 : 0.95, heal ? HEAL : CORE, 0.5);
    spawnMotes(ev.x, ev.z, { color: glowColor, count: 9, spread: 0.24, rise: heal ? 1.5 : 0.9 });
  });

  // Siphon drain: a low taut tether ally → enemy, then a spark on the enemy.
  bus.on('siphon_drain', (ev) => {
    if (ev.ax === undefined || ev.x === undefined) return;
    spawnArc(ev.ax, ev.az, ev.x, ev.z, {
      color: AMBER,
      coreColor: CORE,
      lift: TETHER_Y,
      width: 0.035,
    });
    spawnFlash(ev.x, ev.z, 0.8, CORE, 0.45);
    spawnMotes(ev.x, ev.z, { color: AMBER, count: 7, spread: 0.2, rise: 0.8 });
  });

  bus.on('siphon_selfheal', (ev) => {
    if (ev.x === undefined) return;
    spawnMotes(ev.x, ev.z, { color: HEAL, count: 8, spread: 0.26, rise: 1.6, out: 0.4 });
  });

  // Detonate: the burst radius rides the event, so the ring is the true 1.2 u
  // footprint — core flash + expanding rim + debris.
  bus.on('detonate', (ev) => {
    const heal = ev.mode === 'heal';
    const r = ev.radius ?? 1.2;
    const glowColor = heal ? HEAL : AMBER;
    spawnRing(ev.x, ev.z, r, glowColor, { opacity: 0.9 });
    spawnRing(ev.x, ev.z, r * 0.62, heal ? HEAL : CORE, {
      life: RING_LIFE * 0.7,
      opacity: 0.55,
      thick: 0.3,
    });
    spawnFlash(ev.x, ev.z, r * 1.7, heal ? HEAL : CORE, 0.45);
    spawnMotes(ev.x, ev.z, {
      color: glowColor,
      count: 16,
      spread: r * 0.5,
      rise: heal ? 1.8 : 1.2,
      out: 2.0,
    });
  });

  // Echo: one ghost ring off the caster when the delayed recast fires.
  bus.on('echo_recast', (ev) => {
    if (ev.x === undefined) return;
    spawnRing(ev.x, ev.z, 1.15, PALETTE.bone, {
      r0: 0.2,
      life: 0.55,
      opacity: 0.5,
      thick: 0.1,
    });
    spawnFlash(ev.x, ev.z, 0.9, PALETTE.bone, 0.6);
  });

  // --------------------------------------------------------------- update --
  let lastT = null;
  function update(tSec) {
    const dt = lastT === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - lastT));
    lastT = tSec;

    for (let i = arcs.length - 1; i >= 0; i--) {
      const a = arcs[i];
      a.age += dt;
      const t = a.age / a.life;
      if (t >= 1) {
        retireArc(i);
        continue;
      }
      // Snap in, then fade — an instant impact holds its peak for ~5 frames.
      const k = t < 0.25 ? 1 : 1 - (t - 0.25) / 0.75;
      a.core.material.opacity = 0.95 * k;
      a.glow.material.opacity = 0.34 * k;
      const s = 1 + 0.16 * (1 - k);
      a.glow.scale.setScalar(s);
    }

    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.age += dt;
      const t = r.age / r.life;
      if (t >= 1) {
        retireRing(i);
        continue;
      }
      const ease = 1 - (1 - t) * (1 - t) * (1 - t);
      r.mesh.scale.setScalar(r.r0 + (r.r1 - r.r0) * ease);
      r.mesh.material.opacity = r.opacity * (1 - t);
    }

    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.age += dt;
      const t = f.age / f.life;
      if (t >= 1) {
        root.remove(f.s);
        flashPool.push(f.s);
        flashes.splice(i, 1);
        continue;
      }
      f.s.material.opacity = 1 - t * t;
      const g = f.size * (1 + 0.55 * t);
      f.s.scale.set(g, g, 1);
    }

    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.age += dt;
      const t = m.age / m.life;
      if (t >= 1) {
        root.remove(m.s);
        motePool.push(m.s);
        motes.splice(i, 1);
        continue;
      }
      m.s.position.x += m.vx * dt;
      m.s.position.z += m.vz * dt;
      m.s.position.y += m.vy * dt;
      m.vy -= 1.4 * dt;
      m.vx *= 1 - 2.2 * dt;
      m.vz *= 1 - 2.2 * dt;
      m.s.material.opacity = 0.9 * (1 - t);
    }
  }

  // @gnt:M2 RESTORE-RESYNC begin — a load cuts away every in-flight
  // technique flourish (they belonged to the moment that left): arcs and
  // rings go back to their pools, flashes and motes too.
  function returnAll() {
    for (let i = arcs.length - 1; i >= 0; i--) retireArc(i);
    for (let i = rings.length - 1; i >= 0; i--) retireRing(i);
    for (const f of flashes.splice(0)) {
      root.remove(f.s);
      flashPool.push(f.s);
    }
    for (const m of motes.splice(0)) {
      root.remove(m.s);
      motePool.push(m.s);
    }
  }
  bus.on('state_restored', returnAll);
  // @gnt:M2 RESTORE-RESYNC end
  // fix-CAMPAIGN-r6 (CR6-F2, PLAN §12.5 teardown): at a level boundary every
  // flourish goes back to its pool AND the pooled arc tubes hand their GL
  // buffers back (geometry.dispose(); the record and its arrays are kept and
  // three re-uploads them on the arc's next use). Arc tubes are the only
  // per-record geometry here; the pool's high-water mark is set by the most
  // arcs ever alive at once, which varies with frame timing, so without this
  // a later campaign could leave 2-4 more tubes registered than an earlier
  // identical one (the critic's off-scene TubeGeometry, r=0.05/0.17 and
  // 0.035/0.119).
  function levelTeardown() {
    returnAll();
    for (const list of arcPool.values()) {
      for (const rec of list) {
        rec.core.geometry.dispose();
        rec.glow.geometry.dispose();
      }
    }
  }
  bus.on('level_transit', levelTeardown);
  bus.on('run_end', levelTeardown);
  bus.on('return_to_camp', levelTeardown);
  return {
    update,
    debugCounts: () => ({
      arcs: arcs.length,
      rings: rings.length,
      flashes: flashes.length,
      motes: motes.length,
      pooledArcs: [...arcPool.values()].reduce((n, l) => n + l.length, 0),
    }),
  };
}
