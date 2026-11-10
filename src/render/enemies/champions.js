// CHAMPIONS (docs/CHAMPIONS.md): the first champion rigs and what makes each
// one THE champion of its room. Same grammar as the other enemy rigs
// (render/enemies/slice2.js): flat-faceted primitives, cool hides with a value
// structure, ink on the big masses, a contact shadow, ONE indigo corruption
// tell each. What sets a champion apart is its size (about twice a heavy's
// height) and Pale Gold, the colour of what it guards: a crown over its head,
// a turning sigil under its feet, and the chest it leaves behind.
//
//   The Level I to IV champions (briar_knight, sluice_warden, bone_reeve,
//   hollow_choir) play their model-standard rigs from render/enemies/champfacet/.
//
//   gale_herald    a winged limestone herald off the belfry roof: a long
//                  robe, a winged helm, great feathered stone wings with
//                  bell-bronze leading edges, a long bronze herald's horn held
//                  to its mouth with a slate pennant; an indigo crack down
//                  one cheek. Entrance: the horn raised to the sky. Gale
//                  Call: wings braced wide, it draws breath and levels the
//                  horn, then the blast jolts it. Stoop: it beats up ~1.6 u,
//                  glides pitched forward to the mark, tucks and drops, and
//                  lands with its wings flared
//
// Faces +Z; the enemy layer drives pose({ t, walkPhase, moveK, telegraphK,
// fireK, e }) (e = the sim entity, READ ONLY). createChampionFx() is the
// presence layer the enemy layer mounts beside the rigs (render-only: it
// reads entities and events, never writes the sim).
import {
  AdditiveBlending,
  BoxGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow, exactColor, mix } from '../critters/common.js';
import { markShared, sharedGeo, releaseTree } from '../geocache.js';
import { PALETTE, VFX_MATTER } from '../../data/palette.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from './style.js';
import { impactFx } from '../vfx/hub.js';
import { attachChestBeat } from '../interactables/chestbeat.js';
import { mergeGeometries as mergeRaw } from 'three/addons/utils/BufferGeometryUtils.js';
import { SECOND_CHAMPION_BUILDERS, SECOND_CHAMPION_CROWN_Y, hartLift, abbessLift } from './champions2.js';
// MODEL STANDARD (docs/MODEL_STANDARD.md "Level I champions", "Level II
// champions"): the faceted Briar Knight, Moss Hart, Sluice Warden and
// Lockkeeper (their classic rigs were retired, AUDIT.md D1).
import { buildBriarKnightFacet } from './champfacet/briarknight.js';
import { buildMossHartFacet } from './champfacet/mosshart.js';
import { buildSluiceWardenFacet } from './champfacet/sluicewarden.js';
import { buildLockkeeperFacet } from './champfacet/lockkeeper.js';
import { buildBoneReeveFacet } from './champfacet/bonereeve.js';
import { buildGravebellRingerFacet } from './champfacet/gravebellringer.js';
import { buildHollowChoirFacet } from './champfacet/hollowchoir.js';
import { buildVeinMatronFacet } from './champfacet/veinmatron.js';

const flashable = (color) => toonMaterial({ color, emissive: '#FFFFFF', emissiveIntensity: 0 });
const inkMat = () => new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
const tellMat = () => new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false });
function tellGlow(size, opacity) {
  const g = makeGlowSprite({ color: TELL_INDIGO_GLOW, size, opacity });
  g.material.toneMapped = false;
  g.material.color.copy(TELL_INDIGO_GLOW);
  return g;
}
const cache = {};
function shared(key, make) {
  if (!cache[key]) {
    cache[key] = make();
    markShared(cache[key]);
  }
  return cache[key];
}
const slate = (h, l) => new Color().setHSL(0.6, h, l);
const GOLD = PALETTE.paleGold;
const GOLD_HOT = mix(PALETTE.paleGold, PALETTE.parchment, 0.55);
// Local hides (the same cool families as style.js HIDE).
const C = Object.freeze({
  bark: HIDE.quillDark.clone().lerp(new Color(PALETTE.sageCloak), 0.45).multiplyScalar(0.95),
  barkDark: HIDE.boarDark.clone().multiplyScalar(0.8),
  moss: new Color(PALETTE.sageCloak).lerp(new Color(PALETTE.signalBlue), 0.25).multiplyScalar(0.9),
  thorn: new Color(PALETTE.bone).lerp(new Color(PALETTE.sageCloak), 0.35).multiplyScalar(0.75),
  plank: slate(0.18, 0.34).lerp(new Color(PALETTE.bruiseUmber), 0.45),
  iron: HIDE.ramDark.clone().lerp(new Color(PALETTE.warmGrey), 0.3).multiplyScalar(0.8),
  wardenHide: slate(0.3, 0.36),
  wardenDark: slate(0.34, 0.2),
  stone: new Color(PALETTE.warmGrey).lerp(new Color(PALETTE.signalBlue), 0.15).multiplyScalar(0.85),
  bone: new Color(PALETTE.bone).multiplyScalar(0.82),
  boneDark: new Color(PALETTE.bone).lerp(new Color(PALETTE.voidCharcoal), 0.45),
  cowl: slate(0.2, 0.17),
  choir: new Color(PALETTE.bone).lerp(new Color(PALETTE.godstuffViolet), 0.35).multiplyScalar(0.78),
  choirDark: slate(0.28, 0.16).lerp(new Color(PALETTE.godstuffViolet), 0.25),
  // Gale Herald: pale belfry limestone, darker weathered feathers, bell
  // bronze trim, a slate pennant.
  lime: new Color(VFX_MATTER.spirestone).lerp(new Color(PALETTE.signalBlue), 0.1).multiplyScalar(0.9),
  limeDark: new Color(VFX_MATTER.spirestone).lerp(slate(0.25, 0.3), 0.55).multiplyScalar(0.7),
  bronze: new Color(VFX_MATTER.bellbronze).lerp(slate(0.2, 0.3), 0.22).multiplyScalar(0.9),
  bronzeDark: new Color(VFX_MATTER.bellbronze).lerp(slate(0.2, 0.2), 0.5).multiplyScalar(0.6),
  pennant: slate(0.35, 0.2),
});

