# Relics and curses (content slice: "collect")

The between-room half of the gauntlet loop: relics you keep for the whole run,
and curses you can choose to walk into for a relic. Code: `src/sim/relics.js`
(data + system), hooks in `src/sim/run.js` and `src/sim/combat.js`, pages in
`src/ui/run/relic.js`, `relicstrip.js` and `path.js`, VFX in
`src/render/vfx/signature.js`.

## How a run uses them

- **Free relic.** After the draft of room 1 of every level, a relic page offers
  three relics; take one. That is one per level, three per campaign.
- **Cursed doors.** Each path screen has a 60% chance that one of the two doors
  carries a curse (violet mark on the door, a note naming the curse under the
  legend). The other door is always clean, so the player trades the reward
  type they wanted against the risk.
- **Curse reward.** A curse lasts its room only. Clearing a cursed room opens
  "THE CURSE LIFTS", a relic page with three more relics. A defend soft-fail
  forfeits it with the room's reward.
- Relics ride across level clears and appear in the run summary
  (`summary.relics`). They are wiped when a new run starts.
- The relic strip under the Glint plate shows every relic (hover for its text)
  and, during a cursed room, the curse's name.
- Network play: the relic page is a party decision made by the host seat, like
  the doors. A guest's press is shown to the party as a ping.

## Relics (27)

Weights for the three-card roll: common 6, rare 3, legendary 1 (drawn without
replacement; an owned relic never comes back). With every relic owned, a pick
pays 20 Glint instead.

