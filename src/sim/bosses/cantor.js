// THE HOLLOW CANTOR — Act IV (The Hollow Heart) final boss (content plan 2,
// slice 5; docs/ACT_IV_BOSSES.md). The singer under the Barrow: not a god but
// a god's echo, left behind when the gods fell silent. It sings in verses it
// stole from the three lands above, and each verse calls that land's beasts.
//
//   Hollow Note (primary): an Ember RING r 1.7 at its target (48-tick
//     warning) that bursts for 10. From the Second Verse on the note ECHOES:
//     five crystal shards fly out of the burst along the floor (4 each).
//     Cooldown 240 ticks (180 in the Third Verse).
//   Sung Lance (secondary): an Ember LANE from its chest toward a target 2.5
//     to 9 u away (1.2 u wide, 54-tick warning), every body in it takes 16.
//     Cooldown 300 ticks (240 in the Third Verse).
//   Verses (the three phases): at 75 / 50 / 25 % HP it takes a verse and calls
//     its land's adds — the Wood's (boars and a mantis), the Mill's (a toad
//     and moths), the Barrow's (a ram, a mole and a crow); the level's boss
//     row carries them as `addsByPhase`.
//   Echo Step (Second Verse on): crowded inside 2.2 u for 45 ticks, it fades
//     and reappears at the room's far side (no damage; the party must close
//     again). Cooldown 360 ticks.
//   Heart Pulse (Third Verse): with a body inside 3 u, an Ember RING r 3.2
//     round itself (60-tick warning) that bursts for 18. Cooldown 420 ticks.
//
// Plain entity data, integer ticks, no RNG of its own (the Echo Step picks
// the farthest of fixed points), so saves, snapshots and replays carry it.
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;

export const CANTOR = Object.freeze({
  name: 'THE HOLLOW CANTOR',
  radius: 0.7,
  hpMul: 0.85,
  moveSpeed: 1.35,
  scale: 2.4,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['boar', 'boar', 'mantis']),
  // Keeps this far from its target: a singer, not a brawler.
  keep: Object.freeze({ near: 3.0, far: 5.5 }),
  note: Object.freeze({ damage: 10, cdTicks: 240, verse3CdTicks: 180, firstDelay: 75, telegraphTicks: 48, radius: 1.7 }),
  echo: Object.freeze({ shards: 5, damage: 4, speed: 5.0, range: 5.5 }),
  lance: Object.freeze({ damage: 16, cdTicks: 300, verse3CdTicks: 240, firstDelay: 160, telegraphTicks: 54, width: 1.2, maxLen: 9.0, minRange: 2.5 }),
  step: Object.freeze({ fromVerse: 2, range: 2.2, crowdTicks: 45, cdTicks: 360, fadeTicks: 18 }),
  pulse: Object.freeze({ fromVerse: 3, damage: 18, cdTicks: 420, telegraphTicks: 60, radius: 3.2, trigger: 3.0 }),
  // Where an Echo Step may land (the farthest from the party that is clear).
  stepPoints: Object.freeze([[-5.6, -3.4], [5.6, -3.4], [-5.6, 2.6], [5.6, 2.6], [0, -4.4], [0, 3.4], [-2.8, -0.4], [2.8, -0.4]]),
});

