#!/usr/bin/env node
// MORE CLASS SKILLS probe (docs/CLASS_SKILLS.md) — headless Node, the sim
// built like src/main.js.
//
//   node tools/class-skills-probe.mjs
//
// Checks:
//   1. Data: 11 skills per ally class, 19 Healer skills, 8 nodes per class,
//      every new row well formed, every new node has a verdict on every
//      class skill, card text and the names in all ten languages.
//   2. The gate: the legacy single-level run (the goldens) draws from the old
//      pools; a campaign run draws from the grown ones (skills and nodes).
//   3. Each new skill does what its card says, cast in a live campaign room.
//   4. Each new node does what its card says.
//   5. Saves: a world mid-fight with the new kit continues bit-identically
//      after a capture round trip.
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
const { SKILLS, HEALER_SKILL_IDS } = await import(u('src/sim/skills.js'));
const { NODES, classVerdict } = await import(u('src/sim/nodes.js'));
const C = await import(u('src/data/classes.js'));
const CARDS = await import(u('src/ui/run/cards.js')).catch(() => null);

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
  const step = (snap = emptySnapshot()) => clock.stepOnce((t) => world.step(t, snap));
  return { world, registry, bus, clock, run, log, step, io };
}

const fails = [];
const passes = [];
const check = (ok, what) => {
  (ok ? passes : fails).push(what);
  console.log(ok ? 'ok  ' : 'FAIL', what);
  return ok;
};
// Pinned enemies (W.pins) are put back on their spot after every tick, so a
// target stands where the test placed it.
const steps = (W, n, each = null) => {
  const until = W.clock.tick + n;
  for (let i = 0; i < n * 4 && W.clock.tick < until; i++) {
    W.step();
    for (const [e, x, z] of W.pins || []) {
      e.x = e.px = x;
      e.z = e.pz = z;
    }
    if (each) each();
  }
};
const cmd = (W, ...a) => W.world.cmd(...a);
const ally = (W, seat) => W.registry.all().find((e) => e.kind === 'ally' && e.partyIndex === seat);
const player = (W) => W.registry.all().find((e) => e.kind === 'player');
const hostilesOf = (W) => W.registry.all().filter((e) => e.faction === 'hostile' && e.hittable && e.hp > 0);
const party = (W) => W.registry.all().filter((e) => e.partyIndex !== undefined);
const mend = (W) => party(W).forEach((p) => (p.hp = p.maxHp));
const evs = (W, type, from = 0) => W.log.slice(from).filter((e) => e.type === type);
const st = (e, kind, W) => (e && e.status && e.status[kind] && e.status[kind].untilTick > W.clock.tick ? e.status[kind] : null);

const NEW_CLASS = { tank: ['earthshatter', 'rallying_cry', 'earthen_grasp'], swordsman: ['moonfang', 'blade_dance', 'crimson_edge'], archer: ['hunters_mark', 'barbed_trap', 'feather_fan'] };
const NEW_HEALER = ['lantern_ward', 'dawn_brand'];
const NEW_NODES = { tank: ['rampart', 'crush'], swordsman: ['gale_step', 'duel'], archer: ['longshot', 'prey'] };
const SEAT = { tank: 1, swordsman: 2, archer: 3 };

