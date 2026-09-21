// Deterministic default-build bot (docs/gauntlet/PLAN.md §3.7 / §6.7). Owner:
// M4a. It plays the Healer (seat 0) through the SAME closed intent vocabulary
// a human uses (core/intents.js) — it never touches sim state directly during
// combat, it only produces the per-tick intent snapshot. Between rooms it
// drives the run pages through the run system's public entry points (the
// same calls the UI and __echoes.cmd make): drafts always taken, the first
// door, the cheapest affordable shop item, every bench node socketed into the
// first owned skill where it is live.
//
// Uses (both binding):
//   - the act runner tools/gnt-M4a-actrun.mjs (G4a.9 / G4a.10 curve data);
//   - M5b's seat-0 leader bot after a host migration (reused unchanged).
//
// DETERMINISM: state-only. Every decision reads the registry / run view at a
// tick boundary, iterates entities in ascending id order and breaks ties by
// id; no RNG, no wall clock, no DOM. The same world state always yields the
// same snapshot, so a seeded run replays bit-identically.
//
// Policy (PLAN §3.7): follow the party centroid at 1.5 u; dodge an Ember
// telegraph that covers the Healer; cast ready heals on the smart target
// below 70% HP; cast ready damage skills at the nearest enemy; basic-attack
// the nearest enemy in range; revive a Downed ally when nothing is on top of
// it.
import { SKILLS } from './skills.js';
import { NODES, RARITY_RANK } from './nodes.js';
import { emptySnapshot } from '../core/intents.js';
import { SKILL_SLOTS, DODGE } from '../core/constants.js';

const FOLLOW_U = 1.5; // hold within 1.5 u of the party centroid
const HEAL_BELOW = 0.7; // cast heals when the neediest member is below 70%
const BASIC_RANGE = 5.0; // §7 Healer basic range
const DODGE_LEAD_TICKS = 30; // dodge a covering telegraph this close to resolving
const REVIVE_SAFE_U = 2.0; // no hostile this close to the body before we channel
const DEFAULT_CFG = Object.freeze({ seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'auto' });

const d2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);

