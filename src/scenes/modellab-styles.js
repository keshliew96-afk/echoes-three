// MODEL LAB, ART STYLES (docs/MODEL_STANDARD.md "Art style study"). A
// comparison tab, not a feature: the same Healer rig five times in a row, the
// game's look today beside four candidate styles, so Kesh can compare them on
// one model before the launch plan picks one. Harness builds only (the model
// lab is dev-only); nothing here runs in the player build, and the game's own
// rigs, materials and lights are untouched outside this tab.
//
//   facet     the game today: faceted toon, 3 bands, 2.7 px ink
//   polished  the same faceted low-poly model, lit the way the FPS-video
//             study found (fps-video-study/STUDY.md): physically lit facets
//             (cloth matte, pewter metal), a soft environment light and a
//             real sun shadow on the floor; ink kept
//   smooth    smooth-shaded toon: the same 3-band ramp and ink on smooth,
//             welded surfaces (no facets)
//   voxel     chunky voxel: every part rebuilt from cubes of one world size
//             (snapped on its own surface, so the rig still animates), flat
//             toon light, no ink
//   painted   painted hand-made textures: soft light, a brush-stroke texture
//             laid on every part (triplanar, no UVs needed), a painted top
//             light and cool shadow toward the feet, no ink
//
// restyle(group, style) is exported for the shot tool, which dresses the
// party in a real Level I fight the same way (tools/art-styles-shots.mjs).
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  Matrix4,
  MeshLambertMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  PCFSoftShadowMap,
  PMREMGenerator,
  RepeatWrapping,
  Vector3,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from '../data/palette.js';
import { mix } from '../render/critters/common.js';
import { createCritter } from '../render/critters/index.js';
import { FACET_HEROES } from '../render/facet/heroes.js';
import { hash01 } from '../render/facet/material.js';
import { getGradientMap } from '../render/toon.js';

export const ART_STYLES = Object.freeze([
  ['facet', 'Now: faceted toon'],
  ['polished', '1 Polished faceted'],
  ['smooth', '2 Smooth toon + ink'],
  ['voxel', '3 Chunky voxel'],
  ['painted', '4 Painted textures'],
]);

// Tuning (lab only).
const T = Object.freeze({
  spacing: 1.35, // u between the mice in the row
  roughCloth: 0.78,
  roughMetal: 0.36,
  env: 0.1, // environment light on the polished facets (the stage key and fill already light them)
  pbrAlbedo: 0.72, // physically lit albedo, scaled so Bone and Parchment parts sit under the bloom like the toon ones
  voxelFace: 1.12, // the face decal's push out over the cubes
  voxel: 0.055, // u, one cube's edge in the world
  brushScale: 6.5, // brush texture repeats per u
  brushLo: 0.8, // brush texture darkest multiplier
  brushHi: 1.12,
  paintTop: 0.2, // lift toward Parchment at the top of the model
  paintLow: 0.3, // fall toward a cool dark at the feet
  paintHeight: 0.95, // u, the mouse's ears
  shadowMap: 2048,
});

// --- Smooth twin of a faceted geometry (welded, averaged normals).
const smoothCache = new WeakMap();
function smoothGeo(g) {
  let s = smoothCache.get(g);
  if (s) return s;
  s = g.clone();
  for (const k of Object.keys(s.attributes)) if (k !== 'position') s.deleteAttribute(k);
  s = mergeVertices(s, 1e-4);
  s.computeVertexNormals();
  smoothCache.set(g, s);
  return s;
}

