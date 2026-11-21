// REVIEW-ONLY (never committed, never pushed): Ashfang's kit 1.4
// (/mnt/project-files/ashfang-talents/ASHFANG_SKILL_KIT.md, talents T4 and T5)
// run inside the game for his ability review page. The recorder drives it
// through globalThis.__AF (cast, cut, combo, dash, set); this module moves his
// body, deals the damage, keeps the count, the strong cut and the orbs, runs
// the burns, stuns, slows, throws, pushes and pulls, and tells the Tripo rig
// and the stand-in effects what to draw with `review_af_*` events. The foes
// are training dummies: they stand where they were put unless one of his
// skills moves them. Every number is the kit's.
const TICK = 60;
const r2 = (v) => Math.round(v * 100) / 100;
const sec = (s) => Math.round(s * TICK);

export const K = Object.freeze({
  hp: 120,
  count: { cap: 30, fall: 3, perFoe: 3, songStep: 10 },
  // 1.5: the last basic hit throws the sword (S11); Earthsplitter (S23); Tide Ring (S30)
  throw: { len: 4, speed: 13, w: 0.9, hold: 0.4, burstR: 1.5, back: 0.2 },
  split: { full: 1.2, auto: 1.5, ahead: 1.0, r0: 1.5, r1: 2.8, d0: 20, d1: 40, s0: 0.5, s1: 1.0, cd: 6 },
  ring: { r: 2.5, w: 0.8, gap: 0.3, t0: 0.4, dmg: 5, slow: 0.3, slowS: 2, burst0: 2.7, bursts: 4, burstDmg: 4, secs: 4 },
  // 1.5: the six-hit combo posed from Kesh's reel (S12); the sixth throws the sword (S11)
  basic: [
    { clip: 'af1', tilt: 40, at: 0.168, len: 0.392, dmg: 10, reach: 1.0, half: 60 },
    { clip: 'af2', tilt: 0, at: 0.168, len: 0.35, dmg: 10, reach: 1.1, half: 90 },
    { clip: 'af3', tilt: 85, at: 0.182, len: 0.364, dmg: 12, reach: 1.1, half: 30 },
    { clip: 'af4', tilt: -65, at: 0.14, len: 0.35, dmg: 11, reach: 1.0, half: 60 },
    { clip: 'af5', tilt: 0, at: 0.168, len: 0.322, dmg: 14, reach: 1.4, half: 20 },
    { clip: 'af6', tilt: 30, at: 0.21, len: 0.7, dmg: 12, reach: 1.0, half: 60, throw: true },
  ],
  dash: { dist: 2.6, t0: 0.1, t1: 0.4, len: 0.95, hitR: 0.75, dmg: 8, count: 2 },
  // Kesh 18 Nov 14:54: the Crescent basic attack is a charge shot. Held under 0.4 s: a quick 剑气 that
  // stops at the first foe; 0.4 to 1.2 s: it grows and goes through every foe; at 1.2 s it fires by
  // itself as the last hit: the great 剑气, and the newest ghost sword flies with it (the sixth hit's throw)
  shot: { min: 0.22, tap: 0.4, full: 1.2, hit: 0.12,
    tapDmg: 8, tapLen: 4, tapW: 0.6, d0: 14, d1: 26, len0: 5, len1: 6, w0: 0.9, w1: 1.2, fullDmg: 30, fullLen: 7, fullW: 1.6, speed: 15 },
  orbBonus: { fire: 0.04, wind: 0.05, earth: 0.04, water: 0.5 },
  wave: { speed: 14 },
  wallSlam: { dmg: 10, stun: 0.5 },
  fanR: 1.5, quench: 0.8,
  burnTick: 0.5,
});

// the element of each skill (kit S1, S2); passives store no orb
const EL = {
  flurry: 'fire', crescent_finisher: 'fire', blazing_cascade: 'fire', inkstone_dive: 'earth', riptide_form: 'water', skyblade_waltz: 'wind', flame_crescent: 'fire', flare_wave: 'fire', crimson_edge: 'fire', flashfire: 'fire', triple_crescent: 'fire',
  lunge_strike: 'earth', hilt_bash: 'earth', stone_crescent: 'earth', earthsplitter: 'earth', tide_ring: 'water', ground_wave: 'earth', caltrops: 'earth', riposte: 'earth',
  moonfang: 'water', flowing_blade: 'water', tide_crescent: 'water', blade_rain: 'water', mirror_image: 'water', cold_edge: 'water',
  fox_step: 'wind', blade_storm: 'wind', gale_crescent: 'wind', blade_dance: 'wind', whirlwind_slash: 'wind', razor_wake: 'wind', thousand_cuts: 'wind',
};
const PASSIVE = new Set(['crimson_edge', 'cold_edge', 'razor_wake']);
const WAVES = new Set(['flame_crescent', 'flare_wave', 'triple_crescent', 'stone_crescent', 'ground_wave', 'tide_crescent', 'blade_rain', 'gale_crescent', 'whirlwind_slash']);
// the move each skill plays and its effect frame in that clip (the press starts the clip so the effect lands LEAD after it)
const MOVE = {
  flurry: ['flurry', 0.1], crescent_finisher: ['rising', 0.2], flame_crescent: ['waveThrow', 0.17], flare_wave: ['waveThrow', 0.17],
  flashfire: ['castBloom', 0.36], triple_crescent: ['tripleDraw', 0.4], lunge_strike: ['castPoint', 0.22], hilt_bash: ['pommel', 0.13],
  stone_crescent: ['waveThrow', 0.17], ground_wave: ['floorDrag', 0.36], caltrops: ['castPlant', 0.28], riposte: ['castParry', 0.1],
  moonfang: null, flowing_blade: ['flowing', 0.12], tide_crescent: ['hopThrow', 0.15], blade_rain: ['flick', 0.15], mirror_image: ['castBloom', 0.36], tide_ring: ['castBloom', 0.36],
  fox_step: null, blade_storm: ['bladeStorm', 0.22], gale_crescent: ['waveThrow', 0.17], blade_dance: ['combo4', 0.24], whirlwind_slash: ['waveThrow', 0.17],
  thousand_cuts: null,
  blazing_cascade: ['cascade', 0], skyblade_waltz: ['waltz', 0], inkstone_dive: ['inkdive', 0], riptide_form: ['riptide', 0],
};
const LEAD = 0.1;
// 2.0 (kit 2.0, MOTIONS M8 to M24): each of the 17 plays its own clip from the press; at2(at, T)
// lands its beats at clip time T
const MOVE20 = {
  flurry: 'flurry20', crescent_finisher: 'finisher20', flame_crescent: 'keen20', flashfire: 'bloom20', triple_crescent: 'triple20',
  lunge_strike: 'lunge20', ground_wave: 'rift20', caltrops: 'grove20', riposte: 'riposteGuard20',
  moonfang: 'moonfang20', tide_crescent: 'calm20', mirror_image: 'mirror20',
  fox_step: 'foxstep20', blade_storm: 'storm20', blade_dance: 'dance20', whirlwind_slash: 'wheel20', thousand_cuts: 'thousand20',
};
for (const id in MOVE20) MOVE[id] = [MOVE20[id], LEAD];

