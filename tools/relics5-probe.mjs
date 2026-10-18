#!/usr/bin/env node
// RELICS batch 5 probe (docs/RELICS.md "Batch 5"), headless:
//
//   node tools/relics5-probe.mjs [--seed 4]
//
//   data     eight new relics (51 in all; 3 common, 3 rare, 2 legendary), an
//            heirloom each, two room curses and one major one, every new line
//            in the nine other languages
//   satchel  Brewer's Satchel: a tonic drunk heals every other hero 12%
//   flask    Bottomless Flask: the first tonic of a room comes back 10 s
//            later, once a room; a room clear lands a refill still pouring
//   fuse     Twin Fuse: a bomb bursts again 0.6 s after it lands, for half
//   votive   Votive Ribbon: a shrine blessing lasts 120 s, the offering heals
//   storm    Stormglass: a real gust vent's gust strikes the enemies in its
//            lane for 12% of max HP, nobody outside it
//   trophy   Trophy Cord: a felled champion adds 6% party damage
//   brand    Oathkeeper's Brand: offered only with a vow; +4% per Vow level
//   tenor    Tenor Bell: the 10th kill of a room rings it (12 damage and a
//            40% slow on every enemy); a kill inside a Bellwright bell's ring
//            counts twice
//   curses   Corked (no tonic, AI included, +10% enemy HP), Tolling Dead (a
//            fallen enemy's knell strikes the heroes by it 0.8 s later),
//            Dulled Edge (crits x1.25), and Saint's Ashes halving it
//   legacy   the single-level run carries none of it
//   save     a refill still pouring rides a save and lands after a load
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { clonePlain } = await import(u('src/save/codec.js'));
const { RELICS, RELIC_IDS, CURSES, CURSE_IDS, MAJOR_CURSE_IDS, dailyOmen } = await import(u('src/sim/relics.js'));
const { CONSUMABLES } = await import(u('src/sim/consumables.js'));
const { SHRINE_RULES } = await import(u('src/sim/shrines.js'));
const { UNLOCKS } = await import(u('src/data/unlocks.js'));

const argv = process.argv.slice(2);
const SEED = Number(argv.includes('--seed') ? argv[argv.indexOf('--seed') + 1] : 4);
const NEW = ['brewers_satchel', 'votive_ribbon', 'stormglass', 'twin_fuse', 'trophy_cord', 'oathkeepers_brand', 'bottomless_flask', 'tenor_bell'];
const NEW_CURSES = ['corked', 'tolling_dead', 'dulled_edge'];
const LANGS = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'pt-BR', 'fr', 'de', 'ru'];

