// Stage: renderer, scene, lights, EffectComposer post stack, resize
// (BUILD_BRIEF §19.5). Pass chain:
//   RenderPass -> UnrealBloomPass -> OutputPass -> ShaderPass(grade)
// OutputPass performs ACES filmic tonemapping + linear->sRGB conversion (the
// composer renders into linear half-float buffers, so the renderer's implicit
// output transform does not apply); the grade/vignette shader then works in
// display space. Composer target uses 4x MSAA so outline edges stay crisp.
import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  HalfFloatType,
  HemisphereLight,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { MAX_PIXEL_RATIO, POST } from '../core/constants.js';
import { PALETTE } from '../data/palette.js';
import { createCamera, updateCameraAspect } from './camera.js';

// ---------------------------------------------------------------------------
// EXPOSURE / POST TUNING (round-4 remediation, critique F2).
//
// Round 3 measured 0.008% of the frame above luma 200 and only 9 of 16
// luminance buckets used — the frame had no light in it. The cause was a chain
// of three compounding cuts, all of them here:
//
//   * three.js is physically-lit: a DirectionalLight of intensity I lands on an
//     up-facing surface as I/PI. At the shipped key 2.1 + hemisphere 2.15 that
//     is a TOTAL irradiance of ~0.75 — i.e. every albedo in the scene was being
//     DARKENED before it ever reached the tonemapper.
//   * ACES then compresses again (three multiplies by exposure/0.6 and fits the
//     RRT+ODT curve), so a 0.10 linear floor lands at display 89, not 130-150.
//   * a 0.35 vignette crushed the corners a further 35% on top of that.
//
// The numbers below are solved against the ACES curve rather than eyeballed:
// display luma 140 on the open floor needs ~0.29 linear pre-tonemap, display 50
// in a shadow pocket needs ~0.05, and the bloom threshold has to sit under the
// emissive cores (a value of 0.75 linear = display ~185, so only real emitters
// bloom). Verified with tools/analyze.mjs on captured frames, never guessed.
// ---------------------------------------------------------------------------
export const EXPOSURE = 1.04; // ACES input gain (renderer.toneMappingExposure)
export const BLOOM = Object.freeze({
  threshold: 0.68, // linear; emitter cores are authored above 1.0
  strength: 1.15,
  radius: 0.6,
});
// CERTIFICATION FIX ROUND 1 (A-world, check 7): 0.16 measured as NO vignette
// on the combat frame (edge->interior rings 100.6 -> 115.5, +15%; bottom
// corners brighter than the centre) against the reference's 2x. 0.42 with
// the wider, cool-tinted falloff below lands the run frames at ~1.7-2x. The
// camp keeps its own 0.26 (scenes/camp.js) and is unaffected.
export const VIGNETTE = 0.42;
// Base (non-arena) light rig. Scenes may re-tune these; the arena does, in
// src/scenes/arena.js.
const KEY_INTENSITY = 3.6;
const FILL_INTENSITY = 2.0;

