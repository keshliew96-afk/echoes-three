#!/usr/bin/env node
// CAMPAIGN probe (docs/gauntlet/PLAN.md §12, gates GC.1-GC.11) on the GPU
// harness (tools/gnt-arch-browser.mjs). Legs:
//   memory  3 back-to-back campaigns L1 -> L2 -> L3 (+ camp after each, + a
//           Quit to Lobby from Level 2): renderer.info geometries / textures /
//           programs, JS heap after a forced GC (CDP), entities, bus
//           listeners, VFX pools, DOM nodes, live audio voices, resident
//           dressings — sampled at the first controllable frame of each level.
//   frames  every composited frame across a level transition (CDP screencast,
//           mean display luma): near-black frames, the longest frame gap, the
//           killing blow -> first controllable frame; auto, Enter-skip and a
//           4x CPU throttle.
//   edge    exactly-once triggers: Stag + last add on one tick, a wipe on the
//           clear tick, Esc / Enter / save / Quit to Lobby / a hidden tab
//           during the card.
//   locks   fresh profile: Level 1 open, 2-3 locked on every path (keyboard,
//           mouse, mocked gamepad, campaign.choose, cmd('campChoose'), a save
//           file); clearing Level 1 unlocks 2 and it survives a reload.
//   carry   state diff across a transition with a real mid-run build.
//
//   node tools/gntCAMPAIGN-probe.mjs <leg|all> [--url http://127.0.0.1:5199/] [--seed 7] [--tag t] [--out f]
// Output: captures/gntCAMPAIGN-probe-<leg>-<tag>.json (+ a console summary).
// Reaching a Stag fast uses cmd('skipToRoom', 8) + cmd('killBoss') +
// cmd('killAllEnemies') — say so in any report built on this probe.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const LEG = argv[0] || 'all';
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const SEED = Number(opt('seed', '7'));
const TAG = opt('tag', 't');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r1 = (v) => Math.round(v * 10) / 10;

async function boot(browser, query = `?seed=${SEED}&menu=0`, { width = 1600, height = 900 } = {}) {
  const url = `${URL0}${query}`;
  const o = await openEchoes(browser, url, { width, height });
  await o.page.waitForFunction(() => window.__echoes && window.__echoes.tick > 30 && window.__echoes.campaign, { timeout: 180000 });
  o.cdp = await o.page.target().createCDPSession();
  return o;
}

async function heapAfterGc(cdp) {
  await cdp.send('HeapProfiler.enable');
  for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage');
  const h = await cdp.send('Runtime.getHeapUsage');
  return r1(h.usedSize / 1048576);
}

const E = (page, fn, ...args) => page.evaluate(fn, ...args);

// Wait until the page satisfies `cond` (a function source run in the page).
async function waitFor(page, cond, { timeout = 60000, poll = 100, args = [] } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate(cond, ...args)) return Date.now() - t0;
    await sleep(poll);
  }
  throw new Error(`timeout waiting for ${cond.toString().slice(0, 120)}`);
}

// Level L's first controllable frame: combat in room 1 of that level, no page.
const controllable = (level) => {
  const v = __echoes.state().run;
  return v.active && v.phase === 'combat' && v.act === level && v.room === 1 && !__echoes.runUi().open && __echoes.campaign.state().transitionState === 'none';
};

// Clear the live level fast: jump to the Stag, fell it and its adds.
async function clearLevel(page) {
  await E(page, () => __echoes.cmd('skipToRoom', 8));
  await sleep(300);
  for (let i = 0; i < 80; i++) {
    const ph = await E(page, () => {
      const v = __echoes.state().run;
      if (v.phase === 'combat' && v.room === 8) {
        __echoes.cmd('killBoss');
        __echoes.cmd('killAllEnemies');
      }
      return v.phase;
    });
    if (ph === 'transit' || ph === 'victory' || ph === 'defeat') return ph;
    await sleep(100);
  }
  return 'stuck';
}

async function sample(o, label) {
  const heap = await heapAfterGc(o.cdp);
  const m = await E(o.page, (l) => __echoes.campaign.snapshot(l), label);
  return { label, ...m, heapGcMB: heap };
}

