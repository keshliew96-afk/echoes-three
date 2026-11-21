# Duskwing ability page: notes

Page: base forms (passive Night Hunt, basic attack, dash, F1 to F26) from kit 1.2
(`/mnt/project-files/duskwing-talents/DUSKWING_KIT.md`), plus the Rampage 连斩 forms (version 2) and the Sanguine 饮血 forms (version 3): a per-card switch and
an "All" button per style; F25 and F26 have no form. Phantom and combos C1 to C12 come next. Built like the Windbriar page: one live three.js renderer,
each clip a pure function of time, the bat GLB from `tripo-pilot/bat-model/` embedded as base64.

## Files

- `site/`: what is published (index.html, dw.js engine, poses.js body clips, defs.js clips, ra.js Rampage forms, sa.js Sanguine forms, duskwing-model.js).
- `tools/`: sources. `python3 mkpage.py` rebuilds `site/` (`local` uses ../node_modules/three);
  `node batch.cjs <out> F1,F2` writes 9-frame contact sheets; `test.html?id=F7` shows one clip.

## Rig facts

- His 19 bones spread the wings fully (upper arm raised 70 to 85°, hand opened a little); with a
  60° twist they go flat like blades (Wing Wheel, Crescent Wings).
- No jaw bone: every bite is the passed bite mark plus a head lunge.
- Passed clips used as they are: combo (basic attack), dash, castPoint (Echo Screech), castBloom
  (Nightfall), castPlant (Bloodbite), castSweep (Talon Rake), dive (Dusk Dive). The rest are new
  runtime clips in poses.js on the passed clip conventions.

## Stand-ins and guesses

- Numbers on the dummies are the kit's first guesses; the passive's 20% shows as a rose number.
- The Combo count (top right) and the cooldown squares (bottom left) are page HUD, not the game's.
- Foe bolts are a short Foe Crimson streak from a dummy.
- Blood: dark red of his passed claw marks, Dusk Rose glow. Night: ink and Dusk Plum smoke.
- Blood Moon is a flat red disc above him; Death Mark is a rose skull sigil over the foe.
- Rampage: the Combo count starts at about 10 in each form clip so the rose after-images show
  (one more image for each 10 Combo); the count turns rose at 15 (the passive's 20%).
- Rampage cooldown and speed gains (T1) are not drawn; the clips play at base speed.
- Sanguine: the health bar (bottom right) starts at 62 of 100 (40 in Blood Moon, 80 in Roost) and
  counts T2's 15% (5% from area hits, zones and bleeds) as drops flying home, with no number; the
  green numbers are the form's own heals. Health above full turns into the blood shield (up to 24).
- Sanguine Shadow Veil shows two bolts, not three, so 6 of the shield is left to heal him.
- Phantom: every backstab number on a dummy is the kit's number with Night Hunt's 20% and then
  the sure crit (×1.5), so ×1.8 (shown rose with "!"); captions read "18 → 32". Defence is not drawn.
- Phantom: Unseen is drawn as the see-through plum body with an "Unseen" tag bottom right. The 2.5 s
  idle Unseen is told on the passive card, not played.
- Phantom guesses: Last Bite's foe is under 30% health, so its 24 doubles to 48 (86 as a backstab).
  Bat Swarm bites 5 a second (the base rate). Eclipse rings reach 4 u; Echo Screech's ring 5 u.
- Combos (co.js): one clip each, showing one pair from each rule (the chip under the name says
  which). C3 and C9 have no Chinese name in the kit: 蝠追死兆 and 推血 are my guesses. Numbers
  follow the kit with the passive's 20% where the foe bleeds or is blinded (C1 bite 29, C8 moon 36,
  C9 rake 18, C11 stab 26, C4 screech 12). C8 shows Blood Moon's 35% doubled to 70% as one heal.
- Motion seen only in software GL (stills); feel needs a look on a laptop.

## Open choices (not built)

- None yet.

## v13 and v14 (19 Nov): knees
Kesh 19 Nov: "add for other hero to have knees as well". His legs get a knee bone halfway down on load
(tools/knees.js; the GLB is untouched). Skill clips bend it forward (no splay); feet his crouches sank into the
floor now stand on it. Idle, walk, run, dash and the passed basic attack (B) and every dash card (D forms)
never bend it (`noKnee`, PASSED in dw.js). Changed cards carry a gold "膝 · 新" chip. Audit: tools/kneeaudit.html
(knees.json, most bend per card), side and front stills: tools/kneeview.html. v14 fixed the floor rule so the
Phantom sink into the floor is left alone. Seen only as stills. Rule: /mnt/project-files/knees/KNEES.md.

Kesh 19 Nov 01:27 UTC: "the knees part mark pass". The knees are passed; the "膝 · 新" chips can go at the next publish.
