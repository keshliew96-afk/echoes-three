// gntM3 gate probes for docs/gauntlet/PLAN.md §7 M3 (G3.1 - G3.10).
//   node tools/gntM3-gates.mjs <gate> [--url U]
//   gates: curves | decouple | spatial | clip | balance | music | autoplay | persist | tab | cost | coverage | all
// Each gate opens its own browser (audio profile: --autoplay-policy=
// no-user-gesture-required, except `autoplay`, which runs without it and
// drives trusted input), measures through __echoes.audio (meter / testTone /
// busGain / cueLog) and writes captures/gntM3-gate-<gate>.json.
import fs from 'node:fs';
import { launchEchoes } from './gnt-arch-browser.mjs';
import { openAudio, ev, sleep, summarizeErrors, out, BASE } from './gntM3-lib.mjs';

const argv = process.argv.slice(2);
const gate = argv[0] || 'all';
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const MENU0 = `${BASE}?menu=0&seed=7`;
const LOG_TABLE = { 0: -Infinity, 0.25: -20, 0.5: -10, 0.75: -4.15, 1: 0 };
const LIN_TABLE = { 0: -Infinity, 0.25: -12.04, 0.5: -6.02, 0.75: -2.5, 1: 0 };
const save = (name, obj) => {
  fs.writeFileSync(new URL(`../captures/gntM3-gate-${name}.json`, import.meta.url), JSON.stringify(obj, null, 1));
  return obj;
};

async function unity(page, extra = {}) {
  return ev(
    page,
    (extra) => {
      const S = window.__echoes.settings;
      for (const ch of ['master', 'music', 'sfx', 'ambient', 'ui']) {
        S.set(`audio.${ch}.mode`, 'log');
        S.set(`audio.${ch}.level`, 1);
        S.set(`audio.${ch}.muted`, false);
      }
      S.set('audio.muteOnBlur', false);
      for (const [k, v] of Object.entries(extra)) S.set(k, v);
      return true;
    },
    extra
  );
}

// Steady-state tone RMS on one or more taps: tone of `ms`, meters reset
// 150 ms in, read 150 ms before the end.
async function toneRms(page, bus, taps, { dbfs = -18, ms = 900, freq = 440, x, z } = {}) {
  return ev(
    page,
    async (bus, taps, dbfs, ms, freq, x, z) => {
      const A = window.__echoes.audio;
      // An HMR reload (other builders edit src/**) restarts the music: make
      // sure the bed and score are silent before every tone.
      if (A.music().state !== 'silence' || (A.ambient() && A.ambient().bed)) {
        A.quiet();
        await new Promise((r) => setTimeout(r, 2800));
      }
      const t = A.testTone(bus, { dbfs, ms, freq, x, z });
      await new Promise((r) => setTimeout(r, 150));
      A.meterReset();
      await new Promise((r) => setTimeout(r, ms - 300));
      const o = { expected: t.expectedTapRmsDb };
      for (const tp of taps) {
        const m = A.meter(tp);
        o[tp] = { rms: m.rmsDb, l: m.lRmsDb, r: m.rRmsDb };
      }
      await new Promise((r) => setTimeout(r, 250));
      return o;
    },
    bus,
    taps,
    dbfs,
    ms,
    freq,
    x ?? null,
    z ?? null
  );
}

const close = (a, b, tol) => (a === -999 || a <= -90 ? b === -Infinity || b <= -90 : Math.abs(a - b) <= tol);

// ------------------------------------------------------------------ G3.1 --
async function gCurves() {
  const { browser, page, errors, consoleLines } = await openAudio(MENU0);
  await sleep(2500);
  await ev(page, () => window.__echoes.audio.quiet());
  const rows = [];
  let fails = 0;
  for (const ch of ['master', 'music', 'sfx']) {
    for (const mode of ['log', 'linear']) {
      for (const s of [0, 0.25, 0.5, 0.75, 1]) {
        await unity(page);
        await ev(
          page,
          (ch, mode, s) => {
            const S = window.__echoes.settings;
            S.set(`audio.${ch}.mode`, mode);
            S.set(`audio.${ch}.level`, s);
            window.__echoes.audio.quiet();
            return true;
          },
          ch,
          mode,
          s
        );
        await sleep(400);
        const g = await ev(page, (ch) => window.__echoes.audio.busGain(ch), ch);
        const want = (mode === 'log' ? LOG_TABLE : LIN_TABLE)[s];
        const paramOk = close(g.db, want, 0.1);
        // Tone: channel under test (master -> through the sfx bus).
        const bus = ch === 'master' ? 'sfx' : ch;
        const tr = await toneRms(page, bus, [bus, 'master']);
        const wantTap = want === -Infinity ? -Infinity : -18 + want;
        const tapOk = close(tr[bus].rms, wantTap, 0.5);
        const masterTapOk = close(tr.master.rms, wantTap, 0.5);
        if (!paramOk || !tapOk || !masterTapOk) fails += 1;
        rows.push({ ch, mode, s, paramDb: g.db, wantDb: Number.isFinite(want) ? want : '-inf', paramOk, tapRms: tr[bus].rms, masterTapRms: tr.master.rms, wantTap: Number.isFinite(wantTap) ? Math.round(wantTap * 100) / 100 : '-inf', tapOk, masterTapOk });
      }
    }
  }
  const res = save('curves', { gate: 'G3.1', pass: fails === 0, fails, rows, ...summarizeErrors(errors, consoleLines) });
  await browser.close();
  return res;
}

