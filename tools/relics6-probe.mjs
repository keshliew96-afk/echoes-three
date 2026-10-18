#!/usr/bin/env node
// RELICS batch 6 probe (docs/RELICS.md "Batch 6"), headless:
//
//   node tools/relics6-probe.mjs [--seed 4]
//
//   data     eight new relics (63 in all; 3 common, 3 rare, 2 legendary), an
//            heirloom each, two room curses and one major one, every new line
//            in the nine other languages
//   lantern  Delver's Lantern: a wall standing is marked; the player's basic
//            blow breaks it open; an AI seat's blow still only knocks
//   coal     Kiln Coal: a bomb sets what it bursts on alight, 3% of max HP
//            every half second for 4 s (eight licks)
//   soles    Pumice Soles: a floor patch never slows the party
//   wing     Wing Bone: the player's dodge ends in a dive, 10 damage round
//            the landing
//   crown    Crown Shard: a felled elite pays 5 Glint for every power it carried
//   lens     Dusk Lens: a party crit blinds 1 s, once per enemy every 3 s
//   veil     Nightfall Veil: the first blow on each enemy crits, and the crit
//            roll is still drawn (the run stream moves the same)
//   heart    Rekindled Heart: a hero who would fall rises at 40% in a burst
//            of flame (15 damage, alight), once a level for each seat
//   curses   Sealed Door (the level's wall stays shut to bombs and heavy
//            blows, +20% enemy HP on a door), Dimmed Lantern (-40% on an
//            enemy out of every hero's light), Heavy Crowns (one more power,
//            three at most; Saint's Ashes every other room)
//   legacy   the single-level run carries none of it
//   save     a burn and a sealed level ride a save
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
const { RELICS, RELIC_IDS, CURSES, CURSE_IDS, MAJOR_CURSE_IDS } = await import(u('src/sim/relics.js'));
const { UNLOCKS } = await import(u('src/data/unlocks.js'));

const argv = process.argv.slice(2);
const SEED = Number(argv.includes('--seed') ? argv[argv.indexOf('--seed') + 1] : 4);
const NEW = ['delvers_lantern', 'kiln_coal', 'pumice_soles', 'wing_bone', 'crown_shard', 'dusk_lens', 'nightfall_veil', 'rekindled_heart'];
const NEW_CURSES = ['sealed_door', 'dimmed_lantern', 'heavy_crowns'];
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
  return { registry, bus, clock, world, io, step, log, run, cmd, rng };
}
const heroes = (w) => w.registry.all().filter((e) => e.partyIndex !== undefined);
const seat = (w, i) => heroes(w).find((e) => e.partyIndex === i);
const procs = (w, id, stage = null) => w.log.filter((e) => e.type === 'relic_proc' && e.relic === id && (!stage || e.stage === stage));
const curseProcs = (w, id, stage = null) => w.log.filter((e) => e.type === 'curse_proc' && e.curse === id && (!stage || e.stage === stage));
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
const fullHp = (w) => heroes(w).forEach((e) => (e.hp = e.maxHp));
// A campaign's room 1, its first wave cleared, the party full and still.
function campaign(seed, relics = [], opts = {}) {
  const w = build(seed);
  w.run().startCampaign({ level: 1, harness: true, ...opts });
  for (let i = 0; i < 4000 && w.run().view().phase !== 'combat'; i++) w.step();
  steps(w, 30);
  w.cmd('killAllEnemies');
  steps(w, 12);
  for (const id of relics) w.cmd('relicGrant', id);
  fullHp(w);
  w.log.length = 0;
  return w;
}
function boar(w, x, z, hp = 400, opts = null) {
  const e = w.registry.byId(idOf(w.cmd('spawn', 'boar', x, z, opts)));
  if (e) {
    e.maxHp = hp;
    e.hp = hp;
    if (!opts || !opts.elite) e.elite = false;
    e.knockbackable = false;
  }
  return e;
}
// Plain damage of one party hit (a crit divided back out).
const hitOn = (w, target, power, crit = false, by = null) => {
  w.log.length = 0;
  w.cmd('relicHit', target.id, by, power, crit);
  const h = w.log.find((e) => e.type === 'hit' && e.target === target.id);
  return h ? h.amount / (h.crit ? 1.5 : 1) : NaN;
};
const plainOf = (w, src, id = null) => w.log.filter((e) => e.type === 'hit' && e.source === src && (id === null || e.target === id)).map((e) => e.amount / (e.crit ? 1.5 : 1));

