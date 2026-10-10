# Third bosses: the Wood and the Mill (content plan 3, slice 10)

The Hollow Wood and the Sunken Mill each get a third boss. Each one joins its
act's seed roll only once the save has felled that act's other two bosses
(the Stag and the Thornmother for the Gloam Wolf; the Heron and the
Millwheel for the Mire King). Until then a seed rolls between the original
two exactly as before, so old seeds meet the boss they always met.

- **The gate.** Boss rows marked `gated: true` (`LEVELS[1].bosses`,
  `LEVELS[2].bosses` in `src/data/levels.js`) join `bossPool` only for the
  acts in the run's `thirdBosses`. The camp passes `thirdBossActs(meta.bosses)`
  to `startCampaign`; the run keeps it (saved only while non-empty, and in
  the run view) and each cleared level records the boss it met.
- **The Daily** never meets a third boss, whatever the save: it stays the
  same run for every player.
- **Endless** follows the save, like a campaign: once open, the act's cycle
  runs through all three bosses; until then it alternates the original two
  as before.
- Unlocked, seeds 1 to 60 meet the Stag 20 times, the Thornmother 23 and the
  Gloam Wolf 17 on Level I, and the Heron 30, the Millwheel 16 and the Mire
  King 14 on Level II. Cantor stays the final boss.

| | The Gloam Wolf | The Mire King |
|---|---|---|
| Role | the Wood's oldest hunter: it closes distance in one bound | the millpond's old toad: it drags the party in and drops its weight on them |
| Kit | `src/sim/bosses/gloamwolf.js` | `src/sim/bosses/mireking.js` |
| Model | `buildGloamWolf` in `src/render/boss/third.js`: a grey night wolf with moonlit streaks, a black bramble mane with violet buds, violet eyes and throat | `buildMireKing` in the same file: a vast silt-dark toad with warts, a violet throat sac and maw, and a crown of rusted mill-grate |
| Room | Thornwood Ring (layout 21) | Millrace Basin (layout 23) |
| HP | `hpMul` 0.95 | `hpMul` 1.05 |
| Adds | two boars and a Shriek Owl at 75 / 50 / 25 % | two toads and a Mire Leech at 75 / 50 / 25 % |
| Deed, tint | Fell the Gloam Wolf; Swordsman tint **Gloamfang** | Fell the Mire King; Healer tint **Millpond** |

A boss row may carry `layout`: its boss room is drawn with that layout's
dressing (`rollLayout` in `src/sim/run.js`). Boss rooms carry no hazards, so
only the look changes.

## The Gloam Wolf

- **Pounce.** A ring (r 1.5, 54-tick warning) at a target 2.5 to 8.5 u away.
  It crouches, then bounds over the last 16 ticks and lands in the ring for
  15. Cooldown 260 ticks (190 enraged).
- **Rend.** With a body inside 2.7 u, a cone in front (2.8 u, 55 degrees
  either side, 36-tick warning), 13 damage. Cooldown 150 ticks.
- **Moon Howl.** A ring round itself (r 3.2, 60-tick warning): 8 damage and
  35 % slow for 1.5 s. Then **the Hunt**: its next two Pounces come back to
  back (48-tick warnings), each at whoever is farthest. First at 6 s, then
  every 600 ticks (420 enraged).
- **Enrage** under 40 %: faster on its feet, shorter cooldowns.

## The Mire King

- **Tongue Lash.** A lane from its mouth toward its target (1 u wide, up to
  7.5 u, 48-tick warning), 14 damage; each body hit is yanked 2 u toward it.
  `lance: true`, so AI allies step out of it. Cooldown 240 ticks (180
  enraged).
- **Belly Flop.** A ring (r 2.0, 66-tick warning) at a target 3 to 8 u away.
  It heaves up and lands there over the last 20 ticks for 16, leaving a ring
  of mire (35 % slow, 5 s; r 2.6 enraged). Cooldown 420 ticks (330 enraged).
- **Swallow.** A ring round itself (r 1.9, 78-tick warning). While it gapes,
  every hero within 6 u in front of it is drawn in at 1.6 u/s (walking away
  still wins); when it snaps shut, 18 damage. Cooldown 540 ticks, first at
  5 s.
- **Enrage** under 40 %: shorter cooldowns, wider mire.

## Identity

Each has a HUD medal (`src/ui/hud/icons.js`), an intro sting, a boss groove
(`BOSS_MUSIC` in `src/audio/music.js`), beat cues and tells
(`src/audio/bosscues.js`), signature VFX for every attack, its enrage and its
death (`src/render/vfx/signature.js`, tuned in `BOSS_VFX` in
`src/data/vfx.js`), a fall line on the end screens, a Bramble rumour, a
Hollow Voice line, a Journal page, and the Chapter I and II summaries name
it. Felling either frees its land's warden at camp, and felling the Mire King
frees the Verse of Water (and Rill) like the other Mill bosses.

The VFX lab (`?vfxlab=1`) has both in its boss-room list and a "Third bosses"
section firing each attack.

## Checks

`node tools/third-bosses-probe.mjs`: the gate (old seeds unchanged while locked, the Daily never, Endless cycles, saves), wiring, translations, every attack
landing, the yank, the Swallow's pull, the Hunt, the mire, the enrage, the
governor (at most two player-targeted telegraphs, starts 72 ticks apart),
level clears and save round trips. All numbers are first guesses until play.

# Third bosses: the Barrow and the Heart (content plan 3, slice 11)

The Ashen Barrow gets a third boss on the same gate as slice 10, and the
Hollow Heart gets one that is met only in the Endless Descent, so the Hollow
Cantor stays the campaign's final boss.

