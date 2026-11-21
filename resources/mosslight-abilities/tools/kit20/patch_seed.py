# Kesh 18 Nov 00:18 and 00:19 UTC: a seed waits 5 s (a hurt ally who walks on it picks it up and heals),
# then always turns into a flower (Spitter) that attacks for 5 s: 10 s in all. Sower: the pouch seed
# every 8 s stays; the staff turret bursts out 2 seeds, not 3.
import sys
root = sys.argv[1]
def patch(path, pairs):
    p = f'{root}/{path}'; s = open(p).read()
    for a, b in pairs:
        if s.count(a) != 1: sys.exit(f'{path}: expected one match for {a[:70]!r}, found {s.count(a)}')
        s = s.replace(a, b)
    open(p, 'w').write(s)
patch('src/sim/world.js', [
    ("seed: { heal: 11, life: 480, reach: 0.45, ripe: 180, wake: 4.0 }, // kit 1.7 U1: sprouts by itself at 3 s // S11, S43 (v1.3: 8 s, sprouts)",
     "seed: { heal: 11, life: 300, reach: 0.45 }, // Kesh 18 Nov: a seed waits 5 s, then always opens as a flower (Spitter) for 5 s; 10 s in all (was 3 s near a foe, gone at 8 s)"),
    ("      const wake = !hit && !sd.rolling && currentTick - sd.born >= KIT.seed.ripe && nearestFoe(sd.x, sd.z, KIT.seed.wake);\n      if (hit || wake || currentTick >= sd.until) {",
     "      const wake = !hit && !sd.rolling && currentTick >= sd.until; // Kesh 18 Nov: at 5 s it turns into a flower, foe or no foe\n      if (hit || wake) {"),
    ("sow: { n: 3, shootMin", "sow: { n: 2, shootMin"),
    ("own timer leaves 3 seeds round where it stood.", "own timer leaves 2 seeds round where it stood (Kesh 18 Nov; was 3)."),
])
patch('src/render/critters/reviewPathsFx.js', [
    ("    // S54 Sower (kit 1.6): three seed buds swell on the roots at 1.6 s, 3.3 s and 5 s.\n    const buds = [0, 2, 4].map((ri, k) => {",
     "    // S54 Sower: two seed buds swell on the roots at 2.4 s and 5 s (Kesh 18 Nov: 2 seeds, was 3).\n    const buds = [1, 4].map((ri, k) => {"),
    ("b.userData = { at: [1.17, 2.87, 4.45][k], // 1.6, 3.3 and 5 s after the throw (it plants at 0.43 s)",
     "b.userData = { at: [1.97, 4.45][k], // 2.4 and 5 s after the throw (it plants at 0.43 s)"),
])
print('patched')
