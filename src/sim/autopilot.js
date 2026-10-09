// Deterministic default-build bot (docs/gauntlet/PLAN.md §3.7 / §6.7). Owner:
// M4a. It plays the Healer (seat 0) through the SAME closed intent vocabulary
// a human uses (core/intents.js) — it never touches sim state directly during
// combat, it only produces the per-tick intent snapshot. Between rooms it
// drives the run pages through the run system's public entry points (the
// same calls the UI and __echoes.cmd make): drafts always taken, the first
// door, the cheapest affordable shop items (cheapest first, while the wallet
// lasts — M4c: the 4-card shelf at 15/20/25 affords three), and every bench
// node socketed by the build system's own autoFill() — the SAME policy the
// socket screen's Auto-fill button runs (live placements only, spread to the
// skill with the fewest filled sockets; M4c decision D7).
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
//
// AUTOPILOT AND ENDLESS (v0.5.260, docs/AUTOPILOT.md): the bot (the plain
// autopilot and the leader seat under a human alike) presses a heal only when
// it reaches someone hurt, and keeps attacking while its heals cool down (it
// used to hold its fire whenever any ally was under its heal line, whatever
// was ready). The plain bot, alone with the party down, starts a revive from
// 35% HP and holds it to 20%: waiting for 60% let a Healer with no damage kit
// stall a room forever.
import { SKILLS } from './skills.js';
import { emptySnapshot } from '../core/intents.js';
import { SKILL_SLOTS, DODGE } from '../core/constants.js';

