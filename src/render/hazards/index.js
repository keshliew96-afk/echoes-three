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
//   slip       slick floor (docs/SLICK_FLOOR.md), in the biome palette and
//              never Ember (it never hurts): one shader disc per patch with an
//              organic edge kept on the sim's circle. 'wet' = algae-slick
//              flagstones under a film of water (Mill); 'frost' = grave
//              rime with pale crystal cracks (Barrow). Layers: the surface
//              with a bright rim at the slip boundary; a gloss sheen that
//              sweeps across it every few seconds plus a steady sky glaze;
//              four-point star glints that wink in turn; low cold mist
//              (frost) or drip rings (wet); and spray kicked up by every
//              body sliding on it (droplets / ice dust) with a skid streak
//              when a dodge crosses it
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
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  LinearSRGBColorSpace,
  TorusGeometry,
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

// Slick floor surface shader. Local units are world units (the quad is
// 2 (r + pad) wide); the slip boundary sits on |p| = uR, wobbled a little
// so the edge reads organic while it stays on the sim's circle.
const SLIP_PAD = 0.3;
const SLIP_LOOK = {
  // wet flagstone (Mill): slate stones, a teal algae film, black joints
  wet: {
    stoneA: hslColor(208, 0.12, 0.12),
    stoneB: hslColor(198, 0.14, 0.19),
    film: hslColor(170, 0.3, 0.15),
    joint: hslColor(200, 0.3, 0.045),
    rim: hslColor(178, 0.3, 0.4),
    glaze: hslColor(192, 0.32, 0.4),
    sheen: hslColor(184, 0.35, 0.72),
  },
  // heart crystal (Hollow Heart): polished violet facets with bright edges
  glass: {
    stoneA: hslColor(274, 0.36, 0.11),
    stoneB: hslColor(266, 0.42, 0.3),
    film: hslColor(292, 0.3, 0.24),
    joint: hslColor(270, 0.5, 0.06),
    rim: hslColor(264, 0.62, 0.74),
    glaze: hslColor(258, 0.42, 0.52),
    sheen: hslColor(262, 0.5, 0.88),
  },
  // grave frost (Barrow): a thin rime over dark grave earth, pale cracks
  frost: {
    stoneA: hslColor(218, 0.16, 0.15),
    stoneB: hslColor(210, 0.2, 0.24),
    film: hslColor(204, 0.3, 0.36),
    joint: hslColor(222, 0.24, 0.1),
    rim: hslColor(198, 0.4, 0.62),
    glaze: hslColor(202, 0.36, 0.46),
    sheen: hslColor(196, 0.42, 0.78),
  },
};
function makeSlipMaterial(skin, radius, seed) {
  const L = SLIP_LOOK[skin] || SLIP_LOOK.wet;
  return new ShaderMaterial({
    uniforms: {
      uT: { value: 0 },
      uR: { value: radius },
      uS: { value: radius + SLIP_PAD },
      uSeed: { value: seed },
      uFrost: { value: skin === 'frost' ? 1 : 0 },
      uGlass: { value: skin === 'glass' ? 1 : 0 },
      uStir: { value: 0 },
      uStoneA: { value: L.stoneA },
      uStoneB: { value: L.stoneB },
      uFilm: { value: L.film },
      uJoint: { value: L.joint },
      uRim: { value: L.rim },
      uGlaze: { value: L.glaze },
      uSheen: { value: L.sheen },
    },
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    vertexShader: /* glsl */ `
      varying vec2 vP;
      uniform float uS;
      void main() {
        vP = ( uv - 0.5 ) * 2.0 * uS;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uT;
      uniform float uR;
      uniform float uSeed;
      uniform float uFrost;
      uniform float uGlass;
      uniform float uStir;
      uniform vec3 uStoneA;
      uniform vec3 uStoneB;
      uniform vec3 uFilm;
      uniform vec3 uJoint;
      uniform vec3 uRim;
      uniform vec3 uGlaze;
      uniform vec3 uSheen;
      varying vec2 vP;
      float hash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
      vec2 hash2( vec2 p ) { return fract( sin( vec2( dot( p, vec2( 127.1, 311.7 ) ), dot( p, vec2( 269.5, 183.3 ) ) ) ) * 43758.5453 ); }
      float noise( vec2 p ) {
        vec2 i = floor( p ); vec2 f = fract( p );
        vec2 u = f * f * ( 3.0 - 2.0 * f );
        return mix( mix( hash( i ), hash( i + vec2( 1, 0 ) ), u.x ), mix( hash( i + vec2( 0, 1 ) ), hash( i + vec2( 1, 1 ) ), u.x ), u.y );
      }
      float fbm( vec2 p ) { return 0.55 * noise( p ) + 0.3 * noise( p * 2.1 + 7.3 ) + 0.15 * noise( p * 4.3 + 1.7 ); }
      // Voronoi: x = F1, y = F2 - F1 (joint / crack width), z = cell id hash.
      vec3 cells( vec2 p ) {
        vec2 i = floor( p ); vec2 f = fract( p );
        float d1 = 8.0; float d2 = 8.0; float id = 0.0;
        for ( int y = -1; y <= 1; y++ ) for ( int x = -1; x <= 1; x++ ) {
          vec2 g = vec2( float( x ), float( y ) );
          vec2 o = hash2( i + g + uSeed );
          float d = length( g + o - f );
          if ( d < d1 ) { d2 = d1; d1 = d; id = hash( i + g + uSeed * 1.7 ); }
          else if ( d < d2 ) d2 = d;
        }
        return vec3( d1, d2 - d1, id );
      }
      void main() {
        vec2 p = vP;
        float d = length( p );
        float ang = atan( p.y, p.x );
        float wob = ( noise( vec2( ang * 2.6 + uSeed * 3.0, uSeed ) ) - 0.5 ) * 0.14 + ( noise( p * 2.3 + uSeed ) - 0.5 ) * 0.08;
        float edge = uR + wob;
        float inside = 1.0 - smoothstep( edge - 0.06, edge + 0.05, d );
        if ( inside <= 0.002 ) discard;
        float toEdge = edge - d; // u inside the boundary
        vec3 cl = cells( p * mix( 1.55, 2.3, uFrost ) );
        float joint = 1.0 - smoothstep( mix( 0.05, 0.018, uFrost ), mix( 0.11, 0.05, uFrost ), cl.y );
        float n = fbm( p * 1.3 + uSeed );
        // Body: per-stone value, a film of algae / rime over it.
        vec3 col = mix( uStoneA, uStoneB, cl.z * 0.7 + n * 0.3 );
        float film = smoothstep( 0.35, 0.75, fbm( p * 0.8 + uSeed * 2.0 ) );
        col = mix( col, uFilm, film * mix( 0.45, 0.55, uFrost ) );
        // Wet: joints are dark water lines. Frost: cracks glow pale.
        col = mix( col, uJoint, joint * ( 1.0 - uFrost ) * 0.85 );
        col = mix( col, uRim, joint * uFrost * 0.45 );
        // Frost feathers: dense rime toward the rim, fern-like streaks.
        float fern = smoothstep( 0.55, 0.85, noise( vec2( ang * 9.0, d * 3.0 ) + uSeed ) ) * smoothstep( 0.9, 0.1, toEdge );
        col = mix( col, uRim, fern * uFrost * 0.4 );
        // Steady glaze: a cool sky reflection across the whole surface, and
        // the puddled (wet) / polished (frost) areas reflect the most.
        float gloss = mix( 0.35 + 0.65 * smoothstep( 0.45, 0.7, n ), 0.6, uFrost );
        float sky = 0.5 + 0.5 * ( -p.y / ( uR + 0.001 ) );
        col = mix( col, uGlaze, gloss * ( 0.12 + 0.16 * sky ) );
        // Ripple when bodies slide across it (wet only).
        float rip = sin( d * 14.0 - uT * 6.0 ) * 0.5 + 0.5;
        col += uGlaze * rip * uStir * 0.08 * ( 1.0 - uFrost ) * gloss;
        // The sheen: a soft bright band sweeping across the patch on a slow
        // loop, so a still frame always shows a highlight somewhere on it.
        vec2 dir = normalize( vec2( 0.82, -0.57 ) );
        float span = 2.0 * uR + 2.4;
        float s = dot( p, dir ) + uR + 1.2;
        float ph = fract( uT * 0.16 + uSeed * 0.37 );
        float band = exp( -pow( ( s - ph * span ) / 0.42, 2.0 ) );
        float band2 = exp( -pow( ( s - ph * span + 0.55 ) / 0.16, 2.0 ) ) * 0.6;
        float hi = ( band + band2 ) * gloss;
        col = mix( col, uSheen, clamp( hi * 0.6, 0.0, 0.7 ) );
        // Glints: tiny four-point stars that wink in turn.
        vec2 g = p * 3.2;
        vec2 gi = floor( g );
        vec2 gf = fract( g ) - 0.5;
        float h = hash( gi + uSeed * 5.0 );
        float wink = pow( max( 0.0, sin( uT * ( 1.6 + h * 1.8 ) + h * 40.0 ) ), 40.0 ) * step( 0.55, h );
        vec2 o = gf - ( hash2( gi + 3.0 ) - 0.5 ) * 0.5;
        float star = max( 0.0, 1.0 - abs( o.x ) * 40.0 - abs( o.y ) * 4.0 ) + max( 0.0, 1.0 - abs( o.y ) * 40.0 - abs( o.x ) * 4.0 );
        star += max( 0.0, 1.0 - length( o ) * 9.0 );
        col += uSheen * star * wink * gloss * 1.2;
        // The boundary rim: a crisp light line where the slip starts.
        float rim = smoothstep( 0.16, 0.05, toEdge ) * smoothstep( -0.03, 0.03, toEdge );
        float rimN = 0.75 + 0.25 * noise( vec2( ang * 12.0, uT * 0.5 ) );
        col = mix( col, uRim, rim * rimN * 0.85 );
        // Heart crystal: one polished gem slab — every facet its own value
        // (a fixed light direction against a per-facet tilt), black seams
        // with a bright cut edge beside them, a deep violet heart under the
        // centre and a strong sheen. Replaces the stone/film look outright.
        if ( uGlass > 0.5 ) {
          vec3 gc = cells( p * 1.25 + 3.1 );
          vec2 tilt = hash2( vec2( gc.z * 91.7, gc.z * 13.3 ) ) - 0.5;
          float facet = clamp( 0.5 + dot( tilt, normalize( vec2( -0.6, -0.8 ) ) ) * 1.6, 0.0, 1.0 );
          vec3 gq = mix( uStoneA, uStoneB, facet );
          gq = mix( gq, uFilm, smoothstep( 0.6, 1.0, d / ( uR + 0.001 ) ) * 0.35 );
          float seam = 1.0 - smoothstep( 0.015, 0.05, gc.y );
          float edgeLit = ( 1.0 - smoothstep( 0.05, 0.11, gc.y ) ) - seam;
          gq = mix( gq, uJoint, seam * 0.9 );
          gq = mix( gq, uRim, edgeLit * ( 0.35 + 0.45 * facet ) );
          gq = mix( gq, uGlaze, ( 0.1 + 0.18 * sky ) );
          gq = mix( gq, uSheen, clamp( hi * 0.75, 0.0, 0.8 ) );
          gq += uSheen * star * wink * 1.4;
          gq = mix( gq, uRim, rim * rimN * 0.9 );
          col = gq;
        }
        float a = inside * mix( mix( 0.9, 0.95, uFrost ), 0.97, uGlass );
        gl_FragColor = vec4( col, a );
      }
    `,
  });
}

