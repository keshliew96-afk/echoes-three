#!/usr/bin/env node
// MODEL STANDARD HEROES probe (v0.5.335) — headless Node, builds the rigs; no
// browser. Every faceted hero in the registry (render/facet/heroes.js) runs
// the same checks, so a hero that joins the model standard is held to Kesh's
// animation templates and the [M] rules of the VFX/hit rules doc (§6.1) the
// moment it is listed:
//   1. data: the combo swings at the sim's cadence, every class skill plays
//      an ability, every move has named phases and a readout;
//   2. the 3-hit combo: each hit settles into the next hit's wind-up, no pop
//      at any phase change, the lab's cues sit on each contact, a chained
//      hit starts where the last one held, comboHitOf counts 1-2-3 and is
//      order-safe;
//   3. the blow (B9, B2, B3, B5, B6): melee wind-ups pull back, contacts
//      lunge and lean 20-25° with the contact squash, snapped back within 3
//      frames; the contact holds through the hitstop the rig struck; the
//      rig recoils off a connect after the hold (a whiff does not); shots
//      squash the shooter 20/29/38%; every move settles with one small
//      overshoot; the third hit is the biggest;
//   4. the rig (B7, B8, the self-check): any hitstop holds the whole rig;
//      the spawn grows in from the floor with about 10% overshoot in about
//      7 frames; hand and tip are named points and the tip travels; the hips
//      lead the weapon; planted feet never slide, step one at a time along
//      the travel in eight directions; the walk leans into the travel; a
//      dash lifts both feet and they plant where they land; a lunge or a
//      hop moves the feet with the body; downed and revived run;
//   5. the look: every instanced part inked, no Ember, Violet or amber, the
//      Healer's Bright Heal only on her gem; the flag and the classic twins.
//
//   node tools/model-standard-heroes-probe.mjs [--only tank]
// Exit code 1 on any failure.

// The rigs paint a few canvases (glow sprites, face decals): a stub is enough.
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === 'canvas' ? {} : () => grad), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { Color, Group, Vector3 } = await import('three');
const { FACET_HEROES } = await import('../src/render/facet/heroes.js');
const { MODEL_STANDARD, facetOn } = await import('../src/render/facet/flags.js');
const { FRAME, LUNGE_PITCH_MAX, RECOIL, SHOT, SPAWN, SPAWN_SEC, LEAD, LAG } = await import('../src/render/facet/hero.js');
const { createCritter } = await import('../src/render/critters/index.js');
const { ALLY_CLASSES } = await import('../src/sim/allies.js');
const { HEALER } = await import('../src/core/constants.js');
const { SKILLS } = await import('../src/sim/skills.js');
const { CLASS_SKILLS } = await import('../src/data/classes.js');
const { PALETTE } = await import('../src/data/palette.js');

