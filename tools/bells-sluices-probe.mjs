#!/usr/bin/env node
// BELLS AND SLUICES probe (fix for "bells and sluices stop responding after the
// first cleared room of a level"), headless sim, no browser:
//   rooms    a campaign walk of levels 2 and 3 (sluices and bells), room by
//            room: every bell or sluice placed in a combat room reads ready on
//            entry, not dormant, rooms 2 and later included
//   use      a party member beside one presses interact: it rings / opens
//            (an `interact` event, no `interact_denied`)
//   cleared  once that room clears, the same asset reads dormant again
//
//   node tools/bells-sluices-probe.mjs [--seeds 1,2,3] [--out captures/bells-sluices-probe.json]
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
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEEDS = String(opt('seeds', '1,2,3,4,5')).split(',').map(Number);
const OUT = opt('out', 'captures/bells-sluices-probe.json');

const results = [];
let failed = 0;
function check(leg, name, ok, detail = null) {
  results.push({ leg, name, ok: !!ok, ...(detail !== null ? { detail } : {}) });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null ? ` ${JSON.stringify(detail)}` : ''}`);
  return !!ok;
}

function build(seed) {
  const rng = createGameplayRng(seed >>> 0);
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const log = [];
  bus.on('*', (e) => {
    if (['interact', 'interact_denied', 'room_cleared', 'layout_placed'].includes(e.type)) log.push(e);
  });
  const step = () => clock.stepOnce((t) => world.step(t, emptySnapshot()));
  return { registry, bus, world, step, log, run: () => world.runSystem() };
}
const assets = (w) => (w.world.cmd('contentState').interactables || []).filter((e) => e.itype === 'bell' || e.itype === 'sluice');

const seen = []; // { seed, level, room, itype, state }
let used = 0;
let usedOk = 0;
let usedLate = 0;
let redormant = 0;
let redormantOk = 0;
for (const seed of SEEDS) {
  for (const level of [2, 3]) {
    const w = build(seed);
    w.run().startCampaign({ level, harness: true });
    const rooms = w.run().view().frame.modes;
    for (let n = 1; n <= rooms.length; n++) {
      if (n > 1) w.world.cmd('skipToRoom', n);
      w.step();
      const list = assets(w);
      for (const a of list) seen.push({ seed, level, room: n, itype: a.itype, state: a.state });
      const a = list.find((x) => x.state === 'ready' || x.state === 'dormant');
      if (!a) continue;
      // Stand a party member on it and press interact.
      const p = w.registry.all().find((e) => e.partyIndex === 0);
      p.x = a.x + 0.3;
      p.z = a.z + 0.3;
      p.px = p.x;
      p.pz = p.z;
      const mark = w.log.length;
      w.world.cmd('interactPress', [0]);
      const ev = w.log.slice(mark).filter((e) => e.id === a.id);
      used += 1;
      if (ev.some((e) => e.type === 'interact') && !ev.some((e) => e.type === 'interact_denied')) {
        usedOk += 1;
        if (n > 1) usedLate += 1;
      } else if (usedOk === used - 1) {
        console.log('  first refusal:', JSON.stringify({ seed, level, room: n, itype: a.itype, ev }));
      }
    }
  }
}
// cleared leg: on each seed, find a level-2 room with a sluice, force-clear it.
for (const seed of SEEDS) {
  const w = build(seed);
  w.run().startCampaign({ level: 2, harness: true });
  const rooms = w.run().view().frame.modes.length;
  for (let n = 2; n <= rooms; n++) {
    w.world.cmd('skipToRoom', n);
    w.step();
    const a = assets(w)[0];
    if (!a) continue;
    w.bus.emit(w.world.tick ?? 0, 'room_cleared', { room: n, probe: true });
    const after = assets(w).find((x) => x.id === a.id);
    redormant += 1;
    if (after && after.state === 'dormant') redormantOk += 1;
    break;
  }
}

const late = seen.filter((s) => s.room > 1);
const lateDormant = late.filter((s) => s.state === 'dormant');
check('rooms', 'bells and sluices turn up in rooms 2 and later', late.length > 0, { seen: seen.length, late: late.length });
check('rooms', 'none of them starts a room dormant', lateDormant.length === 0, { dormant: lateDormant.length, of: late.length, first: lateDormant[0] ?? null });
check('use', 'a party member beside one rings / opens it, rooms 2 and later included', used > 0 && usedOk === used && usedLate > 0, { used, ok: usedOk, late: usedLate });
check('cleared', 'a cleared room still puts them to sleep', redormant > 0 && redormantOk === redormant, { rooms: redormant, dormant: redormantOk });

mkdirSync(dirname(resolve(here, OUT)), { recursive: true });
writeFileSync(resolve(here, OUT), JSON.stringify({ seeds: SEEDS, results, seen }, null, 2));
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
