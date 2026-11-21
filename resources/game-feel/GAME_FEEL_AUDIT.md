# Game feel audit: 打击感 and 爽感

Echoes v0.5.356 (gauntlet 2672a0d), 2026-11-11. Report only: the feature freeze is on, nothing was changed.
Kesh's ask: the hits, effects, particles, lighting and detail don't meet his bar; brainstorm how to make combat feel more 爽.

## The short version

The game already has most of the textbook pieces (flash, freeze, knockback, squash, sparks, kill pop, numbers, impact sounds).
They don't add up to 爽 for five reasons, in order of how much each costs the feel:

1. **Your hits are drowned by the party's.** In a Level I run your seat landed 10 to 20% of the kills; the AI Archer landed 40 to 60%.
   Every kill shakes the screen the same, whoever made it, and an ally's hit sounds as loud as yours. You're watching a fight more than making one.
2. **Shots are slow.** Every hero bolt and arrow flies 5.2 to 6.0 u/s, so a shot at range lands 0.75 to 0.85 s after you fire. The click and the hit feel unconnected.
3. **The weight beats are too small to see.** The freeze is 2 ticks (33 ms) on a melee hit and 3 (50 ms) on a kill; the references use 6 and 10.
   In busy rooms the freeze budget clips 8 to 23% of them. The camera kick on a Tank basic is about 1 to 2 pixels; the Swordsman, Archer and Healer basics have none.
4. **Clearing a crowd pays the same as killing one.** There's no multi-kill build-up: the third kill in half a second looks and sounds like the first.
   Kills come in a trickle (rarely 3 inside 0.5 s, gaps of 4 to 8 s), and a room clear is a UI chime.
5. **The office laptop can't hold the frame rate**, so every timing beat above gets smeared. A busy fight draws 1,000 to 1,850 times a frame
   into a half-float target with FXAA, plus a 12-pass bloom. On Iris Xe that's GPU-bound, not CPU-bound.

The cheapest wins are tuning existing knobs (render and audio only, goldens untouched): bigger own-seat camera kicks, a quieter party, a kill sound
a laptop speaker can play, whole numbers, less white blowout, and a lighter render path for integrated graphics.
The biggest wins (faster shots, a longer freeze, a multi-kill chain, a horde of weak fodder, a per-hero ultimate) either move the goldens or need the freeze lifted.

## 1. How I measured

- **Code.** Every number below is read from the tables in `src/core/constants.js`, `src/sim/allies.js`, `src/data/vfx.js`,
  `src/render/vfx/`, `src/render/react.js`, `src/render/hold.js`, `src/audio/`.
- **Sim pacing.** A headless run of Level I, seeds 1 to 3, autopilot on (the player seat is the Healer by default), logging every room's
  length, kills, who landed each kill, hits, casts, kill clusters and every hitstop request against what the clock granted.
- **Render cost.** A browser probe that hooks WebGL and counts true draw calls, triangles, instanced draws, framebuffer binds and shader switches
  per frame, plus a CPU profile, in two scenes: Level I room 3 with 14 extra foes (16 to 18 alive), and Level III room 6 with the max-stress party builds and 20 extra foes (24 alive).
  The repo's own `vfx-budget` probe reads `renderer.info.render.calls`, which three.js resets on every pass of the post stack, so its "draw calls" number is the last full-screen pass, not the scene.
- **Stills.** Four shots of the Level I busy fight at 1280x720: `/mnt/project-files/game-feel/busy-fight-1.png` to `-4.png`.
- **Limit.** The cloud renders with software GL at 1 to 3 fps, so I judged every timing from code and stills, not by watching it move.
  Frame times here are software GL's; draw calls, passes and triangles carry over to the laptop.

## 2. What already works

