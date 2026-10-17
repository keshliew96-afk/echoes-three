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
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  LinearSRGBColorSpace,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ARENA } from '../core/constants.js';
import { toonMaterial, getGradientMap } from '../render/toon.js';
import { PALETTE, VFX_MATTER } from '../data/palette.js';
import { COOL, ENV, hslColor, mix, shade } from './colors.js';
import { pathClearance } from './variants.js';
import { buildRoomDressing } from './dressing.js';
import { veinNetwork, kilnCrackNetwork } from './ground.js';

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
// Ink is Void Charcoal pulled toward the deep-indigo shadow family: charcoal
// alone is a WARM dark (h~17), and the FXAA gradient where a prop's silhouette
// line meets pool-lit ground blended through h8-25 / s0.35-0.48 — the reserved
// Ember Danger band (measured on the monolith's flank and stump edges). The
// indigo bias makes those 1-px blends pass through neutral; on screen it is
// the same storybook dark line.
const inkColor = new Color(PALETTE.voidCharcoal).lerp(new Color('#101A2C'), 0.55);
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
// entities). Deep INDIGO rather than pure black: an alpha blend lands
// dest*(1-a) + indigo*a, and that small blue floor matters — a pure-black
// multiply over warm-lit amber ground preserved the ground's hue while the
// grade's S-curve collapsed its blue at the darker value, which measured the
// whole shadow ring at h20-24 / s>0.38 (the reserved Ember Danger band).
// Cool shadows are also the painterly-correct read under a warm key.
export function makeShadowMaterial(opacity = 0.48) {
  return new MeshBasicMaterial({
    map: getContactTexture(),
    color: new Color('#101A2C'),
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
  // 32 segments, not 20: at gameplay zoom a prop's blob is ~60 px across, and
  // a 20-gon that size shows straight facets — a Round-D crop read the
  // brazier's as "a hard-edged black contact polygon" rather than as a soft
  // contact shadow. Same draw call, same instance count.
  const geo = new CircleGeometry(1, 32).rotateX(-Math.PI / 2);
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

  // --- Brazier: a squat stone-footed fire bowl (baseline-v030 F1: the
  // mid-field warm pools need an attributable emitter — this is it). Stone
  // pedestal + iron bowl + HDR coal bed; the arena mounts the flame sprite,
  // glow, ground pool and ember column on the `brazier` emitter.
  {
    // STANDING fire basket (third cut). A squat bowl — at any size — sat
    // entirely inside its own glow/bloom disc and washed into a featureless
    // tan lump, so the pool read as sourceless again (the exact F1 defect).
    // Height is what saves the torches: their dark stake extends BELOW the
    // glow core. Same trick here — a dark iron column lifts the bowl to
    // ~0.66 u, so the silhouette (column + bowl) reads against the bright
    // pool: pool -> dark stem -> dark bowl -> flame. Still well under the
    // Tank-height prop ceiling (§19.3).
    // Raised again (column 0.42 -> 0.60, bowl top 0.65 -> 0.83): at the lower
    // height the whole prop sat inside the bright core of its own pool and a
    // 4x crop read it as "a dark lump beside a light" rather than as the fire
    // that makes the light — the exact F1 failure. The taller stem lifts the
    // bowl and flame clear of the blown core, so the silhouette runs
    // pool -> dark base -> dark stem -> dark bowl -> flame. Top ~0.86 u,
    // still under the §19.3 Tank-height prop ceiling (~1.05 u).
    const footBase = new CylinderGeometry(0.21, 0.28, 0.11, 8).translate(0, 0.055, 0);
    const column = new CylinderGeometry(0.06, 0.085, 0.6, 7).translate(0, 0.4, 0);
    const bowl = new CylinderGeometry(0.29, 0.13, 0.2, 10).translate(0, 0.73, 0);
    const rim = new TorusGeometry(0.275, 0.028, 6, 16).rotateX(Math.PI / 2).translate(0, 0.83, 0);
    // Coal bed: small hot lumps in the lantern-glass HDR gold, so the bowl
    // visibly holds fire even before the flame sprite is mounted on top.
    const coals = mergeGeometries([
      new IcosahedronGeometry(0.095, 0).scale(1, 0.55, 1).translate(0, 0.82, 0),
      new IcosahedronGeometry(0.07, 0).scale(1, 0.6, 1).translate(0.095, 0.81, -0.05),
      new IcosahedronGeometry(0.064, 0).scale(1, 0.6, 1).translate(-0.075, 0.81, 0.07),
    ]);
    const footing = mergeGeometries([
      new IcosahedronGeometry(0.12, 0).scale(1, 0.5, 1).translate(0.2, 0.045, 0.07),
      new IcosahedronGeometry(0.1, 0).scale(1, 0.5, 1).translate(-0.17, 0.04, -0.1),
      new IcosahedronGeometry(0.085, 0).scale(1, 0.5, 1).translate(0.025, 0.038, 0.2),
    ]);
    T.brazier = {
      layers: [
        { geo: footBase, mat: mats.stoneCool, ink: PROP_INK_PX },
        { geo: column, mat: mats.ironDark, ink: PROP_INK_PX },
        { geo: bowl, mat: mats.ironDark, ink: PROP_INK_PX },
        { geo: rim, mat: mats.ironDark },
        { geo: coals, mat: mats.glass },
        { geo: footing, mat: mats.stoneCool, ink: DETAIL_INK_PX },
      ],
      foot: 0.38,
      faint: true, // self-illuminating: faint shadow tier
      emitter: (t) => ({ kind: 'brazier', x: t.x, y: 0.86 * (t.sy ?? t.s ?? 1), z: t.z }),
    };
  }

  // ---------------------------------------------------------------------
  // CERTIFICATION FIX ROUND 1 (A-world, check 4 "prop density"). The round-1
  // scorers measured every arena frame dressed along its TOP wall only —
  // "y>540 holds only one torch" — while REFERENCE_BAR reference D rings every
  // edge of its frame with torch towers, banners and spike barricades, and
  // reference B rings a boss arena with pillars, statues and vases. These are
  // those silhouettes, built from the same primitive-layer grammar (ink hull,
  // centred contact blob, footprint rejection) so they read as one prop set.
  // Every one stays under the ~1.05 u Tank height (§19.3).
  // ---------------------------------------------------------------------

  // --- Torch tower (reference D's lantern towers): stone footing, timber
  // post with two braces, an iron cage lantern under a peaked cap. Emits a
  // `lantern` so the arena mounts wick + halo + pool on it.
  {
    const base = new CylinderGeometry(0.2, 0.27, 0.14, 8).translate(0, 0.07, 0);
    const post = new CylinderGeometry(0.048, 0.068, 0.72, 7).translate(0, 0.14 + 0.36, 0);
    const braces = mergeGeometries([
      new BoxGeometry(0.035, 0.34, 0.035).rotateZ(0.62).translate(0.11, 0.3, 0),
      new BoxGeometry(0.035, 0.34, 0.035).rotateZ(-0.62).translate(-0.11, 0.3, 0),
    ]);
    const cage = mergeGeometries([
      new BoxGeometry(0.24, 0.03, 0.24).translate(0, 0.74, 0),
      new BoxGeometry(0.24, 0.03, 0.24).translate(0, 0.96, 0),
      ...[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => new BoxGeometry(0.022, 0.24, 0.022).translate(sx * 0.105, 0.85, sz * 0.105))
      ),
    ]);
    const glass = new BoxGeometry(0.16, 0.19, 0.16).translate(0, 0.85, 0);
    const cap = new ConeGeometry(0.18, 0.09, 4).rotateY(Math.PI / 4).translate(0, 1.0, 0);
    T.tower = {
      layers: [
        { geo: base, mat: mats.stoneCool, ink: DETAIL_INK_PX },
        { geo: post, mat: mats.bark, ink: PROP_INK_PX },
        { geo: braces, mat: mats.barkDark, ink: DETAIL_INK_PX },
        { geo: cage, mat: mats.ironDark, ink: 1.15 },
        { geo: glass, mat: mats.glass, ink: 1.15 },
        { geo: cap, mat: mats.iron, ink: DETAIL_INK_PX },
      ],
      foot: 0.3,
      faint: true,
      emitter: (t) => ({ kind: 'lantern', x: t.x, y: 0.85 * (t.sy ?? t.s ?? 1), z: t.z }),
    };
  }

  // --- Banner: pole on a stone foot, cross-arm, hanging swallow-tail cloth
  // with a trim bar top and bottom. The cloth is the COOL family (sage pulled
  // toward the indigo ambient) so a banner never borrows a reserved accent.
  {
    const pole = new CylinderGeometry(0.034, 0.05, 1.0, 7).translate(0, 0.5, 0);
    const foot = new CylinderGeometry(0.13, 0.17, 0.1, 7).translate(0, 0.05, 0);
    const arm = new BoxGeometry(0.42, 0.04, 0.04).translate(0.18, 0.95, 0);
    const flag = mergeGeometries([
      new BoxGeometry(0.34, 0.5, 0.02).translate(0.19, 0.67, 0),
      new BoxGeometry(0.12, 0.14, 0.02).translate(0.08, 0.36, 0),
      new BoxGeometry(0.12, 0.14, 0.02).translate(0.3, 0.36, 0),
    ]);
    const trim = mergeGeometries([
      new BoxGeometry(0.36, 0.05, 0.03).translate(0.19, 0.9, 0),
      new BoxGeometry(0.36, 0.035, 0.03).translate(0.19, 0.44, 0),
    ]);
    const finial = new ConeGeometry(0.045, 0.1, 6).translate(0, 1.0, 0);
    T.banner = {
      layers: [
        { geo: pole, mat: mats.bark, ink: PROP_INK_PX },
        { geo: foot, mat: mats.stone, ink: DETAIL_INK_PX },
        { geo: arm, mat: mats.bark, ink: DETAIL_INK_PX },
        { geo: flag, mat: mats.cloth, ink: PROP_INK_PX },
        { geo: trim, mat: mats.trim, ink: DETAIL_INK_PX },
        { geo: finial, mat: mats.iron, ink: DETAIL_INK_PX },
      ],
      foot: 0.26,
    };
  }

  // --- Spike barricade (cheval de frise): a log beam carrying three crossed
  // pairs of sharpened stakes with pale cut tips.
  {
    const beam = new CylinderGeometry(0.06, 0.06, 1.12, 7).rotateZ(Math.PI / 2).translate(0, 0.2, 0);
    const stakes = [];
    const tips = [];
    for (const x of [-0.4, 0, 0.4]) {
      for (const sgn of [-1, 1]) {
        stakes.push(new CylinderGeometry(0.03, 0.02, 0.8, 6).rotateX(sgn * 0.8).translate(x, 0.2, 0));
        const ty = 0.2 + 0.4 * Math.cos(0.8);
        const tz = -sgn * 0.4 * Math.sin(0.8);
        tips.push(new ConeGeometry(0.03, 0.1, 6).rotateX(sgn * 0.8).translate(x, ty + 0.03, tz - sgn * 0.01));
      }
    }
    const lash = mergeGeometries(
      [-0.4, 0, 0.4].map((x) => new TorusGeometry(0.075, 0.014, 5, 10).rotateY(Math.PI / 2).translate(x, 0.2, 0))
    );
    T.barricade = {
      layers: [
        { geo: beam, mat: mats.bark, ink: PROP_INK_PX },
        { geo: mergeGeometries(stakes), mat: mats.barkDark, ink: 1.5 },
        { geo: mergeGeometries(tips), mat: mats.stumpTop },
        { geo: lash, mat: mats.iron },
      ],
      foot: 0.64,
      rz: 0.36,
    };
  }

  // --- Stone pillar (reference B): stepped base, fluted drum, cap block and a
  // broken chunk on top. Boss-room dressing.
  {
    const base = mergeGeometries([
      new BoxGeometry(0.54, 0.08, 0.54).translate(0, 0.04, 0),
      new BoxGeometry(0.42, 0.08, 0.42).translate(0, 0.12, 0),
    ]);
    const drum = new CylinderGeometry(0.15, 0.19, 0.72, 9).translate(0, 0.52, 0);
    const flutes = mergeGeometries(
      [0, 1, 2, 3, 4].map((k) => {
        const a = (k / 5) * Math.PI * 2;
        return new BoxGeometry(0.03, 0.6, 0.025).translate(0.165, 0.5, 0).rotateY(a);
      })
    );
    const cap = new BoxGeometry(0.44, 0.1, 0.44).translate(0, 0.93, 0);
    const chunk = new IcosahedronGeometry(0.13, 0).scale(1, 0.55, 1).rotateY(0.6).translate(0.06, 1.0, 0.04);
    const crack = new BoxGeometry(0.02, 0.36, 0.03).rotateZ(0.12).translate(0.12, 0.42, 0.14);
    T.pillar = {
      layers: [
        { geo: base, mat: mats.stone, ink: PROP_INK_PX },
        { geo: drum, mat: mats.stoneLit, ink: PROP_INK_PX },
        { geo: flutes, mat: mats.stoneDark },
        { geo: cap, mat: mats.stone, ink: DETAIL_INK_PX },
        { geo: chunk, mat: mats.stoneCool, ink: 1.5 },
        { geo: crack, mat: mats.stoneDark },
      ],
      foot: 0.38,
    };
  }

  // --- Urn (reference B's vases): lathed stone vessel with a dark mouth, a
  // shoulder band and two ear handles.
  {
    const profile = [
      [0.001, 0], [0.13, 0.015], [0.18, 0.12], [0.2, 0.28], [0.16, 0.42], [0.13, 0.48], [0.16, 0.53], [0.001, 0.53],
    ].map(([x, y]) => new Vector2(x, y));
    const body = new LatheGeometry(profile, 12);
    const band = new TorusGeometry(0.175, 0.02, 5, 14).rotateX(Math.PI / 2).translate(0, 0.34, 0);
    const mouth = new CylinderGeometry(0.1, 0.1, 0.03, 10).translate(0, 0.54, 0);
    const handles = mergeGeometries([
      new TorusGeometry(0.06, 0.016, 5, 10, Math.PI).rotateZ(Math.PI / 2).translate(0.19, 0.36, 0),
      new TorusGeometry(0.06, 0.016, 5, 10, Math.PI).rotateZ(-Math.PI / 2).translate(-0.19, 0.36, 0),
    ]);
    T.urn = {
      layers: [
        { geo: body, mat: mats.stone, ink: PROP_INK_PX },
        { geo: band, mat: mats.stoneDark },
        { geo: mouth, mat: mats.stoneDark },
        { geo: handles, mat: mats.stoneLit, ink: 1.15 },
      ],
      foot: 0.26,
    };
  }

  // --- Idol (reference B's statues): a hooded stone figure on a plinth with
  // two short stone antler prongs — the Stag cult's marker, in stone only (the
  // violet stays on the Stag and the monolith).
  {
    const plinth = mergeGeometries([
      new BoxGeometry(0.6, 0.1, 0.48).translate(0, 0.05, 0),
      new BoxGeometry(0.44, 0.1, 0.36).translate(0, 0.15, 0),
    ]);
    const body = new ConeGeometry(0.23, 0.6, 8).translate(0, 0.5, 0);
    const arms = mergeGeometries([
      new BoxGeometry(0.2, 0.05, 0.06).rotateZ(0.5).translate(-0.05, 0.56, 0.16),
      new BoxGeometry(0.2, 0.05, 0.06).rotateZ(-0.5).translate(0.05, 0.56, 0.17),
    ]);
    const head = new IcosahedronGeometry(0.12, 1).translate(0, 0.82, 0.02);
    const hood = new ConeGeometry(0.17, 0.26, 8).translate(0, 0.9, -0.02);
    const prongs = mergeGeometries([
      new BoxGeometry(0.03, 0.2, 0.03).rotateZ(0.55).translate(-0.13, 0.96, 0),
      new BoxGeometry(0.03, 0.2, 0.03).rotateZ(-0.55).translate(0.13, 0.96, 0),
      new BoxGeometry(0.025, 0.09, 0.025).rotateZ(1.2).translate(-0.19, 1.0, 0),
      new BoxGeometry(0.025, 0.09, 0.025).rotateZ(-1.2).translate(0.19, 1.0, 0),
    ]);
    T.idol = {
      layers: [
        { geo: plinth, mat: mats.stone, ink: PROP_INK_PX },
        { geo: body, mat: mats.stoneCool, ink: PROP_INK_PX },
        { geo: arms, mat: mats.stoneDark, ink: DETAIL_INK_PX },
        { geo: head, mat: mats.stoneLit, ink: DETAIL_INK_PX },
        { geo: hood, mat: mats.stoneCool, ink: DETAIL_INK_PX },
        { geo: prongs, mat: mats.stoneDark, ink: 1.15 },
      ],
      foot: 0.36,
      rz: 0.3,
    };
  }

  // --- Sack: a tied grain sack for the shop's wares.
  {
    const bag = new IcosahedronGeometry(0.19, 1).scale(1, 0.78, 0.92).translate(0, 0.15, 0);
    const neck = new CylinderGeometry(0.06, 0.09, 0.09, 7).translate(0, 0.32, 0);
    const tie = new TorusGeometry(0.065, 0.014, 5, 10).rotateX(Math.PI / 2).translate(0, 0.31, 0);
    T.sack = {
      layers: [
        { geo: bag, mat: mats.canvas, ink: PROP_INK_PX },
        { geo: neck, mat: mats.canvasShade, ink: DETAIL_INK_PX },
        { geo: tie, mat: mats.iron },
      ],
      foot: 0.22,
    };
  }

  // --- The Peddler's stall (§19.3 shop room: "one dense stall cluster under a
  // single warm pooled lantern"): four posts, a plank counter with a lip,
  // tilted canvas canopy with cloth stripes and a valance, wares on the
  // counter, the peddler behind it (hat, cloak, hands) and the Shopkeep's
  // Lantern hanging off the front corner. Only the room-7 dressing places it;
  // env/dressing.js mounts the lantern FX inside the room group.
  {
    const posts = mergeGeometries(
      [-0.6, 0.6].flatMap((x) =>
        [-0.42, 0.44].map((z) => new CylinderGeometry(0.04, 0.052, 0.94, 6).translate(x, 0.47, z))
      )
    );
    const counter = new BoxGeometry(1.3, 0.42, 0.5).translate(0, 0.21, 0.22);
    const lip = new BoxGeometry(1.38, 0.05, 0.58).translate(0, 0.44, 0.22);
    const canopy = new BoxGeometry(1.52, 0.045, 1.14).rotateX(0.13).translate(0, 0.96, -0.01);
    const stripes = mergeGeometries(
      [-0.5, -0.17, 0.17, 0.5].map((x) => new BoxGeometry(0.16, 0.05, 1.12).rotateX(0.13).translate(x, 0.965, -0.01))
    );
    const valance = mergeGeometries(
      [-0.55, -0.33, -0.11, 0.11, 0.33, 0.55].map(
        (x) => new BoxGeometry(0.2, 0.13, 0.03).translate(x, 0.84, 0.55)
      )
    );
    const wares = mergeGeometries([
      new BoxGeometry(0.24, 0.18, 0.2).rotateY(0.15).translate(-0.42, 0.55, 0.22),
      new BoxGeometry(0.16, 0.12, 0.16).rotateY(-0.3).translate(-0.4, 0.7, 0.22),
      new CylinderGeometry(0.05, 0.05, 0.22, 7).translate(-0.05, 0.57, 0.14),
      new CylinderGeometry(0.045, 0.045, 0.18, 7).translate(0.06, 0.55, 0.26),
    ]);
    const jars = mergeGeometries([
      new IcosahedronGeometry(0.085, 1).translate(0.3, 0.54, 0.24),
      new IcosahedronGeometry(0.07, 1).translate(0.46, 0.53, 0.12),
      new IcosahedronGeometry(0.065, 1).translate(0.18, 0.52, 0.34),
    ]);
    const cloak = new ConeGeometry(0.21, 0.58, 8).translate(0, 0.29, -0.2);
    const head = new IcosahedronGeometry(0.105, 1).translate(0, 0.66, -0.2);
    const hat = mergeGeometries([
      new CylinderGeometry(0.25, 0.25, 0.025, 10).translate(0, 0.71, -0.2),
      new ConeGeometry(0.15, 0.16, 8).translate(0, 0.79, -0.2),
    ]);
    const hands = mergeGeometries([
      new IcosahedronGeometry(0.045, 0).translate(-0.16, 0.48, 0.02),
      new IcosahedronGeometry(0.045, 0).translate(0.16, 0.48, 0.04),
    ]);
    const hook = mergeGeometries([
      new BoxGeometry(0.03, 0.03, 0.2).translate(-0.62, 0.93, 0.5),
      new CylinderGeometry(0.008, 0.008, 0.08, 5).translate(-0.62, 0.89, 0.58),
    ]);
    const glass = new BoxGeometry(0.12, 0.15, 0.12).translate(-0.62, 0.78, 0.58);
    const lanternCap = mergeGeometries([
      new ConeGeometry(0.1, 0.07, 4).rotateY(Math.PI / 4).translate(-0.62, 0.885, 0.58),
      new BoxGeometry(0.13, 0.025, 0.13).translate(-0.62, 0.7, 0.58),
    ]);
    T.stall = {
      layers: [
        { geo: posts, mat: mats.bark, ink: PROP_INK_PX },
        { geo: counter, mat: mats.plank, ink: PROP_INK_PX },
        { geo: lip, mat: mats.plankLit, ink: DETAIL_INK_PX },
        { geo: canopy, mat: mats.canvas, ink: PROP_INK_PX },
        { geo: stripes, mat: mats.cloth, ink: DETAIL_INK_PX },
        { geo: valance, mat: mats.cloth, ink: DETAIL_INK_PX },
        { geo: wares, mat: mats.plankLit, ink: DETAIL_INK_PX },
        { geo: jars, mat: mats.stoneLit, ink: 1.15 },
        { geo: cloak, mat: mats.cloth, ink: PROP_INK_PX },
        { geo: head, mat: mats.stumpTop, ink: DETAIL_INK_PX },
        { geo: hat, mat: mats.barkDark, ink: DETAIL_INK_PX },
        { geo: hands, mat: mats.stumpTop },
        { geo: hook, mat: mats.iron },
        { geo: lanternCap, mat: mats.iron, ink: 1.15 },
        { geo: glass, mat: mats.glass, ink: 1.15 },
      ],
      foot: 0.88,
      rz: 0.68,
      faint: true,
      emitter: (t) => {
        const yaw = t.yaw ?? 0;
        const lx = -0.62;
        const lz = 0.58;
        return {
          kind: 'lantern',
          x: t.x + Math.cos(yaw) * lx + Math.sin(yaw) * lz,
          y: 0.78,
          z: t.z - Math.sin(yaw) * lx + Math.cos(yaw) * lz,
        };
      },
    };
  }

  // ---------------------------------------------------------------------
  // GAUNTLET biome props (M4b, BUILD_BRIEF §23.1). Same grammar: primitive
  // layers, ink on the masses, a footprint that covers the widest layer.
  // Sunken Mill: sluice frame, reed bed, footbridge, timber pile, rope crate,
  // mill house (amber windows = a warm pool source). Ashen Barrow: standing
  // stone, barrow gate, bone cairn, broken urn, grave slab.
  // ---------------------------------------------------------------------
  if (mats.wetWood) {
    // --- Sluice-gate frame: two posts + a lintel + a raised gate board.
    {
      const posts = mergeGeometries([
        new BoxGeometry(0.12, 1.0, 0.12).translate(-0.5, 0.5, 0),
        new BoxGeometry(0.12, 1.0, 0.12).translate(0.5, 0.5, 0),
      ]);
      const lintel = new BoxGeometry(1.24, 0.12, 0.16).translate(0, 1.0, 0);
      const board = new BoxGeometry(0.86, 0.36, 0.07).translate(0, 0.74, 0.02);
      const wheel = new TorusGeometry(0.12, 0.025, 5, 12).translate(0.62, 0.9, 0.12);
      T.sluiceframe = {
        layers: [
          { geo: posts, mat: mats.wetWood, ink: PROP_INK_PX },
          { geo: lintel, mat: mats.wetWood, ink: DETAIL_INK_PX },
          { geo: board, mat: mats.wetWoodDark, ink: DETAIL_INK_PX },
          { geo: wheel, mat: mats.iron },
        ],
        foot: 0.62,
        rz: 0.18,
      };
    }
    // --- Reed bed: a clump of tall blades + cattail heads.
    {
      const blades = mergeGeometries(
        [0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) =>
          new CylinderGeometry(0.008, 0.024, 0.56 + (k % 4) * 0.12, 3)
            .rotateZ(((k % 5) - 2) * 0.14)
            .rotateX(((k % 3) - 1) * 0.12)
            .translate(Math.cos(k * 2.4) * 0.18, 0.3 + (k % 4) * 0.06, Math.sin(k * 2.4) * 0.18)
        )
      );
      const heads = mergeGeometries(
        [0, 2, 4, 6].map((k) => new CylinderGeometry(0.03, 0.03, 0.12, 5).translate(Math.cos(k * 2.4) * 0.18, 0.66 + (k % 4) * 0.12, Math.sin(k * 2.4) * 0.18))
      );
      T.reeds = {
        layers: [
          { geo: blades, mat: mats.reed, ink: 1.15 },
          { geo: heads, mat: mats.wetWoodDark },
        ],
        foot: 0.3,
      };
    }
    // --- Footbridge: a short plank span on four stubby posts with a rail.
    {
      const deck = mergeGeometries([-0.45, -0.15, 0.15, 0.45].map((x) => new BoxGeometry(0.28, 0.05, 0.62).translate(x, 0.22, 0)));
      const posts = mergeGeometries(
        [-0.58, 0.58].flatMap((x) => [-0.3, 0.3].map((z) => new CylinderGeometry(0.045, 0.055, 0.32, 5).translate(x, 0.16, z)))
      );
      const rail = mergeGeometries([
        new BoxGeometry(1.24, 0.04, 0.04).translate(0, 0.5, 0.3),
        new CylinderGeometry(0.025, 0.025, 0.3, 4).translate(-0.58, 0.36, 0.3),
        new CylinderGeometry(0.025, 0.025, 0.3, 4).translate(0.58, 0.36, 0.3),
      ]);
      T.footbridge = {
        layers: [
          { geo: deck, mat: mats.wetWood, ink: PROP_INK_PX },
          { geo: posts, mat: mats.wetWoodDark, ink: 1.5 },
          { geo: rail, mat: mats.wetWood, ink: DETAIL_INK_PX },
        ],
        foot: 0.7,
        rz: 0.36,
      };
    }
    // --- Timber pile: stacked rotting beams with a moss cap.
    {
      const beams = mergeGeometries([
        new BoxGeometry(1.1, 0.14, 0.16).translate(0, 0.07, -0.16),
        new BoxGeometry(1.06, 0.14, 0.16).translate(0.04, 0.07, 0.02),
        new BoxGeometry(1.0, 0.14, 0.16).translate(-0.02, 0.07, 0.2),
        new BoxGeometry(1.0, 0.13, 0.15).rotateY(0.06).translate(0.02, 0.21, -0.06),
        new BoxGeometry(0.9, 0.13, 0.15).rotateY(-0.05).translate(0, 0.21, 0.12),
      ]);
      const moss = new IcosahedronGeometry(0.16, 0).scale(1.3, 0.22, 0.9).translate(-0.2, 0.3, 0.02);
      T.timberpile = {
        layers: [
          { geo: beams, mat: mats.wetWood, ink: PROP_INK_PX },
          { geo: moss, mat: mats.moss },
        ],
        foot: 0.58,
        rz: 0.3,
      };
    }
    // --- Rope crate: a crate with a coil of rope and a hook on top.
    {
      const body = new BoxGeometry(0.46, 0.4, 0.46).translate(0, 0.2, 0);
      const lid = new BoxGeometry(0.5, 0.06, 0.5).translate(0, 0.42, 0);
      const coil = mergeGeometries([
        new TorusGeometry(0.13, 0.035, 6, 14).rotateX(Math.PI / 2).translate(0.02, 0.48, 0.02),
        new TorusGeometry(0.1, 0.03, 6, 12).rotateX(Math.PI / 2).translate(0.02, 0.53, 0.02),
      ]);
      T.ropecrate = {
        layers: [
          { geo: body, mat: mats.wetWood, ink: PROP_INK_PX },
          { geo: lid, mat: mats.wetWoodDark, ink: DETAIL_INK_PX },
          { geo: coil, mat: mats.rope, ink: 1.15 },
        ],
        foot: 0.32,
      };
    }
    // --- Mill house: a squat ruined timber house with a slumped roof and two
    // AMBER WINDOWS (warm-pool emitters, §23.1 "amber windows of the mill").
    {
      const walls = new BoxGeometry(1.3, 0.8, 0.9).translate(0, 0.4, 0);
      const roof = mergeGeometries([
        new BoxGeometry(1.46, 0.07, 0.62).rotateX(0.55).translate(0, 0.96, -0.2),
        new BoxGeometry(1.46, 0.07, 0.62).rotateX(-0.55).rotateZ(0.06).translate(0, 0.94, 0.2),
      ]);
      const frame = mergeGeometries([
        new BoxGeometry(0.08, 0.84, 0.08).translate(-0.66, 0.42, 0.46),
        new BoxGeometry(0.08, 0.84, 0.08).translate(0.66, 0.42, 0.46),
        new BoxGeometry(1.36, 0.08, 0.08).translate(0, 0.8, 0.46),
      ]);
      const windows = mergeGeometries([
        new BoxGeometry(0.2, 0.22, 0.03).translate(-0.34, 0.46, 0.46),
        new BoxGeometry(0.2, 0.22, 0.03).translate(0.3, 0.5, 0.46),
      ]);
      const door = new BoxGeometry(0.26, 0.44, 0.03).translate(-0.02, 0.22, 0.462);
      T.millhouse = {
        layers: [
          { geo: walls, mat: mats.wetWood, ink: PROP_INK_PX },
          { geo: roof, mat: mats.wetWoodDark, ink: PROP_INK_PX },
          { geo: frame, mat: mats.wetWoodDark, ink: DETAIL_INK_PX },
          { geo: door, mat: mats.ironDark },
          { geo: windows, mat: mats.glass },
        ],
        foot: 0.86,
        rz: 0.6,
        faint: true,
        emitter: (t) => {
          const yaw = t.yaw ?? 0;
          const sc = t.s ?? 1;
          return { kind: 'lantern', x: t.x + Math.sin(yaw) * 0.5 * sc, y: 0.5 * (t.sy ?? sc), z: t.z + Math.cos(yaw) * 0.5 * sc };
        },
      };
    }
  }
  if (mats.boneStone) {
    // --- Standing stone: a tall weathered slab leaning a touch, a lichen band.
    {
      const slab = new BoxGeometry(0.34, 1.02, 0.2, 1, 3, 1).translate(0, 0.51, 0);
      const pos = slab.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        pos.setX(i, pos.getX(i) * (1 - y * 0.18));
        pos.setZ(i, pos.getZ(i) * (1 - y * 0.12));
      }
      slab.computeVertexNormals();
      const cap = new IcosahedronGeometry(0.16, 0).scale(1.05, 0.5, 0.7).translate(0.02, 1.02, 0);
      const band = new BoxGeometry(0.36, 0.06, 0.22).translate(0, 0.36, 0);
      const foot = mergeGeometries([
        new IcosahedronGeometry(0.12, 0).scale(1, 0.5, 1).translate(0.16, 0.04, 0.1),
        new IcosahedronGeometry(0.1, 0).scale(1, 0.5, 1).translate(-0.15, 0.04, -0.08),
      ]);
      T.standingstone = {
        layers: [
          { geo: slab, mat: mats.boneStone, ink: PROP_INK_PX },
          { geo: cap, mat: mats.boneStoneLit, ink: DETAIL_INK_PX },
          { geo: band, mat: mats.lichen },
          { geo: foot, mat: mats.boneStoneDark, ink: DETAIL_INK_PX },
        ],
        foot: 0.3,
      };
    }
    // --- Barrow gate: a grassed mound with a stone door frame over a dark mouth.
    {
      const mound = new IcosahedronGeometry(0.8, 1).scale(1.2, 0.5, 0.8).translate(0, 0.2, -0.2);
      const jambs = mergeGeometries([
        new BoxGeometry(0.18, 0.7, 0.2).translate(-0.34, 0.35, 0.42),
        new BoxGeometry(0.18, 0.7, 0.2).translate(0.34, 0.35, 0.42),
      ]);
      const lintel = new BoxGeometry(0.98, 0.18, 0.26).translate(0, 0.76, 0.42);
      const mouth = new BoxGeometry(0.5, 0.6, 0.06).translate(0, 0.3, 0.4);
      T.barrowgate = {
        layers: [
          { geo: mound, mat: mats.ochreTurf, ink: PROP_INK_PX },
          { geo: jambs, mat: mats.boneStone, ink: PROP_INK_PX },
          { geo: lintel, mat: mats.boneStoneLit, ink: PROP_INK_PX },
          { geo: mouth, mat: mats.ironDark },
        ],
        foot: 0.96,
        rz: 0.66,
      };
    }
    // --- Bone cairn: pale stones heaped with long-bone shapes.
    {
      const stones = mergeGeometries([
        new IcosahedronGeometry(0.24, 0).scale(1.1, 0.55, 0.95).translate(0, 0.12, 0),
        new IcosahedronGeometry(0.18, 0).scale(1, 0.6, 0.9).rotateY(0.6).translate(0.04, 0.3, -0.02),
        new IcosahedronGeometry(0.12, 0).scale(1, 0.7, 0.9).translate(-0.02, 0.44, 0.02),
      ]);
      // Cylinders are indexed, icosahedra are not: mergeGeometries refuses a
      // mix (returns null), so de-index the shafts first.
      const bones = mergeGeometries([
        new CylinderGeometry(0.022, 0.022, 0.36, 5).toNonIndexed().rotateZ(1.2).translate(0.1, 0.22, 0.2),
        new IcosahedronGeometry(0.04, 0).translate(0.26, 0.28, 0.2),
        new IcosahedronGeometry(0.04, 0).translate(-0.06, 0.16, 0.2),
        new CylinderGeometry(0.02, 0.02, 0.3, 5).toNonIndexed().rotateX(1.3).rotateY(0.5).translate(-0.18, 0.1, 0.02),
      ]);
      T.bonecairn = {
        layers: [
          { geo: stones, mat: mats.boneStone, ink: PROP_INK_PX },
          { geo: bones, mat: mats.boneStoneLit, ink: 1.15 },
        ],
        foot: 0.32,
      };
    }
    // --- Broken urn: a lathed pot cracked open, shards around it.
    {
      const profile = [[0.001, 0], [0.13, 0.015], [0.18, 0.12], [0.19, 0.24], [0.14, 0.3], [0.001, 0.3]].map(([x, y]) => new Vector2(x, y));
      const body = new LatheGeometry(profile, 10, 0, Math.PI * 1.35);
      const shards = mergeGeometries([
        new BoxGeometry(0.14, 0.03, 0.1).rotateY(0.6).translate(0.26, 0.02, 0.12),
        new BoxGeometry(0.1, 0.03, 0.08).rotateY(-0.4).translate(-0.24, 0.02, 0.16),
        new BoxGeometry(0.12, 0.03, 0.07).rotateY(1.2).translate(0.08, 0.02, -0.26),
      ]);
      T.brokenurn = {
        layers: [
          { geo: body, mat: mats.stone, ink: PROP_INK_PX },
          { geo: shards, mat: mats.stoneDark },
        ],
        foot: 0.3,
      };
    }
    // --- Grave slab: a lying stone slab with a carved channel and a headstone.
    {
      const slab = new BoxGeometry(0.5, 0.1, 0.9).translate(0, 0.05, 0);
      const carve = new BoxGeometry(0.06, 0.02, 0.62).translate(0, 0.11, 0);
      const head = new BoxGeometry(0.44, 0.44, 0.1).translate(0, 0.22, -0.48);
      T.graveslab = {
        layers: [
          { geo: slab, mat: mats.boneStoneDark, ink: PROP_INK_PX },
          { geo: carve, mat: mats.ironDark },
          { geo: head, mat: mats.boneStone, ink: PROP_INK_PX },
        ],
        foot: 0.5,
        rz: 0.52,
      };
    }
  }

  // ---------------------------------------------------------------------
  // Act IV — The Hollow Heart (env/biomes/heart.js): crystal spire (a light
  // source: a 'crystal' emitter), crystal cluster, geode, root arch, root
  // tangle, vein rock, ribcage, bone pile, heart polyp, fallen shard. Violet
  // crystal carries a low emissive so it reads lit from within; vein lines
  // are the monolith's pre-compensated violet (unlit, never toned).
  // ---------------------------------------------------------------------
  if (mats.crystal) {
    // A hexagonal crystal: shaft + pointed tip, sharing one transform so the
    // two layers (body / lighter tip) stay glued.
    const crystalPair = (r, h, tz, tx, x, z, ry = 0) => {
      const xf = (g) => g.rotateY(ry).rotateZ(tz).rotateX(tx).translate(x, 0, z);
      return {
        shaft: xf(new CylinderGeometry(r, r * 1.14, h, 6).translate(0, h / 2, 0)),
        tip: xf(new ConeGeometry(r, r * 2.3, 6).translate(0, h + r * 1.15, 0)),
      };
    };
    const crystalLayers = (list) => {
      const parts = list.map((a) => crystalPair(...a));
      return { shaft: mergeGeometries(parts.map((p) => p.shaft)), tip: mergeGeometries(parts.map((p) => p.tip)) };
    };
    // --- Crystal spire: a tall violet stand on a black rock socket (light).
    {
      const base = mergeGeometries([
        new IcosahedronGeometry(0.3, 0).scale(1.2, 0.42, 1).translate(0, 0.07, 0),
        new IcosahedronGeometry(0.17, 0).scale(1, 0.5, 1).translate(0.27, 0.05, 0.14),
        new IcosahedronGeometry(0.13, 0).scale(1, 0.55, 1).translate(-0.24, 0.04, -0.12),
      ]);
      const c = crystalLayers([
        [0.105, 0.74, 0.05, 0.04, 0, 0],
        [0.078, 0.48, 0.44, 0.1, 0.13, 0.05, 0.4],
        [0.072, 0.42, -0.48, -0.12, -0.12, 0.04, 1.1],
        [0.056, 0.28, 0.3, -0.6, 0.03, -0.13, 2.0],
      ]);
      T.crystalspire = {
        layers: [
          { geo: base, mat: mats.heartRock, ink: PROP_INK_PX },
          { geo: c.shaft, mat: mats.crystal, ink: PROP_INK_PX },
          { geo: c.tip, mat: mats.crystalLit, ink: DETAIL_INK_PX },
        ],
        foot: 0.36,
        faint: true,
        emitter: (t) => ({ kind: 'crystal', x: t.x, y: 0.62 * (t.sy ?? t.s ?? 1), z: t.z }),
      };
    }
    // --- Crystal cluster: a low spray of small points out of a rock.
    {
      const base = new IcosahedronGeometry(0.2, 0).scale(1.2, 0.4, 1).translate(0, 0.05, 0);
      const c = crystalLayers([
        [0.07, 0.36, 0.12, 0.05, 0, 0],
        [0.055, 0.24, 0.55, 0.15, 0.1, 0.06, 0.7],
        [0.06, 0.28, -0.5, 0.0, -0.1, 0.02, 1.9],
        [0.045, 0.16, 0.25, -0.7, 0.02, -0.1, 2.8],
        [0.04, 0.14, -0.3, 0.7, -0.04, 0.12, 4.0],
      ]);
      T.crystalcluster = {
        layers: [
          { geo: base, mat: mats.heartRock, ink: PROP_INK_PX },
          { geo: c.shaft, mat: mats.crystal, ink: PROP_INK_PX },
          { geo: c.tip, mat: mats.crystalLit, ink: DETAIL_INK_PX },
        ],
        foot: 0.28,
      };
    }
    // --- Geode: a cracked-open rock rim brimming with crystal teeth.
    {
      const rim = mergeGeometries([
        new TorusGeometry(0.27, 0.12, 5, 11).rotateX(Math.PI / 2).scale(1, 1, 0.82).translate(0, 0.1, 0),
      ]);
      const lumps = mergeGeometries([
        new IcosahedronGeometry(0.14, 0).scale(1, 0.6, 1).translate(0.36, 0.06, 0.08),
        new IcosahedronGeometry(0.12, 0).scale(1, 0.6, 1).translate(-0.3, 0.05, -0.16),
        new IcosahedronGeometry(0.1, 0).scale(1, 0.6, 1).translate(-0.06, 0.05, 0.32),
      ]);
      const teeth = [];
      for (let k = 0; k < 9; k++) {
        const a = k * 2.39996;
        const rr = k === 0 ? 0 : 0.08 + (k % 3) * 0.04;
        teeth.push([0.04 + (k % 2) * 0.015, 0.14 + ((k * 5) % 4) * 0.04, Math.cos(a) * 0.35 * (rr > 0 ? 1 : 0), Math.sin(a) * 0.35 * (rr > 0 ? 1 : 0), Math.cos(a) * rr, Math.sin(a) * rr * 0.82, a]);
      }
      const c = crystalLayers(teeth);
      const bed = new CylinderGeometry(0.22, 0.2, 0.05, 10).translate(0, 0.06, 0);
      T.geode = {
        layers: [
          { geo: rim, mat: mats.heartRock, ink: PROP_INK_PX },
          { geo: lumps, mat: mats.heartRockLit, ink: DETAIL_INK_PX },
          { geo: bed, mat: mats.crystalDeep },
          { geo: c.shaft, mat: mats.crystal, ink: 1.15 },
          { geo: c.tip, mat: mats.crystalLit },
        ],
        foot: 0.42,
        rz: 0.36,
      };
    }
    // --- Root arch: a gnarled root looping out of the stone and back in.
    {
      const arch = mergeGeometries([
        new TorusGeometry(0.46, 0.085, 6, 14, Math.PI).translate(0, -0.04, 0),
        new TorusGeometry(0.32, 0.06, 5, 12, Math.PI * 0.92).rotateY(0.5).translate(0.12, -0.03, 0.12),
      ]);
      const knots = mergeGeometries([
        new IcosahedronGeometry(0.13, 0).scale(1.2, 0.55, 1).translate(0.46, 0.04, 0),
        new IcosahedronGeometry(0.12, 0).scale(1.2, 0.55, 1).translate(-0.46, 0.04, 0),
        new IcosahedronGeometry(0.07, 0).translate(0.08, 0.43, 0.02),
      ]);
      T.rootarch = {
        layers: [
          { geo: arch, mat: mats.root, ink: PROP_INK_PX },
          { geo: knots, mat: mats.rootLit, ink: DETAIL_INK_PX },
        ],
        foot: 0.56,
        rz: 0.24,
      };
    }
    // --- Root tangle: roots crawling out of a knot and back under the stone.
    {
      const roots = [];
      for (let k = 0; k < 6; k++) {
        const a = k * 1.13 + 0.3;
        const len = 0.42 + (k % 3) * 0.14;
        const rr = 0.032 + (k % 2) * 0.016;
        roots.push(
          new CylinderGeometry(rr * 0.4, rr, len, 5)
            .rotateZ(Math.PI / 2 - 0.16 - (k % 2) * 0.1)
            .translate(len / 2 + 0.06, 0.05, 0)
            .rotateY(a)
        );
      }
      const knot = mergeGeometries([
        new IcosahedronGeometry(0.15, 0).scale(1.1, 0.6, 1).translate(0, 0.07, 0),
        new IcosahedronGeometry(0.08, 0).scale(1, 0.7, 1).translate(0.1, 0.13, 0.04),
      ]);
      T.roots = {
        layers: [
          { geo: mergeGeometries(roots), mat: mats.root, ink: 1.5 },
          { geo: knot, mat: mats.rootLit, ink: DETAIL_INK_PX },
        ],
        foot: 0.46,
      };
    }
    // --- Vein rock: a black boulder split by glowing violet veins.
    {
      const R = [0.4, 0.26, 0.35];
      const rock = new IcosahedronGeometry(1, 1).scale(R[0], R[1], R[2]).translate(0, 0.2, 0);
      const chunk = new IcosahedronGeometry(0.15, 0).scale(1, 0.62, 1).translate(0.42, 0.07, -0.16);
      const arcs = [];
      for (const [ry, tilt, a0, al] of [[0.3, 0.2, 0.25, 1.9], [1.6, -0.25, 0.4, 1.6], [2.5, 0.35, 0.9, 1.4], [-0.9, 0.0, 0.2, 1.2]]) {
        arcs.push(
          new TorusGeometry(1, 0.055, 3, 14, al)
            .rotateZ(a0)
            .rotateX(tilt)
            .rotateY(ry)
            .scale(R[0] * 1.03, R[1] * 1.05, R[2] * 1.03)
            .translate(0, 0.2, 0)
        );
      }
      T.veinrock = {
        layers: [
          { geo: rock, mat: mats.heartRock, ink: PROP_INK_PX },
          { geo: chunk, mat: mats.heartRockLit, ink: DETAIL_INK_PX },
          { geo: mergeGeometries(arcs), mat: mats.vein },
        ],
        foot: 0.42,
      };
    }
    // --- Ribcage: a long-dead thing's spine and ribs, its skull beside it.
    {
      const ribs = [new CylinderGeometry(0.028, 0.034, 0.74, 5).rotateZ(Math.PI / 2).translate(0.02, 0.05, 0)];
      for (let k = 0; k < 4; k++) {
        const x = -0.2 + k * 0.15;
        const r = 0.2 - k * 0.025;
        ribs.push(new TorusGeometry(r, 0.022, 4, 9, Math.PI * (0.78 + (k % 2) * 0.1)).rotateY(Math.PI / 2).scale(1, 0.92, 1).translate(x, 0.02, 0));
      }
      const skull = mergeGeometries([
        new IcosahedronGeometry(0.11, 1).scale(1.1, 0.9, 1).translate(-0.5, 0.1, 0.06),
        new IcosahedronGeometry(0.07, 0).scale(1.2, 0.6, 1).translate(-0.6, 0.05, 0.08),
      ]);
      const sockets = mergeGeometries([
        new IcosahedronGeometry(0.03, 0).translate(-0.6, 0.13, 0.03),
        new IcosahedronGeometry(0.03, 0).translate(-0.6, 0.13, 0.11),
      ]);
      T.ribcage = {
        layers: [
          { geo: mergeGeometries(ribs), mat: mats.bone, ink: 1.4 },
          { geo: skull, mat: mats.bone, ink: PROP_INK_PX },
          { geo: sockets, mat: mats.heartRock },
        ],
        foot: 0.44,
        rz: 0.3,
      };
    }
    // --- Bone pile: scattered long bones and a skull.
    {
      const bones = mergeGeometries([
        new CylinderGeometry(0.024, 0.024, 0.4, 5).toNonIndexed().rotateZ(Math.PI / 2).rotateY(0.4).translate(0.04, 0.03, 0.02),
        new IcosahedronGeometry(0.04, 0).translate(0.22, 0.04, -0.06),
        new IcosahedronGeometry(0.04, 0).translate(-0.14, 0.04, 0.1),
        new CylinderGeometry(0.02, 0.02, 0.32, 5).toNonIndexed().rotateZ(Math.PI / 2 - 0.25).rotateY(-0.9).translate(-0.02, 0.07, 0.04),
        new CylinderGeometry(0.02, 0.02, 0.26, 5).toNonIndexed().rotateZ(Math.PI / 2).rotateY(1.7).translate(0.1, 0.02, 0.12),
      ]);
      const skull = new IcosahedronGeometry(0.1, 1).scale(1.1, 0.88, 1).translate(-0.16, 0.08, -0.14);
      T.bonepile = {
        layers: [
          { geo: bones, mat: mats.bone, ink: 1.15 },
          { geo: skull, mat: mats.bone, ink: PROP_INK_PX },
        ],
        foot: 0.3,
      };
    }
    // --- Heart polyp: a swollen flesh pod with a violet-lit slit, rooted.
    {
      const profile = [[0.001, 0], [0.12, 0.02], [0.2, 0.13], [0.22, 0.28], [0.17, 0.44], [0.09, 0.54], [0.001, 0.58]].map(([x, y]) => new Vector2(x, y));
      const pod = new LatheGeometry(profile, 11);
      const veins = mergeGeometries(
        [0, 1, 2, 3].map((k) =>
          new BoxGeometry(0.018, 0.3, 0.018)
            .rotateX(0.3)
            .translate(0, 0.27, 0.205)
            .rotateY(k * 1.57 + 0.4)
        )
      );
      const slit = new IcosahedronGeometry(0.055, 0).scale(1, 1.4, 1).translate(0, 0.57, 0);
      const tendrils = mergeGeometries(
        [0, 1, 2, 3].map((k) =>
          new CylinderGeometry(0.012, 0.035, 0.36, 5)
            .rotateZ(Math.PI / 2 - 0.2)
            .translate(0.3, 0.04, 0)
            .rotateY(k * 1.6 + 0.8)
        )
      );
      T.polyp = {
        layers: [
          { geo: pod, mat: mats.flesh, ink: PROP_INK_PX },
          { geo: tendrils, mat: mats.fleshDark, ink: 1.15 },
          { geo: veins, mat: mats.vein },
          { geo: slit, mat: mats.vein },
        ],
        foot: 0.3,
      };
    }
    // --- Fallen shard: a broken crystal lying on its side by its stump.
    {
      const lying = crystalLayers([[0.11, 0.78, Math.PI / 2 - 0.12, 0, 0.36, 0.0, 0]]);
      // lift it so it rests on its edge instead of sinking through the floor
      lying.shaft.translate(0, 0.1, 0);
      lying.tip.translate(0, 0.1, 0);
      const stump = crystalLayers([
        [0.09, 0.18, 0.1, 0.0, -0.18, 0.12, 0.3],
        [0.05, 0.1, -0.4, 0.2, -0.3, -0.06, 1.2],
      ]);
      const chips = mergeGeometries([
        new ConeGeometry(0.035, 0.09, 5).rotateZ(1.2).translate(0.1, 0.02, 0.18),
        new ConeGeometry(0.03, 0.08, 5).rotateZ(-1.0).translate(-0.06, 0.02, -0.2),
        new ConeGeometry(0.03, 0.07, 5).rotateX(1.3).translate(0.3, 0.02, -0.16),
      ]);
      T.shardfall = {
        layers: [
          { geo: mergeGeometries([lying.shaft, stump.shaft]), mat: mats.crystal, ink: PROP_INK_PX },
          { geo: mergeGeometries([lying.tip, stump.tip]), mat: mats.crystalLit, ink: DETAIL_INK_PX },
          { geo: chips, mat: mats.crystalDeep },
        ],
        foot: 0.5,
        rz: 0.26,
      };
    }
  }

  // ---------------------------------------------------------------------
  // Act V — The Still Spire (env/biomes/spire.js): gargoyle on its perch,
  // timber bell-cage, balustrade run, fallen limestone block, column drum,
  // fallen cracked bell, rope coil, feather litter, wind-torn banner. Pale
  // weathered limestone with rime on every top face, tarnished bronze, old
  // hemp and sailcloth. All under the ~1.05 u Tank height.
  // ---------------------------------------------------------------------
  if (mats.lime) {
    // --- Gargoyle: a winged grotesque crouched on a plinth, head thrust out
    // over the floor, horns back, wings folded up behind; rime on its head.
    {
      const plinth = mergeGeometries([
        new BoxGeometry(0.5, 0.26, 0.44).translate(0, 0.13, 0),
        new BoxGeometry(0.58, 0.06, 0.52).translate(0, 0.29, 0),
      ]);
      const body = mergeMixed([
        new IcosahedronGeometry(0.17, 1).scale(1, 1.15, 0.9).rotateX(0.38).translate(0, 0.5, -0.03),
        new IcosahedronGeometry(0.09, 0).translate(0.12, 0.39, 0.02),
        new IcosahedronGeometry(0.09, 0).translate(-0.12, 0.39, 0.02),
        new IcosahedronGeometry(0.105, 1).scale(1, 0.9, 1.15).translate(0, 0.66, 0.14),
        new BoxGeometry(0.09, 0.07, 0.11).translate(0, 0.63, 0.25),
        new BoxGeometry(0.05, 0.19, 0.05).translate(0.075, 0.4, 0.17),
        new BoxGeometry(0.05, 0.19, 0.05).translate(-0.075, 0.4, 0.17),
      ]);
      const horns = mergeGeometries([
        new ConeGeometry(0.026, 0.15, 4).rotateX(-0.7).rotateZ(0.42).translate(0.065, 0.77, 0.08),
        new ConeGeometry(0.026, 0.15, 4).rotateX(-0.7).rotateZ(-0.42).translate(-0.065, 0.77, 0.08),
      ]);
      const wings = mergeGeometries([
        new BoxGeometry(0.045, 0.42, 0.26).rotateZ(-0.45).rotateX(-0.25).translate(0.18, 0.63, -0.12),
        new BoxGeometry(0.045, 0.42, 0.26).rotateZ(0.45).rotateX(-0.25).translate(-0.18, 0.63, -0.12),
        new ConeGeometry(0.055, 0.18, 4).rotateZ(-0.5).translate(0.3, 0.86, -0.16),
        new ConeGeometry(0.055, 0.18, 4).rotateZ(0.5).translate(-0.3, 0.86, -0.16),
      ]);
      const rime = mergeMixed([
        new IcosahedronGeometry(0.07, 0).scale(1.2, 0.32, 1.2).translate(0, 0.75, 0.13),
        new IcosahedronGeometry(0.06, 0).scale(1, 0.32, 1.4).translate(0.29, 0.95, -0.16),
        new IcosahedronGeometry(0.06, 0).scale(1, 0.32, 1.4).translate(-0.29, 0.95, -0.16),
        new BoxGeometry(0.52, 0.02, 0.1).translate(0, 0.325, 0.2),
      ]);
      T.gargoyle = {
        layers: [
          { geo: plinth, mat: mats.limeDark, ink: PROP_INK_PX },
          { geo: body, mat: mats.lime, ink: PROP_INK_PX },
          { geo: wings, mat: mats.limeShade, ink: DETAIL_INK_PX },
          { geo: horns, mat: mats.limeDark, ink: 1.15 },
          { geo: rime, mat: mats.rime },
        ],
        foot: 0.36,
        rz: 0.32,
      };
    }
    // --- Bell-cage: a timber frame (four posts, braces, a headstock) with a
    // small tarnished bronze bell and its rope.
    {
      const frame = mergeGeometries([
        ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => new BoxGeometry(0.06, 0.92, 0.06).translate(sx * 0.32, 0.46, sz * 0.21))),
        new BoxGeometry(0.78, 0.07, 0.07).translate(0, 0.93, 0.21),
        new BoxGeometry(0.78, 0.07, 0.07).translate(0, 0.93, -0.21),
        new BoxGeometry(0.08, 0.08, 0.52).translate(0, 0.97, 0),
        new BoxGeometry(0.04, 0.4, 0.04).rotateZ(0.7).translate(0.19, 0.76, 0.21),
        new BoxGeometry(0.04, 0.4, 0.04).rotateZ(-0.7).translate(-0.19, 0.76, 0.21),
      ]);
      const sill = new BoxGeometry(0.82, 0.07, 0.56).translate(0, 0.035, 0);
      const bell = mergeGeometries([bellLathe(0.18, 0.34, 12).translate(0, 0.52, 0), new BoxGeometry(0.06, 0.08, 0.06).translate(0, 0.9, 0)]);
      const lip = new TorusGeometry(0.17, 0.016, 5, 14).rotateX(Math.PI / 2).translate(0, 0.53, 0);
      const rope = mergeGeometries([
        new CylinderGeometry(0.011, 0.011, 0.5, 4).rotateZ(0.08).translate(0.2, 0.68, 0.0),
        new CylinderGeometry(0.02, 0.02, 0.1, 5).translate(0.22, 0.42, 0.0),
      ]);
      T.bellcage = {
        layers: [
          { geo: frame, mat: mats.timber, ink: PROP_INK_PX },
          { geo: sill, mat: mats.timberDark, ink: DETAIL_INK_PX },
          { geo: bell, mat: mats.bronze, ink: PROP_INK_PX },
          { geo: lip, mat: mats.bronzeLit },
          { geo: rope, mat: mats.hemp },
        ],
        foot: 0.44,
        rz: 0.32,
      };
    }
    // --- Balustrade run: a plinth, five vase balusters, a rail with rime
    // along it and an end pedestal.
    {
      const plinth = new BoxGeometry(1.12, 0.1, 0.26).translate(0, 0.05, 0);
      const bal = [];
      for (let k = 0; k < 5; k++) bal.push(balusterLathe().translate(-0.42 + k * 0.2, 0.1, 0));
      const rail = new BoxGeometry(1.06, 0.07, 0.28).translate(-0.06, 0.55, 0);
      const post = mergeGeometries([new BoxGeometry(0.2, 0.6, 0.24).translate(0.6, 0.3, 0), new BoxGeometry(0.26, 0.06, 0.3).translate(0.6, 0.63, 0)]);
      const rime = mergeGeometries([new BoxGeometry(0.9, 0.018, 0.14).translate(-0.12, 0.59, 0), new BoxGeometry(0.2, 0.02, 0.2).translate(0.6, 0.67, 0)]);
      T.balustrade = {
        layers: [
          { geo: plinth, mat: mats.limeDark, ink: DETAIL_INK_PX },
          { geo: mergeGeometries(bal), mat: mats.lime, ink: 1.15 },
          { geo: rail, mat: mats.limeLit, ink: PROP_INK_PX },
          { geo: post, mat: mats.lime, ink: PROP_INK_PX },
          { geo: rime, mat: mats.rime },
        ],
        foot: 0.62,
        rz: 0.2,
      };
    }
    // --- Fallen limestone block: two cut stones tumbled together, a chip,
    // rime caught on the top faces.
    {
      const a = new BoxGeometry(0.52, 0.32, 0.38).rotateZ(0.08).rotateY(0.3).translate(0, 0.16, 0);
      const b = new BoxGeometry(0.34, 0.24, 0.3).rotateZ(0.5).rotateY(-0.4).translate(0.36, 0.13, 0.14);
      const chip = mergeGeometries([new IcosahedronGeometry(0.08, 0).scale(1, 0.6, 1).translate(-0.32, 0.04, 0.16), new IcosahedronGeometry(0.06, 0).scale(1, 0.6, 1).translate(0.12, 0.03, 0.3)]);
      const rime = mergeGeometries([new BoxGeometry(0.42, 0.02, 0.26).rotateZ(0.08).rotateY(0.3).translate(-0.02, 0.33, 0)]);
      T.limeblock = {
        layers: [
          { geo: a, mat: mats.lime, ink: PROP_INK_PX },
          { geo: b, mat: mats.limeShade, ink: PROP_INK_PX },
          { geo: chip, mat: mats.limeDark, ink: 1.15 },
          { geo: rime, mat: mats.rime },
        ],
        foot: 0.42,
      };
    }
    // --- Column drum: a fluted drum fallen on its side and a short one still
    // standing, a capital chunk.
    {
      const lying = new CylinderGeometry(0.2, 0.2, 0.46, 10).rotateZ(Math.PI / 2).translate(0, 0.2, 0);
      const standing = new CylinderGeometry(0.18, 0.19, 0.24, 10).translate(0.38, 0.12, 0.2);
      const cap = new BoxGeometry(0.3, 0.1, 0.3).rotateY(0.4).rotateX(0.2).translate(-0.34, 0.06, 0.18);
      const rime = new CylinderGeometry(0.17, 0.17, 0.02, 10).translate(0.38, 0.25, 0.2);
      T.drum = {
        layers: [
          { geo: lying, mat: mats.lime, ink: PROP_INK_PX },
          { geo: mergeGeometries([0, 1, 2, 3, 4, 5].map((k) => new BoxGeometry(0.47, 0.03, 0.03).translate(0, 0.2, 0).rotateX((k / 6) * Math.PI * 2).translate(0, 0.2, 0))), mat: mats.limeShade },
          { geo: standing, mat: mats.limeLit, ink: PROP_INK_PX },
          { geo: cap, mat: mats.limeDark, ink: DETAIL_INK_PX },
          { geo: rime, mat: mats.rime },
        ],
        foot: 0.44,
        rz: 0.3,
      };
    }
    // --- Fallen bell: a small cracked bronze bell lying tipped on its
    // shoulder, its dark mouth turned up, beside the broken yoke beam.
    {
      const bell = bellLathe(0.26, 0.46, 12).rotateZ(1.25).translate(0.06, 0.24, 0);
      const mouth = new CircleGeometry(0.22, 14).rotateY(-Math.PI / 2).rotateZ(1.25 - Math.PI / 2).translate(0.32, 0.36, 0);
      const crack = mergeGeometries([
        new BoxGeometry(0.03, 0.22, 0.018).rotateZ(1.25 + 0.3).translate(0.0, 0.33, 0.2),
        new BoxGeometry(0.025, 0.12, 0.018).rotateZ(0.4).translate(-0.1, 0.3, 0.21),
      ]);
      const yoke = mergeGeometries([
        new BoxGeometry(0.62, 0.09, 0.1).rotateY(0.5).rotateZ(0.06).translate(-0.24, 0.05, -0.24),
        new BoxGeometry(0.08, 0.2, 0.08).rotateZ(1.0).translate(-0.48, 0.05, -0.08),
      ]);
      T.fallenbell = {
        layers: [
          { geo: bell, mat: mats.bronze, ink: PROP_INK_PX },
          { geo: mouth, mat: mats.bronzeDeep },
          { geo: crack, mat: mats.bronzeDeep },
          { geo: yoke, mat: mats.timber, ink: DETAIL_INK_PX },
        ],
        foot: 0.36,
      };
    }
    // --- Rope coil: old belfry rope coiled on the floor, a frayed tail.
    {
      const coil = mergeGeometries([
        new TorusGeometry(0.14, 0.034, 5, 14).rotateX(Math.PI / 2).translate(0, 0.034, 0),
        new TorusGeometry(0.115, 0.032, 5, 14).rotateX(Math.PI / 2).translate(0.01, 0.09, 0),
        new TorusGeometry(0.09, 0.03, 5, 12).rotateX(Math.PI / 2).translate(0.0, 0.14, 0.01),
      ]);
      const tail = mergeGeometries([
        new CylinderGeometry(0.026, 0.03, 0.42, 5).rotateZ(Math.PI / 2 - 0.05).rotateY(0.6).translate(0.24, 0.03, 0.14),
        new ConeGeometry(0.045, 0.08, 5).rotateZ(-Math.PI / 2).rotateY(0.6).translate(0.43, 0.03, 0.27),
      ]);
      T.ropecoil = {
        layers: [
          { geo: coil, mat: mats.hemp, ink: DETAIL_INK_PX },
          { geo: tail, mat: mats.hempDark, ink: 1.15 },
        ],
        foot: 0.24,
      };
    }
    // --- Feather litter: a drift of fallen feathers round a tuft of down.
    {
      const fth = (len, x, z, ry, tilt) =>
        new IcosahedronGeometry(1, 1).scale(len * 0.5, 0.012, len * 0.13).rotateZ(tilt).rotateY(ry).translate(x, 0.02 + Math.abs(tilt) * len * 0.3, z);
      const pale = mergeGeometries([fth(0.26, 0, 0, 0.3, 0.12), fth(0.22, 0.12, 0.1, 1.9, -0.08), fth(0.2, -0.14, 0.06, 2.6, 0.1), fth(0.18, 0.04, -0.14, 4.1, 0.06)]);
      const dark = mergeGeometries([fth(0.24, -0.06, -0.08, 5.2, -0.1), fth(0.16, 0.16, -0.04, 0.9, 0.14)]);
      const down = new IcosahedronGeometry(0.05, 1).scale(1, 0.5, 1).translate(0.02, 0.03, 0.02);
      T.featherpile = {
        layers: [
          { geo: pale, mat: mats.feather, ink: 1.0 },
          { geo: dark, mat: mats.featherDark, ink: 1.0 },
          { geo: down, mat: mats.feather },
        ],
        foot: 0.24,
      };
    }
    // --- Wind-torn banner: pole on a limestone foot, a cross-arm and a
    // sailcloth banner torn to streamers, every one blown the same way.
    {
      const pole = new CylinderGeometry(0.03, 0.045, 1.0, 7).translate(0, 0.5, 0);
      const foot = new BoxGeometry(0.24, 0.1, 0.24).translate(0, 0.05, 0);
      const arm = new BoxGeometry(0.06, 0.04, 0.4).translate(0, 0.95, 0);
      const strips = [];
      [[0.5, 0.92, 0.12, 0.06], [0.42, 0.8, 0.02, -0.12], [0.32, 0.68, -0.1, 0.14], [0.24, 0.58, 0.14, -0.04]].forEach(([len, y, z, tilt]) => {
        strips.push(new BoxGeometry(len, 0.11, 0.016).rotateY(0.3).rotateZ(-0.16 + tilt).translate(len / 2 + 0.03, y - len * 0.1, z));
      });
      const trim = new BoxGeometry(0.035, 0.36, 0.03).translate(0.04, 0.78, 0.02);
      T.spirebanner = {
        layers: [
          { geo: pole, mat: mats.timber, ink: PROP_INK_PX },
          { geo: foot, mat: mats.lime, ink: DETAIL_INK_PX },
          { geo: arm, mat: mats.timber, ink: DETAIL_INK_PX },
          { geo: mergeGeometries(strips), mat: mats.slateCloth, ink: DETAIL_INK_PX },
          { geo: trim, mat: mats.sail },
        ],
        foot: 0.26,
      };
    }
  }
  // ---------------------------------------------------------------------
  // The Ember Kiln (env/biomes/kiln.js): fire-brick stack on a pallet, clay
  // bell mould on its sand bed, a half-cast bell cooling in sand (its sand
  // line still gold-hot), slag heap with hot cracks, coal heap with banked
  // crimson coals and a shovel, tool rack (tongs, rake, ladle), rack of
  // glazed tiles, crucible with its melt, clay heap with a spade. Low-chroma
  // brick, clay and slag bodies; the heat is KILN GOLD and the coals deep
  // CRIMSON, unlit (never Ember). All under the ~1.05 u Tank height.
  // ---------------------------------------------------------------------
  if (mats.kbrick) {
    // --- Brick stack: fire bricks stacked crosswise on a timber pallet, the
    // top course half gone, a few bricks scorched black.
    {
      const BL = 0.38;
      const BH = 0.095;
      const BD = 0.18;
      const lit = [];
      const plain = [];
      const burnt = [];
      let n = 0;
      for (let L = 0; L < 4; L++) {
        const y = 0.07 + BH / 2 + L * BH;
        for (let i = 0; i < 4; i++) {
          if (L === 3 && (i === 1 || i === 2)) continue;
          const g =
            L % 2 === 0
              ? new BoxGeometry(BL, BH * 0.96, BD).translate((i < 2 ? -1 : 1) * (BL / 2 + 0.005), y, (i % 2 ? 1 : -1) * (BD / 2 + 0.005))
              : new BoxGeometry(BD, BH * 0.96, BL).translate(-0.29 + i * 0.195, y, 0);
          n += 1;
          (n % 5 === 0 ? burnt : n % 3 === 0 ? lit : plain).push(g);
        }
      }
      // Two loose bricks leaning on the stack and lying at its foot.
      burnt.push(new BoxGeometry(BL, BH, BD).rotateZ(0.9).translate(0.5, 0.17, 0.12));
      lit.push(new BoxGeometry(BL, BH, BD).rotateY(0.7).translate(-0.34, 0.05, 0.36));
      const pallet = mergeGeometries([
        new BoxGeometry(0.86, 0.035, 0.46).translate(0, 0.055, 0),
        ...[-0.36, 0, 0.36].map((x) => new BoxGeometry(0.08, 0.04, 0.46).translate(x, 0.02, 0)),
      ]);
      T.brickstack = {
        layers: [
          { geo: mergeGeometries(plain), mat: mats.kbrick, ink: PROP_INK_PX },
          { geo: mergeGeometries(lit), mat: mats.kbrickLit, ink: DETAIL_INK_PX },
          { geo: mergeGeometries(burnt), mat: mats.kbrickDark, ink: DETAIL_INK_PX },
          { geo: pallet, mat: mats.ktimberDark, ink: 1.15 },
        ],
        foot: 0.5,
        rz: 0.32,
      };
    }
    // --- Mould: a clay bell mould (the cope) on a sand bed, iron bands round
    // it, the sprue cup on top, dry cracks in the clay.
    {
      const prof = [[0.001, 0.66], [0.07, 0.65], [0.15, 0.6], [0.22, 0.5], [0.27, 0.36], [0.3, 0.2], [0.33, 0.05], [0.34, 0.0], [0.001, 0.0]];
      const cope = new LatheGeometry(prof.map(([x, y]) => new Vector2(x, y)), 14).translate(0, 0.05, 0);
      const bands = mergeGeometries([
        new TorusGeometry(0.32, 0.022, 4, 16).rotateX(Math.PI / 2).translate(0, 0.16, 0),
        new TorusGeometry(0.255, 0.02, 4, 16).rotateX(Math.PI / 2).translate(0, 0.44, 0),
      ]);
      const cup = mergeGeometries([new CylinderGeometry(0.08, 0.05, 0.1, 9).translate(0, 0.74, 0), new CylinderGeometry(0.025, 0.025, 0.08, 6).translate(0.1, 0.68, 0.02)]);
      const sand = new IcosahedronGeometry(0.46, 1).scale(1, 0.12, 1).translate(0, 0.03, 0);
      const cracks = mergeGeometries([
        new BoxGeometry(0.018, 0.2, 0.02).rotateZ(0.25).translate(0.06, 0.32, 0.27),
        new BoxGeometry(0.016, 0.12, 0.02).rotateZ(-0.4).translate(-0.12, 0.4, 0.22),
        new BoxGeometry(0.02, 0.16, 0.02).rotateZ(0.1).rotateY(1.9).translate(-0.27, 0.22, -0.08),
      ]);
      T.mould = {
        layers: [
          { geo: cope, mat: mats.clay, ink: PROP_INK_PX },
          { geo: bands, mat: mats.kiron, ink: 1.15 },
          { geo: cup, mat: mats.clayDark, ink: 1.15 },
          { geo: sand, mat: mats.sand },
          { geo: cracks, mat: mats.clayDark },
        ],
        foot: 0.44,
      };
    }
    // --- Cooling bell: a half-cast bronze bell standing mouth-down in a
    // mound of casting sand, its canons up; where it meets the sand the metal
    // is still gold-hot (unlit KILN GOLD), cooling to bronze above.
    {
      const R = 0.25;
      const Hh = 0.46;
      const y0 = -0.1;
      const bell = mergeGeometries([bellLathe(R, Hh, 14).translate(0, y0, 0), new BoxGeometry(0.06, 0.07, 0.05).translate(0, y0 + Hh + 0.03, 0)]);
      const canons = mergeGeometries([
        new TorusGeometry(0.045, 0.014, 4, 10, Math.PI).translate(0.03, y0 + Hh + 0.04, 0),
        new TorusGeometry(0.045, 0.014, 4, 10, Math.PI).rotateY(Math.PI / 2).translate(0, y0 + Hh + 0.04, 0.03),
      ]);
      const sandY = 0.1;
      const tS = (sandY - y0) / Hh;
      const ring = new TorusGeometry(bellRadiusAt(R, tS) * 1.02, 0.016, 4, 18).rotateX(Math.PI / 2).translate(0, sandY + 0.004, 0);
      const band = new TorusGeometry(bellRadiusAt(R, tS + 0.07) * 1.01, 0.012, 4, 18).rotateX(Math.PI / 2).translate(0, sandY + Hh * 0.07, 0);
      const sand = mergeMixed([new IcosahedronGeometry(0.4, 1).scale(1, 0.3, 1).translate(0, 0.0, 0), new IcosahedronGeometry(0.14, 0).scale(1, 0.5, 1).translate(0.3, 0.02, 0.18)]);
      T.coolbell = {
        layers: [
          { geo: sand, mat: mats.sand, ink: 1.15 },
          { geo: bell, mat: mats.kbronze, ink: PROP_INK_PX },
          { geo: canons, mat: mats.kbronzeLit, ink: 1.0 },
          { geo: band, mat: mats.kbronzeLit },
          { geo: ring, mat: mats.heat },
        ],
        foot: 0.4,
      };
    }
    // --- Slag heap: raked-out slag in black glassy lumps, a pale crust on
    // the crowns, a few hot cracks (gold) and banked coals (crimson) inside.
    {
      const body = mergeGeometries([
        lumpyGeo(0.36, 1, 1.2, 0.62, 1.0, 0.22, 2.3).translate(0, 0.16, 0),
        lumpyGeo(0.22, 1, 1.1, 0.7, 1.0, 0.25, 4.1).translate(0.38, 0.1, 0.16),
        lumpyGeo(0.18, 0, 1.0, 0.6, 1.1, 0.2, 1.3).translate(-0.36, 0.07, -0.14),
      ]);
      const crust = mergeGeometries([
        lumpyGeo(0.2, 0, 1.2, 0.35, 1.0, 0.2, 5.7).translate(-0.05, 0.36, -0.04),
        lumpyGeo(0.1, 0, 1.0, 0.4, 1.0, 0.2, 3.1).translate(0.4, 0.22, 0.14),
      ]);
      const hot = mergeGeometries([
        new BoxGeometry(0.2, 0.02, 0.022).rotateY(0.4).rotateZ(-0.3).translate(0.12, 0.33, 0.2),
        new BoxGeometry(0.14, 0.02, 0.02).rotateY(-0.8).rotateZ(0.5).translate(-0.18, 0.26, 0.22),
        new BoxGeometry(0.1, 0.018, 0.018).rotateY(1.2).rotateZ(0.2).translate(0.42, 0.2, 0.26),
      ]);
      const coals = mergeGeometries([
        new IcosahedronGeometry(0.04, 0).translate(0.22, 0.05, 0.36),
        new IcosahedronGeometry(0.035, 0).translate(-0.3, 0.05, 0.12),
        new IcosahedronGeometry(0.03, 0).translate(0.02, 0.04, 0.4),
      ]);
      T.slagheap = {
        layers: [
          { geo: body, mat: mats.slag, ink: PROP_INK_PX },
          { geo: crust, mat: mats.slagLit, ink: 1.0 },
          { geo: hot, mat: mats.heat },
          { geo: coals, mat: mats.coalGlow },
        ],
        foot: 0.5,
        rz: 0.4,
      };
    }
    // --- Coal heap: soot-black coal in a heap, a few banked crimson coals
    // glowing in it, a shovel stuck in the top.
    {
      const lumps = [];
      for (let i = 0; i < 9; i++) {
        const a = i * 2.39;
        const d = (i % 3) * 0.11 + 0.04;
        lumps.push(new IcosahedronGeometry(0.11 - (i % 3) * 0.015, 0).translate(Math.cos(a) * d * 1.6, 0.08 + (2 - (i % 3)) * 0.06, Math.sin(a) * d * 1.3));
      }
      lumps.push(new IcosahedronGeometry(0.3, 1).scale(1.2, 0.5, 1).translate(0, 0.06, 0));
      const glow = mergeGeometries([
        new IcosahedronGeometry(0.05, 0).translate(0.16, 0.12, 0.2),
        new IcosahedronGeometry(0.045, 0).translate(-0.18, 0.1, 0.18),
        new IcosahedronGeometry(0.04, 0).translate(0.02, 0.2, 0.12),
        new IcosahedronGeometry(0.035, 0).translate(0.3, 0.05, 0.02),
      ]);
      const shovel = mergeGeometries([
        new CylinderGeometry(0.018, 0.02, 0.62, 5).rotateZ(-0.5).translate(-0.12, 0.42, -0.04),
        new BoxGeometry(0.05, 0.03, 0.08).rotateZ(-0.5).translate(-0.27, 0.69, -0.04),
      ]);
      const blade = new BoxGeometry(0.16, 0.2, 0.025).rotateZ(-0.5).translate(0.06, 0.16, -0.04);
      T.coalheap = {
        layers: [
          { geo: mergeGeometries(lumps), mat: mats.soot, ink: PROP_INK_PX },
          { geo: glow, mat: mats.coalGlow },
          { geo: shovel, mat: mats.ktimber, ink: 1.15 },
          { geo: blade, mat: mats.kiron, ink: 1.15 },
        ],
        foot: 0.4,
      };
    }
    // --- Tool rack: a timber A-frame with the kiln's long iron tools hung on
    // it — tongs, a rake, a casting ladle.
    {
      const frame = mergeGeometries([
        new BoxGeometry(0.06, 0.92, 0.06).rotateX(0.18).translate(-0.4, 0.45, 0.06),
        new BoxGeometry(0.06, 0.92, 0.06).rotateX(0.18).translate(0.4, 0.45, 0.06),
        new BoxGeometry(0.06, 0.92, 0.06).rotateX(-0.18).translate(-0.4, 0.45, -0.1),
        new BoxGeometry(0.06, 0.92, 0.06).rotateX(-0.18).translate(0.4, 0.45, -0.1),
        new BoxGeometry(0.96, 0.06, 0.07).translate(0, 0.86, -0.02),
      ]);
      const tools = mergeGeometries([
        // tongs: two crossed jaws
        new BoxGeometry(0.025, 0.78, 0.02).rotateZ(0.06).translate(-0.24, 0.45, 0.06),
        new BoxGeometry(0.025, 0.78, 0.02).rotateZ(-0.06).translate(-0.18, 0.45, 0.06),
        new BoxGeometry(0.1, 0.03, 0.02).translate(-0.21, 0.08, 0.06),
        // rake
        new CylinderGeometry(0.014, 0.014, 0.82, 5).translate(0.04, 0.46, 0.06),
        new BoxGeometry(0.24, 0.05, 0.03).translate(0.04, 0.06, 0.06),
        // ladle
        new CylinderGeometry(0.014, 0.014, 0.66, 5).translate(0.26, 0.52, 0.06),
        new SphereGeometry(0.08, 8, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0.26, 0.16, 0.06),
      ]);
      T.toolrack = {
        layers: [
          { geo: frame, mat: mats.ktimber, ink: PROP_INK_PX },
          { geo: tools, mat: mats.kiron, ink: 1.15 },
        ],
        foot: 0.46,
        rz: 0.22,
      };
    }
    // --- Tile rack: a timber drying rack, three shelves of glazed tiles
    // standing in slots — slate blue, cream, ochre, deep teal.
    {
      const frame = mergeGeometries([
        ...[-0.44, 0.44].flatMap((x) => [-0.13, 0.13].map((z) => new BoxGeometry(0.05, 0.9, 0.05).translate(x, 0.45, z))),
        ...[0.08, 0.38, 0.68].map((y) => new BoxGeometry(0.94, 0.03, 0.3).translate(0, y, 0)),
        new BoxGeometry(0.96, 0.05, 0.05).translate(0, 0.9, -0.13),
      ]);
      const glazes = [[], [], [], []];
      [0.08, 0.38, 0.68].forEach((y, row) => {
        for (let k = 0; k < 7; k++) {
          const c = (k + row * 2 + (k > 3 ? 1 : 0)) % 4;
          glazes[c].push(new BoxGeometry(0.1, 0.17, 0.022).rotateX(-0.12).translate(-0.36 + k * 0.12, y + 0.1, 0.02 + (k % 2) * 0.02));
        }
      });
      T.tilerack = {
        layers: [
          { geo: frame, mat: mats.ktimber, ink: PROP_INK_PX },
          { geo: mergeGeometries(glazes[0]), mat: mats.glazeBlue, ink: 1.0 },
          { geo: mergeGeometries(glazes[1]), mat: mats.glazeCream, ink: 1.0 },
          { geo: mergeGeometries(glazes[2]), mat: mats.glazeOchre, ink: 1.0 },
          { geo: mergeGeometries(glazes[3]), mat: mats.glazeTeal, ink: 1.0 },
        ],
        foot: 0.5,
        rz: 0.22,
      };
    }
    // --- Crucible: a clay crucible on a brick plinth, its melt still gold,
    // a dark crust ring on the melt, tongs leaning on it.
    {
      const plinth = mergeGeometries([new BoxGeometry(0.42, 0.14, 0.42).translate(0, 0.07, 0), new BoxGeometry(0.3, 0.05, 0.3).translate(0, 0.165, 0)]);
      const pot = new LatheGeometry([[0.001, 0], [0.11, 0], [0.15, 0.06], [0.17, 0.22], [0.16, 0.34], [0.13, 0.36], [0.12, 0.33]].map(([x, y]) => new Vector2(x, y)), 12).translate(0, 0.19, 0);
      const melt = new CylinderGeometry(0.12, 0.12, 0.02, 12).translate(0, 0.5, 0);
      const crust = new TorusGeometry(0.1, 0.02, 4, 12).rotateX(Math.PI / 2).translate(0, 0.51, 0);
      const tongs = mergeGeometries([new BoxGeometry(0.02, 0.6, 0.02).rotateZ(0.42).translate(0.3, 0.28, 0.1), new BoxGeometry(0.02, 0.6, 0.02).rotateZ(0.5).translate(0.32, 0.28, 0.14)]);
      T.crucible = {
        layers: [
          { geo: plinth, mat: mats.kbrick, ink: PROP_INK_PX },
          { geo: pot, mat: mats.clayDark, ink: PROP_INK_PX },
          { geo: melt, mat: mats.heat },
          { geo: crust, mat: mats.slag },
          { geo: tongs, mat: mats.kiron, ink: 1.0 },
        ],
        foot: 0.32,
      };
    }
    // --- Clay heap: lumps of wet clay, a few green (unfired) bricks drying
    // beside it and a spade.
    {
      const clay = mergeGeometries([
        lumpyGeo(0.3, 1, 1.2, 0.55, 1.0, 0.2, 3.3).translate(0, 0.12, 0),
        lumpyGeo(0.17, 1, 1.0, 0.6, 1.1, 0.2, 6.1).translate(0.3, 0.07, 0.16),
      ]);
      const wet = lumpyGeo(0.14, 0, 1.2, 0.5, 1.0, 0.2, 1.9).translate(-0.12, 0.26, 0.04);
      const green = mergeGeometries([
        new BoxGeometry(0.3, 0.08, 0.14).translate(-0.34, 0.04, 0.26),
        new BoxGeometry(0.3, 0.08, 0.14).translate(-0.34, 0.04, 0.42),
        new BoxGeometry(0.3, 0.08, 0.14).rotateY(0.2).translate(-0.34, 0.12, 0.34),
      ]);
      const spade = mergeGeometries([new CylinderGeometry(0.016, 0.018, 0.6, 5).rotateZ(0.4).rotateX(-0.2).translate(0.16, 0.42, -0.06), new BoxGeometry(0.05, 0.03, 0.08).rotateZ(0.4).translate(0.29, 0.69, -0.12)]);
      const blade = new BoxGeometry(0.14, 0.18, 0.02).rotateZ(0.4).translate(0.03, 0.14, -0.02);
      T.clayheap = {
        layers: [
          { geo: clay, mat: mats.clay, ink: PROP_INK_PX },
          { geo: wet, mat: mats.clayDark },
          { geo: green, mat: mats.clayPale, ink: 1.0 },
          { geo: spade, mat: mats.ktimber, ink: 1.0 },
          { geo: blade, mat: mats.kiron, ink: 1.0 },
        ],
        foot: 0.44,
      };
    }
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
// Red 0.88 (was 1.05): where the vein glow FEATHERS over dark stone (and the
// vignette dims it further, display L 40-60) the grade crushes the blue
// channel ~2x harder than the red, and the old red-heavier violet measured
// h6-14 / s0.36-0.44 dark MAROON along the monolith's flank — inside the
// reserved Ember band. Blue-leaning violet keeps the bright cores in the
// analyzer's violet band while the dim feather falls to neutral mauve.
export const VEIN_VIOLET = [0.88, 0.72, 1.95];
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
// GAUNTLET tells (M4b): the same vein grammar as the monolith (God-stuff Violet
// geometry bars at a pre-compensated linear tone + an emissive under-glow),
// on the act's own corrupted object. Each pushes a `monolith` emitter so the
// arena mounts the violet halo + underglow pool on it.
function veinMaterial(gain = 1) {
  const m = new MeshBasicMaterial({ toneMapped: false });
  m.color.setRGB(VEIN_LINEAR[0] * gain, VEIN_LINEAR[1] * gain, VEIN_LINEAR[2] * gain, LinearSRGBColorSpace);
  return m;
}

function buildMillWheel(root, [x, z, yaw], shadows, emitters, cosmetic, footprints, mats) {
  const R = 0.95;
  const g = new Mesh(
    mergeGeometries([
      new TorusGeometry(R, 0.07, 6, 24),
      new TorusGeometry(R * 0.36, 0.06, 5, 14),
      ...[0, 1, 2, 3, 4, 5].map((k) => new BoxGeometry(0.07, R * 1.9, 0.08).rotateZ((k / 6) * Math.PI)),
    ]).translate(0, R + 0.02, 0),
    new MeshToonMaterial({
      color: new Color(ENV.monolith).lerp(new Color(ENV.bark), 0.35),
      gradientMap: getGradientMap(),
      emissive: new Color(PALETTE.godstuffViolet),
      emissiveIntensity: 0.12, // a faint under-glow; the vein bars carry the read
    })
  );
  g.position.set(x, 0, z);
  g.rotation.set(0, yaw, 0.08);
  addPropInk(g);
  root.add(g);
  // Paddles around the rim (a few broken off).
  const paddles = [];
  for (let k = 0; k < 12; k++) {
    if (k % 5 === 3) continue;
    const a = (k / 12) * Math.PI * 2;
    paddles.push(new BoxGeometry(0.1, 0.24, 0.34).rotateZ(a).translate(Math.cos(a) * (R + 0.08), R + 0.02 + Math.sin(a) * (R + 0.08), 0));
  }
  const pm = new Mesh(mergeGeometries(paddles), mats.wetWoodDark ?? mats.barkDark);
  pm.position.copy(g.position);
  pm.rotation.copy(g.rotation);
  addPropInk(pm, 1.5);
  root.add(pm);
  // Veins: thin bars creeping out along three spokes and a few rim cracks —
  // the monolith's vein AREA, not more (a wheel-full of bright bars blooms
  // into a violet fog over half the frame).
  const bars = [];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.4;
    const len = cosmetic.range(0.45, 0.7) * R;
    bars.push(new BoxGeometry(0.018, len, 0.02).translate(0, len / 2 + 0.05, 0.06).rotateZ(a + cosmetic.range(-0.05, 0.05)));
  }
  for (let k = 0; k < 4; k++) {
    const a = cosmetic.range(0, Math.PI * 2);
    bars.push(new BoxGeometry(0.14, 0.018, 0.02).rotateZ(a + Math.PI / 2).translate(Math.cos(a) * R, Math.sin(a) * R, 0.08));
  }
  const veins = new Mesh(mergeGeometries(bars).translate(0, R + 0.02, 0), veinMaterial(0.85));
  veins.position.copy(g.position);
  veins.rotation.copy(g.rotation);
  veins.renderOrder = 2;
  root.add(veins);
  // Axle post + sunk base.
  const base = new Mesh(new BoxGeometry(0.5, 0.22, 0.5).translate(0, 0.11, 0), toonMaterial({ color: ENV.monolithBase }));
  base.position.set(x, 0, z);
  base.rotation.y = yaw;
  addPropInk(base);
  root.add(base);
  shadows.push({ x, z, rx: 1.1, rz: 0.5, yaw });
  footprints.push({ x, z, r: 1.1 });
  emitters.push({ kind: 'monolith', x, y: R + 0.1, z });
  // No emissive-map on this timber, so the arena's vein "breath" (it drives the
  // returned material to ~1.9) would light the WHOLE wheel: hand it the vein
  // bars' own material instead (a basic material — the breath is a no-op) and
  // let the halo carry the pulse.
  return veins.material;
}

