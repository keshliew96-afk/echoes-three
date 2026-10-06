// Damage/heal instance pipeline (§9) — identical for player, ally, and enemy
// sources:
//   base = skill power or basic_attack_power
//   -> ONE crit roll from the seeded gameplay stream in resolution order
//   -> final = base * (1.5 if roll < 0.05 else 1)
// No armor/resists/damage types. Heals clamp at max_hp; a `full_heal` event
// fires per instance when pre_clamp > 0 AND current + pre_clamp >= max_hp
// (inclusive). Downed/dead characters are OUTSIDE the pipeline: no instance
// ever targets them, no roll is drawn. I-framed targets likewise produce NO
// instance at all (no crit roll, no RNG draw) — the contact emits `hit_immune`
// so tests/HUD can observe the whiff (§5: "an incoming hit creates no damage
// instance at all").
//
// Juice hooks owned here (sim side of the §9 contract):
//   #3 knockback — positional impulse away from the hit on knockbackable
//      (non-boss enemy) targets: 0.12 u basic / 0.30 u skill over ~80 ms,
//      swept vs walls (world advances it); party members never knocked back.
//   #4 hitstop — a GLOBAL sim pause, requested here for both halves of the
//      contract: HITSTOP.meleeTicks (2) whenever a `melee_arc` delivery
//      connects without killing, HITSTOP.killTicks (3) on a kill blow. Every
//      request goes through requestStop(), which coordinates the requests
//      landing on ONE sim tick so a 3-target cleave (or two allies swinging
//      together, or an arc that kills one of its targets) pauses the world
//      ONCE for the strongest cause instead of stacking 2+2+2. The clock then
//      enforces the §9 4-ticks-per-20 window cap and reports what it granted.
// Render-side contract members (#1 flash, #2 numbers, #6 kill pop/decal,
// #7 screenshake) and #5 sound slots subscribe to the events emitted here.
import { CRIT, HITSTOP, KNOCKBACK, SCREENSHAKE } from '../core/constants.js';
import * as STATUS from './status.js';

const r2 = (v) => Math.round(v * 100) / 100;

