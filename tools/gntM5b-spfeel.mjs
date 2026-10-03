#!/usr/bin/env node
// gntM5b-spfeel — the SINGLE-PLAYER reference for tools/gntM5b-feel.mjs:
// the same GPU harness window size, the same trusted key presses, no network.
// Reports the browser's own input delivery (event timeStamp -> main-thread
// dispatch), frames from dispatch to a visibly moved Healer, and fps — so a
// guest's numbers can be read against what the game does without a session.
//   node tools/gntM5b-spfeel.mjs [--w 1600 --h 900] [--base http://127.0.0.1:5199/] [--out captures/gntM5b-spfeel.json]
import { writeFileSync } from 'node:fs';
import { launchEchoes, waitReady } from './gnt-arch-browser.mjs';
import { openEchoesWindow } from './gntM5a-botlib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const W = Number(arg('w', 1600));
const H = Number(arg('h', 900));
const base = arg('base', 'http://127.0.0.1:5199/');
const out = arg('out', 'captures/gntM5b-spfeel.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null;
};
let browser = null;
const report = { schema: 'echoes-gntM5b-spfeel/1', startedAt: new Date().toISOString(), w: W, h: H };
try {
  browser = await launchEchoes({ gpu: true, background: true, autoplay: true, width: W, height: H });
  const c = await openEchoesWindow(browser, `${base}?menu=0&seed=7`, { width: W, height: H });
  await waitReady(c.page, { minTick: 120, timeout: 150000 });
  await c.page.evaluate(() => {
    const E = window.__echoes;
    E.cmd('startRun', { act: 1 });
  });
  await sleep(2500);
  await c.page.evaluate(() => {
    const E = window.__echoes;
    const P = (window.__gntFeel = { keys: [], frames: [] });
    addEventListener('keydown', (e) => { if (!e.repeat) P.keys.push({ code: e.code, ts: e.timeStamp, td: performance.now() }); }, { capture: true });
    const loop = () => {
      requestAnimationFrame(loop);
      const p = E.state().party[0];
      P.frames.push({ tp: performance.now(), x: p.x, z: p.z });
    };
    requestAnimationFrame(loop);
  });
  for (let i = 0; i < 16; i++) {
    const k = i % 2 ? 'KeyA' : 'KeyD';
    await sleep(450);
    await c.page.keyboard.down(k);
    await sleep(260);
    await c.page.keyboard.up(k);
  }
  const P = await c.page.evaluate(() => window.__gntFeel);
  const F = P.frames;
  const disp = P.keys.map((k) => k.td - k.ts);
  const moves = [];
  for (const k of P.keys) {
    const i = F.findIndex((f) => f.tp > k.td);
    if (i < 1) continue;
    const b = F[i - 1];
    let n = null;
    for (let j = i; j < Math.min(F.length, i + 30); j++) {
      if (Math.hypot(F[j].x - b.x, F[j].z - b.z) > 1e-3) {
        n = j - i + 1;
        break;
      }
    }
    moves.push(n);
  }
  const fr = [];
  for (let i = 1; i < F.length; i++) fr.push(F[i].tp - F[i - 1].tp);
  report.dispatchMs = { p50: Math.round(pct(disp, 0.5) * 10) / 10, p95: Math.round(pct(disp, 0.95) * 10) / 10, max: Math.round(Math.max(...disp) * 10) / 10 };
  // Sim-state position (the Healer moves on the next TICK; SP has no
  // render-ahead): frames until the sim position changed.
  report.simMoveFrames = moves;
  report.fps = { avg: Math.round((fr.length / fr.reduce((a, b) => a + b, 0)) * 10000) / 10, frameMsP95: Math.round(pct(fr, 0.95) * 10) / 10 };
  report.pageErrors = c.errors.slice(0, 5);
} catch (err) {
  report.crash = String(err && err.stack ? err.stack : err);
} finally {
  if (browser) await browser.close().catch(() => {});
}
writeFileSync(out, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report));
process.exit(report.crash ? 1 : 0);
