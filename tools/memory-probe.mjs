#!/usr/bin/env node
// MEMORY USE in the real game (docs/MEMORY.md). Against a running build
// (`npm run serve`, port 7800, or `npm run dev`, 5199) it walks one scripted
// session and records, per stage, what the page holds:
//   gpuMB        GPU bytes counted at the WebGL calls (tools/memory-track.js):
//                textures, buffers, renderbuffers and every live context's
//                drawing buffer, across all contexts in the page
//   heapMB       the JS heap after a forced collection (CDP)
//   audioMB      AudioBuffers still reachable, plus the bake cache's samples
//   rendererMB / gpuProcMB   PSS of the page's renderer and GPU processes
//   three        stage renderer.info: programs, geometries, textures
// Stages: boot, camp, combat (room 1), after each room transition (twelve or
// more, across a level change), the run end back in camp, the Journal's
// Bestiary open, the Journal closed, and the title after Quit to Title.
// It fails on a page error, when the GPU ledger or the stage renderer's
// geometry / texture counts keep growing across the repeated room transitions
// (the last transitions against the first ones, same level), when the
// Bestiary's context outlives the Journal, or above a --budget (MB of GPU).
//
//   node tools/memory-probe.mjs [--url http://127.0.0.1:7800/] [--rooms 14]
//        [--out captures/memory.json] [--budget 400] [--w 1600 --h 900 --dpr 1] [--shots dir]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=.../chrome and
// ECHOES_CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader".
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:7800/');
const ROOMS = Number(opt('rooms', '14'));
const OUT = opt('out', 'captures/memory.json');
const BUDGET = opt('budget', null) != null ? Number(opt('budget')) : null;
const W = Number(opt('w', '1600'));
const H = Number(opt('h', '900'));
const DPR = Number(opt('dpr', '1'));
const SHOTS = opt('shots', null); // a frame per stage (the floors still draw once their canvases are gone)
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
mkdirSync(dirname(OUT), { recursive: true });

