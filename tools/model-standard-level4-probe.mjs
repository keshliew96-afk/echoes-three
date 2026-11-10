#!/usr/bin/env node
// MODEL STANDARD, LEVEL IV BOSSES probe — headless Node, builds the rigs; no
// browser. The slice rebuilds the Hollow Cantor, the Geode Colossus and the
// Vein Weaver to the model standard (docs/MODEL_STANDARD.md) against the [M]
// checklist (VFX_HIT_RULES §6.1). Visual only. This probe checks:
//   1. the flags: the three bosses play faceted by default, `?facet=` turns
//      them classic or picks them, and the classic rigs still build;
//   2. every rig: the classic interface plus lab, points and react; the root
//      holds the moving body in its first child and only floor pieces beside
//      it; every instanced part inked (the lit gems, eyes, veins and the
//      thread aside); every vertex-coloured material on faceted geometry; its
//      named points;
//   3. colour: no Ember, no Bright Heal, nothing in the amber family on a
//      model material;
//   4. the [M] beats on every ability: a strike of at most 3 frames followed
//      by a held contact (B2), a strike that leaves on its first frame (B4),
//      a settle that overshoots rest once (B5), a recoil on every hit (B3),
//      the lance's and the bind's lunge (B9), an unwarned throw's wind-up of
//      at most 1.5 frames (B1), the Echo Step's rise as a B7 grow;
//   5. locked feet: the Colossus (on its two fists and two legs) and the
//      Weaver (on eight) walking the sim's speeds with turns never slide a
//      planted foot, step in turn, reach every foot and plant again at rest;
//      the Cantor has none: its hem holds its hover through a walk and every
//      ability (the floater's rule);
//   6. the sim drives each ability: the Cantor's note, lance (on its lane),
//      pulse, Echo Step (folded away, gone, risen again where the sim put it)
//      and a verse taken; the Colossus's fissure (the right fist raised and
//      slammed ahead), rain (read ahead on the next rain tick, fired on the
//      throw), burst (held spent while the sim's mode lasts) and rage; the
//      Weaver's bind (the front pair raised, the thread to the lane's end,
//      held while a hero is bound, reeled in), slam (the front four raised,
//      landed wide), brood (read ahead, fired on the throw) and rage; the
//      strikes land on the sim's hit; a co-op guest's telegraph copies never
//      restart a wind-up; a boss killed in a wind-up never plays the strike;
//      a hitch is not a new boss;
//   7. the spawn-in (B7), a pooled rig posed for a new boss, the turntable;
//   8. the lab: an entry per boss, each ability plays without a throw.
//
//   node tools/model-standard-level4-probe.mjs
// Exit code 1 on any failure.

// The rigs paint a few canvases (glow sprites, face decals): a stub is enough.
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === 'canvas' ? {} : () => grad), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { Color, Group, Vector3 } = await import('three');
const { MODEL_STANDARD, facetOn } = await import('../src/render/facet/flags.js');
const { FRAME, GATHER_SEC, HOLD_SEC, STRIKE_SEC, SPAWN_SEC } = await import('../src/render/facet/beats.js');
const cantorM = await import('../src/render/boss/cantorfacet.js');
const colossusM = await import('../src/render/boss/colossusfacet.js');
const weaverM = await import('../src/render/boss/veinweaverfacet.js');
const { buildCantor, buildColossus } = await import('../src/render/boss/heart.js');
const { buildVeinWeaver } = await import('../src/render/boss/third.js');
const { LAB_ENTRIES } = await import('../src/scenes/modellab-level4.js');
const { CANTOR } = await import('../src/sim/bosses/cantor.js');
const { COLOSSUS } = await import('../src/sim/bosses/colossus.js');
const { VEINWEAVER } = await import('../src/sim/bosses/veinweaver.js');

const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info !== '' ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const DT = 1 / 60;
const r3 = (v) => Math.round(v * 1000) / 1000;

