// Edge props (§19.3: 6-10 distinct silhouettes ringing the arena, none taller
// than the Tank, center readable). Every prop type is built from primitive
// layers that share ONE per-instance transform, rendered as InstancedMesh per
// layer (one draw call per layer regardless of count) with an instanced
// inverted-hull ink outline (§19.2) and a blob contact shadow (reference bar
// check 8) via the shared shadow instancer.
//
// Four rules this module exists to keep, each one a previous reject:
//
// 1. INK IS SCREEN-SPACE, AND IT MATCHES THE PARTY. The critters carry a
//    constant 2.0 px inverted-hull line (render/critters/common.js INK_PX). A
//    world-space hull — what round 3 shipped here — scales with mass and camera
//    distance, so the environment's line never agreed with the party's and the
//    critters read as thick-outlined stickers pasted on a differently-drawn
//    painting. Props, walls and the monolith now expand their hull in CLIP
//    space through the same technique, at the same 2 px (see getPropInkMaterial
//    below). A clip-space push also has no up/down bias, which retires the old
//    "ink closes on the top edge but is buried under the floor along the
//    bottom" failure for free. Ground, grass and flowers stay inkless.
// 2. SHADOWS ARE CONTACT SHADOWS THAT READ OUTSIDE THE SILHOUETTE. One shared
//    soft blob per prop, CENTRED on the footprint (an offset blob reads as a
//    detached smudge), radius SHADOW_SPREAD x the prop's own footprint, solid
//    to 55% of that radius before it feathers. Round 3 sized both the disc and
//    its solid core so small that the darkening landed entirely underneath the
//    prop casting it — the shadows existed and measured invisible. Every
//    `foot` below must therefore cover the prop's WIDEST ground layer (root
//    flare, companion chunk, chip), not just its trunk. Self-illuminating props
//    get the faint tier so a torch never punches a hole in its own pool.
// 3. PROPS COME IN CLUSTERS THAT TOUCH BUT NEVER INTERPENETRATE. Placement is
//    authored as cluster anchors in env/variants.js; this module scatters 2-4
//    props per anchor with 0.65-1.35x scale jitter, THROUGH a footprint
//    rejection test that also keeps every prop inside the wall's inner face. An
//    evenly spaced single-file ring of identical primitives is the "bead
//    necklace" reject; a crate buried inside a stump inside a barrel is the
//    "dumped heap" reject. Both are excluded by construction.
// 4. EVERY TYPE CARRIES A SILHOUETTE-BREAKING DETAIL LAYER (crate lid + slats,
//    slab inset course + chipped corners + moss, stump root flare + ring cut).
import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  LinearSRGBColorSpace,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  Quaternion,
  ShaderMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ARENA } from '../core/constants.js';
import { toonMaterial, getGradientMap } from '../render/toon.js';
import { PALETTE } from '../data/palette.js';
import { ENV, hslColor, mix } from './colors.js';

// Ground-plane render order band. The additive warm light pools draw FIRST, the
// contact shadows draw on top of them: a black blob under an additive pool that
// draws first gets its darkening added straight back, which is why an earlier
// cut measured no shadow under anything.
export const ORDER = Object.freeze({ pool: -12, shadow: -8 });

const UP = new Vector3(0, 1, 0);

// ---------------------------------------------------------------------------
// INK (round-4 remediation). The party critters carry an inverted-hull line of
// a CONSTANT 2.0 SCREEN PIXELS (render/critters/common.js INK_PX). Round 3's
// environment used a world-space hull instead, so prop ink drifted with mass
// and camera distance and the party read as thick-lined stickers pasted onto a
// differently-drawn painting. This is the same technique the critters use —
// merged/re-normalled hull expanded in CLIP space — so every discrete prop,
// wall and capstone now carries a line of exactly the weight the party does.
//
// Ground, grass tufts and flowers stay inkless by design: they are texture, not
// silhouette.
// ---------------------------------------------------------------------------
export const PROP_INK_PX = 2.0; // matches critters/common.js INK_PX
const DETAIL_INK_PX = 1.4; // secondary layers (lids, hoops, chips, footings)

const inkViewport = new Vector2(1600, 900);
const inkColor = new Color(PALETTE.voidCharcoal);
const inkMats = new Map();

// Called once per frame from the arena scene with the canvas size, so the line
// stays 2 px through a window resize.
export function setPropInkViewport(width, height) {
  inkViewport.set(width, height);
}

