// The save service (docs/gauntlet/PLAN.md §3.4) — provide('save', api).
// Owner: M2. Built in main.js `@gnt:SAVE`; every entry point degrades
// honestly and nothing on a save/load path throws to the page.
//
//   capture() / apply(tree) / hash(tree?)      complete-state tree (capture.js)
//   list() · hasAny() · latest() · canSave()   slot catalogue (slots.js)
//   save(slot, { name, kind }) · load(slot)    atomic localStorage files (storage.js)
//   restoreBackup(slot) · remove(slot) · rename(slot, name)
//   exportSlot(slot) · importFile(File, slot?) JSON files on disk
//   autosave(reason) · resetToFresh({ seed })  safe points (autosave.js) · New Game
//   profile() · recordRun(summary)             high scores + records (profile.js)
//   flush()                                    Exit: write what is pending
//   debug                                      window.__echoes.save (PLAN §6.4)
//
// Capture point (§3.4 rule 6): capture/apply only at a tick boundary. A save
// requested while the world is stepping (from a bus listener) is deferred to
// the next clock.onTickEnd; a direct capture() mid-tick is refused with a
// CapturePointError instead of recording a half-resolved tick.
import { VERSION } from '../version.js';
import { hashState, fnv1a64Hex } from '../core/hash.js';
import { canonicalJSON } from '../core/canonical.js';
import { createGameplayRng } from '../core/rng.js';
import { SKILL_SLOTS } from '../core/constants.js';
import { scriptedInput } from '../sim/script.js';
import { levelFor } from '../data/levels.js';
import { createStateIO } from './capture.js';
import { buildFile, parseFile, encodeOrdered, clonePlain, SCHEMA, campaignMeta } from './codec.js';
import { lockLine, FIRST_LEVEL } from '../data/campaign.js';
import { createSaveStorage, INDEX_KEY, PROFILE_KEY, SAVE_PREFIX } from './storage.js';
import {
  ALL_SLOTS,
  MANUAL_SLOTS,
  AUTO_SLOTS,
  QUICK_SLOT,
  slotKey,
  isSlotId,
  slotKind,
  defaultSlotName,
  scanSlots,
  backupMeta,
  writeIndex,
  metaOf,
} from './slots.js';
import { createProfileStore, scoreRun } from './profile.js';
import { createThumbnailer } from './thumbnail.js';
import { createAutosave } from './autosave.js';

const TICK_HZ = 60;
const r1 = (v) => Math.round(v * 10) / 10;
// A save waits for its thumbnail at most this long after the capture (the
// picture is encoded while the file is built + verified; a warm worker takes
// ~70-110 ms). A later picture is attached when it lands (gauntlet r3, F3):
// the save itself — and its toast — never waits seconds on a slow worker.
const THUMB_WAIT_MS = 250;
const THUMB_LATE = Symbol('thumb-late');
// The thumbnail worker is started this long after the service (boot idle),
// so its module fetch + start never lands on the first save.
const THUMB_PREWARM_MS = 1200;
// Work split across frames (G2.7): each heavy piece runs in its own task
// right after a rendered frame. (requestIdleCallback never fires idle on a
// continuously rendering page — it always hits its timeout.)
// One task after the next frame gap (G2.7: each piece of a write in its own
// frame gap) — bounded: an occluded or hidden window stops requestAnimationFrame
// entirely, and a save whose pieces waited on it would stall for as long as the
// player is away (a Save from the pause menu then read as "nothing happened"),
// so the gap is at most NEXT_IDLE_MAX_MS of wall time.
const NEXT_IDLE_MAX_MS = 40;
const nextIdle = () =>
  new Promise((res) => {
    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      res();
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(fire, 0));
    setTimeout(fire, typeof requestAnimationFrame === 'function' ? NEXT_IDLE_MAX_MS : 0);
  });
