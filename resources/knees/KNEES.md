# Knees on the hero ability pages (19 Nov 2026)

Kesh, 19 Nov: "add for other hero to have knees as well" (after Ashfang's page v33).

## The rule (every hero page, and Tide Caller's when it is made)
- The GLB stays untouched. On load each leg gets a knee bone halfway down; the foot hangs from it and the
  leg's skin below the knee follows it (blended over 10 cm).
- Skill moves bend the knee forward, pointing where the hips face (no 外八; a heavy character such as
  Stonehide is exempt from the no-splay rule, but the knee still points forward).
- Where a baked clip slid the leg root up into the body (the old hidden knee bend), the root keeps half of
  that slide and the knee bends for the rest; the foot stays where the clip put it and keeps its turn.
- A foot the clip sank through the floor comes back up onto it (only as far as it is both under the floor
  and under its rest height in the body's own frame, so a body sunk into the floor on purpose is left alone).
- Idle, walk, run, dash and the passed basic attack never turn the knee (weight 0), so they look exactly as before.
- Check clothes for clipping (Ashfang's knee poked through his kilt, Kesh 19 Nov "穿模"). The solver has a
  `maxThigh` cap (degrees the thigh may swing forward past the clip's own leg line) for that.
- Mark changed clips on the page with a gold "膝 · 新 / Knees · new" chip and a note box.

## Code
- `knees.js` here: `addKnees(scene)` and `kneeSolver(model, opts).solve(weight)` (three.js, no other deps).
- Duskwing page: duskwing-abilities/tools (dw.js, knees.js, kneeaudit.*, kneeview.*). Windbriar: windbriar-abilities/tools (wb.js ...).
- Stonehide review build: tripoTank.js calls the same solver after the mixer (copy: stonehide-abilities/tools/review-only-build/).

## State
- Duskwing page v14, Windbriar page v11 (v12 after its kit 2.6 merge): knees PASSED by Kesh 19 Nov 01:27 UTC ("the knees part mark pass").
- Stonehide and Mosslight: their armour skirt and robe cover the knee, so the bend barely shows (stills:
  stonehide-mosslight-knees-side.jpg). Kesh 19 Nov 01:16 UTC picked "1": their passed pages stay as they are;
  they get knees when their models go into the game. A ready Stonehide review-build version with knees is
  stonehide-abilities/tools/review-only-build/tripoTank.knees.js + reviewKnees.js (retake stopped, not published).
- Tide Caller: no page yet. Use this rule when its page is built.
