import sys
p='/home/user/echoes-three/src/sim/world.js'; t=open(p).read()
def rep(old, new, cnt=1):
    global t
    n = t.count(old)
    assert n == cnt, (n, old[:80])
    t = t.replace(old, new)

# U1: a seed sprouts by itself at 3 s old (was 1 s).
rep("seed: { heal: 11, life: 480, reach: 0.45, ripe: 60, wake: 4.0 },", "seed: { heal: 11, life: 480, reach: 0.45, ripe: 180, wake: 4.0 }, // kit 1.7 U1: sprouts by itself at 3 s")

# helpers after dropSeed
rep("""  const spitters = [];
  function sprout(sd) {""", """  // ---- REVIEW-ONLY: kit 1.7 (Kesh 11-16 22:56, "i like all", U1 to U7): each skill makes something
  // of a seed. Nearest seeds first; a used seed is gone (MOSSLIGHT_SKILL_KIT.md S56).
  const K7 = {
    gustTwins: 3, twinGap: 0.8, // U3
    puffSeeds: 3, puffMax: 4, // U4 a
    hedgeReach: 1.5, hedgeMax: 4, hedgeAdd: 1, // U4 b
    sapSeeds: 3, sapMax: 3, // U4 c
    leafReach: 1, leafMax: 2, leafAdd: 11, // U5 a
    flowerMax: 4, flowerR: 2, flowerHeal: 8, // U5 b
    mossReach: 1.5, mossMore: 3, // U5 c
    burstR: 1.5, burstDmg: 12, burstSlow: 0.3, burstTicks: 120, // U6
    swarmReach: 2, swarmMax: 2, // U7
  };
  function nearSeeds(x, z, r, n, test) {
    const d = (sd) => Math.hypot(sd.x - x, sd.z - z);
    const list = seeds.filter((sd) => !sd.rolling && d(sd) <= r && (!test || test(sd))).sort((a, b) => d(a) - d(b));
    return n == null ? list : list.slice(0, n);
  }
  function useSeed(sd, kind, to) {
    const j = seeds.indexOf(sd);
    if (j < 0) return false;
    seeds.splice(j, 1);
    events.emit(currentTick, 'review_seed_end', { id: sd.id, target: null, used: kind, ...(to ? { toX: r2(to.x), toZ: r2(to.z) } : {}) });
    return true;
  }
  const inArenaX = (x) => Math.max(-ARENA.halfW + 0.6, Math.min(ARENA.halfW - 0.6, x));
  const inArenaZ = (z) => Math.max(-ARENA.halfD + 0.6, Math.min(ARENA.halfD - 0.6, z));
  const spitters = [];
  function sprout(sd) {""")

# U5 b: Heartbloom opens seeds as healing flowers (replaces 1.5 R25 sprouting).
rep("""      sproutNear(b.t.x, b.t.z, K5.heartWake); // kit v1.5 R25: light wakes
""", """      for (const sd of nearSeeds(b.t.x, b.t.z, K5.heartWake, K7.flowerMax)) { // kit 1.7 U5 b: seeds open as flowers
        useSeed(sd, 'flower');
        const near = registry.all().filter((e) => e.partyIndex !== undefined && e.hp > 0 && Math.hypot(e.x - sd.x, e.z - sd.z) <= K7.flowerR);
        events.emit(currentTick, 'review_seed_flower', { x: r2(sd.x), z: r2(sd.z), r: K7.flowerR, to: near.map((e) => e.id) });
        for (const e of near) healLanded(e, K7.flowerHeal, { healer: player.id, source: 'nova_bloom:flower', critBonus: -1 });
      }
""")

# U3: the gust doubles the first three seeds it carries.
rep("""        if (g.d >= g.len) sd.rolling = 0;
      }
""", """        if (g.d >= g.len) sd.rolling = 0;
      }
      if (g.d >= g.len) { // kit 1.7 U3: each of the first three seeds it carries lands as two, 0.8 u apart
        let k = 0;
        for (const sd of g.rolled) {
          if (k >= K7.gustTwins) break;
          if (!seeds.includes(sd)) continue;
          k += 1;
          const ox = -g.dz * K7.twinGap / 2, oz = g.dx * K7.twinGap / 2;
          const fx = sd.x, fz = sd.z;
          sd.x = inArenaX(fx - ox); sd.z = inArenaZ(fz - oz);
          events.emit(currentTick, 'review_seed_move', { id: sd.id, x: r2(sd.x), z: r2(sd.z) });
          const tw = { id: ++kitIds, x: inArenaX(fx + ox), z: inArenaZ(fz + oz), born: sd.born, until: sd.until };
          seeds.push(tw);
          events.emit(currentTick, 'review_seed_split', { x: r2(fx), z: r2(fz) });
          events.emit(currentTick, 'review_seed', { id: tw.id, x: r2(tw.x), z: r2(tw.z), secs: (tw.until - currentTick) / 60, fromX: r2(fx), fromZ: r2(fz), low: true });
        }
      }
""")

