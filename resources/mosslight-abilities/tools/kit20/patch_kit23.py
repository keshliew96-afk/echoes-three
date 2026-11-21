# Kit 2.3 (Kesh 18 Nov 06:28 UTC, page thread): six direct changes.
# Elder Oak (no slow, damage buff under it), Pollen Gust (no slow, small push, dusts), Wispfall (a 15 s channel
# that ramps and breaks), Firefly Swarm (damage buff on ally stops), Creeping Moss (shared damage, splash between
# choked foes), Dew Wave and Rain Cloud (double watering). REVIEW-ONLY: never committed.
import sys
root = sys.argv[1]
def patch(path, pairs):
    p = f'{root}/{path}'; s = open(p).read()
    for a, b in pairs:
        if s.count(a) != 1: sys.exit(f'{path}: expected one match for {a[:80]!r}, found {s.count(a)}')
        s = s.replace(a, b)
    open(p, 'w').write(s)

patch('src/sim/skills.js', [
    ("set('bell_toll', { name: 'Wispfall', abbrev: 'WF', shape: 'review', power: 7, cd: 12,",
     "set('bell_toll', { name: 'Wispfall', abbrev: 'WF', shape: 'review', power: 7, cd: 30,"),  # Kesh 18 Nov: 30 s cd
])

