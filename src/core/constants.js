// Every renderer/loop tuning number from BUILD_BRIEF lives here, frozen.
// (Gameplay tables land in src/data/* with the sim core block.)

// §1 Simulation: fixed 60 Hz tick via accumulator.
export const TICK_HZ = 60;
export const TICK_MS = 1000 / TICK_HZ;
export const MAX_FRAME_MS = 250; // accumulator clamp so a hitch never spirals

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

// 3/4 top-down camera rig (elevation chosen for the storybook 3/4 read;
// follow smoothing + aim lookahead land with the player-controller block).
export const CAMERA = Object.freeze({
  fov: 45,
  near: 0.1,
  far: 200,
  distance: 12,
  elevationDeg: 52,
});

// §1 Performance: canvas fully responsive; devicePixelRatio capped at 2.
export const MAX_PIXEL_RATIO = 2;
