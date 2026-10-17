#!/usr/bin/env node
// THE DUSKWING, his whole kit (docs/DUSKWING.md, content plan 5 slice 5) —
// headless Node, the sim built like src/main.js (the harness of
// tools/bellwright-kit-probe.mjs).
//
//   node tools/duskwing-kit-probe.mjs
//
// Checks:
//   1. Data and gate: eleven skills, eight class nodes, all campaign-only,
//      his AI order holds all eleven, his node pool (12 shared + 8), card
//      text, icons and the nine translations.
//   2. Node verdicts: which of his skills each node works on.
//   3. The seven new skills on training dummies: Echo Screech (a cone that
//      marks), Talon Rake (a wide rake that pushes), Bat Swarm (a zone that
//      slows and feeds him), Shadow Veil (a shield on him, a cut round him),
//      Flit (a flit away, the dark left where he was), Blood Scent (a
//      passive that marks), Blood Moon (a big burst that blinds and feeds).
//   4. The eight nodes, each on a skill it works on.
//   5. The AI seat: he plays all nine actives in real fights, and pulls out
//      when he runs low (no dive, steps back off the pack, Flit away) and
//      comes back in once fed.
//   6. A mid-fight save with his nodes socketed continues bit-identically.
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
const { hashState } = await import(u('src/core/hash.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { clonePlain } = await import(u('src/save/codec.js'));
const { SKILLS } = await import(u('src/sim/skills.js'));
const { frameFromSnapshot, seatInputOf } = await import(u('src/sim/netseats.js'));
const { NODES, classVerdict } = await import(u('src/sim/nodes.js'));
const STATUS = await import(u('src/sim/status.js'));
const C = await import(u('src/data/classes.js'));

function makeWorld(seed) {
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
  const run = world.runSystem();
  const step = () => clock.stepOnce((t) => world.step(t, emptySnapshot()));
  return { world, registry, bus, clock, run, log, step, io };
}

const fails = [];
const passes = [];
const check = (ok, what) => {
  (ok ? passes : fails).push(what);
  console.log(ok ? 'ok  ' : 'FAIL', what);
  return ok;
};
const cmd = (W, ...a) => W.world.cmd(...a);
const ally = (W, seat) => W.registry.all().find((e) => e.kind === 'ally' && e.partyIndex === seat);
const party = (W) => W.registry.all().filter((e) => e.partyIndex !== undefined);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const near = (v, w, eps = 0.02) => Math.abs(v - w) <= eps;
const SABLE = ['healer', 'tank', 'swordsman', 'duskwing'];
const BASE = ['dusk_dive', 'blood_bite', 'nightfall', 'night_wings'];
const NEW = ['echo_screech', 'talon_rake', 'bat_swarm', 'shadow_veil', 'flit', 'blood_scent', 'blood_moon'];
const ALL = [...BASE, ...NEW];
const PASSIVES = ['night_wings', 'blood_scent'];
const NODE_IDS = ['deep_dive', 'thirst', 'gloom', 'ambush', 'echolocate', 'frenzy', 'vampire', 'eclipse'];

function campaign(seed) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 1, harness: true, lineup: SABLE });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  cmd(W, 'partyMode', 'manual');
  return W;
}
// Between rooms (a loadout only changes there): clear the room, put `ids` on
// Sable's keys (the rest padded with actives he will not be asked to cast),
// socket `nodes` ({ skill: [node, ...] }), then walk into the next room.
function room(W, ids, nodes = {}) {
  for (let i = 0; i < 3000 && W.run.view().phase === 'combat'; i++) {
    cmd(W, 'killAllEnemies');
    W.step();
  }
  const pads = ALL.filter((id) => !PASSIVES.includes(id) && !ids.includes(id));
  const desired = [...ids, ...pads].slice(0, 4);
  for (let k = 0; k < 4; k++) {
    const s = cmd(W, 'partyView', 3).slots;
    if (s[k] === desired[k]) continue;
    const j = s.indexOf(desired[k]);
    if (j >= 0) cmd(W, 'partySwap', 3, ALL.find((id) => !PASSIVES.includes(id) && !s.includes(id) && !desired.includes(id)), j);
    cmd(W, 'partySwap', 3, desired[k], k);
  }
  for (const [skill, list] of Object.entries(nodes)) {
    for (const n of list) {
      cmd(W, 'partyGrantNode', 3, n);
      const r = cmd(W, 'partySocket', 3, skill, n);
      if (r && r.error) console.log('   socket', skill, n, JSON.stringify(r));
    }
  }
  const next = (W.run.view().room ?? 1) + 1;
  cmd(W, 'skipToRoom', next);
  for (let i = 0; i < 900 && !(W.run.view().phase === 'combat' && W.run.view().room === next); i++) W.step();
  quiet(W);
  return same(cmd(W, 'partyView', 3).slots, desired);
}
// A quiet room: the room's own enemies are held in a far corner every tick
// (alive, so the room never clears) and their shots lifted out, so only the
// training dummies stand near the party.
function quiet(W) {
  for (const e of W.registry.all()) {
    if (e.faction === 'hostile' && e.kind !== 'dummy' && e.hp > 0) {
      e.x = e.px = 9;
      e.z = e.pz = 9;
      e.telegraph = null;
    } else if (e.kind === 'eshot' || e.kind === 'eglob') W.registry.despawn(e.id);
  }
}
// Every seat is held by a (silent) human, so no AI casts: only partyCast does.
function stepHuman(W) {
  W.clock.stepOnce((t) => {
    const f = () => seatInputOf([frameFromSnapshot(emptySnapshot(), { seq: t, tick: t, viewTick: t })]);
    W.world.step(t, emptySnapshot(), { seats: { 1: f(), 2: f(), 3: f() }, reasons: {}, player: 'human', rewind: null });
  });
}
// `hurt`: Sable is held at that health each tick instead of mended (so the
// Night Hunger sips can be read off one at a time).
function steps(W, n, { hurt = null } = {}) {
  for (let i = 0; i < n; i++) {
    quiet(W);
    stepHuman(W);
    for (const p of party(W)) p.hp = p.maxHp;
    if (hurt !== null) ally(W, 3).hp = hurt;
  }
}
function spawnAt(W, pts, hp = 5000) {
  return pts.map(([x, z]) => {
    const d = W.registry.byId(cmd(W, 'spawn', 'dummy', x, z));
    d.hp = d.maxHp = hp;
    return d;
  });
}
function park(W, x, z) {
  const r = ally(W, 3);
  r.x = r.px = x;
  r.z = r.pz = z;
  r.faceX = 1;
  r.faceZ = 0;
  r.cds = [0, 0, 0, 0];
  return r;
}
const clearDummies = (W) => W.registry.all().filter((e) => e.kind === 'dummy' || (e.kind === 'azone' && e.classId === 'duskwing')).forEach((e) => W.registry.despawn(e.id));

