// Camp figures (story NPCs) — procedural three.js models in the party's chibi
// storybook grammar (BUILD_BRIEF §19.2). Public API:
//
//   const npc = createNpc('keeper', { perchY: 0.62 });
//   scene.add(npc.group);          // origin = the ground / prop base under it
//   npc.setYaw(rad);               // facing (models face +Z at yaw 0)
//   npc.update(dt, elapsedSec);    // idle animation, every render frame
//   npc.setTalking(true|false);    // speaking animation (no-op on wardens)
//   npc.metrics                    // { height, radius }: head-top above the
//                                  // origin (perchY included) + body radius
//   npc.dispose();                 // frees this figure's geometry/materials
//
// INK: the creature figures use the party's constant-pixel ink hull from
// critters/common.js. Its viewport uniform is GLOBAL, so the camp's existing
// `setInkViewport(w, h)` call (critters/index.js) already sizes NPC ink too;
// it is re-exported here only for convenience.
//
// The three wardens are translucent freed spirits: no ink, a fresnel moonlight
// veil (see common.js ghostMaterial), never an emitter.
import { Group } from 'three';
import { setInkViewport } from '../critters/common.js';
import { disposeTree, groundShadow, makeMaterialKit } from './common.js';
import { buildKeeper } from './keeper.js';
import { buildPeddler } from './peddler.js';
import { buildChronicler } from './chronicler.js';
import { buildWarden } from './wardens.js';

export { setInkViewport };

export const NPC_IDS = ['keeper', 'peddler', 'chronicler', 'warden_stag', 'warden_heron', 'warden_wyrm'];

const BUILDERS = {
  keeper: buildKeeper,
  peddler: buildPeddler,
  chronicler: buildChronicler,
  warden_stag: (rig) => buildWarden('stag', rig),
  warden_heron: (rig) => buildWarden('heron', rig),
  warden_wyrm: (rig) => buildWarden('wyrm', rig),
};

const TALK_RATE = 8; // 1/s ease of the speaking envelope

export function createNpc(id, { cosmetic = null, perchY = 0 } = {}) {
  const build = BUILDERS[id];
  if (!build) throw new Error(`unknown npc: ${id}`);
  void cosmetic; // idle timing is seeded from the id (deterministic per figure)

  const group = new Group();
  group.name = `npc-${id}`;
  const yawGroup = new Group();
  group.add(yawGroup);
  const lift = new Group(); // the perch offset
  lift.position.y = perchY;
  yawGroup.add(lift);
  const rig = new Group();
  lift.add(rig);

  const kit = makeMaterialKit();
  const built = build(rig, kit);
  const ghost = !!built.ghost;

  // Contact shadow at the feet / perch point (wardens bring their own).
  if (!ghost) {
    const r = built.metrics.radius;
    const perched = perchY > 0;
    const shadow = groundShadow(r * (perched ? 0.85 : 1.05), perched ? 0.3 : 0.44, { forward: r * 0.12 });
    // Perched: lift the disc a hair so it lands on the prop's top rather than
    // z-fighting it; it stays depth-tested, so logs in front still cover it.
    if (perched) shadow.position.y = 0.02;
    lift.add(shadow);
  }

  let talking = false;
  let talkK = 0;
  let lastT = null;

  function update(dt = 0, elapsedSec = null) {
    const step = Math.min(0.1, Math.max(0, dt || 0));
    const t = elapsedSec ?? (lastT ?? 0) + step;
    lastT = t;
    talkK += ((talking && !ghost ? 1 : 0) - talkK) * (1 - Math.exp(-TALK_RATE * step));
    built.update(step, t, talkK);
  }
  update(0, 0);

  return {
    id,
    group,
    setYaw(rad) {
      yawGroup.rotation.y = rad;
    },
    update,
    setTalking(on) {
      talking = !!on && !ghost;
    },
    metrics: { height: built.metrics.height + perchY, radius: built.metrics.radius },
    dispose() {
      group.removeFromParent();
      disposeTree(group);
    },
  };
}
