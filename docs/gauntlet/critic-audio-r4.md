STATUS: COMPLETE
VERDICT: FAIL (resumed after the completeness audit) - audio engine + mixer at v0.5.124: every single-player result below still holds (G3.1-G3.10 in substance, 23/24 benchmark items met), and the audited multiplayer gap is now measured: a network GUEST follows every host music state, theme, stinger and voice teardown (music lag p50 90-190 ms; level voices gone within 0.26-3.0 s; Quit to Lobby and CAMPAIGN COMPLETE crossfade to camp on both), BUT the guest's music dropped to silence for 3.85 s (mpaudio-dev.json, engine meter 3600 ms) and 1.66 s (mpgap-dev.json, 1800 ms) at host-driven room changes, breaking G3.5 "never below -50 dBFS for > 1 s across any transition". Cause, reproduced deterministically in single player (stall-combat-final.json): the music sequencer runs off the render loop, so a frame-loop freeze of 2.5-4 s silences the music for 0.96-2.59 s even while the main thread is free, followed by a catch-up clump of -7..-10 dBFS (+4..+8 dB over the no-hitch peaks). 1 must-fix (AUD4-F1), 9 advisories.

# Critic — AUDIO ENGINE & MIXER, gauntlet round 4

Started 2026-09-27. Branch gauntlet, HEAD 9e7913c (v0.5.124 at start).

## Step log
- [x] S0 checkpoint file created

## 1. Blind benchmark checklist (written BEFORE inspecting any Echoes capture)

Sources: my own knowledge of shipped systems — Wwise/FMOD bus hierarchies as shipped in
Hades (Supergiant, FMOD Studio) and Dead Cells (Motion Twin, FMOD), the perceptual (dB)
volume slider convention of shipped PC games (Unreal/Unity mixer groups, Windows/Steam
titles), and HTML5/Web Audio games that follow the Chrome/Safari autoplay policy.

### A. Bus mixing (Wwise/FMOD, Hades / Dead Cells)
- B1 Bus graph Master -> {Music, SFX (+ Ambient/UI sub-buses)}. A child fader scales only its
  own bus; Master scales every child multiplicatively. Test: Music 100->0 leaves SFX bus RMS
  unchanged within 0.5 dB and vice versa.
- B2 Master mute gives digital silence at the output (< -90 dBFS) and un-mute restores the
  previous levels exactly (fader values survive the mute).
- B3 A master limiter / bus compressor: output true-peak never above 0 dBFS (shipped target
  ~ -1 dBTP) even in the densest moment (boss + adds) with every fader at 100%.
- B4 Fader moves are ramped (Wwise volume interpolation ~10-50 ms): no zipper/click when a
  slider is dragged.
- B5 State-driven music: distinct cues for menu / hub / combat / boss (Hades: House, Tartarus,
  boss). State changes crossfade (0.5-3 s) or bar-sync; no hard cuts, no silence gap > 1 s.
- B6 Pause snapshot: pausing attenuates or low-passes the game mix (Hades pause LPF) and
  gameplay SFX stop firing while paused; music continues (or ducks) — never total silence
  unless the player muted.
- B7 Voice limiting / priority: per-event instance caps so 20 simultaneous identical hits do
  not stack into a wall of sound or clip; a global voice cap with oldest/quietest stealing.
- B8 2D spatialisation for a top-down camera: emitter left of the listener is louder in L
  (>= 3 dB interaural difference), right is louder in R; distance attenuation; far off-screen
  events quieter.
- B9 Variation: pitch/volume randomisation per trigger (random containers) — the same hit
  repeated does not sound machine-gunned.
- B10 Balance: in combat, SFX peaks sit clearly above the music bed (typ. SFX peak 6-12 dB above
  music RMS); music bed sits well under 0 dBFS (RMS ~ -20 to -14 dBFS).
- B11 Options > Audio page: Master / Music / SFX (Hades: Music, Sound, Voice; Dead Cells:
  Master, Music, SFX). 0-100 readout, live audition while dragging, keyboard/gamepad arrows
  step (e.g. 5%), mouse click/drag, focus visible.
- B12 Persisted to config and applied at boot BEFORE the first sound (no full-volume blast that
  then drops).

### B. dB-perceptual volume standard (shipped PC games)
- P1 Perceptual (log/"audio taper") mode: 0% = silence, 100% = unity (0 dB), 50% lands around
  -10 to -20 dB (not -6 dB), ~ 40-60 dB usable range, every step audible.
- P2 Linear (amplitude) mode: gain = position, i.e. 25/50/75% = -12.0/-6.0/-2.5 dB (+-0.5 dB).
- P3 Monotonic, no dead zones: every step up is louder; no jump from silent to loud in the
  first step, top quarter not all equally loud.
- P4 0% is true silence (gain 0), not a -40/-60 dB residual.
- P5 Mode is per-channel (decoupled): switching Music to linear does not change Master/SFX mode
  or gain; switching mode keeps the fader position honest (readout matches applied gain).
- P6 Readout (percent, ideally dB too) always matches the applied gain.

### C. HTML5 autoplay handling
- H1 The AudioContext is resumed only from a user gesture when the browser demands it; no
  uncaught errors / warning spam; the first key/click/tap after load starts the audio.
- H2 When autoplay IS permitted (--autoplay-policy=no-user-gesture-required), menu music
  starts without any gesture.
- H3 Music started after the unlock is the CURRENT state's cue (not a stale queued cue) and
  SFX that fired while locked are not replayed as a burst.
- H4 Hidden tab (visibilitychange): audio suspends or mutes (common HTML5 courtesy) and resumes
  cleanly on return without a backlog burst.
- H5 No console errors from audio at any point; the game runs identically if Web Audio is
  unavailable (graceful fallback).
- H6 Honest labelling: a browser cannot choose the output device/sample rate reliably — any
  such control is either real (setSinkId where supported) or absent/labelled.