const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 900000,
  defaultViewport: { width: W, height: H, deviceScaleFactor: DPR },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`, ...extra],
});
const page = await browser.newPage();
const cdp = await page.createCDPSession();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.stack ? e.stack.slice(0, 400) : e)));
await page.evaluateOnNewDocument(readFileSync(new URL('./memory-track.js', import.meta.url), 'utf8'));
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MB = (b) => Math.round((b / 1048576) * 10) / 10;

// PSS of the browser's child processes, by --type (Linux /proc only).
function procMem() {
  const root = browser.process() && browser.process().pid;
  if (!root) return null;
  const kids = new Map();
  for (const d of readdirSync('/proc')) {
    if (!/^\d+$/.test(d)) continue;
    try {
      const st = readFileSync(`/proc/${d}/stat`, 'utf8');
      const ppid = Number(st.slice(st.lastIndexOf(')') + 2).split(' ')[1]);
      kids.set(Number(d), ppid);
    } catch {
      /* gone */
    }
  }
  const tree = new Set([root]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const [pid, pp] of kids) if (!tree.has(pid) && tree.has(pp)) {
      tree.add(pid);
      grew = true;
    }
  }
  const by = {};
  for (const pid of tree) {
    try {
      const cmd = readFileSync(`/proc/${pid}/cmdline`, 'utf8');
      const type = (/--type=([a-z-]+)/.exec(cmd) || [, 'browser'])[1];
      const pss = Number((/Pss:\s+(\d+)/.exec(readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8')) || [, 0])[1]) * 1024;
      by[type] = (by[type] || 0) + pss;
    } catch {
      /* gone */
    }
  }
  return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, MB(v)]));
}

const rows = [];
async function sample(stage) {
  // Let the background dressing builder finish what it has queued, so a
  // stage reads the same residency every time (it builds the level's
  // layouts over the first seconds of a camp or level).
  await page.waitForFunction(() => {
    const r = window.__echoes.cmd('levelResidencyState');
    return !r || (r.queued.length === 0 && r.building == null);
  }, { timeout: 120000, polling: 500 }).catch(() => null);
  await sleep(1500);
  await cdp.send('HeapProfiler.collectGarbage');
  await sleep(400);
  await cdp.send('HeapProfiler.collectGarbage');
  await sleep(300);
  const heap = await cdp.send('Runtime.getHeapUsage');
  // Dedicated workers (the floor paint worker, the audio bake renderer).
  let workerMB = 0;
  for (const w of page.workers()) {
    try {
      await w.client.send('HeapProfiler.collectGarbage').catch(() => null);
      const u = await w.client.send('Runtime.getHeapUsage');
      workerMB += u.usedSize;
    } catch {
      /* gone */
    }
  }
  const page1 = await page.evaluate(() => {
    const E = window.__echoes;
    const st = E.state();
    const a = E.audio;
    let bake = null;
    try {
      const d = a && typeof a.bake === 'function' ? a.bake() : null;
      bake = d ? { mb: d.mb, keys: d.keys } : null;
    } catch {
      bake = null;
    }
    const res = E.cmd('levelResidencyState');
    const rv = E.cmd('runState') || {};
    return { res: res ? { dressings: res.dressings, paint: res.paint } : null, track: window.__memTrack(), gl: st.gl, scene: st.scene, entities: E.entityCount, phase: rv.phase, room: rv.room, boss: !!rv.boss, level: rv.level ?? rv.act, bake, listeners: E.busCounters.listeners, dom: document.getElementsByTagName('*').length };
  });
  const proc = procMem();
  const r = {
    stage,
    level: page1.level,
    boss: page1.boss,
    phase: page1.phase,
    room: page1.room,
    gpuMB: page1.track.gpuMB,
    heapMB: MB(heap.usedSize),
    heapTotalMB: MB(heap.totalSize),
    workers: page.workers().length,
    workerHeapMB: MB(workerMB),
    backingMB: MB(heap.backingStorageSize || 0),
    audioMB: page1.track.audioMB,
    audioBuffers: page1.track.audioBuffers,
    bakeMB: page1.bake ? page1.bake.mb : null,
    dressings: page1.res ? page1.res.dressings.length : null,
    paint: page1.res ? page1.res.paint : null,
    rendererMB: proc ? proc.renderer : null,
    gpuProcMB: proc ? proc['gpu-process'] : null,
    procs: proc,
    contexts: page1.track.contextsAlive,
    programs: page1.gl.programs,
    geometries: page1.gl.geometries,
    textures: page1.gl.textures,
    entities: page1.entities,
    listeners: page1.listeners,
    dom: page1.dom,
    ctx: page1.track.contexts,
    topTextures: page1.track.topTextures,
  };
  rows.push(r);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/memory-${stage.replace(/[^a-z0-9]+/gi, '-')}.png` });
  console.log(`${stage.padEnd(14)} dress ${r.dressings} gpu ${String(r.gpuMB).padStart(6)}  heap ${String(r.heapMB).padStart(6)}  wk ${r.workers}/${r.workerHeapMB}  audio ${String(r.audioMB).padStart(5)}/${r.bakeMB}  rend ${r.rendererMB}  gpuP ${r.gpuProcMB}  ctx ${r.contexts}  prog ${r.programs} geo ${r.geometries} tex ${r.textures}  ent ${r.entities} dom ${r.dom}  [${r.phase} ${r.room}]`);
  return r;
}

