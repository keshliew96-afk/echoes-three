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
  CanvasTexture,
  CircleGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { PALETTE } from '../../data/palette.js';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow, exactColor, mix } from '../critters/common.js';
import { sharedGeo } from '../geocache.js';
import { impactFx } from '../vfx/hub.js';
import { HIDE } from './style.js';

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
    el.textContent = 'BLOCKED';
    el.style.cssText =
      'position:fixed;left:0;top:0;pointer-events:none;z-index:41;font:800 18px/1 system-ui,"Segoe UI",sans-serif;' +
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
    counters.splashes += 1;
    impactFx.impact(ev.x, ev.z, { color: mix(PALETTE.sageCloak, PALETTE.signalBlue, 0.5).getHex(), n: 10 });
    impactFx.embers(ev.x, ev.z, { n: 6, radius: 0.5, tall: 1.1 });
  });
  bus.on('enemy_emerge', (ev) => {
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
    for (const e of world.entities()) {
      if (e.kind === 'eglob') {
        seenG.add(e.id);
        let r = globs.get(e.id);
        if (!r) {
          r = makeGlob();
          root.add(r.g);
          root.add(r.shadow);
          r.ring = e.telegraph ? shapes.acquire('ring') : null;
          globs.set(e.id, r);
        }
        const span = Math.max(1, e.landTick - e.startTick);
        const u = Math.min(1, Math.max(0, (tick - 1 + alpha - e.startTick) / span));
        const x = e.fromX + (e.tx - e.fromX) * u;
        const z = e.fromZ + (e.tz - e.fromZ) * u;
        r.g.position.set(x, 0.35 + GLOB_PEAK * 4 * u * (1 - u), z);
        r.g.rotation.set(tSec * 5, tSec * 3, 0);
        r.shadow.position.set(x, 0, z);
        r.shadow.scale.setScalar(0.6 + 0.4 * u);
        if (r.ring && e.telegraph) {
          r.ring.set(e.telegraph, tSec, u);
          liveTelegraphs.push(e.telegraph);
        }
      } else if (e.kind === 'slick') {
        seenS.add(e.id);
        let m = slicks.get(e.id);
        if (!m) {
          m = makeSlick();
          m.position.x = e.x;
          m.position.z = e.z;
          m.scale.set(e.radius, e.radius, 1);
          root.add(m);
          slicks.set(e.id, m);
        }
        const inK = Math.min(1, (tick - e.startTick) / 8);
        const outK = Math.min(1, Math.max(0, (e.untilTick - tick) / 30));
        m.material.opacity = 0.82 * inK * outK;
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
      globs.delete(id);
    }
    for (const [id, m] of slicks) {
      if (seenS.has(id)) continue;
      root.remove(m);
      slicks.delete(id);
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
    setTimeout(() => {
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
      slicks: slicks.size,
      moleWake: wake.length,
      blockedLabels: blocked.length,
      ...counters,
    };
  }

  return { update, onTelegraphEnd, prewarm, debugState };
}
