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
  // 1.22 (fix round 2, check 7): the frame's >200 share is the one number all
  // three lenses scored this check down on. Only the near-neutral emitter
  // cores clear the threshold (env/flame.js GAIN_MAX), so the extra strength
  // grows a cream halo, not a saturated veil.
  strength: 1.35,
  radius: 0.6,
});
// CERTIFICATION FIX ROUND 1 (A-world, check 7): 0.16 measured as NO vignette
// on the combat frame (edge->interior rings 100.6 -> 115.5, +15%; bottom
// corners brighter than the centre) against the reference's 2x.
// 0.55 with the wider, cool-tinted, SHADOW-PROTECTED falloff below lands the
// run frames' corners at ~0.45x of centre (reference: centre 71.5, corners
// 18-42) without crushing an already-dark corner into dead flat blocks. The
// camp keeps its own 0.26 (scenes/camp.js) and is unaffected.
export const VIGNETTE = 0.82;
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
        c *= mix(vec3(0.76, 0.88, 1.18), vec3(1.0), smoothstep(0.02, 0.55, lm));
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
        // Falloff shaped so the CENTRE keeps its highlights (a wide, gentle ramp
        // took the frame's >200 share down with it) and the true frame EDGE
        // falls hard, and COOL: the darkened
        // corners lean indigo, so the frame's edges read as the night wood
        // rather than as a neutral dimmer.
        float v = uVignette * smoothstep(0.40, 1.0, d);
        // SHADOW-PROTECTED (fix round 1, checks 1+7). A plain multiply is the
        // wrong operator at this strength: it scales an 8x8 block's channel
        // SPREAD by the same factor as its mean, so a corner already sitting
        // at display 20 collapses under 4 counts and REFERENCE_BAR check 1
        // reads it as dead flat ground (measured: boss frame FLAT 5.6% ->
        // 22.4% when the vignette went 0.16 -> 0.42). Weighting the darkening
        // by how bright the pixel already is takes the LIT range down toward
        // the reference's centre:corner ratio and leaves the painted shade
        // pockets - which carry the black point - their texture.
        float vlm = dot(c, vec3(0.2126, 0.7152, 0.0722));
        float ve = v * mix(0.30, 1.0, smoothstep(0.02, 0.40, vlm));
        float tintW = min(1.0, v * 1.35) * (1.0 - smoothstep(0.10, 0.55, vlm));
        c = mix(c, c * vec3(0.66, 0.85, 1.20), tintW);
        c *= 1.0 - ve;
      }

      if (uGrade > 0.5) {
        // SHADOW DITHER (fix round 1, check 1). This pass runs AFTER
        // OutputPass, i.e. in display space, where an 8-bit step is 1/255.
        // The painted floor carries hue noise, litter, cracks and grain at
        // ~4% albedo contrast; multiplied by a dim corner's light that lands
        // at well under one 8-bit step, so a smooth dark gradient quantises
        // into single-value 8x8 blocks and REFERENCE_BAR check 1 reads the
        // dark half of a night arena as dead ground (boss frame: bright cells
        // FLAT 1-5%, cells under display luma 35 FLAT 50-76%). The dither is
        // the standard answer to exactly that banding: a static, screen-locked
        // +-3.7/255 in the shadows, tapering to +-0.4/255 above display ~120,
        // so the shadow micro-variation survives the 8-bit output and the lit
        // range is untouched.
        float dl = dot(c, vec3(0.2126, 0.7152, 0.0722));
        float damp = mix(0.030, 0.003, smoothstep(0.06, 0.45, dl));
        // sin-free hash (Jimenez-style): the capture harness rasterises in
        // software, where a per-pixel sin() over 1.44M pixels measured as a
        // real frame-time cost. Two fracts and a dot give the same white
        // noise for free.
        float dn = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        c += (dn - 0.5) * damp;
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
  // depth:false for the same reason (MEMORY, docs/MEMORY.md): a fullscreen
  // quad never depth-tests, and the scene's depth lives in the composer
  // target, so a canvas depth buffer was 4 bytes a pixel for nothing.
  const renderer = new WebGLRenderer({ antialias: false, depth: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  // ACES input gain. The composer renders to a HalfFloat target, so the
  // tonemap actually runs in OutputPass; the renderer property is what that
  // pass reads.
  renderer.toneMappingExposure = EXPOSURE;
  // @gnt:M1 RENDER-SCALE begin — initial pixel ratio x display.renderScale
  // (PLAN §5); M1 also owns resize() and adds setRenderScale() /
  // renderScale / drawingBufferSize() to the returned object.
  // Resolution scale: the renderer draws at min(dpr, MAX_PIXEL_RATIO) x
  // renderScale device px per CSS px (the canvas CSS size never changes, so
  // the DOM HUD and menus stay crisp and in place). The drawing buffer is
  // clamped to 3840x2160 (a 150% scale on a 4K-class window would otherwise
  // allocate 5760x3240 half-float MSAA targets). The app's display service
  // applies the persisted display.renderScale before the first frame.
  let renderScale = 1;
  let bufferClamped = false;
  const MAX_BUFFER_W = 3840;
  const MAX_BUFFER_H = 2160;
  function effectivePixelRatio(w, h) {
    const base = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO) * renderScale;
    const cap = Math.min(MAX_BUFFER_W / Math.max(1, w), MAX_BUFFER_H / Math.max(1, h));
    bufferClamped = base > cap + 1e-9;
    return Math.min(base, cap);
  }
  const pixelRatio = effectivePixelRatio(width, height);
  renderer.setPixelRatio(pixelRatio);
  // @gnt:M1 RENDER-SCALE end
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
  // MEMORY (docs/MEMORY.md): the composer's second buffer only ever receives
  // fullscreen passes (OutputPass, grade, FXAA), never the scene, so it needs
  // no depth buffer (and no MSAA under ?msaa=N). three clones the first
  // buffer for it; this one holds the same half-float colour, nothing else.
  composer.renderTarget2.dispose();
  composer.renderTarget2 = new WebGLRenderTarget(target.width, target.height, { type: HalfFloatType, depthBuffer: false });
  composer.renderTarget2.texture.name = 'EffectComposer.rt2';
  // The scene (RenderPass, ink, bloom) always lands in `target`: the
  // composer renders into its read buffer, so that buffer is pinned to it
  // before and after every frame. Without the pin an odd number of swapping
  // passes (the FXAA chain has three) trades the buffers each frame.
  const settleBuffers = () => {
    if (composer.readBuffer !== target) {
      composer.writeBuffer = composer.readBuffer;
      composer.readBuffer = target;
    }
  };
  settleBuffers();
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

  // @gnt:M1 RESIZE begin — keeps the render scale (and the buffer clamp).
  function resize(w = window.innerWidth, h = window.innerHeight) {
    const pr = effectivePixelRatio(w, h);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h);
    composer.setPixelRatio(pr);
    composer.setSize(w, h); // resizes both buffers + every pass
    sizeBloom(w, h); // re-apply half-res bloom after composer's full-res setSize
    updateCameraAspect(camera, w, h);
  }
  // @gnt:M1 RESIZE end

  function render() {
    settleBuffers();
    composer.render();
    settleBuffers();
    // @gnt:M2 THUMBNAIL begin — one onNextRender hook line (save thumbnail
    // read right after composer.render(), no preserveDrawingBuffer, §3.4).
    if (renderer.__echoesNextRender && renderer.__echoesNextRender.length) for (const fn of renderer.__echoesNextRender.splice(0)) fn(renderer.domElement);
    // @gnt:M2 THUMBNAIL end
  }

  // @gnt:M1 STAGE-API begin (setRenderScale / renderScale / drawingBufferSize)
  // setRenderScale(s) -> the applied scale (0.5..1.5); resizes every buffer at
  // once, so the next rendered frame already uses it.
  function setRenderScale(s) {
    const v = Math.min(1.5, Math.max(0.5, Number(s) || 1));
    if (v === renderScale) return renderScale;
    renderScale = v;
    resize();
    return renderScale;
  }
  // drawingBufferSize() -> { w, h } device px of the canvas drawing buffer,
  // plus the pixel ratio, scale, clamp flag and the canvas CSS box.
  function drawingBufferSize() {
    const c = renderer.domElement;
    return {
      w: c.width,
      h: c.height,
      pixelRatio: renderer.getPixelRatio(),
      scale: renderScale,
      clamped: bufferClamped,
      css: { w: c.clientWidth, h: c.clientHeight },
    };
  }
  const stageApi = {
    setRenderScale,
    drawingBufferSize,
    get renderScale() {
      return renderScale;
    },
  };
  // @gnt:M1 STAGE-API end
  return Object.defineProperties(
    { renderer, scene, camera, composer, bloomPass, gradePass, resize, render },
    Object.getOwnPropertyDescriptors(stageApi)
  );
}
