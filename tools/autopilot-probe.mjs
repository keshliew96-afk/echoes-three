#!/usr/bin/env node
// AUTOPILOT AND ENDLESS probe (docs/AUTOPILOT.md) — headless Node, the sim
// built like src/main.js, Level I of a campaign run.
//
//   node tools/autopilot-probe.mjs [--out captures/autopilot-probe.json]
//
// Legs:
//   heal    the plain bot presses a heal only when it reaches someone hurt,
//           and keeps shooting while an ally is hurt and nothing reaches them
//           (it used to hold its fire whenever any ally was under 70%).
//   revive  alone with the party down it starts a revive from 35% HP (it
//           used to wait for 60%); the leader seat keeps the old floor.
//   seats   in a campaign boss fight the AI seats step out of the boss's
//           charge lane (the Thornmother) and slam ring (the Stag) before
//           they land.
//   replay  a carried Level I replays to the same event hash twice.
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));

const argv = process.argv.slice(2);
const OUT = (() => {
  const i = argv.indexOf('--out');
  return i >= 0 ? argv[i + 1] : 'captures/autopilot-probe.json';
})();

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
  const run = world.runSystem();
  const ap = run.autopilot;
  return { world, registry, bus, clock, run, ap };
}

const results = [];
const check = (leg, name, ok, info = null) => {
  results.push({ leg, name, ok: !!ok, info });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${info ? ' ' + JSON.stringify(info) : ''}`);
};
const stepIdle = (W, n) => {
  for (let i = 0; i < n; i++) W.clock.stepOnce((t) => W.world.step(t, emptySnapshot()));
};
const stepAp = (W, n, each = null) => {
  for (let i = 0; i < n; i++) {
    W.clock.stepOnce((t) => {
      const s = W.ap.intents(t, emptySnapshot());
      if (each) each(t, s);
      W.world.step(t, s);
    });
  }
};
const allies = (W) => W.registry.all().filter((e) => e.kind === 'ally').sort((a, b) => a.partyIndex - b.partyIndex);
const player = (W) => W.registry.all().find((e) => e.partyIndex === 0);

// A live Level I room 1 with its own enemies gone and the party parked.
function stage(seed = 3, cfg = true) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 1, harness: true });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) stepIdle(W, 1);
  stepIdle(W, 30);
  W.world.cmd('killAllEnemies');
  W.ap.configure(cfg);
  W.world.cmd('teleport', 0, 0);
  allies(W).forEach((a, i) => W.world.cmd('placeAlly', a.partyIndex, -1 + i, 0.8));
  return W;
}
const slotOf = (W, id) => player(W).skills.indexOf(id);
const pressedSlot = (s, i) => s.presses.some((p) => p.slot === i);

// ---------------------------------------------------------------- heal --
{
  const W = stage(3);
  W.world.cmd('giveSkill', 'nova_bloom');
  const nb = slotOf(W, 'nova_bloom');
  const foe = W.registry.byId(W.world.cmd('spawn', 'boar', 0, -3.5, { hpMul: 30 }));
  const archer = allies(W).find((a) => a.partyIndex === 3);
  W.world.cmd('placeAlly', 3, 4.2, 0);
  W.world.cmd('setHp', archer.id, 0.4);
  let s = W.ap.advise(W.clock.tick);
  check('heal', 'an ally under 70% out of Nova Bloom\'s 1.4 u: the bloom is held and the bot shoots the foe', nb >= 0 && !pressedSlot(s, nb) && s.basicAttackHeld === true && s.aim && Math.abs(s.aim.x - foe.x) < 0.01, { slot: nb, presses: s.presses, basic: s.basicAttackHeld });
  W.world.cmd('placeAlly', 3, 1.0, 0);
  s = W.ap.advise(W.clock.tick);
  check('heal', 'the same ally inside 1.4 u: Nova Bloom goes out', pressedSlot(s, nb), { presses: s.presses });

  W.world.cmd('giveSkill', 'mending_bolt');
  const mb = slotOf(W, 'mending_bolt');
  W.world.cmd('placeAlly', 3, 3.0, 0);
  s = W.ap.advise(W.clock.tick);
  check('heal', 'Mending Bolt (5 u) reaches the ally at 3 u: it takes the aim and the bolt goes out', mb >= 0 && pressedSlot(s, mb) && s.aim && Math.abs(s.aim.x - archer.x) < 0.01 && !s.basicAttackHeld, { presses: s.presses, aim: s.aim });
  W.world.cmd('placeAlly', 3, 6.5, 0);
  s = W.ap.advise(W.clock.tick);
  check('heal', 'out of the bolt\'s reach too: no heal, the aim and the basic go back to the foe', !pressedSlot(s, mb) && !pressedSlot(s, nb) && s.basicAttackHeld === true && Math.abs(s.aim.x - foe.x) < 0.01, { presses: s.presses });

  // The leader seat keeps its rule: an ally under 90% takes the aim.
  W.ap.configure({ leader: true, pages: false });
  s = W.ap.advise(W.clock.tick);
  check('heal', 'the leader seat (AI Healer under a human) is unchanged: it still aims the hurt ally', s.aim && Math.abs(s.aim.x - archer.x) < 0.01, { aim: s.aim });

  // Over a whole carried Level I: the bot fires while allies are hurt, and no
  // nova heal goes out with nobody hurt inside it.
  const R = makeWorld(5);
  R.run.startCampaign({ level: 1, harness: true });
  R.ap.configure(true);
  let hurtTicks = 0;
  let firedHurt = 0;
  let wastedNova = 0;
  for (let i = 0; i < 60000; i++) {
    const v = R.run.view();
    if (v.phase === 'victory' || v.phase === 'defeat' || v.phase === 'transit' || (v.act ?? 1) !== 1) break;
    R.clock.stepOnce((t) => {
      const s2 = R.ap.intents(t, emptySnapshot());
      const p = player(R);
      if (R.run.view().phase === 'combat' && p && p.hp > 0) {
        const hurtAlly = allies(R).some((a) => a.hp > 0 && a.hp / a.maxHp < 0.7);
        if (hurtAlly) {
          hurtTicks += 1;
          if (s2.basicAttackHeld) firedHurt += 1;
        }
        for (const pr of s2.presses) {
          const id = p.skills[pr.slot];
          if (id !== 'nova_bloom' && id !== 'hearthsong') continue;
          const area = id === 'nova_bloom' ? 1.4 : 2.0;
          const any = R.registry.all().some((m) => m.partyIndex !== undefined && m.hp > 0 && m.hp / m.maxHp < 0.7 && Math.hypot(m.x - p.x, m.z - p.z) <= area);
          if (!any) wastedNova += 1;
        }
      }
      R.world.step(t, s2);
    });
  }
  check('heal', 'a carried Level I (seed 5): the bot keeps shooting on ticks an ally is hurt', hurtTicks > 0 && firedHurt > hurtTicks * 0.2, { hurtTicks, firedHurt });
  check('heal', 'and no nova heal goes out with nobody hurt inside it', wastedNova === 0, { wastedNova });
}

// -------------------------------------------------------------- revive --
{
  // A foe stands by the bodies (inside the 2 u a calm revive wants clear),
  // so only the lone-Healer rule lets the bot channel.
  const W = stage(4);
  for (const a of allies(W)) W.world.cmd('setHp', a.id, 0);
  W.world.cmd('spawn', 'boar', 0, 2.4, { hpMul: 30, dmgMul: 0.01 });
  stepIdle(W, 30);
  const p = player(W);
  p.hp = p.maxHp * 0.45;
  let s = W.ap.advise(W.clock.tick);
  const body = allies(W).reduce((b, a) => (!b || Math.hypot(a.x - p.x, a.z - p.z) < Math.hypot(b.x - p.x, b.z - p.z) ? a : b), null);
  const bl = Math.hypot(body.x - p.x, body.z - p.z) || 1;
  const moving = !!s.move && (s.move.x * (body.x - p.x) + s.move.z * (body.z - p.z)) / bl > 0.5;
  const threat = Math.min(...allies(W).map((a) => Math.min(...W.registry.all().filter((e) => e.faction === 'hostile' && e.hp > 0).map((e) => Math.hypot(e.x - a.x, e.z - a.z)))));
  check('revive', 'party down, a foe by the bodies, the Healer alone at 45%: it goes for a body', allies(W).every((a) => !(a.hp > 0)) && threat <= 2.0 && (s.reviveHeld || moving), { reviveHeld: s.reviveHeld, move: s.move, threat: Math.round(threat * 100) / 100 });
  stepAp(W, 40);
  check('revive', 'and starts the channel', p.reviveTargetId != null, { reviveTargetId: p.reviveTargetId, hp: Math.round(p.hp) });
  p.hp = p.maxHp * 0.3;
  stepAp(W, 30);
  check('revive', 'it holds the channel at 30% HP (the floor is 20%)', p.reviveTargetId != null, { hp: Math.round(p.hp) });
  const L = stage(4, { leader: true, pages: false });
  for (const a of allies(L)) L.world.cmd('setHp', a.id, 0);
  L.world.cmd('spawn', 'boar', 0, 2.4, { hpMul: 30, dmgMul: 0.01 });
  stepIdle(L, 30);
  const q = player(L);
  q.hp = q.maxHp * 0.45;
  s = L.ap.advise(L.clock.tick);
  stepAp(L, 40);
  check('revive', 'the leader seat keeps its 60% start (no channel at 45%)', q.reviveTargetId == null, { reviveTargetId: q.reviveTargetId });
}

// --------------------------------------------------------------- seats --
// A Level I boss room on the carried bot; for every boss telegraph, which
// AI seats stood in it when it started and which still do one tick before it
// lands.
function bossFight(kind, seed, ticks, shape) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 1, harness: true });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) stepIdle(W, 1);
  W.world.cmd('bossPick', kind);
  W.world.cmd('skipToRoom', 8);
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) stepIdle(W, 1);
  W.ap.configure(true);
  const inside = (a, t, b) => {
    if (shape === 'lane') {
      const px = a.x - t.fromX;
      const pz = a.z - t.fromZ;
      const along = px * t.dirX + pz * t.dirZ;
      if (along < -a.radius || along > t.length + a.radius) return false;
      return Math.abs(px * t.dirZ - pz * t.dirX) < t.width / 2 + a.radius;
    }
    return Math.hypot(a.x - (t.x ?? b.x), a.z - (t.z ?? b.z)) < t.radius + a.radius;
  };
  const seen = new Map();
  let started = 0;
  let caughtAtStart = 0;
  let caughtAtEnd = 0;
  stepAp(W, ticks, (tick) => {
    for (const p of W.registry.all()) if (p.partyIndex !== undefined && p.hp > 0 && p.hp < p.maxHp * 0.5) p.hp = p.maxHp; // keep the fight going
    const b = W.registry.all().find((e) => e.boss === true || e.kind === 'stag');
    const t = b && b.telegraph;
    if (!t || (t.kind ?? 'ring') !== shape || (shape === 'ring' && !Number.isFinite(t.radius))) return;
    const key = t.startTick ?? t.resolveTick;
    const seats = allies(W).filter((a) => a.hp > 0);
    if (!seen.has(key)) {
      started += 1;
      const ids = seats.filter((a) => inside(a, t, b)).map((a) => a.id);
      seen.set(key, ids);
      caughtAtStart += ids.length;
    }
    if (t.resolveTick === tick + 1) caughtAtEnd += seats.filter((a) => seen.get(key).includes(a.id) && inside(a, t, b)).length;
  });
  return { started, caughtAtStart, caughtAtEnd };
}
{
  const lane = [1, 2, 3].map((s) => bossFight('thornmother', s, 2400, 'lane')).reduce((a, r) => ({ started: a.started + r.started, caughtAtStart: a.caughtAtStart + r.caughtAtStart, caughtAtEnd: a.caughtAtEnd + r.caughtAtEnd }), { started: 0, caughtAtStart: 0, caughtAtEnd: 0 });
  check('seats', 'the Thornmother\'s Briar Charge: seats standing in the lane at the warning mostly leave it before she charges', lane.started > 0 && lane.caughtAtStart > 0 && lane.caughtAtEnd <= lane.caughtAtStart * 0.25, lane);
  const ring = [1, 2, 3].map((s) => bossFight('stag', s, 2400, 'ring')).reduce((a, r) => ({ started: a.started + r.started, caughtAtStart: a.caughtAtStart + r.caughtAtStart, caughtAtEnd: a.caughtAtEnd + r.caughtAtEnd }), { started: 0, caughtAtStart: 0, caughtAtEnd: 0 });
  // The quake is 1.6 u around its target with a 0.7 s warning: a seat near
  // the centre walks out of only part of it (2.1 to 2.65 u/s, no dodge), so
  // the bar is lower than the charge's.
  check('seats', 'the Stag\'s Antler Quake: at least two in five seats standing in the ring at the warning leave it before it lands', ring.started > 0 && ring.caughtAtStart > 0 && ring.caughtAtEnd <= ring.caughtAtStart * 0.6, ring);
}

// -------------------------------------------------------------- replay --
{
  const hashOf = (seed) => {
    const W = makeWorld(seed);
    let h = 0;
    for (const t of ['room_enter', 'room_cleared', 'downed', 'level_clear', 'run_end', 'skill_cast']) W.bus.on(t, (e) => {
      const str = `${t}:${e.tick}:${e.index ?? e.skill ?? e.id ?? ''}`;
      for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
    });
    W.run.startCampaign({ level: 1, harness: true });
    W.ap.configure(true);
    stepAp(W, 12000);
    return h.toString(16);
  };
  const a = hashOf(7);
  const b = hashOf(7);
  check('replay', 'a carried Level I (seed 7, 12000 ticks) replays to the same hash', a === b, { a, b });
}

const ok = results.filter((r) => r.ok).length;
console.log(`\n${ok}/${results.length} checks pass -> ${OUT}`);
mkdirSync(dirname(join(here, OUT)), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify({ results }, null, 1));
process.exit(ok === results.length ? 0 : 1);