| Relic | Rarity | Effect |
|---|---|---|
| Whetstone | common | Party damage +12% |
| Ember Tooth | common | Party crits ×2 instead of ×1.5 |
| Hawk Feather | common | +7% crit chance on party hits and heals |
| Lantern Oil | common | Healing on the party +20% |
| Millstone | common | Party knockback +75% |
| Grave Coin | common | +6 Glint per combat-room clear |
| Peddler's Seal | common | The Healer's shelf at the peddler is 25% cheaper |
| Wyrm Scale | rare | The party takes 15% less damage |
| Hearthstone | rare | Room clear heals the party 25% of max HP |
| Heron Quill | rare | Every room opens with all party skills ready |
| Thorn Mail | rare | Enemies that hit the party take 60% back |
| Leech Fang | rare | Each party kill heals the most wounded member 4 HP |
| Last Light | legendary | Once per room, each member who would fall stays at 1 HP |
| Glass Heart | legendary | Party damage +35%, damage taken +20% |
| Ashen Crown | legendary | +8% party damage per curse taken this run (max +40%) |
| Ash Feather | common | Dodges recover 25% faster (72 → 54 ticks); a network guest's dodge prediction and every dodge ring use the same cooldown |
| Spore Sac | rare | Party kills leave no death hazard (a Rotcap's spore burst) and puff a spore ring (r 1.8) that slows enemies 35% for 1.5 s |

The ten batch-3 relics are listed under [Batch 3](#batch-3-synergy-relics).

## Curses (6 room curses, 4 major)

| Curse | Effect on its room |
|---|---|
| Elite Tide | Elite chance +35 points (cap 90%) |
| Crowded | Wave budget ×1.5 |
| Iron Hide | Enemy HP ×1.4 |
| Sharp Fangs | Enemy damage ×1.35 |
| Famine | Healing on the party −60% |
| Short Fuse | Every new enemy telegraph (wind-ups, lobbed globs, the Mantis shot) runs 20% shorter, never under 0.6 s (36 ticks); one already shorter is untouched |

**Major curses** bind the party for the rest of the run, across level clears.
A cursed door carries a major curse instead with a 30% chance while the run
holds fewer than three (one more relic-stream draw only then). The door wears
the chained mark and a double violet rim that breathes; the note under the
legend says "Major curse" and what it pays. Clearing the room it opens pays a
**greater** relic pick (rare and legendary only, "A GREATER RELIC"). The relic
strip keeps a BOUND row of the majors held. Ashen Crown counts them like any
curse.

| Major curse | Effect, rest of the run |
|---|---|
| Hunted | Elite chance +15 points in every combat room |
| Thick Hide | Enemy HP ×1.15 in every combat room |
| Brittle Bones | The party takes 12% more damage (everywhere, the boss room included) |
| Withering | Healing on the party −25% (everywhere) |

The default autopilot steps around a major curse (`autopilot({ curses: 'all' })`
walks into it); it still walks room curses.

## Elite drops and the relic shelf (slice 2)

- **Elite drops.** Each elite the party kills rolls a 5% relic drop on the
  relic stream (by rarity weight, none owned), at most one drop a level. The
  corpse throws a loot beam in the relic's rarity colour; the relic arcs to the
  party half a second later and a toast names it. On the autopilot this is
  1-2 drops a campaign (seeds 1-8: 2 2 1 1 2 1 2 2).
- **The relic shelf.** The room-7 peddler adds a rack of two relics under the
  node shelf (relic stream, by rarity weight, none owned), at common 30, rare
  40, legendary 55 Glint. A relic is the party's; the viewed character's purse
  pays (the Healer's is the run wallet). Click a tile, 5 / 6, or the pad focus
  past the last card. Short purses get the dashed plaque and a 300 ms shake,
  never a greyed tile. A network guest buys from its own purse (`relic` party
  CMD). Peddler's Seal does not discount the rack.
- **AI shoppers (v0.5.244).** An AI-held seat (Healer first, then seats 1-3;
  never under Ally builds Manual) takes at most one relic off the rack when
  its purse covers it: its own class relic, else one for no class (another
  class's relic stays for that seat). Under Auto it buys at the door; under
  Suggested the relic is held and bought first on Advance, and the seat's card
  picks are chosen from what it leaves. Probe `tools/small-fixes-probe.mjs`.
- New heirlooms: Ash Feather and Spore Sac each add an heirloom unlock (36
  unlocks), found by holding them in a run like the others.

## Batch 3: synergy relics

Content plan 2, slice 7 (v0.5.242). Ten relics built around what the party
already does: four **class relics** (one per class), relics that pair with
other relics, and relics that answer the curses, elite affixes, Hunt and Purge
rooms and event rooms. Each adds an heirloom like the others (46 unlocks).

| Relic | Rarity | Class | Effect | Pairs with |
|---|---|---|---|---|
| Warden's Oath | rare | Tank | Each enemy the Tank taunts heals the Tank 6 HP; once per enemy every 3 s, at most 4 a tick | Taunting Roar, Provoke, Crush |
| Fox Ribbon | common | Swordsman | A Swordsman crit cuts again for 50% of the blow | Hawk Feather, Crimson Edge, Ember Tooth |
| Fletcher's Knot | rare | Archer | An Archer hit on an exposed enemy ricochets to the nearest other enemy within 3.2 u for 60% | Hunter's Mark, Prey, Moonfang, Dawn Brand |
| Mercy Bell | common | Healer | The Healer's heals past full HP become a shield (cap 20% max HP, 5 s) | Lantern Oil, every big heal |
| Kindling Coal | rare | | A party crit flares for 8 to up to 4 other enemies within 1.6 u; 16 with Ember Tooth | Ember Tooth, Hawk Feather, Fox Ribbon |
| Sun Chalice | legendary | | Every party heal sears the nearest enemy (4.5 u from the healed member) for the HP it restored | Lantern Oil, Leech Fang, Mercy Bell, Warden's Oath |
| Cinder Pact | legendary | | In a cursed room: +30% party damage, -15% damage taken; +5% damage per major curse held, everywhere | Ashen Crown, major curses |
| Bounty Writ | common | | An elite kill pays 6 Glint + 4 per affix | Elite affixes, Hunted, Elite Tide |
| Huntsman's Horn | rare | | +25% party damage in Hunt and Purge rooms; a won one pays +15 Glint over its bounty | Room objectives |
| Pilgrim's Lamp | common | | Entering an event room heals the party 30% of max HP and pays 10 Glint | Event rooms (the blood shrine's price) |

- **Class relics** carry `cls` in `RELICS`. Every pool (a pick, an elite drop,
  the shelf, the wishing well) offers one only while a body of that class is in
  the party (`pool()` / `cmd('relicPool')`). Today the party always holds all
  four seats, so all ten roll; the gate matters once a seat can be empty. The
  relic card names the class after the rarity ("RARE · TANK").
- **Procs** come from the sim's own bus: `hit` (Fox Ribbon, Fletcher's Knot,
  Kindling Coal), `heal` (Mercy Bell, Sun Chalice) and `status_apply` (a taunt
  from the Tank, Warden's Oath). The listeners only queue; the proc lands in
  `endOfTick()` like Thorn Mail. A relic's own damage (source = a relic id)
  never procs another relic, so nothing chains. The queue rides in the save.
- Cinder Pact and Huntsman's Horn change `dealtMul()` / `takenMul()`; Bounty
  Writ and Pilgrim's Lamp pay through the run's wallet (`glint_gain` reasons
  `relic_bounty_writ`, `relic_pilgrims_lamp`, `relic_huntsmans_horn`).
- **Look and sound.** `relic_proc` per relic in `src/render/vfx/signature.js`
  (the "Batch 3" block): an amber tether and closing ring for the Oath, a
  second crossing crimson crescent for the Ribbon, a jade glance arc for the
  Knot, a bell dome for Mercy Bell, an ember bloom with flame tongues for
  Kindling Coal, a sun beam and scorch for the Chalice, an ember ring
  answering the curse for the Pact, coins arcing to the party for the Writ,
  rolling horn waves for the Horn and a warm pool for the Lamp. Sounds reuse
  existing cues (`RELIC_PROC_CUE` in `src/audio/cues.js`). Icons in
  `src/ui/run/relicicons.js`. `?vfxlab=1` → "Synergy relics" plays each one.
- Probe commands: `cmd('relicPool')`, `cmd('relicHit', id, attackerId, power,
  crit)`, `cmd('relicHeal', id, healerId, amount)`, `cmd('relicStatus', id,
  kind, mag, ticks, seat)` and `cmd('relicRoomEnter', mode)` (the VFX lab).
- `node tools/relics3-browser.mjs` against `npm run dev`: the relic page,
  Kindling Coal, Warden's Oath, Sun Chalice and the shelf, with screenshots in
  `captures/relics3-*.png`.
- The numbers are first guesses; see the PR for the caveat.

## Batch 4: room relics and four curses

Content plan 3, slice 9 (v0.5.269). The plan's rooms (champions, keys, vaults,
Escort, Hold, the objective rooms and the fourteen events) each get a relic
that answers them, and the curses get two more room curses and two more major
ones. 39 relics in all; heirlooms follow automatically. Numbers are first
guesses until play.

| Relic | Rarity | Effect |
|---|---|---|
| Shepherd's Crook | common | The Escort pilgrim walks out with 50% more HP; bringing it home pays 15 Glint. |
| Vigil Candle | rare | In Escort and Hold rooms the party takes 20% less damage. |
| Warding Chalk | rare | The Hold ring takes twice as long to go out (8 s empty instead of 4); standing members inside it heal 2 HP a second. |
| Champion's Laurel | rare | +30% party damage to champions; the champion's chest also pays 25 Glint. |
| Jailer's Ring | common | Picking up a key heals the party 15% of max HP and pays 10 Glint. |
| Vault Ledger | rare | Each vault Glint pile pays double (wallet 24, each ally purse 12). |
| Banner Pennant | common | Winning a Hunt, Purge, Escort or Hold room heals the party 25% of max HP. |
| Wanderer's Token | common | Each event offer the party takes (Take, the trapped chest included) pays 12 Glint. |
| Geode Heart | legendary | A cleared cursed room (room or major curse) pays 20 Glint, and a plain cursed room's pick becomes a greater one (rare or legendary). |
| Saint's Ashes | legendary | Every major curse weighs half as much: its wave numbers, its damage taken, its healing cut and its Glint cut. |

| Curse | Kind | Effect |
|---|---|---|
| Restless | room | The room's waves come 35% sooner (the kill-all wave interval x0.65). Purge, Hold and defend rooms keep their own clocks. |
| Kindred Blood | room | When the party kills an enemy, enemies within 2.5 u heal 10% of their max HP. |
| Teeming | major | Every wave is 12% larger for the rest of the run. |
| Pauper's Mark | major | Every Glint gain (the wallet and each ally purse) is 20% smaller for the rest of the run, never under 1. |

How they hook in:

- Shepherd's Crook, Warding Chalk, Jailer's Ring and Wanderer's Token read the
  sim's own `pilgrim_spawn`, `pilgrim_arrive`, `hold_start`, `sigil_out`,
  `sigil_sealed`, `key_pickup` and `event_take` events and land at the end of
  the tick like the batch 3 procs. Warding Chalk's fade factor reaches the
  wave director through `waves.setHoldFadeMul()`.
- Vigil Candle reads the room's mode (like Huntsman's Horn); Champion's
  Laurel reads `target.champion` through `mods.dealtMul(target)`.
- Vault Ledger multiplies the pile in `run.js takePile`; Pauper's Mark thins
  `gainGlint` and `party.gainPurse` through `relics.glintMul()`; Saint's Ashes
  passes `relics.majorScale()` to `cursedDiff(diff, curse, scale)`.
- Kindred Blood queues on the party's kill (`mods.onKill`) and emits
  `curse_proc`. Restless is a `diff.waveMul`.
- `?vfxlab=1` → "Room relics": each relic's beat (`cmd('relicDemo', id)`) and
  the two room curses on a live room.

## The Spire's pair (plan 4 slice 7)

- **Weathercock Plume** (common): dodges recover 15% faster, and party hits
  knock enemies back 30% farther (`dodgeCd`, `kb`).
- **Hushbell** (rare): the party deals 25% more damage to an enemy while its
  attack warning is up (`dealtMul` reads `target.telegraph`).

Both have heirlooms. The Silent Bell event lifts a major curse
(`liftMajor`, event `curse_lifted`); the Gods' Seat pays a legendary pick
(source `seat`).

## The Kiln's pair (content plan 5 slice 9)

- **Slag Greaves** (common): hazards hurt the party 35% less: vents, falling
  rock, gravefire, spurs and the rest (`takenMul('hazard')`).
- **Founder's Ingot** (rare): each combat room the party clears heats it, +5%
  party damage a room up to +25% (`heat`, saved with the run). It cools when a
  new level begins; a boss room or a forfeited room adds nothing.

Both have heirlooms. The Molten Bell event grants relics with source `molten`;
the Forge Shrine takes one with `loseNewestOf('forge', 'common')`.

## Batch 5: relics for plan 4's content, three curses

Content plan 4, slice 11 (v0.5.287). Eight relics answer what plan 4 added
(tonics and bombs, shrines, the second champions, the Spire's gust vents, the
bells, the vows) and three curses, one of them major. 51 relics and 17 curses
in all; every relic has its heirloom (data/unlocks.js builds them). No dice:
each relic reads the bus or a count, so holding one never moves the relic
stream. Numbers are first guesses until play.

| Relic | Rarity | Effect |
|---|---|---|
| Brewer's Satchel | common | Each tonic or bomb a hero uses also heals every other hero for 12% of max HP. |
| Votive Ribbon | common | A shrine's blessing lasts twice as long (120 s), and each offering heals the party for 20% of max HP. |
| Stormglass | common | Each gust a vent blows strikes every enemy in its lane for 12% of max HP (elites 6%, champions and bosses 2%). In a fight with no gust vent the glass blows its own gust every 8 s, from the carrier down a 9 u lane through the nearest enemy (shown for 40 ticks first). |
| Twin Fuse | rare | A thrown bomb bursts again 0.6 s after it lands, for half its damage (no second fire patch, slow or freeze). |
| Trophy Cord | rare | +6% party damage for every champion the party has felled this run (up to +30%, five champions). |
| Oathkeeper's Brand | rare | +4% party damage for every Vow level the run wears (up to +40%). Offered only while the run wears a vow; never the Daily's omen. |
| Bottomless Flask | legendary | Once a room, each hero's first tonic or bomb comes back to their slot 10 s later (at once if the room clears first; a slot filled meanwhile keeps what it holds). |
| Tenor Bell | legendary | Every 10th enemy the party fells in a room rings the great bell: every enemy in the room takes 12 damage and is slowed 40% for 2 s. A kill inside one of the Bellwright's bell rings counts twice. |

| Curse | Kind | Effect |
|---|---|---|
| Corked | room | No tonic or bomb can be used in the room (the AI seats leave theirs alone, the HUD slot wears a wax seal), and its enemies have 10% more HP. |
| Tolling Dead | room | Each enemy that falls tolls a knell where it fell: an Ember ring closes for 0.8 s, then strikes heroes within 1.6 u for 10% of their max HP (at most six knells waiting at once). |
| Dulled Edge | major | Party critical hits deal x1.25 instead of x1.5 for the rest of the run (Saint's Ashes: x1.375). |

How they hook in:

- Brewer's Satchel and Bottomless Flask read `tonic_use`; Twin Fuse reads
  `tonic_burst` and lands its second burst through the relic system's new
  `later` queue (procs on a set tick, saved with the run). The flask fills
  the slot through `tonicSlot` (run.js passes the consumable system's
  `slot` / `setSlot`).
- Votive Ribbon: `relics.blessMul()` lengthens `bless()` (sim/shrines.js
  takes the ticks now); the heal reads `shrine_offer`.
- Stormglass reads the gust's `hazard_resolve` (its lane rides the event).
  Small fixes 5: in a combat room with no gust vent, `stormTick()` aims its
  own lane every `storm.everyTicks` (480) from the room's start: from the
  player body through the nearest live enemy within `storm.len` (9 u; none in
  reach looks again 30 ticks later). A `relic_proc` with `stage: 'gather'`
  shows the lane for `gatherTicks` (40), then the `storm` proc lands through
  `later` (`own: true`). A room with a gust vent leaves the gusts to the
  vents. `stormNext` is saved while the relic is held.
- Trophy Cord counts party kills of champions (`trophies`, saved); Oathkeeper's
  Brand reads `vowLevel()` (run.js passes `vowLevelOf(boons)`); both through
  `mods.dealtMul`.
- Tenor Bell counts `mods.onKill` per room; Tolling Dead queues on it too and
  emits `curse_proc` stages `toll` and `strike`.
- Corked: `relics.corked()` seals the consumable system (`sealed` option): a
  press is refused with reason `corked`, `aiStep` skips, and the tonic view
  carries `corked: true` for the HUD. Its HP comes from `diff.hpMul`.
- Dulled Edge is a major `critMul` summed into `mods.critMulAdd()`. Its beat: a party crit under it emits a cosmetic `curse_proc` (stage `blunt`, at most once every 20 ticks), drawn as a broken iron blade over the target with a violet tarnish ring and a low parry clink.
- `?vfxlab=1` → "Relics batch 5": each relic's beat (`cmd('relicDemo', id)`)
  and the two room curses on a live campaign room.

## Batch 6: relics for plan 5's content, three curses

Content plan 5, slice 11 (v0.5.302). Eight relics answer what plan 5 added
(secret rooms, the Kiln, the Duskwing, the second batch of elite powers) and
three curses, one of them major. 63 relics and 20 curses in all (12 room, 8
major); every relic has its heirloom. No dice: each relic reads the bus, a
hit or a count, so holding one never moves the relic stream (Nightfall Veil
still draws the crit roll it overrides). Numbers are first guesses until play.

| Relic | Rarity | Effect |
|---|---|---|
| Delver's Lantern | common | A cracked wall is marked the moment you enter its room, and any blow from a hero a person plays breaks it open. |
| Kiln Coal | common | Enemies a bomb bursts on catch fire: for 4 s they lose 3% of max HP every half second (2% for elites, 0.5% for champions and bosses). |
| Pumice Soles | common | Floor patches never slow the party: frost, thorn, moss, ash, glass, crystal and the rest. |
| Wing Bone | rare | Each dodge ends in a dive: enemies within 1.4 u of where the hero lands take 10 damage and are knocked back. |
| Crown Shard | rare | Each elite the party fells pays 5 Glint for every power it carried. |
| Dusk Lens | rare | Party critical hits blind the enemy for 1 s (never a boss; once per enemy every 3 s). |
| Nightfall Veil | legendary | The first party blow on each enemy is always a critical hit. |
| Rekindled Heart | legendary | Once a level, each hero who would fall rises with 40% of max HP in a burst of flame: 15 damage to enemies within 2.5 u, which catch fire for 4 s. |

| Curse | Kind | Effect |
|---|---|---|
| Sealed Door | room | This level's cracked wall stays shut (no blow or bomb opens it), and enemies in this room have 20% more HP. |
| Dimmed Lantern | room | The room is dark: party blows on an enemy more than 4.5 u from every hero deal 40% less. |
| Heavy Crowns | major | Every elite carries one more power for the rest of the run (three at most; Saint's Ashes: in about every other room, by the room's hash). |

How they hook in:

- Delver's Lantern reads `secret_wall` (a `mark` proc with the wall's place)
  and `relics.lanternOpens()` lets run.js's `wall_blow` treat any blow from a
  human seat as heavy. AI seats still only knock.
- Kiln Coal reads `tonic_burst` (each hit id; a Twin Fuse echo does not
  re-light) into `alight` (id -> until/next, saved). `burnTick()` in
  `endOfTick` lands eight licks through the pipeline (`source: 'kiln_coal'`,
  shape `burn`). Rekindled Heart's burst lights through the same map.
- Pumice Soles: enemies.js `stepSlicks` asks `mods.slickProof(body, slick)`
  before slowing a party body (a throttled `relic_proc` for its beat). Ice
  slip floors are not slicks and still slide.
- Wing Bone reads `dash_end` (the player) and `ally_dodge` (an AI seat,
  queued through `later` at the dodge's end).
- Crown Shard reads `mods.onKill` beside Bounty Writ (both pay on the same
  elite; Kesh kept the overlap): `pay(5 x powers, 'relic_crown_shard')`.
  Dimmed Lantern rides `mods.dealtMul`. Nightfall Veil is `mods.firstBlow(target)`, read by
  combat.js after the crit roll is drawn. Dusk Lens applies `blind` on a
  party crit (bosses refuse it).
- Rekindled Heart rides `mods.saveFromDown` after Last Light, once per seat a
  level (`kindled`, saved).
- Sealed Door sets `sealed` for the level (saved) when it binds: run.js
  refuses a heavy blow or a bomb with a `curse_proc` stage `refuse`
  (`sealedKnock`), the autopilot leaves the wall alone, and the view carries
  `sealed: true`. Its HP comes from `diff.hpMul`.
- Dimmed Lantern: `inTheDark(target)`; the view carries `dim: 4.5` for the
  dark veil the renderer draws round the heroes.
- Heavy Crowns: `relics.affixAdd(salt)` is added in run.js `affixRule()`.
- `?vfxlab=1` → "Relics batch 6": each relic's beat and the three curses on a
  live campaign room; `node tools/relics6-shots.mjs` shoots the same beats.

## Determinism and the legacy traces

- Every relic roll (curse on a door, which door, which curse, which three
  relics) comes from a separate relic stream seeded from the run seed
  (`relicSeed`), so the gameplay stream's frame, waves and drafts do not move.
  Procs that go through the combat pipeline (Hearthstone, Leech Fang, Thorn
  Mail) draw their crit rolls from the gameplay stream like any other instance.
- Relics are on for campaigns (Begin Run, the Level Select) and off for the
  legacy single-level `startRun()`. With relics off nothing fires and no view
  key appears: the 9 golden traces (`tools/gnt-arch-simtrace.mjs`, kill_all /
  defend / run × seeds 1–3) hash identically to `gauntlet` before this slice.
- Probe commands: `cmd('relics', true|false)` (this run), `cmd('relicsDefault',
  bool)` (the next campaign), `cmd('relicGrant', id)`, `cmd('relicChoose', i)`,
  `cmd('relicFocus', i)`; slice 2 adds `cmd('relicBuy', i, seat)`,
  `cmd('relicDoor', curseId, side)` (the next path screen's cursed door),
  `cmd('relicDropNext')` (the next elite kill drops) and `cmd('relicCurseHere',
  curseId)` (curse the live room; the VFX lab uses it). The autopilot takes the first relic offered and walks
  its configured door; `autopilot({ curses: 'avoid' })` steps around a cursed one.

## Verification

- `node tools/relics6-probe.mjs` (headless, batch 6, 29 checks): the data (63
  relics, 12 room curses and 8 major, every new line in the nine other
  languages), each relic through its real hook (a secret wall, a bomb, a
  crystal bed, a dodge press, a felled two- and three-power elite, crits, a fall), the three
  curses' numbers (a bomb and a heavy blow refused, a door's +20% HP, the
  dark's 40%, one more power on Levels I and IV, Saint's Ashes), nothing in
  the legacy run, and a burn and a sealed level riding a save.

- `node tools/relics5-probe.mjs` (headless, batch 5): the data (51 relics, 10
  room curses and 7 major, every new line in the nine other languages), each
  relic through its real hook (a tonic, a bomb, the Tithe Shrine, a real gust
  vent on the Bell Stair, a champion, a vow run, kills inside a Bellwright
  bell), the three curses' numbers, nothing in the legacy run, and a refill
  riding a save.

- `node tools/relics4-probe.mjs` (headless, batch 4): the data (39 relics, 8
  room curses and 6 major), each room relic in its real room (an Escort walk,
  a Hold ring, a champion, a key, a vault, an event Take, a cursed room), the
  four curses' numbers, nothing in the legacy run, and a save round trip.

- `node tools/relics3-probe.mjs` (headless, batch 3, 24 checks): the data
  (27 relics, one class relic per class, rarities, heirlooms), the class gate,
  each new relic through the real pipeline in a live campaign room, nothing in
  the legacy run, and a queued proc riding through a save.

- `node tools/relics-probe.mjs --seeds 1-4` (headless, fast): free pick after
  room 1 of each level, three distinct relics per pick, cursed doors appear,
  a cursed room rolls with the curse's numbers and pays a pick, relics carry
  across levels into the summary, Whetstone and Last Light reach the pipeline,
  a save on the relic page restores the same offer, the legacy run has no relic
  keys or events, and a seed replays the same relics.
- `node tools/relics2-probe.mjs` (headless, slice 2): Ash Feather's dodge
  cooldown, Spore Sac on a Rotcap kill (no burst, a slowing puff), Short Fuse
  on a Barrow Knight's slam (66 -> 53 ticks), a forced major door (marked,
  binding, a greater pick, its numbers in every later room and across a level
  clear), elite drops (forced, capped one a level, the natural rate over seeds
  1-8) and the relic shelf (stock, prices, wallet and ally purse buys, the
  denial, a save round trip, the same seed rolling the same shelf).
- `?vfxlab=1` → "Relics and curses": an elite drop, Spore Sac on Rotcaps, a
  major curse and Short Fuse, through the real sim.
- `node tools/relics-browser.mjs` against `npm run dev` (port 5199): the real
  pages, clicked in the DOM, with screenshots in `captures/relics-*.png`.

## Balance note (autopilot, 2026-10-03)

Whole campaigns from Level 1, seeds 1–16, default autopilot (takes the first
relic, walks door 0 cursed or not): 9/16 wins with relics, 9/16 without. Level 1
losses went from 1/16 to 4/16; in each of those runs the party reached the
Hollow Stag at or near full HP, so the losses are in the boss fight itself,
which the content plan already flags as the most RNG-sensitive fight (any
change to kill timing reshuffles it). Worth a look in the planned Act I
balance pass.

**Update (balance pass, v0.5.224):** that run was on the relics branch while
the Level 1 Stag still hit at x4.0; PR #4 set it to x2.1 before the relics
merged. Re-measured on `gauntlet` (seeds 1-40, `gntCAMPAIGN-camprun
--stop-after 1`, `--relics 0` for the A/B): 40/40 cleared with relics on and
40/40 off, so relics and curses are unchanged. Numbers in docs/BALANCE_PASS.md.
