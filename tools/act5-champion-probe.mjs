#!/usr/bin/env node
// ACT V CHAMPION, EVENTS AND DEEDS probe (plan 4 slice 7, docs/ACT_V.md
// "Slice 7"), headless sim, no browser:
//   herald   Level V's crown door leads to the Gale Herald: its Gale Call
//            throws the heroes it hits away down the wind, its Stoop glides
//            it onto the marked ring and lands there; a mid-stoop capture
//            continues bit-identically in a fresh world
//   vane     the Vane Cock marks a 48-tick lane and looses three darts down
//            it, nine ticks apart, that hit a hero standing in it
//   sacrist  the Bell Sacristan hushes two or more kin round it (40% less
//            damage for 5 s, never a champion), and raps a hero when alone
//   roster   both are Level V creatures from room 3, campaign rooms only
//            (the legacy single-level run never plans them)
//   relics   the Hushbell adds 25% on an enemy mid-warning only; the
//            Weathercock Plume is dodge and knockback; both have heirlooms
//   deeds    Skyward, Windfall, Five Crowns and Break the Hush test what they
//            say; Four Crowns still needs only the first four; two Spire
//            tints; the Journal lists the three new rows
//
//   node tools/act5-champion-probe.mjs [--seed 4] [--out captures/act5-champion-probe.json]
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { hashState } = await import(u('src/core/hash.js'));
const { canonicalJSON } = await import(u('src/core/canonical.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { clonePlain } = await import(u('src/save/codec.js'));
const { LEVELS, CAMPAIGN_ONLY_ENEMIES } = await import(u('src/data/levels.js'));
const { BESTIARY } = await import(u('src/data/journal.js'));
const { RELICS } = await import(u('src/sim/relics.js'));
const { DEEDS, UNLOCKS } = await import(u('src/data/unlocks.js'));
const C = await import(u('src/sim/champions.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEED = Number(opt('seed', '4'));
const OUT = opt('out', 'captures/act5-champion-probe.json');

const results = [];
let failed = 0;
function check(leg, name, ok, detail = null) {
  results.push({ leg, name, ok: !!ok, ...(detail !== null ? { detail } : {}) });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null ? ` ${JSON.stringify(detail)}` : ''}`);
  return !!ok;
}

function build(seed) {
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
    getState: () => impl.getState(),
    setState: (st) => { impl = createGameplayRng(st.seed >>> 0); return impl.setState(st); },
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const ap = world.runSystem().autopilot;
  const io = createStateIO({ clock, rng, registry, world });
  const log = [];
  let rec = null;
  bus.on('*', (e) => {
    if (rec && e.type !== 'sound') rec.push(e);
    if (e.type !== 'sound') log.push(e);
    if (log.length > 60000) log.splice(0, 20000);
  });
  const step = () => clock.stepOnce((t) => world.step(t, ap.active() ? ap.intents(t, emptySnapshot()) : emptySnapshot()));
  function continuation(n, every = 60) {
    rec = [];
    const hashes = [];
    for (let done = 0; done < n; done += every) {
      for (let k = 0; k < every; k++) step();
      hashes.push(hashState(io.capture()));
    }
    const events = rec.map((e) => canonicalJSON(e));
    rec = null;
    return { hashes, events };
  }
  return { registry, bus, clock, world, ap, io, step, continuation, log, run: () => world.runSystem() };
}
const holdParty = (w) => {
  for (const e of w.registry.all()) if (e.partyIndex !== undefined && e.hp > 0) e.hp = e.maxHp;
};
const party = (w) => w.registry.all().filter((e) => e.partyIndex !== undefined);
const player = (w) => w.registry.all().find((e) => e.partyIndex === 0);
const seen = (w, type, pred = () => true) => w.log.filter((e) => e.type === type && pred(e));
function stage(seed, level, n = 3) {
  const w = build(seed);
  w.run().startCampaign({ level, harness: true });
  w.world.cmd('skipToRoom', n);
  for (let i = 0; i < 30; i++) w.step();
  w.world.cmd('killAllEnemies');
  for (let i = 0; i < 4; i++) w.step();
  holdParty(w);
  return w;
}
function spawnAt(w, kind, x, z, hp = 600) {
  const r = w.world.cmd('spawn', kind, x, z);
  const id = typeof r === 'object' && r ? r.id : r;
  const e = w.registry.byId(id);
  if (e) {
    e.maxHp = hp;
    e.hp = hp;
    e.elite = false;
    delete e.affixes;
  }
  return id;
}
// Everything hostile but `keep` melts (a staged fight stays one-on-one).
function thin(w, keep, soft = false) {
  for (const x of w.registry.all()) if (x.faction === 'hostile' && !keep.includes(x.id) && x.hp > 0 && x.kind !== 'eshot' && x.state === 'active') {
      if (soft) x.hp = 0.001;
      else w.world.cmd('setHp', x.id, 0);
    }
}

// -------------------------------------------------------------- herald --
let heraldSave = null;
{
  const w = build(SEED);
  w.run().startCampaign({ level: 5, harness: true });
  check('herald', "Level V's champion is the Gale Herald (no longer the Hollow Choir)", C.championFor(5).id === 'gale_herald' && C.CHAMPION_IDS.length === 5);
  w.run().cmd('championRoom', [4]);
  w.world.cmd('skipToRoom', 4);
  w.ap.configure(false);
  for (let i = 0; i < 240 && !seen(w, 'champion_spawn').length; i++) w.step();
  const sp = seen(w, 'champion_spawn')[0];
  const e = sp ? w.registry.byId(sp.id) : null;
  check('herald', 'the crown room spawns it with the room\'s champion HP', !!e && e.kind === 'gale_herald' && Math.abs(e.maxHp - C.CHAMPION_RULES.hp * w.run().roomPlan().hpMul) < 1, e && { kind: e.kind, hp: e.maxHp });
  // Throws: track each Gale Call that hit someone and how far the heroes it
  // struck travel over the next 12 ticks.
  const calls = [];
  const stoops = [];
  let flew = false;
  for (let i = 0; i < 60 * 60 && (calls.filter((c) => c.moved !== null).length < 1 || stoops.length < 2); i++) {
    holdParty(w);
    thin(w, [e.id], true);
    if (e.flight) flew = true;
    if (!heraldSave && e.flight && e.telegraph && w.clock.tick - e.telegraph.startTick > 20) heraldSave = clonePlain(w.io.capture());
    const n = w.log.length;
    w.step();
    for (const ev of w.log.slice(n)) {
      if (ev.type === 'champion_move' && ev.id === e.id && ev.move === 'gale_call' && ev.victims > 0) {
        const struck = seen(w, 'hit', (h) => h.attacker === e.id && h.tick === ev.tick).map((h) => h.target);
        calls.push({ tick: ev.tick, from: struck.map((id) => { const b = w.registry.byId(id); return [id, b.x, b.z]; }), moved: null });
      }
      if (ev.type === 'champion_move' && ev.id === e.id && ev.move === 'stoop') stoops.push({ mark: [ev.x, ev.z], at: [e.x, e.z], flier: !!e.flier });
    }
    for (const c of calls) {
      if (c.moved === null && w.clock.tick >= c.tick + 13) {
        c.moved = Math.max(...c.from.map(([id, x, z]) => { const b = w.registry.byId(id); return b ? Math.hypot(b.x - x, b.z - z) : 0; }));
      }
    }
  }
  const thrown = calls.find((c) => c.moved !== null);
  check('herald', 'Gale Call throws the heroes it hits about 2.4 u down the wind', !!thrown && thrown.moved >= 1.5 && thrown.moved <= 3.4, thrown ?? calls);
  check('herald', 'Stoop: it takes wing for the warning (a flier while aloft)', flew);
  const landed = stoops.length > 0 && stoops.every((s) => Math.hypot(s.at[0] - s.mark[0], s.at[1] - s.mark[1]) < 0.35 && !s.flier);
  check('herald', 'Stoop: it lands on the marked ring when the warning ends and is grounded again', landed, stoops);
  const hitByStoop = seen(w, 'champion_move', (x) => x.id === e.id && x.move === 'stoop' && x.victims > 0).length;
  check('herald', 'Stoop lands its blow on a hero who stays on the mark', hitByStoop > 0, { hitByStoop });
}
if (heraldSave) {
  const a = build(SEED);
  a.io.apply(clonePlain(heraldSave));
  const b = build(SEED + 99);
  b.io.apply(clonePlain(heraldSave));
  const ra = a.continuation(600);
  const rb = b.continuation(600);
  check('herald', 'a mid-stoop capture continues bit-identically in a fresh world (600 ticks)', JSON.stringify(ra) === JSON.stringify(rb) && ra.events.length > 0, { hashes: ra.hashes.length, events: ra.events.length });
} else check('herald', 'a mid-stoop capture was taken', false);

// ---------------------------------------------------------------- vane --
{
  const w = stage(SEED, 5);
  w.ap.configure(false);
  const p = player(w);
  const id = spawnAt(w, 'vane', p.x, p.z - 5.0);
  for (let i = 0; i < 900 && seen(w, 'vane_volley', (e) => e.id === id).length < 1; i++) {
    holdParty(w);
    thin(w, [id]);
    w.step();
  }
  for (let i = 0; i < 90; i++) {
    holdParty(w);
    w.step();
  }
  const tel = seen(w, 'telegraph_start', (e) => e.id === id)[0];
  const vol = seen(w, 'vane_volley', (e) => e.id === id)[0];
  const darts = seen(w, 'enemy_fire', (e) => e.id === id).map((e) => e.tick);
  check('vane', 'marks a 48-tick lane, then looses three darts nine ticks apart down it', tel && tel.resolveTick - tel.tick === 48 && vol && darts.length >= 3 && darts[1] - darts[0] === 9 && darts[2] - darts[1] === 9 && darts[0] === vol.tick, { tel, darts });
  // (A shot's hit carries no attacker; a shield may soak it.)
  const hits = seen(w, 'hit', (e) => e.delivery === 'shot' && vol && e.tick >= vol.tick && (e.amount > 0 || e.absorbed > 0));
  check('vane', 'the darts strike a hero standing in the lane', hits.length > 0, { hits: hits.length });
}

// ----------------------------------------------------------- sacristan --
{
  const w = stage(SEED, 5);
  w.ap.configure(false);
  const p = player(w);
  const kinA = spawnAt(w, 'chime', p.x - 1.2, p.z - 5.6);
  const kinB = spawnAt(w, 'husk', p.x + 1.2, p.z - 5.6);
  const id = spawnAt(w, 'sacristan', p.x, p.z - 6.4);
  let hush = null;
  for (let i = 0; i < 900 && !hush; i++) {
    holdParty(w);
    thin(w, [id, kinA, kinB]);
    // Keep the kin beside it (they would walk off to the party).
    const s = w.registry.byId(id);
    for (const [k, dx] of [[kinA, -1.0], [kinB, 1.0]]) {
      const b = w.registry.byId(k);
      if (b && s) {
        b.x = b.px = s.x + dx;
        b.z = b.pz = s.z;
      }
    }
    w.step();
    hush = seen(w, 'sacristan_hush', (e) => e.id === id)[0] ?? null;
  }
  const tel = seen(w, 'telegraph_start', (e) => e.id === id)[0];
  const a = w.registry.byId(kinA);
  const b = w.registry.byId(kinB);
  check('sacrist', 'rings a 54-tick hush (r 3.6) over two kin, no hit on the party', !!hush && tel && tel.resolveTick - tel.tick === 54 && !tel.playerTargeted && hush.kin.includes(kinA) && hush.kin.includes(kinB) && !hush.kin.includes(id), { tel, hush });
  check('sacrist', 'its kin are hushed for 5 s at 60% damage taken', !!a && !!b && a.hushUntil === hush.untilTick && b.hushMul === 0.6 && hush.untilTick - hush.tick === 300, a && { until: a.hushUntil, mul: b.hushMul });
  // The hush on a real blow: the same relicHit on hushed and unhushed kin.
  const blow = (tid) => {
    const n = w.log.length;
    w.world.cmd('relicHit', tid, party(w)[1].id, 20, false);
    const h = w.log.slice(n).find((e) => e.type === 'hit' && e.target === tid);
    return h ? h.amount / (h.crit ? 1.5 : 1) : NaN;
  };
  const hushed = blow(kinA);
  a.hushUntil = 0;
  const plain = blow(kinA);
  check('sacrist', `a hushed enemy takes 40% less (${hushed.toFixed(2)} vs ${plain.toFixed(2)})`, Math.abs(hushed / plain - 0.6) < 0.01, { hushed, plain });
  // Never a champion.
  const w2 = build(SEED);
  w2.run().startCampaign({ level: 5, harness: true });
  w2.run().cmd('championRoom', [4]);
  w2.world.cmd('skipToRoom', 4);
  w2.ap.configure(false);
  for (let i = 0; i < 240 && !seen(w2, 'champion_spawn').length; i++) w2.step();
  const ch = w2.registry.byId(seen(w2, 'champion_spawn')[0].id);
  const s2 = spawnAt(w2, 'sacristan', ch.x + 1.0, ch.z);
  const k2 = spawnAt(w2, 'husk', ch.x - 1.0, ch.z);
  const k3 = spawnAt(w2, 'chime', ch.x, ch.z + 1.0);
  let h2 = null;
  for (let i = 0; i < 900 && !h2; i++) {
    holdParty(w2);
    thin(w2, [ch.id, s2, k2, k3]);
    // Champion and kin stand round the sacristan.
    const sb = w2.registry.byId(s2);
    for (const [k, dx, dz] of [[ch.id, -1.2, 0], [k2, 1.0, 0], [k3, 0, 1.0]]) {
      const b = w2.registry.byId(k);
      if (b && sb) {
        b.x = b.px = sb.x + dx;
        b.z = b.pz = sb.z + dz;
      }
    }
    w2.step();
    h2 = seen(w2, 'sacristan_hush', (e) => e.id === s2)[0] ?? null;
  }
  check('sacrist', 'the hush never covers a champion', !!h2 && !h2.kin.includes(ch.id) && !(ch.hushUntil > 0), h2);
  // Alone, it raps.
  const w3 = stage(SEED + 1, 5);
  w3.ap.configure(false);
  const p3 = player(w3);
  const s3 = spawnAt(w3, 'sacristan', p3.x, p3.z - 2.5);
  let rap = null;
  for (let i = 0; i < 900 && !rap; i++) {
    holdParty(w3);
    thin(w3, [s3]);
    w3.step();
    rap = seen(w3, 'sacristan_rap', (e) => e.id === s3 && e.victims > 0)[0] ?? null;
  }
  check('sacrist', 'alone it walks in and raps a hero with its bell', !!rap && !seen(w3, 'sacristan_hush', (e) => e.id === s3).length, rap);
}

// -------------------------------------------------------------- roster --
{
  const L5 = LEVELS[5];
  check('roster', 'Level V lists the Vane Cock and the Bell Sacristan, introduced from room 3', L5.roster.vane > 0 && L5.roster.sacristan > 0 && L5.introduce.vane === 3 && L5.introduce.sacristan === 3);
  check('roster', 'both are campaign-only kinds', CAMPAIGN_ONLY_ENEMIES.includes('vane') && CAMPAIGN_ONLY_ENEMIES.includes('sacristan'));
  // Real Level V campaigns on the autopilot meet them, never before room 3.
  const early = [];
  const met = new Set();
  for (const s of [1, 2, 3, 4, 5, 6]) {
    const w = build(s);
    w.run().startCampaign({ level: 5, harness: true });
    w.ap.configure(true);
    let room = 1;
    for (let i = 0; i < 60 * 60 * 8 && room <= 6; i++) {
      w.step();
      const v = w.run().view();
      room = v.room ?? room;
      holdParty(w);
    }
    for (const ev of seen(w, 'enemy_spawn', (e) => e.etype === 'vane' || e.etype === 'sacristan')) {
      met.add(ev.etype);
      if ((ev.room ?? 99) < 3) early.push(ev);
    }
    const sp = seen(w, 'spawn', (e) => e.etype === 'vane' || e.etype === 'sacristan' || e.kind === 'vane' || e.kind === 'sacristan');
    for (const ev of sp) met.add(ev.etype ?? ev.kind);
  }
  check('roster', 'Level V campaigns on the autopilot meet both (seeds 1-6)', met.has('vane') && met.has('sacristan'), [...met]);
  check('roster', 'never before room 3', early.length === 0, early.slice(0, 2));
  // The legacy single-level run of Act V never plans them.
  const w = build(SEED);
  w.run().startRun({ act: 5 });
  let legacy = 0;
  for (let i = 0; i < 60 * 40; i++) {
    w.step();
    holdParty(w);
  }
  legacy = seen(w, 'enemy_spawn', (e) => e.etype === 'vane' || e.etype === 'sacristan').length;
  check('roster', 'the legacy single-level run never spawns them', legacy === 0, { legacy });
}

// -------------------------------------------------------------- relics --
{
  check('relics', 'the Spire pair: Weathercock Plume (common, dodge and knockback) and the Hushbell (rare)', RELICS.weathercock_plume?.rarity === 'common' && RELICS.weathercock_plume.dodgeCd === -0.15 && RELICS.weathercock_plume.kb === 0.3 && RELICS.hushbell?.rarity === 'rare' && !RELICS.hushbell.cls && !RELICS.weathercock_plume.cls);
  check('relics', 'each has its heirloom', UNLOCKS.heirloom_weathercock_plume?.relic === 'weathercock_plume' && UNLOCKS.heirloom_hushbell?.relic === 'hushbell');
  const w = stage(SEED, 5);
  w.ap.configure(false);
  w.world.cmd('relicGrant', 'hushbell');
  const p = player(w);
  const id = spawnAt(w, 'vane', p.x, p.z - 5.0);
  const blow = () => {
    const n = w.log.length;
    w.registry.byId(id).status = {}; // no Archer's exposure in the sum
    w.world.cmd('relicHit', id, party(w)[1].id, 20, false);
    const h = w.log.slice(n).find((e) => e.type === 'hit' && e.target === id);
    return h ? h.amount / (h.crit ? 1.5 : 1) : NaN;
  };
  const calm = blow();
  let warn = NaN;
  for (let i = 0; i < 900 && Number.isNaN(warn); i++) {
    holdParty(w);
    thin(w, [id]);
    w.step();
    if (w.registry.byId(id)?.telegraph) warn = blow();
  }
  check('relics', `the Hushbell: +25% on an enemy mid-warning only (${calm.toFixed(2)} -> ${warn.toFixed(2)})`, Math.abs(warn / calm - 1.25) < 0.01, { calm, warn });
}

// --------------------------------------------------------------- deeds --
{
  const facts = (o = {}) => ({ cleared: [], bosses: [], champions: [], relics: [], vows: [], runs: 1, challenge: 'standard', ...o });
  check('deeds', 'Skyward: clear Level V', DEEDS.skyward && DEEDS.skyward.test(facts({ cleared: [5] })) && !DEEDS.skyward.test(facts({ cleared: [4] })));
  check('deeds', 'Windfall: fell the Gale Herald', DEEDS.windfall && DEEDS.windfall.test(facts({ champions: ['gale_herald'] })) && !DEEDS.windfall.test(facts({ champions: ['hollow_choir'] })));
  const four = { champion: ['briar_knight', 'sluice_warden', 'bone_reeve', 'hollow_choir'] };
  const five = { champion: [...four.champion, 'gale_herald'] };
  check('deeds', 'Four Crowns still needs only the first four; Five Crowns needs the Herald too', DEEDS.four_crowns.test(facts(), four) && DEEDS.four_crowns.goal(four)[1] === 4 && !DEEDS.five_crowns.test(facts(), four) && DEEDS.five_crowns.test(facts(), five) && DEEDS.five_crowns.goal(four).join() === '4,5');
  check('deeds', 'Break the Hush: the Hush felled on Harrowing only', DEEDS.break_the_hush.test(facts({ bosses: ['hush'], challenge: 'harrowing' })) && !DEEDS.break_the_hush.test(facts({ bosses: ['hush'] })) && !DEEDS.break_the_hush.test(facts({ bosses: ['skyhorn'], challenge: 'harrowing' })));
  check('deeds', 'two Spire tints: Still Air (Level V, 40) and Gale Bronze (Windfall, free)', UNLOCKS.tint_stillair?.req?.level === 5 && UNLOCKS.tint_stillair.cost === 40 && UNLOCKS.tint_galebronze?.req?.deed === 'windfall' && UNLOCKS.tint_galebronze.cost === 0);
  const rows = ['gale_herald', 'vane', 'sacristan'].map((id) => BESTIARY.find((b) => b.id === id));
  check('deeds', 'the Journal lists the Herald (Champion, Level V) and both creatures on the Spire', rows.every((r) => r && r.lore && r.text && r.lands.includes(5)) && rows[0].champion, rows.map((r) => r && { id: r.id, lands: r.lands }));
}

mkdirSync(dirname(resolve(here, OUT)), { recursive: true });
writeFileSync(resolve(here, OUT), JSON.stringify({ seed: SEED, failed, results }, null, 1));
console.log(`${results.length - failed}/${results.length} checks pass -> ${OUT}`);
process.exit(failed ? 1 : 0);
