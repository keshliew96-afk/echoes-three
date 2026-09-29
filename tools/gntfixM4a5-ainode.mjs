#!/usr/bin/env node
// gntfixM4a5 — Node (headless, deterministic, built exactly like tools/gntCAMPAIGN-camprun.mjs) carried campaigns
// with the default-build autopilot + the §25.8 ally AI in Suggested mode. Per room: each AI seat's equipped loadout
// (tracked through swaps), ally_cast per seat+skill (+ fallback share from partyAiLog deltas), ally_basic per seat,
// duration, party damage (hit amount + absorbed on party + Waystone), downs; per level: downs, outcome.
// GP.8 idle pairs: a combat room (not shop) lasting >= 1200 ticks, an ACTIVE equipped for the whole room, 0 casts.
//   node tools/gntfixM4a5-ainode.mjs --from 1 --seeds 1-3 [--root dir] [--out captures/x.json] [--legacy 1]
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const FROM = +opt('from', '1');
const sa = opt('seeds', '1-3');
const SEEDS = sa.includes('-')
  ? (([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i))(sa.split('-').map(Number))
  : sa.split(',').map(Number);
const ROOT = resolve(opt('root', '.'));
const OUT = opt('out', null);
const LEGACY = opt('legacy', '0') === '1';
const QUIET = opt('quiet', '0') === '1';
const TRACE = opt('trace', null);
const STOP_AFTER = +opt('stopAfter', '0'); // stop the run after this level clears (0 = full campaign) // e.g. 1:4 = level 1 room 4 (first seed only)
const PASSIVE = new Set(['iron_stance', 'razor_wake', 'kestrel_watch', 'warding_aura', 'quiet_hearth']);
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));

const med = (a) => {
  const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  return s.length ? s[s.length >> 1] : null;
};

