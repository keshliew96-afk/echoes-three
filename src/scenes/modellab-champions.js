// MODEL LAB ENTRIES for the Level I champions (docs/MODEL_STANDARD.md "Level
// I champions"): the Briar Knight and the Moss Hart, each beside its classic
// twin. The entry shape is scenes/modellab-bosses.js's.
import { PALETTE } from '../data/palette.js';
import { buildBriarKnight } from '../render/enemies/champions.js';
import { buildMossHart } from '../render/enemies/champions2.js';
import { buildBriarKnightFacet, KNIGHT_ABILITIES, KNIGHT_CHARGE, KNIGHT_WALK } from '../render/enemies/champfacet/briarknight.js';
import { buildMossHartFacet, HART_ABILITIES, HART_WALK } from '../render/enemies/champfacet/mosshart.js';
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
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow(), channels: rig.lab.channels() }),
    };
  },
};

export const LAB_ENTRIES = [knightEntry, hartEntry];
