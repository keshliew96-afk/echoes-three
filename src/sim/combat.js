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
//   #4 hitstop — 3 ticks requested on kill blows (2 on melee-arc connects via
//      HITSTOP.meleeTicks when arcs land); the clock enforces the 4-per-20
//      window cap and reports the granted amount.
// Render-side contract members (#1 flash, #2 numbers, #6 kill pop/decal,
// #7 screenshake) and #5 sound slots subscribe to the events emitted here.
import { CRIT, HITSTOP, KNOCKBACK, SCREENSHAKE } from '../core/constants.js';

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
  // One damage instance. opts:
  //   delivery: 'basic' | 'skill' (knockback magnitude + future melee hitstop)
  //   dirX/dirZ: hit direction (impact travel dir), drives knockback away
  //   attacker: source entity id (event payload only)
  // Returns { amount, crit } | { immune: true } | null (target outside the
  // pipeline — dead/Downed/missing).
  // source: optional skill-id label (skills block) — rides the event so tests
  // and the HUD can attribute an instance to the skill that produced it.
  function applyDamage(target, base, { delivery = 'basic', dirX = 0, dirZ = 0, attacker = null, source = null } = {}) {
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

    const crit = rng.chance(CRIT.chance); // strict roll < chance (§7)
    const amount = crit ? base * CRIT.mult : base;
    target.hp -= amount;
    stats.hits += 1;
    if (crit) stats.crits += 1;

    // §9 #3 knockback (world's continuous phase advances kbV over kbTicks,
    // swept vs walls). Repeat hits re-arm, never stack velocity.
    let kb = 0;
    if (target.knockbackable) {
      const len = Math.hypot(dirX, dirZ);
      if (len > 1e-6) {
        kb = delivery === 'basic' ? KNOCKBACK.basicDist : KNOCKBACK.skillDist;
        target.kbVx = (dirX / len) * (kb / KNOCKBACK.durationTicks);
        target.kbVz = (dirZ / len) * (kb / KNOCKBACK.durationTicks);
        target.kbTicks = KNOCKBACK.durationTicks;
      }
    }

    // dirX/dirZ ride the event so the render side can throw its debris/spark
    // spray ALONG the impact instead of as an omnidirectional puff
    // (REFERENCE_BAR check 5 — a hit has to read as an event with a direction).
    const dl = Math.hypot(dirX, dirZ);
    events.emit(tick, 'hit', {
      target: target.id,
      kind: target.kind,
      attacker,
      source,
      amount,
      crit,
      delivery,
      kb,
      dirX: dl > 1e-6 ? r2(dirX / dl) : 0,
      dirZ: dl > 1e-6 ? r2(dirZ / dl) : 0,
      x: r2(target.x),
      z: r2(target.z),
    });

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
        kill(target, { delivery });
      }
    }
    return { amount, crit };
  }

  // Kill resolution (§9 #4/#6): hitstop request (clock caps it), death event
  // (render side hangs the pop/burst/decal/shake off this), despawn.
  function kill(target, { delivery = 'basic' } = {}) {
    const tick = getTick();
    stats.kills += 1;
    const granted = requestHitstop ? requestHitstop(HITSTOP.killTicks) : 0;
    if (granted > 0) events.emit(tick, 'hitstop', { ticks: granted, cause: 'kill' });
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
  function applyHeal(target, base, { healer = null, source = null } = {}) {
    const tick = getTick();
    if (!target || !(target.hp > 0)) return null; // Downed/dead: outside the pipeline
    const crit = rng.chance(CRIT.chance);
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

  return { applyDamage, applyHeal, kill };
}
