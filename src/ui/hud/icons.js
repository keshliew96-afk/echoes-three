// Drawn HUD icons (REFERENCE_BAR check 9: "boon/skill icons — clean geometric
// frames, not browser-default text"). One geometric line-icon per skill and per
// node, plus the Stag medallion for the boss plate, the Glint coin and the
// location marker. Everything is an inline SVG on a 32x32 box, stroked and
// filled with `currentColor`, so the HUD colours it from CSS exactly like the
// old text abbreviations and it inherits the §17 grammar (Parchment ink on a
// charcoal plate, class/rarity accents only where the stylesheet says so).
//
// No unicode glyphs: ⇄ / ✶ / ★ rendered by the system font were the round-1
// shop defect (Detonate and Ascend were both "a star", told apart only by rim
// colour). Each icon here is a distinct silhouette that survives 20 px.

const NS = 'http://www.w3.org/2000/svg';

// Each entry: array of primitives [tag, attrs]. Stroke defaults are applied to
// every primitive unless it sets `fill`/`stroke` itself.
const ICONS = {
  // ---------------------------------------------------------- skills --
  // Mending Bolt: a diamond bolt-head with three trailing streaks and the +HP
  // cross behind it (heal projectile).
  mending_bolt: [
    ['path', { d: 'M22 5 L28 11 L22 17 L16 11 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M14 13 L6 21' }],
    ['path', { d: 'M18 18 L12 24' }],
    ['path', { d: 'M12 9 L8 13' }],
    ['path', { d: 'M24 21 V29 M20 25 H28' }],
  ],
  // Swift Mend: a bold cross with speed lines (instant direct heal).
  swift_mend: [
    ['path', { d: 'M18 6 V26 M8 16 H28', 'stroke-width': 3.4 }],
    ['path', { d: 'M3 10 H7 M2 16 H5 M3 22 H7' }],
  ],
  // Nova Bloom: six petals around a core (heal nova).
  nova_bloom: [
    ...[0, 60, 120, 180, 240, 300].map((a) => [
      'path',
      {
        d: 'M16 3.5 Q20 9 16 13.5 Q12 9 16 3.5 Z',
        fill: 'currentColor',
        stroke: 'none',
        transform: `rotate(${a} 16 16)`,
      },
    ]),
    ['circle', { cx: 16, cy: 16, r: 3.2, fill: 'currentColor', stroke: 'none' }],
  ],
  // Sanctuary: a dome over a ground line, crowned with a small cross (zone).
  sanctuary: [
    ['path', { d: 'M6 23 A10 10 0 0 1 26 23' }],
    ['path', { d: 'M3 25.5 H29' }],
    ['path', { d: 'M16 5 V11 M13 8 H19' }],
    ['path', { d: 'M12 23 V19 A4 4 0 0 1 20 19 V23', 'stroke-width': 1.8 }],
  ],
  // Spirit Bolt: a wisp flame with a spark core (damage projectile).
  spirit_bolt: [
    ['path', { d: 'M16 3 C23 10 26 15 23 22 C21 27.5 11 27.5 9 22 C6 15 9 10 16 3 Z' }],
    ['path', { d: 'M16 12 C18.5 16 18.5 20 16 24 C13.5 20 13.5 16 16 12 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Warding Aura: a shield inside a broken ring (passive field).
  warding_aura: [
    ['path', { d: 'M16 6 L24 9 V15.5 C24 21 20 24.5 16 26.5 C12 24.5 8 21 8 15.5 V9 Z' }],
    ['path', { d: 'M5 9 A14 14 0 0 1 27 9', 'stroke-width': 1.8 }],
    ['path', { d: 'M5 23 A14 14 0 0 0 27 23', 'stroke-width': 1.8 }],
  ],
  // Guardian Bond: two interlocked rings.
  guardian_bond: [
    ['circle', { cx: 11.5, cy: 16, r: 6.5 }],
    ['circle', { cx: 20.5, cy: 16, r: 6.5 }],
  ],
  // Restorative Wave: two swells with a cross rising above them (arc heal).
  restorative_wave: [
    ['path', { d: 'M3 19 Q9.5 11 16 19 T29 19' }],
    ['path', { d: 'M3 26 Q9.5 18 16 26 T29 26' }],
    ['path', { d: 'M16 3 V10 M12.5 6.5 H19.5' }],
  ],

  // ------------------------------------------ Gauntlet skills (§23.3) --
  // Lantern Flurry: three diamond bolt-heads fanned out from one point.
  lantern_flurry: [
    ['path', { d: 'M4 26 L14 18 M4 26 L16 22 M4 26 L12 14', 'stroke-width': 1.8 }],
    ['path', { d: 'M22 5 L26 9 L22 13 L18 9 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M26 16 L30 20 L26 24 L22 20 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M15 13 L18 16 L15 19 L12 16 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Pale Lance: a long lance through two bodies (pierce ticks).
  pale_lance: [
    ['path', { d: 'M3 29 L23 9', 'stroke-width': 3 }],
    ['path', { d: 'M20 5 L28 4 L27 12 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M8 18 L14 24 M14 12 L20 18', 'stroke-width': 1.8 }],
  ],
  // Bell Toll: a bell with its clapper and two sound arcs.
  bell_toll: [
    ['path', { d: 'M9 22 C9 12 11 7 16 7 C21 7 23 12 23 22 Z' }],
    ['path', { d: 'M6 22 H26', 'stroke-width': 2.8 }],
    ['circle', { cx: 16, cy: 26, r: 2.2, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M3 12 A12 12 0 0 1 6 6 M29 12 A12 12 0 0 0 26 6', 'stroke-width': 1.8 }],
  ],
  // Rootsnare: a ground line with three roots curling out of it.
  rootsnare: [
    ['path', { d: 'M3 18 H29' }],
    ['path', { d: 'M8 18 C7 23 11 25 9 29 M16 18 C18 23 14 25 16 29 M24 18 C23 23 27 24 25 29', 'stroke-width': 2 }],
    ['path', { d: 'M12 18 C12 13 8 11 9 6 M21 18 C21 12 25 11 23 5', 'stroke-width': 2 }],
  ],
  // Dewfall: three drops falling onto a ground arc.
  dewfall: [
    ['path', { d: 'M9 4 C11 8 12 10 9 12 C6 10 7 8 9 4 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M20 7 C22 11 23 13 20 15 C17 13 18 11 20 7 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M14 14 C16 18 17 20 14 22 C11 20 12 18 14 14 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M4 27 A14 7 0 0 1 28 27' }],
  ],
  // Kindred Shield: a shield with the heal cross inside it.
  kindred_shield: [
    ['path', { d: 'M16 4 L26 8 V15 C26 21 21 25.5 16 28 C11 25.5 6 21 6 15 V8 Z' }],
    ['path', { d: 'M16 10 V21 M10.5 15.5 H21.5', 'stroke-width': 2.8 }],
  ],
  // Mending Tide: one wide swell under a rising cross.
  mending_tide: [
    ['path', { d: 'M2 22 Q9 12 16 20 T30 18' }],
    ['path', { d: 'M4 28 Q11 19 18 26 T30 25', 'stroke-width': 1.8 }],
    ['path', { d: 'M16 3 V11 M12 7 H20' }],
  ],
  // Hearthsong: a hearth flame with two song arcs.
  hearthsong: [
    ['path', { d: 'M16 5 C21 10 22 14 20 19 C19 22 13 22 12 19 C10 14 11 10 16 5 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M6 26 A11 5 0 0 0 26 26' }],
    ['path', { d: 'M4 12 A13 13 0 0 1 7 7 M28 12 A13 13 0 0 0 25 7', 'stroke-width': 1.8 }],
  ],
  // Quiet Hearth: a dome over a small hearth stone (a ward).
  quiet_hearth: [
    ['path', { d: 'M4 24 A12 12 0 0 1 28 24' }],
    ['path', { d: 'M2 26.5 H30' }],
    ['path', { d: 'M13 24 V20 H19 V24', 'stroke-width': 1.8 }],
    ['path', { d: 'M16 10 V16 M13 13 H19', 'stroke-width': 1.8 }],
  ],

  // ----------------------------------------------------------- nodes --
  // Sharpen: a whetted blade with a sparkle.
  sharpen: [
    ['path', { d: 'M7 27 L27 7 L27 15 L15 27 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M8 6 V12 M5 9 H11' }],
  ],
  // Quicken: double chevron.
  quicken: [
    ['path', { d: 'M6 6 L15 16 L6 26' }],
    ['path', { d: 'M16 6 L25 16 L16 26' }],
  ],
  // Multiply: one shaft forking into three heads.
  multiply: [
    ['path', { d: 'M3 16 H13' }],
    ['path', { d: 'M13 16 L26 6 M13 16 L27 16 M13 16 L26 26' }],
    ['path', { d: 'M21 5 L26 6 L25 11 M22 16 L27 16 L22 16 M21 27 L26 26 L25 21', 'stroke-width': 1.8 }],
  ],
  // Ascend: a rising star with a lift arrow beneath.
  ascend: [
    [
      'path',
      {
        d: 'M16 2.5 L19.2 10.2 L27.5 10.8 L21.1 16.2 L23.1 24.3 L16 20 L8.9 24.3 L10.9 16.2 L4.5 10.8 L12.8 10.2 Z',
        fill: 'currentColor',
        stroke: 'none',
      },
    ],
    ['path', { d: 'M9 29 H23', 'stroke-width': 1.8 }],
  ],
  // Bounce: a ricochet path ending in an arrow head.
  bounce: [
    ['path', { d: 'M3 27 L12 8 L20 21 L27 7' }],
    ['path', { d: 'M21.5 6.5 L27.5 6.5 L27.5 12.5' }],
  ],
  // Siphon: a funnel that drinks into a drop.
  siphon: [
    ['path', { d: 'M5 5 H27 L19 15 V22 L13 25 V15 Z' }],
    ['path', { d: 'M16 24 V29', 'stroke-width': 1.8 }],
  ],
  // Echo: concentric rings around a core.
  echo: [
    ['circle', { cx: 16, cy: 16, r: 3.6, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 16, cy: 16, r: 8.5 }],
    ['path', { d: 'M3.5 16 A12.5 12.5 0 0 1 16 3.5 M28.5 16 A12.5 12.5 0 0 1 16 28.5', 'stroke-width': 1.8 }],
  ],
  // Detonate: an eight-spike burst.
  detonate: [
    [
      'path',
      {
        d: 'M16 2 L18.6 11.4 L27 6.5 L21.6 14 L30 16 L21.6 18 L27 25.5 L18.6 20.6 L16 30 L13.4 20.6 L5 25.5 L10.4 18 L2 16 L10.4 14 L5 6.5 L13.4 11.4 Z',
        fill: 'currentColor',
        stroke: 'none',
      },
    ],
  ],

  // ------------------------------------------- Gauntlet nodes (§23.4) --
  // Widen: a ring pushed outward by two arrows.
  widen: [
    ['circle', { cx: 16, cy: 16, r: 5.5 }],
    ['path', { d: 'M2 16 H8 M24 16 H30' }],
    ['path', { d: 'M5 12 L1.5 16 L5 20 M27 12 L30.5 16 L27 20', 'stroke-width': 2 }],
  ],
  // Reach: a long shaft with a head, past a range tick.
  reach: [
    ['path', { d: 'M3 16 H27' }],
    ['path', { d: 'M22 10 L28.5 16 L22 22', 'stroke-width': 2.6 }],
    ['path', { d: 'M9 10 V22 M15 12 V20', 'stroke-width': 1.8 }],
  ],
  // Linger: an hourglass.
  linger: [
    ['path', { d: 'M8 4 H24 M8 28 H24', 'stroke-width': 2.6 }],
    ['path', { d: 'M10 4 C10 12 16 13 16 16 C16 19 10 20 10 28 M22 4 C22 12 16 13 16 16 C16 19 22 20 22 28' }],
    ['path', { d: 'M12.5 25 L16 21.5 L19.5 25 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Keen: a four-point glint.
  keen: [
    ['path', { d: 'M16 2 L18.8 13.2 L30 16 L18.8 18.8 L16 30 L13.2 18.8 L2 16 L13.2 13.2 Z', fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 25, cy: 7, r: 1.8, fill: 'currentColor', stroke: 'none' }],
  ],
  // Snare: a closing loop of rope.
  snare: [
    ['path', { d: 'M16 6 A10 10 0 1 1 7.5 21' }],
    ['path', { d: 'M16 12 A4.5 4.5 0 1 1 11.5 16.5' }],
    ['path', { d: 'M7.5 21 L3 29', 'stroke-width': 2 }],
  ],
  // Galvanize: a zig-zag bolt.
  galvanize: [
    ['path', { d: 'M19 2 L8 17 H15 L12 30 L24 13 H17 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Bulwark: a hexagonal shield plate.
  bulwark: [
    ['path', { d: 'M16 3 L27 9.5 V22.5 L16 29 L5 22.5 V9.5 Z' }],
    ['path', { d: 'M16 9 L22 12.5 V19.5 L16 23 L10 19.5 V12.5 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Split: one line forking into two heads.
  split: [
    ['path', { d: 'M3 16 H13 L25 7 M13 16 L25 25' }],
    ['path', { d: 'M20 5 L26 6.5 L24.5 12 M20 27 L26 25.5 L24.5 20', 'stroke-width': 2 }],
  ],
  // Resonance: three nested arcs around a core (x2 on the third cast).
  resonance: [
    ['circle', { cx: 9, cy: 16, r: 3, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M14 10 A8 8 0 0 1 14 22' }],
    ['path', { d: 'M19 6 A13 13 0 0 1 19 26' }],
    ['path', { d: 'M24 3 A18 18 0 0 1 24 29', 'stroke-width': 1.8 }],
  ],

  // ------------------------------------ PARTY class skills (§25.2) --
  // Tank (badger) — protects and controls.
  heavy_slam: [
    ['path', { d: 'M8 5 H20 V13 H8 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M14 13 V23' }],
    ['path', { d: 'M4 27 H28 M7 23 L4 20 M25 23 L28 20', 'stroke-width': 2 }],
  ],
  brutal_cleave: [
    ['path', { d: 'M5 22 A13 13 0 0 1 27 22', 'stroke-width': 3 }],
    ['path', { d: 'M16 9 L21 4 L27 10 L22 15 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M16 9 L9 26' }],
  ],
  ground_crack: [
    ['path', { d: 'M2 21 H30' }],
    ['path', { d: 'M16 21 L12 26 L15 29 M16 21 L21 25 L19 29 M16 21 L16 14', 'stroke-width': 2 }],
    ['path', { d: 'M9 12 L16 6 L23 12', 'stroke-width': 2 }],
  ],
  whirling_guard: [
    ['path', { d: 'M16 4 A12 12 0 0 1 28 16', 'stroke-width': 2.6 }],
    ['path', { d: 'M16 28 A12 12 0 0 1 4 16', 'stroke-width': 2.6 }],
    ['path', { d: 'M24 12 L28 16 L32 12 M8 20 L4 16 L0 20', 'stroke-width': 2 }],
    ['circle', { cx: 16, cy: 16, r: 4, fill: 'currentColor', stroke: 'none' }],
  ],
  taunting_roar: [
    ['path', { d: 'M5 11 L14 16 L5 21 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M18 10 A7 7 0 0 1 18 22 M22 6 A12 12 0 0 1 22 26' }],
    ['path', { d: 'M27 4 V14 M27 18 V20', 'stroke-width': 2.6 }],
  ],
  shield_wall: [
    ['path', { d: 'M4 6 H14 V20 L9 26 L4 20 Z' }],
    ['path', { d: 'M18 6 H28 V20 L23 26 L18 20 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  shoulder_charge: [
    ['path', { d: 'M14 8 H24 A4 4 0 0 1 28 12 V20 A4 4 0 0 1 24 24 H14 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M2 11 H10 M4 16 H11 M2 21 H10' }],
  ],
  iron_stance: [
    ['path', { d: 'M16 4 L26 9.5 V21.5 L16 27 L6 21.5 V9.5 Z' }],
    ['path', { d: 'M11 26 V20 M21 26 V20 M16 11 V17', 'stroke-width': 2 }],
    ['path', { d: 'M3 29.5 H29', 'stroke-width': 1.8 }],
  ],
  // Swordsman (fox) — strikes and chains close-quarter combos.
  flurry: [
    ['path', { d: 'M5 26 L20 11 M9 28 L25 12 M13 29 L28 15' }],
    ['path', { d: 'M21 4 L28 4 L28 11', 'stroke-width': 2 }],
  ],
  lunge_strike: [
    ['path', { d: 'M3 16 H26' , 'stroke-width': 3 }],
    ['path', { d: 'M22 11 L29 16 L22 21 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M5 11 V21', 'stroke-width': 2 }],
  ],
  blade_storm: [
    ...[0, 90, 180, 270].map((a) => ['path', { d: 'M16 16 L16 3 L20 8 Z', fill: 'currentColor', stroke: 'none', transform: `rotate(${a} 16 16)` }]),
    ['circle', { cx: 16, cy: 16, r: 11, 'stroke-width': 1.6 }],
  ],
  caltrops: [
    ['path', { d: 'M8 20 L12 12 L16 20 Z M16 26 L20 18 L24 26 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M2 28 H30' }],
    ['path', { d: 'M22 8 L26 4 M26 8 L22 4', 'stroke-width': 1.8 }],
  ],
  fox_step: [
    ['path', { d: 'M3 23 C9 23 12 9 19 9', 'stroke-width': 2 }],
    ['path', { d: 'M17 9 L28 20 M24 6 L28 10', 'stroke-width': 2.8 }],
    ['path', { d: 'M3 17 H7 M3 29 H10', 'stroke-width': 1.6 }],
  ],
  crescent_finisher: [
    ['path', { d: 'M8 5 A13 13 0 1 0 27 19 A10 10 0 1 1 8 5 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M23 5 L25 8 L28 9 L25 10 L23 13 L21 10 L18 9 L21 8 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  riposte: [
    ['path', { d: 'M5 27 L25 5 M7 5 L27 27' }],
    ['path', { d: 'M3 21 L11 29 M21 29 L29 21', 'stroke-width': 2 }],
  ],
  razor_wake: [
    ['circle', { cx: 16, cy: 16, r: 10, 'stroke-dasharray': '4 3' }],
    ['path', { d: 'M16 3 L19 8 L13 8 Z M27 21 L22 22 L24 17 Z M5 21 L8 17 L10 22 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Archer (hare) — kites at range.
  piercing_shot: [
    ['path', { d: 'M3 16 H27' }],
    ['path', { d: 'M22 11 L29 16 L22 21', 'stroke-width': 2.6 }],
    ['circle', { cx: 14, cy: 16, r: 4.5, 'stroke-width': 1.8 }],
  ],
  volley: [
    ['path', { d: 'M4 26 L24 6 M4 16 L24 16 M4 6 L24 26', 'stroke-width': 2 }],
    ['path', { d: 'M20 5 L25 5 L25 10 M21 13 L26 16 L21 19 M20 27 L25 27 L25 22', 'stroke-width': 1.8 }],
  ],
  detonating_charge: [
    ['circle', { cx: 13, cy: 19, r: 8, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M18 12 C21 7 25 8 26 4', 'stroke-width': 2 }],
    ['path', { d: 'M27 2 L29 5 M30 6 L27 7', 'stroke-width': 1.6 }],
  ],
  sundering_nova: [
    ['circle', { cx: 16, cy: 16, r: 5 }],
    ['path', { d: 'M16 2 V8 M16 24 V30 M2 16 H8 M24 16 H30 M6 6 L10 10 M22 22 L26 26 M26 6 L22 10 M6 26 L10 22', 'stroke-width': 2 }],
  ],
  vault_shot: [
    ['path', { d: 'M4 26 C8 10 20 6 28 8', 'stroke-width': 2 }],
    ['path', { d: 'M23 4 L28 8 L23 12', 'stroke-width': 2.4 }],
    ['path', { d: 'M3 28 H13', 'stroke-width': 1.8 }],
  ],
  pinning_arrow: [
    ['path', { d: 'M4 4 L22 22', 'stroke-width': 2.8 }],
    ['path', { d: 'M17 25 L25 25 L25 17 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M2 30 H30 M22 26 V30', 'stroke-width': 1.8 }],
  ],
  rain_of_arrows: [
    ['path', { d: 'M7 3 V17 M16 6 V20 M25 3 V17', 'stroke-width': 2 }],
    ['path', { d: 'M4 14 L7 19 L10 14 M13 17 L16 22 L19 17 M22 14 L25 19 L28 14', 'stroke-width': 1.8 }],
    ['path', { d: 'M3 27 H29', 'stroke-width': 2 }],
  ],
  kestrel_watch: [
    ['path', { d: 'M3 14 L13 12 L16 7 L19 12 L29 14 L19 16 L16 25 L13 16 Z', fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 16, cy: 16, r: 13, 'stroke-width': 1.4, 'stroke-dasharray': '3 3' }],
  ],

  // ------------------------------------- PARTY class nodes (§25.3) --
  provoke: [
    ['path', { d: 'M10 4 V20 M22 4 V20', 'stroke-width': 3.2 }],
    ['circle', { cx: 10, cy: 26, r: 2.2, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 22, cy: 26, r: 2.2, fill: 'currentColor', stroke: 'none' }],
  ],
  brace: [
    ['path', { d: 'M5 5 H27 V27 H5 Z' }],
    ['path', { d: 'M10 10 H22 V22 H10 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  tremor: [
    ['path', { d: 'M2 16 Q6 8 10 16 T18 16 T26 16 T30 12' }],
    ['path', { d: 'M4 25 H28', 'stroke-width': 1.8 }],
  ],
  anchor: [
    ['circle', { cx: 16, cy: 6, r: 3 }],
    ['path', { d: 'M16 9 V27 M10 14 H22' }],
    ['path', { d: 'M5 20 C6 27 12 28 16 27 C20 28 26 27 27 20', 'stroke-width': 2.2 }],
  ],
  retaliate: [
    ['path', { d: 'M24 9 A10 10 0 1 0 26 19', 'stroke-width': 2.6 }],
    ['path', { d: 'M20 4 L25 9 L19 12', 'stroke-width': 2.2 }],
    ['path', { d: 'M13 13 L19 19 M19 13 L13 19', 'stroke-width': 2 }],
  ],
  aegis: [
    ['path', { d: 'M16 3 L28 10 V22 L16 29 L4 22 V10 Z' }],
    ['path', { d: 'M16 8 L23 12 V20 L16 24 L9 20 V12 Z', 'stroke-width': 1.8 }],
    ['circle', { cx: 16, cy: 16, r: 2.6, fill: 'currentColor', stroke: 'none' }],
  ],
  flow: [
    ['path', { d: 'M24 8 A10 10 0 1 0 26 20', 'stroke-width': 2.4 }],
    ['path', { d: 'M20 3 L25 8 L19 11', 'stroke-width': 2.2 }],
    ['path', { d: 'M12 16 H20', 'stroke-width': 2 }],
  ],
  momentum: [
    ['path', { d: 'M3 16 H13 M3 9 H11 M3 23 H11', 'stroke-width': 2 }],
    ['path', { d: 'M14 6 L27 16 L14 26 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  parry: [
    ['path', { d: 'M16 3 V29', 'stroke-width': 3 }],
    ['path', { d: 'M4 26 H28', 'stroke-width': 3 }],
    ['path', { d: 'M10 10 L16 4 L22 10', 'stroke-width': 1.8 }],
  ],
  pursuit: [
    ['path', { d: 'M5 27 L25 7', 'stroke-width': 2.6 }],
    ['path', { d: 'M15 6 H26 V17', 'stroke-width': 2.6 }],
    ['path', { d: 'M4 19 L8 23 M9 14 L13 18', 'stroke-width': 1.6 }],
  ],
  lethality: [
    ['path', { d: 'M6 6 L26 26 M26 6 L6 26', 'stroke-width': 3.2 }],
    ['circle', { cx: 16, cy: 16, r: 3.6, fill: 'currentColor', stroke: 'none' }],
  ],
  execute: [
    ['circle', { cx: 16, cy: 16, r: 11 }],
    ['circle', { cx: 16, cy: 16, r: 4.5, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M16 1 V9 M16 23 V31 M1 16 H9 M23 16 H31', 'stroke-width': 2 }],
  ],
  skewer: [
    ['path', { d: 'M2 16 H28', 'stroke-width': 2.4 }],
    ['path', { d: 'M23 11 L29 16 L23 21', 'stroke-width': 2.2 }],
    ['circle', { cx: 10, cy: 16, r: 3.4 }],
    ['circle', { cx: 18, cy: 16, r: 3.4 }],
  ],
  concussive: [
    ['circle', { cx: 12, cy: 16, r: 7, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M22 9 A10 10 0 0 1 22 23 M26 5 A15 15 0 0 1 26 27', 'stroke-width': 2 }],
  ],
  steady_aim: [
    ['path', { d: 'M5 5 H27 V27 H5 Z', 'stroke-width': 2 }],
    ['path', { d: 'M16 5 V11 M16 21 V27 M5 16 H11 M21 16 H27', 'stroke-width': 2 }],
    ['circle', { cx: 16, cy: 16, r: 2.4, fill: 'currentColor', stroke: 'none' }],
  ],
  disengage: [
    ['path', { d: 'M26 22 C22 8 12 6 6 12', 'stroke-width': 2.4 }],
    ['path', { d: 'M4 6 L6 13 L13 12', 'stroke-width': 2.2 }],
    ['path', { d: 'M18 28 H30', 'stroke-width': 1.8 }],
  ],
  scatter: [
    ['circle', { cx: 16, cy: 8, r: 4, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 8, cy: 23, r: 4, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 24, cy: 23, r: 4, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M16 12 V16 L10 20 M16 16 L22 20', 'stroke-width': 1.6 }],
  ],
  heartseeker: [
    ['path', { d: 'M16 27 L5 16 A6 6 0 0 1 16 8 A6 6 0 0 1 27 16 Z' }],
    ['path', { d: 'M2 4 L20 20', 'stroke-width': 2.2 }],
    ['path', { d: 'M16 21 L21 21 L21 16', 'stroke-width': 2 }],
  ],

  // ------------------------------------ class glyphs (§25.6 strip) --
  // The §19.2 silhouette props, drawn in Parchment ink on the party strip.
  cls_healer: [
    ['path', { d: 'M10 24 C10 14 11 7 16 7 C21 7 22 14 22 24 Z' }],
    ['path', { d: 'M7 24 H25', 'stroke-width': 2.4 }],
    ['circle', { cx: 16, cy: 27, r: 2, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M16 3 V7', 'stroke-width': 2 }],
  ],
  cls_tank: [
    ['path', { d: 'M6 5 H26 V16 C26 23 21 27 16 29 C11 27 6 23 6 16 Z' }],
    ['path', { d: 'M11 10 H21 V16 H11 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  cls_swordsman: [
    ['path', { d: 'M6 26 L24 8', 'stroke-width': 3 }],
    ['path', { d: 'M22 4 L28 4 L28 10', 'stroke-width': 2 }],
    ['path', { d: 'M5 21 L11 27', 'stroke-width': 2.6 }],
  ],
  cls_archer: [
    ['path', { d: 'M9 3 C23 9 23 23 9 29', 'stroke-width': 2.6 }],
    ['path', { d: 'M9 3 V29', 'stroke-width': 1.4 }],
    ['path', { d: 'M3 16 H27 M23 12 L28 16 L23 20', 'stroke-width': 2 }],
  ],

  // ----------------------------------------------------------- chrome --
  // The Hollow Stag: antlers, a hooded head, the crown mote.
  stag: [
    ['path', { d: 'M12 14 L7 6 M7 6 L3 8 M7 6 L8.5 1.5 M8.8 9 L5.5 11.5' }],
    ['path', { d: 'M20 14 L25 6 M25 6 L29 8 M25 6 L23.5 1.5 M23.2 9 L26.5 11.5' }],
    ['path', { d: 'M16 12 L22 19 L20 29 H12 L10 19 Z', fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 16, cy: 8.5, r: 2.2, fill: 'currentColor', stroke: 'none' }],
  ],
  // Boss medals (Boss identity): one silhouette per boss for the banner's
  // medallion, drawn to the Stag's grammar (a filled mass plus a few bold
  // strokes) so all six read as one set at 34 px. Holes (eyes, sockets) are
  // cut with evenodd so the medal stays one ink.
  // The Thornmother: a five-petal briar rose inside a thorned ring.
  boss_thornmother: [
    ['circle', { cx: 16, cy: 16, r: 11.4, 'stroke-width': 2.2 }],
    ...[0, 60, 120, 180, 240, 300].map((a) => [
      'path',
      { d: 'M14 5.4 L16 0.6 L18 5.4 Z', fill: 'currentColor', stroke: 'none', transform: `rotate(${a + 30} 16 16)` },
    ]),
    ...[0, 72, 144, 216, 288].map((a) => [
      'path',
      { d: 'M16 16 C12.2 13 12.6 7.4 16 6.4 C19.4 7.4 19.8 13 16 16 Z', fill: 'currentColor', stroke: 'none', transform: `rotate(${a} 16 16)` },
    ]),
    ['circle', { cx: 16, cy: 16, r: 2.4, fill: 'none', 'stroke-width': 1.4 }],
  ],
  // The Drowned Heron: a crested head in profile, the spear-bill out front,
  // the S of its neck below.
  boss_heron: [
    ['path', { d: 'M19.5 30 C24.5 24 14.5 20.5 18.5 14', 'stroke-width': 2.8 }],
    ['path', { d: 'M14 11 C15 7 21 5.8 23.4 8.8 C25 11 22.6 14.4 18.6 14.4 C16.4 14.4 14.6 13.2 14 11 Z M17.9 9.6 a1.3 1.3 0 1 0 2.6 0 a1.3 1.3 0 1 0 -2.6 0 Z', fill: 'currentColor', stroke: 'none', 'fill-rule': 'evenodd' }],
    ['path', { d: 'M14.6 9.8 L1.5 12.4 L14.6 12.8 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M22.4 8 L29.5 3.5 M23 9.6 L30.5 7.6', 'stroke-width': 1.7 }],
  ],
  // The Millwheel: a spoked water-wheel with paddles round the rim.
  boss_millwheel: [
    ['circle', { cx: 16, cy: 16, r: 10, 'stroke-width': 2.4 }],
    ...[0, 45, 90, 135, 180, 225, 270, 315].map((a) => [
      'path',
      { d: 'M14.4 2.2 H17.6 V6.6 H14.4 Z', fill: 'currentColor', stroke: 'none', transform: `rotate(${a + 22.5} 16 16)` },
    ]),
    ['path', { d: 'M16 6 V26 M6 16 H26 M8.9 8.9 L23.1 23.1 M23.1 8.9 L8.9 23.1', 'stroke-width': 1.6 }],
    ['circle', { cx: 16, cy: 16, r: 3.6, fill: 'currentColor', stroke: 'none' }],
  ],
  // The Barrow Wyrm: a horned dragon head in profile, jaws open, a spined
  // neck curling down out of the barrow.
  boss_wyrm: [
    ['path', { d: 'M4 30.5 C4.6 24.6 7.4 20.4 12.4 17', 'stroke-width': 4.6 }],
    ['path', { d: 'M3.2 22.6 L1.2 20.4 L4.8 20.6 Z M6 18.6 L4.6 15.8 L8 16.6 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M9.6 17.6 C9.4 11.6 13.4 7.8 18.8 7.8 L30.4 10.2 L21.8 13.6 Z M15.6 11.2 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0 Z', fill: 'currentColor', stroke: 'none', 'fill-rule': 'evenodd' }],
    ['path', { d: 'M11.2 19.4 L22.2 15.2 L27.6 20.4 L16.6 22.6 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M23.6 12.4 L24.4 14.6 M26.6 11.4 L27.4 13.4 M20.8 18.6 L21.8 16.6', 'stroke-width': 1.2 }],
    ['path', { d: 'M13 10.2 C10.4 5.4 6.6 3.6 2.6 4.4 M16.4 8.2 C15.6 5.4 13.6 3.2 11.4 2.2', 'stroke-width': 2.2 }],
  ],
  // The Lich Ram: a ram's skull, horns curled to either side, a grave-flame
  // over the brow.
  boss_lichram: [
    ['path', { d: 'M12 11.5 C6.5 7 1.8 11.5 3.6 16.8 C5.4 21.5 11 20.2 10.4 15.8 C10 13.4 7.4 13.4 7.2 15.6', 'stroke-width': 2.4 }],
    ['path', { d: 'M20 11.5 C25.5 7 30.2 11.5 28.4 16.8 C26.6 21.5 21 20.2 21.6 15.8 C22 13.4 24.6 13.4 24.8 15.6', 'stroke-width': 2.4 }],
    ['path', { d: 'M11 12.4 C11 8.6 21 8.6 21 12.4 L20 19.6 L18.2 26.4 H13.8 L12 19.6 Z M12.8 13.4 L15.2 12.6 L15.4 15.4 L13.4 15.8 Z M19.2 13.4 L16.8 12.6 L16.6 15.4 L18.6 15.8 Z M15 20.6 H17 L16 22.6 Z', fill: 'currentColor', stroke: 'none', 'fill-rule': 'evenodd' }],
    ['path', { d: 'M16 1.6 C18.4 3.8 17.6 6 16 7.2 C14.4 6 13.6 3.8 16 1.6 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // The Hollow Cantor: a hooded, faceless singer, mouth open on a note, a
  // halo of notes behind the hood.
  boss_cantor: [
    ['path', { d: 'M5.6 12.6 A10.6 10.6 0 0 1 26.4 12.6', 'stroke-width': 1.6 }],
    ...[-60, -30, 0, 30, 60].map((a) => ['circle', { cx: 16, cy: 2.6, r: 1.5, fill: 'currentColor', stroke: 'none', transform: `rotate(${a} 16 13)` }]),
    ['path', { d: 'M16 6 C10.4 6 8.2 10.6 8.4 15.4 C8.6 20 6.6 25 4.6 30.5 H27.4 C25.4 25 23.4 20 23.6 15.4 C23.8 10.6 21.6 6 16 6 Z M16 10 C13.2 10 12 12.6 12 15.2 C12 18.6 13.8 21.4 16 21.4 C18.2 21.4 20 18.6 20 15.2 C20 12.6 18.8 10 16 10 Z', fill: 'currentColor', stroke: 'none', 'fill-rule': 'evenodd' }],
    ['path', { d: 'M13.8 14.6 L15 15.2 M18.2 14.6 L17 15.2', 'stroke-width': 1.1 }],
    ['ellipse', { cx: 16, cy: 18.4, rx: 1.2, ry: 1.8, fill: 'currentColor', stroke: 'none' }],
  ],
  // The Geode Colossus: a hunched rock giant, shoulders of crystal, a geode
  // split open in its chest.
  boss_colossus: [
    ['path', { d: 'M5 30.5 L3.4 21 C3 15.6 6.6 11.4 11 10.6 L13.4 7.2 H18.6 L21 10.6 C25.4 11.4 29 15.6 28.6 21 L27 30.5 Z M16 15 L12.6 18.6 L13.6 23.4 L16 25.6 L18.4 23.4 L19.4 18.6 Z', fill: 'currentColor', stroke: 'none', 'fill-rule': 'evenodd' }],
    ['path', { d: 'M16 17.6 L15 20.4 L16 22.8 L17 20.4 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M6.4 11.6 L4.6 4.4 L9.4 9.8 Z M25.6 11.6 L27.4 4.4 L22.6 9.8 Z M11.4 9.4 L10.2 2.8 L13.6 7.6 Z M20.6 9.4 L21.8 2.8 L18.4 7.6 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M14.2 9.8 L15.2 10.4 M17.8 9.8 L16.8 10.4', 'stroke-width': 1.1 }],
  ],
  // Glint coin: rim, inner ring, a glint stroke.
  coin: [
    ['circle', { cx: 16, cy: 16, r: 12.5 }],
    ['circle', { cx: 16, cy: 16, r: 7.5, 'stroke-width': 1.8 }],
    ['path', { d: 'M9.5 11.5 L12 9', 'stroke-width': 1.8 }],
  ],
  // The Peddler's lantern: a hanging brass lamp — ring, cap, glazed body with
  // a flame inside, and a base. Stands ON the shelf's title rail so the panel
  // has a real light SOURCE instead of an abstract bead (REFERENCE_BAR check 2
  // "every emitter has a glow halo" — the halo is the .rn-lamp pool behind it).
  lantern: [
    ['path', { d: 'M16 2 A2.6 2.6 0 0 1 16 7.2', 'stroke-width': 1.8 }],
    ['path', { d: 'M11 9 H21 L19.5 11.5 H12.5 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M12.5 11.5 H19.5 L21 24 H11 Z' }],
    ['path', { d: 'M9 26 H23 L21.5 29 H10.5 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M16 14 C18.6 17 18.6 20.4 16 22.6 C13.4 20.4 13.4 17 16 14 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Location marker: a compass diamond on a pin.
  marker: [
    ['path', { d: 'M16 3 L22 14 L16 25 L10 14 Z' }],
    ['path', { d: 'M16 25 V29 M11 29 H21', 'stroke-width': 1.8 }],
    ['circle', { cx: 16, cy: 14, r: 2, fill: 'currentColor', stroke: 'none' }],
  ],
  // Dodge: double chevron dash (unchanged from the old drawn glyph).
  dodge: [
    ['path', { d: 'M4 6 L13 16 L4 26 L8.5 26 L17.5 16 L8.5 6 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M14 6 L23 16 L14 26 L18.5 26 L27.5 16 L18.5 6 Z', fill: 'currentColor', stroke: 'none' }],
  ],
};

export const ICON_IDS = Object.freeze(Object.keys(ICONS));
export const hasIcon = (id) => Object.prototype.hasOwnProperty.call(ICONS, id);

const STROKE = { fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

function attrsOf(a) {
  const out = { ...STROKE, ...a };
  return out;
}

// SVG element (for the command bar / banner, which build their DOM by hand).
export function iconEl(id, { size = 32, cls = '' } = {}) {
  const prims = ICONS[id];
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `ico ico-${id}${cls ? ' ' + cls : ''}`);
  svg.dataset.icon = id;
  if (!prims) {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', '16');
    c.setAttribute('cy', '16');
    c.setAttribute('r', '3');
    c.setAttribute('fill', 'currentColor');
    svg.appendChild(c);
    return svg;
  }
  for (const [tag, a] of prims) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrsOf(a))) n.setAttribute(k, String(v));
    svg.appendChild(n);
  }
  return svg;
}

// Markup string (for the run cards, which render through innerHTML).
export function iconHtml(id, { size = 32, cls = '' } = {}) {
  const prims = ICONS[id];
  const body = prims
    ? prims
        .map(([tag, a]) => {
          const attrs = Object.entries(attrsOf(a))
            .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
            .join(' ');
          return `<${tag} ${attrs}/>`;
        })
        .join('')
    : '<circle cx="16" cy="16" r="3" fill="currentColor"/>';
  return `<svg class="ico ico-${id}${cls ? ' ' + cls : ''}" data-icon="${id}" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}
