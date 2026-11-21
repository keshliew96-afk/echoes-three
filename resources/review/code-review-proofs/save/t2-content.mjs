import { build, hashState } from './sim.mjs';
const s = build({ seed: 3 });
s.world.runSystem().startCampaign({ level: 1 });
s.stepN(10);
s.world.cmd('skipToRoom', 3);
s.stepN(300);
const A = s.io.capture();
const run = A.systems.run;
console.log('phase', run.phase, 'act', run.act, 'relics?', !!run.relics, 'enemies', A.registry.entities.filter(e=>e.kind==='enemy').length);
const kinds = [...new Set(A.registry.entities.map(e=>e.kind))]; console.log('entity kinds', kinds);
const en = A.registry.entities.find(e=>e.kind==='enemy'); if (en) console.log('enemy keys', Object.keys(en).slice(0,30).join(','), 'etype', en.etype);
function tryCase(name, mut) {
  const t = JSON.parse(JSON.stringify(A));
  mut(t);
  const f = build({ seed: 99 });
  const r = f.io.apply(t);
  let err = null;
  if (r.ok) { try { f.stepN(240); f.world.snapshotState(); } catch (e) { err = String(e && e.message).slice(0,140); } }
  console.log(name.padEnd(28), 'apply', r.ok ? 'ok' : r.error + ' ' + (r.detail||'').slice(0,100), '| after 240 ticks:', err ?? 'fine');
}
tryCase('baseline', () => {});
tryCase('unknown enemy etype', (t) => { for (const e of t.registry.entities) if (e.kind === 'enemy') e.etype = 'retired_kind'; });
tryCase('unknown layoutId', (t) => { if (t.systems.run.layout) t.systems.run.layout.layoutId = 'retired_layout'; });
tryCase('unknown relic owned', (t) => { if (t.systems.run.relics) t.systems.run.relics.owned = ['retired_relic']; });
tryCase('unknown curse', (t) => { if (t.systems.run.relics) t.systems.run.relics.curse = { id: 'retired_curse' }; });
tryCase('unknown ally classId', (t) => { const s1 = t.systems.party.seats[1]; s1.classId = 'retired_class'; });
tryCase('frame.modes unknown', (t) => { const f = t.systems.run.frame; if (f && Array.isArray(f.modes)) f.modes = f.modes.map(() => 'retired_mode'); });
tryCase('frame missing new keys', (t) => { const f = t.systems.run.frame; if (f) for (const k of Object.keys(f)) if (!['seed','modes','act'].includes(k)) delete f[k]; });
tryCase('campaign.levels empty', (t) => { if (t.systems.run.campaign) t.systems.run.campaign.levels = []; });
tryCase('enemy unknown affix', (t) => { for (const e of t.registry.entities) if (e.kind === 'enemy') e.affixes = ['retired_affix']; });
