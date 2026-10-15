// SHRINES (docs/SHRINES.md, content plan 4 slice 9): the five land shrines
// as rigs. Every shrine is an old stone plinth with an offering bowl and a
// lit core in its blessing's colour (render/../data/palette.js
// SHRINE_COLORS), crowned by its land's sign:
//   wood    Antler Shrine   a mossy stone under a pair of bleached antlers
//   mill    Tithe Shrine    an old millstone stood on edge, a tithe box below
//   barrow  Grave Shrine    a leaning grave stele with a bone wreath
//   heart   Geode Shrine    a split geode, violet crystal inside a dark rind
//                           round a keyhole of gold light
//   spire   Wind Shrine     a small bell-cote with a turning weather vane
// A slow glyph ring breathes on the floor round it while it waits. Answered
// (or asleep once the room clears), the core and ring go dark and the bowl
// cools. State shows in the body, never in colour alone: the `ix-` prompt
// carries the words.
import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE, SHRINE_COLORS, VFX_MATTER } from '../../data/palette.js';
import { toonMaterial } from '../toon.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { addInk, groundShadow, exactColor, mix } from '../critters/common.js';
import { impactFx } from '../vfx/hub.js';
import { ENV, hslColor } from '../../env/colors.js';

export const SHRINE_KINDS = Object.freeze(['shrine']);

const BONE = new Color(PALETTE.bone);
const MOSS = hslColor(96, 0.32, 0.3);
const IRON = new Color(VFX_MATTER.iron);
const BRONZE = mix(PALETTE.paleGold, PALETTE.bruiseUmber, 0.45).multiplyScalar(0.9);
const CRYSTAL = new Color(VFX_MATTER.heartcrystal);

function addTo(g, geo, mat, [x, y, z] = [0, 0, 0], ink = true) {
  const m = new Mesh(geo, mat);
  m.position.set(x, y, z);
  if (ink) addInk(m);
  g.add(m);
  return m;
}

// The common plinth: a stepped base, a short drum and a shallow bowl.
function plinth(g, stone, dark) {
  addTo(g, sharedGeo('sh-step', () => new CylinderGeometry(0.5, 0.56, 0.12, 8)), stone, [0, 0.06, 0]);
  addTo(g, sharedGeo('sh-drum', () => new CylinderGeometry(0.3, 0.36, 0.38, 8)), stone, [0, 0.31, 0]);
  const prof = [[0.1, 0], [0.34, 0.04], [0.4, 0.14], [0.34, 0.16], [0.28, 0.08], [0, 0.08]].map(([x, y]) => new Vector2(x, y));
  addTo(g, sharedGeo('sh-bowl', () => new LatheGeometry(prof, 10)), stone, [0, 0.5, 0]);
  const inner = addTo(g, sharedGeo('sh-bowl-in', () => new CircleGeometry(0.29, 14).rotateX(-Math.PI / 2)), dark, [0, 0.585, 0], false);
  return inner;
}

