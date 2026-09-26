STATUS: COMPLETE
VERDICT: FAIL (2 must-fix: F1 the Level 2 Stag is not a spike on the carried campaign — 1108 vs 1141 party damage in room 6 over 15 seeds, 1071 vs 1072/1157 on seeds 1-5, above every late room in 5/14 seeds; F2 the live campaign tiers/Stag/grant constants are missing from the binding BUILD_BRIEF §23.2 table so G4a.5 fails 39-60 %; all other content items green — 2312/2312 uncapped sockets, 4-skill cap, 9 skills + 9 nodes, genuine v0.5.39 save, 5 interactables, telegraphs >= 45 t, L1 by real input, 0 page errors; benchmark 32/39).

# Content critic — round 3 (CONTENT EXTENSION, post user corrections: max 4 skills, 8 sockets/skill, no rarity caps; linear campaign L1->L3)

Role: harsh critic. Judges only the running game (captures, console, debug-API state). Tools/captures prefixed `gntccontent3-`.

## Step log
- [x] S0 checkpoint file created (no prior r3 content critic file, no gntccontent3-* files existed).

## S1 — Blind benchmark checklist (written BEFORE viewing any Echoes capture)

Derived from my own knowledge of the shipped games. Each item is testable against Echoes.

### Hades (biome identity, escalating encounters, boon/slot build variety)
- B1. Each biome (Tartarus / Asphodel / Elysium / Styx) has a dominant, instantly distinct palette (Tartarus green-teal stone, Asphodel orange-red magma, Elysium gold-green, Styx purple-red) — a single screenshot identifies the biome without UI.
- B2. Each biome has its own prop/dressing set (pillars/chains vs lava pools/bone rafts vs grass/columns) — not a recolour of the same props.
- B3. Each biome introduces its own enemy roster; earlier biome enemies do not simply reappear with bigger numbers (armored "elite" variants appear later but are visibly distinct).
- B4. Encounters escalate inside a biome: wave count and enemy count per chamber rise room to room; later chambers mix more enemy types.
- B5. Biome hazards are biome-specific (Asphodel lava floor, Tartarus spike traps, Elysium... ) and telegraph before damaging (spike traps pop visibly ~0.5-1 s before damage).
- B6. Boon slots: fixed slot set (Attack/Special/Cast/Dash/Call) — you can hold at most one boon per slot; a new boon for an occupied slot is offered as a swap, clearly marked. (Echoes analogue: max 4 skills; a 5th skill is never offered once full.)
- B7. Build variety: boons stack across slots (many passive boons unlimited), duo/legendary boons require prerequisites; rarity (common/rare/epic/heroic) scales the SAME boon's numbers, and the boon screen shows the rarity and the delta.
- B8. Every offered boon states its effect in numbers; picking one produces a visible, measurable change on the very next attack/cast.
- B9. Pom of Power / upgrades let a player deepen a build during a run — by the end of a full run the player has 15-25 upgrades, a meaningful fill of build slots.
- B10. Chamber reward preview (door icons) — the player sees what reward the next room gives.

### Dead Cells (biome variety, hazard design)
- D1. Each biome has a distinct tileset, background parallax, lighting temperature and music — biomes are distinguishable at thumbnail size.
- D2. Hazards (spikes, traps, bombs, explosive barrels, rotating blades) have a wind-up or are static & readable; every damaging hazard can be identified before stepping into it.
- D3. Interactables (doors, levers, breakable walls, chests, shrines) respond immediately on interaction with sound + animation + a feedback text/particle.
- D4. Later biomes raise enemy damage/HP (tier scaling, "Boss Cell" style) — the difficulty curve is visible in numbers.
- D5. Enemy variety per biome: 4-6 enemy types per biome, each with its own attack pattern.
- D6. Explosive/environmental objects can be used against enemies (barrels damaging enemies, not just the player).

### Enter the Gungeon (enemy readability and telegraphs)
- G1. Every enemy has a unique silhouette readable at small size; colour-coded by threat.
- G2. Every attack has a wind-up tell (flash, animation, sound) before projectiles leave; typical tell 0.4-1.0 s; bosses longer.
- G3. Projectiles are high-contrast against the floor (bright with dark outline), never same hue as floor.
- G4. Enemy behaviour archetypes are distinct: chargers, snipers, spawners, spreaders, jumpers — no two enemies share the same behaviour with only a stat change.
- G5. Hazard floors (fire, poison, water+electric) show their area clearly before and while active.
- G6. Spawn-in telegraph: enemies appear with a spawn animation/marker before becoming active (no damage on the spawn frame).

