import { build } from './sim.mjs';
import { memStorage } from './memstore.mjs';
const R = '/home/claude/echoes-three/src/save/';
const { buildFile, parseFile } = await import(R + 'codec.js');
const { createSaveStorage } = await import(R + 'storage.js');
const s = build({ seed: 3 }); s.world.runSystem().startCampaign({ level: 3, harness: true }); s.stepN(10); s.world.cmd('skipToRoom', 4); s.stepN(400);
const tree = s.io.capture();
const txt = (at) => buildFile({ slot: { id: 'auto-1', kind: 'auto', name: 'A' }, meta: {}, state: tree, game: 't', createdAt: at, savedAt: at }).text;
const good = txt('2026-10-19T10:00:00Z');
console.log('mid-run slot file chars', good.length, '=> bytes in localStorage (UTF-16)', good.length * 2);
// damaged main + good .bak, then the next autosave lands on that slot
const ls = memStorage({ 'echoes.save.v1.auto-1': good.slice(0, good.length - 50), 'echoes.save.v1.auto-1.bak': good });
const store = createSaveStorage({ storage: ls });
console.log('before: main ok?', parseFile(ls.getItem('echoes.save.v1.auto-1')).ok, '.bak ok?', parseFile(ls.getItem('echoes.save.v1.auto-1.bak')).ok);
store.writeAtomic('echoes.save.v1.auto-1', txt('2026-10-19T11:00:00Z'));   // exactly what writeSlot/writeSlotNow do (no backupIf)
console.log('after : main ok?', parseFile(ls.getItem('echoes.save.v1.auto-1')).ok, '.bak ok?', parseFile(ls.getItem('echoes.save.v1.auto-1.bak')).ok);
