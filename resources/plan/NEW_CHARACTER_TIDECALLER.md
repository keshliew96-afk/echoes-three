# New character plan: the Tidecaller

Written 2026-10-09 from gauntlet at a45a11b (v0.5.255). This is a design pass with no code. It reads the four classes as they are (`src/data/classes.js`, `src/sim/skills.js`, `docs/CLASS_SKILLS.md`, `docs/CLASS_SELECT.md`), the seat model (`src/net/seats.js`, `src/app/playclass.js`), the story (`docs/STORY.md`), unlocks (`docs/UNLOCKS.md`) and content plan 3, which this sits beside.

All numbers below are first guesses, in the same units as the existing skill table (u = world units, cd in seconds, statuses in seconds). They get tuned in play like every other class.

## 1. Who it is

**The Tidecaller**, an otter named **Rill**. The party already has a Mouse (Healer), a Badger (Tank), a Fox (Swordsman) and a Hare (Archer). Rill is a river otter from the Mill, the land whose verse is Water. She was singing the sluices shut when the hollow song took the Millwheel, and she joins the bell once the party frees the Water verse.

**Role: ranged control caster.** The four classes cover support, frontline, close damage and ranged physical damage. Nothing in the party bends the fight: pulls enemies into a pile, slows a rush, sets up the other three. The Tidecaller does that with water, and it hits hardest when the others have done their part.

**How it plays in one line:** soak enemies with cheap shots and pools, then crash a wave into the soaked ones for big damage, while pulling the pack into the Tank's arc and the Archer's rain.

**Look.** A sleek dark-brown otter with a cream throat, a reed-and-shell staff, a satchel that drips, and a conch on a cord. She stands upright to cast and drops low to dive. Idle: a tail flick and a shake that throws droplets. Her signature colours (VFX) are **Deep Cobalt** `#3F7FE6` glow with **Sea Foam** `#E6F3F7` second tone and **River Pebble** `#7C8A93` debris. That stays clear of the reserved hues (Ember, Bright Heal, Violet) and reads apart from the Archer's Wind Jade and the Tank's Forge Steel, because cobalt is saturated where steel is grey.

