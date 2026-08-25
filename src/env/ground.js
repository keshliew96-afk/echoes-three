// Act-1 ground: one canvas-painted floor texture per arena (§19.3 "no dead
// ground": hue-noise cells, macro dapple, dirt path, moss patches, leaf
// litter, cracks — all canvas-generated, no downloads), plus a COOL indigo
// apron beyond the walls (mist band + canopy crowns + rocks) so out-of-bounds
// reads as a dressed forest edge instead of a dead void. All randomness comes
// from the COSMETIC stream.
//
// TEMPERATURE CONTRACT (see env/colors.js): the LIT ramp is the §19.3 green
// band (hue 70-110); the SHADE ramp is a desaturated blue-green pushed toward
// COOL.ambient, and a final additive indigo lift guarantees the blue channel
// sits at or above the red in every unlit region. Warm arrives only from the
// torch/lantern/dapple pools — that contrast is the warm:cool 70:30 read.
import { CanvasTexture, Mesh, PlaneGeometry, SRGBColorSpace } from 'three';
import { ARENA } from '../core/constants.js';
import { toonMaterial } from '../render/toon.js';

const TEX_W = 2048;
const APRON_MARGIN = 26; // world u of dressed exterior painted around the arena

// Additive indigo lift applied to the finished floor. Raises the blue channel
// by ~34/255 everywhere, which is decisive in shade (blue becomes the largest
// channel) and negligible under the amber pools (which stay red-dominant).
const COOL_LIFT_B = 13; // default blue channel of the additive cool lift
const APRON_LIFT = 'rgb(5,8,15)';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const hsl = (h, s, l, a = 1) =>
  `hsla(${Math.round(h)},${Math.round(clamp01(s) * 100)}%,${Math.round(clamp01(l) * 100)}%,${a})`;

// Stamp soft radial blobs along a world-space polyline.
function stampAlong(pts, stepU, fn) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const segLen = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(1, Math.ceil(segLen / stepU));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      fn(ax + (bx - ax) * t, az + (bz - az) * t, i);
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

