# Third bosses: the Wood and the Mill (content plan 3, slice 10)

The Hollow Wood and the Sunken Mill each get a third boss, rolled by seed like
the others (`LEVELS[1].bosses` and `LEVELS[2].bosses` in `src/data/levels.js`).
Seeds 1 to 60 meet the Stag 20 times, the Thornmother 23 and the Gloam Wolf
17 on Level I, and the Heron 30, the Millwheel 16 and the Mire King 14 on
Level II. Adding a third row changes which boss a given seed meets in those
two acts (`bossIndexFor(act, seed) % n`); the Daily and Endless pick through
the same tables. Cantor stays the final boss.

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

`node tools/third-bosses-probe.mjs`: wiring, translations, every attack
landing, the yank, the Swallow's pull, the Hunt, the mire, the enrage, the
governor (at most two player-targeted telegraphs, starts 72 ticks apart),
level clears and save round trips. All numbers are first guesses until play.
