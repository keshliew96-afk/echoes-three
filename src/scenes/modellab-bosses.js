// MODEL LAB ENTRIES for the Level I bosses (docs/MODEL_STANDARD.md). The lab
// (scenes/modellab.js) lists every entry as a model tab; an entry builds its
// faceted model and its classic twin on first view and drives both itself:
//
//   { id, label, abilities: [[id, label]], frame: { y, z, dist, speed, loop,
//     side }, build({ cosmetic, vfx, play }) -> { group, classic, update(state,
//     dt, abT), timeline(ability), cues(ability), onCue(id, at), reset(),
//     debug() } }
//
// `state` is the lab's (read only): mode, ability, classic, movePhase. dt is
// 0 while Still; abT is clamped to the timeline. update places the model (and
// the classic twin at -side when state.classic) and poses both.
import { PALETTE } from '../data/palette.js';
import { buildStag } from '../render/boss/stag.js';
import { buildStagFacet, STAG_ABILITIES, STAG_WALK } from '../render/boss/stagfacet.js';
import { buildThornmotherFacet, THORN_ABILITIES, THORN_CHARGE, THORN_WALK } from '../render/boss/thornmotherfacet.js';
import { buildGloamWolf, buildMireKing } from '../render/boss/third.js';
import { buildGloamWolfFacet, WOLF_ABILITIES, WOLF_WALK } from '../render/boss/gloamwolffacet.js';
import { buildHeron } from '../render/boss/heron.js';
import { buildHeronFacet, HERON_ABILITIES, HERON_DASH, HERON_WALK } from '../render/boss/heronfacet.js';
import { buildMillwheel, buildThornmother } from '../render/boss/slice2.js';
import { buildMillwheelFacet, MILL_ABILITIES, MILL_CUT, MILL_ROLL } from '../render/boss/millwheelfacet.js';
import { buildMireKingFacet, MIRE_ABILITIES, MIRE_WALK } from '../render/boss/mirekingfacet.js';

// The Move loop every entry walks: a circle of radius `loop`, facing along it.
export function loopPath(phase, loop) {
  return { x: Math.sin(phase) * loop, z: -Math.cos(phase) * loop + loop * 0.4, yaw: Math.atan2(Math.cos(phase), Math.sin(phase)) };
}
export const abilityOn = (state) => state.mode === 'ability' || (state.mode === 'still' && state.t > 0);
// Locked feet in the lab: a jump back in the ability (its loop restarting) or
// a scrub while Still re-plants them on the pose's stance; a frozen moment
// keeps them where the motion left them.
// A reset from the lab (a new mode or model) waits for the next update, so
// the feet plant where the model is placed, not where it was.
const lastAbT = new WeakMap();
export const pending = new WeakSet();
export function replant(rig, state, on, abT) {
  const last = lastAbT.get(rig) ?? 0;
  if (pending.has(rig) || (on && abT < last - 0.25) || (state.mode === 'still' && Math.abs(abT - last) > 0.05)) rig.lab.reset();
  pending.delete(rig);
  lastAbT.set(rig, on ? abT : 0);
}
export const follow = (v, target, dt, rate) => v + (target - v) * (1 - Math.exp(-rate * dt));

// The Hollow Stag. Trample travels in the lab as it does in the game (the
// sim's 12-tick lunge at 5.4 u/s), so the gallop's locked hooves can be judged.
const TRAMPLE_SPEED = 5.4;
function trampleTravel(abT) {
  const tl = STAG_ABILITIES.trample;
  const a = tl.startOf('charge');
  const b = a + 0.2;
  return TRAMPLE_SPEED * (Math.min(b, Math.max(a, abT)) - a);
}