function shell(name) {
  const group = new Group();
  group.name = name;
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group();
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  return { group, yaw, rig, mats, track, setYaw: (r) => (yaw.rotation.y = r) };
}
function slitEyes(parent, { x = 0.08, y = 0, z = 0.12, len = 0.1, slant = 0.35, mat = null } = {}) {
  const g = shared('ch-eye', () => new BoxGeometry(1, 0.03, 0.03));
  const m = mat ?? inkMat();
  for (const side of [-1, 1]) {
    const eye = new Mesh(g, m);
    eye.scale.x = len;
    eye.position.set(side * x, y, z);
    eye.rotation.set(0, side * -0.3, side * slant);
    parent.add(eye);
  }
}
// A strike clip: 1 at the frame the move landed, easing to 0 over `dur` s.
function clip() {
  let last = -1;
  let age = 9;
  let lastT = null;
  return (t, moveTick, dur = 0.35) => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    if (moveTick !== last && moveTick >= 0) {
      last = moveTick;
      age = 0;
    }
    age += dt;
    return age < dur ? 1 - age / dur : 0;
  };
}
const moving = (e, id) => !!(e && e.telegraph && e.telegraph.move === id);

// --------------------------------------------------------- GALE HERALD --
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const approach = (cur, to, rate, dt) => cur + (to - cur) * (1 - Math.exp(-rate * dt));
const mergeGeometries = (list) => mergeRaw(list.map((g) => (g.index ? g.toNonIndexed() : g)));
// A flat plate from an outline in the XY plane, extruded thin and centred.
function plate(points, depth = 0.03) {
  const g = new ExtrudeGeometry(new Shape(points.map(([x, y]) => new Vector2(x, y))), { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}
// One stone feather hanging down -Y from its quill at the origin.
function feather(len, w) {
  return plate([[0, 0.02], [w * 0.5, -0.06], [w * 0.55, -len * 0.55], [w * 0.25, -len * 0.92], [0, -len], [-w * 0.35, -len * 0.8], [-w * 0.5, -len * 0.4], [-w * 0.35, -0.05]], 0.03);
}
const placed = (g, x, y, z, rz) => g.rotateZ(rz).translate(x, y, z);
// The wing in its own frame: span out along +X (inner arm 0 -> 0.8, outer
// hand from the elbow 0 -> 0.8), feathers hanging down -Y.
function heraldInnerFeathers() {
  const list = [];
  for (let i = 0; i < 6; i++) {
    const x = 0.06 + i * 0.13;
    list.push(placed(feather(0.62 + i * 0.05, 0.16), x, 0.15 * (x / 0.8), -0.012, 0.05 + i * 0.02));
  }
  return mergeGeometries(list);
}
function heraldCoverts() {
  const list = [];
  for (let i = 0; i < 6; i++) {
    const x = 0.04 + i * 0.14;
    list.push(placed(feather(0.3, 0.15), x, 0.15 * (x / 0.8) + 0.02, 0.018, 0.08));
  }
  return mergeGeometries(list);
}
function heraldPrimaries() {
  const list = [];
  for (let i = 0; i < 7; i++) {
    const x = 0.04 + i * 0.11;
    list.push(placed(feather(0.78 + i * 0.06, 0.15), x, 0.01 * i, -0.012 + (i % 2) * 0.01, 0.12 + i * 0.16));
  }
  return mergeGeometries(list);
}
// The Stoop's height off the ground (world u), read off the sim telegraph:
// it climbs over the first quarter of the warning, glides ~1.6 u up, and
// drops onto the mark over the last seventh so it lands as the ring
// resolves. 0 unless it is aloft (`e.flight`). Shared with the presence
// layer (the crown rides up with it). Render-only.
export function heraldLift(e, tick) {
  const tel = e && e.telegraph;
  if (!e || !e.flight || !tel || tel.move !== 'stoop') return 0;
  const span = Math.max(1, (tel.resolveTick ?? 0) - (tel.startTick ?? 0));
  const p = clamp01(((tick ?? 0) - (tel.startTick ?? 0)) / span);
  const up = smooth(p / 0.24);
  const d = p < 0.86 ? 0 : (p - 0.86) / 0.14;
  return (1.6 + 0.08 * Math.sin(p * 18)) * up * (1 - d * d);
}
export function buildGaleHerald() {
  const s = shell('gale_herald');
  const { rig, track } = s;
  const lime = track(flashable(C.lime));
  const robeMat = track(flashable(C.lime.clone().lerp(C.limeDark, 0.3)));
  const limeDark = track(flashable(C.limeDark, { side: DoubleSide }));
  const featherMat = track(flashable(C.lime, { side: DoubleSide }));
  const bronze = track(flashable(C.bronze, { side: DoubleSide }));
  const bronzeDark = track(flashable(C.bronzeDark));
  const pennantMat = track(flashable(C.pennant, { side: DoubleSide }));
  const lift = new Group();
  rig.add(lift);
  // The robe: a long limestone fall from the waist, bronze at the hem.
  const robe = new Group();
  robe.position.y = 1.2;
  lift.add(robe);
  const robeM = new Mesh(
    shared('gh-robe', () =>
      new LatheGeometry([[0.3, 0], [0.34, -0.2], [0.42, -0.5], [0.52, -0.9], [0.6, -1.14], [0.58, -1.18]].map(([r, y]) => new Vector2(r, y)), 11)
    ),
    robeMat
  );
  addInk(robeM);
  robeM.material.side = DoubleSide;
  robe.add(robeM);
  for (let i = 0; i < 6; i++) {
    const a = -1.1 + i * 0.44;
    const fg = new Group();
    fg.rotation.y = a;
    robe.add(fg);
    const fold = new Mesh(shared('gh-fold', () => new BoxGeometry(0.06, 1.0, 0.04).translate(0, -0.5, 0)), limeDark);
    fold.position.set(0, -0.14, 0.33);
    fold.rotation.x = -0.26;
    fg.add(fold);
  }
  const hem = new Mesh(shared('gh-hem', () => new TorusGeometry(0.59, 0.035, 4, 22).rotateX(Math.PI / 2)), bronzeDark);
  hem.position.y = -1.15;
  robe.add(hem);
  // Talons under the hem (they reach on the stoop).
  const feet = [];
  for (const side of [-1, 1]) {
    const f = new Group();
    f.position.set(side * 0.2, 0.1, 0.22);
    lift.add(f);
    for (const a of [-0.45, 0, 0.45]) {
      const cl = new Mesh(shared('gh-talon', () => new ConeGeometry(0.045, 0.26, 4).rotateX(Math.PI / 2).translate(0, 0, 0.12)), limeDark);
      cl.rotation.set(0.25, a, 0);
      f.add(cl);
    }
    feet.push({ f, side });
  }
  // The body above the waist pitches from here.
  const body = new Group();
  body.position.y = 1.2;
  lift.add(body);
  const belt = new Mesh(shared('gh-belt', () => new TorusGeometry(0.31, 0.04, 4, 16).rotateX(Math.PI / 2)), bronze);
  body.add(belt);
  const chest = new Mesh(shared('gh-chest', () => new IcosahedronGeometry(0.34, 1)), lime);
  chest.scale.set(1.2, 1.05, 0.85);
  chest.position.y = 0.36;
  addInk(chest);
  body.add(chest);
  const plateM = new Mesh(shared('gh-plate', () => new CylinderGeometry(0.37, 0.31, 0.44, 10, 1, true, -Math.PI * 0.42, Math.PI * 0.84)), bronze);
  plateM.position.set(0, 0.34, 0.03);
  body.add(plateM);
  for (const side of [-1, 1]) {
    const p = new Mesh(shared('gh-paul', () => new SphereGeometry(0.17, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2)), bronze);
    p.scale.set(1.15, 0.8, 1);
    p.position.set(side * 0.4, 0.52, 0);
    p.rotation.z = -side * 0.35;
    addInk(p);
    body.add(p);
  }
  // Head: a smooth limestone face under a winged helm with a bronze
  // circlet; the indigo crack running down from one eye (the tell).
  const head = new Group();
  head.position.set(0, 0.8, 0.04);
  body.add(head);
  const skull = new Mesh(shared('gh-skull', () => new SphereGeometry(0.17, 10, 8)), lime);
  skull.scale.set(0.92, 1.1, 1.0);
  addInk(skull);
  head.add(skull);
  const helm = new Mesh(shared('gh-helm', () => new SphereGeometry(0.185, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.45)), limeDark);
  helm.position.y = 0.03;
  head.add(helm);
  const circlet = new Mesh(shared('gh-circ', () => new TorusGeometry(0.17, 0.022, 4, 16).rotateX(Math.PI / 2)), bronze);
  circlet.position.y = 0.05;
  head.add(circlet);
  const helmWingG = shared('gh-hwing', () => mergeGeometries([placed(feather(0.26, 0.09), 0, 0, 0, 2.3), placed(feather(0.22, 0.08), 0, 0, 0.01, 2.0), placed(feather(0.18, 0.07), 0, 0, 0.02, 1.7)]));
  for (const side of [-1, 1]) {
    const hw = new Group();
    hw.position.set(side * 0.16, 0.08, -0.02);
    hw.scale.x = side;
    hw.rotation.y = side * -0.5;
    head.add(hw);
    hw.add(new Mesh(helmWingG, featherMat));
  }
  slitEyes(head, { x: 0.065, y: 0.02, z: 0.155, len: 0.06, slant: 0.2 });
  const crack = new Mesh(
    shared('gh-crack', () => {
      const r = (a, b, w) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        const g = new CylinderGeometry(w, w, len, 4);
        g.rotateX(Math.acos((b[1] - a[1]) / len)).rotateY(Math.atan2(b[0] - a[0], b[2] - a[2]));
        return g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      };
      return mergeGeometries([r([0.07, -0.005, 0.16], [0.095, -0.07, 0.15], 0.012), r([0.095, -0.07, 0.15], [0.08, -0.13, 0.13], 0.011), r([0.08, -0.13, 0.13], [0.1, -0.17, 0.1], 0.009)]);
    }),
    tellMat()
  );
  head.add(crack);
  const tell = tellGlow(0.42, 0.34);
  tell.position.set(0.09, -0.08, 0.18);
  head.add(tell);
  // The horn: a long bronze herald's trumpet from the mouth, two bands, a
  // flared bell, a slate pennant hanging from it.
  const horn = new Group();
  horn.position.set(0, 0.74, 0.17);
  body.add(horn);
  const tube = new Mesh(shared('gh-tube', () => new CylinderGeometry(0.026, 0.036, 1.38, 6).rotateX(Math.PI / 2).translate(0, 0, 0.69)), bronze);
  addInk(tube);
  horn.add(tube);
  const mouthpiece = new Mesh(shared('gh-mp', () => new CylinderGeometry(0.04, 0.022, 0.07, 6).rotateX(Math.PI / 2)), bronzeDark);
  horn.add(mouthpiece);
  for (const z of [0.42, 0.92]) {
    const b = new Mesh(shared('gh-hband', () => new TorusGeometry(0.045, 0.016, 4, 10)), bronzeDark);
    b.position.z = z;
    horn.add(b);
  }
  const bellM = new Mesh(
    shared('gh-bell', () =>
      new LatheGeometry([[0.036, 0], [0.05, 0.1], [0.08, 0.18], [0.14, 0.25], [0.23, 0.3], [0.25, 0.31], [0.22, 0.3]].map(([r, y]) => new Vector2(r, y)), 14).rotateX(Math.PI / 2).translate(0, 0, 1.33)
    ),
    bronze
  );
  horn.add(bellM);
  const bellRim = new Mesh(shared('gh-brim', () => new TorusGeometry(0.245, 0.02, 4, 18).translate(0, 0, 1.64)), bronzeDark);
  horn.add(bellRim);
  const pennant = new Group();
  pennant.position.set(0, -0.03, 0.62);
  horn.add(pennant);
  const cloth = new Mesh(shared('gh-pennant', () => plate([[0, 0], [0.42, 0], [0.42, -0.36], [0.21, -0.48], [0, -0.36]], 0.01).rotateY(-Math.PI / 2).translate(0, 0, 0.21)), pennantMat);
  pennant.add(cloth);
  const fringe = new Mesh(shared('gh-fringe', () => new BoxGeometry(0.02, 0.03, 0.44).translate(0, 0, 0.0)), bronze);
  pennant.add(fringe);
  const hornGlow = makeGlowSprite({ color: VFX_MATTER.gust, size: 1.0, opacity: 0 });
  hornGlow.material.toneMapped = false;
  hornGlow.position.z = 1.66;
  horn.add(hornGlow);
  // Arms: two-bone rods from the shoulders to the hands on the horn.
  const armG = shared('gh-armseg', () => new CylinderGeometry(0.07, 0.06, 1, 6).translate(0, 0.5, 0));
  const handG = shared('gh-hand', () => new IcosahedronGeometry(0.075, 0));
  const arms = [];
  for (const side of [-1, 1]) {
    const upper = new Mesh(armG, lime);
    addInk(upper);
    const fore = new Mesh(armG, lime);
    const hand = new Mesh(handG, limeDark);
    const cuff = new Mesh(shared('gh-cuff', () => new TorusGeometry(0.07, 0.022, 4, 10).rotateX(Math.PI / 2)), bronze);
    body.add(upper, fore, hand, cuff);
    arms.push({ side, upper, fore, hand, cuff, sh: new Vector3(side * 0.42, 0.5, 0.0), grip: new Vector3(side * 0.035, -0.045, side > 0 ? 0.3 : 0.62) });
  }
  // The great wings: pivot (on the back) -> mirror -> flap -> root (raise,
  // sweep, tilt) -> arm feathers; an elbow to the hand's primaries. Bell
  // bronze along the leading edges.
  const wings = [];
  const innerG = shared('gh-winner', heraldInnerFeathers);
  const covertG = shared('gh-wcov', heraldCoverts);
  const primG = shared('gh-wprim', heraldPrimaries);
  const armBoneG = shared('gh-wbone', () => new CylinderGeometry(0.035, 0.028, 0.82, 5).rotateZ(-Math.PI / 2 + Math.atan2(0.15, 0.8)).translate(0.4, 0.075, 0));
  const handBoneG = shared('gh-whand', () => new CylinderGeometry(0.028, 0.012, 0.85, 5).rotateZ(-Math.PI / 2).translate(0.42, 0.0, 0));
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.2, 0.55, -0.24);
    body.add(pivot);
    const mirror = new Group();
    mirror.scale.x = side;
    pivot.add(mirror);
    const flap = new Group();
    mirror.add(flap);
    const root = new Group();
    flap.add(root);
    const inner = new Mesh(innerG, limeDark);
    addInk(inner);
    root.add(inner);
    root.add(new Mesh(covertG, featherMat));
    root.add(new Mesh(armBoneG, bronze));
    const outer = new Group();
    outer.position.set(0.8, 0.15, 0);
    root.add(outer);
    const prim = new Mesh(primG, limeDark);
    addInk(prim);
    outer.add(prim);
    outer.add(new Mesh(handBoneG, bronze));
    wings.push({ flap, root, outer, side });
  }
  const shadow = groundShadow(0.85, 0.85);
  s.group.add(shadow);
  const strike = clip();
  let lastT = null;
  let liftCur = 0;
  let flapPh = 0;
  let enterK = 0;
  const _b = new Vector3();
  const _m = new Vector3();
  const _d = new Vector3();
  const _q = new Quaternion();
  const UP = new Vector3(0, 1, 0);
  const seg = (mesh, a, b) => {
    _d.subVectors(b, a);
    const len = _d.length() || 1e-3;
    mesh.position.copy(a);
    mesh.quaternion.copy(_q.setFromUnitVectors(UP, _d.multiplyScalar(1 / len)));
    mesh.scale.set(1, len, 1);
  };
  // Wing poses: [tilt x, sweep y, raise z, elbow z].
  const REST = [0.15, 0.42, 0.78, 0.55];
  const BRACE = [0.05, 0.12, 0.32, 0.05];
  const FLY = [-1.2, 0.1, 0.02, 0.04];
  const TUCK = [-1.05, 1.15, 0.25, 0.75];
  const FLARE = [-0.45, -0.1, 0.55, -0.12];
  const w = [0, 0, 0, 0];
  const mixIn = (to, k) => {
    for (let i = 0; i < 4; i++) w[i] += (to[i] - w[i]) * k;
  };
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    // Small fixes 4: the full white hit flash on this pale, wide-winged
    // limestone body crossed the bloom threshold across the whole wingspan and
    // veiled the pale Spire room in a white haze on every hit (the "haze" in
    // the slice 7 captures). Softer than the other champions' 0.4
    // (CHAMPION_FLASH): at 0.25 it still pops, with no room-wide glare.
    flashScale: 0.25,
    pose({ t, tick = 0, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const k = strike(t, e ? e.moveTick : -1, 0.55);
      const last = e ? e.lastMove : null;
      const tel = e && e.telegraph;
      const span = tel ? Math.max(1, (tel.resolveTick ?? 0) - (tel.startTick ?? 0)) : 1;
      const prog = tel ? clamp01((tick - (tel.startTick ?? 0)) / span) : 0;
      const callK = moving(e, 'gale_call') ? telegraphK : 0;
      const stooping = moving(e, 'stoop') && !!(e && e.flight);
      const blast = last === 'gale_call' ? k : 0;
      const land = last === 'stoop' ? k : 0;
      const rage = e && e.rage ? 1 : 0;
      enterK = approach(enterK, e && e.mode === 'enter' ? 1 : 0, 5, dt);
      // Aloft: the sim's flight drives the height; a cut-short stoop drops.
      const want = heraldLift(e, tick);
      liftCur = stooping ? want : approach(liftCur, 0, 16, dt);
      const aloft = clamp01(liftCur / 1.4);
      const dive = stooping && prog > 0.8 ? smooth((prog - 0.8) / 0.12) : 0;
      lift.position.y = liftCur - 0.28 * land * (1 - land * 0.4);
      // Body: upright and breathing; leans back drawing breath for the call
      // and jolts forward on the blast; pitched into the glide aloft, nose
      // down on the drop, a crouch on the landing.
      const breathe = Math.sin(t * 1.5);
      body.rotation.x = -0.24 * callK + 0.34 * blast + 0.5 * aloft * (1 - dive) + 0.85 * dive * aloft + 0.4 * land - 0.18 * enterK + 0.03 * breathe;
      body.rotation.z = 0.04 * Math.sin(walkPhase * 1.2) * moveK + (rage ? 0.015 * Math.sin(t * 21) : 0);
      chest.scale.set(1.2 * (1 + 0.08 * callK * prog), 1.05 * (1 + 0.02 * breathe + 0.06 * callK * prog), 0.85 * (1 + 0.1 * callK * prog));
      robe.rotation.x = 0.5 * aloft - 0.45 * aloft * (1 - dive) * 0.6 + 0.25 * land + 0.04 * Math.sin(walkPhase * 1.2) * moveK;
      robe.rotation.z = 0.05 * Math.sin(t * 2.3) * aloft;
      robeM.scale.set(1 + 0.08 * land, 1 - 0.06 * aloft, 1 + 0.08 * land);
      for (const { f, side } of feet) {
        f.position.z = 0.22 + side * Math.sin(walkPhase * 1.2) * 0.14 * moveK + 0.25 * dive;
        f.position.y = 0.1 + 0.15 * aloft * (1 - dive) - 0.05 * dive;
        f.rotation.x = 0.6 * aloft * (1 - dive) - 0.5 * dive;
      }
      // The horn: tipped down at rest, to the sky for the entrance, levelled
      // and lifted for the call, thrust out on the blast, tucked aloft.
      horn.rotation.x = 0.4 * (1 - Math.max(callK, enterK, aloft)) - 0.12 * callK - 1.05 * enterK + 0.15 * aloft - 0.12 * blast + 0.04 * Math.sin(t * 1.1);
      horn.position.z = 0.17 + 0.06 * blast;
      horn.scale.setScalar(1 + 0.06 * blast);
      pennant.rotation.x = -horn.rotation.x * 0.7 + 0.12 * Math.sin(t * 2.4) + 0.5 * aloft + 0.4 * blast;
      pennant.rotation.y = 0.15 * Math.sin(t * 1.7);
      hornGlow.material.opacity = 0.5 * callK * prog + 0.7 * blast + 0.2 * enterK;
      hornGlow.scale.setScalar(0.7 + 0.8 * callK * prog + 1.0 * blast);
      head.rotation.x = -0.1 * callK - 0.35 * enterK + 0.06 * Math.sin(t * 0.8);
      tell.material.opacity = 0.3 + 0.35 * Math.max(callK, stooping ? 1 : 0) + (rage ? 0.25 + 0.15 * Math.sin(t * 9) : 0);
      // Arms follow the horn: shoulders to the two grips.
      for (const a of arms) {
        _b.copy(a.grip).applyEuler(horn.rotation).multiplyScalar(horn.scale.x).add(horn.position);
        _m.addVectors(a.sh, _b).multiplyScalar(0.5);
        _m.x += a.side * 0.2;
        _m.y -= 0.16;
        _m.z -= 0.04;
        seg(a.upper, a.sh, _m);
        seg(a.fore, _m, _b);
        a.hand.position.copy(_b);
        a.cuff.position.copy(_m).lerp(_b, 0.75);
        a.cuff.quaternion.copy(a.fore.quaternion);
      }
      // Wings.
      for (let i = 0; i < 4; i++) w[i] = REST[i];
      mixIn(BRACE, Math.max(callK, enterK) * (1 - aloft));
      mixIn(FLY, aloft);
      mixIn(TUCK, dive * aloft);
      mixIn(FLARE, land);
      const climbing = stooping && prog < 0.3;
      flapPh += dt * (climbing ? 12 : stooping ? 6.5 : 0);
      const beat = Math.sin(flapPh);
      const flapAmp = aloft * (1 - dive) * (climbing ? 0.7 : 0.38);
      for (const wg of wings) {
        wg.flap.rotation.z = flapAmp * beat + 0.03 * Math.sin(t * 1.3) * (1 - aloft) + (rage ? 0.03 * Math.sin(t * 19 + wg.side) : 0) + 0.2 * blast;
        wg.root.rotation.set(w[0], w[1] - 0.45 * blast, w[2]);
        wg.outer.rotation.z = w[3] + flapAmp * 0.6 * Math.sin(flapPh - 0.7);
      }
      // Shadow: smaller and fainter the higher it rides.
      shadow.scale.setScalar(1 - 0.35 * aloft);
      shadow.material.opacity = 0.85 * (1 - 0.45 * aloft);
    },
  };
}