// A live campaign room on Level 1 room 2 (no objective). `setup(W)` runs between rooms 1
// and 2 (loadouts and sockets are refused in combat).
function campaignRoom(seed = 3, setup = null) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 1, harness: true });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  cmd(W, 'partyMode', 'manual');
  for (let i = 0; i < 3000 && W.run.view().phase === 'combat'; i++) {
    cmd(W, 'killAllEnemies');
    W.step();
  }
  if (setup) setup(W);
  cmd(W, 'skipToRoom', 2);
  for (let i = 0; i < 600 && !(W.run.view().phase === 'combat' && W.run.view().room === 2); i++) W.step();
  steps(W, 5);
  W.log.length = 0;
  return W;
}
// Park the party, the seat under test at (x, z).
function park(W, seat, x = 0, z = 0) {
  cmd(W, 'teleport', -5, -3.5);
  for (const a of W.registry.all().filter((e) => e.kind === 'ally')) {
    a.x = a.px = a.partyIndex === seat ? x : -5 + a.partyIndex * 0.7;
    a.z = a.pz = a.partyIndex === seat ? z : -3.5;
  }
}
// The first spawn of a test clears the room's own enemies in the same tick
// (an empty room would clear and refuse spawns).
function spawnAt(W, etype, x, z, hp = 400) {
  if (!W.cleared) {
    cmd(W, 'killAllEnemies');
    // Globs, patches and the layout's barricades go too: nothing in the way.
    W.registry.all().filter((e) => e.kind === 'eglob' || e.kind === 'slick' || e.blocksProjectiles || e.kind === 'barricade').forEach((e) => W.registry.despawn(e.id));
    // The seats' own AI keeps off the slot under test (the probe casts it).
    for (const a of W.registry.all().filter((q) => q.kind === 'ally')) if (Array.isArray(a.cds)) a.cds[0] = 1e9;
    W.cleared = true;
  }
  const e = W.registry.byId(cmd(W, 'spawn', etype, x, z));
  if (e) {
    e.maxHp = hp;
    e.hp = hp;
  }
  return e;
}
const pin = (W, e) => {
  W.pins = W.pins || [];
  W.pins.push([e, e.x, e.z]);
  return e;
}
// Give `seat` just `skill` in slot 0 and cast it at (x, z).
function equip(W, seat, skill) {
  const slots = cmd(W, 'partyView', seat)?.slots ?? [];
  for (let k = 0; k < 4; k++) if (slots[k]) cmd(W, 'partySwap', seat, skill, k);
  const r = cmd(W, 'partySwap', seat, skill, 0);
  return r;
}
function castAt(W, seat, x, z) {
  return cmd(W, 'partyCast', seat, 0, { x, z });
}

// ------------------------------------------------------------- 1. data --
{
  for (const cls of ['tank', 'swordsman', 'archer']) {
    const pool = C.CLASS_SKILLS[cls];
    check(pool.length === 11 && new Set(pool).size === 11, `${cls}: 11 class skills (${pool.length})`);
    check(NEW_CLASS[cls].every((id) => SKILLS[id] && SKILLS[id].cls === cls && pool.includes(id)), `${cls}: ${NEW_CLASS[cls].join(', ')} are ${cls} rows in the pool`);
    check(C.CLASS_NODES[cls].length === 8 && NEW_NODES[cls].every((id) => NODES[id] && NODES[id].cls === cls), `${cls}: 8 class nodes, new ${NEW_NODES[cls].join(', ')}`);
    check(C.AI_PRIORITY[cls].length === 11 && pool.every((id) => C.AI_PRIORITY[cls].includes(id)), `${cls}: the AI ranks all 11`);
    const unknown = [];
    for (const sid of pool) for (const nid of C.nodePoolOf(cls)) if (classVerdict(SKILLS[sid], nid).reason === 'unknown_node') unknown.push(`${sid}×${nid}`);
    check(unknown.length === 0, `${cls}: every node has a verdict on every class skill${unknown.length ? ` (${unknown.slice(0, 3).join(', ')})` : ''}`);
  }
  check(HEALER_SKILL_IDS.length === 19 && NEW_HEALER.every((id) => HEALER_SKILL_IDS.includes(id) && !SKILLS[id].cls), `the Healer has 19 skills (${HEALER_SKILL_IDS.length}), Lantern Ward and Dawn Brand among them`);
  check(C.AI_PRIORITY.healer.length === 19, 'the AI ranks all 19 Healer skills');
  const all = [...Object.values(NEW_CLASS).flat(), ...NEW_HEALER];
  check(all.every((id) => C.CAMPAIGN_ONLY_SKILLS.includes(id)) && C.CAMPAIGN_ONLY_SKILLS.length === 11, 'the eleven new skills are campaign-only');
  check(Object.values(NEW_NODES).flat().every((id) => C.CAMPAIGN_ONLY_NODES.includes(id)), 'the six new nodes are campaign-only');
  const abbrevs = new Map();
  for (const id of Object.keys(SKILLS)) {
    const owner = SKILLS[id].cls ?? 'healer';
    const k = `${owner}:${SKILLS[id].abbrev}`;
    abbrevs.set(k, (abbrevs.get(k) ?? 0) + 1);
  }
  check([...abbrevs.values()].every((n) => n === 1), 'no two skills of one class share a medallion');
  if (CARDS) {
    check(all.every((id) => CARDS.SKILL_BODY[id]), 'every new skill has its card text');
    const nn = Object.values(NEW_NODES).flat();
    check(nn.every((id) => CARDS.NODE_EFFECT[id] && CARDS.NODE_EFFECT_SHORT[id] && CARDS.NODE_GLYPH[id]), 'every new node has its card text, short text and glyph');
    const lines = [];
    for (const id of all) lines.push(SKILLS[id].name, SKILLS[id].abbrev, CARDS.SKILL_BODY[id]);
    for (const id of nn) lines.push(NODES[id].name, CARDS.NODE_EFFECT[id], CARDS.NODE_EFFECT_SHORT[id]);
    const miss = [];
    for (const l of ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'pt-BR', 'fr', 'de', 'ru']) {
      const tb = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
      for (const k of lines) if (!tb[k]) miss.push(`${l}: ${k.slice(0, 30)}`);
    }
    check(miss.length === 0, `${lines.length} new lines translated in nine languages${miss.length ? ` (missing ${miss.length}: ${miss.slice(0, 4).join('; ')})` : ''}`);
  }
}

