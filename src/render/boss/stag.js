// THE HOLLOW STAG — boss rig (BUILD_BRIEF §11 boss bullets + §19.2 "Boss stag
// scale 2.2x, veined antlers with violet glow sprites").
//
// Read, in the reference-bar grammar:
//   - party-height x2.2: a 2.5 u silhouette against the party's 1.05 u chibis,
//     built from the same FLAT-SHADED angular primitives the Act-1 beasts use
//     (§19.2 enemies = angular, party = soft bells) with ink on the big masses
//   - VIOLET-VEINED ANTLERS: a branching rack in bone, veined with unlit
//     God-stuff Violet-white filaments and tip glow sprites — the boss reads as
//     corruption from the first frame
//   - "the room's single brightest light source (feverish warm boss-light)":
//     the rack, the hollow chest cavity and the ground pool under the hooves
//     are all emitters over the bloom threshold, and the layer hangs a warm
//     PointLight on the body (render/boss/index.js) while dimming the room
//   - grounding: an oversized contact shadow; NO identity ring (party-only)
//
// Faces +Z. Every animation value arrives per frame through `pose`.
import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  LinearSRGBColorSpace,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from 'three';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow, exactColor, mix } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { HIDE, TELL_VIOLET } from '../enemies/style.js';
import { VEIN_VIOLET } from '../../env/props.js';

// --- Colour recipe (Round D F5b: the rack measured 62-67% AZURE, 195-244 deg,
// against 14-20% violet). Three things put it there and all three are gone:
//   1. the rack surface was BONE, so the additive violet halo summed with a
//      pale grey to white-blue instead of sitting on a violet base;
//   2. the hide was the boar's saturated slate (hue ~215), so every violet
//      pixel that feathered onto the body averaged into blue;
//   3. the halo's own violet was the raw anchor, which ACES + the warm grade
//      flatten to ~247 deg — the bottom edge of the analyzer's 245-285 band.
// Now: the RACK is an opaque, unlit, post-chain-EXACT God-stuff Violet (hue
// 259, sat 0.58 on screen) so it measures violet by itself; the VEINS are the
// white peak #F1ECFA and nothing else; the halo/sparks ride the corrupted
// monolith's pre-compensated VEIN_VIOLET recipe (env/props.js — the prop that
// measures 72% violet in the same frames), with the red share lifted a little
// so its mid-falloff lands ~255-262 instead of on the band edge; and the hide
// is a DESATURATED charcoal-slate that counts in no hue band at all.
// The peak white is reserved for the hairline vein filaments and the crown
// core — a whole rack of near-white cones reads as a lens flare, not veining.
const VEIN_CORE = exactColor(PALETTE.godstuffVioletPeak);
// Rack surface: God-stuff Violet one value step under the anchor so the white
// veins read ON it (display #8F63EE = hue 259 / sat 0.58 / value 0.93).
const RACK = exactColor('#8F63EE');
// Additive violet for the halo, the tip sparks and the crown skirt — linear,
// blue-leaning like the monolith's veins (their feather over dark ground must
// fall to neutral mauve, never into the reserved Ember band).
const HALO_LINEAR = [VEIN_VIOLET[0] * 1.12, VEIN_VIOLET[1] * 0.92, VEIN_VIOLET[2]];
const haloViolet = (k = 1) =>
  new Color().setRGB(HALO_LINEAR[0] * k, HALO_LINEAR[1] * k, HALO_LINEAR[2] * k, LinearSRGBColorSpace);
