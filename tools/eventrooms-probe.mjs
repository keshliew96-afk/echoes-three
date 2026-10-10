#!/usr/bin/env node
// EVENT ROOMS probe (docs/EVENT_ROOMS.md), headless:
//
//   node tools/eventrooms-probe.mjs
//
//   1. Doors: over seeds 1-40 a campaign's "?" doors lead only to rooms 2-5,
//      at most two a level, never both doors and never the cursed one; the
//      legacy single-level run never offers one.
//   2. Each of the eight encounters, forced: the "?" room has no enemies and
//      an encounter body; E (a real interact press) opens its card; Take pays
//      the cost and the reward (relic page, Skill draft, Glint, heal, the
//      chest's fight then its pick); Leave pays nothing; the doors follow.
//   3. Refusals: the well with too little Glint is refused and Leave still
//      walks on.
//   4. Save and load in the middle of a card restores it; the same seed rolls
//      the same doors.
//   5. More event rooms (slice 6): the land-bound four appear only on their
//      own land's levels (each seen there over seeds 1-40), the travellers
//      anywhere; the crystal and the smith refuse without what they need;
//      the dice pay by the rule over several seeds.
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
const { ENCOUNTER_IDS, ENCOUNTERS, EVENT_RULES } = await import(u('src/sim/encounters.js'));
const { RELICS } = await import(u('src/sim/relics.js'));

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
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const log = [];
  for (const t of ['path_offer', 'room_enter', 'event_enter', 'event_open', 'event_take', 'event_leave', 'event_denied', 'event_ambush', 'event_chest', 'relic_offer', 'relic_gain', 'relic_lose', 'curse_taken', 'reward_offer', 'glint_spend', 'glint_gain', 'purse_gain', 'spawn', 'room_cleared'])
    bus.on(t, (e) => log.push({ ...e, type: t }));
  const run = world.runSystem();
  const step = (snap = null) => clock.stepOnce((t) => world.step(t, snap ?? emptySnapshot()));
  return { world, registry, bus, clock, run, log, step };
}

const fails = [];
const passes = [];
const check = (ok, what) => {
  (ok ? passes : fails).push(what);
  if (!ok) console.log('FAIL', what);
  return ok;
};

// Clear the live combat room and walk the pages up to the doors.
function clearToPath(W) {
  W.world.cmd('killAllEnemies');
  for (let i = 0; i < 3000 && W.run.view().phase !== 'path'; i++) {
    const v = W.run.view();
    if (v.phase === 'combat') W.world.cmd('killAllEnemies');
    else if (v.phase === 'reward') W.run.declineReward();
    else if (v.phase === 'relic') W.run.chooseRelic(0);
    W.step();
  }
  return W.run.view().phase === 'path';
}
function startCampaign(seed, level = 1) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level, harness: true });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  for (let i = 0; i < 30; i++) W.step();
  return W;
}
const stepUntil = (W, pred, max = 600) => {
  for (let i = 0; i < max && !pred(W.run.view()); i++) W.step();
  return pred(W.run.view());
};

// ------------------------------------------------------------- 1. doors --
{
  let doors = 0;
  let bad = 0;
  let levelsChecked = 0;
  const kinds = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const W = startCampaign(seed);
    let perLevel = 0;
    for (let room = 1; room <= 5; room++) {
      if (!clearToPath(W)) break;
      const p = W.run.view().path;
      const ev = p.options.filter((o) => o.event);
      if (ev.length) {
        doors += 1;
        perLevel += 1;
        kinds.add(ev[0].encounter);
        if (ev.length > 1 || ev[0].curse || p.nextRoom < 2 || p.nextRoom > 5) bad += 1;
      }
      // Walk the plain door so the run keeps its combat rooms.
      const side = p.options[0].event ? 1 : 0;
      W.run.choosePath(side);
      stepUntil(W, (v) => v.phase === 'combat');
    }
    if (perLevel > EVENT_RULES.maxPerLevel) bad += 1;
    levelsChecked += 1;
  }
  check(doors > 10 && bad === 0, `doors: ${doors} "?" doors over ${levelsChecked} level 1s, ${bad} broke a rule, ${kinds.size} kinds`);
  // The legacy single-level run: relics and "?" doors off.
  const L = makeWorld(3);
  L.run.startRun({ act: 1 });
  let legacyEv = 0;
  for (let room = 1; room <= 5; room++) {
    for (let i = 0; i < 40; i++) L.step();
    if (!clearToPath(L)) break;
    if (L.run.view().path.options.some((o) => o.event)) legacyEv += 1;
    L.run.choosePath(0);
    stepUntil(L, (v) => v.phase === 'combat');
  }
  check(legacyEv === 0, `legacy single-level run offers no "?" door (${legacyEv})`);
}