# U7: the swarm eats a seed at a stop for one more stop.
rep("""            events.emit(currentTick, 'review_swarm_stay', { id: w.id, target: t.id, foe: w.foe });
""", """            events.emit(currentTick, 'review_swarm_stay', { id: w.id, target: t.id, foe: w.foe });
            if ((w.extra || 0) < K7.swarmMax) { // kit 1.7 U7: one seed within 2 u of the stop, one more stop
              const sd = nearSeeds(t.x, t.z, K7.swarmReach, 1)[0];
              if (sd) { useSeed(sd, 'swarm', t); w.stops += 1; w.extra = (w.extra || 0) + 1; events.emit(currentTick, 'review_swarm_seed', { id: w.id, target: t.id }); }
            }
""")

# U6: Rootspear bursts each seed in its row, then it sprouts.
rep("""        seeds.splice(j, 1);
        events.emit(currentTick, 'review_seed_end', { id: sd.id, target: null, sprout: true });
        sprout(sd);
      }
      if (sprouty('pale_lance'))""", """        seeds.splice(j, 1);
        events.emit(currentTick, 'review_seed_end', { id: sd.id, target: null, sprout: true });
        events.emit(currentTick, 'review_seed_burst', { x: r2(sd.x), z: r2(sd.z), r: K7.burstR }); // kit 1.7 U6: a ring of roots
        for (const e of foesIn(sd.x, sd.z, K7.burstR)) {
          hit(e, K7.burstDmg, 'pale_lance:seed');
          if (!bossy(e) && e.hp > 0) combat.status.apply(e, 'slow', K7.burstSlow, K7.burstTicks, currentTick, player.id);
        }
        sprout(sd);
      }
      if (sprouty('pale_lance'))""")

# U4 a: seeds near a planted Puffcap grow into Puffcaps too.
rep("""    events.emit(currentTick, 'review_puff', { id: pf.id, x: r2(pf.x), z: r2(pf.z), fromX: r2(player.x), fromZ: r2(player.z) });
  }""", """    events.emit(currentTick, 'review_puff', { id: pf.id, x: r2(pf.x), z: r2(pf.z), fromX: r2(player.x), fromZ: r2(player.z) });
    for (const sd of nearSeeds(a.x, a.z, K7.puffSeeds)) { // kit 1.7 U4 a: up to 4 waiting when they come from seeds
      if (puffs.length >= K7.puffMax) break;
      useSeed(sd, 'puff');
      const p2 = { id: ++kitIds, x: sd.x, z: sd.z, until: currentTick + K3.puff.wait, power, r: def.area, seed: true };
      puffs.push(p2);
      events.emit(currentTick, 'review_puff', { id: p2.id, x: r2(p2.x), z: r2(p2.z), fromX: r2(sd.x), fromZ: r2(sd.z), seed: true });
    }
  }""")

# U4 c: the Mending Sapling draws in seeds within 3 u, up to 3, 2 s each.
rep("""        saplings.push(sp);
        events.emit(currentTick, 'review_sapling', { id: sp.id, x: r2(sp.x), z: r2(sp.z), reach: sp.reach, secs: def.durationSec });""", """        saplings.push(sp);
        const fed = nearSeeds(sp.x, sp.z, K7.sapSeeds, K7.sapMax); // kit 1.7 U4 c: each seed is 2 s more, one more blossom
        for (const sd of fed) { useSeed(sd, 'sapling', sp); sp.until += KIT.sapling.every; }
        events.emit(currentTick, 'review_sapling', { id: sp.id, x: r2(sp.x), z: r2(sp.z), reach: sp.reach, secs: def.durationSec + (fed.length * KIT.sapling.every) / 60, fed: fed.length });""")

# U4 b: seeds near the hedge's line make it 1 u wider each, up to 4.
rep("""    const h = { id: ++kitIds, x: a.x, z: a.z, nx: a.dx, nz: a.dz, ax: -a.dz, az: a.dx, w: def.area, until: currentTick + K5.hedge.ticks, up: currentTick + K5.hedge.grow, side: new Map(), next: new Map(), wetUntil: 0, power };
    hedges.push(h);""", """    const h = { id: ++kitIds, x: a.x, z: a.z, nx: a.dx, nz: a.dz, ax: -a.dz, az: a.dx, w: def.area, until: currentTick + K5.hedge.ticks, up: currentTick + K5.hedge.grow, side: new Map(), next: new Map(), wetUntil: 0, power };
    { // kit 1.7 U4 b: each seed within 1.5 u of its line is used up and makes it 1 u wider, half at each end
      const lineD = (sd) => segDist(sd.x, sd.z, h.x - h.ax * h.w / 2, h.z - h.az * h.w / 2, h.x + h.ax * h.w / 2, h.z + h.az * h.w / 2);
      const fed = seeds.filter((sd) => !sd.rolling && lineD(sd) <= K7.hedgeReach).sort((p, q) => lineD(p) - lineD(q)).slice(0, K7.hedgeMax);
      for (const sd of fed) {
        const along = Math.max(-h.w / 2, Math.min(h.w / 2, (sd.x - h.x) * h.ax + (sd.z - h.z) * h.az));
        useSeed(sd, 'hedge', { x: h.x + h.ax * along, z: h.z + h.az * along });
      }
      h.w += fed.length * K7.hedgeAdd;
    }
    hedges.push(h);""")

