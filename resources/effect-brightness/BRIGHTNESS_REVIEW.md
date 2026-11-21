# Effect brightness review (v0.5.357, report only)

Kesh's ask (2026-11-11): the white burst in his red box is too bright and hides what is under it.
Feature freeze is on, so this is a readability review. No code has changed.

## 1. What the burst in the red box is

It is an **enemy kill** that lands on top of the hits before it. The pieces come from
`enemyDeath()` in `src/render/vfx/signature.js`, with the numbers in `KILL_FX` (`src/render/vfx/sig/common.js`):

- a near-white bloom sprite, size 2.0 u, held 0.117 s (`KILL_FX.bloom`, `bloomOpacity 0.35`);
- a bone-white spiky "burst" star, size 1.0, plus a white core star (the rays in his shot);
- a thin white shock ring of radius 1.0 u (the circle in his shot);
- on the same spot: the killing hit's own contact bloom, class flash and two stars, and the
  dying foe's body lit white by the hit flash (`HITFLASH.intensity 1.0`, `src/core/constants.js`).

Each sprite on its own is held just under the bloom threshold (`soft()` in `src/render/vfx/kit.js`).
But they are **additive**, so 5 to 10 of them on one spot add up far past it. Then the bloom pass
(`BLOOM` in `src/render/stage.js`: strength 1.35, threshold 0.68, radius 0.6) spreads that sum
into a white disc about 2 to 3 u wide. That disc covers the foe, the hero next to it and the numbers.

I reproduced it in the same land (Uneasy Woodland, rooms 3 and 4, four heroes, 10 to 14 foes):
`before-hold-room-1.jpg`, `before-hold-room-2.jpg`, `before-busy-fight.jpg`.

## 2. Measurements

Blown pixels means luma of 240 or more, measured in the play area (HUD rows left out).

**Bloom does most of the damage.** I froze blown frames in a busy fight and measured a box
around the blob (440 x 360 px at 720p), first as it is and then with the bloom pass off:

| Frame | Blown, now | Blown, bloom off |
|---|---|---|
| busy fight A | 15.9% | 2.9% |
| busy fight B | 13.3% | 2.2% |
| busy fight C | 20.0% | 1.9% |
| busy fight D | 14.1% | 1.8% |

So bloom turns about 2% of truly white pixels into 13 to 20%.
`before-busy-fight.jpg` next to `before-busy-fight-bloom-off.jpg` shows the same frame both ways.

**What feeds it.** I hid each glowing object near the blob one at a time and measured how much
of the blob went away. These were the largest:

1. The foe body lit white by the hit flash (emissive 1.0). It was the top source in 4 of 6 frames.
2. The template kit's skill heads, blasts and blade traces (`vfxtplkit`: Archer shots, Swordsman trace).
3. The kit's stars and flashes (`vfxkit`: contact bloom, kill bloom, kill burst).
4. A keg blast: a parchment glow sprite 4.2 u wide that grows to about 6.7 u, with tone mapping off
   (`keg_blast` in `src/render/interactables/index.js`). It was the top source in one frame.
5. Torch floor pools (`arena` dressing, tone mapping off). They are not combat, but they lift the floor under the fight.

**No single skill is the problem.** I cast each hero skill alone into a pack of 5 dummies and
took the peak blown share of the whole screen. The worst single effects were Lunge Strike 2.8%,
Peal 2.4%, Ripple Step 2.0%, Bubble Ward 1.9%, the Duskwing's basic hits 1.7% and Clapper 1.5%.
Most skills stayed under 1%. A kill alone was 0.2 to 1.1%, and a keg blast alone was 0.6%.
In every row, bloom made the blown area 3 to 10 times larger.
The blowout happens when four heroes' hits, a kill and a foe's white body all stack on one spot.

Coverage: 61 effects were measured. That is the basic hits and the kill for six heroes, the keg,
and the first 8 of 11 skills for the Tank, Swordsman, Archer, Tidecaller, Bellwright and Duskwing.
The probe missed the last 3 skills of each kit and the Healer's skills (its swap and seat
handling failed). The Healer's basic hits and heals do appear in every busy-fight frame.
I can finish those rows if you want them.

## 3. The same frame, four ways (`compare-1.jpg` to `compare-3.jpg`)

Each grid shows one frozen busy-fight frame:
top left is now, top right is bloom 0.9, bottom left is the stack cap, bottom right is both.
The single frames are saved as `frameN-<variant>.jpg`, and there is a bloom-off reference for each.

The stack cap in these shots is a stand-in for the real fix. It caps the foe's hit-flash glow at 0.45
and draws every additive kit sprite at 60%. The real change would leave rings and floor warnings
at full strength, as already settled. Measured on the box around each blob:

| Variant | Frame 1 (keg) | Frame 2 | Frame 3 |
|---|---|---|---|
| now | 10.2% | 13.1% | 11.8% |
| bloom strength 0.9 | 7.2% | 10.1% | 9.0% |
| bloom 0.8, radius 0.35 | 7.3% | 10.3% | 9.3% |
| bloom threshold 0.95 | 9.6% | 11.9% | 10.9% |
| stack cap | 4.9% | 0.8% | 2.1% |
| stack cap + bloom 0.9 | 3.9% | 0.4% | 1.3% |
| bloom off (reference) | 2.7% | 4.3% | 4.1% |

- Turning bloom down alone only removes 22 to 30%, and it also dims every torch and glow in the game.
- Raising the bloom threshold barely helps. It would also move every colour that `underBloom()` caps, because that cap is set from the threshold.
- The stack cap removes 52 to 94%. In frames 2 and 3 it ends up with fewer blown pixels than
  bloom off, because the foe's body no longer turns into a white block. The hard white hit cut still shows.

These were seen in software GL at 1 to 2 fps, so they are judged from stills.
The flash timing (50 to 117 ms) still needs a look on the laptop.

## 4. Fix picks

1. **Stack cap on hit and kill light (my pick).** Cap the foe hit-flash glow just under bloom
   (the Gale Herald's `flashScale` already does this for one foe), so the white cut stays and the body still reads.
   Also give stars, flashes and template heads one shared light budget per spot, extending the
   `crowd()` and `liveNear()` dimming that only the contact bloom has today.
   Rings, shapes and warnings stay at full strength. Measured −52% to −94%.
2. **Lower the global bloom strength from 1.35 to 0.9.** It is one number, but every glow, torch and boss
   aura gets dimmer too. Measured −22% to −30%.
3. **Both 1 and 2.** Measured −62% to −97%. This is the calmest result.
4. **Smaller kill burst only.** Bring the kill's white bloom from 2.0 u to 1.2 u at about half
   opacity, and keep the burst star and ring. This aims at exactly the burst in his box,
   but it does not touch the hit stacking. Not measured yet.
5. **Keg blast glow under tone mapping.** Its 4 to 7 u parchment sprite skips tone mapping. Bringing it under
   tone mapping and halving its size keeps the blast readable. It can be added to any pick above.
6. **Wait.**

The 'Effects: Reduced' setting already exists (`VFX_INTENSITY.reduced`, light 0.45), but it does not
touch the foe hit flash or bloom. Pick 1 also helps players who choose Reduced.

The probes I used for this review are throwaway files and were not committed:
`tools/_bp-scout.mjs`, `_bp-attr.mjs`, `_bp-variants.mjs` and `_bp-skills.mjs`. They need a
temporary `__stage` handle on the debug API.
