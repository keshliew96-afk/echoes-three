#!/usr/bin/env node
// gntfixCAMPAIGN3 — GC.7 with enemy shots IN FLIGHT at the killing blow (fix for the
// round-3 campaign critic's GC7-inflight-4s). Same method as the critic's probe
// (tools/gntccampaign3-inflight.mjs): ?level=1&seed=S, skipToRoom(8), Stag at 50 %,
// a Quillback spawned near the party, party HP pinned to 1 until >= 1 enemy shot is in
// flight, then ONE cmd kill (killBoss + killAllEnemies) at a known tick. Measures, per
// trial, from the kill (performance.now() right before the cmd) to the first rAF frame
// whose campaign is Level 2, phase combat, app playing and not paused:
//   waitTicks  (level_clear tick - kill tick)   — the clear must fire on the next tick
//   cardTicks  (level_start tick - level_clear tick)
//   kill_to_ctrl_ms                             — GC.7: <= 4000 auto, <= 1500 with Enter @ 0.5 s
//   level_clear / level_start counts            — exactly once each
//   eshots after the clear, party hp at the kill vs at Level 2 (a shot must never land
//   after the clear: party pinned at 1 HP would be Downed by it)
//   near-black frames (--luma: CDP screencast, mean luma < 24/255, PLAN §12.5)
//   longest rAF gap after the kill (ms)
//
//   node tools/gntfixCAMPAIGN3-inflight.mjs <base-url> <tag> [trials=5] [--enter] [--luma] [--seed0 20]
// Writes captures/gntfixCAMPAIGN3-inflight-<tag>.json.
import fs from 'node:fs';
import sharp from 'sharp';
import { launchEchoes } from './gnt-arch-browser.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : d;
};
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--seed0'));
const base = pos[0] || 'http://127.0.0.1:5199/';
const tag = pos[1] || 'dev';
const trials = +(pos[2] || 5);
const seed0 = +val('--seed0', 20);
const ENTER = flag('--enter');
const LUMA = flag('--luma');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const INIT = `(() => {
  const log = []; window.__fxframes = log; window.__fxlogOn = false;
  const f = (t) => {
    if (window.__fxlogOn) {
      const E = window.__echoes; const row = { t: Math.round(t * 10) / 10 };
      try {
        const cs = E.campaign.state();
        row.tick = E.tick; row.ph = cs.phase; row.lv = cs.level; row.app = E.app.state;
        row.paused = !!(E.app.simPaused && E.app.simPaused());
      } catch (e) { row.err = String(e).slice(0, 60); }
      if (log.length < 20000) log.push(row);
    }
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
})();`;

