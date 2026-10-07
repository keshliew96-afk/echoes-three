# Act IV bosses (content plan 2, item 5)

Level IV, The Hollow Heart, is the campaign's final level. Its boss room, the
Heart Chamber (layout 18), meets one of two bosses, rolled by seed like every
act (`LEVELS[4].bosses` in `src/data/levels.js`; seeds 1 to 40 meet the
Cantor 22 times and the Colossus 18 times). They replace the Barrow Wyrm and
Lich Ram stand-ins of the Act IV world slice.

| | The Hollow Cantor | The Geode Colossus |
|---|---|---|
| Role | the campaign's final boss: the Hollow Heart's singer | the body the Heart grows when the singer stays hidden |
| Kit | `src/sim/bosses/cantor.js` | `src/sim/bosses/colossus.js` |
| Model | `buildCantor` in `src/render/boss/heart.js`: a floating robed figure with a singing mask, a rib cage round a beating violet heart, a halo of seven notes | `buildColossus` in the same file: a slate giant with a geode split open in its chest, crystal spires, cracks that burn when enraged |
| HP | `hpMul` 0.85 | `hpMul` 1.1 |
| Adds | three verses (below) | husks and a censer at 75 / 50 / 25 % |
| Deed, tint | Fell the Hollow Cantor; Tank tint **Hollow Song** | Fell the Geode Colossus; Archer tint **Geode Glass** |

## The Hollow Cantor

A singer, not a brawler: it keeps 3 to 5.5 u from its target.

- **Hollow Note.** A ring (r 1.7, 48-tick warning) at its target, 10 damage.
  From the Second Verse the note echoes: five crystal shards fly out of the
  burst (4 each). Cooldown 240 ticks (180 in the Third Verse).
- **Sung Lance.** A lane from its chest to a target 2.5 to 9 u away (1.2 u
  wide, 54-tick warning), 16 damage. It carries `lance: true`, so AI allies
  step out of it. Cooldown 300 ticks (240 in the Third Verse).
- **Verses.** At 75 / 50 / 25 % it takes a verse it stole from a land above
  and calls that land's beasts (`addsByPhase` on its boss row): the Wood's
  boars and a mantis, the Mill's toad and moths, the Barrow's ram, mole and
  crow. The halo lights a note per verse and a pillar in the land's colour
  marks each one.
- **Echo Step** (Second Verse on). Crowded inside 2.2 u for 45 ticks, it fades
  (18 ticks, not hittable) and reappears at the clear fixed point farthest
  from the party. Cooldown 360 ticks.
- **Heart Pulse** (Third Verse). With a body inside 3 u, a ring round itself
  (r 3.2, 60-tick warning), 18 damage. Cooldown 420 ticks.

Killing it clears Level IV and wins the campaign (the existing Heart ending).

## The Geode Colossus

- **Fissure.** A lane along the floor toward its target (1.0 u wide, up to
  9 u, 54-tick warning), 17 damage, leaving three crystal patches (slick, 35 %
  slow, 4 s). `lance: true`. Cooldown 270 ticks (190 enraged).
- **Geode Rain.** Four geodes fall, one on its target (the player-targeted
  one) and three round it: rings r 1.1 with a 66-tick fall, 11 each, each
  leaving a crystal patch. Cooldown 360 ticks (280 enraged).
- **Geode Burst.** With a body inside 2.4 u, a ring round itself (r 2.6,
  60-tick warning), 20 damage; enraged, six crystal shards fly out (6 each).
  Then it is spent for 80 ticks: no attacks, the party's punish window.
  Cooldown 330 ticks.
- **Enrage** under 40 % HP.

Neither kit draws random numbers, and both stay inside the §11 governor (at
most two live player-targeted telegraphs, starts 72 ticks apart).

## Story

- Bramble's rumour on Level IV names whichever of the two waits
  (`RUMOURS.cantor`, `RUMOURS.colossus`); a boss from another land standing
  in the Heart Chamber still gets the Heart Chamber line.
- The Hollow Voice has a line for each first meeting (`BOSS_VOICE`; the
  Cantor's is the old Heart Chamber taunt, "You carried three verses all the
  way down. Sing them for me.").
- Chapter IV in Quill's "The story so far" names both; the level-clear card
  has a fall line for each. The Heart verse card and the Heart ending are
  unchanged: they already read as the end of the final boss.
- There is no freed warden for Act IV in camp (the Heart's verse is the
  last placed one).

## Look and sound

- VFX (`src/render/vfx/signature.js`, Act IV block; rows in `BOSS_VFX` of
  `src/data/vfx.js`): violet God-stuff for the Cantor (note rings, sung lance,
  verse pillars tinted per land, fade and land, heart pulse, a falling-silent
  death), crystal and ember for the Colossus (fissure run, geode impacts,
  chest burst, enrage, shattering death).
- Medals in `src/ui/hud/icons.js`, wells in `src/ui/hud/style.js`.
- Stings, phase and fall cues, and kit beats in `src/audio/bosscues.js`
  (instruments `glass` and `heart`), calibrated with
  `tools/boss-identity-cuecal.mjs`. Boss grooves are `heart` variants in
  `BOSS_MUSIC` (`src/audio/music.js`).
- `?vfxlab=1`: both bosses in the boss rows (Sound and Rooms), plus an "Act IV
  bosses" section (Cantor verse I / II / III and step, Colossus enrage and
  burst).

## Tuning

Measured with `tools/act4-bossbench.mjs --carried` (the autopilot party
carried from Level I, the boss forced), seeds 2, 3, 7 and 9:

| Boss | Won | Median fight | Damage taken |
|---|---|---|---|
| Barrow Wyrm (old stand-in) | 3/4 | 32 s | 566 |
| Lich Ram (old stand-in) | 4/4 | 51 s | 866 |
| Hollow Cantor | 2/4 | 54 s | about 1000 to 1400 |
| Geode Colossus | 3/4 | 42 s | 812 |

The final boss is meant to be the hardest fight in the campaign; the
Colossus sits at the stand-ins' level. Both are first guesses until played.

## Checks

- `node tools/act4-bosses-probe.mjs` (headless, 36 checks): wiring, both kits'
  attacks, verses and their adds, the governor, the campaign win, save round
  trips, story lines and translations.
- `node tools/boss-identity.mjs --only cantor` (and `colossus`) in the browser:
  medal, sting, groove, a kit beat, phase sting, fall.
