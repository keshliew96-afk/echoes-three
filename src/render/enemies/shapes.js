// Ember telegraph SHAPES for the Gauntlet content (BUILD_BRIEF §23.5 / §23.6,
// docs/gauntlet/PLAN.md §4.5): one visual grammar for every avoidable attack
// that is not the mantis shot — the quillback / moth LANE, the toad / mole /
// rockfall RING, the ram CONE, the gravefire glyph ring and the millrace surge
// lane. Same rules as the certified mantis telegraph (render/enemies/
// telegraphs.js): post-chain-exact Ember #FF5A36, NORMAL-blended (an additive
// red over a green floor hue-shifts out of the danger band), a dark scorched
// core under the rim, chevrons as the colour-blind fence (danger is decal +
// chevron, never colour alone), a 2 Hz opacity pulse carried by the halo while
// the hue-bearing decal stays 0.78-1.0, and a progress channel (bead / sweep)
// so time-to-impact reads off a still frame.
//
// POOLED: every shape is built once per concurrent use and recycled, never
// disposed, so its ShaderMaterial program stays linked for the session (the
// render/warmup.js anchor rule — a disposed telegraph re-links its program on
// the next wind-up, a 33-45 ms command-buffer drain measured in round 3).
import {
  BackSide,
  CanvasTexture,
  CircleGeometry,
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { exactColor } from '../critters/common.js';
import { EMBER_EXACT } from './style.js';

export const PULSE_HZ = 2;
const SCORCH = exactColor(PALETTE.voidCharcoal);

function canvasTexture(draw, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

// Ring rim: heavy outer ring, thin wash, 8 inward chevrons (alpha-only).
let rimTex = null;
function getRimTexture() {
  if (rimTex) return rimTex;
  rimTex = canvasTexture((ctx, S) => {
    const c = S / 2;
    const A = (a) => `rgba(255,255,255,${a})`;
    ctx.fillStyle = A(0.12);
    ctx.beginPath();
    ctx.arc(c, c, S * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = A(1);
    ctx.lineWidth = S * 0.075;
    ctx.beginPath();
    ctx.arc(c, c, S * 0.44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = S * 0.03;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const w = 0.09;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a0 - w) * S * 0.39, c + Math.sin(a0 - w) * S * 0.39);
      ctx.lineTo(c + Math.cos(a0) * S * 0.31, c + Math.sin(a0) * S * 0.31);
      ctx.lineTo(c + Math.cos(a0 + w) * S * 0.39, c + Math.sin(a0 + w) * S * 0.39);
      ctx.stroke();
    }
  }, 512);
  return rimTex;
}

// Scorched core (dark, radial cracks) — drawn UNDER the rim.
let coreTex = null;
function getCoreTexture() {
  if (coreTex) return coreTex;
  coreTex = canvasTexture((ctx, S) => {
    const c = S / 2;
    const g = ctx.createRadialGradient(c, c, S * 0.03, c, c, S * 0.44);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.62, 'rgba(255,255,255,0.72)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, S * 0.44, 0, Math.PI * 2);
    ctx.fill();
  });
  return coreTex;
}

// Progress sweep: a thin bright band the shader walks inward (ring) or outward
// (cone) with the wind-up; one shared procedural material family.
function makeSweepMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: EMBER_EXACT.clone() },
      uOpacity: { value: 1 },
      uProg: { value: 0 },
      uHalf: { value: Math.PI }, // cone half-angle (PI = full ring)
      uGrow: { value: 0 }, // 1 = the claimed ground grows from the centre out (cone)
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vP = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uProg;
      uniform float uHalf;
      uniform float uGrow;
      varying vec2 vP;
      void main() {
        float r = length( vP );
        if ( r > 1.0 ) discard;
        float ang = abs( atan( vP.x, vP.y ) );
        if ( ang > uHalf ) discard;
        // The band closes from the rim to the centre as the wind-up runs out
        // (ring), or runs out from the apex to the rim (cone, uGrow = 1).
        float front = mix( 1.0 - uProg, uProg, uGrow );
        float band = smoothstep( 0.07, 0.0, abs( r - front ) );
        // Behind the band the ground is already "claimed": a faint wash.
        float claimed = mix( step( front, r ), step( r, front ), uGrow ) * 0.16;
        float o = clamp( band * 0.95 + claimed, 0.0, 1.0 );
        gl_FragColor = vec4( uColor, o * uOpacity );
      }
    `,
  });
}

// Cone (sector) rim + chevrons, procedural so any half-angle stays crisp.
function makeConeMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: EMBER_EXACT.clone() },
      uOpacity: { value: 1 },
      uHalf: { value: 0.87 },
      uT: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vP = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uHalf;
      uniform float uT;
      varying vec2 vP;
      void main() {
        float r = length( vP );
        float ang = atan( vP.x, vP.y );
        float a = abs( ang );
        if ( r > 1.0 || a > uHalf ) discard;
        // Rim: the arc edge + the two straight edges.
        float arc = smoothstep( 0.075, 0.0, abs( r - 0.95 ) );
        float edge = smoothstep( 0.05, 0.0, ( uHalf - a ) * r ) * step( 0.12, r );
        // Chevrons marching outward (the slam's direction).
        float ch = fract( r * 2.2 - uT * 1.4 );
        float chev = smoothstep( 0.1, 0.0, abs( ch - 0.5 - (a / uHalf) * 0.28 ) ) * step( 0.2, r ) * step( r, 0.84 );
        float wash = 0.1;
        float o = clamp( arc + edge * 0.9 + chev * 0.55 + wash, 0.0, 1.0 );
        gl_FragColor = vec4( uColor, o * uOpacity );
      }
    `,
  });
}

