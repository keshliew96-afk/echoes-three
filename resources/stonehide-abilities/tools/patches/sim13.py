p='/home/user/echoes-three/src/sim/reviewStonehide.js'; s=open(p).read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt, (a[:70], s.count(a))
    s=s.replace(a,b)
# --- numbers
rep("  colossus: { grow: 0.5,","""  // 1.3: Stone Ring (S47), Slab Throw (S48), Grindstone (S49), Stone Cubs (S50), Wall slam (S51), Kick the stone, Weight of stone, Quills spread, Shots fly back.
  ring: { r: 3.5, secs: 4, rise: 0.3, taunt: 4, stones: 16, gap: 0.35 },
  throw: { reach: 7, bounces: 3, hop: 4, dmg: 14, hp: 0.03, taunt: 3, speed: 11 },
  grind: { secs: 6, self: 0.03, foe: 0.06, r: 2.5, floor: 0.1 },
  cubs: { n: 2, life: 10, speed: 4.5, search: 8, bite: 3, every: 0.5, taunt: 2, climb: 0.5 },
  wall: { dmg: 10, hp: 0.03, stun: 0.5 },
  roll: { dist: 5, secs: 0.8, dmg: 16, aside: 1, taunt: 3, w: 0.75 },
  slamWeight: 60, spread: { n: 3, r: 3, dmg: 10 }, shotBack: 0.5,
  colossus: { grow: 0.5,""")
rep("  slabguard: ['guard', 0.2], colossus: ['castBloom', 0.4], fault_line:","  slabguard: ['guard', 0.2], colossus: ['castBloom', 0.4], stone_ring: ['castPlant', 0.46], slab_throw: ['throw', 0.3], grindstone: ['castBloom', 0.4], stone_cubs: ['castPlant', 0.46], fault_line:")
rep("fracture: false, cracks: new Map(), slab: null, giant: null,","fracture: false, cracks: new Map(), slab: null, giant: null, ringSt: null, thrown: null, grind: null, cubs: [], shooter: new Map(), quillCast: new Map(), quillN: 0,")
# returned hits crack
rep("/^(basic|thorns|quill_back|briar_back)$/","/^(basic|thorns|quill_back|briar_back|shot_back)$/")
# shove marks the push for wall slam
rep("""    e.kbTicks = ticks;
  }""","""    e.kbTicks = ticks;
    e.reviewPush = { dx: dx / l, dz: dz / l, until: getTick() + ticks + 1, done: false };
  }
  // Wall slam (S51): a foe he pushes that meets a room wall or a ring stone, once per push.
  function wallCheck(e) {
    const P = e.reviewPush;
    if (!P || P.done) return;
    if (getTick() > P.until) { e.reviewPush = null; return; }
    const r = e.radius ?? 0.4;
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
  }""")
# shooter map
rep("  // Hearty (S13 step 4)","""  events.on('enemy_fire', (ev) => st.shooter.set(ev.shot, ev.id));
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
  // Hearty (S13 step 4)""")
# quills cast records the cast
rep("""        for (const e of list) {
          hit(e, K.quills.dmg, { src: 'quills', kb: 0 });
          st.quilled.set(e.id, getTick() + sec(K.quills.secs));
        }""","""        const q = { hit: new Set(list.map((e) => e.id)) };
        for (const e of list) {
          st.quilled.set(e.id, getTick() + sec(K.quills.secs));
          st.quillCast.set(e.id, q);
          hit(e, K.quills.dmg, { src: 'quills', kb: 0 });
        }""")
# heavy slam: weight of stone + kick the stone
rep("""      for (const e of list) hit(e, K.slam.dmg + weight(K.slam.hp), { src: 'slam' });
      shakeStone(c.x, c.z, K.growlstone.comboR);""","""      const extra = Math.min(K.slamWeight, Math.round(dr() * 100));
      if (extra > 0) emit('review_sh_slamweight', { x: r2(c.x), z: r2(c.z), extra });
      for (const e of list) hit(e, K.slam.dmg + weight(K.slam.hp) + extra, { src: 'slam' });
      const g = st.growlstone;
      if (g && !g.roll && inFan(a, g, dir, K.slam.reach + 0.6, K.slam.half + 10)) {
        g.roll = { t: 0, x0: g.x, z0: g.z, dx: dir.x, dz: dir.z, got: new Set() };
        emit('review_sh_roll', { id: g.id, start: true, dx: r2(dir.x), dz: r2(dir.z) });
      } else shakeStone(c.x, c.z, K.growlstone.comboR);""")
# new casts
rep("    colossus: (a, dir, aim, at) => at((a) => {","""    stone_ring: (a, dir, aim, at) => at((a) => {
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
    colossus: (a, dir, aim, at) => at((a) => {""")
