#!/usr/bin/env node
// SPIRE THIRD BOSS probe (content plan 5 slice 1, docs/THIRD_BOSSES.md):
// the Hourwarden. Headless Node, the sim built like src/main.js; it never
// imports src/render.
//
//   node tools/spire-third-boss-probe.mjs
//
// Checks:
//   1. Wiring: Level V's bosses, the gate (locked seeds meet the boss they
//      met before; felling the Hush and the Skyhorn opens it), the seed roll
//      and Endless cycle once open, Boss Rush lap two, the Clock Loft
//      (layout 35), deeds, tint, Journal, story lines in ten languages.
//   2. Pendulum: a lane that hurts, then a back-swing down the same lane.
//   3. Hand Sweep: a cone that hurts and throws heroes back.
//   4. Toll of the Hours: weights fall on rings and hurt; it runs down and
//      takes more damage; more hours from phase two and enraged.
//   5. Governor, 6. a level clear, 7. the run gate and the Daily, 8. saves.
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

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
const { LEVELS, bossFor, thirdBossActs } = await import(u('src/data/levels.js'));
const { endlessBossIndex, CYCLE } = await import(u('src/data/endless.js'));
const { isDailyKey } = await import(u('src/data/daily.js'));
const { BOSS_KITS } = await import(u('src/sim/boss.js'));
const { DEEDS, UNLOCKS } = await import(u('src/data/unlocks.js'));
const { rushLine, RUSH_RULES } = await import(u('src/data/rush.js'));
const { LAYOUTS } = await import(u('src/data/layouts.js'));
const HW = await import(u('src/sim/bosses/hourwarden.js'));
const { BESTIARY } = await import(u('src/data/journal.js'));
const S = await import(u('src/data/story.js'));
const { GOVERNOR } = await import(u('src/sim/enemies.js'));

function makeWorld(seed) {
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
const steps = (W, n, each = null) => {
  const until = W.clock.tick + n;
  for (let i = 0; i < n * 4 && W.clock.tick < until; i++) {
    W.step();
    if (each) each();
  }
};
const party = (W) => W.registry.all().filter((e) => e.faction === 'party' && e.partyIndex !== undefined);
const mend = (W) => party(W).forEach((p) => (p.hp = p.maxHp));
const bossOf = (W) => W.registry.all().find((e) => e.boss === true);
const evs = (W, type) => W.log.filter((e) => e.type === type);
// Park the whole party at (x, z), allies in a row beside the player.
function parkParty(W, x = 0, z = 4.5, gap = 0.9) {
  W.world.cmd('teleport', x, z);
  for (const a of W.registry.all().filter((e) => e.kind === 'ally')) {
    a.x = a.px = x + (a.partyIndex - 2) * gap;
    a.z = a.pz = z + 0.6;
  }
}
// The boss room of `level` with `kind` in it: the boss made tough (HP cuts go
// through the run's own bossHp hook), the room's log cleared.
function bossRoom(kind, level, seed = 5) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level, harness: true, boss: kind });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  W.world.cmd('skipToRoom', 8);
  for (let i = 0; i < 600 && !(W.run.view().boss && W.run.view().boss.active); i++) W.step();
  const b = bossOf(W);
  if (b) {
    b.maxHp *= 40;
    b.hp = b.maxHp;
  }
  W.log.length = 0;
  return W;
}
const hitsOn = (W, from, attackerId) => W.log.filter((e, i) => i >= from && e.type === 'hit' && e.attacker === attackerId && e.amount > 0).length;
const addKinds = (W, from) => W.log.slice(from).filter((e) => e.type === 'boss_adds').flatMap((e) => e.adds.map((a) => a.etype));



const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const player = (W) => party(W).find((p) => p.partyIndex === 0) || party(W)[0];
const BEFORE = ['hush', 'skyhorn'];

