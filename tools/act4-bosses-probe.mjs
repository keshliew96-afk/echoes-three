#!/usr/bin/env node
// ACT IV BOSSES probe (docs/ACT_IV_BOSSES.md) — headless Node, the sim built
// like src/main.js.
//
//   node tools/act4-bosses-probe.mjs
//
// Checks:
//   1. Wiring: Level IV's boss room holds the Hollow Cantor or the Geode
//      Colossus by seed (both appear), their kits, deeds, tints and the
//      story lines (rumour, Hollow Voice, fall line, chapter) in all ten
//      languages.
//   2. Hollow Cantor: a Hollow Note ring that hurts, a Sung Lance lane that
//      hurts (flagged for the seats' lane step), three verses at 75/50/25 %
//      calling the Wood's, the Mill's and the Barrow's adds, the echoing note
//      (crystal shards) from the Second Verse, the Echo Step away from a
//      crowd, the Heart Pulse in the Third Verse.
//   3. Geode Colossus: a Fissure lane that hurts and leaves three crystal
//      patches, a Geode Rain of four geodes (one player-targeted), a Geode
//      Burst when crowded and the spent window after it, the enrage with
//      burst shards.
//   4. Governor: a long fight with each boss keeps at most two
//      player-targeted telegraphs live, starts >= 72 ticks apart.
//   5. The final boss: killing the Cantor clears Level IV and wins the
//      campaign.
//   6. Saves: a world mid-fight (each boss, Cantor in its Second Verse)
//      continues bit-identically after a capture round trip.
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
const { LEVELS, bossFor } = await import(u('src/data/levels.js'));
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
// The Heart Chamber with `kind` in it: the boss made tough (HP cuts go
// through the run's own bossHp hook), the room's log cleared.
function bossRoom(kind, seed = 5) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 4, harness: true, boss: kind });
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
  const lv = LEVELS[4];
  const kinds = (lv.bosses || []).map((b) => b.kind);
  check(kinds.join() === 'cantor,colossus', `Level IV's bosses are the Hollow Cantor and the Geode Colossus (${kinds.join(', ')})`);
  const rolled = new Set();
  for (let s = 1; s <= 40; s++) rolled.add(bossFor(4, s).kind);
  check(rolled.has('cantor') && rolled.has('colossus'), `seeds 1-40 meet both (${[...rolled].join(', ')})`);
  check(!!BOSS_KITS.cantor && !!BOSS_KITS.colossus, 'both boss kits are registered');
  const cant = lv.bosses.find((b) => b.kind === 'cantor');
  check(cant.addsByPhase && cant.addsByPhase.length === 3, 'the Cantor carries three verses of adds');
  check(!!DEEDS.boss_cantor && !!DEEDS.boss_colossus, `deeds: ${DEEDS.boss_cantor?.name}, ${DEEDS.boss_colossus?.name}`);
  check(UNLOCKS.tint_hollowsong?.req?.boss === 'cantor' && UNLOCKS.tint_geodeglass?.req?.boss === 'colossus', 'a tint unlocks for felling each');
  check(S.rumourFor('cantor', 4) === S.RUMOURS.cantor.text && S.rumourFor('colossus', 4) === S.RUMOURS.colossus.text, 'Bramble names each Act IV boss on Level IV');
  check(S.rumourFor('wyrm', 4) === S.HEART_RUMOUR.text, 'a stand-in from another land still gets the Heart Chamber rumour');
  check(S.voiceKeyFor('cantor', 4) === 'cantor' && S.voiceKeyFor('colossus', 4) === 'colossus' && !!S.BOSS_VOICE.colossus, 'the Hollow Voice has a line for each');
  check(/Hollow Cantor/.test(S.chapterFor(4).summary) && /Geode Colossus/.test(S.chapterFor(4).summary), 'Chapter IV names both');
  const lines = [
    'The Hollow Cantor', 'THE HOLLOW CANTOR', 'The Geode Colossus', 'THE GEODE COLOSSUS',
    S.RUMOURS.cantor.text, S.RUMOURS.colossus.text, S.BOSS_VOICE.cantor.text, S.BOSS_VOICE.colossus.text, S.chapterFor(4).summary,
    'The Hollow Cantor’s last note fades. The Heart falls quiet.', 'The Geode Colossus shatters. Below the Barrow, the old beat falters.',
    DEEDS.boss_cantor.name, DEEDS.boss_colossus.name, DEEDS.boss_cantor.text, DEEDS.boss_colossus.text,
    UNLOCKS.tint_hollowsong.name, UNLOCKS.tint_geodeglass.name, UNLOCKS.tint_hollowsong.text, UNLOCKS.tint_geodeglass.text,
  ];
  const langs = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'pt-BR', 'fr', 'de', 'ru'];
  const miss = [];
  for (const l of langs) {
    const tb = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
    for (const k of lines) if (!tb[k]) miss.push(`${l}: ${k.slice(0, 30)}`);
  }
  check(miss.length === 0, `${lines.length} new lines translated in nine languages${miss.length ? ` (missing ${miss.slice(0, 4).join('; ')})` : ''}`);
}

