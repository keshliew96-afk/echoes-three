"""REVIEW-ONLY: kit 2.0 for Mosslight (MOSSLIGHT_KIT_2.0_CHANGES.md K1-K14, talent doc section 5 L1-L29).
Applies the 44 new parts to src/sim/world.js of the review build. usage: python3 patch_sim.py <world.js>"""
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
if 'kit 2.0 (Kesh 11-18' in s:
    sys.exit('already patched')

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, f'anchor found {n} times, want {count}: {old[:90]!r}'
    s = s.replace(old, new)

# --- enemy shots remember their shooter (L7 thorn moss, L16 blades back)
rep("    const { power, delivery, reviewGem } = bolt;",
    "    const { power, delivery, reviewGem, reviewFrom } = bolt; // REVIEW-ONLY kit 2.0: reviewFrom = an enemy shot's shooter")
rep("        else combat.applyDamage(t, power, { delivery, shape: 'projectile', dirX, dirZ, ...(reviewGem ? { reviewGem } : {}) });",
    "        else combat.applyDamage(t, power, { delivery, shape: 'projectile', dirX, dirZ, ...(reviewGem ? { reviewGem } : {}), ...(reviewFrom != null ? { reviewFrom } : {}) });")

# --- L1 Swiftleaf: a sprig on the ally it heals
rep("      if (o.source === 'swift_mend' && t !== player) leafBack(t, base, leafSeeds); // kit v1.5 R27: the leaf comes back\n",
    "      if (o.source === 'swift_mend' && t !== player) leafBack(t, base, leafSeeds); // kit v1.5 R27: the leaf comes back\n"
    "      if (o.source === 'swift_mend') sprig(t); // kit 2.0 L1\n")

# --- damage wrapper: L7 thorn moss, L27 her bolts leave thorns
rep("      k8AfterHit(t, o, r); // kit 1.9: Pollen Mark, Drowsy Spores\n",
    "      k8AfterHit(t, o, r); // kit 1.9: Pollen Mark, Drowsy Spores\n"
    "      k20AfterHit(t, o, r); // kit 2.0: thorn moss (L7), her bolts' thorns (L27)\n")

# --- L4 Heartbloom: petal blades on the bloom
rep("      events.emit(currentTick, 'review_heart_bloom', { id: b.id, target: b.t.id, to: to.map((e) => e.id), early });\n",
    "      events.emit(currentTick, 'review_heart_bloom', { id: b.id, target: b.t.id, to: to.map((e) => e.id), early });\n"
    "      { const cut = foesIn(b.t.x, b.t.z, K20.petal.r); events.emit(currentTick, 'review_k20_hit', { kind: 'petal', x: r2(b.t.x), z: r2(b.t.z), r: K20.petal.r, n: cut.length }); for (const e of cut) hit(e, K20.petal.dmg, 'nova_bloom:petal'); } // kit 2.0 L4\n")

# --- L5 Pollen Gust: it hits for 12; a foe blown into a wall or a foe takes 10 more
rep("          if (bossy(e)) continue;\n          if (g.pollen && !(e.reviewDustUntil > currentTick))",
    "          hit(e, K20.gust.dmg, 'hearthsong:hit'); // kit 2.0 L5\n"
    "          if (!(e.hp > 0)) continue;\n"
    "          if (bossy(e)) continue;\n"
    "          k20.slams.push({ e, dx: g.dx, dz: g.dz, until: currentTick + K3.gust.pushTicks + 3 }); // kit 2.0 L5: the wall slam\n"
    "          if (g.pollen && !(e.reviewDustUntil > currentTick))")

# --- L8 Firefly Swarm: stung foes are slowed 20%
rep("          if (w.foe && currentTick >= w.next && currentTick < w.until) { w.next = currentTick + 60; hit(t, w.power, 'lantern_ward'); }",
    "          if (w.foe && currentTick >= w.next && currentTick < w.until) { w.next = currentTick + 60; hit(t, w.power, 'lantern_ward'); if (t.hp > 0 && !bossy(t)) { combat.status.apply(t, 'slow', K20.swarmSlow, 70, currentTick, player.id); events.emit(currentTick, 'review_k20_status', { target: t.id, kind: 'slow', secs: 1.2 }); } } // kit 2.0 L8")