const BOSSES = [
  { kind: 'cantor', name: 'Hollow Cantor', build: cantorM.buildCantorFacet, classic: buildCantor, abilities: cantorM.CANTOR_ABILITIES, channels: cantorM.abilityChannels, walk: CANTOR.moveSpeed, points: ['mouth', 'chest', 'tip', 'crown', 'handL', 'handR'], rest: 'sing' },
  { kind: 'colossus', name: 'Geode Colossus', build: colossusM.buildColossusFacet, classic: buildColossus, abilities: colossusM.COLOSSUS_ABILITIES, channels: colossusM.abilityChannels, walk: COLOSSUS.moveSpeed, points: ['chest', 'mouth', 'tip', 'fistL', 'fistR', 'footL', 'footR'], rest: 'stalk' },
  { kind: 'veinweaver', name: 'Vein Weaver', build: weaverM.buildVeinWeaverFacet, classic: buildVeinWeaver, abilities: weaverM.WEAVER_ABILITIES, channels: weaverM.abilityChannels, walk: VEINWEAVER.moveSpeed, points: ['mouth', 'chest', 'tip', 'spinneret', 'footL1', 'footR1', 'footL4', 'footR4'], rest: 'stalk' },
];
const LEGGED = BOSSES.filter((B) => B.kind !== 'cantor');

// --- 1. flags ----------------------------------------------------------------------
{
  const q = (s) => new URLSearchParams(s);
  const kinds = BOSSES.map((B) => B.kind);
  check('the Level IV bosses play the model standard by default', kinds.every((k) => MODEL_STANDARD[k] === true && facetOn(k, q(''))));
  check('?facet=0 turns them classic', kinds.every((k) => !facetOn(k, q('facet=0'))));
  check('?facet=cantor keeps only the Cantor faceted', facetOn('cantor', q('facet=cantor')) && !facetOn('colossus', q('facet=cantor')) && !facetOn('veinweaver', q('facet=cantor')));
  check('the Level V bosses stay classic', !facetOn('hush', q('')) && !facetOn('skyhorn', q('')) && !facetOn('hourwarden', q('')));
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
function floorPiece(o) {
  let ok = true;
  o.updateMatrixWorld(true);
  o.traverse((x) => {
    if (!x.isMesh && !x.isSprite) return;
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
  let n = 0;
  body.traverse((x) => x.isMesh && n++);
  const others = r.group.children.slice(1);
  check(`${B.name}: the root's first child carries the body, the rest are floor pieces`, n > 12 && others.every(floorPiece), { meshes: n, floor: others.map((o) => o.name || o.type) });
  const ink = inkReport(r.group);
  // light, not ink-lined parts: the lit gems, eyes, veins, cracks and the thread
  const bare = ink.filter((p) => !p.inked && !/eyes|notes|fingers|motes|cracks|veins|thread/.test(p.name)).map((p) => p.name);
  check(`${B.name}: every instanced part carries its ink`, ink.length >= 6 && bare.length === 0, { parts: ink.length, bare });
  const black = [];
  r.group.traverse((o) => {
    if (!o.isMesh || o.userData.inkHull) return;
    for (const m of [].concat(o.material)) if (m && m.vertexColors && !o.geometry.getAttribute('color')) black.push(o.name || o.geometry.type);
  });
  check(`${B.name}: every vertex-coloured material sits on faceted geometry`, black.length === 0, black);
  const missing = B.points.filter((p) => !(r.points[p] && r.points[p].isObject3D));
  let rooted = true;
  for (const p of Object.values(r.points)) {
    let x = p;
    while (x.parent) x = x.parent;
    if (x !== r.group) rooted = false;
  }
  check(`${B.name}: its named points (B8)`, missing.length === 0 && rooted, missing);
  const R = r.react;
  check(`${B.name}: a hit envelope tuning (the envelope's boss amounts, no knockback, a pivot height)`, R && R.squash === 1 && R.flinch === 1 && R.knock === 0 && R.midY > 0.3, R);
}

// --- 3. colour -----------------------------------------------------------------------
{
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
      if (!(o.isMesh || o.isSprite) || o.userData.inkHull) return;
      for (const m of [].concat(o.material)) if (m && m.color && !m.isShaderMaterial) mats.add(m);
    });
    const all = [...mats];
    const reserved = all.filter((m) => close(m.color.getHex(), '#FF5A36') || close(m.color.getHex(), '#5FE873')).map((m) => `#${m.color.getHexString()}`);
    const amb = all.filter((m) => amber(m.color)).map((m) => `#${m.color.getHexString()}`);
    check(`${B.name}: no Ember or Bright Heal, nothing in the amber family`, reserved.length === 0 && amb.length === 0, { reserved, amb });
  }
}

