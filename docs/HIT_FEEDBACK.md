# Hit feedback

Kesh (2026-10-08): "add in 受击提示, so player know was getting hit by mobs".
Shipped in v0.5.250.

## What the player sees and hears

When the character **you play** (your seat: the class you picked, or your
co-op seat) is hit:

| | Light hit | Heavy hit | Over time | Hit that downs you |
|---|---|---|---|---|
| Edge vignette (crimson) | pulse, scaled by the share of the bar | strong pulse | low, slow, merges (never strobes) | strongest |
| Side glow on the edge toward the attacker | yes | yes | no | yes |
| Arc around your character pointing at the attacker | yes (0.6 s) | yes, wider | no | yes |
| Rig flash (crimson) | yes | yes | faint, at most every 0.35 s | yes |
| Camera kick along the blow | no | yes | no | yes, stronger |
| Sound | the party thud (`hurt`) | `hurt_heavy` | `hurt_soft` | `hurt_heavy`, then `downed` + `hurt_down` |

Every party member (AI or a co-op partner) also flashes crimson when struck,
so you see an ally being hit; their hits never touch your screen.

- **Heavy** = a hit that takes 15 % of the health bar or more (10 % from a
  boss). **Over time** = hazards (`delivery: 'hazard'`), Molten burn, Thorned
  recoil. A hit the shield takes whole shows nothing.
- Pain crimson (`rgb(194, 22, 40)`) is deliberately deeper and bluer than
  Ember Danger, the telegraph orange: "you were hit" never reads as
  "something is about to hit you".
- Nothing shows in the camp, in menus or on the between-room pages.
- The camera kick is the VFX camera kick: Screen shake and Effects ▸ Reduced
  scale or remove it.

**Settings ▸ Gameplay ▸ Hit feedback** (on by default, applied at once, all
ten languages) turns all of the above off; the party thud keeps playing as
before.

## Why an arc around the character and not a marker on the screen edge

The screen edge already carries the off-screen threat pointers
(`src/ui/hud/threat.js`), docked on the frame. Most blows come from a body
within a couple of units of you, so the direction reads best right on your
character; the edge still glows toward the attacker through the side glow.

## Code

- `src/render/vfx/hitfeedback.js`: tiers (`hitTier`), the DOM layer
  (`#hit-fx`, z-index 9: under the run veil and the HUD), rig flashes, kick.
  Only opacity and transform change per frame; nothing is allocated per frame.
- `src/render/critters/index.js`: `critter.hitFlash(k, hex)` lerps the
  critter's own toon materials' emissive.
- `src/audio/hitcues.js`: the three cues and the `hit` / `downed` handlers
  (own body only; null leaves the built-in cues). Calibrated with
  `node tools/smallfixes2-cuecal.mjs --only hitcues --write`.
- `src/ui/run/hitfeedback.js`: the setting `gameplay.hitFeedback` and its row.
- Render, HUD and audio only: the goldens are untouched.

## Review and probe

- `?vfxlab=1` ▸ Hit feedback: Light, Heavy, Over time, Downed (a preview hit on
  your character from the upper left) and Live hits (two boars and a mantis
  at the party).
- `node tools/hitfeedback-browser.mjs` against `npm run dev`: tiers, the
  setting, live light / heavy hits (vignette, arc, flash, kick, sounds), an
  ally's flash, the toggle off, the lab preview, nothing in the camp.
- Probe surface: `__echoes.content.hitFeedback()` (counts per tier, live
  vignette / side / arc levels), `__echoes.content.hitPreview(tier)`.

## Your damage numbers (攻击反馈)

Kesh (2026-10-19): "enhance 攻击反馈 let player know the damage deal … full
screen of number with same color, only heal is different". Shipped in v0.5.312.

Damage numbers on enemies split by who dealt the hit:

| | Your hits | Everyone else's (AI seats, co-op partners, hazards, kegs) |
|---|---|---|
| Colour | Hearth Amber `#E8A23D` | Parchment `#F4EFE6` (as before) |
| Weight, outline | 900, 3 px charcoal | 700, 2 px charcoal (as before) |
| Size | 1.22 x the old size | 0.8 x the old size (never under the 20 px floor) |
| Opacity | full | 70 % |
| Pop-in overshoot | 0.5 (crit 0.8) | 0.2 (crit 0.4) |
| Stacking | drawn above every other numeral | under yours |

- **Yours** means your seat, the same rule as the own-body hit feedback above:
  the class you picked solo, your seat in co-op (`viewerSeat()`), so each
  co-op player sees their own hits in amber on their own screen. The seat
  comes from the hit's attacker body (`hitterSeat` in
  `src/render/numbers.js`); the Healer's basic bolt carries no attacker id
  and is the only party carrier that does not, so a basic projectile hit with
  no attacker is seat 0's.
- When the 12-numeral cap is full, the oldest numeral that is not yours fades
  first, so a crowd of ally hits never pushes yours off the screen.
- Unchanged: crits still print 1.4 x larger with a stronger pop; damage the
  party takes stays Bruise Umber with a Parchment outline and drops instead of
  rising; heals stay Bright Heal with "+"; the Bone "(n)" shield share and the
  "blocked" numeral are untouched.
- Hearth Amber is the palette's "selection" colour: never Ember (enemy
  threats), Bright Heal or Violet.
- Render only: no damage, rule, deed or record changes, and the goldens are
  untouched. No new text and no setting.
- Probe: `node tools/attack-feedback-browser.mjs [--lang zh-Hans] [--classes healer,archer] [--act 6]`
  (pure attribution checks, then a live room-3 fight per class with both
  looks in one frame, their styles, and the game's own/other split matched
  against a count the probe makes from the hit events). Probe surface:
  `__echoes.numerals()` (outgoing numerals spawned per look).
