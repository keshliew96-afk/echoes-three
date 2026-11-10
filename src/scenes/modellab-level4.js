// MODEL LAB ENTRIES for the Level IV bosses (docs/MODEL_STANDARD.md): the
// Hollow Cantor, the Geode Colossus and the Vein Weaver, in the shape
// scenes/modellab-bosses.js documents. Each builds its model on first view
// and drives it.
import { PALETTE } from '../data/palette.js';
import { buildCantorFacet, CANTOR_ABILITIES, CANTOR_WALK } from '../render/boss/cantorfacet.js';
import { buildColossusFacet, COLOSSUS_ABILITIES, COLOSSUS_WALK } from '../render/boss/colossusfacet.js';
import { buildVeinWeaverFacet, WEAVER_ABILITIES, WEAVER_WALK } from '../render/boss/veinweaverfacet.js';
import { abilityOn, loopPath, pending, replant } from './modellab-bosses.js';

// The Hollow Cantor. The Echo Step crosses the frame: it folds away on one
// side and rises on the other, as the sim moves it between its points.
const STEP_SPAN = 4.0;
function stepTravel(abT) {
  const tl = CANTOR_ABILITIES.step;
  return abT >= tl.startOf('rise') - 1e-6 ? STEP_SPAN / 2 : -STEP_SPAN / 2;
}

