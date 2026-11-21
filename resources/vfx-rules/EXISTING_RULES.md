# Echoes: the hit feedback and VFX rules the game has today

Handover note for the "VFX and hit rules from nine videos" thread, written 2026-10-25
against gauntlet 7999610 (v0.5.331). Each video rule can be checked against the rows below:
same, stronger, softer, new, or in conflict. Numbers come from the code, not older docs.

## 1. Where a rule would land (the goldens line)

| Lives in the sim (changing it moves the nine goldens and the eventsHash traces) | Render, HUD or audio only (goldens untouched) |
|---|---|
| Hitstop ticks and budget (`HITSTOP`, `src/core/constants.js`; coordinator in `src/sim/combat.js`) | Hit flash look, kill pop, particles, decals, trails |
| Knockback distance and duration (`KNOCKBACK`) | Camera kick and dolly (`src/render/vfx/camerafx.js`) |
| Which events emit a `screenshake` and its amp/duration (`SCREENSHAKE`) | The render clamp on shake events, the shake setting |
| Telegraph timing and cadence (director, BUILD_BRIEF §11) | Telegraph decoration around the sim's shapes |
| Crit chance and multiplier (`CRIT` 5 %, x1.5) | Damage numerals, hit feedback, sounds |

A video rule that asks for longer hitstop, a different knockback, or new shake causes is a
sim change and needs Kesh to name it (CLAUDE.md: never change an existing rule unless the
ask names it). A render-only "hit pause" (freezing a rig or a VFX piece, not the sim) stays
on the safe side.

## 2. The juice contract: every hit lands with all of these (BUILD_BRIEF §9, binding)

| # | Rule | Current numbers |
|---|---|---|
| 1 | Hit flash: the victim mesh flashes white, emissive only, never a material swap | `HITFLASH` 3 ticks (~50 ms at 60 Hz), intensity 1.0; tick-based so it freezes with hitstop |
| 2 | Damage number on every hit | see section 4 |
| 3 | Knockback on non-boss enemies, away from the hit, swept against walls | `KNOCKBACK` 0.34 u basic, 0.72 u skill, over 10 ticks (~167 ms); raised from 0.12/0.30 over 5 ticks because a charging Boar ate the push back and nobody could see it. Bosses immune. **Party never knocked back** (ruling A5). A repeat hit re-arms, never stacks |
| 4 | Hitstop: a global sim pause | `HITSTOP` 2 ticks on a melee-arc connect that does not kill, 3 ticks on a kill blow, never both; same-tick requests top up to the strongest (no 2+2+3); budget 4 ticks per 20-tick window. Bites (`shape: 'contact'`) get none. Granted only during live combat in a run (`combatAllowed()`, `src/sim/world.js`) |
| 5 | A distinct synth sound per event family | BUILD_BRIEF §21, `src/audio/` |
| 6 | Kill: squash-stretch death pop, particle burst, ground decal | pop stretches 0.09 s then collapses by 0.26 s (`src/render/enemies/index.js`); decals cap 40, fade over 20 s (full for 75 %), radius 0.28 to 0.5 u, opacity 0.55 |
| 7 | Screenshake: small, on player-adjacent explosions and kills, **never on ordinary hits** | `SCREENSHAKE` 0.06 u, 120 ms; boss stomp and quake landing 180 ms; render clamps every event to 0.06 u and 200 ms |

Hits carry `dirX`/`dirZ`, so debris sprays along the blow. Instant impacts hold at least
3 to 5 frames (BUILD_BRIEF render rules).

## 3. When the character you play is hit (docs/HIT_FEEDBACK.md, `src/render/vfx/hitfeedback.js`)

