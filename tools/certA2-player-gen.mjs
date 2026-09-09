#!/usr/bin/env node
// certA2-player critic: action-file generator. Every JSON is written
// programmatically (JSON.stringify) — never hand-escaped. Every eval is an
// IIFE; every wait is an async 8 ms poll that RETURNS the observed state so it
// lands in the console log as [EVAL]. Read-only w.r.t. src/**.
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'tools/actions');
mkdirSync(outDir, { recursive: true });
const write = (n, acts) => {
  const p = resolve(outDir, `${n}.json`);
  writeFileSync(p, JSON.stringify(acts, null, 2));
  console.log(`wrote ${p} (${acts.length} actions)`);
};

const ev = (code) => ({ type: 'eval', code });
const shot = (name) => ({ type: 'shot', name });
const wait = (ms) => ({ type: 'wait', ms });

// --- shared arm -------------------------------------------------------------
const arm = (types) => ev(`(() => {
  const E = window.__echoes; if (!E) return { armed:false };
  window.__P = { ev: [], t0: E.tick };
  for (const t of ${JSON.stringify(types)}) E.on(t, (e) => { window.__P.ev.push(Object.assign({ type: t }, e)); });
  return { armed:true, tick:E.tick, version:E.version, seed:E.seed, bootSeed:E.bootSeed, types:${JSON.stringify(types).length ? types.length : 0} };
})()`);

const cmd = (tag, name, ...args) => ev(`(() => {
  const E = window.__echoes; E.cmd(${JSON.stringify(name)}${args.length ? ', ' + args.map((a) => JSON.stringify(a)).join(', ') : ''});
  const s = E.state();
  return { tag: ${JSON.stringify(tag)}, tick: E.tick, room: s.room, phase: s.run && s.run.phase, screen: E.runUi && E.runUi().screen };
})()`);

// ============================================================================
// PROBE 1 — SHOP FEEDBACK (buy tween, deny shake, plaque glitter drift)
// ============================================================================
write('certA2-player-shopjuice', [
  arm(['shop_buy', 'currency_denied', 'skill_socket', 'node_grant']),
  cmd('startRun', 'startRun'),
  cmd('skip7', 'skipToRoom', 7),
  wait(1800),
  ev(`(() => {
    const E = window.__echoes, u = E.runUi();
    const boxes = [...document.querySelectorAll('.rn-card')].map((n,i) => { const r = n.getBoundingClientRect();
      return { i, cls: n.className, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), op: getComputedStyle(n).opacity, tf: getComputedStyle(n).transform, tr: getComputedStyle(n).transition }; });
    const pl = [...document.querySelectorAll('[class*=plaque]')].map((n) => { const r = n.getBoundingClientRect();
      return { cls: n.className, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), txt: (n.textContent||'').trim() }; });
    return { screen: u.screen, wallet: E.cmd('wallet'), tick: E.tick, cards: boxes, plaques: pl };
  })()`),
  shot('certA2-player-shop-g0'), wait(220), shot('certA2-player-shop-g1'), wait(220), shot('certA2-player-shop-g2'),
  // hover card 1 then buy it; shots at ~0 / 90 / 300 / 700 ms after the click
  { type: 'mousemove', x: 500, y: 600 }, wait(260), shot('certA2-player-shop-hover'),
  { type: 'click', x: 500, y: 600 },
  shot('certA2-player-shop-buy0'), wait(90), shot('certA2-player-shop-buy1'),
  wait(220), shot('certA2-player-shop-buy2'), wait(400), shot('certA2-player-shop-buy3'),
  ev(`(() => { const E = window.__echoes; return { tag:'afterBuy1', tick:E.tick, wallet:E.cmd('wallet'),
    cards: [...document.querySelectorAll('.rn-card')].map((n,i)=>({ i, cls:n.className, op:getComputedStyle(n).opacity, filter:getComputedStyle(n).filter, tf:getComputedStyle(n).transform })),
    ev: window.__P.ev.slice(-4) }; })()`),
  // buy card 2 -> wallet 17, then card 3 (35) must be denied
  { type: 'click', x: 800, y: 600 }, wait(700),
  ev(`(() => { const E = window.__echoes; return { tag:'afterBuy2', tick:E.tick, wallet:E.cmd('wallet'), ev: window.__P.ev.slice(-3) }; })()`),
  { type: 'click', x: 1100, y: 600 },
  shot('certA2-player-shop-deny0'), wait(110), shot('certA2-player-shop-deny1'),
  wait(200), shot('certA2-player-shop-deny2'), wait(500), shot('certA2-player-shop-deny3'),
  ev(`(() => { const E = window.__echoes;
    const pl = [...document.querySelectorAll('[class*=plaque]')].map((n)=>{ const r=n.getBoundingClientRect();
      return { cls:n.className, x:+r.x.toFixed(2), y:+r.y.toFixed(2), txt:(n.textContent||'').trim(), anim:getComputedStyle(n).animationName }; });
    return { tag:'afterDeny', tick:E.tick, wallet:E.cmd('wallet'), plaques:pl, ev: window.__P.ev.slice(-4) }; })()`),
]);

