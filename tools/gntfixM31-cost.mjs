// Fix builder M3 round 1 (AUD-F1, gate G3.10 cost) — boss-fight engine-cost probe with an optional
// CPU profile and CPU throttling (a deterministic stand-in for the critic's contended box).
//
//   node tools/gntfixM31-cost.mjs --mode adds|natural|camp [--runs 1] [--seed 17] [--fight 30]
//        [--throttle 1] [--profile] [--out gntfixM31-cost-<tag>.json]
//
// Scenario = tools/gntcaudio1-cost.mjs (critic): fresh GPU-harness browser with the autoplay flag,
// 100 % log sliders, room 8, party kept alive, adds topped up to >= 9 every 400 ms (adds mode), real
// input (mouse held + skill keys 1-4 + dodge) for --fight s. Extra: --throttle N applies CDP
// Emulation.setCPUThrottlingRate(N) during the fight; --profile records a CDP CPU profile of the fight
// and reports self + inclusive time of every src/audio function (and what the audio code calls).
import { launchEchoes, waitReady } from './gnt-arch-browser.mjs';
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const MODE = arg('--mode', 'adds');
const RUNS = +arg('--runs', 1);
const SEED0 = +arg('--seed', 17);
const FIGHT = +arg('--fight', 30);
const THROTTLE = +arg('--throttle', 1);
const PROFILE = process.argv.includes('--profile');
const OUT = arg('--out', `gntfixM31-cost-${MODE}${THROTTLE > 1 ? '-t' + THROTTLE : ''}.json`);
const URL = arg('--url', 'http://127.0.0.1:5199/');
const PER_SEC = process.argv.includes('--per-second'); // cost() read + reset every second: per-second p95 / tail / bake

function writeOut(name, obj) {
  const p = path.join(process.cwd(), 'captures', name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  console.log('WROTE', p);
}

function analyseProfile(prof) {
  const nodes = new Map(prof.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of prof.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const self = new Map();
  const dt = prof.timeDeltas;
  for (let i = 0; i < prof.samples.length; i++) {
    const id = prof.samples[i];
    const d = (dt[i + 1] !== undefined ? dt[i + 1] : 0) / 1000; // ms
    self.set(id, (self.get(id) || 0) + d);
  }
  const key = (n) => {
    const cf = n.callFrame;
    const u = (cf.url || '').replace(/^.*\/src\//, 'src/').replace(/\?.*$/, '');
    return `${cf.functionName || '(anon)'} @ ${u}:${cf.lineNumber + 1}`;
  };
  const isAudio = (n) => /\/src\/audio\//.test(n.callFrame.url || '');
  const selfBy = new Map();
  const inclAudio = new Map();
  const underAudioOther = new Map();
  const inclAll = new Map();
  let audioTotal = 0;
  let total = 0;
  for (const [id, ms] of self) {
    const n = nodes.get(id);
    total += ms;
    const k = key(n);
    selfBy.set(k, (selfBy.get(k) || 0) + ms);
    let cur = id;
    let outer = null;
    while (cur !== undefined) {
      const cn = nodes.get(cur);
      if (isAudio(cn)) outer = cn;
      cur = parent.get(cur);
    }
    // inclusive time of every function on the stack (each counted once per sample)
    {
      let c2 = id;
      const seen = new Set();
      while (c2 !== undefined) {
        const cn = nodes.get(c2);
        const kk = key(cn);
        if (!seen.has(kk)) {
          seen.add(kk);
          if (outer) inclAll.set(kk, (inclAll.get(kk) || 0) + ms);
        }
        c2 = parent.get(c2);
      }
    }
    if (outer) {
      audioTotal += ms;
      const ok = key(outer);
      inclAudio.set(ok, (inclAudio.get(ok) || 0) + ms);
      if (!isAudio(n)) underAudioOther.set(k, (underAudioOther.get(k) || 0) + ms);
    }
  }
  const top = (m, n = 25) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k, v]) => [k, Math.round(v * 10) / 10]);
  const durMs = (prof.endTime - prof.startTime) / 1000;
  return {
    durMs: Math.round(durMs),
    sampledMs: Math.round(total),
    audioInclusiveMs: Math.round(audioTotal * 10) / 10,
    audioMsPerSec: Math.round((audioTotal / (durMs / 1000)) * 100) / 100,
    outermostAudio: top(inclAudio, 20),
    nonAudioUnderAudio: top(underAudioOther, 25),
    selfTop: top(selfBy, 30),
    inclusiveUnderAudio: top(inclAll, 60),
  };
}

