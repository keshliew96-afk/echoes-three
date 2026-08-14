// Default scene: Healer graybox controller arena. A walled §13 combat
// playfield (24x16 u inside walls) with the playable Healer capsule —
// WASD 8-dir movement, mouse aim, right-click bolt, Space dodge with a dash
// smear that IS the i-frame signal (§5: ends exactly at dash end) — and the
// §22 follow camera (smoothing + aim lookahead). Graybox placeholder art:
// capsule + primitive walls; the chibi character build lands in a later
// block. Render layer is read-only over sim state and interpolates px/pz ->
// x/z by the clock alpha (never mutates sim).
import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
} from 'three';
import { ACT1_GROUND, CLASS_ACCENTS, PALETTE } from '../data/palette.js';
import { ARENA, DODGE, HEALER, TICK_HZ } from '../core/constants.js';
import { toonMaterial, addOutline } from '../render/toon.js';
import { makeGlowSprite, getRadialTexture } from '../render/glow.js';
import { createFollowRig } from '../render/camera.js';

// Graybox scaffold numbers (render-only): wall height 0.75 u sits inside the
// §13 band (70-80% of the 1.05 u standing height — never fully occludes);
// wall thickness/lean/fade times are cosmetic.
const WALL_HEIGHT = 0.75;
const WALL_THICKNESS = 0.5;
const CAPSULE_LEN = 1.05 - 2 * HEALER.radius; // §1: standing height ~1.05 u
const LEAN_MAX = 0.16; // rad, body lean toward the move vector (§3)
const SMEAR_FADE = 0.12; // s, per-ghost fade (hard-cleared at dash end)
const TRAIL_FADE = 0.15; // s, bolt trail sprite fade

