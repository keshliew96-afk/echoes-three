// The party system — per-character builds for seats 1-3 (PLAN §16.3,
// BUILD_BRIEF §25). Owner: PARTY.
//
// Seat 0 (the Healer) keeps today's skill system + build system unchanged.
// This system owns the three ALLY builds: each seat's loadout (≤ 4 class
// skills in slot order = keys 1-4 = the AI's cast order — never a 5th), its
// build system instance (sim/nodes.js createBuildSystem with seat / classId /
// caster: 8 sockets per skill, no rarity caps, the per-node limits, the
// grey / inert verdicts, the bench, auto-fill, Echo, Resonance), its Glint
// purse, its passive pulse clocks and its per-seat technique memory (combo,
// recent casts, Retaliate windows, stillness), plus the party draw stream
// (every ally draw — never the gameplay stream, so the Healer's draws and
// every crit roll stay where they were).
//
// Sim discipline: no DOM, no render imports, no wall clock. Saved as
// `systems.party` (PLAN §16.6).
import { TICK_HZ, SKILL_SLOTS } from '../core/constants.js';
import { createGameplayRng } from '../core/rng.js';
import { SKILLS } from './skills.js';
import { NODES, createBuildSystem, classVerdict } from './nodes.js';
import { createDraftSystem } from './draft.js';
import { grantFor } from '../data/campaign.js';
import {
  CLASS_OF_SEAT,
  CLASS_SKILLS,
  STARTING_LOADOUT,
  nodePoolOf,
  PARTY_MODES,
  swapSuggestion,
  prioritySorted,
  STRESS_LOADOUT,
  STRESS_ORDER,
  ALLY_CLASS_IDS,
} from '../data/classes.js';

const r2 = (v) => Math.round(v * 100) / 100;
const secTicks = (s) => Math.round(s * TICK_HZ);
const AURA_CADENCE_TICKS = secTicks(1.0);
export const PARTY_SEATS = Object.freeze([1, 2, 3]);