const stagEntry = {
  id: 'stag',
  label: 'Hollow Stag',
  abilities: [
    ['quake', 'Antler Quake'],
    ['trample', 'Trample'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.3, z: 0, dist: 8.2, speed: STAG_WALK, loop: 3.4, side: 2.8 },
  build({ cosmetic, vfx, play }) {
    const rig = buildStagFacet();
    const classic = buildStag(cosmetic);
    let tel = 0;
    let lunge = 0;
    let walk = 0;
    let idle = 0;
    let yaw = 0;
    return {
      group: rig.group,
      classic: classic.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => STAG_ABILITIES[id] || STAG_ABILITIES.quake,
      cues: (id) => (STAG_ABILITIES[id] || STAG_ABILITIES.quake).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        classic.group.position.set(0, 0, 0);
        rig.setYaw(0);
        classic.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = stagEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const side = state.classic ? F.side : 0;
        const ahead = ability === 'trample' ? trampleTravel(abT) : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT, moveK: moving ? 1 : 0 });
        // the classic twin: its own pose, fed the same beats
        idle += dt;
        const s = ability ? STAG_ABILITIES[ability].sample(abT) : null;
        tel = follow(tel, s && ability === 'quake' && s.id === 'rear' ? 1 : 0, dt, 12);
        lunge = follow(lunge, s && ability === 'trample' && (s.id === 'charge' || s.id === 'gather') ? 1 : 0, dt, 18);
        walk += (moving ? F.speed : 0) * dt * Math.PI * 2.2;
        classic.group.position.set(p.x - side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        classic.setYaw(yaw);
        classic.group.scale.setScalar(ability === 'spawn' ? rig.lab.grow() : 1);
        classic.pose({ t: idle, walkPhase: walk, moveK: moving ? 1 : 0, telegraphK: tel, lungeK: lunge, hpFrac: 1 });
      },
      onCue(id, at) {
        if (id === 'quake') {
          play('quake_hit');
          vfx.crack({ x: at.x, z: at.z + 0.9, radius: 1.6, glow: PALETTE.godstuffViolet });
          vfx.ring({ x: at.x, z: at.z + 0.9, r0: 0.3, r1: 1.6, width: 0.3, life: 0.5, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'gore') {
          play('trample');
          vfx.flash({ x: at.x + Math.sin(yaw) * 1.6, y: 1.2, z: at.z + Math.cos(yaw) * 1.6, size: 0.9, color: PALETTE.godstuffViolet, life: 0.22 });
        }
      },
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow(), channels: rig.lab.channels() }),
    };
  },
};

// The Thornmother. The Briar Charge crosses the frame at the sim's 10 u/s
// (it paws at one side and skids to a stop at the other), so the gallop's
// hooves and the stop's brace can be judged at speed.
function chargeTravel(abT) {
  const tl = THORN_ABILITIES.charge;
  const a = tl.startOf('burst');
  const b = tl.startOf('stop');
  const span = THORN_CHARGE * (b - a);
  return THORN_CHARGE * (Math.min(b, Math.max(a, abT)) - a) - span / 2;
}

const thornEntry = {
  id: 'thornmother',
  label: 'Thornmother',
  abilities: [
    ['volley', 'Seed Volley'],
    ['charge', 'Briar Charge'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 0.9, z: 0, dist: 8.6, speed: THORN_WALK, loop: 3.4, side: 3.0 },
  build({ cosmetic, vfx, play }) {
    const rig = buildThornmotherFacet();
    const classic = buildThornmother(cosmetic);
    let tel = 0;
    let skid = 0;
    let walk = 0;
    let idle = 0;
    let yaw = 0;
    const stand = { telegraph: null, mode: 'root' };
    return {
      group: rig.group,
      classic: classic.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => THORN_ABILITIES[id] || THORN_ABILITIES.volley,
      cues: (id) => (THORN_ABILITIES[id] || THORN_ABILITIES.volley).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        classic.group.position.set(0, 0, 0);
        rig.setYaw(0);
        classic.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = thornEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const side = state.classic ? F.side : 0;
        const ahead = ability === 'charge' ? chargeTravel(abT) : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT });
        // the classic twin, fed a stand-in entity for the same beats
        idle += dt;
        const s = ability ? THORN_ABILITIES[ability].sample(abT) : null;
        const ph = s && ability === 'charge' ? s.id : null;
        tel = follow(tel, ph === 'paw' ? 1 : 0, dt, 10);
        skid = follow(skid, ph === 'stop' || ph === 'hold' || ph === 'skid' ? 1 : 0, dt, 10);
        stand.telegraph = ph === 'paw' ? { attack: 'charge' } : null;
        stand.mode = ph === 'burst' || ph === 'run' ? 'charge' : skid > 0.5 ? 'skid' : 'root';
        walk += (moving || stand.mode === 'charge' ? F.speed * (stand.mode === 'charge' ? 4 : 1) : 0) * dt * Math.PI * 2.2;
        classic.group.position.set(p.x - side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        classic.setYaw(yaw);
        classic.group.scale.setScalar(ability === 'spawn' ? rig.lab.grow() : 1);
        classic.pose({ t: idle, walkPhase: walk, moveK: moving ? 1 : 0, telegraphK: tel, lungeK: stand.mode === 'charge' ? 1 : 0, hpFrac: 1, e: stand });
      },
      onCue(id, at) {
        const fx = (d) => ({ x: at.x + Math.sin(yaw) * d, z: at.z + Math.cos(yaw) * d });
        if (id === 'volley') {
          play('bx_thornmother_volley');
          const c = fx(-0.2);
          vfx.flash({ x: c.x, y: 1.9, z: c.z, size: 1.1, color: PALETTE.godstuffViolet, life: 0.25 });
        } else if (id === 'charge') {
          play('bx_thornmother_charge');
          const c = fx(-0.9);
          vfx.ring({ x: c.x, z: c.z, r0: 0.2, r1: 1.0, width: 0.25, life: 0.35, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'stop') {
          play('bx_thornmother_stop');
          const c = fx(1.0);
          vfx.crack({ x: c.x, z: c.z, radius: 1.1, glow: PALETTE.godstuffViolet });
        }
      },
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow(), channels: rig.lab.channels() }),
    };
  },
};

