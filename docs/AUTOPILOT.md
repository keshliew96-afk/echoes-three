# The carried autopilot (Autopilot and Endless, v0.5.260)

Content plan 3, slice 5. The autopilot is the deterministic bot that plays the Healer (seat 0) in every headless bench (`tools/endless-run.mjs`, the campaign runner, the probes). Every later slice tunes its numbers on it, so it has to clear the campaign about as often as a decent player would. After elite affixes and Act IV landed it no longer did (small fixes round two measured Level I 24/32 and Level IV 2/13).

## What was wrong (measured, not guessed)

`tools/endless-run.mjs --campaign 1` on gauntlet 8990030 (v0.5.259), plus a damage-by-source trace of the lost runs:

- **The bot stopped attacking whenever any ally was under 70 % HP.** The old cast rule handed the aim to the neediest ally as soon as anyone was hurt, and only aimed at a foe when nobody was. With no heal ready, or none that reached that ally, the Healer stood still and did nothing; in a boss fight that was most of the fight. It also fired Nova Bloom and the other short heals at whoever happened to be in reach.
- **A lone Healer waited for 60 % HP before reviving.** With the rest of the party down and no self heal (the kit is drafted from empty, so a Healer often has none by the Level I boss), it never got to 60 % and died walking around; with an all-heal kit against regenerating Toads it lived forever and stalled the room.
- **Most Level I deaths were the bosses' telegraphed charges and slams landing on the AI seats.** The Thornmother's Briar Charge was the largest single source of Level I boss damage in the traced runs, and the Thornmother ended seven of the seventeen Level I losses over seeds 1-64. The seats stepped out of a Vein Lancer's lance (Act IV) but not out of a boss's lane or ring.

The Healer itself takes about 5 % of the party's downs, so making the bot dodge better was never going to move the bench much.

## What changed

**The bot (`src/sim/autopilot.js`, the plain autopilot only).**
- Each ready heal goes out only if it reaches someone below the line: a direct heal if a hurt member is in its range (or the Healer is hurt), a nova if a hurt member is inside its area, a bolt, arc or zone if the neediest hurt ally is in its reach. Only then does that heal take the aim; otherwise the aim and the basic attack stay on the target.
- Alone with the party down it starts a revive from 35 % HP and holds it to 20 % (was 60 % and 30 %).
- The leader seat (the AI Healer under a human playing another class, `cfg.leader`) keeps its old rules: it is player-facing and was not part of this measurement.

**The AI seats (`src/sim/allies.js`, campaign play only).** While the campaign engagement rules are on (`engageOn()`: a live run, never the `?room=` harness or the legacy run), every AI seat now steps out of
- a boss's lane telegraph (the Thornmother's Briar Charge, the Heron's spear, the Millwheel's crosscut, the Lich Ram's rush, the Colossus's fissure, the Cantor's lance), the same sidestep the Vein Lancer's lance already got, and
- a boss's ring telegraph (the Stag's Antler Quake, the Heron's surface and wingbeat, the Wyrm's emerge, the Colossus's burst, the Cantor's note and pulse), straight out or up to 90 degrees off, inside the leash.

This is a change a player sees: AI allies in a campaign or an Endless descent now move out of a boss's warning instead of standing in it. They cannot always make it (the Stag's quake is 1.6 u around its target with a 0.7 s warning, and a seat walks 2.1 to 2.65 u/s with no dodge), so the probe asks for most seats out of a charge lane and at least two in five out of a quake. The nine goldens do not change, because the harness never turns the engagement rules on.

## Tried and dropped

Each was measured on the same seeds and made the bench worse or did nothing, so none shipped:

| change | Level I cleared (seeds 1-32) | full campaigns won |
| --- | --- | --- |
| none (v0.5.259) | 26 | 14 |
| the bot dodges Toad globs and enemy shots aimed at it | 21 | 6 |
| the bot keeps 2.2 u from the nearest foe (kite) | 22 | 7 |
| the bot shoots the lowest-HP foe in range | 24 | 12 |
| the leader rules (heal below 90 %, fire every skill) | 23 | 10 |

The Healer is the leash anchor for the three AI seats, so every step it takes away from the fight drags the party with it; that is why dodging and kiting cost more than they saved. Walking toward a hurt ally to get a heal in range did not help either (and stalled Hunt rooms until the quarry chase came first), so it was left out.

## The bench (headless, standard challenge)

`node tools/endless-run.mjs --campaign 1 --seeds 1-64 --jobs 4`, before (gauntlet 8990030) and after:

| level | seeds 1-32 before | seeds 1-32 after | seeds 1-64 before | seeds 1-64 after |
| --- | --- | --- | --- | --- |
| I Wood | 32 / 26 | 32 / 29 | 64 / 47 | 64 / 60 |
| II Mill | 26 / 24 | 29 / 28 | 47 / 45 | 60 / 59 |
| III Barrow | 24 / 19 | 28 / 18 | 45 / 35 | 59 / 38 |
| IV Heart | 19 / 14 | 18 / 16 | 35 / 25 | 38 / 30 |

(reached / cleared.) Level I goes from 73 % to 94 % over 64 seeds, Level IV from 25 to 30 clears. The plan's "Level IV 2/13" was already 14/19 on v0.5.259 (the vault relics, champion chests and the party lineup landed in between). The Barrow is now where carried runs end: Barrow Moles, Crow shots and guard-horned Rams take most of the party's HP there, none of it telegraphed in a way a seat can walk out of.

A 16-seed sample swings by three or four clears either way; use 32 seeds at least, 64 for a decision.

## Tools

- `node tools/autopilot-probe.mjs` (14 checks: the heal and attack rules, the lone revive, the seats in a Thornmother and a Stag fight, a replay hash). On v0.5.259 it passes 6 of 14.
- `node tools/endless-run.mjs --campaign 1 --seeds 1-64` for the bench; `--root <dir>` runs another tree for an A/B.
- `node tools/gntM2-goldens.mjs` (9/9, unchanged).
