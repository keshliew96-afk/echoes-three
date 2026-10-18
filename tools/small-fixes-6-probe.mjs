#!/usr/bin/env node
// Small fixes 6 probe (v0.5.298), headless:
//
//   node tools/small-fixes-6-probe.mjs
//
//   rime     the Spire's slick floors wear their own 'rime' skin (frost's
//            grip, frost's slide hiss), its barricades the 'belfry' wall;
//            no other land's rooms change
//   raven    the Ash Raven's boss groove plays its lead on its own 'ashtoll'
//            instrument (before, it named a 'toll' the music engine never
//            had, so every lead note threw and the lead stayed silent)
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
globalThis.performance ??= { now: () => Date.now() };
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { LAYOUTS, LAYOUT_IDS, actOfLayout } = await import(u('src/data/layouts.js'));
const { SLIP_SKINS } = await import(u('src/sim/hazards.js'));
const { stateNotesJob, BOSS_MUSIC } = await import(u('src/audio/music.js'));

let failed = 0;
let passed = 0;
function check(leg, name, ok, detail = null) {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null && !ok ? ` ${JSON.stringify(detail)}` : ''}`);
  return !!ok;
}

function build(seed) {
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
  const step = () => clock.stepOnce((t) => world.step(t, emptySnapshot()));
  const run = () => world.runSystem();
  return { registry, world, step, run, cmd: (name, ...args) => world.cmd(name, ...args) };
}
const toCombat = (w) => {
  for (let i = 0; i < 4000 && w.run().view().phase !== 'combat'; i++) w.step();
};

// ---------------------------------------------------------------- rime --
{
  const skins = (type) => {
    const by = {};
    for (const id of LAYOUT_IDS) {
      for (const p of [...(LAYOUTS[id].hazards || []), ...(LAYOUTS[id].interactables || [])]) {
        if (p.type !== type) continue;
        const act = actOfLayout(id);
        (by[act] ??= new Set()).add(p.skin);
      }
    }
    return Object.fromEntries(Object.entries(by).map(([a, s]) => [a, [...s].sort().join()]));
  };
  const slips = skins('slip');
  const bars = skins('barricade');
  check('rime', `the Spire's slick floors are all rime (${slips[5]})`, slips[5] === 'rime', slips);
  check('rime', `the Spire's barricades are all belfry walls (${bars[5]})`, bars[5] === 'belfry', bars);
  check('rime', `the Barrow keeps its grave frost and cairns (${slips[3]} / ${bars[3]})`, slips[3] === 'frost' && bars[3] === 'cairn', { slips, bars });
  const others = Object.entries({ ...slips, ...bars }).filter(([a]) => a !== '5').some(([, s]) => /rime|belfry/.test(s));
  check('rime', 'no other land uses the new skins', !others, { slips, bars });
  check('rime', `rime keeps frost's grip (${SLIP_SKINS.rime?.grip} vs ${SLIP_SKINS.frost.grip})`, SLIP_SKINS.rime && SLIP_SKINS.rime.grip === SLIP_SKINS.frost.grip);
  const enc = readFileSync(join(here, 'src/audio/encountercues.js'), 'utf8');
  check('rime', "a slide on rime plays the frost hiss (sl_frost)", /rime:\s*'sl_frost'/.test(enc));
  // A Level V room in the sim: the slick floor spawns as rime with frost's
  // grip, the barricades as belfry walls.
  let slip = null;
  let bar = null;
  for (let seed = 1; seed <= 12 && !(slip && bar); seed++) {
    const w = build(seed);
    w.run().startCampaign({ level: 5, harness: true });
    toCombat(w);
    for (let n = 1; n <= 7 && !(slip && bar); n++) {
      if (n > 1) {
        w.cmd('skipToRoom', n);
        toCombat(w);
      }
      slip = slip || w.registry.all().find((e) => e.kind === 'hazard' && e.htype === 'slip') || null;
      bar = bar || w.registry.all().find((e) => e.kind === 'barricade') || null;
    }
  }
  check('rime', `a Level V room's slick floor spawns as rime (${slip && slip.skin}, grip ${slip && slip.grip})`, !!slip && slip.skin === 'rime' && slip.grip === SLIP_SKINS.frost.grip);
  check('rime', `a Level V room's barricade spawns as a belfry wall (${bar && bar.skin})`, !!bar && bar.skin === 'belfry');
}

// --------------------------------------------------------------- raven --
{
  const calls = {};
  const mk = (name) => (d, t) => {
    calls[name] = (calls[name] || 0) + 1;
    return t + 0.5;
  };
  const kit = { bell: mk('bell'), tone: mk('tone'), noise: mk('noise'), pluck: mk('pluck'), pad: mk('pad') };
  const notes = (boss, theme) => {
    const keys = [];
    let throws = 0;
    const job = stateNotesJob('boss', theme, kit, (key, build) => {
      keys.push(key);
      try {
        build(kit, 0, null);
      } catch {
        throws += 1;
      }
    }, boss);
    while (!job(Infinity));
    return { keys, throws };
  };
  check('raven', `the Ash Raven's groove names its own lead (${BOSS_MUSIC.ashraven.lead})`, BOSS_MUSIC.ashraven.lead === 'ashtoll');
  const r = notes('ashraven', 'barrow');
  const lead = r.keys.filter((k) => k.startsWith('n:ashtoll:'));
  check('raven', `its lead plays: ${lead.length} lead notes a cycle, ${r.throws} throw`, lead.length > 0 && r.throws === 0);
  // Every other boss groove's notes build as before (the Hourwarden's
  // 'toll' lead is left as it was; see the PR's open choices).
  const bad = [];
  for (const [kind, v] of Object.entries(BOSS_MUSIC)) {
    if (kind === 'ashraven' || kind === 'hourwarden') continue;
    const x = notes(kind, v.theme);
    if (x.throws) bad.push(`${kind} ${x.throws}`);
  }
  check('raven', `no other boss groove throws (${bad.join(', ') || 'none'})`, bad.length === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
