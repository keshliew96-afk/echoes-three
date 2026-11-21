# Stonehide motion build (review only)

Bakes Stonehide's skill moves onto his passed model for the ability review page.

- `base.glb` is the passed model: copy `/mnt/project-files/tripo-pilot/tank-model/tank-tripo-rigged.glb` here as `base.glb`.
- `npm i` (gltf-transform, three), then `node build3.mjs moves.glb` builds every clip in `moves.mjs` onto the base.
  `ONLY=a,b SRC=moves.glb node build3.mjs moves.glb` rebuilds some clips in place.
- `node audit.mjs moves.glb "" out.json` measures foot slide, start and end pose jumps, jerk, ear and tail swing.
- `python3 shots.py clip:t,t,t[:views]` writes a still strip `s-<clip>.png` from `out.glb` (views q, s, f, t, b).
- `base-lib.mjs` is the model page's clip file with its helpers exported. `build3.mjs` is the model page's build
  plus the foot lock, and ramps that zero the corrections at a clip's first and last frame.
- The review build loads the result as `public/review/tank-tripo-moves.glb`.

Key language: see the top of `base-lib.mjs` and `moves.mjs`. Clip options added here: `plant:false`, `free:[[t0,t1]]`
(feet left alone), `upper:true` (a note only: the page plays these on the trunk and arms, the legs keep walking).
