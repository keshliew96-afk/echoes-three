// FACETED LOOK (docs/MODEL_STANDARD.md). The model standard from Kesh's
// sample video: every face carries ONE tone, so light reads as crisp planes
// (dark, mid, lit) instead of a smooth gradient. It is laid ON TOP of the
// chibi toon look (BUILD_BRIEF §19.2), not in place of it:
//
//   * the material is still the toon material (same 3-step gradient, same
//     emissive hit flash, same downed greying through `trackAccent`);
//   * the geometry is what changes: `facetize` splits every face off its
//     neighbours and gives it its own flat normal, so the toon ramp picks one
//     band per face, plus a small per-plane value step (`jitter`) so two faces
//     that land in the same band still read apart, the way the video's
//     scales do;
//   * the ink hull is untouched (it welds the faces back together and draws
//     the same constant-pixel line round the silhouette).
//
// Note: `flatShading` is not a MeshToonMaterial option (enemies/boar.js), so
// the facets live in the geometry, where every material honours them.
import { BufferAttribute } from 'three';
import { toonMaterial } from '../toon.js';

// A small integer hash -> 0..1 (deterministic: the same model is faceted the
// same way in every session, so probes and shots compare).
export function hash01(a, b = 0, c = 0, d = 0) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1) ^ Math.imul(d | 0, 0x85ebca6b);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

// Split a geometry into flat faces with a per-plane value step. Two triangles
// of one planar quad share a normal, so they share their step and the quad
// reads as one plate (no diagonal seam).
export function facetize(geo, { jitter = 0.1, seed = 1 } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (g.attributes.normal) g.deleteAttribute('normal');
  g.computeVertexNormals(); // non-indexed: each triangle gets its own flat normal
  const nor = g.attributes.normal;
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i + 2 < n; i += 3) {
    const h = hash01(Math.round(nor.getX(i) * 50), Math.round(nor.getY(i) * 50), Math.round(nor.getZ(i) * 50), seed);
    const v = 1 + jitter * (2 * h - 1);
    for (let j = 0; j < 3; j++) col.set([v, v, v], (i + j) * 3);
  }
  g.setAttribute('color', new BufferAttribute(col, 3));
  g.userData.faceted = true;
  return g;
}

// The faceted toon material: the toon material reading the per-face steps.
export function facetMaterial(color, opts = {}) {
  const m = toonMaterial({ color, vertexColors: true, ...opts });
  m.userData.facet = true;
  return m;
}
