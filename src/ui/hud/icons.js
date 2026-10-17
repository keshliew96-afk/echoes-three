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

  // ---------------------------- MORE CLASS SKILLS (docs/CLASS_SKILLS.md) --
  // Lantern Ward: a lantern hanging over a ward arc (heal plus ward).
  lantern_ward: [
    ['path', { d: 'M16 3 V7 M12 7 H20 L22 11 V18 L20 21 H12 L10 18 V11 Z' }],
    ['circle', { cx: 16, cy: 14.5, r: 2.4, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M4 27 A13 9 0 0 1 28 27', 'stroke-width': 1.8 }],
  ],
  // Dawn Brand: a sun sigil on the ground, rays out (damage zone, exposes).
  dawn_brand: [
    ['circle', { cx: 16, cy: 16, r: 5, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M16 3 V8 M16 24 V29 M3 16 H8 M24 16 H29 M7 7 L10.5 10.5 M21.5 21.5 L25 25 M25 7 L21.5 10.5 M10.5 21.5 L7 25', 'stroke-width': 1.8 }],
  ],
  // Earthshatter: a fault zig-zagging away from a fist-stone.
  earthshatter: [
    ['path', { d: 'M3 25 L9 21 L12 24 L17 15 L20 18 L27 5', 'stroke-width': 2.6 }],
    ['path', { d: 'M3 29 H29', 'stroke-width': 1.6 }],
    ['path', { d: 'M22 22 L25 19 L28 22 L25 25 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Rallying Cry: a horn with three sound arcs.
  rallying_cry: [
    ['path', { d: 'M4 20 L14 13 V25 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M18 12 A6 6 0 0 1 18 26', 'stroke-width': 1.8 }],
    ['path', { d: 'M22 8 A11 11 0 0 1 22 30', 'stroke-width': 1.8 }],
    ['path', { d: 'M26 5 A15 15 0 0 1 26 31', 'stroke-width': 1.4 }],
  ],
  // Earthen Grasp: four arrows pulling into a stone core.
  earthen_grasp: [
    ['circle', { cx: 16, cy: 16, r: 3.6, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M3 3 L10 10 M29 3 L22 10 M3 29 L10 22 M29 29 L22 22', 'stroke-width': 2.2 }],
    ['path', { d: 'M10 6 V10 H6 M22 6 V10 H26 M10 26 V22 H6 M22 26 V22 H26', 'stroke-width': 1.8 }],
  ],
  // Moonfang: a crescent moon with a fang tip.
  moonfang: [
    ['path', { d: 'M22 4 A12 12 0 1 0 28 22 A9 9 0 1 1 22 4 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M27 23 L30 30 L23 27', 'stroke-width': 1.8 }],
  ],
  // Blade Dance: three blades in a spinning triskele.
  blade_dance: [
    ...[0, 120, 240].map((a) => ['path', { d: 'M16 16 Q22 8 16 3', 'stroke-width': 2.4, transform: `rotate(${a} 16 16)` }]),
    ['circle', { cx: 16, cy: 16, r: 2.2, fill: 'currentColor', stroke: 'none' }],
  ],
  // Crimson Edge: a sword edge with a falling drop (passive crit field).
  crimson_edge: [
    ['path', { d: 'M5 27 L23 9 L27 5 L23 13 L9 27 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M24 19 C26 22 27 24 25 26 C23 27 21.5 25 22 23 Z' }],
  ],
  // Hunter's Mark: crosshairs around a dot.
  hunters_mark: [
    ['circle', { cx: 16, cy: 16, r: 9 }],
    ['path', { d: 'M16 2 V10 M16 22 V30 M2 16 H10 M22 16 H30', 'stroke-width': 1.8 }],
    ['circle', { cx: 16, cy: 16, r: 2.4, fill: 'currentColor', stroke: 'none' }],
  ],
  // Barbed Trap: open jaws with teeth.
  barbed_trap: [
    ['path', { d: 'M3 17 A13 11 0 0 0 29 17', 'stroke-width': 2.2 }],
    ['path', { d: 'M3 15 A13 11 0 0 1 29 15', 'stroke-width': 2.2 }],
    ['path', { d: 'M8 10 L10 15 L12 8 L14 15 L16 7 L18 15 L20 8 L22 15 L24 10', 'stroke-width': 1.4 }],
  ],
  // Feather Fan: five feathers fanned from one point.
  feather_fan: [
    ...[-50, -25, 0, 25, 50].map((a) => ['path', { d: 'M16 28 L16 6 M16 9 L13 13 M16 9 L19 13', 'stroke-width': 1.6, transform: `rotate(${a} 16 28)` }]),
  ],
  // THE TIDECALLER (docs/TIDECALLER.md).
  // Riverbolt: a water drop flying, with a wave trail.
  riverbolt: [
    ['path', { d: 'M27 7 C22 7 16 11 16 16 C16 19 18.5 21 21.5 21 C25 21 27 17 27 7 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M3 14 Q6 11 9 14 T15 14', 'stroke-width': 1.8 }],
    ['path', { d: 'M4 21 Q7 18 10 21 T16 21', 'stroke-width': 1.6 }],
  ],
  // Undertow: a spiral pulling into its centre over a ground line.
  undertow: [
    ['path', { d: 'M16 15 C18 15 18.5 12.5 16.5 11.5 C13.5 10 11 13 12 16 C13.5 20 20 20.5 22 16 C24.5 10.5 19 5.5 13 7 C7 8.5 5 15 7.5 20', 'stroke-width': 2 }],
    ['path', { d: 'M3 27 H29', 'stroke-width': 2 }],
  ],
  // Breaker: a curling wave crest breaking outward.
  breaker: [
    ['path', { d: 'M3 25 C6 13 14 6 23 7 C28 8 29 13 25 15 C22 16.5 19 14 21 11 C15 11 11 17 11 25 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M2 28.5 H30', 'stroke-width': 2 }],
  ],
  // Tidepool: three ripples around a pebble (passive soak field).
  tidepool: [
    ['ellipse', { cx: 16, cy: 18, rx: 13, ry: 8, 'stroke-width': 1.4, 'stroke-dasharray': '3 3' }],
    ['ellipse', { cx: 16, cy: 18, rx: 8.5, ry: 5, 'stroke-width': 1.8 }],
    ['ellipse', { cx: 16, cy: 18, rx: 3.6, ry: 2.4, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M16 3 C18.5 6.5 19.5 8.5 17.8 10.2 C16.8 11 15.2 11 14.2 10.2 C12.5 8.5 13.5 6.5 16 3 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // THE DUSKWING (docs/DUSKWING.md).
  // Dusk Dive: a bat stooping down a streak onto a burst ring.
  dusk_dive: [
    ['path', { d: 'M16 9 L13.5 6 L12.5 10 C9 9 6 7 2 8 C4 10 4.5 12 4 14 C6 13 8 13.5 9.5 15 C11 13.5 13 13.5 14 15 L16 17 L18 15 C19 13.5 21 13.5 22.5 15 C24 13.5 26 13 28 14 C27.5 12 28 10 30 8 C26 7 23 9 19.5 10 L18.5 6 Z', fill: 'currentColor', stroke: 'none', transform: 'translate(2 -1) scale(0.8) rotate(28 16 12)' }],
    ['path', { d: 'M4 4 L13 15 M9 3 L16 12', 'stroke-width': 1.4 }],
    ['ellipse', { cx: 21, cy: 26, rx: 9, ry: 3.2, 'stroke-width': 1.8 }],
    ['path', { d: 'M21 20 V23 M15 21 L17 23.5 M27 21 L25 23.5', 'stroke-width': 1.4 }],
  ],
  // Bloodbite: two fangs closing, a drop between them.
  blood_bite: [
    ['path', { d: 'M5 6 Q16 12 27 6', 'stroke-width': 2.2 }],
    ['path', { d: 'M9 8 L11.5 17 L14 9 Z M18 9 L20.5 17 L23 8 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M16 19 C18.5 22.5 19 24.5 17.5 26 C16.8 26.7 15.2 26.7 14.5 26 C13 24.5 13.5 22.5 16 19 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M5 27 Q16 22 27 27', 'stroke-width': 1.4 }],
  ],
  // Nightfall: spread wings under a crescent moon, the dark falling.
  nightfall: [
    ['path', { d: 'M16 9 L13.5 6 L12.5 10 C9 9 6 7 2 8 C4 10 4.5 12 4 14 C6 13 8 13.5 9.5 15 C11 13.5 13 13.5 14 15 L16 17 L18 15 C19 13.5 21 13.5 22.5 15 C24 13.5 26 13 28 14 C27.5 12 28 10 30 8 C26 7 23 9 19.5 10 L18.5 6 Z', fill: 'currentColor', stroke: 'none', transform: 'translate(0 6)' }],
    ['path', { d: 'M20 2.5 A6 6 0 1 0 25.5 10 A4.6 4.6 0 1 1 20 2.5 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M5 27 L5 30 M11 26 L11 30 M16 25 L16 30 M21 26 L21 30 M27 27 L27 30', 'stroke-width': 1.4 }],
  ],
  // Night Wings: one wing beating, gust arcs off its edge.
  night_wings: [
    ['path', { d: 'M5 22 L12 6 C14 10 18 12 26 12 C24 15 24 17 25 19 C22 18 19 18.5 17.5 21 C15 19 12.5 19.5 11 22 C9 20.5 7 21 5 22 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M24 23 Q28 26 25 30 M19 25 Q22 27 20 30', 'stroke-width': 1.5 }],
  ],
  // THE DUSKWING, the rest of his kit (content plan 5, slice 5).
  // Echo Screech: an open mouth throwing a cone of sound arcs.
  echo_screech: [
    ['path', { d: 'M3 16 L9 12 L9 20 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M13 10 Q16 16 13 22 M18 7 Q22.5 16 18 25 M23 4 Q29 16 23 28', 'stroke-width': 1.8 }],
    ['path', { d: 'M9 12 L29 3 M9 20 L29 29', 'stroke-width': 1, 'stroke-dasharray': '2 2' }],
  ],
  // Talon Rake: three claw marks under a sweeping arc.
  talon_rake: [
    ['path', { d: 'M4 13 A14 14 0 0 1 28 13', 'stroke-width': 1.6, 'stroke-dasharray': '3 2' }],
    ...[9, 16, 23].map((x) => ['path', { d: `M${x - 3} 13 Q${x + 1} 20 ${x - 1} 29 Q${x + 3} 21 ${x + 1} 13 Z`, fill: 'currentColor', stroke: 'none' }]),
  ],
  // Bat Swarm: three small bats over a ring on the ground.
  bat_swarm: [
    ['path', { d: 'M16 9 L13.5 6 L12.5 10 C9 9 6 7 2 8 C4 10 4.5 12 4 14 C6 13 8 13.5 9.5 15 C11 13.5 13 13.5 14 15 L16 17 L18 15 C19 13.5 21 13.5 22.5 15 C24 13.5 26 13 28 14 C27.5 12 28 10 30 8 C26 7 23 9 19.5 10 L18.5 6 Z', fill: 'currentColor', stroke: 'none', transform: 'translate(1 1) scale(0.5)' }],
    ['path', { d: 'M16 9 L13.5 6 L12.5 10 C9 9 6 7 2 8 C4 10 4.5 12 4 14 C6 13 8 13.5 9.5 15 C11 13.5 13 13.5 14 15 L16 17 L18 15 C19 13.5 21 13.5 22.5 15 C24 13.5 26 13 28 14 C27.5 12 28 10 30 8 C26 7 23 9 19.5 10 L18.5 6 Z', fill: 'currentColor', stroke: 'none', transform: 'translate(15 -1) scale(0.5)' }],
    ['path', { d: 'M16 9 L13.5 6 L12.5 10 C9 9 6 7 2 8 C4 10 4.5 12 4 14 C6 13 8 13.5 9.5 15 C11 13.5 13 13.5 14 15 L16 17 L18 15 C19 13.5 21 13.5 22.5 15 C24 13.5 26 13 28 14 C27.5 12 28 10 30 8 C26 7 23 9 19.5 10 L18.5 6 Z', fill: 'currentColor', stroke: 'none', transform: 'translate(8 8) scale(0.5)' }],
    ['ellipse', { cx: 16, cy: 26, rx: 13, ry: 4, 'stroke-width': 1.6, 'stroke-dasharray': '3 2' }],
  ],
  // Shadow Veil: folded wings closed round a shield.
  shadow_veil: [
    ['path', { d: 'M11 9 H21 V16 C21 21 16 24 16 24 C16 24 11 21 11 16 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M9 4 C3 9 3 21 9 28 C8 23 6.5 22 7.5 19 C6 17 6 14 7.5 12 C6.5 9 8 7 9 4 Z M23 4 C29 9 29 21 23 28 C24 23 25.5 22 24.5 19 C26 17 26 14 24.5 12 C25.5 9 24 7 23 4 Z', fill: 'currentColor', stroke: 'none', 'fill-opacity': 0.75 }],
  ],
  // Flit: a bat darting off along an arc, a puff of night left behind.
  flit: [
    ['path', { d: 'M16 9 L13.5 6 L12.5 10 C9 9 6 7 2 8 C4 10 4.5 12 4 14 C6 13 8 13.5 9.5 15 C11 13.5 13 13.5 14 15 L16 17 L18 15 C19 13.5 21 13.5 22.5 15 C24 13.5 26 13 28 14 C27.5 12 28 10 30 8 C26 7 23 9 19.5 10 L18.5 6 Z', fill: 'currentColor', stroke: 'none', transform: 'translate(14 1) scale(0.55)' }],
    ['path', { d: 'M7 22 Q10 10 19 8', 'stroke-width': 1.6, 'stroke-dasharray': '3 2' }],
    ['circle', { cx: 7, cy: 25, r: 4.5, fill: 'currentColor', stroke: 'none', 'fill-opacity': 0.6 }],
    ['circle', { cx: 12, cy: 27, r: 3, fill: 'currentColor', stroke: 'none', 'fill-opacity': 0.6 }],
  ],
  // Blood Scent: a nose's three curls of scent rising to a drop.
  blood_scent: [
    ['path', { d: 'M16 3 C19 7.5 19.5 9.5 18 11.2 C17.2 12 14.8 12 14 11.2 C12.5 9.5 13 7.5 16 3 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M9 28 Q5 23 9 19 Q13 15 9 11 M16 29 Q12 24 16 20 Q20 16 16 14 M23 28 Q27 23 23 19 Q19 15 23 11', 'stroke-width': 1.6 }],
  ],
  // Blood Moon: a full moon behind a bat, a rim of drops beneath.
  blood_moon: [
    ['circle', { cx: 16, cy: 13, r: 10, 'stroke-width': 2 }],
    ['circle', { cx: 16, cy: 13, r: 6.5, fill: 'currentColor', stroke: 'none', 'fill-opacity': 0.4 }],
    ['path', { d: 'M16 9 L13.5 6 L12.5 10 C9 9 6 7 2 8 C4 10 4.5 12 4 14 C6 13 8 13.5 9.5 15 C11 13.5 13 13.5 14 15 L16 17 L18 15 C19 13.5 21 13.5 22.5 15 C24 13.5 26 13 28 14 C27.5 12 28 10 30 8 C26 7 23 9 19.5 10 L18.5 6 Z', fill: 'currentColor', stroke: 'none', transform: 'translate(4 4) scale(0.75)' }],
    ['path', { d: 'M6 27 L6 30 M11 26 L11 30 M16 25.5 L16 30 M21 26 L21 30 M26 27 L26 30', 'stroke-width': 1.4 }],
  ],
  // THE BELLWRIGHT (docs/BELLWRIGHT.md).
  // Hang Bell: a bell hung from a hook, with a ring on the ground beneath.
  hang_bell: [
    ['path', { d: 'M16 2 V6', 'stroke-width': 2 }],
    ['path', { d: 'M16 6 C11.5 6 10.5 10 10.5 14 C10.5 17 9.5 18.5 8 20 H24 C22.5 18.5 21.5 17 21.5 14 C21.5 10 20.5 6 16 6 Z', fill: 'currentColor', stroke: 'none' }],
    ['ellipse', { cx: 16, cy: 26, rx: 12, ry: 3.6, 'stroke-width': 1.6, 'stroke-dasharray': '3 2.5' }],
  ],
  // Peal: three small bells ringing at once, sound arcs over them.
  peal: [
    ...[[7, 19], [16, 13], [25, 19]].map(([x, y]) => ['path', { d: `M${x} ${y - 6} C${x - 3.5} ${y - 6} ${x - 4} ${y - 2} ${x - 4} ${y + 1} L${x - 5} ${y + 3} H${x + 5} L${x + 4} ${y + 1} C${x + 4} ${y - 2} ${x + 3.5} ${y - 6} ${x} ${y - 6} Z`, fill: 'currentColor', stroke: 'none' }]),
    ['path', { d: 'M5 6 Q16 -1 27 6', 'stroke-width': 1.6 }],
    ['path', { d: 'M3 28 Q16 31 29 28', 'stroke-width': 1.4 }],
  ],
  // Clapper: a bell's clapper flying, with speed lines.
  clapper: [
    ['path', { d: 'M8 24 L20 12', 'stroke-width': 2.4 }],
    ['circle', { cx: 23, cy: 9, r: 4.5, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M3 20 H9 M5 26 H11 M2 14 H7', 'stroke-width': 1.4 }],
  ],
  // Hum: a beetle shell with sound waves rising off it.
  hum: [
    ['path', { d: 'M7 26 C7 16 11 12 16 12 C21 12 25 16 25 26 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M16 12 V26', 'stroke-width': 1.2, stroke: 'black', 'stroke-opacity': 0.5 }],
    ['path', { d: 'M9 8 Q16 3 23 8 M5 5 Q16 -2 27 5', 'stroke-width': 1.6 }],
  ],
  // Great Bell: a big bell on a beam, a wide ring beneath.
  great_bell: [
    ['path', { d: 'M4 4 H28', 'stroke-width': 2.4 }],
    ['path', { d: 'M16 5 C10.5 5 9.5 12.65 9.5 16.9 C9.5 19.45 8 20.81 6 22 H26 C24 20.81 22.5 19.45 22.5 16.9 C22.5 12.65 21.5 5 16 5 Z', fill: 'currentColor', stroke: 'none' }],
    ['ellipse', { cx: 16, cy: 27, rx: 14, ry: 3.4, 'stroke-width': 1.6, 'stroke-dasharray': '3 2' }],
  ],
  // Knell: a struck note running a line through three marks.
  knell: [
    ['path', { d: 'M3 16 H29', 'stroke-width': 2.2 }],
    ['path', { d: 'M24 11 L29 16 L24 21', 'stroke-width': 2 }],
    ...[8, 15, 22].map((x) => ['path', { d: `M${x} 9 Q${x + 3} 16 ${x} 23`, 'stroke-width': 1.5 }]),
    ['circle', { cx: 5, cy: 16, r: 3, fill: 'currentColor', stroke: 'none' }],
  ],
  // Bell Swing: a bell at the end of a sweeping arc.
  bell_swing: [
    ['path', { d: 'M5 26 A20 20 0 0 1 26 6', 'stroke-width': 1.8, 'stroke-dasharray': '3 2.5' }],
    ['path', { d: 'M19 9 C15.7 9 15.1 13.95 15.1 16.7 C15.1 18.35 14.2 19.23 13 20 H25 C23.8 19.23 22.9 18.35 22.9 16.7 C22.9 13.95 22.3 9 19 9 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M5 26 L14 15', 'stroke-width': 2.2 }],
  ],
  // Wing Hop: an opened wing case over an arc, a small bell left below.
  wing_hop: [
    ['path', { d: 'M6 14 Q14 2 26 6', 'stroke-width': 1.8, 'stroke-dasharray': '3 2' }],
    ['path', { d: 'M18 6 C22 2 29 3 29 9 C25 8 21 9 18 6 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M8 18 C5.53 18 5.07 21.6 5.07 23.6 C5.07 24.8 4.4 25.44 3.5 26 H12.5 C11.6 25.44 10.93 24.8 10.93 23.6 C10.93 21.6 10.47 18 8 18 Z', fill: 'currentColor', stroke: 'none' }],
    ['ellipse', { cx: 8, cy: 28, rx: 6, ry: 1.8, 'stroke-width': 1.3 }],
  ],
  // Vesper Chime: a little bell over two shields.
  vesper_chime: [
    ['path', { d: 'M16 2 C13.25 2 12.75 6.05 12.75 8.3 C12.75 9.65 12 10.37 11 11 H21 C20 10.37 19.25 9.65 19.25 8.3 C19.25 6.05 18.75 2 16 2 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M3 15 H13 V21 C13 25 8 28 8 28 C8 28 3 25 3 21 Z', 'stroke-width': 1.8 }],
    ['path', { d: 'M19 15 H29 V21 C29 25 24 28 24 28 C24 28 19 25 19 21 Z', 'stroke-width': 1.8 }],
  ],
  // Tuning Fork: a fork with sound arcs on both sides.
  tuning_fork: [
    ['path', { d: 'M12 4 V15 C12 19 20 19 20 15 V4', 'stroke-width': 2.4 }],
    ['path', { d: 'M16 18 V29', 'stroke-width': 2.6 }],
    ['path', { d: 'M7 7 Q4 11 7 15 M25 7 Q28 11 25 15 M3 5 Q-1 11 3 17 M29 5 Q33 11 29 17', 'stroke-width': 1.4 }],
  ],
  // Carillon: a row of four bells under one beam, struck together.
  carillon: [
    ['path', { d: 'M2 5 H30', 'stroke-width': 2 }],
    ...[6, 12.6, 19.4, 26].map((x, i) => ['path', { d: `M${x} ${7 + (i % 2) * 3} C${x - 2.6} ${7 + (i % 2) * 3} ${x - 3} ${11 + (i % 2) * 3} ${x - 3} ${14 + (i % 2) * 3} L${x - 3.6} ${16 + (i % 2) * 3} H${x + 3.6} L${x + 3} ${14 + (i % 2) * 3} C${x + 3} ${11 + (i % 2) * 3} ${x + 2.6} ${7 + (i % 2) * 3} ${x} ${7 + (i % 2) * 3} Z`, fill: 'currentColor', stroke: 'none' }]),
    ['path', { d: 'M3 25 Q16 31 29 25', 'stroke-width': 1.6 }],
  ],
  // Bronze (node): a bell with an hourglass beside it (a longer toll).
  bronze: [
    ['path', { d: 'M11 6 C7.15 6 6.45 12.3 6.45 15.8 C6.45 17.9 5.4 19.02 4 20 H18 C16.6 19.02 15.55 17.9 15.55 15.8 C15.55 12.3 14.85 6 11 6 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M21 8 H29 L25 15 L29 22 H21 L25 15 Z', 'stroke-width': 1.6 }],
    ['path', { d: 'M4 26 H18', 'stroke-width': 1.6 }],
  ],
  // Clangour (node): a bell throwing a heavy zigzag wave.
  clangour: [
    ['path', { d: 'M10 6 C6.7 6 6.1 11.4 6.1 14.4 C6.1 16.2 5.2 17.16 4 18 H16 C14.8 17.16 13.9 16.2 13.9 14.4 C13.9 11.4 13.3 6 10 6 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M18 8 L22 12 L18 16 L22 20 L18 24 M24 6 L28 11 L24 16 L28 21 L24 26', 'stroke-width': 1.8 }],
  ],
  // Resound (node): a struck star inside a ring.
  resound: [
    ['circle', { cx: 16, cy: 16, r: 12, 'stroke-width': 1.6, 'stroke-dasharray': '3 2.5' }],
    ['path', { d: 'M16 7 L18.5 13.5 L25 16 L18.5 18.5 L16 25 L13.5 18.5 L7 16 L13.5 13.5 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Aftertone (node): a bell with a fading trail of arcs.
  aftertone: [
    ['path', { d: 'M9 8 C5.7 8 5.1 13.4 5.1 16.4 C5.1 18.2 4.2 19.16 3 20 H15 C13.8 19.16 12.9 18.2 12.9 16.4 C12.9 13.4 12.3 8 9 8 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M18 10 Q21 14 18 18', 'stroke-width': 2 }],
    ['path', { d: 'M22 8 Q26 14 22 20', 'stroke-width': 1.6 }],
    ['path', { d: 'M26 6 Q31 14 26 22', 'stroke-width': 1.1, 'stroke-dasharray': '2 2' }],
  ],
  // Tuned (node): a tuning fork standing in a ring.
  tuned: [
    ['ellipse', { cx: 16, cy: 25, rx: 13, ry: 4, 'stroke-width': 1.6, 'stroke-dasharray': '3 2' }],
    ['path', { d: 'M12 3 V12 C12 16 20 16 20 12 V3', 'stroke-width': 2.2 }],
    ['path', { d: 'M16 15 V25', 'stroke-width': 2.4 }],
  ],
  // Cloister (node): a shield inside a ring.
  cloister: [
    ['ellipse', { cx: 16, cy: 26, rx: 13, ry: 3.6, 'stroke-width': 1.6, 'stroke-dasharray': '3 2' }],
    ['path', { d: 'M9 4 H23 V13 C23 19 16 23 16 23 C16 23 9 19 9 13 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Belfry (node): a tower with a bell in its arch.
  belfry: [
    ['path', { d: 'M16 2 L26 10 H6 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M8 10 V29 H24 V10', 'stroke-width': 1.8 }],
    ['path', { d: 'M16 12 C13.53 12 13.07 16.05 13.07 18.3 C13.07 19.65 12.4 20.37 11.5 21 H20.5 C19.6 20.37 18.93 19.65 18.93 18.3 C18.93 16.05 18.48 12 16 12 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Sympathy (node): two bells, a spark leaping from one to the other.
  sympathy: [
    ['path', { d: 'M8 10 C4.97 10 4.42 14.95 4.42 17.7 C4.42 19.35 3.6 20.23 2.5 21 H13.5 C12.4 20.23 11.57 19.35 11.57 17.7 C11.57 14.95 11.03 10 8 10 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M24 10 C20.98 10 20.43 14.95 20.43 17.7 C20.43 19.35 19.6 20.23 18.5 21 H29.5 C28.4 20.23 27.57 19.35 27.57 17.7 C27.57 14.95 27.02 10 24 10 Z', 'stroke-width': 1.6 }],
    ['path', { d: 'M12 6 L16 9 L14 11 L20 14', 'stroke-width': 1.6 }],
  ],
  // THE DUSKWING's nodes (docs/DUSKWING.md).
  // Deep Dive (node): a stooping arrow down past a floor line.
  deep_dive: [
    ['path', { d: 'M8 3 L22 23', 'stroke-width': 2.4 }],
    ['path', { d: 'M15 22 L23 25 L23 16', 'stroke-width': 2.2 }],
    ['path', { d: 'M3 28 H29', 'stroke-width': 1.6 }],
  ],
  // Thirst (node): a drop over an empty cup.
  thirst: [
    ['path', { d: 'M16 3 C19.5 8 20 10.5 18.2 12.4 C17.2 13.4 14.8 13.4 13.8 12.4 C12 10.5 12.5 8 16 3 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M7 16 H25 L22 28 H10 Z', 'stroke-width': 1.8 }],
  ],
  // Gloom (node): an eye shut under a dark cloud.
  gloom: [
    ['path', { d: 'M6 15 C3 15 2 12 4.5 10.5 C4 7 8 5.5 10 7.5 C11.5 4 17 4 18.5 7.5 C21 5.5 25.5 7 25 10.5 C28.5 11 28.5 15 25.5 15 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M6 23 Q16 30 26 23', 'stroke-width': 2 }],
    ['path', { d: 'M10 25.5 L8.5 28.5 M16 27 V30 M22 25.5 L23.5 28.5', 'stroke-width': 1.4 }],
  ],
  // Ambush (node): fangs over a shut eye.
  ambush: [
    ['path', { d: 'M5 10 Q16 16 27 10', 'stroke-width': 2 }],
    ['path', { d: 'M10 12 L12 20 L14 13 Z M18 13 L20 20 L22 12 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M8 26 Q16 30 24 26', 'stroke-width': 1.6 }],
  ],
  // Echolocate (node): rings sounding out from a point onto a mark.
  echolocate: [
    ['circle', { cx: 6, cy: 16, r: 2.5, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M11 10 Q14 16 11 22 M15 7 Q19.5 16 15 25', 'stroke-width': 1.6 }],
    ['path', { d: 'M24 12 L28 16 L24 20 L20 16 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Frenzy (node): three strokes and a speed streak.
  frenzy: [
    ['path', { d: 'M5 24 L12 6 M12 26 L19 8 M19 28 L26 10', 'stroke-width': 2.2 }],
    ['path', { d: 'M3 16 H9 M2 20 H7', 'stroke-width': 1.4 }],
  ],
  // Vampire (node): a bat over a shield.
  vampire: [
    ['path', { d: 'M16 9 L13.5 6 L12.5 10 C9 9 6 7 2 8 C4 10 4.5 12 4 14 C6 13 8 13.5 9.5 15 C11 13.5 13 13.5 14 15 L16 17 L18 15 C19 13.5 21 13.5 22.5 15 C24 13.5 26 13 28 14 C27.5 12 28 10 30 8 C26 7 23 9 19.5 10 L18.5 6 Z', fill: 'currentColor', stroke: 'none', transform: 'translate(4 -2) scale(0.75)' }],
    ['path', { d: 'M9 15 H23 V21 C23 26 16 29 16 29 C16 29 9 26 9 21 Z', 'stroke-width': 1.8 }],
  ],
  // Eclipse (node): a moon swallowed by a dark disc, rays round it.
  eclipse: [
    ['circle', { cx: 16, cy: 16, r: 8, 'stroke-width': 1.8 }],
    ['circle', { cx: 19, cy: 14, r: 7, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M16 2 V5 M16 27 V30 M2 16 H5 M27 16 H30 M6 6 L8 8 M24 24 L26 26 M26 6 L24 8 M6 26 L8 24', 'stroke-width': 1.4 }],
  ],
  // Rampart (node): a tower wall with crenels.
  rampart: [
    ['path', { d: 'M6 28 V10 H10 V6 H14 V10 H18 V6 H22 V10 H26 V28 Z' }],
    ['path', { d: 'M13 28 V21 A3 3 0 0 1 19 21 V28', fill: 'currentColor', stroke: 'none' }],
  ],
  // Crush (node): a hammer over a cracked star (stunned or taunted bonus).
  crush: [
    ['path', { d: 'M7 5 H21 V12 H7 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M14 12 V20', 'stroke-width': 2.6 }],
    ['path', { d: 'M6 27 L11 23 L16 27 L21 23 L26 27', 'stroke-width': 1.8 }],
  ],
  // Gale Step (node): a boot print trailing wind.
  gale_step: [
    ['path', { d: 'M18 5 H25 V20 L28 25 H14 V20 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M2 10 H12 M4 16 H11 M2 22 H10', 'stroke-width': 1.8 }],
  ],
  // Duel (node): two crossed blades over one target ring.
  duel: [
    ['path', { d: 'M5 5 L22 22 M27 5 L10 22', 'stroke-width': 2.4 }],
    ['circle', { cx: 16, cy: 26, r: 3.2 }],
  ],
  // Longshot (node): a long arrow with distance ticks.
  longshot: [
    ['path', { d: 'M3 16 H27', 'stroke-width': 2 }],
    ['path', { d: 'M22 11 L28 16 L22 21', 'stroke-width': 2 }],
    ['path', { d: 'M7 22 V26 M13 22 V26 M19 22 V26', 'stroke-width': 1.4 }],
  ],
  // Prey (node): a paw print under a small mark.
  prey: [
    ['circle', { cx: 16, cy: 21, r: 5, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 8, cy: 13, r: 2.4, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 13, cy: 9, r: 2.4, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 19, cy: 9, r: 2.4, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 24, cy: 13, r: 2.4, fill: 'currentColor', stroke: 'none' }],
  ],

  // ------------------ THE TIDECALLER, the rest of her kit (slice 3) --
  // Torrent: a straight jet bursting from a nozzle of foam, through two marks.
  torrent: [
    ['path', { d: 'M3 13 H24 L29 16 L24 19 H3 Z', fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 4, cy: 16, r: 4.2 }],
    ['path', { d: 'M12 8 V11 M18 8 V11 M12 21 V24 M18 21 V24', 'stroke-width': 1.6 }],
  ],
  // Whirlpool: a tight spiral inside a ring of foam.
  whirlpool: [
    ['circle', { cx: 16, cy: 16, r: 13, 'stroke-width': 1.4, 'stroke-dasharray': '3 2.5' }],
    ['path', { d: 'M16 16 C17.5 16 17.5 14 16 13.5 C13.5 13 12 16 13 18.5 C14.5 21.5 20 21 21 17 C22 12 18 9 14 9.5 C9 10.5 7.5 16 9.5 20.5', 'stroke-width': 2.2 }],
  ],
  // Ripple Step: an arc vaulting away from a ripple left behind.
  ripple_step: [
    ['ellipse', { cx: 9, cy: 24, rx: 6.5, ry: 3, 'stroke-width': 1.8 }],
    ['ellipse', { cx: 9, cy: 24, rx: 2.4, ry: 1.1, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M10 19 C12 7 22 5 27 12', 'stroke-width': 2.2, 'stroke-dasharray': '3 2.5' }],
    ['path', { d: 'M22 11.5 L27.5 12.5 L28 7', 'stroke-width': 2 }],
  ],
  // Bubble Ward: a bubble with a highlight around a small figure.
  bubble_ward: [
    ['circle', { cx: 16, cy: 16, r: 12.5, 'stroke-width': 2 }],
    ['path', { d: 'M9 11 A8 8 0 0 1 14 7', 'stroke-width': 2 }],
    ['circle', { cx: 16, cy: 14, r: 2.6, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M11.5 23 C12 19 20 19 20.5 23 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Crashing Wave: a tall wave rolling right over three splash dots.
  crashing_wave: [
    ['path', { d: 'M2 27 C3 15 10 6 20 5 C27 4.5 30 10 27 13 C24 15.5 20 13 22 9.5 C15 10 12 18 13 27 Z', fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 20, cy: 22, r: 1.6, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 25, cy: 19, r: 1.6, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 28, cy: 24, r: 1.6, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M1 29.5 H31', 'stroke-width': 1.8 }],
  ],
  // Rain Squall: a cloud with slanting rain over a ripple.
  rain_squall: [
    ['path', { d: 'M8 14 A5 5 0 0 1 10 5 A7 7 0 0 1 23 6 A5 5 0 0 1 25 14 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M10 17 L8 22 M16 17 L14 22 M22 17 L20 22 M13 23 L11.5 26.5 M19 23 L17.5 26.5', 'stroke-width': 1.8 }],
    ['path', { d: 'M5 29 Q16 26 27 29', 'stroke-width': 1.4 }],
  ],
  // Maelstrom: a funnel narrowing to a point, with inward arrows.
  maelstrom: [
    ['path', { d: 'M3 6 H29 M6 11 H26 M9 16 H23 M12 21 H20 M15 26 H17', 'stroke-width': 2.2 }],
    ['path', { d: 'M2 18 L6 22 L2 26 M30 18 L26 22 L30 26', 'stroke-width': 1.6 }],
  ],
  // Her nodes.
  // Wellspring (node): a spring welling up from a ring (longer soaks).
  wellspring: [
    ['path', { d: 'M16 3 C19 8 20.5 11 18.5 13.5 C17.5 14.6 14.5 14.6 13.5 13.5 C11.5 11 13 8 16 3 Z', fill: 'currentColor', stroke: 'none' }],
    ['ellipse', { cx: 16, cy: 22, rx: 12, ry: 5, 'stroke-width': 1.8 }],
    ['path', { d: 'M16 17 V22', 'stroke-width': 1.6 }],
  ],
  // Deluge (node): a falling bolt leaving a puddle.
  deluge: [
    ['path', { d: 'M16 3 V15', 'stroke-width': 2.4 }],
    ['path', { d: 'M11 11 L16 17 L21 11', 'stroke-width': 2.2 }],
    ['ellipse', { cx: 16, cy: 24, rx: 11, ry: 4.5, fill: 'currentColor', stroke: 'none' }],
  ],
  // Current (node): three streams that swell left to right.
  current: [
    ['path', { d: 'M3 9 Q8 6 13 9 T23 9', 'stroke-width': 1.4 }],
    ['path', { d: 'M3 16 Q8 13 13 16 T23 16', 'stroke-width': 2.2 }],
    ['path', { d: 'M3 23 Q8 20 13 23 T23 23', 'stroke-width': 3 }],
    ['path', { d: 'M25 12 L29 16 L25 20', 'stroke-width': 2 }],
  ],
  // Ebb (node): a wave crest with an arrow turning back (cooldowns return).
  ebb: [
    ['path', { d: 'M3 24 C7 14 15 12 22 16', 'stroke-width': 2.4 }],
    ['path', { d: 'M24 9 A7 7 0 1 1 15 6', 'stroke-width': 2 }],
    ['path', { d: 'M15 2 L15 7 L20 7', 'stroke-width': 2 }],
  ],
  // Spring Tide (node): two stacked drops (a second soak drenches).
  spring_tide: [
    ['path', { d: 'M11 4 C14 9 15.5 12 13.5 14.5 C12.5 15.6 9.5 15.6 8.5 14.5 C6.5 12 8 9 11 4 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M21 12 C25 18 27 22 24.5 25.5 C23 27.3 19 27.3 17.5 25.5 C15 22 17 18 21 12 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M4 29 H28', 'stroke-width': 1.6 }],
  ],
  // Undercurrent (node): a hook of water pulling a dot in.
  undercurrent: [
    ['path', { d: 'M28 8 H12 A6 6 0 0 0 12 20 H20', 'stroke-width': 2.4 }],
    ['path', { d: 'M16 16 L20 20 L16 24', 'stroke-width': 2 }],
    ['circle', { cx: 26, cy: 20, r: 3, fill: 'currentColor', stroke: 'none' }],
  ],
  // Riptide (node): a breaking crest with a stun spark.
  riptide: [
    ['path', { d: 'M2 26 C5 15 12 9 20 10 C24 10.5 25 15 21.5 16 C19 16.8 17.5 14.5 19 13 C13 13.5 10 19 10 26 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M25 2 L22 8 H27 L24 14', 'stroke-width': 1.8 }],
  ],
  // Confluence (node): two streams joining into one.
  confluence: [
    ['path', { d: 'M3 6 C10 6 12 16 18 16 M3 26 C10 26 12 16 18 16', 'stroke-width': 2.2 }],
    ['path', { d: 'M18 16 H29', 'stroke-width': 3 }],
    ['path', { d: 'M25 12 L29 16 L25 20', 'stroke-width': 2 }],
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
  // The Bellwright: a handbell with its clapper and a ring of sound.
  cls_bellwright: [
    ['path', { d: 'M16 4 C10.5 4 9 9 9 14 C9 18 7.5 20 6 22 H26 C24.5 20 23 18 23 14 C23 9 21.5 4 16 4 Z', fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 16, cy: 25.5, r: 2.4, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M3 10 Q1.5 14 3 18 M29 10 Q30.5 14 29 18', 'stroke-width': 1.6 }],
  ],
  // The Duskwing: a bat with its wings spread.
  cls_duskwing: [
    ['path', { d: 'M16 9 L13.5 6 L12.5 10 C9 9 6 7 2 8 C4 10 4.5 12 4 14 C6 13 8 13.5 9.5 15 C11 13.5 13 13.5 14 15 L16 17 L18 15 C19 13.5 21 13.5 22.5 15 C24 13.5 26 13 28 14 C27.5 12 28 10 30 8 C26 7 23 9 19.5 10 L18.5 6 Z', fill: 'currentColor', stroke: 'none', transform: 'translate(0 4)' }],
    ['path', { d: 'M3 27 Q16 22 29 27', 'stroke-width': 1.4 }],
  ],
  // The Tidecaller: her reed staff with the shell cup and a water drop.
  cls_tidecaller: [
    ['path', { d: 'M12 29 L18 9', 'stroke-width': 2.6 }],
    ['path', { d: 'M13 8 C14 3 23 3 24 8 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M24 14 C26.5 17.5 27 19.5 25.5 21 C24.5 22 23 22 22 21 C20.5 19.5 21.5 17.5 24 14 Z', fill: 'currentColor', stroke: 'none' }],
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
  // Third bosses (docs/THIRD_BOSSES.md). The Gloam Wolf: a wolf's head, ears
  // up and muzzle long, slanted eyes cut out, a ruff of bramble at the cheeks.
  boss_gloamwolf: [
    ['path', { d: 'M7 2.6 L12.4 10 C14.6 9.2 17.4 9.2 19.6 10 L25 2.6 L25.8 13 C27.6 15.6 27.4 19 24.6 21.4 L19 27.6 C17.6 29.6 14.4 29.6 13 27.6 L7.4 21.4 C4.6 19 4.4 15.6 6.2 13 Z M10 15.4 L14.2 16.8 L13.2 18.2 Z M22 15.4 L17.8 16.8 L18.8 18.2 Z M14.4 24.2 H17.6 L16 26 Z', fill: 'currentColor', stroke: 'none', 'fill-rule': 'evenodd' }],
    ['path', { d: 'M5.8 14.4 L1.4 15.4 L5 17.8 L1.8 20.6 L6.8 21 M26.2 14.4 L30.6 15.4 L27 17.8 L30.2 20.6 L25.2 21', 'stroke-width': 1.6 }],
  ],
  // The Mire King: a toad's broad face, eyes bulging up either side of a
  // crown of mill-grate bars, a wide mouth cut across it.
  boss_mireking: [
    ['path', { d: 'M3 21.6 C3 14.6 9 12 16 12 C23 12 29 14.6 29 21.6 C29 26.8 23.6 29.6 16 29.6 C8.4 29.6 3 26.8 3 21.6 Z M6.8 21 C11 24.2 21 24.2 25.2 21 C21.4 25.4 10.6 25.4 6.8 21 Z', fill: 'currentColor', stroke: 'none', 'fill-rule': 'evenodd' }],
    ['path', { d: 'M5.4 11.4 a3.8 3.8 0 1 0 7.6 0 a3.8 3.8 0 1 0 -7.6 0 Z M7.6 11.2 H10.8 V12.4 H7.6 Z M19 11.4 a3.8 3.8 0 1 0 7.6 0 a3.8 3.8 0 1 0 -7.6 0 Z M21.2 11.2 H24.4 V12.4 H21.2 Z', fill: 'currentColor', stroke: 'none', 'fill-rule': 'evenodd' }],
    ['path', { d: 'M12.2 10.4 L12.6 3.4 L14.4 6.8 L16 2.2 L17.6 6.8 L19.4 3.4 L19.8 10.4 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Slice 11. The Ash Raven: a raven's head in profile-free front view, the
  // great beak driving down, a cracked bone mask with two eye holes cut out,
  // ragged feathers either side.
  boss_ashraven: [
    ['path', { d: 'M16 3 C21.6 3 25.6 7 25.6 12.4 C25.6 16 23.8 18.6 21 20.4 L16 30 L11 20.4 C8.2 18.6 6.4 16 6.4 12.4 C6.4 7 10.4 3 16 3 Z M10.2 11.2 L14.4 12.4 L13.6 15 L10.6 14 Z M21.8 11.2 L17.6 12.4 L18.4 15 L21.4 14 Z M15.4 5.2 L16.6 5.2 L16.2 9 Z', fill: 'currentColor', stroke: 'none', 'fill-rule': 'evenodd' }],
    ['path', { d: 'M6.4 12 L1.6 9.6 L4.6 14.2 L1.2 15.6 L5.8 17.4 L3 20.6 L8.6 19.8 M25.6 12 L30.4 9.6 L27.4 14.2 L30.8 15.6 L26.2 17.4 L29 20.6 L23.4 19.8', 'stroke-width': 1.5 }],
  ],
  // The Vein Weaver: a spider seen from above, a faceted crystal abdomen,
  // eight bent legs and a thread falling from it.
  boss_veinweaver: [
    ['path', { d: 'M16 13.4 L20.6 17.6 L19.8 24.4 L16 28.6 L12.2 24.4 L11.4 17.6 Z M16 17 L18 19.2 L17.6 23.2 L16 25 L14.4 23.2 L14 19.2 Z', fill: 'currentColor', stroke: 'none', 'fill-rule': 'evenodd' }],
    ['circle', { cx: 16, cy: 10.4, r: 3.2, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M13.4 9.6 L8 5.4 L5.6 9.4 M13 11.6 L6.6 10.6 L3 15.4 M13.4 13.6 L7.8 16.4 L5.8 22.4 M14 15.4 L10.4 21.4 L10.8 27.6 M18.6 9.6 L24 5.4 L26.4 9.4 M19 11.6 L25.4 10.6 L29 15.4 M18.6 13.6 L24.2 16.4 L26.2 22.4 M18 15.4 L21.6 21.4 L21.2 27.6 M16 2 V7.2', 'stroke-width': 1.5 }],
  ],
  // Act V (docs/ACT_V_BOSSES.md). The Hush: a tall veil with a cracked bell
  // for a head, no clapper in the dark mouth of it, one finger raised.
  boss_hush: [
    ['path', { d: 'M10.6 4.6 C10.6 2.6 21.4 2.6 21.4 4.6 C21.4 8.4 23.6 11 25 12.6 H7 C8.4 11 10.6 8.4 10.6 4.6 Z M15.4 5 L16.6 5 L17.6 8.6 L15.6 11 L16.4 8.4 Z', fill: 'currentColor', stroke: 'none', 'fill-rule': 'evenodd' }],
    ['path', { d: 'M8.6 14.2 H23.4 C23.6 19.4 25.6 25.6 28 30.5 H4 C6.4 25.6 8.4 19.4 8.6 14.2 Z M12.6 15.8 C12.4 17.8 14 19.2 16 19.2 C18 19.2 19.6 17.8 19.4 15.8 Z', fill: 'currentColor', stroke: 'none', 'fill-rule': 'evenodd' }],
    ['path', { d: 'M24.8 22.4 L27.4 17.4 L27.6 11.6', 'stroke-width': 1.6 }],
  ],
  // The Skyhorn: an ibex's long face between two great ridged horns that
  // sweep back and curl, a bell hung under the chin.
  boss_skyhorn: [
    ['path', { d: 'M13 12.6 C9.4 7.4 9.6 2.8 13.6 1.6 C10.8 4.6 12.2 8.4 15 11.2 Z M19 12.6 C22.6 7.4 22.4 2.8 18.4 1.6 C21.2 4.6 19.8 8.4 17 11.2 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M11 9.6 L9.6 11.2 M12.8 6.6 L11 7.8 M21 9.6 L22.4 11.2 M19.2 6.6 L21 7.8', 'stroke-width': 1.1 }],
    ['path', { d: 'M11.4 13 C12.6 11.4 19.4 11.4 20.6 13 L19.6 21.4 C19 24.6 17.6 26 16 26 C14.4 26 13 24.6 12.4 21.4 Z M13.2 15.4 L15 16 L14.4 17.4 Z M18.8 15.4 L17 16 L17.6 17.4 Z', fill: 'currentColor', stroke: 'none', 'fill-rule': 'evenodd' }],
    ['path', { d: 'M11.4 13.6 L6.4 12.4 L9.4 15.6 Z M20.6 13.6 L25.6 12.4 L22.6 15.6 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M13.8 27 C13.8 25.6 18.2 25.6 18.2 27 L19 30.5 H13 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Content plan 5 slice 1. The Hourwarden: a clock face under a small bell,
  // twelve hour ticks, two hands stopped at a quarter to, a crack across it.
  boss_hourwarden: [
    ['path', { d: 'M13.2 6.4 C13.2 3.2 18.8 3.2 18.8 6.4 L19.6 8.4 H12.4 Z M15.2 1.4 H16.8 V3 H15.2 Z', fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 16, cy: 19.4, r: 10.6, 'stroke-width': 2 }],
    ['path', { d: 'M16 10.2 V12.2 M16 26.6 V28.6 M6.8 19.4 H8.8 M23.2 19.4 H25.2 M11.4 11.4 L12.2 12.8 M20.6 11.4 L19.8 12.8 M11.4 27.4 L12.2 26 M20.6 27.4 L19.8 26 M8 14.8 L9.4 15.6 M24 14.8 L22.6 15.6 M8 24 L9.4 23.2 M24 24 L22.6 23.2', 'stroke-width': 1.3 }],
    ['path', { d: 'M16 19.4 L10.6 19.4 M16 19.4 L18.6 13.4', 'stroke-width': 2 }],
    ['path', { d: 'M20.4 21.6 L22.4 23.8 L21.2 25 L23.6 27.6', 'stroke-width': 1 }],
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
  // KEYS AND VAULTS (docs/VAULTS.md): the party's key (a ringed bow, a
  // shaft and a two-tooth bit) and the vault door's keyhole.
  key: [
    ['circle', { cx: 9.5, cy: 16, r: 5.6 }],
    ['circle', { cx: 9.5, cy: 16, r: 1.8, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M15.1 16 H29' }],
    ['path', { d: 'M24.5 16 V21.5 M28.6 16 V20', 'stroke-width': 2.6 }],
  ],
  keyhole: [
    ['path', { d: 'M16 5.2 A5.2 5.2 0 0 1 18.9 14.7 L21.2 27 H10.8 L13.1 14.7 A5.2 5.2 0 0 1 16 5.2 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Location marker: a compass diamond on a pin.
  marker: [
    ['path', { d: 'M16 3 L22 14 L16 25 L10 14 Z' }],
    ['path', { d: 'M16 25 V29 M11 29 H21', 'stroke-width': 1.8 }],
    ['circle', { cx: 16, cy: 14, r: 2, fill: 'currentColor', stroke: 'none' }],
  ],
  // TONICS AND BOMBS (docs/CONSUMABLES.md): the carry slot's six kinds.
  // A round flask with a cross (Mending Tonic), a flask with speed lines
  // (Haste Draught), a flask on a shield (Ward Flask), a bomb with a flame
  // (Fire Bomb), a bomb with a snow star (Frost Bomb), a hand-bell (Bell Charm).
  mend_tonic: [
    ['path', { d: 'M13 4 H19 M14 4 V10 C8 12 6 16 6 20 A10 9 0 0 0 26 20 C26 16 24 12 18 10 V4' }],
    ['path', { d: 'M16 15 V25 M11 20 H21', 'stroke-width': 3 }],
  ],
  haste_draught: [
    ['path', { d: 'M17 4 H23 M18 4 V10 C13 12 11 16 11 20 A9 8.5 0 0 0 29 20 C29 16 27 12 22 10 V4' }],
    ['path', { d: 'M3 14 H8 M2 20 H7 M3 26 H9' }],
    ['path', { d: 'M15 21 L20 16 L19 20 L24 19 L19 25', fill: 'currentColor', stroke: 'none' }],
  ],
  ward_flask: [
    ['path', { d: 'M16 3 L27 7 V15 C27 22 22 27 16 29 C10 27 5 22 5 15 V7 Z' }],
    ['path', { d: 'M14 9 H18 M14.6 9 V13 C11.5 14 10.5 16.5 10.5 18.5 A5.5 5 0 0 0 21.5 18.5 C21.5 16.5 20.5 14 17.4 13 V9', fill: 'currentColor', stroke: 'none' }],
  ],
  fire_bomb: [
    ['circle', { cx: 14, cy: 19, r: 9, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M19 11 L22 8' }],
    ['path', { d: 'M25 2 C28 5 28 8 25 10 C22 8 22 5 25 2 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  frost_bomb: [
    ['circle', { cx: 14, cy: 19, r: 9 }],
    ['path', { d: 'M14 13 V25 M9 16 L19 22 M9 22 L19 16', 'stroke-width': 1.8 }],
    ['path', { d: 'M19 11 L22 8' }],
    ['path', { d: 'M25 2 V10 M21.5 4 L28.5 8 M21.5 8 L28.5 4', 'stroke-width': 1.6 }],
  ],
  bell_charm: [
    ['path', { d: 'M16 4 C10 4 9 10 9 15 C9 19 7 21 5 23 H27 C25 21 23 19 23 15 C23 10 22 4 16 4 Z', fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 16, cy: 26.5, r: 2.4, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M2 10 C3 7 4.5 5.5 6 4.5 M30 10 C29 7 27.5 5.5 26 4.5', 'stroke-width': 1.8 }],
  ],
  // SHRINES: a shrine's plinth with a flame in its bowl (the blessing plate).
  shrine: [
    ['path', { d: 'M16 3 C19 7 21 9 21 12 C21 15 18.8 17 16 17 C13.2 17 11 15 11 12 C11 9 13 7 16 3 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M8 19 H24 M11 19 V26 M21 19 V26 M6 28 H26' }],
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
