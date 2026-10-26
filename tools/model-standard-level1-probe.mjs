#!/usr/bin/env node
// MODEL STANDARD, LEVEL I BOSSES probe (v0.5.336) — headless Node, builds the
// rigs; no browser. The slice rebuilds the Hollow Stag, the Thornmother and
// the Gloam Wolf to the model standard (docs/MODEL_STANDARD.md) and measures
// the pilot's Barrow Wyrm against the [M] checklist (VFX_HIT_RULES §6.1).
// Visual only. This probe checks:
//   1. the flags: the three bosses play faceted by default, `?facet=` turns
//      them classic or picks them, and the classic rigs still build;
//   2. every rig: the classic interface plus lab, points and react; the root
//      holds the moving body in its first child and only floor pieces beside
//      it (the shared hit envelope wraps that child); every instanced part
//      inked; every vertex-coloured material on faceted geometry;
//   3. colour: no Ember, no Bright Heal, nothing in the amber family on a
//      model material (the Stag's warm floor pool is light, not a material
//      of the model, and keeps the classic's colour);
//   4. the [M] beats on every ability: a strike of at most 3 frames followed
//      by a held contact (B2), a strike that leaves on its first frame (B4),
//      a settle that overshoots rest once (B5), the spawn-in grow (B7), the
//      named points (B8), the rend's lunge (B9);
//   5. locked feet: walking the sim's speeds with turns, a planted foot never
//      slides, the feet step along the travel in alternating pairs, no leg is
//      stretched past its reach, and every foot is planted again at rest;
//   6. the sim drives each ability (telegraphs, modes, the volley's cooldown,
//      the leap), and the feet hold through all of it;
//   7. the Barrow Wyrm's re-measure: its strike and held contact, the settle
//      overshoot, the spawn-in, its points, and a height-only hit squash;
//   8. a pooled rig posed for a new boss spawns in again;
//   9. the lab: an entry per boss, each ability plays without a throw.
//
//   node tools/model-standard-level1-probe.mjs
// Exit code 1 on any failure.

// The rigs paint a few canvases (glow sprites, face decals): a stub is enough.
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === 'canvas' ? {} : () => grad), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { Color, Group, Vector3 } = await import('three');
const { MODEL_STANDARD, facetOn } = await import('../src/render/facet/flags.js');
const { FRAME, HOLD_SEC, STRIKE_SEC, SPAWN_SEC } = await import('../src/render/facet/beats.js');
const stagM = await import('../src/render/boss/stagfacet.js');
const thornM = await import('../src/render/boss/thornmotherfacet.js');
const wolfM = await import('../src/render/boss/gloamwolffacet.js');
const wyrmM = await import('../src/render/boss/wyrmfacet.js');
const { buildStag } = await import('../src/render/boss/stag.js');
const { buildThornmother } = await import('../src/render/boss/slice2.js');
const { buildGloamWolf } = await import('../src/render/boss/third.js');
const { LAB_ENTRIES } = await import('../src/scenes/modellab-bosses.js');
const { PALETTE } = await import('../src/data/palette.js');

const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info !== '' ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const DT = 1 / 60;
const r3 = (v) => Math.round(v * 1000) / 1000;

// The three bosses: their builders, timelines, walking speed and channels.
const BOSSES = [
  { kind: 'stag', name: 'Hollow Stag', build: stagM.buildStagFacet, classic: buildStag, abilities: stagM.STAG_ABILITIES, channels: stagM.abilityChannels, walk: stagM.STAG_WALK, feet: ['hoofFL', 'hoofFR', 'hoofHL', 'hoofHR'] },
  { kind: 'thornmother', name: 'Thornmother', build: thornM.buildThornmotherFacet, classic: buildThornmother, abilities: thornM.THORN_ABILITIES, channels: thornM.abilityChannels, walk: thornM.THORN_WALK, feet: ['hoofFL', 'hoofFR', 'hoofHL', 'hoofHR'] },
  { kind: 'gloamwolf', name: 'Gloam Wolf', build: wolfM.buildGloamWolfFacet, classic: buildGloamWolf, abilities: wolfM.WOLF_ABILITIES, channels: wolfM.abilityChannels, walk: wolfM.WOLF_WALK * (2.1 / 1.7), feet: ['pawFL', 'pawFR', 'pawHL', 'pawHR'] },
];

