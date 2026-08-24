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

let splatTexture = null;

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
  }

  return { spawn, update, count: () => live.length };
}
