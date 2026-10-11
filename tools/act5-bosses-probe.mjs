#!/usr/bin/env node
// ACT V BOSSES probe (docs/ACT_V_BOSSES.md) — headless Node, the sim built
// like src/main.js.
//
//   node tools/act5-bosses-probe.mjs
//
// Checks:
//   1. Wiring: five campaign levels; Level V's boss room holds the Hush or
//      the Skyhorn by seed (both appear); their kits, deeds, tints, Journal
//      rows, warden, chapter, ending and story lines in all ten languages.
//   2. The Hush: Still Note rings that hurt and slow, Unringing lanes (with
//      the seats' lane-step flag), three Stillnesses at 75/50/25 % calling the Spire's
//      adds, each followed by a Great Hush and a drained window, hush patches
//      from the Second Stillness, and a party at the walls left untouched.
//   3. The Skyhorn: Horn Rush lanes that throw, a dazed window after a wall,
//      the Bell Toll when crowded, the Sky Leap from the Second phase (out of
//      reach in the air), the enrage.
//   4. Governor: at most two player-targeted telegraphs live, >= 72 ticks.
//   5. Level IV no longer wins the game; felling either Level V boss does.
//   6. Boss Rush runs ten fights; the Daily server wants 40 rooms for a win.
//   7. Saves: each fight mid-phase continues bit-identically.
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
const { LEVELS, bossFor, CAMPAIGN_ACTS, ACT_IDS } = await import(u('src/data/levels.js'));
const { RUSH_RULES, LAP, rushLine } = await import(u('src/data/rush.js'));
const { checkScore } = await import(u('server/daily.mjs'));
const { dailySeed, dailyKey } = await import(u('src/data/daily.js'));
const { VERSION } = await import(u('src/version.js'));
const { BESTIARY } = await import(u('src/data/journal.js'));
const { BOSS_KITS } = await import(u('src/sim/boss.js'));
const { DEEDS, UNLOCKS } = await import(u('src/data/unlocks.js'));
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
function bossRoom(kind, seed = 5, level = 5) {
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

// ---------------------------------------------------------------- 1. wiring --
{
  check(CAMPAIGN_ACTS === 5 && ACT_IDS.join() === '1,2,3,4,5', `the campaign has five levels (${CAMPAIGN_ACTS}; acts ${ACT_IDS.join()})`);
  const lv = LEVELS[5];
  const kinds = (lv.bosses || []).filter((b) => !b.endlessOnly).map((b) => b.kind);
  check(kinds.join() === 'hush,skyhorn' && lv.boss === 'hush', `Level V's bosses are the Hush and the Skyhorn (${kinds.join(', ')})`);
  const rolled = {};
  for (let s = 1; s <= 40; s++) rolled[bossFor(5, s).kind] = (rolled[bossFor(5, s).kind] || 0) + 1;
  check(rolled.hush > 0 && rolled.skyhorn > 0 && Object.keys(rolled).length === 2, `seeds 1-40 meet both (${JSON.stringify(rolled)})`);
  check(!!BOSS_KITS.hush && !!BOSS_KITS.skyhorn, 'both boss kits are registered');
  const hush = lv.bosses.find((b) => b.kind === 'hush');
  check(hush.addsByPhase && hush.addsByPhase.length === 3, 'the Hush carries three Stillnesses of adds');
  check(!!DEEDS.boss_hush && !!DEEDS.boss_skyhorn, `deeds: ${DEEDS.boss_hush?.name}, ${DEEDS.boss_skyhorn?.name}`);
  check(UNLOCKS.tint_hushveil?.req?.boss === 'hush' && UNLOCKS.tint_skybronze?.req?.boss === 'skyhorn', 'a tint unlocks for felling each');
  check(S.rumourFor('hush', 5) === S.RUMOURS.hush.text && S.rumourFor('skyhorn', 5) === S.RUMOURS.skyhorn.text, 'Bramble names each Act V boss on Level V');
  check(S.voiceKeyFor('hush', 5) === 'hush' && !!S.BOSS_VOICE.hush && !!S.BOSS_VOICE.skyhorn, 'the Hollow Voice has a line for each');
  const ch = S.chapterFor(5);
  check(!!ch && ch.verse === 'sky' && /Hush/.test(ch.summary) && /Skyhorn/.test(ch.summary), 'Chapter V, the Verse of Sky, names both');
  check(S.endingFor(5) === S.ENDING.spire && S.endingFor(4) === S.ENDING.heart, 'a five-level campaign ends on the Spire ending');
  check(S.WARDENS.skyhorn?.model === 'warden_ibex' && S.WARDENS.skyhorn.also.includes('hush'), 'either boss frees the Skyhorn warden');
  check(BESTIARY.length === 51 && BESTIARY.some((r) => r.id === 'hush' || r.kind === 'hush'), `the Journal lists them (${BESTIARY.length} entries)`);
  const lines = [
    'The Hush', 'THE HUSH', 'The Skyhorn', 'THE SKYHORN', 'Sky@@verse', ch.title, ch.summary,
    S.RUMOURS.hush.text, S.RUMOURS.skyhorn.text, S.BOSS_VOICE.hush.text, S.BOSS_VOICE.skyhorn.text, S.ENDING.spire.text, S.WARDENS.skyhorn.text,
    'The Hush breaks. In the gods’ belfry, a bell rings again.', 'The Skyhorn falls. The stair to the gods’ belfry stands open.',
    DEEDS.boss_hush.name, DEEDS.boss_skyhorn.name, DEEDS.boss_hush.text, DEEDS.boss_skyhorn.text,
    DEEDS.rush_lap.text, DEEDS.rush_won.text, DEEDS.rush_swift.text, DEEDS.long_road.text,
    UNLOCKS.tint_hushveil.name, UNLOCKS.tint_skybronze.name, UNLOCKS.tint_hushveil.text, UNLOCKS.tint_skybronze.text,
  ];
  const langs = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'pt-BR', 'fr', 'de', 'ru'];
  const miss = [];
  for (const l of langs) {
    const tb = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
    for (const k of lines) if (!k || !tb[k]) miss.push(`${l}: ${String(k).slice(0, 30)}`);
  }
  check(miss.length === 0, `${lines.length} new lines translated in nine languages${miss.length ? ` (missing ${miss.slice(0, 4).join('; ')})` : ''}`);
}

