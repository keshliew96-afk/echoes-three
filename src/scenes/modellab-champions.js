// MODEL LAB ENTRIES for the Level I, II and III champions
// (docs/MODEL_STANDARD.md "Level I champions", "Level II champions", "Level
// III champions"): the Briar Knight, the Moss Hart, the Sluice Warden, the
// Lockkeeper, the Bone Reeve and the Gravebell Ringer, each beside its
// classic twin. The entry shape is scenes/modellab-bosses.js's.
import { PALETTE } from '../data/palette.js';
import { buildBoneReeve, buildBriarKnight, buildSluiceWarden } from '../render/enemies/champions.js';
import { buildGravebellRinger, buildLockkeeper, buildMossHart } from '../render/enemies/champions2.js';
import { buildBriarKnightFacet, KNIGHT_ABILITIES, KNIGHT_CHARGE, KNIGHT_WALK } from '../render/enemies/champfacet/briarknight.js';
import { buildMossHartFacet, HART_ABILITIES, HART_WALK } from '../render/enemies/champfacet/mosshart.js';
import { buildSluiceWardenFacet, WARDEN_ABILITIES, WARDEN_WALK } from '../render/enemies/champfacet/sluicewarden.js';
import { buildLockkeeperFacet, KEEPER_ABILITIES, KEEPER_WALK, LAB_HOOK } from '../render/enemies/champfacet/lockkeeper.js';
import { buildBoneReeveFacet, REEVE_ABILITIES, REEVE_WALK } from '../render/enemies/champfacet/bonereeve.js';
import { buildGravebellRingerFacet, RINGER_ABILITIES, RINGER_WALK } from '../render/enemies/champfacet/gravebellringer.js';
import { abilityOn, follow, loopPath, pending, replant } from './modellab-bosses.js';

// The Briar Knight. The Bramble Charge crosses the frame at the sim's 9 u/s,
// so the run's locked feet and the braced stop can be judged at speed.
function chargeTravel(abT) {
  const tl = KNIGHT_ABILITIES.charge;
  const a = tl.startOf('drive');
  const b = tl.startOf('stop');
  const span = KNIGHT_CHARGE * (b - a);
  return KNIGHT_CHARGE * (Math.min(b, Math.max(a, abT)) - a) - span / 2;
}

