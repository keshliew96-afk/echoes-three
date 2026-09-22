STATUS: PARTIAL
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
