#!/usr/bin/env node
// fix-INT-r4 GI.6 residual: the level_clear frame (Stag dies -> the level-clear card) and the room-7 shop page
// opening, each measured in a FRESH GPU-harness browser booted by the player path (title -> New Game), with a
// V8 CPU profile (100 us) over the window so the main-thread longtask is attributed to functions.
//   node tools/gntfixINT4-lvlclear.mjs [--url http://127.0.0.1:4310] [--tag x] [--reps 2] [--prof 1] [--what clear,shop]
// Output: captures/gntfixINT4-lvlclear-<tag>.json { reps: [{ clear: { max, over50, long[], profSelf, profIncl }, shop: {...} }] }
import { writeFileSync } from 'fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:4310'); const tag = arg('tag', 'x');
const reps = Number(arg('reps', 2)); const prof = arg('prof', '1') === '1';
const what = arg('what', 'shop,clear').split(',');
const sleep = (t) => new Promise((r) => setTimeout(r, t));
async function waitFor(page, body, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; } catch { /* nav */ } await sleep(50); } return -1; }

function summarize(profile, calib = null, longFrames = null) {
  const nodes = new Map(profile.nodes.map((n) => [n.id, n])); const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const key = (n) => `${n.callFrame.functionName || '(anon)'}@${(n.callFrame.url || '').split('/').pop()}:${n.callFrame.lineNumber + 1}:${n.callFrame.columnNumber + 1}`;
  const self = {}; const incl = {}; const dt = profile.timeDeltas; let i = 0;
  for (const sid of profile.samples) {
    const d = (dt[i++] || 0) / 1000; const n = nodes.get(sid);
    if (!n) continue;
    if (['(idle)', '(program)', '(garbage collector)'].includes(n.callFrame.functionName)) { const k0 = n.callFrame.functionName; self[k0] = (self[k0] || 0) + d; continue; }
    const k = key(n); self[k] = (self[k] || 0) + d; const seen = new Set();
    for (let x = sid; x !== undefined; x = parent.get(x)) { const kk = key(nodes.get(x)); if (seen.has(kk)) continue; seen.add(kk); incl[kk] = (incl[kk] || 0) + d; }
  }
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, +v.toFixed(1)]);
  // top-down tree (nodes >= 3 ms), so nesting is visible
  const tot = new Map(); { let j = 0; for (const sid of profile.samples) { const d = (dt[j++] || 0) / 1000; tot.set(sid, (tot.get(sid) || 0) + d); } }
  const sum = (n) => { let v = tot.get(n.id) || 0; for (const c of n.children || []) v += sum(nodes.get(c)); n._t = v; return v; };
  const root = profile.nodes[0]; sum(root);
  const tree = []; const walk = (n, dep) => { if (n._t < 3 || dep > 40) return; tree.push(' '.repeat(dep) + (+n._t.toFixed(1)) + ' ' + key(n)); for (const c of (n.children || []).map((x) => nodes.get(x)).sort((a, b) => b._t - a._t)) walk(c, dep + 1); };
  walk(root, 0);
  // per LONG FRAME (calibrated): the profile clock is mapped to performance.now() by a named 5 ms busy loop
  // run right after Profiler.start (gntfixINT4Calib); every sample inside a long rAF frame's [start, end] window
  // is attributed by its path below the main loop's frame() (4 levels), or its top frames outside rAF.
  let frames = null;
  if (calib && longFrames) {
    const stamps = []; { let j = 0; let ts = profile.startTime; for (const sid of profile.samples) { ts += (dt[j] || 0); stamps.push([ts, sid, (dt[j] || 0)]); j++; } }
    const cs = stamps.find(([, sid]) => { for (let x = sid; x !== undefined; x = parent.get(x)) if (nodes.get(x).callFrame.functionName === 'gntfixINT4Calib') return true; return false; });
    if (cs) {
      const off = cs[0] / 1000 - calib; // profile ms - perf ms
      frames = longFrames.map(([fdt, fend]) => { const s0 = fend - fdt + off, s1 = fend + off; const parts = {}; let js = 0;
        for (const [ts, sid, d] of stamps) { const tm = ts / 1000; if (tm < s0 || tm > s1) continue; const n0 = nodes.get(sid); const fn0 = n0.callFrame.functionName; if (fn0 === '(idle)') continue; js += d / 1000;
          const chain = []; for (let x = sid; x !== undefined; x = parent.get(x)) chain.push(nodes.get(x)); const rev = chain.reverse(); const fi = rev.findIndex((n) => n.callFrame.functionName === 'frame');
          const path = fi >= 0 ? rev.slice(fi + 1, fi + 5).map((n) => n.callFrame.functionName || 'anon').join('>') : (fn0 === '(program)' || fn0 === '(garbage collector)') ? fn0 : 'nonframe:' + rev.slice(1, 5).map((n) => n.callFrame.functionName || 'anon').join('>');
          parts[path] = (parts[path] || 0) + d / 1000; }
        return { dt: fdt, js: +js.toFixed(1), parts: Object.entries(parts).sort((x, y) => y[1] - x[1]).filter((x) => x[1] >= 1).slice(0, 14).map(([k, v]) => [k, +v.toFixed(1)]) }; });
    }
  }
  return { self: top(self, 30), incl: top(incl, 60), tree, frames };
}

