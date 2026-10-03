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
//   interactables:  { type, x, z, yaw?, ...params }
//     dewfont · barricade (yaw, skin) · keg · sluice (lanes: millrace indices) · bell
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
    ]),
    interactables: Object.freeze([
      { type: 'bell', x: -4.6, z: -3.6 },
      { type: 'dewfont', x: -4.2, z: 3.6 },
      { type: 'barricade', x: 3.9, z: 1.4, yaw: 1.2, skin: 'cairn' },
      { type: 'barricade', x: -4.3, z: -0.9, yaw: 0.2, skin: 'cairn' },
      { type: 'keg', x: 4.8, z: 4.2 },
    ]),
  }),
});

export const LAYOUT_IDS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9]);

export function layoutFor(id) {
  return LAYOUTS[id] ?? null;
}

// Act of a layout id (4-6 -> II, 7-9 -> III), used by ?variant=N / ?layout=N.
export function actOfLayout(id) {
  return LAYOUTS[id] ? LAYOUTS[id].act : 1;
}

export const BIOME_OF_ACT = Object.freeze({ 1: 'wood', 2: 'mill', 3: 'barrow' });

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
