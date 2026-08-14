// 3/4 top-down perspective camera (BUILD_BRIEF §1: gameplay on XZ, y up).
// This block ships the fixed rig; follow smoothing + aim lookahead (§22) land
// with the player-controller block.
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
