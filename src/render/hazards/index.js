// Hazard render layer (M4b, BUILD_BRIEF §23.6): the five hazards drawn from
// sim entity state, read-only. Idle states live in the biome palette and NEVER
// in the Ember band; every damaging phase is announced by an Ember telegraph
// from the shared pooled shapes (render/enemies/shapes.js) that runs for the
// hazard's whole wind-up, with a progress sweep so time-to-impact reads off a
// still frame.
//   bramble    a dark indigo-green thorn tangle: painted ground mat + raked
//              twig/thorn clusters that shiver when a body pushes through
//   puffcap    a pale fungus cluster (Bone caps, cool spots) that breathes;
//              SWELLS through its telegraph (caps inflate, Ember ring r 1.3),
//              bursts in a spore cloud, sags through its cooldown
//   millrace   a black-teal water lane between stone curbs, Parchment flow
//              streaks scrolling downstream; the surge telegraph lights the lane
//              Ember with chevrons marching along the flow; the surge whitens
//              it; a stopped race goes glassy and still
//   rockfall   dust sifting from the dark overhead (falling motes), an Ember
//              ring under the target, a rock that drops in the last third of the
//              wind-up, then RUBBLE (a rock pile with a contact shadow)
//   gravefire  cracked grave slabs with a faint AMBER glow in the cracks (not
//              Ember); each vent's Ember glyph ring runs 54 ticks, then an
//              Ember fire column erupts for 12
import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from '../../data/palette.js';
import { toonMaterial } from '../toon.js';
import { makeGlowSprite } from '../glow.js';
import { sharedGeo, markShared, releaseTree } from '../geocache.js';
import { addInk, groundShadow, exactColor, mix } from '../critters/common.js';
import { impactFx } from '../vfx/hub.js';
import { createTelegraphShapes } from '../enemies/shapes.js';
import { EMBER_EXACT } from '../enemies/style.js';
import { makeFlameSprite } from '../../env/flame.js';
import { hslColor } from '../../env/colors.js';
import { warmPark } from '../warmup.js';

const TICK_HZ = 60;

// ---------------------------------------------------------------- palette --
const THORN = hslColor(182, 0.3, 0.13); // dark indigo-green (never the heal band)
const THORN_LIT = hslColor(176, 0.26, 0.2);
const THORN_TIP = hslColor(210, 0.2, 0.52); // pale cool thorn points
const CAP = new Color(PALETTE.bone).multiplyScalar(0.96);
const CAP_DARK = new Color(PALETTE.bone).lerp(new Color(PALETTE.warmGrey), 0.55).multiplyScalar(0.62);
const CAP_SPOT = hslColor(214, 0.22, 0.34);
const STALK = new Color(PALETTE.bone).lerp(new Color(PALETTE.warmGrey), 0.3).multiplyScalar(0.8);
const STONE = hslColor(214, 0.08, 0.32);
const STONE_DARK = hslColor(214, 0.1, 0.19);
const CRACK_AMBER = mix(PALETTE.hearthAmber, PALETTE.paleGold, 0.5).multiplyScalar(0.62);

let sharedTex = {};
function tex(key, size, draw) {
  if (sharedTex[key]) return sharedTex[key];
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  sharedTex[key] = t;
  return t;
}

