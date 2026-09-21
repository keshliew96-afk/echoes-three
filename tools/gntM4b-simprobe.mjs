#!/usr/bin/env node
// M4b headless sim probe (docs/gauntlet/PLAN.md §7 G4b.1-G4b.3, G4b.6, G4b.8):
// builds the world exactly like main.js (no browser), sets each scenario up
// with the §6.4 deterministic commands and MEASURES the BUILD_BRIEF §23.5-§23.7
// numbers off sim state and events. Prints one JSON report; exit 1 on any FAIL.
//   node tools/gntM4b-simprobe.mjs [--only name] [--verbose]
import { createGameplayRng } from '../src/core/rng.js';
import { createRegistry } from '../src/core/registry.js';
import { createEventBus } from '../src/core/events.js';
import { createClock } from '../src/core/clock.js';
import { createWorld } from '../src/sim/world.js';
import { emptySnapshot } from '../src/core/intents.js';
import { canonicalJSON } from '../src/core/canonical.js';
import { setStaticColliders } from '../src/sim/movement.js';
import { apply as statusApply } from '../src/sim/status.js';

const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
const verbose = argv.includes('--verbose');

function makeWorld({ seed = 3, room = null } = {}) {
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
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  setStaticColliders(null);
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room });
  const evs = [];
  bus.on('*', (e) => {
    if (e.type !== 'sound') evs.push(e);
  });
  let snapFn = () => emptySnapshot();
  function snapFnWrap(t) {
    const s = snapFn(t);
    if (pressNext > 0) {
      pressNext -= 1;
      s.presses = [...(s.presses || []), { kind: 'interact' }];
    }
    return s;
  }
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      let stepped = false;
      for (let g = 0; g < 16 && !stepped; g++) stepped = clock.stepOnce((t) => world.step(t, snapFnWrap(t)));
    }
  };
  const ent = (id) => registry.byId(id);
  // Park the three allies far away (and alive) so a probe is one-on-one.
  // parkAllies(): one-on-one probes REMOVE the three ally bodies (their AI
  // leashes to the player and would join the fight); parkAllies(x, z, true)
  // keeps them, parked, for the party-wide checks (dewfont, double use).
  const parkAllies = (x = 11, z = 7.4, keep = false) => {
    for (const a of registry.all().filter((e) => e.kind === 'ally')) {
      if (!keep) {
        registry.despawn(a.id);
        continue;
      }
      world.cmd('placeAlly', a.partyIndex, x, z);
      a.hp = a.maxHp;
    }
  };
  let pressNext = 0;
  const pressOnce = () => {
    pressNext += 1;
  };
  const baseInput = snapFnWrap;
  void baseInput;
  return {
    world,
    registry,
    bus,
    clock,
    evs,
    step,
    ent,
    parkAllies,
    pressOnce,
    setInput: (fn) => (snapFn = fn),
    tick: () => clock.tick,
  };
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  if (verbose || !ok) console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail)}`);
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const ev = (W, type, pred = () => true) => W.evs.filter((e) => e.type === type && pred(e));

// Freeze allies' AI so they stand still: move them out and keep topping them up.
function lockAllies(W) {
  const allies = W.registry.all().filter((e) => e.kind === 'ally');
  for (const a of allies) a.hp = a.maxHp;
}

const scenarios = {
  // ---------------------------------------------------------------- enemies
  quillback() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', 0, 0);
    const id = W.world.cmd('spawn', 'quillback', -4.5, 0);
    const e = W.ent(id);
    check('quillback.stats', e.hp === 26 && e.radius === 0.38, { hp: e.hp, radius: e.radius });
    let tele = null;
    for (let i = 0; i < 400 && !tele; i++) {
      W.step(1);
      if (e.telegraph) tele = { ...e.telegraph, tick: W.tick() };
    }
    check('quillback.telegraph', tele && tele.kind === 'lane' && tele.resolveTick - tele.startTick === 48 && near(tele.width, 0.7, 1e-9), tele && { dur: tele.resolveTick - tele.startTick, width: tele.width, length: tele.length });
    // Charge speed: displacement per tick while charging.
    while (e.mode !== 'charge' && W.tick() < 900) W.step(1);
    const x0 = e.x;
    const z0 = e.z;
    W.step(5);
    const v = (Math.hypot(e.x - x0, e.z - z0) / 5) * 60;
    check('quillback.chargeSpeed', near(v, 6.0, 0.05), { uPerSec: +v.toFixed(3) });
    W.step(60);
    const hits = ev(W, 'hit', (h) => h.attacker === id);
    check('quillback.contactDamage', hits.length === 1 && near(hits[0].amount, 12, 1e-9) | near(hits[0].amount, 18, 1e-9), { hits: hits.map((h) => h.amount) });
    const ends = ev(W, 'enemy_charge_end', (x) => x.id === id);
    check('quillback.chargeEnds', ends.length >= 1, { ends: ends.map((x) => x.cause) });
  },
  quillbackWallStagger() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', -10.6, 0);
    const id = W.world.cmd('spawn', 'quillback', -7.0, 0);
    const e = W.ent(id);
    while (e.mode !== 'charge' && W.tick() < 900) W.step(1);
    let stagger = null;
    for (let i = 0; i < 80 && !stagger; i++) {
      W.step(1);
      if (e.mode === 'stagger') stagger = { tick: W.tick(), until: e.staggerUntilTick };
    }
    check('quillback.wallStagger30', stagger && stagger.until - stagger.tick === 30 - 0, stagger);
  },
  toad() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', 0, 0);
    const id = W.world.cmd('spawn', 'toad', -8, 0);
    const e = W.ent(id);
    check('toad.stats', e.hp === 34 && e.radius === 0.42, { hp: e.hp });
    let glob = null;
    for (let i = 0; i < 600 && !glob; i++) {
      W.step(1);
      glob = W.registry.all().find((g) => g.kind === 'eglob') ?? null;
    }
    const d = Math.hypot(e.x, e.z);
    check('toad.keepsBand', d >= 2.9 && d <= 6.3, { d: +d.toFixed(2) });
    const t = glob && glob.telegraph;
    check('toad.globRing', t && t.kind === 'ring' && t.resolveTick - t.startTick === 60 && near(t.radius, 0.9, 1e-9), t && { dur: t.resolveTick - t.startTick, r: t.radius });
    // stand on the landing point to eat it, then read the slow
    const gid = glob.id;
    W.world.cmd('teleport', glob.tx, glob.tz);
    while (W.ent(gid)) W.step(1);
    const hits = ev(W, 'hit', (h) => h.shape === 'ring' && h.target === W.world.player.id);
    check('toad.globDamage12', hits.length === 1 && near(hits[0].amount, 12, 1e-9) | near(hits[0].amount, 18, 1e-9), { amounts: hits.map((h) => h.amount) });
    const slick = W.registry.all().find((s) => s.kind === 'slick');
    check('toad.slick', slick && slick.untilTick - slick.startTick === 180 && near(slick.radius, 0.9, 1e-9), slick && { dur: slick.untilTick - slick.startTick });
    W.step(2);
    const s = W.world.player.status && W.world.player.status.slow;
    check('toad.slickSlows30', s && near(s.mag, 0.3, 1e-9), { slow: s ? s.mag : null });
    // measured walk speed inside the slick (M4a applies speedMul to the walk)
    W.world.cmd('teleport', slick.x - 0.3, slick.z);
    W.setInput(() => ({ ...emptySnapshot(), move: { x: 1, z: 0 } }));
    const px = W.world.player.x;
    W.step(10);
    const vx = ((W.world.player.x - px) / 10) * 60;
    W.setInput(() => emptySnapshot());
    check('toad.slickMeasuredWalk', near(vx, 2.4 * 0.7, 0.03), { uPerSec: +vx.toFixed(3), expected: 1.68 });
  },
  moth() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', 0, 0);
    const id = W.world.cmd('spawn', 'moth', -6, 2);
    const e = W.ent(id);
    check('moth.stats', e.hp === 16 && e.flier === true, { hp: e.hp, flier: e.flier });
    let tele = null;
    for (let i = 0; i < 600 && !tele; i++) {
      W.step(1);
      if (e.telegraph) tele = { ...e.telegraph };
    }
    check('moth.swoopLane', tele && tele.kind === 'lane' && tele.resolveTick - tele.startTick === 45 && near(tele.width, 0.8, 1e-9) && tele.length <= 5.5 + 1e-9, tele && { dur: tele.resolveTick - tele.startTick, len: +tele.length.toFixed(2) });
    while (e.mode !== 'swoop' && W.tick() < 1500) W.step(1);
    const x0 = e.x;
    const z0 = e.z;
    W.step(4);
    const v = (Math.hypot(e.x - x0, e.z - z0) / 4) * 60;
    check('moth.swoopSpeed8', near(v, 8.0, 0.05), { uPerSec: +v.toFixed(3) });
    W.step(40);
    const hits = ev(W, 'hit', (h) => h.attacker === id);
    check('moth.swoopDamage9', hits.length === 1 && near(hits[0].amount, 9, 1e-9) | near(hits[0].amount, 13.5, 1e-9), { amounts: hits.map((h) => h.amount) });
  },
  ramGuard() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', 0, 0);
    const id = W.world.cmd('spawn', 'ram', 3, 0);
    const e = W.ent(id);
    W.step(80); // it turns to face the player
    check('ram.stats', e.hp === 90 && e.guard && e.guard.halfArcDeg === 55, { hp: e.hp, guard: e.guard });
    // A basic bolt from the front (player shooting +x into its horns).
    W.setInput((t) => ({ ...emptySnapshot(), aim: { x: e.x, z: e.z }, basicAttackHeld: true }));
    W.step(40);
    W.setInput(() => emptySnapshot());
    const blocked = ev(W, 'hit_blocked', (h) => h.targetId === id);
    const hitsFront = ev(W, 'hit', (h) => h.target === id);
    check('ram.frontBlocked', blocked.length >= 1 && hitsFront.length === 0, { blocked: blocked.length, hits: hitsFront.length });
    // From behind: move the player behind the ram and shoot.
    const W2 = makeWorld();
    W2.parkAllies(11, 7.4);
    const id2 = W2.world.cmd('spawn', 'ram', 3, 0);
    const r2e = W2.ent(id2);
    W2.world.cmd('teleport', 0, 0);
    W2.step(80);
    W2.world.cmd('teleport', r2e.x + 2.2, r2e.z); // behind it (it faces -x)
    r2e.faceX = -1;
    r2e.faceZ = 0;
    r2e.guard.dirX = -1;
    r2e.guard.dirZ = 0;
    statusApply(r2e, 'stun', 1, 60, W2.tick()); // pinned: it cannot turn to face the shooter
    W2.setInput(() => ({ ...emptySnapshot(), aim: { x: r2e.x, z: r2e.z }, basicAttackHeld: true }));
    W2.step(40);
    const hitsBack = ev(W2, 'hit', (h) => h.target === id2);
    check('ram.backHits', hitsBack.length >= 1, { hits: hitsBack.length, blocked: ev(W2, 'hit_blocked').length });
    // Turn rate: 90 deg/s.
    const W3 = makeWorld();
    W3.parkAllies(11, 7.4);
    W3.world.cmd('teleport', 0, 0);
    const id3 = W3.world.cmd('spawn', 'ram', 4, 0);
    const r3 = W3.ent(id3);
    r3.faceX = 1;
    r3.faceZ = 0; // facing away from the player (who is at -x)
    const a0 = Math.atan2(r3.faceX, r3.faceZ);
    W3.step(30);
    const a1 = Math.atan2(r3.faceX, r3.faceZ);
    let da = Math.abs(a1 - a0);
    if (da > Math.PI) da = 2 * Math.PI - da;
    check('ram.turnRate90', near((da * 180) / Math.PI / 0.5, 90, 1.5), { degPerSec: +((da * 180) / Math.PI / 0.5).toFixed(2) });
  },
  ramSlam() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', 0, 0);
    const id = W.world.cmd('spawn', 'ram', 2.5, 0);
    const e = W.ent(id);
    let tele = null;
    for (let i = 0; i < 400 && !tele; i++) {
      W.step(1);
      if (e.telegraph) tele = { ...e.telegraph };
    }
    check('ram.slamCone', tele && tele.kind === 'cone' && tele.resolveTick - tele.startTick === 60 && tele.radius === 1.8 && tele.halfAngleDeg === 50, tele && { dur: tele.resolveTick - tele.startTick });
    W.step(62);
    const hits = ev(W, 'hit', (h) => h.attacker === id);
    check('ram.slamDamage18', hits.length === 1 && near(hits[0].amount, 18, 1e-9) | near(hits[0].amount, 27, 1e-9), { amounts: hits.map((h) => h.amount) });
  },
  ramKnockback() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', -6, 0);
    const b = W.world.cmd('spawn', 'boar', 0, 3);
    const r = W.world.cmd('spawn', 'ram', 0, -3);
    const bx = W.ent(b);
    const rx = W.ent(r);
    rx.faceX = 0;
    rx.faceZ = 1; // facing away from a bolt fired from -x? guard only blocks projectiles; use hitOnce-like direct damage
    const b0 = { x: bx.x, z: bx.z };
    const r0 = { x: rx.x, z: rx.z };
    // one knockback impulse each, same delivery
    const combatHit = (t) => W.world.cmd('iframe', t, 0);
    void combatHit;
    bx.kbVx = 0.072;
    bx.kbVz = 0;
    bx.kbTicks = 10;
    rx.kbVx = 0.072;
    rx.kbVz = 0;
    rx.kbTicks = 10;
    W.step(12);
    const db = Math.abs(bx.x - b0.x);
    const dr = Math.abs(rx.x - r0.x);
    check('ram.knockbackX0.3', dr > 0 && near(dr / Math.max(1e-6, 0.72), 0.3, 0.06), { ramTravel: +dr.toFixed(3), boarTravel: +db.toFixed(3) });
  },
  mole() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', 0, 0);
    const id = W.world.cmd('spawn', 'mole', -6, 0);
    const e = W.ent(id);
    check('mole.spawnBurrowed', e.burrowed === true && e.hittable === false, { burrowed: e.burrowed, hittable: e.hittable });
    // A bolt aimed straight through it must not touch it.
    W.setInput(() => ({ ...emptySnapshot(), aim: { x: e.x, z: e.z }, basicAttackHeld: true }));
    W.step(20);
    W.setInput(() => emptySnapshot());
    check('mole.burrowedUntargetable', ev(W, 'hit', (h) => h.target === id).length === 0, {});
    let tele = null;
    for (let i = 0; i < 400 && !tele; i++) {
      W.step(1);
      if (e.telegraph) tele = { ...e.telegraph };
    }
    check('mole.emergeRing', tele && tele.kind === 'ring' && tele.resolveTick - tele.startTick === 60 && tele.radius === 0.8, tele && { dur: tele.resolveTick - tele.startTick, r: tele.radius });
    W.step(61);
    const hits = ev(W, 'hit', (h) => h.attacker === id);
    check('mole.bite11', hits.length === 1 && (near(hits[0].amount, 11, 1e-9) || near(hits[0].amount, 16.5, 1e-9)), { amounts: hits.map((h) => h.amount) });
    check('mole.surfacedHittable', e.mode === 'surfaced' && e.hittable === true, { mode: e.mode });
    const until = e.surfaceUntilTick - W.tick();
    check('mole.surface120', until >= 117 && until <= 120, { left: until });
    W.step(until + 2);
    check('mole.reburrows', e.burrowed === true && e.hittable === false, { mode: e.mode });
    // debug burrow(id, false)
    const r = W.world.cmd('burrow', id, false);
    W.step(1);
    check('cmd.burrow', r && r.burrowed === false && e.hittable === true, r);
  },
  elite() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    const out = {};
    for (const k of ['boar', 'mantis', 'quillback', 'toad', 'moth', 'ram', 'mole']) {
      const id = W.world.cmd('spawn', k, -6, 0, { elite: true });
      const e = W.ent(id);
      const base = W.ent(W.world.cmd('spawn', k, 6, 0));
      out[k] = { hpX: +(e.maxHp / base.maxHp).toFixed(3), dmgMul: e.dmgMul, scale: e.scale, rX: +(e.radius / base.radius).toFixed(3) };
    }
    const ok = Object.values(out).every((o) => near(o.hpX, 1.8, 1e-9) && near(o.dmgMul, 1.25, 1e-9) && o.scale === 1.2 && near(o.rX, 1.2, 1e-9));
    check('elite.modifier', ok, out);
    check('elite.event', ev(W, 'elite_spawn').length === 7, { n: ev(W, 'elite_spawn').length });
  },
  governor() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', 0, 0);
    const kinds = ['mantis', 'mantis', 'toad', 'quillback', 'moth', 'ram', 'mole', 'mantis'];
    kinds.forEach((k, i) => W.world.cmd('spawn', k, Math.cos(i) * 3.2, Math.sin(i) * 3.2));
    let maxLive = 0;
    const starts = [];
    for (let i = 0; i < 1200; i++) {
      W.step(1);
      const live = W.registry.all().filter((e) => e.telegraph && e.telegraph.playerTargeted).length;
      maxLive = Math.max(maxLive, live);
      W.world.player.hp = W.world.player.maxHp;
    }
    for (const e of ev(W, 'telegraph_start', (x) => x.playerTargeted)) starts.push(e.tick);
    starts.sort((a, b) => a - b);
    let minGap = Infinity;
    for (let i = 1; i < starts.length; i++) minGap = Math.min(minGap, starts[i] - starts[i - 1]);
    check('governor.cap2', maxLive <= 2, { maxLive, starts: starts.length });
    check('governor.stagger72', minGap >= 72, { minGap });
    // every telegraph >= 42 ticks
    const durs = ev(W, 'telegraph_start').map((e) => e.resolveTick - e.tick);
    check('telegraph.minDuration42', durs.length > 0 && Math.min(...durs) >= 42, { min: Math.min(...durs), n: durs.length });
  },
  stunGate() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', 0, 0);
    const id = W.world.cmd('spawn', 'mantis', -3, 0);
    const bell = W.world.cmd('spawnInteractable', 'bell', -0.6, 0);
    W.step(2);
    W.pressOnce();
    W.step(1);
    const e = W.ent(id);
    const st = e.status && e.status.stun;
    check('bell.stuns60', st && st.untilTick - W.tick() >= 58 && st.untilTick - W.tick() <= 60, { st });
    const x0 = e.x;
    W.step(30);
    check('stun.noMove', Math.abs(e.x - x0) < 1e-9, { dx: e.x - x0 });
    check('stun.noAttackStart', !e.telegraph, {});
    check('bell.once', ev(W, 'bell_ring').length === 1, { rings: ev(W, 'bell_ring').length });
    W.pressOnce();
    W.step(1);
    check('bell.usedDenied', ev(W, 'interact_denied', (x) => x.id === bell && x.reason === 'used').length === 1, {});
  },

  // ---------------------------------------------------------------- hazards
  bramble() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', 9, -6);
    const hz = W.world.cmd('spawnHazard', 'bramble', 0, 0, { r: 1.3 });
    const id = W.world.cmd('spawn', 'boar', -0.9, 0);
    const e = W.ent(id);
    W.step(3);
    const x0 = e.x;
    const z0 = e.z;
    W.step(10);
    const v = (Math.hypot(e.x - x0, e.z - z0) / 10) * 60;
    check('bramble.slows0.65', near(v / 2.0, 0.65, 0.02), { ratio: +(v / 2.0).toFixed(3) });
    const moth = W.ent(W.world.cmd('spawn', 'moth', 0.2, 0.2));
    W.step(3);
    check('bramble.fliersImmune', !(moth.status && moth.status.slow), {});
    void hz;
    // player walk inside
    W.world.cmd('teleport', -0.5, 0.4);
    W.setInput(() => ({ ...emptySnapshot(), move: { x: 1, z: 0 } }));
    W.step(3);
    const p0 = W.world.player.x;
    W.step(10);
    W.setInput(() => emptySnapshot());
    const vp = ((W.world.player.x - p0) / 10) * 60;
    check('bramble.playerWalk', near(vp, 2.4 * 0.65, 0.05), { uPerSec: +vp.toFixed(3) });
  },
  puffcap() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', 9, -6);
    const id = W.world.cmd('spawnHazard', 'puffcap', 0, 0, { offset: 0 });
    const h = W.ent(id);
    const box = W.world.cmd('spawn', 'dummy', 0.8, 0);
    W.step(299);
    check('puffcap.idle300', h.phase === 'idle', { phase: h.phase });
    W.step(2);
    check('puffcap.swell', h.phase === 'telegraph' && h.resolveTick - W.tick() >= 57, { phase: h.phase, left: h.resolveTick - W.tick() });
    W.step(61);
    const hits = ev(W, 'hit', (x) => x.attacker === id);
    check('puffcap.burst10', hits.length >= 1 && hits.every((x) => near(x.amount, 10, 1e-9) || near(x.amount, 15, 1e-9)), { amounts: hits.map((x) => x.amount) });
    check('puffcap.cooldown', h.phase === 'cooldown', { phase: h.phase });
    W.step(121);
    check('puffcap.backIdle', h.phase === 'idle', { phase: h.phase });
    // pop by damage while idle
    W.world.cmd('teleport', -2, 0);
    W.setInput(() => ({ ...emptySnapshot(), aim: { x: 0, z: 0 }, basicAttackHeld: true }));
    let popped = false;
    for (let i = 0; i < 40 && !popped; i++) {
      W.step(1);
      popped = h.phase === 'telegraph';
    }
    W.setInput(() => emptySnapshot());
    check('puffcap.popByDamage', popped, { phase: h.phase });
    void box;
  },
  millrace() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', 9, -6);
    const id = W.world.cmd('spawnHazard', 'millrace', 0, 0, { x0: -8, z0: 0, x1: 8, z1: 0, w: 1.4, offset: 0 });
    const h = W.ent(id);
    const b = W.ent(W.world.cmd('spawn', 'dummy', -4, 0.2));
    // dummies do not move on their own; the lane pushes only mobile bodies — use the player
    W.world.cmd('teleport', -4, 0.1);
    const x0 = W.world.player.x;
    W.step(30);
    const v = ((W.world.player.x - x0) / 30) * 60;
    check('millrace.push1.3', near(v, 1.3, 0.02), { uPerSec: +v.toFixed(3) });
    void b;
    // surge: 540 cadence, telegraph 60, 12 dmg, push 3.0
    while (h.phase !== 'telegraph' && W.tick() < 700) W.step(1);
    const tStart = W.tick();
    check('millrace.surgeTelegraph60', h.resolveTick - tStart >= 59, { dur: h.resolveTick - tStart });
    W.world.cmd('teleport', -4, 0.1);
    while (h.phase !== 'active' && W.tick() < 800) W.step(1);
    const s0 = W.world.player.x;
    W.step(10);
    const vs = ((W.world.player.x - s0) / 10) * 60;
    check('millrace.surgePush3', near(vs, 3.0, 0.05), { uPerSec: +vs.toFixed(3) });
    const hits = ev(W, 'hit', (x) => x.attacker === id && x.target === W.world.player.id);
    check('millrace.surgeDamage12Once', hits.length === 1 && near(hits[0].amount, 12, 1e-9) | near(hits[0].amount, 18, 1e-9), { amounts: hits.map((x) => x.amount) });
    // sluice stops it
    W.world.cmd('teleport', 0.2, 1.3);
    const sl = W.world.cmd('spawnInteractable', 'sluice', 0.2, 1.8, { laneIds: [id] });
    W.setInput(() => ({ ...emptySnapshot(), presses: [{ kind: 'interact' }] }));
    W.step(1);
    W.setInput(() => emptySnapshot());
    check('sluice.stops720', h.stoppedUntilTick - W.tick() >= 718, { left: h.stoppedUntilTick - W.tick() });
    W.world.cmd('teleport', -4, 0.1);
    const q0 = W.world.player.x;
    W.step(30);
    check('sluice.currentStopped', Math.abs(W.world.player.x - q0) < 1e-9, { dx: W.world.player.x - q0 });
    const s = W.ent(sl);
    check('sluice.cooldown1200', s.cooldownUntilTick - s.activeUntilTick === 1200, { cd: s.cooldownUntilTick - s.activeUntilTick });
  },
  rockfall() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', 0, 0);
    const id = W.world.cmd('spawnHazard', 'rockfall', 0, 0, {});
    const h = W.ent(id);
    let tele = null;
    for (let i = 0; i < 700 && !tele; i++) {
      W.step(1);
      if (h.telegraph) tele = { ...h.telegraph };
    }
    check('rockfall.telegraph72', tele && tele.resolveTick - tele.startTick >= 72 && tele.radius === 0.9 && tele.playerTargeted, tele && { dur: tele.resolveTick - tele.startTick });
    W.step(tele.resolveTick - W.tick() + 1);
    const hits = ev(W, 'hit', (x) => x.attacker === id && x.target === W.world.player.id);
    check('rockfall.damage15', hits.length === 1 && (near(hits[0].amount, 15, 1e-9) || near(hits[0].amount, 22.5, 1e-9)), { amounts: hits.map((x) => x.amount) });
    const rb = W.registry.all().find((e) => e.kind === 'rubble');
    check('rockfall.rubble', rb && rb.collider.r === 0.6 && rb.untilTick - rb.startTick === 480, rb && { r: rb.collider.r, life: rb.untilTick - rb.startTick });
    // the player was under it: pushed out of the collider
    const dp = Math.hypot(W.world.player.x - rb.x, W.world.player.z - rb.z);
    check('rubble.pushesOut', dp >= 0.6 + 0.3 - 1e-6, { d: +dp.toFixed(3) });
    // rubble blocks a bolt
    W.world.cmd('teleport', rb.x - 2, rb.z);
    W.setInput(() => ({ ...emptySnapshot(), aim: { x: rb.x + 3, z: rb.z }, basicAttackHeld: true }));
    W.step(30);
    W.setInput(() => emptySnapshot());
    const blocked = ev(W, 'projectile_despawn', (x) => x.cause === 'blocked' && x.blocker === rb.id);
    check('rubble.blocksBolts', blocked.length >= 1, { n: blocked.length });
    // rubble blocks walking
    W.world.cmd('teleport', rb.x - 1.5, rb.z);
    W.setInput(() => ({ ...emptySnapshot(), move: { x: 1, z: 0 } }));
    W.step(60);
    W.setInput(() => emptySnapshot());
    check('rubble.blocksWalk', W.world.player.x <= rb.x - 0.6 - 0.3 + 0.02 || Math.abs(W.world.player.z - rb.z) > 0.05, { x: W.world.player.x, z: W.world.player.z, rb: [rb.x, rb.z] });
  },
  gravefire() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', 9, -6);
    const id = W.world.cmd('spawnHazard', 'gravefire', 0, 0, { vents: [[-1.4, 0], [0, 0], [1.4, 0]], offset: 0 });
    const d0 = W.ent(W.world.cmd('spawn', 'dummy', -1.4, 0.1));
    W.world.cmd('hazardPhase', id, 'telegraph');
    const tel = [];
    const res = [];
    for (let i = 0; i < 120; i++) {
      W.step(1);
    }
    for (const e of ev(W, 'hazard_telegraph', (x) => x.id === id)) tel.push(e.tick);
    for (const e of ev(W, 'hazard_resolve', (x) => x.id === id)) res.push(e.tick);
    const staggers = tel.slice(1).map((t, i) => t - tel[i]);
    const tDur = res.map((r, i) => r - tel[i]);
    check('gravefire.sequence18', staggers.length === 2 && staggers.every((s) => s === 18), { tel, staggers });
    check('gravefire.telegraph54', tDur.length === 3 && tDur.every((d) => d === 54), { tDur });
    const hits = ev(W, 'hit', (x) => x.attacker === id && x.target === d0.id);
    check('gravefire.damage12', hits.length === 1 && (near(hits[0].amount, 12, 1e-9) || near(hits[0].amount, 18, 1e-9)), { amounts: hits.map((x) => x.amount) });
  },
  hazardSpacing() {
    // Layout 8 (two gravefire lines + rockfall) and layout 4 (millrace + 3 puffcaps):
    // no two hazard resolutions inside 36 ticks.
    const out = {};
    for (const L of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const W = makeWorld({ room: 'kill_all' });
      W.parkAllies(0.5, 0.5);
      W.world.cmd('setLayout', L);
      for (let i = 0; i < 3600; i++) {
        W.step(1);
        W.world.player.hp = W.world.player.maxHp;
        for (const a of W.registry.all().filter((e) => e.kind === 'ally')) a.hp = a.maxHp;
      }
      // group gravefire vents of one line as ONE resolution window
      const r = ev(W, 'hazard_resolve').filter((e) => e.htype !== 'gravefire' || e.vent === 0).map((e) => ({ t: e.tick, id: e.id, h: e.htype, cause: e.cause }));
      r.sort((a, b) => a.t - b.t);
      let minGap = Infinity;
      for (let i = 1; i < r.length; i++) {
        const prevEnd = r[i - 1].h === 'gravefire' ? r[i - 1].t + 36 : r[i - 1].t;
        minGap = Math.min(minGap, r[i].t - prevEnd);
      }
      out[L] = { resolves: r.length, minGap };
    }
    check('hazards.spacing36', Object.values(out).every((o) => o.resolves === 0 || o.minGap >= 36), out);
  },

  // ---------------------------------------------------------- interactables
  dewfont() {
    const W = makeWorld();
    W.parkAllies(1.2, 0.3, true);
    W.world.cmd('teleport', 0, 0);
    for (const e of W.registry.all()) if (e.partyIndex !== undefined) e.hp = e.maxHp * 0.5;
    const id = W.world.cmd('spawnInteractable', 'dewfont', 1.3, 0);
    W.setInput(() => ({ ...emptySnapshot(), presses: [{ kind: 'interact' }] }));
    W.step(1);
    W.setInput(() => emptySnapshot());
    const heals = ev(W, 'heal', (x) => x.source === 'dewfont');
    const party = W.registry.all().filter((e) => e.partyIndex !== undefined);
    const ok = heals.length === 4 && party.every((p) => near(p.hp / p.maxHp, 0.75, 1e-9) || near(p.hp / p.maxHp, 0.875, 1e-9));
    check('dewfont.heals25', ok, { heals: heals.length, fr: party.map((p) => +(p.hp / p.maxHp).toFixed(3)) });
    W.setInput(() => ({ ...emptySnapshot(), presses: [{ kind: 'interact' }] }));
    W.step(1);
    W.setInput(() => emptySnapshot());
    check('dewfont.oncePerRoom', ev(W, 'interact_denied', (x) => x.id === id && x.reason === 'used').length === 1, {});
    // prompt radius 1.1 (surface distance)
    const W2 = makeWorld();
    W2.parkAllies(11, 7.4);
    const f = W2.world.cmd('spawnInteractable', 'dewfont', 0, 0);
    const reach = [];
    for (const d of [1.55, 1.65]) {
      W2.world.cmd('teleport', d, 0);
      W2.setInput(() => ({ ...emptySnapshot(), presses: [{ kind: 'interact' }] }));
      W2.step(1);
      reach.push(ev(W2, 'interact', (x) => x.id === f).length);
    }
    check('interact.within1.1', reach[0] === 1 && reach[1] === 1, { reach, note: 'center 1.55 = surface 1.05 used; 1.65 = surface 1.15 silent (count stays 1)' });
  },
  doubleUse() {
    const W = makeWorld();
    W.parkAllies(11, 7.4, true);
    const id = W.world.cmd('spawnInteractable', 'bell', 0, 0);
    W.world.cmd('teleport', -0.8, 0);
    W.world.cmd('placeAlly', 1, 0.8, 0);
    const pressed = W.world.cmd('interactPress', [1, 0]); // same tick, two seats
    const uses = ev(W, 'interact', (x) => x.id === id);
    const denied = ev(W, 'interact_denied', (x) => x.id === id && x.reason === 'used');
    check('interact.doubleUseOnce', uses.length === 1 && denied.length === 1 && uses[0].by === W.world.player.id, { pressed, uses: uses.map((u) => u.by), denied: denied.map((d) => d.by) });
  },
  barricade() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', -2, 0);
    const id = W.world.cmd('spawnInteractable', 'barricade', 0, 0, { yaw: Math.PI / 2 });
    W.step(1);
    // walking into it
    W.setInput(() => ({ ...emptySnapshot(), move: { x: 1, z: 0 } }));
    W.step(60);
    W.setInput(() => emptySnapshot());
    const px = W.world.player.x;
    check('barricade.blocksMovement', px <= -0.225 - 0.3 + 0.02, { px: +px.toFixed(3) });
    // shooting it: bolts stop and damage it
    W.world.cmd('teleport', -2, 0);
    W.setInput(() => ({ ...emptySnapshot(), aim: { x: 3, z: 0 }, basicAttackHeld: true }));
    W.step(40);
    const bl = ev(W, 'projectile_despawn', (x) => x.cause === 'blocked' && x.blocker === id);
    const hits = ev(W, 'hit', (x) => x.target === id);
    check('barricade.blocksBolts', bl.length >= 1 && hits.length >= 1, { blocked: bl.length, hits: hits.length });
    // enemy shot blocked: a mantis behind it
    const W2 = makeWorld();
    W2.parkAllies(11, 7.4);
    W2.world.cmd('teleport', -2.2, 0);
    const bid = W2.world.cmd('spawnInteractable', 'barricade', 0, 0, { yaw: Math.PI / 2 });
    W2.world.cmd('spawn', 'mantis', 1.2, 0);
    W2.step(200);
    const eb = ev(W2, 'eshot_despawn', (x) => x.cause === 'blocked' && x.blocker === bid);
    check('barricade.blocksEnemyShots', eb.length >= 1, { n: eb.length, shots: ev(W2, 'enemy_fire').length });
    // breaks at 0
    W.setInput(() => ({ ...emptySnapshot(), aim: { x: 3, z: 0 }, basicAttackHeld: true }));
    W.step(400);
    W.setInput(() => emptySnapshot());
    const broke = ev(W, 'broken', (x) => x.id === id);
    check('barricade.breaksAt0', broke.length === 1 && !W.ent(id), { broke: broke.length });
    W.world.cmd('teleport', -2, 0);
    W.setInput(() => ({ ...emptySnapshot(), move: { x: 1, z: 0 } }));
    W.step(90);
    W.setInput(() => emptySnapshot());
    check('barricade.goneWalkThrough', W.world.player.x > 0.5, { px: +W.world.player.x.toFixed(2) });
  },
  keg() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    W.world.cmd('teleport', 8, -6);
    const k1 = W.world.cmd('spawnInteractable', 'keg', 0, 0);
    const k2 = W.world.cmd('spawnInteractable', 'keg', 1.4, 0);
    const d = W.ent(W.world.cmd('spawn', 'boar', -1.0, 0.3));
    d.hp = 999;
    d.maxHp = 999;
    const t0 = W.tick();
    const r = W.world.cmd('armKeg', k1);
    check('cmd.armKeg', r && r.blastTick - t0 === 60, r);
    W.step(61);
    const blasts = ev(W, 'keg_blast');
    const hitsBoar = ev(W, 'hit', (x) => x.target === d.id && x.shape === 'keg');
    check('keg.blast30', blasts.length >= 1 && hitsBoar.length === 1 && (near(hitsBoar[0].amount, 30, 1e-9) || near(hitsBoar[0].amount, 45, 1e-9)) && hitsBoar[0].kb > 0, { blasts: blasts.length, amt: hitsBoar.map((x) => x.amount), kb: hitsBoar.map((x) => x.kb) });
    check('keg.chains', ev(W, 'keg_ignite').length === 2, { ignites: ev(W, 'keg_ignite').length });
    W.step(61);
    check('keg.chainBlast', ev(W, 'keg_blast').length === 2, { blasts: ev(W, 'keg_blast').length });
    void k2;
  },

  retreatAll() {
    // Room clear with every archetype alive: all retreat and despawn cleanly
    // (M4a caught a crash here: retreatMove read ENEMY_STATS for archetypes).
    const W = makeWorld({ room: 'kill_all' });
    W.parkAllies();
    W.world.cmd('killAllEnemies');
    const ids = ['quillback', 'toad', 'moth', 'ram', 'mole'].map((k, i) => W.world.cmd('spawn', k, -6 + i * 3, 3));
    W.step(30);
    W.world.cmd('clearRoom');
    let crash = null;
    try {
      W.step(90);
    } catch (e) {
      crash = String(e.message || e);
    }
    const left = ids.filter((id) => W.ent(id));
    const retreats = ev(W, 'enemy_retreat').length;
    check('retreat.allArchetypes', !crash && left.length === 0 && retreats >= 5, { crash, left, retreats });
  },

  // ---------------------------------------------------------- setups / data
  commands() {
    const W = makeWorld();
    W.parkAllies(11, 7.4);
    const h = W.world.cmd('spawnHazard', 'puffcap', 2, 2, {});
    const f = W.world.cmd('hazardPhase', h, 'telegraph');
    W.step(1);
    check('cmd.hazardPhase', W.ent(h).phase === 'telegraph', { f, phase: W.ent(h).phase });
    const r = W.world.cmd('setLayout', 7);
    W.step(1);
    const hz = W.registry.all().filter((e) => e.kind === 'hazard').length;
    const ia = W.registry.all().filter((e) => e.itype).length;
    check('cmd.setLayout', r && r.layoutId === 7 && hz === 2 && ia === 7, { hz, ia });
  },
  plainData() {
    const out = {};
    for (const L of [1, 4, 7]) {
      const W = makeWorld({ room: 'kill_all' });
      W.world.cmd('setLayout', L);
      ['quillback', 'toad', 'moth', 'ram', 'mole'].forEach((k, i) => W.world.cmd('spawn', k, -6 + i * 2, 5, { elite: i % 2 === 0 }));
      W.step(420);
      let ok = true;
      let err = null;
      try {
        canonicalJSON(W.registry.all());
      } catch (e) {
        ok = false;
        err = String(e.message || e);
      }
      out[L] = { ok, err, entities: W.registry.count };
    }
    check('plainData.canonicalJSON', Object.values(out).every((o) => o.ok), out);
  },
};

for (const [name, fn] of Object.entries(scenarios)) {
  if (only && name !== only) continue;
  try {
    fn();
  } catch (e) {
    check(`${name}.CRASH`, false, { error: String(e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e) });
  }
}
const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.map((f) => f.name) }));
process.exit(failed.length ? 1 : 0);
