// Player profile — high scores, records, unlocks, lifetime playtime
// (docs/gauntlet/PLAN.md §3.4 "Profile"). Owner: M2.
//
// echoes.profile.v1 = { v: 1, highScores: [top 10 { score, act, victory,
//   roomsCleared, kills, timeSec, seed, challenge, date }], records: { runs,
//   victories, defeats, bestScore, fastestVictorySec: {1,2,3}, mostKills,
//   deepestRoom: {1,2,3} }, unlocks: { acts: [1] }, lastAct, playtimeSec }
// Written with the same atomic tmp/bak protocol as a slot; a corrupt file
// falls back to its .bak, else to a fresh profile (the unreadable text is
// kept under .corrupt and the loader reports it for a toast).
//
// SCORE (binding formula, PLAN §3.4):
//   round((100 x roomsCleared + 5 x kills + 1000 x victory) x actMul x challengeMul)
//     + (victory ? max(0, 900 - timeSec) : 0)
//   actMul 1.0 / 1.5 / 2.0 · challengeMul relaxed 0.75 / standard 1 / harrowing 1.5
import { PROFILE_KEY } from './storage.js';

export const ACT_MUL = Object.freeze({ 1: 1.0, 2: 1.5, 3: 2.0 });
export const CHALLENGE_MUL = Object.freeze({ relaxed: 0.75, standard: 1, harrowing: 1.5 });
const MAX_SCORES = 10;

export function scoreRun({ roomsCleared = 0, kills = 0, victory = false, act = 1, challenge = 'standard', timeSec = 0 }) {
  const actMul = ACT_MUL[act] ?? 1;
  const chMul = CHALLENGE_MUL[challenge] ?? 1;
  const base = Math.round((100 * roomsCleared + 5 * kills + 1000 * (victory ? 1 : 0)) * actMul * chMul);
  return base + (victory ? Math.max(0, 900 - Math.round(timeSec)) : 0);
}

export function freshProfile() {
  return {
    v: 1,
    highScores: [],
    records: {
      runs: 0,
      victories: 0,
      defeats: 0,
      bestScore: 0,
      fastestVictorySec: { 1: null, 2: null, 3: null },
      mostKills: 0,
      deepestRoom: { 1: 0, 2: 0, 3: 0 },
    },
    unlocks: { acts: [1] },
    lastAct: null,
    playtimeSec: 0,
  };
}

function sane(p) {
  if (!p || typeof p !== 'object' || p.v !== 1) return null;
  const f = freshProfile();
  const out = { ...f, ...p };
  out.highScores = Array.isArray(p.highScores) ? p.highScores.filter((h) => h && Number.isFinite(h.score)).slice(0, MAX_SCORES) : [];
  out.records = { ...f.records, ...(p.records || {}) };
  out.records.fastestVictorySec = { ...f.records.fastestVictorySec, ...((p.records && p.records.fastestVictorySec) || {}) };
  out.records.deepestRoom = { ...f.records.deepestRoom, ...((p.records && p.records.deepestRoom) || {}) };
  out.unlocks = { acts: Array.isArray(p.unlocks && p.unlocks.acts) ? [...new Set([1, ...p.unlocks.acts])].sort((a, b) => a - b) : [1] };
  out.playtimeSec = Number.isFinite(p.playtimeSec) ? p.playtimeSec : 0;
  return out;
}

