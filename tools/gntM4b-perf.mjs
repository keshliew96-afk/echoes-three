#!/usr/bin/env node
// M4b perf probe (G4b.5) on the GPU harness (PLAN §6.7): per act, boot the
// menu-skip camp with ?act=N, let the act's dressings pre-build (the camp
// idle a player spends walking to the portal), start the act's run with the
// default-build autopilot and record EVERY rAF frame in real time for --secs.
// Reports fps over combat frames after a warm-up, frames > 100 ms (after
// warm-up), and for every room entry the worst frame around its layout_enter
// (the biome swap, which must stay hidden under the <= 300 ms fade).
//   node tools/gntM4b-perf.mjs [--acts 1,2,3] [--seed 7] [--secs 60] [--warm 3000] [--url base]
import { writeFileSync, mkdirSync } from 'node:fs';
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const BASE = opt('url', 'http://127.0.0.1:5199/');
const ACTS = opt('acts', '1,2,3').split(',').map(Number);
const SEED = opt('seed', '7');
const SECS = Number(opt('secs', '60'));
const WARM = Number(opt('warm', '3000'));
const LAYOUTS = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9] };
mkdirSync('captures', { recursive: true });

const out = { seed: SEED, secs: SECS, acts: [] };
let bad = false;
for (const act of ACTS) {
  const browser = await launchEchoes({ gpu: true, width: 1600, height: 900 });
  try {
    const { page, errors } = await openEchoes(browser, `${BASE}?seed=${SEED}&menu=0&act=${act}`, { width: 1600, height: 900 });
    await waitReady(page, { minTick: 60 });
    const prebuild = await page.evaluate(async (want) => {
      const E = window.__echoes;
      const t0 = performance.now();
      while (performance.now() - t0 < 25000) {
        const L = E.cmd('arenaLayout');
        if (L && want.every((i) => L.built.includes(i))) return { ms: Math.round(performance.now() - t0), built: L.built };
        await new Promise((r) => setTimeout(r, 100));
      }
      return { timeout: true };
    }, LAYOUTS[act]);
    const r = await page.evaluate(
      async (act, secs, warm) => {
        const E = window.__echoes;
        const frames = []; // [t, dt]
        const phases = []; // [t, phase, room, enemies]
        const swaps = []; // { t, room, layoutId, biome }
        E.on('layout_enter', (e) => swaps.push({ t: performance.now(), room: e.room, layoutId: e.layoutId, biome: e.biome, mode: e.mode }));
        // Long animation frames with script attribution (Chrome LoAF).
        const loaf = [];
        try {
          new PerformanceObserver((list) => {
            for (const en of list.getEntries()) {
              if (en.duration < 100) continue;
              loaf.push({
                t: Math.round(en.startTime),
                ms: Math.round(en.duration),
                render: Math.round((en.renderStart ? en.startTime + en.duration - en.renderStart : 0)),
                style: Math.round(en.styleAndLayoutStart ? en.startTime + en.duration - en.styleAndLayoutStart : 0),
                scripts: (en.scripts || []).map((sc) => ({ ms: Math.round(sc.duration), fn: sc.sourceFunctionName, src: (sc.sourceURL || '').split('/').slice(-2).join('/'), at: sc.sourceCharPosition, inv: sc.invoker })).sort((a, b) => b.ms - a.ms).slice(0, 4),
              });
            }
          }).observe({ type: 'long-animation-frame', buffered: false });
        } catch {
          /* no LoAF */
        }
        window.__m4bLoaf = loaf;
        E.cmd('autopilot', true);
        E.cmd('startRun', { act });
        const t0 = performance.now();
        let last = t0;
        await new Promise((res) => {
          function f(t) {
            frames.push([t, t - last]);
            last = t;
            if (t - t0 < secs * 1000) requestAnimationFrame(f);
            else res();
          }
          requestAnimationFrame(f);
          const iv = setInterval(() => {
            try {
              const v = E.cmd('runState');
              phases.push([performance.now(), v.phase, v.room, E.state().enemies.length]);
            } catch {
              /* page busy */
            }
            if (performance.now() - t0 > secs * 1000) clearInterval(iv);
          }, 250);
        });
        const phaseAt = (t) => {
          let p = null;
          for (const q of phases) {
            if (q[0] > t) break;
            p = q;
          }
          return p;
        };
        const after = frames.filter(([t]) => t - t0 > warm);
        const combat = after.filter(([t]) => {
          const p = phaseAt(t);
          return p && p[1] === 'combat' && p[3] > 0;
        });
        const stat = (fr) => {
          if (!fr.length) return null;
          const d = fr.map((x) => x[1]).sort((a, b) => a - b);
          const mean = d.reduce((a, b) => a + b, 0) / d.length;
          return {
            frames: d.length,
            fpsMean: Math.round((1000 / mean) * 10) / 10,
            fpsP50: Math.round((1000 / d[Math.floor(d.length / 2)]) * 10) / 10,
            p95ms: Math.round(d[Math.floor(d.length * 0.95)] * 10) / 10,
            maxMs: Math.round(d[d.length - 1] * 10) / 10,
            over50: d.filter((x) => x > 50).length,
            over100: d.filter((x) => x > 100).length,
          };
        };
        const swapReport = swaps.map((s) => {
          const near = frames.filter(([t]) => t >= s.t - 20 && t <= s.t + 400).map((x) => x[1]);
          return { ...s, t: Math.round(s.t - t0), worstFrameMs: near.length ? Math.round(Math.max(...near) * 10) / 10 : null };
        });
        const over100 = after.filter(([, dt]) => dt > 100).map(([t, dt]) => {
          const p = phaseAt(t);
          return { t: Math.round(t - t0), ms: Math.round(dt), phase: p && p[1], room: p && p[2] };
        });
        const L = E.cmd('arenaLayout');
        return {
          version: E.version,
          all: stat(after),
          combat: stat(combat),
          over100,
          swaps: swapReport,
          rooms: [...new Set(phases.map((p) => p[2]))],
          lastPhase: phases.length ? phases[phases.length - 1].slice(1) : null,
          loaf: window.__m4bLoaf.map((x) => ({ ...x, t: Math.round(x.t - t0) })),
          dressing: { built: L.built, syncBuilds: L.syncBuilds, maxSliceMs: L.maxSliceMs, worker: L.worker, failed: L.failed },
        };
      },
      act,
      SECS,
      WARM
    );
    const rec = { act, prebuild, ...r, pageErrors: errors.slice(0, 10) };
    out.acts.push(rec);
    if (errors.length) bad = true;
    console.log(JSON.stringify(rec));
  } finally {
    await browser.close();
  }
}
writeFileSync('captures/gntM4b-perf.json', JSON.stringify(out, null, 1));
process.exit(bad ? 1 : 0);