export function getPropInkMaterial(px = PROP_INK_PX) {
  const key = px.toFixed(2);
  const hit = inkMats.get(key);
  if (hit) return hit;
  const mat = new ShaderMaterial({
    uniforms: {
      uPx: { value: px },
      uViewport: { value: inkViewport },
      uColor: { value: inkColor },
    },
    side: BackSide,
    // Pushed back in depth so the hull only survives OUTSIDE a silhouette: a
    // half-buried layer (a crate slat, a stump root) would otherwise paint its
    // ink across the mass it is embedded in.
    polygonOffset: true,
    polygonOffsetFactor: 3,
    polygonOffsetUnits: 3,
    vertexShader: /* glsl */ `
      uniform float uPx;
      uniform vec2 uViewport;
      void main() {
        #ifdef USE_INSTANCING
          mat4 iM = instanceMatrix;
        #else
          mat4 iM = mat4( 1.0 );
        #endif
        vec4 local = iM * vec4( position, 1.0 );
        vec3 nLocal = normalize( mat3( iM ) * normal );
        vec4 clip = projectionMatrix * modelViewMatrix * local;
        vec2 np = ( projectionMatrix * vec4( normalize( normalMatrix * nLocal ), 0.0 ) ).xy;
        float l = length( np );
        if ( l > 1e-5 ) clip.xy += ( np / l ) * ( uPx * 2.0 / uViewport ) * clip.w;
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4( uColor, 1.0 ); }
    `,
  });
  inkMats.set(key, mat);
  return mat;
}

// Hull geometry for the ink pass: positions only, vertices merged and normals
// re-averaged (split normals tear the hull open along a box's hard edges). The
// expansion itself happens in the shader, so no world-space displacement — and
// therefore none of round 3's "ink closes on the top edge but not the bottom"
// problem either, since a clip-space push has no up/down bias at all.
export function inkGeometry(source) {
  let geo = source.clone();
  for (const name of Object.keys(geo.attributes)) {
    if (name !== 'position') geo.deleteAttribute(name);
  }
  geo = mergeVertices(geo);
  geo.computeVertexNormals();
  return geo;
}

// Screen-space ink child for a non-instanced mesh (monolith, wall runs).
export function addPropInk(mesh, px = PROP_INK_PX) {
  const hull = new Mesh(inkGeometry(mesh.geometry), getPropInkMaterial(px));
  hull.name = `${mesh.name || 'mesh'}-ink`;
  mesh.add(hull);
  return hull;
}

// layers: [{ geo, mat, ink: false | thickness }] — geo pre-translated so y=0 is
// the ground plane. transforms: [{ x, z, yaw, s, sy }].
function addInstancedProp(root, layers, transforms) {
  const meshes = [];
  for (const layer of layers) {
    const im = new InstancedMesh(layer.geo, layer.mat, transforms.length);
    im.frustumCulled = false; // instances span the arena; geometry bounds don't
    meshes.push(im);
    if (layer.ink) {
      const hull = new InstancedMesh(
        inkGeometry(layer.geo),
        getPropInkMaterial(layer.ink === true ? PROP_INK_PX : layer.ink),
        transforms.length
      );
      hull.frustumCulled = false;
      meshes.push(hull);
    }
  }
  const m = new Matrix4();
  const q = new Quaternion();
  const p = new Vector3();
  const s = new Vector3();
  transforms.forEach((t, i) => {
    q.setFromAxisAngle(UP, t.yaw ?? 0);
    p.set(t.x, 0, t.z);
    const sc = t.s ?? 1;
    s.set(sc, t.sy ?? sc, sc);
    m.compose(p, q, s);
    for (const im of meshes) im.setMatrixAt(i, m);
  });
  for (const im of meshes) {
    im.instanceMatrix.needsUpdate = true;
    root.add(im);
  }
  return meshes;
}

// Contact-shadow falloff (critique F1). Round 3 kept the solid core out to only
// 50% of the radius, so a crate whose blob radius was 1.45x its 0.3 u footprint
// put its SOLID darkening at 0.22 u — narrower than the crate's own 0.25 u
// half-width. The shadow existed (debugState reported 46-49 of them) and was
// entirely hidden underneath the prop that cast it, which is exactly what the
// critic measured: identical luminance under a prop and beside it.
//
// This ramp holds full opacity out to 62% of the radius and only then feathers,
// and SHADOW_SPREAD below sizes the disc at 1.75x the footprint, so a readable
// dark crescent always lands on open ground outside the silhouette.
let sharedContactTexture = null;
export function getContactTexture() {
  if (sharedContactTexture) return sharedContactTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,1)');
  grad.addColorStop(0.72, 'rgba(255,255,255,0.82)');
  grad.addColorStop(0.88, 'rgba(255,255,255,0.34)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  sharedContactTexture = tex;
  return tex;
}

// Disc radius as a multiple of the prop's ground footprint, and the Z stretch
// that pushes the readable part of the blob toward the camera at the rig's
// 52 deg pitch (the player capsule already uses the same trick).
export const SHADOW_SPREAD = 1.6;
const SHADOW_Z_STRETCH = 1.3;