// Lane: rails + marching chevrons + charge bead + faint wash (the mantis lane
// grammar, width-parametric).
function makeLaneMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: EMBER_EXACT.clone() },
      uOpacity: { value: 1 },
      uRepeat: { value: 4 },
      uBead: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uRepeat;
      uniform float uBead;
      varying vec2 vUv;
      void main() {
        float u = vUv.x;
        float v = abs( vUv.y - 0.5 ) * 2.0;
        float rail = smoothstep( 0.2, 0.04, abs( v - 0.84 ) );
        float a = fract( u * uRepeat - uBead * uRepeat );
        float chev = smoothstep( 0.13, 0.0, abs( a - v * 0.32 - 0.05 ) ) * ( 1.0 - smoothstep( 0.8, 1.0, v ) );
        float bead = smoothstep( 0.06, 0.0, abs( u - uBead ) ) * ( 1.0 - v * 0.5 );
        float wash = ( 1.0 - smoothstep( 0.5, 1.0, v ) ) * 0.17;
        float ends = smoothstep( 0.0, 0.04, u ) * ( 1.0 - smoothstep( 0.97, 1.0, u ) );
        float o = clamp( rail * 0.85 + chev * 0.9 + bead * 0.95 + wash, 0.0, 1.0 ) * ends;
        gl_FragColor = vec4( uColor, o * uOpacity );
      }
    `,
  });
}

// Standing Ember column (reads through a body parked on the decal).
function makeColumn() {
  const mat = new ShaderMaterial({
    uniforms: { uColor: { value: EMBER_EXACT.clone() }, uOpacity: { value: 0.6 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: BackSide,
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying float vY;
      void main() {
        vY = uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vY;
      void main() {
        float a = pow( clamp( 1.0 - vY, 0.0, 1.0 ), 1.5 );
        gl_FragColor = vec4( uColor, a * uOpacity );
      }
    `,
  });
  const mesh = new Mesh(sharedGeo('m4b-tele-column', () => new ConeGeometry(0.22, 1.2, 10, 1, true)), mat);
  mesh.position.y = 0.6;
  mesh.renderOrder = 12;
  return mesh;
}

function flat(geo, mat, y, order) {
  const m = new Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.renderOrder = order;
  return m;
}

