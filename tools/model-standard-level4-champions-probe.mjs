#!/usr/bin/env node
// MODEL STANDARD, LEVEL IV CHAMPIONS (docs/MODEL_STANDARD.md "Level IV
// champions"): the faceted Hollow Choir and Vein Matron, headless.
//
//   1. the champion table builds the faceted rig with the champions' soft
//      flash (the classic rigs and the ?facet= flag are gone, AUDIT.md D1);
//   2. the rigs: the rig interface plus lab, points and react; the root's
//      first child carries the body (the hit overlay wraps it), the shadow is
//      a floor piece; every instanced part inked (crystal and lit parts
//      excepted); faceted geometry under every vertex-coloured material; the
//      hit flash's white emissive on every body mat; named points (B8); no
//      Ember, Bright Heal or Violet in the body;
//   3. the [M] beats: strikes of 2 to 3 frames then a held contact (B2), off
//      on the first frame (B4), one overshoot in the settle (B5), the lab's
//      cue on the contact;
//   4. no feet, by rule: the Choir floats (its hems hold their hover through
//      a walk with a turn and every ability: never on the floor, never past
//      the sway and lift); the Matron glides on her roots (the lowest root
//      tip stays on the floor through a walk and every ability but the
//      pulse's heave, never under it); both lean into their travel;
//   5. the sim drives each move: the Shard Hymn turns the three to the lane
//      through its warning and sings on the resolve; the Discord swells and
//      bursts on the resolve; the Vein Lash draws the whip back through its
//      warning and cracks it to the lane's length on the resolve; the Heart
//      Pulse rears and beats on the resolve; telegraphs are known by move and
//      start tick (a fresh copy every tick never restarts one); on a slow
//      frame a strike runs no further than its contact while the warning is
//      live;
//   6. the whip: its tip at the lane's end when cracked, every segment joined
//      to the last in every pose, the hanging whip's tip below the shoulder;
//   7. spawn-in on a new champion only; the rage flares the tell;
//   8. the lab: an entry per champion after the Level II pair, each ability
//      plays without a throw.
//
//   node tools/model-standard-level4-champions-probe.mjs
// Exit code 1 on any failure.

// The rigs paint a few canvases (glow sprites): a stub is enough.
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === 'canvas' ? {} : () => grad), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { Color, Group, Matrix4, Vector3 } = await import('three');
const { FRAME, HOLD_SEC, STRIKE_SEC, SPAWN_SEC } = await import('../src/render/facet/beats.js');
const choirM = await import('../src/render/enemies/champfacet/hollowchoir.js');
const matronM = await import('../src/render/enemies/champfacet/veinmatron.js');
const { CHAMPION_BUILDERS, CHAMPION_FLASH } = await import('../src/render/enemies/champions.js');
const { LAB_ENTRIES: LEVEL2 } = await import('../src/scenes/modellab-champions.js');
const { LAB_ENTRIES } = await import('../src/scenes/modellab-champions-level4.js');

const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info !== '' ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const DT = 1 / 60;
const r3 = (v) => Math.round(v * 1000) / 1000;
const cosmetic = { range: (a, b) => (a + b) / 2, next: () => 0.5, pick: (l) => l[0], int: (a) => a, chance: () => false };

const CHAMPS = [
  { kind: 'hollow_choir', name: 'Hollow Choir', build: choirM.buildHollowChoirFacet, abilities: choirM.CHOIR_ABILITIES, channels: choirM.abilityChannels, walk: choirM.CHOIR_WALK, points: ['tip', 'heart', 'mouth', 'crown'], contact: ['hymn', 'discord'], bare: /fingers|crystals|motes/ },
  { kind: 'vein_matron', name: 'Vein Matron', build: matronM.buildVeinMatronFacet, abilities: matronM.MATRON_ABILITIES, channels: matronM.abilityChannels, walk: matronM.MATRON_WALK, points: ['tip', 'heart', 'eye', 'crown'], contact: ['lash', 'pulse'], bare: /veins|knuckles|lining|spines|gems|beads/ },
];

