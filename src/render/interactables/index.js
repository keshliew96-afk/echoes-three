// Interactive-asset render layer (M4b, BUILD_BRIEF §23.7). Read-only over sim
// entities + bus events. Every asset shows its STATE in its body, never by
// colour alone (the `ix-` prompt carries the words):
//   dewfont    a stone font whose basin holds Bright Heal water (the heal
//              colour — this water IS heal output) with rising motes; drinking
//              drains it to a dry cracked bowl
//   barricade  destructible cover in three skins (timber planks / a crate row /
//              a bone-stone cairn wall / a violet crystal ridge): hit flash, a cracked lean below half
//              HP, a splinter burst when it breaks
//   keg        a hooped powder keg; lit, its fuse spits Ember sparks, it shakes,
//              and the Ember ring shows the 1.6 u blast for the whole 60-tick
//              fuse; the blast is a white-hot flash + fire burst + scorch
//   sluice     a lever post on the bank + a gate frame over its race: pulling it
//              drops the gate into the water and throws the lever; the lever
//              creeps back up over the cooldown (a clock ring counts it)
//   bell       a bronze bell in a timber A-frame: ringing swings it and sends a
//              bronze/Parchment shockwave out to the 3.0 u stun radius; rung, it
//              hangs dead still, tipped
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
import { PALETTE } from '../../data/palette.js';
import { toonMaterial } from '../toon.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { sharedGeo, releaseTree } from '../geocache.js';
import { addInk, groundShadow, exactColor, mix } from '../critters/common.js';
import { impactFx } from '../vfx/hub.js';
import { createTelegraphShapes } from '../enemies/shapes.js';
import { ENV } from '../../env/colors.js';
import { hslColor } from '../../env/colors.js';
import { warmPark } from '../warmup.js';
import { HITFLASH } from '../../core/constants.js';
// EVENT ROOMS (docs/EVENT_ROOMS.md): the eight encounter bodies.
import { buildEncounter, ENCOUNTER_KINDS } from './encounters.js';
// KEYS AND VAULTS (docs/VAULTS.md): the key, the hoard and the vault.
import { buildVaultRig, VAULT_KINDS } from './vaults.js';

const HEAL = exactColor(PALETTE.brightHeal);
const BONE_STONE = new Color(PALETTE.bone).multiplyScalar(0.8);
const BONE_STONE_DARK = new Color(PALETTE.bone).multiplyScalar(0.62);
const FONT_STONE = hslColor(210, 0.08, 0.34);
const FONT_STONE_DARK = hslColor(210, 0.1, 0.2);
const BRONZE = mix(PALETTE.paleGold, PALETTE.bruiseUmber, 0.45).multiplyScalar(0.9);
const BRONZE_LIT = mix(PALETTE.paleGold, PALETTE.parchment, 0.2);
const POWDER = mix(PALETTE.voidCharcoal, PALETTE.warmGrey, 0.18);
// Crystal wall (Act IV): the Hollow Heart's violet crystal on black rock.
const CRYSTAL = hslColor(268, 0.48, 0.46);
const CRYSTAL_LIT = hslColor(262, 0.44, 0.7);
const CRYSTAL_ROCK = hslColor(282, 0.12, 0.17);

const flashable = (color) => toonMaterial({ color, emissive: '#FFFFFF', emissiveIntensity: 0 });