let failed = 0;
let passed = 0;
function check(leg, name, ok, detail = null) {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null && !ok ? ` ${JSON.stringify(detail)}` : ''}`);
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
  const io = createStateIO({ clock, rng, registry, world });
  const log = [];
  bus.on('*', (e) => {
    if (e.type !== 'sound') log.push(e);
  });
  const step = (snap = null) => clock.stepOnce((t) => world.step(t, snap ?? emptySnapshot()));
  const run = () => world.runSystem();
  const cmd = (name, ...args) => world.cmd(name, ...args);
  return { registry, bus, clock, world, io, step, log, run, cmd };
}
const heroes = (w) => w.registry.all().filter((e) => e.partyIndex !== undefined);
const seat = (w, i) => heroes(w).find((e) => e.partyIndex === i);
const procs = (w, id, stage = null) => w.log.filter((e) => e.type === 'relic_proc' && e.relic === id && (!stage || e.stage === stage));
const idOf = (r) => (r && typeof r === 'object' ? r.id : r);
const steps = (w, n, each = null) => {
  for (let i = 0; i < n; i++) {
    if (each) each();
    w.step();
  }
};
function place(b, x, z) {
  b.x = b.px = x;
  b.z = b.pz = z;
}
// A campaign's room 1, its first wave cleared, the party full and still.
function campaign(seed, relics = [], opts = {}) {
  const w = build(seed);
  w.run().startCampaign({ level: 1, harness: true, ...opts });
  for (let i = 0; i < 4000 && w.run().view().phase !== 'combat'; i++) w.step();
  steps(w, 30);
  w.cmd('killAllEnemies');
  steps(w, 12);
  for (const id of relics) w.cmd('relicGrant', id);
  for (const e of heroes(w)) e.hp = e.maxHp;
  w.log.length = 0;
  return w;
}
function boar(w, x, z, hp = 400) {
  const e = w.registry.byId(idOf(w.cmd('spawn', 'boar', x, z)));
  if (e) {
    e.maxHp = hp;
    e.hp = hp;
    e.elite = false;
  }
  return e;
}
const hitOn = (w, target, power, crit = false, by = null) => {
  w.log.length = 0;
  w.cmd('relicHit', target.id, by, power, crit);
  const h = w.log.find((e) => e.type === 'hit' && e.target === target.id);
  return h ? h.amount : NaN;
};

// ---------------------------------------------------------------- data --
{
  const rar = NEW.map((id) => RELICS[id] && RELICS[id].rarity);
  const n = (r) => rar.filter((x) => x === r).length;
  check('data', `55 relics (51 here, the Duskwing's two since his world slice, the Kiln's two since plan 5 slice 9), the eight new ones present (${RELIC_IDS.length})`, RELIC_IDS.length === 55 && NEW.every((id) => RELICS[id]));
  check('data', `rarities 3 common, 3 rare, 2 legendary (${n('common')}/${n('rare')}/${n('legendary')})`, n('common') === 3 && n('rare') === 3 && n('legendary') === 2);
  check('data', 'none of them a class relic; an heirloom for each', NEW.every((id) => !RELICS[id].cls && UNLOCKS[`heirloom_${id}`] && UNLOCKS[`heirloom_${id}`].relic === id));
  check('data', `10 room curses and 7 major (${CURSE_IDS.length}/${MAJOR_CURSE_IDS.length})`, CURSE_IDS.length === 10 && MAJOR_CURSE_IDS.length === 7 && CURSE_IDS.includes('corked') && CURSE_IDS.includes('tolling_dead') && MAJOR_CURSE_IDS.includes('dulled_edge'));
  let brandDaily = 0;
  for (let s = 1; s <= 400; s++) if (dailyOmen(s * 7919).relic === 'oathkeepers_brand') brandDaily += 1;
  check('data', "the Daily's omen never names Oathkeeper's Brand (the Daily takes no vows)", brandDaily === 0);
  const keys = [];
  for (const id of NEW) keys.push(RELICS[id].name, RELICS[id].text, UNLOCKS[`heirloom_${id}`].text);
  for (const id of NEW_CURSES) keys.push(CURSES[id].name, CURSES[id].text);
  keys.push('Corked: tonics and bombs cannot be used in this room.');
  const miss = {};
  for (const l of LANGS) {
    const tab = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
    const m = keys.filter((k) => typeof tab[k] !== 'string' || !tab[k].trim());
    if (m.length) miss[l] = m;
  }
  check('data', `all ${keys.length} new lines in the nine other languages`, Object.keys(miss).length === 0, Object.keys(miss).length ? Object.fromEntries(Object.entries(miss).map(([l, m]) => [l, m.length])) : null);
}

// ------------------------------------------------------------- satchel --
{
  const w = campaign(SEED, ['brewers_satchel']);
  for (const e of heroes(w)) e.hp = e.maxHp * 0.4;
  const hp0 = heroes(w).map((e) => e.hp);
  w.cmd('tonicGive', 0, 'mend_tonic');
  w.cmd('tonicUse', 0);
  steps(w, 2);
  const others = heroes(w).filter((e) => e.partyIndex !== 0);
  const rise = others.map((e) => (e.hp - hp0[heroes(w).indexOf(e)]) / e.maxHp);
  const p = procs(w, 'brewers_satchel');
  check('satchel', `a tonic drunk heals every other hero 12% of max HP (${rise.map((r) => r.toFixed(3)).join(', ')})`, p.length === 1 && rise.every((r) => Math.abs(r - 0.12) < 0.005) && p[0].healed.length === others.length);
}

// --------------------------------------------------------------- flask --
let flaskSave = null;
{
  const w = campaign(SEED, ['bottomless_flask']);
  w.cmd('tonicGive', 0, 'ward_flask');
  w.cmd('tonicUse', 0);
  steps(w, 2);
  const empty = w.cmd('tonicState').slots[0] === null;
  check('flask', 'the flask pours as the tonic is drunk, the slot left empty', empty && procs(w, 'bottomless_flask', 'pour').length === 1);
  steps(w, 300);
  flaskSave = clonePlain(w.io.capture());
  steps(w, 310);
  const back = w.cmd('tonicState').slots[0];
  check('flask', `10 s later the Ward Flask is back in the slot (${back})`, back === 'ward_flask' && procs(w, 'bottomless_flask', 'refill').length === 1);
  w.cmd('tonicUse', 0);
  steps(w, 620);
  check('flask', 'once a room: the second use does not come back', w.cmd('tonicState').slots[0] === null && procs(w, 'bottomless_flask', 'refill').length === 1);
  // A refill still pouring when the room clears lands at the clear.
  const v = campaign(SEED, ['bottomless_flask']);
  v.cmd('tonicGive', 1, 'fire_bomb');
  v.cmd('tonicUse', 1, 0, -3);
  steps(v, 30);
  v.cmd('clearRoom');
  steps(v, 30);
  check('flask', 'a room clear lands a refill still pouring', v.cmd('tonicState').slots[1] === 'fire_bomb');
}

// ---------------------------------------------------------------- fuse --
{
  const burst = (relics) => {
    const w = campaign(SEED, relics);
    const p = seat(w, 0);
    const b = boar(w, p.x, p.z - 3, 1000);
    w.cmd('tonicGive', 0, 'frost_bomb');
    w.log.length = 0;
    w.cmd('tonicUse', 0, b.x, b.z);
    const hits = [];
    for (let i = 0; i < 120; i++) {
      b.x = b.px = p.x;
      b.z = b.pz = p.z - 3;
      w.step();
    }
    for (const e of w.log) if (e.type === 'hit' && e.target === b.id) hits.push({ tick: e.tick, amount: e.amount / (e.crit ? 1.5 : 1), source: e.source });
    const lit = w.log.find((e) => e.type === 'relic_proc' && e.relic === 'twin_fuse' && e.stage === 'lit');
    return { hits, lit, b };
  };
  const a = burst([]);
  const b = burst(['twin_fuse']);
  const first = b.hits.find((h) => h.source === 'frost_bomb');
  const echo = b.hits.find((h) => h.source === 'twin_fuse');
  check('fuse', 'without it, one burst', a.hits.filter((h) => h.source === 'twin_fuse').length === 0 && a.hits.filter((h) => h.source === 'frost_bomb').length === 1);
  check('fuse', `a second burst 36 ticks later (${first && echo ? echo.tick - first.tick : '-'}) for half the damage (${first ? first.amount.toFixed(1) : '-'} -> ${echo ? echo.amount.toFixed(1) : '-'})`, !!first && !!echo && !!b.lit && echo.tick - first.tick === 36 && Math.abs(echo.amount / first.amount - 0.5) < 0.02);
}

// -------------------------------------------------------------- votive --
{
  const offer = (relics) => {
    const w = campaign(SEED, relics);
    for (const e of heroes(w)) e.hp = e.maxHp * 0.5;
    const hp0 = heroes(w).map((e) => e.hp);
    w.cmd('shrineHere', 'mill', 3, -3);
    w.cmd('wallet', 100);
    w.log.length = 0;
    const r = w.cmd('shrineUse', 0);
    steps(w, 2);
    const off = w.log.find((e) => e.type === 'shrine_offer');
    return { r, off, gain: heroes(w).map((e, i) => (e.hp - hp0[i]) / e.maxHp), p: procs(w, 'votive_ribbon'), w };
  };
  const a = offer([]);
  const b = offer(['votive_ribbon']);
  const lenA = a.off ? a.off.untilTick - a.off.tick : null;
  const lenB = b.off ? b.off.untilTick - b.off.tick : null;
  check('votive', `the Tithe Shrine's Ward lasts ${lenB} ticks with the ribbon, ${lenA} without`, lenA === SHRINE_RULES.blessTicks && lenB === SHRINE_RULES.blessTicks * 2, { a: a.r, b: b.r });
  check('votive', `the offering heals the party 20% (${b.gain.map((g) => g.toFixed(2)).join(', ')})`, b.p.length === 1 && b.gain.every((g) => Math.abs(g - 0.2) < 0.01) && a.gain.every((g) => Math.abs(g) < 0.01));
}

