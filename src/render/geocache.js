// Shared render geometry cache (certification fix D-r1, failure F1).
//
// WHY THIS EXISTS. `renderer.info.memory.geometries` grew ~115 per run and
// never came back down (402 -> 840 -> 952 -> 1074 across three runs with the
// scene graph byte-identical at objs 1119 / meshes 892 / uniqGeo 687). Three
// counts a BufferGeometry the first time it is drawn and only forgets it on
// `.dispose()`, so every geometry a rig, decal, telegraph, bolt or quake ring
// allocated on spawn stayed registered — and its GPU buffers stayed alive —
// for the rest of the session.
//
// The cure is not "dispose harder", it is "stop allocating": every one of
// those geometries is a pure function of a handful of constants (a radius, a
// plane size, a source mesh), so identical instances can SHARE one buffer.
// Sharing is strictly stronger than disposal — the counter never leaves the
// camp baseline instead of climbing and being walked back — and it removes the
// first-draw upload of each new buffer, which is half of the in-wave hitch.
//
// Everything handed out here is marked `userData.shared`, so any future
// teardown sweep can tell "mine to dispose" from "the whole game's copy".
const cache = new Map();

export function sharedGeo(key, make) {
  let g = cache.get(key);
  if (g === undefined) {
    g = make();
    g.userData.shared = true;
    cache.set(key, g);
  }
  return g;
}

// Mark a geometry a module already caches by hand, so a teardown sweep skips
// it (nothing here is ever disposed).
export function markShared(geo) {
  geo.userData.shared = true;
  return geo;
}

// Probe surface for the perf captures.
export const sharedGeoCount = () => cache.size;

// ---------------------------------------------------------------------------
// Teardown sweep
// ---------------------------------------------------------------------------
// Release the per-instance GPU resources of a subtree that has just left the
// scene for good (a killed enemy rig, a spent telegraph, a landed bolt, a
// finished quake ring). Two things are deliberately never touched:
//
//   - anything marked `userData.shared` — that is the whole game's copy, and
//     the next spawn is about to draw with it;
//   - Sprite / Points geometry — three hands every Sprite the SAME internal
//     quad, so disposing one sprite's geometry would blank every sprite in the
//     scene. Sprites own only their material.
//
// Pooled objects must NOT be passed here: they come back.
function releaseMaterial(m) {
  if (!m || m.userData?.shared) return;
  m.dispose();
}

export function releaseTree(obj) {
  if (!obj) return;
  obj.traverse((o) => {
    const g = o.geometry;
    if (g && !o.isSprite && !o.isPoints && !g.userData?.shared) g.dispose();
    const m = o.material;
    if (Array.isArray(m)) for (const one of m) releaseMaterial(one);
    else releaseMaterial(m);
  });
}
