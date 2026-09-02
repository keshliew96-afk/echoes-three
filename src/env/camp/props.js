// Camp-hub prop set (BUILD_BRIEF §18 "Camp hub", REFERENCE_BAR reference A).
//
// §18 names the camp's furniture explicitly: "tents/bedrolls, market-stall
// shell, rune monolith, anvils, weapon rack with a glowing item, crates,
// barrels, fences, hanging lanterns, torches, cart, grass tufts, dirt path" at
// 3-5x the prop density of a combat room, with >=12 DISTINCT prop types.
//
// The Act-1 edge props (crate / barrel / fence / log / stump / boulder / bush /
// slab / cairn / torch / lantern) already exist in src/env/props.js and are
// reused verbatim through `buildProps` — this module adds the types a CAMP has
// and a battlefield does not, plus the two landmarks §18 asks for by name: the
// Hearth-Fire ring and the glowing run-portal.
//
// Three rules inherited from env/props.js, all previous rejects there:
//   1. INK IS SCREEN-SPACE and matches the party's 2 px line — every hero layer
//      carries a clip-space inverted hull via getPropInkMaterial().
//   2. SHADOWS ARE CONTACT SHADOWS THAT READ OUTSIDE THE SILHOUETTE — `foot`
//      covers the prop's WIDEST ground layer, never just its trunk, and the
//      shared instancer sizes the blob at SHADOW_SPREAD x that footprint.
//   3. Self-illuminating props take `faint: true` so a fire never punches a
//      black hole in its own pool.
//
// Colour discipline (§19.1 camp story = indigo night / amber fire / violet
// arcane): every tone here is a PALETTE mix or an env/colors.js ENV tone. The
// ONLY violet in the camp is the run-portal's rune band and its two flanking
// rune stones — the arcane family §19.1 grants the camp — and it is spatially
// contained to that one landmark at the north gate. Corruption never touches
// camp (§18): no veined monolith, no Ember.
import {
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from '../../data/palette.js';
import { toonMaterial } from '../../render/toon.js';
import { ENV, COOL, mix, shade, hslColor } from '../colors.js';
import { getPropInkMaterial, inkGeometry, PROP_INK_PX, SHADOW_SPREAD } from '../props.js';

const UP = new Vector3(0, 1, 0);
const DETAIL_INK = 1.4;

// Emissive HDR values sit ABOVE 1.0 in the linear working space on purpose:
// stage.js thresholds bloom at 0.68 linear, so an emitter core has to be
// authored over it to read as a light rather than as a painted decal (§19.3
// "every light emitter carries an additive radial glow sprite" + the F2
// value-range finding). toneMapped:false keeps the hue chromatic through ACES.
function emissive(color, gain) {
  const c = new Color(color).multiplyScalar(gain);
  return new MeshBasicMaterial({ color: c, toneMapped: false });
}

// God-stuff Violet, pre-compensated the same way env/props.js compensates its
// monolith veins: a plain ACES-compressed violet lands neutral dark teal, so
// the authored linear triple leans blue and rides above 1.0.
export const RUNE_VIOLET = [0.72, 0.55, 1.85];

export function campMaterials() {
  const canvasBase = mix(mix(PALETTE.bone, PALETTE.warmGrey, 0.42), COOL.mist, 0.2);
  return {
    bark: toonMaterial({ color: ENV.bark }),
    barkDark: toonMaterial({ color: ENV.barkDark }),
    plank: toonMaterial({ color: ENV.plank }),
    plankLit: toonMaterial({ color: ENV.plankLit }),
    stumpTop: toonMaterial({ color: ENV.stumpTop }),
    stone: toonMaterial({ color: ENV.stone }),
    stoneLit: toonMaterial({ color: ENV.stoneLit }),
    stoneCool: toonMaterial({ color: ENV.stoneCool }),
    stoneDark: toonMaterial({ color: mix(ENV.stoneCool, PALETTE.voidCharcoal, 0.45) }),
    iron: toonMaterial({ color: ENV.iron }),
    ironDark: toonMaterial({ color: mix(ENV.iron, new Color(PALETTE.voidCharcoal), 0.55) }),
    steel: toonMaterial({ color: mix(PALETTE.bone, COOL.mist, 0.4) }),
    // Tent / stall canvas: warm off-white cloth, one value step apart so a
    // canopy is never one flat fill (reference-bar check 1).
    canvas: toonMaterial({ color: shade(canvasBase, 0.62) }),
    canvasLit: toonMaterial({ color: shade(canvasBase, 0.82) }),
    canvasShade: toonMaterial({ color: shade(mix(canvasBase, COOL.ambient, 0.42), 0.5) }),
    // Stall stripe + banner cloth: the party's own Sage, so the camp's cloth
    // reads as the party's colour and never borrows a reserved accent.
    stripe: toonMaterial({ color: mix(PALETTE.sageCloak, PALETTE.bone, 0.28) }),
    cloth: toonMaterial({ color: mix(PALETTE.sageCloak, PALETTE.voidCharcoal, 0.15) }),
    rope: toonMaterial({ color: shade(mix(PALETTE.warmGrey, PALETTE.bruiseUmber, 0.4), 0.7) }),
    ash: toonMaterial({ color: mix(PALETTE.bone, COOL.ambient, 0.62) }),
    moss: toonMaterial({ color: hslColor(150, 0.22, 0.18) }),
    glass: new MeshBasicMaterial({ color: new Color(ENV.glassLit), toneMapped: false }),
    // Live coals in the hearth bed and the forge: the fire's own base layer.
    // Coals sit UNDER the 0.68 linear bloom threshold on purpose. At 1.35 the
    // hearth's 0.55 u coal disc was itself a bloom source and UnrealBloomPass
    // (strength 1.15, radius 0.6) turned it into a white cloud that swallowed
    // the stone ring, the cook pot and the Archer standing behind it — measured
    // on the first lit camp frames. The FLAME is the emitter that blooms; the
    // coals only have to glow.
    coal: emissive(mix(PALETTE.hearthAmber, PALETTE.paleGold, 0.25), 0.55),
    // The weapon rack's glowing item (§18 "weapon rack with a glowing item")
    // and the run-portal runes.
    relic: emissive(mix(PALETTE.hearthAmber, PALETTE.parchment, 0.35), 1.7),
    rune: new MeshBasicMaterial({
      color: new Color().setRGB(RUNE_VIOLET[0], RUNE_VIOLET[1], RUNE_VIOLET[2]),
      toneMapped: false,
    }),
  };
}

// ---------------------------------------------------------------------------
// Prop table. Each entry: { layers:[{geo,mat,ink}], foot, rz?, faint?, emitter }
// with geometry pre-translated so y = 0 is the ground plane, exactly like
// env/props.js — so the shared shadow instancer and foliage mask work unchanged.
// ---------------------------------------------------------------------------
export function campPropTypes(m) {
  const T = {};

  // --- 1 · TENT (§18 "tents"). A-frame canvas prism: a 3-sided cylinder laid
  // on its side and rolled so a flat face is the ground line. End caps become
  // the front and back panels; a dark door mouth, a ridge pole, pegs and two
  // guy ropes break the silhouette so it never reads as a bare wedge.
  {
    const r = 0.66;
    const L = 1.62;
    const shell = new CylinderGeometry(r, r, L, 3, 1)
      .rotateX(Math.PI / 2)
      .rotateZ(Math.PI)
      .translate(0, r * 0.5, 0);
    const ridge = new CylinderGeometry(0.035, 0.035, L + 0.34, 6)
      .rotateX(Math.PI / 2)
      .translate(0, r * 1.5, 0);
    // Door mouth: a dark inset triangle proud of the front cap.
    const door = new CylinderGeometry(r * 0.52, r * 0.52, 0.06, 3)
      .rotateX(Math.PI / 2)
      .rotateZ(Math.PI)
      .translate(0, r * 0.28, L / 2 + 0.02);
    const flapL = new BoxGeometry(0.1, 0.62, 0.05)
      .rotateZ(0.34)
      .translate(-0.2, 0.33, L / 2 + 0.03);
    const flapR = new BoxGeometry(0.1, 0.62, 0.05)
      .rotateZ(-0.34)
      .translate(0.2, 0.33, L / 2 + 0.03);
    const ropes = mergeGeometries([
      new BoxGeometry(0.022, 0.9, 0.022).rotateX(-0.75).translate(0, 0.5, L / 2 + 0.35),
      new BoxGeometry(0.022, 0.9, 0.022).rotateX(0.75).translate(0, 0.5, -L / 2 - 0.35),
    ]);
    const pegs = mergeGeometries([
      new BoxGeometry(0.05, 0.12, 0.05).translate(0, 0.06, L / 2 + 0.66),
      new BoxGeometry(0.05, 0.12, 0.05).translate(0, 0.06, -L / 2 - 0.66),
    ]);
    T.tent = {
      layers: [
        { geo: shell, mat: m.canvas, ink: PROP_INK_PX },
        { geo: ridge, mat: m.bark, ink: DETAIL_INK },
        { geo: door, mat: m.canvasShade, ink: DETAIL_INK },
        { geo: mergeGeometries([flapL, flapR]), mat: m.canvasLit, ink: DETAIL_INK },
        { geo: ropes, mat: m.rope },
        { geo: pegs, mat: m.barkDark },
      ],
      foot: 0.66,
      rz: 0.95,
      // A tent glows from inside — that is what makes a camp read as inhabited.
      emitter: (t) => ({ kind: 'tentglow', x: t.x, z: t.z, y: 0.3, yaw: t.yaw ?? 0, s: t.s ?? 1 }),
    };
  }

  // --- 2 · BEDROLL (§18 "bedrolls"). Rolled mat + folded blanket + pillow.
  {
    const mat = new CylinderGeometry(0.16, 0.16, 0.92, 10)
      .rotateZ(Math.PI / 2)
      .translate(0, 0.14, 0);
    const blanket = new BoxGeometry(0.86, 0.09, 0.36).translate(0.02, 0.24, 0.02);
    const pillow = new SphereGeometry(0.13, 10, 7).scale(1, 0.7, 1).translate(-0.42, 0.26, 0);
    T.bedroll = {
      layers: [
        { geo: mat, mat: m.canvas, ink: PROP_INK_PX },
        { geo: blanket, mat: m.cloth, ink: DETAIL_INK },
        { geo: pillow, mat: m.canvasLit, ink: DETAIL_INK },
      ],
      foot: 0.5,
      rz: 0.28,
    };
  }

  // --- 3 · MARKET STALL SHELL (§18 "market-stall shell"). Four posts, a
  // counter, a striped canopy (two layers so the stripe is geometry, never a
  // texture) and a crate of goods under the counter.
  {
    const post = (x, z) =>
      new CylinderGeometry(0.05, 0.06, 1.02, 6).translate(x, 0.51, z);
    const posts = mergeGeometries([
      post(-0.66, -0.42),
      post(0.66, -0.42),
      post(-0.66, 0.42),
      post(0.66, 0.42),
    ]);
    const counter = new BoxGeometry(1.5, 0.1, 0.42).translate(0, 0.62, 0.36);
    const counterLip = new BoxGeometry(1.56, 0.05, 0.06).translate(0, 0.69, 0.56);
    // Canopy: a shallow gable made of two tilted slabs.
    const canopyA = new BoxGeometry(1.62, 0.06, 0.62).rotateX(0.3).translate(0, 1.08, -0.28);
    const canopyB = new BoxGeometry(1.62, 0.06, 0.62).rotateX(-0.3).translate(0, 1.08, 0.28);
    const stripes = mergeGeometries([
      new BoxGeometry(0.22, 0.05, 0.6).rotateX(0.3).translate(-0.52, 1.11, -0.28),
      new BoxGeometry(0.22, 0.05, 0.6).rotateX(0.3).translate(0.1, 1.11, -0.28),
      new BoxGeometry(0.22, 0.05, 0.6).rotateX(-0.3).translate(-0.2, 1.11, 0.28),
      new BoxGeometry(0.22, 0.05, 0.6).rotateX(-0.3).translate(0.42, 1.11, 0.28),
    ]);
    const valance = new BoxGeometry(1.6, 0.16, 0.04).translate(0, 0.98, 0.62);
    const goods = mergeGeometries([
      new BoxGeometry(0.3, 0.28, 0.26).rotateY(0.2).translate(-0.42, 0.14, 0.1),
      new BoxGeometry(0.24, 0.22, 0.22).rotateY(-0.3).translate(0.36, 0.11, -0.02),
      new SphereGeometry(0.11, 8, 6).translate(0.1, 0.75, 0.36),
      new SphereGeometry(0.09, 8, 6).translate(-0.22, 0.73, 0.4),
    ]);
    T.stall = {
      layers: [
        { geo: posts, mat: m.bark, ink: PROP_INK_PX },
        { geo: counter, mat: m.plank, ink: PROP_INK_PX },
        { geo: counterLip, mat: m.plankLit, ink: DETAIL_INK },
        { geo: mergeGeometries([canopyA, canopyB]), mat: m.canvasLit, ink: PROP_INK_PX },
        { geo: stripes, mat: m.stripe, ink: DETAIL_INK },
        { geo: valance, mat: m.stripe, ink: DETAIL_INK },
        { geo: goods, mat: m.plankLit, ink: DETAIL_INK },
      ],
      foot: 0.9,
      rz: 0.7,
    };
  }

  // --- 4 · ANVIL on a block (§18 "anvils"). Squat iron mass with a horn, on a
  // chopped-log base — the smithy's silhouette anchor.
  {
    const block = new CylinderGeometry(0.28, 0.32, 0.34, 9).translate(0, 0.17, 0);
    const waist = new BoxGeometry(0.2, 0.12, 0.16).translate(0, 0.4, 0);
    const face = new BoxGeometry(0.46, 0.13, 0.24).translate(0, 0.52, 0);
    const horn = new ConeGeometry(0.1, 0.28, 8).rotateZ(-Math.PI / 2).translate(0.34, 0.52, 0);
    const heel = new BoxGeometry(0.12, 0.1, 0.2).translate(-0.28, 0.51, 0);
    const hammer = mergeGeometries([
      new BoxGeometry(0.16, 0.08, 0.08).translate(-0.04, 0.62, 0.02),
      new CylinderGeometry(0.024, 0.024, 0.3, 6).rotateZ(0.9).translate(0.14, 0.68, 0.02),
    ]);
    T.anvil = {
      layers: [
        { geo: block, mat: m.bark, ink: PROP_INK_PX },
        { geo: mergeGeometries([waist, face, heel]), mat: m.iron, ink: PROP_INK_PX },
        { geo: horn, mat: m.iron, ink: DETAIL_INK },
        { geo: hammer, mat: m.steel, ink: DETAIL_INK },
      ],
      foot: 0.36,
    };
  }

  // --- 5 · WEAPON RACK WITH A GLOWING ITEM (§18, verbatim). Two uprights, a
  // crossbar, three stored weapons — and one of them is a lit blade whose gem
  // carries an additive halo in the emitter pass.
  {
    const uprights = mergeGeometries([
      new BoxGeometry(0.07, 0.98, 0.07).translate(-0.42, 0.49, 0),
      new BoxGeometry(0.07, 0.98, 0.07).translate(0.42, 0.49, 0),
    ]);
    const bars = mergeGeometries([
      new BoxGeometry(0.94, 0.06, 0.07).translate(0, 0.86, 0),
      new BoxGeometry(0.94, 0.05, 0.07).translate(0, 0.36, 0),
    ]);
    const feet = mergeGeometries([
      new BoxGeometry(0.16, 0.07, 0.44).translate(-0.42, 0.035, 0),
      new BoxGeometry(0.16, 0.07, 0.44).translate(0.42, 0.035, 0),
    ]);
    const spear = new CylinderGeometry(0.026, 0.026, 1.05, 6).rotateZ(0.13).translate(-0.24, 0.52, 0.02);
    const spearHead = new ConeGeometry(0.05, 0.17, 6).rotateZ(0.13).translate(-0.17, 1.1, 0.02);
    const axeHaft = new CylinderGeometry(0.026, 0.026, 0.82, 6).rotateZ(-0.16).translate(0.3, 0.41, 0.02);
    const axeHead = new BoxGeometry(0.19, 0.16, 0.05).rotateZ(-0.16).translate(0.21, 0.78, 0.02);
    const blade = new BoxGeometry(0.075, 0.66, 0.028).rotateZ(0.03).translate(0.03, 0.62, -0.02);
    const hilt = new BoxGeometry(0.2, 0.05, 0.05).translate(0.02, 0.29, -0.02);
    const grip = new CylinderGeometry(0.03, 0.03, 0.18, 6).translate(0.02, 0.2, -0.02);
    const gem = new IcosahedronGeometry(0.062, 0).translate(0.03, 0.97, -0.02);
    T.rack = {
      layers: [
        { geo: uprights, mat: m.bark, ink: PROP_INK_PX },
        { geo: bars, mat: m.plank, ink: DETAIL_INK },
        { geo: feet, mat: m.barkDark, ink: DETAIL_INK },
        { geo: mergeGeometries([spear, axeHaft, grip]), mat: m.barkDark, ink: DETAIL_INK },
        { geo: mergeGeometries([spearHead, axeHead, blade, hilt]), mat: m.steel, ink: DETAIL_INK },
        { geo: gem, mat: m.relic },
      ],
      foot: 0.58,
      rz: 0.3,
      emitter: (t) => ({ kind: 'relic', x: t.x, z: t.z, y: 0.97, yaw: t.yaw ?? 0, s: t.s ?? 1 }),
    };
  }

  // --- 6 · CART (§18 "cart"). Bed, side rails, two spoked wheels and a pair of
  // shafts tipped to the ground — the camp's one asymmetric silhouette.
  {
    const bed = new BoxGeometry(1.24, 0.14, 0.72).translate(0, 0.48, 0);
    const rails = mergeGeometries([
      new BoxGeometry(1.26, 0.24, 0.06).translate(0, 0.64, -0.33),
      new BoxGeometry(1.26, 0.24, 0.06).translate(0, 0.64, 0.33),
      new BoxGeometry(0.06, 0.24, 0.68).translate(-0.6, 0.64, 0),
    ]);
    const wheel = (z) =>
      mergeGeometries([
        new TorusGeometry(0.3, 0.055, 6, 14).translate(0, 0.3, z),
        new BoxGeometry(0.05, 0.56, 0.04).translate(0, 0.3, z),
        new BoxGeometry(0.56, 0.05, 0.04).translate(0, 0.3, z),
        new BoxGeometry(0.05, 0.56, 0.04).rotateZ(0.79).translate(0, 0.3, z),
      ]);
    const axle = new CylinderGeometry(0.045, 0.045, 0.9, 6).rotateX(Math.PI / 2).translate(0, 0.3, 0);
    const shafts = mergeGeometries([
      new BoxGeometry(0.9, 0.06, 0.06).rotateZ(-0.3).translate(0.98, 0.32, -0.26),
      new BoxGeometry(0.9, 0.06, 0.06).rotateZ(-0.3).translate(0.98, 0.32, 0.26),
    ]);
    const load = mergeGeometries([
      new BoxGeometry(0.34, 0.3, 0.32).rotateY(0.24).translate(-0.28, 0.68, 0.02),
      new CylinderGeometry(0.17, 0.17, 0.36, 9).rotateZ(Math.PI / 2).translate(0.22, 0.72, -0.06),
    ]);
    T.cart = {
      layers: [
        { geo: bed, mat: m.plank, ink: PROP_INK_PX },
        { geo: rails, mat: m.bark, ink: DETAIL_INK },
        { geo: mergeGeometries([wheel(-0.4), wheel(0.4)]), mat: m.barkDark, ink: DETAIL_INK },
        { geo: axle, mat: m.iron },
        { geo: shafts, mat: m.bark, ink: DETAIL_INK },
        { geo: load, mat: m.plankLit, ink: DETAIL_INK },
      ],
      foot: 0.8,
      rz: 0.62,
    };
  }

  // --- 7 · WOODPILE. Split rounds stacked in a pyramid beside the hearth: the
  // fire's fuel, and a low mass that breaks the ground line.
  {
    const round = (x, y, z, s) =>
      new CylinderGeometry(0.11 * s, 0.11 * s, 0.62, 8)
        .rotateZ(Math.PI / 2)
        .translate(x, y, z);
    const logs = mergeGeometries([
      round(0, 0.11, -0.24, 1),
      round(0.02, 0.11, 0, 1),
      round(-0.01, 0.11, 0.24, 1),
      round(0.01, 0.31, -0.12, 0.95),
      round(0, 0.31, 0.12, 0.95),
      round(0.01, 0.5, 0, 0.9),
    ]);
    const ends = mergeGeometries([
      new CircleGeometry(0.105, 8).rotateY(Math.PI / 2).translate(0.31, 0.11, -0.24),
      new CircleGeometry(0.105, 8).rotateY(Math.PI / 2).translate(0.33, 0.11, 0),
      new CircleGeometry(0.1, 8).rotateY(Math.PI / 2).translate(0.31, 0.31, 0.12),
      new CircleGeometry(0.095, 8).rotateY(Math.PI / 2).translate(0.31, 0.5, 0),
    ]);
    T.woodpile = {
      layers: [
        { geo: logs, mat: m.bark, ink: PROP_INK_PX },
        { geo: ends, mat: m.stumpTop, ink: DETAIL_INK },
      ],
      foot: 0.44,
      rz: 0.44,
    };
  }

  // --- 8 · LOG BENCH. A split log on two chocks — what the party sits on
  // around the fire, and the thing that makes the hearth read as a gathering.
  {
    const seat = new CylinderGeometry(0.17, 0.17, 1.14, 10, 1, false, 0, Math.PI)
      .rotateZ(Math.PI / 2)
      .rotateX(Math.PI)
      .translate(0, 0.34, 0);
    const top = new BoxGeometry(1.14, 0.04, 0.34).translate(0, 0.345, 0);
    const chocks = mergeGeometries([
      new BoxGeometry(0.17, 0.34, 0.28).translate(-0.4, 0.17, 0),
      new BoxGeometry(0.17, 0.34, 0.28).translate(0.4, 0.17, 0),
    ]);
    T.bench = {
      layers: [
        { geo: seat, mat: m.bark, ink: PROP_INK_PX },
        { geo: top, mat: m.stumpTop, ink: DETAIL_INK },
        { geo: chocks, mat: m.barkDark, ink: DETAIL_INK },
      ],
      foot: 0.62,
      rz: 0.24,
    };
  }

  // --- 9 · LANTERN POLE (§18 "hanging lanterns"). A tall pole with a crossarm
  // and a hung lantern: a second, smaller warm pool at head height that the
  // hearth still out-shines by a wide margin.
  {
    const pole = new CylinderGeometry(0.05, 0.065, 1.46, 7).translate(0, 0.73, 0);
    const base = new CylinderGeometry(0.17, 0.21, 0.12, 8).translate(0, 0.06, 0);
    const arm = new BoxGeometry(0.42, 0.05, 0.05).translate(0.18, 1.42, 0);
    const hook = new TorusGeometry(0.045, 0.014, 5, 8).rotateY(Math.PI / 2).translate(0.36, 1.37, 0);
    const cap = new ConeGeometry(0.12, 0.1, 6).translate(0.36, 1.28, 0);
    const glass = new BoxGeometry(0.15, 0.17, 0.15).translate(0.36, 1.17, 0);
    const frame = mergeGeometries([
      new BoxGeometry(0.17, 0.03, 0.17).translate(0.36, 1.07, 0),
      new BoxGeometry(0.02, 0.19, 0.02).translate(0.29, 1.17, -0.07),
      new BoxGeometry(0.02, 0.19, 0.02).translate(0.43, 1.17, -0.07),
      new BoxGeometry(0.02, 0.19, 0.02).translate(0.29, 1.17, 0.07),
      new BoxGeometry(0.02, 0.19, 0.02).translate(0.43, 1.17, 0.07),
    ]);
    T.lanternpole = {
      layers: [
        { geo: pole, mat: m.bark, ink: PROP_INK_PX },
        { geo: base, mat: m.stone, ink: DETAIL_INK },
        { geo: arm, mat: m.bark, ink: DETAIL_INK },
        { geo: hook, mat: m.iron },
        { geo: cap, mat: m.iron, ink: DETAIL_INK },
        { geo: frame, mat: m.ironDark, ink: DETAIL_INK },
        { geo: glass, mat: m.glass },
      ],
      foot: 0.36,
      faint: true,
      emitter: (t) => ({ kind: 'poleLantern', x: t.x, z: t.z, y: 1.17, yaw: t.yaw ?? 0, s: t.s ?? 1 }),
    };
  }

  // --- 10 · BANNER. Pole + hanging Sage cloth with a trim bar — the camp's
  // vertical accent and the party's colour flown over its own ground.
  {
    const pole = new CylinderGeometry(0.042, 0.055, 1.72, 7).translate(0, 0.86, 0);
    const foot = new CylinderGeometry(0.19, 0.23, 0.13, 8).translate(0, 0.065, 0);
    const arm = new BoxGeometry(0.5, 0.045, 0.045).translate(0.22, 1.66, 0);
    const flag = new BoxGeometry(0.42, 0.7, 0.02).translate(0.24, 1.28, 0);
    const trim = mergeGeometries([
      new BoxGeometry(0.44, 0.06, 0.03).translate(0.24, 1.6, 0),
      new BoxGeometry(0.44, 0.05, 0.03).translate(0.24, 0.95, 0),
    ]);
    const finial = new ConeGeometry(0.06, 0.16, 6).translate(0, 1.8, 0);
    T.banner = {
      layers: [
        { geo: pole, mat: m.bark, ink: PROP_INK_PX },
        { geo: foot, mat: m.stone, ink: DETAIL_INK },
        { geo: arm, mat: m.bark, ink: DETAIL_INK },
        { geo: flag, mat: m.cloth, ink: PROP_INK_PX },
        { geo: trim, mat: m.stripe, ink: DETAIL_INK },
        { geo: finial, mat: m.iron, ink: DETAIL_INK },
      ],
      foot: 0.3,
    };
  }

  // --- 11 · COOK TRIPOD. Three poles over the hearth with a hanging pot: the
  // detail that says "people cook here" and reads instantly at 3/4 top-down.
  {
    const leg = (a) =>
      new CylinderGeometry(0.028, 0.034, 1.18, 6)
        .rotateZ(0.28)
        .rotateY(a)
        .translate(Math.sin(a) * 0.0, 0.57, Math.cos(a) * 0.0);
    const legs = mergeGeometries([leg(0), leg(2.094), leg(4.189)]);
    const chain = new CylinderGeometry(0.014, 0.014, 0.2, 5).translate(0, 0.98, 0);
    const pot = new LatheGeometry(
      [
        new Vector2(0.001, 0),
        new Vector2(0.14, 0.02),
        new Vector2(0.19, 0.12),
        new Vector2(0.17, 0.26),
        new Vector2(0.19, 0.29),
        new Vector2(0.185, 0.31),
        new Vector2(0.001, 0.31),
      ],
      12
    ).translate(0, 0.56, 0);
    const handle = new TorusGeometry(0.15, 0.016, 5, 10, Math.PI)
      .rotateZ(Math.PI)
      .rotateY(Math.PI / 2)
      .translate(0, 0.88, 0);
    T.tripod = {
      layers: [
        { geo: legs, mat: m.barkDark, ink: DETAIL_INK },
        { geo: chain, mat: m.iron },
        { geo: pot, mat: m.ironDark, ink: PROP_INK_PX },
        { geo: handle, mat: m.iron },
      ],
      foot: 0.42,
      faint: true,
    };
  }

  // --- 12 · HEARTH-FIRE RING (§18: the camp's ONE warm light source). A ring
  // of set stones, an ash bed, live coals and four crossed logs. The flame,
  // halo, pool, embers and PointLight ride on the emitter this returns
  // (env/camp/hearth.js) — this is the object that MAKES the light, so it has
  // to survive as a readable silhouette inside its own glow (the arena's F1
  // finding: a pool with no visible emitter reads as a sourceless blob).
  {
    const stones = [];
    const N = 11;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const rr = 0.86 + (i % 3) * 0.035;
      const s = 0.15 + (i % 4) * 0.022;
      stones.push(
        new IcosahedronGeometry(s, 0)
          .scale(1.25, 0.8, 1)
          .rotateY(a)
          .translate(Math.cos(a) * rr, s * 0.62, Math.sin(a) * rr)
      );
    }
    const ring = mergeGeometries(stones);
    const bed = new CylinderGeometry(0.78, 0.86, 0.06, 18).translate(0, 0.03, 0);
    // IcosahedronGeometry is NON-indexed and CylinderGeometry is indexed;
    // mergeGeometries refuses a mixed batch (it returns null and the ink hull
    // then crashes on it), so the coal bed is flattened to non-indexed first.
    const coals = mergeGeometries([
      new CylinderGeometry(0.5, 0.58, 0.05, 16).translate(0, 0.065, 0).toNonIndexed(),
      new IcosahedronGeometry(0.13, 0).scale(1, 0.5, 1).translate(0.24, 0.08, 0.12),
      new IcosahedronGeometry(0.1, 0).scale(1, 0.5, 1).translate(-0.22, 0.08, -0.15),
    ]);
    const logs = mergeGeometries([
      new CylinderGeometry(0.085, 0.075, 0.98, 8).rotateZ(Math.PI / 2).rotateY(0.5).rotateX(-0.22).translate(0, 0.2, 0),
      new CylinderGeometry(0.08, 0.07, 0.94, 8).rotateZ(Math.PI / 2).rotateY(-0.6).rotateX(0.2).translate(0.02, 0.26, 0),
      new CylinderGeometry(0.07, 0.062, 0.86, 8).rotateZ(Math.PI / 2).rotateY(1.5).rotateX(0.15).translate(-0.02, 0.17, 0.02),
    ]);
    T.hearth = {
      layers: [
        { geo: bed, mat: m.ash, ink: DETAIL_INK },
        { geo: ring, mat: m.stone, ink: PROP_INK_PX },
        { geo: coals, mat: m.coal },
        { geo: logs, mat: m.barkDark, ink: PROP_INK_PX },
      ],
      foot: 1.05,
      faint: true,
      emitter: (t) => ({ kind: 'hearth', x: t.x, z: t.z, y: 0.3, yaw: t.yaw ?? 0, s: t.s ?? 1 }),
    };
  }

  // --- 13 · FORGE. A stone hood with a lit coal bed beside the anvil: the
  // camp's second, smaller fire, and the reason the smithy corner is legible.
  {
    const body = new BoxGeometry(0.86, 0.5, 0.6).translate(0, 0.25, 0);
    const rim = new BoxGeometry(0.94, 0.08, 0.68).translate(0, 0.52, 0);
    const hood = new BoxGeometry(0.7, 0.42, 0.3).rotateX(-0.18).translate(0, 0.78, -0.19);
    const chimney = new CylinderGeometry(0.11, 0.14, 0.44, 7).translate(0, 1.08, -0.19);
    const coals = new BoxGeometry(0.5, 0.05, 0.34).translate(0, 0.55, 0.06);
    T.forge = {
      layers: [
        { geo: body, mat: m.stone, ink: PROP_INK_PX },
        { geo: rim, mat: m.stoneLit, ink: DETAIL_INK },
        { geo: hood, mat: m.stoneDark, ink: PROP_INK_PX },
        { geo: chimney, mat: m.ironDark, ink: DETAIL_INK },
        { geo: coals, mat: m.coal },
      ],
      foot: 0.56,
      rz: 0.42,
      faint: true,
      emitter: (t) => ({ kind: 'forge', x: t.x, z: t.z, y: 0.6, yaw: t.yaw ?? 0, s: t.s ?? 1 }),
    };
  }

  // --- 14 · RUN PORTAL (§18: "the glowing run-portal / gate marker"). Two
  // dressed jambs, a lintel and a carved rune band. This is the camp's ONE
  // arcane object — §19.1 grants the camp a violet-arcane family, and it lives
  // here and nowhere else. It is a GATE, never corruption: no veining, no
  // Ember, and the stone itself is cool grey rather than the act's near-black
  // corruption monolith.
  {
    const jamb = (x) =>
      mergeGeometries([
        new BoxGeometry(0.34, 1.62, 0.34).rotateY(x > 0 ? -0.04 : 0.04).translate(x, 0.81, 0),
        new BoxGeometry(0.46, 0.14, 0.46).translate(x, 0.07, 0),
      ]);
    const lintel = mergeGeometries([
      new BoxGeometry(1.72, 0.26, 0.4).translate(0, 1.72, 0),
      new BoxGeometry(1.94, 0.12, 0.46).translate(0, 1.9, 0),
    ]);
    const runes = mergeGeometries([
      new BoxGeometry(1.2, 0.055, 0.03).translate(0, 1.72, 0.2),
      new BoxGeometry(0.05, 0.9, 0.03).translate(-0.62, 0.9, 0.18),
      new BoxGeometry(0.05, 0.9, 0.03).translate(0.62, 0.9, 0.18),
      new BoxGeometry(0.16, 0.05, 0.03).translate(-0.62, 1.24, 0.18),
      new BoxGeometry(0.16, 0.05, 0.03).translate(0.62, 0.62, 0.18),
    ]);
    // The gate's threshold slab: where the Healer stands to press E.
    const sill = mergeGeometries([
      new BoxGeometry(1.5, 0.07, 0.72).translate(0, 0.035, 0.5),
      new BoxGeometry(1.16, 0.05, 0.5).translate(0, 0.075, 0.5),
    ]);
    T.portal = {
      layers: [
        { geo: mergeGeometries([jamb(-0.72), jamb(0.72)]), mat: m.stoneCool, ink: PROP_INK_PX },
        { geo: lintel, mat: m.stone, ink: PROP_INK_PX },
        { geo: sill, mat: m.stoneLit, ink: DETAIL_INK },
        { geo: runes, mat: m.rune },
      ],
      foot: 1.05,
      rz: 0.55,
      faint: true,
      emitter: (t) => ({ kind: 'portal', x: t.x, z: t.z, y: 1.0, yaw: t.yaw ?? 0, s: t.s ?? 1 }),
    };
  }

  // --- 15 · RUNE STONE. Small standing stones flanking the gate. Same arcane
  // family, one faint carved line each — they tie the portal to the ground
  // instead of leaving it floating at the north wall.
  {
    const body = new BoxGeometry(0.3, 0.72, 0.22).rotateZ(0.06).translate(0, 0.36, 0);
    const cap = new BoxGeometry(0.34, 0.08, 0.26).translate(0, 0.74, 0);
    const foot = new IcosahedronGeometry(0.24, 0).scale(1.2, 0.34, 1.1).translate(0, 0.05, 0);
    const mark = new BoxGeometry(0.04, 0.34, 0.02).translate(0.01, 0.42, 0.11);
    T.runestone = {
      layers: [
        { geo: body, mat: m.stoneCool, ink: PROP_INK_PX },
        { geo: cap, mat: m.stone, ink: DETAIL_INK },
        { geo: foot, mat: m.stoneDark, ink: DETAIL_INK },
        { geo: mark, mat: m.rune },
      ],
      foot: 0.3,
    };
  }

  // --- 16 · SACK. Small stuffed grain sacks — the low filler mass that keeps
  // the stall and the cart corner from having a flat ground line between props.
  {
    const body = new LatheGeometry(
      [
        new Vector2(0.001, 0),
        new Vector2(0.19, 0.01),
        new Vector2(0.22, 0.13),
        new Vector2(0.16, 0.3),
        new Vector2(0.09, 0.36),
        new Vector2(0.001, 0.38),
      ],
      10
    );
    const tie = new TorusGeometry(0.085, 0.022, 5, 9).rotateX(Math.PI / 2).translate(0, 0.33, 0);
    T.sack = {
      layers: [
        { geo: body, mat: m.canvasShade, ink: PROP_INK_PX },
        { geo: tie, mat: m.rope },
      ],
      foot: 0.24,
    };
  }

  return T;
}