// --------------------------------------------------------------- storm --
{
  const w = build(7);
  w.run().startCampaign({ level: 5, harness: true });
  for (let i = 0; i < 4000 && w.run().view().phase !== 'combat'; i++) w.step();
  steps(w, 30);
  w.cmd('killAllEnemies');
  w.cmd('setLayout', 29);
  w.cmd('killAllEnemies');
  w.cmd('relicGrant', 'stormglass');
  const v = w.registry.all().find((e) => e.kind === 'hazard' && e.htype === 'gust');
  const L = v && v.lane;
  const at = (k) => ({ x: L.x0 + (L.x1 - L.x0) * k, z: L.z0 + (L.z1 - L.z0) * k });
  const inA = boar(w, at(0.4).x, at(0.4).z, 500);
  const inB = boar(w, at(0.7).x, at(0.7).z, 500);
  const out = boar(w, at(0.5).x + 4, at(0.5).z + 4, 500);
  const pin = () => {
    for (const [e, k] of [[inA, 0.4], [inB, 0.7]]) place(e, at(k).x, at(k).z);
    place(out, at(0.5).x + 4, at(0.5).z + 4);
    for (const h of heroes(w)) place(h, at(0.5).x - 5, at(0.5).z - 5);
  };
  w.log.length = 0;
  w.cmd('hazardPhase', v.id, 'telegraph');
  let res = null;
  for (let i = 0; i < 200 && !res; i++) {
    pin();
    w.step();
    res = w.log.find((e) => e.type === 'hazard_resolve' && e.id === v.id && e.gust);
  }
  steps(w, 3, pin);
  const p = procs(w, 'stormglass')[0];
  const dmg = (e) => w.log.filter((h) => h.type === 'hit' && h.target === e.id && h.source === 'stormglass').reduce((s, h) => s + h.amount / (h.crit ? 1.5 : 1), 0);
  check('storm', `a gust strikes the two boars in its lane for 12% of max HP (${dmg(inA).toFixed(1)}, ${dmg(inB).toFixed(1)} of 500), not the one beside it (${dmg(out)})`, !!res && !!p && Math.abs(dmg(inA) - 60) < 0.5 && Math.abs(dmg(inB) - 60) < 0.5 && dmg(out) === 0);
}

