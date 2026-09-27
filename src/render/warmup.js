// First-draw warm-up parking bay + program anchors (certification fixes
// D-r1 and D-r3/S1, in-wave hitches).
//
// WHY. Round 1 measured single 140-200 ms frames inside waves — at a
// `wave_start` that raised three spawn telegraphs, at the first kill VFX, at
// the first bolt of a room — with the main thread FREE for the whole gap and
// no new shader programs. Round 3 (S1) measured the same signature 145-291 ms
// at the first ally ground zone / melee swing / Stag hit / downed of a page
// session, and a Chrome trace of that fight (tools/certfixDshouldfix4-trace.mjs)
// finally put names on the two costs behind it:
//
//   1. The GPU process compiles shaders LAZILY. ANGLE/D3D11 runs D3DCompile
//      for a program's vertex and pixel executables on the first DRAW that
//      uses them (GetVertexExecutableTask / GetPixelExecutableTask in the
//      trace), not at link time — so `renderer.compile()` alone never pays it,
//      and a material whose mesh is `visible = false` until its first use
//      (the swordsman's swing smear) pays it in the middle of a fight.
//   2. three.js DESTROYS a program when the last material using it is
//      disposed (`WebGLPrograms.releaseProgram`), and forgets a custom shader's
//      source id with it. Every telegraph, quake ring and kill splat mints its
//      own ShaderMaterial and disposes it when it fades, so the trace shows the
//      lane + column programs re-linked at EVERY telegraph_start — each link
//      is a full command-buffer drain on the main thread (`GetProgramiv ->
//      CommandBufferHelper::Finish`, 33-45 ms measured) plus the compile.
//
// The cure for both is the same object: an ANCHOR. One instance of every
// transient rig is built at boot, DRAWN for a few frames (sub-pixel, under
// the floor, frustum culling off so the draw call really is submitted — this
// is what compiles the executables), then taken out of the scene and KEPT.
// Its materials are never disposed, so their programs and shader-source ids
// stay alive for the whole session; every later instance of the same rig
// builds a material with the same cache key and finds the program already
// there. Nothing is ever re-linked, nothing is ever compiled mid-wave.
//
// Parked objects are 1/1000 scale at y = -60: outside the camera's cone at the
// §1 elevation, and behind the ground plane in depth if it ever were inside.
import { guardSubtree } from '../env/bandguard.js';

const HOLD_FRAMES = 3; // rendered frames a parked rig is kept in the scene
const PARK_Y = -60;
const PARK_SCALE = 0.001;

const parked = [];
// Anchors: every rig that has been parked and dropped WITHOUT a custom drop
// handler. They are out of the scene graph and never drawn again; they exist
// so that their materials (and through them their programs) are never
// released. A few dozen small objects for the session.
const retained = [];

// `onDrop` replaces the default retention — the boss's Stag rig and the
// revive instrument go back to their own pools instead (a pooled object is
// its own anchor: pools never dispose).
export function warmPark(root, obj, onDrop = null) {
  if (!obj) return;
  obj.position.set(0, PARK_Y, 0);
  obj.scale.setScalar(PARK_SCALE);
  obj.traverse((o) => {
    o.frustumCulled = false;
  });
  root.add(obj);
  // gauntlet r4 J4-F1 (INT): the §19.1 band guard is part of a lit material's
  // program; patch the rig NOW (under its final parent, so the enemyfx
  // exemption holds) or the park warms the unguarded variant and the real
  // instance relinks the guarded one on its first frames in a room.
  guardSubtree(obj);
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
    else retained.push(p.obj); // anchor: never disposed, never drawn again
    parked.splice(i, 1);
  }
}

// Holds (gauntlet r4 J4-F1, INT): a warm-up that is not a parked rig — the
// title-boot HUD paint warm-up (main.js @gnt:INT-WIRING) — counts as pending
// until it releases, so the loading card (ui/menu/loading.js: ready once
// warmupPending() is 0) covers it instead of the title or the first fight.
let holds = 0;
export function warmupHold() {
  holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds -= 1;
  };
}

export const warmupPending = () => parked.length + holds;
export const warmupRetained = () => retained.length;
