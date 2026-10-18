#!/usr/bin/env node
// KILN CHAMPIONS AND EVENTS probe (content plan 5 slice 9, docs/KILN.md,
// docs/CHAMPIONS.md "The Ember Kiln's two"), headless sim, no browser:
//   pick     the Kiln has its own two champions, the Furnace Knight then the
//            Glassblower; the seed picks both; the Spire's pair is unchanged;
//            a Level V Kiln crown room spawns the level's pick
//   knight   Molten Rush runs through a hero in its lane and leaves slag;
//            Grate Blast hits the heroes in its cone and throws them back
//   glass    Glass Bubble lands on a hero and leaves a glass patch; Glass
//            Gout slows the heroes in its lane 50 %; both rage below half
//   enemies  the Coal Hurler lobs a coal that leaves ash; the Ash Wraith is
//            untouchable while veiled, reforms behind a hero and rakes, then
//            takes x1.3 while spent; both are campaign-only Kiln creatures
//   event    the Molten Bell pours 40 Glint a relic, up to three; it refuses
//            under 40; it rolls only in the Kiln; Wayfarer does not widen
//   shrine   the Forge Shrine refuses with no common relic, then melts the
//            newest common relic for Tempered on every hero
//   relics   Slag Greaves cuts a vent's hit 35 %; Founder's Ingot heats per
//            combat room cleared, up to five
//   deeds    Through the Fire, Kiln Crowns and Quench the Founder; the two
//            tints; Five Crowns, Windfall and Kingslayer unchanged
//   common   a mid-rush capture continues bit-identically in a fresh world
//   text     every new line in all nine other languages
//   data     the cues and VFX rows are registered
//
//   node tools/kiln-champions-events-probe.mjs [--seed 4] [--out captures/kiln-champions-events-probe.json]
// Exit code 1 on any failure.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

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
const { DEEDS, UNLOCKS, MARK_KINDS } = await import(u('src/data/unlocks.js'));
const { LEVELS, CAMPAIGN_ONLY_ENEMIES } = await import(u('src/data/levels.js'));
const { ENCOUNTERS, ENCOUNTER_IDS, WAYFARER_IDS } = await import(u('src/sim/encounters.js'));
const { SHRINES, BLESSINGS } = await import(u('src/sim/shrines.js'));
const { RELICS } = await import(u('src/sim/relics.js'));
const C = await import(u('src/sim/champions.js'));
const { CHAMPION_CUE_IDS, CHAMPION_CUE_CAL } = await import(u('src/audio/championcues.js'));
const { KILN_CUE_IDS, KILN_CUE_CAL } = await import(u('src/audio/kilncues.js'));
const { ENCOUNTER_TAKE_CUES } = await import(u('src/audio/encountercues.js'));
const { SHRINE_CUE_IDS } = await import(u('src/audio/shrinecues.js'));
const { ENEMY_VFX } = await import(u('src/data/vfx.js'));
const { VFX_MATTER, SHRINE_COLORS, BLESSING_COLORS } = await import(u('src/data/palette.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEED = Number(opt('seed', '4'));
const OUT = opt('out', 'captures/kiln-champions-events-probe.json');

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
  const step = (snap = null) => clock.stepOnce((t) => world.step(t, snap ?? (ap.active() ? ap.intents(t, emptySnapshot()) : emptySnapshot())));
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
  const r = { registry, bus, clock, world, ap, io, step, continuation, log };
  Object.defineProperty(r, 'run', { get: () => world.runSystem() });
  return r;
}
const party = (w) => w.registry.all().filter((e) => e.partyIndex !== undefined);
const holdParty = (w) => {
  for (const e of party(w)) if (e.hp > 0) e.hp = e.maxHp;
};
const seen = (w, type, pred = () => true) => w.log.filter((e) => e.type === type && pred(e));
function thin(w, keep) {
  for (const x of w.registry.all()) if (x.faction === 'hostile' && !keep.includes(x.id) && x.hp > 0 && x.kind !== 'eshot' && x.state === 'active') x.hp = 0.001;
}
function pin(w, spots) {
  party(w).filter((p) => p.hp > 0).forEach((p, i) => {
    const s = spots[Math.min(i, spots.length - 1)];
    if (s) {
      p.x = p.px = s[0];
      p.z = p.pz = s[1];
    }
  });
}
function spawnAt(w, kind, x, z, hp = 600) {
  const r = w.world.cmd('spawn', kind, x, z);
  const e = w.registry.byId(typeof r === 'object' && r ? r.id : r);
  if (e) {
    e.maxHp = hp;
    e.hp = hp;
    e.elite = false;
    delete e.affixes;
  }
  return e;
}
// Step until `pred(new events)` (or n ticks), the party held and the room
// thinned to `keep`.
function runUntil(w, keep, n, pred, each = null) {
  for (let i = 0; i < n; i++) {
    holdParty(w);
    thin(w, keep);
    if (each) each();
    const k = w.log.length;
    w.step();
    if (pred(w.log.slice(k))) return true;
  }
  return false;
}
const moveOf = (evs, e, move) => evs.find((x) => x.type === 'champion_move' && x.id === e.id && x.move === move);
// A Level V Kiln campaign (act 6 in data), cleared at room n.
function stage(seed, n = 3) {
  const w = build(seed);
  w.run.startCampaign({ level: 6, harness: true });
  w.world.cmd('skipToRoom', n);
  for (let i = 0; i < 30; i++) w.step();
  w.world.cmd('killAllEnemies');
  for (let i = 0; i < 4; i++) w.step();
  holdParty(w);
  w.ap.configure(false);
  return w;
}
// The Kiln's crown room holding `kind`, the rest of its waves melted.
function champRoom(seed, kind) {
  const w = build(seed);
  w.run.startCampaign({ level: 6, harness: true });
  w.run.cmd('championPick', [kind]);
  w.run.cmd('championRoom', [4]);
  w.world.cmd('skipToRoom', 4);
  w.ap.configure(false);
  for (let i = 0; i < 240 && !seen(w, 'champion_spawn').length; i++) w.step();
  const sp = seen(w, 'champion_spawn')[0];
  const e = sp ? w.registry.byId(sp.id) : null;
  check('pick', `${kind}: spawns in the Kiln's crown room with the room's champion HP`, !!e && e.kind === kind && Math.abs(e.maxHp - C.CHAMPION_RULES.hp * w.run.roomPlan().hpMul) < 1, e && { kind: e.kind, hp: e.maxHp });
  return { w, e };
}
const slicks = (w, variant) => w.registry.all().filter((s) => s.kind === 'slick' && s.variant === variant);

// ---------------------------------------------------------------- pick --
{
  const ids = C.championsOfAct(6).map((c) => c.id);
  const count = { furnace_knight: 0, glassblower: 0 };
  for (let s = 1; s <= 60; s++) count[C.championPick(s * 7919, 0, 6).id] += 1;
  check('pick', 'the Kiln has its own two, the Furnace Knight then the Glassblower, and the seed picks both', ids.join() === 'furnace_knight,glassblower' && count.furnace_knight > 10 && count.glassblower > 10, { ids, count });
  check('pick', "the Spire's pair is unchanged", C.championsOfAct(5).map((c) => c.id).join() === 'gale_herald,bell_abbess');
  check('pick', 'twelve champions in all, the Kiln two at act 6', C.CHAMPION_IDS.length === 12 && ['furnace_knight', 'glassblower'].every((id) => C.isChampionKind(id) && C.championById(id).act === 6));
  let agree = 0;
  const met = new Set();
  for (let s = 1; s <= 12; s++) {
    const w = build(s);
    w.run.startCampaign({ level: 6, harness: true });
    const pick = w.run.cmd('championPick', []);
    w.run.cmd('championRoom', [4]);
    w.world.cmd('skipToRoom', 4);
    for (let i = 0; i < 240 && !seen(w, 'champion_spawn').length; i++) w.step();
    const sp = seen(w, 'champion_spawn')[0];
    if (sp && sp.champion === pick) agree += 1;
    if (sp) met.add(sp.champion);
  }
  check('pick', 'the Kiln crown room spawns the level\'s pick (12 seeds), and both Kiln champions turn up', agree === 12 && met.has('furnace_knight') && met.has('glassblower'), { agree, met: [...met] });
}

// -------------------------------------------------------------- knight --
let rushSave = null;
{
  const { w, e } = champRoom(SEED, 'furnace_knight');
  if (e) {
    let rush = null;
    let end = null;
    runUntil(w, [e.id], 2400, (evs) => {
      const m = moveOf(evs, e, 'molten_rush');
      if (m) rush = m;
      const c = evs.find((x) => x.type === 'champion_charge_end' && x.id === e.id);
      if (c) end = c;
      return !!end;
    }, () => {
      const t = e.telegraph;
      if (t && t.move === 'molten_rush') {
        pin(w, [[t.fromX + t.dirX * 3.2, t.fromZ + t.dirZ * 3.2]]);
        if (!rushSave && w.clock.tick > t.startTick + 10) rushSave = clonePlain(w.io.capture());
      } else if (!t && !e.charge) pin(w, [[e.x, e.z + 4.5]]);
    });
    check('knight', 'Molten Rush charges and ends', !!end, end);
    const hits = seen(w, 'hit', (h) => h.attacker === e.id && party(w).some((p) => p.id === h.target));
    check('knight', 'Molten Rush runs through the hero in its lane', hits.length >= 1, { hits: hits.length });
    check('knight', 'Molten Rush leaves slag pools behind it', (end && end.pools >= 1) || slicks(w, 'slag').length >= 1, { pools: end && end.pools, slag: slicks(w, 'slag').length });
    let blast = null;
    runUntil(w, [e.id], 2400, (evs) => {
      const m = moveOf(evs, e, 'grate_blast');
      if (m && m.victims > 0) blast = m;
      return !!blast;
    }, () => {
      const f = e.telegraph && e.telegraph.move === 'grate_blast' ? [e.telegraph.dirX, e.telegraph.dirZ] : [0, 1];
      if (!e.charge) pin(w, [[e.x + f[0] * 1.8, e.z + f[1] * 1.8], [e.x + f[0] * 2.4, e.z + f[1] * 2.4]]);
    });
    check('knight', 'Grate Blast hits the heroes in its cone', !!blast, blast && { victims: blast.victims });
    e.hp = e.maxHp * 0.45;
    runUntil(w, [e.id], 4, (evs) => evs.some((x) => x.type === 'champion_rage' && x.id === e.id));
    check('knight', 'the Furnace Knight rages below half health', !!e.rage);
  }
}
if (rushSave) {
  const a = build(SEED);
  a.io.apply(clonePlain(rushSave));
  const b = build(SEED + 99);
  b.io.apply(clonePlain(rushSave));
  const ra = a.continuation(600);
  const rb = b.continuation(600);
  check('common', 'a mid-rush capture continues bit-identically in a fresh world (600 ticks)', JSON.stringify(ra) === JSON.stringify(rb) && ra.events.length > 0, { hashes: ra.hashes.length, events: ra.events.length });
} else check('common', 'a mid-rush capture was taken', false);

// --------------------------------------------------------------- glass --
{
  const { w, e } = champRoom(SEED + 1, 'glassblower');
  if (e) {
    let bubble = null;
    runUntil(w, [e.id], 3000, (evs) => {
      const m = moveOf(evs, e, 'glass_bubble');
      if (m) bubble = m;
      return !!bubble;
    }, () => {
      const t = e.telegraph;
      if (t && t.move === 'glass_bubble') pin(w, [[t.x, t.z]]);
      else if (!t) pin(w, [[e.x, e.z + 5.0]]);
    });
    check('glass', 'Glass Bubble lands on the hero under it', !!bubble && bubble.victims >= 1, bubble && { victims: bubble.victims });
    check('glass', 'Glass Bubble leaves a glass patch that slows', slicks(w, 'glass').length >= 1 && slicks(w, 'glass')[0].slow > 0, { glass: slicks(w, 'glass').length });
    let gout = null;
    runUntil(w, [e.id], 3000, (evs) => {
      const m = moveOf(evs, e, 'glass_gout');
      if (m && m.victims > 0) gout = m;
      return !!gout;
    }, () => {
      const t = e.telegraph;
      if (t && t.move === 'glass_gout') pin(w, [[t.fromX + t.dirX * 2.5, t.fromZ + t.dirZ * 2.5]]);
      else if (t && t.move === 'glass_bubble') pin(w, [[t.x + 6, t.z + 6]]);
      else if (!t) pin(w, [[e.x, e.z + 3.6]]);
    });
    const slowed = party(w).filter((p) => p.status && p.status.slow && p.status.slow.src === e.id && p.status.slow.mag >= 0.5 - 1e-9);
    check('glass', 'Glass Gout slows the heroes in its lane 50 %', !!gout && slowed.length >= 1, { victims: gout && gout.victims, slowed: slowed.length });
    e.hp = e.maxHp * 0.45;
    runUntil(w, [e.id], 4, (evs) => evs.some((x) => x.type === 'champion_rage' && x.id === e.id));
    check('glass', 'the Glassblower rages below half health', !!e.rage);
  }
}

// ------------------------------------------------------------- enemies --
{
  const kiln = LEVELS[6].roster;
  check('enemies', 'the Kiln roster holds the Coal Hurler and the Ash Wraith', kiln.hurler > 0 && kiln.ashwraith > 0, { hurler: kiln.hurler, ashwraith: kiln.ashwraith });
  check('enemies', 'both are campaign-only and in no other land', ['hurler', 'ashwraith'].every((k) => CAMPAIGN_ONLY_ENEMIES.includes(k) && [1, 2, 3, 4, 5].every((a) => !(LEVELS[a].roster || {})[k])));
  check('enemies', 'the Journal holds both with lore and text', ['hurler', 'ashwraith'].every((k) => { const b = BESTIARY.find((x) => x.id === k); return b && b.lore && b.text; }));
  const w = stage(SEED);
  const p0 = party(w)[0];
  const h = spawnAt(w, 'hurler', p0.x, p0.z - 5, 200);
  let coal = null;
  runUntil(w, [h.id], 1200, (evs) => {
    coal = evs.find((x) => x.type === 'hurler_coal') ?? coal;
    return !!coal;
  }, () => pin(w, [[p0.x, p0.z]]));
  check('enemies', 'the Coal Hurler lobs a coal onto a hero', !!coal && coal.victims >= 1, coal);
  check('enemies', 'the coal leaves an ash patch that slows', slicks(w, 'ash').length >= 1);
  w.world.cmd('setHp', h.id, 0);
  const a = spawnAt(w, 'ashwraith', p0.x, p0.z - 3.5, 200);
  let fade = null;
  let veilOk = true;
  let veiled = false;
  let rake = null;
  runUntil(w, [a.id], 1500, (evs) => {
    fade = evs.find((x) => x.type === 'ashwraith_fade') ?? fade;
    rake = evs.find((x) => x.type === 'ashwraith_rake') ?? rake;
    return !!rake;
  }, () => {
    pin(w, [[p0.x, p0.z]]);
    if (a.veiled) {
      veiled = true;
      if (a.hittable !== false) veilOk = false;
    }
  });
  check('enemies', 'the Ash Wraith fades and is untouchable while veiled', !!fade && veiled && veilOk);
  check('enemies', 'it reforms behind the hero and rakes them', !!rake && rake.victims >= 1 && Math.hypot(a.x - p0.x, a.z - p0.z) < 2.0, rake);
  check('enemies', 'spent after the rake it takes x1.3 and is hittable', a.takenMul === 1.3 && a.hittable !== false && a.veiled !== true, { takenMul: a.takenMul });
  runUntil(w, [a.id], 120, (evs) => evs.some((x) => x.type === 'ashwraith_recover'));
  check('enemies', 'it recovers and the x1.3 is gone', a.takenMul === undefined);
}

// --------------------------------------------------------------- event --
function clearToPath(W) {
  W.world.cmd('killAllEnemies');
  for (let i = 0; i < 3000 && W.run.view().phase !== 'path'; i++) {
    const v = W.run.view();
    if (v.phase === 'combat') W.world.cmd('killAllEnemies');
    else if (v.phase === 'reward') W.run.declineReward();
    else if (v.phase === 'relic') W.run.chooseRelic(0);
    W.step();
  }
  return W.run.view().phase === 'path';
}
const stepUntil = (W, pred, max = 600) => {
  for (let i = 0; i < max && !pred(W.run.view()); i++) W.step();
  return pred(W.run.view());
};
const dbg = (at, W, x = null) => (process.env.DEBUG ? console.log('atBell', at, W.run.view().phase, JSON.stringify(x)) : null, null);
function atBell(seed, wallet) {
  const W = build(seed);
  W.run.startCampaign({ level: 6, harness: true });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  for (let i = 0; i < 30; i++) W.step();
  W.run.cmd('eventDoor', ['molten_bell', 0]);
  if (!clearToPath(W)) return dbg('path', W);
  W.run.cmd('wallet', [wallet]);
  const p = W.run.view().path;
  W.run.choosePath(p.options.findIndex((o) => o.event));
  if (!stepUntil(W, (v) => v.phase === 'event')) return dbg('event', W, p.options);
  const body = W.registry.all().find((e) => e.itype === 'encounter');
  W.world.cmd('teleport', body.x, body.z + 1.0);
  for (let i = 0; i < 3; i++) W.step();
  W.step({ ...emptySnapshot(), presses: [{ kind: 'interact' }] });
  W.step();
  return W.run.view().phase === 'encounter' ? W : null;
}
{
  const E = ENCOUNTERS.molten_bell;
  check('event', 'the Molten Bell is the Kiln\'s own, safe for the AI', !!E && E.land === 'kiln' && E.safe === true && ENCOUNTER_IDS.includes('molten_bell'));
  check('event', 'Wayfarer keeps the sixteen events it counted before', !WAYFARER_IDS.includes('molten_bell') && WAYFARER_IDS.length === 16);
  for (const [wallet, n] of [[100, 2], [200, 3], [45, 1]]) {
    let W = null;
    for (let k = 0; k < 8 && !W; k++) W = atBell(30 + wallet + k * 101, wallet);
    if (!check('event', `wallet ${wallet}: reached the Molten Bell`, !!W)) continue;
    const before = W.run.view().relics.owned.length;
    const r = W.run.chooseEncounter('take');
    const v = W.run.view();
    const got = v.relics.owned.length - before;
    check('event', `wallet ${wallet}: pours ${n * 40} for ${n} relic${n > 1 ? 's' : ''} (${got} granted, ${v.wallet} left)`, r && r.took && got === n && v.wallet === wallet - n * 40 && r.paid === n * 40 && r.relics.length === n, { got, wallet: v.wallet, paid: r && r.paid });
  }
  let W = null;
  for (let k = 0; k < 8 && !W; k++) W = atBell(77 + k * 101, 30);
  const why = W && W.run.view().encounter.refused;
  check('event', `wallet 30: Take refused (${why})`, why === 'glint');
  // It rolls on the Kiln road only.
  let kilnSeen = 0;
  let elsewhere = 0;
  for (let seed = 1; seed <= 40; seed++) {
    for (const level of [5, 6]) {
      const X = build(seed);
      X.run.startCampaign({ level, harness: true });
      for (let i = 0; i < 4000 && X.run.view().phase !== 'combat'; i++) X.step();
      for (let room = 1; room <= 4; room++) {
        if (!clearToPath(X)) break;
        const p = X.run.view().path;
        const ev = p.options.find((o) => o.event);
        if (ev && ev.encounter === 'molten_bell') {
          if (level === 6) kilnSeen += 1;
          else elsewhere += 1;
        }
        X.run.choosePath(p.options[0].event ? 1 : 0);
        stepUntil(X, (v) => v.phase === 'combat');
      }
    }
  }
  check('event', `the Molten Bell rolls in the Kiln (${kilnSeen}) and never on the Spire (${elsewhere})`, kilnSeen >= 1 && elsewhere === 0);
}

// -------------------------------------------------------------- shrine --
{
  const S = SHRINES.kiln;
  check('shrine', 'the Forge Shrine trades a common relic for Tempered (+25 % damage, 20 % less taken)', !!S && S.cost === 'relic' && S.gift === 'tempered' && BLESSINGS.tempered.might === 0.25 && BLESSINGS.tempered.ward === 0.2);
  const w = build(SEED + 5);
  w.run.startCampaign({ level: 6, harness: true });
  for (let i = 0; i < 4000 && w.run.view().phase !== 'combat'; i++) w.step();
  for (let i = 0; i < 20; i++) w.step();
  // The run's starter relic may be common: drop the commons it holds.
  const here = w.run.cmd('shrineHere', ['kiln']);
  check('shrine', 'a Forge Shrine stands in a live Kiln room', !!here);
  const commons = w.run.view().relics.owned.filter((r) => RELICS[r.id] && RELICS[r.id].rarity === 'common').map((r) => r.id);
  const out = w.run.cmd('shrineUse', [0]);
  if (commons.length === 0) check('shrine', 'with no common relic it is refused', out && out.denied === 'relic', out);
  else check('shrine', `(the party already held ${commons.join(', ')})`, true);
  w.run.cmd('relicGrant', ['whetstone']);
  w.run.cmd('relicGrant', ['millstone']);
  const owned0 = w.run.view().relics.owned.map((r) => r.id);
  const newest = [...owned0].reverse().find((id) => RELICS[id] && RELICS[id].rarity === 'common');
  w.log.length = 0;
  const res = w.run.cmd('shrineUse', [0]);
  w.step();
  const owned1 = w.run.view().relics.owned.map((r) => r.id);
  const lose = seen(w, 'relic_lose')[0];
  check('shrine', `it melts the newest common relic (${newest})`, !!res && res.relic === newest && !owned1.includes(newest) && lose && lose.source === 'forge', { res, lose });
  const tick = w.clock.tick;
  const blessed = party(w).filter((p) => p.blessing && p.blessing.id === 'tempered' && p.blessing.untilTick > tick);
  check('shrine', 'Tempered lies on every hero', blessed.length === party(w).length && blessed.length > 0, { blessed: blessed.length });
  check('shrine', 'its colours are Kiln Gold', SHRINE_COLORS.kiln && SHRINE_COLORS.kiln.glow.toUpperCase() === VFX_MATTER.kilngold.toUpperCase() && BLESSING_COLORS.tempered === SHRINE_COLORS.kiln);
}

// -------------------------------------------------------------- relics --
{
  check('relics', 'Slag Greaves (common) and Founder\'s Ingot (rare) are in the pool with heirlooms', RELICS.slag_greaves && RELICS.slag_greaves.rarity === 'common' && RELICS.founders_ingot && RELICS.founders_ingot.rarity === 'rare' && UNLOCKS.heirloom_slag_greaves && UNLOCKS.heirloom_founders_ingot);
  const vent = (greaves) => {
    const w = stage(SEED + 7);
    if (greaves) w.run.cmd('relicGrant', ['slag_greaves']);
    const p = party(w)[0];
    const id = w.world.cmd('spawnHazard', 'vent', p.x, p.z);
    w.world.cmd('hazardPhase', id, 'active');
    w.log.length = 0;
    for (let i = 0; i < 6; i++) {
      pin(w, [[p.x, p.z]]);
      w.step();
    }
    const h = seen(w, 'hit', (x) => x.target === p.id && x.delivery === 'hazard')[0];
    return h ? h.amount : null;
  };
  const bare = vent(false);
  const worn = vent(true);
  check('relics', `Slag Greaves: a vent hits for ${worn} instead of ${bare} (x0.65)`, bare > 0 && worn > 0 && Math.abs(worn / bare - 0.65) < 0.02);
  const W = build(SEED + 9);
  W.run.startCampaign({ level: 6, harness: true });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  W.run.cmd('relicGrant', ['founders_ingot']);
  const heats = [];
  for (let room = 2; room <= 7; room++) {
    W.world.cmd('skipToRoom', room);
    for (let i = 0; i < 30; i++) W.step();
    for (let i = 0; i < 600 && W.run.view().phase === 'combat'; i++) {
      W.world.cmd('killAllEnemies');
      W.step();
    }
    for (const e of seen(W, 'relic_proc', (x) => x.relic === 'founders_ingot')) if (!heats.includes(e.heat)) heats.push(e.heat);
  }
  check('relics', `Founder's Ingot heats once a cleared combat room, up to five (${heats.join(', ')})`, heats.length >= 3 && heats.every((h, i) => h === i + 1) && Math.max(...heats) <= 5);
}

// --------------------------------------------------------------- deeds --
{
  const fr = { cleared: [], bosses: [], champions: [], challenge: 'standard' };
  const life = (ids) => ({ champion: ids });
  const tf = DEEDS.through_the_fire;
  const kc = DEEDS.kiln_crowns;
  const qf = DEEDS.quench_the_founder;
  check('deeds', 'Through the Fire pays for a Kiln clear, not a Spire clear', !!tf && tf.test({ ...fr, cleared: [1, 2, 3, 4, 6] }, life([])) && !tf.test({ ...fr, cleared: [1, 2, 3, 4, 5] }, life([])));
  check('deeds', 'Kiln Crowns needs both Kiln champions across runs, with a bar of 2', !!kc && kc.test(fr, life(['furnace_knight', 'glassblower'])) && !kc.test(fr, life(['furnace_knight', 'gale_herald'])) && kc.goal(life(['glassblower'])).join() === '1,2');
  check('deeds', 'Quench the Founder takes the Bellfounder on Harrowing only', !!qf && qf.test({ ...fr, bosses: ['founder'], challenge: 'harrowing' }, life([])) && !qf.test({ ...fr, bosses: ['founder'] }, life([])) && !qf.test({ ...fr, bosses: ['cinderback'], challenge: 'harrowing' }, life([])));
  const five = DEEDS.five_crowns;
  check('deeds', 'Five Crowns does not take a Kiln champion for the Spire', !!five && !five.test(fr, life([...C.FIRST_CROWNS, 'furnace_knight', 'glassblower'])) && five.test(fr, life([...C.FIRST_CROWNS, 'gale_herald'])));
  check('deeds', 'Windfall stays the Gale Herald\'s alone', DEEDS.windfall && !DEEDS.windfall.test({ ...fr, champions: ['furnace_knight', 'glassblower'] }, life([])));
  check('deeds', 'champion marks record both Kiln champions', MARK_KINDS.champion.length === 12 && MARK_KINDS.champion.includes('furnace_knight') && MARK_KINDS.champion.includes('glassblower'));
  const tq = UNLOCKS.tint_quench;
  const tc = UNLOCKS.tint_cinderwing;
  check('deeds', 'Quench Steam (Tidecaller, the Kiln cleared) and Cinderwing (Duskwing, with Kiln Crowns)', tq && tq.req && tq.req.level === 6 && tc && tc.req && tc.req.deed === 'kiln_crowns');
  check('deeds', 'neither tint glows Ember', ![tq, tc].some((t) => JSON.stringify(t).toUpperCase().includes('#FF6A2A')));
}

// ---------------------------------------------------------------- text --
{
  const NEW = [
    'The Furnace Knight', 'The Glassblower', 'Coal Hurler', 'Ash Wraith', 'Mortar', 'Stalker',
    'Molten Bell', ENCOUNTERS.molten_bell.text, ENCOUNTERS.molten_bell.detail, ENCOUNTERS.molten_bell.effect,
    'Forge Shrine', SHRINES.kiln.trade, SHRINES.kiln.text, 'Tempered', BLESSINGS.tempered.text,
    'Slag Greaves', RELICS.slag_greaves.text, "Founder's Ingot", RELICS.founders_ingot.text,
    'Through the Fire', 'Kiln Crowns', 'Quench the Founder', DEEDS.through_the_fire.text, DEEDS.kiln_crowns.text, DEEDS.quench_the_founder.text,
    'Quench Steam tint', 'Cinderwing tint',
    'The shrine asks for a common relic to melt down.',
    '{name} melts down {relic}: {blessing} for 60 s ({text}).',
    'The bell is cast for {n} Glint and rings out: {names}.',
    'The bell is cast, but no relic is left for it to ring: +{n} Glint.',
    ...['furnace_knight', 'glassblower', 'hurler', 'ashwraith'].flatMap((id) => { const b = BESTIARY.find((x) => x.id === id); return b ? [b.lore, b.text] : ['?' + id]; }),
  ];
  const miss = [];
  for (const l of ['de', 'es', 'fr', 'ja', 'ko', 'pt-BR', 'ru', 'zh-Hans', 'zh-Hant']) {
    const tab = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
    for (const k of NEW) if (!tab[k] || tab[k] === k) miss.push(`${l}: ${String(k).slice(0, 30)}`);
  }
  const cat = JSON.parse(readFileSync(join(here, 'src/i18n/catalog.json'), 'utf8'));
  check('text', `${NEW.length} new lines in all nine other languages and the catalog`, miss.length === 0 && NEW.every((k) => k in cat), miss.slice(0, 12));
}

// ---------------------------------------------------------------- data --
check('data', 'the champions\' stings, rages and seven move cues are registered and levelled', ['ch_furnace_knight_sting', 'ch_furnace_knight_rage', 'ch_glassblower_sting', 'ch_glassblower_rage', 'ch_rush_dig', 'ch_molten_rush', 'ch_grate_open', 'ch_grate_blast', 'ch_glass_swell', 'ch_glass_bubble', 'ch_glass_gout'].every((id) => CHAMPION_CUE_IDS.includes(id) && Number.isFinite(CHAMPION_CUE_CAL[id])));
check('data', 'the Hurler\'s and the Wraith\'s seven cues are registered and levelled', ['kn_hheave', 'kn_hcoal', 'kn_hfumble', 'kn_wgather', 'kn_wfade', 'kn_wrake', 'kn_wrecover'].every((id) => KILN_CUE_IDS.includes(id) && Number.isFinite(KILN_CUE_CAL[id])));
check('data', 'the Molten Bell and the Forge Shrine have their own cues', ENCOUNTER_TAKE_CUES.molten_bell === 'ev_pour' && SHRINE_CUE_IDS.includes('sh_offer_kiln'));
check('data', 'VFX rows and matters for all four', ['hurler', 'ashwraith', 'furnace_knight', 'glassblower'].every((k) => ENEMY_VFX[k] && /^#[0-9A-F]{6}$/i.test(VFX_MATTER[ENEMY_VFX[k].matter] ?? '')), ['hurler', 'ashwraith', 'furnace_knight', 'glassblower'].map((k) => ENEMY_VFX[k] && ENEMY_VFX[k].matter));

mkdirSync(dirname(resolve(here, OUT)), { recursive: true });
writeFileSync(resolve(here, OUT), JSON.stringify({ seed: SEED, passed: results.length - failed, failed, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
