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
// Blue channel of the additive cool lift. 14 (a first cut at the cool
// counterweight ran this at 18 with a second +12 lift on top): measured across
// three loads per variant, that pair pushed the frame's cool share to 21-38%
// of coloured pixels and flipped cool ABOVE warm on two of three rolls, which
// breaks the §19.3 warm-dominant Act-1 story the advisory explicitly preserves.
// The counterweight only has to be VISIBLE (>=8%), not to win.
const COOL_LIFT_B = 11;

// Cool counterweight geometry (fix round 2). The frame's cool share is now
// sized by AREA — stamp count x plateau area — instead of by a peak alpha
// sitting on the blue-beats-green threshold. Swept on 12 loads per variant;
// see the note on plateauBlob above.
const COOL_COLS = 10;
const COOL_ROWS = 6;
const COOL_R0 = 130;
const COOL_R1 = 172;
// FIX ROUND 2 (certification checks 2/6/7): the same counterweight, sized for
// a NIGHT floor (`ground.nightBase`). On the flipped polarity the plateau stamps
// are the field itself rather than pockets on a lawn, so they run wider.
const NIGHT_COOL_R0 = 168;
const NIGHT_COOL_R1 = 214;
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

// Stamp `cols x rows` blobs on a jittered lattice covering the canvas. Each
// cell picks one point uniformly inside itself (plus a half-cell overshoot so
// stamps still cross cell boundaries and the lattice never reads as a grid).
// This is the variance fix described at the call sites: same look, no clumping
// lottery.
function latticeStamps(ctx, W, H, cols, rows, cosmetic, draw) {
  const cw = W / cols;
  const ch = H / rows;
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      draw(
        (gx + cosmetic.range(-0.25, 1.25)) * cw,
        (gy + cosmetic.range(-0.25, 1.25)) * ch
      );
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

// PLATEAU stamp — a soft blob with a FLAT core. This is the shape the cool
// counterweight is painted with, and the shape is the point.
//
// A plain radial blob's alpha falls from its peak at the very centre, so the
// area of it that actually crosses the "blue channel beats green" line is a
// thin disc balanced on a threshold: measured, dropping the counterweight
// stamps' peak alpha from 0.45 to 0.30 took the frame's cool share from 21-31%
// to 2.4-6.7%. That is a razor, exactly what the fix-round-2 critique rejected
// ("the counterweight collapses on some loads").
//
// With a plateau, `plateau * radius` of the stamp is painted at the FULL alpha
// and is decisively cool — well past the threshold, not on it — so the cool
// area is a geometric constant of the layout (stamp count x plateau area) and
// the peak alpha stops being a tuning knob at all. The remaining feather keeps
// the pockets reading as dappled canopy shade rather than as painted discs.
function plateauBlob(ctx, x, y, radius, color, plateau = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  const fade = (a) => color.replace(/[\d.]+\)$/, a + ')');
  g.addColorStop(0, color);
  g.addColorStop(plateau, color);
  g.addColorStop(plateau + (1 - plateau) * 0.42, fade(0.55));
  g.addColorStop(1, fade(0));
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

// `cosmetic` here is the per-variant LAYOUT stream (env/layout.js), passed in
// by the arena scene — NOT the unseeded cosmetic stream. The floor's shade
// pockets ARE the frame's cool counterweight, and drawing them from an unseeded
// stream is what let the measured cool share swing 6.8%-30.7% on the same
// variant between loads (fix-round-2 critique). A room's floor is now identical
// on every load and its numbers are reproducible.
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
  // The shade ramp does two different jobs and they pull opposite ways.
  //   * Blends: the path's under-stroke and the deep canopy pockets sit UNDER
  //     the brazier/torch pools, and a warm addition on an indigo base sums to
  //     the h19-25 mauve-brown that the reserved Ember band counts. Those want
  //     the TEAL end (shH ~180), whose gold blends land olive.
  //   * Counterweight: the macro shade stamps and the cool mottle cells are
  //     what the frame's cool share is actually made of, and the warm key
  //     rotates every painted hue DOWN ~20-25 degrees on its way to the
  //     screen — a painted 180 lands near 155 and the analyzer scores it as
  //     foliage, not cool (measured: cool fell to 1.4-4% at shH 180).
  // So the counterweight stamps are painted COOL_STAMP_H degrees higher than
  // the blend tones. Same family, two jobs, both measurable.
  // 26 is a MEASURED optimum, swept in both directions on six captures:
  //   +22 plain -> danger 63-280, cool 7.2-16.9%, foliage 54-63%
  //   +34 with a plateau ramp -> cool 25-39% and foliage 18-30% (the woodland
  //       green stops being the frame's subject) and danger back to 0.5-3.9k,
  //       because a bigger indigo mass under the fire pools is exactly what
  //       sums to the reserved band.
  // +26 with the plain feather keeps the counterweight and trims the h110-150
  // transition mass without tipping any of the other three metrics.
  // FIX ROUND 2: 16, not 34. The +34 offset was measured against a frame the
  // flame sprites' bloom veil was warming by ~(+45,+25,+7) on every dark pixel
  // — a painted 180 really did land near 155 back then. With the fires capped
  // (env/flame.js GAIN_MAX) the rotation is small, and +34 painted the shade
  // pockets at display hue 210-235: pure blue discs that read as PUDDLES on a
  // lawn, not as canopy shade. +16 lands them at 175-200 — the blue-green
  // shade end §19.3 asks for — still 15+ degrees clear of the h160 line the
  // analyzer counts as cool.
  const COOL_STAMP_H = 16;
  const shS = g.shadeS ?? 0.26;
  const shL = g.shadeL ?? Math.max(0.05, g.l - 0.13);
  // NIGHT FLIP (fix round 2, certification checks 2/6/7). Set by the three
  // Act-1 VARIANTS only. The camp (env/camp/ground.js) drives this painter
  // with a spec that is ALREADY a night spec and scored 20/20 on the round-2
  // reference lens, so it keeps the authored polarity below.
  const night = !!g.nightBase;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 1 — base fill. FIX ROUND 2 (certification checks 2/6/7): this used to be
  // the §19.3 green, with the cool half arriving as pockets on top of it. All
  // three round-1 scorers measured the result the same way — combat HUEMIX
  // cool 8.0% against the reference's 76.4%, the darkest region reading warm
  // 47 / cool 14 (brown-olive shade), bucket 0 at 7% against 27%. A field
  // whose BASE is green cannot carry a warm-versus-cool funnel: every pocket
  // painted on top of it is a puddle on a lawn.
  //
  // So the polarity is inverted, which is what every reference screenshot
  // actually does: the base is the NIGHT — a deep, saturated indigo-teal at
  // the shade end of the ramp — and the §19.3 green (hue 70-110, sat 0.55-
  // 0.65) arrives as the lit dapple stamps in pass 3, where the canopy opens.
  // The torch and brazier pools then read as pools because there is a real
  // black point behind them, and the grass tufts (env/foliage.js) keep the
  // brief's green band on top.
  ctx.fillStyle = night
    ? hsl(shH + COOL_STAMP_H, shS + 0.22, shL + 0.055)
    : hsl(g.h + 4, g.s * 0.86, g.l * 0.62 + shL * 0.38 + 0.05);
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
      // the lawn (critique F8) rather than as shade. Baseline-v030 F1 measured
      // the frame's cool share at 1.3-2% because the warm key light multiplied
      // every painted teal back into green — the shade stamps are now BLUER
      // (shadeH ~200 from the variants) and slightly stronger so the pockets
      // still measure cool (h>=160) after the key does its work. Alpha 0.30 at
      // 24% coverage: 0.38/28% and 0.42/28% both overshot — measured across
      // three loads each, they put cool at 21-38% of coloured pixels and won
      // outright over warm on most rolls. At 0.30/24% the pockets still measure
      // cool while the warm story stays on top.
      // The mottle cannot carry the cool counterweight even though its ~7000
      // cells are the most statistically stable source in the painter:
      // measured, pushing it from 0.24/0.36 to 0.30/0.42 LOWERED the frame's
      // cool share. At 20 canvas px per cell the mottle resolves to a few
      // screen pixels, and mip filtering averages neighbouring warm and cool
      // cells back into one green. Fine mottle is texture; the macro stamps
      // below are the temperature.
      // FIX ROUND 2: the mottle follows the base. On a night floor the cool
      // cells are the MAJORITY and the green cells are the openings — the
      // same two tones, swapped shares.
      const cool = cosmetic.chance(night ? 0.66 : 0.24);
      ctx.fillStyle = cool
        ? hsl(shH + COOL_STAMP_H + r(-12, 12), shS + r(0.06, 0.14), shL + r(0.04, 0.1), 0.36)
        : hsl(g.h + r(-9, 7), g.s + r(-0.08, 0.06), g.l + r(-0.05, 0.05), 0.5);
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
  // Both stamp passes below run on a JITTERED LATTICE rather than uniform
  // random placement. Uniform random was measured as the single biggest source
  // of frame-to-frame instability in this scene: the spawn camera sees maybe a
  // third of the arena, so where a handful of 220-560 px shade blobs happened
  // to land swung the same variant's measured cool share from 4.6% to 17.1%
  // between two loads of the identical build. A lattice with per-cell jitter
  // keeps the organic look (position, radius and tint all still roll from the
  // cosmetic stream) while guaranteeing every region of the floor gets its
  // share of lit and shaded stamps.
  // RADIUS RANGES ARE DELIBERATELY NARROW. Area goes as r^2, so the old
  // r(120,380) / r(220,560) spans meant a single stamp could cover 10x or 6x
  // the floor of another — the lattice fixed WHERE stamps land but the size
  // lottery still swung the same variant's measured cool share by 10+ points
  // between loads. Narrow spans keep the organic overlap and make the frame
  // reproducible for anyone re-measuring it.
  // FIX ROUND 2: these ARE the §19.3 green now (the base below them is night),
  // so they are painted opaque enough that their centres land squarely in the
  // hue 70-110 / sat 0.55-0.65 band the art bible reserves for Act-1 turf,
  // and they keep the lattice so every region of the floor gets one.
  latticeStamps(ctx, W, H, 10, 6, cosmetic, (x, y) =>
    night
      ? blob(ctx, x, y, r(200, 310), hsl(g.h - 12, g.s + 0.04, g.l + 0.02, 0.82))
      : blob(ctx, x, y, r(190, 300), hsl(g.h - 8, g.s + 0.24, g.l + 0.07, 0.34))
  );
  // 44 weaker stamps rather than 34 at 0.44: same expected shade coverage,
  // HALF the roll-to-roll variance — one unlucky mid-frame clump was flipping
  // whole spawn frames cool-dominant (measured cool 24% to 35% across rolls).
  // These stamps ARE the cool counterweight the advisory asks for, and they
  // are drawn DECISIVELY blue (shS + 0.12 at alpha 0.42) on purpose. A first
  // cut tried to buy the cool share with a flat additive blue lift over the
  // whole canvas instead; measured across six loads that lever was a razor —
  // +18 blue gave 1-2% cool, +20 gave 7%, +22 gave 12% — because it works by
  // flipping vast flat areas across the b>g line one value at a time. Real
  // pockets of painted blue-green shade measure the same counterweight
  // without balancing on a threshold, and they are what §19.3 actually asks
  // for ("cool only in shadow pockets").
  // 12x7 smaller stamps rather than 9x5 larger ones: same total coverage,
  // meaningfully lower variance (more samples, narrower size span), and the
  // pockets read as dappled canopy shade rather than as a few big patches.
  // FIX ROUND 2 sizing: r(200, 260) at alpha 0.30 (was r(235,315) at 0.45).
  // The counterweight was sized against a frame whose warm side was mostly the
  // flame sprites' BLOOM VEIL; with that veil capped (env/flame.js GAIN_MAX)
  // the same stamps measured cool 21-31% against warm 22-25%, i.e. they
  // out-weighed the warm story the §19.3 70:30 split makes dominant. Trimmed
  // to land cool ~12-15% of coloured pixels: still 1.5x the advisory's >=8%
  // floor with the whole spread of measured loads inside it, and now a
  // constant of the variant (the layout stream above) rather than a per-load
  // lottery.
  latticeStamps(ctx, W, H, COOL_COLS, COOL_ROWS, cosmetic, (x, y) =>
    plateauBlob(
      ctx,
      x,
      y,
      night ? r(NIGHT_COOL_R0, NIGHT_COOL_R1) : r(COOL_R0, COOL_R1),
      // A DESATURATED blue-green one value step under the lit floor, which is
      // what §19.3's shade ramp asks for — the plateau SHAPE (not the chroma)
      // is what makes the counterweight measurable, so the tone can afford to
      // be the quiet one. At the earlier shS+0.08 / shL+0.02 the pockets read
      // as blue puddles on a lawn rather than as canopy shade.
      night
        ? hsl(shH + COOL_STAMP_H + r(-10, 12), shS + 0.10, shL + 0.05, 0.68)
        : hsl(shH + COOL_STAMP_H + r(-10, 12), shS + 0.02, shL + 0.075, 0.5),
      0.5
    )
  );
  // Sun-bleached dry-grass patches: hue variety INSIDE the green band (a wider
  // offset here is what dragged variant 2 down to hue 50-60 last round).
  // FIX ROUND 2: alpha 0.24 -> 0.14 and the value lift halved. On the night
  // floor these were the frame's brightest sourceless patches — a pool of
  // daylight with no emitter under it, which is exactly what check 2 calls a
  // missing ambient pole.
  for (let i = 0; i < 10; i++) {
    blob(
      ctx,
      r(0, W),
      r(0, H),
      r(70, 200),
      night
        ? hsl(g.h - 14, 0.38, g.l + 0.045, 0.14)
        : hsl(g.h - 14, 0.38, g.l + 0.09, 0.24)
    );
  }
  // Deep canopy shadows. These are the frame's DARK end (target luma 45-60 on
  // the finished floor, against 130-150 in the open) and round 3 had them at a
  // 0.24 alpha over an already-dark base, which is why the histogram was one
  // narrow hump with no shadow pockets in it (critique F2). They are painted in
  // clumps — a shadow is cast by one tree, not by uniform static.
  // Same variance-damping trade as the shade stamps above: 24 clusters of 3
  // at 0.36 instead of 15 of 4 at 0.46 — the dark pockets stay, the spawn
  // frame's cool share stops swinging 10 points between loads.
  latticeStamps(ctx, W, H, 6, 4, cosmetic, (cxs, czs) => {
    for (let k = 0; k < 3; k++) {
      blob(
        ctx,
        cxs + r(-190, 190),
        czs + r(-150, 150),
        r(190, 280),
        // These pockets stay at the TEAL end of the ramp, with none of the
        // counterweight stamps' hue offset. They are the tone the brazier and
        // torch pools most often land on, and a measured pass that moved them
        // halfway to the counterweight hue bought ~5 points of cool share at
        // the cost of two frames in twelve going 600-1900 px over the reserved
        // Ember band — a warm addition on indigo sums to mauve, on teal it
        // sums to olive. The counterweight is bought from the macro stamps
        // instead, which sit in the open where no pool reaches.
        hsl(shH + r(-6, 10), shS + 0.15, Math.max(0.02, shL - 0.02), 0.4)
      );
    }
  });

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
        // Sat 0.21 / alpha 0.56 (round 5; was 0.26, before that 0.33): the
        // beaten track is multiplied by the warm key and red-lifted by the
        // grade, and a more saturated dirt body kept measuring h20-25 at
        // s0.36-0.40 (inside the reserved Ember Danger band) wherever the
        // track ran DIM — vignette corners were the stubborn case, worth
        // 1-2k px on a bad cosmetic roll in the hollow. The lower alpha also
        // lets the cool base lift show through, holding the track's blue
        // floor up.
        hsl(dirtH + r(-2, 8), 0.27, dirtL + r(-0.045, 0.05), 0.56)
      );
    });
    stampAlong(path.pts, 0.16, (wx, wz) => {
      blob(ctx, cx(wx) + r(-8, 8), cz(wz) + r(-8, 8), wPx * 0.17, hsl(dirtH + 6, 0.25, dirtL + 0.1, 0.32));
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
          // Ruts brightened (L x0.7, was x0.55) and greyed: near-black warm
          // scuffs in a vignette corner are exactly the L40-60 zone the grade
          // red-lifts into the reserved band.
          hsl(dirtH - 4, 0.22, dirtL * 0.7, 0.22)
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
        // Moss hue offset is spec-tunable (fix round 1): +22 over an h90 base
        // painted the moss at h112 — inside the reserved heal band.
        hsl(g.h + (g.mossOff ?? 22) + r(-6, 6), 0.5, g.l + 0.03 + r(0, 0.04), 0.3)
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
    // Litter stays inside the warm-dirt family, biased GOLD (h>=44): the low
    // end of the old range landed under h25 once the warm key and grade pushed
    // red (baseline-v030 F2).
    // h58 / s0.27 (were 54/0.32): litter lying under a brazier pool's mid
    // feather was the residual danger-band speckle in the hollow — the pool's
    // warm addition plus the grade's red-lift landed the browner leaves at
    // h20-25 / s0.35-0.37. Golder, slightly greyer litter keeps the read and
    // clears the gate even pool-washed.
    ctx.fillStyle = hsl(62 + r(-2, 12), 0.22, 0.23 + r(-0.05, 0.08), 0.6);
    ctx.beginPath();
    ctx.ellipse(0, 0, r(3.5, 7), r(1.6, 3), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 6b — a SECOND, smaller cool lift over everything painted so far (the
  // first, 3b, deliberately runs before the path so the beaten dirt stays
  // warm). The path EDGE is the reason this pass exists: where the warm dirt
  // feathers out over the indigo shade, the blend passes through h20-25 at
  // s0.36-0.45 — inside the reserved Ember Danger band. +8 blue in that
  // transition ring drops it under the s0.35 gate while the bright track
  // centre (b already ~70+) barely moves. Kept SMALL (+6, was +12): stacked on
  // the 3b lift it was half the reason the whole floor went blue-grey and the
  // Act-1 grass measured 0.32 mean saturation against the 0.55-0.65 bar.
  // `lift2` is spec-tunable (fix round 1): the Act-1 variants run it at 3 so
  // the olive lit ramp keeps red over blue; the camp keeps 6.
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgb(2,3,${g.lift2 ?? 6})`;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

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
  // Debug hook for the capture harness: the painted floor is the single
  // largest colour surface in the frame, so "which painted feature is putting
  // texels in a reserved hue band" has to be answerable without guessing.
  if (typeof window !== 'undefined') window.__groundCanvas = canvas;
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