// Tangle mat: dark scribbled thorn runners with a soft edge (alpha + value).
function brambleTex() {
  return tex('bramble', 256, (ctx, S) => {
    const c = S / 2;
    const g = ctx.createRadialGradient(c, c, S * 0.1, c, c, S * 0.49);
    g.addColorStop(0, 'rgba(255,255,255,0.72)');
    g.addColorStop(0.8, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, S * 0.49, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'round';
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.55 + rnd() * 0.45})`;
      ctx.lineWidth = 2 + rnd() * 3;
      let x = c + (rnd() - 0.5) * S * 0.7;
      let y = c + (rnd() - 0.5) * S * 0.7;
      let a = rnd() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        a += (rnd() - 0.5) * 1.6;
        x += Math.cos(a) * 14;
        y += Math.sin(a) * 14;
        if (Math.hypot(x - c, y - c) > S * 0.46) break;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
}

// Water lane shader: black-teal body, drifting Parchment streaks, edge foam.
function makeWaterMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uT: { value: 0 },
      uFlow: { value: 1.3 },
      uLen: { value: 8 },
      uSurge: { value: 0 },
      uStill: { value: 0 },
      uDeep: { value: hslColor(194, 0.45, 0.075) },
      uLit: { value: hslColor(190, 0.4, 0.16) },
      uFoam: { value: new Color(PALETTE.parchment) },
    },
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uT;
      uniform float uFlow;
      uniform float uLen;
      uniform float uSurge;
      uniform float uStill;
      uniform vec3 uDeep;
      uniform vec3 uLit;
      uniform vec3 uFoam;
      varying vec2 vUv;
      float hash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
      float noise( vec2 p ) {
        vec2 i = floor( p ); vec2 f = fract( p );
        vec2 u = f * f * ( 3.0 - 2.0 * f );
        return mix( mix( hash( i ), hash( i + vec2( 1, 0 ) ), u.x ), mix( hash( i + vec2( 0, 1 ) ), hash( i + vec2( 1, 1 ) ), u.x ), u.y );
      }
      void main() {
        float along = vUv.x * uLen;            // world u along the flow
        float across = abs( vUv.y - 0.5 ) * 2.0; // 0 = centre, 1 = bank
        float speed = mix( uFlow, 0.0, uStill );
        float s = along - uT * speed;
        // Body: deep centre, a lighter band toward the banks.
        vec3 col = mix( uDeep, uLit, smoothstep( 0.2, 1.0, across ) * 0.7 );
        // Flow streaks: stretched noise bands scrolling downstream.
        float n = noise( vec2( s * 1.3, vUv.y * 9.0 ) );
        float streak = smoothstep( 0.72, 0.9, n ) * ( 1.0 - across * 0.6 );
        float glassy = uStill * 0.6;
        col = mix( col, uFoam, streak * ( 0.22 - glassy * 0.18 ) );
        // Bank foam line + surge whitewater.
        float foam = smoothstep( 0.78, 0.97, across ) * ( 0.25 + 0.2 * noise( vec2( s * 3.0, 4.0 ) ) );
        // Surge whitewater: streaks stretched along the flow (not blobs), <= 30%.
        float white = uSurge * smoothstep( 0.5, 0.85, noise( vec2( s * 1.1, vUv.y * 11.0 + uT ) ) );
        col = mix( col, uFoam, clamp( foam * ( 1.0 - uStill ) + white * 0.3, 0.0, 0.5 ) );
        float a = 1.0 - smoothstep( 0.96, 1.0, across );
        gl_FragColor = vec4( col, a * 0.96 );
      }
    `,
  });
}