# --- L18 Rootspear: a blossom from each foe hit (up to 4), and thorns
rep("      for (const e of registry.all()) if (foeOk(e) && inRect(e, sp.x, sp.z, sp.dx, sp.dz, sp.len, sp.width)) hit(e, sp.power, 'pale_lance');",
    "      { let bl = 0; for (const e of registry.all()) if (foeOk(e) && inRect(e, sp.x, sp.z, sp.dx, sp.dz, sp.len, sp.width)) { const fx = e.x, fz = e.z; hit(e, sp.power, 'pale_lance'); if (bl < K20.spearBlossoms && blossom(fx, fz, 'pale_lance:blossom')) bl += 1; if (e.hp > 0) dot(e, 'rootspear', K20.thorns.per, K20.thorns.n); } } // kit 2.0 L18")

# --- L19 Wispfall: healing wisps on the most hurt ally; dives slow
rep("    const f = { id: ++kitIds, until: currentTick + K3.fall.ticks, next: currentTick + 6, last: null, power, reach: def.area };",
    "    const f = { id: ++kitIds, until: currentTick + K3.fall.ticks, next: currentTick + 6, last: null, power, reach: def.area, healNext: currentTick + K20.storm.first, heals: 0 }; // kit 2.0 L19")
rep("      if (currentTick < f.next) continue;\n      f.next = currentTick + K3.fall.every;",
    "      if (currentTick >= f.healNext && f.heals < K20.storm.n) { // kit 2.0 L19: a healing wisp falls on the most hurt ally each second\n"
    "        f.healNext += K20.storm.every; f.heals += 1;\n"
    "        const m = hurtNear(player.x, player.z, K20.blossom.reach, true);\n"
    "        if (m) { events.emit(currentTick, 'review_k20_fallheal', { target: m.id, x: r2(m.x), z: r2(m.z), secs: K3.fall.delay / 60 }); later(K3.fall.delay, () => { if (m.hp > 0) healLanded(m, K20.storm.heal, { healer: player.id, source: 'bell_toll:heal', critBonus: -1 }); }); }\n"
    "      }\n"
    "      if (currentTick < f.next) continue;\n      f.next = currentTick + K3.fall.every;")
rep("      dives.push({ x: t.x, z: t.z, at: currentTick + K3.fall.delay, power: f.power });",
    "      dives.push({ x: t.x, z: t.z, at: currentTick + K3.fall.delay, power: f.power, storm: true });")
rep("      for (const e of foesIn(d.x, d.z, K3.fall.splash)) hit(e, d.power, 'bell_toll');\n      sproutNear(d.x, d.z, K3.fall.splash); // kit v1.5 R26: light wakes",
    "      for (const e of foesIn(d.x, d.z, K3.fall.splash)) { hit(e, d.power, d.src || 'bell_toll'); if (d.storm && e.hp > 0 && !bossy(e)) { combat.status.apply(e, 'slow', K20.storm.slow, K20.storm.slowTicks, currentTick, player.id); events.emit(currentTick, 'review_k20_status', { target: e.id, kind: 'slow', secs: K20.storm.slowTicks / 60 }); } } // kit 2.0 L19: a dive slows\n"
    "      if (d.storm) sproutNear(d.x, d.z, K3.fall.splash); // kit v1.5 R26: light wakes")

# --- L20 Rootsnare: allies in the circle heal 4 a second
rep("      if (currentTick >= sn.next) { sn.next = currentTick + 60; for (const e of inside) hit(e, sn.power, 'rootsnare'); }",
    "      if (currentTick >= sn.next) { sn.next = currentTick + 60; for (const e of inside) hit(e, sn.power, 'rootsnare'); circleHeal(sn.x, sn.z, sn.r, 'rootsnare:heal'); } // kit 2.0 L20")