async function runOne(seed) {
  let impl = createGameplayRng(seed >>> 0);
  const rng = {
    stream: 'gameplay',
    get seed() { return impl.seed; },
    get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (p) => impl.chance(p),
    pick: (a) => impl.pick(a),
    reseed: (s) => { impl = createGameplayRng(s >>> 0); return impl.seed; },
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const run = world.runSystem();
  const ap = run.autopilot;
  const cmd = (...a) => {
    try { return world.cmd(...a); } catch { return null; }
  };
  if (LEGACY) cmd('difficultyLegacy', true);
  const loadout = () => [1, 2, 3].map((k) => ((cmd('partyView', k) || {}).slots || []).slice());
  const levels = [];
  let lv = null;
  let cur = null;
  let level = FROM;
  const party = new Set(['player', 'ally']);
  bus.on('level_start', (e) => { level = e.level; });
  bus.on('room_enter', (e) => {
    if (!lv || lv.level !== level) {
      lv = { level, rooms: [], downs: 0, outcome: null };
      levels.push(lv);
    }
    cur = { room: e.index, mode: e.mode, t0: e.tick, end: null, lo: loadout(), lo2: null, casts: { 1: {}, 2: {}, 3: {} }, basics: { 1: 0, 2: 0, 3: 0 }, dmg: 0, byVictim: {}, minHp: {}, downs: 0, downsBy: {}, ai0: cmd('partyAiLog'), near: { 1: [], 2: [] } };
    lv.rooms.push(cur);
  });
  bus.on('ally_cast', (e) => { if (cur && e.partyIndex >= 1) cur.casts[e.partyIndex][e.skill] = (cur.casts[e.partyIndex][e.skill] || 0) + 1; });
  bus.on('ally_basic', (e) => { if (cur && e.partyIndex >= 1) cur.basics[e.partyIndex]++; });
  bus.on('hit', (e) => {
    if (!cur) return;
    if (party.has(e.kind)) {
      cur.dmg += e.amount + (e.absorbed ?? 0);
      const t = registry.byId(e.target ?? e.id);
      const k = t && t.partyIndex !== undefined ? t.partyIndex : 'p?';
      cur.byVictim[k] = (cur.byVictim[k] || 0) + e.amount + (e.absorbed ?? 0);
      if (t && t.maxHp) { const f = Math.max(0, t.hp) / t.maxHp; if (!(cur.minHp[k] <= f)) cur.minHp[k] = f; }
    } else if (e.kind === 'waystone') {
      cur.dmg += e.amount;
      cur.byVictim.W = (cur.byVictim.W || 0) + e.amount;
    }
  });
  bus.on('downed', (e) => {
    if (cur) { cur.downs++; const t = registry.byId(e.id ?? e.target); const k = t && t.partyIndex !== undefined ? t.partyIndex : '?'; cur.downsBy[k] = (cur.downsBy[k] || 0) + 1; cur.downsBy.mode = cur.mode; }
    if (lv) lv.downs++;
  });
  bus.on('room_cleared', (e) => {
    if (cur && cur.end == null) {
      cur.end = e.tick;
      cur.ai1 = cmd('partyAiLog');
    }
  });
  let stopNow = false;
  bus.on('level_clear', (e) => { if (lv) lv.outcome = 'cleared'; if (STOP_AFTER && (e.level ?? level) >= STOP_AFTER) stopNow = true; });
  bus.on('party_commit', () => { if (cur) cur.lo2 = loadout(); });
  bus.on('skill_swapped', () => { if (cur) cur.lo2 = loadout(); });
  run.startCampaign({ level: FROM, challenge: 'standard', harness: true });
  ap.configure(true);
  let outcome = null;
  for (let i = 0; i < 220000; i++) {
    clock.stepOnce((t) => world.step(t, ap.intents(t, emptySnapshot())));
    if (cur && cur.end == null && (i & 15) === 0) {
      const hs = registry.all().filter((x) => x.faction === 'hostile' && x.hp > 0 && x.hittable !== false);
      if (hs.length) for (const k of [1, 2]) {
        const a = registry.all().find((x) => x.partyIndex === k);
        if (a && !a.downed) cur.near[k].push(Math.min(...hs.map((h) => Math.hypot(h.x - a.x, h.z - a.z))));
      }
    }
    if (TRACE && cur && cur.end == null && `${level}:${cur.room}` === TRACE && (i % 30) === 0 && seed === SEEDS[0]) {
      const allE = registry.all();
      const hs = allE.filter((x) => x.faction === 'hostile' && x.hp > 0);
      const pl = allE.find((x) => x.partyIndex === 0);
      const ws = allE.find((x) => x.kind === 'waystone' && x.hp > 0);
      const anc = ws || pl;
      const fmt = (n) => (n == null ? '-' : n.toFixed(1));
      const line = [1, 2, 3].map((k) => {
        const a = allE.find((x) => x.partyIndex === k);
        const t = a && a.targetId != null ? registry.byId(a.targetId) : null;
        const nh = hs.length ? Math.min(...hs.map((h) => Math.hypot(h.x - a.x, h.z - a.z))) : null;
        const cdl = (a.cds || []).map((c) => Math.max(0, c - i)).join('/');
        return `${a.classId[0]}:${a.aiState}${a.leashOut ? '!' : ''} cd[${cdl}] @(${fmt(a.x)},${fmt(a.z)}) tgt#${t ? t.id + ' ' + t.kind + ' d' + fmt(Math.hypot(t.x - a.x, t.z - a.z)) + ' anc' + fmt(Math.hypot(t.x - anc.x, t.z - anc.z)) : '-'} near ${fmt(nh)}`;
      });
      const hpl = allE.filter((x) => x.partyIndex !== undefined).sort((x, y) => x.partyIndex - y.partyIndex).map((x) => Math.round(x.hp)).join('/');
      const stg = allE.find((x) => x.kind === 'stag');
      console.log(`t${i - cur.t0} HP[${hpl}] stag${stg ? Math.round(stg.hp) + '@(' + fmt(stg.x) + ',' + fmt(stg.z) + ')tg' + stg.targetId : '-'} anc ${ws ? 'WS' : 'PL'}(${fmt(anc.x)},${fmt(anc.z)}) pl(${fmt(pl.x)},${fmt(pl.z)}) H${hs.length} [${hs.slice(0, 6).map((h) => h.kind + ':' + fmt(Math.hypot(h.x - anc.x, h.z - anc.z)) + (h.hittable === false ? 'x' : '')).join(' ')}] | ${line.join(' | ')}`);
    }
    const v = run.view();
    if (v.phase === 'victory' || v.phase === 'defeat') {
      outcome = v.phase;
      break;
    }
    if (stopNow) {
      outcome = 'stopped';
      break;
    }
  }
  if (lv && !lv.outcome) lv.outcome = outcome;
  const idle = [];
  let pairs = 0;
  let totalCasts = 0;
  let fallbacks = 0;
  for (const L of levels)
    for (const r of L.rooms) {
      if (r.mode === 'shop' || r.end == null) continue;
      if (r.ai0 && r.ai1)
        for (const k of [1, 2, 3])
          for (const [id, rec] of Object.entries(r.ai1[k] || {})) {
            const b = (r.ai0[k] || {})[id] || { casts: 0, fallbacks: 0 };
            totalCasts += rec.casts - b.casts;
            fallbacks += rec.fallbacks - b.fallbacks;
          }
      if (r.end - r.t0 < 1200) continue;
      for (const k of [1, 2, 3]) {
        const eq = r.lo[k - 1].filter((s) => s && !PASSIVE.has(s) && (!r.lo2 || r.lo2[k - 1].includes(s)));
        for (const s of eq) {
          pairs++;
          if (!r.casts[k][s]) idle.push(`L${L.level}r${r.room}${r.mode === 'defend' ? 'D' : r.mode === 'boss' ? 'B' : ''} s${k} ${s} ${((r.end - r.t0) / 60).toFixed(0)}s`);
        }
      }
    }
  const basicsL12 = [];
  for (const L of levels) if (L.level <= 2) for (const r of L.rooms) if (r.mode !== 'shop' && r.mode !== 'boss' && r.end != null) basicsL12.push([r.basics[1], r.basics[2], r.basics[3]]);
  const perLevel = levels.map((L) => ({
    level: L.level,
    outcome: L.outcome,
    downs: L.downs,
    dmgMed: med(L.rooms.filter((r) => r.mode === 'kill_all' || r.mode === 'defend').map((r) => r.dmg)),
    ticksMed: med(L.rooms.filter((r) => (r.mode === 'kill_all' || r.mode === 'defend') && r.end != null).map((r) => r.end - r.t0)),
    bossDmg: (L.rooms.find((r) => r.mode === 'boss') || {}).dmg ?? null,
    victim: (() => { const o = {}; for (const r of L.rooms) if (r.mode === 'kill_all' || r.mode === 'defend') for (const [k, v] of Object.entries(r.byVictim)) o[k] = (o[k] || 0) + v; for (const k of Object.keys(o)) o[k] = Math.round(o[k]); return o; })(),
    downRooms: L.rooms.filter((r) => r.downs).map((r) => `r${r.room}${r.mode[0]}:${JSON.stringify(r.downsBy)}`),
    minHp: (() => { const o = {}; for (const r of L.rooms) for (const [k, v] of Object.entries(r.minHp)) { const key = (r.mode === 'boss' ? 'B' : 'R') + k; o[key] = Math.min(o[key] ?? 1, v); } for (const k of Object.keys(o)) o[k] = Math.round(o[k] * 100); return o; })(),
    nearTank: med(L.rooms.flatMap((r) => r.near[1])),
    nearSword: med(L.rooms.flatMap((r) => r.near[2])),
  }));
  return {
    seed, outcome, idle, pairs, totalCasts, fallbacks,
    fallbackPct: totalCasts ? +((100 * fallbacks) / totalCasts).toFixed(1) : null,
    basicsL12, perLevel,
    rooms: levels.flatMap((L) => L.rooms.map((r) => ({ L: L.level, room: r.room, mode: r.mode, sec: r.end != null ? +((r.end - r.t0) / 60).toFixed(1) : null, dmg: Math.round(r.dmg), downs: r.downs, basics: r.basics, casts: r.casts, lo: r.lo }))),
  };
}

const out = { from: FROM, seeds: SEEDS, root: ROOT, legacy: LEGACY, runs: [] };
for (const s of SEEDS) {
  const t0 = Date.now();
  const r = await runOne(s);
  out.runs.push(r);
  const lowB = r.basicsL12.filter((b) => b[0] <= 7 && b[1] <= 7).length;
  const f = (x) => (x == null ? '-' : typeof x === 'number' ? +x.toFixed(2) : x);
  console.log(`seed ${s} ${r.outcome} ${((Date.now() - t0) / 1000).toFixed(0)}s idle ${r.idle.length}/${r.pairs} fallback ${r.fallbackPct}% | L1-2 rooms tank+sword basics<=7: ${lowB}/${r.basicsL12.length} | ${r.perLevel.map((p) => `L${p.level}:${p.outcome} downs ${p.downs} dmg ${f(p.dmgMed)} t ${p.ticksMed} boss ${f(p.bossDmg)} nearT ${f(p.nearTank)} nearS ${f(p.nearSword)} vict ${JSON.stringify(p.victim)} minHp% ${JSON.stringify(p.minHp)} ${p.downRooms.join(',')}`).join(' | ')}`);
  if (r.idle.length && !QUIET) console.log('   idle:', r.idle.join('; '));
}
const all = out.runs;
const idleN = all.reduce((a, r) => a + r.idle.length, 0);
const pairsN = all.reduce((a, r) => a + r.pairs, 0);
const downSeeds = {};
for (const r of all) for (const p of r.perLevel) (downSeeds[p.level] = downSeeds[p.level] || []).push(p.downs);
console.log(`TOTAL idle ${idleN}/${pairsN}; downs per level per seed ${JSON.stringify(downSeeds)}; fallback ${all.map((r) => r.fallbackPct).join('/')}%`);
if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 1));
