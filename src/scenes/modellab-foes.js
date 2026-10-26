// MODEL LAB, THE LEVEL I FOES (docs/MODEL_STANDARD.md "Foes"): one tab per
// foe the model standard rebuilt (render/enemies/facet/), plugged into the
// lab (scenes/modellab.js) through its entries hook. Each tab plays:
//
//   Idle      the foe at rest (its breath, its tell)
//   Move      a loop at its game speed: forward for half a lap, then a
//             sidestep and a backpedal while facing the middle, so locked
//             feet must step every way and the lean must follow the travel
//   Ability   each attack on its timeline (a 3-hit chain plays three
//             attacks at the sim's own cadence); Rewind, the scrub bar and
//             Still work as for the pilot's models
//   Classic beside   the classic rig at the same moment, fed stand-in inputs
//
// A cue fires the game's own sound for that attack and a small VFX beat at
// the foe's position. Entry shape (shared with the other roster slices):
//   { id, label, abilities: [[id, label]], frame, build(ctx) }, build(ctx)
//   returning { group, classic, update(state, dt, abT), timeline(ability),
//   cues(ability), onCue(id, at), debug() }.
import { PALETTE, VFX_FOE } from '../data/palette.js';
import { buildBoar } from '../render/enemies/boar.js';
import { buildMantis } from '../render/enemies/mantis.js';
import { ARCH_BUILDERS } from '../render/enemies/archetypes.js';
import { FACET_FOES, FOE_ABILITIES } from '../render/enemies/facet/index.js';

const CLASSIC = { boar: buildBoar, mantis: buildMantis, ...ARCH_BUILDERS };
// Each foe's name, framing (look-at height y and depth z, distance, the
// classic's side offset), game speed (u/s, the sim's), move loop radius, and
// the sound each lab cue plays (the cue the game plays for that event:
// audio/cues.js, audio/woodmillcues.js, render/hazards/cues.js).
const FOES = {
  boar: { label: 'Thorn Boar', y: 0.4, dist: 3.4, side: 1.3, speed: 2.0, loop: 1.8, sound: { strike: 'bite' } },
  mantis: { label: 'Spitting Mantis', y: 0.6, dist: 3.8, side: 1.3, speed: 1.6, loop: 1.6, sound: { strike: 'spit' } },
  quillback: { label: 'Quillback', y: 0.38, dist: 3.2, side: 1.3, speed: 1.5, loop: 1.6, sound: { strike: 'm4b_roll', thud: 'm4b_thud' } },
  rotcap: { label: 'Rotcap', y: 0.4, dist: 3.2, side: 1.2, speed: 1.2, loop: 1.4, sound: { strike: 'bite' } },
  wasp: { label: 'Briar Wasp', y: 0.8, dist: 3.4, side: 1.3, speed: 2.7, loop: 1.8, sound: { strike: 'm4b_swoop' } },
  // the game plays no sound for the thornling's root or plant
  thornling: { label: 'Thornling', y: 0.45, dist: 3.2, side: 1.2, speed: 1.3, loop: 1.6, sound: {} },
  owl: { label: 'Shriek Owl', y: 1.2, dist: 4.4, side: 1.5, speed: 2.4, loop: 1.6, sound: { strike: 'wm_shriek' } },
  // its lash reaches 5.4 u down the lane: the camera looks ahead of it
  lasher: { label: 'Vine Lasher', y: 0.5, z: 1.6, dist: 6.2, side: 1.4, speed: 0.8, loop: 1.0, sound: { strike: 'wm_lash', yank: 'wm_yank' } },
};

// A combo (an object with `at(t)`) or a plain timeline, read the same way.
function asTimeline(ab) {
  if (!ab) return { label: '', duration: 1, sample: () => ({ id: 'rest', label: 'rest' }), cues: [] };
  if (typeof ab.at === 'function') {
    return {
      label: ab.label,
      duration: ab.duration,
      sample: (t) => ({ id: ab.at(t).phase, label: ab.at(t).label }),
      readout: (t) => `${t.toFixed(1)}s · ${ab.at(t).label}`,
      cues: ab.cues || (ab.strikes || []).map((at) => ({ at, id: 'strike' })),
    };
  }
  return { label: ab.label, duration: ab.duration, sample: (t) => ab.sample(t), readout: (t) => ab.readout(t), cues: ab.cues || [] };
}

