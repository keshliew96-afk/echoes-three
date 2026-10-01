// gntfixCAMPAIGN6 — COPY of tools/gntccampaign6-frames.mjs (campaign critic r6), outputs renamed: transition frame timing / luma / loop check over several trials.
// Each trial: fresh context, ?level=1&seed=S&fresh=1 (harness campaign start), cmd skipToRoom(8) to reach the Stag
// (said in the report), optional in-flight enemy shot (Quillback spawned, Stag at 50 %), killing blow = cmd killBoss +
// killAllEnemies at a known tick. Measures L1->L2 and L2->L3: kill -> first controllable frame, card ticks, max rAF gap,
// screencast luma (every 3rd frame ~ 50 ms), camp frames, level index sequence, voices on card vs combat, and the
// game's own transitions() record for comparison. --enter 1 presses Enter at card +0.5 s (T1 and T2).
// usage: node tools/gntccampaign6-frames.mjs --base URL --tag t [--trials 3] [--seed0 41] [--enter 0] [--inflight 0] [--throttle 1] [--shot 1]
import { launch, open, sleep, writeJson, screencast, ARGS } from './gntfixCAMPAIGN6-lib.mjs';
import fs from 'fs';
const base = ARGS.base || 'http://127.0.0.1:4332/';
const tag = ARGS.tag || 'dev';
const trials = +(ARGS.trials || 3);
const seed0 = +(ARGS.seed0 || 41);
const enter = ARGS.enter === '1';
const inflight = ARGS.inflight === '1';
const throttle = +(ARGS.throttle || 1);
const shot = ARGS.shot !== '0';
const NAME = `gntfixCAMPAIGN6-frames-${tag}`;
const R = { base, tag, trials, seed0, enter, inflight, throttle, shot, rows: [] };
const browser = await launch({ autoplay: true });

async function transition(page, cdp, fromLevel, seed, trial) {
  await page.evaluate(() => window.__echoes.cmd('skipToRoom', 8));
  await page.waitForFunction(() => { const r = window.__echoes.state().run; return r.room === 8 && r.boss && r.boss.active && r.phase === 'combat'; }, { timeout: 30000 });
  await sleep(3500);
  let shotsAtKill = 0;
  if (inflight) {
    await page.evaluate(() => { const E = window.__echoes; const p = E.state().party[0]; E.cmd('bossHp', 0.5); E.cmd('spawn', 'quillback', p.x + 5, p.z - 2); });
    for (let w = 0; w < 300; w++) { const n = await page.evaluate(() => { const E = window.__echoes; const s = E.state(); for (const p of s.party) if (!p.downed) E.cmd('setHp', p.id, 1); return s.eshots.length; }); if (n >= 1) { shotsAtKill = n; break; } await sleep(40); }
  }
  const combatVoices = await page.evaluate(() => window.__echoes.audio.voices().active);
  const sc = shot ? await screencast(cdp, { maxWidth: 480, quality: 40, nth: 3 }) : null;
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  const k = await page.evaluate(() => {
    const E = window.__echoes; window.__gc4frames.length = 0; window.__gc4logOn = true; window.__gc4ev = [];
    if (!window.__gc4evOn) { window.__gc4evOn = true; for (const ty of ['level_clear', 'level_transit', 'level_start', 'run_end', 'return_to_camp', 'defeat']) E.on(ty, (e) => window.__gc4ev.push([ty, E.tick, Math.round(performance.now()), e && e.reason])); }
    const t = performance.now(); const tick = E.tick; const shots = E.state().eshots.length; E.cmd('killBoss'); E.cmd('killAllEnemies'); return { t, tick, shots, origin: performance.timeOrigin };
  });
  const cardVoices = [];
  let entered = null;
  const nl = fromLevel + 1;
  const t0 = Date.now();
  let done = false;
  while (Date.now() - t0 < 20000) {
    const s = await page.evaluate((nl) => { const E = window.__echoes; const c = E.campaign.state(); return { ph: c.phase, lv: c.level, ok: c.level === nl && c.phase === 'combat' && E.app.state === 'playing' && !E.app.simPaused(), v: E.audio.voices().active, card: c.card && E.tick - c.card.startTick, now: performance.now() }; }, nl);
    if (s.ph === 'transit') cardVoices.push(s.v);
    if (enter && !entered && s.ph === 'transit' && s.now - k.t >= 500) { await page.keyboard.press('Enter'); entered = { atMs: Math.round(s.now - k.t), cardTick: s.card }; }
    if (s.ok) { done = true; break; }
    await sleep(30);
  }
  await sleep(1000);
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const frames = sc ? await sc.stop() : [];
  const log = await page.evaluate(() => { window.__gc4logOn = false; return window.__gc4frames.splice(0); });
  const ev = await page.evaluate(() => window.__gc4ev.slice());
  const rec = await page.evaluate(() => { try { return window.__echoes.campaign.transitions().slice(-1)[0]; } catch (e) { return String(e); } });
  const ctrl = log.find((r) => r.lv === nl && r.ph === 'combat' && r.app === 'playing' && !r.paused && (r.veil == null || r.veil < 0.05));
  const ctrlAny = log.find((r) => r.lv === nl && r.ph === 'combat' && r.app === 'playing' && !r.paused);
  const win = log.filter((r) => r.t >= k.t && (!ctrl || r.t <= ctrl.t + 1000));
  let maxGap = 0, gapAt = null;
  for (let i = 1; i < win.length; i++) { const g = win[i].t - win[i - 1].t; if (g > maxGap) { maxGap = g; gapAt = { ms: Math.round(win[i - 1].t - k.t), from: win[i - 1].ph, to: win[i].ph }; } }
  const idxSeq = []; for (const r of win) if (!idxSeq.length || idxSeq[idxSeq.length - 1] !== r.ix) idxSeq.push(r.ix);
  const phases = []; for (const r of win) if (!phases.length || phases[phases.length - 1] !== r.ph) phases.push(r.ph);
  const k0 = k.origin + k.t, k1 = ctrl ? k.origin + ctrl.t + 1000 : Infinity;
  const sf = frames.filter((f) => f.ts * 1000 >= k0 - 50 && f.ts * 1000 <= k1);
  let nb = 0, run = 0, maxRun = 0, minL = 999, minF = null;
  for (const f of sf) { if (f.luma < 24) { nb++; run++; maxRun = Math.max(maxRun, run); } else run = 0; if (f.luma < minL) { minL = f.luma; minF = f; } }
  let scGap = 0; for (let i = 1; i < sf.length; i++) scGap = Math.max(scGap, (sf[i].ts - sf[i - 1].ts) * 1000);
  if (minF && trial === 0) fs.writeFileSync(`captures/gntfixCAMPAIGN6-frames-${tag}-L${fromLevel}-darkest.jpg`, minF.buf);
  if (trial === 0 && sf.length) { const mid = sf[Math.floor(sf.length / 3)]; fs.writeFileSync(`captures/gntfixCAMPAIGN6-frames-${tag}-L${fromLevel}-card.jpg`, mid.buf); }
  const clear = ev.find((e) => e[0] === 'level_clear'), start = ev.find((e) => e[0] === 'level_start');
  const cnt = (ty) => ev.filter((e) => e[0] === ty).length;
  return {
    seed, from: fromLevel, to: nl, done, shotsAtKill: k.shots, killTick: k.tick, clearTick: clear && clear[1], startTick: start && start[1], startReason: start && start[3],
    waitTicks: clear ? clear[1] - k.tick : null, cardTicks: clear && start ? start[1] - clear[1] : null, entered,
    kill_to_ctrl_ms: ctrl ? Math.round(ctrl.t - k.t) : null, kill_to_ctrl_noveil_ms: ctrlAny ? Math.round(ctrlAny.t - k.t) : null,
    maxRafGapMs: Math.round(maxGap), gapAt, rafFrames: win.length, campFrames: win.filter((r) => r.mode === 'camp').length, modes: [...new Set(win.map((r) => r.mode))], phases, idxSeq,
    counts: { level_clear: cnt('level_clear'), level_transit: cnt('level_transit'), level_start: cnt('level_start'), run_end: cnt('run_end'), return_to_camp: cnt('return_to_camp') },
    screencast: shot ? { frames: sf.length, nearBlack: nb, maxConsecutiveNearBlack: maxRun, minLuma: minL, maxGapMs: Math.round(scGap) } : null,
    voices: { combat: combatVoices, cardMax: cardVoices.length ? Math.max(...cardVoices) : null, cardMin: cardVoices.length ? Math.min(...cardVoices) : null },
    gameRecord: rec && typeof rec === 'object' ? { clearTick: rec.clearTick, cardWallMs: rec.cardWallMs, readyMs: rec.readyMs, advanceTick: rec.advanceTick, reason: rec.reason, firstControllableMs: rec.firstControllableMs, longestFrameMs: rec.longestFrameMs } : rec,
  };
}