const out = `captures/gntfixCAMPAIGN3-inflight-${tag}.json`;
const R = { base, tag, enter: ENTER, luma: LUMA, trials: [] };
const save = () => fs.writeFileSync(out, JSON.stringify(R, null, 1));
const browser = await launchEchoes({ gpu: true, background: true, autoplay: false, headful: false, extraArgs: [] });
try {
  for (let i = 0; i < trials; i++) {
    const seed = seed0 + i;
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e).slice(0, 300)));
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(INIT);
    try {
      await page.goto(base + `?level=1&seed=${seed}&fresh=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.campaign && window.__echoes.campaign.state().phase === 'combat', { timeout: 120000 });
      await page.evaluate(() => window.__echoes.cmd('skipToRoom', 8));
      await page.waitForFunction(() => { const r = window.__echoes.state().run; return r.room === 8 && r.boss && r.boss.active && r.phase === 'combat'; }, { timeout: 30000 });
      await sleep(6000); // Level 2's background preload settles (the critic's cadence)
      await page.evaluate(() => { const E = window.__echoes; const p = E.state().party[0]; E.cmd('bossHp', 0.5); E.cmd('spawn', 'quillback', p.x + 5, p.z - 2); });
      let shots = 0;
      for (let w = 0; w < 300; w++) {
        shots = await page.evaluate(() => { const E = window.__echoes; const s = E.state(); for (const p of s.party) if (!p.downed) E.cmd('setHp', p.id, 1); return s.eshots.length; });
        if (shots >= 1) break;
        await sleep(40);
      }
      const cdp = await page.createCDPSession();
      const frames = [];
      const pend = [];
      if (LUMA) {
        cdp.on('Page.screencastFrame', (ev) => {
          cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => {});
          const buf = Buffer.from(ev.data, 'base64');
          pend.push(sharp(buf).greyscale().stats().then((st) => frames.push({ ts: ev.metadata.timestamp, luma: Math.round(st.channels[0].mean * 10) / 10 })).catch(() => {}));
        });
        await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 50, maxWidth: 480, maxHeight: 270, everyNthFrame: 1 });
      }
      const k = await page.evaluate(() => {
        const E = window.__echoes;
        window.__fxframes.length = 0; window.__fxlogOn = true;
        window.__fxev = [];
        for (const ty of ['level_clear', 'level_start', 'level_transit', 'eshot_despawn', 'room_cleared', 'party_downed', 'downed', 'run_end']) E.on(ty, (ev) => window.__fxev.push([ty, E.tick, Math.round(performance.now()), ev && (ev.cause || ev.reason || ev.mode || ev.result) || null]));
        const s = E.state();
        const t = performance.now();
        const tick = E.tick;
        const hp = s.party.map((p) => p.hp);
        const rd = E.campaign.state().ready;
        const readyAtKill = rd ? `${rd.level}:${rd.ready}:${rd.built}/${rd.total}` : null;
        E.cmd('killBoss'); E.cmd('killAllEnemies');
        return { t, tick, shots: s.eshots.length, hp, readyAtKill };
      });
      let enterAt = null;
      if (ENTER) {
        await sleep(Math.max(0, 500 - 5));
        enterAt = await page.evaluate((t0) => Math.round(performance.now() - t0), k.t);
        await page.keyboard.press('Enter');
      }
      const ok = await page.waitForFunction(() => { const E = window.__echoes; const c = E.campaign.state(); return c.level === 2 && c.phase === 'combat' && E.app.state === 'playing' && !E.app.simPaused(); }, { timeout: 20000, polling: 8 }).then(() => true).catch(() => false);
      await sleep(300);
      const after = await page.evaluate(() => { const E = window.__echoes; const s = E.state(); return { tick: E.tick, eshots: s.eshots.length, hp: s.party.map((p) => p.hp + '/' + p.maxHp), downed: s.party.filter((p) => p.downed).length, level: E.campaign.state().level }; });
      const ev = await page.evaluate(() => window.__fxev.slice());
      const tr = await page.evaluate(() => { const l = window.__echoes.campaign.transitions(); const t = l[l.length - 1]; if (!t) return null; const b = t.clearAt; const rel = (x) => (x == null ? null : Math.round(x - b)); return { kind: t.kind, reason: t.advanceReason, readyAfterClearMs: rel(t.readyAt), advanceAfterClearMs: rel(t.advanceAt), killToControlMs: t.killToControlMs, clearToControlMs: t.clearToControlMs, maxGapMs: t.maxGapMs, longFrames: t.longFrames || [] }; });
      const log = await page.evaluate(() => { window.__fxlogOn = false; return window.__fxframes.splice(0); });
      if (LUMA) { await cdp.send('Page.stopScreencast').catch(() => {}); await Promise.all(pend); frames.sort((a, b) => a.ts - b.ts); }
      const ctrl = log.find((r) => r.lv === 2 && r.ph === 'combat' && r.app === 'playing' && !r.paused);
      const clear = ev.filter((e) => e[0] === 'level_clear');
      const start = ev.filter((e) => e[0] === 'level_start');
      let gap = 0;
      for (let j = 1; j < log.length; j++) gap = Math.max(gap, log[j].t - log[j - 1].t);
      // Ticks where a party member got hurt between the kill and the clear (a landing shot).
      const row = {
        seed,
        ok,
        shotsInFlight: k.shots,
        killTick: k.tick,
        clearTick: clear[0] ? clear[0][1] : null,
        waitTicks: clear[0] ? clear[0][1] - k.tick : null,
        cardTicks: clear[0] && start[0] ? start[0][1] - clear[0][1] : null,
        levelClears: clear.length,
        levelStarts: start.length,
        enterAtMs: enterAt,
        kill_to_ctrl_ms: ctrl ? Math.round(ctrl.t - k.t) : null,
        maxFrameGapMs: Math.round(gap),
        eshotDespawnRoomClear: ev.filter((e) => e[0] === 'eshot_despawn' && e[3] === 'room_clear').length,
        partyHpAtKill: k.hp,
        readyAtKill: k.readyAtKill,
        manager: tr,
        after,
        nearBlack: LUMA ? frames.filter((f) => f.luma < 24).length : null,
        minLuma: LUMA && frames.length ? Math.min(...frames.map((f) => f.luma)) : null,
        lumaFrames: LUMA ? frames.length : null,
        errors,
      };
      R.trials.push(row);
      console.log(JSON.stringify(row));
    } catch (e) {
      R.trials.push({ seed, fatal: String(e).slice(0, 300), errors });
      console.log('FATAL', seed, String(e).slice(0, 200));
    }
    save();
    await ctx.close().catch(() => {});
  }
  const ok = R.trials.filter((t) => t.kill_to_ctrl_ms != null);
  const ms = ok.map((t) => t.kill_to_ctrl_ms);
  R.summary = {
    trials: R.trials.length,
    measured: ok.length,
    maxKillToCtrlMs: ms.length ? Math.max(...ms) : null,
    minKillToCtrlMs: ms.length ? Math.min(...ms) : null,
    maxWaitTicks: Math.max(...ok.map((t) => t.waitTicks ?? 0)),
    bound: ENTER ? 1500 : 4000,
    overBound: ms.filter((m) => m > (ENTER ? 1500 : 4000)).length,
    exactlyOnce: ok.every((t) => t.levelClears === 1 && t.levelStarts === 1),
    shotLandedAfterClear: ok.filter((t) => t.after.eshots > 0 || t.after.downed > 0).length,
    nearBlack: LUMA ? ok.reduce((n, t) => n + (t.nearBlack || 0), 0) : null,
    pageErrors: R.trials.reduce((n, t) => n + (t.errors ? t.errors.length : 0), 0),
  };
  console.log('SUMMARY', JSON.stringify(R.summary));
} finally {
  save();
  await browser.close();
}