// --------------------------------------------------------- 2. the Cantor --
{
  const W = bossRoom('cantor');
  const b = bossOf(W);
  check(!!b && b.kind === 'cantor' && W.run.view().layout?.layoutId === 18, `the Heart Chamber holds the Hollow Cantor (layout ${W.run.view().layout?.layoutId})`);
  // Park the party far: the lance is cast at range, notes at the target.
  parkParty(W, 0, 4.6);
  let from = W.log.length;
  steps(W, 900, () => mend(W));
  const notes = evs(W, 'boss_note');
  const lances = evs(W, 'boss_sung_lance');
  check(notes.length >= 1 && notes.some((n) => n.victims > 0), `Hollow Note rings land (${notes.length}, hits ${notes.map((n) => n.victims).join('/')})`);
  check(lances.length >= 1 && lances.some((n) => n.victims > 0), `Sung Lance lanes land (${lances.length}, hits ${lances.map((n) => n.victims).join('/')})`);
  const laneTel = W.log.find((e) => e.type === 'boss_telegraph_start' && e.attack === 'lance');
  check(!!laneTel && laneTel.shape === 'lane', 'the lance is a lane telegraph');
  check(notes.every((n) => n.echo === 0), 'no echo before the Second Verse');
  check(hitsOn(W, from, b.id) > 0, `the Cantor's attacks hurt the party (${hitsOn(W, from, b.id)} hits)`);
  // The three verses.
  const verseAdds = [];
  for (const [pct, want] of [[0.74, ['boar', 'mantis']], [0.49, ['toad', 'moth']], [0.24, ['ram', 'mole', 'crow']]]) {
    from = W.log.length;
    W.run.cmd('bossHp', [pct]);
    steps(W, 260, () => mend(W));
    const v = evs(W, 'boss_verse').filter((e) => W.log.indexOf(e) >= from);
    const ks = addKinds(W, from);
    verseAdds.push(`${v.map((e) => e.verse).join()}:${[...new Set(ks)].join('+')}`);
    check(v.length === 1 && want.every((k) => ks.includes(k)), `at ${Math.round(pct * 100)}% it takes verse ${v[0]?.verse} and calls ${[...new Set(ks)].join(', ')}`);
    if (v[0]?.verse === 2) {
      // The echoing note and the Echo Step: crowd it.
      W.world.cmd('killAllEnemies');
      W.log.length = 0;
      const bx = b.x;
      const bz = b.z;
      parkParty(W, Math.max(-6, Math.min(6, bx)), Math.max(-4, Math.min(5, bz + 1.4)), 0.5);
      steps(W, 420, () => mend(W));
      const step = evs(W, 'boss_echo_step')[0];
      const land = evs(W, 'boss_echo_land')[0];
      check(!!step && !!land && Math.hypot(land.x - bx, land.z - bz) >= 3, `crowded, it Echo Steps away (${step ? `${bx.toFixed(1)},${bz.toFixed(1)} -> ${land?.x},${land?.z}` : 'no step'})`);
      parkParty(W, 0, 4.6);
      W.log.length = 0;
      steps(W, 600, () => mend(W));
      const echo = evs(W, 'boss_note').filter((n) => n.echo > 0);
      check(echo.length >= 1 && echo[0].shots.length === 5, `the Second Verse's notes echo as crystal shards (${echo.length} notes, ${echo[0]?.shots?.length ?? 0} shards)`);
    }
    if (v[0]?.verse === 3) {
      W.world.cmd('killAllEnemies');
      W.log.length = 0;
      parkParty(W, Math.max(-6, Math.min(6, b.x)), Math.max(-4, Math.min(5, b.z + 1.6)), 0.5);
      steps(W, 300, () => {
        mend(W);
        // stay on it (it steps away from crowds)
        const bb = bossOf(W);
        if (bb && W.clock.tick % 40 === 0) parkParty(W, Math.max(-6, Math.min(6, bb.x)), Math.max(-4, Math.min(5, bb.z + 1.6)), 0.5);
      });
      const pulse = evs(W, 'boss_heart_pulse');
      check(pulse.length >= 1 && pulse.some((p) => p.victims > 0), `the Third Verse's Heart Pulse lands on a crowd (${pulse.length}, hits ${pulse.map((p) => p.victims).join('/')})`);
    }
  }
  void verseAdds;
}

