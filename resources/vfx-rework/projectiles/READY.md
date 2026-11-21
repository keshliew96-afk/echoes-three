# VFX rework PR 3: projectiles (v0.5.323)

## What it does
Every shot in flight now wears its template as its body. This covers heroes, enemies, champions and bosses alike.

| Template | In flight | Trail | Where it stops |
|---|---|---|---|
| Blade | A blazing comet: a white-hot head and a flame tail | Fire sparks and embers | A small fireball |
| Magic | A star orb: four turning rays and a ring of runes, with a light ribbon behind | Stardust | A celestial burst |
| Sci-fi | A neon laser bolt with scanlines and glitch tears | Holographic squares | A holo burst |

- The tail stretches with the shot's speed.
- A shot that runs out of range fizzles.
- A hit keeps the impact it already had.
- Each projectile plays its owner's colours:
  - Hero shots use their skill's template. A heal bolt is green and gold.
  - Foe shots use the shooter's template: Foe Crimson for fire and spells, Violet for corrupted casters and boss magic, and neon magenta for machines.
  - Champion shots are half again as big, and boss shots are twice as big.
- Lobbed globs fly on the same arc as their body. They now land with their thrower's ring strike, which was missing before.

## Who shoots (every one in the data)
- **Heroes:**
  - The basics: the Healer's bolt and the Archer, Tidecaller and Bellwright basics.
  - 14 projectile skills:
    - Archer: Piercing Shot, Volley, Vault Shot, Pinning Arrow, Hunter's Mark and Feather Fan.
    - Tidecaller: Riverbolt and Torrent.
    - Bellwright: Clapper and Knell.
    - Healer: Mending Bolt, Spirit Bolt, Lantern Flurry and Pale Lance.
  - The Tank, Swordsman and Duskwing fire no projectiles.
- **Enemies:** the Mantis, Crow and Vane shoot. The Toad, Rotcap, Miller and Geode lob.
- **Champions:** the Hollow Choir and the Vein Matron.
- **Bosses:** the Millwheel, Skyhorn, Colossus, Cantor, Lich Ram, Veinweaver, Cinderback and Thornmother.
- **Not included:**
  - The Hourwarden's weight drops rather than flies, so it keeps its own look.
  - Elite-affix globs are pools, not shots.

## Checks
- **`node tools/vfx-bolts.mjs`:** every shooter above drew its template head.
  - All 14 skills, cast at dummies.
  - All 4 basics, in two four-hero fights.
  - All 9 enemies and champions, each spawned alone.
  - All 8 bosses, each in its own boss room.
- **Goldens:** 9/9.
- **Build:** clean.
- **`npm test`:** 25/25.
- **Foe probe:** still passes.
- **Presentation only:** no damage, timing, rule, deed or record changed.

## Caveats
- I've seen these effects only in software rendering.
- The heroes' gold fire comets bloom very bright on the lamp-lit floors. I've softened them a little.

## Crimson cores (Kesh's pick)
- Enemy shots wear no Ember anywhere now. Their glow, trail, streak, muzzle flash and stop spit take the shooter's hue: Foe Crimson, Violet or neon magenta. Ember stays on the floor warnings.
- The probe now checks that no enemy shot wears Ember.
- **Shots:** `sheet-enemy-shots.png` shows a Mantis, a Vane and a Vein Matron shot in flight. The rest of the sheets were re-filmed after the change.

## Shots
- **Projectiles in flight:** `sheet-lab.png` (hero, foe, and champion and boss shots) and `lab-*.mp4`.
- **Every projectile skill cast:** `sheet-casts.png`, `cast-*.png` and `casts-A.mp4` / `casts-B.mp4`.
- **Four-hero fights against shooters:** `sheet-fight-A.png`, `sheet-fight-B.png` and `fight-*.mp4`.
