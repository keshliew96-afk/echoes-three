#!/usr/bin/env node
// PARTY GP.3 (Node): every LIVE class-node cell shows its effect in the sim
// at least once per skill SHAPE (the oracle's effect text, measured as an
// event or a state change), and a GREY cell contributes nothing (the hit
// amounts equal the unsocketed cast's).
//   node tools/gntPARTY-cells.mjs [--only tank,swordsman,archer] [--verbose 1]
//
// Per (class node, skill shape) the first LIVE skill of that shape is equipped
// on its seat, the node socketed ALONE on it (column 0), tough target boars
// placed for the shape, the skill cast (AI mode, at the first target) or its
// passive pulsed, and the node's signature asserted:
//   provoke taunt status from the Tank · brace Tank shield · tremor stun ·
//   anchor pull toward the Tank / zone (no knock-back away) · retaliate a
//   `retaliate:*` instance on the attacker · aegis ward · flow cooldown cut ·
//   momentum +12% power · parry guard window (+ Riposte's longer one) ·
//   pursuit dash · lethality crit ×2.2 · execute ×2 at <= 35% HP · skewer
//   pierce · concussive knock-back ×2 · steady aim +40% standing still ·
//   disengage hop · scatter 3 shards / 3 zones · heartseeker forced crit with
//   the crit roll still drawn.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const ONLY = opt('only') ? opt('only').split(',') : ['tank', 'swordsman', 'archer'];
const VERBOSE = opt('verbose') === '1';

const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { SKILLS } = await import(u('src/sim/skills.js'));
const C = await import(u('src/data/classes.js'));
const oracle = JSON.parse(readFileSync(join(here, 'docs/gauntlet/party-oracle.json'), 'utf8'));

function mk(seed = 3) {
  const rng = createGameplayRng(seed);
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const evs = [];
  bus.on('*', (e) => {
    if (e.type !== 'sound') evs.push(e);
  });
  const step = (n = 1) => {
    const goal = world.tick + n;
    for (let g = 0; world.tick < goal && g < n * 4 + 64; g++) clock.advance(1000 / 60, (t) => world.step(t, emptySnapshot()));
  };
  const ally = (i) => registry.all().find((e) => e.kind === 'ally' && e.partyIndex === i);
  return { world, registry, evs, step, rng, cmd: (...a) => world.cmd(...a), ally };
}
const tough = (W, id, hp = 5000) => {
  const e = W.registry.byId(id);
  if (e) {
    e.maxHp = hp;
    e.hp = hp;
  }
  return id;
};

const SEAT = { tank: 1, swordsman: 2, archer: 3 };
const results = [];
function check(cls, node, skill, name, pass, got = null) {
  results.push({ cls, node, skill, name, pass: !!pass, got });
  if (VERBOSE || !pass) console.log(`${pass ? 'PASS' : 'FAIL'} ${cls}.${node} on ${skill}: ${name}${got !== null ? ' ' + JSON.stringify(got).slice(0, 360) : ''}`);
}

