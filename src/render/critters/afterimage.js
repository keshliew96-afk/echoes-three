// Dash-smear afterimages (BUILD_BRIEF §5: "the dash smear/afterimage VFX IS
// the i-frame signal and ends exactly at dash end").
//
// Baseline-v030 F6: the previous smear spawned a translucent capsule ghost
// EVERY RENDER FRAME along the dash, and sixty overlapping ghosts at 0.35
// alpha composite into one solid white slab — no stagger, no silhouette, and
// (in the dressed arena) not even the right body, since the visible player is
// the chibi Healer while the ghosts were the hidden graybox capsule.
//
// This module freezes STAGGERED SILHOUETTES of the actual critter instead:
// each spawn captures the live rig's full posed world transform into a pooled
// set of flat-tinted clones (one per body mass), and each ghost fades on its
// own clock. The integrator spawns one ghost every few SIM TICKS of dash
// travel (arena.js: every 4 ticks over the 15-tick dash), so a mid-dash frame
// shows >=3 distinct afterimages at visibly different opacities trailing the
// body, and `clear()` hard-drops every ghost the frame the dash ends.
//
// Excluded from the silhouette: ink hulls (a tinted hull is a bigger copy of
// the mass it wraps), unlit face/marking decals, the identity ring + contact
// shadow (they are ground decals, not body), sprites (gem glow/halo), and the
// melee swing smear.
import { Color, Group, Mesh, MeshBasicMaterial } from 'three';
import { PALETTE } from '../../data/palette.js';
import { mix } from './common.js';

const GHOST_MAX = 7;
// Per-ghost fade. 0.26 s over a 0.25 s dash: the trail's oldest ghost lands
// near 15% of spawn opacity while the newest sits near 90%, which is the
// "visibly different opacities" the advisory asks for. The §5 contract is
// unaffected because clear() hard-drops every ghost the frame the dash ends.
export const GHOST_FADE_SEC = 0.26;

// Spawn alpha 0.38 (was 0.42) on a CONCAVE fade curve (was linear). Measured
// cause, fix-round-2 C5 advisory: the dash covers 1.8 u in 0.25 s (§5) and a
// chibi body is ~0.55 u across, so consecutive silhouettes ALWAYS overlap —
// the trail's brightness at any point is the composite of 2-3 ghosts, not one.
// On the linear ramp the front three composited to alpha ~0.68 and the frozen
// trail row measured L 184-206 across ~90 continuous px: grass fully hidden,
// per-ghost steps under 5% luma, i.e. the "dense caterpillar" the advisory
// rejected. The exponent puts the ladder where the composite is what
// separates: each ghost's own alpha now falls ~25% per step instead of ~13%,
// so the trail reads as a staggered ramp with the ground visible through it,
// and the peak still sits ~60 luma over the grass it crosses.
const GHOST_FADE_POW = 1.7;
const GHOST_OPACITY = 0.38;

// Opacity of a ghost that is `age` seconds old. One definition, used by both
// spawn() (which BACK-DATES ghosts, see below) and update().
const fadeAlpha = (age) => {
  const t = 1 - age / GHOST_FADE_SEC;
  return t <= 0 ? 0 : GHOST_OPACITY * Math.pow(t, GHOST_FADE_POW);
};

const SKIP_NAMES = new Set(['face', 'markings', 'swing-smear', 'contact-shadow']);

function collectSources(rootObj) {
  const sources = [];
  (function walk(o) {
    if (o.name === 'identity-ring') return; // whole decal subtree
    if (o.isMesh && !SKIP_NAMES.has(o.name) && !(o.name || '').endsWith('-ink')) {
      sources.push(o);
    }
    for (const c of o.children) walk(c);
  })(rootObj);
  return sources;
}

// `critter` is a factory rig from createCritter (group + accent). `sceneRoot`
// is where the ghosts live — world space, NOT under the critter, so a ghost
// stays planted where it was spawned while the body dashes on.
export function createAfterimages(critter, sceneRoot, { color = null } = {}) {
  const tint = new Color(color ?? mix(critter.accent, PALETTE.parchment, 0.5).getHex());
  const sources = collectSources(critter.group);

  const ghosts = []; // { root, mat, clones, age, live }
  for (let g = 0; g < GHOST_MAX; g++) {
    const mat = new MeshBasicMaterial({
      color: tint.clone(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    const root = new Group();
    root.name = 'dash-afterimage';
    root.matrixAutoUpdate = false;
    root.visible = false;
    const clones = sources.map((src) => {
      const m = new Mesh(src.geometry, mat);
      // World transforms are copied straight into matrixWorld at spawn time;
      // the renderer must never recompose them from position/quaternion.
      m.matrixAutoUpdate = false;
      m.matrixWorldAutoUpdate = false;
      root.add(m);
      return m;
    });
    sceneRoot.add(root);
    ghosts.push({ root, mat, clones, age: 0, live: false });
  }

  // `dx`/`dz` shift the frozen silhouette in world space and `age` pre-ages
  // its fade: the integrator uses them to BACK-DATE ghosts when the render
  // loop runs slower than the sim (a headless capture renders ~4-10 fps while
  // the 60 Hz accumulator catches up in bursts, so a mid-dash frame would
  // otherwise show one ghost instead of the staggered trail). A back-dated
  // ghost is placed where the body WAS on its spawn tick and starts partly
  // faded, so the trail reads identically at any render rate.
  function spawn(dx = 0, dz = 0, age = 0) {
    if (age >= GHOST_FADE_SEC) return;
    let ghost = ghosts.find((g) => !g.live);
    if (!ghost) {
      // All in flight: recycle the oldest.
      ghost = ghosts.reduce((a, b) => (a.age >= b.age ? a : b));
    }
    // The rig was posed earlier this frame; make its world matrices current
    // before freezing them.
    critter.group.updateWorldMatrix(true, true);
    for (let i = 0; i < sources.length; i++) {
      const m = ghost.clones[i].matrixWorld;
      m.copy(sources[i].matrixWorld);
      m.elements[12] += dx;
      m.elements[14] += dz;
    }
    ghost.age = age;
    ghost.live = true;
    ghost.mat.opacity = fadeAlpha(age);
    ghost.root.visible = true;
  }

  function update(dt) {
    for (const g of ghosts) {
      if (!g.live) continue;
      g.age += dt;
      const o = fadeAlpha(g.age);
      if (o <= 0) {
        g.live = false;
        g.root.visible = false;
      } else {
        g.mat.opacity = o;
      }
    }
  }

  // §5 contract: every ghost vanishes the frame the dash ends.
  function clear() {
    for (const g of ghosts) {
      g.live = false;
      g.root.visible = false;
    }
  }

  const count = () => ghosts.filter((g) => g.live).length;

  // Render every ghost once, at a hair above zero opacity, so the GPU compiles
  // this material's pipeline during scene build instead of on the first dash.
  // Measured: without it, the very first frame that showed an afterimage cost a
  // ~216 ms stall under SwiftShader, the 60 Hz accumulator swallowed the rest
  // of the 250 ms dash in one catch-up step, and a capture could never land a
  // mid-dash frame at all. The integrator clears these after a couple of
  // frames (they are not `live`, so they are not part of any trail).
  function warmup() {
    critter.group.updateWorldMatrix(true, true);
    for (const g of ghosts) {
      for (let i = 0; i < sources.length; i++) g.clones[i].matrixWorld.copy(sources[i].matrixWorld);
      g.mat.opacity = 0.002;
      g.age = 0;
      g.live = false;
      g.root.visible = true;
    }
  }

  return { spawn, update, clear, count, warmup };
}
