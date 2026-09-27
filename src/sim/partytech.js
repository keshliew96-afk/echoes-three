// Party techniques — what a node DOES on a class skill (BUILD_BRIEF §25.3,
// PLAN §16.3). Owner: PARTY.
//
// The seat builds (sim/nodes.js createBuildSystem, seats 1-3) own sockets,
// bench, the §15.4 resolver, verdicts, Resonance counters and the Echo queue.
// THIS module is their technique listener and the cast-time half:
//   - castMods()   the cast's power (Sharpen / Ascend already in the resolved
//                  def; combo, Momentum and Steady Aim join the additive-pct
//                  stage; Resonance ×2 multiplies) + the per-instance flags
//                  (Lethality critMul, Heartseeker forced crit, Execute,
//                  Concussive / Anchor knockback, Skewer pierce, Scatter);
//   - afterCast()  Brace shields, the Retaliate window, the Aegis ward, the
//                  Parry node window, the Disengage hop, Echo arming, the
//                  Momentum / Flow memory;
//   - the '*' listener on PRIMARY instances of each seat's class skills (an
//                  instance context set by sim/allycast.js tells a real cast
//                  from an echo): Bounce / Siphon / Snare / Galvanize /
//                  Bulwark / Split / Detonate (the shared primitives, acting
//                  for the ally), Provoke taunts, Tremor stuns, Flow cooldown
//                  cuts, the Swordsman's combo memory;
//   - passive pulses (aura_pulse { seat }) and guard recipients;
//   - the combat hooks: the parry block (Riposte / Parry node counter) and
//                  Retaliate thorns.
// Technique output never triggers techniques (depth-1): every output runs
// inside the seat build's suppression and carries a ':'-labelled source.
//
// Sim discipline: no DOM, no render imports, no wall clock, no RNG of its own
// (crit rolls come from the combat pipeline; Retaliate thorns draw none).
import { KNOCKBACK, TICK_HZ } from '../core/constants.js';
import { SKILLS } from './skills.js';
import { NODES, TECH } from './nodes.js';
import { CLASS_TECH, CLASS_OF_SEAT } from '../data/classes.js';

const r2 = (v) => Math.round(v * 100) / 100;
const secTicks = (s) => Math.round(s * TICK_HZ);
const CD_FLOOR_TICKS = secTicks(0.5);

// §15.4 power stages of a skill's socketed stat nodes (flat / pct / mult).
function powerStages(build, skillId) {
  const v = build.view().skills.find((s) => s.id === skillId);
  const out = { flat: 0, pct: 0, mult: 1 };
  if (!v) return out;
  for (const rec of v.sockets) {
    if (!rec || rec.verdict !== 'live') continue;
    const n = NODES[rec.node];
    if (!n || n.kind !== 'stat' || n.stat !== 'power') continue;
    if (n.op === 'additive_flat') out.flat += n.value;
    else if (n.op === 'additive_pct') out.pct += n.value;
    else if (n.op === 'multiplicative') out.mult *= n.value;
  }
  return out;
}

