// THE HEART'S FOE KIT (docs/MODEL_STANDARD.md "The Level IV foes"). What the
// six Hollow Heart foes share on top of the foe kit (render/facet/foe.js):
// the Heart's palette (enemies/style.js HEART: bodies of bruised flesh, old
// bone and dark slate, MADE of its violet in glowing veins and crystal), the
// vein material whose colour a rig drives every frame between dim, resting
// and hot, the halo sprite, the crystal material (its emissive glow driven
// too), and the shared heartbeat envelopes the husks and the blooms beat to.
// Render only.
import { Color, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import { makeGlowSprite } from '../../glow.js';
import { facetMaterial } from '../../facet/material.js';
import { HEART } from '../style.js';
export { heartbeatK } from '../heart.js';

// A vein / coal / crystal-light material: unlit, its colour driven per frame
// (one per rig: the crowd shares geometry, never a driven colour).
export const veinMat = (c = HEART.vein) => new MeshBasicMaterial({ color: c.clone(), toneMapped: false });
// k 0..1: dim (between beats), resting at 0.5, hot (the swell, a lit coal).
export function veinColor(out, k) {
  const c = k < 0 ? 0 : k > 1 ? 1 : k;
  return c < 0.5 ? out.copy(HEART.veinDim).lerp(HEART.vein, c * 2) : out.copy(HEART.vein).lerp(HEART.veinHot, (c - 0.5) * 2);
}
// A halo sprite in the Heart's glow (or the Censer's rose).
export function heartGlow(size, opacity, color = HEART.glow) {
  const g = makeGlowSprite({ color: '#FFFFFF', size, opacity });
  g.material.toneMapped = false;
  g.material.color.copy(color);
  return g;
}
// Faceted crystal: lit, with the vein glow as its emissive (driven per frame).
export function crystalMaterial(intensity = 0.5) {
  return facetMaterial(HEART.crystal, { emissive: HEART.vein, emissiveIntensity: intensity });
}
// The Heart's tints for one white faceted material (every tone in its vertex
// colours, as the miller's).
export const TINT = Object.freeze({
  ash: new Color(HEART.ash),
  flesh: new Color(HEART.flesh),
  fleshDark: new Color(HEART.fleshDark),
  bone: new Color(HEART.bone),
  cloth: new Color(HEART.cloth),
  stone: new Color(HEART.stone),
  stoneDark: new Color(HEART.stoneDark),
  crystal: new Color(HEART.crystal),
  // the dark of an open cavity / a mouth (the classic's fleshDark at 35%)
  cavity: new Color(HEART.fleshDark).multiplyScalar(0.35),
});

// Matrix helpers shared by the rigs' bakes.
export const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
export const qa = (ax, ay, az, a) => new Quaternion().setFromAxisAngle(new Vector3(ax, ay, az).normalize(), a);
export const qTo = (x, y, z) => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(x, y, z).normalize());
// A faceted rod from a to b (a baked vein, a rib, a chain link's bar): the
// unit segment (y 0..1) placed and scaled.
export function rodM(a, b, r) {
  const d = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = d.length() || 1e-3;
  return new Matrix4().compose(new Vector3(a[0], a[1], a[2]), qTo(d.x, d.y, d.z), new Vector3(r, len, r));
}
export const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);
export const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