// Stand-in pose inputs for the classic twin at a moment of an ability: its
// wind-up (telegraphK), its strike pulse (lungeK for a bite, fireK for a shot).
function classicInputs(ab, t) {
  if (ab && typeof ab.classicAt === 'function') return ab.classicAt(t);
  const tl = asTimeline(ab);
  const s = tl.sample(Math.min(t, tl.duration));
  const strikeAt = (tl.cues[0] && tl.cues[0].at) || 0;
  const wind = /wind|draw|coil|gather|aim|rear|crouch|charge-up|telegraph/.test(s.id || '');
  const since = t - strikeAt;
  const pulse = since >= 0 && since < 0.18 ? Math.sin((since / 0.18) * Math.PI) : 0;
  return { telegraphK: wind ? 1 : 0, lungeK: pulse, fireK: pulse, e: null };
}

function standIn(kind, patch) {
  return { id: 1, kind, x: 0, z: 0, px: 0, pz: 0, hp: 10, maxHp: 10, state: 'active', mode: 'idle', telegraph: null, elite: false, faceX: 0, faceZ: 1, cdByTarget: {}, targetId: null, ...patch };
}

export const LAB_ENTRIES = Object.keys(FACET_FOES).map((kind) => {
  const F = FOES[kind] || { label: kind, y: 0.5, dist: 3.5, side: 1.3, speed: 1.5, loop: 1.6, sound: {} };
  const abilities = FOE_ABILITIES[kind] || {};
  return {
    id: kind,
    label: F.label,
    abilities: Object.entries(abilities).map(([id, ab]) => [id, ab.label]),
    frame: { y: F.y, z: F.z || 0, dist: F.dist, speed: F.speed, loop: F.loop, side: F.side },
    build(ctx) {
      const rig = FACET_FOES[kind]();
      const twin = CLASSIC[kind]();
      let clock = 0;
      let walk = 0;
      let lastPos = null;
      function place(r, x, z, yaw) {
        r.group.position.set(x, 0, z);
        r.setYaw(yaw);
      }
      return {
        group: rig.group,
        classic: twin.group,
        rig,
        twin,
        update(state, dt, abT) {
          clock += dt;
          const side = state.classic ? F.side : 0;
          let x = 0;
          let z = 0;
          let yaw = 0;
          let moveK = 0;
          const moving = state.mode === 'move' && F.loop > 0;
          if (moving) {
            const a = state.movePhase;
            x = Math.sin(a) * F.loop;
            z = -Math.cos(a) * F.loop;
            const travel = Math.atan2(Math.cos(a), Math.sin(a));
            const lap = (a / (Math.PI * 2)) % 1;
            const toMid = Math.atan2(-x, -z);
            yaw = lap < 0.5 ? travel : toMid + (lap < 0.75 ? 0 : Math.PI / 2);
            moveK = 1;
          }
          if (lastPos && dt > 0) walk += (Math.hypot(x - lastPos.x, z - lastPos.z) / dt) * dt * Math.PI * 2.6;
          lastPos = { x, z };
          const ab = abilities[state.ability];
          const acting = state.mode === 'ability' || (state.mode === 'still' && state.t > 0);
          rig.lab.override = acting && ab ? { id: state.ability, t: abT } : null;
          place(rig, x + side, z, yaw);
          rig.pose({ grown: true, t: clock, tick: clock * 60, walkPhase: walk, moveK, lungeK: 0, telegraphK: 0, fireK: 0, e: standIn(kind, { x: x + side, z, px: x + side, pz: z }) });
          // the classic twin: the same moment, fed stand-in inputs
          place(twin, x - side, z, yaw);
          const ci = acting && ab ? classicInputs(ab, abT) : { telegraphK: 0, lungeK: 0, fireK: 0, e: null };
          twin.pose({ t: clock, tick: clock * 60, walkPhase: walk, moveK, lungeK: ci.lungeK, telegraphK: ci.telegraphK, fireK: ci.fireK, e: standIn(kind, ci.e || {}) });
        },
        timeline(ability) {
          return asTimeline(abilities[ability]);
        },
        cues(ability) {
          return asTimeline(abilities[ability]).cues;
        },
        onCue(id, at) {
          const snd = id in F.sound ? F.sound[id] : F.sound.strike;
          if (snd) ctx.play(snd);
          const fx = at.x + Math.sin(at.yaw) * 0.6;
          const fz = at.z + Math.cos(at.yaw) * 0.6;
          const blade = VFX_FOE && VFX_FOE.blade ? VFX_FOE.blade : null;
          ctx.vfx.flash({ x: fx, y: 0.4, z: fz, size: 0.4, color: blade ? blade.fire : PALETTE.parchment, life: 0.16 });
        },
        debug() {
          return {
            feet: rig.lab.feet ? rig.lab.feet() : null,
            pose: rig.lab.pose ? rig.lab.pose() : null,
            hit: rig.lab.hit ?? null,
          };
        },
      };
    },
  };
});
