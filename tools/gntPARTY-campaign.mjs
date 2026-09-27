#!/usr/bin/env node
// PARTY carried-campaign probe (Node): GP.5 class identity, GP.7 supply arc,
// GP.8 AI, GP.11 carry. Plays whole linear campaigns from Level 1 with the
// deterministic default-build autopilot for the Healer (M4a) and the §25.8
// ally AI in Suggested mode — the CAMPAIGN runner's recipe — and measures
// from the sim's own events:
//   GP.5  Tank: taunt redirects within 60 ticks, the share of hostile attack
//         STARTS (telegraphs raised at a party member + melee bites) aimed at
//         the Tank while a taunt source is equipped vs the SAME recipe on
//         v0.5.150 (--base150; the hits + blocks share and the time-weighted
//         "aimed at" share are printed as [info]), Tank-granted
//         shields' share of the party's damage in Shield Wall rooms;
//         Swordsman: median distance to its target at cast, Crescent
//         Finisher casts with combo >= 1; Archer: median distance to the
//         nearest hostile at cast, vs the Swordsman's.
//   GP.7  per ally: spoils 1 per combat clear, 1 card per combat room, a
//         4-card shelf / <= 3 buys, +12 purse per clear; sockets filled at
//         the Level 1 / 2 Stag (median) and before the Level 3 Stag; empty
//         ally cards; the Healer's spoils 2 / shelf 4.
//   GP.8  every equipped ACTIVE cast in every combat room it was equipped
//         for >= 20 s; idle fallback share (partyAiLog); guard casts on
//         Downed members; AI dash / vault end points beyond the leash;
//         Pinning Arrows on the Stag while another hostile was in range; the
//         AI's swap choices = the §25.8 rule.
//   GP.11 the four builds identical across each level card; every seat at
//         max HP, standing, no statuses, cooldowns ready, nothing pending.
//   node tools/gntPARTY-campaign.mjs [--seeds 1-3] [--base150 <archive>]
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const seedsArg = opt('seeds', '1-3');
const SEEDS = seedsArg.includes('-') ? (() => { const [a, b] = seedsArg.split('-').map(Number); return Array.from({ length: b - a + 1 }, (_, i) => a + i); })() : seedsArg.split(',').map(Number);
const BASE = opt('base150');
const MAX_TICKS = 260000;

