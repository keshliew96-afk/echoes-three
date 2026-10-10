#!/usr/bin/env node
// THIRD BOSSES, BARROW AND HEART probe (content plan 3 slice 11,
// docs/THIRD_BOSSES.md) — headless Node, the sim built like src/main.js.
//
//   node tools/third-bosses-bh-probe.mjs
//
// Checks:
//   1. Wiring: Level III meets the Wyrm, the Lich Ram or (unlocked) the Ash
//      Raven by seed; Level IV keeps the Cantor and the Colossus in every
//      campaign, unlocked or not, and the Vein Weaver joins only Endless
//      depths past the first cycle once unlocked; the kits, the boss rooms
//      (Ash Amphitheatre 25, Hollow Nave 27), deeds, tints, the freed
//      Barrow warden, the journal rows and the story lines in ten languages.
//   2. Ash Raven: a Carrion Dive lane that hurts (it rises, then dives and
//      lands at the far end to preen), a Wing Gust cone that hurts and blows
//      heroes away, the Omen ring that follows its hero then locks and hurts,
//      the enrage (Omen leaves ash).
//   3. Vein Weaver: a Bind lane that hurts and ties heroes to it (a bound
//      hero cannot walk away past the leash), the Heartbeat Slam, Brood Sacs
//      that burst and leave webs, the enrage.
//   4. Governor: a long fight with each keeps at most two player-targeted
//      telegraphs live, starts >= 72 ticks apart.
//   5. Felling each clears its level.
//   6. The run gate: a campaign carries it; the Daily ignores it; Endless
//      meets the Weaver past the first cycle when the Heart is open.
//   7. Saves: a world mid-fight (each boss) continues bit-identically after
//      a capture round trip.
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
const { endlessBossIndex } = await import(u('src/data/endless.js'));
const { isDailyKey } = await import(u('src/data/daily.js'));
const { BOSS_KITS } = await import(u('src/sim/boss.js'));
const { DEEDS, UNLOCKS, WATER_BOSSES } = await import(u('src/data/unlocks.js'));
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


const BOSSES_BEFORE = { 3: ['wyrm', 'lichram'], 4: ['cantor', 'colossus'] };

