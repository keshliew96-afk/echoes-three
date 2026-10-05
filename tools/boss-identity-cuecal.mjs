#!/usr/bin/env node
// Boss identity: calibrate the boss cues (src/audio/bosscues.js) with M3's
// measureCue hook — each recipe's design peak at unity (dBFS; the MAX of 3
// plays, as M3's own calibration does: noise recipes vary take to take)
// becomes its calDb, so every cue's loudest take peaks at its authored
// levelDb. Prints the table; --write rewrites the `@cal begin/end` block in
// cues.js; --verify re-measures (max of 3): every cue within 2 dB of levelDb
// (noise recipes vary up to ~1.6 dB take to take) and no SFX peak above the
// PLAN §3.5 -6 dBFS pre-bus ceiling.
//   node tools/boss-identity-cuecal.mjs [--write] [--verify]
import { readFileSync, writeFileSync } from 'node:fs';
import { openAudio, ev, sleep, BASE } from './gntM3-lib.mjs';

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const VERIFY = argv.includes('--verify');
const { browser, page, errors } = await openAudio(`${BASE}?menu=0&seed=7`);
try {
  await sleep(3500);
  // One evaluate per take (gntM3-lib's ev() guards each at 90 s).
  const ids = await ev(page, () => window.__echoes.app.service('audio').debug.cues().filter((c) => c.startsWith('bx_')));
  const rows = [];
  for (const id of ids) {
    let best = null;
    for (let i = 0; i < 3; i++) {
      const m = await ev(page, (id) => window.__echoes.app.service('audio').debug.measureCue(id), id);
      if (m && (!best || m.measuredPeakDb > best.measuredPeakDb)) best = m;
    }
    rows.push(best);
  }
  const file = 'src/audio/bosscues.js';
  const src = readFileSync(file, 'utf8');
  const { BOSS_CUE_LEVELS: levels } = await import('../src/audio/bosscues.js');
  const table = rows.map((r) => ({ cue: r.cue, bus: r.bus, levelDb: levels[r.cue], measuredPeakDb: r.measuredPeakDb, designPeakDb: r.designPeakDb, offByDb: Math.round((r.measuredPeakDb - levels[r.cue]) * 10) / 10 }));
  console.log(JSON.stringify({ table, errors: errors.slice(0, 5) }, null, 1));
  if (WRITE) {
    const body = rows.map((r) => `  ${r.cue}: ${r.designPeakDb},`).join('\n');
    const next = src.replace(/(\/\/ @cal begin\n)[\s\S]*?(\n\s*\/\/ @cal end)/, `$1${body}$2`);
    writeFileSync(file, next);
    console.log(`wrote ${rows.length} calDb values to ${file}`);
  }
  if (VERIFY) {
    const bad = table.filter((t) => !(Math.abs(t.offByDb) <= 2.0) || (t.bus === 'sfx' && t.measuredPeakDb > -6));
    const maxPeak = Math.max(...table.map((t) => t.measuredPeakDb));
    console.log(bad.length ? `VERIFY FAIL: ${bad.map((b) => `${b.cue} ${b.offByDb} (peak ${b.measuredPeakDb})`).join(', ')}` : `VERIFY PASS: ${table.length} cues within 2 dB of levelDb (max of 3), loudest peak ${maxPeak} dBFS: ${table.map((t) => `${t.cue} ${t.offByDb}`).join(', ')}`);
    process.exitCode = bad.length ? 1 : 0;
  }
} finally {
  await browser.close();
}
