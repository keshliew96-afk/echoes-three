// gntfixCAMPAIGN6 — the audio meters on a running build after the history ring change (fix-CAMPAIGN-r6):
// boot into camp with autoplay, arm the meters, play a few seconds, read __echoes.audio.meters() / history();
// pass = every tap files windows (windows100 grows), history(n) returns n [rmsDb, peakDb] pairs, the master
// tap's levels are finite, 0 page errors.
// usage: node tools/gntfixCAMPAIGN6-meterlive.mjs [--base URL]
import { launch, open, sleep, writeJson, ARGS } from './gntfixCAMPAIGN6-lib.mjs';
const base = ARGS.base || 'http://127.0.0.1:4380/';
const browser = await launch({ autoplay: true });
const R = { base, checks: [] };
const check = (n, ok, d) => { R.checks.push({ n, ok: !!ok, d }); console.log(ok ? 'PASS' : 'FAIL', n, JSON.stringify(d).slice(0, 300)); };
try {
  const { page, errors } = await open(browser, base + '?menu=0&seed=7&fresh=1');
  await page.waitForFunction(() => window.__echoes.tick > 240, { timeout: 120000 });
  await page.evaluate(() => window.__echoes.audio.meters());
  await page.keyboard.down('KeyW'); await sleep(1500); await page.keyboard.up('KeyW');
  await sleep(2500);
  const a = await page.evaluate(() => { const A = window.__echoes.audio; const m = A.meters(); return { w: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.windows100])), master: m.master, h: A.history('master', 5), h0: A.history('master', 0).length }; });
  await sleep(2000);
  const b = await page.evaluate(() => { const m = window.__echoes.audio.meters(); return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.windows100])); });
  R.a = a; R.b = b;
  check('every tap files 100 ms windows (count grows)', Object.keys(a.w).length >= 6 && Object.keys(a.w).every((k) => b[k] > a.w[k]), { a: a.w, b });
  check('history(5) = 5 [rmsDb, peakDb] pairs; history(0) = all windows', a.h.length === 5 && a.h.every((p) => p.length === 2 && p.every(Number.isFinite)) && a.h0 === a.w.master, { h: a.h, h0: a.h0, windows: a.w.master });
  check('master stats are numbers', ['rmsDb', 'peakDb', 'shortRmsDb', 'medianRms400Db', 'longestBelowMinus50Ms'].every((k) => typeof a.master[k] === 'number'), a.master);
  check('0 page errors', errors.length === 0, errors.slice(0, 3));
} catch (e) { R.fatal = String(e && e.stack || e).slice(0, 800); console.error(R.fatal); }
finally { writeJson('gntfixCAMPAIGN6-meterlive', R); await browser.close(); }
const f = R.checks.filter((c) => !c.ok).length;
console.log(R.fatal ? 'FATAL' : f ? `FAIL ${f}` : `PASS ${R.checks.length}/${R.checks.length}`);
