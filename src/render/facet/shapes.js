// FACETED SHAPES (docs/MODEL_STANDARD.md): the boxy masses the sample video
// builds its heads, jaws and limbs from, and a helper that lays a part along
// a direction. Plain geometry; the rig facetizes it (material.js) and caches
// it (geocache.js).
import { BoxGeometry, Vector3 } from 'three';
import { setTRS } from './kit.js';

// A box w x h x l along +Z, its front face scaled (fw, fh) and dropped by
// `drop` (a skull narrowing to the muzzle, a muzzle's line falling).
export function taperBox(w, h, l, fw = 1, fh = 1, drop = 0) {
  const g = new BoxGeometry(w, h, l);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getZ(i) > 0) {
      p.setX(i, p.getX(i) * fw);
      p.setY(i, p.getY(i) * fh - drop);
    }
  }
  return g;
}

// A limb segment: a box running up +Y from its origin, narrowing at the far
// end (aimSegment in gait.js points +Y from the joint to the next one).
export function limbBox(w, d, len, fw, fd) {
  const g = new BoxGeometry(w, len, d).translate(0, len / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > len / 2) {
      p.setX(i, p.getX(i) * fw);
      p.setZ(i, p.getZ(i) * fd);
    }
  }
  return g;
}

// Lay a part (its local +Y along the direction d) at p into matrix m, w x h x
// d in size, turned by `roll` about the direction.
const _P = new Vector3();
const _X = new Vector3();
const _Y = new Vector3();
const _Z = new Vector3();
export function lay(m, px, py, pz, dx, dy, dz, w, h, d, roll = 0) {
  _Y.set(dx, dy, dz).normalize();
  _X.set(Math.cos(roll), Math.sin(roll), 0);
  _X.addScaledVector(_Y, -_X.dot(_Y));
  if (_X.lengthSq() < 1e-6) _X.set(0, 0, 1).addScaledVector(_Y, -_Y.z);
  _X.normalize();
  _Z.crossVectors(_X, _Y);
  return setTRS(m, _P.set(px, py, pz), _X, _Y, _Z, w, h, d);
}