// --- Voxel twin: the surface sampled into cells of `cell` (local units per
// axis, so the cubes come out one size in the world), with only the faces
// that meet an empty cell kept.
const voxelCache = new WeakMap();
const FACES = [
  [1, 0, 0, [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]]],
  [-1, 0, 0, [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]]],
  [0, 1, 0, [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]]],
  [0, -1, 0, [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]],
  [0, 0, 1, [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]]],
  [0, 0, -1, [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]],
];
function voxelGeo(g, cell) {
  const key = `${cell.x.toFixed(4)},${cell.y.toFixed(4)},${cell.z.toFixed(4)}`;
  let per = voxelCache.get(g);
  if (!per) voxelCache.set(g, (per = new Map()));
  if (per.has(key)) return per.get(key);
  const src = g.index ? g.toNonIndexed() : g;
  const p = src.attributes.position;
  const cells = new Set();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const q = new Vector3();
  const minC = Math.min(cell.x, cell.y, cell.z);
  for (let i = 0; i + 2 < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    const edge = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
    const n = Math.min(80, Math.max(1, Math.ceil(edge / (minC * 0.5))));
    for (let u = 0; u <= n; u++)
      for (let v = 0; v <= n - u; v++) {
        const w = n - u - v;
        q.set(0, 0, 0).addScaledVector(a, u / n).addScaledVector(b, v / n).addScaledVector(c, w / n);
        cells.add(`${Math.floor(q.x / cell.x)},${Math.floor(q.y / cell.y)},${Math.floor(q.z / cell.z)}`);
      }
  }
  const pos = [];
  const nor = [];
  for (const k of cells) {
    const [x, y, z] = k.split(',').map(Number);
    for (const [nx, ny, nz, quad] of FACES) {
      if (cells.has(`${x + nx},${y + ny},${z + nz}`)) continue;
      const v = quad.map(([ox, oy, oz]) => [(x + ox) * cell.x, (y + oy) * cell.y, (z + oz) * cell.z]);
      for (const idx of [0, 1, 2, 0, 2, 3]) {
        pos.push(...v[idx]);
        nor.push(nx, ny, nz);
      }
    }
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  out.computeBoundingSphere();
  per.set(key, out);
  return out;
}

// --- Painted vertex colours: a top-light lift and a cool fall toward the
// feet, in the model's own height.
function paintGeo(g, mesh, root) {
  const out = g.clone();
  const pos = out.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const v = new Vector3();
  const warm = new Color(PALETTE.parchment);
  const cool = new Color(PALETTE.signalBlue).lerp(new Color(PALETTE.voidCharcoal), 0.6);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (!mesh.isInstancedMesh) {
      mesh.localToWorld(v);
      root.worldToLocal(v);
    }
    const u = Math.min(1, Math.max(0, v.y / T.paintHeight));
    c.setRGB(1, 1, 1);
    if (u > 0.55) c.lerp(warm, ((u - 0.55) / 0.45) * T.paintTop);
    else c.lerp(cool, (1 - u / 0.55) * T.paintLow);
    col.set([c.r, c.g, c.b], i * 3);
  }
  out.setAttribute('color', new Float32BufferAttribute(col, 3));
  return out;
}