| | Light | Heavy (>= 15 % of the bar, 10 % from a boss) | Over time (hazards, Molten, Thorned) | Downed |
|---|---|---|---|---|
| Crimson edge vignette, peak | 0.42 | 0.78 | 0.22, merges, never strobes | 0.95 |
| Side glow toward the attacker | yes | yes | no | yes |
| Arc round your character, pointing at the attacker | 0.6 s | wider | no | yes |
| Rig flash, crimson `#FF4A4A` [strength, s] | 0.62, 0.16 | 0.82, 0.22 | 0.28, 0.12, at most every 0.35 s | 0.9, 0.3 |
| Camera kick along the blow [u, s] | no | 0.045, 0.16 | no | 0.065, 0.22 |
| Sound | `hurt` | `hurt_heavy` | `hurt_soft` | `hurt_heavy`, `downed`, `hurt_down` |

- Pain crimson `rgb(194, 22, 40)` is deeper and bluer than Ember on purpose: "you were hit"
  never reads as "something is about to hit you".
- Every party member flashes crimson when struck; only your own body touches your screen.
- A hit the shield takes whole shows nothing. Nothing shows in camp or menus.
- Camera kick: `camerafx.js` sums kicks and dollies, 35 ms attack then a squared falloff,
  total offset clamped to 0.09 u; crits add a small camera punch (design-VFX §10).

## 4. Damage numbers (`src/render/numbers.js`, `DAMAGE_NUMBERS`)

- Every hit pops one; cap 12 at once (the oldest that is not yours fades first); life 0.8 s;
  rise 0.85 u; 20 px floor; size grows 0.9 px per point; crits 1.4 x with a stronger pop.
- Yours: Hearth Amber `#E8A23D`, weight 900, 3 px outline, 1.22 x, pop overshoot 0.5 (crit 0.8),
  drawn on top. Everyone else's: Bone `#C9C2B3`, 600, 0.7 x, 45 % opacity, pop 0.2 (crit 0.4).
- Damage the party takes: Bruise Umber with a Parchment outline, dropping with a sideways
  shake. Heals: Bright Heal with "+".

## 5. Telegraphs and readability (BUILD_BRIEF §11, §17, §19; design-VFX §2)

- Enemy telegraph: an Ember `#FF5A36` ground decal at the impact zone pulsing at 2 Hz (never
  over 3 Hz) plus a chevron, shown at least 0.7 s before it resolves.
- Cadence: no two player-targeted telegraphs resolve within 1.2 s of each other; at most 2
  attackers telegraph at once; cast starts staggered by at least 1.2 s (boss and adds alike).
- Telegraph shapes (lanes, rings, cones, chevrons) and their timing are sim truth; VFX only
  plays around them. Telegraphs pulse, legendary loot shimmers, never the reverse.
- Shape first, colour second: nothing is told by colour alone.
- Effects never hide a character: ground layers under bodies, airborne layers fade above
  about 1.6 u. Z-order top to bottom: projectiles, characters, enemy telegraphs, friendly
  ground VFX, environment. Friendly zones never look like Ember telegraphs.
- Centre of the screen stays clear; the HUD bands take at most about 15 % of the height.

## 6. Reserved colours

