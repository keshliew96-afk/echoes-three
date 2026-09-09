// World -> screen projection for the cert camera rig (§1: fov 45, distance 12,
// elevation 52 deg, follow target = focus). Usage:
//   node tools/certfixAvfx2-proj.mjs <focusX> <focusZ> <W> <H> x,z [x,z ...]
import { PerspectiveCamera, Vector3 } from 'three';
const [fx, fz, W, H, ...pts] = process.argv.slice(2);
const FX = Number(fx), FZ = Number(fz), Wp = Number(W), Hp = Number(H);
const elev = (52 * Math.PI) / 180;
const offY = 12 * Math.sin(elev);
const offZ = 12 * Math.cos(elev);
const cam = new PerspectiveCamera(45, Wp / Hp, 0.1, 200);
cam.position.set(FX, offY, FZ + offZ);
cam.lookAt(FX, 0, FZ);
cam.updateMatrixWorld(true);
console.log(`camera at ${FX.toFixed(2)}, ${offY.toFixed(3)}, ${(FZ + offZ).toFixed(2)}`);
for (const p of pts) {
  const [x, z, y = 0] = p.split(',').map(Number);
  const v = new Vector3(x, y, z).project(cam);
  console.log(`(${x}, ${y}, ${z}) -> screen ${Math.round(((v.x + 1) / 2) * Wp)}, ${Math.round(((1 - v.y) / 2) * Hp)}`);
}