- **The Barrow.** The Ash Raven (`gated: true` on `LEVELS[3].bosses`) joins
  the Barrow's seed roll once the save has felled the Barrow Wyrm and the
  Lich Ram. Unlocked, seeds 1 to 60 meet the Wyrm 21 times, the Raven 23 and
  the Lich Ram 16 on Level III. Locked, every seed meets the boss it met
  before.
- **The Heart.** The Vein Weaver carries `gated: true` and `endlessOnly:
  true`. `bossPool(lv, act, open, endless)` leaves an `endlessOnly` row out
  unless `endless` is set, and only `endlessBossIndex` sets it, for depths
  past the first cycle (`beyondCampaign`). So a campaign's Level IV, and
  Endless Depth 4 (the campaign's own Heart), always end on the Cantor or the
  Colossus, unlocked or not. Once the save has felled both of them, the Heart
  at Depths 8, 12, ... cycles through all three: every seed meets the Weaver
  at Depth 8 or Depth 12.
- **The Daily** never meets either, whatever the save.

| | The Ash Raven | The Vein Weaver |
|---|---|---|
| Role | the barrow's carrion bird: it owns the air above the mounds, dives the length of the room and calls its crows down on whoever it marks | the Heart's own spider: it ties the party to itself, then makes the Heart beat |
| Kit | `src/sim/bosses/ashraven.js` | `src/sim/bosses/veinweaver.js` |
| Model | `buildAshRaven` in `src/render/boss/third.js`: a huge black raven, ash-grey feather tips, a cracked bone mask with violet coals in the eye holes | `buildVeinWeaver` in the same file: plum flesh and legs, a cut-crystal abdomen whose veins light on the beat, violet eyes, bone fangs |
| Room | Ash Amphitheatre (layout 25) | Hollow Nave (layout 27) |
| HP | `hpMul` 1.0 | `hpMul` 1.1 |
| Adds | two Barrow Crows and a Grave Wisp at 75 / 50 / 25 % | two Hollow Husks and a Vein Siphon at 75 / 50 / 25 % |
| Deed, tint | Fell the Ash Raven; Tank tint **Ashfeather** | Fell the Vein Weaver; Swordsman tint **Veinsilk** |

## The Ash Raven

- **Carrion Dive.** A lane from it through its target (1.2 u wide, up to
  9 u, 50-tick warning). It rises with its wings beating, then dives the
  lane over the last 14 ticks for 15 and lands at the far end, where it
  preens for 40 ticks: the party's punish window. Cooldown 250 ticks (180
  enraged). `lance: true`, so AI allies step out of it.
- **Wing Gust.** With a body inside 2.8 u, a cone in front (3.4 u, 60
  degrees either side, 40-tick warning): 10 to every body in it, and each is
  blown 2.6 u away over 10 ticks. Cooldown 280 ticks.
- **Omen.** A ring r 1.4 on its target (84-tick warning). For the first 54
  ticks the ring follows that hero at 2.4 u/s, so a hero who keeps running
  stays ahead of it; it locks for the last 30, then the crows come down for
  14. Enraged, it leaves a patch of ash (30 % slow, 4 s). Cooldown 420 ticks
  (320 enraged), first at 4 s.
- **Enrage** under 40 %: faster on its feet, shorter cooldowns.

## The Vein Weaver

- **Bind.** A lane toward its target (0.9 u wide, up to 8 u, 44-tick
  warning): 9, and every body in it is bound for 2.5 s. A bound hero cannot
  walk farther than 3.6 u from it (3.0 enraged): a hero caught at the far end
  is reeled in to the leash over about ten ticks and held there.
  Cooldown 300 ticks (220 enraged). `lance: true`.
- **Heartbeat Slam.** With a body inside 2.6 u, or anyone bound, a ring r
  2.8 round itself (60-tick warning) for 18, leaving four vein patches (40 %
  slow, 4 s). A bound hero who pulls the thread tight stands just outside
  it. A landed Bind brings the next Slam forward. Cooldown 300 ticks.
- **Brood Sacs.** Three egg sacs lobbed at its target and either side of it,
  each a ring r 1.1 (64-tick fall) that bursts for 10 and leaves a web (50 %
  slow, 4 s). Cooldown 400 ticks (320 enraged).
- **Enrage** under 40 %: faster, a shorter thread and shorter cooldowns.

## Identity

The same set as slice 10: a HUD medal, an intro sting, a boss groove, beat
cues and tells, signature VFX for every attack, its enrage and its death
(the Raven's dive tears a furrow of embers and feathers down the lane, its
Omen brings streaks of crows down out of the sky; the Weaver's thread is
drawn from its spinnerets to each bound hero while it holds, and its Slam
cracks the floor into lit veins), a fall line on the end screens, a Bramble
rumour, a Hollow Voice line, a Journal page, and the Chapter III and IV
summaries name them. Felling the Raven frees the Barrow's warden at camp.
The slicks carry two new variants, `ash` and `vein`
(`src/render/enemies/extras.js`).

The VFX lab (`?vfxlab=1`) lists both in its boss-room list and fires each
attack from its "Third bosses" section.

## Checks

`node tools/third-bosses-bh-probe.mjs` (headless): the gate (old seeds
unchanged while locked, the Heart never in a campaign, the Weaver only past
the first Endless cycle, the Daily never, saves), wiring, translations,
every attack landing, the Omen following then locking, the gust's shove, the
Bind's leash, the enrage, the governor, level clears and save round trips.
`node tools/third-bosses-bh-browser.mjs` (against `npm run dev`): rigs,
arenas, medals, stings, grooves, beat cues and screenshots. All numbers are
first guesses until play.