// ------------------------------------------------------------------ rigs --
function buildBramble(h) {
  const g = new Group();
  const mat = new Mesh(
    sharedGeo('hz-unit-disc', () => new CircleGeometry(1, 32)),
    new MeshBasicMaterial({ map: brambleTex(), color: THORN, transparent: true, opacity: 0.92, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
  );
  mat.rotation.x = -Math.PI / 2;
  mat.position.y = 0.011;
  mat.scale.set(h.radius, h.radius, 1);
  mat.renderOrder = -6;
  g.add(mat);
  // Twig + thorn clusters (merged: one draw for twigs, one for tips).
  const twigs = sharedGeo('hz-twigs', () => {
    const parts = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      const r = 0.25 + (i % 3) * 0.2;
      parts.push(
        new CylinderGeometry(0.018, 0.03, 0.42, 4)
          .rotateZ(0.9 + (i % 2) * 0.4)
          .rotateY(a)
          .translate(Math.cos(a) * r, 0.12, Math.sin(a) * r)
      );
      parts.push(
        new CylinderGeometry(0.014, 0.022, 0.3, 4)
          .rotateX(0.8 - (i % 3) * 0.3)
          .rotateY(a + 1.2)
          .translate(Math.cos(a + 0.4) * (r * 0.8), 0.1, Math.sin(a + 0.4) * (r * 0.8))
      );
    }
    return mergeGeometries(parts);
  });
  const tips = sharedGeo('hz-thorns', () => {
    const parts = [];
    for (let i = 0; i < 22; i++) {
      const a = i * 2.39996;
      const r = 0.15 + ((i * 37) % 10) / 14;
      parts.push(new ConeGeometry(0.022, 0.1, 4).rotateZ(((i % 5) - 2) * 0.5).translate(Math.cos(a) * r, 0.14 + (i % 3) * 0.05, Math.sin(a) * r));
    }
    return mergeGeometries(parts);
  });
  const twigMesh = new Mesh(twigs, toonMaterial({ color: THORN_LIT }));
  twigMesh.scale.setScalar(h.radius / 1.1);
  addInk(twigMesh);
  g.add(twigMesh);
  const tipMesh = new Mesh(tips, toonMaterial({ color: THORN_TIP }));
  tipMesh.scale.setScalar(h.radius / 1.1);
  g.add(tipMesh);
  return {
    group: g,
    update(e, tSec, ctx) {
      // Shiver while a body pushes through the tangle.
      const k = ctx.bodiesInside(e) ? 1 : 0;
      twigMesh.rotation.y = 0.03 * k * Math.sin(tSec * 22);
      tipMesh.rotation.y = twigMesh.rotation.y;
    },
  };
}

function buildPuffcap(h) {
  const g = new Group();
  const caps = [];
  const capMat = toonMaterial({ color: CAP, emissive: '#FFFFFF', emissiveIntensity: 0 });
  const underMat = toonMaterial({ color: CAP_DARK });
  const stalkMat = toonMaterial({ color: STALK });
  const spotMat = toonMaterial({ color: CAP_SPOT });
  const capG = sharedGeo('hz-cap', () => new SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2));
  const gillG = sharedGeo('hz-gill', () => new CircleGeometry(0.19, 10).rotateX(Math.PI / 2));
  const stalkG = sharedGeo('hz-stalk', () => new CylinderGeometry(0.05, 0.07, 0.24, 6));
  const spotG = sharedGeo('hz-spot', () => new SphereGeometry(0.035, 5, 4));
  for (const [x, z, s] of [[0, 0, 1.0], [0.2, 0.12, 0.7], [-0.16, 0.14, 0.62], [0.06, -0.2, 0.55]]) {
    const p = new Group();
    p.position.set(x, 0, z);
    const stalk = new Mesh(stalkG, stalkMat);
    stalk.position.y = 0.12 * s;
    stalk.scale.set(s, s, s);
    addInk(stalk);
    p.add(stalk);
    const cap = new Group();
    cap.position.y = 0.23 * s;
    const top = new Mesh(capG, capMat);
    top.scale.set(s, s * 0.8, s);
    addInk(top);
    cap.add(top);
    const gill = new Mesh(gillG, underMat);
    gill.scale.set(s, 1, s);
    cap.add(gill);
    for (let i = 0; i < 4; i++) {
      const sp = new Mesh(spotG, spotMat);
      const a = i * 1.7 + x * 5;
      sp.position.set(Math.cos(a) * 0.11 * s, 0.1 * s, Math.sin(a) * 0.11 * s);
      sp.scale.setScalar(s);
      cap.add(sp);
    }
    p.add(cap);
    g.add(p);
    caps.push({ cap, s });
  }
  g.add(groundShadow(0.36, 0.6));
  let tele = null;
  let wasPhase = 'idle';
  return {
    group: g,
    update(e, tSec, ctx) {
      const tick = ctx.tick;
      if (e.phase === 'telegraph') {
        if (!tele) tele = ctx.shapes.acquire('ring');
        const span = Math.max(1, e.resolveTick - (e.telegraphStartTick ?? e.resolveTick - 60));
        const prog = Math.min(1, Math.max(0, (tick - (e.resolveTick - span)) / span));
        tele.set({ x: e.x, z: e.z, radius: e.blastRadius }, tSec, prog);
        ctx.live.push({ x: e.x, z: e.z });
        const sw = 1 + 0.55 * prog + 0.05 * Math.sin(tSec * 30) * prog;
        for (const c of caps) c.cap.scale.setScalar(sw);
        capMat.emissiveIntensity = 0.12 * prog;
      } else {
        if (tele) {
          ctx.shapes.release(tele);
          tele = null;
        }
        const sag = e.phase === 'cooldown' ? 0.7 : 1;
        const breathe = 1 + 0.03 * Math.sin(tSec * 1.6 + e.id);
        for (const c of caps) c.cap.scale.setScalar(sag * breathe);
        capMat.emissiveIntensity = 0;
      }
      if (wasPhase === 'telegraph' && e.phase === 'cooldown') {
        // Spore burst: a pale cloud + debris (the burst itself, not a telegraph).
        impactFx.hit(e.x, e.z, { color: PALETTE.bone, scale: 1.6 });
        impactFx.impact(e.x, e.z, { color: PALETTE.bone, n: 12 });
        impactFx.embers(e.x, e.z, { color: PALETTE.bone, n: 10, radius: 1.0, tall: 1.2 });
      }
      wasPhase = e.phase;
    },
    dispose(ctx) {
      if (tele) ctx.shapes.release(tele);
    },
  };
}