// ------------------------------------------------------------------ G3.2 --
async function gDecouple() {
  const { browser, page, errors, consoleLines } = await openAudio(MENU0);
  await sleep(2500);
  await ev(page, () => window.__echoes.audio.quiet());
  await unity(page);
  await sleep(300);
  const res = {};
  // SFX tap while Music goes 100 -> 0.
  const a1 = await toneRms(page, 'sfx', ['sfx']);
  await ev(page, () => window.__echoes.settings.set('audio.music.level', 0));
  await sleep(400);
  const a2 = await toneRms(page, 'sfx', ['sfx']);
  res.sfxWhileMusic100to0 = { before: a1.sfx.rms, after: a2.sfx.rms, delta: Math.round((a2.sfx.rms - a1.sfx.rms) * 100) / 100 };
  // Music tap while SFX goes 100 -> 0.
  await unity(page);
  await sleep(300);
  const b1 = await toneRms(page, 'music', ['music']);
  await ev(page, () => window.__echoes.settings.set('audio.sfx.level', 0));
  await sleep(400);
  const b2 = await toneRms(page, 'music', ['music']);
  res.musicWhileSfx100to0 = { before: b1.music.rms, after: b2.music.rms, delta: Math.round((b2.music.rms - b1.music.rms) * 100) / 100 };
  // Master 1.0 -> 0.5 (log, -10 dB): every tap moves the same.
  await unity(page);
  await sleep(300);
  const taps = ['music', 'sfx', 'ambient', 'ui', 'master'];
  const both = async () =>
    ev(page, async () => {
      const A = window.__echoes.audio;
      A.testTone('music', { freq: 220, dbfs: -24, ms: 900 });
      A.testTone('sfx', { freq: 440, dbfs: -24, ms: 900 });
      A.testTone('ambient', { freq: 880, dbfs: -24, ms: 900 });
      A.testTone('ui', { freq: 1760, dbfs: -24, ms: 900 });
      await new Promise((r) => setTimeout(r, 150));
      A.meterReset();
      await new Promise((r) => setTimeout(r, 600));
      const o = {};
      for (const t of ['music', 'sfx', 'ambient', 'ui', 'master']) o[t] = A.meter(t).rmsDb;
      await new Promise((r) => setTimeout(r, 250));
      return o;
    });
  const c1 = await both();
  await ev(page, () => window.__echoes.settings.set('audio.master.level', 0.5));
  await sleep(400);
  const c2 = await both();
  const deltas = Object.fromEntries(taps.map((t) => [t, Math.round((c2[t] - c1[t]) * 100) / 100]));
  const ds = Object.values(deltas);
  res.master100to50 = { before: c1, after: c2, deltas, spread: Math.round((Math.max(...ds) - Math.min(...ds)) * 100) / 100 };
  const pass = Math.abs(res.sfxWhileMusic100to0.delta) <= 0.1 && Math.abs(res.musicWhileSfx100to0.delta) <= 0.1 && res.master100to50.spread <= 0.4 && ds.every((d) => Math.abs(d - -10) <= 0.2);
  const r = save('decouple', { gate: 'G3.2', pass, ...res, ...summarizeErrors(errors, consoleLines) });
  await browser.close();
  return r;
}

// ------------------------------------------------------------------ G3.6 --
async function gSpatial() {
  const { browser, page, errors, consoleLines } = await openAudio(MENU0);
  await sleep(3000);
  await ev(page, () => window.__echoes.audio.quiet());
  await unity(page);
  await sleep(300);
  const L = await ev(page, () => window.__echoes.audio.listener());
  const at = async (dx, dz = 0) => {
    const r = await toneRms(page, 'sfx', ['sfx'], { x: L.x + dx, z: L.z + dz });
    return { dx, dz, l: r.sfx.l, r: r.sfx.r, rms: r.sfx.rms };
  };
  const p6 = await at(6);
  const m6 = await at(-6);
  const c0 = await at(0);
  const d3 = await at(3);
  const d12 = await at(12);
  const z3 = await at(0, 3);
  const z12 = await at(0, 12);
  const L2 = await ev(page, () => window.__echoes.audio.listener());
  const res = {
    listener: L,
    listenerAfter: L2,
    plus6: { ...p6, rMinusL: Math.round((p6.r - p6.l) * 100) / 100 },
    minus6: { ...m6, lMinusR: Math.round((m6.l - m6.r) * 100) / 100 },
    centre: { ...c0, absLR: Math.round(Math.abs(c0.l - c0.r) * 100) / 100 },
    x3vs12: { d3: d3.rms, d12: d12.rms, quieterDb: Math.round((d3.rms - d12.rms) * 100) / 100 },
    z3vs12: { d3: z3.rms, d12: z12.rms, quieterDb: Math.round((z3.rms - z12.rms) * 100) / 100 },
    model: await ev(page, () => window.__echoes.audio.spatialModel()),
  };
  res.pass = res.plus6.rMinusL >= 6 && res.minus6.lMinusR >= 6 && res.centre.absLR <= 1 && res.x3vs12.quieterDb >= 6 && res.z3vs12.quieterDb >= 6;
  const r = save('spatial', { gate: 'G3.6', ...res, ...summarizeErrors(errors, consoleLines) });
  await browser.close();
  return r;
}

// Drive a live run to the boss room with real combat (mouse held = basic
// attack aimed at the boss, allies fight) and return the page.
async function toBoss(page, { adds = 6 } = {}) {
  await ev(page, () => {
    window.__echoes.cmd('startRun');
    return true;
  });
  await sleep(2500);
  await ev(page, () => window.__echoes.cmd('skipToRoom', 8));
  await page.waitForFunction(() => {
    const r = window.__echoes.state().run;
    return r && r.room === 8 && r.phase === 'combat' && r.boss && r.boss.hp > 0;
  }, { timeout: 30000 });
  await sleep(1500);
  return true;
}

