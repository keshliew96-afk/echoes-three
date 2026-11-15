# Tripo models

The game's next models: one Tripo Studio model per hero, boss, champion, foe and NPC, rigged and
animated in the project threads and passed by Kesh on a review page each (2026-11-12 to 11-15).
BUILD_BRIEF A23 (2026-11-15) makes them the game's models, one per creature. **None is in the game
yet**: the feature freeze holds, and the code-built rigs (`docs/MODEL_STANDARD.md`) are what the game
draws until each is replaced. The review standards are under `docs/tripo/`.

## Files

The GLBs, kits and review pages stay in the project folder, not the repo.

| Kind | Folder | Per model |
|---|---|---|
| Heroes | `/mnt/project-files/tripo-pilot/<hero>-model/` | `<hero>-tripo-rigged.glb` (body and weapon), `wip*/`, review page |
| Bosses | `/mnt/project-files/tripo-bosses/<boss>/` | `<boss>-tripo-rigged.glb`, `wip/`, `review/` |
| Champions | `/mnt/project-files/tripo-champions/<folder>/` | the same |
| Foes and small mobs | `/mnt/project-files/tripo-mobs/<mob>/` | the same |
| NPCs | `/mnt/project-files/tripo-npcs/<npc>/` | the same |

Older versions kept beside a model (`*-before-*.glb`, `*-v2.glb`, `*-v3.glb`) are history, not assets.
Each GLB is one skinned mesh with one 2048 px JPEG texture (a hero adds its weapon as a second mesh),
identity bind rotations, height 1 with feet on y = 0, facing +z, and its clips by name (`idle`,
`walk`, ..., `hurt`, `spawn`, `death`; the names each kind must have are in its standard).

## Budgets

| Tier | Triangles | Passed | Measured triangles | Bones |
|---|---|---|---|---|
| Hero (body and weapon) | 15,000 | 7 | 14,609 to 14,994 | 19 to 24 |
| Boss | 30,000 | 17 | 22,666 to 29,656 | 16 to 52 |
| Champion | 12,000 | 12 | 11,301 to 12,000 | 17 to 28 |
| Foe | 4,000 | 36 | 3,687 to 3,963 | 7 to 53 |
| Small mob (brood, broodling, gravewisp) | 4,000 (was 1,500; raised 2026-11-15 when Kesh passed the Brood and the Gravewisp as sent) | 2 | 3,809 and 4,028 | 39 and 12 |
| NPC | 15,000 (set 2026-11-15) | 6 | 3,745 to 14,923 | 5 to 19 |

Measured 2026-11-15 from the 80 final GLBs (140 MB on disk in all). The Gravewisp's 4,028 includes the
caps where its lantern was cut free; it was passed as is.

## Not made yet

