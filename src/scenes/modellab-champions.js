// MODEL LAB ENTRIES for the Level I, II and III champions
// (docs/MODEL_STANDARD.md "Level I champions", "Level II champions", "Level
// III champions"): the Briar Knight, the Moss Hart, the Sluice Warden, the
// Lockkeeper, the Bone Reeve and the Gravebell Ringer. The entry shape is
// scenes/modellab-bosses.js's.
import { PALETTE } from '../data/palette.js';
import { buildBriarKnightFacet, KNIGHT_ABILITIES, KNIGHT_CHARGE, KNIGHT_WALK } from '../render/enemies/champfacet/briarknight.js';
import { buildMossHartFacet, HART_ABILITIES, HART_WALK } from '../render/enemies/champfacet/mosshart.js';
import { buildSluiceWardenFacet, WARDEN_ABILITIES, WARDEN_WALK } from '../render/enemies/champfacet/sluicewarden.js';
import { buildLockkeeperFacet, KEEPER_ABILITIES, KEEPER_WALK, LAB_HOOK } from '../render/enemies/champfacet/lockkeeper.js';
import { buildBoneReeveFacet, REEVE_ABILITIES, REEVE_WALK } from '../render/enemies/champfacet/bonereeve.js';
import { buildGravebellRingerFacet, RINGER_ABILITIES, RINGER_WALK } from '../render/enemies/champfacet/gravebellringer.js';
import { abilityOn, loopPath, pending, replant } from './modellab-bosses.js';

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
  frame: { y: 1.2, z: 0, dist: 7.4, speed: KNIGHT_WALK, loop: 3.0 },
  build({ vfx, play }) {
    const rig = buildBriarKnightFacet();
    let yaw = 0;
    return {
      group: rig.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => KNIGHT_ABILITIES[id] || KNIGHT_ABILITIES.charge,
      cues: (id) => (KNIGHT_ABILITIES[id] || KNIGHT_ABILITIES.charge).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        rig.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = knightEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const ahead = ability === 'charge' ? chargeTravel(abT) : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT });
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
  frame: { y: 1.6, z: 0, dist: 8.6, speed: HART_WALK, loop: 3.4 },
  build({ vfx, play }) {
    const rig = buildMossHartFacet();
    let yaw = 0;
    return {
      group: rig.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => HART_ABILITIES[id] || HART_ABILITIES.toss,
      cues: (id) => (HART_ABILITIES[id] || HART_ABILITIES.toss).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        rig.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = hartEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const ahead = ability === 'leap' ? leapTravel(abT) : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT });
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
// down before him.
const wardenEntry = {
  id: 'sluice_warden',
  label: 'Sluice Warden',
  abilities: [
    ['floodgate', 'Floodgate'],
    ['undertow', 'Undertow'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.2, z: 0, dist: 7.6, speed: WARDEN_WALK, loop: 3.0 },
  build({ vfx, play }) {
    const rig = buildSluiceWardenFacet();
    let yaw = 0;
    return {
      group: rig.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => WARDEN_ABILITIES[id] || WARDEN_ABILITIES.floodgate,
      cues: (id) => (WARDEN_ABILITIES[id] || WARDEN_ABILITIES.floodgate).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        rig.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = wardenEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        yaw = p.yaw;
        rig.group.position.set(p.x, 0, p.z);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT });
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
// and reels back.
const keeperEntry = {
  id: 'lockkeeper',
  label: 'Lockkeeper',
  abilities: [
    ['hook', 'Chain Hook'],
    ['turn', 'Lock Turn'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.5, z: 0.8, dist: 8.4, speed: KEEPER_WALK, loop: 3.0 },
  build({ vfx, play }) {
    const rig = buildLockkeeperFacet();
    let yaw = 0;
    return {
      group: rig.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => KEEPER_ABILITIES[id] || KEEPER_ABILITIES.hook,
      cues: (id) => (KEEPER_ABILITIES[id] || KEEPER_ABILITIES.hook).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        rig.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = keeperEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        yaw = p.yaw;
        rig.group.position.set(p.x, 0, p.z);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT });
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

// The Bone Reeve (Level III).
const reeveEntry = {
  id: 'bone_reeve',
  label: 'Bone Reeve',
  abilities: [
    ['sweep', 'Reaping Sweep'],
    ['lance', 'Grave Lance'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.5, z: 0, dist: 8.2, speed: REEVE_WALK, loop: 3.0 },
  build({ vfx, play }) {
    const rig = buildBoneReeveFacet();
    let yaw = 0;
    return {
      group: rig.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => REEVE_ABILITIES[id] || REEVE_ABILITIES.sweep,
      cues: (id) => (REEVE_ABILITIES[id] || REEVE_ABILITIES.sweep).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        rig.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = reeveEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        yaw = p.yaw;
        rig.group.position.set(p.x, 0, p.z);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT });
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

// The Gravebell Ringer (Level III).
const ringerEntry = {
  id: 'gravebell_ringer',
  label: 'Gravebell Ringer',
  abilities: [
    ['knell', 'Death Knell'],
    ['call', 'Grave Call'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 2.1, z: 0, dist: 10.4, speed: RINGER_WALK, loop: 3.0 },
  build({ vfx, play }) {
    const rig = buildGravebellRingerFacet();
    let yaw = 0;
    return {
      group: rig.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => RINGER_ABILITIES[id] || RINGER_ABILITIES.knell,
      cues: (id) => (RINGER_ABILITIES[id] || RINGER_ABILITIES.knell).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        rig.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = ringerEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        yaw = p.yaw;
        rig.group.position.set(p.x, 0, p.z);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        replant(rig, state, on, abT);
        rig.lab.pose({ dt, ability, abT });
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