// -------------------------------------------------------------- 2. gate --
{
  const L = makeWorld(2);
  L.run.startRun({ act: 1 });
  steps(L, 30);
  const hp = cmd(L, 'draftPools');
  check(hp && !hp.skill.some((id) => NEW_HEALER.includes(id)) && hp.skill.length === 17, `legacy run: the Healer draws from the old 17 (${hp?.skill?.length})`);
  const W = makeWorld(2);
  W.run.startCampaign({ level: 1, harness: true });
  steps(W, 30);
  const cp = cmd(W, 'draftPools');
  check(cp && NEW_HEALER.every((id) => cp.skill.includes(id)) && cp.skill.length === 19, `campaign: the Healer draws from all 19 (${cp?.skill?.length})`);
}

// The ally draft pools are read through the party system's draft objects.
{
  const pick = (W, seat) => {
    const P = W.world.partySystem?.() ?? null;
    return P ? P.draft(seat) : null;
  };
  // Both runs taken to their first reward page (loadouts change between rooms).
  const toReward = (X) => {
    for (let i = 0; i < 4000 && X.run.view().phase !== 'combat'; i++) X.step();
    for (let i = 0; i < 3000 && X.run.view().phase === 'combat'; i++) {
      cmd(X, 'killAllEnemies');
      X.step();
    }
  };
  const L = makeWorld(4);
  L.run.startRun({ act: 1 });
  toReward(L);
  const W = makeWorld(4);
  W.run.startCampaign({ level: 1, harness: true });
  toReward(W);
  const dl = pick(L, 1);
  const dc = pick(W, 1);
  if (check(!!dl && !!dc, 'the party draft systems are reachable')) {
    for (const cls of ['tank', 'swordsman', 'archer']) {
      const s = SEAT[cls];
      const a = pick(L, s).skillPool();
      const b = pick(W, s).skillPool();
      check(a.length === 8 && !a.some((id) => NEW_CLASS[cls].includes(id)), `legacy run: the ${cls} draws from its old 8 (${a.length})`);
      check(b.length === 11 && NEW_CLASS[cls].every((id) => b.includes(id)), `campaign: the ${cls} draws from all 11 (${b.length})`);
      // Nodes: with one skill owned, the fill pool holds the new nodes only in a campaign.
      const base = C.CLASS_SKILLS[cls][0];
      cmd(L, 'partySwap', s, base, 0);
      cmd(W, 'partySwap', s, base, 0);
      const nl = pick(L, s).nodePool();
      const nc = pick(W, s).nodePool();
      const want = NEW_NODES[cls].filter((n) => classVerdict(SKILLS[base], n).state === 'live');
      check(!nl.some((n) => NEW_NODES[cls].includes(n)) && want.every((n) => nc.includes(n)), `${cls} nodes: legacy none of ${NEW_NODES[cls].join('/')}, campaign ${want.join('/')}`);
    }
  }
}

