#!/usr/bin/env node
// gntM4a — headless sim probe for the M4a systems gates (docs/gauntlet/PLAN.md
// §7 G4a.1 / G4a.2 / G4a.3 / G4a.5 / G4a.7). Builds the sim exactly like
// src/main.js (the same construction tools/gnt-arch-simtrace.mjs uses), then
// drives every new skill, status and node through the real sim entry points
// and compares what happened with the authored numbers of BUILD_BRIEF §23.
//
//   node tools/gntM4a-simprobe.mjs [--out captures/gntM4a-simprobe.json] [--only name]
//
// Prints one line per check and a summary; exit 1 when any check fails.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const argv = process.argv.slice(2);
const arg = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const OUT = arg('out', 'captures/gntM4a-simprobe.json');
const ONLY = arg('only');

const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { SKILLS } = await import(u('src/sim/skills.js'));
const { NODES } = await import(u('src/sim/nodes.js'));
const { SKILL_SLOTS } = await import(u('src/core/constants.js'));
const { DRAFTABLE_SKILL_IDS, NODE_IDS } = await import(u('src/sim/draft.js'));
const STATUS = await import(u('src/sim/status.js'));
const { difficulty } = await import(u('src/data/difficulty.js'));
const { canonicalJSON } = await import(u('src/core/canonical.js'));

