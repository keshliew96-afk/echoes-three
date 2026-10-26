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
import { buildThornmother } from '../render/boss/slice2.js';
import { buildThornmotherFacet, THORN_ABILITIES, THORN_CHARGE, THORN_WALK } from '../render/boss/thornmotherfacet.js';

// The Move loop every entry walks: a circle of radius `loop`, facing along it.
export function loopPath(phase, loop) {
  return { x: Math.sin(phase) * loop, z: -Math.cos(phase) * loop + loop * 0.4, yaw: Math.atan2(Math.cos(phase), Math.sin(phase)) };
}
const abilityOn = (state) => state.mode === 'ability' || (state.mode === 'still' && state.t > 0);
const follow = (v, target, dt, rate) => v + (target - v) * (1 - Math.exp(-rate * dt));

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
    let lastAbT = 0;
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
        rig.lab.reset();
      },
      update(state, dt, abT) {
        const F = stagEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const side = state.classic ? F.side : 0;
        const ahead = ability === 'trample' ? trampleTravel(abT) : 0;
        // a jump back in the ability (its loop restarting) re-plants the hooves
        if (on && abT < lastAbT - 0.25) rig.lab.reset();
        lastAbT = on ? abT : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
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
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow() }),
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
    let lastAbT = 0;
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
        rig.lab.reset();
      },
      update(state, dt, abT) {
        const F = thornEntry.frame;
        const moving = state.mode === 'move';
        const on = abilityOn(state);
        const ability = on ? state.ability : null;
        const p = moving ? loopPath(state.movePhase, F.loop) : { x: 0, z: 0, yaw: 0 };
        const side = state.classic ? F.side : 0;
        const ahead = ability === 'charge' ? chargeTravel(abT) : 0;
        if (on && abT < lastAbT - 0.25) rig.lab.reset();
        lastAbT = on ? abT : 0;
        yaw = p.yaw;
        rig.group.position.set(p.x + side + Math.sin(yaw) * ahead, 0, p.z + Math.cos(yaw) * ahead);
        rig.setYaw(yaw);
        rig.group.updateMatrixWorld(true);
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
      debug: () => ({ feet: rig.lab.feet(), grow: rig.lab.grow() }),
    };
  },
};

export const LAB_ENTRIES = [stagEntry, thornEntry];