// ---------------------------------------------------------------- DEWFONT --
function buildDewfont() {
  const g = new Group();
  const stone = toonMaterial({ color: FONT_STONE });
  const dark = toonMaterial({ color: FONT_STONE_DARK });
  const base = new Mesh(sharedGeo('ix-font-base', () => new CylinderGeometry(0.36, 0.44, 0.14, 8)), stone);
  base.position.y = 0.07;
  addInk(base);
  g.add(base);
  const stem = new Mesh(sharedGeo('ix-font-stem', () => new CylinderGeometry(0.14, 0.2, 0.42, 8)), stone);
  stem.position.y = 0.35;
  addInk(stem);
  g.add(stem);
  const bowlProfile = [[0.12, 0], [0.42, 0.06], [0.5, 0.2], [0.44, 0.22], [0.36, 0.1], [0.0, 0.1]].map(([x, y]) => new Vector2(x, y));
  const bowl = new Mesh(sharedGeo('ix-font-bowl', () => new LatheGeometry(bowlProfile, 12)), stone);
  bowl.position.y = 0.54;
  addInk(bowl);
  g.add(bowl);
  const inner = new Mesh(sharedGeo('ix-font-inner', () => new CircleGeometry(0.38, 16)), dark);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.645;
  g.add(inner);
  const waterMat = new MeshBasicMaterial({ color: HEAL.clone(), toneMapped: false, transparent: true, opacity: 0.92 });
  const water = new Mesh(sharedGeo('ix-font-water', () => new CircleGeometry(0.39, 18)), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.7;
  water.renderOrder = 1;
  g.add(water);
  const glow = makeGlowSprite({ color: PALETTE.brightHeal, size: 1.2, opacity: 0.4 });
  glow.material.color.copy(HEAL);
  glow.material.toneMapped = false;
  glow.position.y = 0.85;
  g.add(glow);
  const motes = [];
  for (let i = 0; i < 5; i++) {
    const m = makeGlowSprite({ color: PALETTE.brightHeal, size: 0.12, opacity: 0.8 });
    m.material.color.copy(HEAL);
    m.material.toneMapped = false;
    g.add(m);
    motes.push({ m, a: i * 1.26, ph: i / 5 });
  }
  // Moss runner on the base (wood-biome woodland rock) + a crack glyph shown dry.
  const crack = new Mesh(
    sharedGeo('ix-font-crack', () => mergeGeometries([new BoxGeometry(0.34, 0.01, 0.025).rotateY(0.5), new BoxGeometry(0.18, 0.01, 0.02).rotateY(-0.9).translate(0.1, 0, 0.06)])),
    new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false })
  );
  crack.position.y = 0.648;
  crack.visible = false;
  g.add(crack);
  g.add(groundShadow(0.5, 0.7));
  let level = 1;
  let lastT = null;
  return {
    group: g,
    update(e, tSec) {
      const dt = lastT === null ? 0 : Math.min(0.1, tSec - lastT);
      lastT = tSec;
      const full = e.uses === null || e.uses > 0;
      level += ((full ? 1 : 0) - level) * (1 - Math.exp(-3.5 * dt));
      water.visible = level > 0.03;
      water.position.y = 0.655 + 0.045 * level;
      waterMat.opacity = 0.92 * Math.min(1, level * 1.5);
      glow.material.opacity = (0.3 + 0.08 * Math.sin(tSec * 2.1)) * level;
      crack.visible = level < 0.2;
      for (const mo of motes) {
        const u = (tSec * 0.45 + mo.ph) % 1;
        mo.m.visible = level > 0.3;
        mo.m.position.set(Math.cos(mo.a + tSec * 0.4) * 0.22, 0.72 + u * 0.8, Math.sin(mo.a + tSec * 0.4) * 0.22);
        mo.m.material.opacity = 0.8 * (1 - u) * level;
      }
    },
    onUse(e) {
      impactFx.embers(e.x, e.z, { color: PALETTE.brightHeal, n: 14, radius: 0.5, tall: 1.8 });
    },
  };
}

