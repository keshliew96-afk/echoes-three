#!/usr/bin/env node
// THE EMBER KILN'S BOSSES AND THE LEVEL V FORK probe (docs/KILN_BOSSES.md,
// content plan 5 slice 8) — headless Node, the sim built like src/main.js.
//
//   node tools/kiln-bosses-probe.mjs
//
// Checks:
//   1. Wiring: the Kiln plays without a flag; Level V's two roads; the
//      Firing Floor holds the Bellfounder or the Cinderback by seed (both
//      appear), their kits, Journal rows, warden, chapter, ending and story
//      lines in all ten languages; no new deed, Kingslayer and Ringwalker
//      unchanged; the Daily on the Spire road, Boss Rush on its five acts,
//      Endless keeping its five lands.
//   2. The Bellfounder: Molten Pour lanes (the seats' lane-step flag) that
//      cool into slag, Bell Drops, three Castings at 75/50/25 % letting out
//      the Kiln's adds, each followed by a Firing and a quenched window, and a
//      party at the walls left untouched.
//   3. The Cinderback: Magma Dives (out of reach under the floor, a slag pool,
//      a spent window), the Tail Lash when crowded (it throws), the Ember Spit
//      from the Second phase, the enrage.
//   4. Governor: at most two player-targeted telegraphs live, >= 72 ticks.
//   5. The fork: the Level IV clear card offers the Spire and the Kiln; a
//      pick of the Kiln runs on to it and its clear wins on the Kiln's road;
//      no pick takes the Spire; the Daily and a Spire start never fork; the
//      card survives a save round trip.
//   6. Saves: each fight mid-phase continues bit-identically.
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
const { LEVELS, bossFor, CAMPAIGN_ACTS, ACT_IDS, ENDLESS_ACTS, ROADS, DEFAULT_ROAD } = await import(u('src/data/levels.js'));
const { nextLevel, nextLevels, ALL_LEVELS, CAMPAIGN_LEVELS, TRANSIT } = await import(u('src/data/campaign.js'));
const E = await import(u('src/data/endless.js'));
const { RUSH_RULES, LAP, rushLine } = await import(u('src/data/rush.js'));
const { checkScore } = await import(u('server/daily.mjs'));
const { dailySeed, dailyKey } = await import(u('src/data/daily.js'));
const { VERSION } = await import(u('src/version.js'));
const { BESTIARY } = await import(u('src/data/journal.js'));
const { BOSS_KITS } = await import(u('src/sim/boss.js'));
const { DEEDS, UNLOCKS, BOSSES, ARENA_IDS } = await import(u('src/data/unlocks.js'));
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
function bossRoom(kind, seed = 5, level = 6) {
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
const inLane = (t, p) => {
  const px = p.x - t.fromX;
  const pz = p.z - t.fromZ;
  const along = px * t.dirX + pz * t.dirZ;
  return along >= -0.3 && along <= t.length + 0.3 && Math.abs(px * t.dirZ - pz * t.dirX) <= t.width / 2 + (p.radius || 0.3);
};

// ---------------------------------------------------------------- 1. wiring --
{
  check(CAMPAIGN_ACTS === 5 && ACT_IDS.join() === '1,2,3,4,5,6' && ALL_LEVELS.join() === '1,2,3,4,5,6', `the Kiln plays without a flag (campaign ${CAMPAIGN_ACTS}; acts ${ACT_IDS.join()})`);
  check(DEFAULT_ROAD === 'spire' && CAMPAIGN_LEVELS.join() === '1,2,3,4,5' && nextLevel(4) === 5 && nextLevel(4, 'kiln') === 6 && nextLevels(4).join() === '5,6' && nextLevel(5) === null && nextLevel(6) === null, `two roads after Level IV (opens ${nextLevels(4).join()}; the Spire unless the party picks)`);
  const lv = LEVELS[6];
  const kinds = (lv.bosses || []).map((b) => b.kind);
  check(kinds.join() === 'founder,cinderback' && lv.boss === 'founder' && lv.bosses.every((b) => !b.layout && !b.gated), `the Kiln's bosses are the Bellfounder and the Cinderback on the Firing Floor (${kinds.join(', ')})`);
  const rolled = {};
  for (let s = 1; s <= 40; s++) rolled[bossFor(6, s).kind] = (rolled[bossFor(6, s).kind] || 0) + 1;
  check(rolled.founder > 0 && rolled.cinderback > 0 && Object.keys(rolled).length === 2, `seeds 1-40 meet both (${JSON.stringify(rolled)})`);
  check(!!BOSS_KITS.founder && !!BOSS_KITS.cinderback, 'both boss kits are registered');
  const fd = lv.bosses.find((b) => b.kind === 'founder');
  check(fd.addsByPhase && fd.addsByPhase.length === 3, 'the Bellfounder carries three Castings of adds');
  check(!DEEDS.boss_founder && !DEEDS.boss_cinderback && BOSSES.length === 15 && !BOSSES.some((b) => b.level === 6), `no new deed; Kingslayer still counts ${BOSSES.length} bosses`);
  check(!ARENA_IDS.includes(41), `Ringwalker still counts ${ARENA_IDS.length} arenas (not the Kiln Mouth)`);
  check(S.rumourFor('founder', 6) === S.RUMOURS.founder.text && S.rumourFor('cinderback', 6) === S.RUMOURS.cinderback.text, 'Bramble names each Kiln boss');
  check(S.voiceKeyFor('founder', 6) === 'founder' && !!S.BOSS_VOICE.founder && !!S.BOSS_VOICE.cinderback, 'the Hollow Voice has a line for each');
  const ch = S.chapterFor(6);
  check(!!ch && ch.verse === 'flame' && /Bellfounder/.test(ch.summary) && /Cinderback/.test(ch.summary) && S.CHAPTERS.length === 6, 'the Kiln chapter, the Verse of Flame, names both');
  check(S.endingFor(5, 'kiln') === S.ENDING.kiln && S.endingFor(5, 'spire') === S.ENDING.spire, 'the Kiln road ends on its own ending');
  check(S.WARDENS.cinderback?.model === 'warden_salamander' && S.WARDENS.cinderback.also.includes('founder'), 'either boss frees the Cinderback warden');
  check(BESTIARY.some((r) => r.id === 'founder' && r.boss && r.lore) && BESTIARY.some((r) => r.id === 'cinderback' && r.boss && r.lore), `the Journal lists them (${BESTIARY.length} entries)`);
  // The modes around the fork.
  const lines = Array.from({ length: 12 }, (_, i) => rushLine(i + 1));
  check(LAP === 5 && RUSH_RULES.fights === 10 && lines.every((l) => l.every((f) => f.act <= 5)), 'Boss Rush keeps its five acts and ten fights');
  check(ENDLESS_ACTS.join() === '1,2,3,4,5' && E.CYCLE === 5 && E.levelOfDepth(6) === 1, `the Endless Descent keeps its five lands (cycle ${E.CYCLE})`);
  const lines10 = [
    'The Bellfounder', 'THE BELLFOUNDER', 'The Cinderback', 'THE CINDERBACK', ch.summary,
    S.RUMOURS.founder.text, S.RUMOURS.cinderback.text, S.BOSS_VOICE.founder.text, S.BOSS_VOICE.cinderback.text, S.WARDENS.cinderback.text,
    S.KEEPER_LINES.byVerses.text[6], S.KEEPER_LINES.flameFive.text, S.CHRONICLER_LINES.byVerses.text[6], S.CHRONICLER_LINES.flameFive.text,
    'The Bellfounder’s crucible cracks. In the gods’ kiln, the last bell rings true.', 'The Cinderback sinks into the coals. The kiln’s fire burns clean again.',
    'Choose your road', 'Verse of {verse}', 'No road chosen in {secs} s: the party takes the Spire', 'The Healer chooses the road…', '<b>← →</b> choose a road · <b>Enter</b> take it',
    'The gods’ high belfry, where they sat down to watch and never rose.', 'The gods’ kiln, where the first bells were fired. The fire never went out.',
    ...['founder', 'cinderback'].flatMap((k) => { const r = BESTIARY.find((x) => x.id === k); return [r.lore, r.text]; }),
  ];
  const langs = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'pt-BR', 'fr', 'de', 'ru'];
  const miss = [];
  for (const l of langs) {
    const tb = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
    for (const k of lines10) if (!k || !tb[k]) miss.push(`${l}: ${String(k).slice(0, 30)}`);
  }
  check(miss.length === 0, `${lines10.length} new lines translated in nine languages${miss.length ? ` (missing ${miss.length}: ${miss.slice(0, 4).join('; ')})` : ''}`);
}

