# Flat stage for the ability review pages (review-only, never commit)

Kesh, 17 Nov: ability pages on a flat square floor with dummy units.

- `reviewFlatStage.js` -> `src/render/critters/reviewFlatStage.js`. With `?flat=1` it hides the room
  dressing (the active layout's `group`, re-hidden every frame), drops fog, hides the ground decals (kill splats and scorch burns in the `graybox` group, and the dark stain under the VFX kit's ground marks in `vfxkit`, renderOrder -8; the glowing seam stays, and a foe glob's dark slick in `enemyfx`, a dark NormalBlending CircleGeometry), which read as black blobs on the light floor, sets a dark background, and
  adds a 40 x 30 floor of 1 u square grey tiles (canvas texture), a lighter 24 x 16 edge (the room),
  and its own hemisphere + directional light. `dress(r, e)` draws a foe as a training dummy: the foe's
  own rig is moved into a hidden child group (so hit numbers and markers keep their anchors), and a
  dummy (base, post, canvas body, rope bands, crossbar, head) wobbles and flashes when its hp drops.
- Hooks (3 lines), see `hooks-with-stonehide.diff` (it also shows the Stonehide fx hooks around them):
  1. `src/scenes/arena.js`, imports: `import { createReviewFlatStage } from '../render/critters/reviewFlatStage.js';`
  2. `src/scenes/arena.js`, after the scene's other setup (it needs `stage` and `active`):
     `const reviewFlat = /[?&]flat=1\b/.test(location.search) ? createReviewFlatStage({ stage, getActive: () => active }) : null;`
     `if (reviewFlat) window.__reviewDummy = reviewFlat.dress;`
     (in Stonehide's build it is also gated on `?tripo=1`.)
  3. `src/scenes/arena.js`, in `update()` beside the other per-frame updates: `if (reviewFlat) reviewFlat.update();`
  4. `src/render/enemies/index.js`, where a new rig is made, just before `rigs.set(e.id, r);`:
     `if (window.__reviewDummy) window.__reviewDummy(r, e);`
- The game's own training dummy (`spawn('dummy')`, a bone capsule in `graybox`) is dressed the same way; its hp is read from the nearest sim dummy.
- Recorder: `rec.cjs` adds `&flat=1` to the URL when run with `FLAT=1`.
- Colours: floor greys #6A665F / #625E58, joints #4E4B46, edge #8A867E; dummy canvas #A39C8E, wood
  #4A3B2C, rope #8C8472. None of the reserved colours.
- `rec-dump.cjs`: rec.cjs plus `DUMPF=<frame> DUMPXZ=x,z` to list every visible mesh within 3 u of a floor point at that frame (how the blobs were found).