const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
async function key(code) {
  await page.keyboard.down(code);
  await sleep(160);
  await page.keyboard.up(code);
}
async function closeSocket() {
  const open = await page.evaluate(() => {
    const el = document.getElementById('socket-screen');
    return !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && Number(getComputedStyle(el).opacity) > 0;
  });
  if (open) await page.keyboard.press('Escape');
}
// Keep the party standing: the probe measures rooms, not the fight, and a
// wipe would end the run before the second level.
const topUp = () => page.evaluate(() => {
  const E = window.__echoes;
  for (const m of E.state().party || []) if (!m.downed && m.hp < m.maxHp) E.cmd('heal', m.id, m.maxHp);
}).catch(() => null);
// Drive the run until the next room's combat starts (one transition).
async function nextRoom() {
  const start = await runView();
  const from = `${start.level ?? start.act}:${start.room}`;
  for (let i = 0; i < 80; i++) {
    const v = await runView();
    const at = `${v.level ?? v.act}:${v.room}`;
    if (v.phase === 'combat' && at !== from) return v;
    if (v.phase === 'combat') {
      await topUp();
      if (v.boss || (v.room && v.room.boss)) await cmd('killBoss');
      await cmd('clearRoom');
    } else if (v.phase === 'reward') {
      await cmd('draftDecline');
      await sleep(600);
      await closeSocket();
    } else if (v.phase === 'relic') await cmd('relicChoose', 0);
    else if (v.phase === 'path') {
      const o = (v.path && v.path.options) || [];
      const i0 = Math.max(0, o.findIndex((x) => !x.event));
      await cmd('pathChoose', i0);
    } else if (v.phase === 'shop') await cmd('shopAdvance');
    else if (v.phase === 'encounter') await cmd('eventChoose', 'leave');
    else if (v.phase === 'event') await cmd('clearRoom');
    else if (v.phase === 'transit') await cmd('campaignAdvance');
    await sleep(700);
  }
  return runView();
}

await page.goto(`${URL0}?seed=3&story=0&tutorial=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await sleep(8000);
await sample('boot');
await page.evaluate(() => window.__echoes.app.press && window.__echoes.app.press('confirm')).catch(() => null);
await sleep(4000);
await sample('camp');

await cmd('startCampaign', { level: 1, depart: false });
await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 240000, polling: 250 });
await cmd('startWave');
await sleep(8000);
await sample('combat');

const trans = [];
for (let n = 1; n <= ROOMS; n++) {
  const v = await nextRoom();
  await cmd('startWave').catch(() => null);
  await sleep(3500);
  await topUp();
  trans.push(await sample(`room+${n}`));
  if (v.phase !== 'combat') break;
}

await cmd('endRun', 'defeat');
await sleep(2000);
await cmd('returnToCamp');
await page.waitForFunction(() => window.__echoes.cmd('campState').mode === 'camp', { timeout: 120000, polling: 250 }).catch(() => null);
await sleep(5000);
await sample('run end');

// The Journal's Bestiary: a second WebGL view while open.
let opened = false;
for (let i = 0; i < 6 && !opened; i++) {
  await key('KeyJ');
  opened = await page.waitForFunction(() => !!document.querySelector('.st-story'), { timeout: 8000, polling: 200 }).then(() => true).catch(() => false);
  if (!opened) {
    await page.keyboard.press('Escape');
    await sleep(2500);
  }
}
check(opened, 'J opens the Journal');
for (let i = 0; i < 6; i++) {
  const d = await page.evaluate(() => {
    const s = document.querySelector('.st-story');
    return s && s.__journal ? s.__journal().tab : null;
  });
  if (d === 'bestiary') break;
  await key('KeyE');
  await sleep(500);
}
await sleep(5000);
const best = await sample('bestiary');
await page.keyboard.press('Escape');
await sleep(3000);
const closed = await sample('journal shut');
// Twice more, so a context or rig copy kept per opening shows as growth.
for (let k = 0; k < 2; k++) {
  await key('KeyJ');
  await sleep(2500);
  await key('KeyE');
  await sleep(3500);
  await page.keyboard.press('Escape');
  await sleep(2500);
}
const closed3 = await sample('journal x3');

await page.evaluate(() => window.__echoes.app.quitToTitle && window.__echoes.app.quitToTitle({ confirm: false })).catch(() => null);
await sleep(6000);
await sample('title');

// A lost and restored WebGL context (driver reset, GPU memory pressure):
// the floors, whose paint canvases are gone after upload, are rebuilt, and
// the room still draws them.
await cmd('startCampaign', { level: 1, depart: false });
await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 240000, polling: 250 }).catch(() => null);
await sleep(4000);
const lost = await page.evaluate(async () => {
  const gl = document.querySelector('canvas').getContext('webgl2');
  const ext = gl && gl.getExtension('WEBGL_lose_context');
  if (!ext) return false;
  const before = window.__echoes.cmd('levelResidencyState');
  ext.loseContext();
  await new Promise((r) => setTimeout(r, 1500));
  ext.restoreContext();
  await new Promise((r) => setTimeout(r, 6000));
  const after = window.__echoes.cmd('levelResidencyState');
  return { before: before.disposals, after: after.disposals, why: after.lastWhy, active: after.active };
});
const restored = await sample('ctx restored');
if (lost) {
  check(lost.why === 'restored' && lost.after > lost.before && lost.active && !lost.active.disposed, `a restored context rebuilds the floors (${JSON.stringify(lost)})`);
  check(restored.ctx[0] && !restored.ctx[0].lost && restored.ctx[0].texMB > 50, `the restored context holds the room's textures again (${restored.ctx[0] && restored.ctx[0].texMB} MB)`);
} else console.log('skip WEBGL_lose_context not offered');