// Lane evasion: allies standing in a `lance` lane when its warning starts
// are out of it when it lands (the seats' lane step).
function laneWatch(W, attack) {
  const rec = { lanes: 0, inAtStart: 0, outAtEnd: 0 };
  let cur = null;
  const inLane = (t, p) => {
    const px = p.x - t.fromX;
    const pz = p.z - t.fromZ;
    const along = px * t.dirX + pz * t.dirZ;
    return along >= -0.3 && along <= t.length + 0.3 && Math.abs(px * t.dirZ - pz * t.dirX) <= t.width / 2 + (p.radius || 0.3);
  };
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

// ---------------------------------------------------------------- 2. the Hush --
{
  const W = bossRoom('hush');
  const b = bossOf(W);
  check(!!b && b.kind === 'hush' && W.run.view().layout?.layoutId === 32, `the Belfry Crown holds the Hush (layout ${W.run.view().layout?.layoutId})`);
  parkParty(W, 0, 4.6);
  let from = W.log.length;
  const lw = laneWatch(W, 'unring');
  steps(W, 1100, () => {
    mend(W);
    lw.tick();
  });
  const notes = evs(W, 'boss_still_note');
  const lanes = evs(W, 'boss_unring');
  check(notes.length >= 1 && notes.some((n) => n.victims > 0), `Still Note rings land (${notes.length}, hits ${notes.map((n) => n.victims).join('/')})`);
  check(notes.every((n) => !n.patch), 'no hush patch before the Second Stillness');
  check(W.log.some((e) => e.type === 'status_apply' && e.status === 'slow') || W.log.some((e) => /slow/.test(e.type)), 'the note hushes (slows) the heroes it catches');
  check(lanes.length >= 1, `Unringing lanes are cast (${lanes.length}, hits ${lanes.map((n) => n.victims).join('/')})`);
  const laneTel = W.log.find((e) => e.type === 'boss_telegraph_start' && e.attack === 'unring');
  check(!!laneTel && laneTel.shape === 'lane', 'the Unringing is a lane telegraph');
  // (Seats parked by this probe often hold still, as they do for the
  // Cantor's lance; the flag is what the seats' lane step reads.)
  check(lw.rec.lanes >= 1, `the lane carries the seats' lane-step flag (${lw.rec.lanes} lanes; ${lw.rec.outAtEnd} of ${lw.rec.inAtStart} seats in it stepped out)`);
  check(evs(W, 'boss_great_hush').length === 0, 'no Great Hush before the First Stillness');
  check(hitsOn(W, from, b.id) > 0, `the Hush's attacks hurt the party (${hitsOn(W, from, b.id)} hits)`);
  // The three Stillnesses, each followed by a Great Hush.
  for (const [pct, want, n] of [[0.74, ['kite', 'gargoyle'], 1], [0.49, ['chime', 'gargoyle'], 2], [0.24, ['hanger', 'chime', 'kite'], 3]]) {
    W.world.cmd('killAllEnemies');
    from = W.log.length;
    W.run.cmd('bossHp', [pct]);
    // Stand next to it: the Great Hush rings round it.
    let bb = bossOf(W);
    parkParty(W, Math.max(-6, Math.min(6, bb.x)), Math.max(-4, Math.min(5, bb.z + 1.6)), 0.5);
    let drainedSeen = false;
    let takenSeen = 0;
    steps(W, 360, () => {
      mend(W);
      bb = bossOf(W);
      if (bb && bb.takenMul) takenSeen = bb.takenMul;
      if (W.run.view().boss?.kit?.drained || (bb && bb.mode === 'drained')) drainedSeen = true;
    });
    const st = W.log.slice(from).filter((e) => e.type === 'boss_stillness');
    const ks = addKinds(W, from);
    check(st.length === 1 && st[0].stillness === n && want.every((k) => ks.includes(k)), `at ${Math.round(pct * 100)}% it falls into Stillness ${st[0]?.stillness} and calls ${[...new Set(ks)].join(', ')}`);
    const gh = W.log.slice(from).filter((e) => e.type === 'boss_great_hush');
    const tel = W.log.slice(from).find((e) => e.type === 'boss_telegraph_start' && e.attack === 'great');
    check(gh.length >= 1 && gh[0].victims > 0 && !!tel && gh[0].tick - tel.tick >= 90, `then the Great Hush (warned ${tel ? gh[0]?.tick - tel.tick : '-'} ticks) catches those who stayed (${gh[0]?.victims ?? 0})`);
    check(drainedSeen && takenSeen > 1, `and it is drained after it, taking ${takenSeen}x damage`);
    if (n === 2) {
      W.world.cmd('killAllEnemies');
      parkParty(W, 0, 4.6);
      const f2 = W.log.length;
      steps(W, 500, () => mend(W));
      const pn = W.log.slice(f2).filter((e) => e.type === 'boss_still_note');
      check(pn.some((x) => x.patch) && W.log.slice(f2).some((e) => e.type === 'slick_spawn' && e.variant === 'hush'), `from the Second Stillness its notes leave hush patches (${pn.filter((x) => x.patch).length} of ${pn.length})`);
    }
  }
  // Out at the walls, the Great Hush misses.
  W.world.cmd('killAllEnemies');
  const f3 = W.log.length;
  let walls = 0;
  steps(W, 900, () => {
    mend(W);
    const bb = bossOf(W);
    if (bb && bb.telegraph && bb.telegraph.attack === 'great') {
      const sx = bb.x > 0 ? -7.5 : 7.5;
      parkParty(W, sx, bb.z > 0 ? -4.5 : 4.5, 0.5);
      walls += 1;
    }
  });
  const gh2 = W.log.slice(f3).filter((e) => e.type === 'boss_great_hush');
  check(gh2.length >= 1 && gh2.every((g) => g.victims === 0), `a party that walks to the walls is not caught (${gh2.map((g) => g.victims).join('/')})`);
}

// ------------------------------------------------------------ 3. the Skyhorn --
{
  const W = bossRoom('skyhorn');
  const b = bossOf(W);
  check(!!b && b.kind === 'skyhorn', 'the Belfry Crown holds the Skyhorn (forced)');
  parkParty(W, 0, 4.6);
  const lw = laneWatch(W, 'rush');
  steps(W, 1100, () => {
    mend(W);
    lw.tick();
  });
  const rushes = evs(W, 'boss_horn_rush');
  const ends = evs(W, 'boss_horn_rush_end');
  check(rushes.length >= 1 && ends.length >= 1, `Horn Rushes are run (${rushes.length} rushes, ${ends.map((e) => `${e.hits}${e.wall ? 'w' : ''}`).join('/')})`);
  const tel = W.log.find((e) => e.type === 'boss_telegraph_start' && e.attack === 'rush');
  check(!!tel && tel.shape === 'lane', 'the rush is a lane telegraph');
  check(ends.some((e) => e.hits > 0), 'a rush throws the heroes it meets');
  const walled = ends.filter((e) => e.wall);
  check(walled.length >= 1 && evs(W, 'boss_horn_recover').length >= 1, `a rush into the wall leaves it dazed, then it recovers (${walled.length} walls)`);
  check(lw.rec.lanes >= 1, `the rush lane carries the seats' lane-step flag (${lw.rec.lanes} lanes; ${lw.rec.outAtEnd} of ${lw.rec.inAtStart} seats in it stepped out)`);
  // Dazed: it takes more damage.
  let dazedMul = 0;
  W.world.cmd('killAllEnemies');
  parkParty(W, 0, 4.6);
  steps(W, 900, () => {
    mend(W);
    const bb = bossOf(W);
    if (bb && bb.mode === 'dazed' && bb.takenMul) dazedMul = bb.takenMul;
  });
  check(dazedMul > 1, `dazed, it takes ${dazedMul}x damage`);
  check(evs(W, 'boss_sky_leap').length === 0, 'no Sky Leap before the Second phase');
  // Crowd it: the Bell Toll.
  W.world.cmd('killAllEnemies');
  let from = W.log.length;
  steps(W, 500, () => {
    mend(W);
    const bb = bossOf(W);
    if (bb && W.clock.tick % 30 === 0) parkParty(W, Math.max(-6, Math.min(6, bb.x)), Math.max(-4, Math.min(5, bb.z + 1.5)), 0.5);
  });
  const toll = W.log.slice(from).filter((e) => e.type === 'boss_horn_toll');
  check(toll.length >= 1 && toll.some((t) => t.victims > 0), `crowded, its Bell Toll lands (${toll.length}, hits ${toll.map((t) => t.victims).join('/')})`);
  // Second phase: the Sky Leap on the farthest hero.
  W.world.cmd('killAllEnemies');
  W.run.cmd('bossHp', [0.74]);
  steps(W, 140, () => mend(W));
  W.world.cmd('killAllEnemies');
  W.run.cmd('bossHp', [0.49]);
  steps(W, 140, () => mend(W));
  W.world.cmd('killAllEnemies');
  from = W.log.length;
  parkParty(W, 0, 4.6, 1.6);
  let untouchable = false;
  steps(W, 1000, () => {
    mend(W);
    const bb = bossOf(W);
    if (bb && bb.mode === 'air' && bb.hittable === false) untouchable = true;
  });
  const leaps = W.log.slice(from).filter((e) => e.type === 'boss_sky_leap');
  check(leaps.length >= 1 && leaps[0].shots.length === 6, `from the Second phase it Sky Leaps (${leaps.length}, ${leaps[0]?.shots?.length ?? 0} shards, hits ${leaps.map((l) => l.victims).join('/')})`);
  check(untouchable, 'it is out of reach while in the air');
  W.run.cmd('bossHp', [0.39]);
  from = W.log.length;
  steps(W, 900, () => mend(W));
  const enr = W.log.slice(from).filter((e) => e.type === 'boss_enrage');
  check(enr.length === 1, 'enraged under 40 %');
}

// ------------------------------------------------------------ 4. governor --
for (const kind of ['hush', 'skyhorn']) {
  const W = bossRoom(kind, 9);
  W.run.cmd('bossHp', [0.45]);
  parkParty(W, 0, 3.6);
  let live = 0;
  let maxLive = 0;
  const starts = [];
  W.bus.on('telegraph_start', (e) => {
    if (e.playerTargeted) starts.push(e.tick);
  });
  steps(W, 2400, () => {
    mend(W);
    live = W.registry.all().filter((e) => e.telegraph && e.telegraph.playerTargeted).length;
    if (live > maxLive) maxLive = live;
  });
  let minGap = Infinity;
  for (let i = 1; i < starts.length; i++) minGap = Math.min(minGap, starts[i] - starts[i - 1]);
  check(maxLive <= GOVERNOR.maxConcurrent && minGap >= GOVERNOR.staggerTicks, `${kind} fight with adds: at most ${maxLive} player-targeted telegraphs live, starts >= ${minGap} ticks apart (${starts.length} starts)`);
}

// ------------------------------------------------ 5. Level IV, then Level V --
function fellAndWait(W, level) {
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
{
  const W = bossRoom('cantor', 5, 4);
  const clear = fellAndWait(W, 4);
  for (let i = 0; i < 3000 && W.run.view().phase !== 'victory' && W.run.view().phase !== 'transit' && !W.run.view().nextLevel; i++) W.step();
  check(!!clear && !clear.final && W.run.view().phase !== 'victory', `felling the Hollow Cantor clears Level IV without winning (final ${clear?.final}, phase ${W.run.view().phase})`);
}
for (const kind of ['hush', 'skyhorn']) {
  const W = bossRoom(kind, 5);
  const clear = fellAndWait(W, 5);
  for (let i = 0; i < 3000 && W.run.view().phase !== 'victory'; i++) W.step();
  check(!!clear && clear.final === true && W.run.view().phase === 'victory', `felling the ${kind} clears Level V and wins the campaign (phase ${W.run.view().phase})`);
}

// ------------------------------------------------- 6. Boss Rush and Daily --
{
  check(LAP === 5 && RUSH_RULES.fights === 10, `Boss Rush: two laps of five (${RUSH_RULES.fights} fights)`);
  let ok = true;
  const seen = new Set();
  for (let s = 1; s <= 12; s++) {
    const line = rushLine(s);
    if (line.length !== 10 || line.map((f) => f.act).join() !== '1,2,3,4,5,1,2,3,4,5') ok = false;
    if (!['hush', 'skyhorn'].includes(line[4].kind) || !['hush', 'skyhorn'].includes(line[9].kind) || line[4].kind === line[9].kind) ok = false;
    seen.add(line[4].kind);
  }
  check(ok && seen.size === 2, 'every rush line meets the Spire fifth and tenth, one boss each lap');
  const key = dailyKey(Date.UTC(2026, 9, 11, 12));
  const base = { key, id: 'probe_probe_probe_01', name: 'Probe', cls: 'healer', seed: dailySeed(key), version: VERSION };
  const won40 = checkScore({ ...base, depth: 40, won: true, ticks: 40 * 800 }, key);
  const won32 = checkScore({ ...base, depth: 32, won: true, ticks: 32 * 800 }, key);
  const deep = checkScore({ ...base, depth: 41, won: false, ticks: 41 * 800 }, key);
  check(!won40.error && won32.error === 'implausible' && deep.error === 'bad_score', `the Daily server takes a 40-room win and refuses a 32-room one (${won40.error ?? 'ok'}, ${won32.error}, ${deep.error})`);
  // (A whole Daily run through all five levels: tools/act5-probe.mjs.)
}

// ---------------------------------------------------------------- 7. saves --
for (const kind of ['hush', 'skyhorn']) {
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
