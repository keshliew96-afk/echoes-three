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
//
// CAMPAIGN (2026-09-25, PLAN §12.8 — the linear campaign). Profile v1 + new
// keys (a v1 file without them loads with the defaults): records.campaigns,
// campaignsCompleted, abandoned, furthestLevel, fastestCampaignSec (a full
// campaign from Level 1 only — a Level-N start is not a speedrun of the
// campaign), levelClears {1,2,3}; high-score entries gain levels (cleared),
// startLevel, campaign, result. Unlocks: clearing Level N unlocks N+1 the
// moment its Stag room clears (noteLevelClear, an atomic write), campaign or
// single run, mid-campaign included. Campaign SCORE (generalises the formula
// above — identical for one level):
//   round(sum over levels (100 rooms_L + 5 kills_L + 1000 cleared_L) actMul_L x challengeMul)
//     + (complete ? max(0, 900 x levelsPlayed - timeSec) : 0)
import { PROFILE_KEY } from './storage.js';
import { CAMPAIGN_LEVELS, FIRST_LEVEL, nextLevel } from '../data/campaign.js';

export const ACT_MUL = Object.freeze({ 1: 1.0, 2: 1.5, 3: 2.0 });
export const CHALLENGE_MUL = Object.freeze({ relaxed: 0.75, standard: 1, harrowing: 1.5 });
const MAX_SCORES = 10;

export function scoreRun({ roomsCleared = 0, kills = 0, victory = false, act = 1, challenge = 'standard', timeSec = 0 }) {
  const actMul = ACT_MUL[act] ?? 1;
  const chMul = CHALLENGE_MUL[challenge] ?? 1;
  const base = Math.round((100 * roomsCleared + 5 * kills + 1000 * (victory ? 1 : 0)) * actMul * chMul);
  return base + (victory ? Math.max(0, 900 - Math.round(timeSec)) : 0);
}

// scoreCampaign({ levels: [{ level, rooms, kills, cleared }], challenge,
// complete, timeSec }) — PLAN §12.8. One level = scoreRun exactly.
export function scoreCampaign({ levels = [], challenge = 'standard', complete = false, timeSec = 0 }) {
  const chMul = CHALLENGE_MUL[challenge] ?? 1;
  let sum = 0;
  for (const l of levels) {
    const actMul = ACT_MUL[l.level] ?? 1;
    sum += (100 * (l.rooms || 0) + 5 * (l.kills || 0) + 1000 * (l.cleared ? 1 : 0)) * actMul;
  }
  const played = Math.max(1, levels.length);
  return Math.round(sum * chMul) + (complete ? Math.max(0, 900 * played - Math.round(timeSec)) : 0);
}