// ---------------------------------------------------------- 1. data / gate --
{
  check(same(C.CLASS_SKILLS.duskwing, ALL) && ALL.every((id) => SKILLS[id] && SKILLS[id].cls === 'duskwing'), 'eleven skills, all his');
  check(ALL.every((id) => C.CAMPAIGN_ONLY_SKILLS.includes(id)) && C.gatedPool(ALL, false).length === 0, 'all eleven are campaign-only');
  check(same([...C.AI_PRIORITY.duskwing].sort(), [...ALL].sort()), 'his AI order ranks all eleven');
  check(same(C.CLASS_NODES.duskwing, NODE_IDS) && NODE_IDS.every((id) => NODES[id] && NODES[id].cls === 'duskwing' && NODES[id].kind === 'technique'), 'eight class nodes, all his');
  check(NODE_IDS.filter((id) => NODES[id].rarity === 'rare').join(',') === 'vampire,eclipse', 'Vampire and Eclipse are the rare two');
  check(NODE_IDS.every((id) => C.CAMPAIGN_ONLY_NODES.includes(id)) && C.gatedPool(NODE_IDS, false).length === 0, 'all eight are campaign-only');
  // The gatedPool gotcha: no id of his may equal any other skill or node id.
  const others = [...Object.keys(SKILLS).filter((id) => SKILLS[id].cls !== 'duskwing'), ...Object.keys(NODES).filter((id) => NODES[id].cls !== 'duskwing')];
  check(![...ALL, ...NODE_IDS].some((id) => others.includes(id)), 'no id of his equals another skill or node id');
  check(C.nodePoolOf('duskwing').length === 20, `his node pool: 12 shared + 8 (${C.nodePoolOf('duskwing').length})`);
  const abbrevs = Object.values(SKILLS).map((s) => s.abbrev);
  check(NEW.every((id) => abbrevs.filter((a) => a === SKILLS[id].abbrev).length === 1), `each new skill has its own medallion (${NEW.map((id) => SKILLS[id].abbrev).join(',')})`);
  const CARDS = await import(u('src/ui/run/cards.js'));
  check(NEW.every((id) => CARDS.SKILL_BODY[id]) && NODE_IDS.every((id) => CARDS.NODE_EFFECT[id] && CARDS.NODE_EFFECT_SHORT[id] && CARDS.NODE_GLYPH[id]), 'every new skill and node has its card text and glyph');
  const ICONS = await import(u('src/ui/hud/icons.js'));
  check([...NEW, ...NODE_IDS].every((id) => ICONS.hasIcon(id)), 'every new skill and node has a drawn icon');
  const lines = [...NEW.map((id) => SKILLS[id].name), ...NEW.map((id) => SKILLS[id].abbrev), ...NEW.map((id) => CARDS.SKILL_BODY[id]), ...NODE_IDS.map((id) => NODES[id].name), ...NODE_IDS.map((id) => CARDS.NODE_EFFECT[id]), ...NODE_IDS.map((id) => CARDS.NODE_EFFECT_SHORT[id])];
  const miss = [];
  for (const l of ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'pt-BR', 'fr', 'de', 'ru']) {
    const tb = JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'));
    for (const k of lines) if (!k || !tb[k]) miss.push(`${l}: ${String(k).slice(0, 30)}`);
  }
  check(miss.length === 0, `${lines.length} new lines translated in nine languages${miss.length ? ` (missing ${miss.length}: ${miss.slice(0, 4).join('; ')})` : ''}`);
}