// ------------------------------------------------------------------ G3.3 --
async function gClip() {
  const { browser, page, errors, consoleLines } = await openAudio(MENU0, { gpu: true });
  await sleep(3000);
  await unity(page);
  await toBoss(page);
  await ev(page, () => {
    window.__echoes.audio.meterReset();
    window.__echoes.audio.costReset();
    return true;
  });
  // Hold the basic attack toward the screen centre (the boss arena) and push
  // the Stag through its three add phases, topping up with extra adds so at
  // least 6 hostiles fight at once.
  await page.mouse.move(800, 380);
  await page.mouse.down();
  const samples = [];
  for (const [frac, extra] of [[0.72, 2], [0.45, 2], [0.2, 2]]) {
    await ev(page, (f) => window.__echoes.cmd('bossHp', f), frac);
    await sleep(600);
    await ev(
      page,
      (n) => {
        const p = window.__echoes.state().party[0];
        for (let i = 0; i < n; i++) window.__echoes.cmd('spawn', i % 2 ? 'boar' : 'mantis', p.x + 5 - i * 2, p.z - 4);
        return true;
      },
      extra
    );
    for (let k = 0; k < 6; k++) {
      await sleep(1000);
      samples.push(
        await ev(page, () => {
          const s = window.__echoes.state();
          const hostiles = (s.entities ? 0 : 0) + window.__echoes.state().party.length;
          void hostiles;
          const E = window.__echoes;
          return { t: E.tick, hostiles: E.state().room ? E.state().room.alive ?? null : null, voices: E.audio.voices().active, red: E.audio.limiter().reductionDb };
        })
      );
    }
  }
  await page.mouse.up();
  const hostileCount = await ev(page, () => {
    const all = window.__echoes.state();
    return all.run && all.run.boss ? all.run.boss : null;
  });
  const m = await ev(page, () => {
    const A = window.__echoes.audio;
    return { prelimit: A.meter('prelimit'), master: A.meter('master'), sfx: A.meter('sfx'), limiter: A.limiter(), voices: A.voices(), cost: A.cost() };
  });
  const maxHostiles = await ev(page, () => window.__echoes.audio.cueLog(400).filter((e) => e.cue === 'horn').length);
  const res = {
    gate: 'G3.3',
    sliders: 'all 100 %',
    seconds: m.prelimit.seconds,
    prelimitOverMinus1Pct: m.prelimit.overMinus1Pct,
    prelimitPeakDb: m.prelimit.peakDb,
    limiter: m.limiter,
    masterPeakDb: m.master.peakDb,
    masterRmsDb: m.master.rmsDb,
    sfxPeakDb: m.sfx.peakDb,
    voices: m.voices,
    cost: m.cost,
    hornCues: maxHostiles,
    boss: hostileCount,
    samples,
  };
  res.pass = res.prelimitOverMinus1Pct <= 0.1 && m.limiter.pctWindowsUnder6dB >= 95 && m.limiter.excursionsOver10dB === 0 && m.master.peakDb < 0;
  const r = save('clip', { ...res, ...summarizeErrors(errors, consoleLines) });
  await browser.close();
  return r;
}

// ------------------------------------------------------------------ G3.4 --
async function gBalance() {
  const { browser, page, errors, consoleLines } = await openAudio(MENU0, { gpu: true });
  await sleep(3000);
  await ev(page, () => {
    window.__echoes.settings.reset('audio');
    window.__echoes.settings.set('audio.muteOnBlur', false);
    return true;
  });
  await ev(page, () => {
    window.__echoes.cmd('startRun');
    return true;
  });
  await page.waitForFunction(() => {
    const r = window.__echoes.state().run;
    return r && r.phase === 'combat' && r.room === 1;
  }, { timeout: 30000 });
  await sleep(1200);
  await ev(page, () => window.__echoes.audio.meterReset());
  // Real combat: hold the basic attack toward the enemies, strafe a little.
  await page.mouse.move(800, 300);
  await page.mouse.down();
  const t0 = Date.now();
  while (Date.now() - t0 < 16000) {
    await page.keyboard.down('KeyA');
    await sleep(700);
    await page.keyboard.up('KeyA');
    await page.keyboard.down('KeyD');
    await sleep(700);
    await page.keyboard.up('KeyD');
    const ph = await ev(page, () => window.__echoes.state().run.phase);
    if (ph !== 'combat') break;
  }
  await page.mouse.up();
  const m = await ev(page, () => {
    const A = window.__echoes.audio;
    const hist = (t) => A.history(t, 400);
    return { master: A.meter('master'), music: A.meter('music'), sfx: A.meter('sfx'), ambient: A.meter('ambient'), sfxHist: hist('sfx'), musicHist: hist('music'), buses: A.buses(), music_: A.music(), phase: window.__echoes.state().run.phase };
  });
  // UI clicks against the same music: five confirms.
  const ui = await ev(page, async () => {
    const A = window.__echoes.audio;
    A.meterReset();
    for (let i = 0; i < 5; i++) {
      A.play('ui_confirm');
      await new Promise((r) => setTimeout(r, 220));
    }
    await new Promise((r) => setTimeout(r, 300));
    return { ui: A.meter('ui'), music: A.meter('music') };
  });
  const sfxWinPeaks = m.sfxHist.map((w) => w[1]).filter((p) => p > -90).sort((a, b) => a - b);
  const q = (arr, p) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(p * arr.length))] : null);
  const res = {
    gate: 'G3.4',
    seconds: m.master.seconds,
    masterMedianRms400Db: m.master.medianRms400Db,
    masterP10: m.master.p10Rms400Db,
    masterP90: m.master.p90Rms400Db,
    musicRmsDb: m.music.rmsDb,
    ambientRmsDb: m.ambient.rmsDb,
    sfxPeakDb: m.sfx.peakDb,
    sfxWindowPeakMedianDb: q(sfxWinPeaks, 0.5),
    sfxWindowPeakP90Db: q(sfxWinPeaks, 0.9),
    sfxActiveWindows: sfxWinPeaks.length,
    uiPeakDb: ui.ui.peakDb,
    musicRmsDuringUiDb: ui.music.rmsDb,
    sfxAboveMusicDb: Math.round((m.sfx.peakDb - m.music.rmsDb) * 100) / 100,
    sfxMedianPeakAboveMusicDb: sfxWinPeaks.length ? Math.round((q(sfxWinPeaks, 0.5) - m.music.rmsDb) * 100) / 100 : null,
    uiAboveMusicDb: Math.round((ui.ui.peakDb - ui.music.rmsDb) * 100) / 100,
    musicState: m.music_.state,
    phaseAtEnd: m.phase,
  };
  res.pass = res.masterMedianRms400Db >= -24 && res.masterMedianRms400Db <= -14 && res.sfxAboveMusicDb >= 6 && res.uiAboveMusicDb >= 3;
  const r = save('balance', { ...res, ...summarizeErrors(errors, consoleLines) });
  await browser.close();
  return r;
}

