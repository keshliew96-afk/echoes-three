// Template kit (docs/gauntlet/design-VFX.md §11) — the pooled primitives
// Kesh's three VFX templates need on top of the base kit (kit.js):
//
//   circle  an arcane circle on the ground (or standing up at a caster's
//           hand): an outer ring of runes and an inner sigil that spin
//           against each other. Three faces: 'arcane' (runes and a
//           hexagram, MAGIC), 'sun' (a ring of flame rays, BLADE), 'hex' (a
//           targeting hexagon and grid ticks, SCI-FI).
//   beam    an ethereal light beam: a tall camera-facing shaft with a hot
//           core, a soft volumetric halo and light rising up it.
//   blaze   a ribbon bent round a centre, like the base slash, but burning:
//           mode 'fire' is the blazing fiery trail (flame licks eating it
//           from the tail), mode 'wave' a clean golden energy wave that
//           travels outward.
//   blast   an animated billboard burst: 'fire' (a turbulent fireball that
//           erodes away, the impactful explosion), 'celestial' (a starburst
//           of rays and a ring, the celestial energy burst), 'holo' (a
//           square glitching shell with scanlines).
//   dust    floating particles that twinkle: 'star' stardust and 'square'
//           holographic matrix bits (one Points cloud each).
//   sparks  sharp particles: short camera-facing lines along their own
//           velocity, the motion-blurred spark of a blade (one instanced
//           draw for all of them).
//   head    the flying body of a projectile in its template (PR 3), held
//           for as long as the shot flies: 'fire' a blazing comet with a
//           white-hot head and a flame tail, 'celestial' a star orb in a
//           ring of turning runes with an ethereal ribbon behind it, 'holo'
//           a neon laser bolt with a hot core, scanlines and glitch tears.
//           It faces the camera and stretches down its own heading.
//
// Same contract as kit.js: one shared program per primitive over a fixed
// pool, no allocation after boot, every program warmed in camp (prewarm()).
// Render-only; randomness from the COSMETIC stream only.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { markShared } from '../geocache.js';
import { exactColor, underBloom } from '../critters/common.js';
import { warmPark } from '../warmup.js';
import { HOLD_CAP } from '../hold.js';

export const TPL_CAPS = Object.freeze({ circle: 28, beam: 18, blaze: 48, blast: 40, dust: 420, bits: 160, sparks: 400, head: 64 }); // PR 2 raised them for the foes; PR 3 added heads

const colorCache = new Map();
function col(hex) {
  let c = colorCache.get(hex);
  if (!c) {
    c = exactColor(hex);
    colorCache.set(hex, c);
  }
  return c;
}
const softCache = new Map();
function soft(hex) {
  let c = softCache.get(hex);
  if (!c) {
    c = underBloom(exactColor(hex), 0.85);
    softCache.set(hex, c);
  }
  return c;
}

// A fixed pattern generator for the drawn textures (they are drawn once, the
// same every boot; no gameplay stream is touched).
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const NOISE = /* glsl */ `
float tplH( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
float tplN( vec2 p ) {
  vec2 i = floor( p ); vec2 f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( tplH( i ), tplH( i + vec2( 1.0, 0.0 ) ), u.x ), mix( tplH( i + vec2( 0.0, 1.0 ) ), tplH( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}
float tplF( vec2 p ) { float a = 0.5; float s = 0.0; for ( int i = 0; i < 4; i++ ) { s += a * tplN( p ); p *= 2.03; a *= 0.5; } return s; }
`;

