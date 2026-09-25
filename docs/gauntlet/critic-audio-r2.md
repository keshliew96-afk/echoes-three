STATUS: PARTIAL
(verdict pending)

# Audio critic — gauntlet round 2

Started: 2026-09-25T12:17:41Z
Branch: gauntlet @ b21aac1

## Step log
- [started] checkpoint created, docs not yet read
- [step0] docs read: PLAN §3.5 / §6.3 / §6.4 / §6.6 / §6.7 / §7 M3 (G3.1–G3.10), TESTING harness rules + M3 section, build-M3.md, fix-M3-r1.md, critic-audio-r1.md (verdict + 8 advisories), BUILD_BRIEF head + §21/A9, REFERENCE_BAR head, PROGRESS top. HEAD b21aac1 = v0.5.87. NO capture, PNG, console.txt or JSON from any earlier probe has been opened yet.

## STEP 1 — BLIND BENCHMARK CHECKLIST (written before any Echoes capture was inspected)

Benchmarks named by the brief: Wwise/FMOD bus mixing as shipped in Hades and Dead Cells; the dB-perceptual volume standard of shipped PC games; HTML5 games with proper autoplay handling. Each item is something I can measure on the running game; "how a player feels it" is the bar for must-fix vs advisory.

### A. Bus mixing (Wwise/FMOD as used in Hades / Dead Cells)
| # | Item | Testable expectation |
|---|---|---|
| A1 | Hierarchical buses: every voice sits under exactly one child bus (Music / SFX / Ambient / UI) and all children sum into one Master. Nothing bypasses Master. | Master 0 % -> every tap <= -80 dBFS (or -inf); no residual. |
| A2 | Child buses are independent faders: Music slider changes only the music bus; SFX unchanged within noise. | Move Music 100->0: SFX tap delta <= 0.1 dB and vice versa. |
| A3 | Master is multiplicative on top of each child (parent x child), never a min/max/override. | Master 50 % + Music 50 %: measured = sum of the two dB offsets +-0.3 dB. |
| A4 | Faders ramp (de-zipper) rather than jump. | A slider move mid-tone shows no discontinuity click: peak during the ramp never exceeds the steady peak by > 1 dB; AudioParam reaches target in 30-150 ms, not instantly. |
| A5 | A ceiling limiter/soft clipper on Master: the loudest scenario (boss + many adds + player skills) never exceeds 0 dBFS at the limiter input, and the limiter is not pumping (gain reduction bounded). | Boss fight at 100 % all sliders: samples > -1 dBFS at clipper input <= 0.1 %; GR <= 6 dB 95 % of windows. |
| A6 | Voice limiting: per-cue instance cap + retrigger cooldown; a cleave on 6 targets is one layered hit, not six copies. | Total live voices bounded (<= 48); same-cue requests within ~30 ms merged. |
| A7 | Priority-based virtualisation: when the cap is hit, low-priority (ambient/hits) yield to boss/telegraph cues. | Boss cue never reported dropped during a saturated fight. |
| A8 | Interactive music: intensity layers respond to the fight (more hostiles / boss HP / party HP -> more layers), not a flat loop. | music().intensity rises with live hostiles; a layer's RMS measurably differs between calm and heavy combat (>= 3 dB). |
| A9 | Pause / menu overlay ducks the score (Hades: filtered + quieter) rather than stopping it or leaving it blaring under the menu. | Music tap RMS drops 3-8 dB while the pause overlay is open and comes back within 1 s. |
| A10 | Snapshots/states restore cleanly: unpause, resume from blur, and returning to camp leave the mix at the configured levels (no stuck duck, no stuck mute). | After blur->focus and pause->resume the master tap returns to within 0.5 dB of the pre-event level. |
| A11 | One AudioContext for the app lifetime; screen changes never leak contexts or worklets. | Context count stays 1 across title->camp->run->camp->title. |

