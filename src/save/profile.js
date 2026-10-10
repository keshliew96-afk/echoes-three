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
//
// UNLOCKS (docs/UNLOCKS.md): profile v1 + `meta` (Embers, owned unlocks,
// deeds, bosses felled, relics found, the equipped loadout, the last award),
// versioned on its own and sanitised by data/unlocks.js saneMeta(). awardRun
// pays a finished run; buyUnlock / equipUnlock / clearLoadout are the Unlocks
// screen's writes. All go through commit() (atomic, multi-tab safe); a
// records reset keeps `meta`.
import { PROFILE_KEY } from './storage.js';
import { CAMPAIGN_LEVELS, FIRST_LEVEL, nextLevel } from '../data/campaign.js';
import { freshMeta, saneMeta, runFacts, awardFor, grantFree, UNLOCKS, reqMet, FEATS, featsOf, marksAfter } from '../data/unlocks.js';

export const ACT_MUL = Object.freeze({ 1: 1.0, 2: 1.5, 3: 2.0, 4: 2.5 });
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
    const deep = (l.index ?? 0) > CAMPAIGN_LEVELS.length; // ENDLESS: past the campaign's depths
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
      fastestVictorySec: { 1: null, 2: null, 3: null, 4: null },
      mostKills: 0,
      deepestRoom: { 1: 0, 2: 0, 3: 0, 4: 0 },
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
      // BOSS RUSH (docs/BOSS_RUSH.md): rushes run, the most bosses one rush
      // felled, and the fastest full rush (seconds; null until one is won).
      rushRuns: 0,
      rushMostFelled: 0,
      rushBestSec: null,
    },
    unlocks: { acts: [1] },
    lastAct: null,
    playtimeSec: 0,
    // CROSS-RUN UNLOCKS (docs/UNLOCKS.md): Embers, owned unlocks, deeds and
    // the equipped loadout. Versioned on its own (`mv`): saneMeta() lifts any
    // older or damaged block to the current shape, so a v1 profile without it
    // loads with a fresh one.
    meta: freshMeta(),
    // THE HEARTH SONG (docs/STORY.md): the story beats this player has seen
    // (the prologue, each boss's Hollow Voice line) and how many times they
    // met each recurring NPC. A profile without it loads with a fresh one.
    story: freshStory(),
    // THE JOURNAL (docs/JOURNAL.md): what this player has met, per kind, each
    // id with a count (enemies and bosses felled, relics taken, curses borne,
    // event rooms entered; 0 = met but never counted). A profile without it
    // loads with a fresh one.
    journal: freshJournal(),
  };
}

export const JOURNAL_KINDS = Object.freeze(['enemy', 'boss', 'relic', 'curse', 'event']);
export function freshJournal() {
  return { seen: Object.fromEntries(JOURNAL_KINDS.map((k) => [k, {}])) };
}
export function saneJournal(j) {
  const out = freshJournal();
  if (!j || typeof j !== 'object' || !j.seen || typeof j.seen !== 'object') return out;
  for (const k of JOURNAL_KINDS) {
    const m = j.seen[k];
    if (!m || typeof m !== 'object') continue;
    for (const [id, n] of Object.entries(m).slice(0, 200)) if (STORY_ID.test(id) && Number.isFinite(n) && n >= 0) out.seen[k][id] = Math.min(999999, Math.floor(n));
  }
  return out;
}

export function freshStory() {
  return { seen: [], met: {} };
}
const STORY_ID = /^[a-z0-9_:-]{1,40}$/;
export function saneStory(s) {
  const out = freshStory();
  if (!s || typeof s !== 'object') return out;
  if (Array.isArray(s.seen)) out.seen = [...new Set(s.seen.filter((x) => typeof x === 'string' && STORY_ID.test(x)))].slice(0, 200);
  if (s.met && typeof s.met === 'object') {
    for (const [k, v] of Object.entries(s.met)) if (STORY_ID.test(k) && Number.isFinite(v) && v > 0) out.met[k] = Math.min(9999, Math.floor(v));
  }
  return out;
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
  out.meta = saneMeta(p.meta);
  out.story = saneStory(p.story);
  out.journal = saneJournal(p.journal);
  return out;
}