| Colour | Only for |
|---|---|
| Ember `#FF5A36` | enemy threats; on foes now only floor telegraphs |
| Foe Crimson `#B8141F` | foe fire and spells (VFX rework PR 2) |
| Bright Heal `#5FE873` | healing only; no damage effect is green |
| Violet `#B79CF0` | corruption, the Stag, every boss's magic |
| Signal Blue | the mark reticle glyph |
| Hearth Amber `#E8A23D` | your own damage numbers (and the Healer's glow) |
| Pain crimson `rgb(194,22,40)` | you were hit |
| Fox Crimson `#E8577A` | the Swordsman |

Kesh's template colours (design-VFX §11): magic Arcane Purple `#A24BFF`, Celestial Gold
`#FFC94A`, Star White `#FFF4D6`; blade Blaze Core `#FFF3C4`, Blaze Gold `#FFB43C`, Flame
`#F5952E`, Wave Gold `#FFD866`; sci-fi Neon Cyan `#3DF2FF`, Neon Magenta `#FF3DD8`. Known
tension: Arcane Purple sits about 10 degrees of hue from Violet (a magenta `#D84CF0` is the
open alternative); the blade fire leans gold to stay at least 20 degrees from Ember.

## 7. How a beat is built (design-VFX §10 and §11)

- Three movements on every beat: **anticipation** (an imploding ring and lines rushing in for
  about 4 frames before a big cast; Ember lines into an enemy as its telegraph starts),
  **impact** (a two-layer flare, coloured spikes under a white-hot core, popping in over two
  frames, plus flash, light pool and shockwave ring; needle stars for Swordsman and Archer,
  round bursts for Tank and Healer), **dissipation** (ground marks that linger 2 to 6 s,
  embers drifting up).
- Kesh's three templates are the finish on top of each hero's own shapes: magic (celestial
  burst, rune circles, purple and gold, stardust, light beams), knife and sword (fire trail,
  golden waves, sharp sparks, motion blur, explosion), sci-fi (neon cyan and magenta laser,
  holographic bits, glitch, clean vector lines); enhancers: cinematic and volumetric lighting,
  glow, floating particles, energy burst, dynamic motion, UE5 or Octane feel. Per-beat recipe
  table: design-VFX §11 "How a beat is built". Per-skill template: `SKILL_TEMPLATE` in
  `src/data/vfx.js`. Gameplay signals stay readable over the templates.
- Every rule the player gains or suffers shows a visual and plays a sound when it fires
  (CLAUDE.md "Before READY"). The VFX bar is Diablo IV or Hades.

## 8. Settings and budgets

- Settings ▸ Gameplay: **Effects** full or reduced ("Half the particles, no camera kick,
  softer light"), **Screen shake** (off = no camera FX), **Hit feedback** (on by default; off
  keeps only the party thud). BUILD_BRIEF's reduced-motion note (nice-to-have): overshoot
  drops to a static flash, telegraphs hold a static peak but keep the fill sweep.
- Pools: `KIT_CAPS` arc 40, light 16, flash 28, streak 64, cracks 12, pillar 8, star 48, mark
  24, glow 32; `TPL_CAPS` circle 28, beam 18, blaze 48, blast 40, dust 420, bits 160, sparks
  400, head 64. A template piece landing within 2 u of many live pieces comes in fainter (down
  to 40 %) so a stacked fight does not wash out to white. At most 20 telegraphs at once.
- All VFX randomness uses the cosmetic stream; the sim never reads wall-clock time.

## 9. Tools the videos thread may want

- **Speech to text without Hugging Face** (huggingface.co was refused here; GitHub release
  downloads worked). Verified on the model's own Chinese and English samples:
  ```
  pip install sherpa-onnx soundfile
  curl -sSL -o sv.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17.tar.bz2
  tar xjf sv.tar.bz2   # ~1 GB download; use model.int8.onnx
  ffmpeg -i video.mp4 -ac 1 -ar 16000 -f segment -segment_time 20 seg_%03d.wav
  ```
  ```python
  import sherpa_onnx, soundfile as sf
  d = "sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17"
  rec = sherpa_onnx.OfflineRecognizer.from_sense_voice(model=f"{d}/model.int8.onnx",
        tokens=f"{d}/tokens.txt", language="auto", use_itn=True, num_threads=4)
  a, sr = sf.read("seg_000.wav", dtype="float32")
  s = rec.create_stream(); s.accept_waveform(sr, a); rec.decode_stream(s); print(s.result.text)
  ```
  It handles Chinese, English, Japanese, Korean and Cantonese; 20 s segments keep it accurate.
- Before Kesh's network change the proxy let through only the bare `tiktok.com`; it refused
  `vt.tiktok.com`, `www.tiktok.com`, `m.tiktok.com`, `*-webapp-prime.tiktok.com`,
  `*.tiktokcdn.com`, `*.tiktokv.com` and `tikwm.com`.