### Slay the Spire (difficulty curve across acts)
- S1. Act 1 -> 2 -> 3: monster HP and damage rise each act (e.g. hallway fights ~40-50 HP act 1, ~100+ HP act 2, ~150+ act 3); elites and bosses are spikes above the surrounding curve.
- S2. Within an act, the first ~3 fights are an "easy pool", later fights draw from a "hard pool" — a step up mid-act.
- S3. Boss at the end of each act is the largest single spike in the act; the rest site / shop right before the boss is a trough (respite).
- S4. Your deck (build) carries across acts; the game's later acts are tuned for a carried, grown deck — not for a fresh deck.
- S5. Relic/card rewards across a run are plentiful enough that the build meaningfully grows (15-30 card choices, ~10-20 relics by act 3).
- S6. Card reward screens never offer an invalid/useless choice without saying so; upgraded cards show the delta.

### Echoes-spec items (from the module spec, user corrections, campaign model)
- E1. Distinct level configurations: 3 levels, each 8 rooms (6 combat, shop, Stag).
- E2. Escalating difficulty monotone across rooms and levels, sensible spikes at boss/defend rooms.
- E3. Varied new enemy/obstacle types, each with distinct behaviour, silhouette at 50% zoom, telegraph >= 0.7 s in Ember.
- E4. Max 4 skills: keys 1-4 cast, 5-8 do nothing, drafts never offer a 5th skill once 4 owned.
- E5. Every skill has 8 sockets, no rarity caps; common/rare/legendary fit every socket incl. passive; per-node repetition limits, grey verdicts, legendary passive reinterpretation.
- E6. Socket screen (4x8) + command bar fit at 1024x576 and 2560x1440, navigable by keyboard, mouse, gamepad.
- E7. Node supply per run fills a meaningful share of 32 sockets.
- E8. Pre-correction save loads without a crash.
- E9. Every new skill / node functions (sim effect + VFX) incl. reinterpretation.
- E10. Every interactable responds with feedback.
- E11. Original 8-room loop plays by real input.
- [x] S2 smoke + legacy core loop (v0.5.94): `captures/gntccontent3-smoke.png` exit 0, 0 PAGEERROR; `gntccontent3-coreloop` (ARCH recipe, ?seed=7&menu=0): camp tick 312 → portal 467 → combat room 1 tick 489 → reward tick 665, 0 PAGEERROR.
- [x] S3 socket sweep in page (`tools/gntccontent3-sockets.mjs` → `captures/gntccontent3-sockets.json`, graybox, v0.5.94): 17 skills × 17 nodes × 8 sockets = **2312 socket ops, 2312 ok, 0 denied** (common 1088 / rare 952 / legendary 272 placements, 0 rarity/cap denials); per-skill limits 289/289 (limit copies ok, limit+1 → `limit`); verdict matrix 765 cells on sockets 1/4/8 vs BUILD_BRIEF §23.4 → **0 mismatches** (incl. inert Multiply on Restorative Wave / Mending Tide / Hearthsong, Resonance live on both passives); 9th node → `full`, index 8 → `no_such_slot`, unowned → `skill_not_owned`, not on bench → `not_on_bench`; live combat (startRun room 1) socket → `combat_active`, autoFill → `combat_active`. 0 page errors.
- [x] S4 effects by REAL key presses (`tools/gntccontent3-effects.mjs` keys leg → `captures/gntccontent3-effects-arena.json`; `tools/gntccontent3-effects2.mjs` → `captures/gntccontent3-effects2-heal.json` / `-dmg.json`, readable dumps `.txt`; arena scene, allies downed for damage legs, targets stunned in place): keys 1-4 → `skill_cast` slot 0-3 1-3 ticks after the keydown read; keys 5-8 → 0 casts, 0 `intent_denied`. All 9 new skills match §23.3: Lantern Flurry 3 bolts (dz ±0.21 ≈ 12°) 9 each; Pale Lance 30 ×3 targets (pierce events left 2→1→impact); Bell Toll 20 ×5 (cap 5 of 6), stun 30 ticks; Rootsnare 6/zone tick ×5, slow 0.45 72 ticks; Dewfall 7/tick ×5 on 3 allies; Kindred Shield 16 + shield 20/240 ticks; Mending Tide 12 ×4 in the arc; Hearthsong 10 ×4 + haste 0.25/120; Quiet Hearth 2/pulse every 60 ticks + ward 0.15/72. Nodes in SOCKET 8: damage Snare slow .4/90, Galvanize exposed .2/180, Bulwark caster shield 6 (=20% of 30), Split 2 shards 12 (40%), Keen critBonus .15, Bounce hop 30 to the other boar, Siphon self-heal 7.5, Detonate 15 r1.2 on 2 boars, Echo recast 60 ticks later at 15 (50%), Multiply 1→2 bolts, Reach bolt traveled 7.5, Resonance 3rd cast `resonance_proc` n3 → 60 dmg; heal Snare haste .2/90, Galvanize inspired .15/180, Bulwark overheal shield 7 (cap 50% of 14), Split 5.6 to the 2 other allies, Bounce 14 hop, Siphon drain 3.5 on the boar, Detonate 7 burst r1.2, Echo 100% recast; stat Widen Bell Toll 1.6→2.0 (boars at 1.85 hit only with Widen), Linger Rootsnare 5→8 zone ticks + slow 72→108, Lantern Flurry+Multiply 4 bolts. Passives: Warding Aura+Ascend 6/pulse (crit 9), +Resonance every 3rd pulse ×2 with `resonance_proc {pulse:true}` (n3, n6), +Echo reapply pulse (`echo:true`) does NOT advance the counter (n3 → next n6 after 3 regular pulses), Quiet Hearth+Ascend 4, +Resonance ×2 on n3, +Bulwark +2 shield/pulse stacking, +Galvanize inspired .1, Warding+Widen area 0.9→1.13. VFX frames `captures/gntccontent3-vfx-*.png` (layered: rim + fill + motes/numerals; heal green, damage parchment/amber, slow Signal-Blue ring). 0 page errors.
- [x] S5 difficulty curve, in page, the real game (`tools/gntccontent3-camp.mjs` autopilot + `sim.stepN`, collector verified non-perturbing by `tools/gntccontent3-det.mjs` pure vs reads = identical; analysis `tools/gntccontent3-camp-an.mjs` → `captures/gntccontent3-camp-analysis.{json,txt}`, 15-seed carried pool `tools/gntccontent3-camp-an15.mjs` → `captures/gntccontent3-camp-carried15.json`). Outcomes: carried L1→L3 seeds 1-5 5/5 victories (15 seeds: 12 full, L1 15/15, L2 14/15, L3 12/14); from L2 (grant) L2 5/5, L3 2/5; from L3 (grant) 2/5. 0 page errors. Measured spawn HP = base × plan hpMul exactly (boar 20→36 at L1 r6 = ×1.8; toad 34×1.6 = 54.4; ram 90×3.248 = 292.3). Live tiers T = 1.0 / 1.6 / 2.8, Stag HP 2400 / 5184 / 6720 — the binding BUILD_BRIEF §23.2 table still says M4c T 1.00/1.15/1.75 and there is NO "CAMPAIGN note" in §23.2 although PLAN §12.10 and BUILD_BRIEF §24 point to it (grep: 0 hits). **Stag spike:** L1 Stag 341 party dmg vs r6 140 (15/15 seeds above); **L2 Stag 1108 vs room-6 1140 (all modes) / 1141 (kill_all) — BELOW room 6; per seed above every late room in 5/14; seeds 1-5 (the gate set) 1071 vs 1072 kill_all / 1157 all** — L2 boss is not a spike in the carried campaign; L3 Stag 2528 vs r6 2046 (9/12 seeds) but shortest late fight in 12/12 seeds (49.9 s vs 61-77 s). ρ (time/dmg) seeds 1-5: carried L1 .943/.943, L2 .829/1, L3 .829/.886; L2-start .943/.943; L3-start 1/1. Defend soft-fail (Waystone lost) under the default autopilot: carried L2 7/10, L3 9/10; 15-seed L2 r3-r6 18/23. Builder's Node runner (`gntCAMPAIGN-camprun --node 1`, re-run → `captures/gntccontent3-bcamprun-from1-node.json`) diverges from the browser after the first defend soft-fail (seed 1 L2 r6 53.6 vs 55.2 s; seed 4 L3 r2 65.3 vs 67.8 s, then Node DEFEAT vs page VICTORY); its `--node 0` page mode crashes (`TypeError: Cannot read properties of undefined (reading 'map')` inside stepN).
- [x] S5b curve plot `captures/gntccontent3-curve.png` (`tools/gntccontent3-plot.mjs`, small multiples: planned hpMul, enemies/room, party damage (log), seconds to clear; L2 Stag flat vs r6 on damage, every Stag shorter than r6 on time).
- [x] S6 biomes / enemies / hazards (`tools/gntccontent3-biome.mjs`, `-zoo.mjs`, `-idle.mjs`, `-palette.mjs`): room-4 combat frames `captures/gntccontent3-biome-L{1,2,3}.png` (+ quarter-size strip `-biome-strip25.png`); analyzer full frame LUMA>160 4.69/1.57/1.98 %, >200 0.50/0.60/0.70 %, buckets 15/16/15, FLAT 2.80/1.23/1.21 % (all above the §19.3 bars). Hue histograms (sat-weighted, play area): blue 39.8/41.3/44.4 %, orange 34.4/26.0/38.1 %, yellow-green 9.4/2.1/0.2 %, teal 2.2/6.6/0.2 %; dark-floor mean RGB (28,30,35)/(26,27,31)/(28,27,30). Floor box 560,560,320,140 HUEMIX (warm|foliage|cool) L1 1.0|2.3|96.6, L2 66.5|4.0|29.5 (lantern pool in box), L3 10.3|0.0|89.7 → L1 vs L3 max Δ 9.3 < 15 on this frame; grid of 20 boxes per frame: unlit floor boxes 95-98 % cool in all three. Telegraph census (autopilot, 3 levels): quillback lane 48 t, toad ring 60 t, moth lane 45 t, ram cone 60 t, mole ring 60 t, legacy boar/mantis 42 t, spawn 48 t, puffcap 60-96 t, millrace 60-94 t, rockfall 72 t, gravefire 54 t per vent (raw events) → every avoidable damage ≥ 42 t (0.7 s), new ones ≥ 45 t. Mid-telegraph frames `captures/gntccontent3-tele-*.png` / `-tele-sheet.png` (Ember lanes/rings/cone, danger px 7k-20k); idle layouts 2/5/8 danger px 12 / 6 / 1144 (scattered, no hazard). 50 % silhouettes `captures/gntccontent3-zoo-sheet50.png`: quillback spiky ball, toad squat spotted blob, moth V-wings, ram block + curled-horn disc, elite = indigo outer ring + crown; mole (surfaced) = small dark low mass, weakest read. 0 page errors.
- [x] S7 socket screen + command bar (`tools/gntccontent3-socketui.mjs` → `captures/gntccontent3-socketui.json`, frames `captures/gntccontent3-socket-{1024x576,1600x900,2560x1440}.png`, `-socket-limitdeny.png`): 4 rows × 8 = 32 cells + 13-14 bench chips + detail at scale 0.776 / 1.212 / 1.75; all inside the window, 0 cell/chip/detail overlaps, no page scroll, min cell 49.7 / 77.6 / 112 px, min text 12.4 / 14.2 / 16 px (one decorative "◈" glyph at 11.7 px at 1024×576). Command bar 4 skill tiles + SPC + 4 portraits = 9 boxes, 0 overlaps, inside at all 3 sizes, 8-pip socket strip per skill tile. Keyboard: B opens, bench Enter picks (cursor jumps to suggested socket, "power 22 → 44" preview), Enter places ([1,0,0,0]), X removes, 1-4 rows, arrows, Resonance twice on one row → `socket_denied: limit` + shake + 7 limited cells, F auto-fill, Esc closes with defaultPrevented=true. Mouse: chip click holds, cell click places (live), right-click removes. Mock standard pad: View opens, D-pad moves (3,3)→(3,4), Y auto-fills (+8), X removes, B closes. With 4 skills owned the room-1 skill reward became `{type:'node', substituted:true, line:'no slot free — offering a Node instead'}`. 0 page errors.
- [x] (process) vite preview of the v0.5.39 build on :4326 PID 76260 — killed (port 4326 free).
- [x] S8 pre-correction save (`tools/gntccontent3-v1save.mjs`; the v0.5.39 build = `git archive ebd0609` built into `captures/gntccontent3-v1dist`, served on my port 4326, killed): v0.5.39 wrote a GENUINE schema-1 manual save (8-slot kit with 6 skills: mending_bolt, swift_mend, pale_lance, bell_toll, warding_aura, dewfall; nodes socketed on 2-socket rows; bench keen + galvanize). Its localStorage copied into the v0.5.94 origin → title lists it as schema 3 ("Continue — Slot 1 · Level I…"); real Enter → loads in 12.4 ms, 0 page errors, `app playing`, skills [mending_bolt, swift_mend, pale_lance, bell_toll] (first 4 in slot order), rows padded to 8 with nodes in place (sharpen+ascend / echo / split / widen), dropped skills' nodes on the bench (snare, linger + keen, galvanize), stale skill reward → empty offer "the run moves on", campaign {mode campaign, level 1, harness false}; tick 195 → 1158 ten seconds later (`captures/gntccontent3-v1save-act1.json`, `-v1save-loaded-act1.png`). An Act-II v0.5.39 save from a profile with only Level 1 unlocked is refused with the toast "That save is in a level you haven't unlocked yet — Clear The Hollow Wood to unlock" (`-v1save-act2.json`); the title's Continue button still advertises it.
- [x] S9 interactables by REAL input (`tools/gntccontent3-ix.mjs`, `-ix2.mjs`, `-ix3.mjs` → `captures/gntccontent3-ix*.json`, frames `-ix-dewfont.png`, `-ix-sluice.png`, `-ix-bell.png`, `-ix-keg-fuse.png`, `-ix-barricade-broken.png`): Dewfont prompt "E · Drink" → party heals 25/37.5/23.75/20 (= 25 % max HP), 2nd E → `interact_denied: used`, prompt "E ✕ Dry"; Sluice "E · Pull" → `sluice_toggle`, both millrace lanes calm, 2nd E → `cooldown`, prompt "E ◷ Closed · 10 s"; Warding Bell "E · Ring" → `bell_ring radius 3`, stun 60 t on boars at 1.98 / 2.82 u, not at 3.49 / 3.97 u, 2nd E → `used`; Powder Keg shot by RMB → `keg_ignite` t257 → `keg_blast` t317 (60-tick fuse) → 30 dmg to the boar (r 1.6); Barricade: 6 RMB bolts at a boar behind it → 6 × `projectile_despawn: blocked`, 0 boar hits, barricade 60 → 12 HP (8 per bolt), then `broken` and removed. 0 page errors. (Probe pitfall noted, not a defect: the camera eases after `teleport`, so aim is projected after 1.5 s.)
- [x] S10 original 8-room loop by REAL input (`tools/gntccontent3-realrun.mjs 3` → `captures/gntccontent3-realrun-s3.json`, frames `-realrun-s3-*`): ?menu=0&seed=3, W to the portal, E → campaign Level 1; my bot (WASD kiting, RMB held, keys 1-4 = 33 casts, Enter on 6 drafts / 5 doors, mouse click on a shop card, B·F·Esc sockets) cleared rooms 1-6, shop (1 purchase), Hollow Stag (room 8: 22 s), `level_clear {level 1}` at tick 13135 → card "LEVEL I CLEARED · THE HOLLOW WOOD · NEXT Level II · The Sunken Mill · skills 4/4 · sockets 17/32 · Glint 69 · party restored to full" (`-realrun-s3-card.png`) → Enter → Level 2 room 1 combat; 229 s wall, 0 downs, 0 page errors. Node goldens (`tools/gntM2-goldens.mjs`, read-only) 9/9 match; legacy in-page trace `?seed=7&scene=arena&room=kill_all&freeze=1` `sim.trace(600,3)` = eventsHash 817f1e9940c91d76 on two loads (= v0.5.0 events), stateHash 0db5d828a848381b both loads (capture shape grew since v0.5.0).
- [x] S11 extra probes: sim effect from EVERY socket 1-8 (`tools/gntccontent3-sock8.mjs` → `captures/gntccontent3-sock8.json`): Ascend on Warding Aura → 6/pulse from sockets 1…8; Resonance on Quiet Hearth → `resonance_proc 3p` + 2→4 from sockets 1…8; Bounce on Swift Mend (real key 1) → 1 `bounce_hop` from sockets 1…8. Behaviours (`-behave.mjs`): Barrow Ram blocks 4/4 front RMB bolts (`hit_blocked`, 0 hits); Grave Mole spawned at (4,3) emerges at the player (0.22,0.16) t739; toad glob lands + slick; quillback charge ends `spent`. Setting-out cards (`-depart.mjs`, `captures/gntccontent3-depart-L2.png`): L2 start grant +2 skills, 19 nodes, 34 Glint → 19/32 sockets; L3 +2 skills, 32 nodes, 60 Glint → 32/32. Combat fps (`-perf.mjs`, GPU harness, room 5 per level): rAF 82.6 Hz, p50 12.1 ms, p95 18.2-18.3 ms, 526/460/444 frames in 6 s.