W = 'src/sim/world.js'
patch(W, [
    # numbers
    ("    fall: { ticks: 300, every: 30, reach: 4.5, splash: 0.9, delay: 12 },",
     "    fall: { ticks: 900, every: 30, reach: 4.5, splash: 0.9, delay: 12 }, // Kesh 18 Nov: a 15 s channel"),
    ("    storm: { first: 30, every: 60, n: 5, heal: 6, slow: 0.2, slowTicks: 90 }, // L19",
     "    storm: { first: 30, every: 60, n: 15, heal: 6, slow: 0.2, slowTicks: 90, ramp: 0.1, rampMax: 1, still: 0.08 }, // L19; Kesh 18 Nov channel: +10% a wisp, up to +100% (my numbers)\n"
     "    oakDmg: 0.2, swarmDmg: 0.15, creepLink: 0.3, // Kesh 18 Nov: damage buffs under the oak and at swarm ally stops; choked-foe splash (my numbers)"),
    # Elder Oak: no slow; allies under the crown deal 20% more damage
    ("        if (!bossy(e)) combat.status.apply(e, 'slow', K4.oak.slow, 12, currentTick, player.id);\n        // Kesh 18 Nov: a foe that stays under the crown",
     "        // Kesh 18 Nov 06:28: no slow under the crown any more (the root stays)\n        // Kesh 18 Nov: a foe that stays under the crown"),
    ("      for (let j = seeds.length - 1; j >= 0; j--) if (under(seeds[j])) sproutSeed(j);\n      for (const q of [...spitters, ...saplings, ...oaklings, ...hedges, ...snaps, ...lilies]) if (under(q)) q.until += 1;",
     "      for (const e of allies) { combat.status.apply(e, 'inspired', K20.oakDmg, 12, currentTick, player.id); if ((e.reviewOakBuffSaid ?? 0) <= currentTick) { e.reviewOakBuffSaid = currentTick + 30; events.emit(currentTick, 'review_k20_status', { target: e.id, kind: 'dmg', secs: 0.6 }); } } // Kesh 18 Nov: damage buff under the crown\n"
     "      for (let j = seeds.length - 1; j >= 0; j--) if (under(seeds[j])) sproutSeed(j);\n      for (const q of [...spitters, ...saplings, ...oaklings, ...hedges, ...snaps, ...lilies]) if (under(q)) q.until += 1;"),
    # Pollen Gust: a small push, no slow, dusted
    ("    gust: { len: 7, width: 3, speed: 10 / 60, push: 2, pushTicks: 12,",
     "    gust: { len: 7, width: 3, speed: 10 / 60, push: 0.8, pushTicks: 10, // Kesh 18 Nov: only a slight push (was 2 u)\n           "),
    ("          combat.status.apply(e, 'slow', K3.gust.slow, K3.gust.slowTicks, currentTick, player.id);\n          events.emit(currentTick, 'review_gust_push', { target: e.id });",
     "          e.reviewDustUntil = currentTick + K8.pollen.ticks; // Kesh 18 Nov: no slow; the wind dusts every foe it pushes\n"
     "          events.emit(currentTick, 'review_pollen_carry', { id: g.id, target: e.id, secs: K8.pollen.ticks / 60 });\n"
     "          events.emit(currentTick, 'review_gust_push', { target: e.id });"),
    # Firefly Swarm: an ally stop gives a damage buff for the stop
    ("            if (!w.foe) {\n              const h = addHot(t, `${t.id}|swarm`, 'swarm', player.id, K3.swarm.moss, 3, 3);",
     "            if (!w.foe) {\n              combat.status.apply(t, 'inspired', K20.swarmDmg, K3.swarm.stay, currentTick, player.id); // Kesh 18 Nov: damage buff at an ally stop\n"
     "              events.emit(currentTick, 'review_k20_status', { target: t.id, kind: 'dmg', secs: K3.swarm.stay / 60 });\n"
     "              const h = addHot(t, `${t.id}|swarm`, 'swarm', player.id, K3.swarm.moss, 3, 3);"),
    # Wispfall: a channel
    ("    const f = { id: ++kitIds, until: currentTick + K3.fall.ticks, next: currentTick + 6, last: null, power, reach: def.area, healNext: currentTick + K20.storm.first, heals: 0 }; // kit 2.0 L19\n    falls.push(f);",
     "    for (const old of falls.splice(0)) events.emit(currentTick, 'review_fall_end', { id: old.id });\n"
     "    const f = { id: ++kitIds, until: currentTick + K3.fall.ticks, next: currentTick + 6, last: null, power, reach: def.area, healNext: currentTick + K20.storm.first, heals: 0, px: player.x, pz: player.z, n: 0, at: currentTick }; // kit 2.0 L19; Kesh 18 Nov: she channels\n    falls.push(f);"),
    ("      if (currentTick >= f.until || !(player.hp > 0)) { falls.splice(i, 1); events.emit(currentTick, 'review_fall_end', { id: f.id }); continue; }",
     "      if (currentTick >= f.until || !(player.hp > 0)) { falls.splice(i, 1); events.emit(currentTick, 'review_fall_end', { id: f.id }); continue; }\n"
     "      { // Kesh 18 Nov: CC, moving, another cast, a basic attack or a dash breaks the channel\n"
     "        const why = combat.status.isStunned(player, currentTick) ? 'cc' : Math.hypot(player.x - f.px, player.z - f.pz) > K20.storm.still ? 'move' : f.broke || null;\n"
     "        if (why && currentTick > f.at + 2) { falls.splice(i, 1); events.emit(currentTick, 'review_fall_break', { id: f.id, why, x: r2(player.x), z: r2(player.z), n: f.n }); events.emit(currentTick, 'review_fall_end', { id: f.id }); continue; }\n"
     "        f.px = player.x; f.pz = player.z;\n"
     "      }\n"
     "      const ramp = () => 1 + Math.min(K20.storm.rampMax, K20.storm.ramp * f.n);"),
    ("        if (m) { events.emit(currentTick, 'review_k20_fallheal', { target: m.id, x: r2(m.x), z: r2(m.z), secs: K3.fall.delay / 60 }); later(K3.fall.delay, () => { if (m.hp > 0) healLanded(m, K20.storm.heal, { healer: player.id, source: 'bell_toll:heal', critBonus: -1 }); }); }",
     "        if (m) { const amt = Math.round(K20.storm.heal * ramp()); f.n += 1; events.emit(currentTick, 'review_fall_stack', { id: f.id, n: f.n, mul: r2(ramp()) }); events.emit(currentTick, 'review_k20_fallheal', { target: m.id, x: r2(m.x), z: r2(m.z), secs: K3.fall.delay / 60 }); later(K3.fall.delay, () => { if (m.hp > 0) healLanded(m, amt, { healer: player.id, source: 'bell_toll:heal', critBonus: -1 }); }); }"),
    ("      dives.push({ x: t.x, z: t.z, at: currentTick + K3.fall.delay, power: f.power, storm: true });",
     "      dives.push({ x: t.x, z: t.z, at: currentTick + K3.fall.delay, power: Math.round(f.power * ramp()), storm: true });\n"
     "      f.n += 1;\n"
     "      events.emit(currentTick, 'review_fall_stack', { id: f.id, n: f.n, mul: r2(ramp()) });"),
    ("      if (a !== player) return;\n      const K3CAST = {",
     "      if (a !== player) return;\n      if (def.id !== 'bell_toll') for (const f of falls) f.broke = 'cast'; // Kesh 18 Nov: another cast breaks the Wispfall channel\n      const K3CAST = {"),
    ("    events.emit(currentTick, 'basic_fire', { x: r2(player.x), z: r2(player.z), dx: r2(dir.x), dz: r2(dir.z), hit, gem: hit === 3 });",
     "    for (const f of falls) f.broke = 'attack'; // Kesh 18 Nov: a basic attack breaks the Wispfall channel\n"
     "    events.emit(currentTick, 'basic_fire', { x: r2(player.x), z: r2(player.z), dx: r2(dir.x), dz: r2(dir.z), hit, gem: hit === 3 });"),
    # Double watering for Dew Wave and Rain Cloud
    ("        waterWhere((q) => inRect({ x: q.x, z: q.z, radius: 0.15 }, player.x, player.z, dx, dz, def.range, def.area)); // R11: water grows",
     "        waterWhere.mul = 2; try { waterWhere((q) => inRect({ x: q.x, z: q.z, radius: 0.15 }, player.x, player.z, dx, dz, def.range, def.area)); } finally { waterWhere.mul = 1; } // R11: water grows; Kesh 18 Nov: doubled"),
    ("      if (currentTick % K8.rain.wet === 0) waterWhere((q) => Math.hypot(q.x - c.x, q.z - c.z) <= c.r);",
     "      if (currentTick % K8.rain.wet === 0) { waterWhere.mul = 2; try { waterWhere((q) => Math.hypot(q.x - c.x, q.z - c.z) <= c.r); } finally { waterWhere.mul = 1; } } // Kesh 18 Nov: doubled"),
    ("  function waterWhere(test) {\n    const gm = cb.gem;",
     "  function waterWhere(test) {\n    const wm = waterWhere.mul || 1; // Kesh 18 Nov: Dew Wave and Rain Cloud water at double strength\n    const gm = cb.gem;"),
    ("      gm.fastUntil = currentTick + K5.staffFast;\n      events.emit(currentTick, 'review_staff_water', { x: r2(gm.x), z: r2(gm.z), secs: K5.staffFast / 60 });",
     "      gm.fastUntil = currentTick + K5.staffFast * wm;\n      events.emit(currentTick, 'review_staff_water', { x: r2(gm.x), z: r2(gm.z), secs: (K5.staffFast * wm) / 60 });"),
    ("      q.until += K4.water.more;\n      q.fastUntil = currentTick + K4.water.fast;\n      if (q.kind === 'ling')",
     "      q.until += K4.water.more * wm;\n      q.fastUntil = currentTick + K4.water.fast * wm;\n      if (wm > 1) events.emit(currentTick, 'review_water2', { x: r2(q.x), z: r2(q.z) });\n      if (q.kind === 'ling')"),
    ("      pf.r = r2(pf.r * K4.water.puff);",
     "      pf.r = r2(pf.r * (1 + (K4.water.puff - 1) * wm));"),
    ("      h.left += K4.water.moss;",
     "      h.left += K4.water.moss * wm;"),
])

