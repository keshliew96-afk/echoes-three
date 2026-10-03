// Boss render layer (run block) — the render side of §11's Hollow Stag on the
// §9 juice / §19 art contracts:
//
//   - the Stag rig (render/boss/stag.js) synced to the sim body (interpolated
//     px/pz -> x/z), yaw-smoothed, with walk / quake-windup / trample clips
//   - "the room's single brightest light source (feverish warm boss-light;
//     room a stop darker than normal Act-1)": while the boss lives every scene
//     light is dimmed one stop (scenes/arena.js takes the TORCH emitters —
//     flame, halo, pool, PointLight — down the same stop while a Stag lives)
//     and the Stag wears its own emitters (a white-violet crown core over the
//     rack, a violet halo, the warm ground pool), so the brightest pixels in
//     frame are the crown and the pool under its hooves. No real light rides
//     the boss — see the note by the layer state below for why.
//   - Antler Quake telegraph: the §11 Ember ring at the locked impact point,
//     radius 1.6 u, 2 Hz pulse + chevrons + a wind-in sweep, then a burst
//     flash on resolve
//   - §9 #1 hit flash on the boss body, and a violet-white collapse on death
//
// Render-only: reads sim state read-only, never mutates it.
import { Group, Vector3 } from 'three';
import { HITFLASH, TICK_HZ, CAMERA } from '../../core/constants.js';

// Boss-specific hit-flash envelope (see the 'hit' handler below). `peak` sits
// under HITFLASH.intensity because the emissive area here is ~5x a chibi's;
// `refractoryTicks` guarantees a real trough between flashes at any fire rate.
// peak dropped 0.5 -> 0.28 in the certification fix round: the Stag's hide is
// self-lit now (render/boss/stag.js), so the old peak lerped an already-lifted
// body most of the way to white and the whole silhouette blew out again.
const BOSS_FLASH = Object.freeze({ ticks: 5, peak: 0.28, refractoryTicks: 8 });
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { buildStag } from './stag.js';
import { makeQuakeRing, makeQuakeBurst } from './quake.js';
import { releaseTree } from '../geocache.js';
import { warmPark } from '../warmup.js';
import { STAG } from '../../sim/boss.js';
import { impactFx } from '../vfx/hub.js';

const YAW_RATE = 7;
const WALK_HZ = 2.2;
const BURST_SEC = 0.55;
const QUAKE_EMBER_HZ = 22; // ember motes per second off a live quake ring
const DEATH_SEC = 1.1;
// §11 "room a stop darker than normal Act-1": one photographic stop is a
// halving — the scene rig runs at 0.5x while the Stag is alive.
const ROOM_DIM = 0.5;

