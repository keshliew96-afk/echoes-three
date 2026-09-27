STATUS: COMPLETE
VERDICT: FAIL (1 must-fix: F1 Level 3 gives nothing on the default campaign and on Level-3 starts — 32/32 sockets from the L2 Stag, every L3 reward page "Nothing left to offer · Empty-handed", spoils [] every room (G4c.7), empty shop with 115 Glint; everything else in the content module verified green — 4-skill cap, 2312/2312 uncapped sockets, 238/238 matrix, 34/34 limits, legendaries on passives, 9 skills + 9 nodes by sim effect, 5 enemies / 5 hazards / 5 interactables, socket screen at 3 sizes by keys/mouse/pad, genuine v0.5.39 save migrates, L1 by real input, band holds on seeds 1-5 (fragile Stag spike); benchmark 12/18 met, 5 partial, 1 not met).
# Critic — CONTENT (M4a / M4b / M4c, campaign content) round 4

Started 2026-09-27. Fresh-context harsh critic. Judges only the running game (captures, console, debug-API state).

## Steps log
- step 0: checkpoint created.

- step 20: all own processes stopped (vite preview :4326 PIDs 71416/84588, 72556/65672, 77840/67356; runners exited); port 4326 free. Build outputs left: dist-ccontent4, dist-ccontent4-v1 (old tree export in captures/gntccontent4-v1tree).

## Blind benchmark checklist (written BEFORE looking at any Echoes capture)

From my own knowledge of the shipped games. Each item is testable against Echoes.