// ------------------------------------------------------------ 3. skills --
// Tank: Earthshatter (a long narrow fault that stuns).
{
  const W = campaignRoom(3, (X) => equip(X, 1, 'earthshatter'));
  park(W, 1, 0, 0);
  const near = pin(W, spawnAt(W, 'ram', 1.4, 0));
  const side = pin(W, spawnAt(W, 'ram', 0, 1.4));
  steps(W, 1);
  castAt(W, 1, 3, 0);
  steps(W, 2);
  const hits = evs(W, 'hit').filter((e) => e.source === 'earthshatter');
  check(hits.some((h) => h.target === near.id) && !hits.some((h) => h.target === side.id), `Earthshatter hits along its line only (${hits.length} hits)`);
  check(!!st(near, 'stun', W), 'Earthshatter stuns the enemy it hits');
}
// Tank: Rallying Cry (shield + inspired on everyone in reach).
{
  const W = campaignRoom(3, (X) => equip(X, 1, 'rallying_cry'));
  park(W, 1, 0, 0);
  ally(W, 2).x = 1;
  ally(W, 2).z = 0.5;
  ally(W, 3).x = -1;
  ally(W, 3).z = 0.5;
  cmd(W, 'teleport', 0.5, -1);
  steps(W, 1);
  castAt(W, 1, 1, 0);
  steps(W, 1);
  const got = party(W).filter((m) => st(m, 'shield', W) && st(m, 'inspired', W));
  check(got.length === 4, `Rallying Cry shields and inspires the whole party in reach (${got.length}/4)`);
}
// Tank: Earthen Grasp (pulls enemies in, slows them).
{
  const W = campaignRoom(3, (X) => equip(X, 1, 'earthen_grasp'));
  park(W, 1, 0, 0);
  const e = spawnAt(W, 'ram', 2.0, 0);
  steps(W, 1);
  castAt(W, 1, 2, 0);
  steps(W, 1);
  const h = evs(W, 'hit').find((x) => x.source === 'earthen_grasp' && x.target === e.id);
  check(!!h, 'Earthen Grasp hits around the Tank');
  check(!!h && h.kb < 0, `it drags the enemy in (knockback ${h ? h.kb : 'none'} u)`);
  check(!!st(e, 'slow', W), 'and slows it');
}
// Swordsman: Moonfang (a 3.2 u dash, an exposing cut).
{
  const W = campaignRoom(3, (X) => equip(X, 2, 'moonfang'));
  park(W, 2, 0, 0);
  const e = spawnAt(W, 'boar', 3.6, 0);
  pin(W, e);
  steps(W, 1);
  castAt(W, 2, 3.6, 0);
  steps(W, 40);
  const dash = evs(W, 'ally_dash').find((d) => d.skill === 'moonfang');
  check(!!dash && Math.hypot(dash.x1 - dash.x0, dash.z1 - dash.z0) > 2.0, `Moonfang dashes in (${dash ? Math.hypot(dash.x1 - dash.x0, dash.z1 - dash.z0).toFixed(2) : 'none'} u)`);
  check(evs(W, 'hit').some((h) => h.source === 'moonfang'), 'and cuts');
  check(!!st(e, 'exposed', W) || evs(W, 'status_apply').some((s) => s.kind === 'exposed'), 'the cut exposes the enemy');
}
// Swordsman: Blade Dance (a burst, then the fox runs faster).
{
  const W = campaignRoom(3, (X) => equip(X, 2, 'blade_dance'));
  park(W, 2, 0, 0);
  spawnAt(W, 'boar', 0.8, 0);
  spawnAt(W, 'boar', -0.8, 0);
  steps(W, 1);
  castAt(W, 2, 1, 0);
  steps(W, 1);
  check(evs(W, 'hit').filter((h) => h.source === 'blade_dance').length >= 2, 'Blade Dance hits all around the fox');
  check(!!st(ally(W, 2), 'haste', W), 'and hastes the fox');
}
// Swordsman: Crimson Edge (a passive cut on the nearest enemy in 1.5 u).
{
  const W = campaignRoom(3, (X) => equip(X, 2, 'crimson_edge'));
  park(W, 2, 0, 0);
  const e = spawnAt(W, 'ram', 1.2, 0);
  const far = spawnAt(W, 'ram', 0, 3.0);
  pin(W, e);
  pin(W, far);
  steps(W, 140, () => {
    park(W, 2, 0, 0);
    e.x = 1.2;
    e.z = 0;
  });
  const pulses = evs(W, 'aura_pulse').filter((p) => p.skill === 'crimson_edge');
  check(pulses.length >= 1 && pulses.some((p) => (p.hit || []).includes(e.id)) && !pulses.some((p) => (p.hit || []).includes(far.id)), `Crimson Edge cuts the nearest enemy in reach every second (${pulses.length} pulses)`);
}
// Archer: Hunter's Mark (a long arrow that exposes 30%).
{
  const W = campaignRoom(3, (X) => equip(X, 3, 'hunters_mark'));
  park(W, 3, -3, 0);
  const e = spawnAt(W, 'boar', 2.5, 0);
  pin(W, e);
  steps(W, 1);
  castAt(W, 3, 2.5, 0);
  steps(W, 70);
  const s = st(e, 'exposed', W);
  check(evs(W, 'hit').some((h) => h.source === 'hunters_mark' && h.target === e.id), "Hunter's Mark reaches 5.5 u");
  check(!!s && Math.abs(s.mag - 0.3) < 1e-6, `and marks the enemy: +30% taken (${s ? s.mag : 'none'})`);
}
// Archer: Barbed Trap (snaps shut: a stun).
{
  const W = campaignRoom(3, (X) => equip(X, 3, 'barbed_trap'));
  park(W, 3, 0, 0);
  const e = spawnAt(W, 'boar', 2.5, 0);
  pin(W, e);
  steps(W, 1);
  castAt(W, 3, 2.5, 0);
  let stunned = false;
  steps(W, 75, () => {
    e.x = 2.5;
    e.z = 0;
    if (st(e, 'stun', W)) stunned = true;
  });
  check(evs(W, 'azone_spawn').some((z) => z.skill === 'barbed_trap'), 'Barbed Trap is placed');
  check(stunned && evs(W, 'hit').some((h) => h.source === 'barbed_trap'), 'it snaps shut on the enemy: a hit and a stun');
}
// Archer: Feather Fan (five arrows, then the hare runs).
{
  const W = campaignRoom(3, (X) => equip(X, 3, 'feather_fan'));
  park(W, 3, 0, 0);
  spawnAt(W, 'ram', 1.5, 0);
  steps(W, 1);
  castAt(W, 3, 1.5, 0);
  steps(W, 1);
  const c = evs(W, 'ally_cast').find((x) => x.skill === 'feather_fan');
  check(!!c && c.count === 5, `Feather Fan looses five arrows (${c?.count})`);
  check(!!st(ally(W, 3), 'haste', W), 'and hastes the hare');
}
// Healer: Lantern Ward and Dawn Brand through the Healer's own keys.
{
  const W = campaignRoom();
  cmd(W, 'giveSkill', 'lantern_ward');
  cmd(W, 'giveSkill', 'dawn_brand');
  const slots = player(W).skills;
  const kLW = slots.indexOf('lantern_ward');
  const kDB = slots.indexOf('dawn_brand');
  cmd(W, 'teleport', 0, 0);
  for (const a of W.registry.all().filter((e) => e.kind === 'ally')) {
    a.x = a.px = (a.partyIndex - 2) * 0.8;
    a.z = a.pz = 0.8;
    a.hp = a.maxHp * 0.5;
  }
  const press = (k, aim) => W.step({ ...emptySnapshot(), aim, presses: [{ kind: `skill_${k + 1}` }] });
  press(kLW, { x: 1, z: 0 });
  steps(W, 1);
  const warded = party(W).filter((m) => m.kind === 'ally' && st(m, 'ward', W));
  check(evs(W, 'skill_cast').some((c) => c.skill === 'lantern_ward') && warded.length === 3, `Lantern Ward heals and wards the allies in reach (${warded.length}/3 warded)`);
  const e = spawnAt(W, 'ram', 3, 0);
  pin(W, e);
  press(kDB, { x: 3, z: 0 });
  steps(W, 75, () => {
    e.x = 3;
    e.z = 0;
  });
  check(evs(W, 'hit').some((h) => h.source === 'dawn_brand' && h.target === e.id) && !!st(e, 'exposed', W), 'Dawn Brand burns and exposes the enemies inside');
}