// ---------------------------------------------------------------- 1. wiring --
{
  const k3 = (LEVELS[3].bosses || []).map((b) => b.kind);
  const k4 = (LEVELS[4].bosses || []).map((b) => b.kind);
  check(k3.join() === 'wyrm,lichram,ashraven', `Level III's bosses: ${k3.join(', ')}`);
  check(k4.join() === 'cantor,colossus,veinweaver', `Level IV's bosses: ${k4.join(', ')}`);
  const oldIndex = (act, seed) => {
    let h = (seed >>> 0) ^ Math.imul(act >>> 0, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) % 2;
  };
  for (const lv of [3, 4]) {
    const before = BOSSES_BEFORE[lv];
    let same = 0;
    for (let s = 1; s <= 200; s++) if (bossFor(lv, s).kind === before[oldIndex(lv, s)]) same += 1;
    check(same === 200, `locked, seeds 1-200 on Level ${lv} meet the boss they met before (${same}/200)`);
    let deep = 0;
    for (let s = 1; s <= 40; s++) for (let d = lv; d <= lv + 12; d += 4) if (LEVELS[lv].bosses[endlessBossIndex(d, s)].kind === before[(oldIndex(lv, s) + Math.floor((d - 1) / 4)) % 2]) deep += 1;
    check(deep === 160, `locked, Endless cycles the original two as before (${deep}/160)`);
  }
  {
    const n = {};
    for (let s = 1; s <= 60; s++) n[bossFor(3, s, null, [3]).kind] = (n[bossFor(3, s, null, [3]).kind] ?? 0) + 1;
    check(k3.every((k) => n[k] > 0), `unlocked, seeds 1-60 on Level III meet all three (${k3.map((k) => `${k} ${n[k] ?? 0}`).join(', ')})`);
    const ends = new Set();
    for (let d = 3; d <= 11; d += 4) ends.add(LEVELS[3].bosses[endlessBossIndex(d, 3, [3])].kind);
    check(ends.size === 3, `unlocked, Endless cycles all three Barrow bosses (${[...ends].join(', ')})`);
  }
  {
    // The Heart: the campaign never meets the Weaver, unlocked or not, and
    // every seed keeps the boss it met before.
    let same = 0;
    for (let s = 1; s <= 200; s++) if (bossFor(4, s, null, [3, 4]).kind === BOSSES_BEFORE[4][oldIndex(4, s)]) same += 1;
    check(same === 200, `unlocked, campaign Level IV still meets the Cantor or the Colossus as before, never the Weaver (${same}/200)`);
    let firstCycle = 0;
    for (let s = 1; s <= 60; s++) if (LEVELS[4].bosses[endlessBossIndex(4, s, [4])].kind === bossFor(4, s).kind) firstCycle += 1;
    check(firstCycle === 60, `unlocked, Endless Depth 4 (the campaign's Heart) meets the campaign's boss (${firstCycle}/60)`);
    const deepKinds = {};
    for (let s = 1; s <= 60; s++) for (const d of [8, 12]) { const k = LEVELS[4].bosses[endlessBossIndex(d, s, [4])].kind; deepKinds[k] = (deepKinds[k] ?? 0) + 1; }
    check(deepKinds.veinweaver > 0 && deepKinds.cantor > 0 && deepKinds.colossus > 0, `unlocked, Depths 8 and 12 cycle all three Heart bosses (${Object.entries(deepKinds).map(([k, v]) => `${k} ${v}`).join(', ')})`);
    let all3 = 0;
    for (let s = 1; s <= 60; s++) { const set = new Set([4, 8, 12].map((d) => LEVELS[4].bosses[endlessBossIndex(d, s, [4])].kind)); if (set.size === 3) all3 += 1; }
    check(all3 === 60, `unlocked, every seed meets all three Heart bosses by Depth 12 (${all3}/60)`);
  }
  check(thirdBossActs({ wyrm: 1 }).length === 0 && thirdBossActs({ wyrm: 1, lichram: 1 }).join() === '3', "felling the Wyrm and the Lich Ram opens the Barrow's third boss");
  check(thirdBossActs({ cantor: 1, colossus: 1 }).join() === '4' && thirdBossActs({ cantor: 1 }).length === 0, "felling the Cantor and the Colossus opens the Heart's (for Endless)");
  check(!!BOSS_KITS.ashraven && !!BOSS_KITS.veinweaver, 'both boss kits are registered');
  check(bossFor(3, 1, 'ashraven').layout === 25 && bossFor(4, 1, 'veinweaver').layout === 27, 'the Raven fights in the Ash Amphitheatre (25), the Weaver in the Hollow Nave (27)');
  check(!!DEEDS.boss_ashraven && !!DEEDS.boss_veinweaver, `deeds: ${DEEDS.boss_ashraven?.name}, ${DEEDS.boss_veinweaver?.name}`);
  check(UNLOCKS.tint_ashfeather?.req?.boss === 'ashraven' && UNLOCKS.tint_veinsilk?.req?.boss === 'veinweaver', 'a tint unlocks for felling each');
  check(S.WARDENS.wyrm.also.includes('ashraven'), "felling the Raven frees the Barrow's warden at camp");
  check(S.rumourFor('ashraven', 3) === S.RUMOURS.ashraven.text && S.rumourFor('veinweaver', 4) === S.RUMOURS.veinweaver.text, 'Bramble has a rumour for each');
  check(!!S.BOSS_VOICE.ashraven && S.voiceKeyFor('veinweaver', 4) === 'veinweaver' && !!S.BOSS_VOICE.veinweaver, 'the Hollow Voice has a line for each');
  check(/Ash Raven/.test(S.chapterFor(3).summary) && /Vein Weaver/.test(S.chapterFor(4).summary), 'Chapters III and IV name them');
  const jr = BESTIARY.find((b) => b.id === 'ashraven');
  const jv = BESTIARY.find((b) => b.id === 'veinweaver');
  check(!!jr && jr.boss && !!jv && jv.boss && jr.text.length > 20 && jv.text.length > 20, 'the Journal has a page for each');
  const lines = [
    'The Ash Raven', 'THE ASH RAVEN', 'The Vein Weaver', 'THE VEIN WEAVER',
    S.RUMOURS.ashraven.text, S.RUMOURS.veinweaver.text, S.BOSS_VOICE.ashraven.text, S.BOSS_VOICE.veinweaver.text, S.chapterFor(3).summary, S.chapterFor(4).summary,
    'The Ash Raven falls out of the sky. The pyres burn down to embers.', 'The Vein Weaver’s threads go slack. Deep in the dark, the Heart misses a beat.',
    DEEDS.boss_ashraven.name, DEEDS.boss_veinweaver.name, DEEDS.boss_ashraven.text, DEEDS.boss_veinweaver.text,
    UNLOCKS.tint_ashfeather.name, UNLOCKS.tint_veinsilk.name, UNLOCKS.tint_ashfeather.text, UNLOCKS.tint_veinsilk.text,
    jr.lore, jr.text, jv.lore, jv.text,
  ];
  const langs = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'pt-BR', 'fr', 'de', 'ru'];
  const miss = [];
  for (const l of langs) {
    const tb = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
    for (const k of lines) if (!tb[k]) miss.push(`${l}: ${k.slice(0, 30)}`);
  }
  check(miss.length === 0, `${lines.length} new lines translated in nine languages${miss.length ? ` (missing ${miss.slice(0, 4).join('; ')})` : ''}`);
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const player = (W) => party(W).find((p) => p.partyIndex === 0) || party(W)[0];

