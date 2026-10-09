// Gauntlet enemy extras (M4b, BUILD_BRIEF §23.5): the parts of the new enemies
// that are not a body rig —
//   - Mire Toad GLOBS in flight: a murky bulb on a parabolic arc from the
//     thrower to the locked landing point, its Ember ring telegraph on the
//     ground (pooled shapes), a splash on landing
//   - SLICKS: the dark glossy puddle a glob leaves (black-teal, never the heal
//     band), fading in and out on its sim clock
//   - the Grave Mole's DIRT WAKE while it tunnels, and a clod burst when it
//     erupts
//   - the Barrow Ram's BLOCKED beat on every `hit_blocked`: a Bone "BLOCKED"
//     label (the §17 numeral grammar in Bone), a spark tink at the horns and a
//     flare on the rig's guard glow
//   - dust at a quillback's charge start and at a ram's slam
// Render-only: reads sim entities and bus events, never mutates sim state.
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { PALETTE, AFFIX_COLORS, VFX_MATTER } from '../../data/palette.js';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow, exactColor, mix } from '../critters/common.js';
import { sharedGeo } from '../geocache.js';
import { impactFx } from '../vfx/hub.js';
import { HIDE, HEART, TELL_INDIGO, TELL_INDIGO_GLOW } from './style.js';
import { mergeGeometries as mergeRaw } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeGlowSprite } from '../glow.js';
import { t } from '../../i18n/index.js';

// Merge mixed primitives (polyhedra are non-indexed, the rest indexed).
const mergeGeometries = (list) => mergeRaw(list.map((g) => (g.index ? g.toNonIndexed() : g)));
const GLOB_PEAK = 1.7; // u — arc height at mid-flight
const WAKE_STEP = 0.16; // u of tunnelling between dirt clods
const WAKE_LIFE = 1.4; // s
const WAKE_CAP = 70;
const BLOCKED_LIFE = 0.75; // s

