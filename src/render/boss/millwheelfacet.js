// THE MILLWHEEL, MODEL STANDARD (docs/MODEL_STANDARD.md). The Sunken Mill's
// second boss rebuilt in the faceted look of Kesh's sample video, on top of
// the chibi ink style, keeping the classic's identity (render/boss/slice2.js):
// the mill's own wheel torn off its axle, oak and iron standing on its edge,
// rolling, its hub burning violet. What the standard adds:
//
//   * a faceted oak tyre bound in iron plates on both faces, twelve radial
//     paddle boards riveted at their tips, six spokes with iron straps, an
//     iron hub with a ring of bolts and a ring of cog teeth on each face (the
//     Cog Shards: they stand out and burn before a volley, fly, and grow
//     back), the violet hub light on both faces, and the torn axle: an iron
//     collar on each side with a broken bracket arm hanging plumb from it,
//     swinging with the wheel's lurches;
//   * the wheel ROLLS ON ITS PADDLES, the legless rule for a wheel (Kesh's
//     self-check: the root motion matches the contact): the planted paddle's
//     tip stays locked to the floor while the wheel pivots over it, then the
//     next paddle plants, so the hub rises and falls a little with each one
//     and the turn always matches the ground covered (the classic turned by
//     the sim's distance over a smooth radius). Every lurch of a move (a
//     rock back, a recoil) rolls it the same way;
//   * two ability timelines driven by the sim (sim/bosses/millwheel.js):
//       Cog Shards  wind (the 48-tick cone warning less one strike: it rolls
//                   back a little, the cog teeth stand out and burn, the hub
//                   flares), loose (2.5 frames on the hit: it lurches into
//                   the cone and the teeth fly), held with a recoil, settle
//                   while the teeth grow back;
//       Crosscut    rock (the 66-tick lane warning less one strike: it rocks
//                   back and forth twice, building, and sits back), burst
//                   (2.5 frames: it throws itself down the lane), cut (held
//                   while the sim rolls it at 9 u/s), slam (2.5 frames when
//                   the cut ends at the far wall: it bounces back off it,
//                   squashed), held with a recoil, dizzy (the rest of the
//                   sim's 75-tick stand: it teeters side to side on its
//                   planted paddle, dying away), settle;
//   * the [M] beats: a spawn-in grow, named points (the hub, the front of the
//     rim as `tip`, the planted paddle's tip as `rim`), the shared hit
//     envelope (`react`).
//
// Same interface as the classic (group, mats, setYaw, setFlash, pose), plus
// `lab`, `points`, `react`. Faces +Z, rolls about X. Render only: it reads
// the sim entity (mode, telegraph, the cut's velocity) and never writes it.
import { BoxGeometry, Color, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, TorusGeometry, Vector3 } from 'three';
import { addInk, groundShadow } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { HIDE, TELL_VIOLET } from '../enemies/style.js';
import { facetize, facetMaterial } from '../facet/material.js';
import { PART_INK_PX, instancedPart, placeRow, plateGeometry, setTRS, wedgeGeometry } from '../facet/kit.js';
import { createTimeline, ease } from '../facet/timeline.js';
import { lay } from '../facet/shapes.js';
import { HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, makePoints, recoil, settle, spawnGrow } from '../facet/beats.js';

// --- Colour: the classic wheel's (slice2.js), no new hues.
const OAK = HIDE.boarDark.clone().lerp(new Color(PALETTE.bruiseUmber), 0.4).multiplyScalar(1.1);
const IRON = HIDE.ramDark.clone().lerp(new Color(PALETTE.warmGrey), 0.2).multiplyScalar(0.8);
// value steps of the classic's own colours, so boards and straps read apart
const OAK_LIT = OAK.clone().multiplyScalar(1.18);
const OAK_DARK = OAK.clone().multiplyScalar(0.72);
const IRON_LIT = IRON.clone().multiplyScalar(1.25);
const flashable = (c) => facetMaterial(c, { emissive: '#FFFFFF', emissiveIntensity: 0 });
function glow(size, opacity) {
  const g = makeGlowSprite({ color: '#9B7BF0', size, opacity });
  g.material.toneMapped = false;
  return g;
}

