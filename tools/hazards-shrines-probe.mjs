#!/usr/bin/env node
// HAZARDS AND SHRINES probe (docs/SHRINES.md, content plan 4 slice 9) —
// headless Node, the sim built like src/main.js (no render, no DOM).
//
//   node tools/hazards-shrines-probe.mjs
//
// Checks:
//   1. Spurs wiring: the Heart's hazard list and its layouts carry 'spur'
//      (from room 2 on); no other land does.
//   2. Spurs fire: a Heart room 3 telegraphs a ring on a hero's last spot,
//      the burst hurts a hero standing in it and leaves a crystal pillar; at
//      most three pillars stand.
//   3. Spurs determinism: a capture mid-wind-up continues bit-identically.
//   4. Shrine placement: one shrine a level, in the first combat room from
//      its hashed aim (4-6), never the boss room; none in Boss Rush, the
//      tutorial or the legacy single-level run.
//   5. Each land's trade: price paid, blessing laid on every hero, a price
//      the party cannot pay is refused and the shrine stays.
//   6. Blessing multipliers: speed, damage dealt, damage taken; expiry.
//   7. Geode Shrine: the key goes, a greater relic pick at the clear.
//      Grave Shrine: the next combat room is cursed.
//   8. Saves: the shrine state survives a capture.
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { hashState } = await import(u('src/core/hash.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { clonePlain } = await import(u('src/save/codec.js'));
const { LEVELS } = await import(u('src/data/levels.js'));
const { LAYOUTS } = await import(u('src/data/layouts.js'));
const { SHRINES, SHRINE_RULES, BLESSINGS } = await import(u('src/sim/shrines.js'));
const { speedMul, damageDealtMul, damageTakenMul } = await import(u('src/sim/status.js'));

function makeWorld(seed, { harness = false } = {}) {
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
  const world = createWorld({ rng, registry, events: bus, harness, requestHitstop: clock.requestHitstop, room: null });
  const io = createStateIO({ clock, rng, registry, world });
  const log = [];
  bus.on('*', (e) => {
    if (e.type !== 'sound') log.push(e);
  });
  const run = world.runSystem();
  const step = () => clock.stepOnce((t) => world.step(t, emptySnapshot()));
  return { world, registry, bus, clock, run, log, step, io };
}

const fails = [];
const passes = [];
const check = (ok, what) => {
  (ok ? passes : fails).push(what);
  console.log(ok ? 'ok  ' : 'FAIL', what);
  return ok;
};
const steps = (W, n) => {
  const until = W.clock.tick + n;
  for (let i = 0; i < n * 4 && W.clock.tick < until; i++) W.step();
};
const heroes = (W) => W.registry.all().filter((e) => e.partyIndex !== undefined);
const mend = (W) => {
  for (const e of heroes(W)) e.hp = e.maxHp;
};
const toCombat = (W) => {
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
};
function campaignRoom(level, seed, n, { shrineAt = null } = {}) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level, harness: true });
  if (shrineAt !== null) W.run.cmd('shrineRoom', [shrineAt]);
  W.world.cmd('skipToRoom', n);
  toCombat(W);
  return W;
}

// 1 ---------------------------------------------------------- wiring --
{
  const lands = Object.values(LEVELS).map((L) => [L.biome, (L.hazards ?? []).includes('spur')]);
  check(lands.filter(([, s]) => s).map(([b]) => b).join() === 'heart', `only the Heart lists spurs (${lands.map(([b, s]) => `${b}:${s}`).join(' ')})`);
  const all = JSON.stringify(LAYOUTS);
  const n = (all.match(/"type":"spur"/g) || []).length;
  check(n >= 5 && !/"type":"spur"(?![^}]*"minRoom":2)/.test(all), `${n} Heart layouts place spurs, each from room 2 on`);
}

