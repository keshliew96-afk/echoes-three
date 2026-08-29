// Ally render layer (ally block) — the render side of §7 kits / §8 mark /
// §10 downed+revive / §12 ally AI, mounted from main.js beside the skill-FX
// and enemy layers:
//
//   - the three party critters ride their sim bodies (interpolated px/pz ->
//     x/z), yaw smoothly toward the AI facing, and arbitrate the existing
//     critter clips exactly like the Healer does: downed > hurt > attack
//     (cast) > walk > idle
//   - §17 Zone 3 Signal Blue mark reticle on the Tab-marked enemy: a GLYPH
//     (thin ring + four brackets + overhead caret), never a fill
//   - §10/§17 revive furniture on every Downed body: a hollow Bone ring with
//     the hold-E glyph while nobody is channelling, and a Parchment radial
//     fill on a Void Charcoal backing disc — clockwise from 12 o'clock,
//     concentric OUTSIDE the identity ring — while one is. An interrupt keeps
//     the ring on screen and drains it backwards at 2x (the sim owns that
//     value; this layer just draws it).
//   - ally kit ground_aoe zones (Ground Crack / Caltrops / Detonating Charge)
//     as layered discs + rim + motes, in the party's Parchment/Hearth Amber
//     damage family (§19.4 — never Ember, which is enemy-only, and never
//     Bright Heal, which is heal-only)
//   - melee-arc swipe wedges and nova rings for ally attacks, so every ally
//     hit is a >=3-layer event (core + glow + particles) like the player's
//
// Render-only: reads sim state and the event bus, never mutates either.
import {
  AdditiveBlending,
  Vector3,
  CanvasTexture,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from 'three';
import { PALETTE } from '../../data/palette.js';
import { TICK_HZ } from '../../core/constants.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { createCritter } from '../critters/index.js';
import { exactColor, exactHex } from '../critters/common.js';
import { ALLY_CLASSES, REVIVE } from '../../sim/allies.js';

const PARCH = PALETTE.parchment;
const AMBER = PALETTE.hearthAmber;
const BONE = PALETTE.bone;
const CHARCOAL = PALETTE.voidCharcoal;
const SIGNAL = PALETTE.signalBlue; // §19.1: mark reticle glyph, glyph/ink only

// Clip arbitration (mirrors the Healer's in scenes/arena.js so the whole party
// reads with one grammar).
const CAST_PHASE = 0.45; // s into the cast clip = the release pop
const CAST_HOLD = 0.34; // s the attack pose holds
const HURT_HOLD = 0.62; // s — snap + held flinch
const MOVE_EPS = 0.3; // u/s of sim speed above which the walk clip drives
const YAW_RATE = 10; // 1/s exponential smoothing toward the AI facing

// §10/§17 revive furniture. The ring sits outside a DOWNED critter's identity
// ring (the collapse grows that ring to cover the horizontal silhouette), and
// at the 12 u / 52° gameplay rig a 0.98 u outer radius projects to ~175 px
// across — far over the §17 ">=48 px on screen" floor.
const REVIVE_RING = Object.freeze({
  inner: 0.88,
  outer: 1.1,
  track: 0.07, // charcoal backing spills this far past the band on each side
  backing: 1.2, // the §17 "charcoal backing disc" itself, held faint
  segments: 72,
});

// §8/§17 mark reticle sizing (glyph weights, not fills).
const MARK = Object.freeze({ inner: 0.5, outer: 0.58, bracket: 0.72, caretY: 1.35 });

let eTexture = null;
// §10 "hold-E glyph over the body": Parchment E on a Void Charcoal plate, the
// same charcoal-plate grammar §17 binds for all combat text.
function getHoldETexture() {
  if (eTexture) return eTexture;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = exactHex(CHARCOAL);
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.roundRect(18, 18, 92, 92, 22);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = exactHex(PARCH);
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.font = '900 74px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = exactHex(PARCH);
  ctx.fillText('E', 64, 68);
  eTexture = new CanvasTexture(c);
  eTexture.colorSpace = SRGBColorSpace;
  return eTexture;
}

let markCaretTex = null;
// Signal Blue chevron — the half of the mark that ground glow can never wash
// out. Charcoal-inked so it survives a bright floor.
function getMarkCaretTexture() {
  if (markCaretTex) return markCaretTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.beginPath();
  ctx.moveTo(18, 30);
  ctx.lineTo(64, 96);
  ctx.lineTo(110, 30);
  ctx.lineTo(90, 30);
  ctx.lineTo(64, 66);
  ctx.lineTo(38, 30);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 12;
  ctx.strokeStyle = exactHex(CHARCOAL);
  ctx.stroke();
  ctx.fillStyle = exactHex(SIGNAL);
  ctx.fill();
  markCaretTex = new CanvasTexture(c);
  markCaretTex.colorSpace = SRGBColorSpace;
  return markCaretTex;
}

// Glyph/ring materials composite NORMALLY (never additive: an additive blue
// ring over a lit green floor washes to white) and are pre-inverted through
// the post chain by exactColor, so the pixels that land on screen ARE the
// §19.1 hex — Signal Blue #4FA3D9, Parchment #F4EFE6, Bone #C9C2B3.
function flatMat(color, opacity, additive = false) {
  return new MeshBasicMaterial({
    color: additive ? new Color(color) : exactColor(color),
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
    side: DoubleSide,
    ...(additive ? { blending: AdditiveBlending } : {}),
  });
}

export function createAllyLayer({ stage, world, bus, cosmetic, scene = null }) {
  const root = new Group();
  root.name = 'allyfx';
  stage.scene.add(root);

  const allySys = world.allySystem();

  // --- Rigs. The arena scene already builds the three party critters at their
  // camp spots; adopt those (one factory instance per character, never two)
  // and let the scene keep driving their pose clocks. Anywhere else (graybox
  // probes) this layer builds its own and drives them itself.
  const adopted = Array.isArray(scene?.allies) && scene.allies.length === 3;
  const critters = new Map(); // classId -> critter
  if (adopted) {
    for (const c of scene.allies) critters.set(c.classId, c);
  } else {
    for (const classId of ['tank', 'swordsman', 'archer']) {
      const c = createCritter(classId, { cosmetic });
      root.add(c.group);
      critters.set(classId, c);
    }
  }
  const rigState = new Map(); // classId -> { yaw, castLeft, hurtLeft }
  for (const classId of critters.keys()) rigState.set(classId, { yaw: 0, castLeft: 0, hurtLeft: 0 });

  const allyEntities = () => world.entities().filter((e) => e.kind === 'ally');
  const byId = (id) => world.entities().find((e) => e.id === id) ?? null;

  // ------------------------------------------------------------ bus wiring --
  bus.on('ally_basic', (ev) => {
    const st = rigState.get(ev.classId);
    if (st) st.castLeft = CAST_HOLD;
    if (ev.shape === 'melee_arc') spawnWedge(ev, ev.reach, ev.halfAngle, 0.28);
  });
  bus.on('ally_cast', (ev) => {
    const st = rigState.get(ev.classId);
    if (st) st.castLeft = CAST_HOLD;
    if (ev.shape === 'melee_arc') spawnWedge(ev, ev.reach, ev.halfAngle, 0.4);
    else if (ev.shape === 'nova') {
      spawnRing(ev.x, ev.z, { from: 0.25, to: ev.radius, life: 0.4, opacity: 0.85 });
      spawnFlash(ev.x, 0.5, ev.z, { color: PARCH, size: 0.4, opacity: 0.95, life: 0.2, grow: 0.4 });
      spawnFlash(ev.x, 0.5, ev.z, { color: AMBER, size: 0.85, opacity: 0.6, life: 0.32, grow: 0.7 });
      spawnMotes(ev.x, ev.z, { count: 9, spread: ev.radius * 0.8 });
    }
  });
  bus.on('hit', (ev) => {
    const a = byId(ev.target);
    if (a && a.kind === 'ally') {
      const st = rigState.get(a.classId);
      if (st) st.hurtLeft = HURT_HOLD;
    }
  });
  bus.on('azone_tick', (ev) => {
    const rig = zoneRigs.get(ev.id);
    if (!rig) return;
    rig.pulseT = 0.35;
    spawnRing(rig.g.position.x, rig.g.position.z, {
      from: 0.25,
      to: rig.radius,
      life: 0.3,
      opacity: 0.6,
    });
    spawnMotes(rig.g.position.x, rig.g.position.z, { count: 5, spread: rig.radius * 0.8 });
  });
  bus.on('revive', (ev) => {
    const m = byId(ev.target);
    if (!m) return;
    spawnRing(m.x, m.z, { from: REVIVE_RING.outer, to: 0.3, life: 0.5, opacity: 0.9, color: PARCH });
    spawnFlash(m.x, 0.6, m.z, { color: PARCH, size: 0.8, opacity: 0.95, life: 0.4, grow: 0.6 });
    spawnMotes(m.x, m.z, { count: 12, spread: 0.5, color: PARCH });
  });

  // ------------------------------------------------------------ mark glyph --
  // §17 Zone 3: "Signal Blue mark reticle on the Tab-marked enemy (glyph,
  // never a fill)". Ring outline + four corner brackets + overhead chevron;
  // the shape channel (brackets) carries the state, not the colour alone.
  const markGroup = new Group();
  markGroup.name = 'mark-reticle';
  const markRing = new Mesh(
    new RingGeometry(MARK.inner, MARK.outer, 48),
    flatMat(SIGNAL, 0.95)
  );
  markRing.rotation.x = -Math.PI / 2;
  markRing.renderOrder = -3;
  markGroup.add(markRing);
  const bracketGeo = new PlaneGeometry(0.1, 0.3);
  for (let i = 0; i < 4; i++) {
    const b = new Mesh(bracketGeo, flatMat(SIGNAL, 1));
    b.rotation.x = -Math.PI / 2;
    b.rotation.z = -(Math.PI / 4 + (i * Math.PI) / 2);
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    b.position.set(Math.cos(a) * MARK.bracket, 0.004, Math.sin(a) * MARK.bracket);
    b.renderOrder = -3;
    markGroup.add(b);
  }
  const markCaret = new Sprite(
    new SpriteMaterial({
      map: getMarkCaretTexture(),
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    })
  );
  markCaret.scale.set(0.44, 0.44, 1);
  markCaret.position.set(0, MARK.caretY, 0);
  markCaret.renderOrder = 21;
  markGroup.add(markCaret);
  markGroup.position.y = 0.034;
  markGroup.visible = false;
  root.add(markGroup);

  // --------------------------------------------------------- revive rings --
  // One record per downed body: charcoal backing disc, hollow Bone ring, the
  // clockwise Parchment progress arc, and the hold-E glyph.
  const reviveRigs = new Map(); // entity id -> record
  const revivePool = [];

  function makeReviveRig() {
    const g = new Group();
    // §17: "Parchment radial fill on a charcoal backing disc". The disc is
    // held faint so it never reads as a second contact shadow, and a stronger
    // charcoal TRACK annulus sits directly under the band so the Parchment arc
    // always has its own dark ground to be bright against.
    const backing = new Mesh(
      new CircleGeometry(REVIVE_RING.backing, 44),
      flatMat(CHARCOAL, 0.3)
    );
    backing.rotation.x = -Math.PI / 2;
    backing.position.y = 0.024;
    backing.renderOrder = -5;
    g.add(backing);
    const track = new Mesh(
      new RingGeometry(
        REVIVE_RING.inner - REVIVE_RING.track,
        REVIVE_RING.outer + REVIVE_RING.track,
        56
      ),
      flatMat(CHARCOAL, 0.72)
    );
    track.rotation.x = -Math.PI / 2;
    track.position.y = 0.027;
    track.renderOrder = -4;
    g.add(track);
    // §10: hollow BONE ring — the "nobody is reviving me" readout.
    const hollow = new Mesh(
      new RingGeometry(REVIVE_RING.inner, REVIVE_RING.outer, 56),
      flatMat(BONE, 0.55)
    );
    hollow.rotation.x = -Math.PI / 2;
    hollow.position.y = 0.03;
    hollow.renderOrder = -3;
    hollow.name = 'hollow';
    g.add(hollow);
    // Clockwise-from-12 progress arc: thetaStart = +Y (which maps to world -Z
    // = screen up after the -90° X rotation) and a NEGATIVE sweep, so
    // revealing index segments walks 12 -> 3 -> 6 o'clock.
    const fillGeo = new RingGeometry(
      REVIVE_RING.inner,
      REVIVE_RING.outer,
      REVIVE_RING.segments,
      1,
      Math.PI / 2,
      -Math.PI * 2
    );
    const fill = new Mesh(fillGeo, flatMat(PARCH, 1));
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = 0.034;
    fill.renderOrder = -2;
    fill.name = 'fill';
    fill.geometry.setDrawRange(0, 0);
    g.add(fill);
    // Additive twin on the SAME draw range: pushes the filled arc over the
    // bloom threshold so the progress reads as light, not paint (§19.4).
    const fillGlow = new Mesh(fillGeo.clone(), flatMat(PARCH, 0.55, true));
    fillGlow.rotation.x = -Math.PI / 2;
    fillGlow.position.y = 0.036;
    fillGlow.renderOrder = -1;
    fillGlow.name = 'fillGlow';
    fillGlow.geometry.setDrawRange(0, 0);
    g.add(fillGlow);
    // Head-of-arc bead: the moving "now" marker that makes the sweep DIRECTION
    // legible in a single still frame.
    const head = makeGlowSprite({ color: PARCH, size: 0.34, opacity: 0 });
    head.position.y = 0.12;
    head.name = 'head';
    g.add(head);
    const glyph = new Sprite(
      new SpriteMaterial({
        map: getHoldETexture(),
        transparent: true,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      })
    );
    glyph.scale.set(0.42, 0.42, 1);
    glyph.position.set(0, 1.05, 0);
    glyph.renderOrder = 22;
    glyph.name = 'glyph';
    g.add(glyph);
    return g;
  }

  function acquireReviveRig() {
    const g = revivePool.pop() ?? makeReviveRig();
    root.add(g);
    return g;
  }

  // ----------------------------------------------------------- ally zones --
  // §19.4 AoE grammar: layered translucent discs + rim + particles. Party
  // damage family = Parchment core over a Hearth Amber glow.
  const zoneRigs = new Map(); // azone id -> { g, radius, pulseT, moteClock }
  function makeZoneRig(radius) {
    const g = new Group();
    const fill = new Mesh(new CircleGeometry(radius, 36), flatMat(AMBER, 0.14, true));
    fill.rotation.x = -Math.PI / 2;
    fill.renderOrder = -6;
    g.add(fill);
    const inner = new Mesh(new CircleGeometry(radius * 0.5, 28), flatMat(PARCH, 0.16, true));
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.004;
    inner.renderOrder = -6;
    g.add(inner);
    const rim = new Mesh(new RingGeometry(radius * 0.9, radius, 40), flatMat(AMBER, 0.6, true));
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.006;
    rim.renderOrder = -5;
    rim.name = 'rim';
    g.add(rim);
    const halo = makeGlowSprite({ color: AMBER, size: radius * 2.2, opacity: 0.22 });
    halo.position.y = 0.22;
    g.add(halo);
    return g;
  }

  // -------------------------------------------------------------- FX pools --
  const flashes = [];
  const flashPool = [];
  function spawnFlash(x, y, z, { color = PARCH, size = 0.4, opacity = 0.9, life = 0.24, grow = 0.4 } = {}) {
    const s = flashPool.pop() ?? makeGlowSprite({ color, size: 1, opacity });
    s.material.color.set(color);
    s.material.opacity = opacity;
    s.scale.set(size, size, 1);
    s.position.set(x, y, z);
    root.add(s);
    flashes.push({ s, age: 0, life, size, grow, opacity });
  }

  const motes = [];
  const motePool = [];
  function spawnMotes(x, z, { color = AMBER, count = 6, spread = 0.35, y = 0.3 } = {}) {
    for (let i = 0; i < count; i++) {
      const s = motePool.pop() ?? makeGlowSprite({ color, size: 0.16, opacity: 0.9 });
      s.material.color.set(color);
      s.material.opacity = 0.9;
      s.scale.set(0.16, 0.16, 1);
      const a = cosmetic.range(0, Math.PI * 2);
      const r = cosmetic.range(0, spread);
      s.position.set(x + Math.cos(a) * r, y, z + Math.sin(a) * r);
      root.add(s);
      motes.push({
        s,
        age: 0,
        life: cosmetic.range(0.28, 0.6),
        vy: cosmetic.range(0.4, 0.95),
        vx: cosmetic.range(-0.2, 0.2),
        vz: cosmetic.range(-0.2, 0.2),
      });
    }
  }

  const rings = [];
  const ringPool = [];
  function spawnRing(x, z, { from = 0.25, to = 1.2, life = 0.34, opacity = 0.75, color = AMBER } = {}) {
    const m = ringPool.pop() ?? (() => {
      const mm = new Mesh(new RingGeometry(0.87, 1.0, 40), flatMat(AMBER, opacity, true));
      mm.rotation.x = -Math.PI / 2;
      mm.renderOrder = -4;
      return mm;
    })();
    m.material.color.set(color);
    m.material.opacity = opacity;
    m.position.set(x, 0.032, z);
    m.scale.set(from, from, 1);
    root.add(m);
    rings.push({ m, age: 0, life, from, to, opacity });
  }

  // Melee-arc swipe: a wedge sized from the EVENT's reach/half-angle (the sim
  // sends the §7 table row, so nothing is re-typed here), plus a core flash
  // and motes = the three layers §19.4 requires of every attack effect.
  const wedges = [];
  const wedgePool = new Map(); // shape key -> [group, ...]
  const wedgeGeo = new Map(); // shape key -> { fill, rim }
  function wedgeGeometry(key, reach, half) {
    let g = wedgeGeo.get(key);
    if (!g) {
      g = {
        fill: new CircleGeometry(reach, 24, -half, half * 2),
        rim: new RingGeometry(reach * 0.86, reach, 24, 1, -half, half * 2),
      };
      wedgeGeo.set(key, g);
    }
    return g;
  }
  function spawnWedge(ev, reach, halfAngleDeg, opacity) {
    if (!reach || !halfAngleDeg) return;
    const key = `${reach}/${halfAngleDeg}`;
    const half = (halfAngleDeg * Math.PI) / 180;
    // Geometry per distinct §7 arc row is built ONCE and the groups are
    // pooled: three allies swinging several times a second would otherwise
    // allocate and dispose two buffer geometries per swing.
    let pool = wedgePool.get(key);
    if (!pool) {
      pool = [];
      wedgePool.set(key, pool);
    }
    let g = pool.pop();
    if (!g) {
      const geo = wedgeGeometry(key, reach, half);
      g = new Group();
      const fill = new Mesh(geo.fill, flatMat(AMBER, opacity, true));
      fill.rotation.x = -Math.PI / 2;
      fill.renderOrder = -5;
      fill.name = 'fill';
      const rim = new Mesh(geo.rim, flatMat(PARCH, 1, true));
      rim.rotation.x = -Math.PI / 2;
      rim.renderOrder = -4;
      rim.name = 'rim';
      g.add(fill);
      g.add(rim);
    }
    const fill = g.getObjectByName('fill');
    const rim = g.getObjectByName('rim');
    const yaw = Math.atan2(ev.dz, ev.dx);
    fill.rotation.z = -yaw;
    rim.rotation.z = -yaw;
    const rimO = Math.min(1, opacity * 2.1);
    fill.material.opacity = opacity;
    rim.material.opacity = rimO;
    g.position.set(ev.x, 0.038, ev.z);
    root.add(g);
    wedges.push({ g, key, age: 0, life: 0.26, mats: [fill.material, rim.material], o: [opacity, rimO] });
    for (let i = 0; i < 3; i++) {
      const a = yaw + cosmetic.range(-half, half);
      const r = cosmetic.range(0.15, reach);
      spawnMotes(ev.x + Math.cos(a) * r, ev.z + Math.sin(a) * r, { count: 1, spread: 0.05 });
    }
  }

  // ----------------------------------------------------------------- update --
  let lastElapsed = null;
  function update(tSec, alpha = 1) {
    const dt = lastElapsed === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - lastElapsed));
    lastElapsed = tSec;

    // --- ally rigs ride their sim bodies.
    for (const a of allyEntities()) {
      const c = critters.get(a.classId);
      if (!c) continue;
      const st = rigState.get(a.classId);
      const ix = a.px + (a.x - a.px) * alpha;
      const iz = a.pz + (a.z - a.pz) * alpha;
      c.group.position.set(ix, 0, iz);

      if (a.hp > 0 && (a.faceX !== undefined)) {
        let dy = Math.atan2(a.faceX, a.faceZ) - st.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        st.yaw += dy * (1 - Math.exp(-YAW_RATE * dt));
        c.setYaw(st.yaw);
      }

      st.castLeft = Math.max(0, st.castLeft - dt);
      st.hurtLeft = Math.max(0, st.hurtLeft - dt);
      const simSpeed = Math.hypot(a.x - a.px, a.z - a.pz) * TICK_HZ;
      if (a.hp <= 0) c.setAnim('downed');
      else if (st.hurtLeft > 0) c.setAnim('hurt');
      else if (st.castLeft > 0) c.setAnim('cast', st.castLeft > CAST_HOLD - dt * 2 ? CAST_PHASE : undefined);
      else c.setAnim(simSpeed > MOVE_EPS ? 'walk' : 'idle');

      if (!adopted) c.update(dt);
    }

    // --- §8 mark reticle on the marked enemy.
    const markId = allySys.getMark();
    const marked = markId != null ? byId(markId) : null;
    if (marked) {
      markGroup.visible = true;
      const mx = marked.px + (marked.x - marked.px) * alpha;
      const mz = marked.pz + (marked.z - marked.pz) * alpha;
      markGroup.position.set(mx, 0.034, mz);
      markGroup.rotation.y = tSec * 0.8;
      markCaret.position.y = MARK.caretY + 0.08 * Math.sin(tSec * 3.2);
    } else {
      markGroup.visible = false;
    }

    // --- §10 revive furniture on every Downed body.
    const channels = allySys.getChannels();
    const seenRevive = new Set();
    for (const m of world.entities()) {
      if (m.partyIndex === undefined || m.hp > 0) continue;
      seenRevive.add(m.id);
      let g = reviveRigs.get(m.id);
      if (!g) {
        g = acquireReviveRig();
        reviveRigs.set(m.id, g);
      }
      const bx = m.px + (m.x - m.px) * alpha;
      const bz = m.pz + (m.z - m.pz) * alpha;
      g.position.set(bx, 0, bz);
      const ch = channels.get(m.id);
      const frac = ch ? Math.max(0, Math.min(1, ch.progress / REVIVE.channelTicks)) : 0;
      const fill = g.getObjectByName('fill');
      const fillGlow = g.getObjectByName('fillGlow');
      const segs = Math.round(frac * REVIVE_RING.segments);
      fill.geometry.setDrawRange(0, segs * 6);
      fillGlow.geometry.setDrawRange(0, segs * 6);
      fill.material.opacity = ch && ch.draining ? 0.8 : 1;
      fillGlow.material.opacity = (ch && ch.draining ? 0.4 : 0.6) * (frac > 0 ? 1 : 0);
      // Bead at the head of the arc, clockwise from 12 o'clock: world +X is
      // 3 o'clock and world -Z is 12 o'clock, so the head sits at
      // (sin phi, -cos phi) * midRadius.
      const head = g.getObjectByName('head');
      const phi = frac * Math.PI * 2;
      const midR = (REVIVE_RING.inner + REVIVE_RING.outer) / 2;
      head.position.set(Math.sin(phi) * midR, 0.12, -Math.cos(phi) * midR);
      head.material.opacity = frac > 0.005 ? (ch && ch.draining ? 0.5 : 0.95) : 0;
      const hollow = g.getObjectByName('hollow');
      hollow.material.opacity = ch && !ch.draining ? 0.3 : 0.5 + 0.12 * Math.sin(tSec * 4);
      const glyph = g.getObjectByName('glyph');
      // The hold-E prompt is the "nobody is reviving me yet" state; once a
      // channel runs, the filling ring IS the readout.
      glyph.visible = !ch || ch.draining;
      glyph.position.y = 1.05 + 0.06 * Math.sin(tSec * 2.6);
    }
    for (const [id, g] of reviveRigs) {
      if (!seenRevive.has(id)) {
        root.remove(g);
        revivePool.push(g);
        reviveRigs.delete(id);
      }
    }

    // --- ally kit zones synced to sim `azone` entities.
    const seenZones = new Set();
    for (const e of world.entities()) {
      if (e.kind !== 'azone') continue;
      seenZones.add(e.id);
      let rig = zoneRigs.get(e.id);
      if (!rig) {
        rig = { g: makeZoneRig(e.radius), radius: e.radius, pulseT: 0, moteClock: 0 };
        rig.g.position.set(e.x, 0.012, e.z);
        root.add(rig.g);
        zoneRigs.set(e.id, rig);
      }
      rig.pulseT = Math.max(0, rig.pulseT - dt);
      const flare = rig.pulseT / 0.35;
      const rim = rig.g.getObjectByName('rim');
      rim.material.opacity = 0.45 + 0.4 * flare + 0.08 * Math.sin(tSec * 3.1);
      rig.moteClock += dt;
      if (rig.moteClock > 0.35) {
        rig.moteClock = 0;
        spawnMotes(e.x, e.z, { count: 2, spread: rig.radius * 0.85 });
      }
    }
    for (const [id, rig] of zoneRigs) {
      if (!seenZones.has(id)) {
        root.remove(rig.g);
        zoneRigs.delete(id);
      }
    }

    // --- pools tick down.
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.age += dt;
      const k = f.age / f.life;
      if (k >= 1) {
        root.remove(f.s);
        flashPool.push(f.s);
        flashes.splice(i, 1);
        continue;
      }
      const s = f.size * (1 + f.grow * k);
      f.s.scale.set(s, s, 1);
      f.s.material.opacity = f.opacity * (1 - k * k);
    }
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.age += dt;
      if (m.age >= m.life) {
        root.remove(m.s);
        motePool.push(m.s);
        motes.splice(i, 1);
        continue;
      }
      m.s.position.x += m.vx * dt;
      m.s.position.y += m.vy * dt;
      m.s.position.z += m.vz * dt;
      m.s.material.opacity = 0.9 * (1 - m.age / m.life);
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.age += dt;
      const k = r.age / r.life;
      if (k >= 1) {
        root.remove(r.m);
        ringPool.push(r.m);
        rings.splice(i, 1);
        continue;
      }
      const s = r.from + (r.to - r.from) * k;
      r.m.scale.set(s, s, 1);
      r.m.material.opacity = r.opacity * (1 - k);
    }
    for (let i = wedges.length - 1; i >= 0; i--) {
      const w = wedges[i];
      w.age += dt;
      const k = w.age / w.life;
      if (k >= 1) {
        root.remove(w.g);
        wedgePool.get(w.key).push(w.g);
        wedges.splice(i, 1);
        continue;
      }
      for (let j = 0; j < w.mats.length; j++) w.mats[j].opacity = w.o[j] * (1 - k);
    }
  }

  // Screen-space anchor for the §17 revive ring, so a capture can measure the
  // arc against exact pixels instead of a hand-computed projection. Returns
  // the ring centre in canvas px plus the band's horizontal/vertical radii
  // (the ground plane is foreshortened by the 52° rig, so the ring is an
  // ellipse on screen).
  const _v = new Vector3();
  function projectPx(x, y, z) {
    _v.set(x, y, z).project(stage.camera);
    const el = stage.renderer.domElement;
    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;
    return [Math.round(((_v.x + 1) / 2) * w), Math.round(((1 - _v.y) / 2) * h)];
  }

  function reviveRingScreen() {
    const midR = (REVIVE_RING.inner + REVIVE_RING.outer) / 2;
    const out = [];
    for (const [id, g] of reviveRigs) {
      const p = g.position;
      const c = projectPx(p.x, 0.034, p.z);
      const rxp = projectPx(p.x + midR, 0.034, p.z);
      const rzp = projectPx(p.x, 0.034, p.z + midR);
      out.push({
        id,
        cx: c[0],
        cy: c[1],
        rx: Math.abs(rxp[0] - c[0]),
        ry: Math.abs(rzp[1] - c[1]),
        innerU: REVIVE_RING.inner,
        outerU: REVIVE_RING.outer,
        outerPx: Math.abs(projectPx(p.x + REVIVE_RING.outer, 0.034, p.z)[0] - c[0]) * 2,
      });
    }
    return out;
  }

  function debugCounts() {
    return {
      mark: allySys.getMark(),
      reviveRings: reviveRigs.size,
      reviveRingScreen: reviveRingScreen(),
      zones: zoneRigs.size,
      wedges: wedges.length,
      motes: motes.length,
      adopted,
      rigs: [...critters.keys()],
      anims: [...critters.entries()].map(([k, c]) => `${k}:${c.getAnim()}`),
    };
  }

  return { root, update, debugCounts };
}