// -------------------------------------------------------------- BARRICADE --
function buildBarricade(e) {
  const g = new Group();
  // The layer sets the group's rotation.y = entity yaw — the SAME convention
  // as the sim box collider (sim/movement.js: props use rotation.y = yaw), so
  // the drawn wall is exactly the wall a body and a bolt meet.
  const yawG = new Group();
  g.add(yawG);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  const skin = e.skin ?? 'timber';
  if (skin === 'timber') {
    const plank = track(flashable(ENV.plank));
    const bark = track(flashable(ENV.bark));
    const dark = track(flashable(ENV.barkDark));
    for (const x of [-0.62, 0.62]) {
      const p = new Mesh(sharedGeo('ix-bar-post', () => new CylinderGeometry(0.07, 0.085, 0.86, 6)), bark);
      p.position.set(x, 0.43, 0);
      addInk(p);
      yawG.add(p);
    }
    for (const [y, w] of [[0.2, 1.36], [0.42, 1.34], [0.64, 1.3]]) {
      const b = new Mesh(sharedGeo('ix-bar-plank', () => new BoxGeometry(1, 0.17, 0.12)), plank);
      b.scale.x = w;
      b.position.set(0, y, 0);
      b.rotation.z = (y - 0.42) * 0.08;
      addInk(b);
      yawG.add(b);
    }
    const brace = new Mesh(sharedGeo('ix-bar-brace', () => new BoxGeometry(1.3, 0.07, 0.05)), dark);
    brace.rotation.z = 0.5;
    brace.position.set(0, 0.42, 0.075);
    yawG.add(brace);
  } else if (skin === 'crates') {
    const plank = track(flashable(ENV.plank));
    const lit = track(flashable(ENV.plankLit));
    const dark = track(flashable(ENV.barkDark));
    for (const [x, y, s, r] of [[-0.44, 0.24, 0.48, 0.1], [0.08, 0.26, 0.52, -0.06], [0.52, 0.2, 0.4, 0.2], [-0.16, 0.7, 0.42, 0.3]]) {
      const c = new Mesh(sharedGeo('ix-bar-crate', () => new BoxGeometry(1, 1, 1)), r > 0.25 ? lit : plank);
      c.scale.setScalar(s);
      c.position.set(x, y, 0);
      c.rotation.y = r;
      addInk(c);
      yawG.add(c);
      const slat = new Mesh(sharedGeo('ix-bar-slat', () => new BoxGeometry(1.02, 0.08, 1.02)), dark);
      slat.scale.setScalar(s);
      slat.position.set(x, y + s * 0.2, 0);
      slat.rotation.y = r;
      yawG.add(slat);
    }
  } else if (skin === 'crystal') {
    // Crystal wall (Act IV, the Hollow Heart): a ridge of violet crystal
    // growths out of a black rock footing — the heart's own cover. The
    // crystal carries a low violet emissive; the hit flash rides the white
    // emissive on the tracked rock + crystal materials like every skin.
    const rock = track(flashable(CRYSTAL_ROCK));
    const cry = track(toonMaterial({ color: CRYSTAL, emissive: '#FFFFFF', emissiveIntensity: 0 }));
    const tip = track(toonMaterial({ color: CRYSTAL_LIT, emissive: '#FFFFFF', emissiveIntensity: 0 }));
    const base = new Mesh(
      sharedGeo('ix-crystal-footing', () =>
        mergeGeometries([
          new IcosahedronGeometry(0.3, 0).scale(1.3, 0.42, 0.75).translate(-0.4, 0.1, 0),
          new IcosahedronGeometry(0.32, 0).scale(1.35, 0.45, 0.8).translate(0.32, 0.1, 0.02),
          new IcosahedronGeometry(0.18, 0).scale(1, 0.5, 0.9).translate(0.0, 0.08, 0.16),
        ])
      ),
      rock
    );
    addInk(base);
    yawG.add(base);
    const spec = [
      // [x, z, r, h, tiltZ, tiltX]
      [-0.5, 0.0, 0.11, 0.62, 0.28, 0.05],
      [-0.24, -0.04, 0.14, 0.86, 0.08, -0.08],
      [0.06, 0.04, 0.16, 0.98, -0.06, 0.06],
      [0.36, -0.02, 0.13, 0.74, -0.24, -0.05],
      [0.58, 0.04, 0.09, 0.46, -0.5, 0.1],
      [-0.06, -0.12, 0.08, 0.42, 0.4, -0.5],
      [0.2, 0.14, 0.08, 0.38, -0.3, 0.55],
    ];
    const shafts = sharedGeo('ix-crystal-shafts', () =>
      mergeGeometries(spec.map(([x, z, r, h, tz, tx]) => new CylinderGeometry(r, r * 1.14, h, 6).translate(0, h / 2, 0).rotateZ(tz).rotateX(tx).translate(x, 0.04, z)))
    );
    const tips = sharedGeo('ix-crystal-tips', () =>
      mergeGeometries(spec.map(([x, z, r, h, tz, tx]) => new ConeGeometry(r, r * 2.3, 6).translate(0, h + r * 1.15, 0).rotateZ(tz).rotateX(tx).translate(x, 0.04, z)))
    );
    const sm = new Mesh(shafts, cry);
    addInk(sm);
    yawG.add(sm);
    const tm = new Mesh(tips, tip);
    addInk(tm);
    yawG.add(tm);
    // A violet glow breathing inside the ridge (not tracked: no flash).
    const glow = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 1.3, opacity: 0.22 });
    glow.material.toneMapped = false;
    glow.position.y = 0.45;
    yawG.add(glow);
  } else {
    // Bone-stone cairn wall (Act III): stacked pale blocks, a dark chink course.
    const bone = track(flashable(BONE_STONE));
    const boneD = track(flashable(BONE_STONE_DARK));
    const stones = sharedGeo('ix-cairn-wall', () =>
      mergeGeometries([
        new IcosahedronGeometry(0.28, 0).scale(1.1, 0.7, 0.8).translate(-0.48, 0.2, 0),
        new IcosahedronGeometry(0.27, 0).scale(1.2, 0.72, 0.85).translate(0.06, 0.19, 0.02),
        new IcosahedronGeometry(0.25, 0).scale(1.1, 0.7, 0.8).translate(0.54, 0.18, -0.02),
        new IcosahedronGeometry(0.22, 0).scale(1.2, 0.7, 0.8).translate(-0.22, 0.52, 0.01),
        new IcosahedronGeometry(0.21, 0).scale(1.15, 0.7, 0.8).translate(0.3, 0.5, 0.0),
        new IcosahedronGeometry(0.15, 0).scale(1, 0.8, 0.8).translate(0.02, 0.76, 0.0),
      ])
    );
    const m = new Mesh(stones, bone);
    addInk(m);
    yawG.add(m);
    const chinks = new Mesh(
      sharedGeo('ix-cairn-chinks', () => mergeGeometries([new BoxGeometry(1.3, 0.04, 0.5).translate(0, 0.36, 0), new BoxGeometry(0.9, 0.035, 0.45).translate(0.02, 0.66, 0)])),
      boneD
    );
    yawG.add(chinks);
  }
  g.add(groundShadow(0.78, 0.8, { forward: 0.12, wide: 1.25, deep: 0.62 }));
  let flashUntil = 0;
  return {
    group: g,
    mats,
    hit(tick) {
      flashUntil = tick + HITFLASH.ticks;
    },
    update(ent, tSec, ctx) {
      const lit = ctx.tick < flashUntil ? HITFLASH.intensity : 0;
      for (const m of mats) m.emissiveIntensity = lit;
      // Below half HP it leans and settles (damage state in the silhouette).
      const dmg = 1 - Math.max(0, ent.hp / ent.maxHp);
      yawG.rotation.z = dmg > 0.5 ? 0.08 * (dmg - 0.5) * 2 : 0;
      yawG.position.y = -0.04 * dmg;
    },
    onBreak(e) {
      const debris = skin === 'crystal' ? PALETTE.godstuffViolet : PALETTE.bone;
      impactFx.hit(e.x, e.z, { color: debris, scale: 2.2 });
      impactFx.impact(e.x, e.z, { color: debris, n: 14 });
      impactFx.splat(e.x, e.z);
    },
  };
}

