// gntccontent5 — why do the melee allies barely attack in Level 1? ?menu=0&seed=1 carried campaign under autopilot (sim
// frozen, stepN), sampled every 30 ticks through L1 rooms 1-2: each ally's state / target / distance to its target and to
// the nearest hostile, hostile count; frames at room 2 +600 and +1500 ticks (thawed for the capture).
import { boot, ev, writeJson, BASE, sleep, shot } from './gntccontent5-lib.mjs';
const seed = +(process.argv[2] || 1);
const { browser, page, errors } = await boot(BASE + `?menu=0&seed=${seed}`);
const r = await ev(page, async () => {
  const E = window.__echoes;
  E.sim.freeze();
  E.cmd('startCampaign', { level: 1 });
  E.cmd('autopilot', true);
  const samples = [];
  let room = 0;
  E.on('room_enter', (e) => { room = e.index; });
  let guard = 0;
  while (guard++ < 400 && !(room === 2)) E.sim.stepN(30, null);
  const t2 = E.tick;
  while (E.tick - t2 < 600) {
    E.sim.stepN(30, null);
    const s = E.state();
    const hs = s.enemies.filter((x) => x.hp > 0);
    samples.push({ t: E.tick - t2, n: hs.length, allies: s.party.map((p) => { const near = hs.length ? Math.min(...hs.map((x) => Math.hypot(x.x - p.x, x.z - p.z))) : null; const tg = hs.find((x) => x.id === p.target); return [p.classId, p.state, p.downed ? 'DOWN' : '', near == null ? null : +near.toFixed(2), tg ? +Math.hypot(tg.x - p.x, tg.z - p.z).toFixed(2) : null, +p.x.toFixed(1), +p.z.toFixed(1)]; }) });
  }
  return { t2, samples };
});
await ev(page, () => window.__echoes.sim.thaw());
await sleep(600);
await shot(page, `gntfixM4a5-melee-s${seed}-r2a`);
await ev(page, () => { const E = window.__echoes; E.sim.freeze(); E.sim.stepN(900, null); E.sim.thaw(); });
await sleep(600);
await shot(page, `gntfixM4a5-melee-s${seed}-r2b`);
r.errors = errors;
writeJson(`gntfixM4a5-melee-s${seed}.json`, r);
for (const s of r.samples.filter((_, i) => i % 2 === 0)) console.log(s.t, 'hostiles', s.n, JSON.stringify(s.allies.slice(1)));
await browser.close();