const FOLLOW_U = 1.5; // hold within 1.5 u of the party centroid
const HEAL_BELOW = 0.7; // cast heals when the neediest member is below 70%
const BASIC_RANGE = 5.0; // §7 Healer basic range
const DODGE_LEAD_TICKS = 30; // dodge a covering telegraph this close to resolving
const REVIVE_SAFE_U = 2.0; // no hostile this close to the body before we channel
const DESPERATE_START = 0.6; // with <= 1 ally up: start a channel under threat at >= 60% HP
const DESPERATE_HOLD = 0.3; //   ...and hold it (no dodge) while HP stays above 30%
// The plain bot's lone-revive floors (the leader seat keeps the two above).
const LONE_START = 0.35;
const LONE_HOLD = 0.2;
// v0.5.227 — the AI Healer under a player on another class (`leader`): Kesh
// saw it "only know basic attack". It now heals anyone below 90% and fires
// each ready damage skill at the nearest foe that skill reaches, the way the
// AI-held allies spend their kits. The plain autopilot (harness runs, the
// act runner) keeps the 70% rule and its single target.
const LEADER_HEAL_BELOW = 0.9;
// ROOM OBJECTIVES (docs/ROOM_OBJECTIVES.md): in a hunt the bot runs the
// quarry down (the leashed party follows it), in a purge it walks from nest
// to nest; within this distance it stops closing and shoots.
const CHASE_U = 3.0;
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
      .filter((e) => e.faction === 'hostile' && e.hp > 0 && e.hittable && (e.state === 'active' || e.kind === 'stag' || e.boss === true))
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

  // A foe whose projectile guard covers (x, z) — the Barrow Ram's horn
  // guard (PLAN §3.6 (c)): bolts fired from there are blocked, so the bot
  // targets someone else and circles to the flank (+8° margin).
  function guardedAgainst(e, x, z) {
    const g = e.guard;
    if (!g || !g.active) return false;
    const dx = x - e.x;
    const dz = z - e.z;
    const l = Math.hypot(dx, dz) || 1;
    const gl = Math.hypot(g.dirX ?? 0, g.dirZ ?? 0) || 1;
    const dot = (dx / l) * ((g.dirX ?? 0) / gl) + (dz / l) * ((g.dirZ ?? 0) / gl);
    return dot >= Math.cos((((g.halfArcDeg ?? 55) + 8) * Math.PI) / 180);
  }

  function norm(x, z) {
    const l = Math.hypot(x, z);
    return l > 1e-6 ? { x: x / l, z: z / l } : { x: 0, z: 0 };
  }

  // --------------------------------------------------------- between rooms --
  function autoSocket() {
    const b = build();
    if (!b || cfg.socket === 'off' || typeof b.autoFill !== 'function') return;
    const v = b.view();
    if (v.combatActive || v.bench.length === 0) return;
    const r = b.autoFill();
    if (r && Array.isArray(r.socketed)) stats.sockets += r.socketed.length;
  }

  function pages() {
    const r = run();
    if (!r) return false;
    const v = r.view();
    if (v.phase === 'reward' && cfg.drafts === 'take') {
      // Ruling A17: a SWAP offer (4 skills owned) follows the §25.8 Healer
      // priority — take it (replacing the suggested slot) only when the new
      // skill outranks the lowest-priority owned one; else Leave. Every
      // other card: take.
      if (v.reward && v.reward.type && v.reward.swap) {
        if (v.reward.suggest === 'take') r.takeReward(v.reward.replace);
        else r.declineReward();
      } else if (v.reward && v.reward.type) r.takeReward();
      else r.declineReward();
      stats.drafts += 1;
      autoSocket();
      return true;
    }
    // RELICS: take the first relic of the three (the relic stream already
    // weighted the roll), then walk on.
    if (v.phase === 'relic') {
      if (typeof r.chooseRelic === 'function') r.chooseRelic(0);
      stats.relics = (stats.relics ?? 0) + 1;
      return true;
    }
    // EVENT ROOMS: walk up to the encounter (no walk needed: open its card),
    // then take the safe option — Take only when the encounter is safe (no
    // HP, curse, relic or fight) and affordable; else Leave.
    if (v.phase === 'event') {
      if (typeof r.openEncounter === 'function') r.openEncounter();
      return true;
    }
    // KEYS AND VAULTS: open the vault's chest (no walk needed).
    if (v.phase === 'vault') {
      if (typeof r.openVault === 'function') r.openVault();
      stats.vaults = (stats.vaults ?? 0) + 1;
      return true;
    }
    if (v.phase === 'encounter') {
      const e = v.encounter;
      const take = !!(e && e.safe && !e.refused && cfg.events !== 'leave');
      r.chooseEncounter(take ? 'take' : 'leave');
      stats.events = (stats.events ?? 0) + 1;
      return true;
    }
    if (v.phase === 'path') {
      autoSocket();
      // RELICS: `curses: 'avoid'` walks the other door when the configured
      // one is cursed (default 'take': the configured door, cursed or not,
      // except a MAJOR curse, which binds the whole run: the bot steps around
      // it unless `curses: 'all'`).
      let side = cfg.doors === 1 ? 1 : 0;
      const o = v.path && v.path.options[side];
      if (o && o.curse && (cfg.curses === 'avoid' || (o.major && cfg.curses !== 'all'))) side = 1 - side;
      // EVENT ROOMS: `events: 'avoid'` walks the other door when this one is "?".
      else if (o && o.event && cfg.events === 'avoid') side = 1 - side;
      // KEYS AND VAULTS: with a key in hand, the vault door (`vaults: 'skip'`
      // walks past it).
      const vi = v.path ? v.path.options.findIndex((x) => x.vault) : -1;
      if (vi >= 0 && cfg.vaults !== 'skip') side = vi;
      r.choosePath(side);
      stats.doors += 1;
      return true;
    }
    // CAMPAIGN (PLAN §12.2): the level-transition card advances at its
    // untilTick — the same moment a ready presentation advances it.
    if (v.phase === 'transit') {
      const c = typeof r.campaign === 'function' ? r.campaign() : null;
      if (c && c.card && c.card.due) r.campaignAdvance('autopilot');
      return true;
    }
    // One shopping trip per LEVEL's shop (a campaign visits room 7 once per
    // level: the key is act × 100 + room, still a plain number).
    const shopKey = (v.act ?? 1) * 100 + v.room;
    if (v.phase === 'shop' && v.shop) {
      if (cfg.shop === 'cheapest' && lastShopRoom !== shopKey) {
        lastShopRoom = shopKey;
        // Cheapest first (ties: shelf order) while the wallet lasts.
        for (let guard = 0; guard < 8; guard++) {
          const sv = r.view();
          if (!sv.shop) break;
          let best = -1;
          let bestPrice = Infinity;
          sv.shop.stock.forEach((s, i) => {
            if (!s.sold && s.price <= sv.wallet && s.price < bestPrice) {
              bestPrice = s.price;
              best = i;
            }
          });
          if (best < 0) break;
          const bought = r.buy(best);
          if (!bought || bought.denied) break;
          stats.buys += 1;
        }
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
    // A desperate revive (most of the party down) holds through a hit it can
    // afford: dodging breaks the channel, and a revive is worth one slam.
    const upNow = partyAll().filter((m) => m.id !== player.id && m.hp > 0).length;
    const holdFloor = cfg.leader ? DESPERATE_HOLD : LONE_HOLD;
    const holdChannel = player.reviveTargetId != null && upNow <= 1 && player.hp > player.maxHp * holdFloor;
    if (inside && !holdChannel && inside.zn.left <= DODGE_LEAD_TICKS && tick >= player.dodgeReadyTick && !(player.dashTicksLeft > 0)) {
      s.move = inside.esc;
      s.presses.push({ kind: 'dodge' });
      stats.dodges += 1;
      return s;
    }

    // 2. Revive a Downed ally when nothing hostile is on it — or, once most
    // of the party is down, whenever the Healer can afford to take a hit or
    // two (a channel is NOT broken by damage, §10): a lone Healer cannot win
    // a room of guard-horned Rams with bolts, the revived party can.
    const downed = party.filter((m) => m.id !== player.id && !(m.hp > 0));
    // Stay on the body already being channelled (the nearest one can change
    // as the Downed crawl — switching would break a half-done channel).
    const chan = player.reviveTargetId != null ? downed.find((m) => m.id === player.reviveTargetId) : null;
    const body = chan ? { e: chan, d: Math.hypot(chan.x - player.x, chan.z - player.z) } : nearest(downed, player.x, player.z);
    const upAllies = party.filter((m) => m.id !== player.id && m.hp > 0).length;
    // Start a desperate channel only with HP to spare (heal first below it);
    // keep one going down to a lower floor (hysteresis — a started channel is
    // worth finishing, a restarted one costs 5 s again).
    const channelingNow = player.reviveTargetId != null;
    const startFloor = cfg.leader ? DESPERATE_START : LONE_START;
    const desperate = upAllies <= 1 && player.hp >= player.maxHp * (channelingNow ? holdFloor : startFloor);
    if (body && (!inside || desperate)) {
      const threat = nearest(foes, body.e.x, body.e.z);
      if (!threat || threat.d > REVIVE_SAFE_U || desperate) {
        // Hysteresis: approach to 0.45 u, then hold the channel while the
        // body stays inside the 0.6 u revive reach (§10) — any step would
        // break it (a crawling body drifts a hair between ticks).
        const channeling = player.reviveTargetId === body.e.id;
        if (body.d > (channeling ? 0.58 : 0.45)) s.move = norm(body.e.x - player.x, body.e.z - player.z);
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
    // Target: the nearest foe our bolts can actually hit; a guard-horned foe
    // facing us only when nothing else is in reach.
    let target = null;
    for (const f of foes.map((e) => ({ e, d: Math.hypot(e.x - player.x, e.z - player.z) })).sort((a, b) => a.d - b.d || a.e.id - b.e.id)) {
      if (f.d > BASIC_RANGE + 1) break;
      if (!guardedAgainst(f.e, player.x, player.z)) {
        target = f;
        break;
      }
    }
    const flank = !target && nearFoe && guardedAgainst(nearFoe.e, player.x, player.z) ? nearFoe : null;
    if (!target) target = nearFoe;
    // ROOM OBJECTIVES: the quarry, else the nearest nest, is the bot's job.
    let goal = null;
    for (const e of registry.all()) {
      if (!(e.hp > 0) || !e.hittable) continue;
      if (e.quarry && e.state === 'active') {
        goal = { e, d: Math.hypot(e.x - player.x, e.z - player.z) };
        break;
      }
      if (e.kind === 'nest') {
        const d = Math.hypot(e.x - player.x, e.z - player.z);
        if (!goal || d < goal.d) goal = { e, d };
      }
    }
    if (goal && goal.d <= BASIC_RANGE && !(target && target.d < 1.6)) target = goal;
    else if (goal && !target) target = goal;
    if (inside) s.move = inside.esc;
    else if (goal && goal.d > CHASE_U) s.move = norm(goal.e.x - player.x, goal.e.z - player.z);
    else if (flank) {
      // Circle the guarded foe at ~1.6 u: tangential speed 2.4 u/s at that
      // radius (~86°/s) plus the slam's lock is enough to slip off its horns.
      const rx = player.x - flank.e.x;
      const rz = player.z - flank.e.z;
      const r = Math.hypot(rx, rz) || 1;
      const side = flank.e.id % 2 === 0 ? 1 : -1;
      const tx = (-rz / r) * side;
      const tz = (rx / r) * side;
      const pull = Math.max(-1, Math.min(1, (1.6 - r) * 1.2));
      s.move = norm(tx + (rx / r) * pull, tz + (rz / r) * pull);
    } else if (Math.hypot(cx - player.x, cz - player.z) > FOLLOW_U) s.move = norm(cx - player.x, cz - player.z);
    else if (nearFoe && nearFoe.d < 1.4) s.move = norm(player.x - nearFoe.e.x, player.z - nearFoe.e.z);

    // 4. Casts. Heals go to members below the heal line (self included) that
    // they reach; an aimed heal (bolt, arc, zone) takes the aim only for an
    // ally it reaches (a heal bolt cannot land on its own caster). Whenever
    // the aim is free it goes to the target: damage skills + the basic attack.
    const view = skills.slotsView();
    const healBelow = cfg.leader ? LEADER_HEAL_BELOW : HEAL_BELOW;
    let aimHeals = false;
    const pressed = new Set();
    const press = (i) => {
      if (pressed.has(i)) return;
      pressed.add(i);
      s.presses.push({ kind: `skill_${i + 1}`, slot: i });
      stats.casts += 1;
    };
    const nSlots = Math.min(SKILL_SLOTS, view.length);
    {
      // Each ready heal goes out only if it reaches someone below the line
      // (70%, the leader seat 90%); an aimed heal (bolt, arc, zone) takes the aim for the
      // neediest ally it reaches, else the aim stays on the target.
      const distTo = (m) => Math.hypot(m.x - player.x, m.z - player.z);
      const hurt = party
        .filter((m) => m.hp > 0 && m.hp / m.maxHp < healBelow)
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.partyIndex - b.partyIndex);
      const selfHurt = hurt.some((m) => m.id === player.id);
      const reach = (def) => (def.shape === 'ground_aoe' ? def.range + def.area * 0.6 : def.range ?? BASIC_RANGE);
      const ready = [];
      for (let i = 0; i < nSlots; i++) {
        const sl = view[i];
        if (!sl || sl.passive || sl.remainingTicks > 0) continue;
        const def = SKILLS[sl.id];
        if (def.archetype === 'heal') ready.push({ i, def });
      }
      const aimed = ready.filter((h) => h.def.shape === 'projectile' || h.def.shape === 'melee_arc' || h.def.shape === 'ground_aoe');
      const aimAt = hurt.find((m) => m.id !== player.id && aimed.some((h) => distTo(m) <= reach(h.def))) ?? null;
      for (const { i, def } of ready) {
        let go;
        if (def.shape === 'direct') go = hurt.some((m) => m.id === player.id || distTo(m) <= def.range);
        else if (def.shape === 'nova') go = hurt.some((m) => distTo(m) <= def.area);
        else if (def.shape === 'melee_arc') go = selfHurt || (!!aimAt && distTo(aimAt) <= def.range);
        else go = !!aimAt && distTo(aimAt) <= reach(def);
        if (go) press(i);
      }
      aimHeals = !!aimAt;
      if (aimAt) s.aim = { x: aimAt.x, z: aimAt.z };
    }
    const healPresses = pressed.size;
    if (!aimHeals && target) {
      s.aim = { x: target.e.x, z: target.e.z };
      for (let i = 0; i < nSlots; i++) {
        const sl = view[i];
        if (!sl || sl.passive || sl.remainingTicks > 0) continue;
        const def = SKILLS[sl.id];
        if (def.archetype !== 'damage') continue;
        // Novas measure from us to the NEAREST foe; aimed shapes to the target.
        const reach = def.shape === 'nova' ? def.area + 0.3 : (def.range ?? BASIC_RANGE);
        if ((def.shape === 'nova' ? (nearFoe ? nearFoe.d : Infinity) : target.d) > reach) continue;
        press(i);
      }
      // 5. Basic attack the target in range (only while aimed at it).
      if (target.d <= BASIC_RANGE) s.basicAttackHeld = true;
    }
    // Leader: a ready damage skill the target is out of reach for goes to the
    // nearest foe it does reach (one aim per tick: the first such foe).
    if (cfg.leader && !aimHeals && foes.length > 0 && pressed.size === healPresses) {
      let alt = null;
      for (let i = 0; i < nSlots; i++) {
        const sl = view[i];
        if (!sl || sl.passive || sl.remainingTicks > 0 || pressed.has(i)) continue;
        const def = SKILLS[sl.id];
        if (def.archetype !== 'damage' || def.shape === 'nova') continue;
        const reach = def.range ?? BASIC_RANGE;
        const f = alt ? (Math.hypot(alt.x - player.x, alt.z - player.z) <= reach ? alt : null) : nearest(foes.filter((e) => Math.hypot(e.x - player.x, e.z - player.z) <= reach), player.x, player.z)?.e ?? null;
        if (!f) continue;
        alt = f;
        press(i);
      }
      if (alt && !(target && target.e === alt)) {
        s.aim = { x: alt.x, z: alt.z };
        s.basicAttackHeld = Math.hypot(alt.x - player.x, alt.z - player.z) <= BASIC_RANGE;
      }
    }
    return s;
  }

  function intents(tick, snap) {
    if (!cfg) return snap;
    stats.ticks += 1;
    const r = run();
    const v = r ? r.view() : null;
    // CLASS SELECT: `pages: false` (the leader bot under a human on another
    // seat) plays the Healer in combat only — the pages stay the human's.
    if (v && v.active && cfg.pages !== false && pages()) {
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

  // What the bot would do this tick in combat, WITHOUT acting on it or
  // touching the run pages — the real-input harness (tools/gntM4a-realrun.mjs)
  // turns this into actual keys and mouse moves, so a human-speed player can
  // be scripted without any sim call.
  function advise(tick) {
    const r = run();
    const v = r ? r.view() : null;
    if (!v || !v.active || v.phase !== 'combat') return null;
    const saved = { ...stats };
    const snap = combatIntents(tick, null);
    Object.assign(stats, saved);
    return snap;
  }

  return {
    configure,
    intents,
    advise,
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