export function createCombat({
  registry,
  events,
  rng,
  stats,
  getTick,
  requestHitstop = null,
  isIframed = () => false,
}) {
  // --- §9 #4 hitstop coordinator -------------------------------------------
  // The sim tick FREEZES while the clock pays out a pause, so every damage
  // instance that lands on the same tick belongs to one impact moment: a
  // 6-target Brutal Cleave, the Tank and the Swordsman connecting together, or
  // an arc whose third target dies. Those must read as a single pause of the
  // strongest cause (kill 3 > melee arc 2), never as a 2+2+3 stack that empties
  // the 4-per-20 window budget on one swing and starves the next kill.
  // requestStop() therefore TOPS UP to `want` within the current tick and
  // emits at most the delta; the clock still has the final word on the cap.
  let stopTick = -1;
  let stopGranted = 0;
  function requestStop(cause, want) {
    if (!requestHitstop) return 0;
    const tick = getTick();
    if (tick !== stopTick) {
      stopTick = tick;
      stopGranted = 0;
    }
    const need = want - stopGranted;
    if (need <= 0) return 0; // this tick is already paused at least this long
    const granted = requestHitstop(need);
    if (granted > 0) {
      stopGranted += granted;
      events.emit(tick, 'hitstop', { ticks: granted, cause, total: stopGranted });
    }
    return granted;
  }

  // One damage instance. opts:
  //   delivery: 'basic' | 'skill' (knockback magnitude)
  //   shape: the §6 delivery shape that carried the instance ('melee_arc',
  //     'projectile', 'nova', 'ground_aoe', 'direct') or a truthful non-§6
  //     label for contact/technique damage. Rides the `hit` event so the
  //     render side and the certification probes can attribute a hit to its
  //     delivery without reverse-engineering it from the cast event, and
  //     drives the §9 #4 melee-arc pause.
  //   dirX/dirZ: hit direction (impact travel dir), drives knockback away
  //   attacker: source entity id (event payload only)
  // Returns { amount, crit } | { immune: true } | null (target outside the
  // pipeline — dead/Downed/missing).
  // source: optional skill-id label (skills block) — rides the event so tests
  // and the HUD can attribute an instance to the skill that produced it.
  //   critBonus: additive crit-chance bonus for this instance (Keen node,
  //     BUILD_BRIEF §23.4) — still ONE strict `roll < chance` draw.
  //
  // Gauntlet pipeline order (BUILD_BRIEF §23.8, binding): base -> attacker
  // `inspired` -> crit roll -> target `exposed` x `ward` -> shield absorb ->
  // HP. With no statuses on either body every factor is exactly 1, so the
  // v0.4.63 numbers (and the legacy golden traces) are untouched.
  //
  // Guard (docs/gauntlet/PLAN.md §3.6 contract (c), the Barrow Ram's horn
  // guard): a target carrying `guard = { active, dirX, dirZ, halfArcDeg,
  // shapes }` blocks an instance whose `shape` is listed and whose hit
  // direction arrives inside the guard arc — BEFORE the crit roll, so a block
  // draws no RNG. It deals 0, emits `hit_blocked` and returns
  // { blocked: true, amount: 0 }. A caller that passes no direction is never
  // blocked.
  // PARTY (BUILD_BRIEF §25.2 / §25.3, PLAN §16.3) — optional per-instance
  // modifiers, all absent on every pre-PARTY caller (so every v0.5.150
  // instance resolves exactly as before):
  //   critMul    crit multiplier instead of CRIT.mult (Lethality ×2.2)
  //   forceCrit  the crit result is forced true — the roll is STILL drawn,
  //              so the seeded stream's order never changes (Heartseeker)
  //   kbScale    knockback multiplier; negative = a pull toward the hit's
  //              origin (Concussive ×2, Anchor pull, Razor Wake 0)
  //   kbDist     absolute knockback distance override (signed like kbScale)
  // A PARRY guard (the fox's Riposte / Parry node: `guard.parry`, shapes
  // ['*']) blocks the next instance from a HOSTILE attacker of any shape from
  // any direction — before the crit roll, exactly like the Ram's guard — and
  // reports it to the party hook (the counter). `hooks.onPartyDamaged`
  // (Retaliate) hears every hostile instance that lands on a party member.
  function applyDamage(
    target,
    base,
    { delivery = 'basic', shape = null, dirX = 0, dirZ = 0, attacker = null, source = null, critBonus = 0, critMul = null, forceCrit = false, kbScale = null, kbDist = null } = {}
  ) {
    const tick = getTick();
    if (!target || !(target.hp > 0)) return null; // outside the pipeline
    if (isIframed(target)) {
      stats.immune += 1;
      events.emit(tick, 'hit_immune', {
        target: target.id,
        reason: 'iframe',
        x: r2(target.x),
        z: r2(target.z),
      });
      return { immune: true }; // no instance, no RNG draw
    }

    const g = target.guard;
    if (g && g.parry && g.active && g.untilTick > tick && attacker !== null && attacker !== undefined) {
      const src = registry.byId(attacker);
      if (src && src.faction === 'hostile') {
        stats.blocked = (stats.blocked ?? 0) + 1;
        target.lastBlockedTick = tick;
        g.active = false; // the first blocked instance ends the window
        events.emit(tick, 'hit_blocked', {
          targetId: target.id,
          attackerId: attacker,
          shape,
          delivery,
          source,
          x: r2(target.x),
          z: r2(target.z),
          parry: true,
        });
        if (hooks.onParry) hooks.onParry(target, src, g);
        return { blocked: true, amount: 0, parry: true };
      }
    }
    if (g && g.active && Array.isArray(g.shapes) && g.shapes.includes(shape)) {
      const gdl = Math.hypot(dirX, dirZ);
      const gl = Math.hypot(g.dirX ?? 0, g.dirZ ?? 0);
      if (gdl > 1e-6 && gl > 1e-6) {
        // The hit TRAVELS along (dirX, dirZ), so it arrives from -dir; it is
        // blocked when that arrival direction sits inside the guard arc.
        const dot = (-dirX / gdl) * (g.dirX / gl) + (-dirZ / gdl) * (g.dirZ / gl);
        if (dot >= Math.cos(((g.halfArcDeg ?? 55) * Math.PI) / 180)) {
          stats.blocked = (stats.blocked ?? 0) + 1;
          target.lastBlockedTick = tick;
          events.emit(tick, 'hit_blocked', {
            targetId: target.id,
            attackerId: attacker ?? null,
            shape,
            delivery,
            source,
            x: r2(target.x),
            z: r2(target.z),
          });
          return { blocked: true, amount: 0 };
        }
      }
    }

    const atk = attacker !== null && attacker !== undefined ? registry.byId(attacker) : null;
    const dealt = atk ? STATUS.damageDealtMul(atk, tick) : 1;
    // RELICS (sim/relics.js): party-wide modifiers, read only while a relic
    // or a curse is live. A hostile target hit by anything that is not
    // hostile counts as party damage (bolts carry no attacker id).
    const M = mods && mods.active() ? mods : null;
    const partyHit = !!M && target.partyIndex !== undefined;
    const partyDeals = !!M && target.faction === 'hostile' && !(atk && atk.faction === 'hostile');
    const rolled = rng.chance(CRIT.chance + critBonus + (partyDeals ? M.critChance() : 0)); // strict roll < chance (§7)
    const crit = forceCrit ? true : rolled;
    let amount = base * dealt;
    if (partyDeals) amount *= M.dealtMul();
    if (crit) amount *= (critMul ?? CRIT.mult) + (partyDeals ? M.critMulAdd() : 0);
    amount *= STATUS.damageTakenMul(target, tick);
    if (partyHit) amount *= M.takenMul();
    let absorbed = 0;
    let shieldSrc = null;
    if (target.status && target.status.shield) {
      shieldSrc = target.status.shield;
      const r = STATUS.absorb(target, amount, tick);
      absorbed = r.absorbed;
      amount = r.remaining;
    }
    target.hp -= amount;
    target.lastHitTick = tick; // PLAN §3.6: archetypes react to damage the next tick
    stats.hits += 1;
    if (crit) stats.crits += 1;

    // §9 #3 knockback (world's continuous phase advances kbV over kbTicks,
    // swept vs walls). Repeat hits re-arm, never stack velocity.
    let kb = 0;
    if (target.knockbackable) {
      const len = Math.hypot(dirX, dirZ);
      if (len > 1e-6) {
        kb = delivery === 'basic' ? KNOCKBACK.basicDist : KNOCKBACK.skillDist;
        if (kbDist !== null && kbDist !== undefined) kb = kbDist;
        else if (kbScale !== null && kbScale !== undefined) kb *= kbScale;
        if (partyDeals) kb *= M.kbMul();
        if (kb !== 0) {
          target.kbVx = (dirX / len) * (kb / KNOCKBACK.durationTicks);
          target.kbVz = (dirZ / len) * (kb / KNOCKBACK.durationTicks);
          target.kbTicks = KNOCKBACK.durationTicks;
        }
      }
    }

    // dirX/dirZ ride the event so the render side can throw its debris/spark
    // spray ALONG the impact instead of as an omnidirectional puff
    // (REFERENCE_BAR check 5 — a hit has to read as an event with a direction).
    const dl = Math.hypot(dirX, dirZ);
    const hitEv = {
      target: target.id,
      kind: target.kind,
      attacker,
      source,
      amount,
      crit,
      delivery,
      shape,
      kb,
      dirX: dl > 1e-6 ? r2(dirX / dl) : 0,
      dirZ: dl > 1e-6 ? r2(dirZ / dl) : 0,
      x: r2(target.x),
      z: r2(target.z),
    };
    // §23.8: numerals equal HP deltas; the shield's share rides separately
    // (a small Bone "(n)" beside the numeral) and on its own event.
    if (absorbed > 0) hitEv.absorbed = r2(absorbed);
    events.emit(tick, 'hit', hitEv);
    if (absorbed > 0) {
      events.emit(tick, 'shield_absorb', {
        target: target.id,
        kind: target.kind,
        absorbed: r2(absorbed),
        left: r2(STATUS.magnitude(target, 'shield', tick)),
        x: r2(target.x),
        z: r2(target.z),
      });
      // PARTY (Detonate on a guard skill): a shield that a PARTY skill
      // granted breaks — its source skill rides the record (`skill`).
      if (shieldSrc && shieldSrc.skill && !(shieldSrc.mag > 1e-6))
        events.emit(tick, 'shield_broken', { targetId: target.id, srcSkill: shieldSrc.skill, src: shieldSrc.src ?? null, x: r2(target.x), z: r2(target.z) });
    }
    // PARTY (Retaliate): a hostile instance landed on a party member.
    if (hooks.onPartyDamaged && target.partyIndex !== undefined && atk && atk.faction === 'hostile') hooks.onPartyDamaged(target, atk, amount + absorbed);
    if (partyHit && atk && atk.faction === 'hostile') M.onPartyHit(target, atk, amount + absorbed);

    // §9 #4, melee half: a melee-arc connect that does NOT kill pauses the
    // whole sim for 2 ticks — the weight the brief asks a swing to land with.
    // A LETHAL arc connect skips this and takes the 3-tick kill pause below
    // instead (one pause per impact, the stronger cause wins).
    if (shape === 'melee_arc' && target.hp > 0) requestStop('melee_arc', HITSTOP.meleeTicks);

    // RELICS (Last Light): the blow leaves the member standing at 1 HP.
    if (partyHit && target.hp <= 0 && M.saveFromDown(target)) target.hp = 1;

    if (target.hp <= 0) {
      if (target.partyIndex !== undefined) {
        // §10: HP <= 0 on a party member = DOWNED, never death/despawn. The
        // full downed contract (crawl, revive channel, diminishing returns)
        // lands with its own block; the sim-side floor + event land here so
        // the integrated Healer rig can play the §10 collapse. hp = 0 keeps
        // the body outside the pipeline (no instance ever targets a downed
        // character — the guard at the top of this function).
        target.hp = 0;
        events.emit(tick, 'downed', {
          id: target.id,
          kind: target.kind,
          x: r2(target.x),
          z: r2(target.z),
        });
      } else {
        // RELICS (Spore Sac): a party kill's corpse may leave no hazard.
        if (partyDeals && target.faction === 'hostile' && target.lifecycle !== 'break') M.beforeKill(target);
        kill(target, { delivery });
        if (partyDeals && target.faction === 'hostile' && target.lifecycle !== 'break') M.onKill(target);
      }
    }
    return { amount, crit };
  }

  // Kill resolution (§9 #4/#6): hitstop request (clock caps it), death event
  // (render side hangs the pop/burst/decal/shake off this), despawn.
  function kill(target, { delivery = 'basic' } = {}) {
    const tick = getTick();
    // Breakable world objects (docs/gauntlet/PLAN.md §4.6 — barricades, kegs,
    // puffcaps; entity field `lifecycle: 'break'`, M4b) leave the pipeline
    // as a `broken` event: no kill stat, no kill hitstop, no screenshake, no
    // kill decal. The owning sim system reacts to the event (a keg ignites).
    if (target.lifecycle === 'break') {
      events.emit(tick, 'broken', {
        id: target.id,
        kind: target.kind,
        delivery,
        x: r2(target.x),
        z: r2(target.z),
      });
      registry.despawn(target.id);
      return;
    }
    stats.kills += 1;
    requestStop('kill', HITSTOP.killTicks);
    events.emit(tick, 'death', {
      id: target.id,
      kind: target.kind,
      delivery,
      x: r2(target.x),
      z: r2(target.z),
    });
    // §9 #7 screenshake, now an EVENT rather than a render-side inference: a
    // kill shakes the frame, an ordinary hit never does. amp/duration ride at
    // the brief's ceilings; the render side clamps them again.
    events.emit(tick, 'screenshake', {
      cause: 'kill',
      amp: SCREENSHAKE.amp,
      durationSec: SCREENSHAKE.durationSec,
      x: r2(target.x),
      z: r2(target.z),
    });
    registry.despawn(target.id);
  }

  // One heal instance: same crit roll, clamped at max_hp, full_heal per §9.
  function applyHeal(target, base, { healer = null, source = null, critBonus = 0 } = {}) {
    const tick = getTick();
    if (!target || !(target.hp > 0)) return null; // Downed/dead: outside the pipeline
    // RELICS: heal modifiers on the party (Lantern Oil, Hawk Feather, Famine).
    const M = mods && mods.active() && target.partyIndex !== undefined ? mods : null;
    const crit = rng.chance(CRIT.chance + critBonus + (M ? M.critChance() : 0));
    if (M) base *= M.healMul();
    const preClamp = crit ? base * CRIT.mult : base;
    const room = target.maxHp - target.hp;
    const applied = Math.min(preClamp, room);
    target.hp += applied;
    stats.heals += 1;
    if (crit) stats.healCrits += 1;
    events.emit(tick, 'heal', {
      target: target.id,
      healer,
      source,
      amount: preClamp,
      applied: r2(applied),
      crit,
      x: r2(target.x),
      z: r2(target.z),
    });
    if (preClamp > 0 && room <= preClamp) events.emit(tick, 'full_heal', { target: target.id });
    return { amount: preClamp, applied, crit };
  }

  // `status` = the committed status contract (sim/status.js), handed to every
  // system that already holds the combat pipeline (world walk, ally steering,
  // enemies / hazards through their ctx) — one implementation, no re-imports.
  // Save system (docs/gauntlet/PLAN.md §3.4, M2): the hitstop coordinator's
  // per-tick memory — the only private state of the pipeline.
  const saveState = () => ({ stopTick, stopGranted });
  function loadState(d) {
    stopTick = d && Number.isFinite(d.stopTick) ? d.stopTick : -1;
    stopGranted = d && Number.isFinite(d.stopGranted) ? d.stopGranted : 0;
  }
  // PARTY hooks (sim/partytech.js installs them; absent = no-op).
  const hooks = { onParry: null, onPartyDamaged: null };
  const setHooks = (h = {}) => Object.assign(hooks, h);
  // RELICS: the relic system's modifier table (sim/relics.js), null = none.
  let mods = null;
  const setMods = (m) => {
    mods = m ?? null;
  };
  return { applyDamage, applyHeal, kill, status: STATUS, saveState, loadState, setHooks, setMods, getMods: () => mods };
}
