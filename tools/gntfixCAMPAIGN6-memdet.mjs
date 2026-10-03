// gntfixCAMPAIGN6 — COPY of tools/gntccampaign6-memdet.mjs (campaign critic r6) with outputs renamed + an optional three.js object census (--census 1): DETERMINISTIC full-play memory probe. Every campaign starts from save.resetToFresh({seed:7})
// with the sim frozen and cmd startCampaign({level:1}) (harness start, so every campaign plays IDENTICAL ticks: every room by the autopilot,
// stepped in 15-tick chunks with a rendered frame between chunks, keep-alive assist); samples at the first controllable frame of L1/L2/L3 and in camp.
// the autopilot, sim stepped in 30-tick chunks with a rendered frame between chunks; party keep-alive assist
// so every campaign reaches Level 3), sampled at the first controllable frame of L1/L2/L3 and in camp after
// each campaign, then a Quit to Lobby mid-level. Portal E (real key) starts every campaign.
// usage: node tools/gntccampaign6-memory.mjs [--base URL] [--tag dev] [--campaigns 4] [--quick 0]
import { launch, open, heap, sleep, writeJson, threeCensus, censusDiff } from './gntfixCAMPAIGN6-lib.mjs';
import fs from 'fs';
const A = {};
for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const base = A.base || 'http://127.0.0.1:4332/';
const tag = A.tag || 'dev';
const N = +(A.campaigns || 4);
const quick = A.quick === '1';
const NAME = `gntfixCAMPAIGN6-memdet-${tag}`;
const R = { base, tag, N, quick, samples: [], log: [], pageErrors: [] };
const save = () => writeJson(NAME, R);
const log = (m, d) => { R.log.push({ at: new Date().toISOString(), m, d }); console.log('-', m, d ? JSON.stringify(d).slice(0, 400) : ''); save(); };

const browser = await launch({ autoplay: true });
const { page, errors, cdp } = await open(browser, base + '?menu=0&seed=7&fresh=1');
R.pageErrors = errors;
const raf = (n = 3) => page.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

async function sample(label) {
  await page.evaluate(() => window.__echoes.sim.freeze());
  await raf(3);
  const hp = await heap(cdp);
  const s = await page.evaluate(() => {
    const E = window.__echoes; const m = E.campaign.memory(); const cs = E.campaign.state();
    const au = window.__gc4audio || {};
    return {
      tick: E.tick, level: cs.level, index: cs.index, phase: cs.phase, room: E.state().run.room, layout: E.state().run.layout && E.state().run.layout.layoutId,
      gl: m.gl, glHook: { ...window.__gc4gl.live }, heapSelf: m.heapMB, entities: m.entities, entityCount: E.entityCount, busListeners: m.busListeners, pools: m.pools, dom: document.getElementsByTagName('*').length, domSelf: m.dom, domToasts: m.domToasts,
      voices: E.audio.voices().active,
      dbg: (() => { const o = {}; const sz = (v) => { try { return JSON.stringify(v).length; } catch (e) { return -1; } };
        const tryL = (k, f) => { try { const v = f(); o[k] = Array.isArray(v) ? v.length + ':' + sz(v) : sz(v); } catch (e) { o[k] = 'x'; } };
        tryL('transitions', () => E.campaign.transitions()); tryL('snapshots', () => E.campaign.snapshots()); tryL('events', () => E.events);
        tryL('captureLog', () => E.save.captureLog()); tryL('autosaveLog', () => E.save.autosaveLog()); tryL('displayLog', () => E.app.displayLog());
        tryL('responses', () => E.app.responses()); tryL('cueLog', () => E.audio.cueLog(100000)); tryL('audioHistory', () => E.audio.history()); tryL('netLog', () => E.net.log(100000));
        tryL('profile', () => E.save.profile()); tryL('saveList', () => E.save.list()); tryL('toasts', () => E.app.toasts());
        let ls = 0; try { for (const k of Object.keys(localStorage)) ls += (localStorage.getItem(k) || '').length; } catch (e) {} o.localStorage = ls;
        return o; })(), audioNodesCreated: au.created, audioNodesFinalized: au.finalized, dressings: m.dressings, resident: m.resident, disposals: m.disposals,
    };
  });
  s.heapMB = hp; s.label = label;
  if (R.armed) { s.glAlive = await page.evaluate(() => window.__echoes.campaign.glAlive()); s.glOff = await page.evaluate(() => window.__echoes.campaign.glOffScene()); }
  s.audioNodesLive = s.audioNodesCreated - s.audioNodesFinalized;
  R.samples.push(s);
  save();
  await page.evaluate(() => window.__echoes.sim.thaw());
  return s;
}
async function writeSnapshot(file) {
  const out = fs.createWriteStream(file);
  const onChunk = (e) => out.write(e.chunk);
  cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false, captureNumericValue: false });
  cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await new Promise((r) => out.end(r));
}
async function walkToPortal() {
  await page.mouse.move(800, 450);
  // make sure we come from the south
  await page.keyboard.down('KeyW');
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 25000) { if (await page.evaluate(() => window.__echoes.cmd('campState').inPortal)) { ok = true; break; } await sleep(40); }
  await page.keyboard.up('KeyW');
  await sleep(250);
  return ok;
}
// step the sim in chunks with frames between, until pred(state) true; keep-alive assist
async function stepUntil(pred, maxTicks = 60000) {
  let stepped = 0;
  while (stepped < maxTicks) {
    const r = await page.evaluate((predSrc) => {
      const E = window.__echoes; const pred = eval(predSrc);
      for (const p of E.state().party) if (!p.downed && p.hp < p.maxHp * 0.6) E.cmd('setHp', p.id, 1);
      if (pred(E)) return { done: true };
      E.sim.stepN(15, null);
      return { done: pred(E), tick: E.tick };
    }, pred.toString());
    stepped += 15;
    if (r.done) return stepped;
    await raf(1);
  }
  return -stepped;
}

