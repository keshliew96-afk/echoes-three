// Persistent kill decals (§9 juice contract #6): dark ground splat under every
// kill, cosmetic-stream rotation/scale, holds then fades over ~20 s, hard cap
// 40 (oldest removed immediately — §1 density ceiling). One shared canvas
// splat texture; per-decal material carries the individual fade opacity.
import {
  CanvasTexture,
  CircleGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
} from 'three';
import { DECALS } from '../../core/constants.js';
import { PALETTE } from '../../data/palette.js';
import { EMBER_EXACT } from '../enemies/style.js';

let splatTexture = null;
let scorchTexture = null;

// Scorch blast texture (REFERENCE_BAR check 5, reference D: "lingering ground
// fire patches where shots land"): a burnt core that fades to a cracked,
// ember-licked edge. Alpha-only; the material tints it.
function getScorchTexture() {
  if (scorchTexture) return scorchTexture;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, size * 0.04, c, c, size * 0.48);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.72)');
  g.addColorStop(0.85, 'rgba(255,255,255,0.3)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, size * 0.48, 0, Math.PI * 2);
  ctx.fill();
  // Radial cracks so the burn reads as broken ground, not an airbrushed disc.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.3;
    ctx.lineWidth = size * (0.012 + 0.012 * ((i % 3) / 2));
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * size * 0.05, c + Math.sin(a) * size * 0.05);
    const bend = a + 0.22;
    ctx.quadraticCurveTo(
      c + Math.cos(bend) * size * 0.26,
      c + Math.sin(bend) * size * 0.26,
      c + Math.cos(a - 0.1) * size * 0.44,
      c + Math.sin(a - 0.1) * size * 0.44
    );
    ctx.stroke();
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  scorchTexture = tex;
  return tex;
}

// Irregular dark blot: soft central mass + satellite spatters. Generated once
// (per-decal variety comes from rotation/scale); alpha-only, tinted by the
// material color.
function getSplatTexture() {
  if (splatTexture) return splatTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const blob = (x, y, r, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.65, `rgba(255,255,255,${a * 0.75})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  blob(cx, cx, 40, 1);
  for (let i = 0; i < 9; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = 26 + Math.random() * 26;
    blob(cx + Math.cos(ang) * dist, cx + Math.sin(ang) * dist, 6 + Math.random() * 12, 0.85);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  splatTexture = tex;
  return tex;
}

export function createDecalPool(parent, cosmetic) {
  const live = []; // FIFO — index 0 is the oldest
  const geo = new CircleGeometry(1, 24);
  const tint = new Color(PALETTE.voidCharcoal);
  let seq = 0; // y-stagger sequence so overlapping decals never z-fight

  function spawn(x, z) {
    if (live.length >= DECALS.cap) {
      const oldest = live.shift(); // §1: oldest removed
      parent.remove(oldest.mesh);
      oldest.mesh.material.dispose();
    }
    const mat = new MeshBasicMaterial({
      map: getSplatTexture(),
      color: tint,
      transparent: true,
      opacity: DECALS.opacity,
      depthWrite: false,
    });
    const mesh = new Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = cosmetic.range(0, Math.PI * 2); // cosmetic-stream rotation
    const r = cosmetic.range(DECALS.minRadius, DECALS.maxRadius); // cosmetic-stream scale
    mesh.scale.set(r, r, 1);
    mesh.position.set(x, 0.006 + (seq % 24) * 0.0004, z);
    seq += 1;
    parent.add(mesh);
    live.push({ mesh, age: 0 });
  }

  // --- Lingering scorch (quake / AoE resolves). Its own pool: a burn is
  // bigger, rarer and longer-lived than a kill splat, and it carries a second
  // ember-tinted rim mesh that cools off in the first few seconds so the burn
  // reads as "this JUST happened" and then settles into ground history.
  const burns = []; // { core, rim, age, radius }
  const SCORCH = { cap: 14, lifeSec: 16, holdFrac: 0.6, glowSec: 3.2 };
  const scorchTint = new Color(PALETTE.voidCharcoal);

  function scorch(x, z, radius = 1.6) {
    if (burns.length >= SCORCH.cap) dropBurn(burns.shift());
    const tex = getScorchTexture();
    const core = new Mesh(
      geo,
      new MeshBasicMaterial({
        map: tex,
        color: scorchTint,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      })
    );
    core.rotation.x = -Math.PI / 2;
    core.rotation.z = cosmetic.range(0, Math.PI * 2);
    core.scale.set(radius, radius, 1);
    core.position.set(x, 0.007 + (seq % 24) * 0.0004, z);
    core.renderOrder = -3;
    const rim = new Mesh(
      geo,
      new MeshBasicMaterial({
        map: tex,
        color: EMBER_EXACT.clone(),
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.rotation.z = core.rotation.z;
    rim.scale.set(radius * 1.06, radius * 1.06, 1);
    rim.position.set(x, core.position.y + 0.0015, z);
    rim.renderOrder = -2;
    seq += 1;
    parent.add(core);
    parent.add(rim);
    burns.push({ core, rim, age: 0, radius, x, z });
  }

  function dropBurn(b) {
    parent.remove(b.core);
    parent.remove(b.rim);
    b.core.material.dispose();
    b.rim.material.dispose();
  }

  // Positions of burns still glowing hot — the caller sprinkles ember motes
  // over them (the "lingering ground fire" layer of REFERENCE_BAR check 5).
  function hotBurns() {
    const out = [];
    for (const b of burns) if (b.age < SCORCH.glowSec) out.push(b);
    return out;
  }

  function update(dt) {
    const holdSec = DECALS.fadeSec * DECALS.holdFrac;
    for (let i = live.length - 1; i >= 0; i--) {
      const d = live[i];
      d.age += dt;
      if (d.age >= DECALS.fadeSec) {
        parent.remove(d.mesh);
        d.mesh.material.dispose();
        live.splice(i, 1);
      } else if (d.age > holdSec) {
        const f = (d.age - holdSec) / (DECALS.fadeSec - holdSec);
        d.mesh.material.opacity = DECALS.opacity * (1 - f);
      }
    }
    const burnHold = SCORCH.lifeSec * SCORCH.holdFrac;
    for (let i = burns.length - 1; i >= 0; i--) {
      const b = burns[i];
      b.age += dt;
      if (b.age >= SCORCH.lifeSec) {
        dropBurn(b);
        burns.splice(i, 1);
        continue;
      }
      // The ember rim cools over the first seconds; the burn itself stays.
      const heat = Math.max(0, 1 - b.age / SCORCH.glowSec);
      b.rim.material.opacity = 0.34 * heat * (0.75 + 0.25 * Math.sin(b.age * 7));
      if (b.age > burnHold) {
        const f = (b.age - burnHold) / (SCORCH.lifeSec - burnHold);
        b.core.material.opacity = 0.62 * (1 - f);
      }
    }
  }

  return {
    spawn,
    scorch,
    hotBurns,
    update,
    count: () => live.length,
    scorchCount: () => burns.length,
  };
}
