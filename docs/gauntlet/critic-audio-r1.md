STATUS: COMPLETE
VERDICT: PASS — M3 audio engine + mixer at v0.5.62: PLAN gates G3.1–G3.10 10/10 met by independent re-measurement; benchmark 39 met / 5 partial / 1 not met of 45; 0 must-fix; 8 polish advisories (Home/End dead on sliders, title UI ticks under the menu bed, boss cue = combat ×1.22, thin G3.10 headroom, silent draft/path nav, no per-instance cue variation, dead camp_return mapping, log 50 % = −10 dB).
# Critic — AUDIO ENGINE & MIXER SETTINGS — gauntlet round 1

Module spec (user, verbatim): "AUDIO ENGINE & MIXER SETTINGS: Build an audio manager handling
background ambient music and spatial SFX triggers. Provide a configuration UI with decoupled
linear/logarithmic volume sliders for Master, Music, and Sound Effects channels."

Role: harsh critic, fresh context. Judge only the running game (pixels, console, debug API,
storage, measured audio). Never code read.

---

## STEP 1 — BLIND BENCHMARK CHECKLIST (written BEFORE any Echoes capture was inspected)

Benchmark systems named in the brief: Wwise/FMOD-style bus mixing as used in **Hades** and
**Dead Cells**; the **dB-perceptual volume standard of shipped PC games**; **HTML5 games with
proper autoplay handling**.

### A. Bus architecture (Wwise/FMOD as used in Hades / Dead Cells)

| # | Item | Why a player feels it |
|---|---|---|
| A1 | A real bus graph exists: every voice routes through a child bus (Music / SFX / UI / Ambience) into a single Master bus. Changing a parent bus scales all its children multiplicatively, and nothing bypasses Master. | Master must mute *everything*; a stray voice that survives Master mute is the classic "I muted it and the boss still screams" bug. |
| A2 | Bus gains are **decoupled**: moving Music changes only the Music bus RMS; SFX RMS is unchanged within measurement noise (<0.5 dB). Same in reverse. | Wwise/FMOD buses are independent faders; coupling means the mixer is a lie. |
| A3 | Gain changes are **ramped**, not stepped (a short de-zipper, ~10–50 ms `setTargetAtTime`/`linearRampToValueAtTime`). | Instant `gain.value =` on a live signal produces an audible click/zipper on every slider pixel. Hades/Dead Cells never click while you drag. |
| A4 | Master at 0% is true digital silence (−inf / ≤ −80 dBFS), not a quiet residue. | "Mute" that leaves −40 dB of music audible in a quiet room is a bug. |
| A5 | Buses compose: Master 50% × Music 50% ≈ the product of the two mappings, not the min/max or an override. | Parent×child is the FMOD/Wwise contract. |
| A6 | An explicit limiter/headroom policy on Master: the summed mix never exceeds 0 dBFS even in the worst case (boss fight, many simultaneous voices). | Clipping = crackle in the loudest, most important moment. |
| A7 | Voice management: a cap on simultaneous instances per sound + a short retrigger cooldown, so 30 hits in one tick do not sum into a wall. | Un-capped SFX machine-gunning is the #1 amateur audio tell; both benchmarks aggressively virtualize/limit. |
| A8 | Ducking / sidechain-ish behaviour or at least intensity layering: music makes room for dialogue/boss stingers, or combat intensity raises the music layer. Hades does dynamic layered combat music; Dead Cells swaps intensity. | A flat, non-reactive score under a boss reads as cheap. |

### B. Perceptual volume law (dB standard of shipped PC games)

