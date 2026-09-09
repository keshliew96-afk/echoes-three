// certD2 retry driver: runs a calibrated capture until the in-session camp calibration
// shows a quiet machine (CALIB steady fps >= threshold) or attempts run out.
import { execFileSync } from 'child_process';
import { readFileSync, copyFileSync, existsSync } from 'fs';
const [name, actions, thrArg, triesArg] = process.argv.slice(2);
const thr = Number(thrArg || 70), tries = Number(triesArg || 4);
let best = null;
for (let i = 1; i <= tries; i++) {
  const out = `${name}-a${i}`;
  try {
    execFileSync(process.execPath, ['tools/cert-capture.mjs', 'shot', out,
      '--url', 'http://127.0.0.1:5199/?seed=999', '--settle', '3000',
      '--actions', actions, '--timeout', '180000'], { stdio: 'pipe' });
  } catch (e) { console.log(`attempt ${i}: capture exit ${e.status}`); }
  const log = `captures/${out}.console.txt`;
  if (!existsSync(log)) { console.log(`attempt ${i}: no log`); continue; }
  const txt = readFileSync(log, 'latin1');
  const evals = [...txt.matchAll(/^\[EVAL\] (.*)$/gm)].map(m => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean);
  const calib = evals.find(e => e && e.tag === 'CALIB-camp-idle');
  const main = evals.find(e => e && e.tag && e.tag !== 'CALIB-camp-idle');
  const c = calib && calib.STEADY ? calib.STEADY.fps : null;
  const m = main && main.STEADY ? main.STEADY.fps : null;
  console.log(`attempt ${i}: calib ${c} fps -> ${main ? main.tag : '?'} steady ${m} fps, gaps>100 ${main ? main.steadyGapsOver100.length : '?'}, >250 ${main ? main.gapsOver250 : '?'}`);
  if (c !== null && (!best || c > best.c)) best = { i, c, m, out };
  if (c !== null && c >= thr) { console.log(`ACCEPTED attempt ${i} (calib ${c} >= ${thr})`); break; }
}
if (best) console.log(`BEST: attempt ${best.i} calib ${best.c} main ${best.m} -> captures/${best.out}.*`);
