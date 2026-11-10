#!/usr/bin/env node
// ONE CAST PATH probe (AUDIT D2, docs/CODE_HEALTH.md "One cast path") —
// headless Node, the sim built like src/main.js.
//
//   node tools/one-cast-path-probe.mjs
//
// Checks:
//   1. Source: no `azone` body kind, no `azone_*` event and no `ally_cast`
//      event is left in src/ (the audio cue ids `azone_pulse`, `azone_spawn`
//      and `ally_cast_*` are sound names, not events, and stay).
//   2. One zone system: a Healer zone and an ally zone are both kind `zone`,
//      both tick in sim/zones.js; the ally one's spawn, tick and expire carry
//      its classId, the Healer's carry none; each keeps its kit's hit rule.
//   3. One cast event: the legacy run's casts are all `skill_cast`; the ally
//      seats' carry their classId and seat, the Healer's carry none.
//   4. The view lists every zone once, under `zones`.
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { scriptedInput } = await import(u('src/sim/script.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { SKILL_SLOTS } = await import(u('src/core/constants.js'));
const { ZONE_CADENCE_TICKS } = await import(u('src/sim/zones.js'));

let pass = 0;
let fail = 0;
function check(ok, label) {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
}

function makeWorld(seed, room = null, harness = true) {
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
  const world = createWorld({ rng, registry, events: bus, harness, requestHitstop: clock.requestHitstop, room });
  const log = [];
  bus.on('*', (e) => {
    if (e.type !== 'sound') log.push(e);
  });
  const step = (n = 1, input = () => emptySnapshot()) => {
    for (let i = 0; i < n; i++) clock.advance(1000 / 60, (tick) => world.step(tick, input(tick)));
  };
  return { world, registry, bus, log, step };
}

// 1. Source
{
  const files = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|mjs)$/.test(f)) files.push(p);
    }
  };
  walk(join(here, 'src'));
  const hits = [];
  for (const p of files) {
    const s = readFileSync(p, 'utf8');
    for (const m of s.matchAll(/'(azone(?:_[a-z]+)?|ally_cast)'/g)) {
      const name = m[1];
      if (name === 'azone_pulse') continue; // the ally zone's pulse sound
      if (name === 'azone_spawn' && /audio\//.test(p)) continue; // the ally zone's placement sound
      if (name === 'ally_cast' && /withWhoosh\('ally_cast'/.test(s.slice(m.index - 20, m.index + 20))) continue; // the whoosh's cast kind
      hits.push(`${p.slice(here.length + 1)}: ${name}`);
    }
  }
  check(hits.length === 0, `no azone kind, azone event or ally_cast event left in src (${hits.slice(0, 4).join('; ') || 'none'})`);
  const net = readFileSync(join(here, 'src/net/protocol/evshapes.js'), 'utf8');
  check(!/'azone_|'ally_cast\|/.test(net), 'the wire shapes name zone_* and skill_cast only');
}

// 2. One zone system
{
  const W = makeWorld(7, 'kill_all');
  W.step(2);
  // Clear the room's own foes so only ours stand in the zones.
  for (const e of W.registry.all()) if (e.faction === 'hostile') W.registry.despawn(e.id);
  const dummy = W.registry.byId(W.world.cmd('spawn', 'dummy', 4, 0));
  const hero = W.registry.all().find((e) => e.partyIndex === 0);
  dummy.hp = dummy.maxHp = 1000; // stands through both ticks
  const now = W.world.snapshotState().tick;
  const ally = W.registry.spawn({ kind: 'zone', skill: 'ground_crack', classId: 'tank', x: dummy.x, z: dummy.z, px: dummy.x, pz: dummy.z, radius: 1.5, power: 5, sourceId: hero.id, ticksDone: 0, totalTicks: 2, nextTickTick: now + ZONE_CADENCE_TICKS });
  hero.hp = Math.max(1, hero.maxHp - 30);
  const heal = W.registry.spawn({ kind: 'zone', skill: 'sanctuary', x: hero.x, z: hero.z, px: hero.x, pz: hero.z, radius: 1.5, power: 4, sourceId: hero.id, ticksDone: 0, totalTicks: 2, nextTickTick: now + ZONE_CADENCE_TICKS });
  const view = W.world.snapshotState();
  const vz = view && Array.isArray(view.zones) ? view.zones : [];
  check(vz.some((z) => z.id === ally.id && z.classId === 'tank') && vz.some((z) => z.id === heal.id && !z.classId) && !('azones' in (view || {})), `the view lists both zones under zones, the ally's with its classId (${vz.length} listed)`);
  const hp0 = dummy.hp;
  const heroHp0 = hero.hp;
  W.step(ZONE_CADENCE_TICKS * 2 + 2);
  const ticks = W.log.filter((e) => e.type === 'zone_tick');
  const at = ticks.filter((e) => e.id === ally.id);
  const ht = ticks.filter((e) => e.id === heal.id);
  check(at.length === 2 && at.every((e) => e.classId === 'tank' && Array.isArray(e.hit)), `the ally zone ticks twice as zone_tick with its classId (${at.length})`);
  check(dummy.hp < hp0 && at.some((e) => e.hit.includes(dummy.id)), `the ally zone hits the body inside it (${hp0} -> ${dummy.hp})`);
  check(ht.length === 2 && ht.every((e) => !('classId' in e) && Array.isArray(e.healed)), `the Healer zone ticks twice with no classId and heals (${ht.length})`);
  check(hero.hp > heroHp0, `the Healer zone heals the seat inside it (${heroHp0} -> ${hero.hp})`);
  const ex = W.log.filter((e) => e.type === 'zone_expire');
  check(ex.some((e) => e.id === ally.id && e.classId === 'tank') && ex.some((e) => e.id === heal.id && !('classId' in e)), 'both expire as zone_expire, the ally one with its classId');
  check(!W.registry.byId(ally.id) && !W.registry.byId(heal.id), 'both are gone after their last tick');
}

// 3. One cast event, on the legacy run the goldens use
{
  const W = makeWorld(2, null, false);
  const run = W.world.runSystem();
  run.startRun();
  for (let i = 0; i < 3600; i++)
    W.step(1, (tick) => {
      if (tick % 240 === 0) {
        W.world.cmd('killAllEnemies');
        const r = run.view();
        if (r.phase === 'reward') run.takeReward();
        if (r.phase === 'path') W.world.cmd('pathChoose', 0);
        if (r.phase === 'shop') W.world.cmd('shopAdvance');
      }
      return scriptedInput(3, tick, { skillSlots: SKILL_SLOTS });
    });
  const casts = W.log.filter((e) => e.type === 'skill_cast');
  const allyC = casts.filter((e) => e.classId);
  const healC = casts.filter((e) => !e.classId);
  check(!W.log.some((e) => e.type === 'ally_cast' || /^azone_/.test(e.type)), 'the run emits no ally_cast and no azone event');
  check(healC.length > 0 && healC.every((e) => !('partyIndex' in e)), `the Healer's casts carry no classId (${healC.length})`);
  check(allyC.length > 0 && allyC.every((e) => Number.isInteger(e.partyIndex) && e.partyIndex > 0), `the ally seats' casts carry their classId and seat (${allyC.length})`);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