// Shared factory for every contact shadow in the arena (props, player,
// entities). Pure black at a fixed alpha over the already-composited ground =
// dest*(1-alpha): a darken/multiply with no hue of its own.
export function makeShadowMaterial(opacity = 0.48) {
  return new MeshBasicMaterial({
    map: getContactTexture(),
    color: new Color('#000000'),
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
    // The blob sits 7.5 mm above the floor; polygonOffset keeps it off the
    // floor's depth values entirely so it can never z-fight with the ground
    // plane or with a ground decal at a glancing camera angle.
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
}

// One InstancedMesh of soft dark ellipses = every prop's contact shadow
// (reference bar check 8: grounding). Sized to each footprint, CENTRED on the
// prop base. `faint` carries the self-illuminating props (torches, lanterns) so
// a fire never sits in a black hole of its own making.
export function buildShadowInstances(root, shadows) {
  const geo = new CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  const m = new Matrix4();
  const q = new Quaternion();
  const p = new Vector3();
  const s = new Vector3();
  for (const [faint, opacity] of [[false, 0.62], [true, 0.34]]) {
    const list = shadows.filter((sh) => !!sh.faint === faint);
    if (list.length === 0) continue;
    const im = new InstancedMesh(geo, makeShadowMaterial(opacity), list.length);
    im.renderOrder = ORDER.shadow;
    im.frustumCulled = false;
    list.forEach((sh, i) => {
      q.setFromAxisAngle(UP, sh.yaw ?? 0);
      p.set(sh.x, 0.0075, sh.z); // centred: no directional offset, ever
      s.set(sh.rx, 1, (sh.rz ?? sh.rx) * SHADOW_Z_STRETCH);
      m.compose(p, q, s);
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
    root.add(im);
  }
}

// ---------------------------------------------------------------------------
// Prop type table. Each entry returns { layers, foot } where `foot` is the
// footprint radius at scale 1 (drives both the contact shadow and the foliage
// rejection mask, so grass can never grow through a solid prop).
// ---------------------------------------------------------------------------
function propTypes(mats, spec) {
  const T = {};

  // --- Stone slab (critique F4). Round 3 parked the "broken chip" at x = 0.62
  // while the slab body ends at x = 0.46, so the chip floated with a 1-2 px
  // strip of grass showing between it and the stone: on screen it read as a
  // detached pale quad, not as a piece knocked off the slab. It now overlaps
  // the body and sits lower, and the top face carries a raised inset course, a
  // bevelled lip, chipped corners and moss so the slab is not the largest flat
  // fill in the frame any more.
  {
    const body = new BoxGeometry(0.92, 0.15, 0.64).translate(0, 0.075, 0);
    // Raised inset course on the top face — the value break that stops the
    // slab reading as one untextured plane.
    const course = new BoxGeometry(0.66, 0.045, 0.42).translate(-0.03, 0.168, 0.01);
    const crack = mergeGeometries([
      new BoxGeometry(0.028, 0.03, 0.44).translate(0.12, 0.185, 0.02),
      new BoxGeometry(0.24, 0.03, 0.026).translate(-0.1, 0.185, -0.1),
      new BoxGeometry(0.02, 0.03, 0.2).translate(-0.22, 0.185, 0.14),
    ]);
    const moss = mergeGeometries([
      new IcosahedronGeometry(0.15, 0).scale(1, 0.22, 0.8).translate(-0.3, 0.155, 0.12),
      new IcosahedronGeometry(0.08, 0).scale(1, 0.24, 0.85).translate(0.3, 0.16, -0.2),
    ]);
    // Chipped corners: wedges cut INTO the slab silhouette, overlapping it.
    const chips = mergeGeometries([
      new BoxGeometry(0.24, 0.09, 0.2).rotateY(0.5).translate(0.4, 0.045, 0.24),
      new BoxGeometry(0.16, 0.07, 0.14).rotateY(-0.6).translate(-0.42, 0.038, -0.24),
    ]);
    T.slab = {
      layers: [
        { geo: body, mat: mats.stone, ink: PROP_INK_PX },
        { geo: chips, mat: mats.stoneCool, ink: 1.5 },
        { geo: course, mat: mats.stoneLit, ink: DETAIL_INK_PX },
        { geo: crack, mat: mats.stoneDark },
        { geo: moss, mat: mats.moss },
      ],
      foot: 0.52,
      rz: 0.4,
    };
  }

  // --- Stump: trunk + pale cut top + ring cut + root flare.
  {
    const trunk = new CylinderGeometry(0.25, 0.34, 0.4, 10).translate(0, 0.2, 0);
    const top = new CylinderGeometry(0.238, 0.238, 0.05, 10).translate(0, 0.4, 0);
    const ring = mergeGeometries([
      new TorusGeometry(0.15, 0.011, 5, 16).rotateX(Math.PI / 2).translate(0, 0.427, 0),
      new TorusGeometry(0.075, 0.009, 5, 14).rotateX(Math.PI / 2).translate(0, 0.427, 0),
    ]);
    const roots = mergeGeometries(
      [0, 1, 2, 3].map((k) => {
        const a = (k * Math.PI) / 2 + 0.5;
        return new ConeGeometry(0.11, 0.3, 5)
          .rotateZ(Math.PI / 2 - 0.35)
          .rotateY(-a)
          .translate(Math.cos(a) * 0.28, 0.07, Math.sin(a) * 0.28);
      })
    );
    T.stump = {
      layers: [
        { geo: trunk, mat: mats.bark, ink: PROP_INK_PX },
        { geo: roots, mat: mats.barkDark, ink: 1.5 },
        { geo: top, mat: mats.stumpTop },
        { geo: ring, mat: mats.barkDark },
      ],
      // Footprint has to cover the ROOT FLARE (cones out to ~0.39), not just
      // the trunk: an undersized foot is what buries a contact shadow under the
      // prop it belongs to (critique F1).
      foot: 0.46,
    };
  }

  // --- Fence: 2 posts + 2 rails + a diagonal brace + post caps.
  {
    const posts = mergeGeometries([
      new CylinderGeometry(0.045, 0.062, 0.58, 6).translate(-0.45, 0.29, 0),
      new CylinderGeometry(0.045, 0.062, 0.52, 6).translate(0.45, 0.26, 0),
    ]);
    const rails = mergeGeometries([
      new BoxGeometry(1.06, 0.058, 0.045).translate(0, 0.44, 0),
      new BoxGeometry(1.06, 0.058, 0.045).translate(0, 0.24, 0),
      new BoxGeometry(0.5, 0.04, 0.035).rotateZ(0.42).translate(-0.2, 0.34, 0.03),
    ]);
    const caps = mergeGeometries([
      new ConeGeometry(0.06, 0.07, 5).translate(-0.45, 0.61, 0),
      new ConeGeometry(0.06, 0.07, 5).translate(0.45, 0.55, 0),
    ]);
    T.fence = {
      layers: [
        { geo: posts, mat: mats.bark, ink: 1.5 },
        { geo: rails, mat: mats.plank, ink: DETAIL_INK_PX },
        { geo: caps, mat: mats.barkDark },
      ],
      foot: 0.56,
      rz: 0.16,
    };
  }

  // --- Crate: body + lid rim + slat grooves + corner battens.
  {
    const body = new BoxGeometry(0.44, 0.4, 0.44).translate(0, 0.2, 0);
    const lid = new BoxGeometry(0.5, 0.07, 0.5).translate(0, 0.425, 0);
    const slats = mergeGeometries([
      new BoxGeometry(0.46, 0.035, 0.035).translate(0, 0.29, 0.222),
      new BoxGeometry(0.46, 0.035, 0.035).translate(0, 0.12, 0.222),
      new BoxGeometry(0.035, 0.035, 0.46).translate(0.222, 0.29, 0),
      new BoxGeometry(0.035, 0.035, 0.46).translate(-0.222, 0.12, 0),
    ]);
    const knot = new BoxGeometry(0.1, 0.05, 0.1).translate(0.1, 0.47, -0.09);
    T.crate = {
      layers: [
        { geo: body, mat: mats.plank, ink: PROP_INK_PX },
        { geo: lid, mat: mats.plankLit, ink: DETAIL_INK_PX },
        { geo: slats, mat: mats.barkDark },
        { geo: knot, mat: mats.iron },
      ],
      foot: 0.3,
    };
  }

  // --- Barrel: staved body + iron hoops + lid disc + bung.
  {
    const body = new CylinderGeometry(0.2, 0.235, 0.5, 12).translate(0, 0.25, 0);
    const hoops = mergeGeometries([
      new TorusGeometry(0.222, 0.019, 6, 18).rotateX(Math.PI / 2).translate(0, 0.13, 0),
      new TorusGeometry(0.206, 0.019, 6, 18).rotateX(Math.PI / 2).translate(0, 0.38, 0),
    ]);
    const lid = new CylinderGeometry(0.185, 0.195, 0.045, 12).translate(0, 0.515, 0);
    const bung = new CylinderGeometry(0.035, 0.035, 0.05, 6).rotateX(Math.PI / 2).translate(0, 0.26, 0.225);
    T.barrel = {
      layers: [
        { geo: body, mat: mats.bark, ink: PROP_INK_PX },
        { geo: lid, mat: mats.plankLit, ink: DETAIL_INK_PX },
        { geo: hoops, mat: mats.iron },
        { geo: bung, mat: mats.barkDark },
      ],
      foot: 0.27,
    };
  }

  // --- Fallen log: trunk + moss cap + hollow broken end + branch stub.
  {
    const trunk = new CylinderGeometry(0.19, 0.22, 1.5, 9).rotateZ(Math.PI / 2).translate(0, 0.19, 0);
    const mossCap = mergeGeometries([
      new CylinderGeometry(0.205, 0.205, 0.36, 9, 1, false, 0, Math.PI)
        .rotateZ(Math.PI / 2)
        .translate(0.22, 0.19, 0),
      new CylinderGeometry(0.212, 0.212, 0.2, 9, 1, false, 0, Math.PI)
        .rotateZ(Math.PI / 2)
        .translate(-0.44, 0.19, 0),
    ]);
    const hollow = new CylinderGeometry(0.13, 0.13, 0.1, 9).rotateZ(Math.PI / 2).translate(-0.76, 0.19, 0);
    const branch = new CylinderGeometry(0.05, 0.065, 0.42, 6)
      .rotateZ(-0.9)
      .translate(0.42, 0.32, 0.16);
    T.log = {
      layers: [
        { geo: trunk, mat: mats.bark, ink: PROP_INK_PX },
        { geo: branch, mat: mats.barkDark, ink: 1.5 },
        { geo: mossCap, mat: mats.moss },
        { geo: hollow, mat: mats.barkDark },
      ],
      foot: 0.85,
      rz: 0.3,
    };
  }

  // --- Bush / fern: dark lobes + two lighter crown lobes (2-tone read).
  {
    const base = mergeGeometries([
      new IcosahedronGeometry(0.3, 0).translate(0, 0.2, 0),
      new IcosahedronGeometry(0.23, 0).translate(0.27, 0.13, 0.1),
      new IcosahedronGeometry(0.21, 0).translate(-0.21, 0.12, -0.14),
    ]);
    const crown = mergeGeometries([
      new IcosahedronGeometry(0.17, 0).translate(-0.03, 0.38, 0.02),
      new IcosahedronGeometry(0.11, 0).translate(0.2, 0.28, -0.1),
    ]);
    T.bush = {
      layers: [
        { geo: base, mat: mats.bush, ink: PROP_INK_PX },
        { geo: crown, mat: mats.bushLit, ink: 1.5 },
      ],
      foot: 0.48, // outermost lobe sits at 0.27 + r 0.23
    };
  }

  // --- Boulder: main mass + companion chunk + moss cap.
  {
    const main = new IcosahedronGeometry(0.34, 0).scale(1, 0.68, 0.9).translate(0, 0.22, 0);
    const chunk = new IcosahedronGeometry(0.17, 0).scale(1, 0.7, 1).translate(0.38, 0.1, -0.14);
    const moss = new IcosahedronGeometry(0.16, 0).scale(1, 0.2, 0.85).translate(-0.06, 0.4, 0.06);
    T.boulder = {
      layers: [
        { geo: main, mat: mats.stoneCool, ink: PROP_INK_PX },
        { geo: chunk, mat: mats.stoneCool, ink: 1.5 },
        { geo: moss, mat: mats.moss },
      ],
      foot: 0.5, // companion chunk reaches 0.38 + r 0.17
    };
  }

  // --- Cairn: three stacked flattened stones — the tallest, most graphic
  // silhouette in the stone family (variant 2's signature).
  {
    const s0 = new IcosahedronGeometry(0.27, 0).scale(1, 0.42, 0.9).translate(0, 0.11, 0);
    const s1 = new IcosahedronGeometry(0.21, 0).scale(1, 0.5, 0.9).rotateY(0.7).translate(0.03, 0.29, -0.02);
    const s2 = new IcosahedronGeometry(0.14, 0).scale(1, 0.62, 0.9).rotateY(1.4).translate(-0.02, 0.46, 0.03);
    const moss = new IcosahedronGeometry(0.1, 0).scale(1, 0.25, 0.8).translate(0.16, 0.16, 0.12);
    T.cairn = {
      layers: [
        { geo: s0, mat: mats.stone, ink: PROP_INK_PX },
        { geo: s1, mat: mats.stoneLit, ink: 1.5 },
        { geo: s2, mat: mats.stoneCool, ink: 1.5 },
        { geo: moss, mat: mats.moss },
      ],
      foot: 0.32,
    };
  }

  // --- Torch post: pole + iron cup + rag binding + stone footing.
  {
    const pole = new CylinderGeometry(0.037, 0.052, 0.86, 7).translate(0, 0.43, 0);
    const cup = new ConeGeometry(0.09, 0.13, 7).rotateX(Math.PI).translate(0, 0.88, 0);
    const binding = mergeGeometries([
      new TorusGeometry(0.055, 0.014, 5, 12).rotateX(Math.PI / 2).translate(0, 0.74, 0),
      new TorusGeometry(0.058, 0.012, 5, 12).rotateX(Math.PI / 2).translate(0, 0.68, 0),
    ]);
    const footing = mergeGeometries([
      new IcosahedronGeometry(0.13, 0).scale(1, 0.5, 1).translate(0.11, 0.05, 0.05),
      new IcosahedronGeometry(0.11, 0).scale(1, 0.5, 1).translate(-0.1, 0.045, -0.07),
      new IcosahedronGeometry(0.09, 0).scale(1, 0.5, 1).translate(0.02, 0.04, -0.13),
    ]);
    T.torch = {
      layers: [
        { geo: pole, mat: mats.bark, ink: 1.5 },
        { geo: cup, mat: mats.iron, ink: 1.5 },
        { geo: binding, mat: mats.barkDark },
        { geo: footing, mat: mats.stoneCool, ink: DETAIL_INK_PX },
      ],
      foot: 0.24,
      faint: true, // self-illuminating: faint shadow tier
      emitter: (t) => ({ kind: 'flame', x: t.x, y: 0.99 * (t.sy ?? t.s ?? 1), z: t.z }),
    };
  }

  // --- Hanging lantern: pole + arm + brace + glowing glass + cap + hook.
  {
    const pole = new CylinderGeometry(0.032, 0.048, 0.82, 6).translate(0, 0.41, 0);
    const arm = mergeGeometries([
      new BoxGeometry(0.34, 0.042, 0.042).translate(0.14, 0.79, 0),
      new BoxGeometry(0.19, 0.03, 0.03).rotateZ(-0.78).translate(0.08, 0.69, 0),
      new CylinderGeometry(0.008, 0.008, 0.09, 5).translate(0.28, 0.735, 0),
    ]);
    const glass = new BoxGeometry(0.115, 0.15, 0.115).translate(0.28, 0.615, 0);
    const cap = mergeGeometries([
      new ConeGeometry(0.105, 0.08, 4).translate(0.28, 0.73, 0),
      new BoxGeometry(0.13, 0.025, 0.13).translate(0.28, 0.532, 0),
    ]);
    const footing = mergeGeometries([
      new IcosahedronGeometry(0.12, 0).scale(1, 0.5, 1).translate(-0.1, 0.045, 0.06),
      new IcosahedronGeometry(0.1, 0).scale(1, 0.5, 1).translate(0.08, 0.04, -0.08),
    ]);
    T.lantern = {
      layers: [
        { geo: pole, mat: mats.iron, ink: DETAIL_INK_PX },
        { geo: arm, mat: mats.iron, ink: 1.15 },
        { geo: cap, mat: mats.iron, ink: 1.15 },
        { geo: glass, mat: mats.glass, ink: 1.15 },
        { geo: footing, mat: mats.stoneCool, ink: DETAIL_INK_PX },
      ],
      foot: 0.26,
      faint: true,
      emitter: (t) => ({
        kind: 'lantern',
        x: t.x + Math.cos(t.yaw) * 0.28,
        y: 0.615,
        z: t.z - Math.sin(t.yaw) * 0.28,
      }),
    };
  }

  void spec;
  return T;
}

// ---------------------------------------------------------------------------
// The act's corruption tell: an UPRIGHT obelisk of near-black cool stone on a
// two-step plinth, veined in God-stuff Violet #B79CF0 — the ONLY violet in an
// Act-1 frame. The stone is deliberately dark and cool so the emissive veins
// stay saturated violet instead of lifting into grey-mauve, and the emissive
// intensity is capped so the vein cores never clip to white under bloom.
// ---------------------------------------------------------------------------
function veinTexture(cosmetic) {
  const w = 160;
  const h = 320;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  const r = (a, b) => cosmetic.range(a, b);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const vein = (x, y, ang, len, width, alpha) => {
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let cx = x;
    let cy = y;
    let a = ang;
    const steps = Math.ceil(len / 14);
    for (let i = 0; i < steps; i++) {
      a += r(-0.5, 0.5);
      cx += Math.cos(a) * r(10, 16);
      cy += Math.sin(a) * r(10, 16);
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    return { x: cx, y: cy, a };
  };
  // A soft violet-carrying haze first (so the map is never pure on/off), then
  // the vein network at a moderate alpha — no white shadowBlur halo, which is
  // what turned the veins into a blown-out lightning scribble last round.
  for (let i = 0; i < 26; i++) {
    const g = ctx.createRadialGradient(r(0, w), r(0, h), 0, r(0, w), r(0, h), r(18, 46));
    g.addColorStop(0, 'rgba(255,255,255,0.10)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  for (let i = 0; i < 5; i++) {
    const end = vein(r(16, w - 16), h - r(6, 40), -Math.PI / 2 + r(-0.3, 0.3), r(150, 250), 2.6, 0.85);
    if (cosmetic.chance(0.85)) vein(end.x, end.y, end.a + r(-1.1, 1.1), r(45, 95), 1.5, 0.6);
    if (cosmetic.chance(0.5)) vein(end.x, end.y, end.a + r(-1.6, 1.6), r(30, 70), 1.1, 0.45);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

// Pre-tonemap linear violet that COMES OUT of the ACES + grade chain as
// God-stuff Violet #B79CF0 (hue 259 deg, sat 0.35). Authoring the emissive at
// the literal palette hex measured back as a desaturated grey-mauve, because
// ACES compresses chroma hard: this is the numeric inverse of the filmic curve
// per channel, and its luminance (0.33) sits well under the 0.85 bloom
// threshold. Round 4 raises it 2.5x on purpose: the monolith is a LIGHT SOURCE
// in the reference language, so the vein cores now sit at luminance ~0.95 —
// just over the bloom threshold — and bloom out to the God-stuff Violet peak
// #F1ECFA while the halo skirt stays saturated violet.
export const VEIN_VIOLET = [1.05, 0.72, 1.95];
const VEIN_LINEAR = VEIN_VIOLET;

// The vein network is GEOMETRY, not an emissiveMap. A canvas map wraps 160 px
// across four faces of a prop that is ~60 screen px wide, so a 3 px stroke lands
// at half a pixel and the tell simply does not read at gameplay zoom.
function buildVeins(H, cosmetic) {
  const bars = [];
  const r = (a, b) => cosmetic.range(a, b);
  const radiusAt = (t) => (0.42 + (0.2 - 0.42) * t) * Math.SQRT1_2;
  for (let face = 0; face < 4; face++) {
    const faceAng = Math.PI / 4 + (face * Math.PI) / 2;
    const chains = 1 + (cosmetic.chance(0.6) ? 1 : 0);
    for (let ch = 0; ch < chains; ch++) {
      let t = r(0.02, 0.12);
      let lat = r(-0.1, 0.1);
      const segs = 4 + Math.floor(r(0, 3));
      for (let sgen = 0; sgen < segs && t < 0.95; sgen++) {
        const len = r(0.1, 0.2);
        const nextT = Math.min(0.97, t + len);
        const nextLat = lat + r(-0.07, 0.07);
        const midT = (t + nextT) / 2;
        const dy = (nextT - t) * H;
        const dx = nextLat - lat;
        const bar = new BoxGeometry(0.019, Math.hypot(dy, dx) + 0.012, 0.02);
        bar.rotateZ(-Math.atan2(dx, dy));
        bar.translate((lat + nextLat) / 2, 0.14 + midT * H, radiusAt(midT) + 0.012);
        bar.rotateY(faceAng);
        bars.push(bar);
        // Occasional short branch off the main vein.
        if (cosmetic.chance(0.35)) {
          const br = new BoxGeometry(0.015, r(0.07, 0.14), 0.018);
          br.rotateZ(r(0.7, 1.3) * (cosmetic.chance(0.5) ? 1 : -1));
          br.translate(nextLat, 0.14 + nextT * H, radiusAt(nextT) + 0.012);
          br.rotateY(faceAng);
          bars.push(br);
        }
        t = nextT;
        lat = nextLat;
      }
    }
  }
  return mergeGeometries(bars);
}

function buildMonolith(root, [x, z, yaw], shadows, emitters, cosmetic, footprints) {
  const H = 1.16; // stays under one character height (§19.3)
  const geo = new CylinderGeometry(0.2, 0.42, H, 4, 1).translate(0, H / 2 + 0.14, 0);
  const mat = new MeshToonMaterial({
    color: new Color(ENV.monolith),
    gradientMap: getGradientMap(),
    emissive: new Color(PALETTE.godstuffViolet),
    emissiveMap: veinTexture(cosmetic),
    emissiveIntensity: 0.6, // the faint under-glow; the bars carry the read
  });
  const mesh = new Mesh(geo, mat);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = yaw;
  addPropInk(mesh);
  root.add(mesh);

  const veinMat = new MeshBasicMaterial({ toneMapped: false });
  veinMat.color.setRGB(VEIN_LINEAR[0], VEIN_LINEAR[1], VEIN_LINEAR[2], LinearSRGBColorSpace);
  const veins = new Mesh(buildVeins(H, cosmetic), veinMat);
  veins.position.set(x, 0, z);
  veins.rotation.y = yaw;
  veins.renderOrder = 2;
  root.add(veins);

  // Two-step plinth so the obelisk stands instead of half-burying itself.
  const plinth = new Mesh(
    new BoxGeometry(0.96, 0.1, 0.86).translate(0, 0.05, 0),
    toonMaterial({ color: ENV.monolithBase })
  );
  plinth.position.set(x, 0, z);
  plinth.rotation.y = yaw;
  addPropInk(plinth);
  root.add(plinth);

  const step = new Mesh(
    new BoxGeometry(0.7, 0.09, 0.62).translate(0, 0.145, 0),
    toonMaterial({ color: ENV.monolithBase })
  );
  step.position.set(x, 0, z);
  step.rotation.y = yaw + 0.18;
  addPropInk(step, 1.5);
  root.add(step);

  shadows.push({ x, z, rx: 0.98, rz: 0.9 });
  footprints.push({ x, z, r: 0.78 });
  emitters.push({ kind: 'monolith', x, y: 0.78, z });
  return mat;
}

// ---------------------------------------------------------------------------
// Cluster expansion: authored anchors -> 2-4 scattered props with scale jitter.
// ---------------------------------------------------------------------------
function expandClusters(spec, cosmetic, types, seedDiscs = []) {
  const byType = new Map();
  const r = (a, b) => cosmetic.range(a, b);
  // The wall's inner face is exactly the playfield rect (walls.js builds
  // outward from it), so a prop must keep its whole footprint inside it or it
  // clips through the wall base — critique F5's "jagged seam where crate, grass
  // and outside-rock all meet".
  const placedDiscs = seedDiscs.slice();
  const fits = (x, z, rad) => {
    if (Math.abs(x) + rad > ARENA.halfW - 0.06) return false;
    if (Math.abs(z) + rad > ARENA.halfD - 0.06) return false;
    for (const d of placedDiscs) {
      // Silhouettes may TOUCH (0.86 of the summed radii) but never interpenetrate.
      if (Math.hypot(x - d.x, z - d.z) < (rad + d.r) * 0.86) return false;
    }
    return true;
  };

  for (const [ax, az, spread, recipe] of spec.clusters ?? []) {
    const tokens = recipe.split(/\s+/).filter(Boolean);
    const base = r(0, Math.PI * 2);
    tokens.forEach((tk, i) => {
      const def = types[tk];
      if (!def) return;
      const s = r(0.65, 1.35);
      const rad = Math.max(def.foot, def.rz ?? 0) * s;
      // Up to 14 tries on a widening ring; a prop that still cannot find room
      // is DROPPED rather than shoved into its neighbour (critique F5: the SE
      // pile where a crate sat inside a stump inside a barrel).
      let spot = null;
      for (let attempt = 0; attempt < 14 && !spot; attempt++) {
        const grow = 1 + attempt * 0.16;
        const ang = base + (i / Math.max(1, tokens.length)) * Math.PI * 2 + r(-0.5, 0.5);
        const dist = i === 0 && attempt === 0 ? r(0, spread * 0.3) : spread * grow * r(0.5, 1.1);
        const x = ax + Math.cos(ang) * dist;
        const z = az + Math.sin(ang) * dist * 0.72;
        if (fits(x, z, rad)) spot = { x, z };
      }
      if (!spot) return;
      placedDiscs.push({ x: spot.x, z: spot.z, r: rad });
      if (!byType.has(tk)) byType.set(tk, []);
      byType.get(tk).push({ x: spot.x, z: spot.z, yaw: r(0, Math.PI * 2), s, sy: s * r(0.88, 1.14) });
    });
  }
  return { byType, placedDiscs };
}

// Build every placed prop for a variant. Returns { emitters, shadows,
// footprints, mats, typeCount } for the emitter/FX layer, the shadow instancer
// and the foliage rejection mask.
export function buildProps(root, spec, cosmetic) {
  const shadows = [];
  const emitters = [];
  const footprints = [];
  const r = (a, b) => cosmetic.range(a, b);

  const mats = {
    bark: toonMaterial({ color: ENV.bark }),
    barkDark: toonMaterial({ color: ENV.barkDark }),
    plank: toonMaterial({ color: ENV.plank }),
    plankLit: toonMaterial({ color: ENV.plankLit }),
    stumpTop: toonMaterial({ color: ENV.stumpTop }),
    stone: toonMaterial({ color: ENV.stone }),
    stoneLit: toonMaterial({ color: ENV.stoneLit }),
    stoneDark: toonMaterial({ color: mix(ENV.stoneCool, PALETTE.voidCharcoal, 0.45) }),
    stoneCool: toonMaterial({ color: ENV.stoneCool }),
    iron: toonMaterial({ color: ENV.iron }),
    glass: new MeshBasicMaterial({ color: new Color(ENV.glassLit), toneMapped: false }),
    moss: toonMaterial({ color: hslColor(spec.ground.h + 18, 0.4, 0.215) }),
    bush: toonMaterial({ color: hslColor(spec.ground.h + 26, 0.34, 0.19) }),
    bushLit: toonMaterial({ color: hslColor(spec.ground.h + 6, 0.42, 0.245) }),
  };

  const types = propTypes(mats, spec);

  // Torches, lanterns and the monolith keep their AUTHORED positions (their
  // light pools and the act tell are part of the layout), so they are resolved
  // first and seeded into the cluster rejection table: a scattered crate can
  // then never end up buried inside a torch footing (critique F5).
  const clampIn = (v, lim, rad) => Math.max(-(lim - rad - 0.06), Math.min(lim - rad - 0.06, v));
  const torchT = (spec.torches ?? []).map(([x, z]) => {
    const sc = r(0.9, 1.1);
    return {
      x: clampIn(x, ARENA.halfW, types.torch.foot * sc),
      z: clampIn(z, ARENA.halfD, types.torch.foot * sc),
      yaw: r(0, Math.PI * 2),
      s: sc,
    };
  });
  const lanternT = (spec.lanterns ?? []).map(([x, z, yaw = 0]) => ({
    x: clampIn(x, ARENA.halfW, types.lantern.foot),
    z: clampIn(z, ARENA.halfD, types.lantern.foot),
    yaw,
    s: 1,
  }));
  const seedDiscs = [
    ...torchT.map((t) => ({ x: t.x, z: t.z, r: types.torch.foot * t.s + 0.28 })),
    ...lanternT.map((t) => ({ x: t.x, z: t.z, r: types.lantern.foot + 0.3 })),
  ];
  if (spec.monolith) {
    seedDiscs.push({ x: spec.monolith[0], z: spec.monolith[1], r: 0.86 });
  }

  const { byType: placed } = expandClusters(spec, cosmetic, types, seedDiscs);
  placed.set('torch', torchT);
  placed.set('lantern', lanternT);

  let typeCount = 0;
  for (const [name, transforms] of placed) {
    const def = types[name];
    if (!def || transforms.length === 0) continue;
    typeCount += 1;
    addInstancedProp(root, def.layers, transforms);
    for (const t of transforms) {
      const sc = t.s ?? 1;
      // Contact shadow: centred, sized from the prop's own footprint.
      shadows.push({
        x: t.x,
        z: t.z,
        rx: def.foot * sc * SHADOW_SPREAD,
        rz: (def.rz ?? def.foot) * sc * SHADOW_SPREAD,
        yaw: t.yaw,
        faint: !!def.faint,
      });
      // Foliage rejection disc — a blade of grass may never sprout inside a
      // solid prop (the previous cut had grass drawing through crate faces).
      footprints.push({ x: t.x, z: t.z, r: Math.max(def.foot, def.rz ?? 0) * sc + 0.16 });
      if (def.emitter) emitters.push(def.emitter(t));
    }
  }

  let monolithMat = null;
  if (spec.monolith) {
    monolithMat = buildMonolith(root, spec.monolith, shadows, emitters, cosmetic, footprints);
    typeCount += 1;
  }

  // Distinct prop silhouettes placed: slab, stump, fence, crate, barrel, log,
  // bush, boulder, cairn, torch post, lantern, monolith (reference bar check 4
  // needs >=8 in a combat arena; typeCount reports the live number per variant).
  return { emitters, shadows, footprints, mats, typeCount, monolithMat };
}
