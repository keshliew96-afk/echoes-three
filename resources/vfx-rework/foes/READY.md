# VFX rework PR 2: enemies, champions and bosses (draft PR #103, v0.5.322)

## What it does
Every foe now plays one of your three templates on top of its own look. The Ember telegraph shapes on the floor are unchanged.

| Moment | What plays |
|---|---|
| Wind-up | The template gathers on the body: sparks, stardust or neon squares are drawn in. Champions and bosses also open a circle. |
| Strike | When the attack lands, its telegraph shape fills. A **ring** bursts as a fire ring and fireball, an arcane circle with a celestial burst, or a hex circle with a holo burst. A **cone** slashes as a fire crescent, a spell wave or three lasers. A **lane** streaks as a fire wake, light pillars or a laser. |
| Shot | A muzzle flash, then a trail of the template behind the shot. |
| Hit | A small template impact where a foe's blow lands on a hero. |
| Support | Snail and Censer mends, and Sexton burials, show as a glowing ward. The Gravewisp's tether shows as a beam. |
| Fall | A champion's fall and a boss's death end in the template's biggest burst. |

**Colours (enemy vs hero):** foe fire and foe spells burn Ember, because an enemy attack is a threat. Heroes' fire stays gold. Hollow Heart casters and every boss's magic use corruption Violet. Machines use neon magenta first. No foe effect is green.

**Size:** champions play half again as big, and bosses play twice as big.

## Which foe uses which template
Claws, bites, slams, stings, spears, darts and thrown things use **blade**. Spells, songs, spores, spirit light and wards use **magic**. Machines use **sci-fi**.

| | blade | magic | sci-fi |
|---|---|---|---|
| Enemies (42) | 24 | 15 (6 corrupted) | Chime, Vane, Bellows |
| Champions (12) | 6 | Hollow Choir, Gravebell Ringer, Vein Matron, Bell Abbess | Lockkeeper, Glassblower |
| Bosses (17) | Stag, Heron, Wyrm, Colossus, Gloamwolf, Ashraven, Skyhorn, Cinderback | Thornmother, Lich Ram, Cantor, Mire King, Veinweaver, Hush (all Violet) | Millwheel, Hourwarden, Founder |

Magic enemies: Toad, Moth, Rotcap, Snail, Gravewisp, Owl, Keener, Sexton, Sacristan, Cindermoth, Ashwraith, plus the corrupted Lancer, Censer, Bloom and Siphon. The full table is `FOE_TEMPLATE` in `src/data/vfx.js`.

## Checks
- **`node tools/vfx-foes.mjs`:** all passed.
  - Spawned alone, all 42 enemies and 12 champions played their template.
  - All 17 bosses, each in its own boss room, played their strikes and their death burst.
  - No foe colour is Bright Heal, and no hero colour is Ember or Violet.
- **Hero fights** (`vfx-rework.mjs`): still pass.
- **Goldens:** 9/9.
- **Build:** clean.
- **`npm test`:** 25/25. I took in the CI fix, so GitHub CI should be green.
- **Presentation only:** no damage, timing, rule, deed or record changed.

## Caveat
I've only seen the looks in software rendering, on a virtual 30 fps clock. I haven't seen them on a real GPU.

## Shots
- `sheet-lab.png` and `lab-*.mp4`: a ring, cone, lane, shot and fall for a boar (blade), a keener (magic), a lancer (corrupted), a vane (sci-fi), the Briar Knight and the Stag.
- `sheet-fights.png`, `fight.mp4`: the heroes against a mixed pack.
- `boss-stag.mp4`, `boss-thornmother.mp4`, `boss-hourwarden.mp4`: one boss per template.

## Open choices (built as written; each is yours to pick)
1. **Ember on enemy attacks.** Enemy fire and enemy spells burn Ember to match the floor warnings. The alternative is a darker crimson, which keeps Ember for the floor shapes alone.
2. **Sci-fi foes.** Only machines use sci-fi (3 enemies, 2 champions, 3 bosses). More could use it, for example the Kiln's Furnace Knight and Hurler.
3. **Bosses all Violet for magic.** Every boss's magic uses the corruption Violet. Each boss could instead keep its own magic colour.
4. **Support glow.** Enemy mends glow Ember and gold, not green, so they never read as a party heal. A softer look is an option if they read as threats.
