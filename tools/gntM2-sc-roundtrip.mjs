// G2.1 (+ G2.2 spot list): the round trip at all 8 moments, in page and after
// a page reload (load from storage).
//   node tools/gntM2-drive.mjs tools/gntM2-sc-roundtrip.mjs [--tries 3]
//   env GNTM2_MOMENTS=camp,combat,...  (default: all 8)
// Per moment: fresh page (?fresh=1) -> build the moment (tools/gntM2-moments.mjs)
// -> __echoes.save.roundTrip({ ticks: 600, scriptSeed: 1 }) (hashBefore ===
// hashAfterApply, 600-tick continuation identical: per-60-tick hashes + every
// non-sound event) -> save to manual-8 + record the continuation from the
// saved moment -> RELOAD (same origin, no ?fresh) -> load manual-8 -> the
// same continuation -> compare hashes and the event digest.
import { installHelpers, MOMENTS } from './gntM2-moments.mjs';

const BASE = 'http://127.0.0.1:5199/?menu=0';
const SPOT = () => {
  // G2.2 completeness spot list, read off the live sim after a load.
  const E = window.__echoes;
  const s = E.state();
  const w = E.content.world();
  const b = w.buildSystem();
  const p = w.player;
  return {
    player: { x: Math.round(p.x * 1000) / 1000, z: Math.round(p.z * 1000) / 1000, hp: p.hp, dodgeReadyTick: p.dodgeReadyTick, nextBasicTick: p.nextBasicTick, status: p.status ? Object.keys(p.status) : [] },
    skills: s.skills.map((x) => (x ? `${x.id}:${x.remainingTicks}` : null)),
    sockets: b.view().skills.map((k) => `${k.id}[${k.sockets.map((x) => (x ? x.node : '-')).join(',')}]`),
    bench: b.view().bench.map((x) => x.node),
    wallet: s.wallet,
    act: s.run.act,
    room: s.run.room,
    phase: s.run.phase,
    frame: s.run.frame ? s.run.frame.modes.join(',') : null,
    rng: { seed: E.seed, draws: E.rngDraws },
    enemies: s.enemies.length,
    projectiles: s.projectiles.length + s.skillBolts.length + s.eshots.length,
    zones: s.zones.length + s.azones.length,
    hazards: w.entities().filter((e) => e.kind === 'hazard').length,
    interactables: w.entities().filter((e) => e.interactable === true || e.kind === 'kegfuse').length,
    statuses: w.entities().filter((e) => e.status && Object.keys(e.status).length).length,
    tick: E.tick,
  };
};

export default async function (h) {
  const names = (process.env.GNTM2_MOMENTS || Object.keys(MOMENTS).join(',')).split(',');
  const report = [];
  let seed = 31;
  for (const name of names) {
    seed += 1;
    const url = `${BASE}&seed=${seed}`;
    await h.open(`${url}&fresh=1`);
    await h.waitFor(() => window.__echoes.tick > 90 && window.__echoes.save, { timeout: 60000 });
    await h.ev(installHelpers);
    const setup = await h.ev(MOMENTS[name]);
    const rt = await h.ev(() => {
      const r = window.__echoes.save.roundTrip({ ticks: 600, scriptSeed: 1 });
      return { ...r, hashes: r.hashes.map((x) => `${x.tick}:${x.h}`) };
    });
    const spotBefore = await h.ev(SPOT);
    const sv = await h.ev(async () => {
      const r = await window.__echoes.save.save('manual-8', { name: 'G2.1 probe' });
      return { ok: r.ok, error: r.error, reason: r.reason, bytes: r.bytes, hash: r.hash };
    });
    const c1 = await h.ev(() => {
      const r = window.__echoes.save.continuation({ ticks: 600, scriptSeed: 1 });
      return { ...r, hashes: r.hashes.map((x) => `${x.tick}:${x.h}`) };
    });
    // Page reload: a new world, the save read back from localStorage.
    await h.open(url);
    await h.waitFor(() => window.__echoes.tick > 90 && window.__echoes.save, { timeout: 60000 });
    const ld = await h.ev(async () => {
      window.__echoes.sim.freeze();
      const r = await window.__echoes.save.loadRaw('manual-8');
      return { ok: r.ok, error: r.error, detail: r.detail, ms: r.ms, hash: window.__echoes.save.hash() };
    });
    const spotAfter = await h.ev(SPOT);
    const c2 = await h.ev(() => {
      const r = window.__echoes.save.continuation({ ticks: 600, scriptSeed: 1 });
      return { ...r, hashes: r.hashes.map((x) => `${x.tick}:${x.h}`) };
    });
    let reloadDiv = null;
    for (let i = 0; i < Math.max(c1.hashes.length, c2.hashes.length); i++) {
      if (c1.hashes[i] !== c2.hashes[i]) {
        reloadDiv = { index: i, a: c1.hashes[i], b: c2.hashes[i] };
        break;
      }
    }
    const reloadEqual = ld.ok && ld.hash === c1.hashBefore && !reloadDiv && c1.eventsHash === c2.eventsHash && c1.eventCount === c2.eventCount;
    const ok = rt.equal && rt.continuationEqual && sv.ok && reloadEqual;
    const row = {
      moment: name,
      ok,
      setup,
      inPage: { equal: rt.equal, continuationEqual: rt.continuationEqual, hashBefore: rt.hashBefore, hashAfterApply: rt.hashAfterApply, firstDivergence: rt.firstDivergence, events: rt.events, entities: rt.entities, bytes: rt.bytes, ms: rt.ms },
      reload: { saved: sv.ok, loaded: ld.ok, loadMs: ld.ms, hashAtLoad: ld.hash, hashSaved: c1.hashBefore, equal: ld.hash === c1.hashBefore, continuationEqual: !reloadDiv && c1.eventsHash === c2.eventsHash, events: [c1.eventCount, c2.eventCount], eventsHash: [c1.eventsHash, c2.eventsHash], firstDivergence: reloadDiv },
      spotEqual: JSON.stringify(spotBefore) === JSON.stringify(spotAfter),
      spot: spotAfter,
      spotBefore: JSON.stringify(spotBefore) === JSON.stringify(spotAfter) ? undefined : spotBefore,
    };
    report.push(row);
    h.log(`moment:${name}`, row);
    if (!ok) h.fail(`round trip ${name}`, { inPage: row.inPage, reload: row.reload, setup });
  }
  h.log('summary', { passed: report.filter((r) => r.ok).length, of: report.length, moments: report.map((r) => `${r.moment}:${r.ok ? 'ok' : 'FAIL'}`) });
}
