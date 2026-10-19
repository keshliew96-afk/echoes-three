// gntfixM5a5-critic-partytabs.mjs — verbatim copy of tools/gntcnet5-partytabs.mjs with renamed outputs (the critic's evidence is kept). Original header: net critic r5: the multiplayer party page at supported window sizes —
// do the per-character tab labels ("you" / "player" / countdown) overlap the character names?
// Host + 1 guest (own browsers, own child server). Generic overlapping-text audit: every visible element
// with its own text node; pairs (not ancestor/descendant) whose boxes intersect by > 25 % of the smaller.
// node tools/gntcnet5-partytabs.mjs --port 7844
import { openClient, closeClient, sleep, writeJson, startServer, PREVIEW, CAP } from './gntcnet5-lib.mjs';
import path from 'node:path';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const port = Number(A.port || 7844);
const SIZES = [[1024, 640], [1280, 720], [1600, 900], [1920, 1080]];
const out = { tool: 'gntcnet5-partytabs', sizes: {}, errors: {} };
const ev = (c, fn, arg) => c.page.evaluate(fn, arg);
async function waitOn(c, fn, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { const v = await c.page.evaluate(fn); if (v) return v; } catch { /* */ } await sleep(80); } throw new Error(c.tag + ' timeout ' + String(fn).slice(0, 100)); }
const audit = () => {
  const els = [...document.querySelectorAll('body *')].filter((e) => {
    if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return false;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!own) return false;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  });
  const boxes = els.map((e) => {
    // tight box of the element's own text nodes
    const rg = document.createRange(); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); for (const r of rg.getClientRects()) { x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); } }
    return { e, t: e.textContent.trim().slice(0, 40), x0, y0, x1, y1, cls: (e.className && e.className.baseVal === undefined ? e.className : '') + '' };
  }).filter((b) => Number.isFinite(b.x0));
  const pairs = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    if (w <= 1 || h <= 1) continue;
    const small = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0));
    const frac = (w * h) / small;
    if (frac > 0.25) pairs.push({ a: a.t, ac: a.cls.slice(0, 40), b: b.t, bc: b.cls.slice(0, 40), frac: Math.round(frac * 100) / 100, at: [Math.round(Math.max(a.x0, b.x0)), Math.round(Math.max(a.y0, b.y0))] });
  }
  return { n: boxes.length, pairs };
};
let srv = null; const cl = [];
try {
  srv = await startServer(port, ['--admin']);
  const url = (nm) => PREVIEW + `?menu=0&seed=7&netname=${nm}&net=${encodeURIComponent(`ws://127.0.0.1:${port}/echoes`)}`;
  cl[0] = await openClient(url('Host'), { w: 1280, h: 720, tag: 'Host' });
  cl[1] = await openClient(url('Fox'), { w: 1280, h: 720, tag: 'Fox' });
  const [H, G] = cl;
  await Promise.all(cl.map((c) => waitOn(c, () => window.__echoes.tick > 240, 120000)));
  const code = await ev(H, async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
  await ev(G, async (c) => { const n = window.__echoes.net; await n.join(c); n.setReady(true); return 1; }, code);
  await sleep(400);
  await ev(H, () => window.__echoes.net.start());
  await waitOn(G, () => window.__echoes.net.session.status().synced);
  await ev(H, () => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitOn(H, () => window.__echoes.state().run.phase === 'combat');
  await sleep(1500);
  await ev(H, () => window.__echoes.cmd('killAllEnemies'));
  await waitOn(H, () => { const v = window.__echoes.state().run; return v.phase === 'reward' && !!v.party; });
  await waitOn(G, () => { const v = window.__echoes.state().run; return v.phase === 'reward' && !!v.party; });
  await sleep(900);
  for (const [w, h] of SIZES) {
    for (const c of cl) await c.page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await sleep(900);
    const r = {};
    for (const c of cl) {
      r[c.tag] = await ev(c, audit);
      await c.page.screenshot({ path: path.join(CAP, `gntfixM5a5-critic-partytabs-${c.tag}-${w}.png`) });
    }
    out.sizes[`${w}x${h}`] = r;
    console.log(w, h, 'host pairs', r.Host.pairs.length, JSON.stringify(r.Host.pairs.slice(0, 6)), '| guest pairs', r.Fox.pairs.length, JSON.stringify(r.Fox.pairs.slice(0, 6)));
  }
  // guest picks -> "waiting" toast + tab text; audit at 1280x720
  for (const c of cl) await c.page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await sleep(600);
  await ev(G, () => window.__echoes.content.world().runSystem().partyPick(window.__echoes.net.seat, 'leave'));
  await sleep(2200);
  out.afterPick = await ev(G, audit);
  await G.page.screenshot({ path: path.join(CAP, 'gntfixM5a5-critic-partytabs-Fox-afterpick-1280.png') });
  console.log('after pick guest pairs', out.afterPick.pairs.length, JSON.stringify(out.afterPick.pairs.slice(0, 6)));
} catch (e) { out.crash = String(e.stack || e); console.log('CRASH', out.crash); }
finally {
  for (const c of cl) if (c) out.errors[c.tag] = c.errors;
  for (const c of cl) if (c) await closeClient(c);
  if (srv) srv.proc.kill();
  writeJson('gntfixM5a5-critic-partytabs.json', out);
  console.log('pageErrors', JSON.stringify(out.errors));
}
