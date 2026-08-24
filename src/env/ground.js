// Act-1 ground: one canvas-painted floor texture per arena (§19.3 "no dead
// ground": hue-noise cells, macro dapple, dirt path, moss patches, leaf
// litter, cracks — all canvas-generated, no downloads), plus a dark apron
// plane beyond the walls so the island sits in a moody surround (reference C)
// instead of raw void. All randomness comes from the COSMETIC stream.
import { CanvasTexture, Mesh, PlaneGeometry, SRGBColorSpace } from 'three';
import { ARENA } from '../core/constants.js';
import { toonMaterial } from '../render/toon.js';

const TEX_W = 2048;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const hsl = (h, s, l, a = 1) =>
  `hsla(${Math.round(h)},${Math.round(clamp01(s) * 100)}%,${Math.round(clamp01(l) * 100)}%,${a})`;

// Stamp soft radial blobs along a world-space polyline.
function stampAlong(ctx, toC, pts, stepU, fn) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const segLen = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(1, Math.ceil(segLen / stepU));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      fn(ax + (bx - ax) * t, az + (bz - az) * t, i, toC);
    }
  }
}

function blob(ctx, x, y, radius, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function paintGroundCanvas(spec, cosmetic) {
  const fw = ARENA.halfW * 2;
  const fd = ARENA.halfD * 2;
  const W = TEX_W;
  const H = Math.round(W * (fd / fw));
  const ppu = W / fw; // pixels per world unit
  const cx = (wx) => (wx + ARENA.halfW) * ppu;
  const cz = (wz) => (wz + ARENA.halfD) * ppu;
  const toC = { cx, cz, ppu };
  const r = (a, b) => cosmetic.range(a, b);
  const g = spec.ground;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 1 — base fill.
  ctx.fillStyle = hsl(g.h, g.s, g.l);
  ctx.fillRect(0, 0, W, H);

  // 2 — hue-noise mottling: jittered rotated ellipses on a loose lattice (a
  // hard rect grid reads as a checkerboard at gameplay zoom — verified in
  // capture), lightness delta kept small so the noise stays organic.
  const cell = 20;
  for (let y = 0; y < H + cell; y += cell) {
    for (let x = 0; x < W + cell; x += cell) {
      ctx.fillStyle = hsl(g.h + r(-8, 8), g.s + r(-0.06, 0.07), g.l + r(-0.035, 0.035), 0.55);
      ctx.beginPath();
      ctx.ellipse(
        x + r(-8, 8),
        y + r(-8, 8),
        cell * r(0.55, 1.0),
        cell * r(0.4, 0.8),
        r(0, Math.PI),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  // 3 — macro dapple: large soft warm-light / cool-shade pools (§19.3 dappled
  // low-moderate value contrast; gradients only for large light falloff).
  // Alphas are tuned for the darker (post value-fix) base — a flat green field
  // is the reference bar's check-1 failure mode, so the dapple has to survive
  // the key light.
  for (let i = 0; i < 70; i++) {
    const R = r(90, 340);
    const warm = i % 2 === 0;
    const color = warm
      ? hsl(g.h - 26, g.s + 0.08, g.l + 0.1, 0.22)
      : hsl(g.h + 18, g.s + 0.06, Math.max(0.02, g.l - 0.07), 0.24);
    blob(ctx, r(0, W), r(0, H), R, color);
  }
  // Sun-bleached dry-grass patches: hue variety INSIDE the green family, so the
  // field never resolves to one flat value (reference bar check 1).
  for (let i = 0; i < 16; i++) {
    blob(ctx, r(0, W), r(0, H), r(70, 220), hsl(g.h - 34, 0.34, g.l + 0.12, 0.3));
  }
  // A few deep canopy shadows (bigger, darker) for real value range.
  for (let i = 0; i < 16; i++) {
    blob(ctx, r(0, W), r(0, H), r(180, 420), hsl(g.h + 22, 0.36, Math.max(0.015, g.l - 0.1), 0.3));
  }

  // 4 — dirt path(s): dark under-stroke, jittered dirt body, dry highlights,
  // pebbles. Dirt browns are the warm family (hue ~28) per §19.3 dirt-path
  // patches.
  const dirtH = g.dirtH ?? 28;
  const dirtL = g.dirtL ?? 0.2;
  for (const path of spec.paths) {
    // Blob radii are fractions of the HALF width (radius = w/2 keeps the
    // painted track at its authored width; the first cut rendered ~2.4x wide).
    const wPx = path.w * ppu;
    stampAlong(ctx, toC, path.pts, 0.09, (wx, wz) => {
      blob(ctx, cx(wx) + r(-6, 6), cz(wz) + r(-6, 6), wPx * 0.62, hsl(dirtH - 2, 0.3, dirtL * 0.6, 0.16));
    });
    stampAlong(ctx, toC, path.pts, 0.05, (wx, wz) => {
      const jx = r(-0.1, 0.1) * ppu;
      const jz = r(-0.1, 0.1) * ppu;
      blob(
        ctx,
        cx(wx) + jx,
        cz(wz) + jz,
        wPx * 0.42 * r(0.8, 1.1),
        hsl(dirtH + r(-4, 4), 0.32, dirtL + r(-0.03, 0.04), 0.62)
      );
    });
    stampAlong(ctx, toC, path.pts, 0.16, (wx, wz) => {
      blob(ctx, cx(wx) + r(-8, 8), cz(wz) + r(-8, 8), wPx * 0.17, hsl(dirtH + 6, 0.3, dirtL + 0.09, 0.3));
    });
    // Pebbles strewn across the beaten track.
    const perPath = Math.round(spec.ground.pebbleN / spec.paths.length);
    for (let i = 0; i < perPath; i++) {
      const seg = Math.floor(r(0, path.pts.length - 1));
      const [ax, az] = path.pts[seg];
      const [bx, bz] = path.pts[seg + 1];
      const t = r(0, 1);
      const px = cx(ax + (bx - ax) * t) + r(-wPx * 0.38, wPx * 0.38);
      const pz = cz(az + (bz - az) * t) + r(-wPx * 0.38, wPx * 0.38);
      ctx.fillStyle = cosmetic.chance(0.7) ? hsl(38, 0.14, 0.4, 0.85) : hsl(30, 0.2, 0.12, 0.8);
      ctx.beginPath();
      ctx.arc(px, pz, r(1.5, 3.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5 — moss patches: clustered dark blobs + pale lichen speckles, biased
  // toward the walls so the center stays readable.
  for (let i = 0; i < g.mossN; i++) {
    const edge = cosmetic.chance(0.65);
    const mx = edge && cosmetic.chance(0.5) ? r(0, 1) < 0.5 ? r(0, 3.2) : r(fw - 3.2, fw) : r(0, fw);
    const mz = edge && mx > 3.2 && mx < fw - 3.2 ? (r(0, 1) < 0.5 ? r(0, 2.6) : r(fd - 2.6, fd)) : r(0, fd);
    const bx = mx * ppu;
    const bz = (mz * ppu * H) / (fd * ppu); // == mz*ppu, kept explicit
    const n = 3 + Math.floor(r(0, 4));
    for (let b = 0; b < n; b++) {
      blob(
        ctx,
        bx + r(-55, 55),
        bz + r(-55, 55),
        r(28, 85),
        hsl(g.h + 24 + r(-6, 6), 0.5, g.l + 0.05 + r(0, 0.04), 0.34)
      );
    }
    for (let b = 0; b < 5; b++) {
      blob(ctx, bx + r(-60, 60), bz + r(-60, 60), r(5, 14), hsl(g.h - 12, 0.4, g.l + 0.07, 0.24));
    }
  }

  // 6 — leaf litter: small rotated ellipses in dry warm tones, denser at the
  // tree line (edges).
  for (let i = 0; i < g.leafN; i++) {
    const nearEdge = cosmetic.chance(0.6);
    let lx = r(0, W);
    let lz = r(0, H);
    if (nearEdge) {
      const side = Math.floor(r(0, 4));
      const band = 4 * ppu;
      if (side === 0) lz = r(0, band);
      else if (side === 1) lz = r(H - band, H);
      else if (side === 2) lx = r(0, band);
      else lx = r(W - band, W);
    }
    ctx.save();
    ctx.translate(lx, lz);
    ctx.rotate(r(0, Math.PI * 2));
    ctx.fillStyle = hsl(38 + r(-16, 16), 0.42, 0.24 + r(-0.06, 0.09), 0.72);
    ctx.beginPath();
    ctx.ellipse(0, 0, r(3.5, 7), r(1.6, 3), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 7 — cracks: thin dark random walks (dry earth near the paths).
  ctx.lineWidth = 2;
  for (let i = 0; i < g.crackN; i++) {
    let x = r(0.1 * W, 0.9 * W);
    let z = r(0.1 * H, 0.9 * H);
    let ang = r(0, Math.PI * 2);
    ctx.strokeStyle = hsl(g.h + 10, 0.2, Math.max(0.02, g.l - 0.09), 0.42);
    ctx.beginPath();
    ctx.moveTo(x, z);
    const steps = 6 + Math.floor(r(0, 8));
    for (let s = 0; s < steps; s++) {
      ang += r(-0.7, 0.7);
      x += Math.cos(ang) * r(8, 20);
      z += Math.sin(ang) * r(8, 20);
      ctx.lineTo(x, z);
    }
    ctx.stroke();
  }

  // 8 — corruption blight: a desaturated dark stain under the monolith (part
  // of the §11/§19.3 "one corruption tell" — the violet itself stays on the
  // monolith so it remains the only violet in frame).
  if (spec.monolith) {
    const [mx, , mz2] = [spec.monolith[0], 0, spec.monolith[1]];
    blob(ctx, cx(mx), cz(mz2), 1.25 * ppu, 'hsla(0,0%,8%,0.4)');
    for (let i = 0; i < 10; i++) {
      blob(ctx, cx(mx) + r(-1.4, 1.4) * ppu, cz(mz2) + r(-1.4, 1.4) * ppu, r(6, 16), 'hsla(0,0%,10%,0.5)');
    }
  }

  // 9 — edge shade: soft charcoal falloff where the floor meets the walls
  // (grounds the wall band; §19.3 gradients only for large light falloff).
  // Deliberately LIGHT (0.10, not the 0.28 of the first cut): §19.3 requires the
  // wall to read one value step darker than the ADJOINING floor, and a heavy
  // edge shade darkens exactly the strip a critic samples against the wall.
  const shade = 'rgba(15,13,10,';
  const band = 70;
  const mkGrad = (x0, y0, x1, y1) => {
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, `${shade}0.10)`);
    grad.addColorStop(1, `${shade}0)`);
    return grad;
  };
  ctx.fillStyle = mkGrad(0, 0, 0, band);
  ctx.fillRect(0, 0, W, band);
  ctx.fillStyle = mkGrad(0, H, 0, H - band);
  ctx.fillRect(0, H - band, W, band);
  ctx.fillStyle = mkGrad(0, 0, band, 0);
  ctx.fillRect(0, 0, band, H);
  ctx.fillStyle = mkGrad(W, 0, W - band, 0);
  ctx.fillRect(W - band, 0, band, H);

  return canvas;
}

export function buildGroundMesh(spec, cosmetic) {
  const canvas = paintGroundCanvas(spec, cosmetic);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  const mesh = new Mesh(
    new PlaneGeometry(ARENA.halfW * 2, ARENA.halfD * 2),
    toonMaterial({ color: '#FFFFFF', map: tex })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.name = 'arena-ground';
  return mesh;
}

// Dark surround beyond the walls: very dark cool-green forest floor fading to
// the void at its rim — the "saturated island vs desaturated dark surround"
// attention funnel from reference C. Sits just below the floor plane.
//
// The first cut painted a 10 px lattice on a 512 canvas stretched over ~46 x 36
// world units, which resolved on screen as giant faint blocks and read as an
// unfinished checker. Now it is soft organic mottle at a much finer cell plus
// canopy-crown blobs, so out-of-bounds reads as dark woodland.
export function buildApronMesh(spec, cosmetic) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const r = (a, b) => cosmetic.range(a, b);
  const g = spec.ground;

  ctx.fillStyle = hsl(g.h + 14, 0.32, 0.17);
  ctx.fillRect(0, 0, size, size);

  // Fine organic mottle (soft ellipses, never a hard lattice).
  for (let i = 0; i < 2600; i++) {
    ctx.save();
    ctx.translate(r(0, size), r(0, size));
    ctx.rotate(r(0, Math.PI));
    ctx.fillStyle = hsl(g.h + 14 + r(-14, 14), 0.32, 0.12 + r(0, 0.08), 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, r(4, 13), r(3, 8), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Canopy crowns: dark rounded masses reading as treetops seen from above.
  for (let i = 0; i < 260; i++) {
    const cxp = r(0, size);
    const cyp = r(0, size);
    const R = r(9, 26);
    blob(ctx, cxp, cyp, R * 1.35, hsl(g.h + 24, 0.36, 0.06, 0.4)); // crown shadow
    blob(ctx, cxp - R * 0.2, cyp - R * 0.25, R, hsl(g.h + 4, 0.38, 0.21 + r(0, 0.06), 0.7));
  }
  // Rim fade to transparent so the apron melts into the charcoal background.
  const rim = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.5);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(0.55, 'rgba(0,0,0,0.12)');
  rim.addColorStop(0.85, 'rgba(0,0,0,0.55)');
  rim.addColorStop(1, 'rgba(0,0,0,0.95)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, size, size);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  const mesh = new Mesh(
    new PlaneGeometry(ARENA.halfW * 2 + 50, ARENA.halfD * 2 + 46),
    toonMaterial({ color: '#FFFFFF', map: tex, transparent: true, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.02;
  mesh.renderOrder = -20; // under every ground-plane decal/pool
  mesh.name = 'arena-apron';
  return mesh;
}
