// MODEL LAB ENTRIES for the Level IV champions (docs/MODEL_STANDARD.md
// "Level IV champions"): the Hollow Choir and the Vein Matron, each beside
// its classic twin. The entry shape is scenes/modellab-champions.js's.
import { PALETTE } from '../data/palette.js';
import { buildHollowChoir } from '../render/enemies/champions.js';
import { buildVeinMatron } from '../render/enemies/champions2.js';
import { buildHollowChoirFacet, CHOIR_ABILITIES, CHOIR_WALK } from '../render/enemies/champfacet/hollowchoir.js';
import { buildVeinMatronFacet, MATRON_ABILITIES, MATRON_WALK, LAB_LASH } from '../render/enemies/champfacet/veinmatron.js';
import { abilityOn, follow, loopPath, pending, replant } from './modellab-bosses.js';

const HEARTV = PALETTE.godstuffViolet;

// The Hollow Choir: a floater (no feet to re-plant).
const choirEntry = {
  id: 'hollow_choir',
  label: 'Hollow Choir',
  abilities: [
    ['hymn', 'Shard Hymn'],
    ['discord', 'Discord'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.5, z: 0, dist: 7.8, speed: CHOIR_WALK, loop: 3.0, side: 2.4 },
  build({ cosmetic, vfx, play }) {
    const rig = buildHollowChoirFacet();
    const classic = buildHollowChoir(cosmetic);
    let tel = 0;
    let idle = 0;
    let yaw = 0;
    let moveTick = 0;
    let lastPh = null;
    const stand = { id: 5, telegraph: null, lastMove: null, moveTick: -1, rage: false };
    return {
      group: rig.group,
      classic: classic.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => CHOIR_ABILITIES[id] || CHOIR_ABILITIES.hymn,
      cues: (id) => (CHOIR_ABILITIES[id] || CHOIR_ABILITIES.hymn).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        classic.group.position.set(0, 0, 0);
        rig.setYaw(0);
        classic.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = choirEntry.frame;
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
        const s = ability && ability !== 'spawn' ? CHOIR_ABILITIES[ability].sample(abT) : null;
        const ph = s ? s.id : null;
        const warn = ph === 'gather' || ph === 'swell';
        tel = warn ? s.k : follow(tel, 0, dt, 12);
        stand.telegraph = warn ? { move: ability === 'hymn' ? 'shard_hymn' : 'discord' } : null;
        if ((ph === 'sing' || ph === 'burst') && lastPh !== ph) {
          stand.lastMove = ability === 'hymn' ? 'shard_hymn' : 'discord';
          stand.moveTick = ++moveTick;
        }
        lastPh = ph;
        classic.group.position.set(p.x - side, 0, p.z);
        classic.setYaw(yaw);
        classic.group.scale.setScalar(ability === 'spawn' ? rig.lab.grow() : 1);
        classic.pose({ t: idle, moveK: moving ? 1 : 0, telegraphK: tel, e: stand });
      },
      onCue(id, at) {
        const fx = (d) => ({ x: at.x + Math.sin(yaw) * d, z: at.z + Math.cos(yaw) * d });
        if (id === 'hymn') {
          play('ch_shard_hymn');
          const c = fx(1.2);
          vfx.flash({ x: c.x, y: 1.7, z: c.z, size: 0.9, color: HEARTV, life: 0.22 });
        } else if (id === 'discord') {
          play('ch_discord');
          vfx.ring({ x: at.x, z: at.z, r0: 0.4, r1: 3.2, width: 0.3, life: 0.5, core: PALETTE.parchment, glow: HEARTV });
        }
      },
      debug: () => ({ feet: rig.lab.feet(), hem: rig.lab.hem(), grow: rig.lab.grow(), channels: rig.lab.channels() }),
    };
  },
};

// The Vein Matron: on her roots (no feet to re-plant); the lash cracks down
// a lab lane of LAB_LASH u, the classic twin fed the same warning with that lane.
const matronEntry = {
  id: 'vein_matron',
  label: 'Vein Matron',
  abilities: [
    ['lash', 'Vein Lash'],
    ['pulse', 'Heart Pulse'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.5, z: 0, dist: 8.0, speed: MATRON_WALK, loop: 3.0, side: 2.4 },
  build({ cosmetic, vfx, play }) {
    const rig = buildVeinMatronFacet();
    const classic = buildVeinMatron(cosmetic);
    let tel = 0;
    let walk = 0;
    let idle = 0;
    let yaw = 0;
    let tick = 0;
    let moveTick = 0;
    let lastPh = null;
    const stand = { id: 6, telegraph: null, lastMove: null, moveTick: -1, rage: false };
    return {
      group: rig.group,
      classic: classic.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => MATRON_ABILITIES[id] || MATRON_ABILITIES.lash,
      cues: (id) => (MATRON_ABILITIES[id] || MATRON_ABILITIES.lash).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        classic.group.position.set(0, 0, 0);
        rig.setYaw(0);
        classic.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = matronEntry.frame;
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
        tick += dt * 60;
        const s = ability && ability !== 'spawn' ? MATRON_ABILITIES[ability].sample(abT) : null;
        const ph = s ? s.id : null;
        const warn = ph === 'draw' || ph === 'swell';
        tel = warn ? s.k : follow(tel, 0, dt, 12);
        const move = ability === 'lash' ? 'vein_lash' : 'heart_pulse';
        // the classic reads its warning's progress by tick: a stand-in window round now
        stand.telegraph = warn ? { move, startTick: tick - s.k * 60, resolveTick: tick + (1 - s.k) * 60, length: LAB_LASH } : null;
        if ((ph === 'crack' || ph === 'beat') && lastPh !== ph) {
          stand.lastMove = move;
          stand.moveTick = ++moveTick;
        }
        lastPh = ph;
        walk += (moving ? F.speed : 0) * dt * Math.PI * 2.2;
        classic.group.position.set(p.x - side, 0, p.z);
        classic.setYaw(yaw);
        classic.group.scale.setScalar(ability === 'spawn' ? rig.lab.grow() : 1);
        classic.pose({ t: idle, tick, walkPhase: walk, moveK: moving ? 1 : 0, telegraphK: tel, e: stand });
      },
      onCue(id, at) {
        const fx = (d) => ({ x: at.x + Math.sin(yaw) * d, z: at.z + Math.cos(yaw) * d });
        if (id === 'lash') {
          play('ch_vein_lash');
          const c = fx(LAB_LASH - 0.4);
          vfx.flash({ x: c.x, y: 0.8, z: c.z, size: 0.8, color: HEARTV, life: 0.22 });
        } else if (id === 'pulse') {
          play('ch_heart_pulse');
          vfx.crack({ x: at.x, z: at.z, radius: 1.2, glow: HEARTV });
          vfx.ring({ x: at.x, z: at.z, r0: 0.4, r1: 2.8, width: 0.3, life: 0.5, core: PALETTE.parchment, glow: HEARTV });
        }
      },
      debug: () => ({ feet: rig.lab.feet(), base: rig.lab.base(), grow: rig.lab.grow(), channels: rig.lab.channels(), reach: rig.lab.reach() }),
    };
  },
};

export const LAB_ENTRIES = [choirEntry, matronEntry];
