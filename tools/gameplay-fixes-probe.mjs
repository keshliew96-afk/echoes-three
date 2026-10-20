#!/usr/bin/env node
// GAMEPLAY FIXES probe (v0.5.324) — headless Node, no browser.
//
//   node tools/gameplay-fixes-probe.mjs
//
// Checks:
//   1. Famine: a door's room curse taken in the room before (its path
//      phase) leaves that room's healing whole; in its own room healing is
//      cut. Withering (a major curse) still cuts healing everywhere.
//   2. Endless (and Boss Rush, which opens with it): an old save with only a
//      Spire clear opens it, as does a Kiln clear; a Level IV clear alone does
//      not; gameWon still opens it.
//   3. Fonts: AP_FONT and the HUD's FONT_STACK end in
//      var(--i18n-font, sans-serif), like every other UI stack (docs/I18N.md).
//   4. Guest Level Select: the host driver answers a guest's camp_open_ask
//      with the host camp's open levels; levels.js shows a guest those (and
//      the host lock line), and a page that is not a guest its own profile.
//   5. Records restore: a corrupt main is kept aside and shown as unreadable;
//      a readable kept file restores by swapping places with the current
//      records (so a second restore swaps back); a newer-format kept file is
//      never restored; Remove deletes it.
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;

const fails = [];
const check = (ok, what) => {
  if (!ok) fails.push(what);
  console.log(ok ? 'ok  ' : 'FAIL', what);
  return ok;
};