// ------------------------------------------------------------- 2. verdicts --
{
  const ACTIVES = ALL.filter((id) => !PASSIVES.includes(id));
  const SWINGS = ['dusk_dive', 'blood_bite', 'nightfall', 'echo_screech', 'talon_rake', 'shadow_veil', 'blood_moon'];
  const want = {
    deep_dive: ['dusk_dive', 'flit'],
    thirst: ALL,
    vampire: ALL,
    gloom: ['dusk_dive', 'blood_bite', 'echo_screech', 'talon_rake', 'bat_swarm', 'shadow_veil'],
    echolocate: ACTIVES.filter((id) => id !== 'echo_screech'),
    ambush: ACTIVES,
    frenzy: SWINGS,
    eclipse: SWINGS,
  };
  for (const n of NODE_IDS) {
    const live = ALL.filter((id) => classVerdict(SKILLS[id], n).state === 'live');
    check(same([...live].sort(), [...want[n]].sort()), `${n} works on ${want[n].length} of his skills (${live.join(',')})`);
  }
  check(classVerdict(SKILLS.nightfall, 'gloom').state === 'inert', 'Gloom is inert on Nightfall (it blinds already)');
}

// ------------------------------------------------------- 3. the seven skills --
let W = campaign(4);
const T = () => W.clock.tick;
const since = (from, type, f = () => true) => W.log.slice(from).filter((e) => e.type === type && f(e));
const live = (e, k) => STATUS.magnitude(e, k, T());
const castK = (k, x, z) => cmd(W, 'partyCast', 3, k, { x, z });
const sipsOf = (from) => since(from, 'heal', (e) => e.source === 'night_hunger');
{
  // Echo Screech: a 70° cone 2.6 u out; what it reaches is marked +25%.
  check(room(W, ['echo_screech']), 'Echo Screech on his first key');
  steps(W, 2);
  park(W, -1.5, 0);
  const [a, b, behind] = spawnAt(W, [[0.5, 0.3], [0.8, -0.4], [-3, 0]]);
  const from = W.log.length;
  castK(0, 0.5, 0);
  const hits = since(from, 'hit', (e) => e.source === 'echo_screech');
  check(hits.length === 2 && !hits.some((h) => h.target === behind.id), `the cone reaches the two in front, 2 u out (${hits.length})`);
  steps(W, 2);
  check(near(live(a, 'exposed'), 0.25, 1e-6) && near(live(b, 'exposed'), 0.25, 1e-6) && !(live(behind, 'exposed') > 0), `and marks them +25% (${live(a, 'exposed')})`);
  clearDummies(W);
}
{
  // Talon Rake: a 150° rake 1.2 u out, knocking back.
  check(room(W, ['talon_rake']), 'Talon Rake on his first key');
  steps(W, 2);
  park(W, -0.5, 0);
  spawnAt(W, [[0.4, 0], [-0.1, 0.8], [-2.4, 0]]);
  const from = W.log.length;
  castK(0, 0.5, 0);
  const hits = since(from, 'hit', (e) => e.source === 'talon_rake');
  check(hits.length === 2 && hits.every((h) => h.kb > 0) && hits.filter((h) => !h.crit).every((h) => near(h.amount, 15, 0.8)), `the rake strikes the two round his front for 15, pushed (${hits.map((h) => h.amount).join(',')})`);
  clearDummies(W);
}
{
  // Bat Swarm: a 4 s cloud at the target, 5 a second, slows 20%, and each
  // nibble feeds him 8% + 25%.
  check(room(W, ['bat_swarm']), 'Bat Swarm on his first key');
  steps(W, 2);
  park(W, -2, 0);
  const [d] = spawnAt(W, [[1.0, 0]]);
  const from = W.log.length;
  castK(0, 1.0, 0);
  steps(W, 1, { hurt: 40 });
  const sp = since(from, 'azone_spawn', (e) => e.skill === 'bat_swarm')[0];
  check(!!sp && sp.radius === 1.3 && sp.totalTicks === 4, `a swarm of bats at the target (ring ${sp && sp.radius}, ${sp && sp.totalTicks} beats)`);
  steps(W, 62, { hurt: 40 });
  const hits = since(from, 'hit', (e) => e.source === 'bat_swarm');
  const sips = sipsOf(from);
  check(hits.length === 1 && near(live(d, 'slow'), 0.2, 1e-6), `it nibbles and slows 20% (${hits.map((h) => h.amount).join(',')}, slow ${live(d, 'slow')})`);
  check(sips.length === 1 && near(sips[0].amount, hits[0].amount * 0.33, 0.02), `and feeds him a third of it (${sips.map((s) => s.amount).join(',')} of ${hits[0] && hits[0].amount})`);
  clearDummies(W);
}
{
  // Shadow Veil: an 18 shield on him for 3 s, 8 to what is close.
  check(room(W, ['shadow_veil']), 'Shadow Veil on his first key');
  steps(W, 2);
  const sable = park(W, 0, 0);
  spawnAt(W, [[0.8, 0], [-0.6, 0.6], [2.5, 0]]);
  const from = W.log.length;
  castK(0, 1, 0);
  const hits = since(from, 'hit', (e) => e.source === 'shadow_veil');
  check(near(live(sable, 'shield'), 18, 1e-6) && sable.status.shield.untilTick - T() === 180, `an 18 shield on him for 3 s (${live(sable, 'shield')})`);
  check(hits.length === 2, `and its edge cuts the two close by (${hits.length})`);
  clearDummies(W);
}
{
  // Flit: 2.8 u away from the aim, untouchable; the dark left where he was
  // blinds what follows him into it.
  check(room(W, ['flit']), 'Flit on his first key');
  steps(W, 2);
  const sable = park(W, 0, 0);
  const [d] = spawnAt(W, [[0.4, 0]]);
  const from = W.log.length;
  castK(0, 1, 0);
  const dash = since(from, 'ally_dash', (e) => e.skill === 'flit')[0];
  steps(W, 20);
  const sp = since(from, 'azone_spawn', (e) => e.skill === 'flit')[0];
  check(!!dash && dash.cause === 'vault' && near(Math.hypot(dash.x1 - dash.x0, dash.z1 - dash.z0), 2.8, 0.05) && sable.x < -2.4, `he flits 2.8 u away from the aim (to x ${sable.x.toFixed(2)})`);
  check(!!sp && Math.hypot(sp.x, sp.z) < 0.05, `the dark is left where he was (${sp && `${sp.x},${sp.z}`})`);
  steps(W, 60);
  check(STATUS.isBlinded(d, T()) && since(from, 'hit', (e) => e.source === 'flit').length === 1, 'and it blinds the one he left in it');
  clearDummies(W);
}
{
  // Blood Scent: each second the 2 nearest within 2.6 u take 2 and are marked.
  W = campaign(5); // a fresh run: a later room of the first is the shop
  check(room(W, ['blood_scent', 'talon_rake']), 'Blood Scent on his first key');
  steps(W, 2);
  park(W, 0, 0);
  const ds = spawnAt(W, [[1.0, 0], [-1.2, 0.5], [1.6, 1.4], [4, 0]]);
  const from = W.log.length;
  steps(W, 64);
  const pulses = since(from, 'aura_pulse', (e) => e.skill === 'blood_scent');
  check(pulses.length >= 1 && pulses.every((p) => p.hit.length === 2) && !pulses.some((p) => p.hit.includes(ds[3].id)), `it pulses on the 2 nearest within 2.6 u (${pulses.length} pulses)`);
  check(near(live(ds[0], 'exposed'), 0.15, 1e-6) && !(live(ds[3], 'exposed') > 0), `and marks them +15% (${live(ds[0], 'exposed')})`);
  clearDummies(W);
}
{
  // Blood Moon: 30 to up to 10 within 2.4 u, a 1.5 s blind, and 43% fed back.
  W = campaign(6);
  check(room(W, ['blood_moon']), 'Blood Moon on his first key');
  steps(W, 2);
  const sable = park(W, 0, 0);
  const ds = spawnAt(W, [[1, 0], [-1, 0], [0, 1.6], [0, -1.6], [1.4, 1.2], [3.5, 0]]);
  sable.hp = 5;
  const from = W.log.length;
  castK(0, 1, 0);
  const hits = since(from, 'hit', (e) => e.source === 'blood_moon');
  check(hits.length === 5 && hits.filter((h) => !h.crit).every((h) => near(h.amount, 30, 1.5)), `30 to the five within 2.4 u (${hits.map((h) => h.amount).join(',')})`);
  check(ds.slice(0, 5).every((d) => STATUS.isBlinded(d, T()) && d.status.blind.untilTick - T() === 90) && !STATUS.isBlinded(ds[5], T()), 'a 1.5 s blind on each');
  const fed = sipsOf(from).reduce((s, e) => s + e.amount, 0);
  const dealt = hits.reduce((s, e) => s + e.amount, 0);
  check(fed > 0 && Math.abs(fed - dealt * 0.43) < C.CLASS_TECH.drainSip + 0.05, `and 43% of it comes back to him (${fed.toFixed(1)} of ${dealt.toFixed(1)})`);
  clearDummies(W);
}

