// gntM3 calibration (M3 builder): measures, at unity bus gains,
//   - every cue's design peak (non-spatial, exact pitch, max of 3 plays)
//   - every music state's RMS pre-bus (music tap with music = master = 1)
//   - every ambient bed's RMS pre-bus
// and writes CUE_CAL (src/audio/cues.js), MUSIC_TRIM (src/audio/music.js) and
// BED_TRIM (src/audio/ambient.js) between their "@cal/@trim begin/end"
// markers so the engine lands each at its PLAN §3.5 gain-staging target:
// cue peak = levelDb, music -20 dBFS RMS into the glue compressor then
// -13.5 dBFS RMS pre-bus (--only post), beds -18 dBFS RMS (decision D18).
//   node tools/gntM3-calibrate.mjs [--only cues|music|post|beds] [--dry]
import fs from 'node:fs';
import { openAudio, ev, sleep, out, BASE } from './gntM3-lib.mjs';

const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
const dry = argv.includes('--dry');
// No ?fresh=1: an HMR reload mid-run would wipe the unity levels (the
// browser profile is fresh anyway). setup() is re-applied before every
// measurement for the same reason.
const url = `${BASE}?menu=0&seed=7`;
const { browser, page, errors } = await openAudio(url);
await sleep(3000);

async function setup() {
  return ev(page, () => {
    const S = window.__echoes.settings;
    for (const ch of ['master', 'music', 'sfx', 'ambient', 'ui']) {
      S.set(`audio.${ch}.mode`, 'log');
      S.set(`audio.${ch}.level`, 1);
      S.set(`audio.${ch}.muted`, false);
    }
    S.set('audio.muteOnBlur', false);
    return true;
  });
}

async function measureCue(cue) {
  let best = -999;
  let bus = null;
  let levelDb = null;
  for (let i = 0; i < 3; i++) {
    await setup();
    const r = await ev(
      page,
      async (cue) => {
        const A = window.__echoes.audio;
        A.quiet();
        await new Promise((r) => setTimeout(r, 350));
        A.meterReset();
        A.play(cue, { exactPitch: true, emit: false });
        const log = A.cueLog(1)[0];
        await new Promise((r) => setTimeout(r, 1100));
        const bus = log ? log.bus : 'sfx';
        const m = A.meter(bus);
        const g = A.busGain(bus);
        const unity = Math.abs(g.effectiveDb) < 0.05;
        return { bus, peak: m && unity ? m.peakDb : null, levelDb: log ? log.gainDb : null, dropped: log && log.dropped, unity };
      },
      cue
    );
    if (r.peak !== null && r.peak > best) best = r.peak;
    bus = r.bus;
    levelDb = r.levelDb;
  }
  return { cue, bus, measuredPeakDb: best, levelDb };
}

const cal = {};
const musicTrim = {};
const bedTrim = {};

// Current tables (so a re-run converges instead of double-counting).
const read = (f) => fs.readFileSync(new URL(`../src/audio/${f}`, import.meta.url), 'utf8');
function parseTable(src, tag) {
  const m = src.match(new RegExp(`// @${tag} begin\\r?\\n([\\s\\S]*?)  // @${tag} end`));
  const t = {};
  if (!m) return t;
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^\s*'?([\w:]+)'?:\s*(-?[\d.]+),/);
    if (mm) t[mm[1]] = Number(mm[2]);
  }
  return t;
}
const curCal = parseTable(read('cues.js'), 'cal');
const curMusic = parseTable(read('music.js'), 'trim');
const curBed = parseTable(read('ambient.js'), 'trim');
const curPost = parseTable(read('music.js'), 'post').postDb ?? 0;
const MUSIC_IN_DB = -20;
const MUSIC_TARGET_DB = -13.5;
const BED_TARGET_DB = -18;
const postOut = {};

await setup();
const report = { cues: [], music: [], beds: [] };

if (!only || only === 'cues') {
  const cues = await ev(page, () => window.__echoes.audio.cues());
  for (const c of cues) {
    const r = await measureCue(c);
    process.stderr.write(`cue ${c} ${r.measuredPeakDb}\n`);
    if (r.measuredPeakDb <= -998) continue;
    // measured = design + (levelDb - cal_current)  =>  design = measured - levelDb + cal_current
    const design = r.measuredPeakDb - r.levelDb + (curCal[c] ?? 0);
    cal[c] = Math.round(design * 10) / 10;
    report.cues.push({ ...r, designPeakDb: cal[c] });
  }
}

async function measureMusic(state, theme, intensity, secs, comp = false) {
  await setup();
  return ev(
    page,
    async (state, theme, intensity, secs, comp) => {
      const A = window.__echoes.audio;
      A.musicComp(comp);
      A.setMusic(state, { theme, bed: null, crossfadeSec: 0.1, intensity });
      await new Promise((r) => setTimeout(r, 1200));
      A.meterReset();
      await new Promise((r) => setTimeout(r, secs * 1000));
      const m = A.meter('music');
      if (Math.abs(A.busGain('music').effectiveDb) > 0.05) return { rmsDb: null, notUnity: true };
      return { rmsDb: m.rmsDb, peakDb: m.peakDb, p10: m.p10Rms400Db, low: m.longestBelowMinus50Ms, centroid: m.centroidHz, bpm: A.music().bpm };
    },
    state,
    theme,
    intensity,
    secs,
    comp
  );
}