async function load(root) {
  const u = (p) => pathToFileURL(join(root, p)).href;
  return {
    rng: await import(u('src/core/rng.js')),
    reg: await import(u('src/core/registry.js')),
    ev: await import(u('src/core/events.js')),
    clk: await import(u('src/core/clock.js')),
    world: await import(u('src/sim/world.js')),
    intents: await import(u('src/core/intents.js')),
    classes: await import(u('src/data/classes.js')).catch(() => null),
    skills: await import(u('src/sim/skills.js')),
    allies: await import(u('src/sim/allies.js')),
  };
}
const median = (a) => {
  const s = a.filter(Number.isFinite).sort((x, y) => x - y);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const r2 = (v) => (v === null || v === undefined ? v : Math.round(v * 100) / 100);

function runCampaign(T, seed, { party = true } = {}) {
  let impl = T.rng.createGameplayRng(seed);
  const rng = {
    stream: 'gameplay',
    get seed() { return impl.seed; },
    get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (q) => impl.chance(q),
    pick: (a) => impl.pick(a),
    reseed: (s) => { impl = T.rng.createGameplayRng(s >>> 0); return impl.seed; },
    getState: () => impl.getState(),
    setState: (st) => { impl = T.rng.createGameplayRng(st.seed >>> 0); return impl.setState(st); },
  };
  const registry = T.reg.createRegistry();
  const bus = T.ev.createEventBus();
  const clock = T.clk.createClock();
  const world = T.world.createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const P = party && typeof world.partySystem === 'function' ? world.partySystem() : null;
  const byId = (id) => registry.byId(id);
  const ally = (i) => registry.all().find((e) => e.kind === 'ally' && e.partyIndex === i);
  const partyIds = () => new Set(registry.all().filter((e) => e.partyIndex !== undefined).map((e) => e.id));
  const M = {
    attacks: { tank: 0, all: 0, tankTauntRooms: 0, allTauntRooms: 0 },
    // GP.5's literal "hostile attack STARTS aimed at the Tank": a telegraph
    // raised at a party member (lanes, lobs, shots, the Stag's quake) or a
    // melee bite, counted when it starts.
    starts: { tank: 0, all: 0, tankT: 0, allT: 0 },
    aim: { tank: 0, all: 0, tankT: 0, allT: 0 },
    taunts: [],
    shield: { absorbedByTank: 0, damageAll: 0 },
    swordDist: [],
    crescent: { casts: 0, combo: 0 },
    archerDist: [],
    rooms: [],
    spoils: { 1: [], 2: [], 3: [], 0: [] },
    cards: { 1: 0, 2: 0, 3: 0 },
    emptyCards: [],
    shelves: [],
    buys: { 1: [], 2: [], 3: [] },
    stipends: { 1: [], 2: [], 3: [] },
    sockets: {},
    guardDowned: 0,
    guardCasts: 0,
    leashOut: [],
    pinStag: { onStag: 0, violations: 0 },
    swapRule: { checked: 0, bad: [] },
    carry: [],
    level: 1,
  };
  let room = null;
  let tauntSource = false;
  let shieldWallRoom = false;
  let lastOffer = null;
  const tankId = () => (ally(1) || {}).id;
  const nearestHostile = (a) => {
    let best = null;
    let bd = Infinity;
    for (const e of registry.all()) {
      if (e.faction !== 'hostile' || !(e.hp > 0) || e.hittable === false) continue;
      const d = Math.hypot(e.x - a.x, e.z - a.z);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best ? { e: best, d: bd } : null;
  };
  const buildsSig = () => {
    const h = world.cmd('buildView');
    const seats = P ? [1, 2, 3].map((i) => { const v = P.view(i); return { slots: v.slots, purse: v.purse, bench: v.bench.map((b) => b.node).sort(), sk: v.skills.map((k) => k.id + ':' + k.sockets.map((x) => (x ? x.node : '-')).join(',')) }; }) : null;
    return JSON.stringify({ healer: h ? h.skills.map((k) => k.id + ':' + k.sockets.map((x) => (x ? x.node : '-')).join(',')) : null, bench: h ? h.bench.map((b) => b.node).sort() : null, seats });
  };
  bus.on('*', (e) => {
    const t = e.type;
    if (t === 'room_start') {
      const v = world.runSystem().view();
      const kits = T.allies.ALLY_KITS ? [1, 2, 3].map((i) => { const a = ally(i); return a && T.allies.ALLY_KITS[a.classId] ? T.allies.ALLY_KITS[a.classId].map((d) => d.id) : []; }) : null;
      room = { level: v.act, room: v.room, mode: v.mode, start: e.tick, loadouts: P ? [1, 2, 3].map((i) => [...P.slots(i)]) : kits, casts: {}, end: null, downTicks: [0, 0, 0, 0], offer: false, opp: {} };
      M.rooms.push(room);
      const tl = P ? P.slots(1) : [];
      const tv = P ? P.view(1) : null;
      tauntSource = !!(tl && (tl.includes('taunting_roar') || (tv && tv.skills.some((k) => k.sockets.some((x) => x && x.node === 'provoke')))));
      shieldWallRoom = !!(tl && tl.includes('shield_wall'));
      room.tauntSource = tauntSource;
      room.shieldWall = shieldWallRoom;
      if (P && v.room === 8) M.sockets[`L${v.act}`] = (M.sockets[`L${v.act}`] || []).concat([[1, 2, 3].map((i) => P.view(i).filled)]);
    } else if (t === 'room_cleared' && room) room.end = e.tick;
    else if (t === 'reward_forfeited' && room) room.forfeited = true;
    else if (t === 'hit') {
      const tgt = byId(e.target);
      const atk = e.attacker != null ? byId(e.attacker) : null;
      if (tgt && tgt.partyIndex !== undefined && atk && atk.faction === 'hostile') {
        M.attacks.all += 1;
        if (tgt.partyIndex === 1) M.attacks.tank += 1;
        if (tauntSource) {
          M.attacks.allTauntRooms += 1;
          if (tgt.partyIndex === 1) M.attacks.tankTauntRooms += 1;
        }
        if (shieldWallRoom) {
          M.shield.damageAll += (e.amount || 0) + (e.absorbed || 0);
          if (e.absorbed > 0) {
            const sh = tgt.status && tgt.status.shield;
            const src = sh ? sh.src : lastBroken.get(`${e.tick}:${tgt.id}`);
            if (src === tankId()) M.shield.absorbedByTank += e.absorbed;
          }
        }
      }
    } else if ((t === 'telegraph_start' || t === 'enemy_bite') && e.target != null && room && room.end === null) {
      const tgt = byId(e.target);
      if (tgt && tgt.partyIndex !== undefined) {
        M.starts.all += 1;
        if (tgt.partyIndex === 1) M.starts.tank += 1;
        if (tauntSource) {
          M.starts.allT += 1;
          if (tgt.partyIndex === 1) M.starts.tankT += 1;
        }
      }
    } else if (t === 'shield_broken') lastBroken.set(`${e.tick}:${e.targetId}`, e.src);
    else if (t === 'hit_blocked') {
      const tgt = byId(e.targetId);
      if (tgt && tgt.partyIndex !== undefined) {
        M.attacks.all += 1;
        if (tgt.partyIndex === 1) M.attacks.tank += 1;
        if (tauntSource) {
          M.attacks.allTauntRooms += 1;
          if (tgt.partyIndex === 1) M.attacks.tankTauntRooms += 1;
        }
      }
    } else if (t === 'status_apply' && e.status === 'taunt') {
      const h = byId(e.id);
      if (h && e.src === tankId()) {
        const prev = h.targetId;
        const prevE = prev != null ? byId(prev) : null;
        if (prevE && prevE.partyIndex !== undefined && prevE.partyIndex !== 1) M.taunts.push({ id: h.id, tick: e.tick, redirected: null });
      }
    } else if (t === 'ally_cast' && e.inputSeq === undefined) {
      const a = byId(e.id);
      const seat = e.partyIndex;
      if (room) room.casts[`${seat}:${e.skill}`] = (room.casts[`${seat}:${e.skill}`] || 0) + 1;
      if (seat === 2 && a && e.target != null) {
        const tg = byId(e.target);
        if (tg) M.swordDist.push(Math.hypot(tg.x - (e.x ?? a.x), tg.z - (e.z ?? a.z)));
      }
      if (seat === 3 && a) {
        const n = nearestHostile({ x: e.x ?? a.x, z: e.z ?? a.z });
        if (n) M.archerDist.push(n.d);
      }
      if (e.skill === 'crescent_finisher') {
        M.crescent.casts += 1;
        if ((e.combo || 0) >= 1) M.crescent.combo += 1;
      }
      if (e.skill === 'shield_wall') {
        M.guardCasts += 1;
        for (const id of e.targets || []) {
          const m = byId(id);
          if (m && !(m.hp > 0)) M.guardDowned += 1;
        }
      }
      if (e.skill === 'pinning_arrow' && e.target != null) {
        const tg = byId(e.target);
        if (tg && (tg.kind === 'stag' || tg.boss === true)) {
          M.pinStag.onStag += 1;
          const def = T.skills.SKILLS.pinning_arrow;
          const other = registry.all().some((h) => h.faction === 'hostile' && h.hp > 0 && h.id !== tg.id && h.kind !== 'stag' && h.hittable !== false && a && Math.hypot(h.x - a.x, h.z - a.z) <= def.range);
          if (other) M.pinStag.violations += 1;
        }
      }
    } else if (t === 'ally_dash' && e.inputSeq === undefined) {
      // §12 leash anchor: the live Waystone in a defend room, else the Healer.
      const anchor = registry.all().find((x) => x.kind === 'waystone' && x.hp > 0) || registry.all().find((x) => x.kind === 'player') || null;
      if (anchor) {
        const d = Math.hypot(e.x1 - anchor.x, e.z1 - anchor.z);
        if (d > T.allies.LEASH.radius + 0.3) M.leashOut.push({ seat: e.seat, skill: e.skill, d: r2(d) });
      }
    } else if (t === 'spoils_drop') {
      const s = e.seat === undefined ? 0 : e.seat;
      if (M.spoils[s]) M.spoils[s].push(e.nodes.length);
    } else if (t === 'party_offer') {
      if (room) room.offer = true;
      lastOffer = { room: e.room, cards: e.cards, slots: P ? [0, 1, 2, 3].map((i) => (i ? [...P.slots(i)] : null)) : null };
      for (const c of e.cards) {
        M.cards[c.seat] += 1;
        if (!c.reward) M.emptyCards.push({ level: M.level, room: e.room, seat: c.seat });
      }
    } else if (t === 'party_commit' && lastOffer && T.classes) {
      for (const c of e.cards) {
        const o = lastOffer.cards.find((x) => x.seat === c.seat);
        if (!o || o.reward !== 'skill' || !o.swap) continue;
        const cls = T.classes.CLASS_OF_SEAT[c.seat];
        const sug = T.classes.swapSuggestion(cls, lastOffer.slots[c.seat], o.id);
        M.swapRule.checked += 1;
        if (sug.choice !== c.choice || (c.choice === 'take' && sug.replace !== c.replace && lastOffer.slots[c.seat][c.replace] !== lastOffer.slots[c.seat][sug.replace])) M.swapRule.bad.push({ seat: c.seat, offered: o.id, sug, got: c });
      }
    } else if (t === 'party_shop_open') {
      M.shelves.push(e.shelves.map((s) => s.stock.length));
    } else if (t === 'shop_purchase' && e.seat) {
      if (M.buys[e.seat]) M.buys[e.seat].push(e.room);
    } else if (t === 'purse_gain' && /stipend/.test(e.reason || '')) {
      if (M.stipends[e.seat]) M.stipends[e.seat].push(e.amount);
    } else if (t === 'level_clear') {
      M.carry.push({ from: e.level, pre: buildsSig(), tick: e.tick });
    } else if (t === 'level_transit') {
      // Every seat restored at the card (read the tick the card opens, after
      // the §12.3 restore — the Healer's own casts during the card are
      // CAMPAIGN's rule, not the carry).
      const c = M.carry[M.carry.length - 1];
      if (c && !c.bodies) {
        const bodies = registry.all().filter((x) => x.partyIndex !== undefined);
        c.bodies = bodies.map((b) => ({ i: b.partyIndex, full: b.hp === b.maxHp, statuses: Object.keys(b.status || {}).length, kinds: Object.keys(b.status || {}), cds: (b.cds || []).filter((cd) => cd > e.tick).length, pending: !!(b.pendingCast || b.skillDash || (b.guard && b.guard.parry) || b.dashTicksLeft > 0) }));
      }
    } else if (t === 'level_start') {
      const c = M.carry[M.carry.length - 1];
      if (c && c.post === undefined) c.post = buildsSig();
      M.level = e.level ?? M.level + 1;
    }
  });
  const lastBroken = new Map();
  // The CAMPAIGN runner's recipe: the autopilot's intents replace the
  // Healer's snapshot every tick (main.js wraps world.step the same way).
  const ap = world.runSystem().autopilot;
  const step = (n) => {
    for (let k = 0, g = 0; k < n && g < n * 8 + 64; g++) if (clock.stepOnce((t) => world.step(t, ap.intents(t, T.intents.emptySnapshot())))) k += 1;
  };
  world.runSystem().startCampaign({ level: 1, challenge: 'standard', harness: true });
  ap.configure(true);
  let stuck = null;
  let lastProgress = 0;
  let lastKey = '';
  // GP.8 opportunities: every 10 ticks, per AI seat and equipped ACTIVE
  // (the §7 range-rule skills), whether it was ready with a hostile inside
  // its resolved shape range — "idle" = equipped, >= 1 s of such
  // opportunity in the room, and never cast there.
  const OPP_SKIP = new Set(['shield_wall', 'crescent_finisher', 'riposte', 'fox_step', 'vault_shot', 'shoulder_charge', 'taunting_roar', 'pinning_arrow', 'rain_of_arrows']);
  const sampleOpp = () => {
    const rm = M.rooms[M.rooms.length - 1];
    // GP.5 attention: every 10 ticks, the hostiles aimed at a party member
    // and those aimed at the Tank (the time-weighted "aimed at" share).
    if (rm && rm.end === null) {
      const tk = tankId();
      for (const h of registry.all()) {
        if (h.faction !== 'hostile' || !(h.hp > 0) || h.targetId == null) continue;
        const tg = byId(h.targetId);
        if (!tg || tg.partyIndex === undefined) continue;
        M.aim.all += 1;
        if (h.targetId === tk) M.aim.tank += 1;
        if (tauntSource) {
          M.aim.allT += 1;
          if (h.targetId === tk) M.aim.tankT += 1;
        }
      }
    }
    if (!rm || rm.end !== null || !P) return;
    for (const seat of [1, 2, 3]) {
      const a = ally(seat);
      if (!a || !(a.hp > 0)) continue;
      const slots = P.slots(seat);
      slots.forEach((id, k) => {
        if (!id || OPP_SKIP.has(id)) return;
        const base = T.skills.SKILLS[id];
        if (!base || base.shape === 'aura') return;
        if ((a.cds[k] ?? 0) > world.tick) return;
        const def = P.build(seat).resolveDef(base);
        const r = def.shape === 'nova' ? def.area : def.range;
        const any = registry.all().some((e) => e.faction === 'hostile' && e.hp > 0 && e.hittable !== false && Math.hypot(e.x - a.x, e.z - a.z) <= r);
        if (any) rm.opp[`${seat}:${id}`] = (rm.opp[`${seat}:${id}`] || 0) + 10;
      });
    }
  };
  for (let t = 0; t < MAX_TICKS; t += 60) {
    for (let q = 0; q < 6; q++) {
      step(10);
      sampleOpp();
    }
    const v = world.runSystem().view();
    // Taunt redirects resolved 60 ticks after the taunt.
    {
      const cur = M.rooms[M.rooms.length - 1];
      if (cur && cur.end === null) for (const i of [1, 2, 3]) if (ally(i) && !(ally(i).hp > 0)) cur.downTicks[i] += 60;
    }
    for (const tt of M.taunts) {
      if (tt.redirected !== null || world.tick < tt.tick + 60) continue;
      const h = byId(tt.id);
      tt.redirected = !h || !(h.hp > 0) ? null : h.targetId === tankId();
      if (!h || !(h.hp > 0)) tt.dead = true;
    }
    const key = `${v.act}:${v.room}:${v.phase}`;
    if (key !== lastKey) {
      lastKey = key;
      lastProgress = world.tick;
    }
    if (v.phase === 'idle' || v.phase === 'victory' || v.phase === 'defeat') break;
    if (world.tick - lastProgress > 10800) {
      stuck = key;
      break;
    }
  }
  const aiLog = P ? world.cmd('partyAiLog') : null;
  const out = world.runSystem().view();
  return { M, aiLog, outcome: out.phase, stuck, ticks: world.tick, partyIds: [...partyIds()].length };
}

const now = await load(here);
const old = BASE ? await load(resolve(BASE)) : null;
const results = [];
function check(gate, name, pass, got = null) {
  results.push({ gate, name, pass: !!pass, got });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${gate}] ${name}${pass ? '' : ' ' + JSON.stringify(got).slice(0, 500)}`);
}
const runs = SEEDS.map((s) => ({ seed: s, r: runCampaign(now, s) }));
const base = old ? SEEDS.map((s) => ({ seed: s, r: runCampaign(old, s, { party: false }) })) : null;
const sum = (f) => runs.reduce((a, x) => a + f(x.r.M), 0);

// ------------------------------------------------------------- GP.5 --
{
  const tt = runs.flatMap((x) => x.r.M.taunts.filter((t) => t.redirected !== null));
  const red = tt.filter((t) => t.redirected).length;
  check('GP.5', `Tank taunts redirect ${red}/${tt.length} hostiles that were on another member within 60 ticks (>= 50%)`, tt.length > 0 && red / tt.length >= 0.5, { red, n: tt.length });
  const shareNow = sum((m) => m.attacks.tankTauntRooms) / Math.max(1, sum((m) => m.attacks.allTauntRooms));
  if (base) {
    const bT = base.reduce((a, x) => a + x.r.M.attacks.tank, 0);
    const bA = base.reduce((a, x) => a + x.r.M.attacks.all, 0);
    const shareBase = bT / Math.max(1, bA);
    console.log(`[info] hostile hits landing on the Tank while a taunt source is equipped: ${(shareNow * 100).toFixed(1)}% vs v0.5.150 ${(shareBase * 100).toFixed(1)}% (x${(shareNow / shareBase).toFixed(2)})`);
    // "aimed at": the time-weighted share of hostiles whose target is the Tank.
    const aimNow = sum((m) => m.aim.tankT) / Math.max(1, sum((m) => m.aim.allT));
    const aimBase = base.reduce((a, x) => a + x.r.M.aim.tank, 0) / Math.max(1, base.reduce((a, x) => a + x.r.M.aim.all, 0));
    console.log(`[info] hostiles aimed at the Tank while a taunt source is equipped: ${(aimNow * 100).toFixed(1)}% of hostile-time vs v0.5.150 ${(aimBase * 100).toFixed(1)}% (x${(aimNow / aimBase).toFixed(2)})`);
    const stNow = sum((m) => m.starts.tankT) / Math.max(1, sum((m) => m.starts.allT));
    const stBase = base.reduce((a, x) => a + x.r.M.starts.tank, 0) / Math.max(1, base.reduce((a, x) => a + x.r.M.starts.all, 0));
    check('GP.5', `hostile attack starts aimed at the Tank while a taunt source is equipped: ${(stNow * 100).toFixed(1)}% (${sum((m) => m.starts.tankT)} / ${sum((m) => m.starts.allT)}) vs v0.5.150 ${(stBase * 100).toFixed(1)}% (x${(stNow / stBase).toFixed(2)}, >= 1.3)`, stNow >= 1.3 * stBase, { stNow, stBase });
  }
  const abs = sum((m) => m.shield.absorbedByTank);
  const dmg = sum((m) => m.shield.damageAll);
  check('GP.5', `Tank-granted shields absorb ${((abs / Math.max(1, dmg)) * 100).toFixed(1)}% of the party's damage in Shield Wall rooms (>= 8%)`, dmg > 0 && abs / dmg >= 0.08, { abs: r2(abs), dmg: r2(dmg) });
  const sd = median(runs.flatMap((x) => x.r.M.swordDist));
  check('GP.5', `Swordsman median distance to its target at cast ${r2(sd)} u (<= 1.2)`, sd !== null && sd <= 1.2, { n: runs.flatMap((x) => x.r.M.swordDist).length });
  const cc = sum((m) => m.crescent.casts);
  const cb = sum((m) => m.crescent.combo);
  check('GP.5', `Crescent Finisher casts with combo >= 1: ${cb}/${cc} (>= 60%)`, cc > 0 && cb / cc >= 0.6, { cc, cb });
  const ad = median(runs.flatMap((x) => x.r.M.archerDist));
  check('GP.5', `Archer median distance to the nearest hostile at cast ${r2(ad)} u (>= 2.5 and >= 2x the Swordsman's ${r2(sd)})`, ad !== null && ad >= 2.5 && ad >= 2 * sd, { ad, sd });
}
// ------------------------------------------------------------- GP.7 --
{
  for (const s of [1, 2, 3]) {
    const sp = runs.flatMap((x) => x.r.M.spoils[s]);
    check('GP.7', `seat ${s}: spoils 1 per combat clear (${sp.length} drops, sizes ${JSON.stringify([...new Set(sp)])})`, sp.length > 0 && sp.every((n) => n === 1), [...new Set(sp)]);
    const st = runs.flatMap((x) => x.r.M.stipends[s]);
    check('GP.7', `seat ${s}: purse +12 per clear (${st.length} stipends, amounts ${JSON.stringify([...new Set(st)])})`, st.length > 0 && st.every((n) => n === 12), [...new Set(st)]);
  }
  const hs = runs.flatMap((x) => x.r.M.spoils[0]);
  const hb = base ? base.flatMap((x) => x.r.M.spoils[0]) : null;
  // §14: 2 per clear while the Healer's usable pool holds 2 (v0.5.150 drops
  // fewer as its pool runs dry the same way).
  const hist = (a) => a.reduce((o, n) => ((o[n] = (o[n] || 0) + 1), o), {});
  check('GP.7', `the Healer's spoils follow §14 (sizes ${JSON.stringify(hist(hs))}; v0.5.150 ${JSON.stringify(hb ? hist(hb) : null)})`, hs.length > 0 && hs.every((n) => n === 2 || n === 1) && (!hb || hb.some((n) => n !== 2) || hs.every((n) => n === 2)), { now: hist(hs), base: hb && hist(hb) });
  const shelves = runs.flatMap((x) => x.r.M.shelves);
  check('GP.7', `every ally shelf holds 4 cards (${shelves.length} shops)`, shelves.length > 0 && shelves.every((sh) => sh.every((n) => n === 4)), shelves);
  // (a defend soft-fail forfeits the room's reward for everyone, §11)
  const cardsPerRoom = runs.map((x) => ({ cards: x.r.M.cards, combatRooms: x.r.M.rooms.filter((r) => r.end && !r.forfeited && (r.mode === 'kill_all' || r.mode === 'defend')).length, forfeited: x.r.M.rooms.filter((r) => r.forfeited).length, noOffer: x.r.M.rooms.filter((r) => r.end && !r.forfeited && (r.mode === 'kill_all' || r.mode === 'defend') && !r.offer).map((r) => `L${r.level}r${r.room}`) }));
  check('GP.7', `1 card per ally per cleared combat room (${JSON.stringify(cardsPerRoom)})`, cardsPerRoom.every((c) => [1, 2, 3].every((s) => c.cards[s] === c.combatRooms)), cardsPerRoom);
  for (const L of ['L1', 'L2', 'L3']) {
    const fills = runs.flatMap((x) => (x.r.M.sockets[L] || []).flat());
    const m = median(fills);
    const band = L === 'L1' ? [8, 16] : L === 'L2' ? [20, 30] : [32, 32];
    check('GP.7', `ally sockets filled at the ${L} Stag: median ${m} / 32 (${band[0]}-${band[1]})`, m !== null && m >= band[0] && m <= band[1], fills);
  }
  const empty = runs.flatMap((x) => x.r.M.emptyCards);
  check('GP.7', `no empty ally page card (${empty.length})`, empty.length === 0, empty.slice(0, 6));
}
// ------------------------------------------------------------- GP.8 --
{
  const idleOf = (list, skills) => {
    const out = [];
    for (const x of list) {
      for (const rm of x.r.M.rooms) {
        if (!rm.end || !(rm.mode === 'kill_all' || rm.mode === 'defend' || rm.mode === 'boss') || !rm.loadouts) continue;
        rm.loadouts.forEach((slots, k) => {
          const seat = k + 1;
          for (const id of slots) {
            if (!id || !skills.SKILLS[id] || skills.SKILLS[id].shape === 'aura') continue;
            if (!rm.casts[`${seat}:${id}`] && rm.end - rm.start - rm.downTicks[seat] >= 1200) out.push(`${seat}:${id}`);
          }
        });
      }
    }
    return out;
  };
  if (base) {
    const bi = idleOf(base, old.skills);
    const ni = idleOf(runs, now.skills);
    const hist = (a) => a.reduce((o, n) => ((o[n] = (o[n] || 0) + 1), o), {});
    console.log(`[info] idle equipped actives (rooms >= 20 s up): v0.5.150 ${bi.length} ${JSON.stringify(hist(bi))}; now ${ni.length} ${JSON.stringify(hist(ni))}`);
  }
  const idle = [];
  for (const x of runs) {
    for (const rm of x.r.M.rooms) {
      if (!rm.end || !(rm.mode === 'kill_all' || rm.mode === 'defend' || rm.mode === 'boss') || !rm.loadouts) continue;
      if (rm.end - rm.start < 1200) continue;
      rm.loadouts.forEach((slots, k) => {
        const seat = k + 1;
        for (const id of slots) {
          if (!id || now.skills.SKILLS[id].shape === 'aura') continue;
          // (a seat Downed for most of the room could not cast — reported apart)
          const upTicks = rm.end - rm.start - rm.downTicks[seat];
          if (!rm.casts[`${seat}:${id}`] && upTicks >= 1200) idle.push({ seed: x.seed, level: rm.level, room: rm.room, mode: rm.mode, seat, id, secs: Math.round((rm.end - rm.start) / 60), downSecs: Math.round(rm.downTicks[seat] / 60), seatCasts: Object.entries(rm.casts).filter(([k]) => k.startsWith(`${seat}:`)).map(([k, v]) => `${k.slice(2)}x${v}`) });
        }
      });
    }
  }
  // The literal bar: every equipped active cast in every combat room >= 20 s.
  check('GP.8', `(literal) every equipped active of every AI ally is cast in every combat room it was equipped >= 20 s (${idle.length} idle; v0.5.150 on the same seeds: see [info])`, idle.length === 0, idle.slice(0, 8));
  // With an opportunity: ready with a hostile in its shape range >= 1 s.
  const idleOpp = [];
  for (const x of runs) {
    for (const rm of x.r.M.rooms) {
      if (!rm.end || !rm.opp) continue;
      for (const [k, ticks] of Object.entries(rm.opp)) if (ticks >= 60 && !rm.casts[k]) idleOpp.push({ seed: x.seed, level: rm.level, room: rm.room, k, oppSecs: +(ticks / 60).toFixed(1) });
    }
  }
  check('GP.8', `no equipped active stays uncast after >= 1 s ready with a hostile in its range (${idleOpp.length})`, idleOpp.length === 0, idleOpp.slice(0, 8));
  let casts = 0;
  let fb = 0;
  for (const x of runs) {
    for (const seat of [1, 2, 3]) {
      const L = x.r.aiLog && x.r.aiLog[seat];
      if (!L) continue;
      for (const v of Object.values(L)) {
        casts += v.casts;
        fb += v.fallbacks;
      }
    }
  }
  check('GP.8', `idle fallbacks ${fb}/${casts} casts (<= 25%)`, casts > 0 && fb / casts <= 0.25, { fb, casts });
  check('GP.8', `guard casts on Downed members: ${sum((m) => m.guardDowned)} of ${sum((m) => m.guardCasts)} Shield Walls (0)`, sum((m) => m.guardDowned) === 0, null);
  const lo = runs.flatMap((x) => x.r.M.leashOut);
  check('GP.8', `AI dash / vault end points beyond the leash: ${lo.length} (0)`, lo.length === 0, lo.slice(0, 6));
  check('GP.8', `Pinning Arrows on the Stag while another hostile was in range: ${sum((m) => m.pinStag.violations)} (of ${sum((m) => m.pinStag.onStag)} on the Stag) (0)`, sum((m) => m.pinStag.violations) === 0, null);
  const sr = runs.map((x) => x.r.M.swapRule);
  check('GP.8', `the AI's swap choices follow §25.8 (${sr.reduce((a, s) => a + s.checked, 0)} swap cards)`, sr.every((s) => s.bad.length === 0) && sr.reduce((a, s) => a + s.checked, 0) > 0, sr.flatMap((s) => s.bad).slice(0, 4));
}
// ------------------------------------------------------------ GP.11 --
{
  const carries = runs.flatMap((x) => x.r.M.carry.filter((c) => c.post !== undefined));
  check('GP.11', `the four builds are identical across every level card (${carries.length} cards)`, carries.length > 0 && carries.every((c) => c.pre === c.post), carries.filter((c) => c.pre !== c.post).map((c) => c.from));
  const bodies = carries.flatMap((c) => c.bodies || []);
  const bad = bodies.filter((b) => !b.full || b.statuses || b.cds || b.pending);
  check('GP.11', `every seat at max HP, no statuses, cooldowns ready, nothing pending when each level card opens (${bodies.length} bodies)`, bodies.length > 0 && bad.length === 0, bad.slice(0, 6));
}
const failed = results.filter((r) => !r.pass);
mkdirSync(join(here, 'captures'), { recursive: true });
writeFileSync(join(here, 'captures/gntPARTY-campaign.json'), JSON.stringify({ tool: 'gntPARTY-campaign', seeds: SEEDS, outcomes: runs.map((x) => ({ seed: x.seed, outcome: x.r.outcome, stuck: x.r.stuck, ticks: x.r.ticks })), base: base ? base.map((x) => ({ seed: x.seed, outcome: x.r.outcome })) : null, results }, null, 1));
console.log(JSON.stringify({ tool: 'gntPARTY-campaign', outcomes: runs.map((x) => `${x.seed}:${x.r.outcome}${x.r.stuck ? ' stuck ' + x.r.stuck : ''}`), passed: results.length - failed.length, of: results.length }));
process.exit(failed.length ? 1 : 0);