// ---------------------------------------------------------------- data --
{
  const rar = NEW.map((id) => RELICS[id] && RELICS[id].rarity);
  const n = (r) => rar.filter((x) => x === r).length;
  check('data', `63 relics, the eight new ones present (${RELIC_IDS.length})`, RELIC_IDS.length === 63 && NEW.every((id) => RELICS[id]));
  check('data', `rarities 3 common, 3 rare, 2 legendary (${n('common')}/${n('rare')}/${n('legendary')})`, n('common') === 3 && n('rare') === 3 && n('legendary') === 2);
  check('data', 'none of them a class or vow relic; an heirloom for each', NEW.every((id) => !RELICS[id].cls && !RELICS[id].vow && UNLOCKS[`heirloom_${id}`] && UNLOCKS[`heirloom_${id}`].relic === id));
  check('data', `12 room curses and 8 major (${CURSE_IDS.length}/${MAJOR_CURSE_IDS.length})`, CURSE_IDS.length === 12 && MAJOR_CURSE_IDS.length === 8 && CURSE_IDS.includes('sealed_door') && CURSE_IDS.includes('dimmed_lantern') && MAJOR_CURSE_IDS.includes('heavy_crowns'));
  const keys = [];
  for (const id of NEW) keys.push(RELICS[id].name, RELICS[id].text, UNLOCKS[`heirloom_${id}`].text);
  for (const id of NEW_CURSES) keys.push(CURSES[id].name, CURSES[id].text);
  const miss = {};
  for (const l of LANGS) {
    const tab = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
    const m = keys.filter((k) => typeof tab[k] !== 'string' || !tab[k].trim());
    if (m.length) miss[l] = m;
  }
  check('data', `all ${keys.length} new lines in the nine other languages`, Object.keys(miss).length === 0, miss);
}

// ------------------------------------------------------------- lantern --
{
  const wallIn = (relics) => {
    const w = campaign(SEED, relics);
    const v = w.run().cmd('secretWall', []);
    steps(w, 2);
    return { w, v, wall: w.registry.all().find((e) => e.kind === 'secret_wall') };
  };
  const a = wallIn(['delvers_lantern']);
  const m = procs(a.w, 'delvers_lantern', 'mark')[0];
  check('lantern', 'a wall standing is marked the moment it stands', !!a.wall && !!m && m.wall === a.wall.id);
  a.w.cmd('relicHit', a.wall.id, seat(a.w, 1).id, 8, false);
  steps(a.w, 2);
  const aiOpen = a.w.log.some((e) => e.type === 'secret_open');
  a.w.cmd('relicHit', a.wall.id, seat(a.w, 0).id, 8, false);
  steps(a.w, 2);
  const op = a.w.log.find((e) => e.type === 'secret_open');
  check('lantern', "an AI seat's blow only knocks; the player's light blow breaks it open", !aiOpen && !!op && op.how === 'hit' && op.seat === 0 && !a.wall.shut);
  const b = wallIn([]);
  b.w.cmd('relicHit', b.wall.id, seat(b.w, 0).id, 8, false);
  steps(b.w, 2);
  check('lantern', 'without it, the same blow only knocks and nothing is marked', !b.w.log.some((e) => e.type === 'secret_open') && b.wall.shut && procs(b.w, 'delvers_lantern').length === 0);
}