function buildVeinStones(root, [x, z, yaw], shadows, emitters, cosmetic, footprints, mats, types) {
  // Three standing stones in an arc; the centre one veined (the one tell).
  const offs = [[-0.72, 0.1, 0.9], [0, -0.1, 1.2], [0.74, 0.12, 0.95]];
  let mat = null;
  offs.forEach(([ox, oz, h], i) => {
    const px = x + Math.cos(yaw) * ox + Math.sin(yaw) * oz;
    const pz = z - Math.sin(yaw) * ox + Math.cos(yaw) * oz;
    const geo = new BoxGeometry(0.4, h, 0.24, 1, 3, 1).translate(0, h / 2, 0);
    const pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const y = pos.getY(k) / h;
      pos.setX(k, pos.getX(k) * (1 - y * 0.2));
    }
    geo.computeVertexNormals();
    const m = new MeshToonMaterial({
      color: new Color(i === 1 ? ENV.monolith : mats.boneStone ? mats.boneStone.color : ENV.stone),
      gradientMap: getGradientMap(),
      emissive: new Color(PALETTE.godstuffViolet),
      emissiveIntensity: i === 1 ? 0.14 : 0,
    });
    const mesh = new Mesh(geo, m);
    mesh.position.set(px, 0, pz);
    mesh.rotation.set(0, yaw + (i - 1) * 0.25, (i - 1) * 0.05);
    addPropInk(mesh);
    root.add(mesh);
    if (i === 1) {
      const veins = new Mesh(buildVeins(h * 0.86, cosmetic).scale(0.55, 1, 0.62), veinMaterial());
      veins.position.copy(mesh.position);
      veins.rotation.copy(mesh.rotation);
      veins.renderOrder = 2;
      root.add(veins);
      mat = veins.material; // see buildMillWheel: the breath must not light the slab
    }
    shadows.push({ x: px, z: pz, rx: 0.42, rz: 0.3, yaw });
    footprints.push({ x: px, z: pz, r: 0.34 });
  });
  void types;
  emitters.push({ kind: 'monolith', x, y: 0.7, z });
  return mat;
}