# U5 a: Swiftleaf picks seeds up, out and back; U5 c: Mossgrowth eats one.
rep("""      if (o.source === 'swift_mend' && t !== player) leafBack(t, base); // kit v1.5 R27: the leaf comes back
      if (o.source === 'swift_mend' && hasMoss(t)) base *= KIT.swiftBonus;""", """      let leafSeeds = 0;
      if (o.source === 'swift_mend') { // kit 1.7 U5 a: seeds within 1 u of its flight, up to 2 a cast, 11 each
        for (const sd of nearSeeds(player.x, player.z, 99, K7.leafMax, (q) => segDist(q.x, q.z, player.x, player.z, t.x, t.z) <= K7.leafReach)) { useSeed(sd, 'leaf', t); leafSeeds += 1; }
      }
      if (o.source === 'swift_mend' && t !== player) leafBack(t, base, leafSeeds); // kit v1.5 R27: the leaf comes back
      if (o.source === 'swift_mend' && hasMoss(t)) base *= KIT.swiftBonus;
      if (leafSeeds) base += K7.leafAdd * leafSeeds; // the Moss bonus does not raise it""")
rep("""      const mossN = KIT.moss[o.source];
      if (mossN) {
        const total = base * (hasTalent('regrowth') ? HV.worth + (hasTalent('deep_roots') ? HV.roots : 0) : 1);""", """      let mossN = KIT.moss[o.source];
      let mossMul = 1;
      if (mossN && o.source === 'kindred_shield') { // kit 1.7 U5 c: eats one seed within 1.5 u, Moss 3 s longer
        const sd = nearSeeds(t.x, t.z, K7.mossReach, 1)[0];
        if (sd) { useSeed(sd, 'moss', t); mossMul = (mossN + K7.mossMore) / mossN; mossN += K7.mossMore; }
      }
      if (mossN) {
        const total = mossMul * base * (hasTalent('regrowth') ? HV.worth + (hasTalent('deep_roots') ? HV.roots : 0) : 1);""")
rep("""  function leafBack(t, base) {
    const wait = backs.find((b) => b.state === 'wait');
    if (wait) { wait.x = t.x; wait.z = t.z; wait.at = currentTick + K5.back.delay; wait.not.add(t.id); return; }
    backs.push({ id: ++kitIds, state: 'wait', x: t.x, z: t.z, at: currentTick + K5.back.delay, base, not: new Set([t.id]), via: null });""", """  function leafBack(t, base, used = 0) {
    const wait = backs.find((b) => b.state === 'wait');
    if (wait) { wait.x = t.x; wait.z = t.z; wait.at = currentTick + K5.back.delay; wait.not.add(t.id); return; }
    backs.push({ id: ++kitIds, state: 'wait', x: t.x, z: t.z, at: currentTick + K5.back.delay, base, not: new Set([t.id]), via: null, seedsLeft: K7.leafMax - used, bonus: 0 });""")
rep("""      if (d > K5.back.speed + 0.25) { b.x += (dx / d) * K5.back.speed; b.z += (dz / d) * K5.back.speed; continue; }
      if (b.via != null) {
        const amt = Math.floor(b.base * K5.back.half * (hasMoss(t) ? KIT.swiftBonus : 1));""", """      if (b.via != null && b.seedsLeft > 0) { // kit 1.7 U5 a: on the way back, only with an ally to heal
        for (const sd of nearSeeds(b.x, b.z, K7.leafReach, b.seedsLeft)) { useSeed(sd, 'leaf', b); b.seedsLeft -= 1; b.bonus += K7.leafAdd; }
      }
      if (d > K5.back.speed + 0.25) { b.x += (dx / d) * K5.back.speed; b.z += (dz / d) * K5.back.speed; continue; }
      if (b.via != null) {
        const amt = Math.floor(b.base * K5.back.half * (hasMoss(t) ? KIT.swiftBonus : 1)) + b.bonus;
        b.bonus = 0;""")
open(p,'w').write(t)
print('sim17 ok')
