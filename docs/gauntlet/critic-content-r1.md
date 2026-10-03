STATUS: COMPLETE
VERDICT: FAIL (1 must-fix: the Act II Stag room is a difficulty DIP, not a spike — median party damage 496 vs 637 in Act II room 6 kill_all, time 28 s vs 41 s over seeds 1-5; every other spec item, every re-measured M4a/M4b/M4c gate, all 3 acts by real input, 4-skill cap, 8 uncapped sockets, saves, VFX and interactables pass with 0 page errors; benchmark 42/44).

# Critic — CONTENT EXTENSION — round 1

Critic instance 2026-09-24 against v0.5.62 (branch gauntlet, HEAD 2c67b2a, dev server 127.0.0.1:5199). Prefix for every file I created: `gntccontent1-` (tools/gntccontent1-probe.mjs, tools/gntccontent1-probe2.mjs, tools/actions/gntccontent1-*.json, captures/gntccontent1-*). No src/**, server/**, PLAN.md or BUILD_BRIEF.md edits; nothing committed. Judged only the running game: captured pixels, console logs, debug-API state, storage, the act runner's raw per-room data (statistics recomputed by me), never code.

## Step log
- [x] Step 0: checkpoint file created.
- [x] Step 1: blind benchmark checklist written (44 items) BEFORE any capture was viewed (section 1 below, unchanged).
- [x] Step 2: smoke (captures/gntccontent1-smoke.png) exit 0, 0 PAGEERROR (plain URL = title). ARCH core loop by real input (held W → portal tick 507 → E → combat room 1 tick 529 → reward): `run_start@519 → room_cleared@632 → reward_offer@632`, 0 PAGEERROR (captures/gntccontent1-coreloop.png shows the reward page with the 4-tile command bar + 8-pip strips and the "Spoils → bench" line).
- [x] Step 3: real-input full acts (tools/gntM4c-realrun.mjs, keyboard + mouse only): Act I seed 1 VICTORY 8/8 (captures/gntccontent1-realrun-a1s1.json), Act II seed 1 VICTORY 8/8 (…-a2s1.json, fps median 82), Act III seed 3 VICTORY 8/8 (…-a3s3-b.json, fps median 82); 0 page errors in all three. (A first Act III attempt run concurrently with four GPU probes lost in room 3 — …-a3s3.json — the re-run alone won; the loss was machine contention, not a game fault: defeat card → camp worked, 0 errors.)
- [x] Step 4: probe harnesses written and run; every scenario JSON in captures/gntccontent1-<scenario>.json, all with `pageErrors: []`.
- [x] Step 5: Node act-runner sweep (captures/gntccontent1-actrun-node-s1-5.json) with my own statistics (captures/gntccontent1-curve-stats.json).
- [x] Step 6: command bar / shop / socket screen at 1024×576, 1600×900, 2560×1440; picker; genuine v0.5.39 save; grey-strike pixels; harrowing live start. Report written; my vite preview on 4326 stopped.

## 1. BLIND BENCHMARK CHECKLIST (written 2026-09-24 BEFORE inspecting any Echoes capture)

Source systems: Hades (biome identity, escalating encounters, boon/slot build variety), Dead Cells (biome variety, hazard design), Enter the Gungeon (enemy readability, telegraphs), Slay the Spire (act difficulty curve). Each item is something those shipped games demonstrably do; each is scored later as MET / PARTIAL / NOT MET with evidence.

### Hades — biome identity, escalation, build variety
| # | Item (what the shipped game does) | How I will test it in Echoes |
|---|---|---|
| H1 | Every biome has a dominant palette a player names from a thumbnail (Tartarus green-grey stone + violet; Asphodel red-black lava; Elysium gold-green-white). | analyzer HUEMIX on a floor box per act; the mix must differ by >= 15 points in some channel between any two acts; view each frame at 50% size and confirm it is nameable |
| H2 | Every biome has its own prop set (urns/chains vs bone piles/lava rocks vs marble columns/banners). | prop-type list per act from the dressing probe; >= 6 prop types per act, >= 3 unique to it; visible in the frame |
| H3 | Later biomes bring enemy types not seen earlier (Bloodless/Gorgons in Asphodel, Exalted in Elysium). | roster per act from the live room plans: Act II adds >= 2 archetypes over Act I, Act III adds >= 2 over Act II |
| H4 | Each biome has its own music and ambience. | `__echoes.audio.music().theme` / ambient bed id differs per act in a live run |
| H5 | The location name is shown on entering a region. | HUD location plate text per act |
| H6 | Armored/elite variants appear from mid-game with a visible marker (gold armor bar); frequency rises deeper. | elite chance per room/act rises; an elite in frame carries a distinct visible glyph; HP x1.8 measured |
| H7 | Boon cards state exact numbers, carry a rarity glyph/colour, and offers are filtered so a useless boon is never sold as useful. | draft/shop card text shows numbers + rarity; `usable_by_party` filter; verdict lines "fits your kit" vs "nothing uses this" |
| H8 | The slot count is fixed and visible; you are never offered a boon for a slot you cannot fill; replacing is explicit. | with 4 skills owned the reward never offers a skill; a 5th giveSkill is refused; the substitution line is shown |
| H9 | Boss chambers escalate far above the hallway fights before them (Meg -> Lernie -> Theseus) and use biome-specific adds. | boss room party damage above rooms 5-6 in every act; act-specific adds spawn |
| H10 | Chamber-to-chamber escalation inside a biome is felt (more/tougher foes deeper). | enemy count, HP mult, damage mult per room rise monotonically within an act |

### Dead Cells — biome variety, hazard design
| # | Item | Test |
|---|---|---|
| D1 | Each biome has a distinct tileset and lighting hue (Prisoners Quarters blue-grey; Toxic Sewers green; Ossuary bone/red). | floor HUEMIX + LUMA per act; art-bible reserved bands respected (Ember only on threats) |
| D2 | Hazards are legible as hazards in their idle state without using the danger colour (spikes, glowing toxic pools). | idle hazard frame: hazard visible, 0 or near-0 px in the Ember band |
| D3 | Hazards wind up before they hurt (trap light-up ~1 s). | hazard_telegraph -> hazard_resolve >= 42 ticks (0.7 s) for every damaging hazard type |
| D4 | Traps hurt enemies too so the player can use them. | hazard damage applies to a hostile standing in it (affects: all) |
| D5 | Hazards never sit on the entry point or under a spawning enemy. | party entry zone free of hazards in every layout; placements away from spawn ring |
| D6 | Elite enemies carry a distinct aura and a bigger HP pool. | elite HP x1.8, crown glyph visible |
| D7 | Later biomes field more and tougher enemies per screen. | live enemy count and HP per room by act |
| D8 | Static slow/damage floor patches show their extent exactly (the effect radius equals the drawn patch). | bramble/slick slow radius equals drawn radius; walk speed inside measured |

### Enter the Gungeon — enemy readability and telegraphs
| # | Item | Test |
|---|---|---|
| G1 | Each enemy silhouette tells you its attack (Bullet Kin small, Shotgun Kin wide, Gun Nut armored). | 50%-scale frame with all 7 archetypes + elite; each nameable by outline alone |
| G2 | Every attack has a pre-attack tell of a readable length; bosses longer. | telegraph_start -> telegraph_resolve >= 42 ticks for quillback / toad / moth / ram / mole; drawn in Ember |
| G3 | The drawn danger shape is literally the hit area. | telegraph lane/ring/cone dimensions equal the damage geometry (r, lane width) |
| G4 | Enemy types behave differently (charger, lobber, flier, shield, ambusher). | quillback charge speed 6 u/s; toad glob lands at locked point; moth crosses ground hazards unslowed; ram blocks frontal bolts; mole burrowed untargetable |
| G5 | Hits show flash + number; deaths pop; a dead enemy never hurts you. | hit/death events with numerals in frame |
| G6 | Enemies do not attack the instant they appear (spawn-in shimmer first). | spawn_telegraph precedes the live entity |
| G7 | Fliers visibly ignore floor hazards. | moth speed through bramble = open-floor speed |
| G8 | Armored/shielded foes show the block ("clink"). | hit_blocked event + Bone "blocked" numeral in frame |
| G9 | The player is never asked to dodge many things at once at room start (attack governor). | <= 2 concurrent player-targeted telegraphs; starts >= 1.2 s apart |

### Slay the Spire — difficulty curve across acts
| # | Item | Test |
|---|---|---|
| S1 | Enemy HP/damage rise act over act at the same floor and floor over floor inside an act. | difficulty table hpMul/dmgMul strictly increasing within an act; I < II < III at equal room |
| S2 | Elites appear more often deeper. | elite chance rises with room and act |
| S3 | The boss is a spike far above the last hallway fight. | boss room time and party damage above rooms 5-6 medians |
| S4 | Build growth is paced with the curve (about one card per fight) and the default build still wins Act 1 reliably, Act 3 less so. | node supply per room (spoils + drafts + shop) fills a meaningful share of 32 sockets; act-runner victory rates I >= II >= III with Act I >= 3/5 |
| S5 | Ascension-style modifiers change concrete numbers. | challenge relaxed/standard/harrowing changes hpMul/dmgMul at run start |
| S6 | Later acts are locked with a stated reason until the earlier act is won. | picker shows "Win Act I to unlock"; bypass params work |
| S7 | Every card has a stated numeric effect; none is dead text. | each of 9 new nodes has a measurable sim effect on at least one skill; each of 9 new skills produces its authored numbers |
| S8 | A card that would currently do nothing is still legal and labelled so. | grey strike / "+0" verdict shown and socketing proceeds |
| S9 | A mid-run save resumes exactly, including saves from an older build. | schema-1 save loads with 0 page errors; first 4 skills kept; rows padded to 8 |

### Production-polish items common to all four
| # | Item | Test |
|---|---|---|
| P1 | Interactables show a button prompt in range and respond with animation + sound + a visible used/cooldown state. | prompt within 1.1 u for all 5 assets; E -> event + frame change + cue |
| P2 | Cover blocks shots and movement and can be destroyed (Gungeon tables). | barricade blocks a bolt and a walk; breaks at 0 HP |
| P3 | Explosives have a fuse and hurt both sides (red barrels). | keg: fuse >= 0.7 s Ember, blast hits enemies AND party |
| P4 | Build/inventory screens fit every 16:9 size without overlap or scrolling and every cell is readable. | socket screen 4x8 + bench at 1024x576 and 2560x1440: 0 DOM overlaps, inside viewport, text >= 12 px |
| P5 | Build screens are fully navigable by keyboard, mouse and gamepad with one visible cursor. | pick/place/remove by keys; click/right-click; mock pad D-pad/A/B/X/Y |
| P6 | Zero crashes/page errors across all of the above. | console.txt [PAGEERROR] count = 0 in every probe |
| P7 | The original core loop still plays by real input. | camp -> portal (held W, E) -> room 1 -> reward by the ARCH action file; a full 8-room act by keyboard+mouse |

Scoring rule: MET = evidence meets the test; PARTIAL = works with a measurable shortfall; NOT MET = absent or broken. A NOT MET on an item a player would feel as broken or unpolished is a must-fix.

## 2. PROBE TABLES (measured on v0.5.62; every number from a named capture/JSON)

### 2.1 Level configurations — biome identity (captures/gntccontent1-biome-a{1,2,3}.png, -50.png, boss-a{1,2,3}.png; gntccontent1-biomes.json)
| Act | HUD plate | layout / dressing | hazards in room 2 | interactables | enemies alive | music theme (live) | ambient bed | boss adds (live, HP) |
|---|---|---|---|---|---|---|---|---|
| I | UNEASY WOODLAND · ROOM 2 OF 8 · HOLD THE WAYSTONE | 1 Beaten Clearing (wood) | bramble×2, puffcap×2 | barricade×2, keg×2 | quillback, mantis, boar×2 | `wood` 104 bpm dorian → boss 127 bpm | `wood` | boar 20, boar 20, mantis 15 (×1.0) |
| II | THE SUNKEN MILL · ROOM 2 OF 8 · HOLD THE WAYSTONE | 5 Weir (mill) | millrace×2, puffcap×2 | sluice, dewfont, barricade×2, keg | moth×3, quillback | `mill` 96 bpm aeolian → boss 117 | `mill` | toad 39.1, moth 18.4 ×2 (×1.15, dmgMul 1.105) |
| III | THE ASHEN BARROW · ROOM 2 OF 8 · HOLD THE WAYSTONE | 8 Ossuary Row (barrow) | rockfall, gravefire×2 | dewfont, barricade×3, keg×2 | mole×2, quillback×2, ram | `barrow` 88 bpm phrygian → boss 107 | `barrow` | ram 157.5, mole 42 ×2 (×1.75, dmgMul 1.525) |

Analyzer (tools/analyze.mjs), full combat frames: Act I LUMA>160 5.88% / >200 1.07% / 16/16 buckets / FLAT 2.18%; Act II 2.21% / 0.82% / 15/16 / 1.37%; Act III 2.70% / 0.81% / 16/16 / 1.90% — all above the §19.3 bars (≥1.5 / ≥0.4 / ≥13 / <20). Boss frames: I 3.78/1.47/16, II 2.67/1.16/16, III 3.85/1.44/16. Floor box 560,560,320,140 HUEMIX (warm|foliage|cool): I 24.6|23.8|51.6 · II 76.1|2.6|21.3 · III 58.0|3.0|39.0 — every pair differs by ≥ 15 points in some channel (foliage I vs II/III: 21 pts; warm II vs III: 18 pts). Violet px (act tell): I 2195 (monolith), II 3615 (mill wheel), III 308 in the wave frame / 12080 in the boss frame (Stag). At 50% (biome-a2-50/a3-50) the Mill (blue slate flagstones, black water channels, moss, violet mill wheel, lantern posts) and the Barrow (blue-grey grave paving, ochre dead grass, bone cairns, grave slabs, braziers, violet-veined standing stone) are nameable without the HUD; Act I keeps the certified green-woodland look. Prop types counted in the frames: Act I torches, fences, barrels, crates, logs, grass, waystone, rocks (≥ 8); Act II lantern posts, flagstones, water channels, reed beds, timber crates, barrels, sluice gate, mill wheel, footbridge, moss (≥ 8, ≥ 5 unique); Act III braziers, grave slabs, bone cairns, standing stone, urns, ash drifts, dead grass, gravefire slabs, barrels (≥ 8, ≥ 5 unique). (The dressing probe `cmd('arenaLayout')`/`__arenaProbe.layoutState()` reports builder state only — no prop list — so prop counts are from pixels.)

### 2.2 Difficulty curve — table vs live sim (gntccontent1-curve.json: per act, per room, `cmd('skipToRoom', r, {act})`, spawned entities read from `content.world().entities()`)
| act/room | table hp / dmg / budget / elite / wave interval | spawned maxHp ÷ base (every hostile) | party hits sampled (attacker: amount) |
|---|---|---|---|
| I r1 | 1 / 1 / 4 / 0 / 480 | boar 1.00 ×3, mantis 1.00 | — |
| I r2 (defend) | 1.16 / 1.08 / 5.8 / 0 | ×1.16 ×5 | boar 10.8 (=10×1.08), keg 30/30/45 |
| I r3 (defend) | 1.32 / 1.16 / 6.6 / 0 | ×1.32 ×6 | 11.6 (=10×1.16) |
| I r4 | 1.48 / 1.24 / 5.92 / 0.08 / 422 | ×1.48 ×5 (quillback in) | — |
| I r5 | 1.64 / 1.32 / 6.56 / 0.08 / 403 | ×1.64 ×5 incl. elite ×1.8 | 13.2, 16.5 |
| I r6 | 1.8 / 1.4 / 7.2 / 0.08 / 384 | ×1.80 ×7 | 14 (=10×1.4) |
| I r8 boss | Stag 2400 | stag 2400; adds boar 20, boar 20, mantis 15 | — |
| II r1..r6 | 1.15/1.075/4.6/0.12/456 → 2.07/1.535/8.28/0.22/365 | ×1.15, ×1.334, ×1.518, ×1.702, ×1.886 (toad elite ×1.8), ×2.07 | toad 16.21 (=12×1.351), 21.65 (=12×1.443×1.25 elite), 18.42 (=12×1.535) |
| II r8 boss | Stag 2760 | stag 2760; adds toad 39.1, moth 18.4×2, dmgMul 1.105 | — |
| III r1..r6 | 1.75/1.375/7/0.20/432 → 3.15/2.075/12.6/0.35/346 | ×1.75, ×2.03, ×2.31, ×2.59 (elites ×1.8), ×2.87, ×3.15 | mole 15.13 (=11×1.375), ram 29.79 (=18×1.655), mole 24.68 (=11×1.795×1.25), ram 43.54 (=18×1.935×1.25), quillback 24.9 (=12×2.075), mole 28.53 |
| III r8 boss | Stag 4200 | stag 4200; adds ram 157.5, mole 42×2, dmgMul 1.525 | — |

Table = the M4c constants (T 1.00/1.15/1.75, slope 0.16, defend ×1.25, Stag 2400·T, Stag dmg ×1/1.105/1.525) exactly; hpMul strictly increasing within every act and I < II < III at every room; elite chance 0→0.08 / 0.12→0.22 / 0.20→0.35; wave interval 480→384 / 456→365 / 432→346 ticks; wave sizes 4–7 (I), 3–6 (II), 3–7 (III) with elites from Act I r4. Relaxed table ×0.75 HP / ×0.7 dmg; harrowing live start (gntccontent1-final.console.txt): `startRun({challenge:'harrowing'})` → room 1 hpMul 1.25 / dmgMul 1.3, spawned boars 25 HP dmgMul 1.3. Shop at r7 in every act: wallet 72, 4 cards 15/15/20/25 (2 common + 1 rare + 1 legendary).

Felt curve (Node act runner, seeds 1–5, statistics recomputed by me — captures/gntccontent1-curve-stats.json):
```
per-room medians (time s / party damage)      r1     r2     r3     r4     r5     r6   | boss
Act I    11.5/25   18.4/24   22.2/36   22.8/72   45.0/92   32.3/133 | 20.7/321   wins 5/5  rho(time) 0.943  rho(dmg) 0.943
Act II   16.3/108  28.4/218  29.4/232  29.6/295  45.0/510  49.4/759 | 28.0/496   wins 4/5  rho 1.000 / 1.000
Act III  16.5/165  32.7/399  27.9/302  39.1/505  49.5/820  45.7/1019| 39.3/1363  wins 3/5  rho 0.886 / 0.943
kill_all-only room medians (damage): I 25,22,36,72,271,140 · II 108,211,178,295,456,637 · III 165,304,188,505,301,949
damage plot (median party damage per room, '#' = 50):
 I   r1 #   r2 #   r3 #   r4 ##  r5 ##  r6 ###  boss #######
 II  r1 ##  r2 ####  r3 #####  r4 ######  r5 ##########  r6 ###############  boss ##########   <- DIP at the boss
 III r1 ###  r2 ########  r3 ######  r4 ##########  r5 ################  r6 ####################  boss ###########################
```
Act medians I < II < III at every room; defend rooms (45 s) above their kill_all neighbours; Act I boss 321 vs r6 140 (×2.3) and Act III boss 1363 vs r6 949 (×1.4) are spikes; **Act II boss 496 is BELOW room 6 (637 kill_all-only, 759 mixed) and faster (28 s vs 41/49 s)** — see failure F1. Stuck rooms 0/15; max combat-room median 49.5 s.

Node supply (same runs): sockets filled at run end Act I 19/19/19/19/19 of 32 (59%), drafts 6, buys 3 per run; Act II 11–19; Act III 8–17 (lower in the defeats). Draft page shows "Spoils → bench: …" (2 nodes per clear).

Telegraph governor over 95 sampled player-targeted telegraphs (all rooms, all acts): max concurrent 1, min start gap 72 ticks (1.2 s), 0 violations; telegraph length histogram 42:30 45:11 48:12 60:31 72:8 107–125 (boss) — nothing under 42.

### 2.3 New enemies (gntccontent1-zoo.json, zoo2.json; captures tele-{quillback,moth,ram,mole}.png, elite.png, biome-a2/a3)
| enemy | telegraph (ticks, shape) | Ember px in the telegraph frame (idle arena 46) | behaviour measured | damage |
|---|---|---|---|---|
| Quillback | 48, lane (0.8 s) | 21 339 | charge 6.0 u/s for 8/8 sampled ticks then walk 1.68; charge ends at 60 ticks (`enemy_charge_end`); 12 contact dmg once per target (3 allies 12/12/12 in one charge) | 12 |
| Mire Toad | 60, ring r 0.9 at the LOCKED point (glob lands at ts.x/z exactly, error 0.000) | — | slick r 0.9 for 180 ticks (720→900); healer walk in slick 1.615 u/s vs 2.40 open (×0.67, status slow 0.3) | 12 (×dmgMul seen in the curve: 16.21) |
| Gloam Moth | 45, lane | 13 119 | swoop 8.2 u/s over the first 15 ticks (6.88 mean over 20); 9 dmg to 2 allies crossed; moves 2.4 u/s inside a bramble vs 2.4 outside (boar 2.0 → 1.3, slow 0.35) | 9 |
| Barrow Ram | 60, cone | 6 253 | guard `{halfArcDeg 55, shapes:[projectile]}`; real right-mouse fire from the front: 13 bolts → 10 `hit_blocked`, 8 hits all nova/arc/zone shapes; slam 18/18/27(crit) | 18 |
| Grave Mole | 60, ring r 0.8 | 1 942 | spawns `hittable:false, burrowed:true`; emerges at the target (dist 0.3) → bite 16.5 (11×1.5 crit); `enemy_emerge victims 2` | 11 |
| Elite | — | crown glyph (captures/gntccontent1-elite.png) | boar 36 HP (20×1.8), radius 0.42 (×1.2), scale 1.2, dmgMul 1.25 | ×1.25 |
Spawn shimmer: `spawn_telegraph` precedes every `enemy_spawn` (first spawn 30–50 ticks after room start in every room). Silhouettes: quillback spiky ball, moth raised-V wings (the only flier), ram block + horn disc, toad squat sac, mole wedge/mound, elite crown are each readable in the named frames and the 50% biome frames (moths in biome-a2-50, quillbacks/rams in biome-a3-50). My composite contact sheets (sheet3-50.png, silhouette-sheet-50.png) are NOT usable evidence — the allies pile onto any spawned enemy within a tick, so the crops are party-covered; the per-enemy frames stand instead.

### 2.4 Hazards (gntccontent1-hazards.json, hz2.json; hazards-idle.png, hazard-tele-*.png)
| hazard | idle | telegraph → resolve | effect measured |
|---|---|---|---|
| Bramble | dark thorn tangle, no Ember (idle frame 46 danger px for all five) | none (no damage) | healer walk 2.177 → 1.471 u/s (×0.676, slow 0.35); boar 2.0 → 1.3; moth unslowed |
| Puffcap | pale fungus cluster | 60 ticks, ring r 1.3 (6 992 Ember px) | 10 dmg to player, 3 allies AND the boar in it (`victims 5`) |
| Millrace | black-teal lane, flow streaks | surge 60 ticks (35 282 px) | current exactly 1.30 u/s per-tick (120 ticks, mean 1.300); surge 12 dmg to party + boar + push; sluice → 0.000 u/s the same tick, `stopped` 720 ticks |
| Rockfall | dust only | 72 ticks, ring r 0.9 at a party member (`playerTargeted`) (16 593 px) | 15 dmg (player 15, ally 15), rubble `{radius 0.6, collider r 0.6}` ≤ 2 at once |
| Gravefire | cracked slabs, amber (not Ember) | 54 ticks per vent, 3 vents 18 ticks apart (714/732/750) (23 324 px) | 12 dmg per column (player 12, allies 12/10) |
| Powder keg (asset) | — | fuse 60 ticks Ember ring + sparks (keg-fuse.png, 21 233 px) | blast r 1.6: 30 to each of 3 stunned boars, 45 (crit) to the healer, 30 to a neighbouring breakable — all factions |

### 2.5 Interactables by the REAL E key (gntccontent1-assets.json, assets2.json; dewfont-prompt.png, dewfont-used.png, bell-prompt.png, bell-rung2.png, sluice-prompt2.png, sluice-used2.png, barricade-after.png)
| asset | prompt at ≤ 1.1 u | E → | state after / second E |
|---|---|---|---|
| Dewfont | "E · Drink" plate over the Bright-Heal basin (box 134×50) | `interact` + 4 heals: 37.5c/37.5/23.75/20 = 25% maxHp each; cues heal_crit/heal + m4b_drink | uses 0, prompt "E ✕ Dry"; second E → `interact_denied used` |
| Warding Bell | "E · Ring" | `interact` + `bell_ring` + stun mag 1 for 60 ticks on the 2 boars within 3 u (2.73, 2.14 u), none on the one at 4.4 u | second E → `interact_denied used` |
| Sluice | "E · Pull" | `interact` + `sluice_toggle closed` for 720 ticks, lane `stopped`, cooldown 1200 more | prompt "E ◷ Closed · 12 s", state cooldown |
| Barricade | (no E — cover) | held W from 1.6 u: moved 0.875 u then stopped at z −2.475 (open floor 1.5 u); right-mouse fire 8 hits of 8 → `broken` at tick 875 | walk-through after break 1.72 u |
| Keg | (no E — any damage) | see 2.4 | destroyed |

### 2.6 Four skills, eight uncapped sockets (gntccontent1-slots*.json, sockets.json, passive2/3/4.json, nodes*.json, screen*.json, hudsizes.json)
- Skill cap: `giveSkill` 3rd/4th → slots 2, 3; 5th and 6th → `{error:'no_free_slot'}`; `state().skills.length` 4; command bar tiles ['1','2','3','4','SPC'] + 4 portraits at 1024×576 (min tile 43.9 px, key 17.9 px, 0 overlaps, 0 outside), 1600×900 (53.3 / 21.7), 2560×1440 (85.3 / 34.7) — captures/gntccontent1-hud-*.png.
- Keys (arena, real keydown, mouse aimed): 1→mending_bolt +1 tick, 2→swift_mend +1, 3→spirit_bolt +2, 4→bell_toll +1 with a target; the same four cast with NO target (+2 ticks); keys 5–8 → no `skill_cast`, no `intent_denied`, no HUD nudge (16 presses, gntccontent1-slots3.json).
- Draft with 4 owned (gntccontent1-draft-4owned.png): "SKILL SLOTS FREE 0", reward `{type:'node', id:'linger', promised:'skill', substituted:true, line:'no slot free — offering a Node instead'}`, no SKILL card in the page text.
- Sockets: every one of the 17 skills exposes `sockets.length 8`; sweep 17 skills × 8 sockets × {sharpen c, bounce c, multiply r, echo r, ascend L, resonance L} = **816 socket operations, 816 ok, 0 denials, no rarity reason exists**; verdict states over the sweep live 672 / grey 120 / inert 24; per skill: sharpen ×3 → ok, ok, `limit` (17/17); 8 fillers ok then a 9th → `full` (17/17); index 8 → `no_such_slot` (17/17); in combat → `combat_active`.
- Matrix spot checks (`buildVerdict`): warding_aura/bounce grey passive_field, /ascend live, /resonance live pulse, /echo live reapply, /siphon grey; quiet_hearth/resonance live, /split grey; mending_tide & restorative_wave/multiply inert saturated (pop 4); bell_toll/split grey no_retargetable_impact; pale_lance/split live; sanctuary/multiply grey no_count_stat; mending_bolt/widen grey no_area_stat; kindred_shield/hearthsong/bell_toll/linger live.
- Legendaries on the passive, measured with the healer standing on the tank (gntccontent1-passive4.json): Warding Aura base 3 per pulse (4.5 crit) every 60 ticks; Ascend → **6 per pulse** ×7; Resonance → 3, 3, **6** (`resonance_proc n3 mul2 pulse:true`), 3, 3, 6 (n6). Quiet Hearth + Ascend → 4 per pulse (2×2) with ward 0.15. Echo on the passive → 5 pulses of 3 in 240 ticks (Reapply bonus pulse; counter unaffected). Bell Toll + Resonance: casts 20/20 → 20/30c → **40/40** (`n3 x2`) → 20/20.
- Socket screen (captures/gntccontent1-socket-{1024x576,1600x900,2560x1440}.png, socket-grey.png): 4 rows × 8 cells + bench + detail on one page; 43 DOM boxes, **0 outside the viewport, 0 overlaps** at all three sizes; min cell 49.7 / 77.6 / 112 px; min font 16 px (my DOM scan); scale 0.776 / 1.212 / 1.75; header "8 sockets on every skill · any node fits any socket"; no A/B labels or cap badges anywhere. Grey display: Bounce and Multiply on Warding Aura render as hollow icons with a diagonal strike, row reads "power 3 → 6 · ⊘ 2 grey", detail "Warding Aura ⊘ grey"; the legendary sits at socket 8 as a filled star (socket-grey.png). Keyboard (gntccontent1-screen2.json): B opens with focus on the bench → Enter picks Ascend → cursor jumps to the auto-fill socket → Enter places (fills [1,0,0,0]) → arrows move → Enter picks it up → 2× right → Enter places at c2 → X removes → Digit3 jumps to row 3 → Tab bench → Enter/Enter places → F auto-fills [2,2,2,2], bench 0 → Esc closes with `defaultPrevented true` and no pause opened. Mouse: click chip → held Ascend → click cell 0:5 → placed → right-click → removed. Mock gamepad: View(8) opens, D-pad right/down move the cursor, Y auto-fills [3,3,2,2], A/X act, B closes.
- 9 new skills, each cast by key with its authored numbers (gntccontent1-nodes.json; skill-*.png): Lantern Flurry 3 bolts of 9; Pale Lance 30 + 30 through two bodies (`skill_bolt_pierce` ×2, lances fx 1); Bell Toll 20/20/20 + stun on 3 boars (Bone ring glyphs, ground ring, 5 rings + glyph); Rootsnare zone 6 per tick × 5 ticks + slow 0.45 (Signal-Blue root zone); Dewfall 7 per tick × 10 (green zone, motes); Kindred Shield 16 + shield 20 (shell + hex rig); Mending Tide 12 ×4 (70° wedge); Hearthsong 10 ×4 + haste 0.25 ×4 (amber burst); Quiet Hearth pulses 2 + ward 0.15 (bone dome). VFX layers ≥ 3 in the frames viewed (skill-bell_toll.png, skill-dewfall.png).
- 9 new nodes, clean (unsocket-all, gntccontent1-nodes2.json): Widen bell_toll area 1.6→2.0; Reach spirit_bolt range 4.8→6.0; Linger rootsnare 5→7.5 s (statusTicks 72→108), bell_toll stun 30→45; Keen critBonus 0.15; Snare dmg → slow 0.4 / heal → haste 0.2 / passive → slow 0.25 on the boar in the aura; Galvanize → exposed 0.2 / inspired 0.15 / passive inspired 0.1; Bulwark → shield 3.6 (20% of 18) / overheal shield 7 / passive +2 then +4; Split dmg → `split_shard power 7.2` (40%), heal → 22 + 8.8 + 13.2c to the 2 nearest allies; Multiply on Lantern Flurry 3→4 bolts of 9; Resonance counter 1,2,3 → proc ×2.
- Save from before the correction (gntccontent1-savev1.json, save-v1-loaded.png): the GENUINE v0.5.39 build (git archive ebd0609, vite build, served on 4326) wrote schema 1 with 8 slots and 6 skills [mending_bolt, swift_mend, spirit_bolt, bell_toll, pale_lance, hearthsong] and 2-socket rows; `save.importText` into v0.5.62 → schema 2 ok; `save.load` ok in 5 ms; skills → first 4 in slot order; rows padded to 8 with nodes in place (mending_bolt sharpen+ascend, spirit_bolt multiply, bell_toll echo); dropped skills' nodes on the bench (bounce, quicken, + the unsocketed sharpen); the stale skill reward → "the run moves on" empty offer; 600 ticks after the load clean; 0 page errors.
- Expedition picker (gntccontent1-picker.json, expedition-picker.png): fresh profile (`?fresh=1&menu=1`, unlocked [1]) → E at the portal starts Act I directly (no picker); with [1,2] unlocked → `expedition` overlay, sim paused (0 ticks over 0.7 s), three cards with Danger pips, Act III "Win The Sunken Mill to unlock" + lock glyph, NEWEST badge, ←→/E/Enter/Esc hints; Esc → camp; ←→ moves; Enter → Act II room 1 "THE SUNKEN MILL".

## 3. GATE TABLE (PLAN §7, re-measured — builder claims were not trusted)
| gate | result | evidence |
|---|---|---|
| G4a.2 skills | PASS | 9/9 cast by key with authored numbers + VFX (2.6) |
| G4a.3 nodes | PASS | 9/9 nodes, every reinterpretation measured, limits hold, grey/inert display (2.6) |
| G4a.4 expeditions | PASS | picker, locks, per-act layouts/roster/hazards/interactables/music/adds (2.1) |
| G4a.5 curve | PASS | live table = M4c constants; strictly increasing in-act and across acts (2.2) |
| G4a.8 / G4a.9 real input | PASS | Acts I, II, III VICTORY 8/8 by keyboard+mouse, 0 page errors (step 3) |
| G4a.10 felt curve | **FAIL (Act II boss)** | rho ≥ 0.886 all acts; wins 5/5, 4/5, 3/5; I<II<III; defend spikes; Act I and III boss spikes; Act II boss 496 < room 6 637 (2.2) |
| G4a.11 portal rule | PASS | `?menu=0` → Act I directly (core loop); fresh title profile → direct; ≥2 unlocked → picker, paused, E/Enter confirm, Esc back |
| G4b.1 enemies | PASS | telegraphs 45–60 ticks Ember, behaviours as authored (2.3) |
| G4b.2 hazards | PASS | 54–72 tick Ember telegraphs, idle 46 px, damage/slow/push exact (2.4) |
| G4b.3 interactables | PASS | prompts ≤ 1.1 u, real E, used/cooldown states, barricade blocks/breaks (2.5) |
| G4b.4 biomes | PASS | analyzer bars, floor HUEMIX differs ≥ 15 pts, ≥ 8 prop types per act in pixels (2.1) |
| G4c.1 four slots | PASS | 2.6 |
| G4c.2 eight sockets, no caps | PASS | 816/816, denial reasons limit/full/no_such_slot/combat_active only |
| G4c.3 passive legendaries | PASS | Ascend 6/pulse; Resonance every 3rd pulse ×2 with `pulse:true` |
| G4c.4 verdicts on all 8 | PASS | sweep verdicts on sockets 0–7; grey strike pixels on sockets 3/6 |
| G4c.5 socket screen | PASS | 3 sizes 0 overlaps, kb/mouse/pad |
| G4c.6 socket-fill strip | PASS | 8-pip strips under each tile; `hud.slots()[i].sockets {filled, live, grey, of:8}` |
| G4c.7 node supply | PASS | 19/32 at the Stag in 5/5 Act I seeds; 4-card shelf 15/15/20/25 fits at 3 sizes |
| G4c.8 difficulty on the corrected build | PASS (band) / see F1 | as G4a.10 |
| G4c.9 save migration | PASS | genuine v0.5.39 file (2.6) |
| GI.6 core loop | PASS | ARCH action file + three full acts |

## 4. BENCHMARK SCORE
MET 42 / 44. PARTIAL: H9 and S3 (the Act II boss is not a spike above the fights before it). Everything else MET with the evidence above (D5: sampled placements in the live rooms keep every hazard ≥ 4.5 u from the party entry (0,0): puffcap (−5,−3.6)/(5.2,−3.6), millrace lane z 4.8, bramble/puffcap (−4.6,2.6)/(4.4,4.4)).

## 5. FAILURES
**F1 (must-fix, tuning) — Act II Stag room is a difficulty dip, not a spike.** Task text: "it must escalate monotonically with sensible spikes at boss/defend rooms"; PLAN §4.2 / G4a.10: "defend rooms and the boss sit above the neighbouring kill_all rooms". Measured (Node act runner, seeds 1–5, my medians in captures/gntccontent1-curve-stats.json): Act II room 6 party damage 637 (kill_all-only) / 759 (all seeds), time 40.7 / 49.4 s; Act II boss room 496 damage, 28.0 s — the Stag takes 22–35% less out of the party and dies faster than the room before the shop. The builder's runner passes this check by pooling rooms 4–6 (456 < 496, a 9% margin). Acts I and III spike properly (321 vs 140; 1363 vs 949). Cause visible in the numbers: the Stag scales by the act tier alone (2760 HP = 2400×1.15, dmg ×1.105) while Act II room 6 runs at hpMul 2.07 / dmgMul 1.535. Reproduce: `node tools/gnt-M4a-actrun.mjs --act 2 --seeds 1-5 --node 1 --out captures/<x>.json` and compare the room-6 and room-8 `partyDamageTaken` medians (or open captures/gntccontent1-actrun-node-s1-5.json). Suspect files: src/data/difficulty.js (Stag HP / BOSS_DMG_SLOPE / add multipliers for Act II), docs/BUILD_BRIEF.md §23.2 (the binding constants).

## 6. ADVISORIES (not must-fix)
- A1 Debug-API doc mismatch: docs/TESTING.md M4b says `cmd('spawnHazard', htype, params)` / `cmd('spawnInteractable', itype, params)`; the running game takes the PLAN §6.4 positional form `(htype, x, z, params)`. The object form spawns at `x: null` (gntccontent1-explore.console.txt: puffcap/dewfont with x null). Harness-only; fix the doc or accept both forms.
- A2 Warding Aura's pulse radius is 0.9 u (BUILD_BRIEF §7) — allies in the arena idle formation sit at 0.96–1.0 u, so the aura heals nobody until the healer steps onto an ally; in play it works (heals of 3 seen when allies crossed inside), but the passive's value depends on tight stacking. Design, not a defect.
- A3 My two composite silhouette sheets (captures/gntccontent1-sheet3-50.png, silhouette-sheet-50.png) are party-covered and not evidence; refuters should use the per-enemy frames named in 2.3.
- A4 First real-input Act III attempt lost in room 3 while four GPU probes ran concurrently; alone it won 8/8. Real-input legs should be run on an idle machine.

## 7. PROCESSES
My vite preview on port 4326 (v0.5.39 build for the schema-1 probe) stopped before returning; no server started on any other port; the shared dev server 5199 untouched.