// --- 1. the table ----------------------------------------------------------------------
{
  const kinds = CHAMPS.map((c) => c.kind);
  const built = kinds.map((k) => CHAMPION_BUILDERS[k](cosmetic));
  check("the champion table builds the faceted rigs with the champions' soft flash", built.every((b) => b.group.userData.modelStandard === true && b.flashScale === CHAMPION_FLASH && typeof b.pose === 'function'), built.map((b) => b.flashScale));
}

// --- 2. the rigs -------------------------------------------------------------------
function inkReport(root) {
  const parts = [];
  root.traverse((o) => {
    if (!o.isInstancedMesh || o.userData.inkHull) return;
    const hull = o.children.find((ch) => ch.isInstancedMesh && ch.instanceMatrix === o.instanceMatrix);
    parts.push({ name: o.name, inked: !!hull });
  });
  return parts;
}
function floorPiece(o) {
  let ok = true;
  o.updateMatrixWorld(true);
  o.traverse((x) => {
    if (!x.isMesh) return;
    const p = new Vector3();
    x.getWorldPosition(p);
    if (p.y > 0.1) ok = false;
  });
  return ok;
}
for (const B of CHAMPS) {
  const r = B.build();
  const iface = ['group', 'mats', 'setYaw', 'pose', 'lab', 'points', 'react'].filter((k) => !(k in r));
  check(`${B.name}: the rig interface plus lab, points and react`, iface.length === 0 && r.group.userData.modelStandard === true, iface);
  const body = r.group.children[0];
  let meshes = 0;
  body.traverse((x) => x.isMesh && meshes++);
  const others = r.group.children.slice(1);
  check(`${B.name}: the root's first child carries the body, the rest are floor pieces`, meshes > 30 && others.length >= 1 && others.every(floorPiece), others.map((o) => o.name || o.type));
  const ink = inkReport(r.group);
  const bare = ink.filter((p) => !p.inked && !B.bare.test(p.name)).map((p) => p.name);
  check(`${B.name}: every instanced part carries its ink (crystal and lit parts excepted)`, ink.length >= 8 && bare.length === 0, { parts: ink.length, bare });
  const black = [];
  r.group.traverse((o) => {
    if (!o.isMesh || o.userData.inkHull) return;
    for (const m of [].concat(o.material)) if (m && m.vertexColors && !o.geometry.getAttribute('color')) black.push(o.name || o.geometry.type);
  });
  check(`${B.name}: every vertex-coloured material sits on faceted geometry`, black.length === 0, black);
  const flash = r.mats.filter((m) => !(m.emissive && m.emissiveIntensity >= 0 && m.emissiveIntensity < 0.5));
  check(`${B.name}: every body material takes the hit flash (emissive, off or a crystal's low glow at rest)`, r.mats.length >= 6 && flash.length === 0, { mats: r.mats.length, bad: flash.length });
  const pts = B.points.filter((n) => !(r.points[n] && r.points[n].isObject3D));
  let rooted = true;
  for (const p of Object.values(r.points)) {
    let x = p;
    while (x.parent) x = x.parent;
    if (x !== r.group) rooted = false;
  }
  check(`${B.name}: named points (${B.points.join(', ')}) (B8)`, pts.length === 0 && rooted, pts);
  const R = r.react;
  check(`${B.name}: the hit overlay's tuning (a champion's half squash and flinch, its small hop)`, R && R.squash === 1 && R.flinch === 1 && R.knock === 1 && R.midY > 0.3, R);
  const close = (a, b) => {
    const x = new Color(a);
    const y = new Color(b);
    return Math.abs(x.r - y.r) + Math.abs(x.g - y.g) + Math.abs(x.b - y.b) < 0.12;
  };
  const mats = new Set();
  r.group.traverse((o) => {
    if (!o.isMesh || o.userData.inkHull) return;
    for (const m of [].concat(o.material)) if (m && m.color && !m.map) mats.add(m);
  });
  const reserved = [...mats].filter((m) => ['#FF5A36', '#5FE873', '#B79CF0'].some((c) => close(m.color.getHex(), c))).map((m) => `#${m.color.getHexString()}`);
  check(`${B.name}: no Ember, Bright Heal or Violet in the body`, reserved.length === 0, reserved);
}

