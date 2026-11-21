import { build } from './sim.mjs';
const s = build({ seed: 3 });
s.world.runSystem().startCampaign({ level: 1 });
s.stepN(10); s.world.cmd('skipToRoom', 3); s.stepN(300);
const A = s.io.capture();
const en = A.registry.entities.find(e=>e.kind==='quillback'); console.log('enemy keys', Object.keys(en).join(','));
function tryCase(name, mut, ticks = 600) {
  const t = JSON.parse(JSON.stringify(A)); mut(t);
  const f = build({ seed: 99 }); const r = f.io.apply(t); let err = null;
  if (r.ok) { try { f.stepN(ticks); f.world.snapshotState(); } catch (e) { err = String(e && e.message).slice(0,140) + ' @' + String(e.stack).split('\n')[1].trim().slice(0,90); } }
  console.log(name.padEnd(26), 'apply', r.ok ? 'ok' : r.error + ' ' + (r.detail||'').slice(0,100), '| after ticks:', err ?? 'fine');
}
tryCase('retired enemy kind', (t) => { for (const e of t.registry.entities) if (e.kind === 'quillback' || e.kind==='lasher') e.kind = 'retired_kind'; });
tryCase('retired hazard kind', (t) => { for (const e of t.registry.entities) if (e.kind === 'keg') e.kind = 'retired_keg'; });
tryCase('retired boss in run.bossPick', (t) => { t.systems.run.bossPick = 'retired_boss'; });
tryCase('relic shelf/offer unknown', (t) => { const r = t.systems.run.relics; r.offer = { choices: ['retired_a','retired_b'] }; });
tryCase('encounter unknown', (t) => { const e = t.systems.run.encounters; if (e) { for (const k of Object.keys(e)) if (typeof e[k]==='string' && /enc|id/i.test(k)) e[k] = 'retired_enc'; console.log('   enc keys', Object.keys(e).join(',')); } });
tryCase('lineup classId unknown seat', (t) => { t.systems.party.seats[2].classId = 'retired_class'; for (const e of t.registry.entities) if (e.kind==='ally' && e.partyIndex===2) e.classId='retired_class'; });