// ------------------------------------------------------------------ memory --
// Deterministic: every campaign starts from New Game with the SAME seed
// (save.resetToFresh), the realtime sim is frozen and the probe steps it
// (stepN, no input) — so campaign k plays exactly the ticks campaign 1 did,
// and any difference in a sample is a leak, not content variance. Samples at
// level start + 90 ticks (+ 20 rendered frames) and in camp after each
// campaign; the card is advanced by the probe once the next level is ready.
const frames = (page, n) => page.evaluate((k) => new Promise((res) => { let i = 0; const f = () => (++i >= k ? res(i) : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
async function detClear(page) {
  await E(page, () => { __echoes.cmd('skipToRoom', 8); __echoes.sim.stepN(30, 0); });
  for (let i = 0; i < 40; i++) {
    const ph = await E(page, () => {
      __echoes.cmd('killBoss');
      __echoes.cmd('killAllEnemies');
      __echoes.sim.stepN(2, 0);
      return __echoes.state().run.phase;
    });
    if (ph !== 'combat') return ph;
  }
  return 'stuck';
}
async function legMemory(browser) {
  const o = await boot(browser);
  const { page } = o;
  const rows = [];
  const census = {};
  await waitFor(page, () => __echoes.campaign.ready(1).ready, { timeout: 90000 });
  await sleep(1500);
  rows.push(await sample(o, 'camp-boot'));
  const CAMPAIGNS = Number(opt('campaigns', '3'));
  // Campaign 0 = the warm-up: shared first-use caches (elite rings, the
  // interactables' part geometries, rigs first seen in later rooms) are made
  // once and kept by design, so campaign 1's Level 1 would otherwise be
  // sampled before they exist. c0 is reported, never compared.
  const FIRST = opt('warmup', '1') === '0' ? 1 : 0;
  for (let c = FIRST; c <= CAMPAIGNS; c++) {
    await E(page, () => { __echoes.save.resetToFresh({ seed: 7 }); __echoes.sim.freeze(); });
    await waitFor(page, () => __echoes.campaign.ready(1).ready, { timeout: 90000 });
    await frames(page, 30);
    await E(page, () => __echoes.cmd('startCampaign', { level: 1, depart: false }));
    for (const level of [1, 2, 3]) {
      await E(page, () => __echoes.sim.stepN(90, 0));
      await frames(page, 20);
      rows.push(await sample(o, `c${c}-L${level}`));
      census[`c${c}-L${level}`] = await E(page, () => __echoes.campaign.census());
      const ph = await detClear(page);
      if (level < 3 && ph !== 'transit') throw new Error(`c${c} L${level}: expected transit, got ${ph}`);
      if (level === 3 && ph !== 'victory') throw new Error(`c${c} L3: expected victory, got ${ph}`);
      if (level < 3) {
        // the card: step to its minimum, wait for the preload, advance.
        await E(page, () => __echoes.sim.stepN(31, 0));
        await waitFor(page, (l) => __echoes.campaign.ready(l).ready, { args: [level + 1], timeout: 90000 });
        const adv = await E(page, () => { const r = __echoes.cmd('campaignAdvance', 'probe'); return r && r.phase; });
        if (adv !== 'combat') throw new Error(`c${c} advance -> ${adv}`);
      }
    }
    await E(page, () => { __echoes.cmd('returnToCamp'); __echoes.sim.stepN(2, 0); });
    await waitFor(page, () => __echoes.state().run.phase === 'idle' && __echoes.campaign.ready(1).ready, { timeout: 90000 });
    await frames(page, 30);
    rows.push(await sample(o, `c${c}-camp`));
    census[`c${c}-camp`] = await E(page, () => __echoes.campaign.census());
    await E(page, () => __echoes.sim.thaw());
  }
  // Quit to Lobby from Level 2 (the pause menu's path: abandonRun).
  await E(page, () => { __echoes.save.resetToFresh({ seed: 7 }); __echoes.sim.freeze(); });
  await waitFor(page, () => __echoes.campaign.ready(1).ready, { timeout: 90000 });
  await E(page, () => __echoes.cmd('startCampaign', { level: 1, depart: false }));
  await E(page, () => __echoes.sim.stepN(90, 0));
  await detClear(page);
  await E(page, () => __echoes.sim.stepN(31, 0));
  await waitFor(page, () => __echoes.campaign.ready(2).ready, { timeout: 90000 });
  await E(page, () => { __echoes.cmd('campaignAdvance', 'probe'); __echoes.sim.stepN(90, 0); });
  const abandon = await E(page, () => {
    const r = __echoes.cmd('abandonRun', 'quit');
    return { abandoned: !!(r && r.abandoned), phase: __echoes.state().run.phase, mode: __echoes.cmd('campState').mode };
  });
  await E(page, () => __echoes.sim.stepN(2, 0));
  await waitFor(page, () => __echoes.campaign.ready(1).ready, { timeout: 90000 });
  await frames(page, 30);
  rows.push({ ...(await sample(o, 'quit-camp')), abandon });
  await E(page, () => __echoes.sim.thaw());
  const errors = o.errors.slice();
  await page.close();
  // Verdicts: the same level samples across campaigns.
  const pick = (lbl) => rows.find((r) => r.label === lbl);
  const same = [];
  for (const key of ['L1', 'L2', 'L3', 'camp']) {
    const a = pick(`c1-${key}`);
    for (let c = 2; c <= CAMPAIGNS; c++) {
      const b = pick(`c${c}-${key}`);
      if (!a || !b) continue;
      const groups = {};
      const ca = census[`c1-${key}`];
      const cb = census[`c${c}-${key}`];
      if (ca && cb) for (const k of new Set([...Object.keys(ca.groups), ...Object.keys(cb.groups)])) {
        const x = ca.groups[k] ? ca.groups[k].geometries : 0;
        const y = cb.groups[k] ? cb.groups[k].geometries : 0;
        if (x !== y) groups[k] = [x, y];
      }
      same.push({
        key,
        c,
        geometries: b.gl.geometries - a.gl.geometries,
        textures: b.gl.textures - a.gl.textures,
        programs: b.gl.programs - a.gl.programs,
        heapMB: r1(b.heapGcMB - a.heapGcMB),
        entities: b.entities - a.entities,
        busListeners: b.busListeners - a.busListeners,
        // allocations, not transient live counts: numeral elements allocated,
        // kill splats / scorches live (sim-driven); particles are cosmetic
        // (unseeded) and only have to be 0 in camp.
        pools: key === 'camp' ? JSON.stringify(b.pools) === JSON.stringify(a.pools) : ['numeralCapacity', 'decals', 'scorches'].every((k) => b.pools[k] === a.pools[k]),
        poolsA: a.pools,
        poolsB: b.pools,
        dom: b.dom - a.dom,
        domLessToasts: b.dom - b.domToasts - (a.dom - a.domToasts),
        domParts: (() => {
          const d = {};
          for (const k of new Set([...Object.keys(a.domParts || {}), ...Object.keys(b.domParts || {})])) if ((a.domParts || {})[k] !== (b.domParts || {})[k]) d[k] = [(a.domParts || {})[k] ?? 0, (b.domParts || {})[k] ?? 0];
          return d;
        })(),
        voices: [a.audio ? a.audio.voices : null, b.audio ? b.audio.voices : null],
        dressings: JSON.stringify(b.dressings) === JSON.stringify(a.dressings),
        sceneGroups: groups,
      });
    }
  }
  const warm = FIRST === 0 ? ['L1', 'L2', 'L3', 'camp'].map((k) => {
    const a = pick(`c0-${k}`);
    const b = pick(`c1-${k}`);
    return a && b ? { key: k, geometries: b.gl.geometries - a.gl.geometries, textures: b.gl.textures - a.gl.textures, programs: b.gl.programs - a.gl.programs } : null;
  }) : null;
  const quit = pick('quit-camp');
  const camp1 = pick('c1-camp');
  const levelOnly = rows.filter((r) => /-L\d$/.test(r.label)).map((r) => {
    const lv = Number(r.label.slice(-1));
    const own = (r.dressings || []).every((id) => Math.ceil(id / 3) === lv);
    return { label: r.label, dressings: r.dressings, onlyOwnLevel: own };
  });
  const ok = {
    glFlat: same.every((s) => Math.abs(s.geometries) <= 2 && Math.abs(s.textures) <= 2 && Math.abs(s.programs) <= 2),
    heapFlat: same.every((s) => Math.abs(s.heapMB) <= 8),
    entitiesFlat: same.every((s) => s.entities === 0),
    listenersFlat: same.every((s) => s.busListeners === 0),
    poolsFlat: same.every((s) => s.pools),
    domFlatInCamp: same.filter((s) => s.key === 'camp').every((s) => s.dom === 0),
    // (at a level sample the HUD's off-screen threat pointers — 8 elements
    // each, polled on wall time — and toasts come and go; everything else
    // must match exactly)
    domFlatLessTransient: same.every((s) => Object.keys(s.domParts).every((k) => k === '#hud-threat' || k === '.ap-toasts')),
    voicesBounded: rows.every((r) => !r.audio || r.audio.voices <= 24),
    dressingsSame: same.every((s) => s.dressings),
    onlyOwnLevel: levelOnly.every((x) => x.onlyOwnLevel),
    quitCampFlat: !!(quit && camp1 && Math.abs(quit.gl.geometries - camp1.gl.geometries) <= 2 && quit.entities === camp1.entities && quit.busListeners === camp1.busListeners),
    pageErrors: errors.length === 0,
  };
  return { rows, same, warmupDelta: warm, levelOnly, ok, errors };
}

// ------------------------------------------------------------------ frames --
async function screencast(o, fn) {
  const frames = [];
  const { cdp } = o;
  const pending = [];
  const onFrame = (f) => {
    frames.push({ t: f.metadata.timestamp * 1000, data: f.data });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  };
  cdp.on('Page.screencastFrame', onFrame);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 50, maxWidth: 480, maxHeight: 270, everyNthFrame: 1 });
  let out;
  try {
    out = await fn();
  } finally {
    await cdp.send('Page.stopScreencast').catch(() => {});
    cdp.off('Page.screencastFrame', onFrame);
  }
  await Promise.all(pending);
  const lumas = [];
  for (const f of frames) {
    const { data, info } = await sharp(Buffer.from(f.data, 'base64')).greyscale().raw().toBuffer({ resolveWithObject: true });
    let s = 0;
    for (let i = 0; i < data.length; i++) s += data[i];
    lumas.push({ t: f.t, luma: r1(s / (info.width * info.height)) });
  }
  return { out, lumas };
}

function frameStats(lumas, t0 = -Infinity, t1 = Infinity) {
  const xs = lumas.filter((f) => f.t >= t0 && f.t <= t1);
  let nearBlack = 0;
  let run = 0;
  let maxRun = 0;
  let minLuma = Infinity;
  let maxGap = 0;
  for (let i = 0; i < xs.length; i++) {
    const f = xs[i];
    if (f.luma < minLuma) minLuma = f.luma;
    if (f.luma < 24) {
      nearBlack += 1;
      run += 1;
      maxRun = Math.max(maxRun, run);
    } else run = 0;
    if (i > 0) maxGap = Math.max(maxGap, f.t - xs[i - 1].t);
  }
  return { frames: xs.length, nearBlack, maxConsecutiveNearBlack: maxRun, minLuma: r1(minLuma), maxScreencastGapMs: Math.round(maxGap) };
}

async function oneTransition(o, { skipAtMs = null, throttle = 1, label, from = 1 }) {
  const { page, cdp } = o;
  await E(page, (l) => __echoes.cmd('startCampaign', { level: l, depart: false }), from);
  await waitFor(page, controllable, { args: [from], timeout: 60000 });
  await E(page, () => __echoes.cmd('skipToRoom', 8));
  // A short Stag fight (the next level's floors paint in the worker meanwhile);
  // the live gameplay voices are sampled through it (the steady combat count).
  const combatVoices = [];
  const bossMs = Number(opt('bossMs', '4000'));
  for (let t = 0; t < bossMs; t += 250) {
    await sleep(250);
    combatVoices.push(await E(page, () => { const a = __echoes.audio; const d = a && typeof a.voices === "function" ? a.voices() : null; return d ? d.active : null; }));
  }
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  const { out, lumas } = await screencast(o, async () => {
    const killWall = Date.now();
    await E(page, () => {
      __echoes.cmd('killBoss');
      __echoes.cmd('killAllEnemies');
    });
    await waitFor(page, () => __echoes.state().run.phase === 'transit', { timeout: 10000, poll: 20 });
    // the live voices on the card, just after the teardown (the stinger + UI only)
    await sleep(150);
    const cardVoices = await E(page, () => { const a = __echoes.audio; const d = a && typeof a.voices === "function" ? a.voices() : null; return d ? d.active : null; });
    if (skipAtMs !== null) {
      await sleep(Math.max(0, skipAtMs - 150));
      await page.keyboard.press('Enter');
    }
    await waitFor(page, controllable, { args: [from + 1], timeout: 30000, poll: 30 });
    await sleep(1000);
    return { killWall, cardVoices };
  });
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const t = await E(page, () => __echoes.campaign.transitions().slice(-1)[0]);
  const timeline = await E(page, () => __echoes.campaign.residency().timeline);
  const st = frameStats(lumas);
  await E(page, () => __echoes.cmd('abandonRun', 'probe'));
  await waitFor(page, () => __echoes.campaign.ready(1).ready, { timeout: 90000 });
  return {
    label,
    throttle,
    skipAtMs,
    killToControlMs: t.killToControlMs,
    cardWallMs: t.advanceAt !== null && t.cardAt !== null ? Math.round(t.advanceAt - t.cardAt) : null,
    audio: { combatMax: Math.max(...combatVoices.filter((x) => x !== null), 0), combat: combatVoices, card: out.cardVoices },
    clearToControlMs: t.clearToControlMs,
    cardToReadyMs: t.readyAt !== null ? Math.round(t.readyAt - t.cardAt) : null,
    advanceReason: t.advanceReason,
    waitedMs: t.waitedMs,
    maxGapMs: t.maxGapMs,
    gapsOver250: t.gapsOver250,
    teardownMs: t.teardown ? t.teardown.ms : null,
    timeline,
    perf: await E(page, () => __echoes.campaign.residency().perf),
    longFrames: t.longFrames || [],
    ...st,
    lumaTrace: lumas.filter((_, i) => i % 3 === 0).map((f) => f.luma),
  };
}

async function legFrames(browser) {
  const o = await boot(browser);
  await waitFor(o.page, () => __echoes.campaign.ready(1).ready, { timeout: 90000 });
  await o.page.keyboard.press('Shift'); // a trusted gesture: the audio engine unlocks
  await sleep(1500);
  const audioState = await E(o.page, () => (__echoes.audio ? __echoes.audio.state : null));
  const rows = [];
  rows.push(await oneTransition(o, { label: 'auto' }));
  rows.push(await oneTransition(o, { label: 'enter-skip@0.5s', skipAtMs: 500 }));
  rows.push(await oneTransition(o, { label: 'auto L2->L3', from: 2 }));
  rows.push(await oneTransition(o, { label: 'enter-skip@0.5s L2->L3', from: 2, skipAtMs: 500 }));
  if (opt('throttle', '1') !== '0') rows.push(await oneTransition(o, { label: 'auto-cpu4x (stress, not a gate)', throttle: 4 }));
  const errors = o.errors.slice();
  await o.page.close();
  const ok = {
    noNearBlack: rows.every((r) => r.nearBlack === 0),
    noStall250: rows.filter((r) => r.throttle === 1).every((r) => r.gapsOver250 === 0),
    autoWithin4s: rows.filter((r) => r.skipAtMs === null && r.throttle === 1).every((r) => r.killToControlMs !== null && r.killToControlMs <= 4000),
    skipWithin1500: rows.filter((r) => r.skipAtMs !== null).every((r) => r.killToControlMs !== null && r.killToControlMs <= 1500),
    cardWithinBound: rows.every((r) => r.cardWallMs !== null && r.cardWallMs <= 3000 + 6000),
    cardVoicesBounded: rows.every((r) => r.audio.card !== null && r.audio.card <= Math.max(r.audio.combatMax, 4)),
    pageErrors: errors.length === 0,
  };
  return { audioState, rows, ok, errors };
}

// -------------------------------------------------------------------- main --
const legs = { memory: legMemory, frames: legFrames };
const which = LEG === 'all' ? Object.keys(legs) : [LEG];
mkdirSync(join(here, 'captures'), { recursive: true });
const browser = await launchEchoes({ gpu: true, width: 1600, height: 900, extraArgs: ['--disable-features=NetworkServiceSandbox', '--js-flags=--expose-gc', '--autoplay-policy=no-user-gesture-required'] });
let fail = false;
try {
  for (const k of which) {
    if (!legs[k]) throw new Error(`unknown leg ${k}`);
    const t0 = Date.now();
    const r = await legs[k](browser);
    r.ms = Date.now() - t0;
    const file = opt('out', `captures/gntCAMPAIGN-probe-${k}-${TAG}.json`);
    writeFileSync(resolve(here, file), JSON.stringify(r, null, 1));
    console.log(`== ${k} (${r.ms} ms) -> ${file}`);
    console.log(JSON.stringify(r.ok));
    if (r.errors && r.errors.length) {
      fail = true;
      console.log('PAGE ERRORS', r.errors.slice(0, 5));
    }
  }
} finally {
  await browser.close();
}
process.exit(fail ? 1 : 0);