// --------------------------------------------------------------- 4. nodes --
function nodeRoom(seed, ids, nodes) {
  W = campaign(seed);
  const ok = room(W, ids, nodes);
  steps(W, 2);
  return ok;
}
{
  // Deep Dive x2: the dive runs 3.6 + 1.6 u.
  nodeRoom(11, ['dusk_dive'], { dusk_dive: ['deep_dive', 'deep_dive'] });
  park(W, -4, 0);
  const from = W.log.length;
  castK(0, 4.5, 0);
  const dash = since(from, 'ally_dash', (e) => e.skill === 'dusk_dive')[0];
  check(!!dash && near(Math.hypot(dash.x1 - dash.x0, dash.z1 - dash.z0), 5.2, 0.05), `Deep Dive x2: the dive runs 5.2 u (${dash && Math.hypot(dash.x1 - dash.x0, dash.z1 - dash.z0).toFixed(2)})`);
}
{
  // Thirst: the rake feeds him 8% + 15%.
  nodeRoom(12, ['talon_rake'], { talon_rake: ['thirst'] });
  park(W, -0.5, 0);
  spawnAt(W, [[0.4, 0]]);
  ally(W, 3).hp = 40;
  const from = W.log.length;
  castK(0, 0.5, 0);
  const h = since(from, 'hit', (e) => e.source === 'talon_rake')[0];
  const s = sipsOf(from)[0];
  check(!!h && !!s && near(s.amount, h.amount * 0.23, 0.02), `Thirst: the rake feeds him 23% (${s && s.amount} of ${h && h.amount})`);
}
{
  // Gloom and Echolocate: the rake blinds 1 s and marks +15%.
  nodeRoom(13, ['talon_rake'], { talon_rake: ['gloom', 'echolocate'] });
  park(W, -0.5, 0);
  const [d] = spawnAt(W, [[0.4, 0]]);
  castK(0, 0.5, 0);
  steps(W, 1);
  check(STATUS.isBlinded(d, T()) && [59, 60].includes(d.status.blind.untilTick - T()), `Gloom: the rake blinds 1 s (${d.status.blind && d.status.blind.untilTick - T()} ticks left)`);
  check(near(live(d, 'exposed'), 0.15, 1e-6), `Echolocate: and marks +15% (${live(d, 'exposed')})`);
}
{
  // Gloom on the Bat Swarm: the zone blinds too.
  nodeRoom(14, ['bat_swarm'], { bat_swarm: ['gloom'] });
  park(W, -2, 0);
  const [d] = spawnAt(W, [[1, 0]]);
  castK(0, 1, 0);
  steps(W, 62);
  check(STATUS.isBlinded(d, T()) && near(live(d, 'slow'), 0.2, 1e-6), 'Gloom on Bat Swarm: the zone blinds as well as slows');
}
{
  // Ambush: Bloodbite lands +40% on a blinded enemy.
  nodeRoom(15, ['blood_bite'], { blood_bite: ['ambush'] });
  park(W, -0.5, 0);
  const [a, b] = spawnAt(W, [[0.35, 0.2], [0.35, -0.2]]);
  STATUS.apply(a, 'blind', 1, 120, T(), null);
  const from = W.log.length;
  castK(0, 0.5, 0);
  const hits = since(from, 'hit', (e) => e.source === 'blood_bite' && !e.crit);
  const ha = hits.find((h) => h.target === a.id);
  const hb = hits.find((h) => h.target === b.id);
  check(!!ha && !!hb && near(ha.amount / hb.amount, 1.4, 0.05), `Ambush: +40% on the blinded one (${ha && ha.amount} vs ${hb && hb.amount})`);
}
{
  // Frenzy: the rake on three makes him 25% faster for 2 s.
  nodeRoom(16, ['talon_rake'], { talon_rake: ['frenzy'] });
  const sable = park(W, -0.5, 0);
  spawnAt(W, [[0.4, 0], [0.1, 0.6], [0.1, -0.6]]);
  const from = W.log.length;
  castK(0, 0.5, 0);
  check(near(live(sable, 'haste'), 0.25, 1e-6) && since(from, 'dusk_frenzy').length === 1, `Frenzy: three hit, 25% faster (${live(sable, 'haste')})`);
  clearDummies(W);
  sable.status.haste = null;
  sable.cds = [0, 0, 0, 0];
  spawnAt(W, [[0.4, 0], [0.1, 0.6]]);
  castK(0, 0.5, 0);
  check(!(live(sable, 'haste') > 0), 'two hit: no Frenzy');
}
{
  // Vampire: the feed doubles while hurt, and gathers as a shield at full.
  nodeRoom(17, ['talon_rake'], { talon_rake: ['vampire'] });
  const sable = park(W, -0.5, 0);
  spawnAt(W, [[0.4, 0]]);
  sable.hp = 40;
  const from = W.log.length;
  castK(0, 0.5, 0);
  const h = since(from, 'hit', (e) => e.source === 'talon_rake')[0];
  const s = sipsOf(from)[0];
  check(!!h && !!s && near(s.amount, h.amount * 0.16, 0.02), `Vampire: the feed doubles to 16% (${s && s.amount} of ${h && h.amount})`);
  sable.hp = sable.maxHp;
  sable.cds = [0, 0, 0, 0];
  const f2 = W.log.length;
  castK(0, 0.5, 0);
  const h2 = since(f2, 'hit', (e) => e.source === 'talon_rake')[0];
  check(!!h2 && near(live(sable, 'shield'), Math.min(15, h2.amount * 0.16), 0.02) && since(f2, 'dusk_vampire').length === 1, `at full health it gathers as a shield (${live(sable, 'shield')})`);
}
{
  // Eclipse: a dummy the rake fells bursts into dark round it.
  nodeRoom(18, ['talon_rake'], { talon_rake: ['eclipse'] });
  park(W, -0.5, 0);
  const [weak] = spawnAt(W, [[0.4, 0]], 5);
  const [by, far] = spawnAt(W, [[1.4, 0.4], [3.6, 0]]);
  const from = W.log.length;
  castK(0, 0.5, 0);
  const ec = since(from, 'dusk_eclipse')[0];
  check(!!ec && ec.target === weak.id && ec.hit.includes(by.id) && !ec.hit.includes(far.id) && STATUS.isBlinded(by, T()), `Eclipse: the fallen one blinds the one beside it (${ec && ec.hit.length})`);
}

