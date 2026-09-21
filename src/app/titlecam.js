// Title backdrop camera (docs/gauntlet/PLAN.md §1.4). Owner: M1.
//
// The title is a DOM overlay over the LIVE camp render (sim paused, the fire,
// fireflies and critters keep animating). This module translates the gameplay
// camera after the scene has placed it (main.js LOOP calls app.beforeRender()
// right before stage.render()) so the hearth composes in the MIDDLE OF THE
// FREE AREA to the right of the title's menu column, at every window size (the
// column is wider, relatively, on a small window because the menus never
// shrink below their type floor): the shift is solved from the hearth's
// camera-space position and the column's measured right edge. A slow drift
// (<= 0.35 u, 26 s / 33 s periods) lets the picture breathe. Pure translation
// along world x/z — the camera keeps its §1 orientation. The weight eases in
// when the title opens and out (~0.8 s) on New Game, so play starts on the
// exact gameplay framing while the player already has control.
//
// Robust to scenes that do NOT re-place the camera every frame: if the camera
// still sits where this module left it, the previous offset is removed first,
// so offsets never accumulate.
import { Vector3 } from 'three';

const FALLBACK_SHIFT_X = -2.4; // u: when no hearth / column is known
const MAX_SHIFT_X = 4.5; // u: never frame more than this far off the gameplay camera
const DRIFT_X = 0.35;
const DRIFT_Z = 0.25;
const PERIOD_X = 26;
const PERIOD_Z = 33;
const EASE_IN = 2.4; // 1/s
const EASE_OUT = 3.6; // 1/s
// Where in the free area right of the column the hearth sits (0 = at the
// column's edge, 0.5 = centred). 0.4 keeps the fire a touch left of centre, so
// the portal and the tents to its right stay in the picture.
const FREE_AREA_BIAS = 0.4;

export function createTitleCam({ camera, getHearth = () => null, getColumnFraction = () => null }) {
  let w = 0;
  let lastNow = null;
  let lastOffset = { x: 0, z: 0 };
  let lastPost = null; // camera position after our last write
  let solvedShift = FALLBACK_SHIFT_X;
  let lastSolveAt = -Infinity;
  const tmp = new Vector3();

  // Shift (world x) that puts the hearth at FREE_AREA_BIAS of the way across
  // the screen area right of a column ending at fraction f of the width.
  function solve(bx, bz, now) {
    if (now - lastSolveAt < 250) return solvedShift;
    lastSolveAt = now;
    const hearth = getHearth();
    const f = getColumnFraction();
    if (!hearth || typeof f !== 'number' || !(f > 0 && f < 0.8)) return solvedShift;
    const px = camera.position.x;
    const pz = camera.position.z;
    camera.position.x = bx;
    camera.position.z = bz;
    camera.updateMatrixWorld();
    tmp.set(hearth.x, 0, hearth.z).applyMatrix4(camera.matrixWorldInverse);
    camera.position.x = px;
    camera.position.z = pz;
    const depth = -tmp.z;
    if (!(depth > 0.1)) return solvedShift;
    const halfW = depth * Math.tan(((camera.fov || 45) * Math.PI) / 360) * (camera.aspect || 16 / 9);
    const ndc = 2 * (f + FREE_AREA_BIAS * (1 - f)) - 1;
    // x_cam(base) - dx = ndc * halfW  =>  dx = x_cam - ndc * halfW
    const dx = tmp.x - ndc * halfW;
    solvedShift = Math.max(-MAX_SHIFT_X, Math.min(MAX_SHIFT_X, dx));
    return solvedShift;
  }

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
    const shift = active ? solve(bx, bz, now) : solvedShift;
    const t = now / 1000;
    const e = w * w * (3 - 2 * w); // smoothstep
    const ox = (shift + DRIFT_X * Math.sin((t * 2 * Math.PI) / PERIOD_X)) * e;
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
    debug: () => ({
      weight: Math.round(w * 1000) / 1000,
      shift: Math.round(solvedShift * 1000) / 1000,
      columnFraction: getColumnFraction(),
      offset: { x: Math.round(lastOffset.x * 1000) / 1000, z: Math.round(lastOffset.z * 1000) / 1000 },
    }),
  };
}