---

## S12 — Probe tables (v0.5.94, HEAD 027850e, dev server :5199; every number from a named capture)

### Difficulty curve — carried campaign (Begin Run → L1 → L2 → L3), default-build autopilot, in the browser
Plan values from `content.roomPlan()` at each room start; party damage / seconds = per-room medians. Seeds 1-5 (`captures/gntccontent3-camp-analysis.json`) and 15-seed pool (`captures/gntccontent3-camp-carried15.json`). Plot: `captures/gntccontent3-curve.png`.

| Level · room | hpMul / dmgMul / budget | enemies (med) | wave gap s | party dmg med (15 seeds, all / kill_all / defend) | s to clear (15) |
|---|---|---|---|---|---|
| L1 r1 | 1.00 / 1.00 / 4.0 | 8 | 5.2 | 25 / 25 / – | 13.3 |
| L1 r2 | 1.16 / 1.08 / 4.64 (def 5.8) | 12 | 5.9 | 24 / 25 / 24 | 19.9 |
| L1 r3 | 1.32 / 1.16 / 5.28 | 14 | 7.7 | 35 / 35 / 33 | 22.2 |
| L1 r4 | 1.48 / 1.24 / 5.92 | 13 | 6.4 | 53 / 53 / 47 | 27.0 |
| L1 r5 | 1.64 / 1.32 / 6.56 (def 8.2) | 25 | 12 | 112 / 130 / 78 | 29.3 |
| L1 r6 | 1.80 / 1.40 / 7.2 | 23 | 8.5 | 133 / 140 / 129 | 30.8 |
| **L1 Stag** | Stag 2400 HP, dmg x1 | 9 incl. adds | – | **341** (15/15 seeds above every late room) | 20.6 |
| L2 r1 | 1.60 / 1.30 / 6.4 | 11 | 10.4 | 173 / 173 / – | 24.3 |
| L2 r2 | 1.856 / 1.428 / 7.42 | 14 | 9.9 | 290 / 224 / 357 | 31.6 |
| L2 r3 | 2.112 / 1.556 / 8.45 | 25 | 12 | 390 / 245 / 677 | 31.1 |
| L2 r4 | 2.368 / 1.684 / 9.47 | 22 | 9.5 | 600 / 606 / 533 | 45.0 |
| L2 r5 | 2.624 / 1.812 / 10.5 | 29 | 12 | 822 / 753 / 1091 | 56.5 |
| L2 r6 | 2.88 / 1.94 / 11.52 | 27 | 8.9 | 1140 / **1141** / 1139 | 54.6 |
| **L2 Stag** | Stag 5184 HP, dmg x1.54 | 9 incl. adds | – | **1108** (above every late room in only 5/14 seeds) | **44.3** |
| L3 r1 | 2.80 / 1.90 / 11.2 | 15 | 10 | 249 / 249 / – | 24.3 |
| L3 r2 | 3.248 / 2.124 / 12.99 | 27 | 12 | 700 / 448 / 1164 | 42.2 |
| L3 r3 | 3.696 / 2.348 / 14.78 | 19 | 9.4 | 1141 / 579 / 1383 | 45.4 |
| L3 r4 | 4.144 / 2.572 / 16.58 | 29 | 9.1 | 1590 / 1541 / 2002 | 63.1 |
| L3 r5 | 4.592 / 2.796 / 18.37 | 31 | 8.9 | 1956 / 1946 / 2246 | 67.7 |
| L3 r6 | 5.04 / 3.02 / 20.16 | 32 | 8.6 | 2046 / 2079 / 1914 | 77.0 |
| **L3 Stag** | Stag 6720 HP, dmg x2.62 | 9 incl. adds | – | **2528** (9/12 seeds) | **49.9** (0/12 seeds longer than a late kill_all room) |