const cantorEntry = {
  id: 'cantor',
  label: 'Hollow Cantor',
  abilities: [
    ['note', 'Hollow Note'],
    ['lance', 'Sung Lance'],
    ['pulse', 'Heart Pulse'],
    ['step', 'Echo Step'],
    ['verse', 'Verse'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.6, z: 0, dist: 9.0, speed: CANTOR_WALK, loop: 3.0 },
  build({ vfx, play }) {
    const rig = buildCantorFacet();
    let yaw = 0;
    return {
      group: rig.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => CANTOR_ABILITIES[id] || CANTOR_ABILITIES.note,
      cues: (id) => (CANTOR_ABILITIES[id] || CANTOR_ABILITIES.note).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        rig.setYaw(0);
        rig.lab.reset();
      },
      update(state, dt, abT) {
        const F = cantorEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const ahead = ability === 'step' ? stepTravel(abT) : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
        // a verse shown lights a note: the Verse tab shows the first verse taken
        rig.lab.verse(ability === 'verse' ? 1 : 0);
        rig.lab.pose({ dt, ability, abT });
      },
      onCue(id, at) {
        const fx = (d) => ({ x: at.x + Math.sin(yaw) * d, z: at.z + Math.cos(yaw) * d });
        if (id === 'note') {
          play('bx_cantor_note');
          const c = fx(3.2);
          vfx.ring({ x: c.x, z: c.z, r0: 0.3, r1: 1.7, width: 0.3, life: 0.5, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'lance') {
          play('bx_cantor_lance');
          const c = fx(2.4);
          vfx.flash({ x: c.x, y: 1.6, z: c.z, size: 1.0, color: PALETTE.godstuffViolet, life: 0.22 });
        } else if (id === 'pulse') {
          play('bx_cantor_pulse');
          vfx.ring({ x: at.x, z: at.z, r0: 0.4, r1: 3.2, width: 0.35, life: 0.6, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'fade') play('bx_cantor_fade');
        else if (id === 'land') {
          play('bx_cantor_land');
          const c = fx(STEP_SPAN / 2);
          vfx.flash({ x: c.x, y: 1.0, z: c.z, size: 1.2, color: PALETTE.godstuffViolet, life: 0.25 });
        } else if (id === 'verse') play('bx_cantor_verse');
      },
      debug: () => ({ grow: rig.lab.grow(), channels: rig.lab.channels(), hem: rig.lab.hem() }),
    };
  },
};

// The Geode Colossus.
const colossusEntry = {
  id: 'colossus',
  label: 'Geode Colossus',
  abilities: [
    ['fissure', 'Fissure'],
    ['rain', 'Geode Rain'],
    ['burst', 'Geode Burst'],
    ['rage', 'Enraged'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.4, z: 0.4, dist: 9.6, speed: COLOSSUS_WALK, loop: 3.0 },
  build({ vfx, play }) {
    const rig = buildColossusFacet();
    let yaw = 0;
    return {
      group: rig.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => COLOSSUS_ABILITIES[id] || COLOSSUS_ABILITIES.fissure,
      cues: (id) => (COLOSSUS_ABILITIES[id] || COLOSSUS_ABILITIES.fissure).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        rig.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = colossusEntry.frame;
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
        if (id === 'fissure') {
          play('bx_colossus_fissure');
          const c = fx(1.6);
          vfx.crack({ x: c.x, z: c.z, radius: 1.4, glow: PALETTE.godstuffViolet });
          vfx.flash({ x: c.x, y: 0.4, z: c.z, size: 0.9, color: PALETTE.godstuffViolet, life: 0.2 });
        } else if (id === 'rain') {
          play('bx_colossus_rain');
          vfx.flash({ x: at.x, y: 3.2, z: at.z, size: 1.2, color: PALETTE.godstuffViolet, life: 0.25 });
        } else if (id === 'burst') {
          play('bx_colossus_burst');
          vfx.crack({ x: at.x, z: at.z, radius: 2.4, glow: PALETTE.godstuffViolet });
          vfx.ring({ x: at.x, z: at.z, r0: 0.4, r1: 2.6, width: 0.35, life: 0.6, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'recover') play('bx_colossus_tell');
      },
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow(), channels: rig.lab.channels() }),
    };
  },
};

// The Vein Weaver. The Bind's thread flies down a lab lane of 5 u and reels back.
const weaverEntry = {
  id: 'veinweaver',
  label: 'Vein Weaver',
  abilities: [
    ['bind', 'Bind'],
    ['slam', 'Heartbeat Slam'],
    ['brood', 'Brood Sacs'],
    ['rage', 'Enraged'],
    ['spawn', 'Spawn in'],
  ],
  frame: { y: 1.1, z: 0.6, dist: 10.0, speed: WEAVER_WALK, loop: 3.2 },
  build({ vfx, play }) {
    const rig = buildVeinWeaverFacet();
    let yaw = 0;
    return {
      group: rig.group,
      rig,
      get yaw() {
        return yaw;
      },
      timeline: (id) => WEAVER_ABILITIES[id] || WEAVER_ABILITIES.bind,
      cues: (id) => (WEAVER_ABILITIES[id] || WEAVER_ABILITIES.bind).cues || [],
      reset() {
        rig.group.position.set(0, 0, 0);
        rig.setYaw(0);
        pending.add(rig);
      },
      update(state, dt, abT) {
        const F = weaverEntry.frame;
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
        if (id === 'bind') {
          play('bx_veinweaver_bind');
          const c = fx(5);
          vfx.flash({ x: c.x, y: 0.4, z: c.z, size: 0.8, color: PALETTE.godstuffViolet, life: 0.2 });
        } else if (id === 'slam') {
          play('bx_veinweaver_slam');
          vfx.crack({ x: at.x, z: at.z, radius: 2.2, glow: PALETTE.godstuffViolet });
          vfx.ring({ x: at.x, z: at.z, r0: 0.4, r1: 2.8, width: 0.35, life: 0.6, core: PALETTE.parchment, glow: PALETTE.godstuffViolet });
        } else if (id === 'brood') {
          play('bx_veinweaver_brood');
          const c = fx(-1.2);
          vfx.flash({ x: c.x, y: 1.6, z: c.z, size: 1.0, color: PALETTE.godstuffViolet, life: 0.22 });
        }
      },
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow(), channels: rig.lab.channels(), thread: rig.lab.threadLength() }),
    };
  },
};

export const LAB_ENTRIES = [cantorEntry, colossusEntry, weaverEntry];
