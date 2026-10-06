#!/usr/bin/env node
// RELICS slice 2 probe (docs/RELICS.md "Slice 2"), headless:
//
//   node tools/relics2-probe.mjs
//
//   1. Ash Feather: a dodge with the relic re-arms in 75% of the ticks.
//   2. Spore Sac: a party kill on a Rotcap leaves no spore burst, puffs a
//      slowing spore ring; without the relic the burst fires.
//   3. Short Fuse: a cursed room's telegraphs run 20% shorter, never under
//      0.6 s (a Barrow Knight's 66-tick slam -> 53).
//   4. Major curses: a forced major door is marked major, binds the run
//      (its numbers in every later combat room, across a level clear) and its
//      room pays a greater pick (no commons).
//   5. Elite drops: an elite kill drops a relic (forced roll), a second elite
//      in the same level drops nothing; seeds 1-8 drop at most one a level.
//   6. The relic shelf: two relics at the room-7 peddler, priced by rarity,
//      bought from the Healer's wallet or an ally's purse, denied when short,
//      saved and restored, and the same seed rolls the same shelf.
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
const { difficulty } = await import(u('src/data/difficulty.js'));
const { RELICS, CURSES, RELIC_RULES } = await import(u('src/sim/relics.js'));

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
  for (const t of ['relic_offer', 'relic_gain', 'relic_proc', 'relic_drop', 'relic_shelf', 'relic_purchase', 'relic_denied', 'curse_taken', 'curse_apply', 'curse_lift', 'path_offer', 'level_clear', 'room_enter', 'rotcap_burst', 'hazard_smothered', 'telegraph_start', 'death'])
    bus.on(t, (e) => log.push({ ...e, type: t }));
  const run = world.runSystem();
  const step = (ap, snap = null) => clock.stepOnce((t) => world.step(t, snap ?? (ap ? ap.intents(t, emptySnapshot()) : emptySnapshot())));
  return { world, registry, bus, clock, run, log, step };
}

const fails = [];
const passes = [];
const check = (ok, what) => {
  (ok ? passes : fails).push(what);
  return ok;
};

// A campaign standing in live combat in room 1 with its waves cleared.
function combatRoom(seed, level = 1) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level, harness: true });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step(null);
  for (let i = 0; i < 60; i++) W.step(null);
  W.world.cmd('killAllEnemies');
  for (let i = 0; i < 5; i++) W.step(null);
  W.log.length = 0;
  return W;
}

// ------------------------------------------------------------ 1. Ash Feather --
{
  const cdFor = (grant) => {
    const W = combatRoom(11);
    if (grant) W.run.cmd('relicGrant', ['ash_feather']);
    const p = W.world.player;
    const snap = emptySnapshot();
    snap.move = { x: 1, z: 0 };
    snap.presses = [{ kind: 'dodge' }];
    let t0 = null;
    W.bus.on('intent', (e) => {
      if (e.kind === 'dodge' && t0 === null) t0 = e.tick;
    });
    W.step(null, snap);
    return t0 === null ? null : p.dodgeReadyTick - t0;
  };
  const base = cdFor(false);
  const feather = cdFor(true);
  check(base === 72 && feather === Math.round(72 * (1 + RELICS.ash_feather.dodgeCd)), `Ash Feather: dodge re-arms in ${feather} ticks (plain ${base})`);
}

// -------------------------------------------------------------- 2. Spore Sac --
{
  const trial = (grant) => {
    const W = combatRoom(12, 2);
    if (grant) W.run.cmd('relicGrant', ['spore_sac']);
    const p = W.world.player;
    const cap = W.world.cmd('spawn', 'rotcap', p.x + 3, p.z);
    const boar = W.world.cmd('spawn', 'boar', p.x + 3.8, p.z + 0.4);
    W.step(null);
    const c = W.registry.byId(typeof cap === 'object' ? cap.id : cap);
    const b = W.registry.byId(typeof boar === 'object' ? boar.id : boar);
    W.world.cmd('setHp', c.id, 0.001);
    W.run.cmd('keenProbe', [c.id, -1]);
    for (let i = 0; i < 70; i++) W.step(null);
    return {
      burst: W.log.some((e) => e.type === 'rotcap_burst'),
      smothered: W.log.some((e) => e.type === 'hazard_smothered'),
      puff: W.log.find((e) => e.type === 'relic_proc' && e.relic === 'spore_sac'),
      slowed: !!(b && b.status && b.status.slow),
    };
  };
  const off = trial(false);
  const on = trial(true);
  check(off.burst && !off.smothered, `Spore Sac off: a Rotcap kill bursts (burst ${off.burst})`);
  check(!on.burst && on.smothered, `Spore Sac on: no burst, smothered (burst ${on.burst}, smothered ${on.smothered})`);
  check(!!on.puff && on.puff.slowed >= 1 && on.slowed, `Spore Sac on: the kill puff slows the boar beside it (slowed ${on.puff ? on.puff.slowed : 0})`);
}