// 2 ----------------------------------------------------------- spurs --
{
  const W = campaignRoom(4, 5, 3);
  const hero = heroes(W)[0];
  let tel = null;
  for (let i = 0; i < 1500 && !tel; i++) {
    W.step();
    mend(W);
    tel = W.log.find((e) => e.type === 'telegraph_start' && e.etype === 'spur');
  }
  check(!!tel && tel.playerTargeted === true, `a Heart room 3 telegraphs a spur ring (tick ${tel?.tick}, target ${tel?.target})`);
  // Stand the hero on the mark: the burst hurts and leaves a pillar.
  const target = W.registry.byId(tel?.target) ?? hero;
  let hit = null;
  for (let i = 0; i < 120 && !hit; i++) {
    target.x = tel.x;
    target.z = tel.z;
    target.iframeUntilTick = 0;
    W.step();
    hit = W.log.find((e) => e.type === 'hazard_resolve' && e.htype === 'spur');
  }
  check(!!hit, `the burst lands ${hit ? hit.tick - tel.tick : '?'} ticks after the wind-up`);
  const pillar = W.log.find((e) => e.type === 'rubble_spawn' && e.skin === 'spur');
  check(!!pillar && W.registry.all().some((e) => e.kind === 'rubble' && e.skin === 'spur'), 'a crystal pillar stands where it burst');
  check(!!hit && hit.victims >= 1, `the hero standing on the mark is hit (${hit?.victims} victim)`);
  // Cap: keep the room going; never more than three pillars.
  let most = 0;
  for (let i = 0; i < 6000; i++) {
    W.step();
    mend(W);
    most = Math.max(most, W.registry.all().filter((e) => e.kind === 'rubble' && e.skin === 'spur').length);
    if (W.run.view().phase !== 'combat') break;
  }
  const bursts = W.log.filter((e) => e.type === 'hazard_resolve' && e.htype === 'spur').length;
  check(most <= 3 && bursts >= 2, `${bursts} bursts, at most ${most} pillars at once (cap 3)`);
}

// 3 ---------------------------------------------------- determinism --
{
  const W = campaignRoom(4, 9, 3);
  let tel = null;
  for (let i = 0; i < 1500 && !tel; i++) {
    W.step();
    mend(W);
    tel = W.log.find((e) => e.type === 'telegraph_start' && e.etype === 'spur');
  }
  steps(W, 10);
  const tree = clonePlain(W.io.capture());
  const cont = (seed) => {
    const X = makeWorld(seed);
    const ok = X.io.apply(clonePlain(tree)).ok;
    const hs = [];
    for (let i = 0; i < 6; i++) {
      steps(X, 60);
      hs.push(hashState(X.io.capture()));
    }
    return { ok, hs: hs.join(), bursts: X.log.filter((e) => e.type === 'hazard_resolve' && e.htype === 'spur').length };
  };
  const a = cont(16);
  const b = cont(999);
  check(!!tel && a.ok && b.ok && a.hs === b.hs && a.bursts >= 1, `a capture mid-wind-up continues bit-identically (${a.bursts} burst after load)`);
}

