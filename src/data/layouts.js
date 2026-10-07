// Room layouts — the per-room PLACEMENTS of hazards and interactive assets
// (docs/gauntlet/PLAN.md §3.6 "Layout", BUILD_BRIEF §23.1 / §23.6 / §23.7).
// Owner: M4b. Pure data, read by the SIM (sim/hazards.js spawns these at room
// enter through run.js's setRoomHooks) and by the ENV (src/env/biomes/* —
// the dressing keeps its props clear of these footprints).
//
// Layouts 1-3 are the certified Act-I arena variants (env/variants.js) with
// placements added; 4-6 are the Sunken Mill, 7-9 the Ashen Barrow. The act's
// boss room reuses its third layout's DRESSING only — boss rooms carry no
// hazards or assets (BUILD_BRIEF §23.7), so `bossPlacements` is empty.
//
// Placement rules (checked by tools/gntM4b-layoutcheck.mjs against every
// layout): every placement >= 1.5 u from the §11 spawn ring (lanes: their
// centreline), >= 2.5 u from the Waystone (0, 1.6), >= 1.6 u from every party
// entry spot, inside the playfield, and clear of the dressing's prop anchors
// and fire bowls.
//
// Field reference:
//   hazards:        { type, x, z, ...params }
//     bramble      r (0.9-1.3)                     static slow patch
//     puffcap      offset (ticks into its idle)    minRoom (Act I: from room 2)
//     millrace     x0 z0 x1 z1 (flow from 0 -> 1), w (1.4), offset (ticks toward the first surge)
//     rockfall     (no position — targets the party)
//     gravefire    vents [[x, z] x3], offset (ticks into its 420-tick cycle)
//     slip         r (1.1-1.9), skin ('wet' Mill | 'frost' Barrow)  slick floor:
//                  bodies keep sliding (Acts II and III only, never Level 1)
//   interactables:  { type, x, z, yaw?, ...params }
//     dewfont · barricade (yaw, skin) · keg · sluice (lanes: millrace indices) · bell
//   spawns (optional): [[x, z] x 8] this room's spawn ring, index-aligned with
//                   waves.js SPAWN_POINTS (layouts 10-15)
export const LAYOUTS = Object.freeze({
  // ---------------------------------------------------------- Act I
  1: Object.freeze({
    id: 1,
    act: 1,
    biome: 'wood',
    name: 'Beaten Clearing',
    hazards: Object.freeze([
      { type: 'bramble', x: -5.8, z: -1.3, r: 1.1 },
      { type: 'bramble', x: 4.4, z: -4.0, r: 0.95 },
      { type: 'puffcap', x: -3.1, z: -4.5, offset: 0, minRoom: 2 },
      { type: 'puffcap', x: 6.3, z: -2.9, offset: 150, minRoom: 2 },
    ]),
    interactables: Object.freeze([
      { type: 'barricade', x: -5.9, z: -3.6, yaw: 0.5, skin: 'timber' },
      { type: 'barricade', x: 3.9, z: 1.5, yaw: -0.5, skin: 'crates' },
      { type: 'keg', x: -3.7, z: -3.4 },
      { type: 'keg', x: 1.5, z: -4.7 },
    ]),
  }),
  2: Object.freeze({
    id: 2,
    act: 1,
    biome: 'wood',
    name: 'Dry Crossroads',
    hazards: Object.freeze([
      { type: 'bramble', x: -6.2, z: -4.2, r: 0.95 },
      { type: 'bramble', x: 4.6, z: -3.4, r: 0.95 },
      { type: 'puffcap', x: 6.6, z: -2.4, offset: 60, minRoom: 2 },
      { type: 'puffcap', x: -3.0, z: -5.2, offset: 210, minRoom: 2 },
    ]),
    interactables: Object.freeze([
      { type: 'dewfont', x: 2.6, z: -5.0 },
      { type: 'barricade', x: -4.6, z: -0.8, yaw: 1.45, skin: 'timber' },
      { type: 'barricade', x: 4.4, z: -0.4, yaw: 1.3, skin: 'crates' },
      { type: 'keg', x: -3.4, z: 2.7 },
    ]),
  }),
  3: Object.freeze({
    id: 3,
    act: 1,
    biome: 'wood',
    name: 'Mossy Hollow',
    hazards: Object.freeze([
      { type: 'bramble', x: -3.9, z: -3.7, r: 1.2 },
      { type: 'bramble', x: 2.8, z: -4.8, r: 0.85 },
      { type: 'puffcap', x: 0.8, z: -5.4, offset: 30, minRoom: 2 },
      { type: 'puffcap', x: -4.0, z: 0.9, offset: 180, minRoom: 2 },
    ]),
    interactables: Object.freeze([
      { type: 'barricade', x: 4.3, z: 0.3, yaw: 1.2, skin: 'crates' },
      { type: 'barricade', x: 5.2, z: -3.8, yaw: 0.3, skin: 'timber' },
      { type: 'keg', x: 3.4, z: 2.4 },
      { type: 'keg', x: -1.4, z: -4.8 },
    ]),
  }),

  // ---------------------------------------------------------- Act II
  4: Object.freeze({
    id: 4,
    act: 2,
    biome: 'mill',
    name: 'Millpond',
    hazards: Object.freeze([
      { type: 'millrace', x0: -7.6, z0: -8, x1: -7.6, z1: 8, w: 1.4, offset: 120 },
      { type: 'puffcap', x: 4.7, z: -4.3, offset: 0 },
      { type: 'puffcap', x: 5.9, z: 3.0, offset: 120 },
      { type: 'puffcap', x: -3.6, z: 4.5, offset: 230 },
    ]),
    interactables: Object.freeze([
      { type: 'sluice', x: -5.9, z: -4.4, yaw: -1.5708, lanes: [0] },
      { type: 'dewfont', x: 2.9, z: 4.7 },
      { type: 'barricade', x: -4.4, z: -2.2, yaw: 1.2, skin: 'timber' },
      { type: 'barricade', x: 3.6, z: 1.9, yaw: 0.2, skin: 'crates' },
      { type: 'barricade', x: 1.4, z: -4.6, yaw: 0.1, skin: 'timber' },
      { type: 'keg', x: 6.0, z: -1.6 },
      { type: 'keg', x: -3.0, z: -4.4 },
    ]),
  }),
  5: Object.freeze({
    id: 5,
    act: 2,
    biome: 'mill',
    name: 'Weir',
    hazards: Object.freeze([
      { type: 'millrace', x0: -12, z0: -4.6, x1: 2.4, z1: -4.6, w: 1.4, offset: 60 },
      { type: 'millrace', x0: 7.4, z0: 8, x1: 7.4, z1: -8, w: 1.4, offset: 330 },
      { type: 'puffcap', x: -4.6, z: 2.6, offset: 40 },
      { type: 'puffcap', x: 4.4, z: 4.4, offset: 190 },
      // Slick floor: wet stones below the weir, by the south bank.
      { type: 'slip', x: -7.8, z: 5.3, r: 1.5, skin: 'wet' },
      { type: 'slip', x: 1.0, z: 5.1, r: 1.1, skin: 'wet' },
    ]),
    interactables: Object.freeze([
      { type: 'sluice', x: 1.2, z: -6.2, yaw: 0, lanes: [0, 1] },
      { type: 'dewfont', x: -3.4, z: 4.8 },
      { type: 'barricade', x: -4.6, z: -1.4, yaw: 0.25, skin: 'crates' },
      { type: 'barricade', x: 4.4, z: 1.2, yaw: 1.4, skin: 'timber' },
      { type: 'keg', x: 4.9, z: -2.4 },
    ]),
  }),
  6: Object.freeze({
    id: 6,
    act: 2,
    biome: 'mill',
    name: 'Drowned Granary',
    hazards: Object.freeze([
      { type: 'millrace', x0: 12, z0: 4.8, x1: -2.8, z1: 4.8, w: 1.4, offset: 200 },
      { type: 'puffcap', x: -5.0, z: -3.6, offset: 20 },
      { type: 'puffcap', x: 5.2, z: -3.6, offset: 170 },
    ]),
    interactables: Object.freeze([
      { type: 'sluice', x: 3.2, z: 3.4, yaw: 3.1416, lanes: [0] },
      { type: 'dewfont', x: -5.2, z: 2.2 },
      { type: 'barricade', x: 3.7, z: 0.2, yaw: 1.5, skin: 'crates' },
      { type: 'barricade', x: -4.4, z: -1.8, yaw: 1.3, skin: 'timber' },
      { type: 'barricade', x: 0.2, z: -4.9, yaw: 0.0, skin: 'timber' },
      { type: 'keg', x: 6.4, z: 1.1 },
      { type: 'keg', x: -2.2, z: -5.0 },
    ]),
  }),

  // ---------------------------------------------------------- Act III
  7: Object.freeze({
    id: 7,
    act: 3,
    biome: 'barrow',
    name: 'Barrow Gate',
    hazards: Object.freeze([
      { type: 'rockfall' },
      { type: 'gravefire', vents: [[-6.4, 3.4], [-5.0, 4.1], [-3.6, 4.8]], offset: 0 },
    ]),
    interactables: Object.freeze([
      { type: 'bell', x: 4.4, z: -3.8 },
      { type: 'dewfont', x: -4.4, z: -3.9 },
      { type: 'barricade', x: 3.8, z: 1.2, yaw: 0.4, skin: 'cairn' },
      { type: 'barricade', x: -4.4, z: 0.6, yaw: 1.4, skin: 'cairn' },
      { type: 'barricade', x: 1.6, z: 4.6, yaw: 0.0, skin: 'cairn' },
      { type: 'keg', x: 6.2, z: 1.0 },
      { type: 'keg', x: -1.6, z: -4.7 },
    ]),
  }),
  8: Object.freeze({
    id: 8,
    act: 3,
    biome: 'barrow',
    name: 'Ossuary Row',
    hazards: Object.freeze([
      { type: 'rockfall' },
      { type: 'gravefire', vents: [[-6.2, -3.4], [-4.8, -4.0], [-3.4, -4.6]], offset: 0 },
      { type: 'gravefire', vents: [[3.4, 4.6], [4.8, 4.0], [6.2, 3.4]], offset: 210 },
    ]),
    interactables: Object.freeze([
      { type: 'dewfont', x: 4.3, z: -3.8 },
      { type: 'barricade', x: -3.6, z: 1.8, yaw: 0.3, skin: 'cairn' },
      { type: 'barricade', x: 3.6, z: 1.0, yaw: -0.3, skin: 'cairn' },
      { type: 'barricade', x: -0.2, z: -4.9, yaw: 0.0, skin: 'cairn' },
      { type: 'keg', x: -6.2, z: 0.4 },
      { type: 'keg', x: 6.4, z: -0.6 },
    ]),
  }),
  9: Object.freeze({
    id: 9,
    act: 3,
    biome: 'barrow',
    name: 'Moonwell',
    hazards: Object.freeze([
      { type: 'rockfall' },
      { type: 'gravefire', vents: [[3.6, -4.6], [5.0, -4.0], [6.4, -3.4]], offset: 90 },
      // Slick floor: the moonwell's frost has crept out across both flanks.
      { type: 'slip', x: 5.4, z: -0.9, r: 1.65, skin: 'frost' },
      { type: 'slip', x: -8.8, z: -0.1, r: 1.65, skin: 'frost' },
    ]),
    interactables: Object.freeze([
      { type: 'bell', x: -4.6, z: -3.6 },
      { type: 'dewfont', x: -4.2, z: 3.6 },
      { type: 'barricade', x: 3.9, z: 1.4, yaw: 1.2, skin: 'cairn' },
      { type: 'barricade', x: -4.3, z: -0.9, yaw: 0.2, skin: 'cairn' },
      { type: 'keg', x: 4.8, z: 4.2 },
    ]),
  }),

  // ------------------------------------------- slice 2 (docs/CONTENT_PLAN.md §4)
  // Two more per expedition. These also carry `spawns`: the room's own spawn
  // ring, index-aligned with waves.js SPAWN_POINTS (the wave roll still draws
  // a point index; run.js relocates the rolled units onto this ring, no extra
  // draw). Campaign rooms only: the legacy single-level run keeps each level's
  // `legacyLayouts` table so the Node goldens stay bit-identical.

  // Act I · 10 — three bramble rows: a north hedge with one gate and a hedge
  // down each flank. Spawns sit at the east and west ends, so charges run the
  // hedge lanes; kegs cap the flank rows.
  10: Object.freeze({
    id: 10,
    act: 1,
    biome: 'wood',
    name: 'Bramble Maze',
    spawns: Object.freeze([[-10.4, -6.2], [10.4, -6.2], [-10.6, -1.0], [10.6, -1.0], [-10.6, 3.0], [10.6, 3.0], [-8.6, 6.6], [8.6, 6.6]]),
    hazards: Object.freeze([
      { type: 'bramble', x: -6.3, z: -4.8, r: 0.95 },
      { type: 'bramble', x: -4.15, z: -5.0, r: 0.95 },
      { type: 'bramble', x: -2.0, z: -5.1, r: 0.95 },
      { type: 'bramble', x: 2.0, z: -5.1, r: 0.95 },
      { type: 'bramble', x: 4.15, z: -5.0, r: 0.95 },
      { type: 'bramble', x: 6.3, z: -4.8, r: 0.95 },
      { type: 'bramble', x: -6.8, z: -1.6, r: 0.95 },
      { type: 'bramble', x: -6.8, z: 0.55, r: 0.95 },
      { type: 'bramble', x: -6.6, z: 2.7, r: 0.95 },
      { type: 'bramble', x: 6.8, z: -1.6, r: 0.95 },
      { type: 'bramble', x: 6.8, z: 0.55, r: 0.95 },
      { type: 'bramble', x: 6.6, z: 2.7, r: 0.95 },
      { type: 'puffcap', x: -3.6, z: 4.4, offset: 90, minRoom: 2 },
      { type: 'puffcap', x: 3.6, z: 4.4, offset: 240, minRoom: 2 },
    ]),
    interactables: Object.freeze([
      { type: 'dewfont', x: 0.0, z: -5.8 },
      { type: 'keg', x: -7.0, z: -3.3 },
      { type: 'keg', x: 7.0, z: -3.3 },
      { type: 'keg', x: -6.6, z: 4.6 },
      { type: 'keg', x: 6.6, z: 4.6 },
    ]),
  }),
  // Act I · 11 — an oak lies across the west and middle of the north half (a
  // timber barricade trunk you can chop through), its crown a bramble thicket
  // at the east end. Most spawns are behind the trunk; puffcaps grow in its lee.
  11: Object.freeze({
    id: 11,
    act: 1,
    biome: 'wood',
    name: 'Fallen Oak',
    spawns: Object.freeze([[-6.4, -6.9], [6.6, -6.9], [-10.4, -6.2], [10.4, -5.8], [-2.4, -6.9], [2.4, -6.9], [-10.6, 3.4], [10.6, 2.6]]),
    hazards: Object.freeze([
      { type: 'bramble', x: 2.6, z: -4.0, r: 1.05 },
      { type: 'bramble', x: 4.9, z: -3.7, r: 0.95 },
      { type: 'puffcap', x: -7.0, z: -2.5, offset: 0, minRoom: 2 },
      { type: 'puffcap', x: -4.2, z: -2.5, offset: 160, minRoom: 2 },
      { type: 'puffcap', x: 4.6, z: 3.8, offset: 80, minRoom: 2 },
    ]),
    interactables: Object.freeze([
      { type: 'barricade', x: -9.0, z: -3.9, yaw: 0.06, skin: 'timber' },
      { type: 'barricade', x: -7.25, z: -4.0, yaw: 0.0, skin: 'timber' },
      { type: 'barricade', x: -5.5, z: -4.1, yaw: -0.04, skin: 'timber' },
      { type: 'barricade', x: -3.75, z: -4.2, yaw: 0.0, skin: 'timber' },
      { type: 'barricade', x: -2.0, z: -4.3, yaw: 0.08, skin: 'timber' },
      { type: 'dewfont', x: -6.2, z: 3.4 },
      { type: 'barricade', x: 6.2, z: 0.6, yaw: 1.4, skin: 'crates' },
      { type: 'keg', x: 6.2, z: -2.6 },
      { type: 'keg', x: -9.6, z: -2.4 },
    ]),
  }),

  // Act II · 12 — two short millraces flowing opposite ways, west lane south
  // and east lane north, surging half a cycle apart. Each lane has its own
  // sluice; every spawn sits outside the lanes, so every body crosses water.
  12: Object.freeze({
    id: 12,
    act: 2,
    biome: 'mill',
    name: 'Sluice Gates',
    spawns: Object.freeze([[-8.4, -6.6], [8.4, -6.6], [-10.4, -2.6], [10.4, -2.6], [-10.4, 2.6], [10.4, 2.6], [-8.4, 6.6], [8.4, 6.6]]),
    hazards: Object.freeze([
      { type: 'millrace', x0: -4.8, z0: -5.4, x1: -4.8, z1: 5.4, w: 1.4, offset: 0 },
      { type: 'millrace', x0: 4.8, z0: 5.4, x1: 4.8, z1: -5.4, w: 1.4, offset: 270 },
      { type: 'puffcap', x: -2.6, z: -4.6, offset: 60 },
      { type: 'puffcap', x: 2.6, z: 4.6, offset: 210 },
    ]),
    interactables: Object.freeze([
      { type: 'sluice', x: -6.6, z: -2.4, yaw: 1.5708, lanes: [0] },
      { type: 'sluice', x: 6.6, z: 2.4, yaw: -1.5708, lanes: [1] },
      { type: 'dewfont', x: 0.0, z: -5.6 },
      { type: 'barricade', x: -2.9, z: 3.8, yaw: 0.0, skin: 'timber' },
      { type: 'barricade', x: 2.9, z: -3.8, yaw: 0.0, skin: 'crates' },
      { type: 'keg', x: -7.0, z: 4.4 },
      { type: 'keg', x: 7.0, z: -4.4 },
    ]),
  }),
  // Act II · 13 — a cellar squeezed between two races along the north and
  // south walls, with a broken ring of barricades round the middle. Bodies
  // enter from the flooded east and west ends; one sluice stops both races.
  13: Object.freeze({
    id: 13,
    act: 2,
    biome: 'mill',
    name: 'Flooded Cellar',
    spawns: Object.freeze([[-10.6, -3.0], [10.6, -3.0], [-10.6, 0.2], [10.6, 0.2], [-10.6, 3.2], [10.6, 3.2], [-7.6, -7.0], [7.6, 7.0]]),
    hazards: Object.freeze([
      { type: 'millrace', x0: -9.0, z0: -5.2, x1: 9.0, z1: -5.2, w: 1.4, offset: 90 },
      { type: 'millrace', x0: 9.0, z0: 5.4, x1: -9.0, z1: 5.4, w: 1.4, offset: 360 },
      // Slick floor: the flooded ends are wet, algae-slick flagstone, so
      // every body walking in from east or west crosses it.
      { type: 'slip', x: -7.2, z: -0.1, r: 1.7, skin: 'wet' },
      { type: 'slip', x: 7.8, z: 0.7, r: 1.3, skin: 'wet' },
    ]),
    interactables: Object.freeze([
      { type: 'barricade', x: -4.4, z: -0.2, yaw: 1.5708, skin: 'timber' },
      { type: 'barricade', x: 4.4, z: -0.2, yaw: 1.5708, skin: 'crates' },
      { type: 'barricade', x: -3.3, z: -3.4, yaw: 0.785, skin: 'crates' },
      { type: 'barricade', x: 3.3, z: -3.4, yaw: -0.785, skin: 'timber' },
      { type: 'barricade', x: -3.2, z: 3.2, yaw: -0.785, skin: 'timber' },
      { type: 'barricade', x: 3.2, z: 3.2, yaw: 0.785, skin: 'crates' },
      { type: 'sluice', x: -9.0, z: 1.6, yaw: 1.5708, lanes: [0, 1] },
      { type: 'dewfont', x: 7.4, z: -1.6 },
      { type: 'keg', x: -6.6, z: -2.4 },
      { type: 'keg', x: 6.6, z: 2.2 },
    ]),
  }),

  // Act III · 14 — a ruined bell tower: four cairn walls round the middle with
  // doorways at the corners, a bell outside each north doorway, rockfall, and
  // one gravefire line in the south. Spawns come from the four corners.
  14: Object.freeze({
    id: 14,
    act: 3,
    biome: 'barrow',
    name: 'Bell Tower',
    spawns: Object.freeze([[-10.6, -6.6], [10.6, -6.6], [-10.6, 6.4], [10.6, 6.4], [-7.4, -6.9], [7.4, -6.9], [-7.6, 6.9], [7.6, 6.9]]),
    hazards: Object.freeze([
      { type: 'rockfall' },
      { type: 'gravefire', vents: [[-1.5, 6.3], [0.0, 6.6], [1.5, 6.3]], offset: 140 },
      // Slick floor: frost in the two south doorways, uphill of the fire line.
      { type: 'slip', x: -5.4, z: 3.9, r: 1.7, skin: 'frost' },
      { type: 'slip', x: 5.4, z: 3.9, r: 1.7, skin: 'frost' },
    ]),
    interactables: Object.freeze([
      { type: 'barricade', x: -2.4, z: -4.4, yaw: 0.0, skin: 'cairn' },
      { type: 'barricade', x: 2.4, z: -4.4, yaw: 0.0, skin: 'cairn' },
      { type: 'barricade', x: -4.4, z: -1.6, yaw: 1.5708, skin: 'cairn' },
      { type: 'barricade', x: 4.4, z: -1.6, yaw: 1.5708, skin: 'cairn' },
      { type: 'barricade', x: -2.6, z: 4.4, yaw: 0.0, skin: 'cairn' },
      { type: 'barricade', x: 2.6, z: 4.4, yaw: 0.0, skin: 'cairn' },
      { type: 'bell', x: -4.8, z: -4.6 },
      { type: 'bell', x: 4.8, z: -4.6 },
      { type: 'dewfont', x: 0.0, z: -6.0 },
      { type: 'keg', x: -7.4, z: 2.6 },
      { type: 'keg', x: 7.4, z: 2.6 },
    ]),
  }),
  // Act III · 15 — five gravefire lines on a grid, rippling a fifth of a cycle
  // apart; spawns in the gaps between the graves. No rockfall: the floor is
  // the threat.
  15: Object.freeze({
    id: 15,
    act: 3,
    biome: 'barrow',
    name: 'Open Grave',
    // Balance pass (2026-10-05): the CONTENT_PLAN hook "moles and broods
    // favoured". Every second planned unit of threat <= 2 that is not already
    // one becomes a Grave Mole or a Brood Spider in turn (sim/waves.js
    // favourRoster, after the layout roll, no draw); Rams and Knights stay.
    // Moles surface between the graves, broods spill Broodlings across the
    // gravefire lines.
    mix: Object.freeze({ favour: Object.freeze(['mole', 'mole', 'brood']), every: 2, maxThreat: 2 }),
    spawns: Object.freeze([[-5.6, -6.6], [5.6, -6.6], [-10.4, -0.4], [10.4, -0.4], [-2.6, -6.9], [2.6, -6.9], [-5.6, 6.4], [5.6, 6.4]]),
    hazards: Object.freeze([
      { type: 'gravefire', vents: [[-7.6, -4.2], [-5.6, -4.2], [-3.6, -4.2]], offset: 0 },
      { type: 'gravefire', vents: [[3.6, -4.2], [5.6, -4.2], [7.6, -4.2]], offset: 84 },
      { type: 'gravefire', vents: [[-7.6, 3.4], [-5.6, 3.4], [-3.6, 3.4]], offset: 168 },
      { type: 'gravefire', vents: [[3.6, 3.4], [5.6, 3.4], [7.6, 3.4]], offset: 252 },
      { type: 'gravefire', vents: [[0.0, 4.8], [0.0, 5.8], [0.0, 6.8]], offset: 336 },
    ]),
    interactables: Object.freeze([
      { type: 'barricade', x: -6.6, z: -0.4, yaw: 1.5708, skin: 'cairn' },
      { type: 'barricade', x: 6.6, z: -0.4, yaw: 1.5708, skin: 'cairn' },
      { type: 'bell', x: -9.4, z: 5.2 },
      { type: 'dewfont', x: 9.4, z: -5.6 },
      { type: 'keg', x: -4.6, z: -2.6 },
      { type: 'keg', x: 4.6, z: -2.6 },
    ]),
  }),

  // ---------------------------------------------------------- Act IV
  // The Hollow Heart (docs/ACT_IV.md): vein vents (gravefire, skin 'vein'),
  // heart-crystal floors (slip, skin 'glass'), rockfall from the roots
  // overhead, crystal barricades. 18 is also the boss room's dressing.
  16: Object.freeze({
    id: 16,
    act: 4,
    biome: 'heart',
    name: 'Root Gate',
    hazards: Object.freeze([
      { type: 'rockfall' },
      { type: 'gravefire', vents: [[-6.8, -3.4], [-5.4, -4.0], [-4.0, -4.6]], offset: 0, skin: 'vein' },
      { type: 'slip', x: 5.6, z: 3.6, r: 1.4, skin: 'glass' },
    ]),
    interactables: Object.freeze([
      { type: 'dewfont', x: 4.6, z: -3.8 },
      { type: 'barricade', x: -4.2, z: 1.2, yaw: 1.3, skin: 'crystal' },
      { type: 'barricade', x: 3.8, z: 0.8, yaw: -0.4, skin: 'crystal' },
      { type: 'keg', x: -6.4, z: 0.2 },
      { type: 'keg', x: 6.6, z: -0.4 },
    ]),
  }),
  17: Object.freeze({
    id: 17,
    act: 4,
    biome: 'heart',
    name: 'Vein Gallery',
    hazards: Object.freeze([
      { type: 'rockfall' },
      { type: 'gravefire', vents: [[-2.0, -4.6], [0.0, -4.6], [2.0, -4.6]], offset: 0, skin: 'vein' },
      { type: 'gravefire', vents: [[-6.2, 4.0], [-4.6, 4.2], [-3.0, 4.4]], offset: 210, skin: 'vein' },
    ]),
    interactables: Object.freeze([
      { type: 'dewfont', x: 6.4, z: 2.2 },
      { type: 'barricade', x: -4.4, z: -1.6, yaw: 0.3, skin: 'crystal' },
      { type: 'barricade', x: 4.2, z: -1.2, yaw: -0.3, skin: 'crystal' },
      { type: 'keg', x: -7.0, z: 1.8 },
      { type: 'keg', x: 3.2, z: 4.6 },
    ]),
  }),
  18: Object.freeze({
    id: 18,
    act: 4,
    biome: 'heart',
    name: 'Heart Chamber',
    hazards: Object.freeze([
      { type: 'rockfall' },
      { type: 'gravefire', vents: [[-1.4, 5.2], [0.0, 5.6], [1.4, 5.2]], offset: 120, skin: 'vein' },
      { type: 'slip', x: -5.8, z: -3.4, r: 1.5, skin: 'glass' },
      { type: 'slip', x: 5.8, z: -3.4, r: 1.5, skin: 'glass' },
    ]),
    interactables: Object.freeze([
      { type: 'dewfont', x: 0.0, z: -5.2 },
      { type: 'barricade', x: -3.6, z: 2.6, yaw: 0.5, skin: 'crystal' },
      { type: 'barricade', x: 3.6, z: 2.6, yaw: -0.5, skin: 'crystal' },
      { type: 'keg', x: -7.2, z: 1.6 },
      { type: 'keg', x: 7.2, z: 1.6 },
    ]),
  }),
  19: Object.freeze({
    id: 19,
    act: 4,
    biome: 'heart',
    name: 'Geode Hall',
    hazards: Object.freeze([
      { type: 'rockfall' },
      // The floor is the threat: three spreads of heart crystal.
      { type: 'slip', x: -4.4, z: -3.4, r: 1.6, skin: 'glass' },
      { type: 'slip', x: 4.4, z: -3.4, r: 1.6, skin: 'glass' },
      { type: 'slip', x: 0.0, z: 5.8, r: 1.4, skin: 'glass' },
    ]),
    interactables: Object.freeze([
      { type: 'dewfont', x: -7.2, z: -0.6 },
      { type: 'barricade', x: -2.6, z: 3.6, yaw: 0.0, skin: 'crystal' },
      { type: 'barricade', x: 2.6, z: 3.6, yaw: 0.0, skin: 'crystal' },
      { type: 'keg', x: 6.8, z: -1.0 },
      { type: 'keg', x: -0.2, z: -5.4 },
    ]),
  }),
  20: Object.freeze({
    id: 20,
    act: 4,
    biome: 'heart',
    name: 'Weeping Wells',
    hazards: Object.freeze([
      { type: 'rockfall' },
      { type: 'gravefire', vents: [[-7.4, -2.4], [-6.4, -1.2], [-5.4, 0.0]], offset: 0, skin: 'vein' },
      { type: 'gravefire', vents: [[5.4, 0.0], [6.4, 1.2], [7.4, 2.4]], offset: 210, skin: 'vein' },
      { type: 'slip', x: 0.0, z: -5.2, r: 1.2, skin: 'glass' },
    ]),
    interactables: Object.freeze([
      { type: 'dewfont', x: -3.2, z: 4.6 },
      { type: 'barricade', x: 4.2, z: -3.2, yaw: 0.8, skin: 'crystal' },
      { type: 'keg', x: 4.0, z: 4.4 },
      { type: 'keg', x: -3.8, z: -3.6 },
    ]),
  }),
});

export const LAYOUT_IDS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);

export function layoutFor(id) {
  return LAYOUTS[id] ?? null;
}

// Act of a layout id (4-6, 12-13 -> II; 7-9, 14-15 -> III; 16-20 -> IV), used by ?variant=N / ?layout=N.
export function actOfLayout(id) {
  return LAYOUTS[id] ? LAYOUTS[id].act : 1;
}

export const BIOME_OF_ACT = Object.freeze({ 1: 'wood', 2: 'mill', 3: 'barrow', 4: 'heart' });

// §11 spawn ring + the constraints tools/gntM4b-layoutcheck.mjs audits.
export const PLACEMENT_RULES = Object.freeze({
  spawnClear: 1.5,
  waystone: Object.freeze({ x: 0, z: 1.6, clear: 2.5 }),
  partySpots: Object.freeze([
    [0, 0],
    [-1.9, -1.0],
    [1.8, -1.3],
    [-0.35, -2.2],
  ]),
  partyClear: 1.6,
});