| # | Item | Expected numbers |
|---|---|---|
| B1 | The **default/perceptual** slider mode is NOT raw linear amplitude. Shipped PC games map the fader to dB (or to an exponent), so the perceived loudness change per slider pixel is roughly constant. | Typical: `gain = (x)^2` … `(x)^3.5`, or dB-linear `gain = 10^((x−1)·R/20)` with a range R of 40–60 dB. |
| B2 | 50% on the perceptual curve is a clearly quieter-but-usable level, i.e. roughly −12 to −20 dBFS relative to 100%, NOT −6 dB (that is the linear-amplitude answer and is perceptually "barely quieter"). | 50% ≈ 0.10–0.25 linear gain. |
| B3 | 0% is exact silence on both curves; 100% is exactly unity (1.0) on both curves — the two modes agree at the endpoints and differ in the middle. | g(0)=0, g(1)=1.0 exactly. |
| B4 | The curve is **monotonic** and smooth: every step up raises measured RMS; no plateaus, no inversions. | 0<25<50<75<100 strictly. |
| B5 | If the product exposes BOTH a linear and a logarithmic mode (this module's spec), switching mode at a fixed % must **measurably change the output level** and the UI must say which law is active; the linear mode must measure as amplitude-linear (25%→≈0.25 gain, −12.0 dB) while the log mode measures as the dB law. A mode toggle that changes nothing is a fake toggle. | linear 25% = −12.0 dBFS ±0.5; log 25% must differ from that by ≥ 6 dB. |
| B6 | A numeric readout (% or dB) next to each slider, and a **test/preview sound** fired when SFX is adjusted so the player hears what they set. Hades/most PC options menus play a preview blip. | — |
| B7 | Sliders have sane default values that are not 100/100/100 max — a shipped mix usually ships music slightly under SFX. | — |

### C. Music bed behaviour (Hades / Dead Cells)

| # | Item | Test |
|---|---|---|
| C1 | Music exists in every app state: menu/title, hub/camp, combat room, boss. | Non-zero music-bus RMS in each. |
| C2 | Transitions between states **crossfade** (or beat-match), never hard-cut. | Overlap window where the outgoing and incoming layer are both non-zero; ≥ ~0.3 s. |
| C3 | No silence gap > 1 s at any transition. | Music RMS never floors for >1 s during a state change. |
| C4 | Tracks loop seamlessly (no gap/click at the loop point) and are not restarted from 0 on every room. | — |
| C5 | Boss has its own, distinct, more intense cue; victory/defeat has a resolution stinger. | Boss music differs from combat music (different source/layer id or spectrum). |
| C6 | Pause/menu overlay ducks or low-passes the bed rather than killing it. | — |
| C7 | Music continues correctly across a tab blur/focus (either intentionally paused and resumed cleanly, or kept running) — no double-start, no permanent silence after returning. | — |

### D. Spatial SFX (the "spatial SFX triggers" half of the spec)

| # | Item | Test |
|---|---|---|
| D1 | Sounds emitted from world positions are **panned**: a source left of the listener is louder in L than R and vice versa. | |L−R| meaningful, sign flips with the source side. Expect ≥ 3 dB inter-channel difference at a clearly off-centre source. |
| D2 | Distance attenuation: a far source is measurably quieter than a near one, with a max distance beyond which it is inaudible. | Monotonic falloff. |
| D3 | The listener tracks the player/camera and updates as the player moves — panning is not frozen at spawn. | |
| D4 | UI sounds are **2D** (equal L/R, no distance attenuation) — menus must not pan. | |
| D5 | Coverage of the sim's meaningful events: player hit, enemy hit, kill, heal, skill cast, telegraph/warning, boss slam/quake, pickup, UI click/hover/back, level-up/reward. Every one of these fires an audible cue at the right tick. | A silent kill or a silent telegraph is a gameplay information failure, not just polish. |
| D6 | Telegraph/warning cues are distinct and readable above the rest of the mix — audio is a dodge cue in this genre. | |
| D7 | Cues are pitch-/gain-varied per instance (±small random) so repeats don't sound robotic. | |

### E. Autoplay / Web Audio correctness (HTML5 games)

| # | Item | Test |
|---|---|---|
| E1 | The AudioContext is created (or resumed) only on a real user gesture; no unhandled `NotAllowedError` / "AudioContext was not allowed to start" console error. | Console clean on a gesture-less boot. |
| E2 | If the context starts suspended, the game **tells the player** ("click to enable sound") rather than silently shipping a dead mixer. | Visible affordance. |
| E3 | After the first gesture, audio starts promptly (< ~200 ms) and the state is `running`. | |
| E4 | Nothing is permanently lost because it was triggered while suspended (no stuck/queued voices firing all at once on resume). | |
| E5 | Assets load without blocking the first frame; a missing/failed decode degrades silently, never a page error. | Boot console has no uncaught error. |
| E6 | Exactly one AudioContext for the app lifetime (browsers cap ~6); navigating between screens does not leak contexts. | |

### F. Settings UI / persistence / a11y

| # | Item | Test |
|---|---|---|
| F1 | Settings persist across a reload (localStorage or save file) and are re-applied to the buses on boot, not just to the slider positions. | Measured gain after reload equals the set value. |
| F2 | Sliders are operable by **mouse drag**, by **click on the track**, and by **keyboard** (Tab to focus, Arrow keys to change, Home/End) — native `<input type=range>` or an ARIA slider with full key handling. | |
| F3 | Focus is visible, tab order is sane, the audio tab is reachable by keyboard from the settings root, and Escape closes without losing changes. | |
| F4 | Each control has an accessible name/role (screen readers + `aria-valuenow`). | |
| F5 | Changes apply **live** while dragging (no Apply button required), and a Reset-to-default exists. | |
| F6 | Settings survive a mid-run change and do not disturb the sim (no tick loss, no pause bug). | |

### G. Mix balance

| # | Item | Test |
|---|---|---|
| G1 | At default settings, SFX peaks sit **above** the music bed by a sane margin (roughly 6–12 dB) so gameplay reads over the score. | Measured peak SFX vs music RMS. |
| G2 | The music bed itself sits low enough not to mask telegraphs (music RMS typically −22 to −18 dBFS in a busy scene). | |
| G3 | No clipping (sample |x| ≥ 1.0 / peak > 0 dBFS) during the loudest scene (boss fight with many voices). | 0 clipped samples. |
| G4 | No DC offset / no runaway sustained level after long play. | |

Total checklist items: **A1–A8 (8) + B1–B7 (7) + C1–C7 (7) + D1–D7 (7) + E1–E6 (6) + F1–F6 (6) + G1–G4 (4) = 45 items.**

---

## STEP 2 — context read (PLAN §1.5, §3.2, §3.5, §6.4, §6.6, §7 M3 gates G3.1–G3.10, §8; build-M3.md claims)

Build under test: v0.5.62 (`__echoes.version`, captures/gntcaudio1-scout.json). `git log -- src` since 04:28 is empty and
`git status src server` is clean, so every gntcaudio1-* capture (04:32–05:07) and every re-run below measures the same build.
Harness: tools/gntcaudio1-lib.mjs = `launchEchoes({ gpu: true, autoplay: true })` (§6.7 Audio profile,
`--autoplay-policy=no-user-gesture-required`) + `openEchoes` + `waitReady`.

## STEP 3 — probes already captured by the previous instance (re-read, evidence kept)

- scout (captures/gntcaudio1-scout.json): defaults master .8 / music .6 / sfx .8 / ambient .6 / ui .7, all `log`;
  live params master 0.6903 (−3.22 dB), music 0.4281 (−7.37 dB), effective music −10.59 dB. Matches PLAN §3.2/§3.5.
- curves v1 (captures/gntcaudio1-curves.json): AudioParam dB exact to ±0.001 dB on all 30 rows (e.g. log .25 −20.000,
  linear .75 −2.499). Tone-RMS column is NOT usable for the master rows (ambient bed leaks onto the master tap: master
  linear 1.0 read −15.77 vs log 1.0 −14.32 at the same unity gain) and integrated RMS is window-dependent (±0.58 dB between
  identical runs). Re-measured cleanly in STEP 4. Ramp: master 1.0→0.1 reads 0.924 @0 ms, 0.470 @25 ms, 0.227 @52 ms,
  0.126 @107 ms, 0.1002 @242 ms = one-pole ~30 ms de-zipper (A3 met). Composition master log .5 × music log .5 =
  −20.00 dB effective, tone −39.64 vs −19.64 base (A5 met).
- mix2/mix3 (captures/gntcaudio1-mix2.json, gntcaudio1-mix3.json) — PEAK based, score silenced, ambient channel muted:
  decoupling: sfx tap peak −14.99 with music at 1 / 0 / .33 and with ui+ambient at 0 (Δ 0.00 dB); music tap −14.99 with sfx at
  1 / 0 / .40 (Δ 0.00 dB). Master 1→.5 (log): sfx/music/ui taps and master tap via sfx/music/ui all −10.00 dB (Δ spread 0.00).
  Mode switch keeps loudness: music log .50 (−10.000 dB) → linear .32 (−9.897 dB). Music mute: music tap −999 while sfx
  tap unchanged −14.99. Spatial, listener-relative (mix3): centre L−R 0.04 dB; +6 u R−L 10.41 dB; −6 u L−R 10.34 dB;
  ±2 u 4.24 / −4.13 dB; 3 u RMS −21.07 vs 12 u −29.12 (8.05 dB quieter); ahead/behind 6 u |L−R| ≤ 0.11 dB.
  NOTE mix2 absolute-x spatial numbers are invalid (engine.update re-seats the listener from the camera every frame, so
  setListener(0,0) is overwritten: listener read back at x −2.90); mix3 is the valid measurement.
  NOTE `testTone('ui', {x:12})` panned (L−R 17.2 dB) — a probe forcing coordinates onto the UI bus; real UI cue pan is
  checked from cueLog in STEP 5.
- autoplay (captures/gntcaudio1-autoplay.json), NO flag, `?fresh=1`, 4 s idle: `state 'locked'`, prompt "Press any key or
  click" visible, 0 console lines matching autoplay/NotAllowed/[error]; Space / click / touch(synthetic) / Esc-then-Space →
  `running` at the first poll (0 ms polled, 118–129 ms wall incl. CDP round trip), menu music −22.0 dB short RMS, prompt gone;
  Esc alone leaves it `locked` (spec: Esc grants no activation). With the flag: never prompted, `running` from the first
  sample, 0 page errors.
- ui2 (captures/gntcaudio1-ui2.json, gntcaudio1-audiotab2.png, gntcaudio1-audiotab-changed.png): Audio tab reached by the
  `E` tab key; 5 native `<input type=range>` (0–1 step .01, aria-label, aria-valuetext "80 % · −3.2 dB"); per channel
  Curve / Mute / Test buttons + live meter bar; Mute-on-focus-loss switch; Reset; Back. Keyboard: 10×ArrowLeft on Master
  0.80→0.30, live param −17.35 dB; **Home and End do nothing** (value stays 0.30). Mouse click at 25 % of the Music track →
  0.24 / −20.59 dB. Curve button: log .30 (−17.37 dB) → linear .14 (−17.08 dB), label "Curve: Linear". Mute button: master
  param −999, music tap −999, aria-pressed true, label "Muted"; click again restores −17.08. Persistence across a real reload:
  all 16 audio.* keys identical, live params master −7.535 / music −15.391 / sfx −0.630, ui mute gain 0.
- combat (captures/gntcaudio1-combat.json) and boss (captures/gntcaudio1-boss.json): numbers used in STEP 5 tables;
  the boss run's cost p95 1.7 ms (> G3.10's 1 ms) must be reproduced before it is claimed (STEP 5).
