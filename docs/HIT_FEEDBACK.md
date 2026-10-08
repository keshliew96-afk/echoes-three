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
