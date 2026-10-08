# Memory use

What the game holds in memory, where it goes, and the probe that keeps it
from creeping back (v0.5.247).

## Where it goes

Measured with `tools/memory-probe.mjs` (below). The GPU figures are counted
at the WebGL calls, so they are what the game asked the driver for; the
process figures are what Chrome's renderer and GPU processes really hold.

| Holder | Size | Notes |
|---|---|---|
| Room dressings | ~27 MB of GPU each, five resident | Each layout has a painted floor (2048 px) and apron (1600 px), mipmapped. The level's layouts are built ahead in the background (`src/scenes/arena.js`, residency) so a room never waits on a build. |
| Paint canvases | ~20 MB of CPU each (was) | The floor and apron canvases the dressing was painted on. Now released the moment the GPU has its copy. |
| Frame buffers | ~28 bytes per drawing-buffer pixel (was ~36) | Composer target (half-float colour + depth), its second buffer (half-float colour), bloom chain at half resolution, the canvas. At 1920x1080 and a 150 % Windows scale that is ~130 MB. |
| JS heap | 34-45 MB | Flat across rooms and runs. |
| Audio | ~1.5 MB of AudioBuffers plus the bake cache (capped at 24 MB, `src/audio/bake.js`) | |
| Journal Bestiary | +13 MB while open | Its own WebGL context, lost on close (`src/ui/story/viewer.js`). |

## What v0.5.247 changed

- **Paint canvases released after upload** (`src/scenes/arena.js`,
  `releaseAfterUpload`). Each dressing texture lets go of its canvas in
  three's `onUpdate`, right after the upload. A lost and restored WebGL
  context re-uploads textures from their images, so the arena rebuilds the
  dressings whose canvases are gone (`webglcontextrestored`): the room on
  screen at once, the rest in the background. `?keepPaint=1` keeps the
  canvases for tools that read `window.__groundCanvas`.
- **Paint prefetch capped at two** (`PREFETCH_AHEAD`). Entering the boss
  room used to paint the whole next level ahead and hold ~100 MB of canvases
  through the fight; now the worker paints one layout ahead of the builder.
- **No depth where nothing depth-tests** (`src/render/stage.js`). The canvas
  and the composer's second buffer only receive fullscreen passes, so
  neither has a depth buffer now, and the second buffer never carries MSAA
  under `?msaa=N`. The scene always renders into the first buffer (pinned
  before and after each frame). Same pixels, 8 bytes a pixel less.

Nothing here touches the sim: the nine goldens are byte-identical.

## The probe

```
npm run serve   # or: node server/index.mjs --static dist --port 7800
node tools/memory-probe.mjs [--url http://127.0.0.1:7800/] [--rooms 14]
     [--w 1600 --h 900 --dpr 1] [--shots dir] [--out captures/memory.json] [--budget MB]
```

`tools/memory-track.js` is injected before the game boots and keeps the GPU
ledger per context (textures, buffers, renderbuffers, drawing buffers,
programs) plus live AudioBuffers. It hides
`WEBGL_multisampled_render_to_texture`, which software GL offers and desktop
GPUs do not, so three takes the desktop path. Stages: boot, camp, room 1,
fourteen room transitions across two levels, the run end, the Bestiary open
and shut (three times), the title, and a lost-and-restored context in a
room. It fails on growth across same-level room transitions (GPU, heap,
geometries, textures), on GPU or heap left over after a run, on a Bestiary
context that outlives the Journal, on a restored context that does not
rebuild the floors, and on page errors.

Software GL (Linux cloud) is slow, so a full run takes 5-10 minutes; the
recipe for Chrome flags is in `docs/TESTING.md` and the probe header.

## Left as is

- Five dressings resident per level is the price of rooms that never hitch
  on entry. Holding fewer would save ~27 MB of GPU per layout dropped, but
  the next room's layout would then build during the door fade.
- The bake cache grows to its 24 MB cap over a long session by design.