const perLevel = (v) => Object.fromEntries(CAMPAIGN_LEVELS.map((l) => [l, v]));

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
      // CAMPAIGN (PLAN §12.8)
      campaigns: 0,
      campaignsCompleted: 0,
      abandoned: 0,
      furthestLevel: 0,
      fastestCampaignSec: null,
      levelClears: perLevel(0),
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
  out.records.levelClears = { ...f.records.levelClears, ...((p.records && p.records.levelClears) || {}) };
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

  // Unlock `level` (idempotent). Returns true when it was newly unlocked.
  function unlockLevel(level) {
    const n = Number(level);
    if (!CAMPAIGN_LEVELS.includes(n) || profile.unlocks.acts.includes(n)) return false;
    profile.unlocks.acts.push(n);
    profile.unlocks.acts.sort((a, b) => a - b);
    return true;
  }

  // CAMPAIGN (PLAN §12.7 / §12.8): a level's Stag room cleared — Level N+1
  // unlocks now (mid-campaign too), the level's clear count and the furthest
  // level move, and the profile is written at once (atomic) so a crash, a
  // Quit to Lobby or a reload never loses the unlock.
  function noteLevelClear(level) {
    const n = Number(level);
    if (!CAMPAIGN_LEVELS.includes(n)) return { ok: false };
    const r = profile.records;
    r.levelClears[n] = (r.levelClears[n] ?? 0) + 1;
    if (n > (r.furthestLevel ?? 0)) r.furthestLevel = n;
    const nx = nextLevel(n);
    const unlocked = nx !== null ? unlockLevel(nx) : false;
    const w = persist();
    return { ok: w.ok, level: n, next: nx, unlocked, clears: r.levelClears[n] };
  }
  // A level entered (run start / level start): the furthest level reached.
  function noteLevelReached(level) {
    const n = Number(level);
    if (!CAMPAIGN_LEVELS.includes(n)) return false;
    if (n > (profile.records.furthestLevel ?? 0)) {
      profile.records.furthestLevel = n;
      dirty = true;
      return true;
    }
    return false;
  }

  // recordRun(summary + kills) -> { score, rank (1-based, null if not top 10), newBest, entry, records }
  // `result` 'victory' | 'defeat' | 'abandoned' (Quit to Lobby; falls back to
  // `victory`). `campaign` (PLAN §12.8) = { mode, startLevel, level,
  // levels: [{ level, rooms, kills, cleared, ticks }], levelsCleared, complete }.
  function recordRun({ act = 1, victory = false, result = null, roomsCleared = 0, kills = 0, timeSec = 0, seed = null, challenge = 'standard', lastRoom = 0, campaign = null }) {
    const res = result === 'abandoned' || result === 'defeat' || result === 'victory' ? result : victory ? 'victory' : 'defeat';
    const camp = campaign && campaign.mode === 'campaign' && Array.isArray(campaign.levels) && campaign.levels.length ? campaign : null;
    const complete = !!(camp ? camp.complete : res === 'victory');
    const score = camp
      ? scoreCampaign({ levels: camp.levels, challenge, complete, timeSec })
      : scoreRun({ roomsCleared, kills, victory: res === 'victory', act, challenge, timeSec });
    const entry = {
      score,
      act,
      victory: res === 'victory',
      result: res,
      roomsCleared,
      kills,
      timeSec: Math.round(timeSec),
      seed,
      challenge,
      date: now(),
      // CAMPAIGN
      campaign: !!camp,
      startLevel: camp ? camp.startLevel ?? act : act,
      levels: camp ? camp.levels.filter((l) => l.cleared).length : res === 'victory' ? 1 : 0,
    };
    const r = profile.records;
    const prevBest = r.bestScore;
    r.runs += 1;
    if (res === 'victory') r.victories += 1;
    else if (res === 'abandoned') r.abandoned = (r.abandoned ?? 0) + 1;
    else r.defeats += 1;
    if (score > r.bestScore) r.bestScore = score;
    if (kills > r.mostKills) r.mostKills = kills;
    // Per level: deepest room, fastest clear (a campaign's cleared levels
    // each count with their own clear time).
    const lvls = camp ? camp.levels : [{ level: act, rooms: roomsCleared, cleared: res === 'victory', ticks: Math.round(timeSec * 60) }];
    lvls.forEach((l, i) => {
      const a = l.level;
      const last = i === lvls.length - 1;
      const deep = l.cleared ? 8 : last ? Math.max(0, lastRoom) : l.rooms || 0;
      if (deep > (r.deepestRoom[a] ?? 0)) r.deepestRoom[a] = deep;
      if (l.cleared) {
        const sec = Math.round((l.ticks || 0) / 60);
        const cur = r.fastestVictorySec[a];
        if (sec > 0 && (cur === null || cur === undefined || sec < cur)) r.fastestVictorySec[a] = sec;
        const nx = nextLevel(a);
        if (nx !== null) unlockLevel(nx);
      }
      if (a > (r.furthestLevel ?? 0)) r.furthestLevel = a;
    });
    if (camp) {
      r.campaigns = (r.campaigns ?? 0) + 1;
      if (complete) {
        r.campaignsCompleted = (r.campaignsCompleted ?? 0) + 1;
        const from1 = (camp.startLevel ?? act) === FIRST_LEVEL;
        if (from1 && (r.fastestCampaignSec === null || r.fastestCampaignSec === undefined || entry.timeSec < r.fastestCampaignSec)) {
          r.fastestCampaignSec = entry.timeSec;
        }
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
    noteLevelClear, // CAMPAIGN
    noteLevelReached, // CAMPAIGN
    unlockLevel, // CAMPAIGN
    get report() {
      return report;
    },
    reset() {
      profile = freshProfile();
      return persist();
    },
  };
}