# --- L21 Puffcap: allies in the cloud heal 4 a second
rep("      c.next = currentTick + 60;\n      for (const e of foesIn(c.x, c.z, c.r)) {\n        combat.status.apply(e, 'exposed', K3.puff.exposed, 70, currentTick, player.id);",
    "      c.next = currentTick + 60;\n      circleHeal(c.x, c.z, c.r, 'dawn_brand:heal'); // kit 2.0 L21\n      for (const e of foesIn(c.x, c.z, c.r)) {\n        combat.status.apply(e, 'exposed', K3.puff.exposed, 70, currentTick, player.id);")

# --- L3 Dew Wave: the lane stays wet 3 s; foes in the lane take 10
rep("        waterWhere((q) => inRect({ x: q.x, z: q.z, radius: 0.15 }, player.x, player.z, dx, dz, def.range, def.area)); // R11: water grows\n",
    "        waterWhere((q) => inRect({ x: q.x, z: q.z, radius: 0.15 }, player.x, player.z, dx, dz, def.range, def.area)); // R11: water grows\n"
    "        { // kit 2.0 L3\n"
    "          const ln = { id: ++kitIds, x: player.x, z: player.z, dx, dz, len: def.range, width: def.area, until: currentTick + K20.lane.ticks, next: currentTick + 60 };\n"
    "          k20.lanes.push(ln);\n"
    "          events.emit(currentTick, 'review_k20_lane', { id: ln.id, x: r2(ln.x), z: r2(ln.z), dx: r2(dx), dz: r2(dz), len: ln.len, width: ln.width, secs: K20.lane.ticks / 60 });\n"
    "          for (const e of registry.all()) if (foeOk(e) && inRect(e, player.x, player.z, dx, dz, def.range, def.area)) hit(e, K20.laneDmg, 'mending_tide:hit');\n"
    "        }\n")

# --- L12 Elder Oak: acorns fall on a foe under the crown
rep("        for (const e of allies) healLanded(e, o.power, { healer: player.id, source: 'guardian_bond' });\n",
    "        for (const e of allies) healLanded(e, o.power, { healer: player.id, source: 'guardian_bond' });\n"
    "        { const under = foesIn(o.x, o.z, o.r).sort((p, q) => Math.hypot(p.x - o.x, p.z - o.z) - Math.hypot(q.x - o.x, q.z - o.z))[0]; if (under) acorn(o.x, o.z, under, K20.acorn.dmg, 'guardian_bond:acorn', 1.6); } // kit 2.0 L12\n")

# --- L23 Oakling: the ally it guards heals 3 a second
rep("      if (currentTick < q.next) continue;\n      const anchor = q.guardEnt && q.guardEnt.hp > 0 ? q.guardEnt : q;",
    "      if (q.guardEnt && q.guardEnt.hp > 0 && currentTick >= (q.healNext ?? 0)) { q.healNext = currentTick + 60; healLanded(q.guardEnt, K20.ling, { healer: player.id, source: 'restorative_wave:guard', critBonus: -1 }); events.emit(currentTick, 'review_k20_heal', { kind: 'guard', target: q.guardEnt.id, x: r2(q.x), z: r2(q.z) }); } // kit 2.0 L23\n"
    "      if (currentTick < q.next) continue;\n      const anchor = q.guardEnt && q.guardEnt.hp > 0 ? q.guardEnt : q;")

# --- L6 Nectar Burst: three wisps dive into the burst
rep("        for (const e of stuck) combat.status.apply(e, 'slow', K8.nectar.slow, K8.nectar.slowTicks, currentTick, player.id);\n",
    "        for (const e of stuck) combat.status.apply(e, 'slow', K8.nectar.slow, K8.nectar.slowTicks, currentTick, player.id);\n"
    "        foesIn(l.x, l.z, l.r).sort((p, q) => Math.hypot(p.x - l.x, p.z - l.z) - Math.hypot(q.x - l.x, q.z - l.z)).slice(0, K20.nectarWisp.n).forEach((e, k) => { // kit 2.0 L6\n"
    "          dives.push({ x: e.x, z: e.z, at: currentTick + K3.fall.delay + k * K20.nectarWisp.gap, power: K20.nectarWisp.dmg, src: 'nectar_burst:wisp' });\n"
    "          events.emit(currentTick, 'review_fall_dive', { id: null, target: e.id, x: r2(e.x), z: r2(e.z), secs: (K3.fall.delay + k * K20.nectarWisp.gap) / 60, nectar: true });\n"
    "        });\n")

