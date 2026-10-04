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
//
// ENDLESS (docs/ENDLESS.md): records.gameWon (any campaign completed, an
// endless descent's Depth 3 included), endlessRuns, endlessBestDepth (the
// deepest depth an endless descent reached); an endless high-score entry
// gains `depth`. A level played past Depth 3 scores at actMul 2.0 + 0.5 per
// depth beyond 3 and stays out of the per-level records (deepest room,
// fastest clear), which keep meaning "the campaign's own levels".
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
    const deep = (l.index ?? 0) > CAMPAIGN_LEVELS.length; // ENDLESS: past Depth 3
    const actMul = deep ? ACT_MUL[CAMPAIGN_LEVELS.length] + 0.5 * (l.index - CAMPAIGN_LEVELS.length) : ACT_MUL[l.level] ?? 1;
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
      // ENDLESS (docs/ENDLESS.md)
      gameWon: false,
      endlessRuns: 0,
      endlessBestDepth: 0,
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
  // ENDLESS: a profile from before the flag that completed a campaign has won.
  out.records.gameWon = !!(out.records.gameWon || out.records.campaignsCompleted > 0);
  out.unlocks = { acts: Array.isArray(p.unlocks && p.unlocks.acts) ? [...new Set([1, ...p.unlocks.acts])].sort((a, b) => a - b) : [1] };
  out.playtimeSec = Number.isFinite(p.playtimeSec) ? p.playtimeSec : 0;
  return out;
}

