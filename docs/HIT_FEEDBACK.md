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
  white bloom twice a hit's area (2.0 u across, at 35 %).
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
- A near-white bloom about 2 body widths across (1.4 u at 30 %; 1.7 u for a
  skill; 1.2 x on a crit) lands on every party hit and holds full strength 100 ms.
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

## The cast, the shot, the reward and the aftermath (v0.5.341)

Part 2 of Kesh's "Go for 1" (`/mnt/project-files/plan/VFX_HIT_RULES.md` §6.2
f to o). Render and audio only, like Part 1: no damage, rule, deed or record
changes, and the nine goldens are untouched.

**f. Shots and spells (S1 to S5, S7, P4).** Every hero and foe shot
(`src/render/vfx/boltfx.js`, `SHOT_FX`):
- the head swells 1.6 x at the hand and settles to flight size in 0.1 s or
  1 u, round at the hand and stretched 1.8 x along its travel once it flies;
- the trail is 0.22 s of travel long (1.1 to 2 u);
- each shot has its own size (0.88 to 1.14 x), brightness (0.75 to 0.95 x) and
  height (-0.05 to +0.07 u), from the cosmetic stream;
- a floor light follows it (six at once at most);
- where it stops, the trail drains into the contact over 5 frames and 5 to 10
  sharp sparks show the spot;
- **l (R6):** about 1.5 body widths before it reaches a body, it lights that
  body's near side once (a soft flash and a light pool in its own colour,
  0.12 s, at 20 %; `NEAR_LIGHT`).

**n. The ranged hold.** A shot or spell that lands on a foe holds the foe's
squash, its white flash and its number 3 frames (render only, `REACT.rangedHold`,
`NUMERAL_FEEL.rangedHold`). The head holds at the contact and the burst
replaces it when the hold ends.

**g. Sound (A2 to A5; `src/audio/impactcues.js`).**

| Cue | When | What |
|---|---|---|
| `imp_boom` | a spell lands on a foe | a sub thump under a short high crack, a 0.3 s tail |
| `imp_thunk` | an arrow or bolt lands | a dull wooden knock |
| `imp_cut` | a blade lands | a bright cut over a low boom, gone in about 240 ms |
| `cast_whoosh` | a magic skill leaves the hand (never a heal, never the Tidecaller, who keeps her own water voices) | a breathy low rush |
| `shot_whiz` | from a frame after your own seat's shots, and a foe shot whose line passes within 1.6 u of your hero | a falling air whistle |
| `wall_ping` | a shot stops on a wall or a blocker | a short ring |

The families replace the plain `impact` snap on a party hit and share its
first-of-the-tick slot. Each plays with about ±6 % pitch. *My limit, not the
video's:* only your own shots and the foe shots that pass near you whiz, so a
busy room does not hiss.

**h. The weapon kick (B4).** Every rig's weapon snaps to its cast pose on
the first 2 frames of the release, in the shared driver
(`src/render/critters/driver.js`), so a press answers on its own frame.

**j. Slash ribbons (T2 to T6).** The blade template's swing trail fades in
on a concave ramp (opaque by 42 % of the arc), carries 7 streak lines that
boil in place, is at least 0.68 of the swing's reach wide, a 1.1 rad window
long, and **(L3)** thickest at the blade, thinning to a point toward the
swing's start. A 4-point white tip glint (0.65 u) flashes for 3 frames on
the first strike frame, and 6 to 10 short shards in the slash's own gold
(the Swordsman's silver) fly off the tip. The glint sits at the arc's start,
not traced from the rig's weapon tip (T1 is left for the rigs that expose a
tip).

**k. The local anime frame (§2.13).** On a combo finisher's contact (the
Crescent Finisher today) and on an elite, champion, stag or boss kill, a disc
about 3 body widths across lies on the floor at the contact for 4 frames: paper,
ink focus lines running in from its rim (the centre 42 % stays clear, so the
bodies keep their colour standing on it) and a black spike star at the hit
(`src/render/vfx/animefx.js`). No full-screen panel (Kesh's §6.3 item 8). Off
under Effects: Reduced.

**o. The camera punch (C2).** A field-of-view channel in camfx with its own
6 % clamp, scaled by Screen shake and Effects (off under Reduced): 6 % on an
elite, champion, stag or boss kill, 2 % on a chest's snap. A small kick
against the fire direction (0.015 u) on your own seat's shots, never the
Archer's or the Healer's (§6.3 item 7). The punches on ordinary hits wait
for Kesh (§6.3 item 4).

**m. The aftermath (D1 to D3).**
- A gold rim (a view-angle fresnel edge on the rig's own lit materials,
  `src/render/rim.js`) lights on a blade-template hit, flares 8 frames, holds
  at 42 % and is gone by 0.8 s. Foes and champions (classic and faceted);
  bosses keep their own hit looks.
- The two real burns, the Kiln Coal's and the Fire Bomb's patch, taper over
  their last second.
- A hit splashes the body's own matter colour on the floor behind it (one
  per body every 0.45 s) and throws droplets back toward the hitter.