// ------------------------------------------------------------------ G3.5 --
async function gMusic() {
  // Title boot (menu) -> New Game (camp) -> portal (combat) -> boss ->
  // victory stinger -> camp -> run -> defeat stinger -> camp, by the real
  // game flow; the music tap is metered across the whole sequence.
  const { browser, page, errors, consoleLines } = await openAudio(`${BASE}?seed=7`, { gpu: true });
  const states = [];
  const snap = async (label) => {
    const s = await ev(page, () => {
      const A = window.__echoes.audio;
      return { music: A.music(), meter: A.meter('music'), app: window.__echoes.app ? window.__echoes.app.state : null };
    });
    states.push({ label, state: s.music.state, bpm: s.music.bpm, lastTransitionMs: s.music.lastTransitionMs, app: s.app, low: s.meter ? s.meter.longestBelowMinus50Ms : null, rms: s.meter ? s.meter.shortRmsDb : null });
    return s;
  };
  await page.waitForFunction(() => window.__echoes.audio && window.__echoes.audio.state === 'running', { timeout: 60000 });
  await page.waitForFunction(() => window.__echoes.app && window.__echoes.app.state === 'title', { timeout: 60000 });
  await ev(page, () => window.__echoes.audio.meterReset());
  // Per-state spectra: meter each state for a few seconds.
  const per = {};
  const dwell = async (name, ms = 5000) => {
    await sleep(2600); // past the crossfade
    await ev(page, () => window.__echoes.audio.history('music', 1));
    const c0 = await ev(page, () => {
      window.__echoes.__m3c = { t: performance.now() };
      return true;
    });
    void c0;
    await sleep(ms);
    per[name] = await ev(page, () => {
      const A = window.__echoes.audio;
      return { state: A.music().state, bpm: A.music().bpm, centroidHz: A.meter('music').centroidHz, shortRms: A.meter('music').shortRmsDb };
    });
  };
  await dwell('menu');
  await snap('title');
  // New Game via the title menu (keyboard: the primary is focused).
  const ng = await ev(page, () => {
    const a = window.__echoes.app;
    if (a && a.newGame) {
      a.newGame();
      return 'newGame';
    }
    return a && a.press ? (a.press('confirm'), 'press') : null;
  });
  await page.waitForFunction(() => window.__echoes.app.state === 'playing', { timeout: 30000 });
  await dwell('camp');
  await snap('camp');
  await ev(page, () => {
    window.__echoes.cmd('startRun');
    return true;
  });
  await page.waitForFunction(() => {
    const r = window.__echoes.state().run;
    return r && r.phase === 'combat';
  }, { timeout: 30000 });
  await dwell('combat');
  await snap('combat');
  await ev(page, () => window.__echoes.cmd('skipToRoom', 8));
  await page.waitForFunction(() => window.__echoes.audio.music().state === 'boss', { timeout: 30000 });
  await dwell('boss');
  await snap('boss');
  await ev(page, () => window.__echoes.cmd('killBoss'));
  await page.waitForFunction(() => window.__echoes.audio.music().state === 'victory', { timeout: 30000 });
  await sleep(1600);
  per.victory = await ev(page, () => ({ state: window.__echoes.audio.music().state, bpm: window.__echoes.audio.music().bpm, centroidHz: window.__echoes.audio.meter('music').centroidHz }));
  await snap('victory');
  await page.waitForFunction(() => window.__echoes.audio.music().state === 'camp', { timeout: 30000 });
  await snap('after-victory');
  await ev(page, () => {
    const E = window.__echoes;
    if (E.state().run.phase === 'victory') E.cmd('returnToCamp');
    return true;
  });
  await sleep(2000);
  await ev(page, () => {
    window.__echoes.cmd('startRun');
    return true;
  });
  await page.waitForFunction(() => window.__echoes.audio.music().state === 'combat', { timeout: 30000 });
  await sleep(2500);
  await ev(page, () => window.__echoes.cmd('endRun', 'defeat'));
  await page.waitForFunction(() => window.__echoes.audio.music().state === 'defeat', { timeout: 30000 });
  await sleep(1600);
  per.defeat = await ev(page, () => ({ state: window.__echoes.audio.music().state, bpm: window.__echoes.audio.music().bpm, centroidHz: window.__echoes.audio.meter('music').centroidHz }));
  await snap('defeat');
  await page.waitForFunction(() => window.__echoes.audio.music().state === 'camp', { timeout: 30000 });
  await sleep(3000);
  const fin = await snap('after-defeat');
  const transitions = fin.music.transitions;
  const names = Object.keys(per);
  const pairs = [];
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++) {
      const a = per[names[i]];
      const b = per[names[j]];
      const tempo = Math.abs(a.bpm - b.bpm) / Math.max(a.bpm, b.bpm);
      const cent = a.centroidHz && b.centroidHz ? Math.abs(a.centroidHz - b.centroidHz) / Math.max(a.centroidHz, b.centroidHz) : 0;
      pairs.push({ a: names[i], b: names[j], tempoDiff: Math.round(tempo * 1000) / 1000, centroidDiff: Math.round(cent * 1000) / 1000, distinct: tempo >= 0.15 || cent >= 0.15 });
    }
  const xf = transitions.filter((t) => t.from && t.to && t.from !== 'silence' && t.to !== 'silence');
  const res = {
    gate: 'G3.5',
    newGameVia: ng,
    per,
    pairs,
    allDistinct: pairs.every((p) => p.distinct),
    transitions: xf,
    crossfadesInRange: xf.every((t) => t.crossfadeMs >= 1500 && t.crossfadeMs <= 2500),
    musicLongestBelowMinus50Ms: fin.meter.longestBelowMinus50Ms,
    musicSeconds: fin.meter.seconds,
    states,
  };
  res.audible = Object.values(per).every((p) => p.state && p.centroidHz);
  res.pass = res.allDistinct && res.crossfadesInRange && res.musicLongestBelowMinus50Ms <= 1000 && res.audible;
  const r = save('music', { ...res, ...summarizeErrors(errors, consoleLines) });
  await browser.close();
  return r;
}