// --- Room-8 camera treatment ------------------------------------------------
// The follow rig frames the PLAYER. That is right for six combat rooms and
// wrong for the boss: the Stag enters 4.2 u north of the party spawn and stands
// 3.0 u tall, so a player-centred frame pins it against the top edge and buries
// the violet-veined rack — its only §11 identity feature — behind the Zone-2
// boss banner. §11 makes the Stag "the room's single brightest light source",
// which it cannot be if its brightest pixels are off-frame, so room 8 gets its
// own treatment: while the Stag lives the whole rig TRANSLATES toward it by a
// fraction of the party->Stag offset, capped, smoothed, and re-clamped to the
// arena's own focus box. The player never leaves frame (the bias is at most a
// little over half the distance to a boss that is itself closing) and the
// screenshake offset rides through untouched — position and look-at point move
// by the identical delta, so the camera's orientation is unchanged.
const BOSS_CAM = {
  weight: 0.62, // fraction of the focus->Stag offset taken as bias
  maxZ: 3.4, // u — cap along the screen-vertical axis
  maxX: 1.6, // u — cap sideways (the frame is wide; it needs far less help)
  lift: 1.1, // u of extra northward bias for the 3.0 u rack above the hooves
  stiffness: 5, // 1/s exponential ease so entry/death glide instead of snapping
  // The arena's own focus clamp (scenes/arena.js CAM_CLAMP) — re-applied after
  // the bias so a boss hard against a wall can never reveal the exterior.
  clampX: 7.0,
  clampZmin: -4.0,
  clampZmax: 5.0,
};
const CAM_OFF_Z = CAMERA.distance * Math.cos((CAMERA.elevationDeg * Math.PI) / 180);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function createBossLayer({ stage, world, bus, cosmetic }) {
  const root = new Group();
  root.name = 'bossfx';
  stage.scene.add(root);

  let rec = null; // { id, rig, light, yaw, walkPhase, telegraphK, lungeK, flashStartTick }
  let ring = null;
  const bursts = [];
  const dying = [];
  let dimmed = null; // [{ light, intensity }] captured when the room darkens
  const camBias = { x: 0, z: 0 }; // live room-8 framing bias (see BOSS_CAM)
  let emberDebt = 0; // fractional ember budget carried across frames
  let camBiasPrimed = false; // the entry frame snaps; everything after it eases

  // --- shader pre-warm --------------------------------------------------
  // Building the Stag rig costs one ~900 ms frame the first time its ~10
  // materials reach the GL compiler — which, un-warmed, lands exactly on the
  // tick the boss room opens (measured: a 937 ms frame, 50 sim ticks lost).
  // §1's "no >100 ms hitches" makes that a defect, so the rig, the quake ring
  // and one burst are built and COMPILED a few frames after boot, parked far
  // under the floor, and then pooled for reuse.
  const spareRigs = [];
  let warmFrames = 0;
  let warmed = false;

  // NO real light rides the Stag, by measurement. three.js keys every shader
  // program on the scene's light counts, so a boss PointLight costs either a
  // ~460 ms recompile on the frame it is added (a §1 hitch violation) or — if
  // it is parked in the scene from boot to keep the count constant — a
  // permanent frame-rate tax on EVERY scene (measured: 55.2 -> 41.3 fps in the
  // plain arena). §11's "feverish warm boss-light" is therefore carried the
  // way the rest of Act 1 carries its emitters (§19.3, "every light emitter
  // carries an additive radial glow sprite"): the room drops a stop and the
  // Stag's own additive pool/halo out-measure every torch in it.
  function prewarm() {
    if (warmed) return;
    warmed = true;
    const rig = buildStag(cosmetic);
    const r = makeQuakeRing(STAG.quake.radius);
    const b = makeQuakeBurst(STAG.quake.radius);
    // PARKED, not removed on the spot (certification fix D-r1): `compile()`
    // links the programs but never draws, so the geometry upload and the
    // driver's first-draw cost still landed on the frame the boss room opened.
    // warmPark keeps all three in the scene for a few RENDERED frames,
    // sub-pixel and under the floor, then hands the rig back to the pool.
    warmPark(root, rig.group, () => spareRigs.push(rig));
    warmPark(root, r.group);
    warmPark(root, b.group);
    try {
      stage.renderer.compile(stage.scene, stage.camera);
    } catch (e) {
      /* compile is an optimisation, never a correctness dependency */
    }
  }

  // Take a rig from the pool (or build one) with every animated value back at
  // its spawn state — the death clip squashes scale and burns emissive.
  function acquireRig() {
    const rig = spareRigs.pop() || buildStag(cosmetic);
    rig.group.position.set(0, 0, 0);
    rig.group.scale.set(1, 1, 1);
    rig.group.visible = true;
    rig.setFlash(0);
    return rig;
  }

  function releaseRig(rig) {
    root.remove(rig.group);
    rig.group.scale.set(1, 1, 1);
    rig.setFlash(0);
    if (spareRigs.length < 2) spareRigs.push(rig);
  }

  // The Stag is a 2.2x-scale body, so a full-intensity emissive latch is a very
  // different thing on it than on a 1.05 u chibi: at the observed boss hit rate
  // (median gap 3 ticks, exactly HITFLASH.ticks) a re-armable latch never falls
  // back to 0 and the whole silhouette — plus half the Antler Quake ring behind
  // it — disappears into an UnrealBloomPass blowout. So the boss flash is a
  // DECAYING ENVELOPE with a refractory gap: each hit still reads, but sustained
  // fire can no longer hold the body at peak.
  bus.on('hit', (ev) => {
    if (!rec || ev.target !== rec.id) return;
    if (ev.tick - rec.flashStartTick < BOSS_FLASH.refractoryTicks) return;
    rec.flashStartTick = ev.tick;
  });
  bus.on('boss_quake_resolve', (ev) => {
    const b = makeQuakeBurst(ev.radius ?? STAG.quake.radius);
    b.at(ev.x, ev.z);
    root.add(b.group);
    bursts.push({ b, age: 0 });
  });
  bus.on('death', (ev) => {
    if (!rec || ev.id !== rec.id) return;
    rec.rig.setFlash(BOSS_FLASH.peak);
    dying.push({ rig: rec.rig, age: 0 });
    dropRing();
    restoreRoom();
    rec = null;
  });
  bus.on('boss_despawn', (ev) => {
    if (!rec || ev.id !== rec.id) return;
    releaseRig(rec.rig);
    dropRing();
    restoreRoom();
    rec = null;
  });

  function dropRing() {
    if (ring) {
      root.remove(ring.group);
      releaseTree(ring.group); // one ring per quake telegraph — its four materials are its own
      ring = null;
    }
  }

  // §11: the boss room runs a stop darker so the Stag is the brightest thing
  // in it. Captured and restored so no other scene is ever left dimmed.
  function darkenRoom() {
    if (dimmed) return;
    dimmed = [];
    stage.scene.traverse((o) => {
      if (!o.isLight) return;
      if (o.userData.bossLight) return; // never dim the boss's own key/fill
      dimmed.push({ light: o, intensity: o.intensity });
      o.intensity *= ROOM_DIM;
    });
  }

  function restoreRoom() {
    if (!dimmed) return;
    for (const d of dimmed) d.light.intensity = d.intensity;
    dimmed = null;
  }

  // --- Room-8 framing (see BOSS_CAM). Runs AFTER the scene has settled the
  // follow rig for this frame and before stage.render(), so it is the last word
  // on where the camera sits without any scene owning boss knowledge.
  const _dir = new Vector3();
  function frameBoss(dt) {
    const cam = stage.camera;
    // The ground point currently under frame centre, read back off the camera's
    // own forward ray — that keeps whatever the scene did (clamp, shake) intact
    // instead of trying to recompute it.
    cam.getWorldDirection(_dir);
    if (Math.abs(_dir.y) < 1e-5) return;
    const t = -cam.position.y / _dir.y;
    const fx = cam.position.x + _dir.x * t;
    const fz = cam.position.z + _dir.z * t;

    let wantX = 0;
    let wantZ = 0;
    if (rec) {
      const p = rec.rig.group.position;
      wantX = clamp((p.x - fx) * BOSS_CAM.weight, -BOSS_CAM.maxX, BOSS_CAM.maxX);
      // `lift` biases a little further north than the midpoint because the
      // Stag's mass runs 3.0 u UP from the point being framed.
      wantZ = clamp(
        (p.z - fz) * BOSS_CAM.weight - BOSS_CAM.lift,
        -BOSS_CAM.maxZ,
        BOSS_CAM.maxZ
      );
    }
    if (rec && !camBiasPrimed) {
      // The frame the Stag appears, the treatment SNAPS. Easing in from zero
      // spent ~0.5 s with the rack pinned against the banner — exactly the
      // frame a room-entry capture lands on. The snap hides inside the §13
      // transition fade; every later adjustment eases.
      camBias.x = wantX;
      camBias.z = wantZ;
      camBiasPrimed = true;
    } else {
      const a = 1 - Math.exp(-BOSS_CAM.stiffness * Math.max(0, dt));
      camBias.x += (wantX - camBias.x) * a;
      camBias.z += (wantZ - camBias.z) * a;
    }
    if (!rec && Math.abs(camBias.x) < 1e-4 && Math.abs(camBias.z) < 1e-4) {
      camBiasPrimed = false;
      return;
    }

    // Re-clamp the biased focus to the arena's own box, then translate position
    // and look-at by the identical delta (orientation, and the shake riding on
    // it, unchanged).
    const tx = clamp(fx + camBias.x, -BOSS_CAM.clampX, BOSS_CAM.clampX);
    const tz = clamp(fz + camBias.z, BOSS_CAM.clampZmin, BOSS_CAM.clampZmax);
    const dx = tx - fx;
    const dz = tz - fz;
    cam.position.x += dx;
    cam.position.z += dz;
    cam.lookAt(tx, 0, tz);
  }

  let lastElapsed = null;

  function update(tSec, alpha) {
    const dt = lastElapsed === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - lastElapsed));
    lastElapsed = tSec;
    const tick = world.tick;
    // A dozen frames in: the boot burst is over, nothing is being fought yet.
    if (!warmed && ++warmFrames > 12) prewarm();

    let ent = null;
    for (const e of world.entities()) {
      if (e.kind === 'stag') {
        ent = e;
        break;
      }
    }

    if (ent) {
      if (!rec || rec.id !== ent.id) {
        const rig = acquireRig();
        root.add(rig.group);
        rec = {
          id: ent.id,
          rig,
          yaw: Math.atan2(ent.faceX ?? 0, ent.faceZ ?? 1),
          walkPhase: 0,
          telegraphK: 0,
          lungeK: 0,
          flashStartTick: -999,
        };
        darkenRoom();
      }

      const ix = ent.px + (ent.x - ent.px) * alpha;
      const iz = ent.pz + (ent.z - ent.pz) * alpha;
      rec.rig.group.position.set(ix, 0, iz);

      const targetYaw = Math.atan2(ent.faceX ?? 0, ent.faceZ ?? 1);
      let dy = targetYaw - rec.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      rec.yaw += dy * (1 - Math.exp(-YAW_RATE * dt));
      rec.rig.setYaw(rec.yaw);

      const simSpeed = Math.hypot(ent.x - ent.px, ent.z - ent.pz) * TICK_HZ;
      rec.walkPhase += simSpeed * dt * Math.PI * WALK_HZ;
      const telTarget = ent.telegraph ? 1 : 0;
      rec.telegraphK += (telTarget - rec.telegraphK) * (1 - Math.exp(-12 * dt));
      const lungeTarget = ent.lungeTicksLeft > 0 ? 1 : 0;
      rec.lungeK += (lungeTarget - rec.lungeK) * (1 - Math.exp(-18 * dt));

      const hpFrac = Math.max(0, ent.hp / ent.maxHp);
      rec.rig.pose({
        t: tSec,
        walkPhase: rec.walkPhase,
        moveK: Math.min(1, simSpeed / 1.4),
        telegraphK: rec.telegraphK,
        lungeK: rec.lungeK,
        hpFrac,
      });

      // Linear decay from the hit tick; peak capped below HITFLASH.intensity so
      // the Stag's brightest pixel stays under the bloom knee (threshold 0.85).
      const flashAge = tick - rec.flashStartTick;
      const lit =
        flashAge >= 0 && flashAge < BOSS_FLASH.ticks
          ? BOSS_FLASH.peak * (1 - flashAge / BOSS_FLASH.ticks)
          : 0;
      rec.rig.setFlash(lit);

      // Quake ring, straight off sim entity state.
      if (ent.telegraph) {
        if (!ring) {
          ring = makeQuakeRing(ent.telegraph.radius ?? STAG.quake.radius);
          root.add(ring.group);
        }
        ring.at(ent.telegraph.x, ent.telegraph.z);
        const span = ent.telegraph.resolveTick - ent.telegraph.startTick;
        const k = span > 0 ? (tick - ent.telegraph.startTick) / span : 1;
        ring.update(tSec, k);
        // Embers boil out of the ring as it winds in — the particle layer of
        // the §19.4 3-layer rule on the telegraph itself, and a second
        // non-colour channel for time-to-impact (they get denser).
        emberDebt += QUAKE_EMBER_HZ * dt * (0.35 + 0.65 * k);
        let n = Math.floor(emberDebt);
        emberDebt -= n;
        if (n > 6) n = 6;
        const rr = ent.telegraph.radius ?? STAG.quake.radius;
        for (let i = 0; i < n; i++)
          impactFx.embers(ent.telegraph.x, ent.telegraph.z, { n: 1, radius: rr * 0.95 });
      } else {
        dropRing();
        emberDebt = 0;
      }
    } else if (rec) {
      releaseRig(rec.rig);
      dropRing();
      restoreRoom();
      rec = null;
    }

    // Quake bursts.
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.age += dt;
      const k = b.age / BURST_SEC;
      if (k >= 1) {
        root.remove(b.b.group);
        releaseTree(b.b.group);
        bursts.splice(i, 1);
      } else b.b.update(k);
    }

    // Death: the hollow collapses — the rack flares white-violet, the body
    // squashes into the floor and the light goes out.
    for (let i = dying.length - 1; i >= 0; i--) {
      const d = dying[i];
      d.age += dt;
      const k = d.age / DEATH_SEC;
      if (k >= 1) {
        // The dead rig goes back to the pool: its lights were parented to the
        // rig and die with it, so only the visual state needs resetting.
        releaseRig(d.rig);
        dying.splice(i, 1);
        continue;
      }
      const squash = 1 - k * 0.85;
      d.rig.group.scale.set(1 + k * 0.35, Math.max(0.02, squash), 1 + k * 0.35);
      d.rig.setFlash(Math.max(0, 1 - k * 1.6));
      d.rig.pose({ t: tSec, walkPhase: 0, moveK: 0, telegraphK: 0, lungeK: 0, hpFrac: 0 });
    }

    frameBoss(dt); // last word on the camera this frame (room 8 only)
  }

  // Screen-space box of the Stag (body + rack + ground pool), so a capture can
  // point `tools/analyze.mjs --box` at the boss instead of eyeballing it —
  // that is how §11's "the room's single brightest light source" gets measured.
  const _v = new Vector3();
  function screenBox() {
    if (!rec) return null;
    const cam = stage.camera;
    const el = stage.renderer.domElement;
    const w = el.clientWidth || el.width;
    const h = el.clientHeight || el.height;
    const p = rec.rig.group.position;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    // Corners of the Stag's bounding box in world space: +-1.5 u across, hooves
    // to antler tips (0 -> 3.0 u).
    for (const dx of [-1.5, 1.5]) {
      for (const dz of [-1.5, 1.5]) {
        for (const dy of [0, 3.0]) {
          _v.set(p.x + dx, dy, p.z + dz).project(cam);
          const sx = (_v.x * 0.5 + 0.5) * w;
          const sy = (-_v.y * 0.5 + 0.5) * h;
          if (sx < minX) minX = sx;
          if (sy < minY) minY = sy;
          if (sx > maxX) maxX = sx;
          if (sy > maxY) maxY = sy;
        }
      }
    }
    const x = Math.max(0, Math.round(minX));
    const y = Math.max(0, Math.round(minY));
    return {
      x,
      y,
      w: Math.min(w - x, Math.round(maxX - minX)),
      h: Math.min(h - y, Math.round(maxY - minY)),
      box: `${x},${y},${Math.min(w - x, Math.round(maxX - minX))},${Math.min(h - y, Math.round(maxY - minY))}`,
    };
  }

  function debugCounts() {
    return {
      boss: !!rec,
      ring: !!ring,
      bursts: bursts.length,
      dying: dying.length,
      roomDimmed: !!dimmed,
      dimmedLights: dimmed ? dimmed.length : 0,
      warmed,
      pooled: spareRigs.length,
      camBias: { x: Math.round(camBias.x * 100) / 100, z: Math.round(camBias.z * 100) / 100 },
      screenBox: screenBox(),
    };
  }

  // @gnt:M2 RESTORE-RESYNC begin — a load may bring a different Stag (or
  // none): release the live rig, its quake ring and the room dim silently;
  // update() re-adopts whatever the restored registry holds next frame.
  bus.on('state_restored', () => {
    if (rec) {
      releaseRig(rec.rig);
      rec = null;
    }
    dropRing();
    restoreRoom();
    for (const d of dying.splice(0)) releaseRig(d.rig);
    for (const b of bursts.splice(0)) {
      root.remove(b.b.group);
      releaseTree(b.b.group);
    }
    emberDebt = 0;
    camBiasPrimed = false;
  });
  // @gnt:M2 RESTORE-RESYNC end
  return { update, debugCounts, root };
}
