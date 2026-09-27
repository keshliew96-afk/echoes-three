STATUS: COMPLETE
VERDICT: FAIL (4 must-fix) — F1 (r4 F1 still open): CAMPAIGN COMPLETE is drawn over the camp that replaced the final level 70-165 ms after the killing blow; F2: an uncaught page error "reading 'isReady'" (three.js compileAsync polling a material disposed during its async compile) on a ?level=3 boot, 1 of ~76 boots under load; F3: on a full-slot SWAP offer, choosing the skill to replace (W/S, mouse) and pressing Enter DISCARDS the new skill whenever the AI suggestion is Leave (2 of 5 seeds) — GP.14 "Enter takes it" not met; F4: memory grows every full-play campaign (+5..+7 GL geometries, +20..+25 GL buffers, +1 texture, +0.3..+1.6 MB heap per campaign; 2 off-scene RingGeometry retained even in tick-identical campaigns). Everything else holds on the production build: exactly-once clears in every edge case (12/12), 0 near-black frames, kill->control 3027-3100 ms auto / 737-1279 ms Enter, max rAF gap 91 ms, carry/restore/reset exact for all four builds (15 runner transitions + page probes), locks on every input path, save/Continue/real schema-2/3 migrations, 2-client sync with 0 desyncs, band gates true; benchmark 16/21 met, 3 partial, 2 not met.

# Critic — Campaign module, gauntlet round 5 (fresh context)

Build under test: HEAD 038ca62, v0.5.165 (branch gauntlet), production bundle `dist-gntccampaign5` served by my own
`vite preview --port 4332` (PID 88472, killed at the end). **The shared dev server 5199 was DOWN for the whole run**
(curl 000 at start and again mid-run; not started, per the rules), so every page measurement is on the production build;
the GC.7 "dev server AND production" pair could only be measured on production. cmd use is named in every step
(skipToRoom / killBoss / killAllEnemies to reach clears quickly; giveSkill / grantNode / socket / partyGrant to seed builds);
the player paths — portal, pause, Quit to Lobby, Level Select, swap choices, save / load / Continue — are real keys, mouse or a mocked pad.

## 2. Blind benchmark scoring (the checklist, §1 below, was written before any capture was opened)

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| B1 | clear fires exactly once | MET | 12/12 edge cases incl. same-tick Stag + add, wipe on the clear tick (defeat, 0 level_clear), Enter x12, 40-key mash, hidden tab (step 5); 1/1 level_clear / level_start on 30 page transitions (step 6) and 15 runner transitions (step 12) |
| B2 | title card names from / to | MET | "LEVEL I CLEARED · THE HOLLOW WOOD", "NEXT Level II · The Sunken Mill" (captures/gntccampaign5-flow-prod-t1-card.jpg) |
| B3 | build carried bit-exact | MET | Healer + Tank + Swordsman + Archer slots, 8-socket rows, benches identical across both transitions (steps 3, 7); runner skills / sockets / bench / Glint 15/15 |
| B4 | respite heal | MET | card: HP 100/150/95/80 of max from 55/86/0 (downed)/60, statuses 0, all cooldowns 0 (step 3) |
| B5 | nothing leaks into the next stage | MET (entities) | 0 enemies / eshots / projectiles / zones / azones / bolts / hazards / interactables / markers on the card; next level's dressings only [4,5,6] / [7,8,9] |
| B6 | no black screen | MET | 0 near-black frames of ~500 screencast frames; min luma 34.3 (4x CPU) / 36.9; the darkest frame is gameplay with 16/16 luma buckets |
| B7 | next stage starts by itself | MET | modes ['run'] only, 0 camp frames, index 1 -> 2 -> 3 |
| B8 | hub only on death / victory / confirmed abandon | MET | Quit to Lobby needs a confirm ("Abandon this campaign — back to camp") from combat, party page, shop, card |
| B9 | input during the transition cannot break it | PARTIAL | never breaks; but Enter pressed while "Preparing …" is dropped (12 presses at card ticks 12-80 -> advance 'auto' at +229 ticks) while the card offers "Enter set out now" |
| B10 | alt-tab / hidden tab | MET | real background tab 5.4 s: sim held (tick 58 -> 58), then exactly one advance |
| B11 | memory back to baseline across runs | NOT MET | F4 |
| B12 | no hitch at kill / card / arrival | MET | max rAF gap 91 ms over 8 auto transitions without a screencast; exits 48-91 ms |
| B13 | save & quit resumes chapter + build | MET | step 9 |
| B14 | locked content shows lock + condition, unselectable | MET | step 8 |
| B15 | unlock persists | MET | reload keeps [1,2]; Records "Levels open I · II · III" |
| B16 | victory screen, then hub | NOT MET | F1 |
| B17 | defeat summary, then hub | PARTIAL | summary + Enter -> camp work, but the card is over the camp and reads "The gods applaud." on a party wipe |
| B18 | co-op moves together | MET | guest card +106 ms / L2 +273 ms after the host (lat60 / jit10 / loss2: +414 / +551 ms), equal state, 0 desyncs |
| B19 | later stages harder, scaled to the carried build | MET | band gates 38/38 true; carried damage medians rise by level |
| B20 | music per chapter, old voices stop | MET | wood -> mill -> barrow; card voices 0-4; camp voices 0 |
| B21 | replace-or-decline prompt (Pokemon forget-a-move) | PARTIAL | swap card, 4 tiles, Leave, nodes to the bench all work; confirming the chosen replacement discards the skill when the AI suggests Leave (F3) |