// Vignette + color grade in one final pass (§19.5: soft vignette ~0.35 at
// corners; slight warm lift, gentle contrast S-curve, ~5% saturation boost).
const GradeShader = {
  name: 'EchoesGradeShader',
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: VIGNETTE }, // 0 disables
    uGrade: { value: 1 }, // 0 disables
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uGrade;
    varying vec2 vUv;

    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 c = tex.rgb;

      if (uGrade > 0.5) {
        // Gentle contrast S-curve.
        vec3 s = c * c * (3.0 - 2.0 * c);
        c = mix(c, s, ${POST.gradeMix.toFixed(3)});
        // Split-tone (fix round 1, check 7 "visible grade"): shadows lean
        // indigo, the lit range is left alone. This is the cool wash the
        // reference carries in every unlit region; over the camp's night
        // ground it is invisible (already indigo), over Act-1 shade it turns
        // raw dark green into the blue-green shade end §19.3 asks for.
        float lm = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c *= mix(vec3(0.84, 0.90, 1.10), vec3(1.0), smoothstep(0.03, 0.42, lm));
        // Slight warm lift.
        c *= vec3(1.045, 1.010, 0.965);
        c += vec3(0.012, 0.006, 0.0);
        // ~5% saturation boost.
        float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(luma), c, ${POST.gradeSaturation.toFixed(3)});
      }

      if (uVignette > 0.0) {
        vec2 p = vUv - 0.5;
        float d = length(p) * 1.4142; // 0 at center, ~1 at corners
        // Wider falloff (starts at 0.30, was 0.40) and COOL: the darkened
        // corners lean indigo, so the frame's edges read as the night wood
        // rather than as a neutral dimmer.
        float v = uVignette * smoothstep(0.30, 1.0, d);
        c = mix(c, c * vec3(0.78, 0.86, 1.06), min(1.0, v * 1.2));
        c *= 1.0 - v;
      }

      gl_FragColor = vec4(clamp(c, 0.0, 1.0), tex.a);
    }
  `,
};


// toggles: { bloom, vignette, grade } booleans (URL-param driven, default on);
// msaa: composer target sample count (?msaa=N debug knob).
export function createStage({ container, toggles = {} } = {}) {
  const { bloom = true, vignette = true, grade = true, msaa = 4 } = toggles;
  const width = window.innerWidth;
  const height = window.innerHeight;

  // antialias:false — the default framebuffer only ever receives the
  // composer's fullscreen quad; AA happens via MSAA on the composer target.
  const renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  // ACES input gain. The composer renders to a HalfFloat target, so the
  // tonemap actually runs in OutputPass; the renderer property is what that
  // pass reads.
  renderer.toneMappingExposure = EXPOSURE;
  const pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height);
  (container ?? document.body).appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(PALETTE.voidCharcoal);

  // §19.3 lighting: warm directional key + cool fill, warm:cool ~= 70:30.
  // Colors derived from palette anchors (hearth amber key, signal-blue-leaning
  // cool sky), desaturated toward white so albedo stays readable.
  const keyColor = new Color(PALETTE.hearthAmber).lerp(new Color('#FFFFFF'), 0.55);
  const key = new DirectionalLight(keyColor, KEY_INTENSITY);
  key.position.set(4, 8, 3);
  scene.add(key);

  const skyColor = new Color(PALETTE.signalBlue).lerp(new Color('#FFFFFF'), 0.45);
  const groundColor = new Color(PALETTE.voidCharcoal);
  const fill = new HemisphereLight(skyColor, groundColor, FILL_INTENSITY);
  scene.add(fill);

  const camera = createCamera(width / height);

  // Composer over an MSAA half-float target (crisp outlines, HDR for bloom).
  const target = new WebGLRenderTarget(width * pixelRatio, height * pixelRatio, {
    type: HalfFloatType,
    samples: msaa,
  });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(width, height);

  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new Vector2(width, height),
    BLOOM.strength,
    BLOOM.radius,
    BLOOM.threshold
  );
  bloomPass.enabled = bloom;
  composer.addPass(bloomPass);

  // Bloom is a low-frequency effect: running its mip chain from half the
  // composer resolution is visually identical at gameplay zoom and roughly
  // halves the pass cost (matters on software GL, e.g. the capture harness).
  const sizeBloom = (w, h) => bloomPass.setSize(w / 2, h / 2);
  sizeBloom(width, height);

  composer.addPass(new OutputPass());

  const gradePass = new ShaderPass(GradeShader);
  gradePass.uniforms.uVignette.value = vignette ? VIGNETTE : 0;
  gradePass.uniforms.uGrade.value = grade ? 1 : 0;
  gradePass.enabled = vignette || grade;
  composer.addPass(gradePass);

  // msaa=0 falls back to FXAA (last, in display space) so edges are never raw.
  if (msaa === 0) composer.addPass(new FXAAPass());

  function resize(w = window.innerWidth, h = window.innerHeight) {
    const pr = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h);
    composer.setPixelRatio(pr);
    composer.setSize(w, h); // resizes both buffers + every pass
    sizeBloom(w, h); // re-apply half-res bloom after composer's full-res setSize
    updateCameraAspect(camera, w, h);
  }

  function render() {
    composer.render();
  }

  return { renderer, scene, camera, composer, bloomPass, gradePass, resize, render };
}