// ---------------------------------------------------------------- 1. wiring --
{
  const k5 = (LEVELS[5].bosses || []).map((b) => b.kind);
  check(k5.join() === 'hush,skyhorn,hourwarden', `Level V's bosses: ${k5.join(', ')}`);
  const row = LEVELS[5].bosses.find((b) => b.kind === 'hourwarden');
  check(row.gated === true && row.rushLap === 2 && row.layout === 35, 'the Hourwarden row is gated, lap two in a rush, in layout 35');
  let same = 0;
  for (let s = 1; s <= 200; s++) if (BEFORE.includes(bossFor(5, s).kind) && bossFor(5, s).kind === bossFor(5, s, null, []).kind) same += 1;
  check(same === 200, `locked, seeds 1-200 on Level V never meet it (${same}/200)`);
  let lockedEnd = 0;
  for (let s = 1; s <= 40; s++) for (let d = 5; d <= 5 + 3 * CYCLE; d += CYCLE) if (BEFORE.includes(LEVELS[5].bosses[endlessBossIndex(d, s)].kind)) lockedEnd += 1;
  check(lockedEnd === 160, `locked, Endless Spires keep to the first two (${lockedEnd}/160)`);
  check(thirdBossActs({ hush: 1 }).length === 0 && thirdBossActs({ hush: 1, skyhorn: 1 }).join() === '5', 'felling the Hush and the Skyhorn opens the Spire\'s third boss');
  const n = {};
  for (let s = 1; s <= 60; s++) { const k = bossFor(5, s, null, [5]).kind; n[k] = (n[k] ?? 0) + 1; }
  check(k5.every((k) => n[k] > 0), `unlocked, seeds 1-60 on Level V meet all three (${k5.map((k) => `${k} ${n[k] ?? 0}`).join(', ')})`);
  let all3 = 0;
  for (let s = 1; s <= 60; s++) { const set = new Set([5, 5 + CYCLE, 5 + 2 * CYCLE].map((d) => LEVELS[5].bosses[endlessBossIndex(d, s, [5])].kind)); if (set.size === 3) all3 += 1; }
  check(all3 === 60, `unlocked, every seed meets all three Spire bosses by its third Spire in Endless (${all3}/60)`);
  // Boss Rush: lap two's Spire is the Hourwarden once open; lap one keeps
  // the locked line's Spire boss; every other fight is unchanged.
  let rushOk = 0;
  let others = 0;
  for (let s = 1; s <= 60; s++) {
    const a = rushLine(s, [5]);
    const l = rushLine(s, null);
    const spire = a.filter((f) => f.act === 5);
    if (spire.length === 2 && spire[1].kind === 'hourwarden' && spire[0].kind === l.find((f) => f.act === 5).kind) rushOk += 1;
    if (a.every((f, i) => f.act === 5 || f.kind === l[i].kind)) others += 1;
  }
  check(rushOk === 60 && others === 60, `Boss Rush: open, lap two's Spire is the Hourwarden and lap one is unchanged (${rushOk}/60, other lands ${others}/60)`);
  let rushLocked = 0;
  for (let s = 1; s <= 60; s++) if (!rushLine(s, [3, 4]).some((f) => f.kind === 'hourwarden')) rushLocked += 1;
  check(rushLocked === 60, `Boss Rush: locked, the Hourwarden never comes up (${rushLocked}/60)`);
  check(!!BOSS_KITS.hourwarden, 'the boss kit is registered');
  check(bossFor(5, 1, 'hourwarden').layout === 35 && LAYOUTS[35]?.act === 5, `it fights in the Clock Loft (layout 35, ${LAYOUTS[35]?.name})`);
  check(!!DEEDS.boss_hourwarden, `deed: ${DEEDS.boss_hourwarden?.name}`);
  check(UNLOCKS.tint_gildedhour?.req?.boss === 'hourwarden', 'the Gilded Hour tint unlocks for felling it');
  check(S.rumourFor('hourwarden', 5) === S.RUMOURS.hourwarden.text, 'Bramble has a rumour');
  check(!!S.BOSS_VOICE.hourwarden && S.voiceKeyFor('hourwarden', 5) === 'hourwarden', 'the Hollow Voice has a line');
  check(/Hourwarden/.test(S.chapterFor(5).summary), 'Chapter V names it');
  const jh = BESTIARY.find((b) => b.id === 'hourwarden');
  check(!!jh && jh.boss && jh.text.length > 20 && jh.lore.length > 20, 'the Journal has a page');
  const lines = [
    'The Hourwarden', 'THE HOURWARDEN', 'Clock Loft', LAYOUTS[35].name,
    S.RUMOURS.hourwarden.text, S.BOSS_VOICE.hourwarden.text, S.chapterFor(5).summary,
    'The Hourwarden runs down for good. In the loft, the gods’ clock stops at the hour you came.',
    DEEDS.boss_hourwarden.name, DEEDS.boss_hourwarden.text, UNLOCKS.tint_gildedhour.name, UNLOCKS.tint_gildedhour.text,
    jh.lore, jh.text,
  ];
  const langs = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'pt-BR', 'fr', 'de', 'ru'];
  const miss = [];
  for (const l of langs) {
    const tb = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
    for (const k of lines) if (!tb[k]) miss.push(`${l}: ${k.slice(0, 30)}`);
  }
  check(miss.length === 0, `${lines.length} new lines translated in nine languages${miss.length ? ` (missing ${miss.slice(0, 4).join('; ')})` : ''}`);
  check(HW.tollHours({ phase: 0 }) === 3 && HW.tollHours({ phase: 2 }) === 4 && HW.tollHours({ phase: 2, enraged: true }) === 6, `the hours: 3, then 4 from phase two, 6 enraged (${HW.tollHours({ phase: 0 })}/${HW.tollHours({ phase: 2 })}/${HW.tollHours({ phase: 2, enraged: true })})`);
}