- music v1 (captures/gntcaudio1-music.json / music2.json): INVALID for transitions — the page stayed on app state
  `title` for all 64 s (1281/1281 samples `title|menu`), so only the menu state and the blur test are usable:
  blur → master param −999 dB, refocus → −3.219 dB, context `running` (mute-on-blur works, C7 met for hidden/visible).

## STEP 4 — G3.1 curves, clean re-measure (tools/gntcaudio1-curves2.mjs → captures/gntcaudio1-curves2.json)

Method: score set to `silence`, Ambience channel muted, every other channel at linear 1.0 except the one under test;
-18 dBFS 440 Hz testTone of 1500 ms, read window (700 ms) fully inside the tone; three independent readings:
live AudioParam, the engine's meter tap, and **our own AnalyserNode pair on ctx.destination** (tools/gntcaudio1-tap.mjs wraps
AudioNode.connect before any page script so whatever the game connects to the destination also feeds our splitter —
the game graph is untouched). Level relative to the same channel/mode at s = 1.

| ch · mode | s=.25 (exp) | s=.50 (exp) | s=.75 (exp) | s=0 | abs @1 |
|---|---|---|---|---|---|
| master · linear | param −12.041 · tap −12.04 · out −12.04 (−12.04) | −6.021 · −6.02 · −6.03 (−6.02) | −2.499 · −2.50 · −2.50 (−2.50) | −999 on all three | tap −18.00 / out −18.00 |
| master · log | −20.000 · −20.00 · −19.99 (−20.00) | −10.000 · −10.00 · −10.00 (−10.00) | −4.150 · −4.15 · −4.16 (−4.15) | −999 | −18.00 / −17.99 |
| music · linear | −12.041 · −12.04 · −12.04 | −6.021 · −6.02 · −6.02 | −2.499 · −2.50 · −2.51 | −999 | −18.00 / −17.99 |
| music · log | −20.000 · −20.00 · −20.01 | −10.000 · −10.00 · −10.01 | −4.150 · −4.15 · −4.17 | −999 | −18.00 / −17.99 |
| sfx · linear | −12.041 · −12.04 · −12.04 | −6.021 · −6.02 · −6.02 | −2.499 · −2.50 · −2.50 | −999 | −18.00 / −18.00 |
| sfx · log | −20.000 · −20.00 · −20.01 | −10.000 · −10.00 · −10.00 | −4.150 · −4.15 · −4.16 | −999 | −18.00 / −17.99 |

30/30 rows inside G3.1 (param ±0.1 dB, tap ±0.5 dB); worst independent-analyser error 0.02 dB. Linear 25 % = −12.04 dB and
log 25 % = −20.00 dB differ by 7.96 dB (B5 met: the mode is a real, measurable law change). Log 50 % = −10 dB (B2: inside
the shipped-game −12…−20 dB band only at the lower edge — −10 dB is gentler than a 40–60 dB-range fader, advisory only).
A4 master silence at the destination: boss score playing at unity (out RMS −11.97, peak −3.03 dBFS) → Master Mute: out
−999 dB (24 analyser frames) even with a −6 dBFS tone + ui_confirm fired; Master level 0: −999 dB. Exactly ONE
AudioContext for the whole session (E6), 0 page errors.

## STEP 5 — music by the real journey (tools/gntcaudio1-music3.mjs → captures/gntcaudio1-music3.json)

Plain URL `?fresh=1` (audio flag) → title → **New Game by ArrowDown+Enter** (focus label "New Game") → camp → **held W
2.53 s into the portal + E** → combat room 1 → Esc pause / Esc resume → killAllEnemies → skipToRoom 8 (boss) →
bossHp .001 + killAll → victory stinger → camp → startRun → party HP forced to 0 → defeat stinger → camp. Music tap
sampled every 50 ms (1447 samples, 72 s); 3 s centroid windows per state.

| state | engine bpm | music-tap centroid | RMS (3 s) | peak |
|---|---|---|---|---|
| menu (title) | 56 | 351 Hz | −24.76 | −12.15 |
| camp | 72 | 290 Hz | −23.91 | −12.89 |
| combat | 104 | 202 Hz | −24.48 | −13.88 |
| boss | 127 | 209 Hz | −24.52 | −12.12 |
| victory (stinger) | 152 | 250 Hz | −22.62 | −12.17 |
| defeat (stinger) | 44 | 115 Hz | −22.38 | −13.40 |

Distinctness (G3.5 ≥ 15 % tempo OR centroid): closest pairs boss/combat tempo +22 % (centroid only +3.5 %),
victory/boss +20 %, camp/menu +29 %, menu/defeat +27 % → met. Boss is the combat theme at ×1.22 tempo with the same
loudness (−24.5 dB) and near-identical spectrum — distinct by the gate, but NOT a new, bigger cue (C5 partially met).

