// The Waystone (BUILD_BRIEF §11 defend objective): "a static rune monolith,
// 150 HP, warm amber rune glow". Friendly warmth — Hearth Amber runes on cool
// stone — deliberately OPPOSITE the act's violet corruption monolith prop, so
// the thing you defend and the thing that corrupts can never be confused.
// Ink + contact shadow like every hero prop (§19.2/§19.3).
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Color,
} from 'three';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow, exactColor, mix } from '../critters/common.js';
import { sharedGeo } from '../geocache.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { AdditiveBlending, CircleGeometry } from 'three';

// Cool stone derived off palette neutrals (env discipline: no invented hex).
const STONE = mix(PALETTE.warmGrey, PALETTE.voidCharcoal, 0.55).multiplyScalar(0.7);
const STONE_LIT = mix(PALETTE.warmGrey, PALETTE.bone, 0.4).multiplyScalar(0.42);

let runeTex = null;
function getRuneTexture() {
  if (runeTex) return runeTex;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  // A vertical run of angular rune strokes (glyph shapes, not letters).
  const seg = (x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  seg(32, 16, 32, 60);
  seg(32, 28, 52, 44);
  seg(32, 44, 14, 30);
  seg(18, 84, 46, 84);
  seg(32, 84, 32, 128);
  seg(18, 128, 46, 112);
  seg(32, 152, 52, 176);
  seg(52, 176, 14, 198);
  seg(32, 152, 32, 214);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  runeTex = tex;
  return tex;
}

export function buildWaystone() {
  const group = new Group();
  group.name = 'waystone';
  const mats = [];
  const track = (m) => {
    mats.push(m);
    return m;
  };
  const flash = (color) => track(toonMaterial({ color, emissive: '#FFFFFF', emissiveIntensity: 0 }));

  // Plinth + tapered 4-sided monolith.
  // One buffer per part for the whole game (F1): a Waystone is rebuilt on every
  // defend room, which is once a run.
  const base = new Mesh(sharedGeo('waystone-base', () => new BoxGeometry(0.72, 0.2, 0.6)), flash(STONE_LIT));
  base.position.y = 0.1;
  addInk(base);
  group.add(base);
  const column = new Mesh(sharedGeo('waystone-column', () => new CylinderGeometry(0.17, 0.27, 1.35, 4)), flash(STONE));
  column.rotation.y = Math.PI / 4;
  column.position.y = 0.86;
  addInk(column);
  group.add(column);
  const cap = new Mesh(sharedGeo('waystone-cap', () => new CylinderGeometry(0.05, 0.15, 0.22, 4)), flash(STONE_LIT));
  cap.rotation.y = Math.PI / 4;
  cap.position.y = 1.62;
  group.add(cap);

  // Warm amber rune strips (§11) — authored hot enough to bloom gently, so
  // the monolith reads as a LIT objective (§19.3 emitter rule).
  const runeMat = new MeshBasicMaterial({
    map: getRuneTexture(),
    color: exactColor(PALETTE.hearthAmber).multiplyScalar(1.6),
    transparent: true,
    toneMapped: false,
    depthWrite: false,
  });
  const runes = [];
  for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const strip = new Mesh(sharedGeo('waystone-rune', () => new PlaneGeometry(0.16, 1.05)), runeMat);
    const r = 0.235; // just proud of the tapered face at mid-height
    strip.position.set(Math.sin(ry) * r, 0.85, Math.cos(ry) * r);
    strip.rotation.y = ry;
    runes.push(strip);
    group.add(strip);
  }

  // Amber glow halo + warm ground pool + contact shadow.
  const halo = makeGlowSprite({ color: PALETTE.hearthAmber, size: 1.5, opacity: 0.5 });
  halo.position.y = 1.0;
  group.add(halo);
  const pool = new Mesh(
    sharedGeo('waystone-pool', () => new CircleGeometry(1.05, 26)),
    new MeshBasicMaterial({
      map: getRadialTexture(),
      color: new Color(PALETTE.hearthAmber),
      transparent: true,
      opacity: 0.4,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.014;
  group.add(pool);
  group.add(groundShadow(0.52, 0.42));

  return {
    group,
    mats,
    // Rune glow breathes; dims with the objective's remaining HP so damage
    // reads on the monolith itself (colour + brightness channel, §17).
    update(tSec, hpFrac) {
      const breathe = 1 + 0.12 * Math.sin(tSec * 1.3);
      const vigor = 0.35 + 0.65 * hpFrac;
      halo.material.opacity = 0.5 * breathe * vigor;
      pool.material.opacity = 0.4 * breathe * vigor;
      runeMat.color.copy(exactColor(PALETTE.hearthAmber)).multiplyScalar(0.7 + 0.9 * vigor * breathe);
    },
  };
}