// ---------------------------------------------------------------- RING --
function buildRing() {
  const group = new Group();
  group.name = 'm4b-tele-ring';
  const unit = sharedGeo('m4b-unit-quad', () => new PlaneGeometry(2, 2));
  const core = flat(
    unit,
    new MeshBasicMaterial({ map: getCoreTexture(), color: SCORCH, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    0.018,
    1
  );
  const rim = flat(
    unit,
    new MeshBasicMaterial({ map: getRimTexture(), color: EMBER_EXACT.clone(), transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    0.021,
    2
  );
  const sweep = flat(sharedGeo('m4b-unit-disc', () => new CircleGeometry(1, 48)), makeSweepMaterial(), 0.0215, 3);
  const halo = makeGlowSprite({ color: PALETTE.emberDanger, size: 2, opacity: 0.22 });
  halo.material.color.copy(EMBER_EXACT);
  halo.material.toneMapped = false;
  halo.position.y = 0.1;
  const column = makeColumn();
  group.add(core, rim, sweep, halo, column);
  let rad = 1;
  return {
    kind: 'ring',
    group,
    set(t, tSec, prog) {
      group.position.set(t.x, 0, t.z);
      rad = t.radius ?? 0.9;
      const s = rad;
      core.scale.set(s * 0.98, s * 0.98, 1);
      rim.scale.set(s, s, 1);
      sweep.scale.set(s * 0.88, s * 0.88, 1);
      halo.scale.set(s * 2.6, s * 2.6, 1);
      column.scale.set(Math.min(1.4, s * 1.1), 1, Math.min(1.4, s * 1.1));
      const k = 0.5 + 0.5 * Math.sin(Math.PI * 2 * PULSE_HZ * tSec);
      rim.material.opacity = 0.78 + 0.22 * k;
      sweep.material.uniforms.uProg.value = Math.max(0, Math.min(1, prog));
      sweep.material.uniforms.uOpacity.value = 0.9;
      halo.material.opacity = 0.1 + 0.22 * k;
      column.material.uniforms.uOpacity.value = (0.34 + 0.26 * k) * (0.55 + 0.45 * prog);
      core.material.opacity = 0.5;
      group.scale.setScalar(1);
    },
    fade(e) {
      rim.material.opacity *= e;
      sweep.material.uniforms.uOpacity.value *= e * e;
      halo.material.opacity *= e;
      column.material.uniforms.uOpacity.value *= e;
      core.material.opacity *= e;
      group.scale.setScalar(0.86 + 0.14 * e);
    },
    showColumn(on) {
      column.visible = on;
    },
  };
}

// ---------------------------------------------------------------- LANE --
function buildLane() {
  const group = new Group();
  group.name = 'm4b-tele-lane';
  const spin = new Group();
  spin.position.y = 0.0205;
  group.add(spin);
  const mat = makeLaneMaterial();
  const lane = new Mesh(sharedGeo('m4b-lane-quad', () => new PlaneGeometry(1, 1)), mat);
  lane.rotation.x = -Math.PI / 2;
  lane.renderOrder = 3;
  spin.add(lane);
  const coreMat = new MeshBasicMaterial({ color: SCORCH, transparent: true, opacity: 0.36, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const core = new Mesh(sharedGeo('m4b-lane-quad', () => new PlaneGeometry(1, 1)), coreMat);
  core.rotation.x = -Math.PI / 2;
  core.renderOrder = 1;
  core.position.y = -0.002;
  spin.add(core);
  const endHalo = makeGlowSprite({ color: PALETTE.emberDanger, size: 1.2, opacity: 0.2 });
  endHalo.material.color.copy(EMBER_EXACT);
  endHalo.material.toneMapped = false;
  endHalo.position.y = 0.1;
  group.add(endHalo);
  const column = makeColumn();
  group.add(column);
  return {
    kind: 'lane',
    group,
    set(t, tSec, prog) {
      const fx = t.fromX ?? t.x;
      const fz = t.fromZ ?? t.z;
      const dx = t.x - fx;
      const dz = t.z - fz;
      const len = Math.max(0.3, Math.hypot(dx, dz));
      const w = t.width ?? 0.7;
      group.position.set((fx + t.x) / 2, 0, (fz + t.z) / 2);
      spin.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
      lane.scale.set(len, w, 1);
      core.scale.set(len * 0.98, w * 0.72, 1);
      mat.uniforms.uRepeat.value = Math.max(2, Math.round(len / 0.7));
      const k = 0.5 + 0.5 * Math.sin(Math.PI * 2 * PULSE_HZ * tSec);
      mat.uniforms.uOpacity.value = 0.78 + 0.22 * k;
      mat.uniforms.uBead.value = Math.max(0, Math.min(1, prog));
      endHalo.position.set(dx / 2, 0.1, dz / 2);
      endHalo.material.opacity = 0.1 + 0.2 * k;
      column.position.set(dx / 2, 0.6, dz / 2);
      column.material.uniforms.uOpacity.value = (0.3 + 0.24 * k) * (0.5 + 0.5 * prog);
      coreMat.opacity = 0.36;
      group.scale.setScalar(1);
    },
    fade(e) {
      mat.uniforms.uOpacity.value *= e * e;
      endHalo.material.opacity *= e;
      column.material.uniforms.uOpacity.value *= e;
      coreMat.opacity *= e;
    },
    showColumn(on) {
      column.visible = on;
    },
  };
}

// ---------------------------------------------------------------- CONE --
function buildCone() {
  const group = new Group();
  group.name = 'm4b-tele-cone';
  const spin = new Group();
  group.add(spin);
  const disc = sharedGeo('m4b-unit-disc', () => new CircleGeometry(1, 48));
  const coreMat = new MeshBasicMaterial({ map: getCoreTexture(), color: SCORCH, transparent: true, opacity: 0.44, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const mat = makeConeMaterial();
  const sweepMat = makeSweepMaterial();
  const core = flat(disc, coreMat, 0.018, 1);
  const cone = flat(disc, mat, 0.021, 2);
  const sweep = flat(disc, sweepMat, 0.0215, 3);
  // The cone material discards outside the sector; the scorched core is a
  // full disc, so it is masked by the same sector through a second pass: keep
  // it small (the apex scorch).
  spin.add(core, cone, sweep);
  const halo = makeGlowSprite({ color: PALETTE.emberDanger, size: 2, opacity: 0.2 });
  halo.material.color.copy(EMBER_EXACT);
  halo.material.toneMapped = false;
  halo.position.y = 0.1;
  group.add(halo);
  return {
    kind: 'cone',
    group,
    set(t, tSec, prog) {
      const R = t.radius ?? 1.8;
      const half = ((t.halfAngleDeg ?? 50) * Math.PI) / 180;
      group.position.set(t.x, 0, t.z);
      // Sector local +Y (after the flat rotation, world -Z... ) -> aim along (dirX, dirZ).
      spin.rotation.y = Math.atan2(t.dirX ?? 0, t.dirZ ?? 1) + Math.PI;
      cone.scale.set(R, R, 1);
      sweep.scale.set(R, R, 1);
      core.scale.set(R * 0.35, R * 0.35, 1);
      mat.uniforms.uHalf.value = half;
      sweepMat.uniforms.uHalf.value = half;
      mat.uniforms.uT.value = tSec;
      const k = 0.5 + 0.5 * Math.sin(Math.PI * 2 * PULSE_HZ * tSec);
      mat.uniforms.uOpacity.value = 0.78 + 0.22 * k;
      // A cone slam claims its ground from the apex outward.
      sweepMat.uniforms.uGrow.value = 1;
      sweepMat.uniforms.uProg.value = Math.max(0, Math.min(1, prog));
      sweepMat.uniforms.uOpacity.value = 0.85;
      const hx = Math.sin(0) * 0;
      void hx;
      halo.position.set((t.dirX ?? 0) * R * 0.5, 0.1, (t.dirZ ?? 1) * R * 0.5);
      halo.scale.set(R * 1.6, R * 1.6, 1);
      halo.material.opacity = 0.1 + 0.2 * k;
      coreMat.opacity = 0.44;
      group.scale.setScalar(1);
    },
    fade(e) {
      mat.uniforms.uOpacity.value *= e;
      sweepMat.uniforms.uOpacity.value *= e * e;
      halo.material.opacity *= e;
      coreMat.opacity *= e;
      group.scale.setScalar(0.9 + 0.1 * e);
    },
    showColumn() {},
  };
}

const BUILD = { ring: buildRing, lane: buildLane, cone: buildCone };

// Pool of shapes by kind. acquire(kind) -> shape (added to root, visible);
// release(shape) hides it and returns it to the pool.
export function createTelegraphShapes(root) {
  const free = { ring: [], lane: [], cone: [] };
  let built = 0;
  function acquire(kind) {
    const k = BUILD[kind] ? kind : 'ring';
    let s = free[k].pop();
    if (!s) {
      s = BUILD[k]();
      built += 1;
      root.add(s.group);
    }
    s.group.visible = true;
    s.showColumn(true);
    return s;
  }
  function release(s) {
    if (!s) return;
    s.group.visible = false;
    free[s.kind].push(s);
  }
  // Boot warm-up: build and SHOW one of each so the first wind-up of a room
  // never compiles a program (render/warmup.js rule); returned to the pool.
  function prewarm() {
    const made = ['ring', 'lane', 'cone', 'ring', 'lane'].map((k) => acquire(k));
    for (const s of made) {
      s.set({ x: 0, z: -60, fromX: 0, fromZ: -60.5, radius: 0.001, width: 0.001, dirX: 0, dirZ: 1 }, 0, 0.5);
      s.group.position.y = -60;
    }
    return () => {
      for (const s of made) release(s);
    };
  }
  return { acquire, release, prewarm, stats: () => ({ built, free: free.ring.length + free.lane.length + free.cone.length }) };
}
