STATUS: PARTIAL
M3 (audio engine & mixer settings) builder checkpoint. Steps appended as completed.

## Steps
- [start] checkpoint created at v0.5.1 (HEAD 0371432).

## Decisions (PLAN silent or self-contradictory — best-in-class choice recorded)
- D1 Master placement: Master is applied on each bus's `send` gain (after level/mute, before the tap), not once on the sum, so every channel tap reads channel x master (G3.2 "Master moves every tap by the same dB", G3.1 testTone-on-tap). busGain('master') reports the shared send param.
- D2 Limiter makeup: Chrome's DynamicsCompressor applies automatic makeup gain (spec pow(1/fullRangeGain,0.6)); measured per context in an OfflineAudioContext (~+2.1 dB here) and cancelled by a trim gain so the limiter is unity below threshold (G3.1 on the master tap, gain staging). prelimit tap = trim output = clipper input (G3.3).
- D3 Clipper: WaveShaper linear to |x| 0.85 then tanh knee to < 1.0 (curve end 0.964), oversample 4x.
- D4 Listener: camera ground focus lifted 4 u (= refDistance), facing down (forward (0,-1,0), up (0,0,-1)); azimuth = atan(dx/4) instead of pure bearing (PLAN wording pans a source 0.5 u to the side 100 % into one ear). G3.6 numbers: +6u R-L 10.3 dB, 0u 0 dB, 12u vs 3u 8.1 dB quieter (analytic; verified in probe). Spatial voices get +3 dB (sqrt2) so a centred spatial voice equals a non-spatial one per channel.
- D5 Crossfades: PLAN text says 1.0 s into combat but gate G3.5 says every transition 1.5-2.5 s -> combat entry 1.5 s, stingers in 1.5 s, default 2.0, out of stingers 2.5.
- D6 Tempo table for G3.5 distinctness (>=18 % apart within a theme): defeat 44, menu 56, lobby 64, camp 72, combat 104/96/88 (brief), boss = combat x1.22 (127/117/107), victory 152.
- D7 Mode switch keeps loudness for every source except 'reset'/'revert' (engine subscriber moves the level to dbToSlider(currentDb,newMode), rounded to the 0.01 store step).
- D8 Autoplay detection: silent media-element trial (NotAllowedError = blocked, no console output; 60 ms without rejection = allowed) or navigator.getAutoplayPolicy where present. Result lands right after main.js finishes evaluating (~4 s in headless boot), before M1's loading screen reaches `ready`, so no prompt flashes with the autoplay flag. engine.gestureNeeded = locked && trial finished negative.
- D9 Escape never creates a context (no activation); other gestures checked with navigator.userActivation.isActive when available.
- D10 Meters run in an AudioWorklet (Blob module) on the audio thread: exact per-sample coverage, ~0 main-thread cost (analyser fallback). Spectral centroid is probe-only (armed by the first meter()/meterReset() call).
- D11 `sound` events: one per cue REQUEST (incl. cooldown-merged and locked-dropped ones, flagged `dropped`), so "every hit lands with a sound slot" stays true while a 6-target cleave plays one voice.
- D12 registerEventCue(type, fn): fn runs before the built-in map; a non-null result replaces the built-in cues for that event instance.
- D13 Pause duck: single-player blocking overlay while playing -> music -5 dB + 1.3 kHz low-pass (Hades-style); applied before the music bus input so test tones / taps are unaffected.
- D14 ?audio=0: engine built with Master force-muted for the visit (not persisted); unmuting Master in the tab ends it. Tab status line says so.
- D15 Voice accounting: voices() counts SFX/UI one-shots only; music notes and beds are continuous layers reported under music()/ambient().
- D16 Settings UI clicks: any settings change with source 'ui' plays ui_toggle/ui_slider (throttled after a nav cue); audio level sliders preview their own channel instead.
- D17 synth.js deleted; main.js import line for it removed (one line outside the AUDIO anchor, required because the file is gone); engine + tab imports live inside the AUDIO anchor (ESM imports are hoisted).
- [step 1] engine + Audio tab committed at v0.5.6: src/audio/{engine,voices,cues,music,ambient,spatial,meter}.js, src/ui/menu/tabs/audio.js, main.js AUDIO anchor, synth.js removed, calibration tables (87 cues, 11 music states, 4 beds) from tools/gntM3-calibrate.mjs. Verified: G3.1 curves 30/30 rows (param +-0.1 dB, tap +-0.5 dB, master tap), G3.2 deltas 0.00 / 0.00 / master -10.00 on all 5 taps, G3.6 +6u R-L 10.38 dB, centre 0.00, 3u vs 12u 8.06 dB, tab gate (keyboard/mouse/pad) pass, smoke exit 0, core loop portal->room1->reward.