// Crown core: the Stag's own hottest emitter (§11 "the room's single
// brightest light source"). HDR white-violet in linear, well over the 0.68
// bloom threshold, so its centre blooms to the peak and the skirt stays violet.
// Round-1 certification: the crown box measured >200 on 47.7% of its pixels
// with only 203 saturated px inside it — i.e. a white hole where the light
// SOURCE should be. Cooled by a third, and the sprite now sits on top of an
// opaque crown STAR (a small violet-white burr of geometry) so that whatever
// the bloom does, a shape stays visible inside the glow.
const CROWN_LINEAR = [1.16, 1.02, 1.5];
// Hide: the boar's slate desaturated toward warm grey and pushed dark — the
// boss body is a shadow the antlers hang in, and it must not read as blue.
const HULK = HIDE.boarBody.clone().lerp(new Color(PALETTE.warmGrey), 0.45).multiplyScalar(0.72);
const HULK_DARK = HIDE.boarDark.clone().lerp(new Color(PALETTE.warmGrey), 0.4).multiplyScalar(0.55);
// Certification fix round 1 (2026-09-09): all three scorers read the Stag as
// "a featureless navy hexagonal slab / an obelisk" — identity carried ONLY by
// the antler V (REFERENCE_BAR check 3). The rig had a head, a muzzle and four
// legs; none of them survived, because every one of them was the SAME dark
// hide as the barrel they sit on, at a 52-degree camera where the head
// projects on top of the body. The fix is value, not geometry: the skull,
// muzzle and shoulder hump take a light hide, the legs and hooves get their
// own ink lines, and the rack sweeps further back so it stops covering the
// head in plan view.
const HULK_PALE = HIDE.boarBody.clone().lerp(new Color(PALETTE.warmGrey), 0.72).multiplyScalar(0.98);

// §11 makes the boss room "a stop darker" and §1 forbids a real boss light
// (a PointLight costs a shader recompile on the frame it appears, or a
// permanent fps tax if parked). With neither, every lit surface on a 2.2x body
// rendered near-black and the round-1 scorers saw "a featureless navy slab".
// So the Stag is SELF-LIT: each hide material carries its own colour as a base
// emissive, which lifts the body out of black without flattening the toon
// banding the key light still produces. The §9 #1 hit flash is not an
// emissiveIntensity latch any more (that would fight the base) — it LERPS the
// emissive colour toward white, so the flash is still white, still additive,
// and still never a material swap.
const flashable = (color) => {
  const base = new Color(color).multiplyScalar(0.14);
  const m = toonMaterial({ color, emissive: base.clone(), emissiveIntensity: 1, flatShading: true });
  m.userData.baseEmissive = base;
  return m;
};
const FLASH_WHITE = new Color('#FFFFFF');

let geoCache = null;
function geos() {
  if (geoCache) return geoCache;
  geoCache = {
    body: new SphereGeometry(0.58, 6, 4),
    chest: new SphereGeometry(0.46, 6, 4),
    neck: new CylinderGeometry(0.22, 0.34, 0.7, 6),
    skull: new ConeGeometry(0.28, 0.86, 6),
    jaw: new CylinderGeometry(0.12, 0.16, 0.2, 5),
    ear: new ConeGeometry(0.1, 0.26, 4),
    leg: new CylinderGeometry(0.09, 0.06, 1.05, 6),
    hoof: new CylinderGeometry(0.08, 0.1, 0.14, 5),
    eye: new BoxGeometry(0.15, 0.035, 0.035),
    beam: new CylinderGeometry(0.055, 0.035, 1, 5), // antler beam, scaled per branch
    tine: new ConeGeometry(0.05, 1, 4), // antler tine, scaled per branch
    rib: new BoxGeometry(0.05, 0.34, 0.05),
  };
  return geoCache;
}