// SEVERAL TABS (gauntlet r4, SAVE4-F1). Every open tab of the game holds its
// own copy of the profile, and another tab may write the file at any moment
// (a run recorded, a level unlocked). A tab never writes its copy blindly
// over the file: every write re-reads the stored profile first (sync) and
// replays only THIS tab's own changes on top of it — its pending ops (a run
// recorded, a level cleared) and its deferred counters (playtime, last level,
// furthest level). So a stale tab that is played again and then reloaded,
// closed or navigated away adds its playtime and nothing else: it never takes
// back a high score, a record or an unlock another tab earned. Ops whose
// write failed (quota) stay pending and ride the next write. index.js also
// runs sync() on the `storage` event, so an open Records screen, Level Select
// or portal in the other tab shows the new state without a reload.
export function createProfileStore({ store, now = () => new Date().toISOString() }) {
  let base = freshProfile(); // the stored profile this tab last read or wrote
  let baseText = null; // its text as stored (null: nothing stored yet)
  let profile = base; // base + this tab's unwritten changes (what the game shows)
  let pending = []; // this tab's ops not yet in storage: { apply(p) -> result }
  const noDeferred = () => ({ playtimeSec: 0, lastAct: null, furthest: 0 });
  let deferred = noDeferred(); // counters that ride the next write (flush)
  let report = { status: 'fresh', detail: null };
  const syncLog = []; // debug: the last 10 adoptions of another tab's write

  function parse(text) {
    try {
      return sane(JSON.parse(text));
    } catch {
      return null;
    }
  }
  const clone = (p) => sane(JSON.parse(JSON.stringify(p))) ?? freshProfile();
  // .bak only ever receives a readable profile (a torn main never replaces it)
  const keepAsBackup = (cur) => parse(cur) !== null;
  const hasDeferred = () => deferred.playtimeSec > 0 || deferred.lastAct !== null || deferred.furthest > 0;
  const isDirty = () => pending.length > 0 || hasDeferred();
  // A stored main that no longer parses: the next flush repairs it from the
  // newest readable copy (sync) even when this tab has nothing of its own.
  const mainDamaged = () => {
    const t = store.read(PROFILE_KEY);
    return t !== null && parse(t) === null;
  };

  function applyDeferred(p) {
    if (deferred.playtimeSec > 0) p.playtimeSec = Math.round((p.playtimeSec + deferred.playtimeSec) * 10) / 10;
    if (deferred.lastAct !== null) p.lastAct = deferred.lastAct;
    if (deferred.furthest > (p.records.furthestLevel ?? 0)) p.records.furthestLevel = deferred.furthest;
  }
  // The view = the stored base + this tab's pending ops + deferred counters.
  // Returns what `want` (one of the pending ops) returned in this rebuild.
  function rebuild(want = null) {
    const view = clone(base);
    let out;
    for (const op of pending) {
      const r = op.apply(view);
      if (op === want) out = r;
    }
    applyDeferred(view);
    profile = view;
    return out;
  }

  // Adopt what storage holds now (another tab may have written it). A main
  // that is gone (cleared site data) keeps this tab's copy: the next write
  // puts it back. A DAMAGED main is replaced by the newest readable copy —
  // this tab's own, the .bak or a torn write's .tmp, by savedAt — never by a
  // backup older than what this tab already holds. -> true when it changed.
  function sync() {
    const text = store.read(PROFILE_KEY);
    if (text === baseText) return false;
    let p = text !== null ? parse(text) : null;
    if (!p && text !== null) {
      let best = null;
      for (const k of [`${PROFILE_KEY}.bak`, `${PROFILE_KEY}.tmp`]) {
        const t = store.read(k);
        const c = t !== null ? parse(t) : null;
        if (c && (!best || String(c.savedAt || '') > String(best.savedAt || ''))) best = c;
      }
      p = best && String(best.savedAt || '') > String(base.savedAt || '') ? best : null;
      if (!p) {
        baseText = text; // keep this tab's copy; the next write repairs main
        return false;
      }
    }
    if (!p) return false;
    base = p;
    baseText = text;
    rebuild();
    syncLog.push({ at: Date.now(), savedAt: p.savedAt ?? null, highScores: p.highScores.length, unlocks: p.unlocks.acts.slice(), pending: pending.length });
    if (syncLog.length > 10) syncLog.shift();
    return true;
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
      base = freshProfile();
      baseText = null;
      rebuild();
      if (report.status !== 'promoted') report = { status: 'fresh', detail: null };
      return profile;
    }
    const p = parse(text);
    if (p) {
      base = p;
      baseText = text;
      rebuild();
      if (report.status !== 'promoted') report = { status: 'ok', detail: null };
      return profile;
    }
    // Corrupt main: keep the unreadable text aside, try the backup.
    store.writePlain(`${PROFILE_KEY}.corrupt`, text);
    const bak = store.read(`${PROFILE_KEY}.bak`);
    const b = bak !== null ? parse(bak) : null;
    if (b) {
      base = b;
      const bt = JSON.stringify(b);
      baseText = store.writeAtomic(PROFILE_KEY, bt).ok ? bt : text;
      report = { status: 'backup', detail: 'the records file was unreadable — restored the backup' };
    } else {
      base = freshProfile();
      baseText = text;
      report = { status: 'recovered', detail: 'the records file was unreadable — records were reset' };
    }
    rebuild();
    return profile;
  }

  // Write: storage's current profile + this tab's changes. A failed write
  // (quota, blocked storage) keeps them pending for the next write.
  function persist() {
    sync();
    rebuild();
    profile.savedAt = now();
    const text = JSON.stringify(profile);
    const r = store.writeAtomic(PROFILE_KEY, text, { backupIf: keepAsBackup });
    if (r.ok) {
      base = profile;
      baseText = text;
      pending = [];
      deferred = noDeferred();
      rebuild();
    }
    return r;
  }
  // Apply one op to the freshest stored profile and write it at once.
  function commit(apply) {
    sync();
    const op = { apply };
    pending.push(op);
    const result = rebuild(op);
    const w = persist();
    return { result, w };
  }

  // Unlock `level` in `p` (idempotent). Returns true when it was newly unlocked.
  function unlockIn(p, level) {
    const n = Number(level);
    if (!CAMPAIGN_LEVELS.includes(n) || p.unlocks.acts.includes(n)) return false;
    p.unlocks.acts.push(n);
    p.unlocks.acts.sort((a, b) => a - b);
    return true;
  }
  function unlockLevel(level) {
    const n = Number(level);
    if (!CAMPAIGN_LEVELS.includes(n)) return false;
    sync();
    if (profile.unlocks.acts.includes(n)) return false;
    return commit((p) => unlockIn(p, n)).result === true;
  }

  // CAMPAIGN (PLAN §12.7 / §12.8): a level's Stag room cleared — Level N+1
  // unlocks now (mid-campaign too), the level's clear count and the furthest
  // level move, and the profile is written at once (atomic) so a crash, a
  // Quit to Lobby or a reload never loses the unlock.
  function noteLevelClear(level) {
    const n = Number(level);
    if (!CAMPAIGN_LEVELS.includes(n)) return { ok: false };
    const nx = nextLevel(n);
    const { result, w } = commit((p) => {
      const r = p.records;
      r.levelClears[n] = (r.levelClears[n] ?? 0) + 1;
      if (n > (r.furthestLevel ?? 0)) r.furthestLevel = n;
      const unlocked = nx !== null ? unlockIn(p, nx) : false;
      return { unlocked, clears: r.levelClears[n] };
    });
    return { ok: w.ok, level: n, next: nx, unlocked: result.unlocked, clears: result.clears };
  }
  // A level entered (run start / level start): the furthest level reached.
  function noteLevelReached(level) {
    const n = Number(level);
    if (!CAMPAIGN_LEVELS.includes(n)) return false;
    if (n > (profile.records.furthestLevel ?? 0)) {
      deferred.furthest = Math.max(deferred.furthest, n);
      rebuild();
      return true;
    }
    return false;
  }

  // recordRun(summary + kills) -> { score, rank (1-based, null if not top 10), newBest, entry, records }
  // `result` 'victory' | 'defeat' | 'abandoned' (Quit to Lobby; falls back to
  // `victory`). `campaign` (PLAN §12.8) = { mode, startLevel, level,
  // levels: [{ level, rooms, kills, cleared, ticks }], levelsCleared, complete }.
  // Rank and "New best" are measured against the freshest stored profile
  // (another tab's runs included).
  function recordRun({ act = 1, victory = false, result = null, roomsCleared = 0, kills = 0, timeSec = 0, seed = null, challenge = 'standard', lastRoom = 0, campaign = null, builds = null }) {
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
      ...(camp && camp.endless ? { depth: camp.depth ?? camp.index } : {}),
    };
    // PARTY (PLAN §16.6): the four builds of the run (a new optional key).
    if (Array.isArray(builds) && builds.length) entry.party = builds.map((b) => ({ classId: b.classId, skills: (b.skills || []).slice(0, 4), filled: b.filled | 0 }));
    const { result: out, w } = commit((p) => {
      const r = p.records;
      const prevBest = r.bestScore;
      const prevDepth = r.endlessBestDepth ?? 0;
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
        if (camp && camp.endless && (l.index ?? 0) > CAMPAIGN_LEVELS.length) return; // ENDLESS: past Depth 3
        const a = l.level;
        const last = i === lvls.length - 1;
        const deep = l.cleared ? 8 : last ? Math.max(0, lastRoom) : l.rooms || 0;
        if (deep > (r.deepestRoom[a] ?? 0)) r.deepestRoom[a] = deep;
        if (l.cleared) {
          const sec = Math.round((l.ticks || 0) / 60);
          const cur = r.fastestVictorySec[a];
          if (sec > 0 && (cur === null || cur === undefined || sec < cur)) r.fastestVictorySec[a] = sec;
          const nx = nextLevel(a);
          if (nx !== null) unlockIn(p, nx);
        }
        if (a > (r.furthestLevel ?? 0)) r.furthestLevel = a;
      });
      if (camp && complete) r.gameWon = true;
      if (camp && camp.endless) {
        r.endlessRuns = (r.endlessRuns ?? 0) + 1;
        if (entry.depth > prevDepth) r.endlessBestDepth = entry.depth;
      }
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
      p.lastAct = act;
      const mine = { ...entry };
      const list = [...p.highScores, mine].sort((a, b) => b.score - a.score || String(a.date).localeCompare(String(b.date)));
      const rank = list.indexOf(mine);
      p.highScores = list.slice(0, MAX_SCORES);
      return { prevBest, prevDepth, rank };
    });
    return {
      score,
      rank: out.rank >= 0 && out.rank < MAX_SCORES ? out.rank + 1 : null,
      newBest: score > out.prevBest,
      prevBest: out.prevBest,
      ...(entry.depth ? { endless: { depth: entry.depth, prevBestDepth: out.prevDepth, newDepthRecord: entry.depth > out.prevDepth } } : {}),
      entry,
      written: w.ok,
      error: w.ok ? null : w.error,
    };
  }

  function addPlaytime(sec) {
    if (!(sec > 0)) return;
    deferred.playtimeSec += sec;
    rebuild();
  }
  function noteRunStart(act) {
    deferred.lastAct = act;
    rebuild();
  }

  load();
  return {
    get: () => profile,
    load,
    persist,
    sync, // SAVE4-F1: adopt another tab's write (the `storage` event)
    flush: () => (isDirty() || mainDamaged() ? persist() : { ok: true }),
    recordRun,
    addPlaytime,
    noteRunStart,
    noteLevelClear, // CAMPAIGN
    noteLevelReached, // CAMPAIGN
    unlockLevel, // CAMPAIGN
    get report() {
      return report;
    },
    // debug (SAVE4-F1): what this tab has not written yet + recent adoptions
    debugState: () => ({
      pending: pending.length,
      deferred: { ...deferred },
      dirty: isDirty(),
      baseSavedAt: base.savedAt ?? null,
      syncLog: syncLog.map((r) => ({ ...r })),
    }),
    // Records reset (explicit, this tab's choice): a fresh profile replaces
    // the stored one; nothing this tab had pending survives it.
    reset() {
      pending = [];
      deferred = noDeferred();
      base = freshProfile();
      baseText = null;
      rebuild();
      profile.savedAt = now();
      const text = JSON.stringify(profile);
      const r = store.writeAtomic(PROFILE_KEY, text, { backupIf: keepAsBackup });
      if (r.ok) {
        base = profile;
        baseText = text;
        rebuild();
      }
      return r;
    },
  };
}
