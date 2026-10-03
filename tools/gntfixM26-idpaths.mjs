#!/usr/bin/env node
// fix-M2-r6 (SAVE6-F1) — content-id path census. Builds the sim headless like
// tools/gntM2-nodetrip.mjs, drives it to moments that hold every kind of
// content reference (a built Level-3 fight with zones / bolts / Echo recasts /
// Resonance, a reward page, a shop, the party pages), captures the StateTree
// and lists every generalized path whose VALUE or KEY is a skill id, a node id
// or a class id. The reconcile (src/save/content.js) must cover each path.
//   node tools/gntfixM26-idpaths.mjs [--out captures/gntfixM26-idpaths.json]
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
const { createStateIO } = await import(u('src/save/capture.js'));
const { SKILLS } = await import(u('src/sim/skills.js'));
const { NODES } = await import(u('src/sim/nodes.js'));

const argv = process.argv.slice(2);
const out = argv[argv.indexOf('--out') + 1] && argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : join(here, 'captures', 'gntfixM26-idpaths.json');

export function build({ seed = 7, room = null, harness = false } = {}) {
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
  function stepN(n, script = null) {
    let stepped = 0;
    let guard = 0;
    while (stepped < n && guard < n * 8 + 64) {
      guard += 1;
      if (clock.stepOnce((t) => world.step(t, script === null ? scriptedInput(0, t, { skillSlots: 0 }) : scriptedInput(script, t, { skillSlots: SKILL_SLOTS })))) stepped += 1;
    }
    return stepped;
  }
  return { rng, registry, bus, clock, world, io, stepN };
}

const SK = new Set(Object.keys(SKILLS));
const ND = new Set(Object.keys(NODES));
const CL = new Set(['healer', 'tank', 'swordsman', 'archer']);
function scan(tree) {
  const hits = new Map();
  const add = (p, what, v) => {
    const k = `${p} [${what}]`;
    if (!hits.has(k)) hits.set(k, { path: p, what, n: 0, ex: v });
    hits.get(k).n += 1;
  };
  const walk = (v, p) => {
    if (typeof v === 'string') {
      if (SK.has(v)) add(p, 'skill', v);
      if (ND.has(v)) add(p, 'node', v);
      if (CL.has(v)) add(p, 'class', v);
      return;
    }
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) {
      v.forEach((x, i) => walk(x, `${p}[]`));
      return;
    }
    for (const k of Object.keys(v)) {
      if (SK.has(k)) add(`${p}.{key}`, 'skill-key', k);
      if (ND.has(k)) add(`${p}.{key}`, 'node-key', k);
      const kk = SK.has(k) || ND.has(k) ? '{key}' : k;
      walk(v[k], `${p}.${kk}`);
    }
  };
  // registry entities: generalize by kind
  for (const e of tree.registry.entities) walk(e, `registry.entities<${e.kind}>`);
  const rest = { ...tree, registry: { nextOrdinal: tree.registry.nextOrdinal } };
  walk(rest, '$');
  return [...hits.values()];
}