### B. dB-perceptual volume standard (shipped PC games)
| # | Item | Testable expectation |
|---|---|---|
| B1 | Perceptual (log) mode is the DEFAULT and the slider-to-gain map is a dB law or power law, never raw amplitude. | Default mode reads log in the settings dump; 50 % on log <= -8 dB. |
| B2 | Endpoints agree in both modes: 0 % = silence, 100 % = unity. | g(0) <= -80 dBFS on both; g(1) = 0.0 +- 0.1 dB on both. |
| B3 | Monotonic strictly increasing and smooth; no plateau or inversion between 0/25/50/75/100. | Each step raises the measured tap by >= 1 dB. |
| B4 | Linear and log modes MEASURABLY differ mid-range and the UI labels the active law. | Linear 25 % = -12.0 dB +- 0.5; log 25 % differs from that by >= 6 dB; a label "Linear"/"Log" is visible on the tab. |
| B5 | Switching mode does not jump the loudness (mode is a mapping, not a volume change); the slider position moves to represent the same dB. | Toggle mode at 50 %: measured tap moves <= 0.5 dB; the slider position changes. |
| B6 | Numeric readout (dB and/or %) per channel, updated live while dragging. | Readout text changes on every step; dB value matches the measured gain within 0.5 dB. |
| B7 | A preview/test sound plays on adjust (or a Test button) so the player can hear the level they set without leaving the menu. | Adjusting SFX triggers a cue on the SFX bus; a Test button per channel exists and fires a tone on THAT channel only. |
| B8 | Sensible defaults: music below SFX; master not at 100 %; persisted between sessions. | Defaults music < sfx; reload keeps values within 0.01. |
| B9 | Per-channel mute + a Master mute that is true silence; mute state is visible and persists. | Muted channel tap <= -80 dBFS; reload keeps mute. |
| B10 | Mute-on-focus-loss option that actually ramps to silence when hidden and restores on return (no hard cut, no stuck mute). | visibilitychange hidden -> master <= -60 dBFS within 0.5 s; visible -> restored within 1 s to +- 0.5 dB. |
| B11 | Fine control: keyboard arrows step the slider in small increments (1-5 %), PageUp/Down or Home/End jump; the same slider is draggable by mouse and pad. | Arrow: level delta 0.01-0.05; Home/End reach 0/1 (or a documented alternative). |

### C. Music bed (Hades / Dead Cells)
| # | Item | Testable expectation |
|---|---|---|
| C1 | Music present in title/menu, camp/hub, combat, boss, plus victory and defeat resolutions. | music tap RMS >= -45 dBFS in every state. |
| C2 | Transitions crossfade with overlap, never a hard cut. | Outgoing and incoming layers overlap; the music tap never drops > 12 dB within any 100 ms window during a transition. |
| C3 | No silence gap > 1 s at any transition. | longest window below -50 dBFS during transitions < 1000 ms. |
| C4 | Boss music is a distinct, escalated cue (tempo / spectrum / loudness), not merely the combat loop faster. | Boss vs combat differ by >= 15 % tempo OR centroid, AND the player-felt "escalation": boss RMS >= combat RMS (not quieter). |
| C5 | Victory and defeat resolve with a stinger that is tonally distinct (major/bright vs minor/dark), then settle back to the camp bed. | Two stingers with different centroid / tempo; after 3-5 s the state is camp again. |
| C6 | Music does not restart from bar 1 on every room within a run; combat continues across rooms. | Entering room 2 from room 1 does not trigger a combat->combat crossfade / restart. |
| C7 | Loop boundaries are seamless (no click / gap at the loop point). | Over 60 s of steady state the music tap shows no 100 ms window below -50 dBFS. |
| C8 | Act/theme variation: different biomes carry a different theme (key/tempo/timbre) so a 3-act run is not one loop. | Theme id and measured tempo/centroid differ between Act I and Act II/III combat. |
| C9 | Ambient beds exist and change with the environment (camp fire crackle vs forest vs mill), sitting under the music. | Ambient tap RMS -35..-22 dBFS in camp and in a run; bed id changes with the act. |

