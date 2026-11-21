# Stonehide: how his skills and talents work together (audit)

**Kit 1.7 (2026-11-19):** Rock Toss, Bodyguard, Bloodboil, Iron Bristles, Grudge, Iron Briar, the Stone Cubs, Long Thorns and Mountain changed. Where this record and the kit or talent doc differ, the docs rule.

**2026-11-17.** Audit of kit 1.4 (`STONEHIDE_SKILL_KIT.md`, S1 to S55) and talents 1.4
(`STONEHIDE_TALENT_PATHS.md`, T1 to T33). Design only. Nothing in the kit or the talents was
changed; each fix waits for Kesh's pick. Lines are numbered A1 to A9 (picks) and N1 to N12 (notes).

**Closed.** Kesh, 2026-11-17 12:29 Singapore time: "1 a 2 a 3 a 4 a 5 a 6 b 7 a 8 a 9 a". He took my
pick on every line. All nine are written into kit 1.5 (S57) and talents 1.5 (T34). The text below
is the audit as it was sent, against version 1.4.

Checked on paper, and against three rules the game has today (`src/sim/status.js`,
`src/data/classes.js`): a taunt lasts at most 4 s (boss 1 s, then 5 s immune); a stun lasts at most
1 s, then the foe cannot be stunned for 2 s, and a second stun never extends the first; the Aegis
node is a 20% ward while its skill is on cooldown and Rampart is 15% for 2 s after a cast. Only one
Stonehide can be in a party (a taken class is refused), so two of him never meet.

---

## 1. His rules

| Rule | Result |
|---|---|
| No self shield | Pass. Nothing holds an amount. Closest: Stoneheart (a cap on each hit) and Deathless (held at 1 health). |
| No self heal | Pass, with one small leak: Hearty's new point "comes filled" (N1). |
| Max health and damage reduction first | Pass. But the reduction overflows its stop (A1, A2). |
| Taunts cheap, easy, many | Pass, more than enough. With no skill at all, his combo keeps every foe in reach taunted without a gap. |
| Bristle serves all three paths | Pass. Two side effects: Stone is always full (A2) and the free taunts use up a boss's taunt (A3). |

---

## 2. Picks (my pick is marked)

### A1. The 60% stop is too easy to hit, and it switches Stubborn off

Everything that can add: Stone 24, Stubborn 40, Slabguard 40 (front), Colossus 20, Rallying Cry 20,
Grudge 20, Bodyguard 15, and the nodes Aegis 20 and Rampart 15. That is 214% against a stop of 60%.

- Stone and Stubborn alone are 64%: 4% is lost with no skill pressed.
- Stone and Slabguard are 64%: while the slab is up, Stubborn adds nothing.
- Stone and Colossus are 44%: Stubborn can add only 16 of its 40.
- Stone and the Aegis node are 44% almost all the time.

So the Bedrock talent (play style 1, "the lower the HP the higher the reduction") fights the
Bedrock skills. A Bedrock player does best by not drafting them.

- a) Stubborn gives up to 30% (was 40%) and lifts the stop with it, to 70% at 20% health. Stone and
  Stubborn alone are then 54%, with nothing lost, and a skill on top still counts. Mountain's 75%
  stays the highest. Aegis and Rampart count as one entry, the larger only. **(my pick)**
- b) Leave it at 60%.
- c) Stubborn multiplies on top of the sum (up to 76% in all; Mountain would then need 85%).

### A2. Stone is always full

"All Stone lasts 6 s after the last patch was gained" (S5). One new patch renews all eight, and one
foe gives a patch every 3 s. So a single foe fills him to 8 in 24 s and keeps him there. The line
"the more foes he holds, the harder he is" is not true, and three things do almost nothing: Big
Presence's "Stone lasts 3 s longer", the Brace node (2 Stone a cast) and Warden's Oath (2 Stone a
taunt, 8 s).

- a) Each patch has its own 6 s. Each plain foe he holds then keeps about 2 patches, so four foes
  fill him; a boss fills him through its hits (S5, Hard knocks). The three weak pieces now matter.
  **(my pick)**
- b) Leave it: Stone is a steady 24% in every fight.

### A3. The free taunts use up a boss's taunt

A boss is taunted 1 s, then immune 5 s. Basic hit 1, hit 3, the dash and the growl taunt by
themselves, so the boss is nearly always immune when he presses Bellow or Rock Toss. The player
cannot pick the moment. Under Reckoning the boss is also nailed all the time, with no press.

- a) Bristle's free taunts do not taunt a boss and do not start its 5 s. They still pay 1 Stone.
  Skill taunts decide when the boss turns. **(my pick)**
- b) Leave it.

### A4. A short stun blocks a long one

The game's rule: after any stun a foe cannot be stunned for 2 s, and a second stun never extends
the first. His dash stuns 0.3 s. So:

- Wall slam's 0.5 s stun never lands after a dash push (the dash already stunned the foe).
- A dash, or a Tremor node, just before Fracture's shatter, Badger Toss or Fault Line takes their
  stun away. The damage still lands.

"Thrown up" (Fault Line, Burrow, Badger Toss) is not defined. I read it as a stun under the same
rule, so the game's guard against stun locks covers it.

- a) The dash's 0.3 s does not start the 2 s lock, so Wall slam and the big stuns land after it.
  Thrown up counts as a stun. **(my pick)**
- b) The dash loses its stun (it still knocks foes aside).
- c) Leave it.

### A5. Counter Spin breaks his combo

It spins "by himself", up to once a second in a pack. If the spin is a move of its own, it cuts
the 3-hit combo, and hit 3 rarely lands. Hit 3 carries Bristle's taunt, the "+4% HP" slam and the
Iron burst. It is also undefined during Slabguard ("he does not attack"), Maul and Burrow.