// -------------------------------------------------------------------- KEG --
function buildKeg() {
  const g = new Group();
  const shake = new Group();
  g.add(shake);
  const wood = flashable(ENV.bark);
  const body = new Mesh(sharedGeo('ix-keg', () => new CylinderGeometry(0.22, 0.26, 0.56, 12)), wood);
  body.position.y = 0.28;
  addInk(body);
  shake.add(body);
  const hoopMat = toonMaterial({ color: ENV.iron });
  const hoops = new Mesh(
    sharedGeo('ix-keg-hoops', () => mergeGeometries([0.1, 0.46].map((y) => new TorusGeometry(0.245, 0.02, 6, 18).rotateX(Math.PI / 2).translate(0, y, 0)))),
    hoopMat
  );
  shake.add(hoops);
  const band = new Mesh(sharedGeo('ix-keg-band', () => new CylinderGeometry(0.262, 0.262, 0.12, 12, 1, true)), toonMaterial({ color: POWDER }));
  band.position.y = 0.28;
  shake.add(band);
  const lid = new Mesh(sharedGeo('ix-keg-lid', () => new CylinderGeometry(0.2, 0.2, 0.04, 12)), toonMaterial({ color: ENV.plankLit }));
  lid.position.y = 0.57;
  shake.add(lid);
  const fuse = new Mesh(sharedGeo('ix-keg-fuse', () => new CylinderGeometry(0.012, 0.012, 0.16, 4).rotateZ(0.5)), toonMaterial({ color: POWDER }));
  fuse.position.set(0.05, 0.64, 0);
  shake.add(fuse);
  g.add(groundShadow(0.34, 0.72));
  return {
    group: g,
    mats: [wood],
    update(e, tSec, ctx) {
      if (e.kind === 'kegfuse') {
        const span = Math.max(1, e.blastTick - e.startTick);
        const prog = Math.min(1, Math.max(0, (ctx.tick - e.startTick) / span));
        shake.position.set(Math.sin(tSec * 60) * 0.02 * prog, 0, Math.cos(tSec * 53) * 0.02 * prog);
        wood.emissiveIntensity = 0.25 * prog * (0.5 + 0.5 * Math.sin(tSec * 25));
        if (ctx.cosmetic.chance(0.6)) impactFx.embers(e.x + 0.06, e.z, { n: 1, radius: 0.05, tall: 0.6 });
      }
    },
  };
}