### D. Spatial SFX triggers
| # | Item | Testable expectation |
|---|---|---|
| D1 | World-positioned cues pan: a source right of the listener is louder in R; left in L; sign flips. | +6 u: R-L >= 6 dB; -6 u: L-R >= 6 dB; 0 u: abs(L-R) <= 1 dB. |
| D2 | Distance attenuation with a sane rolloff: far sources are quieter, never inaudible at gameplay ranges (the arena is ~20 u wide). | 12 u is 6-12 dB quieter than 3 u; a hit at 15 u is still >= -50 dBFS. |
| D3 | The listener follows the camera/player so panning updates as the party moves. | Teleport the player 8 u right: a cue at a fixed world x flips its pan sign. |
| D4 | UI / music / ambient cues are non-spatial (dead centre, no distance loss). | UI cue abs(L-R) <= 0.5 dB regardless of listener position. |
| D5 | Coverage of the gameplay-critical events: shoot, hit (party and enemy), kill, heal, skill cast, dodge, telegraph warning, boss quake/slam, boss spawn/roar, downed/revive, reward/draft/shop UI, room start/clear. | Each fires a cue in cueLog within the same tick or the next. |
| D6 | Telegraph/warning cues are readable above the mix: a dodge cue in this genre must poke through. | Telegraph cue peak >= SFX average peak, and >= music RMS + 6 dB. |
| D7 | Per-instance variation (pitch / gain jitter) so repeated hits are not robotic. | cueLog shows varying pitch or gainDb for the same cue across >= 10 instances. |
| D8 | No machine-gun sums: a room with 20 hits in one tick does not spike the master. | Master peak during a hit burst < -1 dBFS at prelimit. |

### E. HTML5 autoplay handling
| # | Item | Testable expectation |
|---|---|---|
| E1 | No AudioContext exists before a user gesture on a plain boot; no "not allowed to start" warning in the console. | state === 'locked' before input; 0 autoplay warnings, 0 page errors. |
| E2 | The player is told what to do while locked ("press any key / click"), and that hint clears immediately after the gesture. | The loading/title screen text is visible while locked; disappears after the first key/click. |
| E3 | The first real gesture (key, click, touch) unlocks and the context is running promptly. | running <= 100 ms after the gesture (PLAN) / <= 200 ms (benchmark). |
| E4 | Cues fired while locked are dropped, not queued (no burst on unlock). | After unlock, no > 4 voices start within the first 100 ms from pre-unlock requests. |
| E5 | With the autoplay policy allowing it (kiosk / flag), no prompt is shown at all. | Under the flag the prompt string never appears. |
| E6 | Tab hidden / shown: the context is not double-started, and audio resumes after return. | state 'running' after visible; tap level returns. |
| E7 | Boot does not block on audio: first frame renders with the engine locked; no decode errors. | fps > 0 before any gesture. |

### F. Settings UI / persistence / accessibility
| # | Item | Testable expectation |
|---|---|---|
| F1 | Audio tab reachable from the title AND from the in-run pause menu; changes take effect live (no Apply needed) and persist. | localStorage key holds audio.* after a change; reload shows the same levels and the AudioParams match. |
| F2 | Keyboard: Tab/arrows reach every slider, toggle, mute and Test button; Enter/Space activates; Esc backs out. Focus ring visible. | Every control reached and operated by keys alone; a focus indicator is visible in a capture. |
| F3 | Mouse: sliders drag, clicks on the track jump, buttons click. | Drag changes the level; tap on track sets the level. |
| F4 | Gamepad: d-pad / stick moves focus, left/right adjusts sliders, A activates, B backs. | Mocked pad drives the tab. |
| F5 | Layout: no overlaps, readable type, controls inside the viewport at 1024x576 and 1600x900. | Bounding boxes non-overlapping; font >= 14 px. |
| F6 | Reset to defaults restores the PLAN defaults and the UI reflects it. | After reset: levels = defaults +- 0.01, modes = log, mutes = false. |
| F7 | Honest labels: every control changes something measurable (no placebo toggles). | Each toggle/slider produces a measurable change in a tap or state. |