// Slick puddle texture: a glossy dark disc with a few pale bubbles (alpha +
// value in one canvas; colour comes from the material).
let slickTex = null;
function getSlickTexture() {
  if (slickTex) return slickTex;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S * 0.48);
  g.addColorStop(0, 'rgba(40,60,64,0.95)');
  g.addColorStop(0.72, 'rgba(24,38,42,0.9)');
  g.addColorStop(1, 'rgba(16,24,28,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S * 0.48, 0, Math.PI * 2);
  ctx.fill();
  // Specular streaks (Parchment, low alpha) — a wet surface, not a stain.
  ctx.strokeStyle = 'rgba(210,222,220,0.3)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const [a0, a1, r] of [[3.6, 4.3, 0.3], [0.5, 0.9, 0.36], [2.2, 2.5, 0.2]]) {
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * r, a0, a1);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(190,210,206,0.45)';
  for (const [x, y, r] of [[0.36, 0.42, 7], [0.6, 0.58, 5], [0.52, 0.34, 4], [0.42, 0.64, 6]]) {
    ctx.beginPath();
    ctx.arc(S * x, S * y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  slickTex = new CanvasTexture(c);
  slickTex.colorSpace = SRGBColorSpace;
  return slickTex;
}

export function createContentExtras({ root, stage, world, bus, cosmetic, shapes }) {
  const globs = new Map(); // glob id -> { g, core, shadow, ring }
  const slicks = new Map(); // slick id -> mesh
  const crystals = new Map(); // crystal slick id -> { g, disc, cluster, glow } (Act IV)
  const shardIds = new Set(); // live Geode shard glob ids (their landing is the director's)
  const tethers = new Map(); // gravewisp id -> beam (slice 2)
  const snares = new Map(); // snare slick id -> { g, disc, teeth, glow, ring } (Barrow Sexton)
  const drinks = new Map(); // siphon id -> { core, halo } (Vein Siphon tether)
  const wake = []; // { mesh, age }
  const wakePool = [];
  const moleTrack = new Map(); // mole id -> { x, z }
  const blocked = []; // { el, x, z, age }
  const blockedPool = [];
  let counters = { blockedBeats: 0, splashes: 0, erupts: 0 };

  // --- glob rig: a murky bulb with a pale sheen + its ground shadow.
  const globCoreGeo = sharedGeo('m4b-glob', () => new IcosahedronGeometry(0.16, 1));
  function makeGlob() {
    const g = new Group();
    const core = new Mesh(globCoreGeo, toonMaterial({ color: HIDE.toadSac.clone().multiplyScalar(0.7) }));
    addInk(core);
    g.add(core);
    const sheen = new Mesh(
      sharedGeo('m4b-glob-sheen', () => new IcosahedronGeometry(0.06, 0)),
      new MeshBasicMaterial({ color: exactColor(PALETTE.parchment), toneMapped: false, transparent: true, opacity: 0.7 })
    );
    sheen.position.set(-0.05, 0.07, 0.05);
    core.add(sheen);
    const shadow = groundShadow(0.2, 0.5);
    return { g, core, shadow };
  }

  // Act IV: a Geode Brute's crystal SHARD in flight — a spinning violet
  // bipyramid with a halo (it is the brute's matter, not a toad's bulb; its
  // Ember ring on the ground stays the warning).
  const shardGeo = sharedGeo('h4-shard', () => mergeGeometries([new ConeGeometry(0.09, 0.26, 4).translate(0, 0.13, 0), new ConeGeometry(0.09, 0.14, 4).rotateX(Math.PI).translate(0, -0.07, 0)]));
  function makeShard() {
    const g = new Group();
    const core = new Mesh(shardGeo, toonMaterial({ color: HEART.crystal, emissive: HEART.vein, emissiveIntensity: 0.7 }));
    addInk(core);
    g.add(core);
    const halo = makeGlowSprite({ color: '#FFFFFF', size: 0.6, opacity: 0.55 });
    halo.material.toneMapped = false;
    halo.material.color.copy(HEART.glow);
    g.add(halo);
    const shadow = groundShadow(0.16, 0.5);
    return { g, core, shadow, shard: true };
  }
  // NEW ENEMIES (docs/WOOD_MILL_ENEMIES.md): the Drowned Miller's sodden
  // flour sack in flight — a lumpy pale bag tied at the neck, tumbling; its
  // Ember ring on the ground stays the warning.
  const sackGeo = sharedGeo('wm-sack', () => new IcosahedronGeometry(0.15, 1));
  const sackTieGeo = sharedGeo('wm-sack-tie', () => new ConeGeometry(0.06, 0.12, 5));
  function makeSack() {
    const g = new Group();
    const core = new Mesh(sackGeo, toonMaterial({ color: new Color(VFX_MATTER.flour).multiplyScalar(0.82) }));
    core.scale.set(1, 1.2, 0.85);
    addInk(core);
    g.add(core);
    const tie = new Mesh(sackTieGeo, toonMaterial({ color: new Color(VFX_MATTER.flour).multiplyScalar(0.6) }));
    tie.position.y = 0.2;
    tie.rotation.x = Math.PI;
    g.add(tie);
    const shadow = groundShadow(0.2, 0.5);
    return { g, core, shadow };
  }
  // ...and the patch it leaves: a jagged cluster of violet crystal punched up
  // through the floor over a dark bruise, never a liquid puddle. It grows in
  // and sinks back on the patch's sim clock.
  const clusterGeo = sharedGeo('h4-crystal-cluster', () => {
    const parts = [];
    const spots = [[0, 0, 0.55, 0.11, 0, 0], [0.42, 0.1, 0.36, 0.08, 0.5, 0.15], [-0.36, 0.22, 0.42, 0.09, -0.45, 0.3], [0.12, -0.45, 0.3, 0.07, 0.15, -0.5], [-0.2, -0.36, 0.26, 0.06, -0.3, -0.45], [0.5, -0.3, 0.22, 0.06, 0.6, -0.3], [-0.55, -0.08, 0.2, 0.05, -0.7, 0], [0.22, 0.5, 0.24, 0.06, 0.25, 0.6]];
    for (const [x, z, h, r, lx, lz] of spots) parts.push(new ConeGeometry(r, h, 4).translate(0, h / 2, 0).rotateX(lz * 0.8).rotateZ(-lx * 0.8).translate(x, 0, z));
    return mergeGeometries(parts);
  });
  function makeCrystalPatch() {
    const g = new Group();
    const disc = makeSlick();
    disc.material.color.copy(HEART.fleshDark).multiplyScalar(1.1);
    disc.position.y = 0.012;
    g.add(disc);
    const cluster = new Mesh(clusterGeo, toonMaterial({ color: HEART.crystal, emissive: HEART.vein, emissiveIntensity: 0.55 }));
    addInk(cluster);
    g.add(cluster);
    const glow = makeGlowSprite({ color: '#FFFFFF', size: 1.6, opacity: 0.25 });
    glow.material.toneMapped = false;
    glow.material.color.copy(HEART.glow);
    glow.position.y = 0.25;
    g.add(glow);
    return { g, disc, cluster, glow };
  }

  // NEW ENEMIES (docs/NEW_ENEMIES_BARROW_HEART.md): a Barrow Sexton's bone
  // SNARE — a ring of grave-bone teeth half buried in a bruise of ash, with
  // a faint indigo glint once it is armed. When it springs the teeth rise and
  // lean in over the Ember ring (pooled shape) until the jaws close.
  const snareTeethGeo = sharedGeo('bh-snare-teeth', () =>
    mergeGeometries(
      Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const h = i % 2 ? 0.22 : 0.3;
        return new ConeGeometry(0.045, h, 4).translate(0, h / 2, 0).rotateX(-0.35).rotateY(a + Math.PI).translate(Math.sin(a) * 0.62, 0, Math.cos(a) * 0.62);
      })
    )
  );
  function makeSnare() {
    const g = new Group();
    const disc = makeSlick();
    disc.material.color.copy(mix(PALETTE.voidCharcoal, PALETTE.warmGrey, 0.35)).multiplyScalar(1.2);
    g.add(disc);
    const teeth = new Mesh(snareTeethGeo, toonMaterial({ color: new Color(PALETTE.bone).multiplyScalar(0.82), emissive: TELL_INDIGO, emissiveIntensity: 0 }));
    addInk(teeth);
    g.add(teeth);
    const glow = makeGlowSprite({ color: '#FFFFFF', size: 1.3, opacity: 0 });
    glow.material.toneMapped = false;
    glow.material.color.copy(TELL_INDIGO_GLOW);
    glow.position.y = 0.08;
    g.add(glow);
    return { g, disc, teeth, glow, ring: null };
  }
  // ...and a Vein Siphon's TETHER while it drinks: a violet vein from the sac
  // to its prey, a pale core inside a soft halo, a gulp running up it.
  function makeDrink() {
    const box = sharedGeo('bh-drink', () => new BoxGeometry(1, 1, 1));
    const core = new Mesh(box, new MeshBasicMaterial({ color: HEART.veinHot.clone(), transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
    const halo = new Mesh(box, new MeshBasicMaterial({ color: HEART.vein.clone(), transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false, blending: AdditiveBlending }));
    const bead = makeGlowSprite({ color: '#FFFFFF', size: 0.45, opacity: 0.8 });
    bead.material.toneMapped = false;
    bead.material.color.copy(HEART.glow);
    return { core, halo, bead };
  }

  function makeSlick() {
    const m = new Mesh(
      sharedGeo('m4b-slick', () => new CircleGeometry(1, 32)),
      new MeshBasicMaterial({
        map: getSlickTexture(),
        color: mix(PALETTE.voidCharcoal, PALETTE.signalBlue, 0.28).multiplyScalar(1.6),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.012;
    m.renderOrder = -3;
    return m;
  }

  function makeClod() {
    const m = new Mesh(
      sharedGeo('m4b-clod-disc', () => new CircleGeometry(0.09, 7)),
      new MeshBasicMaterial({ color: HIDE.earthDark.clone(), transparent: true, opacity: 0.85, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.01;
    m.renderOrder = -4;
    return m;
  }

  // --- BLOCKED label (DOM, the numeral grammar in Bone).
  function makeBlockedEl() {
    const el = document.createElement('div');
    el.className = 'ix-blocked';
    el.textContent = t('BLOCKED');
    el.style.cssText =
      'position:fixed;left:0;top:0;pointer-events:none;z-index:41;font:800 18px/1 system-ui,"Segoe UI",var(--i18n-font, sans-serif);' +
      `letter-spacing:0.08em;color:${PALETTE.bone};text-shadow:2px 0 0 ${PALETTE.voidCharcoal},-2px 0 0 ${PALETTE.voidCharcoal},0 2px 0 ${PALETTE.voidCharcoal},0 -2px 0 ${PALETTE.voidCharcoal};` +
      'transform:translate(-50%,-50%);opacity:0;will-change:transform,opacity;';
    document.body.appendChild(el);
    return el;
  }

  bus.on('hit_blocked', (ev) => {
    const x = ev.x ?? 0;
    const z = ev.z ?? 0;
    const el = blockedPool.pop() ?? makeBlockedEl();
    blocked.push({ el, x, z, age: 0 });
    counters.blockedBeats += 1;
    // Tink: bone sparks off the horn shield.
    impactFx.impact(x, z, { color: PALETTE.bone, n: 7 });
  });
  bus.on('enemy_glob_land', (ev) => {
    if (ev.affix) return; // ELITE AFFIXES: the director draws its burst
    if (shardIds.delete(ev.id)) return; // Act IV: a crystal shard shatters (director)
    counters.splashes += 1;
    impactFx.impact(ev.x, ev.z, { color: mix(PALETTE.sageCloak, PALETTE.signalBlue, 0.5).getHex(), n: 10 });
    impactFx.embers(ev.x, ev.z, { n: 6, radius: 0.5, tall: 1.1 });
  });
  bus.on('enemy_emerge', (ev) => {
    if (ev.etype === 'lamprey') return; // it breaks water, not earth (director)
    counters.erupts += 1;
    impactFx.hit(ev.x, ev.z, { n: 12 });
    impactFx.scorch(ev.x, ev.z, 0.7);
  });
  bus.on('enemy_slam', (ev) => {
    impactFx.hit(ev.x + (ev.dx ?? 0) * 1.1, ev.z + (ev.dz ?? 0) * 1.1, { n: 10 });
    impactFx.scorch(ev.x + (ev.dx ?? 0) * 0.9, ev.z + (ev.dz ?? 0) * 0.9, 0.8);
  });
  bus.on('enemy_charge', (ev) => {
    impactFx.hit(ev.x, ev.z, { n: 6, dir: { x: -(ev.dx ?? 0), z: -(ev.dz ?? 0) } });
  });
  // Content slice 2's beats (knight slam, crab snap, lamprey lunge / beach,
  // thorn planting, wisp tether, the second bosses') are the VFX director's
  // (render/vfx/signature.js, design-VFX.md §5c / §6c).
  bus.on('enemy_charge_end', (ev) => {
    if (ev.cause === 'wall') impactFx.hit(ev.x, ev.z, { n: 9 });
  });

  const pv = new Vector3();
  function toScreen(x, y, z) {
    pv.set(x, y, z).project(stage.camera);
    return { x: (pv.x + 1) * 0.5 * window.innerWidth, y: (1 - pv.y) * 0.5 * window.innerHeight, vis: pv.z < 1 };
  }

  function update(tSec, dt, alpha, rigs, liveTelegraphs) {
    const tick = world.tick;
    const seenG = new Set();
    const seenS = new Set();
    const wisps = [];
    const siphons = [];
    const byId = new Map();
    for (const e of world.entities()) {
      byId.set(e.id, e);
      if (e.kind === 'gravewisp' && e.tetherId != null && e.state === 'active') wisps.push(e);
      if (e.kind === 'siphon' && e.latchId != null && e.state === 'active') siphons.push(e);
      if (e.kind === 'eglob') {
        seenG.add(e.id);
        let r = globs.get(e.id);
        if (!r) {
          r = e.shard ? makeShard() : e.sack ? makeSack() : makeGlob();
          if (e.shard) {
            shardIds.add(e.id);
            if (shardIds.size > 64) shardIds.clear();
          }
          root.add(r.g);
          root.add(r.shadow);
          r.ring = e.telegraph ? shapes.acquire('ring') : null;
          // ELITE AFFIXES: a Molten / Frozen burst swells where it lies (its
          // own visuals are render/enemies/affixes.js); only the ring shows.
          if (e.affix) {
            r.g.visible = false;
            r.shadow.visible = false;
          }
          globs.set(e.id, r);
        }
        const span = Math.max(1, e.landTick - e.startTick);
        const u = Math.min(1, Math.max(0, (tick - 1 + alpha - e.startTick) / span));
        const x = e.fromX + (e.tx - e.fromX) * u;
        const z = e.fromZ + (e.tz - e.fromZ) * u;
        r.g.position.set(x, 0.35 + GLOB_PEAK * 4 * u * (1 - u), z);
        if (r.shard) r.g.rotation.set(0.5, tSec * 9, 0.35 + u * 2.4);
        else r.g.rotation.set(tSec * 5, tSec * 3, 0);
        r.shadow.position.set(x, 0, z);
        r.shadow.scale.setScalar(0.6 + 0.4 * u);
        if (r.ring && e.telegraph) {
          r.ring.set(e.telegraph, tSec, u);
          liveTelegraphs.push(e.telegraph);
        }
      } else if (e.kind === 'slick' && e.variant === 'snare') {
        seenS.add(e.id);
        let n = snares.get(e.id);
        if (!n) {
          n = makeSnare();
          n.g.position.set(e.x, 0, e.z);
          n.g.rotation.y = (e.id * 2.399963) % (Math.PI * 2);
          n.g.scale.setScalar(e.radius);
          root.add(n.g);
          snares.set(e.id, n);
        }
        const inK = Math.min(1, (tick - e.startTick) / 10);
        const armK = Math.min(1, Math.max(0, (tick - e.startTick) / Math.max(1, (e.armTick ?? e.startTick) - e.startTick)));
        const outK = Math.min(1, Math.max(0, (e.untilTick - tick) / 24));
        const armed = tick >= (e.armTick ?? 0);
        let rise = 0;
        if (e.telegraph) {
          const span = Math.max(1, e.telegraph.resolveTick - e.telegraph.startTick);
          rise = Math.min(1, Math.max(0, (tick - 1 + alpha - e.telegraph.startTick) / span));
          if (!n.ring) n.ring = shapes.acquire('ring');
          n.ring.set(e.telegraph, tSec, rise);
          liveTelegraphs.push(e.telegraph);
        } else if (n.ring) {
          shapes.release(n.ring);
          n.ring = null;
        }
        // Buried as it is laid, the tips break the ash as it arms; sprung,
        // the teeth climb and lean in over the jaws' ring.
        n.teeth.position.y = -0.2 + 0.14 * armK * outK + 0.35 * rise;
        n.teeth.scale.set(1 - 0.3 * rise, 1 + 0.9 * rise, 1 - 0.3 * rise);
        n.teeth.rotation.y = 0.4 * rise;
        n.teeth.material.emissiveIntensity = armed ? 0.18 + 0.1 * Math.sin(tSec * 3 + e.id) + 0.8 * rise : 0;
        n.disc.material.opacity = 0.75 * inK * outK;
        n.glow.material.opacity = armed ? (0.12 + 0.06 * Math.sin(tSec * 3 + e.id) + 0.4 * rise) * outK : 0;
      } else if (e.kind === 'slick' && e.variant === 'crystal') {
        seenS.add(e.id);
        let c = crystals.get(e.id);
        if (!c) {
          c = makeCrystalPatch();
          c.g.position.set(e.x, 0, e.z);
          c.g.rotation.y = (e.id * 2.399963) % (Math.PI * 2);
          c.g.scale.setScalar(e.radius);
          root.add(c.g);
          crystals.set(e.id, c);
        }
        const inK = Math.min(1, (tick - e.startTick) / 6);
        const outK = Math.min(1, Math.max(0, (e.untilTick - tick) / 24));
        c.cluster.scale.set(1, Math.max(0.01, (inK < 1 ? 1.15 * inK : 1) * outK), 1);
        c.cluster.position.y = -0.04 * (1 - outK);
        c.disc.material.opacity = 0.7 * Math.min(1, inK * 2) * outK;
        c.cluster.material.emissiveIntensity = 0.5 + 0.08 * Math.sin(tSec * 2.2 + e.id) + 0.6 * (1 - inK);
        c.glow.material.opacity = (0.18 + 0.05 * Math.sin(tSec * 2.2 + e.id)) * outK;
      } else if (e.kind === 'slick') {
        seenS.add(e.id);
        let m = slicks.get(e.id);
        if (!m) {
          m = makeSlick();
          // Slice 2: a thorn patch (Thornling, Thornmother) reads as dark
          // bramble-green, not the toad's black-teal.
          if (e.variant === 'thorn') m.material.color.copy(mix(PALETTE.voidCharcoal, PALETTE.sageCloak, 0.7).multiplyScalar(1.5));
          // The Drowned Miller's wet flour paste: a grey-cream smear.
          if (e.variant === 'flour') m.material.color.set(VFX_MATTER.flour).multiplyScalar(0.8);
          // ELITE AFFIXES: a Frozen patch reads as pale glacier ice, a Molten
          // pool as glowing lava (additive, it lights the floor).
          if (e.variant === 'frost') m.material.color.set(AFFIX_COLORS.frozen).multiplyScalar(1.15);
          if (e.variant === 'molten') {
            m.material.color.set(AFFIX_COLORS.molten).multiplyScalar(1.4);
            m.material.blending = AdditiveBlending;
            m.userData.molten = true;
          }
          m.position.x = e.x;
          m.position.z = e.z;
          m.scale.set(e.radius, e.radius, 1);
          root.add(m);
          slicks.set(e.id, m);
        }
        const inK = Math.min(1, (tick - e.startTick) / 8);
        const outK = Math.min(1, Math.max(0, (e.untilTick - tick) / 30));
        m.material.opacity = (m.userData.molten ? 0.62 + 0.18 * Math.sin(tSec * 7 + e.id) : 0.82) * inK * outK;
        m.rotation.z = tSec * 0.1;
      } else if (e.kind === 'mole') {
        const last = moleTrack.get(e.id);
        if (e.burrowed && e.state === 'active') {
          if (!last) moleTrack.set(e.id, { x: e.x, z: e.z });
          else if (Math.hypot(e.x - last.x, e.z - last.z) >= WAKE_STEP) {
            const m = wakePool.pop() ?? makeClod();
            m.position.set(last.x + cosmetic.range(-0.06, 0.06), 0.01, last.z + cosmetic.range(-0.06, 0.06));
            m.scale.setScalar(cosmetic.range(0.8, 1.35));
            m.material.opacity = 0.85;
            root.add(m);
            wake.push({ mesh: m, age: 0 });
            if (wake.length > WAKE_CAP) {
              const old = wake.shift();
              root.remove(old.mesh);
              wakePool.push(old.mesh);
            }
            last.x = e.x;
            last.z = e.z;
          }
        } else if (last) moleTrack.delete(e.id);
      }
    }
    for (const [id, r] of globs) {
      if (seenG.has(id)) continue;
      root.remove(r.g);
      root.remove(r.shadow);
      if (r.ring) shapes.release(r.ring);
      if (r.shard) {
        r.core.material.dispose();
        r.shadow.material.dispose();
      }
      globs.delete(id);
    }
    for (const [id, m] of slicks) {
      if (seenS.has(id)) continue;
      root.remove(m);
      slicks.delete(id);
    }
    for (const [id, n] of snares) {
      if (seenS.has(id)) continue;
      root.remove(n.g);
      if (n.ring) shapes.release(n.ring);
      n.disc.material.dispose();
      n.teeth.material.dispose();
      n.glow.material.dispose();
      snares.delete(id);
    }
    for (const [id, c] of crystals) {
      if (seenS.has(id)) continue;
      root.remove(c.g);
      c.disc.material.dispose();
      c.cluster.material.dispose();
      c.glow.material.dispose();
      crystals.delete(id);
    }
    // Slice 2: the Grave Wisp's TETHER — a thin pulsing indigo thread from the
    // wisp to the enemy it wards (the director adds the take, the motes
    // running down it, the ward glint and the snap).
    const liveTethers = new Set();
    for (const w of wisps) {
      const t = byId.get(w.tetherId);
      if (!t) continue;
      liveTethers.add(w.id);
      let beam = tethers.get(w.id);
      if (!beam) {
        beam = new Mesh(
          sharedGeo('s2-tether', () => new BoxGeometry(1, 1, 1)),
          new MeshBasicMaterial({ color: exactColor(PALETTE.signalBlue).lerp(exactColor(PALETTE.godstuffViolet), 0.5), transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false })
        );
        root.add(beam);
        tethers.set(w.id, beam);
      }
      const ax = w.x;
      const az = w.z;
      const bx = t.x;
      const bz = t.z;
      const len = Math.hypot(bx - ax, bz - az);
      beam.position.set((ax + bx) / 2, 0.75, (az + bz) / 2);
      beam.rotation.set(0, Math.atan2(bx - ax, bz - az), 0);
      beam.scale.set(0.05, 0.05, Math.max(0.01, len));
      beam.material.opacity = 0.45 + 0.25 * Math.sin(tSec * 9);
    }
    for (const [id, beam] of tethers) {
      if (liveTethers.has(id)) continue;
      root.remove(beam);
      beam.material.dispose();
      tethers.delete(id);
    }
    // NEW ENEMIES: the Vein Siphon's drinking tether, sac to prey, with a
    // bead of what it drinks running up it twice a second.
    const liveDrinks = new Set();
    for (const sp of siphons) {
      const t = byId.get(sp.latchId);
      if (!t) continue;
      liveDrinks.add(sp.id);
      let d = drinks.get(sp.id);
      if (!d) {
        d = makeDrink();
        root.add(d.halo);
        root.add(d.core);
        root.add(d.bead);
        drinks.set(sp.id, d);
      }
      const ax = sp.px + (sp.x - sp.px) * alpha;
      const az = sp.pz + (sp.z - sp.pz) * alpha;
      const bx = t.px + (t.x - t.px) * alpha;
      const bz = t.pz + (t.z - t.pz) * alpha;
      const ay = 0.95;
      const by = 0.55;
      const len = Math.hypot(bx - ax, by - ay, bz - az);
      const yaw = Math.atan2(bx - ax, bz - az);
      const pitch = Math.atan2(ay - by, Math.hypot(bx - ax, bz - az));
      const stretch = Math.min(1, len / 5.6);
      const throb = 0.5 + 0.5 * Math.sin(tSec * Math.PI * 4 + sp.id);
      for (const [m, w] of [[d.core, 0.035], [d.halo, 0.13]]) {
        m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
        m.rotation.set(pitch, yaw, 0, 'YXZ');
        const thin = 1 - 0.55 * stretch; // it thins as the pair pull apart
        m.scale.set(w * thin * (1 + 0.35 * throb), w * thin * (1 + 0.35 * throb), Math.max(0.01, len));
      }
      d.core.material.opacity = 0.75 + 0.2 * throb;
      d.halo.material.opacity = (0.22 + 0.2 * throb) * (1 - 0.4 * stretch);
      const k = (tSec * 2 + sp.id * 0.37) % 1; // prey -> sac
      d.bead.position.set(bx + (ax - bx) * k, by + (ay - by) * k, bz + (az - bz) * k);
      d.bead.material.opacity = 0.85 * Math.sin(k * Math.PI);
    }
    for (const [id, d] of drinks) {
      if (liveDrinks.has(id)) continue;
      root.remove(d.core);
      root.remove(d.halo);
      root.remove(d.bead);
      d.core.material.dispose();
      d.halo.material.dispose();
      d.bead.material.dispose();
      drinks.delete(id);
    }
    for (let i = wake.length - 1; i >= 0; i--) {
      const w = wake[i];
      w.age += dt;
      if (w.age >= WAKE_LIFE) {
        root.remove(w.mesh);
        wakePool.push(w.mesh);
        wake.splice(i, 1);
        continue;
      }
      w.mesh.material.opacity = 0.85 * (1 - w.age / WAKE_LIFE);
    }
    for (let i = blocked.length - 1; i >= 0; i--) {
      const b = blocked[i];
      b.age += dt;
      if (b.age >= BLOCKED_LIFE) {
        b.el.style.opacity = '0';
        blockedPool.push(b.el);
        blocked.splice(i, 1);
        continue;
      }
      const k = b.age / BLOCKED_LIFE;
      const p = toScreen(b.x, 1.25 + 0.6 * k, b.z);
      const s = Math.min(1.4, Math.max(0.8, Math.min(window.innerWidth / 1600, window.innerHeight / 900) * 1.1));
      b.el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%,-50%) scale(${(s * (1 + 0.25 * Math.max(0, 1 - k * 5))).toFixed(3)})`;
      b.el.style.opacity = p.vis ? String(Math.min(1, (1 - k) * 1.6)) : '0';
    }
    void rigs;
  }

  function onTelegraphEnd() {}

  function prewarm() {
    const g = makeGlob();
    g.g.position.set(0, -60, 0);
    root.add(g.g);
    const sl = makeSlick();
    sl.position.set(0, -60, 0);
    sl.material.opacity = 0.001;
    root.add(sl);
    const cl = makeClod();
    cl.position.set(0, -60, 0);
    root.add(cl);
    // Act IV: the crystal shard and its patch.
    const sh = makeShard();
    sh.g.position.set(0, -60, 0);
    root.add(sh.g);
    const cp = makeCrystalPatch();
    cp.g.position.set(0, -60, 0);
    root.add(cp.g);
    setTimeout(() => {
      root.remove(sh.g);
      root.remove(cp.g);
      root.remove(g.g);
      root.remove(sl);
      root.remove(cl);
      wakePool.push(cl);
    }, 250);
    blockedPool.push(makeBlockedEl());
  }

  function debugState() {
    return {
      globs: globs.size,
      slicks: slicks.size + crystals.size + snares.size,
      snares: snares.size,
      drinks: drinks.size,
      moleWake: wake.length,
      blockedLabels: blocked.length,
      ...counters,
    };
  }

  return { update, onTelegraphEnd, prewarm, debugState };
}
