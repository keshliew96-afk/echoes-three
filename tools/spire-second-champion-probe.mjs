#!/usr/bin/env node
// SPIRE SECOND CHAMPION probe (content plan 5 slice 2, docs/CHAMPIONS.md
// "The Bell Abbess"), headless sim, no browser:
//   pick     the Still Spire has two champions, the Gale Herald first and the
//            Bell Abbess second; the crown door leads to one by a hash of the
//            level's seed and index (both turn up over seeds); the other
//            lands' pairs are unchanged; the room spawns the level's pick and
//            a Level V crown door names the Abbess when the seed picks her;
//            cmd championPick forces her
//   abbess   Rope Swing: she stands through the first half of the warning,
//            rides the rope (a flier) in the second, drops at the lane's end
//            and knocks a hero in the lane ~1.6 u aside; Vesper Peal slows
//            the heroes in its cone 55 %
//   common   she spawns with the room's champion HP and rages below half; a
//            mid-swing capture continues bit-identically in a fresh world
//   deeds    the Journal lists ten champions with her in the Spire; Five
//            Crowns counts either Spire champion, Windfall only the Gale
//            Herald (his pick); marks record her
//   text     her name, lore, moves and the reworded Five Crowns line in all
//            nine other languages; its old line is gone
//   data     her cues and VFX rows are registered
//
//   node tools/spire-second-champion-probe.mjs [--seed 4] [--out captures/spire-second-champion-probe.json]
// Exit code 1 on any failure.
import { readFileSync } from 'node:fs';
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
const { BESTIARY } = await import(u('src/data/journal.js'));
const { DEEDS, MARK_KINDS } = await import(u('src/data/unlocks.js'));
const C = await import(u('src/sim/champions.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEED = Number(opt('seed', '4'));
const OUT = opt('out', 'captures/spire-second-champion-probe.json');

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
    if (e.type !== 'sound') log.push(e);
    if (log.length > 60000) log.splice(0, 20000);
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
  return { registry, bus, clock, world, ap, io, step, continuation, log, run: () => world.runSystem() };
}
const holdParty = (w) => {
  for (const e of w.registry.all()) if (e.partyIndex !== undefined && e.hp > 0) e.hp = e.maxHp;
};
const party = (w) => w.registry.all().filter((e) => e.partyIndex !== undefined);
const player = (w) => w.registry.all().find((e) => e.partyIndex === 0);
const seen = (w, type, pred = () => true) => w.log.filter((e) => e.type === type && pred(e));
function stage(seed, level, n = 3) {
  const w = build(seed);
  w.run().startCampaign({ level, harness: true });
  w.world.cmd('skipToRoom', n);
  for (let i = 0; i < 30; i++) w.step();
  w.world.cmd('killAllEnemies');
  for (let i = 0; i < 4; i++) w.step();
  holdParty(w);
  return w;
}
function spawnAt(w, kind, x, z, hp = 600) {
  const r = w.world.cmd('spawn', kind, x, z);
  const id = typeof r === 'object' && r ? r.id : r;
  const e = w.registry.byId(id);
  if (e) {
    e.maxHp = hp;
    e.hp = hp;
    e.elite = false;
    delete e.affixes;
  }
  return id;
}
// Everything hostile but `keep` melts (a staged fight stays one-on-one).
function thin(w, keep, soft = false) {
  for (const x of w.registry.all()) if (x.faction === 'hostile' && !keep.includes(x.id) && x.hp > 0 && x.kind !== 'eshot' && x.state === 'active') {
      if (soft) x.hp = 0.001;
      else w.world.cmd('setHp', x.id, 0);
    }
}

// A champion room of `level` holding `kind`, the rest of its waves melted.
function champRoom(seed, level, kind) {
  const w = build(seed);
  w.run().startCampaign({ level, harness: true });
  w.run().cmd('championPick', [kind]);
  w.run().cmd('championRoom', [4]);
  w.world.cmd('skipToRoom', 4);
  w.ap.configure(false);
  for (let i = 0; i < 240 && !seen(w, 'champion_spawn').length; i++) w.step();
  const sp = seen(w, 'champion_spawn')[0];
  const e = sp ? w.registry.byId(sp.id) : null;
  check('common', `${kind}: spawns in the Level ${['', 'I', 'II', 'III', 'IV', 'V'][level]} crown room with the room's champion HP`, !!e && e.kind === kind && Math.abs(e.maxHp - C.CHAMPION_RULES.hp * w.run().roomPlan().hpMul) < 1, e && { kind: e.kind, hp: e.maxHp });
  return { w, e };
}
// Step until `pred` (or n ticks), the party held and the room thinned.
function run(w, e, n, pred, each = null) {
  for (let i = 0; i < n; i++) {
    holdParty(w);
    thin(w, [e.id], true);
    if (each) each();
    const k = w.log.length;
    w.step();
    if (pred(w.log.slice(k))) return true;
  }
  return false;
}
const moveOf = (evs, e, move) => evs.find((x) => x.type === 'champion_move' && x.id === e.id && x.move === move);
// Hold every hero at a spot (the heroes stand still; the AI is off).
function pin(w, spots) {
  const ps = party(w).filter((p) => p.hp > 0);
  ps.forEach((p, i) => {
    const s = spots[Math.min(i, spots.length - 1)];
    if (s) {
      p.x = p.px = s[0];
      p.z = p.pz = s[1];
    }
  });
}

const { CHAMPION_CUE_IDS, CHAMPION_CUE_CAL } = await import(u('src/audio/championcues.js'));
const { ENEMY_VFX } = await import(u('src/data/vfx.js'));
const { VFX_MATTER } = await import(u('src/data/palette.js'));

const across = (p, t) => Math.abs((p.x - t.fromX) * -t.dirZ + (p.z - t.fromZ) * t.dirX);

// ---------------------------------------------------------------- pick --
{
  const ids = C.championsOfAct(5).map((c) => c.id);
  const count = { gale_herald: 0, bell_abbess: 0 };
  for (let s = 1; s <= 60; s++) count[C.championPick(s * 7919, 0, 5).id] += 1;
  check('pick', 'the Spire has two champions, the Gale Herald then the Bell Abbess, and the seed picks both', ids.join() === 'gale_herald,bell_abbess' && count.gale_herald > 10 && count.bell_abbess > 10, { ids, count });
  check('pick', "the Spire's first champion is still the Gale Herald", C.championFor(5).id === 'gale_herald');
  const pairs = { 1: 'briar_knight,moss_hart', 2: 'sluice_warden,lockkeeper', 3: 'bone_reeve,gravebell_ringer', 4: 'hollow_choir,vein_matron' };
  check('pick', "the other lands' pairs are unchanged", [1, 2, 3, 4].every((a) => C.championsOfAct(a).map((c) => c.id).join() === pairs[a]));
  check('pick', 'twelve champions in all (the Kiln two since plan 5 slice 9), the Abbess tenth', C.CHAMPION_IDS.length === 12 && C.CHAMPION_IDS[9] === 'bell_abbess' && C.isChampionKind('bell_abbess') && C.championById('bell_abbess').act === 5);
  let agree = 0;
  let tried = 0;
  const met = new Set();
  for (let s = 1; s <= 12; s++) {
    const w = build(s);
    w.run().startCampaign({ level: 5, harness: true });
    const pick = w.run().cmd('championPick', []);
    w.run().cmd('championRoom', [4]);
    w.world.cmd('skipToRoom', 4);
    for (let i = 0; i < 240 && !seen(w, 'champion_spawn').length; i++) w.step();
    const sp = seen(w, 'champion_spawn')[0];
    tried += 1;
    if (sp && sp.champion === pick) agree += 1;
    if (sp) met.add(sp.champion);
  }
  check('pick', 'the Level V champion room spawns the level\'s pick (12 seeds), and both Spire champions turn up', agree === tried && met.has('gale_herald') && met.has('bell_abbess'), { agree, tried, met: [...met] });
  let doorOk = null;
  for (let s = 1; s <= 30 && doorOk === null; s++) {
    const w = build(s);
    w.run().startCampaign({ level: 5, harness: true });
    if (w.run().cmd('championPick', []) !== 'bell_abbess') continue;
    w.world.cmd('skipToRoom', 3);
    w.step();
    w.run().cmd('crownDoor', [0]);
    w.world.cmd('clearRoom');
    for (let i = 0; i < 600 && w.run().view().phase !== 'path'; i++) {
      const ph = w.run().view().phase;
      if (ph === 'reward') w.run().declineReward();
      else if (ph === 'relic') w.run().chooseRelic(0);
      w.step();
    }
    const p = w.run().view().path;
    const door = p && p.options.find((o) => o.champion);
    doorOk = !!door && door.champion === 'bell_abbess' ? true : { options: p && p.options };
    if (doorOk === true) {
      const r = w.run().choosePath(door.side);
      for (let i = 0; i < 240 && !seen(w, 'champion_spawn').length; i++) w.step();
      const sp = seen(w, 'champion_spawn')[0];
      if (!(r && r.champion === 'bell_abbess' && sp && sp.champion === 'bell_abbess')) doorOk = { r, sp };
    }
  }
  check('pick', 'a Spire crown door names the Bell Abbess when the seed picks her, and her room spawns her', doorOk === true, doorOk);
  const w = build(SEED);
  w.run().startCampaign({ level: 5, harness: true });
  check('pick', 'cmd championPick forces the Bell Abbess', w.run().cmd('championPick', ['bell_abbess']) === 'bell_abbess' && w.run().cmd('championPick', []) === 'bell_abbess');
}

// -------------------------------------------------------------- abbess --
let swingSave = null;
{
  const { w, e } = champRoom(SEED, 5, 'bell_abbess');
  if (e) {
    // Rope Swing: one hero 5 u off, held in the lane through the warning.
    let swing = null;
    let tel = null;
    let early = null;
    let mid = null;
    let flierSeen = false;
    run(w, e, 2400, (evs) => {
      const m = moveOf(evs, e, 'rope_swing');
      if (m) swing = { ...m, at: [e.x, e.z], flier: !!e.flier };
      return !!swing;
    }, () => {
      const t = e.telegraph;
      if (t && t.move === 'rope_swing') {
        tel = { fromX: t.fromX, fromZ: t.fromZ, dirX: t.dirX, dirZ: t.dirZ, length: t.length };
        const W = t.resolveTick - t.startTick;
        const k = (w.clock.tick - t.startTick) / W;
        // Hold the heroes on the lane, 0.2 u off its line, 3 u along.
        pin(w, [[t.fromX + t.dirX * 3 - t.dirZ * 0.2, t.fromZ + t.dirZ * 3 + t.dirX * 0.2]]);
        if (k < 0.4 && !early) early = { x: e.x, z: e.z, x0: e.flight && e.flight.x0, z0: e.flight && e.flight.z0 };
        if (k > 0.6 && k < 0.85) {
          mid = mid ?? { x: e.x, z: e.z };
          if (e.flier) flierSeen = true;
          if (!swingSave) swingSave = clonePlain(w.io.capture());
        }
      } else if (!t) pin(w, [[e.x, e.z + 5.0]]);
    });
    const stillEarly = early && early.x0 != null && Math.hypot(early.x - early.x0, early.z - early.z0) < 0.05;
    check('abbess', 'Rope Swing: she stands through the first half of the warning', !!stillEarly, early);
    check('abbess', 'Rope Swing: she rides the rope (a flier) in the second half', flierSeen && !!mid && early && Math.hypot(mid.x - early.x, mid.z - early.z) > 0.5, mid);
    check('abbess', "Rope Swing: she drops at the lane's end and is grounded", !!swing && Math.hypot(swing.at[0] - swing.x, swing.at[1] - swing.z) < 0.35 && !swing.flier, swing);
    check('abbess', 'Rope Swing: the lane runs past the hero (2.4 to 8.7 u)', !!tel && tel.length > 3 + 0.5 && tel.length <= 8.7 + 1e-6, tel);
    const hero = party(w).find((p) => p.hp > 0);
    const before = hero && tel ? across(hero, tel) : null;
    for (let i = 0; i < 12; i++) w.step();
    const after = hero && tel ? across(hero, tel) : null;
    check('abbess', `Rope Swing strikes a hero in the lane and knocks them ~1.6 u aside (${before?.toFixed(2)} -> ${after?.toFixed(2)})`, !!swing && swing.victims >= 1 && swing.knocked >= 1 && after - before >= 1.2 && after - before <= 2.0 && after > 0.6 + (hero.radius ?? 0.3), { victims: swing && swing.victims, knocked: swing && swing.knocked });
    // Vesper Peal: everyone close, in front of her.
    let peal = null;
    run(w, e, 2400, (evs) => {
      const m = moveOf(evs, e, 'vesper_peal');
      if (m && m.victims > 0) peal = m;
      return !!peal;
    }, () => {
      const f = e.telegraph && e.telegraph.move === 'vesper_peal' ? [e.telegraph.dirX, e.telegraph.dirZ] : [0, 1];
      pin(w, [[e.x + f[0] * 2.0, e.z + f[1] * 2.0], [e.x + f[0] * 2.6, e.z + f[1] * 2.6], [e.x + f[0] * 3.0, e.z + f[1] * 3.0], [e.x + f[0] * 1.6, e.z + f[1] * 1.6]]);
    });
    const slowed = party(w).filter((p) => p.status && p.status.slow && p.status.slow.mag >= 0.55 - 1e-9 && p.status.slow.src === e.id);
    check('abbess', 'Vesper Peal rings the heroes in its cone still (slow 55 %)', !!peal && slowed.length >= 1 && slowed.length === peal.victims, { victims: peal && peal.victims, slowed: slowed.length });
    const until = slowed.length ? slowed[0].status.slow.untilTick - peal.tick : 0;
    check('abbess', `the stillness lasts 1.2 s (${until} ticks)`, until === 72);
    e.hp = e.maxHp * 0.45;
    run(w, e, 4, (evs) => evs.some((x) => x.type === 'champion_rage' && x.id === e.id));
    check('common', 'bell_abbess: rages below half health', !!e.rage);
  }
}
if (swingSave) {
  const a = build(SEED);
  a.io.apply(clonePlain(swingSave));
  const b = build(SEED + 99);
  b.io.apply(clonePlain(swingSave));
  const ra = a.continuation(600);
  const rb = b.continuation(600);
  check('common', 'a mid-swing capture continues bit-identically in a fresh world (600 ticks)', JSON.stringify(ra) === JSON.stringify(rb) && ra.events.length > 0, { hashes: ra.hashes.length, events: ra.events.length });
} else check('common', 'a mid-swing capture was taken', false);

// ---------------------------------------------------------------- deeds --
{
  const champs = BESTIARY.filter((b) => b.champion);
  const row = champs.find((c) => c.id === 'bell_abbess');
  check('deeds', 'the Journal lists twelve champions, the Bell Abbess in the Spire with lore and text', champs.length === 12 && !!row && row.lands.join() === '5' && row.name === 'The Bell Abbess' && !!row.lore && !!row.text, champs.map((c) => c.id));
  const get = (id) => DEEDS[id] ?? (DEEDS.get ? DEEDS.get(id) : null) ?? (Array.isArray(DEEDS) ? DEEDS.find((d) => d.id === id || d[0] === id) : null);
  const five = get('five_crowns');
  const wind = get('windfall');
  const life = (ids) => ({ champion: ids });
  const fr = { cleared: [], bosses: [], champions: [] };
  check('deeds', 'Five Crowns takes the Bell Abbess for the Spire as well as the Herald', !!five && five.test(fr, life([...C.FIRST_CROWNS, 'bell_abbess'])) && five.test(fr, life([...C.FIRST_CROWNS, 'gale_herald'])) && !five.test(fr, life([...C.FIRST_CROWNS])) && five.goal(life(['bell_abbess', 'gale_herald']))[0] === 1);
  check('deeds', 'Windfall stays the Gale Herald\'s alone', !!wind && !wind.test({ ...fr, champions: ['bell_abbess'] }, life([])) && wind.test({ ...fr, champions: ['gale_herald'] }, life([])) && !wind.test({ ...fr, champions: ['moss_hart', 'vein_matron'] }, life([])));
  check('deeds', 'champion marks record the Bell Abbess', MARK_KINDS.champion.length === 12 && MARK_KINDS.champion.includes('bell_abbess'));
}

// ----------------------------------------------------------------- text --
{
  const NEW = ['The Bell Abbess', row0('bell_abbess', 'lore'), row0('bell_abbess', 'text'), "Fell a champion in each of the five lands. Either of a land's two champions counts."];
  const OLD = ["Fell a champion in each of the five lands, the Gale Herald included. Either of a land's two champions counts."];
  const miss = [];
  const stale = [];
  for (const l of ['de', 'es', 'fr', 'ja', 'ko', 'pt-BR', 'ru', 'zh-Hans', 'zh-Hant']) {
    const tab = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
    for (const k of NEW) if (!tab[k] || tab[k] === k) miss.push(`${l}: ${k.slice(0, 30)}`);
    for (const k of OLD) if (k in tab) stale.push(`${l}: ${k.slice(0, 30)}`);
  }
  const cat = JSON.parse(readFileSync(join(here, 'src/i18n/catalog.json'), 'utf8'));
  check('text', `${NEW.length} new lines in all nine other languages and the catalog`, miss.length === 0 && NEW.every((k) => k in cat), miss);
  check('text', 'the old Five Crowns line is gone', stale.length === 0 && OLD.every((k) => !(k in cat)), stale);
}
function row0(id, f) {
  const r = BESTIARY.find((b) => b.id === id);
  return r ? r[f] : '';
}

// ----------------------------------------------------------------- data --
check('data', 'her sting, rage, rope grip, Rope Swing and Vesper Peal cues are registered and levelled', ['ch_bell_abbess_sting', 'ch_bell_abbess_rage', 'ch_rope_grip', 'ch_rope_swing', 'ch_vesper_peal'].every((id) => CHAMPION_CUE_IDS.includes(id) && Number.isFinite(CHAMPION_CUE_CAL[id])));
check('data', 'her VFX row and habit matter exist', !!ENEMY_VFX.bell_abbess && ENEMY_VFX.bell_abbess.matter === 'habit' && /^#[0-9A-F]{6}$/i.test(VFX_MATTER.habit));

mkdirSync(dirname(resolve(here, OUT)), { recursive: true });
writeFileSync(resolve(here, OUT), JSON.stringify({ seed: SEED, passed: results.length - failed, failed, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