function blobShadow(radius, opacity = 0.35) {
  const mat = new MeshBasicMaterial({
    map: getRadialTexture(),
    color: new Color('#000000'),
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const blob = new Mesh(new CircleGeometry(radius, 24), mat);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.008;
  return blob;
}

export function createGrayboxScene(stage, toggles, { world }) {
  const root = new Group();
  root.name = 'graybox';
  stage.scene.add(root);

  // --- Arena: floor + 4 walls, walls one value-step darker than the floor
  // (§19.3), outlined like every hero prop.
  const floorW = ARENA.halfW * 2;
  const floorD = ARENA.halfD * 2;
  const floor = new Mesh(new PlaneGeometry(floorW, floorD), toonMaterial({ color: ACT1_GROUND }));
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);

  const wallColor = new Color(ACT1_GROUND).lerp(new Color(PALETTE.voidCharcoal), 0.35);
  const wallMat = toonMaterial({ color: wallColor });
  const mkWall = (w, d, x, z) => {
    const wall = new Mesh(new BoxGeometry(w, WALL_HEIGHT, d), wallMat);
    wall.position.set(x, WALL_HEIGHT / 2, z);
    addOutline(wall);
    root.add(wall);
  };
  const t = WALL_THICKNESS;
  mkWall(floorW + 2 * t, t, 0, -(ARENA.halfD + t / 2)); // north
  mkWall(floorW + 2 * t, t, 0, ARENA.halfD + t / 2); // south
  mkWall(t, floorD, -(ARENA.halfW + t / 2), 0); // west
  mkWall(t, floorD, ARENA.halfW + t / 2, 0); // east

  // --- Player rig: Sage capsule + ink outline, class-accent identity ring
  // (§17 Zone 3: constant opacity, always visible), blob contact shadow.
  const playerRig = new Group();
  const capsuleGeo = new CapsuleGeometry(HEALER.radius, CAPSULE_LEN, 6, 16);
  const body = new Mesh(capsuleGeo, toonMaterial({ color: CLASS_ACCENTS.healer }));
  body.position.y = 1.05 / 2; // capsule stands on the floor (height 1.05 u)
  addOutline(body);
  playerRig.add(body);

  const ring = new Mesh(
    new RingGeometry(0.34, 0.46, 40),
    new MeshBasicMaterial({
      color: new Color(CLASS_ACCENTS.healer),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.014;
  playerRig.add(ring);
  playerRig.add(blobShadow(0.5));
  root.add(playerRig);

  // --- Bolt visuals (§19.4 player bolt: parchment-white core + amber glow +
  // trail), grounded by a small blob shadow like every entity.
  const bolts = new Map(); // entity id -> Group
  const boltCoreGeo = new CapsuleGeometry(0.07, 0.16, 4, 10);
  const boltCoreMat = new MeshBasicMaterial({
    color: new Color(PALETTE.parchment),
    toneMapped: false, // stays hot for the bloom pass
  });
  function makeBolt() {
    const g = new Group();
    const core = new Mesh(boltCoreGeo, boltCoreMat);
    core.rotation.z = Math.PI / 2; // capsule long axis -> flight axis (set per frame)
    core.position.y = 0.55;
    core.name = 'core';
    g.add(core);
    const glow = makeGlowSprite({ color: PALETTE.hearthAmber, size: 0.6, opacity: 0.8 });
    glow.position.y = 0.55;
    g.add(glow);
    g.add(blobShadow(0.14, 0.25));
    return g;
  }

  // --- Fading sprite pools: dash smear ghosts + bolt trails. Ghosts are
  // translucent capsule after-images; the smear is hard-cleared the frame the
  // dash ends (§5: the smear IS the i-frame signal).
  const ghosts = []; // { mesh, age }
  const ghostPool = [];
  const ghostColor = new Color(CLASS_ACCENTS.healer).lerp(new Color(PALETTE.parchment), 0.45);
  function spawnGhost(x, z) {
    let g = ghostPool.pop();
    if (!g) {
      const mat = new MeshBasicMaterial({
        color: ghostColor,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        toneMapped: false,
      });
      g = new Mesh(capsuleGeo, mat);
    }
    g.position.set(x, 1.05 / 2, z);
    g.material.opacity = 0.35;
    root.add(g);
    ghosts.push({ mesh: g, age: 0 });
  }
  function clearGhosts() {
    for (const gh of ghosts) {
      root.remove(gh.mesh);
      ghostPool.push(gh.mesh);
    }
    ghosts.length = 0;
  }

  const trails = []; // { sprite, age }
  const trailPool = [];
  function spawnTrail(x, z) {
    let s = trailPool.pop();
    if (!s) s = makeGlowSprite({ color: PALETTE.hearthAmber, size: 0.28, opacity: 0.4 });
    s.position.set(x, 0.55, z);
    s.material.opacity = 0.4;
    root.add(s);
    trails.push({ sprite: s, age: 0 });
  }

  const followRig = createFollowRig(stage.camera);
  const player = world.player;
  let lastElapsed = null;
  let lean = { x: 0, z: 0 };

  function update(elapsedSec, alpha = 1) {
    const dt = lastElapsed === null ? 1 / 60 : Math.min(0.1, Math.max(0, elapsedSec - lastElapsed));
    lastElapsed = elapsedSec;

    // Player position: previous tick -> current tick by alpha.
    const ix = player.px + (player.x - player.px) * alpha;
    const iz = player.pz + (player.z - player.pz) * alpha;
    playerRig.position.set(ix, 0, iz);

    // §3 body lean toward the move vector (sim tick velocity, render-only).
    const vx = (player.x - player.px) * TICK_HZ;
    const vz = (player.z - player.pz) * TICK_HZ;
    const speed = Math.hypot(vx, vz);
    const dashSpeed = (DODGE.distance / DODGE.durationTicks) * TICK_HZ;
    const amt = Math.min(1, speed / dashSpeed) * LEAN_MAX;
    const targetX = speed > 1e-3 ? (vz / speed) * amt : 0;
    const targetZ = speed > 1e-3 ? (-vx / speed) * amt : 0;
    const k = 1 - Math.exp(-12 * dt);
    lean.x += (targetX - lean.x) * k;
    lean.z += (targetZ - lean.z) * k;
    body.rotation.x = lean.x;
    body.rotation.z = lean.z;

    // Dash smear: ghost per frame while dashing; ALL ghosts vanish at dash end.
    if (player.dashTicksLeft > 0) {
      spawnGhost(ix, iz);
      for (const gh of ghosts) {
        gh.age += dt;
        gh.mesh.material.opacity = Math.max(0, 0.35 * (1 - gh.age / SMEAR_FADE));
      }
    } else if (ghosts.length > 0) {
      clearGhosts();
    }

    // Bolts: sync render groups to sim entities; orient the core along flight.
    const seen = new Set();
    for (const e of world.entities()) {
      if (e.kind !== 'bolt') continue;
      seen.add(e.id);
      let g = bolts.get(e.id);
      if (!g) {
        g = makeBolt();
        bolts.set(e.id, g);
        root.add(g);
      }
      const bx = e.px + (e.x - e.px) * alpha;
      const bz = e.pz + (e.z - e.pz) * alpha;
      g.position.set(bx, 0, bz);
      // Euler (0, yaw, PI/2), order XYZ: Rz tips the capsule's long axis to
      // -X, then Ry(yaw) spins it onto the flight direction (vx, vz).
      g.getObjectByName('core').rotation.y = Math.atan2(e.vz, -e.vx);
      spawnTrail(bx, bz);
    }
    for (const [id, g] of bolts) {
      if (!seen.has(id)) {
        root.remove(g);
        bolts.delete(id);
      }
    }
    for (let i = trails.length - 1; i >= 0; i--) {
      const tr = trails[i];
      tr.age += dt;
      const o = 0.4 * (1 - tr.age / TRAIL_FADE);
      if (o <= 0) {
        root.remove(tr.sprite);
        trailPool.push(tr.sprite);
        trails.splice(i, 1);
      } else {
        tr.sprite.material.opacity = o;
      }
    }

    // §22 camera: smoothed follow + aim lookahead, driven by render dt.
    followRig.update(dt, ix, iz, player.aim);
  }

  return { name: 'graybox', root, update };
}