# --- L26 Drowsy Spores: allies in the puff rest; nightmares
rep("        const foes = foesIn(l.x, l.z, l.r);\n        const slept = [], slowed = [];",
    "        const foes = foesIn(l.x, l.z, l.r);\n"
    "        for (const e of party()) if (Math.hypot(e.x - l.x, e.z - l.z) <= l.r + (e.radius || 0.3)) { healLanded(e, K20.rest, { healer: player.id, source: 'drowsy_spores:rest' }); if (combat.status.magnitude(e, 'slow', currentTick) > 0) combat.status.clear(e, 'slow'); events.emit(currentTick, 'review_k20_heal', { kind: 'rest', target: e.id }); } // kit 2.0 L26\n"
    "        const slept = [], slowed = [];")
rep("          e.reviewSleepHits = 0;\n",
    "          e.reviewSleepHits = 0;\n          e.reviewSleepStart = currentTick; // kit 2.0 L26: nightmares count from here\n")
rep("    if (t.reviewSleepUntil > currentTick && o.source !== 'spirit_bolt') {",
    "    if (t.reviewSleepUntil > currentTick && o.source !== 'spirit_bolt' && o.source !== 'drowsy_spores:dream') { // kit 2.0 L26: nightmares are not hits")
rep("      const dot = DOT_SRC.has(o.source);",
    "      const dot = DOT_SRC.has(o.source) || String(o.source || '').startsWith('thorns:') || o.source === 'rain_cloud:rain'; // kit 2.0: thorns and rain are damage over time")
rep("    if (t.reviewDustUntil > currentTick && t.faction !== 'party') {\n      if (o.source === 'lantern_flurry'",
    "    if (o.source === 'pollen_mark:burst') return; // kit 2.0 L25: the burst carries no pollen\n"
    "    if (t.reviewDustUntil > currentTick && t.faction !== 'party') {\n      if (o.source === 'lantern_flurry'")

# --- L13 Rain Cloud: foes under it slowed 20%, heavy rain 3 a second
rep("      if (currentTick % K8.rain.wet === 0) waterWhere((q) => Math.hypot(q.x - c.x, q.z - c.z) <= c.r);\n",
    "      if (currentTick % K8.rain.wet === 0) waterWhere((q) => Math.hypot(q.x - c.x, q.z - c.z) <= c.r);\n"
    "      for (const e of foesIn(c.x, c.z, c.r)) if (!bossy(e)) { combat.status.apply(e, 'slow', K20.rain.slow, 12, currentTick, player.id); if ((e.reviewMarkSlow ?? 0) <= currentTick) { e.reviewMarkSlow = currentTick + 30; events.emit(currentTick, 'review_k20_status', { target: e.id, kind: 'slow', secs: 0.6 }); } } // kit 2.0 L13\n")
rep("        for (const e of to) healLanded(e, c.power, { healer: player.id, source: 'rain_cloud', critBonus: -1 });\n",
    "        for (const e of to) healLanded(e, c.power, { healer: player.id, source: 'rain_cloud', critBonus: -1 });\n"
    "        for (const e of foesIn(c.x, c.z, c.r)) hit(e, K20.rain.dmg, 'rain_cloud:rain'); // kit 2.0 L13: heavy rain\n")

# --- L14 Creeping Moss: each creep chokes the nearest foe within 3 u
rep("    const c = { id: ++kitIds, had: new Set([t.id]), next: currentTick + K8.creep.every, last: currentTick, power };",
    "    const c = { id: ++kitIds, had: new Set([t.id]), next: currentTick + K8.creep.every, last: currentTick, power, choked: new Set() };")
rep("    events.emit(currentTick, 'review_creep', { id: c.id, to: t.id, fromX: r2(player.x), fromZ: r2(player.z) });\n",
    "    events.emit(currentTick, 'review_creep', { id: c.id, to: t.id, fromX: r2(player.x), fromZ: r2(player.z) });\n    choke(t, c); // kit 2.0 L14\n")
