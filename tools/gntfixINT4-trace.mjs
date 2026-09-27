#!/usr/bin/env node
// Journey critic r4 (audit re-open G3): the FULL 8-room real-input frame trace on a quiet machine in a FRESH browser.
// Player path (plain URL, fresh profile): boot → title → New Game (Enter) → camp → walk to the portal → E →
// Level 1 rooms 1–8 by real input (right-mouse basics aimed at the nearest enemy, keys 1–4, Enter on every page,
// Esc on a socket screen) → the level-clear card → Level 2 room 1 (+ room 2) by real input. NO screenshots and NO
// pause probes during the trace. Every rAF frame is recorded in the page as [dtMs, wallMs, tick]; every sim event
// (except sound) as [tick, type]; a 10 Hz timeline of {level, room, phase, screen, mode}. chrome.exe is sampled
// every 500 ms in a child process. Raw data → captures/gntcjourney4-trace8-<tag>.json (analysed separately).
//   node tools/gntcjourney4-trace8.mjs [--url http://127.0.0.1:4330] [--seed 7] [--tag prod] [--quiet 10]
import { writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:4310'); const tag = arg('tag', 'prod'); const seed = Number(arg('seed', 7));
const quietS = Number(arg('quiet', 10)); const fightMs = Number(arg('fightms', 45000)); const l2rooms = Number(arg('l2rooms', 2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
async function waitFor(page, body, { timeout = 30000, every = 100 } = {}) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; await sleep(every); } return -1; }
const load = [];
const ps = spawn('powershell', ['-NoProfile', '-Command', 'while ($true) { $n = (Get-Process chrome -ErrorAction SilentlyContinue | Measure-Object).Count; $t = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); Write-Output "$t $n"; Start-Sleep -Milliseconds 500 }'], { stdio: ['ignore', 'pipe', 'ignore'] });
ps.stdout.on('data', (d) => { for (const l of String(d).split(/\r?\n/)) { const m = l.match(/^(\d+) (\d+)$/); if (m) load.push({ t: +m[1], n: +m[2] }); } });
const sys = [];
const ps2 = spawn('powershell', ['-NoProfile', '-Command', "while ($true) { try { $c = (Get-Counter '\\Processor(_Total)\\% Processor Time','\\GPU Engine(*engtype_3D)\\Utilization Percentage' -ErrorAction SilentlyContinue).CounterSamples; $cpu = ($c | Where-Object { $_.Path -like '*processor*' } | Select-Object -First 1).CookedValue; $gpu = ($c | Where-Object { $_.Path -like '*gpu engine*' } | Measure-Object -Property CookedValue -Sum).Sum; $t = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); Write-Output ('SYS ' + $t + ' ' + [math]::Round($cpu,1) + ' ' + [math]::Round($gpu,1)) } catch {} }"], { stdio: ['ignore', 'pipe', 'ignore'] });
ps2.stdout.on('data', (d) => { for (const l of String(d).split(/\r?\n/)) { const m = l.match(/^SYS (\d+) ([\d.]+) ([\d.]+)$/); if (m) sys.push({ t: +m[1], cpu: +m[2], gpu3d: +m[3] }); } });
const out = { schema: 'gntcjourney4-trace8/1', at: new Date().toISOString(), base, seed, tag, steps: [] };
const step = (name, detail) => { out.steps.push({ name, at: Date.now(), detail }); log('STEP', name, JSON.stringify(detail ?? '').slice(0, 300)); };
// wait for a quiet machine: no chrome.exe for quietS seconds (max 10 min)
{ const t0 = Date.now(); let quietSince = null; while (arg('noquiet', '0') !== '1' && Date.now() - t0 < 600000) { await sleep(500); const last = load[load.length - 1]; if (!last) continue; if (last.n === 0) { quietSince = quietSince ?? Date.now(); if (Date.now() - quietSince >= quietS * 1000) break; } else quietSince = null; } out.quietWaitMs = Date.now() - t0; out.chromeBeforeLaunch = (load[load.length - 1] || {}).n; log('quiet wait', out.quietWaitMs, 'chrome before launch', out.chromeBeforeLaunch); }
const view = (page) => page.evaluate(() => { const r = window.__echoes.state().run; const c = window.__echoes.campaign.state(); return { active: r.active, room: r.room, phase: r.phase, mode: r.mode, level: c.level }; });
const uiScreen = (page) => page.evaluate(() => (window.__echoes.runUi() || {}).screen ?? 'none');
const settled = (page) => page.evaluate(() => (window.__echoes.runUi() || {}).settled === true);
const socketOpen = (page) => page.evaluate(() => !!(window.__echoes.content && window.__echoes.content.socketUi && window.__echoes.content.socketUi().open));
async function aim(page) {
  const t = await page.evaluate(() => { const E = window.__echoes; const s = E.state(); const p = s.party[0]; let best = null, bd = 1e9; for (const e of s.enemies || []) { if (e.hp !== undefined && e.hp <= 0) continue; const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; best = e; } } if (!best) return null; const q = E.hud.project(best.x, 0.5, best.z); return q && q.onScreen ? { x: q.x, y: q.y, d: bd } : null; });
  if (t) await page.mouse.move(t.x, t.y);
  return t;
}
async function fightRoom(page, v, budget) {
  const t0 = Date.now(); let lastMove = 0;
  while (Date.now() - t0 < budget) {
    const t = await aim(page);
    if (t && t.d < 1.6 && Date.now() - lastMove > 1500) { lastMove = Date.now(); await page.keyboard.down('s'); await sleep(180); await page.keyboard.up('s'); }
    await page.mouse.down({ button: 'right' }); await sleep(300); await page.mouse.up({ button: 'right' });
    for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit4']) { await page.keyboard.press(k); await sleep(40); }
    const w = await view(page); if (w.phase !== 'combat' || w.room !== v.room || w.level !== v.level || !w.active) return { cleared: true, ms: Date.now() - t0 };
  }
  return { cleared: false, ms: Date.now() - t0 };
}
const GLHOOK = () => {
  window.__glh = { links: [], firstUse: [] };
  const off = Date.now() - performance.now();
  const src = new WeakMap(); const progs = new WeakMap(); let id = 0;
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue; const P = C.prototype;
    const ss = P.shaderSource; P.shaderSource = function (sh, s) { src.set(sh, s); return ss.call(this, sh, s); };
    const lp = P.linkProgram; P.linkProgram = function (p) { let r = progs.get(p); if (!r) { r = { id: ++id, used: false, sig: '' }; progs.set(p, r); } try { const sh = this.getAttachedShaders(p) || []; const f = sh.map((h) => src.get(h) || '').join(String.fromCharCode(10)); const m = f.match(/#define SHADER_TYPE (\w+)/); r.sig = (m ? m[1] : 'raw') + ':' + (f.match(/#define (USE_[A-Z_]+|TOON|FLAT_SHADED|DOUBLE_SIDED|NUM_[A-Z_]+ \d+)/g) || []).map((x) => x.slice(8)).join(',').slice(0, 160) + (/uEchoesGuard/.test(f) ? ',GUARD' : ''); } catch { /* */ } const t = performance.now(); const x = lp.call(this, p); window.__glh.links.push([Math.round(t + off), r.id, r.sig]); return x; };
    const up = P.useProgram; P.useProgram = function (p) { const r = p && progs.get(p); if (r && !r.used) { r.used = true; window.__glh.firstUse.push([Math.round(performance.now() + off), r.id, r.sig]); } return up.call(this, p); };
  }
};
const browser = await launchEchoes({ gpu: true });
out.browserPid = browser.process() ? browser.process().pid : null;
let page, errors, consoleLines;
try {
  const ageS = Number(arg('age', 0)); // let the browser age first (the headless browser's own ~120-230 s freeze, PLAN GI.6 note)
  if (ageS > 0) { const ap = await browser.newPage(); await ap.goto('about:blank'); log('aging browser', ageS, 's'); await sleep(ageS * 1000); await ap.close(); }
  out.ageS = ageS;
  const ctx = await browser.createBrowserContext();
  {
    page = await ctx.newPage(); errors = []; consoleLines = [];
    page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e))); page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(GLHOOK);
    await page.goto(`${base}/?fresh=1&seed=${seed}&menu=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout: 180000 });
  }
  await waitFor(page, `window.__echoes.app.state==='title' || (window.__echoes.app.focus()||{}).label==='Press any key or click'`, { timeout: 60000 });
  if (await page.evaluate(() => window.__echoes.app.stack().includes('loading'))) await page.keyboard.press('Enter');
  await waitFor(page, `window.__echoes.app.state==='title'`, { timeout: 20000 });
  await sleep(1500);
  step('title', await page.evaluate(() => ({ state: window.__echoes.app.state, focus: (window.__echoes.app.focus() || {}).id, version: window.__echoes.version })));
  // recorder
  await page.evaluate(() => {
    const E = window.__echoes; const off = Date.now() - performance.now();
    window.__t = { f: [], ev: [], tl: [], smp: [], lt: [], on: true, off };
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__t.lt.push([Math.round(e.startTime + off), Math.round(e.duration), E.tick]); }).observe({ type: 'longtask', buffered: false }); } catch { /* */ }
    setInterval(() => { if (!window.__t.on) return; try { const s = E.state(); const b = s.boss || (s.enemies || []).find((e) => e.boss || e.isBoss || /stag/i.test(String(e.type || e.kind || e.etype || ''))); const g = s.gl || {}; window.__t.smp.push([Math.round(performance.now() + off), E.tick, g.programs, g.textures, g.geometries, g.warmupPending, performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, b ? +((b.hp ?? 0) / (b.maxHp || b.hpMax || 1)).toFixed(3) : null]); } catch { /* */ } }, 100);
    let last = performance.now();
    const loop = (now) => { if (window.__t.on) window.__t.f.push([+(now - last).toFixed(2), Math.round(now + off), E.tick]); last = now; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    E.on('*', (ev) => { if (!window.__t.on || ev.type === 'sound') return; window.__t.ev.push([ev.tick, ev.type]); });
    let prev = '';
    setInterval(() => { if (!window.__t.on) return; try { const r = E.state().run; const row = [E.campaign.state().level, r.active ? r.room : 0, r.phase || '', (E.runUi() || {}).screen ?? 'none', E.app.mode || '', E.app.state || '', E.app.stack().join('/')]; const k = row.join('|'); if (k !== prev) { prev = k; window.__t.tl.push([Math.round(performance.now() + off), E.tick, ...row]); } } catch { /* */ } }, 100);
  });
  await page.keyboard.press('Enter'); // New Game (fresh profile: default focus)
  await waitFor(page, `window.__echoes.app.state==='playing' && window.__echoes.app.mode==='camp'`, { timeout: 20000 });
  step('camp', await page.evaluate(() => ({ mode: window.__echoes.app.mode, tick: window.__echoes.tick })));
  await sleep(3000);
  const portalPos = await page.evaluate(() => window.__echoes.cmd('campState').portal);
  let portal = false;
  for (let i = 0; i < 40 && !portal; i++) {
    const p = await page.evaluate(() => { const q = window.__echoes.state().party[0]; return { x: q.x, z: q.z, in: window.__echoes.cmd('campState').inPortal }; });
    if (p.in) { portal = true; break; }
    const dx = portalPos.x - p.x, dz = portalPos.z + 0.55 - p.z; const keys = [];
    if (Math.abs(dx) > 0.2) keys.push(dx > 0 ? 'd' : 'a'); if (Math.abs(dz) > 0.2) keys.push(dz > 0 ? 's' : 'w'); if (!keys.length) break;
    const ms = Math.max(80, Math.min(450, (Math.hypot(dx, dz) / 2.4) * 1000));
    for (const k of keys) await page.keyboard.down(k); await sleep(ms); for (const k of keys) await page.keyboard.up(k); await sleep(150);
  }
  await page.keyboard.press('e');
  const r1 = await waitFor(page, `(()=>{const r=window.__echoes.state().run;return r.active&&r.room===1&&r.phase==='combat'})()`, { timeout: 15000 });
  step('L1 room 1', { portal, r1, v: await view(page) });
  const rooms = []; const flow = []; let lastKey = ''; let guard = 0; let debugClears = 0; let l2Seen = 0;
  while (guard++ < 600) {
    const v = await view(page);
    if (!v.active) { flow.push('inactive'); break; }
    const key = `${v.level}:${v.room}`;
    if (key !== lastKey && v.room > 0) { rooms.push({ level: v.level, room: v.room, mode: v.mode, at: Date.now() }); lastKey = key; if (v.level === 2) l2Seen += 1; }
    if (v.level === 2 && l2Seen > l2rooms) break;
    if (await socketOpen(page)) { await page.keyboard.press('Escape'); await sleep(350); flow.push('socket-esc'); continue; }
    const scr = await uiScreen(page);
    if (scr === 'transit' || v.phase === 'transit') { await sleep(200); continue; }
    if (scr !== 'none') {
      if (!(await settled(page))) { await sleep(150); continue; }
      if (scr === 'end') { flow.push('END'); break; }
      flow.push(`Enter@${scr}:L${v.level}r${v.room}`); await page.keyboard.press('Enter'); await sleep(800); continue;
    }
    if (v.phase === 'combat') {
      const budget = v.room === 8 ? fightMs * 2.5 : (v.mode === 'kill_all' ? fightMs : 160000);
      const res = await fightRoom(page, v, budget);
      flow.push(`L${v.level}r${v.room}:${res.cleared ? 'real' : 'debug'}@${res.ms}`);
      if (!res.cleared) { debugClears += 1; if (v.room === 8) await page.evaluate(() => { window.__echoes.cmd('killBoss'); }); await page.evaluate(() => window.__echoes.cmd('killAllEnemies')); await sleep(1200); }
      continue;
    }
    await sleep(200);
  }
  await sleep(1000);
  step('trace end', { rooms: rooms.map((r) => `L${r.level}r${r.room}:${r.mode}`), debugClears, flow });
  const raw = await page.evaluate(() => { window.__t.on = false; return { f: window.__t.f, ev: window.__t.ev, tl: window.__t.tl, smp: window.__t.smp, lt: window.__t.lt }; });
  out.frames = raw.f; out.events = raw.ev; out.timeline = raw.tl; out.samples = raw.smp; out.longtasks = raw.lt; out.rooms = rooms; out.flow = flow; out.debugClears = debugClears;
  out.frameStats = await page.evaluate(() => { try { return window.__echoes.app.frameStats(); } catch (e) { return String(e); } });
  out.version = await page.evaluate(() => window.__echoes.version);
  out.gl = await page.evaluate(() => { try { const g = window.__echoes.state().gl; return g; } catch { return null; } });
  out.errors = errors.slice(0, 10);
  out.glh = await page.evaluate(() => window.__glh);
  out.consoleErrors = consoleLines.filter((l) => l.startsWith('[error]')).slice(0, 10);
} catch (e) { console.error('[HARNESS-ERROR]', (e && e.stack) || e); out.harnessError = String((e && e.stack) || e); }
finally { await browser.close(); await sleep(800); try { ps.kill(); } catch { /* */ } try { ps2.kill(); } catch { /* */ } }
out.loadTimeline = load; out.sysTimeline = sys;
writeFileSync(`captures/gntfixINT4-trace-${tag}.json`, JSON.stringify(out));
log('wrote', `captures/gntfixINT4-trace-${tag}.json`, 'frames', (out.frames || []).length, 'errors', (out.errors || []).length);
process.exit(out.harnessError ? 1 : 0);
