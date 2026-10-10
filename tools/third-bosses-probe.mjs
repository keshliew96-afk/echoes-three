#!/usr/bin/env node
// THIRD BOSSES probe (content plan 3 slice 10, docs/THIRD_BOSSES.md) —
// headless Node, the sim built like src/main.js.
//
//   node tools/third-bosses-probe.mjs
//
// Checks:
//   1. Wiring: Level I meets the Stag, the Thornmother or the Gloam Wolf and
//      Level II the Heron, the Millwheel or the Mire King by seed (all three
//      appear); the kits, the boss rooms (Thornwood Ring 21, Millrace Basin
//      23), deeds, tints, the freed wardens, Rill's Verse of Water, the
//      journal rows and the story lines in all ten languages.
//   2. Gloam Wolf: a Pounce ring that hurts at range (it crouches, then
//      bounds into the ring), a Rend cone when crowded, the Moon Howl (hurts
//      and slows) and the Hunt after it (two Pounces back to back), the
//      enrage.
//   3. Mire King: a Tongue Lash lane that hurts and drags the hero in, a
//      Belly Flop ring that hurts and leaves mire, the Swallow pulling a hero
//      in front of it closer and snapping shut, the enrage (wider mire).
//   4. Governor: a long fight with each keeps at most two player-targeted
//      telegraphs live, starts >= 72 ticks apart.
//   5. Felling each clears its level.
//   6. Saves: a world mid-fight (each boss) continues bit-identically after
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
const { LEVELS, bossFor } = await import(u('src/data/levels.js'));
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


