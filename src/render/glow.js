// Canvas-generated radial glow sprite factory (BUILD_BRIEF §19.3: "every light
// emitter carries an additive radial glow sprite"). One shared radial texture;
// pooling arrives with the VFX block.
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from 'three';

let sharedRadialTexture = null;

// Soft radial falloff texture (white core -> transparent edge), generated once.
export function getRadialTexture() {
  if (sharedRadialTexture) return sharedRadialTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.16)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  sharedRadialTexture = tex;
  return tex;
}

// Additive glow halo sprite. opts: { color, size (world u), opacity }
export function makeGlowSprite({ color = '#FFFFFF', size = 1, opacity = 0.85 } = {}) {
  const material = new SpriteMaterial({
    map: getRadialTexture(),
    color: new Color(color),
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  material.opacity = opacity;
  const sprite = new Sprite(material);
  sprite.scale.set(size, size, 1);
  return sprite;
}
