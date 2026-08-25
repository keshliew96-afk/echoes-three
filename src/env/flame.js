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
  g.addColorStop(0.82, 'rgba(214,120,44,0.32)');
  g.addColorStop(1, 'rgba(190,96,40,0)');
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

  // White-hot core, small and low — this is the ONLY part above the bloom
  // threshold, so bloom gives it a halo instead of eating the whole flame.
  ctx.filter = 'blur(5px)';
  g = ctx.createRadialGradient(W / 2, H - 46, 0, W / 2, H - 46, 26);
  g.addColorStop(0, 'rgba(244,239,230,0.98)');
  g.addColorStop(0.5, 'rgba(246,226,180,0.6)');
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
export function makeFlameSprite(size = 0.34, opacity = 1) {
  const material = new SpriteMaterial({
    map: getFlameTexture(),
    transparent: true,
    depthWrite: false,
    opacity,
    toneMapped: false, // keeps the amber chromatic; the core still blooms
  });
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
  const hot = new Color(PALETTE.hearthAmber).lerp(new Color(PALETTE.parchment), 0.35);
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
