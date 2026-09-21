// Title backdrop camera (docs/gauntlet/PLAN.md §1.4). Owner: M1.
//
// The title is a DOM overlay over the LIVE camp render (sim paused, the fire,
// fireflies and critters keep animating). This module translates the gameplay
// camera after the scene has placed it (main.js LOOP calls app.beforeRender()
// right before stage.render()): a fixed shift west so the hearth composes to
// the right of the left-hand menu column, plus a slow drift (<= 0.35 u, 26 s /
// 33 s periods) so the picture breathes. Pure translation — the camera keeps
// its §1 orientation, so nothing is ever re-aimed. The weight eases in when the
// title opens and out (~0.8 s) on New Game, so play starts on the exact
// gameplay framing while the player already has control.
//
// Robust to scenes that do NOT re-place the camera every frame: if the camera
// still sits where this module left it, the previous offset is removed first,
// so offsets never accumulate.
const SHIFT_X = -2.4; // u, world x (screen-left): puts the fire right of centre
const DRIFT_X = 0.35;
const DRIFT_Z = 0.25;
const PERIOD_X = 26;
const PERIOD_Z = 33;
const EASE_IN = 2.4; // 1/s
const EASE_OUT = 3.6; // 1/s

export function createTitleCam({ camera }) {
  let w = 0;
  let lastNow = null;
  let lastOffset = { x: 0, z: 0 };
  let lastPost = null; // camera position after our last write

  function apply(now, active) {
    const dt = lastNow === null ? 0 : Math.min(0.1, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    const target = active ? 1 : 0;
    const rate = active ? EASE_IN : EASE_OUT;
    w += (target - w) * (1 - Math.exp(-rate * dt));
    if (!active && w < 0.002) w = 0;
    if (active && dt === 0 && w === 0) w = 1; // first frame of a title boot: framed at once
    const p = camera.position;
    // Base = where the scene put the camera this frame (or, if the scene did
    // not touch it, where it was before our last offset).
    let bx = p.x;
    let bz = p.z;
    if (lastPost && Math.abs(p.x - lastPost.x) < 1e-9 && Math.abs(p.z - lastPost.z) < 1e-9) {
      bx -= lastOffset.x;
      bz -= lastOffset.z;
    }
    if (w === 0) {
      if (lastPost) {
        p.x = bx;
        p.z = bz;
        lastPost = null;
        lastOffset = { x: 0, z: 0 };
      }
      return;
    }
    const t = now / 1000;
    const e = w * w * (3 - 2 * w); // smoothstep
    const ox = (SHIFT_X + DRIFT_X * Math.sin((t * 2 * Math.PI) / PERIOD_X)) * e;
    const oz = DRIFT_Z * Math.sin((t * 2 * Math.PI) / PERIOD_Z + 1.1) * e;
    p.x = bx + ox;
    p.z = bz + oz;
    lastOffset = { x: ox, z: oz };
    lastPost = { x: p.x, z: p.z };
    camera.updateMatrixWorld();
  }

  return {
    apply,
    get weight() {
      return w;
    },
    debug: () => ({ weight: Math.round(w * 1000) / 1000, offset: { x: Math.round(lastOffset.x * 1000) / 1000, z: Math.round(lastOffset.z * 1000) / 1000 } }),
  };
}
