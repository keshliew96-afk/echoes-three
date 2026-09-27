// §17 portraits: "rendered head of the actual character model (render each
// class model to a 128^2 RenderTarget once at load)".
//
// Implementation note — we render into a THROWAWAY offscreen WebGLRenderer
// rather than a WebGLRenderTarget on the stage renderer. three.js only applies
// tone mapping + the sRGB output transform when the destination is the default
// framebuffer (WebGLProgram: `currentRenderTarget === null`), so a render
// target would hand back LINEAR pixels that then have to be ACES-fitted by
// hand. A second renderer whose canvas carries the same ACES/exposure settings
// as the stage gives the game's exact look for free, and `canvas.toDataURL()`
// is the read-back. The renderer is disposed immediately afterwards, so the
// cost is one context for a few frames at load.
import {
  Scene,
  OrthographicCamera,
  DirectionalLight,
  HemisphereLight,
  Color,
  WebGLRenderer,
  SRGBColorSpace,
  ACESFilmicToneMapping,
} from 'three';
import { createCritter, CRITTER_CLASSES, setInkViewport } from '../../render/critters/index.js';
import { EXPOSURE } from '../../render/stage.js';
import { PALETTE } from '../../data/palette.js';

// 256 px render, displayed at 70 virtual px -> the 2 px storybook ink line is
// authored against a 64 px viewport so it stays ~2 px at display size.
const RENDER_PX = 384;
const INK_REF_PX = 64;

// ART FENCE. The tile's TOP-LEFT chip band is reserved chrome (F-key, and the
// Critical HP numeral beside it) — commandbar.js/style.js never put chrome
// anywhere else on a portrait. Two per-class framing knobs keep the identity
// features out from under it:
//   xBias  fraction of the frame WIDTH the bust is pushed right, so a feature
//          that lives high on the silhouette clears the chip horizontally.
//   earPad extra crown headroom, in head radii, for a long-eared class.
// The archer's numbers come from a measured column profile of its own render:
// the hare's ears occupy x 37-60% and y 18-48% of the frame, and the "F4" chip
// covers x 0-53%, y 0-41% of the tile — so the ears were entirely behind it,
// which is why F4 read as the same round cream head as F1 (round-2 note a).
const FRAMING = {
  healer: { xBias: 0.09, earPad: 0.0 },
  tank: { xBias: 0.03, earPad: 0.0 },
  swordsman: { xBias: 0.11, earPad: 0.05 },
  archer: { xBias: 0.19, earPad: 0.1 },
};

// PARTY: the rendered heads, cached for every build page's party strip.
let CACHE = {};
export const portraitCache = () => CACHE;

export function renderClassPortraits({ cosmetic = null } = {}) {
  const out = {};
  CACHE = out;
  let renderer = null;
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(RENDER_PX, RENDER_PX, false);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = EXPOSURE;
    renderer.setClearColor(0x000000, 0);
  } catch (e) {
    return out; // no second context available: caller falls back to letter busts
  }

  const scene = new Scene();
  // Portrait light rig: the stage's warm key + cool fill, rotated to a
  // three-quarter front so eyes and ears read at 70 px, and lifted because a
  // portrait has no bounced ground light behind it.
  const keyColor = new Color(PALETTE.hearthAmber).lerp(new Color('#FFFFFF'), 0.5);
  const key = new DirectionalLight(keyColor, 4.6);
  key.position.set(1.6, 2.4, 3.2);
  scene.add(key);
  const rim = new DirectionalLight(new Color(PALETTE.parchment), 1.5);
  rim.position.set(-2.2, 1.4, -1.4);
  scene.add(rim);
  const skyColor = new Color(PALETTE.signalBlue).lerp(new Color('#FFFFFF'), 0.45);
  scene.add(new HemisphereLight(skyColor, new Color(PALETTE.voidCharcoal), 2.6));

  const cam = new OrthographicCamera(-1, 1, 1, -1, 0.01, 20);

  // The ink hull is a shared singleton material with a global viewport
  // uniform; set it for the portrait pass and restore the live canvas size
  // afterwards so the in-world party ink is untouched.
  setInkViewport(INK_REF_PX, INK_REF_PX);

  for (const classId of CRITTER_CLASSES) {
    let critter = null;
    try {
      critter = createCritter(classId, { cosmetic });
      critter.update(0);
      // Turn the body a few degrees off-axis: a dead-front chibi head is a
      // circle, a 3/4 head reads as a character.
      critter.setYaw(0.24);
      scene.add(critter.group);

      const M = critter.metrics;
      // Bust framing: crown to just below the chin/shoulder line. The identity
      // ring and contact shadow live at y ~ 0 and fall outside the frame, so
      // no explicit hiding is needed.
      // Ears are identity (the hare's especially), so the frame reaches for
      // earTopY, but never further than one head-radius above the crown — a
      // long-eared class would otherwise shrink its own face to nothing.
      const fr = FRAMING[classId] ?? { xBias: 0, earPad: 0 };
      const crown = Math.min(
        M.earTopY + 0.03,
        M.domeTopY + M.headR * (1.45 + fr.earPad * 4)
      );
      const bottom = M.chinY - M.headR * 0.45;
      // HEADROOM. The tile's top-left carries the F1-F4 key chip (26 of the
      // tile's 64 virtual px, a floor-driven size), so the bust is framed with
      // a 15% band of empty backdrop above the crown: the chip then lands on
      // plate, not on the character's ears or eyes.
      const top = crown + (crown - bottom) * 0.15;
      const half = Math.max(0.12, (top - bottom) / 2);
      const cy = (top + bottom) / 2;
      cam.left = -half;
      cam.right = half;
      cam.top = half;
      cam.bottom = -half;
      cam.near = 0.01;
      cam.far = 20;
      // Push the bust sideways inside its own frame (see ART FENCE above):
      // moving the CAMERA left slides the content right.
      const bias = -fr.xBias * half * 2;
      cam.position.set(bias, cy, 4);
      cam.lookAt(bias, cy, 0);
      cam.updateProjectionMatrix();

      renderer.render(scene, cam);
      out[classId] = renderer.domElement.toDataURL('image/png');
    } catch (e) {
      // leave this class without an image; the tile falls back to its bust glyph
    } finally {
      if (critter) scene.remove(critter.group);
    }
  }

  setInkViewport(window.innerWidth, window.innerHeight);

  try {
    renderer.dispose();
    renderer.forceContextLoss();
  } catch (e) {
    /* context already gone */
  }
  return out;
}
