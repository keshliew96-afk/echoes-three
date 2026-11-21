# VFX rework PR 1: the heroes (draft PR #102, v0.5.320)

## What it does
All seven heroes now use your three VFX templates. The new effects are drawn on top of each hero's existing class effects. Every effect is generated in code.

- **Magic:** a glowing rune circle under the caster, an ethereal light beam, a celestial burst with rays, purple and gold stardust, and light that rises from a kill. Magic heals swap the purple for Bright Heal green and keep the gold.
- **Knife and sword:** a blazing fire crescent on every swing with golden wave afterimages, sharp sparks, and a fireball at the blade tip. Placed blade skills add a gold sun circle with a fire ring. Rain skills drop flaming shafts.
- **Sci-fi:** a neon cyan and magenta laser, a holographic square burst with glitch, and a hex targeting circle. No hero carries a tech weapon, so sci-fi plays in the VFX lab for now. The enemy pass (PR 2) will use it.
- **Crowds:** a burst that lands where many effects are already glowing comes in fainter, so a four-hero fight doesn't wash out to white.

## Which hero uses which template
| Hero | Basic attack | Skills |
|---|---|---|
| Healer | magic | magic (heals in green and gold) |
| Tank | blade | blade |
| Swordsman | blade | blade |
| Archer | blade (the closest fit for arrows) | blade |
| Tidecaller | magic | magic |
| Bellwright | magic | magic; Bell Swing is blade |
| Duskwing | blade | blade for Blood Bite, Talon Rake, Dusk Dive and Blood Scent; magic for Nightfall, Echo Screech, Bat Swarm, Shadow Veil, Flit, Blood Moon and Night Wings |

## Checks
- **`node tools/vfx-rework.mjs`:** every check passed.
  - All 85 hero skills map to a template, and every active skill played its template in game: Healer 17, Tank 10, Swordsman 9, Archer 10, Tidecaller 10, Bellwright 10, Duskwing 9.
  - Both four-hero fights played blade and magic effects.
  - No reserved colour hex is used, and the blade fire stays at least 20° from Ember.
- **Goldens:** 9/9 identical.
- **`npx vite build`:** clean, with only the two expected warnings.
- **`npm test` and GitHub CI:** 24/25. The one failure is `server-hardening-probe`, which also fails on gauntlet and is being fixed in the "Make CI pass on GitHub" thread. I left a note on the PR.
- **Presentation only:** no damage, timing, rule, deed or record changed.

## Caveat
I've only seen the looks in software rendering, as frames from a virtual 30 fps clock. I haven't seen them on a real GPU. The magic bursts are bright under bloom: the heroes stay readable, but the Healer's big casts near the glowing Waystone come close to white.

## Shots
- `sheets/<hero>.png`: every skill of one hero, one cast each.
- `stills/`: the same casts at full size.
- `reel-A.mp4`: Healer, Tank, Swordsman and Archer.
- `reel-B.mp4`: Tidecaller, Bellwright and Duskwing.
- `fight-A.mp4`, `fight-B.mp4` and `fight-*-N.png`: a busy four-hero fight for each team.

## Open choices (built as written; each is yours to pick)
1. **Arcane purple vs corruption Violet.** The template's purple `#A24BFF` sits about 10° from Violet `#B79CF0`, which is reserved for corruption. The lab's Purple button switches it to a magenta `#D84CF0`, 32° away. It is vivid by default.
2. **Archer as sci-fi?** Arrows have no template of their own. I picked blade as the closest fit, but sci-fi lasers would also read well.
3. **Hero hue as the main tone.** Right now each template uses its own palette, so every blade hero is gold fire. The alternative tints each hero's template with their own class colour, such as the Swordsman's crimson.
4. **Brightness.** The magic bursts could run about 25% dimmer if they look too hot on a real screen.
5. **Fire gold vs your amber damage numbers.** Your own numbers keep their outline and draw on top. A cooler gold for the fire is an option if they ever blend.