// A four-point star (glints over the slick floor).
function starTex() {
  return tex('slip-star', 64, (ctx, S) => {
    const c = S / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, S * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(c, 0);
    ctx.quadraticCurveTo(c + 3, c - 3, S, c);
    ctx.quadraticCurveTo(c + 3, c + 3, c, S);
    ctx.quadraticCurveTo(c - 3, c + 3, 0, c);
    ctx.quadraticCurveTo(c - 3, c - 3, c, 0);
    ctx.fill();
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

// Vein vent (gravefire skin 'vein', Act IV): linear (unlit, untoned) violet
// for the veins / breath / column core, and the rose flesh / throat tones.
const VENT_GLOW = [0.5, 0.36, 1.35];
const VENT_CORE = [0.78, 0.6, 1.6];
const VENT_LIP = hslColor(334, 0.3, 0.24);
const VENT_THROAT = hslColor(282, 0.5, 0.035);
function ventVeinsGeo() {
  const parts = [];
  for (let k = 0; k < 6; k++) {
    const a = k * 1.05 + 0.25;
    const len = 0.24 + (k % 3) * 0.1;
    parts.push(new BoxGeometry(len, 0.012, 0.04 - (k % 2) * 0.012).translate(0.3 + len / 2, 0.008, 0).rotateY(a));
    // a short fork off every other vein
    if (k % 2 === 0) parts.push(new BoxGeometry(0.18, 0.012, 0.02).translate(0.09, 0.008, 0).rotateY(0.6).translate(0.3 + len * 0.6, 0, 0).rotateY(a));
  }
  return mergeGeometries(parts);
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
  // Act IV skin 'vein' (the Hollow Heart): a vein vent — a swollen rose lip
  // round a black orifice, violet veins running out of it across the floor
  // and a cold violet breath over it. Idle stays violet (never Ember); the
  // telegraph is the shared Ember ring and, as it closes, the veins heat to
  // Ember; the eruption is a violet-cored column with an Ember skin.
  const vein = h.skin === 'vein';
  const veinMat = vein ? new MeshBasicMaterial({ toneMapped: false }) : null;
  if (veinMat) veinMat.color.setRGB(0.24, 0.08, 0.64, LinearSRGBColorSpace);
  const veinBase = veinMat ? veinMat.color.clone() : null;
  const lipMat = vein ? toonMaterial({ color: VENT_LIP }) : null;
  const throatMat = vein ? new MeshBasicMaterial({ color: VENT_THROAT }) : null;
  for (let i = 0; i < h.vents.length; i++) {
    const v = h.vents[i];
    const p = new Group();
    p.position.set(v.x, 0, v.z);
    p.rotation.y = (i * 0.7 + h.id) % 3;
    if (vein) {
      const lip = new Mesh(sharedGeo('hz-vent-lip', () => new TorusGeometry(0.3, 0.1, 6, 14).rotateX(Math.PI / 2).scale(1, 0.62, 1).translate(0, 0.05, 0)), lipMat);
      addInk(lip);
      p.add(lip);
      const throat = new Mesh(sharedGeo('hz-vent-throat', () => new CircleGeometry(0.27, 16).rotateX(-Math.PI / 2).translate(0, 0.06, 0)), throatMat);
      p.add(throat);
      p.add(new Mesh(sharedGeo('hz-vent-veins', ventVeinsGeo), veinMat));
    } else {
      const slab = new Mesh(slabG, slabMat);
      addInk(slab);
      p.add(slab);
      p.add(new Mesh(crackG, crackMat));
    }
    const warm = makeGlowSprite({ color: vein ? PALETTE.godstuffViolet : PALETTE.hearthAmber, size: vein ? 0.8 : 0.7, opacity: 0.18 });
    if (vein) {
      warm.material.toneMapped = false;
      warm.material.color.setRGB(VENT_GLOW[0], VENT_GLOW[1], VENT_GLOW[2], LinearSRGBColorSpace);
    }
    warm.position.y = 0.2;
    p.add(warm);
    // The column: Ember-tinted flame billboards + a hot core + halo.
    const col = new Group();
    col.visible = false;
    const flames = [];
    for (let k = 0; k < 3; k++) {
      const f = makeFlameSprite(1.25 - k * 0.25, 1, 0.96);
      if (vein && k > 0) f.material.color.setRGB(VENT_CORE[0], VENT_CORE[1], VENT_CORE[2], LinearSRGBColorSpace).lerp(new Color('#FFFFFF'), 0.1 + k * 0.12);
      else f.material.color.copy(EMBER_EXACT).lerp(new Color('#FFFFFF'), 0.12 + k * 0.1);
      f.position.set((k - 1) * 0.12, 0.6 - k * 0.08, 0.05 * k);
      col.add(f);
      flames.push(f);
    }
    const halo = makeGlowSprite({ color: PALETTE.emberDanger, size: 1.6, opacity: 0.5 });
    halo.material.color.copy(EMBER_EXACT);
    halo.material.toneMapped = false;
    halo.position.y = 0.4;
    col.add(halo);
    if (vein) {
      const core = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 0.9, opacity: 0.6 });
      core.material.toneMapped = false;
      core.material.color.setRGB(VENT_CORE[0], VENT_CORE[1], VENT_CORE[2], LinearSRGBColorSpace);
      core.position.y = 0.5;
      col.add(core);
    }
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
        r.warm.material.opacity = vein ? 0.2 + 0.08 * Math.sin(tSec * 1.6 + i * 1.3) : 0.14 + 0.05 * Math.sin(tSec * 1.3 + i);
        let heat = 0;
        if (v.phase === 'telegraph') {
          if (!r.tele) r.tele = ctx.shapes.acquire('ring');
          const t0 = (v.phaseUntilTick ?? tick) - 54;
          const prog = Math.min(1, Math.max(0, (tick - t0) / 54));
          r.tele.set({ x: v.x, z: v.z, radius: 0.7 }, tSec, prog);
          ctx.live.push(v);
          r.warm.material.opacity = 0.2 + 0.25 * prog;
          heat = prog;
        } else if (r.tele) {
          ctx.shapes.release(r.tele);
          r.tele = null;
        }
        if (vein && i === 0) {
          // One shared vein material per gravefire: heat it with the
          // furthest-along vent (the vents of one line fire together).
          let hmax = heat;
          e.vents.forEach((w) => {
            if (w.phase === 'telegraph') hmax = Math.max(hmax, Math.min(1, Math.max(0, (tick - ((w.phaseUntilTick ?? tick) - 54)) / 54)));
            else if (w.phase === 'active') hmax = 1;
          });
          const k = hmax * hmax;
          veinMat.color.copy(veinBase).multiplyScalar(1 + 0.25 * Math.sin(tSec * 2.2)).lerp(EMBER_EXACT, k * 0.85);
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

function buildSlip(h) {
  const g = new Group();
  const skin = h.skin === 'frost' || h.skin === 'glass' ? h.skin : 'wet';
  // Glass rides the frost behaviours (crystal dust spray, glints, low haze).
  const icy = skin !== 'wet';
  const L = SLIP_LOOK[skin];
  const r = h.radius ?? 1.4;
  const seed = ((h.id ?? 1) * 0.6180339) % 1;
  const mat = makeSlipMaterial(skin, r, seed * 10);
  const disc = new Mesh(sharedGeo('hz-water-quad', () => new PlaneGeometry(1, 1)), mat);
  disc.rotation.x = -Math.PI / 2;
  disc.scale.set(2 * (r + SLIP_PAD), 2 * (r + SLIP_PAD), 1);
  disc.position.y = 0.012;
  disc.renderOrder = -6;
  g.add(disc);
  // Star glints standing just above the floor: a handful, each winking on
  // its own clock (deterministic per patch, never the sim's RNG).
  const stars = [];
  const n = Math.round(3 + r * 2);
  for (let i = 0; i < n; i++) {
    const m = new SpriteMaterial({ map: starTex(), color: L.sheen.clone(), blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
    m.opacity = 0;
    const sp = new Sprite(m);
    const a = i * 2.39996 + seed * 6.28;
    const rr = r * (0.25 + 0.65 * (((i * 7 + 3) % 10) / 10));
    sp.position.set(Math.cos(a) * rr, 0.06, Math.sin(a) * rr);
    sp.scale.setScalar(0.001);
    g.add(sp);
    stars.push({ sp, rate: 0.55 + ((i * 13) % 7) * 0.09, phase: i * 0.37 + seed, size: 0.32 + ((i * 5) % 4) * 0.07 });
  }
  // Frost: low cold mist drifting over it. Wet: a soft cool sheen glow.
  const mists = [];
  const mistN = skin === 'frost' ? 3 : 1;
  for (let i = 0; i < mistN; i++) {
    const w = makeGlowSprite({ color: icy ? L.glaze : L.film, size: r * (skin === 'frost' ? 1.3 : skin === 'glass' ? 1.6 : 1.9), opacity: 0 });
    w.position.y = skin === 'frost' ? 0.22 : 0.05;
    g.add(w);
    mists.push({ w, phase: i * 2.1 + seed * 4 });
  }
  let stir = 0;
  let sprayDebt = 0;
  return {
    group: g,
    update(e, tSec, ctx, dt) {
      mat.uniforms.uT.value = tSec;
      for (const st of stars) {
        const k = Math.max(0, Math.sin(tSec * st.rate * 2.2 + st.phase * 6.28));
        const w = Math.pow(k, 14);
        st.sp.material.opacity = 0.95 * w;
        st.sp.scale.setScalar(0.001 + st.size * w);
        st.sp.material.rotation = tSec * 0.4 + st.phase;
      }
      mists.forEach((m, i) => {
        m.w.material.opacity = skin === 'frost' ? 0.05 + 0.03 * Math.sin(tSec * 0.5 + m.phase) : skin === 'glass' ? 0.06 + 0.03 * Math.sin(tSec * 0.9) : 0.04 + 0.02 * Math.sin(tSec * 0.8);
        m.w.position.x = Math.sin(tSec * 0.17 + m.phase) * r * 0.35;
        m.w.position.z = Math.cos(tSec * 0.13 + m.phase * 1.3) * r * 0.3;
        void i;
      });
      // Bodies sliding on it: spray at their feet, the surface stirs.
      const sliders = ctx.sliders(e);
      stir += ((sliders.length > 0 ? 1 : 0) - stir) * Math.min(1, dt * 4);
      mat.uniforms.uStir.value = stir;
      if (sliders.length > 0 && ctx.slide) ctx.slide(sliders, skin); // the slide's hiss (src/audio/encountercues.js)
      for (const b of sliders) {
        sprayDebt += dt * (b.fast ? 26 : 7 * Math.min(1, b.speed / 2.5));
        while (sprayDebt >= 1) {
          sprayDebt -= 1;
          const dir = { x: -b.vx / (b.speed || 1), z: -b.vz / (b.speed || 1) };
          if (icy) {
            impactFx.spray('spark', b.x, 0.05, b.z, 1, { color: L.rim, speed: [0.4, 1.2], up: [0.3, 0.9], size: [0.04, 0.08], life: [0.3, 0.55], opacity: 0.9, dir, dirBias: 0.7, jitter: 0.15 });
            if (ctx.cosmetic.chance(0.3)) impactFx.spray('smoke', b.x, 0.08, b.z, 1, { color: L.glaze, speed: [0.2, 0.5], up: [0.1, 0.3], size: [0.25, 0.4], grow: 0.6, life: [0.5, 0.8], opacity: 0.22, dir, dirBias: 0.6 });
          } else {
            impactFx.spray('spark', b.x, 0.04, b.z, 1, { color: L.glaze, speed: [0.6, 1.5], up: [0.6, 1.4], size: [0.04, 0.07], life: [0.25, 0.45], opacity: 0.85, dir, dirBias: 0.65, jitter: 0.12 });
          }
        }
      }
    },
  };
}

const BUILD = { slip: buildSlip, bramble: buildBramble, puffcap: buildPuffcap, millrace: buildMillrace, rockfall: buildRockfall, gravefire: buildGravefire };

// ------------------------------------------------------------------ layer --
export function createHazardLayer({ stage, world, bus, cosmetic, slide = null }) {
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

  // Party and hostile bodies on a slip patch that are moving this frame:
  // [{ x, z, vx, vz (u/s), speed, fast (a dash or a fast slide) }].
  function sliders(h) {
    const out = [];
    for (const e of world.entities()) {
      if (e.partyIndex === undefined && e.faction !== 'hostile') continue;
      if (!(e.hp > 0) || e.flier || e.burrowed) continue;
      if (Math.hypot(e.x - h.x, e.z - h.z) > h.radius) continue;
      const vx = (e.x - (e.px ?? e.x)) * TICK_HZ;
      const vz = (e.z - (e.pz ?? e.z)) * TICK_HZ;
      const speed = Math.hypot(vx, vz);
      if (speed < 0.6) continue;
      out.push({ x: e.x, z: e.z, vx, vz, speed, fast: speed > 4 || e.dashTicksLeft > 0 });
    }
    return out;
  }

  function update(tSec) {
    const dt = lastT === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - lastT));
    lastT = tSec;
    const ctx = { tick: world.tick, shapes, live: [], dust: spawnDust, bodiesInside, sliders, slide, cosmetic };
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
      slip: { id: 1, radius: 1.4, skin: 'wet' },
      slipFrost: { id: 2, radius: 1.4, skin: 'frost' },
      slipGlass: { id: 3, radius: 1.4, skin: 'glass' },
      gravefireVein: { id: 1, vents: [{ x: 0, z: 0 }], skin: 'vein' },
    };
    const kindOf = (k) => (k.startsWith('slip') ? 'slip' : k.startsWith('gravefire') ? 'gravefire' : k);
    for (const [k, f] of Object.entries(fake)) warmPark(root, BUILD[kindOf(k)](f).group);
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