// ------------------------------------------------------------- 3. Short Fuse --
{
  const slam = (curse) => {
    const W = combatRoom(13, 3);
    if (curse) W.run.cmd('relicCurseHere', ['short_fuse']);
    const p = W.world.player;
    // A tough knight, so the party cannot kill it before it winds up.
    W.world.cmd('spawn', 'knight', p.x + 1.6, p.z, { hpMul: 40 });
    for (let i = 0; i < 2400; i++) {
      W.step(null);
      const t = W.log.find((e) => e.type === 'telegraph_start' && e.etype === 'knight');
      if (t) return t.resolveTick - t.tick;
    }
    return null;
  };
  const plain = slam(false);
  const fused = slam(true);
  const want = Math.max(CURSES.short_fuse.fuse.minTicks, Math.round(66 * CURSES.short_fuse.fuse.mul));
  check(plain === 66 && fused === want, `Short Fuse: the Barrow Knight's slam telegraph ${plain} -> ${fused} ticks (want ${want})`);
}

// --------------------------------------------------------- 4. Major curses --
{
  const W = makeWorld(21);
  const { run, step, log } = W;
  const ap = run.autopilot;
  run.startCampaign({ level: 1, harness: true });
  run.cmd('relicDoor', ['thick_hide', 0]);
  ap.configure({ curses: 'all' }); // the default bot steps around a major curse
  let plans = [];
  let lv2 = false;
  let lastKey = '';
  for (let i = 0; i < 240000; i++) {
    step(ap);
    const v = run.view();
    const key = `${v.act}:${v.room}:${v.phase}`;
    if (v.phase === 'combat' && key !== lastKey && (v.mode === 'kill_all' || v.mode === 'defend' || run.roomPlan().hpMul)) {
      const plan = run.roomPlan();
      if (plan && plan.hpMul) plans.push({ act: v.act, room: v.room, hpMul: plan.hpMul, want: difficulty(v.act, Math.min(6, v.room), v.challenge).hpMul });
    }
    lastKey = key;
    if (log.some((e) => e.type === 'level_clear')) lv2 = true;
    if (lv2 && plans.some((p) => p.act !== 1)) break;
    if (v.phase === 'victory' || v.phase === 'defeat') break;
  }
  const offer = log.find((e) => e.type === 'path_offer');
  check(!!offer && offer.options[0].curse === 'thick_hide' && offer.options[0].major === true, 'major: the forced door is marked major');
  const taken = log.find((e) => e.type === 'curse_taken' && e.curse === 'thick_hide');
  check(!!taken && taken.major, 'major: walking through binds the curse');
  const pick = log.find((e) => e.type === 'relic_offer' && e.source === 'major');
  check(!!pick && pick.choices.every((id) => RELICS[id].rarity !== 'common'), `major: its room pays a greater pick (${pick ? pick.choices.join(', ') : 'none'})`);
  const later = plans.filter((p) => p.act > 1 || p.room >= 2);
  // Other curses can stack on top, so the major's factor is a lower bound.
  const bad = later.filter((p) => !(p.hpMul >= p.want * CURSES.thick_hide.diff.hpMul - 0.006));
  if (bad.length) console.log('thick_hide misses:', JSON.stringify(bad), JSON.stringify(plans));
  check(later.length >= 3 && later.every((p) => p.hpMul >= p.want * CURSES.thick_hide.diff.hpMul - 0.006), `major: Thick Hide holds in every later combat room (${later.length} rooms${later.length ? `, act ${later[later.length - 1].act}` : ''})`);
  check(later.some((p) => p.act > 1), 'major: the curse rides across a level clear');
  check(JSON.stringify(run.view().relics.majors.map((m) => m.id)).includes('thick_hide'), 'major: the view lists it under majors');
}

