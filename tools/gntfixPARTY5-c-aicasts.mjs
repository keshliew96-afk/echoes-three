// gntcparty5 — independent carried-campaign AI probe (Node). Casts per skill per level per seat,
// idle equipped actives, downs, outcomes, shield uptime, Tank aggro share, distances at cast.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const sa = opt('seeds', '1-3');
const SEEDS = sa.includes('-') ? (() => { const [a, b] = sa.split('-').map(Number); return Array.from({ length: b - a + 1 }, (_, i) => a + i); })() : sa.split(',').map(Number);
const FROM = Number(opt('from', '1'));
const u = (p) => pathToFileURL(join(here, p)).href;
const T = {
  rng: await import(u('src/core/rng.js')), reg: await import(u('src/core/registry.js')), ev: await import(u('src/core/events.js')),
  clk: await import(u('src/core/clock.js')), world: await import(u('src/sim/world.js')), intents: await import(u('src/core/intents.js')),
  skills: await import(u('src/sim/skills.js')),
};
const med = (a) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r2 = (v) => (v == null ? v : Math.round(v * 100) / 100);
function run(seed) {
  let impl = T.rng.createGameplayRng(seed);
  const rng = {
    stream: 'gameplay', get seed() { return impl.seed; }, get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(), range: (a, b) => impl.range(a, b), int: (n) => impl.int(n), chance: (q) => impl.chance(q), pick: (a) => impl.pick(a),
    reseed: (s) => { impl = T.rng.createGameplayRng(s >>> 0); return impl.seed; }, getState: () => impl.getState(),
    setState: (st) => { impl = T.rng.createGameplayRng(st.seed >>> 0); return impl.setState(st); },
  };
  const registry = T.reg.createRegistry(); const bus = T.ev.createEventBus(); const clock = T.clk.createClock();
  const world = T.world.createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const P = world.partySystem();
  const byId = (id) => registry.byId(id);
  const ally = (i) => registry.all().find((e) => e.partyIndex === i);
  const D = { casts: {}, healer: {}, rooms: [], downs: [], shieldTicks: {}, combatTicks: {}, aim: { tank: 0, all: 0 }, dist: { 1: [], 2: [], 3: [] }, defeatAt: null, levelsCleared: [], evTypes: {} };
  let room = null; let level = FROM;
  bus.on('*', (e) => {
    const t = e.type;
    if (/down|revive/.test(t)) D.evTypes[t] = (D.evTypes[t] || 0) + 1;
    if (t === 'room_start') {
      const v = world.runSystem().view();
      room = { level: v.act, room: v.room, mode: v.mode, start: e.tick, end: null, loadouts: [0, 1, 2, 3].map((i) => (i ? [...P.slots(i)] : null)), casts: {} };
      D.rooms.push(room);
    } else if (t === 'room_cleared' && room) room.end = e.tick;
    else if (t === 'level_start') level = e.level ?? level;
    else if (t === 'level_clear') D.levelsCleared.push(e.level);
    else if (t === 'ally_cast' && e.inputSeq === undefined && !e.echo) {
      const k = `L${level}|${e.partyIndex}|${e.skill}`;
      D.casts[k] = (D.casts[k] || 0) + 1;
      if (room) room.casts[`${e.partyIndex}:${e.skill}`] = (room.casts[`${e.partyIndex}:${e.skill}`] || 0) + 1;
      const a = byId(e.id);
      if (a) {
        let bd = Infinity;
        for (const h of registry.all()) { if (h.faction !== 'hostile' || !(h.hp > 0)) continue; bd = Math.min(bd, Math.hypot(h.x - (e.x ?? a.x), h.z - (e.z ?? a.z))); }
        if (Number.isFinite(bd) && D.dist[e.partyIndex]) D.dist[e.partyIndex].push(bd);
      }
    } else if (t === 'skill_cast') { const k = `L${level}|0|${e.skill || e.id}`; D.healer[k] = (D.healer[k] || 0) + 1; }
    if (t === 'party_down' || t === 'ally_down' || t === 'player_down' || t === 'downed') D.downs.push({ level, room: room && room.room, t });
  });
  const ap = world.runSystem().autopilot;
  const step = (n) => { for (let k = 0, g = 0; k < n && g < n * 8 + 64; g++) if (clock.stepOnce((t) => world.step(t, ap.intents(t, T.intents.emptySnapshot())))) k += 1; };
  world.runSystem().startCampaign({ level: FROM, challenge: 'standard', harness: true });
  ap.configure(true);
  let lastKey = ''; let lastProg = 0; let stuck = null;
  for (let t = 0; t < 320000; t += 10) {
    step(10);
    const v = world.runSystem().view();
    if (room && room.end === null && v.phase === 'combat') {
      const tk = (ally(1) || {}).id;
      for (const h of registry.all()) {
        if (h.faction !== 'hostile' || !(h.hp > 0) || h.targetId == null) continue;
        const tg = byId(h.targetId); if (!tg || tg.partyIndex === undefined) continue;
        D.aim.all += 1; if (h.targetId === tk) D.aim.tank += 1;
      }
      for (const b of registry.all().filter((x) => x.partyIndex !== undefined)) {
        const kk = `L${level}|${b.partyIndex}`;
        D.combatTicks[kk] = (D.combatTicks[kk] || 0) + 10;
        const sh = b.status && b.status.shield;
        if (sh && (sh.amount > 0 || sh.hp > 0 || sh.value > 0)) D.shieldTicks[kk] = (D.shieldTicks[kk] || 0) + 10;
      }
    }
    const key = `${v.act}:${v.room}:${v.phase}`; if (key !== lastKey) { lastKey = key; lastProg = world.tick; }
    if (v.phase === 'defeat' && !D.defeatAt) D.defeatAt = { level: v.act, room: v.room };
    if (v.phase === 'idle' || v.phase === 'victory' || v.phase === 'defeat') break;
    if (world.tick - lastProg > 10800) { stuck = key; break; }
  }
  const out = world.runSystem().view();
  const idle = [];
  for (const rm of D.rooms) {
    if (rm.end == null) continue;
    const secs = (rm.end - rm.start) / 60; if (secs < 20) continue;
    for (const s of [1, 2, 3]) for (const id of rm.loadouts[s]) {
      if (!id) continue; const def = T.skills.SKILLS[id]; if (!def || def.shape === 'aura' || def.passive) continue;
      if (!rm.casts[`${s}:${id}`]) idle.push({ L: rm.level, room: rm.room, mode: rm.mode, seat: s, id, secs: r2(secs) });
    }
  }
  return {
    seed, outcome: out.phase, defeatAt: D.defeatAt, stuck, ticks: world.tick, casts: D.casts, healer: D.healer, idle, downs: D.downs, evTypes: D.evTypes,
    shieldUptime: Object.fromEntries(Object.entries(D.combatTicks).map(([k, v]) => [k, r2((D.shieldTicks[k] || 0) / v)])),
    tankAimShare: r2(D.aim.tank / Math.max(1, D.aim.all)), distMed: { tank: r2(med(D.dist[1])), sword: r2(med(D.dist[2])), archer: r2(med(D.dist[3])) },
    levelsCleared: D.levelsCleared, rooms: D.rooms.map((r) => ({ L: r.level, room: r.room, mode: r.mode, secs: r.end ? r2((r.end - r.start) / 60) : null, loadouts: r.loadouts, casts: r.casts })),
    finalLoadouts: [1, 2, 3].map((i) => P.slots(i)), finalFilled: [1, 2, 3].map((i) => P.view(i).filled),
  };
}
const res = SEEDS.map(run);
writeFileSync(join(here, `captures/gntfixPARTY5-aicasts-from${FROM}.json`), JSON.stringify(res, null, 1));
for (const r of res) console.log(`seed ${r.seed}: ${r.outcome} defeatAt=${JSON.stringify(r.defeatAt)} cleared=${r.levelsCleared} ticks=${r.ticks} idle=${r.idle.length} downs=${r.downs.length} ev=${JSON.stringify(r.evTypes)} tankAim=${r.tankAimShare} dist=${JSON.stringify(r.distMed)} final=${JSON.stringify(r.finalLoadouts)} filled=${r.finalFilled}`);
const agg = {};
for (const r of res) for (const [k, v] of Object.entries(r.casts)) agg[k] = (agg[k] || 0) + v;
console.log('CASTS', JSON.stringify(agg));
const hagg = {}; for (const r of res) for (const [k, v] of Object.entries(r.healer)) hagg[k] = (hagg[k] || 0) + v;
console.log('HEALER', JSON.stringify(hagg));
console.log('IDLE', JSON.stringify(res.flatMap((r) => r.idle.map((x) => ({ seed: r.seed, ...x })))));
console.log('SHIELD', JSON.stringify(res.map((r) => r.shieldUptime)));
