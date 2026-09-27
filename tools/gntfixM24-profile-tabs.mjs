#!/usr/bin/env node
// fix-M2-r4 (SAVE4-F1) — Node probe: two tabs = two profile stores over ONE
// shared localStorage. Every case checks that no tab's write takes back what
// the other tab stored, that counters from both tabs add up, and that the
// single-tab behaviour (formula, ranks, New best, unlocks, torn / corrupt
// recovery, quota -> pending) is unchanged.
//   node tools/gntfixM24-profile-tabs.mjs   -> exit 1 on any failure
import { createSaveStorage, PROFILE_KEY } from '../src/save/storage.js';
import { createProfileStore, scoreRun } from '../src/save/profile.js';

function sharedStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
    _m: m,
  };
}
let clockMs = Date.parse('2026-09-27T10:00:00.000Z');
const now = () => new Date((clockMs += 1000)).toISOString();
const tab = (ls) => {
  const store = createSaveStorage({ storage: ls });
  return { store, prof: createProfileStore({ store, now }) };
};
const stored = (ls) => JSON.parse(ls.getItem(PROFILE_KEY) || 'null');
const sum = (p) => p && { hs: p.highScores.length, unlocks: p.unlocks.acts.join(','), runs: p.records.runs, abandoned: p.records.abandoned, clears: p.records.levelClears[1], playtime: p.playtimeSec };

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
}
const run1 = { act: 1, result: 'abandoned', roomsCleared: 3, kills: 20, timeSec: 200, seed: 5, campaign: { mode: 'campaign', startLevel: 1, level: 2, levels: [{ level: 1, rooms: 8, kills: 30, cleared: true, ticks: 9000 }, { level: 2, rooms: 0, kills: 0, cleared: false, ticks: 100 }], complete: false } };