const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
const fails = [];
let section = '';
const check = (label, ok, info = '') => {
  const l = `${section}: ${label}`;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${l}${info !== '' ? `  ${JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(l);
};
const r3 = (v) => Math.round(v * 1000) / 1000;
const DT = 1 / 60;

function rigOf(id, facet = true) {
  const c = createCritter(id, { facet });
  const world = new Group();
  world.add(c.group);
  return { c, world, rig: c.lab ? c.lab.parts.torso.parent : null };
}
function run(R, n, each = null) {
  for (let f = 0; f < n; f++) {
    R.world.updateMatrixWorld(true);
    R.c.update(DT);
    if (each) each(f);
  }
}
const skillsOf = (id) => (id === 'healer' ? Object.values(SKILLS).filter((s) => !s.cls).map((s) => s.id) : CLASS_SKILLS[id]);
const cadenceOf = (id) => (id === 'healer' ? HEALER.attackIntervalTicks : ALLY_CLASSES[id].attackIntervalTicks) / 60;
const walkSpeedOf = (id) => (id === 'healer' ? HEALER.moveSpeed : ALLY_CLASSES[id].moveSpeed);
const size = (p) => Math.abs(p.sw - 1) + Math.abs(p.sh - 1) + p.hop * 2 + 0.5 * p.step + 0.5 * Math.abs(p.pitch);

for (const H of FACET_HEROES) {
  if (only && H.id !== only) continue;
  section = H.label;
  const hits = H.hits;
  const moves = Object.values(H.moves);

  // --- 1. data ------------------------------------------------------------
  check('the combo swings at the sim cadence', Math.abs(H.swingSec - cadenceOf(H.id)) < 1e-9, { swingSec: H.swingSec, sim: cadenceOf(H.id) });
  check('the walk lean reads the class walk speed', Math.abs(H.walkSpeed - walkSpeedOf(H.id)) < 1e-9, { spec: H.walkSpeed, sim: walkSpeedOf(H.id) });
  {
    const list = skillsOf(H.id);
    const missing = list.filter((id) => !H.moves[H.skillAbility({ skill: id, shape: SKILLS[id].shape })]);
    check(`every ${H.label} skill plays an ability (${list.length} skills)`, missing.length === 0 && list.length > 0, missing);
    const used = new Set(list.map((id) => H.skillAbility({ skill: id, shape: SKILLS[id].shape })));
    const idle = Object.keys(H.moves).filter((m) => !used.has(m));
    check('every ability is played by a skill', idle.length === 0, idle);
    const all = [...moves.map((m) => m.timeline), ...hits.map((h) => h.timeline)];
    const bad = all.filter((t) => !(t.duration > 0) || t.phases.some((p) => !(p.dur > 0) || !p.label) || !t.readout(t.duration / 2).includes(t.label));
    check('every move and hit has named phases and a readout', bad.length === 0 && hits.length === 3, bad.map((t) => t.id));
    const labIds = H.lab.abilities.map(([id]) => id);
    check('the lab tab lists the combo, every ability and the spawn', labIds.includes('combo') && labIds.includes('spawn') && Object.keys(H.moves).every((m) => labIds.includes(m)), labIds);
  }

  // --- 2. the combo -----------------------------------------------------------
  {
    check("each hit settles into the next hit's wind-up", hits.every((h, n) => h.next === hits[(n + 1) % 3].from));
    const REST = H.moves[Object.keys(H.moves)[0]].pose(0, hits[0].move.ends[5], {}, 0) && hits[0].move.ends[5];
    let worst = 0;
    let where = '';
    const cases = [[0, true, REST], [0, false, hits[0].from], [1, false, hits[1].from], [2, false, hits[2].from]];
    for (const [n, fresh, capture] of cases) {
      const mv = hits[n].move;
      for (const ph of mv.timeline.phases.slice(1)) {
        const b = mv.timeline.startOf(ph.id);
        const a1 = mv.pose(b - 1e-5, capture, {}, fresh ? 0 : 1);
        const a2 = mv.pose(b + 1e-5, capture, {}, fresh ? 0 : 1);
        for (const k of Object.keys(a1)) {
          const d = Math.abs(a1[k] - a2[k]);
          if (d > worst) {
            worst = d;
            where = `hit ${n + 1} ${fresh ? 'fresh' : 'chained'} ${k} into ${ph.id}`;
          }
        }
      }
      if (!fresh) {
        const prev = hits[(n + 2) % 3].move;
        const held = prev.pose(prev.timeline.startOf('ready') + 0.01, hits[(n + 2) % 3].from, {}, 1);
        const start = mv.pose(mv.timeline.startOf('strike'), held, {}, 1);
        for (const k of Object.keys(held)) worst = Math.max(worst, Math.abs(held[k] - start[k]));
      }
    }
    for (const mv of moves) {
      for (const ph of mv.timeline.phases.slice(1)) {
        const b = mv.timeline.startOf(ph.id);
        const a1 = mv.pose(b - 1e-5, REST, {}, 0);
        const a2 = mv.pose(b + 1e-5, REST, {}, 0);
        for (const k of Object.keys(a1)) {
          const d = Math.abs(a1[k] - a2[k]);
          if (d > worst) {
            worst = d;
            where = `${mv.id} ${k} into ${ph.id}`;
          }
        }
      }
    }
    check('every hit, chain and ability is continuous (no pop at a phase change)', worst < 0.01, { worst: r3(worst), where });
    const L = H.comboLab;
    const contact = L.strikes.map((s) => `${L.at(s - 0.002).phase}>${L.at(s + 0.002).phase}`);
    check("the lab combo's three cues sit on each contact", contact.every((p) => p === 'strike>overshoot'), contact);
    // comboHitOf: 1-2-3, order-safe, idempotent per event, a skill or the
    // window lapsing starts over.
    const R = rigOf(H.id);
    run(R, 10);
    const seq = [];
    for (let i = 0; i < 4; i++) {
      const ev = { i };
      seq.push(R.c.comboHitOf(ev));
      R.c.cue('basic', ev); // the integrator hearing it second: a no-op
      seq.push(R.c.comboHitOf(ev));
      run(R, Math.round(H.swingSec / DT));
    }
    R.c.cue('skill', { skill: skillsOf(H.id)[0], shape: SKILLS[skillsOf(H.id)[0]].shape });
    run(R, 5);
    const afterSkill = R.c.comboHitOf({ k: 1 });
    run(R, Math.round((H.hits[0].move.duration + 0.2) / DT));
    const afterLapse = R.c.comboHitOf({ k: 2 });
    check('comboHitOf counts 1-2-3 then over, once per event; a skill or a lapse restarts it', seq.join('') === '11223311' && afterSkill === 1 && afterLapse === 1, { seq: seq.join(''), afterSkill, afterLapse });
    const classic = createCritter(H.id, { facet: false });
    check('comboHitOf is 0 on the classic rig', classic.comboHitOf({}) === 0);
  }

  // --- 3. the blow -----------------------------------------------------------
  if (!H.ranged) {
    const pulls = hits.map((h) => r3(h.from.rz));
    check('every melee wind-up pulls the weight back before the blow (B9)', hits.every((h) => h.from.rz <= -0.03), pulls);
    const lean = hits.map((h) => r3(h.strike.pitch));
    check('every contact leans 20-25° into the target (B9)', hits.every((h) => h.strike.pitch >= 0.35 && h.strike.pitch <= LUNGE_PITCH_MAX + 1e-9), lean);
    const sq = hits.map((h) => `${r3(h.strike.sw)}x${r3(h.strike.sh)}`);
    check('every contact squashes +19% wide, about -9% tall (B9)', hits.every((h) => Math.abs(h.strike.sw - 1.19) < 0.02 && h.strike.sh <= 0.93 && h.strike.sh >= 0.84), sq);
    const lunge = hits.map((h) => r3(h.strike.rz));
    check('every contact lunges past rest within a lunge step (B9)', hits.every((h) => h.strike.rz > 0.04 && Math.max(h.strike.rz, h.over.rz) <= 0.18), lunge);
    const snap = hits.map((h) => {
      const p = h.move.pose(h.move.contact + 3 * FRAME, h.from, {}, 1);
      return Math.max(Math.abs(p.sw - 1), Math.abs(p.sh - 1));
    });
    check('the contact squash snaps back within 3 frames (B9)', snap.every((d) => d < 0.07), snap.map(r3));
  }
  {
    // B4: the press frame already moves the weapon (no ramp): a chained hit
    // strikes from its held wind-up, a fresh one winds from the stance
    const W = H.weaponField;
    const kick = hits.map((h, n) => {
      const mv = h.move;
      const t0 = mv.timeline.startOf('strike');
      const a = mv.pose(t0, h.from, {}, 1)[W];
      const b = mv.pose(t0 + DT, h.from, {}, 1)[W];
      const span = h.strike[W] - h.from[W];
      return Math.abs(span) < 1e-6 ? 1 : (b - a) / span;
    });
    const mv0 = hits[0].move;
    const REST0 = mv0.ends[mv0.ends.length - 1];
    const w0 = mv0.pose(DT, REST0, {}, 0)[W];
    const freshKick = Math.abs(hits[0].from[W] - REST0[W]) < 1e-6 ? 1 : (w0 - REST0[W]) / (hits[0].from[W] - REST0[W]);
    check('the weapon kicks on the press frame, no ramp (B4)', kick.every((k) => k >= 0.15) && freshKick >= 0.15, { chained: kick.map(r3), fresh: r3(freshKick) });
  }
  {
    const sizes = hits.map((h) => r3(size(h.strike)));
    const big = sizes[2] > Math.max(sizes[0], sizes[1]) && (hits[2].strike.hop > 0.1 || hits[2].strike.step >= 0.9 || hits[2].strike.sh >= 1.1);
    check('the third hit is the biggest: a hop, a lunge step or a stretch (B6)', big, sizes);
    const settle = [...moves.map((m) => `${m.id}:${m.keys[m.keys.length - 1].ease}`), ...hits.map((h) => `${h.move.id}:${h.move.keys[h.move.keys.length - 1].ease}`)];
    check('every move and hit settles into the stance with one small overshoot (B5)', settle.every((s) => s.endsWith(':settle')), settle);
    // measured: the recover passes rest by a little, once
    const mv = hits[0].move;
    const r0 = mv.timeline.startOf('recover');
    const from = mv.pose(r0, hits[0].from, {}, 1);
    const REST = mv.ends[mv.ends.length - 1];
    let over = 0;
    let field = '';
    for (const k of Object.keys(REST)) {
      const span = from[k] - REST[k];
      if (Math.abs(span) < 0.05) continue;
      for (let t = r0; t <= mv.duration; t += 0.005) {
        const p = mv.pose(t, hits[0].from, {}, 1);
        const past = -(p[k] - REST[k]) / span;
        if (past > over) {
          over = past;
          field = k;
        }
      }
    }
    check('the recover overshoots the stance once, by a little (B5)', over > 0.02 && over < 0.1, { over: r3(over), field });
  }
  {
    // B2: the rig that struck holds its contact pose for the hitstop's ticks
    const R = rigOf(H.id);
    run(R, 12);
    const clock = R.c.lab.clock;
    R.c.cue('basic', { a: 1 });
    R.c.cue('connect', { tick: 100, attacker: 1 });
    R.c.cue('hitstop', { tick: 100, ticks: 2, cause: 'melee_arc', total: 2 });
    let atContact = 0;
    let reached = false;
    const contact = clock.moveContact;
    run(R, 30, () => {
      if (Math.abs(clock.moveTime - contact) < 1e-9) atContact++;
      if (clock.moveTime >= contact) reached = true;
    });
    if (!H.ranged) check('the contact pose holds through the hitstop the rig struck (B2)', reached && atContact >= 2 && atContact <= 3, { framesAtContact: atContact });
    else check('a shot plays on through a hitstop on its own tick (no melee contact hold)', reached && atContact <= 1, { framesAtContact: atContact });
  }
  {
    // any hitstop holds the whole rig (the sim froze the world)
    const R = rigOf(H.id);
    R.c.setAnim('idle');
    run(R, 30);
    const before = R.c.lab.parts.torso.rotation.y;
    R.c.cue('hitstop', { tick: 7, ticks: 3, cause: 'kill', total: 3 });
    const held = [];
    run(R, 3, () => held.push(R.c.lab.parts.torso.rotation.y));
    run(R, 4);
    const moved = R.c.lab.parts.torso.rotation.y;
    check('any hitstop holds the whole rig for its ticks, then it moves on', held.every((v) => v === before) && moved !== before, { held: held.map(r3), moved: r3(moved) });
  }
  if (!H.ranged) {
    // B3: the recoil follows a connect (after the hold); a whiff does not
    const zOf = (connect) => {
      const R = rigOf(H.id);
      run(R, 12);
      R.c.cue('basic', { a: 1 });
      if (connect) {
        R.c.cue('connect', { tick: 100 });
        R.c.cue('hitstop', { tick: 100, ticks: 2 });
      }
      const z = [];
      run(R, 40, () => z.push(R.rig.position.z));
      return { z, contactFrame: null };
    };
    const hitZ = zOf(true).z;
    const whiffZ = zOf(false).z;
    // align: the connect run holds 2 frames at contact, so compare its frame
    // f + 2 with the whiff's frame f after the contact
    const contactF = Math.ceil(hits[0].move.contact / DT);
    let peak = 0;
    let peakF = -1;
    let tail = 0;
    for (let f = contactF; f < whiffZ.length - 2; f++) {
      const d = whiffZ[f] - hitZ[f + 2];
      if (d > peak) {
        peak = d;
        peakF = f - contactF;
      }
      if (f - contactF > 22) tail = Math.max(tail, Math.abs(d));
    }
    check('a connect shoves the rig back 0.08-0.12 u within 3 frames of the hold (B3)', peak >= 0.08 && peak <= 0.125 && peakF <= 6, { peak: r3(peak), framesAfterContact: peakF });
    check('the recoil fades within about 10 frames', tail < 0.01, r3(tail));
  } else {
    const R = rigOf(H.id);
    run(R, 12);
    const peaks = [];
    for (let i = 0; i < 3; i++) {
      R.c.cue('basic', { i });
      let p = 0;
      let short = 0;
      run(R, Math.round(H.swingSec / DT), () => {
        const s = R.c.lab.clock.shot();
        p = Math.max(p, s.sw);
        short = Math.max(short, 1 - s.sh);
      });
      peaks.push([r3(p), r3(short)]);
    }
    const want = SHOT.wide.map((w, i) => [1 + w, SHOT.short[i]]);
    check('each shot squashes the shooter 20%, 29%, then 38% wider and 10% shorter (B3)', peaks.every(([w, s], i) => Math.abs(w - want[i][0]) < 0.01 && Math.abs(s - want[i][1]) < 0.01), peaks);
    const s = R.c.lab.clock.shot();
    check('the shot squash is back to shape between shots', Math.abs(s.sw - 1) < 0.01 && Math.abs(s.sh - 1) < 0.01, [r3(s.sw), r3(s.sh)]);
  }

  // --- 4. the rig ---------------------------------------------------------------
  {
    // B7: the spawn grows the body in from the floor
    const R = rigOf(H.id);
    run(R, 10);
    R.c.cue('spawn');
    const sc = [];
    run(R, Math.ceil((SPAWN_SEC + 0.1) / DT), () => sc.push(R.c.lab.clock.spawn()));
    const first = sc[0];
    const peak = Math.max(...sc);
    const peakAt = sc.indexOf(peak) * DT;
    const end = sc[sc.length - 1];
    check('the spawn grows from the floor with about 10% overshoot in about 7 frames (B7)', first < 0.45 && peak > 1.07 && peak < 1.13 && peakAt <= 6 * FRAME && Math.abs(end - 1) < 1e-6, { first: r3(first), peak: r3(peak), peakAt: r3(peakAt), end: r3(end) });
    const R2 = rigOf(H.id);
    run(R2, 10);
    R2.c.cue('spawn');
    run(R2, 2);
    check('the rig itself scales with the spawn', R2.rig.scale.y < 0.7, r3(R2.rig.scale.y));
    // the feet grow in with the body, never left standing at full size
    R2.world.updateMatrixWorld(true);
    const reach = Math.max(...R2.c.lab.feet().map((ft) => Math.hypot(ft.drawnX - R2.c.group.position.x, ft.drawnZ - R2.c.group.position.z)));
    const R3 = rigOf(H.id);
    run(R3, 12);
    R3.world.updateMatrixWorld(true);
    const full = Math.max(...R3.c.lab.feet().map((ft) => Math.hypot(ft.drawnX, ft.drawnZ)));
    check('the feet grow in with the body', reach < full * 0.75, { growing: r3(reach), full: r3(full) });
  }
  {
    // B8: named hand and tip, and the tip travels through the combo
    const R = rigOf(H.id);
    run(R, 10);
    const hand = R.c.pointWorld('hand');
    const tip = R.c.pointWorld('tip');
    let path = 0;
    const prev = tip ? tip.clone() : new Vector3();
    const now = new Vector3();
    R.c.cue('basic', { n: 1 });
    run(R, Math.round(H.swingSec / DT) * 3, (f) => {
      if (f === Math.round(H.swingSec / DT) || f === 2 * Math.round(H.swingSec / DT)) R.c.cue('basic', { n: f });
      R.world.updateMatrixWorld(true);
      R.c.pointWorld('tip', now);
      path += now.distanceTo(prev);
      prev.copy(now);
    });
    check('hand and tip are named points (B8)', !!hand && !!tip, { hand: !!hand, tip: !!tip });
    check('the tip travels with the weapon through the combo', path > 0.6, r3(path));
  }
  {
    // the hips lead the weapon (the body throws it)
    const R = rigOf(H.id);
    run(R, 20);
    R.c.cue('basic', {});
    const h0 = hits[0];
    const midHip = (h0.from.yaw + h0.strike.yaw) / 2;
    const midW = (h0.from[H.weaponField] + h0.strike[H.weaponField]) / 2;
    const hipDown = h0.strike.yaw < h0.from.yaw;
    const wDown = h0.strike[H.weaponField] < h0.from[H.weaponField];
    let hipF = -1;
    let wF = -1;
    run(R, 40, (f) => {
      const hy = R.c.lab.parts.torso.rotation.y;
      const wv = R.c.lab.swing();
      if (hipF < 0 && (hipDown ? hy < midHip : hy > midHip)) hipF = f;
      if (wF < 0 && (wDown ? wv < midW : wv > midW)) wF = f;
    });
    check('the hips turn through the swing before the weapon does', hipF >= 0 && wF > hipF, { hipFrame: hipF, weaponFrame: wF });
  }
  {
    // locked feet, eight ways under a fixed aim
    const rows = [];
    let worstLock = 0;
    let both = 0;
    const ws = H.walkSpeed;
    for (let d = 0; d < 8; d++) {
      const a = (d * Math.PI) / 4;
      const vx = Math.sin(a) * ws;
      const vz = Math.cos(a) * ws;
      const R = rigOf(H.id);
      R.c.setYaw(0);
      R.c.setAnim('idle');
      run(R, 20);
      R.c.setAnim('walk');
      let prev = R.c.lab.feet();
      let steps = 0;
      let pitch = 0;
      let roll = 0;
      let n = 0;
      for (let f = 0; f < 180; f++) {
        R.c.group.position.x += vx * DT;
        R.c.group.position.z += vz * DT;
        run(R, 1);
        R.world.updateMatrixWorld(true);
        const feet = R.c.lab.feet();
        if (feet.every((ft) => !ft.planted)) both++;
        feet.forEach((ft, i) => {
          if (ft.planted) worstLock = Math.max(worstLock, Math.hypot(ft.drawnX - ft.x, ft.drawnZ - ft.z));
          if (ft.planted && prev[i].planted) worstLock = Math.max(worstLock, Math.hypot(ft.x - prev[i].x, ft.z - prev[i].z));
          if (ft.planted && !prev[i].planted) steps++;
        });
        prev = feet;
        if (f > 40) {
          pitch += R.c.lab.parts.torso.rotation.x;
          roll += R.c.lab.parts.torso.rotation.z;
          n++;
        }
      }
      rows.push({ dir: d * 45, steps, pitch: r3(pitch / n), roll: r3(roll / n) });
    }
    check('planted feet never slide (drawn on their planted spot)', worstLock < 1e-3, r3(worstLock));
    check('the feet step one at a time', both === 0, both);
    check('every direction of travel steps the feet', rows.every((r) => r.steps >= 6), rows.map((r) => `${r.dir}:${r.steps}`));
    const fwd = rows[0];
    const back = rows[4];
    check('the walk leans into the travel: forward ahead, a backpedal back', fwd.pitch - back.pitch > 0.07, { forward: fwd.pitch, backpedal: back.pitch });
    check('a sidestep leans aside, each way', Math.sign(rows[2].roll) === -Math.sign(rows[6].roll) && Math.abs(rows[2].roll) > 0.03, { right: rows[2].roll, left: rows[6].roll });
  }
  {
    // steps land ahead along the travel
    const R = rigOf(H.id);
    R.c.setYaw(0);
    R.c.setAnim('walk');
    const v = new Vector3(1.5, 0, -1.5).multiplyScalar(H.walkSpeed / 2.12);
    let prev = R.c.lab.feet();
    let ahead = 0;
    let behind = 0;
    for (let f = 0; f < 200; f++) {
      R.c.group.position.addScaledVector(v, DT);
      run(R, 1);
      const feet = R.c.lab.feet();
      feet.forEach((ft, i) => {
        if (ft.planted && !prev[i].planted) {
          const rel = (ft.x - prev[i].x) * v.x + (ft.z - prev[i].z) * v.z;
          if (rel > 0) ahead++;
          else behind++;
        }
      });
      prev = feet;
    }
    check('each step lands further along the travel', ahead >= 6 && behind === 0, { ahead, behind });
  }
  {
    // a dash lifts both feet; they plant where they land and stay put
    const R = rigOf(H.id);
    R.c.setYaw(0);
    R.c.setAnim('walk');
    run(R, 20);
    let air = 0;
    for (let f = 0; f < 15; f++) {
      R.c.group.position.z += (1.8 / 15) * 1; // the shared dodge: 1.8 u in 15 ticks
      run(R, 1);
      if (R.c.lab.feet().every((ft) => !ft.planted)) air++;
    }
    R.c.setAnim('idle');
    run(R, 30);
    const a = R.c.lab.feet().map((ft) => [ft.x, ft.z]);
    run(R, 30);
    const b = R.c.lab.feet().map((ft) => [ft.x, ft.z]);
    const drift = Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1])));
    const near = Math.max(...R.c.lab.feet().map((ft) => Math.hypot(ft.x - R.c.group.position.x, ft.z - (R.c.group.position.z + 0.3))));
    check('a dash lifts both feet off the floor', air >= 8, air);
    check('after a dash the feet plant under the body and stay put', drift < 1e-6 && near < 0.6, { drift: r3(drift), near: r3(near) });
  }
  {
    // the finisher's lunge step or hop moves the feet with the body
    const R = rigOf(H.id);
    run(R, 20);
    const z0 = Math.max(...R.c.lab.feet().map((ft) => ft.z));
    let lift = 0;
    let reach = 0;
    for (let i = 0; i < 3; i++) {
      R.c.cue('basic', { i });
      run(R, Math.round(H.swingSec / DT), () => {
        const feet = R.c.lab.feet();
        lift = Math.max(lift, Math.min(...feet.map((ft) => ft.drawnY)));
        reach = Math.max(reach, Math.max(...feet.map((ft) => ft.z)) - z0);
      });
    }
    const fin = hits[2].strike;
    if (fin.hop > 0.1) check('the finisher hops: both feet leave the floor', lift > 0.05, r3(lift));
    if (fin.step >= 0.5) check('the finisher lunges: the lead foot steps in', reach > 0.08, r3(reach));
    if (fin.hop <= 0.1 && fin.step < 0.5) check('the finisher moves the feet (hop or lunge)', false, 'neither');
  }
  {
    // going down unlocks the feet and does not throw
    const R = rigOf(H.id);
    let ok = true;
    try {
      R.c.setAnim('downed');
      run(R, 90);
      R.c.setAnim('idle');
      run(R, 90);
    } catch (err) {
      ok = String(err);
    }
    check('downed and revived poses run', ok === true, ok === true ? '' : ok);
  }

  // --- 5. the look -------------------------------------------------------------
  {
    const R = rigOf(H.id);
    const parts = [];
    R.c.group.traverse((o) => {
      if (!o.isInstancedMesh || o.userData.inkHull) return;
      const hull = o.children.find((ch) => ch.isInstancedMesh && ch.instanceMatrix === o.instanceMatrix);
      parts.push({ name: o.name, count: o.count, inked: !!hull });
    });
    check('the rig carries instanced detail parts', parts.length >= 3 && parts.reduce((s, p) => s + p.count, 0) >= 24, parts.map((p) => `${p.name}:${p.count}`));
    const bare = parts.filter((p) => !p.inked && !/rivet|stud|tip|whisker|glint|bead|spark/.test(p.name)).map((p) => p.name);
    check('every instanced part is inked (bar small studs, tips and glints)', bare.length === 0, bare);
    const close = (a, b) => {
      const x = new Color(a);
      const y = new Color(b);
      return Math.abs(x.r - y.r) + Math.abs(x.g - y.g) + Math.abs(x.b - y.b) < 0.12;
    };
    const mats = new Set();
    R.c.group.traverse((o) => {
      if (!o.isMesh || o.userData.inkHull) return;
      for (const m of [].concat(o.material)) if (m && m.color && !m.map && !m.isShaderMaterial && !m.isSpriteMaterial) mats.add(m);
    });
    const amber = (c) => {
      const srgb = c.clone().convertLinearToSRGB();
      const hsl = {};
      srgb.getHSL(hsl);
      const max = Math.max(srgb.r, srgb.g, srgb.b);
      const sat = max > 0 ? (max - Math.min(srgb.r, srgb.g, srgb.b)) / max : 0;
      return hsl.h * 360 >= 30 && hsl.h * 360 <= 50 && sat > 0.35 && hsl.l > 0.4;
    };
    const list = [...mats];
    const ember = list.filter((m) => close(m.color.getHex(), '#FF5A36')).map((m) => `#${m.color.getHexString()}`);
    const violet = list.filter((m) => close(m.color.getHex(), PALETTE.godstuffViolet)).map((m) => `#${m.color.getHexString()}`);
    const heal = list.filter((m) => close(m.color.getHex(), PALETTE.brightHeal) && !(H.id === 'healer' && m.isMeshBasicMaterial)).map((m) => `#${m.color.getHexString()}`);
    const amb = list.filter((m) => m.isMeshToonMaterial && amber(m.color)).map((m) => `#${m.color.getHexString()}`);
    check('no Ember or Violet on the rig', ember.length === 0 && violet.length === 0, { ember, violet });
    check(H.id === 'healer' ? 'Bright Heal only on her gem (it heals)' : 'no Bright Heal on the rig', heal.length === 0, heal);
    check('no body material in the amber family', amb.length === 0, amb);
  }
  {
    const q = (s) => new URLSearchParams(s);
    check('the model standard plays this hero by default', MODEL_STANDARD[H.id] === true && facetOn(H.id, q('')));
    check('?facet=0 turns it classic, ?facet=<other> leaves it classic', !facetOn(H.id, q('facet=0')) && !facetOn(H.id, q('facet=wyrm')) && facetOn(H.id, q(`facet=${H.id}`)));
    const classic = createCritter(H.id, { facet: false });
    const faceted = createCritter(H.id, { facet: true });
    check('the classic rig still builds beside the faceted one', classic.modelStandard === false && classic.lab === null && faceted.modelStandard === true);
  }
}

console.log(fails.length ? `\n${fails.length} FAIL` : '\nall pass');
process.exit(fails.length ? 1 : 0);