export function createProfileStore({ store, now = () => new Date().toISOString() }) {
  let profile = freshProfile();
  let report = { status: 'fresh', detail: null };
  let dirty = false;

  function parse(text) {
    try {
      return sane(JSON.parse(text));
    } catch {
      return null;
    }
  }

  function load() {
    // A valid tmp newer than the main copy = a write torn before its main step.
    const main = store.read(PROFILE_KEY);
    const tmp = store.read(`${PROFILE_KEY}.tmp`);
    if (tmp !== null) {
      const t = parse(tmp);
      const m = main !== null ? parse(main) : null;
      if (t && (!m || String(t.savedAt || '') > String(m.savedAt || ''))) {
        if (store.writeAtomic(PROFILE_KEY, tmp).ok) report = { status: 'promoted', detail: 'a newer profile write was completed' };
      } else store.remove(`${PROFILE_KEY}.tmp`);
    }
    const text = store.read(PROFILE_KEY);
    if (text === null) {
      profile = freshProfile();
      if (report.status !== 'promoted') report = { status: 'fresh', detail: null };
      return profile;
    }
    const p = parse(text);
    if (p) {
      profile = p;
      if (report.status !== 'promoted') report = { status: 'ok', detail: null };
      return profile;
    }
    // Corrupt main: keep the unreadable text aside, try the backup.
    store.writePlain(`${PROFILE_KEY}.corrupt`, text);
    const bak = store.read(`${PROFILE_KEY}.bak`);
    const b = bak !== null ? parse(bak) : null;
    if (b) {
      profile = b;
      store.writeAtomic(PROFILE_KEY, JSON.stringify(b));
      report = { status: 'backup', detail: 'the records file was unreadable — restored the backup' };
    } else {
      profile = freshProfile();
      report = { status: 'recovered', detail: 'the records file was unreadable — records were reset' };
    }
    return profile;
  }

  function persist() {
    profile.savedAt = now();
    const r = store.writeAtomic(PROFILE_KEY, JSON.stringify(profile));
    dirty = !r.ok;
    return r;
  }

  // recordRun(summary + kills) -> { score, rank (1-based, null if not top 10), newBest, entry, records }
  function recordRun({ act = 1, victory = false, roomsCleared = 0, kills = 0, timeSec = 0, seed = null, challenge = 'standard', lastRoom = 0 }) {
    const score = scoreRun({ roomsCleared, kills, victory, act, challenge, timeSec });
    const entry = {
      score,
      act,
      victory: !!victory,
      roomsCleared,
      kills,
      timeSec: Math.round(timeSec),
      seed,
      challenge,
      date: now(),
    };
    const r = profile.records;
    const prevBest = r.bestScore;
    r.runs += 1;
    if (victory) r.victories += 1;
    else r.defeats += 1;
    if (score > r.bestScore) r.bestScore = score;
    if (kills > r.mostKills) r.mostKills = kills;
    const deep = victory ? 8 : Math.max(0, lastRoom);
    if (deep > (r.deepestRoom[act] ?? 0)) r.deepestRoom[act] = deep;
    if (victory) {
      const cur = r.fastestVictorySec[act];
      if (cur === null || cur === undefined || entry.timeSec < cur) r.fastestVictorySec[act] = entry.timeSec;
      const next = act + 1;
      if (next <= 3 && !profile.unlocks.acts.includes(next)) {
        profile.unlocks.acts.push(next);
        profile.unlocks.acts.sort((a, b) => a - b);
      }
    }
    profile.lastAct = act;
    const list = [...profile.highScores, entry].sort((a, b) => b.score - a.score || String(a.date).localeCompare(String(b.date)));
    const rank = list.indexOf(entry);
    profile.highScores = list.slice(0, MAX_SCORES);
    const w = persist();
    return {
      score,
      rank: rank >= 0 && rank < MAX_SCORES ? rank + 1 : null,
      newBest: score > prevBest,
      prevBest,
      entry,
      written: w.ok,
      error: w.ok ? null : w.error,
    };
  }

  function addPlaytime(sec) {
    if (!(sec > 0)) return;
    profile.playtimeSec = Math.round((profile.playtimeSec + sec) * 10) / 10;
    dirty = true;
  }
  function noteRunStart(act) {
    profile.lastAct = act;
    dirty = true;
  }

  load();
  return {
    get: () => profile,
    load,
    persist,
    flush: () => (dirty ? persist() : { ok: true }),
    recordRun,
    addPlaytime,
    noteRunStart,
    get report() {
      return report;
    },
    reset() {
      profile = freshProfile();
      return persist();
    },
  };
}