const results = [];
let failed = 0;
function check(group, name, ok, detail = {}) {
  results.push({ group, name, ok: !!ok, ...detail });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${group}] ${name}${detail.got !== undefined ? `  got=${JSON.stringify(detail.got)}` : ''}${detail.want !== undefined ? ` want=${JSON.stringify(detail.want)}` : ''}`);
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// ------------------------------------------------------------------ rig --
function mk(seed = 1) {
  const rng = createGameplayRng(seed);
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const w = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const events = [];
  bus.on('*', (e) => events.push(e));
  const player = w.player;
  let aim = { x: player.x + 3, z: player.z };
  // Damage probes park the three allies out of reach every tick (their AI
  // would engage and knock the probe's dummies out of line); heal probes pin
  // them where they need them with pin().
  let parkAllies = false;
  const PARK = [[1, -10.5, 6.8], [2, -10.5, 5.6], [3, -9.4, 6.8]];
  function step(n = 1, snapFn = null) {
    for (let i = 0; i < n; i++) {
      if (parkAllies) for (const [idx, x, z] of PARK) w.cmd('placeAlly', idx, x, z);
      let stepped = false;
      for (let g = 0; g < 16 && !stepped; g++) {
        stepped = clock.stepOnce((t) => {
          const s = emptySnapshot();
          s.aim = { ...aim };
          if (snapFn) snapFn(s, t);
          w.step(t, s);
        });
      }
    }
  }
  const press = (slot) => step(1, (s) => s.presses.push({ kind: `skill_${slot + 1}`, slot }));
  const allies = () => registry.all().filter((e) => e.kind === 'ally').sort((a, b) => a.partyIndex - b.partyIndex);
  // Freeze the allies where the probe put them (their AI would walk them).
  function pin(list) {
    for (const [idx, x, z] of list) w.cmd('placeAlly', idx, x, z);
  }
  function slotOf(id) {
    return w.skillSlots().findIndex((s) => s && s.id === id);
  }
  function give(id) {
    w.cmd('giveSkill', id);
    return slotOf(id);
  }
  const since = (k) => events.slice(k);
  const dummy = (x, z, hp = 500) => {
    parkAllies = true;
    const id = w.cmd('spawn', 'dummy', x, z);
    const e = registry.byId(id);
    e.hp = e.maxHp = hp;
    e.knockbackable = false; // a probe target stays where the probe put it
    return e;
  };
  return { w, bus, clock, registry, events, player, step, press, allies, pin, give, slotOf, since, dummy, setAim: (a) => (aim = a), tick: () => clock.tick };
}
const hitsOf = (evs, src) => evs.filter((e) => e.type === 'hit' && e.source === src);
const healsOf = (evs, src) => evs.filter((e) => e.type === 'heal' && e.source === src);
const baseAmt = (e, power) => e.amount === power || near(e.amount, power * 1.5); // crit 1.5x allowed

const run = (name, fn) => {
  if (ONLY && !name.includes(ONLY)) return;
  try {
    fn();
  } catch (err) {
    check(name, 'threw', false, { got: String(err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err) });
  }
};

// ============================================================== G4a.1 ===
run('slots', () => {
  const r = mk(3);
  check('slots', 'SKILL_SLOTS = 8', SKILL_SLOTS === 8, { got: SKILL_SLOTS });
  check('slots', 'slot view has 8 entries', r.w.skillSlots().length === 8, { got: r.w.skillSlots().length });
  const ids = ['nova_bloom', 'sanctuary', 'spirit_bolt', 'guardian_bond', 'restorative_wave', 'lantern_flurry'];
  for (const id of ids) r.give(id);
  check('slots', 'giveSkill fills slots 3..8', r.w.skillSlots().every(Boolean), { got: r.w.skillSlots().map((s) => s && s.id) });
  const k0 = r.events.length;
  // Press all 8 in one tick: each fires on that tick (no dash), ascending slot.
  r.step(1, (s) => {
    for (let i = 0; i < 8; i++) s.presses.push({ kind: `skill_${i + 1}`, slot: i });
  });
  const casts = r.since(k0).filter((e) => e.type === 'skill_cast');
  check('slots', 'keys 1-8 fire slots 0-7 on the press tick', casts.length === 8 && casts.every((c, i) => c.slot === i && c.tick === casts[0].tick), {
    got: casts.map((c) => `${c.slot}@${c.tick}`),
  });
  const k1 = r.events.length;
  r.step(1, (s) => {
    for (let i = 0; i < 8; i++) s.presses.push({ kind: `skill_${i + 1}`, slot: i });
  });
  const denies = r.since(k1).filter((e) => e.type === 'intent_denied' && e.reason === 'on_cooldown');
  check('slots', 'cooldown denial on all 8', denies.length === 8, { got: denies.map((d) => d.kind) });
  const full = mk(4);
  const draft = full.w.runSystem().cmd('draftPools', []);
  check('slots', 'free_skill_slots = 8 − owned (2 starting)', draft.free === 6, { got: draft.free });
  check('slots', 'draftable skill pool = 15', DRAFTABLE_SKILL_IDS.length === 15, { got: DRAFTABLE_SKILL_IDS.length });
  check('slots', 'node pool = 17', NODE_IDS.length === 17, { got: NODE_IDS.length });
  const empty = mk(5);
  const k2 = empty.events.length;
  empty.press(7);
  const d = empty.since(k2).find((e) => e.type === 'intent_denied');
  check('slots', 'empty slot 8 denies empty_slot', d && d.kind === 'skill_8' && d.reason === 'empty_slot', { got: d });
});

// ============================================================== G4a.2 ===
run('lantern_flurry', () => {
  const r = mk(6);
  const s = r.give('lantern_flurry');
  const k = r.events.length;
  r.setAim({ x: 5, z: 0 });
  r.press(s);
  const spawns = r.since(k).filter((e) => e.type === 'skill_bolt_spawn' && e.skill === 'lantern_flurry');
  check('lantern_flurry', '3 bolts', spawns.length === 3, { got: spawns.length });
  const angles = spawns.map((b) => Math.round((Math.atan2(b.dz, b.dx) * 180) / Math.PI));
  check('lantern_flurry', '12° fan (-12/0/+12)', JSON.stringify(angles.sort((a, b) => a - b)) === '[-12,0,12]', { got: angles });
  const b = r.registry.all().find((e) => e.kind === 'skillbolt' && e.skill === 'lantern_flurry');
  check('lantern_flurry', 'speed 5.6 u/s', near(Math.hypot(b.vx, b.vz) * 60, 5.6, 1e-9), { got: Math.hypot(b.vx, b.vz) * 60 });
  check('lantern_flurry', 'range 4.6, power 9', b.range === 4.6 && b.power === 9, { got: [b.range, b.power] });
  const r2 = mk(7);
  const s2 = r2.give('lantern_flurry');
  const dm = r2.dummy(2.5, 0);
  r2.setAim({ x: 2.5, z: 0 });
  const k2 = r2.events.length;
  r2.press(s2);
  r2.step(60);
  const hits = hitsOf(r2.since(k2), 'lantern_flurry');
  check('lantern_flurry', 'centre bolt hits for 9 (crit 13.5)', hits.length >= 1 && hits.every((h) => baseAmt(h, 9)), { got: hits.map((h) => h.amount) });
  check('lantern_flurry', 'cooldown 5.0 s = 300 ticks', r2.w.skillSlots()[s2].totalTicks === 300, { got: r2.w.skillSlots()[s2].totalTicks });
  void dm;
});

run('pale_lance', () => {
  const r = mk(8);
  const s = r.give('pale_lance');
  const d = [1.5, 2.5, 3.5, 4.5].map((x) => r.dummy(x, 0));
  r.setAim({ x: 6, z: 0 });
  const k = r.events.length;
  r.press(s);
  r.step(90);
  const hits = hitsOf(r.since(k), 'pale_lance');
  const ids = [...new Set(hits.map((h) => h.target))];
  check('pale_lance', 'pierces: resolves on exactly 3 bodies in line order', ids.length === 3 && ids[0] === d[0].id && ids[1] === d[1].id && ids[2] === d[2].id, { got: ids, want: d.slice(0, 3).map((e) => e.id) });
  check('pale_lance', 'full power 30 on each', hits.every((h) => baseAmt(h, 30)), { got: hits.map((h) => h.amount) });
  check('pale_lance', '4th body untouched', !hits.some((h) => h.target === d[3].id));
  const desp = r.since(k).find((e) => e.type === 'skill_bolt_despawn' && e.skill === 'pale_lance');
  check('pale_lance', 'spent on the 3rd impact', desp && desp.cause === 'impact', { got: desp && desp.cause });
  const r2 = mk(9);
  const s2 = r2.give('pale_lance');
  r2.setAim({ x: 6, z: 0 });
  r2.press(s2);
  const b = r2.registry.all().find((e) => e.kind === 'skillbolt' && e.skill === 'pale_lance');
  check('pale_lance', 'speed 6.5 u/s, range 6.0', near(Math.hypot(b.vx, b.vz) * 60, 6.5, 1e-9) && b.range === 6, { got: [Math.hypot(b.vx, b.vz) * 60, b.range] });
});

run('bell_toll', () => {
  const r = mk(10);
  const s = r.give('bell_toll');
  const inR = [0.5, 0.8, 1.0, 1.2, 1.4, 1.55].map((x, i) => r.dummy(Math.cos(i) * x, Math.sin(i) * x));
  const out = r.dummy(2.2, 0);
  const k = r.events.length;
  r.press(s);
  const hits = hitsOf(r.since(k), 'bell_toll');
  check('bell_toll', '20 to at most 5 targets', hits.length === 5 && hits.every((h) => baseAmt(h, 20)), { got: hits.map((h) => h.amount) });
  check('bell_toll', 'nearest 5 of 6 inside 1.6 u', hits.every((h) => inR.slice(0, 5).some((e) => e.id === h.target)), { got: hits.map((h) => h.target) });
  check('bell_toll', 'outside 1.6 u untouched', !hits.some((h) => h.target === out.id));
  r.step(1);
  const st = r.since(k).filter((e) => e.type === 'status_apply' && e.status === 'stun');
  check('bell_toll', 'stun applied to the 5 hit', st.length === 5, { got: st.length });
  const e0 = r.registry.byId(hits[0].target);
  check('bell_toll', 'stun lasts 30 ticks', e0.status.stun.untilTick - hits[0].tick === 30, { got: e0.status.stun.untilTick - hits[0].tick });
  check('bell_toll', 'cooldown 8 s', r.w.skillSlots()[s].totalTicks === 480, { got: r.w.skillSlots()[s].totalTicks });
});

run('rootsnare', () => {
  const r = mk(11);
  const s = r.give('rootsnare');
  const a = r.dummy(3, 0.5, 900);
  const b = r.dummy(3.9, 0.4, 900);
  const far = r.dummy(5.5, 0, 900);
  r.setAim({ x: 3, z: 0 });
  const k = r.events.length;
  r.press(s);
  r.step(60 * 5 + 5);
  const ev = r.since(k);
  const zt = ev.filter((e) => e.type === 'zone_tick' && e.skill === 'rootsnare');
  check('rootsnare', '5 zone ticks at 1.0 s cadence', zt.length === 5 && zt.every((t, i) => i === 0 || t.tick - zt[i - 1].tick === 60), { got: zt.map((t) => t.tick) });
  const ha = hitsOf(ev, 'rootsnare').filter((h) => h.target === a.id);
  check('rootsnare', '6 per zone tick on a body inside', ha.length === 5 && ha.every((h) => baseAmt(h, 6)), { got: ha.map((h) => h.amount) });
  check('rootsnare', 'radius 1.3 (0.92 u off-centre hit, 2.5 u not)', hitsOf(ev, 'rootsnare').some((h) => h.target === b.id) && !hitsOf(ev, 'rootsnare').some((h) => h.target === far.id));
  const sl = ev.filter((e) => e.type === 'status_apply' && e.status === 'slow' && e.id === a.id);
  check('rootsnare', 'slow 45% refreshed each zone tick (72 t)', sl.length === 5 && sl.every((x) => near(x.mag, 0.45)), { got: sl.map((x) => [x.mag, x.untilTick - x.tick]) });
  const boar = r.w.cmd('spawn', 'boar', 3, 0);
  const be = r.registry.byId(boar);
  STATUS.apply(be, 'slow', 0.45, 72, r.tick());
  check('rootsnare', 'speedMul on a slowed enemy = 0.55', near(STATUS.speedMul(be, r.tick()), 0.55), { got: STATUS.speedMul(be, r.tick()) });
});

run('dewfall', () => {
  const r = mk(12);
  const s = r.give('dewfall');
  r.pin([[1, 3, 0], [2, 3.8, 0.9], [3, 6, 0]]);
  const al = r.allies();
  for (const a of al) a.hp = a.maxHp * 0.3;
  r.setAim({ x: 3, z: 0 });
  const k = r.events.length;
  r.press(s);
  for (let i = 0; i < 310; i++) {
    r.pin([[1, 3, 0], [2, 3.8, 0.9], [3, 6, 0]]);
    r.step(1);
  }
  const ev = r.since(k);
  const zt = ev.filter((e) => e.type === 'zone_tick' && e.skill === 'dewfall');
  check('dewfall', '5 zone ticks (5 s)', zt.length === 5, { got: zt.length });
  const h1 = healsOf(ev, 'dewfall').filter((h) => h.target === al[0].id);
  check('dewfall', '7 per zone tick', h1.length === 5 && h1.every((h) => baseAmt(h, 7)), { got: h1.map((h) => h.amount) });
  check('dewfall', 'radius 1.5 (1.2 u in, 3 u out)', healsOf(ev, 'dewfall').some((h) => h.target === al[1].id) && !healsOf(ev, 'dewfall').some((h) => h.target === al[2].id));
});

run('kindred_shield', () => {
  const r = mk(13);
  const s = r.give('kindred_shield');
  r.pin([[1, 1, 0], [2, -1, 0], [3, 0, 1]]);
  const al = r.allies();
  al[1].hp = al[1].maxHp * 0.2;
  const k = r.events.length;
  r.press(s);
  const ev = r.since(k);
  const h = healsOf(ev, 'kindred_shield');
  check('kindred_shield', 'heals the neediest 16', h.length === 1 && h[0].target === al[1].id && baseAmt(h[0], 16), { got: h.map((x) => [x.target, x.amount]) });
  const sh = al[1].status && al[1].status.shield;
  check('kindred_shield', 'shield 20 for 240 ticks', sh && near(sh.mag, 20) && sh.untilTick - h[0].tick === 240, { got: sh });
  // Absorb order: 15 dmg -> shield 20 -> 5 left; HP untouched.
  const hp0 = al[1].hp;
  r.w.cmd('hitOnce', al[1].id); // 8 (or 12 crit)
  check('kindred_shield', 'shield absorbs before HP (numeral = HP delta)', al[1].hp === hp0 && al[1].status.shield.mag < 20, { got: [al[1].hp - hp0, al[1].status.shield.mag] });
  const ab = r.since(k).find((e) => e.type === 'shield_absorb');
  check('kindred_shield', 'shield_absorb event carries the absorbed share', ab && ab.absorbed > 0, { got: ab });
});

run('mending_tide', () => {
  const r = mk(14);
  const s = r.give('mending_tide');
  // aim +x; allies at 1.6 u inside ±70°, one behind.
  r.setAim({ x: 3, z: 0 });
  const place = [[1, 1.6 * Math.cos(1.1), 1.6 * Math.sin(1.1)], [2, 1.7, 0], [3, -1.2, 0]];
  r.pin(place);
  const al = r.allies();
  for (const a of al) a.hp = a.maxHp * 0.5;
  r.player.hp = 50;
  const k = r.events.length;
  r.press(s);
  const h = healsOf(r.since(k), 'mending_tide');
  const targets = h.map((x) => x.target);
  check('mending_tide', '12 per ally in the 70° / 1.8 u sweep', h.every((x) => baseAmt(x, 12)), { got: h.map((x) => x.amount) });
  check('mending_tide', 'caster + 63° + 0° allies in, the one behind out', targets.includes(r.player.id) && targets.includes(al[0].id) && targets.includes(al[1].id) && !targets.includes(al[2].id), { got: targets });
});

run('hearthsong', () => {
  const r = mk(15);
  const s = r.give('hearthsong');
  r.pin([[1, 1.9, 0], [2, -1, 0.5], [3, 2.5, 0]]);
  const al = r.allies();
  for (const a of al) a.hp = a.maxHp * 0.5;
  const k = r.events.length;
  r.press(s);
  const h = healsOf(r.since(k), 'hearthsong');
  check('hearthsong', '10 to each within 2.0 u (max 4)', h.length === 3 && h.every((x) => baseAmt(x, 10)), { got: h.map((x) => [x.target, x.amount]) });
  const t = al[0];
  check('hearthsong', 'haste 25% for 120 ticks', t.status && t.status.haste && near(t.status.haste.mag, 0.25) && t.status.haste.untilTick - h[0].tick === 120, { got: t.status && t.status.haste });
  check('hearthsong', 'hasted ally speedMul = 1.25', near(STATUS.speedMul(t, r.tick()), 1.25), { got: STATUS.speedMul(t, r.tick()) });
  // Player walk × haste (world PLAYER-SPEED).
  STATUS.apply(r.player, 'haste', 0.25, 120, r.tick());
  const x0 = r.player.x;
  r.step(30, (s2) => (s2.move = { x: 1, z: 0 }));
  const v = ((r.player.x - x0) / 30) * 60;
  check('hearthsong', 'hasted Healer walks 2.4 × 1.25 = 3.0 u/s', near(v, 3.0, 1e-6), { got: v });
});

run('quiet_hearth', () => {
  const r = mk(16);
  const s = r.give('quiet_hearth');
  r.pin([[1, 0.8, 0], [2, 0, 1.1], [3, 2.0, 0]]);
  const al = r.allies();
  for (const a of al) a.hp = a.maxHp * 0.5;
  const k = r.events.length;
  for (let i = 0; i < 125; i++) {
    r.pin([[1, 0.8, 0], [2, 0, 1.1], [3, 2.0, 0]]);
    r.step(1);
  }
  const ev = r.since(k);
  const pulses = ev.filter((e) => e.type === 'aura_pulse' && e.skill === 'quiet_hearth');
  check('quiet_hearth', 'pulses every 1.0 s', pulses.length === 2 && pulses[1].tick - pulses[0].tick === 60, { got: pulses.map((p) => p.tick) });
  const h = healsOf(ev, 'quiet_hearth');
  check('quiet_hearth', '2 per pulse to allies inside 1.2 u', h.length === 4 && h.every((x) => baseAmt(x, 2)) && !h.some((x) => x.target === al[2].id), { got: h.map((x) => [x.target, x.amount]) });
  const w0 = al[0].status && al[0].status.ward;
  check('quiet_hearth', 'ward 15% (72 ticks, pulse-refreshed)', w0 && near(w0.mag, 0.15) && w0.untilTick - pulses[1].tick === 72, { got: w0 });
  check('quiet_hearth', 'warded damage taken × 0.85', near(STATUS.damageTakenMul(al[0], r.tick()), 0.85), { got: STATUS.damageTakenMul(al[0], r.tick()) });
  const press = mk(17);
  const s2 = press.give('quiet_hearth');
  const k2 = press.events.length;
  press.press(s2);
  const d = press.since(k2).find((e) => e.type === 'intent_denied');
  check('quiet_hearth', 'a press on the passive is denied empty_slot', d && d.reason === 'empty_slot', { got: d });
});

// ============================================================ statuses ===
run('status', () => {
  const r = mk(18);
  const d = r.dummy(2, 0);
  const t = r.tick();
  STATUS.apply(d, 'stun', 1, 200, t);
  check('status', 'stun capped at 60 ticks', d.status.stun.untilTick - t === 60, { got: d.status.stun.untilTick - t });
  r.step(70);
  check('status', 'stun immunity 120 ticks after', STATUS.apply(d, 'stun', 1, 30, r.tick()) === null, { got: STATUS.refusal(d, 'stun', r.tick()) });
  r.step(115);
  check('status', 'stun lands again after the immunity', STATUS.apply(d, 'stun', 1, 30, r.tick()) !== null);
  check('status', 'slow magnitude cap 0.6', near(STATUS.apply(r.dummy(3, 1), 'slow', 0.9, 60, r.tick()).mag, 0.6));
  const party = r.player;
  check('status', 'stun refused on the party', STATUS.apply(party, 'stun', 1, 30, r.tick()) === null, { got: STATUS.refusal(party, 'stun', r.tick()) });
  check('status', 'haste refused on a hostile', STATUS.apply(d, 'haste', 0.2, 30, r.tick()) === null);
  const stag = { id: 999, kind: 'stag', faction: 'hostile', hp: 100 };
  check('status', 'boss immune to slow and stun', STATUS.apply(stag, 'slow', 0.4, 60, 0) === null && STATUS.apply(stag, 'stun', 1, 30, 0) === null);
  const e2 = r.dummy(4, 0);
  STATUS.apply(e2, 'slow', 0.3, 60, r.tick());
  STATUS.apply(e2, 'slow', 0.2, 200, r.tick());
  check('status', 'refresh = max(mag), max(expiry) — never stacks', near(e2.status.slow.mag, 0.3) && e2.status.slow.untilTick === r.tick() + 200, { got: e2.status.slow });
  // Pipeline order: inspired attacker, exposed target, ward, shield.
  const r2 = mk(19);
  const tgt = r2.dummy(1, 0, 1000);
  STATUS.apply(tgt, 'exposed', 0.2, 600, r2.tick());
  STATUS.apply(r2.player, 'inspired', 0.15, 600, r2.tick());
  const k = r2.events.length;
  const combat = r2.w;
  void combat;
  r2.w.cmd('critTest', 0);
  const h0 = r2.w.cmd('hitOnce', tgt.id);
  void h0;
  const hit = r2.since(k).find((e) => e.type === 'hit' && e.target === tgt.id);
  // hitOnce passes no attacker -> exposed only: 8 × 1.2 = 9.6 (crit 14.4)
  check('status', 'exposed +20% damage taken', hit && (near(hit.amount, 9.6) || near(hit.amount, 14.4)), { got: hit && hit.amount });
  check('status', 'status records are plain data (canonicalJSON)', (() => {
    try {
      canonicalJSON(r2.registry.all().map((e) => ({ id: e.id, status: e.status ?? null })));
      return true;
    } catch {
      return false;
    }
  })());
  const tr = mk(20);
  const dd = tr.dummy(2, 0);
  const k3 = tr.events.length;
  STATUS.apply(dd, 'slow', 0.4, 10, tr.tick());
  tr.step(1);
  tr.step(12);
  const ap = tr.since(k3).filter((e) => e.type === 'status_apply' && e.id === dd.id);
  const ex = tr.since(k3).filter((e) => e.type === 'status_expire' && e.id === dd.id);
  check('status', 'status_apply + status_expire announced once each', ap.length === 1 && ex.length === 1, { got: [ap.length, ex.length] });
});

// ============================================================== G4a.3 ===
// The §23.4 grey/live matrix, verbatim. L = live, G = GREY, I = inert, C = cap.
const COLS = ['bounce', 'siphon', 'echo', 'detonate', 'quicken', 'multiply', 'widen', 'reach', 'linger', 'snare', 'galvanize', 'bulwark', 'split', 'resonance'];
const MATRIX = {
  mending_bolt: 'LLLLLLGLGLLLLL',
  swift_mend: 'LLLLLLGLGLLLLL',
  nova_bloom: 'GLLLLLLGGLLLGL',
  sanctuary: 'GLLLLGLLLLLLGL',
  spirit_bolt: 'LLLLLLGLGLLLLL',
  warding_aura: 'GGLGGGLGGLLLGC',
  guardian_bond: 'LLLLLLGLGLLLLL',
  restorative_wave: 'GLLLLILLGLLLGL',
  lantern_flurry: 'LLLLLLGLGLLLLL',
  pale_lance: 'LLLLLLGLGLLLLL',
  bell_toll: 'GLLLLLLGLLLLGL',
  rootsnare: 'GLLLLGLLLLLLGL',
  dewfall: 'GLLLLGLLLLLLGL',
  kindred_shield: 'LLLLLLGLLLLLLL',
  mending_tide: 'GLLLLILLGLLLGL',
  hearthsong: 'GLLLLILGLLLLGL',
  quiet_hearth: 'GGLGGGLGGLLLGC',
};
run('matrix', () => {
  const r = mk(21);
  const b = r.w.buildSystem();
  for (const id of Object.keys(MATRIX)) if (!['mending_bolt', 'swift_mend'].includes(id)) r.w.cmd('giveSkill', id);
  // 2 starting + 6 more fit 8 slots; the matrix verdict itself needs no slot.
  let bad = [];
  let cells = 0;
  for (const [sk, row] of Object.entries(MATRIX)) {
    COLS.forEach((node, i) => {
      const want = row[i];
      const v = b.verdictFor(sk, node).state;
      cells += 1;
      const got = v === 'live' ? (want === 'C' ? 'C' : 'L') : v === 'grey' ? 'G' : v === 'inert' ? 'I' : '?';
      const ok = want === 'C' ? v === 'live' && NODES[node].rarity === 'legendary' : got === want;
      if (!ok) bad.push(`${sk}×${node}: want ${want} got ${v}`);
    });
  }
  check('matrix', `§23.4 grey/live/inert matrix (${cells} cells)`, bad.length === 0, { got: bad.slice(0, 12) });
  for (const sk of Object.keys(MATRIX)) {
    for (const node of ['sharpen', 'ascend', 'keen']) {
      if (b.verdictFor(sk, node).state !== 'live') bad.push(`${sk}×${node}`);
    }
  }
  check('matrix', 'Sharpen, Ascend and Keen live on every skill', bad.length === 0, { got: bad.slice(0, 8) });
});

// Behaviour of each new node through the real pipeline (every live cell class).
function withNode(seed, skill, node, slot = null) {
  const r = mk(seed);
  const s = r.slotOf(skill) >= 0 ? r.slotOf(skill) : r.give(skill);
  r.w.cmd('grantNode', node);
  const res = r.w.cmd('socket', skill, node, slot);
  return { r, s, res };
}
run('nodes', () => {
  // Widen: Bell Toll area 1.6 -> 2.0 (a body at 1.9 u now hit).
  {
    const { r, s } = withNode(30, 'bell_toll', 'widen');
    const d = r.dummy(1.9, 0);
    const k = r.events.length;
    r.press(s);
    check('nodes', 'Widen: nova area ×1.25 (1.6 → 2.0)', hitsOf(r.since(k), 'bell_toll').some((h) => h.target === d.id) && near(r.w.buildSystem().resolveDef(SKILLS.bell_toll).area, 2.0));
    const ra = withNode(31, 'restorative_wave', 'widen').r;
    const ra2 = ra.w.cmd('grantNode', 'widen');
    void ra2;
    ra.w.cmd('socket', 'restorative_wave', 'widen', 1);
    check('nodes', 'Widen on an arc: half-angle 55 → 82.5, clamp 90', near(ra.w.buildSystem().resolveDef(SKILLS.restorative_wave).area, Math.min(90, 55 * 1.5)), { got: ra.w.buildSystem().resolveDef(SKILLS.restorative_wave).area });
    const mt = withNode(32, 'mending_tide', 'widen').r;
    mt.w.cmd('grantNode', 'widen');
    mt.w.cmd('socket', 'mending_tide', 'widen', 1);
    check('nodes', 'Widen ×2 on Mending Tide clamps at 90°', near(mt.w.buildSystem().resolveDef(SKILLS.mending_tide).area, 90), { got: mt.w.buildSystem().resolveDef(SKILLS.mending_tide).area });
  }
  // Reach: Spirit Bolt range 4.8 -> 6.0.
  {
    const { r, s } = withNode(33, 'spirit_bolt', 'reach');
    r.press(s);
    const b = r.registry.all().find((e) => e.kind === 'skillbolt' && e.skill === 'spirit_bolt');
    check('nodes', 'Reach: bolt range ×1.25 (4.8 → 6.0)', b && near(b.range, 6.0), { got: b && b.range });
  }
  // Linger: Sanctuary 4 -> 6 zone ticks; Bell Toll stun 30 -> 45; Rootsnare 5 -> 8 (7.5 rounded).
  {
    const { r, s } = withNode(34, 'sanctuary', 'linger');
    r.setAim({ x: 1, z: 0 });
    r.press(s);
    const z = r.registry.all().find((e) => e.kind === 'zone');
    check('nodes', 'Linger: Sanctuary 4 → 6 zone ticks', z && z.totalTicks === 6, { got: z && z.totalTicks });
    const rs = withNode(35, 'rootsnare', 'linger');
    rs.r.setAim({ x: 1, z: 0 });
    rs.r.press(rs.s);
    const z2 = rs.r.registry.all().find((e) => e.kind === 'zone');
    check('nodes', 'Linger: Rootsnare 5 → 8 ticks (7.5 rounded to whole zone ticks)', z2 && z2.totalTicks === 8, { got: z2 && z2.totalTicks });
    const bt = withNode(36, 'bell_toll', 'linger');
    const d = bt.r.dummy(1, 0);
    bt.r.press(bt.s);
    check('nodes', 'Linger: Bell Toll stun 30 → 45 ticks', d.status && d.status.stun && d.status.stun.untilTick - d.status.stun.at === 45, { got: d.status && d.status.stun });
    const ks = withNode(37, 'kindred_shield', 'linger');
    check('nodes', 'Linger: Kindred Shield shield 240 → 360 ticks', ks.r.w.buildSystem().resolveDef(SKILLS.kindred_shield).status.ticks === 360);
  }
  // Keen: crit chance 0.05 -> 0.20 (measured over 4000 instances).
  {
    const { r } = withNode(38, 'spirit_bolt', 'keen');
    const rd = r.w.buildSystem().resolveDef(SKILLS.spirit_bolt);
    check('nodes', 'Keen: critBonus 0.15 on the resolved skill', near(rd.critBonus, 0.15), { got: rd.critBonus });
    // The pipeline really rolls against 0.05 + 0.15: one strict roll per
    // instance, measured over 20 000 instances on a fresh seeded stream.
    const cr = mk(99);
    const dd = cr.dummy(1, 0, 1e9);
    let crits = 0;
    const N = 20000;
    const combat = cr.w.runSystem ? null : null;
    void combat;
    const k = cr.events.length;
    for (let i = 0; i < N; i++) cr.w.runSystem().cmd('keenProbe', [dd.id, 0.15]);
    for (const e of cr.since(k)) if (e.type === 'hit' && e.target === dd.id && e.crit) crits += 1;
    const rate = crits / N;
    check('nodes', 'Keen: measured crit rate ≈ 0.20 over 20 000 instances', Math.abs(rate - 0.2) < 0.01, { got: rate });
  }
  // Snare: damage slows 40%/90; heal hastes 20%/90; passive slows 25%.
  {
    const { r, s } = withNode(39, 'spirit_bolt', 'snare');
    const d = r.dummy(2, 0);
    r.setAim({ x: 2, z: 0 });
    r.press(s);
    r.step(40);
    check('nodes', 'Snare on damage: hit enemy slowed 40% for 90 t', d.status && d.status.slow && near(d.status.slow.mag, 0.4), { got: d.status && d.status.slow });
    const h = withNode(40, 'swift_mend', 'snare');
    h.r.pin([[1, 1, 0], [2, -1, 0], [3, 0, 1]]);
    const al = h.r.allies();
    al[0].hp = 10;
    h.r.press(h.s);
    h.r.step(1);
    check('nodes', 'Snare on heal: healed ally hasted 20%', al[0].status && al[0].status.haste && near(al[0].status.haste.mag, 0.2), { got: al[0].status && al[0].status.haste });
    const p = withNode(41, 'warding_aura', 'snare');
    const e = p.r.dummy(0.5, 0);
    p.r.step(65);
    check('nodes', 'Snare on passive: enemies inside slowed 25%', e.status && e.status.slow && near(e.status.slow.mag, 0.25), { got: e.status && e.status.slow });
  }
  // Galvanize.
  {
    const { r, s } = withNode(42, 'spirit_bolt', 'galvanize');
    const d = r.dummy(2, 0);
    r.setAim({ x: 2, z: 0 });
    r.press(s);
    r.step(40);
    check('nodes', 'Galvanize on damage: exposed +20% 180 t', d.status && d.status.exposed && near(d.status.exposed.mag, 0.2), { got: d.status && d.status.exposed });
    const h = withNode(43, 'swift_mend', 'galvanize');
    const al = h.r.allies();
    h.r.pin([[1, 1, 0], [2, -1, 0], [3, 0, 1]]);
    al[1].hp = 10;
    h.r.press(h.s);
    h.r.step(1);
    check('nodes', 'Galvanize on heal: inspired +15%', al[1].status && al[1].status.inspired && near(al[1].status.inspired.mag, 0.15), { got: al[1].status && al[1].status.inspired });
    const p = withNode(44, 'warding_aura', 'galvanize');
    const pa = p.r.allies();
    for (let i = 0; i < 65; i++) {
      p.r.pin([[1, 0.5, 0], [2, 3, 0], [3, 3, 1]]);
      p.r.step(1);
    }
    check('nodes', 'Galvanize on passive: allies inside inspired +10%', pa[0].status && pa[0].status.inspired && near(pa[0].status.inspired.mag, 0.1), { got: pa[0].status && pa[0].status.inspired });
    // Inspired really multiplies damage dealt: an inspired ally's hit x1.15.
    STATUS.apply(r.player, 'inspired', 0.15, 600, r.tick());
    const d2 = r.dummy(1, 1, 999);
    const k = r.events.length;
    r.step(1);
    r.setAim({ x: 1, z: 1 });
    r.step(250);
    r.press(s);
    r.step(30);
    const hh = hitsOf(r.since(k), 'spirit_bolt').find((h) => h.target === d2.id);
    check('nodes', 'inspired attacker deals ×1.15 (18 → 20.7)', hh && (near(hh.amount, 18 * 1.15 * (d2.status && d2.status.exposed ? 1 : 1)) || near(hh.amount, 18 * 1.15 * 1.5) || near(hh.amount, 18 * 1.15 * 1.2) || near(hh.amount, 18 * 1.15 * 1.5 * 1.2)), { got: hh && hh.amount });
  }
  // Bulwark.
  {
    const { r, s } = withNode(45, 'spirit_bolt', 'bulwark');
    const d = r.dummy(2, 0);
    r.setAim({ x: 2, z: 0 });
    r.press(s);
    r.step(40);
    const sh = r.player.status && r.player.status.shield;
    check('nodes', 'Bulwark on damage: caster shield = 20% of final damage', sh && (near(sh.mag, 3.6) || near(sh.mag, 5.4)), { got: sh });
    void d;
    const h = withNode(46, 'swift_mend', 'bulwark');
    h.r.pin([[1, 1, 0], [2, -1, 0], [3, 0, 1]]);
    const al = h.r.allies();
    al[2].hp = al[2].maxHp - 4; // 14 heal, 4 applies -> overheal 10 -> shield min(10, 7) = 7
    for (const a of [al[0], al[1]]) a.hp = a.maxHp;
    h.r.player.hp = h.r.player.maxHp;
    h.r.press(h.s);
    h.r.step(1);
    const sh2 = al[2].status && al[2].status.shield;
    check('nodes', 'Bulwark on heal: overheal → shield ≤ 50% power (7)', sh2 && near(sh2.mag, 7), { got: sh2 });
    const p = withNode(47, 'warding_aura', 'bulwark');
    const pa = p.r.allies();
    for (let i = 0; i < 400; i++) {
      p.r.pin([[1, 0.5, 0], [2, 3, 0], [3, 3, 1]]);
      p.r.step(1);
    }
    check('nodes', 'Bulwark on passive: +2 per pulse, cap 10', pa[0].status && pa[0].status.shield && near(pa[0].status.shield.mag, 10), { got: pa[0].status && pa[0].status.shield });
  }
  // Split.
  {
    const { r, s } = withNode(48, 'spirit_bolt', 'split');
    const a = r.dummy(2, 0);
    const b = r.dummy(3.3, 0.9);
    r.setAim({ x: 2, z: 0 });
    const k = r.events.length;
    r.press(s);
    r.step(80);
    const ev = r.since(k);
    const sp = ev.find((e) => e.type === 'split_shard' && e.mode === 'damage');
    check('nodes', 'Split on damage: 2 shards on impact', sp && sp.shards.length === 2, { got: sp });
    const sh = hitsOf(ev, 'spirit_bolt:split');
    check('nodes', 'Split shard: 40% power (7.2), never the struck body', sh.length >= 1 && sh.every((h) => h.target !== a.id && (near(h.amount, 7.2) || near(h.amount, 10.8))), { got: sh.map((h) => [h.target, h.amount]) });
    void b;
    const h = withNode(49, 'swift_mend', 'split');
    h.r.pin([[1, 1, 0], [2, 1.5, 0.5], [3, -1, 0]]);
    const al = h.r.allies();
    for (const x of al) x.hp = x.maxHp * 0.5;
    h.r.player.hp = 10;
    const k2 = h.r.events.length;
    h.r.press(h.s);
    h.r.step(1);
    const sh2 = healsOf(h.r.since(k2), 'swift_mend:split');
    check('nodes', 'Split on heal: 2 nearest other allies ≤ 2.5 u get 40% (5.6)', sh2.length === 2 && sh2.every((x) => near(x.amount, 5.6) || near(x.amount, 8.4)), { got: sh2.map((x) => [x.target, x.amount]) });
    check('nodes', 'Split grey on a nova', h.r.w.buildSystem().verdictFor('nova_bloom', 'split').state === 'grey');
  }
  // Resonance: every 3rd cast ×2; not on passive; slot B only.
  {
    const { r, s, res } = withNode(50, 'spirit_bolt', 'resonance');
    check('nodes', 'Resonance sockets into slot B (legendary cap)', res && res.slot === 1, { got: res });
    const powers = [];
    for (let i = 0; i < 3; i++) {
      r.press(s);
      const b = r.registry.all().filter((e) => e.kind === 'skillbolt' && e.skill === 'spirit_bolt').pop();
      powers.push(b ? b.power : null);
      r.step(260);
    }
    check('nodes', 'Resonance: casts 1,2,3 = 18, 18, 36', JSON.stringify(powers) === '[18,18,36]', { got: powers });
    const p = mk(51);
    p.give('warding_aura');
    p.w.cmd('grantNode', 'resonance');
    const d = p.w.cmd('socket', 'warding_aura', 'resonance');
    check('nodes', 'Resonance unsocketable on a passive (cap)', d && d.denied === 'cap', { got: d });
    const a = mk(52);
    a.w.cmd('grantNode', 'resonance');
    const dA = a.w.cmd('socket', 'mending_bolt', 'resonance', 0);
    check('nodes', 'Resonance refused in slot A (rare cap)', dA && dA.denied === 'cap', { got: dA });
    r.w.cmd('resonance', 'spirit_bolt', 0);
    check('nodes', "cmd('resonance') sets the counter", r.w.buildSystem().resonanceCount('spirit_bolt') === 0);
  }
  // Limits: Widen 2 per skill, Linger 1.
  {
    const r = mk(53);
    r.give('bell_toll');
    for (let i = 0; i < 3; i++) r.w.cmd('grantNode', 'widen');
    r.w.cmd('socket', 'bell_toll', 'widen', 0);
    const second = r.w.cmd('socket', 'bell_toll', 'widen', 1);
    check('nodes', 'Widen limit 2 per skill (second copy fits)', second && !second.denied, { got: second });
    r.w.cmd('grantNode', 'linger');
    r.w.cmd('grantNode', 'linger');
    const r2 = mk(54);
    r2.give('bell_toll');
    r2.w.cmd('grantNode', 'linger');
    r2.w.cmd('grantNode', 'linger');
    r2.w.cmd('socket', 'bell_toll', 'linger', 0);
    const again = r2.w.cmd('socket', 'bell_toll', 'linger', 1);
    check('nodes', 'Linger limit 1 per skill', again && again.denied === 'limit', { got: again });
  }
  // Echo on a new skill (Bell Toll): recast 1.0 s later at 50%.
  {
    const { r, s } = withNode(55, 'bell_toll', 'echo');
    r.dummy(1, 0, 900);
    const k = r.events.length;
    r.press(s);
    r.step(70);
    const hits = hitsOf(r.since(k), 'bell_toll');
    check('nodes', 'Echo on Bell Toll: a 50% recast 60 ticks later', hits.length === 2 && (near(hits[1].amount, 10) || near(hits[1].amount, 15)) && hits[1].tick - hits[0].tick === 60, { got: hits.map((h) => [h.tick, h.amount]) });
  }
});

// ============================================================== G4a.5 ===
run('curve', () => {
  const T = [null, 1.0, 1.35, 1.75];
  let worst = 0;
  const rows = [];
  for (let act = 1; act <= 3; act++) {
    let prev = null;
    for (let room = 1; room <= 6; room++) {
      const d = difficulty(act, room, 'standard');
      const R = 1 + 0.08 * (room - 1);
      const want = { hpMul: T[act] * R, dmgMul: 1 + 0.5 * (T[act] * R - 1), budget: 4 * T[act] * R };
      for (const k of Object.keys(want)) worst = Math.max(worst, Math.abs(d[k] - want[k]) / want[k]);
      if (prev) {
        if (!(d.hpMul > prev.hpMul && d.dmgMul > prev.dmgMul && d.budget > prev.budget)) rows.push(`act ${act} room ${room} not increasing`);
      }
      prev = d;
    }
  }
  check('curve', 'difficulty() matches §4.2 within 1%', worst <= 0.01, { got: Math.round(worst * 1e6) / 1e6 });
  check('curve', 'strictly increasing across rooms', rows.length === 0, { got: rows });
  for (let room = 1; room <= 6; room++) {
    const a = [1, 2, 3].map((act) => difficulty(act, room).hpMul);
    if (!(a[0] < a[1] && a[1] < a[2])) rows.push(room);
  }
  check('curve', 'increasing across acts at equal room', rows.length === 0, { got: rows });
  // Rolled plans (the numbers spawns carry): startRun per act, skip rooms.
  const planRows = [];
  for (let act = 1; act <= 3; act++) {
    const r = mk(60 + act);
    r.w.runSystem().startRun({ act });
    for (let room = 1; room <= 6; room++) {
      if (room > 1) r.w.cmd('skipToRoom', room);
      const p = r.w.runSystem().roomPlan();
      const d = difficulty(act, room);
      const ok = near(p.hpMul, d.hpMul) && near(p.dmgMul, d.dmgMul) && near(p.budget, p.mode === 'defend' ? d.defendBudget : d.budget);
      const fillOk = p.waves.every((w) => w.cost <= w.budget + 0.5 + 1e-9 && w.size <= 8 && w.size >= 1);
      planRows.push({ act, room, mode: p.mode, layout: p.layoutId, hpMul: p.hpMul, budget: p.budget, waves: p.waves.map((w) => w.cost), ok: ok && fillOk });
    }
  }
  check('curve', 'every rolled room plan carries its §4.2 row and a legal budget fill', planRows.every((x) => x.ok), { got: planRows.filter((x) => !x.ok) });
  const layoutOk = planRows.every((x, i) => {
    const prev = planRows[i - 1];
    return !prev || prev.act !== x.act || prev.layout !== x.layout;
  });
  check('curve', 'no layout twice in a row; each act uses its own room table', layoutOk && planRows.every((x) => ({ 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9] })[x.act].includes(x.layout)), { got: planRows.map((x) => `${x.act}:${x.layout}`) });
  results.push({ group: 'curve', name: 'planRows', ok: true, planRows });
});

// ------------------------------------------------------------------ out --
mkdirSync(join(here, 'captures'), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify({ tool: 'gntM4a-simprobe', at: new Date().toISOString(), failed, total: results.length, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} checks pass -> ${OUT}`);
process.exit(failed ? 1 : 0);
