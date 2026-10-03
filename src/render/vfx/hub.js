// Impact-FX hub — one shared handle on the live scene's particle + decal
// pools so any render layer (enemies, boss, skill FX) can throw debris, embers
// or a lingering scorch WITHOUT each layer allocating its own pools and
// without the scene needing to know what those layers do.
//
// The active scene registers its pools once (`setImpactFx`); the layers call
// through `impactFx`. Every call is a no-op when nothing is registered, so a
// harness scene (rendertest/chartest) never has to stub anything.
//
// Render-only: the hub touches no sim state and holds no per-frame state of
// its own — the pools it forwards to own all of that.
let active = null;

export function setImpactFx(api) {
  active = api || null;
}

export function setImpactFxDirected(on) {
  impactFx.directed = !!on;
}

export const impactFx = {
  // Every ordinary hit: dark debris + a spark + a smoke puff (check 5).
  hit(x, z, opts) {
    if (active) active.particles.hit(x, z, opts);
  },
  // §9 #6 kill burst.
  kill(x, z, opts) {
    if (active) active.particles.kill(x, z, opts);
  },
  // Tight directional spray (projectile impacts, muzzle spit).
  impact(x, z, opts) {
    if (active) active.particles.impact(x, z, opts);
  },
  // Slow rising Ember motes (live telegraphs, cooling burns).
  embers(x, z, opts) {
    if (active) active.particles.embers(x, z, opts);
  },
  // Lingering ground burn where an AoE landed.
  scorch(x, z, radius) {
    if (active) active.decals.scorch(x, z, radius);
  },
  // VFX redesign: a styled spray of one particle family (render/vfx/
  // signature.js recipes): spray('spark'|'chunk'|'smoke'|'shard', x, y, z, n, opts).
  spray(mode, x, y, z, n, opts) {
    if (active && active.particles.spray) active.particles.spray(mode, x, y, z, n, opts);
  },
  // Persistent dark splat (kills).
  splat(x, z) {
    if (active) active.decals.spawn(x, z);
  },
  get ready() {
    return !!active;
  },
  // True while the VFX director (render/vfx/signature.js) draws the styled
  // hit / kill debris itself — the scene then skips its generic burst.
  directed: false,
};