// ------------------------------------------------------------------ G3.8 --
// Without the autoplay flag. Nothing may grant user activation before the
// real press, so page state is read through CDP Runtime.evaluate with
// userGesture:false (puppeteer's evaluate would count as a gesture).
async function gAutoplay() {
  const results = [];
  for (const how of ['key', 'click', 'touch']) {
    const browser = await launchEchoes({ gpu: false, autoplay: false });
    const page = await browser.newPage();
    const lines = [];
    const errors = [];
    page.on('console', (m) => lines.push({ t: Date.now(), line: `[${m.type()}] ${m.text()}` }));
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1, hasTouch: how === 'touch' });
    const cdp = await page.createCDPSession();
    const q = async (expr) => {
      const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, userGesture: false, awaitPromise: true });
      return r.result ? r.result.value : null;
    };
    await page.goto(`${BASE}`, { waitUntil: 'domcontentloaded' });
    let st = null;
    for (let i = 0; i < 240; i++) {
      st = await q(`(() => { const E = window.__echoes; if (!E || !E.audio) return null; const p = document.querySelector('.ap-press'); return { state: E.audio.state, gestureNeeded: E.audio.gestureNeeded, app: E.app && E.app.state, stack: E.app && E.app.stack ? E.app.stack() : null, prompt: !!(p && p.classList.contains('ap-on') && p.offsetParent), trial: E.audio.autoplay().trial, hasCtx: !!E.audio.autoplay().contextState }; })()`);
      if (st && st.prompt) break;
      await sleep(250);
    }
    const before = st;
    const beforeLines = lines.map((l) => l.line).filter((l) => /^\[(error|warning|warn)\]/.test(l) && !/X3595|X4000/.test(l));
    const autoplayWarn = lines.some((l) => /AudioContext was not allowed|autoplay/i.test(l.line));
    // Install a listener that timestamps the gesture and polls the state.
    await q(`(() => { window.__m3 = { press: null, running: null }; const on = () => { if (window.__m3.press === null) window.__m3.press = performance.now(); const tick = () => { if (window.__echoes.audio.state === 'running') { window.__m3.running = performance.now(); } else requestAnimationFrame(tick); }; setTimeout(tick, 0); }; for (const t of ['keydown','pointerdown','touchend']) window.addEventListener(t, on, { capture: true, once: false }); return true; })()`);
    if (how === 'key') await page.keyboard.press('KeyA');
    else if (how === 'click') await page.mouse.click(800, 450);
    else await page.touchscreen.tap(800, 450);
    await sleep(600);
    const after = await q(`(() => { const E = window.__echoes; const p = document.querySelector('.ap-press'); return { state: E.audio.state, app: E.app && E.app.state, stack: E.app && E.app.stack ? E.app.stack() : null, prompt: !!(p && p.classList.contains('ap-on') && p.offsetParent), unlockedVia: E.audio.autoplay().unlockedVia, ms: window.__m3.running !== null && window.__m3.press !== null ? Math.round(window.__m3.running - window.__m3.press) : null, music: E.audio.music().state }; })()`);
    await sleep(2500);
    const heard = await q(`(() => { const m = window.__echoes.audio.meter('music'); return { music: window.__echoes.audio.music().state, rms: m ? m.shortRmsDb : null, app: window.__echoes.app.state }; })()`);
    results.push({ how, before, beforeWarnErr: beforeLines, autoplayWarning: autoplayWarn, after, heard, pageErrors: errors.length });
    await browser.close();
  }
  // With the flag: the prompt must never show.
  const browser = await launchEchoes({ gpu: false, autoplay: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  const cdp = await page.createCDPSession();
  const q = async (expr) => (await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, userGesture: false })).result.value;
  await page.goto(`${BASE}`, { waitUntil: 'domcontentloaded' });
  let promptSeen = false;
  let flagState = null;
  for (let i = 0; i < 80; i++) {
    flagState = await q(`(() => { const E = window.__echoes; if (!E || !E.audio) return null; const p = document.querySelector('.ap-press'); return { state: E.audio.state, app: E.app && E.app.state, prompt: !!(p && p.classList.contains('ap-on') && p.offsetParent) }; })()`);
    if (flagState && flagState.prompt) promptSeen = true;
    if (flagState && flagState.app === 'title') break;
    await sleep(150);
  }
  await browser.close();
  const res = {
    gate: 'G3.8',
    noFlag: results,
    withFlag: { promptSeen, final: flagState },
  };
  res.pass =
    results.every((r) => r.before && r.before.state === 'locked' && !r.before.hasCtx && r.beforeWarnErr.length === 0 && !r.autoplayWarning && r.after.state === 'running' && r.after.ms !== null && r.after.ms <= 100 && !r.after.prompt && r.pageErrors === 0) &&
    !promptSeen &&
    flagState &&
    flagState.state === 'running';
  return save('autoplay', res);
}

