// Round D2 gate report: for every yhd-gate-* / yhd-ab-* capture present, print the
// DOM gate truth, the banner/pointer box pixel signatures, the analyzer's luma
// figures, and (for A/B pairs) the HUD-on vs HUD-off diff against the on-vs-on2
// motion noise floor. Boxes are the live-combat frame's banner box + the six
// pointer chips it drew (yhd-gate-combat), at 1600x900.
import { existsSync, readFileSync } from 'fs';
import sharp from 'sharp';

const BANNER = [644, 14, 312, 35];
const BANNER_WIDE = [480, 6, 640, 52]; // any banner variant's footprint at 1600x900
const PTRS = [[326, 854, 44, 44], [1210, 854, 44, 44], [1554, 226, 44, 44], [1554, 586, 44, 44], [2, 234, 44, 44], [2, 587, 44, 44]];
const STRIPS = { left: [0, 60, 48, 740], right: [1552, 60, 48, 740], bottomL: [0, 852, 500, 48], bottomR: [1100, 852, 500, 48] };

const load = async (f) => {
  const { data, info } = await sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height, C: info.channels };
};
const px = (img, x, y) => { const i = (y * img.W + x) * img.C; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const isPlate = (r, g, b) => r >= 26 && r <= 58 && g >= 23 && g <= 54 && b >= 19 && b <= 48 && r >= g && g >= b && r - b >= 3 && r - b <= 16;
const isInk = (r, g, b) => r >= 190 && g >= 182 && b >= 165 && r >= g && g >= b && r - b <= 40;
function sig(img, [x, y, w, h]) {
  let plate = 0, ink = 0, l200 = 0, l160 = 0, n = 0;
  for (let yy = y; yy < Math.min(img.H, y + h); yy++) for (let xx = x; xx < Math.min(img.W, x + w); xx++) {
    const [r, g, b] = px(img, xx, yy); n++;
    if (isPlate(r, g, b)) plate++;
    if (isInk(r, g, b)) ink++;
    const L = luma(r, g, b); if (L > 200) l200++; if (L > 160) l160++;
  }
  return { n, plate, ink, l200, l160 };
}
function diff(a, b, [x, y, w, h], T = 24) {
  let n = 0, d = 0;
  for (let yy = y; yy < Math.min(a.H, y + h); yy++) for (let xx = x; xx < Math.min(a.W, x + w); xx++) {
    const p = px(a, xx, yy), q = px(b, xx, yy); n++;
    if (Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])) > T) d++;
  }
  return { n, d };
}
const pct = (a, n) => ((100 * a) / n).toFixed(2) + '%';
const sumSig = (img, boxes) => boxes.reduce((acc, b) => { const s = sig(img, b); acc.n += s.n; acc.plate += s.plate; acc.ink += s.ink; acc.l200 += s.l200; return acc; }, { n: 0, plate: 0, ink: 0, l200: 0 });

const names = process.argv.slice(2);
for (const name of names) {
  const con = `captures/${name}.console.txt`;
  if (!existsSync(con)) { console.log(`\n### ${name}: (not captured yet)`); continue; }
  const txt = readFileSync(con, 'utf8');
  const errs = txt.split('\n').filter((l) => /^\[PAGEERROR\]|^\[error\]|^\[HARNESS-ERROR\]/.test(l)).length;
  const ev = txt.split('\n').filter((l) => l.startsWith('[EVAL]')).map((l) => { try { return JSON.parse(l.slice(7)); } catch { return null; } });
  const g = [...ev].reverse().find((e) => e && e.hudCombat);
  console.log(`\n### ${name}  pageErrors=${errs}`);
  if (g) {
    console.log(`DOM: phase=${g.phase} active=${g.active} combatActive=${g.combatActive} room=${g.room} scene=${g.scene ?? '?'} vfx=${g.vfxMode ?? '?'} pages=${JSON.stringify(g.pages)} wash=${g.washOpacity}`);
    console.log(`HUD: combat=${g.hudCombat.combat} bannerMode=${g.banner.mode} gated=${g.banner.gated} show=${g.banner.show} opacity=${g.banner.opacity} css=${g.banner.cssOpacity} text="${g.banner.text}" box=${JSON.stringify(g.banner.box)}`);
    console.log(`THREAT: gated=${g.threat.gated} offFrame=${g.threat.offFrame} drawn=${g.threat.markersDrawn} dom=${g.threat.domMarkers} tmNodes=${g.threat.tmNodes} uncued=${g.threat.uncued} markers=${g.markers.length} enemies=${g.enemies.length} room=${JSON.stringify(g.roomState)} fps=${g.fps}`);
  }
  const others = ev.filter((e) => e && !e.hudCombat && e !== 'lib');
  if (others.length) console.log(`STEPS: ${others.map((e) => JSON.stringify(e)).join(' | ').slice(0, 900)}`);
  const png = existsSync(`captures/${name}.png`) ? `captures/${name}.png` : existsSync(`captures/${name}-on.png`) ? `captures/${name}-on.png` : null;
  if (png) {
    const img = await load(png);
    const b = sig(img, BANNER), bw = sig(img, BANNER_WIDE), p = sumSig(img, PTRS);
    const st = Object.entries(STRIPS).map(([k, bx]) => { const s = sig(img, bx); return `${k}:ink=${s.ink}/plate=${s.plate}`; }).join(' ');
    console.log(`PIX ${png}: banner(644,14,312,35) plate=${b.plate} (${pct(b.plate, b.n)}) ink=${b.ink} luma>200=${b.l200} luma>160=${b.l160} | bannerWide(480,6,640,52) ink=${bw.ink} luma>200=${bw.l200} | 6 ptr boxes: plate=${p.plate} ink=${p.ink} luma>200=${p.l200} | strips ${st}`);
  }
  if (existsSync(`captures/${name}-on.png`) && existsSync(`captures/${name}-off.png`)) {
    const on = await load(`captures/${name}-on.png`), off = await load(`captures/${name}-off.png`), on2 = await load(`captures/${name}-on2.png`);
    const line = (label, bx) => {
      const s = diff(on, off, bx), nz = diff(on, on2, bx);
      return `${label}: on-off=${s.d} (${pct(s.d, s.n)}) noise(on-on2)=${nz.d} (${pct(nz.d, nz.n)})`;
    };
    const ptr = PTRS.reduce((acc, bx) => { const s = diff(on, off, bx), nz = diff(on, on2, bx); acc.d += s.d; acc.n += s.n; acc.nz += nz.d; return acc; }, { d: 0, n: 0, nz: 0 });
    console.log(`A/B  ${line('banner', BANNER)} | ${line('bannerWide', BANNER_WIDE)} | ptrs: on-off=${ptr.d} (${pct(ptr.d, ptr.n)}) noise=${ptr.nz} | ${line('left', STRIPS.left)} | ${line('right', STRIPS.right)} | ${line('bottomL', STRIPS.bottomL)} | ${line('bottomR', STRIPS.bottomR)} | ${line('bar(503,809,595,75)', [503, 809, 595, 75])} | ${line('centre(600,300,400,300)', [600, 300, 400, 300])}`);
    const ab = txt.split('\n').filter((l) => l.startsWith('[AB]')).join(' ; ');
    console.log(`A/B  ${ab}`);
  }
}