**Score: 16 / 21 met, 3 partial (B9, B17, B21), 2 not met (B11, B16).**

## 3. PLAN gates (CAMPAIGN GC.*, plus the PARTY gates that touch the campaign)

| Gate | Verdict | Evidence |
|---|---|---|
| GC.1 Begin Run = L1 | MET | portal E: no screen pushed, L1 index 1, not harness, fresh profile AND all unlocked (steps 3, 8) |
| GC.2 automatic transition | MET | 0 camp frames, index 1 -> 2 -> 3, level_clear / level_start 1/1 each (steps 3, 6) |
| GC.3 exactly-once edge cases | MET | 12/12 (step 5) |
| GC.4 campaign end | PARTIAL | auto-return at +600 ticks, defeat -> Enter -> camp, Quit from combat / page / shop / card -> camp; but CAMPAIGN COMPLETE is shown over the camp (F1) |
| GC.5 carry / restore / reset | MET | all four builds (steps 3, 7, 9), runner 15/15 (step 12) |
| GC.6 memory flat | NOT MET | F4 (steps 17, 18, 20) |
| GC.7 no black screen / loop | MET on production (dev server down) | 0 near-black; auto 3027-3100 ms (shots in flight included) <= 4.0 s; Enter 737-1279 ms <= 1.5 s; max gap 91 ms without a screencast; card never beyond untilTick + 6 s (max 333 ticks at 4x CPU) |
| GC.8 locking | MET | step 8 |
| GC.9 save | MET | step 9 + REAL v0.5.87 (schema 2) and v0.5.150 (schema 3) saves migrated (step 10) |
| GC.10 records | MET | step 14 |
| GC.11 multiplayer | MET | step 11 |
| GC.12 difficulty | MET | (a) 19/19, 13/13, 6/6 (step 12) |
| GC.13 legacy flows | NOT MET | one uncaught page error on ?level=3 (F2); every flow itself works |
| GP.11 carry + save, four builds | MET | steps 3, 7, 9, 10 |
| GP.13 band | PARTIAL | (a)(b)(c) met; (d) carried L1 0/5, L2 1/5, from-2 L2 1/5 (the recorded design conflict; baseline 0/5) |
| GP.14 A17 by real input ("Enter takes it") | NOT MET | F3 (steps 7, 16) |

## 4. Must-fix findings

**F1 — the campaign victory is shown over the camp that already replaced the final level (r4 F1, not fixed).** Final Stag
killed at t402 -> level_clear +40 ms -> run_end victory + run_wiped +70 ms -> app mode camp from the next frame; the
CAMPAIGN COMPLETE card then sits over "THE HEARTH CAMP · NIGHT · BEFORE THE ROAD", "0 GLINT" and an emptied skill bar
(slots 3-4 blank) for 10 s while it counts "Returning to camp in 10 s", and return_to_camp at +600 ticks changes nothing
on screen (captures/gntccampaign5-final-prod-final-150.png; real input: captures/gntccampaign5-flow-prod-victory.png; no
screencast: captures/gntccampaign5-final-prod-noshot.json). The spec: a CAMPAIGN VICTORY screen, THEN an automatic
return. The level-clear cards keep their level behind them; the final one does not.

