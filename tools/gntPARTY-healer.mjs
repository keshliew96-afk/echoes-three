#!/usr/bin/env node
// PARTY GP.14 (Node): the Healer is unchanged. Compares this tree with a
// `git archive` of v0.5.150 (--base150 <dir>):
//   - data: DRAFTABLE_SKILL_IDS, the Healer's node pool (draft NODE_IDS),
//     every Healer skill row and every Healer-pool node row, field for field;
//   - play: the same campaign recipe on both trees (seeds 1-3, Level 1:
//     killAllEnemies every 240 ticks, take the draft, the left door, leave
//     the shop) — the seat-0 `reward_offer` / `spoils_drop` / `shop_open` /
//     `draft_taken` payload KEY SETS, spoils 2 per clear, the 4-card shelf's
//     prices and the wallet at the shelf are equal; a swap offer (4 skills
//     owned) adds exactly `swap` + `replace` to `reward_offer`.
//   node tools/gntPARTY-healer.mjs --base150 <dir>
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const BASE = opt('base150');
if (!BASE) {
  console.error('usage: node tools/gntPARTY-healer.mjs --base150 <dir with a git archive of v0.5.150>');
  process.exit(2);
}
const results = [];
function check(name, pass, got = null) {
  results.push({ name, pass: !!pass, got });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass ? '' : ' ' + JSON.stringify(got).slice(0, 500)}`);
}
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));

async function load(root) {
  const u = (p) => pathToFileURL(join(root, p)).href;
  return {
    root,
    skills: await import(u('src/sim/skills.js')),
    nodes: await import(u('src/sim/nodes.js')),
    draft: await import(u('src/sim/draft.js')),
    rng: await import(u('src/core/rng.js')),
    reg: await import(u('src/core/registry.js')),
    ev: await import(u('src/core/events.js')),
    clk: await import(u('src/core/clock.js')),
    world: await import(u('src/sim/world.js')),
    script: await import(u('src/sim/script.js')),
  };
}
const now = await load(here);
const old = await load(resolve(BASE));

// ------------------------------------------------------------- data --
const oldDraftable = [...(old.draft.DRAFTABLE_SKILL_IDS ?? old.skills.DRAFTABLE_SKILL_IDS)];
const nowDraftable = [...(now.draft.DRAFTABLE_SKILL_IDS ?? now.skills.DRAFTABLE_SKILL_IDS)];
check(`DRAFTABLE_SKILL_IDS (${nowDraftable.length}) = v0.5.150's`, canon([...oldDraftable].sort()) === canon([...nowDraftable].sort()), { old: oldDraftable, now: nowDraftable });
const healerPool = [...now.skills.HEALER_SKILL_IDS];
const want = [...new Set([...oldDraftable, 'mending_bolt', 'swift_mend'])].sort();
check(`the Healer's swap pool (HEALER_SKILL_IDS, ${healerPool.length}) = v0.5.150's draftable skills + the two starting skills`, canon([...healerPool].sort()) === canon(want), { now: healerPool, want });
const oldNodeIds = [...old.draft.NODE_IDS];
const nowNodeIds = [...now.draft.NODE_IDS];
check(`the Healer's node pool (${nowNodeIds.length}) = v0.5.150 NODE_IDS`, canon([...oldNodeIds].sort()) === canon([...nowNodeIds].sort()), { old: oldNodeIds, now: nowNodeIds });
const skillBad = Object.keys(old.skills.SKILLS).filter((id) => canon(old.skills.SKILLS[id]) !== canon(now.skills.SKILLS[id]));
check(`every v0.5.150 skill row (${Object.keys(old.skills.SKILLS).length}) is field-for-field unchanged`, skillBad.length === 0, skillBad.map((id) => ({ id, old: old.skills.SKILLS[id], now: now.skills.SKILLS[id] })));
const nodeBad = Object.keys(old.nodes.NODES).filter((id) => canon(old.nodes.NODES[id]) !== canon(now.nodes.NODES[id]));
check(`every v0.5.150 node row (${Object.keys(old.nodes.NODES).length}) is field-for-field unchanged`, nodeBad.length === 0, nodeBad.map((id) => ({ id, old: old.nodes.NODES[id], now: now.nodes.NODES[id] })));
for (const k of ['TECH', 'SHOP', 'SPOILS']) {
  if (old.nodes[k] !== undefined || now.nodes[k] !== undefined) check(`nodes.js ${k} unchanged`, canon(old.nodes[k]) === canon(now.nodes[k]), { old: old.nodes[k], now: now.nodes[k] });
}