- An Archer arrow that lands stays stuck in the floor, nose down, tail up
  along its flight, 0.55 u long, for 3 s, then fades (`STUCK`, a pool of 10).
- The Frost Bomb and the Frozen elite's burst leave their air: about 100
  tiny twinkles and a faint mist hold the place 1 to 1.9 s, and 16 more
  twinkles on each foe the bomb froze (`ELEMENT_AIR`).

**l. The flipbook (L4).** A crit's contact plays a 5-drawing book in pale
gold (`src/render/vfx/flipbook.js`): six jagged rays with a white core on
drawing 1, thinner on 2, broken at a bend on 3, in three pieces on 4, a short
fragment of each on 5, then a hard cut. Each drawing holds 2 ticks.

**i. Chests (O1 to O5; `src/render/interactables/chestbeat.js`).** The vault
chest, the secret reliquary and the secret cache:

| Beat | When | What |
|---|---|---|
| Wobble | a hero within 4.5 u | bouts of 3.5 swings onto one bottom edge then the other, about 2.3°; each swing quicker (0.3 s to 0.23 s a swing, the last 0.2 s), the bouts closer together as the hero nears (0.9 s rest far, 0.12 s close) |
| Press | the E (`vault_open`, `secret_take`) | the last half-swing settles in 0.1 s, then a squash to 0.92 tall, 1.07 wide (90 % of it in the first 8 of 15 frames) with a tremble |
| Snap | 0.5 s after the press | un-squash and hop 8 % of its width, narrowing 1.5 %, tipping a little; the lid half open on S and fully by S+3, a touch past and back, never slammed |
| Hold | S+4 to S+7 | the pose, the padlock, the light sheet and the stars hold at the top of the hop; particles run on. It lands on S+11 |
| Light | S on | a cream line round the rim for one frame; a cream sheet at rim height grows from 1.2 to 1.55 widths, breaks from its edges S+8 to S+10, gone S+11; the contents glow hot (#FFF589); from S+4 four soft rays fan up, quick for 1 s, then turning slowly for 2.2 s |
| Stars | S on | 8 five-pointed stars burst up 0.65 widths into an arc; from 0.87 s one pops every 0.1 s in random order (swells 2 x and whitens, a hollow outline, gone, a spark scatter); tiny sparks blink and rise for 2.6 s |
| Padlock | S on | flips up off the hasp, tumbles down the front, hits the floor on S+31, settles by S+35 and stays |
| Camera | S+5 | a 2 % zoom punch, eased out by about S+25 |

The end of the wobble, the squash, the snap and the hold fit inside the
reveals (1.2 s for the secrets, 1.4 s for the vault: sim numbers, unchanged).
The rays, the stars and the rising sparks run on after the draft, as the
vault's gold geyser always did. The vault's and the secret chests' existing
bursts now go off on the snap instead of the press; the vault's waits for
the end of the hold and is softer (a 1.4 u flash, not a 2.6 u held white-out),
so the snap, the lid, the sheet and the stars read. Its pillars, light,
sparks and gold geyser are about half as bright as before (Kesh 2026-10-27:
"the effect too bright"). The stars are a deeper
gold (#E9B949), drawn over the light. A chest built already
open (a loaded save, a joining guest) shows open with no burst.

- **The champion chest** has no press: it wobbles from the champion's fall
  and snaps on the clear (`champion_chest`), with the light, the stars and
  the padlock. The run UI then holds the room in view 1.5 s before the draft
  (`TAKE_HOLD_MS`, UI only, as after a Take).
- **The Trapped Chest** keeps its lure twitch. Its Take still springs the
  ambush at once; its lid is now flung open in 3 frames on Ember sparks spat
  from the lock, with no light inside and no stars, so it never reads as a
  safe chest. No reward beat on its later `event_chest`.
- **Sounds** (`src/audio/chestcues.js`, beside each chest's own cue):
  `cb_tremble` (the press), `cb_snap`, `cb_shine` (the light), `cb_lock` (the
  padlock lands) and `cb_stars` (a ting per pop, on the pop's frame). The
  press chests' layers wait the 0.5 s to the snap; the champion chest's
  (`_now`) start on its event.

**Probe.** `node tools/vfx-hit-feedback2-probe.mjs` (in `npm test`): shots
near the boar, the stuck arrow's life, the flipbook's drawings, the frost
air, the chest beat's whole timeline on the pure pose and through every chest
rig, the chest sounds' timing, the impact families, the whiz rule and the
colours. The cue figures come from `node tools/smallfixes2-cuecal.mjs --only
impactcues,chestcues --write` (a press layer takes its `_now` layer's figure).

### The glare budget (v0.5.341)

After Kesh's "too bright, can't see anything" (10-27), every additive wash the VFX kit draws is scaled by
`GLARE` in `src/render/vfx/kit.js`: floor lights ×0.65, flashes and blooms ×0.6, pillars ×0.65. It
stacks on the Effects setting's light gain. Slashes, rings, stars, marks and particles keep their strength,
so shapes and gameplay signals still read; only the wash over the bodies dims. The contact and kill
blooms, shot and near-side lights, and the vault's geyser, pillars and burst were also cut at their source.