function crownWood(g, c) {
  const moss = toonMaterial({ color: MOSS });
  addTo(g, sharedGeo('sh-wood-moss', () => new IcosahedronGeometry(0.22, 0).scale(1.6, 0.35, 1.2)), moss, [0, 0.13, 0.36]);
  const bone = toonMaterial({ color: BONE });
  // Two antlers: a curved beam (part of a torus) with three tines each.
  const beam = sharedGeo('sh-antler', () => {
    const parts = [new TorusGeometry(0.42, 0.035, 5, 10, Math.PI * 0.62).rotateZ(Math.PI * 0.12)];
    for (const [a, len] of [[0.35, 0.22], [0.8, 0.26], [1.3, 0.18]]) {
      const t = new ConeGeometry(0.025, len, 5);
      t.translate(0, len / 2, 0);
      t.rotateZ(-0.35);
      t.translate(Math.cos(a + 0.38) * 0.42, Math.sin(a + 0.38) * 0.42, 0);
      parts.push(t);
    }
    return mergeGeometries(parts);
  });
  for (const s of [-1, 1]) {
    const m = addTo(g, beam, bone, [s * 0.06, 0.62, -0.05]);
    m.scale.set(s, 1, 1);
    m.rotation.y = s * 0.25;
  }
  void c;
}
function crownMill(g, c, stone) {
  const wheel = addTo(g, sharedGeo('sh-mill-stone', () => new CylinderGeometry(0.42, 0.42, 0.14, 14).rotateX(Math.PI / 2)), stone, [0, 1.02, -0.12]);
  addTo(g, sharedGeo('sh-mill-eye', () => new CylinderGeometry(0.09, 0.09, 0.16, 8).rotateX(Math.PI / 2)), toonMaterial({ color: IRON }), [0, 1.02, -0.12]);
  addTo(g, sharedGeo('sh-mill-box', () => new BoxGeometry(0.3, 0.2, 0.2)), toonMaterial({ color: ENV.barkDark }), [0.42, 0.22, 0.28]);
  addTo(g, sharedGeo('sh-mill-slot', () => new BoxGeometry(0.16, 0.012, 0.03)), new MeshBasicMaterial({ color: exactColor(PALETTE.paleGold), toneMapped: false }), [0.42, 0.327, 0.28], false);
  void c;
  return wheel;
}
function crownBarrow(g, c, stone) {
  const stele = addTo(g, sharedGeo('sh-barrow-stele', () => new BoxGeometry(0.44, 0.9, 0.12)), stone, [0, 1.02, -0.18]);
  stele.rotation.z = 0.07;
  addTo(g, sharedGeo('sh-barrow-cap', () => new CylinderGeometry(0.22, 0.22, 0.12, 10, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2)), stone, [0.03, 1.47, -0.18]);
  const bone = toonMaterial({ color: BONE });
  addTo(g, sharedGeo('sh-barrow-wreath', () => new TorusGeometry(0.17, 0.035, 5, 12)), bone, [0.02, 1.1, -0.1]);
  addTo(g, sharedGeo('sh-barrow-skull', () => new IcosahedronGeometry(0.08, 0).scale(1, 0.9, 0.9)), bone, [0.02, 1.1, -0.08]);
  void c;
}
function crownHeart(g, c) {
  const rind = toonMaterial({ color: hslColor(282, 0.12, 0.17) });
  const crystal = toonMaterial({ color: CRYSTAL, emissive: CRYSTAL, emissiveIntensity: 0.3 });
  for (const s of [-1, 1]) {
    const half = addTo(g, sharedGeo('sh-heart-rind', () => new IcosahedronGeometry(0.34, 0).scale(0.55, 1.15, 0.8)), rind, [s * 0.27, 1.0, -0.08]);
    half.rotation.z = s * 0.28;
    const gem = addTo(g, sharedGeo('sh-heart-gems', () => mergeGeometries([0, 1, 2, 3].map((i) => new ConeGeometry(0.06, 0.22, 5).rotateZ(-1.2 + i * 0.25).translate(0.02, -0.2 + i * 0.13, 0)))), crystal, [s * 0.15, 1.0, -0.02]);
    gem.scale.set(s, 1, 1);
  }
  void c;
}
function crownSpire(g, c, stone) {
  const wood = toonMaterial({ color: ENV.bark });
  for (const s of [-1, 1]) addTo(g, sharedGeo('sh-spire-post', () => new BoxGeometry(0.07, 0.8, 0.07)), stone, [s * 0.3, 0.98, -0.1]);
  addTo(g, sharedGeo('sh-spire-roof', () => new ConeGeometry(0.46, 0.3, 4).rotateY(Math.PI / 4)), wood, [0, 1.52, -0.1]);
  const prof = [[0, 0], [0.05, 0], [0.09, -0.06], [0.12, -0.2], [0.15, -0.26], [0, -0.26]].map(([x, y]) => new Vector2(x, y));
  addTo(g, sharedGeo('sh-spire-bell', () => new LatheGeometry(prof, 10)), toonMaterial({ color: BRONZE }), [0, 1.34, -0.1]);
  const vane = new Group();
  vane.position.set(0, 1.7, -0.1);
  addTo(vane, sharedGeo('sh-spire-vane', () => mergeGeometries([new BoxGeometry(0.42, 0.02, 0.02), new ConeGeometry(0.05, 0.12, 4).rotateZ(-Math.PI / 2).translate(0.24, 0, 0), new BoxGeometry(0.1, 0.1, 0.01).translate(-0.18, 0.03, 0)])), toonMaterial({ color: IRON }));
  g.add(vane);
  void c;
  return vane;
}