// A world with `skill` in its seat's slot 0, `nodes` socketed alone on it,
// the other allies parked far away, the caster at the origin facing +x.
function setup(cls, skill, nodes = []) {
  const seat = SEAT[cls];
  const W = mk();
  W.step(2);
  const P = W.world.partySystem();
  if (!P.slots(seat).includes(skill)) P.swap(seat, skill, 0);
  const slot = P.slots(seat).indexOf(skill);
  nodes.forEach((n, i) => {
    P.grantNode(seat, n, 'grant');
    const r = P.build(seat).socket(skill, n, i);
    if (!r || r.denied || r.error) throw new Error(`socket ${n} on ${skill}: ${JSON.stringify(r)}`);
  });
  // The Healer beside the caster (the allies' leash anchor: nobody walks off
  // to regroup), the other two allies a few steps behind it; no ally acts on
  // its own during the probe window (only the probe's cast / pulse).
  W.cmd('teleport', 0, -0.9, -0.9);
  for (const s of [1, 2, 3]) if (s !== seat) W.cmd('placeAlly', s, -1.6 - 0.3 * s, -1.4);
  W.cmd('placeAlly', seat, 0, 0);
  for (const s of [1, 2, 3]) {
    const b = W.ally(s);
    b.cds = [1e9, 1e9, 1e9, 1e9];
    b.nextBasicTick = 1e9;
  }
  const a = W.ally(seat);
  a.faceX = 1;
  a.faceZ = 0;
  return { W, P, seat, slot, a, def: P.build(seat).resolveDef(SKILLS[skill]) };
}
// Target boars for a shape; returns ids (first = the aim target).
function targets(ctx, shape, n = 2) {
  const { W } = ctx;
  const d = ctx.def;
  let pts;
  if (shape === 'melee_arc') pts = [[0.55, 0], [0.5, 0.25]];
  else if (shape === 'nova') pts = [[0.55, 0], [-0.5, 0.2]];
  else if (shape === 'projectile') pts = [[1.6, 0], [2.3, 0]];
  else if (shape === 'ground_aoe') pts = [[2, 0], [2.2, 0.25]];
  else if (shape === 'aura') pts = [[0.5, 0], [0.4, 0.4]];
  else pts = [[1.2, 0.6], [1.3, -0.6]];
  void d;
  // Training dummies: they never walk off or swing (a zone's first tick
  // finds them where they were put); tough, and knock-back-able.
  const ids = pts.slice(0, n).map(([x, z]) => tough(W, W.cmd('spawn', 'dummy', x, z)));
  for (const id of ids) W.registry.byId(id).knockbackable = true;
  return ids;
}
const since = (W, k, type) => W.evs.slice(k).filter((e) => !type || e.type === type);
function cast(ctx, ids, { ticks = 90, aim = null } = {}) {
  const { W, seat, slot } = ctx;
  const t0 = ids.length ? W.registry.byId(ids[0]) : null;
  const k = W.evs.length;
  const r = W.cmd('partyCast', seat, slot, aim || (t0 ? { x: t0.x, z: t0.z } : { x: 2, z: 0 }));
  W.step(ticks);
  return { k, r };
}
const hitsOn = (W, k, ids, src = null) => since(W, k, 'hit').filter((e) => ids.includes(e.target) && (!src || String(e.source).startsWith(src)));