const knightEntry = {
  id: 'briar_knight',
  label: 'Briar Knight',
  abilities: [
    ['charge', 'Bramble Charge'],
    ['ring', 'Thorn Ring'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.2, z: 0, dist: 7.4, speed: KNIGHT_WALK, loop: 3.0, side: 2.2 },
  build({ cosmetic, vfx, play }) {
    const rig = buildBriarKnightFacet();
    const classic = buildBriarKnight(cosmetic);
    let tel = 0;
    let walk = 0;
    let idle = 0;
    let yaw = 0;
    let moveTick = 0;
    let lastPh = null;
    const stand = { id: 1, telegraph: null, charge: null, lastMove: null, moveTick: -1, rage: false };
    return {
      group: rig.group,
      classic: classic.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => KNIGHT_ABILITIES[id] || KNIGHT_ABILITIES.charge,
      cues: (id) => (KNIGHT_ABILITIES[id] || KNIGHT_ABILITIES.charge).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        classic.group.position.set(0, 0, 0);
        rig.setYaw(0);
        classic.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = knightEntry.frame;
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
        // the classic twin: its own pose, fed the same beats
        idle += dt;
        const s = ability && ability !== 'spawn' ? KNIGHT_ABILITIES[ability].sample(abT) : null;
        const ph = s ? s.id : null;
        const warn = (ability === 'charge' && ph === 'couch') || (ability === 'ring' && ph === 'raise');
        tel = warn ? s.k : follow(tel, 0, dt, 12);
        stand.telegraph = warn ? { move: ability === 'charge' ? 'bramble_charge' : 'thorn_ring' } : null;
        stand.charge = ability === 'charge' && (ph === 'drive' || ph === 'run') ? {} : null;
        if (ability === 'ring' && ph === 'plant' && lastPh !== 'plant') {
          stand.lastMove = 'thorn_ring';
          stand.moveTick = ++moveTick;
        }
        lastPh = ph;
        walk += (moving ? F.speed : 0) * dt * Math.PI * 2.2;
        classic.group.position.set(p.x - side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        classic.setYaw(yaw);
        classic.group.scale.setScalar(ability === 'spawn' ? rig.lab.grow() : 1);
        classic.pose({ t: idle, walkPhase: walk, moveK: moving || stand.charge ? 1 : 0, telegraphK: tel, e: stand });
      },
      onCue(id, at) {
        const fx = (d) => ({ x: at.x + Math.sin(yaw) * d, z: at.z + Math.cos(yaw) * d });
        if (id === 'charge') {
          play('ch_bramble_charge');
          const c = fx(-0.4);
          vfx.ring({ x: c.x, z: c.z, r0: 0.2, r1: 1.0, width: 0.25, life: 0.35, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'ring') {
          play('ch_thorn_ring');
          const c = fx(0.6);
          vfx.crack({ x: c.x, z: c.z, radius: 1.4, glow: PALETTE.godstuffViolet });
          vfx.ring({ x: at.x, z: at.z, r0: 0.4, r1: 2.8, width: 0.3, life: 0.5, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        }
      },
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow(), channels: rig.lab.channels() }),
    };
  },
};

// The Moss Hart. The bound crosses the frame over the sim's flight, so the
// tucked legs and the landing on the forehooves can be judged.
const LEAP_SPAN = 5;
const HART_LEAP_H = 1.5; // the rig's peak lift, so the lab camera rises with it
function leapTravel(abT) {
  const tl = HART_ABILITIES.leap;
  const a = tl.startOf('bound');
  const b = tl.startOf('land');
  return (LEAP_SPAN * (Math.min(b, Math.max(a, abT)) - a)) / (b - a) - LEAP_SPAN / 2;
}

const hartEntry = {
  id: 'moss_hart',
  label: 'Moss Hart',
  abilities: [
    ['toss', 'Antler Toss'],
    ['leap', "Hart's Leap"],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.6, z: 0, dist: 8.6, speed: HART_WALK, loop: 3.4, side: 2.8 },
  build({ cosmetic, vfx, play }) {
    const rig = buildMossHartFacet();
    const classic = buildMossHart(cosmetic);
    let tel = 0;
    let walk = 0;
    let idle = 0;
    let yaw = 0;
    let moveTick = 0;
    let lastPh = null;
    const stand = { id: 2, telegraph: null, flight: null, lastMove: null, moveTick: -1, rage: false };
    return {
      group: rig.group,
      classic: classic.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => HART_ABILITIES[id] || HART_ABILITIES.toss,
      cues: (id) => (HART_ABILITIES[id] || HART_ABILITIES.toss).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        classic.group.position.set(0, 0, 0);
        rig.setYaw(0);
        classic.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = hartEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const side = state.classic ? F.side : 0;
        const ahead = ability === 'leap' ? leapTravel(abT) : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT });
        idle += dt;
        const s = ability && ability !== 'spawn' ? HART_ABILITIES[ability].sample(abT) : null;
        const ph = s ? s.id : null;
        const leaping = ability === 'leap' && (ph === 'gather' || ph === 'bound');
        const warn = (ability === 'toss' && ph === 'lower') || leaping;
        tel = warn ? Math.max(tel, s.k) : follow(tel, 0, dt, 12);
        stand.telegraph = ability === 'toss' && ph === 'lower' ? { move: 'antler_toss', startTick: 0, resolveTick: 48 } : leaping ? { move: 'harts_leap', startTick: 0, resolveTick: 74 } : null;
        stand.flight = leaping ? {} : null;
        const strike = (ability === 'toss' && ph === 'fling') || (ability === 'leap' && ph === 'land');
        if (strike && lastPh !== ph) {
          stand.lastMove = ability === 'toss' ? 'antler_toss' : 'harts_leap';
          stand.moveTick = ++moveTick;
        }
        lastPh = ph;
        walk += (moving ? F.speed : 0) * dt * Math.PI * 2.2;
        classic.group.position.set(p.x - side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        classic.setYaw(yaw);
        classic.group.scale.setScalar(ability === 'spawn' ? rig.lab.grow() : 1);
        classic.pose({ t: idle, tick: abT * 60, walkPhase: walk, moveK: moving ? 1 : 0, telegraphK: tel, e: stand });
      },
      onCue(id, at) {
        const fx = (d) => ({ x: at.x + Math.sin(yaw) * d, z: at.z + Math.cos(yaw) * d });
        if (id === 'toss') {
          play('ch_antler_toss');
          const c = fx(1.4);
          vfx.flash({ x: c.x, y: 1.8, z: c.z, size: 1.0, color: PALETTE.godstuffViolet, life: 0.22 });
        } else if (id === 'land') {
          play('ch_harts_leap');
          const c = fx(0.5);
          vfx.ring({ x: c.x, z: c.z, r0: 0.3, r1: 2.0, width: 0.3, life: 0.45, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        }
      },
      lift: () => HART_LEAP_H * rig.lab.channels().air,
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow(), channels: rig.lab.channels() }),
    };
  },
};

// The Sluice Warden (Level II). The gate slams down ahead, the maul comes
// down before him; the classic twin is fed the same warnings and strikes.
const wardenEntry = {
  id: 'sluice_warden',
  label: 'Sluice Warden',
  abilities: [
    ['floodgate', 'Floodgate'],
    ['undertow', 'Undertow'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.2, z: 0, dist: 7.6, speed: WARDEN_WALK, loop: 3.0, side: 2.4 },
  build({ cosmetic, vfx, play }) {
    const rig = buildSluiceWardenFacet();
    const classic = buildSluiceWarden(cosmetic);
    let tel = 0;
    let walk = 0;
    let idle = 0;
    let yaw = 0;
    let moveTick = 0;
    let lastPh = null;
    const stand = { id: 3, telegraph: null, lastMove: null, moveTick: -1, rage: false };
    return {
      group: rig.group,
      classic: classic.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => WARDEN_ABILITIES[id] || WARDEN_ABILITIES.floodgate,
      cues: (id) => (WARDEN_ABILITIES[id] || WARDEN_ABILITIES.floodgate).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        classic.group.position.set(0, 0, 0);
        rig.setYaw(0);
        classic.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = wardenEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const side = state.classic ? F.side : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + side, 0, p.z);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT });
        idle += dt;
        const s = ability && ability !== 'spawn' ? WARDEN_ABILITIES[ability].sample(abT) : null;
        const ph = s ? s.id : null;
        const warn = ph === 'heave' || ph === 'raise';
        tel = warn ? s.k : follow(tel, 0, dt, 12);
        stand.telegraph = warn ? { move: ability } : null;
        if ((ph === 'slam' || ph === 'smash') && lastPh !== ph) {
          stand.lastMove = ability;
          stand.moveTick = ++moveTick;
        }
        lastPh = ph;
        walk += (moving ? F.speed : 0) * dt * Math.PI * 2.2;
        classic.group.position.set(p.x - side, 0, p.z);
        classic.setYaw(yaw);
        classic.group.scale.setScalar(ability === 'spawn' ? rig.lab.grow() : 1);
        classic.pose({ t: idle, walkPhase: walk, moveK: moving ? 1 : 0, telegraphK: tel, e: stand });
      },
      onCue(id, at) {
        const fx = (d) => ({ x: at.x + Math.sin(yaw) * d, z: at.z + Math.cos(yaw) * d });
        if (id === 'floodgate') {
          play('ch_floodgate');
          const c = fx(1.4);
          vfx.crack({ x: c.x, z: c.z, radius: 1.2, glow: PALETTE.godstuffViolet });
          vfx.ring({ x: c.x, z: c.z, r0: 0.3, r1: 2.6, width: 0.3, life: 0.45, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'undertow') {
          play('ch_undertow');
          const c = fx(1.6);
          vfx.crack({ x: c.x, z: c.z, radius: 1.4, glow: PALETTE.godstuffViolet });
          vfx.ring({ x: c.x, z: c.z, r0: 0.4, r1: 1.9, width: 0.3, life: 0.5, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        }
      },
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow(), channels: rig.lab.channels() }),
    };
  },
};