// --------------------------------------------- 5. the AI seat plays it all --
{
  const W2 = campaign(7);
  const loadouts = [['dusk_dive', 'blood_bite', 'nightfall', 'blood_moon'], ['talon_rake', 'echo_screech', 'bat_swarm', 'shadow_veil'], ['flit', 'blood_bite', 'blood_scent', 'night_wings']];
  const castBy = new Set();
  for (const lo of loadouts) {
    room(W2, lo);
    cmd(W2, 'partyMode', 'auto');
    const h = W2.world.player;
    for (const [dx, dz] of [[2.5, 1], [3, 0], [2.6, -1], [-2.5, 1.2], [-3, -0.5], [0.5, 3], [0.9, 2.6], [1.4, 2.2]]) cmd(W2, 'spawn', 'boar', h.x + dx, h.z + dz, { hpMul: 6 });
    const sable = ally(W2, 3);
    if (sable) for (const dx of [0.5, -0.5]) cmd(W2, 'spawn', 'boar', sable.x + dx, sable.z + 0.3, { hpMul: 6 });
    const from = W2.log.length;
    for (let i = 0; i < 1800; i++) {
      W2.step();
      for (const p of party(W2)) if (p.classId !== 'duskwing') p.hp = p.maxHp;
      // The third loadout is his way out: hold him low, so Flit has a reason.
      const s = ally(W2, 3);
      if (lo[0] === 'flit') s.hp = Math.min(s.hp, s.maxHp * 0.3);
      else s.hp = s.maxHp;
      if (W2.run.view().phase !== 'combat') break;
    }
    for (const e of W2.log.slice(from)) if (e.type === 'ally_cast' && e.partyIndex === 3 && !e.echo) castBy.add(e.skill);
  }
  const actives = ALL.filter((id) => !PASSIVES.includes(id));
  const missing = actives.filter((id) => !castBy.has(id));
  check(missing.length === 0, `the AI casts every one of his nine actives (${missing.length ? `missing ${missing.join(',')}` : 'all nine'})`);
}
{
  // Pulling out: low on health he stops diving, steps back off the pack, and
  // comes back in once fed over 60%.
  const W2 = campaign(8);
  room(W2, ['dusk_dive', 'blood_bite', 'talon_rake', 'nightfall']);
  cmd(W2, 'partyMode', 'auto');
  const sable = ally(W2, 3);
  for (const [dx, dz] of [[1.2, 0], [1.0, 0.8], [1.4, -0.7], [2.6, 0.3]]) cmd(W2, 'spawn', 'boar', sable.x + dx, sable.z + dz, { hpMul: 30 });
  for (let i = 0; i < 90; i++) {
    W2.step();
    for (const p of party(W2)) p.hp = p.maxHp;
  }
  const from = W2.log.length;
  const gaps = [];
  let lowTicks = 0;
  for (let i = 0; i < 360; i++) {
    W2.step();
    for (const p of party(W2)) if (p.classId !== 'duskwing') p.hp = p.maxHp;
    sable.hp = Math.min(sable.hp, sable.maxHp * 0.25);
    const hs = W2.registry.all().filter((e) => e.faction === 'hostile' && e.hp > 0);
    const nd = Math.min(...hs.map((e) => Math.hypot(e.x - sable.x, e.z - sable.z)));
    if (i >= 120) gaps.push(nd);
    lowTicks += 1;
  }
  const outs = W2.log.slice(from).filter((e) => e.type === 'dusk_pull_out' && e.id === sable.id);
  const dives = W2.log.slice(from).filter((e) => e.type === 'ally_dash' && e.skill === 'dusk_dive' && e.id === sable.id);
  const mean = gaps.reduce((s, x) => s + x, 0) / Math.max(1, gaps.length);
  check(outs.length === 1 && sable.duskPullOut === true, `below 35% he pulls out (${outs.length} pull-out over ${lowTicks} low ticks)`);
  check(dives.length === 0, `and dives no more while low (${dives.length} dives)`);
  check(mean > 1.6, `he keeps off the pack (mean gap to the nearest enemy ${mean.toFixed(2)} u)`);
  const f2 = W2.log.length;
  sable.hp = sable.maxHp * 0.62;
  for (let i = 0; i < 30; i++) {
    W2.step();
    for (const p of party(W2)) p.hp = p.maxHp;
  }
  check(W2.log.slice(f2).some((e) => e.type === 'dusk_back_in' && e.id === sable.id) && !sable.duskPullOut, 'fed back over 60%, he goes back in');
}

