#!/usr/bin/env node
// fix-M4a-r4 (CONTENT4-F1) — node supply per level for whole default-autopilot
// campaigns, headless Node sim built exactly like tools/gntCAMPAIGN-camprun.mjs.
//
//   node tools/gntfixM4a4-supply.mjs [--from 1|2|3] [--seeds 1-5] [--root <checkout>] [--out f]
//
// Per level: spoils per combat clear (room -> count, and which were upgrades),
// every reward offer { room, reward, pool, reason }, shop stock size + buys,
// Glint left, and the build at each Stag entry (filled / 32, rarity mix,
// grey+inert occupants, bench). Exit 1 when a level-3 room clear drops < 2
// spoils while the upgrade pool still had >= 2 commons/rares, or when any
// reward page is empty while a node could still fill or upgrade a socket.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const FROM = Number(opt('from', '1'));
const seedsArg = opt('seeds', '1-5');
const SEEDS = seedsArg.includes('-')
  ? (() => {
      const [a, b] = seedsArg.split('-').map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    })()
  : seedsArg.split(',').map(Number);
const ROOT = resolve(opt('root', here));
const OUT = opt('out', `captures/gntfixM4a4-supply-from${FROM}.json`);
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { NODES } = await import(u('src/sim/nodes.js'));

async function one(seed) {
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
  const run = world.runSystem();
  const ap = run.autopilot;
  const levels = {};
  const L = () => {
    const a = run.view().act;
    levels[a] ??= { spoils: [], offers: [], shop: null, buys: 0, grants: {}, stag: null, upgradesAutofilled: 0 };
    return levels[a];
  };
  const poolsNow = () => world.cmd('draftPools');
  bus.on('spoils_drop', (e) => {
    const p = poolsNow();
    L().spoils.push({ room: e.room, n: e.nodes.length, nodes: e.nodes, upgrades: e.upgrades ?? [], upPoolCR: p.upgrade.filter((id) => NODES[id].rarity !== 'legendary').length, fillCR: p.node.filter((id) => NODES[id].rarity !== 'legendary').length });
  });
  bus.on('reward_offer', (e) => {
    const p = poolsNow();
    L().offers.push({ room: e.room, reward: e.reward, id: e.id, pool: e.pool ?? 'fill', reason: e.reason ?? null, fillPool: p.node.length, upPool: p.upgrade.length });
  });
  bus.on('shop_open', (e) => {
    L().shop = { stock: e.stock.map((s) => `${s.node}:${s.price}`), wallet: e.wallet };
  });
  bus.on('shop_purchase', () => {
    L().buys += 1;
  });
  bus.on('node_granted', (e) => {
    const g = L().grants;
    g[e.provenance] = (g[e.provenance] ?? 0) + 1;
  });
  bus.on('build_autofill', (e) => {
    if (e.upgraded) L().upgradesAutofilled += e.upgraded;
  });
  bus.on('room_enter', (e) => {
    if (e.index !== 8) return;
    const b = world.buildSystem().view();
    const mix = { common: 0, rare: 0, legendary: 0, dead: 0 };
    for (const s of b.skills)
      for (const x of s.sockets) {
        if (!x) continue;
        mix[NODES[x.node].rarity] += 1;
        if (x.verdict !== 'live') mix.dead += 1;
      }
    L().stag = { filled: b.skills.reduce((a, s) => a + s.filled, 0), of: b.skills.length * 8, mix, bench: b.bench.length, wallet: run.view().wallet };
  });
  run.startCampaign({ level: FROM, challenge: 'standard', harness: true });
  ap.configure(true);
  let outcome = null;
  for (let i = 0; i < 240000; i++) {
    clock.stepOnce((t) => world.step(t, ap.intents(t, emptySnapshot())));
    const v = run.view();
    if (v.phase === 'victory' || v.phase === 'defeat') {
      outcome = v.phase;
      break;
    }
  }
  return { seed, outcome, levels };
}

const rows = [];
const problems = [];
for (const s of SEEDS) {
  const r = await one(s);
  rows.push(r);
  for (const [lv, d] of Object.entries(r.levels)) {
    const sp = d.spoils.map((x) => x.n).join('');
    const empties = d.offers.filter((o) => o.reward === null);
    console.log(
      `seed ${s} L${lv} ${r.outcome}: spoils/clear ${sp} (=${d.spoils.reduce((a, x) => a + x.n, 0)}, upgrades ${d.spoils.reduce((a, x) => a + x.upgrades.length, 0)}) offers ${d.offers.map((o) => (o.reward ? o.reward[0] + (o.pool === 'upgrade' ? '^' : '') : '0')).join('')} shop ${d.shop ? d.shop.stock.length : '-'} buys ${d.buys} grants ${JSON.stringify(d.grants)} autofill-upgrades ${d.upgradesAutofilled} stag ${d.stag ? `${d.stag.filled}/${d.stag.of} ${JSON.stringify(d.stag.mix)} bench ${d.stag.bench} glint ${d.stag.wallet}` : '-'}`
    );
    for (const x of d.spoils) if (x.n < 2 && x.upPoolCR + x.fillCR >= 2) problems.push({ seed: s, level: lv, room: x.room, spoils: x });
    for (const o of empties) if (o.fillPool + o.upPool > 0) problems.push({ seed: s, level: lv, room: o.room, emptyOfferWithPool: o });
  }
}
writeFileSync(OUT, JSON.stringify({ from: FROM, seeds: SEEDS, rows, problems }, null, 1));
console.log(`problems ${problems.length} -> ${OUT}`);
process.exit(problems.length ? 1 : 0);