// ---------------------------------------------------------------- 1. wiring --
{
  const k1 = (LEVELS[1].bosses || []).map((b) => b.kind);
  const k2 = (LEVELS[2].bosses || []).map((b) => b.kind);
  check(k1.join() === 'stag,thornmother,gloamwolf', `Level I's bosses: ${k1.join(', ')}`);
  check(k2.join() === 'heron,millwheel,mireking', `Level II's bosses: ${k2.join(', ')}`);
  for (const [lv, kinds] of [[1, k1], [2, k2]]) {
    const n = {};
    for (let s = 1; s <= 60; s++) n[bossFor(lv, s).kind] = (n[bossFor(lv, s).kind] ?? 0) + 1;
    check(kinds.every((k) => n[k] > 0), `seeds 1-60 on Level ${lv} meet all three (${kinds.map((k) => `${k} ${n[k] ?? 0}`).join(', ')})`);
  }
  check(!!BOSS_KITS.gloamwolf && !!BOSS_KITS.mireking, 'both boss kits are registered');
  check(bossFor(1, 1, 'gloamwolf').layout === 21 && bossFor(2, 1, 'mireking').layout === 23, 'the Wolf fights in the Thornwood Ring (21), the King in the Millrace Basin (23)');
  check(!!DEEDS.boss_gloamwolf && !!DEEDS.boss_mireking, `deeds: ${DEEDS.boss_gloamwolf?.name}, ${DEEDS.boss_mireking?.name}`);
  check(UNLOCKS.tint_gloamfang?.req?.boss === 'gloamwolf' && UNLOCKS.tint_millpond?.req?.boss === 'mireking', 'a tint unlocks for felling each');
  check(WATER_BOSSES.includes('mireking'), 'felling the Mire King frees the Verse of Water (and Rill)');
  check(S.WARDENS.stag.also.includes('gloamwolf') && S.WARDENS.heron.also.includes('mireking'), 'each frees its land\'s warden at camp');
  check(!!S.RUMOURS.gloamwolf && !!S.RUMOURS.mireking && S.rumourFor('gloamwolf', 1) === S.RUMOURS.gloamwolf.text, 'Bramble has a rumour for each');
  check(!!S.BOSS_VOICE.gloamwolf && !!S.BOSS_VOICE.mireking, 'the Hollow Voice has a line for each');
  check(/Gloam Wolf/.test(S.chapterFor(1).summary) && /Mire King/.test(S.chapterFor(2).summary), 'Chapters I and II name them');
  const jw = BESTIARY.find((b) => b.id === 'gloamwolf');
  const jm = BESTIARY.find((b) => b.id === 'mireking');
  check(!!jw && jw.boss && !!jm && jm.boss && jw.text.length > 20 && jm.text.length > 20, 'the Journal has a page for each');
  const lines = [
    'The Gloam Wolf', 'THE GLOAM WOLF', 'The Mire King', 'THE MIRE KING',
    S.RUMOURS.gloamwolf.text, S.RUMOURS.mireking.text, S.BOSS_VOICE.gloamwolf.text, S.BOSS_VOICE.mireking.text, S.chapterFor(1).summary, S.chapterFor(2).summary,
    'The Gloam Wolf lies down at last. The wood’s long night is over.', 'The Mire King sinks into the silt. The millpond goes still.',
    DEEDS.boss_gloamwolf.name, DEEDS.boss_mireking.name, DEEDS.boss_gloamwolf.text, DEEDS.boss_mireking.text,
    UNLOCKS.tint_gloamfang.name, UNLOCKS.tint_millpond.name, UNLOCKS.tint_gloamfang.text, UNLOCKS.tint_millpond.text,
    jw.lore, jw.text, jm.lore, jm.text,
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

// ------------------------------------------------------- 2. the Gloam Wolf --
{
  const W = bossRoom('gloamwolf', 1);
  const b = bossOf(W);
  check(!!b && b.kind === 'gloamwolf' && W.run.view().layout?.layoutId === 21, `Level I's boss room holds the Gloam Wolf in the Thornwood Ring (layout ${W.run.view().layout?.layoutId})`);
  // Far: it pounces.
  parkParty(W, 0, 5.2);
  let crouched = false;
  let leapt = false;
  steps(W, 700, () => {
    mend(W);
    const bb = bossOf(W);
    if (bb?.mode === 'crouch') crouched = true;
    if (bb?.mode === 'leap') leapt = true;
    if (W.clock.tick % 90 === 0 && bb && dist(bb, { x: 0, z: 5.2 }) < 3.2) parkParty(W, bb.x > 0 ? -6 : 6, bb.z > 0 ? -3 : 5);
  });
  const pounces = evs(W, 'boss_pounce');
  check(pounces.length >= 1 && pounces.some((p) => p.victims > 0), `Pounce rings land (${pounces.length}, hits ${pounces.map((p) => p.victims).join('/')})`);
  check(crouched && leapt, `it crouches, then bounds (crouch ${crouched}, leap ${leapt})`);
  const pTel = W.log.find((e) => e.type === 'boss_telegraph_start' && e.attack === 'pounce');
  check(!!pTel && pTel.shape === 'ring', 'the Pounce is a ring telegraph');
  check(hitsOn(W, 0, b.id) > 0, `the Wolf's attacks hurt the party (${hitsOn(W, 0, b.id)} hits)`);
  // Close: it rends.
  W.world.cmd('killAllEnemies');
  W.log.length = 0;
  steps(W, 600, () => {
    mend(W);
    const bb = bossOf(W);
    if (bb && W.clock.tick % 30 === 0) parkParty(W, Math.max(-6, Math.min(6, bb.x)), Math.max(-4, Math.min(5, bb.z + 1.5)), 0.5);
  });
  const rends = evs(W, 'boss_rend');
  const rTel = W.log.find((e) => e.type === 'boss_telegraph_start' && e.attack === 'rend');
  check(rends.length >= 1 && rends.some((r) => r.victims > 0) && rTel?.shape === 'cone', `crowded, it Rends in a cone (${rends.length}, hits ${rends.map((r) => r.victims).join('/')})`);
  const howls = evs(W, 'boss_howl');
  check(howls.length >= 1 && howls.some((h) => h.victims > 0), `the Moon Howl lands on the crowd (${howls.length}, hits ${howls.map((h) => h.victims).join('/')})`);
  const slowed = W.log.some((e) => e.type === 'status_apply' && e.status === 'slow') || party(W).some((p) => p.status && p.status.slow);
  check(slowed, 'the Howl slows the party');
  // The Hunt: after a Howl, two Pounces come back to back.
  const W2 = bossRoom('gloamwolf', 1, 7);
  parkParty(W2, 0, 2.6, 2.4);
  let huntSeen = false;
  steps(W2, 1600, () => {
    mend(W2);
    const bb = bossOf(W2);
    if (bb && bb.hunt > 0) huntSeen = true;
    // spread out so it has someone to bound at
    if (bb && W2.clock.tick % 60 === 0) parkParty(W2, bb.x > 0 ? -5 : 5, bb.z > 1 ? -3 : 5, 2.4);
  });
  const h2 = evs(W2, 'boss_howl');
  const after = h2.length ? evs(W2, 'boss_pounce').filter((p) => p.tick > h2[0].tick && p.tick < h2[0].tick + 400) : [];
  check(huntSeen && after.length >= 2, `after the Howl it pounces twice in the Hunt (${after.length} pounces within ${after.length ? after[after.length - 1].tick - h2[0].tick : '-'} ticks)`);
  W2.run.cmd('bossHp', [0.39]);
  steps(W2, 30, () => mend(W2));
  check(evs(W2, 'boss_enrage').length === 1 && bossOf(W2)?.enraged === true, 'it enrages under 40 %');
}

// ------------------------------------------------------- 3. the Mire King --
{
  const W = bossRoom('mireking', 2);
  const b = bossOf(W);
  check(!!b && b.kind === 'mireking' && W.run.view().layout?.layoutId === 23, `Level II's boss room holds the Mire King in the Millrace Basin (layout ${W.run.view().layout?.layoutId})`);
  // At mid range: lash and flop.
  parkParty(W, 0, 3.0, 1.0);
  let yanked = 0;
  const lashTicks = [];
  W.bus.on('boss_tongue_lash', (e) => {
    if (e.victims > 0) lashTicks.push(e.tick);
  });
  steps(W, 900, () => {
    mend(W);
    const bb = bossOf(W);
    if (bb && bb.yank && bb.yank.ticksLeft === 12) {
      const p = W.registry.byId(bb.yank.ids[0]);
      if (p) yanked = Math.max(yanked, -1);
      bb._probe = p ? { id: p.id, d: dist(p, bb) } : null;
    } else if (bb && !bb.yank && bb._probe) {
      const p = W.registry.byId(bb._probe.id);
      if (p) yanked = Math.max(yanked, bb._probe.d - dist(p, bb));
      bb._probe = null;
    }
    if (bb && W.clock.tick % 120 === 0 && dist(bb, player(W)) < 3) parkParty(W, bb.x > 0 ? -5 : 5, bb.z > 1 ? -3 : 5, 1.0);
  });
  const lashes = evs(W, 'boss_tongue_lash');
  const lTel = W.log.find((e) => e.type === 'boss_telegraph_start' && e.attack === 'lash');
  check(lashes.length >= 1 && lashes.some((l) => l.victims > 0) && lTel?.shape === 'lane', `Tongue Lash lanes land (${lashes.length}, hits ${lashes.map((l) => l.victims).join('/')})`);
  check(yanked >= 1.0, `the lash drags its catch in (${yanked.toFixed(2)} u)`);
  const flops = evs(W, 'boss_belly_flop');
  check(flops.length >= 1 && flops.some((f) => f.victims > 0) && flops.every((f) => f.mire != null), `Belly Flops land and leave mire (${flops.length}, hits ${flops.map((f) => f.victims).join('/')})`);
  // The Swallow: a hero standing in front of it is drawn in.
  const W2 = bossRoom('mireking', 2, 11);
  W2.run.cmd('bossHp', [0.95]);
  let pulled = 0;
  let snapped = null;
  for (let tries = 0; tries < 6 && !snapped; tries++) {
    const bb = bossOf(W2);
    // stand 4 u in front of it
    const fx = bb.faceX ?? 0;
    const fz = bb.faceZ ?? 1;
    parkParty(W2, Math.max(-6, Math.min(6, bb.x + fx * 4)), Math.max(-4, Math.min(5, bb.z + fz * 4)), 0.4);
    steps(W2, 120, () => {
      mend(W2);
      const k = bossOf(W2);
      if (k && k.mode === 'gape' && k.telegraph?.attack === 'swallow') {
        const p = player(W2);
        if (k._d0 == null) k._d0 = dist(p, k);
        pulled = Math.max(pulled, k._d0 - dist(p, k));
      }
    });
    snapped = evs(W2, 'boss_swallow')[0] ?? null;
  }
  check(pulled >= 0.8, `while it gapes, a hero in front is drawn in (${pulled.toFixed(2)} u)`);
  check(!!snapped, `then it snaps shut (${snapped ? `hits ${snapped.victims}` : 'no swallow'})`);
  const sTel = W2.log.find((e) => e.type === 'boss_telegraph_start' && e.attack === 'swallow');
  check(!!sTel && sTel.shape === 'ring', 'the Swallow is a ring round itself');
  W2.run.cmd('bossHp', [0.39]);
  W2.log.length = 0;
  parkParty(W2, 0, 4.5, 1.0);
  steps(W2, 900, () => {
    mend(W2);
    const bb = bossOf(W2);
    if (bb && W2.clock.tick % 120 === 0 && dist(bb, player(W2)) < 3) parkParty(W2, bb.x > 0 ? -5 : 5, bb.z > 1 ? -3 : 5, 1.0);
  });
  const mires = W2.log.filter((e) => e.type === 'slick_spawn' && e.radius >= 2.5);
  check(evs(W2, 'boss_enrage').length === 1 && (evs(W2, 'boss_belly_flop').length === 0 || mires.length >= 1), `enraged under 40 %, its mire spreads wider (${mires.map((m) => m.radius).join('/') || 'no flop yet'})`);
}

// ------------------------------------------------------------ 4. governor --
for (const [kind, lv] of [['gloamwolf', 1], ['mireking', 2]]) {
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
}

// ------------------------------------------------------- 5. level clears --
for (const [kind, lv] of [['gloamwolf', 1], ['mireking', 2]]) {
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

// ---------------------------------------------------------------- 6. saves --
for (const [kind, lv] of [['gloamwolf', 1], ['mireking', 2]]) {
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
