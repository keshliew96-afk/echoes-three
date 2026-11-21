  // ---- REVIEW-ONLY: kit 2.0 (Kesh 11-18 02:06 and 02:19 SGT, "1b, 2a, 3a, 4a"; MOSSLIGHT_KIT_2.0_CHANGES.md
  // K1 to K14, MOSSLIGHT_TALENT_PATHS.md 3.1 section 5, rows L1 to L29). Every skill has three parts: a heal,
  // something that lasts, and damage. The 44 new parts are small; the old rules stay as they were.
  const K20 = {
    blossom: { heal: 5, reach: 6, speed: 9 / 60 }, // T9
    sprig: { total: 12, n: 4 }, // T9: Moss, 3 a second for 4 s
    thorns: { per: 3, n: 4 }, // T9: 3 a second for 4 s, one from each skill
    razor: { half: 0.5, dmg: 8 }, // L1 (K6: the path is 1 u wide for foes)
    seedBolt: { dmg: 10, slow: 0.3, ticks: 120 }, // L2
    lane: { ticks: 180, heal: 3 }, laneDmg: 10, // L3
    petal: { dmg: 14, r: 3 }, // L4
    gust: { dmg: 12, slam: 10 }, // L5
    nectarWisp: { n: 3, gap: 12, dmg: 6 }, // L6 (K6: 0.2 s apart, 0.9 u each)
    moss: { haste: 0.15, thorn: 6, gap: 60 }, // L7
    swarmSlow: 0.2, // L8
    dew: { cling: 120, thorn: 5, reach: 4, every: 60 }, // L9
    sap: { slow: 0.25, r: 2, thorn: 6, reach: 4 }, // L10 (thorn reach: a Spitter's 4 u, my guess)
    wispFire: { dmg: 8, reach: 4 }, // L11
    acorn: { dmg: 8, r: 1 }, // L12 (K6: an acorn bursts in 1 u)
    rain: { slow: 0.2, dmg: 3 }, // L13
    choke: { per: 3, n: 6, reach: 3 }, // L14
    spirit: { every: 180, heal: 4, keep: 120, acornEvery: 120, acorn: 6 }, // L15
    gale: { haste: 0.2, hasteTicks: 180, slow: 0.3, slowTicks: 120, blade: 8, speed: 10 / 60 }, // L16
    spearBlossoms: 4, // L18
    storm: { first: 30, every: 60, n: 5, heal: 6, slow: 0.2, slowTicks: 90 }, // L19
    circle: 4, // L20, L21
    vine: 0.3, // L22
    ling: 3, // L23
    fruit: 20, // L24
    pollenBurst: { dmg: 12, r: 2 }, // L25
    rest: 12, dream: 4, // L26
    gemMote: { heal: 3, reach: 4, every: 60, speed: 8 / 60 }, basicThorns: { per: 2, n: 3 }, // L27
    dash: { ally: 5, allyR: 2, burst: 6, burstR: 0.55, haste: 0.2, hasteTicks: 120 }, // L28
  };
  const k20 = { dots: new Map(), flyers: [], later: [], slams: [], lanes: [], dust: new Map() };
  globalThis.__reviewK20 = k20;
  if (REVIEW_COMBO) events.on('enemy_fire', (ev) => { const sh = ev.shot != null ? registry.byId(ev.shot) : null; if (sh) sh.reviewFrom = ev.id; }); // L7, L16: a shot knows its shooter
  function later(ticks, fn) { k20.later.push({ at: currentTick + ticks, fn }); }
  // T9 Thorns and the other damage over time: one from each source on a foe; a new cast restarts it.
  function dot(e, src, per, n) {
    if (!foeOk(e)) return;
    k20.dots.set(`${e.id}|${src}`, { e, src, per, left: n, next: currentTick + 60 });
    events.emit(currentTick, 'review_k20_status', { target: e.id, kind: src === 'choke' ? 'choke' : 'thorns', secs: n });
  }
  // T9 Sprig: Moss, 3 a second for 4 s.
  function sprig(t) {
    if (!t || !(t.hp > 0) || t.partyIndex === undefined) return;
    const key = `${t.id}|sprig`;
    const h = addHot(t, key, 'sprig', player.id, K20.sprig.total, K20.sprig.n, K20.sprig.n);
    hotTick(h, key);
  }
  // Things that fly to a target: blossoms, motes, blades. A heal on an ally or a hit on a foe on arrival.
  function fly(kind, x, z, t, foe, power, src, speed) {
    const f = { id: ++kitIds, kind, x, z, t, foe, power, src, speed };
    k20.flyers.push(f);
    events.emit(currentTick, 'review_k20_fly', { id: f.id, kind, x: r2(x), z: r2(z), target: t.id, foe });
    return f;
  }
  // T9 Blossom: a heal of 5 that flies to the most hurt ally within 6 u.
  function blossom(x, z, src) {
    const t = hurtNear(x, z, K20.blossom.reach, true);
    if (!t) return false;
    fly('blossom', x, z, t, false, K20.blossom.heal, src, K20.blossom.speed);
    return true;
  }
  // Thorns and acorns fly like a Spitter's thorn (an instant hit; the look flies). An acorn bursts in 1 u.
  function shoot(kind, x, z, f, dmg, src, h = 0.5) {
    events.emit(currentTick, 'review_k20_shot', { kind, x: r2(x), z: r2(z), h, target: f.id, tx: r2(f.x), tz: r2(f.z) });
    hit(f, dmg, src);
  }
  function acorn(x, z, f, dmg, src, h) {
    events.emit(currentTick, 'review_k20_shot', { kind: 'acorn', x: r2(x), z: r2(z), h, target: f.id, tx: r2(f.x), tz: r2(f.z), r: K20.acorn.r });
    for (const e of foesIn(f.x, f.z, K20.acorn.r)) hit(e, dmg, src);
  }
  function circleHeal(x, z, r, src) {
    for (const e of party()) if (Math.hypot(e.x - x, e.z - z) <= r + (e.radius || 0.3)) { healLanded(e, K20.circle, { healer: player.id, source: src, critBonus: -1 }); events.emit(currentTick, 'review_k20_heal', { kind: 'circle', target: e.id }); }
  }
  // L14: each creep chokes the nearest foe within 3 u of the ally it reached, once a cast.
  function choke(t, c) {
    const f = nearestFoe(t.x, t.z, K20.choke.reach, c.choked);
    if (!f) return;
    c.choked.add(f.id);
    events.emit(currentTick, 'review_k20_choke', { from: t.id, target: f.id });
    dot(f, 'choke', K20.choke.per, K20.choke.n);
  }
  // After every hit: L7 thorn moss, L25 a dusted foe that falls bursts, L27 her own bolts leave thorns.
  function k20AfterHit(t, o, r) {
    if (!t || !r || !(r.amount > 0)) return;
    if (t.partyIndex !== undefined) {
      const from = o.attacker != null ? o.attacker : o.reviewFrom;
      const a = from != null ? registry.byId(from) : null;
      if (foeOk(a) && hots.has(`${t.id}|kindred_shield`) && (t.reviewThornNext ?? 0) <= currentTick) {
        t.reviewThornNext = currentTick + K20.moss.gap;
        events.emit(currentTick, 'review_k20_hit', { kind: 'thornmoss', x: r2(a.x), z: r2(a.z), r: 0.5, from: t.id });
        hit(a, K20.moss.thorn, 'kindred_shield:thorn');
      }
      return;
    }
    if (o.delivery === 'basic' && !o.reviewGem && t.hp > 0) dot(t, 'basic', K20.basicThorns.per, K20.basicThorns.n);
  }
  function pollenBurst(x, z) {
    events.emit(currentTick, 'review_k20_hit', { kind: 'pollen', x: r2(x), z: r2(z), r: K20.pollenBurst.r });
    for (const e of foesIn(x, z, K20.pollenBurst.r)) hit(e, K20.pollenBurst.dmg, 'pollen_mark:burst');
  }
  function k20Tick() {
    for (let i = k20.later.length - 1; i >= 0; i--) if (currentTick >= k20.later[i].at) k20.later.splice(i, 1)[0].fn();
    // damage over time
    for (const [key, d] of k20.dots) {
      if (!(d.e.hp > 0)) { k20.dots.delete(key); continue; }
      if (currentTick < d.next) continue;
      d.next += 60;
      d.left -= 1;
      if (d.left <= 0) k20.dots.delete(key);
      hit(d.e, d.per, `thorns:${d.src}`);
    }
    // flyers
    for (let i = k20.flyers.length - 1; i >= 0; i--) {
      const f = k20.flyers[i];
      if (!(f.t.hp > 0)) { k20.flyers.splice(i, 1); events.emit(currentTick, 'review_k20_fly_end', { id: f.id }); continue; }
      const dx = f.t.x - f.x, dz = f.t.z - f.z, d = Math.hypot(dx, dz);
      if (d > f.speed + 0.2) { f.x += (dx / d) * f.speed; f.z += (dz / d) * f.speed; continue; }
      k20.flyers.splice(i, 1);
      events.emit(currentTick, 'review_k20_fly_end', { id: f.id, target: f.t.id, landed: true });
      if (f.foe) hit(f.t, f.power, f.src);
      else healLanded(f.t, f.power, { healer: player.id, source: f.src, critBonus: -1 });
    }
    // L1 razor leaf (out on the leaf, back on its way home) and L2 the Seed Bolt pierces and tangles
    for (const b of registry.all()) {
      if (!b.heal || (b.skill !== 'swift_mend' && b.skill !== 'mending_bolt')) continue;
      b.reviewCut ||= new Set();
      for (const e of foesIn(b.x, b.z, b.skill === 'swift_mend' ? K20.razor.half : (b.radius || 0.25))) {
        if (b.reviewCut.has(e.id)) continue;
        b.reviewCut.add(e.id);
        if (b.skill === 'swift_mend') { events.emit(currentTick, 'review_k20_hit', { kind: 'razor', x: r2(e.x), z: r2(e.z), r: 0.4 }); hit(e, K20.razor.dmg, 'swift_mend:razor'); continue; }
        events.emit(currentTick, 'review_k20_hit', { kind: 'pierce', x: r2(e.x), z: r2(e.z), r: 0.4 });
        hit(e, K20.seedBolt.dmg, 'mending_bolt:pierce');
        if (e.hp > 0 && !bossy(e)) { combat.status.apply(e, 'slow', K20.seedBolt.slow, K20.seedBolt.ticks, currentTick, player.id); events.emit(currentTick, 'review_k20_status', { target: e.id, kind: 'tangle', secs: K20.seedBolt.ticks / 60 }); }
      }
    }
    for (const b of backs) {
      if (b.state !== 'fly') continue;
      b.cut ||= new Set();
      for (const e of foesIn(b.x, b.z, K20.razor.half)) {
        if (b.cut.has(e.id)) continue;
        b.cut.add(e.id);
        events.emit(currentTick, 'review_k20_hit', { kind: 'razor', x: r2(e.x), z: r2(e.z), r: 0.4 });
        hit(e, K20.razor.dmg, 'swift_mend:razor');
      }
    }
    // L3 the wet lane
    for (let i = k20.lanes.length - 1; i >= 0; i--) {
      const ln = k20.lanes[i];
      if (currentTick >= ln.until) { k20.lanes.splice(i, 1); events.emit(currentTick, 'review_k20_lane_end', { id: ln.id }); continue; }
      if (currentTick < ln.next) continue;
      ln.next += 60;
      for (const e of party()) if (e !== player && inRect(e, ln.x, ln.z, ln.dx, ln.dz, ln.len, ln.width)) { healLanded(e, K20.lane.heal, { healer: player.id, source: 'mending_tide:wet', critBonus: -1 }); events.emit(currentTick, 'review_k20_heal', { kind: 'wet', target: e.id }); }
    }
    // L5 a pushed foe that stops against a wall or another foe takes 10 more
    for (let i = k20.slams.length - 1; i >= 0; i--) {
      const sl = k20.slams[i], e = sl.e, r = e.radius || 0.3;
      if (currentTick > sl.until || !(e.hp > 0)) { k20.slams.splice(i, 1); continue; }
      let at = null;
      if (e.x <= -ARENA.halfW + r + 0.08 || e.x >= ARENA.halfW - r - 0.08 || e.z <= -ARENA.halfD + r + 0.08 || e.z >= ARENA.halfD - r - 0.08) at = { x: e.x + sl.dx * r, z: e.z + sl.dz * r };
      if (!at) for (const o of registry.all()) {
        if (o === e || !foeOk(o)) continue;
        const ox = o.x - e.x, oz = o.z - e.z, d = Math.hypot(ox, oz);
        if (d <= r + (o.radius || 0.3) + 0.1 && ox * sl.dx + oz * sl.dz > 0) { at = { x: (e.x + o.x) / 2, z: (e.z + o.z) / 2 }; break; }
      }
      if (!at) continue;
      k20.slams.splice(i, 1);
      events.emit(currentTick, 'review_k20_hit', { kind: 'slam', x: r2(at.x), z: r2(at.z), r: 0.6 });
      hit(e, K20.gust.slam, 'hearthsong:slam');
    }
    // L7 Mossgrowth: 15% faster while the Moss is on
    for (const [key, h] of hots) if (h.skill === 'kindred_shield' && h.t.hp > 0 && key === `${h.t.id}|kindred_shield`) combat.status.apply(h.t, 'haste', K20.moss.haste, 12, currentTick, player.id);
    // L9 Dewfall: the bed shoots a thorn a second; it clings 2 s after an ally steps out
    for (const [, zn] of dewZones) {
      if (zn.shotNext == null) zn.shotNext = currentTick + K20.dew.every;
      if (currentTick < zn.shotNext) continue;
      const f = nearestFoe(zn.x, zn.z, K20.dew.reach);
      if (!f) continue;
      zn.shotNext = currentTick + K20.dew.every;
      shoot('thorn', zn.x, zn.z, f, K20.dew.thorn, 'dewfall:thorn', 0.4);
    }
    for (const e of party()) {
      const inside = [...dewZones.values()].some((zn) => Math.hypot(e.x - zn.x, e.z - zn.z) <= zn.r);
      if (inside) { e.reviewDewIn = currentTick; e.reviewClingNext = currentTick + 60; continue; }
      if (e.reviewDewIn == null || currentTick - e.reviewDewIn > K20.dew.cling || currentTick < e.reviewClingNext) continue;
      e.reviewClingNext += 60;
      healLanded(e, SKILLS_REF.dewfall ? SKILLS_REF.dewfall.power : 7, { healer: player.id, source: 'dewfall:cling', critBonus: -1 });
      events.emit(currentTick, 'review_k20_heal', { kind: 'cling', target: e.id });
    }
    // L25 the pollen bursts when it ends or its foe falls
    for (const e of registry.all()) if (foeOk(e) && e.reviewDustUntil > currentTick) k20.dust.set(e.id, { e, x: e.x, z: e.z });
    for (const [id, d] of k20.dust) {
      if (d.e.hp > 0 && d.e.reviewDustUntil > currentTick) { d.x = d.e.x; d.z = d.e.z; continue; }
      k20.dust.delete(id);
      pollenBurst(d.x, d.z);
    }
    // L26 nightmares: sleepers take 4 a second and stay asleep
    for (const e of k8.sleepers) {
      if (!(e.hp > 0) || !(e.reviewSleepUntil > currentTick) || e.reviewSleepStart == null) continue;
      const age = currentTick - e.reviewSleepStart;
      if (age > 0 && age % 60 === 0) { events.emit(currentTick, 'review_k20_hit', { kind: 'dream', x: r2(e.x), z: r2(e.z), r: 0.5 }); hit(e, K20.dream, 'drowsy_spores:dream'); }
    }
    // L28 the thorn burst: 6 to foes she dashes through (only on a dash whose heal is ready)
    if (player.dashTicksLeft > 0 && cb.dashArmed && cb.dashCut) for (const e of foesIn(player.x, player.z, K20.dash.burstR)) {
      if (cb.dashCut.has(e.id)) continue;
      cb.dashCut.add(e.id);
      events.emit(currentTick, 'review_k20_hit', { kind: 'dash', x: r2(e.x), z: r2(e.z), r: 0.5 });
      hit(e, K20.dash.burst, 'review_dash:thorn');
    }
  }