// ---------------------------------------------------------------- coal --
let coalSave = null;
{
  const burn = (relics, save = false) => {
    const w = campaign(SEED, relics);
    const p = seat(w, 0);
    const b = boar(w, p.x, p.z - 3, 1000);
    const pin = () => place(b, p.x, p.z - 3);
    w.cmd('tonicGive', 0, 'frost_bomb');
    w.log.length = 0;
    w.cmd('tonicUse', 0, b.x, b.z);
    let n = 0;
    for (let i = 0; i < 360; i++) {
      pin();
      fullHp(w);
      w.step();
      if (save && !coalSave && procs(w, 'kiln_coal', 'burn').length === 3) coalSave = { cap: clonePlain(w.io.capture()), id: b.id };
      n = i;
    }
    void n;
    return { w, b };
  };
  const a = burn(['kiln_coal'], true);
  const al = procs(a.w, 'kiln_coal', 'alight');
  const licks = plainOf(a.w, 'kiln_coal', a.b.id);
  const ticks = procs(a.w, 'kiln_coal', 'burn').map((e) => e.tick);
  const gaps = ticks.slice(1).map((t, i) => t - ticks[i]);
  check('coal', `a bomb sets the boar alight: eight licks of 3% (${licks.map((x) => x.toFixed(1)).join(', ')}), half a second apart`, al.length === 1 && licks.length === 8 && licks.every((x) => Math.abs(x - 30) < 0.01) && gaps.every((g) => g === 30));
  const b = burn([]);
  check('coal', 'without it, nothing burns', procs(b.w, 'kiln_coal').length === 0 && plainOf(b.w, 'kiln_coal').length === 0);
}

// --------------------------------------------------------------- soles --
{
  const stand = (relics) => {
    const w = campaign(SEED, relics);
    const h = seat(w, 2);
    const s = w.registry.spawn({ kind: 'slick', faction: 'neutral', x: h.x, z: h.z, px: h.x, pz: h.z, radius: 1.5, slow: 0.3, startTick: w.clock.tick, untilTick: w.clock.tick + 600, ownerId: null, variant: 'quartz' });
    w.log.length = 0;
    let slowed = false;
    for (let i = 0; i < 90; i++) {
      place(h, s.x, s.z);
      w.step();
      if (h.status && h.status.slow && h.status.slow.untilTick > w.clock.tick) slowed = true;
    }
    return { w, slowed };
  };
  const a = stand([]);
  const b = stand(['pumice_soles']);
  const pr = procs(b.w, 'pumice_soles');
  check('soles', `a crystal bed slows a hero without them, never with them (beat ${pr.length}x in 1.5 s, at most twice a second)`, a.slowed && !b.slowed && pr.length >= 1 && pr.length <= 4);
}

// ---------------------------------------------------------------- wing --
{
  const dive = (relics) => {
    const w = campaign(SEED, relics);
    const p = seat(w, 0);
    const near = [];
    const pin = () => near.forEach((e, k) => w.registry.byId(e.id) && place(e, p.x + (k ? 0.6 : -0.6), p.z + 0.4));
    near.push(boar(w, p.x - 0.6, p.z, 500), boar(w, p.x + 0.6, p.z, 500));
    const far = boar(w, p.x + 6, p.z + 6, 500);
    w.log.length = 0;
    const snap = emptySnapshot();
    snap.presses = [{ kind: 'dodge' }];
    snap.move = { x: 1, z: 0 };
    pin();
    w.step(snap);
    for (let i = 0; i < 40 && !w.log.some((e) => e.type === 'dash_end'); i++) {
      pin();
      w.step();
    }
    steps(w, 2, pin);
    return { w, near, far };
  };
  const a = dive(['wing_bone']);
  const pr = procs(a.w, 'wing_bone')[0];
  const dmg = a.near.map((e) => plainOf(a.w, 'wing_bone', e.id).reduce((s, x) => s + x, 0));
  check('wing', `the dodge ends in a dive: 10 to each boar by the landing (${dmg.map((d) => d.toFixed(1)).join(', ')}), none to the far one`, !!pr && dmg.every((d) => Math.abs(d - 10) < 0.01) && plainOf(a.w, 'wing_bone', a.far.id).length === 0);
  const b = dive([]);
  check('wing', 'without it, a dodge strikes nothing', procs(b.w, 'wing_bone').length === 0 && plainOf(b.w, 'wing_bone').length === 0);
}