Band (seeds 1-5, gate method): carried L1 rho .943/.943 clears 5/5; L2 rho .829/1 clears 5/5; L3 rho .829/.886 clears 5/5 (15 seeds: 15/15, 14/15, 12/14). L2 start (grant): L2 rho .943/.943 5/5, boss 954 > r6 kill_all 747; continuing L3 2/5. L3 start (grant): rho 1/1, clears 2/5, boss 2531 vs r6 kill_all 2991. Level medians rise L1 < L2 < L3 at every room on damage; on time L3 r1 22.8 s < L2 r1 25.5 s (seeds 1-5). Defend soft-fails (Waystone lost): carried L1 0/10, L2 7/10, L3 9/10. With the builder's pooled rooms-4-6 method the boss passes everywhere (L2 1071 > 634) — the pool hides room 6.

### Enemies and hazards
| Kind | telegraph (ticks, measured) | shape | silhouette at 50 % | distinct behaviour (measured) |
|---|---|---|---|---|
| Quillback | 48 | lane | spiky ball | charge ends `spent`, lane locked |
| Mire Toad | 60 | ring | squat spotted blob | glob lands + slick spawns |
| Gloam Moth | 45 | lane | V wings (only flier) | swoop lane through the party |
| Barrow Ram | 60 | cone | block + curled-horn disc | 4/4 front bolts `hit_blocked` |
| Grave Mole | 60 | ring | small dark low mass (weakest read) | burrows at (4,3), emerges under the player |
| Elite | same | – | indigo outer ring + crown | x1.8 HP |
| Puffcap / Millrace / Rockfall / Gravefire | 60-96 / 60-94 / 72 / 54 per vent | ring / lane / ring / ring | – | idle layouts 2/5/8: 12 / 6 / 1144 scattered danger px |