| transition (t) | crossfade flag run | engine crossfadeMs | tap median before → min in [−0.5 s, +3 s] |
|---|---|---|---|
| menu→camp (9.27 s) | 1981 ms | 2000 | −26.49 → −27.07 (−0.58 dB) |
| camp→combat (19.74 s) | 1515 ms | 1500 | −24.61 → −27.13 (−2.52) |
| combat→boss (38.27 s) | 1999 ms | 2000 | −24.95 → −25.66 (−0.71) |
| boss→victory (44.93 s) | 1477 ms | 1500 | −24.68 → −29.09 (−4.41) |
| victory→camp (48.46 s) | 2492 ms | 2500 | −24.14 → −29.17 (−5.03) |
| camp→combat (55.56 s) | 1509 ms | 1500 | −24.32 → −27.39 (−3.07) |
| combat→defeat (61.82 s) | 1492 ms | 1500 | −24.83 → −25.22 (−0.39) |
| defeat→camp (65.85 s) | 2507 ms | 2500 | −24.38 → −27.01 (−2.63) |

No hard cut (every change is a 1.48–2.51 s crossfade, i.e. 1.5/2.0/2.5 s ± one 50 ms sample); longest music-tap run
below −50 dBFS over the whole journey = 150 ms (inside steady camp music at 13.8 s, not at a transition) → C1, C2, C3,
G3.5 met. Stingers: victory 3.6 s, defeat 4.05 s then camp. Pause duck (C6): music tap −24.59 → −29.34 dB (−4.75 dB),
centroid 165 → 134 Hz (low-pass), `ducked:true`, sim tick frozen (Δ0 over 0.5 s); resume −24.44 dB. One AudioContext
for the whole journey; 0 page errors; 0 console errors.

## STEP 6 — fight by real input: balance, boss no-clip, coverage (tools/gntcaudio1-fight.mjs → captures/gntcaudio1-fight.json)