// 4 ------------------------------------------------------- placement --
{
  let rooms = 0;
  let placed = 0;
  let wrong = 0;
  for (const level of [1, 2, 3, 4, 5]) {
    for (const seed of [1, 2, 3, 4]) {
      const W = makeWorld(seed);
      W.run.startCampaign({ level, harness: true });
      const aim = W.run.cmd('shrineState', []).aim;
      if (aim < SHRINE_RULES.rooms[0] || aim > SHRINE_RULES.rooms[1]) wrong++;
      W.world.cmd('skipToRoom', aim);
      for (let i = 0; i < 4; i++) W.step();
      const st = W.run.cmd('shrineState', []);
      const enter = W.log.filter((e) => e.type === 'layout_enter').pop();
      rooms++;
      const sp = W.log.find((e) => e.type === 'shrine_spawn');
      if (sp) {
        placed++;
        if (st.room !== aim) wrong++;
      } else if (['kill_all', 'defend', 'hunt', 'purge', 'escort', 'hold', 'champion'].includes(enter?.mode)) wrong++;
    }
  }
  check(wrong === 0 && placed >= rooms * 0.75, `the shrine aims at room 4-6 and stands there in ${placed}/${rooms} level starts (the rest: a non-combat room, carried on)`);
  // Never the boss room.
  const B = makeWorld(3);
  B.run.startCampaign({ level: 2, harness: true });
  B.run.cmd('shrineRoom', [7]);
  B.world.cmd('skipToRoom', 7);
  for (let i = 0; i < 4; i++) B.step();
  check(!B.log.some((e) => e.type === 'shrine_spawn'), 'never in the boss room');
  // Each land's own shrine.
  const ids = [];
  for (const level of [1, 2, 3, 4, 5]) {
    const W = campaignRoom(level, 2, 3, { shrineAt: 3 });
    for (let i = 0; i < 4; i++) W.step();
    ids.push(W.run.cmd('shrineState', [])?.id ?? '-');
  }
  check(ids.join() === 'wood,mill,barrow,heart,spire', `one shrine per land (${ids.join(', ')})`);
  // Gates.
  const R = makeWorld(4);
  R.run.startCampaign({ level: 1, harness: true, rush: true });
  check(R.run.cmd('shrineState', []) === null, 'Boss Rush: no shrines');
  const L = makeWorld(4);
  L.run.startRun({ harness: true });
  check(L.run.cmd('shrineState', []) === null, 'the legacy single-level run: no shrines');
  const T = makeWorld(4);
  T.run.startCampaign({ level: 1, harness: true, tutorial: true });
  check(T.run.cmd('shrineState', []) === null, 'the tutorial: no shrines');
}