// ---------------------------------------------------------- node checks --
const NODE_CHECK = {
  provoke(ctx, shape) {
    const { W, a } = ctx;
    const ids = shape === 'direct' ? [] : targets(ctx, shape);
    let recips = [];
    if (shape === 'direct') {
      // Shield Wall: recipients at 1 u, a hostile within 1.5 u of each.
      W.cmd('placeAlly', 2, 1.0, 0);
      W.cmd('placeAlly', 3, -1.0, 0);
      W.cmd('setHp', W.ally(2).id, 0.3);
      W.cmd('setHp', W.ally(3).id, 0.4);
      recips = [2, 3];
      ids.push(tough(W, W.cmd('spawn', 'dummy', 1.8, 0.4)), tough(W, W.cmd('spawn', 'dummy', -1.8, 0.4)));
    }
    const { k } = shape === 'aura' ? pulseCast(ctx) : cast(ctx, ids, { aim: shape === 'direct' ? { x: 1, z: 0 } : null });
    // (the event: a Shield Wall taunt lasts 60 ticks, shorter than the window)
    const taunted = since(W, k, 'status_apply').filter((e) => e.status === 'taunt' && ids.includes(e.id) && e.src === a.id);
    return { pass: taunted.length >= 1, got: { taunted: taunted.length, of: ids.length, recips, ev: since(W, k, 'status_apply').filter((e) => e.status === 'taunt').length, casts: since(W, k, 'ally_cast').map((e) => e.targets) } };
  },
  brace(ctx, shape) {
    const { W, a } = ctx;
    const ids = targets(ctx, shape);
    if (shape === 'direct') {
      W.cmd('placeAlly', 2, 1.0, 0);
      W.cmd('setHp', W.ally(2).id, 0.3);
    }
    const before = a.status && a.status.shield ? a.status.shield.mag : 0;
    shape === 'aura' ? pulseCast(ctx) : cast(ctx, ids, { ticks: 4 });
    const after = a.status && a.status.shield ? a.status.shield.mag : 0;
    const want = shape === 'aura' ? 2 : 8;
    return { pass: after - before >= want - 1e-6 || (shape === 'aura' && after >= 2), got: { before, after, want } };
  },
  tremor(ctx, shape) {
    const { W } = ctx;
    const ids = targets(ctx, shape);
    const { k } = cast(ctx, ids, { ticks: shape === 'ground_aoe' ? 75 : 6 });
    const st = since(W, k, 'status_apply').filter((e) => e.status === 'stun' && ids.includes(e.id));
    return { pass: st.length >= 1 && st.some((e) => e.untilTick - e.tick === 18), got: st.map((e) => e.untilTick - e.tick) };
  },
  anchor(ctx, shape) {
    const { W, a } = ctx;
    if (shape === 'ground_aoe') {
      // The zone lands on the aimed dummy; the one 0.45 u off its centre is
      // pulled in (a hit AT the centre has no direction to pull along).
      const ids2 = targets(ctx, shape, 2);
      const e2 = W.registry.byId(ids2[1]);
      e2.x = 2.45;
      e2.z = 0;
      const { k } = cast(ctx, ids2, { ticks: 75 });
      const h = hitsOn(W, k, [ids2[1]]);
      return { pass: h.length >= 1 && h.some((x) => x.kb < 0) && Math.hypot(e2.x - 2, e2.z) < 0.4, got: { d1: +Math.hypot(e2.x - 2, e2.z).toFixed(2), kb: h.map((x) => x.kb) } };
    }
    const ids = targets(ctx, shape, 1);
    const e = W.registry.byId(ids[0]);
    if (shape !== 'ground_aoe') {
      e.x = shape === 'nova' ? 1.0 : 0.95;
      e.z = 0;
    }
    const cx = shape === 'ground_aoe' ? 2.0 : a.x;
    const d0 = Math.hypot(e.x - cx, e.z - (shape === 'ground_aoe' ? 0 : a.z));
    if (shape === 'ground_aoe') {
      e.x = 2.45;
      e.z = 0;
    }
    const d0b = Math.hypot(e.x - cx, e.z);
    const { k } = cast(ctx, ids, { ticks: shape === 'ground_aoe' ? 75 : 12, aim: shape === 'ground_aoe' ? { x: 2, z: 0 } : null });
    const d1 = Math.hypot(e.x - cx, e.z - (shape === 'ground_aoe' ? 0 : a.z));
    const hit = hitsOn(W, k, ids);
    // A pull is a NEGATIVE knock-back along the hit direction (the body stops
    // at contact, so the distance shrinks by up to 0.5 u).
    return { pass: hit.length >= 1 && hit.some((h) => h.kb < 0) && (shape === 'ground_aoe' ? d0b : d0) - d1 > 0.05, got: { d0: +(shape === 'ground_aoe' ? d0b : d0).toFixed(2), d1: +d1.toFixed(2), hits: hit.length, kb: hit.map((h) => h.kb) } };
  },
  retaliate(ctx, shape) {
    const { W, a } = ctx;
    const ids = shape === 'direct' ? [tough(W, W.cmd('spawn', 'boar', 1.4, 0.5))] : targets(ctx, shape, 1);
    if (shape === 'direct') {
      W.cmd('placeAlly', 2, 1.0, 0);
      W.cmd('setHp', W.ally(2).id, 0.3);
    }
    const { k } = cast(ctx, ids, { ticks: 2 });
    // The boar now swings at the Tank.
    // A boar on the Tank's far side (nearer the Tank than any recipient).
    const b = W.registry.byId(tough(W, W.cmd('spawn', 'boar', a.x - 0.6, a.z + 0.2)));
    a.status = {}; // no shield: the hit lands (amount > 0)
    W.step(110);
    const onTank = since(W, k, 'hit').filter((e) => e.target === a.id && e.attacker === b.id);
    const ret = since(W, k, 'hit').filter((e) => e.target === b.id && String(e.source).endsWith(':retaliate'));
    return { pass: onTank.length >= 1 && ret.length >= 1, got: { onTank: onTank.length, retaliate: ret.map((e) => e.amount) } };
  },
  aegis(ctx, shape) {
    const { W, a } = ctx;
    const ids = targets(ctx, shape);
    if (shape === 'direct') {
      W.cmd('placeAlly', 2, 1.0, 0);
      W.cmd('setHp', W.ally(2).id, 0.3);
    }
    if (shape === 'aura') {
      W.cmd('placeAlly', 2, 0.6, 0);
      pulseCast(ctx);
      const w2 = W.ally(2).status && W.ally(2).status.ward ? W.ally(2).status.ward.mag : 0;
      return { pass: Math.abs(w2 - 0.1) < 1e-6, got: { allyWard: w2 } };
    }
    cast(ctx, ids, { ticks: 4 });
    const w = a.status && a.status.ward ? a.status.ward.mag : 0;
    return { pass: Math.abs(w - 0.2) < 1e-6, got: { ward: w } };
  },
  flow(ctx, shape) {
    const { W, a, slot } = ctx;
    const ids = targets(ctx, shape);
    const far = W.world.tick + 600;
    const others = [0, 1, 2, 3].filter((s) => s !== slot);
    for (const s of others) a.cds[s] = far;
    shape === 'aura' ? pulseCast(ctx) : cast(ctx, ids, { ticks: shape === 'ground_aoe' ? 75 : 20 });
    const cut = others.map((s) => far - a.cds[s]);
    const want = shape === 'aura' ? 6 : 18;
    return { pass: cut.every((c) => c === want), got: { cut, want } };
  },
  momentum(ctx, shape) {
    const { W, seat } = ctx;
    const ids = targets(ctx, shape);
    // Another Swordsman skill cast first (a Flurry in slot 1).
    const P = W.world.partySystem();
    const other = P.slots(seat).find((id, i) => id && i !== ctx.slot && SKILLS[id].shape !== 'aura');
    const oi = P.slots(seat).indexOf(other);
    W.cmd('partyCast', seat, oi, { x: 0.55, z: 0 });
    W.step(8);
    if (shape === 'aura') {
      const k = W.evs.length;
      pulseCast(ctx);
      const hits = since(W, k, 'hit').filter((e) => e.source === ctx.skill);
      const base = SKILLS[ctx.skill].power;
      return { pass: hits.some((h) => !h.crit && Math.abs(h.amount / base - 1.12) < 0.02), got: hits.map((h) => h.amount / base) };
    }
    const { k } = cast(ctx, ids, { ticks: 30 });
    const c = since(W, k, 'ally_cast').find((e) => e.skill === ctx.skill);
    const base = ctx.def.power;
    return { pass: c && Math.abs(c.power / base - 1.12) < 0.02, got: { power: c && c.power, base } };
  },
  parry(ctx, shape) {
    const { W } = ctx;
    const ids = targets(ctx, shape);
    const { k } = cast(ctx, ids, { ticks: 1 });
    const p = since(W, k, 'parry_open');
    const win = p.length ? p[0].untilTick - p[0].tick : null;
    const want = ctx.skill === 'riposte' ? 60 : 24;
    return { pass: p.length >= 1 && win === want, got: { window: win, want } };
  },
  pursuit(ctx, shape) {
    const { W, a } = ctx;
    const ids = targets(ctx, shape, 1);
    const b = W.registry.byId(ids[0]);
    b.x = ctx.skill === 'fox_step' ? 2.9 : 1.9;
    b.z = 0;
    const x0 = a.x;
    const { k } = cast(ctx, ids, { ticks: 40 });
    const d = since(W, k, 'ally_dash')[0];
    const want = ctx.skill === 'fox_step' ? 'dash' : 'pursuit';
    return { pass: d && d.cause === want && a.x - x0 > 0.8, got: { dash: d && d.cause, moved: +(a.x - x0).toFixed(2) } };
  },
  lethality(ctx, shape) {
    return critRatio(ctx, shape, 2.2);
  },
  execute(ctx, shape) {
    const { W } = ctx;
    const ids = targets(ctx, shape, 1);
    const low = W.registry.byId(ids[0]);
    const base = shape === 'aura' ? SKILLS[ctx.skill].power : ctx.def.power;
    let lo = null;
    for (let i = 0; i < 20 && !lo; i++) {
      low.hp = low.maxHp * 0.3;
      const { k } = shape === 'aura' ? pulseCast(ctx, 2) : cast(ctx, ids, { ticks: shape === 'ground_aoe' ? 75 : 30 });
      lo = since(W, k, 'hit').find((e) => e.target === ids[0] && !e.crit && e.source === ctx.skill) || null;
    }
    return { pass: lo && Math.abs(lo.amount / base - 2) < 0.02, got: { low: lo && lo.amount, base } };
  },
  skewer(ctx) {
    const { W } = ctx;
    const ids = targets(ctx, 'projectile');
    const { k } = cast(ctx, ids, { ticks: 50 });
    const h = hitsOn(W, k, ids).filter((e) => e.source === ctx.skill);
    const hitIds = new Set(h.map((e) => e.target));
    return { pass: hitIds.size === 2, got: { targetsHit: hitIds.size, pierce: since(W, k, 'skill_bolt_pierce').length } };
  },
  concussive(ctx, shape) {
    // Knock-back ×2 on non-boss hits: the same cast with and without it.
    const kbOf = (nodes) => {
      const c = setup(ctx.cls, ctx.skill, nodes);
      // A zone: the off-centre dummy (a hit at the centre has no direction).
      const ids = targets(c, shape, shape === 'ground_aoe' ? 2 : 1);
      const { k } = shape === 'aura' ? pulseCast(c) : cast(c, ids, { ticks: shape === 'ground_aoe' ? 75 : 40 });
      const h = hitsOn(c.W, k, shape === 'ground_aoe' ? [ids[1]] : ids).filter((e) => e.source === ctx.skill);
      return h.length ? h[0].kb : null;
    };
    const plain = kbOf([]);
    const conc = kbOf(['concussive']);
    return { pass: plain > 0 && Math.abs(conc / plain - 2) < 0.02, got: { plain, conc } };
  },
  steady_aim(ctx, shape) {
    const { W } = ctx;
    W.step(40); // the Archer stands still (nothing to kite from yet)
    const ids = targets(ctx, shape);
    if (shape === 'aura') {
      const k = W.evs.length;
      pulseCast(ctx);
      const h = since(W, k, 'hit').filter((e) => e.source === ctx.skill && !e.crit);
      const base = SKILLS[ctx.skill].power;
      return { pass: h.some((e) => Math.abs(e.amount / base - 1.4) < 0.02), got: h.map((e) => e.amount / base) };
    }
    const { k } = cast(ctx, ids, { ticks: 4 });
    const c = since(W, k, 'ally_cast').find((e) => e.skill === ctx.skill);
    return { pass: c && Math.abs(c.power / ctx.def.power - 1.4) < 0.02, got: { power: c && c.power, base: ctx.def.power } };
  },
  disengage(ctx, shape) {
    const { W, a } = ctx;
    const ids = targets(ctx, shape);
    const x0 = a.x;
    const { k } = cast(ctx, ids, { ticks: 50 });
    const d = since(W, k, 'ally_dash');
    const want = ctx.skill === 'vault_shot' ? 'vault' : 'disengage';
    const vaultLen = d[0] ? Math.hypot(d[0].x1 - d[0].x0, d[0].z1 - d[0].z0) : 0;
    const hop = d.find((e) => e.cause === 'disengage');
    const hopLen = hop ? Math.hypot(hop.x1 - hop.x0, hop.z1 - hop.z0) : 0;
    const ok = ctx.skill === 'vault_shot' ? d[0] && d[0].cause === 'vault' && vaultLen > 2.2 : !!hop && Math.abs(hopLen - 1.0) < 0.1;
    return { pass: ok, got: { dashes: d.map((e) => e.cause), moved: +(x0 - a.x).toFixed(2), vaultLen: +vaultLen.toFixed(2), want } };
  },
  scatter(ctx, shape) {
    const { W } = ctx;
    if (shape === 'projectile') {
      // Nothing in the path: the bolt spends its range and bursts.
      const { k } = cast(ctx, [], { ticks: 120, aim: { x: 5, z: 0 } });
      const b = since(W, k, 'scatter_burst');
      return { pass: b.length >= 1 && (Array.isArray(b[0].shards) ? b[0].shards.length : b[0].shards) === 3, got: b.map((e) => e.shards) };
    }
    const ids = targets(ctx, shape);
    const { k } = cast(ctx, ids, { ticks: 4 });
    const z = since(W, k, 'azone_spawn').filter((e) => e.skill === ctx.skill);
    return { pass: z.length === 3, got: { zones: z.length } };
  },
  heartseeker(ctx, shape) {
    const { W } = ctx;
    const ids = targets(ctx, shape, 1);
    const d0 = W.rng.drawIndex;
    const { k } = shape === 'aura' ? pulseCast(ctx) : cast(ctx, ids, { ticks: shape === 'ground_aoe' ? 75 : 50 });
    const h = hitsOn(W, k, ids).filter((e) => e.source === ctx.skill);
    return { pass: h.length >= 1 && h[0].crit === true && W.rng.drawIndex > d0, got: { first: h[0] && h[0].crit, draws: W.rng.drawIndex - d0 } };
  },
};
function pulseCast(ctx, ticks = 2) {
  const { W, seat, slot } = ctx;
  const k = W.evs.length;
  W.cmd('partyCast', seat, slot);
  W.step(ticks);
  return { k };
}
// Crits: cast until both a crit and a non-crit instance landed on targets.
function critRatio(ctx, shape, want) {
  const { W } = ctx;
  const ids = targets(ctx, shape);
  let crit = null;
  let plain = null;
  for (let i = 0; i < 80 && (crit === null || plain === null); i++) {
    const { k } = shape === 'aura' ? pulseCast(ctx) : cast(ctx, ids, { ticks: shape === 'ground_aoe' ? 75 : shape === 'projectile' ? 40 : 6 });
    for (const e of hitsOn(W, k, ids).filter((x) => x.source === ctx.skill)) {
      if (e.crit && crit === null) crit = e.amount;
      if (!e.crit && plain === null) plain = e.amount;
    }
    for (const id of ids) tough(W, id);
  }
  return { pass: crit !== null && plain !== null && Math.abs(crit / plain - want) < 0.03, got: { crit, plain, ratio: crit && plain ? +(crit / plain).toFixed(3) : null } };
}

