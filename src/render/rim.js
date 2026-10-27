// A view-angle rim light on a rig's own materials (VFX_HIT_RULES D1, §6.2 m):
// a thin bright edge round the body's silhouette, added to the material's
// emissive light, so it reads as a rim and never as a flat tint. One shader
// variant for every patched material (customProgramCacheKey), set per body
// through its uniform. Materials that are not three's lit mesh materials
// (the faceted rigs' own shaders) are left alone.
//
// Pure: no sim import, no DOM; render-only.
import { Color } from 'three';

const LIT = (m) => !!m && (m.isMeshToonMaterial || m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial);

export const RIM = Object.freeze({
  power: 3.2, // how thin the edge is (higher is thinner)
  gain: 1.6, // emissive gain at full
  // The envelope (s): it lights a frame after the hit and flares about 8
  // frames, holds at a third to a half, and is gone by 0.8 s (D1's safe
  // route). Tick time, so it holds through a hitstop.
  in: 1 / 60,
  flare: 8 / 60,
  settle: 0.2,
  level: 0.42,
  hold: 0.55,
  out: 0.8,
});

// Patch a material once; returns its rim colour uniform (or null).
export function addRim(mat) {
  if (!LIT(mat)) return null;
  if (mat.userData.rim) return mat.userData.rim;
  const u = { value: new Color(0, 0, 0) };
  mat.userData.rim = u;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, renderer) => {
    if (prev) prev.call(mat, sh, renderer);
    sh.uniforms.uRimColor = u;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\n{ float rimF = 1.0 - abs( dot( normal, normalize( vViewPosition ) ) ); totalEmissiveRadiance += uRimColor * pow( rimF, ${RIM.power.toFixed(2)} ); }`
      );
  };
  const key = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => `${key()}|rim1`;
  mat.needsUpdate = true;
  return u;
}

// The rim's strength `a` seconds after the hit (0..1).
export function rimLevel(a) {
  if (!(a >= RIM.in) || a >= RIM.out) return 0;
  if (a < RIM.flare) return 1;
  if (a < RIM.settle) return 1 - (1 - RIM.level) * ((a - RIM.flare) / (RIM.settle - RIM.flare));
  if (a < RIM.hold) return RIM.level;
  return RIM.level * (1 - (a - RIM.hold) / (RIM.out - RIM.hold));
}

// Write a body's rim: colour hex at level k (0 clears it).
const _c = new Color();
export function setRim(uniforms, hex, k) {
  if (!uniforms || !uniforms.length) return;
  if (k > 0) _c.set(hex).multiplyScalar(k * RIM.gain);
  else _c.setRGB(0, 0, 0);
  for (const u of uniforms) u.value.copy(_c);
}