// ---------------------------------------------------------------------------
// Act IV — The Hollow Heart landmarks. One per layout is the act's violet
// tell (a `monolith` emitter: violet halo + underglow); built as plain meshes
// (each is placed once) with screen-space ink like the monolith.
// ---------------------------------------------------------------------------
// The heart's beat on the wall clock: a lub-dub every 1.3 s, 0 at rest and
// 1 at the peak of the first beat. The vein decal and every heart share it.
export function heartBeat(tSec) {
  const ph = (tSec / 1.3) % 1;
  const lub = Math.exp(-Math.pow((ph - 0.04) / 0.045, 2));
  const dub = 0.6 * Math.exp(-Math.pow((ph - 0.22) / 0.05, 2));
  return lub + dub;
}
const nowSec = () => (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);

// A lumpy organic mass: an icosphere with a deterministic low-frequency
// swell on every vertex (no RNG: a landmark looks the same on every load).
function lumpyGeo(radius, detail, sx, sy, sz, k = 0.16, seed = 1) {
  const g = new IcosahedronGeometry(radius, detail);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = Math.sin(x * 4.1 + seed) * Math.sin(y * 3.7 + seed * 2.1) * Math.sin(z * 4.6 + seed * 0.7);
    const f = 1 + k * n + 0.05 * Math.sin((x + z) * 9 + seed);
    pos.setXYZ(i, x * f * sx, y * f * sy, z * f * sz);
  }
  g.computeVertexNormals();
  return g;
}