Built by the VFX and hit feedback slices (v0.5.333 to v0.5.339) and earlier:
a white hit flash (3 ticks), a contact bloom held 100 ms, directional sparks and spatter in the body's matter colour, a squash and flinch on every foe
(heavier for skills, 3 ticks longer for shots), a render hold that freezes rigs and ribbons with the sim's hitstop, knockback (0.34 u basic, 0.72 u skill, 167 ms),
a kill pop thrown along the last hit, a decal that stays 20 s, a crit flipbook and CRIT! tag, your numerals in amber and bigger than the party's,
three impact sound families (boom for spells, thunk for shots, cut for blades) with pitch jitter, a cast whoosh, a shot whiz, a rumble under the kill pop,
an anime frame and a 6% zoom punch on combo finishers and elite, champion and boss kills.

So the gap isn't missing pieces. It's that the pieces are small, uniform, and shared out across four heroes.

## 3. Findings

### F1. Your hits are drowned by the party's

| Level I room | kills | your seat | AI Archer | AI Swordsman | AI Tank |
|---|---|---|---|---|---|
| seed 1 room 4 (purge) | 13 | 2 | 6 | 4 | 1 |
| seed 1 room 5 (defend) | 29 | 6 | 11 | 4 | 0 |
| seed 1 room 6 (kill all) | 30 | 3 | 19 | 2 | 2 |
| seed 3 room 6 (kill all) | 17 | 0 | 9 | 5 | 2 |
| seed 3 room 8 (boss) | 10 | 1 | 7 | 1 | 1 |

(Autopilot plays your seat, so a human may do a little better, but the shape holds: three AI heroes share most of the room.)

- Every kill emits the same `screenshake` (0.06 u, 120 ms) whoever lands it (`src/sim/combat.js` `kill()`), so your screen shakes for the Archer's kills.
- Impact sounds are the same level for your hits and the party's (`src/audio/impactcues.js` imports `isOwnBody` only for the whiz).
- Allies' numerals are 0.7x at 45% opacity, but they show decimals ("10.9", "16.3") and in the stills they read about as loud as your amber "8".
- The swing camera kick fires for every seat's melee basic and skill (`SF.swing` in `src/render/vfx/signature.js`), so an AI Tank's slam kicks your camera too. Only the shot kick checks for your own seat.

### F2. Shots are slow

| Hero | basic | interval | speed | flight at max range |
|---|---|---|---|---|
| Healer (you, by default) | bolt, 8 | 0.50 s | 5.2 u/s | 0.96 s (5.0 u) |
| Archer | arrow, 12 | 0.40 s | 5.6 u/s | 0.80 s (4.5 u) |
| Tidecaller | spit, 6 | 0.35 s | 6.0 u/s | 0.75 s (4.5 u) |
| Bellwright | clapper, 7 | 0.40 s | 5.4 u/s | 0.78 s (4.2 u) |
| Tank | melee arc 0.9 u, 50°, 9 | 0.65 s | instant | |
| Swordsman | melee arc 0.75 u, 40°, 11 | 0.35 s | instant | |
| Duskwing | melee arc 0.8 u, 45°, 7 | 0.30 s | instant | |

A ranged hero's shot is still in the air when the next one leaves. The hit lands about a second after the press, often on a foe that has moved,
which reads as "my attack is weak" even when the numbers are fine. Reference action games put a basic shot on the target in 0.1 to 0.25 s.
Raising the speed changes the sim, so it moves the goldens and needs a balance look (the AI Archer would get stronger too).

### F3. The weight beats are too small to see

