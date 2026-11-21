# VFX and hit feedback, Part 1: READY

PR #116 (draft): https://github.com/keshliew96-afk/echoes-three/pull/116, v0.5.333, head bf94e44.

## What it does
Items a to e of VFX_HIT_RULES §6.2. Render and audio only.
- **Hit reaction.** Foes squash, flinch away and hop with the real push. Champions and bosses react at half strength, and bosses never hop.
- **Render hold.** Bodies, flares and numerals freeze for exactly the game's hitstop, at any frame rate.
- **Kill.** The body holds, swells, then pops flat, thrown along the killing hit. A white bloom twice a hit's area, a short ring, debris at the pop, and a rumble on the kill sound.
- **Numbers.** Your own numbers arc, pop white and settle to Hearth Amber. Your crits are bigger, with a CRIT! tag in all ten languages.
- **Contact.** A white bloom on every hit. Magic streaks exit through the far side, spells flash the body, and the first impact sound of each tick always plays.

## Checks
- Goldens 9/9 identical.
- npm test: 33/33 probes.
- New probe: 65 checks.
- i18n check clean.
- vite build clean.
- CI green on the previous head.

## Two review rounds, all confirmed findings fixed
- **Round 1.** Champions at half, a flat tipped pop, the Wyrm measured posed, the hold taken from the clock, a mid-hop kill that sinks.
- **Round 2.** Flares and numerals now hold with the bodies below 60 fps. The flash pool went from 40 to 64. CJK CRIT! tags are spaced on their real width. The tag stays on screen at the top edge.

## Caveats
- **Software GL.** The look was seen only there, at about 1 fps. The clips use a virtual 30 fps clock, so the timing is the game's own.
- **Split.** Part 1 is a-e, not a-g, which is the rules doc's own split. Items f and g move to Part 2 (v0.5.334).
- **Kill sound volume.** The kill sound keeps its calibrated level (CUE_CAL.kill).

## Open choices (built as written; say if you want them different)
1. Own crit pop strength (critPop 0.65).
2. Bloom strength (1.6 u per hit, 2.3 u per kill, dimmed in crowds).
3. The 14 §6.3 calls are not in Part 1. All are sim or bigger looks, and they stay yours to pick.

## Shots (/mnt/project-files/vfx-hit-feedback/)
- Stills: before and after of the hit, the hop and the kill.
- de-crit.png and ru-crit.png at 1024x640.
- Clips: before and after fight clips, and a side-by-side at quarter speed.
