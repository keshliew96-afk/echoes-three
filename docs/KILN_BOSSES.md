# The Kiln's bosses and the Level V fork (content plan 5, slice 8)

The Ember Kiln (docs/KILN.md) is no longer a preview. After Level IV the party
picks its road: the Still Spire or the Ember Kiln. Each road is a Level V with
its own bosses, verse and ending. A run is still 40 rooms, `CAMPAIGN_ACTS`
stays 5, and `?act6=1` no longer changes anything (`ACT6_PREVIEW` is kept so
old links still load).

The Kiln's boss room, the Firing Floor (layout 39), meets one of two bosses,
rolled by seed like every act (`LEVELS[6].bosses` in `src/data/levels.js`;
seeds 1 to 40 meet the Bellfounder 17 times and the Cinderback 23 times).
They replace the Geode Colossus and Lich Ram stand-ins of the Kiln world
slice.

| | The Bellfounder | The Cinderback |
|---|---|---|
| Role | the Kiln road's final boss: the gods' bell-founder, still at its casting pit, who poured every bell the gods ever rang and now casts them hollow | the Kiln's warden: the great fire salamander that kept the fire fed (the Ember Newts are its brood) |
| Kit | `src/sim/bosses/founder.js` | `src/sim/bosses/cinderback.js` |
| Model | `buildFounder` in `src/render/boss/kiln.js`: a hunched giant built like a bottle kiln, fire-brick courses with gold seams, a bell-shaped bronze mask with violet slits, an arched chest door with the fire behind it, slag arms carrying a crucible, a cracked bell at its hip. It tips the crucible to pour, heaves it overhead for a bell, throws its doors open for the Firing, and stands grey and sagging when quenched | `buildCinderback` in the same file: a long low salamander, sooty hide with two rows of live coals down its back, six gill stalks burning gold at the tips, a violet brow scale. It swims with an S, noses down and sinks out of sight for the dive, curls its tail round for the lash, rears with its throat white-hot to spit, and lies dull and sprawled when spent |
| HP | `hpMul` 1.0 | `hpMul` 1.05 |
| Adds | three Castings (below) | two newts and a Bellows Imp at 75 / 50 / 25 % |
| Medal, sting, groove | a bell over a crucible's pour; three anvil blows and a cast bell rung B-flat, A, B-flat; a forge-string groove that climbs a mould's shape and pours back down | a salamander from above with coals down its back; a hiss, a scuttle on the anvil and a low horn growl; a coiling forge-string groove with a scuttling drum |

Both play on the Spire's numbers (the Kiln has no difficulty row of its own
yet). No deed or tint is added for them: Kingslayer still counts the fifteen
campaign bosses of the Spire road and the Ringwalker the same arenas.

## The Bellfounder

It keeps 3 to 5.5 u from its target, like the Hush.

- **Molten Pour.** It tips its crucible down a lane from its body to a target
  2.5 to 9 u away (1.4 u wide, 60-tick warning), 14 damage. The bronze cools
  into three pools of slag down the lane (r 0.8, 30 % slow, 3 s). It carries
  `lance: true`, so AI seats step out. Cooldown 300 ticks (240 from the Third
  Casting).
- **Bell Drop.** A fresh-cast bell falls on its target: a ring r 1.9 (64-tick
  warning), 16 damage. Cooldown 240 ticks (190 from the Third Casting, where
  the ring grows to r 2.3).
- **Castings.** At 75 / 50 / 25 % it breaks open a mould and the Kiln's
  creatures crawl out (`addsByPhase`): two newts, then a golem and a newt,
  then two moths and an imp.
- **The Firing.** Right after each Casting, and every 600 ticks after the
  first (480 from the Third), it opens its chest: a ring r 4.4 round itself
  (96-tick warning), 20 damage. Then it is quenched for 90 ticks: it attacks
  nothing and takes 30 % more damage. Walk out to the walls, then come back
  and hit it.

## The Cinderback

- **Magma Dive.** It noses into the floor and a ring r 2.0 opens under its
  target (76-tick warning). For the last 46 ticks it is under the floor and
  cannot be hit. It bursts up for 16, leaves a slag pool (r 1.4, 30 % slow,
  3 s), and lies spent for 60 ticks (40 enraged): no attacks, 25 % more damage
  taken. Cooldown 320 ticks (240 enraged).
- **Tail Lash.** With a hero inside 2.8 u it whips its tail round: a cone r
  3.2, half-angle 65° (48-tick warning), 12 damage and a 1.8 u throw.
  Cooldown 240 ticks.
- **Ember Spit.** From half health it rears and spits three gobbets, one on
  each hero it can see (round its target when there are fewer), each on its
  own ring r 1.1 (60, 72 and 84 ticks), 9 damage each, each leaving a small
  slag pool. Cooldown 420 ticks.
- **Enrage** under 40 %.

## The fork

- The Level IV clear card offers both roads (`card.fork = { roads, pick }`;
  `src/sim/run.js` `forkRoads` / `pickRoad`, the `pickRoad` command). The card
  waits up to 30 s (`TRANSIT.forkTicks`); the host picks with ← → and Enter,
  1 / 2, or a click (`src/ui/run/transit.js`), and a guest sees "The Healer
  chooses the road…". If the card runs out with no pick, the party takes the
  Spire.
- The pick sets `campaign.road` (saved), re-points the card to the chosen
  Level V and emits `road_pick`, which the level manager follows to load the
  right land (`src/campaign/manager.js`). From then on `nextOf()` passes the
  road to `nextLevel()`.
- The Daily always runs the Spire road. Boss Rush keeps its five lands and ten
  fights. The Endless Descent keeps its five lands. Tutorial, Endless, Daily
  and Rush runs never fork.
- The level select shows the Kiln as a Level V card once Level IV is cleared.
  A profile that already held the Spire opens the Kiln too.

## Story

- The sixth verse, Flame, is the Kiln's chapter (`KILN_CHAPTER` in
  `src/data/story.js`); the Kiln road ends on `ENDING.kiln`.
- Wick and Quill have a sixth-verse line. Wick, Quill, Rill, Tolly and Sable
  have a five-verse line for a party whose fifth verse is Flame and not Sky.
- Bramble's rumours, the Hollow Voice's first-meeting lines, the boss-win and
  end-screen lines, and the Journal rows for both bosses.
- The Cinderback's warden (`warden_salamander`, `src/render/npcs/wardens.js`)
  curls up at the camp's edge once either Kiln boss is felled.

## Lab and checks

- `?vfxlab=1`: both bosses in the boss list, and a **Kiln bosses** section
  (pour, bell, the First and Third Castings, dive, lash, spit, enrage).
- `node tools/kiln-bosses-probe.mjs` (headless): the wiring and text, both
  kits, the telegraph governor, the fork (pick, default, autopilot, a Spire
  start, the Daily, the 40-room server check, a save on the fork card) and
  mid-fight save round trips.
- `node tools/act6-probe.mjs` covers the Kiln's world without a flag now.