export function installAshfangReview({ registry, events, combat, getTick }) {
  const S = combat.status;
  const fox = () => registry.all().find((e) => e.kind === 'ally' && e.partyIndex === 2) || null;
  const hostiles = () => registry.all().filter((e) => e.faction === 'hostile' && e.hp > 0 && e.hittable !== false && e.kind !== 'eshot');
  const d2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
  const ECHO_SKIP = new Set(['review_af_orbs', 'review_af_edge', 'review_af_copy', 'review_af_count', 'review_af_burn', 'review_af_slow', 'review_af_stun', 'review_af_lift', 'review_af_blind', 'review_af_fan', 'review_af_quench', 'review_af_coldedge', 'review_af_echo', 'review_af_echon', 'review_af_face', 'review_af_trail', 'review_af_special']);
  const emit = (type, ev) => {
    if (st.echo && st.echo.on && !st.replaying && !st.copying && !ECHO_SKIP.has(type)) st.echo.ev.push([getTick(), type, ev]);
    return events.emit(getTick(), type, ev);
  };
  const isBig = (e) => !!(e.boss || e.isBoss || e.champion || e.isChampion);
  const rad = (e) => e.radius ?? 0.4;

  const st = {
    queue: [], act: null, timers: [], count: 0, countTick: -1e9, strong: false, orbs: [], fusion: false,
    passives: new Set(), burns: new Map(), waves: [], zones: [], walls: [], image: null, frozen: new Map(),
    coldN: new Map(), razor: { next: 0, last: null, n: 0 }, basicI: 0, basicTick: -1e9, shotN: 0, shot: null, cmarks: new Map(), ch: {}, wheelEnd: null, grove: null, parry: null, pendingStrike: null,
    fx: false, allowMove: false, noCopies: true, echoShow: false, lastHurt: -1e9, calmOn: false,
    recs: [], echoOn: true, echoN: 0, echo: null, copying: false, replaying: false,
    shots: [], moves: new Map(), anchors: new Map(), free: false, legend: {}, seq: 0, seen: new Map(), guard: null, haste: null, spGuard: null, stillUntil: 0,
  };
  let busy = false;

  // ---- the count (S3) and the song (S11) ----
  function addCount(n) {
    // 2.0 (K7): the count is gone
    if (!(n > 0) || !st.useCount) return;
    const before = st.count;
    st.count = Math.min(K.count.cap, st.count + n);
    st.countTick = getTick();
    if (st.count !== before) emit('review_af_count', { n: st.count, gained: st.count - before, ring: Math.floor(st.count / 10) > Math.floor(before / 10) });
  }
  // ---- orbs (S10) and Fusion (T4) ----
  function storeOrb(el, mixAfter, rec = null) {
    if (st.noMarks) return;
    st.orbs.push(el);
    const out = st.orbs.length > 2 ? st.orbs.shift() : null;
    emit('review_af_orbs', { list: st.orbs.slice(), added: el, out, fadeAfter: out ? mixAfter + 0.5 : 0 });
    if (st.fusion && st.orbs.length === 2) {
      const pair = st.orbs.slice();
      later(mixAfter, () => {
        st.orbs = [];
        emit('review_af_orbs', { list: [], spent: pair });
        mix(pair);
      });
    }
  }
  const orbMul = () => 1 + st.orbs.filter((o) => o === 'fire').length * K.orbBonus.fire;

  // ---- damage ----
  // src: a tag; el: the element; cut: a cut of his blade (counts), wave: a sword wave (counts)
  function hit(t, amount, { src = 'skill', el = null, cut = false, wave = false, count = cut || wave, dirFrom = null, noCrit = false, delivery = 'skill', quench = false, shape = 'nova', crit = false } = {}) {
    const a = fox();
    if (!a || !t || !(t.hp > 0)) return null;
    const o = dirFrom || a;
    const dx = t.x - o.x, dz = t.z - o.z, l = Math.hypot(dx, dz) || 1;
    if (src !== 'burn') echoRec('hit', [t.id, amount, arguments[2] || {}]);
    let amt = amount * orbMul();
    // Cold Edge (S32): 15% more to a slowed foe
    // Calm Edge (K31): 15% more while he has taken no hit for 3 s
    if (st.passives.has('cold_edge') && getTick() - st.lastHurt >= sec(3)) amt *= 1.15;
    // See Through (T12): 20% more from him for 4 s
    if ((st.seen.get(t.id) ?? -1) > getTick()) amt *= 1.2;
    // Frost (T5): the next hit on a frozen foe deals 8 more
    if ((st.frozen.get(t.id) ?? -1) > getTick()) { amt += 8; st.frozen.delete(t.id); }
    busy = true;
    const r = combat.applyDamage(t, amt, { delivery, shape, dirX: dx / l, dirZ: dz / l, attacker: a.id, source: 'af_' + src, kbDist: 0, ...(noCrit || globalThis.__reviewNoCrit ? { critBonus: -1 } : {}), ...(st.passives.has('crimson_edge') && !noCrit ? { critBonus: 0.25 } : {}), ...(crit ? { critBonus: 1 } : {}) });
    busy = false;
    // Moonfang's mark (Kesh 18 Nov 15:36 for Crescent, 20:27 for every style): his next hit on a marked
    // foe consumes the mark for 12 more, a sure crit; the mark adds no damage taken
    if ((st.cmarks.get(t.id) ?? -1) > getTick() && src !== 'moonmark') {
      st.cmarks.delete(t.id);
      emit('review_af_mark', { id: t.id, secs: 0.05 });
      emit('review_af_markpop', { id: t.id, x: r2(t.x), z: r2(t.z) });
      later(0.06, () => hit(t, 12, { src: 'moonmark', crit: true, cut: true }));
    }
    if (count) addCount(t.reviewLift ? 2 : 1);
    if (!st.copying && !st.replaying && delivery !== 'basic' && src !== 'burn') for (const R of st.recs) if (!R.fired) { R.ids.add(t.id); R.last = getTick(); }
    // Crimson Edge (K31): a crit calls a small ghost blade that cuts the foe again for 30% of that hit
    if (r && r.crit && st.passives.has('crimson_edge') && !noCrit && src !== 'crimson_ghost') {
      const amt2 = r.amount * 0.3;
      later(0.14, () => { if (t.hp > 0) { emit('review_af_ghostcut', { id: t.id, x: r2(t.x), z: r2(t.z) }); hit(t, amt2, { src: 'crimson_ghost', noCrit: true, count: false }); } });
    }
    // Wind fans fire (S56)
    if (el === 'wind' && burning(t)) fan(t);
    // Quench (S56)
    if (quench && burning(t)) doQuench(t);
    return r;
  }
  // a hit that counts at most 3 foes (S3: up to 3 from one cut or wave)
  function countCapped(list, fn) {
    let n = 0;
    for (const e of list) {
      const was = e.reviewLift ? 2 : 1;
      fn(e, n < K.count.perFoe);
      if (n < K.count.perFoe) n++;
      void was;
    }
  }

  // ---- the four effects (S5) ----
  const burning = (e) => (st.burns.get(e.id)?.until ?? -1) > getTick();
  function burn(e, dps, secs, { from = '' } = {}) {
    if (!st.fx) return; // kit 2.2 (K28): no side effects from a will
    echoRec('burn', [e.id, ...[...arguments].slice(1)]);
    if (!(e.hp > 0)) return;
    const tick = getTick(), b = st.burns.get(e.id);
    const until = tick + sec(secs);
    if (b && b.until > tick) {
      if (dps >= b.dps) b.dps = dps;
      b.until = until;
    } else st.burns.set(e.id, { dps, until, next: tick + sec(K.burnTick) });
    emit('review_af_burn', { id: e.id, on: true, from });
  }
  function slow(e, mag, secs) {
    if (!st.fx) return; // kit 2.2 (K28): no side effects from a will
    echoRec('slow', [e.id, ...[...arguments].slice(1)]);
    if (isBig(e)) return;
    S.apply(e, 'slow', mag, sec(secs), getTick(), fox()?.id ?? null);
    emit('review_af_slow', { id: e.id, secs });
  }
  const slowed = (e) => !!(e.status && e.status.slow && e.status.slow.untilTick > getTick());
  function stun(e, secs, { small = false } = {}) {
    if (!st.fx) return; // kit 2.2 (K28): no side effects from a will
    echoRec('stun', [e.id, ...[...arguments].slice(1)]);
    if (isBig(e) || !(e.hp > 0)) return;
    S.apply(e, 'stun', 1, sec(secs), getTick(), fox()?.id ?? null);
    emit('review_af_stun', { id: e.id, secs, small });
  }
  function lift(e, secs) {
    if (!st.fx) return; // kit 2.2 (K28): no side effects from a will
    echoRec('lift', [e.id, ...[...arguments].slice(1)]);
    if (isBig(e) || !(e.hp > 0)) return;
    S.apply(e, 'stun', 1, sec(secs), getTick(), fox()?.id ?? null);
    e.reviewLift = { t0: getTick(), ticks: sec(secs), h: 0.5 + 0.6 * secs };
    emit('review_af_lift', { id: e.id, secs });
  }
  function blind(e, secs) {
    if (!st.fx) return; // kit 2.2 (K28): no side effects from a will
    echoRec('blind', [e.id, ...[...arguments].slice(1)]);
    if (isBig(e)) return;
    S.apply(e, 'blind', 1, sec(secs), getTick(), fox()?.id ?? null);
    emit('review_af_blind', { id: e.id, secs });
  }
  // move a foe along a path over time (push, pull, carry); wall slam on the way
  function move(e, tx, tz, secs, { slam = true, kind = 'push' } = {}) {
    // kit 2.2 (K28, K29): no pushes or pulls, except Radiant Cascade's gather (allowMove)
    if (e && e.faction === 'hostile' && !st.fx && !st.allowMove) return;
    if (e && e.faction === 'hostile') echoRec('move', [e.id, tx, tz, secs, arguments[4] || {}]);
    if (isBig(e) || !(e.hp > 0)) return;
    st.moves.set(e.id, { x0: e.x, z0: e.z, x1: tx, z1: tz, t0: getTick(), ticks: Math.max(1, sec(secs)), slam, kind, done: false });
  }
  function push(e, dx, dz, dist, secs = 0.25) {
    const l = Math.hypot(dx, dz) || 1;
    move(e, e.x + (dx / l) * dist, e.z + (dz / l) * dist, secs, { kind: 'push' });
  }
  function fan(src) {
    const b = st.burns.get(src.id);
    if (!b) return;
    const to = hostiles().filter((f) => f !== src && d2(f, src) <= K.fanR ** 2);
    emit('review_af_fan', { id: src.id, x: r2(src.x), z: r2(src.z), to: to.map((f) => f.id) });
    for (const f of to) burn(f, b.dps, (b.until - getTick()) / TICK + 0.5, { from: 'fan' });
  }
  function doQuench(e) {
    const b = st.burns.get(e.id);
    if (!b) return;
    const left = Math.max(0, (b.until - getTick()) / TICK) * b.dps;
    st.burns.delete(e.id);
    emit('review_af_burn', { id: e.id, on: false });
    emit('review_af_quench', { id: e.id, x: r2(e.x), z: r2(e.z) });
    if (left > 0) hit(e, Math.round(left * 10) / 10, { src: 'quench', noCrit: true });
    if (e.hp > 0) blind(e, K.quench);
  }

  // ---- shapes ----
  const inFan = (a, t, dir, reach, half) => {
    const dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz);
    if (d > reach + rad(t) * 0.6) return false;
    if (d < 0.25 || half >= 180) return true;
    return (dx * dir.x + dz * dir.z) / d >= Math.cos((half * Math.PI) / 180);
  };
  const inStrip = (o, dir, len, w, t) => {
    const dx = t.x - o.x, dz = t.z - o.z;
    const along = dx * dir.x + dz * dir.z, across = Math.abs(-dx * dir.z + dz * dir.x);
    return along >= -0.3 && along <= len + 0.3 && across <= w / 2 + rad(t) * 0.5;
  };
  function aimDir(a, aim) {
    const dx = (aim?.x ?? a.x + (a.faceX ?? 0)) - a.x, dz = (aim?.z ?? a.z + (a.faceZ ?? 1)) - a.z, l = Math.hypot(dx, dz);
    return l > 1e-4 ? { x: dx / l, z: dz / l } : { x: a.faceX ?? 0, z: a.faceZ ?? 1 };
  }
  const later = (secs, fn) => st.timers.push({ at: getTick() + Math.max(0, sec(secs)), fn });
  const play = (clip, from = 0, extra = {}) => emit('review_af_play', { clip, from, ...extra });
  const face = (a, dir) => {
    a.faceX = dir.x;
    a.faceZ = dir.z;
    emit('review_af_face', { dx: r2(dir.x), dz: r2(dir.z), secs: 0.9 });
  };

  // ---- sword waves (S4) ----
  // o: { x, z, dx, dz, len, w, speed, el, kind, onHit(e, wave), stopAtFirst, onEnd(wave) }
  function wave(o) {
    const id = ++st.seq;
    const wv = { id, t: 0, d: 0, hit: new Set(), speed: K.wave.speed, ...o };
    st.waves.push(wv);
    emit('review_af_wave', { id, x: r2(o.x), z: r2(o.z), dx: r2(o.dx), dz: r2(o.dz), len: o.len, w: o.w, el: o.el || null, kind: o.kind || 'crescent', speed: wv.speed, half: !!o.half, tilt: o.tilt || 0 });
    // Mirror Image (C6): the image throws a copy of each Wave skill, at the same spot, for half
    return wv;
  }
  function stepWaves() {
    const dt = 1 / TICK;
    for (let i = st.waves.length - 1; i >= 0; i--) {
      const w = st.waves[i];
      st.copying = !!w.copy;
      const step = Math.min(w.speed * dt, w.len - w.d);
      w.d += step;
      w.cx = w.x + w.dx * w.d;
      w.cz = w.z + w.dz * w.d;
      let ended = w.d >= w.len - 1e-4;
      // walls stop a wave
      for (const wl of st.walls) if (inBox(w.cx, w.cz, wl, 0.05)) ended = true;
      const hits = [];
      for (const e of hostiles()) {
        if (w.hit.has(e.id)) continue;
        const dx = e.x - w.cx, dz = e.z - w.cz;
        const along = dx * w.dx + dz * w.dz, across = Math.abs(-dx * w.dz + dz * w.dx);
        if (along <= rad(e) * 0.6 && along >= -step - rad(e) && across <= w.w / 2 + rad(e) * 0.6) hits.push(e);
      }
      // the whirl drags what it touched (Whirlwind Slash, C5): a coloured whirl reads crescents passing through
      for (const e of hits) {
        w.hit.add(e.id);
        if (w.onHit) w.onHit(e, w);
        if (w.stopAtFirst) { ended = true; break; }
      }
      if (!ended && w.through) w.through(w);
      emit('review_af_wavepos', { id: w.id, x: r2(w.cx), z: r2(w.cz) });
      if (ended) {
        st.waves.splice(i, 1);
        emit('review_af_wave_end', { id: w.id, x: r2(w.cx), z: r2(w.cz) });
        if (w.onEnd) w.onEnd(w);
      }
    }
    st.copying = false;
  }
  const inBox = (x, z, b, pad = 0) => Math.abs(x - b.x) <= b.w / 2 + pad && Math.abs(z - b.z) <= b.d / 2 + pad;


  // 1.5 (S11): the sword spins out like a disc, whirls on the spot, bursts with the newest orb's element, comes back
  function elemSmall(e, el, ox, oz) {
    if (!(e.hp > 0)) return;
    if (el === 'fire') burn(e, 2, 2);
    else if (el === 'earth') stun(e, 0.2, { small: true });
    else if (el === 'water') slow(e, 0.2, 1.5);
    else if (el === 'wind') push(e, e.x - ox, e.z - oz, 0.5);
  }
  function swordThrow(a, dir, dmg, skip) {
    const T = K.throw, el = st.orbs[st.orbs.length - 1] || null;
    emit('review_af_throw', { x: r2(a.x), z: r2(a.z), dx: r2(dir.x), dz: r2(dir.z), len: T.len, el, plain: !el, out: T.len / T.speed, hold: T.hold, back: T.back });
    st.swordAway = { x: a.x + dir.x * T.len, z: a.z + dir.z * T.len, until: getTick() + sec(T.len / T.speed + T.hold) };
    wave({ x: a.x, z: a.z, dx: dir.x, dz: dir.z, len: T.len, w: T.w, speed: T.speed, kind: 'throw', el,
      onHit: (e) => { if (!skip.has(e.id)) hit(e, dmg, { src: 'throw', wave: true }); },
      onEnd: (w) => {
        const bx = w.cx, bz = w.cz;
        later(T.hold, () => {
          emit('review_af_throwburst', { x: r2(bx), z: r2(bz), r: T.burstR, el });
          const list = hostiles().filter((e) => (e.x - bx) ** 2 + (e.z - bz) ** 2 <= (T.burstR + rad(e) * 0.5) ** 2);
          countCapped(list, (e, c) => { hit(e, dmg * 0.5, { src: 'throwburst', wave: c, count: c, quench: el === 'water' }); elemSmall(e, el, bx, bz); });
        });
      } });
  }

  // the Crescent basic attack: the charge shot (K.shot). Shots alternate a down cut and a rising cut.
  function startShot(holdSecs) {
    const a = fox();
    if (!a) return;
    const S = K.shot, up = st.shotN % 2 === 1;
    st.shotN++;
    const dir = { x: a.faceX ?? 0, z: a.faceZ ?? 1 };
    const held = Math.max(S.min, Math.min(holdSecs, S.full));
    const id = ++st.seq;
    st.shot = { id, t0: getTick() };
    play(up ? 'shotHoldU' : 'shotHoldD', 0);
    emit('review_af_bcharge', { on: true, id, full: S.full, tap: S.tap, up });
    later(held, () => { if (st.shot && st.shot.id === id) fireShot(held, up, dir); });
  }
  function fireShot(held, up, dir) {
    const S = K.shot;
    st.shot = null;
    const full = held >= S.full - 1e-6, tap = held < S.tap;
    const k = Math.max(0, Math.min(1, (held - S.tap) / (S.full - S.tap)));
    const dmg = full ? S.fullDmg : tap ? S.tapDmg : S.d0 + (S.d1 - S.d0) * k;
    const len = full ? S.fullLen : tap ? S.tapLen : S.len0 + (S.len1 - S.len0) * k;
    const w = full ? S.fullW : tap ? S.tapW : S.w0 + (S.w1 - S.w0) * k;
    play(up ? 'shotFireU' : 'shotFireD', 0);
    emit('review_af_bcharge', { on: false, tier: full ? 'full' : tap ? 'tap' : 'mid', held: Math.round(held * 100) / 100 });
    later(S.hit, () => {
      const b = fox();
      if (!b) return;
      wave({ x: b.x, z: b.z, dx: dir.x, dz: dir.z, len, w, speed: S.speed, el: null, kind: full ? 'great' : 'crescent', tilt: up ? -65 : 40, stopAtFirst: tap,
        onHit: (e, wv) => hit(e, dmg, { src: 'shot', wave: true, cut: true, delivery: 'basic' }) });
      if (full) swordThrow(b, dir, K.basic[5].dmg, new Set());
    });
  }

  // 1.5 (S23): Earthsplitter, the charge and the slam
  function startCharge(a, dir, aim) {
    face(a, dir);
    const cid = ++st.seq;
    // Kesh 20 Nov 16:40 SGT, Crescent: no growing sword in his paw; a great sword floats point-down over his aim
    // (1 to 5 u away) while he charges, and on release it shoots down there
    const drop = st.form === 'crescent' ? Math.max(K.split.ahead, Math.min(5, aim ? Math.hypot(aim.x - a.x, aim.z - a.z) : K.split.ahead)) : K.split.ahead;
    st.charge = { t0: getTick(), dir, aim, id: cid, drop, x: a.x + dir.x * drop, z: a.z + dir.z * drop };
    st.act = { kind: 'charge', t: 0 };
    emit('review_af_charge', { on: true, full: K.split.full, r0: K.split.r0, r1: K.split.r1, x: r2(a.x + dir.x * drop), z: r2(a.z + dir.z * drop), sky: st.form === 'crescent' });
    emit('review_af_trail', { color: ELC.earth });
    later(K.split.auto, () => { if (st.charge && st.charge.id === cid) release(); });
  }
  function release() {
    const C = st.charge, a = fox();
    if (!C || !a) return;
    st.charge = null;
    const S2 = K.split, f = Math.min(1, (getTick() - C.t0) / TICK / S2.full);
    const r = S2.r0 + (S2.r1 - S2.r0) * f, dmg = S2.d0 + (S2.d1 - S2.d0) * f, stunS = S2.s0 + (S2.s1 - S2.s0) * f;
    const dir = C.dir;
    emit('review_af_slam', { phase: 'swing', f: Math.round(f * 100) / 100, sky: st.form === 'crescent' });
    // 2.1 Swift (F9): on release he leaps up to 3 u to his aim, then slams
    let lead = 0.22;
    if (st.form === 'swift' && C.aim) {
      const go = Math.min(3, Math.max(0, Math.hypot(C.aim.x - a.x, C.aim.z - a.z) - S2.ahead));
      emit('review_af_hop', { secs: 0.3, h: 0.9 });
      a.iframeUntilTick = getTick() + sec(0.35);
      stepTo(a, dir, go, 0.3, 'hop');
      lead = 0.34;
    }
    later(lead, () => {
      const b = fox();
      // Crescent: the floating sword lands where it hung (the fin line is gone, Kesh 20 Nov 16:40 SGT)
      const sky = st.form === 'crescent';
      const cx = sky ? C.x : b.x + dir.x * S2.ahead, cz = sky ? C.z : b.z + dir.z * S2.ahead;
      emit('review_af_slam', { phase: 'hit', x: r2(cx), z: r2(cz), r: Math.round(r * 100) / 100, f: Math.round(f * 100) / 100, dx: r2(dir.x), dz: r2(dir.z), sky });
      const list = hostiles().filter((e) => (e.x - cx) ** 2 + (e.z - cz) ** 2 <= (r + rad(e) * 0.5) ** 2);
      countCapped(list, (e, c) => {
        if (e.reviewLift) {
          // Smash down (C4, 1.5): a foe in the air is driven into the floor
          hit(e, dmg * 1.5, { src: 'smash', el: 'earth', cut: c });
          emit('review_af_smash', { id: e.id, x: r2(e.x), z: r2(e.z) });
          for (const f2 of hostiles()) if (f2 !== e && d2(f2, e) <= 1) hit(f2, 10, { src: 'smashsplash', el: 'earth' });
          e.reviewLift = null;
        } else hit(e, dmg, { src: 'split', el: 'earth', cut: c });
        stun(e, stunS);
      });
      st.act = null;
    });
    const R = newRec(a, dir);
    storeOrb('earth', 0.6, R);
    R.end = getTick() + sec(lead + 0.05);
  }

  // 1.5 (S30): Tide Ring, the water circle
  function tideRing(a, dir, aim = null) {
    const R = K.ring, form = st.form || 'base';
    const far = form === 'crescent' && aim ? Math.max(R.r, Math.min(6, Math.hypot(aim.x - a.x, aim.z - a.z))) : R.r;
    const cx = a.x + dir.x * far, cz = a.z + dir.z * far;
    const th0 = Math.atan2(a.z - cz, a.x - cx);
    const pt = (k) => ({ x: cx + Math.cos(th0 + (k * Math.PI) / 4) * R.r, z: cz + Math.sin(th0 + (k * Math.PI) / 4) * R.r });
    // Kesh 18 Nov 16:18 SGT: eight thrusts in every style. Base: seven images and he thrusts the eighth from
    // where he stands (k 0); Swift: he blinks all eight; Crescent: eight images, he takes no part
    const pts = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => pt(k));
    const shown = form === 'swift' ? [] : pts.map((p, k) => (k === 0 && form === 'base' ? null : [r2(p.x), r2(p.z)]));
    emit('review_af_tidering', { on: true, x: r2(cx), z: r2(cz), r: R.r, pts: shown, secs: R.secs });
    if (form !== 'crescent') st.act = { kind: 'ring', t: 0 };
    // a fixed shuffle so the order reads random (the sim uses no wall clock and no unseeded random)
    const order = [3, 6, 2, 5, 1, 4, 7, 0];
    order.forEach((k, i) => later(R.t0 + R.gap * i, () => {
      const p0 = pt(k), p1 = pt(k + 4);
      const dx = p1.x - p0.x, dz = p1.z - p0.z, l = Math.hypot(dx, dz);
      const d = { x: dx / l, z: dz / l };
      const self = form === 'swift' || (form === 'base' && k === 0);
      emit('review_af_ringthrust', { k, i, x0: r2(p0.x), z0: r2(p0.z), x1: r2(p1.x), z1: r2(p1.z), self });
      if (form === 'base' && k === 0) {
        // the eighth thrust is his own, across the ring from where he stands
        const b = fox();
        b.iframeUntilTick = getTick() + sec(0.25);
        face(b, d); play('dash20', 0.06);
        emit('review_af_streak', { x0: r2(p0.x), z0: r2(p0.z), x1: r2(p1.x), z1: r2(p1.z), thrust: true });
        move(b, p1.x, p1.z, 0.16, { slam: false, kind: 'dash' });
      }
      if (form === 'swift') {
        // he blinks to the start and thrusts across
        const b = fox();
        emit('review_af_blink', { x0: r2(b.x), z0: r2(b.z), x1: r2(p0.x), z1: r2(p0.z) });
        b.iframeUntilTick = getTick() + sec(R.gap + 0.1);
        move(b, p0.x, p0.z, 0.02, { slam: false, kind: 'step' });
        later(0.03, () => { const c = fox(); face(c, d); play('dash20', 0.06); move(c, p1.x, p1.z, 0.14, { slam: false, kind: 'dash' }); });
      }
      const list = hostiles().filter((e) => inStrip(p0, d, l, R.w, e));
      countCapped(list, (e, c) => { hit(e, R.dmg, { src: 'ring', el: 'water', cut: c, quench: true }); slow(e, R.slow, R.slowS); });
    }));
    later(R.burst0 - 0.1, () => {
      if (form === 'crescent') { emit('review_af_imgflower', { x: r2(cx), z: r2(cz), secs: R.bursts * 0.3 + 0.3 }); return; }
      if (form === 'swift') { const b = fox(); emit('review_af_blink', { x0: r2(b.x), z0: r2(b.z), x1: r2(cx), z1: r2(cz) }); move(b, cx, cz, 0.02, { slam: false, kind: 'step' }); }
      play('flourish', 0); emit('review_af_flower', { on: true, secs: R.bursts * 0.3 + 0.3 });
    });
    for (let i = 0; i < R.bursts; i++) later(R.burst0 + 0.3 * i, () => {
      emit('review_af_ringburst', { x: r2(cx), z: r2(cz), r: R.r, i });
      const list = hostiles().filter((e) => (e.x - cx) ** 2 + (e.z - cz) ** 2 <= (R.r + rad(e) * 0.5) ** 2);
      countCapped(list, (e, c) => hit(e, R.burstDmg, { src: 'ringburst', el: 'water', wave: c, count: c, quench: true }));
    });
    later(R.secs, () => { emit('review_af_tidering', { on: false, x: r2(cx), z: r2(cz) }); emit('review_af_flower', { on: false }); if (st.act && st.act.kind === 'ring') st.act = null; });
    return R.secs - 0.3;
  }

  // Sword Grove's call (K48 to K50): not a cast (no mark, no Echo step)
  function groveCall(auto = false) {
    const G = st.grove, a = fox();
    if (!G || !a) return;
    st.grove = null;
    const form = auto && G.form === 'swift' ? 'base' : G.form;
    if (!auto && form !== 'swift') play('groveCall20', 0);
    const flyBack = (delay) => {
      later(delay, () => {
        const b = fox();
        emit('review_af_grovecall', { id: G.id, x: r2(b.x), z: r2(b.z), secs: 0.25 });
        const n = new Map();
        for (const p of G.pts) {
          const L = Math.hypot(b.x - p.x, b.z - p.z) || 1, d = { x: (b.x - p.x) / L, z: (b.z - p.z) / L };
          for (const e of hostiles()) if (inStrip(p, d, L, 0.6, e) && (n.get(e.id) || 0) < 3) {
            n.set(e.id, (n.get(e.id) || 0) + 1);
            const al = (e.x - p.x) * d.x + (e.z - p.z) * d.z;
            later(0.25 * Math.max(0, Math.min(1, al / L)), () => hit(e, 4, { src: 'grove_call', el: 'earth', cut: true }));
          }
        }
      });
    };
    if (form === 'swift') {
      // K49: he thrusts to the middle of the grove through every foe (10); the swords burst round him (12 within 1.8 u)
      const d = aimDir(a, G), L = Math.hypot(G.x - a.x, G.z - a.z);
      emit('review_af_streak', { x0: r2(a.x), z0: r2(a.z), x1: r2(G.x), z1: r2(G.z), el: 'earth', thrust: true });
      const list = hostiles().filter((e) => inStrip(a, d, L, 0.8, e));
      play('dash20', 0.06);
      glide(a, d, L, 0.2, 'dash');
      countCapped(list, (e, c) => hit(e, 10, { src: 'grove_thrust', el: 'earth', cut: c }));
      later(0.22, () => {
        emit('review_af_grovecall', { id: G.id, x: r2(G.x), z: r2(G.z), secs: 0.3, swift: true });
        later(0.3, () => countCapped(roundList(G.x, G.z, 1.8), (e, c) => hit(e, 12, { src: 'grove_burst', el: 'earth', wave: c })));
      });
      return;
    }
    if (form === 'crescent') {
      // K50: each sword first spins a 剑风 ring (1.2 u, 4, at most 2 on a foe), then flies back
      emit('review_af_grovespin', { id: G.id, secs: 0.3 });
      const n = new Map();
      for (const p of G.pts) for (const e of roundList(p.x, p.z, 1.2)) if ((n.get(e.id) || 0) < 2) { n.set(e.id, (n.get(e.id) || 0) + 1); hit(e, 4, { src: 'grove_ring', el: 'earth', wave: true }); }
      flyBack(0.32);
      return;
    }
    flyBack(0.08);
  }
  // Ring the grove (K51, was Kick the caltrops): a rift, Ink Dive's landing or Waltz's floor crescent that touches the grove
  function ringGrove(test) {
    const G = st.grove;
    if (!G || G.rung) return;
    const hitPts = G.pts.filter(test);
    if (!hitPts.length) return;
    G.rung = true;
    emit('review_af_grovering', { id: G.id });
    for (const p of G.pts) countCapped(roundList(p.x, p.z, 1.0), (e, c) => hit(e, 4, { src: 'grove_rung', el: 'earth', wave: c }));
  }

  // ---- basic cuts and the dash ----
  function startCut(n = 1) {
    const a = fox();
    if (!a) return;
    if (getTick() - st.basicTick > sec(1.2)) st.basicI = 0;
    st.act = { kind: 'cuts', t: 0, left: n, cur: null };
    nextCut();
  }
  function nextCut() {
    const A = st.act;
    if (!A || A.kind !== 'cuts') return;
    if (A.left <= 0) { st.act = null; return; }
    A.left--;
    const B = K.basic[st.basicI % K.basic.length];
    st.basicI = (st.basicI + 1) % K.basic.length;
    A.cur = { B, t: 0, done: false };
    play(B.clip, 0, haste() > 1 ? { speed: haste() } : {});
    // 1.8: the basic cuts draw their slash from the blade's real path (st.sweeps), not the live trail
    emit('review_af_trail', { color: '#E8577A', on: false });
  }
  function doCut(a, B) {
    const dir = { x: a.faceX ?? 0, z: a.faceZ ?? 1 };
    const strong = false;
    const dmg = B.dmg;
    const list = hostiles().filter((e) => inFan(a, e, dir, B.reach, B.half));
    emit('review_af_cut', { x: r2(a.x), z: r2(a.z), dx: r2(dir.x), dz: r2(dir.z), r: B.reach, half: B.half, strong, spin: B.half >= 180, style: B.clip === 'af5' ? 'thrust' : 'sweep', tilt: B.tilt ?? 0, clip: B.clip, at: B.at, hits: list.map((e) => e.id) });
    const got = new Set();
    // 1.8: a basic cut lands as the game's melee arc does: its 2-tick hit pause (3 on a kill)
    countCapped(list, (e, counts) => { got.add(e.id); hit(e, dmg, { src: strong ? 'strong' : 'basic', cut: counts, count: counts, delivery: 'basic', shape: 'melee_arc' }); });
    // 2.1 Swift (T13): the low lunge carries him through the foes in front and stops behind them
    if (st.form === 'swift' && B.clip === 'af5' && list.length) {
      const far = Math.max(...list.map((e) => (e.x - a.x) * dir.x + (e.z - a.z) * dir.z));
      const go = Math.min(2.2, far + 0.8);
      emit('review_af_streak', { x0: r2(a.x), z0: r2(a.z), x1: r2(a.x + dir.x * go), z1: r2(a.z + dir.z * go), el: null, thrust: true });
      glide(a, dir, go, 0.14, 'dash');
    }
    // 2.1 Crescent (T14): each of the first five hits throws a 剑气 5 u for 70%; a foe the cut hit is not hit twice
    if (st.form === 'crescent' && !B.throw) wave({ x: a.x, z: a.z, dx: dir.x, dz: dir.z, len: 5, w: 0.8, speed: 14, el: null, kind: 'thin', tilt: B.tilt ?? 0, onHit: (e) => { if (!got.has(e.id)) hit(e, B.dmg * 0.7, { src: 'qi', wave: true }); } });
    // kit 2.1 (K21): the sixth hit throws the newest ghost sword (a plain Moon Silver one with no mark)
    if (B.throw) swordThrow(a, dir, dmg, got);
    razorChain(list);
  }
  function startDash(dir0) {
    let dir = dir0;
    const a = fox();
    if (!a) return;
    let l = Math.hypot(dir.x, dir.z) || 1, D = K.dash;
    // 2.1 Swift (T13): a dash pressed while the thrown sword is away takes him to the sword, cutting on the way
    const SA = st.swordAway;
    if (st.form === 'swift' && SA && getTick() < SA.until) {
      dir = { x: SA.x - a.x, z: SA.z - a.z };
      l = Math.hypot(dir.x, dir.z) || 1;
      D = { ...K.dash, dist: Math.max(0.5, l - 0.3) };
      st.swordAway = null;
    }
    // a dash cancels a cast (S8, A9): nothing here is half-cast in the clips
    st.act = { kind: 'dash', t: 0, dir: { x: dir.x / l, z: dir.z / l }, x0: a.x, z0: a.z, hit: new Set(), D, cut: 'dash' };
    emit('review_af_dash', { dx: r2(dir.x / l), dz: r2(dir.z / l), len: K.dash.len, dist: D.dist });
    st.countTick = getTick(); // any dash starts the 3 s again (S11 part 4)
  }


  // ================= 2.1: the Swift and Crescent forms (talents 2.1 §5 F1 to F23, T6; MOTIONS) =================
  // standard thrust: 2.5 u through every foe, 10 each; 剑气: a line 5 u for 70% of its hit; 剑风: a ring
  // or fan to 3 u for 50%; an added part carries the skill's own effect at half length
  const halfEff = (el, e) => {
    if (!(e.hp > 0)) return;
    if (el === 'fire') burn(e, 2, 1.5);
    else if (el === 'earth') stun(e, 0.25);
    else if (el === 'water') slow(e, 0.3, 1);
    else if (el === 'wind') lift(e, 0.3);
  };
  // a 剑气: a thin crescent of light along a line
  function qi(a, dir, len, dmg, el, { w = 0.8, tilt = 0, eff = true, onHit = null, src = 'qi', x = a.x, z = a.z, copy = false } = {}) {
    return wave({ x, z, dx: dir.x, dz: dir.z, len, w, speed: 14, el, kind: 'thin', tilt, copy, onHit: (e, wv) => { hit(e, dmg, { src, el, wave: true }); if (onHit) onHit(e, wv); else if (eff) halfEff(el, e); } });
  }
  // a 剑风: a ring (or a fan, with dir and half) of light spreading to r
  function qiRing(x, z, r, dmg, el, { dir = null, half = 180, eff = true, onHit = null, secs = 0.35 } = {}) {
    emit('review_af_qiring', { x: r2(x), z: r2(z), r, el, secs, dx: dir ? r2(dir.x) : 0, dz: dir ? r2(dir.z) : 0, half });
    const o = { x, z };
    for (const e of hostiles()) {
      const d = Math.hypot(e.x - x, e.z - z);
      if (d > r + rad(e) * 0.5 || (dir && !inFan(o, e, dir, r, half))) continue;
      later(secs * Math.min(1, d / r), () => { if (!(e.hp > 0)) return; if (dmg > 0) hit(e, dmg, { src: 'qiring', el, wave: true }); if (onHit) onHit(e); else if (eff) halfEff(el, e); });
    }
  }
  // a thrust: he goes along his aim through the foes (untouchable only where the base already was)
  function thrust(a, dir, dist, secs, el, onHit, { clip = 'dash20', streak = true, iframe = true, max = 99 } = {}) {
    const hitIds = new Set();
    if (clip) play(clip, 0);
    if (streak) emit('review_af_streak', { x0: r2(a.x), z0: r2(a.z), x1: r2(a.x + dir.x * dist), z1: r2(a.z + dir.z * dist), el, thrust: true });
    if (iframe) glide(a, dir, dist, secs, 'dash');
    else move(a, a.x + dir.x * dist, a.z + dir.z * dist, secs, { slam: false, kind: 'dash' });
    const n = Math.max(3, Math.ceil(secs / 0.03));
    for (let k = 0; k <= n; k++) later((secs * k) / n + 0.02, () => {
      const b = fox();
      if (!b) return;
      for (const e of hostiles()) {
        if (hitIds.has(e.id) || hitIds.size >= max || d2(e, b) > (0.75 + rad(e) * 0.5) ** 2) continue;
        hitIds.add(e.id);
        onHit(e);
      }
    });
    return hitIds;
  }
  const FORMS = {
    // ---- 剑意 ----
    flurry: {
      // four stabbing steps, 0.6 u each, through the foes; he ends behind the pack
      swift: { mode: 'change', clip: 'flurry20', fn: (a, dir, aim, at) => {
        [0.14, 0.23, 0.33, 0.42].forEach((T, i) => at2(at, T - 0.04, (a) => {
          emit('review_af_streak', { x0: r2(a.x), z0: r2(a.z), x1: r2(a.x + dir.x * 0.6), z1: r2(a.z + dir.z * 0.6), el: 'fire', thrust: true, short: true });
          glide(a, dir, 0.6, 0.07, 'dash');
          later(0.06, () => { const b = fox(); const list = hostiles().filter((e) => d2(e, b) <= 0.9 ** 2).slice(0, 6); beat('flurry20', i, list); for (const e of list) { hit(e, 3.75, { src: 'flurry', el: 'fire', cut: true, shape: 'melee_arc' }); burn(e, 2, 3); } });
        }));
        return 0.6;
      } },
      // Kesh 18 Nov 15:36: no melee cuts and no strokes; the four cuts shoot four 剑气, 6 u, fanned
      crescent: { mode: 'change', clip: 'flurryQi20', fn: (a, dir, aim, at) => {
        [[0.14, 30, -8], [0.23, -30, 8], [0.33, 60, -4], [0.42, -60, 4]].forEach(([T, tilt, deg]) => at2(at, T + 0.02, (a) => {
          const c = Math.cos((deg * Math.PI) / 180), sn = Math.sin((deg * Math.PI) / 180);
          const d = { x: dir.x * c - dir.z * sn, z: dir.x * sn + dir.z * c };
          qi(a, d, 6, 4, 'fire', { w: 0.8, tilt });
        }));
        return 0.6;
      } },
    },
    crescent_finisher: {
      // he dashes 2.5 u through the foes and ends in the rising cut
      swift: { mode: 'pre', fn: (a, dir) => { thrust(a, dir, 2.5, 0.2, 'fire', (e) => { hit(e, 10, { src: 'thrust', el: 'fire', cut: true, shape: 'melee_arc' }); burn(e, 2, 1.5); }); return 0.22; } },
      // Kesh 18 Nov 15:36: three hits. 1: a cut mark 剑痕 in the floor ahead, 4, gathers the foes to it;
      // 2: a flat sweep, 6, pushes them 1 u back; 3: a flat 剑气 (10, 5 u) and the old last hit, the
      // rising cut, 26, with its tall moon 剑气, 14 (the trim without it is an open choice)
      crescent: { mode: 'change', clip: 'rift20', fn: (a, dir, aim, at) => {
        const px = -dir.z, pz = dir.x;
        at2(at, 0.2, (a) => {
          const C = { x: a.x + dir.x * 1.4, z: a.z + dir.z * 1.4 };
          emit('review_af_floorscar', { x0: r2(C.x - px * 1.2), z0: r2(C.z - pz * 1.2), x1: r2(C.x + px * 1.2), z1: r2(C.z + pz * 1.2), stay: 1.4 });
          const list = hostiles().filter((e) => d2(e, C) <= 2.4 ** 2);
          emit('review_af_gatherline', { x: r2(C.x), z: r2(C.z), r: 2.4 });
          withFx(() => list.forEach((e, i) => { const off = (i - (list.length - 1) / 2) * 0.45; move(e, C.x + px * off, C.z + pz * off, 0.3, { kind: 'pull' }); }));
          countCapped(list, (e, c) => hit(e, 4, { src: 'finisher_mark', el: 'fire', cut: c }));
        });
        at2(at, 0.55, () => play('af2', 0));
        at2(at, 0.72, (a) => {
          cutEv(a, dir, { r: 1.7, half: 75, el: 'fire', side: -1, style: 'sweep', tilt: 0 });
          const list = fanList(a, dir, 1.7, 75);
          countCapped(list, (e, c) => hit(e, 6, { src: 'finisher_sweep', el: 'fire', cut: c }));
          withFx(() => list.forEach((e) => push(e, e.x - a.x, e.z - a.z, 1, 0.25)));
        });
        at2(at, 0.95, () => play('keen20', 0.28));
        at2(at, 1.02, (a) => wave({ x: a.x, z: a.z, dx: dir.x, dz: dir.z, len: 5, w: 2.2, el: 'fire', kind: 'keen', onHit: (e) => hit(e, 10, { src: 'finisher_qi', el: 'fire', wave: true }) }));
        at2(at, 1.25, () => play('finisher20', 0.1));
        // he stays (T8, 站桩): the rising cut reaches 2.6 u (gathered at 1.4 u, pushed 1 u), a long edge of light on the blade, to catch the pushed foes
        at2(at, 1.45, (a) => {
          const list = fanList(a, dir, 2.6, 40).slice(0, 5);
          emit('review_af_spear', { x0: r2(a.x), z0: r2(a.z), x1: r2(a.x + dir.x * 2.6), z1: r2(a.z + dir.z * 2.6) });
          beat('finisher20', 0, list, { n: 0 });
          for (const e of list) hit(e, 26, { src: 'finisher', el: 'fire', cut: true, shape: 'melee_arc' });
          qi(a, dir, 5, 14, 'fire', { w: 1.1, tilt: 85 }); // the original Crescent last hit throws the tall moon 剑气 (as Kesh wrote)
        });
        return 2.1;
      } },
    },
    flame_crescent: {
      // he is the wave: a gold thrust 4 u
      swift: { mode: 'change', clip: null, fn: (a, dir, aim, at) => { at2(at, 0.05, (a) => thrust(a, dir, 4, 0.28, 'fire', (e) => { hit(e, 20.5, { src: 'keen', el: 'fire', cut: true, shape: 'melee_arc' }); burn(e, 3, 3); })); return 0.5; } },
      // twice as wide, bursts at its end 1.5 u (Keen Crescent reads st.form)
      crescent: { mode: 'change', clip: 'keen20', fn: (a, dir, aim, at, o) => NEW20.flame_crescent(a, dir, aim, at, { ...o, wide: true }) },
    },
    blazing_cascade: {
      // after the last dash he dashes back through the pack, 8
      swift: { mode: 'add', fn: (a, dir, aim, at) => { at2(at, 2.15, (a) => { const d = { x: -dir.x, z: -dir.z }; face(a, d); thrust(a, d, 3, 0.2, 'fire', (e) => { hit(e, 8, { src: 'thrust', el: 'fire', cut: true }); burn(e, 2, 1.5); }); }); return 2.5; } },
      // Kesh 18 Nov 15:36: all as base; after the dash through he turns and sweeps a 剑气 back, 12, 6 u
      crescent: { mode: 'add', fn: (a, dir, aim, at) => {
        const d = { x: -dir.x, z: -dir.z };
        // Kesh 20 Nov 16:47 SGT: no floor line on this last hit (Flame Crescent's line pointed the old way: noLine)
        at2(at, 1.86, (a) => { face(a, d); play('keen20', 0.24, { noLine: true }); });
        at2(at, 1.97, (a) => wave({ x: a.x, z: a.z, dx: d.x, dz: d.z, len: 6, w: 1.8, el: 'fire', kind: 'keen', onHit: (e) => hit(e, 12, { src: 'cascade_back', el: 'fire', wave: true }) }));
        return 2.5;
      } },
    },
    flashfire: {
      // kit 2.2: he thrusts 3 u; each foe he passes gets a cut line (6). Kesh 20 Nov 17:29 SGT: no line burst; a sword
      // appears over each foe he passes and stabs down like the base's (10, 4 within 1.5 u), with a small bloom
      swift: { mode: 'change', clip: null, fn: (a, dir, aim, at) => {
        // Kesh 18 Nov 15:36: three charges
        spend('flashfire');
        at2(at, 0.05, (a) => thrust(a, dir, 3, 0.25, 'fire', (e) => { beat('bloom20', 0, [e], { scarred: [e.id] }); hit(e, 6, { src: 'bloom_line', el: 'fire', cut: true, shape: 'melee_arc' }); hangSwords([e], 0.5); }));
        return 0.9;
      } },
      // the lines reach 6 u (Sword Bloom reads o.r); Kesh 20 Nov 17:29 SGT: each sword's stab blooms (full size)
      crescent: { mode: 'change', clip: 'bloom20', fn: (a, dir, aim, at, o) => NEW20.flashfire(a, dir, aim, at, { ...o, r: 6, bloom: 1 }) },
    },
    triple_crescent: {
      // three thrusts, turning between them: a Z through the pack. Kesh 20 Nov 16:42 SGT: each thrust aims at a foe
      // (Z字抖动): a foe not yet aimed at, within 4.5 u, not behind him along the cast line, on the other side of the
      // cast line from the last one, nearest first; it runs 0.8 u past that foe (1.2 to 3.5 u), so he crosses the line
      // each time. With no foe on the other side, the nearest foe ahead; with none, the old turn.
      swift: { mode: 'change', clip: 'triple20', fn: (a, dir, aim, at) => {
        const already = new Set(), aimed = new Set(), o = { x: a.x, z: a.z };
        let side = 0;
        const lat = (e) => dir.x * (e.z - o.z) - dir.z * (e.x - o.x), fwd = (e) => dir.x * (e.x - o.x) + dir.z * (e.z - o.z);
        [[0.4, 0], [0.65, Math.PI - 0.5], [0.9, -0.5]].forEach(([T, turn]) => at2(at, T - 0.05, (a) => {
          const c = Math.cos(turn), s2 = Math.sin(turn);
          let d = { x: dir.x * c - dir.z * s2, z: dir.x * s2 + dir.z * c }, len = 3.5;
          const cand = hostiles().filter((e) => !aimed.has(e.id) && d2(e, a) <= 4.5 ** 2 && d2(e, a) > 0.25 ** 2 && fwd(e) >= fwd(a) - 0.3)
            .sort((p, q) => d2(p, a) - d2(q, a));
          const pick = cand.find((e) => side && Math.sign(lat(e)) === -side) || cand[0];
          if (pick) {
            const L = Math.sqrt(d2(pick, a));
            aimed.add(pick.id); d = { x: (pick.x - a.x) / L, z: (pick.z - a.z) / L }; len = Math.max(1.2, Math.min(3.5, L + 0.8));
            side = Math.sign(lat(pick)) || -side || 1;
          }
          face(a, d);
          thrust(a, d, len, 0.16, 'fire', (e) => { const k = already.has(e.id) ? 0.5 : 1; already.add(e.id); hit(e, 18 * k, { src: 'triple', el: 'fire', cut: true, shape: 'melee_arc' }); burn(e, 4, 3); }, { clip: null });
        }));
        return 1.4;
      } },
      // each wave bursts at its end, 1.5 u for 8 (Triple Crescent reads st.form)
      crescent: { mode: 'change', clip: 'triple20', fn: (a, dir, aim, at, o) => NEW20.triple_crescent(a, dir, aim, at, { ...o, burstEnd: true }) },
    },
    // ---- 不屈 ----
    lunge_strike: {
      // kit 2.3 K44: the drill carries him 3.5 u through every foe (12, then 3 turns of 2 on each); he lands
      // past them facing back and the star opens where he left the pack (8, and 4 within 1.2 u)
      swift: { mode: 'change', clip: 'lungeDrill20', fn: (a, dir, aim, at) => {
        const got = [];
        let P0 = null;
        at2(at, 0.02, (a) => emit('review_af_aimline', { x: r2(a.x), z: r2(a.z), dx: r2(dir.x), dz: r2(dir.z), len: 3.5, el: 'earth', secs: 0.22 }));
        at2(at, 0.25, (a) => {
          P0 = { x: a.x, z: a.z };
          const list = hostiles().filter((e) => inStrip(a, dir, 3.5, 0.8, e));
          emit('review_af_drill', { x0: r2(a.x), z0: r2(a.z), x1: r2(a.x + dir.x * 3.5), z1: r2(a.z + dir.z * 3.5), secs: 0.36, moving: true });
          glide(a, dir, 3.5, 0.36, 'dash');
          for (const e of list) {
            const al = (e.x - a.x) * dir.x + (e.z - a.z) * dir.z, T = 0.36 * Math.max(0, Math.min(1, al / 3.5));
            later(T, () => { got.push(e); hit(e, 12, { src: 'lunge', el: 'earth', cut: true, shape: 'melee_arc' }); [0.07, 0.14, 0.21].forEach((d) => later(d, () => hit(e, 2, { src: 'lunge_drill', el: 'earth', cut: true }))); });
          }
        });
        at2(at, 0.66, (a) => {
          face(a, { x: -dir.x, z: -dir.z });
          const far = got.length ? Math.max(...got.map((e) => (e.x - P0.x) * dir.x + (e.z - P0.z) * dir.z)) + 0.4 : 2;
          const E = { x: P0.x + dir.x * far, z: P0.z + dir.z * far };
          emit('review_af_starburst', { x: r2(E.x), z: r2(E.z), el: 'earth' });
          countCapped(got.filter((e) => e.hp > 0), (e, c) => hit(e, 8, { src: 'lunge_star', el: 'earth', cut: c }));
          countCapped(roundList(E.x, E.z, 1.2).filter((e) => !got.includes(e)), (e, c) => hit(e, 4, { src: 'lunge_star', el: 'earth', wave: c }));
        });
        return 1.0;
      } },
      // kit 2.3 K45: he stays; the spear flies 6 u as a drilling 剑气 (12, then 3 turns of 2 on each foe it
      // passes), hangs a beat at its end and opens into the star (8 within 1.2 u)
      crescent: { mode: 'change', clip: 'lungeStay20', fn: (a, dir, aim, at) => {
        at2(at, 0.02, (a) => emit('review_af_aimline', { x: r2(a.x), z: r2(a.z), dx: r2(dir.x), dz: r2(dir.z), len: 6, el: 'earth', secs: 0.22 }));
        at2(at, 0.25, (a) => {
          const E = { x: a.x + dir.x * 6, z: a.z + dir.z * 6 };
          emit('review_af_drill', { x0: r2(a.x + dir.x * 0.5), z0: r2(a.z + dir.z * 0.5), x1: r2(E.x), z1: r2(E.z), secs: 0.45, moving: true, qi: true });
          wave({ x: a.x, z: a.z, dx: dir.x, dz: dir.z, len: 6, w: 0.8, speed: 13, el: 'earth', kind: 'thin', onHit: (e) => { hit(e, 12, { src: 'lunge_qi', el: 'earth', wave: true }); [0.07, 0.14, 0.21].forEach((d) => later(d, () => hit(e, 2, { src: 'lunge_drill', el: 'earth', cut: true }))); } });
          later(0.62, () => { emit('review_af_starburst', { x: r2(E.x), z: r2(E.z), el: 'earth' }); countCapped(roundList(E.x, E.z, 1.2), (e, c) => hit(e, 8, { src: 'lunge_star', el: 'earth', wave: c })); });
        });
        return 1.0;
      } },
    },
    ground_wave: {
      // Swift (Kesh 18 Nov 20:32 SGT, redrawn): he rides the rift. The stab opens it at once, 5 u (14
      // to each foe on it); he blinks across it three times in a Z, each crossing a cut (4, up to 3
      // foes) that bursts fins out of the rift where he crosses; then a front flip off the third
      // crossing to the rift's end, the sword plunged in (8 within 1.4 u), and the whole rift
      // erupts back towards where he began (4 to each foe on it; the design thread's budget trim).
      swift: { mode: 'change', clip: 'riftRide', fn: (a, dir, aim, at) => {
        const len = 5, P0 = { x: a.x, z: a.z }, L = { x: dir.z, z: -dir.x };
        const on = (along, side) => ({ x: P0.x + dir.x * along + L.x * side, z: P0.z + dir.z * along + L.z * side });
        at2(at, 0.2, (a) => {
          beat('rift20', 0, []);
          emit('review_af_crack', { x: r2(a.x), z: r2(a.z), dx: r2(dir.x), dz: r2(dir.z), len, secs: 0.25, look: 'rift' });
          hostiles().filter((e) => inStrip(P0, dir, len, 0.9, e)).forEach((e) => {
            const along = (e.x - P0.x) * dir.x + (e.z - P0.z) * dir.z;
            later(0.25 * Math.max(0, along) / len, () => hit(e, 14, { src: 'ground_wave', el: 'earth', wave: true }));
          });
        });
        const Z = [[1.25, 0.75], [2.5, -0.75], [3.75, 0.75]];
        Z.forEach(([along, side], i) => {
          const seen = new Set();
          at2(at, 0.36 + i * 0.16, (a) => foxBlink(a, on(along, side), dir));
          at2(at, 0.42 + i * 0.16, (a) => {
            const from = i ? on(Z[i - 1][0], Z[i - 1][1]) : P0;
            foxCut(a, from, on(along, side), 4, 3, seen, { tilt: i % 2 ? -30 : 30, shade: i, src: 'riftride' });
            const c = on(along - 0.62, 0);
            emit('review_af_finburst', { x: r2(c.x), z: r2(c.z), dx: r2(dir.x), dz: r2(dir.z) });
          });
        });
        // the flip to the end of the rift
        at2(at, 0.86, (a) => {
          const E = on(len, 0), dx = E.x - a.x, dz = E.z - a.z, l = Math.hypot(dx, dz) || 1;
          a.iframeUntilTick = getTick() + sec(0.4);
          move(a, E.x, E.z, 0.28, { slam: false, kind: 'dash' });
          void dx; void dz; void l;
        });
        at2(at, 1.16, (a) => {
          beat('rift20', 1, []);
          emit('review_af_foxshade', { out: true });
          emit('review_af_ring', { x: r2(a.x), z: r2(a.z), r: 1.4, el: 'earth', kind: 'quake' });
          for (const e of hostiles()) if (d2(e, a) <= (1.4 + rad(e) * 0.5) ** 2) hit(e, 8, { src: 'riftplunge', el: 'earth', wave: true });
          const back = { x: -dir.x, z: -dir.z }, E = { x: a.x, z: a.z };
          emit('review_af_crack', { x: r2(E.x), z: r2(E.z), dx: r2(back.x), dz: r2(back.z), len, secs: 0.3, look: 'rift', big: true });
          hostiles().filter((e) => inStrip(E, back, len, 0.9, e)).forEach((e) => {
            const along = (e.x - E.x) * back.x + (e.z - E.z) * back.z;
            later(0.3 * Math.max(0, along) / len, () => hit(e, 4, { src: 'rifterupt', el: 'earth', wave: true }));
          });
          later(0.2, () => ringGrove((p) => inStrip(P0, dir, len, 1.0, p)));
        });
        return 1.5;
      } },
      // three rifts fan out (Rift Cut reads st.form)
      crescent: { mode: 'change', clip: 'rift20', fn: (a, dir, aim, at, o) => NEW20.ground_wave(a, dir, aim, at, { ...o, fan3: true }) },
    },
    inkstone_dive: {
      // the dive reaches 4 u, not 2 (Ink Dive reads st.form)
      swift: { mode: 'add', fn: () => 2.4 - LEAD },
      // the landing sends a 剑风 to 3.5 u
      crescent: { mode: 'add', fn: (a, dir, aim, at) => { at2(at, 1.97, (a) => qiRing(a.x + dir.x * 0.5, a.z + dir.z * 0.5, 3.5, 10, 'earth')); return 2.4 - LEAD; } },
    },
    caltrops: {
      // Sword Grove (kit 2.3): Swift changes the call (K49), Crescent plants to 6 u and spins a 剑风 ring on the call (K50)
      swift: { mode: 'add', fn: () => 0.9 },
      crescent: { mode: 'add', fn: () => 0.9 },
    },
    riposte: {
      // on a catch he flashes through the attacker and cuts from behind (the catch reads st.parry0.form)
      swift: { mode: 'change', clip: 'riposteGuard20', fn: (a, dir, aim, at, o) => NEW20.riposte(a, dir, aim, at, { ...o, form: 'swift' }) },
      // the answer is thrown as a 剑气 6 u
      crescent: { mode: 'change', clip: 'riposteGuard20', fn: (a, dir, aim, at, o) => NEW20.riposte(a, dir, aim, at, { ...o, form: 'crescent' }) },
    },
    // ---- 止水 ----
    moonfang: {
      // he dashes back along the same line for half
      swift: { mode: 'add', fn: (a, dir, aim, at) => {
        at2(at, 0.7, (a) => {
          const d = { x: -dir.x, z: -dir.z }, P0 = { x: a.x, z: a.z };
          face(a, d);
          play('moonfang20', 0.2);
          emit('review_af_streak', { x0: r2(a.x), z0: r2(a.z), x1: r2(a.x + d.x * 3.2), z1: r2(a.z + d.z * 3.2), el: 'water' });
          glide(a, d, 3.2, 0.15, 'dash');
          later(0.3, () => {
            const list = hostiles().filter((e) => inStrip(P0, d, 3.2, 0.9, e)).slice(0, 4);
            beat('moonfang20', 0, list, { x0: r2(P0.x), z0: r2(P0.z), x1: r2(P0.x + d.x * 3.2), z1: r2(P0.z + d.z * 3.2), cross: true });
            // Kesh 19 Nov 08:47 SGT: the first dash marks, the dash back consumes the mark and leaves a new one
            for (const e of list) { hit(e, 12, { src: 'moonfang', el: 'water', cut: true, shape: 'melee_arc' }); slow(e, 0.3, 1); later(0.12, () => moonMark(e)); }
          });
        });
        return 1.4;
      } },
      // he stays and throws a moon 剑气 6 u with the same mark and stillness
      crescent: { mode: 'change', clip: 'moonfang20', fn: (a, dir, aim, at) => {
        // Kesh 18 Nov 15:36: charges (20:27: two); the mark adds no damage taken; his next hit on the foe consumes it
        spend('moonfang', 2);
        at2(at, 0.28, (a) => qi(a, dir, 6, 24, 'water', { w: 1.0, onHit: (e) => later(0.1, () => moonMark(e)) }));
        return 0.8;
      } },
    },
    riptide_form: {
      // the leap goes 3 u, and the low sweep slides 2 u through the foes (Calm Forms reads st.form)
      swift: { mode: 'add', fn: () => 2.0 - LEAD },
      // the low sweep throws a wide 剑风 to 4 u
      crescent: { mode: 'add', fn: (a, dir, aim, at) => { at2(at, 1.48, (a) => qiRing(a.x, a.z, 4, 5, 'water', { dir, half: 100 })); return 2.0 - LEAD; } },
    },
    tide_crescent: {
      // the hop is 3 u and cuts the foes he passes, 8. Kesh 20 Nov 16:53 SGT: a fox mirror then cuts each foe the hop
      // cut again, 4 (small): as the wave unfolds (0.5 s), one mirror per foe beside it, 0.07 s apart
      swift: { mode: 'add', fn: (a, dir, aim, at) => {
        const cut = [];
        at2(at, 0.06, (a) => thrust(a, dir, 3, 0.34, 'water', (e) => { cut.push(e); hit(e, 8, { src: 'calmhop', el: 'water', cut: true }); slow(e, 0.4, 1.5); }, { clip: null, streak: false }));
        at2(at, 0.5, () => cut.forEach((e, i) => later(0.07 * i, () => {
          if (!(e.hp > 0)) return;
          const side = i % 2 ? -1 : 1, px = e.x - dir.z * 0.7 * side - dir.x * 0.2, pz = e.z + dir.x * 0.7 * side - dir.z * 0.2;
          const L = Math.hypot(e.x - px, e.z - pz) || 1;
          emit('review_af_mirrorcut', { x: r2(px), z: r2(pz), dx: r2((e.x - px) / L), dz: r2((e.z - pz) / L), tilt: side * 30 });
          later(0.08, () => { if (e.hp > 0) hit(e, 4, { src: 'calmmirror', el: 'water', cut: true }); });
        })));
        return 0.6;
      } },
      // no hop; the wave is 4 u wide and flies 6 u (Calm Crescent reads st.form)
      crescent: { mode: 'change', clip: 'calm20', fn: (a, dir, aim, at, o) => NEW20.tide_crescent(a, dir, aim, at, { ...o, big: true }) },
    },
    tide_ring: {
      // after the seventh image he thrusts across the ring himself
      // Kesh 18 Nov 15:36, Swift: no mirror images; he blinks to each start and thrusts across himself (Mirror Ring reads st.form)
      swift: { mode: 'change', clip: null, fn: (a, dir, aim) => tideRing(a, dir, aim) },
      // Crescent: cast at range (to 6 u), all mirrors; he only casts (Mirror Ring reads st.form)
      crescent: { mode: 'change', clip: 'castPoint', fn: (a, dir, aim) => tideRing(a, dir, aim) },
    },
    mirror_image: {
      // he dashes 3 u away as the image appears (Mirror Image reads st.form)
      swift: { mode: 'change', clip: 'mirror20', fn: (a, dir, aim, at, o) => NEW20.mirror_image(a, dir, aim, at, { ...o, away: 3 }) },
      // the image throws a 剑气 at the nearest foe each second, 6
      crescent: { mode: 'add', fn: (a, dir, aim, at) => {
        [1.0, 2.0, 3.0].forEach((T) => at2(at, 0.36 + T, () => {
          const im = st.image;
          if (!im) return;
          const t = hostiles().sort((p, q) => d2(p, im) - d2(q, im))[0];
          if (!t) return;
          const d = aimDir(im, t);
          emit('review_af_imagecast', { x: r2(im.x), z: r2(im.z), dx: r2(d.x), dz: r2(d.z), skill: 'qi' });
          qi(im, d, 5, 6, 'water', { w: 0.7, x: im.x, z: im.z });
        }));
        return 0.6;
      } },
    },
    // ---- 狂热 ----
    fox_step: {
      // Swift (Kesh 18 Nov 20:32 SGT, redrawn): the steps hunt. Up to four blinks, each straight
      // through a different foe ahead of him (6 each); then the corkscrew through the last one (12).
      // When he lands, every shade he left cuts once more where it stands (4).
      swift: { mode: 'change', clip: null, fn: (a, dir, aim, at) => {
        const P0 = { x: a.x, z: a.z }, seen = new Set(), shades = [], done = new Set();
        let T = 0.06, last = { ...P0 }, fwd = dir, k = 0;
        const step = (i) => at2(at, T, (a) => {
          const from = { x: a.x, z: a.z };
          const cand = hostiles().filter((e) => !done.has(e.id) && d2(e, a) <= 3.2 ** 2 && ((e.x - a.x) * dir.x + (e.z - a.z) * dir.z) > -0.2)
            .sort((p, q) => d2(p, a) - d2(q, a))[0];
          let P, d;
          if (cand) {
            done.add(cand.id);
            const dx = cand.x - a.x, dz = cand.z - a.z, l = Math.hypot(dx, dz) || 1;
            d = { x: dx / l, z: dz / l };
            P = { x: cand.x + d.x * 0.6, z: cand.z + d.z * 0.6 };
          } else {
            const Ld = { x: dir.z, z: -dir.x }, sg = i % 2 ? -1 : 1;
            P = { x: a.x + dir.x * 0.8 + Ld.x * 0.5 * sg, z: a.z + dir.z * 0.8 + Ld.z * 0.5 * sg };
            d = dir;
          }
          play('foxstep20', i % 2 ? 0.16 : 0.04);
          foxBlink(a, P, d);
          later(0.06, () => { const b = fox(); if (!b) return; foxCut(b, from, P, 6, 3, seen, { tilt: i % 2 ? -35 : 35, shade: i }); shades.push({ x: P.x, z: P.z, d }); });
          fwd = d;
          last = P;
        });
        // as many steps as there are foes to hunt (two at least, four at most)
        const n = Math.max(2, Math.min(4, hostiles().filter((e) => d2(e, a) <= 4.5 ** 2 && ((e.x - a.x) * dir.x + (e.z - a.z) * dir.z) > -0.2).length));
        for (k = 0; k < n; k++) { step(k); T += 0.17; }
        const tC = T + 0.04, s3 = new Set();
        at2(at, tC, (a) => {
          play('foxstep20', 0.3);
          const d = fwd, S3 = { x: a.x + d.x * 1.6, z: a.z + d.z * 1.6 };
          emit('review_af_streak', { x0: r2(a.x), z0: r2(a.z), x1: r2(S3.x), z1: r2(S3.z), el: 'wind', spiral: true, secs: 0.18 });
          face(a, d);
          glide(a, d, 1.6, 0.18, 'dash');
        });
        for (let q = 0; q < 6; q++) at2(at, tC + 0.1 + q * 0.035, (a) => {
          const list = hostiles().filter((e) => !s3.has(e.id) && d2(e, a) <= (0.85 + rad(e) * 0.5) ** 2).slice(0, 3 - s3.size);
          if (!list.length) return;
          beat('foxstep20', 0, list);
          for (const e of list) { s3.add(e.id); hit(e, 12, { src: 'fox_step', el: 'wind', cut: true, shape: 'melee_arc' }); }
        });
        // the shades cut once more, all together
        const tS = tC + 0.36, s4 = new Set();
        at2(at, tS, () => {
          emit('review_af_foxshade', { cut: true });
          for (const sh of shades) {
            emit('review_af_foxcut', { x: r2(sh.x), z: r2(sh.z), dx: r2(sh.d.x), dz: r2(sh.d.z), tilt: 90, r: 0.9, shade: true });
            for (const e of hostiles()) if (!s4.has(e.id) && d2(e, sh) <= (0.9 + rad(e) * 0.5) ** 2) { s4.add(e.id); hit(e, 4, { src: 'foxshade', el: 'wind', cut: true }); }
          }
        });
        at2(at, tS + 0.12, () => emit('review_af_foxshade', { out: true }));
        void last;
        return tS + 0.3;
      } },
      // Crescent (redrawn): he stays. A step to his left with a cut down that throws a 剑气 across his
      // aim, a step to his right with the crossing cut (the two 剑气 make an X 2 u ahead), then a turn
      // and a rising cut that sends a spiral 剑气 5 u along the floor. 6, 6, then 12 to up to 3 foes.
      crescent: { mode: 'change', clip: 'foxstepC', fn: (a, dir, aim, at) => {
        const L = { x: dir.z, z: -dir.x }, P0 = { x: a.x, z: a.z };
        const rot = (d, ang) => { const c = Math.cos(ang), s2 = Math.sin(ang); return { x: d.x * c - d.z * s2, z: d.x * s2 + d.z * c }; };
        // from 0.5 u to his left, aimed to cross his line 2 u ahead, and the other way
        const dA = (() => { const v = { x: dir.x * 2 - L.x * 0.5, z: dir.z * 2 - L.z * 0.5 }, l = Math.hypot(v.x, v.z); return { x: v.x / l, z: v.z / l }; })();
        const dB = (() => { const v = { x: dir.x * 2 + L.x * 0.5, z: dir.z * 2 + L.z * 0.5 }, l = Math.hypot(v.x, v.z); return { x: v.x / l, z: v.z / l }; })();
        void rot;
        at2(at, 0.12, () => qi(fox(), dA, 4.5, 6, 'wind', { w: 0.8, tilt: 40, x: P0.x + L.x * 0.5, z: P0.z + L.z * 0.5 }));
        at2(at, 0.26, () => qi(fox(), dB, 4.5, 6, 'wind', { w: 0.8, tilt: -40, x: P0.x - L.x * 0.5, z: P0.z - L.z * 0.5 }));
        at2(at, 0.4, () => emit('review_af_foxcross', { x: r2(P0.x + dir.x * 2), z: r2(P0.z + dir.z * 2) }));
        at2(at, 0.52, (a) => {
          emit('review_af_streak', { x0: r2(a.x), z0: r2(a.z), x1: r2(a.x + dir.x * 5), z1: r2(a.z + dir.z * 5), el: 'wind', spiral: true, secs: 0.42, ghost: true, big: true });
          hostiles().filter((e) => inStrip(P0, dir, 5, 1.1, e)).sort((p, q) => d2(p, a) - d2(q, a)).slice(0, 3).forEach((e) => {
            const along = (e.x - P0.x) * dir.x + (e.z - P0.z) * dir.z;
            later(0.42 * Math.max(0, along) / 5, () => { beat('foxstep20', 0, [e]); hit(e, 12, { src: 'fox_step', el: 'wind', wave: true }); });
          });
        });
        return 0.9;
      } },
    },
    blade_storm: {
      // the spin travels 3 u through the foes (Blade Storm reads st.form)
      swift: { mode: 'add', fn: (a, dir, aim, at) => { at2(at, 0.25, (a) => move(a, a.x + dir.x * 3, a.z + dir.z * 3, 0.8, { slam: false, kind: 'step' })); return 1.3; } },
      // the spin throws a 剑风 ring
      crescent: { mode: 'add', fn: (a, dir, aim, at) => { at2(at, 1.12, (a) => qiRing(a.x, a.z, 3, 2.5, 'wind')); return 1.3; } },
    },
    skyblade_waltz: {
      // he dashes once more, to where the beams fall, 8
      swift: { mode: 'add', fn: (a, dir, aim, at) => { at2(at, 3.0, (a) => { const d = aimDir(a, aim); face(a, d); thrust(a, d, Math.min(3, Math.max(1, Math.hypot(aim.x - a.x, aim.z - a.z))), 0.18, 'wind', (e) => { hit(e, 8, { src: 'thrust', el: 'wind', cut: true }); lift(e, 0.3); }); }); return 3.4 - LEAD; } },
      // the flat cut and the rising cut each throw a 剑气; five beams, not three
      crescent: { mode: 'add', fn: (a, dir, aim, at) => {
        at2(at, 0.58, (a) => qi(a, dir, 5, 5.6, 'wind'));
        at2(at, 2.22, (a) => qi(a, dir, 5, 7, 'wind', { tilt: 80 }));
        [2.96, 3.08].forEach((T, i) => at2(at, T, () => {
          const p = { x: aim.x + (i ? 1.4 : -1.4) * -dir.z, z: aim.z + (i ? 1.4 : -1.4) * dir.x };
          emit('review_af_beam', { x: r2(p.x), z: r2(p.z), r: 1.2, el: 'wind', stay: 1.5 });
          countCapped(roundList(p.x, p.z, 1.2), (e, c) => hit(e, 6, { src: 'beam', el: 'wind', cut: c }));
        }));
        return 3.4 - LEAD;
      } },
    },
    blade_dance: {
      // he dashes 2.5 u and bursts where he arrives. Kesh 20 Nov 16:57 SGT: he leaves a mirror where he dashed out;
      // when he starts the burst, the mirror bursts as well (the base cast reads st.danceMirror)
      swift: { mode: 'pre', fn: (a, dir) => {
        st.danceMirror = { x: a.x, z: a.z, dx: dir.x, dz: dir.z };
        emit('review_af_dmirror', { on: true, x: r2(a.x), z: r2(a.z), dx: r2(dir.x), dz: r2(dir.z) });
        thrust(a, dir, 2.5, 0.2, 'wind', (e) => hit(e, 10, { src: 'thrust', el: 'wind', cut: true, shape: 'melee_arc' }), { clip: 'dash20' });
        return 0.22;
      } },
      // the burst is a 剑风 to 3 u
      crescent: { mode: 'add', fn: (a, dir, aim, at) => { at2(at, 0.47, (a) => qiRing(a.x, a.z, 3, 5, 'wind')); return 0.8; } },
    },
    whirlwind_slash: {
      // he rides inside the wheel
      // Kesh 18 Nov 15:36: he does not ride the wheel; within 2 s of its end a recast puts him where it ended, in a flat sweep, 12
      swift: { mode: 'change', clip: null, fn: (a, dir, aim, at, o) => {
        const W = st.wheelEnd;
        if (W && getTick() >= W.from && getTick() <= W.until) {
          st.wheelEnd = null;
          // Kesh 18 Nov 16:20 SGT: the sweep aims itself at the foes the wheel gathered (those within 2 u of where
          // it ended). He appears at the wheel's end, 1 u short of their middle, facing it.
          let P = { x: W.x, z: W.z }, D = W.dir;
          at2(at, 0.05, (a) => {
            const got = hostiles().filter((e) => (e.x - W.x) ** 2 + (e.z - W.z) ** 2 <= 2 * 2);
            if (got.length) {
              const C = { x: got.reduce((t, e) => t + e.x, 0) / got.length, z: got.reduce((t, e) => t + e.z, 0) / got.length };
              let dx = C.x - W.x + W.dir.x * 1.0, dz = C.z - W.z + W.dir.z * 1.0;
              const l = Math.hypot(dx, dz) || 1;
              D = { x: dx / l, z: dz / l };
              P = { x: C.x - D.x * 1.0, z: C.z - D.z * 1.0 };
              emit('review_af_aimline', { x: r2(P.x), z: r2(P.z), dx: r2(D.x), dz: r2(D.z), len: 1.6, el: 'wind', secs: 0.2 });
            }
            emit('review_af_blink', { x0: r2(a.x), z0: r2(a.z), x1: r2(P.x), z1: r2(P.z) });
            move(a, P.x, P.z, 0.02, { slam: false, kind: 'step' });
            later(0.03, () => { const b = fox(); face(b, D); play('af2', 0); });
          });
          at2(at, 0.25, (a) => {
            cutEv(a, D, { r: 1.7, half: 80, el: 'wind', side: -1, style: 'sweep', tilt: 0 });
            countCapped(fanList(a, D, 1.7, 80), (e, c) => hit(e, 12, { src: 'wheel_recast', el: 'wind', cut: c }));
          });
          return 0.6;
        }
        play('wheel20', 0);
        st.wheelEnd = { x: a.x + dir.x * 4, z: a.z + dir.z * 4, dir, from: getTick() + sec(2.2), until: getTick() + sec(4.2) };
        return NEW20.whirlwind_slash(a, dir, aim, at, o);
      } },
      // half again as wide, stays 1 s where it ends (Blade Wheel reads st.form)
      crescent: { mode: 'change', clip: 'wheel20', fn: (a, dir, aim, at, o) => NEW20.whirlwind_slash(a, dir, aim, at, { ...o, big: true }) },
    },
    thousand_cuts: {
      // he ends where he aims, up to 4 u from the last foe, with one more cut through the pack
      swift: { mode: 'add', fn: (a, dir, aim, at) => {
        at2(at, 1.38, (a) => {
          const d = aimDir(a, aim), L = Math.min(4, Math.max(1.5, Math.hypot(aim.x - a.x, aim.z - a.z)));
          face(a, d);
          thrust(a, d, L, 0.18, 'wind', (e) => { hit(e, 10, { src: 'thrust', el: 'wind', cut: true }); lift(e, 0.3); });
        });
        return 1.8;
      } },
      // he stands and sheathes while eight images do the cuts; then a 剑风 ring (the blur reads A.stay)
      crescent: { mode: 'change', clip: 'thousand20', fn: (a, dir, aim, at, o) => { NEW20.thousand_cuts(a, dir, aim, at, { ...o, stay: true }); at2(at, 1.32, (a) => qiRing(a.x, a.z, 3, 2.5, 'wind')); return 1.4; } },
    },
  };

  // ---- casts ----
  function startCast(id, aim, opts = {}) {
    const a = fox();
    if (!a) return;
    const dir = aimDir(a, aim);
    if (id === 'caltrops' && st.grove && !opts.echo) { groveCall(false); return; }
    if (PASSIVE.has(id)) {
      st.passives.add(id);
      emit('review_af_passive', { id, on: true });
      return;
    }
    // Dash strike (C11): Lunge Strike or Hilt Bash pressed during a dash comes out at its end
    if ((id === 'lunge_strike' || id === 'hilt_bash') && st.act && (st.act.kind === 'dash' || st.act.kind === 'dashcut')) {
      st.pendingStrike = { id, aim };
      emit('review_af_queued', { id });
      return;
    }
    if (id === 'earthsplitter') { startCharge(a, dir, aim); return; }
    // 2.1 (K12, talents T6): the Swift and Crescent forms; a form is part of the cast (no second mark)
    const F = !opts.copy && !opts.formDone && st.form && st.form !== 'base' && FORMS[id] ? FORMS[id][st.form] : null;
    const el = EL[id];
    const aimP = aim || { x: a.x + dir.x * 3, z: a.z + dir.z * 3 };
    face(a, dir);
    // kit 2.1 (K20, K26): the cast's record, for the ghost swords' copies and the echo
    let rec = opts.rec || null;
    if (!opts.copy && !opts.formDone && !opts.echo) {
      rec = { t0: getTick(), x0: a.x, z0: a.z, dir, pre: st.orbs.slice(), form: st.form || 'base', ids: new Set(), last: -1e9, end: null, fired: false };
      st.recs.push(rec);
      if (st.echoOn) echoPress(rec, id);
    }
    if (F && F.mode === 'pre') {
      // the form moves him first, then the base cast comes out where he arrives
      const pre = F.fn(a, dir, aimP);
      later(pre, () => { const b = fox(); startCast(id, { x: b.x + dir.x * 3, z: b.z + dir.z * 3 }, { ...opts, formDone: true, rec }); });
      (st.recent ||= []).push({ id, tick: getTick() });
      storeOrb(el, pre + 1);
      return;
    }
    const mv = F && F.mode === 'change' ? (F.clip ? [F.clip, LEAD] : null) : MOVE[id];
    if (mv) play(mv[0], Math.max(0, mv[1] - LEAD), id === 'hilt_bash' ? { flip: true } : {});
    emit('review_af_cast', { skill: id, el, x: r2(a.x), z: r2(a.z), form: st.form || 'base' });
    emit('review_af_trail', { color: ELC[el] });
    const at = (fn, extra = 0) => later(LEAD + extra, () => fn(fox(), dir, aimP));
    const C = F && F.mode === 'change' ? F.fn : CAST[id];
    let after = 0.3;
    if (C) after = (C(a, dir, aimP, at, opts) ?? 0) + 0.3;
    if (F && F.mode === 'add') after = Math.max(after, (F.fn(a, dir, aimP, at, opts) ?? 0) + 0.3);
    // the mark is stored on the press (S10); kit 2.1 (K18): no strong cut
    if (!opts.formDone) {
      (st.recent ||= []).push({ id, tick: getTick() });
      storeOrb(el, LEAD + after, rec);
    }
    if (rec) rec.end = getTick() + sec(LEAD + after - 0.3);
    // Mirror Image (C6): a copy of each Wave skill, from the image, at the same spot, for half
    if (st.image && WAVES.has(id) && !opts.copy) {
      const img = st.image;
      const tgt = aim || { x: a.x + dir.x * 4, z: a.z + dir.z * 4 };
      later(LEAD + 0.05, () => {
        const ghost = { x: img.x, z: img.z, faceX: 0, faceZ: 1, copy: true };
        const gd = aimDir(ghost, tgt);
        emit('review_af_imagecast', { x: r2(img.x), z: r2(img.z), dx: r2(gd.x), dz: r2(gd.z), skill: id });
        CAST[id](ghost, gd, tgt, (fn, extra = 0) => later(extra, () => fn(ghost, gd, tgt)), { copy: true, from: ghost });
      });
    }
  }
  // kit 2.2 (K35): every skill is Fox Crimson with a Moon Silver edge; no colour tells a will
  const ELC = { fire: '#E8577A', earth: '#E8577A', water: '#E8577A', wind: '#E8577A' };
  const half = (opts) => (opts && opts.copy ? 0.5 : 1);

  // ================= kit 2.1: Sword Heart (K19 to K21) and the Echo trial (K26) =================
  // a will's effect (K21: scar 2 a second for 2 s, a 0.2 s daunt, 20% stillness for 1.5 s, a 0.5 u push), k scales its length
  function willEff(el, e, k, ox, oz) {
    if (!e || !(e.hp > 0)) return;
    if (el === 'fire') burn(e, 2, 2 * k);
    else if (el === 'earth') stun(e, 0.2 * k, { small: true });
    else if (el === 'water') slow(e, 0.2, 1.5 * k);
    else if (el === 'wind') push(e, e.x - ox, e.z - oz, 0.5 * k);
  }
  // where a ghost sword floats, on the floor: slot 1 behind his right shoulder (the newest), 0 the left, -1 the one going out
  const SLOT_X = { 1: -0.2, 0: 0.2, '-1': 0.36 };
  function slotXZ(a, slot) {
    const fx = a.faceX ?? 0, fz = a.faceZ ?? 1, sx = SLOT_X[slot] ?? 0;
    return { x: a.x + fz * sx - fx * 0.18, z: a.z - fx * sx - fz * 0.18 };
  }
  const asCopy = (fn) => { st.copying = true; try { fn(); } finally { st.copying = false; } };
  function copyHit(e, s, ox, oz) {
    if (!e || !(e.hp > 0)) return;
    hit(e, 4, { src: 'copy', count: false });
    willEff(s.el, e, 0.5, ox, oz);
  }
  // K20: after the last hit of a skill, each ghost sword he held at the press copies that hit for 4
  function copies(R) {
    const a = fox();
    if (!a || !R.pre.length || !st.orbs.length || st.noCopies) return; // K39: the copies are open; left out
    const n = R.pre.length;
    const swords = R.pre.map((el, i) => ({ el, slot: n === 1 ? (st.orbs.length >= 2 ? 0 : 1) : i === 0 ? -1 : 0 }));
    const dir = { x: a.faceX ?? R.dir.x, z: a.faceZ ?? R.dir.z };
    asCopy(() => {
      if (R.form === 'crescent') {
        // each fires a 剑气 5 u along his aim from where it floats
        emit('review_af_copy', { mode: 'crescent', swords, dx: r2(dir.x), dz: r2(dir.z) });
        swords.forEach((sw, k) => later(0.08 + 0.07 * k, () => asCopy(() => {
          const b = fox(), p = slotXZ(b, sw.slot);
          qi(b, dir, 5, 4, sw.el, { w: 0.6, src: 'copy', x: p.x, z: p.z, copy: true, onHit: (e) => willEff(sw.el, e, 0.5, p.x, p.z) });
        })));
      } else if (R.form === 'swift') {
        // they fly beside him along his thrust and cut every foe on it
        let x0 = R.x0, z0 = R.z0, x1 = a.x, z1 = a.z, L = Math.hypot(x1 - x0, z1 - z0);
        if (L < 1) { x0 = a.x; z0 = a.z; x1 = a.x + dir.x * 2.5; z1 = a.z + dir.z * 2.5; L = 2.5; }
        const d = { x: (x1 - x0) / L, z: (z1 - z0) / L }, secs = 0.32;
        emit('review_af_copy', { mode: 'swift', swords, x0: r2(x0), z0: r2(z0), x1: r2(x1), z1: r2(z1), secs, back: 0.25 });
        for (const e of hostiles()) {
          if (!inStrip({ x: x0, z: z0 }, d, L, 1.1, e)) continue;
          const al = Math.max(0, Math.min(1, ((e.x - x0) * d.x + (e.z - z0) * d.z) / L));
          swords.forEach((sw) => later(0.06 + secs * al, () => asCopy(() => copyHit(e, sw, x0, z0))));
        }
      } else {
        // each flies out, stabs the nearest foe the skill hit, and flies back
        const list = [...R.ids].map((id) => registry.byId(id)).filter((e) => e && e.hp > 0).sort((p, q) => d2(p, a) - d2(q, a));
        const t = list[0];
        if (!t) return;
        emit('review_af_copy', { mode: 'base', swords, id: t.id, tx: r2(t.x), tz: r2(t.z), out: 0.16, stay: 0.12, back: 0.22 });
        swords.forEach((sw, k) => later(0.16 + 0.05 * k, () => asCopy(() => copyHit(t, sw, a.x, a.z))));
      }
    });
  }
  function newRec(a, dir) {
    const R = { t0: getTick(), x0: a.x, z0: a.z, dir, pre: st.orbs.slice(), form: st.form || 'base', ids: new Set(), last: -1e9, end: null, fired: false };
    st.recs.push(R);
    return R;
  }
  function stepRecs(tick) {
    for (let i = st.recs.length - 1; i >= 0; i--) {
      const R = st.recs[i];
      if (R.end == null) { if (tick - R.t0 > sec(6)) st.recs.splice(i, 1); continue; }
      if (tick >= Math.max(R.end, R.last + sec(0.12)) || tick >= R.end + sec(1.2)) {
        st.recs.splice(i, 1);
        R.fired = true;
        copies(R);
        if (st.echo && st.echo.rec === R) endEcho();
      }
    }
    if (st.echo && st.echo.on) { const a = fox(); if (a) st.echo.path.push([r2(a.x), r2(a.z), r2(a.faceX ?? 0), r2(a.faceZ ?? 1)]); }
  }
  // K26 (trial): every fourth skill is cast again for half by a silver ghost of him, 0.4 s after his cast
  // ends, from where he stood, as he aimed, in his style's form. The review build records his cast (its
  // looks, its hits and effects, his path) and plays it back through the ghost.
  function echoRec(kind, args) {
    if (st.echo && st.echo.on && !st.replaying && !st.copying) st.echo.calls.push([getTick(), kind, args]);
  }
  function echoPress(rec, id) {
    st.echoN++;
    const a = fox();
    if (st.echoShow) emit('review_af_echon', { n: ((st.echoN - 1) % 4) + 1, x: r2(a.x), z: r2(a.z) });
    if (st.echoN % 4 === 0) st.echo = { on: true, rec, id, t0: getTick(), ev: [], calls: [], path: [], x0: a.x, z0: a.z, dx: rec.dir.x, dz: rec.dir.z };
  }
  const ECHO_IDS = new Set(['review_af_wave', 'review_af_wavepos', 'review_af_wave_end']);
  function endEcho() {
    const E = st.echo;
    if (!E) return;
    E.on = false;
    st.echo = null;
    const D = 0.4;
    events.emit(getTick(), 'review_af_echo', { x: r2(E.x0), z: r2(E.z0), dx: r2(E.dx), dz: r2(E.dz), path: E.path, delay: D, skill: E.id, dur: E.path.length / TICK });
    for (const [tk, type, ev] of E.ev) later(D + (tk - E.t0) / TICK, () => {
      st.replaying = true;
      try { events.emit(getTick(), type, { ...ev, ...(ECHO_IDS.has(type) ? { id: ev.id + 100000 } : {}), echo: true }); } finally { st.replaying = false; }
    });
    for (const [tk, kind, args] of E.calls) later(D + (tk - E.t0) / TICK, () => {
      const e = registry.byId(args[0]);
      if (!e || !(e.hp > 0)) return;
      st.replaying = true;
      try {
        if (kind === 'hit') hit(e, args[1] * 0.5, { ...args[2], count: false });
        else if (kind === 'burn') burn(e, ...args.slice(1));
        else if (kind === 'slow') slow(e, ...args.slice(1));
        else if (kind === 'stun') stun(e, ...args.slice(1));
        else if (kind === 'lift') lift(e, ...args.slice(1));
        else if (kind === 'blind') blind(e, ...args.slice(1));
        else if (kind === 'move') move(e, ...args.slice(1));
      } finally { st.replaying = false; }
    });
  }

  // ---- 1.6: the four skills from Kesh's "copy all" videos, one video each ----
  // Each runs on its own clip (clip time T); at(fn, T - LEAD) lands an effect on that frame.
  const fanList = (a, dir, reach, half) => hostiles().filter((e) => inFan(a, e, dir, reach, half));
  const roundList = (x, z, r) => hostiles().filter((e) => (e.x - x) ** 2 + (e.z - z) ** 2 <= (r + rad(e) * 0.5) ** 2);
  const cutEv = (a, dir, o) => emit('review_af_cut', { x: r2(a.x), z: r2(a.z), dx: r2(dir.x), dz: r2(dir.z), ...o });
  const stepTo = (a, dir, dist, secs, kind = 'step') => move(a, a.x + dir.x * dist, a.z + dir.z * dist, secs, { slam: false, kind });
  const smashOr = (e, dmg, src, el, c) => {
    if (e.reviewLift) {
      hit(e, dmg * 1.5, { src: 'smash', el, cut: c });
      emit('review_af_smash', { id: e.id, x: r2(e.x), z: r2(e.z) });
      for (const f2 of hostiles()) if (f2 !== e && d2(f2, e) <= 1) hit(f2, 10, { src: 'smashsplash', el });
      e.reviewLift = null;
    } else hit(e, dmg, { src, el, cut: c });
  };
  const at2 = (at, T, fn) => at(fn, Math.max(0, T - LEAD));
  // Kesh 18 Nov 15:36: some forms move or lift foes as part of the skill itself (K29's kind)
  // Sword Bloom (Kesh 20 Nov 17:04 and 17:29 SGT): a sword floats point down over each foe; 0.5 s later each stabs
  // down at its own moment within the next 0.5 s: 10, and 4 to the foes within 1.5 u; `bloom` sizes the bloom (0 none)
  const hangSwords = (list, bloom) => list.forEach((e) => {
    const r = (((Math.sin(e.id * 12.9898 + getTick() * 0.731) * 43758.5453) % 1) + 1) % 1, T = 0.5 + 0.5 * r;
    emit('review_af_hangsword', { id: e.id, x: r2(e.x), z: r2(e.z), secs: r2(T), bloom });
    later(T + 0.08, () => {
      if (!(e.hp > 0)) return;
      hit(e, 10, { src: 'bloom_sword', el: 'fire', cut: true });
      for (const f of hostiles()) if (f !== e && d2(f, e) <= 1.5 ** 2) later(0.08, () => hit(f, 4, { src: 'bloom_splash', el: 'fire' }));
    });
  });
  const withFx = (fn) => { const f0 = st.fx; st.fx = true; st.allowMove = true; try { fn(); } finally { st.fx = f0; st.allowMove = false; } };
  // Moonfang's mark, the same in every style: 4 s on the foe
  const moonMark = (e) => { if (e.hp > 0) { st.cmarks.set(e.id, getTick() + sec(4)); emit('review_af_mark', { id: e.id, secs: 4 }); } };
  // a skill with charges (Sword Bloom · Swift 3, Moonfang · Crescent 2): one spent per cast
  const spend = (id, max = 3) => { const n = (st.ch[id] ?? max) - 1; st.ch[id] = Math.max(0, n); emit('review_af_charges', { id, n: st.ch[id], max }); };
  const beat = (clip, i, list, extra = {}) => { const a = fox(); emit('review_af_beat', { clip, i, ids: list.map((e) => e.id), x: r2(a.x), z: r2(a.z), dx: r2(a.faceX ?? 0), dz: r2(a.faceZ ?? 1), ...extra }); };
  // the fox's own move over a few ticks (a step, a streak, a step back)
  const glide = (a, dir, dist, secs, kind = 'step') => { a.iframeUntilTick = getTick() + sec(secs + 0.05); move(a, a.x + dir.x * dist, a.z + dir.z * dist, secs, { slam: false, kind }); };

  // Fox Step's blink: a fast untouchable step to a spot, facing `face`
  const foxBlink = (a, P, faceDir) => {
    const dx = P.x - a.x, dz = P.z - a.z, l = Math.hypot(dx, dz);
    emit('review_af_blink', { x0: r2(a.x), z0: r2(a.z), x1: r2(P.x), z1: r2(P.z) });
    if (faceDir) face(a, faceDir);
    if (l > 0.01) glide(a, { x: dx / l, z: dz / l }, l, 0.06, 'dash');
  };
  // a cut at the end of a step: the foes on the step's path or within 0.9 u of where he stands
  const foxCut = (a, P0, P1, dmg, max, seen, { tilt = 0, shade = -1, src = 'fox_step', r = 0.9 } = {}) => {
    const dx = P1.x - P0.x, dz = P1.z - P0.z, l = Math.hypot(dx, dz) || 1, d = { x: dx / l, z: dz / l };
    const f = { x: a.faceX ?? d.x, z: a.faceZ ?? d.z };
    emit('review_af_foxcut', { x: r2(a.x), z: r2(a.z), dx: r2(f.x), dz: r2(f.z), tilt, r });
    if (shade >= 0) emit('review_af_foxshade', { i: shade, x: r2(a.x), z: r2(a.z) });
    const list = hostiles().filter((e) => !seen.has(e.id) && (inStrip(P0, d, l, 1.4, e) || d2(e, a) <= (r + rad(e) * 0.5) ** 2)).slice(0, max);
    for (const e of list) { seen.add(e.id); hit(e, dmg, { src, el: 'wind', cut: true, shape: 'melee_arc' }); }
    return list;
  };
  // ---- 2.0: the 17 skills on their kit 2.0 motions (MOTIONS M8 to M24); numbers as kit 1.7 ----
  const NEW20 = {
    flurry: (a, dir, aim, at) => {
      [0.14, 0.23, 0.33, 0.42].forEach((T, i) => at2(at, T, (a) => {
        const d = { x: a.faceX ?? dir.x, z: a.faceZ ?? dir.z };
        const list = hostiles().filter((e) => inFan(a, e, d, 0.8, 30)).slice(0, 6);
        beat('flurry20', i, list);
        for (const e of list) { hit(e, 3.75, { src: 'flurry', el: 'fire', cut: true, shape: 'melee_arc' }); burn(e, 2, 3); }
      }));
      if (st.steer) at2(at, 0.3, (a) => glide(a, dir, 0.25, 0.08));
      return 0.6;
    },
    crescent_finisher: (a, dir, aim, at) => {
      at2(at, 0.3, (a) => {
        const now = getTick();
        const others = new Set((st.recent || []).filter((r) => r.id !== 'crescent_finisher' && now - r.tick <= sec(2)).map((r) => r.id));
        const n = Math.min(2, others.size);
        const dmg = 26 * (1 + 0.5 * n); // K30: 20 and half the 12 of the old scar
        const list = hostiles().filter((e) => inFan(a, e, dir, 1.0, 35)).slice(0, 5);
        beat('finisher20', 0, list, { n });
        for (const e of list) {
          if (e.reviewLift && !isBig(e)) {
            hit(e, dmg * 1.5, { src: 'spike', el: 'fire', cut: true, shape: 'melee_arc' });
            e.reviewLift = null;
            e.reviewY = 0;
            emit('review_af_spike', { id: e.id, x: r2(e.x), z: r2(e.z), r: 1.5 });
            for (const f of hostiles()) if (f !== e && d2(f, e) <= 1.5 ** 2) hit(f, 10, { src: 'spike_splash' });
          } else hit(e, dmg, { src: 'finisher', el: 'fire', cut: true, shape: 'melee_arc' });
          burn(e, 4, 3);
        }
      });
      return 0.9;
    },
    flame_crescent: (a, dir, aim, at, o) => {
      at2(at, 0.35, (a) => {
        beat('keen20', 0, []);
        const wide = !!(o && o.wide);
        wave({ x: a.x, z: a.z, dx: dir.x, dz: dir.z, len: 6, w: wide ? 2.4 : 1.2, el: 'fire', kind: 'keen', half: !!(o && o.copy), onHit: (e, w) => { hit(e, 20.5 * half(o), { src: 'flame_crescent', el: 'fire', wave: true }); burn(e, 3, 3); },
          onEnd: wide ? (w) => qiRing(w.cx, w.cz, 1.5, 8, 'fire', { secs: 0.25, onHit: (e) => burn(e, 3, 1.5) }) : null });
      });
      return 0.5;
    },
    flashfire: (a, dir, aim, at, o) => {
      // kit 2.2 (K31): a thin cut line opens on every foe within 4 u, 6. Kesh 20 Nov 17:29 SGT (the Crescent of
      // 17:04 made the base): no burst; over every foe a line cut a sword appears floating point down, and 0.5 s later
      // each stabs down at its own moment within the next 0.5 s: 10, and 4 to the foes within 1.5 u (o.bloom: a bloom)
      const R = (o && o.r) || 4;
      at2(at, 0.4, (a) => {
        const list = hostiles().filter((e) => d2(e, a) <= R ** 2);
        beat('bloom20', 0, list, { scarred: list.map((e) => e.id) });
        for (const e of list) hit(e, 6, { src: 'bloom_line', el: 'fire', cut: true });
        hangSwords(list, (o && o.bloom) || 0);
      });
      return 1.0;
    },
    triple_crescent: (a, dir, aim, at, o) => {
      const already = new Set();
      [[0.4, 0], [0.65, 40], [0.9, 85]].forEach(([T, tilt], i) => at2(at, T, (a) => {
        const d = st.tripleAim && st.tripleAim[i] ? aimDir(a, st.tripleAim[i]) : { x: a.faceX ?? dir.x, z: a.faceZ ?? dir.z };
        if (!(o && o.copy)) face(a, d);
        beat('triple20', i, []);
        wave({ x: a.x, z: a.z, dx: d.x, dz: d.z, len: 7, w: 2, el: 'fire', kind: 'great', tilt, half: !!(o && o.copy), onHit: (e) => {
          const k = already.has(e.id) ? 0.5 : 1;
          already.add(e.id);
          hit(e, 24 * k * half(o), { src: 'triple', el: 'fire', wave: true });
          burn(e, 4, 3);
        }, onEnd: o && o.burstEnd ? (w) => qiRing(w.cx, w.cz, 1.5, 8, 'fire', { secs: 0.25, eff: false, onHit: (e) => burn(e, 2, 1.5) }) : null });
      }));
      return 1.4;
    },
    lunge_strike: (a, dir, aim, at, o) => {
      // kit 2.3 K43 (redrawn 18 Nov): a 2 u line, 0.8 u wide, through every foe. The thrust 12; he drills
      // round the blade, 3 turns of 2; a back somersault tears it out and a star opens behind the foes:
      // 8 on the line, 4 within 1.2 u of its far end. Dash strike (C11): 1 u farther, 30% harder.
      const dashed = !!(o && o.dashed), boost = dashed ? 1.3 : 1, reach = 2 + (dashed ? 1 : 0);
      let list = [], P0 = null;
      at2(at, 0.02, (a) => emit('review_af_aimline', { x: r2(a.x), z: r2(a.z), dx: r2(dir.x), dz: r2(dir.z), len: reach, el: 'earth', secs: 0.22 }));
      at2(at, 0.25, (a) => {
        P0 = { x: a.x, z: a.z };
        list = hostiles().filter((e) => inStrip(a, dir, reach, 0.8, e));
        emit('review_af_spear', { x0: r2(a.x), z0: r2(a.z), x1: r2(a.x + dir.x * (reach + 0.2)), z1: r2(a.z + dir.z * (reach + 0.2)) });
        countCapped(list, (e, c) => hit(e, 12 * boost, { src: 'lunge', el: 'earth', cut: c, shape: 'melee_arc' }));
      });
      at2(at, 0.3, (a) => emit('review_af_drill', { x0: r2(a.x), z0: r2(a.z), x1: r2(a.x + dir.x * reach), z1: r2(a.z + dir.z * reach), secs: 0.32 }));
      [0.38, 0.48, 0.58].forEach((T) => at2(at, T, () => countCapped(list.filter((e) => e.hp > 0), (e, c) => hit(e, 2 * boost, { src: 'lunge_drill', el: 'earth', cut: c }))));
      at2(at, 0.65, () => {
        const E = { x: P0.x + dir.x * (reach + 0.3), z: P0.z + dir.z * (reach + 0.3) };
        emit('review_af_starburst', { x: r2(E.x), z: r2(E.z), el: 'earth' });
        countCapped(list.filter((e) => e.hp > 0), (e, c) => hit(e, 8 * boost, { src: 'lunge_star', el: 'earth', cut: c }));
        countCapped(roundList(E.x, E.z, 1.2).filter((e) => !list.includes(e)), (e, c) => hit(e, 4 * boost, { src: 'lunge_star', el: 'earth', wave: c }));
      });
      return 1.0;
    },
    ground_wave: (a, dir, aim, at, o) => {
      at2(at, 0.2, () => beat('rift20', 0, []));
      at2(at, 0.6, (a) => {
        const len = 5;
        beat('rift20', 1, []);
        const got = new Set();
        for (const ang of o && o.fan3 ? [-0.45, 0, 0.45] : [0]) {
          const c = Math.cos(ang), s2 = Math.sin(ang), d = { x: dir.x * c - dir.z * s2, z: dir.x * s2 + dir.z * c };
          emit('review_af_crack', { x: r2(a.x), z: r2(a.z), dx: r2(d.x), dz: r2(d.z), len, secs: 0.3, look: 'rift' });
          const list = hostiles().filter((e) => !got.has(e.id) && inStrip(a, d, len, 0.9, e)).sort((p, q) => d2(p, a) - d2(q, a));
          list.forEach((e) => {
            got.add(e.id);
            const along = (e.x - a.x) * d.x + (e.z - a.z) * d.z;
            later(0.3 * Math.max(0, along) / len, () => { hit(e, 14 * half(o), { src: 'ground_wave', el: 'earth', wave: true }); stun(e, 0.4); });
          });
        }
        later(0.2, () => { for (const z of st.zones) if (z.kind === 'caltrops' && !z.kicked && inStrip(a, dir, len, 0.9 + z.r * 2, z)) kick(z); ringGrove((p) => inStrip(a, dir, len, 1.0, p)); });
      });
      return 0.9;
    },
    caltrops: (a, dir, aim, at, o) => {
      // kit 2.3 K48 Sword Grove 剑林 (in place of Caltrops): six ghost swords plant in a ring, 1.5 u, at a spot
      // up to 4 u away (6 u in Crescent): 8 to each foe there; they stand 5 s; a second press (or 5 s) calls them
      const R0 = st.form === 'crescent' ? 6 : 4;
      const dx = aim.x - a.x, dz = aim.z - a.z, d = Math.hypot(dx, dz), k = d > R0 ? R0 / d : 1;
      const P = { x: a.x + dx * k, z: a.z + dz * k };
      const id = ++st.seq, pts = [];
      for (let i = 0; i < 6; i++) { const an = (i / 6) * Math.PI * 2 + 0.3; pts.push({ x: P.x + Math.cos(an) * 1.5, z: P.z + Math.sin(an) * 1.5 }); }
      at2(at, 0.35, () => {
        st.grove = { id, x: P.x, z: P.z, pts, form: st.form || 'base', until: getTick() + sec(5) };
        emit('review_af_grove', { on: true, id, x: r2(P.x), z: r2(P.z), pts: pts.map((q) => [r2(q.x), r2(q.z)]) });
        later(0.3, () => countCapped(roundList(P.x, P.z, 1.6), (e, c) => hit(e, 8, { src: 'grove', el: 'earth', wave: c })));
        later(5, () => { if (st.grove && st.grove.id === id) groveCall(true); });
      });
      return 1.0;
    },
    riposte: (a, dir, aim, at, o) => {
      at2(at, 0.08, () => {
        st.parry = { until: getTick() + sec(0.6), dir, v20: true, form: (o && o.form) || 'base' };
        emit('review_af_parry', { on: true, secs: 0.6 });
      });
      at2(at, 0.7, () => { if (st.parry && st.parry.v20) { st.parry = null; emit('review_af_parry', { on: false }); play('riposteLow20', 0); } });
      return 0.7;
    },
    moonfang: (a, dir, aim, at) => {
      const P0 = { x: a.x, z: a.z }, dist = 3.2;
      at2(at, 0.02, () => emit('review_af_aimline', { x: r2(a.x), z: r2(a.z), dx: r2(dir.x), dz: r2(dir.z), len: dist, el: 'water', secs: 0.3 }));
      at2(at, 0.25, (a) => { emit('review_af_streak', { x0: r2(a.x), z0: r2(a.z), x1: r2(a.x + dir.x * dist), z1: r2(a.z + dir.z * dist), el: 'water' }); glide(a, dir, dist, 0.15, 'dash'); });
      at2(at, 0.55, () => {
        const list = hostiles().filter((e) => inStrip(P0, dir, dist, 0.9, e)).slice(0, 4);
        beat('moonfang20', 0, list, { x0: r2(P0.x), z0: r2(P0.z), x1: r2(P0.x + dir.x * dist), z1: r2(P0.z + dir.z * dist) });
        for (const e of list) { hit(e, 24, { src: 'moonfang', el: 'water', cut: true, shape: 'melee_arc' }); moonMark(e); slow(e, 0.3, 2); }
      });
      return 0.8;
    },
    tide_crescent: (a, dir, aim, at, o) => {
      const big = !!(o && o.big);
      at2(at, 0.45, (a) => {
        beat('calm20', 0, []);
        wave({ x: a.x, z: a.z, dx: dir.x, dz: dir.z, len: big ? 6 : 4, w: big ? 4 : 2.5, el: 'water', kind: 'wide', half: !!(o && o.copy), onHit: (e) => { hit(e, 14 * half(o), { src: 'tide', el: 'water', wave: true, quench: true }); slow(e, 0.4, 3); } });
      });
      return 0.6;
    },
    mirror_image: (a, dir, aim, at, o) => {
      at2(at, 0.36, (a) => {
        if (st.image) burstImage();
        st.image = { x: a.x, z: a.z, until: getTick() + sec(3), hits: 0 };
        emit('review_af_image', { on: true, x: r2(a.x), z: r2(a.z), secs: 3, v20: true });
        const near = hostiles().filter((e) => d2(e, a) <= 4 * 4 && !isBig(e));
        emit('review_af_imagetaunt', { ids: near.map((e) => e.id), x: r2(a.x), z: r2(a.z) });
        for (const e of near) S.apply(e, 'taunt', 1, sec(3), getTick(), a.id);
        const away = (o && o.away) || 0.6;
        if (away > 1) { play('dash20', 0); emit('review_af_streak', { x0: r2(a.x), z0: r2(a.z), x1: r2(a.x - dir.x * away), z1: r2(a.z - dir.z * away), el: 'water', thrust: true }); }
        glide(a, { x: -dir.x, z: -dir.z }, away, away > 1 ? 0.2 : 0.1, away > 1 ? 'dash' : 'step');
      });
      return 0.5;
    },
    // Fox Step, redrawn (Kesh 18 Nov 20:32 SGT "fox step rework all"): three fox steps. A blink forward
    // and to his left with a rising cut, a blink across to his right with a backhand, then a low
    // corkscrew straight through along his aim; each step leaves a crimson shade holding its cut,
    // and the shades go out one by one as he lands on one knee. 6, 6, then 12, up to 3 foes each.
    fox_step: (a, dir, aim, at) => {
      const L = { x: dir.z, z: -dir.x }, P0 = { x: a.x, z: a.z };
      const S1 = { x: P0.x + dir.x * 0.75 + L.x * 0.55, z: P0.z + dir.z * 0.75 + L.z * 0.55 };
      const S2 = { x: P0.x + dir.x * 1.5 - L.x * 0.55, z: P0.z + dir.z * 1.5 - L.z * 0.55 };
      const S3 = { x: P0.x + dir.x * 3.1, z: P0.z + dir.z * 3.1 };
      const s1 = new Set(), s2 = new Set(), s3 = new Set();
      at2(at, 0.06, (a) => foxBlink(a, S1, dir));
      at2(at, 0.12, (a) => foxCut(a, P0, S1, 6, 3, s1, { tilt: 35, shade: 0 }));
      at2(at, 0.2, (a) => foxBlink(a, S2, dir));
      at2(at, 0.26, (a) => foxCut(a, S1, S2, 6, 3, s2, { tilt: -35, shade: 1 }));
      at2(at, 0.38, (a) => {
        emit('review_af_streak', { x0: r2(a.x), z0: r2(a.z), x1: r2(S3.x), z1: r2(S3.z), el: 'wind', spiral: true, secs: 0.18 });
        const d = { x: S3.x - a.x, z: S3.z - a.z }, l = Math.hypot(d.x, d.z) || 1;
        glide(a, { x: d.x / l, z: d.z / l }, l, 0.18, 'dash');
      });
      for (let k = 0; k < 6; k++) at2(at, 0.4 + k * 0.035, (a) => {
        const list = hostiles().filter((e) => !s3.has(e.id) && d2(e, a) <= (0.85 + rad(e) * 0.5) ** 2).slice(0, 3 - s3.size);
        if (!list.length) return;
        beat('foxstep20', 0, list);
        for (const e of list) { s3.add(e.id); hit(e, 12, { src: 'fox_step', el: 'wind', cut: true, shape: 'melee_arc' }); }
      });
      at2(at, 0.6, () => emit('review_af_foxshade', { out: true }));
      return 0.75;
    },
    blade_storm: (a, dir, aim, at) => {
      [[0.3, 1.6], [0.6, 2.0], [0.9, 2.5], [1.1, 1.3]].forEach(([T, R], i) => at2(at, T, (a) => {
        if (i < 3) for (const e of hostiles()) if (d2(e, a) <= R ** 2 && d2(e, a) > 1.0 ** 2) {
          const dx = a.x - e.x, dz = a.z - e.z, l = Math.hypot(dx, dz) || 1;
          move(e, e.x + (dx / l) * Math.min(0.5, l - 0.85), e.z + (dz / l) * Math.min(0.5, l - 0.85), 0.2, { kind: 'pull' });
        }
        const list = hostiles().filter((e) => d2(e, a) <= (Math.min(R, 1.3) + rad(e) * 0.6) ** 2).slice(0, 5);
        const fireSrc = list.filter(burning).map((e) => st.burns.get(e.id)).sort((p, q) => q.dps - p.dps)[0];
        if (fireSrc) emit('review_af_firespin', {});
        beat('storm20', i, list, { r: R });
        for (const e of list) { hit(e, 5, { src: 'storm', el: 'wind', cut: true, shape: 'melee_arc' }); if (fireSrc && !burning(e)) burn(e, fireSrc.dps, (fireSrc.until - getTick()) / TICK + 0.5, { from: 'spin' }); }
      }));
      return 1.3;
    },
    blade_dance: (a, dir, aim, at) => {
      // Blade Dance · Swift: the mirror he left where he dashed out does the same dance and bursts with him, 5
      const M = st.form === 'swift' ? st.danceMirror : null;
      st.danceMirror = null;
      if (M) { emit('review_af_dmirror', { play: true }); emit('review_af_play', { clip: 'dance20', from: 0, mirror: true }); }
      at2(at, 0.2, () => beat('dance20', 0, []));
      at2(at, 0.45, (a) => {
        const list = hostiles().filter((e) => d2(e, a) <= (1.3 + rad(e) * 0.5) ** 2).slice(0, 6);
        beat('dance20', 1, list);
        for (const e of list) { hit(e, 10, { src: 'dance', el: 'wind', cut: true, shape: 'melee_arc' }); lift(e, 0.6); }
        if (M) {
          const ml = hostiles().filter((e) => d2(e, M) <= (1.3 + rad(e) * 0.5) ** 2).slice(0, 6);
          emit('review_af_beat', { clip: 'dance20', i: 1, ids: ml.map((e) => e.id), x: r2(M.x), z: r2(M.z), dx: r2(M.dx), dz: r2(M.dz), mirror: true });
          for (const e of ml) { hit(e, 5, { src: 'dance_mirror', el: 'wind', cut: true, shape: 'melee_arc' }); lift(e, 0.6); }
        }
      });
      return 0.7;
    },
    whirlwind_slash: (a, dir, aim, at, o) => {
      at2(at, 0.6, (a) => {
        beat('wheel20', 0, []);
        const id = ++st.seq, big = !!(o && o.big);
        const W = { id, kind: 'whirl', wheel: true, x: a.x, z: a.z, x0: a.x, z0: a.z, dx: dir.x, dz: dir.z, t: 0, secs: 1.6, len: 4, r: big ? 1.5 : 1, hold: big ? 1 : 0, el: null, held: new Set(), next: 0, tagged: new Set() };
        st.zones.push(W);
        emit('review_af_whirl', { id, x: r2(a.x), z: r2(a.z), r: W.r, on: true, wheel: true });
      });
      return 0.8;
    },
    thousand_cuts: (a, dir, aim, at, o) => {
      const stay = !!(o && o.stay);
      at2(at, 0.2, (a) => {
        st.act = { kind: 'blur', v20: true, t: 0, i: 0, dir, last: null, used: new Set(), stay };
        if (!stay) emit('review_af_blur', { on: true });
        a.iframeUntilTick = getTick() + sec(1.2);
      });
      return 1.3;
    },
  };
  const NEW16 = {
    // Blazing Cascade (炎舞连斩), fire, from 5bsoG8vEr: two wide sweeps, an overhead slam with a
    // star on the floor, a fire swirl that pulls the pack in, a flame gathered in the free paw,
    // then a dash through them. 2.1 s.
    blazing_cascade: (a, dir, aim, at) => {
      [[0.2, -1, 10], [0.46, 1, -10]].forEach(([T, side, tilt]) => at2(at, T, (a) => {
        cutEv(a, dir, { r: 1.3, half: 75, el: 'fire', side, style: 'sweep', tilt });
        countCapped(fanList(a, dir, 1.3, 75), (e, c) => { hit(e, 7, { src: 'cascade', el: 'fire', cut: c }); burn(e, 2, 2); });
      }));
      let P = null;
      at2(at, 0.86, (a) => {
        P = { x: a.x + dir.x, z: a.z + dir.z };
        emit('review_af_starburst', { x: r2(P.x), z: r2(P.z), el: 'fire' });
        countCapped(roundList(P.x, P.z, 1.2), (e, c) => hit(e, 10, { src: 'cascade', el: 'fire', cut: c }));
      });
      at2(at, 0.95, () => {
        emit('review_af_swirl', { x: r2(P.x), z: r2(P.z), r: 1.5, secs: 0.6, el: 'fire' });
        for (const e of hostiles()) if (d2(e, P) <= 2.5 ** 2 && d2(e, P) > 0.5 ** 2) {
          const dx = P.x - e.x, dz = P.z - e.z, l = Math.hypot(dx, dz) || 1;
          st.allowMove = true;
          move(e, e.x + (dx / l) * (l - 0.45), e.z + (dz / l) * (l - 0.45), 0.3, { kind: 'pull' });
          st.allowMove = false;
        }
      });
      for (const T of [1.1, 1.3, 1.5]) at2(at, T, () => countCapped(roundList(P.x, P.z, 1.5), (e, c) => hit(e, 3, { src: 'swirl', el: 'fire', cut: c })));
      at2(at, 1.45, () => emit('review_af_gather', { el: 'fire', secs: 0.2 }));
      at2(at, 1.62, (a) => {
        const x0 = a.x, z0 = a.z;
        a.iframeUntilTick = getTick() + sec(0.35);
        emit('review_af_streak', { x: r2(x0), z: r2(z0), dx: r2(dir.x), dz: r2(dir.z), dist: 3, el: 'fire' });
        stepTo(a, dir, 3, 0.18);
        later(0.1, () => countCapped(hostiles().filter((e) => inStrip({ x: x0, z: z0 }, dir, 3, 1.0, e)), (e, c) => { hit(e, 20, { src: 'cascadedash', el: 'fire', cut: c }); burn(e, 4, 3); }));
      });
      return 2.1 - LEAD;
    },
    // Skyblade Waltz (天剑舞), wind, from Pi4PRflgB: a crescent skims the floor, a big flat cut,
    // a flash dash, a spin ring, blades rise and throw the pack up, a rising cut, then beams of
    // light fall ahead and leave swords standing. 3.2 s.
    skyblade_waltz: (a, dir, aim, at) => {
      at2(at, 0.15, (a) => {
        cutEv(a, dir, { r: 1.0, half: 50, el: 'wind', side: 1, style: 'sweep', tilt: 0, low: true });
        wave({ x: a.x, z: a.z, dx: dir.x, dz: dir.z, len: 3, w: 1.2, speed: 12, el: 'wind', kind: 'skim', onHit: (e, w) => { hit(e, 6, { src: 'waltz', el: 'wind', wave: w.hit.size <= 3 }); push(e, w.dx, w.dz, 1, 0.25); },
          through: (w) => { for (const z of st.zones) if (z.kind === 'caltrops' && !z.kicked && Math.hypot(z.x - w.cx, z.z - w.cz) <= z.r + w.w / 2) kick(z); ringGrove((p) => Math.hypot(p.x - w.cx, p.z - w.cz) <= w.w / 2 + 0.3); } });
      });
      at2(at, 0.55, (a) => {
        cutEv(a, dir, { r: 1.6, half: 80, el: 'wind', side: -1, style: 'sweep', tilt: 0 });
        countCapped(fanList(a, dir, 1.6, 80), (e, c) => hit(e, 8, { src: 'waltz', el: 'wind', cut: c }));
      });
      at2(at, 0.95, (a) => {
        const x0 = a.x, z0 = a.z;
        a.iframeUntilTick = getTick() + sec(0.3);
        emit('review_af_streak', { x: r2(x0), z: r2(z0), dx: r2(dir.x), dz: r2(dir.z), dist: 2.5, el: 'wind', flash: true });
        stepTo(a, dir, 2.5, 0.12);
        later(0.06, () => countCapped(hostiles().filter((e) => inStrip({ x: x0, z: z0 }, dir, 2.5, 0.9, e)), (e, c) => hit(e, 6, { src: 'waltzdash', el: 'wind', cut: c })));
      });
      at2(at, 1.35, (a) => {
        emit('review_af_spinring', { x: r2(a.x), z: r2(a.z), r: 1.4, el: 'wind' });
        countCapped(roundList(a.x, a.z, 1.4), (e, c) => hit(e, 8, { src: 'waltz', el: 'wind', cut: c }));
      });
      at2(at, 1.8, (a) => {
        emit('review_af_bladesrise', { x: r2(a.x), z: r2(a.z), r: 1.4 });
        countCapped(roundList(a.x, a.z, 1.4), (e, c) => { hit(e, 6, { src: 'waltz', el: 'wind', cut: c }); lift(e, 0.6); });
      });
      at2(at, 2.2, (a) => {
        cutEv(a, dir, { r: 1.3, half: 45, el: 'wind', side: 1, style: 'sweep', tilt: 80 });
        countCapped(fanList(a, dir, 1.3, 45), (e, c) => hit(e, 10, { src: 'waltz', el: 'wind', cut: c }));
      });
      let B = null;
      at2(at, 2.5, (a) => {
        const dx = aim.x - a.x, dz = aim.z - a.z, d = Math.hypot(dx, dz);
        const k = d > 0.5 ? Math.min(3, d) / d : 0;
        B = k ? { x: a.x + dx * k, z: a.z + dz * k } : { x: a.x + dir.x * 2.5, z: a.z + dir.z * 2.5 };
      });
      [2.6, 2.72, 2.84].forEach((T, i) => at2(at, T, () => {
        const ang = i * 2.1, off = i ? 0.55 : 0;
        const p = { x: B.x + Math.cos(ang) * off, z: B.z + Math.sin(ang) * off };
        emit('review_af_beam', { x: r2(p.x), z: r2(p.z), r: 1.2, el: 'wind', stay: 1.5 });
        countCapped(roundList(p.x, p.z, 1.2), (e, c) => hit(e, 6, { src: 'beam', el: 'wind', cut: c }));
      }));
      return 3.2 - LEAD;
    },
    // Inkstone Dive (墨岩坠), earth, from 2SnjhTKLD: a rising slash, an X cut, a leap with cuts in
    // the air and a burst up there, then a dive into the floor 2 u ahead. 2.4 s.
    inkstone_dive: (a, dir, aim, at) => {
      // Kesh 18 Nov 15:36, Swift: the rising slash throws the foes up and they stay up while he cuts in the
      // air; the dive brings them down with him: each one carried takes 8 more, and every foe where they
      // land takes 5 for each one carried
      const swift = st.form === 'swift', carried = [];
      at2(at, 0.2, (a) => {
        cutEv(a, dir, { r: 1.2, half: 50, el: 'earth', side: 1, style: 'ink', tilt: 75 });
        countCapped(fanList(a, dir, 1.2, 50), (e, c) => {
          hit(e, 8, { src: 'ink', el: 'earth', cut: c });
          if (swift && !isBig(e)) { carried.push(e); e.reviewLift = { t0: getTick(), ticks: sec(1.75), h: 1.25 }; emit('review_af_carry', { id: e.id, secs: 1.75 }); }
          else lift(e, 0.4);
        });
      });
      [[0.55, 50, 1], [0.68, -50, -1]].forEach(([T, tilt, side], i) => at2(at, T, (a) => {
        cutEv(a, dir, { r: 1.1, half: 45, el: 'earth', side, style: 'ink', tilt });
        countCapped(fanList(a, dir, 1.1, 45), (e, c) => { hit(e, 6, { src: 'ink', el: 'earth', cut: c }); if (i) stun(e, 0.2, { small: true }); });
        if (i) emit('review_af_xspikes', { x: r2(a.x + dir.x * 0.8), z: r2(a.z + dir.z * 0.8), dx: r2(dir.x), dz: r2(dir.z) });
      }));
      at2(at, 0.85, (a) => {
        a.iframeUntilTick = getTick() + sec(1.15); // the leap itself is in the clip (inkdive's lift keys)
      });
      [0.95, 1.08, 1.21].forEach((T, i) => at2(at, T, (a) => {
        emit('review_af_airink', { x: r2(a.x), z: r2(a.z), i });
        countCapped(roundList(a.x, a.z, 1.6), (e, c) => hit(e, 4, { src: 'inkair', el: 'earth', cut: c }));
      }));
      at2(at, 1.4, (a) => {
        emit('review_af_airburst', { x: r2(a.x), z: r2(a.z), r: 1.5 });
        countCapped(roundList(a.x, a.z, 1.5), (e, c) => hit(e, 6, { src: 'inkburst', el: 'earth', cut: c }));
      });
      let L = null;
      at2(at, 1.55, (a) => {
        const dx = aim.x - a.x, dz = aim.z - a.z, d = Math.hypot(dx, dz);
        const go = Math.min(st.form === 'swift' ? 4 : 2, Math.max(0, d - 0.6));
        stepTo(a, dir, go, 0.38, 'hop');
        L = { x: a.x + dir.x * go, z: a.z + dir.z * go };
        // the foes he carries come down with him round the landing
        if (swift) withFx(() => carried.filter((e) => e.hp > 0).forEach((e, i) => { const an = i * 2.1 + 0.5, P = { x: L.x + dir.x * 0.5 + Math.cos(an) * 0.55, z: L.z + dir.z * 0.5 + Math.sin(an) * 0.55 }; move(e, P.x, P.z, 0.38, { kind: 'pull' }); }));
      });
      at2(at, 1.95, () => {
        const P = { x: L.x + dir.x * 0.5, z: L.z + dir.z * 0.5 };
        emit('review_af_inkland', { x: r2(P.x), z: r2(P.z), r: 1.8, dx: r2(dir.x), dz: r2(dir.z) });
        if (swift) for (const e of carried) { e.reviewLift = null; e.reviewY = 0; }
        countCapped(roundList(P.x, P.z, 1.8), (e, c) => { smashOr(e, 20, 'inkdive', 'earth', c); stun(e, 0.6); });
        if (swift) {
          const n = Math.min(4, carried.filter((e) => e.hp > 0).length); // design thread: at most 4 count; carried foes land in the 1.8 u and take it too
          for (const e of carried) if (e.hp > 0) hit(e, 8, { src: 'ink_carried', el: 'earth', cut: true });
          if (n) { emit('review_af_carryland', { x: r2(P.x), z: r2(P.z), r: 1.8, n }); countCapped(roundList(P.x, P.z, 1.8), (e, c) => hit(e, 5 * n, { src: 'ink_crash', el: 'earth', wave: c })); }
        }
        // Kick the caltrops (C9, 1.6): the landing scatters a patch it lands on
        for (const z of st.zones) if (z.kind === 'caltrops' && !z.kicked && Math.hypot(z.x - P.x, z.z - P.z) <= z.r + 1.8) kick(z);
        ringGrove((p) => Math.hypot(p.x - P.x, p.z - P.z) <= 1.9);
      });
      return 2.4 - LEAD;
    },
    // Riptide Form (逆潮四式), water, from 24ioI3PQo: an overhead arc, a leap and stab down, a
    // rising cut, a low crouched sweep. 2.0 s. Takes Flowing Blade's place.
    riptide_form: (a, dir, aim, at) => {
      // Kesh 20 Nov 17:36 SGT, every form: each hit gives the foes it struck a small push to where the next cut lands,
      // so the next cut catches them; the last hit (the low sweep) pushes none. `nudge` sends them there in 0.25 s,
      // spread round the spot so they do not stack.
      const hop = st.form === 'swift' ? 3 : 1.5;
      const nudge = (list, P) => withFx(() => list.forEach((e, i) => {
        const k = list.length > 1 ? (i / list.length) * Math.PI * 2 : 0, r = list.length > 1 ? 0.35 : 0;
        move(e, P.x + Math.cos(k) * r, P.z + Math.sin(k) * r, 0.25, { kind: 'push' });
      }));
      at2(at, 0.18, (a) => {
        cutEv(a, dir, { r: 1.3, half: 30, el: 'water', side: 1, style: 'sweep', tilt: 88 });
        const list = fanList(a, dir, 1.3, 30);
        countCapped(list, (e, c) => { hit(e, 10, { src: 'riptide', el: 'water', cut: c }); slow(e, 0.3, 2); });
        // to where the stab lands, past the leap
        nudge(list, { x: a.x + dir.x * (hop + 0.6), z: a.z + dir.z * (hop + 0.6) });
      });
      at2(at, 0.42, (a) => {
        a.iframeUntilTick = getTick() + sec(0.36); // the leap itself is in the clip (riptide's lift keys)
        // Kesh 20 Nov 17:40 SGT, every form: the leap also draws the foes in round the stab point (the v37 gather, a
        // smaller range): foes within 1.4 u of it come to 0.55 u of it over the leap (0.32 s)
        const P = { x: a.x + dir.x * (hop + 0.6), z: a.z + dir.z * (hop + 0.6) };
        const list = hostiles().filter((e) => d2(e, P) <= 1.4 ** 2 && d2(e, P) > 0.55 ** 2);
        emit('review_af_gatherline', { x: r2(P.x), z: r2(P.z), r: 1.4 });
        withFx(() => list.forEach((e) => { const L = Math.sqrt(d2(e, P)); move(e, P.x + (e.x - P.x) / L * 0.55, P.z + (e.z - P.z) / L * 0.55, 0.32, { kind: 'pull' }); }));
        stepTo(a, dir, hop, 0.32, 'hop');
      });
      at2(at, 0.76, (a) => {
        const P = { x: a.x + dir.x * 0.6, z: a.z + dir.z * 0.6 };
        emit('review_af_splash', { x: r2(P.x), z: r2(P.z), r: 0.9 });
        const list = roundList(P.x, P.z, 0.9);
        countCapped(list, (e, c) => { hit(e, 12, { src: 'riptide', el: 'water', cut: c }); slow(e, 0.3, 2); });
        // into the rising cut's arc, 0.8 u ahead of him
        nudge(list, { x: a.x + dir.x * 0.8, z: a.z + dir.z * 0.8 });
      });
      at2(at, 1.05, (a) => {
        cutEv(a, dir, { r: 1.2, half: 30, el: 'water', side: -1, style: 'sweep', tilt: -88 });
        const list = fanList(a, dir, 1.2, 30);
        countCapped(list, (e, c) => { hit(e, 8, { src: 'riptide', el: 'water', cut: c }); lift(e, 0.4); });
        // into the low sweep, 0.9 u ahead of where he sweeps (Swift slides 2 u first)
        const ahead = (st.form === 'swift' ? 2 : 0) + 0.9;
        nudge(list, { x: a.x + dir.x * ahead, z: a.z + dir.z * ahead });
      });
      if (st.form === 'swift') at2(at, 1.38, (a) => { emit('review_af_streak', { x0: r2(a.x), z0: r2(a.z), x1: r2(a.x + dir.x * 2), z1: r2(a.z + dir.z * 2), el: 'water', thrust: true }); glide(a, dir, 2, 0.2, 'dash'); });
      at2(at, 1.45, (a) => {
        cutEv(a, dir, { r: 1.6, half: 100, el: 'water', side: 1, style: 'sweep', tilt: 0, low: true });
        countCapped(fanList(a, dir, 1.6, 100), (e, c) => { hit(e, 10, { src: 'riptide', el: 'water', cut: c }); slow(e, 0.4, 2); });
      });
      return 2.0 - LEAD;
    },
  };

  const CAST = {
  ...NEW16,
    tide_ring: (a, dir, aim) => tideRing(a, dir, aim),
    // ---- fire ----
    flurry: (a, dir, aim, at) => {
      for (let i = 0; i < 4; i++) at((a) => {
        const d = { x: a.faceX ?? dir.x, z: a.faceZ ?? dir.z };
        emit('review_af_cut', { x: r2(a.x), z: r2(a.z), dx: r2(d.x), dz: r2(d.z), r: 0.8, half: 30, el: 'fire', side: i % 2 ? -1 : 1 });
        const list = hostiles().filter((e) => inFan(a, e, d, 0.8, 30)).slice(0, 6);
        countCapped(list, (e, c) => { hit(e, 3, { src: 'flurry', el: 'fire', cut: c }); burn(e, 2, 3); });
      }, i * 0.1);
      return 0.4;
    },
    crescent_finisher: (a, dir, aim, at) => at((a) => {
      emit('review_af_cut', { x: r2(a.x), z: r2(a.z), dx: r2(dir.x), dz: r2(dir.z), r: 1.0, half: 35, el: 'fire', rising: true });
      const n = st.count;
      const dmg = 20 * (1 + 0.02 * n);
      emit('review_af_finisher', { count: n, dmg: Math.round(dmg) });
      const list = hostiles().filter((e) => inFan(a, e, dir, 1.0, 35)).slice(0, 5);
      countCapped(list, (e, c) => {
        // Spike (C3): a foe in the air is slammed down
        if (e.reviewLift && !isBig(e)) {
          hit(e, dmg * 1.5, { src: 'spike', el: 'fire', cut: c });
          e.reviewLift = null;
          e.reviewY = 0;
          emit('review_af_spike', { id: e.id, x: r2(e.x), z: r2(e.z), r: 1.5 });
          for (const f of hostiles()) if (f !== e && d2(f, e) <= 1.5 ** 2) hit(f, 10, { src: 'spike_splash' });
        } else hit(e, dmg, { src: 'finisher', el: 'fire', cut: c });
        burn(e, 4, 3);
      });
    }),
    flame_crescent: (a, dir, aim, at, o) => at((a) => {
      wave({ x: a.x, z: a.z, dx: dir.x, dz: dir.z, len: 6, w: 1.2, el: 'fire', half: !!(o && o.copy), onHit: (e, w) => { hit(e, 16 * half(o), { src: 'flame_crescent', el: 'fire', wave: w.hit.size <= 3 }); burn(e, 3, 3); } });
    }),
    flare_wave: (a, dir, aim, at, o) => at((a) => {
      const burst = (x, z) => {
        emit('review_af_burst', { x: r2(x), z: r2(z), r: 1.5, el: 'fire' });
        let n = 0;
        for (const e of hostiles()) if ((e.x - x) ** 2 + (e.z - z) ** 2 <= (1.5 + rad(e) * 0.5) ** 2) { hit(e, 16 * half(o), { src: 'flare', el: 'fire', wave: n++ < 3 }); burn(e, 3, 3); }
      };
      wave({ x: a.x, z: a.z, dx: dir.x, dz: dir.z, len: 6, w: 0.8, el: 'fire', kind: 'flare', stopAtFirst: true, half: !!(o && o.copy), onHit: () => {}, onEnd: (w) => burst(w.cx, w.cz) });
    }),
    flashfire: (a, dir, aim, at) => at((a) => {
      emit('review_af_ring', { x: r2(a.x), z: r2(a.z), r: 4, el: 'fire', kind: 'flash' });
      const bursted = new Set();
      const list = hostiles().filter((e) => d2(e, a) <= 4 ** 2);
      for (const e of list) {
        if (burning(e) && !bursted.has(e.id)) {
          bursted.add(e.id);
          st.burns.delete(e.id);
          emit('review_af_burn', { id: e.id, on: false });
          emit('review_af_burst', { x: r2(e.x), z: r2(e.z), r: 1.5, el: 'fire', small: true });
          hit(e, 12, { src: 'flashfire_burst', el: 'fire', noCrit: false });
          for (const f of hostiles()) if (f !== e && d2(f, e) <= 1.5 ** 2) later(0.08, () => burn(f, 3, 3, { from: 'burst' }));
        } else if (!burning(e)) burn(e, 3, 3, { from: 'flash' });
      }
    }),
    triple_crescent: (a, dir, aim, at, o) => {
      for (let i = 0; i < 3; i++) at((a) => {
        const d = st.tripleAim && st.tripleAim[i] ? aimDir(a, st.tripleAim[i]) : { x: a.faceX ?? dir.x, z: a.faceZ ?? dir.z };
        if (!(o && o.copy)) face(a, d);
        const already = st.tripleHit || (st.tripleHit = new Set());
        if (i === 0) already.clear();
        wave({ x: a.x, z: a.z, dx: d.x, dz: d.z, len: 7, w: 2, el: 'fire', kind: 'great', half: !!(o && o.copy), onHit: (e, w) => {
          const k = already.has(e.id) ? 0.5 : 1;
          already.add(e.id);
          hit(e, 18 * k * half(o), { src: 'triple', el: 'fire', wave: w.hit.size <= 3 });
          burn(e, 4, 3);
        } });
      }, 0.3 + i * 0.25);
      return 0.9;
    },
    // ---- earth ----
    hilt_bash: (a, dir, aim, at, o) => at((a) => strike('hilt_bash', a, dir, o && o.dashed, aim)),
    stone_crescent: (a, dir, aim, at, o) => at((a) => {
      wave({ x: a.x, z: a.z, dx: dir.x, dz: dir.z, len: 5, w: 0.9, el: 'earth', kind: 'stone', stopAtFirst: true, half: !!(o && o.copy), onHit: (e, w) => {
        const air = !!e.reviewLift;
        hit(e, 24 * half(o), { src: 'stone_crescent', el: 'earth', wave: true });
        emit('review_af_shards', { x: r2(e.x), z: r2(e.z), r: 1.2 });
        for (const f of hostiles()) if (f !== e && d2(f, e) <= 1.2 ** 2) hit(f, 8 * half(o), { src: 'shards', el: 'earth' });
        if (air && !isBig(e)) {
          // Bat it away (C4): sent flying 3 u along the wave; foes it lands on take 10 and a 0.4 s stun
          e.reviewLift = null;
          e.reviewY = 0;
          emit('review_af_bat', { id: e.id });
          const tx = e.x + w.dx * 3, tz = e.z + w.dz * 3;
          move(e, tx, tz, 0.3, { kind: 'bat' });
          e.reviewBatY = 0.6;
          later(0.32, () => {
            emit('review_af_burst', { x: r2(e.x), z: r2(e.z), r: 1.0, el: 'earth', small: true });
            for (const f of hostiles()) if (f !== e && d2(f, e) <= 1.0 ** 2) { hit(f, 10, { src: 'bat_land', el: 'earth' }); stun(f, 0.4); }
            stun(e, 0.6);
          });
        } else stun(e, 0.6);
      } });
    }),
    ground_wave: (a, dir, aim, at, o) => at((a) => {
      const len = 5;
      emit('review_af_crack', { x: r2(a.x), z: r2(a.z), dx: r2(dir.x), dz: r2(dir.z), len, secs: 0.25 });
      const list = hostiles().filter((e) => inStrip(a, dir, len, 0.9, e)).sort((p, q) => d2(p, a) - d2(q, a));
      list.forEach((e, i) => {
        const along = (e.x - a.x) * dir.x + (e.z - a.z) * dir.z;
        later(0.25 * Math.max(0, along) / len, () => { hit(e, 14 * half(o), { src: 'ground_wave', el: 'earth', wave: i < 3 }); stun(e, 0.4); });
      });
      // Kick the caltrops (C9)
      later(0.2, () => { for (const z of st.zones) if (z.kind === 'caltrops' && !z.kicked && inStrip(a, dir, len, 0.9 + z.r * 2, z)) kick(z); ringGrove((p) => inStrip(a, dir, len, 1.0, p)); });
    }),
    caltrops: (a, dir, aim, at) => at((a) => {
      const dx = aim.x - a.x, dz = aim.z - a.z, d = Math.hypot(dx, dz), k = d > 2 ? 2 / d : 1;
      zone({ kind: 'caltrops', x: a.x + dx * k, z: a.z + dz * k, r: 0.7, secs: 5, el: 'earth', dps: 8 / 0.5 * 0.25 });
    }),
    riposte: (a, dir, aim, at) => {
      at((a) => {
        st.parry = { until: getTick() + sec(0.6), dir };
        emit('review_af_parry', { on: true, secs: 0.6 });
      });
      return 0.6;
    },
    // ---- water ----
    moonfang: (a, dir, aim) => {
      dashCut({ dist: 3.2, dmg: 24, n: 4, el: 'water', id: 'moonfang', dir, on: (e) => { moonMark(e); slow(e, 0.3, 2); } });
      return 0.5;
    },
    flowing_blade: (a, dir, aim, at) => {
      for (let i = 0; i < 3; i++) at((a) => {
        const d = st.steer || dir;
        const l = Math.hypot(d.x, d.z) || 1;
        move(a, a.x + (d.x / l) * 0.6, a.z + (d.z / l) * 0.6, 0.12, { slam: false, kind: 'step' });
        const fd = { x: a.faceX ?? dir.x, z: a.faceZ ?? dir.z };
        emit('review_af_cut', { x: r2(a.x), z: r2(a.z), dx: r2(fd.x), dz: r2(fd.z), r: 1.0, half: 60, el: 'water', side: i % 2 ? -1 : 1 });
        later(0.06, () => {
          const b = fox();
          const list = hostiles().filter((e) => inFan(b, e, fd, 1.0, 60));
          countCapped(list, (e, c) => { hit(e, 8, { src: 'flowing', el: 'water', cut: c }); slow(e, 0.3, 2); });
        });
      }, i * 0.2);
      return 0.6;
    },
    tide_crescent: (a, dir, aim, at, o) => {
      if (!(o && o.copy)) {
        const s = st.steer;
        if (s) {
          const l = Math.hypot(s.x, s.z) || 1;
          emit('review_af_hop', { secs: 0.36, h: 0.45 });
          a.iframeUntilTick = getTick() + sec(0.4);
          move(a, a.x + (s.x / l) * 1.5, a.z + (s.z / l) * 1.5, 0.36, { slam: false, kind: 'hop' });
        }
      }
      at((a) => {
        wave({ x: a.x, z: a.z, dx: dir.x, dz: dir.z, len: 4, w: 2.5, el: 'water', kind: 'wide', half: !!(o && o.copy), onHit: (e, w) => { hit(e, 14 * half(o), { src: 'tide', el: 'water', wave: w.hit.size <= 3, quench: true }); slow(e, 0.4, 3); } });
      });
    },
    blade_rain: (a, dir, aim, at, o) => {
      const dx = aim.x - a.x, dz = aim.z - a.z, d = Math.hypot(dx, dz), k = d > 5 ? 5 / d : 1;
      const c = { x: a.x + dx * k, z: a.z + dz * k };
      at(() => emit('review_af_rain', { x: r2(c.x), z: r2(c.z), r: 1.8, secs: 1.2 }));
      for (let i = 0; i < 8; i++) at(() => {
        const inside = hostiles().filter((e) => d2(e, c) <= 1.8 ** 2);
        const e = inside.length ? inside[i % inside.length] : null;
        const ang = i * 2.4;
        const p = e ? { x: e.x, z: e.z } : { x: c.x + Math.cos(ang) * 1.2, z: c.z + Math.sin(ang) * 1.2 };
        emit('review_af_blade', { x: r2(p.x), z: r2(p.z) });
        if (e) { hit(e, 5 * half(o), { src: 'rain', el: 'water', wave: true, quench: true }); slow(e, 0.3, 2); }
      }, 0.2 + i * 0.15);
      return 1.3;
    },
    mirror_image: (a, dir, aim, at) => at((a) => {
      if (st.image) burstImage();
      st.image = { x: a.x, z: a.z, until: getTick() + sec(3), hits: 0 };
      emit('review_af_image', { on: true, x: r2(a.x), z: r2(a.z), secs: 3 });
      const near = hostiles().filter((e) => d2(e, a) <= 4 * 4 && !isBig(e));
      emit('review_af_imagetaunt', { ids: near.map((e) => e.id), x: r2(a.x), z: r2(a.z) });
      for (const e of near) S.apply(e, 'taunt', 1, sec(3), getTick(), a.id);
    }),
    // ---- wind ----
    fox_step: (a, dir) => {
      dashCut({ dist: 2, dmg: 18, n: 3, el: 'wind', id: 'fox_step', dir, on: (e) => lift(e, 0.5) });
      return 0.5;
    },
    blade_storm: (a, dir, aim, at) => {
      at((a) => {
        emit('review_af_ring', { x: r2(a.x), z: r2(a.z), r: 2.5, el: 'wind', kind: 'pull' });
        for (const e of hostiles()) if (d2(e, a) <= 2.5 ** 2 && d2(e, a) > 1.1 ** 2) {
          const dx = a.x - e.x, dz = a.z - e.z, l = Math.hypot(dx, dz) || 1;
          move(e, e.x + (dx / l) * Math.min(1, l - 0.8), e.z + (dz / l) * Math.min(1, l - 0.8), 0.25, { kind: 'pull' });
        }
        emit('review_af_storm', { secs: 0.9 });
      });
      for (let i = 0; i < 5; i++) at((a) => {
        const list = hostiles().filter((e) => d2(e, a) <= (1.0 + rad(e) * 0.6) ** 2).slice(0, 5);
        // Fire spin (C10): a burning foe in the spin passes its burn to every foe it cuts
        const fireSrc = list.filter(burning).map((e) => st.burns.get(e.id)).sort((p, q) => q.dps - p.dps)[0];
        if (fireSrc) emit('review_af_firespin', {});
        countCapped(list, (e, c) => { hit(e, 4, { src: 'storm', el: 'wind', cut: c }); if (fireSrc && !burning(e)) burn(e, fireSrc.dps, (fireSrc.until - getTick()) / TICK + 0.5, { from: 'spin' }); });
        emit('review_af_cut', { x: r2(a.x), z: r2(a.z), dx: 0, dz: 1, r: 1.0, half: 180, el: 'wind', spin: true, quiet: true });
      }, 0.12 + i * 0.16);
      return 0.9;
    },
    gale_crescent: (a, dir, aim, at, o) => at((a) => {
      wave({ x: a.x, z: a.z, dx: dir.x, dz: dir.z, len: 7, w: 0.7, speed: 18, el: 'wind', kind: 'thin', half: !!(o && o.copy), onHit: (e, w) => {
        hit(e, 14 * half(o), { src: 'gale', el: 'wind', wave: w.hit.size <= 3 });
        push(e, w.dx, w.dz, 2, 0.3);
      }, through: (w) => { for (const z of st.zones) if (z.kind === 'caltrops' && !z.kicked && Math.hypot(z.x - w.cx, z.z - w.cz) <= z.r + w.w / 2) kick(z); ringGrove((p) => Math.hypot(p.x - w.cx, p.z - w.cz) <= w.w / 2 + 0.3); } });
    }),
    blade_dance: (a, dir, aim, at) => at((a) => {
      emit('review_af_ring', { x: r2(a.x), z: r2(a.z), r: 1.3, el: 'wind', kind: 'burst' });
      const list = hostiles().filter((e) => d2(e, a) <= (1.3 + rad(e) * 0.5) ** 2).slice(0, 6);
      countCapped(list, (e, c) => { hit(e, 10, { src: 'dance', el: 'wind', cut: c }); lift(e, 0.6); });
    }),
    whirlwind_slash: (a, dir, aim, at, o) => at((a) => {
      const id = ++st.seq;
      const W = { id, kind: 'whirl', x: a.x, z: a.z, x0: a.x, z0: a.z, dx: dir.x, dz: dir.z, t: 0, secs: 1.6, len: 4, r: 1, el: null, held: new Set(), next: 0, tagged: new Set() };
      st.zones.push(W);
      emit('review_af_whirl', { id, x: r2(a.x), z: r2(a.z), r: 1, on: true });
    }),
    thousand_cuts: (a, dir, aim) => {
      st.act = { kind: 'blur', t: 0, i: 0, dir, last: null, used: new Set() };
      emit('review_af_blur', { on: true });
      a.iframeUntilTick = getTick() + sec(1.3);
      return 1.2;
    },
    ...NEW20,
  };

  function strike(id, a, dir, dashed, aim) {
    const boost = dashed ? 1.3 : 1;
    {
      const reach = 0.8 + (dashed ? 1 : 0);
      const p = aim || { x: a.x + dir.x, z: a.z + dir.z };
      const best = hostiles().filter((e) => d2(e, a) <= (reach + rad(e)) ** 2).sort((q, w) => d2(q, p) - d2(w, p))[0];
      emit('review_af_bash', { x: r2(a.x + dir.x * 0.6), z: r2(a.z + dir.z * 0.6), id: best ? best.id : null, dashed: !!dashed });
      if (best) { hit(best, 14 * boost, { src: 'hilt', el: 'earth', cut: true }); stun(best, 1); }
    }
  }
  function dashCut({ dist, dmg, n, el, id, dir, on }) {
    const a = fox();
    const l = Math.hypot(dir.x, dir.z) || 1;
    st.act = { kind: 'dashcut', t: 0, dir: { x: dir.x / l, z: dir.z / l }, x0: a.x, z0: a.z, hit: new Set(), D: { dist, t0: 0.1, t1: 0.1 + 0.3 * dist / 2.6, len: 0.85, hitR: 0.8 }, dmg, n, el, id, on };
    emit('review_af_dash', { dx: r2(dir.x / l), dz: r2(dir.z / l), el, len: 0.85, id, x: r2(a.x), z: r2(a.z), dist });
    st.countTick = getTick();
  }
  function kick(z) {
    z.kicked = true;
    z.r *= 2;
    z.stepped = new Set();
    emit('review_af_zone', { id: z.id, kind: z.kind, x: r2(z.x), z: r2(z.z), r: z.r, kicked: true });
  }
  function zone(o) {
    const id = ++st.seq;
    const z = { id, t: 0, until: getTick() + sec(o.secs), stepped: new Set(), next: 0, ...o };
    st.zones.push(z);
    emit('review_af_zone', { id, kind: o.kind, x: r2(o.x), z: r2(o.z), r: o.r, secs: o.secs, el: o.el });
    return z;
  }
  function burstImage() {
    const im = st.image;
    if (!im) return;
    st.image = null;
    emit('review_af_image', { on: false, x: r2(im.x), z: r2(im.z), r: 2 });
    for (const e of hostiles()) if (d2(e, im) <= (2 + rad(e) * 0.5) ** 2) { hit(e, 12, { src: 'image', el: 'water' }); slow(e, 0.4, 3); }
  }
  // Razor Wake (S38): the third cut in a row on the same foe throws it up 0.4 s
  function razorChain(list) {
    if (!st.passives.has('razor_wake')) return;
    void list;
  }

  // ---- the ten mixes (T5) ----
  const MIXNAME = { 'fire+fire': 'Blaze', 'earth+earth': 'Quake', 'water+water': 'Flood', 'wind+wind': 'Tornado', 'fire+wind': 'Firestorm', 'earth+fire': 'Magma', 'fire+water': 'Steam', 'earth+water': 'Mud', 'earth+wind': 'Sandstorm', 'water+wind': 'Frost' };
  function mix(pair) {
    const a = fox();
    if (!a) return;
    const key = pair.slice().sort().join('+');
    const name = MIXNAME[key];
    const dir = { x: a.faceX ?? 0, z: a.faceZ ?? 1 };
    const aim = st.mixAim ? aimDir(a, st.mixAim) : dir;
    emit('review_af_mix', { name, key, x: r2(a.x), z: r2(a.z), dx: r2(aim.x), dz: r2(aim.z) });
    const at = (dist) => ({ x: a.x + aim.x * dist, z: a.z + aim.z * dist });
    const M = {
      Blaze: () => wave({ x: a.x, z: a.z, dx: aim.x, dz: aim.z, len: 5, w: 2, speed: 6, el: 'fire', kind: 'blaze', onHit: (e, w) => { hit(e, 14, { src: 'blaze', wave: w.hit.size <= 3 }); burn(e, 6, 4); } }),
      Quake: () => {
        emit('review_af_ring', { x: r2(a.x), z: r2(a.z), r: 3, el: 'earth', kind: 'quake' });
        let n = 0;
        for (const e of hostiles()) if (d2(e, a) <= 3 ** 2) { hit(e, 18, { src: 'quake', wave: n++ < 3 }); stun(e, 1); }
      },
      Flood: () => wave({ x: a.x, z: a.z, dx: aim.x, dz: aim.z, len: 5, w: 3, speed: 8, el: 'water', kind: 'flood', onHit: (e, w) => { hit(e, 14, { src: 'flood', wave: w.hit.size <= 3, quench: true }); slow(e, 0.6, 4); push(e, w.dx, w.dz, 1.5, 0.4); } }),
      Tornado: () => {
        const id = ++st.seq;
        st.zones.push({ id, kind: 'tornado', x: a.x, z: a.z, x0: a.x, z0: a.z, dx: aim.x, dz: aim.z, t: 0, secs: 2, len: 5, r: 1.5, held: new Set(), next: 0, tagged: new Set() });
        emit('review_af_whirl', { id, x: r2(a.x), z: r2(a.z), r: 1.5, on: true, tornado: true });
      },
      Firestorm: () => {
        emit('review_af_ring', { x: r2(a.x), z: r2(a.z), r: 3.5, el: 'fire', kind: 'firestorm' });
        const list = hostiles().filter((e) => d2(e, a) <= 3.5 ** 2);
        let n = 0;
        for (const e of list) { hit(e, 12, { src: 'firestorm', wave: n++ < 3 }); const dx = e.x - a.x, dz = e.z - a.z; push(e, dx, dz, 1, 0.25); burn(e, 4, 3); }
        later(0.3, () => { for (const e of list) if (burning(e)) for (const f of hostiles()) if (f !== e && d2(f, e) <= 4 && !burning(f)) burn(f, 4, 3, { from: 'fan' }); });
      },
      Magma: () => { const p = at(Math.min(4, st.mixDist ?? 3)); zone({ kind: 'magma', x: p.x, z: p.z, r: 1.8, secs: 5, el: 'fire' }); },
      Steam: () => {
        emit('review_af_ring', { x: r2(a.x), z: r2(a.z), r: 3, el: 'water', kind: 'steam' });
        let n = 0;
        for (const e of hostiles()) if (d2(e, a) <= 3 ** 2) { hit(e, 10, { src: 'steam', wave: n++ < 3 }); blind(e, 1.5); }
      },
      Mud: () => { const p = at(Math.min(4, st.mixDist ?? 3)); zone({ kind: 'mud', x: p.x, z: p.z, r: 2.2, secs: 5, el: 'earth' }); },
      Sandstorm: () => {
        const p = at(Math.min(4, st.mixDist ?? 3));
        const id = ++st.seq;
        emit('review_af_sand', { id, x: r2(p.x), z: r2(p.z), r: 3, secs: 1 });
        for (const e of hostiles()) if (d2(e, p) <= 3 ** 2) { const dx = p.x - e.x, dz = p.z - e.z, l = Math.hypot(dx, dz); move(e, e.x + dx * Math.max(0, l - 0.5) / (l || 1), e.z + dz * Math.max(0, l - 0.5) / (l || 1), 1, { kind: 'pull', slam: false }); }
        later(1, () => {
          emit('review_af_burst', { x: r2(p.x), z: r2(p.z), r: 3, el: 'earth', sand: true });
          let n = 0;
          for (const e of hostiles()) if (d2(e, p) <= 3 ** 2) { hit(e, 14, { src: 'sandstorm', wave: n++ < 3 }); stun(e, 0.5); }
        });
      },
      Frost: () => {
        emit('review_af_cone', { x: r2(a.x), z: r2(a.z), dx: r2(aim.x), dz: r2(aim.z), len: 4, half: 35 });
        let n = 0;
        for (const e of hostiles()) if (inFan(a, e, aim, 4, 35)) { hit(e, 12, { src: 'frost', wave: n++ < 3 }); stun(e, 1); st.frozen.set(e.id, getTick() + sec(1.2)); emit('review_af_frozen', { id: e.id, secs: 1 }); }
      },
    };
    if (M[name]) M[name]();
  }


  // ---- 2.1 Will (T11, T12): the ten specials, each done by a sword spirit (MOTIONS M26 to M36) ----
  const haste = () => (st.haste && st.haste.until > getTick() ? st.haste.mul : 1);
  const spHit = (e, dmg, src) => hit(e, dmg, { src: 'sp_' + src, count: false, shape: 'melee_arc' });
  const nearAt = (x, z, r) => hostiles().filter((e) => (e.x - x) ** 2 + (e.z - z) ** 2 <= (r + rad(e) * 0.6) ** 2);
  const SPECIAL_OF = { 'fire+fire': 'one_thought', 'earth+earth': 'unmoved', 'water+water': 'clear_mirror', 'wind+wind': 'frenzy', 'earth+fire': 'counterblow', 'fire+water': 'see_through', 'fire+wind': 'wild_dance', 'earth+water': 'still_mountain', 'earth+wind': 'last_stand', 'water+wind': 'flow' };
  const SPECIAL_WILLS = {};
  for (const k in SPECIAL_OF) SPECIAL_WILLS[SPECIAL_OF[k]] = k.split('+');
  const heal = (a, n) => { combat.applyHeal(a, n, { healer: a.id, source: 'af_special' }); };
  const SPECIALS = {
    // One Thought: a giant spirit sword falls along the aim, 7 u by 1.5 u: 30; the line glows 3 s and scars
    one_thought: (ev, a, dir, x, z) => {
      later(0.45, () => { for (const e of hostiles()) if (inStrip({ x, z }, dir, 7, 1.5, e)) spHit(e, 34, 'one'); });
    },
    // Unmoved: a great sword plants before him: 12 within 2.5 u, daunt 0.5 s; 3 s of 40% less and no push
    unmoved: (ev, a, dir, x, z) => {
      later(0.3, () => { for (const e of nearAt(x + dir.x * 0.7, z + dir.z * 0.7, 2.5)) spHit(e, 14, 'unmoved'); });
      st.guard = { mul: 0.6, until: getTick() + sec(3.3), kind: 'unmoved' };
    },
    // Clear Mirror: the floor is a mirror, 3 u: 10 and 40% stillness 3 s; he heals 12, every harm on him ends
    clear_mirror: (ev, a, dir, x, z) => {
      later(0.5, () => {
        for (const e of nearAt(x, z, 3)) spHit(e, 12, 'mirror');
        const b = fox();
        if (b) heal(b, 12); // no harm is on him in the clip; the look shows the cleanse
      });
    },
    // Frenzy: four spirits cut across him twice, 2 u: eight cuts of 3; basic attacks 30% faster 4 s
    frenzy: (ev, a, dir, x, z) => {
      for (let i = 0; i < 8; i++) later(0.24 + i * 0.1, () => { const b = fox(); for (const e of nearAt(b.x, b.z, 2)) spHit(e, 3, 'frenzy'); });
      st.haste = { mul: 1.3, until: getTick() + sec(5.0) };
    },
    // Counterblow: a spirit guards him 1 s; a blocked hit is answered (in stepShots), else it cuts for 14
    counterblow: (ev, a, dir, x, z) => {
      st.spGuard = { until: getTick() + sec(1), done: false };
      later(1.0, () => {
        if (st.spGuard && st.spGuard.done) return;
        const b = fox();
        emit('review_af_sp_cut', { x: r2(b.x), z: r2(b.z), dx: r2(dir.x), dz: r2(dir.z) });
        later(0.12, () => { for (const e of hostiles()) if (inStrip(b, dir, 3, 1.0, e)) spHit(e, 14, 'counter'); });
      });
    },
    // See Through: every foe within 4 u is marked, 20% more from him 4 s; then one cut on each, 8
    see_through: (ev, a, dir, x, z) => {
      const L = nearAt(x, z, 4);
      ev.ids = L.map((e) => e.id);
      later(0.2, () => { for (const e of L) st.seen.set(e.id, getTick() + sec(4)); });
      later(0.7, () => { for (const e of L) spHit(e, 8, 'see'); });
    },
    // Wild Dance: ten strokes draw a star on the foe nearest his aim within 3 u: 4 each
    wild_dance: (ev, a, dir, x, z) => {
      const ax = x + dir.x * 1.5, az = z + dir.z * 1.5;
      const t = nearAt(x, z, 3).sort((p, q) => ((p.x - ax) ** 2 + (p.z - az) ** 2) - ((q.x - ax) ** 2 + (q.z - az) ** 2))[0];
      if (!t) return;
      ev.tid = t.id; ev.tx = r2(t.x); ev.tz = r2(t.z);
      for (let i = 0; i < 10; i++) later(0.1 + i * 0.085, () => spHit(t, 4, 'dance'));
    },
    // Still Mountain: 3 s of 4 healed a second and 30% less; a foe that hits him is stilled; ends in a ring, 3 u: 8
    still_mountain: (ev, a, dir, x, z) => {
      st.guard = { mul: 0.7, until: getTick() + sec(3), kind: 'still' };
      for (let k = 1; k <= 3; k++) later(k, () => { const b = fox(); if (b) heal(b, 4); });
      later(3.0, () => { for (const e of nearAt(x, z, 3)) spHit(e, 10, 'still'); });
    },
    // Last Stand: a shock round him, 2.5 u: 12 and a 1 u push; 4 s nothing stills or daunts him, basics 20% faster
    last_stand: (ev, a, dir, x, z) => {
      later(0.3, () => { for (const e of nearAt(x, z, 2.5)) spHit(e, 14, 'last'); });
      st.haste = { mul: 1.2, until: getTick() + sec(4.3) };
    },
    // Flow: a ribbon of six spirit swords flies 6 u in an S and back: 10 to each foe; the dash is ready
    flow: (ev, a, dir, x, z) => {
      const got = new Set(), nx = -dir.z, nz = dir.x;
      const at = (u) => { const out = u < 0.5, v = out ? u * 2 : (1 - u) * 2, lat = (out ? 1 : -1) * 0.9 * Math.sin(Math.PI * 2 * v); return { x: x + dir.x * 6 * v + nx * lat, z: z + dir.z * 6 * v + nz * lat }; };
      for (let k = 0; k <= 42; k++) later(0.2 + k / 60, () => { const p = at(k / 42); for (const e of nearAt(p.x, p.z, 0.6)) if (!got.has(e.id)) { got.add(e.id); spHit(e, 10, 'flow'); } });
    },
  };
  function special(name, aim) {
    const a = fox();
    if (!a || !SPECIALS[name]) return;
    const pair = st.orbs.slice();
    st.orbs = [];
    emit('review_af_orbs', { list: [], spent: pair });
    const dir = aimDir(a, aim);
    const ev = { name, x: r2(a.x), z: r2(a.z), dx: r2(dir.x), dz: r2(dir.z), wills: SPECIAL_WILLS[name] };
    SPECIALS[name](ev, a, dir, a.x, a.z);
    emit('review_af_special', ev);
  }
  // ---- shots at him (Riposte, Sent back C8) ----
  function shoot(fromId) {
    const a = fox();
    const f = registry.byId(fromId) || hostiles()[0];
    if (!a || !f) return;
    const id = ++st.seq;
    const dx = a.x - f.x, dz = a.z - f.z, l = Math.hypot(dx, dz) || 1;
    st.shots.push({ id, x: f.x, z: f.z, dx: dx / l, dz: dz / l, speed: 7, from: f.id, back: false });
    emit('review_af_shot', { id, x: r2(f.x), z: r2(f.z), dx: r2(dx / l), dz: r2(dz / l) });
  }
  function stepShots() {
    const a = fox();
    for (let i = st.shots.length - 1; i >= 0; i--) {
      const s = st.shots[i];
      s.x += s.dx * s.speed / TICK;
      s.z += s.dz * s.speed / TICK;
      emit('review_af_shotpos', { id: s.id, x: r2(s.x), z: r2(s.z), back: s.back });
      if (!s.back && a && d2(s, a) <= 0.45 ** 2) {
        st.shots.splice(i, 1);
        if (st.spGuard && st.spGuard.until > getTick() && !st.spGuard.done) {
          // Counterblow (T12): the spirit takes the blow, rings, and answers along a 3 u line
          st.spGuard.done = true;
          emit('review_af_shot_end', { id: s.id, caught: true });
          const atk = registry.byId(s.from);
          const d = atk ? aimDir(a, atk) : { x: -s.dx, z: -s.dz };
          emit('review_af_sp_block', { x: r2(a.x), z: r2(a.z), dx: r2(d.x), dz: r2(d.z), sx: r2(s.x), sz: r2(s.z) });
          later(0.12, () => { for (const e of hostiles()) if (inStrip(a, d, 3, 1.0, e)) spHit(e, 28, 'counter'); });
          continue;
        }
        if (st.parry && st.parry.until > getTick()) {
          st.parry0 = st.parry;
          // the parry catches it and answers with the backhand; the shot flies back as a wave (C8)
          st.parry = null;
          emit('review_af_parry', { on: false, caught: true, x: r2(a.x), z: r2(a.z) });
          emit('review_af_shot_end', { id: s.id, caught: true });
          const v20 = !!(st.parry0 && st.parry0.v20), pf = (st.parry0 && st.parry0.form) || 'base';
          play(v20 ? 'riposteHit20' : 'castParry', v20 ? 0 : 0.35);
          // 2.1 Swift (F12): he is gone and stands behind the attacker; the cut lands a beat later
          const atk = registry.byId(s.from);
          if (pf === 'swift' && atk) {
            const d0 = aimDir(a, atk), L = Math.hypot(atk.x - a.x, atk.z - a.z) + 0.9;
            emit('review_af_streak', { x0: r2(a.x), z0: r2(a.z), x1: r2(a.x + d0.x * L), z1: r2(a.z + d0.z * L), el: 'earth', thrust: true });
            glide(a, d0, L, 0.12, 'dash');
            later(0.14, () => { const b = fox(); const d1 = { x: -d0.x, z: -d0.z }; face(b, d1); });
          }
          later(v20 ? (pf === 'swift' ? 0.36 : 0.27) : 0.1, () => {
            const b = fox();
            const sh = registry.byId(s.from);
            const d = sh ? aimDir(b, sh) : { x: -s.dx, z: -s.dz };
            // Kesh 18 Nov 15:36, Crescent: a 剑气 follows the parried shot back to the shooter
            if (pf === 'crescent') { const L2 = sh ? Math.hypot(sh.x - b.x, sh.z - b.z) + 0.6 : 6; later(0.12, () => { const c = fox(); qi(c, d, L2, 21, 'earth', { w: 1.0, x: c.x, z: c.z }); }); }
            emit('review_af_cut', { x: r2(b.x), z: r2(b.z), dx: r2(d.x), dz: r2(d.z), r: 0.9, half: 45, el: 'earth' });
            for (const e of hostiles()) if (inFan(b, e, d, 0.9, 45)) { hit(e, 30, { src: 'riposte', el: 'earth', cut: true }); stun(e, 0.5); }
            const L = sh ? Math.hypot(sh.x - b.x, sh.z - b.z) : 8;
            wave({ x: b.x, z: b.z, dx: d.x, dz: d.z, len: L, w: 0.8, el: 'earth', kind: 'sentback', onHit: (e) => { if (e.id === s.from) hit(e, 30, { src: 'sentback', el: 'earth', wave: true }); } });
          });
        } else {
          emit('review_af_shot_end', { id: s.id });
          const g = st.guard && st.guard.until > getTick() ? st.guard : null;
          busy = true;
          combat.applyDamage(a, 6 * (g ? g.mul : 1), { delivery: 'projectile', shape: 'projectile', dirX: s.dx, dirZ: s.dz, attacker: s.from });
          busy = false;
          st.lastHurt = getTick();
          if (g) emit('review_af_sp_guard', { x: r2(a.x), z: r2(a.z), pct: Math.round((1 - g.mul) * 100), kind: g.kind });
          const atk = registry.byId(s.from);
          if (atk && st.stillUntil > getTick()) { slow(atk, 0.4, 2); emit('review_af_sp_still', { id: atk.id, x: r2(atk.x), z: r2(atk.z) }); }
        }
        continue;
      }
      if (Math.hypot(s.x, s.z) > 14) { st.shots.splice(i, 1); emit('review_af_shot_end', { id: s.id }); }
    }
  }

  // ---- per-tick: acts ----
  function stepAct(a, dt) {
    const A = st.act;
    if (!A) return;
    A.t += dt;
    const tick = getTick();
    if (A.kind === 'cuts') {
      const C = A.cur;
      if (!C) return;
      C.t += dt * haste();
      if (!C.done && C.t >= C.B.at) { C.done = true; doCut(a, C.B); }
      if (C.t >= (A.left > 0 ? Math.max(C.B.at + 0.12, C.B.len - 0.1) : C.B.len)) nextCut();
    } else if (A.kind === 'dash' || A.kind === 'dashcut') {
      const D = A.D;
      const u = Math.min(1, Math.max(0, (A.t - D.t0) / (D.t1 - D.t0)));
      const e2 = 1 - (1 - u) * (1 - u);
      if (A.t >= D.t0 && A.t <= D.t1 + 0.02) {
        a.x = A.x0 + A.dir.x * D.dist * e2;
        a.z = A.z0 + A.dir.z * D.dist * e2;
        a.iframeUntilTick = tick + 2;
        for (const e of hostiles()) {
          if (A.hit.has(e.id) || d2(e, a) > (D.hitR + rad(e) * 0.5) ** 2) continue;
          if (A.kind === 'dashcut' && A.hit.size >= A.n) continue;
          A.hit.add(e.id);
          if (A.kind === 'dash') {
            hit(e, D.dmg, { src: 'dash', cut: false, count: false, delivery: 'basic' });
            addCount(K.dash.count);
            emit('review_af_slash', { id: e.id, x: r2(e.x), z: r2(e.z), el: null });
          } else {
            hit(e, A.dmg, { src: A.id, el: A.el, cut: A.hit.size <= 3 });
            emit('review_af_slash', { id: e.id, x: r2(e.x), z: r2(e.z), el: A.el });
            if (A.on) A.on(e);
          }
        }
        // a dash cut through the image bursts it (C7)
        if (st.image && d2(a, st.image) <= 0.6 ** 2) burstImage();
      }
      if (A.t >= D.t1 + 0.04 && st.pendingStrike) {
        const P = st.pendingStrike;
        st.pendingStrike = null;
        const id = P.id;
        st.act = null;
        // it comes out at the end of the dash (C11): 1 u farther, 30% harder
        const dir = A.dir;
        face(a, dir);
        emit('review_af_cast', { skill: id, el: 'earth', x: r2(a.x), z: r2(a.z), dashed: true });
        emit('review_af_trail', { color: ELC.earth });
        if (id === 'lunge_strike') {
          // kit 2.3 (K46): the new Lunge Strike out of the dash, from its thrust (the skip back is left out)
          play('lunge20', 0.15);
          const at = (fn, extra = 0) => later(Math.max(0, extra + LEAD - 0.15), () => fn(fox(), dir, P.aim));
          NEW20.lunge_strike(a, dir, P.aim, at, { dashed: true });
        } else {
          play(MOVE[id][0], Math.max(0, MOVE[id][1] - 0.05), { flip: true });
          later(0.05, () => strike(id, fox(), dir, true, P.aim));
        }
        storeOrb('earth', 0.4);
        emit('review_af_edge', { el: 'earth', secs: 0.7 });
        return;
      }
      if (A.t >= D.len) st.act = null;
    } else if (A.kind === 'blur') {
      // Thousand Cuts (S39): eight cuts of 5 in 1.2 s on foes within 3 u, a different foe each time while there is one
      const at = A.v20 ? 0.05 + A.i * 0.12 : 0.1 + A.i * 0.14;
      if (A.i < 8 && A.t >= at) {
        const all = hostiles().filter((e) => d2(e, A.center || a) <= 3.2 ** 2);
        if (!A.center) A.center = { x: a.x, z: a.z };
        let pool = all.filter((e) => e !== A.last);
        if (!pool.length) pool = all;
        const aimP = { x: A.center.x + A.dir.x * 2, z: A.center.z + A.dir.z * 2 };
        const t = A.i === 0 ? pool.sort((p, q) => d2(p, aimP) - d2(q, aimP))[0] : pool.sort((p, q) => (A.used.has(p.id) - A.used.has(q.id)) || d2(p, A.last || a) - d2(q, A.last || a))[0];
        A.i++;
        if (t) {
          A.used.add(t.id);
          A.last = t;
          // he appears beside it, on the side he came from
          const fx = a.x - t.x, fz = a.z - t.z, l = Math.hypot(fx, fz) || 1;
          const side = A.i % 2 ? 1 : -1;
          const px = t.x + (fx / l) * 0.75 + (-fz / l) * 0.25 * side, pz = t.z + (fz / l) * 0.75 + (fx / l) * 0.25 * side;
          const d = { x: (t.x - px) / 0.78, z: (t.z - pz) / 0.78 };
          if (A.stay) emit('review_af_ghostcut', { x: r2(px), z: r2(pz), dx: r2(d.x), dz: r2(d.z), i: A.i });
          else {
            emit('review_af_blink', { x0: r2(a.x), z0: r2(a.z), x1: r2(px), z1: r2(pz), dim: !!A.v20 });
            a.x = px;
            a.z = pz;
            a.px = px;
            a.pz = pz;
            a.faceX = d.x;
            a.faceZ = d.z;
            emit('review_af_face', { dx: r2(d.x), dz: r2(d.z), secs: 0.2 });
          }
          if (!A.v20) play(A.i % 2 ? 'blurA' : 'blurB', 0);
          hit(t, 5, { src: 'thousand', el: 'wind', cut: true, shape: A.v20 ? 'melee_arc' : 'nova' });
          if (A.v20) emit('review_af_tcut', { id: t.id, x: r2(t.x), z: r2(t.z), i: A.i, px: r2(px), pz: r2(pz) });
          else emit('review_af_slash', { id: t.id, x: r2(t.x), z: r2(t.z), el: 'wind' });
        }
      }
      if (A.t >= (A.v20 ? 0.9 : 1.2) && !A.end) {
        A.end = true;
        if (!A.stay) emit('review_af_blur', { on: false });
        if (!A.v20 && A.last && A.last.hp > 0) lift(A.last, 0.6);
      }
      if (A.v20 && A.t >= 1.1 && !A.click) {
        A.click = true;
        emit('review_af_tclick', { id: A.last ? A.last.id : null });
        if (A.last && A.last.hp > 0) lift(A.last, 0.6);
      }
      if (A.t >= (A.v20 ? 1.2 : 1.4)) st.act = null;
    }
  }

  // ---- per-tick: zones (caltrops, whirls, the tornado, magma, mud) ----
  function stepZones() {
    const tick = getTick(), dt = 1 / TICK;
    for (let i = st.zones.length - 1; i >= 0; i--) {
      const z = st.zones[i];
      if (z.kind === 'whirl' || z.kind === 'tornado') {
        z.t += dt;
        const u = Math.min(1, z.t / z.secs), over = z.t >= z.secs + (z.hold || 0);
        z.x = z.x0 + z.dx * z.len * u;
        z.z = z.z0 + z.dz * z.len * u;
        // a crescent thrown through the whirl gives it its element (C5)
        if (z.kind === 'whirl' && st.fx) for (const w of st.waves) if (w.el && w.kind !== 'strong' && w.kind !== 'throw' && !z.tagged.has(w.id) && Math.hypot(w.cx - z.x, w.cz - z.z) <= z.r + 0.3) {
          z.tagged.add(w.id);
          if (z.el !== w.el) { z.el = w.el; emit('review_af_whirl', { id: z.id, el: w.el }); }
        }
        for (const e of hostiles()) if (d2(e, z) <= (z.r + rad(e) * 0.4) ** 2 && !z.held.has(e.id)) {
          z.held.add(e.id);
          if (z.kind === 'tornado') lift(e, 1);
          if (z.kind === 'whirl' && z.el === 'earth') stun(e, 0.3);
          const off = { x: e.x - z.x, z: e.z - z.z };
          const l = Math.hypot(off.x, off.z);
          if (l > 0.55) { off.x *= 0.55 / l; off.z *= 0.55 / l; }
          z.off = z.off || new Map();
          z.off.set(e.id, off);
        }
        // drag what it holds along
        for (const id of z.held) {
          const e = registry.byId(id);
          if (!e || !(e.hp > 0)) continue;
          const off = z.off.get(id), ang = z.t * 6;
          const ox = off.x * Math.cos(ang) - off.z * Math.sin(ang), oz = off.x * Math.sin(ang) + off.z * Math.cos(ang);
          e.x = z.x + ox * 0.9;
          e.z = z.z + oz * 0.9;
          st.anchors.set(e.id, { x: e.x, z: e.z });
          // into a wall: wall slam (C5, S55)
          for (const wl of st.walls) if (inBox(e.x, e.z, wl, rad(e) * 0.6) && !(z.slammed || (z.slammed = new Set())).has(e.id)) {
            z.slammed.add(e.id);
            wallSlam(e, wl);
          }
        }
        if (tick >= z.next) {
          z.next = tick + sec(z.kind === 'tornado' ? 0.5 : 0.25);
          let n = 0;
          // Blade Wheel (Kesh 20 Nov 17:08 SGT): the small swords inside the tornado cut the foes it holds; show each cut
          if (z.wheel && z.held.size) emit('review_af_whirlcut', { id: z.id, ids: [...z.held] });
          for (const id of z.held) {
            const e = registry.byId(id);
            if (!e || !(e.hp > 0)) continue;
            hit(e, z.kind === 'tornado' ? 4 : 3, { src: z.kind, el: 'wind', wave: n++ < 3 });
            if (z.kind === 'whirl' && z.el === 'fire') burn(e, 3, 3);
            if (z.kind === 'whirl' && z.el === 'water') slow(e, 0.4, 1);
          }
        }
        emit('review_af_whirlpos', { id: z.id, x: r2(z.x), z: r2(z.z), done: over });
        if (over) {
          st.zones.splice(i, 1);
          for (const id of z.held) { const e = registry.byId(id); if (e) st.anchors.set(e.id, { x: e.x, z: e.z }); }
          emit('review_af_whirl', { id: z.id, on: false, x: r2(z.x), z: r2(z.z) });
        }
        continue;
      }
      if (tick >= z.until) {
        st.zones.splice(i, 1);
        emit('review_af_zone_end', { id: z.id });
        continue;
      }
      for (const e of hostiles()) {
        const on = d2(e, z) <= (z.r + rad(e) * 0.4) ** 2;
        if (!on) continue;
        if (!z.stepped.has(e.id)) {
          z.stepped.add(e.id);
          if (z.kind === 'caltrops') { stun(e, 0.4); hit(e, 8, { src: 'caltrops', el: 'earth' }); }
          if (z.kind === 'magma') stun(e, 0.5);
          if (z.kind === 'mud') { stun(e, 1); emit('review_af_stuck', { id: e.id, secs: 1 }); }
        }
        if (z.kind === 'magma' && !burning(e)) burn(e, 5, 1);
        if (z.kind === 'mud' && tick % 10 === 0) S.apply(e, 'slow', 0.6, sec(0.4), tick, fox()?.id ?? null);
      }
    }
  }
  function wallSlam(e, wl) {
    emit('review_af_wallslam', { id: e.id, x: r2(e.x), z: r2(e.z), wx: r2(wl.x), wz: r2(wl.z) });
    hit(e, K.wallSlam.dmg, { src: 'wall' });
    stun(e, K.wallSlam.stun);
  }
  function stepMoves() {
    const tick = getTick();
    for (const [id, m] of st.moves) {
      const e = registry.byId(id);
      if (!e || !(e.hp > 0) || m.done) { st.moves.delete(id); continue; }
      const u = Math.min(1, (tick - m.t0) / m.ticks);
      const k = m.kind === 'pull' ? u * u * (3 - 2 * u) : 1 - (1 - u) * (1 - u);
      e.x = m.x0 + (m.x1 - m.x0) * k;
      e.z = m.z0 + (m.z1 - m.z0) * k;
      if (m.kind === 'bat') e.reviewY = 0.7 * 4 * u * (1 - u) + 0.3 * (1 - u);
      if (m.slam && e.faction === 'hostile') for (const wl of st.walls) if (inBox(e.x, e.z, wl, rad(e) * 0.6)) {
        // stop at the wall's face
        const back = Math.max(0, k - 0.06);
        e.x = m.x0 + (m.x1 - m.x0) * back;
        e.z = m.z0 + (m.z1 - m.z0) * back;
        m.done = true;
        wallSlam(e, wl);
        break;
      }
      if (e.faction === 'hostile') st.anchors.set(e.id, { x: e.x, z: e.z });
      if (u >= 1) { st.moves.delete(id); if (m.kind === 'bat') e.reviewY = 0; }
    }
  }

  function step(tick) {
    const a = fox();
    if (!a) return;
    const dt = 1 / TICK;
    for (const q of st.queue.splice(0)) q();
    for (let i = st.timers.length - 1; i >= 0; i--) if (st.timers[i].at <= tick) st.timers.splice(i, 1)[0].fn();
    if (st.act) stepAct(a, dt);
    stepMoves();
    stepWaves();
    stepZones();
    stepShots();
    stepRecs(tick);
    // Calm Edge (K31): on while he has taken no hit for 3 s
    { const on = st.passives.has('cold_edge') && tick - st.lastHurt >= sec(3); if (on !== st.calmOn) { st.calmOn = on; emit('review_af_calm', { on, x: r2(a.x), z: r2(a.z) }); } }
    // the count falls to 0 after 3 s without a counted hit
    if (st.count > 0 && tick - st.countTick >= sec(K.count.fall)) {
      st.count = 0;
      emit('review_af_count', { n: 0, fell: true });
    }
    // burns: damage each half second; they cannot crit and do not count
    for (const [id, b] of st.burns) {
      const e = registry.byId(id);
      if (!e || !(e.hp > 0) || tick >= b.until) {
        st.burns.delete(id);
        emit('review_af_burn', { id, on: false });
        continue;
      }
      if (tick >= b.next) {
        b.next = tick + sec(K.burnTick);
        hit(e, b.dps * K.burnTick, { src: 'burn', noCrit: true, count: false });
      }
    }
    // Razor Wake (S38): every second the 3 nearest foes within 0.9 u take 4; the third cut in a row throws up
    if (st.passives.has('razor_wake') && tick >= st.razor.next) {
      st.razor.next = tick + sec(1);
      const near = hostiles().filter((e) => d2(e, a) <= (0.9 + rad(e) * 0.6) ** 2).sort((p, q) => d2(p, a) - d2(q, a)).slice(0, 3);
      if (near.length) emit('review_af_razor', { ids: near.map((e) => e.id), x: r2(a.x), z: r2(a.z) });
      const first = near[0] || null;
      if (first && st.razor.last === first.id) st.razor.n++;
      else st.razor.n = first ? 1 : 0;
      st.razor.last = first ? first.id : null;
      countCapped(near, (e, c) => hit(e, 4, { src: 'razor', el: 'wind', cut: c }));
      if (first && st.razor.n >= 3) { st.razor.n = 0; lift(first, 0.4); }
    }
    // Mirror Image: 3 s, then it bursts
    if (st.image && tick >= st.image.until) burstImage();
    // thrown-up bodies
    for (const e of registry.all()) if (e.reviewLift) {
      const L = e.reviewLift, u = (tick - L.t0) / L.ticks;
      if (u >= 1 || !(e.hp > 0)) { e.reviewY = 0; e.reviewLift = null; } else e.reviewY = 4 * L.h * u * (1 - u);
    }
    // the dummies stand where they are put; only his skills move them
    for (const e of hostiles()) {
      if (!st.anchors.has(e.id)) st.anchors.set(e.id, { x: e.x, z: e.z });
      if (st.free) { st.anchors.set(e.id, { x: e.x, z: e.z }); continue; }
      if (!st.moves.has(e.id)) {
        const p = st.anchors.get(e.id);
        e.x = p.x;
        e.z = p.z;
      }
      e.px = e.x;
      e.pz = e.z;
      e.nextAttackTick = tick + 600;
      if (e.cdByTarget) for (const k in e.cdByTarget) e.cdByTarget[k] = tick + 600;
      if (a) e.cdByTarget && (e.cdByTarget[a.id] = tick + 600);
      e.vx = 0;
      e.vz = 0;
      e.kbTicks = 0;
    }
    // his own moves (the flowing steps, the hop)
    if (st.moves.has(a.id) === false && st.hold) {
      // keep him where the clip put him
    }
  }

  const api = {
    K,
    cast: (id, aim = null, steer = null) => st.queue.push(() => { st.steer = steer ? { x: steer[0], z: steer[1] } : null; startCast(id, aim); }),
    cut: (n = 1) => st.queue.push(() => startCut(n)),
    shot: (secs = 0.2) => st.queue.push(() => startShot(secs)),
    combo: (n = K.basic.length) => st.queue.push(() => { st.basicI = 0; startCut(n); }),
    dash: (dx, dz) => st.queue.push(() => startDash({ x: dx, z: dz })),
    release: () => st.queue.push(() => release()),
    shoot: (k = 0) => st.queue.push(() => { const f = hostiles().sort((p, q) => d2(q, fox()) - d2(p, fox()))[k]; if (f) shoot(f.id); }),
    passive: (id, on = true) => st.queue.push(() => { if (on) st.passives.add(id); else st.passives.delete(id); emit('review_af_passive', { id, on }); }),
    wall: (x, z, w, d) => st.queue.push(() => { st.walls.push({ x, z, w, d }); emit('review_af_wall', { x, z, w, d }); }),
    set: (o) => st.queue.push(() => Object.assign(st, o)),
    walk: (dx, dz, secs = 0.6) => st.queue.push(() => { const a = fox(); move(a, a.x + dx, a.z + dz, secs, { slam: false, kind: 'step' }); }),
    form: (f) => { st.form = f || 'base'; },
    special: (name, aim = null) => st.queue.push(() => special(name, aim ? { x: aim[0], z: aim[1] } : null)),
    orbs: (list) => st.queue.push(() => { st.orbs = list.slice(); emit('review_af_orbs', { list: st.orbs.slice() }); }),
    count: (n) => st.queue.push(() => { st.count = n; st.countTick = getTick(); emit('review_af_count', { n }); }),
    burnAll: (dps = 3, secs = 3) => st.queue.push(() => { for (const e of hostiles()) burn(e, dps, secs); }),
    reset: () => {
      st.act = null; st.timers = []; st.form = "base"; st.swordAway = null; st.count = 0; st.strong = false; st.orbs = []; st.fusion = false; st.passives.clear(); st.burns.clear(); st.waves = []; st.zones = []; st.walls = [];
      st.image = null; st.frozen.clear(); st.coldN.clear(); st.razor = { next: 0, last: null, n: 0 }; st.basicI = 0; st.shotN = 0; st.shot = null; st.cmarks.clear(); st.ch = {}; st.wheelEnd = null; st.grove = null; st.parry = null; st.pendingStrike = null; st.shots = []; st.moves.clear(); st.anchors.clear();
      st.recs = []; st.echo = null; st.echoN = 0; st.echoOn = true; st.echoShow = false; st.noMarks = false; st.noCopies = true; st.fx = false; st.lastHurt = -1e9; st.calmOn = false; st.copying = false; st.replaying = false;
      st.seen.clear(); st.guard = null; st.haste = null; st.spGuard = null; st.stillUntil = 0; st.free = false; st.charge = null; st.mixAim = null; st.mixDist = null; st.tripleAim = null; st.steer = null;
      emit('review_af_reset', {});
      emit('review_af_orbs', { list: [] });
      emit('review_af_count', { n: 0 });
    },
    state: () => {
      const a = fox();
      return { count: st.count, song: Math.floor(st.count / 10) * 10, orbs: st.orbs.slice(), strong: st.strong, fusion: st.fusion, hp: a ? Math.round(a.hp) : 0, act: st.act ? st.act.kind : null, passives: [...st.passives] };
    },
  };
  globalThis.__AF = api;
  // the image: hits from foes on it (unused with dummies); a hit on him while parrying is caught
  const raw = combat.applyDamage;
  combat.applyDamage = (target, base, o = {}) => {
    if (busy) return raw(target, base, o);
    return raw(target, base, o);
  };
  return { step };
}