### G. Mix balance (combat, defaults)
| # | Item | Testable expectation |
|---|---|---|
| G1 | Overall loudness of combat sits in a sane band (not whisper, not slam). | Master median RMS (400 ms) between -24 and -14 dBFS. |
| G2 | SFX peaks read clearly above the music bed. | SFX tap peaks >= 6 dB above music tap RMS. |
| G3 | UI clicks are audible above music but not startling. | UI peak 3-12 dB above music RMS. |
| G4 | Menu / title mix: navigation ticks are audible over the menu score. | UI tick peak >= music RMS on the title. |
| G5 | No frequency masking that hides heals: heal chime has a different centroid than the hit cue. | Centroid differs by >= 20 %. |

Total: 58 items (A11 + B11 + C9 + D8 + E7 + F7 + G5).

## Step log (continued)
- [step2] scout (tools/gntcaudio2-scout.mjs -> captures/gntcaudio2-scout.json, -scout-title.png, -scout-camp.png): v0.5.87, title + camp boot 0 page errors / 0 console warnings; autoplay flag -> engine running at 2808 ms (trial allowed, build 12.3 ms), no prompt; defaults master .8 / music .6 / sfx .8 / ambient .6 / ui .7 all log, muteOnBlur true; buses gainDb master -3.22, music -7.37 (eff -10.59), sfx -3.22 (eff -6.44), ui -5.15 (eff -8.37); menu music bpm 56 dorian layers pad/harp/bass; camp bpm 72 layers pad/lute/bass/drum, bed camp (8 layers); 104 cues, 96 event types; bake worker ready 214 keys 18.26 MB; camp master rms -23.96 dBFS centroid 209 Hz; limiter makeup comp 2.13 dB; camp cost p95 0.7 ms (257 frames, boot).
- [step3] G3.1 curves (tools/gntcaudio2-curves.mjs, -curves2.mjs -> captures/gntcaudio2-curves.json, -curves2.json): 30/30 AudioParam rows = PLAN table to 0.00 dB (max err 0.00); steady-window tap re-measure (1.2 s tone, p90 of 400 ms windows, relative to the 100 % row) 24/24 rows err 0.00 dB in linear AND log for Master/Music/SFX; 0 % -> -999 (silence) on param + tap; master tap ref -18.00 exactly (limiter trim unity). Monotonic yes. Mode switch log .5 -> linear keeps loudness (delta 0.1 dB, slider .50 -> .32). Ramp: 16 distinct AudioParam values over 139 ms to reach 1 %, no step; peak during a 1.0 -> .25 move -15.12 vs steady -14.99 (no click). Master .5 x Music .5 = -20.0 dB (composition exact). First-pass tap rows carried a constant -1.4 dB offset = my 850 ms meter window diluting a 600 ms tone (not the engine; curves2 removes it). 0 page errors.
- [step4] G3.2 decoupling (tools/gntcaudio2-decouple.mjs -> captures/gntcaudio2-decouple.json): Music 1 -> 0 moves the SFX tap 0.00 dB; SFX 1 -> 0 moves the MUSIC tap 0.00 dB; Master 1 -> .5 (log) moves music/sfx/ambient/ui taps -10.00 each (spread 0.00) and the master tap -10.00 for every source. Master mute: every bus tap and the master tap -999 with a tone on each bus; unmute restores -19.97. Music mute: music tap -999, sfx -19.97 untouched. Mute on blur (score playing): master send ramps -32 dB at 110 ms, -64 at 221 ms, -999 from 337 ms; hidden rms -999; visible: -3.8 dB at 106 ms, -0.12 at 429 ms, 0 at 989 ms; rms before -12.54 / after -12.74 (0.2 dB); state stays running. muteOnBlur=false: hidden rms -11.78, gain 0 dB (no mute). 0 page errors.
- [step5] G3.6 spatial (tools/gntcaudio2-spatial.mjs -> captures/gntcaudio2-spatial.json): testTone +6 u R-L 10.38 dB, -6 u L-R 10.38, centre |L-R| 0.00, 3 u -21.34 vs 12 u -29.40 (8.06 dB quieter), 15 u (z) -31.18, 20 u -33.55 (still audible), +-6 u on z (screen up/down) 0.00 pan. Teleport +8 u: listener moved 5.0 u with the camera (camp clamp), a fixed world x now 1 u right reads R-L +2.14 (listener follows). Real cue engine.play('impact', x/z): +6 u R-L 10.38 (log pan .626), -6 u -10.38, centre 0, 14 u 17.08 dB pan & -14.58 peak. UI cue ui_move |L-R| 0.00. 0 page errors.
- [step6] G3.5 music by the real flow (tools/gntcaudio2-music.mjs -> captures/gntcaudio2-music.json, -music-pause.png, -music-boss.png): title menu 56 bpm dorian pad/harp/bass rms -23.9 centroid 296; Enter on New Game -> camp 72 bpm (xf 2000 ms, 0 ms < -50 dBFS); startRun -> combat 104 bpm 6 layers (xf 1500, min 100 ms window -26.9, 0 ms < -50); room 1 -> reward -> room 2: NO transition, combat continues (C6 met); boss room 127 bpm layers drone/pad/taiko/bass/ostinato/stab/lead (xf 2000, min -22.0); the party wiped during the boss sample -> defeat stinger 44 bpm phrase/drone/pad (boss->defeat xf 1500, defeat->camp 2500, 0 ms < -50). Pause (Esc) ducks music -5.34 dB + centroid 253 -> 188 Hz (LPF), resume within -0.41 dB, ducked flag true/false. Acts: mill 96 bpm aeolian centroid 130 bed mill (-28.3), barrow 88 bpm phrygian centroid 105 bed barrow (-27.7) vs wood 104 dorian ~183-227. quitToTitle -> combat->camp->menu (2000/2000). AudioContext wrapper installed after boot counted 0 new AudioContext / 0 new OfflineAudioContext across title->camp->run->boss->camp->title. 0 page errors. My cmd('lose') did nothing (null); cmd probe shows party setHp 0 = defeat, bossHp .02 + win = victory.
- [step7] G3.8 autoplay WITHOUT the flag (tools/gntcaudio2-autoplay.mjs -> captures/gntcaudio2-autoplay.json, -autoplay-{key,click,touch,esc}-{before,after}.png): before any gesture (CDP userGesture:false reads) state 'locked', gestureNeeded true, 0 AudioContext / 0 OfflineAudioContext constructed, 0 console warnings/errors, loading screen shows "Ready" + "Press any key or click" (pixels, key-before.png). Space -> running, unlockedVia keydown, AudioContext 1 + OfflineAudioContext 1 (limiter makeup measure), prompt gone, title music; click -> pointerdown; touch -> touchend; Esc -> stays locked, 0 contexts. runningAtMs - unlockedAtMs = 0.0-0.3 ms in every leg; event.timeStamp -> handler (dispatch on a 41-55 fps boot frame) 136.5 / 110.2 / 123.0 ms (measured while another probe ran concurrently; re-run alone pending). With the flag (-flagprompt.mjs, 3 boots, 120 ms polling with computed styles + screenshots): the .ap-press prompt is visibility:hidden in every sample; the two "visible" flags were text matches on another node - the screenshots at 6356 / 4773 ms show the loading bar "Lighting the hearth..." with no prompt. Running at 1.07 s (flag).
- [step8] intensity (tools/gntcaudio2-intensity.mjs -> captures/gntcaudio2-intensity.json): setIntensity 0 / .5 / 1 in combat: music rms -24.5 / -24.2 / -23.0, peak -14.7 / -12.9 / -12.8, centroid 132 / 299 / 505 Hz; natural: empty room intensity .18 centroid 141 vs 11-43 sustained hostiles intensity 1.0, rms +1.9 dB, peak +2.8, centroid x3.18 (449 Hz). Layers are added spectrally, loudness change small.
- [step9] cmd vocabulary (tools/gntcaudio2-cmds.mjs -> captures/gntcaudio2-cmds.json): unknown cmd returns null (no listing); bossHp(.02) + win -> boss->victory (xf 1500) at +5.7 s, victory->camp 2500, phase victory; lose = null (no-op); setHp(0..3, 0) -> defeat. Stingers (tools/gntcaudio2-stingers.mjs): defeat: combat->defeat xf 1500 at 115 ms, stinger rms -22.62 peak -13.0 centroid 129, 0 ms < -50, camp back at 4.1 s, run_end cue fired; victory leg re-run pending (needs the bossHp + win sequence).