`?menu=0&seed=7&fresh=1`, audio flag, one AudioContext. Camp → held W to the portal → E → room 1; mouse held (basic
fire) + keys 1–4 + Space for 14 s at DEFAULT sliders (allies' HP forced to 0.35/0.5/0.3 so the Healer has targets).

G3.4 balance (defaults): room-1 combat: master median 400 ms RMS **−22.10 dBFS** (gate −24…−14), SFX-tap peak −8.35 vs
music-tap RMS −24.38 → **+16.0 dB**, UI peak −17.34 → **+7.0 dB** over music. Boss room at defaults (15 s, 8–10 live
hostiles): master median −20.37, SFX peak −3.90 vs music RMS −23.83 → +19.9 dB, master peak −3.78. Met (G1/G2 met).

G3.3 at 100 % sliders, boss room, party kept alive, adds topped up every 0.4 s: live hostiles sampled every 100 ms
(330 samples, 33 s): min 5, p10 8, median 9, max 10 (≥ 6 adds for ≥ 90 % of the fight). prelimit (clipper input) peak
**−1.82 dBFS, 0.000 % of samples over −1 dBFS**; limiter max reduction 5.81 dB, 100 % of 301 100-ms windows ≤ 6 dB, 0
excursions > 10 dB; master tap peak −1.81, clipCount 0 → met. 1724 cue requests, 247 merged by the 30 ms same-cue
cooldown, voice peak 16 of 48, 2 stolen (A7 met). Engine cost p95 **0.9 ms** (max 1.9) this run; combat p95 0.5 ms.
The previous instance's heavier storm (4 boars every 3 s uncapped, captures/gntcaudio1-boss.json) read p95 **1.7 ms**
(> G3.10's 1 ms) — load-dependent, reported as an advisory, not reproduced at ≥ 6 adds.

Coverage in room 1 (sim event count → cue count, same window): hit 13 → impact 10 + hurt 3; death 7 → kill 7;
heal 5 → heal 5; skill_cast 6 → cast_heal 6; ally_cast 12 → ally_cast_* 12; telegraph_start 4 → telegraph 4;
telegraph_resolve 3 → telegraph_hit 3; intent 3 → dodge 3; intent_denied 6 → deny_empty 6; spawn_telegraph 4 →
shimmer 4; enemy_fire 3 → spit 3; ally_basic 16 → bow 16; azone_tick 12 → azone_pulse 12; glint/node/reward/room_clear
1:1. Boss phase (cueLog window, 600 entries/17 s): quake_warn 2, quake_hit 2, trample 5, horn 1, boss_death 1,
heal 29 + heal_crit 1 for 30 heal events, sparkle 25 for 25 full_heal. Unvoiced events seen: status_apply,
heal_override (not in the PLAN §3.5 table). Draft/path pages: ArrowLeft/Right produced **no** ui_move cue, while pause
menu arrows produced ui_move ×4 and the Esc resume ui_back (run-UI pages are silent to navigation — advisory).

Real-cue pan in fight.json phase 4 is INVALID (sim still running between rooms: aura/zone voices on the same tap
flipped signs) — re-measured with the sim frozen in STEP 7. Leak check in fight.json also invalid (boss still alive,
party still fighting) — re-measured in STEP 7.

## STEP 7 — second fight pass (tools/gntcaudio1-fight2.mjs → captures/gntcaudio1-fight2.json, gntcaudio1-audiotab-bottom.png)

Menu UI cues by real keys on the title + Settings (defaults, per 450 ms window): ArrowDown/Up on the title → ui_move
(peak −25.75 / −25.39 dBFS); Enter on Settings → ui_confirm (−20.35); E → ui_tab (−24.71); ArrowDown/Up in the tab →
ui_move; ArrowLeft/Right on Master → ui_slider (−24.24 / −25.04); Enter on the switch → ui_confirm ×2; Esc → ui_back
(−22.38). Every UI cue L = R (2D, D4 met). Menu clicks vs the menu score in the same windows: ui_move −25.75 vs music
RMS −22.40 (**−3.35 dB, below the bed**), ui_slider −24.24 vs −23.30 (−0.94), ui_tab −24.71 vs −26.93 (+2.22),
ui_confirm −20.35 vs −24.24 (+3.89). G3.4's UI clause is a combat gate (met there, +7.0 dB); on the title the
navigation ticks sit at or under the music RMS → advisory.
Mute-on-blur switch reached by 10 ArrowDowns, auto-scrolled fully into view (top 691 / bottom 738 of 900 px).

Real-cue panning with the sim FROZEN (no other voice on the tap; `voices().active` 0): impact, kill, heal, cast_heal,
telegraph, quake_warn, bow each read R−L **+10.38 dB at +6 u, −10.37/−10.38 dB at −6 u, 0.00 dB at 0**; ui_confirm
0.00 (2D). Real sim cues during a real-input fight: 117 cueLog entries matched to the listener sampled at 16 ms
(≤ 60 ms apart); 43 with |dx| ≥ 2 u → pan sign agrees with the side in **43/43** (D1, D3 met).
Leak: 3.03 s after the last sim cue (boss killed → victory) `voices().active` = **0** (G3.10 leak clause met);
voice peak 14 of 48. One AudioContext, 0 page errors.

## STEP 8 — resume (second instance, 2026-09-24 10:2x): build unchanged, unrecorded probes folded in, keyboard/pad re-measured

Build drift check: `git log --since="2026-09-24 04:00" -- src server` empty, `git status --short src server` empty, page reports
`__echoes.version` v0.5.62 (captures/gntcaudio1-keys.json) → every capture below and above measures the same build.

Unrecorded probes from the first instance (files existed, checkpoint did not mention them):
- ui4 (captures/gntcaudio1-ui4.json, gntcaudio1-audiotab-reset.png): mouse click at 50 % of the Music track → nav focus AND DOM
  focus "Music", value 0.5; two ArrowLefts then move Music 0.5 → 0.4 (keys follow the clicked slider). Hovering the SFX track
  (no click) moves focus to "Sound Effects" and ArrowRight sets 0.80 → 0.85. Click on the SFX Mute button → `audio.sfx.muted`
  true; Enter on the now-focused button → false. Reset to defaults by mouse: opens a confirm (stack title/settings/confirm,
  Cancel focused by default — a safe destructive default); clicking "Reset" restores master .8 / music .6 / sfx .8, live params
  master −3.219 / music −7.370 dB, toast "Audio settings reset to defaults" (PNG). 0 page errors.
- ui3 (captures/gntcaudio1-ui3.json, gntcaudio1-audiotab-1024.png): per-channel Test buttons by mouse, score pinned to silence,
  meters reset before each click — Master test: sfx tap −15.42 / ui −20.40 (cues test_ui@ui + test_sfx@sfx), Music test: music tap
  −20.09 (test_music@music), SFX test: sfx −14.90, Ambience test: ambient −14.60 (test_ambient), Interface test: ui −20.47
  (test_ui) — each test lands on its own bus only (other taps stay at the −186…−190 dB baseline). Mouse DRAG on Master with the
  button held: 10 samples during the drag 0.76/−3.95 → 0.30/−17.36 dB, the live param follows every sample (live apply while
  dragging, F5 met), readout "30 % · −17.4 dB". Esc after changes: `echoes.settings` in localStorage holds audio.master.level
  0.2 (changed value kept, 716 bytes, v 1, 16 audio.* keys). Reset click → confirm; Enter on the confirm = Cancel (values
  unchanged) — consistent with ui4. 1024×576: 23 visible controls, min hit 90×42 px, layout intact (PNG). The ui3 `keys`/`pad`
  rows are INVALID as evidence: the script gave DOM focus with `el.focus()` to Music while the app's nav focus stayed on Master,
  so the arrows moved Master (0.3 → 0.2 in storage) and the probe read Music — re-measured by real focus below.
- blur (captures/gntcaudio1-blur.json), a REAL second tab brought to front (not a synthetic event): muteOnBlur on → hidden:
  master param −999 dB, our destination analyser −999 dB, context still `running`, sim tick frozen 293 → 293; front again →
  −3.219 dB, out −23.6 dB, tick advancing (421). muteOnBlur off → hidden: master −3.219, out −21.25 dB (keeps playing, as the
  switch says). G3.9 mute-on-blur met with the real gesture; 0 page errors.

Keyboard + pad by REAL nav focus (tools/gntcaudio1-keys.mjs → captures/gntcaudio1-keys.json), Settings > Audio opened by
ArrowDown/Enter/E, focus lands on "Master" (DOM focus = the range input):

| input | result |
|---|---|
| ArrowLeft ×2 | 0.80 → 0.70, live −5.146 dB (0.05 per press) |
| **Home** | 0.70 → 0.70 (no change) — **not handled** |
| **End** | 0.70 → 0.70 (no change) — **not handled** |
| PageDown / PageUp | switches tab Audio → Gameplay (focus "Screen shake") and back to Audio/Master — tab keys, not slider keys |
| Shift+ArrowLeft | 0.70 → 0.65 (same 0.05 step; no fine/coarse modifier) |
| ArrowDown → ArrowRight → ArrowRight → ArrowRight → ArrowLeft | Curve: Log (perceptual) → Mute → Test Master → Test Master (row end) → Mute |
| Enter on Test Master | cues ui_confirm@ui, test_ui@ui, test_sfx@sfx; peaks sfx −21.02 / ui −17.39 dBFS |
| Enter on Mute | `audio.master.muted` true, param −999 dB, label "Muted", aria-pressed "true"; Space → unmuted, −6.215 dB |
| Enter on Curve | log 0.65 (−6.215 dB) → linear 0.49 (−6.196 dB), label "Curve: Linear"; Enter again → log 0.65 (−6.215) |
| pad D-pad left ×2 on Master | 0.65 → 0.55 (−8.625 dB); right → 0.60 |
| pad D-pad down / right / right / A | Curve → Mute → Test Master → A fires test_ui + test_sfx |
| Tab ×8 | Music → Curve → Sound Effects → Curve → Ambience → Curve → Interface → Curve (Tab = next row; Mute/Test are reached by Left/Right inside the row, never by Tab) |
| Escape | stack back to title, values kept |

0 page errors. The audio tab is fully operable by keyboard, mouse (ui2/ui3/ui4) and pad → G3.9 met; Home/End dead = F2
partially met (advisory: a native `<input type=range>` supports them, the app's key router swallows them).

Registry (same capture): `audio.eventTypes()` lists 95 sim event types incl. every §3.5 row; `audio.cues()` lists 112 cues
incl. shoot / whiff / rally / mark / draft_take / draft_decline / path / shop_open / purchase / camp_return.

Coverage table from ALL critic captures (cueLog entries carry `event` → `cue`; aggregated over combat/boss/fight/fight2/music3):
row 1 ally_basic 289 played (bow 140 / swing 150), enemy_fire 13 (spit); row 2 hit 500 played (impact 425 / crit 26 / hurt 169),
hit_immune not seen; row 3 death 67 (kill 76, boss_death 1); row 4 heal 25 (heal / heal_crit), full_heal 17 (sparkle), aura_pulse 16
(aura), azone_tick 106 (azone_pulse), zone_tick not seen; row 5 skill_cast 12 (cast_heal), ally_cast 130 (ally_cast_archer/tank/sword),
skill_bolt_spawn 180 (bolt), azone_spawn 29, zone_spawn/echo/bounce/siphon/detonate not seen; row 6 intent 3 (dodge), dash_end 3,
intent_denied 12 (deny_empty); row 7 all eight events (telegraph 28, telegraph_hit 28, quake_warn 10, quake_hit 11, trample 20,
horn 2, roar 1, shimmer 3 played / 15 cooldown-merged); row 8 downed 7 played (16 requested), revive_start 2 (revive_hum), revive 3
(revive), revive_break 1 (revive_snap), rally / mark not seen; row 9 room_start, wave_start, room_cleared (room_clear), reward_offer
(reward), glint_gain (glint), run_start, run_end, plus draft_taken → `draft_take` and path_chosen → `path` as `sound` events at
ticks 1523 / 1616 (fight.json snd2); node_granted → node_grant; shop_* / socket_* / return_to_camp not seen; row 10 UI cues by real
keys (STEP 7). Every §3.5 ROW fires a cue → G3.7 met per row. Not yet seen by this critic: basic_fire (the Healer's own basic
attack — the previous fight probe held the LEFT button; TESTING.md says basic attack is the RIGHT button) and return_to_camp
→ measured in STEP 9.

## STEP 9 — coverage of the events no earlier capture saw + intensity layering (tools/gntcaudio1-cov2.mjs → captures/gntcaudio1-cov2.json; tools/gntcaudio1-camp.mjs → captures/gntcaudio1-camp.json)

`?menu=0&seed=7&fresh=1`, audio flag, camp → held W into the portal (`inPortal` true) + E → combat room 1, every sim event type
and every `sound` event recorded, cueLog read per phase.

| scenario | sim events | cues (sound events, cueLog) | taps |
|---|---|---|---|
| **RIGHT mouse held 3 s** (basic attack per TESTING.md) | basic_fire **7**, hit 1, death 1 | `shoot` **7 requested / 7 played** (sfx bus, gainDb −11, pan −0.002…−0.005 at the listener), impact 1, kill 1 | sfx peak −12.91, master peak −9.30 dBFS |
| LEFT mouse held 3 s (comparison) | basic_fire 0, hit 5, death 2 | shoot 0; impact 3 played + 1 cooldown-merged; kill 2 | sfx peak −11.03 |
| giveSkill `sanctuary` (→ slot 2) then keys 1-4 ×8 | zone_spawn 1, zone_tick 2, skill_cast 3, azone_spawn 2, azone_tick 9, intent_denied 5 | `zone_spawn` 1/1, `zone_pulse` 2/2, `cast_zone` 1/1, `cast_heal` 2/2, `deny_cd` 3/3 (−20 dB), `deny_empty` 2/2 (−14 dB: on-cooldown 6 dB quieter than empty-slot, as §3.5 asks) | — |
| skipToRoom 8 → bossHp .001 + killAll, 12 s | run_end 1, death 4, room_cleared 1, **return_to_camp 0** | `boss_death` 1/1 (−6 dB), kill 3/3, `run_end` 1/1 (ui, −12 dB), `room_clear` 1/1; `camp_return` 0 | boss → victory at +4.5 s → camp music at +8.0 s (scene camp); `voices().active` **0** 3 s later; 246 requested / 212 played / 34 cooldown-merged / 0 locked / 0 cap / 0 error, peak 14 voices |

`return_to_camp` never fires: the run returns to camp automatically after the stinger (music3 + cov2) and the pause menu offers only
Resume / Settings / Save Game / Load Game / Save & Quit to Title (camp.json `pause.labels`) — the `camp_return` cue is a dead
mapping in this build (nothing a player can reach), advisory only. (My walker then pressed Enter on the quit-confirm's default
"Keep Playing" — a probe artifact; the confirm defaulting to the safe button is correct UX.) Both runs: 0 page errors, 0 console
lines matching error/autoplay/NotAllowed.

Combat music intensity (camp.json, 3 s windows, `music().intensity` sampled every 100 ms + music-tap meter):

| window | state · bpm | intensity min/med/max | live hostiles med/max · party HP | music RMS / peak | centroid |
|---|---|---|---|---|---|
| room 1 as rolled | combat · 104 | 0.26 / 0.33 / 0.33 | 2 / 2 · 98 % | −24.81 / −14.51 | 174 Hz |
| +8 spawned boars | combat · 104 | 0.19 / 0.26 / 0.49 | 1 / 4 · 98 % | −24.36 / −14.04 | 143 Hz |
| +8 boars, party forced to 15 % HP | combat · 104 | **0.60 / 0.67 / 0.82** | 2 / 3 · 15 % | −24.26 / **−11.90** | **352 Hz** |
| room cleared (reward) | combat · 104 | 0.08 / 0.08 / 0.08 | 0 / 0 · 100 % | −24.56 / −15.38 | 123 Hz |
| boss, 69 % HP, 4 hostiles | boss · 127 | 0.58 / 0.61 / 0.74 | 0 / 3 · 84 % | −24.51 / −12.64 | 180 Hz |
| boss forced to 10 % HP (died → victory) | victory · 152 | 0 / 0.49 / 0.97 | 1 / 3 · 97 % | −23.60 / −10.49 | 220 Hz |

The intensity layer is real and audible: party danger raises intensity ×2 (0.33 → 0.67), doubles the spectral centroid (174 →
352 Hz) and lifts the peak 2.6 dB while the RMS stays glued at −24.3 ± 0.3 dBFS (the glue compressor holds the bed level);
a cleared room falls to 0.08 / 123 Hz (benchmark A8 met, Hades-style layering rather than a flat bed).

## STEP 10 — PLAN §7 M3 gates, literally, from this critic's own measurements only

| gate | requirement | measured | met |
|---|---|---|---|
| G3.1 Curves | s ∈ {0,.25,.5,.75,1} equals the §3.5 table ± 0.1 dB (param) / ± 0.5 dB (tone RMS on the tap), both modes, Master/Music/SFX | 30/30 rows: param worst error 0.000 dB, tap worst 0.01 dB, independent destination analyser worst 0.02 dB (curves2.json, STEP 4) | **yes** |
| G3.2 Decoupling | Music 100→0 moves the sfx tap ≤ 0.1 dB and vice versa; Master moves every tap by the same dB ± 0.2 | sfx tap Δ 0.00 dB across music 1/0/.33; music tap Δ 0.00 across sfx 1/0/.40; Master 1→.5 log: all five taps −10.00 (spread 0.00) (mix2.json) | **yes** |
| G3.3 No clipping | boss fight ≥ 6 adds at 100 %: clipper-input samples > −1 dBFS ≤ 0.1 %; GR ≤ 6 dB in ≥ 95 % of 100 ms windows; never > 10 dB for > 50 ms | hostiles min 5 / p10 8 / med 9 over 33 s; prelimit peak −1.82 dBFS, **0.000 %** over −1; max GR 5.81 dB, **100 %** of 301 windows ≤ 6 dB, 0 excursions > 10 dB; master peak −1.81, clipCount 0 (fight.json, STEP 6) | **yes** |
| G3.4 Balance | defaults, combat: median master RMS (400 ms) in −24…−14; SFX peaks ≥ 6 dB over music RMS; UI clicks ≥ 3 dB over music RMS | median **−22.10** dBFS; SFX peak −8.35 vs music RMS −24.38 = **+16.0 dB**; UI peak −17.34 = **+7.0 dB** (fight.json) | **yes** |
| G3.5 Music | menu/camp/combat/boss/victory/defeat audible + distinct (tempo or centroid ≥ 15 %); crossfades 1.5–2.5 s; never < −50 dBFS for > 1 s | RMS −22.4…−24.8 in all six; closest pair boss/combat tempo +22 %; 8 transitions all 1.48–2.51 s; longest run below −50 dB 150 ms (music3.json, STEP 5) | **yes** |
| G3.6 Spatial | +6 u: R−L ≥ 6; −6 u: L−R ≥ 6; 0: ≤ 1; 12 u ≥ 6 dB quieter than 3 u | **+10.41 / 10.34 / 0.04 dB; 8.05 dB** quieter (mix3.json); real sim cues +10.38 / −10.38 / 0.00 with the sim frozen, 43/43 live cues on the correct side (fight2.json) | **yes** |
| G3.7 Coverage | every row of the §3.5 cue table fires a cue (cueLog + sound events) in a scripted run | all 10 rows fire (STEP 8 table) incl. basic_fire → shoot 7/7, zone_spawn/zone_tick, downed/revive family, draft_take/path, run_start/run_end, UI nav (STEP 7/9) | **yes** |
| G3.8 Autoplay | no flag: no context before the gesture, 0 errors/warnings, key (not Esc)/click/touch → running ≤ 100 ms, prompt clears, keyboard-only hears the menu; with the flag no prompt | `locked` for 4 s idle, 0 matching console lines, prompt visible; Space / click / touch → `running` at the first poll (engine 0 ms; 118–129 ms wall = CDP round trip), menu music −22.0 dB, prompt gone; Esc alone stays locked; with the flag no prompt, 0 errors (autoplay.json, STEP 3) | **yes** |
| G3.9 Persistence | levels/modes/mutes persist across reload; mute-on-blur works; tab fully operable by keyboard, mouse and pad | reload: 16 audio.* keys identical, live params re-applied (ui2.json); real tab switch: −999 dB behind / −23.6 back, off-switch keeps −21.25 (blur.json); keyboard rows/buttons, mouse click/drag/hover, mocked pad D-pad + A all operate every control (keys.json, ui3/ui4.json) | **yes** |
| G3.10 Cost | main-thread ≤ 1 ms/frame p95; ≤ 48 voices; active ≤ 4 within 3 s of silence | p95 **0.9 ms** (max 1.9) in the ≥ 6-add boss fight, combat p95 0.5; voice peak 16 of 48; active 0 at +3 s after victory (fight.json, fight2.json, cov2.json). The first instance's heavier uncapped add storm read p95 1.7 ms (boss.json) — over the gate at a load above the gate's scenario | **yes** (thin headroom) |

10/10 gates met by re-measurement.

## STEP 11 — builder checkpoint claims (docs/gauntlet/build-M3.md) re-measured, never trusted

| builder claim | this critic's number | holds |
|---|---|---|
| G3.1 30/30 rows (param ± 0.1, tap ± 0.5) | 30/30, worst 0.02 dB on an independent analyser | yes |
| G3.2 0.00 / 0.00, master −10.00 on 5 taps | 0.00 / 0.00, −10.00 on 5 taps | yes |
| G3.3 boss @100 %: 0 % over −1 dBFS, 99.5 % windows ≤ 6 dB, master peak −1.5 | 0.000 %, 100 %, −1.81 | yes |
| G3.4 median −22.7, SFX +17 dB, UI +3.5…6.9 | −22.10, +16.0, +7.0 | yes |
| G3.5 tempos 56/72/104/127/152/44, crossfades 1.5–2.5 s, 0 ms below −50 | 56/72/104/127/152/44 identical; 1.48–2.51 s; 150 ms (inside steady camp music, not a transition) | yes |
| G3.6 10.4 / 0 / 8.1 dB | 10.41 / 0.04 / 8.05 | yes |
| G3.7 every row in one scripted run (67 cues) | every row, across real-input fights + scripted skips | yes |
| G3.8 unlock → running 0 ms, no prompt with the flag | 0 ms engine / first poll; no prompt with the flag | yes |
| G3.9 persist + blur + hidden + tab (keyboard/mouse/pad) | all re-measured incl. a real tab switch and a mocked pad | yes |
| G3.10 p95 0.4 ms, peak 7 voices | p95 0.9 ms with ≥ 6 adds (1.7 ms in a heavier storm), peak 16 voices | holds at the gate's load only; headroom is thinner than claimed |
| D7 mode switch keeps loudness | log 0.65 −6.215 dB → linear 0.49 −6.196 dB (Δ 0.02) | yes |
| D13 pause duck −5 dB + 1.3 kHz LPF | −4.75 dB, centroid 165 → 134 Hz, `ducked: true`, sim frozen | yes |
| D16 slider preview cue on settings changes | ui_slider on every arrow (−24.24 / −25.04 dBFS), audio sliders preview their own channel (Test rows land on their own bus only) | yes |
| D19 keep-alive: params live in silence | param reads exact in silence (curves2 with score pinned to silence) | yes |
| 1024×576 audit: 0 issues, min hit 42 px | 23 controls, min hit 90×42 px, layout intact (gntcaudio1-audiotab-1024.png) | yes |

## STEP 12 — blind benchmark scorecard (the STEP 1 checklist, scored only now)

| item | score | evidence |
|---|---|---|
| A1 bus graph, nothing bypasses Master | met | Master mute → destination −999 dB with a −6 dBFS tone + ui_confirm live (curves2); Master moves all 5 taps identically (mix2) |
| A2 decoupled buses | met | Δ 0.00 dB both directions (mix2) |
| A3 ramped gain changes | met | one-pole ≈ 30 ms: 0.924 @0 ms → 0.126 @107 ms → 0.100 @242 ms (curves) |
| A4 Master 0 % = digital silence | met | −999 dB at the destination analyser at level 0 and at mute (curves2) |
| A5 buses compose multiplicatively | met | master log .5 × music log .5 = −20.00 dB (curves) |
| A6 limiter/headroom policy | met | prelimit peak −1.82 dBFS, GR max 5.81 dB, 0 clipped samples in a 9-add boss fight (fight) |
| A7 voice cap + retrigger cooldown | met | 247 of 1724 requests merged by the 30 ms cooldown, 16/48 voices, 2 stolen (fight) |
| A8 intensity layering / ducking | met | intensity 0.08 → 0.33 → 0.67, centroid 123 → 352 Hz, peak +2.6 dB by danger (camp); pause duck −4.75 dB + LPF (music3) |
| B1 default law is perceptual, not raw linear | met | all 5 channels default `log` (s^1.661), scout |
| B2 50 % ≈ −12…−20 dB | partially | log 50 % = −10.00 dB: exactly the PLAN math, but at the gentle edge of shipped-game faders (curves2) |
| B3 endpoints agree (0 = silence, 1 = unity) | met | −999 at 0 in both modes; −18.00 tap for a −18 dBFS tone at 1 (curves2) |
| B4 monotonic, no plateaus | met | 0 < .25 < .5 < .75 < 1 in every row; 10 drag samples strictly falling (ui3) |
| B5 linear vs log modes measurably differ and are labelled | met | 25 %: −12.04 vs −20.00 dB (Δ 7.96); "Curve: Linear" / "Curve: Log (perceptual)" (curves2, keys) |
| B6 numeric readout + preview sound | met | "80 % · −3.2 dB" aria-valuetext; per-channel Test on its own bus; ui_slider tick per arrow (ui2/ui3/fight2) |
| B7 sane non-max defaults | met | .8 / .6 / .8 / .6 / .7 (scout) |
| C1 music in menu/camp/combat/boss | met | −24.76 / −23.91 / −24.48 / −24.52 dBFS (music3) |
| C2 crossfades, never hard cuts | met | 8/8 transitions 1.48–2.51 s (music3) |
| C3 no gap > 1 s | met | longest < −50 dB run 150 ms (music3) |
| C4 seamless loops, no restart per room | met | procedural score; room 1 → 8 skip produced no combat restart (camp.json transitions list) |
| C5 distinct, bigger boss cue + stingers | partially | boss = combat ×1.22 tempo, same RMS (−24.5) and centroid (209 vs 202 Hz); victory/defeat stingers exist (music3) |
| C6 pause ducks, does not kill | met | −4.75 dB + centroid 165 → 134 Hz, resumes −24.44 (music3) |
| C7 blur/focus handled cleanly | met | real tab switch: −999 behind, −23.6 back, context running, no double start (blur) |
| D1 panned by source side | met | ±10.38 dB at ±6 u, 43/43 live cues on the correct side (mix3, fight2) |
| D2 distance attenuation | met | 12 u is 8.05 dB quieter than 3 u (mix3) |
| D3 listener tracks the camera | met | listener re-seated from the camera every frame (mix2 note), live cues tracked (fight2) |
| D4 UI sounds are 2D | met | every UI cue L = R, pan null (fight2) |
| D5 coverage of meaningful events | met | STEP 8 table + basic_fire 7/7, zone, downed/revive, draft/path, reward, glint, UI (cov2) |
| D6 telegraph readable above the mix | partially | telegraph −7 dB / quake_warn −8 sit at the loudest cue tier with kill −7, impact −8 (cueLog gains); no dedicated headroom over hits |
| D7 per-instance variation | not met | 1,937 cueLog entries: constant gainDb per cue, no pitch/rate field exposed — nothing observable varies |
| E1 no autoplay error | met | 0 console lines matching autoplay/NotAllowed/error while locked (autoplay) |
| E2 player is told to click | met | "Press any key or click" while `locked` (autoplay) |
| E3 prompt start after the gesture | met | running at the first poll, menu music −22 dB (autoplay) |
| E4 nothing stuck from the locked period | met | locked cues dropped and counted (`dropped.locked`), no burst at unlock (autoplay, cov2) |
| E5 no page error, no blocking decode | met | 0 page errors across every run; synthesised assets |
| E6 exactly one AudioContext | met | context counter 1 for whole journeys (curves2, music3, fight, fight2) |
| F1 settings persist and re-apply to buses | met | 16 keys identical after reload, params −7.535 / −15.391 / −0.630 re-applied (ui2) |
| F2 mouse drag/click + keyboard incl. Home/End | partially | drag, click, hover, arrows (0.05/step), pad OK; **Home/End do nothing** in 3 runs (ui2, ui3, keys) |
| F3 visible focus, sane order, Esc keeps | met | orange focus ring (audiotab-1024.png); Q/E tabs, PgUp/PgDn tabs; Esc keeps master 0.2 (ui3) |
| F4 accessible names/roles | met | aria-label + aria-valuetext on ranges, aria-pressed on Mute, role=tab aria-selected (ui2/keys) |
| F5 live apply + reset | met | 10 samples live during the drag; Reset via confirm restores defaults (ui3, ui4) |
| F6 mid-run change harmless | met | sliders set to 100 % mid-boss with the fight running 33 s (fight) |
| G1 SFX peaks over music | met | +16.0 dB room 1, +19.9 dB boss (fight) |
| G2 bed low enough | met | music RMS −24.4 dBFS in combat (fight) |
| G3 no clipping | met | 0 clipped samples, prelimit −1.82 (fight) |
| G4 no DC / runaway | partially | 72 s journey RMS stable −22.4…−24.8 by state (music3); DC offset not measured directly |

**Score: 39 met / 5 partially / 1 not met of 45.** Real-world systems compared: Wwise/FMOD bus mixing as in Hades and Dead
Cells, the dB-perceptual slider standard of shipped PC games, HTML5 autoplay-correct games.

## VERDICT — PASS

Spec (audio manager with ambient/background music + spatial SFX triggers; configuration UI with decoupled linear/log sliders for
Master, Music, SFX): met and measured. PLAN M3 gates: 10/10 met by independent re-measurement. No crash, no page error, no data
loss, no broken core loop (camp → portal → room 1 → boss → victory → camp ran with audio on in cov2/camp). No benchmark item
missing whose absence a player would feel as broken.

Must-fix failures: **none**.

Advisories (polish, numbers cited):
1. Home/End do nothing on a nav-focused slider (keys.json: 0.70 → 0.70 twice; ui2, ui3 agree) — a native range supports them; the app's key router swallows them.
2. Title-screen navigation ticks sit under the menu score: ui_move −25.75 dBFS peak vs music RMS −22.40 (−3.35 dB), ui_slider −0.94 dB (fight2.json). The gate is combat-only (+7.0 dB there), but on the title the ticks are masked.
3. Boss music is the combat theme at ×1.22 tempo with the same loudness (−24.5 dBFS) and spectrum (209 vs 202 Hz) (music3.json) — distinct by the gate, not a bigger cue.
4. G3.10 headroom is thin: p95 0.9 ms with 9 live adds (fight.json); the first instance's uncapped add storm read 1.7 ms (boss.json).
5. Run-UI pages (draft/path) navigate silently — ArrowLeft/Right produced no ui_move while the pause menu ticks (fight.json); confirms (draft_take, path) do cue.
6. No observable per-instance gain/pitch variation (1,937 cueLog entries, constant gainDb per cue, no pitch field) — repeated hits/shots are identical.
7. `return_to_camp → camp_return` never fires in any reachable flow (automatic return after stingers, no pause-menu entry) (cov2.json, camp.json) — a dead mapping.
8. Log 50 % = −10 dB is exactly the PLAN math but the gentle edge of the shipped-game −12…−20 dB band (curves2.json).

Files: tools/gntcaudio1-*.mjs (probes), captures/gntcaudio1-*.json / .png (evidence). No src/**, server/** or PLAN.md edits; no
commits. No processes left running (every probe closes its own browser; the crashed first cov2 run left no Chrome carrying the
audio flag).