# Creeping Moss: damage to a Moss-linked ally is shared by every linked ally; 30% of damage on a choked foe
# also lands on the other choked foes.
patch(W, [
    ("      const before = t && t.hp > 0 ? t.hp : 0;\n      const r = rawDamage(t, base, o);",
     "      if (t && t.partyIndex !== undefined && !o.reviewShared && hots.has(`${t.id}|creeping_moss`)) { // Kesh 18 Nov: 共同承担\n"
     "        const mates = party().filter((e) => e !== t && hots.has(`${e.id}|creeping_moss`));\n"
     "        if (mates.length) {\n"
     "          const part = base / (mates.length + 1);\n"
     "          events.emit(currentTick, 'review_creep_share', { from: t.id, to: mates.map((e) => e.id), part: r2(part) });\n"
     "          for (const e of mates) rawDamage(e, part, { ...o, reviewShared: true });\n"
     "          base = part;\n"
     "        }\n"
     "      }\n"
     "      const before = t && t.hp > 0 ? t.hp : 0;\n      const r = rawDamage(t, base, o);\n"
     "      if (t && t.partyIndex === undefined && r && r.amount > 0 && o.source !== 'creeping_moss:link' && k20.dots.has(`${t.id}|choke`)) { // Kesh 18 Nov: 附加伤害 to the other choked foes\n"
     "        const others = [...k20.dots.values()].filter((d) => d.src === 'choke' && d.e !== t && d.e.hp > 0).map((d) => d.e);\n"
     "        const amt = Math.round(r.amount * K20.creepLink);\n"
     "        if (others.length && amt > 0) { events.emit(currentTick, 'review_creep_link', { from: t.id, to: others.map((e) => e.id) }); for (const e of others) hit(e, amt, 'creeping_moss:link'); }\n"
     "      }"),
])