// The party stream's seed: derived from the gameplay SEED with no gameplay
// draw (PLAN §16.3: hash32(runSeed, 0x50415254 'PART')).
export function partySeed(seed) {
  let h = ((seed >>> 0) ^ 0x50415254) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// Fill a build's rows (in `ids` order) to 8 sockets: the STRESS order (the
// instance multipliers) first, then the rest of `pool` ascending — a node
// only where its verdict is LIVE and its limit allows. No RNG (BUILD_BRIEF
// §25.10 max-stress build; also the Healer's under `?partygrant=max`).
export function fillStress(build, ids, pool) {
  const order = [...STRESS_ORDER, ...pool];
  for (const sid of ids) {
    if (!sid) continue;
    for (const nid of order) {
      if (!pool.includes(nid) || !NODES[nid]) continue;
      const row = build.view().skills.find((k) => k.id === sid);
      if (!row || row.filled >= 8) break;
      const copies = row.sockets.filter((x) => x && x.node === nid).length;
      if (copies >= NODES[nid].limit) continue;
      if (build.verdictFor(sid, nid).state !== 'live') continue;
      build.grantNode(nid, 'grant');
      const r = build.socket(sid, nid);
      if (!r || r.denied) break;
    }
  }
}

export function createPartySystem({ rng, registry, events, combat, getTick, player, isIframed, queueDeferred, queueContinuation, isCombatActive, isBetweenRooms = null }) {
  let stream = createGameplayRng(partySeed(rng.seed));
  let mode = 'suggest';
  const autoSocketOwn = [false, false, false, false];
  let caster = null; // sim/allycast.js (late-bound by the ally system)
  let tech = null; // sim/partytech.js (late-bound)
  // PLAN §16.6: a schema-3 save's ally catch-up grant (MIGRATIONS[3] queues it;
  // applied once on the first tick after the load), and the auto-fill it owes
  // at the next non-combat point.
  let catchUp = null;
  let fillOwed = false;

  const body = (i) => registry.all().find((e) => e.kind === 'ally' && e.partyIndex === i) || null;

  // One event view per seat: every event its build emits carries `seat`
  // (PLAN §16.3 — seat keys on ally events only; seat 0's payloads unchanged).
  const seatEvents = (seat) => {
    // (the sim bus view is frozen: a plain copy with its own emit)
    return { ...events, emit: (tick, type, payload = {}) => events.emit(tick, type, { ...payload, seat }) };
  };

  const seats = [null];
  for (const i of PARTY_SEATS) {
    const classId = CLASS_OF_SEAT[i];
    const s = {
      seat: i,
      classId,
      slots: [...STARTING_LOADOUT[classId]],
      purse: 0,
      state: { combo: {}, recentCasts: [], retaliate: {}, stillSince: 0 },
      auraNext: {}, // passive skillId -> next pulse tick
      build: null,
    };
    s.build = createBuildSystem({
      player,
      registry,
      events: seatEvents(i),
      combat,
      getTick,
      isIframed,
      queueDeferred,
      queueContinuation,
      getSkillSlots: () => s.slots.map((id) => (id ? { id } : null)),
      isCombatActive,
      seat: i,
      classId,
      caster: () => body(i) || player,
      echoCast: (rec, def, power) => (caster ? caster.echo(i, rec, def, power) : null),
      pulseCast: (id, o) => pulse(i, id, o),
    });
    seats.push(s);
  }
  // A draft system per seat over its class pools (party stream).
  const drafts = [null];
  for (const i of PARTY_SEATS) {
    const s = seats[i];
    drafts.push(
      createDraftSystem({
        rng: { int: (n) => stream.int(n) },
        build: () => s.build,
        slots: () => s.slots.map((id) => (id ? { id } : null)),
        skillIds: [...CLASS_SKILLS[s.classId]].sort(),
        nodeIds: nodePoolOf(s.classId),
      })
    );
  }

  const seatOk = (i) => Number.isInteger(i) && i >= 1 && i <= 3;
  const S = (i) => (seatOk(i) ? seats[i] : null);

  // ------------------------------------------------------------ loadouts --
  // swap(seat, skillId, slot?) — the ONLY way a class skill enters a full
  // loadout: `skillId` takes `slot`, the old skill leaves (back to the class
  // pool), its nodes go to the bench (never lost; Resonance, pending Echo
  // recasts and the pulse / Reapply clocks end with it). No slot on a full
  // loadout → `swap_denied full`. Never a 5th skill.
  function swap(seat, skillId, slot = null, { by = 'cmd' } = {}) {
    const s = S(seat);
    const tick = getTick();
    const deny = (reason) => {
      events.emit(tick, 'swap_denied', { seat, reason, skill: skillId ?? null });
      return { denied: reason };
    };
    if (!s) return deny('no_such_seat');
    const def = SKILLS[skillId];
    if (!def) return deny('unknown');
    if (def.cls !== s.classId) return deny('not_class');
    if (s.slots.includes(skillId)) return deny('owned');
    if (isCombatActive()) return deny('combat_active');
    let target = slot;
    if (target === null || target === undefined) {
      target = s.slots.indexOf(null);
      if (target < 0) return deny('full');
    }
    if (!(Number.isInteger(target) && target >= 0 && target < SKILL_SLOTS)) return deny('no_such_slot');
    const replaced = s.slots[target];
    const released = replaced ? s.build.releaseSkill(replaced) : [];
    if (replaced) delete s.auraNext[replaced];
    s.slots[target] = skillId;
    if (def.shape === 'aura') s.auraNext[skillId] = tick + AURA_CADENCE_TICKS;
    const a = body(seat);
    if (a && Array.isArray(a.cds)) a.cds[target] = tick; // the new skill is ready
    events.emit(tick, 'skill_swapped', { seat, id: skillId, slot: target, replaced: replaced ?? null, released: [...released], by });
    return { ok: true, slot: target, replaced: replaced ?? null, released };
  }

  // reorder(seat, from, to) — swap two rows (sockets travel with their skill).
  function reorder(seat, from, to) {
    const s = S(seat);
    const tick = getTick();
    if (!s) return { denied: 'no_such_seat' };
    if (isCombatActive()) {
      events.emit(tick, 'swap_denied', { seat, reason: 'combat_active' });
      return { denied: 'combat_active' };
    }
    const ok = (k) => Number.isInteger(k) && k >= 0 && k < SKILL_SLOTS;
    if (!ok(from) || !ok(to) || from === to) return { denied: 'no_such_slot' };
    const t = s.slots[from];
    s.slots[from] = s.slots[to];
    s.slots[to] = t;
    const a = body(seat);
    if (a && Array.isArray(a.cds)) {
      const c = a.cds[from];
      a.cds[from] = a.cds[to];
      a.cds[to] = c;
    }
    events.emit(tick, 'loadout_reorder', { seat, from, to, slots: [...s.slots] });
    return { ok: true, slots: [...s.slots] };
  }

  // The AI's own order after an AI swap (§25.8).
  function aiSort(seat) {
    const s = S(seat);
    if (!s) return;
    const want = prioritySorted(s.classId, s.slots.filter(Boolean));
    while (want.length < SKILL_SLOTS) want.push(null);
    // Reorder by pairwise swaps (sockets and cooldowns travel).
    for (let i = 0; i < SKILL_SLOTS; i++) {
      if (s.slots[i] === want[i]) continue;
      const j = s.slots.indexOf(want[i]);
      if (j > i) {
        const t = s.slots[i];
        s.slots[i] = s.slots[j];
        s.slots[j] = t;
        const a = body(seat);
        if (a && Array.isArray(a.cds)) {
          const c = a.cds[i];
          a.cds[i] = a.cds[j];
          a.cds[j] = c;
        }
      }
    }
  }

  // ------------------------------------------------------------- passives --
  // Class passives pulse on their 1.0 s cadence, ascending slot per seat, in
  // the world's ④ phase (after the Healer's auras).
  function pulsePhase() {
    const tick = getTick();
    for (const i of PARTY_SEATS) {
      const s = seats[i];
      for (let k = 0; k < SKILL_SLOTS; k++) {
        const id = s.slots[k];
        if (!id || SKILLS[id].shape !== 'aura') continue;
        const next = s.auraNext[id];
        if (next === undefined) {
          s.auraNext[id] = tick + AURA_CADENCE_TICKS;
          continue;
        }
        if (tick < next) continue;
        s.auraNext[id] = next + AURA_CADENCE_TICKS;
        // A class passive is a combat field: in a live run, between rooms (the
        // party page, the doors, the shelf) and on the level card it keeps its
        // cadence but does not pulse — the §25.9 carry rule (no statuses at
        // the card). Harness scenes (no run) pulse as always.
        if (isBetweenRooms && isBetweenRooms()) continue;
        pulse(i, id);
      }
    }
  }

  // One pulse of a class passive: Iron Stance (ally field: shields), Razor
  // Wake / Kestrel Watch (hostile field: damage). Emits aura_pulse { seat }.
  function pulse(seat, skillId, { echo = false } = {}) {
    const s = S(seat);
    const a = body(seat);
    if (!s || !a || !(a.hp > 0)) return null;
    const tick = getTick();
    const base = SKILLS[skillId];
    const def = s.build.resolveDef(base);
    let powerMul = 1;
    if (!echo) {
      const pm = s.build.pulseMods(skillId);
      if (pm && pm.powerMul) powerMul *= pm.powerMul;
    }
    const M = tech && def.field === 'hostile' ? tech.pulseMods(a, def) : null;
    const power = (M ? M.power : def.power) * powerMul;
    const r2max = def.area * def.area;
    const out = { seat, skill: skillId, x: r2(a.x), z: r2(a.z), area: r2(def.area) };
    const pulseInfo = { area: def.area, inside: [], hit: [], dealt: 0 };
    if (def.field === 'ally') {
      // Iron Stance: +power shield to every living party member inside (the
      // Tank included), this source capped at shieldCap, 240 ticks.
      const inside = registry
        .all()
        .filter((m) => m.partyIndex !== undefined && m.hp > 0 && (m.x - a.x) ** 2 + (m.z - a.z) ** 2 <= r2max)
        .sort((p, q) => p.partyIndex - q.partyIndex);
      const shielded = [];
      for (const m of inside) {
        const before = combat.status.magnitude(m, 'shield', tick);
        const rec = combat.status.addShield(m, power, def.shieldCap ?? 12, 240, tick, a.id, skillId);
        if (rec && rec.mag > before + 1e-6) shielded.push(m.id);
      }
      pulseInfo.inside = inside.map((m) => m.id);
      out.shielded = shielded;
    } else {
      // Hostile field: the N nearest hostiles inside (Kestrel: the nearest in
      // 4.0 u), a damage instance each (Razor Wake never knocks back).
      const count = Math.max(1, Math.floor(def.count ?? 1));
      const cands = registry
        .all()
        .filter((e) => e.faction === 'hostile' && e.hittable && e.hp > 0 && (e.x - a.x) ** 2 + (e.z - a.z) ** 2 <= r2max)
        .sort((p, q) => (p.x - a.x) ** 2 + (p.z - a.z) ** 2 - ((q.x - a.x) ** 2 + (q.z - a.z) ** 2) || p.id - q.id)
        .slice(0, count);
      const hit = [];
      for (const t of cands) {
        const tl = Math.hypot(t.x - a.x, t.z - a.z) || 1;
        const opts = { delivery: base.knockback === 0 ? 'skill' : 'basic', shape: 'aura', dirX: (t.x - a.x) / tl, dirZ: (t.z - a.z) / tl, attacker: a.id, source: skillId };
        if (base.knockback === 0) opts.kbScale = 0;
        if (def.critBonus) opts.critBonus = def.critBonus;
        if (M && M.critMul) opts.critMul = M.critMul;
        if (M && M.forceCrit) opts.forceCrit = true;
        if (M && M.kbScale !== undefined && base.knockback !== 0) opts.kbScale = M.kbScale;
        let p = power;
        if (M && M.execute && t.hp <= t.maxHp * 0.35) p *= 2;
        const r = tech ? tech.instance({ seat, castId: -1, echo, skill: skillId, pulse: true }, () => combat.applyDamage(t, p, opts)) : combat.applyDamage(t, p, opts);
        if (r && !r.immune && !r.blocked) {
          hit.push(t.id);
          pulseInfo.dealt += r.amount ?? 0;
        }
      }
      pulseInfo.hit = hit;
      out.hit = hit;
    }
    if (echo) out.echo = true;
    events.emit(tick, 'aura_pulse', out);
    if (tech) tech.afterPulse(seat, skillId, pulseInfo);
    return out;
  }

  // ------------------------------------------------------------- phases --
  function step(tick) {
    for (const i of PARTY_SEATS) seats[i].build.step(tick);
  }
  function discrete() {
    if (catchUp) applyCatchUp();
    if (fillOwed && !isCombatActive()) {
      fillOwed = false;
      for (const i of PARTY_SEATS) seats[i].build.autoFill();
    }
    for (const i of PARTY_SEATS) seats[i].build.discrete();
  }

  // STARTER_GRANT[level].allies + 2 nodes and 12 Glint per ally per combat
  // room already cleared in the level — party stream, seat order, once.
  function applyCatchUp() {
    const c = catchUp;
    catchUp = null;
    const g = grantFor(c.level);
    const perSeat = {};
    for (const i of PARTY_SEATS) perSeat[i] = 0;
    if (g && g.allies) {
      const r = applyGrant({ ...g.allies }, 'catchup', { fill: false });
      for (const rec of r) perSeat[rec.seat] += rec.nodes.length;
    }
    const rooms = Math.max(0, c.roomsCleared | 0);
    for (const i of PARTY_SEATS) {
      const s = seats[i];
      for (let k = 0; k < rooms; k++) {
        const ids = drafts[i].spoils(2);
        for (const id of ids) s.build.grantNode(id, 'catchup');
        perSeat[i] += ids.length;
        s.purse += 12;
      }
    }
    fillOwed = true;
    events.emit(getTick(), 'party_catchup', { level: c.level, rooms, perSeat });
  }
  function endOfTick() {
    if (tech) tech.endOfTick(getTick());
    // A seat build's `lastHit` correlates a death with the hit that caused
    // it in the SAME tick only (nodes.js); cleared at the tick's end so the
    // replicated state does not churn with every hit (GP.10 bandwidth).
    for (const i of PARTY_SEATS) {
      const t = seats[i].build.tech;
      if (t && t.lastHit() !== null) t.setLastHit(null);
    }
  }

  // --------------------------------------------------------- grants / build --
  function grantNode(seat, id, provenance = 'grant') {
    const s = S(seat);
    if (!s || !NODES[id]) return { error: 'unknown' };
    if (!nodePoolOf(s.classId).includes(id)) return { error: 'not_class' };
    return s.build.grantNode(id, provenance);
  }
  function autoFill(which) {
    if (which === 'all') return PARTY_SEATS.map((i) => ({ seat: i, ...seats[i].build.autoFill() }));
    const s = S(which);
    return s ? s.build.autoFill() : { error: 'no_such_seat' };
  }
  function gainPurse(seat, amount, reason) {
    const s = S(seat);
    if (!s) return null;
    s.purse += amount;
    events.emit(getTick(), 'purse_gain', { seat, amount, purse: s.purse, reason });
    return s.purse;
  }

  // An ally starter grant / catch-up (§25.10 STARTER_GRANT[N].allies): swap
  // offers resolved by the §25.8 AI rule, node draws in pairs with auto-fill
  // after each, legendary draws, purse Glint. Party stream, seat order.
  function applyGrant(g, provenance = 'grant', { fill = true } = {}) {
    if (!g) return null;
    const out = [];
    for (const i of PARTY_SEATS) {
      const s = seats[i];
      const d = drafts[i];
      const rec = { seat: i, swaps: [], nodes: [] };
      for (let k = 0; k < (g.swaps ?? 0); k++) {
        const pool = d.skillPool();
        if (pool.length === 0) break;
        const id = pool[stream.int(pool.length)];
        const sug = swapSuggestion(s.classId, s.slots, id);
        if (sug.choice === 'take') {
          swap(i, id, sug.replace, { by: 'grant' });
          aiSort(i);
          rec.swaps.push(id);
        }
      }
      for (let left = g.nodes ?? 0; left > 0; ) {
        const ids = d.spoils(Math.min(2, left));
        if (ids.length === 0) break;
        for (const id of ids) {
          s.build.grantNode(id, provenance);
          rec.nodes.push(id);
        }
        left -= ids.length;
        if (fill) s.build.autoFill();
      }
      for (let k = 0; k < (g.legendaries ?? 0); k++) {
        const pool = d.nodePool().filter((id) => NODES[id].rarity === 'legendary');
        const up = pool.length ? pool : d.upgradePool().filter((id) => NODES[id].rarity === 'legendary');
        if (up.length === 0) break;
        const id = up[stream.int(up.length)];
        s.build.grantNode(id, provenance);
        rec.nodes.push(id);
        if (fill) s.build.autoFill();
      }
      if (g.glint) {
        s.purse += g.glint;
        rec.glint = g.glint;
      }
      out.push(rec);
    }
    events.emit(getTick(), 'party_grant', { provenance, seats: out.map((r) => ({ seat: r.seat, swaps: [...r.swaps], nodes: r.nodes.length, glint: r.glint ?? 0 })) });
    return out;
  }

  // The deterministic MAX-STRESS build (BUILD_BRIEF §25.10): no RNG.
  function stressSeat(i) {
    const s = seats[i];
    const want = STRESS_LOADOUT[s.classId];
    for (let k = 0; k < SKILL_SLOTS; k++) {
      if (s.slots[k] === want[k]) continue;
      const cur = s.slots.indexOf(want[k]);
      if (cur >= 0) reorderRaw(i, cur, k);
      else {
        const replaced = s.slots[k];
        if (replaced) {
          s.build.releaseSkill(replaced);
          delete s.auraNext[replaced];
        }
        s.slots[k] = want[k];
        if (SKILLS[want[k]].shape === 'aura') s.auraNext[want[k]] = getTick() + AURA_CADENCE_TICKS;
      }
    }
    fillStress(s.build, want, nodePoolOf(s.classId));
  }
  function reorderRaw(i, from, to) {
    const s = seats[i];
    const t = s.slots[from];
    s.slots[from] = s.slots[to];
    s.slots[to] = t;
  }
  function stress() {
    const out = [];
    for (const i of PARTY_SEATS) {
      stressSeat(i);
      out.push({ seat: i, slots: [...seats[i].slots], filled: seats[i].build.view().skills.reduce((n, k) => n + k.filled, 0) });
    }
    events.emit(getTick(), 'party_stress', { seats: out.map((o) => ({ seat: o.seat, filled: o.filled })) });
    return out;
  }

  // ------------------------------------------------------------------ views --
  function seatView(i) {
    const s = S(i);
    if (!s) return null;
    const bv = s.build.view();
    return {
      seat: i,
      classId: s.classId,
      slots: [...s.slots],
      purse: s.purse,
      bench: bv.bench,
      skills: bv.skills,
      filled: bv.skills.reduce((n, k) => n + k.filled, 0),
      sockets: bv.skills.length * bv.socketCount,
      mode,
      autoSocketOwn: autoSocketOwn[i],
    };
  }
  function pools(i) {
    const s = S(i);
    if (!s) return null;
    const d = drafts[i];
    return { skill: d.skillPool(), node: d.nodePool(), upgrade: d.upgradePool(), classSkills: [...CLASS_SKILLS[s.classId]], classNodes: nodePoolOf(s.classId) };
  }
  // PLAN §16.2 oracle surface.
  function partyPools() {
    const out = {};
    for (const c of ALLY_CLASS_IDS) out[c] = { skills: [...CLASS_SKILLS[c]], nodes: nodePoolOf(c) };
    return out;
  }
  function partyVerdicts() {
    const out = {};
    for (const c of ALLY_CLASS_IDS) {
      out[c] = {};
      for (const sid of CLASS_SKILLS[c]) {
        out[c][sid] = {};
        for (const nid of nodePoolOf(c)) out[c][sid][nid] = classVerdict(SKILLS[sid], nid).state;
      }
    }
    return out;
  }

  // ---------------------------------------------------------- persistence --
  function resetForRun(seed) {
    stream = createGameplayRng(partySeed(seed));
    for (const i of PARTY_SEATS) {
      const s = seats[i];
      s.slots = [...STARTING_LOADOUT[s.classId]];
      s.purse = 0;
      s.state = { combo: {}, recentCasts: [], retaliate: {}, stillSince: getTick() };
      s.auraNext = {};
      catchUp = null;
      fillOwed = false;
      // Silent (no build_restored): a run start must not add events.
      s.build.loadState({ bench: [], assignments: [], resonance: [], suppress: 0, lastHeal: null, lastHit: null, echoQueue: [], auraEchoNext: [] });
    }
  }
  // A level transition (CARRY_RULES reset): pending Echo recasts, Reapply
  // clocks, Retaliate windows, combo / recent-cast memory end with the level.
  function resetLevelState() {
    const tick = getTick();
    for (const i of PARTY_SEATS) {
      const s = seats[i];
      const bs = structuredClone(s.build.saveState());
      bs.echoQueue = [];
      bs.auraEchoNext = [];
      s.build.loadState(bs);
      s.state = { combo: {}, recentCasts: [], retaliate: {}, stillSince: tick };
      for (const id of Object.keys(s.auraNext)) s.auraNext[id] = tick + AURA_CADENCE_TICKS;
    }
  }

  function saveState() {
    return {
      v: 1,
      rng: stream.getState(),
      mode,
      autoSocketOwn: [...autoSocketOwn],
      ...(catchUp ? { catchUp: { ...catchUp } } : {}),
      ...(fillOwed ? { fillOwed: true } : {}),
      // The technique module's cross-tick memory + the cast id counter.
      tech: tech ? tech.saveState() : null,
      castSeq: caster ? caster.getSeq() : 0,
      seats: [
        null,
        ...PARTY_SEATS.map((i) => {
          const s = seats[i];
          return { seat: i, classId: s.classId, slots: [...s.slots], purse: s.purse, build: s.build.saveState(), state: structuredClone(s.state), auraNext: { ...s.auraNext } };
        }),
      ],
    };
  }
  function loadState(d) {
    if (!d || !Array.isArray(d.seats)) throw new TypeError('party.loadState: missing seats');
    if (d.rng) {
      stream = createGameplayRng(d.rng.seed >>> 0);
      stream.setState(d.rng);
    }
    mode = PARTY_MODES.includes(d.mode) ? d.mode : 'suggest';
    catchUp = d.catchUp && Number.isFinite(d.catchUp.level) ? { level: d.catchUp.level, roomsCleared: d.catchUp.roomsCleared | 0 } : null;
    fillOwed = !!d.fillOwed;
    if (tech) tech.loadState(d.tech ?? null);
    if (caster) caster.setSeq(d.castSeq ?? 0);
    for (let k = 0; k < 4; k++) autoSocketOwn[k] = !!(d.autoSocketOwn && d.autoSocketOwn[k]);
    for (const i of PARTY_SEATS) {
      const s = seats[i];
      const src = d.seats[i];
      if (!src) continue;
      // Never more than 4 skills, only this class's skills (a hand-edited
      // save cannot smuggle in a 5th or a foreign one).
      const slots = (Array.isArray(src.slots) ? src.slots : []).slice(0, SKILL_SLOTS).map((id) => (SKILLS[id] && SKILLS[id].cls === s.classId ? id : null));
      const seen = new Set();
      for (let k = 0; k < slots.length; k++) {
        if (slots[k] && seen.has(slots[k])) slots[k] = null;
        if (slots[k]) seen.add(slots[k]);
      }
      while (slots.length < SKILL_SLOTS) slots.push(null);
      s.slots = slots;
      s.purse = Number.isFinite(src.purse) ? src.purse : 0;
      s.state = src.state ? structuredClone(src.state) : { combo: {}, recentCasts: [], retaliate: {}, stillSince: 0 };
      s.auraNext = src.auraNext ? { ...src.auraNext } : {};
      if (src.build) s.build.loadState(src.build);
    }
  }

  // Probe view (never saved): all four characters.
  function state() {
    return { mode, autoSocketOwn: [...autoSocketOwn], rng: stream.getState(), seats: PARTY_SEATS.map((i) => seatView(i)) };
  }

  return {
    seat: (i) => {
      const s = S(i);
      return s ? { classId: s.classId, slots: [...s.slots], purse: s.purse, build: s.build } : null;
    },
    build: (i) => (S(i) ? seats[i].build : null),
    slots: (i) => (S(i) ? seats[i].slots : null),
    seatState: (i) => (S(i) ? seats[i].state : null),
    body,
    swap,
    reorder,
    aiSort,
    view: seatView,
    pools,
    partyPools,
    partyVerdicts,
    grantNode,
    autoFill,
    gainPurse,
    purse: (i) => (S(i) ? seats[i].purse : null),
    setPurse: (i, n) => {
      const s = S(i);
      if (!s) return null;
      s.purse = Math.max(0, Math.round(n));
      return s.purse;
    },
    spend: (i, n) => {
      const s = S(i);
      if (!s || s.purse < n) return false;
      s.purse -= n;
      return true;
    },
    draft: (i) => (S(i) ? drafts[i] : null),
    stream: () => stream,
    applyGrant,
    stress,
    pulse,
    pulsePhase,
    step,
    discrete,
    endOfTick,
    resetForRun,
    resetLevelState,
    saveState,
    loadState,
    state,
    mode: () => mode,
    setMode(m) {
      if (!PARTY_MODES.includes(m)) return null;
      mode = m;
      events.emit(getTick(), 'party_mode', { mode });
      return mode;
    },
    autoSocketOwn: (i) => !!autoSocketOwn[i],
    setAutoSocketOwn(i, on) {
      if (!(Number.isInteger(i) && i >= 0 && i <= 3)) return null;
      autoSocketOwn[i] = !!on;
      return autoSocketOwn[i];
    },
    attach({ caster: c, tech: t }) {
      if (c) caster = c;
      if (t) tech = t;
    },
    tech: () => tech,
    caster: () => caster,
  };
}
