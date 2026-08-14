// Toon material + inverted-hull outline factory (BUILD_BRIEF §19.2).
// MeshToonMaterial with a shared 3-step gradient DataTexture; outlines are a
// second backface mesh scaled ~1.04 in Void Charcoal — the storybook ink line.
import {
  BackSide,
  Color,
  DataTexture,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { OUTLINE } from '../core/constants.js';
import { PALETTE } from '../data/palette.js';

let sharedGradientMap = null;

// 3-step gradient DataTexture for the chibi toon look (§19.2 "3-step gradient").
export function getGradientMap() {
  if (sharedGradientMap) return sharedGradientMap;
  // Shadow / mid / lit bands. NearestFilter keeps the steps crisp.
  const steps = new Uint8Array([96, 176, 255]);
  const tex = new DataTexture(steps, steps.length, 1, RedFormat);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  sharedGradientMap = tex;
  return tex;
}

// Toon material factory. opts: { color, emissive, emissiveIntensity, ...rest }
export function toonMaterial(opts = {}) {
  const { color = PALETTE.warmGrey, ...rest } = opts;
  return new MeshToonMaterial({
    color: new Color(color),
    gradientMap: getGradientMap(),
    ...rest,
  });
}

let sharedOutlineMaterial = null;

export function getOutlineMaterial() {
  if (sharedOutlineMaterial) return sharedOutlineMaterial;
  sharedOutlineMaterial = new MeshBasicMaterial({
    color: new Color(PALETTE.voidCharcoal),
    side: BackSide,
    toneMapped: false, // ink stays ink — never lifted by the grade/tonemap
    // Push the hull back in depth ties so it never speckles through the body
    // where the two surfaces nearly coincide (thin cones, glancing faces);
    // true silhouette ink is outside the body and unaffected.
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2,
  });
  return sharedOutlineMaterial;
}

// Inverted-hull outline: a backface child mesh whose vertices are displaced
// outward along SMOOTHED vertex normals by a constant world-space thickness
// (~2px ink at gameplay zoom). Plain center-scaling (the naive ~1.04 hull)
// breaks on hard-edged geometry — faces sitting edge-on to the camera leave
// gaps in the ink ring (verified on box/cone captures) — so we merge vertices,
// recompute averaged normals, and push along those instead; equivalent ink
// weight, but the line survives the Tank's squared masses. Returns the hull
// mesh so callers can toggle .visible.
export function addOutline(mesh, { thickness = OUTLINE.thickness } = {}) {
  // Drop every attribute except position first — mergeVertices only unifies
  // vertices identical in ALL attributes, and seam-split uv/normals would keep
  // duplicates apart, cracking the displaced hull open along seams.
  let geo = mesh.geometry.clone();
  for (const name of Object.keys(geo.attributes)) {
    if (name !== 'position') geo.deleteAttribute(name);
  }
  geo = mergeVertices(geo);
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) + nor.getX(i) * thickness,
      pos.getY(i) + nor.getY(i) * thickness,
      pos.getZ(i) + nor.getZ(i) * thickness
    );
  }
  pos.needsUpdate = true;
  const hull = new Mesh(geo, getOutlineMaterial());
  hull.name = `${mesh.name || 'mesh'}-outline`;
  mesh.add(hull);
  return hull;
}