// ------------------------------------------------- 2. eight encounters --
// A campaign at the doors after room 1 (one relic already picked), with the
// next path screen's "?" door forced to `id` on side 0.
function atEventRoom(seed, id, wallet = 60, majors = []) {
  const W = startCampaign(seed);
  for (const m of majors) W.run.cmd('eventMajor', [m]);
  W.run.cmd('eventDoor', [id, 0]);
  if (!clearToPath(W)) return null;
  W.run.cmd('wallet', [wallet]);
  const p = W.run.view().path;
  const side = p.options.findIndex((o) => o.event);
  W.run.choosePath(side);
  if (!stepUntil(W, (v) => v.phase === 'event')) return null;
  return W;
}
// Walk the Healer to the encounter and press E (the real interact path).
function inspect(W) {
  const body = W.registry.all().find((e) => e.itype === 'encounter');
  if (!body) return false;
  W.world.cmd('teleport', body.x, body.z + 1.0);
  for (let i = 0; i < 3; i++) W.step();
  W.step({ ...emptySnapshot(), presses: [{ kind: 'interact' }] });
  W.step();
  return W.run.view().phase === 'encounter';
}
const partyHp = (W) => W.registry.all().filter((e) => e.partyIndex !== undefined).map((e) => ({ hp: e.hp, max: e.maxHp }));