// Lane evasion bookkeeping: allies standing in a `lance` lane when its
// warning starts (the flag is what the seats' lane step reads).
function laneWatch(W, attack) {
  const rec = { lanes: 0, inAtStart: 0, outAtEnd: 0 };
  let cur = null;
  return {
    rec,
    tick() {
      const b = bossOf(W);
      const t = b && b.telegraph;
      if (t && t.attack === attack && t.lance && (!cur || cur.t !== t)) {
        const allies = W.registry.all().filter((e) => e.kind === 'ally' && e.hp > 0 && inLane(t, e));
        cur = { t, ids: allies.map((a) => a.id) };
        rec.lanes += 1;
        rec.inAtStart += allies.length;
      }
      if (cur && (!t || t !== cur.t)) {
        const tt = cur.t;
        rec.outAtEnd += cur.ids.filter((id) => {
          const a = W.registry.byId(id);
          return a && !inLane(tt, a);
        }).length;
        cur = null;
      }
    },
  };
}

// ---------------------------------------------------------- 2. the Bellfounder --
{
  const W = bossRoom('founder');
  const b = bossOf(W);
  check(!!b && b.kind === 'founder' && W.run.view().layout?.layoutId === 39, `the Firing Floor holds the Bellfounder (layout ${W.run.view().layout?.layoutId})`);
  parkParty(W, 0, 4.6);
  let from = W.log.length;
  const lw = laneWatch(W, 'pour');
  steps(W, 1200, () => {
    mend(W);
    lw.tick();
  });
  const pours = evs(W, 'boss_molten_pour');
  const bells = evs(W, 'boss_bell_drop');
  check(pours.length >= 1 && pours.every((p) => p.pools.length === 3), `Molten Pours are cast and cool into slag (${pours.length}, hits ${pours.map((n) => n.victims).join('/')})`);
  check(W.log.some((e) => e.type === 'slick_spawn' && e.variant === 'slag'), 'the pour leaves slag pools that slow');
  const laneTel = W.log.find((e) => e.type === 'boss_telegraph_start' && e.attack === 'pour');
  check(!!laneTel && laneTel.shape === 'lane' && lw.rec.lanes >= 1, `the pour is a lane with the seats' lane-step flag (${lw.rec.lanes} lanes; ${lw.rec.outAtEnd} of ${lw.rec.inAtStart} seats stepped out)`);
  check(bells.length >= 1 && bells.some((n) => n.victims > 0), `Bell Drops land (${bells.length}, hits ${bells.map((n) => n.victims).join('/')})`);
  check(evs(W, 'boss_firing').length === 0, 'no Firing before the First Casting');
  check(hitsOn(W, from, b.id) > 0, `its attacks hurt the party (${hitsOn(W, from, b.id)} hits)`);
  for (const [pct, want, n] of [[0.74, ['newt'], 1], [0.49, ['slag', 'newt'], 2], [0.24, ['cindermoth', 'bellows'], 3]]) {
    W.world.cmd('killAllEnemies');
    from = W.log.length;
    W.run.cmd('bossHp', [pct]);
    let bb = bossOf(W);
    parkParty(W, Math.max(-6, Math.min(6, bb.x)), Math.max(-4, Math.min(5, bb.z + 1.6)), 0.5);
    let quenched = false;
    let taken = 0;
    steps(W, 360, () => {
      mend(W);
      bb = bossOf(W);
      if (bb && bb.takenMul) taken = bb.takenMul;
      if (bb && bb.mode === 'quenched') quenched = true;
    });
    const cs = W.log.slice(from).filter((e) => e.type === 'boss_casting');
    const ks = addKinds(W, from);
    check(cs.length === 1 && cs[0].casting === n && want.every((k) => ks.includes(k)), `at ${Math.round(pct * 100)}% Casting ${cs[0]?.casting} lets out ${[...new Set(ks)].join(', ')}`);
    const fi = W.log.slice(from).filter((e) => e.type === 'boss_firing');
    const tel = W.log.slice(from).find((e) => e.type === 'boss_telegraph_start' && e.attack === 'firing');
    check(fi.length >= 1 && fi[0].victims > 0 && !!tel && fi[0].tick - tel.tick >= 90, `then the Firing (warned ${tel && fi[0] ? fi[0].tick - tel.tick : '-'} ticks) catches those who stayed (${fi[0]?.victims ?? 0})`);
    check(quenched && taken > 1, `and it is quenched after it, taking ${taken}x damage`);
  }
  // Out at the walls, the Firing misses.
  W.world.cmd('killAllEnemies');
  const f3 = W.log.length;
  steps(W, 900, () => {
    mend(W);
    const bb = bossOf(W);
    if (bb && bb.telegraph && bb.telegraph.attack === 'firing') parkParty(W, bb.x > 0 ? -7.5 : 7.5, bb.z > 0 ? -4.5 : 4.5, 0.5);
  });
  const fi2 = W.log.slice(f3).filter((e) => e.type === 'boss_firing');
  check(fi2.length >= 1 && fi2.every((g) => g.victims === 0), `a party that walks to the walls is not caught (${fi2.map((g) => g.victims).join('/')})`);
}