rep("      events.emit(currentTick, 'review_creep', { id: c.id, to: best.id, from: from.id, ...(wetMoss ? { rain: true } : {}) });\n",
    "      events.emit(currentTick, 'review_creep', { id: c.id, to: best.id, from: from.id, ...(wetMoss ? { rain: true } : {}) });\n      choke(best, c); // kit 2.0 L14\n")

# --- L16 Leaf Gale: crossers hasted or slowed; each stopped shot flies back
rep("        if ((w.made = (w.made || 0) + 1) > K8.wall.leafMax) continue; // 1.10: shots past the eighth stop with no leaf\n",
    "        if ((w.made = (w.made || 0) + 1) > K8.wall.leafMax) continue; // 1.10: shots past the eighth stop with no leaf\n"
    "        { const sh = s.reviewFrom != null ? registry.byId(s.reviewFrom) : null; if (foeOk(sh)) fly('blade', s.x, s.z, sh, true, K20.gale.blade, 'wind_wall:blade', K20.gale.speed); } // kit 2.0 L16\n")
rep("      if (currentTick >= w.until) { k8.walls.splice(i, 1); events.emit(currentTick, 'review_wall_end', { id: w.id }); continue; }\n",
    "      if (currentTick >= w.until) { k8.walls.splice(i, 1); events.emit(currentTick, 'review_wall_end', { id: w.id }); continue; }\n"
    "      w.crossed ||= new Set(); // kit 2.0 L16: allies who cross it run faster, foes are slowed\n"
    "      for (const e of registry.all()) {\n"
    "        const ally = e.partyIndex !== undefined;\n"
    "        if (w.crossed.has(e.id) || !(e.hp > 0) || (!ally && !foeOk(e))) continue;\n"
    "        const rx = e.x - w.x, rz = e.z - w.z, pad = e.radius || 0.3;\n"
    "        if (Math.abs(rx * w.ax + rz * w.az) > w.w / 2 + pad || Math.abs(rx * w.nx + rz * w.nz) > K8.wall.thick / 2 + pad) continue;\n"
    "        w.crossed.add(e.id);\n"
    "        if (ally) combat.status.apply(e, 'haste', K20.gale.haste, K20.gale.hasteTicks, currentTick, player.id);\n"
    "        else if (!bossy(e)) combat.status.apply(e, 'slow', K20.gale.slow, K20.gale.slowTicks, currentTick, player.id);\n"
    "        else continue;\n"
    "        events.emit(currentTick, 'review_k20_status', { target: e.id, kind: ally ? 'haste' : 'slow', secs: (ally ? K20.gale.hasteTicks : K20.gale.slowTicks) / 60 });\n"
    "      }\n")

# --- L24 Wild Thicket: fruit falls on allies in the circle
rep("      let woke = 0;\n      for (let j = seeds.length - 1; j >= 0; j--) if (!seeds[j].rolling && inside(seeds[j])) { sproutSeed(j); woke += 1; }",
    "      for (const e of party()) if (inside(e)) { healLanded(e, K20.fruit, { healer: player.id, source: 'wild_thicket:fruit' }); events.emit(currentTick, 'review_k20_heal', { kind: 'fruit', target: e.id, x: r2(e.x), z: r2(e.z) }); } // kit 2.0 L24\n"
    "      let woke = 0;\n      for (let j = seeds.length - 1; j >= 0; j--) if (!seeds[j].rolling && inside(seeds[j])) { sproutSeed(j); woke += 1; }")

