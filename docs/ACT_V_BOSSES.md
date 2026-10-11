# Act V bosses (content plan 4, slice 3)

Level V, The Still Spire, is now the campaign's last level, open to everyone:
`CAMPAIGN_ACTS` is 5 and `?act5=1` no longer changes anything. Its boss room,
the Belfry Crown (layout 32), meets one of two bosses, rolled by seed like
every act (`LEVELS[5].bosses` in `src/data/levels.js`; seeds 1 to 40 meet the
Skyhorn 22 times and the Hush 18 times). They replace the Geode Colossus and
Lich Ram stand-ins of the Act V world slice.

The plan left open whether Level V joins the campaign or stays post-win. This
slice takes the default: it joins the campaign for everyone. Clearing Level IV
now opens Level V, and clearing Level V wins the game.

| | The Hush | The Skyhorn |
|---|---|---|
| Role | the final boss: the silence that stopped the gods, the quiet the Hollow Cantor sang into | the Spire's warden: an ibex of the high ledges with horns cast in bell bronze |
| Kit | `src/sim/bosses/hush.js` | `src/sim/bosses/skyhorn.js` |
| Model | `buildHush` in `src/render/boss/spire.js`: a tall grey veil with a cracked bronze bell for a head and no clapper, a sleeve raised with one finger up, five small bells orbiting it that die one per Stillness | `buildSkyhorn` in the same file: a great ibex with scimitar horns of ridged bell bronze and a violet vein, a bell at its throat, gaits for pawing, the rush, a dazed stagger, the toll, a crouch and the leap |
| HP | `hpMul` 0.95 | `hpMul` 1.05 |
| Adds | three Stillnesses (below) | two kites and a gargoyle at 75 / 50 / 25 % |
| Deed, tint | Fell the Hush; Healer tint **Hush Veil** | Fell the Skyhorn; Tank tint **Sky Bronze** |
| Medal, sting, groove | a bell with a hand over its mouth; a breath lead over a knell; a sparse chime groove with rests | a horned head over a bell; a horn call over a knell; a galloping chime groove with tom hoofbeats |

## The Hush

It keeps 3 to 5.5 u from its target, like the Cantor.

- **Still Note.** A ring (r 1.8, 50-tick warning) at its target, 11 damage and
  a 35 % slow for 1.5 s on every hero it catches. From the Second Stillness
  the note leaves a patch of silence on the floor (a slick, 30 % slow, 3 s).
  Cooldown 230 ticks; 170 in the Third Stillness, where the ring grows to r 2.3.
- **Unringing.** A lane from its body to a target 2.5 to 9 u away (1.3 u wide,
  56-tick warning), 15 damage. It carries `lance: true`, so AI allies step out.
  Cooldown 320 ticks (260 in the Third Stillness).
- **Stillnesses.** At 75 / 50 / 25 % it stills one of its bells and the
  Spire's creatures come (`addsByPhase`): two kites and a gargoyle, then a
  chime and a gargoyle, then a hanger, a chime and a kite.
- **The Great Hush.** Right after each Stillness, and every 600 ticks after
  the first (480 in the Third), it rises and draws the sound out of the room:
  a ring r 4.6 round itself (96-tick warning), 20 damage. Then it is drained
  for 90 ticks: it sinks, attacks nothing and takes 30 % more damage. The
  answer is to walk out to the walls, then come back and hit it.

## The Skyhorn

- **Horn Rush.** It paws the floor while a lane (1.3 u wide) runs from it
  through its target to the wall (up to 11 u, 60-tick warning), then charges
  down it at 12 u/s. Each hero it touches takes 12 once and is thrown 2.2 u
  aside. A rush that ends against a wall or barricade leaves it dazed for 75
  ticks: no attacks, and it takes 25 % more damage. Cooldown 300 ticks (220
  enraged). When the rush is ready and its target stands at its horns, it
  backs off to make room for it. Enraged, a rush that does not end dazed chains into a second one
  (44-tick warning).
- **Bell Toll.** With a hero inside 2.6 u it clashes its horns: a ring r 2.9
  round itself (50-tick warning), 12 damage and a 30 % slow for 1 s.
  Cooldown 260 ticks.
- **Sky Leap.** From the Second phase (under 50 %) it bounds up and comes
  down on the farthest hero: a ring r 2.0 (72-tick warning; it is out of reach
  for the last 36 ticks), 18 damage, and six stone shards fly out (6 each).
  Cooldown 480 ticks.
- **Enrage** under 40 % HP.

Both kits make no RNG draws and keep the telegraph governor's rules (at most
two live player-targeted warnings, starts at least 72 ticks apart).

## Story

- **Chapter V, The Still Spire**, verse **Sky**. Level-clear cards add the
  fifth verse; Wick, Rill and Quill have five-verse lines.
- **Endings.** `endingFor(levels)` in `src/data/story.js`: the Barrow ending
  for a three-level campaign, the Heart ending for four, and the new **Spire**
  ending for five.
- **Rumours and the Hollow Voice.** Bramble names each boss before the Belfry
  Crown. The Hush: "You silenced my song. Now hear what I was singing into."
  The Skyhorn: "It kept the stair to the gods. I taught it to keep you off it."
- **Warden.** Felling either boss frees the Skyhorn's ghost at the camp's edge
  (`warden_ibex` in `src/render/npcs/wardens.js`, at x -9.8, z 4.4), with its
  own line.
- **Journal.** Both bosses have Bestiary rows (51 entries).

## Everything that follows the fifth level

| | Before | Now |
| --- | --- | --- |
| Campaign | four levels | five; Level IV leads on to Level V |
| Endless | five lands only with `?act5=1` | five lands always; the Spire is every fifth depth |
| Daily | four levels, 32 rooms | five levels, 40 rooms; the server's depth check follows `CAMPAIGN_ACTS` (`MAX_DEPTH` in server/daily.mjs) |
| Boss Rush | eight fights in two laps of four | ten fights in two laps of five (`LAP` in src/data/rush.js); a relic after fights 1, 3, 5, 7 and 9; Once Around is the first five; Against the Clock is under 12 minutes |
| Rush records | `rushBestSec` | `rushBestSec` plus `rushBestFights`: a best from the eight-fight rush stays in the profile but is not compared with ten-fight times |
| Deeds | Long Road: Levels I to IV | Levels I to V; Ringwalker counts Windward Court too; Kingslayer needs fourteen bosses |
| Champion room | | Level V still meets the Hollow Choir; the Spire's own champion is slice 7 |

## Verification

- `node tools/act5-bosses-probe.mjs` (headless): the wiring, both kits beat by
  beat, the governor, AI lane evasion, a campaign won at Level V, Boss Rush's
  ten fights, the Daily's 40 rooms, a save round trip mid-fight, the story
  lines and every new string in all ten languages.
- `node tools/act5-bossbench.mjs [--bosses hush,skyhorn] [--seeds 1-12]`: the
  autopilot party with the Level V starter kit dropped into the Belfry Crown.
  At v0.5.277: the Hush won 2/12 (median 59 s, boss left 57 %), the Skyhorn
  2/12 (103 s, 34 %). The same bench at Level IV: the Cantor 3/12, the Colossus
  0/12. First guesses until people play it.
- The nine goldens are unchanged (they never reach Level V).
- The lab (`?vfxlab=1`) has both bosses in its boss list and an Act V bosses
  section that jumps to each beat.
