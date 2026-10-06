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

## Relics (17)

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
| Ash Feather | common | Dodges recover 25% faster (72 → 54 ticks) |
| Spore Sac | rare | Party kills leave no death hazard (a Rotcap's spore burst) and puff a spore ring (r 1.8) that slows enemies 35% for 1.5 s |

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
- New heirlooms: Ash Feather and Spore Sac each add an heirloom unlock (36
  unlocks), found by holding them in a run like the others.

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