// 1 ------------------------------------------------------------- Famine --
{
  const { createGameplayRng } = await import(u('src/core/rng.js'));
  const { createRegistry } = await import(u('src/core/registry.js'));
  const { createEventBus } = await import(u('src/core/events.js'));
  const { createClock } = await import(u('src/core/clock.js'));
  const { createWorld } = await import(u('src/sim/world.js'));
  const { emptySnapshot } = await import(u('src/core/intents.js'));
  const makeWorld = (seed) => {
    const rng = createGameplayRng(seed >>> 0);
    const r = { stream: 'gameplay', get seed() { return rng.seed; }, get drawIndex() { return rng.drawIndex; }, float: () => rng.float(), range: (a, b) => rng.range(a, b), int: (n) => rng.int(n), chance: (p) => rng.chance(p), pick: (a) => rng.pick(a), reseed: (s) => s };
    const registry = createRegistry();
    const bus = createEventBus();
    const clock = createClock();
    const world = createWorld({ rng: r, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
    const step = () => clock.stepOnce((t) => world.step(t, emptySnapshot()));
    return { world, registry, run: world.runSystem(), step };
  };
  // One heal of 10 on a hurt hero (a crit makes it 15; a cut one 4 or 6).
  const healOf = (W) => {
    const h = W.registry.all().find((e) => e.partyIndex === 1 && e.hp > 0) ?? W.registry.all().find((e) => e.partyIndex !== undefined && e.hp > 0);
    h.hp = Math.max(1, h.maxHp - 50);
    const before = h.hp;
    W.run.cmd('relicHeal', [h.id, null, 10]);
    return Math.round((h.hp - before) * 100) / 100;
  };
  const cut = (n) => n < 10;
  function doorRun(curse) {
    const W = makeWorld(11);
    W.run.startCampaign({ level: 1, harness: true });
    W.run.cmd('relics', [true]);
    W.world.cmd('skipToRoom', 2);
    for (let i = 0; i < 30; i++) W.step();
    W.run.cmd('relicDoor', [curse, 0]);
    W.world.cmd('clearRoom');
    const out = { pathHeal: null, roomHeal: null, cursedRoom: null };
    for (let i = 0; i < 6000; i++) {
      W.step();
      const v = W.run.view();
      const ph = v.phase;
      if (ph === 'reward') W.run.cmd('draftDecline', []);
      else if (ph === 'relic') W.run.cmd('relicChoose', [0]);
      else if (ph === 'shop') W.run.cmd('shopAdvance', []);
      else if (ph === 'path') {
        W.run.cmd('pathChoose', [0]);
        const rel = W.run.cmd('relics', []);
        // The door's curse is now held for the next room; the party still
        // stands in the room it cleared.
        if (rel && rel.curse && out.pathHeal === null) {
          out.cursedRoom = rel.curse.room;
          out.pathHeal = healOf(W);
        }
      } else if (ph === 'combat' && out.pathHeal !== null && v.room === out.cursedRoom) {
        for (let k = 0; k < 5; k++) W.step();
        out.roomHeal = healOf(W);
        break;
      }
    }
    return out;
  }
  const f = doorRun('famine');
  check(f.pathHeal !== null && !cut(f.pathHeal), `Famine taken at the door: the cleared room's heal stays whole (${f.pathHeal})`);
  check(f.roomHeal !== null && cut(f.roomHeal), `Famine's own room (room ${f.cursedRoom}) cuts the heal (${f.roomHeal})`);
  const w = doorRun('withering');
  check(w.pathHeal !== null && cut(w.pathHeal) && w.roomHeal !== null && cut(w.roomHeal), `Withering (major) still cuts healing everywhere (${w.pathHeal}, ${w.roomHeal})`);
}

// 2 ------------------------------------------------------ Endless unlock --
{
  const { endlessUnlockedFrom } = await import(u('src/data/endless.js'));
  const { rushUnlockedFrom } = await import(u('src/data/rush.js'));
  const prof = (records) => ({ records: { gameWon: false, campaignsCompleted: 0, levelClears: { 1: 1, 2: 1, 3: 1, 4: 1 }, ...records } });
  const spire = prof({ levelClears: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 } });
  const kiln = prof({ levelClears: { 1: 1, 2: 1, 3: 1, 4: 1, 6: 1 } });
  const four = prof({});
  check(endlessUnlockedFrom(spire) && rushUnlockedFrom(spire), 'an old save with a Spire clear opens Endless and Boss Rush');
  check(endlessUnlockedFrom(kiln) && rushUnlockedFrom(kiln), 'an old save with a Kiln clear opens them (unchanged)');
  check(!endlessUnlockedFrom(four) && !rushUnlockedFrom(four), 'a Level IV clear alone opens neither (unchanged)');
  check(endlessUnlockedFrom(prof({ gameWon: true })) && !endlessUnlockedFrom(null), 'gameWon opens it; no profile does not (unchanged)');
}

// 3 --------------------------------------------------------------- Fonts --
{
  const { AP_FONT } = await import(u('src/app/style.js'));
  const { FONT_STACK } = await import(u('src/ui/hud/style.js'));
  check(/var\(--i18n-font, sans-serif\)$/.test(AP_FONT), `AP_FONT ends in var(--i18n-font, sans-serif): ${AP_FONT}`);
  check(/var\(--i18n-font, sans-serif\)$/.test(FONT_STACK), `HUD FONT_STACK ends in var(--i18n-font, sans-serif): ${FONT_STACK}`);
}

// 4 --------------------------------------------------- Guest Level Select --
{
  const { createHostDriver } = await import(u('src/net/driver.js'));
  const { encodeCmd, decodeCmd } = await import(u('src/net/protocol/codec.js'));
  const sent = [];
  const net = { transport: { state: 'open', sendBinary: (b) => sent.push(b) }, room: { seats: [] } };
  const stub = { on: () => () => {}, onTickEnd: () => () => {}, tick: 0, all: () => [], byId: () => null };
  const host = createHostDriver({
    net,
    world: { ...stub, player: null, seatControllers: () => [] },
    clock: stub,
    bus: stub,
    registry: stub,
    capture: () => ({}),
    sampleLocal: () => null,
    onCampOpen: () => ({ acts: [1, 2, 3], endless: true, rush: false }),
  });
  host.onBinary(encodeCmd(2, 7, { kind: 'camp_open_ask' }));
  const back = sent.map((b) => decodeCmd(b)).find((c) => c.cmd.kind === 'camp_open');
  check(!!back && back.seat === 2 && JSON.stringify(back.cmd.acts) === '[1,2,3]' && back.cmd.endless === true && back.cmd.rush === false, `the host answers a guest's ask with its open levels (${back ? JSON.stringify(back.cmd) : 'nothing'})`);

  // levels.js with stand-in services: a guest whose own profile opened only
  // Level I, while the host opened I to III and Endless.
  const { provide } = await import(u('src/app/registry.js'));
  globalThis.window = globalThis.window ?? { location: { search: '' } };
  const guestProfile = { records: { gameWon: false, levelClears: { 1: 0 } }, meta: null };
  let guestRole = true;
  provide('content', { unlockedActs: () => [1] });
  provide('save', { profile: () => guestProfile });
  provide('net', {
    isGuest: () => guestRole,
    isHost: () => false,
    session: { hostOpen: () => (guestRole ? { acts: [1, 2, 3], endless: true, rush: false } : null) },
  });
  const { levelInfo, endlessInfo, rushInfo } = await import(u('src/ui/run/levels.js'));
  const open = (list) => list.filter((i) => i.unlocked).map((i) => i.level).join(',');
  const gl = levelInfo();
  check(open(gl) === '1,2,3', `a guest's level cards open the host's levels (${open(gl)})`);
  check(gl.find((i) => i.level === 4).lockLine === 'The host has not unlocked that yet', `a guest's locked card says the host has not unlocked it`);
  check(endlessInfo().unlocked === true && rushInfo().unlocked === false, "a guest's Endless and Boss Rush cards follow the host's");
  guestRole = false;
  const own = levelInfo();
  check(open(own) === '1' && own.find((i) => i.level === 2).lockLine !== 'The host has not unlocked that yet' && endlessInfo().unlocked === false, `a page that is not a guest shows its own profile (${open(own)})`);
}

// 5 ------------------------------------------------------ Records restore --
{
  const { createSaveStorage, PROFILE_KEY } = await import(u('src/save/storage.js'));
  const { createProfileStore } = await import(u('src/save/profile.js'));
  const mem = new Map();
  const ls = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    key: (i) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  };
  const KEPT = `${PROFILE_KEY}.corrupt`;
  const store = createSaveStorage({ storage: ls });
  // A torn main and no backup: the records reset, the text is kept aside.
  mem.set(PROFILE_KEY, '{"v":1,"records":{"runs":4');
  let P = createProfileStore({ store });
  let k = P.keptAside();
  check(P.report.status === 'recovered' && k && !k.readable && !k.newer, `a torn records file is kept aside and shown as unreadable (${JSON.stringify(k)})`);
  check(P.restoreKeptAside().error === 'corrupt' && mem.get(PROFILE_KEY) !== null, 'an unreadable kept file is never restored');
  // A readable kept file (a profile with 12 runs).
  P.recordRun && P.persist();
  const old = JSON.parse(JSON.stringify(P.get()));
  old.records.runs = 12;
  old.records.victories = 3;
  old.savedAt = '2026-09-01T10:00:00.000Z';
  mem.set(KEPT, JSON.stringify(old));
  P = createProfileStore({ store });
  const curRuns = P.get().records.runs;
  k = P.keptAside();
  check(k && k.readable && k.runs === 12 && k.savedAt === old.savedAt, `a readable kept file shows its runs and date (${JSON.stringify(k)})`);
  const r = P.restoreKeptAside();
  check(r.ok && P.get().records.runs === 12, `Restore it swaps the kept records in (runs ${P.get().records.runs})`);
  k = P.keptAside();
  check(k && k.readable && k.runs === curRuns, `the replaced records are kept aside in its place (runs ${k && k.runs})`);
  check(P.restoreKeptAside().ok && P.get().records.runs === curRuns && P.keptAside().runs === 12, 'a second restore swaps back');
  // A newer-format kept file.
  mem.set(KEPT, JSON.stringify({ ...old, v: 2 }));
  k = P.keptAside();
  check(k && !k.readable && k.newer && P.restoreKeptAside().error === 'newer', 'a newer-format kept file shows as newer and is never restored');
  check(P.dropKeptAside().ok && P.keptAside() === null && !mem.has(KEPT), 'Remove it deletes the kept file');
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
process.exit(fails.length ? 1 : 0);