function buildMillrace(h) {
  const g = new Group();
  const lane = h.lane;
  const len = h.len;
  const mat = makeWaterMaterial();
  mat.uniforms.uLen.value = len;
  const water = new Mesh(sharedGeo('hz-water-quad', () => new PlaneGeometry(1, 1)), mat);
  water.rotation.x = -Math.PI / 2;
  water.scale.set(len, lane.w, 1);
  water.position.y = 0.009;
  water.renderOrder = -7;
  const spin = new Group();
  spin.position.set(h.x, 0, h.z);
  spin.rotation.y = Math.atan2(h.dirX, h.dirZ) - Math.PI / 2;
  spin.add(water);
  // Stone curbs along both banks (the lane reads as a built channel).
  const curbMat = toonMaterial({ color: STONE });
  // fix-CAMPAIGN-r6 (GC.6): the box is a unit length scaled per lane — one
  // shared copy (the length-keyed cache minted an identical box per lane length).
  const curbG = sharedGeo('hz-curb', () => new BoxGeometry(1, 0.1, 0.16));
  for (const side of [-1, 1]) {
    const c = new Mesh(curbG, curbMat);
    c.scale.x = len;
    c.position.set(0, 0.05, side * (lane.w / 2 + 0.06));
    addInk(c);
    spin.add(c);
  }
  g.add(spin);
  let tele = null;
  return {
    group: g,
    update(e, tSec, ctx) {
      const tick = ctx.tick;
      const stopped = tick < (e.stoppedUntilTick ?? 0);
      mat.uniforms.uT.value = tSec;
      mat.uniforms.uStill.value += ((stopped ? 1 : 0) - mat.uniforms.uStill.value) * 0.08;
      mat.uniforms.uSurge.value += ((e.phase === 'active' ? 1 : 0) - mat.uniforms.uSurge.value) * 0.25;
      mat.uniforms.uFlow.value = e.phase === 'active' ? 3.0 : 1.3;
      if (e.phase === 'telegraph' && !stopped) {
        if (!tele) tele = ctx.shapes.acquire('lane');
        const span = Math.max(1, e.resolveTick - (e.telegraphStartTick ?? e.resolveTick - 60));
        const prog = Math.min(1, Math.max(0, (tick - (e.resolveTick - span)) / span));
        tele.set({ fromX: lane.x0, fromZ: lane.z0, x: lane.x1, z: lane.z1, width: lane.w * 0.94 }, tSec, prog);
        tele.showColumn(false);
        ctx.live.push({ x: e.x, z: e.z });
      } else if (tele) {
        ctx.shapes.release(tele);
        tele = null;
      }
    },
    dispose(ctx) {
      if (tele) ctx.shapes.release(tele);
    },
  };
}

