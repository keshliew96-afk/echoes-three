# Baseline v0.3.0 — carried-forward gaps (integration critic, 16/20, no zeros)

Score by REFERENCE_BAR check: C1 2/2, C2 1/2, C3 2/2, C4 2/2, C5 2/2, C6 1/2,
C7 2/2, C8 1/2, C9 1/2, C10 2/2. Criteria 1-3 (Round-A behaviours, healer
sim-driven animation, party read) all HOLD in the integrated arena.

## Owned by the polish chain (Round C)

STATUS v0.3.15 — all seven closed and re-verified against captures; see
"Measurement basis" at the foot of this file for the two clauses whose
measurement basis had to be pinned.

- F1/C2: ~6-8 mid-field amber light pools have NO visible emitter (reference: every
  pool has a source) — tie each to a torch/lantern/brazier or cut it. Cool ambient
  share 1.3-1.4% vs reference 76%: no warm-vs-cool attention funnel yet.
- F2/C6: 4.5-8.8k px per frame sit in the reserved Ember danger band (h5-25) with
  zero enemies: orange furniture at the north wall + floating berry clusters.
  Re-hue toward amber/brown out of h5-25. (Enemies block will then own the band.)
- F3/C8: projectiles cast no contact blob shadow (brief S19.2: shadow under every
  entity including projectiles).
- F5: identity-ring hues are pastel-washed (Swordsman ring #eec6cd vs #6B2E3A wine;
  Healer mint-cyan vs sage) — legible but off-palette. Archer bow reads as a
  closed 'D', not an open arc.
- F6: dash smear renders as one solid white slab, not staggered afterimages.
- F7: floating orange berry/particle clusters hover in mid-air (detached emitters).

## Owned by other blocks
- C9 (HUD 1/2): Zone-1 command bar (portraits/HP/skill slots/dodge radial) +
  Zone-2 banner — HUD block.
- C6 remainder: Ember band becomes enemy-exclusive once telegraphs land — Enemies
  block.
- F8: training dummies are bone-white; enemy family must be cool-desaturated per
  the brief or white hit flash stays unreadable — Enemies block.

## Measurement basis for the polish-chain items (pinned, v0.3.15)

Fix-round-2 measured a boundary case worth pinning before someone reads it as a
regression. Criterion 2's clause "warm pools stay dominant over cool" is a
statement about the PLAYFIELD, not about the whole framebuffer.

The out-of-arena rock/void surround is a dark, deeply saturated teal
(rgb(9,37,41), h188, HSV s0.78) and fills ~25% of the frame whenever the player
stands at a wall — the desaturated dark ring that REFERENCE_BAR reference C uses
as its attention funnel. Because HSV saturation is relative to the max channel,
those near-black pixels count as fully "cool" in analyze.mjs, so at a wall the
whole-frame split inverts even though nothing about the lighting changed:

| variant-1 framing | whole frame warm/cool | box 260,140,1080,620 warm/cool |
|---|---|---|
| centre (spawn)    | 19.9 / 11.5 | — |
| east wall  (x 9)  | 20.2 / 26.4 | 23.7 / 13.3 |
| west wall  (x -9) | 17.8 / 20.4 | 22.1 / 10.8 |
| south wall (z 6)  | 17.2 / 20.2 | 16.5 /  9.1 |
| north wall (z -6) | 17.2 / 23.1 | 20.9 / 11.1 |

Captures: `pz-v1.png`, `pz-we/ww/ws/wn.png`. Warm stays dominant and cool stays
over the >=8% counterweight floor in every one of those framings once the
surround is excluded; the reserved-band count is 43-75 px in all of them, far
under the 500 bar, framing-independent. So: **measure criterion 2 on a
centre-arena gameplay frame, or inside an interior box.** Making the whole-frame
clause hold at a wall would mean neutralising the surround's chroma, i.e.
deleting the attention funnel the same rubric asks for.

Two quality notes that are NOT defects of the light rig:

- The wall torches' flame sprites sit above the top edge of the fixed gameplay
  camera (measured, variant 2: all four torch billboards project to sy -2, 257,
  472 and 1293 — only the braziers and lanterns are framed). What reads as a
  "near-white column" at the north wall is the torch stake plus its bloom skirt,
  not a flame that failed to look like fire. The pool is still attributed by the
  visible stake (d = 0 u from its emitter), so C1 holds. Its halo was trimmed to
  the brazier's proportions (0.85 / 0.30, was 1.05 / 0.45) to take one washing
  layer off the wall; bringing the flames themselves into frame is a torch
  PLACEMENT change and belongs to whoever next revisits the built boundary.
- analyze.mjs's `heal` band (h110-150, s>0.35) counts 200-300k px in every Act-1
  frame. That is the grass — the Act-1 floor is authored at h86-90 (§19.3) and
  the post chain lands it in the band. Nothing in the polish chain moves it, and
  the reserved-band criterion the advisory set is the h5-25 Ember one.
