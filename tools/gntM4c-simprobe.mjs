#!/usr/bin/env node
// gntM4c — headless sim probe for the M4c content correction (docs/gauntlet/
// PLAN.md §4.3 + the M4c gates in §7): at most 4 skills, 8 node sockets on
// every skill, NO rarity caps, legendary passive reinterpretations, repetition
// limits, verdicts on all 8 sockets, the shared auto-fill policy, the node
// supply (clear spoils, 4-card shop at 15/20/25), the schema-1 -> 2 save
// migration (a GENUINE v1 file written by the pre-correction build) and
// single-player determinism. Builds the sim exactly like src/main.js.
//
//   node tools/gntM4c-simprobe.mjs [--out captures/gntM4c-simprobe.json] [--only group]
//        [--v1root <dir>]   a checkout of the pre-correction build (v0.5.39,
//                           git archive ebd0609) — default: the scratch export
//
// One line per check + a summary; exit 1 when any check fails.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const OUT = arg('out', 'captures/gntM4c-simprobe.json');
const ONLY = arg('only');
const uAt = (root, p) => pathToFileURL(join(root, p)).href;
const u = (p) => uAt(here, p);

const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { SKILLS, STARTING_SKILLS } = await import(u('src/sim/skills.js'));
const { NODES, SIPHON_CARD_LINE } = await import(u('src/sim/nodes.js'));
const { SKILL_SLOTS, SOCKETS_PER_SKILL } = await import(u('src/core/constants.js'));
const { NODE_IDS, PRICES, SHOP_SIZE, SPOILS_PER_CLEAR } = await import(u('src/sim/draft.js'));
const { scriptedInput } = await import(u('src/sim/script.js'));
const { hashState } = await import(u('src/core/hash.js'));
const { canonicalJSON } = await import(u('src/core/canonical.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { buildFile, parseFile, SCHEMA } = await import(u('src/save/codec.js'));
const DIFF = await import(u('src/data/difficulty.js'));

const results = [];
let failed = 0;
function check(group, name, ok, detail = {}) {
  results.push({ group, name, ok: !!ok, ...detail });
  if (!ok) failed += 1;
  const g = detail.got !== undefined ? `  got=${JSON.stringify(detail.got).slice(0, 400)}` : '';
  const w = detail.want !== undefined ? ` want=${JSON.stringify(detail.want).slice(0, 200)}` : '';
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${group}] ${name}${g}${w}`);
}
const run = (name, fn) => {
  if (ONLY && !name.includes(ONLY)) return;
  try {
    fn();
  } catch (err) {
    check(name, 'threw', false, { got: String(err && err.stack ? err.stack.split('\n').slice(0, 4).join(' | ') : err) });
  }
};

// ------------------------------------------------------------------ rig --
function rngHandle(seed) {
  let impl = createGameplayRng(seed >>> 0);
  return {
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
}
function mk(seed = 1, { room = null } = {}) {
  const rng = rngHandle(seed);
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const w = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room });
  // main.js @gnt:M4a WORLD-LAYERS autopilot wrapper
  const ap = w.runSystem().autopilot;
  const rawStep = w.step;
  w.step = (tick, snap, ...rest) => rawStep(tick, ap && ap.active() ? ap.intents(tick, snap) : snap, ...rest);
  const events = [];
  bus.on('*', (e) => {
    if (e.type !== 'sound') events.push(e);
  });
  const player = w.player;
  let aim = { x: player.x + 3, z: player.z };
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
  const b = () => w.buildSystem();
  const slotOf = (id) => w.skillSlots().findIndex((s) => s && s.id === id);
  const since = (k) => events.slice(k);
  const dummy = (x, z, hp = 500) => {
    parkAllies = true;
    const id = w.cmd('spawn', 'dummy', x, z);
    const e = registry.byId(id);
    e.hp = e.maxHp = hp;
    e.knockbackable = false;
    return e;
  };
  const io = createStateIO({ clock, rng, registry, world: w });
  // A kit of exactly these skills (slot order) with no cooldowns.
  function kit(ids) {
    const slots = new Array(SKILL_SLOTS).fill(null);
    ids.forEach((id, i) => (slots[i] = { id, remaining: 0 }));
    w.cmd('restoreSkillState', { slots, override: null });
    w.cmd('restoreBuildState', { bench: [], assignments: [] });
  }
  return { w, bus, clock, registry, rng, events, player, step, press, b, slotOf, since, dummy, io, kit, setAim: (a) => (aim = a), park: (on) => (parkAllies = on) };
}

// ============================================================ G4c.1 slots ===
run('slots', () => {
  const r = mk(3);
  check('slots', 'SKILL_SLOTS = 4', SKILL_SLOTS === 4, { got: SKILL_SLOTS });
  check('slots', 'SOCKETS_PER_SKILL = 8', SOCKETS_PER_SKILL === 8, { got: SOCKETS_PER_SKILL });
  check('slots', 'slot view has 4 entries', r.w.skillSlots().length === 4, { got: r.w.skillSlots().length });
  check('slots', 'player.skills mirror has 4 entries', r.player.skills.length === 4, { got: r.player.skills.length });
  check('slots', 'free_skill_slots = 4 − owned (2 starting)', r.w.cmd('draftPools').free === 2, { got: r.w.cmd('draftPools').free });
  r.w.cmd('giveSkill', 'nova_bloom');
  r.w.cmd('giveSkill', 'spirit_bolt');
  const fifth = r.w.cmd('giveSkill', 'guardian_bond');
  check('slots', 'a 5th skill is refused (no_free_slot)', fifth && fifth.error === 'no_free_slot', { got: fifth });
  const pools = r.w.cmd('draftPools');
  check('slots', '4 owned -> skill pool empty, free 0', pools.skill.length === 0 && pools.free === 0, { got: { skill: pools.skill.length, free: pools.free } });
  // keys 1-4 fire slots 0-3 on the press tick
  r.dummy(r.player.x + 2.2, r.player.z, 5000);
  r.setAim({ x: r.player.x + 2.2, z: r.player.z });
  const fired = [];
  for (let s = 0; s < 4; s++) {
    const k = r.events.length;
    const t0 = r.clock.tick + 1;
    r.press(s);
    const cast = r.since(k).find((e) => e.type === 'skill_cast' && e.slot === s);
    const denied = r.since(k).find((e) => e.type === 'intent_denied' && e.kind === `skill_${s + 1}`);
    fired.push(cast ? `${s}@${cast.tick - t0 + 1}` : denied ? `${s}:${denied.reason}` : `${s}:none`);
  }
  check('slots', 'keys 1-4 fire slots 0-3 on the press tick', fired.join() === '0@1,1@1,2@1,3@1', { got: fired });
  // skill_5..8 presses are inert: no event, no denial, no cast
  const k = r.events.length;
  r.step(1, (s) => {
    for (let i = 4; i < 8; i++) s.presses.push({ kind: `skill_${i + 1}`, slot: i });
  });
  const extra = r.since(k).filter((e) => /skill_[5-8]/.test(e.kind ?? '') || (e.type === 'skill_cast' && e.slot >= 4));
  check('slots', 'skill_5..8 presses do nothing (unbound)', extra.length === 0, { got: extra.map((e) => e.type) });
  // draft offer with 4 owned substitutes a node with the §16 line
  const run1 = mk(5);
  run1.w.runSystem().startRun({ act: 1 });
  run1.w.cmd('giveSkill', 'nova_bloom');
  run1.w.cmd('giveSkill', 'spirit_bolt');
  run1.w.cmd('killAllEnemies');
  for (let i = 0; i < 400 && run1.w.runSystem().view().phase === 'combat'; i++) {
    run1.step(1);
    run1.w.cmd('killAllEnemies');
  }
  const rv = run1.w.runSystem().view();
  check('slots', 'room-1 skill reward with 4 owned -> node substitute', rv.reward && rv.reward.type === 'node' && rv.reward.substituted && /no slot free/.test(rv.reward.line ?? ''), { got: rv.reward });
});

// ========================================================= G4c.2 sockets ===
const ALL_SKILLS = Object.keys(SKILLS);
run('sockets', () => {
  let ops = 0;
  let capDenials = 0;
  let otherDenials = [];
  let rowsOk = 0;
  for (let i = 0; i < ALL_SKILLS.length; i += 4) {
    const group = ALL_SKILLS.slice(i, i + 4);
    const r = mk(1);
    r.kit(group);
    for (const sk of r.b().view().skills) if (sk.sockets.length === 8) rowsOk += 1;
    for (const sid of group) {
      for (const nid of NODE_IDS) {
        for (let slot = 0; slot < 8; slot++) {
          r.w.cmd('grantNode', nid, 'probe');
          const res = r.w.cmd('socket', sid, nid, slot);
          ops += 1;
          if (res && res.denied) {
            if (res.denied === 'cap') capDenials += 1;
            else otherDenials.push(`${sid}/${nid}/${slot}:${res.denied}`);
          } else r.w.cmd('unsocket', sid, slot);
        }
      }
    }
    const capEv = r.events.filter((e) => e.type === 'socket_denied' && e.reason === 'cap').length;
    capDenials += capEv;
  }
  check('sockets', 'every skill (17) shows 8 sockets', rowsOk === ALL_SKILLS.length, { got: rowsOk, want: ALL_SKILLS.length });
  check('sockets', `any node of any rarity sockets into every socket of every skill (${ALL_SKILLS.length}×${NODE_IDS.length}×8)`, otherDenials.length === 0 && capDenials === 0, { got: { ops, capDenials, otherDenials: otherDenials.slice(0, 6) } });
  // legendaries on the passive, slot 0 and slot 7 alike
  const r = mk(1);
  r.kit(['mending_bolt', 'swift_mend', 'warding_aura', 'quiet_hearth']);
  for (const [sid, nid, slot] of [['warding_aura', 'ascend', 0], ['warding_aura', 'resonance', 7], ['quiet_hearth', 'resonance', 3], ['quiet_hearth', 'ascend', 6]]) {
    r.w.cmd('grantNode', nid);
    const res = r.w.cmd('socket', sid, nid, slot);
    check('sockets', `${nid} (legendary) sockets into ${sid} socket ${slot + 1}`, res && !res.denied && res.slot === slot && res.verdict === 'live', { got: res });
  }
  // repetition limits, per node, on a skill where it is live
  const lim = [];
  for (const nid of NODE_IDS) {
    const n = NODES[nid];
    const rr = mk(1);
    rr.kit(['spirit_bolt', 'mending_bolt', 'warding_aura', 'bell_toll']);
    const host = ['spirit_bolt', 'mending_bolt'].find((s) => rr.w.cmd('buildVerdict', s, nid).state !== 'grey') ?? 'spirit_bolt';
    let okN = 0;
    for (let c = 0; c < n.limit; c++) {
      rr.w.cmd('grantNode', nid);
      const res = rr.w.cmd('socket', host, nid, null);
      if (res && !res.denied) okN += 1;
    }
    rr.w.cmd('grantNode', nid);
    const over = rr.w.cmd('socket', host, nid, null);
    const ev = rr.events.filter((e) => e.type === 'socket_denied').pop();
    lim.push({ nid, limit: n.limit, okN, over: over && over.denied, ev: ev && ev.reason });
  }
  const badLim = lim.filter((l) => l.okN !== l.limit || l.over !== 'limit' || l.ev !== 'limit');
  check('sockets', 'repetition limit per skill holds for all 17 nodes (limit+1 -> "limit")', badLim.length === 0, { got: badLim.length ? badLim : lim.map((l) => `${l.nid}:${l.limit}`) });
  // full row / bad slot / combat
  const f = mk(1);
  f.kit(['spirit_bolt', 'mending_bolt']);
  const eight = ['sharpen', 'sharpen', 'quicken', 'quicken', 'multiply', 'ascend', 'bounce', 'echo'];
  for (const nid of eight) {
    f.w.cmd('grantNode', nid);
    f.w.cmd('socket', 'spirit_bolt', nid, null);
  }
  const row = f.b().view().skills.find((s) => s.id === 'spirit_bolt');
  check('sockets', '8 nodes fill Spirit Bolt\'s 8 sockets', row.filled === 8 && row.live === 8, { got: { filled: row.filled, live: row.live } });
  f.w.cmd('grantNode', 'detonate');
  const full = f.w.cmd('socket', 'spirit_bolt', 'detonate', null);
  check('sockets', 'a 9th node on a full row -> "full"', full && full.denied === 'full', { got: full });
  const bad = f.w.cmd('socket', 'mending_bolt', 'detonate', 8);
  check('sockets', 'socket index 8 -> "no_such_slot"', bad && bad.denied === 'no_such_slot', { got: bad });
  const swap = f.w.cmd('socket', 'spirit_bolt', 'detonate', 7);
  const benchNow = f.b().view().bench.map((x) => x.node);
  check('sockets', 'explicit socket on a filled cell swaps (old node banks)', swap && !swap.denied && swap.slot === 7 && benchNow.includes('echo'), { got: { swap, bench: benchNow } });
  const c = mk(2);
  c.w.runSystem().startRun({ act: 1 });
  c.w.cmd('grantNode', 'sharpen');
  const inCombat = c.w.cmd('socket', 'mending_bolt', 'sharpen', 3);
  check('sockets', 'socketing in live combat -> "combat_active"', inCombat && inCombat.denied === 'combat_active', { got: inCombat });
  const allReasons = new Set();
  for (const rr of [f, c]) for (const e of rr.events) if (e.type === 'socket_denied') allReasons.add(e.reason);
  check('sockets', 'no socket_denied ever carries a rarity-cap reason', !allReasons.has('cap'), { got: [...allReasons] });
});

// =================================================== G4c.3 passive legendaries ===
run('passive', () => {
  // Ascend on Warding Aura: every pulse heals 3 x 2 = 6 (crit 9).
  const heals = (r, src) => r.events.filter((e) => e.type === 'heal' && e.source === src);
  const pulseSetup = (ids) => {
    const r = mk(4);
    r.kit(ids);
    // one ally inside the aura (0.9 u), the rest parked far away
    r.w.cmd('placeAlly', 1, r.player.x + 0.4, r.player.z);
    r.w.cmd('placeAlly', 2, -10.5, 6.8);
    r.w.cmd('placeAlly', 3, -9.4, 6.8);
    const tank = r.registry.all().find((e) => e.partyIndex === 1);
    return { r, tank };
  };
  {
    const { r, tank } = pulseSetup(['mending_bolt', 'swift_mend', 'warding_aura']);
    r.w.cmd('grantNode', 'ascend');
    const s = r.w.cmd('socket', 'warding_aura', 'ascend', 4);
    const k = r.events.length;
    for (let t = 0; t < 360; t++) {
      tank.hp = Math.max(1, tank.maxHp - 60); // keep a deficit so every heal applies
      r.w.cmd('placeAlly', 1, r.player.x + 0.4, r.player.z);
      r.step(1);
    }
    const hs = r.events.slice(k).filter((e) => e.type === 'heal' && e.source === 'warding_aura');
    const amts = hs.map((h) => h.amount);
    check('passive', 'Ascend on Warding Aura: pulses heal 6 (×2 of 3; crit 9)', s && !s.denied && hs.length >= 5 && amts.every((a) => a === 6 || a === 9), { got: { socket: s, amounts: amts } });
    const p = r.w.cmd('buildPreview', 'warding_aura', 'ascend');
    check('passive', 'Ascend preview on the passive reads the stat line', p && p.verdict.state === 'live' && /power 3 → 6/.test(p.lines.join(' ')), { got: p });
  }
  {
    const { r, tank } = pulseSetup(['mending_bolt', 'swift_mend', 'warding_aura']);
    r.w.cmd('grantNode', 'resonance');
    const s = r.w.cmd('socket', 'warding_aura', 'resonance', 7);
    const k = r.events.length;
    for (let t = 0; t < 60 * 6 + 5; t++) {
      tank.hp = Math.max(1, tank.maxHp - 60);
      r.w.cmd('placeAlly', 1, r.player.x + 0.4, r.player.z);
      r.step(1);
    }
    const evs = r.events.slice(k);
    const pulses = evs.filter((e) => e.type === 'aura_pulse' && e.skill === 'warding_aura');
    const procs = evs.filter((e) => e.type === 'resonance_proc' && e.skill === 'warding_aura');
    const hs = evs.filter((e) => e.type === 'heal' && e.source === 'warding_aura');
    // base 3 (crit 4.5); resonant 6 (crit 9)
    const pattern = hs.map((h) => (h.amount >= 6 ? 'x2' : 'x1'));
    const want = pulses.map((_, i) => ((i + 1) % 3 === 0 ? 'x2' : 'x1'));
    check('passive', 'Resonance on Warding Aura: every 3rd pulse heals ×2', s && !s.denied && pulses.length >= 6 && procs.length === Math.floor(pulses.length / 3) && procs.every((p) => p.pulse === true) && pattern.join() === want.join(), { got: { socket: s, pulses: pulses.length, procs: procs.map((p) => p.n), pattern } });
    const v = r.w.cmd('buildVerdict', 'warding_aura', 'resonance');
    check('passive', 'Resonance verdict on a passive = live (pulse)', v.state === 'live' && v.reason === 'pulse', { got: v });
    const p = r.w.cmd('buildPreview', 'quiet_hearth', 'resonance');
    check('passive', 'Resonance preview on a passive: "every 3rd pulse …×2"', p && /every 3rd pulse resolves at ×2/.test(p.lines.join(' ')) && !/caps/.test(p.lines.join(' ')), { got: p && p.lines });
  }
  {
    // Echo's Reapply bonus pulses never advance the passive's Resonance count.
    const { r, tank } = pulseSetup(['mending_bolt', 'swift_mend', 'warding_aura']);
    r.w.cmd('grantNode', 'resonance');
    r.w.cmd('grantNode', 'echo');
    r.w.cmd('socket', 'warding_aura', 'resonance', 0);
    r.w.cmd('socket', 'warding_aura', 'echo', 1);
    const k = r.events.length;
    for (let t = 0; t < 60 * 7; t++) {
      tank.hp = Math.max(1, tank.maxHp - 60);
      r.w.cmd('placeAlly', 1, r.player.x + 0.4, r.player.z);
      r.step(1);
    }
    const evs = r.events.slice(k);
    const regular = evs.filter((e) => e.type === 'aura_pulse' && e.skill === 'warding_aura' && !e.echo).length;
    const bonus = evs.filter((e) => e.type === 'aura_pulse' && e.skill === 'warding_aura' && e.echo).length;
    const count = r.b().resonanceCount('warding_aura');
    check('passive', 'Echo Reapply pulses do not advance the passive Resonance counter', bonus >= 1 && count === regular, { got: { regular, bonus, count } });
  }
});

// ================================================ G4c.4 verdicts on all 8 ===
// The §23.4 matrix with the cap column corrected (Resonance live on passives).
const LIVE = 'live';
const G = 'grey';
const I = 'inert';
const MATRIX = {
  // Bounce Siphon Echo Detonate Quicken Multiply Widen Reach Linger Snare Galvanize Bulwark Split Resonance
  mending_bolt: [LIVE, LIVE, LIVE, LIVE, LIVE, LIVE, G, LIVE, G, LIVE, LIVE, LIVE, LIVE, LIVE],
  swift_mend: [LIVE, LIVE, LIVE, LIVE, LIVE, LIVE, G, LIVE, G, LIVE, LIVE, LIVE, LIVE, LIVE],
  nova_bloom: [G, LIVE, LIVE, LIVE, LIVE, LIVE, LIVE, G, G, LIVE, LIVE, LIVE, G, LIVE],
  sanctuary: [G, LIVE, LIVE, LIVE, LIVE, G, LIVE, LIVE, LIVE, LIVE, LIVE, LIVE, G, LIVE],
  spirit_bolt: [LIVE, LIVE, LIVE, LIVE, LIVE, LIVE, G, LIVE, G, LIVE, LIVE, LIVE, LIVE, LIVE],
  warding_aura: [G, G, LIVE, G, G, G, LIVE, G, G, LIVE, LIVE, LIVE, G, LIVE],
  guardian_bond: [LIVE, LIVE, LIVE, LIVE, LIVE, LIVE, G, LIVE, G, LIVE, LIVE, LIVE, LIVE, LIVE],
  restorative_wave: [G, LIVE, LIVE, LIVE, LIVE, I, LIVE, LIVE, G, LIVE, LIVE, LIVE, G, LIVE],
  lantern_flurry: [LIVE, LIVE, LIVE, LIVE, LIVE, LIVE, G, LIVE, G, LIVE, LIVE, LIVE, LIVE, LIVE],
  pale_lance: [LIVE, LIVE, LIVE, LIVE, LIVE, LIVE, G, LIVE, G, LIVE, LIVE, LIVE, LIVE, LIVE],
  bell_toll: [G, LIVE, LIVE, LIVE, LIVE, LIVE, LIVE, G, LIVE, LIVE, LIVE, LIVE, G, LIVE],
  rootsnare: [G, LIVE, LIVE, LIVE, LIVE, G, LIVE, LIVE, LIVE, LIVE, LIVE, LIVE, G, LIVE],
  dewfall: [G, LIVE, LIVE, LIVE, LIVE, G, LIVE, LIVE, LIVE, LIVE, LIVE, LIVE, G, LIVE],
  kindred_shield: [LIVE, LIVE, LIVE, LIVE, LIVE, LIVE, G, LIVE, LIVE, LIVE, LIVE, LIVE, LIVE, LIVE],
  mending_tide: [G, LIVE, LIVE, LIVE, LIVE, I, LIVE, LIVE, G, LIVE, LIVE, LIVE, G, LIVE],
  hearthsong: [G, LIVE, LIVE, LIVE, LIVE, I, LIVE, G, LIVE, LIVE, LIVE, LIVE, G, LIVE],
  quiet_hearth: [G, G, LIVE, G, G, G, LIVE, G, G, LIVE, LIVE, LIVE, G, LIVE],
};
const COLS = ['bounce', 'siphon', 'echo', 'detonate', 'quicken', 'multiply', 'widen', 'reach', 'linger', 'snare', 'galvanize', 'bulwark', 'split', 'resonance'];
run('verdicts', () => {
  let cells = 0;
  const wrong = [];
  const ids = Object.keys(MATRIX);
  for (let i = 0; i < ids.length; i += 4) {
    const group = ids.slice(i, i + 4);
    const r = mk(1);
    r.kit(group);
    for (const sid of group) {
      COLS.forEach((nid, c) => {
        for (const slot of [0, 3, 7]) {
          r.w.cmd('grantNode', nid);
          const res = r.w.cmd('socket', sid, nid, slot);
          const v = r.b().view().skills.find((s) => s.id === sid).sockets[slot];
          cells += 1;
          if (!res || res.denied || !v || v.verdict !== MATRIX[sid][c]) wrong.push(`${sid}/${nid}@${slot + 1}:${v ? v.verdict : res && res.denied}≠${MATRIX[sid][c]}`);
          r.w.cmd('unsocket', sid, slot);
        }
      });
      for (const nid of ['sharpen', 'ascend', 'keen']) {
        for (const slot of [1, 6]) {
          r.w.cmd('grantNode', nid);
          r.w.cmd('socket', sid, nid, slot);
          const v = r.b().view().skills.find((s) => s.id === sid).sockets[slot];
          cells += 1;
          if (!v || v.verdict !== LIVE) wrong.push(`${sid}/${nid}@${slot + 1}:${v && v.verdict}`);
          r.w.cmd('unsocket', sid, slot);
        }
      }
    }
  }
  check('verdicts', `the corrected §23.4 matrix holds on sockets 1, 4 and 8 (+ Sharpen/Ascend/Keen live everywhere) — ${Object.keys(MATRIX).length} skills`, wrong.length === 0, { got: wrong.length ? wrong.slice(0, 8) : cells });
  // a technique fires from the 8th socket
  const r = mk(6);
  r.kit(['spirit_bolt', 'mending_bolt']);
  r.park(true);
  const a = r.dummy(r.player.x + 2.0, r.player.z, 5000);
  r.dummy(r.player.x + 3.2, r.player.z + 0.4, 5000);
  r.setAim({ x: a.x, z: a.z });
  for (const [nid, slot] of [['bounce', 7], ['siphon', 5]]) {
    r.w.cmd('grantNode', nid);
    r.w.cmd('socket', 'spirit_bolt', nid, slot);
  }
  const k = r.events.length;
  r.press(0);
  r.step(90);
  const evs = r.since(k);
  const hop = evs.find((e) => e.type === 'bounce_hop' && e.skill === 'spirit_bolt');
  const sip = evs.find((e) => e.type === 'siphon_selfheal' && e.skill === 'spirit_bolt');
  check('verdicts', 'Bounce in socket 8 and Siphon in socket 6 fire on a cast', !!hop && !!sip, { got: { hop: !!hop, siphon: !!sip } });
  // Siphon card line on every owned skill's preview, whatever the socket
  const q = mk(1);
  q.kit(['mending_bolt', 'spirit_bolt', 'warding_aura', 'bell_toll']);
  const lines = ['mending_bolt', 'spirit_bolt', 'warding_aura', 'bell_toll'].map((sid) => q.w.cmd('buildPreview', sid, 'siphon').lines.includes(SIPHON_CARD_LINE));
  check('verdicts', 'the Siphon card line rides every preview (grey passive included)', lines.every(Boolean), { got: lines });
  // saturation-inert in socket 6
  const m = mk(1);
  m.kit(['mending_tide', 'mending_bolt']);
  m.w.cmd('grantNode', 'multiply');
  m.w.cmd('socket', 'mending_tide', 'multiply', 5);
  const mv = m.b().view().skills.find((s) => s.id === 'mending_tide').sockets[5];
  const mp = m.w.cmd('buildPreview', 'mending_tide', 'multiply');
  check('verdicts', 'Multiply on Mending Tide in socket 6 = saturation-inert "+0"', mv.verdict === 'inert' && /currently \+0/.test(mp.lines[0]), { got: { mv, lines: mp.lines } });
});

// ================================================== G4c.5 auto-fill policy ===
run('autofill', () => {
  const mkFill = () => {
    const r = mk(1);
    r.kit(['mending_bolt', 'spirit_bolt', 'warding_aura', 'bell_toll']);
    const grant = ['sharpen', 'sharpen', 'sharpen', 'quicken', 'bounce', 'bounce', 'bounce', 'split', 'widen', 'widen', 'reach', 'echo', 'siphon', 'multiply', 'resonance', 'ascend', 'linger', 'keen', 'snare', 'galvanize', 'bulwark', 'detonate'];
    for (const n of grant) r.w.cmd('grantNode', n);
    return r;
  };
  const r = mkFill();
  const res = r.w.cmd('autoFill');
  const v = r.b().view();
  const placements = v.skills.flatMap((s) => s.sockets.map((x, i) => (x ? { skill: s.id, node: x.node, verdict: x.verdict, slot: i } : null)).filter(Boolean));
  const allLive = placements.every((p) => p.verdict === 'live');
  const limitsOk = v.skills.every((s) => Object.entries(s.sockets.filter(Boolean).reduce((m, x) => ((m[x.node] = (m[x.node] ?? 0) + 1), m), {})).every(([n, c]) => c <= NODES[n].limit));
  const fills = v.skills.map((s) => s.filled);
  check('autofill', 'autoFill places only LIVE nodes within their limits', allLive && limitsOk && res.socketed.length === placements.length, { got: { socketed: res.socketed.length, placements: placements.length, allLive, limitsOk } });
  check('autofill', 'autoFill spreads the bench over the kit (fills per skill)', Math.max(...fills) - Math.min(...fills) <= 3 && Math.min(...fills) >= 3, { got: fills });
  const left = v.bench.map((x) => x.node);
  const leftUsable = left.filter((n) => v.skills.some((s) => s.sockets.includes(null) && r.w.cmd('buildVerdict', s.id, n).state === 'live' && s.sockets.filter((x) => x && x.node === n).length < NODES[n].limit));
  check('autofill', 'nothing left on the bench that autoFill could still place live', leftUsable.length === 0, { got: { left, leftUsable } });
  const r2 = mkFill();
  r2.w.cmd('autoFill');
  check('autofill', 'autoFill is deterministic (same bench -> same build)', canonicalJSON(r2.b().view()) === canonicalJSON(v), {});
  const c = mk(2);
  c.w.runSystem().startRun({ act: 1 });
  c.w.cmd('grantNode', 'sharpen');
  const inCombat = c.w.cmd('autoFill');
  check('autofill', 'autoFill refused in live combat', inCombat && inCombat.denied === 'combat_active', { got: inCombat });
});

// ================================================== G4c.6 node supply ===
function clearRoom(r, maxTicks = 2400) {
  for (let i = 0; i < maxTicks && r.w.runSystem().view().phase === 'combat'; i++) {
    r.w.cmd('killAllEnemies');
    r.step(1);
  }
}
run('supply', () => {
  const r = mk(11);
  r.w.runSystem().startRun({ act: 1 });
  clearRoom(r);
  const drop = r.events.find((e) => e.type === 'spoils_drop');
  const bench = r.b().view().bench;
  const spoilsOnBench = bench.filter((b) => b.provenance === 'spoils');
  check('supply', `a combat clear drops ${SPOILS_PER_CLEAR} spoils nodes on the bench`, drop && drop.nodes.length === SPOILS_PER_CLEAR && spoilsOnBench.length === SPOILS_PER_CLEAR, { got: { drop, bench } });
  check('supply', 'spoils are commons/rares, distinct', drop && drop.nodes.every((n) => NODES[n].rarity !== 'legendary') && new Set(drop.nodes).size === drop.nodes.length, { got: drop && drop.nodes.map((n) => `${n}:${NODES[n].rarity}`) });
  const rv = r.w.runSystem().view();
  check('supply', 'the reward page names the spoils (run view)', rv.phase === 'reward' && rv.spoils && rv.spoils.room === 1 && rv.spoils.nodes.length === SPOILS_PER_CLEAR, { got: rv.spoils });
  const spoilsIdx = r.events.findIndex((e) => e.type === 'spoils_drop');
  const offerIdx = r.events.findIndex((e) => e.type === 'reward_offer');
  check('supply', 'draw order: stipend -> spoils -> reward', spoilsIdx > 0 && offerIdx > spoilsIdx && r.events.findIndex((e) => e.type === 'glint_gain') < spoilsIdx, { got: { spoilsIdx, offerIdx } });
  // defend soft-fail forfeits the spoils with the reward
  const d = mk(12);
  d.w.runSystem().startRun({ act: 1 });
  const dm = d.w.runSystem().view().frame.defendAt[0];
  d.w.cmd('skipToRoom', dm);
  for (let i = 0; i < 30; i++) d.step(1);
  const ws = d.registry.all().find((e) => e.kind === 'waystone');
  if (ws) d.registry.despawn(ws.id);
  const k = d.events.length;
  clearRoom(d, 4000);
  const dEv = d.since(k);
  check('supply', 'a defend soft-fail forfeits the spoils', !!ws && dEv.some((e) => e.type === 'reward_forfeited') && !dEv.some((e) => e.type === 'spoils_drop'), { got: { waystone: !!ws, types: [...new Set(dEv.map((e) => e.type))].slice(0, 30) } });
  // the 4-card shop at 15/20/25 and the invariants
  const s = mk(13);
  s.w.runSystem().startRun({ act: 1 });
  s.w.cmd('skipToRoom', 7);
  const sv = s.w.runSystem().view();
  const stock = sv.shop ? sv.shop.stock : [];
  check('supply', `shop shelf = ${SHOP_SIZE} cards, 2 common + 1 rare + 1 legendary at 15/15/20/25`, stock.length === 4 && stock.map((x) => `${x.rarity}:${x.price}`).join() === 'common:15,common:15,rare:20,legendary:25', { got: stock.map((x) => `${x.node}:${x.rarity}:${x.price}`) });
  const prices = stock.map((x) => x.price);
  const total = prices.reduce((a, b2) => a + b2, 0);
  const max3 = total - Math.min(...prices);
  check('supply', '§14 invariants: wallet 72; all four 75 > 72; any three ≤ 72', sv.wallet === 72 && total === 75 && total > 72 && max3 <= 72, { got: { wallet: sv.wallet, total, max3, PRICES } });
  s.w.cmd('autopilot', true);
  s.step(3);
  const bought = s.events.filter((e) => e.type === 'shop_purchase').length;
  check('supply', 'the default-build autopilot buys three cards (cheapest first) and advances', bought === 3 && s.w.runSystem().view().wallet === 72 - 50, { got: { bought, wallet: s.w.runSystem().view().wallet } });
  // A whole autopilot run (Act I, seeds 1-3): how full are the sockets at the boss?
  const fills = [];
  for (const seed of [1, 2, 3]) {
    const a = mk(seed);
    a.w.runSystem().startRun({ act: 1 });
    a.w.cmd('autopilot', true);
    let bossFill = null;
    let got = { spoils: 0, drafted: 0, purchased: 0 };
    a.bus.on('node_granted', (e) => (got[e.provenance] = (got[e.provenance] ?? 0) + 1));
    for (let t = 0; t < 60 * 60 * 25; t++) {
      a.step(1);
      const v = a.w.runSystem().view();
      if (v.room === 8 && bossFill === null) {
        const bv = a.b().view();
        bossFill = { skills: bv.skills.length, sockets: bv.skills.length * 8, filled: bv.skills.reduce((x, y) => x + y.filled, 0), bench: bv.bench.length, perSkill: bv.skills.map((y) => `${y.id}:${y.filled}`) };
      }
      if (!v.active) break;
    }
    fills.push({ seed, outcome: a.w.runSystem().view().summary?.outcome ?? a.w.runSystem().view().phase, got, bossFill });
  }
  const ok = fills.every((f) => f.bossFill && f.bossFill.filled >= 0.5 * f.bossFill.sockets);
  check('supply', 'autopilot Act I runs reach the boss with ≥ 50% of the owned sockets filled', ok, { got: fills });
});

// ============================================= G4a.5 curve (M4c retune) ===
run('curve', () => {
  // BUILD_BRIEF §23.2 M4c table (hpMul / dmgMul / kill_all budget), T 1.00 /
  // 1.15 / 1.75, slope 0.16; Stag 2400·T, Stag dmg 1 + 0.7(T − 1).
  const TABLE = {
    1: [[1, 1, 4], [1.16, 1.08, 4.64], [1.32, 1.16, 5.28], [1.48, 1.24, 5.92], [1.64, 1.32, 6.56], [1.8, 1.4, 7.2]],
    2: [[1.15, 1.075, 4.6], [1.334, 1.167, 5.336], [1.518, 1.259, 6.072], [1.702, 1.351, 6.808], [1.886, 1.443, 7.544], [2.07, 1.535, 8.28]],
    3: [[1.75, 1.375, 7], [2.03, 1.515, 8.12], [2.31, 1.655, 9.24], [2.59, 1.795, 10.36], [2.87, 1.935, 11.48], [3.15, 2.075, 12.6]],
  };
  const BOSS = { 1: [2400, 1], 2: [2760, 1.105], 3: [4200, 1.525] };
  {
    const m = DIFF;
    const bad = [];
    for (const act of [1, 2, 3])
      for (let room = 1; room <= 6; room++) {
        const d = m.difficulty(act, room);
        const [h, dm, b] = TABLE[act][room - 1];
        for (const [got, want, k] of [[d.hpMul, h, 'hp'], [d.dmgMul, dm, 'dmg'], [d.budget, b, 'budget']])
          if (Math.abs(got - want) > want * 0.01) bad.push(`${act}/${room}/${k}:${got}≠${want}`);
      }
    for (const act of [1, 2, 3]) {
      const d = m.difficulty(act, 8);
      if (d.bossHp !== BOSS[act][0] || Math.abs(d.bossDmgMul - BOSS[act][1]) > 1e-9) bad.push(`boss${act}:${d.bossHp}/${d.bossDmgMul}`);
    }
    check('curve', 'difficulty() = the M4c §23.2 table ±1% (18 rooms × hp/dmg/budget + 3 Stags)', bad.length === 0, { got: bad });
    let mono = true;
    for (const act of [1, 2, 3]) for (let r = 2; r <= 6; r++) if (!(m.difficulty(act, r).hpMul > m.difficulty(act, r - 1).hpMul)) mono = false;
    for (let r = 1; r <= 6; r++) if (!(m.difficulty(1, r).hpMul < m.difficulty(2, r).hpMul && m.difficulty(2, r).hpMul < m.difficulty(3, r).hpMul)) mono = false;
    check('curve', 'strictly increasing across rooms within an act and across acts at equal room', mono, {});
    const r3 = mk(4);
    r3.w.runSystem().startRun({ act: 3 });
    const plan = r3.w.cmd('roomPlan');
    check('curve', 'a live Act III room 1 runs on the table (roomPlan hpMul 1.75, dmgMul 1.375)', plan && Math.abs(plan.hpMul - 1.75) < 1e-9 && Math.abs(plan.dmgMul - 1.375) < 1e-9, { got: plan && { hpMul: plan.hpMul, dmgMul: plan.dmgMul, budget: plan.budget } });
  }
});

// ======================================================= G4c.7 migration ===
// The pre-correction build (v0.5.39 = commit ebd0609: 8 skill slots, 2-socket
// rows, save schema 1). Exported once with `git archive` into captures/ (git-
// ignored) unless --v1root names another checkout.
const V1ROOT = resolve(here, arg('v1root', 'captures/gntM4c-v1root'));
if (!existsSync(join(V1ROOT, 'src', 'save', 'codec.js'))) {
  try {
    mkdirSync(V1ROOT, { recursive: true });
    const tarFile = join(V1ROOT, '..', 'gntM4c-v1root.tar');
    execFileSync('git', ['archive', '--format=tar', '-o', tarFile, 'ebd0609', 'src', 'package.json'], { cwd: here });
    // relative paths: a Windows drive letter reads as a remote host to some tars
    execFileSync('tar', ['-xf', '../gntM4c-v1root.tar'], { cwd: V1ROOT });
  } catch (err) {
    console.log(`(could not export the v1 build: ${String(err && err.message).split('\n')[0]})`);
  }
}
async function v1File(scenario) {
  const root = V1ROOT;
  const m = {};
  for (const [k, p] of [['rng', 'src/core/rng.js'], ['reg', 'src/core/registry.js'], ['ev', 'src/core/events.js'], ['clk', 'src/core/clock.js'], ['world', 'src/sim/world.js'], ['cap', 'src/save/capture.js'], ['codec', 'src/save/codec.js'], ['script', 'src/sim/script.js'], ['k', 'src/core/constants.js']])
    m[k] = await import(uAt(root, p));
  let impl = m.rng.createGameplayRng(21);
  const rng = {
    stream: 'gameplay',
    get seed() { return impl.seed; },
    get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (p) => impl.chance(p),
    pick: (a) => impl.pick(a),
    reseed: (s) => { impl = m.rng.createGameplayRng(s >>> 0); return impl.seed; },
    getState: () => impl.getState(),
    setState: (st) => { impl = m.rng.createGameplayRng(st.seed >>> 0); return impl.setState(st); },
  };
  const registry = m.reg.createRegistry();
  const bus = m.ev.createEventBus();
  const clock = m.clk.createClock();
  const w = m.world.createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const io = m.cap.createStateIO({ clock, rng, registry, world: w });
  const step = (n) => {
    for (let i = 0; i < n; i++) clock.stepOnce((t) => w.step(t, m.script.scriptedInput(0, t, { skillSlots: 0 })));
  };
  w.runSystem().startRun({ act: 1 });
  step(5);
  // clear room 1 (the draft page) — the v1 build then gets 6 skills, sockets on the 5th/6th
  for (let i = 0; i < 2000 && w.runSystem().view().phase === 'combat'; i++) {
    w.cmd('killAllEnemies');
    step(1);
  }
  for (const id of ['nova_bloom', 'spirit_bolt', 'warding_aura', 'bell_toll']) w.cmd('giveSkill', id);
  const sock = [['mending_bolt', 'sharpen', 0], ['mending_bolt', 'ascend', 1], ['spirit_bolt', 'bounce', 0], ['warding_aura', 'echo', 0], ['bell_toll', 'quicken', 0], ['bell_toll', 'resonance', 1]];
  for (const [sid, nid, slot] of sock) {
    w.cmd('grantNode', nid);
    w.cmd('socket', sid, nid, slot);
  }
  w.cmd('grantNode', 'widen'); // one on the bench too
  if (scenario === 'skillReward') {
    // leave the room-1 SKILL reward page open (the v1 build shows it)
  } else w.runSystem().declineReward?.();
  step(2);
  const tree = io.capture();
  const built = m.codec.buildFile({ slot: { id: 'manual-1', kind: 'manual', name: 'v1' }, meta: { skills: w.skillSlots().filter(Boolean).map((s) => s.id), room: 1 }, state: tree, game: '0.5.39', createdAt: 'x', savedAt: 'x' });
  return { text: built.text, schema: m.codec.SCHEMA, slots: m.k.SKILL_SLOTS, owned: w.skillSlots().filter(Boolean).map((s) => s.id), build: w.buildSystem().view(), phase: w.runSystem().view().phase, reward: w.runSystem().view().reward };
}
const migrations = async () => {
  if (ONLY && !'migration'.includes(ONLY)) return;
  if (!existsSync(join(V1ROOT, 'src', 'save', 'codec.js'))) {
    check('migration', 'v1 checkout present', false, { got: V1ROOT });
    return;
  }
  for (const scenario of ['path', 'skillReward']) {
    try {
      const v1 = await v1File(scenario);
      check('migration', `[${scenario}] a genuine v1 file (schema ${v1.schema}, ${v1.slots} slots, ${v1.owned.length} skills owned)`, v1.schema === 1 && v1.slots === 8 && v1.owned.length === 6, { got: { owned: v1.owned, phase: v1.phase } });
      const pf = parseFile(v1.text);
      check('migration', `[${scenario}] parseFile migrates it to schema ${SCHEMA}`, pf.ok && pf.migrated && pf.file.schema === 2 && pf.file.state.v === 2, { got: { ok: pf.ok, error: pf.error, detail: pf.detail, migrated: pf.migrated } });
      if (!pf.ok) continue;
      check('migration', `[${scenario}] migrated file is self-consistent (hash recomputed)`, pf.file.hash === hashState(pf.file.state), {});
      const r = mk(99);
      const ap = r.io.apply(pf.file.state);
      check('migration', `[${scenario}] apply() into a live world succeeds`, ap.ok, { got: ap });
      if (!ap.ok) continue;
      const slots = r.w.skillSlots().map((s) => (s ? s.id : null));
      check('migration', `[${scenario}] the first 4 owned skills are kept in slot order`, slots.join() === 'mending_bolt,swift_mend,nova_bloom,spirit_bolt', { got: slots });
      const bv = r.b().view();
      const rows = bv.skills.map((s) => s.sockets.length);
      const mb = bv.skills.find((s) => s.id === 'mending_bolt').sockets.map((x) => (x ? x.node : null));
      const sb = bv.skills.find((s) => s.id === 'spirit_bolt').sockets.map((x) => (x ? x.node : null));
      check('migration', `[${scenario}] kept rows pad to 8 sockets, nodes stay where they were`, rows.every((n) => n === 8) && mb[0] === 'sharpen' && mb[1] === 'ascend' && sb[0] === 'bounce', { got: { rows, mb, sb } });
      const bench = bv.bench.map((x) => x.node).sort();
      check('migration', `[${scenario}] the dropped skills' nodes (echo, quicken, resonance) join the bench`, ['echo', 'quicken', 'resonance', 'widen'].every((n) => bench.includes(n)) && bench.length === 4, { got: bench });
      check('migration', `[${scenario}] player.skills mirror = 4`, r.player.skills.length === 4, { got: r.player.skills });
      if (scenario === 'skillReward') {
        const rv = r.w.runSystem().view();
        check('migration', '[skillReward] a pending skill reward with 4 kept becomes the empty offer', rv.phase === 'reward' && rv.reward && rv.reward.type === null && rv.reward.freeSkillSlots === 0 && rv.reward.line === 'the run moves on', { got: rv.reward });
      }
      // the migrated state keeps running and round-trips
      const A = r.io.capture();
      const h0 = hashState(A);
      let threw = null;
      try {
        for (let t = 0; t < 600; t++) r.clock.stepOnce((tt) => r.w.step(tt, scriptedInput(3, tt, { skillSlots: SKILL_SLOTS })));
      } catch (err) {
        threw = String(err && err.message);
      }
      const hA = hashState(r.io.capture());
      r.io.apply(A);
      const h1 = hashState(r.io.capture());
      for (let t = 0; t < 600; t++) r.clock.stepOnce((tt) => r.w.step(tt, scriptedInput(3, tt, { skillSlots: SKILL_SLOTS })));
      const hB = hashState(r.io.capture());
      check('migration', `[${scenario}] 600 ticks after the load run clean and replay identically after a re-apply`, !threw && h0 === h1 && hA === hB, { got: { threw, h0, h1, hA, hB } });
    } catch (err) {
      check('migration', `[${scenario}] threw`, false, { got: String(err && err.stack ? err.stack.split('\n').slice(0, 4).join(' | ') : err) });
    }
  }
  // malformed-but-structurally-valid v1 trees never crash the migration
  const r = mk(7);
  const base = r.io.capture();
  const mutants = {
    noBuild: (t) => delete t.systems.build,
    rowsNotArrays: (t) => (t.systems.build.assignments = [['mending_bolt', null], ['nope', 'x'], 5]),
    rewardNoType: (t) => (t.systems.run.reward = { id: 'x' }),
    eightSlotsAllFull: (t) => (t.systems.skills.slots = ['mending_bolt', 'swift_mend', 'nova_bloom', 'sanctuary', 'spirit_bolt', 'warding_aura', 'guardian_bond', 'restorative_wave'].map((id) => ({ id, readyTick: 0 }))),
  };
  const out = {};
  for (const [name, fn] of Object.entries(mutants)) {
    const t = JSON.parse(JSON.stringify(base));
    t.v = 1;
    fn(t);
    const f = buildFile({ slot: { id: 'manual-2', kind: 'manual' }, meta: { skills: [] }, state: t, game: 'x', createdAt: 'x', savedAt: 'x' });
    const file = JSON.parse(f.text);
    file.schema = 1;
    let res;
    try {
      res = parseFile(JSON.stringify(file));
      out[name] = res.ok ? 'ok' : `${res.error}: ${String(res.detail).slice(0, 60)}`;
    } catch (err) {
      out[name] = `THREW ${String(err && err.message)}`;
    }
  }
  check('migration', 'odd v1 trees never throw (ok or a clean error)', Object.values(out).every((x) => !x.startsWith('THREW')), { got: out });
};
await migrations();

