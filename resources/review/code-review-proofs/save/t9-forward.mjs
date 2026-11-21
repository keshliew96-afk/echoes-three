import { memStorage } from './memstore.mjs';
const R = '/home/claude/echoes-three/src/save/';
const { createSaveStorage, PROFILE_KEY } = await import(R + 'storage.js');
const { createProfileStore } = await import(R + 'profile.js');
// v:1 profile as a NEWER build would write it (same v, new content ids + a new meta key).
const p = { v: 1, records: { runs: 40, levelClears: { 1: 3 } }, unlocks: { acts: [1, 2] }, savedAt: '2026-10-19T00:00:00Z',
  meta: { mv: 1, embers: 100, earned: 900,
    owned: { kit_tank_alt: 120, heirloom_future_relic: 90, vow_future: 0 },
    deeds: ['first_light', 'future_deed'], feats: ['future_feat'], relicsSeen: ['future_relic'],
    marks: { champion: ['future_champion'], affix: ['future_affix'], event: [], arena: [], daily: { last: null } },
    loadout: { heirloom: 'heirloom_future_relic', vows: ['vow_future'] }, prestige: { tier: 3 } } };
const ls = memStorage({ [PROFILE_KEY]: JSON.stringify(p) });
const ps = createProfileStore({ store: createSaveStorage({ storage: ls }) });
ps.noteStory('prologue'); // any write
const m = JSON.parse(ls.getItem(PROFILE_KEY)).meta;
console.log('embers', m.embers, '(was 100; refunded paid unlocks)');
console.log('owned', Object.keys(m.owned), 'deeds', m.deeds, 'feats', m.feats, 'relicsSeen', m.relicsSeen);
console.log('marks.champion', m.marks.champion, 'marks.affix', m.marks.affix, 'loadout.heirloom', m.loadout.heirloom, 'prestige', m.prestige);
