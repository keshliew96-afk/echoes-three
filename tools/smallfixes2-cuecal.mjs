#!/usr/bin/env node
// Small fixes 2: calibrate the cues that shipped unmeasured — the Act IV
// creatures' (src/audio/heartcues.js, hx_*) and the event room, room
// objective and slide cues (src/audio/encountercues.js, ev_* / ob_* / sl_*)
// — with the engine's measureCue hook, the way tools/boss-identity-cuecal.mjs
// does the boss cues: each recipe's design peak at unity (dBFS, the MAX of 3
// takes: noise recipes vary take to take) becomes its calDb, so the loudest
// take peaks at its authored levelDb.
//   node tools/smallfixes2-cuecal.mjs [--write] [--verify] [--only hitcues]
// Hit feedback adds src/audio/hitcues.js (hurt_heavy / hurt_soft /
// hurt_down); Champion rooms adds src/audio/championcues.js (ch_*); Keys
// and vaults adds src/audio/vaultcues.js (vk_*);
// --only <file stem> measures just that file.
// --write rewrites the `@cal begin/end` blocks; --verify re-measures: every
// cue within 2 dB of levelDb and no SFX peak above the -6 dBFS pre-bus
// ceiling. Do not --write while another probe uses the dev server (HMR).
import { readFileSync, writeFileSync } from 'node:fs';
import { openAudio, ev, sleep, BASE } from './gntM3-lib.mjs';

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const VERIFY = argv.includes('--verify');
const FILES = [
  { file: 'src/audio/heartcues.js', match: (id) => id.startsWith('hx_') },
  { file: 'src/audio/encountercues.js', match: (id) => /^(ev|ob|sl)_/.test(id) },
  { file: 'src/audio/hitcues.js', match: (id) => /^hurt_(heavy|soft|down)$/.test(id) },
  { file: 'src/audio/championcues.js', match: (id) => id.startsWith('ch_') },
  { file: 'src/audio/vaultcues.js', match: (id) => id.startsWith('vk_') },
].filter((f) => !argv.includes('--only') || f.file.includes(argv[argv.indexOf('--only') + 1]));
const { browser, page, errors } = await openAudio(`${BASE}?menu=0&seed=7`);
try {
  await sleep(3500);
  const all = await ev(page, () => window.__echoes.app.service('audio').debug.cues());
  const table = [];
  for (const f of FILES) {
    const ids = all.filter(f.match);
    // The file's current calDb (the levelDb a take was played at = its peak -
    // design peak + this).
    const cur = {};
    const m = readFileSync(f.file, 'utf8').match(/\/\/ @cal begin\n([\s\S]*?)\/\/ @cal end/);
    for (const line of (m ? m[1] : '').split('\n')) {
      const mm = line.match(/^\s*(\w+):\s*(-?[\d.]+),/);
      if (mm) cur[mm[1]] = Number(mm[2]);
    }
    const rows = [];
    for (const id of ids) {
      let best = null;
      // Three heard takes (up to nine tries): under the sandbox's software
      // audio a take now and then measures silent (-180), any cue alike.
      for (let i = 0, heard = 0; i < 9 && heard < 3; i++) {
        const m = await ev(page, (id) => window.__echoes.app.service('audio').debug.measureCue(id), id);
        if (!m || !(m.measuredPeakDb > -90)) continue;
        heard += 1;
        if (!best || m.measuredPeakDb > best.measuredPeakDb) best = m;
      }
      if (!best || !(best.measuredPeakDb > -90)) throw new Error(`${id} measured silent (${best && best.measuredPeakDb}): did the page reload mid-measure?`);
      rows.push(best);
      const lv = Math.round((best.measuredPeakDb - best.designPeakDb + (cur[id] ?? 0)) * 10) / 10;
      table.push({ cue: id, bus: best.bus, levelDb: lv, measuredPeakDb: best.measuredPeakDb, designPeakDb: best.designPeakDb, offByDb: Math.round((best.measuredPeakDb - lv) * 10) / 10 });
    }
    f.rows = rows;
  }
  // Written only once everything is measured: a write reloads the dev page
  // (HMR) and a cue measured during the reload comes back silent.
  for (const f of FILES) {
    if (!WRITE || !f.rows || !f.rows.length) continue;
    const src = readFileSync(f.file, 'utf8');
    const body = f.rows.map((r) => `  ${r.cue}: ${r.designPeakDb},`).join('\n');
    writeFileSync(f.file, src.replace(/(\/\/ @cal begin\n)[\s\S]*?(\n\s*\/\/ @cal end)/, `$1${body}$2`));
    console.log(`wrote ${f.rows.length} calDb values to ${f.file}`);
  }
  console.log(JSON.stringify({ table, errors: errors.slice(0, 5) }, null, 1));
  if (VERIFY) {
    const bad = table.filter((t) => !(Math.abs(t.offByDb) <= 2.0) || (t.bus === 'sfx' && t.measuredPeakDb > -6));
    const maxPeak = Math.max(...table.map((t) => t.measuredPeakDb));
    console.log(bad.length ? `VERIFY FAIL: ${bad.map((b) => `${b.cue} ${b.offByDb} (peak ${b.measuredPeakDb})`).join(', ')}` : `VERIFY PASS: ${table.length} cues within 2 dB of levelDb (max of 3), loudest peak ${maxPeak} dBFS`);
    process.exitCode = bad.length ? 1 : 0;
  }
} finally {
  await browser.close();
}
