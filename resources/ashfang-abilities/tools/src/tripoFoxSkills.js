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
      { t: 0.62, h: [-0.04, 0.54, 0.42], b: [0.0, 0.03, 1.0], yaw: 0, pitch: 15, drop: 0.08, spin: -360, hz: 0.055, lh: [0.25, 0.44, -0.18], ear: 0.5 },
      { t: 0.74, h: [-0.06, 0.55, 0.34], b: [-0.05, 0.1, 1.0], yaw: 4, pitch: 9, drop: 0.065, spin: -360, hz: 0.03, ear: 0.3 },
      { t: 0.97, idle: true, spin: -360 },
    ],
  },
  // M11 Sword Bloom (1.1 s): the sword tossed up spinning, the open left paw snapped out (the
  // scars open), the catch over his head and the cut down
  bloom20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.06, h: [-0.12, 0.42, 0.22], b: [0.0, 0.3, 0.95], yaw: -6, pitch: 6, drop: 0.05, ear: 0.3 },
      { t: 0.13, h: [-0.08, 0.78, 0.18], b: [0.0, 0.95, 0.3], yaw: -4, pitch: -6, drop: 0.0, spin: 0 },
      { t: 0.19, h: [-0.14, 0.6, 0.12], b: [-0.2, 0.9, 0.2], yaw: 6, pitch: 4, drop: 0.07, spin: 0, lh: [0.2, 0.48, 0.16], ear: 0.6 },
      { t: 0.3, h: [-0.16, 0.62, 0.02], b: [-0.2, 0.9, 0.2], yaw: -6, pitch: 0, drop: 0.03, spin: 220, lift: 0.04, tuck: 0.02, lh: [0.3, 0.56, 0.02], ear: 0.9 },
      { t: 0.36, h: [-0.14, 0.58, 0.1], b: [-0.2, 0.9, 0.2], yaw: -18, pitch: 2, drop: 0.06, spin: 360, lift: 0, tuck: 0, lh: [0.18, 0.5, 0.12] },
      { t: 0.4, hit: 1, h: [-0.12, 0.6, 0.08], b: [-0.2, 0.9, 0.2], yaw: -24, pitch: 6, drop: 0.06, hz: 0.02, spin: 360, lh: [0.1, 0.6, 0.36], ear: 1, fl: [0.06, 0.02] },
      { t: 0.56, h: [-0.06, 0.84, 0.08], b: [0.0, 0.45, -0.9], yaw: -6, pitch: -8, drop: 0.02, spin: 360, lh: [0.12, 0.58, 0.3], ear: 0.4 },
      { t: 0.72, h: [-0.03, 0.9, 0.04], b: [0.0, 0.42, -0.9], yaw: 0, pitch: -12, drop: 0.0, spin: 360, lg: 0.4, ear: 0.6 },
      { t: 0.8, hit: 2, h: [-0.03, 0.44, 0.33], b: [0.0, -0.45, 0.9], pitch: 22, drop: 0.1, hz: 0.04, spin: 360, lg: 1, ear: 1, fl: [0.06, 0.02] },
      { t: 0.86, h: [-0.03, 0.36, 0.28], b: [0.05, -0.8, 0.6], pitch: 24, drop: 0.11, hz: 0.04, spin: 360, lg: 1 },
      { t: 1.0, h: [-0.03, 0.36, 0.28], b: [0.05, -0.78, 0.62], pitch: 23, drop: 0.11, hz: 0.04, spin: 360, lg: 0.8, ear: 0.3 },
      { t: 1.2, idle: true, spin: 360 },
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
  // M13 Lunge Strike (redrawn 18 Nov, 1.0 s): a skip back and the sword tossed once, caught level by
  // his cheek with the open paw sighting along it; the flat full-stretch thrust (a spear of light);
  // he leaves the floor and drills round the blade, three turns; a back somersault tears it out
  // (the star behind the foes); he lands where he began, low, blade swept out behind, tail high
  lunge20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.08, h: [-0.16, 0.6, 0.06], b: [0.1, 0.85, 0.5], yaw: -18, pitch: -2, drop: 0.04, hz: -0.06, lh: [0.16, 0.56, 0.2], fl: [0.06, -0.14], ear: 0.4 },
      { t: 0.2, h: [-0.1, 0.72, 0.12], b: [0.0, 0.02, 1.0], yaw: -28, pitch: 4, drop: 0.08, hz: -0.06, lh: [0.03, 0.71, 0.3], fl: [0.06, -0.14], ear: 0.7 },
      { t: 0.25, hit: 1, h: [-0.02, 0.45, 0.5], b: [0.0, -0.08, 1.0], yaw: 2, pitch: 40, drop: 0.14, hz: 0.12, lh: [0.22, 0.5, -0.2], fr: [-0.075, 0.36], ear: 1 },
      { t: 0.3, h: [-0.02, 0.45, 0.5], b: [0.0, -0.06, 1.0], yaw: 2, pitch: 40, flip: 30, lift: 0.12, drop: 0.1, hz: 0.12, tuck: 0.05, lh: [0.24, 0.48, -0.24], ear: 1 },
      { t: 0.6, h: [-0.02, 0.45, 0.5], b: [0.0, -0.06, 1.0], yaw: 2, pitch: 40, flip: 45, lift: 0.22, tumble: 1080, drop: 0.08, hz: 0.12, tuck: 0.08, lh: [0.24, 0.48, -0.24], ear: 1 },
      { t: 0.65, hit: 2, h: [-0.12, 0.62, 0.2], b: [0.0, 0.6, -0.8], yaw: -6, pitch: 0, flip: -40, lift: 0.4, tumble: 1080, drop: 0.02, tuck: 0.12, lh: [0.22, 0.6, 0.0], ear: 0.8 },
      { t: 0.76, h: [-0.16, 0.6, 0.0], b: [-0.3, 0.2, -0.93], yaw: -10, pitch: -4, flip: -220, lift: 0.45, tumble: 1080, tuck: 0.14, ear: 0.8 },
      { t: 0.86, h: [-0.22, 0.36, -0.1], b: [-0.55, -0.3, -0.78], yaw: -20, pitch: 16, flip: -360, lift: 0, tumble: 1080, drop: 0.13, tuck: 0, lh: [0.2, 0.52, 0.2], ear: 1 },
      { t: 1.0, h: [-0.22, 0.36, -0.1], b: [-0.55, -0.31, -0.78], yaw: -20, pitch: 15, flip: -360, tumble: 1080, drop: 0.13, lh: [0.2, 0.52, 0.2], ear: 0.6 },
      { t: 1.25, idle: true, flip: -360, tumble: 1080 },
    ],
    cues: [[0.03, 'toss', { secs: 0.15, h: 0.22, turns: 1 }]],
  },
  // Lunge Strike · Swift: the drill carries him through the pack; he lands in a skid
  lungeDrill20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.08, h: [-0.16, 0.6, 0.06], b: [0.1, 0.85, 0.5], yaw: -18, pitch: -2, drop: 0.04, hz: -0.06, lh: [0.16, 0.56, 0.2], fl: [0.06, -0.14], ear: 0.4 },
      { t: 0.2, h: [-0.1, 0.72, 0.12], b: [0.0, 0.02, 1.0], yaw: -28, pitch: 4, drop: 0.08, hz: -0.06, lh: [0.03, 0.71, 0.3], fl: [0.06, -0.14], ear: 0.7 },
      { t: 0.25, hit: 1, h: [-0.02, 0.45, 0.5], b: [0.0, -0.08, 1.0], yaw: 2, pitch: 40, drop: 0.14, hz: 0.12, lh: [0.22, 0.5, -0.2], fr: [-0.075, 0.36], ear: 1 },
      { t: 0.3, h: [-0.02, 0.45, 0.5], b: [0.0, -0.06, 1.0], yaw: 2, pitch: 40, flip: 50, lift: 0.14, drop: 0.08, hz: 0.12, tuck: 0.08, lh: [0.24, 0.48, -0.24], ear: 1 },
      { t: 0.6, h: [-0.02, 0.45, 0.5], b: [0.0, -0.06, 1.0], yaw: 2, pitch: 40, flip: 50, lift: 0.18, tumble: 1080, drop: 0.08, hz: 0.12, tuck: 0.1, lh: [0.24, 0.48, -0.24], ear: 1 },
      { t: 0.7, h: [-0.2, 0.36, 0.0], b: [-0.6, -0.3, -0.75], yaw: -20, pitch: 18, flip: 0, lift: 0, tumble: 1080, drop: 0.14, hz: 0.02, tuck: 0, fl: [0.1, -0.1], fr: [-0.1, 0.2], lh: [0.2, 0.42, 0.25], ear: 1 },
      { t: 0.95, h: [-0.2, 0.36, 0.0], b: [-0.6, -0.31, -0.75], yaw: -20, pitch: 16, tumble: 1080, drop: 0.13, fl: [0.1, -0.1], fr: [-0.1, 0.2], ear: 0.6 },
      { t: 1.2, idle: true, tumble: 1080 },
    ],
    cues: [[0.03, 'toss', { secs: 0.15, h: 0.22, turns: 1 }]],
  },
  // Lunge Strike · Crescent: he holds the full-stretch thrust while the spear flies, then spins the sword once
  lungeStay20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.08, h: [-0.16, 0.6, 0.06], b: [0.1, 0.85, 0.5], yaw: -18, pitch: -2, drop: 0.04, hz: -0.06, lh: [0.16, 0.56, 0.2], fl: [0.06, -0.14], ear: 0.4 },
      { t: 0.2, h: [-0.1, 0.72, 0.12], b: [0.0, 0.02, 1.0], yaw: -28, pitch: 4, drop: 0.08, hz: -0.06, lh: [0.03, 0.71, 0.3], fl: [0.06, -0.14], ear: 0.7 },
      { t: 0.25, hit: 1, h: [-0.02, 0.45, 0.5], b: [0.0, -0.08, 1.0], yaw: 2, pitch: 40, drop: 0.14, hz: 0.12, lh: [0.22, 0.5, -0.2], fr: [-0.075, 0.36], ear: 1 },
      { t: 0.55, h: [-0.02, 0.46, 0.5], b: [0.0, -0.06, 1.0], yaw: 2, pitch: 38, drop: 0.13, hz: 0.12, lh: [0.22, 0.5, -0.2], fr: [-0.075, 0.36], ear: 0.8 },
      { t: 0.7, h: [-0.08, 0.55, 0.36], b: [0.9, 0.1, 0.4], yaw: 0, pitch: 22, drop: 0.1, hz: 0.08, fr: [-0.075, 0.3], ear: 0.6 },
      { t: 0.8, h: [-0.1, 0.56, 0.34], b: [-0.1, 0.2, 0.97], yaw: -4, pitch: 20, drop: 0.1, hz: 0.08, fr: [-0.075, 0.3], ear: 0.4 },
      { t: 1.1, idle: true },
    ],
    cues: [[0.03, 'toss', { secs: 0.15, h: 0.22, turns: 1 }]],
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
      { t: 0.78, h: [0.02, 0.8, 0.2], b: [-0.1, 0.9, 0.4], yaw: 8, pitch: -8, drop: 0.02, hz: 0.03, lh: [0.24, 0.52, 0.0] },
      { t: 0.86, via: [-0.6, 0.3, 0.75], h: [-0.26, 0.42, 0.16], b: [-0.8, -0.5, 0.3], yaw: -14, pitch: 8, roll: -3, hx: -0.012, drop: 0.08, hz: 0.02, lh: [0.2, 0.54, 0.16], ear: 0.8 },
      { t: 0.92, h: [-0.27, 0.41, 0.15], b: [-0.78, -0.55, 0.28], yaw: -16, pitch: 10, roll: -2, drop: 0.095, hz: 0.02 },
      { t: 1.02, h: [-0.26, 0.42, 0.15], b: [-0.78, -0.54, 0.3], yaw: -14, pitch: 8, roll: 0, hx: 0, drop: 0.085, hz: 0.01, ear: 0.3 },
      { t: 1.25, idle: true },
    ],
  },
  // Rift Cut · Swift (redrawn, Kesh 18 Nov 20:32 SGT): he rides the rift. The reverse-grip stab;
  // the blade ripped out low to his right; three blinks across the rift in a Z (forehand, backhand,
  // forehand, banked into each); a crouch, a front flip off the last crossing, the sword turned point
  // down in both paws, plunged into the rift's end; he holds it there while the rift erupts.
  riftRide: {
    keys: [
      { t: 0, idle: true },
      { t: 0.1, h: [-0.08, 0.76, 0.2], b: [0.0, -0.3, 0.95], yaw: -6, pitch: -6, lh: [0.04, 0.72, 0.22], lg: 0.7, fl: [0.05, -0.05], ear: 0.4 },
      { t: 0.2, hit: 1, h: [-0.05, 0.3, 0.3], b: [0.0, -0.96, 0.25], yaw: 0, pitch: 32, drop: 0.14, hz: 0.03, lg: 1, fr: [-0.075, 0.22], fl: [0.085, -0.15], ear: 1 },
      { t: 0.3, h: [-0.22, 0.42, 0.1], b: [-0.85, -0.35, 0.4], yaw: -24, pitch: 16, drop: 0.1, hz: 0.01, lg: 0, lh: [0.22, 0.48, 0.1], ear: 0.7 },
      { t: 0.42, hit: 2, h: [0.18, 0.52, 0.28], b: [0.8, -0.1, 0.55], yaw: 28, pitch: 10, roll: 6, hx: 0.014, drop: 0.08, lh: [0.24, 0.54, -0.08], fl: [0.1, -0.02], fr: [-0.05, 0.06], ear: 1 },
      { t: 0.5, h: [0.2, 0.6, 0.1], b: [0.9, 0.3, -0.2], yaw: 34, pitch: 4, roll: 3, hx: 0.01, drop: 0.06, ear: 0.6 },
      { t: 0.58, hit: 3, via: [0.0, 0.3, 0.95], h: [-0.18, 0.5, 0.28], b: [-0.8, -0.1, 0.55], yaw: -28, pitch: 10, roll: -6, hx: -0.014, drop: 0.08, lh: [0.2, 0.48, 0.16], fl: [0.05, -0.1], fr: [-0.1, 0.08], ear: 1 },
      { t: 0.66, h: [-0.22, 0.58, 0.08], b: [-0.9, 0.3, -0.2], yaw: -34, pitch: 4, roll: -3, hx: -0.01, drop: 0.06, ear: 0.6 },
      { t: 0.74, hit: 4, via: [0.0, 0.3, 0.95], h: [0.18, 0.52, 0.28], b: [0.8, -0.1, 0.55], yaw: 28, pitch: 10, roll: 6, hx: 0.014, drop: 0.08, lh: [0.24, 0.54, -0.08], fl: [0.1, -0.02], fr: [-0.05, 0.06], ear: 1 },
      { t: 0.82, h: [-0.04, 0.42, 0.2], b: [0.3, -0.4, 0.85], yaw: 6, pitch: 20, roll: 0, hx: 0, drop: 0.16, tuck: 0, lh: [0.2, 0.44, 0.14], fl: [0.07, -0.08], fr: [-0.08, 0.1], ear: 0.8 },
      { t: 0.9, via: [0.15, 0.95, 0.2], h: [-0.05, 0.86, 0.1], b: [0.0, 0.55, -0.8], yaw: 0, pitch: -8, drop: 0.0, lift: 0.25, flip: 60, tuck: 0.08, lg: 0.6, ear: 1 },
      { t: 1.02, h: [-0.04, 0.9, 0.05], b: [0.0, 0.3, -0.95], pitch: -10, lift: 0.7, flip: 250, tuck: 0.12, lg: 1, ear: 1 },
      { t: 1.12, via: [0.0, 0.98, 0.1], h: [-0.03, 0.78, 0.3], b: [0.0, -0.7, 0.7], pitch: 10, lift: 0.35, flip: 360, tuck: 0.04, lg: 1, ear: 1 },
      { t: 1.16, hit: 5, h: [-0.03, 0.3, 0.32], b: [0.0, -0.97, 0.22], pitch: 32, drop: 0.16, hz: 0.04, lift: 0, flip: 360, tuck: 0, lg: 1, fl: [0.1, -0.12], fr: [-0.1, 0.18], ear: 1 },
      { t: 1.22, h: [-0.03, 0.29, 0.32], b: [0.0, -0.97, 0.22], pitch: 34, drop: 0.185, hz: 0.04, flip: 360, lg: 1 },
      { t: 1.4, h: [-0.03, 0.31, 0.31], b: [0.02, -0.96, 0.25], pitch: 30, drop: 0.15, hz: 0.035, flip: 360, lg: 1, ear: 0.4 },
      { t: 1.6, idle: true, flip: 360 },
    ],
  },
  // M15 Caltrops (0.8 s): a spin on one foot with the blade low, then a cut across the floor
  // M15 Sword Grove (new 18 Nov, the plant 1.0 s): the sword flipped up spinning over his head, a flat
  // twist in the air under it; the open paw sweeps down (the six fly out and plant); he lands on one
  // knee and catches his sword behind his back
  grove20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.08, h: [-0.12, 0.8, 0.12], b: [0.0, 0.95, 0.3], yaw: -8, pitch: -6, drop: 0.04, lh: [0.18, 0.6, 0.1], ear: 0.4 },
      { t: 0.2, h: [-0.2, 0.62, 0.04], b: [0.0, 0.95, 0.3], yaw: -14, pitch: -4, lift: 0.22, spin: -200, tuck: 0.1, lh: [0.24, 0.8, 0.1], ear: 0.8 },
      { t: 0.35, hit: 1, h: [-0.2, 0.6, 0.04], b: [0.0, 0.95, 0.3], yaw: 6, pitch: 14, lift: 0.3, spin: -360, tuck: 0.12, lh: [0.16, 0.36, 0.44], ear: 1 },
      { t: 0.55, h: [-0.16, 0.42, -0.16], b: [0.2, -0.9, -0.3], yaw: 8, pitch: 18, lift: 0.0, spin: -360, drop: 0.18, hz: 0.02, fl: [0.07, 0.12], fr: [-0.08, -0.16], lh: [0.2, 0.42, 0.32], ear: 0.8 },
      { t: 0.85, h: [-0.16, 0.42, -0.16], b: [0.2, -0.9, -0.31], yaw: 8, pitch: 16, spin: -360, drop: 0.17, hz: 0.02, fl: [0.07, 0.12], fr: [-0.08, -0.16], lh: [0.2, 0.44, 0.34], ear: 0.5 },
      { t: 1.1, idle: true, spin: -360 },
    ],
    cues: [[0.06, 'toss', { secs: 0.5, h: 0.7, turns: 3 }]],
  },
  // the call (0.3 s): the open paw snaps into a fist and pulls to his chest
  groveCall20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.06, h: [-0.18, 0.5, 0.1], b: [-0.2, 0.4, 0.9], yaw: 10, pitch: 4, drop: 0.04, lh: [0.18, 0.64, 0.46], ear: 0.5 },
      { t: 0.18, h: [-0.18, 0.5, 0.1], b: [-0.2, 0.4, 0.9], yaw: -6, pitch: -4, drop: 0.06, lh: [0.07, 0.6, 0.14], ear: 1 },
      { t: 0.36, h: [-0.16, 0.52, 0.16], b: [0.0, 0.5, 0.86], yaw: -4, pitch: 0, drop: 0.05, lh: [0.08, 0.58, 0.16], ear: 0.6 },
      { t: 0.6, idle: true },
    ],
  },
  // M16 Riposte: the guard (0.6 s), the answer on a catch (a slow frame, then a full turn with a
  // backhand cut drawing a full moon, and a flick), and the guard lowered when nothing comes
  riposteGuard20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.08, h: [-0.04, 0.6, 0.27], b: [0.05, 0.98, 0.15], yaw: -10, pitch: 2, drop: 0.06, lh: [0.24, 0.5, -0.14], ear: 0.6 },
      { t: 0.2, h: [-0.03, 0.59, 0.28], b: [0.15, 0.95, 0.25], yaw: -14, pitch: 4, roll: -1, drop: 0.09, lh: [0.27, 0.55, 0.08], ear: 0.3 },
      { t: 0.34, h: [-0.05, 0.6, 0.26], b: [-0.05, 0.98, 0.12], yaw: -8, pitch: 3, roll: 1, hx: -0.01, drop: 0.08, lh: [0.24, 0.52, -0.08], ear: 0.2 },
      { t: 0.48, h: [-0.04, 0.6, 0.27], b: [0.1, 0.97, 0.2], yaw: -12, pitch: 3, roll: 0, hx: 0, drop: 0.075, lh: [0.25, 0.5, -0.12], ear: 0.5 },
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
      { t: 0.06, h: [-0.06, 0.66, 0.24], b: [0.0, 0.95, 0.3], yaw: -6, pitch: -2, drop: 0.02, lh: [0.1, 0.6, 0.26], ear: 0.4 },
      { t: 0.100, h: [-0.040, 0.720, 0.32], b: [0.000, 0.552, 0.834], yaw: 0.000, pitch: 1.000, roll: 0.000, hx: 0.000, drop: 0.035, lh: [0.160, 0.56, 0.24], ear: 0.5 },
      { t: 0.145, h: [-0.135, 0.651, 0.32], b: [-0.525, 0.171, 0.834], yaw: -9.511, pitch: 3.073, roll: -2.853, hx: -0.011, drop: 0.035, lh: [0.131, 0.56, 0.24], ear: 0.5 },
      { t: 0.190, h: [-0.099, 0.539, 0.32], b: [-0.325, -0.447, 0.834], yaw: -5.878, pitch: 6.427, roll: -1.763, hx: -0.007, drop: 0.035, lh: [0.142, 0.56, 0.24], ear: 0.5 },
      { t: 0.235, h: [0.019, 0.539, 0.32], b: [0.325, -0.447, 0.834], yaw: 5.878, pitch: 6.427, roll: 1.763, hx: 0.007, drop: 0.035, lh: [0.178, 0.56, 0.24], ear: 0.5 },
      { t: 0.280, h: [0.055, 0.651, 0.32], b: [0.525, 0.171, 0.834], yaw: 9.511, pitch: 3.073, roll: 2.853, hx: 0.011, drop: 0.035, lh: [0.189, 0.56, 0.24], ear: 0.5 },
      { t: 0.325, h: [-0.040, 0.720, 0.32], b: [0.000, 0.552, 0.834], yaw: 0.000, pitch: 1.000, roll: 0.000, hx: 0.000, drop: 0.035, lh: [0.160, 0.56, 0.24], ear: 0.5 },
      { t: 0.36, h: [-0.12, 0.52, 0.14], b: [-0.2, 0.4, 0.9], yaw: 14, pitch: 8, roll: 2, hx: 0.01, drop: 0.06, hz: 0.03, lh: [0.06, 0.6, 0.46], fl: [0.06, 0.04], ear: 1 },
      { t: 0.44, h: [-0.08, 0.58, 0.26], b: [0.05, 0.6, 0.8], yaw: 4, pitch: -8, roll: 0, hx: 0, drop: 0.02, hz: -0.04, lift: 0.06, lh: [0.24, 0.5, 0.0], ear: 0.8 },
      { t: 0.5, h: [-0.05, 0.56, 0.28], b: [0.05, 0.5, 0.86], yaw: -4, pitch: 6, drop: 0.1, hz: -0.02, lift: 0, lh: [0.22, 0.5, -0.1], fl: [0.07, -0.16], fr: [-0.08, 0.18], ear: 0.6 },
      { t: 0.58, drop: 0.05, pitch: 2, hz: -0.01 },
      { t: 0.78, idle: true },
    ],
  },

  // M20 Fox Step, redrawn (Kesh 18 Nov 20:32 SGT): three fox steps. A coil low with the blade back
  // under his right hip; step one lands on the left foot with a rising forehand cut, banked into the
  // step; step two snaps across onto the right foot with a backhand; then he drops, launches a low
  // corkscrew (a full roll along his path, legs tucked), lands in a skid on one knee with the blade
  // swept out behind and the left paw on the floor, rebounds and rises.
  foxstep20: {
    keys: [
      { t: 0, idle: true },
      { t: 0.04, h: [-0.2, 0.42, 0.0], b: [-0.7, -0.35, 0.3], yaw: -24, pitch: 14, roll: -2, hx: -0.01, drop: 0.1, lh: [0.2, 0.46, 0.18], fl: [0.07, -0.12], fr: [-0.07, 0.1], ear: 0.7 },
      { t: 0.1, hit: 1, h: [0.14, 0.6, 0.3], b: [0.75, 0.5, 0.4], yaw: 24, pitch: 6, roll: 6, hx: 0.014, drop: 0.06, spin: 20, lh: [0.26, 0.56, -0.08], fl: [0.09, 0.02], fr: [-0.06, 0.06], ear: 1 },
      { t: 0.16, h: [0.16, 0.72, 0.12], b: [0.6, 0.75, -0.25], yaw: 28, pitch: -2, roll: 4, hx: 0.01, drop: 0.04, spin: 20, ear: 0.6 },
      { t: 0.22, hit: 2, via: [0.0, 0.4, 0.92], h: [-0.18, 0.5, 0.3], b: [-0.8, -0.25, 0.5], yaw: -26, pitch: 10, roll: -6, hx: -0.014, drop: 0.07, spin: -20, lh: [0.22, 0.48, 0.14], fl: [0.05, -0.08], fr: [-0.1, 0.1], ear: 1 },
      { t: 0.3, h: [-0.24, 0.44, 0.1], b: [-0.9, 0.1, 0.4], yaw: -14, pitch: 18, roll: 0, hx: 0, drop: 0.11, spin: 0, lh: [0.2, 0.46, -0.1], fl: [0.06, -0.1], fr: [-0.08, 0.14], ear: 0.8 },
      { t: 0.38, h: [-0.25, 0.46, 0.12], b: [-0.9, 0.1, 0.4], yaw: -14, pitch: 20, flip: 18, tumble: 0, lift: 0.05, tuck: 0.05, drop: 0.08 },
      { t: 0.47, hit: 3, h: [-0.25, 0.46, 0.12], b: [-0.9, 0.1, 0.4], yaw: -14, pitch: 20, flip: 22, tumble: 200, lift: 0.16, tuck: 0.08, drop: 0.06, ear: 1 },
      { t: 0.56, h: [-0.25, 0.42, -0.1], b: [-0.4, -0.2, -0.9], yaw: -20, pitch: 12, flip: 0, tumble: 360, lift: 0, tuck: 0, drop: 0.15, hz: 0.02, fl: [0.05, -0.26], fr: [-0.075, 0.2], lh: [0.2, 0.34, 0.22], ear: 0.7 },
      { t: 0.63, h: [-0.25, 0.41, -0.11], b: [-0.4, -0.21, -0.9], yaw: -20, pitch: 15, tumble: 360, drop: 0.175, hz: 0.02, lh: [0.2, 0.33, 0.23], ear: 0.6 },
      { t: 0.85, h: [-0.25, 0.42, -0.11], b: [-0.4, -0.2, -0.9], yaw: -20, pitch: 11, tumble: 360, drop: 0.15, hz: 0.01, fl: [0.05, -0.28], fr: [-0.08, 0.23], lh: [0.2, 0.38, 0.22], ear: 0.3 },
      { t: 1.1, idle: true, tumble: 360, via: [-0.95, 0.15, 0.2] },
    ],
  },
  // Fox Step · Crescent (redrawn): he stays. The sword up over his right shoulder, a side step left and
  // a cut down across (one 剑气); the sword up over his left, a step right and the crossing cut (the
  // other); then a turn on the spot and a rising cut out of it (the spiral), held high.
  foxstepC: {
    keys: [
      { t: 0, idle: true },
      { t: 0.05, h: [-0.16, 0.74, 0.12], b: [-0.5, 0.75, 0.3], yaw: -18, pitch: -4, roll: -2, drop: 0.04, lh: [0.18, 0.54, 0.16], ear: 0.5 },
      { t: 0.12, hit: 1, h: [0.12, 0.42, 0.3], b: [0.65, -0.5, 0.55], yaw: 20, pitch: 12, roll: 5, hx: 0.02, drop: 0.09, fl: [0.12, -0.06], lh: [0.24, 0.5, -0.04], ear: 1 },
      { t: 0.19, via: [0.2, 0.3, 0.95], h: [0.14, 0.74, 0.12], b: [0.5, 0.75, 0.3], yaw: 18, pitch: -2, roll: 2, hx: 0.01, drop: 0.05, fl: [0.07, -0.09], fr: [-0.12, 0.08], ear: 0.6 },
      { t: 0.26, hit: 2, h: [-0.14, 0.42, 0.3], b: [-0.65, -0.5, 0.55], yaw: -20, pitch: 12, roll: -5, hx: -0.02, drop: 0.09, lh: [0.22, 0.48, 0.16], ear: 1 },
      { t: 0.34, h: [-0.25, 0.46, 0.06], b: [-0.95, -0.05, 0.2], yaw: -30, pitch: 8, roll: -2, hx: 0, drop: 0.1, spin: 0, fl: [0.07, -0.1], fr: [-0.08, 0.12], lh: [0.22, 0.5, 0.12], ear: 0.7 },
      { t: 0.44, h: [-0.27, 0.5, 0.06], b: [-0.96, 0.0, 0.2], yaw: -18, pitch: 4, roll: 0, drop: 0.05, spin: 200, lift: 0.08, tuck: 0.04, lh: [0.28, 0.58, 0.0] },
      { t: 0.52, hit: 3, h: [0.0, 0.62, 0.36], b: [0.1, 0.45, 0.9], yaw: 2, pitch: 6, drop: 0.05, spin: 360, lift: 0, tuck: 0, fr: [-0.075, 0.24], lh: [0.24, 0.48, -0.12], ear: 1 },
      { t: 0.6, h: [0.06, 0.86, 0.14], b: [0.2, 0.95, -0.1], yaw: 12, pitch: -10, drop: 0.0, spin: 360, ear: 0.7 },
      { t: 0.66, h: [0.0, 0.8, 0.2], b: [-0.1, 0.9, 0.4], yaw: 6, pitch: -6, drop: 0.03, spin: 360, lh: [0.2, 0.58, 0.3] },
      { t: 0.74, via: [-0.6, 0.3, 0.75], h: [-0.26, 0.42, 0.16], b: [-0.8, -0.5, 0.3], yaw: -16, pitch: 8, roll: -3, hx: -0.012, drop: 0.08, spin: 360, lh: [0.16, 0.62, 0.42], ear: 1 },
      { t: 0.8, h: [-0.27, 0.41, 0.15], b: [-0.78, -0.55, 0.28], yaw: -18, pitch: 10, roll: -2, drop: 0.095, spin: 360, lh: [0.17, 0.61, 0.41] },
      { t: 0.92, h: [-0.26, 0.42, 0.15], b: [-0.78, -0.54, 0.3], yaw: -16, pitch: 8, roll: 0, hx: 0, drop: 0.085, spin: 360, lh: [0.2, 0.52, 0.2], ear: 0.3 },
      { t: 1.15, idle: true, spin: 360 },
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
      { t: 0.06, h: [-0.16, 0.56, 0.22], b: [-0.2, 0.95, 0.2], yaw: -16, pitch: 2, lh: [0.2, 0.5, 0.18], ear: 0.3 },
      { t: 0.12, h: [-0.16, 0.56, 0.24], b: [-0.15, 0.0, 1.0], yaw: -19, pitch: 4 },
      { t: 0.18, h: [-0.18, 0.52, 0.22], b: [-0.2, -0.92, 0.35], yaw: -22, pitch: 6 },
      { t: 0.24, h: [-0.2, 0.54, 0.14], b: [-0.3, -0.2, -0.93], yaw: -29, pitch: 4 },
      { t: 0.3, h: [0.08, 0.58, 0.22], b: [0.2, 0.95, 0.2], yaw: 16, pitch: 2 },
      { t: 0.36, h: [0.1, 0.56, 0.24], b: [0.15, 0.0, 1.0], yaw: 22, pitch: 4 },
      { t: 0.42, h: [0.1, 0.52, 0.22], b: [0.2, -0.92, 0.35], yaw: 26, pitch: 6 },
      { t: 0.47, h: [0.08, 0.54, 0.14], b: [0.3, -0.2, -0.93], yaw: 22, pitch: 4 },
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

  // Kesh 18 Nov 14:54, the Crescent basic attack as a charge shot (his sketch: stand, crouch into the
  // charge, cut down or up and the 剑气 flies; his charging pose: wide low stance, the sword drawn
  // back over the right shoulder, the open left paw out at the target). Shots alternate down and up.
  // D: the high charge, sword over the shoulder, released in a diagonal down cut
  shotHoldD: {
    keys: [
      { t: 0, idle: true },
      { t: 0.1, h: [-0.2, 0.62, 0.04], b: [0.3, 0.6, -0.4], yaw: -14, pitch: 2, drop: 0.06, lh: [0.18, 0.52, 0.22], fl: [0.09, 0.06], ear: 0.4 },
      { t: 0.22, h: [-0.2, 0.8, -0.06], b: [0.8, 0.3, -0.52], yaw: -28, pitch: -3, drop: 0.1, hz: -0.01, lh: [0.18, 0.6, 0.42], fl: [0.12, 0.14], fr: [-0.11, -0.1], ear: 0.7 },
      { t: 0.7, h: [-0.2, 0.82, -0.08], b: [0.8, 0.32, -0.5], yaw: -30, pitch: -4, drop: 0.115, hz: -0.01, lh: [0.18, 0.61, 0.44], fl: [0.12, 0.14], fr: [-0.11, -0.1], ear: 0.8 },
      { t: 1.2, h: [-0.21, 0.83, -0.09], b: [0.82, 0.32, -0.47], yaw: -33, pitch: -5, drop: 0.125, hz: -0.015, lh: [0.18, 0.62, 0.46], fl: [0.12, 0.14], fr: [-0.11, -0.1], ear: 1 },
      { t: 3.0, h: [-0.21, 0.83, -0.09], b: [0.82, 0.32, -0.47], yaw: -33, pitch: -5, drop: 0.125, hz: -0.015, lh: [0.18, 0.62, 0.46], fl: [0.12, 0.14], fr: [-0.11, -0.1], ear: 1 },
    ],
  },
  shotFireD: {
    keys: [
      { t: 0, h: [-0.21, 0.83, -0.08], b: [0.81, 0.32, -0.48], yaw: -31, pitch: -4, drop: 0.12, hz: -0.01, lh: [0.18, 0.61, 0.44], fl: [0.12, 0.14], fr: [-0.11, -0.1], ear: 0.9 },
      { t: 0.05, h: [-0.18, 0.86, 0.02], b: [0.45, 0.75, -0.45], yaw: -24, pitch: -6, drop: 0.11, lh: [0.2, 0.58, 0.36], fl: [0.12, 0.14], fr: [-0.11, -0.1], ear: 1 },
      { t: 0.12, hit: 1, h: [-0.04, 0.6, 0.36], b: [0.2, -0.1, 0.97], yaw: 0, pitch: 10, drop: 0.09, hz: 0.04, lh: [0.08, 0.62, 0.46], fl: [0.12, 0.16], fr: [-0.11, -0.1], ear: 1 },
      { t: 0.2, h: [0.16, 0.38, 0.22], b: [0.75, -0.55, 0.35], yaw: 22, pitch: 14, drop: 0.1, hz: 0.04, lh: [0.22, 0.52, 0.12], fl: [0.12, 0.16], fr: [-0.11, -0.1], ear: 0.7 },
      { t: 0.36, h: [0.16, 0.38, 0.21], b: [0.75, -0.56, 0.34], yaw: 22, pitch: 13, drop: 0.1, hz: 0.04, lh: [0.22, 0.52, 0.12], fl: [0.12, 0.16], fr: [-0.11, -0.1], ear: 0.4 },
      { t: 0.62, idle: true },
    ],
  },
  // U: the low charge, the point trailing on the floor behind him, released in a rising cut
  shotHoldU: {
    keys: [
      { t: 0, idle: true },
      { t: 0.1, h: [-0.2, 0.4, 0.04], b: [-0.3, -0.45, -0.6], yaw: -16, pitch: 12, drop: 0.08, lh: [0.18, 0.48, 0.24], fl: [0.09, 0.06], ear: 0.4 },
      { t: 0.22, h: [-0.21, 0.33, -0.04], b: [-0.35, -0.5, -0.8], yaw: -26, pitch: 22, drop: 0.13, hz: 0.03, lh: [0.17, 0.5, 0.4], fl: [0.12, 0.14], fr: [-0.1, -0.1], ear: 0.7 },
      { t: 0.7, h: [-0.21, 0.32, -0.05], b: [-0.33, -0.52, -0.8], yaw: -28, pitch: 24, drop: 0.14, hz: 0.035, lh: [0.17, 0.51, 0.42], fl: [0.12, 0.14], fr: [-0.1, -0.1], ear: 0.8 },
      { t: 1.2, h: [-0.22, 0.31, -0.06], b: [-0.3, -0.53, -0.8], yaw: -31, pitch: 26, drop: 0.15, hz: 0.04, lh: [0.17, 0.52, 0.44], fl: [0.12, 0.14], fr: [-0.1, -0.1], ear: 1 },
      { t: 3.0, h: [-0.22, 0.31, -0.06], b: [-0.3, -0.53, -0.8], yaw: -31, pitch: 26, drop: 0.15, hz: 0.04, lh: [0.17, 0.52, 0.44], fl: [0.12, 0.14], fr: [-0.1, -0.1], ear: 1 },
    ],
  },
  shotFireU: {
    keys: [
      { t: 0, h: [-0.22, 0.32, -0.05], b: [-0.32, -0.52, -0.8], yaw: -29, pitch: 25, drop: 0.14, hz: 0.035, lh: [0.17, 0.51, 0.43], fl: [0.12, 0.14], fr: [-0.1, -0.1], ear: 0.9 },
      { t: 0.12, hit: 1, h: [-0.04, 0.62, 0.34], b: [0.05, 0.6, 0.8], yaw: 0, pitch: -6, drop: 0.04, hz: 0.04, lh: [0.08, 0.62, 0.46], fl: [0.12, 0.16], fr: [-0.1, -0.1], ear: 1 },
      { t: 0.22, h: [0.1, 0.86, 0.12], b: [0.4, 0.9, -0.1], yaw: 16, pitch: -12, drop: 0.0, hz: 0.03, lh: [0.22, 0.56, 0.1], fl: [0.12, 0.16], fr: [-0.1, -0.1], ear: 0.7 },
      { t: 0.36, h: [0.1, 0.85, 0.11], b: [0.4, 0.9, -0.12], yaw: 16, pitch: -11, drop: 0.01, hz: 0.03, lh: [0.22, 0.54, 0.1], fl: [0.12, 0.16], fr: [-0.1, -0.1], ear: 0.4 },
      { t: 0.62, idle: true },
    ],
  },
};
// Flurry · Crescent (Kesh 18 Nov 15:36): the same four cuts, drawn with no strokes (its own clip name)
SKILL20_DEFS.flurryQi20 = { keys: SKILL20_DEFS.flurry20.keys };

// ---- the four video skills on the full body (motion audit, 18 Nov) ----
// They were arm and trunk only (30 samples a second, a stop at every key, feet, left paw, ears and
// tail on idle, the trunk twisting up to 68 degrees over still hips). Same choreography, now keyed
// like the rest: steps, hips, both paws, the leaps and the spin in the clip itself.
// Radiant Cascade (2.1 s): sweep, back sweep, overhead slam, drawn back low while the swirl turns,
// then the dash cut
SKILL20_DEFS.cascade = {
  keys: [
    { t: 0, idle: true },
    { t: 0.04, h: [-0.14, 0.47, 0.1], b: [0.2, 0.6, 0.75], yaw: 8, drop: 0.02, ear: 0.2 },
    { t: 0.1, h: [-0.26, 0.6, -0.04], b: [-0.5, 0.15, -0.85], yaw: -45, pitch: -2, roll: -3, hz: -0.015, drop: 0.03, fl: [0.085, -0.1], lh: [0.15, 0.52, 0.22], ear: 0.5 },
    { t: 0.2, hit: 1, h: [0.06, 0.52, 0.3], b: [0.35, 0.0, 0.94], yaw: 10, pitch: 8, roll: 1, hz: 0.03, drop: 0.045, fr: [-0.075, 0.21], lh: [0.22, 0.46, 0.02], ear: 1 },
    { t: 0.28, h: [0.2, 0.52, 0.14], b: [0.95, 0.05, -0.2], yaw: 42, pitch: 6, roll: 3, hx: 0.01, hz: 0.03, drop: 0.04, lh: [0.24, 0.46, -0.1], ear: 0.5 },
    { t: 0.36, h: [0.2, 0.6, 0.12], b: [0.9, 0.2, 0.1], yaw: 40, pitch: 2, roll: 2, hx: 0.008, hz: 0.02, drop: 0.03, fl: [0.07, 0.0], ear: 0.4 },
    { t: 0.46, hit: 2, h: [-0.04, 0.55, 0.32], b: [-0.3, 0.05, 0.95], yaw: 0, pitch: 8, roll: 0, hx: 0, hz: 0.04, drop: 0.05, lh: [0.2, 0.5, 0.16], ear: 1 },
    { t: 0.54, h: [-0.26, 0.56, 0.0], b: [-0.95, 0.1, -0.2], yaw: -40, pitch: 5, roll: -3, hx: -0.008, hz: 0.03, drop: 0.045, lh: [0.15, 0.5, 0.24], ear: 0.5 },
    { t: 0.63, h: [-0.16, 0.74, -0.02], b: [-0.4, 0.7, -0.6], yaw: -18, pitch: -6, roll: -1, hx: 0, hz: 0.0, drop: 0.02, lg: 0.5, ear: 0.4 },
    { t: 0.72, h: [-0.02, 0.88, 0.02], b: [0.0, 0.45, -0.9], yaw: 0, pitch: -12, roll: 0, hz: -0.02, drop: -0.008, lg: 1, fl: [0.07, -0.02], ear: 0.6 },
    { t: 0.8, h: [-0.02, 0.62, 0.3], b: [0.0, 0.6, 0.8], pitch: 6, hz: 0.02, drop: 0.03, lg: 1 },
    { t: 0.86, hit: 3, h: [-0.02, 0.36, 0.3], b: [0.0, -0.85, 0.5], pitch: 24, hz: 0.05, drop: 0.1, lg: 1, fr: [-0.075, 0.26], ear: 1 },
    { t: 0.93, h: [-0.02, 0.39, 0.3], b: [0.03, -0.8, 0.55], pitch: 21, hz: 0.045, drop: 0.085, lg: 1, ear: 0.6 },
    { t: 1.0, h: [-0.02, 0.36, 0.28], b: [0.05, -0.85, 0.5], pitch: 22, hz: 0.045, drop: 0.09, lg: 0.6, ear: 0.4 },
    { t: 1.2, h: [-0.22, 0.42, -0.1], b: [-0.4, -0.3, -0.85], yaw: -30, pitch: 6, roll: -2, hz: -0.03, drop: 0.07, lg: 0, lh: [0.14, 0.5, 0.3], fl: [0.06, 0.06], fr: [-0.08, -0.06], ear: 0.5 },
    { t: 1.38, h: [-0.225, 0.43, -0.115], b: [-0.4, -0.28, -0.86], yaw: -31, pitch: 7, roll: -2, hz: -0.034, drop: 0.075, lh: [0.13, 0.54, 0.33], ear: 0.6 },
    { t: 1.55, h: [-0.23, 0.4, -0.13], b: [-0.4, -0.32, -0.86], yaw: -34, pitch: 10, roll: -3, hz: -0.045, drop: 0.1, lh: [0.12, 0.56, 0.34], ear: 0.8 },
    { t: 1.66, hit: 4, h: [0.05, 0.5, 0.35], b: [0.6, 0.0, 0.8], yaw: 30, pitch: 18, roll: 2, hz: 0.06, drop: 0.07, fr: [-0.075, 0.28], fl: [0.05, -0.14], lh: [0.2, 0.46, -0.16], ear: 1 },
    { t: 1.8, h: [0.22, 0.5, 0.1], b: [0.95, 0.0, -0.2], yaw: 40, pitch: 12, roll: 3, hz: 0.05, drop: 0.06, ear: 0.6 },
    { t: 1.9, h: [0.23, 0.48, 0.08], b: [0.95, -0.05, -0.22], yaw: 40, pitch: 11, roll: 3, hz: 0.04, drop: 0.065, lh: [0.22, 0.48, -0.12], ear: 0.3 },
    { t: 2.1, idle: true },
  ],
};
// Skyblade Waltz (3.2 s): a low skim cut, a flat cut, the flash dash, a full spin (the ring), the
// sword raised while the blades rise, a rising cut off the floor, the point held on the spot
SKILL20_DEFS.waltz = {
  keys: [
    { t: 0, idle: true },
    { t: 0.06, h: [-0.2, 0.45, 0.0], b: [-0.6, -0.3, -0.7], yaw: -35, pitch: 6, hz: -0.02, drop: 0.07, fl: [0.08, -0.1], lh: [0.16, 0.5, 0.24], ear: 0.5 },
    { t: 0.15, hit: 1, h: [0.0, 0.32, 0.34], b: [0.2, -0.6, 0.8], yaw: 4, pitch: 25, hz: 0.04, drop: 0.11, fr: [-0.075, 0.24], lh: [0.22, 0.44, 0.0], ear: 1 },
    { t: 0.25, h: [0.2, 0.35, 0.15], b: [0.9, -0.3, -0.2], yaw: 35, pitch: 18, roll: 3, hz: 0.035, drop: 0.09, lh: [0.24, 0.44, -0.12], ear: 0.5 },
    { t: 0.42, h: [0.2, 0.6, 0.1], b: [0.95, 0.2, -0.1], yaw: 45, pitch: 2, roll: 2, hz: 0.01, drop: 0.03, fl: [0.07, 0.02], ear: 0.4 },
    { t: 0.55, hit: 2, h: [-0.04, 0.55, 0.34], b: [-0.3, 0.05, 0.95], yaw: 0, pitch: 8, roll: 0, hz: 0.04, drop: 0.05, lh: [0.2, 0.5, 0.14], ear: 1 },
    { t: 0.66, h: [-0.26, 0.56, 0.0], b: [-0.95, 0.1, -0.2], yaw: -45, pitch: 5, roll: -3, hx: -0.01, hz: 0.03, drop: 0.045, lh: [0.15, 0.52, 0.24], ear: 0.5 },
    { t: 0.86, h: [-0.22, 0.45, -0.1], b: [-0.4, -0.2, -0.9], yaw: -30, pitch: 10, roll: -2, hx: 0, hz: -0.04, drop: 0.1, fl: [0.06, 0.06], fr: [-0.07, 0.02], lh: [0.14, 0.54, 0.3], ear: 0.8 },
    { t: 0.98, hit: 3, h: [0.05, 0.5, 0.35], b: [0.5, 0.0, 0.86], yaw: 20, pitch: 16, roll: 2, hz: 0.06, drop: 0.07, fr: [-0.075, 0.28], fl: [0.05, -0.14], lh: [0.2, 0.46, -0.16], ear: 1 },
    { t: 1.1, h: [0.2, 0.5, 0.1], b: [0.95, 0.0, -0.2], yaw: 40, pitch: 8, roll: 3, hz: 0.04, drop: 0.05, ear: 0.6 },
    { t: 1.2, h: [0.22, 0.52, 0.02], b: [0.95, 0.0, -0.3], yaw: 50, pitch: 4, roll: 3, hz: 0.01, drop: 0.07, spin: 0, fl: [0.06, 0.0], fr: [-0.07, 0.12], lh: [0.2, 0.5, 0.1], ear: 0.6 },
    { t: 1.35, hit: 4, h: [-0.2, 0.5, 0.22], b: [-0.75, 0.0, 0.66], yaw: -10, pitch: 6, roll: 0, hz: 0.0, drop: 0.04, spin: -170, lift: 0.07, tuck: 0.03, lh: [0.26, 0.5, -0.02], ear: 1 },
    { t: 1.48, h: [-0.3, 0.52, -0.02], b: [-0.95, 0.02, -0.3], yaw: -40, pitch: 4, roll: -3, drop: 0.08, spin: -360, lift: 0, tuck: 0, fl: [0.07, -0.06], fr: [-0.08, 0.14], lh: [0.2, 0.48, 0.16], ear: 0.6 },
    { t: 1.65, h: [-0.05, 0.75, 0.25], b: [0.0, 1.0, 0.1], yaw: 0, pitch: -6, roll: 0, drop: 0.01, lh: [0.1, 0.6, 0.22], ear: 0.5 },
    { t: 1.8, hit: 5, h: [-0.05, 0.8, 0.24], b: [0.0, 1.0, 0.1], pitch: -9, drop: -0.01, lh: [0.14, 0.7, 0.2], ear: 1 },
    { t: 1.92, h: [-0.05, 0.78, 0.24], b: [0.0, 1.0, 0.12], pitch: -8, drop: 0.0, lh: [0.13, 0.68, 0.2], ear: 0.6 },
    { t: 2.06, h: [0.1, 0.32, 0.2], b: [0.4, -0.85, 0.3], yaw: 15, pitch: 16, hz: 0.02, drop: 0.1, lh: [0.2, 0.44, 0.1], fr: [-0.075, 0.2], ear: 0.6 },
    { t: 2.2, hit: 6, h: [-0.05, 0.7, 0.3], b: [-0.1, 0.8, 0.6], yaw: -4, pitch: -8, hz: 0.03, drop: 0.0, lift: 0.1, lh: [0.22, 0.5, -0.05], ear: 1 },
    { t: 2.3, h: [-0.15, 0.86, 0.06], b: [-0.3, 0.85, -0.4], yaw: -20, pitch: -10, hz: 0.01, lift: 0.12, tuck: 0.03, ear: 0.7 },
    { t: 2.42, h: [-0.1, 0.7, 0.26], b: [-0.1, 0.6, 0.8], yaw: -8, pitch: 6, drop: 0.08, lift: 0, tuck: 0, ear: 0.6 },
    { t: 2.5, h: [-0.04, 0.6, 0.38], b: [0.0, 0.3, 0.95], yaw: 0, pitch: 4, hz: 0.03, drop: 0.04, lh: [0.06, 0.58, 0.3], ear: 0.5 },
    { t: 2.6, hit: 7, h: [-0.04, 0.59, 0.39], b: [0.0, 0.26, 0.96], pitch: 6, hz: 0.035, drop: 0.045, ear: 0.8 },
    { t: 2.72, hit: 8, h: [-0.04, 0.6, 0.385], b: [0.0, 0.3, 0.95], pitch: 5, hz: 0.03, drop: 0.04, ear: 0.8 },
    { t: 2.84, hit: 9, h: [-0.04, 0.59, 0.39], b: [0.0, 0.26, 0.96], pitch: 6, hz: 0.035, drop: 0.045, ear: 0.8 },
    { t: 2.95, h: [-0.04, 0.6, 0.38], b: [0.0, 0.28, 0.96], pitch: 4, hz: 0.03, drop: 0.04, ear: 0.3 },
    { t: 3.2, idle: true, spin: -360 },
  ],
};
// Ink Dive (2.4 s): a rising slash, the X, the leap (1.1 u up, a full turn with three cuts round
// him), the blade over his head at the top, the dive with the point driven down
SKILL20_DEFS.inkdive = {
  keys: [
    { t: 0, idle: true },
    { t: 0.06, h: [0.1, 0.32, 0.16], b: [0.45, -0.85, 0.2], yaw: 12, pitch: 12, hz: 0.01, drop: 0.07, fr: [-0.075, 0.2], lh: [0.18, 0.44, 0.14], ear: 0.5 },
    { t: 0.2, hit: 1, h: [-0.05, 0.7, 0.3], b: [-0.1, 0.8, 0.6], yaw: -6, pitch: -6, hz: 0.03, drop: 0.0, lh: [0.22, 0.48, -0.04], ear: 1 },
    { t: 0.3, h: [-0.16, 0.86, 0.06], b: [-0.3, 0.85, -0.4], yaw: -20, pitch: -10, hz: 0.01, drop: -0.01, ear: 0.6 },
    { t: 0.45, h: [-0.16, 0.84, 0.05], b: [-0.4, 0.6, -0.6], yaw: -25, pitch: -6, hz: 0.0, drop: 0.02, fl: [0.07, 0.0], lh: [0.17, 0.5, 0.2], ear: 0.5 },
    { t: 0.55, hit: 2, h: [0.12, 0.36, 0.2], b: [0.6, -0.6, 0.5], yaw: 25, pitch: 14, roll: 3, hz: 0.03, drop: 0.06, ear: 1 },
    { t: 0.61, h: [0.2, 0.8, 0.05], b: [0.4, 0.6, -0.6], yaw: 30, pitch: -8, roll: 2, hz: 0.02, drop: 0.02, ear: 0.6 },
    { t: 0.68, hit: 3, h: [-0.12, 0.36, 0.2], b: [-0.6, -0.6, 0.5], yaw: -25, pitch: 14, roll: -3, hz: 0.03, drop: 0.07, ear: 1 },
    { t: 0.78, h: [-0.16, 0.4, 0.1], b: [-0.5, -0.3, 0.6], yaw: -12, pitch: 16, roll: -1, hz: 0.0, drop: 0.13, fl: [0.06, -0.04], fr: [-0.07, 0.1], lh: [0.2, 0.42, 0.12], ear: 0.8 },
    { t: 0.85, h: [-0.1, 0.5, 0.1], b: [-0.3, 0.6, 0.7], yaw: 0, pitch: -4, roll: 0, drop: 0.02, lift: 0, spin: 0, ear: 1 },
    { t: 0.95, hit: 4, h: [0.2, 0.6, 0.1], b: [0.9, 0.2, -0.3], yaw: 30, pitch: 0, drop: 0, lift: 0.36, tuck: 0.05, spin: 60, lh: [0.24, 0.5, -0.06] },
    { t: 1.08, hit: 5, h: [-0.05, 0.55, 0.35], b: [-0.2, -0.2, 0.95], yaw: 0, lift: 0.74, tuck: 0.08, spin: 180 },
    { t: 1.21, hit: 6, h: [-0.25, 0.6, 0.0], b: [-0.9, 0.2, -0.3], yaw: -30, lift: 0.97, tuck: 0.09, spin: 320, lh: [0.16, 0.52, 0.2] },
    { t: 1.3, h: [-0.14, 0.76, 0.02], b: [-0.4, 0.6, -0.6], yaw: -10, pitch: -6, lift: 1.06, tuck: 0.08, spin: 360 },
    { t: 1.4, hit: 7, h: [-0.02, 0.9, 0.02], b: [0.0, 0.45, -0.9], yaw: 0, pitch: -14, lift: 1.1, tuck: 0.1, lg: 1, ear: 1 },
    { t: 1.55, h: [-0.02, 0.92, 0.0], b: [0.0, 0.4, -0.92], pitch: -16, lift: 1.02, tuck: 0.1, lg: 1, flip: 0, ear: 0.8 },
    { t: 1.75, h: [-0.02, 0.62, 0.3], b: [0.0, -0.75, 0.66], pitch: 10, lift: 0.66, tuck: 0.04, lg: 1, flip: 35, ear: 1 },
    { t: 1.88, h: [-0.02, 0.45, 0.32], b: [0.0, -0.9, 0.42], pitch: 18, lift: 0.26, tuck: 0.0, lg: 1, flip: 25 },
    { t: 1.95, hit: 8, h: [-0.02, 0.34, 0.3], b: [0.0, -0.85, 0.5], pitch: 26, hz: 0.05, drop: 0.14, lift: 0, flip: 0, lg: 1, fr: [-0.075, 0.24], fl: [0.06, -0.06], ear: 1 },
    { t: 2.02, h: [-0.02, 0.37, 0.3], b: [0.02, -0.82, 0.54], pitch: 23, hz: 0.045, drop: 0.11, lg: 1, ear: 0.6 },
    { t: 2.15, h: [-0.02, 0.34, 0.28], b: [0.05, -0.85, 0.5], pitch: 24, hz: 0.045, drop: 0.12, lg: 0.8, ear: 0.3 },
    { t: 2.4, idle: true, spin: 360 },
  ],
};
// Calm Forms (2.0 s): an overhead arc, the leap with the point down (0.6 u up), the rising cut,
// the low crouched sweep
SKILL20_DEFS.riptide = {
  keys: [
    { t: 0, idle: true },
    { t: 0.08, h: [-0.04, 0.86, 0.04], b: [0.0, 0.5, -0.85], pitch: -10, hz: -0.02, drop: -0.005, lg: 1, fl: [0.06, -0.04], ear: 0.5 },
    { t: 0.18, hit: 1, h: [-0.02, 0.5, 0.32], b: [0.0, 0.0, 1.0], pitch: 14, hz: 0.04, drop: 0.05, lg: 1, fr: [-0.075, 0.22], ear: 1 },
    { t: 0.26, h: [0.0, 0.34, 0.28], b: [0.0, -0.8, 0.55], pitch: 22, hz: 0.04, drop: 0.08, lg: 1, ear: 0.5 },
    { t: 0.36, h: [-0.03, 0.4, 0.2], b: [0.0, -0.5, 0.85], pitch: 18, hz: 0.02, drop: 0.13, lg: 0.5, lh: [0.2, 0.42, 0.1], ear: 0.8 },
    { t: 0.42, h: [-0.04, 0.75, 0.2], b: [0.0, -0.3, 0.95], pitch: -6, hz: 0.02, drop: 0.0, lift: 0, lg: 0, lh: [0.24, 0.6, 0.0], ear: 1 },
    { t: 0.5, h: [-0.04, 0.8, 0.2], b: [0.0, -0.5, 0.85], pitch: -4, lift: 0.43, tuck: 0.06, lg: 0.6, flip: 6 },
    { t: 0.59, h: [-0.04, 0.82, 0.2], b: [0.0, -0.7, 0.7], pitch: -2, lift: 0.6, tuck: 0.09, lg: 1, flip: 12, ear: 0.8 },
    { t: 0.68, h: [-0.03, 0.62, 0.26], b: [0.0, -0.92, 0.38], pitch: 14, lift: 0.43, tuck: 0.05, lg: 1, flip: 15, ear: 1 },
    { t: 0.76, hit: 2, h: [-0.02, 0.4, 0.3], b: [0.0, -0.95, 0.3], pitch: 28, hz: 0.05, drop: 0.14, lift: 0, tuck: 0, flip: 0, lg: 1, fr: [-0.075, 0.24], fl: [0.06, -0.05], ear: 1 },
    { t: 0.83, h: [-0.01, 0.36, 0.28], b: [0.05, -0.92, 0.36], pitch: 24, hz: 0.045, drop: 0.11, lg: 1, ear: 0.6 },
    { t: 0.9, h: [0.0, 0.3, 0.25], b: [0.1, -0.9, 0.4], pitch: 20, hz: 0.04, drop: 0.1, lg: 0.6, ear: 0.5 },
    { t: 1.05, hit: 3, h: [-0.02, 0.66, 0.3], b: [0.0, 0.8, 0.6], pitch: -6, hz: 0.03, drop: 0.01, lg: 0, lh: [0.22, 0.46, -0.06], ear: 1 },
    { t: 1.15, h: [-0.04, 0.86, 0.06], b: [0.0, 0.9, -0.4], pitch: -10, hz: 0.0, drop: -0.01, ear: 0.6 },
    { t: 1.3, h: [0.26, 0.42, 0.0], b: [0.7, -0.1, -0.7], yaw: 40, pitch: 20, roll: 3, hz: -0.02, drop: 0.12, fl: [0.09, -0.02], fr: [-0.09, 0.14], lh: [0.24, 0.44, -0.1], ear: 0.7 },
    { t: 1.45, hit: 4, h: [0.0, 0.3, 0.38], b: [0.0, -0.1, 1.0], yaw: 0, pitch: 30, roll: 0, hz: 0.05, drop: 0.14, lh: [0.2, 0.42, 0.14], ear: 1 },
    { t: 1.6, h: [-0.28, 0.32, 0.1], b: [-0.95, -0.1, -0.2], yaw: -45, pitch: 26, roll: -4, hx: -0.012, hz: 0.03, drop: 0.14, lh: [0.14, 0.5, 0.26], ear: 0.6 },
    { t: 1.75, h: [-0.28, 0.32, 0.1], b: [-0.95, -0.12, -0.2], yaw: -46, pitch: 24, roll: -4, hx: -0.012, hz: 0.03, drop: 0.135, lh: [0.14, 0.51, 0.26], ear: 0.3 },
    { t: 2.0, idle: true },
  ],
};

// ---- the detail layer (motion audit, 18 Nov; Kesh: "insanely fill in motion details") ----
// Laid over each clip's keys by withMore() in tripoFox.js: the steps under every cut, the left paw
// as a counterweight, the lean and the weight shift, a rebound after each landing, and `via`, the
// direction the blade passes on a wide turn. Feet are [x, z] (idle fl [0.045, -0.085],
// fr [-0.069, 0.128]).
const MORE20 = {
  flurry20: [
    { t: 0.045, via: [0.35, -0.9, 0.1], roll: 3, hx: 0.01 },
    { t: 0.14, roll: -3, hx: -0.012 },
    { t: 0.18, roll: -4 },
    { t: 0.23, roll: 3, hx: 0.012, lh: [0.23, 0.5, 0.0], fl: [0.07, -0.05] },
    { t: 0.27, roll: 4 },
    { t: 0.33, roll: -4, hx: -0.014, lh: [0.18, 0.44, 0.14] },
    { t: 0.36, roll: -5 },
    { t: 0.42, roll: 4, hx: 0.014, lh: [0.24, 0.5, -0.06], fl: [0.085, -0.02] },
    { t: 0.46, roll: 5 },
    { t: 0.5, roll: 1, hx: 0.0 },
    { t: 0.55, hx: -0.012, fr: [-0.1, 0.26], fl: [0.1, -0.1] },
    { t: 0.6, drop: 0.105, pitch: 12.5 },
  ],
  finisher20: [
    { t: 0.08, via: [-0.6, -0.75, 0.2], fl: [0.09, -0.14], roll: -3, hx: -0.012 },
    { t: 0.24, roll: -4, hx: -0.016 },
    { t: 0.3, via: [-0.1, -0.8, 0.6], fl: [0.06, -0.06], roll: 0, hx: 0 },
    { t: 0.42, roll: 4 },
    { t: 0.62, roll: 2, lh: [0.27, 0.6, 0.0] },
    { t: 0.8, roll: -2, fl: [0.1, -0.12], fr: [-0.1, 0.17], hx: 0.012 },
    { t: 0.85, drop: 0.15, pitch: 15 },
    { t: 0.9, roll: -1 },
    { t: 1.06, fl: [0.06, -0.09], fr: [-0.07, 0.13], roll: 0, hx: 0 },
  ],
  keen20: [
    { t: 0.05, fl: [0.07, -0.13], roll: 2, hx: -0.01 },
    { t: 0.16, roll: -5, drop: 0.045, fr: [-0.06, 0.06], lh: [0.27, 0.56, 0.04] },
    { t: 0.28, roll: -3, fl: [0.04, -0.03] },
    { t: 0.35, fl: [0.09, -0.15], roll: 3, hx: 0.012 },
    { t: 0.42, roll: 4, hx: 0.016 },
    { t: 0.52, roll: 1, hx: 0.006 },
    { t: 0.6, drop: 0.085, pitch: 13.5 },
    { t: 0.72, roll: 0, hx: 0 },
  ],
  bloom20: [
    { t: 0.06, fr: [-0.08, 0.1], lh: [0.19, 0.46, 0.04], roll: -1 },
    { t: 0.13, lh: [0.22, 0.44, -0.04], fl: [0.05, -0.06] },
    { t: 0.22, drop: 0.035, pitch: -2 },
    { t: 0.36, roll: 2, hx: 0.008 },
    { t: 0.4, roll: -3, hx: -0.012 },
    { t: 0.48, lh: [0.09, 0.61, 0.39], pitch: 7, roll: -3 },
    { t: 0.56, roll: 0, hx: 0, fl: [0.055, -0.03] },
    { t: 0.72, fr: [-0.07, 0.1], hz: -0.02 },
    { t: 0.8, via: [0, 0.9, 0.4], fr: [-0.08, 0.25] },
    { t: 0.92, drop: 0.125, pitch: 26 },
  ],
  triple20: [
    { t: 0.14, fl: [0.04, -0.035], fr: [-0.05, 0.04], drop: -0.006 },
    { t: 0.3, drop: -0.008 },
    { t: 0.35, fl: [0.075, -0.13], roll: -3, hx: -0.012 },
    { t: 0.4, roll: 0, hx: 0 },
    { t: 0.46, roll: 4, hx: 0.014 },
    { t: 0.57, roll: -3, hx: -0.012, fl: [0.085, -0.1], lh: [0.18, 0.42, 0.26] },
    { t: 0.65, roll: 0, hx: 0, fr: [-0.08, 0.2], lh: [0.24, 0.5, -0.06] },
    { t: 0.72, roll: 2, lh: [0.24, 0.56, -0.1] },
    { t: 0.81, roll: 0 },
    { t: 0.9, via: [0, 0.9, 0.4], fr: [-0.08, 0.27] },
    { t: 0.96, drop: 0.13, pitch: 25 },
    { t: 1.3, via: [0.5, -0.85, 0.1] },
    { t: 1.52, drop: 0.045, pitch: 5 },
    { t: 1.75, via: [0.4, -0.9, 0.1] },
  ],
  lunge20: [
    { t: 0.08, fr: [-0.07, 0.07], roll: 2 },
    { t: 0.2, roll: 3, hx: 0.01 },
    { t: 0.25, fl: [0.07, -0.21], roll: 0, hx: 0 },
    { t: 0.65, via: [0, 0.95, 0.3] },
    { t: 0.86, fl: [0.1, -0.17], fr: [-0.1, 0.12], lh: [0.2, 0.34, 0.24] },
    { t: 0.92, drop: 0.16, pitch: 19 },
    { t: 1.0, lh: [0.2, 0.4, 0.22] },
    { t: 1.25, via: [-0.95, 0.15, 0.2] },
  ],
  lungeDrill20: [
    { t: 0.08, fr: [-0.07, 0.07], roll: 2 },
    { t: 0.2, roll: 3, hx: 0.01 },
    { t: 0.25, fl: [0.07, -0.21], roll: 0, hx: 0 },
    { t: 0.7, via: [-0.9, -0.2, 0.3], lh: [0.2, 0.34, 0.25] },
    { t: 0.78, drop: 0.165, pitch: 21, fl: [0.11, -0.15], fr: [-0.1, 0.25] },
    { t: 0.95, fl: [0.11, -0.17], fr: [-0.1, 0.27], lh: [0.2, 0.4, 0.24] },
    { t: 1.2, via: [-0.95, 0.15, 0.2] },
  ],
  lungeStay20: [
    { t: 0.08, fr: [-0.07, 0.07], roll: 2 },
    { t: 0.2, roll: 3, hx: 0.01 },
    { t: 0.25, fl: [0.07, -0.21], roll: 0, hx: 0 },
    { t: 0.32, drop: 0.15, pitch: 42 },
    { t: 0.4, drop: 0.135, pitch: 39 },
    { t: 0.7, fl: [0.06, -0.14], roll: 3, lh: [0.24, 0.52, -0.06] },
    { t: 0.8, roll: 0, lh: [0.2, 0.5, 0.06] },
  ],
  rift20: [
    { t: 0.1, fl: [0.05, -0.05], roll: 0 },
    { t: 0.2, fl: [0.085, -0.15] },
    { t: 0.26, drop: 0.155, pitch: 34 },
    { t: 0.35, roll: -3, hx: -0.015 },
    { t: 0.5, roll: -5, hx: -0.02, fl: [0.095, -0.03] },
    { t: 0.6, via: [-0.2, -0.5, 0.85], roll: 2, hx: 0.01, fl: [0.06, -0.13] },
    { t: 0.7, roll: 1, hx: 0.005, fr: [-0.07, 0.18] },
    { t: 0.97, fl: [0.07, -0.1] },
  ],
  grove20: [
    { t: 0.04, drop: 0.075, pitch: 7, fl: [0.07, -0.1], fr: [-0.08, 0.11] },
    { t: 0.2, roll: -3 },
    { t: 0.35, roll: 2 },
    { t: 0.55, via: [0, 0.2, -0.98], roll: 0 },
    { t: 0.62, drop: 0.2, pitch: 21 },
    { t: 0.85, lh: [0.2, 0.4, 0.34] },
    { t: 1.1, via: [-0.8, -0.3, 0.4] },
  ],
  groveCall20: [
    { t: 0.06, fl: [0.07, -0.13], hz: 0.02, roll: 2, hx: 0.008 },
    { t: 0.18, hz: -0.03, fr: [-0.07, 0.09], drop: 0.08, roll: -3, hx: -0.01, pitch: -6 },
    { t: 0.27, lh: [0.06, 0.57, 0.1], pitch: -7.5, hz: -0.036 },
    { t: 0.36, hz: -0.012, roll: -1, hx: -0.004 },
  ],
  riposteGuard20: [
    { t: 0.08, fl: [0.08, -0.15], fr: [-0.08, 0.16], hz: -0.02, roll: -1 },
    { t: 0.2, fl: [0.11, -0.13], fr: [-0.06, 0.18], hx: 0.012, hz: -0.025 },
    { t: 0.34, fl: [0.09, -0.14], fr: [-0.07, 0.18], hx: 0.004 },
    { t: 0.48, fl: [0.07, -0.17], fr: [-0.1, 0.15], hx: -0.01, hz: -0.02 },
    { t: 0.62, fl: [0.08, -0.15], fr: [-0.08, 0.16], hx: 0, hz: -0.02 },
  ],


  riposteHit20: [
    { t: 0, fl: [0.08, -0.15], fr: [-0.08, 0.16], hz: -0.02 },
    { t: 0.05, hz: -0.035, drop: 0.085, pitch: -3, roll: -2 },
    { t: 0.1, hz: -0.03, roll: -2 },
    { t: 0.16, fr: [-0.06, 0.07], hz: 0, roll: 4 },
    { t: 0.27, fl: [0.06, -0.04], roll: 5, lh: [0.27, 0.56, 0.02] },
    { t: 0.38, roll: 2 },
    { t: 0.45, via: [0, -0.3, 0.95], fl: [0.1, -0.13], fr: [-0.1, 0.21], roll: -3, hx: -0.012, hz: 0.02 },
    { t: 0.51, drop: 0.105, pitch: 10.5 },
    { t: 0.58, roll: -2 },
  ],
  riposteLow20: [
    { t: 0, fl: [0.08, -0.15], fr: [-0.08, 0.16], hz: -0.02 },
    { t: 0.15, lh: [0.23, 0.5, -0.08], hz: -0.015 },
    { t: 0.3, fr: [-0.07, 0.14], lh: [0.2, 0.5, 0.0], hz: -0.008 },
    { t: 0.45, fl: [0.05, -0.1], lh: [0.17, 0.5, 0.07], hz: 0 },
  ],
  moonfang20: [
    { t: 0.1, fl: [0.08, -0.17], roll: 2 },
    { t: 0.22, hz: -0.03, roll: 3, hx: 0.012 },
    { t: 0.3, via: [0.9, -0.05, 0.3], fr: [-0.08, 0.34], fl: [0.07, -0.23], hz: 0.08, roll: -2, hx: 0 },
    { t: 0.4, fl: [0.09, -0.19], hz: 0.03, roll: -3, hx: -0.012 },
    { t: 0.5, drop: 0.092, pitch: 12, hz: 0.02 },
    { t: 0.78, hz: 0.01, roll: -2 },
  ],
  calm20: [
    { t: 0.05, fl: [0.07, -0.13], fr: [-0.08, 0.1], roll: 2 },
    { t: 0.26, lh: [0.27, 0.6, 0.0], roll: 0 },
    { t: 0.45, fl: [0.1, -0.15], fr: [-0.09, 0.21], lh: [0.24, 0.46, -0.1], roll: 3 },
    { t: 0.53, lh: [0.21, 0.5, 0.12], roll: 4, hx: 0.014 },
    { t: 0.6, drop: 0.13, pitch: 12 },
    { t: 0.72, roll: 2, hx: 0.008 },
  ],
  mirror20: [
    { t: 0.1, fl: [0.05, -0.1], fr: [-0.075, 0.14] },
    { t: 0.235, fr: [-0.07, 0.16] },
    { t: 0.325, fr: [-0.075, 0.14] },
  ],

  storm20: [
    { t: 0.1, fl: [0.08, -0.12], fr: [-0.09, 0.15], roll: 2 },
    { t: 0.3, roll: -5, lh: [0.28, 0.56, 0.0] },
    { t: 0.6, roll: 5 },
    { t: 0.9, roll: -5, lh: [0.28, 0.58, 0.0] },
    { t: 1.02, roll: 0 },
    { t: 1.1, fl: [0.1, -0.13], fr: [-0.1, 0.19] },
    { t: 1.17, drop: 0.17, pitch: 33 },
    { t: 1.32, lh: [0.2, 0.4, 0.2] },
  ],
  dance20: [
    { t: 0.06, fl: [0.08, -0.12], fr: [-0.08, 0.09], roll: 2 },
    { t: 0.32, lh: [0.28, 0.64, 0.0] },
    { t: 0.55, fl: [0.09, -0.13], fr: [-0.09, 0.17], roll: 0 },
    { t: 0.61, drop: 0.095, pitch: 9 },
    { t: 0.7, fl: [0.07, -0.1], fr: [-0.08, 0.14] },
  ],
  wheel20: [
    { t: 0.06, roll: -1, hx: -0.004 },
    { t: 0.12, hx: -0.012, roll: -3, drop: 0.02, lh: [0.22, 0.52, 0.1] },
    { t: 0.24, drop: 0.035, hx: -0.006, roll: -1 },
    { t: 0.3, via: [0, 0.6, -0.8], hx: 0.008, roll: 2, drop: 0.015 },
    { t: 0.36, hx: 0.014, roll: 3, drop: 0.02, fl: [0.06, -0.05], lh: [0.2, 0.46, 0.2] },
    { t: 0.47, drop: 0.04, hx: 0.006, roll: 1 },
    { t: 0.53, fl: [0.085, -0.14], roll: -3, hx: -0.012, lh: [0.16, 0.5, 0.28] },
    { t: 0.6, via: [-0.1, -0.95, 0.25], fr: [-0.08, 0.28], roll: 2, hx: 0.01 },
    { t: 0.67, roll: 1, hx: 0.004 },
    { t: 0.74, drop: 0.038, pitch: -2 },
    { t: 0.84, roll: 0, hx: 0 },
  ],
  thousand20: [
    { t: 0.1, drop: 0.02, pitch: -3, ear: 0.2 },
    { t: 0.18, fl: [0.05, -0.1], lh: [0.17, 0.46, 0.12] },
    { t: 0.24, fr: [-0.075, 0.3], fl: [0.06, -0.21] },
    { t: 1.15, fr: [-0.07, 0.16], fl: [0.05, -0.1] },
    { t: 1.3, via: [0.6, -0.75, 0.2], fr: [-0.069, 0.128], fl: [0.045, -0.085] },
    { t: 1.38, drop: 0.036, pitch: 3 },
    { t: 1.45, drop: 0.045, pitch: 5 },
    { t: 1.66, via: [0.4, -0.9, 0.1] },
  ],
  dash20: [
    { t: 0.08, fr: [-0.07, 0.06], roll: 2 },
    { t: 0.14, fr: [-0.08, 0.3], roll: 0 },
    { t: 0.52, fr: [-0.075, 0.2] },
    { t: 0.6, drop: 0.085, pitch: 10 },
    { t: 0.7, fr: [-0.07, 0.15] },
  ],
  shotHoldD: [
    { t: 0.1, roll: 1 },
    { t: 0.22, roll: -2, hx: -0.01 },
    { t: 0.3, drop: 0.12, pitch: -2 },
  ],
  shotFireD: [
    { t: 0.05, roll: -3 },
    { t: 0.12, via: [0.3, 0.85, 0.4], roll: 0, hx: 0 },
    { t: 0.2, roll: 3, hx: 0.012 },
    { t: 0.27, drop: 0.115, pitch: 15.5 },
    { t: 0.36, roll: 2 },
  ],
  shotHoldU: [
    { t: 0.1, via: [-0.9, -0.2, 0.3], roll: -1 },
    { t: 0.22, roll: -3, hx: -0.012 },
    { t: 0.3, drop: 0.145, pitch: 24 },
  ],
  shotFireU: [
    { t: 0.12, via: [-0.1, -0.85, 0.5], roll: 0, hx: 0 },
    { t: 0.22, roll: 2, hx: 0.008 },
    { t: 0.29, drop: 0.015, pitch: -10 },
    { t: 0.36, roll: 1 },
  ],
  cascade: [
    { t: 0.1, via: [-0.8, 0.5, 0.2] },
    { t: 0.2, via: [-0.95, 0.05, 0.2] },
    { t: 1.66, via: [-0.9, -0.1, 0.3] },
  ],
  waltz: [
    { t: 0.06, via: [-0.9, 0.1, 0.3] },
    { t: 0.98, via: [-0.95, -0.05, 0.25] },
    { t: 1.35, via: [0.2, 0, 1] },
    { t: 2.06, via: [0.2, 0.1, 1] },
  ],
  inkdive: [
    { t: 0.55, via: [-0.1, 0.3, 0.95] },
    { t: 0.68, via: [0.1, 0.3, 0.95] },
    { t: 1.75, via: [0, 0.9, 0.45] },
  ],
  riptide: [
    { t: 0.18, via: [0, 0.95, 0.3] },
  ],
};
for (const name in MORE20) SKILL20_DEFS[name].more = MORE20[name];
SKILL20_DEFS.flurryQi20.more = MORE20.flurry20;