// The Lockkeeper (Level II). The hook flies down a lab lane of LAB_HOOK u
// and reels back; the classic twin is fed the same warning with that lane.
const keeperEntry = {
  id: 'lockkeeper',
  label: 'Lockkeeper',
  abilities: [
    ['hook', 'Chain Hook'],
    ['turn', 'Lock Turn'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.5, z: 0.8, dist: 8.4, speed: KEEPER_WALK, loop: 3.0, side: 2.4 },
  build({ cosmetic, vfx, play }) {
    const rig = buildLockkeeperFacet();
    const classic = buildLockkeeper(cosmetic);
    let tel = 0;
    let walk = 0;
    let idle = 0;
    let yaw = 0;
    let moveTick = 0;
    let lastPh = null;
    const stand = { id: 4, telegraph: null, lastMove: null, moveTick: -1, rage: false };
    return {
      group: rig.group,
      classic: classic.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => KEEPER_ABILITIES[id] || KEEPER_ABILITIES.hook,
      cues: (id) => (KEEPER_ABILITIES[id] || KEEPER_ABILITIES.hook).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        classic.group.position.set(0, 0, 0);
        rig.setYaw(0);
        classic.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = keeperEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const side = state.classic ? F.side : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + side, 0, p.z);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT });
        idle += dt;
        const s = ability && ability !== 'spawn' ? KEEPER_ABILITIES[ability].sample(abT) : null;
        const ph = s ? s.id : null;
        const warn = ph === 'whirl' || ph === 'lift';
        tel = warn ? s.k : follow(tel, 0, dt, 12);
        const W = ability === 'hook' ? 58 : 70;
        stand.telegraph = warn ? { move: ability === 'hook' ? 'chain_hook' : 'lock_turn', startTick: 0, resolveTick: W, length: LAB_HOOK } : null;
        if ((ph === 'throw' || ph === 'drive') && lastPh !== ph) {
          stand.lastMove = ability === 'hook' ? 'chain_hook' : 'lock_turn';
          stand.moveTick = ++moveTick;
        }
        lastPh = ph;
        walk += (moving ? F.speed : 0) * dt * Math.PI * 2.2;
        classic.group.position.set(p.x - side, 0, p.z);
        classic.setYaw(yaw);
        classic.group.scale.setScalar(ability === 'spawn' ? rig.lab.grow() : 1);
        classic.pose({ t: idle, tick: warn ? s.k * W : 0, walkPhase: walk, moveK: moving ? 1 : 0, telegraphK: tel, e: stand });
      },
      onCue(id, at) {
        const fx = (d) => ({ x: at.x + Math.sin(yaw) * d, z: at.z + Math.cos(yaw) * d });
        if (id === 'hook') {
          play('ch_chain_hook');
          const c = fx(LAB_HOOK - 0.3);
          vfx.flash({ x: c.x, y: 0.9, z: c.z, size: 0.9, color: PALETTE.godstuffViolet, life: 0.22 });
        } else if (id === 'turn') {
          play('ch_lock_turn');
          const c = fx(0.7);
          vfx.crack({ x: c.x, z: c.z, radius: 1.0, glow: PALETTE.godstuffViolet });
          vfx.ring({ x: at.x, z: at.z, r0: 0.4, r1: 2.5, width: 0.3, life: 0.5, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        }
      },
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow(), channels: rig.lab.channels(), reach: rig.lab.reach() }),
    };
  },
};