// -------------------------------------------------------------- trophy --
{
  const w = build(SEED);
  w.run().startCampaign({ level: 1, harness: true });
  w.step();
  w.cmd('relicGrant', 'trophy_cord');
  w.cmd('championRoom', 4);
  w.cmd('skipToRoom', 4);
  for (let i = 0; i < 300 && !w.log.some((e) => e.type === 'champion_spawn'); i++) {
    for (const e of heroes(w)) e.hp = e.maxHp;
    w.step();
  }
  steps(w, 120, () => heroes(w).forEach((e) => (e.hp = e.maxHp)));
  const c = w.registry.byId(w.log.find((e) => e.type === 'champion_spawn').id);
  const b = boar(w, c.x + 3, c.z, 5000);
  const d0 = hitOn(w, b, 20, false, seat(w, 1).id);
  c.hp = 1;
  w.cmd('relicHit', c.id, seat(w, 1).id, 50, false);
  steps(w, 20);
  const p = procs(w, 'trophy_cord');
  const d1 = hitOn(w, b, 20, false, seat(w, 1).id);
  check('trophy', `a champion felled: +6% party damage (${d0.toFixed(2)} -> ${d1.toFixed(2)}, ${w.run().view().relics ? 'relics on' : ''})`, p.length >= 1 && Math.abs(d1 / d0 - 1.06) < 0.005, { p });
}

