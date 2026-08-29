// Boss render layer (run block) — the render side of §11's Hollow Stag on the
// §9 juice / §19 art contracts:
//
//   - the Stag rig (render/boss/stag.js) synced to the sim body (interpolated
//     px/pz -> x/z), yaw-smoothed, with walk / quake-windup / trample clips
//   - "the room's single brightest light source (feverish warm boss-light;
//     room a stop darker than normal Act-1)": while the boss lives, every
//     scene light is dimmed one stop and a warm PointLight rides the Stag's
//     shoulders, so the brightest pixels in frame are the rack and the pool
//     under its hooves
//   - Antler Quake telegraph: the §11 Ember ring at the locked impact point,
//     radius 1.6 u, 2 Hz pulse + chevrons + a wind-in sweep, then a burst
//     flash on resolve
//   - §9 #1 hit flash on the boss body, and a violet-white collapse on death
//
// Render-only: reads sim state read-only, never mutates it.
import { Group, PointLight, Vector3 } from 'three';
import { HITFLASH, TICK_HZ } from '../../core/constants.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { buildStag } from './stag.js';
import { makeQuakeRing, makeQuakeBurst } from './quake.js';
import { STAG } from '../../sim/boss.js';

const YAW_RATE = 7;
const WALK_HZ = 2.2;
const BURST_SEC = 0.55;
const DEATH_SEC = 1.1;
// §11 "room a stop darker than normal Act-1": one photographic stop is a
// halving — the scene rig runs at 0.5x while the Stag is alive.
const ROOM_DIM = 0.5;
// The boss light itself (§11 "feverish warm boss-light"). Warm, close-range,
// bright enough to be the room's key.
const BOSS_LIGHT = { intensity: 11.5, distance: 8.4, decay: 2 };

export function createBossLayer({ stage, world, bus, cosmetic }) {
  const root = new Group();
  root.name = 'bossfx';
  stage.scene.add(root);

  let rec = null; // { id, rig, light, yaw, walkPhase, telegraphK, lungeK, flashUntilTick }
  let ring = null;
  const bursts = [];
  const dying = [];
  let dimmed = null; // [{ light, intensity }] captured when the room darkens

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

  // The Stag's two lights are created ONCE and never leave the scene: three.js
  // keys shader programs on the scene's light counts, so adding a PointLight
  // mid-fight recompiles EVERY material in the arena (measured: a 459 ms
  // frame even with the rig pre-warmed). They live at intensity 0 on the
  // layer root until a Stag exists, then reparent onto its shoulders — a
  // reparent inside the same scene leaves the light count untouched.
  const keyLight = new PointLight(
    PALETTE.hearthAmber,
    0,
    BOSS_LIGHT.distance,
    BOSS_LIGHT.decay
  );
  keyLight.userData.bossLight = true;
  const violetLight = new PointLight(PALETTE.godstuffViolet, 0, 7, 2);
  violetLight.userData.bossLight = true;
  violetLight.position.set(0, 1.9, 0);
  root.add(keyLight);
  root.add(violetLight);

  function parkLights() {
    keyLight.intensity = 0;
    violetLight.intensity = 0;
    keyLight.position.set(0, 0, 0);
    root.add(keyLight); // reparent, not remove: the light count must not move
    root.add(violetLight);
    violetLight.position.set(0, 1.9, 0);
  }
  function prewarm() {
    if (warmed) return;
    warmed = true;
    const rig = buildStag(cosmetic);
    rig.group.position.set(0, -60, 0);
    root.add(rig.group);
    const r = makeQuakeRing(STAG.quake.radius);
    r.group.position.set(0, -60, 0);
    root.add(r.group);
    const b = makeQuakeBurst(STAG.quake.radius);
    b.group.position.set(0, -60, 0);
    root.add(b.group);
    try {
      stage.renderer.compile(stage.scene, stage.camera);
    } catch (e) {
      /* compile is an optimisation, never a correctness dependency */
    }
    root.remove(r.group);
    root.remove(b.group);
    root.remove(rig.group);
    spareRigs.push(rig);
  }

  // Take a rig from the pool (or build one) with every animated value back at
  // its spawn state — the death clip squashes scale and burns emissive.
  function acquireRig() {
    const rig = spareRigs.pop() || buildStag(cosmetic);
    rig.group.position.set(0, 0, 0);
    rig.group.scale.set(1, 1, 1);
    rig.group.visible = true;
    for (const m of rig.mats) m.emissiveIntensity = 0;
    return rig;
  }

  function releaseRig(rig) {
    root.remove(rig.group);
    rig.group.scale.set(1, 1, 1);
    for (const m of rig.mats) m.emissiveIntensity = 0;
    if (spareRigs.length < 2) spareRigs.push(rig);
  }

  bus.on('hit', (ev) => {
    if (rec && ev.target === rec.id) rec.flashUntilTick = ev.tick + HITFLASH.ticks;
  });
  bus.on('boss_quake_resolve', (ev) => {
    const b = makeQuakeBurst(ev.radius ?? STAG.quake.radius);
    b.at(ev.x, ev.z);
    root.add(b.group);
    bursts.push({ b, age: 0 });
  });
  bus.on('death', (ev) => {
    if (!rec || ev.id !== rec.id) return;
    for (const m of rec.rig.mats) m.emissiveIntensity = HITFLASH.intensity;
    dying.push({ rig: rec.rig, age: 0 });
    dropRing();
    restoreRoom();
    parkLights();
    rec = null;
  });
  bus.on('boss_despawn', (ev) => {
    if (!rec || ev.id !== rec.id) return;
    parkLights();
    releaseRig(rec.rig);
    dropRing();
    restoreRoom();
    rec = null;
  });

  function dropRing() {
    if (ring) {
      root.remove(ring.group);
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
        keyLight.position.set(0, 0, 0);
        keyLight.intensity = BOSS_LIGHT.intensity;
        rig.lightMount.add(keyLight);
        // A second, violet fill from the rack: corruption lighting the room.
        violetLight.position.set(0, 1.9, 0);
        violetLight.intensity = BOSS_LIGHT.intensity * 0.28;
        rig.lightMount.add(violetLight);
        rec = {
          id: ent.id,
          rig,
          light: keyLight,
          violet: violetLight,
          yaw: Math.atan2(ent.faceX ?? 0, ent.faceZ ?? 1),
          walkPhase: 0,
          telegraphK: 0,
          lungeK: 0,
          flashUntilTick: 0,
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
      // Fever: the boss-light burns hotter as it is worn down and while the
      // quake winds up — never dim enough to lose the room's key.
      rec.light.intensity = BOSS_LIGHT.intensity * (1 + 0.3 * (1 - hpFrac) + 0.35 * rec.telegraphK);
      rec.violet.intensity = BOSS_LIGHT.intensity * 0.28 * (1 + 0.5 * rec.telegraphK);

      const lit = tick < rec.flashUntilTick ? HITFLASH.intensity : 0;
      for (const m of rec.rig.mats) m.emissiveIntensity = lit;

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
      } else {
        dropRing();
      }
    } else if (rec) {
      parkLights();
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
      for (const m of d.rig.mats) m.emissiveIntensity = Math.max(0, 1 - k * 1.6);
      d.rig.pose({ t: tSec, walkPhase: 0, moveK: 0, telegraphK: 0, lungeK: 0, hpFrac: 0 });
    }
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
      screenBox: screenBox(),
    };
  }

  return { update, debugCounts, root };
}