// ============================================================================
// PROBE 2 — BOSS MOTION JUICE (screenshake camera trace, knockback, decals)
// ============================================================================
write('certA2-player-juice', [
  arm(['hit', 'death', 'knockback', 'screenshake', 'boss_quake_start', 'boss_quake_resolve', 'enemy_spawn', 'boss_adds', 'hitstop']),
  cmd('startRun', 'startRun'),
  cmd('skip8', 'skipToRoom', 8),
  { type: 'mousemove', x: 800, y: 380 },
  { type: 'mousedown', button: 'right' },
  // wait for a screenshake, then trace the camera at 8 ms for ~800 ms
  ev(`(async () => {
    const E = window.__echoes, P = window.__P, t0 = Date.now();
    const nShake = () => P.ev.filter((e) => e.type === 'screenshake').length;
    const base = nShake();
    while (nShake() === base && Date.now() - t0 < 40000) await new Promise((r) => setTimeout(r, 8));
    const fired = P.ev.filter((e) => e.type === 'screenshake').slice(-1)[0] || null;
    const trace = []; const tr0 = Date.now();
    while (Date.now() - tr0 < 800) {
      const v = E.state().vfx.arena;
      trace.push({ t: E.tick, cam: v.cam, shake: v.shake, shakes: v.shakes, num: v.numerals, dec: v.decals, sc: v.scorch, pa: v.particles });
      await new Promise((r) => setTimeout(r, 8));
    }
    const mags = trace.map((s) => Array.isArray(s.cam) ? Math.hypot(s.cam[0], s.cam[1]) : null).filter((v) => v != null);
    const cx = trace.map((s) => s.cam && s.cam[0]).filter((v) => typeof v === 'number');
    const cy = trace.map((s) => s.cam && s.cam[1]).filter((v) => typeof v === 'number');
    return { ok: true, waitedMs: tr0 - t0, shakeEvent: fired, shakeCount: nShake(), samples: trace.length,
      camX: { min: Math.min(...cx), max: Math.max(...cx), span: +(Math.max(...cx) - Math.min(...cx)).toFixed(4) },
      camY: { min: Math.min(...cy), max: Math.max(...cy), span: +(Math.max(...cy) - Math.min(...cy)).toFixed(4) },
      shakeMax: Math.max(...trace.map((s) => typeof s.shake === 'number' ? s.shake : 0)),
      first24: trace.slice(0, 24) };
  })()`),
  shot('certA2-player-shake0'), wait(60), shot('certA2-player-shake1'), wait(60), shot('certA2-player-shake2'),
  // knockback: trace one enemy's position through the next hit it takes
  ev(`(async () => {
    const E = window.__echoes, P = window.__P, t0 = Date.now();
    const pick = () => (E.state().enemies || []).filter((e) => e.kind !== 'boss')[0] || null;
    let tgt = pick();
    while (!tgt && Date.now() - t0 < 20000) { await new Promise((r) => setTimeout(r, 8)); tgt = pick(); }
    if (!tgt) return { ok: false, why: 'no add' };
    const id = tgt.id;
    const hitsOn = () => P.ev.filter((e) => e.type === 'hit' && (e.id === id || e.target === id || e.targetId === id));
    const base = hitsOn().length;
    const trace = [];
    const t1 = Date.now();
    while (Date.now() - t1 < 6000) {
      const e = (E.state().enemies || []).find((q) => q.id === id);
      if (!e) break;
      const last = trace[trace.length - 1];
      if (!last || last.t !== E.tick) trace.push({ t: E.tick, x: +e.x.toFixed(3), z: +e.z.toFixed(3), hp: e.hp });
      if (hitsOn().length > base && trace.length > 40 && Date.now() - t1 > 1200) break;
      await new Promise((r) => setTimeout(r, 6));
    }
    const hits = hitsOn().slice(base);
    let maxStep = 0, maxAt = null;
    for (let i = 1; i < trace.length; i++) {
      const d = Math.hypot(trace[i].x - trace[i - 1].x, trace[i].z - trace[i - 1].z) / Math.max(1, trace[i].t - trace[i - 1].t);
      if (d > maxStep) { maxStep = d; maxAt = trace[i].t; }
    }
    return { ok: true, id, ticks: trace.length, hitsSeen: hits.length, hitEvents: hits.slice(0, 4),
      maxStepPerTick: +maxStep.toFixed(4), maxStepAtTick: maxAt, trace: trace.slice(0, 60) };
  })()`),
  // decal persistence after a death
  ev(`(async () => {
    const E = window.__echoes, P = window.__P;
    const nDeath = () => P.ev.filter((e) => e.type === 'death').length;
    const base = nDeath();
    const t0 = Date.now();
    E.cmd('killAllEnemies');
    while (nDeath() === base && Date.now() - t0 < 8000) await new Promise((r) => setTimeout(r, 8));
    const deathTick = E.tick;
    const trace = [];
    const t1 = Date.now();
    while (Date.now() - t1 < 4000) {
      const v = E.state().vfx.arena;
      trace.push({ t: E.tick, dec: v.decals, sc: v.scorch, num: v.numerals, pa: v.particles });
      await new Promise((r) => setTimeout(r, 120));
    }
    return { ok: true, deathTick, deaths: nDeath() - base,
      deathEvents: P.ev.filter((e) => e.type === 'death').slice(-4),
      decalPeak: Math.max(...trace.map((s) => s.dec)), scorchPeak: Math.max(...trace.map((s) => s.sc)),
      numPeak: Math.max(...trace.map((s) => s.num)), paPeak: Math.max(...trace.map((s) => s.pa)),
      decalAtEnd: trace[trace.length - 1], trace: trace.filter((_, i) => i % 3 === 0) };
  })()`),
  shot('certA2-player-decal0'), wait(900), shot('certA2-player-decal1'),
  { type: 'mouseup', button: 'right' },
  ev(`(() => { const E = window.__echoes, P = window.__P;
    const c = {}; for (const e of P.ev) c[e.type] = (c[e.type] || 0) + 1;
    return { tag:'final', tick:E.tick, fps:E.fps, counts:c, vfx:E.state().vfx.arena && { dec:E.state().vfx.arena.decals, sc:E.state().vfx.arena.scorch, sh:E.state().vfx.arena.shakes, pa:E.state().vfx.arena.particles } }; })()`),
]);
