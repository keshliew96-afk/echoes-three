// Fire emitters for the Act-1 arena: the flame sprite itself and the shared
// ember field that rides above every torch.
//
// A torch flame is NOT a white radial blob. Reference D renders every emitter
// as a white-hot core inside an orange body with a readable flame silhouette
// and a scatter of embers; an additive radial glow at 1.7x parchment clips
// straight to featureless white under bloom, which is exactly what an earlier
// cut shipped. So the flame is an alpha-blended sprite carrying a painted
// two-stop gradient (Parchment #F4EFE6 core -> Hearth Amber #E8A23D body ->
// transparent), sized small, with the additive halo kept as a SEPARATE, much
// dimmer sprite behind it. Only the small core sits above the bloom threshold,
// so the bloom pass produces a halo instead of a blowout.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DynamicDrawUsage,
  LinearSRGBColorSpace,
  Points,
  PointsMaterial,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
} from 'three';
import { PALETTE } from '../data/palette.js';
import { getRadialTexture } from '../render/glow.js';

let sharedFlameTexture = null;

export function getFlameTexture() {
  if (sharedFlameTexture) return sharedFlameTexture;
  const W = 128;
  const H = 192;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Teardrop silhouette: wide rounded base, narrow licking tip.
  const flamePath = (cx, baseY, halfW, topY, skew) => {
    ctx.beginPath();
    ctx.moveTo(cx - halfW, baseY);
    ctx.bezierCurveTo(cx - halfW * 1.12, baseY - (baseY - topY) * 0.45, cx - halfW * 0.62 + skew, topY + (baseY - topY) * 0.3, cx + skew, topY);
    ctx.bezierCurveTo(cx + halfW * 0.62 + skew, topY + (baseY - topY) * 0.3, cx + halfW * 1.12, baseY - (baseY - topY) * 0.45, cx + halfW, baseY);
    ctx.quadraticCurveTo(cx, baseY + halfW * 0.55, cx - halfW, baseY);
    ctx.closePath();
  };

  ctx.filter = 'blur(4px)';
  // Outer body: Hearth Amber, transparent at the tip.
  let g = ctx.createLinearGradient(0, H - 8, 0, 18);
  g.addColorStop(0, 'rgba(232,162,61,0.92)');
  g.addColorStop(0.45, 'rgba(232,162,61,0.80)');
  // Tip stops hold the green channel up: the old red-heavy tips put the
  // flame's edge pixels under hue 25 (the reserved Ember Danger band).
  g.addColorStop(0.82, 'rgba(214,146,54,0.32)');
  g.addColorStop(1, 'rgba(190,124,52,0)');
  ctx.fillStyle = g;
  flamePath(W / 2, H - 10, 46, 14, 4);
  ctx.fill();

  // Inner body: hotter amber-gold.
  ctx.filter = 'blur(3px)';
  g = ctx.createLinearGradient(0, H - 12, 0, 48);
  g.addColorStop(0, 'rgba(247,214,140,0.95)');
  g.addColorStop(0.6, 'rgba(243,186,95,0.75)');
  g.addColorStop(1, 'rgba(240,170,70,0)');
  ctx.fillStyle = g;
  flamePath(W / 2 + 2, H - 16, 26, 44, -3);
  ctx.fill();

  // White-hot core, low in the flame — with GAIN_MAX at 0.96 this is the ONLY
  // part above the bloom threshold, so bloom gives it a halo instead of eating
  // the whole flame.
  // ROUND D: grown 26 -> 33 px and its mid stop lifted. Capping the gain to
  // keep the SATURATED gold body out of the bloom pass cost the frame its
  // brightest pixels (variant 1 spawn: LUMA >200 1.14% -> 0.64%), and the
  // honest way to buy them back is to make the part that is ALLOWED to bloom
  // bigger, because it is near-neutral: this core measures HSV saturation
  // 0.13, and its mid stop 0.20 — both far under the analyzer's 0.35 gate, so
  // however much of it lands on the party it can only brighten them, never
  // rotate them into a reserved band.
  ctx.filter = 'blur(5px)';
  g = ctx.createRadialGradient(W / 2, H - 46, 0, W / 2, H - 46, 38);
  g.addColorStop(0, 'rgba(255,253,248,1.0)');
  g.addColorStop(0.42, 'rgba(255,251,240,0.95)');
  g.addColorStop(0.62, 'rgba(252,240,205,0.62)');
  g.addColorStop(0.85, 'rgba(246,214,140,0.24)');
  g.addColorStop(1, 'rgba(240,180,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // A couple of licking tongues so the silhouette is not a smooth teardrop.
  ctx.filter = 'blur(3px)';
  ctx.fillStyle = 'rgba(240,178,80,0.5)';
  flamePath(W / 2 - 18, H - 40, 11, 34, 6);
  ctx.fill();
  flamePath(W / 2 + 20, H - 46, 9, 52, -5);
  ctx.fill();
  ctx.filter = 'none';

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  sharedFlameTexture = tex;
  return tex;
}

// Alpha-blended flame billboard. size = world-space height.
// `gain` is an HDR multiplier applied in the LINEAR working space.
//
// GAIN CEILING (fix round 2 — the single measured cause of the residual
// reserved-band count AND of the collapsing cool share). The gain multiplies
// the WHOLE painted texture, not just its white core, so it decides how much
// of the flame clears the bloom pass's threshold:
//
//   linear luminance of the amber BODY  = 0.4333 * gain * 0.92 (its alpha)
//   linear luminance of the white CORE  = 0.8668 * gain
//   bloom threshold (render/stage.js)   = 0.68
//
// At the shipped gains (2.15 / 2.35) the amber body measured 0.86-0.94 — the
// ENTIRE orange flame was a bloom source, and UnrealBloomPass at radius 0.6
// smeared that orange energy over the whole frame as a low-frequency veil.
// Measured by hiding exactly the nine flame sprites on one load: the frame's
// reserved-band count fell 375 -> 26 px and its cool share rose 15.1% -> 32.7%.
// The veil was also warming every dark pixel by ~(+45,+25,+7): the identity
// rings' ink strokes rendered at rgb(71,53,44) h20 s0.38 instead of the
// authored rgb(26,28,37) h229 — i.e. the "sourceless" danger pixels were the
// bloom of the fires landing on the party's own ink.
//
// So the gain is capped where the module's own header always claimed it was:
// only the near-white core clears the threshold. GAIN_MAX = 1.6 keeps the body
// at 0.638 (under 0.68) and the core at 1.39 (over it). ACES compresses so hard
// up there that the flame's DISPLAY value barely moves — modelled, the body
// goes from display 238 to 231 — the change is almost entirely in what the
// bloom pass sees.
//
// ROUND D — 1.6 was solved against the wrong stop. The texture has THREE
// painted bodies, and 0.4333 is the OUTER one. Re-solved per stop (sRGB ->
// linear, Rec.709 luminance):
//
//   outer body   rgba(232,162,61,.92)   0.4335   x1.6 = 0.694   hue 36
//   licking tips rgba(240,178,80,.50)   0.5060   x1.6 = 0.810   hue 36
//   INNER body   rgba(247,214,140,.95)  0.6976   x1.6 = 1.116   hue 37
//   white core   rgba(244,239,230,.98)  0.8667   x1.6 = 1.387   hue 38, sat 0.13
//
// i.e. at 1.6 the inner gold body sat at 1.12 linear — 64% ABOVE the 0.68
// bloom threshold — so the thing UnrealBloomPass smeared over the frame was a
// heavily SATURATED amber, not the near-neutral core. Measured on one frozen
// frame with the party leashed into a brazier pool (tools/zd-layers.js,
// variant 3): hiding just the eleven flame sprites took the reserved-band
// count 641 -> 279 px, and the bloom's own addition sampled over the party
// measured (+27.6, +15.7, +9.3) — an add with HSV saturation 0.66, which is
// what turns dark party pixels (ink, shadowed fur, the Swordsman's wine
// tunic) into h5-25 Ember pixels no material-stage fix can reach.
//
// GAIN_MAX = 0.96 is the largest gain that keeps every COLOURED stop under the
// threshold (inner body 0.670 < 0.68) while the near-neutral white core still
// clears it at 0.832. The bloom skirt is therefore a saturation-0.13 cream:
// an additive that low in chroma cannot rotate anything it lands on into a
// reserved band, it can only brighten it. The flame's DISPLAY value barely
// moves — ACES at 1.04 exposure maps 0.83 to ~232 and 0.42 to ~194 — so the
// fire still reads as the brightest thing inside its own pool.
export const GAIN_MAX = 0.96;

export function makeFlameSprite(size = 0.34, opacity = 1, gain = 1) {
  const material = new SpriteMaterial({
    map: getFlameTexture(),
    transparent: true,
    depthWrite: false,
    opacity,
    toneMapped: false, // keeps the amber chromatic; the core still blooms
  });
  if (gain !== 1) {
    const g = Math.min(gain, GAIN_MAX);
    // The gain tint is now essentially NEUTRAL. It used to be (1, 0.97, 0.88),
    // which was described as "cream" but is a MULTIPLIER on an amber texture —
    // it made the overflow warmer, not cooler. With the body held under the
    // threshold the only thing that blooms is the painted parchment core, so
    // the skirt is cream by construction; the tiny residual warm bias here is
    // just enough that a fire never blooms blue-white.
    material.color.setRGB(g, g * 0.985, g * 0.955, LinearSRGBColorSpace);
  }
  const sprite = new Sprite(material);
  sprite.scale.set(size * 0.66, size, 1);
  return sprite;
}

// ---------------------------------------------------------------------------
// Ember field: one Points draw for every fire in the arena. Each ember rises
// from its emitter, drifts, and fades out, then recycles — the particle layer
// the reference-bar VFX rule asks every emitter to carry.
// ---------------------------------------------------------------------------
export function createEmberField(root, sources, cosmetic, perSource = 9) {
  const n = sources.length * perSource;
  if (n === 0) return { update() {}, count: 0 };
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const data = [];
  const hot = new Color(PALETTE.hearthAmber)
    .lerp(new Color(PALETTE.parchment), 0.35)
    .multiplyScalar(2.1); // HDR: embers are sparks, they belong above threshold
  const cool = new Color(PALETTE.hearthAmber).lerp(new Color(PALETTE.bruiseUmber), 0.3);

  for (const s of sources) {
    for (let i = 0; i < perSource; i++) {
      data.push({
        s,
        life: cosmetic.range(0.7, 1.7),
        t: cosmetic.range(0, 1.7),
        rise: cosmetic.range(0.35, 0.85),
        dx: cosmetic.range(-0.1, 0.1),
        dz: cosmetic.range(-0.1, 0.1),
        wob: cosmetic.range(0.02, 0.07),
        rate: cosmetic.range(3, 7),
        phase: cosmetic.range(0, Math.PI * 2),
      });
    }
  }

  const geo = new BufferGeometry();
  const posAttr = new BufferAttribute(pos, 3);
  posAttr.setUsage(DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  const colAttr = new BufferAttribute(col, 3);
  colAttr.setUsage(DynamicDrawUsage);
  geo.setAttribute('color', colAttr);

  const points = new Points(
    geo,
    new PointsMaterial({
      map: getRadialTexture(),
      size: 0.075,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  points.frustumCulled = false;
  points.renderOrder = 7;
  root.add(points);

  let last = null;
  function update(elapsed) {
    const dt = last === null ? 1 / 60 : Math.min(0.1, Math.max(0, elapsed - last));
    last = elapsed;
    for (let i = 0; i < data.length; i++) {
      const e = data[i];
      e.t += dt;
      if (e.t > e.life) e.t -= e.life * Math.ceil(e.t / e.life);
      const f = Math.max(0, e.t) / e.life;
      pos[i * 3] = e.s.x + e.dx * f + Math.sin(elapsed * e.rate + e.phase) * e.wob;
      pos[i * 3 + 1] = e.s.y + 0.04 + e.rise * f;
      pos[i * 3 + 2] = e.s.z + e.dz * f + Math.cos(elapsed * e.rate * 0.8 + e.phase) * e.wob;
      // Hot at birth, umber and fading at the top of the arc.
      const k = (1 - f) * (1 - f * 0.35);
      col[i * 3] = (hot.r * (1 - f) + cool.r * f) * k;
      col[i * 3 + 1] = (hot.g * (1 - f) + cool.g * f) * k;
      col[i * 3 + 2] = (hot.b * (1 - f) + cool.b * f) * k;
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  return { update, count: n };
}