# --- L15 Forest Spirit: heals, keeps the 10% 2 s, throws acorns
rep("    for (const e of registry.all()) {\n      if (e.partyIndex === undefined) continue;\n      const byOak",
    "    if (spirit.on) { // kit 2.0 L15\n"
    "      if (currentTick >= (spirit.healNext ?? currentTick + K20.spirit.every)) { const m = hurtNear(spirit.x, spirit.z, spirit.area, true); if (m) fly('spirit', spirit.x, spirit.z, m, false, K20.spirit.heal, 'forest_spirit:heal', K20.blossom.speed); }\n"
    "      if (spirit.healNext == null || currentTick >= spirit.healNext) spirit.healNext = currentTick + K20.spirit.every;\n"
    "      if (spirit.acornNext == null) spirit.acornNext = currentTick + K20.spirit.acornEvery;\n"
    "      if (currentTick >= spirit.acornNext) { const f = nearestFoe(spirit.x, spirit.z, spirit.area); if (f) { spirit.acornNext = currentTick + K20.spirit.acornEvery; acorn(spirit.x, spirit.z, f, K20.spirit.acorn, 'forest_spirit:acorn', 1.1); } }\n"
    "    } else { spirit.healNext = null; spirit.acornNext = null; }\n"
    "    for (const e of registry.all()) {\n      if (e.partyIndex === undefined) continue;\n      const byOak")
rep("      if (near && !e.reviewSpiritBonus) {",
    "      if (near) e.reviewSpiritLeft = null; // kit 2.0 L15\n      if (near && !e.reviewSpiritBonus) {")
rep("      } else if (!near && e.reviewSpiritBonus) {\n        e.maxHp -= e.reviewSpiritBonus;",
    "      } else if (!near && e.reviewSpiritBonus) {\n"
    "        if (e.reviewSpiritLeft == null) { e.reviewSpiritLeft = currentTick; events.emit(currentTick, 'review_k20_status', { target: e.id, kind: 'keep', secs: K20.spirit.keep / 60 }); } // kit 2.0 L15: kept 2 s after leaving\n"
    "        if (e.hp > 0 && currentTick - e.reviewSpiritLeft < K20.spirit.keep) continue;\n"
    "        e.reviewSpiritLeft = null;\n"
    "        e.maxHp -= e.reviewSpiritBonus;")

# --- L10 Mending Sapling: roots slow, a thorn with each blossom
rep("      if (currentTick >= sp.next) {\n        sp.next += sp.fastUntil > currentTick",
    "      for (const e of foesIn(sp.x, sp.z, K20.sap.r)) if (!bossy(e)) { combat.status.apply(e, 'slow', K20.sap.slow, 12, currentTick, player.id); if ((e.reviewMarkSlow ?? 0) <= currentTick) { e.reviewMarkSlow = currentTick + 30; events.emit(currentTick, 'review_k20_status', { target: e.id, kind: 'slow', secs: 0.6 }); } } // kit 2.0 L10\n"
    "      if (currentTick >= sp.next) {\n        { const f = nearestFoe(sp.x, sp.z, K20.sap.reach); if (f) shoot('thorn', sp.x, sp.z, f, K20.sap.thorn, 'sanctuary:thorn', 0.9); } // kit 2.0 L10\n"
    "        sp.next += sp.fastUntil > currentTick")

# --- L22 Sapping Vine: the foe is bound, 30% slow
rep("      if (currentTick < v.next) continue;\n      v.next += KIT.vine.every;",
    "      if (!bossy(foe)) { combat.status.apply(foe, 'slow', K20.vine, 12, currentTick, player.id); if (!v.bound) { v.bound = true; events.emit(currentTick, 'review_k20_status', { target: foe.id, kind: 'tangle', secs: v.left }); } } // kit 2.0 L22: bound\n"
    "      if (currentTick < v.next) continue;\n      v.next += KIT.vine.every;")

# --- L11 Glade Wisps: a sprig on each heal; wisp fire
rep("        healLanded(t, glade.def.power, { healer: player.id, source: 'warding_aura:wisp', critBonus: glade.def.critBonus ?? 0 });\n",
    "        healLanded(t, glade.def.power, { healer: player.id, source: 'warding_aura:wisp', critBonus: glade.def.critBonus ?? 0 });\n        sprig(t); // kit 2.0 L11\n")
rep("        if (best) {\n          w.state = 'fly';",
    "        if (!best && w === waiting()[0] && waiting().length >= max) { // kit 2.0 L11: wisp fire, only with 3 waiting and nobody hurt\n"
    "          const f = nearestFoe(player.x, player.z, K20.wispFire.reach);\n"
    "          if (f) { w.state = 'fire'; w.target = f.id; glade.launch = currentTick + GW.gap; events.emit(currentTick, 'review_gw_fly', { id: w.id, target: f.id, fire: true }); continue; }\n"
    "        }\n"
    "        if (best) {\n          w.state = 'fly';")
