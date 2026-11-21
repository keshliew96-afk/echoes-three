# Kesh 18 Nov 01:25 UTC: Seed Bolt hops out 2 seeds when it ends (hit or miss); Firefly Swarm's stung
# foes take more damage (减防); Elder Oak roots a foe that stays under its crown; Dewfall gives allies
# inside attack speed. Numbers are mine: +20% damage taken, 2 s under the crown -> held 1 s, +30% attack speed.
import sys
root = sys.argv[1]
def patch(path, pairs):
    p = f'{root}/{path}'; s = open(p).read()
    for a, b in pairs:
        if s.count(a) != 1: sys.exit(f'{path}: expected one match for {a[:80]!r}, found {s.count(a)}')
        s = s.replace(a, b)
    open(p, 'w').write(s)
ATK = "Math.round(S.attackIntervalTicks / (a.reviewAtkUntil > tick ? 1 + (a.reviewAtkMag || 0) : 1))"
patch('src/sim/allies.js', [
    ("    if (ended && f.basic) {\n      a.nextBasicTick = tick + S.attackIntervalTicks;", f"    if (ended && f.basic) {{\n      a.nextBasicTick = tick + {ATK};"),
    ("        a.nextBasicTick = tick + S.attackIntervalTicks;\n        T.basic = seq + S.attackIntervalTicks;", f"        a.nextBasicTick = tick + {ATK};\n        T.basic = seq + {ATK};"),
    ("    fireAllyBasic(a, S, target, tick);\n    a.nextBasicTick = tick + S.attackIntervalTicks;", f"    fireAllyBasic(a, S, target, tick);\n    a.nextBasicTick = tick + {ATK}; // REVIEW-ONLY: Dewfall's attack speed (Kesh 18 Nov)"),
])
w = 'src/sim/world.js'
s = open(f'{root}/{w}').read()
n_heal = s.count("player.nextBasicTick = currentTick + HEALER.attackIntervalTicks;")
s = s.replace("player.nextBasicTick = currentTick + HEALER.attackIntervalTicks;", "player.nextBasicTick = currentTick + Math.round(HEALER.attackIntervalTicks * atkMul(player));")
open(f'{root}/{w}', 'w').write(s)
print('healer basic lines', n_heal)
patch(w, [
    ("player.nextBasicTick = currentTick + (hit === 1 ? CB.gap2 : hit === 2 ? CB.gap3 : CB.lock);",
     "player.nextBasicTick = currentTick + Math.round((hit === 1 ? CB.gap2 : hit === 2 ? CB.gap3 : CB.lock) * atkMul(player));"),
    ("  const bossy = (e) => e.boss === true || e.kind === 'stag';",
     "  const bossy = (e) => e.boss === true || e.kind === 'stag';\n  const atkMul = (e) => (e && e.reviewAtkUntil > currentTick ? 1 / (1 + (e.reviewAtkMag || 0)) : 1); // REVIEW-ONLY: Dewfall's attack speed (Kesh 18 Nov)"),
    # Seed Bolt: hit or miss, it hops out 2 seeds
    ("      if (ev.skill !== 'mending_bolt' || !ev.heal || ev.cause === 'impact') return;\n      dropSeed(ev.x, ev.z, null);",
     "      if (ev.skill !== 'mending_bolt' || !ev.heal) return; // Kesh 18 Nov: when it ends, on an ally or a miss, it hops out 2 seeds\n      for (let k = 0; k < K20.boltSeeds; k++) dropSeed(ev.x, ev.z, { x: ev.x, z: ev.z });"),
    # Firefly Swarm: 减防 instead of the slow
    ("combat.status.apply(t, 'slow', K20.swarmSlow, 70, currentTick, player.id); events.emit(currentTick, 'review_k20_status', { target: t.id, kind: 'slow', secs: 1.2 }); } } // kit 2.0 L8",
     "combat.status.apply(t, 'exposed', K20.swarmExposed, 70, currentTick, player.id); events.emit(currentTick, 'review_k20_status', { target: t.id, kind: 'exposed', secs: 1.2 }); } } // kit 2.0 L8; Kesh 18 Nov: stung foes take more damage (减防), not slowed"),
    ("    swarmSlow: 0.2, // L8", "    swarmExposed: 0.2, // L8 (Kesh 18 Nov: 减防; 20% more damage taken is my number)\n    boltSeeds: 2, // Kesh 18 Nov: Seed Bolt hops out 2 seeds when it ends\n    oakRoot: { after: 120, hold: 60 }, // Kesh 18 Nov: a foe 2 s under the crown is held by roots 1 s (my numbers)\n    dewAtk: 0.3, // Kesh 18 Nov: allies in Dewfall attack 30% faster (my number)"),
    # Elder Oak: a foe that stays under the crown is snared by roots
    ("      for (const e of foesIn(o.x, o.z, o.r)) if (!bossy(e)) combat.status.apply(e, 'slow', K4.oak.slow, 12, currentTick, player.id);",
     """      for (const e of foesIn(o.x, o.z, o.r)) {
        if (!bossy(e)) combat.status.apply(e, 'slow', K4.oak.slow, 12, currentTick, player.id);
        // Kesh 18 Nov: a foe that stays under the crown is snared by roots, then its count starts again
        if (e.reviewOakSeen == null || currentTick - e.reviewOakSeen > 10) e.reviewOakIn = currentTick; // hitstop can skip a few ticks
        e.reviewOakSeen = currentTick;
        if (!bossy(e) && e.hp > 0 && currentTick - e.reviewOakIn >= K20.oakRoot.after) {
          e.reviewOakIn = currentTick + K20.oakRoot.hold;
          combat.status.apply(e, 'stun', 1, K20.oakRoot.hold, currentTick, player.id);
          events.emit(currentTick, 'review_oak_root', { target: e.id, x: r2(e.x), z: r2(e.z), secs: K20.oakRoot.hold / 60 });
        }
      }"""),
    # Dewfall: attack speed inside
    ("      if (inside) { e.reviewDewIn = currentTick; e.reviewClingNext = currentTick + 60; continue; }",
     "      if (inside) { e.reviewDewIn = currentTick; e.reviewClingNext = currentTick + 60; if (!(e.reviewAtkUntil > currentTick + 1)) events.emit(currentTick, 'review_k20_status', { target: e.id, kind: 'atk', secs: 0.4 }); else if (currentTick % 12 === 0) events.emit(currentTick, 'review_k20_status', { target: e.id, kind: 'atk', secs: 0.4 }); e.reviewAtkUntil = currentTick + 12; e.reviewAtkMag = K20.dewAtk; continue; } // Kesh 18 Nov: allies inside attack faster"),
])
patch('src/render/critters/reviewPathsFx.js', [
    ("haste: [PALETTE.brightHeal, 0.46], keep: [LEAF_LIGHT, 0.5] };",
     "haste: [PALETTE.brightHeal, 0.46], keep: [LEAF_LIGHT, 0.5], exposed: [DMG_DEEP, 0.54], atk: [BLOSSOM, 0.58] }; // Kesh 18 Nov: 减防 (Firefly Swarm), attack speed (Dewfall)"),
    ("  function k20Update(dt) {\n",
     """  // Kesh 18 Nov: Elder Oak roots a foe that stays under its crown (five root spikes close round it).
  const oakRoots = [];
  bus.on('review_oak_root', (ev) => {
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const rt = new Mesh(new ConeGeometry(0.09, 0.85, 5), mat(i % 2 ? '#7FA048' : '#9A7444'));
      const pv = new Group();
      pv.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42);
      pv.rotation.set(0, -a + Math.PI / 2, 0);
      rt.position.y = 0.34;
      rt.rotation.z = 0.4;
      pv.add(rt);
      g.add(pv);
    }
    g.scale.setScalar(0.01);
    root.add(g);
    oakRoots.push({ g, t: 0, life: ev.secs });
    { const sp = flat(new RingGeometry(0.5, 0.56, 32), '#9A7444', 0.85); sp.position.set(ev.x, 0.05, ev.z); root.add(sp); oakRoots.push({ g: sp, t: 0, life: ev.secs, ring: true }); } // a root ring under the held foe
    burst(ev.x, 0.15, ev.z, LEAF, 6, 0.09);
  });
  function k20Update(dt) {
    for (let i = oakRoots.length - 1; i >= 0; i--) {
      const o = oakRoots[i];
      o.t += dt;
      const k = o.t < 0.15 ? o.t / 0.15 : o.t > o.life ? Math.max(0, 1 - (o.t - o.life) / 0.25) : 1;
      o.g.scale.setScalar(Math.max(0.01, k));
      if (o.t > o.life + 0.25) { root.remove(o.g); oakRoots.splice(i, 1); }
    }
"""),
])
print('patched')