// ------------------------------------------------------ 2. the Pendulum --
{
  const W = bossRoom('hourwarden', 5);
  const b = bossOf(W);
  check(!!b && b.kind === 'hourwarden' && W.run.view().layout?.layoutId === 35, `Level V's boss room holds the Hourwarden in the Clock Loft (layout ${W.run.view().layout?.layoutId})`);
  parkParty(W, 0, 5.0);
  steps(W, 1400, () => {
    mend(W);
    const bb = bossOf(W);
    if (bb && W.clock.tick % 90 === 0 && dist(bb, player(W)) < 3.2) parkParty(W, bb.x > 0 ? -6 : 6, bb.z > 0 ? -3 : 5);
  });
  const sw = evs(W, 'boss_pendulum');
  const back = evs(W, 'boss_pendulum_back');
  const pTel = W.log.find((e) => e.type === 'boss_telegraph_start' && e.attack === 'pendulum');
  check(sw.length >= 1 && pTel?.shape === 'lane' && sw.some((d) => d.victims > 0), `the Pendulum lane lands (${sw.length}, hits ${sw.map((d) => d.victims).join('/')})`);
  const paired = back.filter((k) => sw.some((s) => s.dx === k.dx && s.dz === k.dz && s.x === k.x && s.z === k.z && k.tick - s.tick === HW.HOURWARDEN.pendulum.backTicks));
  check(back.length >= 1 && paired.length === back.length, `the back-swing follows down the same lane ${HW.HOURWARDEN.pendulum.backTicks} ticks later (${back.length}, paired ${paired.length})`);
  check(hitsOn(W, 0, b.id) > 0, `the Hourwarden's attacks hurt the party (${hitsOn(W, 0, b.id)} hits)`);
}

// ------------------------------------------------------ 3. the Hand Sweep --
{
  const W = bossRoom('hourwarden', 5, 6);
  let thrown = 0;
  steps(W, 900, () => {
    mend(W);
    const bb = bossOf(W);
    if (!bb) return;
    if (bb.shove && bb.shove.ticksLeft === HW.HOURWARDEN.sweep.shoveTicks && !bb._probe) {
      const p = W.registry.byId(bb.shove.pushes[0][0]);
      bb._probe = p ? { id: p.id, d: dist(p, bb) } : null;
    } else if (!bb.shove && bb._probe) {
      const p = W.registry.byId(bb._probe.id);
      if (p) thrown = Math.max(thrown, dist(p, bb) - bb._probe.d);
      bb._probe = null;
    }
    if (!bb.shove && W.clock.tick % 30 === 0) parkParty(W, Math.max(-6, Math.min(6, bb.x)), Math.max(-4, Math.min(5, bb.z + 1.6)), 0.5);
  });
  const sweeps = evs(W, 'boss_hand_sweep');
  const cTel = W.log.find((e) => e.type === 'boss_telegraph_start' && e.attack === 'sweep');
  check(sweeps.length >= 1 && sweeps.some((g) => g.victims > 0) && cTel?.shape === 'cone', `crowded, its Hand Sweep cone lands (${sweeps.length}, hits ${sweeps.map((g) => g.victims).join('/')})`);
  check(thrown >= 1.0, `the sweep throws its catch back (${thrown.toFixed(2)} u)`);
}

