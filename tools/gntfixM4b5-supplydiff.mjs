#!/usr/bin/env node
// gntfixM4b5 — where two trees' carried campaigns diverge in the ally supply
// arc (GP.7): per room_start the three ally seats' filled sockets + slots,
// every party_offer card, party_commit choice and ally shop purchase.
//   node tools/gntfixM4b5-supplydiff.mjs <rootA> <rootB> [seed]
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
const [A, B, seedArg] = process.argv.slice(2);
const SEED = Number(seedArg || 2);
async function run(root) {
  const u = (p) => pathToFileURL(join(resolve(root), p)).href;
  const T = { rng: await import(u('src/core/rng.js')), reg: await import(u('src/core/registry.js')), ev: await import(u('src/core/events.js')), clk: await import(u('src/core/clock.js')), world: await import(u('src/sim/world.js')), intents: await import(u('src/core/intents.js')) };
  let impl = T.rng.createGameplayRng(SEED);
  const rng = { stream: 'gameplay', get seed() { return impl.seed; }, get drawIndex() { return impl.drawIndex; }, float: () => impl.float(), range: (a, b) => impl.range(a, b), int: (n) => impl.int(n), chance: (q) => impl.chance(q), pick: (a) => impl.pick(a), reseed: (s) => { impl = T.rng.createGameplayRng(s >>> 0); return impl.seed; }, getState: () => impl.getState(), setState: (st) => { impl = T.rng.createGameplayRng(st.seed >>> 0); return impl.setState(st); } };
  const registry = T.reg.createRegistry();
  const bus = T.ev.createEventBus();
  const clock = T.clk.createClock();
  const world = T.world.createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const P = world.partySystem();
  const log = [];
  bus.on('*', (e) => {
    if (e.type === 'room_start') {
      const v = world.runSystem().view();
      log.push(`L${v.act}r${v.room} ${v.mode} filled ${[1, 2, 3].map((i) => P.view(i).filled).join('/')} slots ${[1, 2, 3].map((i) => P.slots(i).join(',')).join(' | ')}`);
    } else if (e.type === 'party_offer') log.push(`  offer ${e.cards.map((c) => `${c.seat}:${c.reward}:${c.id}${c.swap ? '(swap)' : ''}`).join(' ')}`);
    else if (e.type === 'party_commit') log.push(`  commit ${e.cards.map((c) => `${c.seat}:${c.choice}${c.replace != null ? '@' + c.replace : ''}`).join(' ')}`);
    else if (e.type === 'shop_purchase' && e.seat) log.push(`  buy seat ${e.seat} ${e.node || e.id || e.item || JSON.stringify(e).slice(0, 80)}`);
    else if (e.type === 'spoils_drop' && e.seat) log.push(`  spoils seat ${e.seat} ${JSON.stringify(e.nodes)}`);
    else if (e.type === 'reward_forfeited') log.push('  FORFEIT');
  });
  const ap = world.runSystem().autopilot;
  world.runSystem().startCampaign({ level: 1, challenge: 'standard', harness: true });
  ap.configure(true);
  for (let t = 0; t < 260000; t++) {
    clock.stepOnce((tk) => world.step(tk, ap.intents(tk, T.intents.emptySnapshot())));
    const v = world.runSystem().view();
    if (v.phase === 'victory' || v.phase === 'defeat' || v.phase === 'idle') break;
  }
  return log;
}
const a = await run(A);
const b = await run(B);
let first = -1;
for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { first = i; break; }
console.log('lines', a.length, b.length, 'first divergence at', first);
for (let i = Math.max(0, first - 4); i < Math.min(Math.max(a.length, b.length), first + 30); i++) console.log(String(i).padStart(4), (a[i] || '').slice(0, 150), '\n     ', (b[i] || '').slice(0, 150));