// Calm frames: wait until `n` consecutive rendered frames each took < 25 ms
// (a room swap's own hitch — dressing build, scene change — has passed), at
// most maxMs; the autosave's heavy pieces then never stack onto it.
const calmFrames = (n = 3, maxMs = 1500) =>
  new Promise((res) => {
    if (typeof requestAnimationFrame !== 'function') return res(0);
    const t0 = performance.now();
    let last = t0;
    let calm = 0;
    const f = (t) => {
      calm = t - last < 25 ? calm + 1 : 0;
      last = t;
      if (calm >= n || t - t0 > maxMs) res(Math.round(t - t0));
      else requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });

export const SAVE_ERRORS = Object.freeze({
  quota: 'Not enough browser storage — delete a slot or export saves to files',
  unavailable: "This browser isn't letting Echoes store saves (private mode?) — export to a file instead",
  not_allowed: "You can't save right now",
  busy: 'Another save is still being written',
  missing: 'That slot is empty',
  corrupt: 'That save file is damaged',
  version: 'That save was made by a newer version of Echoes',
  hash: "That save file failed its integrity check — it was changed or damaged",
  full: 'Every save slot is in use — pick a slot to overwrite',
  guest: 'Only the host can save an online session',
  // CAMPAIGN (PLAN §12.7): a save whose run sits in a level this profile has
  // not unlocked (a copied / imported file) is refused, like every other path.
  locked: "That save is in a level you haven't unlocked yet",
});

const CAN_SAVE_REASON = Object.freeze({
  boot: 'The game is still starting',
  title: 'Start or load a game first',
  farewell: 'The game has ended',
  transition: 'Wait for the transition to finish',
  guest: 'Only the host can save an online session',
  busy: 'A save is being written',
  probe: 'A test probe is running',
});

export function createSaveSystem({
  clock,
  rng,
  registry,
  world,
  bus,
  scene = null,
  stage = null,
  app = null,
  params = {},
  service = () => null,
  sim = null, // { freeze() -> was, restore(was) } — the realtime loop gate (round-trip probe)
  onRestored = null, // presentation resync the host adds (numeral pools, input release)
  storage,
}) {
  const store = createSaveStorage(storage !== undefined ? { storage } : {});
  const profileStore = createProfileStore({ store });
  const thumbs = createThumbnailer({ stage });
  // Boot idle: start the thumbnail worker (fetch, module, JPEG encoder) now,
  // not at the first save (gauntlet r3, F3).
  if (typeof window !== 'undefined' && stage) {
    const warmUp = () => {
      try {
        thumbs.prewarm();
      } catch (err) {
        console.warn('[save] thumbnail prewarm failed', err);
      }
    };
    setTimeout(() => {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(warmUp, { timeout: 1500 });
      else warmUp();
    }, THUMB_PREWARM_MS);
  }

  // ---------------------------------------------------- app trackers --
  // Saved with the state (tree.app): playtime = unpaused sim ticks, and the
  // kill counter base of the live run (score = kills since run_start).
  // CAMPAIGN (PLAN §12.8): per-level kills for the campaign score — the kill
  // counter at the live level's start and the kills of every level cleared.
  const tracker = { playtimeTicks: 0, runKillBase: 0, levelKillBase: 0, levelKills: [] };
  let profileTicks = 0; // ticks not yet credited to the profile's lifetime playtime
  const appState = {
    save: () => ({ playtimeTicks: tracker.playtimeTicks, runKillBase: tracker.runKillBase, levelKillBase: tracker.levelKillBase, levelKills: tracker.levelKills.slice() }),
    load: (d) => {
      tracker.playtimeTicks = Number.isFinite(d.playtimeTicks) ? d.playtimeTicks : 0;
      tracker.runKillBase = Number.isFinite(d.runKillBase) ? d.runKillBase : 0;
      tracker.levelKillBase = Number.isFinite(d.levelKillBase) ? d.levelKillBase : tracker.runKillBase;
      tracker.levelKills = Array.isArray(d.levelKills) ? d.levelKills.filter((k) => Number.isFinite(k)) : [];
    },
  };
  const io = createStateIO({ clock, rng, registry, world, scene, appState });

  // Stepping guard: a capture from inside world.step (a bus listener) is
  // refused / deferred (rule 6). The wrapper is transparent otherwise.
  let stepping = false;
  {
    const inner = world.step;
    world.step = (...args) => {
      stepping = true;
      try {
        return inner(...args);
      } finally {
        stepping = false;
      }
    };
  }
  function capturePointError(msg) {
    const err = new Error(msg);
    err.name = 'CapturePointError';
    return err;
  }
  function capture() {
    if (stepping) throw capturePointError('save.capture() inside a sim step — use requestCapture() (captured at the next tick end)');
    return io.capture();
  }

  // Tick-end work queue: deferred captures (listener-requested saves, the
  // G2.12 probe) run here, after world.step has fully returned.
  const tickEndQueue = [];
  const captureLog = [];
  let probing = false;
  clock.onTickEnd((tick) => {
    if (!probing) {
      tracker.playtimeTicks += 1;
      profileTicks += 1;
    }
    if (tickEndQueue.length === 0) return;
    const q = tickEndQueue.splice(0);
    for (const job of q) {
      let tree = null;
      let error = null;
      const pending = world.pendingQueues ? world.pendingQueues() : null;
      try {
        tree = io.capture();
      } catch (err) {
        error = err;
      }
      if (error && error.name === 'CapturePointError' && (job.retries ?? 0) < 30) {
        job.retries = (job.retries ?? 0) + 1;
        tickEndQueue.push(job);
        continue;
      }
      const rec = { reason: job.reason, eventTick: job.eventTick, captureTick: tick, pending, ok: !error, error: error ? String(error.message) : null };
      captureLog.push(rec);
      if (captureLog.length > 20) captureLog.shift();
      try {
        job.resolve(error ? { ok: false, error: 'busy', detail: String(error.message), rec } : { ok: true, tree, rec, capturedAt: new Date().toISOString() });
      } catch (err) {
        console.warn('[save] tick-end job failed', err);
      }
    }
  });
  // requestCapture(reason) -> Promise<{ ok, tree, rec, capturedAt }> — captured at the
  // next tick end (immediately when no step is in progress).
  // Between frames (no step running) the capture waits one microtask, so a
  // request made from a listener of an event a UI / debug command emitted
  // sees the command's finished state — still the same tick.
  function requestCapture(reason = 'api', eventTick = null) {
    if (!stepping) {
      return new Promise((resolve) => {
        queueMicrotask(() => {
          if (stepping) {
            tickEndQueue.push({ reason, eventTick, resolve });
            return;
          }
          try {
            const pending = world.pendingQueues();
            const tree = io.capture();
            const rec = { reason, eventTick, captureTick: clock.tick, pending, ok: true, between: true };
            captureLog.push(rec);
            if (captureLog.length > 20) captureLog.shift();
            resolve({ ok: true, tree, rec, capturedAt: new Date().toISOString() });
          } catch (err) {
            if (err && err.name === 'CapturePointError') tickEndQueue.push({ reason, eventTick, resolve });
            else resolve({ ok: false, error: 'busy', detail: String(err && err.message) });
          }
        });
      });
    }
    return new Promise((resolve) => tickEndQueue.push({ reason, eventTick, resolve }));
  }

  // ------------------------------------------------------- slot cache --
  let slots = {};
  const recovery = [];
  // SEVERAL TABS (gauntlet r4, SAVE4-F1): another tab of the game may write,
  // overwrite or delete a slot at any moment, so this catalogue is never
  // trusted blindly. `indexText` is the index this tab last wrote or read; a
  // stored index that differs (the other tab's writeIndex) — or a `storage`
  // event on a slot key (slotsStale) — means the catalogue is re-scanned
  // before anything reads it (list / latest / Continue, the autosave
  // rotation, the import target, New Game's impact) or writes the index.
  let indexText = null;
  let slotsStale = false;
  const slotListeners = new Set(); // onSlotsChanged: another tab changed the catalogue
  const profileListeners = new Set(); // onProfileChanged: another tab wrote the profile
  const notify = (set, what) => {
    for (const fn of set) {
      try {
        fn(what);
      } catch (err) {
        console.warn(`[save] ${what} listener threw`, err);
      }
    }
  };
  const tabSync = { profile: 0, slots: 0, timer: 0 }; // debug counters
  function rescan() {
    slots = scanSlots(store);
    indexText = writeIndex(store, slots).text;
    slotsStale = false;
    return slots;
  }
  function ensureFresh() {
    if (slotsStale || store.read(INDEX_KEY) !== indexText) rescan();
  }
  // A slot entry changed by THIS tab: the index follows (never a stale
  // catalogue over another tab's entries — ensureFresh first).
  function putSlot(id, m) {
    ensureFresh();
    if (m) slots[id] = m;
    else delete slots[id];
    indexText = writeIndex(store, slots).text;
  }
  // Boot recovery: a leftover .tmp = a write torn after step 1. A VALID tmp
  // newer than main (or with main missing / damaged) is promoted; anything
  // else is dropped and the previous save stays as it was (G2.5).
  function recoverTmp() {
    for (const id of ALL_SLOTS) {
      const key = slotKey(id);
      const tmp = store.read(`${key}.tmp`);
      if (tmp === null) continue;
      const t = parseFile(tmp);
      const mainText = store.read(key);
      const m = mainText !== null ? parseFile(mainText) : null;
      const newer = t.ok && (!m || !m.ok || String(t.file.savedAt || '') > String(m.file.savedAt || ''));
      if (newer) {
        const w = store.writeAtomic(key, tmp);
        recovery.push({ slot: id, action: w.ok ? 'promoted' : 'promote_failed', savedAt: t.file.savedAt, error: w.ok ? null : w.error });
      } else {
        store.remove(`${key}.tmp`);
        recovery.push({ slot: id, action: 'discarded', reason: t.ok ? 'older than the main copy' : t.detail });
      }
    }
  }
  recoverTmp();
  rescan();

  // ------------------------------------------------------------ gates --
  function net() {
    try {
      return service('net');
    } catch {
      return null;
    }
  }
  function netRole() {
    const n = net();
    if (!n) return null;
    try {
      const role = n.role ?? (n.debug && n.debug.role) ?? null;
      const inSession = typeof n.inSession === 'function' ? n.inSession() : role === 'host' || role === 'guest';
      return inSession ? role : null;
    } catch {
      return null;
    }
  }
  function sceneBusy() {
    try {
      return !!(scene && typeof scene.cmd === 'function' && scene.cmd('sceneBusy', []) === true);
    } catch {
      return false;
    }
  }
  function canSave() {
    const st = app ? app.state : 'playing';
    if (st === 'boot' && !(app && app.params && app.params.menuSkip)) return { ok: false, reason: CAN_SAVE_REASON.boot, code: 'boot' };
    if (st === 'title') return { ok: false, reason: CAN_SAVE_REASON.title, code: 'title' };
    if (st === 'farewell') return { ok: false, reason: CAN_SAVE_REASON.farewell, code: 'farewell' };
    if (netRole() === 'guest') return { ok: false, reason: CAN_SAVE_REASON.guest, code: 'guest' };
    if (probing) return { ok: false, reason: CAN_SAVE_REASON.probe, code: 'probe' };
    const run = world.runSystem();
    if (run && run.view().phase === 'fade') return { ok: false, reason: CAN_SAVE_REASON.transition, code: 'transition' };
    if (sceneBusy()) return { ok: false, reason: CAN_SAVE_REASON.transition, code: 'transition' };
    return { ok: true };
  }
  function canLoad() {
    if (netRole()) return { ok: false, reason: 'Leave the online session to load a save', code: 'net' };
    if (probing) return { ok: false, reason: CAN_SAVE_REASON.probe, code: 'probe' };
    return { ok: true };
  }

  // ------------------------------------------------------------- meta --
  function metaFor(tree) {
    const run = tree.systems.run;
    const ents = tree.registry.entities;
    const party = ents
      .filter((e) => e.partyIndex !== undefined)
      .sort((a, b) => a.partyIndex - b.partyIndex)
      .map((e) => ({ classId: e.classId ?? (e.kind === 'player' ? 'healer' : e.kind), hp: Math.round(Math.max(0, e.hp) * 10) / 10, maxHp: e.maxHp }));
    const room = run.active ? run.roomIndex : 0;
    let roomMode = null;
    if (run.active && room) roomMode = run.frame && run.frame.modes ? run.frame.modes[room - 1] ?? null : null;
    else if (tree.systems.waves && tree.systems.waves.mode) roomMode = tree.systems.waves.mode;
    let actName = null;
    try {
      actName = levelFor(run.act).name;
    } catch {
      actName = null;
    }
    return {
      playtimeSec: Math.round((tree.app.playtimeTicks ?? 0) / TICK_HZ),
      mode: tree.scene.mode ?? (run.active ? 'run' : 'camp'),
      act: run.act ?? 1,
      actName,
      room,
      roomMode,
      phase: run.phase,
      seed: run.frame && Number.isFinite(run.frame.seed) ? run.frame.seed : tree.rng.seed,
      wallet: run.wallet ?? 0,
      party,
      skills: (tree.systems.skills.slots || []).map((s) => (s ? s.id : null)),
      tick: tree.clock.tick,
      challenge: run.challenge ?? 'standard',
      network: netRole() === 'host',
      // CAMPAIGN (schema 3, PLAN §12.8): the level and the campaign it is part of.
      level: run.act ?? 1,
      levelName: actName,
      campaign: campaignMeta(run),
      bytes: 0,
    };
  }

  // CAMPAIGN (PLAN §12.7): the load-side lock check. A run in (or a card
  // heading to) a level this profile has not unlocked is refused — unless a
  // developer path started it (`campaign.harness`: ?level=N, ?run=1,
  // cmd('startCampaign' | 'startRun')).
  function unlockedLevels() {
    try {
      const c = service('content');
      return c && typeof c.unlockedActs === 'function' ? c.unlockedActs() : null;
    } catch {
      return null;
    }
  }
  function lockCheck(tree) {
    const run = tree && tree.systems ? tree.systems.run : null;
    if (!run || !run.active) return null;
    const c = run.campaign && typeof run.campaign === 'object' ? run.campaign : null;
    if (c && c.harness) return null;
    const open = unlockedLevels();
    if (!open) return null; // no content service (Node tools): nothing to check against
    const need = [Number(run.act) || FIRST_LEVEL];
    if (c && c.card && Number.isFinite(c.card.to)) need.push(c.card.to);
    const locked = need.find((l) => !open.includes(l));
    return locked === undefined ? null : { level: locked, line: lockLine(locked) };
  }

  // ------------------------------------------------------------ write --
  let writing = false;
  // `savedAt` (the catalogue's sort key: slot list, latest() = Continue, the
  // auto-slot rotation) is the CAPTURE time when the caller passes
  // `capturedAt`; the write itself may land seconds later (calm frames,
  // thumbnail, idle tasks) and must never re-rank the file (J3).
  async function writeSlot(id, tree, { name, kind, reason = 'manual', thumb = true, calm = false, capturedAt = null } = {}) {
    const t0 = performance.now();
    const calmMs = calm ? await calmFrames() : 0;
    const key = slotKey(id);
    const prevText = store.read(key);
    const prev = prevText !== null ? parseFile(prevText) : null;
    const prevFile = prev && prev.ok ? prev.file : null;
    const nowIso = new Date().toISOString();
    const stampIso = typeof capturedAt === 'string' && capturedAt ? capturedAt : nowIso;
    const slot = {
      id,
      kind: kind ?? slotKind(id),
      name: (name && String(name).slice(0, 32)) || (prevFile && prevFile.slot && prevFile.slot.name) || defaultSlotName(id),
    };
    // Thumbnail: the next rendered frame (render never stops, even behind a
    // menu). Requested FIRST and encoded (worker) while the file is built and
    // verified below; the write waits for it at most THUMB_WAIT_MS in total —
    // a picture that is later is attached to the slot when it lands
    // (attachLateThumb), never on the save's critical path (gauntlet r3, F3).
    let thumbMs = null;
    let shot = null;
    let shotP = null;
    const tThumb = performance.now();
    if (thumb) shotP = thumbs.next();
    await nextIdle();
    const t1 = performance.now();
    const meta = metaFor(tree);
    let built = buildFile({ slot, meta, state: tree, game: VERSION, createdAt: (prevFile && prevFile.createdAt) || stampIso, savedAt: stampIso });
    meta.bytes = built.text.length;
    built = buildFile({ slot, meta, state: tree, game: VERSION, createdAt: (prevFile && prevFile.createdAt) || stampIso, savedAt: stampIso });
    const buildMs = performance.now() - t1;
    // Verify before writing: the bytes must decode to the same tree hash.
    // Verification (parse + re-hash) in its own post-frame task, apart from
    // the encode (G2.7: each piece in its own frame gap).
    await nextIdle();
    const t2 = performance.now();
    const check = parseFile(built.text);
    if (!check.ok || check.file.hash !== built.hash) {
      return { ok: false, error: 'corrupt', detail: `self-check failed (${check.ok ? 'hash' : check.detail})` };
    }
    const verifyMs = performance.now() - t2;
    let thumbLate = false;
    if (shotP) {
      const left = Math.max(0, THUMB_WAIT_MS - (performance.now() - tThumb));
      const got = await Promise.race([shotP, new Promise((res) => setTimeout(() => res(THUMB_LATE), left))]);
      if (got === THUMB_LATE) thumbLate = true;
      else shot = got;
      thumbMs = shot ? shot.ms : null;
    }
    const t3 = performance.now();
    const w = store.writeAtomic(key, built.text);
    if (!w.ok) return { ok: false, error: w.error, detail: w.detail };
    // This save's own picture, or none: a previous save's picture never
    // stands in for this one (a late one is attached below when it lands).
    if (shot && shot.dataUrl) store.writePlain(`${key}.thumb`, shot.dataUrl);
    else if (thumb) store.remove(`${key}.thumb`);
    const m = metaOf(built.file, { id, bytes: built.text.length, thumb: !!(shot && shot.dataUrl) || (!thumb && store.read(`${key}.thumb`) !== null) });
    putSlot(id, m);
    if (thumbLate) {
      pendingThumbs.set(id, { savedAt: stampIso, hash: built.hash, since: performance.now() });
      shotP.then((s) => attachLateThumb(id, stampIso, built.hash, s)).catch(() => attachLateThumb(id, stampIso, built.hash, null));
    } else pendingThumbs.delete(id);
    // Lifetime playtime rides every successful write.
    profileStore.addPlaytime(profileTicks / TICK_HZ);
    profileTicks = 0;
    profileStore.flush();
    // (the wait for the picture is not main-thread work: excluded)
    const verifyWriteMs = verifyMs + (performance.now() - t3);
    const writeMs = r1(buildMs + verifyWriteMs);
    // Main-thread cost of each piece (each runs in its own task / frame gap).
    const pieces = {
      snap: shot ? shot.snapMs : null,
      encodeJpeg: shot ? shot.drawMs : null,
      build: r1(buildMs),
      verifyWrite: r1(verifyWriteMs),
    };
    return { ok: true, meta: m, bytes: built.text.length, ms: r1(performance.now() - t0), writeMs, thumbMs, thumbLate, calmMs, pieces, hash: built.hash, reason };
  }

  // A picture that missed THUMB_WAIT_MS: written to the slot when it lands —
  // only if the slot still holds THAT save (an overwrite or a delete drops
  // it; a rename keeps savedAt + hash, so it still attaches). Listeners (the
  // saves screen) swap the picture in place.
  const pendingThumbs = new Map(); // slot id -> { savedAt, hash, since }
  const thumbListeners = new Set();
  const thumbLog = []; // the last 10 late pictures (debug: save.thumbLog())
  function attachLateThumb(id, savedAt, hash, s) {
    const p = pendingThumbs.get(id);
    if (p && p.savedAt === savedAt) pendingThumbs.delete(id);
    ensureFresh(); // another tab may have overwritten the slot meanwhile
    const cur = slots[id];
    let result;
    if (!s || !s.dataUrl) result = 'no picture';
    else if (!cur || cur.savedAt !== savedAt || cur.hash !== hash) result = 'slot changed';
    else {
      const w = store.writePlain(`${slotKey(id)}.thumb`, s.dataUrl);
      if (w.ok) {
        slots[id] = { ...cur, thumb: true };
        result = 'attached';
      } else result = w.error || 'write failed';
    }
    thumbLog.push({ slot: id, savedAt, result, ms: p ? r1(performance.now() - p.since) : null, via: s ? s.via : null });
    if (thumbLog.length > 10) thumbLog.shift();
    for (const fn of thumbListeners) {
      try {
        fn(id, result);
      } catch (err) {
        console.warn('[save] thumb listener threw', err);
      }
    }
  }
  function onThumb(fn) {
    thumbListeners.add(fn);
    return () => thumbListeners.delete(fn);
  }

  async function save(id, { name, kind } = {}) {
    if (!isSlotId(id)) return { ok: false, error: 'not_allowed', detail: `unknown slot ${id}` };
    const gate = canSave();
    if (!gate.ok) return { ok: false, error: gate.code === 'guest' ? 'not_allowed' : gate.code === 'busy' ? 'busy' : 'not_allowed', reason: gate.reason, code: gate.code };
    if (writing) return { ok: false, error: 'busy', reason: CAN_SAVE_REASON.busy };
    writing = true;
    try {
      const c = await requestCapture(`save:${id}`);
      if (!c.ok) return { ok: false, error: 'busy', detail: c.detail };
      return await writeSlot(id, c.tree, { name, kind, capturedAt: c.capturedAt });
    } catch (err) {
      console.warn('[save] save failed', err);
      return { ok: false, error: 'unavailable', detail: String(err && err.message) };
    } finally {
      writing = false;
    }
  }

  // ------------------------------------------------------------- load --
  let lastLoad = null;
  function postRestore(reason, extra = {}) {
    try {
      bus.emit(clock.tick, 'state_restored', { reason, mode: io.sceneState().mode, ...extra });
    } catch (err) {
      console.warn('[save] a state_restored listener threw', err);
    }
    if (typeof onRestored === 'function') {
      try {
        onRestored(reason);
      } catch (err) {
        console.warn('[save] resync failed', err);
      }
    }
  }
  function applyTree(tree, reason = 'load', extra = {}) {
    if (stepping) return { ok: false, error: 'busy', detail: 'apply() inside a sim step' };
    const r = io.apply(tree);
    if (!r.ok) return r;
    postRestore(reason, extra);
    return { ok: true };
  }

  async function load(id) {
    const t0 = performance.now();
    if (!isSlotId(id)) return { ok: false, error: 'missing', detail: `unknown slot ${id}` };
    const gate = canLoad();
    if (!gate.ok) return { ok: false, error: 'not_allowed', reason: gate.reason };
    const text = store.read(slotKey(id));
    if (text === null) return { ok: false, error: 'missing' };
    const pf = parseFile(text);
    if (!pf.ok) {
      rescan();
      return { ok: false, error: pf.error, detail: pf.detail, backup: backupMeta(store, id) };
    }
    const lock = lockCheck(pf.file.state);
    if (lock) return { ok: false, error: 'locked', reason: `${SAVE_ERRORS.locked} — ${lock.line}`, detail: lock.line, level: lock.level };
    const r = applyTree(pf.file.state, 'load', { slot: id });
    if (!r.ok) return { ok: false, error: r.error, detail: r.detail, backup: backupMeta(store, id) };
    const meta = slots[id] ?? metaOf(pf.file, { id, bytes: text.length });
    markEnded(gameKeyOfTree(pf.file.state), false); // playing it on: in progress again (J3-F3)
    lastLoad = { slot: id, ms: r1(performance.now() - t0), tick: clock.tick, hash: pf.file.hash, at: Date.now() };
    return { ok: true, meta, ms: lastLoad.ms, migrated: pf.migrated };
  }

  function restoreBackup(id) {
    if (!isSlotId(id)) return { ok: false, error: 'missing' };
    const key = slotKey(id);
    const bak = store.read(`${key}.bak`);
    if (bak === null) return { ok: false, error: 'missing', detail: 'no backup for this slot' };
    const pf = parseFile(bak);
    if (!pf.ok) return { ok: false, error: pf.error, detail: pf.detail };
    // Plain write: the damaged main is replaced; the backup stays a backup.
    const w = store.writePlain(key, bak);
    if (!w.ok) return { ok: false, error: w.error };
    rescan();
    return { ok: true, meta: slots[id] };
  }

  function remove(id) {
    if (!isSlotId(id)) return { ok: false, error: 'missing' };
    const key = slotKey(id);
    for (const k of [key, `${key}.bak`, `${key}.tmp`, `${key}.thumb`]) store.remove(k);
    pendingThumbs.delete(id);
    putSlot(id, null);
    return { ok: true };
  }

  async function rename(id, name) {
    if (!isSlotId(id)) return { ok: false, error: 'missing' };
    const key = slotKey(id);
    const text = store.read(key);
    if (text === null) return { ok: false, error: 'missing' };
    const pf = parseFile(text);
    if (!pf.ok) return { ok: false, error: pf.error, detail: pf.detail };
    const clean = String(name ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 32) || defaultSlotName(id);
    const f = { ...pf.file, slot: { ...pf.file.slot, name: clean } };
    const w = store.writeAtomic(key, encodeOrdered(f));
    if (!w.ok) return { ok: false, error: w.error };
    rescan();
    return { ok: true, meta: slots[id] };
  }

  // ------------------------------------------------------------ files --
  function exportText(id) {
    if (!isSlotId(id)) return null;
    return store.read(slotKey(id));
  }
  function exportName(id) {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `echoes-${id}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.json`;
  }
  function exportSlot(id) {
    const text = exportText(id);
    if (text === null) return { ok: false, error: 'missing' };
    try {
      const filename = exportName(id);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 1000);
      return { ok: true, filename, bytes: text.length };
    } catch (err) {
      return { ok: false, error: 'unavailable', detail: String(err && err.message) };
    }
  }
  function firstEmptyManual() {
    ensureFresh();
    return MANUAL_SLOTS.find((id) => !slots[id]) ?? null;
  }
  function importText(text, target = null) {
    const pf = parseFile(text);
    if (!pf.ok) return { ok: false, error: pf.error, detail: pf.detail };
    const id = target ?? firstEmptyManual();
    if (!id) return { ok: false, error: 'full' };
    if (!isSlotId(id)) return { ok: false, error: 'not_allowed', detail: `unknown slot ${id}` };
    const f = {
      ...pf.file,
      slot: { id, kind: slotKind(id), name: (pf.file.slot && pf.file.slot.name) || 'Imported save' },
    };
    const out = encodeOrdered(f);
    const again = parseFile(out);
    if (!again.ok || again.file.hash !== pf.file.hash) return { ok: false, error: 'corrupt', detail: 'import self-check failed' };
    const w = store.writeAtomic(slotKey(id), out);
    if (!w.ok) return { ok: false, error: w.error };
    store.remove(`${slotKey(id)}.thumb`);
    rescan();
    return { ok: true, slotId: id, hash: pf.file.hash, meta: slots[id] };
  }
  async function importFile(file, target = null) {
    if (!file || typeof file.text !== 'function') return { ok: false, error: 'corrupt', detail: 'no file' };
    if (file.size > 4 * 1024 * 1024) return { ok: false, error: 'corrupt', detail: 'file is too large to be an Echoes save' };
    let text;
    try {
      text = await file.text();
    } catch (err) {
      return { ok: false, error: 'corrupt', detail: String(err && err.message) };
    }
    return importText(text, target);
  }

  // --------------------------------------------------------- autosave --
  const autosaver = createAutosave({
    bus,
    clock,
    isStepping: () => stepping,
    allowed: (reason) => {
      if (!app || app.state !== 'playing') return 'not playing';
      if (probing) return 'probe';
      if (reason !== 'run_end' && reason !== 'return_to_camp') {
        const g = canSave();
        if (!g.ok && g.code !== 'transition') return g.code;
      }
      if (netRole() === 'guest') return 'guest';
      return true;
    },
    capture: () => io.capture(),
    pickSlot: (tree) => pickAutoSlot(tree),
    write: (slot, tree, { reason, calm, capturedAt }) => writeSlot(slot, tree, { kind: 'auto', name: 'Autosave', reason, calm, capturedAt }),
  });
  async function autosave(reason = 'manual') {
    if (reason === 'quit') {
      const g = canSave();
      if (!g.ok && g.code !== 'transition') return { ok: false, error: 'not_allowed', reason: g.reason };
      const c = await requestCapture('autosave:quit');
      if (!c.ok) return { ok: false, error: 'busy' };
      const slot = pickAutoSlot(c.tree);
      return writeSlot(slot, c.tree, { kind: 'auto', name: 'Autosave', reason: 'quit', capturedAt: c.capturedAt });
    }
    return { ok: autosaver.request(reason, clock.tick) };
  }

  // ------------------------------------------ autosave rotation per game --
  // Gauntlet r3 J3-F3 (INT): the two autosave slots rotate PER GAME. A run in
  // progress is identified by its run seed (constant for a whole campaign —
  // every level rolls its frame off the carried stream, no reseed — and new
  // for every campaign). An autosave overwrites, in this order: an empty
  // slot; the older save of the SAME run; a slot that holds no run in
  // progress (camp, an end card, a damaged file); and only then the older
  // run of ANOTHER game. So a Save & Quit the player walks away from (then
  // New Game, or Load of another save) keeps its autosave while the new game
  // rotates through the other slot — Skyrim / Fallout keep autosaves per
  // character for the same reason. The title's New Game names what the new
  // game's autosaves will replace (newGameImpact) before it starts.
  const RUN_OVER = new Set(['victory', 'defeat', 'idle']);
  // gameKey: which game a run save belongs to (any phase, its end card
  // included); a run IN PROGRESS is a game key whose run has not ended.
  function gameKeyOfMeta(m) {
    if (!m || m.mode !== 'run' || m.phase === 'idle') return null;
    return Number.isFinite(m.seed) ? `run:${m.seed >>> 0}` : null;
  }
  const inProgressMeta = (m) => gameKeyOfMeta(m) !== null && !RUN_OVER.has(m.phase);
  function gameKeyOfTree(tree) {
    try {
      const run = tree && tree.systems ? tree.systems.run : null;
      if (!run || !run.active) return null;
      const mode = (tree.scene && tree.scene.mode) ?? 'run';
      const seed = run.frame && Number.isFinite(run.frame.seed) ? run.frame.seed : tree.rng ? tree.rng.seed : null;
      return gameKeyOfMeta({ mode, phase: run.phase, seed });
    } catch {
      return null;
    }
  }
  // Games whose run has ENDED since (victory, defeat, Quit to Lobby): an
  // earlier autosave of theirs is an ordinary old save again — neither
  // spared by the rotation nor announced by New Game as a run in progress.
  // Loading such a save revives its game (the player chose to play it on).
  const ENDED_KEY = INDEX_KEY.replace(/index$/, 'endedRuns');
  const ENDED_MAX = 24;
  // Shared with the other tabs (SAVE4-F1): re-read before every use and
  // every write, so one tab's list never drops a game another tab ended.
  function readEnded() {
    try {
      const t = store.read(ENDED_KEY);
      const a = t ? JSON.parse(t) : [];
      return Array.isArray(a) ? a.filter((k) => typeof k === 'string').slice(-ENDED_MAX) : [];
    } catch {
      return [];
    }
  }
  let endedRuns = readEnded();
  function refreshEnded() {
    endedRuns = readEnded();
  }
  function markEnded(key, ended) {
    refreshEnded();
    if (!key || endedRuns.includes(key) === !!ended) return;
    endedRuns = ended ? [...endedRuns, key].slice(-ENDED_MAX) : endedRuns.filter((k) => k !== key);
    try {
      store.writePlain(ENDED_KEY, JSON.stringify(endedRuns));
    } catch {
      /* best effort: the rotation then just keeps spare copies */
    }
  }
  bus.on('run_end', () => {
    if (probing) return;
    try {
      const run = world.runSystem();
      const s = run ? run.view().summary : null;
      if (s && Number.isFinite(s.seed)) markEnded(`run:${s.seed >>> 0}`, true);
    } catch {
      /* no summary: nothing to mark */
    }
  });
  const slotGameKey = (m) => (m && m.status === 'ok' ? gameKeyOfMeta(m.meta) : null);
  // the game key of a slot holding a run IN PROGRESS (null otherwise)
  const slotRunKey = (m) => {
    if (!m || m.status !== 'ok' || !inProgressMeta(m.meta)) return null;
    const k = gameKeyOfMeta(m.meta);
    return endedRuns.includes(k) ? null : k;
  };
  // pickAutoSlot(tree | { runKey }) -> 'auto-1' | 'auto-2'
  function pickAutoSlot(tree) {
    ensureFresh();
    refreshEnded();
    const key = tree && typeof tree === 'object' && 'runKey' in tree ? tree.runKey : gameKeyOfTree(tree);
    let best = null;
    for (const id of AUTO_SLOTS) {
      const m = slots[id];
      if (!m) return id; // an empty slot first
      // 0 this game's own save (any phase) · 1 no run in progress (camp, an
      // end card, a damaged file) · 2 another game's run in progress
      const rank = key !== null && slotGameKey(m) === key ? 0 : slotRunKey(m) === null ? 1 : 2;
      const at = String(m.savedAt || '');
      if (!best || rank < best.rank || (rank === best.rank && at < best.at)) best = { id, rank, at };
    }
    return best ? best.id : AUTO_SLOTS[0];
  }
  // newGameImpact() -> null | { runs: SlotMeta[], replaced: SlotMeta|null, kept: SlotMeta[] }
  // The runs in progress the autosave slots hold — ONE entry per game, its
  // newest autosave, newest game first — and the game whose ONLY autosave a
  // NEW game's first autosave would overwrite (null: no run is lost; an
  // older autosave of a game whose newer one stays is not a lost run).
  function newGameImpact() {
    ensureFresh();
    refreshEnded();
    const byGame = new Map();
    for (const id of AUTO_SLOTS) {
      const m = slots[id];
      const k = slotRunKey(m);
      if (k === null) continue;
      const cur = byGame.get(k);
      if (!cur || String(m.savedAt || '') > String(cur.savedAt || '')) byGame.set(k, m);
    }
    if (!byGame.size) return null;
    const runs = [...byGame.values()].sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')));
    const victim = slots[pickAutoSlot({ runKey: null })];
    const vk = slotRunKey(victim);
    const sameGameElsewhere = vk !== null && AUTO_SLOTS.some((id) => slots[id] && slots[id] !== victim && slotRunKey(slots[id]) === vk);
    const replaced = vk !== null && !sameGameElsewhere ? victim : null;
    const copy = (m) => ({ ...m, meta: { ...m.meta } });
    return { runs: runs.map(copy), replaced: replaced ? copy(replaced) : null, kept: runs.filter((m) => m !== replaced).map(copy) };
  }

  // ----------------------------------------------------- new game --
  // The boot snapshot: tick 0, the untouched camp (captured when the service
  // is created — before app.boot() and the first frame).
  let bootTree = null;
  try {
    bootTree = io.capture();
  } catch (err) {
    console.warn('[save] boot snapshot failed', err);
  }
  function freshTree(seed) {
    if (!bootTree) return null;
    const t = clonePlain(bootTree);
    t.rng = createGameplayRng(seed >>> 0).getState();
    t.app = { playtimeTicks: 0, runKillBase: 0 };
    return t;
  }
  function resetToFresh({ seed = Math.floor(Math.random() * 0x100000000) >>> 0 } = {}) {
    const t = freshTree(seed);
    if (!t) return { ok: false, error: 'unavailable' };
    const r = applyTree(t, 'new_game', { seed: seed >>> 0 });
    return r.ok ? { ok: true, seed: seed >>> 0, hash: hashState(t) } : r;
  }

  // ------------------------------------------------ records tracking --
  let lastRecord = null; // { runTick, result, ... } for the end card's "New best" line
  bus.on('run_start', (ev) => {
    if (probing) return;
    tracker.runKillBase = world.stats.kills;
    tracker.levelKillBase = world.stats.kills;
    tracker.levelKills = [];
    if (Number.isFinite(ev.act)) {
      profileStore.noteRunStart(ev.act);
      profileStore.noteLevelReached(ev.act);
    }
  });
  // CAMPAIGN (PLAN §12.7 / §12.8): a level clear unlocks the next level NOW
  // (atomic profile write) and closes that level's kill count.
  let lastLevelClear = null;
  bus.on('level_clear', (ev) => {
    tracker.levelKills.push(Math.max(0, world.stats.kills - tracker.levelKillBase));
    tracker.levelKillBase = world.stats.kills;
    if (probing) return;
    lastLevelClear = { tick: ev.tick, level: ev.level, ...profileStore.noteLevelClear(ev.level) };
  });
  bus.on('level_start', (ev) => {
    tracker.levelKillBase = world.stats.kills;
    if (probing) return;
    if (Number.isFinite(ev.level)) profileStore.noteLevelReached(ev.level);
  });
  bus.on('run_end', (ev) => {
    if (probing) return;
    const run = world.runSystem();
    const s = run.view().summary ?? null;
    const kills = Math.max(0, world.stats.kills - tracker.runKillBase);
    const c = ev.campaign ?? (s && s.campaign) ?? null;
    let campaign = null;
    if (c && Array.isArray(c.levels)) {
      const lk = tracker.levelKills.slice();
      campaign = {
        ...c,
        levels: c.levels.map((l, i) => ({ ...l, kills: i < lk.length ? lk[i] : Math.max(0, world.stats.kills - tracker.levelKillBase) })),
      };
    }
    const summary = {
      act: ev.act ?? (s && s.act) ?? 1,
      victory: ev.result === 'victory',
      result: ev.result ?? null,
      roomsCleared: campaign ? campaign.levels.reduce((n, l) => n + (l.rooms || 0), 0) : ev.rooms ?? (s && s.rooms) ?? 0,
      kills,
      timeSec: (ev.ticks ?? (s && s.ticks) ?? 0) / TICK_HZ,
      seed: s ? s.seed : null,
      challenge: ev.challenge ?? (s && s.challenge) ?? 'standard',
      lastRoom: s ? s.lastRoom : 0,
      campaign,
    };
    profileStore.addPlaytime(profileTicks / TICK_HZ);
    profileTicks = 0;
    const res = profileStore.recordRun(summary);
    lastRecord = { ...res, runEndTick: ev.tick, summary };
  });
  function recordRun(summary) {
    return profileStore.recordRun(summary);
  }

  // ----------------------------------------------------- quick keys --
  // F5 quicksave / F9 quickload: single-player gameplay only (no blocking
  // screen), confirm-free, toast feedback. On menus F5 keeps its browser
  // meaning (the app gate passes it through).
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'F5' && e.code !== 'F9') return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (!app || app.state !== 'playing' || (app.screens && app.screens.isBlocking())) return;
      if (netRole()) return;
      e.preventDefault();
      if (e.repeat) return;
      if (e.code === 'F5') {
        save(QUICK_SLOT, { kind: 'quick', name: 'Quicksave' }).then((r) => {
          if (r.ok) app.toast('Quicksaved', { tone: 'good', ms: 1600 });
          else app.toast(r.reason || SAVE_ERRORS[r.error] || "Couldn't quicksave", { tone: 'warn' });
        });
      } else {
        ensureFresh();
        if (!slots[QUICK_SLOT]) {
          app.toast('No quicksave yet — press F5 to make one', { tone: 'info' });
          return;
        }
        load(QUICK_SLOT).then((r) => {
          if (r.ok) app.toast('Quickloaded', { tone: 'good', ms: 1600 });
          else app.toast(SAVE_ERRORS[r.error] || "Couldn't load the quicksave", { tone: 'warn' });
        });
      }
    });
    const flushNow = () => {
      try {
        profileStore.addPlaytime(profileTicks / TICK_HZ);
        profileTicks = 0;
        profileStore.flush();
      } catch {
        /* best effort */
      }
    };
    window.addEventListener('pagehide', flushNow);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) flushNow();
    });
    // SEVERAL TABS (SAVE4-F1): another tab of the game wrote. The profile is
    // adopted at once (Records, Level Select, the portal read it live); slot
    // writes arrive as several keys (tmp, bak, main, thumb, index), so the
    // catalogue re-scans once they settle and an open saves screen redraws.
    window.addEventListener('storage', (e) => {
      try {
        if (e.storageArea && typeof localStorage !== 'undefined' && e.storageArea !== localStorage) return;
      } catch {
        return;
      }
      const k = e.key;
      if (k === null || k === PROFILE_KEY) {
        if (profileStore.sync()) {
          tabSync.profile += 1;
          notify(profileListeners, 'profile');
        }
      }
      if (k === null || (k.startsWith(SAVE_PREFIX) && !k.endsWith('.tmp'))) {
        slotsStale = true;
        clearTimeout(tabSync.timer);
        tabSync.timer = setTimeout(() => {
          if (!slotsStale) return;
          rescan();
          tabSync.slots += 1;
          notify(slotListeners, 'slots');
          // the title's Continue / Load Game redraw (app event, UI only)
          try {
            if (app && app.events && typeof app.events.emit === 'function') app.events.emit('saves_changed', { source: 'tab' });
          } catch {
            /* UI refresh only */
          }
        }, 150);
      }
    });
  }

  // ------------------------------------------------------- catalogue --
  const sorted = () => (ensureFresh(), Object.values(slots)).sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')) || ALL_SLOTS.indexOf(a.id) - ALL_SLOTS.indexOf(b.id));
  function list() {
    return sorted().map((m) => ({ ...m, meta: { ...m.meta } }));
  }
  function latest() {
    return sorted().find((m) => m.status === 'ok') ?? null;
  }
  function thumbOf(id) {
    return isSlotId(id) ? store.read(`${slotKey(id)}.thumb`) : null;
  }

  // ------------------------------------------------ round-trip probe --
  // PLAN §3.4 "Round-trip probe" / G2.1: freeze the realtime loop; A =
  // capture(); run `ticks` of scriptedInput(scriptSeed) recording
  // hash(capture()) every `every` ticks and every non-sound event; apply(A);
  // assert hash(capture()) === hash(A); re-run the same script and compare;
  // report the first divergent tick/event; restore A (non-destructive by
  // default) and thaw.
  function stepScripted(n, scriptSeed) {
    let stepped = 0;
    let guard = 0;
    while (stepped < n && guard < n * 8 + 64) {
      guard += 1;
      if (clock.stepOnce((t) => world.step(t, scriptedInput(scriptSeed, t, { skillSlots: SKILL_SLOTS })))) stepped += 1;
    }
    return stepped;
  }
  function continuation({ ticks = 600, scriptSeed = 1, every = 60 } = {}) {
    const events = [];
    const off = bus.on('*', (ev) => {
      if (ev.type !== 'sound') events.push(ev);
    });
    const hashes = [];
    const fromTick = clock.tick;
    try {
      for (let done = 0; done < ticks; done += every) {
        stepScripted(Math.min(every, ticks - done), scriptSeed);
        hashes.push({ tick: clock.tick, h: hashState(io.capture()) });
      }
    } finally {
      off();
    }
    let evs;
    try {
      evs = events.map((e) => canonicalJSON(e));
    } catch {
      evs = events.map((e) => JSON.stringify(e));
    }
    return { fromTick, toTick: clock.tick, hashes, events: evs, eventsHash: fnv1a64Hex(evs.join('\n')), eventCount: evs.length };
  }
  function firstDivergence(a, b) {
    for (let i = 0; i < Math.max(a.hashes.length, b.hashes.length); i++) {
      const x = a.hashes[i];
      const y = b.hashes[i];
      if (!x || !y || x.h !== y.h || x.tick !== y.tick) {
        let ev = null;
        for (let j = 0; j < Math.max(a.events.length, b.events.length); j++) {
          if (a.events[j] !== b.events[j]) {
            ev = { index: j, a: (a.events[j] || '').slice(0, 240), b: (b.events[j] || '').slice(0, 240) };
            break;
          }
        }
        return { tick: x ? x.tick : y ? y.tick : null, a: x ? x.h : null, b: y ? y.h : null, event: ev };
      }
    }
    if (a.eventsHash !== b.eventsHash) {
      for (let j = 0; j < Math.max(a.events.length, b.events.length); j++) {
        if (a.events[j] !== b.events[j]) return { tick: null, event: { index: j, a: (a.events[j] || '').slice(0, 240), b: (b.events[j] || '').slice(0, 240) } };
      }
    }
    return null;
  }
  function withProbe(fn) {
    if (stepping) throw capturePointError('probe inside a sim step');
    const was = sim && typeof sim.freeze === 'function' ? sim.freeze() : null;
    const autoWas = probing;
    probing = true;
    try {
      return fn();
    } finally {
      probing = autoWas;
      if (sim && typeof sim.restore === 'function') sim.restore(was);
    }
  }
  function roundTrip({ ticks = 600, scriptSeed = 1, every = 60, restore = true } = {}) {
    const t0 = performance.now();
    return withProbe(() => {
      const A = io.capture();
      const hashBefore = hashState(A);
      const c1 = continuation({ ticks, scriptSeed, every });
      const ap = io.apply(A);
      postRestore('probe');
      const hashAfterApply = hashState(io.capture());
      const c2 = continuation({ ticks, scriptSeed, every });
      const div = firstDivergence(c1, c2);
      if (restore) {
        io.apply(A);
        postRestore('probe');
      }
      return {
        hashBefore,
        hashAfterApply,
        equal: ap.ok && hashBefore === hashAfterApply,
        continuationEqual: !div,
        firstDivergence: div,
        events: c1.eventCount,
        eventsHash: c1.eventsHash,
        hashes: c1.hashes,
        fromTick: c1.fromTick,
        toTick: c1.toTick,
        entities: A.registry.entities.length,
        bytes: encodeOrdered(A).length,
        ms: r1(performance.now() - t0),
      };
    });
  }
  // For the reload leg of G2.1: the same continuation, reported (not restored).
  function continuationProbe({ ticks = 600, scriptSeed = 1, every = 60, restore = true } = {}) {
    return withProbe(() => {
      const A = io.capture();
      const hashBefore = hashState(A);
      const c = continuation({ ticks, scriptSeed, every });
      if (restore) {
        io.apply(A);
        postRestore('probe');
      }
      return { hashBefore, hashes: c.hashes, eventsHash: c.eventsHash, eventCount: c.eventCount, fromTick: c.fromTick, toTick: c.toTick };
    });
  }

  // ---------------------------------------------- corruption probes --
  function corrupt(id, mode = 'truncate') {
    if (!isSlotId(id)) return { ok: false, error: 'missing' };
    const key = slotKey(id);
    const text = store.read(key);
    if (text === null) return { ok: false, error: 'missing' };
    let out = text;
    if (mode === 'truncate') out = text.slice(0, Math.floor(text.length / 2));
    else {
      let f;
      try {
        f = JSON.parse(text);
      } catch {
        return { ok: false, error: 'corrupt', detail: 'already unreadable' };
      }
      if (mode === 'schema') f.schema = 'one';
      else if (mode === 'newer') f.schema = SCHEMA + 1;
      else if (mode === 'keys') delete f.state.registry;
      else if (mode === 'hash') {
        const p = f.state.registry.entities.find((e) => e.kind === 'player');
        p.hp = (Number(p.hp) || 0) + 13; // content changed, hash left alone
      } else return { ok: false, error: 'not_allowed', detail: `mode ${mode}` };
      out = JSON.stringify(f);
    }
    const w = store.writePlain(key, out);
    rescan();
    return { ok: w.ok, mode, slot: id, bytes: out.length, status: slots[id] ? slots[id].status : null, detail: slots[id] ? slots[id].detail : null };
  }
  async function simulateTornWrite(id, { valid = true } = {}) {
    if (!isSlotId(id)) return { ok: false, error: 'missing' };
    const c = await requestCapture('torn');
    if (!c.ok) return { ok: false, error: 'busy' };
    const nowIso = new Date(Date.now() + 1000).toISOString();
    const meta = metaFor(c.tree);
    let { text } = buildFile({ slot: { id, kind: slotKind(id), name: 'Torn write' }, meta, state: c.tree, game: VERSION, createdAt: nowIso, savedAt: nowIso });
    if (!valid) text = text.slice(0, Math.floor(text.length * 0.6));
    const ok = store.simulateTornWrite(slotKey(id), text);
    return { ok, slot: id, valid, tmpHash: valid ? hashState(c.tree) : null, mainHash: slots[id] ? slots[id].hash : null };
  }

  // ------------------------------------------------------------- api --
  const api = {
    capture,
    apply: (tree) => applyTree(tree, 'api'),
    hash: (tree) => hashState(tree ?? capture()),
    requestCapture,
    list,
    hasAny: () => (ensureFresh(), Object.keys(slots).length > 0),
    latest,
    canSave,
    canLoad,
    save,
    load,
    restoreBackup,
    remove,
    rename,
    exportSlot,
    exportText,
    importFile,
    importText,
    autosave,
    resetToFresh,
    // Gauntlet r3 J3-F3: what a New Game does to the runs in progress the
    // autosave slots hold (the title's New Game confirm reads it).
    newGameImpact,
    profile: () => profileStore.get(),
    profileReport: () => profileStore.report,
    recordRun,
    lastRecord: () => lastRecord,
    thumb: thumbOf,
    // A save whose picture is still being encoded (attached when it lands).
    thumbPending: (id) => pendingThumbs.has(id),
    onThumb,
    // SAVE4-F1: another tab changed the saves (the open saves screen redraws)
    onSlotsChanged(fn) {
      slotListeners.add(fn);
      return () => slotListeners.delete(fn);
    },
    // ... and the profile (an open Records screen redraws)
    onProfileChanged(fn) {
      profileListeners.add(fn);
      return () => profileListeners.delete(fn);
    },
    rescan,
    flush() {
      profileStore.addPlaytime(profileTicks / TICK_HZ);
      profileTicks = 0;
      profileStore.flush();
      ensureFresh(); // the index stays the stored catalogue (never this tab's stale copy)
      return true;
    },
    get storageAvailable() {
      return store.available;
    },
    slotIds: () => [...ALL_SLOTS],
    manualSlots: () => [...MANUAL_SLOTS],
    errors: SAVE_ERRORS,
    scoreRun,
  };
  api.debug = {
    list,
    save: (slot, opts) => save(slot, opts),
    load: (slot) => (app && typeof app.loadSlot === 'function' ? app.loadSlot(slot) : load(slot)),
    loadRaw: (slot) => load(slot),
    remove,
    rename,
    capture: () => capture(),
    apply: (tree) => applyTree(tree, 'api'),
    order: () => registry.all().map((e) => e.id),
    hash: () => hashState(capture()),
    roundTrip,
    continuation: continuationProbe,
    corrupt,
    simulateQuota: (on) => store.simulateQuota(on),
    simulateTornWrite,
    profile: () => profileStore.get(),
    profileReport: () => profileStore.report,
    usage: () => store.usage(),
    canSave,
    exportText,
    importText,
    restoreBackup,
    resetToFresh,
    recovery: () => recovery.map((r) => ({ ...r })),
    autosaveLog: () => autosaver.log(),
    // Per-game rotation probes (J3-F3): the slot the next autosave of the
    // live state would take, and the New Game impact.
    autoSlotFor: () => {
      try {
        return pickAutoSlot(capture());
      } catch {
        return pickAutoSlot(null);
      }
    },
    newGameImpact,
    endedRuns: () => (refreshEnded(), endedRuns.slice()),
    // SAVE4-F1: this tab's unwritten profile changes and what it adopted
    // from other tabs (storage events: profile adoptions, slot re-scans)
    tabs: () => ({ profile: profileStore.debugState(), adopted: { profile: tabSync.profile, slots: tabSync.slots }, indexFresh: store.read(INDEX_KEY) === indexText && !slotsStale }),
    autosave: (reason) => autosave(reason),
    autosaveEnabled: (on) => autosaver.setEnabled(on),
    resetAutosaveThrottle: () => autosaver.resetThrottle(),
    captureLog: () => captureLog.map((r) => ({ ...r })),
    requestCapture: (reason) => requestCapture(reason).then((r) => ({ ok: r.ok, rec: r.rec, hash: r.tree ? hashState(r.tree) : null })),
    // G2.12 probe: request a capture from INSIDE the next `type` listener.
    captureOnEvent(type) {
      return new Promise((resolve) => {
        const off = bus.on(type, (ev) => {
          off();
          let direct = null;
          try {
            capture();
            direct = 'captured';
          } catch (err) {
            direct = err && err.name;
          }
          requestCapture(`on:${type}`, ev.tick).then((r) => resolve({ event: type, eventTick: ev.tick, directCaptureInsideListener: direct, ...r.rec, hash: r.tree ? hashState(r.tree) : null }));
        });
      });
    },
    lastLoad: () => lastLoad,
    lastRecord: () => lastRecord,
    // CAMPAIGN (PLAN §12.7 / §12.8)
    lastLevelClear: () => lastLevelClear,
    lockCheck: (tree) => lockCheck(tree ?? capture()),
    bootHash: () => (bootTree ? hashState(bootTree) : null),
    bootTree: () => (bootTree ? clonePlain(bootTree) : null),
    freshTree: (seed) => freshTree(seed),
    freshHash: (seed) => {
      const t = freshTree(seed);
      return t ? hashState(t) : null;
    },
    tracker: () => ({ ...tracker, profileTicks }),
    thumb: thumbOf,
    lastThumb: () => thumbs.last(),
    thumbWarm: () => thumbs.warm(),
    thumbPending: (id) => pendingThumbs.has(id),
    thumbLog: () => thumbLog.map((r) => ({ ...r })),
    keys: () => ({ index: INDEX_KEY, profile: PROFILE_KEY, slot: (id) => slotKey(id) }),
    errors: SAVE_ERRORS,
    stepping: () => stepping,
    get probing() {
      return probing;
    },
  };
  return api;
}