try {
  for (let i = 0; i < trials; i++) {
    const seed = seed0 + i;
    const ctx = await browser.createBrowserContext();
    const o = await open(browser, base + `?level=1&seed=${seed}&fresh=1`, { context: ctx });
    try {
      await o.page.waitForFunction(() => { const s = window.__echoes.state(); return s.run.phase === 'combat' && s.run.room === 1 && window.__echoes.app.state === 'playing'; }, { timeout: 90000 });
      await o.page.keyboard.press('ShiftLeft');
      for (const L of [1, 2]) {
        const row = await transition(o.page, o.cdp, L, seed, i);
        row.errors = o.errors.slice();
        R.rows.push(row);
        console.log(JSON.stringify(row).slice(0, 1200));
        writeJson(NAME, R);
        if (!row.done) break;
      }
    } catch (e) { R.rows.push({ seed, fatal: String(e && e.stack || e).slice(0, 600), errors: o.errors }); console.log('FATAL', seed, String(e).slice(0, 300)); }
    await ctx.close().catch(() => {});
  }
} finally { writeJson(NAME, R); await browser.close(); }
const S = (a) => a.filter((x) => x != null);
const k2c = S(R.rows.map((r) => r.kill_to_ctrl_ms));
console.log('SUMMARY', JSON.stringify({ n: R.rows.length, kill_to_ctrl_ms: k2c, max: Math.max(...k2c), maxGap: Math.max(...S(R.rows.map((r) => r.maxRafGapMs))), nearBlack: S(R.rows.map((r) => r.screencast && r.screencast.nearBlack)).reduce((a, b) => a + b, 0), minLuma: Math.min(...S(R.rows.map((r) => r.screencast && r.screencast.minLuma))), campFrames: R.rows.map((r) => r.campFrames), exact: R.rows.map((r) => r.counts && [r.counts.level_clear, r.counts.level_start].join('/')) }));
