// 3/4 top-down perspective camera (BUILD_BRIEF §1: gameplay on XZ, y up).
// createCamera ships the fixed rig (rendertest/simtest keep it); the game
// scenes attach createFollowRig — §22 smoothed follow with aim lookahead
// (<= 0.8 u) that never loses the player.
import { PerspectiveCamera, Vector3 } from 'three';
import { CAMERA } from '../core/constants.js';

export function createCamera(aspect) {
  const cam = new PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far);
  const elev = (CAMERA.elevationDeg * Math.PI) / 180;
  cam.position.set(
    0,
    CAMERA.distance * Math.sin(elev),
    CAMERA.distance * Math.cos(elev)
  );
  cam.lookAt(new Vector3(0, 0, 0));
  return cam;
}

export function updateCameraAspect(camera, width, height) {
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// Smoothed follow (§22): the focus point is the player position plus a small
// lead toward the cursor (lookaheadFactor of the distance, capped at
// lookaheadMax = 0.8 u), smoothed with a frame-rate-independent exponential
// (1 - e^(-stiffness*dt)) so behavior is identical at any render fps. The lag
// bound (dash speed / stiffness ~ 1.2 u) keeps the player on-frame through
// dodge chains — the rig never needs a hard clamp.
export function createFollowRig(camera) {
  const elev = (CAMERA.elevationDeg * Math.PI) / 180;
  const offY = CAMERA.distance * Math.sin(elev);
  const offZ = CAMERA.distance * Math.cos(elev);
  const cur = { x: 0, z: 0 };
  let initialized = false;

  // dt: render-frame seconds; (px, pz): interpolated player position; aim:
  // { x, z } world cursor or null.
  function update(dt, px, pz, aim) {
    let tx = px;
    let tz = pz;
    if (aim) {
      const ox = aim.x - px;
      const oz = aim.z - pz;
      const len = Math.hypot(ox, oz);
      if (len > 1e-4) {
        const lead = Math.min(len * CAMERA.lookaheadFactor, CAMERA.lookaheadMax);
        tx += (ox / len) * lead;
        tz += (oz / len) * lead;
      }
    }
    if (!initialized) {
      cur.x = tx;
      cur.z = tz;
      initialized = true;
    }
    const a = 1 - Math.exp(-CAMERA.followStiffness * Math.max(0, dt));
    cur.x += (tx - cur.x) * a;
    cur.z += (tz - cur.z) * a;
    camera.position.set(cur.x, offY, cur.z + offZ);
    camera.lookAt(cur.x, 0, cur.z);
  }

  return { update };
}