// Vein lines over an ellipsoid of radii R centred at height cy: great-circle
// torus arcs scaled onto the surface (the vein rock's grammar, bigger).
function ellipsoidVeins(R, cy, specs, tube = 0.045) {
  return mergeGeometries(
    specs.map(([ry, tilt, a0, al]) =>
      new TorusGeometry(1, tube, 3, 18, al)
        .rotateZ(a0)
        .rotateX(tilt)
        .rotateY(ry)
        .scale(R[0] * 1.03, R[1] * 1.04, R[2] * 1.03)
        .translate(0, cy, 0)
    )
  );
}

function meshInk(root, geo, mat, x, z, yaw, ink = PROP_INK_PX) {
  const m = new Mesh(geo, mat);
  m.position.set(x, 0, z);
  m.rotation.y = yaw;
  if (ink) addPropInk(m, ink);
  root.add(m);
  return m;
}

function buildLandmark(root, [x, z, rad = 1, kind = 'heart', yaw = 0], shadows, emitters, footprints, mats, cosmetic) {
  if (mats.lime) return buildSpireLandmark(root, [x, z, rad, kind, yaw], shadows, emitters, footprints, mats);
  if (mats.kbrick) return buildKilnLandmark(root, [x, z, rad, kind, yaw], shadows, emitters, footprints, mats);
  if (!mats.crystal) return null;
  const S = rad;
  if (kind === 'heart' || kind === 'heartnode') {
    const big = kind === 'heart';
    const k = big ? S / 1.3 : S / 1.0 * 0.78;
    // Everything that beats lives in one group scaled about the heart's base.
    const beat = new Group();
    beat.position.set(x, 0, z);
    beat.rotation.y = yaw;
    root.add(beat);
    const R = [0.92 * k, 0.9 * k, 0.76 * k];
    const cy = 0.78 * k;
    const massGeo = lumpyGeo(1, 3, R[0], R[1], R[2], 0.07, 1.7).translate(0, cy, 0);
    const fleshMat = toonMaterial({ color: hslColor(343, 0.42, 0.42), emissive: hslColor(336, 0.6, 0.2), emissiveIntensity: 0.45 });
    const mass = new Mesh(massGeo, fleshMat);
    addPropInk(mass);
    beat.add(mass);
    // Ventricle lobes and the darker cleft between them.
    const lobes = new Mesh(
      mergeGeometries([
        lumpyGeo(0.5 * k, 2, 1, 0.9, 0.9, 0.1, 3.1).translate(-0.62 * k, 0.4 * k, 0.28 * k),
        lumpyGeo(0.44 * k, 2, 1, 0.9, 0.9, 0.1, 4.3).translate(0.66 * k, 0.36 * k, 0.24 * k),
      ]),
      toonMaterial({ color: hslColor(338, 0.36, 0.31) })
    );
    addPropInk(lobes);
    beat.add(lobes);
    if (big) {
      // Arteries arching up and back into the wall.
      const art = new Mesh(
        mergeGeometries([
          new TorusGeometry(0.36 * k, 0.13 * k, 7, 12, Math.PI * 0.85).rotateY(Math.PI / 2).translate(-0.2 * k, 1.28 * k, -0.25 * k),
          new TorusGeometry(0.28 * k, 0.1 * k, 7, 12, Math.PI * 0.8).rotateY(Math.PI / 2 + 0.5).translate(0.3 * k, 1.22 * k, -0.2 * k),
          new CylinderGeometry(0.1 * k, 0.15 * k, 0.6 * k, 7).rotateX(-0.5).translate(0.05 * k, 1.42 * k, -0.4 * k),
        ]),
        toonMaterial({ color: hslColor(334, 0.3, 0.34) })
      );
      addPropInk(art);
      beat.add(art);
    }
    // The violet veins over the heart: brightest at the beat.
    // Deeper, more saturated violet than the stone veins: over the rose
    // flesh a paler violet read as white scar lines.
    const veinMat = new MeshBasicMaterial({ toneMapped: false });
    veinMat.color.setRGB(0.3, 0.1, 0.78, LinearSRGBColorSpace);
    const vBase = veinMat.color.clone();
    const veins = new Mesh(
      ellipsoidVeins(R, cy, [
        [0.2, 0.25, 0.3, 2.2],
        [1.1, -0.3, 0.5, 1.8],
        [2.0, 0.2, 0.2, 2.0],
        [2.9, -0.15, 0.7, 1.5],
        [-0.8, 0.4, 0.1, 1.7],
        [-1.7, -0.2, 0.6, 1.6],
      ], 0.042),
      veinMat
    );
    veins.renderOrder = 2;
    beat.add(veins);
    // Roots / tendrils spreading from the base onto the floor (not beating).
    const tend = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      const len = (0.7 + (i % 3) * 0.25) * k;
      tend.push(
        new CylinderGeometry(0.03 * k, 0.1 * k, len, 5)
          .rotateZ(Math.PI / 2 - 0.12)
          .translate(len / 2 + 0.55 * k, 0.05, 0)
          .rotateY(a)
      );
    }
    meshInk(root, mergeGeometries(tend), mats.root, x, z, yaw, 1.5);
    const tendVeins = [];
    for (let i = 0; i < 9; i += 2) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      const len = (0.7 + (i % 3) * 0.25) * k;
      tendVeins.push(new BoxGeometry(len * 0.8, 0.02, 0.022).translate(len * 0.45 + 0.6 * k, 0.1 * k + 0.02, 0).rotateY(a));
    }
    const tv = new Mesh(mergeGeometries(tendVeins), veinMat);
    tv.position.set(x, 0, z);
    tv.rotation.y = yaw;
    tv.renderOrder = 2;
    root.add(tv);
    // Lub-dub: the mass swells and the veins flare on the beat.
    mass.onBeforeRender = () => {
      const b = heartBeat(nowSec() + (big ? 0 : 0.35));
      const s = 1 + (big ? 0.05 : 0.04) * b;
      beat.scale.set(s, 1 + (s - 1) * 0.7, s);
      veinMat.color.copy(vBase).multiplyScalar(0.62 + 0.5 * b);
      fleshMat.emissiveIntensity = 0.38 + 0.4 * b;
    };
    shadows.push({ x, z, rx: R[0] * 1.5, rz: R[2] * 1.4, yaw });
    footprints.push({ x, z, r: R[0] * 1.1 });
    emitters.push({ kind: 'monolith', x, y: cy, z: z + 0.35 * k });
    if (big) emitters.push({ kind: 'crystal', x, y: cy * 0.6, z: z + 0.9 * k, size: 1.6, pool: 2.8 });
    return null;
  }
  if (kind === 'rootgate') {
    // Three great roots arching out of the north wall over a black mouth
    // that glows violet from deep inside.
    const k = S / 1.4;
    const arches = mergeGeometries([
      new TorusGeometry(1.0 * k, 0.17 * k, 7, 18, Math.PI).translate(0, -0.05, 0),
      new TorusGeometry(0.86 * k, 0.12 * k, 6, 16, Math.PI * 0.94).rotateY(0.18).translate(0.1 * k, -0.04, -0.3 * k),
      new TorusGeometry(1.16 * k, 0.11 * k, 6, 18, Math.PI * 0.9).rotateZ(0.08).rotateY(-0.14).translate(-0.05 * k, -0.06, -0.55 * k),
    ]);
    meshInk(root, arches, mats.rootLit, x, z, yaw);
    const knots = mergeGeometries([
      lumpyGeo(0.28 * k, 1, 1.3, 0.6, 1.1, 0.15, 2).translate(1.0 * k, 0.08, 0),
      lumpyGeo(0.26 * k, 1, 1.3, 0.6, 1.1, 0.15, 5).translate(-1.0 * k, 0.08, 0),
      lumpyGeo(0.16 * k, 1, 1, 0.7, 1, 0.1, 7).translate(0.25 * k, 1.12 * k, 0.05),
    ]);
    meshInk(root, knots, mats.root, x, z, yaw, DETAIL_INK_PX);
    // The mouth: a deep violet-black hole under the arch, banded with light.
    const mouth = new Mesh(
      new CircleGeometry(0.8 * k, 20, 0, Math.PI).translate(0, 0, 0),
      new MeshBasicMaterial({ color: hslColor(276, 0.5, 0.05), toneMapped: false })
    );
    mouth.position.set(x, 0.0, z - 0.42 * k);
    mouth.rotation.y = yaw;
    root.add(mouth);
    const depth = new Mesh(new CircleGeometry(0.42 * k, 18, 0, Math.PI), veinMaterial(0.22));
    depth.position.set(x, 0.0, z - 0.4 * k);
    depth.rotation.y = yaw;
    root.add(depth);
    const vm = veinMaterial(0.45);
    const vBase = vm.color.clone();
    const arcV = new Mesh(
      mergeGeometries([
        new TorusGeometry(1.0 * k, 0.02, 3, 22, Math.PI * 0.42).rotateZ(0.2).translate(0, 0.12 * k, 0.14 * k),
        new TorusGeometry(1.0 * k, 0.02, 3, 22, Math.PI * 0.3).rotateZ(Math.PI * 0.62).translate(0, 0.1 * k, 0.15 * k),
        new TorusGeometry(0.86 * k, 0.018, 3, 18, Math.PI * 0.5).rotateZ(0.6).rotateY(0.18).translate(0.1 * k, 0.08 * k, -0.18 * k),
      ]),
      vm
    );
    arcV.position.set(x, 0, z);
    arcV.rotation.y = yaw;
    arcV.renderOrder = 2;
    root.add(arcV);
    depth.onBeforeRender = () => {
      const b = heartBeat(nowSec() + 0.6);
      vm.color.copy(vBase).multiplyScalar(0.7 + 0.35 * b);
    };
    shadows.push({ x, z, rx: 1.4 * k, rz: 0.55 * k, yaw });
    footprints.push({ x, z, r: 1.25 * k });
    emitters.push({ kind: 'crystal', x, y: 0.35 * k, z: z + 0.25, size: 1.1, pool: 2.4 });
    return null;
  }
  if (kind === 'geode') {
    // A great open geode: a broken black rock shell brimming with crystals.
    const k = S / 1.2;
    const shell = mergeGeometries([
      new TorusGeometry(0.78 * k, 0.3 * k, 6, 16).rotateX(Math.PI / 2).scale(1, 1, 0.8).translate(0, 0.2 * k, 0),
    ]);
    meshInk(root, shell, mats.heartRock, x, z, yaw);
    const lumps = mergeGeometries([
      lumpyGeo(0.36 * k, 1, 1.2, 0.8, 1, 0.15, 1).translate(-0.7 * k, 0.32 * k, -0.42 * k),
      lumpyGeo(0.3 * k, 1, 1.2, 0.9, 1, 0.15, 4).translate(0.62 * k, 0.3 * k, -0.48 * k),
      lumpyGeo(0.2 * k, 0, 1, 0.7, 1, 0.1, 6).translate(0.9 * k, 0.1, 0.3 * k),
    ]);
    meshInk(root, lumps, mats.heartRockLit, x, z, yaw, DETAIL_INK_PX);
    const bed = new Mesh(new CylinderGeometry(0.62 * k, 0.6 * k, 0.12, 14).translate(0, 0.08, 0), mats.crystalDeep);
    bed.position.set(x, 0, z);
    bed.rotation.y = yaw;
    bed.scale.z = 0.8;
    root.add(bed);
    const shafts = [];
    const tips = [];
    for (let i = 0; i < 15; i++) {
      const a = i * 2.39996;
      const rr = i === 0 ? 0 : (0.16 + ((i * 7) % 5) * 0.09) * k;
      const r0 = (0.07 + ((i * 3) % 4) * 0.018) * k;
      const h = (i === 0 ? 0.92 : 0.28 + ((i * 11) % 6) * 0.08) * k;
      const tilt = i === 0 ? 0.05 : 0.18 + rr * 0.55;
      const xf = (g) => g.rotateZ(Math.cos(a) * -tilt).rotateX(Math.sin(a) * tilt).translate(Math.cos(a) * rr, 0.08, Math.sin(a) * rr * 0.8);
      shafts.push(xf(new CylinderGeometry(r0, r0 * 1.14, h, 6).translate(0, h / 2, 0)));
      tips.push(xf(new ConeGeometry(r0, r0 * 2.3, 6).translate(0, h + r0 * 1.15, 0)));
    }
    meshInk(root, mergeGeometries(shafts), mats.crystal, x, z, yaw);
    meshInk(root, mergeGeometries(tips), mats.crystalLit, x, z, yaw, DETAIL_INK_PX);
    shadows.push({ x, z, rx: 1.2 * k, rz: 1.0 * k, yaw });
    footprints.push({ x, z, r: 1.1 * k });
    emitters.push({ kind: 'monolith', x, y: 0.55 * k, z });
    void cosmetic;
    return null;
  }
  if (kind === 'well') {
    // A weeping well: a ring of black stones round a pool of the heart's
    // violet ichor, which brims and weeps over the lip onto the floor.
    const k = S / 1.1;
    const ring = mergeGeometries([new TorusGeometry(0.78 * k, 0.17 * k, 6, 20).rotateX(Math.PI / 2).scale(1, 1, 1.0).translate(0, 0.16 * k, 0)]);
    meshInk(root, ring, mats.heartRock, x, z, yaw);
    const stones = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.2;
      stones.push(new BoxGeometry(0.3 * k, 0.12 * k, 0.2 * k).rotateY(-a + Math.PI / 2).translate(Math.cos(a) * 0.8 * k, 0.3 * k, Math.sin(a) * 0.8 * k));
    }
    meshInk(root, mergeGeometries(stones), mats.heartRockLit, x, z, yaw, DETAIL_INK_PX);
    const poolMat = new MeshBasicMaterial({ toneMapped: false });
    poolMat.color.setRGB(0.16, 0.05, 0.46, LinearSRGBColorSpace);
    const pBase = poolMat.color.clone();
    const pool = new Mesh(new CircleGeometry(0.66 * k, 28).rotateX(-Math.PI / 2), poolMat);
    pool.position.set(x, 0.24 * k, z);
    root.add(pool);
    const sheenMat = new MeshBasicMaterial({ toneMapped: false });
    sheenMat.color.setRGB(0.5, 0.3, 1.25, LinearSRGBColorSpace);
    const sheen = new Mesh(new RingGeometryLite(0.36 * k, 0.46 * k), sheenMat);
    sheen.position.set(x, 0.245 * k, z);
    root.add(sheen);
    // The weep: violet runnels over the lip and out across the floor.
    const runs = [];
    for (const a of [0.5, 2.2, 3.9, 5.1]) {
      runs.push(new BoxGeometry(0.06 * k, 0.012, 0.5 * k).translate(0, 0.012, 0.98 * k).rotateY(a));
      runs.push(new BoxGeometry(0.05 * k, 0.03, 0.22 * k).rotateX(-0.9).translate(0, 0.18 * k, 0.86 * k).rotateY(a));
    }
    const rm = new Mesh(mergeGeometries(runs), veinMaterial(0.62));
    rm.position.set(x, 0, z);
    rm.rotation.y = yaw;
    rm.renderOrder = 2;
    root.add(rm);
    // Crystals growing on the rim.
    const shafts = [];
    const tips = [];
    for (const [a, h, r0] of [[1.2, 0.36, 0.07], [1.45, 0.22, 0.05], [4.4, 0.3, 0.06], [4.15, 0.18, 0.045], [5.9, 0.2, 0.05]]) {
      const xf = (g) => g.rotateZ(-0.35).rotateY(-a).translate(Math.cos(a) * 0.86 * k, 0.24 * k, Math.sin(a) * 0.86 * k);
      shafts.push(xf(new CylinderGeometry(r0 * k, r0 * 1.14 * k, h * k, 6).translate(0, (h * k) / 2, 0)));
      tips.push(xf(new ConeGeometry(r0 * k, r0 * 2.3 * k, 6).translate(0, h * k + r0 * 1.15 * k, 0)));
    }
    meshInk(root, mergeGeometries(shafts), mats.crystal, x, z, yaw);
    meshInk(root, mergeGeometries(tips), mats.crystalLit, x, z, yaw, DETAIL_INK_PX);
    pool.onBeforeRender = () => {
      const tS = nowSec();
      const b = heartBeat(tS + x * 0.05);
      poolMat.color.copy(pBase).multiplyScalar(0.85 + 0.3 * b);
      sheen.rotation.z = tS * 0.2;
    };
    shadows.push({ x, z, rx: 1.15 * k, rz: 1.0 * k, yaw });
    footprints.push({ x, z, r: 1.05 * k });
    emitters.push({ kind: 'crystal', x, y: 0.75 * k, z: z - 0.3 * k, size: 0.9, pool: 2.2 });
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Act V — The Still Spire: bells, the tell's indigo crack, belfry ropes and
// the built landmarks ('greatbell', 'bellframe', 'stair').
// ---------------------------------------------------------------------------
// A bell's lathe profile (lip radius R at y 0, crown at y H): flared lip, a
// waist, a rounded shoulder and crown. BELL_PROFILE is in units of (R, H).
const BELL_PROFILE = [[1, 0], [0.95, 0.04], [0.82, 0.14], [0.67, 0.36], [0.6, 0.6], [0.56, 0.8], [0.44, 0.93], [0.22, 1.0], [0.001, 1.0]];
// mergeGeometries refuses a mix of indexed (box, cone, lathe) and
// non-indexed (icosahedron) parts: drop every index first when they mix.
function mergeMixed(list) {
  const mixed = list.some((g) => g.index) && list.some((g) => !g.index);
  return mergeGeometries(mixed ? list.map((g) => (g.index ? g.toNonIndexed() : g)) : list);
}
function bellLathe(R, H, seg = 16) {
  return new LatheGeometry(BELL_PROFILE.map(([x, y]) => new Vector2(x * R, y * H)), seg);
}
function bellRadiusAt(R, t) {
  for (let i = 0; i < BELL_PROFILE.length - 1; i++) {
    const [r0, y0] = BELL_PROFILE[i];
    const [r1, y1] = BELL_PROFILE[i + 1];
    if (t <= y1 || i === BELL_PROFILE.length - 2) {
      const f = y1 > y0 ? Math.min(1, Math.max(0, (t - y0) / (y1 - y0))) : 0;
      return (r0 + (r1 - r0) * f) * R;
    }
  }
  return R;
}
function balusterLathe() {
  const p = [[0.001, 0], [0.06, 0], [0.06, 0.05], [0.04, 0.08], [0.066, 0.22], [0.044, 0.38], [0.034, 0.42], [0.06, 0.44], [0.001, 0.44]];
  return new LatheGeometry(p.map(([x, y]) => new Vector2(x, y)), 7);
}