- a) The spin is laid over what he is doing. It never cuts or resets the combo, a cast, Slabguard
  or Maul. It does not fire underground. **(my pick)**
- b) The spin takes the place of his next basic hit.

### A6. Pressing a skill during Slabguard or Maul

Not written. One combo in S34 cannot happen: "Hard and heavy" counts Slabguard's 40% for Heavy
Slam, but he cannot slam while he holds the slab, and the 40% is front only.

- a) Any skill press ends Slabguard with the shove, and stops Maul.
- b) Skills cast on himself work under the slab: Stoneheart, Iron Bristles, Grudge, Colossus,
  Rallying Cry, Bloodboil, Grindstone, Bellow, Iron Quills. Any other press ends it with the shove.
  A press stops Maul. **(my pick: the slab with thorns out is his best picture)**

Either way: Heavy Slam's weight counts all-round reduction only, and Slabguard leaves the "Hard
and heavy" line.

### A7. Reckoning switches Iron Hide off

Reckoning returns 100% from a nailed foe "in place of Iron Hide's 30%" (T20). Bristle taunts every
foe near him, so on an all-Ironthorn build tier I matters only for foes he has not taunted.

- a) Reckoning adds 70% on a nailed foe. With Iron Hide that is 100%, as now; alone it is 70%.
  **(my pick)**
- b) Leave it.

### A8. Blood Price fades as he gets low

Its burn is a share of the health he has: 12 at 150 health, 2.4 at 30, nothing at Deathless's 1
health. The damage it adds is twice that. So it fights the three things that want him low:
Stubborn (the "Low and mean" build, T21), Savage Bite and Deathless. Also S9 says every burn is a
share of the health he has, but Grindstone burns a share of his maximum.

- a) Blood Price burns 6% of his maximum health a cast (9 at 150, so +18 a foe) and stops at 10%
  health, as Grindstone does. With nothing burned there is no bonus. **(my pick; the 6% is a guess)**
- b) Leave it: it was meant to slow as he gets low (T22 item 2).

### A9. Write in the small gaps (N1 to N6)

- a) Yes, all six. **(my pick)**
- b) Name the ones to leave out.

---

## 3. Small gaps (no real choice in them)

- **N1. Hearty's point "comes filled".** That is 1 health healed per point, up to 15 a level.
  Colossus keeps his health's share. Hearty should do the same.
- **N2. Burns and thresholds.** A burn can take him under 30% and start Mountain, and it feeds
  Stubborn. Say so. S9's text should cover Grindstone's burn of maximum health.
- **N3. The flat part of a return.** "+1% HP" (Iron Hide) and "+3% HP" (Iron Bristles) are paid on
  every hit. Limit them to once a second per foe, so a foe that hits in fast ticks does not
  multiply them.
- **N4. Heavy Slam and the Growlstone.** The stone does not use up one of the slam's 3 foes. A slam
  that hits it kicks it and does not also shake it.
- **N5. Stoneheart's "why" line.** The cap is a share of maximum health, so it is the same share
  at any size. Drop "it gets better the more maximum health he has".
- **N6. The Stone Ring and far taunts.** A foe taunted from outside the ring (Growlstone, Stone
  Cubs, Rock Toss, Slab Throw) cannot reach him for 4 s. Good for the ally, nothing for his thorns.
  The AI should not raise the ring when the foes it wants are outside.

---

## 4. Works as meant (checked, no change)

- **N7. Taunt overlap.** 12 skills taunt, but a taunt never lasts over 4 s, and Bellow alone covers
  his ring 4 s in every 5. In reach, the taunt on Fault Line, Burrow, Colossus, Stone Ring and
  Slabguard adds no time. The taunts that matter are the far ones: Rock Toss, Slab Throw,
  Landslide, Growlstone, Stone Cubs. This fits "cheap, easy, many".
- **N8. Colossus is worth more than its 20%.** His health keeps its share, so 30% more maximum
  health works like 23% less damage that sits outside the stop: at 60% he takes 31%, not 40%.
- **N9. Stoneheart with the stores.** Under Stoneheart a boss blow costs him 5% and still returns,
  counts for Grudge and fills the Iron store in full. Strong, and meant (T22 item 26).
- **N10. Stuns against thorns.** Fracture, Fault Line, Burrow, Badger Toss and Wall slam stop foes
  hitting him, which costs Ironthorn a little. Already noted (T22 item 19).
- **N11. Tier locks.** Stubborn and Bare Claws are both tier I, Mountain and Deathless both tier V,
  so neither pair can be taken together.

---

## 5. Measure first when it is built

- **N12. Strong on paper.**
  - All Ironthorn pays one incoming hit six ways: the return, Grudge, the Iron store, Long Thorns,
    Counter Spin and a Crack. My rough count, with Iron Bristles, Grudge and Counter Spin drafted
    and a pack of five throwing 30 a second at him (the docs' own guess), is about 250 damage a
    second spread over the five. The talent doc counted 18 a second. Counter Spin alone is about
    90 of it (a spin every second, 18 to each foe).
  - Maximum health chains: 150, +75 Hearty, Thick Hide, Colossus is 351. Then Grindstone grinds 21
    a second, Grudge can slam 175, and a full Iron store bursts 210 (420 on a boss, and it carries
    from room to room).
  - A low Bedrock Stonehide's Heavy Slam is 94 (+8% HP) every 5 s, and Crush is on nearly always.
  - Hearty's growth and Colossus make him 61% taller. Check at play zoom that he does not hide
    foes and floor warnings.

**What is guessed.** Every number here comes from the docs' first guesses. Nothing was played.