| Model | Plan |
|---|---|
| Foes `bellows`, `knight`, `leech` | Kesh exports each in Tripo from the four views already cut in `tripo-mobs/<name>/` (the mob settings, face limit 4,000); then a page each like the other foes. |
| Foe `broodling` (`src/sim/enemies/brood.js`) | The Brood's model and clips drawn smaller; no new export. |
| The five freed wardens at camp (`src/render/npcs/wardens.js`; `src/data/story.js`: Stag, Heron, Wyrm, Skyhorn as `warden_ibex`, Cinderback as `warden_salamander`) | Each warden is its passed boss model drawn as a pale spirit (the warden's colours, its idle clip only); no new export. |

## Frame and memory budget

A Tripo model costs a few draw calls where a faceted rig costs 30 to 120, so the min-spec frame
(GTX 1050 Ti at 1080p, 60 fps, `STEAM_LAUNCH_PLAN.md` D6) is now bound by triangles and texture
memory, not by draw calls. A busy fight (four heroes, a boss, two champions, twelve foes) is about
160,000 triangles, about 320,000 if every model keeps an inverted-hull ink outline, and under 100
draw calls. These are sums from the files, not a measurement in the game; the S9 frame-time probe
on Kesh's machines measures the real frame.

Texture memory, as decoded RGBA with mipmaps: a 2048 px texture is about 22 MB, a 1024 px one about
5.6 MB. Loading every model at once would hold about 1.3 GB with 1024 px foe textures (1.9 GB at
2048). A room holds only its own cast (four heroes, the land's foes, its champions and boss): about
300 MB. Compressed GPU textures (KTX2: Basis UASTC to BC7 at 8 bits a pixel, ETC1S to BC1 at 4) cut
that by four to eight times; that figure is from the formats, not measured here (no KTX2 encoder in
the cloud image).

## Loading plan

The game has no model loader yet. The plan, for when the freeze lifts:

1. **Pack** each final GLB with gltf-transform: 1024 px textures for foes and small mobs (a foe is
   small at play zoom), WebP textures, meshopt geometry and animation. Measured on all 80 models
   (2026-11-15, `@gltf-transform/cli` 4): **139.7 MB to 29.1 MB** (heroes 16.9 to 4.3, bosses 46.2 to
   9.2, champions 22.3 to 6.1, foes 44.7 to 7.4, NPCs 9.6 to 2.1). The clips survive; how the WebP
   textures look at play zoom is not judged yet. KTX2 replaces WebP when the encoder is set up.
2. **Serve** the packed files from `public/models/<kind>/<name>.glb`, so `vite build` copies them to
   `dist/` unchanged. `server/static.mjs` already serves `.glb`; the Electron `app://` protocol
   (launch plan D1) serves `dist/` the same way.
3. **Load** through one module under `src/render/` (three's `GLTFLoader` with `MeshoptDecoder`), the
   only place a GLB is fetched. It keeps one parsed copy per model and hands each creature a
   `SkeletonUtils.clone`. The sim never waits on it and never reads it: loading is render-only, so the
   goldens cannot move.
4. **Prefetch** a land's models while the level before it plays, the way the arena builds room
   dressings ahead (`docs/MEMORY.md`); the heroes and camp NPCs load at boot behind the splash; a
   land's models are let go when its level ends. A level's models are all in before its first room
   opens (the level-clear card, A15, covers the wait), so a room never starts with a model missing.

## Page-only mechanics

The review pages carry moves the game does not have. Each one is a rule change: it waits for the
freeze lift, then sim work (and new goldens).

- **Heroes:** a dash of its own for each hero (the Healer heals a little at the end, the Tank rams
  and stuns, the Swordsman thrusts, the Bellwright hides under a great bell, the Tidecaller rides a
  tide that slows, the Duskwing splits into bats and blinks, the Archer flips and shoots three homing
  arrows); the Duskwing's 6-hit combo; the Healer's gem turret; the Bellwright's bell combo. On the
  pages a hero turns to face the dash; in the game it keeps facing the aim.
- **Bosses** (`docs/tripo/BOSS_REVIEW_STANDARD.md`, "Kesh's move changes"): the Stag's Antler Quake on
  himself; the Mire King's Venom Shake and his two-push Belly Flop; the Millwheel's Plank Spin, planks
  that fly home and hurt, and 1 to 3 planks off per wall hit; the Wyrm hidden until its ring is full.
- **Champions:** each page offers a 1.6 s rage move (an open choice; the game's rage is a stat change).
- **Kesh's rules on every page:** the dash has top priority, cancels a wind-up or recovery and has
  i-frames; no splayed feet (外八) in a humanoid's walk or run unless the character is heavy.

## Look checks

The colour rule (`.claude/rules/visuals.md`) holds for textures too. Measured 2026-11-15 on every
model's texture, area-weighted over the mesh, a texel counting when it is within ΔE 15 (CIELAB) of a
reserved colour:

- **Heroes:** no Ember, Violet or Bright Heal texels on any of the seven. At ΔE 25 the Bellwright has
  1.3% near Ember (her bronze); the trial looks at it in the game's light.
- **Ember on foe bodies** (Ember marks threats only; a foe's own fire is Foe Crimson, Violet or
  magenta; land heat colours are not Ember): the Ember Newt 6.2%, the Cinder Moth 1.5%, the Cinderback
  0.8%, the Glassblower 0.7%, the Furnace Knight 0.3%, the Coal Hurler 0.1%. Planned fix at load: move
  those texels to the land's heat colour (Kiln Gold or Kiln Heat), as the Cinder Moth's page already
  does for its glow. No model changes.
- **Violet on foes** is allowed. The Hollow Choir is 41.5% Violet and the Vein Matron 5.0%; BUILD_BRIEF
  §19.2 asks for one violet tell per foe, and Kesh passed both as they are.

The check is `/mnt/project-files/tripo-audit/texture-colours.py` (`python3 -I texture-colours.py 15 <glb>...`).

Still to judge in the trial, on Kesh's laptop: the ink outline and the toon ramp on a textured model,
the white hit flash (`docs/HIT_FEEDBACK.md`), the downed grey-out, and each model's size against its
collision radius.

## Licence and Steam

Kesh made the models on Tripo's paid Studio plan; Tripo's help page says paid users hold full
commercial rights to what they generate
([Tripo help](https://www.tripo3d.ai/help/privacy-policy/can-i-use-models-commercially)). Keep a record
of the plan for the dates the models were made: the receipts stay in the project folder (the repo is
public), and a model's record there says the plan and the dates only. A record never holds a contact
time: strike timing lives in the sim's tables (Kesh's pick, 2026-11-15). Steam's content survey asks about AI-generated
content, so the store page discloses the models (launch plan S15).

## Probes

The 14 `model-standard-*-probe.mjs` probes in `npm test` hold the code-built rigs. The model rule script
(`docs/TESTING.md` "Workflow tools") is the first version of the one Tripo probe, not a second tool. Each is replaced in
the same change that replaces its model (`docs/TESTING.md`, "Tripo models").