// --- The brush texture: short soft strokes on a mid grey (seeded, so every
// session paints the same canvas).
let brushTex = null;
function brushTexture() {
  if (brushTex) return brushTex;
  if (typeof document === 'undefined') return null;
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgb(160,160,160)';
  g.fillRect(0, 0, S, S);
  g.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    const x = hash01(i, 1) * S;
    const y = hash01(i, 2) * S;
    const ang = -0.5 + hash01(i, 3) * 1.0;
    const len = 10 + hash01(i, 4) * 26;
    const v = Math.round(90 + hash01(i, 5) * 150);
    g.strokeStyle = `rgba(${v},${v},${v},0.32)`;
    g.lineWidth = 3 + hash01(i, 6) * 7;
    for (const [dx, dy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
      g.beginPath();
      g.moveTo(x + dx, y + dy);
      g.quadraticCurveTo(x + dx + Math.cos(ang) * len * 0.5, y + dy + Math.sin(ang) * len * 0.5 + 3, x + dx + Math.cos(ang) * len, y + dy + Math.sin(ang) * len);
      g.stroke();
    }
  }
  brushTex = new CanvasTexture(cv);
  brushTex.wrapS = brushTex.wrapT = RepeatWrapping;
  return brushTex;
}
// The brush laid triplanar in the part's object space (the rig's parts carry
// no reliable UVs once faceted).
function addBrush(mat, scale) {
  const tex = brushTexture();
  if (!tex) return;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBrush = { value: tex };
    sh.uniforms.uBrushK = { value: new Vector3(scale.x * T.brushScale, scale.y * T.brushScale, scale.z * T.brushScale) };
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'varying vec3 vObjP; varying vec3 vObjN;\nvoid main() {')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vObjP = position; vObjN = normal;
        #ifdef USE_INSTANCING
          vObjP = (instanceMatrix * vec4(position, 1.0)).xyz;
          vObjN = mat3(instanceMatrix) * normal;
        #endif`
      );
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', `uniform sampler2D uBrush; uniform vec3 uBrushK; varying vec3 vObjP; varying vec3 vObjN;\nvoid main() {`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 bw = abs(normalize(vObjN)); bw = pow(bw, vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
        vec3 sp = vObjP * uBrushK;
        float br = texture2D(uBrush, sp.yz).r * bw.x + texture2D(uBrush, sp.xz).r * bw.y + texture2D(uBrush, sp.xy).r * bw.z;
        diffuseColor.rgb *= mix(${T.brushLo.toFixed(3)}, ${T.brushHi.toFixed(3)}, smoothstep(0.35, 0.8, br));`
      );
  };
  mat.customProgramCacheKey = () => 'art-brush';
}

let envTex = null;
function envMap(renderer) {
  if (envTex || !renderer) return envTex;
  const pm = new PMREMGenerator(renderer);
  envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  return envTex;
}

// the Healer's pewter (healerfacet.js pewterHex), the one metal on the rig
const PEWTER = mix(PALETTE.bone, PALETTE.voidCharcoal, 0.42).lerp(new Color(PALETTE.signalBlue), 0.06).getHex();
const isInk = (o) => o.isMesh && o.material && o.material.isShaderMaterial && /-ink$/.test(o.name);
const ws = new Vector3();
const im = new Matrix4();
const is = new Vector3();
// a part's world scale (an instanced row's first instance included)
function partScale(o) {
  o.getWorldScale(ws);
  if (o.isInstancedMesh && o.count > 0) {
    o.getMatrixAt(0, im);
    is.setFromMatrixScale(im);
    ws.multiply(is);
  }
  return new Vector3(Math.max(1e-3, Math.abs(ws.x)), Math.max(1e-3, Math.abs(ws.y)), Math.max(1e-3, Math.abs(ws.z)));
}

// restyle(group, style, { renderer }) — dress every toon part of a rig in a
// style. The originals are kept on first call, so 'facet' restores the
// game's own look exactly.
export function restyle(group, style, { renderer = null } = {}) {
  group.updateMatrixWorld(true);
  const parts = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.userData.artOrig) o.userData.artOrig = { material: o.material, geometry: o.geometry, castShadow: o.castShadow, visible: o.visible, scale: o.scale.clone() };
    parts.push(o);
  });
  const noInk = style === 'voxel' || style === 'painted';
  for (const o of parts) {
    const orig = o.userData.artOrig;
    o.material = orig.material;
    o.geometry = orig.geometry;
    o.castShadow = orig.castShadow;
    o.scale.copy(orig.scale);
    // the painted face rides out over the voxel head's cubes
    if (style === 'voxel' && o.material && o.material.isMeshBasicMaterial && o.material.map) o.scale.multiplyScalar(T.voxelFace);
    if (isInk(o)) {
      o.visible = orig.visible && !noInk;
      continue;
    }
    const src = orig.material;
    if (!src || !src.isMeshToonMaterial || style === 'facet') continue;
    const base = src.color.clone();
    const common = { transparent: src.transparent, opacity: src.opacity, side: src.side };
    const isMetal = base.getHex() === PEWTER; // the claw setting round the gem
    if (style === 'polished') {
      o.material = new MeshStandardMaterial({
        color: base.clone().multiplyScalar(T.pbrAlbedo),
        vertexColors: !!orig.geometry.attributes.color,
        flatShading: true,
        roughness: isMetal ? T.roughMetal : T.roughCloth,
        metalness: isMetal ? 0.75 : 0,
        envMap: envMap(renderer),
        envMapIntensity: T.env,
        ...common,
      });
      o.castShadow = true;
    } else if (style === 'smooth') {
      o.geometry = smoothGeo(orig.geometry);
      o.material = new MeshToonMaterial({ color: base, gradientMap: getGradientMap(), ...common });
    } else if (style === 'voxel') {
      const s = partScale(o);
      const g0 = orig.geometry;
      if (!g0.boundingSphere) g0.computeBoundingSphere();
      // a part under ~2 cubes across (the nose, the beads) stays as it is
      if (g0.boundingSphere.radius * 2 * Math.max(s.x, s.y, s.z) < T.voxel * 2.2) continue;
      o.geometry = voxelGeo(orig.geometry, new Vector3(T.voxel / s.x, T.voxel / s.y, T.voxel / s.z));
      o.material = new MeshToonMaterial({ color: base, gradientMap: getGradientMap(), ...common });
    } else if (style === 'painted') {
      o.geometry = paintGeo(smoothGeo(orig.geometry), o, group);
      const m = new MeshLambertMaterial({ color: base, vertexColors: true, ...common });
      addBrush(m, partScale(o));
      o.material = m;
    }
  }
  return group;
}

// The sun shadow for the polished style: the stage's key light casts while
// the tab shows (lab only) and stops when the tab is left.
export function sunShadows(stage, on, receivers = []) {
  const r = stage.renderer;
  let key = null;
  stage.scene.traverse((o) => {
    if (!key && o instanceof DirectionalLight) key = o;
  });
  if (!key) return;
  if (on && !r.shadowMap.enabled) {
    r.shadowMap.enabled = true;
    r.shadowMap.type = PCFSoftShadowMap;
  }
  key.castShadow = on;
  if (on) {
    key.shadow.mapSize.set(T.shadowMap, T.shadowMap);
    const cam = key.shadow.camera;
    cam.left = cam.bottom = -8;
    cam.right = cam.top = 8;
    cam.near = 0.5;
    cam.far = 40;
    cam.updateProjectionMatrix();
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.02;
  }
  for (const m of receivers) m.receiveShadow = on;
}

const HEALER = FACET_HEROES.find((h) => h.id === 'healer');
const NAMES = ART_STYLES.map((s) => s[1]).join(' | ');

export const LAB_ENTRIES = [
  {
    id: 'styles',
    label: 'Art styles',
    abilities: [
      ['rest', 'Rest'],
      ['combo', 'Basic combo'],
    ],
    frame: { y: 0.5, z: 0, dist: 8.2, speed: 0, loop: 0 },
    build({ cosmetic, stage }) {
      const holder = new Group();
      holder.name = 'modellab-styles';
      const rigs = ART_STYLES.map(([id], i) => {
        const rig = createCritter('healer', { cosmetic });
        rig.group.position.set((i - (ART_STYLES.length - 1) / 2) * T.spacing, 0, 0);
        holder.add(rig.group);
        return { id, rig };
      });
      let dressed = false;
      let shadowOn = false;
      const ground = () => {
        const g = stage && stage.scene.getObjectByName('modellab');
        return g && g.children[0] ? [g.children[0]] : [];
      };
      return {
        group: holder,
        timeline(ability) {
          if (ability === 'combo') return { ...HEALER.comboLab, label: 'Basic combo', readout: (t) => `${t.toFixed(1)}s · ${HEALER.comboLab.at(t).label} · ${NAMES}` };
          return { label: 'Rest', duration: 2, sample: () => ({ label: 'rest' }), readout: () => NAMES };
        },
        cues: () => [],
        update(state, dt, abT) {
          if (!dressed) {
            for (const r of rigs) restyle(r.rig.group, r.id, { renderer: stage && stage.renderer });
            dressed = true;
          }
          if (stage && !shadowOn) {
            sunShadows(stage, true, ground());
            shadowOn = true;
          }
          const playing = state.mode === 'ability' || (state.mode === 'still' && state.t > 0);
          for (const { rig } of rigs) {
            if (playing && state.ability === 'combo') {
              const c = HEALER.comboLab.at(abT);
              rig.lab.override = { kind: 'hit', n: c.n, t: c.t, fresh: c.fresh, recoil: c.recoil, shot: c.shot };
              rig.setAnim('cast');
            } else {
              rig.lab.override = null;
              rig.setAnim(state.mode === 'move' ? 'walk' : 'idle');
            }
            rig.setYaw(0);
            rig.update(dt);
          }
        },
        onCue() {},
        reset() {
          for (const r of rigs) r.rig.setYaw(0);
        },
        hide() {
          if (stage && shadowOn) {
            sunShadows(stage, false, ground());
            shadowOn = false;
          }
        },
        debug: () => ({ styles: ART_STYLES.map((s) => s[0]) }),
      };
    },
  },
];
