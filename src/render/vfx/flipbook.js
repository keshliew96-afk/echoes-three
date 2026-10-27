// The flipbook primitive (VFX_HIT_RULES L4, §6.2 l): an effect animated with
// drawings, not by moving one drawing. Five code-drawn frames swapped every
// 2 ticks: drawing 1 is the thickest and brightest and carries the flash,
// then the strokes thin, break at their bends into pieces, keep one short
// fragment near the middle of each piece, and end on a hard cut (no alpha
// fade). The core dies faster than the glow.
//
// One book today: 'crit', a jagged burst of six lightning-like rays drawn at
// a crit's contact, camera-facing, tinted by its user (pale gold on the
// party's crits, so it never reads as Ember, heal green or corruption).
//
// Render-only; the drawings come from a fixed seed, randomness on the
// COSMETIC stream.
import { AdditiveBlending, CanvasTexture, Sprite, SpriteMaterial } from 'three';
import { TICK_HZ } from '../../core/constants.js';

export const FLIPBOOK = Object.freeze({
  frames: 5, // drawings
  ticksPer: 2, // L4: each drawing holds 2 ticks
  px: 128, // one drawing's size in the atlas
  rays: 6,
  size: 1.5, // u: the burst's span at size 1
  cap: 8,
});
export const FLIPBOOK_SEC = (FLIPBOOK.frames * FLIPBOOK.ticksPer) / TICK_HZ;

// A tiny fixed-seed stream so every boot draws the same book.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Each ray: a jagged polyline from near the centre to the rim, hard angles,
// its corners pushed out along the turn (L2).
function rays(n, rand) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const pts = [];
    const steps = 4;
    for (let k = 0; k <= steps; k++) {
      const r = 0.12 + (0.88 * k) / steps;
      const kink = k === 0 || k === steps ? 0 : (k % 2 ? 1 : -1) * (0.09 + rand() * 0.06);
      const a = a0 + kink;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    out.push(pts);
  }
  return out;
}

// Draw drawing f (0..4) into ctx at offset ox.
function drawFrame(ctx, f, ox, R, paths) {
  const S = FLIPBOOK.px;
  const c = S / 2;
  const P = (p) => [ox + c + p[0] * c * 0.94, c + p[1] * c * 0.94];
  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';
  // Widths: thick and bright first, then thinner. The core dies faster.
  const glowW = [14, 10, 7, 5, 4][f];
  const coreW = [5, 3, 2, 1.4, 1][f];
  const glowA = [0.55, 0.45, 0.35, 0.22, 0.12][f];
  const coreA = [1, 0.8, 0.55, 0.25, 0.06][f];
  const stroke = (pts, w, a) => {
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(...P(p)) : ctx.moveTo(...P(p))));
    ctx.stroke();
  };
  for (const pts of paths) {
    // 0-1: whole; 2: broken at one bend; 3: in 3 pieces (gaps at two bends);
    // 4: one short fragment near the middle of each piece.
    let pieces = [pts];
    if (f === 2) pieces = [pts.slice(0, 3), pts.slice(2)].map((q, i) => (i ? trimHead(q, 0.3) : q));
    if (f >= 3) pieces = [pts.slice(0, 2), trimHead(pts.slice(1, 4), 0.25), trimHead(pts.slice(3), 0.35)];
    if (f === 4) pieces = pieces.map((q) => midFragment(q, 0.35));
    for (const q of pieces) {
      stroke(q, glowW, glowA);
      stroke(q, coreW, coreA);
    }
  }
  // Drawing 1 carries the flash: a round white core.
  if (f <= 1) {
    const g = ctx.createRadialGradient(ox + c, c, 0, ox + c, c, c * (f ? 0.32 : 0.5));
    g.addColorStop(0, `rgba(255,255,255,${f ? 0.6 : 1})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ox, 0, S, S);
  }
}
// Cut the first frac of a polyline (a gap at its start).
function trimHead(pts, frac) {
  if (pts.length < 2) return pts;
  const [a, b] = pts;
  return [[a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac], ...pts.slice(1)];
}
// The short piece round a polyline's middle.
function midFragment(pts, frac) {
  if (pts.length < 2) return pts;
  const i = Math.floor((pts.length - 1) / 2);
  const a = pts[i];
  const b = pts[i + 1];
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const h = frac / 2;
  return [
    [m[0] - (b[0] - a[0]) * h, m[1] - (b[1] - a[1]) * h],
    [m[0] + (b[0] - a[0]) * h, m[1] + (b[1] - a[1]) * h],
  ];
}

// The atlas: the five drawings side by side. Null without a DOM (Node).
export function drawCritBook() {
  if (typeof document === 'undefined') return null;
  const S = FLIPBOOK.px;
  const cv = document.createElement('canvas');
  cv.width = S * FLIPBOOK.frames;
  cv.height = S;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const paths = rays(FLIPBOOK.rays, seeded(7));
  for (let f = 0; f < FLIPBOOK.frames; f++) drawFrame(ctx, f, f * S, S, paths);
  return cv;
}

// The drawing on screen `t` seconds in (-1 once the book has ended: a hard cut).
export function flipFrame(t) {
  const f = Math.floor((t * TICK_HZ) / FLIPBOOK.ticksPer);
  return f >= 0 && f < FLIPBOOK.frames ? f : -1;
}

export function createFlipbook({ root, cosmetic }) {
  const atlas = drawCritBook();
  const slots = [];
  let cursor = 0;
  let played = 0;
  if (atlas) {
    for (let i = 0; i < FLIPBOOK.cap; i++) {
      const tex = new CanvasTexture(atlas);
      tex.repeat.set(1 / FLIPBOOK.frames, 1);
      const mat = new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending });
      const sp = new Sprite(mat);
      sp.visible = false;
      sp.renderOrder = 6;
      root.add(sp);
      slots.push({ sp, mat, tex, t: 0, live: false, frame: -1 });
    }
  }
  // Play the crit book at (x, y, z), tinted hex, at size k.
  function play(x, y, z, hex, k = 1) {
    played += 1;
    if (!slots.length) return;
    const s = slots.find((q) => !q.live) ?? slots[cursor++ % slots.length];
    s.sp.position.set(x, y, z);
    const sz = FLIPBOOK.size * k;
    s.sp.scale.set(sz, sz, 1);
    s.mat.color.set(hex);
    s.mat.rotation = cosmetic ? cosmetic.range(0, Math.PI * 2) : 0;
    s.t = 0;
    s.frame = -1;
    s.live = true;
    show(s, 0);
  }
  function show(s, f) {
    if (f === s.frame) return;
    s.frame = f;
    if (f < 0) {
      s.live = false;
      s.sp.visible = false;
      return;
    }
    s.tex.offset.x = f / FLIPBOOK.frames;
    s.sp.visible = true;
  }
  function update(dt) {
    for (const s of slots) {
      if (!s.live) continue;
      s.t += dt;
      show(s, flipFrame(s.t));
    }
  }
  function clear() {
    for (const s of slots) show(s, -1);
  }
  return { play, update, clear, live: () => slots.filter((s) => s.live).length, played: () => played };
}