// Small fixes 4: every champion's hit flash is softened. The full white
// flash on a champion-sized body floods the bloom pass and glares over the
// room on every hit; at 0.4 the body still pops white with no veil. A build
// that sets its own flashScale keeps it (the Gale Herald, pale and
// wide-winged in the pale Spire, needs 0.25).
export const CHAMPION_FLASH = 0.4;
const softFlash = (build) => (...args) => {
  const b = build(...args);
  return b.flashScale == null ? { ...b, flashScale: CHAMPION_FLASH } : b;
};
export const CHAMPION_BUILDERS = Object.freeze(
  Object.fromEntries(
    Object.entries({
      briar_knight: buildBriarKnightFacet,
      sluice_warden: buildSluiceWardenFacet,
      bone_reeve: buildBoneReeveFacet,
      hollow_choir: buildHollowChoirFacet,
      gale_herald: buildGaleHerald,
      // Second champions (plan 4 slice 8): render/enemies/champions2.js.
      ...SECOND_CHAMPION_BUILDERS,
      moss_hart: buildMossHartFacet,
      lockkeeper: buildLockkeeperFacet,
      gravebell_ringer: buildGravebellRingerFacet,
      vein_matron: buildVeinMatronFacet,
    }).map(([k, build]) => [k, softFlash(build)])
  )
);
// Crown height per champion (world u above the ground).
export const CHAMPION_CROWN_Y = Object.freeze({ briar_knight: 2.75, sluice_warden: 2.45, bone_reeve: 3.05, hollow_choir: 3.05, gale_herald: 2.95, ...SECOND_CHAMPION_CROWN_Y });