// --- 3. the [M] beats ------------------------------------------------------------------
const dist = (A, B, keys) => Math.sqrt(keys.reduce((s, k) => s + (A[k] - B[k]) ** 2, 0));
for (const B of CHAMPS) {
  for (const id of B.contact) {
    const tl = B.abilities[id];
    const ph = tl.phases;
    const strikes = [];
    for (let i = 0; i < ph.length - 1; i++) if (Math.abs(ph[i].dur - STRIKE_SEC) < 1e-9) strikes.push(i);
    const held = strikes.filter((i) => ph[i + 1].dur >= HOLD_SEC - 1e-9);
    check(`${B.name} ${tl.label}: a strike of 2 to 3 frames, then the contact held (B2)`, strikes.length > 0 && held.length === strikes.length && STRIKE_SEC <= 3 * FRAME, ph.map((p) => `${p.id} ${r3(p.dur)}`));
    for (const i of strikes) {
      const at = tl.startOf(ph[i].id);
      const a = B.channels(id, tl.sample(at + 1e-6));
      const keys = Object.keys(a);
      const m = B.channels(id, tl.sample(at + FRAME));
      const b = B.channels(id, tl.sample(at + ph[i].dur - 1e-6));
      const k = dist(a, m, keys) / Math.max(1e-6, dist(a, b, keys));
      check(`${B.name} ${tl.label}: the ${ph[i].id} leaves on its first frame (B4)`, k > 0.55, r3(k));
    }
    const last = ph[ph.length - 1];
    const s0 = B.channels(id, tl.sample(tl.startOf(last.id) + 1e-6));
    let crossed = false;
    for (let k = 0.62; k <= 1; k += 0.02) {
      const c = B.channels(id, tl.sample(tl.startOf(last.id) + last.dur * k));
      for (const key of Object.keys(c)) if (Math.abs(s0[key]) > 0.05 && c[key] * s0[key] < 0) crossed = true;
    }
    check(`${B.name} ${tl.label}: its ${last.id} overshoots rest once (B5)`, crossed);
    const cue = (tl.cues || [])[0];
    const contactAt = strikes.length ? tl.startOf(ph[strikes[strikes.length - 1]].id) + STRIKE_SEC : -1;
    check(`${B.name} ${tl.label}: the lab's cue fires on the contact`, cue && Math.abs(cue.at - contactAt) < 1e-6, cue);
  }
}