// --------------------------------------------------------------- circle --
// Each face is two textures: the outer ring (rings + runes / rays / ticks)
// and the inner sigil (hexagram / sunburst / hexagon), white on clear.
const circleTex = {};
function getCircleTexture(face, layer) {
  const key = `${face}:${layer}`;
  if (circleTex[key]) return circleTex[key];
  const S = 512;
  const H = S / 2;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  const R = lcg(face === 'arcane' ? 7 : face === 'sun' ? 11 : 13);
  g.strokeStyle = '#ffffff';
  g.fillStyle = '#ffffff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const ring = (r, w, a = 1) => {
    g.globalAlpha = a;
    g.lineWidth = w;
    g.beginPath();
    g.arc(H, H, r, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  };
  const poly = (n, r, rot, w, step = 1) => {
    g.lineWidth = w;
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = rot + ((i * step) / n) * Math.PI * 2;
      const x = H + Math.cos(a) * r;
      const y = H + Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  };
  // A soft glow under every line: draw twice, wide and faint, then crisp.
  const glowPass = (fn) => {
    g.save();
    g.shadowColor = 'rgba(255,255,255,0.9)';
    g.shadowBlur = 14;
    fn();
    g.restore();
  };
  if (face === 'arcane' && layer === 'outer') {
    glowPass(() => {
      ring(H * 0.94, 6);
      ring(H * 0.86, 2.5);
      ring(H * 0.66, 3);
      ring(H * 0.6, 1.5, 0.7);
    });
    // A band of runes between the rings: each rune a few strokes on a grid.
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      g.save();
      g.translate(H + Math.cos(a) * H * 0.76, H + Math.sin(a) * H * 0.76);
      g.rotate(a + Math.PI / 2);
      g.lineWidth = 3.2;
      g.shadowColor = 'rgba(255,255,255,0.9)';
      g.shadowBlur = 8;
      g.beginPath();
      const s = 13;
      const pts = [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
      let p = pts[Math.floor(R() * 9)];
      g.moveTo(p[0] * s, p[1] * s);
      for (let k = 0; k < 3 + Math.floor(R() * 2); k++) {
        p = pts[Math.floor(R() * 9)];
        g.lineTo(p[0] * s, p[1] * s);
      }
      g.stroke();
      if (R() < 0.5) {
        g.beginPath();
        g.arc(0, 0, 3.5, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
    // Tick marks on the outer ring.
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const l = i % 6 === 0 ? 16 : 7;
      g.lineWidth = i % 6 === 0 ? 3 : 1.5;
      g.beginPath();
      g.moveTo(H + Math.cos(a) * H * 0.86, H + Math.sin(a) * H * 0.86);
      g.lineTo(H + Math.cos(a) * (H * 0.86 + l), H + Math.sin(a) * (H * 0.86 + l));
      g.stroke();
    }
  } else if (face === 'arcane') {
    glowPass(() => {
      // A hexagram, its circle and six small orbit rings at the points.
      poly(3, H * 0.58, -Math.PI / 2, 4);
      poly(3, H * 0.58, Math.PI / 2, 4);
      ring(H * 0.58, 2.5);
      ring(H * 0.3, 3);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(H + Math.cos(a) * H * 0.58, H + Math.sin(a) * H * 0.58, H * 0.07, 0, Math.PI * 2);
        g.stroke();
      }
      poly(6, H * 0.3, 0, 2);
    });
    const core = g.createRadialGradient(H, H, 0, H, H, H * 0.22);
    core.addColorStop(0, 'rgba(255,255,255,0.85)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = core;
    g.fillRect(0, 0, S, S);
  } else if (face === 'sun' && layer === 'outer') {
    glowPass(() => {
      ring(H * 0.92, 5);
      ring(H * 0.7, 2);
    });
    // Flame rays: long curved blades sweeping round the ring.
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      g.save();
      g.translate(H, H);
      g.rotate(a);
      const gr = g.createLinearGradient(H * 0.7, 0, H * 0.98, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(H * 0.7, -9);
      g.quadraticCurveTo(H * 0.86, -6, H * 0.99, 10);
      g.quadraticCurveTo(H * 0.84, 4, H * 0.7, 9);
      g.closePath();
      g.fill();
      g.restore();
    }
  } else if (face === 'sun') {
    glowPass(() => {
      poly(4, H * 0.5, 0, 3);
      poly(4, H * 0.5, Math.PI / 4, 3);
      ring(H * 0.28, 3);
    });
    const core = g.createRadialGradient(H, H, 0, H, H, H * 0.3);
    core.addColorStop(0, 'rgba(255,255,255,0.9)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = core;
    g.fillRect(0, 0, S, S);
  } else if (layer === 'outer') {
    // hex: broken ring segments, grid ticks, corner brackets.
    g.save();
    g.shadowColor = 'rgba(255,255,255,0.9)';
    g.shadowBlur = 10;
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * Math.PI * 2 + 0.06;
      g.lineWidth = i % 3 === 0 ? 7 : 3;
      g.beginPath();
      g.arc(H, H, H * 0.9, a0, a0 + Math.PI / 7.5);
      g.stroke();
    }
    ring(H * 0.78, 1.5, 0.8);
    g.restore();
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(H + Math.cos(a) * H * 0.7, H + Math.sin(a) * H * 0.7);
      g.lineTo(H + Math.cos(a) * H * (i % 4 === 0 ? 0.64 : 0.67), H + Math.sin(a) * H * (i % 4 === 0 ? 0.64 : 0.67));
      g.stroke();
    }
  } else {
    g.save();
    g.shadowColor = 'rgba(255,255,255,0.9)';
    g.shadowBlur = 10;
    poly(6, H * 0.5, Math.PI / 6, 4);
    poly(6, H * 0.34, 0, 2);
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(H - H * 0.62, H);
    g.lineTo(H - H * 0.2, H);
    g.moveTo(H + H * 0.2, H);
    g.lineTo(H + H * 0.62, H);
    g.moveTo(H, H - H * 0.62);
    g.lineTo(H, H - H * 0.2);
    g.moveTo(H, H + H * 0.2);
    g.lineTo(H, H + H * 0.62);
    g.stroke();
    g.restore();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  circleTex[key] = t;
  return t;
}

// ----------------------------------------------------------------- beam --
const BEAM_VERT = /* glsl */ `
uniform vec3 uBase;
uniform float uH;
uniform float uW;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 toCam = cameraPosition - uBase;
  vec3 right = normalize( vec3( toCam.z, 0.0, -toCam.x ) + vec3( 1e-5, 0.0, 0.0 ) );
  vec3 p = uBase + right * ( position.x * uW ) + vec3( 0.0, ( position.y + 0.5 ) * uH, 0.0 );
  gl_Position = projectionMatrix * viewMatrix * vec4( p, 1.0 );
}
`;
const BEAM_FRAG = /* glsl */ `
uniform vec3 uCore;
uniform vec3 uGlow;
uniform float uOpacity;
uniform float uTime;
uniform float uSeed;
uniform float uGain;
varying vec2 vUv;
${NOISE}
void main() {
  float x = ( vUv.x - 0.5 ) * 2.0;
  float y = vUv.y;
  float core = exp( -x * x * 30.0 );
  float halo = exp( -x * x * 3.5 );
  float fadeY = smoothstep( 0.0, 0.05, y ) * pow( 1.0 - y, 1.3 );
  float n = tplN( vec2( x * 2.5 + uSeed, y * 7.0 - uTime * 3.2 ) );
  float rays = 0.55 + 0.6 * n;
  vec3 c = mix( uGlow, uCore * uGain, core );
  float a = ( core * 0.95 + halo * 0.42 * rays ) * fadeY * uOpacity;
  gl_FragColor = vec4( c, clamp( a, 0.0, 1.0 ) );
}
`;

// ---------------------------------------------------------------- blaze --
const BLAZE_VERT = /* glsl */ `
uniform float uRadius;
uniform float uWidth;
uniform float uStart;
uniform float uSpan;
uniform float uY;
uniform float uLift;
uniform float uTaper;
varying vec2 vUv;
void main() {
  vUv = uv;
  float a = uStart + uv.x * uSpan;
  float taper = mix( 1.0, pow( max( sin( 3.14159265 * uv.x ), 0.0 ), 0.5 ), uTaper );
  float r = uRadius + ( uv.y - 1.0 ) * uWidth * taper;
  vec3 p = vec3( cos( a ) * r, uY + uLift * uv.y, sin( a ) * r );
  gl_Position = projectionMatrix * modelViewMatrix * vec4( p, 1.0 );
}
`;
const BLAZE_FRAG = /* glsl */ `
uniform vec3 uCore;
uniform vec3 uA;
uniform vec3 uB;
uniform float uOpacity;
uniform float uHead;
uniform float uTail;
uniform float uTime;
uniform float uSeed;
uniform float uMode;
uniform float uGain;
uniform float uSwipe;
varying vec2 vUv;
${NOISE}
void main() {
  float u = vUv.x;
  float v = vUv.y;
  float lead = 1.0 - smoothstep( uHead - 0.04, uHead, u );
  // T4: a sword swipe's start fades in on a concave ease-out ramp, opaque
  // by about 42% of the arc; T5: 7 streak lines along the arc boil in place
  // under the travelling window.
  float ramp = mix( 1.0, 1.0 - pow( 1.0 - clamp( u / 0.42, 0.0, 1.0 ), 1.6 ), uSwipe );
  float streak = mix( 1.0, 0.55 + 0.45 * smoothstep( -0.2, 0.8, sin( v * 43.98 + tplN( vec2( u * 3.0 + uSeed, uTime * 4.0 ) ) * 3.0 ) ), uSwipe );
  float trail = smoothstep( uHead - uTail, uHead - uTail * 0.2, u );
  float along = lead * trail;
  float behind = clamp( ( uHead - u ) / max( uTail, 0.001 ), 0.0, 1.0 );
  float n = tplF( vec2( u * 10.0 + uSeed - uTime * 1.6, v * 2.4 - uTime * 6.0 ) );
  if ( uMode < 0.5 ) {
    // FIRE: hot white-gold at the blade's edge and the head, flame licks
    // eating the ribbon from its tail and its inner side.
    float body = smoothstep( 0.0, 0.15, v );
    float erode = behind * 0.62 + ( 1.0 - v ) * 0.3;
    float flame = smoothstep( erode - 0.12, erode + 0.16, n );
    float heat = smoothstep( 0.25, 0.95, v ) * ( 1.0 - behind * 0.6 ) + ( n - 0.5 ) * 0.35 + 0.1;
    vec3 c = mix( uB, uA, smoothstep( 0.05, 0.5, heat ) );
    c = mix( c, uCore * uGain, smoothstep( 0.55, 0.95, heat ) );
    float a = along * body * flame * ramp * streak * uOpacity;
    gl_FragColor = vec4( c, clamp( a, 0.0, 1.0 ) );
  } else {
    // WAVE: a clean bright leading rim over a soft inner glow, shimmering.
    float rim = smoothstep( 0.6, 0.93, v ) * ( 1.0 - smoothstep( 0.965, 1.0, v ) );
    float inner = pow( v, 2.2 ) * 0.5;
    float shimmer = 0.75 + 0.5 * n;
    vec3 c = mix( uA, uCore * uGain, rim * rim );
    float a = along * ( rim + inner ) * shimmer * uOpacity;
    gl_FragColor = vec4( c, clamp( a, 0.0, 1.0 ) );
  }
}
`;

// ---------------------------------------------------------------- blast --
const BLAST_VERT = /* glsl */ `
uniform vec3 uCenter;
uniform float uSize;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mv = viewMatrix * vec4( uCenter, 1.0 );
  mv.xy += position.xy * uSize;
  gl_Position = projectionMatrix * mv;
}
`;
const BLAST_FRAG = /* glsl */ `
uniform vec3 uCore;
uniform vec3 uA;
uniform vec3 uB;
uniform float uK;
uniform float uSeed;
uniform float uMode;
uniform float uOpacity;
uniform float uSpin;
uniform float uGain;
varying vec2 vUv;
${NOISE}
void main() {
  vec2 p = ( vUv - 0.5 ) * 2.0;
  float d = length( p );
  float ang = atan( p.y, p.x );
  float k = uK;
  float ek = 1.0 - pow( 1.0 - k, 3.0 );
  vec3 c;
  float a;
  if ( uMode < 0.5 ) {
    // FIRE: a turbulent fireball that swells fast, white-hot at its heart,
    // flame tongues licking out of its rim, then erodes from the rim in.
    float n = tplF( p * 2.4 + vec2( uSeed, uSeed * 0.7 - k * 2.2 ) );
    float n2 = tplN( vec2( ang * 4.0 + uSeed, d * 3.0 - k * 5.0 ) );
    float r = 0.28 + 0.66 * ek;
    float dd = d + ( n - 0.5 ) * ( 0.55 + 0.4 * k ) - ( n2 - 0.5 ) * 0.25;
    float body = 1.0 - smoothstep( r * 0.7, r, dd );
    float heat = ( 1.0 - dd / max( r, 0.01 ) ) * 1.15 + ( n - 0.5 ) * 0.5 - k * 0.95;
    float keep = smoothstep( k * 0.85 - 0.05, k * 0.85 + 0.2, n * 0.7 + body * 0.45 );
    c = mix( uB * 0.75, uA, smoothstep( 0.0, 0.4, heat ) );
    c = mix( c, uCore * uGain, smoothstep( 0.45, 0.85, heat ) );
    a = body * keep * smoothstep( -0.35, 0.1, heat );
  } else if ( uMode < 1.5 ) {
    // CELESTIAL: a hot core, a starburst of thin rays and a fine ring.
    float r = 0.15 + 0.8 * ek;
    float core = exp( -d * d * mix( 26.0, 60.0, k ) ) * ( 1.0 - k );
    float rays = pow( abs( cos( ang * 4.0 + uSpin ) ), 60.0 ) + 0.6 * pow( abs( cos( ang * 4.0 + 0.785 + uSpin ) ), 90.0 );
    rays *= smoothstep( 1.0, 0.1, d ) * ( 1.0 - k ) * smoothstep( 0.0, 0.08, d );
    float ring = exp( -pow( ( d - r ) * 16.0, 2.0 ) ) * ( 1.0 - k );
    float n = tplN( vec2( ang * 3.0 + uSeed, d * 6.0 - k * 4.0 ) );
    c = mix( uA, uB, smoothstep( 0.2, 0.8, n ) * ring + rays * 0.6 );
    c = mix( c, uCore * uGain, clamp( core * 1.4 + rays * 0.5, 0.0, 1.0 ) );
    a = clamp( core + rays * 0.9 + ring * 0.8, 0.0, 1.0 );
  } else {
    // HOLO: a square shell that grows, scanlines and a glitch tear.
    float tear = step( 0.82, tplH( vec2( floor( p.y * 9.0 ), floor( k * 24.0 ) + uSeed ) ) );
    vec2 q = p + vec2( tear * 0.12 * ( tplH( vec2( k, uSeed ) ) - 0.5 ), 0.0 );
    float box = max( abs( q.x ), abs( q.y ) );
    float r = 0.2 + 0.75 * ek;
    float shell = exp( -pow( ( box - r ) * 18.0, 2.0 ) ) * ( 1.0 - k );
    float inner = exp( -pow( ( box - r * 0.55 ) * 26.0, 2.0 ) ) * ( 1.0 - k ) * 0.6;
    float core = exp( -d * d * 30.0 ) * ( 1.0 - k );
    float scan = 0.7 + 0.3 * sin( vUv.y * 120.0 );
    c = mix( uA, uB, tear + 0.4 * step( 0.5, fract( ( q.x + q.y ) * 3.0 ) ) * inner );
    c = mix( c, uCore * uGain, core );
    a = clamp( ( shell + inner + core ) * scan, 0.0, 1.0 );
  }
  gl_FragColor = vec4( c, a * uOpacity );
}
`;

// ----------------------------------------------------------------- head --
// A camera-facing quad stretched down the shot's heading: vP is the pixel's
// place in head radii, x forward (the head sits at 0), y across.
const HEAD_VERT = /* glsl */ `
uniform vec3 uCenter;
uniform vec3 uDir;
uniform float uSize;
uniform float uLen;
uniform float uStretch;
varying vec2 vP;
void main() {
  vec4 mv = viewMatrix * vec4( uCenter, 1.0 );
  vec2 d = ( viewMatrix * vec4( uDir, 0.0 ) ).xy;
  float dl = length( d );
  d = dl > 1e-4 ? d / dl : vec2( 1.0, 0.0 );
  vec2 n = vec2( -d.y, d.x );
  float r = uSize * 0.5;
  // S3: the head stretches along its travel (uStretch 1 is round); vP keeps
  // the core round in its own stretched space.
  float along = mix( -uLen - r * uStretch, r * 1.6 * uStretch, position.x + 0.5 );
  float across = position.y * 3.2 * r;
  mv.xy += d * along + n * across;
  vP = vec2( along / uStretch, across ) / r;
  gl_Position = projectionMatrix * mv;
}
`;
const HEAD_FRAG = /* glsl */ `
uniform vec3 uCore;
uniform vec3 uA;
uniform vec3 uB;
uniform float uMode;
uniform float uT;
uniform float uSeed;
uniform float uOpacity;
uniform float uGain;
uniform float uLenR;
varying vec2 vP;
${NOISE}
void main() {
  vec2 p = vP;
  float dh = length( p );
  float ang = atan( p.y, p.x );
  float tail = clamp( -p.x / max( uLenR, 0.01 ), 0.0, 1.0 );
  float behind = step( p.x, 0.0 );
  vec3 c;
  float a;
  if ( uMode < 0.5 ) {
    // FIRE: a blazing comet. A white-hot head, flame licking back down a
    // tail that narrows and breaks up into fire at its end.
    float n = tplF( vec2( p.x * 0.8 + uT * 7.0 + uSeed, p.y * 1.4 ) );
    float w = mix( 1.05, 0.1, pow( tail, 0.8 ) );
    float edge = abs( p.y ) + ( n - 0.5 ) * 0.9 * ( 0.2 + tail );
    float body = behind * ( 1.0 - smoothstep( w * 0.45, w, edge ) ) * ( 1.0 - smoothstep( 0.8, 1.0, tail + ( n - 0.5 ) * 0.3 ) );
    float headG = exp( -dh * dh * 2.2 );
    float hot = exp( -dh * dh * 9.0 );
    float heat = headG * 0.9 + body * ( 1.0 - tail ) * 0.75 - abs( p.y ) * 0.25 + ( n - 0.5 ) * 0.5;
    c = mix( uB * 0.9, uA, smoothstep( 0.0, 0.5, heat ) );
    c = mix( c, uCore * uGain, clamp( hot * 1.1 + smoothstep( 0.85, 1.1, heat ) * 0.5, 0.0, 1.0 ) );
    a = clamp( headG + body * ( 0.55 + 0.45 * ( 1.0 - tail ) ), 0.0, 1.0 );
  } else if ( uMode < 1.5 ) {
    // CELESTIAL: a star orb (a hot core, four turning rays), a ring of runes
    // round it, an ethereal ribbon of stardust light streaming behind.
    float core = exp( -dh * dh * 8.0 );
    float halo = exp( -dh * dh * 1.6 ) * 0.45;
    float rays = ( pow( abs( cos( ang * 2.0 + uT * 3.0 ) ), 40.0 ) + 0.5 * pow( abs( cos( ang * 2.0 + 0.785 + uT * 3.0 ) ), 60.0 ) ) * smoothstep( 1.6, 0.2, dh );
    float ring = exp( -pow( ( dh - 1.15 ) * 9.0, 2.0 ) );
    float runes = step( 0.4, fract( ang * 1.909 + uT * 0.8 ) ) * step( fract( ang * 5.727 + uT * 0.8 ), 0.7 );
    ring *= 0.4 + 0.6 * runes;
    float rib = behind * exp( -p.y * p.y * 5.0 / ( 0.25 + 0.75 * ( 1.0 - tail ) ) ) * pow( 1.0 - tail, 1.4 );
    float tw = tplN( vec2( p.x * 2.0 - uT * 6.0 + uSeed, p.y * 3.0 ) );
    c = mix( uA, uB, clamp( smoothstep( 0.3, 0.8, tw ) * rib + rays * 0.5 + ring * 0.45, 0.0, 1.0 ) );
    c = mix( c, uCore * uGain, clamp( core * 1.1 + rays * 0.25, 0.0, 1.0 ) );
    a = clamp( core + halo + rays * 0.7 + ring * 0.9 + rib * 0.85 * ( 0.55 + 0.45 * tw ), 0.0, 1.0 );
  } else {
    // HOLO: a neon laser bolt with clean vector edges, a white core,
    // scanlines running down it and rows that tear sideways (the glitch).
    float row = floor( p.x * 2.0 + uT * 25.0 );
    float tear = step( 0.84, tplH( vec2( row, floor( uT * 20.0 ) + uSeed ) ) );
    vec2 q = p + vec2( 0.0, tear * 0.4 * ( tplH( vec2( row, uSeed ) ) - 0.5 ) );
    float live = q.x > 0.0 ? 1.0 : 1.0 - smoothstep( 0.8, 1.0, tail );
    float dl = q.x > 0.0 ? length( q ) : abs( q.y );
    float core = exp( -dl * dl * 20.0 ) * live * ( q.x > 0.0 ? 1.0 : 1.0 - tail * 0.5 );
    float edge = exp( -pow( ( dl - 0.6 ) * 9.0, 2.0 ) ) * live * ( q.x > 0.0 ? 1.0 : 1.0 - tail * 0.7 );
    float scan = 0.72 + 0.28 * sin( p.x * 9.0 - uT * 40.0 );
    c = mix( uA, uB, clamp( tear + edge * 0.6, 0.0, 1.0 ) );
    c = mix( c, uCore * uGain, clamp( core, 0.0, 1.0 ) );
    a = clamp( ( core * 1.1 + edge * 0.85 ) * scan + tear * 0.25 * live * exp( -dl * dl * 2.0 ), 0.0, 1.0 );
  }
  gl_FragColor = vec4( c, a * uOpacity );
}
`;

// --------------------------------------------------------------- sparks --
const SPARK_VERT = /* glsl */ `
attribute vec3 aA;
attribute vec3 aB;
attribute vec4 aC;
attribute float aW;
varying vec2 vUv;
varying vec4 vC;
void main() {
  vUv = uv;
  vC = aC;
  vec4 a = viewMatrix * vec4( aA, 1.0 );
  vec4 b = viewMatrix * vec4( aB, 1.0 );
  vec3 p = mix( a.xyz, b.xyz, uv.x );
  vec2 d = b.xy - a.xy;
  float l = length( d );
  vec2 nrm = l > 1e-5 ? vec2( -d.y, d.x ) / l : vec2( 0.0, 1.0 );
  float w = aW * mix( 0.3, 1.0, uv.x );
  p.xy += nrm * ( uv.y - 0.5 ) * w;
  gl_Position = projectionMatrix * vec4( p, 1.0 );
}
`;
const SPARK_FRAG = /* glsl */ `
uniform vec3 uCore;
varying vec2 vUv;
varying vec4 vC;
void main() {
  float across = 1.0 - abs( vUv.y - 0.5 ) * 2.0;
  float along = vUv.x;
  float hot = smoothstep( 0.55, 1.0, across ) * smoothstep( 0.5, 1.0, along );
  vec3 c = mix( vC.rgb, uCore, hot );
  float a = pow( across, 1.4 ) * ( 0.15 + 0.85 * along ) * vC.a;
  gl_FragColor = vec4( c, a );
}
`;

// ----------------------------------------------------------------- dust --
const SIZE_SCALE = 2.41; // world-unit point size, as render/vfx/particles.js
const dustTex = {};
function getDustTexture(kind) {
  if (dustTex[kind]) return dustTex[kind];
  const S = 64;
  const H = S / 2;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'lighter';
  if (kind === 'square') {
    const gr = g.createRadialGradient(H, H, 0, H, H, H);
    gr.addColorStop(0, 'rgba(255,255,255,0.5)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    g.fillStyle = 'rgba(255,255,255,1)';
    g.fillRect(H - 8, H - 8, 16, 16);
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.fillRect(H - 13, H - 1.5, 26, 3);
  } else {
    // A four-point sparkle over a soft dot.
    const gr = g.createRadialGradient(H, H, 0, H, H, H * 0.55);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.3, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    for (const [w, h] of [[H * 0.95, 2.2], [2.2, H * 0.95]]) {
      const lg = g.createRadialGradient(H, H, 0, H, H, Math.max(w, h));
      lg.addColorStop(0, 'rgba(255,255,255,1)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg;
      g.fillRect(H - w, H - h, w * 2, h * 2);
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  dustTex[kind] = t;
  return t;
}

let planeGeo = null;
let arcGeo = null;

export function createTemplateKit({ stage, cosmetic }) {
  const root = new Group();
  root.name = 'vfxtplkit';
  stage.scene.add(root);
  const rnd = (a, b) => cosmetic.range(a, b);
  planeGeo ??= markShared(new PlaneGeometry(1, 1, 1, 1));
  arcGeo ??= markShared(new PlaneGeometry(1, 1, 48, 1));
  for (const f of ['arcane', 'sun', 'hex']) for (const l of ['outer', 'inner']) getCircleTexture(f, l);
  for (const k of ['star', 'square']) getDustTexture(k);
  let time = 0;
  let lightGain = 1;

  function makePool(cap, build) {
    const slots = [];
    for (let i = 0; i < cap; i++) {
      const s = build();
      s.live = false;
      s.obj.visible = false;
      root.add(s.obj);
      slots.push(s);
    }
    let cursor = 0;
    return {
      slots,
      take() {
        for (let i = 0; i < cap; i++) {
          const s = slots[(cursor + i) % cap];
          if (!s.live) {
            cursor = (cursor + i + 1) % cap;
            return s;
          }
        }
        let oldest = slots[0];
        for (const s of slots) if (s.age - s.delay > oldest.age - oldest.delay) oldest = s;
        return oldest;
      },
      live: () => slots.reduce((n, s) => n + (s.live ? 1 : 0), 0),
    };
  }
  // Crowd dimming: a burst landing where many template pieces already glow
  // comes in fainter, so a stacked fight stays readable instead of blowing
  // out to white (each piece is additive under the bloom).
  const near = (s, x, z) => s.live && s.cx !== undefined && (s.cx - x) ** 2 + (s.cz - z) ** 2 < 4;
  let crowdPools = [];
  function crowd(x, z) {
    let n = 0;
    for (const pool of crowdPools) for (const s of pool.slots) if (near(s, x, z)) n++;
    return Math.max(0.4, 1 / (1 + 0.09 * Math.max(0, n - 1))); // n counts the new piece too
  }
  const start = (s, o, life) => {
    s.live = true;
    s.cx = o.x;
    s.cz = o.z;
    s.age = 0;
    s.owe = 0;
    s.delay = o.delay ?? 0;
    s.life = life;
    s.obj.visible = s.delay <= 0;
  };

  // --------------------------------------------------------------- circle --
  const circles = makePool(TPL_CAPS.circle, () => {
    const mk = () =>
      new MeshBasicMaterial({ map: getCircleTexture('arcane', 'outer'), color: new Color(), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
    const outer = mk();
    const inner = mk();
    const g = new Group();
    const a = new Mesh(planeGeo, outer);
    const b = new Mesh(planeGeo, inner);
    b.position.z = 0.004;
    a.renderOrder = -5;
    b.renderOrder = -5;
    g.add(a);
    g.add(b);
    return { obj: g, outer, inner, a, b };
  });
  // opts: x, y, z, radius, face ('arcane' | 'sun' | 'hex'), outer, inner
  // (hex), life, spin (rad/s), opacity, delay, stand (rad: stand it up facing
  // that XZ heading, at the caster's hand), grow (radius gain over life).
  function circle(o) {
    const s = circles.take();
    start(s, o, o.life ?? 0.9);
    const face = o.face ?? 'arcane';
    s.outer.map = getCircleTexture(face, 'outer');
    s.inner.map = getCircleTexture(face, 'inner');
    s.outer.color.copy(soft(o.outer ?? '#A24BFF'));
    s.inner.color.copy(soft(o.inner ?? o.outer ?? '#FFC94A'));
    s.r = o.radius ?? 1;
    s.spin = o.spin ?? 1.4;
    s.op = (o.opacity ?? 0.9) * (0.55 + 0.45 * lightGain) * crowd(o.x, o.z);
    s.grow = o.grow ?? 0.08;
    s.obj.position.set(o.x, o.y ?? 0.035, o.z);
    if (o.stand !== undefined) {
      s.obj.rotation.set(0, -o.stand + Math.PI / 2, 0);
    } else s.obj.rotation.set(-Math.PI / 2, 0, 0);
    s.a.rotation.z = rnd(0, Math.PI * 2);
    s.b.rotation.z = rnd(0, Math.PI * 2);
    s.obj.scale.setScalar(0.01);
    return s;
  }
  function stepCircle(s, t, dt) {
    const k = t / s.life;
    const pop = Math.min(1, t / 0.14);
    const back = 1 + 0.12 * Math.sin(pop * Math.PI); // a little overshoot
    const sc = s.r * 2 * (0.55 + 0.45 * pop) * back * (1 + s.grow * k);
    s.obj.scale.set(sc, sc, sc);
    s.a.rotation.z += s.spin * dt;
    s.b.rotation.z -= s.spin * 1.5 * dt;
    const f = (t < 0.06 ? t / 0.06 : 1) * (k < 0.55 ? 1 : Math.pow(1 - (k - 0.55) / 0.45, 1.5));
    s.outer.opacity = s.op * f;
    s.inner.opacity = s.op * f * (0.85 + 0.15 * Math.sin(t * 18));
  }

  // ----------------------------------------------------------------- beam --
  const beams = makePool(TPL_CAPS.beam, () => {
    const u = {
      uBase: { value: new Vector3() },
      uH: { value: 3 },
      uW: { value: 0.5 },
      uCore: { value: new Color() },
      uGlow: { value: new Color() },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uSeed: { value: 0 },
      uGain: { value: 1 },
    };
    const mat = new ShaderMaterial({ uniforms: u, vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide });
    const mesh = new Mesh(planeGeo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 8;
    return { obj: mesh, u };
  });
  // opts: x, z, y (base), height, width, core, glow, life, opacity, delay, gain.
  function beam(o) {
    if (lightGain <= 0) return null;
    const s = beams.take();
    start(s, o, o.life ?? 0.6);
    const u = s.u;
    u.uBase.value.set(o.x, o.y ?? 0, o.z);
    s.h = o.height ?? 3.2;
    s.w = o.width ?? 0.6;
    u.uH.value = s.h;
    u.uW.value = s.w;
    u.uCore.value.copy(col(o.core ?? '#FFF4D6'));
    u.uGlow.value.copy(soft(o.glow ?? '#A24BFF'));
    u.uSeed.value = rnd(0, 50);
    u.uGain.value = o.gain ?? 1.15;
    s.op = (o.opacity ?? 0.9) * lightGain * crowd(o.x, o.z);
    u.uOpacity.value = 0;
    return s;
  }
  function stepBeam(s, t) {
    const k = t / s.life;
    const u = s.u;
    u.uTime.value = time;
    const open = 1 - Math.pow(1 - Math.min(1, t / 0.08), 2);
    u.uW.value = s.w * (0.35 + 0.65 * open) * (1 - 0.6 * k);
    u.uH.value = s.h * (0.6 + 0.4 * open);
    u.uOpacity.value = s.op * (k < 0.1 ? k / 0.1 : Math.pow(1 - (k - 0.1) / 0.9, 1.3));
  }

  // ---------------------------------------------------------------- blaze --
  const blazes = makePool(TPL_CAPS.blaze, () => {
    const u = {
      uRadius: { value: 1 },
      uWidth: { value: 0.3 },
      uStart: { value: 0 },
      uSpan: { value: 1 },
      uY: { value: 0.45 },
      uLift: { value: 0.12 },
      uTaper: { value: 1 },
      uCore: { value: new Color() },
      uA: { value: new Color() },
      uB: { value: new Color() },
      uOpacity: { value: 0 },
      uHead: { value: 0 },
      uTail: { value: 1 },
      uTime: { value: 0 },
      uSeed: { value: 0 },
      uMode: { value: 0 },
      uGain: { value: 1.2 },
      uSwipe: { value: 0 },
    };
    const mat = new ShaderMaterial({ uniforms: u, vertexShader: BLAZE_VERT, fragmentShader: BLAZE_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide });
    const mesh = new Mesh(arcGeo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 7;
    return { obj: mesh, u };
  });
  // opts as kit.slash: x, z, angle, radius, width, span, sweep, life, y, lift,
  // taper, tail, reverse, delay, opacity, gain; plus mode ('fire' | 'wave'),
  // core / a / b (hex: hot core, main tone, deep tone), grow (radius gain
  // over life: a wave travels outward), ring (true: a full circle).
  function blaze(o) {
    const s = blazes.take();
    start(s, o, o.life ?? 0.34);
    const u = s.u;
    const span = o.ring ? Math.PI * 2 : o.span ?? Math.PI * 0.6;
    s.ring = !!o.ring;
    s.sweep = Math.max(0.01, o.ring ? 0.01 : o.sweep ?? 0.08);
    s.r0 = o.radius ?? 1;
    s.grow = o.grow ?? 0.08;
    s.w0 = o.width ?? 0.3;
    s.op = (o.opacity ?? 1) * crowd(o.x, o.z);
    s.tail = o.ring ? 2 : o.tail ?? 0.9;
    s.obj.position.set(o.x, 0, o.z);
    u.uStart.value = (o.angle ?? 0) - span / 2;
    u.uSpan.value = span;
    if (o.reverse) {
      u.uStart.value = (o.angle ?? 0) + span / 2;
      u.uSpan.value = -span;
    }
    u.uY.value = o.y ?? 0.45;
    u.uLift.value = o.lift ?? 0.16;
    u.uTaper.value = o.ring ? 0 : o.taper ?? 1;
    u.uCore.value.copy(col(o.core ?? '#FFF3C4'));
    u.uA.value.copy(col(o.a ?? '#FFB43C'));
    u.uB.value.copy(col(o.b ?? '#F5952E'));
    u.uMode.value = o.mode === 'wave' ? 1 : 0;
    u.uSwipe.value = o.swipe && !o.ring ? 1 : 0;
    u.uGain.value = o.gain ?? 1.25;
    u.uSeed.value = rnd(0, 60);
    u.uRadius.value = s.r0;
    u.uWidth.value = s.w0;
    u.uHead.value = o.ring ? 2 : 0;
    u.uTail.value = s.tail;
    u.uOpacity.value = 0;
    return s;
  }
  function stepBlaze(s, t) {
    const u = s.u;
    const k = Math.min(1, t / s.life);
    u.uTime.value = time;
    if (s.ring) {
      const e = 1 - Math.pow(1 - k, 3);
      u.uRadius.value = s.r0 * (0.25 + 0.75 * e) * (1 + s.grow * k);
      u.uWidth.value = s.w0 * (1 - 0.5 * k);
      u.uOpacity.value = s.op * (k < 0.08 ? k / 0.08 : Math.pow(1 - (k - 0.08) / 0.92, 1.3));
      return;
    }
    const h = Math.min(1, t / s.sweep);
    u.uHead.value = 1 - (1 - h) * (1 - h) + (t > s.sweep ? ((t - s.sweep) / Math.max(0.01, s.life - s.sweep)) * s.tail * 1.1 : 0);
    u.uRadius.value = s.r0 * (1 + s.grow * k);
    u.uWidth.value = s.w0 * (1 - 0.3 * k);
    u.uOpacity.value = s.op * (t < s.sweep ? 1 : Math.pow(1 - k, 1.1));
  }

  // ---------------------------------------------------------------- blast --
  const blasts = makePool(TPL_CAPS.blast, () => {
    const u = {
      uCenter: { value: new Vector3() },
      uSize: { value: 1 },
      uCore: { value: new Color() },
      uA: { value: new Color() },
      uB: { value: new Color() },
      uK: { value: 0 },
      uSeed: { value: 0 },
      uMode: { value: 0 },
      uOpacity: { value: 0 },
      uSpin: { value: 0 },
      uGain: { value: 1.2 },
    };
    const mat = new ShaderMaterial({ uniforms: u, vertexShader: BLAST_VERT, fragmentShader: BLAST_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending });
    const mesh = new Mesh(planeGeo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 10;
    return { obj: mesh, u };
  });
  const BLAST_MODE = { fire: 0, celestial: 1, holo: 2 };
  crowdPools = [circles, beams, blazes, blasts];

  // ----------------------------------------------------------------- head --
  const heads = makePool(TPL_CAPS.head, () => {
    const u = {
      uCenter: { value: new Vector3() },
      uDir: { value: new Vector3(1, 0, 0) },
      uSize: { value: 0.4 },
      uLen: { value: 0.5 },
      uLenR: { value: 2.5 },
      uStretch: { value: 1 },
      uCore: { value: new Color() },
      uA: { value: new Color() },
      uB: { value: new Color() },
      uMode: { value: 0 },
      uT: { value: 0 },
      uSeed: { value: 0 },
      uOpacity: { value: 0 },
      uGain: { value: 1.3 },
    };
    const mat = new ShaderMaterial({ uniforms: u, vertexShader: HEAD_VERT, fragmentShader: HEAD_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending });
    const mesh = new Mesh(planeGeo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 11;
    return { obj: mesh, u };
  });
  let headTokens = 0;
  // opts: x, y, z, dx, dz (heading), size (u across the head), len (u of
  // tail), mode ('fire' | 'celestial' | 'holo'), core, a, b (hex), opacity,
  // gain. Returns the slot; it lives until endHead(). The caller keeps the
  // token it is handed and moves the head only while slot.token matches
  // (a full pool recycles the oldest head).
  function head(o) {
    const s = heads.take();
    start(s, o, Infinity);
    s.token = ++headTokens;
    s.ending = -1;
    const u = s.u;
    u.uCore.value.copy(col(o.core ?? '#FFF3C4'));
    u.uA.value.copy(col(o.a ?? '#FFB43C'));
    u.uB.value.copy(col(o.b ?? '#F5952E'));
    u.uMode.value = BLAST_MODE[o.mode] ?? 0;
    u.uSeed.value = rnd(0, 40);
    u.uGain.value = o.gain ?? 1.3;
    u.uOpacity.value = 0;
    u.uStretch.value = o.stretch ?? 1;
    s.op = o.opacity ?? 1;
    s.drain = 0;
    moveHead(s, o.x, o.y ?? 0.55, o.z, o.dx ?? 1, o.dz ?? 0, o.len ?? 0.5, o.size ?? 0.4);
    return s;
  }
  function moveHead(s, x, y, z, dx, dz, len, size, stretch = null) {
    const u = s.u;
    if (stretch != null) u.uStretch.value = Math.max(1, stretch);
    u.uCenter.value.set(x, y, z);
    const l = Math.hypot(dx, dz);
    if (l > 1e-5) u.uDir.value.set(dx / l, 0, dz / l);
    if (size != null) u.uSize.value = size;
    u.uLen.value = Math.max(0, len);
    u.uLenR.value = Math.max(0.01, len / (u.uSize.value * 0.5 * u.uStretch.value));
    s.cx = x;
    s.cz = z;
  }
  // drain (S5): the head stays at its contact and its tail flows into it
  // over the fade, instead of flaring open where it lies.
  function endHead(s, fade = 0.1, drain = false) {
    if (!s.live || s.ending >= 0) return;
    s.ending = fade;
    s.fade = fade;
    s.drain = drain ? s.u.uLen.value : 0;
  }
  function stepHead(s, t, dt) {
    const u = s.u;
    u.uT.value = t;
    if (s.ending >= 0) {
      s.ending -= dt;
      if (s.ending <= 0) {
        s.life = t; // the update loop parks it next frame
        u.uOpacity.value = 0;
        return;
      }
      const k = s.ending / s.fade;
      if (s.drain > 0) {
        // The tail runs into the contact; the head holds bright until the
        // last of it arrives, then goes.
        u.uLen.value = s.drain * k;
        u.uLenR.value = Math.max(0.01, u.uLen.value / (u.uSize.value * 0.5 * u.uStretch.value));
        u.uOpacity.value = s.op * Math.min(1, k * 2.5);
        return;
      }
      u.uOpacity.value = s.op * k;
      u.uSize.value *= 1 + dt * 3; // it flares open as it goes
      return;
    }
    u.uOpacity.value = s.op * Math.min(1, t / 0.04);
  }
  // opts: x, y, z, size (u across), mode ('fire' | 'celestial' | 'holo'),
  // core, a, b (hex), life, opacity, delay, spin, gain.
  function blast(o) {
    const s = blasts.take();
    start(s, o, o.life ?? 0.45);
    const u = s.u;
    u.uCenter.value.set(o.x, o.y ?? 0.5, o.z);
    s.size = o.size ?? 1.4;
    u.uSize.value = s.size;
    u.uCore.value.copy(col(o.core ?? '#FFF3C4'));
    u.uA.value.copy(col(o.a ?? '#FFB43C'));
    u.uB.value.copy(col(o.b ?? '#F5952E'));
    u.uMode.value = BLAST_MODE[o.mode] ?? 0;
    u.uSeed.value = rnd(0, 40);
    u.uSpin.value = rnd(0, 3);
    s.spinRate = o.spin ?? 0.8;
    u.uGain.value = o.gain ?? 1.3;
    u.uK.value = 0;
    s.op = (o.opacity ?? 1) * crowd(o.x, o.z);
    u.uOpacity.value = 0;
    return s;
  }
  function stepBlast(s, t, dt) {
    const k = Math.min(1, t / s.life);
    const u = s.u;
    u.uK.value = k;
    u.uSpin.value += s.spinRate * dt;
    u.uSize.value = s.size * (0.8 + 0.2 * Math.min(1, t / 0.05));
    u.uOpacity.value = s.op * Math.min(1, t / 0.02);
  }

  // --------------------------------------------------------- dust clouds --
  function makeCloud(cap, tex) {
    const geo = new BufferGeometry();
    const position = new Float32Array(cap * 3);
    const color = new Float32Array(cap * 4);
    const aSize = new Float32Array(cap);
    geo.setAttribute('position', new BufferAttribute(position, 3));
    geo.setAttribute('color', new BufferAttribute(color, 4));
    geo.setAttribute('aSize', new BufferAttribute(aSize, 1));
    geo.setDrawRange(0, 0);
    const material = new PointsMaterial({ map: getDustTexture(tex), transparent: true, depthWrite: false, blending: AdditiveBlending, vertexColors: true, sizeAttenuation: true, size: 1 });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = 'attribute float aSize;\n' + shader.vertexShader.replace('gl_PointSize = size;', 'gl_PointSize = aSize;');
    };
    const pts = new Points(geo, material);
    pts.frustumCulled = false;
    pts.renderOrder = 9;
    root.add(pts);
    const P = [];
    for (let i = 0; i < cap; i++) P.push({ live: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1, size: 0.1, r: 1, g: 1, b: 1, op: 1, ph: 0, tw: 0, grav: 0, drag: 0, sw: 0, cx: 0, cz: 0, delay: 0 });
    let cursor = 0;
    return {
      pts,
      take() {
        for (let i = 0; i < cap; i++) {
          const p = P[(cursor + i) % cap];
          if (!p.live) {
            cursor = (cursor + i + 1) % cap;
            return p;
          }
        }
        const p = P[cursor];
        cursor = (cursor + 1) % cap;
        return p;
      },
      step(dt) {
        let n = 0;
        for (const p of P) {
          if (!p.live) continue;
          p.age += dt;
          if (p.age < p.delay) continue;
          const t = p.age - p.delay;
          if (t >= p.life) {
            p.live = false;
            continue;
          }
          const dk = Math.max(0, 1 - p.drag * dt);
          p.vx *= dk;
          p.vy = p.vy * dk - p.grav * dt;
          p.vz *= dk;
          if (p.sw) {
            // Swirl: orbit the spawn centre while drifting.
            const ox = p.x - p.cx;
            const oz = p.z - p.cz;
            p.vx += -oz * p.sw * dt;
            p.vz += ox * p.sw * dt;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          const k = t / p.life;
          const tw = p.tw ? 0.55 + 0.45 * Math.sin(p.ph + t * p.tw) : 1;
          const fade = (k < 0.12 ? k / 0.12 : 1) * (k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1);
          position[n * 3] = p.x;
          position[n * 3 + 1] = p.y;
          position[n * 3 + 2] = p.z;
          color[n * 4] = p.r;
          color[n * 4 + 1] = p.g;
          color[n * 4 + 2] = p.b;
          color[n * 4 + 3] = p.op * fade * (0.6 + 0.4 * tw);
          aSize[n] = p.size * SIZE_SCALE * (0.7 + 0.5 * tw);
          n++;
        }
        geo.setDrawRange(0, n);
        if (n) {
          geo.attributes.position.needsUpdate = true;
          geo.attributes.color.needsUpdate = true;
          geo.attributes.aSize.needsUpdate = true;
        }
        return n;
      },
      clear() {
        for (const p of P) p.live = false;
        geo.setDrawRange(0, 0);
      },
      live: () => P.reduce((n, p) => n + (p.live ? 1 : 0), 0),
    };
  }
  const starCloud = makeCloud(TPL_CAPS.dust, 'star');
  const bitCloud = makeCloud(TPL_CAPS.bits, 'square');
  let particleGain = 1;
  const _c = new Color();
  // n particles at (x, y, z). opts: color, color2 (each particle picks one
  // of the two), tex ('star' | 'square'), radius (spawn jitter), speed [a,b]
  // (u/s outward), up [a,b] (u/s), size [a,b] (u), life [a,b] (s), gravity
  // (u/s^2, negative floats up), drag (1/s), swirl (rad/s^2 about the spawn
  // point), twinkle (rad/s; 0 = steady), opacity, dir {x,z} + dirBias, delay.
  function dust(x, y, z, n, o = {}) {
    const cloud = o.tex === 'square' ? bitCloud : starCloud;
    const c = Math.round(n * particleGain);
    const sp = o.speed ?? [0.1, 0.6];
    const up = o.up ?? [0.2, 0.8];
    const sz = o.size ?? [0.06, 0.12];
    const lf = o.life ?? [0.8, 1.4];
    const jit = o.radius ?? 0.3;
    for (let i = 0; i < c; i++) {
      const p = cloud.take();
      p.live = true;
      p.age = 0;
      p.delay = (o.delay ?? 0) + (o.stagger ? rnd(0, o.stagger) : 0);
      const a = rnd(0, Math.PI * 2);
      const r = jit * Math.sqrt(rnd(0, 1));
      p.x = x + Math.cos(a) * r;
      p.y = y + rnd(-0.1, 0.1) * (o.yJitter ?? 1);
      p.z = z + Math.sin(a) * r;
      p.cx = x;
      p.cz = z;
      let hx = Math.cos(a);
      let hz = Math.sin(a);
      if (o.dir) {
        const b = o.dirBias ?? 0.6;
        hx = hx * (1 - b) + o.dir.x * b;
        hz = hz * (1 - b) + o.dir.z * b;
        const l = Math.hypot(hx, hz) || 1;
        hx /= l;
        hz /= l;
      }
      const v = rnd(sp[0], sp[1]);
      p.vx = hx * v;
      p.vz = hz * v;
      p.vy = rnd(up[0], up[1]);
      p.size = rnd(sz[0], sz[1]);
      p.life = rnd(lf[0], lf[1]);
      p.grav = o.gravity ?? -0.2;
      p.drag = o.drag ?? 1.4;
      p.sw = o.swirl ?? 0;
      p.tw = o.twinkle ?? 14;
      p.ph = rnd(0, 6.28);
      p.op = o.opacity ?? 0.95;
      _c.copy(soft(o.color2 && rnd(0, 1) < (o.mix ?? 0.5) ? o.color2 : o.color ?? '#FFF4D6'));
      p.r = _c.r;
      p.g = _c.g;
      p.b = _c.b;
    }
  }

  // --------------------------------------------------------------- sparks --
  const SPK = TPL_CAPS.sparks;
  const sgeo = new InstancedBufferGeometry();
  sgeo.index = planeGeo.index;
  sgeo.setAttribute('position', planeGeo.attributes.position);
  sgeo.setAttribute('uv', planeGeo.attributes.uv);
  const aA = new Float32Array(SPK * 3);
  const aB = new Float32Array(SPK * 3);
  const aC = new Float32Array(SPK * 4);
  const aW = new Float32Array(SPK);
  sgeo.setAttribute('aA', new InstancedBufferAttribute(aA, 3));
  sgeo.setAttribute('aB', new InstancedBufferAttribute(aB, 3));
  sgeo.setAttribute('aC', new InstancedBufferAttribute(aC, 4));
  sgeo.setAttribute('aW', new InstancedBufferAttribute(aW, 1));
  sgeo.instanceCount = 0;
  const smat = new ShaderMaterial({
    uniforms: { uCore: { value: col('#FFFFFF') } },
    vertexShader: SPARK_VERT,
    fragmentShader: SPARK_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  const sparkMesh = new Mesh(sgeo, smat);
  sparkMesh.frustumCulled = false;
  sparkMesh.renderOrder = 9;
  root.add(sparkMesh);
  const SP = [];
  for (let i = 0; i < SPK; i++) SP.push({ live: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 0.3, len: 0.05, w: 0.04, r: 1, g: 1, b: 1, op: 1, grav: 0, drag: 0, delay: 0, floor: 0 });
  let spCursor = 0;
  // n sharp sparks at (x, y, z). opts: color, color2, speed [a,b], up [a,b],
  // life [a,b], len (s of velocity drawn as its tail: the motion blur),
  // width [a,b], gravity, drag, dir {x,z} + dirBias, spread (rad around dir),
  // radius (spawn jitter), opacity, delay, stagger.
  function sparks(x, y, z, n, o = {}) {
    const c = Math.round(n * particleGain);
    const sp = o.speed ?? [2, 5];
    const up = o.up ?? [0.5, 2];
    const lf = o.life ?? [0.18, 0.4];
    const wd = o.width ?? [0.025, 0.05];
    for (let i = 0; i < c; i++) {
      let p = null;
      for (let j = 0; j < SPK; j++) {
        const q = SP[(spCursor + j) % SPK];
        if (!q.live) {
          spCursor = (spCursor + j + 1) % SPK;
          p = q;
          break;
        }
      }
      if (!p) {
        p = SP[spCursor];
        spCursor = (spCursor + 1) % SPK;
      }
      p.live = true;
      p.age = 0;
      p.delay = (o.delay ?? 0) + (o.stagger ? rnd(0, o.stagger) : 0);
      const jr = o.radius ?? 0.05;
      p.x = x + rnd(-jr, jr);
      p.y = y;
      p.z = z + rnd(-jr, jr);
      let a = rnd(0, Math.PI * 2);
      if (o.dir) {
        const base = Math.atan2(o.dir.z, o.dir.x);
        a = rnd(0, 1) < (o.dirBias ?? 0.75) ? base + rnd(-(o.spread ?? 0.6), o.spread ?? 0.6) : a;
      }
      const v = rnd(sp[0], sp[1]);
      p.vx = Math.cos(a) * v;
      p.vz = Math.sin(a) * v;
      p.vy = rnd(up[0], up[1]);
      p.life = rnd(lf[0], lf[1]);
      p.len = o.len ?? 0.045;
      p.w = rnd(wd[0], wd[1]);
      p.grav = o.gravity ?? 6;
      p.drag = o.drag ?? 2.2;
      p.op = o.opacity ?? 1;
      p.floor = o.floor ?? 0.03;
      _c.copy(col(o.color2 && rnd(0, 1) < 0.5 ? o.color2 : o.color ?? '#FFB43C'));
      p.r = _c.r;
      p.g = _c.g;
      p.b = _c.b;
    }
  }
  function stepSparks(dt) {
    let n = 0;
    for (const p of SP) {
      if (!p.live) continue;
      p.age += dt;
      if (p.age < p.delay) continue;
      const t = p.age - p.delay;
      if (t >= p.life) {
        p.live = false;
        continue;
      }
      const dk = Math.max(0, 1 - p.drag * dt);
      p.vx *= dk;
      p.vz *= dk;
      p.vy = p.vy * dk - p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < p.floor) {
        p.y = p.floor;
        p.vy = Math.abs(p.vy) * 0.3;
        p.vx *= 0.6;
        p.vz *= 0.6;
      }
      const k = t / p.life;
      aB[n * 3] = p.x;
      aB[n * 3 + 1] = p.y;
      aB[n * 3 + 2] = p.z;
      aA[n * 3] = p.x - p.vx * p.len;
      aA[n * 3 + 1] = p.y - p.vy * p.len;
      aA[n * 3 + 2] = p.z - p.vz * p.len;
      aC[n * 4] = p.r;
      aC[n * 4 + 1] = p.g;
      aC[n * 4 + 2] = p.b;
      aC[n * 4 + 3] = p.op * (1 - k * k);
      aW[n] = p.w * (1 - 0.5 * k);
      n++;
    }
    sgeo.instanceCount = n;
    if (n) {
      sgeo.attributes.aA.needsUpdate = true;
      sgeo.attributes.aB.needsUpdate = true;
      sgeo.attributes.aC.needsUpdate = true;
      sgeo.attributes.aW.needsUpdate = true;
    }
    return n;
  }

  // --------------------------------------------------------------- update --
  const POOLS = [
    [circles, stepCircle],
    [beams, stepBeam],
    [blazes, stepBlaze],
    [blasts, stepBlast],
    [heads, stepHead],
  ];
  const liveCount = { dust: 0, bits: 0, sparks: 0, held: 0 };
  // Render hold on hitstop (render/hold.js, VFX_HIT_RULES F1): a blade
  // template's blaze holds its sweep and a blast its burst, while the shared
  // shader time (the flame licks, the glitch) keeps running, so a held trail
  // still flickers. Rings, circles, beams, heads and the particle clouds run
  // on. A blast finishes its pop (0.05 s) before it may pause. -1: never held.
  const holdFloor = (pool, s) => (pool === blazes ? (s.ring ? -1 : 0) : pool === blasts ? 0.05 : -1);
  // hold: the render hold (renderHold), or null (the model lab, harness
  // scenes).
  function update(dt, hold = null) {
    time += dt;
    const due = hold ? hold.due : 0;
    const dueBorn = hold ? hold.dueBorn || 0 : 0;
    liveCount.held = 0;
    for (const [pool, step] of POOLS) {
      for (const s of pool.slots) {
        if (!s.live) continue;
        let d = dt;
        if (hold) {
          const floor = holdFloor(pool, s);
          if (floor >= 0) {
            const add = s.age > 0 ? due : dueBorn; // as in vfx/kit.js
            if (add > 0) s.owe = Math.min(HOLD_CAP, (s.owe || 0) + add);
            const t0 = s.age - s.delay;
            if (s.owe > 0 && (t0 < 0 || t0 >= floor)) {
              const h = Math.min(s.owe, d);
              s.owe -= h;
              d -= h;
              liveCount.held += 1;
            }
          }
        }
        s.age += d;
        const t = s.age - s.delay;
        if (t < 0) continue;
        if (!s.obj.visible) s.obj.visible = true;
        if (t >= s.life) {
          s.live = false;
          s.obj.visible = false;
          continue;
        }
        step(s, t, d);
      }
    }
    liveCount.dust = starCloud.step(dt);
    liveCount.bits = bitCloud.step(dt);
    liveCount.sparks = stepSparks(dt);
  }
  function clear() {
    let n = 0;
    for (const [pool] of POOLS)
      for (const s of pool.slots) {
        if (s.live) n += 1;
        s.live = false;
        s.owe = 0;
        s.obj.visible = false;
      }
    starCloud.clear();
    bitCloud.clear();
    for (const p of SP) p.live = false;
    sgeo.instanceCount = 0;
    return n;
  }
  function counts() {
    return { circles: circles.live(), beams: beams.live(), blazes: blazes.live(), blasts: blasts.live(), heads: heads.live(), dust: liveCount.dust, bits: liveCount.bits, sparks: liveCount.sparks, held: liveCount.held };
  }
  // Camp warm-up: one slot of each pool drawn for a few frames, and one
  // particle of each cloud parked out of sight, so no program compiles in
  // the first fight.
  function prewarm(visibleRoot) {
    for (const [pool] of POOLS) {
      const s = pool.slots[0];
      root.remove(s.obj);
      s.obj.visible = true;
      warmPark(visibleRoot, s.obj, (o) => {
        o.visible = false;
        o.frustumCulled = false;
        root.add(o);
      });
    }
    dust(0, -40, 0, 1, { life: [1, 1] });
    dust(0, -40, 0, 1, { tex: 'square', life: [1, 1] });
    sparks(0, -40, 0, 1, { life: [1, 1], floor: -50 });
  }
  function setIntensity({ light: l = 1, particles: p = 1 } = {}) {
    lightGain = l;
    particleGain = p;
  }
  return { root, circle, beam, blaze, blast, head, moveHead, endHead, dust, sparks, update, clear, counts, prewarm, setIntensity };
}
