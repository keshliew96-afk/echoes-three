// RESERVED-BAND GUARD (Round D, polish criterion 1).
//
// BUILD_BRIEF §19.1 reserves Ember Danger `#FF5A36` for "enemy telegraphs +
// enemy attack VFX ONLY". The frame analyzer enforces that as a hue gate:
// a pixel counts as "danger" when hue is in [5, 25), HSV saturation > 0.35 and
// luma > 40. Round C measured 628-1408 such pixels on NO-ENEMY gameplay frames
// whenever the leashed party stands inside a brazier pool — with zero enemies
// on the field. Attribution (tools/zd-probe.js, an in-page A/B on ONE frozen
// frame): hiding the four party BODIES took variant 3 from 664 px to 33 and
// variant 1 from 186 px to 1. It was never a decal and never the rings: it is
// the arena's own warm key + point lights landing on saturated party albedo.
// The Swordsman's wine tunic #6B2E3A (hue 348, i.e. blue > green) is the worst
// case — a warm light with green > blue rotates it straight through 0 into the
// reserved band and it renders salmon-orange.
//
// The brief's answer is not "make the arena colder": §19.3 wants the warm
// pools. It is that danger hue belongs to threats alone. So the warm light is
// made PHYSICALLY INCAPABLE of pushing a non-threat surface into the reserved
// band: every LIT, non-threat material gets a fragment-stage guard that repels
// its outgoing hue out of the band, and only when the fragment is saturated
// enough to have counted (low-chroma warmth — lit fur, dirt, wood, the whole
// "warm pool" read — is left completely untouched, so the art direction is
// unchanged).
//
// Two properties make this surgical rather than a global colour hack:
//
//   * SATURATION GATE. The guard ramps in over `sat-0.05 .. sat` and is only
//     ever fully applied above the analyzer's own 0.35 gate. Warm-but-pale
//     pixels (the fires' pools on grass, lit cream fur, the dirt track) never
//     move, so HUEMIX / SAT / the warm-vs-cool story are preserved.
//   * ALBEDO-ANCHORED DIRECTION. The fragment knows its own base colour, so a
//     wine surface is repelled DOWN (back to the wine side of 0) and a warm
//     brown/amber surface is repelled UP (to the amber side of 25). A guarded
//     Swordsman reads as wine again instead of turning orange — the guard
//     restores class identity rather than trading it away.
//
// The injection point is `opaque_fragment`, i.e. LINEAR HDR before the composer
// runs. That is deliberate: the guarded value is also what UnrealBloomPass
// thresholds, so an in-band pixel cannot become an in-band bloom SOURCE either
// (bloom was the count's multiplier: 664 -> 86 px with bloom off).
//
// THREATS ARE EXEMPT. Enemy telegraph decals, chevrons, shot cores and trails
// are unlit (MeshBasicMaterial / additive sprites) and this guard only ever
// touches LIT materials, so they cannot be reached by construction; on top of
// that the whole `enemyfx` subtree is skipped by name and any material can opt
// out with `material.userData.noBandGuard = true`.
import { Vector4 } from 'three';

// Guard band in SIGNED degrees (hue 350 == -10). Wider than the analyzer's
// [5, 25) on both sides because the guard runs in linear space and ACES + the
// grade's warm lift (`c *= vec3(1.045, 1.010, 0.965)`, `+ vec3(.012,.006,0)`)
// rotate hue on the way to the screen. The margins are MEASURED, not guessed:
// tools/zd-hue.mjs sweeps the edges and reports where the display hue of a
// guarded party pixel lands (see docs note in the commit).
export const GUARD = Object.freeze({
  lo: -14, // repel-down target: hue 346, the wine side of the band
  hi: 34, // repel-up target: the amber side of the band
  sat: 0.30, // fully guarded at/above this HSV saturation (analyzer gates 0.35)
});

// One shared uniform object handed to every patched program, so the whole
// scene retunes in a single write (`setGuard`) — which is what lets a capture
// sweep the edges inside ONE page session instead of one build per value.
const guardUniform = { value: new Vector4(GUARD.lo, GUARD.hi, GUARD.sat, 1) };

const patched = new WeakSet();
let installed = 0;
let skipped = 0;

// GLSL: HSV hue repel. `d`/`mn`/`mx` are reused for the HSV round-trip so the
// fragment keeps its exact saturation and value — only the hue moves.
const GUARD_GLSL = /* glsl */ `
#include <opaque_fragment>
{
  vec3 gc = gl_FragColor.rgb;
  float gmx = max( gc.r, max( gc.g, gc.b ) );
  float gmn = min( gc.r, min( gc.g, gc.b ) );
  float gd = gmx - gmn;
  float gs = gmx > 0.0 ? gd / gmx : 0.0;
  float gw = smoothstep( uEchoesGuard.z - 0.05, uEchoesGuard.z, gs ) * uEchoesGuard.w;
  if ( gw > 0.0 && gd > 0.0 ) {
    float gh = gmx == gc.r
      ? mod( ( gc.g - gc.b ) / gd, 6.0 )
      : ( gmx == gc.g ? ( gc.b - gc.r ) / gd + 2.0 : ( gc.r - gc.g ) / gd + 4.0 );
    gh *= 60.0;
    float ghs = gh > 180.0 ? gh - 360.0 : gh;
    if ( ghs > uEchoesGuard.x && ghs < uEchoesGuard.y ) {
      // Direction comes from the material's own albedo: wine-family surfaces
      // (albedo hue past 180) are pushed back below 0, warm-family surfaces up
      // past the ceiling. Identity is restored, never traded.
      float amx = max( echoesAlbedo.r, max( echoesAlbedo.g, echoesAlbedo.b ) );
      float amn = min( echoesAlbedo.r, min( echoesAlbedo.g, echoesAlbedo.b ) );
      float ad = amx - amn;
      float ah = ad > 0.0
        ? ( amx == echoesAlbedo.r
            ? mod( ( echoesAlbedo.g - echoesAlbedo.b ) / ad, 6.0 )
            : ( amx == echoesAlbedo.g
                ? ( echoesAlbedo.b - echoesAlbedo.r ) / ad + 2.0
                : ( echoesAlbedo.r - echoesAlbedo.g ) / ad + 4.0 ) ) * 60.0
        : 40.0;
      float target = ah > 180.0 ? uEchoesGuard.x : uEchoesGuard.y;
      float nh = mix( ghs, target, gw );
      float hh = mod( mod( nh, 360.0 ) + 360.0, 360.0 ) / 60.0;
      float gx = gd * ( 1.0 - abs( mod( hh, 2.0 ) - 1.0 ) );
      vec3 rgb =
        hh < 1.0 ? vec3( gd, gx, 0.0 ) :
        hh < 2.0 ? vec3( gx, gd, 0.0 ) :
        hh < 3.0 ? vec3( 0.0, gd, gx ) :
        hh < 4.0 ? vec3( 0.0, gx, gd ) :
        hh < 5.0 ? vec3( gx, 0.0, gd ) : vec3( gd, 0.0, gx );
      gl_FragColor.rgb = rgb + vec3( gmn );
    }
  }
}
`;