- [x] S1 blind benchmark checklist written (22 items) before any Echoes capture
- [x] S2 docs read: PLAN §3.5 (bus graph, slider math, gain staging, spatial model, music state machine, cue map, autoplay), §3.2 audio keys (defaults .8/.6/.8/.6/.7 log, muteOnBlur true), §6.4 audio debug API, §6.6/6.7 audio harness, §7 M3 gates G3.1-G3.10, §12.5 level voices; critic-audio-r3 (FAIL: AUD3-F1 tab Up-nav, AUD3-F2 nav ticks under menu score — F2 downgraded to advisory by refuters per PROGRESS G25), fix-M3-r3 (AUD3-F1 fixed v0.5.102). Only 2 audio commits since r3 (7f3a6ca, c2f348f).
- [x] S3 scout (tools/gntcaudio4-scout.mjs -> captures/gntcaudio4/scout.json, scout-title.png): v0.5.124, app title, autoplay flag -> engine state running at load, music state menu (wood, 56 bpm dorian, pad/harp/bass); defaults master .8 / music .6 / sfx .8 / ambient .6 / ui .7 all log, muteOnBlur true; bus gainDb master -3.22, music -7.37 (eff -10.59), sfx -3.22 (eff -6.44), ui -5.15 (eff -8.37). Taps: master RMS -23.64 dBFS vs my INDEPENDENT destination analyser (AudioNode.prototype.connect hook installed before page scripts; 1 real AudioContext + 1 OfflineAudioContext seen) -24.08 dBFS (0.44 dB apart, different windows). 0 page errors; only warning a THREE shader-compiler X3595 note (not audio).
- [x] S4 G3.1 curves (tools/gntcaudio4-curves.mjs -> captures/gntcaudio4/curves.json; ?menu=0&seed=7, music pinned silence, ambient+ui muted, other faders 100 % log, -18 dBFS 440 Hz testTone). Three independent readings per cell: live AudioParam (busGain), engine tap RMS, and MY destination analyser (fftSize 16384 L/R on ctx.destination's input). Relative to s=1:

| channel | mode | 0 % | 25 % | 50 % | 75 % | 100 % |
|---|---|---|---|---|---|---|
| master | linear | -inf (dest all-zero) | -12.04 / -12.04 / -12.03 | -6.02 / -6.02 / -6.01 | -2.50 / -2.50 / -2.50 | 0 |
| master | log | -inf | -20.00 / -20.00 / -20.00 | -10.00 / -10.00 / -10.00 | -4.15 / -4.15 / -4.15 | 0 |
| music | linear | -inf | -12.04 / -12.04 / -12.04 | -6.02 / -6.02 / -6.02 | -2.50 / -2.50 / -2.50 | 0 |
| music | log | -inf | -20.00 / -20.00 / -20.00 | -10.00 / -10.00 / -10.01 | -4.15 / -4.15 / -4.16 | 0 |
| sfx | linear | -inf | -12.04 / -12.04 / -12.04 | -6.02 / -6.02 / -6.02 | -2.50 / -2.50 / -2.50 | 0 |
| sfx | log | -inf | -20.00 / -20.00 / -20.00 | -10.00 / -10.00 / -9.99 | -4.15 / -4.15 / -4.14 | 0 |

  (param / tap / destination, dB). PLAN §3.5 table: linear -12.04/-6.02/-2.50, log -20/-10/-4.15. Max deviation: param 0.001 dB, tap 0.000 dB, destination 0.007 dB (gate ±0.1 / ±0.5). 0 % = digital silence at the destination (all-zero samples, -200 sentinel). G3.1 PASS 30/30.
- [x] S5 G3.2 decoupling + master mute (curves.json .decouple, tools/gntcaudio4-duck.mjs -> captures/gntcaudio4/duck.json). With REAL camp music playing + sfx tone: Music 100 -> 0 moves sfx tap -18.00 -> -18.00 (0.00 dB), music tap -13.28 -> -90.77. SFX 100 -> 0 with a music tone: music tap 0.00 dB. Under load (8 legs: sfx tone -30/-18/-12/-6 dBFS x music tone -18/-12): SFX fader 100->0 moves the music tap 0.00 dB in 8/8 (no sidechain coupling via the fader); Music fader moves sfx tap 0.00 dB in 2/2 (music -12, -6). Master 100 -> 50 log moves music AND sfx taps -10.00 dB in 8/8 (equal to the dB). Master mute: master/music/sfx taps -999, destination all-zero samples (-200); level stays 1.0 while muted; un-mute restores the sfx tone at -18.00 dBFS (identical to before). G3.2 PASS; B1, B2, P2, P4 met.
- [x] S6 G3.3 boss fight, all faders 100 % (tools/gntcaudio4-fight.mjs 3 11 -> captures/gntcaudio4/fight-L3-s11.json + fight-L3-s11-run2.log, fight-L3-s11.png). ?level=3&seed=11, skipToRoom 8, autopilot, 8 extra adds spawned round the party, bossHp 0.55 @20 s / 0.25 @40 s; hostiles 5-10 through the fight (>= 6 adds), music boss, intensity 0.71 -> 1.00, then victory stinger -> camp. Independent sample-exact probes I install before page scripts: a ScriptProcessor on whatever feeds the 4x-oversampled WaveShaper (= clipper INPUT) and on the destination input.

| run | length | clipper input peak (mine) | samples > -1 dBFS (mine) | engine prelimit peak / over-1 % | limiter GR <= 6 dB windows | max GR | > 10 dB excursions | destination peak | voices peak / cap |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 70 s, 640 windows | (not yet hooked) | — | -1.32 / 0 % | 99.84 % | 6.14 dB | 0 | -1.32 | 25 / 48 (8 stolen) |
| 2 | 75 s, 685 windows | -1.17 dBFS | 0 of 7,266,304 | -1.17 / 0 % | 98.83 % | 7.50 dB | 0 | -1.17 | 27 / 48 (5 stolen) |

  Raw DynamicsCompressor output reads +0.97 dBFS = -1.17 + 2.13 dB (the engine's makeupCompDb compensating Chrome's automatic compressor makeup) — consistent. G3.3 PASS (gate: <= 0.1 % over -1, >= 95 % windows <= 6 dB, never > 10 dB > 50 ms). B3, B7 met. Engine cost p95 0.2-0.4 ms.
  NOTE run 1 logged ONE uncaught page error "Cannot read properties of undefined (reading 'isReady')" at three.module.js:51441 (no src file changed during the run; timestamp not captured). Run 2 (same URL/seed) had 0. Reproduction attempts follow.
- [x] S7 G3.4 balance at DEFAULTS (tools/gntcaudio4-balance.mjs -> captures/gntcaudio4/balance.json, balance-pause.png). ?level=1&seed=7, autopilot, 43 x 1 s windows in combat (kill_all + defend): median of master medianRms400 = -22.2 dBFS (range -24.49..-20.64; gate -24..-14 PASS); SFX-tap peak minus music-tap RMS per window: median +11.4 dB (25/41 windows >= 6 dB; every window with real combat SFX (sfx RMS > -40) is +5.7..+19.7; the low ones are lulls with sfx RMS < -46); music tap RMS median -24.62, sfx peak median -13.37, master peak max -5.48. Pause menu over combat (real Esc + arrows): sim paused (tick frozen), sfx tap -186 dBFS / 0 voices, music ducked -29.14 vs -24.46 after resume (4.7 dB), UI ticks -25.6..-26.1 peak vs music RMS -28.8..-30.5 = +2.73..+4.68 dB (4/6 >= 3 dB). Title (defaults, real ArrowUp/Down x8): ui peak -25.45 vs menu-score RMS -22.5..-27.1 = -2.93..+1.69 dB (0/8 >= 3 dB) — the r3 AUD3-F2 numbers are unchanged (r3: -2.78); round-3 refuters downgraded it to an advisory, kept as advisory here. G3.4 PASS (combat); B6 met (pause snapshot), B10 met.
- [x] S8 G3.6 spatial (tools/gntcaudio4-spatial.mjs -> captures/gntcaudio4/spatial.json). Camp, music silenced, -18 dBFS testTone at listener offsets; sfx tap L/R and MY destination analyser L/R agree to <= 0.01 dB:

| offset | L dBFS | R dBFS | R-L dB | RMS |
|---|---|---|---|---|
| +6 u x | -30.87 | -20.49 | +10.38 | -23.12 |
| -6 u x | -20.49 | -30.87 | -10.38 | -23.12 |
| 0 | -18.00 | -18.00 | 0.00 | -18.00 |
| +3 u / -3 u | -23.92 / -17.90 | -17.90 / -23.92 | +6.02 / -6.02 | -19.94 |
| +12 u / -12 u | -40.90 / -25.10 | -25.10 / -40.90 | +15.80 / -15.80 | -28.00 |
| +20 u / +35 u | -49.27 / -58.79 | -29.18 / -33.90 | +20.09 / +24.89 | -32.15 / -36.90 |
| 6 u screen-up / down | -23.12 | -23.12 | 0.00 | -23.12 |

  12 u is 8.06 dB quieter than 3 u (gate >= 6). REAL sim cue: a boar spawned 8 u left then killAllEnemies -> 'kill' cue at x -5.22 pan -0.652, L louder by 11.05 / 11.04 dB; right x 7.89 pan +0.651 -> R louder by 11.00 / 11.09 dB (4/4 correct). G3.6 PASS; B8 met.
- [x] S9 G3.5 music (tools/gntcaudio4-journey.mjs -> captures/gntcaudio4/journey.json, journey-end.png; tools/gntcaudio4-states.mjs -> states.json, states-quit-confirm.png; tools/gntcaudio4-quit.mjs -> quit.json). REAL player path: title (menu music with the autoplay flag, no gesture) -> real Enter on New Game -> camp -> real E at the portal -> L1 combat -> skipToRoom 8 boss -> bossHp 0.02 -> level-clear card (victory stinger) -> L2 mill -> ... -> L3 barrow -> Campaign Complete -> camp; defeat via setHp x4 -> defeat stinger -> camp; pause -> MOUSE click "Quit to Lobby" -> confirm (focus defaults to Keep Playing; ArrowLeft + Enter) -> camp; pause -> "Quit to Title" -> menu; title -> Multiplayer (stays menu). In-page 100 ms sampler of music().state/crossfading and the music tap short RMS.
  Tempo/scale/layers per state: menu 56 bpm dorian pad+harp+bass; camp 72 dorian pad+lute+bass+drum; combat wood 104 dorian / mill 96 aeolian / barrow 88 phrygian (pad+bass+drum+ostinato+shaker+lead); boss wood 127 phrygian / mill 117 phrygian / barrow 107 harmonic (drone+pad+taiko+bass+ostinato+stab+lead); victory 152 ionian phrase+pad+bass; defeat 44 aeolian phrase+drone+pad. Every same-theme pair differs >= 20 % in tempo (gate 15 %).
  Crossfades measured by the crossfading flag (100 ms poll): menu->camp 2.00, camp->combat 1.48/1.60, combat->boss 1.99/1.97/2.01, boss->victory 1.33/1.44/1.50, victory->combat(next level) 1.50/1.51, victory->camp 2.49, combat->defeat 1.48, defeat->camp 2.49, camp->menu 2.00, combat->camp (Quit to Lobby) 2.08 s; engine log 1500/2000/2500 ms. Longest music-tap stretch below -50 dBFS across the 3-level journey: 0 ms (min short RMS -43.1 dBFS); the only -999 readings in states.json are the probe's own meterReset instants. G3.5 PASS; B5 met.
  Level clear: gameplay voices 6 -> 1 within 0.67 s of the clear (stopLevelVoices), music boss -> victory 1.0 s after the transition state flips, next level combat (mill) 4.45 s later. Quit to Lobby: voices 3 (ui) -> 0 in 1.57 s, no gap.
- [x] S10 G3.7 coverage (tools/gntcaudio4-cov.mjs -> cov-L1.json [first pass, order-heuristic attribution, superseded]; tools/gntcaudio4-cov2.mjs -> cov2.json; tools/gntcaudio4-cov3.mjs -> cov3.json). Attribution from cueLog's event field + the E.events ring (polled every 40 ms), natural autopilot + REAL keys (1-4, Tab, R, F2, Space, right-click, E-hold revive, pause arrows, X, Enter) + debug setups (giveSkill warding_aura/dewfall/kindred_shield/pale_lance, grantNode, spawn quillback/toad/moth/ram/mole/elite, skipToRoom 7/8, bossHp, setHp x4). 90 event types mapped by the engine; 61 fired across the two runs; cues per user-named family: hit -> impact 225 / hurt 50 / crit 13; kill -> kill 25 + boss_death 1; heal -> heal 88 + heal_crit 2 + sparkle 42; skill casts -> cast_heal 22 / cast_zone 4 / cast_damage 6 / ally_cast_archer 41 / _sword 26 / _tank 21 / bolt 145; telegraph -> telegraph 22 / telegraph_hit 19 / shimmer 21 / hazard telegraph 2; boss quake -> quake_warn 5 / quake_hit 5 (+ trample 9, horn 3, roar 2); UI -> nav ui_confirm + per-press ui-tap peaks (balance.json); techniques echo/echo_tick/bounce/siphon/fizzle/split/shield/technique pulse; progression room_start/wave_start/room_clear/reward/draft_take/path/shop_open/purchase/glint/socket/deny/run_start/run_end/camp_return; new enemies m4b_swoop/m4b_erupt/m4b_lob/m4b_splash, elite roar, break. Every one of the 10 rows of the PLAN §3.5 table fires cues. Fired WITHOUT a cue: status_apply (slow on an ally, 17 in cov2; its source hit/hazard already sounds), mark reason:"cleared" (automatic room-start clear, 2), heal_override (3 in cov3; 2 of 8 got ui_blip in cov2, cooldown). Not exercised by my scripts: hit_immune, detonate, revive_break, draft_declined, currency_denied (5 of 90). G3.7 PASS at row level.
- [x] S11 G3.8 autoplay (tools/gntcaudio4-autoplay2.mjs -> captures/gntcaudio4/autoplay2.json, autoplay2-*.png; baseline tools/gntcaudio4-ctxbase.mjs -> ctxbase.json). HARNESS NOTE: my first attempt (gntcaudio4-autoplay.mjs -> autoplay.json) polled with puppeteer page.evaluate, which runs with userGesture:true and grants user activation — two legs then autoplayed without a gesture (a probe artifact, not a game defect). The clean probe reads state only through CDP Runtime.evaluate {userGesture:false} (navigator.userActivation.hasBeenActive stays false until the real gesture, verified per leg).

| leg (no flag unless noted) | before gesture | after Esc | ctx constructed after gesture | ctx 'running' after gesture | prompt shown -> cleared | music after | console audio warnings |
|---|---|---|---|---|---|---|---|
| flag (--autoplay-policy=no-user-gesture-required) | running at boot, title, 0 prompt | — | at boot | at boot | never shown | menu -22.67 dBFS | 0 |
| key A | locked, 0 contexts, prompt | locked, 0 contexts | +0.5 ms | +142.6 ms | 14.1 s -> 16.6 s | menu -26.61 | 0 |
| click | locked, 0 contexts, prompt | locked | +0.3 ms | +100.9 ms | 13.8 s -> 16.2 s | menu -26.63 | 0 |
| touch tap | locked, 0 contexts, prompt | locked | +32 ms (on the activation-granting event, touchstart grants none) | +153.5 ms | 15.3 s -> 17.6 s | menu -26.63 | 0 |
| key A (rep) | locked, 0 contexts | locked | +0.4 ms | +131.2 ms | 18.6 s -> 21.0 s | menu -26.63 | 0 |

  The 101-154 ms is spent INSIDE Chrome's AudioContext constructor (my Proxy stamps before/after Reflect.construct: the constructor returns ~142 ms later already 'running'); a BARE page creating an AudioContext in a trusted keydown on this machine reaches its running statechange 114 ms at best (1139-2075 ms in 3 of 4 cold launches). The engine's own share is 0.3-0.5 ms. cues attempted while locked are dropped and counted (dropped.locked 1-2), no burst after unlock. G3.8 PASS in substance; the literal "running <= 100 ms" is missed by 1-54 ms at the browser's own floor -> advisory, not must-fix. H1, H2, H3, H5 met.
- [x] S12 G3.9 Audio tab + persistence (tools/gntcaudio4-tab.mjs -> captures/gntcaudio4/tab-1600.json, tab-1600-open.png / -kbd.png / -mouse.png; tools/gntcaudio4-tab2.mjs -> tab2-1600.json, tab2-1600.png, tab2-1600-reset.png). REAL input throughout.
  Reach: title ArrowDown x2 -> Settings Enter; ArrowUp to the tab strip + ArrowRight, or E (Q/E tabs, footer hint) -> Audio tab, first row au-master-level. Layout (tab-1600-open.png): status line "Sound is on · 48 kHz stereo", per channel slider + "80 % · -3.2 dB" readout + Curve / Mute / Test + live meter bar, help panel naming the math ("80 % on the Log (perceptual) curve = -3.2 dB").
  Keyboard: ArrowLeft x3 0.80 -> 0.65 (-6.21 dB, readout "65 % · -6.2 dB" = busGain param -6.212), ArrowRight 0.70; Shift+Arrow also 5 % (no fine step); Home and End do NOTHING (0.70 stays 0.70). Curve (Enter) on Music: 0.60 log -7.37 dB -> 0.43 linear -7.33 dB (loudness kept within 0.04 dB), Master/SFX mode and gain untouched; Enter again back to 0.60 log -7.37. Mute (Enter): readout "60 % · muted", aria-pressed true, music tap -999; un-mute -> -26.66 dBFS. Test (Enter on au-sfx-test): sfx tap peak -12.72 dBFS (test_sfx cue).
  Mouse: click at 30 % of the SFX track -> 0.29 (-17.86 dB); drag to 80 % -> 0.82 (-2.86 dB); Mute click on/off; Curve click 0.82 log -2.863 dB -> 0.72 linear -2.853 dB. Test buttons: master -> test_sfx (sfx pk -13.46), music -> test_music, sfx -> sfx pk -13.90, ambient -> test_ambient, ui -> ui pk -20.39. Audition: stepping the SFX slider plays test_sfx previews (sfx pk -18.91); the Music slider ticks ui_slider over the live music.
  Mocked standard gamepad: d-pad up/down moves focus between rows, d-pad left/right on au-music-level 0.60 -> 0.55 -> 0.50 -> 0.55, app.lastSource 'gamepad'.
  Reset to defaults (mouse) -> confirm dialog -> all five channels back to .8/.6/.8/.6/.7 log unmuted.
  Persistence: after edits (master .6, sfx .72 linear) a reload in the same profile restores all five level/mode/mute AND the applied busGain params identically (0 diffs).
  Mute on focus loss: another tab brought to front -> document hidden, blurMuted true, master tap -999, destination all-zero; tab back -> -21.24 dBFS restored, context running throughout. G3.9 PASS; B2, B4(params ramp not yet timed), B11, B12, H4, P5, P6 met; Home/End ignored -> advisory.
- [x] S13 G3.10 cost/leak + benchmark extras (tools/gntcaudio4-cost.mjs -> captures/gntcaudio4/cost-dev.json; tools/gntcaudio4-variation.mjs -> variation.json). 200 s autopilot run L1 rooms 1-6 + boss entry: engine main-thread cost p50 0.2 / p95 0.7 / p99 1.1 ms over the last 900 frames (gate p95 <= 1 ms), single-frame max 10.8 ms at the boss-room entry; voices peak 22 / cap 48, 5 stolen; every quiet sample between waves reads 0-1 active voices (el 10/25/40/50/85/110 s: 0) -> no leak. (My post-kill "quiet" check landed in the boss room with the Stag alive, 3-8 voices = the boss's own cues, not a leak.) Fader ramp (B4): Music 0 dB -> -20 dB read from the live AudioParam every 2 ms: ~-2.7 dB at the first sample, -7.16 @30 ms, -14.46 @60, -17.48 @90, -19.78 @150, -19.98 @240 = one-pole setTargetAtTime tau ~30 ms, no steps. Voice limiting (B7): 20 x play('kill') on one spot in one frame -> 1 voice, 19 dropped by the 30 ms same-cue cooldown, sfx peak -13.51 dBFS (no stacking). Variation (B9), onset-aligned correlation of 5 repeats at the destination: impact 0.86-0.96 (zero crossings 508-634), swing 0.81-0.99, bow 0.71-0.95 (peaks -9.52..-11.77), heal 0.26-0.67, kill 0.80-0.99 — no two repeats are identical. G3.10 PASS; B4, B7, B9 met.
- [x] S14 PRODUCTION build (npx vite build --outDir dist-gntcaudio4; vite preview :4322, PID 77692; version.json 0.5.124 entry index-DGyKhaqD.js). Curves (tools/gntcaudio4-curvesp.mjs -> curves-prod.json): 30/30 cells, max deviation param 0.001 / tap 0.000 / destination 0.009 dB, all six 0 % cells digital silence at the destination, decoupling sfx -18.00 -> -18.00 with Music 100 -> 0, master mute destination all-zero, 0 page errors. Autoplay (autoplay2-prod.json): flag -> running at boot, menu -22.89 dBFS, prompt never shown; no flag x4 legs -> locked, 0 contexts, Esc does not unlock, context constructed 0.2-0.8 ms after key/click (35.7 ms after touch = on the activation-granting event), running 148-262 ms after the gesture (browser constructor floor as S11), prompt cleared, menu music -25.4..-26.6 dBFS, 0 warnings, 0 errors.
- [x] S15 B12 boot levels (tools/gntcaudio4-bootlevel.mjs -> captures/gntcaudio4/bootlevel.json): title at defaults master tap -21.84 dBFS; set Master 10 % (-33.22 dB) + Music muted -> -58.83; RELOAD in the same profile with a 20 ms destination sampler installed before page scripts: first audible sample at 8.44 s is -67.3 dBFS RMS, the loudest of 309 samples -55.7 RMS / -45.4 peak — never the default level -> saved levels are applied before the first sound. B12 met.
- [x] S16 fix-M3-r3 re-measure (tools/gntcaudio4-upwalk.mjs -> captures/gntcaudio4/upwalk.json, upwalk-1024.png / -1600.png; also tab-1024.json + tab-1024-*.png): keyboard Down x20 then Up x20 through the Audio tab at 1024x576 and 1600x900: 15 distinct stops, 12 audio rows, 0 stops with the control outside the scroll viewport or the channel name scrolled off, 0 foreign tab headers (AUD3-F1 stays fixed). Full keyboard/mouse/persist flow at 1024x576: 0.8 -> 0.65 by arrows, curve 0.60 log -> 0.43 linear, mute -999, click 30 % -> 0.30 (-17.37 dB), drag -> 0.81, reload 0 diffs. Status line "Sound is on · 48 kHz stereo" = AudioContext.sampleRate 48000, destination channelCount 2 (honest, H6 met; no fake output-device control).
- [x] S17 extras. (a) No Web Audio (window.AudioContext removed before page scripts) and ?audio=0 (tools/gntcaudio4-noaudio.mjs -> captures/gntcaudio4/noaudio.json): engine state 'unavailable', the campaign runs (tick 743, combat room 1, 77 sound events still emitted), 0 page errors, 0 warnings; ?audio=0 -> master forceMuted, effective -999 dB, 0 errors. H5 met. (b) Save & Quit to Title + Load Game by real keys (tools/gntcaudio4-loadmusic.mjs -> loadmusic.json): combat(mill) -> camp 2.0 s crossfade -> menu 0.15 s later (a transient 150 ms 'camp' state on the way to the title) -> Load (autosave "Level II · The Sunken Mill · Room 1 of 8") -> combat(mill) 1.5 s crossfade; longest music-tap stretch below -50 dBFS 0 ms. (c) Bare-Chrome floor for G3.8 (tools/gntcaudio4-ctxbase.mjs -> ctxbase.json, 2nd run): `new AudioContext()` inside a trusted keydown on an empty page BLOCKS 130.6 / 135.5 / 151.3 / 154.4 ms and returns 'running' -> the game's 101-262 ms is this floor. (d) Page-error reproduction: the fight-run-1 error (captures/gntcaudio4/fight-L3-s11-run1-error.txt) did not recur in 5 further boss fights (dev L3 s11 runs 2/3/4 -> clipper peaks -1.17/-1.18/-1.60, dev L3 s5 -> -1.62, prod -> -1.92; all 0 % over -1, 0 errors) -> advisory. Harness note: ?level=N works on dev and prod (levelparam.json: L2 -> mill, L3 -> barrow) but the sim only starts after a 3-10 s boot, so an early skipToRoom starts a default L1 run (my prod fight therefore measured the L1 Stag, hostiles 4-9, prelimit -1.92 dBFS, GR <= 6 dB 100 % of 652 windows).
- [x] S18 cleanup: vite preview :4322 PID 77692 killed (taskkill /T, port free), dist-gntcaudio4 removed; every puppeteer browser closed in finally blocks; no src/**, server/**, PLAN or other agents' files touched; nothing committed.
- [x] S19 (resumed after the completeness audit: "no critic has measured multiplayer guest audio or the hosted lobby music state") - git HEAD still 9e7913c, build v0.5.124 (mpscout.json room build "0.5.124", screenshots show "v0.5.124"), so S3-S18 still describe the running game. Own session server `node server/index.mjs --port 7877 --admin` (refuter range 7860-7889 as the audit suggested; 7883/7884 were already taken by other agents), PID 88296, killed at the end (port free).
- [x] S19a MP scout (tools/gntcaudio4-mpscout.mjs -> captures/gntcaudio4/mpscout.json, mpscout-host-lobby.png): title -> Multiplayer (real keys) -> Host a Game -> lobby room: music state stays 'menu' (56 bpm pad+harp+bass) on mp-menu AND in the hosted lobby room; the engine's 'lobby' state is never entered.
- [x] S19b MP audio journey (tools/gntcaudio4-mpaudio.mjs -> captures/gntcaudio4/mpaudio-dev.json/.out.txt, mpaudio-dev-{host,guest}-lobby.png, -guest-L1/L2/after-quit/victory.png; analysis tools/gntcaudio4-mpanalyze.mjs -> mpaudio-dev-analysis.json). Two Chrome processes (autoplay flag), host by real keys Multiplayer -> Host, guest by real keys Join by Code (typed) -> Ready; host Start. First pass result: every state and theme followed on the guest (lag 30-590 ms on normal transitions); ONE guest music drop-out 3.85 s below -50 dBFS at a debug skipToRoom 8 in campaign 2 (guest tap min -190 dBFS, guest boss cue 5.53 s after the host's); follow-up probes S19c-S19f. cmd('lose') is deferred in a network session (console "__echoes.cmd('lose') lands with a later block"), so the first defeat leg did not happen; redone with setHp in S19d. 0 page errors on both pages.
- [x] S19c guest drop-out follow-up (tools/gntcaudio4-mpgap.mjs -> captures/gntcaudio4/mpgap-dev.json/.out.txt; analysis tools/gntcaudio4-mpgapan.mjs -> mpgap-dev-analysis.json). Host ?nethost=1, guest ?netjoin=CODE, 50 ms in-page samplers with a requestAnimationFrame frame counter, the longest rAF gap and long tasks. 3 cycles x (Begin Run -> natural room 1->2 -> skipToRoom 7 -> autopilot into room 8 -> Quit to Lobby by keys; Begin Run -> debug skipToRoom 8 -> Quit to Lobby) = 24 room changes per page. Guest: ONE music drop-out 1660 ms below -50 dBFS (min -113.98 dBFS; engine meter longestBelowMinus50Ms 1800) at cycle 3's natural room 1 -> 2, exactly while the guest's render loop froze: 0 frames for 2946 ms and the sim tick frozen at 4637, while my 100 ms sampler kept running (max sample gap 201 ms => the main thread was FREE); the music tap fell from -24.5 to -114 dBFS over 1.9 s (percussion first, then the sustained layers decaying ~35 dB/s) starting 0.9 s into the freeze, and came back at -20.7 dBFS on the first frame. Guest room lag behind the host p50 220 / p90 1220 / max 2700 ms (the 2700 ms is that freeze). Host: 0 ms below -50 (a 3297 ms rAF freeze at camp -> room 1 happened over the sustained camp pad, no gap).
- [x] S19d single-player control + a third MP run. SP (--solo 1 -> mpgap-dev-solo.json): the same 24 room changes, 0 ms below -50, 0 main-thread stalls, one 1527 ms rAF freeze, engine meter 0 ms. MP run 3 at low machine load (CPU 8 %; mpgap-dev2.json, + a defeat leg): guest 0 ms below -50 (engine 0), guest room lag p50 150 / max 490 ms, music lag p50 90 / max 200 ms, longest guest rAF freeze 1848 ms; host one 613 ms dip (engine 800 ms) at Quit to Lobby during a 2012 ms host freeze (< 1 s: within G3.5). Defeat (setHp 0 x4 on the host): combat -> defeat on both (guest +120 ms) -> camp on both (guest +200 ms).
- [x] S19e mechanism, deterministic (tools/gntcaudio4-stall.mjs -> captures/gntcaudio4/stall-combat-final.json; the earlier passes stall-combat.json / stall-combat-long.json / stall-combat-ctl.json used a 20 ms window by mistake and are superseded). Single player, L1 combat, SFX/ambient/UI muted so the destination carries only music; MY AudioWorklet on the destination input (10 ms RMS windows, audio thread) + the engine music meter. Hitch kinds: 'raf' = requestAnimationFrame callbacks held back (main thread free, timers running - what the guest showed), 'main' = main thread busy. 2 reps each:

| hitch | 0 s | 1 s | 2 s | 2.5 s | 3 s | 4 s |
|---|---|---|---|---|---|---|
| raf: ms below -50 dBFS (mine / engine), rep 1; rep 2 | 0 / 0; 0 / 0 | 0 / 0; 0 / 0 | 340 / 500; 280 / 500 | 0 / 0; 0 / 0 | 0 / 0; 0 / 0 | 2580 / 2800; 2590 / 2800 |
| main: ms below -50 dBFS (mine / engine), rep 1; rep 2 | 0 / 0; 0 / 0 | 0 / 0; 0 / 0 | 0 / 0; 0 / 0 | 960 / 1200; 960 / 1200 | 1020 / 1200; 1050 / 1200 | 2540 / 2800; 2500 / 2800 |

  Traces (100 ms maxima): with no hitch the music peaks at -13..-16 dBFS every 100 ms; within 0.2-0.3 s of ANY hitch the rhythmic layers stop (peaks -23..-26), the sustained layers then run out 1.0-2.5 s in (phase-dependent: raf 2.5 / 3 s held on a pad, raf 2 s did not), and the first 100-300 ms after the hitch peak -7..-10 dBFS (a catch-up clump, +4..+8 dB over the control's loudest 100 ms). So the music is sequenced from the frame loop with roughly 1-2.5 s of scheduled audio in hand; a timer- or audio-clock-driven sequencer would have bridged every 'raf' case (the guest case) completely.
- [x] S19f the engine's 'lobby' state at runtime (tools/gntcaudio4-lobbystate.mjs -> captures/gntcaudio4/lobbystate.json): setMusic('lobby') on the title -> a distinct cue (64 bpm mixolydian pad+bells+bass, music tap -24.56 dBFS) vs 'menu' (56 bpm dorian pad+harp+bass); releaseMusic -> back to menu. The game never selects it (mpscout.json, mpaudio-dev.json: mp-menu, the hosted lobby room, the guest's lobby room and the post-Leave title are all 'menu').
- [x] S20 cleanup: session server PID 88296 killed (port 7877 free), every puppeteer browser closed in finally blocks; nothing committed; no src/**, server/**, PLAN or other agents' files touched.

## 2. Benchmark scorecard (blind checklist from §1, scored after inspection)

| # | Item | Score | Evidence |
|---|---|---|---|
| B1 | Bus graph, child faders own-bus only, master multiplicative | MET | duck.json: SFX fader moves the music tap 0.00 dB in 8/8 legs, Music fader moves the sfx tap 0.00 dB; Master 100 -> 50 log moves both taps -10.00 dB |
| B2 | Master mute = digital silence, exact restore | MET | curves.json: destination all-zero (-200), level kept 1.0, sfx tone -18.00 before and after |
| B3 | Master limiter, no sample above 0 dBFS in the densest fight | MET | 6 fights: clipper-input peak -1.17 / -1.18 / -1.32 / -1.60 / -1.62 / -1.92 dBFS, 0 of ~7.2 M samples > -1 dBFS, GR <= 6 dB in 98.8-100 % of windows, 0 excursions > 10 dB |
| B4 | Ramped faders (no zipper) | MET | cost-dev.json ramp: one-pole tau ~30 ms (-7.16 dB @30 ms, -19.98 @240 ms toward -20) |
| B5 | State-driven music, crossfades, no hard cuts / gaps > 1 s | PARTIAL | single player MET (journey.json + states.json + quit.json + loadmusic.json: 18 transitions 1.33-2.49 s, 0 ms below -50 dBFS; mpgap-dev-solo.json 24 room changes 0 ms). Multiplayer guest: every state / theme / stinger followed with crossfades 1.07-2.44 s (mpaudio-dev-analysis.json), but 2 drop-outs of 3.85 s / 1.66 s below -50 dBFS at room changes during guest render freezes (AUD4-F1); FMOD/Wwise music keeps playing through a frame hitch |
| B6 | Pause snapshot | MET | balance.json: paused -> sfx -186 dBFS, 0 voices, music ducked 4.7 dB (-29.14 vs -24.46) |
| B7 | Voice limiting / priority | MET | cost-dev.json: 20 simultaneous kills -> 1 voice (19 cooldown drops); voices peak 22-27 of cap 48 with steals |
| B8 | 2D spatial panning + distance | MET | spatial.json: +/-6 u -> +/-10.38 dB, 0 u 0.00 dB, 12 u 8.06 dB quieter than 3 u; real kill cue L/R 11.0-11.1 dB |
| B9 | Per-trigger variation | MET | variation.json: repeat-to-first correlation impact 0.86-0.96, bow 0.71-0.95, heal 0.26-0.67 (never identical) |
| B10 | SFX above music in combat | MET | balance.json: sfx peak minus music RMS median +11.4 dB; +5.7..+19.7 dB in every window with real combat SFX |
| B11 | Options > Audio usable by keyboard / mouse / pad, readout, audition | MET | tab-1600.json, tab2-1600.json, tab-1024.json, upwalk.json (S12 / S16) |
| B12 | Persisted, applied before the first sound | MET | persist 0 diffs (1600 + 1024); bootlevel.json first audible -67.3 dBFS with Master 10 % |
| P1 | Perceptual log taper (50 % ~ -10 dB, 0 silence, 100 unity) | MET | curves.json: log -20.00 / -10.00 / -4.15 / 0, 0 % digital silence |
| P2 | Linear = amplitude | MET | -12.04 / -6.02 / -2.50 / 0 (destination max dev 0.009 dB) |
| P3 | Monotonic, no dead zones | MET | keyboard steps 0.80 -3.22 / 0.70 -5.15 / 0.65 -6.21 / 0.60 -7.37 dB; 30 % click -17.4 dB |
| P4 | 0 % true silence | MET | six 0 % cells all-zero at the destination (dev and prod) |
| P5 | Per-channel mode, switch keeps loudness | MET | Music log 0.60 -7.37 -> linear 0.43 -7.33 dB; SFX 0.82 -2.863 -> 0.72 -2.853 dB; other channels untouched |
| P6 | Readout = applied gain | MET | aria "65 % · -6.2 dB" vs busGain -6.212 dB; "60 % · muted" while muted |
| H1 | Context only from a gesture, no warnings | MET | autoplay2.json / autoplay2-prod.json: 0 contexts and 'locked' before the gesture, Esc does not unlock, 0 audio console lines |
| H2 | Autoplay allowed -> music without a gesture | MET | flag legs: running at boot, menu -22.7 dBFS, prompt never shown |
| H3 | Current cue after unlock, no burst | MET | menu music after unlock; dropped.locked 1-2, 0 voices after |
| H4 | Hidden tab mutes, clean resume | MET | tab2-1600.json: hidden -> master -999 / destination all-zero; visible -> -21.24 dBFS |
| H5 | No audio errors; runs without Web Audio | MET | noaudio.json: 'unavailable', game runs, 0 errors |
| H6 | Honest labelling | MET | "Sound is on · 48 kHz stereo" = sampleRate 48000, 2 ch; no fake device / sample-rate control |

Score: 23 met / 1 partial (B5, multiplayer guest) / 0 not met of 24 (12 bus-mixing + 6 perceptual-volume + 6 autoplay items).

## 3. PLAN gates (literal)

| Gate | Result | Numbers |
|---|---|---|
| G3.1 curves | PASS | 30/30 cells; max dev param 0.001 / tap 0.000 / independent destination 0.007 dB (dev), 0.009 dB (prod) |
| G3.2 decoupling | PASS | 0.00 dB both ways (10 legs incl. loud tones); master moves every tap -10.00 dB |
| G3.3 no clipping | PASS | 6 boss fights at 100 %, >= 6 adds: samples > -1 dBFS at the clipper input 0 %; GR <= 6 dB windows 98.8-100 %; max GR 5.15-7.50 dB; 0 excursions > 10 dB; post-clipper peak <= -1.17 dBFS |
| G3.4 balance | PASS | master median RMS -22.2 dBFS; SFX peak minus music RMS median +11.4 dB; pause-menu UI ticks +2.73..+4.68 dB over music RMS (median ~+4.0) |
| G3.5 music | FAIL (multiplayer guest) | single player PASS: menu, camp, combat, boss, victory, defeat audible; same-theme tempo gaps >= 20 %; crossfades 1.33-2.49 s (engine log 1.5 / 2.0 / 2.5 s); 0 ms under -50 dBFS. Guest: the music tap sat below -50 dBFS for 3850 ms (engine 3600) and 1660 ms (engine 1800) at two host-driven room changes (mpaudio-dev.json, mpgap-dev.json) - AUD4-F1 |
| G3.6 spatial | PASS | +10.38 / -10.38 / 0.00 dB; 12 u vs 3 u 8.06 dB |
| G3.7 coverage | PASS (rows) | all 10 §3.5 rows fire cues; 61 of 90 mapped event types exercised, 3 fired silent (status_apply slow, mark 'cleared', heal_override on cooldown); 5 rare types not exercised |
| G3.8 autoplay | PASS in substance; the "<= 100 ms" figure missed | 0 contexts / 0 warnings pre-gesture, key / click / touch unlock, prompt clears, flag -> no prompt; running 101-262 ms after the gesture = Chrome's own constructor block (bare page 130.6-154.4 ms), engine share 0.2-0.8 ms |
| G3.9 persistence + tab | PASS | 0 diffs after reload (2 sizes), mute-on-hidden works, keyboard / mouse / mocked pad all operate the tab |
| G3.10 cost | PASS | p95 0.2-0.7 ms, voices <= 27 / 48, 0-1 voices at every quiet sample |
| §12.9 multiplayer audio (guest follows the host) | PASS except AUD4-F1 | §5 |
| §12.5 level voices / stinger / theme | PASS | voices 6 -> 1 in 0.67 s at the clear, victory stinger, next level themes mill / barrow |

## 4. Builder claims re-measured
- fix-M3-r3 (AUD3-F1 fixed, 0 clipped stops at 1024/1600): HOLDS — upwalk.json 0 bad stops, 0 foreign headers at both sizes.
- build-M3 (G3.1-G3.10 pass): HOLDS except the G3.8 100 ms figure, which on this machine is below Chrome's constructor floor.
- r3 AUD3-F2 (title nav ticks under the menu score, downgraded to advisory by the round-3 refuters): UNCHANGED — ui peak -25.45 vs menu RMS -22.5..-27.1 (-2.93..+1.69 dB, 0/8 >= 3 dB).

## 5. Multiplayer guest audio (audit gap, S19)

Host = HostA (real keys: title -> Multiplayer -> Host a Game), guest = GuestB (real keys: Multiplayer -> Join by Code -> typed code -> Ready); two Chrome processes with the autoplay flag, own server :7877. Numbers from mpaudio-dev.json / mpaudio-dev-analysis.json (run 1) and mpgap-dev*.json (runs 2, 3, SP control).

| moment | host music | guest music | guest lag | crossfade host / guest | voices on the guest |
|---|---|---|---|---|---|
| title -> mp-menu -> hosted lobby room (both) | menu 56 bpm, -22.1 dBFS | menu 56 bpm, -26.9 dBFS | - | none (menu kept) | 0 |
| Start -> camp (session up) | camp 72 bpm | camp 72 bpm | +30 ms | 2003 / 1979 ms | 0 |
| Begin Run (E) -> L1 combat | combat wood 104 bpm | combat wood 104 bpm | +590 ms | 1562 / 1500 ms | 3 sfx; guest sfx tap -33.1 dBFS (the guest hears the fight) |
| L1 boss | boss wood 127 bpm | boss wood 127 bpm | +190 ms | 2185 / 2091 ms | 9 sfx |
| host clears L1 -> level-clear card | victory 152 bpm | victory 152 bpm | +110 ms | 1382 / 1325 ms | 7 -> 3 (+0.7 s: 1 sfx + 2 ui) -> 1 (+3.0 s); sfx tap -74.6 dBFS on the card |
| card -> L2 | combat mill 96 bpm | combat mill 96 bpm | +180 ms | 1485 / 1453 ms | - |
| host Quit to Lobby FROM THE L2 BOSS (keys, confirmed) | camp | camp | +180 ms | 2114 / 1985 ms | 6 sfx -> 0 sfx in 261 ms (host 406 ms), 0 voices at +3 s, sfx tap -186 dBFS; guest in camp, "Online · Tank Room HHDVB · 2 players" (mpaudio-dev-guest-after-quit.png) |
| campaign 2: L1 / L2 / L3 clears | victory each | victory each | -360 / -220 / +130 ms | 1023-1121 / 1287-1442 ms | 0 voices by +3.0 s after each clear |
| CAMPAIGN COMPLETE -> camp | camp | camp | +300 ms | 2706 / 2443 ms | 0 |
| party wipe (run 3) | defeat -> camp | defeat -> camp | +120 / +200 ms | - | - |
| guest Leave Session | stays combat | menu on the title | - | 2100 ms (a 90 ms 'camp' hop on the way, as A5) | 0 |

Themes followed on the guest every time (wood -> mill -> barrow, 0 mismatches in 3 runs). Guest music lag over 18-21 state changes per run: run 2 p50 190 / p90 320 ms, run 3 p50 90 / max 200 ms. No guest was ever left on boss music or with level voices after a host level clear or Quit to Lobby. Defects: the two guest drop-outs (AUD4-F1), a 170 ms wrong-cue crossfade at one guest clear (A7) and the unused 'lobby' cue (A8).

## 6. Verdict
FAIL - 1 must-fix.
- AUD4-F1 (must-fix, G3.5 on the multiplayer guest): the guest's music went silent (< -50 dBFS) for 3.85 s (mpaudio-dev.json: campaign 2, host debug skipToRoom 8, guest boss cue 5.53 s late; engine meter 3600 ms) and 1.66 s (mpgap-dev.json: natural room 1 -> 2; engine meter 1800 ms), in 2 of 3 multiplayer runs (0 in run 3 at low machine load, 0 in the single-player control). Both coincide with guest render-loop freezes (2946 ms with the main thread free in mpgap-dev.json). The audio part is deterministic in single player (stall-combat-final.json): rAF held 4 s -> 2.58-2.59 s of silence (2/2), main thread busy 2.5-3 s -> 0.96-1.05 s (4/4), 4 s -> 2.50-2.54 s (2/2); every hitch >= 1 s also ends in a -7..-10 dBFS catch-up clump. Benchmark: FMOD/Wwise (Hades, Dead Cells) keep music on the audio thread through frame hitches, and Web Audio practice schedules notes from a timer / worker clock with lookahead, never from requestAnimationFrame. Fix direction: drive the music sequencer from a setInterval / Worker (or audio-clock) tick with >= 1 bar of lookahead so a stalled render loop cannot starve it, and clamp the catch-up after a stall (skip missed steps instead of firing them at once). The guest's multi-second render freeze at a room swap is itself for the net / campaign owners (A9).
Advisories (not must-fix):
- A1 G3.8 "running <= 100 ms" is below Chrome's AudioContext constructor floor on this machine (bare page 130.6-154.4 ms); the engine constructs the context 0.2-0.8 ms after the gesture. Re-word the gate to "context constructed inside the gesture; running within the browser floor + 20 ms".
- A2 Title menu nav ticks peak 2.8 dB UNDER the menu score RMS at defaults (r3 AUD3-F2, unchanged); pause-menu ticks clear the music by +2.7..+4.7 dB.
- A3 Sliders ignore Home/End and Shift gives no finer step (help text honestly says 5 % steps; mouse drag gives 1 %).
- A4 One uncaught three.js page error "Cannot read properties of undefined (reading 'isReady')" (three.module.js:51441) in 1 of 6 boss-fight -> Campaign Complete runs, not reproduced in 5 retries; not audio - for the campaign / journey owners. 0 page errors on both pages in all 3 multiplayer runs.
- A5 Quit / Save & Quit to Title passes through a 150 ms 'camp' music state before 'menu' (two overlapping crossfades; inaudible in practice); the guest's Leave Session shows the same 90 ms 'camp' hop.
- A6 status_apply (slow on an ally) and the automatic room-start mark clear are silent by design.
- A7 On the guest, 1 of 7 level clears went boss -> combat (170 ms) -> victory instead of boss -> victory (mpaudio-dev-analysis.json, campaign 2 L2 clear): a crossfade that starts toward the wrong cue before the stinger; barely audible.
- A8 The engine has a distinct 'lobby' cue (64 bpm mixolydian pad+bells+bass, lobbystate.json) that the game never selects: mp-menu and the hosted / joined lobby room play the title's 'menu' cue (PLAN §3.5 maps MP screens to 'lobby'). Continuous menu music in a lobby is normal (no player harm), but it is a PLAN deviation / dead cue - use it or remove it.
- A9 (for the net / campaign owners) The guest's render loop froze 2.9-5.5 s at some host-driven room changes (mpgap-dev.json: 2946 ms rAF gap at room 1 -> 2, the guest 2.7 s behind the host; mpaudio-dev.json: a 2.7 s stretch of fading frames + a 2.86 s main-thread stall at skipToRoom 8), while the host rendered normally at the same moments; under low machine load the longest guest freeze was 1.85 s.

Superseded verdict (before the audit, kept for the record): PASS. No must-fix: every user-spec clause (audio manager, background ambient music, spatial SFX triggers, decoupled linear/log sliders for Master / Music / SFX), every G3.x gate in substance, and 24/24 benchmark items are met by independent measurement on dev and on the production build.