for (const [i, id] of ENCOUNTER_IDS.entries()) {
  const W = atEventRoom(10 + i, id, 60, id === 'heart_crystal' ? ['hunted', 'withering'] : []);
  if (!check(!!W, `${id}: reached its "?" room`)) continue;
  const v0 = W.run.view();
  const hostiles = W.registry.all().filter((e) => e.faction === 'hostile').length;
  check(v0.mode === 'event' && v0.encounter && v0.encounter.id === id && v0.encounter.state === 'idle' && hostiles === 0, `${id}: an event room, no enemies, the encounter idle`);
  check(inspect(W), `${id}: E next to it opens the card`);
  const before = { wallet: W.run.view().wallet, relics: W.run.view().relics.owned.map((r) => r.id), hp: partyHp(W) };
  // Make the spring and the shrine visible: everyone at 60%.
  if (id === 'healing_spring') for (const e of W.registry.all()) if (e.partyIndex !== undefined) e.hp = e.maxHp * 0.6;
  W.log.length = 0;
  const r = W.run.chooseEncounter('take');
  const v1 = W.run.view();
  if (id === 'blood_shrine') {
    const after = partyHp(W);
    const ok = after.every((a, k) => a.hp >= 1 && a.hp <= before.hp[k].hp - Math.min(before.hp[k].hp - 1, before.hp[k].max * 0.25) + 0.02);
    check(ok && v1.phase === 'relic', `${id}: every hero paid a quarter of max HP, then a relic page (${v1.phase})`);
  } else if (id === 'wishing_well') {
    const spent = W.log.some((e) => e.type === 'glint_spend' && e.amount === 15);
    const paid = r && (r.relic || r.glint === EVENT_RULES.wellGlint);
    check(spent && paid && v1.phase === 'path', `${id}: 15 Glint in, ${r && r.relic ? 'a relic' : `${r && r.glint} Glint`} out, then the doors`);
  } else if (id === 'trapped_chest') {
    const amb = r && r.ambush && v1.phase === 'combat';
    stepUntil(W, (v) => W.registry.all().some((e) => e.faction === 'hostile'), 900);
    const n = W.registry.all().filter((e) => e.faction === 'hostile').length;
    check(amb && n > 0, `${id}: Take springs an ambush (${n} hostiles)`);
    let rounds = 0;
    for (; rounds < 3000 && W.run.view().phase === 'combat'; rounds++) {
      W.world.cmd('killAllEnemies');
      W.step();
    }
    const chest = W.log.find((e) => e.type === 'event_chest');
    check(!!chest && W.run.view().phase === 'relic', `${id}: the won fight pays ${chest ? chest.glint : 0} Glint and a relic page`);
  } else if (id === 'lost_pilgrim') {
    const off = W.log.find((e) => e.type === 'reward_offer');
    check(v1.phase === 'reward' && off && off.promised === 'skill' && W.log.some((e) => e.type === 'glint_spend' && e.amount === 20), `${id}: 20 Glint, then a Skill draft (${off ? off.reward : 'none'})`);
  } else if (id === 'corrupted_altar') {
    const c = W.log.find((e) => e.type === 'curse_taken' && e.major);
    const legend = v1.relics && v1.relics.offer && v1.relics.offer.choices.every((x) => x.rarity === 'legendary');
    check(!!c && v1.phase === 'relic' && legend && v1.relics.majors.length === 1, `${id}: a major curse (${c ? c.curse : '-'}), then a legendary pick`);
  } else if (id === 'wandering_spirit') {
    const lost = W.log.find((e) => e.type === 'relic_lose');
    const greater = v1.relics && v1.relics.offer && v1.relics.offer.choices.every((x) => x.rarity !== 'common' && x.id !== (lost && lost.relic));
    check(!!lost && before.relics.includes(lost.relic) && v1.phase === 'relic' && greater, `${id}: gave up ${lost ? lost.relic : '-'}, then a rare or legendary pick`);
  } else if (id === 'forgotten_cache') {
    const g = W.log.find((e) => e.type === 'glint_gain' && e.reason === 'event_cache');
    const purses = W.log.filter((e) => e.type === 'purse_gain' && e.reason === 'event_cache').length;
    check(!!g && g.amount === 30 && purses === 3 && v1.phase === 'path', `${id}: 30 Glint and 15 to ${purses} ally purses, then the doors`);
  } else if (id === 'healing_spring') {
    const full = partyHp(W).every((a) => a.hp >= a.max - 1e-6);
    check(full && v1.phase === 'path', `${id}: the party is at full HP, then the doors`);
  } else if (id === 'fey_ring') {
    const sp = W.log.find((e) => e.type === 'glint_spend' && e.reason === 'event_fey');
    check(!!sp && sp.amount === before.wallet && v1.wallet === 0 && v1.phase === 'relic' && v1.relics.offer.choices.length === 3, `${id}: all ${sp ? sp.amount : 0} Glint taken, then a choice of three relics`);
  } else if (id === 'sluice_gate') {
    const after = partyHp(W);
    const flooded = after.every((a, k) => a.hp >= 1 && a.hp <= before.hp[k].hp - Math.min(before.hp[k].hp - 1, before.hp[k].max / 3) + 0.02);
    const won = r && r.relic && r.glint === EVENT_RULES.sluiceGlint && v1.relics.owned.length === before.relics.length + 1;
    check(r && (r.flood ? flooded : won) && v1.phase === 'path', `${id}: ${r && r.flood ? 'the flood hit every hero for a third' : 'a relic and 30 Glint'}, then the doors`);
  } else if (id === 'barrow_ossuary') {
    const after = partyHp(W);
    const ok = after.every((a, k) => a.hp >= 1 && a.hp <= before.hp[k].hp - Math.min(before.hp[k].hp - 1, before.hp[k].max * 0.2) + 0.02);
    const off = W.log.find((e) => e.type === 'reward_offer');
    check(ok && v1.phase === 'reward' && off && off.promised === 'node', `${id}: a fifth of max HP each, then a Node draft (${off ? off.reward : 'none'})`);
  } else if (id === 'heart_crystal') {
    const grown = W.log.filter((e) => e.type === 'relic_gain' && e.source === 'crystal').length;
    check(grown === 2 && v1.relics.majors.length === 2 && v1.phase === 'path', `${id}: two major curses grow two relics (${grown}), the curses stay`);
  } else if (id === 'traveling_smith') {
    const lost = W.log.find((e) => e.type === 'relic_lose' && e.source === 'smith');
    const got = W.log.find((e) => e.type === 'relic_gain' && e.source === 'smith');
    const rank = { common: 0, rare: 1, legendary: 2 };
    const up = lost && got && (rank[got.rarity] > rank[lost.rarity] || (lost.rarity === 'legendary' && got.rarity === 'legendary')) && got.relic !== lost.relic;
    const paid = W.log.some((e) => e.type === 'glint_spend' && e.amount === 25);
    check(!!up && paid && v1.phase === 'path', `${id}: 25 Glint, ${lost ? lost.relic : '-'} (${lost ? lost.rarity : '-'}) reforged into ${got ? got.relic : '-'} (${got ? got.rarity : '-'})`);
  } else if (id === 'gamblers_dice') {
    const d = r && r.dice;
    const paid = W.log.some((e) => e.type === 'glint_spend' && e.amount === 20);
    const rule = d && (d[0] === d[1] ? !!r.relic : d[0] + d[1] >= 8 ? r.glint === 50 : !r.relic && !r.glint);
    check(paid && rule && v1.phase === 'path', `${id}: 20 Glint staked, rolled ${d ? d.join('+') : '-'}, paid by the rule`);
  }
  // Every page behind it ends at the doors (room n + 1 still to come).
  for (let k = 0; k < 200 && W.run.view().phase !== 'path'; k++) {
    const v = W.run.view();
    if (v.phase === 'reward') W.run.declineReward();
    else if (v.phase === 'relic') W.run.chooseRelic(0);
    W.step();
  }
  check(W.run.view().phase === 'path' && W.run.view().roomsDone >= W.run.view().room, `${id}: the doors follow (room ${W.run.view().room} done)`);
}