// --- 4. no feet, by rule ---------------------------------------------------------------
function drive(r, e, frames, move, out) {
  for (let f = 0; f < frames; f++) {
    out.t += DT;
    out.tick += 1;
    if (move) move(f);
    out.world.updateMatrixWorld(true);
    r.pose({ t: out.t, tick: out.tick, e });
    if (out.hem) out.hem.push(r.lab.hem ? r.lab.hem() : r.lab.base());
    if (out.each) out.each(f);
  }
  return out;
}
const runner = (r) => {
  const world = new Group();
  world.add(r.group);
  return { world, t: 0, tick: 0, hem: null, each: null };
};
// a walk with a turn, a rest, a spin in place, then each ability with its
// warning: the band the hem (or the base) stayed in
function band(B, r, st, e) {
  st.hem = [];
  let yaw = 0;
  drive(r, e, 300, (f) => {
    yaw += (f < 150 ? 0.4 : -0.6) * DT;
    r.group.position.x += Math.sin(yaw) * B.walk * DT;
    r.group.position.z += Math.cos(yaw) * B.walk * DT;
    r.setYaw(yaw);
  }, st);
  drive(r, e, 120, null, st);
  let y = yaw;
  drive(r, e, 90, () => {
    y += (yaw + Math.PI * 0.999 - y) * (1 - Math.exp(-9 * DT));
    r.setYaw(y);
  }, st);
  return { lo: Math.min(...st.hem), hi: Math.max(...st.hem) };
}
{
  const r = choirM.buildHollowChoirFacet();
  const st = runner(r);
  const e = { id: 1, telegraph: null, rage: false };
  drive(r, e, 20, null, st);
  const w = band(CHAMPS[0], r, st, e);
  check('Hollow Choir: it has no feet; the hems hold their hover through a walk with a turn, a rest and a spin (never on the floor, never past the sway)', r.lab.feet().length === 0 && w.lo > 0.3 && w.hi < 0.85, { lo: r3(w.lo), hi: r3(w.hi) });
  let lean = 0;
  st.hem = null;
  r.setYaw(0);
  drive(r, e, 90, () => {
    r.group.position.z += choirM.CHOIR_WALK * DT;
    lean = Math.max(lean, r.lab.parts.float.rotation.x);
  }, st);
  check('Hollow Choir: it leans into its travel', lean > 0.03, r3(lean));
  st.hem = [];
  for (const id of ['hymn', 'discord']) {
    const tl = choirM.CHOIR_ABILITIES[id];
    for (let t = 0; t <= tl.duration; t += 0.02) {
      r.lab.pose({ dt: DT, ability: id, abT: t });
      st.hem.push(r.lab.hem());
    }
  }
  const lo = Math.min(...st.hem);
  const hi = Math.max(...st.hem);
  check('Hollow Choir: the hems hold their hover through the hymn and the discord (a lean and a reach, never a jump)', lo > 0.3 && hi < 1.0, { lo: r3(lo), hi: r3(hi) });
}
{
  const r = matronM.buildVeinMatronFacet();
  const st = runner(r);
  const e = { id: 2, telegraph: null, rage: false };
  drive(r, e, 20, null, st);
  const w = band(CHAMPS[1], r, st, e);
  check('Vein Matron: she has no feet; the lowest root tip stays on the floor through a walk with a turn, a rest and a spin (never under it, never lifted)', r.lab.feet().length === 0 && w.lo > -0.03 && w.hi < 0.2, { lo: r3(w.lo), hi: r3(w.hi) });
  let lean = 0;
  st.hem = null;
  r.setYaw(0);
  drive(r, e, 90, () => {
    r.group.position.z += matronM.MATRON_WALK * DT;
    lean = Math.max(lean, r.lab.parts.pivot.rotation.x);
  }, st);
  check('Vein Matron: she leans into her travel', lean > 0.03, r3(lean));
  const base = { lash: [], pulse: [] };
  for (const id of ['lash', 'pulse']) {
    const tl = matronM.MATRON_ABILITIES[id];
    for (let t = 0; t <= tl.duration; t += 0.02) {
      r.lab.pose({ dt: DT, ability: id, abT: t });
      base[id].push(r.lab.base());
    }
  }
  check('Vein Matron: the base stays on the floor through the lash; the pulse heaves it up and the beat slams it flat', Math.min(...base.lash) > -0.03 && Math.max(...base.lash) < 0.25 && Math.min(...base.pulse) > -0.03 && Math.max(...base.pulse) > 0.25 && base.pulse[base.pulse.length - 1] < 0.2, { lash: [r3(Math.min(...base.lash)), r3(Math.max(...base.lash))], pulse: [r3(Math.min(...base.pulse)), r3(Math.max(...base.pulse))] });
}