// --------------------------------------------------------------- crown --
{
  const fell = (relics, affixes) => {
    const w = campaign(SEED, relics);
    const p = seat(w, 0);
    const el = boar(w, p.x + 3, p.z, 50, { elite: true, affixes });
    const n = (el.affixes ?? []).length;
    w.log.length = 0;
    el.hp = 1;
    w.cmd('relicHit', el.id, seat(w, 1).id, 50, false);
    steps(w, 10);
    const g = w.log.filter((e) => e.type === 'glint_gain' && e.reason === 'relic_crown_shard');
    return { w, n, g };
  };
  const two = fell(['crown_shard'], ['gusting', 'cinder']);
  const pr = procs(two.w, 'crown_shard')[0];
  const three = fell(['crown_shard'], ['gusting', 'cinder', 'molten']);
  const none = fell([], ['gusting', 'cinder']);
  check('crown', `a felled ${two.n}-power elite pays ${two.g.map((e) => e.amount).join('+') || 0} Glint, a ${three.n}-power one ${three.g.map((e) => e.amount).join('+') || 0}; none without the shard`, two.n === 2 && two.g.length === 1 && two.g[0].amount === 10 && !!pr && pr.powers === 2 && pr.glint === 10 && three.n === 3 && three.g.length === 1 && three.g[0].amount === 15 && none.g.length === 0);
  const w = campaign(SEED, ['crown_shard']);
  const el = boar(w, seat(w, 0).x + 3, seat(w, 0).z, 9000, { elite: true, affixes: ['gusting', 'cinder'] });
  const d = hitOn(w, el, 20, false, seat(w, 1).id);
  check('crown', `it adds no damage: a two-power elite still takes the base ${d.toFixed(2)}`, Math.abs(d - 20) < 0.01 && procs(w, 'crown_shard').length === 0);
}

// ---------------------------------------------------------------- lens --
{
  const w = campaign(SEED, ['dusk_lens']);
  const p = seat(w, 0);
  const b = boar(w, p.x + 3, p.z, 9000);
  w.cmd('relicHit', b.id, seat(w, 1).id, 10, false);
  steps(w, 2);
  const plainBlind = !!(b.status && b.status.blind && b.status.blind.untilTick > w.clock.tick);
  w.cmd('relicHit', b.id, seat(w, 1).id, 10, true);
  steps(w, 2);
  const bl = b.status && b.status.blind;
  const left = bl ? bl.untilTick - w.clock.tick : 0;
  const n1 = procs(w, 'dusk_lens').length;
  w.cmd('relicHit', b.id, seat(w, 1).id, 10, true);
  steps(w, 2);
  const n2 = procs(w, 'dusk_lens').length;
  const t0 = w.clock.tick;
  for (let i = 0; i < 600 && w.clock.tick < t0 + 180; i++) w.step();
  w.cmd('relicHit', b.id, seat(w, 1).id, 10, true);
  steps(w, 2);
  const n3 = procs(w, 'dusk_lens').length;
  check('lens', `a plain hit blinds nothing; a crit blinds for 1 s (${left} ticks left); again within 3 s does nothing; after 3 s it blinds again (${n1}/${n2}/${n3})`, !plainBlind && left > 50 && left <= 60 && n1 === 1 && n2 === 1 && n3 === 2);
}