export default {
  id: 'cantor',
  def: CANTOR,

  spawn(ctx, b, tick) {
    b.mode = 'sing'; // 'sing' | 'fade'
    b.verse = 0; // 0 before the first verse, then 1..3
    b.nextNoteTick = tick + CANTOR.note.firstDelay;
    b.nextLanceTick = tick + CANTOR.lance.firstDelay;
    b.nextStepTick = tick;
    b.nextPulseTick = tick;
    b.crowdTicks = 0;
    b.fadeUntil = 0;
    b.stepTo = null;
    b.notes = 0;
  },

  continuous(ctx, b, tick) {
    if (b.mode === 'fade') return;
    const target = ctx.pickTarget(b);
    b.targetId = target ? target.id : null;
    if (!target) return;
    const dx = target.x - b.x;
    const dz = target.z - b.z;
    const d = Math.hypot(dx, dz);
    if (d > 1e-6) {
      b.faceX = dx / d;
      b.faceZ = dz / d;
    }
    // Crowding (Echo Step): any party body this close.
    let crowded = false;
    for (const p of ctx.partyBodies()) {
      if (Math.hypot(p.x - b.x, p.z - b.z) <= CANTOR.step.range + p.radius) {
        crowded = true;
        break;
      }
    }
    b.crowdTicks = crowded ? b.crowdTicks + 1 : 0;
    if (b.telegraph || d < 1e-6) return; // it holds still while it sings
    const K = CANTOR.keep;
    let adv = 0;
    if (d > K.far) adv = Math.min(CANTOR.moveSpeed * TICK_DT, d - K.far);
    else if (d < K.near) adv = -Math.min(CANTOR.moveSpeed * 0.7 * TICK_DT, K.near - d);
    if (adv !== 0) ctx.walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
  },

  resolve(ctx, b, tick) {
    // The Echo Step: faded out, it lands where it chose.
    if (b.mode === 'fade') {
      if (tick < b.fadeUntil) return;
      const to = b.stepTo || { x: b.x, z: b.z };
      b.x = to.x;
      b.z = to.z;
      b.px = to.x;
      b.pz = to.z;
      b.mode = 'sing';
      b.hittable = true;
      b.stepTo = null;
      b.crowdTicks = 0;
      ctx.events.emit(tick, 'boss_echo_land', { id: b.id, x: r2(b.x), z: r2(b.z) });
      // It sings at once from its new place.
      b.nextNoteTick = Math.min(b.nextNoteTick, tick + 12);
      return;
    }
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      ctx.endTelegraph(b, tick);
      if (t.attack === 'note') {
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        const shots = [];
        if (b.verse >= 2) {
          const E = CANTOR.echo;
          // The echo: shards out of the burst, turned a half step each note.
          const turn = ((b.notes | 0) % 2) * (Math.PI / E.shards);
          for (let k = 0; k < E.shards; k++) {
            const a = turn + (k / E.shards) * Math.PI * 2;
            const from = { id: b.id, x: t.x, z: t.z, kind: b.kind };
            shots.push(ctx.fireShot(from, tick, Math.cos(a), Math.sin(a), { speed: E.speed, range: E.range, power: E.damage * ctx.dmgMul() }).id);
          }
        }
        b.notes = (b.notes || 0) + 1;
        ctx.events.emit(tick, 'boss_note', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length, echo: shots.length, shots });
        ctx.hitAll(b, victims, CANTOR.note.damage, t.x, t.z);
        b.nextNoteTick = tick + (b.verse >= 3 ? CANTOR.note.verse3CdTicks : CANTOR.note.cdTicks);
      } else if (t.attack === 'lance') {
        const victims = ctx.partyBodies().filter((p) => {
          const px = p.x - t.fromX;
          const pz = p.z - t.fromZ;
          const along = px * t.dirX + pz * t.dirZ;
          if (along < -p.radius || along > t.length + p.radius) return false;
          return Math.abs(px * t.dirZ - pz * t.dirX) <= t.width / 2 + p.radius;
        });
        ctx.events.emit(tick, 'boss_sung_lance', { id: b.id, x: r2(t.fromX), z: r2(t.fromZ), dx: r2(t.dirX), dz: r2(t.dirZ), len: r2(t.length), victims: victims.length });
        ctx.hitAll(b, victims, CANTOR.lance.damage, t.fromX, t.fromZ, 'lane');
        b.nextLanceTick = tick + (b.verse >= 3 ? CANTOR.lance.verse3CdTicks : CANTOR.lance.cdTicks);
      } else if (t.attack === 'pulse') {
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        ctx.events.emit(tick, 'boss_heart_pulse', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
        ctx.shake(tick, 'boss_heart_pulse', t.x, t.z);
        ctx.hitAll(b, victims, CANTOR.pulse.damage, t.x, t.z);
        b.nextPulseTick = tick + CANTOR.pulse.cdTicks;
      }
      return;
    }
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    // Echo Step: no telegraph (it only moves), so the governor is not asked.
    const S = CANTOR.step;
    if (b.verse >= S.fromVerse && tick >= b.nextStepTick && b.crowdTicks >= S.crowdTicks) {
      const to = pickStep(ctx, b);
      if (to) {
        b.mode = 'fade';
        b.hittable = false;
        b.fadeUntil = tick + S.fadeTicks;
        b.stepTo = to;
        b.nextStepTick = tick + S.cdTicks;
        ctx.events.emit(tick, 'boss_echo_step', { id: b.id, x: r2(b.x), z: r2(b.z), tx: r2(to.x), tz: r2(to.z), landTick: b.fadeUntil });
        return;
      }
      b.nextStepTick = tick + 60;
    }
    if (!ctx.governorGrants(tick)) return;
    const d = Math.hypot(target.x - b.x, target.z - b.z);
    // Heart Pulse first when someone stands too close (Third Verse).
    const P = CANTOR.pulse;
    if (b.verse >= P.fromVerse && tick >= b.nextPulseTick) {
      let close = false;
      for (const p of ctx.partyBodies()) if (Math.hypot(p.x - b.x, p.z - b.z) <= P.trigger + p.radius) close = true;
      if (close) {
        ctx.startTelegraph(b, tick, { kind: 'ring', attack: 'pulse', ticks: P.telegraphTicks, x: b.x, z: b.z, radius: P.radius, targetId: target.id });
        b.nextPulseTick = tick + 100000; // armed on the resolve
        return;
      }
    }
    const L = CANTOR.lance;
    if (tick >= b.nextLanceTick && d >= L.minRange && d > 1e-6) {
      const dirX = (target.x - b.x) / d;
      const dirZ = (target.z - b.z) / d;
      const { mx, mz } = ctx.innerBounds(0.2);
      let len = L.maxLen;
      if (dirX > 1e-6) len = Math.min(len, (mx - b.x) / dirX);
      else if (dirX < -1e-6) len = Math.min(len, (-mx - b.x) / dirX);
      if (dirZ > 1e-6) len = Math.min(len, (mz - b.z) / dirZ);
      else if (dirZ < -1e-6) len = Math.min(len, (-mz - b.z) / dirZ);
      if (len >= 2) {
        ctx.startTelegraph(b, tick, {
          kind: 'lane',
          attack: 'lance',
          // Seats step sideways out of it like a Vein Lancer's lance.
          lance: true,
          ticks: L.telegraphTicks,
          fromX: b.x,
          fromZ: b.z,
          x: b.x + dirX * len,
          z: b.z + dirZ * len,
          dirX,
          dirZ,
          length: len,
          width: L.width,
          targetId: target.id,
        });
        b.nextLanceTick = tick + 100000;
        return;
      }
    }
    const N = CANTOR.note;
    if (tick >= b.nextNoteTick) {
      const { mx, mz } = ctx.innerBounds(0.3);
      ctx.startTelegraph(b, tick, {
        kind: 'ring',
        attack: 'note',
        ticks: N.telegraphTicks,
        x: Math.min(mx, Math.max(-mx, target.x)),
        z: Math.min(mz, Math.max(-mz, target.z)),
        radius: N.radius,
        targetId: target.id,
      });
      b.nextNoteTick = tick + 100000;
    }
  },

  // Each add phase is a verse: the land's adds come with it (boss.js spawns
  // them from addsByPhase), and the Cantor gains that verse's power.
  onAddPhase(ctx, b, tick) {
    b.verse = Math.min(3, (b.verse || 0) + 1);
    ctx.events.emit(tick, 'boss_verse', { id: b.id, verse: b.verse, x: r2(b.x), z: r2(b.z) });
  },

  view(b) {
    return { mode: b.mode, verse: b.verse | 0, fading: b.mode === 'fade' };
  },
};

// The step point farthest from every party body that the Cantor fits in.
function pickStep(ctx, b) {
  const party = ctx.partyBodies();
  const { mx, mz } = ctx.innerBounds(b.radius);
  let best = null;
  let bestD = -1;
  for (const [px, pz] of CANTOR.stepPoints) {
    const x = Math.min(mx, Math.max(-mx, px));
    const z = Math.min(mz, Math.max(-mz, pz));
    if (ctx.clearance(x, z, b.radius) < 0.05) continue;
    if (Math.hypot(x - b.x, z - b.z) < 3) continue;
    let near = Infinity;
    for (const p of party) near = Math.min(near, Math.hypot(p.x - x, p.z - z));
    if (near > bestD) {
      bestD = near;
      best = { x, z };
    }
  }
  return best;
}