// The Gloam Wolf. The Pounce bounds across the frame (the sim's leap covers
// up to 8.5 u in 16 ticks; the lab's is 4.8 u), so the arc, the tucked paws
// and the landing plant can be judged.
const POUNCE_SPAN = 4.8;
function pounceTravel(abT) {
  const tl = WOLF_ABILITIES.pounce;
  const a = tl.startOf('leap');
  const b = tl.startOf('land');
  return POUNCE_SPAN * (Math.min(b, Math.max(a, abT)) - a) / (b - a) - POUNCE_SPAN / 2;
}

const wolfEntry = {
  id: 'gloamwolf',
  label: 'Gloam Wolf',
  abilities: [
    ['pounce', 'Pounce'],
    ['rend', 'Rend'],
    ['howl', 'Moon Howl'],
    ['rage', 'Enraged'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.2, z: 0, dist: 8.4, speed: WOLF_WALK, loop: 3.4, side: 2.8 },
  build({ cosmetic, vfx, play }) {
    const rig = buildGloamWolfFacet();
    const classic = buildGloamWolf(cosmetic);
    let tel = 0;
    let walk = 0;
    let idle = 0;
    let yaw = 0;
    const stand = { telegraph: null, mode: 'stalk', enraged: false };
    return {
      group: rig.group,
      classic: classic.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => WOLF_ABILITIES[id] || WOLF_ABILITIES.pounce,
      cues: (id) => (WOLF_ABILITIES[id] || WOLF_ABILITIES.pounce).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        classic.group.position.set(0, 0, 0);
        rig.setYaw(0);
        classic.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = wolfEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const side = state.classic ? F.side : 0;
        const ahead = ability === 'pounce' ? pounceTravel(abT) : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT });
        // the classic twin, fed a stand-in entity for the same beats
        idle += dt;
        const s = ability && ability !== 'spawn' ? WOLF_ABILITIES[ability].sample(abT) : null;
        const ph = s ? s.id : null;
        const warn = (ability === 'pounce' && ph === 'crouch') || (ability === 'rend' && ph === 'wind') || (ability === 'howl' && ph === 'rise');
        tel = warn ? s.k : follow(tel, 0, dt, 12);
        stand.telegraph = warn ? { attack: ability } : null;
        stand.mode = ability === 'pounce' ? (ph === 'crouch' ? 'crouch' : ph === 'leap' ? 'leap' : 'stalk') : 'stalk';
        stand.enraged = ability === 'rage';
        walk += (moving ? F.speed : 0) * dt * Math.PI * 2.2;
        classic.group.position.set(p.x - side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        classic.setYaw(yaw);
        classic.group.scale.setScalar(ability === 'spawn' ? rig.lab.grow() : 1);
        classic.pose({ t: idle, walkPhase: walk, moveK: moving ? 1 : 0, telegraphK: tel, hpFrac: 1, e: stand });
      },
      onCue(id, at) {
        const fx = (d) => ({ x: at.x + Math.sin(yaw) * d, z: at.z + Math.cos(yaw) * d });
        if (id === 'leap') play('bx_gloamwolf_tell');
        else if (id === 'land') {
          play('bx_gloamwolf_pounce');
          const c = fx(0.6);
          vfx.ring({ x: c.x, z: c.z, r0: 0.3, r1: 1.5, width: 0.3, life: 0.4, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'rend') {
          play('bx_gloamwolf_rend');
          const c = fx(1.4);
          vfx.flash({ x: c.x, y: 0.9, z: c.z, size: 1.0, color: PALETTE.godstuffViolet, life: 0.2 });
        } else if (id === 'howl') {
          play('bx_gloamwolf_howl');
          vfx.ring({ x: at.x, z: at.z, r0: 0.5, r1: 3.2, width: 0.35, life: 0.6, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        }
      },
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow(), channels: rig.lab.channels() }),
    };
  },
};

// --- Level II (docs/MODEL_STANDARD.md "The Level II bosses").

// The Drowned Heron. The Bill Spear dashes across the frame at the sim's
// 11 u/s, so the skim, the trailed legs and the landing's plant can be judged.
function dashTravel(abT) {
  const tl = HERON_ABILITIES.spear;
  const a = tl.startOf('dash');
  const b = tl.startOf('land');
  const span = HERON_DASH * (b - a);
  return HERON_DASH * (Math.min(b, Math.max(a, abT)) - a) - span / 2;
}

const heronEntry = {
  id: 'heron',
  label: 'Drowned Heron',
  abilities: [
    ['spear', 'Bill Spear'],
    ['wingbeat', 'Wingbeat'],
    ['dive', 'Submerge'],
    ['surface', 'Surface'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.5, z: 0, dist: 8.6, speed: HERON_WALK, loop: 3.4, side: 2.6 },
  build({ cosmetic, vfx, play }) {
    const rig = buildHeronFacet();
    const classic = buildHeron(cosmetic);
    let tel = 0;
    let lunge = 0;
    let walk = 0;
    let idle = 0;
    let yaw = 0;
    const stand = { telegraph: null, submerged: false };
    return {
      group: rig.group,
      classic: classic.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => HERON_ABILITIES[id] || HERON_ABILITIES.spear,
      cues: (id) => (HERON_ABILITIES[id] || HERON_ABILITIES.spear).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        classic.group.position.set(0, 0, 0);
        rig.setYaw(0);
        classic.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = heronEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const side = state.classic ? F.side : 0;
        const ahead = ability === 'spear' ? dashTravel(abT) : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT });
        // the classic twin, fed a stand-in entity for the same beats
        idle += dt;
        const s = ability && ability !== 'spawn' ? HERON_ABILITIES[ability].sample(abT) : null;
        const ph = s ? s.id : null;
        const warn = (ability === 'spear' && ph === 'coil') || (ability === 'wingbeat' && ph === 'raise');
        tel = warn ? s.k : follow(tel, 0, dt, 12);
        lunge = follow(lunge, ability === 'spear' && (ph === 'thrust' || ph === 'dash') ? 1 : 0, dt, 18);
        stand.telegraph = warn ? { attack: ability } : null;
        stand.submerged = (ability === 'dive' && ph === 'under') || (ability === 'surface' && ph === 'rise');
        walk += (moving ? F.speed : 0) * dt * Math.PI * 2.2;
        classic.group.position.set(p.x - side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        classic.setYaw(yaw);
        classic.group.scale.setScalar(ability === 'spawn' ? rig.lab.grow() : 1);
        classic.pose({ t: idle, walkPhase: walk, moveK: moving ? 1 : 0, telegraphK: tel, lungeK: lunge, hpFrac: 1, e: stand });
      },
      onCue(id, at) {
        const fx = (d) => ({ x: at.x + Math.sin(yaw) * d, z: at.z + Math.cos(yaw) * d });
        if (id === 'spear') {
          play('bx_heron_spear');
          const c = fx(1.6);
          vfx.flash({ x: c.x, y: 1.4, z: c.z, size: 0.8, color: PALETTE.godstuffViolet, life: 0.2 });
        } else if (id === 'land') {
          play('bx_heron_pierce');
          const c = fx(0.3);
          vfx.ring({ x: c.x, z: c.z, r0: 0.2, r1: 1.1, width: 0.25, life: 0.35, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'wingbeat') {
          play('bx_heron_wing');
          vfx.ring({ x: at.x, z: at.z, r0: 0.4, r1: 2.2, width: 0.3, life: 0.45, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'dive') {
          play('bx_heron_dive');
          vfx.ring({ x: at.x, z: at.z, r0: 0.3, r1: 1.3, width: 0.25, life: 0.5, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'surface') {
          play('bx_heron_surface');
          vfx.crack({ x: at.x, z: at.z, radius: 1.8, glow: PALETTE.godstuffViolet });
          vfx.ring({ x: at.x, z: at.z, r0: 0.3, r1: 1.8, width: 0.3, life: 0.5, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        }
      },
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow(), channels: rig.lab.channels() }),
    };
  },
};

// The Millwheel. The Crosscut rolls across the frame at the sim's 9 u/s, so
// the roll on its paddles can be judged at speed (the planted paddle holds
// its spot while the hub pivots over it).
function cutTravel(abT) {
  const tl = MILL_ABILITIES.crosscut;
  const a = tl.startOf('burst');
  const b = tl.startOf('slam');
  const span = MILL_CUT * (b - a);
  return MILL_CUT * (Math.min(b, Math.max(a, abT)) - a) - span / 2;
}

const millEntry = {
  id: 'millwheel',
  label: 'Millwheel',
  abilities: [
    ['shards', 'Cog Shards'],
    ['crosscut', 'Crosscut'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.3, z: 0, dist: 8.2, speed: MILL_ROLL, loop: 3.4, side: 2.6 },
  build({ cosmetic, vfx, play }) {
    const rig = buildMillwheelFacet();
    const classic = buildMillwheel(cosmetic);
    let tel = 0;
    let idle = 0;
    let yaw = 0;
    let spin = 0;
    let lastAhead = 0;
    let lastMove = null;
    const stand = { telegraph: null, mode: 'roll', spin: 0 };
    return {
      group: rig.group,
      classic: classic.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => MILL_ABILITIES[id] || MILL_ABILITIES.shards,
      cues: (id) => (MILL_ABILITIES[id] || MILL_ABILITIES.shards).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        classic.group.position.set(0, 0, 0);
        rig.setYaw(0);
        classic.setYaw(0);
        rig.lab.reset();
      },
      update(state, dt, abT) {
        const F = millEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const side = state.classic ? F.side : 0;
        const ahead = ability === 'crosscut' ? cutTravel(abT) : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        rig.lab.pose({ dt, ability, abT });
        // the classic twin, fed a stand-in entity: its roll from the same travel
        idle += dt;
        const s = ability && ability !== 'spawn' ? MILL_ABILITIES[ability].sample(abT) : null;
        const ph = s ? s.id : null;
        const warn = (ability === 'shards' && ph === 'wind') || (ability === 'crosscut' && ph === 'rock');
        tel = warn ? s.k : follow(tel, 0, dt, 12);
        stand.telegraph = warn ? { attack: ability } : null;
        stand.mode = ph === 'dizzy' ? 'dizzy' : ph === 'cut' || ph === 'burst' ? 'cut' : 'roll';
        if (moving && lastMove !== null) spin += Math.abs(state.movePhase - lastMove) * F.loop;
        spin += Math.abs(ahead - lastAhead);
        lastMove = moving ? state.movePhase : null;
        lastAhead = ahead;
        stand.spin = spin;
        classic.group.position.set(p.x - side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        classic.setYaw(yaw);
        classic.group.scale.setScalar(ability === 'spawn' ? rig.lab.grow() : 1);
        classic.pose({ t: idle, telegraphK: tel, hpFrac: 1, e: stand });
      },
      onCue(id, at) {
        const fx = (d) => ({ x: at.x + Math.sin(yaw) * d, z: at.z + Math.cos(yaw) * d });
        if (id === 'shards') {
          play('bx_millwheel_shards');
          const c = fx(1.4);
          vfx.flash({ x: c.x, y: 1.3, z: c.z, size: 1.0, color: PALETTE.godstuffViolet, life: 0.22 });
        } else if (id === 'crosscut') {
          play('bx_millwheel_saw');
          const c = fx(-0.6);
          vfx.ring({ x: c.x, z: c.z, r0: 0.2, r1: 1.1, width: 0.25, life: 0.35, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'slam') {
          play('bx_millwheel_clank');
          const c = fx(0.9);
          vfx.crack({ x: c.x, z: c.z, radius: 1.2, glow: PALETTE.godstuffViolet });
        }
      },
      debug: () => ({ roll: rig.lab.roll(), grow: rig.lab.grow(), channels: rig.lab.channels() }),
    };
  },
};

// The Mire King. The Belly Flop leaps across the frame (the sim's flop
// covers 3 to 8 u in 20 ticks; the lab's is 3.6 u), so the heave, the arc,
// the spread legs and the landing's plant can be judged.
const FLOP_SPAN = 3.6;
function flopTravel(abT) {
  const tl = MIRE_ABILITIES.flop;
  const a = tl.startOf('leap');
  const b = tl.startOf('hold');
  return FLOP_SPAN * (Math.min(b, Math.max(a, abT)) - a) / (b - a) - FLOP_SPAN / 2;
}

const mireEntry = {
  id: 'mireking',
  label: 'Mire King',
  abilities: [
    ['lash', 'Tongue Lash'],
    ['flop', 'Belly Flop'],
    ['swallow', 'Swallow'],
    ['rage', 'Enraged'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.0, z: 1.2, dist: 9.6, speed: MIRE_WALK, loop: 3.0, side: 3.0 },
  build({ vfx, play }) {
    const rig = buildMireKingFacet();
    const classic = buildMireKing();
    let tel = 0;
    let walk = 0;
    let idle = 0;
    let yaw = 0;
    const stand = { telegraph: null, mode: 'wade', enraged: false };
    return {
      group: rig.group,
      classic: classic.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => MIRE_ABILITIES[id] || MIRE_ABILITIES.lash,
      cues: (id) => (MIRE_ABILITIES[id] || MIRE_ABILITIES.lash).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        classic.group.position.set(0, 0, 0);
        rig.setYaw(0);
        classic.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = mireEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const side = state.classic ? F.side : 0;
        const ahead = ability === 'flop' ? flopTravel(abT) : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT });
        // the classic twin, fed a stand-in entity for the same beats
        idle += dt;
        const s = ability && ability !== 'spawn' ? MIRE_ABILITIES[ability].sample(abT) : null;
        const ph = s ? s.id : null;
        const warn = (ability === 'lash' && ph === 'draw') || (ability === 'flop' && (ph === 'heave' || ph === 'leap' || ph === 'land')) || (ability === 'swallow' && ph === 'gape');
        tel = warn ? s.k : follow(tel, 0, dt, 12);
        stand.telegraph = warn ? { attack: ability } : null;
        stand.mode = ability === 'flop' ? (ph === 'heave' ? 'heave' : ph === 'leap' || ph === 'land' ? 'flop' : 'wade') : 'wade';
        stand.enraged = ability === 'rage';
        walk += (moving ? F.speed : 0) * dt * Math.PI * 2.2;
        classic.group.position.set(p.x - side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        classic.setYaw(yaw);
        classic.group.scale.setScalar(ability === 'spawn' ? rig.lab.grow() : 1);
        classic.pose({ t: idle, walkPhase: walk, moveK: moving ? 1 : 0, telegraphK: tel, hpFrac: 1, e: stand });
      },
      onCue(id, at) {
        const fx = (d) => ({ x: at.x + Math.sin(yaw) * d, z: at.z + Math.cos(yaw) * d });
        if (id === 'lash') {
          play('bx_mireking_lash');
          const c = fx(3.5);
          vfx.flash({ x: c.x, y: 0.5, z: c.z, size: 0.9, color: PALETTE.godstuffViolet, life: 0.2 });
        } else if (id === 'leap') play('bx_mireking_tell');
        else if (id === 'flop') {
          play('bx_mireking_flop');
          vfx.crack({ x: at.x, z: at.z, radius: 2.0, glow: PALETTE.godstuffViolet });
          vfx.ring({ x: at.x, z: at.z, r0: 0.4, r1: 2.0, width: 0.3, life: 0.5, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'swallow') {
          play('bx_mireking_swallow');
          const c = fx(1.6);
          vfx.flash({ x: c.x, y: 1.0, z: c.z, size: 1.1, color: PALETTE.godstuffViolet, life: 0.22 });
        }
      },
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow(), channels: rig.lab.channels(), tongue: rig.lab.tongueLength() }),
    };
  },
};

export const LAB_ENTRIES = [stagEntry, thornEntry, wolfEntry, heronEntry, millEntry, mireEntry];
