import { ARENA } from '../core/constants.js';
// REVIEW-ONLY (never committed, never pushed): Stonehide's kit 1.1
// (/mnt/project-files/stonehide-talents/STONEHIDE_SKILL_KIT.md) run inside the
// game for his ability review page. The recorder drives it through
// globalThis.__SH (cast, combo, dash, set); this module moves his body, deals
// the damage, applies the taunts and statuses, keeps Stone, Hearty, thorns and
// the rest, and tells the Tripo rig and the stand-in effects what to draw with
// `review_sh_*` events. Every number is the kit's.
const TICK = 60;
const r2 = (v) => Math.round(v * 100) / 100;
const sec = (s) => Math.round(s * TICK);

export const K = Object.freeze({
  hp: 150,
  stonePer: 0.03, stoneMax: 8, stoneLife: 6, stoneGap: 3,
  drCap: 0.6,
  growlEvery: 8, growlFirst: 3, growlReach: 6, growlTaunt: 3,
  heartyCap: 15, heartyAfter: 4,
  combo: { contacts: [0.3, 0.78, 1.42], dmg: [9, 9, 14], slamHp: 0.04, reach: 1.45, half: 65, slamR: 2, taunt1: 2, taunt3: 3, len: 2.15 },
  dash: { dist: 2.2, t0: 0.1, t1: 0.64, len: 1.3, aside: 1.0, hitR: 0.95, stun: 0.3, taunt: 2 },
  bellow: { r: 3, dmg: 6, taunt: 4 },
  rock: { reach: 7, dmg: 12, hp: 0.03, taunt: 4, stumble: 1.5, flight: 0.5, r: 1.3 },   // 1.7 (K1): lands on the aimed spot
  landslide: { len: 5, w: 2.4, dmg: 12, carry: 3, taunt: 3, slow: 0.3, slowS: 1.5, slideS: 0.45 },
  growlstone: { reach: 5, life: 8, every: 2, r: 3, taunt: 2, comboR: 2, comboWide: 1 },
  // 1.2: Fracture (S20) in Menace's place; Slabguard (S21) for Stand Fast; Bodyguard hops (S22); Fault Line throws up (S23); Colossus (S45).
  fracture: { at: 4, life: 4, gap: 0.5, dmg: 12, hp: 0.04, stun: 1, lock: 6 },
  slab: { secs: 3, arc: 120, front: 0.4, r: 5, taunt: 3, walk: 0.6, catchR: 1.25, shoveR: 1.5, shove: 14, shoveHp: 0.04, push: 1.5 },
  bodyguard: { reach: 6, r: 2.5, taunt: 3, hop: 0.4, recent: 1 },   // 1.7 (K3): swap places, no tie
  fault: { delay: 0.4, len: 6, w: 1.4, dmg: 30, hp: 0.06, lift: 0.6, liftFirst: 1, feet: 1.5, taunt: 2, rubble: 4, slow: 0.35, run: 0.25 },
  // 1.3: Stone Ring (S47), Slab Throw (S48), Grindstone (S49), Stone Cubs (S50), Wall slam (S51), Kick the stone, Weight of stone, Quills spread, Shots fly back.
  ring: { r: 3.5, secs: 4, rise: 0.3, taunt: 4, stones: 16, gap: 0.35 },
  throw: { reach: 7, bounces: 3, hop: 4, dmg: 14, hp: 0.03, taunt: 3, speed: 11 },
  grind: { secs: 6, self: 0.03, foe: 0.06, r: 2.5, floor: 0.1 },
  cubs: { n: 2, life: 10, speed: 4.5, search: 8, bite: 3, every: 0.5, hold: 0.4, holdGap: 1, climb: 0.5 },   // 1.7 (K9): bites hold, no taunt
  wall: { dmg: 10, hp: 0.03, stun: 0.5 },
  roll: { dist: 5, secs: 0.8, dmg: 16, aside: 1, taunt: 3, w: 0.75 },
  heart: { secs: 5, cap: 0.05 }, spin: { every: 5, gap: 1, r: 2, dmg: 14, hp: 0.03 },
  btoss: { grab: 1.5, dist: 5, lift: 0.55, fly: 0.5, r: 1.5, dmg: 20, hp: 0.05, stun: 0.6 },
  slamWeight: 60, spread: { n: 3, r: 3, dmg: 10 }, shotBack: 0.5,
  colossus: { grow: 0.5, secs: 8, scale: 2.0, hp: 0.3, dr: 0.2, dmg: 0.2, reach: 0.25, r: 4, taunt: 4 },
  burrow: { down: 0.25, tunnel: 0.6, dist: 5, r: 2.2, dmg: 24, hp: 0.06, lift: 0.6, taunt: 3 },
  rally: { r: 4, dr: 0.2, drS: 4, dmg: 0.2, dmgS: 3 },
  slam: { dmg: 34, hp: 0.08, n: 3, reach: 1.7, half: 55 },
  maul: { secs: 2, n: 6, reach: 1.4, half: 70, dmg: 7, hp: 0.01, haste: 0.05, hasteCap: 0.3, hasteS: 4 },
  bloodboil: { burn: 0.1, secs: 4, run: 0.4, touch: 0.9, shove: 0.6, dmg: 8, hp: 0.02 },   // 1.7 (K5): a rampage
  bite: { lunge: 1.5, reach: 2, dmg: 28, perPct: 0.8 },
  bristles: { secs: 5, push: 1.5, slow: 0.4, slowS: 1.5, melee: 2.2, gap: 1 },   // 1.7 (K2): pushes, returns nothing
  grudge: { secs: 3, dr: 0.2, reach: 8, dmg: 20, hp: 0.04, lift: 0.6 },   // 1.7 (K6): spikes under each foe that hit him
  briar: { reach: 4, r: 2.4, secs: 5, dps: 6, slow: 0.25 },   // 1.7 (K7): no 'attacks from inside' line
  quills: { r: 4, n: 8, dmg: 10, secs: 5, back: 6 },
  // 1.6 combos (S58, S59, S60): C1 throw the stone, C2 slab pinball, C3 rubble is ammo, C4 cubs copy him,
  // C5 Spike, C7 slab charge, C8 thorn slam, C9 Grudge bursts the quills
  c6: { stoneNear: 2, stoneLand: 1.5, stoneDmg: 16, stoneTaunt: 3, stoneFly: 0.6, rubbleNear: 2, rubbleR: 1.2, rocks: 3, rockGap: 0.12,
    pinStones: 2, pinHop: 4, spike: 0.5, spikeR: 1.5, spikeDmg: 10, cubBurst: 8, cubBurstR: 1.5, cubRoarR: 2, cubRoar: 2,
    carry: 1.5, impale: 12, impaleHp: 0.03, burstN: 3, burstR: 3, burstDmg: 10 },
});

// The cast move of each skill and its effect frame in that clip (the press
// starts the clip 0.1 s before it, so the effect lands 0.1 s after the press).
// Every skill has its own move, baked so its contact frame is LEAD after the press (tools/motion/moves.mjs).
const MOVE = {
  bellow: 'bellow', rock_toss: 'toss', landslide: 'haul', growlstone: 'summonStone', slabguard: 'guardUp', colossus: 'colossus',
  stone_ring: 'plant', slab_throw: 'throw', grindstone: 'grind', stone_cubs: 'callCubs', stoneheart: 'stoneheart', fault_line: 'faultLine',
  rallying_cry: 'rally', heavy_slam: 'heavySlam', bloodboil: 'boil', iron_bristles: 'bristle', grudge: 'grudgeBrace', iron_briar: 'scatter',
  iron_quills: 'quills',
};
const LEAD = 0.1;
// The four big skills take a long wind-up (Kesh's yes, 18 Nov): the effect lands WIND after the press. Grudge's slam lands
// GRUDGE_WIND after its count ends (its move starts 0.3 s before that), and Badger Toss lets go after btoss.lift.
const WIND = 0.3, GRUDGE_WIND = 0.35;
const LEADS = { heavy_slam: WIND, colossus: WIND };

