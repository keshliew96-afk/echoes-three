#!/usr/bin/env node
// SAVE SAFETY probe (docs/CLOUD_SAVES.md "Loading safely", docs/UNLOCKS.md
// "Save data"), headless.
//
//   node tools/save-safety-probe.mjs
//
// Checks the four fixes of code review finding 5, 6, 7 and 11:
//   A. a cloud load refused while staging (quota) changes nothing on the
//      device, and the save service turns the autosave back on;
//   B. a cloud load that goes through replaces the slots and the profile as
//      before (a missing slot removed, a replaced slot's old copy in .bak),
//      leaves no staged file and freezes the store;
//   C. a swap stopped part-way says 'partial', and the next boot finishes it;
//      staged files with no plan (a page closed while staging) are dropped;
//   D. a profile in a newer format is shown, never written (flush, a run, a
//      records reset), and a bundle holding one says 'newer';
//   E. a profile a newer build wrote keeps the ids this build does not know
//      (unlocks, deeds, feats, relics, marks, journal kinds, new keys, the
//      loadout) through a write, refunds nothing, and keeps its build stamp;
//      a profile with no newer stamp keeps the old rule (unknown unlocks
//      refunded);
//   F. the run's deed facts ride a save: Continue on a fresh page pays the
//      same deeds as the same page; a new game or a save from before starts
//      them fresh.
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { scriptedInput } = await import(u('src/sim/script.js'));
const { SKILL_SLOTS } = await import(u('src/core/constants.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { buildFile } = await import(u('src/save/codec.js'));
const { createSaveStorage, PROFILE_KEY, INDEX_KEY } = await import(u('src/save/storage.js'));
const { applyBundle, readBundle, makeBundle, finishPendingApply, APPLY_KEY, INCOMING } = await import(u('src/save/cloud.js'));
const { createProfileStore } = await import(u('src/save/profile.js'));
const { createSaveSystem } = await import(u('src/save/index.js'));
const { VERSION } = await import(u('src/version.js'));

const results = [];
function check(id, ok, detail = '') {
  results.push({ id, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id}${detail ? ` — ${detail}` : ''}`);
}

// localStorage stand-in; failKey(k) makes setItem throw a quota error.
function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  const s = {
    failKey: null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      if (s.failKey && s.failKey(k, v)) {
        const e = new Error('quota exceeded');
        e.name = 'QuotaExceededError';
        throw e;
      }
      m.set(k, String(v));
    },
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
    _m: m,
  };
  return s;
}
const keysOf = (ls, pre = 'echoes.') => [...ls._m.keys()].filter((k) => k.startsWith(pre)).sort();
const snap = (ls) => JSON.stringify([...ls._m.entries()].sort());

function sim(seed = 3) {
  let impl = createGameplayRng(seed >>> 0);
  const rng = {
    stream: 'gameplay',
    get seed() {
      return impl.seed;
    },
    get drawIndex() {
      return impl.drawIndex;
    },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (p) => impl.chance(p),
    pick: (a) => impl.pick(a),
    reseed: (s) => {
      impl = createGameplayRng(s >>> 0);
      return impl.seed;
    },
    getState: () => impl.getState(),
    setState: (st) => {
      impl = createGameplayRng(st.seed >>> 0);
      return impl.setState(st);
    },
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const io = createStateIO({ clock, rng, registry, world });
  const stepN = (n) => {
    let k = 0;
    let guard = 0;
    while (k < n && guard++ < n * 8 + 64) if (clock.stepOnce((t) => world.step(t, scriptedInput(3, t, { skillSlots: SKILL_SLOTS })))) k++;
  };
  return { rng, registry, bus, clock, world, io, stepN };
}

// --------------------------------------------------------------- files --
const s0 = sim(3);
s0.world.runSystem().startCampaign({ level: 1 });
s0.stepN(120);
const tree = s0.io.capture();
const slotFile = (id, at) => buildFile({ slot: { id, kind: id.startsWith('auto') ? 'auto' : 'manual', name: id }, meta: { act: 1 }, state: tree, game: VERSION, createdAt: at, savedAt: at }).text;
const localProfile = JSON.stringify({ v: 1, records: { runs: 50 }, meta: { embers: 900, earned: 900 }, savedAt: '2026-10-19T10:00:00Z' });
const deviceInit = () => {
  const o = {};
  for (const id of ['manual-1', 'manual-2', 'manual-3']) o[`echoes.save.v1.${id}`] = slotFile(id, '2026-10-19T10:00:00Z');
  o['echoes.save.v1.manual-1.bak'] = slotFile('manual-1', '2026-10-19T09:00:00Z');
  o[PROFILE_KEY] = localProfile;
  return o;
};
const bundle = {
  kind: 'echoes-cloud',
  v: 1,
  game: VERSION,
  savedAt: '2026-10-01T00:00:00Z',
  profile: JSON.stringify({ v: 1, records: { runs: 3 }, savedAt: '2026-10-01T00:00:00Z' }),
  slots: { 'auto-1': slotFile('auto-1', '2026-10-01T00:00:00Z'), 'manual-1': slotFile('manual-1', '2026-10-01T00:00:00Z') },
};

// ------------------------------------------------- A. refused staging --
{
  for (const failOn of ['echoes.save.v1.auto-1', 'echoes.save.v1.manual-1', PROFILE_KEY, APPLY_KEY]) {
    const ls = memStorage(deviceInit());
    const before = snap(ls);
    const store = createSaveStorage({ storage: ls });
    ls.failKey = (k) => k.startsWith(failOn) && k !== `${failOn}.bak`;
    const r = applyBundle(store, bundle);
    ls.failKey = null;
    check(`A.staging-refused(${failOn.replace('echoes.save.v1.', '')})`, !r.ok && r.error === 'quota' && r.unchanged === true && snap(ls) === before && !store.frozen, `${JSON.stringify(r)}; device ${snap(ls) === before ? 'unchanged' : 'CHANGED'}`);
  }
  // Through the save service: the autosave is on again after the refusal.
  const ls = memStorage(deviceInit());
  const s = sim(4);
  const save = createSaveSystem({ clock: s.clock, rng: s.rng, registry: s.registry, world: s.world, bus: s.bus, storage: ls });
  const on0 = save.debug ? save.debug.autosaveOn() : save.autosaveOn?.();
  ls.failKey = (k) => k.endsWith(INCOMING);
  const r = save.applyBundle(bundle);
  ls.failKey = null;
  const dbg = save.debug || save;
  check('A.autosave-on-after-refusal', !r.ok && on0 === true && dbg.autosaveOn() === true, `before ${on0}, after ${dbg.autosaveOn()}`);
}

// ------------------------------------------------------ B. a clean load --
{
  const ls = memStorage(deviceInit());
  const store = createSaveStorage({ storage: ls });
  const r = applyBundle(store, bundle);
  const k = keysOf(ls, 'echoes.save.v1.');
  const bak1 = ls.getItem('echoes.save.v1.manual-1.bak');
  check('B.clean-load', r.ok && store.frozen && ls.getItem('echoes.save.v1.auto-1') === bundle.slots['auto-1'] && ls.getItem('echoes.save.v1.manual-1') === bundle.slots['manual-1'] && ls.getItem(PROFILE_KEY) === bundle.profile, k.join(' '));
  check('B.missing-slots-removed', !k.includes('echoes.save.v1.manual-2') && !k.includes('echoes.save.v1.manual-3') && !k.includes(INDEX_KEY));
  check('B.replaced-slot-old-copy-in-bak', bak1 === deviceInit()['echoes.save.v1.manual-1']);
  check('B.no-staged-left', !keysOf(ls).some((x) => x.endsWith(INCOMING)) && ls.getItem(APPLY_KEY) === null);
}

// ------------------------------------------ C. partial swap and resume --
{
  const ls = memStorage(deviceInit());
  const store = createSaveStorage({ storage: ls });
  // The swap's write of manual-1 (any of its copies) refused: staging passed.
  ls.failKey = (k) => k.startsWith('echoes.save.v1.manual-1') && !k.endsWith(INCOMING);
  const r = applyBundle(store, bundle);
  ls.failKey = null;
  check('C.partial-reported', !r.ok && r.error === 'partial' && store.frozen, JSON.stringify(r));
  check('C.plan-kept', ls.getItem(APPLY_KEY) !== null && ls.getItem(`echoes.save.v1.manual-1${INCOMING}`) === bundle.slots['manual-1']);
  // The next boot.
  const store2 = createSaveStorage({ storage: ls });
  const f = finishPendingApply(store2);
  check(
    'C.boot-finishes',
    f && f.ok && f.resumed && ls.getItem('echoes.save.v1.manual-1') === bundle.slots['manual-1'] && ls.getItem('echoes.save.v1.auto-1') === bundle.slots['auto-1'] && ls.getItem(PROFILE_KEY) === bundle.profile && ls.getItem('echoes.save.v1.manual-2') === null && ls.getItem(APPLY_KEY) === null && !keysOf(ls).some((x) => x.endsWith(INCOMING)),
    JSON.stringify(f),
  );
  // The save service runs it at boot.
  const ls3 = memStorage(deviceInit());
  const st3 = createSaveStorage({ storage: ls3 });
  ls3.failKey = (k) => k.startsWith(PROFILE_KEY) && !k.endsWith(INCOMING);
  applyBundle(st3, bundle);
  ls3.failKey = null;
  const s = sim(5);
  const save = createSaveSystem({ clock: s.clock, rng: s.rng, registry: s.registry, world: s.world, bus: s.bus, storage: ls3 });
  const dbg = save.debug || save;
  check('C.service-boot-finishes', dbg.pendingApply() && dbg.pendingApply().ok && dbg.profile().records.runs === 3 && ls3.getItem(APPLY_KEY) === null, JSON.stringify(dbg.pendingApply()));
  // Staged files with no plan: dropped at boot, nothing else touched.
  const ls4 = memStorage(deviceInit());
  ls4.setItem(`echoes.save.v1.auto-1${INCOMING}`, bundle.slots['auto-1']);
  ls4.setItem(`${PROFILE_KEY}${INCOMING}`, bundle.profile);
  const f4 = finishPendingApply(createSaveStorage({ storage: ls4 }));
  const init = deviceInit();
  check('C.orphan-staging-dropped', f4 === null && !keysOf(ls4).some((x) => x.endsWith(INCOMING)) && Object.keys(init).every((k2) => ls4.getItem(k2) === init[k2]));
}

// ------------------------------------------------ D. newer format profile --
{
  const newer = { v: 2, highScores: [{ score: 9999 }], records: { runs: 120, victories: 40 }, meta: { mv: 2, embers: 5000 }, unlocks: { acts: [1, 2, 3, 4, 5, 6] }, savedAt: '2026-10-18T00:00:00Z' };
  const text = JSON.stringify(newer);
  const ls = memStorage({ [PROFILE_KEY]: text });
  const store = createSaveStorage({ storage: ls });
  const ps = createProfileStore({ store });
  check('D.reported-newer', ps.report.status === 'newer' && ps.readOnly === true, JSON.stringify(ps.report));
  check('D.shown', ps.get().records.runs === 120 && ps.get().meta.embers === 5000 && ps.get().unlocks.acts.length === 6, `runs ${ps.get().records.runs}, embers ${ps.get().meta.embers}`);
  ps.addPlaytime(30);
  const f = ps.flush();
  const rr = ps.recordRun({ act: 1, victory: false, roomsCleared: 2, kills: 10, timeSec: 60 });
  const rs = ps.reset();
  check('D.never-written', ls.getItem(PROFILE_KEY) === text && ls.getItem(`${PROFILE_KEY}.corrupt`) === null && !f.ok && rr.written === false && !rs.ok, `flush ${JSON.stringify(f)}, run written ${rr.written}`);
  // Another tab of the newer game writes while this one is open.
  const ls2 = memStorage({ [PROFILE_KEY]: JSON.stringify({ v: 1, records: { runs: 7 }, savedAt: '2026-10-18T00:00:00Z' }) });
  const ps2 = createProfileStore({ store: createSaveStorage({ storage: ls2 }) });
  ls2.setItem(PROFILE_KEY, text);
  const adopted = ps2.sync();
  ps2.noteStory('prologue');
  check('D.newer-adopted-mid-session', adopted && ps2.readOnly && ls2.getItem(PROFILE_KEY) === text);
  const rb = readBundle({ kind: 'echoes-cloud', v: 1, profile: text, slots: {} });
  check('D.bundle-says-newer', !rb.ok && rb.error === 'newer', JSON.stringify(rb));
  check('D.bundle-carries-it', makeBundle(store).profile === text);
}

// ------------------------------------------ E. content from a newer build --
{
  const future = (build) => ({
    v: 1,
    build,
    records: { runs: 40, levelClears: { 1: 3 } },
    unlocks: { acts: [1, 2] },
    savedAt: '2026-10-19T00:00:00Z',
    journal: { seen: { enemy: { husk: 2 }, future_kind: { x: 2 } } },
    meta: {
      mv: 1,
      embers: 100,
      earned: 900,
      owned: { purse_1: 40, heirloom_future_relic: 90, vow_future: 0 },
      deeds: ['first_light', 'future_deed'],
      feats: ['future_feat'],
      relicsSeen: ['future_relic'],
      marks: { champion: ['future_champion'], affix: ['future_affix'], event: [], arena: [], future_mark: ['y'], daily: { last: null } },
      vowBest: { future_mode: 3 },
      loadout: { heirloom: 'heirloom_future_relic', vows: ['vow_future'], vowRanks: { vow_future: 2 }, kits: { future_hero: 'kit_future' }, purse: 1 },
      prestige: { tier: 3 },
    },
  });
  const ls = memStorage({ [PROFILE_KEY]: JSON.stringify(future('9.9.9')) });
  const ps = createProfileStore({ store: createSaveStorage({ storage: ls }) });
  const view = ps.get().meta;
  check('E.view-filtered-no-refund', view.embers === 100 && !view.owned.heirloom_future_relic && !view.deeds.includes('future_deed'), `view embers ${view.embers}`);
  ps.noteStory('prologue');
  ps.awardRun({ act: 1, result: 'defeat', roomsCleared: 1, kills: 3, timeSec: 30, campaign: null, relics: [], deedRun: null });
  const stored = JSON.parse(ls.getItem(PROFILE_KEY));
  const m = stored.meta;
  check(
    'E.kept-through-writes',
    m.owned.heirloom_future_relic === 90 &&
      m.owned.vow_future === 0 &&
      m.deeds.includes('future_deed') &&
      m.feats.includes('future_feat') &&
      m.relicsSeen.includes('future_relic') &&
      m.marks.champion.includes('future_champion') &&
      m.marks.affix.includes('future_affix') &&
      Array.isArray(m.marks.future_mark) &&
      m.vowBest.future_mode === 3 &&
      m.loadout.heirloom === 'heirloom_future_relic' &&
      m.loadout.vows.includes('vow_future') &&
      m.loadout.vowRanks.vow_future === 2 &&
      m.loadout.kits.future_hero === 'kit_future' &&
      m.prestige && m.prestige.tier === 3 &&
      stored.journal.seen.future_kind && stored.journal.seen.future_kind.x === 2 &&
      stored.story.seen.includes('prologue'),
    JSON.stringify({ owned: m.owned, deeds: m.deeds, heirloom: m.loadout.heirloom }),
  );
  check('E.nothing-refunded', m.embers >= 100 && m.embers - 100 === ps.get().meta.lastAward.embers, `stored embers ${m.embers}, award ${ps.get().meta.lastAward && ps.get().meta.lastAward.embers}`);
  check('E.stamp-kept', stored.build === '9.9.9');
  // A known purse equipped and owned stays as this build reads it.
  check('E.known-kept', m.owned.purse_1 === 40 && m.loadout.purse === 1);
  // The old rule: no newer stamp, an unknown unlock is refunded and dropped.
  for (const build of [undefined, VERSION, '0.5.1']) {
    const p = future(build);
    if (build === undefined) delete p.build;
    const ls2 = memStorage({ [PROFILE_KEY]: JSON.stringify(p) });
    const ps2 = createProfileStore({ store: createSaveStorage({ storage: ls2 }) });
    ps2.noteStory('prologue');
    const s2 = JSON.parse(ls2.getItem(PROFILE_KEY));
    check(`E.old-rule(${build ?? 'no stamp'})`, s2.meta.embers === 190 && !s2.meta.owned.heirloom_future_relic && !s2.meta.deeds.includes('future_deed') && s2.build === VERSION, `embers ${s2.meta.embers}, build ${s2.build}`);
  }
}

// -------------------------------------------------- F. deed facts ride --
{
  const page = (ls, seed = 5) => {
    const s = sim(seed);
    const save = createSaveSystem({ clock: s.clock, rng: s.rng, registry: s.registry, world: s.world, bus: s.bus, storage: ls });
    return { s, save };
  };
  const runEnd = (s) =>
    s.bus.emit(s.clock.tick, 'run_end', { result: 'defeat', act: 1, rooms: 3, ticks: 6000, campaign: { mode: 'campaign', startLevel: 1, levels: [{ level: 1, index: 1, rooms: 3, cleared: false, ticks: 6000 }] } });
  const A = page(memStorage());
  A.s.world.runSystem().startCampaign({ level: 1 });
  A.s.stepN(30);
  A.s.bus.emit(A.s.clock.tick, 'vault_open', {});
  A.s.bus.emit(A.s.clock.tick, 'room_cleared', { objective: 'hunt', won: true });
  A.s.bus.emit(A.s.clock.tick, 'crash', { tick: A.s.clock.tick, seat: 0, skill: 'x' });
  const t = A.save.capture();
  runEnd(A.s);
  const same = A.save.lastAward().deeds.slice().sort();
  const B = page(memStorage());
  const ra = B.save.apply(t);
  runEnd(B.s);
  const cont = B.save.lastAward().deeds.slice().sort();
  check('F.continue-keeps-deeds', ra.ok && same.length > 0 && JSON.stringify(same) === JSON.stringify(cont), `same page ${same.join(',')}; continue ${cont.join(',')}`);
  check('F.in-the-save', t.app && t.app.deedRun && t.app.deedRun.vaults === 1 && t.app.deedRun.objectives.includes('hunt') && t.app.crashBest === 1);
  // A save from before (no facts) starts them fresh, even after this page's own run.
  const C = page(memStorage());
  C.s.world.runSystem().startCampaign({ level: 1 });
  C.s.stepN(30);
  C.s.bus.emit(C.s.clock.tick, 'vault_open', {});
  const old = JSON.parse(JSON.stringify(t));
  delete old.app.deedRun;
  delete old.app.crashBest;
  C.save.apply(old);
  const after = C.save.capture().app;
  check('F.old-save-starts-fresh', after.deedRun.vaults === 0 && after.deedRun.objectives.length === 0 && after.crashBest === 0);
  // Round trip: capture -> apply -> capture gives the same facts.
  const D = page(memStorage());
  D.save.apply(t);
  check('F.round-trip', JSON.stringify(D.save.capture().app) === JSON.stringify(t.app));
}

const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ probe: 'save-safety', version: VERSION, ok: failed.length === 0, passed: results.length - failed.length, of: results.length, failed: failed.map((r) => r.id) }));
process.exit(failed.length ? 1 : 0);