// ------------------------------------------------------- 3. the Colossus --
{
  const W = bossRoom('colossus');
  const b = bossOf(W);
  check(!!b && b.kind === 'colossus', 'the Heart Chamber holds the Geode Colossus (forced)');
  parkParty(W, 0, 4.4);
  steps(W, 900, () => mend(W));
  const fiss = evs(W, 'boss_fissure');
  check(fiss.length >= 1 && fiss.some((f) => f.victims > 0), `Fissure lanes land (${fiss.length}, hits ${fiss.map((f) => f.victims).join('/')})`);
  check(fiss.length >= 1 && fiss[0].patches.length === 3 && W.log.filter((e) => e.type === 'slick_spawn' && e.variant === 'crystal').length >= 3, 'each fissure leaves three crystal patches');
  const rain = evs(W, 'boss_geode_rain');
  const rainTel = rain.length ? W.log.filter((e) => e.type === 'telegraph_start' && rain[0].globs.includes(e.id)) : [];
  check(rain.length >= 1 && rain[0].globs.length === 4 && rainTel.filter((t) => t.playerTargeted).length === 1, `Geode Rain drops four geodes, one aimed (${rain.length} rains, aimed ${rainTel.filter((t) => t.playerTargeted).length})`);
  // Crowd it for the Geode Burst.
  W.world.cmd('killAllEnemies');
  W.log.length = 0;
  parkParty(W, Math.max(-6, Math.min(6, b.x)), Math.max(-4, Math.min(5, b.z + 1.5)), 0.5);
  steps(W, 420, () => mend(W));
  const burst = evs(W, 'boss_geode_burst');
  check(burst.length >= 1 && burst.some((x) => x.victims > 0), `crowded, its Geode Burst lands (${burst.length}, hits ${burst.map((x) => x.victims).join('/')})`);
  const rec = evs(W, 'boss_geode_recover')[0];
  check(burst.length >= 1 && !!rec && rec.tick - burst[0].tick >= 80, `then it is spent ${rec ? rec.tick - burst[0].tick : '-'} ticks`);
  check(burst.every((x) => x.shots.length === 0), 'no burst shards before the enrage');
  W.run.cmd('bossHp', [0.39]);
  W.log.length = 0;
  steps(W, 600, () => {
    mend(W);
    const bb = bossOf(W);
    if (bb && W.clock.tick % 40 === 0) parkParty(W, Math.max(-6, Math.min(6, bb.x)), Math.max(-4, Math.min(5, bb.z + 1.5)), 0.5);
  });
  const enr = evs(W, 'boss_enrage');
  const b2 = evs(W, 'boss_geode_burst');
  check(enr.length === 1 && b2.some((x) => x.shots.length === 6), `enraged under 40 %, its burst throws six shards (${b2.map((x) => x.shots.length).join('/')})`);
}

// ------------------------------------------------------------ 4. governor --
for (const kind of ['cantor', 'colossus']) {
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

// ------------------------------------------------------- 5. the final boss --
{
  const W = bossRoom('cantor', 5);
  W.run.cmd('killBoss');
  let won = null;
  for (let i = 0; i < 4000 && !won; i++) {
    W.world.cmd('killAllEnemies');
    mend(W);
    W.step();
    won = W.log.find((e) => e.type === 'level_clear' && e.level === 4);
  }
  for (let i = 0; i < 3000 && W.run.view().phase !== 'victory'; i++) W.step();
  check(!!won && won.final === true && W.run.view().phase === 'victory', `felling the Hollow Cantor clears Level IV and wins the campaign (phase ${W.run.view().phase})`);
}

// ---------------------------------------------------------------- 6. saves --
for (const kind of ['cantor', 'colossus']) {
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