// ---------------------------------------------------------------- veil --
{
  const firsts = (relics) => {
    const w = campaign(SEED, relics);
    const p = seat(w, 0);
    const out = [];
    for (let k = 0; k < 6; k++) {
      const b = boar(w, p.x + 3, p.z - 2 + k * 0.6, 9000);
      w.log.length = 0;
      w.cmd('relicHit', b.id, seat(w, 1).id, 10, false);
      const h1 = w.log.find((e) => e.type === 'hit' && e.target === b.id);
      w.log.length = 0;
      w.cmd('relicHit', b.id, seat(w, 1).id, 10, false);
      const h2 = w.log.find((e) => e.type === 'hit' && e.target === b.id);
      out.push([!!(h1 && h1.crit), !!(h2 && h2.crit)]);
    }
    return { w, out, rng: JSON.stringify(w.io.capture().rng) };
  };
  const a = firsts(['nightfall_veil']);
  const b = firsts([]);
  const firstCrits = a.out.filter((x) => x[0]).length;
  const secondCrits = a.out.filter((x) => x[1]).length;
  check('veil', `the first blow on each of six boars crits (${firstCrits}/6), the second rolls as usual (${secondCrits}/6)`, firstCrits === 6 && secondCrits < 6 && procs(a.w, 'nightfall_veil').length >= 0);
  check('veil', 'the crit roll is still drawn: the run stream stands where it would without it', a.rng === b.rng);
}

// --------------------------------------------------------------- heart --
{
  const w = campaign(SEED, ['rekindled_heart']);
  const h = seat(w, 2);
  const near = boar(w, h.x + 1.0, h.z, 5000);
  const far = boar(w, h.x + 6, h.z + 6, 5000);
  const pin = () => {
    place(near, h.x + 1.0, h.z);
    place(far, h.x + 6, h.z + 6);
  };
  h.hp = 2;
  w.log.length = 0;
  w.cmd('relicHit', h.id, near.id, 50, false);
  steps(w, 2, pin);
  const pr = procs(w, 'rekindled_heart')[0];
  const rose = h.hp / h.maxHp;
  const burnt = procs(w, 'kiln_coal', 'alight').map((e) => e.target);
  const nd = plainOf(w, 'rekindled_heart', near.id).reduce((s, x) => s + x, 0);
  check('heart', `the hero rises at ${(rose * 100).toFixed(0)}% (about 40%), the boar by it takes 15 (${nd.toFixed(1)}) and burns, the far one is untouched`, !!pr && rose > 0.39 && rose < 0.43 && Math.abs(nd - 15) < 0.01 && burnt.includes(near.id) && !burnt.includes(far.id) && plainOf(w, 'rekindled_heart', far.id).length === 0);
  h.hp = 2;
  w.cmd('relicHit', h.id, near.id, 50, false);
  steps(w, 2, pin);
  check('heart', 'once a level: the second fall goes down', !(h.hp > 0) && procs(w, 'rekindled_heart').length === 1);
}