// -------------------------------------------------------- 2. the Ash Raven --
{
  const W = bossRoom('ashraven', 3);
  const b = bossOf(W);
  check(!!b && b.kind === 'ashraven' && W.run.view().layout?.layoutId === 25, `Level III's boss room holds the Ash Raven in the Ash Amphitheatre (layout ${W.run.view().layout?.layoutId})`);
  // At range: it dives.
  parkParty(W, 0, 5.0);
  let rose = false;
  let dived = false;
  let preened = false;
  steps(W, 800, () => {
    mend(W);
    const bb = bossOf(W);
    if (bb?.mode === 'rise') rose = true;
    if (bb?.mode === 'dive') dived = true;
    if (bb?.mode === 'preen') preened = true;
    if (W.clock.tick % 90 === 0 && bb && dist(bb, player(W)) < 3.2) parkParty(W, bb.x > 0 ? -6 : 6, bb.z > 0 ? -3 : 5);
  });
  const dives = evs(W, 'boss_carrion_dive');
  const dTel = W.log.find((e) => e.type === 'boss_telegraph_start' && e.attack === 'dive');
  check(dives.length >= 1 && dives.some((d) => d.victims > 0) && dTel?.shape === 'lane', `Carrion Dive lanes land (${dives.length}, hits ${dives.map((d) => d.victims).join('/')})`);
  check(rose && dived && preened, `it rises, dives, then preens (rise ${rose}, dive ${dived}, preen ${preened})`);
  check(hitsOn(W, 0, b.id) > 0, `the Raven's attacks hurt the party (${hitsOn(W, 0, b.id)} hits)`);
  // Omen: the ring follows its hero.
  const omens = evs(W, 'boss_omen');
  check(omens.length >= 1, `the Omen comes down (${omens.length}, hits ${omens.map((o) => o.victims).join('/')})`);
  {
    const W2 = bossRoom('ashraven', 3, 8);
    parkParty(W2, 0, 4.5, 1.2);
    let moved = 0;
    let start = null;
    let lockedFrom = null;
    let lockedAt = null;
    let lockedMoved = 0;
    steps(W2, 900, () => {
      mend(W2);
      const bb = bossOf(W2);
      const t = bb && bb.telegraph;
      if (t && t.attack === 'omen' && (!start || start.tick === t.startTick)) {
        // walk the marked hero sideways while it follows (the first Omen)
        const p = W2.registry.byId(t.targetId);
        if (p) p.x = p.px = Math.max(-6, Math.min(6, p.x + (p.x > 4 ? -0.05 : 0.05)));
        if (!start) start = { x: t.x, z: t.z, tick: t.startTick };
        if (t.resolveTick - W2.clock.tick > 30) moved = Math.max(moved, Math.hypot(t.x - start.x, t.z - start.z));
        else {
          if (!lockedFrom) lockedFrom = { x: t.x, z: t.z };
          lockedMoved = Math.max(lockedMoved, Math.hypot(t.x - lockedFrom.x, t.z - lockedFrom.z));
          lockedAt = true;
        }
      }
    });
    check(moved >= 1.0 && lockedAt && lockedMoved < 1e-6, `the Omen ring follows its hero (${moved.toFixed(2)} u), then locks (${lockedMoved.toFixed(2)} u in the last 30 ticks)`);
  }
  // Close: it gusts and blows heroes away.
  const W3 = bossRoom('ashraven', 3, 6);
  let blown = 0;
  steps(W3, 700, () => {
    mend(W3);
    const bb = bossOf(W3);
    if (!bb) return;
    if (bb.shove && bb.shove.ticksLeft === 10 && !bb._probe) {
      const p = W3.registry.byId(bb.shove.pushes[0][0]);
      bb._probe = p ? { id: p.id, d: dist(p, bb) } : null;
    } else if (!bb.shove && bb._probe) {
      const p = W3.registry.byId(bb._probe.id);
      if (p) blown = Math.max(blown, dist(p, bb) - bb._probe.d);
      bb._probe = null;
    }
    if (!bb.shove && W3.clock.tick % 30 === 0) parkParty(W3, Math.max(-6, Math.min(6, bb.x)), Math.max(-4, Math.min(5, bb.z + 1.6)), 0.5);
  });
  const gusts = evs(W3, 'boss_wing_gust');
  const gTel = W3.log.find((e) => e.type === 'boss_telegraph_start' && e.attack === 'gust');
  check(gusts.length >= 1 && gusts.some((g) => g.victims > 0) && gTel?.shape === 'cone', `crowded, it beats a Wing Gust cone (${gusts.length}, hits ${gusts.map((g) => g.victims).join('/')})`);
  check(blown >= 1.2, `the gust blows its catch away (${blown.toFixed(2)} u)`);
  W3.run.cmd('bossHp', [0.39]);
  W3.log.length = 0;
  parkParty(W3, 0, 4.5, 1.2);
  steps(W3, 900, () => {
    mend(W3);
    const bb = bossOf(W3);
    if (bb && W3.clock.tick % 120 === 0 && dist(bb, player(W3)) < 3) parkParty(W3, bb.x > 0 ? -5 : 5, bb.z > 1 ? -3 : 5, 1.2);
  });
  const ashOmens = evs(W3, 'boss_omen');
  check(evs(W3, 'boss_enrage').length === 1 && bossOf(W3)?.enraged === true && ashOmens.length >= 1 && ashOmens.every((o) => o.ash != null), `enraged under 40 %, its Omens leave ash (${ashOmens.length})`);
}