export function buildShrineRig(e) {
  const id = SHRINE_COLORS[e.shrine] ? e.shrine : 'wood';
  const c = SHRINE_COLORS[id];
  const g = new Group();
  const stone = toonMaterial({ color: new Color(c.stone) });
  const dark = toonMaterial({ color: new Color(c.stone).multiplyScalar(0.45) });
  plinth(g, stone, dark);
  let vane = null;
  if (id === 'wood') crownWood(g, c);
  else if (id === 'mill') crownMill(g, c, stone);
  else if (id === 'barrow') crownBarrow(g, c, stone);
  else if (id === 'heart') crownHeart(g, c);
  else vane = crownSpire(g, c, stone);
  // The lit core in the bowl and its breath.
  const flameMat = new MeshBasicMaterial({ color: exactColor(c.glow), transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false, blending: AdditiveBlending });
  const flame = addTo(g, sharedGeo('sh-core', () => new IcosahedronGeometry(0.11, 1).scale(1, 1.5, 1)), flameMat, [0, 0.72, 0], false);
  const glow = makeGlowSprite({ color: c.glow, size: 1.3, opacity: 0.5 });
  glow.material.toneMapped = false;
  glow.position.y = 0.8;
  g.add(glow);
  const motes = [];
  for (let i = 0; i < 6; i++) {
    const m = makeGlowSprite({ color: c.glow, size: 0.1, opacity: 0.8 });
    m.material.toneMapped = false;
    g.add(m);
    motes.push({ m, a: i * 1.05, ph: i / 6 });
  }
  // The floor glyph: an outer ring, an inner ring and four ticks.
  const glyphMat = new MeshBasicMaterial({ map: getRadialTexture(), color: exactColor(c.glow), transparent: true, opacity: 0.4, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
  const glyph = new Mesh(
    sharedGeo('sh-glyph', () =>
      mergeGeometries([new RingGeometry(1.0, 1.06, 48), new RingGeometry(0.78, 0.81, 40), ...[0, 1, 2, 3].map((i) => new BoxGeometry(0.05, 0.22, 0.001).rotateZ((i * Math.PI) / 2).translate(Math.cos((i * Math.PI) / 2) * 0.9, Math.sin((i * Math.PI) / 2) * 0.9, 0))].map((q) => q.toNonIndexed ? q.toNonIndexed() : q))
    ),
    glyphMat
  );
  glyph.rotation.x = -Math.PI / 2;
  glyph.position.y = 0.03;
  glyph.renderOrder = 3;
  g.add(glyph);
  g.add(groundShadow(0.62, 0.75, { wide: 1.1, deep: 1.0 }));
  let lit = 1;
  let lastT = null;
  return {
    group: g,
    update(ent, tSec, ctx) {
      const dt = lastT === null ? 0 : Math.min(0.1, tSec - lastT);
      lastT = tSec;
      const ready = (ent.uses === null || ent.uses > 0) && !(ctx && ctx.asleep);
      lit += ((ready ? 1 : 0.08) - lit) * (1 - Math.exp(-3 * dt));
      flameMat.opacity = 0.9 * lit;
      flame.scale.set(1 + 0.08 * Math.sin(tSec * 6), 1 + 0.18 * Math.sin(tSec * 4.3) * lit, 1);
      glow.material.opacity = (0.38 + 0.12 * Math.sin(tSec * 2.2)) * lit;
      glyphMat.opacity = (0.28 + 0.14 * Math.sin(tSec * 1.6)) * lit;
      glyph.rotation.z = tSec * 0.15;
      for (const mo of motes) {
        const u = (tSec * 0.35 + mo.ph) % 1;
        mo.m.visible = lit > 0.3;
        mo.m.position.set(Math.cos(mo.a + tSec * 0.5) * 0.28, 0.7 + u * 1.1, Math.sin(mo.a + tSec * 0.5) * 0.28);
        mo.m.material.opacity = 0.8 * (1 - u) * lit;
      }
      if (vane) vane.rotation.y = Math.sin(tSec * 0.7) * 0.9 + tSec * 0.2;
    },
    onOffer(ev) {
      impactFx.embers(ev.x, ev.z, { color: c.glow, n: 12, radius: 0.5, tall: 2.0 });
    },
  };
}
