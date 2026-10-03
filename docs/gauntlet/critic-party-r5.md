STATUS: COMPLETE
VERDICT: FAIL - 9 must-fix: F1 Enter / pad A on a Leave-suggested full-slot swap card discards the player's marked replacement on every seat (16/16 dev+prod; mouse takes 12/12); F2 ally swaps by real input are re-sorted so the new skill lands in another key than the card promised (9/36 in the marked slot); F3 the party page re-centres 26-85 px on every character switch; F4 Swordsman shelf ribbons overlap + shop header off-screen at 1024x576/1600x900, Archer socket row name elided; F5 MP owner labels overprint character names; F6 inert socket verdict prints 'all undefined allies already hit'; F7 GP.5 Tank aimed-at share x1.02 (< x1.3); F8 GP.8 17 idle equipped actives; F9 GP.13(d) downs L1 0/5, L2 1/5. Met: pools/numbers/grids 440/440 page+Node, 4-cap on every path, 48/48 full-slot skill rewards are swaps, 24/24 class casts + real-key guest casts with cues <= 53 ms, MP ownership / 30 s timeout / replication / rejoin, persistence incl. v0.5.150 files, modes, regression (smoke, core loop, goldens 9/9). Benchmark 9 met / 9 partial / 0 not met of 18.

# Critic PARTY r5 — per-character builds

Critic: gntcparty5 (fresh context), started 2026-09-28.

## Step log
- S0 checkpoint created.

## S1 BLIND BENCHMARK CHECKLIST (written before inspecting any Echoes capture)

Systems: Across the Obelisk (AtO), Darkest Dungeon (DD), Children of Morta (CoM), Diablo III (D3) / Path of Exile (PoE), Hades. Each item is a concrete, testable behaviour of the shipped games, phrased as a test for Echoes.

| # | Benchmark behaviour (shipped system) | Echoes test |
|---|---|---|
| B1 | AtO: after every combat each of the 4 heroes gets its OWN reward pick; the card shows whose deck it enters (hero portrait + name on the reward screen). | Every combat-room reward page has one card per character, each visibly labelled with its character (name + portrait/glyph). |
| B2 | AtO / DD: switching the viewed hero in reward/shop/loadout screens is one click on a portrait or one bumper press; the currently viewed hero is unmistakable. | Any tab -> any tab in <= 2 inputs by key, 1 click by mouse, <= 2 bumpers by pad; viewed tab visually raised. |
| B3 | DD: a hero equips exactly 4 skills from a class pool; the equip UI shows the current 4 and the candidate; you can never exceed 4. | Every seat <= 4 skills on every path; swap UI names the skill being replaced. |
| B4 | Hades: a boon for an occupied slot shows "Replaces <old boon>" with the old icon on the card; the player can decline. | Full-slot skill reward = swap card naming the replaced skill, Leave keeps the loadout byte-identical. |
| B5 | DD / D3: skill tooltips carry concrete numbers (damage, cooldown, range, status duration) that match the in-game effect. | Class skill cards show numbers; measured sim effect equals them. |
| B6 | D3 runes / Hades boons: the same modifier reads differently per skill and the card text states the per-skill effect. | Class node card on a given skill states its reinterpreted effect for that skill; measured effect matches. |
| B7 | PoE support gems: any gem goes in any socket; an unsupported pairing is flagged (greyed / "does not support") rather than silently useless. | Any node in any of 8 sockets (no rarity caps); grey cells flagged on the socket screen and contribute 0. |
| B8 | D3 / PoE / CoM: each class has a distinct audiovisual signature; every cast gives visible + audible feedback within ~100 ms. | Every class skill cast shows a VFX in a box around the caster and plays its own cue <= 150 ms after the press. |
| B9 | DD / D3 / CoM class role identity: the tank protects and controls (taunt/guard/shields), the melee striker fights up close with combo payoffs, the ranged class stays at distance and kites. | Taunt redirects, shield share, Swordsman cast distance <= 1.2 u with combo usage, Archer >= 2.5 u and >= 2x the Swordsman. |
| B10 | CoM / AtO: AI or inactive companions use their whole kit; no equipped ability sits unused for a whole fight. | Every equipped active of an AI ally is cast in the rooms it was equipped (casts per skill reported). |
| B11 | AtO co-op: each player decides only for their own heroes; others see who is still deciding; the game advances with a ready/timer so nobody waits forever. | Guest can change only its seat; a stalled picker is auto-picked at a visible deadline with notice. |
| B12 | AtO / CoM: builds persist across acts/levels and across save/continue exactly. | Four builds identical across level transitions and save round trips; old saves migrate. |
| B13 | Hades / AtO: time-to-decide for a reward is a single confirm when the player accepts the suggestion; the reward flow for 4 characters is not 4x slower than for one. | Suggested mode = 1 input per page; party page interactive <= 350 ms. |
| B14 | Console-quality UI (AtO/Hades on consoles): full pad navigation, bumpers switch characters, D-pad moves selection, no mouse needed. | Mocked gamepad reaches every tab, cycles Replaces, buys, sockets. |
| B15 | Shipped UI at any supported resolution: no overlapping buttons, no clipped labels, no scrollbars at 16:9 sizes from 1024x576 to 2560x1440. | Layout audit at 1024x576 and 2560x1440 on party page / shop / socket screen. |
| B16 | AtO shop: purchases are per hero and the shop states which hero a purchase goes to and what it costs from which purse. | Shop shelf cards carry an owner band + price; purse shown per character. |
| B17 | Co-op fairness (AtO / CoM): replicated builds are identical on every client; a reconnect keeps your character's build. | Guest/host state hash equal after build ops; drop-in / rejoin keep the build. |
| B18 | Difficulty scaling in party roguelikes (AtO / Hades): stronger builds meet scaled encounters so levels still threaten. | Band gates per level with four built characters. |
- S2 Node re-measurement (dev tree v0.5.165, own runs, outputs captures/gntcparty5-*.txt): oracle `gntPARTYD-grid --verify-node` PASS 440 cells / 0 mismatches; `gntPARTY-sim --base150 <git archive 2a6139b = v0.5.150>` 67/67; `gntM2-goldens` 9/9 match; `gntPARTY-healer --base150` 28/28; `gntPARTY-cells` 72/72; `gntM2-nodetrip` ALL 9 ROUND TRIPS OK. Page scout (captures/gntcparty5-scout.json): `cmd('partyPools')` pools = Tank 8 skills / 18 nodes, Swordsman 8 / 18, Archer 8 / 19 (= §25.3 shared lists + 6 class nodes each, checked name by name); `cmd('partyView',1)` = Heavy Slam 34/5 s/3/40°/1.0, Brutal Cleave 16/4/6/80°/0.95, Ground Crack 10/8/0.9/2.6, Whirling Guard 20/9/5/1.3 (= §25.2). **`window.__echoes.party` is undefined** (PLAN §16.11 promises `__echoes.party.state()/view/pools/verdict/aiLog/oracle`; TESTING PARTY probe 1 reads `__echoes.party.state()`).
- S3 Node campaign re-measurement. (a) builder tool `gntPARTY-campaign --seeds 1-3 --base150` (captures/gntcparty5-campaign.txt): 26/28 — FAIL GP.5 attack starts aimed at the Tank 29.3 % (408/1393) vs v0.5.150 28.6 % (x1.02, gate >= 1.3); FAIL GP.8 literal 17 idle equipped actives (v0.5.150 0); PASS taunt redirect 131/179, Tank shields 18.0 %, Swordsman 0.81 u, Crescent combo 191/191, Archer 3.34 u, GP.7 supply, GP.11 carry 6 cards. Outcomes seed 1 DEFEAT (Level 3), seeds 2-3 victory. (b) OWN runner `tools/gntcparty5-aicasts.mjs --seeds 1-3` (captures/gntcparty5-aicasts-from1.json, .txt): same outcomes (seed 1 defeat in Level 3; 7 downs), idle equipped actives 17 (11/2/4 per seed) — worst: Swordsman in L1 defend room 2 (45 s) cast ONLY Lunge Strike x3 while Flurry, Crescent Finisher and Blade Storm stayed idle; per level x seat x skill table in S3 below. Hostile-target time on the Tank 29 / 33 / 31 % (seeds 1/2/3). Median distance to the nearest hostile at cast: Tank 0.89-0.97 u, Swordsman 0.68-0.76 u, Archer 2.93-3.21 u.
- S3b `gntPARTY-band --seeds 1-5` (captures/gntcparty5-band.txt, captures/gntPARTY-band-gntcparty5.json): 15/18 — (a) band gates true from L1/L2/L3; (b) x1.18/1.15/0.75 carried, x0.91/0.80 from L2, x0.81 from L3 (L3 carried damage exactly at the x0.75 floor); (c) Stag x1.00/1.02/1.08; **(d) FAIL L1 carried 0/5 seeds with a down, L2 carried 1/5, L2 from-L2 1/5**. Carried L3 cleared 3 of 5 seeds; from-L2 L3 4/5; from-L3 5/5.