| # | Source | Behaviour of the shipped system | Echoes test |
|---|---|---|---|
| B1 | Hades | Each biome (Tartarus teal/purple stone, Asphodel red-orange lava, Elysium green-gold, Styx dark red) is identifiable from a single frame by its dominant floor palette and its own prop set. | Floor-box HUEMIX differs between levels by >= 15 points in some channel; >= 3 props unique per level; the frame stays in the art bible. |
| B2 | Hades | Each biome brings its own enemy roster (new types introduced in each new region), so later regions are not reskins. | Each level's roster contains >= 1 type absent from Level 1; each new type shows up in its level. |
| B3 | Hades | Encounters escalate inside a region (more waves / more armored enemies later), elite/armored variants appear later, and the region boss is the spike. | Per-room enemy count, HP, damage and budget rise room 1 -> 6; elites only from mid-level; boss room above the kill rooms. |
| B4 | Hades | Hard slot rules: one boon per slot (Attack, Special, Cast, Dash, Call); an offer never breaks the slot rule — once a slot is taken, offers for it become upgrades/replacements, not a sixth ability. | 4 skills max, keys 5-8 inert, a 5th skill is never offered — a node substitutes. |
| B5 | Hades | Rarity is shown by a frame colour AND a label (Common/Rare/Epic/Heroic/Legendary); a boon's numeric effect is printed on its card; rarity never restricts which slot a boon can occupy. | Rarity shown by colour + glyph/label; any rarity fits any socket; card shows numbers. |
| B6 | Hades | The whole build (all boons with effects) is inspectable on one pause screen (Boon list), no scrolling for a typical build. | Socket screen 4 x 8 + bench + detail on one page at 1024x576 and 2560x1440, no overlap. |
| B7 | Dead Cells | Each biome has its own hazards (Sewers toxic water, Ramparts drops, Stilt Village water) — hazards are part of biome identity. | Each level has its own hazard pair; hazards appear in that level's rooms. |
| B8 | Dead Cells | Hazards and traps have a visible wind-up and also hurt enemies, so the player can use them offensively. | Hazard telegraph >= 0.7 s Ember; hazards damage enemies. |
| B9 | Dead Cells | Interactive environment with immediate feedback: doors smashed to stun enemies, breakable walls, health fountains (one use, visibly spent). | Each interactable responds to E / damage with VFX + sound + a visible state change; one-use states visible. |
| B10 | Dead Cells | Later biomes scale enemy HP/damage per biome level and show more elites; boss stages are the difficulty peaks. | HP/damage multipliers rise level to level at equal room; elite chance rises with level. |
| B11 | Enter the Gungeon | Every enemy has a distinct silhouette readable at small size, and enemy threats contrast with the player's colours. | New enemies readable at 50% zoom; enemy telegraphs in Ember, never party colours. |
| B12 | Enter the Gungeon | Attacks are preceded by a clear wind-up/tell (aim flash, crouch, glow) of roughly 0.5-1 s before damage. | Every new enemy attack: telegraph >= 0.7 s (42 ticks) in Ember before damage. |
| B13 | Enter the Gungeon | Enemy behaviours are distinct archetypes (chargers, lobbers, fliers, shielded, burrowers, summoners) that force different player responses. | The 5 new enemies each behave differently (charge lane, lob ring, flier swoop, front guard that blocks projectiles, burrow + emerge). |
| B14 | Enter the Gungeon | Environment objects are tactical: flipped tables are destructible cover that block bullets; explosive barrels chain and hurt everyone. | Barricade blocks projectiles + movement and breaks at 0 HP; keg blast hits all factions and chains. |
| B15 | Slay the Spire | Difficulty rises monotonically across acts (Act 2 normal fights hit harder than Act 1 elites by the end), elites and bosses are clear spikes, the act boss is the peak of its act. | Per-room party damage / time-to-clear medians rise across rooms and levels; boss room above its neighbours. |
| B16 | Slay the Spire | The build (deck, relics, gold) carries across acts; the act transition is a short screen naming the next act; HP is restored at the act boundary (base game). | Carried skills/sockets/bench/Glint, full HP at the card, next level named. |
| B17 | Slay the Spire | Reward screens always offer a choice plus a skip; capped inventories (potion slots) say so instead of silently discarding. | Draft always has decline; a full skill bar substitutes with an explanation line; a full socket row says "full". |
| B18 | Hades / StS | Reward supply lets a build fill out over a run (Hades ~1 boon per chamber; StS a card reward after every fight). | Node supply over one level fills a meaningful share (>= 50%) of owned sockets; over the campaign 32/32 is reachable. |
- step 1: blind benchmark checklist written (18 items), before any Echoes capture was viewed.
- step 2 (v0.5.124, dev :5199): smoke `captures/gntccontent4-smoke.png` exit 0, 0 PAGEERROR.
- step 3 socket sweep `tools/gntccontent4-sweep.mjs` -> `captures/gntccontent4-sweep.json`: 17 skills x 17 nodes x 8 sockets = **2312 socket ops, 2312 ok, 0 denials, 0 rarity/cap reasons** (commons, rares and both legendaries Ascend/Resonance into every socket of every skill incl. Warding Aura + Quiet Hearth). Mixed-rarity full row (sharpen/multiply/ascend/bounce/echo/resonance/widen/linger) fills 8/8 on all 17; 9th -> `full`; index 8 -> `no_such_slot` on all 17. Verdict matrix 17 x 14 = 238 cells = BUILD_BRIEF §23.4 exactly (0 mismatches); Sharpen/Ascend/Keen live on all 17; Resonance on both passives `live:pulse`. 5th `giveSkill` -> `{error:'no_free_slot'}` (`gntccontent4-discover2.json`).
- step 4 legendaries on passives + keys 5-8 (`tools/gntccontent4-passive.mjs` -> `captures/gntccontent4-passive-s11.json`): Ascend in socket 8 of Warding Aura -> resolved power 3 -> 6, pulse heals 6; Resonance in socket 8 of Quiet Hearth -> `resonance_proc {n:3,6,9..., mul:2, pulse:true}` every 180 ticks; Echo in socket 8 of Mending Bolt -> `echo_armed` on the key-1 cast. Keys Digit5-8 in live combat -> 0 skill_cast, 0 intent_denied (only ally events in the window); keys 1-2 -> skill_cast slot 0/1 on the press.
- step 5 new skills cast by real key in a live defend room (`tools/gntccontent4-skills.mjs dmg|heal|pas` -> `captures/gntccontent4-skills-{dmg,heal,pas}.json`, frames `captures/gntccontent4-skill-<id>.png`): Lantern Flurry 3 bolts x 9; Pale Lance 30, 2 x `skill_bolt_pierce` (seed-5 run: 3 hits of 30); Bell Toll 20/target + stun 30 t (1285->1315), fx rings 5 + stun glyph rigs 3; Rootsnare 5 zone ticks x 6, slow 0.45 / 72 t, rootZones 1; Dewfall 7/tick (crit 10.5), 5 ticks; Kindred Shield heal 16 + shield 20 / 240 t (hex+shell rig); Mending Tide 12 per ally in the arc (wedge fx 1); Hearthsong 10 x 4 + haste 0.25 / 120 t; Quiet Hearth pulse every 60 t r 1.2 + ward 0.15 / 72 t (wardRim rigs), heal 2/pulse. All match §23.3.
- step 6 new nodes by sim effect in live combat (`tools/gntccontent4-nodes.mjs A|B|C` -> `captures/gntccontent4-nodes-{A,B,C}.json`): Keen critBonus +0.15; Reach 4.8->6.0 / 5->6.25; Widen 1.6->2.0, 0.9->1.125, 1.5->1.875, 2.0->2.5 (grey on projectiles: area 0 stays 0); Linger stun 30->45 t, shield 240->360 t, Dewfall 5->7.5 s, haste 120->180 t; Multiply Bell Toll 5->6. Snare: damage slow 0.4/90 t, heal haste 0.2/90 t, passive slow 0.25/72 t on boars inside the aura. Galvanize: exposed 0.2/180 t, inspired 0.15/180 t, passive inspired 0.1/72 t. Bulwark: caster shield 3.6/7.2/10.8 (=20% of 18/36/54), heal overheal shield 11 (=50% of 22) and 7 (=50% of 14) / 240 t, passive +2/pulse capped at 10 (2,4,6,8,10). Split: 2 shards 7.2 (=40% of 18), heal split to 2 others 8.8 / 6.4. Resonance active: 3rd cast 36 (x2), 6th 54 (x2 crit); on passives: Warding Aura heals {6:44, 12:15, 9:1}, Quiet Hearth {2:50, 4:16}; the Echo Reapply pulse (tick+1, every 180 t) never advances the counter (procs at n=3,6,9 on the 60-t cadence).
- step 7 limits + 5th skill (`tools/gntccontent4-limits.mjs` -> `captures/gntccontent4-limits.json`, frames `gntccontent4-draft-4owned.png`, `-take.png`): 34/34 per-node repetition checks (17 nodes on Mending Bolt AND on the passive Warding Aura): L copies ok, copy L+1 -> `limit`. With 4 skills owned, the room-1 reward promised `skill` becomes `{type:node, id:linger, substituted:true, line:"no slot free — offering a Node instead", freeSkillSlots:0}` (card shows NODE · rare · Linger + the line); Enter -> `draft_taken`, node on the bench and the socket screen opens with Linger in hand; skills stay 4.
- step 8 socket screen + command bar (`tools/gntccontent4-socketui.mjs W H` -> `captures/gntccontent4-socketui-{1024x576,1600x900,2560x1440}.json`, frames `gntccontent4-socket-*.png`, `gntccontent4-socket-filled-1024x576.png`): 4 rows x 8 = 32 cells + 17 bench chips + detail + auto-fill inside the window, **0 overlaps**, no scroll at all three sizes; min cell 49.7 / 77.6 / 112 px; min text 12.4 / 19.4 / 28 px. Command bar 4 portraits + 4 skill tiles + 4 pip strips + dodge: 13 boxes inside, 0 overlaps at all three sizes. Keyboard: B opens (path page), Enter picks (focus jumps to cells), Enter places, Enter on a socketed node picks it up, arrows move, Enter moves it (r0c0 -> r0c2), X removes to the bench, 1-4 jump rows, F auto-fills 21 nodes all `live` (the all-grey Linger stays on the bench), Esc closes with `defaultPrevented === true`, phase stays `path`. Mouse: chip click -> held, cell click -> socketed; right-click removes. Limit denial (2nd Ascend on Spirit Bolt) -> `socket_denied {reason:'limit'}` + cell class `nd-limited nd-shake`. HUD strip = sim on all 4 rows (6/5/5/5 filled = live). Gamepad (`tools/gntccontent4-pad.mjs` -> `captures/gntccontent4-pad-1600x900.json`): View opens, D-pad moves (r/c), A picks + places, A on a socketed node + D-pad + A moves it (r0c0 -> r1c2), X removes, Y auto-fills, RB/LB change rows, B closes. (A View press in the same frame as the pad's connect event is ignored — the pad is read as already held.)
- step 9 biomes (`tools/gntccontent4-biome.mjs <seed> <room>` -> `captures/gntccontent4-biome-s{5r5,8r2}-L{1,2,3}.png` + s3r3 run; `tools/gntccontent4-palette.mjs`; strips `captures/gntccontent4-floorstrip-{a,b}.png`): every level frame passes the analyzer bars (L1 >160 4.4-5.4 %, >200 0.77-0.80 %, 15-16/16, FLAT 1.8-2.4 %; L2 1.8-2.7 % / 0.71-1.20 % / 15-16 / 1.3-1.4 %; L3 2.0-5.0 % / 0.72-2.16 % / 15-16 / 1.4-1.7 %). Own layouts/roster/hazards per level (L1 layouts 1-3 bramble+puffcap boar/mantis/quillback; L2 4-6 millrace+puffcap +toad/moth; L3 7-9 rockfall+gravefire +ram/mole), music theme wood/mill/barrow when the engine reports one. Shade-base median hue L1 220-225 / L2 210-212 / L3 230-231 (bible: L2 196-204, L3 212-224 -> both 6-8 deg outside); foliage share L1 10-16 % / L2 6-10 % / L3 <= 1.8 %. Floor box 560,560,320,140 HUEMIX is lamp-dependent: s3r3 all pairs >= 15 pts apart; s5r5 L1 vs L3 max gap 3.7 pts; s8r2 L2 vs L3 max gap 12.9 pts. By eye the Mill and Barrow floors are the same dark navy flagstone grid; identity comes from water lanes/mill wheel vs standing stones/cairns and green vs ochre tufts. Level 1's room plate reads "UNEASY WOODLAND" while the level is "The Hollow Wood" everywhere else (L2/L3 plates show their level names).
- step 10 enemies (`tools/gntccontent4-zoo.mjs` -> `captures/gntccontent4-zoo-s4.json`, `tools/gntccontent4-toad.mjs`, frames `captures/gntccontent4-zoo-tele-{quillback,toad,moth,ram,mole}.png`, lineup `gntccontent4-zoo-lineup{,-50}.png`): telegraph start -> resolve: quillback lane 48 t, toad glob ring 60 t (eglob, owner = toad), moth lane 45 t, ram cone 60 t, mole ring 60 t (all >= 42 t = 0.7 s, Ember in the frames). Behaviour: quillback charge 5.97 u in 60 t (6.0 u/s), 12 dmg; toad lob -> land 60 t later, 12 dmg r 0.9, slick 180 t with slow 0.3 re-applied every 5 t; moth swoop 5.59 u in 42 t (8.0 u/s), 9 dmg; ram slam 18 dmg; mole emerge 11 dmg r 0.8, 120 t surfaced then re-burrow. 50 % lineup: spiky ball, squat toad, V-wing moth, blocky horn-disc ram and crowned elites read; the mole is the weakest silhouette (small, low contrast).
- step 11 hazards (`tools/gntccontent4-hazards.mjs <layout>` -> `captures/gntccontent4-hazards-L{2,5,8}.json`, frames `gntccontent4-hz-{idle,tele}-L*.png`): puffcap 60 t, 10 dmg (hits boars); bramble slow 0.35 (x0.65) on boars; millrace surge 60 t (one 86 t), 12 dmg on a boar; rockfall 72-120 t, 15 dmg on party and boars, rubble r 0.6 for 480 t; gravefire 54 t per vent, 12 dmg. All >= 0.7 s.
- (dev server navigation timeouts at 02:39-02:50 under load; built `dist-ccontent4` from HEAD 9e7913c and run the heavy probes on `vite preview --port 4326`.)
- step 12 interactables by real E / mouse fire (`tools/gntccontent4-ix.mjs 5|7` on prod :4326, audio autoplay -> `captures/gntccontent4-ix-L{5,7}.json`, frames `gntccontent4-ix-*-{prompt,used}.png`, `-keg-{fuse,blast}.png`): no plate at 2.2 u, plate within 0.85 u: "E · Pull" / "E · Drink" / "E · Ring". Sluice: `millrace_stop` both lanes 720 t, cue `m4b_lever`, state cooldown (+1920 t = 720 + 1200), plate "◷ Closed · 8 s", 2nd E -> `interact_denied cooldown`. Dewfont: heals 25/37.5/23.75/20 (= 25 % of 100/150/95/80), cues `m4b_drink`+`heal`x4, plate "✕ Dry", 2nd E -> `interact_denied used`. Bell: `bell_ring stunned:3`, stun 60 t on 2 boars + mantis, bronze shockwave + stun glyphs, plate "✕ Rung". Barricade (timber): hits 14/12/12/12/30 -> `broken`, 5 bolts despawned `blocked`. Keg: an 18-dmg bolt -> `keg_ignite` blastTick +60 -> `keg_blast r 1.6 victims 4` (allies 30/45/30 and a boar 45: all factions). (Keg chaining and the same-tick double use not re-measured.)
- step 13 difficulty table (`tools/gntccontent4-table.mjs` -> `captures/gntccontent4-table.json`): `content.difficultyTable('standard')` = BUILD_BRIEF §23.2 CAMPAIGN table (hpMul L1 1->1.8, L2 1.6->2.88, L3 2.8->5.04; dmgMul 1->1.4 / 1.3->1.94 / 1.9->3.02; budget 4->7.2 / 6.4->11.52 / 11.2->20.16, defend x1.25; elite 0,0,0,.08,.08,.08 / .12->.22 / .20->.35; interval 480->384 / 456->365 / 432->346; Stag 2400 / 5184 / 6720, boss dmg x1 / 1.54 / 2.62; Waystone 150/190/251). Strictly increasing per room and per level at equal room.
- step 14 real input (`tools/gntccontent4-realrun.mjs 3 prod` -> `captures/gntccontent4-realrun-prod.{json,log}`, frames `gntccontent4-realrun-prod-r{1..8}.png`, `-card.png`): `?menu=0&seed=3`, W/A held to the portal (5.9 s, prompt "E Begin Run · Level 1 · The Hollow Wood · L Levels"), E -> Level 1 room 1; 6 combat rooms + shop + Stag played by WASD + mouse aim/fire + keys 1-4 + Space (presses: skill_1 12, skill_2 12, skill_3 10, skill_4 22, dodge 12); drafts by Enter (Nova Bloom, Spirit Bolt taken; 4 node drafts opened the socket screen with the node in hand -> Enter/F/Esc); shop: 3 cards bought by mouse click, Enter -> Stag; Stag down at tick 11967 -> LEVEL I CLEARED card (NEXT Level II · The Sunken Mill, skills 4/4, sockets 16/32, bench 3, Glint 34, party restored). 0 page errors. Esc on the card -> pause (card held, elapsed 147 t). Quit to Lobby by keys from combat (`tools/gntccontent4-quit.mjs` -> `captures/gntccontent4-quit.json`): confirm defaults to "Keep Playing", ArrowLeft + Enter -> camp, run inactive, 0 enemies.
- step 15 campaign band, in page on prod :4326 (`tools/gntccontent4-camp.mjs 1|2|3 1-10 prod` -> `captures/gntccontent4-camp-from{1,2,3}-prod.json`; `tools/gntccontent4-band.mjs` -> `captures/gntccontent4-band-{1-5,1-10}.json`; plot `captures/gntccontent4-curve.png`). Dev and prod give identical per-room numbers for the same seed (seed 2 L2 room 4 60 s / 1391 on both). Seeds 1-5: carried L1/L2/L3 clears 5/5/5, rho time/dmg .943/.943, .943/.943, .829/.943, max room median 45 / 55.7 / 78.9 s; L2 start 5/5 then L3 2/5; L3 start 2/5 (rho 1/1). Boss vs room 6 (party damage medians): carried L1 317 > 133; **carried L2 1071 < 1157 (boss above room 6 in 1/5 seeds; seeds 1-10 1173 vs 1175, 3/10)**; carried L3 2518 > 2191; **L3 start 2385 < room 6 2552 and < pooled kill_all rooms 5-6 2715 (1/4 seeds)**. Boss room time is below room 6 in every level and mode (e.g. carried L2 39.5 vs 55.7 s, L3 start 53.2 vs 83.6 s); boss damage per second is the highest of each level (carried L2 27.1/s vs room 6 20.8/s; L3 start 44.8/s vs 30.5/s) and the Stag is where the failing L3 runs die. Level medians at equal room (carried, seeds 1-5): room 1 L2 274 > L3 224 damage, 25.6 > 22.5 s (seeds 1-10: damage 191 < 222, time 25.7 > 22.8); rooms 2-6 and the boss rise L1 < L2 < L3. Builder runner cross-check (`tools/gntCAMPAIGN-camprun.mjs --from 3 --seeds 1-5 --node 1`, read-only, -> `captures/gntccontent4-bcamprun-from3-node.json`): L3 start 3/5, "boss > late kill_all" true by 2513 vs 2504 (0.4 %).
- step 16 offers + supply (`tools/gntccontent4-offers.mjs 1-5` -> `captures/gntccontent4-offers.json`): 5 carried campaigns, 14-16 reward offers each, 0 skill offers with 4 skills owned, 1-6 substitutions with the §16 line, max skills 4. Sockets at the Stag entry: L1 19/32 (59 %) in 5/5, L2 32/32, L3 32/32. Node supply per level: L1 spoils 12 + drafted 4 + purchased 3; L2 spoils 8-10 + drafted 4-5 + purchased 0-4; **L3: 0**. `tools/gntccontent4-l3rewards.mjs 1` (-> `captures/gntccontent4-l3rewards-s1.json`, frames `gntccontent4-l3-reward-s1.png`, `gntccontent4-l3-shop-s1.png`): at L3 (32/32 filled, bench 3) every reward page is "NOTHING LEFT TO OFFER · Empty-handed · Both pools are spent. — the run moves on" (reward type null), `spoils_drop nodes []`, and the L3 shop is "nothing left to sell you" with 115 Glint in the wallet. `tools/gntccontent4-l3start.mjs` (-> `captures/gntccontent4-l3start.json`, `gntccontent4-start-L3-reward.png`): a Level-3 start from the Level Select arrives with 32/32 and gets the same empty reward + empty spoils in room 1; a Level-2 start (19/32) still gets a node + 2 spoils.
- step 17 page error: `captures/gntccontent4-camp-from3-prod.log` (prod, 10 Level-3-start campaigns) ended with 1 uncaught page error "Cannot read properties of undefined (reading 'isReady')" at `three-D_OVNSxA.js:4108:31133` = WebGLRenderer.compileAsync's 10 ms poll `properties.get(material).currentProgram.isReady()` on a material disposed while its program was still compiling. Not reproduced in 10 reruns (`-prod2.log`, 0/10) nor in 21 targeted start-then-quit trials (`tools/gntccontent4-race.mjs` -> `captures/gntccontent4-race-prod.json`, 0).
- step 18 genuine pre-correction save (`tools/gntccontent4-v1save.mjs write|read`, one browser profile `captures/gntccontent4-v1profile`, same origin :4326; old build = `git archive ebd0609` -> `captures/gntccontent4-v1tree` -> `dist-ccontent4-v1`, reports v0.5.39): old build wrote `echoes.save.v1.manual-1` (schema 1, 8096 B, `captures/gntccontent4-v1save-manual-1.txt`) with 6 skills in 8 slots (MB, SM, Nova Bloom, Spirit Bolt, Warding Aura, Bell Toll), 2-socket rows (MB sharpen+ascend, Nova multiply, Spirit Bolt bounce+echo, Aura widen [1 socket], Bell quicken), bench siphon, phase reward room 1. Current v0.5.124 prod: title focus "Continue — Level I · The Hollow Wood · Room 1 · just now · pre-correction save"; list schema 3; load `{ok:true, migrated:true}`, 0 page errors; playing, reward room 1, campaign L1 (not harness); skills = first 4 in slot order; rows 8 sockets with the nodes in place; the dropped skills' nodes on the bench (siphon, quicken, widen); the stale skill reward -> the empty offer; ticks advance 513 -> 695 in 3 s (`captures/gntccontent4-v1save-read.json`, `gntccontent4-v1save-loaded.png`).
- step 19 regression on dev :5199: smoke `captures/gntccontent4-smoke2.png` exit 0 / 0 PAGEERROR; §6.2 core loop (`tools/actions/gntccontent4-coreloop.json` = ARCH copy) camp -> portal tick 183 -> combat room 1 tick 570 -> reward tick 816, 0 PAGEERROR. HUD strip with grey + inert (`tools/gntccontent4-strip-grey.mjs` -> `captures/gntccontent4-strip-grey.json`, crop `-crop.png`): sim {3 filled/1 live, 2/1, 1/0, 0} = hud {3/1/2 grey, 2/1/1, 1/0/1, 0}; the strip shows filled vs hollow pips. Stag adds (camp JSON room 8): L1 6 boar + 3 mantis, L2 3 toad + 6 moth, L3 3 ram + 6 mole (3 phases). Page-error hunt continued: 15 quit-on-the-level-clear-card trials (`tools/gntccontent4-race2.mjs` -> `captures/gntccontent4-race2-prod.json`) and 10 + 6 more campaigns under load (`-from3-prod3.log`, `-from1-prod3.log`): 0 page errors.

## Probe tables (v0.5.124, HEAD 9e7913c; prod = `dist-ccontent4` on vite preview :4326, dev = :5199)

### Skill slots and sockets (user correction)
| Check | Result | Evidence |
|---|---|---|
| Equipped skills max 4; 5th giveSkill | error no_free_slot; 5 carried campaigns max 4 skills | discover2.json, offers.json |
| Keys 1-4 cast / 5-8 inert | skill_cast slot 0/1 on the press; Digit5-8: 0 casts, 0 denials | passive-s11.json |
| Draft with 4 owned | node substituted + "no slot free — offering a Node instead"; 0 skill offers with 4 owned in 74 offers | limits.json, offers.json |
| 8 sockets, any rarity, every skill incl. passives | 2312/2312 ops ok, 0 rarity/cap reasons | sweep.json |
| Mixed-rarity full row / 9th / index 8 | 8/8 on all 17; full; no_such_slot | sweep.json |
| Repetition limits | 34/34 (Mending Bolt + Warding Aura) | limits.json |
| Verdict matrix | 238/238 = §23.4 | sweep.json |
| Legendaries on passives | Ascend 3->6 per pulse (crit 9); Resonance every 3rd pulse x2 (6->12, 2->4), pulse:true; Echo Reapply does not advance the counter | passive-s11.json, nodes-A.json |
| Technique from socket 8 | Echo in socket 8 -> echo_armed; Resonance/Ascend in socket 8 live | passive-s11.json |
| Socket screen 1024x576 / 1600x900 / 2560x1440 | inside, 0 overlaps, no scroll; cells 49.7 / 77.6 / 112 px; text 12.4 / 19.4 / 28 px | socketui-*.json |
| Keyboard / mouse / gamepad | every action works (pick, place, move, remove, auto-fill, rows, close) | socketui-*.json, pad-1600x900.json |
| Command bar | 13 boxes inside, 0 overlaps at all 3 sizes; strip = sim | socketui-*.json, strip-grey.json |

### Node supply (5 carried autopilot campaigns, prod, offers.json)
| Level | spoils | drafted | purchased | sockets at Stag entry | reward pages |
|---|---|---|---|---|---|
| 1 | 12 | 4 | 3 | 19/32 (59 %) | 6 real offers |
| 2 | 8-10 | 4-5 | 0-4 | 32/32 | 4-5 real offers |
| 3 | **0** | **0** | **0** (shop empty, 115 Glint) | 32/32 | **4-5 "Nothing left to offer · Empty-handed"** |

Real input (Level 1, seed 3): 16/32 at the Level I clear card.

### Enemies (arena, allies downed; zoo-s4.json, toad.json)
| Enemy | Telegraph | Measured behaviour | 50 % read |
|---|---|---|---|
| Quillback | lane 48 t | charge 5.97 u in 60 t = 6.0 u/s, 12 dmg | spiky ball, clear |
| Mire Toad | ring 60 t (eglob) | glob lands at the locked point 60 t after the lob, 12 dmg r 0.9, slick 180 t, slow 0.3 | squat round, clear |
| Gloam Moth | lane 45 t | swoop 5.59 u in 42 t = 8.0 u/s, 9 dmg | V wings, clearest |
| Barrow Ram | cone 60 t | slam 18 dmg; horn disc | blocky + horn disc, clear |
| Grave Mole | ring 60 t | emerge 11 dmg r 0.8, 120 t surfaced, re-burrow | small low-contrast wedge (weakest) |
| Elite | — | crown glyph + outer ring | clear |

### Hazards (arena layouts 2 / 5 / 8; hazards-L*.json)
| Hazard | Telegraph | Effect measured |
|---|---|---|
| Bramble | none (no damage) | slow 0.35 (x0.65) on boars |
| Puffcap | 60 t | 10 dmg to boars |
| Millrace surge | 60 t (one 86 t) | 12 dmg on a boar; stopped 720 t by the sluice |
| Rockfall | 72-120 t | 15 dmg party + boars; rubble r 0.6, 480 t |
| Gravefire | 54 t per vent | 12 dmg on a boar |

### Difficulty curve (prod, in page; band-1-5.json, band-1-10.json; plot captures/gntccontent4-curve.png)
Seeds 1-5, medians of party HP damage per room 1..6, then the Stag room:

| Path | Level | clears | rho t / d | damage r1..r6 | Stag | Stag vs room 6 when kill_all (seeds 1-10, per-seed Stag above) |
|---|---|---|---|---|---|---|
| carried | 1 | 5/5 | .943/.943 | 25 24 36 72 92 133 | 317 | 323 vs 165 (6/6) |
| carried | 2 | 5/5 | .943/.943 | 274 177 371 533 581 1157 | 1071 | 1173 vs 1175 (3/8) |
| carried | 3 | 5/5 | .829/.943 | 224 1164 680 1566 2103 2191 | 2518 | 2530 vs 2653 (2/5) |
| L2 start | 2 | 5/5 | .943/.943 | 163 320 503 463 834 856 | 954 | 995 vs 943 (4/6) |
| L2 start | 3 | 2/5 | 1/1 | 208 689 929 1478 1703 1928 | 2199 | 2553 vs 1861 (2/2) |
| L3 start | 3 | 2/5 | 1/1 | 270 357 786 1403 2149 2552 | 2385 | 2389 vs 2274 (3/5) |

Enemies spawned per room (carried medians): L1 8/12/14/13/25/23, L2 11/14/18/27/26/30, L3 14/27/19/29/30/32; no elites in L1 rooms 1-3. Time: the Stag room is shorter than room 6 in every row (e.g. 39.5 vs 55.7 s carried L2); damage per second is highest at the Stag in every row (carried L2 27.1/s vs 20.8/s; L3 start 44.8/s vs 30.5/s). Builder runner, Node, 20 seeds (captures/gntccontent4-bcamprun-from{1,3}-node20.log): carried L1 rho time 0.543 (< 0.6), L2 Stag 1268 vs room 6 1309, L3-start Stag 2548 vs room 6 2639 (its pooled late kill_all checks pass).

## Benchmark score (blind checklist above)
| # | Verdict | Evidence |
|---|---|---|
| B1 biome identity | partially | analyzer bars pass on all 3; L1 green woodland distinct (foliage 10-16 %); Mill vs Barrow floors are the same dark navy flagstone (shade H 210-212 vs 230-231, both 6-8 deg outside their bible bands); floor-box HUEMIX gap Mill vs Barrow 12.9 pts in s8r2, >= 15 in s3r3 / s5r5; Level 1's plate says "UNEASY WOODLAND" |
| B2 own roster | met | L2 toad + moth, L3 ram + mole in frames and spawn counts |
| B3 escalation + boss spike | partially | counts / HP / elites rise; Stag = highest damage per second but at parity with room 6 in total damage on carried L2 / L3 |
| B4 slot rules | met | 4 skills, substitution, keys 5-8 inert |
| B5 rarity colour + label, any slot | met | COMMON / RARE / LEGENDARY chips on draft and shop, colour borders + detail label on sockets, 2312/2312 |
| B6 whole build on one page | met | 4x8 + bench + detail at all 3 sizes |
| B7 biome hazards | met | bramble/puffcap, millrace/puffcap, rockfall/gravefire |
| B8 hazard wind-up, hurts enemies | met | 54-120 t; boars damaged |
| B9 interactable feedback | met | prompts, VFX, cues, used glyphs, denials |
| B10 later levels scale | met | table + spawned HP |
| B11 silhouettes | partially | 4/5 clear at 50 %, mole weak |
| B12 telegraphs 0.5-1 s | met | 45-60 t |
| B13 distinct archetypes | met | charge / lob / swooping flier / front guard / burrow |
| B14 tactical environment | met | barricade blocks 5 bolts + breaks; keg hits all factions |
| B15 curve across acts | partially | rooms 2-6 + Stag rise L1 < L2 < L3; room 1 L2 274 > L3 224 (seeds 1-5) |
| B16 carry + act card + HP restore | met | Level I cleared card: next level, 4/4, 16/32, bench, Glint, party restored |
| B17 reward choice / capped inventory explained | partially | substitution line + decline exist; every L3 reward page is empty |
| B18 reward supply over the run | not met | L3 gives 0 nodes, 0 spoils and an empty shop (115 Glint) on the default path and on Level-3 starts |

Score: 12 met / 18 (5 partially, 1 not met).

## PLAN gates (re-measured, builder claims not trusted)
| Gate | Verdict | Note |
|---|---|---|
| G4a.2 skills | PASS | 9/9 cast by key, §23.3 numbers, >= 3 VFX layers |
| G4a.3 nodes | PASS | 9/9 by sim effect incl. the passive cells |
| G4a.4 levels | PASS | own layouts / roster / hazards / interactables / Stag adds; music theme wood / mill / barrow when reported |
| G4a.5 table | PASS | difficultyTable = the CAMPAIGN note |
| G4a.8 L1 real input | PASS | 8 rooms, 0 page errors |
| G4a.10 / GC.12 band | PASS (fragile) | seeds 1-5 in page: rho >= .829, clears 5/5/5, 5/5 + 2/5, 2/5; Stag at parity with room 6 on carried L2 / L3; L3-start Stag 2385 < pooled rooms 5-6 2715 on my seeds 1-5 (the builder's Node seeds 1-5 pass by 2513 vs 2504) |
| G4a.11 portal | PASS | prompt "Begin Run · Level 1 · The Hollow Wood", E -> L1 |
| G4b.1 enemies | PASS | telegraphs 45-60 t Ember, numbers match |
| G4b.2 hazards | PASS | push speed not re-measured |
| G4b.3 interactables | PASS | keg chain + same-tick double use not re-measured |
| G4b.4 biomes | PASS (weak) | bars pass; HUEMIX >= 15 pts in 2 of 3 frame sets |
| G4b.7 biome quality | PASS | Mill room 5 ~18/20, Barrow room 5 ~19/20, no zero (my scoring) |
| G4c.1 - G4c.6 | PASS | tables above |
| G4c.7 node supply | FAIL in Level 3 | "2 clear spoils per combat clear": L3 spoils_drop nodes [] every room on the carried path and on Level-3 starts |
| G4c.9 save migration | PASS | genuine v0.5.39 save loads, migrates, plays |

## Verdict
FAIL — 1 must-fix.

**F1 (must-fix) Level 3 has nothing to give.** From the Level 2 Stag onward the carried default build holds 32/32 sockets (5/5 campaigns), and a Level-3 start arrives with 32/32 via the starter grant. In Level 3 every room reward page reads "NOTHING LEFT TO OFFER · Empty-handed · Both pools are spent. — the run moves on" (reward type null, 4-5 per campaign), every `spoils_drop` has `nodes: []` (G4c.7 promises 2 per combat clear), and the shop says "nothing left to sell you" while the wallet holds 115 Glint that nothing can spend (`captures/gntccontent4-offers.json`, `gntccontent4-l3rewards-s1.json`, `gntccontent4-l3-reward-s1.png`, `gntccontent4-l3-shop-s1.png`, `gntccontent4-l3start.json`). One third of the campaign — the final level — has no build progression and no reward step; the copy "Both pools are spent" is also untrue (the pools are filtered out by a full build). Hades turns full slots into upgrades, and Slay the Spire keeps offering a card reward after every fight, so a player would feel this as broken.

F2 (not must-fix, unreproduced): one uncaught page error in 57 fast-stepped production campaigns — "Cannot read properties of undefined (reading 'isReady')" at three.js WebGLRenderer.compileAsync's 10 ms poll on a material disposed mid-compile (`captures/gntccontent4-camp-from3-prod.log`); 0 in 51 targeted repro trials.

## Advisories (not must-fix)
- Stag spike: the Stag room's total party damage is level with room 6 on the carried Level 2 (1173 vs 1175, seeds 1-10; 1268 vs 1309 in the builder's 20 Node seeds) and Level 3 (2530 vs 2653) and on Level-3 starts (2385 vs 2552 on seeds 1-5); the Stag room is always shorter than room 6. It is the most intense room (damage per second) and where failing runs die, so the pooled gate passes — but only by 0.4 % in the builder's own Node seeds 1-5.
- Level 1 time-to-clear rho drops to 0.371 (my 10 seeds) / 0.543 (the builder's 20 Node seeds) because the fixed 45 s defend rooms dominate; it passes only on seeds 1-5.
- Level medians at room 1: carried L2 274 > L3 224 party damage and 25.6 > 22.5 s (seeds 1-5) — the first Barrow room is easier than the first Mill room for a 32/32 build.
- Mill and Barrow floors read as the same dark navy flagstone; both shade-base hues sit 6-8 deg outside their art-bible bands (Mill 210-212 vs 196-204, Barrow 230-231 vs 212-224); the floor-box HUEMIX test passes in 2 of 3 frame sets.
- Level 1's location plate reads "UNEASY WOODLAND" in every room (and "THE PEDDLER'S CLEARING" at the shop) while the portal, card and Level Select call it "The Hollow Wood"; Levels 2/3 plates use their level names.
- Damage numerals show decimals ("41.9", "22.5", "10.5") in combat frames (`gntccontent4-biome-s5r5-L3.png`, `gntccontent4-floorstrip-a.png`).
- The Grave Mole is the weakest silhouette at 50 % (small, low contrast against the ash floor).
- A gamepad button already held in the frame the pad connects is ignored (first View press after connect did not open the socket screen; later presses did).
