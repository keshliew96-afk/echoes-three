// The ally cast pipeline (docs/gauntlet/PLAN.md §16.3, BUILD_BRIEF §25.2).
// Owner: PARTY.
//
// ONE function delivers every ally class skill — an AI-held seat's cast
// (target-based), a human seat's press (aim-based, lag-compensated
// selection), an Echo recast (the recorded delivery, never a cast) and the
// Riposte / Parry counter — so the four characters share the Healer's build
// model:
//   1. def = seatBuild.resolveDef(baseDef)  (the §15.4 pipeline; an EMPTY
//      build returns baseDef itself, so an unbuilt ally casts exactly as the
//      v0.5.150 kit did: same events, same RNG draws — the ?room= goldens);
//   2. the cast-time mods (sim/partytech.js castMods: Resonance ×2, combo /
//      Momentum / Steady Aim pct, Lethality / Heartseeker / Execute /
//      Concussive / Anchor / Skewer / Scatter per instance);
//   3. the displacement (dash / vault / Pursuit before the delivery, the
//      Disengage hop after it) — swept like the §5 dodge; an AI seat's is
//      target-based and leash-capped, a human seat's is AIM-based and uses
//      the dodge machinery (dashVel / dashTicksLeft) so the guest predicts
//      it exactly like a dodge (seatDisplacement(), shared with
//      net/predict.js);
//   4. the §6 delivery with `source: def.id` on every instance;
//   5. `ally_cast` — byte-identical to v0.5.150 for an empty build; new keys
//      only when set (echo, resonance, combo, dash, vault, parry).
//
// Sim discipline: no DOM, no render imports, no wall clock; the only RNG is
// the combat pipeline's own crit roll per instance, in resolution order.
import { TICK_HZ } from '../core/constants.js';
import { clampPlacement, countFinal, fanDirections, selectDirect, createSkillBolts } from './shapes.js';
import { sweptStep } from './movement.js';
import { CLASS_TECH } from '../data/classes.js';

const r2 = (v) => Math.round(v * 100) / 100;
const secTicks = (s) => Math.round(s * TICK_HZ);
export const CD_FLOOR_TICKS = secTicks(0.5); // §6 cooldown floor
const ZONE_CADENCE_TICKS = secTicks(1.0); // §6 zone cadence 1.0 s, first tick at 1.0 s
const BOLT_RADIUS = 0.05;
const DASH_STOP_FRAC = 0.8; // a dash stops with its target inside 0.8 × the delivery's reach

export const cdTicksOf = (def) => Math.max(CD_FLOOR_TICKS, secTicks(def.cd ?? 0));
// §7 range test per delivery shape (nova: burst radius; the rest: reach /
// travel / placement range).
export const shapeRange = (def) => (def.shape === 'nova' || def.shape === 'aura' ? def.area : def.range);

function unit(dx, dz, fx = 0, fz = 1) {
  const l = Math.hypot(dx, dz);
  if (l > 1e-6) return { x: dx / l, z: dz / l };
  const fl = Math.hypot(fx, fz);
  return fl > 1e-6 ? { x: fx / fl, z: fz / fl } : { x: 0, z: 1 };
}