rep("        const t = registry.byId(w.target);\n        if (!t || !(t.hp > 0)) { L.splice(i, 1); events.emit(currentTick, 'review_gw_end', { id: w.id }); continue; }\n        const dx = t.x - w.x, dz = t.z - w.z, d = Math.hypot(dx, dz);\n        if (d > speed + 0.3) { w.x += (dx / d) * speed; w.z += (dz / d) * speed; continue; }\n        w.x = t.x; w.z = t.z;\n",
    "        const t = registry.byId(w.target);\n        if (!t || !(t.hp > 0)) { L.splice(i, 1); events.emit(currentTick, 'review_gw_end', { id: w.id }); continue; }\n        const dx = t.x - w.x, dz = t.z - w.z, d = Math.hypot(dx, dz);\n        if (d > speed + 0.3) { w.x += (dx / d) * speed; w.z += (dz / d) * speed; continue; }\n        w.x = t.x; w.z = t.z;\n"
    "        if (w.state === 'fire') { L.splice(i, 1); events.emit(currentTick, 'review_gw_end', { id: w.id, fire: true }); events.emit(currentTick, 'review_k20_hit', { kind: 'wispfire', x: r2(t.x), z: r2(t.z), r: 0.7 }); hit(t, K20.wispFire.dmg, 'warding_aura:fire'); continue; } // kit 2.0 L11\n")

# --- L27 the planted gem sends a mote; L28 dash
rep("    if (age < CB.drift) return; // the staff is still in the air\n",
    "    if (age < CB.drift) return; // the staff is still in the air\n"
    "    if (currentTick >= (g.moteNext ?? g.t0 + CB.drift + 60)) { g.moteNext = currentTick + K20.gemMote.every; const m = hurtNear(g.x, g.z, K20.gemMote.reach, true); if (m) fly('mote', g.x, g.z, m, false, K20.gemMote.heal, 'review_gem_mote', K20.gemMote.speed); } // kit 2.0 L27\n")
rep("        combat.applyHeal(player, Math.round(player.maxHp * 0.05), { healer: player.id, source: 'review_dash' });\n",
    "        combat.applyHeal(player, Math.round(player.maxHp * 0.05), { healer: player.id, source: 'review_dash' });\n"
    "        for (const e of party()) if (e !== player && Math.hypot(e.x - player.x, e.z - player.z) <= K20.dash.allyR + (e.radius || 0.3)) { healLanded(e, K20.dash.ally, { healer: player.id, source: 'review_dash:ally' }); events.emit(currentTick, 'review_k20_heal', { kind: 'dash', target: e.id }); } // kit 2.0 L28\n")
rep("      if (player.hp > 0 && currentTick - (cb.dashHeal ?? -9999) >= 180) {",
    "      combat.status.apply(player, 'haste', K20.dash.haste, K20.dash.hasteTicks, currentTick, player.id); // kit 2.0 L28: 20% faster for 2 s\n"
    "      events.emit(currentTick, 'review_k20_status', { target: player.id, kind: 'haste', secs: K20.dash.hasteTicks / 60 });\n"
    "      if (player.hp > 0 && currentTick - (cb.dashHeal ?? -9999) >= 180) {")
rep("      cb.healAt = currentTick + 22;\n",
    "      cb.healAt = currentTick + 22;\n      cb.dashArmed = currentTick - (cb.dashHeal ?? -9999) >= 180; cb.dashCut = new Set(); // kit 2.0 L28: the thorn burst shares the 3 s limit\n")

# --- the new machinery, ticked with kit 1.8
rep("  function kit8Tick() { landTick(); rainTick(); creepTick(); wallTick(); thicketTick(); spiritTick(); }",
    "  function kit8Tick() { landTick(); rainTick(); creepTick(); wallTick(); thicketTick(); spiritTick(); k20Tick(); }\n" + open(__file__.replace('patch_sim.py', 'k20_block.js'), encoding='utf-8').read())

open(p, 'w', encoding='utf-8').write(s)
print('kit 2.0 applied')