### S3 table — AI casts per equipped skill (own runner, seeds 1-3 summed; passives pulse, never cast)

| Level | Seat | Skill | rooms equipped | minutes | casts | casts/min | rooms with 0 casts |
|---|---|---|---|---|---|---|---|
| L1 | Tank | brutal_cleave | 9 | 3.8 | 4 | 1.0 | 6 |
| L1 | Tank | ground_crack | 3 | 0.6 | 4 | 6.3 | 0 |
| L1 | Tank | heavy_slam | 21 | 9.4 | 39 | 4.1 | 5 |
| L1 | Tank | iron_stance | 11 | 5.7 | 0 | 0.0 | 11 |
| L1 | Tank | shield_wall | 8 | 3.7 | 23 | 6.2 | 0 |
| L1 | Tank | shoulder_charge | 7 | 3.4 | 24 | 7.0 | 0 |
| L1 | Tank | taunting_roar | 6 | 2.4 | 12 | 5.1 | 0 |
| L1 | Tank | whirling_guard | 19 | 8.6 | 36 | 4.2 | 2 |
| L1 | Swordsman | blade_storm | 14 | 6.5 | 11 | 1.7 | 8 |
| L1 | Swordsman | caltrops | 3 | 0.6 | 4 | 6.3 | 0 |
| L1 | Swordsman | crescent_finisher | 6 | 3.0 | 7 | 2.3 | 4 |
| L1 | Swordsman | flurry | 21 | 9.4 | 45 | 4.8 | 7 |
| L1 | Swordsman | fox_step | 6 | 2.9 | 26 | 9.1 | 0 |
| L1 | Swordsman | lunge_strike | 21 | 9.4 | 65 | 6.9 | 1 |
| L1 | Swordsman | riposte | 13 | 5.9 | 32 | 5.4 | 0 |
| L1 | Archer | detonating_charge | 13 | 6.2 | 44 | 7.1 | 0 |
| L1 | Archer | kestrel_watch | 4 | 2.0 | 0 | 0.0 | 4 |
| L1 | Archer | piercing_shot | 21 | 9.4 | 154 | 16.3 | 0 |
| L1 | Archer | pinning_arrow | 12 | 6.0 | 44 | 7.4 | 0 |
| L1 | Archer | rain_of_arrows | 6 | 2.4 | 14 | 5.9 | 0 |
| L1 | Archer | sundering_nova | 3 | 0.6 | 0 | 0.0 | 3 |
| L1 | Archer | vault_shot | 4 | 1.7 | 9 | 5.3 | 0 |
| L1 | Archer | volley | 21 | 9.4 | 111 | 11.8 | 0 |
| L2 | Tank | heavy_slam | 21 | 13.9 | 60 | 4.3 | 3 |
| L2 | Tank | iron_stance | 1 | 0.5 | 0 | 0.0 | 1 |
| L2 | Tank | shield_wall | 14 | 9.5 | 72 | 7.6 | 0 |
| L2 | Tank | shoulder_charge | 20 | 13.4 | 100 | 7.5 | 0 |
| L2 | Tank | taunting_roar | 14 | 9.2 | 37 | 4.0 | 0 |
| L2 | Tank | whirling_guard | 14 | 9.1 | 35 | 3.8 | 1 |
| L2 | Swordsman | blade_storm | 7 | 4.4 | 17 | 3.9 | 2 |
| L2 | Swordsman | crescent_finisher | 13 | 9.1 | 38 | 4.2 | 1 |
| L2 | Swordsman | flurry | 21 | 13.9 | 96 | 6.9 | 1 |
| L2 | Swordsman | fox_step | 7 | 4.8 | 45 | 9.3 | 0 |
| L2 | Swordsman | lunge_strike | 21 | 13.9 | 114 | 8.2 | 0 |
| L2 | Swordsman | riposte | 15 | 9.5 | 42 | 4.4 | 3 |
| L2 | Archer | piercing_shot | 21 | 13.9 | 272 | 19.5 | 0 |
| L2 | Archer | pinning_arrow | 14 | 9.1 | 79 | 8.7 | 0 |
| L2 | Archer | rain_of_arrows | 9 | 5.5 | 31 | 5.6 | 0 |
| L2 | Archer | vault_shot | 19 | 13.2 | 60 | 4.5 | 0 |
| L2 | Archer | volley | 21 | 13.9 | 184 | 13.2 | 0 |
| L3 | Tank | heavy_slam | 20 | 17.7 | 200 | 11.3 | 0 |
| L3 | Tank | shield_wall | 17 | 15.7 | 116 | 7.4 | 0 |
| L3 | Tank | shoulder_charge | 20 | 17.7 | 146 | 8.2 | 0 |
| L3 | Tank | taunting_roar | 17 | 15.8 | 89 | 5.6 | 0 |
| L3 | Tank | whirling_guard | 6 | 3.9 | 23 | 6.0 | 0 |
| L3 | Swordsman | blade_storm | 1 | 0.5 | 4 | 7.6 | 0 |
| L3 | Swordsman | crescent_finisher | 17 | 15.7 | 141 | 9.0 | 0 |
| L3 | Swordsman | flurry | 20 | 17.7 | 311 | 17.6 | 0 |
| L3 | Swordsman | fox_step | 13 | 11.7 | 144 | 12.3 | 0 |
| L3 | Swordsman | lunge_strike | 20 | 17.7 | 280 | 15.8 | 0 |
| L3 | Swordsman | riposte | 9 | 7.4 | 57 | 7.7 | 0 |
| L3 | Archer | piercing_shot | 20 | 17.7 | 350 | 19.8 | 0 |
| L3 | Archer | pinning_arrow | 19 | 17.3 | 158 | 9.1 | 0 |
| L3 | Archer | rain_of_arrows | 1 | 0.4 | 2 | 5.2 | 0 |
| L3 | Archer | vault_shot | 20 | 17.7 | 118 | 6.7 | 0 |
| L3 | Archer | volley | 20 | 17.7 | 234 | 13.2 | 0 |
- S4 OWN multiplayer probe `tools/gntcparty5-mp.mjs` (server 7960 own PID, dev server pages, host seed 7 + guest on seat 2 Swordsman; captures/gntcparty5-mp.json/.txt, gntcparty5-mp-*.png): 15/16 — guest keys 1-4 (flurry, lunge_strike, blade_storm, caltrops) each -> host `ally_cast` seat 2 with an inputSeq, guest cue `ally_cast_sword` in its cueLog; owners on the host [human, ai, human, ai]; deadline armed = opened + 1800 ticks; guest real keys S/X on the Tank tab change nothing on the host; host real keys on the guest's tab change nothing; host S on the AI-held Archer card moves its Replaces 3 -> 0; guest S + Enter on its own swap card -> Riposte lands in slot 0 as chosen (before [flurry,lunge_strike,blade_storm,caltrops] after [riposte,...]); builds host == guest after the commit; a stalled guest -> party_autopick 1800 ticks after open (wall 30154 ms) + "Time's up — the Swordsman's reward was picked (taken)" toast on both; builds equal after. The rejoin leg did not run (page.reload navigation timeout on the loaded dev server — harness, not scored).
- S4b **NET owner labels overlap the character names on the party page (host and guest, 1280x720)**: captures/gntcparty5-mp-host-page.png ("Healer" x "you", "Swordsman" x "player"), captures/gntcparty5-mp-guest-page-own.png + zoom captures/gntcparty5-mp-guest-tabs-zoom.png ("Heal[player]", "Swordsm[you]", "Archer|AI" touching). Single-player tabs have no owner label and are clean.
- S5 OWN swap-offer probe by REAL input `tools/gntcparty5-swapkeys.mjs` (seeds 1-6 x seats 0-3 x keys/mouse = 48 room-1 swap cards, all AI-suggested Take; captures/gntcparty5-swapkeys.json, gntcparty5-swap-*-mid.png): the replaced skill = the one the player marked in 36/36 ally cases and 12/12 Healer cases (Healer: S -> the Dewfall tile marked, Dewfall replaced; click tile 1 -> Mending Bolt replaced); **but for the allies the new skill lands in the marked slot in only 9/36 cases — 27/36 the loadout is re-sorted at the commit** (e.g. seed 3 Tank: the player marks slot 4 Whirling Guard for Shield Wall, the card says "Shield Wall replaces ..." at key 4; after the commit the Tank is [shield_wall, heavy_slam, brutal_cleave, ground_crack] — Shield Wall in slot 1 and every other skill shifted one key; seed 1 Archer: Pinning Arrow marked into slot 1 (Piercing Shot) ends in slot 2 [volley, pinning_arrow, ...]). GP.2 "Take with each replace target 0-3 -> the new skill in that slot" not met on the real-input path. Side note: `run.party.cards[0].replace` stays at the suggestion (2) after the Healer's S moves the mark to 3 (the real choice lives in run.reward.replace) — the card-0 mirror is stale.
- S5b OWN leave-suggested swap probe `tools/gntcparty5-swapleave.mjs` (Healer given Mending Tide + Kindred Shield; captures/gntcparty5-swapleave.json, gntcparty5-swapleave-*-mid.png): **Healer swap card whose suggestion is Leave: S moves the Replaces mark (tile 1 Mending Bolt shows the ✕ "replace"), Enter -> the card is LEFT and the new skill discarded in 5/5 keyboard runs (seeds 1,2,3 room 1; seeds 2,4 later rooms)**; the same card by mouse (click tile 2, click "Take · Replace") takes it 5/5. The screenshot shows the Leave button focused while the player's replacement is marked and the hint reads "Enter commit". GP.14 "Enter takes it (the chosen skill replaced ...)" not met.
- S5c swap-leave probe with the allies FIRST (seeds 2,4,5; allies on their AI-preferred loadouts so every card suggests Leave; captures/gntcparty5-swapleave.json): **keyboard S + Enter -> the card is recorded `choice: 'leave', by: 'human'` and the new skill DISCARDED on 12/12 cards (Tank, Swordsman, Archer, Healer x 3 seeds)**; the mouse path (click a Replaces tile, click "Take · Replace") takes 12/12 — but every ally's new skill lands in slot 4 although tile 2 was marked (Tank seed 2: Iron Stance marked over Shield Wall at key 2 -> [heavy_slam, shoulder_charge, taunting_roar, iron_stance]).
- S6 OWN selection-UX probe `tools/gntcparty5-ux.mjs` (dev server, real keys / mouse / mocked pad; captures/gntcparty5-ux.json, gntcparty5-ux-<size>-<screen>-seat<N>.png) at 1024x576, 1600x900, 2560x1440. Party page: F1-F4 -> the viewed card's `data-seat` + owner label "FOR YOU — THE HEALER" / "FOR THE TANK" / ... (12/12); no text overlap / clipping / off-screen / scrollbar on any tab at any size (12/12); tabs 56-58 px; Q wraps Healer -> Archer, E wraps back; one click on a tab; pad RB -> next, LB -> back; pad D-pad down/up cycles the Tank's Replaces 2 -> 3 -> 2; Suggested page commits with ONE Enter from the Healer tab (3/3 sizes). **FAIL: the whole party page jumps vertically on every character switch — the tab row's y per viewed seat is [52, 40, 26, 40] px at 1024x576, [209, 147, 129, 147] at 1600x900, [363, 298, 278, 298] at 2560x1440 (page height 528 / 659 / 696 / 659 at 1600x900): the tab the mouse user wants next moves up to 85 px under the cursor.** FAIL: the wheel over the new-skill card does not cycle Replaces (2 -> 2, 3/3 sizes; re-tested over the Replaces row in S7). Shop: F1-F4 view each shelf with owner ribbons; **FAIL: the Swordsman's shelf at 1024x576 and 1600x900 — the "✓ SUGGESTED" ribbons are cut off under the next card's "SWORDSMAN" owner ribbon on 3 of 4 cards (29 % box overlap; zoom captures/gntcparty5-ux-1024x576-shop-seat2-zoom.png) and at 1024x576 the shop's title, lamp and Glint header are pushed above the window top (captures/gntcparty5-ux-1024x576-shop-seat2.png); the panel also jumps 66 px between the Healer and Swordsman tabs at 1600x900.** 2560x1440 shop clean. Socket screen: F1-F4 switch the viewed seat (12/12); its layout audit did not run (selector) — redone in S7. 0 page errors at every size.
- S7 Socket screen by REAL keys (`tools/gntcparty5-sockreal.mjs`, `gntcparty5-sockgrey.mjs`, `-sockgrey2.mjs`; captures/gntcparty5-sock*.png/json): Tank tab by F2; Enter on the bench picks Aegis, Enter places it on Shield Wall socket 1 (verdict live); Anchor placed on Whirling Guard socket 1 (live). Verdict display (captures/gntcparty5-sockgrey-0.png): grey cells (Tremor on Shield Wall, Anchor + Retaliate on Iron Stance) carry the strike glyph and the row reads "⊘ 1 grey" / "⊘ 2 grey"; inert cells (Provoke on Taunting Roar, Tremor on Shoulder Charge) carry a "+0" badge and "+0 x1"; the grey detail text is correct ("⊘ no hostile delivery to stagger with — legal to socket — contributes nothing"). **FAIL: the INERT detail text is wrong and prints "undefined": Provoke on Taunting Roar and Tremor on Shoulder Charge both read "+0 +1 target — currently +0 (all undefined allies already hit)" (captures/gntcparty5-sockgrey2-4.png) — the Multiply template; §25.3 says Roar already taunts 150 ticks / the Charge already stuns 36.** Live class node text: Provoke on Shield Wall / Shoulder Charge prints all three columns ("hit enemies are taunted ... · Shield Wall taunts near its shields · Iron Stance taunts 2 inside") instead of the one line for that skill (advisory). Wheel over the Replaces row cycles 2 -> 3 -> 0 (met; the wheel over the new-skill card does nothing). Socket screen at 1024x576 renders at scale 0.709 (`socketUi().scale`): 16 px CSS text -> 11.3 px on screen, socket cells 45 px (below the 0.75 shrink floor the PARTY note states for windows under 1024x640).
- S7b Page == Node verdicts (`tools/gntcparty5-oraclepage.mjs`): page `partyPools` / `partyVerdicts` equal the Node world's on all 440 cells (389 live / 48 grey / 3 inert = the oracle's grey 16/8/24, inert 2/1/0). The builder's `--verify-page` path times out here (it launches without the loopback flag) — measured with my tool instead.
- S8 GP.4 network leg re-run on the dev server with the builder's `gntPARTY-net --mode casts` on my ports 7961-7963 (captures/gntcparty5-netcasts-s{1,2,3}.txt): Archer 13/13 (8/8 skills by real keys; cues 12-41 ms after the key; vault / disengage predErr p95 0.002-0.003 u, max 0.159 u, 0 snaps); Swordsman 12/13 (7 actives OK, cues 11-39 ms; Razor Wake press -> seat_denied and no `sword_wake` cue in the window — the design plays it only when a pulse hits, advisory; fox_step / pursuit predErr p95 0.003 u); **Tank 11/12: Whirling Guard on key 4 produced NO host ally_cast, no VFX, no cue** (re-run in progress as s1b); the other 7 Tank skills: event + VFX + cue 14-53 ms (Iron Stance press -> seat_denied, pulses 60/60/60 ticks, none after the swap-out tick). 0 desyncs over 307 / 279 / 321 hash checks, 0 page errors.
- S9 OWN persistence probe `tools/gntcparty5-persist.mjs` (+ `gntcparty5-fixture2.mjs`; captures/gntcparty5-persist.json, -persist-*.png): `?partygrant=2` allies filled [10,10,10]; `save.roundTrip` mid-combat equal + continuationEqual, on the party page equal + continuationEqual; slot "manual-1" saved on the party page -> reload with another seed -> load: all four builds and all four page cards identical. Campaign L1 -> L2 (`campaign.choose(1)`, `?partygrant=2`, skipToRoom 8, killBoss): every seat's skills / sockets / bench identical across the transit card (purses 106 -> 118 = the Stag room's +12 stipend), the card names Tank / Swordsman / Archer builds. REAL v0.5.150 schema-3 slot files (captures/gntcsave5-v150-manual-1/-2.json, made by the save critic from a v0.5.150 build) injected into a slot and loaded: #1 (Level 2 room 4, combat) ok, allies on their kits, ONE `party_catchup {level 2, rooms 3, perSeat 16}`; #2 (Level 1 room 2, reward page) ok, phase reward, wallet 24, the party page open, catch-up + auto-fill applied once. (A first attempt that overwrote the `.thumb` key loaded the fresh camp — harness error, re-run clean.)
- S9b Human Tank Whirling Guard re-check (`tools/gntcparty5-tankkeys.mjs`, server 7965): key 4 pressed FIRST with 3 hostiles alive -> host `ally_cast whirling_guard` inputSeq 117, and again later (694); 3/2/1 -> ground_crack / brutal_cleave / heavy_slam. The builder tool's miss was its own sequence (room already cleared by key 4) — not a game defect.
- S10 Modes + pad (`tools/gntcparty5-modes.mjs`; captures/gntcparty5-modes-*.png, .json): `?party=suggest` — ally cards open decided (ai, take), ONE Enter commits, ally benches 1 -> 0 (auto-filled); `?party=manual` — all 4 cards undecided, FOUR Enter presses walking seats 0,1,2,3, ally benches untouched (1/0); `?party=auto` — ONE Enter, the summary line "Automatic · Tank takes Shield Wall · Swordsman takes Riposte · Archer takes Rain of Arrows". **Mocked pad on a Leave-suggested Tank swap card (Iron Stance): RB -> Tank tab, D-pad down moves the ✕ to Taunting Roar, A -> the card is recorded `leave, by: human` and the loadout stays [heavy_slam, shield_wall, shoulder_charge, taunting_roar]** (captures/gntcparty5-modes-pad-mid.png shows the Leave button focused, "suggested: Leave — the current four outrank it"). The discard bug of S5b holds on keyboard AND pad; only the mouse path takes.
- S11 VFX judgement (`tools/gntcparty5-vfx.mjs`; captures/gntcparty5-vfx-*.png): Taunting Roar, Shield Wall, Shoulder Charge, Fox Step, Crescent Finisher, Riposte, Vault Shot, Pinning Arrow, Rain of Arrows cast via `partyCast` in a live room-2 fight; classFx counters: Roar live 10 / motes 17, Crescent live 5, Riposte motes 9 + parry, Rain live 7. With Iron Stance equipped every party member inside 1.3 u wears the milky hex shell: in captures/gntcparty5-vfx-taunt-zoom.png the Healer, Tank and Archer read as white capsules with only ears showing; the max-stress Level 3 frame (captures/gntcparty5-vfx-l3max-9s-zoom.png) shows two shelled members ghosted behind hex outlines, identifiable only by the command-bar hex badges (22, 12). Advisory (readability), not scored must-fix by me — the characters remain partly visible.
- (env) own production preview: npx vite build --outDir dist-gntcparty5 (exit 0) + vite preview port 4402, PID 83440 (to kill before return).
- S12 Production build re-check (own preview 4402, dist-gntcparty5): swap-leave keyboard discard 4/4 cards (Tank, Swordsman, Archer, Healer; captures/gntcparty5-swapleave-prod.json); ally re-sort 2/2 (seed 3 Tank: Shield Wall marked into key 4 -> slot 1; Archer Kestrel Watch marked into key 1 -> slot 2); party-page jump [209,147,129,147] px and the Swordsman shelf ribbon overlap (29 %) at 1600x900 identical to dev (captures/gntcparty5-ux-prod.json). 0 page errors.
- S13 Socket screen audit (`tools/gntcparty5-sockaudit.mjs`, captures/gntcparty5-sockaudit.json, -sockaudit-1600x900-seat3.png): every row carries `data-seat` = the viewed tab; 0 overlaps / 0 clipped on Healer / Tank / Swordsman at 1024x576, 1024x640, 1600x900, 2560x1440; rendered scale 0.709 / 0.776 / 1.108 / 1.75 -> smallest rendered text 11.3 / 12.4 / 17.7 / 28 px. **Archer tab at EVERY size: the row name "Detonating Charge" is elided to "Detonating Ch..." (scrollWidth > clientWidth) and the Archer tab's ▼ caret overlaps the Auto-fill button.** Shared-node copy is not class-aware: Split on the Archer's Piercing Shot reads "... · heals splash the 2 nearest allies (40%)"; Siphon on the Swordsman's shelf "heals scorch the nearest enemy"; Galvanize on the Tank's shelf "heals inspire allies" (advisory).
- S14 Regression (dev server): smoke `cert-capture shot gntcparty5-smoke` exit 0, 0 PAGEERROR; core loop `gnt-arch-coreloop.json` exit 0 (run_start@235 -> room_cleared@367 -> reward_offer@367), 0 PAGEERROR; `gntDEPLOY-sp` 4/4 (0 /echoes sockets in single-player); `gntCAMPAIGN-net --port 7966` 12/12 (0 desyncs, host Quit to Lobby returns both); `gntM5b-ui --port 7967` 22/23 (the one FAIL "join with an unknown code -> explicit not-found message" is the lobby's, outside PARTY — advisory); `gntCAMPAIGN-gates flow` 12/13 — the GC.4 FAIL is the tool reading the first 400 characters of the longer PARTY end card; the card (captures in the json) reads CAMPAIGN COMPLETE + the four build lines and camp returned at 600 ticks (<= 600) — not a game defect.
- S15 Cap on every seat in page (`tools/gntcparty5-cap.mjs`, captures/gntcparty5-cap.json): Healer giveSkill lantern_flurry / dewfall -> slots 2 / 3, then sanctuary / bell_toll -> `no_free_slot` (4 skills); every ally `partySwap(seat, extra)` with no slot -> `denied full`, slot 4 -> `no_such_slot`, `mending_bolt` -> `not_class`, loadout unchanged; the Healer's next skill reward = `{type: skill, swap: true, id: nova_bloom}`. Drop-in / drop / rejoin (`tools/gntcparty5-rejoin.mjs`, server 7968, captures/gntcparty5-rejoin.json): a guest dropping in on the AI-built Archer seat keeps its build (host == guest, all three ally builds), a 2.5 s socket drop keeps it, a full page rejoin keeps it (the new page was seated on seat 1 while seat 3 was still held — M5 seat policy, advisory). GP.15 spot check (`gntPARTY-perf --url 4402 --secs 30`, captures/gntcparty5-perf.txt): Node step p95 0.47 ms, events x1.71 of v0.5.150 (pass); page 30 s max-stress L3 room 6: p95 30.3 ms, 2 frames > 50 ms (max 97.1 ms), 47.6 fps — measured while the machine ran other agents' processes at 30-51 % CPU (one node process at 1.18 GB) — INCONCLUSIVE, advisory; the tool's party-page / socket timers returned null, shop interactive 302 ms. Own processes: preview 4402 (PID 83440) and servers 7960-7968 stopped; no listener left on my ports.

## Probe tables

### Per class (GP.1-GP.4)
| Probe | Healer | Tank | Swordsman | Archer |
|---|---|---|---|---|
| Pool (skills / nodes) | 17 / 17 (unchanged, healer 28/28 vs v0.5.150) | 8 / 18 = §25.2 / §25.3 | 8 / 18 | 8 / 19 |
| Numbers (sim + card) | oracle cross-check 289 | Heavy Slam 34/5s/3/40°, Shield Wall card PWR 24 CD 10s RNG 3 CNT 2 = §25.2; oracle Node 440/440, page == Node 440/440 | same oracle | same oracle |
| 4-cap (5th never) | giveSkill 5th/6th -> no_free_slot | full / no_such_slot / not_class | same | same |
| Full-slot skill reward = SWAP (never node) | 12/12 swap cards | 12/12 | 12/12 | 12/12 (48/48 room-1 cards swap: true) |
| Swap by real input: marked skill replaced | 12/12 (take-suggested) | 12/12 | 12/12 | 12/12 |
| ... new skill in the marked key | 12/12 | 3/12 (re-sorted) | 6/12 | 0/12 |
| ... Leave-suggested card, keys S+Enter / pad A | DISCARDED 5/5 | DISCARDED 3/3 + pad 1/1 | DISCARDED 3/3 | DISCARDED 3/3 (prod 4/4 all seats) |
| ... Leave-suggested card, mouse | taken 5/5 | taken 3/3 (slot 4, not the marked 2) | taken 3/3 (slot 4) | taken 3/3 (slot 4) |
| 8 sockets, no caps, grey/inert shown | Healer grid unchanged | strike on grey, +0 on inert; inert text "all undefined allies already hit" | sim sweep only `limit` denials (67/67) | cells 72/72 |
| Casts by real key on a human seat (host event / VFX / own cue) | autopilot + keys unchanged (core loop) | 7/8 in builder tool; Whirling Guard verified by own probe 2/2 -> 8/8; cues 14-53 ms | 7 actives OK (11-39 ms); Razor Wake cue only on a hit | 8/8, cues 12-41 ms |
| Passive pulses 60 ± 1, stop on swap-out | — | Iron Stance 60/60/60, none after | Razor Wake 60/60/60, none after | Kestrel 60/60/60, none after |
| Guest displacement predErr p95 | — | Shoulder Charge 0.003 u | Fox Step / Pursuit 0.003 u | Vault 0.002 u (max 0.159), Disengage 0.003 u |

### Identity + AI (GP.5 / GP.8, Node, carried campaigns seeds 1-3)
| Measure | Value | Bar | Verdict |
|---|---|---|---|
| Taunt redirect within 60 ticks | 131 / 179 = 73 % | >= 50 % | met |
| Hostile attack starts aimed at the Tank (taunt source equipped) | 29.3 % vs v0.5.150 28.6 % = x1.02 | >= x1.3 | NOT met |
| Hostile-target time on the Tank (own runner) | 29 / 33 / 31 % | (4 members + Waystone; fair share 25 %) | weak |
| Tank shields' share of party damage in Shield Wall rooms | 18.0 % | >= 8 % | met |
| Swordsman distance at cast | 0.81 u (own 0.68-0.76) | <= 1.2 | met |
| Crescent Finisher with combo >= 1 | 191 / 191 | >= 60 % | met |
| Archer distance to nearest hostile at cast | 3.34 u (own 2.93-3.21) | >= 2.5 and >= 2x Swordsman | met |
| Idle equipped actives (rooms >= 20 s) | 17 (v0.5.150: 0) | 0 | NOT met |
| Idle fallback share | 66 / 4428 | <= 25 % | met |
| Guard on Downed / dash past leash / Pin on Stag | 0 / 0 / 0 | 0 | met |
| AI swap choices vs §25.8 | 75 / 75 | all | met |

### Balance (GP.13, seeds 1-5)
| Start | Level | damage x base | time x base | Stag x base | seeds with >= 1 down | cleared |
|---|---|---|---|---|---|---|
| L1 carried | 1 | 1.18 | 1.09 | 0.81 (259 vs 321) | 0 / 5 (FAIL d) | 5 / 5 |
| L1 carried | 2 | 1.15 | 1.13 | 1.00 | 1 / 5 (FAIL d) | 5 / 5 |
| L1 carried | 3 | 0.75 | 0.99 | 1.00 | 5 / 5 | 3 / 5 |
| L2 start | 2 | 0.91 | 1.16 | 1.07 | 1 / 5 (FAIL d) | 5 / 5 |
| L2 start | 3 | 0.80 | 1.00 | 1.02 | 5 / 5 | 4 / 5 |
| L3 start | 3 | 0.81 | 1.02 | 1.08 | 4 / 5 | 5 / 5 |

## Benchmark scoring (checklist written in S1, before any capture)
| # | Verdict | Evidence |
|---|---|---|
| B1 per-hero reward attribution | met | one card per character, owner label "FOR THE TANK" / data-seat 12/12 x 3 sizes (S6) |
| B2 switching speed + unmistakable view | partially | F1-F4 1 key, Q/E wrap, 1 click, RB/LB; but the whole page jumps 26-85 px per switch (S6) |
| B3 <= 4 skills, swap UI names the replaced | partially | cap holds on every path (S15); real-input ally swaps land in another key than promised 27/36 (S5) |
| B4 "Replaces X" + decline | partially | card names the replaced skill, Leave keeps loadout; Enter / pad A on a Leave-suggested card discards the marked replacement 16/16 (S5b, S5c, S10, S12) |
| B5 numbers match | met | oracle 440/440 Node + page, sim 67/67, card numbers = §25.2 |
| B6 per-skill reinterpretation text | partially | stat nodes per skill ("arc 50° -> 60°"); technique text lists all columns; heal copy on non-healers; inert text "undefined" (S7, S13) |
| B7 any socket + flagged pairings | met | grey strike + "⊘ n grey", "+0" inert badge, only `limit` denials (S7) |
| B8 AV signature <= 100 ms | met | 24/24 SP; net cues 11-53 ms; Whirling Guard re-verified (S8, S9b) |
| B9 class roles | partially | Swordsman / Archer distances + combo met; Tank taunts + shields met, aggro share x1.02 (S3) |
| B10 AI uses its whole kit | partially | 17 idle equipped actives; Swordsman 45 s defend room with 3 casts (S3) |
| B11 co-op ownership + timer | partially | ownership + 30.0 s autopick + toasts met; owner labels overprint the names (S4b) |
| B12 persistence | met | roundTrips, slot reload, transition, v0.5.150 files, drop/rejoin (S9, S15) |
| B13 time-to-decide | met | 1 Enter Suggested, 4 Manual, 1 Auto + summary (S10) |
| B14 pad navigation | met | RB/LB tabs, D-pad Replaces, pad socket screen hints (discard counted in B4) |
| B15 no overlap / clipping 1024x576-2560x1440 | partially | party page clean; Swordsman shelf ribbons overlap + header off-screen; Archer row name elided (S6, S13) |
| B16 per-hero shop purse + price | met | purse per tab, owner ribbon + price per card, lamp names who buys (S6) |
| B17 replication + reconnect | met | host == guest after commits / timeout; 0 desyncs; drop-in / drop / rejoin keep builds (S4, S8, S15) |
| B18 difficulty scaling | partially | (a)(b)(c) met; (d) L1 0/5, L2 1/5 (S3b) |
Score: 9 met / 9 partially / 0 not met of 18.

## PLAN gates (literal)
| Gate | Verdict | Evidence |
|---|---|---|
| GP.1 pools | met | Node 440/440, page == Node, pools by name (S2, S7b) |
| GP.2 4 skills / 8 sockets / no caps / A17 swap | NOT met | cap + swap cards + 0 lost nodes met; "Take with each replace target -> the new skill in that slot" fails on the real-input path for allies 27/36 (S5) |
| GP.3 grids | met (display bug F6) | 440 verdicts, cells 72/72; grey strike + inert "+0" shown; inert copy wrong |
| GP.4 casts by real keys | met | 24/24 SP; Tank / Swordsman / Archer real keys on guest seats, cues <= 53 ms, predErr p95 <= 0.003 u, passives 60 +/- 0 (S8, S9b) |
| GP.5 identity | NOT met | aimed-at share x1.02 (< x1.3) (S3) |
| GP.6 selection UX | NOT met | page jump 26-85 px; Swordsman shelf ribbons overlap; header off-screen @1024x576; Archer row name elided; MP owner labels overprint names (S4b, S6, S13) |
| GP.7 supply | met | builder tool re-run: spoils 1, +12, 4-card shelves, sockets 12 / 22 / 32 (S3) |
| GP.8 AI | NOT met | 17 idle equipped actives (S3) |
| GP.9 MP ownership + deadlines | met | own probe 15/16 (S4) |
| GP.10 replication | met (spot) | host == guest after commits / timeout, 0 desyncs over 279-321 checks, drop-in / drop / rejoin keep builds (S4, S8, S15); bandwidth not re-measured by me |
| GP.11 carry + save | met | S9 |
| GP.12 modes | met | S10 |
| GP.13 band | NOT met | (d) L1 0/5, L2 1/5 (S3b) |
| GP.14 Healer unchanged + A17 by real input | NOT met | data 28/28, one Enter; "Enter takes it" fails on a Leave-suggested swap card 5/5 (S5b) |
| GP.15 performance | inconclusive | loaded machine: p95 30.3 ms, 2 frames > 50 ms; Node step + events pass (S15) |
| GP.16 regression | met | smoke, core loop, goldens 9/9, nodetrip 9/9, campaign-net 12/12, DEPLOY-sp 4/4, CAMPAIGN-gates flow 12/13 (tool truncation only) (S2, S14) |

## Failures
- **F1 (must-fix, GP.14 / GP.2 / A17)** Keyboard Enter and pad A on a full-slot swap card whose AI suggestion is Leave DISCARD the player's marked replacement: after S / D-pad moves the replace mark to another skill, Enter / A records choice leave, by human — 12/12 cards on dev (Healer, Tank, Swordsman, Archer x seeds 2, 4, 5) + Healer 5/5 more + 4/4 on the production build + pad 1/1; the mouse path takes 12/12. The Leave button keeps focus while the player picks what to replace (captures/gntcparty5-swapleave-keys-s1-seat0-mid.png, gntcparty5-modes-pad-mid.png). Repro: ?menu=0&seed=2, give the allies their AI-preferred loadouts on page 1 (partySwap), take the skill door, clear room 2, F2 on the Tank card (Iron Stance, "suggested: Leave"), S, Enter -> Tank loadout unchanged. Tools: tools/gntcparty5-swapleave.mjs, gntcparty5-modes.mjs.
- **F2 (must-fix, GP.2)** A swap the player makes for an AI-held ally does not land in the key the card promises: the commit re-sorts the loadout by AI priority — new skill in the marked slot 9/36 (Tank 3/12, Swordsman 6/12, Archer 0/12) on take-suggested cards and 0/9 on Leave-suggested cards taken by mouse (always slot 4); production 0/2. Seed 3 Tank marks Whirling Guard (key 4) for Shield Wall -> [shield_wall, heavy_slam, brutal_cleave, ground_crack]. The replaced skill is right 36/36. Repro: ?menu=0&seed=3, room 1 page, F2, S (mark key 4), Enter, Enter -> partyView(1).slots. Tool: tools/gntcparty5-swapkeys.mjs.
- **F3 (must-fix, GP.6 / B2)** The party page is re-centred vertically on every character switch: the tab row y is [52, 40, 26, 40] px at 1024x576, [209, 147, 129, 147] at 1600x900, [363, 298, 278, 298] at 2560x1440 (page height 528 / 659 / 696 / 659 at 1600x900) — the tab the mouse user clicks next jumps up to 85 px; dev and production. Tool: tools/gntcparty5-ux.mjs.
- **F4 (must-fix, GP.6 / B15)** Shop on the Swordsman's shelf at 1024x576 and 1600x900: the "SUGGESTED" ribbon of 3 of 4 cards is cut off under the next card's "SWORDSMAN" owner ribbon (29 % box overlap; captures/gntcparty5-ux-1024x576-shop-seat2-zoom.png, -1600x900-shop-seat2.png) and at 1024x576 the shop title, lamp and Glint header sit above the window top; the socket screen elides the Archer's "Detonating Charge" row name to "Detonating Ch..." at all four sizes and the Archer tab caret overlaps Auto-fill (captures/gntcparty5-sockaudit-1600x900-seat3.png).
- **F5 (must-fix, GP.6 / B11, multiplayer)** In a session the party-page owner labels ("you" / "player" / "AI") are drawn over the character names on host and guest at 1280x720: "Heal[player]er", "Swordsm[you]an" (captures/gntcparty5-mp-host-page.png, gntcparty5-mp-guest-tabs-zoom.png). Tool: tools/gntcparty5-mp.mjs.
- **F6 (must-fix, GP.3 display / "grey / no-effect verdicts")** The socket screen's INERT explanation is the Multiply template with an unfilled value: Provoke on Taunting Roar and Tremor on Shoulder Charge read "+0 +1 target — currently +0 (all undefined allies already hit)" (captures/gntcparty5-sockgrey2-4.png); the §25.3 reason (Roar already taunts 150 ticks; the Charge already stuns 36) is never shown.
- **F7 (must-fix, GP.5)** The Tank does not draw attention: hostile attack starts aimed at the Tank while a taunt source is equipped 29.3 % (408 / 1393) vs v0.5.150 28.6 % = x1.02 (gate >= x1.3); hostile-target time on the Tank 29-33 % in my own runner; taunts redirect (73 %) but too briefly to shift the fight.
- **F8 (must-fix, GP.8)** 17 equipped actives never cast in combat rooms >= 20 s over three carried campaigns (v0.5.150: 0): Swordsman Flurry / Crescent Finisher / Blade Storm idle for all 45 s of Level 1 defend room 2 (seed 1: only Lunge Strike x3); Brutal Cleave 1.0 casts/min in Level 1 (6 of 9 rooms 0 casts).
- **F9 (must-fix, GP.13 (d))** >= 1 party down per level on >= 2 of 5 seeds: carried Level 1 0/5, Level 2 1/5, Level-2 start 1/5 (the v0.5.150 baseline also had 0/5 there — the builder's recorded design conflict with (b); still a gate not met).
- F10 (minor) window.__echoes.party (PLAN §16.11: state / view / pools / verdict / aiLog / oracle) is undefined; TESTING PARTY probe 1 cannot run as written.
- F11 (minor) The socket screen at 1024x576 renders at scale 0.709 (below the 0.75 floor the PARTY note gives for windows under 1024x640): 16 px CSS text -> 11.3 px, cells 45 px.

## Advisories
- Iron Stance / Kindred shells wash party members into milky hex capsules (captures/gntcparty5-vfx-taunt-zoom.png, -l3max-9s-zoom.png); identity survives mainly through the command-bar badges.
- Shared-node card copy is not class-aware (Siphon "heals scorch" on the Swordsman's shelf, Galvanize "heals inspire" on the Tank's, Split "heals splash" on the Archer's socket screen); class technique text lists every column instead of the one for the focused skill.
- run.party.cards[0].replace stays at the suggestion after the Healer moves the mark (the real choice lives in run.reward.replace).
- The wheel cycles Replaces only over the Replaces row, not over the new-skill card.
- GP.15 frame gate inconclusive on a loaded machine (p95 30.3 ms, max 97 ms); re-measure on an idle machine.
- gntM5b-ui "unknown code -> not found" message missing (lobby, outside PARTY); a full-page rejoin was seated on seat 1 while the old seat was held.
- Builder tools: gntPARTYD-grid --verify-page lacks the loopback flag (navigation timeout); gntPARTY-net --mode casts presses key 4 after the room can already be clear (false Whirling Guard miss); gntCAMPAIGN-gates GC.4 reads only 400 characters.