// ----------------------------------------------------------- 5. Elite drops --
{
  const W = combatRoom(31, 3);
  const { run, world, log } = W;
  const p = world.player;
  run.cmd('relicDropNext');
  const kill = () => {
    const k = world.cmd('spawn', 'knight', p.x + 2, p.z);
    W.step(null);
    const e = W.registry.byId(typeof k === 'object' ? k.id : k);
    world.cmd('setHp', e.id, 0.001);
    run.cmd('keenProbe', [e.id, -1]);
    for (let i = 0; i < 5; i++) W.step(null);
  };
  kill();
  const drop = log.find((e) => e.type === 'relic_drop');
  const gain = log.find((e) => e.type === 'relic_gain' && e.source === 'elite');
  check(!!drop && !!gain && drop.relic === gain.relic && run.view().relics.owned.some((o) => o.id === drop.relic), `elite: a forced drop grants ${drop ? drop.relic : 'nothing'}`);
  for (let k = 0; k < 6; k++) kill();
  check(log.filter((e) => e.type === 'relic_drop').length === 1, 'elite: no second drop in the same level');
}
{
  // Natural rate over whole campaigns (autopilot).
  const per = [];
  for (let seed = 1; seed <= 8; seed++) {
    const W = makeWorld(seed);
    W.run.startCampaign({ level: 1, harness: true });
    W.run.autopilot.configure(true);
    for (let i = 0; i < 240000; i++) {
      W.step(W.run.autopilot);
      const ph = W.run.view().phase;
      if (ph === 'victory' || ph === 'defeat') break;
    }
    const drops = W.log.filter((e) => e.type === 'relic_drop');
    const levelOf = [];
    let lvl = 1;
    for (const e of W.log) {
      if (e.type === 'level_clear') lvl += 1;
      if (e.type === 'relic_drop') levelOf.push(lvl);
    }
    per.push({ seed, drops: drops.length, ok: new Set(levelOf).size === levelOf.length });
  }
  check(per.every((r) => r.ok), 'elite: never two drops in one level (seeds 1-8)');
  const total = per.reduce((s, r) => s + r.drops, 0);
  check(total >= 2, `elite: drops happen in real campaigns (${total} over 8 campaigns: ${per.map((r) => r.drops).join(' ')})`);
  console.log(`elite drops per campaign, seeds 1-8: ${per.map((r) => r.drops).join(' ')}`);
}

// --------------------------------------------------------- 6. Relic shelf --
function toShop(seed) {
  const W = makeWorld(seed);
  const { run, step } = W;
  const ap = run.autopilot;
  run.startCampaign({ level: 1, harness: true });
  ap.configure(true);
  for (let i = 0; i < 240000; i++) {
    const v = run.view();
    if (v.phase === 'shop') break;
    if (v.phase === 'victory' || v.phase === 'defeat') return null;
    step(ap);
  }
  ap.configure(false);
  return W;
}
{
  const W = toShop(41);
  if (check(!!W, 'shelf: reached the room-7 peddler')) {
    const { run, world } = W;
    const sh = run.view().relics.shelf;
    const owned = run.view().relics.owned.map((o) => o.id);
    check(Array.isArray(sh) && sh.length === RELIC_RULES.shelfSize && new Set(sh.map((s) => s.id)).size === sh.length && sh.every((s) => !owned.includes(s.id)), `shelf: ${sh ? sh.map((s) => `${s.id} ${s.price}`).join(', ') : 'none'}`);
    check(sh.every((s) => s.price === RELIC_RULES.shelfPrice[s.rarity]), 'shelf: priced by rarity');
    // Save on the shelf, restore, same shelf.
    const snap = JSON.parse(JSON.stringify(world.saveState()));
    run.cmd('wallet', [0]);
    const denied = run.buyRelic(0, 0);
    check(!!denied && denied.denied === 'insufficient_funds' && W.log.some((e) => e.type === 'relic_denied'), 'shelf: an empty wallet is denied');
    run.cmd('wallet', [200]);
    const got = run.buyRelic(0, 0);
    check(!!got && got.relic === sh[0].id && run.cmd('wallet', []) === 200 - sh[0].price, `shelf: the Healer buys ${got ? got.relic : '-'} for ${sh[0].price}`);
    check(run.view().relics.owned.some((o) => o.id === sh[0].id) && run.view().relics.shelf[0].sold, 'shelf: the relic joins the party and the slot shows taken');
    check(run.buyRelic(0, 0) === null, 'shelf: a sold slot cannot be bought twice');
    const P = world.partySystem ? world.partySystem() : null;
    if (P) {
      P.setPurse(2, 100);
      const g2 = run.buyRelic(2, 1);
      check(!!g2 && P.purse(2) === 100 - sh[1].price, `shelf: the Swordsman buys ${g2 ? g2.relic : '-'} from its own purse (${P.purse(2)} left)`);
    }
    world.loadState(JSON.parse(JSON.stringify(snap)));
    check(JSON.stringify(run.view().relics.shelf) === JSON.stringify(sh), 'shelf: a save on the peddler restores the same shelf');
  }
  const A = toShop(41);
  const B = toShop(41);
  check(!!A && !!B && JSON.stringify(A.run.view().relics.shelf) === JSON.stringify(B.run.view().relics.shelf), 'shelf: the same seed rolls the same shelf');
}

for (const p of passes) console.log(`  ok  ${p}`);
if (fails.length) {
  console.log(`\nFAIL (${fails.length})`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`\nPASS relics slice 2 probe (${passes.length} checks)`);