// --- 1. flags ----------------------------------------------------------------------
{
  const q = (s) => new URLSearchParams(s);
  const kinds = ['stag', 'thornmother', 'gloamwolf'];
  check('the Level I bosses play the model standard by default', kinds.every((k) => MODEL_STANDARD[k] === true && facetOn(k, q(''))) && facetOn('wyrm', q('')) && facetOn('tank', q('')));
  check('?facet=0 turns them classic', kinds.every((k) => !facetOn(k, q('facet=0'))));
  check('?facet=stag keeps only the Stag faceted', facetOn('stag', q('facet=stag')) && !facetOn('thornmother', q('facet=stag')) && !facetOn('gloamwolf', q('facet=stag')));
  check('bosses outside the slice stay classic', !facetOn('heron', q('')) && !facetOn('millwheel', q('')) && !facetOn('mireking', q('')));
  const classics = BOSSES.map((B) => B.classic()).filter((r) => r && r.group && typeof r.pose === 'function' && !r.group.userData.modelStandard);
  check('the classic rigs still build beside the faceted ones', classics.length === BOSSES.length);
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
// the root's floor pieces: flat, on the floor, no children that stand up
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
for (const B of BOSSES) {
  const r = B.build();
  const iface = ['group', 'mats', 'setYaw', 'setFlash', 'pose', 'lab', 'points', 'react'].filter((k) => !(k in r));
  check(`${B.name}: the classic interface plus lab, points and react`, iface.length === 0 && r.group.userData.modelStandard === true, iface);
  const body = r.group.children[0];
  const meshesIn = (o) => {
    let n = 0;
    o.traverse((x) => x.isMesh && n++);
    return n;
  };
  const others = r.group.children.slice(1);
  check(`${B.name}: the root's first child carries the body, the rest are floor pieces`, meshesIn(body) > 30 && others.every(floorPiece), others.map((o) => o.name || o.type));
  const ink = inkReport(r.group);
  // light, not ink-lined parts: the Stag's vein cores (inside their inked
  // beams and tines) and its glowing violet ridge and rune ring
  const bare = ink.filter((p) => !p.inked && !/veins|stag-ridge|stag-runes/.test(p.name)).map((p) => p.name);
  check(`${B.name}: every instanced part carries its ink`, ink.length >= 8 && bare.length === 0, { parts: ink.length, bare });
  const black = [];
  r.group.traverse((o) => {
    if (!o.isMesh || o.userData.inkHull) return;
    for (const m of [].concat(o.material)) if (m && m.vertexColors && !o.geometry.getAttribute('color')) black.push(o.name || o.geometry.type);
  });
  check(`${B.name}: every vertex-coloured material sits on faceted geometry`, black.length === 0, black);
  const pts = ['mouth', 'chest', 'tip', ...B.feet].filter((n) => !(r.points[n] && r.points[n].isObject3D));
  let rooted = true;
  for (const p of Object.values(r.points)) {
    let x = p;
    while (x.parent) x = x.parent;
    if (x !== r.group) rooted = false;
  }
  check(`${B.name}: named points for the mouth, chest, tip and each foot (B8)`, pts.length === 0 && rooted, pts);
  const R = r.react;
  check(`${B.name}: a hit envelope tuning (half squash and flinch, no knockback)`, R && R.squash > 0 && R.knock === 0 && R.midY > 0.3, R);
}

// --- 3. colour -----------------------------------------------------------------------
{
  const RESERVED = { ember: '#FF5A36', heal: '#5FE873' };
  const close = (a, b) => {
    const x = new Color(a);
    const y = new Color(b);
    return Math.abs(x.r - y.r) + Math.abs(x.g - y.g) + Math.abs(x.b - y.b) < 0.12;
  };
  const amber = (c) => {
    const srgb = c.clone().convertLinearToSRGB();
    const hsl = {};
    srgb.getHSL(hsl);
    const max = Math.max(srgb.r, srgb.g, srgb.b);
    const sat = max > 0 ? (max - Math.min(srgb.r, srgb.g, srgb.b)) / max : 0;
    return hsl.h * 360 >= 30 && hsl.h * 360 <= 50 && sat > 0.35 && hsl.l > 0.4;
  };
  for (const B of BOSSES) {
    const r = B.build();
    const mats = new Set();
    r.group.traverse((o) => {
      if (!o.isMesh || o.userData.inkHull) return;
      for (const m of [].concat(o.material)) if (m && m.color && !m.map && !m.isShaderMaterial) mats.add(m);
    });
    const all = [...mats];
    const reserved = all.filter((m) => close(m.color.getHex(), RESERVED.ember) || close(m.color.getHex(), RESERVED.heal)).map((m) => `#${m.color.getHexString()}`);
    const amb = all.filter((m) => amber(m.color)).map((m) => `#${m.color.getHexString()}`);
    check(`${B.name}: no Ember or Bright Heal, nothing in the amber family`, reserved.length === 0 && amb.length === 0, { reserved, amb });
  }
}

// --- 4. the [M] beats ------------------------------------------------------------------
// The strike phases: a phase of STRIKE_SEC, then a held contact of HOLD_SEC or
// more; every ability with a contact has at least one.
const CONTACT = {
  stag: ['quake', 'trample'],
  thornmother: ['volley', 'charge'],
  gloamwolf: ['pounce', 'rend', 'howl'],
  wyrm: ['breath', 'burrow'],
};
const dist = (A, B, keys) => Math.sqrt(keys.reduce((s, k) => s + (A[k] - B[k]) ** 2, 0));
function beats(name, kind, abilities, channels) {
  for (const id of CONTACT[kind]) {
    const tl = abilities[id];
    const ph = tl.phases;
    const strikes = [];
    for (let i = 0; i < ph.length - 1; i++) if (Math.abs(ph[i].dur - STRIKE_SEC) < 1e-9) strikes.push(i);
    const held = strikes.filter((i) => ph[i + 1].dur >= HOLD_SEC - 1e-9);
    check(`${name} ${tl.label}: a strike of 2 to 3 frames, then the contact held (B2)`, strikes.length > 0 && held.length === strikes.length && STRIKE_SEC <= 3 * FRAME, ph.map((p) => `${p.id} ${r3(p.dur)}`));
    // B4: one frame into the strike the pose has gone most of the way
    for (const i of strikes) {
      const at = tl.startOf(ph[i].id);
      const keys = Object.keys(channels(id, tl.sample(at + 1e-6)));
      const a = channels(id, tl.sample(at + 1e-6));
      const m = channels(id, tl.sample(at + FRAME));
      const b = channels(id, tl.sample(at + ph[i].dur - 1e-6));
      const k = dist(a, m, keys) / Math.max(1e-6, dist(a, b, keys));
      check(`${name} ${tl.label}: the ${ph[i].id} leaves on its first frame (B4)`, k > 0.55, r3(k));
    }
    // B5: the settle crosses rest once
    const last = ph[ph.length - 1];
    const s0 = channels(id, tl.sample(tl.startOf(last.id) + 1e-6));
    let crossed = false;
    for (let k = 0.62; k <= 1; k += 0.02) {
      const c = channels(id, tl.sample(tl.startOf(last.id) + last.dur * k));
      for (const key of Object.keys(c)) if (Math.abs(s0[key]) > 0.05 && c[key] * s0[key] < 0) crossed = true;
    }
    check(`${name} ${tl.label}: its ${last.id} overshoots rest once (B5)`, crossed);
  }
}
for (const B of BOSSES) beats(B.name, B.kind, B.abilities, B.channels);
// B9: the rend pulls back, drives past rest and comes home
{
  const tl = wolfM.WOLF_ABILITIES.rend;
  const at = (id, k) => wolfM.abilityChannels('rend', tl.sample(tl.startOf(id) + tl.phases.find((p) => p.id === id).dur * k));
  check('Gloam Wolf Rend: pulls back, lunges past rest, squashes on contact (B9)', at('wind', 0.9).reach < -0.1 && at('hold', 0.5).reach > 0.4 && at('hold', 0.5).squash > 0.9 && Math.abs(at('back', 1).reach) < 0.05, { wind: r3(at('wind', 0.9).reach), hold: r3(at('hold', 0.5).reach) });
}

// --- 5. locked feet ---------------------------------------------------------------------
// Pose a rig through a run of frames; `move(f)` moves the root (and may set
// the entity's fields). Reports the worst slide of a planted foot, the steps,
// how the steps alternate and the most stretched leg.
function drive(r, e, frames, move, out) {
  const world = out.world;
  for (let f = 0; f < frames; f++) {
    out.t += DT;
    if (move) move(f);
    world.updateMatrixWorld(true);
    r.pose({ t: out.t, hpFrac: 1, e });
    const feet = r.lab.feet();
    feet.forEach((ft, i) => {
      const p = out.prev[i];
      if (p && p.planted && ft.planted && p.steps === ft.steps) out.slide = Math.max(out.slide, Math.hypot(ft.drawnX - p.x, ft.drawnZ - p.z));
      if (p && ft.steps > p.steps) out.order.push(ft.group);
      out.prev[i] = { planted: ft.planted, x: ft.drawnX, z: ft.drawnZ, steps: ft.steps };
    });
  }
  return out;
}
const runner = (r) => {
  const world = new Group();
  world.add(r.group);
  return { world, t: 0, slide: 0, prev: [], order: [] };
};
for (const B of BOSSES) {
  const r = B.build();
  const st = runner(r);
  const e = { id: 1, telegraph: null, mode: B.kind === 'gloamwolf' ? 'stalk' : 'root', lungeTicksLeft: 0, nextVolleyTick: 300 };
  drive(r, e, 20, null, st); // the spawn-in
  st.slide = 0;
  const steps0 = r.lab.feet().map((f) => f.steps);
  // a walk with a slow turn, at the sim's speed (the wolf's enraged speed)
  let yaw = 0;
  drive(r, e, 300, (f) => {
    yaw += (f < 150 ? 0.4 : -0.6) * DT;
    r.group.position.x += Math.sin(yaw) * B.walk * DT;
    r.group.position.z += Math.cos(yaw) * B.walk * DT;
    r.setYaw(yaw);
  }, st);
  const steps = r.lab.feet().map((f, i) => f.steps - steps0[i]);
  let alt = 0;
  for (let i = 1; i < st.order.length; i++) if (st.order[i] !== st.order[i - 1]) alt++;
  check(`${B.name}: walking with a turn, a planted foot never slides`, st.slide < 1e-4, r3(st.slide));
  check(`${B.name}: every foot steps along the travel`, steps.every((n) => n >= 4), steps);
  check(`${B.name}: the steps alternate between the two diagonal pairs`, st.order.length > 8 && alt / (st.order.length - 1) > 0.3, { landings: st.order.length, switches: alt });
  drive(r, e, 45, null, st);
  check(`${B.name}: at rest every foot is planted again`, r.lab.feet().every((f) => f.planted), r.lab.feet().map((f) => f.planted));
}

// --- 6. the sim drives each ability ------------------------------------------------------
const peak = { max: {} };
const watch = (r) => {
  const c = r.lab.channels();
  for (const [k, v] of Object.entries(c)) peak.max[k] = Math.max(peak.max[k] ?? -Infinity, v);
};
{
  // the Stag: the quake's telegraph (stretched), its resolve, the trample's lunge
  const r = stagM.buildStagFacet();
  const st = runner(r);
  const e = { id: 7, telegraph: null, lungeTicksLeft: 0 };
  drive(r, e, 20, null, st);
  st.slide = 0;
  peak.max = {};
  e.telegraph = { startTick: 0, resolveTick: 60 };
  drive(r, e, 60, () => watch(r), st);
  const reared = peak.max.rear;
  e.telegraph = null;
  peak.max = {};
  drive(r, e, 60, () => watch(r), st);
  const slam = peak.max.squash;
  e.lungeTicksLeft = 12;
  peak.max = {};
  drive(r, e, 50, () => {
    watch(r);
    if (e.lungeTicksLeft > 0) {
      e.lungeTicksLeft--;
      r.group.position.z += 5.4 * DT;
    }
  }, st);
  check('Hollow Stag: the quake rears through its warning, slams on the resolve, the trample lowers the rack', reared > 0.9 && slam > 0.9 && peak.max.stride > 0.5, { reared: r3(reared), slam: r3(slam) });
  drive(r, e, 40, null, st);
  check('Hollow Stag: the hooves hold through the quake and the trample', st.slide < 1e-4 && r.lab.feet().every((f) => f.planted), r3(st.slide));
}
{
  // the Thornmother: a volley (its cooldown jumps), the lane charge's warning,
  // the 10 u/s charge, the skid
  const r = thornM.buildThornmotherFacet();
  const st = runner(r);
  const e = { id: 9, telegraph: null, mode: 'root', nextVolleyTick: 300 };
  drive(r, e, 20, null, st);
  st.slide = 0;
  e.nextVolleyTick = 600;
  peak.max = {};
  drive(r, e, 30, () => watch(r), st);
  const volley = peak.max.pop;
  e.telegraph = { attack: 'charge', startTick: 0, resolveTick: 60 };
  peak.max = {};
  let pawUp = 0;
  drive(r, e, 60, () => {
    watch(r);
    pawUp = Math.max(pawUp, r.lab.feet()[2].drawnY);
  }, st);
  const paw = peak.max.paw;
  e.telegraph = null;
  e.mode = 'charge';
  peak.max = {};
  drive(r, e, 30, () => {
    watch(r);
    r.group.position.z += 10 * DT;
  }, st);
  const run = peak.max.stride;
  e.mode = 'skid';
  peak.max = {};
  drive(r, e, 40, () => watch(r), st);
  const brace = peak.max.brace;
  e.mode = 'root';
  drive(r, e, 50, null, st);
  check('Thornmother: the volley heaves the pods away, the warning paws a hind hoof, the charge gallops, the skid braces', volley > 0.9 && paw > 0.8 && pawUp > 0.05 && run > 0.9 && brace > 0.9, { volley: r3(volley), paw: r3(paw), pawUp: r3(pawUp), run: r3(run), brace: r3(brace) });
  check('Thornmother: the hooves hold through the volley, the charge and the skid', st.slide < 1e-4 && r.lab.feet().every((f) => f.planted), r3(st.slide));
}
{
  // the Gloam Wolf: a pounce (crouch, the 16-tick leap over 6 u, the landing),
  // a rend, a howl, the rage
  const r = wolfM.buildGloamWolfFacet();
  const st = runner(r);
  const e = { id: 11, telegraph: null, mode: 'stalk', enraged: false };
  drive(r, e, 20, null, st);
  st.slide = 0;
  e.telegraph = { attack: 'pounce', startTick: 0, resolveTick: 54 };
  e.mode = 'crouch';
  peak.max = {};
  drive(r, e, 38, () => watch(r), st);
  const crouch = peak.max.crouch;
  e.mode = 'leap';
  peak.max = {};
  let airFrames = 0;
  drive(r, e, 16, () => {
    watch(r);
    r.group.position.z += 6 / 16;
    if (r.lab.channels().air > 0.02) airFrames++;
  }, st);
  const air = peak.max.air;
  // the landing: airborne frames are not weight-bearing; measure from here
  e.telegraph = null;
  e.mode = 'stalk';
  st.prev = [];
  peak.max = {};
  drive(r, e, 12, () => watch(r), st);
  const land = peak.max.squash;
  drive(r, e, 40, null, st);
  e.telegraph = { attack: 'rend', startTick: 0, resolveTick: 36 };
  e.mode = 'rend';
  peak.max = {};
  drive(r, e, 36, () => watch(r), st);
  const rake = peak.max.rake;
  e.telegraph = null;
  e.mode = 'stalk';
  peak.max = {};
  drive(r, e, 40, () => watch(r), st);
  const lunge = peak.max.reach;
  e.telegraph = { attack: 'howl', startTick: 0, resolveTick: 60 };
  e.mode = 'howl';
  peak.max = {};
  drive(r, e, 60, () => watch(r), st);
  const sit = peak.max.sit;
  e.telegraph = null;
  e.mode = 'stalk';
  peak.max = {};
  drive(r, e, 60, () => watch(r), st);
  const cry = peak.max.jaw;
  e.enraged = true;
  drive(r, e, 90, null, st);
  check('Gloam Wolf: the pounce crouches, bounds clear of the floor and lands; the rend rakes and lunges; the howl sits and cries; the rage holds', crouch > 0.9 && air > 0.95 && airFrames >= 12 && land > 0.9 && rake > 0.9 && lunge > 0.4 && sit > 0.9 && cry > 0.9 && r.lab.channels().rage > 0.9, { crouch: r3(crouch), air: r3(air), airFrames, land: r3(land), rake: r3(rake), lunge: r3(lunge), sit: r3(sit), cry: r3(cry) });
  check('Gloam Wolf: the paws hold through every ability (the bound aside)', st.slide < 1e-4 && r.lab.feet().every((f) => f.planted), r3(st.slide));
}

// --- 7. the Barrow Wyrm's re-measure ---------------------------------------------------------
{
  beats('Barrow Wyrm', 'wyrm', wyrmM.WYRM_ABILITIES, wyrmM.abilityChannels);
  const r = wyrmM.buildWyrmFacet();
  const pts = ['mouth', 'throat', 'crown'].filter((n) => !(r.points && r.points[n] && r.points[n].isObject3D));
  check('Barrow Wyrm: named points for the mouth, the throat and the crown (B8)', pts.length === 0, pts);
  check('Barrow Wyrm: a height-only hit squash (the planted tail never slides)', r.react && !r.react.axis && r.react.flinch === 0 && r.react.knock === 0, r.react);
  const world = new Group();
  world.add(r.group);
  const e = { id: 3, telegraph: null };
  const grows = [];
  for (let f = 0; f < 20; f++) {
    world.updateMatrixWorld(true);
    r.pose({ t: f * DT, hpFrac: 1, e });
    grows.push(r.group.children[0].scale.x);
  }
  check('Barrow Wyrm: it grows from the floor when it spawns, past full size once (B7)', grows[0] < 0.3 && Math.max(...grows) > 1.04 && Math.abs(grows[grows.length - 1] - 1) < 1e-6, grows.slice(0, 12).map(r3));
}

// --- 8. spawn-in, and a pooled rig posed for a new boss -----------------------------------------
for (const B of BOSSES) {
  const r = B.build();
  const st = runner(r);
  // the grow after each pose (drive's hook runs before the pose)
  const g = [];
  drive(r, { id: 1, telegraph: null }, 1, null, st);
  for (let f = 0; f < 20; f++) {
    g.push(r.lab.grow());
    drive(r, { id: 1, telegraph: null }, 1, null, st);
  }
  const full = Math.round(SPAWN_SEC / DT) + 1;
  check(`${B.name}: grows from the floor in ~7 frames, past full size once (B7)`, g[0] < 0.4 && Math.max(...g) > 1.04 && g.slice(full).every((v) => Math.abs(v - 1) < 1e-6), g.slice(0, 10).map(r3));
  const g2 = [];
  for (let f = 0; f < 3; f++) {
    drive(r, { id: 2, telegraph: null }, 1, null, st);
    g2.push(r.lab.grow());
  }
  check(`${B.name}: a pooled rig posed for a new boss spawns in again`, g2[0] < 0.5, g2.map(r3));
  // a turntable (the Journal's viewer) skips the grow
  const v = B.build();
  v.pose({ t: 0.5, hpFrac: 1, e: null, turntable: true });
  check(`${B.name}: the viewer's turntable shows it full size`, v.lab.grow() === 1);
}

// --- 9. the lab ------------------------------------------------------------------------------
{
  const ids = LAB_ENTRIES.map((x) => x.id);
  check('the model lab lists the three bosses', ['stag', 'thornmother', 'gloamwolf'].every((k) => ids.includes(k)), ids);
  const vfx = new Proxy({}, { get: () => () => {} });
  const errs = [];
  for (const E of LAB_ENTRIES) {
    try {
      const b = E.build({ cosmetic: null, vfx, play: () => {} });
      for (const [id] of E.abilities) {
        const tl = b.timeline(id);
        const state = { mode: 'ability', ability: id, classic: true, movePhase: 0, t: 0 };
        for (let t = 0; t <= tl.duration + 0.2; t += DT) b.update(state, DT, Math.min(t, tl.duration));
        for (const c of b.cues(id)) b.onCue(c.id, { x: 0, z: 0, yaw: 0 });
      }
      b.update({ mode: 'move', ability: E.abilities[0][0], classic: false, movePhase: 1, t: 0 }, DT, 0);
      b.reset();
    } catch (err) {
      errs.push(`${E.id}: ${err.message}`);
    }
  }
  check('every lab entry plays every ability, with its classic twin beside', errs.length === 0, errs);
}

console.log(fails.length ? `\n${fails.length} FAIL` : '\nall pass');
process.exit(fails.length ? 1 : 0);
