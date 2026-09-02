// Camp ground (BUILD_BRIEF §18 "deep indigo/teal ambient ... dirt path with
// hue variation", REFERENCE_BAR check 1 "no dead ground").
//
// The Act-1 painter in src/env/ground.js is hue-agnostic — base fill, mottle
// lattice, dirt tracks with ruts and pebbles, moss/leaf/crack scatter and a
// per-texel grain — so the camp reuses it with a NIGHT spec (indigo base, bluer
// shade end, warm beaten track) rather than growing a second painter that would
// have to re-earn the same "no flat 8x8 block anywhere" property.
//
// What this module adds on top, because a camp floor is not a battlefield
// floor: the trodden ring the party has worn bare around the Hearth-Fire, the
// scorch under the fire itself, worn working patches at the smithy and the
// market, and the cool stain the gate's light leaves on the road. Those are
// painted INTO the same canvas, so they cost nothing at render time and they
// mask grass through the returned footprint discs.
import { CanvasTexture, Mesh, PlaneGeometry, SRGBColorSpace } from 'three';
import { ARENA } from '../../core/constants.js';
import { toonMaterial } from '../../render/toon.js';
import { paintGroundCanvas } from '../ground.js';
import { HEARTH, PORTAL } from './spec.js';

const hsl = (h, s, l, a = 1) => `hsla(${h},${(s * 100).toFixed(1)}%,${(l * 100).toFixed(1)}%,${a})`;

function radial(ctx, x, y, r, inner, outer, plateau = 0.45) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(plateau, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Returns { mesh, footprints } — the footprint discs keep grass tufts out of
// the bare trodden ground (a blade of grass in the middle of a fire circle is
// the same defect as a blade growing through a crate face).
export function buildCampGround(spec, rng) {
  const canvas = paintGroundCanvas(spec, rng);
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const ppu = W / (ARENA.halfW * 2);
  const cx = (wx) => (wx + ARENA.halfW) * ppu;
  const cz = (wz) => (wz + ARENA.halfD) * ppu;
  const g = spec.ground;
  const r = (a, b) => rng.range(a, b);

  const footprints = [];

  // --- Trodden ground: bare, warm-grey earth wherever the camp actually
  // lives. Painted as a plateau so the ring has a real edge instead of a haze.
  const trodden = [
    [HEARTH.x, HEARTH.z, 3.0], // the fire circle
    [-5.6, 3.5, 1.9], // smithy
    [6.3, 2.5, 1.9], // market
    [-4.95, -3.35, 1.5], // tent row NW
    [4.85, -3.1, 1.5], // tent row NE
    [8.35, -1.4, 1.3], // cart bay
    [PORTAL.x, PORTAL.z + 0.5, 1.9], // gate threshold
  ];
  for (const [wx, wz, rad] of trodden) {
    const px = cx(wx);
    const pz = cz(wz);
    const pr = rad * ppu;
    radial(
      ctx,
      px,
      pz,
      pr,
      hsl(g.dirtH + 2, 0.2, g.dirtL * 0.92, 0.68),
      hsl(g.dirtH + 6, 0.16, g.dirtL * 0.7, 0),
      0.42
    );
    // Scuffs and stones so the bare patch is not one flat fill.
    for (let i = 0; i < 26; i++) {
      const a = r(0, Math.PI * 2);
      const d = Math.sqrt(r(0, 1)) * pr * 0.9;
      ctx.save();
      ctx.translate(px + Math.cos(a) * d, pz + Math.sin(a) * d * 0.86);
      ctx.rotate(r(0, Math.PI));
      ctx.fillStyle = rng.chance(0.5)
        ? hsl(g.dirtH + r(-6, 10), 0.22, g.dirtL + r(0.02, 0.07), 0.4)
        : hsl(g.shadeH + r(-10, 10), 0.2, g.shadeL + r(0.0, 0.05), 0.42);
      ctx.beginPath();
      ctx.ellipse(0, 0, r(6, 26), r(4, 15), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    footprints.push({ x: wx, z: wz, r: rad * 0.82 });
  }

  // --- Scorch + ash under the Hearth-Fire itself. Dark core, pale ash halo:
  // the value break that tells you the fire has burned there a long time.
  {
    const px = cx(HEARTH.x);
    const pz = cz(HEARTH.z);
    radial(ctx, px, pz, 1.75 * ppu, 'rgba(232,226,214,0.16)', 'rgba(232,226,214,0)', 0.2);
    radial(ctx, px, pz, 1.15 * ppu, 'rgba(16,14,18,0.62)', 'rgba(16,14,18,0)', 0.5);
    for (let i = 0; i < 30; i++) {
      const a = r(0, Math.PI * 2);
      const d = Math.sqrt(r(0, 1)) * 1.5 * ppu;
      ctx.fillStyle = rng.chance(0.55)
        ? `rgba(20,17,20,${r(0.2, 0.5).toFixed(2)})`
        : `rgba(214,206,192,${r(0.06, 0.16).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(px + Math.cos(a) * d, pz + Math.sin(a) * d * 0.85, r(4, 16), r(3, 10), r(0, 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Gate stain: a cool wash on the road under the arch, so the portal's
  // violet has somewhere to sit that is not the camp's warm core. Painted, not
  // additive, so it never counts as a second light source.
  {
    const px = cx(PORTAL.x);
    const pz = cz(PORTAL.z + 0.4);
    radial(ctx, px, pz, 2.4 * ppu, 'hsla(258,26%,22%,0.34)', 'hsla(258,26%,22%,0)', 0.22);
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  const mesh = new Mesh(
    new PlaneGeometry(ARENA.halfW * 2, ARENA.halfD * 2),
    toonMaterial({ color: '#FFFFFF', map: tex })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.name = 'camp-ground';
  return { mesh, footprints };
}
