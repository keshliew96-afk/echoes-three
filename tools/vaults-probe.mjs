#!/usr/bin/env node
// KEYS AND VAULTS probe (docs/VAULTS.md), headless sim, no browser:
//   gate     campaigns (Endless and the Daily too) carry keys; the legacy
//            single run and the tutorial never do
//   elite    the elite roll is a hash (about one elite in five, rooms 1-5
//            only), drawing nothing from the run stream
//   champion the champion leaves a key where it fell; the clear brings a key
//            still on the floor to the party
//   pickup   a hero walking over a key takes it; one key at a time
//   door     with a key, the next path screen carries one vault door: never
//            cursed, never over the crown, keeping its door's reward glyph; a
//            crown plus a curse makes it wait a screen
//   vault    the vault door spends the key and leads to the treasure room: no
//            hostiles, piles and the platter taken by walking, the chest (E)
//            gathers the rest, then the door's draft and a relic pick
//   level    one vault a level; a key the level ends with is lost
//   auto     the autopilot takes the vault door and opens the chest
//   replay   the same seed plays a key and a vault to the same events
//   save     a capture inside the vault continues bit-identically
//
//   node tools/vaults-probe.mjs [--seed 4] [--out captures/vaults-probe.json]
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { hashState } = await import(u('src/core/hash.js'));
const { canonicalJSON } = await import(u('src/core/canonical.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { clonePlain } = await import(u('src/save/codec.js'));
const V = await import(u('src/sim/vaults.js'));
const C = await import(u('src/sim/champions.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEED = Number(opt('seed', '4'));
const OUT = opt('out', 'captures/vaults-probe.json');
const R = V.VAULT_RULES;

const results = [];
let failed = 0;
function check(leg, name, ok, detail = null) {
  results.push({ leg, name, ok: !!ok, ...(detail !== null ? { detail } : {}) });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null ? ` ${JSON.stringify(detail)}` : ''}`);
  return !!ok;
}

function build(seed) {
  let impl = createGameplayRng(seed >>> 0);
  const rng = {
    stream: 'gameplay',
    get seed() { return impl.seed; },
    get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (p) => impl.chance(p),
    pick: (a) => impl.pick(a),
    reseed: (s) => { impl = createGameplayRng(s >>> 0); return impl.seed; },
    getState: () => impl.getState(),
    setState: (st) => { impl = createGameplayRng(st.seed >>> 0); return impl.setState(st); },
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const ap = world.runSystem().autopilot;
  const io = createStateIO({ clock, rng, registry, world });
  const log = [];
  let rec = null;
  bus.on('*', (e) => {
    if (rec && e.type !== 'sound') rec.push(e);
    if (e.type.startsWith('key_') || e.type.startsWith('vault_') || e.type.startsWith('champion_') || ['room_cleared', 'relic_offer', 'reward_offer', 'path_offer', 'path_chosen', 'glint_gain', 'room_enter', 'death', 'level_clear', 'enemy_spawn', 'full_heal', 'heal'].includes(e.type)) log.push(e);
  });
  const step = () => clock.stepOnce((t) => world.step(t, ap.active() ? ap.intents(t, emptySnapshot()) : emptySnapshot()));
  function continuation(n, every = 60) {
    rec = [];
    const hashes = [];
    for (let done = 0; done < n; done += every) {
      for (let k = 0; k < every; k++) step();
      hashes.push(hashState(io.capture()));
    }
    const events = rec.map((e) => canonicalJSON(e));
    rec = null;
    return { hashes, events };
  }
  const run = () => world.runSystem();
  return { registry, bus, clock, world, ap, io, step, continuation, log, run };
}

const heroes = (w) => w.registry.all().filter((e) => e.partyIndex !== undefined);
function holdParty(w) {
  for (const e of heroes(w)) if (e.hp > 0) e.hp = e.maxHp;
}
function stepUntil(w, pred, guard, each = null) {
  for (let i = 0; i < guard; i++) {
    if (each) each();
    w.step();
    if (pred()) return true;
  }
  return false;
}
// Put every hero at (x, z) (the party walks; the probe teleports).
function moveParty(w, x, z) {
  for (const e of heroes(w)) {
    e.x = x;
    e.z = z;
    e.px = x;
    e.pz = z;
  }
}
// Park the party far from (x, z).
const park = (w) => moveParty(w, 0, 6);
const vs = (w) => w.run().cmd('vaultState', []);
function campaign(seed, extra = {}) {
  const w = build(seed);
  w.run().startCampaign({ level: 1, harness: true, ...extra });
  w.step();
  return w;
}
// Clear the live room and walk the pages (draft declined, relic taken) to the
// next path screen.
function toPath(w) {
  w.world.cmd('clearRoom');
  for (let i = 0; i < 600 && w.run().view().phase !== 'path'; i++) {
    const ph = w.run().view().phase;
    if (ph === 'reward') w.run().declineReward();
    else if (ph === 'relic') w.run().chooseRelic(0);
    w.step();
  }
  return w.run().view().path;
}
function intoRoom(w, n) {
  for (let i = 0; i < 240 && !(w.run().view().room === n && w.run().view().phase !== 'fade'); i++) w.step();
}

// ---------------------------------------------------------------- gate --
{
  const w = campaign(SEED);
  const s = vs(w);
  check('gate', 'a campaign carries keys (no key yet, the vault shut)', !!s && s.key === null && s.opened === 0, s);
  check('gate', "the run view says so (present only in a run with keys)", !!w.run().view().vaults);
  const legacy = build(SEED);
  legacy.run().startRun({ act: 1 });
  check('gate', 'the legacy single run never carries one', vs(legacy) === null && !legacy.run().view().vaults && legacy.run().cmd('keyGive', []) === null);
  const tut = build(SEED);
  tut.run().startCampaign({ tutorial: true, harness: true });
  check('gate', 'nor does the tutorial', vs(tut) === null);
  const en = build(SEED);
  en.run().startCampaign({ endless: true, harness: true });
  check('gate', 'Endless carries keys', !!vs(en));
  const da = build(SEED);
  da.run().startCampaign({ daily: { key: '2026-10-09' }, harness: true });
  check('gate', 'the Daily carries keys', !!vs(da));
}

// --------------------------------------------------------------- elite --
{
  let n = 0;
  let hit = 0;
  let late = 0;
  for (let s = 1; s <= 40; s++)
    for (let room = 1; room <= 8; room++)
      for (let id = 10; id < 60; id++) {
        const k = V.eliteDropsKey(s * 7919, 1, room, id);
        if (room <= 5) {
          n += 1;
          if (k) hit += 1;
        } else if (k) late += 1;
      }
  const rate = hit / n;
  check('elite', `an elite in rooms 1-5 drops a key about ${R.eliteChance * 100}% of the time, never later`, Math.abs(rate - R.eliteChance) < 0.03 && late === 0, { rate: Math.round(rate * 1000) / 1000, late });
  // A real elite kill: find an elite whose id rolls a key, fell it.
  let got = null;
  for (let s = 1; s <= 30 && !got; s++) {
    const w = campaign(s, { level: 3 });
    w.world.cmd('skipToRoom', 3);
    w.step();
    for (let i = 0; i < 60 * 40 && !got; i++) {
      holdParty(w);
      w.step();
      const v = w.run().view();
      const el = w.registry.all().find((e) => e.elite && e.faction === 'hostile' && e.hp > 0 && e.state === 'active' && V.eliteDropsKey(v.frame.seed, 1, v.room, e.id));
      if (el) {
        park(w);
        const at = { x: el.x, z: el.z };
        w.world.cmd('setHp', el.id, 0);
        stepUntil(w, () => w.log.some((x) => x.type === 'key_drop'), 30, () => park(w));
        got = { seed: s, at, drop: w.log.find((x) => x.type === 'key_drop') };
      }
    }
  }
  check('elite', 'an elite whose roll comes up drops a key where it fell', !!got && !!got.drop && got.drop.from === 'elite' && Math.hypot(got.drop.x - got.at.x, got.drop.z - got.at.z) < 0.6, got);
  // Reading the rules draws nothing: the same frame with or without keys.
  const a = campaign(SEED);
  const b = campaign(SEED);
  b.run().cmd('vaultState', []);
  check('elite', 'the key rules draw nothing from the run stream', JSON.stringify(a.run().view().frame) === JSON.stringify(b.run().view().frame));
}

// ------------------------------------------------------------ champion --
const champ = (w) => {
  const s = w.log.find((e) => e.type === 'champion_spawn');
  return s ? w.registry.byId(s.id) : null;
};
{
  const w = campaign(SEED);
  w.run().cmd('championRoom', [4]);
  w.world.cmd('skipToRoom', 4);
  stepUntil(w, () => !!champ(w), 240);
  const e = champ(w);
  for (let i = 0; i < 120; i++) {
    holdParty(w);
    w.step();
  }
  park(w);
  const at = { x: e.x, z: e.z };
  w.world.cmd('setHp', e.id, 0);
  stepUntil(w, () => w.log.some((x) => x.type === 'key_drop'), 30);
  const drop = w.log.find((x) => x.type === 'key_drop');
  check('champion', 'the champion leaves a key where it fell', !!drop && drop.from === 'champion' && drop.kind === 'briar_knight' && Math.hypot(drop.x - at.x, drop.z - at.z) < 0.6, drop);
  const loose = w.registry.all().find((x) => x.kind === 'vault_key');
  check('champion', 'the key lies on the floor until a hero takes it', !!loose && vs(w).key === null);
  park(w);
  w.world.cmd('clearRoom');
  stepUntil(w, () => w.log.some((x) => x.type === 'room_cleared'), 600, () => park(w));
  const up = w.log.find((x) => x.type === 'key_pickup');
  check('champion', 'the clear brings a key left on the floor to the party', !!up && up.auto === true && vs(w).key && vs(w).key.from === 'champion' && !w.registry.all().some((x) => x.kind === 'vault_key'), { up, key: vs(w).key });
}

// -------------------------------------------------------------- pickup --
{
  const w = campaign(SEED);
  w.world.cmd('skipToRoom', 2);
  w.step();
  park(w);
  check('pickup', 'a key falls on cue', w.run().cmd('keyDrop', [3, -3]) === true);
  w.step();
  check('pickup', 'a second key cannot fall while one lies on the floor', w.run().cmd('keyDrop', [-3, -3]) === false);
  for (let i = 0; i < 10; i++) w.step();
  check('pickup', 'nobody near: the key stays down', vs(w).key === null);
  const tank = heroes(w).find((e) => e.partyIndex === 1);
  tank.x = 3.4;
  tank.z = -3.2;
  tank.px = tank.x;
  tank.pz = tank.z;
  w.step();
  const up = w.log.find((x) => x.type === 'key_pickup');
  check('pickup', 'a hero walking over it takes it for the party', !!up && up.by === tank.id && up.auto === false && !!vs(w).key, up);
  check('pickup', 'one key at a time: with a key held, none falls', w.run().cmd('keyDrop', [0, -2]) === false);
}

// ---------------------------------------------------------------- door --
function keyedPath(seed, room, setup = null) {
  const w = campaign(seed);
  w.world.cmd('skipToRoom', room);
  w.step();
  w.run().cmd('keyGive', []);
  if (setup) setup(w);
  const p = toPath(w);
  return { w, p };
}
{
  let bad = [];
  let seen = 0;
  for (let s = 1; s <= 16; s++) {
    const { w, p } = keyedPath(s, 1 + (s % 4));
    if (!p) {
      bad.push({ seed: s, why: 'no path' });
      continue;
    }
    const vd = p.options.filter((o) => o.vault);
    const crown = p.options.find((o) => o.champion);
    const cursed = p.options.find((o) => o.curse);
    if (crown && cursed) {
      if (vd.length) bad.push({ seed: s, why: 'vault beside crown + curse', opts: p.options });
      continue;
    }
    if (vd.length !== 1 || vd[0].curse || vd[0].champion || vd[0].win !== 'vault' || !(vd[0].reward === 'skill' || vd[0].reward === 'node')) bad.push({ seed: s, opts: p.options });
    else seen += 1;
    void w;
  }
  check('door', 'with a key, the next screen carries one vault door, uncursed, uncrowned, with its reward glyph (seeds 1-16)', bad.length === 0 && seen >= 12, { seen, bad: bad.slice(0, 2) });
  // A curse on the vault's preferred side moves it across.
  const a = keyedPath(SEED, 2, (w) => {
    w.run().cmd('relicDoor', ['short_fuse', 0]);
    w.run().cmd('vaultDoor', [0]);
  });
  const av = a.p && a.p.options.find((o) => o.vault);
  check('door', 'never the cursed door: a curse on its side moves the vault across', !!av && av.side === 1 && !!a.p.options[0].curse, a.p && a.p.options);
  // The crown on one door and a curse on the other: the vault waits a screen.
  const b = keyedPath(SEED, 3, (w) => {
    w.run().cmd('crownDoor', [0]);
    w.run().cmd('relicDoor', ['short_fuse', 1]);
  });
  const bOpts = b.p ? b.p.options : [];
  check('door', 'crown plus curse: no vault door this screen, the key kept', b.p && !bOpts.some((o) => o.vault) && bOpts.some((o) => o.champion) && !!vs(b.w).key, bOpts);
  // The crown and the vault on one screen, side by side.
  let cOpts = [];
  for (let s = 1; s <= 12 && !(cOpts[1] && cOpts[1].vault); s++) {
    const c = keyedPath(s, 3, (w) => w.run().cmd('crownDoor', [0]));
    cOpts = c.p ? c.p.options : [];
  }
  check('door', 'a crown door and a vault door can share a screen', cOpts.length === 2 && cOpts[0].champion && cOpts[1].vault, cOpts);
  // No key: no vault door.
  const w = campaign(SEED);
  w.world.cmd('skipToRoom', 2);
  w.step();
  const p = toPath(w);
  check('door', 'no key, no vault door', !!p && !p.options.some((o) => o.vault));
  // Never into room 7 (the shop): room 6's path screen has none.
  const z = keyedPath(SEED, 5);
  check('door', 'a vault door leads into rooms 2-6 (room 6 here)', !!z.p && z.p.nextRoom === 6 && z.p.options.some((o) => o.vault));
}

// --------------------------------------------------------------- vault --
let vaultSave = null;
{
  const { w, p } = keyedPath(SEED, 2, (w) => w.run().cmd('vaultDoor', [1]));
  const door = p.options.find((o) => o.vault);
  const wallet0 = w.run().view().wallet;
  const r = w.run().choosePath(door.side);
  intoRoom(w, 3);
  const v = w.run().view();
  check('vault', 'the vault door spends the key and leads to the vault room', r && r.vault === true && v.mode === 'vault' && v.phase === 'vault' && vs(w).key === null && vs(w).opened === 1 && w.log.some((x) => x.type === 'vault_door_taken'), { r, mode: v.mode, phase: v.phase, s: vs(w) });
  const enter = w.log.find((x) => x.type === 'vault_enter');
  check('vault', 'it holds a chest, three Glint piles and a food platter', !!enter && enter.piles.length === 3 && !!enter.platter && !!enter.chest && w.registry.all().filter((e) => e.kind === 'vault_pile').length === 3, enter);
  for (let i = 0; i < 120; i++) w.step();
  check('vault', 'nothing hostile ever enters it', !w.registry.all().some((e) => e.faction === 'hostile') && !w.log.some((x) => x.type === 'enemy_spawn' && x.tick > enter.tick));
  // Walk the Swordsman over pile 0; hurt the party, walk the Tank to the platter.
  const sw = heroes(w).find((e) => e.partyIndex === 2);
  const pile = enter.piles[0];
  sw.x = pile.x;
  sw.z = pile.z;
  sw.px = sw.x;
  sw.pz = sw.z;
  w.step();
  const pg = w.log.find((x) => x.type === 'vault_pile');
  check('vault', `walking over a pile takes it: +${R.pileGlint} Glint`, !!pg && pg.by === sw.id && w.run().view().wallet === wallet0 + R.pileGlint, { pg, wallet: w.run().view().wallet, wallet0 });
  for (const e of heroes(w)) e.hp = Math.max(1, e.maxHp * 0.3);
  const tk = heroes(w).find((e) => e.partyIndex === 1);
  tk.x = enter.platter.x;
  tk.z = enter.platter.z;
  tk.px = tk.x;
  tk.pz = tk.z;
  const before = heroes(w).map((e) => e.hp);
  w.step();
  const pl = w.log.find((x) => x.type === 'vault_platter');
  const after = heroes(w).map((e) => e.hp);
  check('vault', 'walking to the platter heals the whole party', !!pl && pl.healed === 4 && after.every((h, i) => h >= before[i] + heroes(w)[i].maxHp * 0.45), { pl, before, after });
  vaultSave = clonePlain(w.io.capture());
  // E on the chest: the Healer walks up and presses.
  const ch = enter.chest;
  w.world.player.x = ch.x;
  w.world.player.z = ch.z + 1.0;
  w.world.player.px = w.world.player.x;
  w.world.player.pz = w.world.player.z;
  for (let i = 0; i < 6 && !w.log.some((x) => x.type === 'vault_open'); i++) w.clock.stepOnce((t) => w.world.step(t, { ...emptySnapshot(), presses: [{ kind: 'interact' }] }));
  const op = w.log.find((x) => x.type === 'vault_open');
  check('vault', 'E on the chest opens it and gathers the rest of the hoard', !!op && op.glint === R.pileGlint * 3 && w.run().view().wallet === wallet0 + R.pileGlint * 3 && !w.registry.all().some((e) => e.kind === 'vault_pile'), { op, wallet: w.run().view().wallet });
  check('vault', 'the draft waits while the lid comes up', w.run().view().phase === 'vault', { phase: w.run().view().phase });
  for (let i = 0; i < 200 && w.run().view().phase === 'vault'; i++) w.clock.stepOnce((t) => w.world.step(t, emptySnapshot()));
  const ro = w.log.filter((x) => x.type === 'reward_offer').at(-1);
  check('vault', "then the door's own draft", w.run().view().phase === 'reward' && !!ro && ro.promised === door.reward, { phase: w.run().view().phase, ro });
  w.run().declineReward();
  w.step();
  const rel = w.log.filter((x) => x.type === 'relic_offer').at(-1);
  check('vault', 'then a relic pick from the chest', w.run().view().phase === 'relic' && !!rel && rel.source === 'vault' && rel.choices.length > 0, rel);
  w.run().chooseRelic(0);
  w.step();
  check('vault', 'then the doors, as after any room', w.run().view().phase === 'path', w.run().view().phase);
  // level: one vault a level.
  check('level', 'one vault a level: no key falls once it is open', w.run().cmd('keyDrop', [0, 0]) === false);
  // A key that rides to the level's end is lost.
  const l = campaign(SEED);
  l.world.cmd('skipToRoom', 8);
  l.step();
  l.run().cmd('keyGive', []);
  l.run().cmd('killBoss', []);
  stepUntil(l, () => l.log.some((x) => x.type === 'key_lapse'), 60 * 20, () => holdParty(l));
  check('level', 'a key the level ends with is lost', l.log.some((x) => x.type === 'key_lapse') && vs(l).key === null, vs(l));
}

// ---------------------------------------------------------------- auto --
{
  const w = campaign(SEED);
  w.world.cmd('skipToRoom', 2);
  w.step();
  w.run().cmd('keyGive', []);
  w.ap.configure(true);
  w.world.cmd('clearRoom');
  stepUntil(w, () => w.log.some((x) => x.type === 'vault_open'), 60 * 30, () => holdParty(w));
  check('auto', 'the autopilot takes the vault door and opens the chest', w.log.some((x) => x.type === 'vault_door_taken') && w.log.some((x) => x.type === 'vault_open'));
}

// -------------------------------------------------------------- replay --
{
  const play = () => {
    const w = campaign(SEED);
    w.run().cmd('championRoom', [4]);
    w.world.cmd('skipToRoom', 4);
    w.ap.configure(true);
    return w;
  };
  const a = play();
  const b = play();
  const ca = a.continuation(60 * 90);
  const cb = b.continuation(60 * 90);
  const same = JSON.stringify(ca.hashes) === JSON.stringify(cb.hashes) && JSON.stringify(ca.events) === JSON.stringify(cb.events);
  const keyed = ca.events.some((e) => e.includes('"key_drop"'));
  check('replay', 'a champion room, its key and what follows play the same twice (90 s, autopilot)', same && ca.events.length > 0, { events: ca.events.length, keyed });
}

// ---------------------------------------------------------------- save --
if (vaultSave) {
  const a = build(SEED);
  const ok1 = a.io.apply(clonePlain(vaultSave));
  a.ap.configure(true);
  const contA = a.continuation(600);
  const b = build(SEED + 1000);
  const ok2 = b.io.apply(clonePlain(vaultSave));
  b.ap.configure(true);
  const contB = b.continuation(600);
  const same = JSON.stringify(contA.hashes) === JSON.stringify(contB.hashes) && JSON.stringify(contA.events) === JSON.stringify(contB.events);
  const opened = contA.events.some((e) => e.includes('"vault_open"'));
  check('save', 'a capture inside the vault continues bit-identically in a fresh world (the autopilot opens it)', ok1.ok && ok2.ok && same && opened, { applyA: ok1.ok, applyB: ok2.ok, events: contA.events.length, opened });
}

mkdirSync(dirname(join(here, OUT)), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify({ seed: SEED, failed, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} checks pass -> ${OUT}`);
process.exit(failed ? 1 : 0);