// --- The wheel: it stands on its paddles' tips.
export const PADDLES = 12;
export const TIP_R = 1.3; // u, hub to a paddle's tip
const HALF = Math.PI / PADDLES;
const CHORD = 2 * TIP_R * Math.sin(HALF); // ground covered per paddle
const TYRE_R = 1.0;
export const MILL_ROLL = 2.4; // u/s, MILLWHEEL.rim.speed
export const MILL_CUT = 9; // u/s, MILLWHEEL.crosscut.speed
const WIND_SEC = 48 / 60 - STRIKE_SEC; // the cone's warning
const ROCK_SEC = 66 / 60 - STRIKE_SEC; // the lane's warning
const DIZZY_SEC = 75 / 60 - STRIKE_SEC - HOLD_SEC; // the stand after the slam
const CUT_SEC = 0.6; // the lab's cut (the sim's runs to the far wall)

export const MILL_ABILITIES = Object.freeze({
  shards: createTimeline('shards', 'Cog Shards', [
    { id: 'wind', label: 'teeth out', dur: WIND_SEC },
    { id: 'loose', label: 'loose', dur: STRIKE_SEC },
    { id: 'hold', label: 'shards away', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.55 },
  ], { cues: [{ at: WIND_SEC + STRIKE_SEC, id: 'shards' }] }),
  crosscut: createTimeline('crosscut', 'Crosscut', [
    { id: 'rock', label: 'rock', dur: ROCK_SEC },
    { id: 'burst', label: 'burst', dur: STRIKE_SEC },
    { id: 'cut', label: 'cut', dur: CUT_SEC },
    { id: 'slam', label: 'slam', dur: STRIKE_SEC },
    { id: 'hold', label: 'struck', dur: HOLD_SEC },
    { id: 'dizzy', label: 'dizzy', dur: DIZZY_SEC },
    { id: 'settle', label: 'settle', dur: 0.45 },
  ], { cues: [{ at: ROCK_SEC, id: 'crosscut' }, { at: ROCK_SEC + 2 * STRIKE_SEC + CUT_SEC, id: 'slam' }] }),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (0 at rest):
//   reach  u the wheel rolls ahead of its place (back if -)
//   shove  0..1 the recoil off a hit (B3), rolled back 0.1 u
//   hop    u off the floor (the bounce off the wall)
//   tilt   rad the wheel leans sideways on its planted paddle
//   teeth  0..1 the cog teeth stand out (0.. they are away: -1)
//   glow   0..1 the hub burns          squash 0..1 contact squash
const KEYS = ['reach', 'shove', 'hop', 'tilt', 'teeth', 'glow', 'squash'];
const restChannels = (C) => {
  for (const k of KEYS) C[k] = 0;
  return C;
};
const ZERO = restChannels({});
const pose = (o) => ({ ...ZERO, ...o });
const WOUND = pose({ reach: -0.35, teeth: 1, glow: 1, tilt: 0.03 });
const LOOSED = pose({ reach: 0.18, teeth: -1, glow: 0.6, squash: 1 });
const SAT_BACK = pose({ reach: -0.45, teeth: 0.5, glow: 0.7 });
const CUTTING = pose({ reach: 0.12, glow: 1, teeth: 0.3 });
const SLAMMED = pose({ reach: -0.32, hop: 0.22, squash: 1, glow: 0.5, tilt: 0.12 });
const DIZZY_END = pose({ reach: -0.12, tilt: 0.09, glow: 0.2 });
const mix = (C, A, B, k) => {
  for (const key of KEYS) C[key] = A[key] + (B[key] - A[key]) * k;
  return C;
};

export function abilityChannels(id, s, C = restChannels({}), from = ZERO) {
  restChannels(C);
  const k = s.k;
  if (id === 'shards') {
    if (s.id === 'wind') {
      mix(C, from, WOUND, ease.inOut(Math.min(1, k * 1.4)));
      C.tilt += 0.025 * Math.sin(k * 40) * k; // the teeth grind as they rise
    } else if (s.id === 'loose') mix(C, WOUND, LOOSED, kick(k));
    else if (s.id === 'hold') {
      mix(C, LOOSED, LOOSED, 0);
      C.shove = recoil(k * HOLD_SEC); // B3: the volley kicks it back
    } else {
      mix(C, ZERO, LOOSED, settle(k));
      C.teeth = -1 + ease.inOut(k); // the teeth grow back
      C.shove = recoil(HOLD_SEC + k * 0.55);
    }
  } else if (id === 'crosscut') {
    if (s.id === 'rock') {
      // twice back and forth, building, then sat back for the burst
      const build = ease.inOut(Math.min(1, k * 1.2));
      const swing = Math.sin(k * Math.PI * 4) * 0.22 * Math.min(1, k * 2) * (1 - ease.inOut(Math.max(0, (k - 0.75) / 0.25)));
      mix(C, from, SAT_BACK, build);
      C.reach += swing;
      C.tilt = 0.04 * Math.sin(k * 52) * build;
    } else if (s.id === 'burst') mix(C, SAT_BACK, CUTTING, kick(k));
    else if (s.id === 'cut') mix(C, CUTTING, CUTTING, 0);
    else if (s.id === 'slam') mix(C, CUTTING, SLAMMED, kick(k));
    else if (s.id === 'hold') {
      mix(C, SLAMMED, SLAMMED, 0);
      C.shove = recoil(k * HOLD_SEC); // B3: the wall throws it back
    } else if (s.id === 'dizzy') {
      // it drops back down and teeters on its paddle, dying away
      mix(C, SLAMMED, DIZZY_END, ease.out(Math.min(1, k * 4)));
      const die = 1 - k;
      C.tilt = DIZZY_END.tilt + 0.2 * die * Math.sin(k * Math.PI * 5.5);
      C.reach += 0.08 * die * Math.sin(k * Math.PI * 3.2);
      C.glow = 0.2 + 0.3 * Math.abs(Math.sin(k * 20)) * die;
      C.shove = recoil(HOLD_SEC + k * DIZZY_SEC);
    } else mix(C, ZERO, DIZZY_END, settle(k));
  }
  return C;
}

// --- Geometry.
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:mill-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  tyre: () => geo('tyre', () => new TorusGeometry(TYRE_R, 0.16, 6, 18).rotateY(Math.PI / 2), 401),
  paddle: () => geo('paddle', () => new BoxGeometry(0.56, 0.32, 0.08), 403),
  spoke: () => geo('spoke', () => new BoxGeometry(0.13, 0.86, 0.13).translate(0, 0.5, 0), 405),
  hub: () => geo('hub', () => new CylinderGeometry(0.26, 0.26, 0.44, 8).rotateZ(Math.PI / 2), 407),
  knot: () => geo('knot', () => new IcosahedronGeometry(0.045, 0), 409, 0.14),
  strap: () => geo('strap', () => new BoxGeometry(0.17, 0.08, 0.17), 411),
  collar: () => geo('collar', () => new CylinderGeometry(0.2, 0.2, 0.14, 7).rotateZ(Math.PI / 2), 413),
  arm: () => geo('arm', () => new BoxGeometry(0.07, 0.48, 0.12).translate(0, -0.24, 0), 415),
  core: () => geo('core', () => new IcosahedronGeometry(0.14, 0), 417, 0.16),
};

const _m = new Matrix4();
const _v = new Vector3();
const _w = new Vector3();
const _X = new Vector3();
const _Y = new Vector3();
const _Z = new Vector3();

export function buildMillwheelFacet() {
  const group = new Group();
  group.name = 'boss-millwheel';
  group.userData.modelStandard = true;
  const yaw = new Group();
  group.add(yaw);
  const grow = new Group();
  yaw.add(grow);
  // tilt and squash pivot on the floor under the hub; the roll's offset and
  // the hop ride `slide`
  const tiltG = new Group();
  grow.add(tiltG);
  const slide = new Group();
  tiltG.add(slide);
  const squashG = new Group();
  slide.add(squashG);
  const hubG = new Group(); // at the hub, not rolling
  squashG.add(hubG);
  const wheel = new Group(); // rolls about X
  hubG.add(wheel);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const oak = track(flashable(OAK));
  const oakLit = track(flashable(OAK_LIT));
  const oakDark = track(flashable(OAK_DARK));
  const iron = track(flashable(IRON));
  const ironLit = track(flashable(IRON_LIT));
  const violet = new MeshBasicMaterial({ color: TELL_VIOLET, vertexColors: true, toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();
  // a direction round the wheel (local): angle a from straight down, forward
  // at -a (paddle k sits at a = k * 2 * HALF, so the roll brings it under)
  const radial = (a, r, x, out) => out.set(x, -Math.cos(a) * r, Math.sin(a) * r);

  // --- The tyre, bound in iron plates on both faces.
  mesh(G.tyre(), oak, wheel);
  const BAND = 12;
  wheel.add(placeRow(plateGeometry(), iron, BAND * 2, (i, m) => {
    const side = i < BAND ? -1 : 1;
    const a = ((i % BAND) + (side > 0 ? 0.5 : 0)) * ((2 * Math.PI) / BAND);
    radial(a, TYRE_R, side * 0.15, _v);
    // the plate's ridge faces out of the face (+-X), its length round the rim
    _Y.set(side, 0, 0);
    _Z.set(0, Math.sin(a), Math.cos(a));
    _X.crossVectors(_Y, _Z);
    setTRS(m, _v, _X, _Y, _Z, 0.22, 0.05, 0.34);
  }, { name: 'mill-bands', inkPx: PART_INK_PX, mottle: 0.1, seed: 31 }));
  // --- Paddles: radial boards round the rim, riveted at the tips.
  wheel.add(placeRow(G.paddle(), oakLit, PADDLES, (k, m) => {
    const a = k * 2 * HALF;
    radial(a, TIP_R - 0.16, 0, _v);
    lay(m, _v.x, _v.y, _v.z, 0, -Math.cos(a), Math.sin(a), 1, 1, 1);
  }, { name: 'mill-paddles', inkPx: PART_INK_PX, mottle: 0.14, seed: 33 }));
  wheel.add(placeRow(G.knot(), ironLit, PADDLES * 2, (i, m) => {
    const a = (i >> 1) * 2 * HALF;
    radial(a, TIP_R - 0.07, (i % 2 ? 1 : -1) * 0.2, _v);
    m.makeTranslation(_v.x, _v.y, _v.z);
  }, { name: 'mill-rivets', inkPx: PART_INK_PX, mottle: 0 }));
  // --- Spokes with iron straps, the hub with its bolts.
  wheel.add(placeRow(G.spoke(), oakDark, 6, (i, m) => {
    const a = (i / 6) * Math.PI * 2 + HALF;
    lay(m, 0, 0, 0, 0, -Math.cos(a), Math.sin(a), 1, 1, 1);
  }, { name: 'mill-spokes', inkPx: PART_INK_PX, mottle: 0.1, seed: 35 }));
  wheel.add(placeRow(G.strap(), iron, 6, (i, m) => {
    const a = (i / 6) * Math.PI * 2 + HALF;
    radial(a, 0.62, 0, _v);
    lay(m, _v.x, _v.y, _v.z, 0, -Math.cos(a), Math.sin(a), 1, 1, 1);
  }, { name: 'mill-straps', inkPx: PART_INK_PX, mottle: 0.08, seed: 37 }));
  mesh(G.hub(), iron, wheel);
  wheel.add(placeRow(G.knot(), ironLit, 16, (i, m) => {
    const side = i < 8 ? -1 : 1;
    radial(((i % 8) / 8) * Math.PI * 2, 0.19, side * 0.23, _v);
    m.makeTranslation(_v.x, _v.y, _v.z);
  }, { name: 'mill-bolts', inkPx: PART_INK_PX, mottle: 0 }));
  // the cog teeth: a ring on each face (they stand out and fly)
  const TEETH = 14;
  const teeth = instancedPart(wedge, ironLit, TEETH * 2, { name: 'mill-teeth', moving: true });
  wheel.add(teeth);
  // the violet hub light, both faces, and its glow
  const hubLights = [];
  for (const side of [-1, 1]) {
    const c = new Mesh(G.core(), violet);
    c.position.x = side * 0.27;
    wheel.add(c);
    hubLights.push(c);
  }
  const hubGlow = glow(1.2, 0.3);
  hubG.add(hubGlow);

  // --- The torn axle: a collar each side and a broken bracket arm hanging
  // plumb from it (not rolling: it rides the hub).
  const arms = [];
  for (const side of [-1, 1]) {
    const collar = mesh(G.collar(), iron, hubG);
    collar.position.x = side * 0.32;
    const arm = new Group();
    arm.position.set(side * 0.42, 0, 0);
    hubG.add(arm);
    mesh(G.arm(), oakDark, arm).rotation.z = side * 0.05;
    arms.push(arm);
  }

  // --- Floor piece (beside the envelope's node).
  const shadow = groundShadow(1.0, 0.44, { wide: 0.6, deep: 1.3 });
  group.add(shadow);

  // --- Points (B8) and the hit envelope's tuning.
  const points = makePoints({
    hub: [hubG, 0, 0, 0],
    tip: [hubG, 0, 0, TIP_R],
    chest: [hubG, 0, 0.3, 0.6],
    rim: [grow, 0, 0, 0],
  });
  const react = { squash: 1, flinch: 1, knock: 0, axis: 'y', midY: 1.3 };

  // --- The roll on the paddles: `s` is the ground covered along the facing
  // (the root's travel plus the move's own lurches); the planted paddle's
  // tip is at `tipS` and stays there while the hub pivots over it.
  let s = 0;
  let tipS = 0;
  let idx = 0;
  let phi = 0;
  let lastOff = 0;
  let worldInit = false;
  const lastW = new Vector3();
  const fwd = new Vector3();
  function rollTo(ds) {
    s += ds;
    const lim = TIP_R * Math.sin(HALF);
    for (let n = 0; n < 64 && s - tipS > lim; n++) {
      tipS += CHORD;
      idx++;
    }
    for (let n = 0; n < 64 && s - tipS < -lim; n++) {
      tipS -= CHORD;
      idx--;
    }
    phi = Math.asin(Math.max(-1, Math.min(1, (s - tipS) / TIP_R)));
  }
  function plantRoll() {
    // a fresh stand: the paddle under the hub planted, the hub at its top
    s = 0;
    tipS = 0;
    idx = 0;
    phi = 0;
    worldInit = false;
  }
  // the ground covered this frame along the facing, and the move's own
  // lurch (the root's travel is the sim's; the offset is the rig's)
  function travel(off) {
    yaw.updateWorldMatrix(true, false);
    yaw.getWorldPosition(_w);
    fwd.set(0, 0, 1).transformDirection(yaw.matrixWorld);
    let ds = off - lastOff;
    if (worldInit) {
      const dx = _w.x - lastW.x;
      const dz = _w.z - lastW.z;
      // a teleport (a new room, a pooled rig) re-stands the wheel
      if (Math.hypot(dx, dz) > 2.5) plantRoll();
      else ds += dx * fwd.x + dz * fwd.z;
    }
    lastW.copy(_w);
    lastOff = off;
    worldInit = true;
    rollTo(ds);
  }

  // --- Live state.
  const spawn = createSpawnClock();
  const C = restChannels({});
  let lastT = null;
  let lastX = 0;
  let lastZ = 0;
  let lastId = null;
  let idle = 0;
  let ab = null;
  let from = { ...ZERO };
  let tel = null;
  // a warning is known by its attack and start tick, never by object: a
  // co-op guest's snapshots hand the rig a fresh copy every few ticks
  let telKey = null;
  let telAge = 0;
  let lastMode = 'roll';
  // the facing: the sim's (setYaw), or square to the cone or the lane
  let simYaw = 0;
  let shownYaw = null;
  let laneYaw = null;
  let swing = 0; // the bracket arms' swing
  let swingV = 0;
  let lastReach = 0;
  let reachV = 0;

  function reset() {
    lastT = null;
    ab = null;
    tel = null;
    telKey = null;
    lastMode = 'roll';
    laneYaw = null;
    shownYaw = null;
    spawn.clear();
  }
  const begin = (id, t = 0) => {
    from = { ...C, squash: 0, shove: 0, hop: 0 };
    ab = { id, t };
  };

  // In game: each warning is its wind-up, stretched to the sim's ticks so the
  // strike lands on the resolve; the cut and the stand follow the sim's modes.
  function drive(dt, e) {
    const T = e && e.telegraph ? e.telegraph : null;
    const mode = e ? e.mode || 'roll' : 'roll';
    const key = T ? `${T.attack}:${T.startTick}` : null;
    if (key && key !== telKey) {
      telAge = 0;
      const id = T.attack === 'shards' ? 'shards' : T.attack === 'crosscut' ? 'crosscut' : null;
      if (id) begin(id);
    }
    telKey = key;
    tel = T;
    if (tel) telAge += dt;
    if (T && Number.isFinite(T.dirX)) laneYaw = Math.atan2(T.dirX, T.dirZ);
    else if (mode === 'cut' && e && (e.cutVx || e.cutVz)) laneYaw = Math.atan2(e.cutVx, e.cutVz);
    else if (mode !== 'dizzy') laneYaw = null;
    const CC = MILL_ABILITIES.crosscut;
    if (mode !== lastMode) {
      if (mode === 'cut') {
        if (!ab || ab.id !== 'crosscut') begin('crosscut', CC.startOf('cut'));
        else ab.t = Math.max(ab.t, CC.startOf('cut'));
      } else if (mode === 'dizzy') {
        if (!ab || ab.id !== 'crosscut') begin('crosscut', CC.startOf('slam'));
        else ab.t = Math.max(ab.t, CC.startOf('slam'));
      }
    }
    lastMode = mode;
    if (ab) {
      const tl = MILL_ABILITIES[ab.id];
      const windEnd = tl.startOf(tl.phases[1].id);
      if (tel && ab.t < windEnd) {
        const span = Math.max(0.05, (tel.resolveTick - tel.startTick) / 60 - STRIKE_SEC);
          ab.t = telAge < span ? Math.min(windEnd - 1e-4, (windEnd * telAge) / span) : windEnd;
      } else {
          ab.t = Math.max(ab.t, windEnd) + dt;
          // the strike may land ahead of the resolve on a slow frame (a 1 fps
          // machine), but the contact holds until the warning is gone
          if (tel) ab.t = Math.min(ab.t, windEnd + STRIKE_SEC);
      }
      if (ab.id === 'crosscut' && mode === 'cut') ab.t = Math.min(CC.startOf('slam') - 1e-4, ab.t);
      if (ab.t >= tl.duration) ab = null;
    }
    if (ab) abilityChannels(ab.id, MILL_ABILITIES[ab.id].sample(ab.t), C, from);
    else restChannels(C);
    return C;
  }

  function apply(dt, { hpFrac, rigid = false }) {
    const off = C.reach - 0.1 * C.shove;
    if (rigid) plantRoll();
    else travel(off);
    // the hub over the planted paddle: up and down a little with each one
    const h = TIP_R * Math.cos(phi);
    slide.position.set(0, C.hop, off);
    hubG.position.set(0, h, 0);
    wheel.rotation.set(idx * 2 * HALF + phi, 0, 0);
    tiltG.rotation.set(0, 0, C.tilt);
    // the contact squash kept to a boss's size (Kesh's pick over B9's full
    // +19% / -9%): +11% wide, -5% tall, about the floor
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    // the cog teeth stand out, burn and fly; they grow back after a volley
    const out = Math.max(0, C.teeth);
    const gone = Math.max(0, -C.teeth);
    for (let i = 0; i < TEETH * 2; i++) {
      const side = i < TEETH ? -1 : 1;
      const a = ((i % TEETH) / TEETH) * Math.PI * 2 + (side > 0 ? Math.PI / TEETH : 0);
      const r = 0.36 + 0.06 * out;
      radial(a, r, side * (0.17 + 0.05 * out), _v);
      const sc = (1 - gone) * (1 + 0.5 * out);
      lay(_m, _v.x, _v.y, _v.z, side * 0.25 * out, -Math.cos(a), Math.sin(a), 0.16 * sc + 1e-4, 0.2 * sc + 1e-4, 0.3 * sc + 1e-4);
      teeth.setMatrixAt(i, _m);
    }
    teeth.instanceMatrix.needsUpdate = true;
    // the bracket arms swing back off every lurch (a damped pendulum)
    if (dt > 0) {
      const rv = (off - lastReach) / dt;
      const acc = (rv - reachV) / dt;
      reachV = rv;
      swingV += (-60 * swing - 6 * swingV + 0.004 * acc) * dt;
      swing = Math.max(-0.9, Math.min(0.9, swing + swingV * dt));
    }
    lastReach = off;
    for (const arm of arms) arm.rotation.set(-swing - phi, 0, 0);
    const fever = 0.5 + 0.2 * Math.sin(idle * 2.6) + (1 - hpFrac) * 0.3;
    for (const c of hubLights) c.scale.setScalar(1 + 0.7 * C.glow + 0.1 * Math.sin(idle * 4));
    hubGlow.material.opacity = Math.min(0.75, 0.22 * fever + 0.5 * C.glow);
    shadow.scale.set(1 - 0.2 * Math.min(1, C.hop / 0.3), 1 - 0.2 * Math.min(1, C.hop / 0.3), 1);
  }

  return {
    group,
    mats,
    points,
    react,
    setYaw: (r) => {
      simYaw = r;
      yaw.rotation.y = shownYaw === null ? r : shownYaw;
    },
    setFlash(k) {
      const v = k < 0 ? 0 : k > 1 ? 1 : k;
      for (const m of mats) m.emissiveIntensity = v;
    },
    // A dying rig is posed with e = null: it collapses in the pose it died
    // in (no wind-up runs on into a strike).
    pose({ t, hpFrac = 1, e = null, turntable = false }) {
      const id = e ? e.id : lastId;
      // a new boss (or a rewound clock) spawns in; a jump in place only
      // re-stands the wheel on a paddle
      const born = lastT === null || t < lastT || (e && id !== lastId);
      const fresh = born || Math.hypot(group.position.x - lastX, group.position.z - lastZ) > 2.5;
      if (fresh) {
        reset();
        plantRoll();
        if (born && e && !turntable) spawn.restart(t);
      }
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      lastX = group.position.x;
      lastZ = group.position.z;
      lastId = id;
      idle += dt;
      if (e || turntable) drive(dt, e);
      // the facing eases to the cone or the lane while it winds and cuts,
      // and back to the sim's facing after (never a snap)
      const aim = laneYaw === null ? simYaw : laneYaw;
      if (shownYaw === null || turntable) shownYaw = aim;
      else {
        let d = aim - shownYaw;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        shownYaw += d * (1 - Math.exp(-14 * dt));
      }
      yaw.rotation.y = shownYaw;
      const g = turntable ? 1 : spawn.scale(t);
      grow.scale.setScalar(g);
      apply(dt, { hpFrac, rigid: turntable });
    },
    lab: {
      abilities: MILL_ABILITIES,
      reset() {
        reset();
        plantRoll();
      },
      grow: () => grow.scale.x,
      channels: () => ({ ...C }),
      // probes: the roll's state, and the planted paddle's tip in the world
      roll: () => ({ s, tipS, idx, phi, angle: idx * 2 * HALF + phi, hub: TIP_R * Math.cos(phi) }),
      tip(out = new Vector3()) {
        // the planted tip, in yaw space: under the hub, back by the pivot
        slide.updateWorldMatrix(true, false);
        return out.set(0, 0, -TIP_R * Math.sin(phi)).applyMatrix4(slide.matrixWorld);
      },
      pose({ dt, ability = null, abT = 0, hpFrac = 1, rigid = false }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        if (ability && ability !== 'spawn') abilityChannels(ability, MILL_ABILITIES[ability].sample(abT), C);
        else restChannels(C);
        const g = ability === 'spawn' ? spawnGrow(abT) : 1;
        grow.scale.setScalar(g);
        apply(dt, { hpFrac, rigid });
      },
    },
  };
}