// --- 5. the sim drives each move --------------------------------------------------------
const peak = { max: {}, min: {} };
const watch = (r) => {
  const c = r.lab.channels();
  for (const [k, v] of Object.entries(c)) {
    peak.max[k] = Math.max(peak.max[k] ?? -Infinity, v);
    peak.min[k] = Math.min(peak.min[k] ?? Infinity, v);
  }
};
const reset = () => {
  peak.max = {};
  peak.min = {};
};
function warned(r, st, e, move, W, windKey, strikeKey, extra = {}) {
  const T0 = st.tick + 1;
  let restarted = false;
  let atResolve = null;
  reset();
  drive(r, e, W, (f) => {
    e.telegraph = { move, startTick: T0, resolveTick: T0 + W, x: 0, z: 0, ...extra };
    watch(r);
    const c = r.lab.channels();
    if (f > 10 && f < W - 6 && c[windKey] < peak.max[windKey] - 0.2) restarted = true;
    if (f === W - 1) atResolve = c[strikeKey];
  }, st);
  const wind = peak.max[windKey];
  e.telegraph = null;
  reset();
  drive(r, e, 4, () => watch(r), st);
  const struck = peak.max[strikeKey];
  return { wind, atResolve, struck, restarted };
}
{
  // the Hollow Choir: the 60-tick cone, the 72-tick ring
  const r = choirM.buildHollowChoirFacet();
  const st = runner(r);
  const e = { id: 7, telegraph: null, rage: false };
  drive(r, e, 20, null, st);
  const hy = warned(r, st, e, 'shard_hymn', 60, 'turn', 'reach');
  drive(r, e, 60, null, st);
  check('Shard Hymn: the three turn to the lane through its warning and sing on the resolve', hy.wind > 0.95 && hy.atResolve > 0 && hy.struck > 0.25, hy);
  check('Shard Hymn: a fresh copy of the warning every tick never restarts the gather', !hy.restarted);
  const di = warned(r, st, e, 'discord', 72, 'heart', 'drop');
  drive(r, e, 60, null, st);
  check('Discord: the heart swells through its warning and the three burst out on the resolve', di.wind > 0.95 && di.atResolve > 0 && di.struck > 0.95, di);
  {
    const r2 = choirM.buildHollowChoirFacet();
    const s2 = runner(r2);
    const e2 = { id: 8, telegraph: null };
    drive(r2, e2, 10, null, s2);
    const T = s2.tick + 1;
    e2.telegraph = { move: 'shard_hymn', startTick: T, resolveTick: T + 60, x: 0, z: 0 };
    for (let f = 0; f < 60; f++) {
      s2.t += 1;
      s2.tick += 60;
      r2.pose({ t: s2.t, tick: s2.tick, e: e2 });
    }
    const c = r2.lab.channels();
    check('Hollow Choir: on a slow frame the sing runs no further than its contact while the warning is live', c.mouth > 0.95 && c.squash > 0.95, { mouth: r3(c.mouth), squash: r3(c.squash) });
  }
}
{
  // the Vein Matron: the 58-tick lash lane (6 u), the 70-tick ring
  const r = matronM.buildVeinMatronFacet();
  const st = runner(r);
  const e = { id: 9, telegraph: null, rage: false };
  drive(r, e, 20, null, st);
  const la = warned(r, st, e, 'vein_lash', 58, 'back', 'out', { length: 6, fromX: 0, fromZ: 0 });
  // the whip is out at the lane's end
  st.world.updateMatrixWorld(true);
  const tip = r.points.tip.getWorldPosition(new Vector3());
  let drank = 0;
  drive(r, e, 60, () => (drank = Math.max(drank, r.lab.channels().drink)), st);
  check("Vein Lash: the whip draws back through its warning, cracks on the resolve to the lane's end, and she drinks", la.wind > 0.95 && la.atResolve > 0 && la.struck > 0.95 && Math.abs(tip.z - 6) < 0.6 && tip.y > 0.3 && tip.y < 1.6 && drank > 0.9 && r.lab.reach() === 6, { ...la, tip: [r3(tip.x), r3(tip.y), r3(tip.z)], drank: r3(drank) });
  check('Vein Lash: a fresh copy of the warning every tick never restarts the draw', !la.restarted);
  const pu = warned(r, st, e, 'heart_pulse', 70, 'rootLift', 'fling');
  drive(r, e, 60, null, st);
  check('Heart Pulse: she rears with the roots lifted through its warning and beats on the resolve', pu.wind > 0.95 && pu.atResolve > 0 && pu.struck > 0.95, pu);
  {
    const r2 = matronM.buildVeinMatronFacet();
    const s2 = runner(r2);
    const e2 = { id: 10, telegraph: null };
    drive(r2, e2, 10, null, s2);
    const T = s2.tick + 1;
    e2.telegraph = { move: 'heart_pulse', startTick: T, resolveTick: T + 70, x: 0, z: 0 };
    for (let f = 0; f < 70; f++) {
      s2.t += 1;
      s2.tick += 60;
      r2.pose({ t: s2.t, tick: s2.tick, e: e2 });
    }
    const c = r2.lab.channels();
    check('Vein Matron: on a slow frame the beat runs no further than its contact while the warning is live', c.fling > 0.95 && c.squash > 0.95, { fling: r3(c.fling), squash: r3(c.squash) });
  }
}