try {
  await page.waitForFunction(() => window.__echoes.tick > 240, { timeout: 90000 });
  await page.keyboard.press('ShiftLeft');
  await sleep(1500);
  R.samples.push({ label: 'boot-camp', ...(await (async () => { const s = await sample('boot-camp'); R.samples.pop(); return s; })()) });
  for (let c = 1; c <= N; c++) {
    const inP = 'det';
    await page.evaluate(() => { const E = window.__echoes; E.save.resetToFresh({ seed: 7 }); E.sim.freeze(); });
    await page.waitForFunction(() => window.__echoes.campaign.ready(1).ready, { timeout: 90000 });
    await raf(30);
    await page.evaluate(() => { const E = window.__echoes; E.cmd('startCampaign', { level: 1, depart: false }); E.sim.thaw(); });
    await page.waitForFunction(() => { const E = window.__echoes; const cs = E.campaign.state(); return cs.level === 1 && cs.phase === 'combat' && E.app.state === 'playing' && !E.app.simPaused(); }, { timeout: 30000, polling: 16 });
    await sample(`c${c}-L1`);
    log(`campaign ${c}: portal E (inPortal ${inP}) -> L1 sampled`);
    await page.evaluate(() => window.__echoes.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest' }));
    await page.evaluate(() => window.__echoes.sim.freeze());
    for (let L = 1; L <= 3; L++) {
      if (quick) await page.evaluate(() => window.__echoes.cmd('skipToRoom', 8));
      if (L < 3) {
        const n = await stepUntil(((L) => (E) => { const cs = E.campaign.state(); return cs.level === L + 1 && cs.phase === 'combat'; }).toString().replace(/\bL\b(?=[^a-zA-Z])/g, '') && `(E) => { const cs = E.campaign.state(); return (cs.level === ${L + 1} && cs.phase === 'combat') || !E.state().run.active; }`);
        const st = await page.evaluate(() => { const E = window.__echoes; return { level: E.campaign.state().level, phase: E.state().run.phase, active: E.state().run.active }; });
        if (!st.active) { log(`campaign ${c}: run ended in L${L}`, st); await page.evaluate(() => window.__echoes.sim.thaw()); await sleep(1500); if (st.phase === 'defeat') { await page.keyboard.press('Enter'); await page.waitForFunction(() => window.__echoes.state().run.phase === 'idle', { timeout: 20000 }).catch(() => {}); } await sleep(1500); break; }
        await sample(`c${c}-L${L + 1}`);
        log(`campaign ${c}: L${L}->L${L + 1} after ${n} stepped ticks, sampled`, { st });
        await page.evaluate(() => window.__echoes.sim.freeze());
      } else {
        let n = await stepUntil(`(E) => (!E.state().run.active && E.state().run.phase !== 'victory' && E.state().run.phase !== 'defeat') || E.state().run.phase === 'defeat'`);
        if ((await page.evaluate(() => window.__echoes.state().run.phase)) === 'defeat') { log(`campaign ${c}: DEFEAT in L3 despite the assist — Enter to camp`); await page.evaluate(() => window.__echoes.sim.thaw()); await sleep(1500); await page.keyboard.press('Enter'); await page.waitForFunction(() => window.__echoes.state().run.phase === 'idle', { timeout: 20000 }); }
        const st = await page.evaluate(() => { const E = window.__echoes; return { mode: E.app.mode, phase: E.state().run.phase, active: E.state().run.active, rec: E.save.profile().records.campaignsCompleted }; });
        await page.evaluate(() => window.__echoes.sim.thaw());
        await sleep(1500);
        const rw = await page.waitForFunction(() => { const r = window.__echoes.campaign.state().ready; return r && r.ready && (!r.pending || !r.pending.length); }, { timeout: 30000, polling: 100 }).then(() => 'ready').catch(() => 'timeout');
        await sleep(1000);
        await sample(`c${c}-camp`);
        if (A.census === '1') { await page.evaluate(() => window.__echoes.sim.freeze()); const cen = await threeCensus(cdp); const last = R.samples[R.samples.length - 1]; last.census = cen; const prev = R.lastCensus; if (prev) last.censusDiff = { mat: censusDiff(prev.mat, cen.mat), geo: censusDiff(prev.geo, cen.geo), tex: censusDiff(prev.tex, cen.tex) }; R.lastCensus = cen; save(); console.log('census', JSON.stringify({ mat: cen.mat && cen.mat.total, geo: cen.geo && cen.geo.total, tex: cen.tex && cen.tex.total, diff: last.censusDiff }).slice(0, 1500)); await page.evaluate(() => window.__echoes.sim.thaw()); }
        // gntfixCAMPAIGN6: --track N arms the manager's GL geometry tracker in camp after campaign N (default 1 = after the
        // PLAN's warm-up campaign); every later sample stores glAlive (live GL-registered geometries created since arming,
        // keyed in-scene 'S' / off-scene 'o') so a growth between two equal moments names its geometry.
        if (A.track && c === +A.track) { R.armed = await page.evaluate(() => window.__echoes.campaign.glTrack()); log('gl tracker armed', R.armed); }
        if ((A.snap || '').split(',').includes(String(c))) { await page.evaluate(() => window.__echoes.sim.freeze()); await writeSnapshot(`captures/gntfixCAMPAIGN6-heap-${tag}-c${c}.heapsnapshot`); await page.evaluate(() => window.__echoes.sim.thaw()); log(`heap snapshot after campaign ${c}`); }
        log(`campaign ${c}: L3 -> camp after ${n} stepped ticks, sampled`, st);
      }
    }
    await page.evaluate(() => { window.__echoes.cmd('autopilot', false); window.__echoes.sim.thaw(); });
    await sleep(800);
  }
  // Quit to Lobby mid-level (L1 room 2-3) by keys
  await walkToPortal();
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__echoes.campaign.state().phase === 'combat', { timeout: 30000 });
  await page.evaluate(() => window.__echoes.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest' }));
  await page.evaluate(() => window.__echoes.sim.freeze());
  await stepUntil(`(E) => E.state().run.room >= 3 && E.state().run.phase === 'combat'`);
  await page.evaluate(() => { window.__echoes.cmd('autopilot', false); window.__echoes.sim.thaw(); });
  await sleep(1500);
  await page.keyboard.press('Escape'); await sleep(400);
  for (let i = 0; i < 10; i++) { const f = await page.evaluate(() => window.__echoes.app.focus()); if (f && f.id === 'pz-lobby') break; await page.keyboard.press('ArrowDown'); await sleep(130); }
  await page.keyboard.press('Enter'); await sleep(400);
  for (let i = 0; i < 3; i++) { const f = await page.evaluate(() => window.__echoes.app.focus()); if (f && f.id === 'ap-confirm-ok') break; await page.keyboard.press('ArrowLeft'); await sleep(120); }
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => { const E = window.__echoes; return !E.state().run.active && E.app.stack().length === 0; }, { timeout: 15000 });
  await sleep(1500);
  await page.waitForFunction(() => { const r = window.__echoes.campaign.state().ready; return r && r.ready && (!r.pending || !r.pending.length); }, { timeout: 30000, polling: 100 }).catch(() => {});
  await sleep(1000);
  await sample('quit-camp');
  log('quit to lobby mid-level (L1 room 3) -> camp sampled');
  R.done = true;
} catch (e) {
  R.fatal = String(e && e.stack || e).slice(0, 1200); console.error(R.fatal);
} finally {
  R.pageErrors = errors; save();
  await browser.close();
}
// table
const cols = ['label', 'level', 'room', 'layout', 'gl.geometries', 'gl.textures', 'gl.programs', 'glHook.buffer', 'glHook.texture', 'glHook.program', 'heapMB', 'entities', 'busListeners', 'pools.decals', 'pools.scorches', 'pools.particles', 'pools.numeralCapacity', 'dom', 'voices', 'audioNodesLive', 'dressings'];
const get = (o, k) => k.split('.').reduce((a, b) => (a == null ? a : a[b]), o);
console.log(cols.join('\t'));
for (const s of R.samples) console.log(cols.map((k) => JSON.stringify(get(s, k))).join('\t'));