function buildRockfall() {
  const g = new Group();
  const rockMat = toonMaterial({ color: STONE, emissive: '#FFFFFF', emissiveIntensity: 0 });
  const rock = new Mesh(sharedGeo('hz-rock', () => new IcosahedronGeometry(0.34, 0)), rockMat);
  addInk(rock);
  rock.visible = false;
  g.add(rock);
  const shadow = groundShadow(0.5, 0.0);
  g.add(shadow);
  let tele = null;
  let dustDebt = 0;
  return {
    group: g,
    update(e, tSec, ctx, dt) {
      const tick = ctx.tick;
      // Idle: dust sifting from the dark overhead, a few motes a second.
      dustDebt += dt * 2.2;
      while (dustDebt >= 1) {
        dustDebt -= 1;
        ctx.dust();
      }
      const t = e.telegraph;
      if (t) {
        if (!tele) tele = ctx.shapes.acquire('ring');
        const span = Math.max(1, t.resolveTick - t.startTick);
        const prog = Math.min(1, Math.max(0, (tick - t.startTick) / span));
        tele.set(t, tSec, prog);
        tele.showColumn(false);
        ctx.live.push(t);
        // The rock drops through the last third of the wind-up; its shadow
        // grows under it from the start.
        g.position.set(t.x, 0, t.z);
        shadow.material.opacity = 0.2 + 0.5 * prog;
        shadow.scale.setScalar(0.6 + 0.5 * prog);
        const fall = Math.max(0, (prog - 0.66) / 0.34);
        rock.visible = fall > 0;
        rock.position.y = 7 * (1 - fall * fall) + 0.2;
        rock.rotation.set(tSec * 3, tSec * 2, 0);
        if (ctx.cosmetic.chance(0.25)) impactFx.embers(t.x, t.z, { color: PALETTE.bone, n: 1, radius: 0.8, tall: 0.35 });
      } else {
        if (tele) {
          ctx.shapes.release(tele);
          tele = null;
        }
        rock.visible = false;
        shadow.material.opacity = 0;
      }
    },
    dispose(ctx) {
      if (tele) ctx.shapes.release(tele);
    },
  };
}

function buildRubble(e) {
  const g = new Group();
  const pile = sharedGeo('hz-rubble', () =>
    mergeGeometries([
      new IcosahedronGeometry(0.3, 0).scale(1, 0.62, 1).translate(0, 0.16, 0),
      new IcosahedronGeometry(0.2, 0).scale(1, 0.7, 1).translate(0.3, 0.1, 0.12),
      new IcosahedronGeometry(0.17, 0).scale(1, 0.6, 1).translate(-0.28, 0.08, -0.1),
      new IcosahedronGeometry(0.13, 0).translate(0.06, 0.08, -0.32),
      new IcosahedronGeometry(0.12, 0).translate(-0.1, 0.07, 0.3),
    ])
  );
  const m = new Mesh(pile, toonMaterial({ color: STONE }));
  addInk(m);
  g.add(m);
  const chips = new Mesh(
    sharedGeo('hz-rubble-chips', () => mergeGeometries([0, 1, 2, 3, 4, 5].map((i) => new IcosahedronGeometry(0.05, 0).translate(Math.cos(i) * 0.5, 0.03, Math.sin(i * 1.3) * 0.48)))),
    toonMaterial({ color: STONE_DARK })
  );
  g.add(chips);
  g.add(groundShadow(0.62, 0.8, { forward: 0.12, wide: 1.1, deep: 1.0 }));
  g.position.set(e.x, 0, e.z);
  return {
    group: g,
    update(ent, tSec, ctx) {
      const born = Math.min(1, (ctx.tick - ent.startTick) / 6);
      const left = (ent.untilTick - ctx.tick) / 30;
      const s = born * Math.min(1, Math.max(0.2, left));
      g.scale.set(s, s, s);
    },
  };
}