// ---------------------------------------------------------------------------
// seatDisplacement — the HUMAN-seat rule (BUILD_BRIEF §25.2, PLAN §16.5). A
// pure function of the seat's own input: its position, its aim point at the
// press, the resolved skill and the socketed techniques. Hostile positions
// never enter it, so the guest's predictor (net/predict.js) computes the SAME
// displacement from the same frame and never mispredicts it.
//   phase 'pre'  — Shoulder Charge / Fox Step dash, Pursuit, Vault Shot vault
//   phase 'post' — the Disengage hop (after a skill without a vault)
// Returns { vx, vz, ticks, iframes, cause } (u per tick) | null.
export function seatDisplacement(body, def, techs, aim, phase = 'pre') {
  const face = { x: body.faceX ?? 0, z: body.faceZ ?? 1 };
  const ax = aim ? aim.x - body.x : 0;
  const az = aim ? aim.z - body.z : 0;
  const toAim = unit(ax, az, face.x, face.z);
  const aimDist = Math.hypot(ax, az);
  const has = (id) => Array.isArray(techs) && techs.includes(id);
  if (phase === 'pre') {
    if (def.vault) {
      const dist = def.vault.dist + (has('disengage') ? CLASS_TECH.disengageVaultBonusU : 0);
      const ticks = Math.max(1, def.vault.ticks | 0);
      return { vx: (-toAim.x * dist) / ticks, vz: (-toAim.z * dist) / ticks, ticks, iframes: !!def.vault.iframes, cause: 'vault' };
    }
    let dash = null;
    if (def.dash) dash = { dist: def.dash.dist + (has('pursuit') ? CLASS_TECH.pursuitFoxBonusU : 0), speed: def.dash.speed, iframes: !!def.dash.iframes, cause: 'dash' };
    else if (has('pursuit') && !def.parry && (def.shape === 'melee_arc' || def.shape === 'nova'))
      dash = { dist: CLASS_TECH.pursuitDashU, speed: 10, iframes: true, cause: 'pursuit' }; // Fox Step's dash rules
    if (!dash) return null;
    const reach = shapeRange(def) || 0;
    const len = Math.min(dash.dist, Math.max(0, aimDist - DASH_STOP_FRAC * reach));
    if (!(len > 0.02)) return null;
    const perTick = dash.speed / TICK_HZ;
    const ticks = Math.max(1, Math.ceil(len / perTick));
    return { vx: (toAim.x * len) / ticks, vz: (toAim.z * len) / ticks, ticks, iframes: dash.iframes, cause: dash.cause };
  }
  if (phase === 'post' && has('disengage') && !def.vault && def.shape !== 'aura') {
    const ticks = CLASS_TECH.disengageTicks;
    const dist = CLASS_TECH.disengageU;
    return { vx: (-toAim.x * dist) / ticks, vz: (-toAim.z * dist) / ticks, ticks, iframes: true, cause: 'disengage' };
  }
  return null;
}