for (const cls of ONLY) {
  const o = oracle.classes[cls];
  const shapeOf = (id) => (o.skills.find((s) => s.id === id) || {}).shape;
  for (const nn of o.classNodes) {
    const node = nn.id || nn;
    const byShape = new Map();
    for (const [sk, row] of Object.entries(o.grid)) {
      const cell = row[node];
      if (!cell || cell.state !== 'live') continue;
      const sh = shapeOf(sk);
      if (!byShape.has(sh)) byShape.set(sh, sk);
    }
    for (const [shape, skill] of byShape) {
      let r;
      try {
        const ctx = { ...setup(cls, skill, [node]), cls, skill };
        r = NODE_CHECK[node](ctx, shape);
      } catch (err) {
        r = { pass: false, got: String(err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err) };
      }
      check(cls, node, skill, `${shape}: ${Object.values(o.grid[skill][node]).slice(-1)[0]}`, r.pass, r.got);
    }
  }
  // GREY cells: the unsocketed and the socketed casts land the same amounts.
  for (const nn of o.classNodes) {
    const node = nn.id || nn;
    const greys = Object.entries(o.grid).filter(([, row]) => row[node] && row[node].state === 'grey').map(([sk]) => sk);
    for (const skill of greys.slice(0, 1)) {
      const shape = shapeOf(skill);
      const run = (nodes) => {
        const c = setup(cls, skill, nodes);
        const ids = targets(c, shape);
        const { k } = shape === 'aura' ? pulseCast(c, 4) : cast(c, ids, { ticks: shape === 'ground_aoe' ? 75 : 50 });
        return since(c.W, k, 'hit').filter((e) => ids.includes(e.target) && !e.crit).map((e) => +e.amount.toFixed(3));
      };
      let a;
      let b;
      try {
        a = run([]);
        b = run([node]);
      } catch (err) {
        a = String(err);
        b = null;
      }
      check(cls, node, skill, `GREY (${o.grid[skill][node].reason}): the instance amounts equal the unsocketed cast`, JSON.stringify(a) === JSON.stringify(b), { plain: a, socketed: b });
    }
  }
}

const failed = results.filter((r) => !r.pass);
mkdirSync(join(here, 'captures'), { recursive: true });
writeFileSync(join(here, 'captures/gntPARTY-cells.json'), JSON.stringify({ tool: 'gntPARTY-cells', passed: results.length - failed.length, of: results.length, results }, null, 1));
console.log(JSON.stringify({ tool: 'gntPARTY-cells', cells: results.length, passed: results.length - failed.length, failed: failed.map((f) => `${f.cls}.${f.node}@${f.skill}`) }, null, 1));
process.exit(failed.length ? 1 : 0);