// One antler half: a swept beam with 4 tines, mirrored by `side`.
function buildAntler(side, rackMat, veinMats, glows) {
  const G = geos();
  const half = new Group();
  half.rotation.z = side * 0.86; // spread wide — the rack is the silhouette
  half.rotation.x = -0.62; // swept back and UP off a lowered head: the V clears the muzzle

  const beam = new Mesh(G.beam, rackMat);
  beam.scale.set(1, 0.98, 1);
  beam.position.set(side * 0.12, 0.56, -0.02);
  beam.rotation.z = side * -0.22;
  addInk(beam);
  half.add(beam);

  // White vein running the beam (unlit filament laid just off the surface).
  const vein = new Mesh(G.beam, veinMats.core);
  vein.scale.set(0.5, 1.0, 0.5);
  vein.position.copy(beam.position);
  vein.position.x += side * 0.035;
  vein.rotation.copy(beam.rotation);
  half.add(vein);

  const tines = [
    // [x, y, z, length, tilt, yaw] — yaw fans the branch in PLAN view.
    [0.2, 0.82, 0.06, 0.5, -0.5, 0.55],
    [0.34, 1.02, 0.1, 0.58, -0.85, 0.18],
    [0.2, 1.2, -0.08, 0.48, -1.2, -0.3],
    [0.02, 1.3, 0.02, 0.44, -1.6, -0.7],
  ];
  for (let i = 0; i < tines.length; i++) {
    const [tx, ty, tz, len, tilt, tyaw] = tines[i];
    const tine = new Mesh(G.tine, rackMat);
    tine.scale.set(1.15, len, 1.15);
    tine.position.set(side * tx, ty, tz);
    tine.rotation.set(tilt * 0.5, side * tyaw, side * tilt);
    half.add(tine);
    // White vein filament on every tine (hairline: 0.42 of the tine's girth so
    // the violet rack stays the read and the vein is a line ON it).
    const filament = new Mesh(G.tine, veinMats.core);
    filament.scale.set(0.42, len * 0.94, 0.42);
    filament.position.copy(tine.position);
    filament.rotation.copy(tine.rotation);
    half.add(filament);

    // Tip spark on every OTHER tine only: §19.2 wants a veined rack, not a
    // lamp. Violet (never the near-white peak) so a dozen additive sprites
    // cannot stack into a white hole where the silhouette should be.
    if (i % 2 === 0) {
      const spark = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 0.26, opacity: 0.4 });
      spark.material.toneMapped = false;
      spark.material.color.copy(haloViolet(0.6));
      spark.position.set(
        side * tx + Math.sin(side * tilt) * len * 0.5,
        ty + Math.cos(tilt * 0.5) * len * 0.5,
        tz
      );
      half.add(spark);
      glows.push(spark);
    }
  }
  return half;
}