// ---------------------------------------------------------- 3. the Cinderback --
{
  const W = bossRoom('cinderback');
  const b = bossOf(W);
  check(!!b && b.kind === 'cinderback' && W.run.view().layout?.layoutId === 39, 'the Firing Floor holds the Cinderback (forced)');
  parkParty(W, 0, 4.6);
  let under = false;
  let spentMul = 0;
  steps(W, 1200, () => {
    mend(W);
    const bb = bossOf(W);
    if (bb && bb.mode === 'under' && bb.hittable === false) under = true;
    if (bb && bb.mode === 'spent' && bb.takenMul) spentMul = bb.takenMul;
  });
  const dives = evs(W, 'boss_magma_dive');
  const tel = W.log.find((e) => e.type === 'boss_telegraph_start' && e.attack === 'dive');
  check(dives.length >= 1 && dives.some((d) => d.victims > 0) && dives.every((d) => d.pool), `Magma Dives burst up under the party and leave slag (${dives.length}, hits ${dives.map((d) => d.victims).join('/')})`);
  check(!!tel && tel.shape === 'ring', 'the dive is a ring telegraph');
  check(under, 'it is out of reach under the floor');
  check(spentMul > 1 && evs(W, 'boss_cinder_recover').length >= 1, `it surfaces spent, taking ${spentMul}x damage, then recovers`);
  check(evs(W, 'boss_ember_spit').length === 0, 'no Ember Spit before the Second phase');
  // Crowd it: the Tail Lash throws.
  W.world.cmd('killAllEnemies');
  let from = W.log.length;
  let thrown = 0;
  steps(W, 600, () => {
    mend(W);
    const bb = bossOf(W);
    if (bb && bb.shove) thrown += 1;
    if (bb && W.clock.tick % 30 === 0 && bb.mode !== 'under' && bb.mode !== 'nose') parkParty(W, Math.max(-6, Math.min(6, bb.x)), Math.max(-4, Math.min(5, bb.z + 1.5)), 0.5);
  });
  const lash = W.log.slice(from).filter((e) => e.type === 'boss_tail_lash');
  check(lash.length >= 1 && lash.some((t) => t.victims > 0) && thrown > 0, `crowded, its Tail Lash lands and throws (${lash.length}, hits ${lash.map((t) => t.victims).join('/')})`);
  // Second phase: the Ember Spit.
  for (const pct of [0.74, 0.49]) {
    W.world.cmd('killAllEnemies');
    W.run.cmd('bossHp', [pct]);
    steps(W, 140, () => mend(W));
  }
  W.world.cmd('killAllEnemies');
  from = W.log.length;
  parkParty(W, 0, 4.6, 1.6);
  steps(W, 1000, () => mend(W));
  const spits = W.log.slice(from).filter((e) => e.type === 'boss_ember_spit');
  const lands = W.log.slice(from).filter((e) => e.type === 'enemy_glob_land' && e.ember);
  check(spits.length >= 1 && spits[0].gobs.length === 3 && lands.length >= 3, `from the Second phase it spits three gobbets of fire (${spits.length} spits, ${lands.length} landed)`);
  W.run.cmd('bossHp', [0.39]);
  from = W.log.length;
  steps(W, 600, () => mend(W));
  check(W.log.slice(from).filter((e) => e.type === 'boss_enrage').length === 1, 'enraged under 40 %');
}