// 1. The critic's sequence: B opens first, A records a run + clears Level 1, B plays on then exits (flush).
{
  const ls = sharedStorage();
  const B = tab(ls);
  const A = tab(ls);
  const lc = A.prof.noteLevelClear(1);
  const rr = A.prof.recordRun(run1);
  const before = sum(stored(ls));
  B.prof.addPlaytime(3.6); // B was played again
  B.prof.noteRunStart(1);
  const w = B.prof.flush(); // pagehide / reload / navigate
  const after = sum(stored(ls));
  check('1 stale tab exit keeps A\'s high score', after.hs === 1, { before, after });
  check('1 stale tab exit keeps the Level II unlock', after.unlocks === '1,2', after);
  check('1 stale tab exit keeps levelClears + abandoned', after.clears === 1 && after.abandoned === 1 && after.runs === 1, after);
  check('1 stale tab exit adds its own playtime', Math.abs(after.playtime - 3.6) < 1e-9 && w.ok, after);
  check('1 A saw unlock + rank 1 + New best', lc.unlocked === true && rr.rank === 1 && rr.newBest === true, { lc, rank: rr.rank, newBest: rr.newBest });
  // .bak is A's good copy too (never an older one)
  const bak = JSON.parse(ls.getItem(`${PROFILE_KEY}.bak`));
  check('1 .bak holds the high score too', bak.highScores.length === 1 && bak.unlocks.acts.includes(2), sum(bak));
  // a reload of either tab reads it all
  const A2 = tab(ls);
  check('1 reloaded tab sees records + unlock', A2.prof.get().highScores.length === 1 && A2.prof.get().unlocks.acts.includes(2), sum(A2.prof.get()));
}
// 2. Both tabs record runs: counters add up, both entries kept, ranks measured against the other tab's entries.
{
  const ls = sharedStorage();
  const A = tab(ls);
  const B = tab(ls);
  const ra = A.prof.recordRun({ act: 1, result: 'defeat', roomsCleared: 4, kills: 10, timeSec: 100, seed: 1 });
  const rb = B.prof.recordRun({ act: 1, result: 'defeat', roomsCleared: 2, kills: 5, timeSec: 80, seed: 2 });
  const s = stored(ls);
  check('2 both runs counted', s.records.runs === 2 && s.records.defeats === 2 && s.highScores.length === 2, sum(s));
  check('2 B ranked against A\'s score (rank 2, not New best)', rb.rank === 2 && rb.newBest === false && rb.prevBest === ra.score, { rb: { rank: rb.rank, newBest: rb.newBest, prevBest: rb.prevBest }, a: ra.score });
  check('2 bestScore is the max of both', s.records.bestScore === Math.max(ra.score, rb.score), s.records.bestScore);
  check('2 A\'s in-memory view catches up on sync()', A.prof.sync() === true && A.prof.get().highScores.length === 2, sum(A.prof.get()));
}
// 3. Playtime from both tabs adds up; unlocks from both tabs union.
{
  const ls = sharedStorage();
  const A = tab(ls);
  const B = tab(ls);
  A.prof.addPlaytime(10);
  B.prof.addPlaytime(5);
  A.prof.flush();
  B.prof.flush();
  A.prof.addPlaytime(1);
  A.prof.flush();
  check('3 playtime adds across tabs', Math.abs(stored(ls).playtimeSec - 16) < 1e-9, stored(ls).playtimeSec);
  A.prof.noteLevelClear(1);
  B.prof.noteLevelClear(2);
  const s = stored(ls);
  check('3 unlocks union across tabs', s.unlocks.acts.join(',') === '1,2,3' && s.records.levelClears[1] === 1 && s.records.levelClears[2] === 1, { u: s.unlocks.acts, c: s.records.levelClears });
  check('3 furthestLevel is the max', s.records.furthestLevel === 2, s.records.furthestLevel);
}
// 4. flush with nothing to write writes nothing (a hidden idle tab never touches the file).
{
  const ls = sharedStorage();
  const A = tab(ls);
  A.prof.recordRun({ act: 1, result: 'defeat', roomsCleared: 1, kills: 1, timeSec: 10 });
  const t0 = ls.getItem(PROFILE_KEY);
  const B = tab(ls);
  A.prof.recordRun({ act: 1, result: 'defeat', roomsCleared: 2, kills: 1, timeSec: 10 });
  const t1 = ls.getItem(PROFILE_KEY);
  const w = B.prof.flush();
  check('4 idle tab flush writes nothing', w.ok && ls.getItem(PROFILE_KEY) === t1 && t0 !== t1);
}
// 5. Quota: an op whose write failed stays pending and rides the next write; the other tab's data is kept.
{
  const ls = sharedStorage();
  const A = tab(ls);
  const B = tab(ls);
  B.store.simulateQuota(true);
  const rb = B.prof.recordRun({ act: 1, result: 'defeat', roomsCleared: 5, kills: 9, timeSec: 50, seed: 9 });
  check('5 failed write reported', rb.written === false && rb.error === 'quota', { written: rb.written, error: rb.error });
  check('5 failed op still shown in this tab', B.prof.get().highScores.length === 1, sum(B.prof.get()));
  A.prof.recordRun({ act: 1, result: 'defeat', roomsCleared: 1, kills: 1, timeSec: 10, seed: 3 });
  B.store.simulateQuota(false);
  const w = B.prof.flush();
  const s = stored(ls);
  check('5 pending op written on the next flush, A\'s run kept', w.ok && s.highScores.length === 2 && s.records.runs === 2, sum(s));
  B.prof.flush();
  check('5 op applied exactly once', stored(ls).records.runs === 2, stored(ls).records.runs);
}
// 6. Single tab: formula + New best + ranks unchanged.
{
  const ls = sharedStorage();
  const A = tab(ls);
  const s1 = { act: 2, result: 'victory', roomsCleared: 8, kills: 40, timeSec: 600, challenge: 'harrowing' };
  const r1 = A.prof.recordRun(s1);
  check('6 score = §3.4 formula', r1.score === scoreRun({ ...s1, victory: true }), { got: r1.score, want: scoreRun({ ...s1, victory: true }) });
  const r2 = A.prof.recordRun({ act: 1, result: 'defeat', roomsCleared: 1, kills: 1, timeSec: 10 });
  check('6 lower score ranks 2, not a new best', r2.rank === 2 && r2.newBest === false && r1.newBest === true && r1.rank === 1);
  for (let i = 0; i < 12; i++) A.prof.recordRun({ act: 1, result: 'defeat', roomsCleared: 0, kills: 0, timeSec: 1 });
  check('6 top 10 kept', stored(ls).highScores.length === 10 && stored(ls).records.runs === 14, sum(stored(ls)));
}
// 7. Corrupt main in storage while a tab is open: sync adopts the .bak, a write never resets records.
{
  const ls = sharedStorage();
  const A = tab(ls);
  A.prof.recordRun({ act: 1, result: 'defeat', roomsCleared: 3, kills: 3, timeSec: 30 });
  A.prof.recordRun({ act: 1, result: 'defeat', roomsCleared: 2, kills: 3, timeSec: 30 });
  const B = tab(ls);
  ls.setItem(PROFILE_KEY, '{"v":1,"highScores":[tor');
  B.prof.addPlaytime(2);
  B.prof.flush();
  const s = stored(ls);
  check('7 torn main -> the write rebuilds from .bak, never from nothing', s && s.highScores.length >= 1 && s.records.runs >= 1, sum(s));
  // boot recovery unchanged
  ls.setItem(PROFILE_KEY, 'garbage');
  const C = tab(ls);
  check('7 boot on a corrupt main restores the backup', C.prof.report.status === 'backup' && C.prof.get().highScores.length >= 1, C.prof.report);
}
// 8. Torn write promotion (G2.5 for the profile) unchanged.
{
  const ls = sharedStorage();
  const A = tab(ls);
  A.prof.recordRun({ act: 1, result: 'defeat', roomsCleared: 3, kills: 3, timeSec: 30 });
  const newer = { ...stored(ls), savedAt: '2099-01-01T00:00:00.000Z', playtimeSec: 999 };
  A.store.simulateTornWrite(PROFILE_KEY, JSON.stringify(newer));
  const B = tab(ls);
  check('8 newer torn tmp promoted at boot', B.prof.report.status === 'promoted' && B.prof.get().playtimeSec === 999, B.prof.report);
}
// 9. Reset in one tab is not undone by the other tab's exit.
{
  const ls = sharedStorage();
  const A = tab(ls);
  const B = tab(ls);
  A.prof.recordRun({ act: 1, result: 'defeat', roomsCleared: 3, kills: 3, timeSec: 30 });
  B.prof.sync();
  A.prof.reset();
  B.prof.addPlaytime(1);
  B.prof.flush();
  const s = stored(ls);
  check('9 reset in A survives B\'s exit (B adds only its playtime)', s.highScores.length === 0 && s.records.runs === 0 && s.playtimeSec === 1, sum(s));
}
// 10. The critic's corruption leg: a run recorded, then main truncated under the
//     running tab (the .bak is the OLDER copy without that run). The tab's exit
//     must not adopt the older backup: it repairs main from its own newer copy.
{
  const ls = sharedStorage();
  const A = tab(ls);
  A.prof.addPlaytime(1);
  A.prof.flush(); // .bak will be this (no run)
  A.prof.recordRun({ act: 1, result: 'abandoned', roomsCleared: 2, kills: 2, timeSec: 20 });
  const s0 = stored(ls);
  const t = ls.getItem(PROFILE_KEY);
  ls.setItem(PROFILE_KEY, t.slice(0, Math.floor(t.length / 3)));
  A.prof.addPlaytime(2); // ticks since the run
  const w = A.prof.flush();
  const s1 = stored(ls);
  check("10 damaged main + older .bak: the exit keeps this tab's newer copy", w.ok && s1 && s1.highScores.length === 1 && s1.records.runs === 1, { s0: sum(s0), s1: sum(s1) });
  const B = tab(ls);
  check('10 reload reads the run back (report ok)', B.prof.get().highScores.length === 1 && B.prof.report.status === 'ok', B.prof.report);
  // damaged main with nothing pending: flush still repairs it
  const t2 = ls.getItem(PROFILE_KEY);
  ls.setItem(PROFILE_KEY, t2.slice(0, 20));
  const w2 = B.prof.flush();
  check('10 a clean tab repairs a damaged main on flush', w2.ok && stored(ls) && stored(ls).highScores.length === 1, sum(stored(ls)));
  // .bak newer than this tab's copy (another tab wrote, then main was damaged): adopt the .bak
  const C = tab(ls);
  B.prof.recordRun({ act: 1, result: 'defeat', roomsCleared: 1, kills: 0, timeSec: 5 }); // B writes run 2
  B.prof.recordRun({ act: 1, result: 'defeat', roomsCleared: 1, kills: 0, timeSec: 6 }); // run 3 -> .bak holds run 2
  const t3 = ls.getItem(PROFILE_KEY);
  ls.setItem(PROFILE_KEY, t3.slice(0, 30));
  C.prof.addPlaytime(1);
  C.prof.flush();
  check('10 a stale tab adopts a newer .bak over its own older copy', stored(ls).records.runs >= 2, sum(stored(ls)));
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