// ------------------------------------------------------------- play --
function play(T, seed, { giveSkills = 0, rooms = 14 } = {}) {
  let impl = T.rng.createGameplayRng(seed);
  const rng = {
    stream: 'gameplay',
    get seed() { return impl.seed; },
    get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (q) => impl.chance(q),
    pick: (a) => impl.pick(a),
    reseed: (s) => { impl = T.rng.createGameplayRng(s >>> 0); return impl.seed; },
    getState: () => impl.getState(),
    setState: (st) => { impl = T.rng.createGameplayRng(st.seed >>> 0); return impl.setState(st); },
  };
  const registry = T.reg.createRegistry();
  const bus = T.ev.createEventBus();
  const clock = T.clk.createClock();
  const world = T.world.createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const evs = [];
  bus.on('*', (e) => {
    if (e.type !== 'sound') evs.push(e);
  });
  const step = (n) => {
    for (let k = 0, g = 0; k < n && g < n * 8 + 64; g++) if (clock.stepOnce((t) => world.step(t, T.script.scriptedInput(3, t, { skillSlots: 4 })))) k += 1;
  };
  world.runSystem().startRun({ act: 1 });
  step(2);
  for (const id of ['spirit_bolt', 'pale_lance'].slice(0, giveSkills)) world.cmd('giveSkill', id);
  let shopSeen = false;
  for (let t = 0; t < rooms * 1200 && world.runSystem().view().phase !== 'idle'; t += 60) {
    step(60);
    const v = world.runSystem().view();
    if (v.phase === 'combat' && v.room < 8 && t % 240 === 0) world.cmd('killAllEnemies');
    if (v.phase === 'reward') world.runSystem().takeReward();
    if (v.phase === 'path') world.cmd('pathChoose', 0);
    if (v.phase === 'shop') {
      shopSeen = true;
      world.cmd('shopAdvance');
    }
    if (v.room >= 8) break;
  }
  const seat0 = (e) => e.seat === undefined || e.seat === 0;
  return { evs: evs.filter(seat0), shopSeen, world };
}
const keySet = (list) => [...new Set(list.map((e) => Object.keys(e).filter((k) => k !== 'tick' && k !== 'type').sort().join(',')))].sort();
// The only new seat-0 keys a v0.5.162 run may show: ruling A17's swap
// (a skill room with 4 skills owned — v0.5.150 substituted a node there).
const A17 = { reward_offer: ['replace', 'swap'], draft_taken: ['released', 'replaced', 'slot', 'swap'] };
for (const seed of [1, 2, 3]) {
  const A = play(old, seed);
  const B = play(now, seed);
  for (const type of ['reward_offer', 'spoils_drop', 'shop_open', 'draft_taken', 'shop_purchase']) {
    const a = keySet(A.evs.filter((e) => e.type === type));
    const b = keySet(B.evs.filter((e) => e.type === type));
    const known = new Set(a.flatMap((x) => x.split(',')));
    const extra = [...new Set(b.flatMap((x) => x.split(',')))].filter((k) => k && !known.has(k) && !(A17[type] || []).includes(k));
    // Every v0.5.150 variant keeps its exact key set when it recurs.
    check(`seed ${seed}: seat-0 ${type} payload keys are v0.5.150's (+ only ruling A17's swap keys) (${b.length} variant(s))`, extra.length === 0 && (a.length === 0 || b.length > 0), { old: a, now: b, extra });
  }
  const sp = (X) => X.evs.filter((e) => e.type === 'spoils_drop').map((e) => e.nodes.length);
  check(`seed ${seed}: the Healer's clear spoils are 2 per clear (${JSON.stringify(sp(B))}; v0.5.150 ${JSON.stringify(sp(A))})`, sp(B).length > 0 && sp(B).every((n) => n === 2), { now: sp(B), old: sp(A) });
  const shelf = (X) => {
    const e = X.evs.find((x) => x.type === 'shop_open');
    return e ? { wallet: e.wallet, prices: e.stock.map((s) => s.price).sort((p, q) => p - q), n: e.stock.length } : null;
  };
  check(`seed ${seed}: the Healer's shelf = 4 cards at 15/15/20/25 and the wallet at the shelf = v0.5.150's (${JSON.stringify(shelf(B))} vs ${JSON.stringify(shelf(A))})`, shelf(B) && shelf(B).n === 4 && canon(shelf(B).prices) === canon([15, 15, 20, 25]) && shelf(A) && shelf(B).wallet === shelf(A).wallet, { now: shelf(B), old: shelf(A) });
}
// A swap offer: 4 skills owned before a skill room (ruling A17).
{
  const A = play(old, 7, { giveSkills: 2, rooms: 2 });
  const B = play(now, 7, { giveSkills: 2, rooms: 2 });
  const rb = B.evs.filter((e) => e.type === 'reward_offer' && e.reward === 'skill');
  const ra = A.evs.filter((e) => e.type === 'reward_offer');
  const base = keySet(ra.filter((e) => !e.pool));
  const swapKeys = rb.filter((e) => e.swap).map((e) => Object.keys(e).filter((k) => k !== 'tick' && k !== 'type').sort().join(','));
  const added = swapKeys.length ? swapKeys[0].split(',').filter((k) => !base.some((s) => s.split(',').includes(k))) : null;
  check(`a SWAP offer (4 Healer skills) adds exactly swap + replace to reward_offer (added: ${JSON.stringify(added)})`, swapKeys.length > 0 && canon(added) === canon(['replace', 'swap']), { base, swapKeys, old: ra.map((e) => e.reward) });
}
const failed = results.filter((r) => !r.pass);
mkdirSync(join(here, 'captures'), { recursive: true });
writeFileSync(join(here, 'captures/gntPARTY-healer.json'), JSON.stringify({ tool: 'gntPARTY-healer', base150: BASE, passed: results.length - failed.length, of: results.length, results }, null, 1));
console.log(`${results.length - failed.length}/${results.length} checks pass`);
process.exit(failed.length ? 1 : 0);