function buildGravefire(h) {
  const g = new Group();
  const vents = [];
  const slabG = sharedGeo('hz-slab', () => new BoxGeometry(0.95, 0.12, 0.62));
  const crackG = sharedGeo('hz-slab-crack', () =>
    mergeGeometries([
      new BoxGeometry(0.5, 0.02, 0.04).rotateY(0.5).translate(0.05, 0.125, 0.02),
      new BoxGeometry(0.3, 0.02, 0.035).rotateY(-0.8).translate(-0.18, 0.125, -0.08),
      new BoxGeometry(0.22, 0.02, 0.03).rotateY(1.4).translate(0.26, 0.125, -0.12),
    ])
  );
  const slabMat = toonMaterial({ color: STONE });
  const crackMat = new MeshBasicMaterial({ color: CRACK_AMBER, toneMapped: false });
  for (let i = 0; i < h.vents.length; i++) {
    const v = h.vents[i];
    const p = new Group();
    p.position.set(v.x, 0, v.z);
    p.rotation.y = (i * 0.7 + h.id) % 3;
    const slab = new Mesh(slabG, slabMat);
    addInk(slab);
    p.add(slab);
    p.add(new Mesh(crackG, crackMat));
    const warm = makeGlowSprite({ color: PALETTE.hearthAmber, size: 0.7, opacity: 0.18 });
    warm.position.y = 0.2;
    p.add(warm);
    // The column: Ember-tinted flame billboards + a hot core + halo.
    const col = new Group();
    col.visible = false;
    const flames = [];
    for (let k = 0; k < 3; k++) {
      const f = makeFlameSprite(1.25 - k * 0.25, 1, 0.96);
      f.material.color.copy(EMBER_EXACT).lerp(new Color('#FFFFFF'), 0.12 + k * 0.1);
      f.position.set((k - 1) * 0.12, 0.6 - k * 0.08, 0.05 * k);
      col.add(f);
      flames.push(f);
    }
    const halo = makeGlowSprite({ color: PALETTE.emberDanger, size: 1.6, opacity: 0.5 });
    halo.material.color.copy(EMBER_EXACT);
    halo.material.toneMapped = false;
    halo.position.y = 0.4;
    col.add(halo);
    p.add(col);
    g.add(p);
    vents.push({ p, warm, col, flames, halo, tele: null, was: 'idle' });
  }
  return {
    group: g,
    update(e, tSec, ctx) {
      const tick = ctx.tick;
      e.vents.forEach((v, i) => {
        const r = vents[i];
        if (!r) return;
        r.warm.material.opacity = 0.14 + 0.05 * Math.sin(tSec * 1.3 + i);
        if (v.phase === 'telegraph') {
          if (!r.tele) r.tele = ctx.shapes.acquire('ring');
          const t0 = (v.phaseUntilTick ?? tick) - 54;
          const prog = Math.min(1, Math.max(0, (tick - t0) / 54));
          r.tele.set({ x: v.x, z: v.z, radius: 0.7 }, tSec, prog);
          ctx.live.push(v);
          r.warm.material.opacity = 0.2 + 0.25 * prog;
        } else if (r.tele) {
          ctx.shapes.release(r.tele);
          r.tele = null;
        }
        const on = v.phase === 'active';
        r.col.visible = on;
        if (on) {
          const n = Math.sin(tSec * 31 + i) * 0.5 + Math.sin(tSec * 17) * 0.3;
          r.flames.forEach((f, k) => {
            const hgt = (1.25 - k * 0.25) * (1 + 0.18 * n);
            f.scale.set(hgt * 0.62, hgt, 1);
          });
          r.halo.material.opacity = 0.42 + 0.12 * n;
          if (r.was !== 'active') {
            impactFx.embers(v.x, v.z, { n: 12, radius: 0.5, tall: 2.0 });
            impactFx.scorch(v.x, v.z, 0.7);
          }
        }
        r.was = v.phase;
      });
    },
    dispose(ctx) {
      for (const r of vents) if (r.tele) ctx.shapes.release(r.tele);
    },
  };
}

const BUILD = { bramble: buildBramble, puffcap: buildPuffcap, millrace: buildMillrace, rockfall: buildRockfall, gravefire: buildGravefire };