const moments = {};
// 1. Level 3 fight, built Healer + allies, effects in flight, Echo + Resonance
{
  const s = build({ seed: 4 });
  s.world.cmd('startCampaign', { level: 3 });
  s.stepN(30, null);
  for (const id of ['pale_lance', 'warding_aura']) s.world.cmd('giveSkill', id);
  for (const n of ['echo', 'resonance', 'sharpen', 'multiply', 'linger', 'snare', 'widen', 'reach', 'bounce', 'siphon', 'detonate', 'split', 'bulwark', 'galvanize']) s.world.cmd('grantNode', n);
  const own = s.world.skillSlots().filter(Boolean).map((x) => x.id);
  let k = 0;
  for (const n of ['echo', 'resonance', 'sharpen', 'multiply', 'linger', 'snare', 'widen', 'reach']) s.world.cmd('socket', own[k++ % own.length], n);
  for (const seat of [1, 2, 3]) {
    for (const n of ['sharpen', 'quicken', 'echo', 'resonance', 'multiply']) s.world.cmd('partyGrantNode', seat, n);
  }
  for (const seat of [1, 2, 3]) {
    const P = s.world.partySystem();
    const pool = (P.pools && P.pools(seat)) || null;
    if (pool && pool.nodes) for (const n of pool.nodes.slice(0, 6)) s.world.cmd('partyGrantNode', seat, n);
  }
  s.world.cmd('partyAutoFill', 'all');
  s.world.cmd('echoArm', own[0]);
  s.world.cmd('resonance', own[1], 2);
  s.stepN(400, 3);
  s.world.cmd('echoArm', own[0]);
  s.stepN(1, 3);
  moments.l3built = s.io.capture();
}
// 2. reward page
{
  const s = build({ seed: 4 });
  s.world.cmd('startCampaign', { level: 1 });
  s.stepN(200, 3);
  s.world.cmd('killAllEnemies');
  let g = 0;
  while (s.world.runSystem().view().phase === 'combat' && g++ < 2000) {
    s.stepN(1, 3);
    s.world.cmd('killAllEnemies');
  }
  s.stepN(30, 3);
  moments.reward = s.io.capture();
  moments.reward_phase = moments.reward.systems.run.phase;
}
// 3. shop
{
  const s = build({ seed: 5 });
  s.world.cmd('startCampaign', { level: 2 });
  s.stepN(10, null);
  s.world.cmd('skipToRoom', 7);
  s.stepN(60, null);
  moments.shop = s.io.capture();
  moments.shop_phase = moments.shop.systems.run.phase;
}
// 4. level-clear transition card (campaign L1 Stag killed with a built Healer)
{
  const s = build({ seed: 6 });
  s.world.cmd('startCampaign', { level: 1 });
  s.stepN(10, null);
  s.world.cmd('giveSkill', 'pale_lance');
  s.world.cmd('grantNode', 'echo');
  s.world.cmd('socket', 'mending_bolt', 'echo');
  s.world.cmd('skipToRoom', 8);
  s.stepN(120, 3);
  let g = 0;
  while (!(s.world.runSystem().view().campaign && s.world.runSystem().view().campaign.card) && g++ < 400) {
    s.world.cmd('killAllEnemies');
    s.world.cmd('bossHp', 0);
    s.stepN(5, 3);
  }
  moments.card = s.io.capture();
  moments.card_phase = `${moments.card.systems.run.phase} card=${!!(moments.card.systems.run.campaign && moments.card.systems.run.campaign.card)}`;
}
// 5. defeat summary (party wiped mid-room)
{
  const s = build({ seed: 8 });
  s.world.cmd('startCampaign', { level: 1 });
  s.world.cmd('giveSkill', 'pale_lance');
  s.stepN(200, 3);
  for (const e of s.registry.all()) if (e.partyIndex !== undefined) s.world.cmd('setHp', e.id, 0);
  s.stepN(30, 3);
  moments.defeat = s.io.capture();
  moments.defeat_phase = moments.defeat.systems.run.phase;
}
const report = {};
for (const [k, t] of Object.entries(moments)) {
  if (typeof t !== 'object') {
    report[k] = t;
    continue;
  }
  report[k] = scan(t).sort((a, b) => (a.path < b.path ? -1 : 1));
}
const all = new Map();
for (const k of ['l3built', 'reward', 'shop', 'card', 'defeat']) for (const h of report[k]) all.set(`${h.path} [${h.what}]`, h.ex);
report.union = [...all.entries()].sort().map(([k, ex]) => `${k}  e.g. ${ex}`);
writeFileSync(out, JSON.stringify(report, null, 1));
for (const l of report.union) console.log(l);
console.log('phases', report.reward_phase, report.shop_phase, report.card_phase, report.defeat_phase);