// --- Verdicts
// Within one level the same dressings stay resident, so nothing may climb
// room after room (a new level swaps its dressings, so each level is judged
// on its own rooms; the first room of a level still builds its neighbours).
const byLevel = new Map();
for (const r of trans) {
  if (r.phase !== 'combat' || r.boss) continue; // the boss room adds its rig
  if (!byLevel.has(r.level)) byLevel.set(r.level, []);
  byLevel.get(r.level).push(r);
}
let judged = 0;
for (const [level, list] of byLevel) {
  const xs = list.slice(1);
  if (xs.length < 3) continue;
  judged += 1;
  const first = xs[0];
  const last = xs[xs.length - 1];
  const per = (k) => (last[k] - first[k]) / (xs.length - 1);
  check(per('gpuMB') < 1, `level ${level}: GPU bytes flat across ${xs.length - 1} room transitions (${first.gpuMB} -> ${last.gpuMB} MB)`);
  check(per('heapMB') < 1, `level ${level}: JS heap flat across the transitions (${first.heapMB} -> ${last.heapMB} MB)`);
  check(per('geometries') < 40, `level ${level}: geometries flat across the transitions (${first.geometries} -> ${last.geometries})`);
  check(per('textures') < 2, `level ${level}: textures flat across the transitions (${first.textures} -> ${last.textures})`);
}
check(judged >= Math.min(2, Math.floor(ROOMS / 7)), `room transitions judged on ${judged} levels`);
// Back in camp after a run: what the run built is gone again.
const camp = rows.find((r) => r.stage === 'camp');
const back = rows.find((r) => r.stage === 'run end');
check(back.gpuMB - camp.gpuMB < 8, `GPU bytes back in camp after the run (${camp.gpuMB} -> ${back.gpuMB} MB)`);
check(back.heapMB - camp.heapMB < 12, `JS heap back in camp after the run (${camp.heapMB} -> ${back.heapMB} MB)`);
check(closed.contexts < best.contexts, `the Bestiary's WebGL context goes with the Journal (${best.contexts} open, ${closed.contexts} shut)`);
check(closed3.gpuMB - closed.gpuMB < 4 && closed3.contexts === closed.contexts, `opening the Journal again keeps no copies (${closed.gpuMB} -> ${closed3.gpuMB} MB, ${closed.contexts} -> ${closed3.contexts} contexts)`);
if (BUDGET != null) check(Math.max(...rows.map((r) => r.gpuMB)) <= BUDGET, `GPU ledger peak within ${BUDGET} MB (${Math.max(...rows.map((r) => r.gpuMB))})`);
check(errors.length === 0, `no page errors (${errors.length}${errors.length ? `: ${errors[0]}` : ''})`);

writeFileSync(OUT, JSON.stringify({ url: URL0, viewport: `${W}x${H}@${DPR}`, version: await page.evaluate(() => window.__echoes.version), rows, errors }, null, 1));
console.log(`wrote ${OUT}`);
console.log(`${fails.length ? 'FAIL' : 'PASS'} ${rows.length} stages, ${fails.length} failed checks`);
await browser.close();
process.exit(fails.length ? 1 : 0);
