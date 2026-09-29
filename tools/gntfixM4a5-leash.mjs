#!/usr/bin/env node
// gntfixM4a5 — GP.8 "0 dash / vault end points beyond the leash", read against the SEAT's ring (BUILD_BRIEF §25.8
// Engagement: the melee pair's vanguard ring 5.4 u in a campaign, 3.4 u for the Archer). Node carried campaigns
// (default-build autopilot + the §25.8 ally AI, built like tools/gntCAMPAIGN-camprun.mjs); every AI `ally_dash`
// end point (x1, z1) is measured from the live leash anchor on its tick (allyState().anchor) and compared with
// that seat's ring (allyState().allies[i].leash, else LEASH.radius) + 0.3 u (the gntPARTY-campaign margin).
// Also counted: end points beyond the plain 3.4 + 0.3 (what a probe reading only LEASH.radius reports).
//   node tools/gntfixM4a5-leash.mjs --from 1 --seeds 1-3 [--root dir] [--out captures/x.json]
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const FROM = +opt('from', '1');
const sa = opt('seeds', '1-3');
const SEEDS = sa.includes('-') ? (([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i))(sa.split('-').map(Number)) : sa.split(',').map(Number);
const ROOT = resolve(opt('root', '.'));
const OUT = opt('out', `captures/gntfixM4a5-leash-from${FROM}.json`);
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { LEASH } = await import(u('src/sim/allies.js'));

const out = { from: FROM, seeds: SEEDS, runs: [] };
for (const seed of SEEDS) {
  let impl = createGameplayRng(seed >>> 0);
  const rng = { stream: 'gameplay', get seed() { return impl.seed; }, get drawIndex() { return impl.drawIndex; }, float: () => impl.float(), range: (a, b) => impl.range(a, b), int: (n) => impl.int(n), chance: (p) => impl.chance(p), pick: (a) => impl.pick(a), reseed: (s) => { impl = createGameplayRng(s >>> 0); return impl.seed; } };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const run = world.runSystem();
  const ap = run.autopilot;
  const dashes = [];
  bus.on('ally_dash', (e) => {
    const v = world.cmd('allyState');
    const an = v ? registry.byId(v.anchor) : null;
    const me = v ? v.allies.find((x) => x.partyIndex === e.seat) : null;
    if (!an || !me) return;
    const ring = me.leash ?? LEASH.radius;
    const d = Math.hypot(e.x1 - an.x, e.z1 - an.z);
    const d0 = Math.hypot(e.x0 - an.x, e.z0 - an.z);
    dashes.push({ tick: e.tick, seat: e.seat, skill: e.skill, cause: e.cause, d: Math.round(d * 100) / 100, d0: Math.round(d0 * 100) / 100, ring, beyondSeat: d > ring + 0.3, beyondBase: d > LEASH.radius + 0.3 });
  });
  run.startCampaign({ level: FROM, challenge: 'standard', harness: true });
  ap.configure(true);
  let outcome = null;
  for (let i = 0; i < 220000; i++) {
    clock.stepOnce((t) => world.step(t, ap.intents(t, emptySnapshot())));
    const ph = run.view().phase;
    if (ph === 'victory' || ph === 'defeat') {
      outcome = ph;
      break;
    }
  }
  const beyondSeat = dashes.filter((x) => x.beyondSeat);
  const beyondBase = dashes.filter((x) => x.beyondBase);
  const byCause = {};
  for (const x of dashes) byCause[x.cause] = (byCause[x.cause] || 0) + 1;
  out.runs.push({ seed, outcome, dashes: dashes.length, byCause, beyondSeat: beyondSeat.length, beyondBase: beyondBase.length, beyondSeatSample: beyondSeat.slice(0, 5), beyondBaseSample: beyondBase.slice(0, 3) });
  console.log(`seed ${seed} ${outcome}: ${dashes.length} AI dash/vault/lunge end points ${JSON.stringify(byCause)} | beyond the seat's ring ${beyondSeat.length} | beyond 3.4+0.3 (a LEASH.radius-only probe) ${beyondBase.length}${beyondSeat.length ? ' ' + JSON.stringify(beyondSeat.slice(0, 3)) : ''}`);
}
const tot = out.runs.reduce((a, r) => a + r.beyondSeat, 0);
console.log(`TOTAL beyond the seat's ring: ${tot} (GP.8: 0) ${tot === 0 ? 'PASS' : 'FAIL'}`);
writeFileSync(OUT, JSON.stringify(out, null, 1));
