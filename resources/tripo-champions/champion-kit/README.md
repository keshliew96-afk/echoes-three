# Champion kit (two-legged champions)

Made for the Briar Knight on 2026-11-13 from tripo-bosses/boss-kit. Standard: tripo-bosses/BOSS_REVIEW_STANDARD.md.

- biped.mjs: quad.mjs plus a three-bone leg (kind 'biped': thigh, shin, foot; the toe is the target, pitch lifts the heel,
  2.4 rad lays the foot flat behind a kneeling knee), an arm that reaches for a point (CFG.arms, channels <key>W/x/y/z and
  ex/ey/ez for the elbow), a part held in room space (<prefix>W, Wp, Wy, Wr), and cloth springs that stop at the floor.
- buildc.mjs: build.mjs on biped.mjs. `node buildc.mjs <rig dir> <clips.mjs> out.glb`. DBG=<clip> lists every frame with
  something under the floor; DUMP=<clip>:<t>:<x0,x1,y0,y1,z0,z1> names the joints of the vertices inside a box at a time.
- cam.html: close-ups. `node shot.js "cam.html?f=x.glb&anim=<clip>&t=<s>&tg=x,y,z&half=0.3&cams=az,el;..." out.png`
- sheets.sh, anim.html: contact sheets (CY, CZ, HALF set the framing).
- Each champion keeps rig.py, clips.mjs, genpage.py under <name>/wip and its page under <name>/review.
  genpage.py builds the page from tripo-bosses/thornmother/review/index.html by line ranges.
- Lessons: aim a weapon with the forearm (elbow pole opposite the blade), not by turning the hand alone; limit the hand
  to the fist so cuff thorns stay with the forearm; three r147 hex colours are linear (dark briar is 0x060504).
- 13 Nov, after the knight's Version 2: the reaching arm's side axis is dir x pole (it was pole x dir, which twisted
  the arm half a turn); an arm may have no hand bone (b: [upper, fore, null] ends at the forearm's end point).
  Walks: `straight(k, foot, toeIn)` in the knight's clips.mjs narrows the track and turns the boots in (no 外八; heavy
  champions are exempt). Standard for champions: ../CHAMPION_REVIEW_STANDARD.md.

## Notes from the Sluice Warden (13 Nov 2026)
- `buildc.mjs` now reports `arm_mm`: how far an IK hand target was beyond the arm's reach (0 is a pass).
- A weapon that came as a loose piece with the fist on it: rig fist and weapon as one rigid hand bone and steer the weapon's tip
  (`poleOf` in sluicewarden/wip/clips.mjs: tip position and lean in, wrist target and world hold out).
- An arm that came fused to the flank: `cut_free` in sluicewarden/wip/rig.py cuts the fused run of the rim (the two ends stay
  shared as a hinge), caps both sides, then the arm's weight share is ramped by distance from the middle and evened out round
  the hinges. Check with a close-up from below with the arm thrown wide.
- `steps()` with a low lift dips the heel under the floor on landing: use a lift of 0.04 or more with droop 0.55.
- sluicewarden/wip/genpage.py is the page template for a champion with a cone warning and a ring under the hero.
- steps_sw2.js presses every button on a page (then set 1x again before timing anything).