// --------------------------------------------------------------- brand --
{
  const plain = campaign(SEED);
  const pool0 = plain.cmd('relicPool', []);
  const boons = { vows: ['iron_hide', 'crowded'], vowRanks: { iron_hide: 3 } };
  const w = campaign(SEED, [], { boons });
  const pool1 = w.cmd('relicPool', []);
  check('brand', 'offered only while the run wears a vow', !pool0.includes('oathkeepers_brand') && pool1.includes('oathkeepers_brand'));
  const b = boar(w, seat(w, 0).x + 3, seat(w, 0).z, 5000);
  const d0 = hitOn(w, b, 20, false, seat(w, 1).id);
  w.cmd('relicGrant', 'oathkeepers_brand');
  const d1 = hitOn(w, b, 20, false, seat(w, 1).id);
  check('brand', `Vow level 4 (III + I): +16% party damage (${d0.toFixed(2)} -> ${d1.toFixed(2)})`, Math.abs(d1 / d0 - 1.16) < 0.005);
}

// --------------------------------------------------------------- tenor --
{
  const w = campaign(SEED, ['tenor_bell']);
  const p = seat(w, 0);
  const ring = [];
  for (let i = 0; i < 12; i++) ring.push(boar(w, p.x + 4 + (i % 4) * 0.8, p.z - 3 - Math.floor(i / 4) * 0.8, 300));
  const kill = (e) => {
    e.hp = 1;
    w.cmd('relicHit', e.id, seat(w, 1).id, 50, false);
    steps(w, 16);
  };
  w.log.length = 0;
  for (let i = 0; i < 9; i++) kill(ring[i]);
  check('tenor', 'nine kills: the bell waits', procs(w, 'tenor_bell').length === 0);
  const hp0 = ring.slice(10).map((e) => e.hp);
  kill(ring[9]);
  const pr = procs(w, 'tenor_bell')[0];
  const slowed = ring.slice(10).every((e) => w.registry.byId(e.id) && (e.statuses ?? []).some?.((s) => s.kind === 'slow'));
  const hurt = ring.slice(10).map((e) => w.log.filter((h) => h.type === 'hit' && h.target === e.id && h.source === 'tenor_bell').reduce((s, h) => s + h.amount / (h.crit ? 1.5 : 1), 0));
  void hp0;
  check('tenor', `the 10th kill rings it: every enemy left takes 12 (${hurt.map((h) => h.toFixed(1)).join(', ')}) and is slowed`, !!pr && pr.hit.length >= 2 && hurt.every((h) => Math.abs(h - 12) < 0.01) && (slowed || w.log.some((e) => e.type === 'status_apply' && e.status === 'slow')));
  // With the Bellwright: a kill inside one of her bell rings counts twice.
  const t = build(SEED + 1);
  t.run().startCampaign({ level: 1, harness: true, lineup: ['healer', 'tank', 'swordsman', 'bellwright'] });
  for (let i = 0; i < 4000 && t.run().view().phase !== 'combat'; i++) t.step();
  t.cmd('partyMode', 'manual');
  for (let i = 0; i < 3000 && t.run().view().phase === 'combat'; i++) {
    t.cmd('killAllEnemies');
    t.step();
  }
  ['hang_bell', 'peal', 'clapper', 'hum'].forEach((id, k) => t.cmd('partySwap', 3, id, k));
  t.cmd('skipToRoom', 2);
  for (let i = 0; i < 600 && !(t.run().view().phase === 'combat' && t.run().view().room === 2); i++) t.step();
  t.cmd('partyMode', 'auto');
  t.cmd('relicGrant', 'tenor_bell');
  const tolly = seat(t, 3);
  let bell = null;
  for (let i = 0; i < 1800 && !bell; i++) {
    if (i % 90 === 0) boar(t, tolly.x + 2, tolly.z - 1.5, 3000);
    for (const e of heroes(t)) e.hp = e.maxHp;
    t.step();
    bell = t.registry.all().find((e) => e.kind === 'azone' && e.bell && e.sourceId === tolly.id);
  }
  t.cmd('killAllEnemies');
  steps(t, 20);
  t.cmd('relicRoomEnter', 'kill_all'); // a fresh count for the room
  t.log.length = 0;
  const victims = [];
  if (bell) for (let i = 0; i < 5; i++) victims.push(boar(t, bell.x + 0.1 * i, bell.z, 50));
  const pin = () => victims.forEach((e, i) => e && t.registry.byId(e.id) && place(e, bell.x + 0.1 * i, bell.z));
  let after4 = -1;
  victims.forEach((e, i) => {
    pin();
    e.hp = 1;
    t.cmd('relicHit', e.id, seat(t, 1).id, 50, false);
    steps(t, 16, pin);
    if (i === 3) after4 = procs(t, 'tenor_bell').length;
  });
  check('tenor', `kills inside a Bellwright bell's ring count twice: four wait, the fifth rings it (${bell ? 'bell hung' : 'no bell'}, ${after4} after four)`, !!bell && after4 === 0 && procs(t, 'tenor_bell').length === 1);
}

