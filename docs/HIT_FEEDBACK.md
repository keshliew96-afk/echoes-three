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
| Colour | Hearth Amber `#E8A23D` | Bone `#C9C2B3` (was Parchment) |
| Weight, outline | 900, 3 px charcoal | 600, 2 px charcoal |
| Size | 1.22 x the old size | 0.7 x the old size (never under the 20 px floor) |
| Opacity | full | 45 % (Kesh's pick over 70 % Parchment, 2026-10-19) |
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

## The hit and the kill (v0.5.333)

Kesh (2026-10-26): "Go for 1", the VFX and hit feedback slice from his nine
reference videos (`/mnt/project-files/plan/VFX_HIT_RULES.md` §6.2, Part 1:
items a to e). Render and audio only: no damage, rule, deed or record changes,
and the nine goldens are untouched. Part 2 (§6.2 f to o: the cast, the shot,
the reward and the aftermath) is its own PR.

**a. The hit reaction (R2 to R5).** Every foe, champion and boss rig reacts
to a hit on a wrapper node the layer inserts between the rig's group and its
body, so the shadow, the elite crown and every floor piece stay on the floor
(`src/render/react.js`, wired in `src/render/enemies/index.js` and
`src/render/boss/index.js`; it works on any rig, classic or faceted).

| | What it does | Size |
|---|---|---|
| Squash (R2) | a hard cut to full squash, held 2.5 ticks, then a damped stretch back to rest; a new hit restarts it, so rapid hits keep the body squashed | +12 % wide, 12 % shorter on a melee hit; a shot +13 % wide, 6.5 % shorter; a skill or spell +20 % wide, 12 % shorter; a crit 1.2 x; burns, auras, thorns and hazards 0.35 x |
| Flinch (R3) | the body widens along the hit with its near edge anchored, so its far side bulges away | half the squash |
| Hop (R4) | a hop, a tilt back then forward, a stretch in the air and a landing squash, sized to the distance the sim really pushes the body (the hit's knockback times the body's own kbScale, read on the first tick it moves) | 0.4 u lift at a 0.55 u push, lands in 14 ticks; no push, no hop |
| Bosses and champions (R5) | half the squash and flinch; champions keep a small hop at their small push; bosses never hop | 0.5 x |

- Everything counts in sim ticks, so it holds through the hitstop like the
  hit flash. A weaker hit (a burn or aura tick) never cuts a stronger squash
  still in play.
- A standing body squashes with its base on the floor; a floating one (moths,
  wasps, wisps, censers, owls, kites, chimes, the Hollow Choir) about its
  middle.
- The Gallows Hanger and the Bell Abbess hang on ropes: they widen only, never
  shorten, tilt or hop. The Bog Lamprey, the Leech and the Barrow Wyrm are
  coiled on the floor: they shorten only, so the coil does not slide.

**b. The render hold (F1, I3).** A `hitstop` event (2 ticks on a melee
connect, 3 on a kill) now holds the render for the same time: the rig clips
(foes, champions, bosses, heroes, dummies), the kill pop, the slash ribbons'
sweep and the flares pause for exactly the frozen ticks the game clock
consumes, so the frame of the hit stays on screen at any frame rate (at
60 fps: the hit frame plays, the next 2 or 3 frames hold). A co-op guest,
whose clock never freezes, holds from the frame after each replayed
`hitstop`. Below 60 fps the clock can freeze inside the hit's own frame;
the flares and blooms that hit made that frame owe exactly that part
(`renderHold.dueBorn`), so they hold as long as the rigs at any frame rate.
Particles, numbers' drift, telegraphs, the camera and the audio keep
running; a number's pop holds with the rigs and stops holding when the
freeze ends (a staggered numeral on a cleave shows after it and never
holds). No window holds more than 4 ticks (`src/render/hold.js`). The kit's
flash pool is 64 (was 28), since each hit now keeps two flashes.

**c. The kill (K1, K2, K4, P1, A6).**
- The body holds 2 frames, swells round (1.38 x wide, 1.3 x tall), then pops
  flat (`KILL_*` in `src/render/enemies/index.js`).
- The body is thrown half a body width along the killing hit and tips up to
  1.2 rad as it goes, still popping flat on the floor. A body killed mid-hop
  sinks to the floor through the pop.
- The bone-white flare holds bright 117 ms (5 frames with the freeze) over a
  white bloom twice a hit's area (2.3 u across).
- The ground ring of the body's matter lives 0.22 s and draws under the floor
  warnings, so it never reads as a telegraph.
- The debris bursts 0.1 s in (held time), as the body pops, and leans along
  the killing hit.
- The kill sound keeps its pop, then rings on in a low rumble (150 to 60 Hz
  over a 55 to 38 Hz body) with a high crackle from +0.3 s; all of it is gone
  inside 0.8 s.

**d. Numbers (N1 to N3).** The outgoing numerals fly a ballistic arc that
drifts about 0.3 u to alternating sides (two fanned numerals never cross).

| | Your hits | Everyone else's | Heals | Damage you take |
|---|---|---|---|---|
| First frame | big white (Parchment) pop, held through the hitstop | their own small pop in Bone | Bright Heal "+n" | Bruise Umber, drops |
| Settles to | Hearth Amber within 0.1 s (3 frames), in 3 colour steps | Bone at 45 % | unchanged | unchanged |
| Crit | 1.55 x (was 1.4) and a "CRIT!" tag a frame later, tilted toward its side, then upright | 1.4 x, no tag | | |

The tag is drawn from the numeral's `data-tag` (the text stays the bare
number). It is new text in all ten languages: KRIT!, ¡CRÍTICO!, CRITIQUE !,
クリティカル！, 치명타!, CRÍTICO!, КРИТ!, 暴击！, 暴擊！. Two fanned crits are spaced on
the tag's real width (full-width CJK characters count 1 em), and a tagged
numeral pinned at the top edge keeps room above it, so the tag stays on
screen.

**e. The contact (P3, L5, P1, R1, I1, A1).**
- A near-white bloom about 2 body widths across (1.6 u; 2.0 u for a skill;
  1.25 x on a crit) lands on every party hit and holds full strength 100 ms.
  It is white, not the class glow, because the Healer's glow is your numbers'
  Hearth Amber. It dims where many glows stack and under Effects: Reduced.
- The class flare and flash hold full strength 100 ms too.
- A magic hit leaves through the far side: about 6 gold streaks out past the
  target's far edge within 25 degrees, 3 back toward the caster, and the
  stardust leans along the hit.
- A spell hit (the Healer's, the Tidecaller's and the Bellwright's own hits;
  never a heal) holds the white flash 5 ticks, then fades it over 27.
- The first `impact` cue of a sim tick always starts the frame it is heard,
  like a telegraph, so the thump lands with the flash; the rest of the tick's
  hits queue under the audio budget as before.

**Probe.** `node tools/vfx-hit-feedback-probe.mjs` (in `npm test`): the
render hold, the curves, every foe, champion and boss rig built and hit
through the real layers, the kill through a freeze, the contact and kill
effects, the numerals in a stub DOM, the kill cue and the colours. Probe
surfaces: `__echoes.content.enemyfx().react` and `.kills`,
`__echoes.content.renderHold()`, `__echoes.numeralsLive()`.