// --- 4. the [M] beats ------------------------------------------------------------------
const CONTACT = {
  cantor: ['note', 'lance', 'pulse'],
  colossus: ['fissure', 'rain', 'burst'],
  veinweaver: ['bind', 'slam', 'brood'],
};
const dist = (A, B, keys) => Math.sqrt(keys.reduce((s, k) => s + (A[k] - B[k]) ** 2, 0));
for (const B of BOSSES) {
  for (const id of CONTACT[B.kind]) {
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
  }
}
// B3: every hit shoves the body back 0.08 to 0.12 u (the shove channel x 0.1 u)
{
  const peaks = {};
  for (const B of BOSSES) {
    for (const id of CONTACT[B.kind]) {
      const TL = B.abilities[id];
      let m = 0;
      for (let t = 0; t <= TL.duration; t += 1 / 240) m = Math.max(m, B.channels(id, TL.sample(t)).shove);
      peaks[`${B.kind} ${id}`] = r3(m);
    }
  }
  check('every hit plays its recoil (B3): a shove of 0.08 to 0.12 u', Object.values(peaks).every((v) => v >= 0.8 && v <= 1.2), peaks);
}
// B9: the lance and the bind draw back, drive past rest; the bind's thread reaches the lane and reels
{
  const tl = cantorM.CANTOR_ABILITIES.lance;
  const at = (id, k) => cantorM.abilityChannels('lance', tl.sample(tl.startOf(id) + tl.phases.find((p) => p.id === id).dur * k));
  check('Hollow Cantor Sung Lance: draws back off the lane, lunges past rest with the chest thrust (B9)', at('gather', 0.9).reach < -0.05 && at('hold', 0.5).reach > 0.4 && at('hold', 0.5).chest > 0.9, { gather: r3(at('gather', 0.9).reach), hold: r3(at('hold', 0.5).reach) });
  const tb = weaverM.WEAVER_ABILITIES.bind;
  const bt = (id, k) => weaverM.abilityChannels('bind', tb.sample(tb.startOf(id) + tb.phases.find((p) => p.id === id).dur * k));
  check('Vein Weaver Bind: draws back, lunges past rest with the thread out, reels it in (B9)', bt('spin', 0.9).reach < -0.05 && bt('hold', 0.5).reach > 0.4 && bt('hold', 0.5).thread === 1 && bt('draw', 1).thread < 0.01, { spin: r3(bt('spin', 0.9).reach), hold: r3(bt('hold', 0.5).reach) });
}
// B1: the unwarned throws (the rain, the brood) wind at most 1.5 frames past their load
{
  const out = {};
  for (const [B, id] of [[BOSSES[1], 'rain'], [BOSSES[2], 'brood']]) {
    const tl = B.abilities[id];
    const heave = tl.phases.find((p) => p.id === 'heave');
    out[`${B.kind} ${id}`] = r3(heave.dur / FRAME);
  }
  check('the unwarned throws wind at most 1.5 frames on the sim\'s throw (B1)', Object.values(out).every((v) => v <= 1.5 + 1e-6) && Math.abs(GATHER_SEC - 1.5 * FRAME) < 1e-9, out);
}
// B7: the Echo Step's rise is the spawn-in grow (seven frames, a tenth over)
{
  const tl = cantorM.CANTOR_ABILITIES.step;
  const rise = tl.phases.find((p) => p.id === 'rise');
  const folds = [];
  for (let k = 0; k <= 1; k += 0.1) folds.push(r3(cantorM.abilityChannels('step', tl.sample(tl.startOf('rise') + rise.dur * k)).fold));
  const gone = cantorM.abilityChannels('step', tl.sample(tl.startOf('gone') + 0.1)).fold;
  check('Hollow Cantor Echo Step: folded away and gone, then risen again in ~7 frames (B7)', Math.abs(rise.dur - SPAWN_SEC) < 1e-9 && gone > 0.99 && folds[0] > 0.9 && folds[folds.length - 1] < 0.01, folds);
}

