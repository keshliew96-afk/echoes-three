#!/usr/bin/env node
// Plan 3 slice 8 (CONTENT_PLAN_3.md, 8 "New layouts"): layouts 21-28, two
// per act, one of each pair the act's open arena. Headless.
//
//   register  every new id is in LAYOUTS / LAYOUT_IDS, has a biome dressing
//             (env/biomes), sits in its act's campaign `layouts` table and
//             never in `legacyLayouts` (so the goldens never roll it); each
//             act has exactly one arena; every name is in the catalogue and
//             translated in all nine locales
//   arena     real campaign runs (autopilot, seeds 1..N per level): every
//             champion and Hold room stands in the act's arena unless the
//             combat room before it already did; each level shows at least
//             one champion or Hold room
//   rolled    every new layout is rolled in some ordinary combat room
//
//   node tools/new-layouts-probe.mjs [--seeds 16]   exit 1 on any failure
// (Per-layout play checks: node tools/slice2-layouts.mjs --ids 21,...,28.)
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const argv = process.argv.slice(2);
const SEEDS = argv.includes('--seeds') ? Number(argv[argv.indexOf('--seeds') + 1]) : 16;

const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { LAYOUTS, LAYOUT_IDS, arenaOf } = await import(u('src/data/layouts.js'));
const { LEVELS } = await import(u('src/data/levels.js'));
const { layoutSpec } = await import(u('src/env/biomes/index.js'));

const NEW = [21, 22, 23, 24, 25, 26, 27, 28];
const LANGS = ['de', 'es', 'fr', 'ja', 'ko', 'pt-BR', 'ru', 'zh-Hans', 'zh-Hant'];
const checks = [];
const check = (name, ok, detail = null) => {
  checks.push({ name, ok: !!ok, detail });
  if (!ok) console.log(`FAIL ${name}`, detail ?? '');
};

// ----------------------------------------------------------- register --
const levelOf = (act) => Object.values(LEVELS).find((l) => l.act === act || l.id === act);
const catalog = JSON.parse(readFileSync(join(here, 'src/i18n/catalog.json'), 'utf8'));
const tables = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'))]));
for (const id of NEW) {
  const L = LAYOUTS[id];
  check(`L${id} defined`, L && L.id === id);
  if (!L) continue;
  check(`L${id} in LAYOUT_IDS`, LAYOUT_IDS.includes(id));
  const spec = layoutSpec(id);
  check(`L${id} dressing`, spec && spec.id === id && Array.isArray(spec.clusters) && spec.clusters.length >= 6, spec ? spec.name : null);
  const lv = levelOf(L.act);
  check(`L${id} in Level ${L.act} campaign table`, lv && lv.layouts.includes(id));
  check(`L${id} not in legacy table`, lv && !(lv.legacyLayouts ?? []).includes(id));
  check(`L${id} hazards allowed`, lv && L.hazards.every((h) => lv.hazards.includes(h.type)) && L.interactables.every((p) => lv.interactables.includes(p.type)));
  check(`L${id} name in catalogue`, !!catalog[L.name], L.name);
  const missing = LANGS.filter((l) => !tables[l][L.name] || tables[l][L.name] === L.name);
  check(`L${id} name in nine languages`, missing.length === 0, missing);
  if (L.arena) check(`L${id} arena has no barricades`, !L.interactables.some((p) => p.type === 'barricade'));
}
const arenas = {};
for (const act of [1, 2, 3, 4]) {
  const lv = levelOf(act);
  const flagged = lv.layouts.filter((id) => LAYOUTS[id]?.arena);
  check(`Level ${act} has one arena`, flagged.length === 1, flagged);
  check(`Level ${act} has seven layouts`, lv.layouts.length === 7, lv.layouts);
  check(`Level ${act} legacy table has no arena`, arenaOf(lv.legacyLayouts ?? []) === null);
  arenas[act] = arenaOf(lv.layouts);
}

// ------------------------------------------------------------- arena --
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
  return { world, bus, clock };
}
const COMBAT = new Set(['kill_all', 'defend', 'champion', 'hunt', 'purge', 'escort', 'hold']);
const samples = [];
const rolled = new Set();
const seenByLevel = { 1: 0, 2: 0, 3: 0, 4: 0 };
for (const level of [1, 2, 3, 4]) {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const { world, bus, clock } = makeWorld(seed * 7919 + level);
    const run = world.runSystem();
    let lv = level;
    let prevCombat = null;
    let over = false;
    bus.on('level_start', (e) => (lv = e.level));
    bus.on('room_enter', (e) => {
      if (lv !== level) {
        over = true;
        return;
      }
      if (!COMBAT.has(e.mode)) return;
      if (e.mode === 'champion' || e.mode === 'hold') {
        const want = prevCombat === arenas[level] ? null : arenas[level];
        samples.push({ level, seed, room: e.index, mode: e.mode, layoutId: e.layoutId, prevCombat, ok: want === null ? e.layoutId !== prevCombat : e.layoutId === want });
        seenByLevel[level] += 1;
      } else if (NEW.includes(e.layoutId)) rolled.add(e.layoutId);
      prevCombat = e.layoutId;
    });
    bus.on('run_end', () => (over = true));
    run.startCampaign({ level, harness: true });
    run.autopilot.configure(true);
    for (let i = 0; i < 200000 && !over; i++) {
      clock.stepOnce((t) => world.step(t, run.autopilot.intents(t, emptySnapshot())));
      const ph = run.view().phase;
      if (ph === 'victory' || ph === 'defeat') over = true;
    }
  }
}
for (const s of samples) check(`Level ${s.level} seed ${s.seed} room ${s.room} ${s.mode} -> L${s.layoutId}`, s.ok, s);
for (const level of [1, 2, 3, 4]) check(`Level ${level} met a champion or Hold room`, seenByLevel[level] > 0, seenByLevel[level]);
for (const id of NEW) check(`L${id} rolled in an ordinary room`, rolled.has(id));

const fails = checks.filter((c) => !c.ok).length;
const inArena = samples.filter((s) => s.layoutId === arenas[s.level]).length;
console.log(JSON.stringify({ samples: samples.length, inArena, byMode: { champion: samples.filter((s) => s.mode === 'champion').length, hold: samples.filter((s) => s.mode === 'hold').length }, seenByLevel, rolled: [...rolled].sort((a, b) => a - b) }));
console.log(`${checks.length - fails}/${checks.length} checks pass`);
process.exit(fails ? 1 : 0);