// ---------------------------------------------------------------------------
// Placement. Camp layout is HAND-AUTHORED (§13: hand-built layout pool) — a
// camp is a place people made, so nothing here is scattered by a random stream.
// spec.props: [type, x, z, yaw?, scale?]
// ---------------------------------------------------------------------------
function addInstanced(root, layers, transforms) {
  const meshes = [];
  for (const layer of layers) {
    const im = new InstancedMesh(layer.geo, layer.mat, transforms.length);
    im.frustumCulled = false;
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
  const mm = new Matrix4();
  const q = new Quaternion();
  const p = new Vector3();
  const s = new Vector3();
  transforms.forEach((t, i) => {
    q.setFromAxisAngle(UP, t.yaw ?? 0);
    p.set(t.x, 0, t.z);
    const sc = t.s ?? 1;
    s.set(sc, t.sy ?? sc, sc);
    mm.compose(p, q, s);
    for (const im of meshes) im.setMatrixAt(i, mm);
  });
  for (const im of meshes) {
    im.instanceMatrix.needsUpdate = true;
    root.add(im);
  }
  return meshes;
}

export function buildCampProps(root, spec) {
  const mats = campMaterials();
  const types = campPropTypes(mats);
  const shadows = [];
  const emitters = [];
  const footprints = [];
  const byType = new Map();
  for (const entry of spec.props ?? []) {
    const [name, x, z, yaw = 0, s = 1] = entry;
    if (!types[name]) continue;
    if (!byType.has(name)) byType.set(name, []);
    byType.get(name).push({ x, z, yaw, s });
  }
  let typeCount = 0;
  for (const [name, transforms] of byType) {
    const def = types[name];
    typeCount += 1;
    addInstanced(root, def.layers, transforms);
    for (const t of transforms) {
      const sc = t.s ?? 1;
      shadows.push({
        x: t.x,
        z: t.z,
        rx: def.foot * sc * SHADOW_SPREAD,
        rz: (def.rz ?? def.foot) * sc * SHADOW_SPREAD,
        yaw: t.yaw,
        faint: !!def.faint,
      });
      footprints.push({ x: t.x, z: t.z, r: Math.max(def.foot, def.rz ?? 0) * sc + 0.16 });
      if (def.emitter) emitters.push(def.emitter(t));
    }
  }
  return { emitters, shadows, footprints, typeCount, mats, names: [...byType.keys()] };
}
