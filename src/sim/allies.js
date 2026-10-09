// Ally AI + the party command verbs + the downed/revive contract
// (BUILD_BRIEF §7 ally kits, §8 mark/rally, §10 downed & revive, §12 ally AI).
//
// Every stat in ALLY_CLASSES / ALLY_KITS is the §7 table VERBATIM. The handful
// of steering scaffolds (stand-off distance, rally arrival radius, revive
// approach distance) are DERIVED from brief figures and labelled where they
// appear — nothing here is invented out of thin air.
//
// What this module owns:
//
//   LEASH (§12) — reference is the room's live leash_anchor: the party anchor
//     (the player) in kill_all/boss/shop, the Waystone in defend until
//     soft-fail flips it. Radius 3.4 u. An ally NEVER advances outward past
//     that ring (marked targets are leash-capped, never pursued past the
//     boundary); beyond it with no in-range target it disengages and walks to
//     the anchor, and only re-engages once inside 0.8 x radius. Anchor
//     tracking follows a Downed anchor's crawl for free (it reads live x/z).
//
//   TARGETING (§8/§12) — with no mark, ONE shared computation picks the enemy
//     nearest the leash anchor (ties by ascending spawn ordinal), which is
//     what produces natural focus fire. The player's Tab mark overrides for
//     all allies and is honored live; a mark that dies is cleared, a mark that
//     drifts out of leash+reach is NOT cleared — the ally falls back to
//     nearest-to-anchor and resumes the mark when it is reachable again.
//
//   RALLY (§8) — R captures the player's position that tick; every ally breaks
//     engagement (revive channels included) and moves there; on arrival it
//     holds with no re-engagement for 1.0 s, then resumes. Re-press re-points
//     immediately. Denied `not_anchor` while the player is Downed.
//
//   DOWNED / REVIVE (§10) — hold-E 5.0 s stationary channel within 0.6 u of a
//     downed body, one reviver per body (second attempt denied
//     `revive_occupied`), revive at 30% max_hp with -10 pp per same-room
//     repeat (floor 10%), free 30% revive for everyone on room clear (exempt
//     from diminishing), breaks reset to 0 and drain in reverse at 2x, and all
//     four Downed on one tick emits `defeat`.
//
//   AI REVIVE (§12) — serial rescue, player's body first then longest-Downed;
//     reviver = nearest eligible ally with HP >= 30% of its own max;
//     eagerness unconditional (it breaks off combat immediately). Rally
//     interrupts an AI channel (reset, not resume).
//
// Sim discipline: no DOM, no render imports, no wall clock — integer tick
// counts only. The only seeded-RNG draws this module causes are the crit rolls
// inside combat.applyDamage, taken in resolution order, so one seed replays.
import { TICK_HZ } from '../core/constants.js';
import { DENIAL } from '../core/intents.js';
import { walkStep } from './movement.js';
import { clampPlacement, countFinal, clampHalfAngle, createSkillBolts, fanDirections } from './shapes.js';
// Network play (M5b, docs/gauntlet/PLAN.md §3.7): human-controlled ally seats
// share one movement / dodge model with the guest's own-seat predictor.
import { stepHumanMove, dodgeVelocity, aimDir, DOWNED_CRAWL_SPEED, HUMAN_DODGE } from './remote.js';
// PARTY (docs/gauntlet/PLAN.md §16.3): every ally skill — AI or human seat —
// is cast from the seat's LOADOUT (sim/party.js) through ONE pipeline
// (sim/allycast.js); the AI picks with the §25.8 rules (sim/partyai.js).
import { SKILLS } from './skills.js';
import { CLASS_BASE_KIT, STARTING_LOADOUT, AI_ENGAGE, AI_EVADE, AI_KITE, MELEE_CLASSES, AI_IDLE_FALLBACK_TICKS, CLASS_TECH } from '../data/classes.js';
import { createAllyCaster, cdTicksOf } from './allycast.js';
import { castChoice } from './partyai.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;
const secTicks = (s) => Math.round(s * TICK_HZ);
const CD_FLOOR_TICKS = secTicks(0.5); // §6 cooldown floor, shared with the healer kit
const ZONE_CADENCE_TICKS = secTicks(1.0); // §6: zone cadence 1.0 s, first tick at 1.0 s

// §12 leash: radius 3.4 u, re-engage only once inside 0.8 x radius.
export const LEASH = Object.freeze({ radius: 3.4, reengageFactor: 0.8 });

// §12 ally separation: 0.26 u soft push (same figure the enemy block reuses).
const SEPARATION = 0.26;

// Round-2 advisory (leash yo-yo). §12's hysteresis read literally — "beyond the
// leash with no valid in-range target -> disengage, re-engage only inside
// 0.8 x radius" — makes an ally whose target is parked permanently outside the
// ring pace a 0.7 u loop forever (the critic measured 13 return<->engage flips
// in 6 s at 2.72 u <-> 3.40 u). The cause is that the ring is exactly where the
// ally's own steering PARKS it: the engage goal is leash-capped, so standing ON
// the boundary was being read as "beyond the leash". Disengage therefore needs
// the ally to be a full separation step (§12's own 0.26 u) OUTSIDE the ring —
// a distance its steering can never produce, so it only happens when the anchor
// itself has walked away, which is the case the hysteresis is actually for.
// The re-engage threshold stays 0.8 x radius, verbatim.
const LEASH_DEADZONE = SEPARATION;
const SEP_STEP_CAP = 0.02; // u per tick of separation correction (scaffold)

// §10 revive contract.
export const REVIVE = Object.freeze({
  channelTicks: secTicks(5.0), // 5.0 s uninterrupted
  range: 0.6, // u — "within 0.6 u of a downed ally"
  basePct: 0.3, // restored to 30% max_hp
  stepPct: 0.1, // -10 pp per same-room repeat
  floorPct: 0.1, // floor 10%
  drainMult: 2, // interrupt = reverse drain at 2x speed (§10/§17)
  aiMinHpFrac: 0.3, // §12: reviver = nearest eligible ally with HP >= 30% of own max
  // Scaffold: an AI reviver stops just INSIDE the §10 0.6 u adjacency figure
  // (0.92 x) — far enough out that the reviver kneels BESIDE the body instead
  // of on top of it (which hid both the body and its revive ring), close
  // enough that it can never sit on the break boundary. The reviver freezes
  // the moment its channel starts, so nothing can drift it back out.
  approach: 0.55,
});

// §8 rally: hold 1.0 s with no re-engagement on arrival.
export const RALLY = Object.freeze({
  graceTicks: secTicks(1.0),
  // Arrival radius derived from the bodies themselves: two 0.3 u capsules plus
  // the §12 separation push is the tightest three allies can legally cluster.
  arriveDist: 0.3 * 2 + SEPARATION,
});

// §7 party class rows — VERBATIM (max_hp / move_speed / attack_interval /
// basic_attack_power / basic geometry). `standRange` is the only scaffold: the
// distance the AI closes to, derived as a fraction of its own basic reach so
// the attack always lands with margin (§12 "steer to own attack/skill range").
export const ALLY_CLASSES = Object.freeze({
  tank: Object.freeze({
    classId: 'tank',
    partyIndex: 1,
    maxHp: 150,
    moveSpeed: 2.1,
    attackIntervalTicks: secTicks(0.65),
    basicPower: 9,
    basicShape: 'melee_arc',
    basicRange: 0.9, // arc reach 0.90
    basicHalfAngle: 50, // half-angle 50°
    standRange: 0.9 * 0.85,
  }),
  swordsman: Object.freeze({
    classId: 'swordsman',
    partyIndex: 2,
    maxHp: 95,
    moveSpeed: 2.65,
    attackIntervalTicks: secTicks(0.35),
    basicPower: 11,
    basicShape: 'melee_arc',
    basicRange: 0.75, // arc reach 0.75
    basicHalfAngle: 40, // half-angle 40°
    standRange: 0.75 * 0.85,
  }),
  archer: Object.freeze({
    classId: 'archer',
    partyIndex: 3,
    maxHp: 80,
    moveSpeed: 2.5,
    attackIntervalTicks: secTicks(0.4),
    basicPower: 12,
    basicShape: 'projectile',
    basicRange: 4.5, // range 4.5
    basicSpeed: 5.6, // projectile 5.6 u/s
    standRange: 4.5 * 0.8,
  }),
  // THE TIDECALLER (docs/TIDECALLER.md, not a §7 row): the otter. Spit is a
  // fast, light water bolt that never soaks (her skills do the soaking);
  // Dive is the shared dodge plus a puddle that soaks (humanDodge below).
  tidecaller: Object.freeze({
    classId: 'tidecaller',
    partyIndex: 3, // the seat she takes by default (the Archer stays at camp)
    maxHp: 85,
    moveSpeed: 2.5,
    attackIntervalTicks: secTicks(0.35),
    basicPower: 6,
    basicShape: 'projectile',
    basicRange: 4.5,
    basicSpeed: 6.0,
    standRange: 4.5 * 0.8,
  }),
});

const BOLT_RADIUS = 0.05; // same swept-vs-wall scaffold radius as every other bolt

// §7 ally kits — derived from the cls-tagged SKILLS rows (field for field the
// v0.5.150 table below) in data/classes.js CLASS_BASE_KIT order. No longer a
// starting loadout (v0.5.227: every seat starts empty); kept exported for
// the render warm-up and probes.
//   melee_arc: range = reach u, area = half-angle °, count = max targets
//   nova:      area = burst radius u, count = max targets
//   projectile:range = max travel u, count = simultaneous bolts, speed u/s
//   ground_aoe:range = max placement u, area = zone radius u, durationSec
export const ALLY_KITS = Object.freeze({
  tank: Object.freeze(CLASS_BASE_KIT.tank.map((id) => SKILLS[id])),
  swordsman: Object.freeze(CLASS_BASE_KIT.swordsman.map((id) => SKILLS[id])),
  archer: Object.freeze(CLASS_BASE_KIT.archer.map((id) => SKILLS[id])),
  tidecaller: Object.freeze(CLASS_BASE_KIT.tidecaller.map((id) => SKILLS[id])),
});

// The v0.5.150 kit table, verbatim (reference only — the SKILLS rows above
// equal it field for field; gntPARTY-sim GP.1 checks it).
export const ALLY_KITS_V150 = Object.freeze({
  // Tank (badger): Heavy Slam (arc 34, 5 s, 1.00/40°, cap 3) · Brutal Cleave
  // (arc 16/target, 4 s, 0.95/80°, cap 6) · Ground Crack (ground_aoe 10/tick,
  // 8 s, range 2.6, radius 0.9, 4 s) · Whirling Guard (nova 20/target, 9 s,
  // 1.3, cap 5).
  tank: Object.freeze([
    Object.freeze({ id: 'heavy_slam', name: 'Heavy Slam', abbrev: 'HS', shape: 'melee_arc', power: 34, cd: 5, range: 1.0, area: 40, count: 3 }),
    Object.freeze({ id: 'brutal_cleave', name: 'Brutal Cleave', abbrev: 'BC', shape: 'melee_arc', power: 16, cd: 4, range: 0.95, area: 80, count: 6 }),
    Object.freeze({ id: 'ground_crack', name: 'Ground Crack', abbrev: 'GC', shape: 'ground_aoe', power: 10, cd: 8, range: 2.6, area: 0.9, durationSec: 4 }),
    Object.freeze({ id: 'whirling_guard', name: 'Whirling Guard', abbrev: 'WG', shape: 'nova', power: 20, cd: 9, area: 1.3, count: 5 }),
  ]),
  // Swordsman (fox): Flurry (arc 11/hit, 3 s, 0.80/60°, cap 6) · Lunge Strike
  // (arc 26, 4 s, 1.30/30°, cap 2) · Blade Storm (nova 14/target, 7 s, 1.0,
  // cap 5) · Caltrops (ground_aoe 8/tick, 6.5 s, range 2.0, radius 0.70, 5 s).
  swordsman: Object.freeze([
    Object.freeze({ id: 'flurry', name: 'Flurry', abbrev: 'FL', shape: 'melee_arc', power: 11, cd: 3, range: 0.8, area: 60, count: 6 }),
    Object.freeze({ id: 'lunge_strike', name: 'Lunge Strike', abbrev: 'LS', shape: 'melee_arc', power: 26, cd: 4, range: 1.3, area: 30, count: 2 }),
    Object.freeze({ id: 'blade_storm', name: 'Blade Storm', abbrev: 'BS', shape: 'nova', power: 14, cd: 7, area: 1.0, count: 5 }),
    Object.freeze({ id: 'caltrops', name: 'Caltrops', abbrev: 'CT', shape: 'ground_aoe', power: 8, cd: 6.5, range: 2.0, area: 0.7, durationSec: 5 }),
  ]),
  // Archer (hare): Piercing Shot (projectile 30, 3 s, 5.5, speed 6.2) · Volley
  // (projectile 14/bolt, 4.5 s, 4.8, count 3 fan, speed 5.4) · Detonating
  // Charge (ground_aoe 12/tick, 7 s, range 4.2, radius 0.85, 3 s) · Sundering
  // Nova (nova 16/target, 8 s, 1.1, cap 4).
  archer: Object.freeze([
    Object.freeze({ id: 'piercing_shot', name: 'Piercing Shot', abbrev: 'PS', shape: 'projectile', power: 30, cd: 3, range: 5.5, speed: 6.2, count: 1 }),
    Object.freeze({ id: 'volley', name: 'Volley', abbrev: 'VO', shape: 'projectile', power: 14, cd: 4.5, range: 4.8, speed: 5.4, count: 3 }),
    Object.freeze({ id: 'detonating_charge', name: 'Detonating Charge', abbrev: 'DC', shape: 'ground_aoe', power: 12, cd: 7, range: 4.2, area: 0.85, durationSec: 3 }),
    Object.freeze({ id: 'sundering_nova', name: 'Sundering Nova', abbrev: 'SN', shape: 'nova', power: 16, cd: 8, area: 1.1, count: 4 }),
  ]),
});