// ------------------------------------------------------------ presence --
const flat = (color, opacity) =>
  new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide });
const soft = (color, opacity) =>
  new MeshBasicMaterial({ map: getRadialTexture(), color: new Color(color), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
const onGround = (mesh, y) => {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.renderOrder = 3;
  return mesh;
};
const RAGE = mix(PALETTE.emberDanger, PALETTE.godstuffViolet, 0.35);

// The crown: a gold band of five points with a gem, turning slowly.
function buildCrown() {
  const g = new Group();
  const gold = new MeshBasicMaterial({ color: exactColor(GOLD), toneMapped: false });
  const band = new Mesh(sharedGeo('ch-crown-band', () => new CylinderGeometry(0.2, 0.17, 0.1, 10, 1, true)), gold);
  band.material.side = DoubleSide;
  g.add(band);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = new Mesh(sharedGeo('ch-crown-pt', () => new ConeGeometry(0.05, 0.2, 4)), gold);
    p.position.set(Math.cos(a) * 0.19, 0.14, Math.sin(a) * 0.19);
    g.add(p);
  }
  const gem = new Mesh(sharedGeo('ch-crown-gem', () => new OctahedronGeometry(0.06, 0)), new MeshBasicMaterial({ color: new Color(GOLD_HOT), toneMapped: false }));
  gem.position.y = 0.04;
  gem.position.z = 0.2;
  g.add(gem);
  const glow = makeGlowSprite({ color: GOLD, size: 1.0, opacity: 0.45 });
  glow.material.toneMapped = false;
  g.add(glow);
  return { g, glow };
}
// The sigil under its feet: two gold rings, eight ticks, a soft pool.
function buildSigil(r) {
  const g = new Group();
  const ringMat = flat(GOLD, 0.55);
  const outer = onGround(new Mesh(sharedGeo('ch-sig-out', () => new RingGeometry(0.92, 1.0, 64)), ringMat), 0.032);
  const inner = onGround(new Mesh(sharedGeo('ch-sig-in', () => new RingGeometry(0.7, 0.74, 48)), ringMat), 0.031);
  const ticks = new Group();
  const tickMat = flat(GOLD_HOT, 0.6);
  for (let i = 0; i < 8; i++) {
    const tk = onGround(new Mesh(sharedGeo('ch-sig-tick', () => new RingGeometry(0.76, 0.9, 2, 1, -0.06, 0.12)), tickMat), 0.033);
    tk.rotation.z = (i / 8) * Math.PI * 2;
    ticks.add(tk);
  }
  const poolMat = soft(GOLD, 0.2);
  const pool = onGround(new Mesh(sharedGeo('ch-sig-pool', () => new CircleGeometry(1.25, 28)), poolMat), 0.02);
  pool.renderOrder = 2;
  g.add(outer, inner, ticks, pool);
  g.scale.setScalar(r);
  return { g, ticks, ringMat, tickMat, poolMat };
}
// The relic chest: a banded box, a lid on a hinge, a crown on the lid.
function buildChest() {
  const g = new Group();
  const wood = toonMaterial({ color: mix(PALETTE.bruiseUmber, PALETTE.voidCharcoal, 0.2) });
  const goldM = new MeshBasicMaterial({ color: exactColor(GOLD), toneMapped: false });
  const body = new Group(); // what the chest beat rocks (interactables/chestbeat.js)
  g.add(body);
  const box = new Mesh(sharedGeo('ch-chest-box', () => new BoxGeometry(0.9, 0.5, 0.6)), wood);
  box.position.y = 0.25;
  addInk(box);
  body.add(box);
  for (const x of [-0.36, 0, 0.36]) {
    const band = new Mesh(sharedGeo('ch-chest-band', () => new BoxGeometry(0.07, 0.52, 0.62)), goldM);
    band.position.set(x, 0.25, 0);
    body.add(band);
  }
  const hinge = new Group();
  hinge.position.set(0, 0.5, -0.3);
  body.add(hinge);
  const lid = new Mesh(sharedGeo('ch-chest-lid', () => new CylinderGeometry(0.3, 0.3, 0.9, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 0, 0.3)), wood);
  addInk(lid);
  hinge.add(lid);
  const crown = new Mesh(sharedGeo('ch-chest-crown', () => new ConeGeometry(0.1, 0.16, 5)), goldM);
  crown.position.set(0, 0.32, 0.3);
  hinge.add(crown);
  const seamMat = new MeshBasicMaterial({ color: new Color(GOLD_HOT), transparent: true, opacity: 0.0, toneMapped: false, blending: AdditiveBlending, depthWrite: false });
  const seam = new Mesh(sharedGeo('ch-chest-seam', () => new BoxGeometry(0.92, 0.04, 0.62)), seamMat);
  seam.position.y = 0.5;
  body.add(seam);
  const glow = makeGlowSprite({ color: GOLD, size: 2.2, opacity: 0.0 });
  glow.material.toneMapped = false;
  glow.position.y = 0.6;
  g.add(glow);
  const beam = makeGlowSprite({ color: GOLD_HOT, size: 1, opacity: 0 });
  beam.material.toneMapped = false;
  beam.scale.set(0.8, 6, 1);
  beam.position.y = 3;
  g.add(beam);
  g.add(groundShadow(0.6, 0.6));
  const beat = attachChestBeat(g, body, { w: 0.9, d: 0.6, rim: 0.5, hasp: { y: 0.36, z: 0.3 } });
  return { g, hinge, seamMat, glow, beam, beat, mats: [wood] };
}

export function createChampionFx({ root, world, bus, cosmetic }) {
  const marks = new Map(); // champion id -> { crown, sigil, aura, kind }
  let chest = null; // { rec, x, z, age, open, openAge }
  const waves = []; // { mesh, mat, age, dur, reach }
  const counts = { spawned: 0, felled: 0, chests: 0, opened: 0 };

  function wave(x, z, color, reach, dur) {
    const mat = flat(color, 0.9);
    const mesh = onGround(new Mesh(sharedGeo('ch-wave', () => new RingGeometry(0.86, 1.0, 64)), mat), 0.06);
    mesh.position.x = x;
    mesh.position.z = z;
    root.add(mesh);
    waves.push({ mesh, mat, age: 0, dur, reach });
  }
  function addMark(e) {
    const crown = buildCrown();
    const sigil = buildSigil((e.radius ?? 0.6) + 0.55);
    const aura = makeGlowSprite({ color: RAGE, size: 3.2, opacity: 0 });
    aura.material.toneMapped = false;
    aura.position.y = 1.2;
    root.add(crown.g, sigil.g, aura);
    marks.set(e.id, { crown, sigil, aura, kind: e.kind, rageAge: 9 });
  }
  function dropMark(id) {
    const m = marks.get(id);
    if (!m) return;
    root.remove(m.crown.g, m.sigil.g, m.aura);
    releaseTree(m.crown.g);
    releaseTree(m.sigil.g);
    marks.delete(id);
  }
  function dropChest() {
    if (!chest) return;
    root.remove(chest.rec.g);
    releaseTree(chest.rec.g);
    chest = null;
  }

  bus.on('champion_spawn', (ev) => {
    counts.spawned += 1;
    // The entrance: a gold column drops, the ground rings twice, dust rolls.
    wave(ev.x, ev.z, GOLD, 4.2, 0.6);
    wave(ev.x, ev.z, GOLD_HOT, 2.4, 0.35);
    impactFx.spray('smoke', ev.x, 0.2, ev.z, 10, { color: PALETTE.warmGrey, speed: [0.8, 2.0], up: [0.1, 0.5], size: [0.4, 0.6], grow: 1.5, life: [0.8, 1.3], opacity: 0.32, gravity: -0.15, drag: 2.2, jitter: 0.6 });
    impactFx.spray('spark', ev.x, 0.6, ev.z, 18, { color: GOLD, speed: [0.3, 1.2], up: [1.0, 2.6], size: [0.05, 0.1], life: [0.9, 1.5], gravity: -0.3, drag: 1.3, jitter: 0.7 });
  });
  bus.on('champion_rage', (ev) => {
    const m = marks.get(ev.id);
    if (m) m.rageAge = 0;
    wave(ev.x, ev.z, RAGE, 3.0, 0.5);
    impactFx.spray('spark', ev.x, 1.0, ev.z, 16, { color: RAGE, speed: [0.6, 1.8], up: [0.6, 1.8], size: [0.05, 0.1], life: [0.5, 0.9], gravity: -0.2, drag: 1.4, jitter: 0.5 });
  });
  bus.on('champion_fall', (ev) => {
    counts.felled += 1;
    dropMark(ev.id);
    wave(ev.x, ev.z, GOLD, 5.0, 0.8);
    wave(ev.x, ev.z, PALETTE.parchment, 2.6, 0.4);
    impactFx.spray('spark', ev.x, 0.8, ev.z, 30, { color: GOLD, speed: [0.6, 2.4], up: [1.2, 3.2], size: [0.06, 0.12], life: [1.0, 1.8], gravity: -0.25, drag: 1.2, jitter: 0.8 });
    // The chest rises out of the floor where it fell.
    dropChest();
    const rec = buildChest();
    rec.g.position.set(ev.x, -0.6, ev.z);
    root.add(rec.g);
    chest = { rec, x: ev.x, z: ev.z, age: 0, open: false, openAge: 0 };
    counts.chests += 1;
  });
  bus.on('champion_chest', () => {
    if (!chest) return;
    chest.open = true;
    chest.openAge = 0;
    chest.rec.beat.open(); // no press: it snaps on the clear
    counts.opened += 1;
    wave(chest.x, chest.z, GOLD_HOT, 3.0, 0.5);
    impactFx.spray('spark', chest.x, 0.7, chest.z, 26, { color: GOLD_HOT, speed: [0.2, 0.9], up: [1.6, 3.4], size: [0.05, 0.1], life: [1.2, 2.0], gravity: -0.4, drag: 1.0, jitter: 0.3 });
  });
  // A new room, the end of the run or camp: the chest stays behind.
  for (const type of ['room_enter', 'run_end', 'run_wiped', 'return_to_camp', 'level_transit']) bus.on(type, () => dropChest());

  function update(tSec, dt) {
    const seen = new Set();
    for (const e of world.entities()) {
      if (!CHAMPION_BUILDERS[e.kind] || e.state !== 'active') continue;
      seen.add(e.id);
      if (!marks.has(e.id)) addMark(e);
      const m = marks.get(e.id);
      const ix = e.x;
      const iz = e.z;
      const up = e.kind === 'gale_herald' ? heraldLift(e, world.tick) : e.kind === 'moss_hart' ? hartLift(e, world.tick) : e.kind === 'bell_abbess' ? abbessLift(e, world.tick) : 0;
      m.crown.g.position.set(ix, (CHAMPION_CROWN_Y[e.kind] ?? 2.6) + up + 0.06 * Math.sin(tSec * 2), iz);
      // The Gale Herald aloft: its wingbeats push pale air and dust down.
      if (e.kind === 'gale_herald' && up > 0.3 && cosmetic.range(0, 1) < dt * 14) {
        impactFx.spray('smoke', ix, 0.12, iz, 1, { color: VFX_MATTER.spirestone, speed: [0.5, 1.1], up: [0.0, 0.15], size: [0.34, 0.5], grow: 1.3, life: [0.5, 0.8], opacity: 0.2, gravity: 0, drag: 2.4, jitter: 0.4 });
        impactFx.spray('spark', ix, up + 1.2, iz, 1, { color: VFX_MATTER.gust, speed: [0.2, 0.6], up: [-1.4, -0.6], size: [0.04, 0.07], life: [0.4, 0.7], gravity: 0, drag: 1.2, jitter: 0.9, opacity: 0.7 });
      }
      // The Bell Abbess on her rope: the air she cuts streams off behind her
      // in pale ribbons, and dust is whipped up off the floor beneath.
      if (e.kind === 'bell_abbess' && up > 0.2 && cosmetic.range(0, 1) < dt * 22) {
        const tel = e.telegraph;
        const bx = tel ? -(tel.dirX ?? 0) : 0;
        const bz = tel ? -(tel.dirZ ?? 0) : 0;
        impactFx.spray('spark', ix, up + 1.4, iz, 1, { color: VFX_MATTER.gust, speed: [1.2, 2.2], up: [-0.2, 0.2], size: [0.04, 0.07], life: [0.3, 0.5], gravity: 0, drag: 1.6, jitter: 0.4, opacity: 0.75, dir: { x: bx, z: bz }, dirBias: 0.85 });
        if (cosmetic.range(0, 1) < 0.5) impactFx.spray('smoke', ix, 0.12, iz, 1, { color: VFX_MATTER.spirestone, speed: [0.6, 1.2], up: [0.0, 0.15], size: [0.32, 0.46], grow: 1.3, life: [0.45, 0.7], opacity: 0.18, gravity: 0, drag: 2.4, jitter: 0.4, dir: { x: bx, z: bz }, dirBias: 0.6 });
      }
      m.crown.g.rotation.y = tSec * 0.9;
      m.sigil.g.position.set(ix, 0, iz);
      m.sigil.ticks.rotation.z = -tSec * 0.5;
      const wind = e.telegraph ? 1 : 0;
      const rage = e.rage ? 1 : 0;
      m.sigil.ringMat.opacity = 0.45 + 0.25 * wind + 0.1 * Math.sin(tSec * 3);
      m.sigil.tickMat.opacity = 0.5 + 0.4 * wind;
      m.sigil.ringMat.color.set(rage ? RAGE : GOLD);
      m.rageAge += dt;
      m.aura.position.set(ix, 1.2, iz);
      m.aura.material.opacity = rage ? 0.28 + 0.12 * Math.sin(tSec * 8) + (m.rageAge < 0.4 ? 0.5 * (1 - m.rageAge / 0.4) : 0) : 0;
      m.crown.glow.material.opacity = 0.4 + 0.2 * wind;
    }
    for (const id of [...marks.keys()]) if (!seen.has(id)) dropMark(id);
    if (chest) {
      chest.age += dt;
      const rise = Math.min(1, chest.age / 0.7);
      chest.rec.g.position.y = -0.6 + 0.6 * (1 - (1 - rise) * (1 - rise));
      // It wobbles from the champion's fall to the clear, then snaps open
      // (the chest beat: O1, O3 to O5).
      chest.rec.beat.force(0.5);
      const pose = chest.rec.beat.update(dt, Infinity, chest.x, chest.z);
      chest.rec.seamMat.opacity = chest.open ? 0.9 : 0.35 + 0.25 * Math.sin(chest.age * 3);
      if (chest.open) {
        chest.openAge += dt;
        chest.rec.hinge.rotation.x = -1.9 * pose.lid;
        chest.rec.glow.material.opacity = 0.75 + 0.15 * Math.sin(chest.openAge * 4);
        chest.rec.beam.material.opacity = Math.max(0.18, 0.7 * (1 - chest.openAge / 1.6));
        if (cosmetic.range(0, 1) < dt * 10) impactFx.spray('spark', chest.x, 0.6, chest.z, 1, { color: GOLD, speed: [0.05, 0.3], up: [0.8, 1.6], size: [0.04, 0.08], life: [0.8, 1.3], gravity: -0.4, drag: 1.4, jitter: 0.3 });
      } else {
        chest.rec.glow.material.opacity = 0.3 + 0.15 * Math.sin(chest.age * 3);
      }
    }
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.age += dt;
      const k = Math.min(1, w.age / w.dur);
      const sc = 0.3 + w.reach * (1 - (1 - k) * (1 - k));
      w.mesh.scale.set(sc, sc, 1);
      w.mat.opacity = 0.9 * (1 - k);
      if (w.age >= w.dur) {
        root.remove(w.mesh);
        w.mat.dispose();
        waves.splice(i, 1);
      }
    }
  }

  function clear() {
    for (const id of [...marks.keys()]) dropMark(id);
    dropChest();
  }

  return {
    update,
    clear,
    prewarm(park) {
      park(root, buildCrown().g);
      park(root, buildSigil(1).g);
      park(root, buildChest().g);
    },
    debug: () => ({ marks: marks.size, chest: chest ? { x: chest.x, z: chest.z, open: chest.open } : null, ...counts }),
  };
}