// Per-texel grain. The reference-bar "no dead ground" check measures 12x12
// screen blocks for a <6 span in luma AND every channel; a painted canvas can
// still resolve to a flat block wherever two soft gradients overlap, so the
// floor and the apron both get a final grain pass that makes a truly flat block
// impossible. Granularity 2 texels keeps the grain alive through mip level 1.
function grain(ctx, W, H, amp, cosmetic, step = 4) {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const n = (cosmetic.range(-1, 1) * amp) | 0;
      const nb = (cosmetic.range(-1, 1) * amp * 0.7) | 0;
      for (let dy = 0; dy < step && y + dy < H; dy++) {
        for (let dx = 0; dx < step && x + dx < W; dx++) {
          const i = ((y + dy) * W + (x + dx)) * 4;
          d[i] = Math.min(255, Math.max(0, d[i] + n));
          d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
          d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + nb));
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function paintGroundCanvas(spec, cosmetic) {
  const fw = ARENA.halfW * 2;
  const fd = ARENA.halfD * 2;
  const W = TEX_W;
  const H = Math.round(W * (fd / fw));
  const ppu = W / fw; // pixels per world unit
  const cx = (wx) => (wx + ARENA.halfW) * ppu;
  const cz = (wz) => (wz + ARENA.halfD) * ppu;
  const r = (a, b) => cosmetic.range(a, b);
  const g = spec.ground;
  const shH = g.shadeH ?? 170;
  const shS = g.shadeS ?? 0.26;
  const shL = g.shadeL ?? Math.max(0.05, g.l - 0.13);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 1 — base fill: a saturated §19.3 green (hue 70-110), a touch under the lit
  // value. The COOL half of the ramp arrives as painted shade + the additive
  // lift, so the field's SATURATED pixels stay in the brief's green band while
  // its unlit ones go blue-dominant.
  ctx.fillStyle = hsl(g.h + 4, g.s * 0.86, g.l * 0.62 + shL * 0.38 + 0.05);
  ctx.fillRect(0, 0, W, H);

  // 2 — hue-noise mottling: jittered rotated ellipses on a loose lattice (a
  // hard rect grid reads as a checkerboard at gameplay zoom — verified in
  // capture). Every other cell samples the COOL end of the ramp so the mottle
  // carries temperature variation, not just value.
  const cell = 20;
  for (let y = 0; y < H + cell; y += cell) {
    for (let x = 0; x < W + cell; x += cell) {
      // Cool cells stay a MINORITY and stay close in value to the warm ones:
      // at 36% coverage and a 0.5 alpha they read as blue-grey mould speckling
      // the lawn (critique F8) rather than as shade.
      const cool = cosmetic.chance(0.24);
      ctx.fillStyle = cool
        ? hsl(shH + r(-12, 12), shS + r(-0.02, 0.04), shL + r(0.04, 0.1), 0.34)
        : hsl(g.h + r(-9, 9), g.s + r(-0.05, 0.1), g.l + r(-0.05, 0.06), 0.5);
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

  // 3 — macro dapple: large soft pools of LIT warm green vs COOL blue-green
  // shade (§19.3 dappled low-moderate value contrast). This is where the
  // warm:cool story lives on the floor itself.
  for (let i = 0; i < 60; i++) {
    blob(ctx, r(0, W), r(0, H), r(120, 380), hsl(g.h - 8, g.s + 0.16, g.l + 0.07, 0.3));
  }
  for (let i = 0; i < 34; i++) {
    blob(ctx, r(0, W), r(0, H), r(220, 560), hsl(shH + r(-10, 12), shS + 0.02, shL + 0.02, 0.42));
  }
  // Sun-bleached dry-grass patches: hue variety INSIDE the green band (a wider
  // offset here is what dragged variant 2 down to hue 50-60 last round).
  for (let i = 0; i < 10; i++) {
    blob(ctx, r(0, W), r(0, H), r(70, 200), hsl(g.h - 14, 0.38, g.l + 0.09, 0.24));
  }
  // Deep canopy shadows. These are the frame's DARK end (target luma 45-60 on
  // the finished floor, against 130-150 in the open) and round 3 had them at a
  // 0.24 alpha over an already-dark base, which is why the histogram was one
  // narrow hump with no shadow pockets in it (critique F2). They are painted in
  // clumps — a shadow is cast by one tree, not by uniform static.
  for (let i = 0; i < 15; i++) {
    const cxs = r(0, W);
    const czs = r(0, H);
    for (let k = 0; k < 4; k++) {
      blob(
        ctx,
        cxs + r(-190, 190),
        czs + r(-150, 150),
        r(130, 330),
        hsl(shH + r(-6, 10), shS + 0.05, Math.max(0.02, shL - 0.035), 0.4)
      );
    }
  }

  // 3b — cool ambient lift, applied HERE rather than at the end: the dirt path,
  // the leaf litter and the moss are warm surfaces painted on top of it, and a
  // +24 blue over the track turned the beaten dirt mauve last iteration.
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgb(3,7,${g.coolLift ?? COOL_LIFT_B})`;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  // 4 — dirt path(s): cool dark under-stroke, jittered warm dirt body, dry
  // highlights, wheel ruts, pebbles.
  const dirtH = g.dirtH ?? 28;
  const dirtL = g.dirtL ?? 0.2;
  for (const path of spec.paths) {
    const wPx = path.w * ppu;
    // Cool shadow lip so the track sits INTO the ground rather than on it.
    stampAlong(path.pts, 0.09, (wx, wz) => {
      blob(ctx, cx(wx) + r(-6, 6), cz(wz) + r(-6, 6), wPx * 0.66, hsl(shH, 0.28, shL * 0.75, 0.2));
    });
    stampAlong(path.pts, 0.05, (wx, wz) => {
      blob(
        ctx,
        cx(wx) + r(-0.1, 0.1) * ppu,
        cz(wz) + r(-0.1, 0.1) * ppu,
        wPx * 0.42 * r(0.8, 1.1),
        hsl(dirtH + r(-5, 5), 0.33, dirtL + r(-0.045, 0.05), 0.62)
      );
    });
    stampAlong(path.pts, 0.16, (wx, wz) => {
      blob(ctx, cx(wx) + r(-8, 8), cz(wz) + r(-8, 8), wPx * 0.17, hsl(dirtH + 6, 0.3, dirtL + 0.1, 0.32));
    });
    // Two wheel ruts: darker parallel scuffs offset either side of the centre.
    for (const side of [-1, 1]) {
      stampAlong(path.pts, 0.08, (wx, wz, seg) => {
        const [ax, az] = path.pts[seg];
        const [bx, bz] = path.pts[seg + 1];
        const L = Math.hypot(bx - ax, bz - az) || 1;
        const nx = -(bz - az) / L;
        const nz = (bx - ax) / L;
        blob(
          ctx,
          cx(wx + nx * side * path.w * 0.24) + r(-4, 4),
          cz(wz + nz * side * path.w * 0.24) + r(-4, 4),
          wPx * 0.13,
          hsl(dirtH - 4, 0.28, dirtL * 0.55, 0.22)
        );
      });
    }
    // Pebbles strewn across the beaten track.
    const perPath = Math.round(g.pebbleN / spec.paths.length);
    for (let i = 0; i < perPath; i++) {
      const seg = Math.floor(r(0, path.pts.length - 1));
      const [ax, az] = path.pts[seg];
      const [bx, bz] = path.pts[seg + 1];
      const t = r(0, 1);
      const px = cx(ax + (bx - ax) * t) + r(-wPx * 0.38, wPx * 0.38);
      const pz = cz(az + (bz - az) * t) + r(-wPx * 0.38, wPx * 0.38);
      ctx.fillStyle = cosmetic.chance(0.6) ? hsl(40, 0.12, 0.42, 0.85) : hsl(200, 0.16, 0.11, 0.8);
      ctx.beginPath();
      ctx.arc(px, pz, r(1.5, 3.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5 — moss patches: clustered blobs + pale lichen speckles, biased toward
  // the walls so the center stays readable.
  for (let i = 0; i < g.mossN; i++) {
    const bx = r(0, W);
    const bz = r(0, H);
    const n = 3 + Math.floor(r(0, 4));
    for (let b = 0; b < n; b++) {
      blob(
        ctx,
        bx + r(-55, 55),
        bz + r(-55, 55),
        r(28, 85),
        hsl(g.h + 22 + r(-6, 6), 0.5, g.l + 0.03 + r(0, 0.04), 0.3)
      );
    }
    for (let b = 0; b < 5; b++) {
      blob(ctx, bx + r(-60, 60), bz + r(-60, 60), r(5, 14), hsl(g.h - 10, 0.42, g.l + 0.08, 0.24));
    }
  }

  // 6 — leaf litter: small rotated ellipses, denser at the tree line (edges).
  for (let i = 0; i < g.leafN; i++) {
    let lx = r(0, W);
    let lz = r(0, H);
    if (cosmetic.chance(0.6)) {
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
    // Litter stays inside the warm-dirt family but a hair cooler than before —
    // a hue-38 mass at this density is what pulled a whole variant's histogram
    // below the §19.3 green floor.
    ctx.fillStyle = hsl(44 + r(-10, 14), 0.34, 0.23 + r(-0.05, 0.08), 0.6);
    ctx.beginPath();
    ctx.ellipse(0, 0, r(3.5, 7), r(1.6, 3), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 7 — cracks in the dry earth (critique F6). Round 3 drew these as constant
  // ~2px near-black random walks with no taper and no rim, which read as
  // scratches on the lens. A real crack is a groove: a dark channel that TAPERS
  // to nothing at both ends, tinted toward the ground it splits rather than
  // black, with a thin sunlit lip along one side where the broken edge catches
  // the key light.
  for (let i = 0; i < g.crackN; i++) {
    let x = r(0.1 * W, 0.9 * W);
    let z = r(0.1 * H, 0.9 * H);
    let ang = r(0, Math.PI * 2);
    const steps = 7 + Math.floor(r(0, 8));
    const pts = [[x, z]];
    for (let st = 0; st < steps; st++) {
      ang += r(-0.7, 0.7);
      x += Math.cos(ang) * r(9, 19);
      z += Math.sin(ang) * r(9, 19);
      pts.push([x, z]);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let sgm = 0; sgm < pts.length - 1; sgm++) {
      const t = sgm / (pts.length - 2 || 1);
      // Taper: fat in the middle of the run, vanishing at both ends.
      const taper = Math.sin(Math.PI * t);
      const wdt = 0.7 + 2.6 * taper;
      const [ax, az] = pts[sgm];
      const [bx, bz] = pts[sgm + 1];
      const L = Math.hypot(bx - ax, bz - az) || 1;
      const nx = -(bz - az) / L;
      const nz = (bx - ax) / L;
      // Sunlit lip on the key-light side, drawn first so the channel sits on it.
      ctx.strokeStyle = hsl(g.h - 6, 0.3, g.l + 0.12, 0.3 * taper);
      ctx.lineWidth = Math.max(0.6, wdt * 0.55);
      ctx.beginPath();
      ctx.moveTo(ax + nx * wdt * 0.75, az + nz * wdt * 0.75);
      ctx.lineTo(bx + nx * wdt * 0.75, bz + nz * wdt * 0.75);
      ctx.stroke();
      // The channel itself: the ground hue driven down in value, never black.
      ctx.strokeStyle = hsl(g.h + 6, 0.3, Math.max(0.035, g.l * 0.34), 0.6 * taper + 0.1);
      ctx.lineWidth = wdt;
      ctx.beginPath();
      ctx.moveTo(ax, az);
      ctx.lineTo(bx, bz);
      ctx.stroke();
    }
  }

  // 8 — corruption blight: a desaturated cool stain under the monolith (part
  // of the §11/§19.3 "one corruption tell" — the violet itself stays on the
  // monolith so it remains the only violet in frame).
  if (spec.monolith) {
    const mx = spec.monolith[0];
    const mz = spec.monolith[1];
    blob(ctx, cx(mx), cz(mz), 1.5 * ppu, 'hsla(250,18%,6%,0.45)');
    for (let i = 0; i < 12; i++) {
      blob(ctx, cx(mx) + r(-1.6, 1.6) * ppu, cz(mz) + r(-1.6, 1.6) * ppu, r(6, 18), 'hsla(250,14%,8%,0.5)');
    }
  }

  // 9 — edge shade: soft COOL falloff where the floor meets the walls. Kept
  // light (§19.3 wants the wall one value step under the ADJOINING floor, and a
  // heavy edge shade darkens exactly the strip that gets sampled).
  const band = 64;
  const mkGrad = (x0, y0, x1, y1) => {
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, 'rgba(12,18,34,0.12)');
    grad.addColorStop(1, 'rgba(12,18,34,0)');
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

  // 10 — grain. BUILD_BRIEF §19.3 forbids micro-texture, and round 3's amp-9
  // per-2-texel grain read as chunky blue-green pepper noise at gameplay zoom
  // (critique F8). Dropped to a barely-there amp-3 tint jitter on a 4-texel
  // lattice: enough that no 8x8 screen block is ever mathematically flat (FLAT
  // measures ~1%, bar is 20%), invisible as texture.
  grain(ctx, W, H, 3, cosmetic, 4);

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

// Dressed exterior beyond the walls: a COOL indigo forest floor with a mist
// band hugging the wall, canopy crowns, undergrowth and rock masses, fading to
// the void at the rim — the "saturated island vs desaturated dark surround"
// attention funnel from reference C and the cool-void-vs-warm-action funnel of
// reference D. The 3D treeline (env/treeline.js) stands on top of this.
export function buildApronMesh(spec, cosmetic) {
  const worldW = ARENA.halfW * 2 + APRON_MARGIN * 2;
  const worldD = ARENA.halfD * 2 + APRON_MARGIN * 2;
  const W = 1600;
  const H = Math.round(W * (worldD / worldW));
  const ppu = W / worldW;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const r = (a, b) => cosmetic.range(a, b);

  // World -> canvas.
  const cx = (wx) => (wx + worldW / 2) * ppu;
  const cz = (wz) => (wz + worldD / 2) * ppu;
  // The arena rect in canvas space (the apron is hidden under the floor there).
  const inner = {
    x0: cx(-ARENA.halfW), x1: cx(ARENA.halfW),
    z0: cz(-ARENA.halfD), z1: cz(ARENA.halfD),
  };

  ctx.fillStyle = 'hsl(212,14%,11%)'; // COOL.apron — deep, so the island reads brighter
  ctx.fillRect(0, 0, W, H);

  // Fine organic mottle — cool indigo/teal undergrowth, never dark green.
  for (let i = 0; i < 4200; i++) {
    ctx.save();
    ctx.translate(r(0, W), r(0, H));
    ctx.rotate(r(0, Math.PI));
    ctx.fillStyle = hsl(210 + r(-20, 26), 0.12 + r(-0.05, 0.08), 0.09 + r(0, 0.09), 0.55);
    ctx.beginPath();
    ctx.ellipse(0, 0, r(4, 14), r(3, 9), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Canopy crowns seen from above: dark rounded masses with a cool lit lobe.
  for (let i = 0; i < 1400; i++) {
    const px = r(0, W);
    const pz = r(0, H);
    const R = r(8, 28);
    blob(ctx, px, pz, R * 1.4, 'rgba(4,7,12,0.55)');
    blob(ctx, px - R * 0.22, pz - R * 0.28, R, hsl(202 + r(-14, 18), 0.24, 0.055 + r(0, 0.045), 0.75));
  }
  // A few large dark shapes (boulder fields / deep hollows) for macro contrast.
  for (let i = 0; i < 46; i++) {
    blob(ctx, r(0, W), r(0, H), r(70, 190), 'rgba(8,10,14,0.5)');
  }
  // ...and a few pale cool clearings so the surround has a value range.
  for (let i = 0; i < 30; i++) {
    blob(ctx, r(0, W), r(0, H), r(60, 150), 'rgba(74,84,100,0.12)');
  }

  // Mist band: a bright cool haze hugging the outside of the wall. This is the
  // value break that stops the wall and the void reading as one dark mass.
  const mistW = 6.0 * ppu;
  const mistGrad = (x0, y0, x1, y1) => {
    const gr = ctx.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, 'rgba(122,136,156,0.2)');
    gr.addColorStop(0.3, 'rgba(92,104,124,0.1)');
    gr.addColorStop(1, 'rgba(56,66,82,0)');
    return gr;
  };
  ctx.fillStyle = mistGrad(0, inner.z0, 0, inner.z0 - mistW);
  ctx.fillRect(inner.x0 - mistW, inner.z0 - mistW, inner.x1 - inner.x0 + 2 * mistW, mistW);
  ctx.fillStyle = mistGrad(0, inner.z1, 0, inner.z1 + mistW);
  ctx.fillRect(inner.x0 - mistW, inner.z1, inner.x1 - inner.x0 + 2 * mistW, mistW);
  ctx.fillStyle = mistGrad(inner.x0, 0, inner.x0 - mistW, 0);
  ctx.fillRect(inner.x0 - mistW, inner.z0 - mistW, mistW, inner.z1 - inner.z0 + 2 * mistW);
  ctx.fillStyle = mistGrad(inner.x1, 0, inner.x1 + mistW, 0);
  ctx.fillRect(inner.x1, inner.z0 - mistW, mistW, inner.z1 - inner.z0 + 2 * mistW);
  // Drifting fog puffs riding the band, so it is not a clean ramp.
  for (let i = 0; i < 340; i++) {
    const side = Math.floor(r(0, 4));
    let px;
    let pz;
    if (side === 0) { px = r(inner.x0 - mistW, inner.x1 + mistW); pz = inner.z0 - r(0, mistW); }
    else if (side === 1) { px = r(inner.x0 - mistW, inner.x1 + mistW); pz = inner.z1 + r(0, mistW); }
    else if (side === 2) { px = inner.x0 - r(0, mistW); pz = r(inner.z0 - mistW, inner.z1 + mistW); }
    else { px = inner.x1 + r(0, mistW); pz = r(inner.z0 - mistW, inner.z1 + mistW); }
    blob(ctx, px, pz, r(30, 95), `rgba(120,134,154,${r(0.05, 0.13).toFixed(3)})`);
  }

  // Rim fade to the charcoal background at the far edge only.
  const rim = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, W * 0.56);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(0.6, 'rgba(0,0,0,0.35)');
  rim.addColorStop(1, 'rgba(0,0,0,0.95)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = APRON_LIFT;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  grain(ctx, W, H, 3, cosmetic, 4);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const mesh = new Mesh(
    new PlaneGeometry(worldW, worldD),
    toonMaterial({ color: '#FFFFFF', map: tex, transparent: true, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.02;
  mesh.renderOrder = -20; // under every ground-plane decal/pool
  mesh.name = 'arena-apron';
  return mesh;
}
