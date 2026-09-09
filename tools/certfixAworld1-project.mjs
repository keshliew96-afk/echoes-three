// certfixAworld1 — exact ground-plane projection for the 3/4 rig in
// core/constants.js + render/camera.js, so prop placement can be aimed at the
// FRAME's edges rather than the arena's. Read-only maths; no game code.
const CAM = { fov: 45, distance: 12, elevationDeg: 52 };
const W = Number(process.env.VW || 1600), H = Number(process.env.VH || 900);
const el = (CAM.elevationDeg * Math.PI) / 180;
const offY = CAM.distance * Math.sin(el), offZ = CAM.distance * Math.cos(el);
const fx = Number(process.argv[2] || 0), fz = Number(process.argv[3] || 0); // camera focus
const cam = [fx, offY, fz + offZ];
const Zc = [0, Math.sin(el), Math.cos(el)]; // camera -forward
const Xc = [1, 0, 0];
const Yc = [0, Math.cos(el), -Math.sin(el)];
const tanHalf = Math.tan((CAM.fov * Math.PI) / 180 / 2), aspect = W / H;
export function project(x, y, z) {
  const d = [x - cam[0], y - cam[1], z - cam[2]];
  const vx = d[0] * Xc[0] + d[1] * Xc[1] + d[2] * Xc[2];
  const vy = d[0] * Yc[0] + d[1] * Yc[1] + d[2] * Yc[2];
  const vz = d[0] * Zc[0] + d[1] * Zc[1] + d[2] * Zc[2];
  const depth = -vz;
  if (depth <= 0.01) return null;
  return [Math.round(((vx / (depth * tanHalf * aspect)) + 1) / 2 * W),
          Math.round((1 - vy / (depth * tanHalf)) / 2 * H)];
}
if (process.argv[4] === '--grid') {
  console.log(`focus (${fx},${fz})  viewport ${W}x${H}`);
  for (let z = -8; z <= 8; z += 2) {
    const row = [];
    for (let x = -12; x <= 12; x += 3) { const p = project(x, 0, z); row.push(`${String(x).padStart(3)},${String(z).padStart(2)}:${p ? p.join('/') : 'behind'}`); }
    console.log(row.join(' '));
  }
} else if (process.argv[4]) {
  for (const pt of process.argv.slice(4)) {
    const [x, z, y] = pt.split(',').map(Number);
    console.log(pt, '->', project(x, y || 0, z));
  }
}