export function installStonehideReview({ registry, events, combat, getTick }) {
  const S = combat.status;
  const tank = () => registry.all().find((e) => e.kind === 'ally' && e.partyIndex === 1) || null;
  const hostiles = () => registry.all().filter((e) => e.faction === 'hostile' && e.hp > 0 && e.hittable !== false && e.kind !== 'eshot');
  const party = () => registry.all().filter((e) => e.partyIndex !== undefined && e.hp > 0);
  const d2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
  const emit = (type, ev) => events.emit(getTick(), type, ev);
  const isBig = (e) => !!(e.boss || e.isBoss || e.champion || e.isChampion);

  const st = {
    queue: [], act: null, timers: [], stone: 0, stoneTick: -1e9, hearty: 0, maxHp: K.hp,
    fightTick: null, nextGrowl: null,
    dr: { stand: 0, rally: 0, grudge: 0, guard: 0, giant: 0 }, buffs: {}, growl: true, fracture: false, cracks: new Map(), slab: null, giant: null, ringSt: null, thrown: null, grind: null, cubs: [], heart: 0, spinOn: false, spinN: 0, spinAt: -1e9, shooter: new Map(), quillCast: new Map(), quillN: 0,
    stoneOn: true, look: { stone: 0, thorns: 0, ore: 0, rust: 0, stoneSkin: 0 },
    growlstone: null, briar: null, rubble: [], guard: null, bristles: 0, grudge: null, lastHitOn: new Map(), bristleAt: new Map(), rampage: null, quilled: new Map(), maulHaste: [],
    tauntUntil: new Map(), lastStoneFrom: new Map(), log: [], shield: true,
  };
  let busy = false; // guards the damage hook against its own blows

  // ---- damage, taunt, Stone ----
  function hit(t, amount, { src, dirFrom = null, kb = null, delivery = 'skill' } = {}) {
    const a = tank();
    if (!a || !t || !(t.hp > 0)) return null;
    const o = dirFrom || a;
    const dx = t.x - o.x, dz = t.z - o.z, l = Math.hypot(dx, dz) || 1;
    if (st.giant && src !== 'shatter') amount *= 1 + K.colossus.dmg;
    // Spike (S58): Heavy Slam, basic hit 3 or Savage Bite on a foe he threw up, before it lands
    const spiked = (src === 'slam' || src === 'basic3' || src === 'bite') && t.reviewLift && !isBig(t);
    if (spiked) amount *= 1 + K.c6.spike;
    busy = true;
    const r = combat.applyDamage(t, amount, { delivery, shape: 'nova', dirX: dx / l, dirZ: dz / l, attacker: a.id, source: 'sh_' + src, ...(kb != null ? { kbDist: kb } : { kbScale: 0.4 }) });
    busy = false;
    if (st.fracture && t.hp > 0 && src !== 'cub') crack(t, a.id, /^(basic|thorns|quill_back|briar_back|shot_back)$/.test(src));
    if (spiked) {
      t.reviewLift = null;
      t.reviewY = 0;
      emit('review_sh_spike', { id: t.id, x: r2(t.x), z: r2(t.z), r: K.c6.spikeR });
      for (const f of hostiles()) if (f !== t && d2(f, t) <= K.c6.spikeR ** 2) hit(f, K.c6.spikeDmg, { src: 'spike', dirFrom: t, kb: 0 });
    }
    return r;
  }
  // Fracture (S20): a counted mark, at most one per attacker each half second; at 4 the foe shatters.
  function crack(e, by, canStart) {
    if (!st.fracture || !(e.hp > 0)) return;
    const tick = getTick(), F = K.fracture;
    let c = st.cracks.get(e.id);
    if (c && c.lock > tick) return;
    if (c && c.n > 0 && tick > c.until) c.n = 0;
    if (!c || c.n === 0) {
      if (!canStart) return;
      c = c || { n: 0, until: 0, lock: 0, by: new Map() };
      c.by.clear();
      st.cracks.set(e.id, c);
    }
    if (tick - (c.by.get(by) ?? -1e9) < sec(F.gap)) return;
    c.by.set(by, tick);
    c.n += 1;
    c.until = tick + sec(F.life);
    emit('review_sh_crack', { id: e.id, n: c.n });
    if (c.n >= F.at) {
      c.n = 0;
      c.lock = tick + sec(F.lock);
      emit('review_sh_shatter', { id: e.id, x: r2(e.x), z: r2(e.z) });
      const big = isBig(e);
      hit(e, (F.dmg + weight(F.hp)) * (big ? 2 : 1), { src: 'shatter', kb: 0 });
      if (!big && e.hp > 0) S.apply(e, 'stun', 1, sec(F.stun), tick, tank()?.id ?? null);
    }
  }
  // Thrown up (Fault Line, Burrow): stunned while the body flies (the renderer reads e.reviewY).
  function lift(e, secs) {
    if (isBig(e) || !(e.hp > 0)) return;
    S.apply(e, 'stun', 1, sec(secs), getTick(), tank()?.id ?? null);
    e.reviewLift = { t0: getTick(), ticks: sec(secs), h: 0.55 + 0.55 * secs };
    emit('review_sh_lift', { id: e.id, secs });
  }
  function weight(p) {
    return Math.round(p * st.maxHp * 10) / 10;
  }
  function taunt(e, secs, { from = null } = {}) {
    const a = tank();
    if (!a || !(e.hp > 0)) return false;
    const tick = getTick();
    const ok = S.apply(e, 'taunt', 1, sec(secs), tick, a.id);
    if (ok) st.tauntUntil.set(e.id, tick + sec(secs));
    crack(e, a.id, true);
    emit('review_sh_taunt', { id: e.id, ok: !!ok, from: from ? { x: r2(from.x), z: r2(from.z) } : null });
    // Stone: one per foe taunted (3 for a boss or champion; a boss that shrugs it off still gives 1), the same foe at most every 3 s.
    if (st.stoneOn) {
      const last = st.lastStoneFrom.get(e.id) ?? -1e9;
      if (tick - last >= sec(K.stoneGap)) {
        st.lastStoneFrom.set(e.id, tick);
        addStone(ok ? (isBig(e) ? 3 : 1) : 1);
      }
    }
    return !!ok;
  }
  function addStone(n) {
    const before = st.stone;
    st.stone = Math.min(K.stoneMax, st.stone + n);
    st.stoneTick = getTick();
    if (st.stone !== before) emit('review_sh_stone', { n: st.stone, gained: st.stone - before });
  }
  const inFan = (a, t, dir, reach, half) => {
    const dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz);
    if (d > reach + (t.radius ?? 0.3)) return false;
    if (d < 0.2) return true;
    return (dx * dir.x + dz * dir.z) / d >= Math.cos((half * Math.PI) / 180);
  };
  const inStrip = (o, dir, len, w, t) => {
    const dx = t.x - o.x, dz = t.z - o.z;
    const along = dx * dir.x + dz * dir.z, across = Math.abs(-dx * dir.z + dz * dir.x);
    return along >= -0.3 && along <= len + 0.3 && across <= w / 2 + (t.radius ?? 0.3) * 0.5;
  };
  function shove(e, dx, dz, dist, secs) {
    if (!e.knockbackable || !(dist > 0.01)) return;
    const l = Math.hypot(dx, dz) || 1, ticks = Math.max(1, sec(secs));
    e.kbVx = (dx / l) * (dist / ticks);
    e.kbVz = (dz / l) * (dist / ticks);
    e.kbTicks = ticks;
    e.reviewPush = { dx: dx / l, dz: dz / l, until: getTick() + ticks + 1, done: false, inBriar: !!(st.briar && d2(e, st.briar) <= K.briar.r ** 2) };
  }
  // Wall slam (S51): a foe he pushes that meets a room wall or a ring stone, once per push.
  function wallCheck(e) {
    const P = e.reviewPush;
    if (!P || P.done) return;
    if (getTick() > P.until) { e.reviewPush = null; return; }
    const r = e.radius ?? 0.4;
    // Thorn slam (1.6, C8): pushed into his Iron Briar, it is impaled
    if (st.briar && !P.inBriar && d2(e, st.briar) <= K.briar.r ** 2) {
      P.done = true;
      impale(e);
      return;
    }
    let wall = null;
    if (P.dx > 0.3 && e.x >= ARENA.halfW - r - 0.06) wall = { x: ARENA.halfW, z: e.z };
    else if (P.dx < -0.3 && e.x <= -ARENA.halfW + r + 0.06) wall = { x: -ARENA.halfW, z: e.z };
    else if (P.dz > 0.3 && e.z >= ARENA.halfD - r - 0.06) wall = { x: e.x, z: ARENA.halfD };
    else if (P.dz < -0.3 && e.z <= -ARENA.halfD + r + 0.06) wall = { x: e.x, z: -ARENA.halfD };
    else if (e.reviewRingHit) wall = e.reviewRingHit;
    if (!wall) return;
    P.done = true;
    e.kbTicks = 0;
    emit('review_sh_wallslam', { id: e.id, x: r2(wall.x), z: r2(wall.z), ex: r2(e.x), ez: r2(e.z), dx: r2(P.dx), dz: r2(P.dz) });
    hit(e, K.wall.dmg + weight(K.wall.hp), { src: 'wall', kb: 0 });
    if (!isBig(e) && e.hp > 0) S.apply(e, 'stun', 1, sec(K.wall.stun), getTick(), tank()?.id ?? null);
  }
  function impale(e) {
    emit('review_sh_impale', { id: e.id, x: r2(e.x), z: r2(e.z) });
    hit(e, K.c6.impale + weight(K.c6.impaleHp), { src: 'impale', kb: 0 });
    if (e.hp > 0) {
      st.quilled.set(e.id, getTick() + sec(K.quills.secs));
      st.quillCast.set(e.id, { hit: new Set([e.id]) });
      emit('review_sh_quills', { ids: [e.id], x: r2(e.x), z: r2(e.z), r: 0.6 });
    }
  }
  // Rubble (S59): Fault Line's strip, or a round patch (Burrow, a giant's slam)
  function nearRubble(p, d) {
    for (const r of st.rubble) {
      if (r.round) { if (d2(p, r) <= (d + r.r) ** 2) return r; continue; }
      const dx = p.x - r.x, dz = p.z - r.z, along = Math.max(0, Math.min(r.len, dx * r.dx + dz * r.dz));
      if ((p.x - (r.x + r.dx * along)) ** 2 + (p.z - (r.z + r.dz * along)) ** 2 <= (d + r.w / 2) ** 2) return r;
    }
    return null;
  }
  function addRubble(x, z) {
    const id = getTick() * 7 + st.rubble.length;
    st.rubble.push({ id, round: true, x, z, r: K.c6.rubbleR, until: getTick() + sec(K.fault.rubble) });
    emit('review_sh_rubble', { id, x: r2(x), z: r2(z), r: K.c6.rubbleR, secs: K.fault.rubble });
  }
  // Rock Toss (S17, 1.7): a rock lobbed onto a spot; every foe within 1.3 u of it when it lands is hit,
  // taunted and stumbles toward him. It flies over stones, rubble and the briar.
  function throwRock(a, dir, to, delay = 0) {
    const go = () => {
      const t = tank();
      emit('review_sh_rock', { x0: r2(t.x + dir.x * 0.3), z0: r2(t.z + dir.z * 0.3), x1: r2(to.x), z1: r2(to.z), id: null, secs: K.rock.flight });
      later(K.rock.flight, () => {
        emit('review_sh_dust', { x: r2(to.x), z: r2(to.z), r: K.rock.r * 0.8 });
        emit('review_sh_ring', { x: r2(to.x), z: r2(to.z), r: K.rock.r, kind: 'burst' });
        for (const e of hostiles()) if (d2(e, to) <= K.rock.r ** 2) {
          hit(e, K.rock.dmg + weight(K.rock.hp), { src: 'rock', dirFrom: to, kb: 0 });
          taunt(e, K.rock.taunt, { from: to });
          const tk = tank();
          if (!isBig(e) && tk) shove(e, tk.x - e.x, tk.z - e.z, K.rock.stumble, 0.3);
        }
      });
    };
    if (delay > 0) later(delay, go); else go();
  }
  function slowOn(e, mag, secs) {
    S.apply(e, 'slow', mag, sec(secs), getTick(), tank()?.id ?? null);
  }

  // ---- the damage hook: his reduction, thorns, Grudge, Bodyguard, Iron Briar, Iron Quills ----
  const raw = combat.applyDamage;
  combat.applyDamage = (target, base, o = {}) => {
    if (busy) return raw(target, base, o);
    const a = tank();
    const atk = o.attacker != null ? registry.byId(o.attacker) : null;
    const hostileHit = !!(atk && atk.faction === 'hostile');
    // Bodyguard (S22, 1.7): who hit whom, so the landing can taunt the foes that were on the ally.
    if (hostileHit && target.partyIndex !== undefined) st.lastHitOn.set(atk.id, { id: target.id, tick: getTick() });
    // Fracture (S20): an ally's hit on a cracked foe adds a Crack.
    if (st.fracture && atk && atk.partyIndex !== undefined && atk.partyIndex !== 1 && target.faction === 'hostile') {
      const r = raw(target, base, o);
      crack(target, atk.id, false);
      return r;
    }
    // Counter Spin (S54): every 5th hit he takes, he spins (at most once a second).
    if (hostileHit && a && st.spinOn && target.id === a.id) {
      st.spinN += 1;
      emit('review_sh_spincount', { n: st.spinN % K.spin.every || K.spin.every });
      if (st.spinN >= K.spin.every && getTick() - st.spinAt >= sec(K.spin.gap)) {
        st.spinN = 0;
        st.spinAt = getTick();
        later(0.02, spin);
      }
    }
    // Slabguard (S21): a hit from the slab's front is 40% smaller.
    if (hostileHit && a && st.slab && target.id === a.id) {
      const dx = atk.x - a.x, dz = atk.z - a.z, l = Math.hypot(dx, dz) || 1;
      if ((dx * st.slab.dx + dz * st.slab.dz) / l >= Math.cos((K.slab.arc / 2) * Math.PI / 180)) base *= 1 - K.slab.front;
    }
    // Iron Quills (S33) and Iron Briar (S32): a foe that attacks pays.
    if (hostileHit && target.partyIndex !== undefined) {
      const tick = getTick();
      if ((st.quilled.get(atk.id) ?? -1) > tick) {
        hit(atk, K.quills.back, { src: 'quill_back', dirFrom: target });
        emit('review_sh_quillback', { id: atk.id });
      }
    }
    // Stoneheart (S53): reduced first, then no hit takes more than 5% of his max health.
    if (hostileHit && a && target.id === a.id && st.heart > getTick()) {
      const after = base * (a.takenMul ?? 1), cap = st.maxHp * K.heart.cap;
      if (after > cap) {
        emit('review_sh_capped', { thrown: Math.round(after), took: Math.round(cap * 10) / 10, x: r2(a.x), z: r2(a.z) });
        const r = raw(target, cap / (a.takenMul || 1), o);
        return r;
      }
    }
    if (hostileHit && a && target.id === a.id) {
      // Grudge (S31, 1.7) marks the foe that hit him.
      if (st.grudge && st.grudge.phase === 'count' && !st.grudge.marked.has(atk.id)) {
        st.grudge.marked.add(atk.id);
        st.grudge.n = st.grudge.marked.size;
        emit('review_sh_grudge', { n: st.grudge.n, mark: atk.id });
      }
      // Iron Bristles (S30, 1.7): a foe that hits him in melee is pushed 1.5 u and slowed; nothing goes back.
      if (st.bristles > getTick() && atk.hp > 0 && d2(atk, a) <= K.bristles.melee ** 2) {
        const tick = getTick(), last = st.bristleAt.get(atk.id) ?? -1e9;
        if (tick - last >= sec(K.bristles.gap)) {
          st.bristleAt.set(atk.id, tick);
          const r = raw(target, base, o);
          emit('review_sh_thorn', { from: { x: r2(a.x), z: r2(a.z) }, id: atk.id, amount: 0 });
          slowOn(atk, K.bristles.slow, K.bristles.slowS);
          if (!isBig(atk)) shove(atk, atk.x - a.x, atk.z - a.z, K.bristles.push, 0.25);
          emit('review_sh_dust', { x: r2(atk.x), z: r2(atk.z), r: 0.5 });
          return r;
        }
      }
    }
    return raw(target, base, o);
  };

  events.on('enemy_fire', (ev) => st.shooter.set(ev.shot, ev.id));
  // Iron Quills (1.3): a quilled foe that falls bursts; its quills fly on to 3 more within 3 u.
  events.on('death', (ev) => {
    const q = st.quillCast.get(ev.id);
    if (!q || (st.quilled.get(ev.id) ?? -1) < getTick()) return;
    st.quillCast.delete(ev.id);
    const at = { x: ev.x, z: ev.z };
    const list = hostiles().filter((e) => e.id !== ev.id && !q.hit.has(e.id) && d2(e, at) <= K.spread.r ** 2).sort((p, w) => d2(p, at) - d2(w, at)).slice(0, K.spread.n);
    if (!list.length) return;
    emit('review_sh_quills', { ids: list.map((e) => e.id), x: r2(at.x), z: r2(at.z), r: K.spread.r, spread: true });
    later(0.22, () => {
      for (const e of list) {
        q.hit.add(e.id);
        st.quilled.set(e.id, getTick() + sec(K.quills.secs));
        st.quillCast.set(e.id, q);
        hit(e, K.spread.dmg, { src: 'quills', kb: 0 });
      }
    });
  });
  // Hearty (S13 step 4): a foe that falls while taunted by him, or within 4 s after.
  events.on('death', (ev) => {
    const until = st.tauntUntil.get(ev.id);
    if (until == null) return;
    st.tauntUntil.delete(ev.id);
    if (getTick() > until + sec(K.heartyAfter)) return;
    const n = Math.min(1, K.heartyCap - st.hearty);
    if (n <= 0) return;
    st.hearty += n;
    st.maxHp += n;
    const a = tank();
    if (a) {
      a.maxHp = st.maxHp;
      a.hp = Math.min(a.maxHp, a.hp + n);
    }
    emit('review_sh_hearty', { n, total: st.hearty, x: ev.x, z: ev.z, maxHp: st.maxHp });
  });

  // ---- actions ----
  function aimDir(a, aim) {
    const dx = (aim?.x ?? a.x + (a.faceX ?? 0)) - a.x, dz = (aim?.z ?? a.z + (a.faceZ ?? 1)) - a.z, l = Math.hypot(dx, dz);
    return l > 1e-4 ? { x: dx / l, z: dz / l } : { x: a.faceX ?? 0, z: a.faceZ ?? 1 };
  }
  function play(clip, from = 0, extra = {}) {
    emit('review_sh_play', { clip, from, ...extra });
  }
  const later = (secs, fn) => st.timers.push({ at: getTick() + sec(secs), fn });

  function startCast(id, aim) {
    const a = tank();
    if (!a) return;
    const dir = aimDir(a, aim);
    const mv = MOVE[id];
    if (mv) play(mv, 0);
    emit('skill_cast_review', { skill: id });
    const at = (fn) => later(LEADS[id] ?? LEAD, () => fn(tank(), dir, aim));
    const C = CAST[id];
    if (C) C(a, dir, aim || { x: a.x + dir.x * 3, z: a.z + dir.z * 3 }, at);
  }

  const CAST = {
    bellow: (a, dir, aim, at) => at((a) => {
      emit('review_sh_ring', { x: r2(a.x), z: r2(a.z), r: K.bellow.r, kind: 'roar' });
      for (const e of hostiles()) if (d2(e, a) <= K.bellow.r ** 2) {
        hit(e, K.bellow.dmg, { src: 'bellow' });
        taunt(e, K.bellow.taunt);
      }
      const roared = [];
      for (const cb of st.cubs) {
        if (cb.state === 'dig') continue;
        roared.push(cb.id);
        emit('review_sh_ring', { x: r2(cb.x), z: r2(cb.z), r: K.c6.cubRoarR, kind: 'roar' });
        for (const e of hostiles()) if (d2(e, cb) <= K.c6.cubRoarR ** 2) taunt(e, K.c6.cubRoar, { from: { x: cb.x, z: cb.z } });
      }
      if (roared.length) emit('review_sh_cubs', { roar: roared });
    }),
    rock_toss: (a, dir, aim, at) => at((a) => {
      // 1.7 (K1): the rock lands on the spot he aims, up to 7 u away
      const ax = (aim || a).x - a.x, az = (aim || a).z - a.z, ad = Math.hypot(ax, az), k = ad > K.rock.reach ? K.rock.reach / ad : 1;
      const spot = ad > 0.01 ? { x: a.x + ax * k, z: a.z + az * k } : { x: a.x + dir.x * 3, z: a.z + dir.z * 3 };
      const g = st.growlstone, C6 = K.c6;
      if (g && !g.roll && !g.fly && d2(g, a) <= C6.stoneNear ** 2) {
        // C1: he throws the Growlstone; it lands on the aimed spot and roars at once
        g.fly = { t: 0, x0: g.x, z0: g.z, x1: spot.x, z1: spot.z };
        emit('review_sh_stonefly', { id: g.id, start: true });
        return;
      }
      const rub = nearRubble(a, C6.rubbleNear);
      if (rub) {
        // C3: three rocks from the rubble, on the spot and on the two foes nearest it; the rubble is used up
        st.rubble = st.rubble.filter((r) => r !== rub);
        emit('review_sh_rubble_gone', { id: rub.id });
        const more = hostiles().filter((e) => d2(e, a) <= K.rock.reach ** 2 && d2(e, spot) > 0.25).sort((p, q) => d2(p, spot) - d2(q, spot)).slice(0, C6.rocks - 1);
        [spot, ...more.map((e) => ({ x: e.x, z: e.z }))].forEach((p, i) => throwRock(a, dir, p, i * C6.rockGap));
        return;
      }
      throwRock(a, dir, spot);
    }),
    landslide: (a, dir, aim, at) => at((a) => {
      const o = { x: a.x, z: a.z };
      emit('review_sh_slide', { x: r2(o.x), z: r2(o.z), dx: r2(dir.x), dz: r2(dir.z), len: K.landslide.len, w: K.landslide.w, secs: K.landslide.slideS });
      for (const e of hostiles()) if (inStrip(o, dir, K.landslide.len, K.landslide.w, e)) {
        hit(e, K.landslide.dmg, { src: 'landslide', kb: 0 });
        taunt(e, K.landslide.taunt);
        slowOn(e, K.landslide.slow, K.landslide.slowS);
        if (!isBig(e)) {
          const d = Math.hypot(e.x - a.x, e.z - a.z);
          shove(e, a.x - e.x, a.z - e.z, Math.min(K.landslide.carry, Math.max(0, d - 1.0)), K.landslide.slideS);
        }
      }
    }),
    growlstone: (a, dir, aim, at) => at((a) => {
      const dx = aim.x - a.x, dz = aim.z - a.z, d = Math.hypot(dx, dz), k = d > K.growlstone.reach ? K.growlstone.reach / d : 1;
      if (st.growlstone) emit('review_sh_stone_gone', { id: st.growlstone.id });
      st.growlstone = { id: getTick(), x: a.x + dx * k, z: a.z + dz * k, until: getTick() + sec(K.growlstone.life), next: getTick() + sec(0.5) };
      emit('review_sh_growlstone', { id: st.growlstone.id, x: r2(st.growlstone.x), z: r2(st.growlstone.z), life: K.growlstone.life });
    }),
    fracture: () => {
      st.fracture = !st.fracture;
    },
    slabguard: (a, dir, aim, at) => at((a) => {
      const until = getTick() + sec(K.slab.secs);
      st.slab = { dx: dir.x, dz: dir.z, until };
      S.apply(a, 'slow', 1 - K.slab.walk, sec(K.slab.secs), getTick(), a.id);
      emit('review_sh_slab', { on: true, dx: r2(dir.x), dz: r2(dir.z), secs: K.slab.secs, rip: !st.shield, x: r2(a.x), z: r2(a.z) });
      for (const e of hostiles()) {
        const dx = e.x - a.x, dz = e.z - a.z, l = Math.hypot(dx, dz) || 1;
        if (l <= K.slab.r && (dx * dir.x + dz * dir.z) / l >= Math.cos((K.slab.arc / 2) * Math.PI / 180)) taunt(e, K.slab.taunt);
      }
    }),
    bodyguard: (a) => {
      let best = null;
      for (const m of party()) {
        if (m.id === a.id || d2(m, a) > K.bodyguard.reach ** 2) continue;
        if (!best || m.hp / m.maxHp < best.hp / best.maxHp) best = m;
      }
      if (!best) return;
      // 1.7 (K3): they swap places. He lands where the ally stood; the ally is lifted to the spot he left.
      const to = { x: best.x, z: best.z };
      st.act = { kind: 'hop', t: 0, x0: a.x, z0: a.z, to, ally: best, ax0: best.x, az0: best.z };
      emit('review_sh_dust', { x: r2(best.x), z: r2(best.z), r: 0.5 });
      emit('review_sh_hop', { secs: K.bodyguard.hop, dx: r2(to.x - a.x), dz: r2(to.z - a.z) });
    },
    stone_ring: (a, dir, aim, at) => at((a) => {
      const R = K.ring;
      st.ringSt = { x: a.x, z: a.z, until: getTick() + sec(R.rise + R.secs), side: new Map() };
      for (const e of hostiles()) {
        const inside = d2(e, a) < R.r ** 2;
        st.ringSt.side.set(e.id, inside);
        if (inside) taunt(e, R.taunt);
      }
      emit('review_sh_stonering', { on: true, x: r2(a.x), z: r2(a.z), r: R.r, n: R.stones, rise: R.rise, secs: R.secs });
    }),
    slab_throw: (a, dir, aim, at) => at((a) => {
      if (st.thrown) return;
      const T = K.throw;
      const first = hostiles().filter((e) => d2(e, a) <= T.reach ** 2).sort((p, q) => d2(p, aim || a) - d2(q, aim || a))[0];
      if (!first) return;
      st.thrown = { x: a.x + dir.x * 0.5, z: a.z + dir.z * 0.5, target: first.id, hit: new Set(), n: 0, back: false, rip: !st.shield };
      emit('review_sh_slabthrow', { on: true, rip: !st.shield, x: r2(st.thrown.x), z: r2(st.thrown.z) });
    }),
    grindstone: (a, dir, aim, at) => at(() => {
      st.grind = { until: getTick() + sec(K.grind.secs), next: getTick() + sec(0.5) };
      emit('review_sh_grind', { on: true, r: K.grind.r, secs: K.grind.secs });
    }),
    stone_cubs: (a, dir, aim, at) => at((a) => {
      const C = K.cubs;
      if (st.cubs.length) emit('review_sh_cubs', { gone: st.cubs.map((c) => c.id) });
      st.cubs = [];
      for (let i = 0; i < C.n; i++) {
        const side = i === 0 ? 1 : -1;
        st.cubs.push({ id: getTick() * 10 + i, x: a.x - dir.z * 0.8 * side + dir.x * 0.3, z: a.z + dir.x * 0.8 * side + dir.z * 0.3, fx: dir.x, fz: dir.z, born: getTick(), until: getTick() + sec(C.life), target: null, next: 0, state: 'climb' });
      }
      emit('review_sh_cubs', { born: st.cubs.map((c) => ({ id: c.id, x: r2(c.x), z: r2(c.z) })) });
    }),
    stoneheart: (a, dir, aim, at) => at(() => {
      st.heart = getTick() + sec(K.heart.secs);
      emit('review_sh_heart', { on: true, secs: K.heart.secs });
    }),
    badger_toss: (a, dir, aim) => {
      const B = K.btoss;
      const foe = hostiles().filter((e) => d2(e, a) <= (B.grab + (e.radius ?? 0.4)) ** 2).sort((p, q) => d2(p, aim || a) - d2(q, aim || a))[0];
      if (!foe) return;
      play('grab', 0);
      if (isBig(foe)) { later(B.lift, () => hit(foe, B.dmg + weight(B.hp), { src: 'btoss' })); return; }
      let dx = (aim ? aim.x : a.x + dir.x * B.dist) - a.x, dz = (aim ? aim.z : a.z + dir.z * B.dist) - a.z;
      const l = Math.hypot(dx, dz) || 1, d = Math.min(B.dist, l);
      let tx = a.x + (dx / l) * d, tz = a.z + (dz / l) * d, wall = null;
      const r = foe.radius ?? 0.4, mx = ARENA.halfW - r, mz = ARENA.halfD - r;
      if (Math.abs(tx) > mx) { wall = { x: Math.sign(tx) * ARENA.halfW, z: tz }; tx = Math.sign(tx) * mx; }
      if (Math.abs(tz) > mz) { wall = { x: tx, z: Math.sign(tz) * ARENA.halfD }; tz = Math.sign(tz) * mz; }
      // a stone of his own Stone Ring stops the throw like a wall (S51)
      const R = st.ringSt;
      if (R && d2(foe, R) < K.ring.r ** 2 && (tx - R.x) ** 2 + (tz - R.z) ** 2 > (K.ring.r - 0.45) ** 2) {
        const sx = a.x - R.x, sz = a.z - R.z, ux = dx / l, uz = dz / l;
        const bq = sx * ux + sz * uz, cq = sx * sx + sz * sz - (K.ring.r - 0.45) ** 2;
        const tt = -bq + Math.sqrt(Math.max(0, bq * bq - cq));
        tx = a.x + ux * tt; tz = a.z + uz * tt;
        wall = { x: R.x + ((tx - R.x) * K.ring.r) / (K.ring.r - 0.45), z: R.z + ((tz - R.z) * K.ring.r) / (K.ring.r - 0.45) };
      }
      S.apply(foe, 'stun', 1, sec(B.lift + B.fly + 0.1), getTick(), a.id);
      st.btoss = { id: foe.id, t: 0, x0: foe.x, z0: foe.z, hx: a.x + dir.x * 0.55, hz: a.z + dir.z * 0.55, tx, tz, wall, dx: dx / l, dz: dz / l };
      emit('review_sh_btoss', { id: foe.id, phase: 'grab' });
    },
    colossus: (a, dir, aim, at) => at((a) => {
      const C = K.colossus;
      const got = hostiles().filter((e) => d2(e, a) <= C.r ** 2);
      emit('review_sh_colossus', { x: r2(a.x), z: r2(a.z), r: C.r, ids: got.map((e) => e.id) }); // REVIEW-ONLY dream-loop look
      for (const e of got) taunt(e, C.taunt);
      later(0.15, () => {
        const t = tank();
        const share = t.hp / t.maxHp;
        st.giant = { until: getTick() + sec(C.secs), base: st.maxHp };
        st.maxHp = Math.round(st.maxHp * (1 + C.hp));
        t.maxHp = st.maxHp;
        t.hp = share * st.maxHp;
        st.dr.giant = C.dr;
        emit('review_sh_giant', { on: true, scale: C.scale, secs: C.grow });
      });
    }),
    fault_line: (a, dir, aim, at) => at((a) => {
      const o = { x: a.x + dir.x * 0.5, z: a.z + dir.z * 0.5 };
      emit('review_sh_fault_warn', { x: r2(o.x), z: r2(o.z), dx: r2(dir.x), dz: r2(dir.z), len: K.fault.len, w: K.fault.w, secs: K.fault.delay });
      later(K.fault.delay, () => {
        const fid = getTick() * 7 + 5;
        emit('review_sh_fault', { id: fid, x: r2(o.x), z: r2(o.z), dx: r2(dir.x), dz: r2(dir.z), len: K.fault.len, w: K.fault.w, run: K.fault.run, rubble: K.fault.rubble });
        const t0 = tank();
        const on = hostiles().filter((e) => inStrip(o, dir, K.fault.len, K.fault.w, e)).map((e) => ({ e, along: (e.x - o.x) * dir.x + (e.z - o.z) * dir.z })).sort((p, q) => p.along - q.along);
        const feet = hostiles().filter((e) => !on.some((q) => q.e === e) && d2(e, t0) <= K.fault.feet ** 2);
        on.forEach(({ e, along }, i) => later(Math.max(0, (along / K.fault.len) * K.fault.run), () => {
          if (!(e.hp > 0)) return;
          hit(e, K.fault.dmg + weight(K.fault.hp), { src: 'fault', kb: 0 });
          lift(e, i === 0 ? K.fault.liftFirst : K.fault.lift);
          taunt(e, K.fault.taunt);
        }));
        if (feet.length) emit('review_sh_ring', { x: r2(t0.x), z: r2(t0.z), r: K.fault.feet, kind: 'burst' });
        for (const e of feet) {
          hit(e, K.fault.dmg + weight(K.fault.hp), { src: 'fault', kb: 0 });
          lift(e, K.fault.lift);
          taunt(e, K.fault.taunt);
        }
        st.rubble.push({ id: fid, x: o.x, z: o.z, dx: dir.x, dz: dir.z, len: K.fault.len, w: K.fault.w, until: getTick() + sec(K.fault.rubble) });
        shakeStone(o.x + dir.x * K.fault.len * 0.5, o.z + dir.z * K.fault.len * 0.5, K.fault.len * 0.5 + 0.5);
      });
    }),
    burrow: (a, dir, aim) => {
      const dist = Math.min(K.burrow.dist, Math.max(1, Math.hypot(aim.x - a.x, aim.z - a.z)));
      st.act = { kind: 'burrow', t: 0, x0: a.x, z0: a.z, dir, dist };
      emit('review_sh_dig', { phase: 'down', x: r2(a.x), z: r2(a.z) });
      play('digDown', 0);
      if (st.cubs.length) {
        for (const cb of st.cubs) { cb.state = 'dig'; cb.target = null; }
        emit('review_sh_cubs', { dig: st.cubs.map((c) => c.id) });
      }
    },
    rallying_cry: (a, dir, aim, at) => at((a) => {
      emit('review_sh_ring', { x: r2(a.x), z: r2(a.z), r: K.rally.r, kind: 'rally' });
      st.dr.rally = K.rally.dr;
      st.rallyUntil = getTick() + sec(K.rally.drS);
      const got = [];
      for (const m of party()) if (d2(m, a) <= K.rally.r ** 2) {
        if (m.id !== a.id) S.apply(m, 'ward', K.rally.dr, sec(K.rally.drS), getTick(), a.id);
        S.apply(m, 'inspired', K.rally.dmg, sec(K.rally.dmgS), getTick(), a.id);
        got.push(m.id);
      }
      emit('review_sh_rally', { ids: got, secs: K.rally.drS });
    }),
    heavy_slam: (a, dir, aim, at) => at((a) => {
      const c = { x: a.x + dir.x * 0.9, z: a.z + dir.z * 0.9 };
      emit('review_sh_slam', { x: r2(c.x), z: r2(c.z), dx: r2(dir.x), dz: r2(dir.z), r: 1.3 });
      const list = hostiles().filter((e) => inFan(a, e, dir, K.slam.reach * (st.giant ? 1 + K.colossus.reach : 1), K.slam.half)).sort((p, q) => d2(p, a) - d2(q, a)).slice(0, K.slam.n);
      const extra = Math.min(K.slamWeight, Math.round(dr() * 100));
      if (extra > 0) emit('review_sh_slamweight', { x: r2(c.x), z: r2(c.z), extra });
      for (const e of list) hit(e, K.slam.dmg + weight(K.slam.hp) + extra, { src: 'slam' });
      const g = st.growlstone;
      if (g && !g.roll && inFan(a, g, dir, K.slam.reach + 0.6, K.slam.half + 10)) {
        g.roll = { t: 0, x0: g.x, z0: g.z, dx: dir.x, dz: dir.z, got: new Set() };
        emit('review_sh_roll', { id: g.id, start: true, dx: r2(dir.x), dz: r2(dir.z) });
      } else shakeStone(c.x, c.z, K.growlstone.comboR);
    }),
    maul: (a, dir) => {
      st.act = { kind: 'maul', t: 0, dir, swipes: 0 };
      play('maul', 0);
    },
    bloodboil: (a, dir, aim, at) => at((a) => {
      const burn = Math.round(a.hp * K.bloodboil.burn * 10) / 10;
      a.hp -= burn;
      // 1.7 (K5): a rampage. 4 s of 40% faster running; each foe he walks into is shoved aside and hit, once.
      st.buffs.boil = getTick() + sec(K.bloodboil.secs);
      S.apply(a, 'haste', K.bloodboil.run, sec(K.bloodboil.secs), getTick(), a.id);
      st.rampage = { until: getTick() + sec(K.bloodboil.secs), hit: new Set(), px: a.x, pz: a.z };
      emit('review_sh_burn', { amount: burn, x: r2(a.x), z: r2(a.z), secs: K.bloodboil.secs });
    }),
    savage_bite: (a, dir, aim) => {
      st.act = { kind: 'bite', t: 0, dir, x0: a.x, z0: a.z, aim };
      play('bite', 0);
    },
    iron_bristles: (a, dir, aim, at) => at(() => {
      st.bristles = getTick() + sec(K.bristles.secs);
      emit('review_sh_bristles', { secs: K.bristles.secs });
    }),
    grudge: (a, dir, aim, at) => at(() => {
      st.grudge = { phase: 'count', n: 0, marked: new Set(), until: getTick() + sec(K.grudge.secs) };
      st.dr.grudge = K.grudge.dr;
      emit('review_sh_grudge', { n: 0, start: true, secs: K.grudge.secs });
    }),
    iron_briar: (a, dir, aim, at) => at((a) => {
      const dx = aim.x - a.x, dz = aim.z - a.z, d = Math.hypot(dx, dz), k = d > K.briar.reach ? K.briar.reach / d : 1;
      st.briar = { x: a.x + dx * k, z: a.z + dz * k, until: getTick() + sec(K.briar.secs), next: getTick() };
      emit('review_sh_briar', { x: r2(st.briar.x), z: r2(st.briar.z), r: K.briar.r, secs: K.briar.secs });
    }),
    iron_quills: (a, dir, aim, at) => at((a) => {
      const list = hostiles().filter((e) => d2(e, a) <= K.quills.r ** 2).sort((p, q) => d2(p, a) - d2(q, a)).slice(0, K.quills.n);
      emit('review_sh_quills', { ids: list.map((e) => e.id), x: r2(a.x), z: r2(a.z) });
      later(0.22, () => {
        const q = { hit: new Set(list.map((e) => e.id)) };
        for (const e of list) {
          st.quilled.set(e.id, getTick() + sec(K.quills.secs));
          st.quillCast.set(e.id, q);
          hit(e, K.quills.dmg, { src: 'quills', kb: 0 });
        }
      });
    }),
  };

  // Counter Spin (S54): a spin by himself, a skill hit of his
  function spin() {
    const a = tank();
    if (!a) return;
    play('spin', 0);
    emit('review_sh_spin', { x: r2(a.x), z: r2(a.z), r: K.spin.r });
    later(0.18, () => {
      const t = tank();
      for (const e of hostiles()) if (d2(e, t) <= (K.spin.r + (e.radius ?? 0.3) * 0.5) ** 2) hit(e, K.spin.dmg + weight(K.spin.hp), { src: 'spin', kb: 0.3 });
    });
  }
  // A big blow near the Growlstone makes it roar at once, 1 u wider (S34).
  function shakeStone(x, z, r) {
    const g = st.growlstone;
    if (!g) return;
    if ((g.x - x) ** 2 + (g.z - z) ** 2 <= Math.max(r, K.growlstone.comboR) ** 2) {
      g.next = getTick() + 1;
      g.wide = true;
    }
  }

  function startCombo() {
    st.act = { kind: 'combo', t: 0, hits: 0 };
    play('combo', 0);
  }
  function startDash(dir) {
    const a = tank();
    if (!a) return;
    const l = Math.hypot(dir.x, dir.z) || 1;
    st.act = { kind: 'dash', t: 0, dir: { x: dir.x / l, z: dir.z / l }, x0: a.x, z0: a.z, knocked: new Set(), charge: !!st.slab, carried: new Map() };
    if (st.slab) st.slab.until = Infinity; // C7: the slab stays in front for the charge
    emit('review_sh_dash', { dx: r2(dir.x / l), dz: r2(dir.z / l) });
  }

  function stepAct(a, dt) {
    const A = st.act;
    if (!A) return;
    A.t += dt;
    const tick = getTick();
    if (A.kind === 'combo') {
      const C = K.combo;
      while (A.hits < 3 && A.t >= C.contacts[A.hits]) {
        const h = A.hits;
        A.hits += 1;
        const dir = { x: a.faceX ?? 0, z: a.faceZ ?? 1 };
        const dmg = C.dmg[h] + (h === 2 ? weight(C.slamHp) : 0);
        const rm = st.giant ? 1 + K.colossus.reach : 1;
        const list = h === 2 ? hostiles().filter((e) => d2(e, a) <= (C.slamR * rm) ** 2) : hostiles().filter((e) => inFan(a, e, dir, C.reach * rm, C.half));
        emit('review_sh_combo', { hit: h + 1, x: r2(a.x + dir.x * 0.7), z: r2(a.z + dir.z * 0.7), dx: r2(dir.x), dz: r2(dir.z), r: h === 2 ? C.slamR : C.reach });
        for (const e of list) {
          hit(e, dmg, { src: 'basic' + (h + 1), delivery: 'basic' });
          if (h === 0) taunt(e, C.taunt1);
          if (h === 2) taunt(e, C.taunt3);
        }
        if (h === 2) shakeStone(a.x, a.z, C.slamR);
      }
      if (A.t >= C.len) st.act = null;
    } else if (A.kind === 'dash') {
      const D = K.dash;
      const u = Math.min(1, Math.max(0, (A.t - D.t0) / (D.t1 - D.t0)));
      const e2 = u; // the charge is even: two pounding strides
      if (A.charge && A.t >= D.t0 && A.t <= D.t1 + 0.02) {
        // Slab charge (1.6, C7): foes within 1.5 u in front go with him; a wall stops the charge
        if (!A.blocked) {
          a.x = A.x0 + A.dir.x * D.dist * e2;
          a.z = A.z0 + A.dir.z * D.dist * e2;
        }
        a.iframeUntilTick = tick + 2;
        for (const e of hostiles()) {
          if (A.carried.has(e.id) || isBig(e)) continue;
          const dx = e.x - a.x, dz = e.z - a.z, along = dx * A.dir.x + dz * A.dir.z, lat = -dx * A.dir.z + dz * A.dir.x;
          if (along > 0 && Math.hypot(dx, dz) <= K.c6.carry + (e.radius ?? 0.4) * 0.5) {
            A.carried.set(e.id, { along: Math.max(0.95, along), lat });
            S.apply(e, 'stun', 1, sec(D.t1 - A.t + 0.3), tick, a.id);
            taunt(e, D.taunt);
          }
        }
        for (const [id, c] of A.carried) {
          const e = registry.byId(id);
          if (!e || !(e.hp > 0) || c.slammed) continue;
          if (e.reviewPush && e.reviewPush.done) { c.slammed = true; A.blocked = true; continue; }
          e.x = a.x + A.dir.x * c.along - A.dir.z * c.lat;
          e.z = a.z + A.dir.z * c.along + A.dir.x * c.lat;
          e.reviewPush = { dx: A.dir.x, dz: A.dir.z, until: tick + 3, done: false, inBriar: true };
        }
      } else if (A.t >= D.t0 && A.t <= D.t1 + 0.02) {
        a.x = A.x0 + A.dir.x * D.dist * e2;
        a.z = A.z0 + A.dir.z * D.dist * e2;
        a.iframeUntilTick = tick + 2;
        for (const e of hostiles()) {
          if (A.knocked.has(e.id) || d2(e, a) > D.hitR ** 2) continue;
          A.knocked.add(e.id);
          const side = (e.x - a.x) * -A.dir.z + (e.z - a.z) * A.dir.x >= 0 ? 1 : -1;
          shove(e, -A.dir.z * side + A.dir.x * 0.4, A.dir.x * side + A.dir.z * 0.4, D.aside, 0.2);
          emit('review_sh_dust', { x: r2(e.x), z: r2(e.z), r: 0.4 });
          S.apply(e, 'stun', 1, sec(D.stun), tick, a.id);
          taunt(e, D.taunt);
        }
      }
      if (A.charge && A.t >= D.t1 + 0.1 && st.slab) {
        // the charge ends Slabguard with no shove
        st.slab = null;
        emit('review_sh_slab', { on: false, x: r2(a.x), z: r2(a.z) });
      }
      if (A.t >= D.len) st.act = null;
    } else if (A.kind === 'burrow') {
      const B = K.burrow;
      a.iframeUntilTick = tick + 2;
      if (A.t >= B.down && !A.under) {
        A.under = true;
        emit('review_sh_dig', { phase: 'under', x: r2(a.x), z: r2(a.z), dx: r2(A.dir.x), dz: r2(A.dir.z), dist: A.dist, secs: B.tunnel });
      }
      if (A.under && !A.up) {
        const u = Math.min(1, (A.t - B.down) / B.tunnel);
        a.x = A.x0 + A.dir.x * A.dist * u;
        a.z = A.z0 + A.dir.z * A.dist * u;
        emit('review_sh_mound', { x: r2(a.x), z: r2(a.z) });
        if (u >= 1) {
          A.up = true;
          emit('review_sh_dig', { phase: 'up', x: r2(a.x), z: r2(a.z) });
          play('digUp', 0);
          emit('review_sh_ring', { x: r2(a.x), z: r2(a.z), r: B.r, kind: 'burst' });
          for (const e of hostiles()) if (d2(e, a) <= B.r ** 2) {
            hit(e, B.dmg + weight(B.hp), { src: 'burrow', kb: 0.5 });
            lift(e, B.lift);
            taunt(e, B.taunt);
          }
          shakeStone(a.x, a.z, B.r);
          addRubble(a.x, a.z);
          const ups = [];
          st.cubs.forEach((cb, i) => {
            if (cb.state !== 'dig') return;
            const side = i % 2 ? -1 : 1;
            cb.x = a.x - A.dir.z * 1.1 * side - A.dir.x * 0.3;
            cb.z = a.z + A.dir.x * 1.1 * side - A.dir.z * 0.3;
            cb.state = 'climb';
            cb.born = tick;
            ups.push({ id: cb.id, x: r2(cb.x), z: r2(cb.z) });
            for (const e of hostiles()) if (d2(e, cb) <= K.c6.cubBurstR ** 2) hit(e, K.c6.cubBurst, { src: 'cub', dirFrom: cb, kb: 0.3 });
          });
          if (ups.length) emit('review_sh_cubs', { up: ups });
        }
      }
      if (A.up && A.t >= B.down + B.tunnel + 0.6) st.act = null;
    } else if (A.kind === 'hop') {
      const H = K.bodyguard.hop;
      const u = Math.min(1, A.t / H);
      const e2 = u * u * (3 - 2 * u);
      a.x = A.x0 + (A.to.x - A.x0) * e2;
      a.z = A.z0 + (A.to.z - A.z0) * e2;
      a.iframeUntilTick = tick + 2;
      const al = A.ally;
      if (al && al.hp > 0 && u < 1) {
        // the ally rides the other way along the same line, a little behind him, untouchable while it moves
        const v = Math.min(1, A.t / H * 1.05), e3 = v * v * (3 - 2 * v);
        al.x = A.ax0 + (A.x0 - A.ax0) * e3;
        al.z = A.az0 + (A.z0 - A.az0) * e3;
        al.iframeUntilTick = tick + 2;
        al.reviewY = 0.5 * Math.sin(Math.PI * v);
      }
      if (u >= 1 && !A.landed) {
        A.landed = true;
        if (al) { al.x = A.x0; al.z = A.z0; al.reviewY = 0; emit('review_sh_dust', { x: r2(al.x), z: r2(al.z), r: 0.5 }); }
        emit('review_sh_ring', { x: r2(a.x), z: r2(a.z), r: K.bodyguard.r, kind: 'burst' });
        const on = (e) => e.targetId === al?.id || ((st.lastHitOn.get(e.id)?.id === al?.id) && tick - st.lastHitOn.get(e.id).tick <= sec(K.bodyguard.recent));
        for (const e of hostiles()) if (d2(e, a) <= K.bodyguard.r ** 2 || on(e)) taunt(e, K.bodyguard.taunt, on(e) && d2(e, a) > K.bodyguard.r ** 2 ? { from: { x: a.x, z: a.z } } : {});
      }
      if (A.t >= H + 0.45) st.act = null;
    } else if (A.kind === 'maul') {
      const M = K.maul;
      const at = 0.22 + A.swipes * 0.32;
      if (A.swipes < M.n && A.t >= at) {
        const i = A.swipes;
        A.swipes += 1;
        const dir = { x: a.faceX ?? 0, z: a.faceZ ?? 1 };
        emit('review_sh_swipe', { x: r2(a.x + dir.x * 0.6), z: r2(a.z + dir.z * 0.6), dx: r2(dir.x), dz: r2(dir.z), side: i % 2 ? -1 : 1 });
        let any = false;
        for (const e of hostiles()) if (inFan(a, e, dir, M.reach, M.half)) {
          hit(e, M.dmg + weight(M.hp), { src: 'maul', kb: 0.08 });
          any = true;
        }
        if (any) st.maulHaste.push(tick + sec(M.hasteS));
      }
      if (A.t >= 2.2) st.act = null;
    } else if (A.kind === 'bite') {
      const B = K.bite;
      const t0 = LEAD, t1 = LEAD + 0.12;
      if (A.t <= t1 + 0.02) {
        const u0 = Math.min(1, Math.max(0, (A.t - 0.05) / (t1 - 0.07))), u = u0 * (2 - u0); // the move: a crouch, then the leap (0.05 to 0.20 s)
        let tgt = A.target;
        if (!tgt) {
          let best = null, bd = Infinity;
          for (const e of hostiles()) {
            const d = d2(e, A.aim || a);
            if (d2(e, a) <= (B.lunge + B.reach) ** 2 && d < bd) { bd = d; best = e; }
          }
          A.target = tgt = best;
        }
        const lunge = tgt ? Math.min(B.lunge, Math.max(0, Math.hypot(tgt.x - A.x0, tgt.z - A.z0) - 0.75)) : B.lunge;
        const dir = tgt ? { x: (tgt.x - A.x0) / (Math.hypot(tgt.x - A.x0, tgt.z - A.z0) || 1), z: (tgt.z - A.z0) / (Math.hypot(tgt.x - A.x0, tgt.z - A.z0) || 1) } : A.dir;
        a.x = A.x0 + dir.x * lunge * u;
        a.z = A.z0 + dir.z * lunge * u;
      }
      if (!A.done && A.t >= t0 + 0.06) {
        A.done = true;
        const t = A.target;
        if (t && t.hp > 0 && d2(t, a) <= (B.reach + 0.3) ** 2) {
          const missing = Math.max(0, 1 - a.hp / a.maxHp) * 100;
          const dmg = B.dmg + B.perPct * missing;
          emit('review_sh_bite', { id: t.id, x: r2(t.x), z: r2(t.z), missing: Math.round(missing) });
          hit(t, dmg, { src: 'bite', kb: 0.2 });
          if (!(t.hp > 0)) emit('review_sh_refund', {});
        }
      }
      if (A.t >= 0.9) st.act = null;
    }
  }

  function look() {
    const tick = getTick();
    const L = { stone: st.stone, thorns: st.bristles > tick ? 1 : st.grudge ? 1 : 0, ore: st.grudge && st.grudge.phase === 'count' ? Math.min(1, st.grudge.n / (K.grudge.cap * st.maxHp)) * 0.85 + 0.15 : 0, rust: st.buffs.boil > tick ? 1 : 0, stoneSkin: st.giant ? 1 : 0 };
    if (st.giant) L.ore = Math.max(L.ore, 0.5);
    let ch = false;
    for (const k in L) if (L[k] !== st.look[k]) ch = true;
    if (ch) {
      st.look = L;
      emit('review_sh_look', L);
    }
  }

  function dr() {
    return Math.min(K.drCap, st.stone * K.stonePer + st.dr.stand + st.dr.rally + st.dr.grudge + st.dr.guard + st.dr.giant);
  }

  function step(tick) {
    const a = tank();
    if (!a) return;
    const dt = 1 / TICK;
    if (a.maxHp !== st.maxHp) a.maxHp = st.maxHp;
    for (const q of st.queue.splice(0)) q();
    for (let i = st.timers.length - 1; i >= 0; i--) if (st.timers[i].at <= tick) st.timers.splice(i, 1)[0].fn();
    if (st.act) stepAct(a, dt);
    // Bloodboil (S28, 1.7): each foe he walks into while the rampage runs is shoved aside and hit, once per cast
    if (st.rampage) {
      const R = st.rampage, B = K.bloodboil;
      if (tick >= R.until) st.rampage = null;
      else {
        const mx = a.x - R.px, mz = a.z - R.pz, ml = Math.hypot(mx, mz);
        R.px = a.x; R.pz = a.z;
        if (ml > 1e-4) { R.dx = mx / ml; R.dz = mz / ml; }
        for (const e of hostiles()) {
          if (R.hit.has(e.id) || d2(e, a) > B.touch ** 2) continue;
          R.hit.add(e.id);
          hit(e, B.dmg + weight(B.hp), { src: 'rampage', kb: 0 });
          emit('review_sh_dust', { x: r2(e.x), z: r2(e.z), r: 0.45 });
          if (!isBig(e) && R.dx != null) {
            // aside: square to his run, away from his line
            const sx = -R.dz, sz = R.dx, side = Math.sign((e.x - a.x) * sx + (e.z - a.z) * sz) || 1;
            shove(e, sx * side + R.dx * 0.3, sz * side + R.dz * 0.3, B.shove, 0.2);
          }
        }
      }
    }
    // Stone crumbles 6 s after the last patch was gained.
    if (st.stone > 0 && tick - st.stoneTick >= sec(K.stoneLife)) {
      st.stone = 0;
      emit('review_sh_stone', { n: 0, crumble: true });
    }
    if (st.rallyUntil && tick >= st.rallyUntil) { st.dr.rally = 0; st.rallyUntil = 0; }
    if (st.guard && tick >= st.guard.until) {
      emit('review_sh_bodyguard_end', { ally: st.guard.id });
      st.guard = null;
      st.dr.guard = 0;
    }
    // the slam's wind-up starts 0.3 s before the count ends and its contact frame (0.65 s) is the slam, GRUDGE_WIND after it
    if (st.grudge && st.grudge.phase === 'count' && !st.grudge.wound && tick >= st.grudge.until - sec(0.3)) {
      st.grudge.wound = true;
      play('grudgeSlam', 0);
    }
    if (st.grudge && st.grudge.phase === 'count' && tick >= st.grudge.until) {
      st.grudge.phase = 'slam';
      st.dr.grudge = 0;
      const g = st.grudge;
      later(GRUDGE_WIND, () => {
        const t = tank();
        // 1.7 (K6): spikes burst under each marked foe within 8 u: 20 (+4% HP), thrown up 0.6 s
        const dmg = K.grudge.dmg + weight(K.grudge.hp);
        const spiked = hostiles().filter((e) => g.marked.has(e.id) && d2(e, t) <= K.grudge.reach ** 2);
        emit('review_sh_ring', { x: r2(t.x), z: r2(t.z), r: 1.2, kind: 'burst' });
        emit('review_sh_grudge', { n: spiked.length, slam: true, dmg: Math.round(dmg) });
        for (const e of spiked) {
          emit('review_sh_ironspike', { x: r2(e.x), z: r2(e.z), id: e.id });
          hit(e, dmg, { src: 'grudge', kb: 0 });
          lift(e, K.grudge.lift);
        }
        st.grudge = null;
        // C9: every quilled foe the spikes hit bursts; each foe takes the bursts of one slam once
        const got = new Set(), C6 = K.c6, now = getTick();
        for (const e of spiked) {
          if (!((st.quilled.get(e.id) ?? -1) > now)) continue;
          const list = hostiles().filter((f) => f !== e && !got.has(f.id) && d2(f, e) <= C6.burstR ** 2).sort((p, q) => d2(p, e) - d2(q, e)).slice(0, C6.burstN);
          if (!list.length) continue;
          for (const f of list) got.add(f.id);
          emit('review_sh_quills', { ids: list.map((f) => f.id), x: r2(e.x), z: r2(e.z), r: C6.burstR, spread: true, burst: true });
          later(0.22, () => {
            for (const f of list) {
              st.quilled.set(f.id, getTick() + sec(K.quills.secs));
              if (!st.quillCast.has(f.id)) st.quillCast.set(f.id, { hit: new Set([f.id]) });
              hit(f, C6.burstDmg, { src: 'quills', kb: 0 });
            }
          });
        }
      });
    }
    // Slabguard: shots that reach the slab's front stop there; at the end he shoves the slab forward.
    if (st.slab) {
      a.faceX = st.slab.dx;
      a.faceZ = st.slab.dz;
      const sl = st.slab, cosA = Math.cos((K.slab.arc / 2) * Math.PI / 180);
      for (const p of registry.all()) {
        if (p.kind !== 'eshot') continue;
        const dx = p.x - a.x, dz = p.z - a.z, l = Math.hypot(dx, dz) || 1;
        if (l <= K.slab.catchR && (dx * sl.dx + dz * sl.dz) / l >= cosA) {
          events.emit(tick, 'eshot_despawn', { id: p.id, cause: 'blocked' });
          registry.despawn(p.id);
          const bx = a.x + sl.dx * 0.7, bz = a.z + sl.dz * 0.7;
          emit('review_sh_block', { x: r2(bx), z: r2(bz) });
          const who = registry.byId(st.shooter.get(p.id));
          if (who && who.hp > 0) {
            const secs = Math.hypot(who.x - bx, who.z - bz) / 8;
            const dmg = (p.power || 10) * K.shotBack;
            emit('review_sh_shotback', { id: who.id, x: r2(bx), z: r2(bz), secs: r2(secs) });
            later(secs, () => { if (who.hp > 0) hit(who, dmg, { src: 'shot_back', dirFrom: { x: bx, z: bz }, kb: 0 }); });
          }
        }
      }
      if (tick >= sl.until) {
        st.slab = null;
        play('shove', 0);
        later(0.3, () => {
          const t = tank();
          emit('review_sh_slab', { on: false, shove: true, x: r2(t.x + sl.dx * 0.9), z: r2(t.z + sl.dz * 0.9), dx: r2(sl.dx), dz: r2(sl.dz) });
          for (const e of hostiles()) if (inFan(t, e, { x: sl.dx, z: sl.dz }, K.slab.shoveR, 60)) {
            hit(e, K.slab.shove + weight(K.slab.shoveHp), { src: 'shove', kb: 0 });
            shove(e, sl.dx, sl.dz, K.slab.push, 0.25);
          }
        });
      }
    }
    // Colossus ends: the same share of health coming out
    if (st.giant && tick >= st.giant.until) {
      const share = a.hp / a.maxHp;
      st.maxHp = Math.round(st.maxHp / (1 + K.colossus.hp));
      a.maxHp = st.maxHp;
      a.hp = share * st.maxHp;
      st.giant = null;
      st.dr.giant = 0;
      emit('review_sh_giant', { on: false, scale: 1, secs: K.colossus.grow });
    }
    // Slabguard's stopped shots fly back (1.3) is in the block loop; flying returns land here
    // Stone Ring: walking foes cannot cross, in or out
    if (st.ringSt) {
      const R = st.ringSt;
      if (tick >= R.until) {
        st.ringSt = null;
        emit('review_sh_stonering', { on: false });
        for (const e of hostiles()) e.reviewRingHit = null;
      } else for (const e of hostiles()) {
        if (e.flying) continue;
        if (!R.side.has(e.id)) R.side.set(e.id, d2(e, R) < K.ring.r ** 2);
        const inside = R.side.get(e.id), r = e.radius ?? 0.4;
        const dx = e.x - R.x, dz = e.z - R.z, l = Math.hypot(dx, dz) || 1e-3;
        const lim = inside ? K.ring.r - K.ring.gap - r * 0.5 : K.ring.r + K.ring.gap + r * 0.5;
        if (inside ? l > lim : l < lim) {
          e.x = R.x + (dx / l) * lim;
          e.z = R.z + (dz / l) * lim;
          e.reviewRingHit = { x: R.x + (dx / l) * K.ring.r, z: R.z + (dz / l) * K.ring.r };
        } else e.reviewRingHit = null;
      }
    }
    for (const e of hostiles()) if (e.reviewPush) wallCheck(e);
    // Slab Throw: it flies to its foe, bounces on, then back to his paw
    if (st.thrown) {
      const T = st.thrown, K2 = K.throw, step = K2.speed / TICK, C6 = K.c6;
      T.count = T.count || new Map();
      T.stones = T.stones || 0;
      // C2 Slab pinball: a fresh foe within 4 u first; else a stone (the Growlstone or a ring stone,
      // at most 2 a throw); after a stone it may hit a foe it already hit, once more.
      const fresh = (from) => hostiles().filter((e) => !T.hit.has(e.id) && d2(e, from) <= K2.hop ** 2).sort((p, q) => d2(p, from) - d2(q, from))[0] || null;
      const again = (from, not) => hostiles().filter((e) => e.id !== not && (T.count.get(e.id) || 0) < 2 && d2(e, from) <= C6.pinHop ** 2).sort((p, q) => d2(p, from) - d2(q, from))[0] || null;
      const stone = (from) => {
        if (T.stones >= C6.pinStones) return null;
        const c = [];
        const g = st.growlstone;
        if (g && !g.fly && d2(g, from) <= C6.pinHop ** 2 && T.lastStone !== 'g') c.push({ x: g.x, z: g.z, g: true, key: 'g' });
        const R = st.ringSt;
        if (R && d2(from, R) < K.ring.r ** 2) {
          const st16 = (2 * Math.PI) / K.ring.stones, ang = Math.round(Math.atan2(from.z - R.z, from.x - R.x) / st16) * st16, rr = K.ring.r - 0.3;
          const pnt = { x: R.x + Math.cos(ang) * rr, z: R.z + Math.sin(ang) * rr, key: 'r' + Math.round(ang * 100) };
          if (pnt.key !== T.lastStone) c.push(pnt);
        }
        return c.sort((p, q) => d2(p, from) - d2(q, from))[0] || null;
      };
      const tgt = T.back ? a : T.stone ? T.stone : registry.byId(T.target);
      if (!T.back && !T.stone && (!tgt || !(tgt.hp > 0))) T.back = true;
      else {
        const dx = tgt.x - T.x, dz = tgt.z - T.z, l = Math.hypot(dx, dz);
        if (l <= step + (T.stone ? 0.05 : 0.3)) {
          if (T.back) {
            st.thrown = null;
            emit('review_sh_slabthrow', { on: false, caught: true, x: r2(a.x), z: r2(a.z) });
            if (!st.act) play('catch', 0);
          } else if (T.stone) {
            const sn = T.stone;
            T.x = sn.x; T.z = sn.z;
            T.stones += 1;
            T.touched = true;
            T.lastStone = sn.key;
            T.stone = null;
            emit('review_sh_slabbounce', { x: r2(sn.x), z: r2(sn.z), g: !!sn.g });
            if (sn.g && st.growlstone) { st.growlstone.next = tick + 1; }
            const nx = T.n <= K2.bounces ? (fresh(T) || again(T, T.lastFoe)) : null;
            if (nx) T.target = nx.id;
            else if (T.rip) { st.thrown = null; emit('review_sh_slabthrow', { on: false, broke: true, x: r2(T.x), z: r2(T.z) }); }
            else T.back = true;
          } else {
            T.x = tgt.x; T.z = tgt.z;
            T.hit.add(tgt.id);
            T.count.set(tgt.id, (T.count.get(tgt.id) || 0) + 1);
            T.lastFoe = tgt.id;
            T.n += 1;
            hit(tgt, K2.dmg + weight(K2.hp), { src: 'slabthrow', dirFrom: { x: T.x - dx, z: T.z - dz }, kb: 0.15 });
            taunt(tgt, K2.taunt);
            emit('review_sh_slabhit', { id: tgt.id, x: r2(T.x), z: r2(T.z), n: T.n });
            const nx = T.n <= K2.bounces ? fresh(T) : null;
            const sn = !nx && T.n <= K2.bounces ? stone(T) : null;
            if (nx) T.target = nx.id;
            else if (sn) T.stone = sn;
            else if (T.rip) {
              st.thrown = null;
              emit('review_sh_slabthrow', { on: false, broke: true, x: r2(T.x), z: r2(T.z) });
            } else T.back = true;
          }
        } else {
          T.x += (dx / l) * step;
          T.z += (dz / l) * step;
        }
      }
      if (st.thrown) emit('review_sh_slabpos', { x: r2(T.x), z: r2(T.z), back: T.back });
    }
    // Grindstone: a burn on him, a grind on foes near him, both sized by his max health
    if (st.grind) {
      const G = st.grind;
      if (tick >= G.until) {
        st.grind = null;
        emit('review_sh_grind', { on: false });
      } else if (tick >= G.next) {
        G.next = tick + sec(0.5);
        const burn = Math.min(st.maxHp * K.grind.self * 0.5, Math.max(0, a.hp - st.maxHp * K.grind.floor));
        if (burn > 0) {
          a.hp -= burn;
          emit('review_sh_burn', { amount: Math.round(burn * 10) / 10, x: r2(a.x), z: r2(a.z), secs: 0, grind: true });
        }
        for (const e of hostiles()) if (d2(e, a) <= K.grind.r ** 2) hit(e, st.maxHp * K.grind.foe * 0.5, { src: 'grind', kb: 0 });
      }
    }
    // Stone Cubs: climb out, run to foes on an ally, bite, taunt them onto him
    if (st.cubs.length) {
      const C = K.cubs, step = C.speed / TICK;
      const allies = party().filter((m) => m.id !== a.id);
      const pick = (cb) => {
        const onAlly = hostiles().filter((e) => d2(e, cb) <= C.search ** 2 && allies.some((m) => m.id === e.targetId) && !st.cubs.some((o) => o !== cb && o.target === e.id));
        if (onAlly.length) {
          const hurt = allies.slice().sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp);
          for (const m of hurt) {
            const f = onAlly.filter((e) => e.targetId === m.id).sort((p, q) => d2(p, m) - d2(q, m))[0];
            if (f) return f;
          }
        }
        return hostiles().filter((e) => d2(e, cb) <= C.search ** 2 && !((st.tauntUntil.get(e.id) ?? -1) > tick) && !st.cubs.some((o) => o !== cb && o.target === e.id)).sort((p, q) => d2(p, cb) - d2(q, cb))[0] || null;
      };
      const out = [];
      for (const cb of st.cubs) {
        if (tick >= cb.until) { cb.dead = true; continue; }
        if (cb.state === 'dig') continue;
        if (cb.state === 'climb') {
          if (tick - cb.born >= sec(C.climb)) cb.state = 'run';
        } else {
          let f = cb.target != null ? registry.byId(cb.target) : null;
          if (!f || !(f.hp > 0)) { f = pick(cb); cb.target = f ? f.id : null; }
          if (f) {
            const dx = f.x - cb.x, dz = f.z - cb.z, l = Math.hypot(dx, dz) || 1e-3, reach = (f.radius ?? 0.4) + 0.3;
            cb.fx = dx / l; cb.fz = dz / l;
            if (l > reach) {
              const m = Math.min(step, l - reach);
              cb.x += cb.fx * m; cb.z += cb.fz * m;
              cb.state = 'run';
            } else {
              cb.state = 'bite';
              if (tick >= cb.next) {
                cb.next = tick + sec(C.every);
                hit(f, C.bite, { src: 'cub', dirFrom: cb, kb: 0 });
                crack(f, cb.id, true);
                // 1.7 (K9): the bite holds the foe in place 0.4 s (at most 0.4 s in each 1 s); no taunt
                if (!isBig(f) && f.hp > 0 && tick >= (f.reviewHoldNext ?? 0)) {
                  f.reviewHoldNext = tick + sec(C.holdGap);
                  S.apply(f, 'stun', 1, sec(C.hold), tick, a.id);
                  if (f.status) delete f.status.stunImmune;
                  emit('review_sh_hold', { id: f.id, secs: C.hold });
                }
                out.push(cb.id);
              }
            }
          } else cb.state = 'idle';
        }
      }
      const gone = st.cubs.filter((c) => c.dead).map((c) => c.id);
      st.cubs = st.cubs.filter((c) => !c.dead);
      emit('review_sh_cubs', { at: st.cubs.map((c) => ({ id: c.id, x: r2(c.x), z: r2(c.z), fx: r2(c.fx), fz: r2(c.fz), s: c.state })), bit: out, gone });
    }
    // Badger Toss: held up in front of him, then thrown along an arc
    if (st.btoss) {
      const T = st.btoss, B = K.btoss, e = registry.byId(T.id);
      T.t += 1 / TICK;
      if (!e || !(e.hp > 0)) st.btoss = null;
      else if (T.t < B.lift) {
        // hoisted over his shoulder by 0.36 s, then drawn back a little while he strains under it
        const u = Math.min(1, T.t / 0.36), k = Math.min(1, Math.max(0, (T.t - 0.36) / (B.lift - 0.36))), back = 0.4 * k * k * (3 - 2 * k);
        e.x = T.x0 + (T.hx - T.x0) * u - T.dx * back; e.z = T.z0 + (T.hz - T.z0) * u - T.dz * back;
        e.reviewY = 1.1 * Math.sin(u * Math.PI / 2) + 0.08 * back;
        T.rx = e.x; T.rz = e.z; T.ry = e.reviewY;
      } else {
        const u = Math.min(1, (T.t - B.lift) / B.fly);
        const rx = T.rx ?? T.hx, rz = T.rz ?? T.hz;
        e.x = rx + (T.tx - rx) * u; e.z = rz + (T.tz - rz) * u;
        e.reviewY = (T.ry ?? 1.1) * (1 - u) + 4 * 1.0 * u * (1 - u);
        if (u >= 1) {
          e.reviewY = 0;
          st.btoss = null;
          emit('review_sh_btoss', { id: e.id, phase: 'land', x: r2(e.x), z: r2(e.z), r: B.r });
          for (const f of hostiles()) if (d2(f, e) <= B.r ** 2) {
            hit(f, B.dmg + weight(B.hp), { src: 'btoss', dirFrom: e, kb: 0 });
            if (!isBig(f) && f.hp > 0) S.apply(f, 'stun', 1, sec(B.stun), tick, a.id);
          }
          if (!T.wall && st.briar && e.hp > 0 && d2(e, st.briar) <= K.briar.r ** 2) impale(e);
          if (T.wall && e.hp > 0) {
            emit('review_sh_wallslam', { id: e.id, x: r2(T.wall.x), z: r2(T.wall.z), ex: r2(e.x), ez: r2(e.z), dx: r2(T.dx), dz: r2(T.dz) });
            hit(e, K.wall.dmg + weight(K.wall.hp), { src: 'wall', kb: 0 });
            S.apply(e, 'stun', 1, sec(B.stun), tick, a.id);
          }
        }
      }
    }
    // the rolling Growlstone (Kick the stone)
    if (st.growlstone && st.growlstone.roll) {
      const g = st.growlstone, R = g.roll, Kr = K.roll;
      R.t += 1 / TICK;
      const u = Math.min(1, R.t / Kr.secs), k = 1 - (1 - u) * (1 - u);
      g.x = R.x0 + R.dx * Kr.dist * k;
      g.z = R.z0 + R.dz * Kr.dist * k;
      g.x = Math.max(-ARENA.halfW + 0.4, Math.min(ARENA.halfW - 0.4, g.x));
      g.z = Math.max(-ARENA.halfD + 0.4, Math.min(ARENA.halfD - 0.4, g.z));
      for (const e of hostiles()) if (!R.got.has(e.id) && d2(e, g) <= (Kr.w + (e.radius ?? 0.4)) ** 2) {
        R.got.add(e.id);
        hit(e, Kr.dmg, { src: 'roll', dirFrom: g, kb: 0 });
        const side = (e.x - g.x) * -R.dz + (e.z - g.z) * R.dx >= 0 ? 1 : -1;
        shove(e, -R.dz * side, R.dx * side, Kr.aside, 0.2);
        taunt(e, Kr.taunt, { from: { x: g.x, z: g.z } });
      }
      emit('review_sh_roll', { id: g.id, x: r2(g.x), z: r2(g.z), done: u >= 1 });
      if (u >= 1) g.roll = null;
    }
    // thrown-up bodies
    for (const e of registry.all()) if (e.reviewLift) {
      const L = e.reviewLift, u = (tick - L.t0) / L.ticks;
      if (u >= 1 || !(e.hp > 0)) { e.reviewY = 0; e.reviewLift = null; } else e.reviewY = 4 * L.h * u * (1 - u);
    }
    // the Growlstone roars every 2 s
    const g = st.growlstone;
    if (g) {
      if (tick >= g.until) {
        emit('review_sh_stone_gone', { id: g.id });
        st.growlstone = null;
      } else if (g.fly) {
        // C1: thrown, it lands beside the foe: 16 and a taunt within 1.5 u, and it roars at once
        const F = g.fly, C6 = K.c6;
        F.t += 1 / TICK;
        const u = Math.min(1, F.t / C6.stoneFly);
        g.x = F.x0 + (F.x1 - F.x0) * u;
        g.z = F.z0 + (F.z1 - F.z0) * u;
        emit('review_sh_stonefly', { id: g.id, x: r2(g.x), z: r2(g.z), y: r2(1.4 + 4 * 1.2 * u * (1 - u) - 1.4 * u * u), done: u >= 1 });
        if (u >= 1) {
          g.fly = null;
          emit('review_sh_ring', { x: r2(g.x), z: r2(g.z), r: C6.stoneLand, kind: 'burst' });
          for (const e of hostiles()) if (d2(e, g) <= (C6.stoneLand + (e.radius ?? 0.4) * 0.5) ** 2) {
            hit(e, C6.stoneDmg, { src: 'stonethrow', dirFrom: g, kb: 0.3 });
            taunt(e, C6.stoneTaunt, { from: g });
          }
          g.next = tick + sec(0.15);
        }
      } else if (tick >= g.next) {
        const r = K.growlstone.r + (g.wide ? K.growlstone.comboWide : 0);
        emit('review_sh_ring', { x: r2(g.x), z: r2(g.z), r, kind: g.wide ? 'stonewide' : 'stone' });
        emit('review_sh_stoneroar', { id: g.id, wide: !!g.wide });
        for (const e of hostiles()) if (d2(e, g) <= r * r) taunt(e, K.growlstone.taunt, { from: g });
        g.wide = false;
        g.next = tick + sec(K.growlstone.every);
      }
    }
    // Iron Briar ticks
    const b = st.briar;
    if (b) {
      if (tick >= b.until) st.briar = null;
      else if (tick >= b.next) {
        b.next = tick + sec(1);
        for (const e of hostiles()) if (d2(e, b) <= K.briar.r ** 2) {
          hit(e, K.briar.dps, { src: 'briar', dirFrom: b, kb: 0 });
          slowOn(e, K.briar.slow, 1.1);
        }
      }
    }
    // Fault Line rubble slows
    st.rubble = st.rubble.filter((r) => r.until > tick);
    if (tick % 10 === 0) for (const r of st.rubble) for (const e of hostiles()) if (r.round ? d2(e, r) <= r.r ** 2 : inStrip(r, { x: r.dx, z: r.dz }, r.len, r.w, e)) slowOn(e, K.fault.slow, 0.3);
    st.maulHaste = st.maulHaste.filter((t) => t > tick);
    // fight state: the growl (S13 step 2) every 8 s, first 3 s in; Menace (S20) every 2 s
    const foes = hostiles();
    const fighting = foes.some((e) => d2(e, a) <= 64);
    if (fighting && st.fightTick == null) {
      st.fightTick = tick;
      st.nextGrowl = tick + sec(K.growlFirst);
    }
    if (!fighting) st.fightTick = null;
    if (st.growl && st.fightTick != null && tick >= st.nextGrowl && !st.act) {
      st.nextGrowl = tick + sec(K.growlEvery);
      const allies = party().filter((m) => m.id !== a.id).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp);
      let pick = null;
      for (const m of allies) {
        const on = foes.filter((e) => e.targetId === m.id && d2(e, a) <= K.growlReach ** 2).sort((p, q) => d2(p, m) - d2(q, m));
        if (on.length) { pick = on[0]; break; }
      }
      if (!pick) pick = foes.filter((e) => e.targetId !== a.id && d2(e, a) <= K.growlReach ** 2).sort((p, q) => d2(p, a) - d2(q, a))[0] || null;
      if (pick) {
        emit('review_sh_growl', { id: pick.id, x: r2(a.x), z: r2(a.z) });
        taunt(pick, K.growlTaunt);
      }
    }
    a.takenMul = 1 - dr();
    look();
  }

  const api = {
    K,
    cast: (id, aim = null) => st.queue.push(() => (id === 'fracture' ? CAST.fracture() : id === 'counter_spin' ? (st.spinOn = !st.spinOn) : startCast(id, aim))),
    combo: () => st.queue.push(startCombo),
    dash: (dx, dz) => st.queue.push(() => startDash({ x: dx, z: dz })),
    // a heavy blow from the nearest foe (the Stoneheart clip)
    blow: (amount, k = 0) => st.queue.push(() => {
      const t = tank();
      const hs = hostiles().sort((p, q) => d2(p, t) - d2(q, t));
      const f = hs[k % Math.max(1, hs.length)];
      if (!t || !f) return;
      emit('review_sh_blow', { big: amount >= 20, id: f.id, x: r2(f.x), z: r2(f.z), tx: r2(t.x), tz: r2(t.z) });
      const l = Math.hypot(t.x - f.x, t.z - f.z) || 1;
      combat.applyDamage(t, amount, { delivery: 'contact', shape: 'contact', dirX: (t.x - f.x) / l, dirZ: (t.z - f.z) / l, attacker: f.id });
    }),
    shield: (on) => {
      st.shield = !!on;
      emit('review_sh_shield', { on: !!on });
    },
    set: (o) => Object.assign(st, o),
    reset: () => {
      st.act = null; st.timers = []; st.stone = 0; st.dr = { stand: 0, rally: 0, grudge: 0, guard: 0, giant: 0 }; st.fracture = false; st.cracks.clear(); st.slab = null; st.giant = null; st.ringSt = null; st.thrown = null; st.grind = null; st.cubs = []; st.heart = 0; st.spinOn = false; st.spinN = 0; st.spinAt = -1e9; st.btoss = null; st.quillCast.clear(); st.buffs = {}; st.guard = null; st.bristles = 0; st.grudge = null; st.lastHitOn.clear(); st.bristleAt.clear(); st.rampage = null;
      st.quilled.clear(); st.maulHaste = []; st.rubble = []; st.briar = null; st.fightTick = null; st.lastStoneFrom.clear(); st.tauntUntil.clear();
      st.hearty = 0; st.maxHp = K.hp;
      if (st.growlstone) emit('review_sh_stone_gone', { id: st.growlstone.id });
      st.growlstone = null;
      emit('review_sh_reset', {});
      emit('review_sh_look', (st.look = { stone: 0, thorns: 0, ore: 0, rust: 0, stoneSkin: 0 }));
      const a = tank();
      if (a) { a.maxHp = K.hp; a.takenMul = 1; }
    },
    state: () => {
      const a = tank();
      return { stone: st.stone, dr: Math.round(dr() * 100), hp: a ? Math.round(a.hp) : 0, maxHp: st.maxHp, hearty: st.hearty, grudge: st.grudge ? Math.round(st.grudge.n) : null,
        haste: Math.round(Math.min(K.maul.hasteCap, st.maulHaste.length * K.maul.haste) * 100), act: st.act ? st.act.kind : null };
    },
  };
  globalThis.__SH = api;
  return { step };
}