// ===================================================== G4c.8 determinism ===
run('determinism', () => {
  const sim = (args) => JSON.parse(execFileSync(process.execPath, ['tools/gnt-arch-simtrace.mjs', ...args], { cwd: here, encoding: 'utf8' }).split('\n')[0]);
  const legacyK = sim(['--mode', 'kill_all', '--ticks', '3600', '--seed', '7', '--script', '3']);
  const legacyD = sim(['--mode', 'defend', '--ticks', '3600', '--seed', '7', '--script', '3']);
  check('determinism', 'legacy ?room= traces equal the v0.5.0 goldens again (4 skill keys)', legacyK.eventsHash === 'd1eff38b03f581aa' && legacyD.eventsHash === '554cd9c41db19975', { got: [legacyK.eventsHash, legacyD.eventsHash] });
  const twice = [];
  for (const mode of ['kill_all', 'defend', 'run']) {
    const a = sim(['--mode', mode, '--ticks', '3600', '--seed', '2', '--script', '3']);
    const b2 = sim(['--mode', mode, '--ticks', '3600', '--seed', '2', '--script', '3']);
    twice.push({ mode, a: a.eventsHash + '/' + a.stateHash, same: a.eventsHash === b2.eventsHash && a.stateHash === b2.stateHash });
  }
  check('determinism', 'every mode replays bit-identically (seed 2, 3600 ticks, twice)', twice.every((t) => t.same), { got: twice });
});

mkdirSync(join(here, 'captures'), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify({ tool: 'gntM4c-simprobe', at: new Date().toISOString(), passed: results.length - failed, of: results.length, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} checks pass -> ${OUT}`);
process.exit(failed ? 1 : 0);
