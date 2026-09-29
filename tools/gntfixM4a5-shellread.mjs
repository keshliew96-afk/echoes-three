// gntfixM4a5 — F4 shield-shell readability, measured in pixels. ?level=L&seed=S on a production preview; room 1
// combat, sim FROZEN (render keeps running); for each party member a body box is projected from its feet (y 0) to
// its head (y 1.15). Frames: A = no shields (control), B = no shields again (noise floor), C = a 20-point shield on
// all four (setStatus), D = C again after 0.6 s (shimmer). Per member and box: mean |dRGB| vs A, the saturation
// ratio (mean HSV S of the box / A's), the share of body pixels whose colour moved > 40 (washed), and the
// luma shift. Also the whole party crop as PNGs for the eye.
// Usage: node tools/gntfixM4a5-shellread.mjs <tag> [--level 1] [--seed 1] [--w 1600 --h 900]
import { boot, ev, writeJson, BASE, sleep, waitFor, arg } from './gntccontent5-lib.mjs';
import sharp from 'sharp';
import path from 'node:path';
const tag = process.argv[2] || 'x';
const L = +arg('level', 1), S = +arg('seed', 1), W = +arg('w', 1600), H = +arg('h', 900);
const { browser, page, errors } = await boot(BASE + `?level=${L}&seed=${S}`, { w: W, h: H });
await waitFor(page, () => { const s = window.__echoes.state(); return s.run && s.run.phase === 'combat' && s.run.room === 1; }, { timeout: 90000 });
await sleep(2500);
const setup = await ev(page, () => {
  const E = window.__echoes;
  E.sim.freeze();
  const st = E.state();
  for (const p of st.party) E.cmd('clearStatus', p.id, null); // frame A = no status on anyone
  // park the enemies far away so nothing but the party is inside the boxes
  return { ids: st.party.map((p) => p.id), cls: st.party.map((p) => p.classId || 'healer'), tick: E.tick };
});
const boxes = async () => ev(page, () => {
  const E = window.__echoes;
  return E.state().party.map((p) => {
    const f = E.content.project(p.x, p.z, 0), h = E.content.project(p.x, p.z, 1.15);
    const ht = Math.max(20, f.y - h.y);
    const w = ht * 0.78;
    return { id: p.id, cls: p.classId || (p.id === 0 ? 'healer' : String(p.kind)), x: Math.round(h.x - w / 2), y: Math.round(h.y), w: Math.round(w), h: Math.round(ht) };
  });
});
const grab = async (name) => { const f = path.resolve('captures', `gntfixM4a5-shellread-${tag}-${name}.png`); await page.screenshot({ path: f }); return f; };
await sleep(800);
const B0 = await boxes();
const fA = await grab('A');
await sleep(600);
const fB = await grab('B');
const applied = await ev(page, (ids) => ids.map((id) => window.__echoes.cmd('setStatus', id, 'shield', 20, 100000)), setup.ids);
await sleep(700);
const fC = await grab('C');
await sleep(600);
const fD = await grab('D');
const B1 = await boxes();
await ev(page, (ids) => ids.forEach((id) => window.__echoes.cmd('clearStatus', id, 'shield')), setup.ids);
const wardApplied = await ev(page, (ids) => ids.map((id) => window.__echoes.cmd('setStatus', id, 'ward', 0.15, 100000)), setup.ids);
await sleep(700);
const fE = await grab('E');
await ev(page, (ids) => ids.forEach((id) => window.__echoes.cmd('clearStatus', id, 'ward')), setup.ids);
await ev(page, () => window.__echoes.sim.thaw());
const load = async (f) => { const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, W: info.width, H: info.height }; };
const [A, Bn, C, D, Ew] = await Promise.all([fA, fB, fC, fD, fE].map(load));
const hsvS = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
function stats(X, box) {
  let d = 0, n = 0, sX = 0, sA = 0, washed = 0, lX = 0, lA = 0;
  for (let y = Math.max(0, box.y); y < Math.min(A.H, box.y + box.h); y++) for (let x = Math.max(0, box.x); x < Math.min(A.W, box.x + box.w); x++) {
    const i = (y * A.W + x) * 3;
    const ar = A.data[i], ag = A.data[i + 1], ab = A.data[i + 2], xr = X.data[i], xg = X.data[i + 1], xb = X.data[i + 2];
    const dd = (Math.abs(ar - xr) + Math.abs(ag - xg) + Math.abs(ab - xb)) / 3;
    d += dd; n++; if (dd > 40) washed++;
    sA += hsvS(ar, ag, ab); sX += hsvS(xr, xg, xb);
    lA += 0.2126 * ar + 0.7152 * ag + 0.0722 * ab; lX += 0.2126 * xr + 0.7152 * xg + 0.0722 * xb;
  }
  return { meanDelta: +(d / n).toFixed(1), satRatio: +(sX / Math.max(1e-6, sA)).toFixed(3), washedPct: +((100 * washed) / n).toFixed(1), lumaShift: +((lX - lA) / n).toFixed(1) };
}
const inner = (b) => ({ x: Math.round(b.x + b.w * 0.25), y: Math.round(b.y + b.h * 0.15), w: Math.round(b.w * 0.5), h: Math.round(b.h * 0.6) });
const rows = B0.map((b, i) => ({ cls: b.cls, box: b, noise: stats(Bn, b), shield: stats(C, b), shield2: stats(D, b), ward: stats(Ew, b), inner: { noise: stats(Bn, inner(b)), shield: stats(C, inner(b)), ward: stats(Ew, inner(b)) } }));
// party crop for the eye (union of boxes + margin)
const ux0 = Math.max(0, Math.min(...B0.map((b) => b.x)) - 40), uy0 = Math.max(0, Math.min(...B0.map((b) => b.y)) - 40);
const ux1 = Math.min(A.W, Math.max(...B0.map((b) => b.x + b.w)) + 40), uy1 = Math.min(A.H, Math.max(...B0.map((b) => b.y + b.h)) + 40);
const crop = { left: ux0, top: uy0, width: ux1 - ux0, height: uy1 - uy0 };
for (const [f, n] of [[fA, 'A'], [fC, 'C'], [fE, 'E']]) await sharp(f).extract(crop).resize({ width: crop.width * 2 }).toFile(path.resolve('captures', `gntfixM4a5-shellread-${tag}-crop${n}.png`));
const moved = B0.map((b, i) => Math.hypot(b.x - B1[i].x, b.y - B1[i].y));
const out = { tag, L, S, W, H, setup, applied: applied.map((a) => a && (a.mag ?? a.refused ?? a.error)), wardApplied: wardApplied.map((a) => a && (a.mag ?? a.refused ?? a.error)), moved, rows, errors };
writeJson(`gntfixM4a5-shellread-${tag}.json`, out);
for (const r of rows) console.log(r.cls.padEnd(9), 'INNER noise', JSON.stringify(r.inner.noise), 'shield', JSON.stringify(r.inner.shield), 'ward', JSON.stringify(r.inner.ward));
for (const r of rows) console.log(r.cls.padEnd(9), 'noise', JSON.stringify(r.noise), '| shield', JSON.stringify(r.shield), '| +0.6s', JSON.stringify(r.shield2), '| ward', JSON.stringify(r.ward));
console.log('applied', JSON.stringify(out.applied), 'boxes moved px', moved.map((m) => m.toFixed(1)).join(','), 'errors', errors.length);
await browser.close();