**Freeze (hitstop).** 2 ticks (33 ms) on a melee-arc hit that doesn't kill, 3 ticks (50 ms) on any kill, capped at 4 ticks per 20-tick window (`HITSTOP` in `src/core/constants.js`).
Shots, novas, ground skills and zones freeze only when they kill; the render hold adds 3 frames of squash for those (render only).
The rules doc measured 6 ticks on a hit and 10 on a kill in the reference videos (VFX_HIT_RULES §6.3 #1).
In the sim run the budget clipped 28 of 155 requests (seed 1), 7 of 52 (seed 2) and 37 of 159 (seed 3): exactly the busy moments, where the freeze should land hardest.
At 30 fps on the laptop, 2 ticks is one frame.

**Camera.** The camera sits 12 u away at a 45° FOV, so 1 u on the floor is about 72 px at 720p and 109 px at 1080p.

| Beat | size | on screen at 1080p |
|---|---|---|
| Tank basic kick | 0.05 x 0.35 = 0.0175 u, 90 ms | about 2 px |
| Tank skill kick | 0.05 u, 130 ms | about 5 px |
| Swordsman, Archer, Tidecaller, Bellwright, Duskwing skill kick | 0.02 to 0.035 u | 2 to 4 px |
| Swordsman, Archer, Healer, Duskwing basic | none (Tidecaller and Bellwright get a 0.015 u shot kick; the Archer's and Healer's wait on your §6.3 #7 call) | 0 to 2 px |
| Kill shake (any kill) | 0.06 u, 120 ms | about 6 px |
| Champion and boss kicks | written 0.35 to 0.65 u, clamped to 0.09 u total | about 10 px |

The champion rows ask for six times what the clamp allows, so everything big lands at the same 10 px. Elite, champion and boss kills also get a 6% zoom punch.

**Knockback.** 0.34 u on a basic over 167 ms, 0.72 u on a skill, bosses immune. That's readable; it's the freeze and camera that are thin.

### F4. Clearing a crowd pays the same as killing one

- No multi-kill or streak logic anywhere in render, audio or HUD (searched `src/render`, `src/audio`, `src/ui`).
- The kill sound caps at 4 voices with a 30 ms cooldown, so a 6-kill nova plays fewer kill sounds, not a bigger one.
- Kills come spread out: in the sim run the best cluster was 3 kills inside 0.5 s, at most once a room; the longest gap between kills in a room was 4 to 8 s.
  Level I foes take 2 to 4 basics each and rooms hold 7 to 30 of them over 14 to 45 s.
- A room clear plays the `room_clear` UI chime. No camera beat, no burst, no loot shower.

### F5. Sound

- Every sound is synthesized (no samples). The impact families are well tuned, but synthesized hits read thin next to recorded ones.
- The kill's weight sits in a 38 to 60 Hz body and a 60 to 150 Hz rumble (`cue('kill')` in `src/audio/cues.js`). Laptop speakers roll off below about 150 Hz,
  so on the office laptop the kill is mostly the pop and the crackle.
- Your hits and the party's play at the same level (F1).

### F6. Readability in the busy fight (stills)

- The contact and kill flares bloom to a white blob where the party meets the crowd (`busy-fight-2.png` centre, `busy-fight-3.png` top centre).
  That's the spot you most need to read; the hero bodies vanish in it.
- Numerals show one decimal place ("10.9", "16.3"). A whole number reads faster and hits harder.
- Level I foes are grey-blue on a dark green-black floor with heavy grass and debris; they read as shapes but not as targets.
- The Ember danger rings and lanes are clear, as they should be.

### F7. Render cost (the office laptop: i7-1255U, Iris Xe)

| Scene | foes alive | draw calls p50 / max | triangles | shader switches | framebuffer binds | live VFX |
|---|---|---|---|---|---|---|
| Level I room 3, before spawns | 5 | 728 / 845 | 360k | 155 | 17 | 51 |
| Level I room 3, busy | 16 | 1,001 / 1,076 | 380k | 232 | 17 | 87 |
| Level III room 6, max-stress party | 8 | 1,095 / 1,389 | 337k | 370 | 17 | 178 |
| Level III room 6, max-stress, busy | 24 | 1,398 / 1,849 | 367k | 421 | 17 | 216 |

The CPU profile was 86% idle and 7% "(program)" on the page's main thread during the busy fight; the VFX director's own update stayed under 1.9 ms.
So the page is waiting on the GPU. What the GPU does each frame:

- **The scene** into a half-float colour target with depth at full resolution, then an FXAA pass. (Correction, 2026-11-11: an earlier draft said 4x MSAA. `stage.js` defaults to 4, but `main.js` passes `msaa = 0`, so the game runs FXAA.)
  At 1920x1080 that's about 2 million pixels x 4 samples x 12 bytes per layer of overdraw, before the transparent VFX stack on top.
- **Every rig part twice**: once for the body and once for its inked hull (`addOutline` in `src/render/toon.js`). That's where most of the 1,000 to 1,850 calls come from.
- **Bloom**: UnrealBloom's highpass, 5 mip levels blurred both ways and a composite, at half resolution: 12 of the 17 framebuffer binds.
- **Output and grade** passes at full resolution.
- There's no quality setting except Render scale (Settings ▸ Display, 0.5 to 1.5, default 1.0) and no automatic fallback.

Iris Xe has no video memory of its own: the 4x half-float target and every blended particle share the laptop's main memory bandwidth with the CPU.
That's why the drop shows up in busy fights (more overdraw, more calls), not in a quiet room.

What you can try today, no code: **Settings ▸ Display ▸ Render scale 0.75** and **Show FPS on**. 0.75 cuts the pixel work to 56%.
If the fps jumps, the fill (overdraw and full-screen passes) is the bottleneck; if it barely moves, the draw calls are. Either number tells me which fix to rank first.

### Per-hero summary

| Hero | basic feel | skills (by delivery) | what's missing most |
|---|---|---|---|
| Healer | slow 5.2 u/s bolt; no freeze unless it kills; thunk sound; no camera kick | 4 bolts, novas, ground zones, wards | the hit lands about a second after the press; kills feel borrowed |
| Tank | 0.65 s heavy arc; 2-tick freeze; 2 px kick; cut sound at 0.8 pitch | Heavy Slam, Brutal Cleave, Shoulder Charge, Earthshatter (arc, freeze); Ground Crack, Whirling Guard, Taunting Roar (no freeze unless a kill) | a slam should shake about 3 times what it does |
| Swordsman | 0.35 s quick arc; 2-tick freeze; no basic kick | 7 arc skills freeze; Blade Storm, Blade Dance, Caltrops don't | the third cut of a string looks like the first |
| Archer | 5.6 u/s arrow; stuck arrows on skill bolts | Volley, Piercing Shot, Rain of Arrows: no freeze on hit | slow arrows, the biggest kill share but none of it is yours unless you play her |
| Tidecaller | 6.0 u/s spit at 6 power, 0.35 s | water voices of her own | the lightest basic in the game |
| Bellwright | 5.4 u/s clapper | bells, peals, knells: her bell kicks are the best tuned in the game (up to 0.07 u) | the clapper basic has none of the bells' weight |
| Duskwing | 0.30 s arc, fastest basic | dives and bites with their own kicks (0.012 to 0.06 u) | hits stack so fast the freeze budget clips them |

Across all 85 skills: 17 are melee arcs (freeze on every connect), 14 projectiles, 17 novas, 18 ground zones and 10 auras (freeze only on a kill), and 9 direct casts (heals and wards).

## 4. Ideas, ranked

Each idea says what layer it touches. "Render/audio" leaves the sim and the nine goldens identical.
Under the freeze, even tuning changes how the game looks or sounds, so every item needs your go.

### Tier 1: tune what's there (render and audio only, small, goldens identical)

1. **Make your hits yours.** Turn the AI heroes' hit sounds down about 4 dB and their contact flares to about 60%. Shake the screen only for your own kills
   (allies' at a third). Kick the camera only for your own seat. Cap allies' numerals below yours. Biggest win for the least code.
2. **A camera kick you can see.** Own basics 0.03 to 0.05 u (3 to 5 px), own skills 0.06 to 0.09 u (6 to 10 px), and give the Swordsman, Duskwing, Archer and Healer basics one.
   Champion and boss rows rewritten to fit inside the 0.09 u clamp so they read as distinct sizes again.
3. **A kill a laptop can play.** Move the kill sound's body up to about 90 to 140 Hz with a short click on top, so it carries on small speakers;
   own kills about 2 dB louder than the party's.
4. **Whole numbers, less blowout.** Round numerals to integers. Dim the contact and kill bloom about 30% when 6 or more foes are near the contact,
   so the party stays visible in the crowd.
5. **A lighter path for integrated graphics.** (Built in v0.5.357, PR #138, as the render scale default only: antialiasing is already FXAA.) Default
   Render scale to 0.85 on such screens. Only defaults change; the settings stay as they are.

### Tier 2: small new beats (render and audio only, goldens identical; new look, so a freeze call)

6. **Multi-kill chain.** Count your kills inside 0.6 s. Each kill in the chain raises the kill sound 2 semitones and grows the burst;
   at 3 the camera punches 2%, at 5 a 4% punch with a short render hold and a "x5" pop by the numbers. This is the single biggest 爽 driver in horde games.
7. **Room-clear beat.** On the last kill: a 0.3 s render hold on the dying foe, a 3% punch, a big burst, and the reward chest drops with a thump.
8. **Auto quality.** If frame time stays over 20 ms for 2 s, step Render scale down 0.1 (to 0.7 at the lowest); step back up when there's headroom. The hit timing holds its shape.

### Tier 3: sim tuning (moves the goldens: re-record once, plus a balance check)

9. **Faster shots.** Hero bolts and arrows from 5.2 to 6.0 u/s up to about 11 to 14 u/s. The hit lands about 0.35 s after the press.
   The AI Archer gets stronger with it, so check her damage share.
10. **A longer freeze.** 3 ticks on a melee hit and 5 on a kill (from 2 and 3), budget 6 per 20 ticks (from 4), and 2 ticks on your own skill hits of any shape.
    Judge it on the laptop: at 1 fps here it can't be seen.
11. **A third-hit finisher on basics.** A hit counter so every third basic knocks back about 1.5x and freezes a tick longer (VFX_HIT_RULES §6.3 #13).

### Tier 4: needs the freeze lifted (new content or big work)

12. **A horde of fodder.** Add a weak foe that dies in one hit and comes in packs of 10 to 20, mixed with today's foes. 割草 (mowing the crowd) is where 爽 comes from in this genre;
    today every foe takes 2 to 4 hits.
13. **A hero ultimate.** A gauge your hits fill, spent on one big screen-clearing move per hero, with its own freeze, punch and sound.
14. **Loot shower.** Kills spill Glint motes that fly to you, with a rising chime, so every kill pays out on screen.
15. **Recorded impact sounds.** A CC0 sample set for hits and kills layered under the synth.
16. **Half the draw calls.** Merge each rig's static parts and their ink hulls into one mesh per material, or draw the ink as a screen-space edge pass.
    Big render refactor; the biggest frame-rate gain after render scale.

## 5. What I'd do first

Pick 1 (make your hits yours) plus 5 (lighter path for integrated graphics) as one small slice: both are render and audio only and both go straight at what you see on the office laptop.
Then 9 and 10 together, since they each move the goldens and are best judged in one laptop session.
If the freeze lifts, 6 (multi-kill chain) and 12 (fodder hordes) are the two that change 爽 the most.

## Appendix: probes

The two throwaway probes are under `/mnt/project-files/game-feel/probes/` (not committed):
`feelperf.mjs` (WebGL call counts and CPU profile, needs `npm run dev` and `npm run net`)
and `feelpace.mjs` (headless Level I pacing, `node feelpace.mjs 1 1,2,3`). Copy them into the repo's `tools/` folder to run; both expect the repo at `/home/user/echoes-three`.