// A stored profile's text -> the profile, or null (cloud / backup bundles).
export function parseProfile(text) {
  try {
    return sane(JSON.parse(text));
  } catch {
    return null;
  }
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
  // THE HEARTH SONG (docs/STORY.md): a story beat seen (idempotent; true
  // when it was new) and a recurring NPC met (returns the meeting number).
  function noteStory(id) {
    if (typeof id !== 'string' || !STORY_ID.test(id)) return false;
    sync();
    if (profile.story.seen.includes(id)) return false;
    return commit((p) => {
      if (p.story.seen.includes(id)) return false;
      p.story.seen.push(id);
      return true;
    }).result === true;
  }
  function meetNpc(id) {
    if (typeof id !== 'string' || !STORY_ID.test(id)) return 0;
    return commit((p) => {
      p.story.met[id] = (p.story.met[id] ?? 0) + 1;
      return p.story.met[id];
    }).result;
  }

  // THE JOURNAL (docs/JOURNAL.md): a batch of meetings, { kind: { id: n } }
  // (n = how many to add; 0 = met). One atomic write per batch.
  function noteJournal(batch) {
    if (!batch || typeof batch !== 'object') return false;
    const clean = saneJournal({ seen: batch }).seen;
    if (!JOURNAL_KINDS.some((k) => Object.keys(clean[k]).length)) return false;
    return commit((p) => {
      p.journal = saneJournal(p.journal);
      for (const k of JOURNAL_KINDS) for (const [id, n] of Object.entries(clean[k])) p.journal.seen[k][id] = Math.min(999999, (p.journal.seen[k][id] ?? 0) + n);
      return true;
    }).w.ok;
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
    const camp0 = campaign && campaign.mode === 'campaign' && Array.isArray(campaign.levels) && campaign.levels.length ? campaign : null;
    // BOSS RUSH (docs/BOSS_RUSH.md): a rush keeps its own records only (no
    // level records, no score on the campaign table, never a won game).
    const rush = camp0 && camp0.rush ? camp0.rush : null;
    if (rush) return recordRush({ rush, res, timeSec, seed, challenge, builds });
    const camp = camp0;
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

  function recordRush({ rush, res, timeSec, seed, challenge, builds }) {
    const felled = Math.max(0, rush.felled | 0);
    const sec = Math.round(timeSec);
    const won = !!rush.won && res === 'victory';
    const entry = { score: 0, rush: true, felled, fights: rush.fights | 0, won, result: res, timeSec: sec, seed, challenge, date: now() };
    if (Array.isArray(builds) && builds.length) entry.party = builds.map((b) => ({ classId: b.classId, skills: (b.skills || []).slice(0, 4), filled: b.filled | 0 }));
    const { result: out, w } = commit((p) => {
      const r = p.records;
      const prevBestSec = r.rushBestSec ?? null;
      r.runs += 1;
      if (res === 'victory') r.victories += 1;
      else if (res === 'abandoned') r.abandoned = (r.abandoned ?? 0) + 1;
      else r.defeats += 1;
      r.rushRuns = (r.rushRuns ?? 0) + 1;
      if (felled > (r.rushMostFelled ?? 0)) r.rushMostFelled = felled;
      const newBest = won && sec > 0 && (prevBestSec === null || sec < prevBestSec);
      if (newBest) r.rushBestSec = sec;
      return { prevBestSec, newBest, bestSec: r.rushBestSec ?? null };
    });
    return {
      score: 0,
      rank: null,
      newBest: false,
      prevBest: null,
      rush: { felled, won, sec, newBest: out.newBest, prevBestSec: out.prevBestSec, bestSec: out.bestSec },
      entry,
      written: w.ok,
      error: w.ok ? null : w.error,
    };
  }

  // CROSS-RUN UNLOCKS (docs/UNLOCKS.md). awardRun: a finished run's Embers,
  // deeds, bosses felled and relics found, plus any free unlock whose
  // requirement is now met. Runs after recordRun (records include this run).
  function awardRun(summary) {
    const { result, w } = commit((p) => {
      const m = p.meta;
      const facts = runFacts(summary, p.records);
      const a = awardFor(facts, m);
      m.embers += a.embers;
      m.earned += a.embers;
      for (const d of a.deeds) if (!m.deeds.includes(d)) m.deeds.push(d);
      for (const k of a.bosses) m.bosses[k] = (m.bosses[k] ?? 0) + 1;
      for (const r of facts.relics) if (!m.relicsSeen.includes(r)) m.relicsSeen.push(r);
      for (const f of a.feats || []) if (!m.feats.includes(f)) m.feats.push(f); // THE TIDECALLER
      m.marks = marksAfter(m.marks, facts); // ROUND TWO: the lifetime marks
      const freed = grantFree(m, p.records);
      m.lastAward = { at: now(), result: facts.result, embers: a.embers, lines: a.lines, deeds: a.deeds, unlocked: freed };
      return { ...a, unlocked: freed, balance: m.embers };
    });
    return { ...result, written: w.ok };
  }
  // Free unlocks whose requirement was met outside a run's award (a level
  // clear recorded before this build) — run on boot and on opening the screen.
  function grantFreeUnlocks() {
    sync();
    const probe = clone(profile);
    // THE TIDECALLER: feats the records already prove are stored first (a
    // Level II clear from before this build frees Rill on load).
    const lift = (m, rec) => {
      for (const f of featsOf(m, rec)) if (!m.feats.includes(f)) m.feats.push(f);
    };
    const before = probe.meta.feats.length;
    lift(probe.meta, probe.records);
    if (grantFree(probe.meta, probe.records).length === 0 && probe.meta.feats.length === before) return [];
    return commit((p) => {
      lift(p.meta, p.records);
      return grantFree(p.meta, p.records);
    }).result;
  }
  // THE TIDECALLER (docs/TIDECALLER.md): a feat earned mid-run (Rill joins on
  // the first Level II clear). True only the first time, so the caller can
  // toast it once. Free unlocks the feat opens are granted with it.
  function noteFeat(id) {
    if (!FEATS[id]) return false;
    sync();
    if (profile.meta.feats.includes(id)) return false;
    return !!commit((p) => {
      if (p.meta.feats.includes(id)) return false;
      p.meta.feats.push(id);
      grantFree(p.meta, p.records);
      return true;
    }).result;
  }
  // Buy an unlock: requirement met, enough Embers. Equipping is the
  // player's own pick, except a kit / heirloom / purse / tint bought now is
  // equipped at once (the press that bought it is the pick). Vows never are.
  function buyUnlock(id) {
    const u = UNLOCKS[id];
    if (!u) return { ok: false, reason: 'unknown' };
    sync();
    const m0 = profile.meta;
    if (m0.owned[id] !== undefined) return { ok: false, reason: 'owned' };
    if (!reqMet(u.req, { meta: m0, records: profile.records })) return { ok: false, reason: 'locked' };
    if (m0.embers < u.cost) return { ok: false, reason: 'poor', need: u.cost - m0.embers };
    const { result, w } = commit((p) => {
      const m = p.meta;
      if (m.owned[id] !== undefined || m.embers < u.cost) return false;
      m.embers -= u.cost;
      m.owned[id] = u.cost;
      if (u.kind !== 'vow') equipIn(m, id, true);
      return true;
    });
    return result ? { ok: true, id, balance: profile.meta.embers, written: w.ok } : { ok: false, reason: 'poor' };
  }
  // Equip (on = true) or take off one owned unlock.
  function equipIn(m, id, on) {
    const u = UNLOCKS[id];
    if (!u || m.owned[id] === undefined) return false;
    const l = m.loadout;
    if (u.kind === 'kit') l.kits[u.cls] = on ? id : l.kits[u.cls] === id ? null : l.kits[u.cls];
    else if (u.kind === 'tint') l.tints[u.cls] = on ? id : l.tints[u.cls] === id ? null : l.tints[u.cls];
    else if (u.kind === 'heirloom') l.heirloom = on ? id : l.heirloom === id ? null : l.heirloom;
    else if (u.kind === 'purse') l.purse = on ? u.tier : l.purse === u.tier ? 0 : l.purse;
    else if (u.kind === 'vow') l.vows = on ? [...new Set([...l.vows, id])] : l.vows.filter((v) => v !== id);
    return true;
  }
  function equipUnlock(id, on = true) {
    sync();
    if (!UNLOCKS[id] || profile.meta.owned[id] === undefined) return { ok: false, reason: 'not_owned' };
    const { result, w } = commit((p) => equipIn(p.meta, id, !!on));
    return { ok: !!result, id, on: !!on, written: w.ok };
  }
  // Take everything off (the Unlocks screen's "Plain run").
  function clearLoadout() {
    const { w } = commit((p) => {
      const keepTints = { ...p.meta.loadout.tints };
      p.meta = saneMeta({ ...p.meta, loadout: { tints: keepTints } });
      return true;
    });
    return { ok: w.ok };
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
    awardRun, // UNLOCKS
    noteStory, // THE HEARTH SONG
    meetNpc, // THE HEARTH SONG
    noteJournal, // THE JOURNAL
    // probe seam (tools/unlocks-net.mjs): add Embers as one atomic write
    debugEmbers: (n) => commit((p) => {
      p.meta.embers += Math.max(0, Math.round(n));
      p.meta.earned += Math.max(0, Math.round(n));
      return p.meta.embers;
    }).result,
    grantFreeUnlocks,
    noteFeat, // THE TIDECALLER
    buyUnlock,
    equipUnlock,
    clearLoadout,
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
      // UNLOCKS: a records reset clears scores and records, never the Embers
      // and unlocks the player earned (docs/UNLOCKS.md).
      const keepMeta = saneMeta(profile.meta);
      const keepStory = saneStory(profile.story);
      const keepJournal = saneJournal(profile.journal);
      base = freshProfile();
      base.meta = keepMeta;
      base.story = keepStory;
      base.journal = keepJournal;
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