// ------------------------------------------------------------ 4. governor --
for (const kind of ['founder', 'cinderback']) {
  const W = bossRoom(kind, 9);
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
  check(maxLive <= GOVERNOR.maxConcurrent && minGap >= GOVERNOR.staggerTicks, `${kind} fight with adds: at most ${maxLive} player-targeted telegraphs live, starts >= ${minGap} ticks apart (${starts.length} starts)`);
}

// ------------------------------------------------------------- 5. the fork --
// Fell the boss of the level the run is in and wait for its clear.
function fellAndWait(W, level) {
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) {
    W.step();
    if (['reward', 'relic', 'socket'].includes(W.run.view().phase)) W.world.cmd('campaignAdvance', 'probe');
  }
  W.world.cmd('skipToRoom', 8);
  for (let i = 0; i < 600 && !(W.run.view().boss && W.run.view().boss.active); i++) W.step();
  steps(W, 20);
  W.run.cmd('killBoss');
  let clear = null;
  for (let i = 0; i < 4000 && !clear; i++) {
    W.world.cmd('killAllEnemies');
    mend(W);
    W.step();
    clear = W.log.find((e) => e.type === 'level_clear' && e.level === level);
  }
  return clear;
}
const cardOf = (W) => (W.run.campaign() || {}).card || null;
{
  // A Level IV clear forks; the Kiln picked, the run goes on to it.
  const W = makeWorld(7);
  W.run.startCampaign({ level: 4, harness: true });
  const c4 = fellAndWait(W, 4);
  const card = cardOf(W);
  const tr = W.log.find((e) => e.type === 'level_transit' && e.from === 4);
  check(!!c4 && !c4.final && W.run.view().phase === 'transit' && !!card && !!card.fork && card.fork.roads.join() === 'spire,kiln' && card.fork.pick === null && card.to === 5, `the Level IV clear card offers both roads (${card && card.fork ? card.fork.roads.join(' / ') : 'no fork'}; leads to ${card?.to})`);
  check(!!tr && Array.isArray(tr.fork) && card.untilTick - card.startTick >= TRANSIT.forkTicks, `it waits for the pick (${card ? card.untilTick - card.startTick : '-'} ticks)`);
  const early = W.run.campaignAdvance('probe');
  check(!early || early.refused === 'settle', 'Enter in the first half second does nothing');
  const bad = W.run.pickRoad('heart');
  check(bad && bad.refused === 'road', 'a road that is not on the card is refused');
  // A save round trip on the card keeps the fork.
  const tree = clonePlain(W.io.capture());
  const X = makeWorld(1);
  const ok = X.io.apply(clonePlain(tree)).ok;
  const xc = cardOf(X);
  check(ok && !!xc && !!xc.fork && xc.fork.pick === null && X.run.view().phase === 'transit', 'a save on the fork card loads back onto it');
  const r = W.run.pickRoad('kiln');
  const again = W.run.pickRoad('spire');
  const card2 = cardOf(W);
  check(r && r.ok && r.to === 6 && card2.to === 6 && card2.fork.pick === 'kiln' && W.run.campaign().road === 'kiln' && again.refused === 'picked', `picking the Kiln leads the card there (to ${card2.to}, road ${W.run.campaign().road}; a second pick ${again.refused})`);
  check(W.log.some((e) => e.type === 'road_pick' && e.road === 'kiln' && e.to === 6), 'the pick is an event the page and the level manager follow');
  for (let i = 0; i < 400 && W.run.view().phase === 'transit'; i++) {
    W.step();
    W.world.cmd('campaignAdvance', 'probe');
  }
  check(W.run.view().act === 6 && W.run.campaign().level === 6, `it sets out into the Ember Kiln (act ${W.run.view().act})`);
  const boss = bossFor(6, W.run.view().frame?.seed ?? null, null, W.run.view().thirdBosses ?? null).kind;
  const c6 = fellAndWait(W, 6);
  for (let i = 0; i < 3000 && W.run.view().phase !== 'victory'; i++) W.step();
  check(!!c6 && c6.final === true && W.run.view().phase === 'victory', `felling the ${boss} clears the Kiln and wins the campaign (phase ${W.run.view().phase})`);
  check(['founder', 'cinderback'].includes(boss), `the Firing Floor met its own boss (${boss})`);
  const lv = W.log.filter((e) => e.type === 'level_clear').map((e) => e.level);
  check(lv.join() === '4,6' && S.endingFor(CAMPAIGN_LEVELS.length, 'kiln') === S.ENDING.kiln, `the run cleared Levels ${lv.join(', ')} and ends on the Kiln's ending`);
}
{
  // No pick: the card takes the Spire's road when its wait runs out.
  const W = makeWorld(8);
  W.run.startCampaign({ level: 4, harness: true });
  fellAndWait(W, 4);
  for (let i = 0; i < TRANSIT.forkTicks + 200 && W.run.view().phase === 'transit'; i++) {
    W.step();
    const c = cardOf(W);
    if (c && c.due) W.world.cmd('campaignAdvance', 'probe');
  }
  check(W.run.view().act === 5 && W.run.campaign().road === 'spire' && W.log.some((e) => e.type === 'road_pick' && e.reason === 'default'), `no pick takes the Spire (act ${W.run.view().act}, road ${W.run.campaign().road})`);
}
{
  // The autopilot picks at once (the Spire unless told), then sets out.
  const W = makeWorld(9);
  W.run.startCampaign({ level: 4, harness: true });
  fellAndWait(W, 4);
  const ap = W.run.autopilot;
  ap.configure({ road: 'kiln' });
  for (let i = 0; i < 600 && W.run.view().phase === 'transit'; i++) W.clock.stepOnce((t) => W.world.step(t, ap.intents(t, emptySnapshot())));
  ap.configure(false);
  check(W.run.view().act === 6, `the autopilot takes the road it is given (act ${W.run.view().act})`);
}
{
  // A Spire start never forks; the Daily never forks and never meets the Kiln.
  const W = makeWorld(10);
  W.run.startCampaign({ level: 5, harness: true });
  const c5 = fellAndWait(W, 5);
  check(!!c5 && c5.final && !cardOf(W), 'a Level V start on the Spire ends there');
  const key = dailyKey(Date.UTC(2026, 9, 17, 12));
  const D = makeWorld(11);
  D.run.startCampaign({ harness: true, daily: { key, practice: true } });
  const seen = [];
  for (let lv = 1; lv <= 5 && D.run.view().phase !== 'victory'; lv++) {
    const level = D.run.view().act;
    seen.push(level);
    fellAndWait(D, level);
    const cc = cardOf(D);
    if (cc && cc.fork) seen.push('fork');
    for (let i = 0; i < 400 && D.run.view().phase === 'transit'; i++) {
      D.step();
      D.world.cmd('campaignAdvance', 'probe');
    }
  }
  check(seen.join() === '1,2,3,4,5', `the Daily runs the Spire road without a fork (${seen.join(' ')})`);
  const base = { key, id: 'probe_probe_probe_01', name: 'Probe', cls: 'healer', seed: dailySeed(key), version: VERSION };
  check(!checkScore({ ...base, depth: 40, won: true, ticks: 40 * 800 }, key).error, 'the Daily server still takes a 40-room win');
}

// ---------------------------------------------------------------- 6. saves --
for (const kind of ['founder', 'cinderback']) {
  const W = bossRoom(kind, 12);
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
  check(a.ok && c.ok && a.hs === c.hs, `${kind} mid-fight: a save round trip continues bit-identically`);
}

console.log(`\n${passes.length} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