// --- 5. locked feet ---------------------------------------------------------------------
function drive(r, e, frames, move, out) {
  for (let f = 0; f < frames; f++) {
    out.t += DT;
    if (move) move(f);
    out.world.updateMatrixWorld(true);
    r.pose({ t: out.t, hpFrac: 1, e, tick: Math.round(out.t * 60) });
    if (out.each) out.each(f);
    if (out.hem) out.hem.push(r.lab.hem());
    if (!r.lab.feet) continue;
    if (r.lab.legs) for (const S of r.lab.legs.state) out.gap = Math.max(out.gap, S.end.distanceTo(S.foot));
    const feet = r.lab.feet();
    if (feet.every((ft) => !ft.planted)) out.allAir++;
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
  return { world, t: 0, slide: 0, prev: [], order: [], gap: 0, allAir: 0, each: null, hem: null };
};
for (const B of LEGGED) {
  const r = B.build();
  const st = runner(r);
  const e = { id: 1, telegraph: null, mode: B.rest };
  drive(r, e, 20, null, st);
  st.slide = 0;
  const steps0 = r.lab.feet().map((f) => f.steps);
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
  const groups = r.lab.feet().map((f) => f.group);
  const pairGap = Math.max(...[0, 1].map((g) => {
    const n = steps.filter((_, i) => groups[i] === g);
    return Math.max(...n) - Math.min(...n);
  }));
  check(`${B.name}: walking with a turn, a planted foot never slides`, st.slide < 1e-4, r3(st.slide));
  check(`${B.name}: every foot steps along the travel`, steps.every((n) => n >= 3), steps);
  // a group of n feet lands together, so the order switches about once in n landings
  const perGroup = groups.length / 2;
  check(`${B.name}: the steps alternate between its two gait groups, each group together`, st.order.length > 6 && alt / (st.order.length - 1) > 0.6 / perGroup && pairGap <= 1, { landings: st.order.length, switches: alt, pairGap, perGroup });
  check(`${B.name}: walking, every drawn foot reaches its gait point and a foot is always down`, st.gap < 1e-3 && st.allAir === 0, { gap: r3(st.gap), allAir: st.allAir });
  drive(r, e, 45, null, st);
  check(`${B.name}: at rest every foot is planted again`, r.lab.feet().every((f) => f.planted), r.lab.feet().map((f) => f.planted));
  st.gap = 0;
  st.allAir = 0;
  let y = yaw;
  drive(r, e, 90, () => {
    y += (yaw + Math.PI * 0.999 - y) * (1 - Math.exp(-7 * DT));
    r.setYaw(y);
  }, st);
  check(`${B.name}: a spin in place steps round with no leg past its reach (every foot up for at most 3 frames)`, st.gap < 1e-3 && st.allAir <= 3, { gap: r3(st.gap), allAir: st.allAir });
}
// the Cantor floats: its hem holds its hover through a walk and every ability
{
  const r = cantorM.buildCantorFacet();
  const st = runner(r);
  st.hem = [];
  const e = { id: 1, telegraph: null, mode: 'sing', verse: 0 };
  drive(r, e, 20, null, st);
  let yaw = 0;
  drive(r, e, 200, (f) => {
    yaw += 0.5 * DT;
    r.group.position.x += Math.sin(yaw) * CANTOR.moveSpeed * DT;
    r.group.position.z += Math.cos(yaw) * CANTOR.moveSpeed * DT;
    r.setYaw(yaw);
  }, st);
  for (const [attack, ticks] of [['note', 48], ['lance', 54], ['pulse', 60]]) {
    const t0 = Math.round(st.t * 60) + 1;
    e.telegraph = { attack, startTick: t0, resolveTick: t0 + ticks, dirX: 0, dirZ: 1, length: 5 };
    drive(r, e, ticks, null, st);
    e.telegraph = null;
    drive(r, e, 50, null, st);
  }
  const lo = Math.min(...st.hem);
  const hi = Math.max(...st.hem);
  check('Hollow Cantor: it has no feet; the hem holds its hover (never on the floor, never past its sway and lift) through a walk and every ability', lo > 0.1 && hi < 1.0, { lo: r3(lo), hi: r3(hi) });
}

// --- 6. the sim drives each ability ------------------------------------------------------
const peak = { max: {} };
const watch = (r) => {
  for (const [k, v] of Object.entries(r.lab.channels())) peak.max[k] = Math.max(peak.max[k] ?? -Infinity, v);
};
{
  // the Cantor: the note, the lance on its lane, the pulse, the Echo Step, a verse
  const r = cantorM.buildCantorFacet();
  const st = runner(r);
  const e = { id: 7, telegraph: null, mode: 'sing', verse: 0 };
  drive(r, e, 20, null, st);
  e.telegraph = { attack: 'note', startTick: 0, resolveTick: 48, x: 0, z: 4, radius: 1.7 };
  peak.max = {};
  drive(r, e, 48, () => watch(r), st);
  const drawn = peak.max.lift;
  const sung = r.lab.channels().squash;
  e.telegraph = null;
  drive(r, e, 50, null, st);
  e.telegraph = { attack: 'lance', startTick: 100, resolveTick: 154, dirX: 1, dirZ: 0, length: 6, lance: true };
  peak.max = {};
  drive(r, e, 54, () => watch(r), st);
  const crossed = peak.max.cross;
  const lanced = r.lab.channels();
  const faced = r.group.children[0].rotation.y;
  e.telegraph = null;
  drive(r, e, 50, null, st);
  e.telegraph = { attack: 'pulse', startTick: 210, resolveTick: 270, x: 0, z: 0, radius: 3.2 };
  peak.max = {};
  drive(r, e, 60, () => watch(r), st);
  const swollen = peak.max.spread;
  const pulsed = r.lab.channels().squash;
  e.telegraph = null;
  drive(r, e, 50, null, st);
  check('Hollow Cantor: the note draws breath and sings on the hit; the lance gathers on its lane (turned to it) and thrusts; the pulse swells wide and bursts', drawn > 0.6 && sung > 0.95 && crossed > 0.9 && lanced.back > 0.95 && lanced.squash > 0.95 && Math.abs(faced - Math.PI / 2) < 0.1 && swollen > 0.95 && pulsed > 0.95, { drawn: r3(drawn), sung: r3(sung), crossed: r3(crossed), lanced: r3(lanced.back), faced: r3(faced), swollen: r3(swollen), pulsed: r3(pulsed) });
  // the Echo Step: 18 ticks of fade, then the sim moves it 6 u and it sings again
  e.mode = 'fade';
  e.hittable = false;
  peak.max = {};
  drive(r, e, 18, () => watch(r), st);
  const folded = r.lab.channels().fold;
  const hidden = !r.group.children[0].children[0].children[0].children[0].visible;
  e.mode = 'sing';
  e.hittable = true;
  const grows = [];
  drive(r, e, 1, () => (r.group.position.z += 6), st);
  for (let f = 0; f < 14; f++) {
    drive(r, e, 1, null, st);
    grows.push(r3(1 - r.lab.channels().fold));
  }
  check('Hollow Cantor: the Echo Step folds it away and hides it; it rises again where the sim put it (no spawn-in replayed, the hem back at its hover)', folded > 0.97 && hidden && grows[0] < 0.6 && grows[grows.length - 1] > 0.99 && r.lab.grow() === 1 && r.lab.hem() > 0.15, { folded: r3(folded), hidden, grows });
  // a verse taken while it is idle: the whole flare; mid-song, the halo alone
  peak.max = {};
  e.verse = 1;
  drive(r, e, 40, () => watch(r), st);
  const flare = { halo: r3(peak.max.halo), lift: r3(peak.max.lift) };
  e.telegraph = { attack: 'note', startTick: 500, resolveTick: 548, x: 0, z: 4, radius: 1.7 };
  drive(r, e, 10, null, st);
  peak.max = {};
  e.verse = 2;
  drive(r, e, 20, () => watch(r), st);
  const mid = { halo: r3(peak.max.halo) };
  drive(r, e, 18, null, st);
  mid.sung = r3(r.lab.channels().squash);
  e.telegraph = null;
  check('Hollow Cantor: a verse taken flares the halo and lifts the sleeves when idle, and flares the halo alone mid-song (the note still lands on its hit)', flare.halo > 0.9 && flare.lift > 0.7 && mid.halo > 0.9 && mid.sung > 0.95, { flare, mid });
}
{
  // the Colossus: the fissure (the right fist up, slammed ahead), the rain
  // (read ahead, fired on the throw), the burst (held spent), the rage
  const r = colossusM.buildColossusFacet();
  const st = runner(r);
  const e = { id: 9, telegraph: null, mode: 'stalk', enraged: false, nextRainTick: 100000 };
  drive(r, e, 20, null, st);
  st.slide = 0;
  e.telegraph = { attack: 'fissure', kind: 'lane', startTick: 0, resolveTick: 54, dirX: 0, dirZ: 1, length: 6, lance: true };
  peak.max = {};
  let fistUp = 0;
  drive(r, e, 54, () => {
    watch(r);
    fistUp = Math.max(fistUp, r.lab.feet()[1].drawnY);
  }, st);
  const raised = peak.max.upR;
  const slammed = r.lab.channels().squash;
  e.telegraph = null;
  drive(r, e, 8, null, st);
  const fistR = r.lab.feet()[1];
  const leftHeld = st.slide;
  drive(r, e, 60, null, st);
  check('Geode Colossus: the fissure hauls the right fist overhead through the lane\'s warning and slams it into the floor ahead on the hit', raised > 0.95 && fistUp > 1.5 && slammed > 0.95 && fistR.planted && fistR.drawnZ > 1.6, { raised: r3(raised), fistUp: r3(fistUp), slammed: r3(slammed), fistZ: r3(fistR.drawnZ), planted: fistR.planted });
  check('Geode Colossus: the left fist and the legs hold through the fissure; every foot planted after it', leftHeld < 1e-4 && r.lab.feet().every((f) => f.planted), r3(leftHeld));
  // the rain: nextRainTick 30 ticks ahead loads it; the tick jumping fires it
  const t0 = Math.round(st.t * 60);
  e.nextRainTick = t0 + 30;
  peak.max = {};
  drive(r, e, 30, () => watch(r), st);
  const loaded = r.lab.channels().up;
  e.nextRainTick = t0 + 30 + 360;
  peak.max = {};
  let hurlAt = -1;
  drive(r, e, 12, (f) => {
    watch(r);
    if (hurlAt < 0 && r.lab.channels().punch > 0.9) hurlAt = f;
  }, st);
  const hurled = peak.max.punch;
  e.nextRainTick = 100000;
  drive(r, e, 60, null, st);
  // the throw: 1.5 frames of heave and a 2.5-frame hurl (source frames, 1/30 s): the contact within 9 frames at 60 Hz
  check('Geode Colossus: the rain is read ahead (both fists to the chest over the last 30 ticks) and fired on the sim\'s throw (punched overhead within 1.5 + 2.5 frames)', loaded > 0.75 && hurled > 0.95 && hurlAt >= 0 && hurlAt <= 9, { loaded: r3(loaded), hurled: r3(hurled), hurlAt });
  e.telegraph = { attack: 'burst', kind: 'ring', startTick: 400, resolveTick: 460, x: 0, z: 0, radius: 2.6 };
  peak.max = {};
  let bothUp = 0;
  drive(r, e, 60, () => {
    watch(r);
    const F = r.lab.feet();
    bothUp = Math.max(bothUp, Math.min(F[0].drawnY, F[1].drawnY));
  }, st);
  const spread = peak.max.spread;
  const burst = r.lab.channels().squash;
  e.telegraph = null;
  e.mode = 'spent';
  drive(r, e, 80, null, st);
  const spent = r.lab.channels().slump;
  e.mode = 'stalk';
  peak.max = {};
  drive(r, e, 50, () => watch(r), st);
  const recovered = r.lab.channels().slump;
  e.enraged = true;
  drive(r, e, 120, null, st);
  check('Geode Colossus: the burst rears it with both fists off the floor and spread, bursts on the hit, slumps spent while the sim keeps it so, recovers; the rage holds', spread > 0.95 && bothUp > 0.3 && burst > 0.95 && spent > 0.95 && recovered < 0.05 && r.lab.channels().rage > 0.9, { spread: r3(spread), bothUp: r3(bothUp), burst: r3(burst), spent: r3(spent), recovered: r3(recovered) });
  check('Geode Colossus: every foot planted after the burst', r.lab.feet().every((f) => f.planted));
}
{
  // the Weaver: the bind (the front pair raised, the thread to the lane's
  // end, held while bound, reeled), the slam, the brood, the rage
  const r = weaverM.buildVeinWeaverFacet();
  const st = runner(r);
  const e = { id: 11, telegraph: null, mode: 'stalk', enraged: false, binds: [], nextBroodTick: 100000 };
  drive(r, e, 20, null, st);
  st.slide = 0;
  e.telegraph = { attack: 'bind', kind: 'lane', startTick: 0, resolveTick: 44, dirX: 0, dirZ: 1, length: 6, lance: true };
  e.mode = 'spin';
  peak.max = {};
  let frontUp = 0;
  drive(r, e, 44, () => {
    watch(r);
    const F = r.lab.feet();
    frontUp = Math.max(frontUp, Math.min(F[0].drawnY, F[1].drawnY));
  }, st);
  const spun = peak.max.abdo;
  const atCast = r.lab.threadLength();
  e.telegraph = null;
  e.mode = 'stalk';
  e.binds = [{ id: 5, untilTick: 200 }];
  drive(r, e, 60, null, st);
  const heldThread = r.lab.threadLength();
  e.binds = [];
  drive(r, e, 60, null, st);
  const reeled = r.lab.channels().thread;
  check('Vein Weaver: the bind tips the abdomen up with the front pair raised, casts the thread to the lane\'s end on the hit, keeps it taut while a hero is bound and reels it in after', spun > 0.95 && frontUp > 0.3 && Math.abs(atCast - 6) < 0.05 && heldThread > 5.9 && reeled < 0.01, { spun: r3(spun), frontUp: r3(frontUp), thread: r3(atCast), held: r3(heldThread), reeled: r3(reeled) });
  check('Vein Weaver: the hind legs hold through the bind, every foot planted after', r.lab.feet().every((f) => f.planted));
  e.telegraph = { attack: 'slam', kind: 'ring', startTick: 300, resolveTick: 360, x: 0, z: 0, radius: 2.8 };
  e.mode = 'beat';
  peak.max = {};
  let fourUp = 0;
  drive(r, e, 60, () => {
    watch(r);
    const F = r.lab.feet();
    fourUp = Math.max(fourUp, Math.min(F[0].drawnY, F[1].drawnY, F[2].drawnY, F[3].drawnY));
  }, st);
  const reared = peak.max.rear;
  const slammed = r.lab.channels();
  e.telegraph = null;
  e.mode = 'stalk';
  drive(r, e, 150, null, st); // the stance comes back one foot at a time
  const F = r.lab.feet();
  check('Vein Weaver: the slam rears it with the front four raised and drops it flat on the hit, every foot planted wide', reared > 0.95 && fourUp > 0.3 && slammed.squash > 0.95 && slammed.crouch > 0.95 && F.every((f) => f.planted), { reared: r3(reared), fourUp: r3(fourUp), slammed: r3(slammed.squash) });
  const t0 = Math.round(st.t * 60);
  e.nextBroodTick = t0 + 30;
  peak.max = {};
  drive(r, e, 30, () => watch(r), st);
  const loaded = r.lab.channels().swell;
  e.nextBroodTick = t0 + 30 + 400;
  let lobAt = -1;
  peak.max = {};
  drive(r, e, 12, (f) => {
    watch(r);
    if (lobAt < 0 && r.lab.channels().squash > 0.9) lobAt = f;
  }, st);
  const lobbed = peak.max.abdo;
  e.nextBroodTick = 100000;
  e.enraged = true;
  drive(r, e, 120, null, st);
  check('Vein Weaver: the brood is read ahead (the abdomen swells over the last 30 ticks) and lobbed on the sim\'s throw (within 1.5 + 2.5 frames); the rage holds', loaded > 0.75 && lobbed > 0.95 && lobAt >= 0 && lobAt <= 9 && r.lab.channels().rage > 0.9, { loaded: r3(loaded), lobbed: r3(lobbed), lobAt });
}
// the strikes land on the sim's hit
{
  const out = {};
  const c = cantorM.buildCantorFacet();
  const sc = runner(c);
  const ce = { id: 21, telegraph: { attack: 'note', startTick: 0, resolveTick: 48 }, mode: 'sing', verse: 0 };
  drive(c, ce, 48, null, sc);
  out.note = r3(c.lab.channels().squash);
  const g = colossusM.buildColossusFacet();
  const sg = runner(g);
  const ge = { id: 22, telegraph: { attack: 'burst', startTick: 0, resolveTick: 60 }, mode: 'stalk' };
  drive(g, ge, 60, null, sg);
  out.burst = r3(g.lab.channels().squash);
  const w = weaverM.buildVeinWeaverFacet();
  const sw = runner(w);
  const we = { id: 23, telegraph: { attack: 'slam', startTick: 0, resolveTick: 60 }, mode: 'beat', binds: [] };
  drive(w, we, 60, null, sw);
  out.slam = r3(w.lab.channels().squash);
  we.telegraph = { attack: 'bind', startTick: 100, resolveTick: 144, dirX: 0, dirZ: 1, length: 5 };
  we.mode = 'spin';
  drive(w, we, 44, null, sw);
  out.bind = r3(w.lab.channels().squash);
  check('the strikes land on the sim\'s hit: the note, the burst, the slam, the bind', Object.values(out).every((v) => v > 0.95), out);
}
// a co-op guest: every snapshot hands the rig a fresh copy of the telegraph
{
  const out = {};
  const c = cantorM.buildCantorFacet();
  const sc = runner(c);
  const ce = { id: 24, telegraph: null, mode: 'sing', verse: 0 };
  drive(c, ce, 20, null, sc);
  const T = { attack: 'pulse', startTick: 10, resolveTick: 70, kind: 'ring' };
  peak.max = {};
  drive(c, ce, 52, (f) => {
    if (f % 3 === 0) ce.telegraph = { ...T };
    watch(c);
  }, sc);
  out.swell = r3(peak.max.spread);
  const w = weaverM.buildVeinWeaverFacet();
  const sw = runner(w);
  const we = { id: 25, telegraph: null, mode: 'stalk', binds: [] };
  drive(w, we, 20, null, sw);
  const W = { attack: 'slam', startTick: 10, resolveTick: 70, kind: 'ring' };
  peak.max = {};
  drive(w, we, 52, (f) => {
    if (f % 3 === 0) we.telegraph = { ...W };
    watch(w);
  }, sw);
  out.rear = r3(peak.max.rear);
  check('a co-op guest\'s fresh telegraph copies never restart the wind-up (the sleeves spread, the body rears)', out.swell > 0.85 && out.rear > 0.85, out);
}
// killed in a wind-up: the death collapse never plays the strike
{
  const out = {};
  const c = cantorM.buildCantorFacet();
  const sc = runner(c);
  drive(c, { id: 26, telegraph: { attack: 'lance', startTick: 0, resolveTick: 54, dirX: 0, dirZ: 1, length: 5 }, mode: 'sing', verse: 0 }, 20, null, sc);
  peak.max = {};
  drive(c, null, 66, () => watch(c), sc);
  out.cantorBack = r3(peak.max.back);
  const g = colossusM.buildColossusFacet();
  const sg = runner(g);
  drive(g, { id: 27, telegraph: { attack: 'fissure', startTick: 0, resolveTick: 54, dirX: 0, dirZ: 1, length: 5 }, mode: 'stalk' }, 20, null, sg);
  peak.max = {};
  drive(g, null, 66, () => watch(g), sg);
  out.colossusSlam = r3(peak.max.slam);
  const w = weaverM.buildVeinWeaverFacet();
  const sw = runner(w);
  drive(w, { id: 28, telegraph: { attack: 'bind', startTick: 0, resolveTick: 44, dirX: 0, dirZ: 1, length: 5 }, mode: 'spin', binds: [] }, 20, null, sw);
  peak.max = {};
  drive(w, null, 66, () => watch(w), sw);
  out.weaverThread = r3(peak.max.thread);
  check('a boss killed in its wind-up collapses in it (no lance, no slam, no thread)', out.cantorBack < 0.02 && out.colossusSlam < 0.02 && out.weaverThread < 0.02, out);
}
// a hitch (a long frame at speed) is not a new boss
{
  const out = {};
  for (const B of BOSSES) {
    const r = B.build();
    const st = runner(r);
    const e = { id: 29, telegraph: null, mode: B.rest, verse: 0, binds: [] };
    drive(r, e, 20, null, st);
    drive(r, e, 1, () => (r.group.position.z += 3), st);
    out[B.kind] = r3(r.lab.grow());
  }
  check('a 3 u jump in one frame (a hitch) re-plants but never replays the spawn-in', Object.values(out).every((v) => v === 1), out);
}

// --- 7. spawn-in, and a pooled rig posed for a new boss -----------------------------------------
for (const B of BOSSES) {
  const r = B.build();
  const st = runner(r);
  const g = [];
  drive(r, { id: 1, telegraph: null, binds: [] }, 1, null, st);
  for (let f = 0; f < 20; f++) {
    g.push(r.lab.grow());
    drive(r, { id: 1, telegraph: null, binds: [] }, 1, null, st);
  }
  const full = Math.round(SPAWN_SEC / DT) + 1;
  check(`${B.name}: grows from the floor in ~7 frames, past full size once (B7)`, g[0] < 0.4 && Math.max(...g) > 1.04 && g.slice(full).every((v) => Math.abs(v - 1) < 1e-6), g.slice(0, 10).map(r3));
  const g2 = [];
  for (let f = 0; f < 3; f++) {
    drive(r, { id: 2, telegraph: null, binds: [] }, 1, null, st);
    g2.push(r.lab.grow());
  }
  check(`${B.name}: a pooled rig posed for a new boss spawns in again`, g2[0] < 0.5, g2.map(r3));
  const v = B.build();
  v.pose({ t: 0.5, hpFrac: 1, e: null, turntable: true });
  check(`${B.name}: the viewer's turntable shows it full size`, v.lab.grow() === 1);
}

// --- 8. the lab ------------------------------------------------------------------------------
{
  const ids = LAB_ENTRIES.map((x) => x.id);
  check('the model lab lists the three bosses', BOSSES.every((B) => ids.includes(B.kind)), ids);
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
  check('every Level IV lab entry plays every ability, with its classic twin beside', errs.length === 0, errs);
}

console.log(fails.length ? `\n${fails.length} FAIL` : '\nall pass');
process.exit(fails.length ? 1 : 0);
