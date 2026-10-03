#!/usr/bin/env node
// fix-M2-r6 (SAVE6-F1) — headless content-drift gate for the save layer.
//   node tools/gntfixM26-drift-node.mjs [--out captures/gntfixM26-drift-node.json]
// (1) NO-OP: every moment's tree is unchanged by reconcileContent (same hash,
//     report.changed false) — G2.1 / goldens cannot move.
// (2) DRIFT: integrity-valid trees naming content this build lacks (the
//     critic's cases + every census path, tools/gntfixM26-idpaths.mjs) apply
//     into a FRESH world ok, the unknown content is gone, socketed nodes of a
//     removed skill are on that character's bench, the read paths work and
//     600 scripted ticks (+ the run driver through rewards / shops) run
//     without a throw.
// (3) SAFETY NET: the same drifted tree applied with reconcile OFF is refused
//     by the post-apply read check ('content', rolled back) and the live
//     world hashes exactly as before the attempt.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { scriptedInput } = await import(u('src/sim/script.js'));
const { SKILL_SLOTS } = await import(u('src/core/constants.js'));
const { hashState } = await import(u('src/core/hash.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { clonePlain } = await import(u('src/save/codec.js'));
const { reconcileContent, describeRepair } = await import(u('src/save/content.js'));
const { SKILLS } = await import(u('src/sim/skills.js'));
const { NODES } = await import(u('src/sim/nodes.js'));

const argv = process.argv.slice(2);
const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : join(here, 'captures', 'gntfixM26-drift-node.json');

function build({ seed = 7, room = null, harness = false } = {}) {
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
  const world = createWorld({ rng, registry, events: bus, harness, requestHitstop: clock.requestHitstop, room });
  const autopilot = world.runSystem().autopilot;
  const rawStep = world.step;
  world.step = (tick, snap, ...rest) => rawStep(tick, autopilot && autopilot.active() ? autopilot.intents(tick, snap) : snap, ...rest);
  const io = createStateIO({ clock, rng, registry, world });
  function stepN(n, script = null, driver = null) {
    let stepped = 0;
    let guard = 0;
    while (stepped < n && guard < n * 8 + 64) {
      guard += 1;
      if (clock.stepOnce((t) => world.step(t, script === null ? scriptedInput(0, t, { skillSlots: 0 }) : scriptedInput(script, t, { skillSlots: SKILL_SLOTS })))) {
        stepped += 1;
        if (driver) driver(world, clock.tick);
      }
    }
    return stepped;
  }
  return { rng, registry, bus, clock, world, io, stepN };
}
const runDriver = (world, tick) => {
  if (tick % 120 !== 0) return;
  world.cmd('killAllEnemies');
  const r = world.runSystem().view();
  if (r.phase === 'reward') world.runSystem().takeReward();
  if (r.phase === 'path') world.cmd('pathChoose', 0);
  if (r.phase === 'shop') world.cmd('shopAdvance');
};

// ------------------------------------------------------------ moments --
const M = {};
function builtL3(seed = 4) {
  const s = build({ seed });
  s.world.cmd('startCampaign', { level: 3 });
  s.stepN(30, null);
  for (const id of ['pale_lance', 'warding_aura']) s.world.cmd('giveSkill', id);
  for (const n of ['echo', 'resonance', 'sharpen', 'multiply', 'linger', 'snare', 'widen', 'reach', 'bounce', 'siphon', 'galvanize']) s.world.cmd('grantNode', n);
  const own = s.world.skillSlots().filter(Boolean).map((x) => x.id);
  let k = 0;
  for (const n of ['echo', 'resonance', 'sharpen', 'multiply', 'linger', 'snare', 'widen', 'reach']) s.world.cmd('socket', own[k++ % own.length], n);
  for (const seat of [1, 2, 3]) for (const n of ['sharpen', 'quicken', 'echo', 'resonance', 'multiply', 'reach']) s.world.cmd('partyGrantNode', seat, n);
  s.world.cmd('partyAutoFill', 'all');
  s.world.cmd('echoArm', own[0]);
  s.world.cmd('resonance', own[1], 2);
  s.stepN(300, 3);
  s.world.cmd('echoArm', own[0]);
  return s;
}
{
  const s = builtL3();
  M.l3built = s.io.capture();
}
{
  const s = build({ seed: 4 });
  s.world.cmd('startCampaign', { level: 1 });
  s.stepN(200, 3);
  let g = 0;
  while (s.world.runSystem().view().phase === 'combat' && g++ < 2000) {
    s.world.cmd('killAllEnemies');
    s.stepN(1, 3);
  }
  s.stepN(30, 3);
  M.reward = s.io.capture();
}
{
  // a SWAP reward: the Healer holds 4 skills when the reward is a skill
  const s = build({ seed: 9 });
  s.world.cmd('startCampaign', { level: 1 });
  for (const id of ['pale_lance', 'warding_aura']) s.world.cmd('giveSkill', id);
  s.world.cmd('grantNode', 'sharpen');
  s.world.cmd('socket', 'pale_lance', 'sharpen');
  let found = null;
  for (let room = 0; room < 6 && !found; room++) {
    s.stepN(120, 3);
    let g = 0;
    while (s.world.runSystem().view().phase === 'combat' && g++ < 3000) {
      s.world.cmd('killAllEnemies');
      s.stepN(1, 3);
    }
    s.stepN(20, 3);
    const v = s.io.capture();
    if (v.systems.run.phase === 'reward' && v.systems.run.reward && v.systems.run.reward.swap) found = v;
    else {
      const ph = s.world.runSystem().view().phase;
      if (ph === 'reward') s.world.runSystem().declineReward();
      s.stepN(5, 3);
      if (s.world.runSystem().view().phase === 'path') s.world.cmd('pathChoose', 0);
      s.stepN(60, 3);
    }
  }
  M.swap = found;
}
{
  const s = build({ seed: 5 });
  s.world.cmd('startCampaign', { level: 2 });
  s.stepN(10, null);
  s.world.cmd('skipToRoom', 7);
  s.stepN(60, null);
  M.shop = s.io.capture();
}
{
  const s = build({ seed: 7, room: 'kill_all' });
  s.stepN(700, 3);
  M.killall = s.io.capture();
}
{
  const s = build({ seed: 2, room: 'defend' });
  s.stepN(1300, 3);
  M.defend = s.io.capture();
}
{
  const s = build({ seed: 1 });
  s.world.runSystem().startRun({ act: 1 });
  s.stepN(1000, 3, runDriver);
  M.run1 = s.io.capture();
}
{
  const s = build({ seed: 6 });
  s.world.cmd('startCampaign', { level: 1 });
  s.stepN(10, null);
  s.world.cmd('skipToRoom', 8);
  s.stepN(120, 3);
  s.world.cmd('bossHp', 0.7);
  s.stepN(200, 3);
  M.boss = s.io.capture();
}
{
  const s = build({ seed: 11 });
  s.world.cmd('startCampaign', { level: 2 });
  s.stepN(420, 3);
  M.l2 = s.io.capture();
}
{
  const s = build({ seed: 3 });
  s.world.cmd('startCampaign', { level: 1 });
  s.stepN(5000, 3, runDriver);
  M.l1long = s.io.capture();
}
{
  const s = build({ seed: 8 });
  s.world.cmd('startCampaign', { level: 1 });
  s.world.cmd('giveSkill', 'pale_lance');
  s.stepN(200, 3);
  for (const e of s.registry.all()) if (e.partyIndex !== undefined) s.world.cmd('setHp', e.id, 0);
  s.stepN(30, 3);
  M.defeat = s.io.capture();
}
{
  const s = build({ seed: 12 });
  M.camp = s.io.capture();
}

const R = { noop: [], drift: [], safety: [], failures: [] };
const fail = (msg, v) => {
  R.failures.push({ msg, v });
  console.log(`[FAIL] ${msg} ${v !== undefined ? JSON.stringify(v).slice(0, 600) : ''}`);
};

// ------------------------------------------------------------ (1) NO-OP --
for (const [name, t] of Object.entries(M)) {
  if (!t) {
    fail(`moment ${name} not reached`);
    continue;
  }
  const h0 = hashState(t);
  const c = clonePlain(t);
  const rep = reconcileContent(c);
  const h1 = hashState(c);
  const row = { name, phase: t.systems.run.phase, entities: t.registry.entities.length, changed: rep.changed, equal: h0 === h1, h0 };
  R.noop.push(row);
  if (rep.changed || h0 !== h1) fail(`no-op violated on ${name}`, rep);
}
console.log('[noop]', R.noop.map((r) => `${r.name}:${r.phase}:${r.equal && !r.changed ? 'ok' : 'CHANGED'}`).join(' '));

// ------------------------------------------------------------ (2) DRIFT --
const ent = (t, pred) => t.registry.entities.find(pred);
const renameRow = (b, from, to) => {
  for (const p of b.assignments) if (p[0] === from) p[0] = to;
};
const filledOf = (b, skill) => {
  const p = b.assignments.find((x) => x[0] === skill);
  return p ? p[1].filter(Boolean).map((r) => r.node) : [];
};
const healerOwned = (t) => t.systems.skills.slots.filter(Boolean).map((s) => s.id);
const CASES = [
  {
    name: 'healer_unknown_skill_slot0',
    base: 'reward',
    mut: (t) => {
      t.systems.skills.slots[0].id = 'no_such_skill';
    },
    expect: (t2, rep) => !healerOwned(t2).includes('no_such_skill') && rep.skills.length === 1,
  },
  {
    name: 'healer_retired_skill_with_sockets',
    base: 'l3built',
    mut: (t) => {
      // a real rename: the slot AND its socket row carry the old id
      const id = t.systems.skills.slots[1].id;
      t.__nodes = filledOf(t.systems.build, id);
      t.systems.skills.slots[1].id = 'retired_skill';
      renameRow(t.systems.build, id, 'retired_skill');
      for (const r of t.systems.build.resonance) if (r[0] === id) r[0] = 'retired_skill';
      const p = ent(t, (e) => e.kind === 'player');
      p.skills[1] = 'retired_skill';
    },
    expect: (t2, rep, t) => {
      const benched = t2.systems.build.bench.map((b) => b.node);
      const need = t.__nodes;
      const ok = need.length > 0 && need.every((n) => benched.filter((x) => x === n).length >= 1) && rep.benched.length === need.length;
      const p = ent(t2, (e) => e.kind === 'player');
      return ok && !healerOwned(t2).includes('retired_skill') && !p.skills.includes('retired_skill') && !t2.systems.build.assignments.some((a) => a[0] === 'retired_skill') && !t2.systems.build.resonance.some((r) => r[0] === 'retired_skill');
    },
  },
  {
    name: 'healer_socket_unknown_node',
    base: 'l3built',
    mut: (t) => {
      const row = t.systems.build.assignments.find((a) => a[1].some(Boolean));
      const k = row[1].findIndex(Boolean);
      row[1][k] = { ...row[1][k], node: 'no_such_node' };
    },
    expect: (t2, rep) => rep.nodes.length === 1 && !JSON.stringify(t2.systems.build).includes('no_such_node'),
  },
  {
    name: 'seat2_socket_unknown_node',
    base: 'l3built',
    mut: (t) => {
      const b = t.systems.party.seats[2].build;
      const row = b.assignments.find((a) => a[1].some(Boolean));
      const k = row[1].findIndex(Boolean);
      row[1][k] = { ...row[1][k], node: 'no_such_node' };
    },
    expect: (t2, rep) => rep.nodes.length === 1 && !JSON.stringify(t2.systems.party).includes('no_such_node'),
  },
  {
    name: 'seat1_retired_skill_with_sockets',
    base: 'l3built',
    mut: (t) => {
      const s = t.systems.party.seats[1];
      const id = s.slots.find((x) => x && filledOf(s.build, x).length > 0) || s.slots[0];
      t.__nodes = filledOf(s.build, id);
      s.slots[s.slots.indexOf(id)] = 'retired_skill';
      renameRow(s.build, id, 'retired_skill');
    },
    expect: (t2, rep, t) => {
      const s = t2.systems.party.seats[1];
      return !s.slots.includes('retired_skill') && rep.benched.length === t.__nodes.length && t.__nodes.length > 0 && !s.build.assignments.some((a) => a[0] === 'retired_skill');
    },
  },
  {
    name: 'benches_unknown_node',
    base: 'l3built',
    mut: (t) => {
      t.systems.build.bench.push({ node: 'no_such_node', provenance: 'spoils' });
      t.systems.party.seats[3].build.bench.push({ node: 'constructor', provenance: 'spoils' });
    },
    expect: (t2, rep) => rep.nodes.length === 2,
  },
  {
    name: 'healer_duplicate_skill',
    base: 'reward',
    mut: (t) => {
      t.systems.skills.slots[1] = { id: t.systems.skills.slots[0].id, readyTick: 0 };
    },
    expect: (t2, rep) => rep.skills.length === 1 && rep.skills[0].why === 'duplicate' && healerOwned(t2).length === new Set(healerOwned(t2)).size,
  },
  {
    name: 'prototype_key_skill',
    base: 'reward',
    mut: (t) => {
      t.systems.skills.slots[0].id = 'constructor';
    },
    expect: (t2, rep) => rep.skills.length === 1 && !healerOwned(t2).includes('constructor'),
  },
  {
    name: 'echo_queue_and_resonance_unknown',
    base: 'l3built',
    mut: (t) => {
      const b = t.systems.build;
      b.echoQueue.push({ due: t.clock.tick + 2, skill: 'retired_skill', cast: { skill: 'retired_skill', tick: t.clock.tick, type: 'skill_cast', slot: -1 } });
      b.resonance.push(['retired_skill', 2]);
      b.auraEchoNext.push(['retired_skill', t.clock.tick + 30]);
      t.systems.skills.auraNext.push(['retired_skill', t.clock.tick + 30]);
    },
    expect: (t2) => !JSON.stringify(t2.systems.build).includes('retired_skill') && !JSON.stringify(t2.systems.skills).includes('retired_skill'),
  },
  {
    name: 'effects_in_flight_unknown_skill',
    base: 'l3built',
    mut: (t) => {
      let n = 0;
      for (const e of t.registry.entities) {
        if (typeof e.skill === 'string' && n < 3) {
          e.skill = 'retired_skill';
          n += 1;
        }
      }
      t.__n = n;
    },
    expect: (t2, rep, t) => t.__n > 0 && rep.effects === t.__n && !t2.registry.entities.some((e) => e.skill === 'retired_skill'),
  },
  {
    name: 'reward_offers_unknown_skill',
    base: 'reward',
    mut: (t) => {
      const r = t.systems.run.reward;
      r.type = 'skill';
      r.id = 'retired_skill';
      const pp = t.systems.run.partyPages;
      if (pp && pp.page) {
        pp.page.cards[0].type = 'skill';
        pp.page.cards[0].id = 'retired_skill';
        pp.page.cards[2].type = 'node';
        pp.page.cards[2].id = 'no_such_node';
        pp.page.cards[2].decided = false;
        pp.page.cards[2].choice = null;
        pp.page.cards[3].spoils = ['no_such_node', ...(pp.page.cards[3].spoils || [])];
      }
    },
    expect: (t2) => {
      const r = t2.systems.run.reward;
      const pp = t2.systems.run.partyPages;
      return r.type === null && r.id === null && (!pp || (pp.page.cards[0].id === null && pp.page.cards[2].id === null && pp.page.cards[2].decided === true && !pp.page.cards[3].spoils.includes('no_such_node')));
    },
    after: (s) => {
      // the run must move on from the emptied reward
      const ph0 = s.world.runSystem().view().phase;
      s.world.runSystem().declineReward();
      s.stepN(10, 3);
      return { from: ph0, to: s.world.runSystem().view().phase };
    },
  },
  {
    name: 'swap_offer_after_skill_removed',
    base: 'swap',
    mut: (t) => {
      t.systems.skills.slots[2].id = 'retired_skill';
    },
    expect: (t2) => !t2.systems.run.reward.swap && t2.systems.run.reward.type === 'skill',
    after: (s) => {
      const id = s.world.runSystem().view().reward;
      const before = s.world.skillSlots().map((x) => x && x.id);
      const taken = s.world.runSystem().takeReward();
      s.stepN(5, 3);
      return { taken, before, after: s.world.skillSlots().map((x) => x && x.id), id };
    },
    afterOk: (a) => a.taken && a.after.filter(Boolean).length === a.before.filter(Boolean).length + 1,
  },
  {
    name: 'shop_and_shelves_unknown_node',
    base: 'shop',
    mut: (t) => {
      t.systems.run.shop.stock[0].node = 'no_such_node';
      const sh = t.systems.run.partyPages && t.systems.run.partyPages.shop;
      if (sh) {
        sh.shelves[1][1].node = 'no_such_node';
        t.__marked = sh.marked[1].slice();
      }
    },
    expect: (t2, rep, t) => {
      const sh = t2.systems.run.partyPages && t2.systems.run.partyPages.shop;
      const okShelf = !sh || (sh.shelves[1].every((c) => c.node !== 'no_such_node') && sh.marked[1].length === sh.shelves[1].length && sh.marked[1].join() === t.__marked.filter((_, k) => k !== 1).join());
      return t2.systems.run.shop.stock.every((c) => c.node !== 'no_such_node') && okShelf && rep.shopItems >= 1;
    },
    after: (s) => {
      // buy what is left on the Healer's shelf, then leave
      const v = s.world.runSystem().view();
      const r = s.world.cmd('shopBuy', 0);
      s.world.cmd('shopAdvance');
      s.stepN(60, 3);
      return { stock: v.shop ? v.shop.stock.length : null, buy: r, phase: s.world.runSystem().view().phase };
    },
  },
  {
    name: 'seat1_six_skills_with_sockets',
    base: 'l3built',
    mut: (t) => {
      const s = t.systems.party.seats[1];
      s.slots = s.slots.concat(['shield_wall', 'iron_stance']);
      s.build.assignments.push(['iron_stance', [{ node: 'sharpen', provenance: 'drafted' }, null, null, null, null, null, null, null]]);
    },
    expect: (t2, rep) => t2.systems.party.seats[1].slots.length === 4 && rep.skills.filter((x) => x.why === 'over_cap').length >= 1,
  },
  {
    name: 'card_and_summary_records',
    base: 'defeat',
    mut: (t) => {
      const sum = t.systems.run.summary;
      if (sum) {
        sum.skills = ['retired_skill', ...sum.skills];
        if (sum.builds && sum.builds[0]) sum.builds[0].skills[3] = 'retired_skill';
        if (sum.nodes) sum.nodes.socketed = ['retired_skill:echo', 'mending_bolt:no_such_node', ...sum.nodes.socketed];
      }
    },
    expect: (t2) => !JSON.stringify(t2.systems.run.summary || {}).includes('retired_skill') && !JSON.stringify(t2.systems.run.summary || {}).includes('no_such_node'),
  },
  {
    name: 'ally_entity_unknown_class',
    base: 'l3built',
    mut: (t) => {
      ent(t, (e) => e.kind === 'ally' && e.partyIndex === 2).classId = 'wizard';
    },
    expect: (t2) => ent(t2, (e) => e.kind === 'ally' && e.partyIndex === 2).classId === 'swordsman',
  },
  {
    name: 'everything_at_once',
    base: 'l3built',
    mut: (t) => {
      t.systems.skills.slots[0].id = 'retired_a';
      t.systems.skills.slots[3].id = 'retired_b';
      for (const i of [1, 2, 3]) {
        const b = t.systems.party.seats[i].build;
        for (const a of b.assignments) for (let k = 0; k < a[1].length; k++) if (a[1][k] && k % 2 === 0) a[1][k] = { ...a[1][k], node: `gone_${k}` };
        t.systems.party.seats[i].slots[i - 1] = `retired_${i}`;
      }
      for (const e of t.registry.entities) if (typeof e.skill === 'string') e.skill = 'retired_fx';
    },
    expect: (t2, rep) => rep.skills.length === 5 && rep.nodes.length > 0 && rep.effects > 0,
  },
];

for (const c of CASES) {
  const base = M[c.base];
  if (!base) {
    fail(`${c.name}: base ${c.base} missing`);
    continue;
  }
  const t = clonePlain(base);
  c.mut(t);
  const meta = { __nodes: t.__nodes, __n: t.__n, __marked: t.__marked };
  delete t.__nodes;
  delete t.__n;
  delete t.__marked;
  const s = build({ seed: 99 });
  s.stepN(30, null);
  let row = { name: c.name, base: c.base };
  try {
    // what the load would report (a private copy)
    const preview = describeRepair(reconcileContent(clonePlain(t)));
    const r = s.io.apply(t);
    row.apply = { ok: r.ok, error: r.error, detail: r.detail };
    row.line = preview && preview.line;
    if (!r.ok) {
      fail(`${c.name}: apply refused`, r);
      R.drift.push(row);
      continue;
    }
    const rep = r.repair;
    row.repair = rep ? { skills: rep.skills, nodes: rep.nodes.length, benched: rep.benched.length, offers: rep.offers, shopItems: rep.shopItems, effects: rep.effects, records: rep.records } : null;
    const t2 = s.io.capture();
    row.expect = !!(rep && c.expect(t2, rep, meta));
    if (!row.expect) fail(`${c.name}: expectation not met`, row.repair);
    // read paths + a re-capture reconciles to a no-op (nothing unknown left)
    s.world.snapshotState();
    s.world.partySystem().state();
    const again = reconcileContent(clonePlain(t2));
    row.cleanAfter = !again.changed;
    if (again.changed) fail(`${c.name}: unknown content left after the load`, again);
    if (c.after) {
      row.after = c.after(s);
      if (c.afterOk && !c.afterOk(row.after)) fail(`${c.name}: after-check failed`, row.after);
    }
    const t0 = s.clock.tick;
    s.stepN(600, 3, runDriver);
    s.world.snapshotState();
    row.stepped = s.clock.tick - t0;
    row.phaseEnd = s.world.runSystem().view().phase;
    if (row.stepped < 600) fail(`${c.name}: stepped only ${row.stepped}`);
  } catch (err) {
    row.threw = String(err && err.stack).slice(0, 600);
    fail(`${c.name}: threw`, row.threw);
  }
  R.drift.push(row);
  console.log(`[drift] ${c.name}: apply ${row.apply && row.apply.ok} expect ${row.expect} clean ${row.cleanAfter} stepped ${row.stepped} ${row.after ? JSON.stringify(row.after).slice(0, 160) : ''}`);
  if (row.line) console.log(`        "${row.line}"`);
}

// ------------------------------------------------------- (3) SAFETY NET --
for (const c of CASES.filter((x) => ['healer_unknown_skill_slot0', 'healer_socket_unknown_node', 'reward_offers_unknown_skill'].includes(x.name))) {
  const t = clonePlain(M[c.base]);
  c.mut(t);
  delete t.__nodes;
  delete t.__n;
  delete t.__marked;
  const s = build({ seed: 77 });
  s.stepN(45, null);
  const hBefore = hashState(s.io.capture());
  let row = { name: c.name };
  try {
    const r = s.io.apply(t, { reconcile: false });
    row.apply = { ok: r.ok, error: r.error, rolledBack: r.rolledBack, detail: r.detail && String(r.detail).slice(0, 160) };
    const hAfter = hashState(s.io.capture());
    row.rollbackExact = hAfter === hBefore;
    s.stepN(120, 3);
    s.world.snapshotState();
    row.stepsAfter = true;
    // without the read check the tree WOULD have applied (the lock the
    // critic saw): it is only the reconcile + check that stop it
    if (c.name !== 'reward_offers_unknown_skill' && (r.ok || r.error !== 'content' || !r.rolledBack || !row.rollbackExact)) fail(`${c.name}: safety net did not refuse + roll back`, row);
  } catch (err) {
    row.threw = String(err && err.stack).slice(0, 400);
    fail(`${c.name}: safety probe threw`, row.threw);
  }
  R.safety.push(row);
  console.log(`[safety] ${c.name}: ${JSON.stringify(row.apply)} rollbackExact ${row.rollbackExact}`);
}

R.verdict = R.failures.length ? 'FAIL' : 'PASS';
R.counts = { skills: Object.keys(SKILLS).length, nodes: Object.keys(NODES).length };
writeFileSync(out, JSON.stringify(R, null, 1));
console.log(`[DONE] ${R.verdict} failures ${R.failures.length} -> ${out}`);
