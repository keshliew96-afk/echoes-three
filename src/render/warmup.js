// First-draw warm-up parking bay (certification fix D-r1, in-wave hitches).
//
// WHY. Round 1 measured single 140-200 ms frames inside waves — at a
// `wave_start` that raised three spawn telegraphs, at the first kill VFX, at
// the first bolt of a room — with the main thread FREE for the whole gap (a
// 4 ms timer beside the rAF sampler never missed a beat) and no new shader
// programs. That signature is GPU/compositor work, not JS: the first time a
// buffer or a pipeline state is actually DRAWN, the driver pays for it, and
// three only uploads a geometry on its first render.
//
// `renderer.compile()` (which the boss layer already uses for the Stag's
// materials) covers the shader side but never touches geometry, because it
// does not draw. So this module parks one instance of every transient rig in
// the scene for a few frames at boot, sub-pixel and under the floor, with
// frustum culling off so the draw call really is submitted — then removes and
// releases it. Everything the first wave will build has, by then, been drawn
// once.
//
// Parked objects are 1/1000 scale at y = -60: outside the camera's cone at the
// §1 elevation, and behind the ground plane in depth if it ever were inside.
import { releaseTree } from './geocache.js';

const HOLD_FRAMES = 3; // rendered frames a parked rig is kept
const PARK_Y = -60;
const PARK_SCALE = 0.001;

const parked = [];

// `onDrop` replaces the default release — the boss's Stag rig goes back to its
// own pool instead of being disposed.
export function warmPark(root, obj, onDrop = null) {
  if (!obj) return;
  obj.position.set(0, PARK_Y, 0);
  obj.scale.setScalar(PARK_SCALE);
  obj.traverse((o) => {
    o.frustumCulled = false;
  });
  root.add(obj);
  parked.push({ root, obj, onDrop, left: HOLD_FRAMES });
}

// Called once per frame from the boot loop, AFTER the frame has been rendered.
export function warmupUpdate() {
  if (parked.length === 0) return;
  for (let i = parked.length - 1; i >= 0; i--) {
    const p = parked[i];
    if (--p.left > 0) continue;
    p.root.remove(p.obj);
    p.obj.scale.setScalar(1);
    p.obj.position.set(0, 0, 0);
    p.obj.traverse((o) => {
      o.frustumCulled = true; // back to the default for anything that gets reused
    });
    if (p.onDrop) p.onDrop(p.obj);
    else releaseTree(p.obj);
    parked.splice(i, 1);
  }
}

export const warmupPending = () => parked.length;