FX = r"""
  // ---- REVIEW-ONLY: kit 2.3 (Kesh 18 Nov 06:28) ----
  // Wispfall channel: the ring under her brightens with each wisp; a break shatters it.
  bus.on('review_fall_stack', (ev) => {
    const o = k3.get(ev.id);
    if (!o) return;
    o.mul = ev.mul;
    const p = o.g.position;
    burst(p.x, 0.9, p.z, WHITE_GOLD, 2, 0.07);
  });
  bus.on('review_fall_break', (ev) => {
    burst(ev.x, 0.5, ev.z, WHITE_GOLD, 12, 0.12);
    ringPart(ev.x, ev.z, 1.2, WHITE_GOLD, 0.4, 1.2, 0.8);
  });
  // Creeping Moss: the hit is shared along the Moss (moss motes from the hit ally to the others).
  bus.on('review_creep_share', (ev) => {
    const a = byId(ev.from);
    if (!a) return;
    for (const id of ev.to) for (let i = 0; i < 3; i++) {
      const s = sprite(LEAF_LIGHT);
      s.scale.setScalar(0.11);
      root.add(s);
      parts.push({ s, target: id, from: new Vector3(a.x, 0.6, a.z), t: -i * 0.05, life: 0.35, kind: 'pour', arc: 0.3 });
    }
  });
  bus.on('review_creep_link', (ev) => {
    const a = byId(ev.from);
    if (!a) return;
    for (const id of ev.to) for (let i = 0; i < 3; i++) {
      const s = sprite(DMG_DEEP);
      s.scale.setScalar(0.12);
      root.add(s);
      parts.push({ s, target: id, from: new Vector3(a.x, 0.5, a.z), t: -i * 0.05, life: 0.3, kind: 'pour', arc: 0.25 });
    }
  });
  bus.on('review_water2', (ev) => { burst(ev.x, 0.35, ev.z, WATER, 8, 0.1); ringPart(ev.x, ev.z, 0.6, WATER, 0.4, 0.8, 0.7); }); // double watering
"""
F = 'src/render/critters/reviewPathsFx.js'
patch(F, [
    ("  const K20MARK = { thorns: [THORN_PALE, 0.3], choke: [DMG_DEEP, 0.34], tangle: [LEAF, 0.38], slow: [WATER, 0.42], haste: [PALETTE.brightHeal, 0.46], keep: [LEAF_LIGHT, 0.5], exposed: [DMG_DEEP, 0.54], atk: [BLOSSOM, 0.58] };",
     "  const K20MARK = { thorns: [THORN_PALE, 0.3], choke: [DMG_DEEP, 0.34], tangle: [LEAF, 0.38], slow: [WATER, 0.42], haste: [PALETTE.brightHeal, 0.46], keep: [LEAF_LIGHT, 0.5], exposed: [DMG_DEEP, 0.54], atk: [BLOSSOM, 0.58], dmg: ['#E9B872', 0.62] }; // kit 2.3: damage buff (honey)"),
    ("        o.ring.material.opacity = 0.22 * Math.min(1, o.t * 4) * out;\n      } else if (o.kind === 'snare') {",
     "        const m = o.mul || 1; // kit 2.3: the channel ring brightens and thickens as the wisps ramp up\n"
     "        o.ring.material.opacity = (0.22 + 0.3 * (m - 1)) * Math.min(1, o.t * 4) * out;\n"
     "        o.ring.scale.setScalar(1 + 0.02 * Math.sin(o.t * 8) * m);\n"
     "      } else if (o.kind === 'snare') {"),
    ("  // ---- REVIEW-ONLY: kit 2.2 (Kesh 18 Nov): S72 Lure Lily", FX + "  // ---- REVIEW-ONLY: kit 2.2 (Kesh 18 Nov): S72 Lure Lily"),
])
print('patched')
