# Kesh 18 Nov 03:30 UTC: Mending Sapling grows in levels and heals more at each; on cast it takes in
# up to 5 seeds nearby (each is more time); with 3 or more it unlocks its third level.
# My numbers: blossoms 8 / 11 / 14, level 2 at 3 s, level 3 at 6 s (+1 u reach); 2 s a seed as before.
import sys
root = sys.argv[1]
def patch(path, pairs):
    p = f'{root}/{path}'; s = open(p).read()
    for a, b in pairs:
        if s.count(a) != 1: sys.exit(f'{path}: expected one match for {a[:80]!r}, found {s.count(a)}')
        s = s.replace(a, b)
    open(p, 'w').write(s)
patch('src/sim/world.js', [
    ("    sapSeeds: 3, sapMax: 3, // U4 c", "    sapSeeds: 3, sapMax: 5, // U4 c (Kesh 18 Nov: up to 5 seeds)\n    sapLevel: { at: [0, 180, 360], add: [0, 3, 6], unlock: 3, reach3: 1 }, // Kesh 18 Nov: levels at 0, 3 and 6 s; blossoms +0 / +3 / +6; the third needs 3 seeds"),
    ("        const sp = { id: ++kitIds, x: player.x + ax * k, z: player.z + az * k, until: currentTick + Math.round(def.durationSec * 60), next: currentTick + KIT.sapling.every, heal: power, reach: def.area };",
     "        const sp = { id: ++kitIds, x: player.x + ax * k, z: player.z + az * k, until: currentTick + Math.round(def.durationSec * 60), next: currentTick + KIT.sapling.every, heal: power, base: power, reach: def.area, born: currentTick, level: 1, top: 2 };"),
    ("        for (const sd of fed) { useSeed(sd, 'sapling', sp); sp.until += KIT.sapling.every; }\n        events.emit(currentTick, 'review_sapling', { id: sp.id, x: r2(sp.x), z: r2(sp.z), reach: sp.reach, secs: r2((sp.until - currentTick) / 60), fed: fed.length });",
     "        for (const sd of fed) { useSeed(sd, 'sapling', sp); sp.until += KIT.sapling.every; }\n        if (fed.length >= K7.sapLevel.unlock) sp.top = 3; // Kesh 18 Nov: 3 or more seeds unlock the third level\n        events.emit(currentTick, 'review_sapling', { id: sp.id, x: r2(sp.x), z: r2(sp.z), reach: sp.reach, secs: r2((sp.until - currentTick) / 60), fed: fed.length, top: sp.top });"),
    ("    for (let i = saplings.length - 1; i >= 0; i--) {\n      const sp = saplings[i];\n",
     """    for (let i = saplings.length - 1; i >= 0; i--) {
      const sp = saplings[i];
      if (sp.level < sp.top && sp.born != null && currentTick - sp.born >= K7.sapLevel.at[sp.level]) { // Kesh 18 Nov: it grows a level and heals more
        sp.level += 1;
        sp.heal = sp.base + K7.sapLevel.add[sp.level - 1];
        if (sp.level === 3) sp.reach += K7.sapLevel.reach3;
        events.emit(currentTick, 'review_sapling_grow', { id: sp.id, level: sp.level, heal: sp.heal, reach: sp.reach, x: r2(sp.x), z: r2(sp.z) });
      }
"""),
])
patch('src/render/critters/reviewPathsFx.js', [
    ("    kitObjs.set(ev.id, { kind: 'sapling', g, tree, crown: sway, glow, reachRing, t: 0, pulse: 0, life: ev.secs || 8, sc: 0.9 });",
     "    kitObjs.set(ev.id, { kind: 'sapling', g, tree, crown: sway, glow, reachRing, t: 0, pulse: 0, life: ev.secs || 8, sc: 0.9, level: 1 });"),
    ("  bus.on('review_sapling_mote', (ev) => {",
     """  // Kesh 18 Nov: the sapling grows a level (a ring and a leaf burst; the third level reaches 1 u further).
  bus.on('review_sapling_grow', (ev) => {
    const o = kitObjs.get(ev.id);
    if (!o) return;
    o.level = ev.level;
    o.pulse = 1;
    if (ev.level === 3) { o.reachRing.geometry.dispose(); o.reachRing.geometry = new RingGeometry(ev.reach - 0.04, ev.reach, 64); }
    burst(ev.x, 0.5 * ev.level, ev.z, '#8CC46E', 6 + 3 * ev.level, 0.11);
    burst(ev.x, 0.2, ev.z, PALETTE.brightHeal, 5, 0.09);
  });
  bus.on('review_sapling_mote', (ev) => {"""),
    ("        const stage = o.t < o.life / 3 ? 0.9 : o.t < (o.life * 2) / 3 ? 1.8 : 2.7;",
     "        const stage = o.level === 3 ? 2.7 : o.level === 2 ? 1.8 : 0.9; // Kesh 18 Nov: sizes follow the sim's levels"),
])
print('patched')