// The tell: a crack down a bell's face, glowing TELL indigo (render/enemies/
// style.js TELL_INDIGO, h228) — pre-compensated linear like the monolith's
// veins so the core survives ACES as saturated indigo, cores just over the
// bloom threshold. A jagged run from the shoulder to the lip with forks, as
// geometry bars laid on the lathe surface (the monolith rule: a canvas map
// at gameplay zoom would land at half a pixel). `bodyR/H/y0`: the bell.
export const CRACK_INDIGO = [0.3, 0.44, 1.9];
function bellCrackGeo(R, H, y0, seed, width, branches = 3) {
  let s = seed >>> 0;
  const rnd = () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    return s / 4294967296;
  };
  const bars = [];
  const at = (th, t, lift) => {
    const r = bellRadiusAt(R, t) + lift;
    return new Vector3(Math.sin(th) * r, y0 + t * H, Math.cos(th) * r);
  };
  const bar = (a, b, w) => {
    const d = new Vector3().subVectors(b, a);
    const len = d.length();
    if (len < 1e-4) return;
    const g = new BoxGeometry(w, len + w * 0.6, w * 0.7);
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize());
    g.applyMatrix4(new Matrix4().compose(new Vector3().addVectors(a, b).multiplyScalar(0.5), q, new Vector3(1, 1, 1)));
    bars.push(g);
  };
  const run = (th0, t0, t1, w, lift, depth) => {
    let th = th0;
    let t = t0;
    let p = at(th, t, lift);
    const n = Math.max(3, Math.round(Math.abs(t1 - t0) / 0.07));
    for (let i = 0; i < n; i++) {
      t += (t1 - t0) / n;
      th += (rnd() - 0.5) * 0.34;
      const q = at(th, t, lift);
      const taper = depth === 0 ? 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, (i + 1) / n) * 0.9 + 0.15) : 1 - i / n;
      bar(p, q, Math.max(width * 0.35, w * taper));
      if (depth < 1 && i > 0 && i < n - 1 && rnd() < branches / n) {
        run(th, t, t - (0.12 + rnd() * 0.22) * Math.sign(t1 - t0) * -1, w * 0.55, lift, depth + 1);
      }
      p = q;
    }
  };
  run((rnd() - 0.5) * 0.3, 0.86, 0.0, width, 0.012, 0);
  return mergeGeometries(bars);
}
function crackMaterial(gain) {
  const m = new MeshBasicMaterial({ toneMapped: false });
  m.color.setRGB(CRACK_INDIGO[0] * gain, CRACK_INDIGO[1] * gain, CRACK_INDIGO[2] * gain, LinearSRGBColorSpace);
  return m;
}