# step additions: before the thrown-up bodies block
rep("""    // thrown-up bodies""","""    // Slabguard's stopped shots fly back (1.3) is in the block loop; flying returns land here
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
      const T = st.thrown, K2 = K.throw, step = K2.speed / TICK;
      const tgt = T.back ? a : registry.byId(T.target);
      if (!T.back && (!tgt || !(tgt.hp > 0))) T.back = true;
      else {
        const dx = tgt.x - T.x, dz = tgt.z - T.z, l = Math.hypot(dx, dz);
        if (l <= step + 0.3) {
          if (T.back) {
            st.thrown = null;
            emit('review_sh_slabthrow', { on: false, caught: true, x: r2(a.x), z: r2(a.z) });
          } else {
            T.x = tgt.x; T.z = tgt.z;
            T.hit.add(tgt.id);
            T.n += 1;
            hit(tgt, K2.dmg + weight(K2.hp), { src: 'slabthrow', dirFrom: { x: T.x - dx, z: T.z - dz }, kb: 0.15 });
            taunt(tgt, K2.taunt);
            emit('review_sh_slabhit', { id: tgt.id, x: r2(T.x), z: r2(T.z), n: T.n });
            const nx = T.n <= K2.bounces ? hostiles().filter((e) => !T.hit.has(e.id) && d2(e, T) <= K2.hop ** 2).sort((p, q) => d2(p, T) - d2(q, T))[0] : null;
            if (nx) T.target = nx.id;
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
                taunt(f, C.taunt, { from: { x: cb.x, z: cb.z } });
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
    // thrown-up bodies""")
# shots fly back
rep("""          events.emit(tick, 'eshot_despawn', { id: p.id, cause: 'blocked' });
          registry.despawn(p.id);
          emit('review_sh_block', { x: r2(a.x + sl.dx * 0.7), z: r2(a.z + sl.dz * 0.7) });""","""          events.emit(tick, 'eshot_despawn', { id: p.id, cause: 'blocked' });
          registry.despawn(p.id);
          const bx = a.x + sl.dx * 0.7, bz = a.z + sl.dz * 0.7;
          emit('review_sh_block', { x: r2(bx), z: r2(bz) });
          const who = registry.byId(st.shooter.get(p.id));
          if (who && who.hp > 0) {
            const secs = Math.hypot(who.x - bx, who.z - bz) / 8;
            const dmg = (p.power || 10) * K.shotBack;
            emit('review_sh_shotback', { id: who.id, x: r2(bx), z: r2(bz), secs: r2(secs) });
            later(secs, () => { if (who.hp > 0) hit(who, dmg, { src: 'shot_back', dirFrom: { x: bx, z: bz }, kb: 0 }); });
          }""")
# reset
rep("st.fracture = false; st.cracks.clear(); st.slab = null; st.giant = null;","st.fracture = false; st.cracks.clear(); st.slab = null; st.giant = null; st.ringSt = null; st.thrown = null; st.grind = null; st.cubs = []; st.quillCast.clear();")

# ---- 1.4
rep("  slamWeight: 60,","  heart: { secs: 5, cap: 0.05 }, spin: { every: 5, gap: 1, r: 2, dmg: 14, hp: 0.03 },\n  btoss: { grab: 1.5, dist: 5, lift: 0.3, fly: 0.5, r: 1.5, dmg: 20, hp: 0.05, stun: 0.6 },\n  slamWeight: 60,")
rep("stone_cubs: ['castPlant', 0.46], fault_line:","stone_cubs: ['castPlant', 0.46], stoneheart: ['guard', 0.2], fault_line:")
rep("ringSt: null, thrown: null, grind: null, cubs: [],","ringSt: null, thrown: null, grind: null, cubs: [], heart: 0, spinOn: false, spinN: 0, spinAt: -1e9,")
rep("st.ringSt = null; st.thrown = null; st.grind = null; st.cubs = [];","st.ringSt = null; st.thrown = null; st.grind = null; st.cubs = []; st.heart = 0; st.spinOn = false; st.spinN = 0; st.spinAt = -1e9; st.btoss = null;")
rep("    cast: (id, aim = null) => st.queue.push(() => (id === 'fracture' ? CAST.fracture() : startCast(id, aim))),",
    "    cast: (id, aim = null) => st.queue.push(() => (id === 'fracture' ? CAST.fracture() : id === 'counter_spin' ? (st.spinOn = !st.spinOn) : startCast(id, aim))),")
# wrapper: stoneheart cap and counter spin count, placed before the Slabguard front check
rep("""    // Slabguard (S21): a hit from the slab's front is 40% smaller.""","""    // Counter Spin (S54): every 5th hit he takes, he spins (at most once a second).
    if (hostileHit && a && st.spinOn && target.id === a.id) {
      st.spinN += 1;
      emit('review_sh_spincount', { n: st.spinN % K.spin.every || K.spin.every });
      if (st.spinN >= K.spin.every && getTick() - st.spinAt >= sec(K.spin.gap)) {
        st.spinN = 0;
        st.spinAt = getTick();
        later(0.02, spin);
      }
    }
    // Slabguard (S21): a hit from the slab's front is 40% smaller.""")
