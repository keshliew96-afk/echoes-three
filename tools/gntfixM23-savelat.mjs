#!/usr/bin/env node
// fix-M2-r3 (F3) probe — press -> feedback -> written latency of a manual save
// and a quicksave, with an optionally SLOW thumbnail worker.
//   node tools/gntfixM23-savelat.mjs [--url U] [--reps 4] [--slow 0|ms] [--tag t] [--headful 0] [--midshot 1]
// --slow N patches window.Worker (evaluateOnNewDocument) so the save
// thumbnail worker (URL contains "thumb-worker", or since v0.5.104 the inline
// Blob worker named "echoes-thumb") only receives messages N ms
// after it was constructed — the failure mode the critic hit when the worker
// module fetch stalled (dev server) or the worker cold-started slowly.
// Per rep (fresh profile): New Game, 1.5 s, Esc > Save Game > Enter on Slot 1,
// Enter again 350 ms later; then back to play and F5.
// Measures (in page, performance.now timebase, keydown e.timeStamp = t0):
//   visualMs   first rendered frame whose Slot-1 row / toasts differ from before
//   writtenMs  save.list() holds manual-1
//   toastMs    "Saved to" toast visible
//   thumbMs    save.thumb('manual-1') is a data:image (the picture landed)
//   second     what the second Enter did (confirm opened?)
//   f5.toastMs "Quicksaved" toast after F5; f5.thumbMs
// Output: captures/gntfixM23-savelat-<tag>.json
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = { url: 'http://127.0.0.1:5199/', reps: 4, slow: 0, tag: 'dev', headful: 0, w: 1600, h: 900, midshot: 0 };
for (let i = 0; i < argv.length; i += 2) {
  const k = argv[i].replace(/^--/, '');
  opt[k] = ['url', 'tag'].includes(k) ? argv[i + 1] : Number(argv[i + 1]);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { opt, startedAt: new Date().toISOString(), reps: [], pageErrors: [], version: null };
const log = (tag, v) => console.log(`[${tag}] ${JSON.stringify(v).slice(0, 1600)}`);

const browser = await launchEchoes({ gpu: true, headful: !!opt.headful, width: opt.w, height: opt.h, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
try {
  for (let rep = 1; rep <= opt.reps; rep++) {
    let res = null;
    for (let attempt = 1; attempt <= 3 && !res; attempt++) {
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: opt.w, height: opt.h, deviceScaleFactor: 1 });
        const errs = [];
        page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
        await page.evaluateOnNewDocument((slow) => {
          window.__gntKeys = [];
          window.addEventListener('keydown', (e) => window.__gntKeys.push({ code: e.code, ts: e.timeStamp }), true);
          if (!slow) return;
          const Real = window.Worker;
          window.__gntWorkers = [];
          window.Worker = function (url, o) {
            const w = new Real(url, o);
            if (!/thumb-worker/.test(String(url)) && !(o && /thumb/.test(o.name || ''))) return w;
            const born = performance.now();
            const rec = { url: String(url), born: Math.round(born), posts: [] };
            window.__gntWorkers.push(rec);
            const post = w.postMessage.bind(w);
            w.postMessage = (msg, tr) => {
              const wait = Math.max(0, born + slow - performance.now());
              rec.posts.push({ at: Math.round(performance.now()), wait: Math.round(wait) });
              if (wait === 0) return post(msg, tr);
              setTimeout(() => post(msg, tr), wait);
            };
            return w;
          };
          window.Worker.prototype = Real.prototype;
        }, opt.slow);
        await page.goto(opt.url + '?fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
        await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout: 180000 });
        out.version = await page.evaluate(() => window.__echoes.version);
        await sleep(1500);
        const t0 = Date.now();
        while (Date.now() - t0 < 60000) {
          const st = await page.evaluate(() => window.__echoes.app && window.__echoes.app.state);
          if (st === 'title') break;
          await page.keyboard.press('Space');
          await sleep(300);
        }
        await sleep(600);
        const key = async (k, ms = 50) => {
          await page.keyboard.down(k);
          await sleep(ms);
          await page.keyboard.up(k);
          await sleep(40);
        };
        const foc = () => page.evaluate(() => { const E = window.__echoes; let f = null; try { f = E.app.focus(); } catch (e) {} return { state: E.app.state, stack: E.app.stack().join('>'), focus: f && f.id }; });
        await key('Enter'); // New Game (fresh profile: focused)
        await page.waitForFunction(() => window.__echoes.app.state === 'playing' && window.__echoes.tick >= 120, { timeout: 90000 });
        await sleep(1500);
        await key('Escape');
        await sleep(400);
        for (let k = 0; k < 8; k++) { if ((await foc()).focus === 'pz-save') break; await key('ArrowDown'); await sleep(80); }
        await key('Enter');
        await sleep(500);
        const pre = await foc();
        // In-page frame poller (rAF + 10 ms timer), started just before the press.
        await page.evaluate(() => {
          const E = window.__echoes;
          const row = () => { const e = document.getElementById('sv-slot-manual-1'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; };
          const toasts = () => { try { return E.app.toasts().map((t) => t.text).join(' || '); } catch (e) { return ''; } };
          const P = (window.__gntPoll = { base: row() + '#' + toasts(), rows: [], frames: [], start: performance.now() });
          let last = '';
          const sample = (via) => {
            const t = performance.now();
            const listed = E.save.list().some((s) => s.id === 'manual-1');
            const th = E.save.thumb('manual-1');
            const sig = `${row()}#${toasts()}#${listed}#${!!(th && th.startsWith('data:image'))}#${E.app.stack().join('>')}`;
            if (sig !== last) { P.rows.push({ t: Math.round(t * 10) / 10, via, sig }); last = sig; }
          };
          const raf = () => { sample('raf'); if (performance.now() - P.start < 6000) requestAnimationFrame(raf); };
          requestAnimationFrame(raf);
          const tm = () => { sample('timer'); if (performance.now() - P.start < 6000) setTimeout(tm, 10); };
          tm();
        });
        const keysBefore = await page.evaluate(() => window.__gntKeys.length);
        await key('Enter', 40);
        if (opt.midshot && rep === 1) {
          // --midshot 1: what the player sees while the save is in flight
          await sleep(60);
          await page.screenshot({ path: join(root, 'captures', `gntfixM23-savelat-${opt.tag}-saving.png`) });
          await sleep(1600);
          await page.screenshot({ path: join(root, 'captures', `gntfixM23-savelat-${opt.tag}-saved.png`) });
        } else await sleep(350);
        await key('Enter', 40);
        await sleep(5200);
        const poll = await page.evaluate((kb) => {
          const P = window.__gntPoll;
          const ks = window.__gntKeys.slice(kb).filter((k) => k.code === 'Enter');
          return { base: P.base, rows: P.rows, keys: ks };
        }, keysBefore);
        const t0p = poll.keys[0] ? poll.keys[0].ts : null;
        const t1p = poll.keys[1] ? poll.keys[1].ts : null;
        const after = (pred, from = t0p) => { const r = poll.rows.find((x) => x.t >= from && pred(x.sig)); return r ? Math.round((r.t - t0p) * 10) / 10 : null; };
        const baseRow = poll.base.split('#')[0];
        const visualMs = after((s) => s.split('#')[0] !== baseRow || /Sav/.test(s.split('#')[1]));
        const writtenMs = after((s) => s.split('#')[2] === 'true');
        const toastMs = after((s) => /Saved to/.test(s.split('#')[1]));
        const thumbMs = after((s) => s.split('#')[3] === 'true');
        const confirmMs = t1p !== null ? after((s) => /confirm/.test(s.split('#')[4]), t1p) : null;
        const savingSeen = poll.rows.some((r) => /Saving/.test(r.sig.split('#')[0]));
        const lastThumb = await page.evaluate(() => { const t = window.__echoes.save.lastThumb(); return t ? { via: t.via, workerMs: t.workerMs, ms: t.ms, bytes: t.bytes } : null; });
        const debug = await page.evaluate(() => { const s = window.__echoes.save; return { warm: typeof s.thumbWarm === 'function' ? s.thumbWarm() : null, workers: window.__gntWorkers || null }; });
        // leave the menus, F5 in play
        for (let i = 0; i < 5; i++) { const f = await foc(); if (!f.stack) break; await key('Escape'); await sleep(300); }
        await sleep(600);
        await page.evaluate(() => {
          const E = window.__echoes;
          const P = (window.__gntPoll5 = { rows: [], start: performance.now() });
          let last = '';
          const sample = () => {
            const toasts = (() => { try { return E.app.toasts().map((t) => t.text).join(' || '); } catch (e) { return ''; } })();
            const listed = E.save.list().some((s) => s.id === 'quick');
            const th = E.save.thumb('quick');
            const sig = `${toasts}#${listed}#${!!(th && th.startsWith('data:image'))}`;
            if (sig !== last) { P.rows.push({ t: Math.round(performance.now() * 10) / 10, sig }); last = sig; }
            if (performance.now() - P.start < 5000) setTimeout(sample, 10);
          };
          sample();
        });
        const kb5 = await page.evaluate(() => window.__gntKeys.length);
        await key('F5', 40);
        await sleep(4500);
        const p5 = await page.evaluate((kb) => ({ rows: window.__gntPoll5.rows, keys: window.__gntKeys.slice(kb).filter((k) => k.code === 'F5') }), kb5);
        const f0 = p5.keys[0] ? p5.keys[0].ts : null;
        const a5 = (pred) => { const r = p5.rows.find((x) => x.t >= f0 && pred(x.sig)); return r ? Math.round((r.t - f0) * 10) / 10 : null; };
        const f5 = { toastMs: a5((s) => /Quicksav/.test(s.split('#')[0])), writtenMs: a5((s) => s.split('#')[1] === 'true'), thumbMs: a5((s) => s.split('#')[2] === 'true'), toasts: [...new Set(p5.rows.map((r) => r.sig.split('#')[0]).filter(Boolean))] };
        res = { rep, attempt, pre, visualMs, writtenMs, toastMs, thumbMs, confirmAfterSecondMs: confirmMs, savingSeen, lastThumb, debug, f5, pageErrors: errs, timeline: poll.rows.slice(0, 12).map((r) => ({ ms: Math.round((r.t - t0p) * 10) / 10, sig: r.sig.slice(0, 160) })) };
        out.pageErrors.push(...errs);
        await page.screenshot({ path: join(root, 'captures', `gntfixM23-savelat-${opt.tag}-rep${rep}.png`) });
      } catch (err) {
        log('retry', { rep, attempt, err: String(err && err.message).slice(0, 300) });
      } finally {
        await page.close().catch(() => {});
      }
    }
    out.reps.push(res);
    log('rep', res && { rep, visualMs: res.visualMs, writtenMs: res.writtenMs, toastMs: res.toastMs, thumbMs: res.thumbMs, confirm2: res.confirmAfterSecondMs, saving: res.savingSeen, via: res.lastThumb && res.lastThumb.via, f5: res.f5 && { toast: res.f5.toastMs, thumb: res.f5.thumbMs } });
  }
} finally {
  await browser.close();
}
out.endedAt = new Date().toISOString();
const ok = out.reps.filter(Boolean);
out.summary = {
  version: out.version,
  slowWorkerMs: opt.slow,
  reps: ok.length,
  writtenMs: ok.map((r) => r.writtenMs),
  visualMs: ok.map((r) => r.visualMs),
  thumbMs: ok.map((r) => r.thumbMs),
  secondPressConfirm: ok.map((r) => r.confirmAfterSecondMs),
  f5ToastMs: ok.map((r) => r.f5 && r.f5.toastMs),
  f5ThumbMs: ok.map((r) => r.f5 && r.f5.thumbMs),
  maxWrittenMs: Math.max(...ok.map((r) => r.writtenMs ?? 1e9)),
  maxVisualMs: Math.max(...ok.map((r) => r.visualMs ?? 1e9)),
  thumbsMissing: ok.filter((r) => r.thumbMs === null).length,
  pageErrors: out.pageErrors.length,
};
mkdirSync(join(root, 'captures'), { recursive: true });
const file = join(root, 'captures', `gntfixM23-savelat-${opt.tag}.json`);
writeFileSync(file, JSON.stringify(out, null, 1));
log('summary', out.summary);
console.log(`[DONE] -> ${file}`);
