// REVIEW-ONLY (never committed, never pushed): Ashfang's kit 2.0 skill motions (M8 to M24 of
// /mnt/project-files/ashfang-talents/ASHFANG_MOTIONS.md), keyed on the fox rig's timeline (see
// COMBO_KEYS in tripoFox.js for the channels). Times are from the press. Model space: +z ahead,
// +x his left. Idle: hand [-0.177, 0.459, 0.063], blade [0.1, 0.53, 0.84], feet fl [0.045, -0.085]
// fr [-0.069, 0.128], left paw [0.156, 0.496, 0.102]. `hit` marks the beats the sim lands.
export const SKILL20_DEFS = {
  // M8 Flurry (0.7 s): a reverse-grip draw from the left hip, four cuts in an X and an X, each
  // leaving a stroke in the air, a flick that flares them, the end low with the blade out
  flurry20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.045, h: [0.1, 0.42, 0.15], b: [0.25, -0.3, -0.92], yaw: 26, pitch: 4, drop: 0.035, lh: [0.17, 0.43, 0.06], ear: 0.3, fl: [0.06, -0.1] },
      { t: 0.095, h: [0.07, 0.76, 0.16], b: [0.45, 0.75, 0.45], yaw: 16, pitch: -4, drop: 0.02 },
      { t: 0.14, hit: 1, h: [-0.06, 0.56, 0.3], b: [-0.35, -0.22, 0.9], yaw: -4, pitch: 8, drop: 0.04, lh: [0.2, 0.46, 0.1], ear: 1 },
      { t: 0.18, h: [-0.2, 0.4, 0.2], b: [-0.72, -0.58, 0.35], yaw: -20, pitch: 10, drop: 0.045 },
      { t: 0.205, h: [-0.19, 0.76, 0.12], b: [-0.45, 0.8, 0.35], yaw: -16, pitch: -3, drop: 0.03, ear: 0.5 },
      { t: 0.23, hit: 2, h: [-0.02, 0.56, 0.3], b: [0.35, -0.22, 0.9], yaw: 4, pitch: 8, drop: 0.04, ear: 1 },
      { t: 0.27, h: [0.14, 0.42, 0.2], b: [0.72, -0.58, 0.35], yaw: 22, pitch: 10, drop: 0.045 },
      { t: 0.295, h: [0.12, 0.72, 0.17], b: [0.5, 0.75, 0.4], yaw: 18, pitch: -2, drop: 0.035, ear: 0.5 },
      { t: 0.33, hit: 3, h: [-0.06, 0.5, 0.34], b: [-0.3, -0.3, 0.9], yaw: -2, pitch: 13, hz: 0.03, drop: 0.06, fr: [-0.075, 0.23], ear: 1 },
      { t: 0.36, h: [-0.22, 0.36, 0.22], b: [-0.75, -0.55, 0.3], yaw: -22, pitch: 12, hz: 0.03, drop: 0.06 },
      { t: 0.385, h: [-0.2, 0.74, 0.13], b: [-0.5, 0.75, 0.4], yaw: -18, pitch: 0, hz: 0.025, drop: 0.05, ear: 0.5 },
      { t: 0.42, hit: 4, h: [0.0, 0.5, 0.34], b: [0.3, -0.3, 0.9], yaw: 4, pitch: 13, hz: 0.035, drop: 0.065, ear: 1 },
      { t: 0.46, h: [0.15, 0.38, 0.2], b: [0.75, -0.55, 0.3], yaw: 22, pitch: 12, hz: 0.03, drop: 0.07 },
      { t: 0.5, h: [0.0, 0.5, 0.25], b: [0.0, 0.3, 0.95], yaw: 6, pitch: 8, hz: 0.02, drop: 0.07 },
      { t: 0.55, h: [-0.27, 0.42, 0.08], b: [-0.92, -0.35, 0.15], yaw: -26, pitch: 10, roll: -3, hz: 0.01, drop: 0.09, lh: [0.22, 0.52, 0.16], ear: 0.6 },
      { t: 0.66, h: [-0.27, 0.42, 0.07], b: [-0.92, -0.34, 0.16], yaw: -26, pitch: 10, roll: -3, hz: 0.01, drop: 0.09, lh: [0.22, 0.52, 0.15], ear: 0.3 },
      { t: 0.86, idle: true },
    ],
  },

  // M9 Crescent Finisher (1.0 s): a deep crouch with the point dragging sparks behind him, a
  // rising cut that lifts him into a back turn (a tall moon), the landing with his back to them
  finisher20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.08, h: [-0.2, 0.34, -0.02], b: [-0.35, -0.5, -0.8], yaw: -24, pitch: 22, drop: 0.1, hz: 0.02, lh: [0.16, 0.42, 0.3], fr: [-0.08, 0.24], ear: 0.6 },
      { t: 0.24, h: [-0.21, 0.32, -0.04], b: [-0.3, -0.52, -0.8], yaw: -28, pitch: 26, drop: 0.13, hz: 0.04, lh: [0.17, 0.42, 0.32], fr: [-0.08, 0.27] },
      { t: 0.3, hit: 1, h: [-0.04, 0.58, 0.32], b: [0.05, 0.6, 0.8], yaw: 0, pitch: -6, drop: 0.02, hz: 0.04, lift: 0.08, spin: 10, lh: [0.2, 0.5, 0.05], ear: 1 },
      { t: 0.42, h: [0.02, 0.88, 0.1], b: [0.15, 0.95, -0.25], yaw: 14, pitch: -14, drop: 0, lift: 0.34, spin: 80, tuck: 0.09, lh: [0.24, 0.56, -0.05] },
      { t: 0.62, h: [0.12, 0.72, 0.0], b: [0.55, 0.6, -0.55], yaw: 20, pitch: -6, lift: 0.26, spin: 160, tuck: 0.07 },
      { t: 0.8, h: [0.26, 0.44, 0.06], b: [0.95, -0.2, 0.2], yaw: 22, pitch: 12, drop: 0.11, lift: 0, spin: 180, tuck: 0, lh: [0.22, 0.48, 0.18], ear: 0.6 },
      { t: 0.9, h: [0.27, 0.44, 0.06], b: [0.95, -0.22, 0.2], yaw: 22, pitch: 12, drop: 0.11, spin: 180, ear: 0.3 },
      { t: 1.06, h: [-0.1, 0.5, 0.18], b: [0.0, 0.6, 0.8], yaw: 0, pitch: 4, drop: 0.04, spin: 360 },
      { t: 1.22, idle: true, spin: 360 },
    ],
  },
  // M10 Keen Crescent (0.9 s): a full turn with the blade out drawing a ring round him, a planted
  // flat cut out of the turn (the crescent flies), the arm held fully out
  keen20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.05, h: [-0.26, 0.46, 0.1], b: [-0.95, -0.12, 0.25], yaw: -20, pitch: 6, drop: 0.05, lh: [0.2, 0.5, 0.12], ear: 0.5 },
      { t: 0.28, h: [-0.27, 0.46, 0.06], b: [-0.95, -0.1, 0.0], yaw: -32, pitch: 8, drop: 0.07, spin: -330, lh: [0.22, 0.5, 0.1] },
      { t: 0.35, hit: 1, h: [0.0, 0.46, 0.34], b: [0.1, -0.05, 1.0], yaw: 4, pitch: 10, drop: 0.08, spin: -360, hz: 0.03, fr: [-0.075, 0.24], lh: [0.24, 0.46, -0.1], ear: 1 },
      { t: 0.42, h: [0.2, 0.48, 0.18], b: [0.9, 0.0, 0.35], yaw: 28, pitch: 8, drop: 0.07, spin: -360, hz: 0.03 },
      { t: 0.52, h: [-0.04, 0.55, 0.38], b: [0.0, 0.06, 1.0], yaw: 2, pitch: 12, drop: 0.07, spin: -360, hz: 0.04, lh: [0.24, 0.46, -0.14], ear: 0.7 },
      { t: 0.72, h: [-0.04, 0.55, 0.38], b: [0.0, 0.05, 1.0], yaw: 2, pitch: 12, drop: 0.07, spin: -360, hz: 0.04, ear: 0.3 },
      { t: 0.95, idle: true, spin: -360 },
    ],
  },
  // M11 Sword Bloom (1.1 s): the sword tossed up spinning, the open left paw snapped out (the
  // scars open), the catch over his head and the cut down
  bloom20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.06, h: [-0.12, 0.42, 0.22], b: [0.0, 0.3, 0.95], yaw: -6, pitch: 6, drop: 0.05, ear: 0.3 },
      { t: 0.13, h: [-0.08, 0.78, 0.18], b: [0.0, 0.95, 0.3], yaw: -4, pitch: -6, drop: 0.0 },
      { t: 0.3, h: [-0.12, 0.62, 0.14], b: [-0.2, 0.9, 0.2], yaw: -10, pitch: 0, drop: 0.03, lh: [0.16, 0.5, 0.18] },
      { t: 0.36, h: [-0.14, 0.58, 0.1], b: [-0.2, 0.9, 0.2], yaw: -18, pitch: 2, drop: 0.05, lh: [0.18, 0.5, 0.12] },
      { t: 0.4, hit: 1, h: [-0.12, 0.6, 0.08], b: [-0.2, 0.9, 0.2], yaw: -24, pitch: 6, drop: 0.06, hz: 0.02, lh: [0.1, 0.6, 0.36], ear: 1, fl: [0.06, 0.02] },
      { t: 0.56, h: [-0.06, 0.84, 0.08], b: [0.0, 0.45, -0.9], yaw: -6, pitch: -8, drop: 0.02, lh: [0.12, 0.58, 0.3], ear: 0.4 },
      { t: 0.72, h: [-0.03, 0.9, 0.04], b: [0.0, 0.42, -0.9], yaw: 0, pitch: -12, drop: 0.0, lg: 0.4, ear: 0.6 },
      { t: 0.8, hit: 2, h: [-0.03, 0.44, 0.33], b: [0.0, -0.45, 0.9], pitch: 22, drop: 0.1, hz: 0.04, lg: 1, ear: 1, fl: [0.06, 0.02] },
      { t: 0.86, h: [-0.03, 0.36, 0.28], b: [0.05, -0.8, 0.6], pitch: 24, drop: 0.11, hz: 0.04, lg: 1 },
      { t: 1.0, h: [-0.03, 0.36, 0.28], b: [0.05, -0.78, 0.62], pitch: 23, drop: 0.11, hz: 0.04, lg: 0.8, ear: 0.3 },
      { t: 1.2, idle: true },
    ],
    cues: [[0.13, 'toss', { secs: 0.6, h: 0.75, turns: 3 }]],
  },
  // M12 Triple Crescent (1.6 s): the salute with three ghost blades fanned out behind, a flat, a
  // rising and an overhead great cut, then he turns away and sheathes as the wings fold
  triple20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.14, h: [-0.03, 0.62, 0.22], b: [0.0, 1.0, 0.05], yaw: 0, pitch: -4, lh: [0.02, 0.6, 0.24], ear: 0.2 },
      { t: 0.3, h: [-0.03, 0.63, 0.22], b: [0.0, 1.0, 0.04], yaw: 0, pitch: -5, lh: [0.02, 0.61, 0.24] },
      { t: 0.35, h: [-0.26, 0.52, 0.0], b: [-0.9, 0.05, -0.42], yaw: -40, pitch: 2, drop: 0.04, lh: [0.2, 0.5, 0.2], ear: 0.6 },
      { t: 0.4, hit: 1, h: [0.0, 0.5, 0.34], b: [0.0, 0.0, 1.0], yaw: 0, pitch: 8, drop: 0.06, hz: 0.03, fr: [-0.075, 0.22], ear: 1 },
      { t: 0.46, h: [0.23, 0.5, 0.13], b: [0.95, 0.0, -0.2], yaw: 40, pitch: 6, drop: 0.06, hz: 0.03, lh: [0.24, 0.48, -0.1] },
      { t: 0.57, h: [-0.18, 0.32, 0.18], b: [-0.5, -0.75, 0.42], yaw: -24, pitch: 14, drop: 0.09, hz: 0.03, ear: 0.6 },
      { t: 0.65, hit: 2, h: [0.0, 0.62, 0.34], b: [0.25, 0.55, 0.8], yaw: 4, pitch: -2, drop: 0.03, hz: 0.03, ear: 1 },
      { t: 0.72, h: [0.12, 0.84, 0.13], b: [0.3, 0.92, -0.2], yaw: 20, pitch: -10, drop: 0.0 },
      { t: 0.81, h: [-0.02, 0.9, 0.0], b: [0.0, 0.4, -0.92], yaw: 0, pitch: -14, drop: 0.0, lg: 1, ear: 0.6, fl: [0.06, 0.0] },
      { t: 0.9, hit: 3, h: [-0.02, 0.46, 0.34], b: [0.0, -0.35, 0.94], yaw: 0, pitch: 22, drop: 0.11, hz: 0.05, lg: 1, ear: 1 },
      { t: 1.02, h: [-0.02, 0.42, 0.32], b: [0.0, -0.45, 0.9], yaw: 0, pitch: 22, drop: 0.11, hz: 0.05, lg: 1 },
      { t: 1.18, h: [-0.04, 0.55, 0.25], b: [0.0, 0.3, 0.95], yaw: 10, pitch: 6, drop: 0.05, hz: 0.02, lg: 0, spin: -60, ear: 0.3 },
      { t: 1.3, h: [0.1, 0.42, 0.14], b: [0.25, -0.28, -0.92], yaw: 20, pitch: 2, drop: 0.03, spin: -160, lh: [0.15, 0.41, 0.1], fl: [0.045, -0.085], fr: [-0.069, 0.128] },
      { t: 1.48, h: [0.1, 0.42, 0.13], b: [0.25, -0.27, -0.93], yaw: 20, pitch: 2, drop: 0.03, spin: -165, lh: [0.15, 0.41, 0.09] },
      { t: 1.75, idle: true, spin: -360 },
    ],
  },
  // M13 Lunge Strike (0.8 s): coiled low with the blade by his cheek and the left paw sighting,
  // the thrust, the twist and the rip out
  lunge20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.1, h: [-0.12, 0.66, 0.08], b: [0.05, 0.02, 1.0], yaw: -26, pitch: 6, drop: 0.08, hz: -0.02, lh: [0.04, 0.64, 0.32], ear: 0.5, fl: [0.06, -0.12] },
      { t: 0.24, h: [-0.13, 0.65, 0.05], b: [0.05, 0.0, 1.0], yaw: -30, pitch: 8, drop: 0.1, hz: -0.03, lh: [0.04, 0.63, 0.33], ear: 0.7 },
      { t: 0.3, hit: 1, h: [-0.03, 0.5, 0.44], b: [0.0, -0.12, 1.0], yaw: 4, pitch: 26, drop: 0.12, hz: 0.09, lh: [0.24, 0.5, -0.16], fr: [-0.075, 0.34], ear: 1 },
      { t: 0.42, h: [-0.03, 0.5, 0.42], b: [0.12, -0.05, 1.0], yaw: 6, pitch: 25, drop: 0.12, hz: 0.09, fr: [-0.075, 0.34] },
      { t: 0.5, hit: 2, h: [-0.18, 0.6, 0.14], b: [-0.3, 0.45, 0.84], yaw: -20, pitch: 6, drop: 0.07, hz: 0.04, lh: [0.2, 0.5, 0.05], ear: 1 },
      { t: 0.66, h: [-0.16, 0.58, 0.14], b: [-0.2, 0.5, 0.84], yaw: -16, pitch: 5, drop: 0.06, hz: 0.04, ear: 0.3 },
      { t: 0.9, idle: true },
    ],
  },
  // M14 Rift Cut (1.1 s): a reverse-grip stab into the floor, the point dragged round his feet,
  // then ripped up and forward (the rift races out)
  rift20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.1, h: [-0.08, 0.76, 0.2], b: [0.0, -0.3, 0.95], yaw: -6, pitch: -6, drop: 0.0, lh: [0.04, 0.72, 0.22], lg: 0.7, ear: 0.4 },
      { t: 0.2, hit: 1, h: [-0.05, 0.3, 0.3], b: [0.0, -0.96, 0.25], yaw: 0, pitch: 32, drop: 0.14, hz: 0.03, lg: 1, ear: 1, fr: [-0.075, 0.22] },
      { t: 0.35, h: [-0.18, 0.3, 0.24], b: [-0.3, -0.92, 0.2], yaw: -24, pitch: 30, drop: 0.14, hz: 0.02, lg: 1 },
      { t: 0.5, h: [-0.27, 0.32, 0.03], b: [-0.4, -0.9, -0.1], yaw: -45, pitch: 26, drop: 0.13, lg: 0.5, lh: [0.2, 0.44, 0.18], ear: 0.6 },
      { t: 0.6, hit: 2, h: [0.0, 0.62, 0.34], b: [0.1, 0.55, 0.83], yaw: 8, pitch: -4, drop: 0.02, hz: 0.04, lg: 0, lh: [0.24, 0.48, -0.12], ear: 1 },
      { t: 0.7, h: [0.06, 0.84, 0.14], b: [0.2, 0.95, -0.1], yaw: 14, pitch: -12, drop: 0.0, hz: 0.03 },
      { t: 0.95, h: [0.06, 0.84, 0.13], b: [0.2, 0.95, -0.12], yaw: 14, pitch: -11, drop: 0.0, hz: 0.03, ear: 0.3 },
      { t: 1.2, idle: true },
    ],
  },
  // M15 Caltrops (0.8 s): a spin on one foot with the blade low, then a cut across the floor
  caltrops20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.05, h: [-0.25, 0.36, 0.1], b: [-0.85, -0.45, 0.25], yaw: -20, pitch: 12, drop: 0.07, lh: [0.22, 0.52, 0.1], ear: 0.5, fl: [0.06, 0.02] },
      { t: 0.28, h: [-0.26, 0.35, 0.06], b: [-0.85, -0.45, 0.1], yaw: -30, pitch: 14, drop: 0.08, spin: -330, tuck: 0.03 },
      { t: 0.35, hit: 1, h: [0.0, 0.32, 0.32], b: [0.2, -0.5, 0.85], yaw: 4, pitch: 20, drop: 0.1, spin: -360, tuck: 0, hz: 0.03, ear: 1, fl: [0.045, -0.085] },
      { t: 0.43, h: [0.22, 0.36, 0.15], b: [0.85, -0.4, 0.25], yaw: 30, pitch: 18, drop: 0.1, spin: -360, hz: 0.03, lh: [0.18, 0.56, -0.08] },
      { t: 0.62, h: [0.22, 0.36, 0.14], b: [0.85, -0.38, 0.25], yaw: 30, pitch: 17, drop: 0.1, spin: -360, hz: 0.03, ear: 0.3 },
      { t: 0.86, idle: true, spin: -360 },
    ],
  },
  // M16 Riposte: the guard (0.6 s), the answer on a catch (a slow frame, then a full turn with a
  // backhand cut drawing a full moon, and a flick), and the guard lowered when nothing comes
  riposteGuard20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.08, h: [-0.04, 0.6, 0.27], b: [0.05, 0.98, 0.15], yaw: -10, pitch: 2, drop: 0.06, lh: [0.24, 0.5, -0.14], ear: 0.6 },
      { t: 0.6, h: [-0.04, 0.6, 0.26], b: [0.05, 0.98, 0.14], yaw: -10, pitch: 2, drop: 0.06, lh: [0.24, 0.5, -0.14], ear: 0.6 },
      { t: 0.62, h: [-0.04, 0.6, 0.26], b: [0.05, 0.98, 0.14], yaw: -10, pitch: 2, drop: 0.06, lh: [0.24, 0.5, -0.14], ear: 0.6 },
    ],
  },
  riposteHit20: {
    keys: [
      { t: 0, h: [-0.04, 0.6, 0.26], b: [0.05, 0.98, 0.14], yaw: -10, pitch: 2, drop: 0.06, lh: [0.24, 0.5, -0.14], ear: 0.6 },
      { t: 0.1, h: [-0.03, 0.6, 0.27], b: [0.06, 0.98, 0.14], yaw: -10, pitch: 2, drop: 0.07, lh: [0.24, 0.5, -0.14], ear: 1 },
      { t: 0.16, h: [0.24, 0.52, 0.12], b: [0.95, 0.05, 0.25], yaw: 30, pitch: 6, drop: 0.08, spin: 60, lh: [0.2, 0.5, 0.2] },
      { t: 0.27, hit: 1, h: [0.26, 0.5, 0.1], b: [0.96, -0.05, 0.2], yaw: 34, pitch: 8, drop: 0.08, spin: 200 },
      { t: 0.38, h: [0.24, 0.5, 0.12], b: [0.95, 0.0, 0.25], yaw: 30, pitch: 6, drop: 0.07, spin: 345 },
      { t: 0.45, h: [-0.26, 0.44, 0.08], b: [-0.92, -0.34, 0.15], yaw: -26, pitch: 8, drop: 0.08, spin: 360, lh: [0.22, 0.5, 0.15], ear: 0.6 },
      { t: 0.58, h: [-0.26, 0.44, 0.08], b: [-0.92, -0.33, 0.16], yaw: -26, pitch: 8, drop: 0.08, spin: 360, ear: 0.3 },
      { t: 0.8, idle: true, spin: 360 },
    ],
  },
  riposteLow20: {
    keys: [
      { t: 0, h: [-0.04, 0.6, 0.26], b: [0.05, 0.98, 0.14], yaw: -10, pitch: 2, drop: 0.06, lh: [0.24, 0.5, -0.14], ear: 0.6 },
      { t: 0.15, h: [-0.06, 0.56, 0.26], b: [0.65, 0.35, 0.68], yaw: -6, pitch: 2, drop: 0.05 },
      { t: 0.3, h: [-0.08, 0.52, 0.24], b: [0.1, -0.35, 0.93], yaw: -4, pitch: 3, drop: 0.04 },
      { t: 0.45, h: [-0.12, 0.5, 0.2], b: [-0.6, 0.2, 0.77], yaw: -2, pitch: 2, drop: 0.02, ear: 0.2 },
      { t: 0.65, idle: true },
    ],
  },
  // M17 Moonfang (1.0 s): sunk low with the blade at his left hip as if sheathed, the streak (the
  // sim moves him), then still at the far end with the blade out while the moon opens behind him
  moonfang20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.1, h: [0.08, 0.4, 0.13], b: [0.3, -0.2, -0.93], yaw: 28, pitch: 18, drop: 0.12, lh: [0.14, 0.41, 0.11], fr: [-0.08, 0.24], ear: 0.6 },
      { t: 0.22, h: [0.08, 0.39, 0.13], b: [0.3, -0.22, -0.92], yaw: 30, pitch: 20, drop: 0.13, lh: [0.14, 0.4, 0.11], fr: [-0.08, 0.26], ear: 0.8 },
      { t: 0.3, h: [-0.18, 0.45, 0.3], b: [-0.6, 0.0, 0.8], yaw: -10, pitch: 22, flip: 12, drop: 0.1, lh: [0.22, 0.46, -0.12], ear: 1 },
      { t: 0.4, h: [-0.3, 0.48, 0.12], b: [-0.95, -0.12, 0.25], yaw: -30, pitch: 10, flip: 0, drop: 0.07, lh: [0.22, 0.5, 0.0], fr: [-0.08, 0.2] },
      { t: 0.78, h: [-0.3, 0.48, 0.11], b: [-0.95, -0.12, 0.24], yaw: -30, pitch: 9, drop: 0.06, ear: 0.3 },
      { t: 1.02, idle: true },
    ],
  },
  // M18 Calm Crescent (0.9 s): a turning hop with his body laid over (the blade draws a full
  // circle), the wide cut out of the roll, landing low
  calm20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.05, h: [-0.26, 0.48, 0.1], b: [-0.95, 0.0, 0.25], yaw: -14, pitch: 6, drop: 0.07, lh: [0.22, 0.52, 0.12], ear: 0.5 },
      { t: 0.14, h: [-0.27, 0.5, 0.08], b: [-0.95, 0.05, 0.2], yaw: -16, pitch: 0, drop: 0.0, lift: 0.18, tumble: 35, spin: -90, tuck: 0.08 },
      { t: 0.26, h: [-0.27, 0.5, 0.08], b: [-0.95, 0.05, 0.2], yaw: -16, lift: 0.36, tumble: 70, spin: -220, tuck: 0.1 },
      { t: 0.38, h: [-0.26, 0.5, 0.1], b: [-0.95, 0.0, 0.25], yaw: -20, lift: 0.22, tumble: 30, spin: -330, tuck: 0.06 },
      { t: 0.45, hit: 1, h: [0.0, 0.48, 0.35], b: [0.0, -0.05, 1.0], yaw: 2, pitch: 10, drop: 0.08, lift: 0.0, tumble: 0, spin: -360, tuck: 0, lg: 0.6, ear: 1 },
      { t: 0.53, h: [0.22, 0.48, 0.15], b: [0.92, -0.05, 0.3], yaw: 30, pitch: 10, drop: 0.11, spin: -360, lg: 0 },
      { t: 0.72, h: [0.22, 0.48, 0.14], b: [0.92, -0.05, 0.3], yaw: 30, pitch: 9, drop: 0.1, spin: -360, ear: 0.3 },
      { t: 0.96, idle: true, spin: -360 },
    ],
  },
  // M19 Mirror Image (0.6 s): a slow circle drawn with the point in front of him (the mirror),
  // then a step back out of himself (the image stays in the pose)
  mirror20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.06, h: [-0.04, 0.58, 0.3], b: [0.0, 0.35, 0.94], yaw: -4, pitch: 4, drop: 0.03, lh: [0.18, 0.52, 0.2] },
      { t: 0.13, h: [0.0, 0.56, 0.3], b: [0.33, 0.0, 0.94], yaw: 0, pitch: 4, drop: 0.03 },
      { t: 0.2, h: [-0.04, 0.54, 0.3], b: [0.0, -0.33, 0.94], yaw: -2, pitch: 5, drop: 0.03 },
      { t: 0.27, h: [-0.08, 0.56, 0.3], b: [-0.33, 0.0, 0.94], yaw: -6, pitch: 4, drop: 0.03 },
      { t: 0.33, h: [-0.04, 0.58, 0.3], b: [0.0, 0.35, 0.94], yaw: -4, pitch: 4, drop: 0.03 },
      { t: 0.42, h: [-0.06, 0.58, 0.24], b: [0.0, 0.5, 0.86], yaw: -4, pitch: -4, drop: 0.04, hz: -0.03, fl: [0.045, -0.16], lh: [0.2, 0.5, 0.08] },
      { t: 0.58, h: [-0.06, 0.57, 0.23], b: [0.0, 0.5, 0.86], yaw: -4, pitch: -2, drop: 0.04 },
      { t: 0.78, idle: true },
    ],
  },
  // M20 Fox Step (0.6 s): a low corkscrew dash (his body rolls once along the path, the blade
  // drawing a spiral), then a slide to a stop on one knee with the blade behind him
  foxstep20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.04, h: [-0.25, 0.46, 0.12], b: [-0.9, 0.1, 0.4], yaw: -14, pitch: 18, drop: 0.08, lh: [0.2, 0.46, -0.1], ear: 0.8 },
      { t: 0.32, h: [-0.25, 0.46, 0.12], b: [-0.9, 0.1, 0.4], yaw: -14, pitch: 20, flip: 18, drop: 0.08, tumble: 360, lift: 0.0, tuck: 0.04 },
      { t: 0.2, hit: 1, h: [-0.25, 0.46, 0.12], b: [-0.9, 0.1, 0.4], yaw: -14, pitch: 20, flip: 22, drop: 0.06, tumble: 220, lift: 0.14, tuck: 0.06 },
      { t: 0.4, h: [-0.25, 0.42, -0.1], b: [-0.4, -0.2, -0.9], yaw: -20, pitch: 12, flip: 0, drop: 0.15, tumble: 360, fl: [0.05, -0.26], fr: [-0.075, 0.2], lh: [0.2, 0.42, 0.24], ear: 0.6 },
      { t: 0.6, h: [-0.25, 0.42, -0.11], b: [-0.4, -0.2, -0.9], yaw: -20, pitch: 11, drop: 0.15, tumble: 360, fl: [0.05, -0.26], fr: [-0.075, 0.2], ear: 0.3 },
      { t: 0.84, idle: true, tumble: 360 },
    ],
  },
  // M21 Blade Storm (1.4 s): a small leap, three flat turns in the air with the blade out (three
  // rings), then down with the point in the floor
  storm20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.1, h: [-0.26, 0.46, 0.08], b: [-0.95, -0.05, 0.25], yaw: -16, pitch: 10, drop: 0.09, lh: [0.22, 0.5, 0.1], ear: 0.5 },
      { t: 0.22, h: [-0.27, 0.5, 0.06], b: [-0.96, 0.0, 0.2], yaw: -18, pitch: 2, drop: 0.0, lift: 0.22, spin: -60, tuck: 0.09 },
      { t: 0.6, hit: 2, h: [-0.27, 0.5, 0.06], b: [-0.96, 0.0, 0.2], yaw: -18, pitch: 2, lift: 0.3, spin: -560, tuck: 0.1 },
      { t: 0.3, hit: 1, h: [-0.27, 0.5, 0.06], b: [-0.96, 0.0, 0.2], yaw: -18, pitch: 2, lift: 0.28, spin: -200, tuck: 0.1 },
      { t: 0.9, hit: 3, h: [-0.27, 0.5, 0.06], b: [-0.96, 0.0, 0.2], yaw: -18, pitch: 2, lift: 0.26, spin: -960, tuck: 0.1 },
      { t: 1.02, h: [-0.04, 0.84, 0.16], b: [0.0, -0.4, 0.92], yaw: -4, pitch: -8, lift: 0.18, spin: -1080, tuck: 0.06, lg: 0.8, ear: 0.7 },
      { t: 1.1, hit: 4, h: [-0.04, 0.3, 0.3], b: [0.0, -0.96, 0.26], yaw: 0, pitch: 30, drop: 0.14, lift: 0, spin: -1080, tuck: 0, lg: 1, ear: 1 },
      { t: 1.32, h: [-0.04, 0.3, 0.3], b: [0.0, -0.95, 0.27], yaw: 0, pitch: 29, drop: 0.14, spin: -1080, lg: 1, ear: 0.3 },
      { t: 1.6, idle: true, spin: -1080 },
    ],
  },
  // M22 Blade Dance (0.9 s): a no-hands cartwheel with the blade sweeping a tilted ring, a second
  // ring tilted the other way, a light landing
  dance20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.06, h: [-0.26, 0.5, 0.1], b: [-0.95, 0.1, 0.25], yaw: -10, pitch: 4, drop: 0.07, lh: [0.24, 0.6, 0.06], ear: 0.6 },
      { t: 0.2, hit: 1, h: [-0.27, 0.52, 0.08], b: [-0.95, 0.15, 0.2], yaw: -10, lift: 0.2, tumble: 130, spin: 35, tuck: 0.1, lh: [0.25, 0.62, 0.04] },
      { t: 0.32, h: [-0.27, 0.52, 0.08], b: [-0.95, 0.15, 0.2], yaw: -10, lift: 0.34, tumble: 230, spin: 0, tuck: 0.1 },
      { t: 0.45, hit: 2, h: [-0.27, 0.52, 0.08], b: [-0.95, 0.15, 0.2], yaw: -10, lift: 0.18, tumble: 330, spin: -35, tuck: 0.06 },
      { t: 0.55, h: [-0.22, 0.48, 0.12], b: [-0.85, 0.2, 0.45], yaw: -10, pitch: 6, drop: 0.06, lift: 0, tumble: 360, spin: 0, tuck: 0, lh: [0.24, 0.52, 0.1], ear: 0.6 },
      { t: 0.7, h: [-0.2, 0.5, 0.12], b: [-0.7, 0.4, 0.6], yaw: -8, pitch: 4, drop: 0.04, tumble: 360, ear: 0.3 },
      { t: 0.9, idle: true, tumble: 360 },
    ],
  },
  // M23 Blade Wheel (1.0 s): two big figure-eight wheels of the sword, then an underhand throwing
  // cut that sends the wheel off
  wheel20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.06, h: [-0.16, 0.56, 0.22], b: [-0.2, 0.95, 0.2], yaw: -10, pitch: 2, lh: [0.2, 0.5, 0.18], ear: 0.3 },
      { t: 0.12, h: [-0.16, 0.56, 0.24], b: [-0.15, 0.0, 1.0], yaw: -12, pitch: 4 },
      { t: 0.18, h: [-0.18, 0.52, 0.22], b: [-0.2, -0.92, 0.35], yaw: -14, pitch: 6 },
      { t: 0.24, h: [-0.2, 0.54, 0.14], b: [-0.3, -0.2, -0.93], yaw: -18, pitch: 4 },
      { t: 0.3, h: [0.08, 0.58, 0.22], b: [0.2, 0.95, 0.2], yaw: 10, pitch: 2 },
      { t: 0.36, h: [0.1, 0.56, 0.24], b: [0.15, 0.0, 1.0], yaw: 14, pitch: 4 },
      { t: 0.42, h: [0.1, 0.52, 0.22], b: [0.2, -0.92, 0.35], yaw: 16, pitch: 6 },
      { t: 0.47, h: [0.08, 0.54, 0.14], b: [0.3, -0.2, -0.93], yaw: 14, pitch: 4 },
      { t: 0.53, h: [-0.2, 0.32, -0.04], b: [-0.3, -0.6, -0.75], yaw: -22, pitch: 12, drop: 0.08, ear: 0.6, fr: [-0.075, 0.2] },
      { t: 0.6, hit: 1, h: [-0.02, 0.46, 0.36], b: [0.0, 0.2, 0.98], yaw: 2, pitch: 12, drop: 0.06, hz: 0.04, lh: [0.24, 0.48, -0.12], ear: 1 },
      { t: 0.67, h: [0.04, 0.72, 0.28], b: [0.1, 0.82, 0.56], yaw: 8, pitch: -4, drop: 0.02, hz: 0.04 },
      { t: 0.84, h: [0.04, 0.72, 0.27], b: [0.1, 0.82, 0.56], yaw: 8, pitch: -4, drop: 0.02, hz: 0.04, ear: 0.3 },
      { t: 1.04, idle: true },
    ],
  },
  // M24 Thousand Cuts (1.4 s): he lowers the blade and breathes out (he splits into after-images
  // and is gone); the sim's blur cuts the foes; he comes back sheathing slowly (the click)
  thousand20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.18, h: [-0.18, 0.36, 0.12], b: [-0.2, -0.7, 0.68], yaw: -6, pitch: 8, drop: 0.05, ear: -0.2 },
      { t: 0.24, h: [-0.04, 0.5, 0.36], b: [0.0, 0.0, 1.0], yaw: 0, pitch: 18, flip: 15, drop: 0.08, lh: [0.24, 0.46, -0.14], ear: 1 },
      { t: 1.08, h: [-0.04, 0.5, 0.36], b: [0.0, 0.0, 1.0], yaw: 0, pitch: 18, flip: 15, drop: 0.08, lh: [0.24, 0.46, -0.14], ear: 1 },
      { t: 1.15, h: [-0.06, 0.56, 0.26], b: [0.0, 0.2, 0.98], yaw: 0, pitch: 4, flip: 0, drop: 0.04, lh: [0.16, 0.44, 0.14], ear: 0.3 },
      { t: 1.3, hit: 1, h: [0.1, 0.42, 0.14], b: [0.25, -0.3, -0.92], yaw: 18, pitch: 2, drop: 0.03, lh: [0.15, 0.41, 0.1], ear: 0.2 },
      { t: 1.45, h: [0.1, 0.42, 0.14], b: [0.25, -0.3, -0.92], yaw: 18, pitch: 2, drop: 0.03, lh: [0.15, 0.41, 0.1] },
      { t: 1.66, idle: true },
    ],
  },
  // M7b the dash: flat and low, the blade leading like a spear (the passed dash's 0.95 s)
  dash20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.08, h: [-0.1, 0.44, 0.24], b: [0.0, 0.0, 1.0], yaw: -6, pitch: 20, drop: 0.08, lh: [0.22, 0.46, -0.1], ear: 0.6 },
      { t: 0.14, h: [-0.04, 0.42, 0.38], b: [0.0, -0.05, 1.0], yaw: 0, pitch: 34, flip: 18, drop: 0.11, hz: 0.04, lh: [0.24, 0.44, -0.22], fl: [0.05, -0.2], ear: 1 },
      { t: 0.4, h: [-0.04, 0.42, 0.38], b: [0.0, -0.05, 1.0], yaw: 0, pitch: 34, flip: 18, drop: 0.11, hz: 0.04, lh: [0.24, 0.44, -0.22], fl: [0.05, -0.2], ear: 1 },
      { t: 0.52, h: [-0.08, 0.46, 0.3], b: [0.0, 0.1, 1.0], yaw: -4, pitch: 14, flip: 0, drop: 0.1, hz: 0.02, fl: [0.05, -0.16], ear: 0.6 },
      { t: 0.7, h: [-0.12, 0.5, 0.2], b: [0.0, 0.35, 0.94], yaw: -4, pitch: 6, drop: 0.05, ear: 0.3 },
      { t: 0.95, idle: true },
    ],
  },
};