// ------------------------------------------------------ 3. the Vein Weaver --
{
  const W = bossRoom('veinweaver', 4);
  const b = bossOf(W);
  check(!!b && b.kind === 'veinweaver' && W.run.view().layout?.layoutId === 27, `the forced Heart boss room holds the Vein Weaver in the Hollow Nave (layout ${W.run.view().layout?.layoutId})`);
  parkParty(W, 0, 3.6, 1.0);
  let leashBest = Infinity;
  let boundSeen = false;
  steps(W, 1200, () => {
    mend(W);
    const bb = bossOf(W);
    if (!bb) return;
    if (bb.binds.length) {
      boundSeen = true;
      // the bound hero tries to walk away every tick
      const p = W.registry.byId(bb.binds[0].id);
      if (p) {
        const dx = p.x - bb.x;
        const dz = p.z - bb.z;
        const l = Math.hypot(dx, dz) || 1;
        p.x = p.px = Math.max(-6.5, Math.min(6.5, p.x + (dx / l) * 0.06));
        p.z = p.pz = Math.max(-4.5, Math.min(5.5, p.z + (dz / l) * 0.06));
        // reeled in over the first ticks, then held at the leash
        if (bb.binds[0].untilTick - W.clock.tick < 150 - 20) leashBest = Math.min(leashBest, 6 - dist(p, bb));
      }
    } else if (W.clock.tick % 120 === 0 && dist(bb, player(W)) < 2.5) parkParty(W, bb.x > 0 ? -5 : 5, bb.z > 1 ? -3 : 5, 1.0);
  });
  const binds = evs(W, 'boss_bind');
  const bTel = W.log.find((e) => e.type === 'boss_telegraph_start' && e.attack === 'bind');
  check(binds.length >= 1 && binds.some((x) => x.victims > 0) && bTel?.shape === 'lane', `Bind lanes land (${binds.length}, hits ${binds.map((x) => x.victims).join('/')})`);
  check(boundSeen && evs(W, 'boss_bind_break').length >= 1, `the thread ties a hero, then breaks (${evs(W, 'boss_bind_break').length} breaks)`);
  check(leashBest >= 6 - 3.9, `a bound hero is reeled in, and walking away stays at the leash (max ${(6 - leashBest).toFixed(2)} u from it)`);
  const slams = evs(W, 'boss_vein_slam');
  check(slams.length >= 1 && slams.every((s) => s.patches.length === 4), `the Heartbeat Slam beats and leaves vein patches (${slams.length}, hits ${slams.map((s) => s.victims).join('/')})`);
  const sacs = evs(W, 'boss_brood_sacs');
  const webs = W.log.filter((e) => e.type === 'slick_spawn' && e.variant === 'vein');
  check(sacs.length >= 1 && webs.length >= 3, `Brood Sacs fall and leave webs (${sacs.length} volleys, ${webs.length} vein patches)`);
  check(hitsOn(W, 0, b.id) > 0, `the Weaver's attacks hurt the party (${hitsOn(W, 0, b.id)} hits)`);
  W.run.cmd('bossHp', [0.39]);
  steps(W, 30, () => mend(W));
  check(evs(W, 'boss_enrage').length === 1 && bossOf(W)?.enraged === true, 'it enrages under 40 %');
}