// Other agents edit src/** while this runs: an HMR full reload destroys the page's state. Every run
// closes its own browser (finally), aborts on a main-frame navigation after boot, and is retried
// up to 3 times.
async function oneRun(i) {
  const browser = await launchEchoes({ gpu: true, autoplay: true });
  let navTimer = null;
  try {
    return await Promise.race([
      runIn(browser, i),
      new Promise((_, rej) => {
        navTimer = setTimeout(() => rej(new Error('run timeout 240 s')), 240000);
      }),
    ]);
  } finally {
    clearTimeout(navTimer);
    await browser.close().catch(() => {});
  }
}

async function runIn(browser, i) {
  const seed = SEED0 + i;
  const page = await browser.newPage();
  let booted = false;
  let navigated = false;
  page.on('framenavigated', (f) => {
    if (booted && f === page.mainFrame()) navigated = true;
  });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.goto(`${URL}?menu=0&seed=${seed}&fresh=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0 && !!window.__echoes.audio, { timeout: 180000 });
  await waitReady(page, { minTick: 200 }).catch(() => {});
  await page.evaluate(async () => {
    const a = window.__echoes.audio;
    if (a.state !== 'running') {
      try {
        await a.unlock();
      } catch {}
    }
    for (let i = 0; i < 60 && a.state !== 'running'; i++) await new Promise((r) => setTimeout(r, 100));
  });
  booted = true;
  const sleep = async (ms) => {
    await page.evaluate((m) => new Promise((r) => setTimeout(r, m)), ms);
    if (navigated) throw new Error('page navigated (HMR reload) mid-run');
  };
  const version = await page.evaluate(() => window.__echoes.version);
  await page.evaluate((mode) => {
    const S = window.__echoes.settings;
    for (const c of ['master', 'music', 'sfx', 'ambient', 'ui']) {
      S.set(`audio.${c}.mode`, 'log');
      S.set(`audio.${c}.level`, 1);
      S.set(`audio.${c}.muted`, false);
    }
    if (mode !== 'camp') window.__echoes.cmd('skipToRoom', 8);
  }, MODE);
  await sleep(3000);
  await page.evaluate((mode) => {
    const E = window.__echoes;
    if (mode === 'camp') return;
    window.__keep = setInterval(() => {
      try {
        for (let i = 0; i < 4; i++) E.cmd('setHp', i, 1);
        const st = E.state();
        if (st.run.boss && st.run.boss.pct < 0.5) E.cmd('bossHp', 0.9);
        if (mode === 'adds') {
          const alive = (st.enemies || []).filter((x) => x.hp > 0 && x.faction !== 'party').length;
          for (let k = alive; k < 9; k++) E.cmd('spawn', 'boar', ((k * 7) % 11) - 5, ((k * 5) % 9) - 4);
        }
      } catch {}
    }, 400);
  }, MODE);
  await sleep(1500);
  const cdp = await page.target().createCDPSession();
  if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  if (PROFILE) {
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
    await cdp.send('Profiler.start');
  }
  await page.evaluate(() => {
    const E = window.__echoes;
    const a = E.audio;
    a.meterReset();
    a.costReset();
    window.__S = [];
    window.__t0 = performance.now();
    window.__tick0 = E.tick;
    window.__W = [];
    window.__siv = setInterval(() => {
      try {
        const en = E.state().enemies || [];
        window.__S.push({ h: en.filter((x) => x.hp > 0 && x.faction !== 'party').length, fps: +(E.fps || 0).toFixed(1) });
      } catch {}
    }, 1000);
    window.__wiv = setInterval(() => {
      try {
        const c = a.cost();
        window.__W.push({ t: Math.round(performance.now() - window.__t0), p50: c.p50Ms, p95: c.p95Ms, max: c.maxMs });
      } catch {}
    }, 5000);
  });
  if (PER_SEC) {
    await page.evaluate(() => {
      const a = window.__echoes.audio;
      window.__PS = [];
      window.__psiv = setInterval(() => {
        try {
          const c = a.cost();
          const b = c.bake || {};
          window.__PS.push({ t: Math.round(performance.now() - window.__t0), n: c.frames, p95: c.p95Ms, max: c.maxMs, tail: c.tailPartsMs, bake: { keys: b.keys, pending: b.pending, builds: b.buildMs, hits: b.hits }, live: c.budget.liveStarts, baked: c.budget.bakedStarts, drops: c.budget.budgetDrops });
          a.costReset();
        } catch {}
      }, 1000);
    });
  }
  if (MODE === 'camp') await sleep(FIGHT * 1000);
  else {
    await page.mouse.move(820, 360);
    await page.mouse.down();
    for (let k = 0; k < FIGHT; k++) {
      await page.keyboard.press(['Digit1', 'Digit2', 'Digit3', 'Digit4'][k % 4]);
      if (k % 5 === 4) await page.keyboard.press('Space');
      await page.mouse.move(650 + (k % 6) * 60, 300 + (k % 4) * 60);
      await sleep(1000);
    }
    await page.mouse.up();
  }
  let perSec = null;
  if (PER_SEC) perSec = await page.evaluate(() => (clearInterval(window.__psiv), window.__PS));
  let prof = null;
  if (PROFILE) {
    const r = await cdp.send('Profiler.stop');
    prof = analyseProfile(r.profile);
  }
  if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const fin = await page.evaluate(() => {
    const E = window.__echoes;
    const a = E.audio;
    clearInterval(window.__siv);
    clearInterval(window.__wiv);
    clearInterval(window.__keep);
    const S = window.__S;
    const H = S.map((s) => s.h).sort((x, y) => x - y);
    const F = S.map((s) => s.fps).sort((x, y) => x - y);
    const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
    const ticks = E.tick - window.__tick0;
    const ms = performance.now() - window.__t0;
    let fs = null;
    try {
      fs = E.app && E.app.frameStats ? E.app.frameStats() : null;
    } catch {}
    return {
      cost: a.cost(),
      windows: window.__W,
      voices: a.voices(),
      music: a.music().state,
      notes: a.music().notes,
      hostiles: { min: H[0], median: q(H, 0.5), max: H[H.length - 1] },
      fps: { min: F[0], median: q(F, 0.5) },
      ticksPerSec: +(ticks / (ms / 1000)).toFixed(1),
      frameStats: fs,
    };
  });
  if (navigated) throw new Error('page navigated (HMR reload) mid-run');
  const worst = fin.windows.reduce((m, w) => Math.max(m, w.p95 || 0), 0);
  console.log(
    `[${MODE} t${THROTTLE} seed ${seed} v${version}] hostiles ${fin.hostiles.min}/${fin.hostiles.median}/${fin.hostiles.max} fps med ${fin.fps.median} min ${fin.fps.min} | cost p50 ${fin.cost.p50Ms} p95 ${fin.cost.p95Ms} max ${fin.cost.maxMs} worstWin ${worst} | parts ${JSON.stringify(fin.cost.avgPartsMs)} | voices peak ${fin.voices.peak} | errors ${errors.length}`
  );
  console.log(`  music notes ${JSON.stringify(fin.notes)}`);
  if (fin.cost.bake || fin.cost.tailPartsMs)
    console.log(`  p99 ${fin.cost.p99Ms} tail ${JSON.stringify(fin.cost.tailPartsMs)} | budget ${JSON.stringify(fin.cost.budget)} | bake ${JSON.stringify(fin.cost.bake)} | dropped ${JSON.stringify(fin.voices.dropped)}`);
  if (prof)
    console.log(
      `  profile: audio ${prof.audioMsPerSec} ms/s; outermost ${JSON.stringify(prof.outermostAudio.slice(0, 10))}\n  under-audio non-audio: ${JSON.stringify(prof.nonAudioUnderAudio.slice(0, 14))}`
    );
  if (perSec) for (const x of perSec) console.log(`  ${x.t}ms n${x.n} p95 ${x.p95} max ${x.max} tail ${JSON.stringify(x.tail)} bake ${JSON.stringify(x.bake)} live ${x.live} baked ${x.baked} drops ${x.drops}`);
  return { run: i + 1, seed, version, mode: MODE, throttle: THROTTLE, ...fin, worstWindowP95: worst, profile: prof, perSec, errors };
}

const runs = [];
for (let i = 0; i < RUNS; i++) {
  let last = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      last = await oneRun(i);
      break;
    } catch (e) {
      last = { run: i + 1, failed: String((e && e.message) || e) };
      console.log(`[run ${i + 1} attempt ${attempt + 1}] FAILED`, last.failed);
    }
  }
  runs.push(last);
}
const ok = runs.filter((r) => !r.failed);
const summary = {
  mode: MODE,
  throttle: THROTTLE,
  runs: ok.length,
  p95: ok.map((r) => r.cost.p95Ms),
  worstWindowP95: ok.map((r) => r.worstWindowP95),
  max: ok.map((r) => r.cost.maxMs),
  fpsMedian: ok.map((r) => r.fps.median),
  gateP95LE1: ok.length > 0 && ok.every((r) => r.cost.p95Ms <= 1 && r.worstWindowP95 <= 1),
  errors: ok.reduce((s, r) => s + r.errors.length, 0),
};
console.log('SUMMARY', JSON.stringify(summary));
writeOut(OUT, { summary, runs });