export function buildStag() {
  const G = geos();
  const group = new Group();
  group.name = 'hollow-stag';
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group();
  yaw.add(rig);

  const mats = [];
  const track = (m) => {
    mats.push(m);
    return m;
  };
  const glows = [];
  // Shared unlit vein materials — the rack, the ridge and the eye glints all
  // draw from the same two-step violet ramp.
  const veinBasic = {
    core: new MeshBasicMaterial({ color: VEIN_CORE, toneMapped: false }),
    violet: new MeshBasicMaterial({ color: RACK, toneMapped: false }),
  };

  // --- Body: long faceted barrel, shoulders high.
  const body = new Mesh(G.body, track(flashable(HULK)));
  body.scale.set(0.8, 0.82, 1.55);
  body.position.set(0, 1.26, -0.18);
  body.rotation.x = -0.07;
  addInk(body);
  rig.add(body);

  const chest = new Mesh(G.chest, track(flashable(HULK_DARK)));
  chest.scale.set(0.92, 0.94, 0.86);
  chest.position.set(0, 1.3, 0.4);
  addInk(chest);
  rig.add(chest);

  // Shoulder hump: the light plane on top of the withers. From above this is
  // the mass the eye lands on first, and having it a full value step off the
  // barrel is what turns "slab" into "an animal seen from above".
  const hump = new Mesh(G.chest, track(flashable(HULK_PALE)));
  hump.scale.set(0.86, 0.6, 0.78);
  hump.position.set(0, 1.62, 0.22);
  addInk(hump);
  rig.add(hump);

  // --- THE HOLLOW: a rib cage over a violet cavity light. The name is the
  // silhouette's one storytelling beat — and it is a real emitter (§19.3:
  // every emitter carries a glow sprite).
  const ribMat = track(flashable(HIDE.bone));
  for (let i = 0; i < 5; i++) {
    const rib = new Mesh(G.rib, ribMat);
    rib.position.set(-0.31 + i * 0.155, 1.14, 0.48);
    rib.rotation.z = (i - 2) * 0.14;
    rig.add(rib);
  }
  const cavity = new Mesh(new SphereGeometry(0.2, 8, 6), new MeshBasicMaterial({
    color: TELL_VIOLET,
    toneMapped: false,
  }));
  cavity.position.set(0, 1.16, 0.44);
  rig.add(cavity);
  const cavityGlow = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 0.7, opacity: 0.36 });
  cavityGlow.material.toneMapped = false;
  cavityGlow.material.color.copy(haloViolet(0.55));
  cavityGlow.position.set(0, 1.18, 0.5);
  rig.add(cavityGlow);
  glows.push(cavityGlow);

  // --- Dorsal ridge: angular bone plates up the spine with violet veining
  // between them. The back is the surface the 3/4 camera sees, so the
  // corruption tell lives here as well as on the rack.
  const ridgeMat = new MeshBasicMaterial({ color: RACK, toneMapped: false });
  for (let i = 0; i < 6; i++) {
    const k = i / 5;
    const plate = new Mesh(G.tine, ridgeMat);
    plate.scale.set(0.55, 0.3 + 0.16 * Math.sin(k * Math.PI), 0.22);
    plate.position.set(0, 1.62 - 0.06 * k, 0.35 - k * 1.25);
    plate.rotation.x = -0.55 - 0.25 * k;
    rig.add(plate);
    const spark = new Mesh(G.tine, i % 2 === 0 ? veinBasic.violet : veinBasic.core);
    spark.scale.set(0.3, 0.26 + 0.12 * Math.sin(k * Math.PI), 0.12);
    spark.position.copy(plate.position);
    spark.position.y += 0.03;
    spark.rotation.copy(plate.rotation);
    rig.add(spark);
  }

  // --- Neck + head.
  const head = new Group();
  head.position.set(0, 1.34, 1.06);
  rig.add(head);
  const neck = new Mesh(G.neck, track(flashable(HULK_DARK)));
  neck.position.set(0, -0.02, -0.34);
  neck.rotation.x = 0.8;
  addInk(neck);
  head.add(neck);
  const skull = new Mesh(G.skull, track(flashable(HULK_PALE)));
  skull.scale.set(1.12, 1.22, 1.12);
  skull.rotation.x = Math.PI / 2 + 0.42;
  skull.position.set(0, 0.08, 0.34);
  addInk(skull);
  head.add(skull);
  // Muzzle: a real bone snout that projects past the skull, so the head has a
  // FRONT. Inked, and the palest thing on the body below the rack.
  const jaw = new Mesh(G.jaw, track(flashable(HIDE.bone)));
  jaw.scale.set(1.35, 1.5, 1.35);
  jaw.rotation.x = Math.PI / 2 + 0.42;
  jaw.position.set(0, -0.08, 0.76);
  addInk(jaw);
  head.add(jaw);
  const earMat = track(flashable(HULK_DARK));
  for (const side of [-1, 1]) {
    const ear = new Mesh(G.ear, earMat);
    ear.scale.set(1.2, 1.25, 1.2);
    ear.position.set(side * 0.24, 0.24, -0.02);
    ear.rotation.set(-0.3, 0, side * -0.85);
    addInk(ear);
    head.add(ear);
  }
  // Angular slit eyes with a violet glint (§11: never the party's round warm
  // bean eyes; the glint is the corruption tell the family shares).
  const eyeMat = new MeshBasicMaterial({
    color: exactColor(PALETTE.voidCharcoal),
    toneMapped: false,
  });
  const glintMat = new MeshBasicMaterial({ color: RACK, toneMapped: false });
  for (const side of [-1, 1]) {
    const eye = new Mesh(G.eye, eyeMat);
    eye.position.set(side * 0.17, 0.12, 0.3);
    eye.rotation.set(0, side * -0.3, side * 0.4);
    head.add(eye);
    const glint = new Mesh(new BoxGeometry(0.07, 0.03, 0.03), glintMat);
    glint.position.set(side * 0.19, 0.13, 0.33);
    glint.rotation.copy(eye.rotation);
    head.add(glint);
    const eyeGlow = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 0.22, opacity: 0.35 });
    eyeGlow.material.toneMapped = false;
    eyeGlow.material.color.copy(haloViolet(0.6));
    eyeGlow.position.set(side * 0.19, 0.13, 0.36);
    head.add(eyeGlow);
    glows.push(eyeGlow);
  }

  // --- The rack: two mirrored antler halves + one big halo so the whole crown
  // blooms as one light (this is the pixel that has to be the brightest thing
  // in the room).
  // Unlit and outside the flash set: the rack is corruption, not hide — the
  // warm key must not rotate it toward rose and the hit flash must not white
  // it out (the flash is the BODY's, §9 #1).
  const rackMat = new MeshBasicMaterial({ color: RACK, toneMapped: false });
  const veinMats = veinBasic;
  const antlers = new Group();
  antlers.position.set(0, 0.34, -0.12);
  head.add(antlers);
  for (const side of [-1, 1]) antlers.add(buildAntler(side, rackMat, veinMats, glows));
  // Halo pulled well back: at size 2.2 / opacity 0.72 this additive sprite sat
  // over the rack and washed the violet veins to white before they reached the
  // frame (measured: 0 violet px in the antler box), and it fed the bloom
  // blowout that erased the whole silhouette. Smaller and dimmer, it haloes the
  // rack instead of replacing it — the veins are the read, not the glow.
  // Round D F5a/F5b: the halo comes back up (1.35/0.34 -> 2.1/0.5) now that it
  // sums onto a VIOLET rack instead of a bone one, and it carries the
  // pre-compensated violet so its falloff measures in-band. Above it sits the
  // CROWN CORE — the single hottest emitter in the room: a small HDR
  // white-violet sprite at the centre of the rack whose bloom is what makes
  // the Stag, not a torch, the brightest 24 px block in frame.
  const rackHalo = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 1.7, opacity: 0.42 });
  rackHalo.material.toneMapped = false;
  rackHalo.material.color.copy(haloViolet(1));
  rackHalo.position.set(0, 0.94, -0.44);
  antlers.add(rackHalo);
  glows.push(rackHalo);
  // The crown's SOURCE: an opaque burr of six short violet spikes around a
  // white-violet bead, inked so its outline survives the halo. This is the
  // shape the bloom blooms FROM — REFERENCE_BAR check 5/7 want a source, not
  // a blown disc.
  const crownStar = new Group();
  crownStar.position.set(0, 0.98, -0.46);
  antlers.add(crownStar);
  const bead = new Mesh(new SphereGeometry(0.085, 6, 5), new MeshBasicMaterial({
    color: VEIN_CORE,
    toneMapped: false,
  }));
  addInk(bead);
  crownStar.add(bead);
  const burrMat = new MeshBasicMaterial({ color: RACK, toneMapped: false });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const burr = new Mesh(G.tine, burrMat);
    burr.scale.set(0.42, 0.3, 0.42);
    burr.position.set(Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0);
    burr.rotation.z = a - Math.PI / 2;
    addInk(burr);
    crownStar.add(burr);
  }
  const crownCore = makeGlowSprite({ color: PALETTE.godstuffVioletPeak, size: 0.36, opacity: 0.6 });
  crownCore.material.toneMapped = false;
  crownCore.material.color.setRGB(CROWN_LINEAR[0], CROWN_LINEAR[1], CROWN_LINEAR[2], LinearSRGBColorSpace);
  crownCore.position.set(0, 0.98, -0.46);
  antlers.add(crownCore);

  // --- Legs: long, thin, high-kneed — the height reads through the gap.
  const legMat = track(flashable(HULK_DARK));
  const hoofMat = track(flashable(HIDE.bone));
  const legs = [];
  for (const [sx, sz, splay] of [
    [-0.42, 0.5, 0.16],
    [0.42, 0.5, -0.16],
    [-0.45, -0.6, 0.19],
    [0.45, -0.6, -0.19],
  ]) {
    const pivot = new Group();
    pivot.position.set(sx, 0.99, sz);
    const leg = new Mesh(G.leg, legMat);
    leg.position.y = -0.49;
    leg.rotation.z = splay; // splayed out past the barrel: four legs in plan view
    addInk(leg);
    pivot.add(leg);
    const hoof = new Mesh(G.hoof, hoofMat);
    hoof.position.set(Math.sin(splay) * -0.97, -0.97, 0);
    addInk(hoof);
    pivot.add(hoof);
    rig.add(pivot);
    legs.push(pivot);
  }

  // --- Tail flag: a stag's rear identity feature. The boss faces its target,
  // which is very often straight away from a 52-degree camera, so the rig
  // needs something at the RUMP that says "deer" when the muzzle is hidden.
  const tail = new Mesh(G.tine, track(flashable(HIDE.bone)));
  tail.scale.set(0.62, 0.44, 0.34);
  tail.position.set(0, 1.42, -1.06);
  tail.rotation.x = 0.55;
  addInk(tail);
  rig.add(tail);
  const rump = new Mesh(G.chest, track(flashable(HULK)));
  rump.scale.set(0.74, 0.6, 0.62);
  rump.position.set(0, 1.4, -0.78);
  addInk(rump);
  rig.add(rump);

  // --- Ground pool: the warm boss-light landing on the floor under the body
  // (the light itself is a PointLight the layer parents here).
  // §11 "feverish warm boss-light": with no real light on the rig, the pool
  // and its wider spill ARE the boss-light — the warm floor the Stag stands
  // in, and the only warm emitter in a room that just dropped a stop.
  //
  // These are ground-plane MESHES, not sprites: a sprite is camera-facing, and
  // a flattened one this size intersects the floor and gets sliced into a hard
  // warm band across the frame. A disc lying at y ~ 0 always reads as light on
  // the ground.
  const groundGlow = (radius, color, opacity) => {
    const m = new Mesh(
      new CircleGeometry(radius, 28),
      new MeshBasicMaterial({
        map: getRadialTexture(),
        color,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    m.material.opacity = opacity;
    m.rotation.x = -Math.PI / 2;
    return m;
  };
  const pool = groundGlow(1.9, PALETTE.hearthAmber, 0.44);
  pool.position.set(0, 0.03, -0.3);
  yaw.add(pool);
  // Wider, softer spill so the warm falloff reads as light on the floor and
  // not as a decal with an edge.
  const spill = groundGlow(3.4, PALETTE.hearthAmber, 0.22);
  spill.position.set(0, 0.02, -0.3);
  yaw.add(spill);

  // Contact shadow (REFERENCE_BAR check 8). The round-1 scorers measured a
  // 5-12% luma dip under a 2.2x body and called it absent — because the two
  // ADDITIVE ground pools above sit at y 0.02/0.03 and are drawn after it, so
  // every photon the shadow removed was added straight back. This one is a
  // normal-blended disc parked ABOVE the pools in both y and renderOrder, so
  // it darkens the summed result: a hard core disc under the barrel plus a
  // soft feathered skirt.
  const hardShadow = new Mesh(
    new CircleGeometry(0.92, 30),
    new MeshBasicMaterial({
      map: getRadialTexture(),
      color: exactColor('#0B1018'),
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -6,
    })
  );
  hardShadow.rotation.x = -Math.PI / 2;
  // Parented to `group`, not `yaw`: a contact shadow belongs to the FLOOR, so
  // it must not spin with the body. Pushed toward the camera (+z) because at a
  // 52-degree elevation a 2.5 u body stands in front of its own footprint —
  // centred, the shadow renders entirely behind the barrel and measures as
  // absent, which is exactly what round 1 found.
  hardShadow.position.set(0, 0.038, 0.62);
  hardShadow.scale.set(1.28, 0.92, 1);
  hardShadow.renderOrder = 6;
  group.add(hardShadow);
  const softShadow = new Mesh(
    new CircleGeometry(1.55, 30),
    new MeshBasicMaterial({
      map: getRadialTexture(),
      color: exactColor('#0B1018'),
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -5,
      polygonOffsetUnits: -5,
    })
  );
  softShadow.rotation.x = -Math.PI / 2;
  softShadow.position.set(0, 0.036, 0.42);
  softShadow.scale.set(1.1, 0.86, 1);
  softShadow.renderOrder = 5;
  group.add(softShadow);

  const lightMount = new Group();
  lightMount.position.set(0, 1.05, -0.55);
  yaw.add(lightMount);

  return {
    group,
    mats,
    lightMount,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    // §9 #1: k = 0..1 white hit flash. Each hide material rides from its own
    // base emissive to white; everything unlit (rack, veins, glows) is
    // untouched — the flash belongs to the BODY.
    setFlash(k) {
      const t = k < 0 ? 0 : k > 1 ? 1 : k;
      for (const m of mats) {
        const base = m.userData.baseEmissive;
        if (base) m.emissive.copy(base).lerp(FLASH_WHITE, t);
        else m.emissiveIntensity = t;
      }
    },
    // pose: { t, walkPhase, moveK, telegraphK (0..1 quake wind-up),
    //         lungeK (0..1 trample), sealK (0..1 Hollow Seal), hpFrac }
    pose({ t, walkPhase, moveK, telegraphK = 0, lungeK = 0, sealK = 0, hpFrac = 1 }) {
      const trot = Math.sin(walkPhase);
      const breathe = 0.012 * Math.sin(t * 1.6);
      rig.position.y = breathe + 0.05 * Math.abs(trot) * moveK - 0.1 * telegraphK;
      rig.position.z = 0.34 * lungeK;
      // Wind-up: the head drops and the rack comes down at the player, then
      // the lunge throws the whole mass forward.
      rig.rotation.x = -0.16 * telegraphK + 0.2 * lungeK + 0.03 * trot * moveK;
      rig.rotation.z = 0.03 * trot * moveK;
      head.rotation.x = 0.5 * telegraphK + 0.3 * lungeK - 0.06 * trot * moveK;
      antlers.rotation.x = 0.22 * telegraphK;
      legs[0].rotation.x = trot * 0.5 * moveK - 0.25 * telegraphK;
      legs[3].rotation.x = trot * 0.5 * moveK;
      legs[1].rotation.x = -trot * 0.5 * moveK - 0.25 * telegraphK;
      legs[2].rotation.x = -trot * 0.5 * moveK;
      // Corruption breathes; it flares while the quake winds up and burns
      // hotter as the Stag is worn down.
      // The seal adds its own faster beat on top of the resting breath, so a
      // sealed Stag reads as actively refusing to fall rather than merely bright.
      const fever =
        0.72 +
        0.16 * Math.sin(t * 2.4) +
        0.5 * telegraphK +
        (1 - hpFrac) * 0.3 +
        sealK * (0.34 + 0.22 * Math.sin(t * 7.5));
      // Glow budget: the rack has to be the brightest thing in the room
      // WITHOUT blowing the frame to white — capped so the >200 luma band
      // stays near the reference bar's ~1.4% while the boss box still reads
      // measurably hotter than the floor around it.
      rackHalo.material.opacity = Math.min(0.6, 0.48 * fever);
      crownCore.material.opacity = Math.min(0.6, 0.46 * fever);
      cavityGlow.material.opacity = Math.min(0.85, 0.46 * fever + 0.12 * lungeK);
      for (const g of glows) {
        if (g === rackHalo || g === cavityGlow) continue;
        g.material.opacity = Math.min(0.75, 0.44 * fever);
      }
      pool.material.opacity = Math.min(0.6, 0.44 + 0.06 * Math.sin(t * 1.9) + 0.1 * telegraphK);
      spill.material.opacity = Math.min(0.34, 0.22 + 0.04 * Math.sin(t * 1.9) + 0.06 * telegraphK);
    },
  };
}
