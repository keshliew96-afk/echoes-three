// The local anime frame (VFX_HIT_RULES §2.13, §6.2 k): on a combo finisher
// and on an elite, champion or boss kill, a disc about 3 body widths in
// radius round the contact point turns to paper for 4 frames, with ink
// focus lines running in from its rim and a black spike star at the hit.
// The lines stop short of the centre, so the figures stay clear. The disc
// lies on the floor under the bodies, so they keep their colour standing on
// the paper and nothing of them is ever hidden. Outside the
// disc the screen keeps its colours and telegraphs; there is no full-screen
// panel and no polarity flicker (those wait for Kesh, §6.3 item 8). Ink and
// paper only: no reserved colour. Off under Effects: Reduced.
//
// Render-only; randomness from the COSMETIC stream.
import { Mesh, PlaneGeometry, ShaderMaterial, NormalBlending } from 'three';

export const ANIME_FX = Object.freeze({
  radius: 1.95, // u: about 3 bw
  life: 4 / 60, // s: 4 frames
  y: 0.035, // u: on the floor, over the floor decals
  paper: 0.9, // the paper's opacity at its centre
  lines: 40, // focus lines round the rim
  clear: 0.42, // the lines stop this far in (of the radius): the figures stay clear
  points: 9, // the spike star's points
  cap: 3,
});

const VERT = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xy * 2.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;
const FRAG = /* glsl */ `
uniform float uK;
uniform float uSeed;
uniform float uOpacity;
varying vec2 vP;
float h1( float n ) { return fract( sin( n * 91.7 + uSeed ) * 43758.5453 ); }
void main() {
  float r = length( vP );
  if ( r > 1.0 ) discard;
  float ang = atan( vP.y, vP.x );
  // Paper: near-white, its rim soft.
  float paper = ${ANIME_FX.paper.toFixed(2)} * ( 1.0 - smoothstep( 0.9, 1.0, r ) );
  // Focus lines: thin wedges from the rim, each its own length, tapering in.
  float n = ${ANIME_FX.lines.toFixed(1)};
  float cell = floor( ( ang + 3.14159265 ) / 6.2831853 * n );
  float f = fract( ( ang + 3.14159265 ) / 6.2831853 * n ) - 0.5;
  float inner = ${ANIME_FX.clear.toFixed(2)} + 0.3 * h1( cell );
  float w = 0.16 * smoothstep( inner, 1.0, r );
  float line = ( 1.0 - smoothstep( w * 0.6, w, abs( f ) ) ) * step( inner, r ) * step( 0.25, h1( cell + 7.0 ) );
  // The spike star at the contact: an ink burst that grows over the frames.
  float pts = ${ANIME_FX.points.toFixed(1)};
  float spike = pow( abs( cos( ang * pts * 0.5 + uSeed ) ), 6.0 );
  float sr = ( 0.12 + 0.2 * spike ) * ( 0.7 + 0.5 * uK );
  float star = 1.0 - smoothstep( sr - 0.02, sr, r );
  float ink = max( line, star );
  vec3 c = mix( vec3( 0.96, 0.95, 0.92 ), vec3( 0.04, 0.04, 0.05 ), ink );
  float a = max( paper, ink ) * uOpacity;
  gl_FragColor = vec4( c, a );
}
`;

export function createAnimeFx({ root, cosmetic }) {
  const geo = new PlaneGeometry(1, 1);
  const slots = [];
  for (let i = 0; i < ANIME_FX.cap; i++) {
    const mat = new ShaderMaterial({
      uniforms: { uK: { value: 0 }, uSeed: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });
    const mesh = new Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.set(ANIME_FX.radius * 2, ANIME_FX.radius * 2, 1);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    mesh.visible = false;
    root.add(mesh);
    slots.push({ mesh, mat, t: 0, live: false });
  }
  let cursor = 0;
  let played = 0;
  // (x, z): the contact point on the floor.
  function play(x, z) {
    const s = slots.find((q) => !q.live) ?? slots[cursor++ % slots.length];
    s.mesh.position.set(x, ANIME_FX.y, z);
    s.mat.uniforms.uSeed.value = cosmetic ? cosmetic.range(0, 40) : 0;
    s.t = 0;
    s.live = true;
    s.mesh.visible = true;
    played += 1;
  }
  function update(dt) {
    for (const s of slots) {
      if (!s.live) continue;
      s.t += dt;
      if (s.t >= ANIME_FX.life) {
        s.live = false;
        s.mesh.visible = false;
        continue;
      }
      const k = s.t / ANIME_FX.life;
      s.mat.uniforms.uK.value = k;
      s.mat.uniforms.uOpacity.value = 1;
    }
  }
  function clear() {
    for (const s of slots) {
      s.live = false;
      s.mesh.visible = false;
    }
  }
  return { play, update, clear, live: () => slots.filter((s) => s.live).length, played: () => played };
}