// The Bone Reeve (Level III). The classic twin is fed the same warning and
// the strike's tick.
const reeveEntry = {
  id: 'bone_reeve',
  label: 'Bone Reeve',
  abilities: [
    ['sweep', 'Reaping Sweep'],
    ['lance', 'Grave Lance'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.5, z: 0, dist: 8.2, speed: REEVE_WALK, loop: 3.0, side: 2.6 },
  build({ cosmetic, vfx, play }) {
    const rig = buildBoneReeveFacet();
    const classic = buildBoneReeve(cosmetic);
    let tel = 0;
    let walk = 0;
    let idle = 0;
    let yaw = 0;
    let moveTick = 0;
    let lastPh = null;
    const stand = { id: 5, telegraph: null, lastMove: null, moveTick: -1, rage: false };
    const MOVE = { sweep: 'reaping_sweep', lance: 'grave_lance' };
    return {
      group: rig.group,
      classic: classic.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => REEVE_ABILITIES[id] || REEVE_ABILITIES.sweep,
      cues: (id) => (REEVE_ABILITIES[id] || REEVE_ABILITIES.sweep).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        classic.group.position.set(0, 0, 0);
        rig.setYaw(0);
        classic.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = reeveEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const side = state.classic ? F.side : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + side, 0, p.z);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT });
        idle += dt;
        const s = ability && ability !== 'spawn' ? REEVE_ABILITIES[ability].sample(abT) : null;
        const ph = s ? s.id : null;
        const warn = ph === 'draw' || ph === 'raise';
        tel = warn ? s.k : follow(tel, 0, dt, 12);
        stand.telegraph = warn ? { move: MOVE[ability] } : null;
        if ((ph === 'swing' || ph === 'drive') && lastPh !== ph) {
          stand.lastMove = MOVE[ability];
          stand.moveTick = ++moveTick;
        }
        lastPh = ph;
        walk += (moving ? F.speed : 0) * dt * Math.PI * 2.2;
        classic.group.position.set(p.x - side, 0, p.z);
        classic.setYaw(yaw);
        classic.group.scale.setScalar(ability === 'spawn' ? rig.lab.grow() : 1);
        classic.pose({ t: idle, walkPhase: walk, moveK: moving ? 1 : 0, telegraphK: tel, e: stand });
      },
      onCue(id, at) {
        const fx = (d) => ({ x: at.x + Math.sin(yaw) * d, z: at.z + Math.cos(yaw) * d });
        if (id === 'reaping_sweep') {
          play('ch_reaping_sweep');
          const c = fx(1.2);
          vfx.ring({ x: c.x, z: c.z, r0: 0.4, r1: 2.7, width: 0.3, life: 0.45, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'grave_lance') {
          play('ch_grave_lance');
          const c = fx(1.6);
          vfx.crack({ x: c.x, z: c.z, radius: 1.1, glow: PALETTE.godstuffViolet });
          vfx.ring({ x: c.x, z: c.z, r0: 0.3, r1: 1.6, width: 0.25, life: 0.4, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        }
      },
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow(), channels: rig.lab.channels() }),
    };
  },
};