// ---------------------------------------------------------------------------
// ctx (from sim/allies.js): registry, events, combat, getTick, bolts,
// enemiesInArc, enemiesInNova, face, hostiles, party, rewound,
// compensatedAim, isIframed, leashAnchor, leashRadius, tech() (the party
// technique module), build(seat) (the seat build system).
export function createAllyCaster(ctx) {
  const { registry, events, combat, getTick, bolts, enemiesInArc, enemiesInNova, face, hostiles, party, rewound, compensatedAim, isIframed } = ctx;
  const tech = () => (typeof ctx.tech === 'function' ? ctx.tech() : null);
  const buildOf = (seat) => (typeof ctx.build === 'function' ? ctx.build(seat) : null);
  let castSeq = 0; // per-cast id (Heartseeker's first instance per target, Flow once per cast)

  // Scatter shards: a bolt spent at max range bursts (technique output).
  const scatterShards = createSkillBolts({
    registry,
    events,
    owner: 'scatter_shards',
    onImpact: (tick, bolt, target) => {
      const len = Math.hypot(bolt.vx, bolt.vz);
      const t = registry.byId(target.id);
      if (!t) return;
      const T = tech();
      const hit = () =>
        combat.applyDamage(t, bolt.power, {
          delivery: 'skill',
          shape: 'projectile',
          dirX: len > 1e-9 ? bolt.vx / len : 0,
          dirZ: len > 1e-9 ? bolt.vz / len : 0,
          attacker: bolt.sourceId,
          source: `${bolt.skill}:scatter`,
        });
      if (T) T.suppressed(bolt.seat ?? null, hit);
      else hit();
    },
  });

  // ---------------------------------------------------------- displacement --
  // AI seats: target-based, leash-capped. Returns the same shape as
  // seatDisplacement() or null.
  function aiDisplacement(a, def, techs, target, phase) {
    const has = (id) => Array.isArray(techs) && techs.includes(id);
    const anchor = typeof ctx.leashAnchor === 'function' ? ctx.leashAnchor() : null;
    const R = ctx.leashRadius ?? Infinity;
    const clampEnd = (ex, ez) => {
      if (!anchor) return { x: ex, z: ez };
      const dx = ex - anchor.x;
      const dz = ez - anchor.z;
      const d = Math.hypot(dx, dz);
      if (d <= R || d < 1e-6) return { x: ex, z: ez };
      const s = R / d;
      return { x: anchor.x + dx * s, z: anchor.z + dz * s };
    };
    const nearestHostile = (maxD = Infinity) => {
      let best = null;
      let bd = maxD * maxD;
      for (const e of hostiles()) {
        const d2 = (e.x - a.x) ** 2 + (e.z - a.z) ** 2;
        if (d2 < bd || (d2 === bd && best && e.id < best.id)) {
          bd = d2;
          best = e;
        }
      }
      return best;
    };
    const build = (dirx, dirz, dist, ticksOrSpeed, bySpeed, iframes, cause) => {
      const e = clampEnd(a.x + dirx * dist, a.z + dirz * dist);
      const len = Math.hypot(e.x - a.x, e.z - a.z);
      if (!(len > 0.02)) return null;
      const ticks = bySpeed ? Math.max(1, Math.ceil(len / (ticksOrSpeed / TICK_HZ))) : Math.max(1, ticksOrSpeed | 0);
      return { vx: (e.x - a.x) / ticks, vz: (e.z - a.z) / ticks, ticks, iframes, cause };
    };
    if (phase === 'pre') {
      if (def.vault) {
        const dist = def.vault.dist + (has('disengage') ? CLASS_TECH.disengageVaultBonusU : 0);
        const h = nearestHostile();
        const away = h ? unit(a.x - h.x, a.z - h.z, -(a.faceX ?? 0), -(a.faceZ ?? 1)) : unit(-(a.faceX ?? 0), -(a.faceZ ?? 1));
        return build(away.x, away.z, dist, def.vault.ticks, false, !!def.vault.iframes, 'vault');
      }
      let dash = null;
      if (def.dash) dash = { dist: def.dash.dist + (has('pursuit') ? CLASS_TECH.pursuitFoxBonusU : 0), speed: def.dash.speed, iframes: !!def.dash.iframes, cause: 'dash' };
      else if (has('pursuit') && !def.parry && (def.shape === 'melee_arc' || def.shape === 'nova'))
        dash = { dist: CLASS_TECH.pursuitDashU, speed: 10, iframes: true, cause: 'pursuit' };
      if (!dash || !target) return null;
      const d = Math.hypot(target.x - a.x, target.z - a.z);
      const reach = shapeRange(def) || 0;
      const len = Math.min(dash.dist, Math.max(0, d - DASH_STOP_FRAC * reach));
      const dir = unit(target.x - a.x, target.z - a.z, a.faceX ?? 0, a.faceZ ?? 1);
      return build(dir.x, dir.z, len, dash.speed, true, dash.iframes, dash.cause);
    }
    if (phase === 'post' && has('disengage') && !def.vault) {
      const h = nearestHostile(CLASS_TECH.disengageRangeU);
      if (!h) return null;
      const away = unit(a.x - h.x, a.z - h.z, -(a.faceX ?? 0), -(a.faceZ ?? 1));
      return build(away.x, away.z, CLASS_TECH.disengageU, CLASS_TECH.disengageTicks, false, true, 'disengage');
    }
    return null;
  }

  // Start a displacement on a body. Human seats ride the dodge machinery
  // (dashVel / dashTicksLeft, stepped per input frame by sim/remote.js — the
  // guest predicts it the same way); AI seats ride `skillDash`, stepped by
  // stepDashes() in the ally continuous phase.
  function startDisplacement(a, disp, def, tick, human, tag) {
    if (human) {
      a.dashVel = { x: disp.vx, z: disp.vz };
      a.dashTicksLeft = disp.ticks;
      a.dashIframes = !!disp.iframes;
      a.dashing = true;
      if (disp.iframes) a.iframeUntilTick = tick + 1;
    } else {
      a.skillDash = { vx: disp.vx, vz: disp.vz, ticksLeft: disp.ticks, iframes: !!disp.iframes };
      if (disp.iframes) a.iframeUntilTick = tick + 1;
    }
    const x1 = a.x + disp.vx * disp.ticks;
    const z1 = a.z + disp.vz * disp.ticks;
    events.emit(tick, 'ally_dash', {
      seat: a.partyIndex,
      id: a.id,
      skill: def.id,
      x0: r2(a.x),
      z0: r2(a.z),
      x1: r2(x1),
      z1: r2(z1),
      ticks: disp.ticks,
      cause: disp.cause,
      ...(tag || {}),
    });
  }

  // AI continuous phase: advance every AI skill dash one swept step. A wall
  // ends it. Returns true when this body is mid-displacement (steering
  // suspended this tick).
  function stepDash(a, tick) {
    const sd = a.skillDash;
    if (!sd) return false;
    if (sd.ticksLeft > 0) {
      const { hit } = sweptStep(a, sd.vx, sd.vz, a.radius);
      sd.ticksLeft -= 1;
      if (hit) sd.ticksLeft = 0;
      if (sd.iframes) a.iframeUntilTick = tick + 1;
      a.moving = true;
      const l = Math.hypot(sd.vx, sd.vz);
      if (l > 1e-6 && !a.pendingCast) face(a, sd.vx, sd.vz);
    }
    if (sd.ticksLeft <= 0) a.skillDash = null;
    return true;
  }
  const displacing = (a) => !!(a.skillDash && a.skillDash.ticksLeft > 0) || (a.dashTicksLeft > 0 && a.dashIframes !== undefined);

  // --------------------------------------------------------------- casting --
  // cast(a, baseDef, slot, tick, how) — a PRIMARY cast.
  //   how.mode 'ai':    { target }          (the AI's chosen target)
  //   how.mode 'human': { f, tag, d }       (the seat's input frame + aim dir)
  // Starts the cooldown; either delivers now, or starts the pre-delivery
  // displacement and delivers when it ends (runPending()).
  function cast(a, baseDef, slot, tick, how) {
    const seat = a.partyIndex;
    const build = buildOf(seat);
    const def = build ? build.resolveDef(baseDef) : baseDef;
    const T = tech();
    const techs = build ? build.tech.liveTechs(baseDef.id) : [];
    const human = how.mode === 'human';
    const aim = human ? (how.f && how.f.aim ? { x: how.f.aim.x, z: how.f.aim.z } : { x: a.x + how.d.x, z: a.z + how.d.z }) : null;
    // Riposte: the cast IS the parry window (the counter delivers later).
    if (def.parry) {
      if (T) T.openParry(a, def, slot, tick, { rec: null, tag: how.tag ?? null, primary: true, cast: true, human });
      return true;
    }
    const disp = human ? seatDisplacement(a, def, techs, aim, 'pre') : aiDisplacement(a, def, techs, how.target, 'pre');
    if (disp) {
      a.pendingCast = {
        slot,
        skill: baseDef.id,
        targetId: human ? null : how.target ? how.target.id : null,
        aim: aim ? { x: aim.x, z: aim.z } : null,
        tag: how.tag ?? null,
        dispCause: disp.cause,
        viewTick: human && how.f ? how.f.viewTick ?? null : null,
      };
      startDisplacement(a, disp, def, tick, human, how.tag);
      return true;
    }
    deliverPrimary(a, baseDef, def, slot, tick, how, null);
    return true;
  }

  // The deferred delivery of a displaced cast (AI: once the dash ended; human:
  // once dashTicksLeft reached 0). Called from the seat's discrete slot.
  function runPending(a, tick, how = null) {
    const p = a.pendingCast;
    if (!p) return false;
    if (displacing(a)) return false;
    a.pendingCast = null;
    const baseDef = ctx.skillDef(p.skill);
    if (!baseDef) return false;
    const build = buildOf(a.partyIndex);
    const def = build ? build.resolveDef(baseDef) : baseDef;
    if (!(a.hp > 0)) return false;
    let h;
    if (p.aim) {
      const d = unit(p.aim.x - a.x, p.aim.z - a.z, a.faceX ?? 0, a.faceZ ?? 1);
      h = { mode: 'human', f: how && how.f ? how.f : { aim: p.aim, viewTick: p.viewTick }, tag: p.tag, d };
    } else {
      let target = p.targetId != null ? registry.byId(p.targetId) : null;
      if (!target || !(target.hp > 0)) target = registry.byId(a.targetId) || null;
      h = { mode: 'ai', target: target && target.hp > 0 ? target : null };
      if (!h.target) {
        // The target died mid-dash: the delivery swings at the facing.
        h = { mode: 'ai', target: null, facing: { x: a.faceX ?? 0, z: a.faceZ ?? 1 } };
      }
    }
    deliverPrimary(a, baseDef, def, p.slot, tick, h, p.dispCause);
    return true;
  }

  function deliverPrimary(a, baseDef, def, slot, tick, how, dispCause) {
    const seat = a.partyIndex;
    const T = tech();
    const castId = (castSeq += 1);
    const M = T ? T.castMods(a, baseDef, def, tick, { echo: false }) : null;
    const power = M && M.power !== undefined ? M.power : def.power;
    const human = how.mode === 'human';
    let d;
    if (human) d = how.d;
    else if (how.target) d = unit(how.target.x - a.x, how.target.z - a.z);
    else d = unit(how.facing ? how.facing.x : a.faceX ?? 0, how.facing ? how.facing.z : a.faceZ ?? 1);
    const extra = {};
    if (M && M.resonance) extra.resonance = true;
    if (M && M.combo) extra.combo = M.combo;
    if (dispCause === 'dash' || dispCause === 'pursuit') extra.dash = true;
    if (dispCause === 'vault') extra.vault = true;
    const cast = deliver(a, def, power, {
      slot,
      tick,
      human,
      target: human ? null : how.target,
      f: how.f ?? null,
      tag: how.tag ?? null,
      d,
      echo: null,
      castId,
      M,
      extra,
    });
    if (T) T.afterCast(a, baseDef, def, { slot, tick, cast, castId, human, aim: human && how.f ? how.f.aim : null, target: human ? null : how.target, tag: how.tag ?? null, M });
    return cast;
  }

  // An Echo recast (sim/nodes.js echoCast): the recorded DELIVERY at `power`
  // — never the dash / vault, never a parry window, never a cast (no combo /
  // Momentum / Flow / Resonance).
  function echo(seat, rec, def, power) {
    const a = party().find((m) => m.partyIndex === seat);
    if (!a || !(a.hp > 0)) return null;
    const T = tech();
    const c = rec.cast || {};
    const castId = (castSeq += 1);
    const M = T ? T.castMods(a, def, def, getTick(), { echo: true }) : null;
    const d = unit(c.dx ?? a.faceX ?? 0, c.dz ?? a.faceZ ?? 1);
    const target = c.target != null ? registry.byId(c.target) : null;
    return deliver(a, def, power, {
      slot: c.slot ?? -1,
      tick: getTick(),
      human: false,
      target: target && target.hp > 0 ? target : null,
      f: null,
      tag: null,
      d,
      echo: c,
      castId,
      M,
      extra: { echo: true },
    });
  }

  // The Riposte / Parry-node counter (sim/partytech.js onParry): one arc
  // toward the attacker. Riposte: its full arc at resolved power; the Parry
  // node: ONE melee_arc instance at 50% on the attacker.
  function counter(a, def, attacker, { single = false, frac = 1, tag = null } = {}) {
    const tick = getTick();
    const T = tech();
    const castId = (castSeq += 1);
    const d = unit(attacker.x - a.x, attacker.z - a.z, a.faceX ?? 0, a.faceZ ?? 1);
    face(a, d.x, d.z);
    a.castLeftTicks = Math.max(a.castLeftTicks ?? 0, 24);
    const M = T ? T.castMods(a, def, def, tick, { echo: true, counter: true }) : null;
    const power = (M && M.power !== undefined ? M.power : def.power) * frac;
    if (single) {
      events.emit(tick, 'parry_counter', { seat: a.partyIndex, id: a.id, skill: def.id, attackerId: attacker.id, single: true, x: r2(a.x), z: r2(a.z), dx: r2(d.x), dz: r2(d.z) });
      hitList(a, def, power, [attacker], 'melee_arc', M, castId, false, `${def.id}:parry`);
      return;
    }
    events.emit(tick, 'parry_counter', { seat: a.partyIndex, id: a.id, skill: def.id, attackerId: attacker.id, x: r2(a.x), z: r2(a.z), dx: r2(d.x), dz: r2(d.z) });
    return deliver(a, { ...def, parry: undefined }, power, { slot: -1, tick, human: false, target: attacker, f: null, tag, d, echo: null, castId, M, extra: { counter: true } });
  }

  // --------------------------------------------------------------- delivery --
  // One damage instance per target (arc / nova / counter), then the skill's
  // own status on the hostiles hit. `srcLabel` overrides the source (a
  // technique counter).
  function hitList(a, def, power, targets, shape, M, castId, echoFlag, srcLabel = null) {
    const T = tech();
    const seat = a.partyIndex;
    for (const t of targets) {
      if (!registry.byId(t.id) || !(t.hp > 0)) continue;
      const tl = Math.hypot(t.x - a.x, t.z - a.z) || 1;
      const opts = { delivery: 'skill', shape, dirX: (t.x - a.x) / tl, dirZ: (t.z - a.z) / tl, attacker: a.id, source: srcLabel ?? def.id };
      if (def.critBonus) opts.critBonus = def.critBonus;
      let p = power;
      if (M) {
        if (M.critMul) opts.critMul = M.critMul;
        if (M.kbScale !== undefined) opts.kbScale = M.kbScale;
        if (M.kbDist !== undefined) opts.kbDist = M.kbDist;
        if (M.execute && t.faction === 'hostile' && t.hp <= t.maxHp * CLASS_TECH.executeFrac) p *= CLASS_TECH.executeMul;
        if (M.heartseeker && T && T.firstHit(castId, t.id)) opts.forceCrit = true;
      }
      if (T && !srcLabel) T.instance({ seat, castId, echo: echoFlag, skill: def.id }, () => combat.applyDamage(t, p, opts));
      else if (T && srcLabel) T.suppressed(seat, () => combat.applyDamage(t, p, opts));
      else combat.applyDamage(t, p, opts);
    }
    applySkillStatus(a, def, targets);
  }

  function applySkillStatus(a, def, targets) {
    const st = def.status;
    if (!st || def.archetype === 'guard') return;
    const S = combat.status;
    if (!S) return;
    const tick = getTick();
    for (const t of targets) {
      if (!t || !(t.hp > 0) || t.faction !== 'hostile') continue;
      if (st.kind === 'taunt') {
        const T = tech();
        if (T && !T.mayTaunt(a, t)) continue;
      }
      S.apply(t, st.kind, st.mag, st.ticks, tick, a.id);
    }
  }

  // deliver(a, def, power, c) — the §6 delivery of one cast. c = { slot,
  // tick, human, target, f, tag, d, echo (the recorded cast | null), castId,
  // M, extra }. Returns the emitted cast payload.
  function deliver(a, def, power, c) {
    const { tick, human, target, f, tag, echo, castId, M, extra } = c;
    let d = c.d;
    const seat = a.partyIndex;
    const T = tech();
    face(a, d.x, d.z);
    a.castLeftTicks = Math.max(a.castLeftTicks ?? 0, 24);
    const cast = {
      id: a.id,
      partyIndex: a.partyIndex,
      classId: a.classId,
      skill: def.id,
      slot: c.slot,
      shape: def.shape,
      power: power === def.power ? def.power : r2(power),
      cd: def.cd,
      target: target ? target.id : null,
      x: r2(a.x),
      z: r2(a.z),
      dx: r2(d.x),
      dz: r2(d.z),
      ...(tag || {}),
    };
    const sel = (fn) => (human && f && typeof rewound === 'function' ? rewound(f, fn) : fn());

    // --- guard (Shield Wall): shields on the neediest party members.
    if (def.archetype === 'guard') {
      let recips;
      if (echo && Array.isArray(echo.targets)) recips = echo.targets.map((id) => registry.byId(id)).filter((m) => m && m.hp > 0);
      else recips = selectDirect({ caster: a, party: party(), range: def.range, count: def.count, isIframed }).targets;
      cast.targets = recips.map((m) => m.id);
      Object.assign(cast, extra);
      events.emit(tick, 'ally_cast', cast);
      const S = combat.status;
      const ticks = def.status ? def.status.ticks : 240;
      for (const m of recips) {
        if (!S) break;
        const rec = S.apply(m, 'shield', power, ticks, tick, a.id);
        if (rec) rec.skill = def.id;
      }
      if (T) T.guardApplied(a, def, recips, power, { echo: !!echo, castId });
      return cast;
    }

    if (def.shape === 'melee_arc') {
      const targets = sel(() => enemiesInArc(a, d.x, d.z, def.range, def.area, def.count));
      cast.reach = def.range;
      cast.halfAngle = def.area;
      cast.targets = targets.map((t) => t.id);
      Object.assign(cast, extra);
      events.emit(tick, 'ally_cast', cast);
      hitList(a, def, power, targets, def.shape, M, castId, !!echo);
      return cast;
    }

    if (def.shape === 'nova') {
      const targets = sel(() => enemiesInNova(a, def.area, def.count));
      cast.radius = def.area;
      cast.targets = targets.map((t) => t.id);
      Object.assign(cast, extra);
      events.emit(tick, 'ally_cast', cast);
      hitList(a, def, power, targets, def.shape, M, castId, !!echo);
      return cast;
    }

    if (def.shape === 'projectile') {
      if (human && f && !echo) {
        d = compensatedAim(f, a, d);
        cast.dx = r2(d.x);
        cast.dz = r2(d.z);
      }
      cast.count = countFinal(def.count);
      Object.assign(cast, extra);
      events.emit(tick, 'ally_cast', cast);
      const mods = boltMods(def, M, castId, !!echo);
      for (const fd of fanDirections(d.x, d.z, def.count)) {
        const spec = {
          x: a.x,
          z: a.z,
          dirX: fd.x,
          dirZ: fd.z,
          speed: def.speed,
          range: def.range,
          radius: BOLT_RADIUS,
          power,
          skill: def.id,
          heal: false,
          sourceId: a.id,
        };
        const pierce = (def.pierce ?? 1) + (M && M.pierceAdd ? M.pierceAdd : 0);
        if (pierce > 1) spec.hits = pierce;
        if (mods) spec.mods = mods;
        bolts.spawn(tick, spec);
      }
      return cast;
    }

    // ground_aoe — AI: at the target; human: at the aim point; echo: the
    // recorded placement. Clamped to the (resolved) placement range.
    let pos;
    if (echo && Number.isFinite(echo.zx)) pos = { x: echo.zx, z: echo.zz };
    else if (human) pos = clampPlacement(a, f && f.aim ? { x: f.aim.x, z: f.aim.z } : { x: a.x + d.x, z: a.z + d.z }, def.range);
    else if (target) pos = clampPlacement(a, { x: target.x, z: target.z }, def.range);
    else pos = clampPlacement(a, { x: a.x + d.x * def.range, z: a.z + d.z * def.range }, def.range);
    const totalTicks = Math.round(secTicks(def.durationSec) / ZONE_CADENCE_TICKS);
    const spots = M && M.scatter ? scatterSpots(pos, d) : [{ x: pos.x, z: pos.z }];
    const frac = M && M.scatter ? CLASS_TECH.scatterZoneFrac : 1;
    const zones = [];
    for (const s of spots) {
      const spec = {
        kind: 'azone',
        skill: def.id,
        classId: a.classId,
        x: s.x,
        z: s.z,
        px: s.x,
        pz: s.z,
        radius: def.area * frac,
        power: power * frac,
        sourceId: a.id,
        ticksDone: 0,
        totalTicks,
        nextTickTick: tick + ZONE_CADENCE_TICKS, // §6: first tick 1.0 s after placement
      };
      const zm = boltMods(def, M, castId, !!echo);
      if (zm) spec.mods = zm;
      if (def.status) spec.applies = { kind: def.status.kind, mag: def.status.mag, ticks: def.status.ticks };
      zones.push(registry.spawn(spec));
    }
    const z0 = zones[0];
    cast.zone = z0.id;
    cast.zx = r2(pos.x);
    cast.zz = r2(pos.z);
    cast.radius = def.area;
    Object.assign(cast, extra);
    if (zones.length > 1) cast.zones = zones.map((z) => z.id);
    events.emit(tick, 'ally_cast', cast);
    for (const z of zones) {
      events.emit(tick, 'azone_spawn', {
        id: z.id,
        skill: def.id,
        classId: a.classId,
        x: r2(z.x),
        z: r2(z.z),
        radius: z.radius,
        totalTicks: z.totalTicks,
        ...(tag || {}),
      });
    }
    return cast;
  }

  // 3 zones in a triangle 0.8 u around the aim point, one toward the aim.
  function scatterSpots(pos, d) {
    const base = Math.atan2(d.z, d.x);
    const out = [];
    for (let i = 0; i < 3; i++) {
      const ang = base + (i * 2 * Math.PI) / 3;
      out.push({ x: pos.x + Math.cos(ang) * CLASS_TECH.scatterOffsetU, z: pos.z + Math.sin(ang) * CLASS_TECH.scatterOffsetU });
    }
    return out;
  }

  // The per-instance modifiers a bolt / zone carries (plain data; null when
  // nothing is set, so an unbuilt ally's bolt is the v0.5.150 object).
  function boltMods(def, M, castId, echoFlag) {
    const m = {};
    let any = false;
    const put = (k, v) => {
      m[k] = v;
      any = true;
    };
    if (def.status && def.shape === 'projectile') put('applies', { kind: def.status.kind, mag: def.status.mag, ticks: def.status.ticks });
    if (M) {
      if (M.critMul) put('critMul', M.critMul);
      if (M.kbScale !== undefined) put('kbScale', M.kbScale);
      if (M.kbDist !== undefined) put('kbDist', M.kbDist);
      if (M.execute) put('execute', true);
      if (M.heartseeker) put('heartseeker', true);
      if (M.scatter && def.shape === 'projectile') put('scatter', true);
    }
    if (def.critBonus) put('critBonus', def.critBonus);
    if (!any) return null;
    put('castId', castId);
    if (echoFlag) put('echo', true);
    return m;
  }

  // Ally kit bolt impact with modifiers (sim/allies.js routes a bolt that
  // carries `mods` here; a plain bolt keeps the v0.5.150 path).
  function boltImpact(tick, bolt, t) {
    const m = bolt.mods || {};
    const len = Math.hypot(bolt.vx, bolt.vz);
    const opts = {
      delivery: 'skill',
      shape: 'projectile',
      dirX: len > 1e-9 ? bolt.vx / len : 0,
      dirZ: len > 1e-9 ? bolt.vz / len : 0,
      attacker: bolt.sourceId,
      source: bolt.skill,
    };
    if (m.critBonus) opts.critBonus = m.critBonus;
    if (m.critMul) opts.critMul = m.critMul;
    if (m.kbScale !== undefined) opts.kbScale = m.kbScale;
    if (m.kbDist !== undefined) opts.kbDist = m.kbDist;
    let p = bolt.power;
    if (m.execute && t.faction === 'hostile' && t.hp <= t.maxHp * CLASS_TECH.executeFrac) p *= CLASS_TECH.executeMul;
    const T = tech();
    const src = registry.byId(bolt.sourceId);
    const seat = src ? src.partyIndex : null;
    if (m.heartseeker && T && T.firstHit(m.castId, t.id)) opts.forceCrit = true;
    const r = T ? T.instance({ seat, castId: m.castId ?? -1, echo: !!m.echo, skill: bolt.skill }, () => combat.applyDamage(t, p, opts)) : combat.applyDamage(t, p, opts);
    if (m.applies && t.hp > 0 && t.faction === 'hostile' && combat.status) combat.status.apply(t, m.applies.kind, m.applies.mag, m.applies.ticks, tick, bolt.sourceId);
    return r;
  }

  // A spent ally bolt (max range, no hit) with Scatter bursts into 3 shards.
  function boltExpire(tick, bolt) {
    const m = bolt.mods;
    if (!m || !m.scatter) return;
    const base = Math.atan2(bolt.vz, bolt.vx);
    const src = registry.byId(bolt.sourceId);
    const shards = [];
    for (const k of [-1, 0, 1]) {
      const ang = base + (k * CLASS_TECH.scatterShardDeg * Math.PI) / 180;
      const b = scatterShards.spawn(tick, {
        x: bolt.x,
        z: bolt.z,
        dirX: Math.cos(ang),
        dirZ: Math.sin(ang),
        speed: Math.hypot(bolt.vx, bolt.vz) * TICK_HZ,
        range: CLASS_TECH.scatterShardRangeU,
        radius: BOLT_RADIUS,
        power: bolt.power * CLASS_TECH.scatterShardFrac,
        skill: bolt.skill,
        heal: false,
        sourceId: bolt.sourceId,
        tech: 'scatter',
      });
      b.seat = src ? src.partyIndex : null;
      shards.push(b.id);
    }
    events.emit(tick, 'scatter_burst', { seat: src ? src.partyIndex : null, skill: bolt.skill, shards, x: r2(bolt.x), z: r2(bolt.z) });
  }

  // Ally zone tick instance with modifiers (sim/allies.js zonePhase).
  function zoneHit(z, t, opts) {
    const m = z.mods || {};
    if (m.critBonus) opts.critBonus = m.critBonus;
    if (m.critMul) opts.critMul = m.critMul;
    if (m.kbScale !== undefined) opts.kbScale = m.kbScale;
    if (m.kbDist !== undefined) opts.kbDist = m.kbDist;
    let p = z.power;
    if (m.execute && t.faction === 'hostile' && t.hp <= t.maxHp * CLASS_TECH.executeFrac) p *= CLASS_TECH.executeMul;
    const T = tech();
    const src = registry.byId(z.sourceId);
    const seat = src ? src.partyIndex : null;
    if (m.heartseeker && T && T.firstHit(m.castId, t.id)) opts.forceCrit = true;
    const r = T ? T.instance({ seat, castId: m.castId ?? -1, echo: !!m.echo, skill: z.skill, zone: z.id }, () => combat.applyDamage(t, p, opts)) : combat.applyDamage(t, p, opts);
    if (z.applies && t.hp > 0 && t.faction === 'hostile' && combat.status) combat.status.apply(t, z.applies.kind, z.applies.mag, z.applies.ticks, getTick(), z.sourceId);
    return r;
  }

  return {
    // Save (PLAN §16.6): the per-cast id counter (bolt / zone mods key on it).
    getSeq: () => castSeq,
    setSeq: (n) => {
      castSeq = Number.isFinite(n) ? n : 0;
    },
    cast,
    runPending,
    stepDash,
    displacing,
    echo,
    counter,
    deliver,
    boltImpact,
    boltExpire,
    zoneHit,
    scatterShards,
    startDisplacement,
    aiDisplacement,
    cdTicksOf,
  };
}
