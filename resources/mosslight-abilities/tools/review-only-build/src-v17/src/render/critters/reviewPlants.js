// REVIEW-ONLY (never committed, never pushed): Kesh's Tripo models for Mosslight's
// plants (16 Nov) in place of the stand-in shapes on her review page. Elder Oak (S50),
// Oakling (S51), Mending Sapling (S18). Each GLB is one mesh, height 1, front +z.
// The Oakling has no rig in the file: a five-bone skin (root, two legs, two arms) is
// weighted here from the vertex positions so it can walk and slam.
import { Bone, Float32BufferAttribute, Group, Skeleton, SkinnedMesh, Uint16BufferAttribute } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const on = typeof location !== 'undefined' && /[?&]tripo=1\b/.test(location.search);
const got = {};
function first(scene) {
  let m = null;
  scene.traverse((o) => { if (o.isMesh && !m) m = o; });
  return m;
}
if (on) {
  const ld = new GLTFLoader();
  for (const n of ['elderoak', 'oakling', 'sapling', 'spitter', 'puffcap']) ld.loadAsync(`/review/${n}.glb`).then((g) => { got[n] = first(g.scene); prep(n); }).catch(() => {});
}

// The Oakling's skin: bone pivots in model units (height 1).
const BONES = [
  ['root', 0, 0, 0],
  ['legL', -0.08, 0.15, 0],
  ['legR', 0.08, 0.15, 0],
  ['armL', -0.19, 0.38, 0],
  ['armR', 0.19, 0.38, 0],
];
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function prep(n) {
  const m = got[n];
  if (n === 'oakling') {
    const g = m.geometry.clone();
    const p = g.attributes.position, nv = p.count;
    const si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4);
    for (let i = 0; i < nv; i++) {
      const x = p.getX(i), y = p.getY(i);
      const leg = 1 - smooth(0.11, 0.18, y); // feet and legs below the belly
      const arm = y > 0.14 && y < 0.44 ? smooth(0.18, 0.215, Math.abs(x)) * (1 - smooth(0.4, 0.44, y)) : 0;
      const side = x < 0 ? 0 : 1;
      let w0 = 1, b1 = 0, w1 = 0;
      if (leg > arm) { b1 = 1 + side; w1 = leg; } else if (arm > 0) { b1 = 3 + side; w1 = arm; }
      w0 = 1 - w1;
      si.set([0, b1, 0, 0], i * 4);
      sw.set([w0, w1, 0, 0], i * 4);
    }
    g.setAttribute('skinIndex', new Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new Float32BufferAttribute(sw, 4));
    got.oaklingGeo = g;
  }
  if (n === 'elderoak') {
    // The party under the crown stays readable: the crown (above 45% of the height) is
    // drawn dithered at about half strength; the trunk stays solid.
    const mt = m.material.clone();
    mt.alphaHash = true;
    mt.onBeforeCompile = (sh) => {
      sh.vertexShader = 'varying float vOakY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvOakY = position.y;');
      sh.fragmentShader = 'varying float vOakY;\n' + sh.fragmentShader.replace('#include <alphahash_fragment>', 'diffuseColor.a *= mix(1.0, 0.5, smoothstep(0.42, 0.52, vOakY));\n#include <alphahash_fragment>');
    };
    got.oakMat = mt;
  }
}

// Elder Oak: about 3 u tall, crown about 2.7 u wide.
export function makeOak() {
  const m = got.elderoak;
  if (!m || !got.oakMat) return null;
  const g = new Group();
  const mesh = m.clone();
  mesh.material = got.oakMat;
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  g.add(mesh);
  g.scale.setScalar(3.0);
  return g;
}

// Mending Sapling: one model; the caller scales it through three sizes up to 1.3 u.
export function makeSapling() {
  const m = got.sapling;
  if (!m) return null;
  const mesh = m.clone();
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  return mesh;
}

// Spitter (S43): one model, mouth toward +z; the caller turns it and squashes it to spit.
export function makeSpitter() {
  const m = got.spitter;
  if (!m) return null;
  const mesh = m.clone();
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  return mesh;
}

// Puffcap (S24): 0.4 u; the caller breathes it, doubles it when watered and swells it to burst.
export function makePuffcap() {
  const m = got.puffcap;
  if (!m) return null;
  const mesh = m.clone();
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.setScalar(0.4);
  return mesh;
}

// Oakling: 0.6 u tall, with its five bones.
export function makeOakling() {
  const m = got.oakling;
  if (!m || !got.oaklingGeo) return null;
  const bones = BONES.map(([name, x, y, z]) => { const b = new Bone(); b.name = name; b.position.set(x, y, z); return b; });
  for (let i = 1; i < bones.length; i++) bones[0].add(bones[i]);
  const sk = new SkinnedMesh(got.oaklingGeo, m.material);
  sk.add(bones[0]);
  sk.updateMatrixWorld(true);
  sk.bind(new Skeleton(bones));
  sk.frustumCulled = false;
  const g = new Group();
  g.add(sk);
  g.scale.setScalar(0.6);
  const [, legL, legR, armL, armR] = bones;
  return { g, legL, legR, armL, armR };
}
