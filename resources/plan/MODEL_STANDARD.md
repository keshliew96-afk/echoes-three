# Model and animation standard (from Kesh's sample video)

Research and recommendation only. No game code changed.
Frames and contact sheets: `/mnt/project-files/model-standard/`.

## What the video actually is

The clip (12 s, TikTok @jubydandev, 8.6 s of footage) is a phone filming a laptop
screen. The page on screen is a Claude Design page (its banner reads "...is moving to
Artifacts in the Claude app"). Its toolbar has model tabs **Leviathan / Secret + Kraken /
Effect kit**, state buttons **Idle / Move / Ability / Still**, and a live readout such
as `3.4s · Time Stop: rewind · Tidal Surge: wave`, with named phases (trunk up,
shockwave, steam blast, back to normal, rest).

So the Leviathan is **code**: a web page that builds the creature out of 3D primitives
(almost certainly Three.js) and animates it with code on a timeline. It is not a
Blender model and not an AI-generated mesh. That is the same technique Echoes already
uses for every hero and foe (`src/render/critters/`, `enemies/`, `boss/`).

## The model style

- **Faceted low poly, flat shaded.** Every face has one tone; light reads as crisp
  planes of dark teal, mid teal and aqua. No ink outline: the dark planes do the edge work.
- **Detail by repetition, not sculpting.** The coil is hundreds of small box scales laid
  along a curve, with a gold band every few segments. Spines, teeth, fin rays and claws
  are thin wedges repeated in rows.
- **Tight palette.** Three teals, one gold metal accent, white for teeth and foam.
- **A clear silhouette.** Huge jaw, a fan crest of spines, small arms, a heavy coiled base.
  It reads as one shape before any detail registers.
- **Staging.** A swirling floor disc, gold pillars orbiting, water pillars and bubbles as
  the ability effect.

## The animation

- **Procedural, layered.** The coil undulates with a phase offset along its length; the
  head sways; the jaw opens and shuts; crest fins flutter. Nothing is hand keyed.
- **Ability as a scripted timeline.** Anticipation (head draws back, jaw closes), the
  strike (jaw wide, steam beam, a ring of water pillars bursts), a hold, then a settle
  back to idle. The readout names each phase and the page can rewind it.
- It has no feet, so his foot-lock rule has nothing to check on it. On a serpent the
  equivalent is "the coil base stays planted while the upper body drives".

## Showcase zoom versus play zoom

The video is a full-screen turntable. In Echoes a hero is about 1 u tall and fills
roughly 50 to 70 px of a 1600x900 screen at play zoom (see the Barrow Wyrm room shot).
Hundreds of scales collapse into texture at that size. The parts of the standard that
survive play zoom are the silhouette, the three-tone faceted shading, the gold accent
bands and the ability choreography. The scale-by-scale detail pays off in close views:
the Journal, camp, boss intros and a model lab.

## The four paths

| Path | What it really delivers | Fit to the video | Effort for 7 heroes, 12 champions, 17 bosses, 41 foe types |
|---|---|---|---|
| (a) Claude Design | Kesh builds a showcase page by talking to it, exactly like the video. Its output is a stand-alone HTML/Three.js page with its own scene, lights, camera and loop. I cannot drive it from here; he would export or share each page and I port it. | Exact look, because it is the video's own tool | His time per model, plus a port per model into the game's rig contract (`driver.js` clips idle/walk/cast/hurt/downed, emit points, outlines, reserved colours, downed greying). The port is about as much work as building the model in place. Good as his sketchpad, slow as the factory. |
| (b) Blender via MCP or bpy | Blender scripted by Claude: on his laptop through Blender MCP, or headless in the cloud (`pip install bpy`, Blender 5.2). Can build faceted models from primitives, rig, key clips, export GLB. | Can match it, but adds nothing the video needs: the Leviathan is rigid pieces, not a skinned body | A second asset pipeline beside the procedural one (GLB loading, file size, an animation mixer, like the mouse). I only see renders, not a live viewport. Worth it only for skinned organic bodies or hand-keyed clips. |
| (c) Meshy image-to-3D + Blender | Sculpted, textured meshes with baked shading and auto-rig weights, as for the mouse healer. | Poor. Soft, painted, realistic surfaces, not crisp faceted planes, and the look varies from model to model | High, and the results were the reason the healer was restored and the bear rework was cancelled. Not recommended for this standard. |
| (d) Upgrade the procedural renderer | The video's own technique, written straight into the game: a faceted material, an instanced parts kit, an ability timeline, and a model lab page that copies the video's toolbar. | Close. It is the same method; the remaining gap is taste, judged in the lab | One kit slice, then the roster in slices by land and by kind (about 15 to 20 slices). Render only, so the nine goldens stay identical. |

## Recommendation: (d), with (a) as an optional sketchpad

Build the standard into the game's own renderer, and start with a pilot before
committing the roster:

1. **Kit and lab slice.** A faceted material mode (flat normals, three-tone ramp, gold
   metal accent); a parts kit on `InstancedMesh` (plates along a curve, spike and tooth
   rows, fins, bands) so detail costs few draw calls; an ability timeline (named phases
   with anticipation, strike, hold, settle, rewindable) that drives rig poses and VFX; and
   `?modellab=1` with the video's toolbar (character tabs, Idle / Move / Ability / Still,
   phase readout, rewind, a play-zoom toggle).
2. **Pilot models.** Rebuild the Barrow Wyrm (a serpent, nearest to the Leviathan) and
   one hero (the Tank) in the new standard behind a flag, shot in the lab and at play zoom
   in a busy fight beside the current models. Kesh judges these before the roster.
3. **Roster slices.** Heroes one or two per slice; bosses and champions per land; foe
   types per land (five lands).

If he likes iterating visually, he can sketch a creature in Claude Design and share the
page; I use it as the reference and build it in the kit, rather than porting its code.

## Rulings this needs from Kesh

- **Art direction.** BUILD_BRIEF §19.2 is binding today: chibi three-mass builds, round
  mitten paws, a toon gradient and an ink outline. The video is faceted, spiky and
  outline-free. Either the new standard replaces §19.2 for everything, or it applies the
  detail density and choreography while keeping the chibi shapes and outline.
- **Reserved colours stay.** Ember for enemy threats, Bright Heal for heals, Violet for
  corruption. A teal-and-gold look like the video's fits inside those rules.

## His animation templates (apply to every hero and biped foe)

- **3-hit combo.** The basic attack is a three-hit combo with directional variety that
  fits the class; each hit's overshoot and settle flow into the next hit's anticipation;
  key poses and frame timing per hit; weapon weight shown.
- **Strict self-check before any answer, listing flaws then the fix.** Root motion matches
  the legs' direction; planted feet locked (IK) until the weight shifts; hips and legs
  drive and support each swing. For legless creatures: the base stays planted while the
  upper body drives.
- Visual only: timing, damage and the goldens stay unchanged.