// ------------------------------------------------- 4. Toll of the Hours --
{
  const W = bossRoom('hourwarden', 5, 7);
  parkParty(W, 0, 4.5, 1.2);
  let ranDown = false;
  let mulSeen = null;
  // The first weight is aimed at a hero: hold the whole party under its
  // ring until it lands (seats would otherwise step out of it).
  let pin = null;
  W.bus.on('boss_toll_hours', (e) => (pin = e.spots[0]));
  W.bus.on('enemy_glob_land', (e) => e.weight && (pin = null));
  steps(W, 1600, () => {
    mend(W);
    const bb = bossOf(W);
    if (!bb) return;
    if (pin) for (const p of party(W)) { p.x = p.px = pin[0]; p.z = p.pz = pin[1]; }
    if (bb.mode === 'rundown') { ranDown = true; mulSeen = bb.takenMul; }
    if (W.clock.tick % 120 === 0 && dist(bb, player(W)) < 3) parkParty(W, bb.x > 0 ? -5 : 5, bb.z > 1 ? -3 : 5, 1.2);
  });
  const tolls = evs(W, 'boss_toll_hours');
  const lands = W.log.filter((e) => e.type === 'enemy_glob_land' && e.weight);
  const lobs = W.log.filter((e) => e.type === 'enemy_lob' && e.weight);
  check(tolls.length >= 1 && tolls[0].hours === 3 && tolls[0].weights.length === 3, `it tolls the hours (${tolls.length}, hours ${tolls.map((t) => t.hours).join('/')})`);
  check(lobs.length >= 3 && lands.length >= 3 && lands.some((l) => l.victims > 0), `weights fall on their rings and hurt (${lands.length} landed, hits ${lands.map((l) => l.victims).join('/')})`);
  const gaps = [];
  for (let i = 1; i < Math.min(3, lands.length); i++) gaps.push(lands[i].tick - lands[i - 1].tick);
  check(gaps.length === 2 && gaps.every((g) => g === HW.HOURWARDEN.toll.step), `one hour after another (${gaps.join('/')} ticks apart)`);
  const rd = evs(W, 'boss_run_down');
  const wd = evs(W, 'boss_wound');
  check(ranDown && rd.length >= 1 && wd.length >= 1 && mulSeen === HW.HOURWARDEN.runDown.taken, `then it runs down (taken x${mulSeen}) and winds again`);
  check(bossOf(W).takenMul === undefined || bossOf(W).mode === 'rundown', 'the run-down multiplier clears when it winds again');
  // Enraged: six hours (the adds cleared each tick, so their own telegraphs
  // do not hold the governor's slot).
  W.run.cmd('bossHp', [0.39]);
  W.log.length = 0;
  parkParty(W, 0, 4.5, 1.2);
  steps(W, 1400, () => {
    mend(W);
    for (const e of W.registry.all()) if ((e.etype === 'chime' || e.etype === 'vane') && e.hp > 0) e.hp = 0;
    const bb = bossOf(W);
    if (bb && W.clock.tick % 120 === 0 && dist(bb, player(W)) < 3) parkParty(W, bb.x > 0 ? -5 : 5, bb.z > 1 ? -3 : 5, 1.2);
  });
  const rage = evs(W, 'boss_toll_hours');
  check(evs(W, 'boss_enrage').length === 1 && bossOf(W)?.enraged === true && rage.length >= 1 && rage.every((t) => t.hours === 6), `enraged under 40 %, it tolls six hours (${rage.map((t) => t.hours).join('/')})`);
}