// Belfry ropes hanging out of the dark overhead to a striped sally a hand
// above the floor; each sways on its own slow clock (pivot at the top).
function buildRopes(root, ropes, mats, footprints) {
  const TOP = 7.2;
  const ropeGeo = new CylinderGeometry(0.02, 0.022, TOP - 1.0, 5).translate(0, -(TOP - 1.0) / 2, 0);
  const tailGeo = mergeGeometries([
    new CylinderGeometry(0.02, 0.02, 0.36, 5).translate(0, -(TOP - 0.62), 0),
    new TorusGeometry(0.06, 0.016, 4, 10, Math.PI * 1.6).translate(0.04, -(TOP - 0.42), 0),
  ]);
  const sallyGeo = mergeGeometries([0, 1, 2, 3, 4].map((k) => new CylinderGeometry(0.046, 0.046, 0.07, 7).translate(0, -(TOP - 1.0) - 0.04 - k * 0.075, 0)));
  const sallyAlt = mergeGeometries([0, 1, 2, 3].map((k) => new CylinderGeometry(0.048, 0.048, 0.035, 7).translate(0, -(TOP - 1.0) - 0.0775 - k * 0.075, 0)));
  ropes.forEach(([x, z], i) => {
    const g = new Group();
    g.position.set(x, TOP, z);
    const rope = new Mesh(ropeGeo, mats.hemp);
    addPropInk(rope, 1.15);
    g.add(rope);
    const tail = new Mesh(tailGeo, mats.hemp);
    g.add(tail);
    const sally = new Mesh(sallyGeo, mats.slateCloth);
    addPropInk(sally, 1.15);
    g.add(sally);
    g.add(new Mesh(sallyAlt, mats.sail));
    const ph = i * 1.7 + x * 0.3;
    rope.onBeforeRender = () => {
      const t = nowSec();
      g.rotation.z = 0.012 * Math.sin(t * 0.7 + ph) + 0.004 * Math.sin(t * 1.9 + ph * 2);
      g.rotation.x = 0.008 * Math.sin(t * 0.55 + ph * 1.3);
    };
    root.add(g);
    footprints.push({ x, z, r: 0.18 });
  });
}

