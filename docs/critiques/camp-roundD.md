# Camp hub & run bookends — Round D critic verdict (xcp-, v0.4.13 @ aa3b00a)

**VERDICT: FAIL** (2 blocking defects + 1 must-fix, 5 advisories). The static camp
frame scores 18/20 on the reference bar with no zero, but the run loop leaks live
combat into camp and nothing in the camp is solid. All evidence is from my own
captures (`captures/xcp-*`), `tools/analyze.mjs`, and `__echoes` probes
(`tools/actions/xcp-*.json`). Console logs: zero `[PAGEERROR]`/`[error]` across every
xcp capture; only the known `flatShading` MeshToonMaterial warnings. src/** untouched.

Note: `cmd('win')` / `cmd('lose')` do NOT exist (grep of src/ finds only
`endRun('victory'|'defeat')`). I used `endRun` for Victory and a REAL defeat
(`setHp` 0 on all four party ids -> `downed` x4 -> `defeat` -> `run_end`) elsewhere.

## Per-criterion evidence

### 1. Camp frame passes the reference camp read — PASS
`captures/xcp-boot.png` (no URL params, 1600x900), `node tools/analyze.mjs --ref`:

| Metric | xcp-boot | bar | reference |
|---|---|---|---|
| LUMA >160 | 2.077% | >=1.5% | 3.418% |
| LUMA >200 | 0.566% | >=0.4% | 1.427% |
| buckets | 15/16 | >=13 | 16/16 |
| FLAT | 11.24% | <20% | 16.68% |
| HUEMIX | warm 29.1 / foliage 3.5 / cool 67.4 | funnel | 22.5 / 1.1 / 76.4 |
| HUES | danger 291, violet 3302, amber 93128 | | |

- Colour families: indigo night ground + amber hearth/lanterns + one violet portal.
  `--box 0,110,1600,790` (everything below the portal): **violet 0 px**. Danger 291 px
  is the Swordsman's #6B2E3A ring, not Ember.
- Prop types: `campState.propTypes` = **26** (16 camp types: hearth, tripod, bench,
  woodpile, tent, bedroll, forge, anvil, rack, stall, sack, cart, lanternpole, banner,
  portal, runestone; + 10 Act-1 edge types). Bar >=12.
- Emitters: 17 (`hearth, 3x tentglow, forge, relic, 4x poleLantern, portal, 4x flame,
  2x lantern`), each drawn with a halo sprite + ground pool in frame
  (`captures/xcp-propcrops.png` tiles: cart, bench, tent, forge/anvil, lantern pole,
  stall — each shows its blob shadow; pole lantern and forge show halos).
- Contact shadows: 70 shadow instances; visible under benches/cart/tents in the crops.
- Vignette: corner mean luma TL 12 / TR 15 / BL 27 / BR 17 vs mid-edges 42-68 vs
  centre 93 (`uVignette` 0.26).
- Side-by-side `captures/xcp-compare.png` (camp party/fire crop vs reference bridge
  crop): the camp reads storybook-clean but its fire is ONE bloomed blob; the reference
  fire has core + orange glow + trail + ember debris per emitter. Logged as advisory A4.

### 2. Four critters idle around the Hearth with visible motion; no corruption colour — PASS at boot, degraded after a run (see F1, A2)
- Boot: rigs at healer (0.1,1.85), tank (-1.95,0.5), swordsman (1.9,0.6), archer
  (-1.33,-0.43) — all within 2.1 u of the hearth (0,-0.2), all `anim: idle`.
- Frame-diff over `captures/xcp-idle_00..03.png` (300 ms apart), % pixels changed
  (>20 on any channel) vs frame 0:
  archer 9.9/7.6/11.0, tank 12.2/13.0/8.4, swordsman 8.8/6.1/10.1, healer 7.8/11.1/8.0
  vs static controls bench 2.4/1.7/0.9, tent 1.2/1.6/1.4, cart 1.1/0.4/0.8, bare
  ground 0/0/0. Critters move 4-10x more than props: non-statue proven.
- `captures/xcp-partyzoom.png`: ears, staff-gem glow, ink outlines, identity rings,
  eyes in the lower head — reads as the brief's chibi family.
- Corruption: violet 0 px outside the portal band (above).
- BUT the Archer is NOT at its authored seat (-2.5,-2.3): ally AI (leash 3.4 u) walks
  the allies off their spots toward the player within the first second, and after any
  run they end wherever the leaked fight (F1) left them — `captures/xcp-leak.png`
  shows the Tank standing ON the woodpile at ~(525,480) and all three allies bunched
  west of the fire, nobody on the east/north seats.

### 3. Boot lands in camp; real WASD walk + real E starts room 1 within 300 ms — PASS
- `xcp-state`: `scene: camp, mode: camp, runPhase: idle` with no URL params.
- `xcp-walk.json`: puppeteer `keydown KeyW` 2700 ms -> player (0.1,-4.87),
  `inPortal: true, promptVisible: true` (`captures/xcp-walk.png` shows the prompt and
  the brightened gate ring).
- `xcp-press.json`: real `KeyE` -> `run_start` **184 ms** after the keydown
  (`lastBegin.deltaMs` 185; fade in 150 / start at 180), `room_start` room 1
  `kill_all` waves [3,3,4], `mode: run`, `vfx.mode: run`, fresh seed 2080001102 vs
  boot 268724581. `captures/xcp-press.png` is the Act-1 arena with WAVE 1/3.
- Edge cases (`xcp-edge`): E outside the portal -> phase idle, `campBegin()` false,
  0 run_starts; double-tap E inside the portal -> exactly **1** run_start; E during the
  run -> still 1, prompt hidden.

### 4. Victory measurably warmer than combat; Defeat soft violet-white with a wry line — PASS on colour, FAIL on screen hygiene (F2)
| Frame | HUEMIX warm | violet px | LUMA >160 | FLAT |
|---|---|---|---|---|
| `xcp-victory.png` | **99.9%** | 0 | 41.0% | 59.7% |
| `xcp-press.png` (combat, room 1) | 19.1% | 3760 | 8.3% | 2.2% |
| `xcp-boot.png` (camp) | 29.1% | 3302 | 2.1% | 11.2% |
| `xcp-defeat.png` | 12.5% | **169,531** | 0.9% | 23.8% |

- Victory: wash opacity 1, `bookends.tone: victory`, no vignette, headline VICTORY,
  "Return to Camp"; environment behind is the camp (`mode: camp`). Warmer than any
  combat frame by 80 points of HUEMIX.
- Defeat: real all-four-downed defeat, `tone: defeat`, wash + static violet vignette
  (inset 12%, fade 520 ms), headline "THE RUN ENDS", flavour **"The gods applaud."**,
  no red, no crush (histogram peak in buckets 5-8). Reads theatrical, not hard-fail.
- FAIL: both end frames carry the live Zone-2 combat banner over the card —
  `captures/xcp-victory.png` "WAVE 1/2 ● 5 LEFT" at (653,14,295x35) and an off-screen
  THREAT POINTER at the left edge (~x20,y455); `captures/xcp-defeat.png` "WAVE 1/2 ●
  4 LEFT" plus a violet enemy SPAWN SHIMMER at ~(1230,650) and an ally rig at
  (1060,540) mid-walk. `hud.banner()` on the end screen: `{mode:'kill_all', text:'WAVE
  2/2 3 LEFT', opacity:1}`. A wave counter ticking down on the Victory card is exactly
  the stale/overlapping UI the reference bar rejects.
- Advisory A3: Victory FLAT 59.7% — the wash flattens the camp into a beige fog; the
  brief's "environment matches party warmth" wants a WARM CAMP visible, not hidden.

### 5. camp -> run -> death -> camp -> new run x2, zero errors, wiped state, fresh seeds — FAIL (F1)
`xcp-loop2.json` (real W walk 3300 ms, real E, giveSkill/wallet/grantNode mid-run,
real all-four-downed defeat, real Enter on the card), two cycles:
- seeds: run 1 **2250237824**, run 2 **3570723396** (boot 352615282) — fresh per run.
- after each return: `phase idle, active false, wallet 0 (was 40), skills
  [mending_bolt, swift_mend] (nova_bloom gone), bench 0 (sharpen gone), party un-downed`,
  `run_wiped` "0/2" twice, `washOn false`, page errors 0.
- **BUT `enemies: 3` in camp after BOTH returns**, and the party is not at max HP after
  cycle 2 (swordsman 85/95): enemies keep spawning and fighting in camp.
  `xcp-leak.json` timeline: in-run 5 enemies -> defeat at tick 1373 (`enemy_despawn`
  5) -> `enemy_spawn` count rises 5 -> **8** AFTER `run_wiped` (wave 2's pending spawn
  telegraphs fire post-wipe; boars at (-4.7,-6.1) and (4.4,-6.4) — arena edge points,
  now inside the camp rect) -> 3 s into camp: `ally_cast 5, hit 4, death 2, hitstop 2`
  with `phase idle`; 7 s: `telegraph_start/resolve`, `enemy_fire`, Archer HP 80 ->
  **70**, then a `room_cleared` event WHILE IN CAMP. `captures/xcp-leakvis.png` (1.5 s
  after Enter) shows two boars biting the party at the forge (~x150-260,y430-520), the
  Tank hit-flashing white with its Whirling-Guard ring live, under a "WAVE 2/3 ● 2
  LEFT" banner over the night camp. Corruption touches Camp.
- Knock-on: the leaked fight's kill hitstop stalls the sim, so the SAME 2700 ms walk
  reached z=-4.75 in cycle 1 but only **-4.47** in cycle 2 (`xcp-loop`) — short of the
  1.7 u portal disc (needs <= -4.65) — so cycle 2's E press did nothing and the run
  never started (`phase idle`). With 3300 ms walks (`xcp-loop2`) cycle 2 reached -5.71
  vs -6.31: 0.6 u lost to hitstop. The real restart loop is therefore flaky.

### 6. fps >= 55 in camp; smoke exits 0 — PASS (noisy)
- `node tools/capture.mjs shot xcp-smoke` exit 0; every xcp capture exit 0.
- Camp fps, 8 s at 250 ms samples, headless SwiftShader with three other critics'
  browsers live: means **63.8 / 51.4 / 163.9 / 96.3**, mins 41.2 / 41.2 / 163.9 / 54.9
  (`xcp-fps`, `xcp-fps2`, `xcp-fps3`, `xcp-fps5`). The 51.4 sample ran concurrently with
  my own two-cycle loop capture; the two uncontended samples are 96-164. Passes the
  bar, but the camp's headless floor is ~41 fps when the box is loaded, vs the
  builder's claimed 83.

## Prop-collision probe (edge case the walk criterion implies) — FAIL (F3)
- `xcp-infire.json`: hold W 860 ms from the seat -> player (0.1,-0.47), **0.29 u from
  the hearth centre**, inside the stone ring. `captures/xcp-infire.png`: the Healer is
  standing IN the campfire, the flame sprite drawn over her body (~x780,y440).
- `xcp-tent.json`: teleport (-4.95,-1.5), hold W 900 ms -> (-4.95,-4.14): walked
  straight through the tent at (-4.95,-3.35). `captures/xcp-tent.png`: Healer
  half-buried in the tent canvas (~x790,y400); the three allies followed and are
  stacked on the bedroll and on each other (~x830-1090,y570-700).
- `captures/xcp-leak.png`: Tank idling ON the woodpile. Nothing in the camp is solid:
  hearth, tents, forge, stall, cart, woodpile, benches are all walk-through.

## Reference-bar score (camp boot frame)
1 dead ground 2 · 2 layered light 2 · 3 silhouette 2 · 4 prop density 2 · 5 VFX
layering 2 (hearth = 3 flame sprites + halo + pool + 130 embers) · 6 colour 2 ·
7 post 2 · 8 grounding **1** (blob shadows yes; critters float through/over props) ·
9 UI **1** (stale wave banner + threat pointer on end screens; prompt overlaps the
Tank) · 10 motion 2 = **18/20**, no zero. Responsiveness bar "full loop without
console errors": errors 0, but the loop is not clean (F1).

## Failures (with fix direction)

**F1 (blocking) — combat leaks into camp after run end.** Evidence: criterion 5,
`captures/xcp-leakvis.png`, `xcp-leak` event counts. Fix: `wipeState()` in
src/sim/run.js must also reset the wave scheduler and cancel pending spawn telegraphs
(`waves.reset()` / clear the telegraph queue), despawn `eshots`/zones/azones, and the
enemy spawn path must no-op when `run.active === false`; gate `enemies.*` spawning on
`combatActive`. Re-verify with `xcp-leak.json`: `enemies` must be `[]` at camp3s and
camp7s, `enemy_spawn` must not increase after `run_wiped`, Archer HP must stay 80.

**F2 (blocking) — stale combat HUD on the Victory/Defeat cards and into camp.**
Evidence: `captures/xcp-victory.png` banner (653,14,295x35) + threat pointer at the
left edge; `captures/xcp-defeat.png` banner + spawn shimmer at (1230,650);
`hud.banner()` opacity 1 in phase `defeat`/`idle`. Fix: Zone-2 banner and threat
pointers must key off run phase (`combat` only) — hide on `run_end` and
`return_to_camp` (240 ms fade), not on wave exhaustion. Mostly falls out of F1 but must
be guarded independently so a future leak can never draw over a card.

**F3 (must fix before certification) — no prop collision in camp.** Evidence:
`captures/xcp-infire.png` (Healer inside the fire, 0.29 u from centre),
`captures/xcp-tent.png` (Healer through a tent, allies stacked on a bedroll),
`captures/xcp-leak.png` (Tank on the woodpile). Fix: have the camp scene hand the sim
a collider list built from its footprints (hearth ring r~0.9, tents r~1.1,
forge/stall/cart/woodpile boxes, benches) and let `sim/movement.js` sweep circles
against them (the same path walls use); route ally steering around them. Re-verify: W
from the seat must stop at the hearth ring (`dist >= ~0.9`); the tent walk must stop at
z > -2.5.

## Advisories (not blocking)
- A1 Prompt overlap: `captures/xcp-walk.png` — "E Begin Run · the wood is waiting"
  (fixed at bottom 21%) sits directly on the Tank and the fire when the camera has
  followed the Healer north. Anchor it to the projected gate marker or drop it to the
  band just above the command bar.
- A2 Allies do not stay seated: leash AI pulls them off their authored spots within a
  second of boot (Archer at (-1.33,-0.43) vs spec (-2.5,-2.3)); after returns they idle
  wherever they stopped. Hold ally AI at the seats while `mode === 'camp'` and the
  player is within ~3 u of the hearth; only follow beyond that.
- A3 Victory wash too opaque: FLAT 59.7%, the warm camp behind the card is illegible.
  Drop the radial wash alpha (~0.74 -> ~0.45) so the hearth and tents still read.
- A4 Hearth vs reference: the camp's fire is one soft bloom blob; the reference's
  fire emitters each show a distinct white core, orange body and ember trail. A
  brighter white-core sprite (above the 0.68 bloom threshold) inside the flame stack
  would close that gap without lifting exposure.
- A5 fps floor under load is ~41 in headless; measure again on the final block with
  the real GPU path before claiming 83.

## Capture index
xcp-boot, xcp-smoke, xcp-state, xcp-ids, xcp-idle_00..03, xcp-walk, xcp-press,
xcp-edge, xcp-infire, xcp-tent, xcp-victory, xcp-defeat, xcp-loop, xcp-loop2,
xcp-leak, xcp-leakvis, xcp-fps/2/3/5, xcp-compare, xcp-propcrops, xcp-partyzoom
(all under captures/; action files under tools/actions/xcp-*.json).