// 5-6 ----------------------------------------------- trades, blessings --
const trade = (level, prep) => {
  const W = campaignRoom(level, 6, 3, { shrineAt: 3 });
  for (let i = 0; i < 4; i++) W.step();
  if (prep) prep(W);
  return W;
};
{
  // Wood: 15% of each hero's HP for Swiftness.
  const W = trade(1);
  const before = heroes(W).map((e) => e.hp);
  const r = W.run.cmd('shrineUse', [0]);
  const after = heroes(W).map((e) => e.hp);
  const paidOk = heroes(W).every((e, i) => Math.abs(before[i] - after[i] - e.maxHp * SHRINE_RULES.hpCost) < 0.02 || after[i] === 1);
  const tick = W.clock.tick;
  const h = heroes(W)[0];
  const sm = speedMul(h, tick);
  check(r?.blessing === 'swiftness' && paidOk && heroes(W).every((e) => e.blessing?.id === 'swiftness') && Math.abs(sm - 1.3) < 1e-6, `Antler Shrine: 15% health from each hero, Swiftness on all (speed x${sm})`);
  const again = W.run.cmd('shrineUse', [0]);
  check(again?.denied === 'used', 'used once per room');
  h.blessing.untilTick = tick + 1;
  steps(W, 3);
  check(Math.abs(speedMul(h, W.clock.tick) - 1) < 1e-6, 'the blessing ends at its tick');
}
{
  // Mill: 25 Glint for a Ward; too little is refused.
  const W = trade(2, (X) => X.run.cmd('wallet', [10]));
  const no = W.run.cmd('shrineUse', [0]);
  const live = W.registry.all().find((e) => e.kind === 'shrine');
  check(no?.denied === 'glint' && live.uses === 1 && W.run.cmd('wallet', []) === 10, 'Tithe Shrine: 10 Glint is refused and the shrine stays');
  W.run.cmd('wallet', [40]);
  const r = W.run.cmd('shrineUse', [0]);
  const h = heroes(W)[0];
  const dt = damageTakenMul(h, W.clock.tick);
  check(r?.blessing === 'ward' && W.run.cmd('wallet', []) === 15 && Math.abs(dt - 0.75) < 1e-6, `Tithe Shrine: 25 Glint paid, Ward (damage taken x${dt})`);
}
{
  // Barrow: a curse on the next fight for Fury.
  const W = trade(3);
  const r = W.run.cmd('shrineUse', [0]);
  const h = heroes(W)[0];
  const dd = damageDealtMul(h, W.clock.tick);
  check(r?.blessing === 'fury' && !!r.curse && Math.abs(dd - 1.3) < 1e-6, `Grave Shrine: Fury (damage x${dd}), the next fight owes ${r?.curse}`);
  W.world.cmd('clearRoom');
  let cursed = null;
  for (let i = 0; i < 6000 && !cursed; i++) {
    W.step();
    mend(W);
    const ph = W.run.view().phase;
    // Step past the between-room pages with the run's own commands.
    if (ph === 'reward') W.run.cmd('draftDecline', []);
    else if (ph === 'relic') W.run.cmd('relicChoose', [0]);
    else if (ph === 'path') W.run.cmd('pathChoose', [0]);
    else if (ph === 'shop') W.run.cmd('shopAdvance', []);
    cursed = W.log.find((e) => e.type === 'shrine_curse');
    if (!cursed && ph !== 'combat' && i % 30 === 0) W.world.cmd('skipToRoom', 4);
  }
  check(!!cursed && cursed.curse === r?.curse, `the curse binds the next fight (room ${cursed?.room}: ${cursed?.curse})`);
}
{
  // Heart: the key for a greater relic pick at the clear; no key, refused.
  const W = trade(4);
  const no = W.run.cmd('shrineUse', [0]);
  check(no?.denied === 'key', 'Geode Shrine: no key, refused');
  W.run.cmd('keyGive', []);
  const r = W.run.cmd('shrineUse', [0]);
  const kv = W.run.cmd('vaultState', []);
  check(r?.pick === true && !kv?.key && !r.blessing, 'Geode Shrine: the key is gone, no blessing');
  W.world.cmd('clearRoom');
  let offer = null;
  const seen = new Set();
  for (let i = 0; i < 1200 && !offer; i++) {
    W.step();
    if (W.run.view().phase === 'reward') W.run.cmd('draftDecline', []);
    const v = W.run.cmd('relics', []);
    seen.add(`${W.run.view().phase}:${v?.offer?.source ?? '-'}`);
    if (v?.offer?.source === 'shrine') offer = v.offer;
  }
  if (!offer) console.log('     seen', [...seen].join(' '), W.log.filter((e) => /relic|room_cleared/.test(e.type)).map((e) => e.type + ':' + (e.source ?? '')).join(' '));
  const RARE = ['rare', 'legendary'];
  check(!!offer && offer.choices.length > 0 && offer.choices.every((c) => RARE.includes(c.rarity)), `the clear offers a greater pick (${offer?.choices.map((c) => c.rarity).join(', ')})`);
}
{
  // Spire: the offering hero's tonic for Tailwind; no tonic, refused.
  const W = trade(5);
  const no = W.run.cmd('shrineUse', [0]);
  check(no?.denied === 'tonic', 'Wind Shrine: no tonic, refused');
  W.run.cmd('tonicGive', [0, 'mend_tonic']);
  const r = W.run.cmd('shrineUse', [0]);
  const h = heroes(W)[0];
  const t = W.clock.tick;
  check(r?.blessing === 'tailwind' && r.tonic === 'mend_tonic' && !W.run.cmd('tonicState', [])?.slots?.[0] && Math.abs(speedMul(h, t) - 1.2) < 1e-6 && Math.abs(damageDealtMul(h, t) - 1.15) < 1e-6, 'Wind Shrine: the tonic is spent, Tailwind (+20% speed, +15% damage)');
  // 8: a capture keeps the shrine and the blessing.
  const tree = clonePlain(W.io.capture());
  const X = makeWorld(77);
  X.io.apply(clonePlain(tree));
  const s = X.run.cmd('shrineState', []);
  check(s?.used === true && s.id === 'spire' && heroes(X)[0].blessing?.id === 'tailwind', 'a capture keeps the shrine spent and the blessing on');
}
check(Object.keys(SHRINES).length === 6 && Object.values(SHRINES).every((S) => S.gift === 'relic' || BLESSINGS[S.gift]), 'six shrines (the Kiln Forge Shrine since plan 5 slice 9), every gift a blessing or the relic pick');

console.log(`\n${passes.length} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