Skills, sockets, nodes, saves, interactables: steps S3, S4, S7, S8, S9, S11 above (all pass).

## S13 — Benchmark score (blind checklist S1, item by item)
| Item | Verdict | Evidence |
|---|---|---|
| B1 biome palette nameable | PARTIAL | L1 distinct (yellow-green 9.4 %); L2 vs L3 share the palette: blue 41.3/44.4 %, orange 26/38 %, dark-floor RGB (26,27,31)/(28,27,30); at 25 % (`biome-strip25.png`) L2/L3 are told apart by tile pattern + props only |
| B2 own prop set | MET | mill: millrace lanes, sluice, mill wheel, slate tiles; barrow: standing stones, glyph slabs, bone rubble, braziers, bell; wood: fences, logs, grass |
| B3 own roster | MET | L1 boar/mantis/quillback, L2 + toad/moth, L3 ram/mole (+ elites) |
| B4 in-biome escalation | MET | enemies per room 8→23, 11→27, 15→32 |
| B5 hazard telegraphs | MET | 54-96 ticks |
| B6 slot cap, no 5th offer | MET | reward `substituted: true` "no slot free — offering a Node instead"; 5th giveSkill `no_free_slot` |
| B7 build variety / rarity | PARTIAL | 15 skills × 17 nodes × 8 sockets, but one-card take-or-decline drafts (§16) and a Level-3 start arrives 32/32 auto-filled |
| B8 numbers + visible change | MET | shop cards "+25% power…", socket preview "power 22 → 44" |
| B9 build grows over a run | MET | L1 Stag 19/32 (autopilot), 17/32 (real input) |
| B10 door reward preview | MET | `realrun-s3-L1-r2-path.png` icons + legend |
| D1 thumbnail-distinct biomes | PARTIAL | as B1 |
| D2 readable hazards | MET | Ember rings/lanes, idle states not Ember |
| D3 interactable feedback | MET | 5/5 prompts, used/cooldown glyphs, events (audio not measured) |
| D4 later-biome scaling | MET | hpMul 1.0 → 5.04 |
| D5 roster size / patterns | MET | 3 / 5 / 5 types, 5 distinct new patterns |
| D6 environment vs enemies | MET | keg 30 dmg to a boar; barricade blocks 6/6 bolts |
| G1 silhouettes | PARTIAL | mole weakest (`zoo-sheet50.png`) |
| G2 wind-up tells | MET | 45-60 ticks new, 42 legacy |
| G3 projectile contrast | MET | amber bolts on dark floors (`vfx-lantern_flurry.png`) |
| G4 distinct archetypes | MET | charger / lobber / flier / guarded bruiser / burrower |
| G5 hazard areas shown | MET | `tele-sheet.png` |
| G6 spawn telegraph | MET | 48 ticks |
| S1 HP/dmg rise + spikes | PARTIAL | rise yes; L2 Stag not a spike on the carried path |
| S2 mid-act step-up | MET | rho ≥ .829 |
| S3 boss = largest spike | **NOT MET** | L2 Stag 1108 < r6 1141; every Stag shorter than room 6 |
| S4 tuned for carried build | MET | carried 5/5 (15 seeds 12/14 full campaigns) |
| S5 plentiful rewards | MET | 2 spoils per clear, 4-card shelf |
| S6 honest offers | MET | "fits your kit", substitution line |
| E1 three level configurations | MET | 3 × 8 rooms, own layouts/rosters/hazards/interactables/adds |
| E2 monotone curve + spikes | **NOT MET** | L2 Stag dip (F1); binding table stale (F2) |
| E3 new enemies / hazards | MET | table above |
| E4 max 4 skills, keys 5-8 inert | MET | S4 keys table |
| E5 8 sockets, no caps, limits, verdicts, legendary passives | MET | 2312/2312, 289/289, 765/765, Ascend 6, Resonance pulse x2 |
| E6 socket screen 3 sizes × 3 inputs | MET | S7 |
| E7 node supply | MET | 59 % at the L1 Stag |
| E8 pre-correction save | MET | S8 |
| E9 new skills / nodes work | MET | S4, S11 |
| E10 interactables | MET | S9 |
| E11 8-room loop by real input | MET | S10 |

