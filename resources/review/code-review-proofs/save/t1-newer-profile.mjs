import { memStorage } from './memstore.mjs';
const R = '/home/claude/echoes-three/src/save/';
const { createSaveStorage, PROFILE_KEY } = await import(R + 'storage.js');
const { createProfileStore } = await import(R + 'profile.js');
// A profile written by a hypothetical newer build that bumped v to 2.
const newer = { v: 2, highScores: [{ score: 9999 }], records: { runs: 120, victories: 40 }, meta: { mv: 2, embers: 5000 }, unlocks: { acts: [1,2,3,4,5,6] }, savedAt: '2026-10-18T00:00:00Z' };
const ls = memStorage({ [PROFILE_KEY]: JSON.stringify(newer) });
const store = createSaveStorage({ storage: ls });
const ps = createProfileStore({ store });
console.log('report', ps.report);
console.log('loaded runs', ps.get().records.runs, 'embers', ps.get().meta.embers);
console.log('flush', ps.flush());
const after = JSON.parse(ls.getItem(PROFILE_KEY));
console.log('main after flush: v', after.v, 'runs', after.records.runs, 'embers', after.meta.embers, 'acts', after.unlocks.acts);
console.log('.bak', ls.getItem(PROFILE_KEY + '.bak'));
console.log('.corrupt kept?', !!ls.getItem(PROFILE_KEY + '.corrupt'));
// second load in a later session that also finds main corrupt overwrites .corrupt
