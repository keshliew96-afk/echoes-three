import { build } from './sim.mjs';
const s = build({ seed: 3 });
s.world.runSystem().startCampaign({ level: 2 , harness: true});
s.stepN(10); s.world.cmd('skipToRoom', 7); s.stepN(60);
const A = s.io.capture();
console.log('phase', A.systems.run.phase, 'room', A.systems.run.roomIndex, 'bossPick', A.systems.run.bossPick, 'thirdBosses', A.systems.run.thirdBosses);
for (const pick of [A.systems.run.bossPick, 'retired_boss']) {
  const t = JSON.parse(JSON.stringify(A)); t.systems.run.bossPick = pick;
  const f = build({ seed: 9 }); const r = f.io.apply(t);
  let err = null;
  try { f.world.cmd('skipToRoom', 8); f.stepN(300); const b = f.registry ? null : null; } catch (e) { err = String(e.message).slice(0,120); }
  const boss = f.io.capture().registry.entities.find(e => e.kind && /boss/.test(String(e.faction)+e.kind) || e.boss);
  console.log('pick', pick, 'apply', r.ok, 'err', err, 'room', f.world.runSystem().view().roomIndex, 'bossEntity', boss && boss.kind);
}