**Score: 32 met / 39 (5 partial, 2 not met).**

## S14 — PLAN gates (re-measured, builder claims not trusted)
| Gate | Verdict | Evidence |
|---|---|---|
| G4c.1 four slots | PASS | keys 1-4 cast 1-3 ticks after the keydown read, 5-8 nothing; 9 bar boxes, 0 overlaps at 3 sizes; substitution line; 5th giveSkill refused |
| G4c.2 eight sockets, no caps | PASS | 2312 ops 0 denials; limits; full; no_such_slot; combat_active |
| G4c.3 legendaries on passives | PASS | Ascend 6 (crit 9) from sockets 1-8; Resonance `pulse:true`; Echo reapply pulse not counted |
| G4c.4 verdicts on sockets 1/4/8 | PASS | 765 cells 0 mismatches; techniques fire from socket 8 |
| G4c.5 socket screen | PASS (note) | inside, 0 overlaps, no scroll, cells ≥ 49.7 px, text ≥ 12.4 px except a decorative ◈ at 11.7 px at 1024×576; keyboard / mouse / pad legs |
| G4c.6 bar socket strip | PASS | `hud.slots()[i].sockets {filled, live, grey, of: 8}` |
| G4c.7 node supply | PASS | 2 spoils per clear, shelf 15/15/20/25, L1 Stag 19/32 ≥ 50 % |
| G4c.9 save migration | PASS | GENUINE v0.5.39 schema-1 → 3, first 4 skills, bench, padding, 0 errors |
| G4c.10 determinism | PASS | Node goldens 9/9; in-page legacy trace identical across loads |
| G4a.2 / G4a.3 skills and nodes | PASS | S4, S11 |
| G4a.4 levels own content | PASS | layouts 1-3 / 4-6 / 7-9, rosters, hazards, interactables, boss adds boar+mantis / toad+moth / ram+mole |
| G4a.5 curve vs binding table | **FAIL** | live T 1.0/1.6/2.8 vs BUILD_BRIEF §23.2 (latest dated note = M4c) 1.00/1.15/1.75: L2 r1 hpMul 1.6 vs 1.15, L3 r6 5.04 vs 3.15; the "CAMPAIGN note" PLAN §12.10 names does not exist |
| G4a.6 legacy composition | PASS | eventsHash 817f1e9940c91d76 = v0.5.0 |
| G4a.8 / G4a.9 real input | PASS for L1 | S10 (real L2/L3 legs not repeated; autopilot L1 15/15, L2 14/15) |
| G4a.10 / GC.12 felt curve | **FAIL** | carried L2 boss 1071 < room-6 kill_all 1072 / all-mode 1157 (seeds 1-5); 15 seeds 1108 < 1141 |
| G4b.1 enemies | PASS (note) | telegraphs ≥ 45 ticks; mole silhouette weakest |
| G4b.2 hazards | PASS | 54-96 ticks; idle not Ember |
| G4b.3 interactables | PASS | S9 (same-tick double use not tested) |
| G4b.4 biomes | PARTIAL | analyzer bars pass for all 3; floor-box HUEMIX L1 vs L3 max Δ 9.3 < 15 on my room-4 frames |
| G4b.5 perf | PASS | 74-88 fps mean, p95 18.3 ms |
| G4b.7 biome quality | PASS | my REFERENCE_BAR scoring L2 18/20, L3 17/20, no zero |
| G4b.8 deterministic setups | PASS | spawn(elite), hazardPhase, ?layout, burrow used throughout |