// Range test per delivery shape (§7: "AI casts a kit skill when: target in
// shape range AND off cooldown").
function shapeRange(def) {
  if (def.shape === 'nova') return def.area; // burst radius
  return def.range; // arc reach / projectile travel / placement range
}

const dist2 = (ax, az, bx, bz) => {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
};
const distTo = (e, x, z) => Math.hypot(e.x - x, e.z - z);

export function createAllySystem({
  player,
  registry,
  events,
  combat,
  rng, // reserved: ally rolls all live inside combat's crit pipeline
  getTick,
  getRoomState = () => null,
  party: partyRef = () => null, // PARTY: the party system (loadouts, seat builds)
}) {
  // --- party command state (§8, party-shared)
  let mark = null; // enemy spawn ordinal, or null
  let rallyPoint = null; // { x, z } captured on the rally tick
  let defeated = false;
  let flinchBreaks = false; // opt-in: see the header note on §10's closed break list

  // §10 repeat-revive diminishing, per party_index, reset every room.
  const repeats = [0, 0, 0, 0];

  // Active revive channels: target entity id -> channel record.
  //   { targetId, reviverId, progress (ticks), draining }
  const channels = new Map();

  // Round-2 advisory (denial spam). `revive_hold` is a HELD intent, so the
  // occupied-body denial used to fire on every tick E was down — 43 events in
  // 0.7 s, which wiped the 200-entry event ring in ~3.3 s and restarted §17's
  // 150-200 ms nudge every frame so it could never actually play. The denial is
  // now edge-triggered per reviver: one event per (body, occupier) pair, re-armed
  // when the key changes or the hold is released (§17 "restart on repeat").
  const denialEdge = new Map(); // reviverId -> last emitted `${target}:${occupier}`

  // Player-side channel bookkeeping (§10 "a held attack carried into the
  // channel is consumed silently").
  let carriedBasic = false;
  let prevBasicHeld = false;

  // PARTY: the one ally cast pipeline (created below, once the selectors exist).
  let caster = null;
  // fix-M4a-r5 (GP.8, data/classes.js AI_ENGAGE): the campaign engagement
  // rules are on while the run system says so (a live run, not the Node-only
  // legacy switch) — never in the ?room= harness, so the §16.9 goldens keep
  // their v0.5.150 traces. run.js installs the predicate.
  let engageFn = () => false;
  const engageOn = () => !!engageFn();
  const isMelee = (a) => MELEE_CLASSES.includes(a.classId);
  // The seat's leash ring: §12's 3.4 u, a melee seat's vanguard ring (+2.0 u)
  // while the engagement rules are on.
  const leashFor = (a) => LEASH.radius + (isMelee(a) && engageOn() ? AI_ENGAGE.vanguardU : 0);
  // GP.8 AI log (debug, never saved): seat -> skill -> { casts, fallbacks, lastTick }.
  const aiLog = [null, {}, {}, {}];
  let roomStartTick = 0;

  // Ally kit bolts ride their own subsystem instance (owner tag keeps the
  // healer kit from double-stepping them, §6 speeds are per-skill data).
  const bolts = createSkillBolts({
    registry,
    events,
    owner: 'ally_kits',
    onExpire: (tick, bolt) => {
      if (bolt.mods && caster) caster.boltExpire(tick, bolt);
    },
    onImpact: (tick, bolt, target) => {
      // PARTY: a bolt carrying per-cast modifiers (a built ally's skill)
      // resolves through the cast pipeline; a plain bolt keeps this path.
      if (bolt.mods && caster) {
        const tt = registry.byId(target.id);
        if (tt) caster.boltImpact(tick, bolt, tt);
        return;
      }
      const len = Math.hypot(bolt.vx, bolt.vz);
      const dirX = len > 1e-9 ? bolt.vx / len : 0;
      const dirZ = len > 1e-9 ? bolt.vz / len : 0;
      const targetId = target.id;
      const { power, skill, sourceId } = bolt;
      const t = registry.byId(targetId);
      if (!t) return;
      combat.applyDamage(t, power, { delivery: 'skill', shape: 'projectile', dirX, dirZ, attacker: sourceId, source: skill });
    },
  });

  // ------------------------------------------------------------- selectors --
  const party = () =>
    registry
      .all()
      .filter((e) => e.partyIndex !== undefined)
      .sort((a, b) => a.partyIndex - b.partyIndex);

  const allyList = () => registry.all().filter((e) => e.kind === 'ally');

  // Living, hittable hostiles (boar / mantis / dummy). Retreating enemies drop
  // `hittable` on the clear tick, so they leave the set for free (§13).
  const hostiles = () =>
    registry.all().filter((e) => e.faction === 'hostile' && e.hittable && e.hp > 0);

  caster = createAllyCaster({
    registry,
    events,
    combat,
    getTick,
    bolts,
    enemiesInArc: (...x) => enemiesInArc(...x),
    enemiesInNova: (...x) => enemiesInNova(...x),
    face: (...x) => face(...x),
    hostiles: () => hostiles(),
    party: () => party(),
    rewound: (f, fn) => rewound(f, fn),
    compensatedAim: (f, a, d) => compensatedAim(f, a, d),
    isIframed: (e) => (e.iframeUntilTick ?? 0) > getTick(),
    leashAnchor: () => leashAnchor(),
    leashRadius: (a) => leashFor(a),
    tech: () => {
      const P = partyRef();
      return P ? P.tech() : null;
    },
    build: (seat) => {
      const P = partyRef();
      return P ? P.build(seat) : null;
    },
    skillDef: (id) => SKILLS[id] ?? null,
  });

  // PARTY: a seat's loadout (ids ×4, null = empty) and resolved def.
  const loadoutOf = (a) => {
    const P = partyRef();
    const s = P ? P.slots(a.partyIndex) : null;
    return s ?? [...STARTING_LOADOUT[a.classId]];
  };
  const resolvedOf = (a, def) => {
    const P = partyRef();
    const b = P ? P.build(a.partyIndex) : null;
    return b ? b.resolveDef(def) : def;
  };
  function logCast(a, id, fallback, tick) {
    const L = aiLog[a.partyIndex];
    if (!L) return;
    const r = L[id] || (L[id] = { casts: 0, fallbacks: 0, lastTick: -1 });
    r.casts += 1;
    if (fallback) r.fallbacks += 1;
    r.lastTick = tick;
  }

  // §12: the room's live leash_anchor — the Waystone in a defend room until
  // soft-fail flips it back to the party.
  function leashAnchor() {
    const rs = getRoomState();
    if (rs && rs.mode === 'defend' && !rs.softFailed && rs.waystone) {
      const ws = registry.byId(rs.waystone.id);
      if (ws && ws.hp > 0) return ws;
    }
    return player;
  }

  // Nearest hostile to (x, z); ties break by ascending spawn ordinal (strict
  // `<` over the registry's ascending scan, §1).
  function nearestHostileTo(x, z) {
    let best = null;
    let bestD2 = Infinity;
    for (const e of hostiles()) {
      const d2 = dist2(e.x, e.z, x, z);
      if (d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    }
    return best;
  }

  // ------------------------------------------------------- mark (Tab, §8) --
  // Party-shared focus target. First press = nearest enemy to the PLAYER;
  // repeats cycle outward by distance (ties ascending spawn id); past the
  // farthest it wraps to nearest; the list is recomputed fresh each press.
  function cycleMark() {
    const tick = getTick();
    const list = hostiles().sort((a, b) => {
      const da = dist2(a.x, a.z, player.x, player.z);
      const db = dist2(b.x, b.z, player.x, player.z);
      return da !== db ? da - db : a.id - b.id;
    });
    if (list.length === 0) {
      events.emit(tick, 'mark', { id: null, reason: 'no_enemies' }); // §8 empty room: no-op
      return null;
    }
    let next;
    if (mark === null) next = list[0];
    else {
      const i = list.findIndex((e) => e.id === mark);
      next = i < 0 || i + 1 >= list.length ? list[0] : list[i + 1];
    }
    mark = next.id;
    events.emit(tick, 'mark', { id: mark, kind: next.kind, x: r2(next.x), z: r2(next.z), n: list.length });
    return mark;
  }

  function setMark(id) {
    const tick = getTick();
    if (id === null || id === undefined) {
      mark = null;
      events.emit(tick, 'mark', { id: null, reason: 'cleared' });
      return null;
    }
    const e = registry.byId(id);
    if (!e || e.faction !== 'hostile' || !(e.hp > 0)) return null;
    mark = id;
    events.emit(tick, 'mark', { id: mark, kind: e.kind, x: r2(e.x), z: r2(e.z) });
    return mark;
  }

  function clearMark(reason) {
    if (mark === null) return;
    mark = null;
    events.emit(getTick(), 'mark', { id: null, reason });
  }

  // ------------------------------------------------------ rally (R, §8) --
  function rally() {
    const tick = getTick();
    if (player.hp <= 0) {
      // §8: rally is unavailable to everyone while the player is Downed.
      events.emit(tick, 'intent_denied', { kind: 'rally', reason: DENIAL.notAnchor });
      return { denied: DENIAL.notAnchor };
    }
    rallyPoint = { x: player.x, z: player.z }; // captured THIS tick
    const ids = [];
    for (const a of allyList()) {
      if (isHuman(a)) continue; // M5b: a human seat is not ordered around
      const ch = a.reviveTargetId != null ? channels.get(a.reviveTargetId) : null;
      if (ch) breakChannel(ch, 'rally', tick); // §12: rally interrupts an AI channel (reset)
      a.aiState = 'rally';
      a.graceUntilTick = -1;
      a.targetId = null;
      ids.push(a.id);
    }
    events.emit(tick, 'rally', { x: r2(rallyPoint.x), z: r2(rallyPoint.z), allies: ids });
    return { x: r2(rallyPoint.x), z: r2(rallyPoint.z), allies: ids };
  }

  // ------------------------------------------------ downed bookkeeping (§10) --
  function markDown(m, tick, emitEvent) {
    if (m.downed) return;
    m.downed = true;
    m.downedTick = tick;
    // The body's own channel (if it was being revived) is meaningless now;
    // a channel this member was RUNNING breaks (§10: "or the reviver going
    // Downed (target stays down)").
    if (m.reviveTargetId != null) {
      const ch = channels.get(m.reviveTargetId);
      if (ch) breakChannel(ch, 'reviver_downed', tick);
    }
    if (m.kind === 'ally') {
      m.aiState = 'engage';
      m.targetId = null;
    }
    if (emitEvent) {
      events.emit(tick, 'downed', { id: m.id, kind: m.kind, x: r2(m.x), z: r2(m.z) });
    }
  }

  function refreshDowned(tick) {
    for (const m of party()) {
      if (m.hp <= 0) {
        // combat.js already emits `downed` for pipeline damage; a cmd-driven
        // HP floor (docs/TESTING.md setHp) has no event, so emit one here.
        if (!m.downed) markDown(m, tick, true);
      } else if (m.downed) {
        m.downed = false;
        m.downedTick = -1;
      }
    }
  }

  // -------------------------------------------------- revive channels (§10) --
  function startChannel(reviver, target, tick) {
    const ex = channels.get(target.id);
    if (ex && !ex.draining && ex.reviverId !== null && ex.reviverId !== reviver.id) {
      const key = `${target.id}:${ex.reviverId}`;
      if (denialEdge.get(reviver.id) !== key) {
        denialEdge.set(reviver.id, key);
        events.emit(tick, 'intent_denied', {
          kind: 'revive_hold',
          reason: DENIAL.reviveOccupied,
          target: target.id,
          by: reviver.id,
          occupiedBy: ex.reviverId,
        });
      }
      return false;
    }
    denialEdge.delete(reviver.id);
    if (ex && ex.reviverId === reviver.id) return true; // already channelling
    // A drained-out channel never resumes: the new one starts at 0 (§10).
    const ch = { targetId: target.id, reviverId: reviver.id, progress: 0, draining: false };
    channels.set(target.id, ch);
    reviver.reviveTargetId = target.id;
    if (reviver.id === player.id) carriedBasic = prevBasicHeld;
    events.emit(tick, 'revive_start', {
      target: target.id,
      targetIndex: target.partyIndex,
      reviver: reviver.id,
      reviverIndex: reviver.partyIndex,
      totalTicks: REVIVE.channelTicks,
    });
    return true;
  }

  // §10: progress resets to 0 and never resumes; §17 shows that reset as a
  // reverse drain at 2x the fill speed, so the ring keeps a visible remainder
  // that unwinds instead of snapping to empty.
  function breakChannel(ch, reason, tick) {
    if (ch.draining) return;
    const rev = ch.reviverId != null ? registry.byId(ch.reviverId) : null;
    if (rev) {
      rev.reviveTargetId = null;
      if (rev.kind === 'ally' && rev.aiState === 'revive') rev.aiState = 'engage';
    }
    if (ch.reviverId === player.id) carriedBasic = false;
    events.emit(tick, 'revive_break', {
      target: ch.targetId,
      reviver: ch.reviverId,
      reason,
      progress: ch.progress,
      pct: r2(ch.progress / REVIVE.channelTicks),
      drainRate: REVIVE.drainMult,
    });
    ch.reviverId = null;
    ch.draining = true;
  }

  function completeChannel(ch, tick) {
    const target = registry.byId(ch.targetId);
    const rev = ch.reviverId != null ? registry.byId(ch.reviverId) : null;
    channels.delete(ch.targetId);
    if (rev) {
      rev.reviveTargetId = null;
      if (rev.kind === 'ally') rev.aiState = 'engage';
    }
    if (rev && rev.id === player.id) carriedBasic = false;
    if (!target) return;
    const n = repeats[target.partyIndex] ?? 0;
    // §10: 30% -> -10 pp per repeat, floor 10%, same character/same room,
    // manual revives only (the room-clear freebie below is exempt).
    const pct = Math.max(REVIVE.floorPct, REVIVE.basePct - REVIVE.stepPct * n);
    repeats[target.partyIndex] = n + 1;
    target.hp = target.maxHp * pct;
    target.downed = false;
    target.downedTick = -1;
    events.emit(tick, 'revive', {
      target: target.id,
      targetIndex: target.partyIndex,
      reviver: ch.reviverId,
      pct: r2(pct),
      hp: r2(target.hp),
      repeat: n,
      free: false,
    });
  }

  // §13 room-clear boundary step 3: every Downed party member revives free at
  // 30% max_hp, exempt from diminishing; step 4 clears targeting state.
  // A room START only resets the per-room state — §13 is explicit that party
  // HP and Downed state PERSIST across rooms, so no free revive there.
  function onRoomBoundary(reason) {
    const tick = getTick();
    const freeRevive = reason !== 'room_start';
    for (const ch of [...channels.values()]) {
      channels.delete(ch.targetId);
      const rev = ch.reviverId != null ? registry.byId(ch.reviverId) : null;
      if (rev) {
        rev.reviveTargetId = null;
        if (rev.kind === 'ally') rev.aiState = 'engage';
      }
    }
    carriedBasic = false;
    // §13 step 2: every live combat entity ends at the boundary — no ally zone
    // tick and no ally bolt may land after the clear tick.
    for (const e of registry.all()) {
      if (e.kind === 'azone') {
        events.emit(tick, 'azone_expire', { id: e.id, skill: e.skill, cause: reason });
        registry.despawn(e.id);
      } else if (e.kind === 'skillbolt' && e.boltOwner === 'ally_kits') {
        events.emit(tick, 'skill_bolt_despawn', {
          id: e.id,
          skill: e.skill,
          heal: false,
          cause: reason,
          traveled: r2(e.traveled),
          x: r2(e.x),
          z: r2(e.z),
        });
        registry.despawn(e.id);
      }
    }
    for (const m of party()) {
      if (m.hp > 0 || !freeRevive) continue;
      m.hp = m.maxHp * REVIVE.basePct;
      m.downed = false;
      m.downedTick = -1;
      events.emit(tick, 'revive', {
        target: m.id,
        targetIndex: m.partyIndex,
        reviver: null,
        pct: REVIVE.basePct,
        hp: r2(m.hp),
        repeat: null,
        free: true,
      });
    }
    for (let i = 0; i < 4; i++) repeats[i] = 0; // diminishing resets each room
    clearMark(reason);
    rallyPoint = null;
    for (const a of allyList()) {
      a.aiState = 'engage';
      a.graceUntilTick = -1;
      a.targetId = null;
      // PARTY: nothing of a cast outlives the room (a pending dash delivery,
      // an AI dash in flight, an open parry window).
      if (a.pendingCast) a.pendingCast = null;
      if (a.skillDash) a.skillDash = null;
      if (a.guard && a.guard.parry) a.guard = null;
    }
    if (reason === 'room_start') roomStartTick = tick;
    defeated = false;
  }

  // --------------------------------------------------------- ally spin-up --
  // The world spawns the three ally bodies (skills block); this block gives
  // them their AI fields the first time it sees them.
  function ensureAllyFields(a) {
    // `cds` too (ARCH, docs/gauntlet/PLAN.md §6.5): a room boundary can set
    // aiState before the first continuous pass ever ran (a run started with
    // no camp seating, e.g. the Node headless sim), which used to leave the
    // kit cooldown array undefined and throw in resolveAllyAttack.
    if (a.aiState !== undefined && a.cds !== undefined) return;
    const S = ALLY_CLASSES[a.classId];
    a.aiState = 'engage';
    a.targetId = null;
    a.leashOut = false;
    a.graceUntilTick = -1;
    a.reviveTargetId = null;
    a.nextBasicTick = 0;
    a.cds = [0, 0, 0, 0];
    a.moveSpeed = S.moveSpeed;
    a.faceX = 0;
    a.faceZ = 1;
    a.moving = false;
    a.castLeftTicks = 0; // render hint: how long the attack clip should hold
    a.downed = a.hp <= 0;
    a.downedTick = a.hp <= 0 ? getTick() : -1;
  }

  // -------------------------------------------------------------- steering --
  function face(a, dx, dz) {
    const l = Math.hypot(dx, dz);
    if (l > 1e-6) {
      a.faceX = dx / l;
      a.faceZ = dz / l;
    }
  }

  function moveToward(a, x, z, step) {
    const dx = x - a.x;
    const dz = z - a.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-6) return false;
    // @gnt:M4a ALLY-SPEED begin — M4a scales `step` by
    // status.speedMul(a, tick) (haste/slow, BUILD_BRIEF §23.8). Separation
    // pushes below are NOT scaled.
    const k = a.hp > 0 && combat.status ? combat.status.speedMul(a, getTick()) : 1;
    const adv = Math.min(step * k, d);
    // @gnt:M4a ALLY-SPEED end
    walkStep(a, (dx / d) * adv, (dz / d) * adv, a.radius);
    face(a, dx, dz);
    return adv > 1e-6;
  }

  // §12: a marked target is leash-capped. The ally may honor the mark only
  // while it can be reached WITHOUT leaving the ring; otherwise it falls back
  // to nearest-to-anchor and resumes the mark when it is reachable again (the
  // mark itself is never cleared by this).
  function pickTarget(a, anchor) {
    const S = ALLY_CLASSES[a.classId];
    if (mark !== null) {
      const m = registry.byId(mark);
      if (m && m.hp > 0 && m.hittable) {
        const reachable = distTo(m, anchor.x, anchor.z) <= leashFor(a) + S.basicRange;
        if (reachable) return m;
      }
    }
    // Balance pass: a Grave Wisp's ward makes its enemy immune, so a seat
    // looks past a warded hostile to the nearest one it can hurt (all three
    // seats used to stand on a warded Crow while its wisp hovered unhit).
    // ELITE AFFIXES: a Warded elite's live ward reads the same way.
    const near = nearestHostileTo(anchor.x, anchor.z);
    if (!near || !(near.wardedBy || near.affixWard === 'on')) return near;
    let best = null;
    let bd = Infinity;
    for (const e of hostiles()) {
      if (e.wardedBy || e.affixWard === 'on') continue;
      const q = dist2(e.x, e.z, anchor.x, anchor.z);
      if (q < bd) {
        bd = q;
        best = e;
      }
    }
    return best ?? near;
  }

  // fix-M4a-r5 (GP.8): the shortest-reach equipped active that has sat ready
  // AI_IDLE_FALLBACK_TICKS or longer this room (null when none) — its seat
  // commits to bringing a hostile inside that reach.
  function overdueOf(a, tick) {
    const slots = loadoutOf(a);
    let best = null;
    for (let k = 0; k < slots.length; k++) {
      const def = slots[k] ? SKILLS[slots[k]] : null;
      if (!def || def.shape === 'aura' || def.archetype === 'guard') continue;
      if (tick < (a.cds[k] ?? 0)) continue;
      // not cast yet this room (its cooldown ended before the room began):
      // the shorter first-use wait — saved state only (cds, roomStartTick).
      const wait = (a.cds[k] ?? 0) <= roomStartTick ? AI_ENGAGE.firstUseTicks : AI_IDLE_FALLBACK_TICKS;
      if (tick - Math.max(a.cds[k] ?? 0, roomStartTick) < wait) continue;
      const r = def.shape === 'nova' ? def.area : def.range;
      if (!(r > 0)) continue;
      if (!best || r < best.range) best = { slot: k, range: r };
    }
    return best;
  }

  // Balance pass (AI_EVADE): a spot outside every in-flight glob ring that
  // would catch this seat, or null when none would. Straight out from the
  // ring's centre first; when the leash ring blocks that way, the nearest
  // turn of it (45° steps, left before right) that stays inside the leash
  // and clear of every ring.
  // ELITE AFFIXES: `affixOnly` (melee seats) counts only the Molten and
  // Frozen bursts, which hit hard enough that a melee seat steps out too.
  function evadeGoal(a, anchor, LR, affixOnly = false) {
    const rings = [];
    // R = the ring's reach on this body plus the margin: a seat inside R
    // keeps walking out (to R + exit), so it never hovers on the edge and
    // drifts back in towards its stand-off spot.
    for (const g of registry.all()) if (g.kind === 'eglob' && (!affixOnly || g.affix || g.shard)) rings.push({ x: g.tx, z: g.tz, R: (g.blastRadius ?? 0) + a.radius + AI_EVADE.margin, g });
    let hit = null;
    for (const r of rings) if (Math.hypot(a.x - r.x, a.z - r.z) < r.R && (!hit || r.g.landTick < hit.g.landTick)) hit = r;
    if (!hit) return null;
    const d = Math.hypot(a.x - hit.x, a.z - hit.z);
    // Dead centre: step away from the thrower's side (deterministic).
    let ux = d > 1e-4 ? (a.x - hit.x) / d : hit.x - hit.g.fromX;
    let uz = d > 1e-4 ? (a.z - hit.z) / d : hit.z - hit.g.fromZ;
    const ul = Math.hypot(ux, uz) || 1;
    ux /= ul;
    uz /= ul;
    const clear = (x, z) => Math.hypot(x - anchor.x, z - anchor.z) <= LR && rings.every((r) => Math.hypot(x - r.x, z - r.z) >= r.R);
    for (const deg of [0, 45, -45, 90, -90, 135, -135]) {
      const c = Math.cos((deg * Math.PI) / 180);
      const sn = Math.sin((deg * Math.PI) / 180);
      const vx = ux * c - uz * sn;
      const vz = ux * sn + uz * c;
      // Walk out along this heading until clear of the hit ring.
      const t = solveExit(a.x - hit.x, a.z - hit.z, vx, vz, hit.R + AI_EVADE.exit);
      const x = a.x + vx * t;
      const z = a.z + vz * t;
      if (clear(x, z)) return { x, z };
    }
    return { x: hit.x + ux * (hit.R + AI_EVADE.exit), z: hit.z + uz * (hit.R + AI_EVADE.exit) };
  }

  // ELITE AFFIXES / Act IV: globs every seat steps out of (Molten and Frozen
  // bursts, a Geode Brute's crystal shards).
  const affixGlobs = () => registry.all().some((g) => g.kind === 'eglob' && (g.affix || g.shard));

  // Act IV (docs/ACT_IV.md): a Vein Lancer's lance lane covering this seat —
  // every seat steps sideways out of it (the near side, inside the leash),
  // or null when no lance covers it. AUTOPILOT AND ENDLESS (v0.5.260): a
  // boss's charge or sweep lane too (the Thornmother's Briar Charge was most
  // of the carried party's Level I deaths).
  function laneGoal(a, anchor, LR) {
    let best = null;
    for (const e of registry.all()) {
      const t = e.telegraph;
      if (!t || e.faction !== 'hostile') continue;
      if (!(t.lance || (isBossBody(e) && t.kind === 'lane' && Number.isFinite(t.fromX) && Number.isFinite(t.length)))) continue;
      const px = a.x - t.fromX;
      const pz = a.z - t.fromZ;
      const along = px * t.dirX + pz * t.dirZ;
      if (along < -a.radius || along > t.length + a.radius) continue;
      const cross = px * t.dirZ - pz * t.dirX; // signed distance from the centreline
      const need = t.width / 2 + a.radius + AI_EVADE.margin;
      if (Math.abs(cross) >= need) continue;
      if (best && best.t.resolveTick <= t.resolveTick) continue;
      best = { t, cross, need };
    }
    if (!best) return null;
    const { t, cross, need } = best;
    const nx = t.dirZ;
    const nz = -t.dirX; // +cross side
    for (const side of [cross > 0 || (cross === 0 && a.id % 2 === 0) ? 1 : -1]) {
      for (const sgn of [side, -side]) {
        const off = sgn * need + sgn * AI_EVADE.exit - cross;
        const x = a.x + nx * off;
        const z = a.z + nz * off;
        if (Math.hypot(x - anchor.x, z - anchor.z) <= LR) return { x, z };
      }
    }
    return null;
  }

  const isBossBody = (e) => e.boss === true || e.kind === 'stag';

  // AUTOPILOT AND ENDLESS (v0.5.260): a boss's ring telegraph (the Stag's
  // Antler Quake, a boss slam) covering this seat: every seat steps straight
  // out of it (or up to 90 degrees off, inside the leash), or null.
  function bossRingGoal(a, anchor, LR) {
    let hit = null;
    for (const e of registry.all()) {
      const t = e.telegraph;
      if (!t || e.faction !== 'hostile' || !isBossBody(e)) continue;
      if ((t.kind ?? 'ring') !== 'ring' || !Number.isFinite(t.radius)) continue;
      const cx = t.x ?? e.x;
      const cz = t.z ?? e.z;
      const R = t.radius + a.radius + AI_EVADE.margin;
      if (Math.hypot(a.x - cx, a.z - cz) >= R) continue;
      if (hit && hit.t.resolveTick <= t.resolveTick) continue;
      hit = { t, cx, cz, R };
    }
    if (!hit) return null;
    const d = Math.hypot(a.x - hit.cx, a.z - hit.cz);
    let ux = d > 1e-4 ? (a.x - hit.cx) / d : anchor.x - hit.cx;
    let uz = d > 1e-4 ? (a.z - hit.cz) / d : anchor.z - hit.cz;
    const ul = Math.hypot(ux, uz) || 1;
    ux /= ul;
    uz /= ul;
    for (const deg of [0, 45, -45, 90, -90]) {
      const c = Math.cos((deg * Math.PI) / 180);
      const sn = Math.sin((deg * Math.PI) / 180);
      const vx = ux * c - uz * sn;
      const vz = ux * sn + uz * c;
      const t = solveExit(a.x - hit.cx, a.z - hit.cz, vx, vz, hit.R + AI_EVADE.exit);
      const x = a.x + vx * t;
      const z = a.z + vz * t;
      if (Math.hypot(x - anchor.x, z - anchor.z) <= LR) return { x, z };
    }
    return null;
  }

  // Distance t >= 0 along unit (vx, vz) from offset (px, pz) to the circle R.
  function solveExit(px, pz, vx, vz, R) {
    const b = px * vx + pz * vz;
    const c = px * px + pz * pz - R * R;
    return -b + Math.sqrt(Math.max(0, b * b - c));
  }

  function steerAlly(a, tick, anchor) {
    const S = ALLY_CLASSES[a.classId];
    const step = S.moveSpeed * TICK_DT;
    const d0 = distTo(a, anchor.x, anchor.z);
    a.leashD0 = d0; // pre-move distance; the post-separation clamp reads it
    a.moving = false;

    if (a.aiState === 'rally') {
      if (a.graceUntilTick >= 0) {
        if (tick >= a.graceUntilTick) {
          a.aiState = 'engage';
          a.graceUntilTick = -1;
          events.emit(tick, 'rally_end', { id: a.id, partyIndex: a.partyIndex });
        }
        return; // §8: hold with NO re-engagement through the grace window
      }
      if (!rallyPoint) {
        a.aiState = 'engage';
        return;
      }
      const d = distTo(a, rallyPoint.x, rallyPoint.z);
      if (d > RALLY.arriveDist) {
        a.moving = moveToward(a, rallyPoint.x, rallyPoint.z, step);
      } else {
        a.graceUntilTick = tick + RALLY.graceTicks;
        events.emit(tick, 'ally_regroup', {
          id: a.id,
          partyIndex: a.partyIndex,
          x: r2(a.x),
          z: r2(a.z),
          dist: r2(d),
          graceTicks: RALLY.graceTicks,
          graceUntilTick: a.graceUntilTick,
        });
      }
      return;
    }

    if (a.aiState === 'revive') {
      const body = a.reviveTargetId != null ? registry.byId(a.reviveTargetId) : null;
      if (!body || body.hp > 0) {
        a.aiState = 'engage';
        a.reviveTargetId = null;
        return;
      }
      const ch = channels.get(body.id);
      const channelling = ch && !ch.draining && ch.reviverId === a.id;
      if (channelling) {
        // §10 requires the reviver to be STATIONARY. Once the channel is
        // running the AI stops steering entirely (and the separation pass
        // below leaves it alone), so nothing can nudge it into a self-inflicted
        // "nonzero move" break.
        face(a, body.x - a.x, body.z - a.z);
        return;
      }
      const d = distTo(a, body.x, body.z);
      if (d > REVIVE.approach) {
        a.moving = moveToward(a, body.x, body.z, step);
      } else {
        face(a, body.x - a.x, body.z - a.z);
      }
      return;
    }

    // --- engage / return (§12 leash + shared targeting)
    let target = pickTarget(a, anchor);
    const LR = leashFor(a);
    // fix-M4a-r5 (GP.8): an overdue active makes the seat take the nearest
    // hostile it can reach inside its ring and close to that skill's reach.
    let commitRange = null;
    if (engageOn()) {
      const od = overdueOf(a, tick);
      if (od) {
        let best = null;
        let bd = Infinity;
        for (const e of hostiles()) {
          if (distTo(e, anchor.x, anchor.z) > LR + od.range) continue;
          const q = dist2(e.x, e.z, a.x, a.z);
          if (q < bd) {
            bd = q;
            best = e;
          }
        }
        if (best) {
          target = best;
          commitRange = od.range;
        }
      }
    }
    a.targetId = target ? target.id : null;
    const inReach = target ? distTo(a, target.x, target.z) <= S.basicRange : false;
    if (!a.leashOut && d0 > LR + LEASH_DEADZONE && !inReach) a.leashOut = true;
    if (a.leashOut && d0 <= LEASH.radius * LEASH.reengageFactor) a.leashOut = false;

    if (a.leashOut) {
      a.aiState = 'return';
      a.moving = moveToward(a, anchor.x, anchor.z, step);
      return;
    }

    a.aiState = 'engage';
    if (target) {
      const d = distTo(a, target.x, target.z);
      // §12 "steer to own attack/skill range" — but the standing spot itself is
      // LEASH-CAPPED ("never pursued past the boundary"). Pick the goal on the
      // line to the target at own stand-off range, then project that goal into
      // the leash disc. Two consequences, both required by §12:
      //   - closing in never takes the ally past the ring, and
      //   - an ally the ANCHOR's own motion left outside walks back to the ring
      //     every tick instead of parking out there, even while it still has a
      //     target in reach (a stand-off ally used to just turn to face, so the
      //     excess distance ratcheted in permanently and an archer could hold
      //     station at 2x the leash).
      let gx = a.x;
      let gz = a.z;
      const stand = commitRange !== null ? Math.min(S.standRange, commitRange * AI_ENGAGE.commitStandFrac) : S.standRange;
      if (d > stand) {
        const t = (d - stand) / d;
        gx = a.x + (target.x - a.x) * t;
        gz = a.z + (target.z - a.z) * t;
      }
      // Balance pass (AI_KITE): a ranged seat steps back from a hostile that
      // closed inside minU (the nearest one), still aiming at its target.
      if (engageOn() && !isMelee(a)) {
        const near = nearestHostileTo(a.x, a.z);
        const nd = near ? distTo(near, a.x, a.z) : Infinity;
        if (nd < AI_KITE.minU) {
          const ux = nd > 1e-4 ? (a.x - near.x) / nd : -(target.x - a.x) / (d || 1);
          const uz = nd > 1e-4 ? (a.z - near.z) / nd : -(target.z - a.z) / (d || 1);
          gx = near.x + ux * AI_KITE.toU;
          gz = near.z + uz * AI_KITE.toU;
        }
      }
      // Balance pass (AI_EVADE): a glob ring a ranged seat stands in wins over
      // the stand-off spot; it walks out, still aiming. Melee seats hold their
      // ground (they stay on the enemies; Toad rooms otherwise dragged on).
      const ev = engageOn()
        ? laneGoal(a, anchor, LR) ?? bossRingGoal(a, anchor, LR) ?? (!isMelee(a) ? evadeGoal(a, anchor, LR) : affixGlobs() ? evadeGoal(a, anchor, LR, true) : null)
        : null;
      if (ev) {
        gx = ev.x;
        gz = ev.z;
      }
      const gdx = gx - anchor.x;
      const gdz = gz - anchor.z;
      const gd = Math.hypot(gdx, gdz);
      if (gd > LR) {
        const s = LR / gd;
        gx = anchor.x + gdx * s;
        gz = anchor.z + gdz * s;
      }
      const md = Math.hypot(gx - a.x, gz - a.z);
      if (md > 1e-4) a.moving = moveToward(a, gx, gz, Math.min(step, md));
      // Aim always tracks the target, whichever way the feet are going.
      face(a, target.x - a.x, target.z - a.z);
    } else if (d0 > LEASH.radius * LEASH.reengageFactor) {
      // Nothing to fight: drift back inside the re-engage ring.
      a.moving = moveToward(a, anchor.x, anchor.z, step);
    }
  }

  // Hard leash cap (§12: "Marked targets are leash-capped — never pursued past
  // the boundary"). Applied AFTER the separation push, which is the other
  // thing that can displace a body outward. An ally never ENDS a tick further
  // from the anchor than the ring, or than it already was — so any distance
  // over 3.4 u can only come from the anchor itself having moved, and the
  // state machine above is already walking the ally home.
  function clampLeash(a, anchor) {
    const d = distTo(a, anchor.x, anchor.z);
    const cap = Math.max(leashFor(a), a.leashD0 ?? LEASH.radius);
    if (d > cap && d > 1e-6) {
      const s = cap / d;
      a.x = anchor.x + (a.x - anchor.x) * s;
      a.z = anchor.z + (a.z - anchor.z) * s;
    }
  }

  // §12 ally separation: 0.26 u soft push so the party never collapses into a
  // single silhouette. Rallying/reviving allies push too (they must not stack
  // on the rally point or the body).
  function isChannelling(a) {
    const ch = a.reviveTargetId != null ? channels.get(a.reviveTargetId) : null;
    return !!(ch && !ch.draining && ch.reviverId === a.id);
  }

  function separate(list) {
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (isChannelling(a)) continue; // a stationary reviver is never pushed (§10)
      if (isHuman(a)) continue; // a human seat is placed by its player only (M5b)
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        const b = list[j];
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const d = Math.hypot(dx, dz);
        const want = a.radius + b.radius + SEPARATION * 0.5;
        if (d < want && d > 1e-6) {
          const push = Math.min(SEP_STEP_CAP, (want - d) * 0.5);
          walkStep(a, (dx / d) * push, (dz / d) * push, a.radius);
        }
      }
    }
  }

  // ------------------------------------------------------- AI revive (§12) --
  // Serial rescue: player's body first, then longest-Downed. Reviver = the
  // NEAREST eligible ally (living, HP >= 30% of its own max, not rallying).
  // Eagerness is unconditional — it breaks off combat the moment it is picked.
  function assignRescuer(tick) {
    const bodies = party().filter((m) => m.hp <= 0);
    if (bodies.length === 0) return;
    const allies = allyList();
    bodies.sort((a, b) => {
      if ((a.partyIndex === 0) !== (b.partyIndex === 0)) return a.partyIndex === 0 ? -1 : 1;
      if (a.downedTick !== b.downedTick) return a.downedTick - b.downedTick; // longest-Downed
      return a.partyIndex - b.partyIndex;
    });
    // §12 is BOTH "serial rescue" and "priority = player's body first". A plain
    // serial gate satisfies the first and hides the second: the round-2 critic
    // downed the player 38% into an ally's rescue of the tank and nothing moved
    // for 9.6 s, so "player first" was invisible in the exact case it exists
    // for. The gate is therefore a PREEMPTION: still exactly one rescue in
    // flight, but when the player goes down mid-rescue of a lower-priority body
    // the in-flight channel is broken (reset, per §10 — it never resumes) and
    // the rescue is re-assigned to the top-priority body on the same tick.
    const busy = allies.find((a) => a.aiState === 'revive');
    if (busy) {
      const cur = busy.reviveTargetId != null ? registry.byId(busy.reviveTargetId) : null;
      const top = bodies[0];
      // Only the player's body preempts, and never a rescue that is already on it.
      if (!cur || !top || top.partyIndex !== 0 || cur.id === top.id) return;
      const ch = channels.get(cur.id);
      if (ch && !ch.draining) breakChannel(ch, 'priority_player', tick);
      busy.aiState = 'engage';
      busy.reviveTargetId = null;
      events.emit(tick, 'rescue_preempt', {
        id: busy.id,
        partyIndex: busy.partyIndex,
        dropped: cur.id,
        droppedIndex: cur.partyIndex,
        forTarget: top.id,
        forIndex: top.partyIndex,
      });
    }
    for (const body of bodies) {
      const ch = channels.get(body.id);
      if (ch && !ch.draining) continue; // already claimed (player or ally)
      let best = null;
      let bestD2 = Infinity;
      for (const a of allies) {
        if (a.hp <= 0 || a.aiState === 'rally') continue;
        if (isHuman(a)) continue; // M5b: a human seat rescues by its own hold-E
        if (a.hp < a.maxHp * REVIVE.aiMinHpFrac) continue;
        const d2 = dist2(a.x, a.z, body.x, body.z);
        if (d2 < bestD2) {
          bestD2 = d2;
          best = a;
        }
      }
      if (!best) continue;
      best.aiState = 'revive';
      best.reviveTargetId = body.id;
      best.targetId = null;
      denialEdge.delete(best.id); // fresh assignment re-arms exactly one denial
      events.emit(tick, 'ally_rescue', {
        id: best.id,
        partyIndex: best.partyIndex,
        target: body.id,
        targetIndex: body.partyIndex,
        dist: r2(Math.sqrt(bestD2)),
      });
      return;
    }
  }

  // ------------------------------------------------------ camp seat hold --
  // Camp block (§18 "the four party critters idle around the fire"; Round D
  // camp critic A2/F3). While a seat map is installed the AI holds every ally
  // ON its hearth seat: no targeting, no leash follow, no separation, no
  // revive/rally — a critter that has sat down stays sat until the run
  // starts. The only motion allowed is walking BACK to the seat if something
  // displaced the body (walkStep, so the camp's prop colliders apply).
  // Installed / cleared by scenes/camp.js through cmd('campSeats', map|null).
  const SEAT_EPS = 0.01;
  let campSeats = null; // { [partyIndex]: { x, z } } | null
  function holdSeats() {
    for (const a of allyList()) {
      ensureAllyFields(a);
      if (isHuman(a)) {
        // A human seat walks its own camp (M5b): no seat hold.
        humanContinuous(a, getTick());
        continue;
      }
      a.moving = false;
      a.targetId = null;
      a.leashOut = false;
      a.aiState = 'engage';
      const seat = campSeats[a.partyIndex];
      if (!seat) continue;
      if (distTo(a, seat.x, seat.z) > SEAT_EPS)
        a.moving = moveToward(a, seat.x, seat.z, ALLY_CLASSES[a.classId].moveSpeed * TICK_DT);
    }
  }

  // ------------------------------------------ human seats (network play) --
  // M5b (docs/gauntlet/PLAN.md §3.7): in a network session the host's
  // world.step(tick, snapshot, seatInputs) hands this system one input per
  // HUMAN ally seat (sim/netseats.js). A human seat is steered and fired by
  // that input instead of the §12 AI: 8-dir movement at the class speed, the
  // Healer's dodge rules (swept dash, i-frames, 1.2 s cooldown), the four kit
  // skills and the basic on the seat's AIM, the §10 hold-E revive channel and
  // E interact presses (resolved with the Healer's, ascending party index).
  // Every event it produces carries { seat, inputSeq } so the guest can
  // reconcile its predicted presentation. Instant shapes (melee arc, nova)
  // and projectile spawn aim resolve against hostile positions rewound to the
  // input's viewTick (host lag compensation, net/lagcomp.js via
  // seatInputs.rewind); damage applies to the live bodies.
  // Single-player never calls setSeatInputs: every seat stays AI and every
  // code path below is skipped (golden traces unchanged, gate G5b.8).
  const DEFAULT_CONTROLLERS = Object.freeze(['human', 'ai', 'ai', 'ai']);
  const controllers = [...DEFAULT_CONTROLLERS];
  let seatFrames = [null, null, null, null];
  let seatCtx = null;
  const prevHumanBasic = [false, false, false, false];
  // A human seat's own timers run on its INPUT-FRAME clock (the seq of the
  // frame being resolved), not on host ticks: a guest predicts them frame
  // for frame, and a host that drains two buffered frames in one tick or
  // repeats a starved seat's held state never shifts them. The tick-based
  // entity fields (cds / nextBasicTick / dodgeReadyTick) are kept in step for
  // the AI hand-back and the HUD. Replicated (saved) with the seat block.
  const humanTimers = [null, null, null, null]; // { cds: [seq x4], basic: seq, dodge: seq }
  const humanInteractList = [];
  // Host-side lag-compensation counters (debug / net stats only, never sim state).
  const lagStats = { selections: 0, rewound: 0, rewindTicks: 0, hits: 0, compHits: 0, aimAssists: 0, enabled: true };
  const isHuman = (a) => !!a && a.partyIndex > 0 && seatFrames[a.partyIndex] !== null;
  const allyByIndex = (i) => registry.all().find((e) => e.kind === 'ally' && e.partyIndex === i) || null;

  function enterHuman(a, tick, seq = 0) {
    ensureAllyFields(a);
    // Carry the AI's running cooldowns over onto the seat's frame clock.
    humanTimers[a.partyIndex] = {
      cds: (a.cds || [0, 0, 0, 0]).map((c) => seq + Math.max(0, c - tick)),
      basic: seq + Math.max(0, (a.nextBasicTick || 0) - tick),
      dodge: seq + Math.max(0, (a.dodgeReadyTick || 0) - tick),
      // The input frame of the seat's last basic that FIRED (-1: none yet).
      // `basic` also moves on a dash suppression / §5 re-arm, so a guest's
      // action shadow reads THIS to know whether its predicted swing on a
      // consumed frame happened (net/predict.js, NET-F1).
      fire: -1,
    };
    if (a.reviveTargetId != null) {
      const ch = channels.get(a.reviveTargetId);
      if (ch && !ch.draining && ch.reviverId === a.id) breakChannel(ch, 'control', tick);
      a.reviveTargetId = null;
    }
    a.controller = 'human';
    a.aiState = 'engage';
    a.targetId = null;
    a.leashOut = false;
    a.graceUntilTick = -1;
    if (!(a.dashTicksLeft > 0)) a.dashTicksLeft = 0;
    a.dashVel = a.dashVel && Number.isFinite(a.dashVel.x) ? a.dashVel : { x: 0, z: 0 };
    if (!Number.isFinite(a.dodgeReadyTick)) a.dodgeReadyTick = 0;
    if (!a.aim) a.aim = { x: a.x + (a.faceX ?? 0), z: a.z + (a.faceZ ?? 1) };
    a.dashing = a.dashTicksLeft > 0;
  }
  function leaveHuman(a, tick) {
    if (a.reviveTargetId != null) {
      const ch = channels.get(a.reviveTargetId);
      if (ch && !ch.draining && ch.reviverId === a.id) breakChannel(ch, 'control', tick);
      a.reviveTargetId = null;
    }
    delete a.controller;
    delete a.dashVel;
    delete a.dashing;
    delete a.aim;
    delete a.dashTicksLeft;
    delete a.dodgeReadyTick;
    a.aiState = 'engage';
    a.targetId = null;
    a.moving = false;
    humanTimers[a.partyIndex] = null;
  }

  // setSeatInputs(si, tick) — once per host tick BEFORE the phases (world.js
  // M5b SEAT-INPUTS). `si` null ends network control (every seat AI again).
  // A controller change emits `seat_control { partyIndex, controller,
  // reason }` on that tick (PLAN §2.3).
  function setSeatInputs(si, tick) {
    seatCtx = si || null;
    const next = [null, null, null, null];
    if (si && si.seats) {
      for (const k of Object.keys(si.seats)) {
        const i = Number(k);
        if (i >= 1 && i <= 3 && si.seats[k]) next[i] = si.seats[k];
      }
    }
    const target = [...DEFAULT_CONTROLLERS];
    if (si) {
      target[0] = si.player === 'ai' ? 'ai' : 'human';
      for (let i = 1; i <= 3; i++) target[i] = next[i] ? 'human' : 'ai';
    }
    for (let i = 0; i < 4; i++) {
      if (controllers[i] === target[i]) continue;
      controllers[i] = target[i];
      const reason = (si && si.reasons && si.reasons[i]) || (target[i] === 'human' ? 'join' : 'drop');
      const body = i === 0 ? player : allyByIndex(i);
      if (body && i > 0) {
        if (target[i] === 'human') enterHuman(body, tick, next[i] ? next[i].seq : 0);
        else leaveHuman(body, tick);
      }
      prevHumanBasic[i] = false;
      events.emit(tick, 'seat_control', { partyIndex: i, controller: target[i], reason, id: body ? body.id : null });
    }
    seatFrames = next;
    humanInteractList.length = 0;
  }

  // Lag compensation (host): run `select` with every hostile the rewind map
  // names moved to its position at the input's viewTick, then put them back.
  // Selection only — damage lands on the live bodies afterwards.
  function rewindFor(f) {
    if (!lagStats.enabled || !seatCtx || typeof seatCtx.rewind !== 'function') return null;
    const rw = seatCtx.rewind(f.viewTick);
    return rw && rw.map && rw.map.size > 0 ? rw : null;
  }
  function rewound(f, select) {
    lagStats.selections += 1;
    const rw = rewindFor(f);
    if (!rw) {
      const out = select();
      lagStats.hits += out.length;
      return out;
    }
    lagStats.rewound += 1;
    lagStats.rewindTicks += rw.ticks || 0;
    const saved = [];
    for (const [id, p] of rw.map) {
      const e = registry.byId(id);
      if (!e || e.faction !== 'hostile') continue;
      saved.push([e, e.x, e.z]);
      e.x = p.x;
      e.z = p.z;
    }
    let out;
    try {
      out = select();
    } finally {
      for (const [e, x, z] of saved) {
        e.x = x;
        e.z = z;
      }
    }
    // What the live positions alone would have hit (the rewind's share).
    const liveIds = new Set(select().map((t) => t.id));
    lagStats.hits += out.length;
    for (const t of out) if (!liveIds.has(t.id)) lagStats.compHits += 1;
    return out;
  }
  // Projectile spawn aim: a shot aimed within 0.75 u of where the guest SAW a
  // hostile (rewound position) is re-aimed at that hostile's live body, with
  // the same offset — what the guest aimed at is what the bolt flies to.
  function compensatedAim(f, a, dir) {
    const rw = rewindFor(f);
    if (!rw || !f.aim) return dir;
    let best = null;
    let bestD2 = 0.75 * 0.75;
    for (const [id, p] of rw.map) {
      const e = registry.byId(id);
      if (!e || e.faction !== 'hostile' || !e.hittable || !(e.hp > 0)) continue;
      const d2 = dist2(p.x, p.z, f.aim.x, f.aim.z);
      if (d2 < bestD2) {
        bestD2 = d2;
        best = [e, p];
      }
    }
    if (!best) return dir;
    const [e, p] = best;
    const dx = e.x + (f.aim.x - p.x) - a.x;
    const dz = e.z + (f.aim.z - p.z) - a.z;
    const l = Math.hypot(dx, dz);
    if (l < 1e-4) return dir;
    lagStats.aimAssists += 1;
    return { x: dx / l, z: dz / l };
  }

  function seatDeny(a, kind, reason, tag, tick) {
    events.emit(tick, 'seat_denied', { id: a.id, partyIndex: a.partyIndex, kind, reason, ...tag });
  }

  // Continuous phase for one human body: one movement step per consumed
  // input frame (sim/remote.js), dash i-frames, facing = aim.
  function humanContinuous(a, tick) {
    const f = seatFrames[a.partyIndex];
    const S = ALLY_CLASSES[a.classId];
    if (f.aim) a.aim = { x: f.aim.x, z: f.aim.z };
    let moved = false;
    let ended = false;
    for (const mv of f.moves) {
      // A dash advances one step per consumed INPUT FRAME, never on a starved
      // tick (net/driver.js, bounded by sim/netseats.js DASH_HOLD_TICKS): the
      // guest predicts it frame for frame, so a stalled guest's dash resumes
      // where its frames left it instead of finishing on host ticks it never
      // saw (NET3-F2: 1.1-1.3 u snaps after a guest-page stall mid-dash).
      if (f.starved && a.dashTicksLeft > 0) continue;
      const spd = a.hp > 0 ? S.moveSpeed * (combat.status ? combat.status.speedMul(a, tick) : 1) : DOWNED_CRAWL_SPEED;
      const r = stepHumanMove(a, mv, spd);
      if (r.moved) moved = true;
      if (r.ended) ended = true;
    }
    a.dashing = a.dashTicksLeft > 0;
    // PARTY: a skill dash without i-frames (Shoulder Charge) rides the same
    // machinery; the dodge and every i-frame dash stay i-framed.
    if (a.dashing && a.dashIframes !== false) a.iframeUntilTick = tick + 1;
    if (!a.dashing && a.dashIframes !== undefined) delete a.dashIframes;
    a.moving = moved;
    if (a.hp > 0) {
      const d = aimDir(a, a.aim, { x: a.faceX ?? 0, z: a.faceZ ?? 1 });
      face(a, d.x, d.z);
    }
    // §5: after the dash, a still-held basic restarts its FULL interval.
    if (ended && f.basic) {
      a.nextBasicTick = tick + S.attackIntervalTicks;
      const T = humanTimers[a.partyIndex];
      if (T) T.basic = f.seq + S.attackIntervalTicks;
    }
  }

  function humanChannelling(a) {
    const ch = a.reviveTargetId != null ? channels.get(a.reviveTargetId) : null;
    return !!(ch && !ch.draining && ch.reviverId === a.id);
  }

  // Discrete resolution for one human seat, in its party_index slot of the
  // §4 order: dodge -> kit skills ascending slot -> basic -> revive channel
  // arbitration (a same-tick dodge beats a revive start, as for the Healer);
  // an E press joins the interactables pass after the ally pass.
  function resolveHuman(a, tick) {
    const f = seatFrames[a.partyIndex];
    const i = a.partyIndex;
    const tag = { seat: i, inputSeq: f.seq };
    // A press is tagged with — and its timer runs from — the input frame it
    // rode (sim/netseats.js pressSeq; a late carried press keeps its seq).
    const pseq = (kind) => (f.pressSeq && Number.isInteger(f.pressSeq[kind]) ? f.pressSeq[kind] : f.seq);
    const tagOf = (kind) => ({ seat: i, inputSeq: pseq(kind) });
    const kinds = new Set(f.presses.map((p) => p.kind));
    const S = ALLY_CLASSES[a.classId];
    const loadout = loadoutOf(a);
    const moving = f.moves.some((m) => m.x !== 0 || m.z !== 0);
    const skillPressed = [...kinds].some((k) => k.startsWith('skill_'));
    const freshBasic = f.basic && !prevHumanBasic[i];
    const T = humanTimers[i] || (humanTimers[i] = { cds: [0, 0, 0, 0], basic: 0, dodge: 0, fire: -1 });
    const seq = f.seq;
    if (a.hp > 0) {
      const stunned = !!(combat.status && combat.status.isStunned(a, tick));
      if (kinds.has('dodge')) {
        const dtag = tagOf('dodge');
        if (stunned) seatDeny(a, 'dodge', DENIAL.prioritySuppressed, dtag, tick);
        else if (dtag.inputSeq < T.dodge || a.dashTicksLeft > 0) seatDeny(a, 'dodge', DENIAL.onCooldown, dtag, tick);
        else {
          const mv = f.moves[f.moves.length - 1];
          a.dashVel = dodgeVelocity(a, mv, a.aim, { x: a.faceX ?? 0, z: a.faceZ ?? 1 });
          a.dashTicksLeft = HUMAN_DODGE.durationTicks;
          // RELICS (Ash Feather): the relic run's dodge cooldown factor.
          const M = combat.getMods ? combat.getMods() : null;
          const dcd = M && M.active() ? Math.round(HUMAN_DODGE.cooldownTicks * M.dodgeCdMul()) : HUMAN_DODGE.cooldownTicks;
          a.dodgeReadyTick = tick + dcd;
          T.dodge = dtag.inputSeq + dcd;
          a.dashing = true;
          a.iframeUntilTick = tick + 1;
          const l = Math.hypot(a.dashVel.x, a.dashVel.z) || 1;
          events.emit(tick, 'ally_dodge', { id: a.id, partyIndex: i, classId: a.classId, dx: r2(a.dashVel.x / l), dz: r2(a.dashVel.z / l), ...dtag });
          if (a.classId === 'tidecaller') divePuddle(a, tick);
        }
      }
      // PARTY: a displaced press delivers when its dash ends.
      if (a.pendingCast && !(a.dashTicksLeft > 0)) caster.runPending(a, tick, { f });
      for (let slot = 0; slot < loadout.length; slot++) {
        const kind = `skill_${slot + 1}`;
        if (!kinds.has(kind)) continue;
        const ktag = tagOf(kind);
        const id = loadout[slot];
        const base = id ? SKILLS[id] : null;
        if (!base || base.shape === 'aura') {
          // An empty slot or a passive: nothing activatable (closed vocabulary).
          seatDeny(a, kind, DENIAL.emptySlot, ktag, tick);
          continue;
        }
        if (a.dashTicksLeft > 0 || stunned || a.pendingCast) {
          seatDeny(a, kind, DENIAL.prioritySuppressed, ktag, tick);
          continue;
        }
        if (ktag.inputSeq < T.cds[slot]) {
          seatDeny(a, kind, DENIAL.onCooldown, ktag, tick);
          continue;
        }
        fireHumanSkill(a, base, slot, f, tick, ktag);
        const cdT = cdTicksOf(resolvedOf(a, base));
        a.cds[slot] = tick + cdT;
        T.cds[slot] = ktag.inputSeq + cdT;
      }
      for (const k of kinds) {
        if (!k.startsWith('skill_')) continue;
        if (Number(k.slice(6)) > loadout.length) seatDeny(a, k, DENIAL.emptySlot, tagOf(k), tick);
      }
      if (f.basic && seq >= T.basic && !stunned && (!humanChannelling(a) || freshBasic)) {
        if (a.dashTicksLeft > 0) {
          seatDeny(a, 'basic_attack', DENIAL.prioritySuppressed, tag, tick);
        } else {
          fireHumanBasic(a, S, f, tick, tag);
          T.fire = seq;
        }
        a.nextBasicTick = tick + S.attackIntervalTicks;
        T.basic = seq + S.attackIntervalTicks;
      }
    }
    // §10 revive channel — the Healer's rules for a human reviver.
    if (!f.revive) denialEdge.delete(a.id);
    const dodging = a.dashTicksLeft > 0;
    const ch = a.reviveTargetId != null ? channels.get(a.reviveTargetId) : null;
    if (ch && !ch.draining && ch.reviverId === a.id) {
      let reason = null;
      if (a.hp <= 0) reason = 'reviver_downed';
      else if (moving) reason = 'move';
      else if (dodging) reason = 'dodge';
      else if (skillPressed) reason = 'skill';
      else if (freshBasic) reason = 'attack';
      else if (!f.revive) reason = 'released';
      if (reason) breakChannel(ch, reason, tick);
    }
    if (a.reviveTargetId == null && f.revive && a.hp > 0 && !moving && !dodging && !skillPressed) {
      const body = nearestDownedNear(a, REVIVE.range);
      if (body) startChannel(a, body, tick);
    }
    if (kinds.has('interact')) humanInteractList.push({ actor: a, press: { kind: 'interact' } });
    prevHumanBasic[i] = f.basic;
  }

  function fireHumanBasic(a, S, f, tick, tag) {
    const d = aimDir(a, f.aim, { x: a.faceX ?? 0, z: a.faceZ ?? 1 });
    face(a, d.x, d.z);
    a.castLeftTicks = Math.max(a.castLeftTicks, 12);
    const ev = { id: a.id, partyIndex: a.partyIndex, classId: a.classId, shape: S.basicShape, x: r2(a.x), z: r2(a.z), dx: r2(d.x), dz: r2(d.z), ...tag };
    if (S.basicShape === 'melee_arc') {
      const targets = rewound(f, () => enemiesInArc(a, d.x, d.z, S.basicRange, S.basicHalfAngle, Infinity));
      ev.reach = S.basicRange;
      ev.halfAngle = S.basicHalfAngle;
      ev.targets = targets.map((t) => t.id);
      events.emit(tick, 'ally_basic', ev);
      for (const t of targets) {
        if (!registry.byId(t.id) || !(t.hp > 0)) continue;
        const tl = Math.hypot(t.x - a.x, t.z - a.z) || 1;
        combat.applyDamage(t, S.basicPower, {
          delivery: 'basic',
          shape: 'melee_arc',
          dirX: (t.x - a.x) / tl,
          dirZ: (t.z - a.z) / tl,
          attacker: a.id,
          source: `${a.classId}_basic`,
        });
      }
      return;
    }
    const dir = compensatedAim(f, a, d);
    ev.dx = r2(dir.x);
    ev.dz = r2(dir.z);
    events.emit(tick, 'ally_basic', ev);
    bolts.spawn(tick, {
      x: a.x,
      z: a.z,
      dirX: dir.x,
      dirZ: dir.z,
      speed: S.basicSpeed,
      range: S.basicRange,
      radius: BOLT_RADIUS,
      power: S.basicPower,
      skill: `${a.classId}_basic`,
      heal: false,
      sourceId: a.id,
    });
  }

  // PARTY: a human seat's press goes through the ONE cast pipeline (aim-based
  // displacement, lag-compensated selection) — sim/allycast.js.
  function fireHumanSkill(a, def, slot, f, tick, tag) {
    const d = aimDir(a, f.aim, { x: a.faceX ?? 0, z: a.faceZ ?? 1 });
    face(a, d.x, d.z);
    caster.cast(a, def, slot, tick, { mode: 'human', f, tag, d });
  }

  // (v0.5.150 human-seat delivery, superseded by the pipeline above; kept
  // for reference by the determinism proof — never called.)
  function fireHumanSkillV150(a, def, slot, f, tick, tag) {
    const d = aimDir(a, f.aim, { x: a.faceX ?? 0, z: a.faceZ ?? 1 });
    face(a, d.x, d.z);
    a.castLeftTicks = Math.max(a.castLeftTicks, 24);
    const cast = {
      id: a.id,
      partyIndex: a.partyIndex,
      classId: a.classId,
      skill: def.id,
      slot,
      shape: def.shape,
      power: def.power,
      cd: def.cd,
      target: null,
      x: r2(a.x),
      z: r2(a.z),
      dx: r2(d.x),
      dz: r2(d.z),
      ...tag,
    };
    const hitAll = (targets) => {
      for (const t of targets) {
        if (!registry.byId(t.id) || !(t.hp > 0)) continue;
        const tl = Math.hypot(t.x - a.x, t.z - a.z) || 1;
        combat.applyDamage(t, def.power, {
          delivery: 'skill',
          shape: def.shape,
          dirX: (t.x - a.x) / tl,
          dirZ: (t.z - a.z) / tl,
          attacker: a.id,
          source: def.id,
        });
      }
    };
    if (def.shape === 'melee_arc') {
      const targets = rewound(f, () => enemiesInArc(a, d.x, d.z, def.range, def.area, def.count));
      cast.reach = def.range;
      cast.halfAngle = def.area;
      cast.targets = targets.map((t) => t.id);
      events.emit(tick, 'ally_cast', cast);
      hitAll(targets);
      return;
    }
    if (def.shape === 'nova') {
      const targets = rewound(f, () => enemiesInNova(a, def.area, def.count));
      cast.radius = def.area;
      cast.targets = targets.map((t) => t.id);
      events.emit(tick, 'ally_cast', cast);
      hitAll(targets);
      return;
    }
    if (def.shape === 'projectile') {
      const dir = compensatedAim(f, a, d);
      cast.count = countFinal(def.count);
      cast.dx = r2(dir.x);
      cast.dz = r2(dir.z);
      events.emit(tick, 'ally_cast', cast);
      for (const fd of fanDirections(dir.x, dir.z, def.count)) {
        bolts.spawn(tick, {
          x: a.x,
          z: a.z,
          dirX: fd.x,
          dirZ: fd.z,
          speed: def.speed,
          range: def.range,
          radius: BOLT_RADIUS,
          power: def.power,
          skill: def.id,
          heal: false,
          sourceId: a.id,
        });
      }
      return;
    }
    // ground_aoe at the aim point, clamped to the skill's placement range.
    const pos = clampPlacement(a, f.aim ? { x: f.aim.x, z: f.aim.z } : { x: a.x + d.x, z: a.z + d.z }, def.range);
    const zone = registry.spawn({
      kind: 'azone',
      skill: def.id,
      classId: a.classId,
      x: pos.x,
      z: pos.z,
      px: pos.x,
      pz: pos.z,
      radius: def.area,
      power: def.power,
      sourceId: a.id,
      ticksDone: 0,
      totalTicks: Math.round(secTicks(def.durationSec) / ZONE_CADENCE_TICKS),
      nextTickTick: tick + ZONE_CADENCE_TICKS,
    });
    cast.zone = zone.id;
    cast.zx = r2(pos.x);
    cast.zz = r2(pos.z);
    cast.radius = def.area;
    events.emit(tick, 'ally_cast', cast);
    events.emit(tick, 'azone_spawn', {
      id: zone.id,
      skill: def.id,
      classId: a.classId,
      x: r2(pos.x),
      z: r2(pos.z),
      radius: def.area,
      totalTicks: zone.totalTicks,
      ...tag,
    });
  }

  // ---------------------------------------------------- continuous phase --
  // Called from the world's continuous phase (§4 phase 1: move/aim/held
  // states, dashes, projectiles, CHANNELS, zone clocks).
  function continuous(snapshot) {
    if (campSeats) {
      holdSeats();
      // A human seat can fire in camp (class select): its bolts and shards
      // must fly and expire here exactly as in a room, or they hang in the air.
      bolts.step(getTick());
      caster.scatterShards.step(getTick());
      return;
    }
    const tick = getTick();
    refreshDowned(tick);

    if (mark !== null) {
      const m = registry.byId(mark);
      if (!m || !(m.hp > 0) || !m.hittable) clearMark('mark_gone');
    }

    const anchor = leashAnchor();
    const allies = allyList();
    for (const a of allies) ensureAllyFields(a);

    assignRescuer(tick);

    for (const a of allies) {
      if (isHuman(a)) {
        humanContinuous(a, tick); // M5b: the seat's input steers it (Downed: crawl)
        continue;
      }
      if (a.hp <= 0) {
        a.moving = false;
        if (a.skillDash) a.skillDash = null;
        continue; // §10: Downed characters cannot act
      }
      // PARTY: a skill dash / vault / hop suspends §12 steering while it runs.
      if (a.skillDash) {
        a.leashD0 = distTo(a, anchor.x, anchor.z);
        if (caster.stepDash(a, tick)) continue;
      }
      steerAlly(a, tick, anchor);
    }
    separate(allies.filter((a) => a.hp > 0));
    for (const a of allies) {
      // Rally and revive are explicit override verbs (§8/§12: "every ally
      // breaks engagement", "eagerness unconditional") — the leash governs
      // combat pursuit, so those two states are exempt. A human seat goes
      // where its player walks it (M5b).
      if (a.hp <= 0 || a.aiState === 'rally' || a.aiState === 'revive' || isHuman(a)) continue;
      clampLeash(a, anchor);
    }

    // --- channels: break checks that do not need the player's snapshot, then
    // advance / drain. Progress is an integer tick count (§1).
    for (const ch of [...channels.values()]) {
      if (ch.draining) {
        ch.progress -= REVIVE.drainMult; // §10/§17: reverse drain at 2x
        if (ch.progress <= 0) {
          channels.delete(ch.targetId);
          events.emit(tick, 'revive_drain_end', { target: ch.targetId });
        }
        continue;
      }
      const target = registry.byId(ch.targetId);
      const rev = ch.reviverId != null ? registry.byId(ch.reviverId) : null;
      if (!target || !rev) {
        channels.delete(ch.targetId);
        continue;
      }
      if (target.hp > 0) {
        // Revived by another path (free room-clear revive) — nothing to do.
        channels.delete(ch.targetId);
        if (rev) rev.reviveTargetId = null;
        continue;
      }
      if (rev.hp <= 0) {
        breakChannel(ch, 'reviver_downed', tick);
        continue;
      }
      if (distTo(rev, target.x, target.z) > REVIVE.range) {
        breakChannel(ch, 'out_of_range', tick);
        continue;
      }
      // (A human reviver's breaks are its input's, resolved in resolveHuman.)
      if (rev.kind === 'ally' && !isHuman(rev) && (rev.moving || rev.aiState !== 'revive')) {
        breakChannel(ch, rev.aiState === 'rally' ? 'rally' : 'move', tick);
        continue;
      }
      ch.progress += 1;
    }

    bolts.step(tick);
    caster.scatterShards.step(tick);
  }

  // ------------------------------------------------------ discrete phase --
  // §4 ②: party actor resolutions run party_index 0..3. The world resolves the
  // player (index 0) first and then calls this for indices 1..3 — plus the
  // player's own revive-channel arbitration, which must see the post-dodge
  // state (§5: same-tick dodge beats a revive-channel start).
  function resolveAll(snapshot) {
    const tick = getTick();

    // --- player channel (§10). The breaking intent executes normally this
    // tick; the world already resolved it before calling in here.
    if (!snapshot.reviveHeld) denialEdge.delete(player.id); // re-arm on release
    const moving = snapshot.move.x !== 0 || snapshot.move.z !== 0;
    const dodging = player.dashTicksLeft > 0;
    const skillPressed = snapshot.presses.some((p) => p.kind && p.kind.startsWith('skill_'));
    const freshBasic = snapshot.basicAttackHeld && !prevBasicHeld;

    const pch = player.reviveTargetId != null ? channels.get(player.reviveTargetId) : null;
    if (pch && !pch.draining && pch.reviverId === player.id) {
      let reason = null;
      if (player.hp <= 0) reason = 'reviver_downed';
      else if (moving) reason = 'move';
      else if (dodging) reason = 'dodge';
      else if (skillPressed) reason = 'skill';
      else if (freshBasic && !carriedBasic) reason = 'attack';
      else if (!snapshot.reviveHeld) reason = 'released';
      if (reason) breakChannel(pch, reason, tick);
    }

    if (
      player.reviveTargetId == null &&
      snapshot.reviveHeld &&
      player.hp > 0 &&
      !moving &&
      !dodging &&
      !skillPressed
    ) {
      const body = nearestDownedNear(player, REVIVE.range);
      if (body) startChannel(player, body, tick);
    }

    // --- ally channel starts + kit resolutions, ascending party_index.
    const allies = allyList().sort((a, b) => a.partyIndex - b.partyIndex);
    for (const a of allies) {
      if (isHuman(a)) {
        resolveHuman(a, tick); // M5b: its input, in its party_index slot
        continue;
      }
      if (a.hp <= 0) continue;
      if (a.aiState === 'revive') {
        const body = a.reviveTargetId != null ? registry.byId(a.reviveTargetId) : null;
        if (body && body.hp <= 0 && !a.moving && distTo(a, body.x, body.z) <= REVIVE.range) {
          const held = channels.get(body.id);
          if (held && !held.draining && held.reviverId !== null && held.reviverId !== a.id) {
            // §10 one reviver per body. Deny ONCE and hand the rescue back to
            // the assignment pass (§12 serial rescue), which will look for the
            // next unclaimed body — never a per-tick denial spray.
            startChannel(a, body, tick);
            a.aiState = 'engage';
            a.reviveTargetId = null;
          } else {
            startChannel(a, body, tick);
          }
        }
        continue; // §12: breaks off combat entirely while rescuing
      }
      if (a.aiState === 'rally') continue; // §8: engagement is broken during a rally
      resolveAllyAttack(a, tick);
    }

    // Completions (§10: 5.0 s uninterrupted).
    for (const ch of [...channels.values()]) {
      if (!ch.draining && ch.progress >= REVIVE.channelTicks) completeChannel(ch, tick);
    }

    prevBasicHeld = snapshot.basicAttackHeld;
    if (!snapshot.basicAttackHeld) carriedBasic = false;
  }

  function nearestDownedNear(reviver, range) {
    let best = null;
    let bestD2 = range * range;
    for (const m of party()) {
      if (m.id === reviver.id || m.hp > 0) continue;
      const d2 = dist2(m.x, m.z, reviver.x, reviver.z);
      if (d2 <= bestD2) {
        // Prefer the nearer body; equal distance breaks by party_index.
        if (!best || d2 < bestD2 || m.partyIndex < best.partyIndex) {
          bestD2 = d2;
          best = m;
        }
      }
    }
    return best;
  }

  // §7: "AI casts a kit skill when: target in shape range AND off cooldown;
  // skills fire ascending slot; AI basic-attacks between casts." One kit skill
  // per tick, lowest eligible slot; the basic only fires on a non-cast tick.
  function resolveAllyAttack(a, tick) {
    // PARTY: a displaced cast (dash / vault) delivers the tick its dash ends.
    if (a.pendingCast) {
      caster.runPending(a, tick);
      return;
    }
    if (caster.displacing(a)) return;
    const target = a.targetId != null ? registry.byId(a.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const S = ALLY_CLASSES[a.classId];
    const d = distTo(a, target.x, target.z);

    // PARTY §25.8: walk the equipped slots ascending — the first ACTIVE off
    // cooldown whose §25.2 AI rule holds (the §7 range rule for the starting
    // skills, so an unbuilt party casts exactly as v0.5.150), else the idle
    // fallback; else the basic.
    const slots = loadoutOf(a);
    const P = partyRef();
    const st = P ? P.seatState(a.partyIndex) : null;
    const pick = castChoice(a, target, tick, {
      registry,
      slots,
      baseDef: (id) => SKILLS[id] ?? null,
      resolve: (def) => resolvedOf(a, def),
      cds: a.cds,
      readySince: slots.map((_, k) => Math.max(a.cds[k] ?? 0, roomStartTick)),
      hostiles: () => hostiles(),
      party: () => party(),
      healer: () => player,
      waystone: () => registry.all().find((e) => e.kind === 'waystone' && e.hp > 0) || null,
      engage: engageOn(),
      castThisRoom: (k) => (a.cds[k] ?? 0) > roomStartTick,
      // a hostile an overdue skill may be cast at: inside the seat's ring + its basic reach
      reachOk: (e) => {
        const an = leashAnchor();
        return distTo(e, an.x, an.z) <= leashFor(a) + S.basicRange;
      },
      comboCount: (id, t, def) => {
        if (!st || !def.combo) return 0;
        let n = 0;
        for (const [sid, when] of Object.entries(st.combo || {})) if (sid !== id && t - when <= def.combo.windowTicks) n += 1;
        return n;
      },
    });
    if (pick) {
      const rdef = resolvedOf(a, pick.def);
      caster.cast(a, pick.def, pick.slot, tick, { mode: 'ai', target: pick.target && pick.target.faction === 'hostile' ? pick.target : target, lunge: !!pick.lunge });
      a.cds[pick.slot] = tick + cdTicksOf(rdef);
      logCast(a, pick.def.id, !!pick.fallback, tick);
      return;
    }

    if (tick < a.nextBasicTick) return;
    if (d > S.basicRange) return;
    fireAllyBasic(a, S, target, tick);
    a.nextBasicTick = tick + S.attackIntervalTicks;
  }

  // --- enemy-side delivery-shape selectors (mirror of sim/shapes.js, which
  // selects PARTY members for the healer's heals). Multi-hits within one
  // delivery resolve near->far, ties by ascending target id (§4 ①).
  function sortNearFar(list, x, z) {
    return list.sort((p, q) => {
      const dp = dist2(p.x, p.z, x, z);
      const dq = dist2(q.x, q.z, x, z);
      return dp !== dq ? dp - dq : p.id - q.id;
    });
  }

  function enemiesInArc(a, dirX, dirZ, reach, halfAngleDeg, count) {
    const r2max = reach * reach;
    const half = (clampHalfAngle(halfAngleDeg) * Math.PI) / 180;
    const cosHalf = Math.cos(half);
    const alen = Math.hypot(dirX, dirZ) || 1;
    const ax = dirX / alen;
    const az = dirZ / alen;
    const hit = hostiles().filter((e) => {
      const dx = e.x - a.x;
      const dz = e.z - a.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > r2max) return false;
      const d = Math.sqrt(d2);
      if (d < 1e-4) return true;
      return (dx / d) * ax + (dz / d) * az >= cosHalf;
    });
    sortNearFar(hit, a.x, a.z);
    return Number.isFinite(count) ? hit.slice(0, countFinal(count)) : hit;
  }

  function enemiesInNova(a, radius, count) {
    const r2max = radius * radius;
    const hit = hostiles().filter((e) => dist2(e.x, e.z, a.x, a.z) <= r2max);
    sortNearFar(hit, a.x, a.z);
    return hit.slice(0, countFinal(count));
  }

  function fireAllyBasic(a, S, target, tick) {
    const dirX = target.x - a.x;
    const dirZ = target.z - a.z;
    const l = Math.hypot(dirX, dirZ) || 1;
    const dx = dirX / l;
    const dz = dirZ / l;
    face(a, dx, dz);
    a.castLeftTicks = Math.max(a.castLeftTicks, 12);
    const ev = { id: a.id, partyIndex: a.partyIndex, classId: a.classId, shape: S.basicShape, dx: r2(dx), dz: r2(dz) };
    if (S.basicShape === 'melee_arc') {
      // §5: melee classes swing an arc on live aim hitting ALL targets in it.
      const targets = enemiesInArc(a, dx, dz, S.basicRange, S.basicHalfAngle, Infinity);
      ev.reach = S.basicRange;
      ev.halfAngle = S.basicHalfAngle;
      ev.targets = targets.map((t) => t.id);
      events.emit(tick, 'ally_basic', ev);
      for (const t of targets) {
        const tl = Math.hypot(t.x - a.x, t.z - a.z) || 1;
        combat.applyDamage(t, S.basicPower, {
          delivery: 'basic',
          shape: 'melee_arc', // §9 #4: the swing pauses the sim for 2 ticks
          dirX: (t.x - a.x) / tl,
          dirZ: (t.z - a.z) / tl,
          attacker: a.id,
          source: `${a.classId}_basic`,
        });
      }
      return;
    }
    events.emit(tick, 'ally_basic', ev);
    bolts.spawn(tick, {
      x: a.x,
      z: a.z,
      dirX: dx,
      dirZ: dz,
      speed: S.basicSpeed,
      range: S.basicRange,
      radius: BOLT_RADIUS,
      power: S.basicPower,
      skill: `${a.classId}_basic`,
      heal: false,
      sourceId: a.id,
    });
  }

  function fireAllySkill(a, def, slot, target, tick) {
    const dirX = target.x - a.x;
    const dirZ = target.z - a.z;
    const l = Math.hypot(dirX, dirZ) || 1;
    const dx = dirX / l;
    const dz = dirZ / l;
    face(a, dx, dz);
    a.castLeftTicks = Math.max(a.castLeftTicks, 24);
    const cast = {
      id: a.id,
      partyIndex: a.partyIndex,
      classId: a.classId,
      skill: def.id,
      slot,
      shape: def.shape,
      power: def.power,
      cd: def.cd,
      target: target.id,
      x: r2(a.x),
      z: r2(a.z),
      dx: r2(dx),
      dz: r2(dz),
    };

    if (def.shape === 'melee_arc') {
      const targets = enemiesInArc(a, dx, dz, def.range, def.area, def.count);
      cast.reach = def.range;
      cast.halfAngle = def.area;
      cast.targets = targets.map((t) => t.id);
      events.emit(tick, 'ally_cast', cast);
      for (const t of targets) {
        const tl = Math.hypot(t.x - a.x, t.z - a.z) || 1;
        combat.applyDamage(t, def.power, {
          delivery: 'skill',
          shape: def.shape, // melee_arc casts carry the §9 #4 2-tick pause
          dirX: (t.x - a.x) / tl,
          dirZ: (t.z - a.z) / tl,
          attacker: a.id,
          source: def.id,
        });
      }
      return;
    }

    if (def.shape === 'nova') {
      const targets = enemiesInNova(a, def.area, def.count);
      cast.radius = def.area;
      cast.targets = targets.map((t) => t.id);
      events.emit(tick, 'ally_cast', cast);
      for (const t of targets) {
        const tl = Math.hypot(t.x - a.x, t.z - a.z) || 1;
        combat.applyDamage(t, def.power, {
          delivery: 'skill',
          shape: def.shape, // melee_arc casts carry the §9 #4 2-tick pause
          dirX: (t.x - a.x) / tl,
          dirZ: (t.z - a.z) / tl,
          attacker: a.id,
          source: def.id,
        });
      }
      return;
    }

    if (def.shape === 'projectile') {
      cast.count = countFinal(def.count);
      events.emit(tick, 'ally_cast', cast);
      for (const dir of fanDirections(dx, dz, def.count)) {
        bolts.spawn(tick, {
          x: a.x,
          z: a.z,
          dirX: dir.x,
          dirZ: dir.z,
          speed: def.speed,
          range: def.range,
          radius: BOLT_RADIUS,
          power: def.power,
          skill: def.id,
          heal: false,
          sourceId: a.id,
        });
      }
      return;
    }

    // ground_aoe: placed at the target, clamped to the skill's placement range.
    const pos = clampPlacement(a, { x: target.x, z: target.z }, def.range);
    const zone = registry.spawn({
      kind: 'azone',
      skill: def.id,
      classId: a.classId,
      x: pos.x,
      z: pos.z,
      px: pos.x,
      pz: pos.z,
      radius: def.area,
      power: def.power,
      sourceId: a.id,
      ticksDone: 0,
      totalTicks: Math.round(secTicks(def.durationSec) / ZONE_CADENCE_TICKS),
      nextTickTick: tick + ZONE_CADENCE_TICKS, // §6: first tick 1.0 s after placement
    });
    cast.zone = zone.id;
    cast.zx = r2(pos.x);
    cast.zz = r2(pos.z);
    cast.radius = def.area;
    events.emit(tick, 'ally_cast', cast);
    events.emit(tick, 'azone_spawn', {
      id: zone.id,
      skill: def.id,
      classId: a.classId,
      x: r2(pos.x),
      z: r2(pos.z),
      radius: def.area,
      totalTicks: zone.totalTicks,
    });
  }

  // §4 ④: persistent-zone scheduled ticks, ascending zone spawn ordinal. Each
  // tick creates normal instances (own crit roll; i-frame/Downed suppression).
  // THE TIDECALLER: Dive drops her into a splash that leaves a puddle where
  // she went under for 1 s; it soaks every enemy standing in it (no damage).
  function divePuddle(a, tick) {
    const z = registry.spawn({
      kind: 'azone',
      skill: 'dive',
      classId: a.classId,
      x: a.x,
      z: a.z,
      px: a.x,
      pz: a.z,
      radius: CLASS_TECH.diveSoakRadius,
      power: 0,
      sourceId: a.id,
      puddle: true,
      ticksDone: 0,
      totalTicks: 1,
      untilTick: tick + CLASS_TECH.diveSoakTicks,
      nextTickTick: tick,
    });
    events.emit(tick, 'azone_spawn', { id: z.id, skill: 'dive', classId: a.classId, x: r2(z.x), z: r2(z.z), radius: z.radius, totalTicks: 1, puddle: true });
  }
  function puddleTick(z, tick) {
    const S = combat.status;
    if (S) {
      for (const e of hostiles()) {
        if (dist2(e.x, e.z, z.x, z.z) <= z.radius * z.radius) S.apply(e, 'soaked', CLASS_TECH.soakMag, CLASS_TECH.soakTicks, tick, z.sourceId);
      }
    }
    if (tick >= z.untilTick) {
      events.emit(tick, 'azone_expire', { id: z.id, skill: z.skill });
      registry.despawn(z.id);
    }
  }

  function zonePhase(tick) {
    for (const z of registry.all()) {
      if (z.kind !== 'azone' || tick < z.nextTickTick) continue;
      if (z.puddle) {
        puddleTick(z, tick);
        continue;
      }
      z.ticksDone += 1;
      z.nextTickTick += ZONE_CADENCE_TICKS;
      const occupants = hostiles().filter(
        (e) => dist2(e.x, e.z, z.x, z.z) <= z.radius * z.radius
      );
      sortNearFar(occupants, z.x, z.z);
      const hitIds = [];
      for (const t of occupants) {
        const tl = Math.hypot(t.x - z.x, t.z - z.z) || 1;
        const opts = {
          delivery: 'skill',
          shape: 'ground_aoe',
          dirX: (t.x - z.x) / tl,
          dirZ: (t.z - z.z) / tl,
          attacker: z.sourceId,
          source: z.skill,
        };
        // THE TIDECALLER: Undertow drags its occupants toward the centre (a
        // pull no farther than the centre itself; never a boss).
        if (z.drag) opts.kbDist = t.boss === true || t.kind === 'stag' ? 0 : -Math.min(z.drag, Math.hypot(t.x - z.x, t.z - z.z));
        // PARTY: a built ally's zone (mods / a status) resolves through the
        // cast pipeline; a plain zone keeps this path.
        const r = z.mods || z.applies ? caster.zoneHit(z, t, opts) : combat.applyDamage(t, z.power, opts);
        if (r && !r.immune) hitIds.push(t.id);
      }
      events.emit(tick, 'azone_tick', { id: z.id, skill: z.skill, n: z.ticksDone, hit: hitIds });
      if (z.ticksDone >= z.totalTicks) {
        events.emit(tick, 'azone_expire', { id: z.id, skill: z.skill });
        registry.despawn(z.id);
      }
    }
  }

  // End-of-tick: ally zones tick in the §4 ④ slot, then the §2 defeat rule is
  // evaluated on live HP so a cmd-driven or pipeline-driven fourth down lands
  // its `defeat` event on the exact tick the party is fully down.
  function endOfTick() {
    const tick = getTick();
    zonePhase(tick);
    const p = party();
    const allDown = p.length >= 4 && p.every((m) => m.hp <= 0);
    if (allDown && !defeated) {
      defeated = true;
      events.emit(tick, 'defeat', {
        reason: 'all_downed',
        party: p.map((m) => ({ index: m.partyIndex, id: m.id, hp: r2(m.hp) })),
      });
    } else if (!allDown && defeated) {
      defeated = false;
    }
    // Render hint decay (attack clip hold), tick-denominated like every timer.
    for (const a of allyList()) if (a.castLeftTicks > 0) a.castLeftTicks -= 1;
  }

  // ------------------------------------------------------------ views/cmd --
  function channelView() {
    return [...channels.values()].map((ch) => ({
      target: ch.targetId,
      reviver: ch.reviverId,
      progress: ch.progress,
      total: REVIVE.channelTicks,
      pct: r2(ch.progress / REVIVE.channelTicks),
      draining: ch.draining,
    }));
  }

  function view() {
    return {
      mark,
      rallyPoint: rallyPoint ? { x: r2(rallyPoint.x), z: r2(rallyPoint.z) } : null,
      anchor: leashAnchor().id,
      leash: LEASH.radius,
      defeated,
      repeats: [...repeats],
      channels: channelView(),
      allies: allyList().map((a) => ({
        id: a.id,
        classId: a.classId,
        partyIndex: a.partyIndex,
        hp: r2(a.hp),
        maxHp: a.maxHp,
        downed: !!a.downed,
        state: a.aiState ?? 'engage',
        target: a.targetId ?? null,
        reviveTarget: a.reviveTargetId ?? null,
        x: r2(a.x),
        z: r2(a.z),
        anchorDist: r2(distTo(a, leashAnchor().x, leashAnchor().z)),
        moving: !!a.moving,
        graceUntilTick: a.graceUntilTick ?? -1,
        cds: (a.cds ?? [0, 0, 0, 0]).map((c) => Math.max(0, c - getTick())),
        // fix-M4a-r5: a melee seat's vanguard ring while the campaign
        // engagement rules are on (the key only then: harness views unchanged).
        ...(engageOn() && isMelee(a) ? { leash: r2(leashFor(a)) } : {}),
      })),
    };
  }

  // Render-side read-only accessors.
  const getMark = () => mark;
  const getChannels = () => channels;
  const playerChanneling = () => player.reviveTargetId != null;
  // §10: a HELD attack carried into the channel is consumed silently — the
  // world's basic-fire resolver asks here before firing.
  const basicSuppressed = () => playerChanneling() && carriedBasic;

  function cmd(name, args) {
    const tick = getTick();
    switch (name) {
      case 'mark':
        return setMark(args[0] ?? null);
      case 'cycleMark':
        return cycleMark();
      case 'rally':
        return rally();
      case 'allyState':
        return view();
      case 'reviveState':
        return { channels: channelView(), repeats: [...repeats], defeated };
      case 'downAll': {
        // Defeat probe (docs/TESTING.md): floor every party member's HP. The
        // `defeat` event lands on the next tick's end-of-tick evaluation.
        for (const m of party()) m.hp = 0;
        return party().map((m) => ({ index: m.partyIndex, hp: m.hp }));
      }
      case 'breakRevive': {
        // Force a break on the active channel with an arbitrary reason so the
        // §17 2x reverse drain can be captured for any cause.
        const [reason = 'debug'] = args;
        const ch = [...channels.values()].find((c) => !c.draining);
        if (!ch) return null;
        breakChannel(ch, reason, tick);
        return { target: ch.targetId, progress: ch.progress };
      }
      case 'reviveFlinchBreak': {
        // OPT-IN. §10's break list is closed (nonzero move, dodge, skill cast,
        // fresh attack press, reviver going Downed) and does NOT include being
        // damaged, so the default is OFF; this flag exists so a damage-flinch
        // break can still be exercised on demand.
        flinchBreaks = !!args[0];
        return flinchBreaks;
      }
      case 'roomBoundary':
        onRoomBoundary('debug_boundary');
        return true;
      case 'campSeats':
        // Camp block: install (object) or clear (null) the hearth seat hold.
        campSeats = args && args[0] ? args[0] : null;
        return !!campSeats;
      default:
        return undefined;
    }
  }

  // §10 (opt-in, see cmd('reviveFlinchBreak')): a damage instance on the
  // reviver breaks the channel. Off by default — the brief's break list is
  // closed and damage is not on it.
  function onHit(ev) {
    if (!flinchBreaks) return;
    const ch = [...channels.values()].find((c) => !c.draining && c.reviverId === ev.target);
    if (ch) breakChannel(ch, 'flinch', ev.tick);
  }

  // Save system (docs/gauntlet/PLAN.md §3.4, M2): every piece of private
  // party-command / revive / camp-seat state (the bodies are registry data).
  function saveState() {
    const out = {
      mark,
      rallyPoint,
      defeated,
      flinchBreaks,
      repeats,
      channels: [...channels.entries()],
      denialEdge: [...denialEdge.entries()],
      carriedBasic,
      prevBasicHeld,
      campSeats,
    };
    // PARTY: the room-start tick the AI's idle fallback measures from.
    if (roomStartTick) out.roomStartTick = roomStartTick;
    // M5b: network seat control rides along ONLY while some seat is not at
    // its single-player default (a saved single-player tree is unchanged).
    if (controllers.some((c, i) => c !== DEFAULT_CONTROLLERS[i]) || prevHumanBasic.some(Boolean)) {
      out.seats = { controllers: [...controllers], prevBasic: [...prevHumanBasic], timers: humanTimers.map((t) => (t ? { cds: [...t.cds], basic: t.basic, dodge: t.dodge, fire: Number.isInteger(t.fire) ? t.fire : -1 } : null)) };
    }
    return out;
  }
  function loadState(d) {
    if (!d || !Array.isArray(d.repeats)) throw new TypeError('allies.loadState: missing repeats');
    mark = d.mark ?? null;
    rallyPoint = d.rallyPoint ?? null;
    defeated = !!d.defeated;
    flinchBreaks = !!d.flinchBreaks;
    for (let i = 0; i < repeats.length; i++) repeats[i] = d.repeats[i] ?? 0;
    channels.clear();
    for (const [k, v] of d.channels ?? []) channels.set(k, v);
    denialEdge.clear();
    for (const [k, v] of d.denialEdge ?? []) denialEdge.set(k, v);
    carriedBasic = !!d.carriedBasic;
    prevBasicHeld = !!d.prevBasicHeld;
    campSeats = d.campSeats ?? null;
    roomStartTick = Number.isFinite(d.roomStartTick) ? d.roomStartTick : 0;
    // M5b: seat controllers (absent = the single-player defaults). Per-tick
    // seat inputs are external and never saved: after a load every seat is
    // driven by whatever the next world.step hands in (a network save loads
    // as single-player with AI in every ally seat, PLAN §3.4).
    const sc = d.seats && Array.isArray(d.seats.controllers) ? d.seats : null;
    for (let i = 0; i < 4; i++) {
      controllers[i] = sc && (sc.controllers[i] === 'human' || sc.controllers[i] === 'ai') ? sc.controllers[i] : DEFAULT_CONTROLLERS[i];
      prevHumanBasic[i] = !!(sc && sc.prevBasic && sc.prevBasic[i]);
      const t = sc && Array.isArray(sc.timers) ? sc.timers[i] : null;
      humanTimers[i] = t && Array.isArray(t.cds) ? { cds: [...t.cds], basic: t.basic, dodge: t.dodge, fire: Number.isInteger(t.fire) ? t.fire : -1 } : null;
    }
    seatFrames = [null, null, null, null];
    humanInteractList.length = 0;
  }

  return {
    saveState,
    loadState,
    continuous,
    resolveAll,
    endOfTick,
    cycleMark,
    rally,
    onRoomBoundary,
    onHit,
    view,
    cmd,
    getMark,
    getChannels,
    playerChanneling,
    basicSuppressed,
    ALLY_CLASSES,
    ALLY_KITS,
    // PARTY: the cast pipeline (the party system's echo / counter / pulse
    // hooks reach it here) and the GP.8 AI log.
    caster: () => caster,
    aiLog: () => aiLog.map((l) => (l ? structuredClone(l) : null)),
    // fix-M4a-r5 (GP.8): run.js installs the campaign-engagement predicate.
    setEngage: (fn) => {
      engageFn = typeof fn === 'function' ? fn : () => false;
    },
    engageOn,
    leashFor,
    // M5b network seats (host): per-tick seat inputs, the E presses they
    // made this tick (resolved with the Healer's in the interactables pass),
    // the seat controllers and the lag-compensation counters.
    setSeatInputs,
    humanInteracts: () => humanInteractList,
    controllers: () => [...controllers],
    isHumanSeat: (i) => seatFrames[i] != null,
    lagStats: () => ({ ...lagStats }),
    setLagCompensation(on) {
      lagStats.enabled = !!on;
      return lagStats.enabled;
    },
  };
}