// ------------------------------------------------------------ 4. governor --
for (const [kind, lv] of [['ashraven', 3], ['veinweaver', 4]]) {
  const W = bossRoom(kind, lv, 9);
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
  check(addKinds(W, 0).length > 0, `${kind}: its add phases call ${[...new Set(addKinds(W, 0))].join(', ')}`);
}

// ------------------------------------------------------- 5. level clears --
for (const [kind, lv] of [['ashraven', 3], ['veinweaver', 4]]) {
  const W = bossRoom(kind, lv, 5);
  W.run.cmd('killBoss');
  let clear = null;
  for (let i = 0; i < 4000 && !clear; i++) {
    W.world.cmd('killAllEnemies');
    mend(W);
    W.step();
    clear = W.log.find((e) => e.type === 'level_clear' && e.level === lv);
  }
  check(!!clear, `felling the ${kind} clears Level ${lv}`);
}

// ------------------------------------------------------- 6. the run gate --
{
  let seed = 1;
  while (bossFor(3, seed, null, [3]).kind !== 'ashraven') seed += 1;
  const toBoss = (W) => {
    for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
    W.world.cmd('skipToRoom', 8);
    for (let i = 0; i < 600 && !(W.run.view().boss && W.run.view().boss.active); i++) W.step();
  };
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 3, harness: true, thirdBosses: [3, 4] });
  toBoss(W);
  const fs = W.run.view().frame.seed;
  check(JSON.stringify(W.run.view().thirdBosses) === '[3,4]' && bossOf(W)?.kind === bossFor(3, fs, null, [3]).kind, `an unlocked campaign's Barrow boss room holds the seed's roll (${bossOf(W)?.kind})`);
  const W4 = makeWorld(seed);
  W4.run.startCampaign({ level: 4, harness: true, thirdBosses: [3, 4] });
  toBoss(W4);
  check(['cantor', 'colossus'].includes(bossOf(W4)?.kind), `an unlocked campaign's Heart still ends on the Cantor or the Colossus (${bossOf(W4)?.kind})`);
  const key = ['2026-10-10', '20261010'].find((k) => isDailyKey(k));
  const D = makeWorld(seed);
  D.run.startCampaign({ level: 1, harness: true, daily: { key }, thirdBosses: [3, 4] });
  check(!!key && D.run.view().daily && (D.run.view().thirdBosses ?? null) === null, 'the Daily ignores the gate (never a third boss)');
  const tree = clonePlain(W.io.capture());
  const X = makeWorld(seed);
  X.io.apply(clonePlain(tree));
  check(JSON.stringify(X.run.view().thirdBosses) === '[3,4]', 'the gate survives a save round trip');
  // Endless: a descent on a seed whose second Heart cycle rolls the Weaver.
  let es = 1;
  while (LEVELS[4].bosses[endlessBossIndex(8, es, [4])].kind !== 'veinweaver') es += 1;
  const E = makeWorld(es);
  E.run.startCampaign({ level: 1, harness: true, endless: true, thirdBosses: [4] });
  const efs = E.run.view().frame?.seed ?? es;
  const want = LEVELS[4].bosses[endlessBossIndex(8, efs, [4])].kind;
  const wantLocked = LEVELS[4].bosses[endlessBossIndex(8, efs)].kind;
  check(wantLocked !== 'veinweaver' && ['cantor', 'colossus', 'veinweaver'].includes(want), `Depth 8 on this seed meets ${want} when open, ${wantLocked} when locked`);
}

// ---------------------------------------------------------------- 7. saves --
for (const [kind, lv] of [['ashraven', 3], ['veinweaver', 4]]) {
  const W = bossRoom(kind, lv, 12);
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