**F2 — uncaught page error in the production build: "Cannot read properties of undefined (reading 'isReady')" at
three-D_OVNSxA.js:4108:31133.** The code there is WebGLRenderer.compileAsync's poll
`properties.get(material).currentProgram.isReady()`: a material queued for an async compile had its renderer
properties cleared (disposed) before its program was ready; the exception is thrown from a setTimeout and that
compileAsync promise never settles. Seen on the harness boot `?level=3&seed=4&fresh=1` (a Level-3 campaign started on
the first ticked frame while the camp's Level-1 dressings are still compiling) while the machine was loaded
(captures/gntccampaign5-legacy-prod.json). Repro rate 1 of ~76 boots / player paths (step 14; tools
gntccampaign5-isready.mjs, -isready2.mjs). Intermittent, but it is a page error, it breaks GC.13 / GP.16 "0 page errors",
and the same teardown-during-compile window exists on player paths (Level Select right after New Game, Quit to Lobby
during the next level's preload).

**F3 — a full-slot SWAP offer throws the new skill away when the player chooses what it replaces and confirms, whenever
the AI suggestion is "Leave".** The party page opens with focus on the suggested button; moving the Replaces selector
(W/S or a click on a tile) does not move focus to "Take · Replace", and Enter commits the focused button.
Same action on 5 seeds by keyboard: taken on the 3 'take' seeds, `draft_declined` on the 2 'leave' seeds
(captures/gntccampaign5-swapfocus-key.json); by mouse (seed 104): declined; in the campaign flow the chosen Mending Bolt ->
Quiet Hearth swap was declined the same way (captures/gntccampaign5-swap-prod-take.json). The two buttons differ only by
label colour (captures/gntccampaign5-swapfocus-mouse-s104.png). GP.14 says "Enter takes it"; the user's rule is that the
player chooses whether to replace — here the chosen replacement is silently lost. (With A to focus Take, the swap itself
is correct: 4 skills, key 1 = the new skill, the old skill's node on the bench, socket screen chained — step 7.)

**F4 — memory grows with every full-play campaign.** Tick-identical campaigns (sim frozen, 52605 ticks each): camp
textures 91 -> 91 -> 92 -> 93, GL buffers 5856 -> 5894 -> 5894 -> 5902, heap 35.3 -> 36.9 -> 38.2 -> 39.1 MB, and the GL
tracker finds 2 off-scene, undisposed RingGeometry (inner 0.87 / outer 1 / 40 segments) created in campaigns 3-4
(captures/gntccampaign5-leakid-full.json). With ordinary variance between campaigns: camp geometries 1349 -> 1355 -> 1362
-> 1368 -> 1374 (+5..+7 each), GL buffers +20..+25 each, heap +0.3..+1.4 MB each over 6 campaigns, no plateau
(captures/gntccampaign5-memdet-prod.json; portal-started, seed-varying: 1353 -> 1446 geometries, 35.6 -> 41.2 MB over 5,
captures/gntccampaign5-memory-prod.json). The builder's GC.6 method (skip to room 8 each level) is flat (step 18), so the
growth lives in rooms 1-7 of real play, which that probe never runs.

## 5. Advisories (not must-fix)
- A1 Defeat card: "THE CAMPAIGN ENDS … The gods applaud." on a party wipe, drawn over the camp (captures/gntccampaign5-final-prod-defeat-card.png) — r3 / r4 advisory still open.
- A2 Enter pressed while the card reads "Preparing …" is dropped (edge 'enter': 12 presses, advance 'auto' at +229 ticks); the setting-out card shows "Preparing The Sunken Mill… 0/3 · Enter set out" at the same time (step 8).
- A3 394-467 ms rAF gaps on the arrival frame appear only while a CDP screencast runs (91 ms without) — measurement artifact, reported for the record.
- A4 GP.13 (d) not met on carried Levels 1-2 (0/5, 1/5; baseline 0/5 — recorded design conflict); carried Level 3 clears 3/5 (baseline 5/5) while every band gate is true.
- A5 `window.__echoes.party` (PLAN §16.11) does not exist on the running build; cmd('partyView', seat) works.
- A6 `?menu=0&act=2` portal prompt says "Level 1 · The Hollow Wood" but starts Level 2 (harness only, r4 A7).
- A7 After a swap, the toast "1 node from Mending Bolt back on the bench — F auto-fills them" covers the character tabs of the socket screen (captures/gntccampaign5-swap-prodA-take-after-enter.png).
- A8 4x CPU throttle: kill -> control 5956-6381 ms, 3 of 4 advances by ready_timeout, 800 ms gap inside the card (stress row, not a gate).
- A9 Even the skip-path campaigns add +0.2..+0.6 MB heap each (step 18); campaign.transitions() keeps +3 rows per campaign.
- Fixed since r4: A4 (a reload in the first seconds of a new level now resumes in that level, step 19); shot-in-flight clears stay on the killing blow's tick (step 6).

## 6. Own processes
vite preview :4332 (PIDs 66276 npx / 88472 vite) killed at the end; session servers 7910 (53844), 7911 (71072), 7912
(88972) killed after use; builds dist-gntccampaign5 (repo, git-ignored) and scratchpad old087 / old150 dist-g5c5. Tools:
tools/gntccampaign5-*.mjs; captures/gntccampaign5-*.

## 1. Blind benchmark checklist and step log (chronological)

## Step log
- step 0: checkpoint created 2026-09-28T04:51:55+08:00
- step 1: BLIND benchmark checklist written BEFORE any Echoes capture was opened (below).

## 1. Blind benchmark checklist (written from knowledge of the shipped systems, before inspecting Echoes)

Reference behaviours (concrete and testable):

| # | Item | Where it comes from | Test in Echoes |
|---|------|---------------------|----------------|
| B1 | The level-exit / clear trigger fires exactly once; there is no way to double-advance (one exit door, one teleporter charge, one elevator ride). | Hades exit doors, RoR2 teleporter, Gungeon elevator | count `level:clear`-type events and level index steps per clear, incl. same-tick edge cases |
| B2 | A transition title card names where you were and where you go ("Asphodel", "Gungeon Proper", stage name + stage number). | Hades biome title, Gungeon floor banner, RoR2 stage card | read the card text: cleared level name, next level name |
| B3 | The build crosses the transition bit-exact (deck, boons, items, currency). | Slay the Spire act change, Hades, RoR2 | diff skills / sockets / bench / wallet before and after |
| B4 | A respite between chapters: HP restored (StS heals at act end; Dead Cells passage refills flasks; Hades pre-biome fountain). | StS, Dead Cells, Hades | party HP full, downed revived, statuses / cooldowns cleared |
| B5 | Nothing from the old stage survives: enemies, projectiles, pickups, decals, sounds. | RoR2 / Diablo III stage change | entity / projectile / zone / decal / telegraph / numeral / voice counts at first frame of next level = fresh-level baseline |
| B6 | No black screen beyond a short authored fade (well under 1 s); the loading hides behind an animation or card (elevator ride, passage). | Gungeon elevator, Dead Cells passage | max consecutive near-black sampled frames, luma trace |
| B7 | The next chapter starts on its own, or after one confirm; no hub trip. | Hades, Dead Cells, RoR2 | level index advances, camp never shown mid-campaign |
| B8 | Hub return only on death, final victory or an explicit, confirmed abandon. | Hades "Give Up", Dead Cells, StS "Abandon Run" | Quit to Lobby needs a confirm; defeat / victory return to camp |
| B9 | Input during the transition cannot break it: skip works once, pause freezes the timer and resumes it, no double confirm. | cutscene skip conventions, Hades pause | Enter, Esc, Quit, save pressed during the card |
| B10 | Losing focus (alt-tab) during a transition neither stalls it forever nor double-advances it. | PC ports generally | hidden-tab during card |
| B11 | Memory returns to baseline between stages and across repeated runs (Unity scene unload + Resources.UnloadUnusedAssets; Unreal streaming-out GC). | engine practice | geometries / textures / programs / heap-after-GC / DOM / listeners over 3 campaigns: no monotonic growth |
| B12 | No big hitch at the kill, at the card, or at the first frame of the next stage (Dead Cells streams biomes without stutter). | Dead Cells | longest rAF gap across the transition; time from killing blow to first controllable frame |
| B13 | Save & quit mid-run resumes at the same chapter with the same build (StS Save & Quit, Hades room-start resume). | StS, Hades | save, reload, Continue -> level index + build equal |
| B14 | Locked content shows a lock plus the unlock condition and cannot be chosen by any input device. | StS locked characters, Hades locked aspects | locked level: keyboard / mouse / pad cannot start it; text "Clear <prev> to unlock" |
| B15 | Unlocks persist across restarts (profile, not run). | StS, Hades | unlock survives reload |
| B16 | Final victory has its own results screen and then returns you to the hub automatically. | StS victory screen, RoR2 results, Hades escape | final clear -> victory card -> camp |
| B17 | Defeat shows a run summary then returns to the hub. | Hades, Dead Cells, StS | wipe -> defeat card -> camp |
| B18 | Co-op: every player moves to the next stage together; nobody is left on the old stage. | RoR2, Diablo III | 2-client session: guest level index follows host, same tick window |
| B19 | Later stages are harder and scale with the carried build (RoR2 difficulty ramp, StS act 2/3). | RoR2, StS | clear times / HP loss inside the band on L2/L3 for a carried build and for an N-start |
| B20 | Music / ambience change with the chapter and old voices stop (Hades biome themes). | Hades | audio voices at next level baseline, theme id changes |
| B21 | Full-slot new ability = replace-or-decline prompt: all current abilities listed, the one that goes is chosen explicitly, and "keep my loadout" is always available (Pokemon "forget a move?" / "stop learning", Dead Cells swap-on-pickup with the old item not destroyed). | Pokemon, Dead Cells | with 4 skills a skill reward stays a skill SWAP offer; Replace picks one, Decline keeps all 4; replaced skill's nodes to the bench (not lost); never 5 skills; the same across a level transition |

- step 2: shared dev server 5199 DOWN at start (curl 000 on 127.0.0.1 and localhost; nothing listening). Not started (rule). All page probes run on OWN production preview: `npx vite build --outDir dist-gntccampaign5` at HEAD 038ca62 (v0.5.165) + `npx vite preview --outDir dist-gntccampaign5 --port 4332 --strictPort` PID 88472.
- step 3 (flow, prod :4332, captures/gntccampaign5-flow-prod.json): title -> New Game (focus "New Game") -> walk to portal -> E: prompt "E Begin Run · Level 1 · The Hollow Wood  L Levels", no screen pushed (stacksSeen []), campaign L1 index 1, not harness, 219 ms. Build seeded in the L1 shop room (cmd giveSkill/grantNode/socket + partyGrant(2) for the allies — cmd, said here), Stag reached by cmd skipToRoom(8), bossHp(0.02) cmd, finished by held right-click. L1->L2 auto: kill->control 2982 ms, card 180 ticks, max rAF gap 60 ms, screencast 221 frames 0 near-black (min luma 35.1), modes [run] only, idx 1->2. L2->L3 Enter@0.5 s: 1103 ms, card 65 ticks, gap 91 ms, 0 near-black (min 37.9), idx 2->3. Carry: Healer skills/sockets/bench identical L1 preclear -> card -> L2 -> L3 (4 skills, 5 socketed, bench keen/linger/bounce); all three ally builds (slots + 8-socket rows + bench) identical; wallet/purses +12 only (the clear stipend, before the card); card: party 100/150/95/80 of max, downed seat 2 revived, statuses 0, Healer cds [0,0,0,0], ally cds all 0; enemies/eshots/projectiles/zones/azones/skillBolts/hazards/interactables/markers 0 on the card; override null (cleared by the Stag room clear). L3 Stag killed at t2840 but adds lasted to t5381 (45 s; killAllEnemies fallback cmd used) -> see step 5.
- step 4 (final/defeat/quit exits, prod, captures/gntccampaign5-final-prod.json): FINAL: kill t402 -> level_clear t403 +48 ms -> run_end + run_wiped t403 +120 ms -> app mode run->camp at +165 ms -> CAMPAIGN COMPLETE card shown OVER THE CAMP for 10 s (captures/gntccampaign5-final-prod-final-150.png: "THE HEARTH CAMP · NIGHT · BEFORE THE ROAD", "0 GLINT", skill tiles 3-4 empty behind "Returning to camp in 10 s"; same in real-input flow captures/gntccampaign5-flow-prod-victory.png) -> return_to_camp t1003 (+10034 ms) changes nothing visible. r4 must-fix F1 NOT FIXED. DEFEAT: card title "THE CAMPAIGN ENDS", flavour "The gods applaud." on a party wipe (captures/gntccampaign5-final-prod-defeat-card.png), also drawn over camp; Enter -> return_to_camp. QUIT (pause -> Quit to Lobby -> confirm by keys): confirm -> camp 123 ms, run_end abandoned, 0 enemies, voices 0. 0 page errors all legs; 0 near-black frames (min luma 37.2).
- step 5 (edge cases GC.3, prod, captures/gntccampaign5-edge-prod.json; each case own context, ?level=1 harness boot, cmd skipToRoom(8)): 12/12 PASS, 0 page errors. sametick (Stag + boar killed in ONE stepped tick): level_clear x1 @106, level_start x1 (hard bound 'timeout' @706 because the sim was stepped frozen); sametick2 (same on L2->L3): clears @79/@365, starts @290/@545, index 3; wipetick (clear + all 4 HP 0 on one tick): run_end defeat + defeat@92, 0 level_clear; esc: pause on the card froze the sim (tick 167 -> 167 over 7 s), resume -> L2 auto, 1 level_start; enter (12 presses from card tick 12 to ~80): NOT honoured — advance 'auto' at card+229 ticks (see A2 below); mash (40 mixed Enter/Esc/Space/E): 1 advance (skip_enter @+157), stack empty; quit on the card: run_end abandoned, 0 level_start, L2 unlock kept, abandoned=1; save on the card via pause -> Save (slot caption "Level I cleared — next: Level II · The Sunken Mill"), L2 once; apisave x3 + autosave: L2 once; hidden (REAL background tab, no anti-throttle flags, 5.4 s rAF gap): sim held at tick 58 while hidden, resumed -> L2 auto once; hiddenbg: once; ekey (E/Space/1/2/right-click on the card): 0 gameplay actions, once.
- step 6 (frames GC.7, prod :4332; ?level=1&seed=S harness boot, cmd skipToRoom(8) + killBoss + killAllEnemies at a known tick; in-page rAF log + CDP screencast every 3rd frame ~50 ms, luma via sharp):
  | set | transitions | kill->control ms | card ticks | max rAF gap ms | near-black frames (min luma) | camp frames | clear/start per clear |
  |---|---|---|---|---|---|---|---|
  | auto + screencast (captures/gntccampaign5-frames-prod-auto.log) | 6 | 3028-3081 | 180-181 | 461 (4 of 6 at +3.05-3.14 s = the arrival frame, "combat->combat") | 0 (36.9) | 0 | 1/1 x6 |
  | auto, NO screencast (…-prod-noshot) | 8 | 3027-3055 | 180-181 | 91 | n/a | 0 | 1/1 x8 |
  | Enter @0.5 s + screencast (…-prod-enter) | 6 | 737-1279 | 48-? | 109 | 0 (37.6) | 0 | 1/1 x6 |
  | enemy shot IN FLIGHT at the blow (…-prod-inflight) | 6 | 3030-3100 (clear 1 tick after the kill) | 180 | 467 (arrival, screencast) | 0 (37.2) | 0 | 1/1 x6 |
  | 4x CPU throttle (…-prod-cpu4, stress row) | 4 | 5956-6381 | 269-333 (3 of 4 'ready_timeout') | 800 (inside the card) | 0 (34.3) | 0 | 1/1 x4 |
  Arrival gaps of 394-467 ms appear only while the CDP screencast runs (91 ms max without) -> measurement artifact, advisory. Voices: combat 2-10, card max 2-4, card min 0.
- step 7 (user rule — full-slot skill rewards inside the campaign; tools/gntccampaign5-swap.mjs, prod; Healer seeded to 4 skills + sockets by cmd in L1, L1 cleared by cmd, AUTOMATIC L1->L2, L2 room 1 finished by cmd killAllEnemies):
  - L2 room-1 reward = `reward_offer {reward:'skill', swap:true, freeSkillSlots:0, poolSize:13}` (never a node); party page "SKILL SLOTS FULL · CHOOSE ONE TO REPLACE, OR LEAVE", Healer card "NEW SKILL — SWAP", Replaces selector, "Take · Replace" / "Leave" (captures/gntccampaign5-swap-prod-take-offer.png). Selector by real keys: S 3->0, S 0->1, W 1->0.
  - With the suggestion "Leave" the page opens focused on Leave; Enter after moving the selector COMMITTED LEAVE (skills unchanged, captures/gntccampaign5-swap-prod-take-selected.png shows "suggested: Leave") — see advisory.
  - A (focus 1->0 "Take · Replace") + Enter: Mending Bolt (slot 1, held Keen) replaced by Quiet Hearth: skills [quiet_hearth, swift_mend, nova_bloom, sanctuary] (4), command bar key 1 = quiet_hearth, Keen on the bench (bench split, sharpen, keen — 0 lost), socket screen chained with "1 node from Mending Bolt back on the bench — F auto-fills them" (captures/gntccampaign5-swap-prodA-take-after-enter.png). X: Healer build byte-identical (captures/gntccampaign5-swap-prodX-leave.json same:true, draft_declined).
  - Allies (AI-held, Suggested): `skill_swapped {seat 1/2/3, by:'ai'}` (e.g. tank taunting_roar replaced ground_crack), 4 skills each.
  - The swapped / kept builds (Healer + 3 allies, slots + sockets + bench) carried L2->L3 identical in all three runs (healerSame true, alliesSame true).
- step 8 (locks GC.8, prod, captures/gntccampaign5-locks-prod.json, each leg a fresh browser context): fresh profile unlocked [1]; map table ring "E Choose a level" -> `levels` screen: L1 focusable, L2/L3 aria-disabled with lock glyph "Clear The Hollow Wood to unlock" / "Clear The Sunken Mill to unlock", dashed plates (captures/gntccampaign5-locks-prod-click-locked.png). Keyboard (→ x3, Tab x2, ↓, ←, D, End): focus never left Level 1. Mouse click L2 + double-click L3: no run, line "The Sunken Mill is locked — Clear The Hollow Wood to unlock". Mocked pad D-pad right x3: focus stays L1; pad A (positive control) starts L1 (not harness). campaign.choose(2/3) + cmd campChoose(2/3): {ok:false, reason:'locked'}. L1 cleared in a portal campaign -> unlocked [1,2] + profile acts [1,2]; reload -> still [1,2]; L key at the portal -> L2 selectable, L3 locked; Enter on L2 -> "SETTING OUT LEVEL II" card (starter +2 skills, 19 nodes, 19/32, 34 Glint; allies 10/32, 34) -> L2 -> L3 (startLevel 2) -> CAMPAIGN COMPLETE "LEVELS CLEARED 2 / 2" -> camp. A mid-L2 save imported into a FRESH profile: load() {ok:false, error:'locked'}; UI Load -> confirm -> toast "That save is in a level you haven't unlocked yet — Clear The Hollow Wood to unlock", run not started. 0 page errors.
- step 9 (save / Continue GC.9, prod, captures/gntccampaign5-save-prod.json, real keys for pause/save/title): portal campaign, build seeded by cmd in the L1 shop (+ partyGrant(2) for the allies), L1 cleared by cmd -> auto-2 = L1 room 8 phase transit (the level_transit autosave) ; pause -> Save Game -> Slot 1 in L2 room 1; cmd skipToRoom(4); reload -> title focuses "Continue — Level II · The Sunken Mill · Room 4 · just now · Autosave" -> Enter -> L2 room 4 with Healer skills/sockets/bench/wallet AND all three ally builds equal (true); pause -> Load Game -> Slot 1 -> L2 room 1 equal to the saved build incl. allies (true); L2 cleared -> reload on the card -> Continue "Level II cleared · just now · Autosave" -> the card resumes (98 of 180 ticks left) with the build equal -> Level 3 index 3, level_start x1. 0 page errors.
- step 10 (REAL old saves, tools/gntccampaign5-migrate.mjs, captures/gntccampaign5-migrate.json): v0.5.87 (git archive ae07ba9, schema 2) act run saved mid-Act II room 3 and v0.5.150 (git archive 2a6139b, schema 3) portal campaign saved in L2 room 3 — both built in the scratchpad and served by `node server/index.mjs --static` on own ports 7911 / 7912 (PIDs 71072 / 88972, killed). Imported into v0.5.165 (fresh profile): both list as schema 4; load refused while L2 locked (run stays idle); after a real L1 clear (unlock [1,2]) both load: campaign mode, L2 room 3, skills/bench/wallet kept (true x4), schema-2 run -> startLevel 2 index 1 (not harness), allies on their kits + ONE party_catchup (bench 14, purse 58, auto-filled at the next non-combat point = the card); played on: L2 clear -> automatic Level 3. 0 page errors.
- step 11 (2-client GC.11, prod + own session server `node server/index.mjs --port 7910` PID 53844 (killed), captures/gntccampaign5-net-prod.json / -prod-cond.json): guest mutators refused (startCampaign false, campChoose(3)/choose(2) locked, abandonRun/campaignAdvance null, host unchanged); guest pause = Resume / Settings / Leave Session; host pause = Resume / Settings / Save / Quit to Lobby / Leave. Host E at the portal -> both L1. L1 clear (cmd) -> guest card +106 ms after the host's, guest L2 +273 ms, 0 guest camp samples, guest index 1->2; at L2 level/index/phase/room/layout 4/Healer build/ally slots+purses/HP equal; 0 desyncs over 56 hash checks. Under lat60/jit10/loss2: card +414 ms, L2 +551 ms, all equal, 0 desyncs / 51. Host Quit to Lobby -> both camp, session up (inSession true). 0 page errors.
- step 12 (difficulty GC.12 / GP.13, Node: read-only tools/gntCAMPAIGN-camprun.mjs --from 1|2|3 --seeds 1-5 --out captures/gntccampaign5-camprun-fromN.json, compared by tools/gntccampaign5-bandcmp.mjs with the read-only v0.5.150 baseline captures/gntPARTY-baseline-fromN.json): (a) runner band gates 19/19, 13/13, 6/6 true. (b) carried L1 dmg x1.18 ttc x1.09; L2 x1.15 / x1.13; L3 x0.75 (edge) / x0.99; from-2 L2 x0.91 / x1.16, L3 x0.80 / x1.00; from-3 L3 x0.81 / x1.02 — all inside x0.75-1.35. (c) L3 Stag 2819 / 2950 / 2888 vs base 2824 / 2885 / 2663 true. (d) >=1 down on >=2 of 5 seeds: carried L1 0/5, L2 1/5, from-2 L2 1/5 NOT met (baseline 0/5 there — the recorded design conflict), L3 5/5, 5/5, 4/5 met. Clears carried 5/5 · 5/5 · 3/5 (L3 defeats seeds 1, 4), from L2 5/5 · 4/5, from L3 5/5. Runner carry diff (GC.5 sim half) at all 15 transitions: skills/sockets/bench/Glint carried, HP restored, none downed, statuses cleared, cooldowns reset, only the 4 party entities on the card, leftovers [] (0 bad rows).
- step 13 (L3 mop-up after the Stag, tools/gntccampaign5-mopup.mjs, prod, ?level=3 seeds 81-83, cmd killBoss only, then AI + held right-click, keep-alive cmd setHp): seed 81/83 no adds -> clear 1 tick after; seed 82 three adds alive -> cleared 720 ticks (12 s) later by play; no stall. (The flow's 42 s L3 mop-up was the weak Healer basic + two downed allies; not a trigger defect.)
- step 14 (legacy + records GC.10 / GC.13, prod, captures/gntccampaign5-legacy-prod.json): Records screen (captures/gntccampaign5-legacy-prod-records.png): "I → III · Campaign · Campaign complete · 24 rooms", "Abandoned", Lifetime Campaigns completed 1 of 2, Abandoned 1, Furthest level III, Fastest campaign 0:13, Level I/II/III cleared x1, Levels open I·II·III. ?run=1: mode single, harness, Stag -> VICTORY -> Enter -> camp (level_clear, run_end victory, return_to_camp). cmd startRun({act:2}): single run at L2 with the starter grant. ?scene=arena&room=kill_all: plays, 0 errors. ?menu=0&act=2 + portal E: prompt says "Begin Run · Level 1 · The Hollow Wood" but starts a Level-2 campaign (harness-only, r4 A7 unchanged). **?level=3&seed=4&fresh=1: ONE uncaught page error "Cannot read properties of undefined (reading 'isReady') at three-D_OVNSxA.js:4108:31133"** = three.js WebGLRenderer.compileAsync's poll `J.get(material).currentProgram.isReady()` on a material whose renderer properties were already cleared (disposed while its async compile was pending) — thrown from a setTimeout, the compileAsync promise never settles. Occurred while the machine was loaded (memory probe + Node camprun + this probe concurrently). Repro attempts (tools/gntccampaign5-isready.mjs / -isready2.mjs): 0 of 9 plain boots (?level=1/2/3), 0 of 5 at 4x CPU, 0 of 8 exact legacy boot, 0 of 18 + 20 + 10 under parallel GPU/CPU load, 0 of 6 player paths (Level Select -> III right after New Game; Begin Run -> Quit to Lobby x3) -> 1 of ~76: intermittent race, see F2.
- step 15 (Quit to Lobby from a run page, prod, captures/gntccampaign5-quitpage.json): from the L2 party (reward) page and the L2 shop: Esc -> pause (sim frozen: tick 972 -> 972 over 1 s), items Resume / Settings / Save / Load / Quit to Lobby "Abandon this campaign — back to camp" / Save & Quit / Quit -> confirm -> camp, run_end abandoned + return_to_camp quit on the same tick, 0 enemies, voices 0, dressings [1], clean camp frame (captures/gntccampaign5-quitpage-reward-camp.png). Level-clear card (captures/gntccampaign5-flow-prod-t1-card.jpg): "LEVEL I CLEARED · THE HOLLOW WOOD", "NEXT Level II · The Sunken Mill", skills 4/4, sockets 5/32, bench 3, Glint 84, "restored to full", the four builds, progress bar, "The Sunken Mill is ready · setting out in 2 s", "Enter set out now". Music theme wood -> mill -> barrow across the flow; card voices 1-3, dressings on the L1 card [3 (the room behind the card), 4 (preload)] -> L2 [4,5,6] -> L3 [7,8,9].
- step 16 (swap offer — what Enter commits after the player picks the slot to replace; tools/gntccampaign5-swapfocus.mjs, prod, ?level=2 seeds 101-105, L2 room 1 by cmd killAllEnemies, then REAL input only): keyboard W/S to slot 2 then Enter: suggest 'take' seeds 102/103/105 -> draft_taken swap (Swift Mend replaced, its 5 nodes released to the bench); suggest 'leave' seeds 101/104 -> draft_declined, the new skill discarded (captures/gntccampaign5-swapfocus-key.json). Mouse click on the Swift Mend tile then Enter (seed 104, suggest leave): focus stays on Leave -> draft_declined (captures/gntccampaign5-swapfocus-mouse-s104.png: tile 2 shows "replace", line "Bell Toll replaces Swift Mend — Swift Mend's 5 nodes go to the bench · suggested: Leave", both buttons orange-bordered, only the label colour differs). Pad D-pad down + A (seed 101, suggest take): taken. => the SAME player action (choose the replaced skill, confirm) takes the skill or throws it away depending on the hidden AI suggestion (2 of 5 seeds lost it). GP.14 "Enter takes it" not met when the suggestion is Leave -> F3.
- step 17 (MEMORY GC.6, prod, full play of every room by the autopilot, sim stepped 15 ticks per rendered frame, keep-alive assist; samples frozen at the first controllable frame of each level and in camp; heap after CDP HeapProfiler.collectGarbage x2):
  A) 5 campaigns started by portal E, run seeds varying (captures/gntccampaign5-memory-prod.json): camp geometries 1353 / 1383 / 1418 / 1436 / 1446 (quit 1446), GL buffers (driver hook) 5904 / 6023 / 6163 / 6235 / 6275, heap 35.6 / 37.6 / 39.3 / 40.1 / 41.2 MB (quit 41.7), textures 90-92, programs 92, busListeners 270 flat, entities 4 in camp, pools 0 except numeralCapacity 12, voices 0 in camp, dressings [1,2,3] in camp / only the current level's at every level sample. Debug logs bounded (events 200, cueLog 600, autosaveLog 20); campaign.transitions() +3 rows (~2.7 KB) per campaign.
  B) 6 campaigns from save.resetToFresh({seed:7}) + cmd startCampaign (L1 layout 2 and L2 layout 4 every time; L3 layout 7/8/9 varies) (captures/gntccampaign5-memdet-prod.json):
  | sample | c1 | c2 | c3 | c4 | c5 | c6 | quit |
  |---|---|---|---|---|---|---|---|
  | camp gl.geometries | 1333 | 1349 | 1355 | 1362 | 1368 | 1374 | 1379 |
  | camp GL buffers (hook) | 5832 | 5896 | 5920 | 5945 | 5966 | 5990 | 6010 |
  | camp textures / programs | 91/92 | 91/92 | 91/92 | 91/92 | 92/92 | 92/92 | 92/92 |
  | camp heap after GC MB | 35.4 | 37.5 | 38.9 | 40.3 | 40.9 | 41.2 | 41.6 |
  | L1 (layout 2) geometries | 1081 | 1333 | 1349 | 1355 | 1362 | 1368 | — |
  | L1 heap MB | 23.8 | 35.6 | 37.9 | 39.4 | 40.7 | 41.4 | — |
  | camp DOM | 1387 | 1352 | 1355 | 1351 | 1350 | 1348 | 1233 |
  | busListeners / entities (camp) | 270/4 | 270/4 | 270/4 | 270/4 | 270/4 | 270/4 | 270/4 |
  Geometries +5..+7 and GL buffers +20..+25 per campaign after the warm-up, every campaign, never returning (c2 -> c6: +25 geometries, +94 buffers); heap +0.3..+1.4 MB per campaign (c1 -> c6 +5.8 MB, under the ±8 MB bar but still rising). GC.6 "same level ± 2 geometries in every campaign" NOT met (camp c2 1349 vs c6 1374).
- step 18 (leak localisation, tools/gntccampaign5-leakid.mjs --mode fast, prod): the builder's GC.6 method (resetToFresh seed 7 + skipToRoom(8) + kill per level, no rooms 1-7 played) is FLAT: camp geometries 1243 / GL buffers 5483 / textures 80 / programs 92 / DOM 947 identical over 6 campaigns, glOffScene 0, census diff {} (heap 26.3 -> 28.1 MB, +0.2-0.6 per campaign). The growth in step 17 therefore comes from full play of rooms 1-7 (rewards / party pages / shops / spoils / class-skill VFX / rigs), which the builder's probe never exercises. Full-mode localisation running.
- step 19 (reload early in a new level, tools/gntccampaign5-earlyreload.mjs, prod): reload 5 s after arriving in L2 (no L2 autosave listed yet) -> title "Continue — Level II · The Sunken Mill · Room 1 · just now · Autosave" -> L2 room 1 (r4 advisory A4 fixed: the held safe point is written on unload); 25 s -> same. 0 page errors.
- step 20 (leak localisation, full play, BIT-IDENTICAL campaigns: tools/gntccampaign5-leakid.mjs --mode full, sim frozen from resetToFresh(seed 7) to camp, 52605 stepped ticks in every campaign, captures/gntccampaign5-leakid-full.json): camp geometries 1339 / 1350 / 1350 / 1352, textures 91 / 91 / 92 / 93, GL buffers 5856 / 5894 / 5894 / 5902, heap 35.3 / 36.9 / 38.2 / 39.1 MB. GL tracker armed in camp after campaign 2, read after campaign 4: 451 geometries created since and alive, 449 in the scene (the camp's rebuilt Level-1 dressings, expected), **2 OFF-SCENE and undisposed: RingGeometry innerRadius 0.87 / outerRadius 1 / 40 segments (82 verts)** — retained across the level teardown / camp return. Textures +1 per campaign and heap +0.9..+1.6 MB per campaign even when the campaigns are tick-identical. With ordinary run variance (step 17) the same growth shows as +5..+7 geometries and +20..+25 GL buffers per campaign with no plateau after 5-6 campaigns -> F4.
- step 21 (exits without a screencast, captures/gntccampaign5-final-prod-noshot.json): final kill -> CAMPAIGN COMPLETE max rAF gap 61 ms (0 gaps > 100 ms) but still mode camp at +70 ms (F1 reconfirmed); quit max gap 48 ms. The 224-424 ms camp gaps of step 4 were screencast-inflated.