rep("""    if (hostileHit && a && target.id === a.id) {
      // Grudge (S31)""","""    // Stoneheart (S53): reduced first, then no hit takes more than 5% of his max health.
    if (hostileHit && a && target.id === a.id && st.heart > getTick()) {
      const after = base * (a.takenMul ?? 1), cap = st.maxHp * K.heart.cap;
      if (after > cap) {
        emit('review_sh_capped', { thrown: Math.round(after), took: Math.round(cap * 10) / 10, x: r2(a.x), z: r2(a.z) });
        const r = raw(target, cap / (a.takenMul || 1), o);
        return r;
      }
    }
    if (hostileHit && a && target.id === a.id) {
      // Grudge (S31)""")
rep("    colossus: (a, dir, aim, at) => at((a) => {","""    stoneheart: (a, dir, aim, at) => at(() => {
      st.heart = getTick() + sec(K.heart.secs);
      emit('review_sh_heart', { on: true, secs: K.heart.secs });
    }),
    badger_toss: (a, dir, aim) => {
      const B = K.btoss;
      const foe = hostiles().filter((e) => d2(e, a) <= (B.grab + (e.radius ?? 0.4)) ** 2).sort((p, q) => d2(p, aim || a) - d2(q, aim || a))[0];
      if (!foe) return;
      play('grab', 0);
      if (isBig(foe)) { later(0.3, () => hit(foe, B.dmg + weight(B.hp), { src: 'btoss' })); return; }
      let dx = (aim ? aim.x : a.x + dir.x * B.dist) - a.x, dz = (aim ? aim.z : a.z + dir.z * B.dist) - a.z;
      const l = Math.hypot(dx, dz) || 1, d = Math.min(B.dist, l);
      let tx = a.x + (dx / l) * d, tz = a.z + (dz / l) * d, wall = null;
      const r = foe.radius ?? 0.4, mx = ARENA.halfW - r, mz = ARENA.halfD - r;
      if (Math.abs(tx) > mx) { wall = { x: Math.sign(tx) * ARENA.halfW, z: tz }; tx = Math.sign(tx) * mx; }
      if (Math.abs(tz) > mz) { wall = { x: tx, z: Math.sign(tz) * ARENA.halfD }; tz = Math.sign(tz) * mz; }
      S.apply(foe, 'stun', 1, sec(B.lift + B.fly + 0.1), getTick(), a.id);
      st.btoss = { id: foe.id, t: 0, x0: foe.x, z0: foe.z, hx: a.x + dir.x * 0.55, hz: a.z + dir.z * 0.55, tx, tz, wall, dx: dx / l, dz: dz / l };
      emit('review_sh_btoss', { id: foe.id, phase: 'grab' });
    },
    colossus: (a, dir, aim, at) => at((a) => {""")
rep("""    // the rolling Growlstone (Kick the stone)""","""    // Badger Toss: held up in front of him, then thrown along an arc
    if (st.btoss) {
      const T = st.btoss, B = K.btoss, e = registry.byId(T.id);
      T.t += 1 / TICK;
      if (!e || !(e.hp > 0)) st.btoss = null;
      else if (T.t < B.lift) {
        const u = T.t / B.lift;
        e.x = T.x0 + (T.hx - T.x0) * u; e.z = T.z0 + (T.hz - T.z0) * u;
        e.reviewY = 1.1 * Math.sin(u * Math.PI / 2);
      } else {
        const u = Math.min(1, (T.t - B.lift) / B.fly);
        e.x = T.hx + (T.tx - T.hx) * u; e.z = T.hz + (T.tz - T.hz) * u;
        e.reviewY = 1.1 * (1 - u) + 4 * 1.0 * u * (1 - u);
        if (u >= 1) {
          e.reviewY = 0;
          st.btoss = null;
          emit('review_sh_btoss', { id: e.id, phase: 'land', x: r2(e.x), z: r2(e.z), r: B.r });
          for (const f of hostiles()) if (d2(f, e) <= B.r ** 2) {
            hit(f, B.dmg + weight(B.hp), { src: 'btoss', dirFrom: e, kb: 0 });
            if (!isBig(f) && f.hp > 0) S.apply(f, 'stun', 1, sec(B.stun), tick, a.id);
          }
          if (T.wall && e.hp > 0) {
            emit('review_sh_wallslam', { id: e.id, x: r2(T.wall.x), z: r2(T.wall.z), ex: r2(e.x), ez: r2(e.z), dx: r2(T.dx), dz: r2(T.dz) });
            hit(e, K.wall.dmg + weight(K.wall.hp), { src: 'wall', kb: 0 });
            S.apply(e, 'stun', 1, sec(B.stun), tick, a.id);
          }
        }
      }
    }
    // the rolling Growlstone (Kick the stone)""")
# spin function next to shakeStone
rep("""  // A big blow near the Growlstone makes it roar at once, 1 u wider (S34).""","""  // Counter Spin (S54): a spin by himself, a skill hit of his
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
  // A big blow near the Growlstone makes it roar at once, 1 u wider (S34).""")
rep("""      if (A.t >= H + 0.45) st.act = null;""","""      if (A.t >= H + 0.45) st.act = null;""")

rep("    if (st.fracture && t.hp > 0) crack(","    if (st.fracture && t.hp > 0 && src !== 'cub') crack(")
s = "import { ARENA } from '../core/constants.js';\n" + s
open(p,'w').write(s)
print('ok')
