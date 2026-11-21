# Kesh 18 Nov 00:23 UTC: every seed is burst out on a low arc and never lands under anyone's feet
# (a seed under an ally would be an instant heal). The recorder's __reviewSeedAt still lays a seed
# exactly where a clip needs one lying.
import sys
root = sys.argv[1]
p = f'{root}/src/sim/world.js'; s = open(p).read()
pairs = [
("""  function dropSeed(x, z, from) {
    const sd = { id: ++kitIds, x, z, born: currentTick, until: currentTick + KIT.seed.life };
    seeds.push(sd);
    events.emit(currentTick, 'review_seed', { id: sd.id, x: r2(x), z: r2(z), secs: KIT.seed.life / 60, ...(from ? { fromX: r2(from.x), fromZ: r2(from.z), ...(from.low ? { low: true } : {}) } : {}) });
  }""",
"""  // Kesh 18 Nov: every seed bursts out on a low arc from where it was made, and never lands under a
  // hero's feet (that would be an instant heal): a spot within SEEDARC.clear of a hero, or at its own
  // source, moves SEEDARC.min to max u out, turning round until it is clear.
  const SEEDARC = { min: 1.2, max: 2.0, clear: 1.0, near: 0.6, tries: 8 };
  function seedSpot(src, x, z) {
    const m = 0.6;
    const clamp = (px, pz) => ({ x: Math.max(-ARENA.halfW + m, Math.min(ARENA.halfW - m, px)), z: Math.max(-ARENA.halfD + m, Math.min(ARENA.halfD - m, pz)) });
    const clear = (q) => !registry.all().some((e) => e.partyIndex !== undefined && e.hp > 0 && Math.hypot(e.x - q.x, e.z - q.z) < SEEDARC.clear);
    const p = clamp(x, z);
    if (Math.hypot(p.x - src.x, p.z - src.z) >= SEEDARC.near && clear(p)) return p;
    const a0 = rng.range(0, Math.PI * 2), r = rng.range(SEEDARC.min, SEEDARC.max);
    for (let k = 0; k < SEEDARC.tries; k++) {
      const a = a0 + (k * Math.PI * 2) / SEEDARC.tries;
      const q = clamp(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r);
      if (clear(q)) return q;
    }
    return clamp(p.x + Math.cos(a0) * (r + 1), p.z + Math.sin(a0) * (r + 1));
  }
  function dropSeed(x, z, from) {
    const src = from ? { x: from.x, z: from.z } : { x, z };
    const p = seedSpot(src, x, z);
    const sd = { id: ++kitIds, x: p.x, z: p.z, born: currentTick, until: currentTick + KIT.seed.life };
    seeds.push(sd);
    events.emit(currentTick, 'review_seed', { id: sd.id, x: r2(p.x), z: r2(p.z), secs: KIT.seed.life / 60, fromX: r2(src.x), fromZ: r2(src.z), low: true });
  }
  function laySeed(x, z) { // the recorder's seeds already lying in a clip
    const sd = { id: ++kitIds, x, z, born: currentTick, until: currentTick + KIT.seed.life };
    seeds.push(sd);
    events.emit(currentTick, 'review_seed', { id: sd.id, x: r2(x), z: r2(z), secs: KIT.seed.life / 60 });
  }"""),
("    globalThis.__reviewSeedAt = (x, z) => dropSeed(x, z, null);",
 "    globalThis.__reviewSeedAt = (x, z) => laySeed(x, z);\n    globalThis.__reviewSeedDrop = (x, z, from) => dropSeed(x, z, from);"),
("if (h.left <= 0 && h.skill === 'kindred_shield' && globalThis.__reviewSeedAt) globalThis.__reviewSeedAt(h.t.x + 0.35, h.t.z + 0.25); // R18: a full run drops a seed",
 "if (h.left <= 0 && h.skill === 'kindred_shield' && globalThis.__reviewSeedDrop) globalThis.__reviewSeedDrop(h.t.x, h.t.z, { x: h.t.x, z: h.t.z }); // R18: a full run bursts out a seed (Kesh 18 Nov: never at their feet)"),
("dropSeed(w.t.x + 0.35, w.t.z + 0.25, { x: w.t.x, z: w.t.z }); // kit v1.5 R46: a fading wisp leaves a seed",
 "dropSeed(w.t.x, w.t.z, { x: w.t.x, z: w.t.z }); // kit v1.5 R46: a fading wisp bursts out a seed (Kesh 18 Nov: never at their feet)"),
("dropSeed(sp.x + 0.3, sp.z + 0.2, { x: sp.x, z: sp.z }); // Kesh 11-16 21:50: when it ends it leaves a seed",
 "dropSeed(sp.x, sp.z, { x: sp.x, z: sp.z }); // Kesh 11-16 21:50: when it ends it bursts out a seed"),
]
for a, b in pairs:
    if s.count(a) != 1: sys.exit(f'expected one match for {a[:80]!r}, found {s.count(a)}')
    s = s.replace(a, b)
open(p, 'w').write(s)
print('patched')
