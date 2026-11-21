# Ashfang: interaction audit

**CLOSED.** Kesh, 2026-11-17 15:08 Singapore time: "all the problem. follow your fix". All nine picks are a, written into kit 1.3 (S54 is the record) and talents 1.3.

**2026-11-17, on kit 1.2 and talents 1.2.** Design only. I read every skill, the passive and the
fifteen talents against each other and against the game's rules (stuns, slows, taunts, bosses,
heals). Two lists: nine gaps that had one plain answer, already written into the kit as S53; and
nine problems that need a pick from Kesh, A1 to A9, each with my pick marked.

Answer like "A1 a, A2 a", or "your pick" for all.

---

## Gaps closed without a choice (kit S53)

| # | Gap | Ruling |
|---|---|---|
| G1 | Does a cast restart the 4-hit combo? Which cut is the strong cut? | No restart. The next cut is strong; hit 4 is strong once |
| G2 | "Up to 3 count from one cut" with foes in the air | The 3 counts foes; a foe in the air is 2, so up to 6 |
| G3 | Flashfire: can bursts chain for ever? | Each foe bursts once a cast; the burst uses up its burn |
| G4 | "Cools down 30% faster": 30% off, or a faster clock? | A faster clock (7 s takes 5.4 s), after nodes, 0.5 s floor |
| G5 | Do floor effects hit a foe in the air? | Yes, everything does |
| G6 | Basic cuts during Blade Storm, Thousand Cuts, Triple Crescent's draw | None; the strong cut waits |
| G7 | The earth orb with other reductions | Adds to his own; other heroes' wards multiply |
| G8 | The water orb under rules that cut heals | It is a heal; they cut it |
| G9 | A mix firing in the middle of a long cast | It fires 0.3 s after the cast's last hit |

---

## Problems that need a pick

- **A1. Small stuns spoil the big ones.** After any stun a foe cannot be stunned for 2 s. Razor
  Wake throws a foe up 0.4 s on every third cut, and Enchanted Edge with earth stuns 0.3 s on
  every 4th basic cut. So the foes beside him are almost always inside the 2 s, and Hilt Bash,
  Quake and every throw up fail on them.
  - a) Those two small stuns do not start the 2 s, and do not land on a foe that is inside it
    (**my pick**; the same fix as the stun of Stonehide's dash).
  - b) Cut both small stuns: Razor Wake only cuts, Enchanted Edge's earth is 10% more damage on
    every 4th cut.
- **A2. Mirror Image, bosses and the tank.** The image turns foes on itself with the taunt
  limits. A boss can be taunted 1 s and then not for 5 s, so the image can use up the window
  Stonehide needs. And a foe Stonehide holds could be pulled off him.
  - a) The image never turns a boss, and never a foe that Stonehide has taunted (**my pick**).
  - b) As written: it turns a boss for 1 s.
- **A3. Cold Edge does almost nothing on a boss.** A boss cannot be slowed, so "15% more to a
  slowed foe" never applies; only its own 4th hit gets the 20% of the boss rule.
  - a) A boss that shrugs off one of his water slows counts as slowed for Cold Edge for that
    slow's time, with no change to how the boss moves (**my pick**).
  - b) Leave it: Cold Edge is a skill for the rooms.
- **A4. Crescendo's trade and damage that ticks.** "Each hit he takes knocks 10 off the count."
  A burning floor or a poison that ticks four times a second would empty a count of 60 in 1.5 s.
  - a) Only a foe's attack knocks 10 off, and at most once a second. Floor beds, hazards and
    ticks do not (**my pick**).
  - b) Every hit, as written. Harsh, but simple.
- **A5. Storm of Blades cannot start twice.** It starts "when the count reaches 30". A Tempo
  build sits above 30 all fight, so the count never reaches 30 a second time.
  - a) When its 15 s are over it starts again by itself if the count is 30 or more (**my
    pick**).
  - b) The count must fall below 30 and climb back.
- **A6. His pushes and the team.** Gale Crescent, Flood and Firestorm push foes away. In a
  party that can push foes off Stonehide or out of an ally's zone.
  - a) Keep the pushes as they are. The AI seat never pushes a foe the tank holds. A push into
    a wall becomes a combo (combo list, C2) (**my pick**; the player decides when to push).
  - b) A foe taunted by an ally is pushed only half as far.
- **A7. Enchanted Edge with wind and Sword Wave keeps foes away for ever.** Every wave pushes
  0.5 u, and he throws one every 0.35 s, so a foe that walks at him never arrives.
  - a) Enchanted Edge moves the same foe at most once a second (**my pick**).
  - b) Leave it: it is two talents working together.
- **A8. Where Thousand Cuts ends.** He ends beside the last foe cut. That can be inside a floor
  warning, with no say for the player.
  - a) He ends beside the last foe cut, but never on a floor warning or a floor bed: he lands on
    the nearest clear spot (**my pick**).
  - b) He always returns to where he began, as the bat does after his three blinks.
- **A9. A dash that cancels a cast.** The dash cancels any wind-up. Triple Crescent has a 0.4 s
  draw. What does a cancelled cast cost?
  - a) Cancelled before anything came out: the skill takes a 2 s cooldown, stores no orb and
    gives no strong cut (**my pick**).
  - b) The full cooldown is paid.

---

## Checked and fine

- The count with Razor Wake (3 a second at most) and the song: bounded by the stop at 30.
- Crescent Finisher at 60 count with Keen Rhythm and two fire orbs: 58 to five foes. High, but
  it is the one skill that pays for the count, on a 6 s cooldown. To measure.
- Dash cuts and safety: the dash, Fox Step, Moonfang, Tide Crescent's hop and Thousand Cuts
  together are well under 2 s untouchable in every 10 s.
- Fusion with one skill and three passives: the same skill twice makes its pure mix. Never dead.
- Tempered with a stun already at 1 s: gains nothing on that part. Fine.
- Orbs when a skill is swapped at a reward: the orbs stay.
- Triple Crescent with Returning Wave and Spirit Swords: one cast, three waves out and three
  back. To measure against a boss.