// Leave pays nothing.
{
  const W = atEventRoom(31, 'blood_shrine');
  inspect(W);
  const hp = partyHp(W).map((a) => a.hp).join();
  const n = W.run.view().relics.owned.length;
  W.run.chooseEncounter('leave');
  check(W.run.view().phase === 'path' && partyHp(W).map((a) => a.hp).join() === hp && W.run.view().relics.owned.length === n, 'leave: nothing paid, nothing given, straight to the doors');
}

// ---------------------------------------------------------- 3. refusal --
{
  const W = atEventRoom(32, 'wishing_well', 5);
  inspect(W);
  const v = W.run.view();
  const r = W.run.chooseEncounter('take');
  check(v.encounter.refused === 'glint' && r && r.denied === 'glint' && W.run.view().phase === 'encounter', 'well with 5 Glint: Take refused, the card stays');
  W.run.chooseEncounter('leave');
  check(W.run.view().phase === 'path', 'well: Leave still walks on');
}

// ------------------------------------------------------ 4. save / load --
{
  const W = atEventRoom(33, 'corrupted_altar');
  inspect(W);
  W.run.focusEncounter(1);
  const saved = structuredClone(W.run.saveState());
  W.run.chooseEncounter('take');
  W.run.loadState(saved);
  const v = W.run.view();
  check(v.phase === 'encounter' && v.encounter && v.encounter.id === 'corrupted_altar' && v.encounter.focus === 1 && v.relics.majors.length === 0, 'save mid-card: the card, its focus and no curse come back');
  const a = startCampaign(7);
  const b = startCampaign(7);
  const doorsOf = (W) => {
    const out = [];
    for (let room = 1; room <= 5; room++) {
      if (!clearToPath(W)) break;
      out.push(JSON.stringify(W.run.view().path.options));
      W.run.choosePath(W.run.view().path.options[0].event ? 1 : 0);
      stepUntil(W, (v) => v.phase === 'combat');
    }
    return out.join('|');
  };
  check(doorsOf(a) === doorsOf(b), 'same seed, same doors');
}