// -------------------------------------------------------------- curses --
let sealSave = null;
{
  // Sealed Door: the level's wall stays shut to a bomb and to a heavy blow.
  const w = campaign(SEED);
  w.cmd('relicCurseHere', 'sealed_door');
  const seal = curseProcs(w, 'sealed_door', 'seal').length;
  w.run().cmd('secretWall', []);
  steps(w, 2);
  const wall = w.registry.all().find((e) => e.kind === 'secret_wall');
  w.cmd('tonicGive', 0, 'fire_bomb');
  w.cmd('tonicUse', 0, wall.x + Math.sin(wall.yaw) * 0.5, wall.z + Math.cos(wall.yaw) * 0.5);
  steps(w, 60, () => fullHp(w));
  w.bus.emit(w.clock.tick, 'wall_blow', { id: wall.id, attacker: seat(w, 0).id, base: 30, delivery: 'skill', shape: 'projectile', source: 'probe' });
  steps(w, 20, () => fullHp(w));
  const refused = curseProcs(w, 'sealed_door', 'refuse').length;
  check('curses', `Sealed Door: the seal is set (${seal}), a bomb and a heavy blow leave the wall shut (refused ${refused}x), the view says sealed`, seal === 1 && !!wall && wall.shut && !w.log.some((e) => e.type === 'secret_open') && refused >= 1 && w.run().view().relics.sealed === true);
  sealSave = clonePlain(w.io.capture());
  // ... and the probe's own open still works (the lab), and a door's +20% HP.
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
  const pa = plan('short_fuse');
  const pb = plan('sealed_door');
  check('curses', `Sealed Door on a door: enemies have 20% more HP (${pa.hpMul} -> ${pb.hpMul})`, Math.abs(pb.hpMul - Math.round(pa.hpMul * 1.2 * 100) / 100) < 0.011);
  // Dimmed Lantern: an enemy out of every hero's light takes 40% less.
  const d = campaign(SEED);
  const p = seat(d, 0);
  const huddle = () => heroes(d).forEach((e, k) => place(e, p.x + (k % 2) * 0.4, p.z + Math.floor(k / 2) * 0.4));
  huddle();
  const nearB = boar(d, p.x + 3, p.z, 9000);
  const farB = boar(d, p.x + 8, p.z, 9000);
  const n0 = hitOn(d, nearB, 20, false, seat(d, 1).id);
  const f0 = hitOn(d, farB, 20, false, seat(d, 1).id);
  d.cmd('relicCurseHere', 'dimmed_lantern');
  huddle();
  const n1 = hitOn(d, nearB, 20, false, seat(d, 1).id);
  const f1 = hitOn(d, farB, 20, false, seat(d, 1).id);
  check('curses', `Dimmed Lantern: near ${n0.toFixed(1)} -> ${n1.toFixed(1)}, out of the light ${f0.toFixed(1)} -> ${f1.toFixed(1)}; the view carries the light's reach`, Math.abs(n1 - n0) < 0.01 && Math.abs(f1 / f0 - 0.6) < 0.005 && d.run().view().relics.dim === 4.5);
  // Heavy Crowns: one more power (Level I: 1 -> 2), three at most; Saint's
  // Ashes makes it every other room by the room's hash.
  const c = campaign(SEED);
  const r0 = c.cmd('affixRule');
  c.cmd('eventMajor', 'heavy_crowns');
  const r1 = c.cmd('affixRule');
  const el = c.registry.byId(idOf(c.cmd('spawn', 'boar', seat(c, 0).x + 3, seat(c, 0).z, { elite: true })));
  check('curses', `Heavy Crowns: Level I elites carry ${r0 && r0.count} power, ${r1 && r1.count} under the crowns (a fresh elite has ${el && el.affixes ? el.affixes.length : 0})`, r0 && r1 && r0.count === 1 && r1.count === 2 && el && el.affixes && el.affixes.length === 2);
  const deep = build(SEED);
  deep.run().startCampaign({ level: 4, harness: true });
  for (let i = 0; i < 4000 && deep.run().view().phase !== 'combat'; i++) deep.step();
  deep.cmd('eventMajor', 'heavy_crowns');
  const r4 = deep.cmd('affixRule');
  check('curses', `Heavy Crowns on Level IV: two powers become three, never more (${r4 && r4.count})`, r4 && r4.count === 3);
  let some = 0;
  let none = 0;
  for (let s = 1; s <= 12; s++) {
    const v = campaign(s, ['saints_ashes']);
    v.cmd('eventMajor', 'heavy_crowns');
    const r = v.cmd('affixRule');
    if (r && r.count === 2) some += 1;
    else if (r && r.count === 1) none += 1;
  }
  check('curses', `with Saint's Ashes the extra power comes in about every other room (${some} of 12 rooms crowned, ${none} not)`, some > 0 && none > 0 && some + none === 12);
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
  const ok = coalSave && a.io.apply(clonePlain(coalSave.cap));
  a.log.length = 0;
  const b = a.registry.byId(coalSave ? coalSave.id : -1);
  for (let i = 0; i < 200; i++) {
    fullHp(a);
    a.step();
  }
  const rest = procs(a, 'kiln_coal', 'burn').length;
  check('save', `a burn rides a save: the five licks left land after a load (${rest})`, !!ok && !!b && rest === 5);
  const s = build(SEED);
  const ok2 = sealSave && s.io.apply(clonePlain(sealSave));
  steps(s, 2);
  check('save', 'a sealed level rides a save', !!ok2 && s.run().view().relics.sealed === true);
}

console.log(`\nrelics6-probe: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