// --- 6. the whip --------------------------------------------------------------------------
{
  const r = matronM.buildVeinMatronFacet();
  const W = r.lab.parts.whips;
  const m = new Matrix4();
  const v = new Vector3();
  let gap = 0;
  let hangY = -Infinity;
  const SEGS = W[1].pts.length - 1;
  for (const [id, t] of [[null, 0], ['lash', 0.4], ['lash', matronM.MATRON_ABILITIES.lash.startOf('hold') + 0.02], ['pulse', 0.6], ['pulse', matronM.MATRON_ABILITIES.pulse.startOf('hold') + 0.02]]) {
    r.lab.pose({ dt: DT, ability: id, abT: t });
    for (const w of W) {
      for (let i = 0; i < SEGS; i++) {
        // each segment is laid at its point, hanging to the next: the laid
        // position matches the chain's point
        w.segs.getMatrixAt(i, m);
        v.setFromMatrixPosition(m);
        gap = Math.max(gap, v.distanceTo(w.pts[i]));
      }
      if (id === null) hangY = Math.max(hangY, w.pts[SEGS].y - w.sh.y);
    }
  }
  check("Vein Matron: every whip segment sits on the chain's point in every pose, and the hanging whips' tips fall below the shoulders", gap < 1e-3 && hangY < -1.0, { gap: r3(gap), hangY: r3(hangY) });
}

// --- 7. spawn-in and rage -----------------------------------------------------------------
for (const B of CHAMPS) {
  const r = B.build();
  const st = runner(r);
  const e = { id: 1, telegraph: null };
  drive(r, e, 1, null, st);
  const g0 = r.lab.grow();
  drive(r, e, Math.ceil(SPAWN_SEC * 60) + 2, null, st);
  const g1 = r.lab.grow();
  r.group.position.x += 3; // a jump in place (a teleport): no spawn-in
  drive(r, e, 1, null, st);
  const g2 = r.lab.grow();
  drive(r, { id: 2, telegraph: null }, 1, null, st);
  const g3 = r.lab.grow();
  check(`${B.name}: grows in from the floor on a new champion only (B7)`, g0 < 0.5 && g1 === 1 && g2 === 1 && g3 < 0.5, { g0: r3(g0), g1, g2, g3: r3(g3) });
}
{
  const glow = (B, rage) => {
    const r = B.build();
    const st = runner(r);
    drive(r, { id: 1, telegraph: null, rage }, 30, null, st);
    let best = 0;
    r.group.traverse((o) => {
      if (o.isSprite && o.name === 'tell') best = Math.max(best, o.material.opacity);
    });
    return best;
  };
  for (const B of CHAMPS) check(`${B.name}: the rage flares the tell`, glow(B, true) > glow(B, false) + 0.05, { calm: r3(glow(B, false)), rage: r3(glow(B, true)) });
}

// --- 8. the lab ---------------------------------------------------------------------------
{
  check('the model lab lists both Level IV champions, after the Level II pair', LAB_ENTRIES.map((e) => e.id).join(',') === 'hollow_choir,vein_matron' && LEVEL2.map((e) => e.id).join(',').startsWith('briar_knight,moss_hart,sluice_warden,lockkeeper'), LAB_ENTRIES.map((e) => e.id));
  const bad = [];
  const vfx = new Proxy({}, { get: () => () => null });
  for (const E of LAB_ENTRIES) {
    try {
      const ent = E.build({ cosmetic, vfx, play: () => null });
      const world = new Group();
      world.add(ent.group);
      for (const [id] of E.abilities) {
        const tl = ent.timeline(id);
        ent.reset();
        for (let t = 0; t <= tl.duration; t += 1 / 30) {
          ent.update({ mode: 'ability', ability: id, movePhase: 0, t }, 1 / 30, t);
          for (const c of ent.cues(id)) if (Math.abs(c.at - t) < 1 / 60) ent.onCue(c.id, { x: 0, z: 0 });
        }
      }
      ent.update({ mode: 'move', ability: null, movePhase: 1, t: 0 }, 1 / 30, 0);
    } catch (err) {
      bad.push(`${E.id}: ${err.message}`);
    }
  }
  check('every lab entry plays every ability', bad.length === 0, bad);
}

console.log(fails.length ? `\n${fails.length} failed` : '\nall pass');
process.exit(fails.length ? 1 : 0);