// ----------------------------------------------------------------- SLUICE --
function buildSluice(e, world) {
  const g = new Group();
  const bark = toonMaterial({ color: ENV.bark });
  const dark = toonMaterial({ color: ENV.barkDark });
  const iron = toonMaterial({ color: ENV.iron });
  const post = new Mesh(sharedGeo('ix-sl-post', () => new BoxGeometry(0.16, 0.7, 0.16)), bark);
  post.position.y = 0.35;
  addInk(post);
  g.add(post);
  const foot = new Mesh(sharedGeo('ix-sl-foot', () => new BoxGeometry(0.46, 0.1, 0.34)), dark);
  foot.position.y = 0.05;
  addInk(foot);
  g.add(foot);
  const pivot = new Group();
  pivot.position.set(0, 0.62, 0.1);
  g.add(pivot);
  const arm = new Mesh(sharedGeo('ix-sl-arm', () => new BoxGeometry(0.06, 0.62, 0.06).translate(0, 0.3, 0)), iron);
  addInk(arm);
  pivot.add(arm);
  const knob = new Mesh(sharedGeo('ix-sl-knob', () => new IcosahedronGeometry(0.07, 0).translate(0, 0.62, 0)), dark);
  pivot.add(knob);
  // Cooldown clock ring over the post (state glyph, not colour alone).
  const clockBack = new Mesh(sharedGeo('ix-sl-clockback', () => new RingGeometry(0.16, 0.2, 32)), new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false }));
  const clockFill = new Mesh(sharedGeo('ix-sl-clockfill', () => new RingGeometry(0.16, 0.2, 32, 1, 0, Math.PI * 2)), new MeshBasicMaterial({ color: exactColor(PALETTE.bone), transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
  const clock = new Group();
  clock.add(clockBack, clockFill);
  clock.position.y = 1.32;
  g.add(clock);
  g.add(groundShadow(0.32, 0.7));
  // The gate over each linked race (built lazily once the lane entity is seen).
  const gates = [];
  function ensureGates() {
    if (gates.length || !e.laneIds || !e.laneIds.length) return;
    for (const lid of e.laneIds) {
      const lane = world.entities().find((x) => x.id === lid);
      if (!lane || !lane.lane) continue;
      const L = lane.lane;
      const gg = new Group();
      // At the upstream end, 1 u in from the wall.
      const gx = L.x0 + lane.dirX * 1.0;
      const gz = L.z0 + lane.dirZ * 1.0;
      gg.position.set(gx - e.x, 0, gz - e.z);
      gg.rotation.y = Math.atan2(lane.dirX, lane.dirZ);
      const w = L.w + 0.3;
      for (const sx of [-1, 1]) {
        const p = new Mesh(sharedGeo('ix-gate-post', () => new BoxGeometry(0.14, 1.1, 0.14)), bark);
        p.position.set((sx * w) / 2, 0.55, 0);
        addInk(p);
        gg.add(p);
      }
      const top = new Mesh(sharedGeo('ix-gate-top', () => new BoxGeometry(1, 0.12, 0.16)), bark);
      top.scale.x = w + 0.14;
      top.position.y = 1.1;
      addInk(top);
      gg.add(top);
      const board = new Mesh(sharedGeo('ix-gate-board', () => new BoxGeometry(1, 0.5, 0.08)), dark);
      board.scale.x = w - 0.14;
      addInk(board);
      gg.add(board);
      g.add(gg);
      gates.push({ gg, board });
    }
  }
  let armA = 0.6;
  let lastT = null;
  return {
    group: g,
    update(ent, tSec, ctx) {
      const dt = lastT === null ? 0 : Math.min(0.1, tSec - lastT);
      lastT = tSec;
      ensureGates();
      const closed = ctx.tick < (ent.activeUntilTick ?? 0);
      const cdLeft = Math.max(0, (ent.cooldownUntilTick ?? 0) - ctx.tick);
      // Lever: thrown down while the gate is shut, creeping back over the cooldown.
      const want = closed ? -0.9 : cdLeft > 0 ? -0.9 + 1.5 * (1 - cdLeft / 1200) : 0.6;
      armA += (want - armA) * (1 - Math.exp(-8 * dt));
      pivot.rotation.x = armA;
      for (const gt of gates) {
        const y = closed ? 0.2 : 0.78;
        gt.board.position.y += (y - gt.board.position.y) * (1 - Math.exp(-6 * dt));
      }
      clock.visible = cdLeft > 0;
      if (clock.visible) {
        const total = closed ? 720 : 1200;
        const left = closed ? (ent.activeUntilTick - ctx.tick) : cdLeft;
        const frac = Math.max(0.001, 1 - left / total);
        clockFill.geometry = sharedGeo(`ix-sl-clock:${Math.round(frac * 40)}`, () => new RingGeometry(0.16, 0.2, 32, 1, Math.PI / 2, -Math.PI * 2 * (Math.round(frac * 40) / 40)));
        clock.quaternion.copy(ctx.camQuat);
      }
    },
    onUse(e2) {
      impactFx.hit(e2.x, e2.z, { color: PALETTE.bone, scale: 0.8 });
    },
  };
}

// ------------------------------------------------------------------- BELL --
function buildBell() {
  const g = new Group();
  const bark = toonMaterial({ color: ENV.bark });
  const dark = toonMaterial({ color: ENV.barkDark });
  for (const sx of [-1, 1]) {
    const leg = new Mesh(sharedGeo('ix-bell-leg', () => new BoxGeometry(0.1, 1.2, 0.1)), bark);
    leg.position.set(sx * 0.34, 0.56, 0);
    leg.rotation.z = sx * 0.18;
    addInk(leg);
    g.add(leg);
  }
  const beam = new Mesh(sharedGeo('ix-bell-beam', () => new BoxGeometry(0.9, 0.1, 0.12)), dark);
  beam.position.y = 1.12;
  addInk(beam);
  g.add(beam);
  const swing = new Group();
  swing.position.y = 1.06;
  g.add(swing);
  const profile = [[0.0, 0], [0.06, 0], [0.12, -0.08], [0.16, -0.3], [0.24, -0.46], [0.26, -0.5], [0.0, -0.5]].map(([x, y]) => new Vector2(x, y));
  const bronze = flashable(BRONZE);
  const bell = new Mesh(sharedGeo('ix-bell', () => new LatheGeometry(profile, 14)), bronze);
  addInk(bell);
  swing.add(bell);
  const lip = new Mesh(sharedGeo('ix-bell-lip', () => new TorusGeometry(0.25, 0.022, 6, 18).rotateX(Math.PI / 2)), toonMaterial({ color: BRONZE_LIT }));
  lip.position.y = -0.49;
  swing.add(lip);
  const clapper = new Mesh(sharedGeo('ix-bell-clapper', () => new IcosahedronGeometry(0.05, 0)), dark);
  clapper.position.y = -0.46;
  swing.add(clapper);
  g.add(groundShadow(0.48, 0.66, { wide: 1.2, deep: 0.7 }));
  // Shockwave: an additive bronze/Parchment ring expanding to the stun radius.
  const waveMat = new MeshBasicMaterial({ map: getRadialTexture(), color: mix(PALETTE.paleGold, PALETTE.parchment, 0.4), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
  const wave = new Mesh(sharedGeo('ix-bell-wave', () => new RingGeometry(0.86, 1.0, 48)), waveMat);
  wave.rotation.x = -Math.PI / 2;
  wave.position.y = 0.03;
  wave.renderOrder = 4;
  g.add(wave);
  let swingAge = 9;
  let lastT = null;
  return {
    group: g,
    mats: [bronze],
    update(e, tSec) {
      const dt = lastT === null ? 0 : Math.min(0.1, tSec - lastT);
      lastT = tSec;
      swingAge += dt;
      const rung = e.uses !== null && e.uses <= 0;
      const a = swingAge < 2.2 ? 0.55 * Math.exp(-1.6 * swingAge) * Math.sin(swingAge * 12) : 0;
      swing.rotation.z = a + (rung && swingAge >= 2.2 ? 0.12 : 0);
      bronze.emissiveIntensity = swingAge < 0.3 ? 0.35 * (1 - swingAge / 0.3) : 0;
      const w = Math.min(1, swingAge / 0.5);
      wave.scale.set(0.2 + 2.8 * w, 0.2 + 2.8 * w, 1);
      waveMat.opacity = swingAge < 0.6 ? 0.85 * (1 - w) : 0;
    },
    onUse(e) {
      swingAge = 0;
      impactFx.impact(e.x, e.z, { color: PALETTE.paleGold, n: 10 });
    },
  };
}

// ------------------------------------------------------------------ layer --
export function createInteractableLayer({ stage, world, bus, cosmetic }) {
  const root = new Group();
  root.name = 'interactfx';
  stage.scene.add(root);
  const shapes = createTelegraphShapes(root);
  const rigs = new Map(); // entity id -> { r, kind }
  const fuseTele = new Map(); // kegfuse id -> shape
  const flashes = []; // { s, age }

  function build(e) {
    switch (e.kind) {
      case 'dewfont':
        return buildDewfont(e);
      case 'barricade':
        return buildBarricade(e);
      case 'keg':
      case 'kegfuse':
        return buildKeg(e);
      case 'sluice':
        return buildSluice(e, world);
      case 'bell':
        return buildBell(e);
      case 'encounter':
        return buildEncounter(e);
      default:
        return VAULT_KINDS.includes(e.kind) ? buildVaultRig(e) : null;
    }
  }

  bus.on('hit', (ev) => {
    const r = rigs.get(ev.target);
    if (r && r.r.hit) r.r.hit(ev.tick);
  });
  bus.on('broken', (ev) => {
    const r = rigs.get(ev.id);
    if (r && r.r.onBreak) r.r.onBreak(ev);
  });
  bus.on('interact', (ev) => {
    const r = rigs.get(ev.id);
    if (r && r.r.onUse) r.r.onUse(ev);
  });
  // EVENT ROOMS: the card opening, a Take and a Leave drive the live rig.
  for (const type of ['event_open', 'event_take', 'event_leave']) {
    bus.on(type, (ev) => {
      for (const rec of rigs.values()) {
        if (rec.kind !== 'encounter' || !rec.r.onEvent) continue;
        const p = rec.r.group.position;
        rec.r.onEvent(type, ev, p.x, p.z);
      }
    });
  }
  // KEYS AND VAULTS: the chest's opening drives its rig.
  bus.on('vault_open', () => {
    for (const rec of rigs.values()) if (rec.kind === 'vault_chest' && rec.r.onEvent) rec.r.onEvent('vault_open');
  });
  bus.on('keg_blast', (ev) => {
    // White-hot flash + fire burst + scorch at the blast (the §19.4 layers).
    impactFx.kill(ev.x, ev.z, { color: PALETTE.emberDanger });
    impactFx.embers(ev.x, ev.z, { n: 18, radius: ev.radius * 0.8, tall: 2.2 });
    impactFx.scorch(ev.x, ev.z, ev.radius * 0.7);
    const s = makeGlowSprite({ color: PALETTE.parchment, size: ev.radius * 2.6, opacity: 1 });
    s.material.toneMapped = false;
    s.position.set(ev.x, 0.6, ev.z);
    root.add(s);
    flashes.push({ s, age: 0, base: ev.radius * 2.6 });
  });

  // EVENT ROOMS: was the live encounter already resolved (taken or left)?
  function encounterSpent() {
    const rs = typeof world.runSystem === 'function' ? world.runSystem() : null;
    const v = rs ? rs.view() : null;
    return !!(v && v.encounter && v.encounter.state === 'done');
  }

  let lastT = null;
  function update(tSec) {
    const dt = lastT === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - lastT));
    lastT = tSec;
    const ctx = { tick: world.tick, cosmetic, camQuat: stage.camera.quaternion };
    const seen = new Set();
    for (const e of world.entities()) {
      if (e.kind !== 'dewfont' && e.kind !== 'barricade' && e.kind !== 'keg' && e.kind !== 'kegfuse' && e.kind !== 'sluice' && e.kind !== 'bell' && e.kind !== 'encounter' && !VAULT_KINDS.includes(e.kind)) continue;
      seen.add(e.id);
      let rec = rigs.get(e.id);
      if (!rec) {
        const r = build(e);
        if (!r) continue;
        r.group.position.set(e.x, 0, e.z);
        r.group.rotation.y = e.yaw ?? 0;
        rec = { r, kind: e.kind };
        rigs.set(e.id, rec);
        // EVENT ROOMS: a rig rebuilt after a load (or on a joining guest)
        // shows a spent encounter as spent.
        if (e.kind === 'encounter' && r.restore) r.restore(e.uses === 0 && encounterSpent());
        root.add(r.group);
      }
      rec.r.update(e, tSec, ctx, dt);
      if (e.kind === 'kegfuse') {
        let sh = fuseTele.get(e.id);
        if (!sh) {
          sh = shapes.acquire('ring');
          fuseTele.set(e.id, sh);
        }
        const span = Math.max(1, e.blastTick - e.startTick);
        sh.set({ x: e.x, z: e.z, radius: e.blastRadius }, tSec, Math.min(1, (ctx.tick - e.startTick) / span));
      }
    }
    for (const [id, rec] of rigs) {
      if (seen.has(id)) continue;
      root.remove(rec.r.group);
      releaseTree(rec.r.group);
      rigs.delete(id);
    }
    for (const [id, sh] of fuseTele) {
      if (seen.has(id)) continue;
      shapes.release(sh);
      fuseTele.delete(id);
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.age += dt;
      if (f.age >= 0.28) {
        root.remove(f.s);
        f.s.material.dispose();
        flashes.splice(i, 1);
        continue;
      }
      f.s.material.opacity = 1 - f.age / 0.28;
      const sz = f.base * (1 + f.age * 2.2);
      f.s.scale.set(sz, sz, 1);
    }
  }

  let warmed = false;
  let frames = 0;
  function prewarm() {
    warmed = true;
    warmPark(root, buildDewfont().group);
    for (const skin of ['timber', 'crates', 'cairn', 'crystal']) warmPark(root, buildBarricade({ skin, collider: { yaw: 0 } }).group);
    warmPark(root, buildKeg().group);
    warmPark(root, buildSluice({ laneIds: [] }, world).group);
    warmPark(root, buildBell().group);
    for (const encounter of ENCOUNTER_KINDS) warmPark(root, buildEncounter({ encounter, uses: 1 }).group);
    for (const kind of VAULT_KINDS) warmPark(root, buildVaultRig({ kind, uses: 1 }).group);
    const back = shapes.prewarm();
    setTimeout(back, 250);
  }

  function debugState() {
    const byKind = {};
    for (const r of rigs.values()) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
    return { interactRigs: rigs.size, byKind, fuses: fuseTele.size };
  }

  // @gnt:M2 RESTORE-RESYNC begin — a load replaces the registry: every
  // asset rig (keyed by entity id, built per kind — a used font, a broken
  // barricade) and keg-fuse ring is released as the reconcile releases an
  // unseen id; update() rebuilds them in their restored state.
  bus.on('state_restored', () => {
    for (const rec of rigs.values()) {
      root.remove(rec.r.group);
      releaseTree(rec.r.group);
    }
    rigs.clear();
    for (const sh of fuseTele.values()) shapes.release(sh);
    fuseTele.clear();
  });
  // @gnt:M2 RESTORE-RESYNC end
  return {
    update(tSec) {
      if (!warmed && ++frames > 16) prewarm();
      update(tSec);
    },
    debugState,
    root,
  };
}