if (!only || only === 'music') {
  const plan = [
    ['menu', 'wood', 0],
    ['camp', 'wood', 0],
    ['lobby', 'wood', 0],
    ['victory', 'wood', 0],
    ['defeat', 'wood', 0],
    ['combat', 'wood', 0.6],
    ['combat', 'mill', 0.6],
    ['combat', 'barrow', 0.6],
    ['boss', 'wood', 0.7],
    ['boss', 'mill', 0.7],
    ['boss', 'barrow', 0.7],
  ];
  for (const [st, th, inten] of plan) {
    const secs = st === 'victory' || st === 'defeat' ? 3 : 7;
    process.stderr.write(`music ${st}:${th}
`);
    let r = await measureMusic(st, th, inten, secs, false);
    if (r.rmsDb === null) r = await measureMusic(st, th, inten, secs, false);
    if (r.rmsDb === null) continue;
    const key = st === 'combat' || st === 'boss' ? `${st}:${th}` : st;
    const cur = curMusic[key] ?? 0;
    musicTrim[key] = Math.round((cur + (MUSIC_IN_DB - r.rmsDb)) * 10) / 10;
    report.music.push({ key, stage: 'raw', ...r, trim: musicTrim[key] });
  }
}
// Stage B (run after the stage-A trims are loaded): --only post measures
// every state through the glue compressor and sets the shared post gain.
if (only === 'post') {
  const outs = [];
  for (const [st, th, inten] of [['menu', 'wood', 0], ['camp', 'wood', 0], ['combat', 'wood', 0.6], ['combat', 'mill', 0.6], ['combat', 'barrow', 0.6], ['boss', 'wood', 0.7], ['boss', 'barrow', 0.7], ['victory', 'wood', 0], ['defeat', 'wood', 0]]) {
    process.stderr.write(`post ${st}:${th}
`);
    const r = await measureMusic(st, th, inten, st === 'victory' || st === 'defeat' ? 3 : 7, true);
    if (r.rmsDb === null) continue;
    outs.push(r.rmsDb);
    report.music.push({ key: `${st}:${th}`, stage: 'compressed', ...r });
  }
  const mean = 10 * Math.log10(outs.reduce((a, v) => a + Math.pow(10, v / 10), 0) / outs.length);
  postOut.postDb = Math.round((curPost + (MUSIC_TARGET_DB - mean)) * 10) / 10;
  report.post = { meanRmsDb: Math.round(mean * 100) / 100, postDb: postOut.postDb };
}

if (!only || only === 'beds') {
  for (const bed of ['camp', 'wood', 'mill', 'barrow']) {
    await setup();
    const r = await ev(
      page,
      async (bed) => {
        const A = window.__echoes.audio;
        A.setMusic('silence', { bed, crossfadeSec: 0.1 });
        await new Promise((r) => setTimeout(r, 3000));
        A.meterReset();
        await new Promise((r) => setTimeout(r, 7000));
        const m = A.meter('ambient');
        if (Math.abs(A.busGain('ambient').effectiveDb) > 0.05) return { rmsDb: null, notUnity: true };
        return { rmsDb: m.rmsDb, peakDb: m.peakDb };
      },
      bed
    );
    if (r.rmsDb === null) continue;
    const cur = curBed[bed] ?? 0;
    bedTrim[bed] = Math.round((cur + (BED_TARGET_DB - r.rmsDb)) * 10) / 10;
    report.beds.push({ bed, ...r, trim: bedTrim[bed] });
  }
}

function writeTable(file, tag, table, quote) {
  const p = new URL(`../src/audio/${file}`, import.meta.url);
  const src = fs.readFileSync(p, 'utf8');
  const merged = { ...parseTable(src, tag), ...table };
  const lines = Object.keys(merged)
    .sort()
    .map((k) => `  ${quote || /[^\w]/.test(k) ? `'${k}'` : k}: ${merged[k]},`)
    .join('\n');
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const next = src.replace(new RegExp(`(// @${tag} begin\\r?\\n)[\\s\\S]*?(  // @${tag} end)`), `$1${lines.split('\n').join(eol)}${eol}$2`);
  if (!dry) fs.writeFileSync(p, next);
}
if (Object.keys(cal).length) writeTable('cues.js', 'cal', cal);
if (Object.keys(musicTrim).length) writeTable('music.js', 'trim', musicTrim, true);
if (Object.keys(bedTrim).length) writeTable('ambient.js', 'trim', bedTrim);
if (Object.keys(postOut).length) writeTable('music.js', 'post', postOut);

fs.writeFileSync(new URL('../captures/gntM3-calibrate.json', import.meta.url), JSON.stringify({ dry, pageErrors: errors.length, ...report }, null, 1));
out({ dry, pageErrors: errors.length, cues: report.cues.length, music: report.music.length, beds: report.beds.length });
await browser.close();
