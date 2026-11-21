# Windbriar VFX dream loop (page only, game frozen)

Started 20 Nov 01:44 UTC ("windbriar now start the vfx"). PAUSED 01:48 UTC: Kesh paused all VFX except Tide Caller,
which is the trial for the element method. Resume only on his word.

## Method (Kesh 20 Nov 01:46 UTC)
Not 4 skills. List her effect ELEMENTS, shoot one clear frame per element with its own repaint prompt saying how that
element should look, then swap each element's new look into every skill that uses it. Follow whatever the Tide Caller
trial settles.

## Setup (works on her passed v26 page, not the game)
- Copy /mnt/project-files/windbriar-abilities to a scratch dir; in tools/: `npm i three@0.170.0` one level up and
  symlink `three`; decode site/windbriar-model.js (base64 between the first quotes) to tools/windbriar.glb
  (the old tools/windbriar.glb is stale); serve tools/ on 8123 (python3 -m http.server, as a background task).
- Shooter tools-vfx/shoot.cjs: `node shoot.cjs <id|de:F10> <outprefix> t1,t2` from tools/; env W,H (canvas px,
  default 1920x1200), EL, AZ, CAM (json card cam), captions hidden unless NOCAP=0. Page card camera, grey tile floor.
- Every effect is in wb.js `FX.*` (uses in defs.js): arrow 126, ring 122, trail 115, dust 67, tube 35, spark 32,
  helix 24, stuck 17, disc 16, twister 6, tunnel 6, toss 6, suck 6, reticle 5, rain 4, kestrel 2.

## Element list and the frame picked for each (survey sheets in survey/)
1. Arrow in flight + trail (Blade gold-white): F9 Volley t 0.62
2. Hit spark / impact burst: F9 ~0.69 or F2 2.58-2.62 (not final)
3. Wind rings (jade charge rings): F2 Power Shot t 2.0
4. Wind spiral round an arrow (helix + tunnel; Skypiercer drill too): F2 t 2.62
5. Kick / bow swing trail: F19 Crescent Kick t 0.58
6. Arrow rain + stuck arrows: F10 Rain of Arrows t 2.0
7. Twister: F14 Tornado Shot t 1.5
8. Wind pull cords (gather): F20 Windknot t 1.0
9. Landing shockwave ring + dust: F24 Eagle Dive t 1.66
10. Reticle + giant falling bolt: de:F10 Sky Bolt t 1.5 / 2.35
Next on resume: final 1920x1200 shots of each, then one message per element with a full paste-ready prompt.