function onBeforeCompileBandGuard(shader) {
  shader.uniforms.uEchoesGuard = guardUniform;
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <color_fragment>',
      '#include <color_fragment>\n  vec3 echoesAlbedo = diffuseColor.rgb;'
    )
    .replace('#include <opaque_fragment>', GUARD_GLSL);
  shader.fragmentShader = `uniform vec4 uEchoesGuard;\n${shader.fragmentShader}`;
}

function guardMaterial(mat) {
  if (!mat || patched.has(mat)) return false;
  // LIT materials only. Unlit ink, decals, telegraphs, glow sprites and every
  // additive VFX layer are MeshBasicMaterial / SpriteMaterial / PointsMaterial
  // and are therefore untouchable by construction — which is exactly what
  // keeps enemy Ember telegraphs and enemy shots inside the reserved band.
  if (!mat.isMeshToonMaterial) return false;
  if (mat.userData?.noBandGuard) return false;
  patched.add(mat);
  if (mat.onBeforeCompile && mat.onBeforeCompile.length > 0) {
    skipped++;
    return false; // someone else already owns this material's shader
  }
  mat.onBeforeCompile = onBeforeCompileBandGuard;
  mat.needsUpdate = true;
  installed++;
  return true;
}

// Subtrees that are THREAT surfaces (§19.1: Ember belongs to them) or that
// must never be recoloured.
const SKIP_NAMES = new Set(['enemyfx']);

function scan(root) {
  let n = 0;
  root.traverse((o) => {
    if (SKIP_NAMES.has(o.name)) return;
    for (let p = o.parent; p; p = p.parent) if (SKIP_NAMES.has(p.name)) return;
    const m = o.material;
    if (!m) return;
    if (Array.isArray(m)) { for (const s of m) if (guardMaterial(s)) n++; }
    else if (guardMaterial(m)) n++;
  });
  return n;
}

const guardEnabled = () =>
  typeof location === 'undefined' || new URLSearchParams(location.search).get('bandguard') !== '0';

// Guard a subtree NOW (gauntlet r4 J4-F1, INT — a minimal edit in M4b's file).
// The guard is part of a material's program (onBeforeCompile), so a material
// whose program is compiled or warm-drawn BEFORE the 30-frame rescan reaches it
// is linked twice: once unguarded at the warm-up, then again the moment the
// rescan patches it — on the first frames of the room that shows it (measured:
// the Level 1 monolith, toon + emissiveMap, relinked 0.2 s into every run for a
// 110-135 ms frame, 60-78 ms of it GetProgramiv waiting on the link). Whatever
// is about to be precompiled or parked calls this first, so the ONE program it
// warms is the one it will draw with. Call it once the subtree hangs under its
// final parent (the enemyfx exemption reads the parent chain).
export function guardSubtree(root) {
  if (!root || !guardEnabled()) return 0;
  return scan(root);
}

// Install on everything currently in `root`, and hand back a `rescan` the
// scene's update loop calls on a slow cadence so rigs built later (party
// critters spawned mid-run, props hot-added by another chain) are covered too.
// `?bandguard=0` disables the whole thing for A/B captures.
export function installBandGuard(root) {
  const enabled = guardEnabled();
  if (!enabled) {
    guardUniform.value.w = 0;
    return { rescan() {}, info: () => ({ enabled: false, materials: 0 }), setGuard };
  }
  scan(root);
  let frames = 0;
  return {
    // Cheap: a traverse every 30 frames (~0.5 s). Materials already seen are
    // in a WeakSet, so a repeat scan is pointer comparisons only.
    rescan() {
      if (++frames % 30) return;
      scan(root);
    },
    info: () => ({
      enabled: true,
      materials: installed,
      skipped,
      band: [guardUniform.value.x, guardUniform.value.y],
      sat: guardUniform.value.z,
    }),
    setGuard,
  };
}

// Debug/critic knob: retune the band on the live build (used by the capture
// probes to sweep the edges inside one page session).
export function setGuard(lo, hi, sat, on = 1) {
  guardUniform.value.set(lo, hi, sat, on);
}

export function bandGuardInfo() {
  return {
    materials: installed,
    skipped,
    band: [guardUniform.value.x, guardUniform.value.y],
    sat: guardUniform.value.z,
    on: guardUniform.value.w,
  };
}