**Body (first guesses):** 85 HP (Archer 80, Healer and others unchanged), the Archer's move speed, the same dodge cooldown as everyone.
- **Basic attack: Spit.** A fast water bolt, 6 damage, range 4.5 u. It does not soak (so the basic attack never does the class's work for free).
- **Dodge: Dive.** The usual dodge distance and i-frames, but she drops into a splash and surfaces at the end, leaving a 1 s puddle that soaks enemies who step in it.

## 2. The class mechanic: Soaked

One new status, **Soaked** (`soaked`):
- Applied by most Tidecaller skills. Lasts 4 s, refreshed on each new soak. An enemy shows a dark wet sheen and dripping droplets; the HP bar gets a small blue drop pip.
- A soaked enemy moves 15% slower (the existing `slow` math, a separate status so it stacks with Rain of Arrows the same way two slows stack today).
- **Crash.** Skills marked *Crash* deal **+60%** to a soaked enemy and **consume** the soak. This is the whole rhythm: soak, then crash.
- Bosses can be soaked (the slow drops to 5% on them) and crashed. Champions and elites behave like normal enemies.
- Interactions kept small: a *Frozen*-affix elite cannot be soaked (it is already ice). No other class reads Soaked unless a node or relic says so (section 5 and 9).

New skill keys in `src/sim/skills.js`: `soak` (the cast soaks what it hits), `crash` (the +60% and the consume), `dragZone` (a ground zone that pulls toward its centre each tick). The existing `pull`, `status`, `grant` and `selfStatus` keys do the rest.

## 3. The skill set: 11 skills, the same size and shape as the Tank, Swordsman and Archer

Four are the reference kit (`CLASS_BASE_KIT`), seven join the draft pool. As with every class since v0.5.227, all four slots start empty and every skill comes from wave rewards (or an Unlocks kit). The 4-skill cap and the swap rule (ruling A17) apply unchanged.

| # | Skill | Abbrev | Shape | Numbers | What it does |
|---|---|---|---|---|---|
| 1 | **Riverbolt** | RB | projectile | 14, range 5.0 u, speed 6.0, cd 2.5 | Soaks. The bread-and-butter soaker. |
| 2 | **Undertow** | UT | ground_aoe | 6/s for 4 s, r 1.0, range 3.5 u, cd 8 | Soaks every tick and drags enemies 0.25 u per tick toward the centre (not bosses). |
| 3 | **Breaker** | BK | nova | 22 to up to 5 in 1.4 u, cd 8 | **Crash.** Knocks enemies back 1.0 u. Her answer to being rushed. |
| 4 | **Tidepool** | TP | aura (passive) | 5 to the 2 nearest enemies in 2.5 u, each 1 s | Soaks. A slow trickle so soaks never fall off in a long fight. |
| 5 | **Torrent** | TO | projectile (piercing) | 18 to every enemy on the line, range 5.5 u, cd 6 | **Crash.** A narrow jet that goes through the whole line. |
| 6 | **Whirlpool** | WP | ground_aoe | 4/s for 5 s, r 1.4, range 4.0 u, cd 12 | Soaks, drags 0.5 u per tick toward the centre, 30% slow inside. The signature control skill: it piles a pack up for the Tank. |
| 7 | **Ripple Step** | RS | dash + ground | 2.6 u dash away from the nearest enemy, i-frames, cd 7 | Leaves a 3 s puddle r 0.8 where she stood: soaks, 6/s. Her escape. |
| 8 | **Bubble Ward** | BW | guard (direct) | 14 shield on the most-threatened ally in 4.0 u, 4 s, cd 11 | When the bubble breaks or ends it bursts: soaks enemies within 1.0 u. Her one way to help an ally directly (the Healer stays the healer). |
| 9 | **Crashing Wave** | CW | melee_arc (wide, long) | 20 to up to 6, reach 2.2 u, 100°, cd 9 | **Crash.** Knockback 1.2 u. A rolling wave in front of her. |
| 10 | **Rain Squall** | SQ | ground_aoe | 3/s for 6 s, r 1.8, range 5.0 u, cd 14 | Soaks, 25% slow. Covers a whole doorway or a defend point. |
| 11 | **Maelstrom** | MA | nova (delayed) | Pulls everything in 3.0 u 1.0 u inward (not bosses), then at 1 s bursts for 40 to up to 8 in 1.6 u, cd 16 | **Crash.** The capstone: drag the room in, then drown it. |

Shapes reuse the six the game already has (`projectile`, `ground_aoe`, `nova`, `melee_arc`, `direct`, `aura`); only the piercing jet, the delayed burst and the bubble burst need small new keys (`pierceAll`, `delaySec`, `burstOnEnd`).

**Gating.** All eleven are campaign-only (`CAMPAIGN_ONLY_SKILLS`) like the nine added in v0.5.240, so the legacy run, the tutorial and the `?room=` harness never see them.

## 4. Class nodes: 8, like the others (6 + 2)

| Node | Rarity | Effect |
|---|---|---|
| **Wellspring** | common | Soaks from this skill last +2 s (per copy). |
| **Deluge** | common | Projectiles leave a 2 s puddle (r 0.6) where they land; the puddle soaks. |
| **Current** | common | +15% power per soaked enemy within 3 u when the cast lands, up to +45%. |
| **Ebb** | common | After a Crash lands, her other skills' cooldowns drop 0.5 s. |
| **Spring Tide** | common | Soaking an enemy that is already soaked **drenches** it: the slow becomes 30% for the rest of the soak. |
| **Undercurrent** | common | Pulls from this skill drag 40% farther; on a pushing skill, it pulls instead. |
| **Riptide** | rare | A Crash also stuns for 0.4 s (not bosses). |
| **Confluence** | rare | When any ally hits a soaked enemy, her lowest-cooldown skill ticks 0.1 s faster (at most once per 0.5 s). The party-play node. |

Verdicts (which skills a node works on, grey or inert) go in `classVerdict` in `src/sim/nodes.js` as for the others. Two of the eight (Undercurrent, Confluence) are the "later additions" and also campaign-only, mirroring Rampart, Crush and the rest.

**Shared nodes she can draw** (13, like the Archer): sharpen, quicken, multiply, ascend, widen, reach, linger, bounce, split, snare, echo, resonance, siphon.

## 5. How AI allies play her

When an AI holds her seat (solo, or an empty co-op seat), she plays like the Archer with a caster's brain:
- **Stand-off and safety:** the 3.4 u leash ring, the Archer's kite (`AI_KITE`, back off a hostile inside 1.6 u) and glob evasion (`AI_EVADE`). Ripple Step is her panic button: cast when a melee enemy is inside 1.2 u.
- **The soak-then-crash rule:** a Crash skill waits until at least two soaked enemies are in its reach, or one soaked elite, champion or boss; past `AI_IDLE_FALLBACK_TICKS` it casts anyway, like every overdue active.
- **Zones** (Undertow, Whirlpool, Rain Squall) aim at the densest enemy cluster, preferring one within 2 u of the Tank so the pull feeds the Tank's arc; on a defend room they aim at the point.
- **Bubble Ward** goes to the member under the most threat (most enemies targeting it), Tank last since the Tank has its own shields.
- **Equip priority** (`AI_PRIORITY.tidecaller`): riverbolt, whirlpool, torrent, undertow, crashing_wave, maelstrom, breaker, bubble_ward, rain_squall, ripple_step, tidepool.
- Shop: the existing AI relic buys and the per-seat shelf work unchanged once the shelf reads the seat's class from the lineup (section 6).

## 6. Four seats, five classes: the party lineup

This is the one structural change. Today **seat = class** everywhere: seat 0 Healer, 1 Tank, 2 Swordsman, 3 Archer (`CLASS_OF_SEAT`, `SEAT_CLASSES`, about 50 uses across the sim, the HUD, the shop, the draft, the camp, unlocks and the network code). There are still only four seats.

> **Changed 2026-10-09 (Kesh, 16:02):** the picker chooses **who joins the team**, not who stays at camp, because more playable characters will follow. In co-op each human picks their own character first, then the host picks who joins as AI for the empty seats. Built that way in slice 2 (v0.5.262, PR #47); the "Who stays at camp?" wording below is superseded.

**The plan: a run has a lineup.** The Healer always holds seat 0 (the bell-carrier and leader bot, and the story's centre). Seats 1 to 3 hold three of the four other classes. Choosing the Tidecaller means choosing who stays at camp:
- **Solo:** the class picker gets a fifth card. Picking the Tidecaller (or pressing the new *Lineup* chip in camp) asks "Who stays at camp?" with Tank, Swordsman and Archer; the default is the **Archer**, the other ranged seat. The Tidecaller takes that seat. The benched class stands by the camp fire during the run.
- **Co-op:** the host sets the lineup in the lobby before the run starts; seat chips show the lineup's classes and critters. A lineup is fixed for the run, like the class choice today.
- **Default lineup** is Healer, Tank, Swordsman, Archer, exactly today's party. A run that never touches it is byte-for-byte today's run, so the nine goldens and the replays do not change.

**Engineering:** `CLASS_OF_SEAT` becomes the default of a per-run `lineup` (saved with the run, sent in the network start message); every reader asks `classOfSeat(seat)` instead of indexing the constant. Pools, shelves, AI priority, class relics, HUD accents, end cards and unlock kits all key off the class, so they follow for free once the lookup is right.

**What the "classes beyond four" limit (ruling A8, `docs/BUILD_BRIEF.md`) was protecting, and how this keeps it:**
- *Four co-op seats and one party of four:* kept. Still four seats, four bodies; enemy counts and room scaling, which are tuned for four, do not change.
- *Seat = class across the code:* replaced by one lookup with today's mapping as the default. This is the risky part, so it gets its own slice with no new content (slice 1 below).
- *The AI party fill:* the fill already plays whatever class a seat holds; the Tidecaller adds one more brain (section 5).
- *The tutorial:* stays the four classes; it runs outside the campaign and never sees campaign-only content.
- *The goldens:* the default lineup plus the campaign-only gate keep all nine identical.
- *Scope:* one class, built in four slices, without the other A8 items (talent trees, new currencies, camp facilities stay out).

## 7. Unlock, story and the rest of the game

- **Unlock:** Rill is freed with the Water verse. The first time any run fells Level II's boss (the Drowned Heron or the Millwheel), she appears in camp by the sluice-side of the fire and the class unlocks for every later run, with a one-time toast "The Tidecaller joins the party." A save that already holds the Water verse unlocks her on load. The Level Select and class picker show her card locked until then with the requirement written on it. (Alternative if Kesh wants her playable at once: available from the start. One flag.)
- **Story:** Rill joins the people table in `docs/STORY.md`: four camp lines (E near her) that follow the verses held, one line on the Level II clear card, a Hollow Voice line the first time she is in a Mill boss room. Wick gets one new line about her.
- **Unlocks (Embers):** a kit **Millrace (Tidecaller)**, 80 Embers, needs her unlocked: Riverbolt, Undertow, Torrent, Bubble Ward. A tint **Brine** (Tidecaller), 30 Embers, recolours her to sea-green and pearl. A free tint **Heron Rain** for felling the Drowned Heron with her in the party.
- **Deeds:** *Rill's Return* (clear a level with the Tidecaller in the party, 25), *High Water* (crash 5 soaked enemies with one cast, 30).
- **Relics (two Tidecaller class relics, campaign-only):** **Otter's Pearl** (common): the Tidecaller's crashes heal her for 2 per enemy hit. **Millrace Charm** (rare): any ally's hit on a soaked enemy has a 25% chance to spread the soak to one enemy within 1.5 u.
- **Journal:** the Relics page lists her two relics with the class tag; the Deeds page lists the two deeds; the story page shows Rill under the people met. No new page.
- **Tutorial and tips:** a new one-time tip `lineup` the first time the lineup choice opens ("Four seats, five friends: one stays at camp."), and the `classes` tip text mentions five classes once she is unlocked. A `soaked` tip the first time a soaked enemy is crashed.
- **Endless and Daily:** both start through `startCampaign`, so she is playable in both. The Daily board shows each entry's class icon so a Tidecaller score is visible as one.
- **HUD and menus:** party strip portrait and accent, 11 skill icons in `src/ui/hud/icons.js`, her shelf tab and bench in the shop, class name in the draft, socket screen and end cards, her spot in camp (`CAMP_SPOTS`), the network seat labels and the controls overlay. All through the class lookup.

## 8. Look, VFX and sound

- **Model:** a new critter rig `src/render/critters/tidecaller.js` on the shared rig in `common.js`: cast pose with the staff raised, a low swim-run, a dive (body arcs down into a splash ring and resurfaces), hit flinch, downed pose (curled with the conch) and revive. The afterimage and HP-bar anchor reuse the shared code.
- **VFX** (`src/data/vfx.js` CLASS_VFX row, `VFX_SIGNATURE.tidecaller`, beats in `src/render/vfx/signature.js`), held to the AAA bar: Riverbolt is a twisting water bolt with a foam trail and a splash crown on hit; Undertow and Whirlpool are spiralling caustic discs with foam lines streaming inward; Torrent is a pressurised jet with a shock ring at the muzzle; Breaker and Crashing Wave are curling cobalt walls of water that break into spray and leave wet ground decals; Bubble Ward is a refracting bubble that pops into droplets; Rain Squall drops streaking rain and ripple rings; Maelstrom spins a funnel, holds a beat, then erupts in a column. Soaked enemies get a wet sheen and drips; a Crash on a soaked enemy flashes foam white and plays the heavy-hit feedback. `?vfxlab=1` gets Tidecaller A, B and C reels with all eleven skills.
- **Sound** (procedural, `src/audio/tidecues.js`, `CLASS_SKILL_CUE` rows and `CUE_CAL` entries): filtered-noise splashes, bubble plinks (short pitched sine blips), a low swell for waves and the Maelstrom, a hollow conch note on Bubble Ward, and a bright splash-plus-thump on a Crash so the payoff is heard. Volume calibrated against the existing class cues.

## 9. Text, probes and goldens

- **Text:** about 70 strings (class and critter names, 11 skills, 8 nodes, Soaked, lineup screen, Rill's lines, two relics, two deeds, kit, tints, tips) in all ten languages, through the translation tables (`docs/I18N.md`).
- **Probes:** `tools/tidecaller-probe.mjs` (headless): data and gate checks, lineup default equals the old mapping, a campaign room with the Tidecaller seat cast by the AI, soak and crash numbers, every node verdict, the shop shelf, a mid-fight save round trip with a non-default lineup. `tools/tidecaller-browser.mjs` takes the screenshots under `/mnt/project-files/<slice>/`. `node tools/gntM2-goldens.mjs` stays 9/9 on every slice.

## 10. Build slices

Each is one thread and one draft PR into gauntlet from its current head, version bumped in `src/version.js` (the next free number when the slice starts; the two enemy threads running now take 0.5.256 and 0.5.257, so these likely land as 0.5.258 onward), ten languages, one probe plus the nine goldens, no merge before Kesh says go.

| # | Slice | What ships | Risk |
|---|---|---|---|
| 1 | **Party lineup** | The per-run lineup, `classOfSeat()` in every reader, save and network carry, the camp *Lineup* chip and lobby control (showing only the four classes for now). No new class. | Medium: touches about 50 call sites; the goldens and a co-op probe prove the default lineup is unchanged. |
| 2 | **The Tidecaller, playable** | Class data, the otter rig, Spit and Dive, the four base skills, Soaked and Crash, the AI brain, class picker and lineup card, HUD and shop wiring, ten languages. Playable from the start in this slice so it can be tried at once. | Medium: new status and AI rules. |
| 3 | **The whole kit** | The other seven skills, the eight class nodes and their verdicts, all VFX beats, the sounds, the VFX lab reels. | Low to medium: data plus render. |
| 4 | **Rill in the world** | The Water-verse unlock and camp spot, story lines, the kit and tints, two deeds, two relics, Journal entries, the `lineup` and `soaked` tips, the Daily class icon. | Low: profile and presentation, relics behind the campaign gate. |

Slices 3 and 4 can run in parallel once slice 2 is in; slice 1 must merge first.

## Other characters that could follow

- **Thornwarden**, a hedgehog bruiser: thorns and counter-hits, a second frontline.
- **Delver**, a mole summoner: burrowing traps and short-lived earth minions.
- **Duskwing**, a bat assassin: life-steal dives and darkness that blinds packs.
- **Bellwright**, a beetle tinkerer: chiming turrets and bell-shield support.

The lineup from slice 1 makes each of these one class's worth of work, not another seat rework.