// ------------------------------------------------------------- 4. nodes --
// Sockets are refused in combat: the probe sockets between rooms.
function socketed(seat, skill, node) {
  let r = null;
  const W = campaignRoom(3, (X) => {
    equip(X, seat, skill);
    cmd(X, 'partyGrantNode', seat, node);
    r = cmd(X, 'partySocket', seat, skill, node);
  });
  const live = (W.world.partySystem().build(seat).tech.liveTechs(skill) || []).includes(node);
  return { W, r, live };
}
{
  // Rampart: the Tank is warded after a cast.
  const { W, live } = socketed(1, 'heavy_slam', 'rampart');
  park(W, 1, 0, 0);
  spawnAt(W, 'ram', 0.8, 0);
  steps(W, 1);
  castAt(W, 1, 1, 0);
  steps(W, 2);
  const w = st(ally(W, 1), 'ward', W);
  check(live && !!w && Math.abs(w.mag - C.CLASS_TECH.rampartWard) < 1e-6, `Rampart: the Tank is warded ${w ? w.mag : 0} after Heavy Slam`);
}
{
  // Crush: x1.5 on a stunned enemy.
  const { W, live } = socketed(1, 'heavy_slam', 'crush');
  park(W, 1, 0, 0);
  const a = spawnAt(W, 'ram', 0.8, 0.2, 2000);
  const b = spawnAt(W, 'ram', 0.8, -0.2, 2000);
  pin(W, a);
  pin(W, b);
  a.status = a.status || {};
  a.status.stun = { mag: 1, untilTick: W.clock.tick + 50, src: null, at: W.clock.tick };
  steps(W, 1);
  castAt(W, 1, 1, 0);
  steps(W, 2);
  const ha = evs(W, 'hit').find((h) => h.source === 'heavy_slam' && h.target === a.id);
  const hb = evs(W, 'hit').find((h) => h.source === 'heavy_slam' && h.target === b.id);
  const ratio = ha && hb ? ha.amount / (hb.crit === ha.crit ? hb.amount : hb.amount) : 0;
  check(live && ha && hb && (ha.crit === hb.crit ? Math.abs(ratio - 1.5) < 0.02 : ratio > 1.2), `Crush: the stunned enemy takes x1.5 (${ha?.amount} vs ${hb?.amount})`);
}
{
  // Gale Step: the fox is hasted after a cast.
  const { W, live } = socketed(2, 'flurry', 'gale_step');
  park(W, 2, 0, 0);
  spawnAt(W, 'ram', 0.6, 0);
  steps(W, 1);
  castAt(W, 2, 1, 0);
  steps(W, 2);
  check(live && !!st(ally(W, 2), 'haste', W), 'Gale Step: the fox is hasted after Flurry');
}
{
  // Duel: +30% alone with one enemy, nothing with two.
  const { W, live } = socketed(2, 'lunge_strike', 'duel');
  park(W, 2, 0, 0);
  const e = spawnAt(W, 'ram', 0.9, 0, 3000);
  pin(W, e);
  steps(W, 1);
  castAt(W, 2, 1, 0);
  steps(W, 2);
  const solo = evs(W, 'hit').find((h) => h.source === 'lunge_strike');
  const e2 = spawnAt(W, 'ram', -1.5, 0, 3000);
  pin(W, e2);
  W.log.length = 0;
  ally(W, 2).cds[0] = 0;
  steps(W, 1);
  castAt(W, 2, 1, 0);
  steps(W, 2);
  const crowd = evs(W, 'hit').find((h) => h.source === 'lunge_strike' && h.target === e.id);
  const base = SKILLS.lunge_strike.power;
  const norm = (h) => (h ? h.amount / (h.crit ? 1.5 : 1) : 0);
  check(live && Math.abs(norm(solo) / base - 1.3) < 0.05 && Math.abs(norm(crowd) / base - 1) < 0.05, `Duel: ${norm(solo).toFixed(1)} alone, ${norm(crowd).toFixed(1)} with a second enemy near (base ${base})`);
}
{
  // Longshot: a bolt that flew far lands harder.
  const { W, live } = socketed(3, 'piercing_shot', 'longshot');
  park(W, 3, -3, 0);
  const e = spawnAt(W, 'boar', 2.0, 0, 3000);
  pin(W, e);
  steps(W, 1);
  castAt(W, 3, 2, 0);
  steps(W, 80, () => {
    e.x = 2;
    e.z = 0;
  });
  const h = evs(W, 'hit').find((x) => x.source === 'piercing_shot');
  const norm = h ? h.amount / (h.crit ? 1.5 : 1) : 0;
  check(live && norm > SKILLS.piercing_shot.power * 1.35, `Longshot: a 5 u arrow lands for ${norm.toFixed(1)} (base ${SKILLS.piercing_shot.power})`);
}
{
  // Prey: the first enemy a cast hits is exposed.
  const { W, live } = socketed(3, 'volley', 'prey');
  park(W, 3, -3, 0);
  const e = spawnAt(W, 'ram', -1.0, 0, 3000);
  pin(W, e);
  steps(W, 1);
  castAt(W, 3, -1, 0);
  steps(W, 40);
  const s = st(e, 'exposed', W);
  check(live && !!s && Math.abs(s.mag - C.CLASS_TECH.preyExposed) < 1e-6, `Prey: the enemy Volley hits first is exposed (${s ? s.mag : 'none'}, live ${live})`);
}

// -------------------------------------------------------------- 5. saves --
{
  const W = campaignRoom(6, (X) => {
    equip(X, 1, 'earthen_grasp');
    equip(X, 2, 'moonfang');
    equip(X, 3, 'barbed_trap');
  });
  cmd(W, 'partyMode', 'auto');
  for (let i = 0; i < 6; i++) spawnAt(W, i % 2 ? 'boar' : 'ram', -2 + i, 2.5, 200);
  steps(W, 200, () => mend(W));
  const snap = clonePlain(W.io.capture());
  steps(W, 300, () => mend(W));
  const h1 = hashState(W.io.capture());
  const W2 = makeWorld(6);
  const ok = W2.io.apply(clonePlain(snap)).ok;
  steps(W2, 300, () => mend(W2));
  const h2 = hashState(W2.io.capture());
  check(ok, 'the save applies');
  check(h1 === h2, `a mid-fight save with the new skills continues bit-identically (${h1} / ${h2})`);
}

console.log(`\n${passes.length}/${passes.length + fails.length} checks passed`);
process.exit(fails.length ? 1 : 0);