## S15 — Verdict
**FAIL — 2 must-fix.**
- **F1** The Level 2 Hollow Stag is not a difficulty spike on the carried campaign (the path every Begin Run takes): 1108 median party damage vs 1141 in the room-6 kill_all room over 15 seeds (1071 vs 1072 kill_all / 1157 all-mode on the gate seeds 1-5), above every late room in only 5/14 campaigns, and 7-10 s shorter than room 6; on time every Stag is the shortest late fight (L1 20.6 vs 30.8 s, L2 44.3 vs 54.6 s, L3 49.9 vs 77.0 s).
- **F2** The live campaign curve (tiers 1.0/1.6/2.8, L2 Stag HP ×1.35, boss damage slope 0.9, starter grants 2 skills + 18 nodes + 1 legendary + 34 Glint / 2 + 30 + 2 + 60) is not in the binding design doc: PLAN §12.10 and BUILD_BRIEF §24 point to a "dated CAMPAIGN note in §23.2" that does not exist, so G4a.5 compares the game with a stale table (39-60 % off).

Everything else in the content extension re-measures green: 4-skill cap, 8 uncapped sockets on all 17 skills, limits, verdicts, legendary passive reinterpretations, all 9 skills and 9 nodes, socket screen at 3 sizes × 3 inputs, node supply, genuine pre-correction save, 5 interactables, 5 enemies + 5 hazards with ≥ 0.75 s Ember telegraphs, the 8-room loop by real input, 0 page errors in every probe.

