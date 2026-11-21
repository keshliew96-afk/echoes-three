# Bellwright ability page: notes

Page-only design work (the game freeze holds). Kit 1.2 from `/mnt/project-files/bellwright-talents/`.
Built 19 Nov 2026 (v1, kit 1.1) the same way as the Tide Caller and Windbriar pages.

## v2 (20 Nov 2026): kit 1.2, no heal and no shield

Kesh: "make it no heal or shield, only buff or debuff". Rebuilt cards:
- F18 Vesper Chime, all four: Lulled 入静 (Base), Friends' chord 友弦, Leftover 余响, Common foe 同仇.
- F19 Tuning Fork base: haste only. F20 Solo 独奏 replaces Golden Bell: Base, Drummer 鼓手, Your turn 轮奏, Upstaged 抢戏.
- Harmony F1 Loud bell 扩音钟, F4 Catching 传染, F5 Parade (tolls, no shot block), F16 Crescendo 渐强, F22 Clear the floor 清场.
- Reverb F22 Dead air: silences shooting, casting and calling, cuts a cast; no shot block.
- C10: Peal and Carillon ring a Bell Jar, the dash bell and the Anthem's bells (no Golden Bell).
- Kept as passed: the bell dash, Wing Hop, Click, Bat back, Rouse. Text-only changes (R4/R12, P2, T12) need no clip.
- New helpers in defs.js: lull, friendSwing, soloOn.

## What is on the page

- Core: Sympathy (R5), Third stroke and Chord (R6), basic attack (R8, as passed + the great bell
  standing and hanging 5 s), bell dash (R9, as passed: the Tripo bell, untouchable from frame 1).
- Base forms of all 26 skills (Bell F1-F8, Note F9-F16, Tune F17-F24, passives F25-F26).
- Every card with forms switches Base / Bell Array 钟阵 / Reverb 回音 / Harmony 和鸣
  (core cards too; F25-F26 have no forms). A header switch sets every card at once.
- The twelve combos C1-C12, shown in their base form, with a ① ② step label in the corner.
  How each style changes a combo is in `BELLWRIGHT_COMBO_IDEAS.md` "Under each style"; not drawn.
- Chinese first, English switch (remembered in this browser), speed 1x / 0.5x / 0.25x, click to pause.

## Look

- Flat grid floor, dummy units (white foes, blue friends, larger elite, darker boss). Her passed
  Tripo model with its passed clips; knee bones from the start (`knees.js`, as KNEES.md; the passed
  idle, walk, run, dash, combo and hop never bend).
- Colours: Bell Brass #F5D06B, Verdigris #86D3B4, Old Bronze #8A6A3E, pale #FFF2CC. Foe fire Foe
  Crimson #B8141F. Off-key is dull verdigris #5F8F7C, never violet. Friends' hits are verdigris arcs.
- Marks: Ringing = two brass arcs by the head; Off-key = dull cracked ring over the head; In Tune =
  a ring at a friend's feet. Number tags: 音 Note, 回 echo, 应 a bell answers.
- Bells: small bells and chimes are her back bell's mesh; great bells and the Bourdon are the
  passed Tripo dash bell (clapper cut). Bourdon is tinted a darker bronze.

## Stand-ins and guesses (say so if Kesh asks)

- All numbers are the kit's drafts. VFX are simple drafts; real VFX come in the VFX phase.
- The Tuning Fork is a simple stand-in mesh. The temple log (Bell Array F10) is a plain cylinder.
- Walls in Reverb F9 are plain boxes.
- Shot-blocking (Parade, Dead air), Discord and Drag the beat are shown with tags and simple
  rings; no new foe clips.
- Seen only as stills in software GL (about 1 fps in the cloud). Feel and speed are judged on
  Kesh's laptop.

## Files

- `site/` is what is published (index.html, bw.js engine, poses.js, defs.js helpers, core.js,
  base.js, ar.js, re.js, ha.js, co.js, knees.js, beetle-model.js and bell-model.js = the GLBs as base64).
- `tools/` holds the sources: the same js files, `mkpage.py` (builds site/), `style.css`,
  `test.html` (one card: `?id=F7`, `?id=ar:F7`, `?clip=castBloom`), `shots.cjs` (contact sheets),
  `shot.cjs`, `sheet.py`, `beetle.glb`, `bigbell.glb`.

## Rebuild

```
cd tools && python3 mkpage.py          # site/index.html with jsDelivr three@0.170.0
python3 -m http.server 8123 (from the folder above tools/) and open /tools/test.html?id=ha:F6 to check one card
NODE_PATH=/opt/node22/lib/node_modules node shots.cjs ar F1,F2 6   # sheets in /tmp/s/
```

Card words come from each clip's own captions (mkpage.py reads `A.cap`, `capA` and `two`), so the
words and the clip cannot drift apart. Core card words and their style lines are hand-written in mkpage.py.

## When Kesh marks forms

Send the marked forms to the design thread (cmsg_01T9kVc7qNub7xZ7DH6oTE5yJE6DxBvC6HEbeM4d9hmYxN)
with his message attached; rebuild only those cards (one def each in ar.js / re.js / ha.js).