// ------------------------------------------------------------- 6. save --
{
  const W3 = campaign(9);
  room(W3, ['dusk_dive', 'talon_rake', 'bat_swarm', 'blood_moon'], { dusk_dive: ['deep_dive'], talon_rake: ['vampire', 'gloom'], bat_swarm: ['ambush'], blood_moon: ['eclipse'] });
  cmd(W3, 'partyMode', 'auto');
  const h = W3.world.player;
  for (const [dx, dz] of [[1.5, 1], [2, 0], [1.6, -1], [-1.5, 1.2]]) cmd(W3, 'spawn', 'boar', h.x + dx, h.z + dz, { hpMul: 6 });
  for (let i = 0; i < 300; i++) W3.step();
  const sable = ally(W3, 3);
  check(W3.log.some((e) => e.type === 'ally_cast' && e.partyIndex === 3), `the save is taken mid-fight with his nodes socketed (${sable.hp.toFixed(0)} HP)`);
  const snap = clonePlain(W3.io.capture());
  for (let i = 0; i < 400; i++) W3.step();
  const h1 = hashState(W3.io.capture());
  const W4 = makeWorld(9);
  check(W4.io.apply(clonePlain(snap)).ok, 'the save applies');
  for (let i = 0; i < 400; i++) W4.step();
  const h2 = hashState(W4.io.capture());
  check(h1 === h2, `a mid-fight save with his kit continues bit-identically (${h1} / ${h2})`);
}

console.log(`\n${passes.length}/${passes.length + fails.length} checks passed`);
process.exit(fails.length ? 1 : 0);