// -------------------------------------------------------------- curses --
{
  // Corked: no slot works in the room, the AI seats leave theirs alone.
  const w = campaign(SEED);
  w.cmd('relicCurseHere', 'corked');
  w.cmd('tonicGive', 0, 'mend_tonic');
  w.cmd('tonicGive', 2, 'mend_tonic');
  seat(w, 2).hp = seat(w, 2).maxHp * 0.2;
  const r = w.cmd('tonicUse', 0);
  steps(w, 60, () => (seat(w, 2).hp = seat(w, 2).maxHp * 0.2));
  const st = w.cmd('tonicState');
  check('curses', 'Corked: a press is refused, the AI seat keeps its tonic too, the HUD reads it', r && r.denied === 'corked' && st.slots[0] === 'mend_tonic' && st.slots[2] === 'mend_tonic' && st.corked === true);
  w.cmd('clearRoom');
  steps(w, 5);
  check('curses', 'Corked lifts with the room', !w.cmd('tonicState').corked);
  // Corked's +10% HP on a door.
  const plan = (curse) => {
    const v = build(SEED);
    v.run().startCampaign({ level: 1, harness: true });
    v.step();
    v.cmd('relicDoor', curse, 0);
    v.cmd('clearRoom');
    for (let i = 0; i < 900 && v.run().view().phase !== 'path'; i++) {
      const ph = v.run().view().phase;
      if (ph === 'combat') v.cmd('killAllEnemies');
      else if (ph === 'reward') v.run().declineReward();
      else if (ph === 'relic') v.run().chooseRelic(0);
      v.step();
    }
    v.run().choosePath(0);
    for (let i = 0; i < 300 && v.run().view().phase !== 'combat'; i++) v.step();
    return v.run().roomPlan();
  };
  const a = plan('short_fuse');
  const b = plan('corked');
  check('curses', `Corked: enemies have 10% more HP (${a.hpMul} -> ${b.hpMul})`, Math.abs(b.hpMul - Math.round(a.hpMul * 1.1 * 100) / 100) < 0.011);
  // Tolling Dead: the knell strikes the heroes standing by it.
  const k = campaign(SEED);
  k.cmd('relicCurseHere', 'tolling_dead');
  const tank = seat(k, 1);
  const far = seat(k, 3);
  place(far, tank.x + 6, tank.z + 6);
  const e = boar(k, tank.x + 0.8, tank.z, 50);
  k.log.length = 0;
  e.hp = 1;
  k.cmd('relicHit', e.id, seat(k, 2).id, 50, false);
  const hp0 = tank.hp;
  const f0 = far.hp;
  let strike = null;
  for (let i = 0; i < 90 && !strike; i++) {
    place(tank, e.x - 0.8, e.z);
    place(far, tank.x + 6, tank.z + 6);
    k.step();
    strike = k.log.find((x) => x.type === 'curse_proc' && x.curse === 'tolling_dead' && x.stage === 'strike');
  }
  const toll = k.log.find((x) => x.type === 'curse_proc' && x.curse === 'tolling_dead' && x.stage === 'toll');
  const tk = k.log.filter((x) => x.type === 'hit' && x.source === 'tolling_dead');
  check('curses', `Tolling Dead: the knell tolls, then strikes ${strike && toll ? strike.tick - toll.tick : '-'} ticks later the Tank by it (-${(hp0 - tank.hp).toFixed(1)} of ${tank.maxHp}), not the far one`, !!toll && !!strike && strike.tick - toll.tick === 48 && strike.struck.includes(tank.id) && !strike.struck.includes(far.id) && Math.abs(far.hp - f0) < 0.01 && tk.some((h) => h.target === tank.id && Math.abs(h.amount - tank.maxHp * 0.1) < 0.01));
  // Dulled Edge: crits x1.25; Saint's Ashes makes it x1.375.
  const crit = (relics, majors) => {
    const v = campaign(SEED, relics);
    for (const m of majors) v.cmd('eventMajor', m);
    const t2 = boar(v, seat(v, 0).x + 3, seat(v, 0).z, 9000);
    const plain = hitOn(v, t2, 20, false, seat(v, 1).id);
    const c = hitOn(v, t2, 20, true, seat(v, 1).id);
    return c / plain;
  };
  const c0 = crit([], []);
  const c1 = crit([], ['dulled_edge']);
  const c2 = crit(['saints_ashes'], ['dulled_edge']);
  // Its beat: a party crit under the curse emits one cosmetic curse_proc,
  // at most once every 20 ticks; a plain hit and an uncursed crit emit none.
  const beat = (majors) => {
    const v = campaign(SEED, []);
    for (const m of majors) v.cmd('eventMajor', m);
    const t2 = boar(v, seat(v, 0).x + 3, seat(v, 0).z, 9000);
    const n = (crit) => {
      v.log.length = 0;
      v.cmd('relicHit', t2.id, seat(v, 1).id, 20, crit);
      return v.log.filter((x) => x.type === 'curse_proc' && x.curse === 'dulled_edge' && x.stage === 'blunt').length;
    };
    const plain = n(false);
    const first = n(true);
    const again = n(true);
    // A crit's hitstop holds the clock, so step until 21 ticks have passed.
    const t0 = v.clock.tick;
    for (let i = 0; i < 400 && v.clock.tick < t0 + 21; i++) v.step();
    const later = n(true);
    return [plain, first, again, later];
  };
  const b1 = beat(['dulled_edge']);
  const b0 = beat([]);
  check('curses', `Dulled Edge beat: plain/crit/again/after 21+ ticks ${b1.join('/')}; uncursed crit ${b0[1]}`, b1.join() === '0,1,0,1' && b0[1] === 0);
  check('curses', `Dulled Edge: crits x${c0.toFixed(3)} -> x${c1.toFixed(3)}; with Saint's Ashes x${c2.toFixed(3)}`, Math.abs(c0 - 1.5) < 0.01 && Math.abs(c1 - 1.25) < 0.01 && Math.abs(c2 - 1.375) < 0.01);
}

// -------------------------------------------------------------- legacy --
{
  const w = build(SEED);
  w.run().startRun({ act: 1 });
  w.step();
  const granted = NEW.map((id) => w.cmd('relicGrant', id));
  check('legacy', 'the single-level run takes none of them', granted.every((g) => g === null) && !w.run().view().relics);
}

// ---------------------------------------------------------------- save --
{
  const a = build(SEED);
  const ok = flaskSave && a.io.apply(clonePlain(flaskSave));
  a.log.length = 0;
  steps(a, 320);
  const st = a.cmd('tonicState');
  check('save', 'a refill still pouring rides the save and lands after a load', !!ok && st && st.slots[0] === 'ward_flask' && procs(a, 'bottomless_flask', 'refill').length === 1, { ok: !!ok, st });
}

void CONSUMABLES;
console.log(`\nrelics5-probe: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