// ------------------------------------------------------------------ G3.9 --
async function gPersist() {
  const browser = await launchEchoes({ gpu: false, autoplay: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.goto(MENU0, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__echoes && window.__echoes.audio && window.__echoes.audio.state === 'running', { timeout: 120000 });
  const want = { 'audio.master.level': 0.65, 'audio.music.level': 0.3, 'audio.music.mode': 'linear', 'audio.sfx.muted': true, 'audio.ui.level': 0.45, 'audio.ambient.mode': 'linear', 'audio.ambient.level': 0.2, 'audio.muteOnBlur': false };
  await ev(
    page,
    (want) => {
      const S = window.__echoes.settings;
      // modes first (a mode switch moves its level), then levels / mutes.
      for (const [k, v] of Object.entries(want)) if (k.endsWith('.mode')) S.set(k, v);
      for (const [k, v] of Object.entries(want)) if (!k.endsWith('.mode')) S.set(k, v);
      S.persist();
      return S.dump();
    },
    want
  );
  await sleep(400);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__echoes && window.__echoes.audio && window.__echoes.audio.state === 'running', { timeout: 120000 });
  await sleep(600);
  const got = await ev(page, (keys) => Object.fromEntries(keys.map((k) => [k, window.__echoes.settings.get(k)])), Object.keys(want));
  const gains = await ev(page, () => ({ music: window.__echoes.audio.busGain('music'), sfx: window.__echoes.audio.busGain('sfx'), master: window.__echoes.audio.busGain('master') }));
  const persistOk = Object.entries(want).every(([k, v]) => got[k] === v);
  // Mute on focus loss.
  await ev(page, () => window.__echoes.settings.set('audio.muteOnBlur', true));
  await sleep(300);
  const pre = await ev(page, () => window.__echoes.audio.busGain('master').param);
  await ev(page, () => {
    window.dispatchEvent(new Event('blur'));
    return true;
  });
  await sleep(800);
  const blurred = await ev(page, () => window.__echoes.audio.busGain('master'));
  await ev(page, () => {
    window.dispatchEvent(new Event('focus'));
    return true;
  });
  await sleep(800);
  const refocus = await ev(page, () => window.__echoes.audio.busGain('master'));
  // Hidden page (another tab in front).
  const other = await browser.newPage();
  await other.goto('about:blank');
  await other.bringToFront();
  await sleep(1200);
  const hidden = await ev(page, () => ({ vis: document.visibilityState, g: window.__echoes.audio.busGain('master') }));
  await page.bringToFront();
  await sleep(1000);
  const shown = await ev(page, () => ({ vis: document.visibilityState, g: window.__echoes.audio.busGain('master') }));
  await browser.close();
  const res = {
    gate: 'G3.9 (persistence + mute on blur)',
    want,
    got,
    persistOk,
    gains,
    muteOnBlur: { before: pre, blurred: blurred.param, refocused: refocus.param, hidden, shown },
  };
  res.pass = persistOk && pre > 0.5 && blurred.param < 0.001 && refocus.param > 0.5 && (hidden.vis !== 'hidden' || hidden.g.param < 0.001) && shown.g.param > 0.5 && errors.length === 0;
  res.pageErrors = errors.length;
  return save('persist', res);
}

// ------------------------------------------------- G3.9 (tab operability) --
async function gTab() {
  const { browser, page, errors, consoleLines } = await openAudio(`${BASE}?seed=7&menu=1`, { width: 1024, height: 576 });
  await page.waitForFunction(() => window.__echoes.app && window.__echoes.app.state === 'title', { timeout: 60000 });
  await sleep(800);
  const open = await ev(page, () => {
    window.__echoes.app.open('settings', { tab: 'audio' });
    return window.__echoes.app.stack();
  });
  await sleep(600);
  const focusInfo = () => ev(page, () => window.__echoes.app.focus());
  const S = (k) => ev(page, (k) => window.__echoes.settings.get(k), k);
  const steps = [];
  // Keyboard: focus Music slider (from the first row, one Down).
  await ev(page, () => {
    document.getElementById('au-master-level').focus();
    return true;
  });
  const kb = async (key, label) => {
    await page.keyboard.press(key);
    await sleep(160);
    steps.push({ key, label, focus: (await focusInfo())?.id });
  };
  // Focus the master slider through the manager (click = mouse path).
  const r0 = await ev(page, () => {
    const el = document.getElementById('au-master-level');
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.move(r0.x, r0.y);
  await sleep(150);
  steps.push({ mouse: 'hover master', focus: (await focusInfo())?.id });
  const m0 = await S('audio.master.level');
  await kb('ArrowRight', 'master +5%');
  const m1 = await S('audio.master.level');
  await kb('ArrowDown', 'to curve');
  const curveFocus = (await focusInfo())?.id;
  const mode0 = await S('audio.master.mode');
  await kb('Enter', 'cycle curve');
  const mode1 = await S('audio.master.mode');
  const lvlAfterMode = await S('audio.master.level');
  await kb('ArrowRight', 'to mute');
  const muteFocus = (await focusInfo())?.id;
  await kb('Enter', 'mute');
  const muted = await S('audio.master.muted');
  await kb('Enter', 'unmute');
  const unmuted = await S('audio.master.muted');
  await kb('ArrowRight', 'to test');
  const testFocus = (await focusInfo())?.id;
  await ev(page, () => window.__echoes.audio.cueLogClear());
  await kb('Enter', 'test');
  await sleep(400);
  const testLog = await ev(page, () => window.__echoes.audio.cueLog(10).map((e) => e.cue));
  await kb('ArrowDown', 'to music slider');
  const musicFocus = (await focusInfo())?.id;
  // Mouse: click the SFX mute button, drag the ambience slider.
  const sfxMute = await ev(page, () => {
    const el = document.getElementById('au-sfx-mute');
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await sleep(200);
  await page.mouse.click(sfxMute.x, sfxMute.y);
  await sleep(200);
  const sfxMuted = await S('audio.sfx.muted');
  await page.mouse.click(sfxMute.x, sfxMute.y);
  await sleep(200);
  const amb = await ev(page, () => {
    const el = document.getElementById('au-ambient-level');
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x0: r.left + 6, x1: r.left + r.width * 0.25, y: r.top + r.height / 2 };
  });
  await sleep(200);
  await page.mouse.move(amb.x1 + 40, amb.y);
  await page.mouse.down();
  await page.mouse.move(amb.x1, amb.y, { steps: 6 });
  await page.mouse.up();
  await sleep(200);
  const ambLevel = await S('audio.ambient.level');
  // Gamepad: mock a standard pad; D-pad right on the focused Music slider.
  await ev(page, () => {
    document.getElementById('au-music-level').scrollIntoView({ block: 'center' });
    const pad = { id: 'mock', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) };
    window.__m3pad = pad;
    navigator.getGamepads = () => [pad];
    return true;
  });
  // Put focus on the Music slider through the manager (hover).
  const mr = await ev(page, () => {
    const r = document.getElementById('au-music-level').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.move(mr.x, mr.y);
  await sleep(200);
  const mus0 = await S('audio.music.level');
  const padPress = async (i) => {
    await ev(page, (i) => {
      window.__m3pad.buttons[i].pressed = true;
      window.__m3pad.buttons[i].value = 1;
      window.__m3pad.timestamp += 1;
      return true;
    }, i);
    await sleep(120);
    await ev(page, (i) => {
      window.__m3pad.buttons[i].pressed = false;
      window.__m3pad.buttons[i].value = 0;
      window.__m3pad.timestamp += 1;
      return true;
    }, i);
    await sleep(160);
  };
  await padPress(15); // D-pad right
  const mus1 = await S('audio.music.level');
  await padPress(13); // D-pad down -> curve
  const padCurve = (await focusInfo())?.id;
  await padPress(0); // A -> cycle
  const padMode = await S('audio.music.mode');
  await padPress(1); // B -> back (closes settings)
  const afterBack = await ev(page, () => window.__echoes.app.stack());
  // Layout: every audio control inside the viewport after scrolling it into view, >= 40x40 hit targets.
  await ev(page, () => {
    window.__echoes.app.open('settings', { tab: 'audio' });
    return true;
  });
  await sleep(500);
  const layout = await ev(page, () => {
    const out = [];
    for (const el of document.querySelectorAll('.au-tab [data-nav]')) {
      el.scrollIntoView({ block: 'nearest' });
      const r = el.getBoundingClientRect();
      const textEl = el.tagName === 'INPUT' && el.closest('.ap-row') ? el.closest('.ap-row').querySelector('.ap-value') : el;
      const fs = parseFloat(getComputedStyle(textEl).fontSize);
      out.push({ id: el.id, w: Math.round(r.width), h: Math.round(r.height), fs: Math.round(fs * 10) / 10, inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight });
    }
    return out;
  });
  await page.screenshot({ path: 'captures/gntM3-gate-tab-1024.png' });
  const res = {
    gate: 'G3.9 (Audio tab: keyboard / mouse / pad)',
    open,
    keyboard: { masterStep: [m0, m1], curveFocus, modeCycle: [mode0, mode1], levelAfterMode: lvlAfterMode, muteFocus, muted, unmuted, testFocus, testLog, musicFocus },
    mouse: { sfxMuteToggled: sfxMuted, ambientDragTo: ambLevel },
    pad: { musicStep: [mus0, mus1], padCurve, padMode, afterBack },
    layout,
    steps,
  };
  const minHit = layout.filter((l) => l.id).every((l) => l.h >= 40 && l.w >= 40);
  res.minHitOk = minHit;
  res.pass =
    m1 > m0 && curveFocus === 'au-master-curve' && mode1 !== mode0 && muteFocus === 'au-master-mute' && muted === true && unmuted === false && testFocus === 'au-master-test' && testLog.some((c) => c.startsWith('test_')) && musicFocus === 'au-music-level' && sfxMuted === true && ambLevel < 0.6 && mus1 > mus0 && padCurve === 'au-music-curve' && padMode === 'linear' && !afterBack.includes('settings') && minHit && errors.length === 0;
  const r = save('tab', { ...res, ...summarizeErrors(errors, consoleLines) });
  await browser.close();
  return r;
}

// ----------------------------------------------------------------- G3.10 --
async function gCost() {
  const { browser, page, errors, consoleLines } = await openAudio(MENU0, { gpu: true });
  await sleep(4000);
  await ev(page, () => {
    window.__echoes.cmd('startRun');
    return true;
  });
  await page.waitForFunction(() => window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  await ev(page, () => window.__echoes.audio.costReset());
  await page.mouse.move(800, 300);
  await page.mouse.down();
  let peak = 0;
  // Every room of a run: fight a few seconds, clear, advance through reward / path / shop.
  const rooms = [];
  for (let n = 0; n < 12; n++) {
    await sleep(3500);
    const v = await ev(page, () => window.__echoes.audio.voices());
    peak = Math.max(peak, v.peak);
    const s = await ev(page, async () => {
      const E = window.__echoes;
      const r = E.state().run;
      if (!r.active) return { done: true, phase: r.phase };
      if (r.phase === 'combat') {
        if (r.room === 8) E.cmd('killBoss');
        else E.cmd('killAllEnemies');
      }
      await new Promise((res) => setTimeout(res, 900));
      const r2 = E.state().run;
      if (r2.phase === 'reward') E.cmd('draftTake');
      await new Promise((res) => setTimeout(res, 300));
      const r3 = E.state().run;
      if (r3.phase === 'path') E.cmd('pathChoose', 0);
      if (r3.phase === 'shop') E.cmd('shopAdvance');
      return { room: r.room, phase: E.state().run.phase };
    });
    rooms.push(s);
    if (s.done) break;
  }
  await page.mouse.up();
  const cost = await ev(page, () => window.__echoes.audio.cost());
  await sleep(3000);
  const idle = await ev(page, () => ({ voices: window.__echoes.audio.voices(), music: window.__echoes.audio.music().state }));
  const res = { gate: 'G3.10', cost, peakVoices: peak, idleAfter3s: idle.voices.active, idle, rooms };
  res.pass = cost.p95Ms <= 1 && peak <= 48 && idle.voices.active <= 4;
  const r = save('cost', { ...res, ...summarizeErrors(errors, consoleLines) });
  await browser.close();
  return r;
}

// ------------------------------------------------------------------ G3.7 --
// Scripted run that exercises every row of the PLAN §3.5 cue table.
const ROWS = [
  ['basic_fire', 'ally_basic', 'enemy_fire'],
  ['hit', 'hit_immune'],
  ['death'],
  ['heal', 'full_heal', 'aura_pulse', 'zone_tick', 'azone_tick'],
  ['skill_cast', 'ally_cast', 'skill_bolt_spawn', 'zone_spawn', 'azone_spawn', 'echo_recast', 'bounce_hop', 'siphon_drain', 'detonate'],
  ['intent', 'dash_end', 'intent_denied'],
  ['telegraph_start', 'telegraph_resolve', 'boss_quake_start', 'boss_quake_resolve', 'boss_trample', 'boss_adds', 'boss_spawn', 'spawn_telegraph'],
  ['downed', 'revive_start', 'revive', 'revive_break', 'rally', 'mark'],
  ['room_start', 'wave_start', 'room_cleared', 'reward_offer', 'draft_taken', 'draft_declined', 'path_chosen', 'shop_open', 'shop_purchase', 'currency_denied', 'glint_gain', 'node_socketed', 'socket_denied', 'run_start', 'run_end', 'return_to_camp'],
  ['nav'],
];
async function gCoverage() {
  const { browser, page, errors, consoleLines } = await openAudio(`${BASE}?seed=7&menu=1`, { gpu: true });
  await page.waitForFunction(() => window.__echoes.app && window.__echoes.app.state === 'title', { timeout: 60000 });
  await ev(page, () => {
    const E = window.__echoes;
    window.__m3cov = { events: {}, sounds: {} };
    E.on('*', (ev) => {
      if (ev.type === 'sound') window.__m3cov.sounds[ev.cue] = (window.__m3cov.sounds[ev.cue] || 0) + 1;
      else window.__m3cov.events[ev.type] = (window.__m3cov.events[ev.type] || 0) + 1;
    });
    return true;
  });
  // nav on the title
  await page.keyboard.press('ArrowDown');
  await sleep(200);
  await page.keyboard.press('ArrowUp');
  await sleep(200);
  await ev(page, () => window.__echoes.app.newGame && window.__echoes.app.newGame());
  await page.waitForFunction(() => window.__echoes.app.state === 'playing', { timeout: 30000 });
  await sleep(800);
  // Build: every Healer skill + techniques socketed so casts hit every family.
  await ev(page, () => {
    const E = window.__echoes;
    E.cmd('startRun');
    return true;
  });
  await page.waitForFunction(() => window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  await ev(page, () => {
    const E = window.__echoes;
    for (const s of ['sanctuary', 'warding_aura']) E.cmd('giveSkill', s);
    for (const n of ['bounce', 'siphon', 'detonate', 'echo']) E.cmd('grantNode', n);
    const sk = E.state().skills.filter(Boolean).map((s) => s.id);
    E.cmd('socket', sk[0], 'bounce');
    E.cmd('socket', sk[0], 'echo');
    E.cmd('socket', sk[1], 'siphon');
    E.cmd('socket', sk[1], 'detonate');
    E.cmd('socket', sk[0], 'no_such_node');
    return sk;
  });
  await page.mouse.move(800, 300);
  await page.mouse.down();
  const keys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Space', 'Tab', 'KeyR'];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press(keys[i % keys.length]);
    await sleep(230);
  }
  // Downed + revive: drop an ally, let the party revive, break one channel.
  await ev(page, () => {
    const E = window.__echoes;
    const a = E.state().party.find((p) => p.kind === 'ally');
    E.cmd('setHp', a.id, 0);
    return a.id;
  });
  await page.keyboard.down('KeyF');
  await sleep(2600);
  await page.keyboard.up('KeyF');
  await sleep(2000);
  // hit_immune: an i-frame window on the player while hits land.
  await ev(page, () => {
    const E = window.__echoes;
    const p = E.state().party[0];
    E.cmd('iframe', p.id, 30);
    E.cmd('hitOnce', p.id);
    return true;
  });
  // Clear, take and decline drafts, path, shop, boss.
  const flow = await ev(page, async () => {
    const E = window.__echoes;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const log = [];
    for (let n = 0; n < 14; n++) {
      const r = E.state().run;
      if (!r.active) break;
      if (r.phase === 'combat') {
        if (r.room === 8) {
          E.cmd('bossHp', 0.2);
          await wait(4000);
          E.cmd('killBoss');
        } else E.cmd('killAllEnemies');
      } else if (r.phase === 'reward') {
        if (n % 2) E.cmd('draftDecline');
        else E.cmd('draftTake');
      } else if (r.phase === 'path') E.cmd('pathChoose', 0);
      else if (r.phase === 'shop') {
        E.cmd('shopBuy', 0);
        E.cmd('shopBuy', 1);
        E.cmd('shopBuy', 2);
        E.cmd('shopBuy', 2);
        E.cmd('shopAdvance');
      }
      log.push(`${r.room}:${r.phase}`);
      await wait(1200);
    }
    await wait(1500);
    if (E.state().run.phase === 'victory' || E.state().run.phase === 'defeat') E.cmd('returnToCamp');
    await wait(800);
    return log;
  });
  await page.mouse.up();
  const cov = await ev(page, () => ({ ...window.__m3cov, log: window.__echoes.audio.cueLog(600).filter((e) => e.event || e.source === 'nav') }));
  // Which events produced a cue (cueLog entries carry the event type).
  const cueEvents = {};
  for (const e of cov.log) {
    const k = e.source === 'nav' ? 'nav' : e.event;
    cueEvents[k] = (cueEvents[k] || 0) + 1;
  }
  const rows = ROWS.map((row) => {
    const fired = row.filter((t) => (t === 'nav' ? cueEvents.nav : cov.events[t]));
    const cued = row.filter((t) => cueEvents[t]);
    return { row: row.join(' · '), fired, cued, missingEvent: row.filter((t) => t !== 'nav' && !cov.events[t]), eventWithoutCue: fired.filter((t) => !cueEvents[t] && t !== 'nav'), covered: cued.length > 0 };
  });
  const res = { gate: 'G3.7', flow, rows, soundCues: Object.keys(cov.sounds).length, soundEvents: Object.values(cov.sounds).reduce((a, b) => a + b, 0) };
  res.pass = rows.every((r) => r.covered && r.eventWithoutCue.length === 0);
  const r = save('coverage', { ...res, ...summarizeErrors(errors, consoleLines) });
  await browser.close();
  return r;
}

const GATES = { curves: gCurves, decouple: gDecouple, spatial: gSpatial, clip: gClip, balance: gBalance, music: gMusic, autoplay: gAutoplay, persist: gPersist, tab: gTab, cost: gCost, coverage: gCoverage };
const run = gate === 'all' ? Object.keys(GATES) : gate.split(',');
const summary = {};
for (const g of run) {
  try {
    const r = await GATES[g]();
    summary[g] = { pass: r.pass };
    if (run.length === 1) out(r);
  } catch (e) {
    summary[g] = { pass: false, error: String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e) };
  }
}
out(summary);