// ctx: registry, events, combat, getTick, queueContinuation, build(seat),
// state(seat) (combo / recentCasts / retaliate / stillSince), body(seat),
// caster() (sim/allycast.js).
export function createPartyTech(ctx) {
  const { registry, events, combat, getTick, queueContinuation } = ctx;
  const buildOf = (seat) => ctx.build(seat);
  const stateOf = (seat) => ctx.state(seat);
  const bodyOf = (seat) => ctx.body(seat);
  const caster = () => ctx.caster();
  const S = () => combat.status;
  const hostiles = () => registry.all().filter((e) => e.faction === 'hostile' && e.hittable && e.hp > 0);
  const party = () =>
    registry
      .all()
      .filter((e) => e.partyIndex !== undefined)
      .sort((a, b) => a.partyIndex - b.partyIndex);
  const seatOfSkill = (id) => {
    const d = SKILLS[id];
    if (!d || !d.cls || d.cls === 'healer') return null;
    const i = CLASS_OF_SEAT.indexOf(d.cls);
    return i > 0 ? i : null;
  };
  const techsOf = (seat, skillId) => {
    const b = buildOf(seat);
    return b ? b.tech.liveTechs(skillId) : [];
  };
  const copiesOf = (seat, skillId, nodeId) => techsOf(seat, skillId).filter((t) => t === nodeId).length;

  // --------------------------------------------------- instance context --
  let cur = null; // { seat, castId, echo, skill, zone? } while an ally skill instance resolves
  function instance(c, fn) {
    const prev = cur;
    cur = c;
    try {
      return fn();
    } finally {
      cur = prev;
    }
  }
  function suppressed(seat, fn) {
    const b = seat !== null && seat !== undefined ? buildOf(seat) : null;
    if (!b) return fn();
    return b.tech.withSuppress(fn);
  }
  // Heartseeker: the first instance of each cast on each target.
  const firstHits = new Map(); // castId -> Set(targetId) (pruned per tick)
  let firstTick = -1;
  function firstHit(castId, targetId) {
    const tick = getTick();
    if (tick !== firstTick && firstHits.size > 64) {
      // Keep only recent casts (a bolt / zone may land seconds after its cast).
      const keys = [...firstHits.keys()].sort((a, b) => a - b);
      for (const k of keys.slice(0, keys.length - 64)) firstHits.delete(k);
    }
    firstTick = tick;
    let s = firstHits.get(castId);
    if (!s) {
      s = new Set();
      firstHits.set(castId, s);
    }
    if (s.has(targetId)) return false;
    s.add(targetId);
    return true;
  }

  // §25.8 sensible targets: Taunting Roar / Provoke skip the Stag while the
  // Tank is below 30% HP.
  function mayTaunt(a, t) {
    if (!(t.kind === 'stag' || t.boss === true)) return true;
    return !(a.hp < a.maxHp * 0.3);
  }
  function taunt(a, t, ticks) {
    if (!t || !(t.hp > 0) || t.faction !== 'hostile' || !mayTaunt(a, t)) return null;
    return S().apply(t, 'taunt', 1, ticks, getTick(), a.id);
  }

  // ------------------------------------------------------------ cast mods --
  // M = { power, resonance?, combo?, critMul?, heartseeker?, execute?,
  //       kbScale?, kbDist?, pierceAdd?, scatter? } — null for an unbuilt
  // skill with no base mechanic (the v0.5.150 path).
  function castMods(a, baseDef, def, tick, { echo = false, counter = false } = {}) {
    const seat = a.partyIndex;
    const b = buildOf(seat);
    const st = stateOf(seat);
    const techs = b ? b.tech.liveTechs(baseDef.id) : [];
    const has = (id) => techs.includes(id);
    let pctCast = 0;
    let combo = 0;
    // combo (Crescent Finisher): OTHER skills that connected in 120 ticks.
    if (def.combo && st && !echo) {
      for (const [sid, t] of Object.entries(st.combo || {})) {
        if (sid === baseDef.id) continue;
        if (tick - t <= def.combo.windowTicks) combo += 1;
      }
      combo = Math.min(def.combo.maxStacks, combo);
      pctCast += combo * def.combo.perStack;
    }
    if (has('momentum') && st && !echo) {
      const distinct = new Set(
        (st.recentCasts || []).filter((r) => r.skill !== baseDef.id && tick - r.tick <= CLASS_TECH.recentWindowTicks).map((r) => r.skill)
      );
      pctCast += Math.min(CLASS_TECH.momentumMax, distinct.size * CLASS_TECH.momentumPct);
    }
    if (has('steady_aim') && st && tick - (st.stillSince ?? tick) >= CLASS_TECH.steadyAimStillTicks) pctCast += CLASS_TECH.steadyAimPct;
    let resonance = false;
    let resMul = 1;
    if (!echo && !counter && b && has('resonance')) {
      const r = b.castMods(baseDef.id);
      if (r && r.resonance) {
        resonance = true;
        resMul = r.powerMul;
      }
    }
    const flags = {};
    if (has('lethality')) flags.critMul = CLASS_TECH.lethalityCritMul;
    if (has('heartseeker')) flags.heartseeker = true;
    if (has('execute')) flags.execute = true;
    if (has('concussive')) flags.kbScale = CLASS_TECH.concussiveKb;
    if (has('anchor') && (def.shape === 'melee_arc' || def.shape === 'nova' || def.shape === 'ground_aoe')) flags.kbDist = -CLASS_TECH.anchorPullU;
    if (baseDef.knockback === 0) flags.kbScale = 0;
    const sk = techs.filter((t) => t === 'skewer').length;
    if (sk && def.shape === 'projectile') flags.pierceAdd = sk * CLASS_TECH.skewerPierce;
    if (has('scatter') && (def.shape === 'projectile' || def.shape === 'ground_aoe')) flags.scatter = true;
    const anyFlag = Object.keys(flags).length > 0;
    if (pctCast === 0 && !resonance && !anyFlag && !combo) return null;
    let power = def.power;
    if (pctCast !== 0 || resMul !== 1) {
      const ps = b ? powerStages(b, baseDef.id) : { flat: 0, pct: 0, mult: 1 };
      power = (baseDef.power + ps.flat) * Math.max(0, 1 + ps.pct + pctCast) * ps.mult * resMul;
    }
    const M = { power, ...flags };
    if (resonance) M.resonance = true;
    if (combo) M.combo = combo;
    return M;
  }

  // ----------------------------------------------------------- after cast --
  function afterCast(a, baseDef, def, info) {
    const seat = a.partyIndex;
    const tick = info.tick;
    const b = buildOf(seat);
    const st = stateOf(seat);
    const techs = b ? b.tech.liveTechs(baseDef.id) : [];
    const has = (id) => techs.includes(id);
    if (st) {
      st.recentCasts = (st.recentCasts || []).filter((r) => tick - r.tick <= CLASS_TECH.recentWindowTicks);
      st.recentCasts.push({ skill: baseDef.id, tick });
      if (st.recentCasts.length > 8) st.recentCasts.splice(0, st.recentCasts.length - 8);
    }
    if (techs.length === 0) return;
    // Echo arms on the real cast (ally_cast): the recorded delivery.
    if (has('echo') && b) {
      const c = info.cast || {};
      b.tech.armEcho(baseDef.id, { slot: c.slot, dx: c.dx, dz: c.dz, targets: c.targets ? [...c.targets] : null, target: c.target ?? null, zx: c.zx, zz: c.zz }, tick + TECH.echoDelayTicks);
    }
    b.tech.withSuppress(() => {
      const brace = copiesOf(seat, baseDef.id, 'brace');
      if (brace > 0) {
        const tank = bodyOf(1);
        if (tank && tank.hp > 0) {
          const rec = S().addShield(tank, CLASS_TECH.braceShield * brace, Infinity, CLASS_TECH.braceTicks, tick, a.id);
          if (rec) events.emit(tick, 'technique_pulse', { seat, skill: baseDef.id, node: 'brace', targets: [tank.id], shield: r2(rec.mag) });
        }
      }
      if (has('retaliate')) {
        st.retaliate = st.retaliate || {};
        st.retaliate[baseDef.id] = tick + CLASS_TECH.retaliateTicks;
        events.emit(tick, 'technique_pulse', { seat, skill: baseDef.id, node: 'retaliate', untilTick: tick + CLASS_TECH.retaliateTicks, targets: [a.id] });
      }
      if (has('aegis')) {
        const cdT = Math.min(CLASS_TECH.aegisMaxTicks, Math.max(CD_FLOOR_TICKS, secTicks(def.cd ?? 0)));
        const tank = bodyOf(1);
        if (tank && tank.hp > 0) {
          S().apply(tank, 'ward', CLASS_TECH.aegisWard, cdT, tick, a.id);
          events.emit(tick, 'technique_pulse', { seat, skill: baseDef.id, node: 'aegis', targets: [tank.id], ticks: cdT });
        }
      }
    });
    // Parry node (not on Riposte, whose own window it lengthens).
    if (has('parry') && !def.parry) openParry(a, def, info.slot, tick, { node: true, tag: info.tag, human: info.human });
    // Disengage hop after the cast (Vault Shot's vault already took it).
    if (has('disengage') && !def.vault) {
      const cz = caster();
      const disp = info.human
        ? ctx.seatDisplacement(a, def, techs, info.aim ? { x: info.aim.x, z: info.aim.z } : { x: a.x + (a.faceX ?? 0), z: a.z + (a.faceZ ?? 1) }, 'post')
        : cz.aiDisplacement(a, def, techs, info.target, 'post');
      if (disp) cz.startDisplacement(a, disp, def, tick, info.human, info.tag);
    }
  }

  // ---------------------------------------------------------------- parry --
  // Riposte (its cast) or the Parry node (after a cast): a guard window on
  // the fox — the next hostile instance on it is blocked (combat.js) and
  // answered at once (onParry below).
  function openParry(a, def, slot, tick, o = {}) {
    const seat = a.partyIndex;
    const techs = techsOf(seat, def.id);
    let ticks;
    if (def.parry) ticks = def.parry.windowTicks + (techs.includes('parry') ? CLASS_TECH.parryTicks : 0);
    else ticks = CLASS_TECH.parryTicks;
    a.guard = { active: true, parry: true, shapes: ['*'], halfArcDeg: 180, dirX: a.faceX ?? 0, dirZ: a.faceZ ?? 1, untilTick: tick + ticks, skill: def.id, node: !!o.node };
    events.emit(tick, 'parry_open', { seat, id: a.id, skill: def.id, untilTick: tick + ticks, node: !!o.node, ...(o.tag || {}) });
    if (o.cast) {
      // Riposte's cast record (the cooldown is spent whether a hit comes or not).
      events.emit(tick, 'ally_cast', {
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
        dx: r2(a.faceX ?? 0),
        dz: r2(a.faceZ ?? 1),
        ...(o.tag || {}),
        parry: ticks,
      });
      const st = stateOf(seat);
      if (st) {
        st.recentCasts = (st.recentCasts || []).filter((r) => tick - r.tick <= CLASS_TECH.recentWindowTicks);
        st.recentCasts.push({ skill: def.id, tick });
      }
    }
  }
  function onParry(target, attacker, g) {
    const seat = target.partyIndex;
    if (seat === undefined || seat === 0) return;
    const def0 = SKILLS[g.skill];
    if (!def0) return;
    const b = buildOf(seat);
    const def = b ? b.resolveDef(def0) : def0;
    queueContinuation(() => {
      if (!(target.hp > 0) || !(attacker.hp > 0)) return;
      const cz = caster();
      if (g.node) cz.counter(target, def, attacker, { single: true, frac: CLASS_TECH.parryCounterFrac });
      else {
        cz.counter(target, def, attacker, {});
        // Echo on Riposte arms when the counter fires (replays the counter arc).
        if (b && b.tech.liveTechs(def0.id).includes('echo')) {
          const d = { x: attacker.x - target.x, z: attacker.z - target.z };
          const l = Math.hypot(d.x, d.z) || 1;
          b.tech.armEcho(def0.id, { slot: -1, dx: r2(d.x / l), dz: r2(d.z / l), target: attacker.id, counter: true }, getTick() + TECH.echoDelayTicks);
        }
      }
    });
  }
  function expireGuards(tick) {
    for (const i of [1, 2, 3]) {
      const a = bodyOf(i);
      if (a && a.guard && a.guard.parry && (!(a.guard.untilTick > tick) || !a.guard.active)) {
        events.emit(tick, 'parry_close', { seat: i, id: a.id, skill: a.guard.skill, blocked: !a.guard.active });
        a.guard = null;
      }
    }
  }

  // ------------------------------------------------------------ retaliate --
  function onPartyDamaged(target, attacker, amount) {
    const seat = target.partyIndex;
    if (seat !== 1 || !(amount > 0)) return;
    const st = stateOf(1);
    if (!st || !st.retaliate) return;
    const tick = getTick();
    for (const [skillId, until] of Object.entries(st.retaliate)) {
      if (!(until > tick)) {
        delete st.retaliate[skillId];
        continue;
      }
      const b = buildOf(1);
      if (!b || !b.tech.liveTechs(skillId).includes('retaliate')) continue;
      const dmg = r2(CLASS_TECH.retaliateFrac * b.tech.flatStagePower(skillId));
      const atkId = attacker.id;
      queueContinuation(() => thorns(target, registry.byId(atkId), skillId, dmg));
    }
  }
  // Thorns: written directly (no crit roll — Siphon's rule), a technique
  // instance ('<skill>:retaliate').
  function thorns(tank, e, skillId, amount) {
    if (!e || !(e.hp > 0) || !(amount > 0)) return;
    const tick = getTick();
    const b = buildOf(1);
    b.tech.withSuppress(() => {
      e.hp -= amount;
      events.emit(tick, 'hit', {
        target: e.id,
        kind: e.kind,
        attacker: tank.id,
        source: `${skillId}:retaliate`,
        amount,
        crit: false,
        delivery: 'technique',
        kb: 0,
        x: r2(e.x),
        z: r2(e.z),
      });
      events.emit(tick, 'technique_pulse', { seat: 1, skill: skillId, node: 'retaliate', targets: [e.id], amount });
      if (e.hp <= 0) combat.kill(e, { delivery: 'technique' });
    });
  }

  // ----------------------------------------------------- guard recipients --
  function guardApplied(a, def, recips, power, { echo = false } = {}) {
    const seat = a.partyIndex;
    const b = buildOf(seat);
    if (!b) return;
    const techs = b.tech.liveTechs(def.id);
    if (techs.length === 0) return;
    const tick = getTick();
    const has = (id) => techs.includes(id);
    const shieldTicks = def.status ? def.status.ticks : 240;
    b.tech.withSuppress(() => {
      for (const t of techs) {
        if (t === 'snare') for (const m of recips) b.tech.giveStatus(m, 'haste', TECH.snareHaste, TECH.snareTicks);
        else if (t === 'galvanize') for (const m of recips) b.tech.giveStatus(m, 'inspired', TECH.galvInspired, TECH.galvTicks);
        else if (t === 'bulwark') {
          const tank = bodyOf(1);
          if (tank && tank.hp > 0) S().addShield(tank, 0.5 * power * recips.filter((m) => m.id !== tank.id).length, Infinity, shieldTicks, tick, a.id, def.id);
        } else if (t === 'aegis') for (const m of recips) S().apply(m, 'ward', CLASS_TECH.aegisWard, shieldTicks, tick, a.id);
        else if (t === 'provoke') {
          const r2max = CLASS_TECH.provokeGuardRadiusU * CLASS_TECH.provokeGuardRadiusU;
          const hit = [];
          for (const e of hostiles()) {
            if (recips.some((m) => (e.x - m.x) ** 2 + (e.z - m.z) ** 2 <= r2max)) {
              if (taunt(a, e, CLASS_TECH.provokeGuardTicks)) hit.push(e.id);
            }
          }
          events.emit(tick, 'technique_pulse', { seat, skill: def.id, node: 'provoke', targets: hit });
        }
      }
      if (has('snare') || has('galvanize') || has('aegis')) events.emit(tick, 'technique_pulse', { seat, skill: def.id, node: 'guard', targets: recips.map((m) => m.id) });
    });
    void echo;
  }

  // ------------------------------------------------------------- listener --
  let lastHitBySeat = [null, null, null, null];
  const flowDone = new Map(); // castId -> true (Flow fires once per cast)
  events.on('*', (ev) => {
    switch (ev.type) {
      case 'hit': {
        const src = ev.source;
        if (typeof src !== 'string' || src.includes(':')) return;
        const seat = seatOfSkill(src);
        if (seat === null) return;
        const b = buildOf(seat);
        if (!b || b.tech.isSuppressed()) return;
        const c = cur && cur.seat === seat && cur.skill === src ? cur : null;
        const a = bodyOf(seat);
        if (!a) return;
        lastHitBySeat[seat] = ev;
        b.tech.setLastHit(ev);
        const st = stateOf(seat);
        // The Swordsman's combo memory (a REAL cast's connect).
        if (seat === 2 && st && !(c && c.echo)) {
          st.combo = st.combo || {};
          st.combo[src] = ev.tick;
        }
        const techs = b.tech.liveTechs(src);
        if (techs.length === 0) return;
        const def = SKILLS[src];
        const bounce = techs.filter((t) => t === 'bounce').length;
        let chainQueued = false;
        for (const t of techs) {
          if (t === 'bounce' && !chainQueued) {
            chainQueued = true;
            const { target, x, z } = ev;
            queueContinuation(() => b.tech.runDamageChain(src, target, x, z, bounce));
          } else if (t === 'siphon') queueContinuation(() => b.tech.runSiphonSelfHeal(src));
          else if (t === 'snare') {
            const { target } = ev;
            queueContinuation(() => b.tech.giveStatus(registry.byId(target), 'slow', TECH.snareSlow, TECH.snareTicks));
          } else if (t === 'galvanize') {
            const { target } = ev;
            queueContinuation(() => b.tech.giveStatus(registry.byId(target), 'exposed', TECH.galvExposed, TECH.galvTicks));
          } else if (t === 'bulwark') {
            const { amount } = ev;
            queueContinuation(() => b.tech.runBulwarkDamage(src, amount));
          } else if (t === 'split') {
            const { target, x, z, dirX, dirZ } = ev;
            queueContinuation(() => b.tech.runSplitShards(src, target, x, z, dirX, dirZ));
          } else if (t === 'provoke') {
            const { target } = ev;
            const boss = (e) => e && (e.kind === 'stag' || e.boss === true);
            queueContinuation(() => {
              const e = registry.byId(target);
              b.tech.withSuppress(() => {
                if (taunt(a, e, boss(e) ? CLASS_TECH.provokeStagTicks : CLASS_TECH.provokeTicks))
                  events.emit(getTick(), 'technique_pulse', { seat, skill: src, node: 'provoke', targets: [target] });
              });
            });
          } else if (t === 'tremor') {
            if (!(def.shape === 'melee_arc' || def.shape === 'nova' || def.shape === 'ground_aoe')) continue;
            const { target } = ev;
            // A zone: its first tick on each enemy only.
            if (c && c.zone !== undefined) {
              const z = registry.byId(c.zone);
              if (z) {
                z.tremorHit = z.tremorHit || [];
                if (z.tremorHit.includes(target)) continue;
                z.tremorHit.push(target);
              }
            }
            queueContinuation(() => {
              const e = registry.byId(target);
              b.tech.withSuppress(() => {
                if (e && S().apply(e, 'stun', 1, CLASS_TECH.tremorTicks, getTick(), a.id))
                  events.emit(getTick(), 'technique_pulse', { seat, skill: src, node: 'tremor', targets: [target] });
              });
            });
          } else if (t === 'flow') {
            if (c && c.echo) continue; // an echo is not a cast
            const key = c ? c.castId : `${src}@${ev.tick}`;
            if (flowDone.has(key)) continue;
            flowDone.set(key, true);
            if (flowDone.size > 128) flowDone.delete(flowDone.keys().next().value);
            const copies = techs.filter((x) => x === 'flow').length;
            queueContinuation(() => flowCut(seat, src, copies * CLASS_TECH.flowCutSec));
          }
        }
        return;
      }
      case 'death': {
        for (const seat of [1, 2, 3]) {
          const lh = lastHitBySeat[seat];
          if (!lh || lh.target !== ev.id || lh.tick !== ev.tick) continue;
          const b = buildOf(seat);
          if (!b || !b.tech.liveTechs(lh.source).includes('detonate')) continue;
          const src = lh.source;
          const { x, z } = ev;
          queueContinuation(() => b.tech.runDetonateDamage(src, x, z));
        }
        return;
      }
      case 'shield_broken': {
        const seat = seatOfSkill(ev.srcSkill);
        if (seat === null) return;
        const b = buildOf(seat);
        if (!b || b.tech.isSuppressed() || !b.tech.liveTechs(ev.srcSkill).includes('detonate')) return;
        const { x, z } = ev;
        queueContinuation(() => b.tech.runDetonateDamage(ev.srcSkill, x, z));
        return;
      }
      default:
    }
  });

  // Flow: cut every OTHER skill's remaining cooldown (never below now).
  function flowCut(seat, fromSkill, sec) {
    const a = bodyOf(seat);
    if (!a || !Array.isArray(a.cds)) return;
    const tick = getTick();
    const cut = secTicks(sec);
    const slots = ctx.slotsOf(seat);
    let any = false;
    for (let i = 0; i < a.cds.length; i++) {
      if (slots[i] === fromSkill || !slots[i]) continue;
      if (a.cds[i] > tick) {
        a.cds[i] = Math.max(tick, a.cds[i] - cut);
        any = true;
      }
    }
    if (ctx.humanCdCut) ctx.humanCdCut(seat, fromSkill, cut);
    if (any) events.emit(tick, 'technique_pulse', { seat, skill: fromSkill, node: 'flow', cutTicks: cut });
  }

  // ------------------------------------------------------- passive pulses --
  // The party system calls this for every class passive pulse, AFTER its
  // delivery emitted `aura_pulse { seat, ... }`: the passive columns.
  function afterPulse(seat, skillId, pulse) {
    const b = buildOf(seat);
    if (!b) return;
    const techs = b.tech.liveTechs(skillId);
    if (techs.length === 0) return;
    const a = bodyOf(seat);
    if (!a) return;
    const def = SKILLS[skillId];
    const tick = getTick();
    const inside = Array.isArray(pulse.inside) ? pulse.inside : [];
    const hit = Array.isArray(pulse.hit) ? pulse.hit : [];
    b.tech.withSuppress(() => {
      for (const t of techs) {
        if (t === 'snare') {
          const ids = def.field === 'hostile' ? hit : hostilesIn(a, pulse.area);
          for (const id of ids) S().apply(registry.byId(id), 'slow', TECH.snarePassiveSlow, TECH.pulseStatusTicks, tick, a.id);
          events.emit(tick, 'technique_pulse', { seat, skill: skillId, node: 'snare', targets: ids });
        } else if (t === 'galvanize') {
          if (def.field === 'hostile') for (const id of hit) S().apply(registry.byId(id), 'exposed', 0.1, TECH.pulseStatusTicks, tick, a.id);
          else for (const id of inside) b.tech.giveStatus(registry.byId(id), 'inspired', TECH.galvPassiveInspired, TECH.pulseStatusTicks);
          events.emit(tick, 'technique_pulse', { seat, skill: skillId, node: 'galvanize', targets: def.field === 'hostile' ? hit : inside });
        } else if (t === 'bulwark') {
          if (def.field === 'hostile') {
            const dealt = pulse.dealt ?? 0;
            if (dealt > 0) S().addShield(a, 0.2 * dealt, 10, TECH.bulwarkTicks, tick, a.id);
          } else for (const id of inside) S().addShield(registry.byId(id), TECH.bulwarkPassiveAdd, TECH.bulwarkPassiveCap, TECH.bulwarkTicks, tick, a.id);
          events.emit(tick, 'technique_pulse', { seat, skill: skillId, node: 'bulwark', targets: def.field === 'hostile' ? [a.id] : inside });
        } else if (t === 'siphon' && def.field === 'hostile' && hit.length > 0) {
          const amt = r2(TECH.siphonFrac * b.tech.flatStagePower(skillId));
          const applied = Math.min(amt, a.maxHp - a.hp);
          if (a.hp > 0 && applied > 0) {
            a.hp += applied;
            events.emit(tick, 'heal', { target: a.id, healer: a.id, source: `${skillId}:siphon`, amount: amt, applied: r2(applied), crit: false, x: r2(a.x), z: r2(a.z) });
          }
        } else if (t === 'provoke' && def.field === 'ally') {
          const near = hostilesIn(a, pulse.area)
            .map((id) => registry.byId(id))
            .filter(Boolean)
            .sort((p, q) => (p.x - a.x) ** 2 + (p.z - a.z) ** 2 - ((q.x - a.x) ** 2 + (q.z - a.z) ** 2) || p.id - q.id)
            .slice(0, CLASS_TECH.provokePassiveCount);
          const ids = [];
          for (const e of near) if (taunt(a, e, CLASS_TECH.provokePassiveTicks)) ids.push(e.id);
          events.emit(tick, 'technique_pulse', { seat, skill: skillId, node: 'provoke', targets: ids });
        } else if (t === 'brace') {
          const tank = bodyOf(1);
          const copies = techs.filter((x) => x === 'brace').length;
          if (tank && tank.hp > 0) S().addShield(tank, CLASS_TECH.bracePassive * copies, CLASS_TECH.bracePassiveCap, CLASS_TECH.braceTicks, tick, a.id);
        } else if (t === 'aegis' && def.field === 'ally') {
          for (const id of inside) S().apply(registry.byId(id), 'ward', CLASS_TECH.aegisPassiveWard, TECH.pulseStatusTicks, tick, a.id);
        } else if (t === 'flow' && hit.length > 0) {
          const copies = techs.filter((x) => x === 'flow').length;
          queueContinuation(() => flowCut(seat, skillId, copies * CLASS_TECH.flowPassiveCutSec));
        }
      }
    });
  }
  function hostilesIn(a, area) {
    const r2max = area * area;
    return hostiles()
      .filter((e) => (e.x - a.x) ** 2 + (e.z - a.z) ** 2 <= r2max)
      .map((e) => e.id);
  }

  // Pulse-time mods for a hostile-field passive: Steady Aim / Momentum join
  // the additive-pct stage (Sharpen / Ascend are in the resolved def).
  function pulseMods(a, def) {
    const seat = a.partyIndex;
    const b = buildOf(seat);
    const st = stateOf(seat);
    const techs = b ? b.tech.liveTechs(def.id) : [];
    const has = (id) => techs.includes(id);
    const tick = getTick();
    let pct = 0;
    if (has('momentum') && st) {
      const distinct = new Set((st.recentCasts || []).filter((r) => tick - r.tick <= CLASS_TECH.recentWindowTicks).map((r) => r.skill));
      pct += Math.min(CLASS_TECH.momentumMax, distinct.size * CLASS_TECH.momentumPct);
    }
    if (has('steady_aim') && st && tick - (st.stillSince ?? tick) >= CLASS_TECH.steadyAimStillTicks) pct += CLASS_TECH.steadyAimPct;
    const flags = {};
    if (has('lethality')) flags.critMul = CLASS_TECH.lethalityCritMul;
    if (has('heartseeker')) flags.forceCrit = true;
    if (has('execute')) flags.execute = true;
    if (has('concussive')) flags.kbScale = CLASS_TECH.concussiveKb;
    let power = def.power;
    if (pct !== 0 && b) {
      const ps = powerStages(b, def.id);
      power = (SKILLS[def.id].power + ps.flat) * Math.max(0, 1 + ps.pct + pct) * ps.mult;
    }
    return { power, ...flags };
  }

  // The per-tick bookkeeping: Steady Aim stillness, parry windows.
  function endOfTick(tick) {
    expireGuards(tick);
    for (const i of [1, 2, 3]) {
      const a = bodyOf(i);
      const st = stateOf(i);
      if (!a || !st) continue;
      const moved = st.lastX === undefined || Math.abs(a.x - st.lastX) > 1e-4 || Math.abs(a.z - st.lastZ) > 1e-4;
      if (moved) st.stillSince = tick;
      st.lastX = a.x;
      st.lastZ = a.z;
    }
  }

  combat.setHooks({ onParry, onPartyDamaged });

  // Save (PLAN §16.6): Heartseeker's first-hit memory and Flow's once-per-cast
  // memory outlive a tick (a bolt / zone lands later) — plain data.
  function saveState() {
    return {
      firstHits: [...firstHits.entries()].map(([k, s]) => [k, [...s]]),
      flowDone: [...flowDone.keys()],
    };
  }
  function loadState(d) {
    firstHits.clear();
    flowDone.clear();
    for (const [k, ids] of (d && d.firstHits) || []) firstHits.set(k, new Set(ids));
    for (const k of (d && d.flowDone) || []) flowDone.set(k, true);
  }

  void KNOCKBACK;
  return {
    castMods,
    afterCast,
    openParry,
    guardApplied,
    instance,
    suppressed,
    firstHit,
    mayTaunt,
    afterPulse,
    pulseMods,
    endOfTick,
    saveState,
    loadState,
    current: () => cur,
  };
}