## Notes from the Bone Reeve (13 Nov 2026)
- An extra limb Tripo grew: take it off in rig.py with `groove_cut` (seed the limb's verts, sink everything past the joint), cap the holes, compact the vertices. See bonereeve/wip/rig.py step 1.
- A kneel on both knees: the solver lifts a free foot until the knee joint is 0.05 above the floor, which throws the shins up behind him. Pass `under: true` on the feet once the knees come down so the bony knee can rest on the floor.
- A long robe needs two joints front and back (belt strip, lower half). In a kneel keep the belt strips upright (minus the hips' pitch) and lay the lower halves out with acos((joint height) / (robe length)); in any crouch add a fold in proportion to the drop or the hem goes under the floor.
- Tripo feet can be toes-out by about ten degrees. Wrap every clip's feet with a yaw (bonereeve/wip/clips.mjs `straight`): it also gives planted feet a fixed heading, otherwise they follow the hips' yaw.
- wip/dbg.mjs prints every bone's position in a built glb at a clip and time: `node dbg.mjs br.glb death 2.2`.
- bonereeve/wip/genpage.py is the template for a cone warning with a sweep band, and a lane warning with spikes.

## Notes from the Hollow Choir (13 Nov 2026)

- A model with no legs hovers: CFG `legs: {}`, and every clip needs `feet: () => ({})` because `sample` calls `clip.feet`. The hover height is a hips offset (`oy`) in every pose, and the page's shadow blob follows the hips and shrinks as it rises (updateFx in hollowchoir/wip/genpage.py).
- A head that must turn a full circle is cut free at the neck: `groove_cut` between the head and the chest, then `split` in hollowchoir/wip/rig.py. `split` duplicates the rim, and the caps follow one rule: the body's cap runs the way the rim runs (the rim comes from `loops_of`, which runs the way the part's faces run) and the part's cap runs the other way. Do not orient caps by a guessed direction.
- Seed an arm cut only from faces that are surely arm (the forearm, the front of the upper arm). A cape that hangs right behind the elbows can carry the same light texels, and seeding it makes islands that look like extra joins. Keep cloth (all three corners cloth-coloured) as sink. A clean arm has exactly one join loop.
- Caps that take the rim's darkest texel can be cloth-coloured: do the colour tests before the caps exist, or leave caps out of them.
- Side faces: measure their angle (here 80 degrees, FACE = 1.4 rad) and turn the head exactly that far so a face ends looking straight ahead.
- Page: a death that leaves a dead crystal uses a `uDrain` uniform that greys `diffuseColor` where the crystal mask is set (after `emissivemap_fragment`, before the lights), so the cloth keeps its colour. Projectiles (the five shards) live in the floor group and are tested against the hero stand-in from the second frame on, because the first frame still holds the last flight's position.

## Notes from the Gale Herald (13 Nov 2026)

- A statue can come as ONE welded piece: wings stuck to the back, a prop stuck to a shoulder, a crest stuck to a helmet.
  `free(A, name, th)` in galeherald/wip/rig.py cuts a part off along every rim it shares with the body, closes both
  sides and tags its vertices. Cut the part that touches the others first (the horn touched the wing top), then pass its
  faces as part of the next cut's sink, or the groove cut runs through the wrong rim.
- Wings: two joints each (root, middle). They open by ROLL about the root (`wings({open, fwd, tw, curl})` in clips.mjs:
  open 0 folded, 1.6 level, 2.2 raised in a V). Look at a spread wing from behind and below for the closed cut.
- A prop in a fist whose arm is carved to the body: make the prop one rigid joint at the middle of the fist and hold
  it in room space (`hnW` with a target quaternion from `aimH(direction)`), so body leans do not swing it about.
- A flying move: put the leg targets on a line behind the hips (`LEG * (cos a, sin a)` with a about 0.85 of the body's
  lean, foot pitch 1.15 + a). Targets that are too close to the hips fold the knees and it reads as kneeling in the air.
- A stiff topple over the toe line: the hips ride a turn about the toe line, the feet take `pitch: th`, `under: true`,
  and the lock comes off once it rolls. The sandal tip reaches past the pivot, so lift feet and hips by
  0.008 * sin(th) or the tip goes under the floor. Any extra hip lift must come late (after 1.25 rad) or the legs cannot reach.
- cam.html does not apply a clip's travel: aim `tg` at the model as if it stood at the origin. sheets.sh cells follow
  the travel only partly, so use a wide HALF for a travelling move.
- Page: a move that travels to the hero needs the stand-in held (`dummy.userData.hold`) so it does not walk home during
  the flight, and stepped back so the champion does not land inside it (galeherald/wip/genpage.py).

## Notes from the Moss Hart (13 Nov 2026)

- A four-legged champion uses the same kit: legs of kind 'front' and 'hind' in CFG.legs, chain keys b, s, c, n1, n2, h (see mosshart/wip/clips.mjs).
- Forelegs that stand dead straight in the model have no reach to spare. Keep the shoulders at or under their rest height (lower oy by about 0.33 x bp when the body pitches up), or lift the forehooves. If you do neither the solver stands the hoof on its toe and the toe tip goes under the floor.
- A hoof rolls over its toe: the mesh reaches about 0.022 past the leg's end point, so lift a pitched, planted hoof by TOE x sin(pitch) (`roll()` in the clips). In a one-shot move unlock the hoof while it rolls, or the audit counts the lift as slide.
- `cfg.hang` parts (the moss under the antlers) pierce the floor when their parent lies down. The pose channel `stiff` (0 to 1, new in biped.mjs) makes them follow the parent instead.
- A swept-back rack goes DOWN when the nose goes up. Lying on its side, turn the nose toward the floor to lift the rack clear, and check with the audit.
- `node dbgq.mjs <rig dir> <clips.mjs> <clip> <t> <bone,bone>` prints each bone's world position and its up, forward and left directions at one time. Use it instead of guessing from stills.
- anim.html takes cams as a comma list (`s,q`), and `&flat=1&t0=T&t1=T&n=1` shoots one time from several sides.
- Page: mosshart/wip/genpage.py has a cone that tosses the hero, a leap to a ring under the hero with the hero held and backed up, and a patch left on the floor for 5 s.

## Notes from the Lockkeeper (a thrown key on a chain)

- A part that leaves its parent: channels prefix + `T, Ta, Tx, Ty, Tz` in `biped.mjs` (T 0..1 leaves the seat; Ta 0 = an offset in root
  axes from the seat, Ta 1 = a point in root space). `buildc.mjs` writes the translation track. `glbprobe.mjs <glb> <clip> <node> <frame>`
  prints what the file really holds.
- A held part that should hang straight whatever the arm does: put `<prefix>W: 1` in `base` and turn it with `Wp, Wy, Wr` only.
- The page's hit squash scales the whole model, so a part flying 5 u away moves a third of a square. Give the caster squash 0 on a
  ranged hit. Tie a dragged stand-in to the move's clock (`shot.action.time`), not its own timer, or the hit freeze pulls them apart.
- The ground shadow is fixed at the origin in the template. For a champion who falls flat, move and stretch it under head and feet
  each frame (see `lockkeeper/wip/genpage.py`).
- Never raise a coat sleeve straight up: the armpit tears. Keep the arm under about 80° and smooth the shoulder weights over welded
  neighbours. A cut-off arm piece above the elbow belongs to the upper arm.
- After cutting a part free, move any of its weight left on neighbouring verts to the parent, or they stretch after it.
- `steps()` lifts a swinging foot by HEEL·sin(toes-up pitch) so the heel stays on the floor; a fall on the back is a rigid arc about
  the heels (`PIV`, `hipsAt`).
- Never append a `//` comment to a one-line statement in clips.mjs: it swallows the rest of the line.

## Notes from the Gravebell Ringer (13 Nov)

- Two-handed grips: `cfg.grips = { A: { on: 'staff' }, B: { on: 'staff' } }` in biped.mjs. Each arm's wrist goes where the part carries the hand joint and the hand bone takes the part's turn, so both fists stay closed on it (`arm_mm` in the audit measures a fist leaving it). The part must come before the arms in `cfg.extras`. Channel `<arm>G` lets go.
- A `cfg.hang` part is now multiplied by its own channels, so a hung bell is swung by hand (`blp`, `blr`) and still hangs straight whatever its parent does. Mute its spring in clips that swing it by hand: `springGain: { bell: 0 }` on the clip. A loose spring plus a hand swing doubles up.
- A fused shell: Tripo can weld fists, staff, hair and robe into one skin with no arms inside the sleeves. Check with weight slices before designing moves. Then: keep the fists where they are, give the arm bones no skin, let the shell follow the held part with a falloff measured along the mesh (dijkstra over the welded edges, then a few rounds of neighbour averaging so no point is pulled alone; `RF`, `SM` in gravebell/wip/rig.py), and drive the held part against the chest in small angles about a pivot near where it rests (`hold()` in gravebell/wip/clips.mjs, under 30 degrees). The body and the swinging part carry the moves. Offer a new export as the open choice.
- Budget: `Editor.split(..., caps=False)` returns the rims so only the rims that can be seen get a cap (`free()` in gravebell/wip/rig.py). A rim that stays inside its part needs none.
- A part hung from a staff should hang on the staff's underside: `slide()` moves the shackle round the staff as it tips.
- A long robe: when the hips drop or tip, slide the lower halves up along their own bones (`robed` wrapper: `kgb`, `kcb`), a little more while the hips are down and when he leans back. Once a half lies flat (a kneel), sliding along the bone no longer lifts it: change its angle instead.
- A kneeling death for a robed figure: gravebell/wip/clips.mjs `death` (hips down 0.241 of 0.5, toes 0.36 back, pitch 2.5 rad, `under: true`).

## Notes from the Vein Matron (14 Nov)
- No legs, gown of roots on the floor: CFG `legs: {}`, every clip `feet: () => ({})`. Floor roots (y < 0.03) are forced to `root`, so they never move; two gown joints (skirt1, skirt2) under the hips turn back against the hips (`gown()` in her clips.mjs: half each of -hp, -hr, -hy, and `kbb = -0.85 * oy` lifts skirt2 back up by the hip drop, so a sinking waist squashes only the upper gown).
- Thin strands welded at both ends (her veins): find each with a component of the region outside the body column (`|x| > 0.115` below the hand), seed a `groove_cut` with its pink faces, sink everything else plus the hand above, then `Editor.split` with caps on every rim (30 triangles for four veins). Force the strand's top 1 to 1.5 cm to the hand or forearm so the top cut never opens.
- The welded skin solve runs across a split (the rim copies share a welded id): after `skin()`, keep the part's bones off the body and the body's bones off the part (`only()` in her rig.py).
- Hanging parts that must also be driven by hand: use the `W` hold channels (prefix + W, Wp, Wy, Wr: a heading in root space), not `cfg.hang`, because `hang` overwrites any W hold. `veins()` in her clips.mjs.
- Hands to a point on the chest: `cfg.arms` IK (`ALW`, `ALx/y/z`, pole out-down-back) blended in and out with W.

## Notes from the Bell Abbess (14 Nov)
- A statue on a plinth: the plinth (y < 0.128) is forced to `root`, and she glides; `skirt1`, `skirt2` under the hips as for the Vein Matron.
- A held staff with a part on it (her crozier and bell): cut the whole held piece free of the body first, then the part from the piece, or the two rims share verts. The staff is held in root space with `stW`, `stWp`, `stWr`; the clips' `crozier()` helper drives the hand IK and the staff tilt together (`stWp = -tp`, so tp + tips the top forward; `stWr = tr`, + to her right). Driving it by arm FK flips it.
- biped chain pitch + leans BACK; her clips wrap keys in `flip(k)` so + bows forward.
- A gold strip that stretches from the belt to a sleeve when the arm lifts is a weld: cut it with `Editor.split(..., caps=False)`, extend the region masks by the split copies, then `only()` keeps the arm bones off the robe near the weld.
- `bprobe.mjs <rig dir> <clips> <clip> <t> <bone,...>` prints bone world positions and up vectors; use it to check sign conventions before keying.
- Page: a move that travels moves the page floor via the clip's `travel(t)`; set the dummy's hold so it does not drift home. A ride (her rope) is page-drawn with `rideUpdate()` before `model.updateMatrixWorld`.

## Notes from the Furnace Knight (14 Nov)
- A held weapon that rides on the body (his sledge on the shoulder) is a part bone parented to the chest, made with `cfg.grips={A:{on:'sledge'}}`; list the part before the arms in extras. The fist follows the part; `AG` to 0 lets go, and the arm then needs `AW` IK targets or it stays in the raised rest pose.
- The part holds a root-space position with `sgT` (`sgTa`=1 absolute, `sgTx/y/z`) and an orientation with `sgW`, `sgWp`, `sgWy`, `sgWr`. `sledgeQ(el,az,face)` in his clips builds the basis from the rest frame; `onFloor()` takes el<0 when the haft points down from the fist to the head.
- The welded skin solve bleeds across a cut: zero the part bone on every body vert (`W[~sl, ix['sledge']] = 0`), or a dark curtain stretches when the part moves away.
- Check every corner of a held weapon against the floor (`aboveFloor()` over the head's 8 corners and the pommel), not only its joint.
- A heat glow that lives in the texture: find the hot texels in the shader by colour (red high, blue low) and scale their emissive; a `uCool` uniform greys them for a cooling death. Normal blending for fire puffs on the light floor: additive goes white.

## Notes from the Glassblower (14 Nov)
- biped.mjs now lets a grip slide: `cfg.grips={A:{on:'pipe', axis:[ux,uy,uz]}}` (the part's long way in the rest model) and the channel `AGs` moves the fist along it. Old clips without `axis` behave as before.
- Tripo may leave nothing of a held pipe inside the fist. After the split the two rims (above and below the fist) are joined by a short lofted tube tagged as the part (rig.py `ring()` sorts each rim by angle round the axis and walks both), so a sliding fist never shows a gap.
- Hold a long held piece in root space at rest too (`w: 1` in every key): riding on the chest, the base stance tips it and its foot dips under the floor.
- Blend held keys with `ptrack()`: it moves the fist's own point on the part in a straight line while the part turns and slides, so the fist stays in reach. A plain blend of the part's joint swings the fist away.
- buildc's arm_mm does not see grips. `gbaudit.mjs <rig> <clips>` measures the fist against its place on the part, the left wrist against its point, and the part's lowest point; `gbchk.mjs` prints the same at chosen times.
- Check the arm lengths from the mesh before keying: his right elbow joint was 2 cm high, which made the arm 4 cm short and every two-handed hold fall short. The page's additive layers (hurt, rage) must carry the held part's position track as well as its turn.