export function createAutopilot({ registry, player, run, skills, build }) {
  let cfg = null; // null = off
  let lastShopRoom = -1;
  const stats = { ticks: 0, dodges: 0, casts: 0, drafts: 0, doors: 0, buys: 0, sockets: 0 };

  const partyAll = () =>
    registry
      .all()
      .filter((e) => e.partyIndex !== undefined)
      .sort((a, b) => a.partyIndex - b.partyIndex);
  const hostiles = () =>
    registry
      .all()
      .filter((e) => e.faction === 'hostile' && e.hp > 0 && e.hittable && (e.state === 'active' || e.kind === 'stag'))
      .sort((a, b) => a.id - b.id);

  function nearest(list, x, z) {
    let best = null;
    let bd = Infinity;
    for (const e of list) {
      const d = d2(e.x, e.z, x, z);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best ? { e: best, d: Math.sqrt(bd) } : null;
  }

  // Ember danger zones the Healer can stand in: ring / lane / cone telegraphs
  // on hostile bodies (enemies, the Stag) and hazards mid-telegraph.
  function dangers(tick) {
    const out = [];
    for (const e of registry.all()) {
      const t = e.telegraph;
      if (t && (e.faction === 'hostile' || e.kind === 'hazard')) {
        const left = (t.resolveTick ?? tick) - tick;
        const kind = t.kind ?? (e.kind === 'stag' ? 'ring' : e.kind === 'mantis' ? 'lane' : 'ring');
        if (kind === 'lane') {
          const fx = t.fromX ?? e.x;
          const fz = t.fromZ ?? e.z;
          const len = t.length ?? Math.hypot(t.x - fx, t.z - fz);
          out.push({ kind: 'lane', fx, fz, dx: t.dirX ?? 0, dz: t.dirZ ?? 0, len: Math.max(len, 1), w: (t.width ?? 0.7) / 2 + 0.35, left });
        } else if (kind === 'cone') {
          out.push({ kind: 'ring', x: e.x, z: e.z, r: (t.length ?? t.radius ?? 1.8) + 0.3, left });
        } else {
          out.push({ kind: 'ring', x: t.x ?? e.x, z: t.z ?? e.z, r: (t.radius ?? 1.0) + 0.3, left });
        }
      }
      if (e.kind === 'hazard' && e.phase === 'telegraph' && !e.telegraph) {
        const left = (e.phaseUntilTick ?? tick) - tick;
        if (e.lane)
          out.push({ kind: 'lane', fx: e.lane.x0, fz: e.lane.z0, dx: e.lane.x1 - e.lane.x0, dz: e.lane.z1 - e.lane.z0, len: 1, w: (e.lane.w ?? 1.4) / 2 + 0.3, left, raw: true });
        else out.push({ kind: 'ring', x: e.x, z: e.z, r: (e.radius ?? 1.0) + 0.3, left });
      }
    }
    return out;
  }

  // Is (x, z) inside danger zone z; returns the escape direction or null.
  function escape(zn, x, z) {
    if (zn.kind === 'ring') {
      const dx = x - zn.x;
      const dz = z - zn.z;
      const d = Math.hypot(dx, dz);
      if (d > zn.r) return null;
      return d > 1e-3 ? { x: dx / d, z: dz / d } : { x: 1, z: 0 };
    }
    let dx = zn.dx;
    let dz = zn.dz;
    let len = zn.len;
    if (zn.raw) {
      len = Math.hypot(dx, dz);
      if (len < 1e-6) return null;
      dx /= len;
      dz /= len;
    } else {
      const l = Math.hypot(dx, dz);
      if (l < 1e-6) return null;
      dx /= l;
      dz /= l;
    }
    const rx = x - zn.fx;
    const rz = z - zn.fz;
    const along = rx * dx + rz * dz;
    if (along < -0.3 || along > len + 0.3) return null;
    const perp = rx * -dz + rz * dx;
    if (Math.abs(perp) > zn.w) return null;
    const s = perp >= 0 ? 1 : -1;
    return { x: -dz * s, z: dx * s };
  }

  function norm(x, z) {
    const l = Math.hypot(x, z);
    return l > 1e-6 ? { x: x / l, z: z / l } : { x: 0, z: 0 };
  }

  // --------------------------------------------------------- between rooms --
  function autoSocket() {
    const b = build();
    if (!b || cfg.socket === 'off') return;
    for (let guard = 0; guard < 24; guard++) {
      const v = b.view();
      if (v.combatActive || v.bench.length === 0) return;
      let done = false;
      for (const rec of v.bench) {
        const n = NODES[rec.node];
        if (!n) continue;
        for (const sk of v.skills) {
          if (b.verdictFor(sk.id, rec.node).state !== 'live') continue;
          const copies = sk.sockets.filter((s) => s && s.node === rec.node).length;
          if (copies >= n.limit) continue;
          const slot = sk.sockets.findIndex((s, i) => s === null && RARITY_RANK[n.rarity] <= RARITY_RANK[sk.caps[i]]);
          if (slot < 0) continue;
          const r = b.socket(sk.id, rec.node, slot);
          if (r && !r.denied) {
            stats.sockets += 1;
            done = true;
            break;
          }
        }
        if (done) break;
      }
      if (!done) return;
    }
  }

  function pages() {
    const r = run();
    if (!r) return false;
    const v = r.view();
    if (v.phase === 'reward' && cfg.drafts === 'take') {
      if (v.reward && v.reward.type) r.takeReward();
      else r.declineReward();
      stats.drafts += 1;
      autoSocket();
      return true;
    }
    if (v.phase === 'path') {
      autoSocket();
      r.choosePath(cfg.doors === 1 ? 1 : 0);
      stats.doors += 1;
      return true;
    }
    if (v.phase === 'shop' && v.shop) {
      if (cfg.shop === 'cheapest' && lastShopRoom !== v.room) {
        lastShopRoom = v.room;
        let best = -1;
        let bestPrice = Infinity;
        v.shop.stock.forEach((s, i) => {
          if (!s.sold && s.price <= v.wallet && s.price < bestPrice) {
            bestPrice = s.price;
            best = i;
          }
        });
        if (best >= 0 && r.buy(best)) stats.buys += 1;
        autoSocket();
      }
      r.advanceFromShop();
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------- combat --
  function combatIntents(tick, snap) {
    const s = emptySnapshot();
    s.aim = snap && snap.aim ? { ...snap.aim } : null;
    if (!(player.hp > 0)) {
      // Downed: crawl toward the nearest living ally (the reviver comes faster).
      const up = partyAll().filter((m) => m.id !== player.id && m.hp > 0);
      const n = nearest(up, player.x, player.z);
      if (n && n.d > 0.4) s.move = norm(n.e.x - player.x, n.e.z - player.z);
      return s;
    }
    const party = partyAll();
    const foes = hostiles();
    const nearFoe = nearest(foes, player.x, player.z);

    // 1. Dodge a telegraph that covers us and is about to land.
    const zones = dangers(tick);
    let inside = null;
    for (const zn of zones) {
      const esc = escape(zn, player.x, player.z);
      if (esc) {
        if (!inside || zn.left < inside.zn.left) inside = { zn, esc };
      }
    }
    if (inside && inside.zn.left <= DODGE_LEAD_TICKS && tick >= player.dodgeReadyTick && !(player.dashTicksLeft > 0)) {
      s.move = inside.esc;
      s.presses.push({ kind: 'dodge' });
      stats.dodges += 1;
      return s;
    }

    // 2. Revive a Downed ally when nothing hostile is on it.
    const downed = party.filter((m) => m.id !== player.id && !(m.hp > 0));
    const body = nearest(downed, player.x, player.z);
    if (body && !inside) {
      const threat = nearest(foes, body.e.x, body.e.z);
      if (!threat || threat.d > REVIVE_SAFE_U) {
        if (body.d > 0.45) s.move = norm(body.e.x - player.x, body.e.z - player.z);
        else s.reviveHeld = true;
        return s;
      }
    }

    // 3. Movement: out of danger, else hold near the party centroid, else
    // keep a step of room from the nearest foe.
    const allies = party.filter((m) => m.id !== player.id && m.hp > 0);
    let cx = player.x;
    let cz = player.z;
    if (allies.length > 0) {
      cx = allies.reduce((a, m) => a + m.x, 0) / allies.length;
      cz = allies.reduce((a, m) => a + m.z, 0) / allies.length;
    }
    if (inside) s.move = inside.esc;
    else if (Math.hypot(cx - player.x, cz - player.z) > FOLLOW_U) s.move = norm(cx - player.x, cz - player.z);
    else if (nearFoe && nearFoe.d < 1.4) s.move = norm(player.x - nearFoe.e.x, player.z - nearFoe.e.z);

    // 4. Casts. The neediest member (self included) below 70% gets the heals;
    // otherwise the nearest enemy gets the damage. One aim per tick, so only
    // the skills consistent with that aim are pressed.
    let needy = null;
    for (const m of party) {
      if (!(m.hp > 0)) continue;
      const f = m.hp / m.maxHp;
      if (!needy || f < needy.f || (f === needy.f && m.partyIndex < needy.m.partyIndex)) needy = { m, f };
    }
    const view = skills.slotsView();
    const healing = needy && needy.f < HEAL_BELOW;
    if (healing) {
      s.aim = { x: needy.m.x, z: needy.m.z };
      for (let i = 0; i < Math.min(SKILL_SLOTS, view.length); i++) {
        const sl = view[i];
        if (!sl || sl.passive || sl.remainingTicks > 0) continue;
        const def = SKILLS[sl.id];
        if (def.archetype !== 'heal') continue;
        s.presses.push({ kind: `skill_${i + 1}`, slot: i });
        stats.casts += 1;
      }
    } else if (nearFoe) {
      s.aim = { x: nearFoe.e.x, z: nearFoe.e.z };
      for (let i = 0; i < Math.min(SKILL_SLOTS, view.length); i++) {
        const sl = view[i];
        if (!sl || sl.passive || sl.remainingTicks > 0) continue;
        const def = SKILLS[sl.id];
        if (def.archetype !== 'damage') continue;
        const reach = def.shape === 'nova' ? def.area + 0.3 : (def.range ?? BASIC_RANGE);
        if (nearFoe.d > reach) continue;
        s.presses.push({ kind: `skill_${i + 1}`, slot: i });
        stats.casts += 1;
      }
    }
    // 5. Basic attack the nearest enemy in range (only while aimed at one).
    if (!healing && nearFoe && nearFoe.d <= BASIC_RANGE) s.basicAttackHeld = true;
    return s;
  }

  function intents(tick, snap) {
    if (!cfg) return snap;
    stats.ticks += 1;
    const r = run();
    const v = r ? r.view() : null;
    if (v && v.active && pages()) {
      const s = emptySnapshot();
      s.aim = snap && snap.aim ? { ...snap.aim } : null;
      return s;
    }
    if (v && v.active && v.phase === 'combat') return combatIntents(tick, snap);
    const s = emptySnapshot();
    s.aim = snap && snap.aim ? { ...snap.aim } : null;
    return s;
  }

  function configure(arg) {
    if (arg === false || arg === null || arg === 'off' || arg === 0) cfg = null;
    else cfg = { ...DEFAULT_CFG, ...(typeof arg === 'object' ? arg : {}) };
    lastShopRoom = -1;
    return view();
  }

  function view() {
    return { active: !!cfg, cfg: cfg ? { ...cfg } : null, stats: { ...stats }, dodgeCdTicks: DODGE.cooldownTicks };
  }

  return {
    configure,
    intents,
    active: () => !!cfg,
    view,
    serialize: () => ({ cfg: cfg ? { ...cfg } : null, lastShopRoom, stats: { ...stats } }),
    restore: (d) => {
      cfg = d && d.cfg ? { ...d.cfg } : null;
      lastShopRoom = d && Number.isFinite(d.lastShopRoom) ? d.lastShopRoom : -1;
      if (d && d.stats) Object.assign(stats, d.stats);
    },
  };
}