## Advisories (not must-fix)
- A1 L2 and L3 share one dominant palette (see B1); G4b.4's floor-box HUEMIX test is fragile (depends on where the lantern pools fall).
- A2 The builder's Node runner (`gntCAMPAIGN-camprun --node 1`) diverges from the browser after the first defend soft-fail (seed 1 L2 r6 53.6 vs 55.2 s; seed 4 Node DEFEAT vs page VICTORY) and its `--node 0` page mode throws inside stepN; page runs also end 1-15 ticks apart run to run (e.g. 52862 vs 52863, 30621 vs 30636) — the campaign band evidence in build-CAMPAIGN.md was not measured on the shipped sim.
- A3 The Waystone is lost by the reference build in 7/10 (L2) and 9/10 (L3) defend rooms on the carried path; with sockets already full (32/32 from L2 room ~4) the forfeited spoils cost nothing, so the soft-fail has no bite.
- A4 Socket economy saturates: 32/32 by the L2 Stag on every carried seed, L3 start 32/32 on arrival; later spoils and shop nodes only pile on the bench.
- A5 The Level 1 room banner reads "UNEASY WOODLAND · … CLEAR THE CLEARING" while the level is "The Hollow Wood" everywhere else (card, select, L2/L3 banners).
- A6 A decorative "◈" glyph renders at 11.7 px at 1024×576 in the socket screen.
- A7 The surfaced Grave Mole is the weakest silhouette at 50 %.
- A8 The title's Continue advertises a save in a locked level and only refuses (toast) after Enter.