// The Gravebell Ringer (Level III). The classic twin reads its warning's
// progress from a tick, so it is fed a 100-tick warning and the lab's tell.
const ringerEntry = {
  id: 'gravebell_ringer',
  label: 'Gravebell Ringer',
  abilities: [
    ['knell', 'Death Knell'],
    ['call', 'Grave Call'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 2.1, z: 0, dist: 10.4, speed: RINGER_WALK, loop: 3.0, side: 2.8 },
  build({ cosmetic, vfx, play }) {
    const rig = buildGravebellRingerFacet();
    const classic = buildGravebellRinger(cosmetic);
    let tel = 0;
    let walk = 0;
    let idle = 0;
    let yaw = 0;
    let moveTick = 0;
    let lastPh = null;
    const stand = { id: 6, telegraph: null, lastMove: null, moveTick: -1, rage: false };
    const MOVE = { knell: 'death_knell', call: 'grave_call' };
    return {
      group: rig.group,
      classic: classic.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => RINGER_ABILITIES[id] || RINGER_ABILITIES.knell,
      cues: (id) => (RINGER_ABILITIES[id] || RINGER_ABILITIES.knell).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        classic.group.position.set(0, 0, 0);
        rig.setYaw(0);
        classic.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = ringerEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const side = state.classic ? F.side : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + side, 0, p.z);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT });
        idle += dt;
        const s = ability && ability !== 'spawn' ? RINGER_ABILITIES[ability].sample(abT) : null;
        const ph = s ? s.id : null;
        const warn = ph === 'heave' || ph === 'lift';
        tel = warn ? s.k : follow(tel, 0, dt, 12);
        stand.telegraph = warn ? { move: MOVE[ability], startTick: 0, resolveTick: 100 } : null;
        if ((ph === 'toll' || ph === 'slam') && lastPh !== ph) {
          stand.lastMove = MOVE[ability];
          stand.moveTick = ++moveTick;
        }
        lastPh = ph;
        walk += (moving ? F.speed : 0) * dt * Math.PI * 2.2;
        classic.group.position.set(p.x - side, 0, p.z);
        classic.setYaw(yaw);
        classic.group.scale.setScalar(ability === 'spawn' ? rig.lab.grow() : 1);
        classic.pose({ t: idle, tick: Math.round(tel * 100), walkPhase: walk, moveK: moving ? 1 : 0, telegraphK: tel, e: stand });
      },
      onCue(id, at) {
        const fx = (d) => ({ x: at.x + Math.sin(yaw) * d, z: at.z + Math.cos(yaw) * d });
        if (id === 'death_knell') {
          play('ch_death_knell');
          vfx.ring({ x: at.x, z: at.z, r0: 0.5, r1: 3.6, width: 0.35, life: 0.6, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'grave_call') {
          play('ch_grave_call');
          const c = fx(2.2);
          vfx.crack({ x: c.x, z: c.z, radius: 1.5, glow: PALETTE.godstuffViolet });
          vfx.ring({ x: c.x, z: c.z, r0: 0.4, r1: 1.8, width: 0.3, life: 0.5, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        }
      },
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow(), channels: rig.lab.channels(), swing: rig.lab.swing() }),
    };
  },
};

export const LAB_ENTRIES = [knightEntry, hartEntry, wardenEntry, keeperEntry, reeveEntry, ringerEntry];
