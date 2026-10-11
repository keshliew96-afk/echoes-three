# Tonics and bombs

Content plan 4, slice 1 (v0.5.275). Every hero carries one consumable in a
single slot, like the potion in Gauntlet. Code: `src/sim/consumables.js`
(catalogue, rolls, the system), wired in `src/sim/run.js`; probe
`tools/tonics-probe.mjs`.

## Where they are on

Every campaign run, which includes Endless, the Daily and Boss Rush
(`championsOn()`). The legacy single run and the tutorial never carry a slot,
so the nine goldens stay byte-identical. Nothing carries past the run: the
slots empty when the run ends, and a save mid-run keeps them.

## The six kinds

| Kind | Use | Effect | Shop price | Roll weight |
|---|---|---|---|---|
| Mending Tonic | drink | heals 50% of max HP | 30 | 30 |
| Haste Draught | drink | haste 35% and inspired 15% for 8 s | 28 | 14 |
| Ward Flask | drink | a shield worth 40% of max HP for 10 s | 30 | 16 |
| Fire Bomb | throw | bursts in a 2.4 u radius for 35% of max HP (elites 20%, bosses and champions 5%), then burns a 2.1 u patch for 3 s (4% / 2.5% / 0.5% every 0.5 s) | 34 | 16 |
| Frost Bomb | throw | bursts in a 2.8 u radius for 15% (10% / 2.5%), slows 50% for 4 s, stuns 1 s | 32 | 14 |
| Bell Charm | ring | shatters every enemy shot within 8 u and wards heroes within 6 u (30% for 4 s) | 26 | 10 |

Bombs are thrown at the hero's aim, from 1.2 u to 6.5 u away, and land 0.45 s
later. Damage is a share of the target's max HP so a bomb reads the same in
every act. Prices go through the relics' shop-price modifiers.

## Where they come from

- **Elites:** a felled elite drops one about one time in five. The roll is a
  hash of the level seed, the room and the body's id, never a draw from the
  run stream, so the same Daily drops the same tonics for everyone.
- **Champion chests and vault chests:** each pays one into the first empty
  slot in seat order; with every slot full it is lost.
- **The Peddler's stand:** one kind a visit (hashed), sitting in the relic
  rack. Each hero may buy one, into an empty slot, from their own purse
  (key 7, or the pad focus). AI-held seats with an empty slot and the Glint
  buy one at Advance, unless the party is on manual.

A loose one on the floor goes to the first hero who walks over it. A human
with a full slot swaps and leaves the old one there (it is not taken straight
back until they step off). An AI seat only picks one up into an empty slot.
When the room is cleared, anything left on the floor goes to the empty slots
in seat order. At most three lie loose at once.

## Using it

Q, or click the right stick (rebindable as "Use tonic or bomb"). Only during a
fight: between rooms, Downed, or with an empty slot the press is refused with
a dull tap. The command bar shows the slot right of the dodge, coloured by
kind.

In co-op each human owns their slot: the guest's press travels as press bit
10, and the guest buys at the stand through the party op `tonic`.

## The AI and the autopilot

AI seats, and the Healer when the autopilot drives, look at their slot every
six ticks during a fight:

- Mending Tonic below 35% HP.
- Ward Flask below 35%, or below 60% with two foes within 3 u.
- Haste Draught with four foes within 6 u, or a boss or champion near.
- Bell Charm with three enemy shots within 5 u (two below half HP).
- A bomb at the foe in reach with the most others inside the burst, once
  that count is four (a boss or champion counts as four).

## Tuning knobs

All in `CONSUMABLE_RULES` and `CONSUMABLES`: `eliteChance` 0.2, the AI
thresholds, the weights and prices above. They are first guesses until the
game has been played with them.
