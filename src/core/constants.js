// Every renderer/loop/sim tuning number from BUILD_BRIEF lives here, frozen.
// (Full gameplay tables land in src/data/* with the combat/enemy blocks.)

// §1 Simulation: fixed 60 Hz tick via accumulator.
export const TICK_HZ = 60;
export const TICK_MS = 1000 / TICK_HZ;
export const MAX_FRAME_MS = 250; // accumulator clamp so a hitch never spirals

// §5 Dodge roll — integer tick counts (no gameplay logic reads wall-clock).
// distance 1.8 u over 0.25 s = 7.2 u/s (3x run); own cooldown timer, outside
// the skill pipeline.
export const DODGE = Object.freeze({
  distance: 1.8, // u
  durationTicks: 15, // 0.25 s
  cooldownTicks: 72, // 1.2 s
});

// §9 Hitstop cap: no stacking above 4 ticks per 20-tick window (ruling A10).
export const HITSTOP = Object.freeze({
  budgetTicks: 4,
  windowTicks: 20,
});

// §7 Crit: 0.05 chance / 1.5x mult, all classes, damage AND heals, strict
// `roll < chance` from the seeded gameplay stream.
export const CRIT = Object.freeze({
  chance: 0.05,
  mult: 1.5,
});

// §7 Healer row (player class). Full four-class table lands in
// data/classes.js with the ally block; the player controller needs this row.
export const HEALER = Object.freeze({
  maxHp: 100,
  moveSpeed: 2.4, // u/s
  attackIntervalTicks: 30, // 0.5 s hold-to-repeat basic
  basicPower: 8,
  basicSpeed: 5.2, // u/s basic projectile
  basicRange: 5.0, // u max travel — bolts expire here
  // Graybox collision scaffold (not brief numbers): capsule footprint radius
  // for wall collision (chibi body mass ~0.6 u wide) and the bolt's swept
  // radius vs walls.
  radius: 0.3,
  boltRadius: 0.05,
});

// §13 Combat playfield ~24x16 u inside walls (half-extents, XZ plane).
export const ARENA = Object.freeze({
  halfW: 12,
  halfD: 8,
  wallMargin: 0.3, // legacy clamp radius (wisp harness); actors pass their own radius
});

// docs/TESTING.md — window.__echoes.events keeps the last 200 sim events.
export const EVENT_RING_CAPACITY = 200;

// Sim-core harness population ("wisps"): placeholder deterministic actors that
// exercise the registry / seeded-RNG / event pipeline until the real enemy
// block lands. Combat numbers borrow the Thorn Boar row (§11) so nothing here
// is invented where the brief has a number; attackRange / population / jitter
// are harness-only scaffolding and die with the harness.
export const HARNESS = Object.freeze({
  population: 6,
  hp: 20, // Thorn Boar HP
  moveSpeed: 2.0, // Thorn Boar u/s
  damage: 8, // Thorn Boar contact damage
  attackCooldownTicks: 48, // Thorn Boar 0.8 s attack cd
  attackRange: 2.0, // harness-only
  headingJitterRad: 0.15, // harness-only, max per-tick turn
  spawnMargin: 1.0, // harness-only, keep spawns off the walls
});

// §19.5 Post stack (EffectComposer, always on).
export const POST = Object.freeze({
  bloomThreshold: 0.85,
  bloomStrength: 0.5,
  bloomRadius: 0.4,
  vignetteStrength: 0.35, // soft, ~0.35 at corners
  gradeMix: 0.3, // gentle contrast S-curve blend
  gradeSaturation: 1.05, // ~5% saturation boost
});

// §19.2 Outlines: inverted-hull second mesh, backface, Void Charcoal, reading
// as a ~2px ink line. thickness = the brief's ~1.04 scale expressed as a
// world-space normal offset (0.02 u on a ~1 u character body ≈ the same 4%),
// which keeps the ink weight constant across differently sized masses and
// survives hard-edged geometry.
export const OUTLINE = Object.freeze({
  scale: 1.04, // legacy reference from the brief; thickness below is derived from it
  thickness: 0.028,
});

// 3/4 top-down camera rig (elevation chosen for the storybook 3/4 read).
// Follow: exponential smoothing toward player + slight lead toward the cursor
// (§22: smoothed follow, aim lookahead <= 0.8 u, player never leaves frame).
// followStiffness/lookaheadFactor are authored tunables (the brief binds only
// the 0.8 u cap); stiffness 6/s => ~0.17 s lag, max lag during a 7.2 u/s dash
// ~1.2 u — well inside the ~5 u ground half-height of the frame.
export const CAMERA = Object.freeze({
  fov: 45,
  near: 0.1,
  far: 200,
  distance: 12,
  elevationDeg: 52,
  followStiffness: 6, // 1/s exponential smoothing rate
  lookaheadFactor: 0.12, // fraction of player->cursor distance contributed as lead
  lookaheadMax: 0.8, // u (§22 binding cap)
});

// §1 Performance: canvas fully responsive; devicePixelRatio capped at 2.
export const MAX_PIXEL_RATIO = 2;