// ------------------------------------------------------------------ layer --
export function createHazardLayer({ stage, world, bus, cosmetic }) {
  const root = new Group();
  root.name = 'hazardfx';
  stage.scene.add(root);
  const shapes = createTelegraphShapes(root);
  const rigs = new Map(); // entity id -> rig
  const dustPool = [];
  const dust = [];
  let lastT = null;

  // Falling dust motes (rockfall idle): tiny pale sprites drifting down.
  function spawnDust() {
    let s = dustPool.pop();
    if (!s) {
      s = makeGlowSprite({ color: PALETTE.bone, size: 0.09, opacity: 0.6 });
      s.material.toneMapped = false;
      root.add(s);
    }
    s.visible = true;
    const p = world.player;
    s.position.set(p.x + cosmetic.range(-7, 7), cosmetic.range(2.2, 3.4), p.z + cosmetic.range(-5, 4));
    dust.push({ s, vy: cosmetic.range(0.5, 0.9), age: 0 });
  }

  function bodiesInside(h) {
    for (const e of world.entities()) {
      if (e.partyIndex === undefined && e.faction !== 'hostile') continue;
      if (!(e.hp > 0) || e.flier || e.burrowed) continue;
      if (Math.hypot(e.x - h.x, e.z - h.z) <= h.radius) {
        const moved = Math.hypot(e.x - e.px, e.z - e.pz) > 1e-4;
        if (moved) return true;
      }
    }
    return false;
  }

  function update(tSec) {
    const dt = lastT === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - lastT));
    lastT = tSec;
    const ctx = { tick: world.tick, shapes, live: [], dust: spawnDust, bodiesInside, cosmetic };
    const seen = new Set();
    for (const e of world.entities()) {
      if (e.kind !== 'hazard' && e.kind !== 'rubble') continue;
      seen.add(e.id);
      let r = rigs.get(e.id);
      if (!r) {
        r = e.kind === 'rubble' ? buildRubble(e) : BUILD[e.htype] ? BUILD[e.htype](e) : null;
        if (!r) continue;
        if (e.kind === 'hazard' && e.htype !== 'millrace' && e.htype !== 'rockfall' && e.htype !== 'gravefire') r.group.position.set(e.x, 0, e.z);
        rigs.set(e.id, r);
        root.add(r.group);
      }
      r.update(e, tSec, ctx, dt);
    }
    for (const [id, r] of rigs) {
      if (seen.has(id)) continue;
      if (r.dispose) r.dispose(ctx);
      root.remove(r.group);
      releaseTree(r.group);
      rigs.delete(id);
    }
    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i];
      d.age += dt;
      d.s.position.y -= d.vy * dt;
      d.s.material.opacity = 0.55 * Math.min(1, d.age * 3) * Math.min(1, d.s.position.y / 0.6);
      if (d.s.position.y <= 0.02) {
        d.s.visible = false;
        dustPool.push(d.s);
        dust.splice(i, 1);
      }
    }
    // Ember motes over live hazard telegraphs (the particle layer of §19.4).
    for (const l of ctx.live) if (cosmetic.chance(0.35)) impactFx.embers(l.x, l.z, { n: 1, radius: 0.5, tall: 1.6 });
  }

  // Boot warm-up: one of each hazard rig drawn once (programs linked in camp).
  let warmed = false;
  function prewarm() {
    if (warmed) return;
    warmed = true;
    const fake = {
      bramble: { radius: 1 },
      puffcap: { radius: 0.35, blastRadius: 1.3 },
      millrace: { x: 0, z: 0, len: 4, dirX: 1, dirZ: 0, lane: { x0: -2, z0: 0, x1: 2, z1: 0, w: 1.4 } },
      rockfall: {},
      gravefire: { id: 0, vents: [{ x: 0, z: 0 }] },
    };
    for (const [k, f] of Object.entries(fake)) warmPark(root, BUILD[k](f).group);
    warmPark(root, buildRubble({ x: 0, z: 0 }).group);
    const back = shapes.prewarm();
    setTimeout(back, 250);
  }
  let frames = 0;
  const tick = (tSec) => {
    if (!warmed && ++frames > 14) prewarm();
    update(tSec);
  };

  function debugState() {
    const byType = {};
    for (const e of world.entities()) if (e.kind === 'hazard') byType[e.htype] = (byType[e.htype] || 0) + 1;
    return { hazardRigs: rigs.size, byType, dust: dust.length, shapes: shapes.stats() };
  }

  void bus;
  // @gnt:M2 RESTORE-RESYNC begin — a load replaces the registry: hazard and
  // rubble rigs are keyed by entity id (and built per htype), so every rig
  // is released exactly as the reconcile releases an unseen id; update()
  // rebuilds what the restored sim holds on the next frame.
  if (bus && typeof bus.on === 'function') {
    bus.on('state_restored', () => {
      const ctx = { tick: world.tick, shapes, live: [], dust: spawnDust, bodiesInside, cosmetic };
      for (const r of rigs.values()) {
        if (r.dispose) r.dispose(ctx);
        root.remove(r.group);
        releaseTree(r.group);
      }
      rigs.clear();
    });
  }
  // @gnt:M2 RESTORE-RESYNC end
  return { update: tick, debugState, root };
}
