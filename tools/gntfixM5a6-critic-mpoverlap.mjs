// gntfixM5a6-critic-mpoverlap.mjs — net critic r6: overlapping-text audit of every multiplayer build page and
// session overlay (NET5-F1 re-check, widened): reward page at 6 window sizes (host + 2 guests, so the
// owner pills read "you" / a player name / "AI"), the guest's socket screen, a "reconnecting" session
// note over the open page, the door page, and the shop. Text-on-text pairs = visible elements with their
// own text nodes, tight text boxes intersecting > 25 % of the smaller box (not ancestor / descendant).
// node tools/gntfixM5a6-critic-mpoverlap.mjs --port 7844
import { openClient, closeClient, sleep, writeJson, startServer, admin, PREVIEW, CAP } from './gntcnet6-lib.mjs';
import path from 'node:path';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const port = Number(A.port || 7844);
const SIZES = [[1024, 576], [1024, 640], [1280, 720], [1600, 900], [1920, 1080], [2560, 1440]];
const out = { tool: 'gntfixM5a6-critic-mpoverlap', startedAt: new Date().toISOString(), pages: {}, pills: {}, errors: {} };
const ev = (c, fn, arg) => c.page.evaluate(fn, arg);
async function waitOn(c, fn, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { const v = await c.page.evaluate(fn); if (v) return v; } catch { /* */ } await sleep(80); } throw new Error(c.tag + ' timeout ' + String(fn).slice(0, 100)); }
const audit = () => {
  const els = [...document.querySelectorAll('body *')].filter((e) => {
    if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return false;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!own) return false;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    let p = e; while (p) { const s = getComputedStyle(p); if (s.display === 'none' || Number(s.opacity) === 0 || s.visibility === 'hidden') return false; p = p.parentElement; }
    const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  });
  const boxes = els.map((e) => {
    const rg = document.createRange(); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); for (const r of rg.getClientRects()) { x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); } }
    return { e, t: e.textContent.trim().slice(0, 40), x0, y0, x1, y1, cls: (typeof e.className === 'string' ? e.className : '') };
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
  const offscreen = boxes.filter((b) => b.x0 < -1 || b.y0 < -1 || b.x1 > innerWidth + 1 || b.y1 > innerHeight + 1).map((b) => ({ t: b.t, cls: b.cls.slice(0, 30), box: [Math.round(b.x0), Math.round(b.y0), Math.round(b.x1), Math.round(b.y1)] })).slice(0, 8);
  const pills = [...document.querySelectorAll('.rn-powner')].filter((e) => e.offsetParent).map((e) => e.textContent.trim());
  return { n: boxes.length, pairs, offscreen, pills };
};
const record = async (key, c, shotName) => {
  const r = await ev(c, audit);
  (out.pages[key] ||= {})[c.tag] = r;
  if (shotName) await c.page.screenshot({ path: path.join(CAP, shotName) });
  console.log(key, c.tag, 'texts', r.n, 'pairs', r.pairs.length, JSON.stringify(r.pairs.slice(0, 4)), 'offscreen', r.offscreen.length, 'pills', JSON.stringify(r.pills));
  return r;
};
let srv = null; const cl = [];
try {
  srv = await startServer(port, ['--admin']);
  const url = (nm) => PREVIEW + `?menu=0&seed=7&netname=${nm}&net=${encodeURIComponent(`ws://127.0.0.1:${port}/echoes`)}`;
  for (const nm of ['Host', 'Fox', 'Wren']) cl.push(await openClient(url(nm), { w: 1280, h: 720, tag: nm }));
  const [H, F, W] = cl;
  await Promise.all(cl.map((c) => waitOn(c, () => window.__echoes.tick > 240, 120000)));
  const code = await ev(H, async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
  for (const g of [F, W]) await ev(g, async (c) => { const n = window.__echoes.net; await n.join(c); n.setReady(true); return 1; }, code);
  await sleep(400);
  await ev(H, () => window.__echoes.net.start());
  for (const g of [F, W]) await waitOn(g, () => window.__echoes.net.session.status().synced);
  const peers = await Promise.all(cl.map((c) => ev(c, () => window.__echoes.net.peerId)));
  const fs = await ev(F, () => window.__echoes.net.seat);
  await ev(H, () => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitOn(H, () => window.__echoes.state().run.phase === 'combat');
  await sleep(1500);
  await ev(H, () => window.__echoes.cmd('killAllEnemies'));
  for (const c of cl) await waitOn(c, () => { const v = window.__echoes.state().run; return v.phase === 'reward' && !!v.party; });
  await sleep(1200);
  for (const [w, h] of SIZES) {
    for (const c of cl) await c.page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await sleep(1000);
    for (const c of [H, F]) await record(`reward-${w}x${h}`, c, `gntfixM5a6-critic-mpoverlap-reward-${c.tag}-${w}.png`);
  }
  for (const c of cl) await c.page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await sleep(800);
  // a session note over the open page: Wren's socket closed 4 s
  await admin(port, '/admin/drop', { peerId: peers[2], mode: 'close', forMs: 4000 });
  let seen = null;
  for (let i = 0; i < 30 && !seen; i++) { await sleep(150); seen = await ev(F, () => { const t = document.body.innerText || ''; return /reconnect/i.test(t) ? t.match(/[^\n]*reconnect[^\n]*/i)[0] : null; }); }
  out.dropNote = seen;
  for (const c of [H, F]) await record('reward-dropnote-1280x720', c, `gntfixM5a6-critic-mpoverlap-dropnote-${c.tag}.png`);
  await F.page.setViewport({ width: 1024, height: 576, deviceScaleFactor: 1 });
  await sleep(700);
  await record('reward-dropnote-1024x576', F, 'gntfixM5a6-critic-mpoverlap-dropnote-Fox-1024.png');
  await F.page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await waitOn(W, () => window.__echoes.net.session.status().synced, 30000);
  await sleep(1500);
  // the guest's own socket screen
  out.socketOpen = await ev(F, () => { try { return window.__echoes.cmd('openSocket'); } catch (e) { return 'ERR ' + e.message; } });
  await sleep(1200);
  await record('socket-1280x720', F, 'gntfixM5a6-critic-mpoverlap-socket-Fox-1280.png');
  await F.page.setViewport({ width: 1024, height: 576, deviceScaleFactor: 1 });
  await sleep(900);
  await record('socket-1024x576', F, 'gntfixM5a6-critic-mpoverlap-socket-Fox-1024.png');
  await ev(F, () => { try { return window.__echoes.cmd('closeSocket'); } catch (e) { return 'ERR ' + e.message; } });
  await F.page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await sleep(600);
  // everyone leaves -> door page
  await ev(H, () => window.__echoes.content.world().runSystem().partyPick(0, 'leave'));
  for (const g of [F, W]) await ev(g, () => window.__echoes.content.world().runSystem().partyPick(window.__echoes.net.seat, 'leave'));
  await waitOn(H, () => window.__echoes.state().run.phase === 'path', 20000);
  await sleep(1200);
  for (const c of [H, F]) await record('door-1280x720', c, `gntfixM5a6-critic-mpoverlap-door-${c.tag}.png`);
  // shop
  await ev(H, () => window.__echoes.content.world().runSystem().choosePath(0));
  await waitOn(H, () => window.__echoes.state().run.phase === 'combat', 20000);
  await ev(H, () => { try { return window.__echoes.cmd('skipToRoom', 7); } catch (e) { return 'ERR ' + e.message; } });
  for (const c of cl) await waitOn(c, () => { const v = window.__echoes.state().run; return v.phase === 'shop' && !!v.partyShop; }, 40000);
  await sleep(1500);
  for (const [w, h] of [[1024, 576], [1280, 720], [1920, 1080]]) {
    for (const c of cl) await c.page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await sleep(1000);
    for (const c of [H, F]) await record(`shop-${w}x${h}`, c, `gntfixM5a6-critic-mpoverlap-shop-${c.tag}-${w}.png`);
  }
  out.foxSeat = fs;
} catch (e) { out.crash = String(e.stack || e); console.log('CRASH', out.crash); }
finally {
  for (const c of cl) if (c) out.errors[c.tag] = c.errors;
  for (const c of cl) if (c) await closeClient(c);
  if (srv) srv.proc.kill();
  const tot = Object.values(out.pages).flatMap((p) => Object.values(p)).reduce((s, r) => s + r.pairs.length, 0);
  out.totalPairs = tot;
  writeJson('gntfixM5a6-critic-mpoverlap.json', out);
  console.log('TOTAL overlapping text pairs', tot, 'pageErrors', JSON.stringify(out.errors));
}