function buildSpireLandmark(root, [x, z, rad = 1, kind = 'bellframe', yaw = 0], shadows, emitters, footprints, mats) {
  const put = (geo, mat, ink = PROP_INK_PX) => meshInk(root, geo, mat, x, z, yaw, ink);
  const crackGroup = (geo, gain, under) => {
    const m = crackMaterial(gain);
    const mesh = new Mesh(geo, m);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = yaw;
    mesh.renderOrder = 2;
    root.add(mesh);
    if (under) {
      // A soft wider seam under the bright core (the crack's own bleed).
      const u = new Mesh(under, crackMaterial(gain * 0.32));
      u.position.copy(mesh.position);
      u.rotation.copy(mesh.rotation);
      u.renderOrder = 1;
      root.add(u);
    }
    const base = m.color.clone();
    mesh.onBeforeRender = () => {
      // Still, not beating: a slow swell, as if the bell were still humming.
      const t = nowSec();
      m.color.copy(base).multiplyScalar(0.84 + 0.16 * Math.sin(t * 0.8 + x) + 0.05 * Math.sin(t * 2.3));
    };
    return m;
  };
  // Local -> world for emitters / shadows.
  const wx = (lx, lz) => x + Math.cos(yaw) * lx + Math.sin(yaw) * lz;
  const wz = (lx, lz) => z - Math.sin(yaw) * lx + Math.cos(yaw) * lz;

  if (kind === 'greatbell' || kind === 'bellframe') {
    const great = kind === 'greatbell';
    const k = great ? rad / 0.8 : rad / 0.8;
    const PX = (great ? 1.62 : 0.86) * k; // pier half-spacing
    const PH = (great ? 2.9 : 2.0) * k; // pier height
    const BR = (great ? 0.95 : 0.5) * k; // bell lip radius
    const BH = (great ? 1.6 : 0.84) * k; // bell height
    const LIP = 1.02; // clear of the parapet's capstones
    // Piers: stepped bases, coursed shafts (a dark course every so often),
    // capitals; the frame straddles the parapet wall.
    const pw = (great ? 0.62 : 0.38) * k;
    const pd = (great ? 0.86 : 0.56) * k;
    const piers = [];
    const courses = [];
    const rimes = [];
    for (const sx of [-1, 1]) {
      piers.push(new BoxGeometry(pw * 1.4, 0.2 * k, pd * 1.25).translate(sx * PX, 0.1 * k, 0));
      piers.push(new BoxGeometry(pw, PH, pd).translate(sx * PX, PH / 2, 0));
      piers.push(new BoxGeometry(pw * 1.3, 0.14 * k, pd * 1.15).translate(sx * PX, PH + 0.07 * k, 0));
      for (let c = 1; c < 6; c++) courses.push(new BoxGeometry(pw * 1.03, 0.035, pd * 1.03).translate(sx * PX, (PH * c) / 6, 0));
      rimes.push(new BoxGeometry(pw * 1.2, 0.03, pd * 0.9).translate(sx * PX, PH + 0.155 * k, 0));
    }
    put(mergeGeometries(piers), mats.lime);
    put(mergeGeometries(courses), mats.limeShade, false);
    // Headstock: a heavy timber across the piers with iron straps.
    const HS = PH - 0.18 * k;
    put(new BoxGeometry(PX * 2 + pw * 0.6, 0.2 * k, 0.24 * k).translate(0, HS, 0), mats.timber);
    put(mergeGeometries([-0.5, 0.5].map((f) => new BoxGeometry(0.05 * k, 0.24 * k, 0.28 * k).translate(f * PX, HS, 0))), mats.iron, false);
    if (great) {
      // The arch over the great bell, a keystone, rime along its crown.
      put(new TorusGeometry(PX, 0.26 * k, 6, 22, Math.PI).scale(1, 0.92, 1.6).translate(0, PH + 0.14 * k, 0), mats.lime);
      put(new BoxGeometry(0.34 * k, 0.46 * k, 0.6 * k).translate(0, PH + PX * 0.92 + 0.14 * k, 0), mats.limeLit);
      rimes.push(new TorusGeometry(PX, 0.05 * k, 3, 18, Math.PI * 0.7).rotateZ(Math.PI * 0.15).scale(1, 0.92, 1.6).translate(0, PH + 0.34 * k, 0));
      // Belfry ropes rising from the headstock into the dark above.
      put(
        mergeGeometries([-0.62, 0.0, 0.7].map((f, i) => new CylinderGeometry(0.03, 0.03, 6.0, 5).rotateZ((i - 1) * 0.03).translate(f * PX, HS + 3.0, 0.14 * k))),
        mats.hemp,
        1.15
      );
    } else {
      put(new BoxGeometry(PX * 2 + pw * 1.5, 0.26 * k, pd * 0.9).translate(0, PH + 0.27 * k, 0), mats.limeLit);
      rimes.push(new BoxGeometry(PX * 2 + pw * 1.3, 0.03, pd * 0.6).translate(0, PH + 0.415 * k, 0));
    }
    put(mergeGeometries(rimes), mats.rime, false);
    // The bell: tarnished bronze, a darker verdigris band at the shoulder, a
    // bright worn lip; the yoke into the headstock. It hangs dead still.
    const tilt = great ? 0.05 : 0.0;
    const bellGroup = (geo, mat, ink) => {
      const m = new Mesh(geo, mat);
      m.position.set(x, 0, z);
      m.rotation.set(0, yaw, 0);
      if (ink) addPropInk(m, ink);
      root.add(m);
      return m;
    };
    const bellGeo = bellLathe(BR, BH, great ? 22 : 16).translate(0, LIP, 0).rotateZ(tilt);
    bellGroup(bellGeo, mats.bronze, PROP_INK_PX);
    bellGroup(new TorusGeometry(BR * 0.97, 0.035 * k, 5, great ? 30 : 20).rotateX(Math.PI / 2).translate(0, LIP + 0.03 * k, 0).rotateZ(tilt), mats.bronzeLit, false);
    bellGroup(
      mergeGeometries([
        new TorusGeometry(bellRadiusAt(BR, 0.62) * 1.01, 0.03 * k, 4, great ? 28 : 18).rotateX(Math.PI / 2).translate(0, LIP + BH * 0.62, 0),
        new TorusGeometry(bellRadiusAt(BR, 0.3) * 1.01, 0.022 * k, 4, great ? 28 : 18).rotateX(Math.PI / 2).translate(0, LIP + BH * 0.3, 0),
      ]).rotateZ(tilt),
      mats.verdigris,
      false
    );
    bellGroup(new BoxGeometry(0.26 * BR, HS - (LIP + BH) + 0.04, 0.26 * BR).translate(0, (LIP + BH + HS) / 2, 0), mats.iron, DETAIL_INK_PX);
    if (great) {
      // Icicles off the lip (the bell has not rung in an age).
      const ic = [];
      for (let i = 0; i < 9; i++) {
        const a = -0.9 + i * 0.22 + Math.sin(i * 7.3) * 0.05;
        const h = 0.12 + ((i * 5) % 4) * 0.05;
        ic.push(new ConeGeometry(0.03 * k, h * k, 4).rotateX(Math.PI).translate(Math.sin(a) * BR * 0.94, LIP - (h * k) / 2 + 0.01, Math.cos(a) * BR * 0.94));
      }
      put(mergeGeometries(ic).rotateZ(tilt), mats.rime, false);
    }
    // THE TELL: the crack down the bell's face.
    const w = (great ? 0.05 : 0.034) * k;
    const seed = great ? 0x6b1d : 0x3a7 + Math.round(x * 13 + z * 7);
    const core = bellCrackGeo(BR, BH, LIP, seed, w, great ? 4 : 2).rotateZ(tilt);
    const under = bellCrackGeo(BR, BH, LIP, seed, w * 2.6, great ? 4 : 2).rotateZ(tilt);
    const m = crackGroup(core, great ? 1.0 : 0.9, under);
    shadows.push({ x, z, rx: PX + pw, rz: pd * 0.9, yaw });
    footprints.push({ x: wx(-PX, 0), z: wz(-PX, 0), r: pw });
    footprints.push({ x: wx(PX, 0), z: wz(PX, 0), r: pw });
    // The indigo halo + underglow (the arena's monolith emitter) in front of
    // the crack; a great bell also lights its frost.
    emitters.push({ kind: 'monolith', x: wx(0, BR * 1.05), y: LIP + BH * 0.3, z: wz(0, BR * 1.05), size: great ? 1.3 : 0.85, halo: great ? 0.34 : 0.28, pool: great ? 1.6 : 1.0 });
    return m;
  }

  if (kind === 'clockface') {
    // CONTENT PLAN 5 slice 1 (docs/THIRD_BOSSES.md): the gods' great clock in
    // the Clock Loft (35, the Hourwarden's room). A round limestone frame on
    // two piers straddling the north parapet, a slate dial with twelve
    // bronze hour marks and two bronze hands stopped at the hour the gods
    // sat down, rime on the frame's crown; THE TELL is the crack across the
    // dial, glowing indigo like the bells'.
    const k = rad / 0.8;
    const DR = 1.7 * k; // dial radius
    const CY = 3.0 * k; // dial centre height
    const FZ = 0.3 * k; // the dial's face, toward the room
    const pw = 0.5 * k;
    const piers = [];
    const courses = [];
    for (const sx of [-1, 1]) {
      const px = sx * (DR + 0.15 * k);
      piers.push(new BoxGeometry(pw * 1.4, 0.22 * k, 0.9 * k).translate(px, 0.11 * k, 0));
      piers.push(new BoxGeometry(pw, CY, 0.7 * k).translate(px, CY / 2, 0));
      for (let c = 1; c < 5; c++) courses.push(new BoxGeometry(pw * 1.03, 0.035, 0.72 * k).translate(px, (CY * c) / 5, 0));
    }
    put(mergeGeometries(piers), mats.lime);
    put(mergeGeometries(courses), mats.limeShade, false);
    // The round frame and its keystone; the slate dial set into it.
    put(new TorusGeometry(DR + 0.12 * k, 0.24 * k, 8, 40).translate(0, CY, FZ * 0.5), mats.lime);
    put(new BoxGeometry(0.42 * k, 0.5 * k, 0.5 * k).translate(0, CY + DR + 0.3 * k, FZ * 0.5), mats.limeLit, DETAIL_INK_PX);
    put(new CylinderGeometry(DR, DR, 0.12 * k, 40).rotateX(Math.PI / 2).translate(0, CY, FZ * 0.2), mats.slateCloth, false);
    // A bronze chapter ring and the twelve hour marks (the quarters longer).
    put(new TorusGeometry(DR * 0.82, 0.035 * k, 4, 40).translate(0, CY, FZ * 0.32), mats.bronzeLit, false);
    const marks = [];
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * Math.PI * 2;
      const L = (h % 3 === 0 ? 0.34 : 0.2) * k;
      const r = DR * 0.93 - L / 2;
      marks.push(new BoxGeometry(0.08 * k, L, 0.06 * k).rotateZ(-a).translate(Math.sin(a) * r, CY + Math.cos(a) * r, FZ * 0.34));
    }
    put(mergeGeometries(marks), mats.bronze, false);
    // The hands: stopped at a quarter to the hour, the minute hand long.
    const hands = mergeGeometries([
      new BoxGeometry(0.1 * k, DR * 0.55, 0.05 * k).translate(0, DR * 0.26, 0).rotateZ(-2.2).translate(0, CY, FZ * 0.4),
      new BoxGeometry(0.07 * k, DR * 0.8, 0.05 * k).translate(0, DR * 0.38, 0).rotateZ(1.57).translate(0, CY, FZ * 0.44),
      new CylinderGeometry(0.13 * k, 0.13 * k, 0.1 * k, 12).rotateX(Math.PI / 2).translate(0, CY, FZ * 0.46),
    ]);
    put(hands, mats.bronze, DETAIL_INK_PX);
    put(mergeGeometries([
      new TorusGeometry(DR + 0.12 * k, 0.05 * k, 3, 24, Math.PI * 0.6).rotateZ(Math.PI * 0.2).translate(0, CY + 0.2 * k, FZ * 0.5),
      new BoxGeometry(0.5 * k, 0.03, 0.56 * k).translate(0, CY + DR + 0.56 * k, FZ * 0.5),
    ]), mats.rime, false);
    // THE TELL: a jagged crack across the dial from the rim toward the hub.
    let sd = 0x5c1 + Math.round(x * 11 + z * 5);
    const rnd = () => {
      sd = (Math.imul(sd ^ (sd >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
      return sd / 4294967296;
    };
    const crack = (w) => {
      const bars = [];
      let px = -DR * 0.78;
      let py = CY + DR * 0.48;
      const n = 9;
      for (let i = 0; i < n; i++) {
        const qx = px + (DR * 1.3) / n;
        const qy = py - (DR * 0.9) / n + (rnd() - 0.5) * 0.22 * k;
        const len = Math.hypot(qx - px, qy - py);
        const ang = Math.atan2(qy - py, qx - px);
        const taper = 0.5 + 0.5 * Math.sin(Math.PI * ((i + 0.5) / n));
        bars.push(new BoxGeometry(len + w * 0.6, w * taper, w * 0.6).rotateZ(ang).translate((px + qx) / 2, (py + qy) / 2, FZ * 0.5));
        px = qx;
        py = qy;
      }
      return mergeGeometries(bars);
    };
    const w = 0.055 * k;
    const m = crackGroup(crack(w), 1.0, crack(w * 2.6));
    shadows.push({ x, z, rx: DR + pw, rz: 0.7 * k, yaw });
    footprints.push({ x: wx(-(DR + 0.15 * k), 0), z: wz(-(DR + 0.15 * k), 0), r: pw });
    footprints.push({ x: wx(DR + 0.15 * k, 0), z: wz(DR + 0.15 * k, 0), r: pw });
    emitters.push({ kind: 'monolith', x: wx(0, FZ + 0.4), y: CY - 0.4, z: wz(0, FZ + 0.4), size: 1.2, halo: 0.32, pool: 1.4 });
    return m;
  }

  if (kind === 'stair') {
    // A flight of worn limestone steps climbing the north parapet to a
    // landing and a doorway that opens onto nothing but sky.
    const k = rad / 0.9;
    const SW = 2.1 * k;
    const steps = [];
    const noses = [];
    const N = 5;
    const RISE = 0.17;
    const RUN = 0.34;
    for (let i = 0; i < N; i++) {
      const h = RISE * (i + 1);
      const zc = 0.78 - i * RUN;
      steps.push(new BoxGeometry(SW, h, RUN + 0.02).translate(0, h / 2, zc));
      // Rime on each tread's nose, a chipped corner on two of them.
      noses.push(new BoxGeometry(SW * (0.6 + (i % 2) * 0.25), 0.02, 0.07).translate((i % 2 ? -0.1 : 0.12) * k, h + 0.012, zc + RUN / 2 - 0.05));
    }
    const LH = RISE * N;
    steps.push(new BoxGeometry(SW + 0.3, LH, 0.9).translate(0, LH / 2, 0.78 - N * RUN - 0.28));
    put(mergeGeometries(steps), mats.lime);
    put(mergeGeometries([
      new BoxGeometry(0.22, 0.14, 0.2).rotateY(0.4).translate(SW / 2 - 0.1, RISE * 2 + 0.02, 0.78 - RUN + 0.1),
      new BoxGeometry(0.18, 0.12, 0.16).rotateY(-0.3).translate(SW / 2 + 0.18, 0.06, 0.95),
    ]), mats.limeShade, DETAIL_INK_PX);
    // Cheek walls with balusters climbing either side.
    const cheeks = [];
    const bals = [];
    for (const sx of [-1, 1]) {
      const cx = sx * (SW / 2 + 0.12);
      const g = new BoxGeometry(0.24, 0.22, N * RUN + 0.5).rotateX(Math.atan2(LH, N * RUN)).translate(cx, LH / 2 + 0.06, 0.78 - (N * RUN) / 2 + 0.1);
      cheeks.push(g);
      for (let i = 0; i < N; i += 1) {
        const zc = 0.78 - i * RUN;
        bals.push(balusterLathe().scale(1.2, 1.1, 1.2).translate(cx, RISE * (i + 1) + 0.04, zc));
      }
      cheeks.push(new BoxGeometry(0.3, 0.86, 0.3).translate(cx, 0.43, 1.0));
    }
    put(mergeGeometries(cheeks), mats.limeLit);
    put(mergeGeometries(bals), mats.lime, 1.15);
    put(mergeGeometries(noses), mats.rime, false);
    // The doorway on the landing.
    const zl = 0.78 - N * RUN - 0.36;
    const door = mergeGeometries([
      new BoxGeometry(0.3, 1.8, 0.42).translate(-0.82 * k, LH + 0.9, zl),
      new BoxGeometry(0.3, 1.8, 0.42).translate(0.82 * k, LH + 0.9, zl),
      new TorusGeometry(0.82 * k, 0.17, 5, 16, Math.PI).scale(1, 1, 1.3).translate(0, LH + 1.8, zl),
    ]);
    put(door, mats.lime);
    put(new BoxGeometry(0.24, 0.3, 0.46).translate(0, LH + 1.8 + 0.82 * k + 0.05, zl), mats.limeLit, DETAIL_INK_PX);
    put(new BoxGeometry(0.34, 0.03, 0.36).translate(-0.82 * k, LH + 1.81, zl), mats.rime, false);
    shadows.push({ x, z, rx: SW * 0.7, rz: 0.9, yaw });
    footprints.push({ x, z, r: 1.1 * k });
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// The Ember Kiln's built pieces (env/biomes/kiln.js `landmarks`). Local +z
// faces into the room (yaw 0 = the north wall, +-PI/2 the side walls).
//   kilnmouth   a fire-brick kiln face straddling a wall: two coursed piers,
//               an arch of voussoirs and a keystone round the MOUTH (a dark
//               throat whose fire bed glows kiln gold up into banked crimson),
//               fire bars across the sill, coals on it, soot climbing the face
//               above the arch, a chimney stack behind. One `flame` emitter
//               at the mouth (fire, pool, embers; `lightIdx` may light it).
//   greatmouth  the kiln's great mouth (41): the same, half again as big,
//               twin chimneys, a heavier sill of coals.
//   flue        a chimney breast in a side wall with a small arched firebox
//               glowing at its foot, an iron damper rod, soot up the breast.
//   castbell    THE TELL: a bell cast in a brick-kerbed bed of casting sand,
//               sitting mouth-down, an iron gantry over it with the chain
//               still hooked to its crown; the crack down its face glows
//               indigo. The bell and its crack always face the camera (+z);
//               only the gantry takes the yaw.
//   greatcast   THE TELL, great (39): the great bell hung from a brick-and-
//               iron casting gantry over the north wall, a casting pit under
//               it still faintly gold.
// ---------------------------------------------------------------------------
let mouthTexture = null;
export function kilnMouthTexture() {
  if (mouthTexture || typeof document === 'undefined') return mouthTexture;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  // The throat seen through the arch: white-gold fire bed at the sill, kiln
  // gold, banked crimson, then the dark of the kiln's back wall above.
  const gr = g.createLinearGradient(0, 128, 0, 0);
  gr.addColorStop(0, 'rgb(255,236,180)');
  gr.addColorStop(0.16, 'rgb(255,196,84)');
  gr.addColorStop(0.42, 'rgb(150,40,52)');
  gr.addColorStop(0.72, 'rgb(40,12,16)');
  gr.addColorStop(1, 'rgb(10,6,6)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 128);
  // Licks of fire up the back wall.
  for (let i = 0; i < 9; i++) {
    const x = 4 + i * 7 + (i % 2) * 3;
    const h = 30 + ((i * 37) % 30);
    const lg = g.createLinearGradient(0, 128, 0, 128 - h);
    lg.addColorStop(0, 'rgba(255,214,122,0.85)');
    lg.addColorStop(1, 'rgba(255,190,80,0)');
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(x - 4, 128);
    g.quadraticCurveTo(x - 3, 128 - h * 0.6, x, 128 - h);
    g.quadraticCurveTo(x + 3, 128 - h * 0.6, x + 4, 128);
    g.fill();
  }
  mouthTexture = new CanvasTexture(c);
  mouthTexture.colorSpace = SRGBColorSpace;
  return mouthTexture;
}

function buildKilnLandmark(root, [x, z, rad = 1, kind = 'kilnmouth', yaw = 0], shadows, emitters, footprints, mats) {
  const put = (geo, mat, ink = PROP_INK_PX) => meshInk(root, geo, mat, x, z, yaw, ink);
  const wx = (lx, lz) => x + Math.cos(yaw) * lx + Math.sin(yaw) * lz;
  const wz = (lx, lz) => z - Math.sin(yaw) * lx + Math.cos(yaw) * lz;
  // The live mouth fire: the throat breathes with the kiln (cosmetic only).
  const breathing = (mesh, mat, rate, ph) => {
    const base = mat.color.clone();
    mesh.onBeforeRender = () => {
      const t = nowSec();
      mat.color.copy(base).multiplyScalar(0.86 + 0.1 * Math.sin(t * rate + ph) + 0.05 * Math.sin(t * rate * 2.7 + ph * 1.9));
    };
  };

  if (kind === 'kilnmouth' || kind === 'greatmouth') {
    const great = kind === 'greatmouth';
    const k = (great ? 1.5 : 1.0) * (rad / (great ? 0.8 : 1.0));
    const OW = (great ? 1.5 : 0.62) * k; // half the mouth's width
    const OH = 0.78 * k; // the mouth's springing height (the arch sits on it)
    const PW = 0.55 * k; // pier width
    const FH = (great ? 2.3 : 2.1) * k; // face height
    const ZF = 0.28; // the face, into the room
    const ZB = -0.9; // the back of the kiln, outside the wall
    const D = ZF - ZB;
    // Body: two piers either side of the mouth, the mass above the arch, the
    // kiln's sides running back over the wall.
    const body = [];
    for (const sx of [-1, 1]) {
      body.push(new BoxGeometry(PW, FH, D).translate(sx * (OW + PW / 2), FH / 2, (ZF + ZB) / 2));
      body.push(new BoxGeometry(PW * 1.25, 0.22 * k, D + 0.12).translate(sx * (OW + PW / 2), 0.11 * k, (ZF + ZB) / 2 + 0.04));
    }
    const crown = OH + OW; // the arch's crown
    body.push(new BoxGeometry(OW * 2 + 0.02, FH - crown + 0.12, D).translate(0, (FH + crown) / 2 - 0.06, (ZF + ZB) / 2));
    // Spandrels: fill the corners between the round arch and the square face.
    for (const sx of [-1, 1]) body.push(new BoxGeometry(OW * 0.5, OW * 0.62, D - 0.06).translate(sx * OW * 0.78, OH + OW * 0.5, (ZF + ZB) / 2 - 0.03));
    put(mergeGeometries(body), mats.kbrick);
    // Brick courses across the face (darker joints) and a few scorched bricks.
    const courses = [];
    const nC = Math.floor(FH / 0.16);
    for (let c = 1; c < nC; c++) {
      const y = c * 0.16;
      if (y < crown) for (const sx of [-1, 1]) courses.push(new BoxGeometry(PW * 1.01, 0.02, 0.02).translate(sx * (OW + PW / 2), y, ZF + 0.005));
      else courses.push(new BoxGeometry((OW + PW) * 2 * 1.005, 0.02, 0.02).translate(0, y, ZF + 0.005));
    }
    put(mergeGeometries(courses), mats.soot, false);
    const scorched = [];
    for (let i = 0; i < (great ? 14 : 8); i++) {
      const sx = i % 2 ? 1 : -1;
      const by = 0.24 + ((i * 0.37) % 1) * (FH - 0.4);
      const bx = by > crown ? ((i * 0.61) % 1 - 0.5) * (OW + PW) * 1.8 : sx * (OW + PW * (0.25 + ((i * 0.29) % 1) * 0.5));
      scorched.push(new BoxGeometry(0.22, 0.13, 0.03).translate(bx, by, ZF + 0.012));
    }
    put(mergeGeometries(scorched), mats.kbrickDark, false);
    // The arch: voussoirs round the mouth, a keystone, a brick sill.
    put(new TorusGeometry(OW + 0.08 * k, 0.13 * k, 5, great ? 20 : 14, Math.PI).scale(1, 1, 0.9).translate(0, OH, ZF + 0.02), mats.kbrickLit, DETAIL_INK_PX);
    put(new BoxGeometry(0.26 * k, 0.34 * k, 0.2).translate(0, crown + 0.1 * k, ZF + 0.06), mats.kbrickLit, DETAIL_INK_PX);
    put(new BoxGeometry(OW * 2 + 0.3, 0.12 * k, 0.34).translate(0, 0.06 * k, ZF + 0.02), mats.kbrickDark, DETAIL_INK_PX);
    // Soot climbing the face above the arch: a dark tongue widening upward.
    put(
      mergeGeometries([
        new BoxGeometry(OW * 1.1, 0.5 * k, 0.02).translate(0, crown + 0.3 * k, ZF + 0.022),
        new BoxGeometry(OW * 1.6, (FH - crown) * 0.55, 0.02).translate(0, crown + 0.55 * k + (FH - crown) * 0.27, ZF + 0.02),
      ]),
      mats.soot,
      false
    );
    // The throat: the glowing fire bed, unlit, breathing.
    const tex = kilnMouthTexture();
    const throatMat = new MeshBasicMaterial({ map: tex, toneMapped: false });
    throatMat.color.setRGB(0.6, 0.44, 0.28, LinearSRGBColorSpace); // under the bloom threshold: the mouth glows, never blows out white
    const throatGeo = mergeGeometries([
      new PlaneGeometry(OW * 2, OH).translate(0, OH / 2, 0),
      new CircleGeometry(OW, great ? 18 : 12, 0, Math.PI).translate(0, OH, 0),
    ]);
    // The circle's uv runs 0-1 over its bounding square; squash it onto the
    // top of the gradient so the arch stays dark.
    const throat = meshInk(root, throatGeo, throatMat, x, z, yaw, false);
    throat.position.set(wx(0, ZF - 0.2), 0, wz(0, ZF - 0.2));
    breathing(throat, throatMat, great ? 1.1 : 1.4, x + z);
    // Fire bars across the sill and coals heaped on it.
    const bars = [];
    for (let i = 0; i < (great ? 9 : 5); i++) bars.push(new BoxGeometry(0.035, 0.32 * k, 0.035).translate(-OW + 0.1 + (i * (OW * 2 - 0.2)) / ((great ? 9 : 5) - 1), 0.28 * k, ZF - 0.08));
    bars.push(new BoxGeometry(OW * 2, 0.04, 0.05).translate(0, 0.42 * k, ZF - 0.08));
    put(mergeGeometries(bars), mats.kiron, 1.15);
    const coals = [];
    const hot = [];
    for (let i = 0; i < (great ? 16 : 8); i++) {
      const cxp = -OW * 0.85 + ((i * 0.618) % 1) * OW * 1.7;
      const g = new IcosahedronGeometry(0.06 + ((i * 0.37) % 1) * 0.05, 0).translate(cxp, 0.14 * k, ZF - 0.2 + ((i * 0.41) % 1) * 0.14);
      (i % 3 === 0 ? hot : coals).push(g);
    }
    put(mergeGeometries(coals), mats.coalGlow, false);
    put(mergeGeometries(hot), mats.heat, false);
    // The chimney behind (outside the wall), soot-capped.
    const chim = [];
    const cap = [];
    for (const cxp of great ? [-OW * 0.7, OW * 0.7] : [0]) {
      chim.push(new BoxGeometry(0.8 * k, 2.6 * k, 0.8).translate(cxp, FH + 1.3 * k, ZB + 0.5));
      cap.push(new BoxGeometry(0.98 * k, 0.16 * k, 0.98).translate(cxp, FH + 2.6 * k + 0.08 * k, ZB + 0.5));
      cap.push(new BoxGeometry(0.82 * k, 0.5 * k, 0.04).translate(cxp, FH + 2.2 * k, ZB + 0.92)); // soot streak
    }
    put(mergeGeometries(chim), mats.kbrick);
    put(mergeGeometries(cap), mats.soot, DETAIL_INK_PX);
    // The fire (the arena's flame family: flame, halo, pool, embers, maybe a
    // real light) sits in the mouth, just over the sill.
    emitters.push({ kind: 'flame', x: wx(0, ZF + 0.05), y: 0.08 * k, z: wz(0, ZF + 0.05) });
    shadows.push({ x: wx(0, ZF * 0.5), z: wz(0, ZF * 0.5), rx: OW + PW, rz: 0.5, yaw });
    for (const sx of [-1, 1]) footprints.push({ x: wx(sx * (OW + PW / 2), 0), z: wz(sx * (OW + PW / 2), 0), r: PW * 0.8 });
    footprints.push({ x: wx(0, ZF), z: wz(0, ZF), r: OW * 0.9 });
    return null;
  }

  if (kind === 'flue') {
    const k = rad / 0.8;
    const BW = 0.62 * k; // half the breast's width
    const BHh = 2.9 * k;
    const ZF = 0.34;
    const ZB = -0.7;
    const OW = 0.3 * k;
    const OH = 0.32 * k;
    const body = [];
    for (const sx of [-1, 1]) body.push(new BoxGeometry(BW - OW, BHh, ZF - ZB).translate(sx * (OW + (BW - OW) / 2), BHh / 2, (ZF + ZB) / 2));
    body.push(new BoxGeometry(OW * 2 + 0.02, BHh - OH - OW, ZF - ZB).translate(0, (BHh + OH + OW) / 2, (ZF + ZB) / 2));
    for (const sx of [-1, 1]) body.push(new BoxGeometry(OW * 0.45, OW * 0.6, ZF - ZB - 0.04).translate(sx * OW * 0.78, OH + OW * 0.45, (ZF + ZB) / 2));
    // The breast steps in near the top (a corbel) and runs on up.
    body.push(new BoxGeometry(BW * 2 + 0.16, 0.14 * k, ZF - ZB + 0.12).translate(0, BHh * 0.62, (ZF + ZB) / 2 + 0.06));
    put(mergeGeometries(body), mats.kbrick);
    put(new BoxGeometry(BW * 2 + 0.12, 0.2 * k, ZF - ZB + 0.1).translate(0, BHh + 0.1 * k, (ZF + ZB) / 2), mats.soot, DETAIL_INK_PX);
    const courses = [];
    for (let c = 1; c < Math.floor(BHh / 0.16); c++) {
      const y = c * 0.16;
      if (y < OH + OW) for (const sx of [-1, 1]) courses.push(new BoxGeometry(BW - OW, 0.02, 0.02).translate(sx * (OW + (BW - OW) / 2), y, ZF + 0.005));
      else courses.push(new BoxGeometry(BW * 2, 0.02, 0.02).translate(0, y, ZF + 0.005));
    }
    put(mergeGeometries(courses), mats.soot, false);
    put(new TorusGeometry(OW + 0.05, 0.08 * k, 4, 10, Math.PI).translate(0, OH, ZF + 0.02), mats.kbrickLit, DETAIL_INK_PX);
    put(mergeGeometries([new BoxGeometry(BW * 0.9, BHh * 0.5, 0.02).translate(0, OH + OW + BHh * 0.25, ZF + 0.012)]), mats.soot, false);
    put(new CylinderGeometry(0.02, 0.02, BW * 2.3, 5).rotateZ(Math.PI / 2).translate(0, BHh * 0.5, ZF + 0.07), mats.kiron, 1.15);
    const tex = kilnMouthTexture();
    const throatMat = new MeshBasicMaterial({ map: tex, toneMapped: false });
    throatMat.color.setRGB(0.58, 0.42, 0.27, LinearSRGBColorSpace);
    const throat = meshInk(root, mergeGeometries([new PlaneGeometry(OW * 2, OH).translate(0, OH / 2, 0), new CircleGeometry(OW, 10, 0, Math.PI).translate(0, OH, 0)]), throatMat, x, z, yaw, false);
    throat.position.set(wx(0, ZF - 0.12), 0, wz(0, ZF - 0.12));
    breathing(throat, throatMat, 1.7, x * 0.7 + z);
    put(mergeGeometries([0, 1, 2, 3].map((i) => new IcosahedronGeometry(0.045, 0).translate(-OW * 0.6 + i * OW * 0.4, 0.06, ZF - 0.1))), mats.coalGlow, false);
    emitters.push({ kind: 'flame', x: wx(0, ZF + 0.08), y: 0.0, z: wz(0, ZF + 0.08) });
    shadows.push({ x: wx(0, ZF * 0.5), z: wz(0, ZF * 0.5), rx: BW + 0.1, rz: 0.4, yaw });
    footprints.push({ x: wx(0, ZF * 0.5), z: wz(0, ZF * 0.5), r: BW });
    return null;
  }

  if (kind === 'castbell' || kind === 'greatcast') {
    const great = kind === 'greatcast';
    const k = rad / (great ? 0.8 : 0.7);
    const crackGroup = (geo, under, gain) => {
      const m = crackMaterial(gain);
      const mesh = new Mesh(geo, m);
      mesh.position.set(x, 0, z);
      mesh.renderOrder = 2;
      root.add(mesh);
      const u = new Mesh(under, crackMaterial(gain * 0.32));
      u.position.copy(mesh.position);
      u.renderOrder = 1;
      root.add(u);
      const base = m.color.clone();
      mesh.onBeforeRender = () => {
        // Still cooling: a slow swell, like the bell's last hum.
        const t = nowSec();
        m.color.copy(base).multiplyScalar(0.84 + 0.16 * Math.sin(t * 0.8 + x) + 0.05 * Math.sin(t * 2.3));
      };
      return m;
    };
    const plain = (geo, mat, ink = PROP_INK_PX) => meshInk(root, geo, mat, x, z, 0, ink);
    if (!great) {
      const BR = 0.42 * k;
      const BH = 0.72 * k;
      const LIP = -0.12 * k; // the mouth sunk in the sand
      // The casting bed: a ring kerb of fire bricks round a bed of sand.
      const kerb = [];
      const KR = 0.72 * k;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        kerb.push(new BoxGeometry(0.3 * k, 0.12 * k, 0.15 * k).rotateY(-a).translate(Math.cos(a) * KR, 0.06 * k, Math.sin(a) * KR));
      }
      plain(mergeGeometries(kerb), mats.kbrick, DETAIL_INK_PX);
      plain(new CylinderGeometry(KR - 0.04, KR - 0.02, 0.1 * k, 20).translate(0, 0.05 * k, 0), mats.sand, false);
      plain(new IcosahedronGeometry(BR * 1.25, 1).scale(1, 0.26, 1).translate(0, 0.1 * k, 0), mats.sand, false);
      plain(mergeGeometries([bellLathe(BR, BH, 18).translate(0, LIP, 0), new BoxGeometry(0.1 * k, 0.1 * k, 0.08 * k).translate(0, LIP + BH + 0.04 * k, 0)]), mats.kbronze);
      plain(
        mergeGeometries([
          new TorusGeometry(bellRadiusAt(BR, 0.62) * 1.01, 0.022 * k, 4, 18).rotateX(Math.PI / 2).translate(0, LIP + BH * 0.62, 0),
          new TorusGeometry(bellRadiusAt(BR, 0.36) * 1.01, 0.018 * k, 4, 18).rotateX(Math.PI / 2).translate(0, LIP + BH * 0.36, 0),
          new TorusGeometry(0.06 * k, 0.018 * k, 4, 10, Math.PI).translate(0, LIP + BH + 0.1 * k, 0),
        ]),
        mats.kbronzeLit,
        false
      );
      // The gantry: two iron-shod timber posts, a beam, the chain down to
      // the crown (this part takes the yaw).
      const GX = 0.86 * k;
      const GH = 1.55 * k;
      put(
        mergeGeometries([
          new BoxGeometry(0.1 * k, GH, 0.1 * k).translate(-GX, GH / 2, 0),
          new BoxGeometry(0.1 * k, GH, 0.1 * k).translate(GX, GH / 2, 0),
          new BoxGeometry(GX * 2 + 0.24 * k, 0.12 * k, 0.12 * k).translate(0, GH, 0),
          new BoxGeometry(0.06 * k, 0.5 * k, 0.06 * k).rotateZ(0.7).translate(-GX + 0.16 * k, GH - 0.18 * k, 0),
          new BoxGeometry(0.06 * k, 0.5 * k, 0.06 * k).rotateZ(-0.7).translate(GX - 0.16 * k, GH - 0.18 * k, 0),
        ]),
        mats.ktimber
      );
      put(mergeGeometries([new BoxGeometry(0.16 * k, 0.12 * k, 0.16 * k).translate(-GX, 0.06 * k, 0), new BoxGeometry(0.16 * k, 0.12 * k, 0.16 * k).translate(GX, 0.06 * k, 0)]), mats.kiron, DETAIL_INK_PX);
      const chain = [];
      const top = GH - 0.06 * k;
      const bot = LIP + BH + 0.14 * k;
      for (let i = 0; i < 6; i++) {
        const y = top - ((top - bot) * (i + 0.5)) / 6;
        chain.push(new TorusGeometry(0.035 * k, 0.01 * k, 3, 8).rotateY(i % 2 ? Math.PI / 2 : 0).translate(0, y, 0));
      }
      plain(mergeGeometries(chain), mats.kiron, false);
      // THE TELL.
      const w = 0.036 * k;
      const seed = 0x4b1 + Math.round(x * 13 + z * 7);
      const tiltY = (g) => g; // the crack runs down the camera-facing (+z) side
      const core = tiltY(bellCrackGeo(BR, BH, LIP, seed, w, 2));
      const under = tiltY(bellCrackGeo(BR, BH, LIP, seed, w * 2.6, 2));
      const m = crackGroup(core, under, 0.9);
      shadows.push({ x, z, rx: KR + 0.2, rz: KR, yaw: 0 });
      footprints.push({ x, z, r: KR + 0.1 });
      emitters.push({ kind: 'monolith', x, y: LIP + BH * 0.55, z: z + BR * 1.1, size: 0.85, halo: 0.28, pool: 1.0 });
      return m;
    }
    // The great cast: brick piers straddling the north wall, an iron-strapped
    // headstock, the great bell hung over the casting pit.
    const PX = 1.62 * k;
    const PH = 2.9 * k;
    const BR = 0.95 * k;
    const BH = 1.6 * k;
    const LIP = 1.02;
    const pw = 0.62 * k;
    const pd = 0.86 * k;
    const piers = [];
    const courses = [];
    const soots = [];
    for (const sx of [-1, 1]) {
      piers.push(new BoxGeometry(pw * 1.4, 0.2 * k, pd * 1.25).translate(sx * PX, 0.1 * k, 0));
      piers.push(new BoxGeometry(pw, PH, pd).translate(sx * PX, PH / 2, 0));
      piers.push(new BoxGeometry(pw * 1.3, 0.14 * k, pd * 1.15).translate(sx * PX, PH + 0.07 * k, 0));
      for (let c = 1; c < 12; c++) courses.push(new BoxGeometry(pw * 1.02, 0.025, pd * 1.02).translate(sx * PX, (PH * c) / 12, 0));
      soots.push(new BoxGeometry(pw * 0.7, PH * 0.4, 0.02).translate(sx * PX, PH * 0.75, pd / 2 + 0.01));
    }
    put(mergeGeometries(piers), mats.kbrick);
    put(mergeGeometries(courses), mats.soot, false);
    put(mergeGeometries(soots), mats.kbrickDark, false);
    const HS = PH - 0.18 * k;
    put(new BoxGeometry(PX * 2 + pw * 0.6, 0.22 * k, 0.26 * k).translate(0, HS, 0), mats.ktimber);
    put(mergeGeometries([-0.62, -0.2, 0.2, 0.62].map((f) => new BoxGeometry(0.05 * k, 0.26 * k, 0.3 * k).translate(f * PX, HS, 0))), mats.kiron, false);
    // The arch over it and a soot-capped keystone.
    put(new TorusGeometry(PX, 0.26 * k, 6, 22, Math.PI).scale(1, 0.92, 1.6).translate(0, PH + 0.14 * k, 0), mats.kbrickLit);
    put(new BoxGeometry(0.34 * k, 0.46 * k, 0.6 * k).translate(0, PH + PX * 0.92 + 0.14 * k, 0), mats.kbrickDark, DETAIL_INK_PX);
    // The bell, its bands, the yoke into the headstock.
    const bellMesh = (geo, mat, ink) => meshInk(root, geo, mat, x, z, yaw, ink);
    bellMesh(bellLathe(BR, BH, 22).translate(0, LIP, 0), mats.kbronze, PROP_INK_PX);
    bellMesh(new TorusGeometry(BR * 0.97, 0.035 * k, 5, 30).rotateX(Math.PI / 2).translate(0, LIP + 0.03 * k, 0), mats.kbronzeLit, false);
    bellMesh(
      mergeGeometries([
        new TorusGeometry(bellRadiusAt(BR, 0.62) * 1.01, 0.03 * k, 4, 28).rotateX(Math.PI / 2).translate(0, LIP + BH * 0.62, 0),
        new TorusGeometry(bellRadiusAt(BR, 0.3) * 1.01, 0.022 * k, 4, 28).rotateX(Math.PI / 2).translate(0, LIP + BH * 0.3, 0),
      ]),
      mats.kbronzeDeep,
      false
    );
    bellMesh(new BoxGeometry(0.26 * BR, HS - (LIP + BH) + 0.04, 0.26 * BR).translate(0, (LIP + BH + HS) / 2, 0), mats.kiron, DETAIL_INK_PX);
    // The casting pit under it: a brick kerb round sand, still faintly gold.
    const kerb = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      kerb.push(new BoxGeometry(0.34 * k, 0.12 * k, 0.16 * k).rotateY(-a).translate(Math.cos(a) * BR * 1.05, 0.06 * k, Math.sin(a) * BR * 1.05));
    }
    put(mergeGeometries(kerb), mats.kbrick, DETAIL_INK_PX);
    put(new CylinderGeometry(BR, BR, 0.08 * k, 22).translate(0, 0.04 * k, 0), mats.sand, false);
    const pitMat = new MeshBasicMaterial({ map: getContactTexture(), transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false });
    const gold = new Color(VFX_MATTER.kilngold);
    pitMat.color.copy(gold).multiplyScalar(0.22);
    const pit = new Mesh(new CircleGeometry(BR * 0.9, 20).rotateX(-Math.PI / 2), pitMat);
    pit.position.set(x, 0.09 * k, z);
    pit.renderOrder = 1;
    root.add(pit);
    // THE TELL.
    const w = 0.05 * k;
    const core = bellCrackGeo(BR, BH, LIP, 0x6b1d, w, 4);
    const under = bellCrackGeo(BR, BH, LIP, 0x6b1d, w * 2.6, 4);
    const m = crackGroup(core, under, 1.0);
    shadows.push({ x, z, rx: PX + pw, rz: pd * 0.9, yaw });
    footprints.push({ x: wx(-PX, 0), z: wz(-PX, 0), r: pw });
    footprints.push({ x: wx(PX, 0), z: wz(PX, 0), r: pw });
    emitters.push({ kind: 'monolith', x: wx(0, BR * 1.05), y: LIP + BH * 0.3, z: wz(0, BR * 1.05), size: 1.3, halo: 0.34, pool: 1.6 });
    return m;
  }
  return null;
}

// The hot crack network's light (env/ground.js kilnCrackNetwork): the same
// strokes the floor painter laid, drawn again on a black canvas in opaque
// greys and laid over the floor ADDITIVELY in kiln gold. It breathes slowly,
// and drives the shared heat / coal materials' breath with it.
function buildKilnCracks(root, spec, mats) {
  if (typeof document === 'undefined') return null;
  const segs = kilnCrackNetwork(spec);
  if (segs.length === 0) return null;
  const W = 1024;
  const H = Math.round(W * (ARENA.halfD / ARENA.halfW));
  const ppu = W / (ARENA.halfW * 2);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const cx = (wx) => (wx + ARENA.halfW) * ppu;
  const cz = (wz) => (wz + ARENA.halfD) * ppu;
  for (const [mul, grey, minPx] of [[4.0, 14, 3], [2.2, 40, 2], [1.0, 120, 1.2], [0.45, 230, 0.8]]) {
    ctx.strokeStyle = `rgb(${grey},${grey},${grey})`;
    for (const sg of segs) {
      ctx.lineWidth = Math.max(minPx, sg.w * mul * ppu);
      ctx.beginPath();
      ctx.moveTo(cx(sg.ax), cz(sg.az));
      ctx.lineTo(cx(sg.bx), cz(sg.bz));
      ctx.stroke();
    }
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new MeshBasicMaterial({
    map: tex,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const base = new Color(VFX_MATTER.kilngold).multiplyScalar(0.62);
  mat.color.copy(base);
  const mesh = new Mesh(new PlaneGeometry(ARENA.halfW * 2, ARENA.halfD * 2), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.004;
  mesh.renderOrder = ORDER.pool - 1;
  mesh.name = 'kiln-cracks';
  const heat0 = mats.heat.color.clone();
  const coal0 = mats.coalGlow.color.clone();
  mesh.onBeforeRender = () => {
    const t = nowSec();
    const b = 0.5 + 0.5 * Math.sin(t * 0.9) * Math.sin(t * 0.37 + 1.3);
    mat.color.copy(base).multiplyScalar(0.72 + 0.36 * b);
    mats.heat.color.copy(heat0).multiplyScalar(0.84 + 0.2 * b);
    mats.coalGlow.color.copy(coal0).multiplyScalar(0.8 + 0.32 * (0.5 + 0.5 * Math.sin(t * 1.7 + 0.6)));
  };
  root.add(mesh);
  return mat;
}

// A flat ring lying on the floor (the well's slow sheen).
function RingGeometryLite(r0, r1) {
  const segs = 28;
  const g = new TorusGeometry((r0 + r1) / 2, (r1 - r0) / 2, 2, segs, Math.PI * 1.2);
  g.rotateX(-Math.PI / 2).scale(1, 0.02, 1);
  return g;
}

// The vein network's light: the walk env/ground.js paints into the floor,
// stroked again on a black canvas (opaque greys, so overlaps never bead) and
// laid over the floor ADDITIVELY in the act's pre-compensated violet. It
// breathes with the heart.
function buildVeinGlow(root, spec) {
  if (typeof document === 'undefined') return null;
  const segs = veinNetwork(spec);
  if (segs.length === 0) return null;
  const W = 1536;
  const H = Math.round(W * (ARENA.halfD / ARENA.halfW));
  const ppu = W / (ARENA.halfW * 2);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const cx = (wx) => (wx + ARENA.halfW) * ppu;
  const cz = (wz) => (wz + ARENA.halfD) * ppu;
  for (const [mul, grey, minPx] of [[3.6, 10, 3], [2.4, 22, 2.4], [1.5, 48, 1.8], [0.85, 100, 1.3], [0.42, 180, 0.9]]) {
    ctx.strokeStyle = `rgb(${grey},${grey},${grey})`;
    for (const sg of segs) {
      ctx.lineWidth = Math.max(minPx, sg.w * mul * ppu);
      ctx.beginPath();
      ctx.moveTo(cx(sg.ax), cz(sg.az));
      ctx.lineTo(cx(sg.bx), cz(sg.bz));
      ctx.stroke();
    }
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new MeshBasicMaterial({
    map: tex,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const GAIN = 0.22;
  const base = new Color().setRGB(VEIN_LINEAR[0] * GAIN * 0.8, VEIN_LINEAR[1] * GAIN * 0.66, VEIN_LINEAR[2] * GAIN, LinearSRGBColorSpace);
  mat.color.copy(base);
  const mesh = new Mesh(new PlaneGeometry(ARENA.halfW * 2, ARENA.halfD * 2), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.004;
  mesh.renderOrder = ORDER.pool - 1;
  mesh.name = 'heart-veins';
  mesh.onBeforeRender = () => {
    const b = heartBeat(nowSec() + 0.12);
    mat.color.copy(base).multiplyScalar(0.72 + 0.34 * b);
  };
  root.add(mesh);
  return mat;
}

// ---------------------------------------------------------------------------
// Cluster expansion: authored anchors -> 2-4 scattered props with scale jitter.
// ---------------------------------------------------------------------------
function expandClusters(spec, cosmetic, types, seedDiscs = [], clusters = spec.clusters) {
  const byType = new Map();
  const r = (a, b) => cosmetic.range(a, b);
  // Certification fix round 1: the run arenas now carry clusters INSIDE the
  // frame (every frame edge, not just the top wall), some of them near the
  // beaten track, so a prop is also rejected when its footprint would sit on
  // the dirt. Opt-in per spec (`propsAvoidPaths`) so the camp's authored
  // scatter -- verified by its own road sweep -- keeps its exact draw order.
  const avoidPaths = !!spec.propsAvoidPaths && Array.isArray(spec.paths);
  // The wall's inner face is exactly the playfield rect (walls.js builds
  // outward from it), so a prop must keep its whole footprint inside it or it
  // clips through the wall base — critique F5's "jagged seam where crate, grass
  // and outside-rock all meet".
  const placedDiscs = seedDiscs.slice();
  const fits = (x, z, rad) => {
    if (Math.abs(x) + rad > ARENA.halfW - 0.06) return false;
    if (Math.abs(z) + rad > ARENA.halfD - 0.06) return false;
    if (avoidPaths && pathClearance(spec, x, z) < rad + 0.12) return false;
    for (const d of placedDiscs) {
      // Silhouettes may TOUCH (0.86 of the summed radii) but never interpenetrate.
      if (Math.hypot(x - d.x, z - d.z) < (rad + d.r) * 0.86) return false;
    }
    return true;
  };

  for (const [ax, az, spread, recipe] of clusters ?? []) {
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
    // Brazier bowls only: charcoal-heavy iron. The bowl sits INSIDE its own
    // pool + halo + bloom wash, and ordinary iron came out as a featureless
    // tan lump — the emitter must survive as a dark silhouette to attribute
    // the pool (baseline-v030 F1).
    ironDark: toonMaterial({ color: mix(ENV.iron, new Color(PALETTE.voidCharcoal), 0.6) }),
    glass: new MeshBasicMaterial({ color: new Color(ENV.glassLit), toneMapped: false }),
    // Moss / bush hue offsets are spec-tunable (certification fix round 1):
    // the Act-1 variants pull them DOWN so no foliage renders inside the
    // reserved h110-150 heal band; the camp keeps the original offsets.
    moss: toonMaterial({ color: hslColor(spec.ground.h + (spec.ground.mossOff ?? 18), 0.4, 0.215) }),
    bush: toonMaterial({ color: hslColor(spec.ground.h + (spec.ground.bushOff ?? 26), 0.34, 0.19) }),
    bushLit: toonMaterial({ color: hslColor(spec.ground.h + (spec.ground.bushLitOff ?? 6), 0.42, 0.245) }),
    // Cloth for banners / the stall canopy: the COOL family (sage pulled
    // toward the indigo ambient) and a warm off-white canvas one value step
    // apart, so no cloth ever borrows a reserved accent.
    cloth: toonMaterial({ color: shade(mix(PALETTE.sageCloak, COOL.ambient, 0.45), 0.9) }),
    trim: toonMaterial({ color: shade(mix(PALETTE.bone, COOL.mist, 0.35), 0.5) }),
    canvas: toonMaterial({ color: shade(mix(mix(PALETTE.bone, PALETTE.warmGrey, 0.42), COOL.mist, 0.2), 0.62) }),
    canvasShade: toonMaterial({ color: shade(mix(mix(PALETTE.bone, PALETTE.warmGrey, 0.42), COOL.ambient, 0.42), 0.5) }),
  };
  // GAUNTLET biome material families (M4b): a spec may OVERRIDE any of the
  // base tones (`spec.mats`, colour values) and switch on a biome family
  // (`spec.propFamily`: 'mill' | 'barrow'). Act I passes neither.
  if (spec.mats) {
    for (const [k, c] of Object.entries(spec.mats)) if (mats[k]) mats[k].color.copy(new Color(c));
  }
  if (spec.propFamily === 'mill') {
    mats.wetWood = toonMaterial({ color: shade(mix(mix(PALETTE.bruiseUmber, COOL.mist, 0.42), PALETTE.warmGrey, 0.2), 0.5) });
    mats.wetWoodDark = toonMaterial({ color: shade(mix(mix(PALETTE.bruiseUmber, COOL.ambient, 0.5), PALETTE.voidCharcoal, 0.2), 0.7) });
    mats.reed = toonMaterial({ color: hslColor(84, 0.34, 0.24) });
    mats.rope = toonMaterial({ color: shade(mix(PALETTE.bone, PALETTE.paleGold, 0.3), 0.55) });
  }
  if (spec.propFamily === 'heart') {
    mats.crystal = toonMaterial({ color: hslColor(268, 0.5, 0.46), emissive: hslColor(268, 0.6, 0.3), emissiveIntensity: 0.55 });
    mats.crystalLit = toonMaterial({ color: hslColor(262, 0.46, 0.72), emissive: hslColor(264, 0.55, 0.42), emissiveIntensity: 0.5 });
    mats.crystalDeep = toonMaterial({ color: hslColor(276, 0.42, 0.26), emissive: hslColor(272, 0.5, 0.22), emissiveIntensity: 0.4 });
    mats.heartRock = toonMaterial({ color: hslColor(282, 0.12, 0.15) });
    mats.heartRockLit = toonMaterial({ color: hslColor(296, 0.1, 0.25) });
    mats.flesh = toonMaterial({ color: hslColor(338, 0.3, 0.3) });
    mats.fleshLit = toonMaterial({ color: hslColor(342, 0.3, 0.42) });
    mats.fleshDark = toonMaterial({ color: hslColor(328, 0.28, 0.16) });
    mats.root = toonMaterial({ color: hslColor(318, 0.16, 0.17) });
    mats.rootLit = toonMaterial({ color: hslColor(326, 0.17, 0.27) });
    mats.bone = toonMaterial({ color: shade(mix(PALETTE.bone, COOL.mist, 0.22), 0.66) });
    mats.vein = veinMaterial(0.72);
  }
  if (spec.propFamily === 'spire') {
    mats.lime = toonMaterial({ color: hslColor(40, 0.07, 0.47) });
    mats.limeLit = toonMaterial({ color: hslColor(42, 0.08, 0.56) });
    mats.limeShade = toonMaterial({ color: hslColor(214, 0.06, 0.38) });
    mats.limeDark = toonMaterial({ color: hslColor(220, 0.08, 0.32) });
    mats.rime = toonMaterial({ color: hslColor(204, 0.3, 0.8), emissive: hslColor(204, 0.4, 0.5), emissiveIntensity: 0.04 });
    mats.bronze = toonMaterial({ color: hslColor(40, 0.36, 0.4) });
    mats.bronzeLit = toonMaterial({ color: hslColor(44, 0.4, 0.58) });
    mats.bronzeDeep = toonMaterial({ color: hslColor(36, 0.3, 0.12) });
    mats.verdigris = toonMaterial({ color: hslColor(176, 0.2, 0.42) });
    mats.timber = toonMaterial({ color: hslColor(30, 0.1, 0.26) });
    mats.timberDark = toonMaterial({ color: hslColor(222, 0.1, 0.17) });
    mats.hemp = toonMaterial({ color: hslColor(40, 0.22, 0.46) });
    mats.hempDark = toonMaterial({ color: hslColor(38, 0.18, 0.3) });
    mats.sail = toonMaterial({ color: hslColor(42, 0.16, 0.72) });
    mats.slateCloth = toonMaterial({ color: hslColor(224, 0.24, 0.32) });
    mats.feather = toonMaterial({ color: hslColor(210, 0.06, 0.82) });
    mats.featherDark = toonMaterial({ color: hslColor(222, 0.1, 0.28) });
  }
  if (spec.propFamily === 'kiln') {
    // The Ember Kiln (env/biomes/kiln.js): low-chroma fire brick, clay, slag
    // and soot; the heat unlit KILN GOLD, the banked coals unlit CRIMSON.
    mats.kbrick = toonMaterial({ color: hslColor(14, 0.16, 0.3) });
    mats.kbrickLit = toonMaterial({ color: hslColor(22, 0.18, 0.4) });
    mats.kbrickDark = toonMaterial({ color: hslColor(20, 0.08, 0.13) });
    mats.soot = toonMaterial({ color: hslColor(24, 0.05, 0.08) });
    mats.clay = toonMaterial({ color: hslColor(30, 0.22, 0.42) });
    mats.clayDark = toonMaterial({ color: hslColor(26, 0.18, 0.26) });
    mats.clayPale = toonMaterial({ color: hslColor(36, 0.18, 0.56) });
    mats.sand = toonMaterial({ color: hslColor(38, 0.2, 0.44) });
    mats.slag = toonMaterial({ color: hslColor(24, 0.05, 0.15) });
    mats.slagLit = toonMaterial({ color: hslColor(30, 0.06, 0.3) });
    mats.kbronze = toonMaterial({ color: hslColor(38, 0.4, 0.38) });
    mats.kbronzeLit = toonMaterial({ color: hslColor(42, 0.45, 0.56) });
    mats.kbronzeDeep = toonMaterial({ color: hslColor(34, 0.3, 0.14) });
    mats.ktimber = toonMaterial({ color: hslColor(26, 0.14, 0.22) });
    mats.ktimberDark = toonMaterial({ color: hslColor(22, 0.1, 0.13) });
    mats.kiron = toonMaterial({ color: hslColor(24, 0.04, 0.2) });
    mats.glazeBlue = toonMaterial({ color: hslColor(208, 0.34, 0.42) });
    mats.glazeCream = toonMaterial({ color: hslColor(44, 0.22, 0.7) });
    mats.glazeOchre = toonMaterial({ color: hslColor(40, 0.46, 0.44) });
    mats.glazeTeal = toonMaterial({ color: hslColor(186, 0.3, 0.34) });
    mats.heat = new MeshBasicMaterial({ color: new Color(VFX_MATTER.kilngold).multiplyScalar(0.95), toneMapped: false });
    mats.coalGlow = new MeshBasicMaterial({ color: new Color(VFX_MATTER.coal).multiplyScalar(2.4), toneMapped: false });
  }
  if (spec.propFamily === 'barrow') {
    mats.boneStone = toonMaterial({ color: shade(mix(PALETTE.bone, COOL.mist, 0.18), 0.62) });
    mats.boneStoneLit = toonMaterial({ color: shade(mix(PALETTE.bone, PALETTE.parchment, 0.2), 0.72) });
    mats.boneStoneDark = toonMaterial({ color: shade(mix(PALETTE.bone, COOL.ambient, 0.35), 0.44) });
    mats.lichen = toonMaterial({ color: hslColor(44, 0.3, 0.3) });
    mats.ochreTurf = toonMaterial({ color: hslColor(42, 0.3, 0.22) });
  }

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
  const brazierT = (spec.braziers ?? []).map(([x, z]) => {
    const sc = r(0.95, 1.1);
    return {
      x: clampIn(x, ARENA.halfW, types.brazier.foot * sc),
      z: clampIn(z, ARENA.halfD, types.brazier.foot * sc),
      yaw: r(0, Math.PI * 2),
      s: sc,
    };
  });
  // Act IV crystal spires (the heart's light sources) keep their authored
  // positions like the fire bowls they replace.
  const crystalT = types.crystalspire
    ? (spec.crystals ?? []).map(([x, z]) => {
        const sc = r(0.95, 1.15);
        return {
          x: clampIn(x, ARENA.halfW, types.crystalspire.foot * sc),
          z: clampIn(z, ARENA.halfD, types.crystalspire.foot * sc),
          yaw: r(0, Math.PI * 2),
          s: sc,
        };
      })
    : [];
  const seedDiscs = [
    ...crystalT.map((t) => ({ x: t.x, z: t.z, r: types.crystalspire.foot * t.s + 0.3 })),
    ...(spec.landmarks ?? []).map(([x, z, rad]) => ({ x, z, r: rad })),
    ...torchT.map((t) => ({ x: t.x, z: t.z, r: types.torch.foot * t.s + 0.28 })),
    ...lanternT.map((t) => ({ x: t.x, z: t.z, r: types.lantern.foot + 0.3 })),
    ...brazierT.map((t) => ({ x: t.x, z: t.z, r: types.brazier.foot * t.s + 0.3 })),
  ];
  if (spec.monolith) {
    seedDiscs.push({ x: spec.monolith[0], z: spec.monolith[1], r: 0.86 });
  }
  if (spec.millwheel) seedDiscs.push({ x: spec.millwheel[0], z: spec.millwheel[1], r: 1.15 });
  if (spec.veinStones) seedDiscs.push({ x: spec.veinStones[0], z: spec.veinStones[1], r: 1.3 });
  // Act V belfry ropes keep their authored spots too.
  if (mats.lime) for (const [x, z] of spec.ropes ?? []) seedDiscs.push({ x, z, r: 0.25 });

  const { byType: placed, placedDiscs } = expandClusters(spec, cosmetic, types, seedDiscs);
  placed.set('torch', torchT);
  placed.set('lantern', lanternT);
  if (brazierT.length > 0) placed.set('brazier', brazierT);
  if (crystalT.length > 0) placed.set('crystalspire', [...(placed.get('crystalspire') ?? []), ...crystalT]);

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
  // GAUNTLET act tells (one violet corruption tell per biome, §23.1): the
  // Sunken Mill's veined mill wheel, the Ashen Barrow's veined standing stones.
  if (spec.millwheel) {
    monolithMat = buildMillWheel(root, spec.millwheel, shadows, emitters, cosmetic, footprints, mats);
    typeCount += 1;
  }
  if (spec.veinStones) {
    monolithMat = buildVeinStones(root, spec.veinStones, shadows, emitters, cosmetic, footprints, mats, types);
    typeCount += 1;
  }

  // Act IV: the layout's built landmarks (the beating heart, the root gate,
  // the great geodes, the weeping wells) and the glowing vein network laid
  // over the painted floor veins.
  for (const lm of spec.landmarks ?? []) {
    const m = buildLandmark(root, lm, shadows, emitters, footprints, mats, cosmetic);
    if (m) monolithMat = monolithMat ?? m;
    typeCount += 1;
  }
  if (spec.veinNet) buildVeinGlow(root, spec);
  if (mats.lime && spec.ropes) buildRopes(root, spec.ropes, mats, footprints);
  if (mats.kbrick && spec.ground?.kiln) buildKilnCracks(root, spec, mats);

  // Per-room dressing (boss ring, shop stall) -- hidden groups the run's
  // `room_enter` events reveal; see env/dressing.js. Placement continues the
  // base pass's rejection table so nothing overlaps a base prop.
  const dressing = buildRoomDressing(root, spec, cosmetic, {
    types,
    mats,
    place: (clusters, seedDiscs) => expandClusters(spec, cosmetic, types, seedDiscs, clusters),
    mount: (group, byType) => {
      const gShadows = [];
      const gFoot = [];
      for (const [name, transforms] of byType) {
        const def = types[name];
        if (!def || transforms.length === 0) continue;
        addInstancedProp(group, def.layers, transforms);
        for (const t of transforms) {
          const sc = t.s ?? 1;
          gShadows.push({
            x: t.x,
            z: t.z,
            rx: def.foot * sc * SHADOW_SPREAD,
            rz: (def.rz ?? def.foot) * sc * SHADOW_SPREAD,
            yaw: t.yaw,
            faint: !!def.faint,
          });
          gFoot.push({ x: t.x, z: t.z, r: Math.max(def.foot, def.rz ?? 0) * sc + 0.16 });
        }
      }
      return { shadows: gShadows, footprints: gFoot, addInstanced: addInstancedProp };
    },
    buildShadows: buildShadowInstances,
    placedSeed: placedDiscs,
  });
  footprints.push(...dressing.footprints);

  // Distinct prop silhouettes placed: slab, stump, fence, crate, barrel, log,
  // bush, boulder, cairn, torch post, lantern, monolith, and (fix round 1)
  // tower, banner, barricade (reference bar check 4 needs >=8 in a combat
  // arena; typeCount reports the live number per variant).
  // (roomDressingDispose — CAMPAIGN, PLAN §12.5: a torn-down dressing's room
  // groups stop watching the run.)
  return { emitters, shadows, footprints, mats, typeCount, monolithMat, dressing: dressing.info, roomDressingDispose: dressing.dispose };
}
