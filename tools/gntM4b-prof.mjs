#!/usr/bin/env node
// M4b: attribute long frames (> --min ms) during a real-time autopilot run to
// functions — a CDP CPU profile over [--from, --to] s of the run, then the
// self-time of every function inside each long animation frame's window.
//   node tools/gntM4b-prof.mjs [--act 2] [--seed 7] [--from 50] [--to 62] [--min 150]
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const ACT = Number(opt('act', '2'));
const SEED = opt('seed', '7');
const FROM = Number(opt('from', '50'));
const TO = Number(opt('to', '62'));
const MIN = Number(opt('min', '150'));
const LAYOUTS = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await launchEchoes({ gpu: true, width: 1600, height: 900 });
try {
  const { page, errors } = await openEchoes(browser, `http://127.0.0.1:5199/?seed=${SEED}&menu=0&act=${ACT}`, { width: 1600, height: 900 });
  await waitReady(page, { minTick: 60 });
  await page.evaluate(async (want) => {
    const E = window.__echoes;
    const t0 = performance.now();
    while (performance.now() - t0 < 25000) {
      const L = E.cmd('arenaLayout');
      if (L && want.every((i) => L.built.includes(i))) return;
      await new Promise((r) => setTimeout(r, 100));
    }
  }, LAYOUTS[ACT]);
  await page.evaluate(() => {
    window.__m4bLoaf = [];
    window.__m4bEv = [];
    new PerformanceObserver((list) => {
      for (const en of list.getEntries()) window.__m4bLoaf.push({ t: en.startTime, ms: en.duration });
    }).observe({ type: 'long-animation-frame', buffered: false });
    const E = window.__echoes;
    for (const t of ['room_cleared', 'room_enter', 'layout_enter', 'wave_start', 'reward_open', 'run_end', 'waystone_break', 'room_transition'])
      E.on(t, (e) => window.__m4bEv.push({ T: t, t: performance.now(), room: e.room ?? e.index }));
    E.cmd('autopilot', true);
    E.cmd('startRun', { act: Number(new URLSearchParams(location.search).get('act')) });
    window.__m4bT0 = performance.now();
  });
  await sleep(FROM * 1000);
  const cdp = await page.target().createCDPSession();
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
  const nowAtStart = await page.evaluate(() => performance.now());
  await cdp.send('Profiler.start');
  await sleep((TO - FROM) * 1000);
  const { profile } = await cdp.send('Profiler.stop');
  const { loaf, ev, t0 } = await page.evaluate(() => ({ loaf: window.__m4bLoaf, ev: window.__m4bEv, t0: window.__m4bT0 }));
  // profile times are µs on the same monotonic clock; align via the start.
  const off = profile.startTime / 1000 - nowAtStart;
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  let t = profile.startTime;
  const samples = profile.samples.map((id, i) => {
    t += profile.timeDeltas[i];
    return { id, t: t / 1000 - off };
  });
  const label = (n) => `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').slice(-1)[0].split('?')[0]}:${n.callFrame.lineNumber + 1}`;
  const long = loaf.filter((x) => x.ms >= MIN && x.t >= nowAtStart && x.t <= nowAtStart + (TO - FROM) * 1000);
  const report = [];
  for (const lf of long) {
    const self = new Map();
    const incl = new Map();
    let n = 0;
    for (const s of samples) {
      if (s.t < lf.t || s.t > lf.t + lf.ms) continue;
      n += 1;
      const node = nodes.get(s.id);
      self.set(label(node), (self.get(label(node)) ?? 0) + 1);
      const seen = new Set();
      for (let id = s.id; id !== undefined; id = parent.get(id)) {
        const L = label(nodes.get(id));
        if (seen.has(L)) continue;
        seen.add(L);
        incl.set(L, (incl.get(L) ?? 0) + 1);
      }
    }
    const top = (m, k) => [...m].sort((a, b) => b[1] - a[1]).slice(0, k).map(([k2, v]) => `${Math.round((v / Math.max(1, n)) * 100)}% ${k2}`);
    report.push({ at: Math.round(lf.t - t0), ms: Math.round(lf.ms), samples: n, self: top(self, 10), inclusive: top(incl, 28) });
  }
  console.log(JSON.stringify({ events: ev.map((e) => ({ ...e, t: Math.round(e.t - t0) })), report, errors: errors.slice(0, 5) }, null, 1));
} finally {
  await browser.close();
}