const out = { schema: 'gntfixINT4-lvlclear/1', at: new Date().toISOString(), base, tag, reps: [] };
for (let rep = 0; rep < reps; rep++) {
  const browser = await launchEchoes({ gpu: true });
  const R = { rep };
  try {
    const { page, errors } = await openEchoes(browser, `${base}/?fresh=1&seed=7&menu=1`);
    await waitFor(page, `window.__echoes.app.state==='title' || (window.__echoes.app.focus()||{}).label==='Press any key or click'`, 90000);
    if (await page.evaluate(() => window.__echoes.app.stack().includes('loading'))) await page.keyboard.press('Enter');
    await waitFor(page, `window.__echoes.app.state==='title'`, 20000); await sleep(1200);
    await page.keyboard.press('Enter');
    await waitFor(page, `window.__echoes.app.state==='playing' && window.__echoes.app.mode==='camp'`, 20000);
    await sleep(2500);
    R.version = await page.evaluate(() => window.__echoes.version);
    await page.evaluate(() => {
      const E = window.__echoes; window.__lc = { f: [], ev: [] };
      let last = performance.now(); const loop = (now) => { window.__lc.f.push([+(now - last).toFixed(1), +now.toFixed(1), E.tick]); last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop);
      try { E.on('*', (ev) => { if (ev && ev.type && ev.type !== 'sound') window.__lc.ev.push([E.tick, ev.type, +performance.now().toFixed(1)]); }); } catch { /* */ }
      try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lc.lt = (window.__lc.lt || []).concat([[+e.startTime.toFixed(1), +e.duration.toFixed(1)]]); }).observe({ type: 'longtask', buffered: false }); } catch { /* */ }
    });
    await page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
    await waitFor(page, `window.__echoes.state().run.phase==='combat'`, 20000); await sleep(2500);
    // program-build recorder (tools/gntfixINT4-newprog.mjs): a Material onBeforeCompile wrapper whose toString is
    // the original's (no cache key change); a build followed by a programs.length increase = a NEW program.
    await page.evaluate(() => { const S = window.__arenaProbe && window.__arenaProbe.stage; if (!S) return; const R = S.renderer; window.__builds = []; let any = null; S.scene.traverse((o) => { if (!any && o.material && !Array.isArray(o.material)) any = o.material; }); let proto = Object.getPrototypeOf(any); while (proto && !Object.prototype.hasOwnProperty.call(proto, 'onBeforeCompile')) proto = Object.getPrototypeOf(proto); const orig = proto.onBeforeCompile; const wrap = function () { try { const owners = []; S.scene.traverse((o) => { const ms2 = Array.isArray(o.material) ? o.material : [o.material]; if (ms2.includes(this)) { const chain = []; for (let x = o; x; x = x.parent) chain.push(x.name || x.type); owners.push(chain.slice(0, 7).join(' < ')); } }); window.__builds.push({ t: +performance.now().toFixed(1), n0: R.info.programs.length, type: this.type, name: this.name, transparent: this.transparent, side: this.side, owners: owners.slice(0, 2) }); } catch (e) { window.__builds.push({ err: String(e) }); } return orig.apply(this, arguments); }; wrap.toString = () => orig.toString(); proto.onBeforeCompile = wrap; });
    const cdp = prof ? await page.createCDPSession() : null;
    if (cdp) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 }); }
    const measure = async (name, trigger, doneExpr, holdMs, profMs = 450, key = null) => {
      if (cdp) await cdp.send('Profiler.start');
      const calibT = cdp ? await page.evaluate('(function gntfixINT4Calib(){ const t = performance.now(); while (performance.now() - t < 5) {} return t; })()') : null;
      const t0 = await page.evaluate(() => performance.now());
      if (key) await page.keyboard.press(key); else await page.evaluate(trigger);
      await waitFor(page, doneExpr, 15000);
      await sleep(profMs);
      let prof0 = null; if (cdp) { const { profile } = await cdp.send('Profiler.stop'); prof0 = profile; }
      const w = await waitFor(page, doneExpr, 15000);
      await sleep(holdMs);
      const raw = await page.evaluate(() => window.__lc);
      const P = prof0 ? summarize(prof0, calibT, raw.f.filter((x) => x[1] >= t0 && x[0] > 40).map((x) => [x[0], x[1]])) : null;
      const newProgs = await page.evaluate((t0x) => { const S = window.__arenaProbe && window.__arenaProbe.stage; if (!S || !window.__builds) return null; const B = window.__builds.slice(); B.push({ n0: S.renderer.info.programs.length }); return B.filter((x, i) => i < B.length - 1 && B[i + 1].n0 > x.n0 && x.t >= t0x).map((x) => ({ at: Math.round(x.t - t0x), type: x.type, name: x.name, transparent: x.transparent, side: x.side, owners: x.owners })); }, t0);
      const F = raw.f.filter((x) => x[1] >= t0);
      const M = { waited: w, frames: F.length, max: Math.max(...F.map((x) => x[0])), over50: F.filter((x) => x[0] > 50).length, over100: F.filter((x) => x[0] > 100).length,
        long: F.filter((x) => x[0] > 40).map((x) => ({ dt: x[0], at: Math.round(x[1] - t0), tick: x[2], ev: raw.ev.filter((e) => e[2] >= x[1] - x[0] - 5 && e[2] <= x[1]).map((e) => e[1]).slice(0, 14) })),
        longtasks: (raw.lt || []).filter((x) => x[0] >= t0).map((x) => [Math.round(x[0] - t0), x[1]]) };
      M.newProgs = newProgs; if (P) { M.profSelf = P.self; M.profIncl = P.incl; M.tree = P.tree; M.jsFrames = P.frames; }
      return M;
    };
    if (what.includes('shop')) {
      R.shop = await measure('shop', () => window.__echoes.cmd('skipToRoom', 7), `(window.__echoes.runUi()||{}).screen==='shop'`, 1500);
      await page.keyboard.press('Escape'); await sleep(300); await page.keyboard.press('Escape'); await sleep(500);
    }
    if (what.includes('shopflow')) {
      // the real way into the shop: room 6 cleared -> reward page(s) -> path doors -> Enter -> fade -> room 7
      await page.evaluate(() => window.__echoes.cmd('skipToRoom', 6));
      await waitFor(page, "window.__echoes.state().run.phase==='combat' && window.__echoes.state().run.room===6", 20000); await sleep(1500);
      await page.evaluate(() => window.__echoes.cmd('killAllEnemies'));
      for (let k = 0; k < 20; k++) { await sleep(700); const u = await page.evaluate(() => ({ scr: (window.__echoes.runUi() || {}).screen || 'none', ok: (window.__echoes.runUi() || {}).settled })); if (u.scr === 'path' && u.ok) break; if (u.scr !== 'none' && u.ok) await page.keyboard.press('Enter'); }
      await sleep(600);
      R.shopflow = await measure('shopflow', null, "(window.__lc.ev||[]).some((e)=>e[1]==='shop_open')", 2000, 600, 'Enter');
      await page.keyboard.press('Escape'); await sleep(400);
    }
    if (what.includes('clear')) {
      await page.evaluate(() => window.__echoes.cmd('skipToRoom', 8));
      await waitFor(page, `window.__echoes.state().run.phase==='combat' && window.__echoes.state().run.room===8`, 20000);
      { const until = Date.now() + Number(arg('bossms', 3500)); while (Date.now() < until) { await page.evaluate(() => { const E = window.__echoes; for (const q of E.state().party) { try { E.cmd('setHp', q.id, 1); } catch { /* */ } } }); await sleep(1000); } }
      R.bossSeen = await page.evaluate(() => (window.__echoes.state().enemies || []).map((e) => e.kind || e.type).slice(0, 6));
      R.resBefore = await page.evaluate(() => { const r = window.__echoes.campaign.residency(); const st = window.__echoes.state(); return r && { dressings: r.dressings, prefetched: r.prefetched, queued: r.queued, building: r.building, resident: r.resident, phase: st.run.phase, room: st.run.room, hp: st.party.map((q) => Math.round(q.hp)) }; });
      R.clear = await measure('clear', () => window.__echoes.cmd('killBoss'), `(window.__lc.ev||[]).some((e)=>e[1]==='level_transit')`, 2500, 250);
    }
    R.resAfter = await page.evaluate(() => { const r = window.__echoes.campaign.residency(); return r && { dressings: r.dressings, perf: r.perf, timeline: r.timeline, lastMs: r.lastMs }; }).catch(() => null);
    R.clearPump = await page.evaluate(() => { const ev = (window.__lc.ev || []).find((e) => e[1] === 'level_transit'); const r = window.__echoes.campaign.residency(); const P = r && r.perf && r.perf.pump; if (!ev || !P) return null; const at = ev[2]; const first = (P.log || []).find((x) => x[0] >= at - 1); return { transitAt: Math.round(at), clearFramePump: first || null, after: (P.log || []).filter((x) => x[0] >= at - 1).slice(0, 12).map((x) => [x[0] - Math.round(at), x[1], x[2], x[3]]), slices: (r.perf.slices || []).filter((x) => x[0] >= at - 1).map((x) => [x[0] - Math.round(at), x[1], x[2], x[3]]), usual: P.usualSpentMs, skipped: P.heavySkipped }; }).catch((e) => String(e));
    R.transitions = await page.evaluate(() => window.__echoes.campaign.transitions().slice(-1)).catch(() => null);
    R.errors = errors.slice(0, 5);
  } catch (e) { R.harnessError = String((e && e.stack) || e); console.error(e); }
  finally { await browser.close(); }
  out.reps.push(R);
  const brief = (m) => m && { max: m.max, over50: m.over50, over100: m.over100, long: m.long.map((l) => `${l.dt}@${l.at}[${l.ev.join(',')}]`), lt: m.longtasks, progs: m.newProgs };
  console.log(JSON.stringify({ clearPump: R.clearPump }));
  console.log(JSON.stringify({ rep, v: R.version, shopflow: brief(R.shopflow), shop: brief(R.shop), clear: brief(R.clear), err: R.errors, h: R.harnessError }));
}
writeFileSync(`captures/gntfixINT4-lvlclear-${tag}.json`, JSON.stringify(out, null, 1));