// ------------------------------------------------------------ 5. governor --
{
  const W = bossRoom('hourwarden', 5, 9);
  W.run.cmd('bossHp', [0.45]);
  parkParty(W, 0, 3.6);
  let maxLive = 0;
  const starts = [];
  W.bus.on('telegraph_start', (e) => {
    if (e.playerTargeted) starts.push(e.tick);
  });
  steps(W, 2400, () => {
    mend(W);
    const live = W.registry.all().filter((e) => e.telegraph && e.telegraph.playerTargeted).length;
    if (live > maxLive) maxLive = live;
  });
  let minGap = Infinity;
  for (let i = 1; i < starts.length; i++) minGap = Math.min(minGap, starts[i] - starts[i - 1]);
  check(maxLive <= GOVERNOR.maxConcurrent && minGap >= GOVERNOR.staggerTicks, `fight with adds: at most ${maxLive} player-targeted telegraphs live, starts >= ${minGap} ticks apart (${starts.length} starts)`);
  const ak = [...new Set(addKinds(W, 0))];
  check(ak.length > 0, `its add phases call ${ak.join(', ')}`);
}

// ------------------------------------------------------- 6. level clear --
{
  const W = bossRoom('hourwarden', 5, 5);
  W.run.cmd('killBoss');
  let clear = null;
  for (let i = 0; i < 4000 && !clear; i++) {
    W.world.cmd('killAllEnemies');
    mend(W);
    W.step();
    clear = W.log.find((e) => e.type === 'level_clear' && e.level === 5);
  }
  check(!!clear, 'felling the Hourwarden clears Level V');
}

// ------------------------------------------------------- 7. the run gate --
{
  let seed = 1;
  while (bossFor(5, seed, null, [5]).kind !== 'hourwarden') seed += 1;
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 5, harness: true, thirdBosses: [5] });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  W.world.cmd('skipToRoom', 8);
  for (let i = 0; i < 600 && !(W.run.view().boss && W.run.view().boss.active); i++) W.step();
  const fs = W.run.view().frame.seed;
  check(bossOf(W)?.kind === bossFor(5, fs, null, [5]).kind, `an unlocked campaign's Spire boss room holds the seed's roll (${bossOf(W)?.kind})`);
  const key = ['2026-10-10', '20261010'].find((k) => isDailyKey(k));
  const D = makeWorld(seed);
  D.run.startCampaign({ level: 1, harness: true, daily: { key }, thirdBosses: [5] });
  check(!!key && D.run.view().daily && (D.run.view().thirdBosses ?? null) === null, 'the Daily ignores the gate (never a third boss)');
  const R = makeWorld(seed);
  R.run.startCampaign({ rush: true, harness: true, thirdBosses: [5] });
  const line = R.run.campaign().rush?.line ?? [];
  const spire = line.filter((f) => f.act === 5).map((f) => f.kind);
  check(spire.length === 2 && spire[1] === 'hourwarden' && spire[0] !== 'hourwarden', `an open Boss Rush meets it on lap two's Spire (${spire.join(', ')})`);
  const X = makeWorld(seed);
  X.io.apply(clonePlain(R.io.capture()));
  check(JSON.stringify(X.run.campaign().rush?.line) === JSON.stringify(line), 'the rush line survives a save round trip');
}
// ---------------------------------------------------------------- 8. saves --
{
  const W = bossRoom('hourwarden', 5, 12);
  W.run.cmd('bossHp', [0.49]);
  parkParty(W, 0, 3.8);
  steps(W, 300, () => mend(W));
  const tree = clonePlain(W.io.capture());
  const cont = (seed) => {
    const X = makeWorld(seed);
    const ok = X.io.apply(clonePlain(tree)).ok;
    const hs = [];
    for (let i = 0; i < 8; i++) {
      steps(X, 60);
      hs.push(hashState(X.io.capture()));
    }
    return { ok, hs: hs.join() };
  };
  const a = cont(1);
  const c = cont(2);
  check(a.ok && c.ok && a.hs === c.hs, 'mid-fight: a save round trip continues bit-identically');
}

console.log(`\n${passes.length} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
