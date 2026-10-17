#!/usr/bin/env node
// SECRET ROOMS probe (docs/SECRET_ROOMS.md), headless sim, no browser:
//   gate     campaigns (Endless and the Daily too) hide walls; the legacy
//            single run and the tutorial never do
//   roll     the wall roll is a hash: rooms 4-6, plain fights only (kill_all
//            and defend), drawing nothing from the run stream
//   level    at most one wall a level (autopilot campaigns over 8 seeds)
//   break    a bomb opens it; a heavy skill hit opens it; a basic hit only
//            knocks; an AI seat's bomb only knocks
//   chamber  after the reward and the relic pick, the party stands in the
//            chamber; each content pays: the hoard, the reliquary's relic
//            pick, the cache's two tonics, the lectern's page (Journal), the
//            rare event (never the trapped chest)
//   auto     the autopilot with a bomb opens the wall and takes the chamber
//   summary  the run summary counts walls seen and secrets found
//   replay   the same seed plays a wall and its chamber to the same events
//   save     a capture inside the chamber continues bit-identically
//
//   node tools/secret-rooms-probe.mjs [--seed 4] [--out captures/secret-rooms-probe.json]
// Exit code 1 on any failure.
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
const S = await import(u('src/sim/secrets.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEED = Number(opt('seed', '4'));
const OUT = opt('out', 'captures/secret-rooms-probe.json');
const R = S.SECRET_RULES;

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
    if (e.type.startsWith('secret_') || e.type.startsWith('tonic_') || e.type.startsWith('event_') || ['room_cleared', 'relic_offer', 'reward_offer', 'path_offer', 'path_chosen', 'glint_gain', 'room_enter', 'death', 'level_clear', 'enemy_spawn', 'full_heal', 'heal'].includes(e.type)) log.push(e);
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
const ss = (w) => w.run().cmd('secretState', []);
function campaign(seed, extra = {}) {
  const w = build(seed);
  w.run().startCampaign({ level: 1, harness: true, ...extra });
  w.step();
  return w;
}
// Into room n of level 1, the fight live (a few ticks past its wave spawn).
function intoRoom(w, n) {
  w.world.cmd('skipToRoom', n);
  for (let i = 0; i < 5; i++) w.step();
}
// Clear the live room and walk the pages to the next path screen; `each`
// sees every phase on the way (the chamber, the event).
function toPath(w, each = null) {
  w.world.cmd('clearRoom');
  const phases = [];
  for (let i = 0; i < 1200; i++) {
    const ph = w.run().view().phase;
    if (phases.at(-1) !== ph) phases.push(ph);
    if (ph === 'path') break;
    if (each && each(ph)) {
      w.step();
      continue;
    }
    if (ph === 'reward') w.run().declineReward();
    else if (ph === 'relic') w.run().chooseRelic(0);
    else if (ph === 'secret') w.run().openSecret();
    else if (ph === 'event') w.run().openEncounter();
    else if (ph === 'encounter') w.run().chooseEncounter('leave');
    w.step();
  }
  return phases;
}
const live = (w) => w.registry.all().find((e) => e.kind === 'secret_wall');
// Step with seat 0 (the player) standing at the wall's face, aiming at it.
function faceWall(w) {
  const e = live(w);
  const fx = e.x + Math.sin(e.yaw) * 1.6;
  const fz = e.z + Math.cos(e.yaw) * 1.6;
  const p = w.world.player;
  p.x = fx;
  p.z = fz;
  p.px = fx;
  p.pz = fz;
  return e;
}
const snapAt = (e, extra) => ({ ...emptySnapshot(), aim: { x: e.x, z: e.z }, ...extra });

// ---------------------------------------------------------------- gate --
{
  const w = campaign(SEED);
  const s = ss(w);
  check('gate', 'a campaign hides walls (none shown yet)', !!s && s.found === 0 && s.seen === 0 && !s.wall, s);
  check('gate', 'the run view says so (present only in a run with secrets)', !!w.run().view().secrets);
  const legacy = build(SEED);
  legacy.run().startRun({ act: 1 });
  check('gate', 'the legacy single run never hides one', ss(legacy) === null && !legacy.run().view().secrets && legacy.run().cmd('secretWall', [4]) === null);
  const tut = build(SEED);
  tut.run().startCampaign({ tutorial: true, harness: true });
  check('gate', 'nor does the tutorial', ss(tut) === null);
  const en = build(SEED);
  en.run().startCampaign({ endless: true, harness: true });
  check('gate', 'Endless hides walls', !!ss(en));
  const da = build(SEED);
  da.run().startCampaign({ daily: { key: '2026-10-17' }, harness: true });
  check('gate', 'the Daily hides walls', !!ss(da));
}

// ---------------------------------------------------------------- roll --
{
  const MODES = ['kill_all', 'defend', 'hunt', 'purge', 'escort', 'hold', 'event', 'shop', 'boss', 'vault', 'champion'];
  let n = 0;
  let hit = 0;
  let stray = 0;
  for (let s = 1; s <= 400; s++)
    for (let room = 1; room <= 8; room++)
      for (const mode of MODES) {
        const k = S.wallRolls(s * 7919, 1, room, mode);
        if (room >= 4 && room <= 6 && (mode === 'kill_all' || mode === 'defend')) {
          n += 1;
          if (k) hit += 1;
        } else if (k) stray += 1;
      }
  const rate = hit / n;
  check('roll', `a plain fight in rooms 4-6 hides a wall about ${R.chance * 100}% of the time, nothing else ever does`, Math.abs(rate - R.chance) < 0.04 && stray === 0, { rate: Math.round(rate * 1000) / 1000, stray });
  const mix = {};
  for (let s = 1; s <= 2000; s++) {
    const c = S.chamberContent(s * 31, 1, 4 + (s % 3));
    mix[c] = (mix[c] ?? 0) + 1;
  }
  const tot = Object.values(R.contents).reduce((a, b) => a + b, 0);
  const off = Object.entries(R.contents).map(([id, wgt]) => Math.abs((mix[id] ?? 0) / 2000 - wgt / tot));
  check('roll', 'the chamber content follows its weights (hoard 30, relic 20, tonics 20, lore 15, event 15)', Math.max(...off) < 0.04, mix);
  check('roll', 'a rare event is never the trapped chest', [...Array(200).keys()].every((s) => S.chamberEvent(s, 1, 4, ['trapped_chest', 'weeping_shrine', 'wandering_peddler']) !== 'trapped_chest'));
  // The run stream: a forced wall draws nothing (the same stream as a room
  // whose roll came up empty).
  let seed = null;
  for (let s = 1; s <= 60 && seed === null; s++) {
    const b = campaign(s);
    intoRoom(b, 4);
    if (!live(b)) seed = s;
  }
  const a = campaign(seed);
  const b = campaign(seed);
  a.run().cmd('secretWall', [4]);
  intoRoom(a, 4);
  intoRoom(b, 4);
  const ra = a.io.capture().rng;
  const rb = b.io.capture().rng;
  check('roll', 'a wall draws nothing from the run stream', seed !== null && !!live(a) && !live(b) && JSON.stringify(ra) === JSON.stringify(rb), { seed, a: !!live(a), b: !!live(b), ra, rb });
}

// --------------------------------------------------------------- level --
{
  const perLevel = [];
  let total = 0;
  for (let s = 1; s <= 8; s++) {
    const w = campaign(s);
    w.ap.configure(true);
    const walls = [];
    w.bus.on('secret_wall', (e) => walls.push(e));
    w.bus.on('level_clear', () => {
      perLevel.push(walls.length);
      walls.length = 0;
    });
    stepUntil(w, () => perLevel.length >= s * 2 || !w.run().view().active, 60 * 60 * 12, () => holdParty(w));
    total += walls.reduce((n) => n + 1, 0);
  }
  check('level', 'at most one wall a level, and walls do show (autopilot, 8 seeds, two levels each)', perLevel.length > 0 && perLevel.every((n) => n <= R.maxPerLevel) && perLevel.some((n) => n === 1), { perLevel });
}

// --------------------------------------------------------------- break --
{
  // A bomb thrown by the player.
  const w = campaign(SEED);
  w.run().cmd('secretWall', [4, 'hoard']);
  intoRoom(w, 4);
  const e = faceWall(w);
  check('break', 'room 4 shows the forced wall, shut and solid', !!e && e.shut && !!e.collider && ss(w).wall.state === 'shut', ss(w).wall);
  w.run().cmd('tonicGive', [0, 'fire_bomb']);
  w.run().cmd('tonicUse', [0, e.x + Math.sin(e.yaw) * 0.5, e.z + Math.cos(e.yaw) * 0.5]);
  stepUntil(w, () => w.log.some((x) => x.type === 'secret_open'), 60 * 2, () => holdParty(w));
  const op = w.log.find((x) => x.type === 'secret_open');
  check('break', "the player's bomb breaks it open: the collider goes", !!op && op.how === 'bomb' && op.seat === 0 && !live(w).collider && ss(w).found === 1, op);
  // A heavy skill hit (the Healer's Spirit Bolt, base 18).
  const h = campaign(SEED);
  h.run().cmd('secretWall', [4, 'hoard']);
  intoRoom(h, 4);
  const he = faceWall(h);
  h.world.cmd('giveSkill', 'spirit_bolt');
  const slots = h.world.cmd('skillState');
  let knocks = 0;
  // Basic attacks first: they only knock.
  for (let i = 0; i < 90; i++) {
    holdParty(h);
    faceWall(h);
    h.clock.stepOnce((t) => h.world.step(t, snapAt(he, { basicAttackHeld: true })));
  }
  knocks = h.log.filter((x) => x.type === 'secret_knock').length;
  check('break', 'basic hits only knock dust from it, it stays shut', knocks > 0 && !h.log.some((x) => x.type === 'secret_open'), { knocks });
  for (let i = 0; i < 240 && !h.log.some((x) => x.type === 'secret_open'); i++) {
    holdParty(h);
    faceWall(h);
    const presses = i % 2 ? [] : [0, 1, 2, 3].map((k) => ({ kind: `skill_${k + 1}`, slot: k }));
    h.clock.stepOnce((t) => h.world.step(t, snapAt(he, { presses })));
  }
  const hop = h.log.find((x) => x.type === 'secret_open');
  check('break', 'a heavy skill hit breaks it open', !!hop && hop.how === 'hit' && hop.seat === 0, { hop, slots: slots ? slots.slots : null });
  // An AI seat's bomb only knocks.
  const ai = campaign(SEED);
  ai.run().cmd('secretWall', [4, 'hoard']);
  intoRoom(ai, 4);
  const ae = live(ai);
  const ally = heroes(ai).find((x) => x.partyIndex === 1);
  if (ally) {
    const fx = ae.x + Math.sin(ae.yaw) * 2;
    const fz = ae.z + Math.cos(ae.yaw) * 2;
    ally.x = fx;
    ally.z = fz;
    ally.px = fx;
    ally.pz = fz;
  }
  ai.run().cmd('tonicGive', [1, 'fire_bomb']);
  const used = ai.run().cmd('tonicUse', [1, ae.x + Math.sin(ae.yaw) * 0.5, ae.z + Math.cos(ae.yaw) * 0.5]);
  stepUntil(ai, () => ai.log.some((x) => x.type === 'tonic_burst'), 60 * 2, () => holdParty(ai));
  for (let i = 0; i < 10; i++) ai.step();
  check('break', "an AI seat's bomb does not open it", !!ally && used !== null && ai.log.some((x) => x.type === 'tonic_burst') && !ai.log.some((x) => x.type === 'secret_open') && live(ai).shut, { used: !!used, burst: ai.log.some((x) => x.type === 'tonic_burst') });
  // A wall left shut at the clear: no chamber.
  const left = toPath(ai);
  check('break', 'a wall still shut at the clear leads nowhere: reward, relic, doors', !left.includes('secret') && ss(ai).seen === 1 && ss(ai).found === 0, { left });
}

// ------------------------------------------------------------- chamber --
let chamberSave = null;
{
  const PAY = {};
  for (const holds of ['hoard', 'relic', 'tonics', 'lore', 'event']) {
    const w = campaign(SEED);
    w.run().cmd('secretWall', [4, holds]);
    intoRoom(w, 4);
    const wallet0 = w.run().view().wallet;
    w.run().cmd('secretOpen', []);
    let inChamber = null;
    let afterReward = false;
    const phases = toPath(w, (ph) => {
      if (ph === 'reward') afterReward = true;
      if ((ph === 'secret' || (ph === 'event' && holds === 'event')) && !inChamber) {
        inChamber = { ph, after: afterReward, room: w.run().view().room, chamber: w.registry.all().some((e) => e.kind === 'secret_chamber'), hostiles: w.registry.all().filter((e) => e.faction === 'hostile' && e.hp > 0).length, piles: w.registry.all().filter((e) => e.kind === 'secret_pile').length, body: (w.registry.all().find((e) => e.kind === 'secret_body') || {}).content ?? null, encounter: (w.registry.all().find((e) => e.itype === 'encounter' && e.secret) || {}).encounter ?? null };
        if (holds === 'relic' && !chamberSave) chamberSave = clonePlain(w.io.capture());
      }
      return false;
    });
    const take = w.log.find((x) => x.type === 'secret_take');
    PAY[holds] = { phases: phases.join('>'), inChamber, take, wallet: w.run().view().wallet - wallet0, relicOffers: w.log.filter((x) => x.type === 'relic_offer').map((x) => x.source), tonics: w.run().view().tonics ? w.run().view().tonics.slots : null, enter: w.log.find((x) => x.type === 'secret_enter') ?? null, eventEnter: w.log.filter((x) => x.type === 'event_enter').map((x) => x.encounter), pages: ss(w).pages ?? [] };
  }
  const H = PAY.hoard;
  check('chamber', 'after the reward page the party stands in the chamber: dark, no foes, three piles', !!H.inChamber && H.inChamber.after && H.inChamber.chamber && H.inChamber.hostiles === 0 && H.inChamber.piles === 3, H.inChamber);
  check('chamber', 'the hoard pays its three piles to the wallet, then the doors', !!H.take && H.take.content === 'hoard' && H.take.glint === R.hoardGlint * 3 && H.phases.endsWith('path'), { take: H.take, phases: H.phases });
  const Rl = PAY.relic;
  check('chamber', 'the reliquary opens on E into a relic pick of its own', !!Rl.take && Rl.take.relic === true && Rl.relicOffers.includes('secret') && /secret>relic>path$/.test(Rl.phases), { phases: Rl.phases, offers: Rl.relicOffers });
  const T = PAY.tonics;
  check('chamber', 'the cache fills two empty slots with tonics', !!T.take && Array.isArray(T.take.tonics) && T.take.tonics.length === 2 && T.tonics.filter(Boolean).length >= 2, { take: T.take, slots: T.tonics });
  const L = PAY.lore;
  check('chamber', "the lectern pays its purse and a page of the land's lore (Journal)", !!L.take && !!L.take.page && S.LORE_BY_ID[L.take.page].land === 'wood' && L.take.glint === R.loreGlint && L.pages.includes(L.take.page), { take: L.take, pages: L.pages });
  const E = PAY.event;
  check('chamber', 'the rare event stands in the dark chamber: a land encounter, never the trapped chest', !!E.inChamber && !!E.inChamber.encounter && E.inChamber.encounter !== 'trapped_chest' && E.eventEnter.includes(E.inChamber.encounter) && E.phases.includes('encounter') && E.phases.endsWith('path'), { inChamber: E.inChamber, phases: E.phases });
}

// ---------------------------------------------------------------- auto --
{
  const w = campaign(SEED);
  w.run().cmd('secretWall', [4, 'hoard']);
  intoRoom(w, 4);
  w.run().cmd('tonicGive', [0, 'fire_bomb']);
  w.ap.configure(true);
  stepUntil(w, () => w.log.some((x) => x.type === 'secret_take') || w.run().view().room > 4, 60 * 120, () => holdParty(w));
  const op = w.log.find((x) => x.type === 'secret_open');
  check('auto', 'the autopilot with a bomb breaks the wall and takes the chamber', !!op && op.how === 'bomb' && w.log.some((x) => x.type === 'secret_take'), { op: op ?? null, room: w.run().view().room });
  // summary
  stepUntil(w, () => w.run().view().phase === 'path', 60 * 30, () => holdParty(w));
  const ab = w.run().abandonRun('quit');
  const sum = ab ? ab.summary : null;
  check('summary', 'the run summary counts the wall seen and the secret found', !!sum && !!sum.secrets && sum.secrets.found === 1 && sum.secrets.seen === 1, sum ? sum.secrets : null);
}

// -------------------------------------------------------------- replay --
{
  const play = () => {
    const w = campaign(SEED);
    w.run().cmd('secretWall', [4, 'lore']);
    intoRoom(w, 4);
    w.run().cmd('tonicGive', [0, 'fire_bomb']);
    w.ap.configure(true);
    return w;
  };
  const a = play();
  const b = play();
  const ca = a.continuation(60 * 90);
  const cb = b.continuation(60 * 90);
  const same = JSON.stringify(ca.hashes) === JSON.stringify(cb.hashes) && JSON.stringify(ca.events) === JSON.stringify(cb.events);
  const took = ca.events.some((e) => e.includes('"secret_take"'));
  check('replay', 'a wall, its breaking and its chamber play the same twice (90 s, autopilot)', same && took, { events: ca.events.length, took });
}

// ---------------------------------------------------------------- save --
if (chamberSave) {
  const a = build(SEED);
  const ok1 = a.io.apply(clonePlain(chamberSave));
  a.ap.configure(true);
  const contA = a.continuation(600);
  const b = build(SEED + 1000);
  const ok2 = b.io.apply(clonePlain(chamberSave));
  b.ap.configure(true);
  const contB = b.continuation(600);
  const same = JSON.stringify(contA.hashes) === JSON.stringify(contB.hashes) && JSON.stringify(contA.events) === JSON.stringify(contB.events);
  const took = contA.events.some((e) => e.includes('"secret_take"'));
  check('save', 'a capture inside the chamber continues bit-identically in a fresh world (the autopilot opens the reliquary)', ok1.ok && ok2.ok && same && took, { applyA: ok1.ok, applyB: ok2.ok, events: contA.events.length, took });
} else check('save', 'a capture inside the chamber was taken', false);

mkdirSync(dirname(join(here, OUT)), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify({ seed: SEED, failed, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} checks pass -> ${OUT}`);
process.exit(failed ? 1 : 0);