// ------------------------------------------------ 5. more event rooms --
{
  const LAND = { 1: 'wood', 2: 'mill', 3: 'barrow', 4: 'heart' };
  let wrong = 0;
  const seenOn = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };
  let landOk = true;
  for (const level of [1, 2, 3, 4]) {
    for (let seed = 1; seed <= 40; seed++) {
      const W = startCampaign(seed, level);
      if (W.run.cmd('eventLand') !== LAND[level]) landOk = false;
      // Majors on the Heart so its crystal can be rolled; Glint for the rest.
      if (level === 4) W.run.cmd('eventMajor', ['hunted']);
      for (let room = 1; room <= 5; room++) {
        if (!clearToPath(W)) break;
        W.run.cmd('wallet', [80]);
        const p = W.run.view().path;
        for (const o of p.options.filter((x) => x.event)) {
          seenOn[level].add(o.encounter);
          const land = ENCOUNTERS[o.encounter].land;
          if (land && land !== LAND[level]) wrong += 1;
        }
        W.run.choosePath(p.options[0].event ? 1 : 0);
        stepUntil(W, (v) => v.phase === 'combat');
      }
    }
  }
  check(landOk, 'the door roll reads each level\'s land (wood, mill, barrow, heart)');
  check(wrong === 0, `land-bound encounters only on their own land (${wrong} elsewhere)`);
  const own = { 1: 'fey_ring', 2: 'sluice_gate', 3: 'barrow_ossuary', 4: 'heart_crystal' };
  for (const level of [1, 2, 3, 4]) check(seenOn[level].has(own[level]), `level ${level}: its own ${own[level]} rolled (${seenOn[level].size} kinds seen)`);
  const travellers = ['traveling_smith', 'gamblers_dice'].filter((id) => [1, 2, 3, 4].filter((l) => seenOn[l].has(id)).length >= 3);
  check(travellers.length === 2, `the smith and the dice travel (seen on 3+ lands: ${travellers.join(', ')})`);
  // Refusals: the crystal with no major curse, the smith with no relic.
  {
    const W = atEventRoom(41, 'heart_crystal');
    inspect(W);
    const r = W.run.chooseEncounter('take');
    check(W.run.view().encounter.refused === 'curses' && r && r.denied === 'curses', 'crystal with no major curse: Take refused');
    W.run.chooseEncounter('leave');
  }
  {
    const W = atEventRoom(42, 'traveling_smith', 10);
    inspect(W);
    const why = W.run.view().encounter.refused;
    check(why === 'glint', `smith with 10 Glint: Take refused (${why})`);
  }
  // The dice over many seeds: every outcome by the rule, all three seen.
  const outcomes = new Set();
  let broke = 0;
  for (let seed = 50; seed < 80; seed++) {
    const W = atEventRoom(seed, 'gamblers_dice');
    if (!W || !inspect(W)) {
      broke += 1;
      continue;
    }
    const r = W.run.chooseEncounter('take');
    const d = r.dice;
    const kind = d[0] === d[1] ? 'doubles' : d[0] + d[1] >= 8 ? 'high' : 'low';
    outcomes.add(kind);
    if (kind === 'doubles' && !(r.relic && RELICS[r.relic].rarity !== 'common')) broke += 1;
    if (kind === 'high' && r.glint !== 50) broke += 1;
    if (kind === 'low' && (r.relic || r.glint)) broke += 1;
  }
  check(broke === 0 && outcomes.size === 3, `dice over 30 seeds: ${[...outcomes].join(', ')}, ${broke} broke the rule`);
}

console.log(JSON.stringify({ probe: 'event-rooms', ok: fails.length === 0, passed: passes.length, failed: fails.length, passes, fails }, null, 1));
process.exit(fails.length ? 1 : 0);
