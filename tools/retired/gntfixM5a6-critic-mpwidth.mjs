// gntfixM5a6-critic-mpwidth.mjs — copy of the net critic r6 probe tools/gntcnet6-mpwidth.mjs (outputs renamed, --out <name>). Original: net critic r6: does the multiplayer owner line (pills in the tab row) push the
// build pages out of the window at the small supported sizes? Host "Host" + guest "Maximilian Wolfe"
// (16 chars = NAME_MAX) + guest "Wren". Reward page and shop at 1024x576 / 1024x640 / 1152x648 / 1280x720 /
// 1366x768: the open page's frame rect vs the window, and every visible text box that leaves the window.
// SP control with --sp 1 (same pages, no session).
// node tools/gntcnet6-mpwidth.mjs --port 7846 [--sp 1]
import { openClient, closeClient, sleep, writeJson, startServer, PREVIEW, CAP } from './gntcnet6-lib.mjs';
import path from 'node:path';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const port = Number(A.port || 7846);
const SP = A.sp === '1';
const OUT = A.out || 'gntfixM5a6-critic-mpwidth';
const SIZES = [[1024, 576], [1024, 640], [1152, 648], [1280, 720], [1366, 768]];
const out = { tool: 'gntcnet6-mpwidth', sp: SP, results: {}, errors: {} };
const ev = (c, fn, arg) => c.page.evaluate(fn, arg);
async function waitOn(c, fn, timeout = 40000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { const v = await c.page.evaluate(fn); if (v) return v; } catch { /* */ } await sleep(100); } throw new Error(c.tag + ' timeout ' + String(fn).slice(0, 100)); }
const measure = () => {
  const vis = (e) => { let p = e; while (p) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false; p = p.parentElement; } return true; };
  const page = [...document.querySelectorAll('.rn-page')].find((e) => e.offsetParent && vis(e));
  const pr = page ? page.getBoundingClientRect() : null;
  const outside = [];
  if (page) for (const e of page.querySelectorAll('*')) {
    if (!e.offsetParent || !vis(e)) continue;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 2) continue;
    if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1 || (pr && (r.right > pr.right + 1 || r.left < pr.left - 1))) outside.push({ t: e.textContent.trim().slice(0, 30), cls: String(e.className).slice(0, 30), l: Math.round(r.left), r: Math.round(r.right), t0: Math.round(r.top), b: Math.round(r.bottom) });
  }
  const tabs = [...document.querySelectorAll('.rn-page .rn-ptab, .rn-page [class*="rn-ptab"]')].filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().width));
  return { win: [innerWidth, innerHeight], frame: pr && { l: Math.round(pr.left), r: Math.round(pr.right), t: Math.round(pr.top), b: Math.round(pr.bottom) }, outside: outside.slice(0, 12), nOutside: outside.length, tabs };
};
let srv = null; const cl = [];
try {
  if (!SP) srv = await startServer(port, ['--admin']);
  const names = SP ? ['Solo'] : ['Host', 'Maximilian Wolfe', 'Wren'];
  const url = (nm) => PREVIEW + `?menu=0&seed=7&netname=${encodeURIComponent(nm)}` + (SP ? '' : `&net=${encodeURIComponent(`ws://127.0.0.1:${port}/echoes`)}`);
  for (const [i, nm] of names.entries()) cl.push(await openClient(url(nm), { w: 1280, h: 720, tag: ['H', 'M', 'W'][i] }));
  const [H, ...G] = cl;
  await Promise.all(cl.map((c) => waitOn(c, () => window.__echoes.tick > 240, 120000)));
  if (!SP) {
    const code = await ev(H, async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
    for (const g of G) await ev(g, async (c) => { const n = window.__echoes.net; await n.join(c); n.setReady(true); return 1; }, code);
    await sleep(400);
    await ev(H, () => window.__echoes.net.start());
    for (const g of G) await waitOn(g, () => window.__echoes.net.session.status().synced);
  }
  await ev(H, () => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitOn(H, () => window.__echoes.state().run.phase === 'combat');
  await sleep(1200);
  await ev(H, () => window.__echoes.cmd('killAllEnemies'));
  for (const c of cl) await waitOn(c, () => { const v = window.__echoes.state().run; return v.phase === 'reward' && !!v.party; });
  await sleep(1200);
  const who = SP ? [H] : [H, G[0]];
  for (const [w, h] of SIZES) {
    for (const c of cl) await c.page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await sleep(1000);
    for (const c of who) { const m = await ev(c, measure); (out.results[`reward-${w}x${h}`] ||= {})[c.tag] = m; console.log('reward', w, h, c.tag, JSON.stringify(m).slice(0, 400)); if (w === 1024) await c.page.screenshot({ path: path.join(CAP, `${OUT}${SP ? '-sp' : ''}-reward-${c.tag}-${w}x${h}.png`) }); }
  }
  for (const c of cl) await c.page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await sleep(500);
  await ev(H, () => window.__echoes.content.world().runSystem().partyPick(0, 'leave'));
  if (!SP) for (const g of G) await ev(g, () => window.__echoes.content.world().runSystem().partyPick(window.__echoes.net.seat, 'leave'));
  await waitOn(H, () => window.__echoes.state().run.phase === 'path' || window.__echoes.state().run.phase === 'combat', 40000);
  await ev(H, () => { const v = window.__echoes.state().run; if (v.phase === 'path') window.__echoes.content.world().runSystem().choosePath(0); return 1; });
  await waitOn(H, () => window.__echoes.state().run.phase === 'combat', 20000);
  await ev(H, () => window.__echoes.cmd('skipToRoom', 7));
  for (const c of cl) await waitOn(c, () => window.__echoes.state().run.phase === 'shop', 40000);
  await sleep(1500);
  for (const [w, h] of SIZES) {
    for (const c of cl) await c.page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await sleep(1000);
    for (const c of who) { const m = await ev(c, measure); (out.results[`shop-${w}x${h}`] ||= {})[c.tag] = m; console.log('shop', w, h, c.tag, JSON.stringify(m).slice(0, 400)); if (w === 1024 || w === 1152) await c.page.screenshot({ path: path.join(CAP, `${OUT}${SP ? '-sp' : ''}-shop-${c.tag}-${w}x${h}.png`) }); }
  }
} catch (e) { out.crash = String(e.stack || e); console.log('CRASH', out.crash); }
finally {
  for (const c of cl) if (c) out.errors[c.tag] = c.errors;
  for (const c of cl) if (c) await closeClient(c);
  if (srv) srv.proc.kill();
  writeJson(`${OUT}${SP ? '-sp' : ''}.json`, out);
  console.log('pageErrors', JSON.stringify(out.errors));
}
