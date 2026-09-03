// Camp hub layout (BUILD_BRIEF §18 "Camp hub", §19.1 camp colour story,
// REFERENCE_BAR reference A).
//
// The camp is HAND-AUTHORED, not scattered: §13 calls the arenas a "hand-built
// layout pool", and a camp is a place people made — every tent, bench, anvil
// and lantern below sits where somebody would have put it. Only the grass, the
// ground stamps and the perimeter scrub come off a stream (the layout stream,
// seeded from a constant, so the camp measures the same on every load).
//
// COMPOSITION (§18: "one Hearth-Fire as the single warm light source
// everything COMPOSES TOWARD"):
//   - the Hearth sits just north of world origin; the party spawns in a ring
//     around it, so the boot frame is a warm pool with four critters in it;
//   - every functional corner (smithy W, market E, tents NW/NE, cart SE) faces
//     inward toward that fire, and the two dirt tracks both run through it;
//   - the ONE arcane object — the run-portal gate — stands at the north wall,
//     on the axis, so "walk north and press E" is the whole interaction.
//
// PLAYFIELD. §13 sizes the camp at ~16x12 u, but sim wall collision is the one
// frozen ARENA rect (24x16) in core/constants.js and lives in sim/movement.js,
// which this block does not own. Rather than let the Healer walk through the
// visible boundary of a 16x12 dressing, the camp is dressed to the full
// traversable rect: the LIVED camp (fires, tents, smithy, market, party ring)
// occupies the ~16x12 core the brief asks for, and the surrounding band is
// perimeter scrub, fence runs and boundary torches — so the rect the player
// can reach and the rect the camp occupies are the same rect. Deviation logged.
import { ARENA } from '../../core/constants.js';

// The camp's single warm centre. Everything else is placed relative to it.
export const HEARTH = Object.freeze({ x: 0, z: -0.2 });

// §18: "walk the Healer to the glowing run-portal / gate marker and press E".
// The gate stands on the north axis; PORTAL.radius is the interaction disc.
// Round D: 1.7 -> 1.9. The Healer's seat moved off the fire's axis (below),
// so the gate road now runs beside the hearth's stone ring; the wider disc
// keeps a 2.7 s straight walk from the seat landing on the sill with margin.
export const PORTAL = Object.freeze({ x: 0, z: -6.9, radius: 1.9 });

// Boot / return-from-run standing spots. The Healer is party_index 0 and takes
// the near (camera-side) seat so the boot frame reads as "your party, seen over
// your own shoulder"; the other three ring the fire.
export const CAMP_SPOTS = Object.freeze({
  // Round D (F3): the hearth is SOLID now, and the Healer's old seat
  // (0.1, 1.85) sat dead south of it — "walk north to the gate" ran straight
  // into the stone ring. The seat moves a step east of the gate road
  // (x 1.35 > ring 0.9 + body 0.3), so W from the seat passes the fire and
  // lands on the sill; the Swordsman shifts along the bench end to make room.
  healer: Object.freeze({ x: 1.35, z: 1.0, yaw: Math.PI }),
  tank: Object.freeze({ x: -1.95, z: 0.5, yaw: 1.9 }),
  swordsman: Object.freeze({ x: 2.3, z: 0.2, yaw: -1.9 }),
  // NOT on the fire's own screen axis: at (-0.2, -2.1) the Archer stood
  // directly behind the flame column from the 52-degree rig and was completely
  // occluded by it — measured on the first camp capture. Offset west.
  // Round D: nudged from (-2.5, -2.3) to sit at the END of the west bench
  // rather than inside its collider box (env/camp/colliders.js) — a seated
  // body that starts in a solid would be projected off its own seat.
  archer: Object.freeze({ x: -2.3, z: -2.5, yaw: 0.7 }),
});

export const CAMP_SPEC = Object.freeze({
  id: 'camp',
  name: 'camp',

  // --- Night ground (§18 "deep indigo/teal ambient"). The painter in
  // env/ground.js is hue-agnostic: feeding it an indigo base with a bluer
  // shade end and a WARM dirt track paints a night floor with the same
  // mottle/decal/grain machinery that keeps the Act-1 floor off the
  // reference-bar "dead ground" check.
  ground: Object.freeze({
    h: 196,
    s: 0.24,
    l: 0.25,
    shadeH: 206,
    shadeS: 0.34,
    shadeL: 0.135,
    // 12, not the 34 a first cut used: `coolLift` is a near-pure BLUE add
    // (rgb(3,7,lift)) and at 34 it rotated the whole night floor into the
    // analyzer's reserved violet band (h245-285) — 66.7k px of "corruption"
    // on ground that is supposed to read indigo-TEAL. The night now comes from
    // the light rig (scenes/camp.js CAMP_LIGHT), which is where night belongs.
    coolLift: 12,
    // The beaten camp track is the frame's only warm SURFACE away from the
    // fire, and it is what carries the eye from the gate to the hearth.
    dirtH: 34,
    dirtL: 0.17,
    mossN: 12,
    leafN: 150,
    crackN: 8,
    pebbleN: 130,
  }),

  // Two tracks, both through the fire: the gate road (N-S, the one the player
  // walks) and the camp road (E-W, market to smithy).
  paths: Object.freeze([
    { pts: [[0.1, -8.4], [0.0, -5.4], [-0.2, -2.6], [0.1, 0.6], [0.4, 3.4], [0.2, 8.4]], w: 1.55 },
    { pts: [[-12.6, 3.4], [-7.4, 2.4], [-2.6, 0.9], [2.4, 0.4], [7.6, -0.6], [12.6, -1.4]], w: 1.6 },
  ]),

  grass: 560,
  flowers: 46,

  // --- Act-1 prop reuse (src/env/props.js buildProps). Boundary torches and
  // two wall lanterns; NO braziers and NO monolith — §18: "Corruption never
  // touches Camp", and the camp's fires are the hearth and the forge.
  torches: Object.freeze([
    [-8.9, -7.15],
    [8.9, -7.15],
    [-11.2, 4.4],
    [11.2, 4.2],
  ]),
  // lightIdx EMPTY on purpose: real PointLights belong to the Hearth-Fire and
  // the forge (env/camp/hearth.js). §18 makes the hearth the camp's single
  // warm light source; the boundary torches carry flame + halo + pool only, so
  // nothing competes with the centre.
  lightIdx: Object.freeze([]),
  lanterns: Object.freeze([
    [-4.2, 7.25, 1.5708],
    [4.6, 7.25, 1.5708],
  ]),
  braziers: Object.freeze([]),
  monolith: null,

  // Perimeter scrub / stores, kept OUT of the lived camp core so a scattered
  // crate can never land inside an authored tent (the two placers do not share
  // a rejection table).
  clusters: Object.freeze([
    [-10.9, -6.6, 0.8, 'boulder boulder bush'],
    [-6.2, -7.35, 0.7, 'stump log bush'],
    [6.4, -7.35, 0.75, 'slab boulder bush'],
    [11.0, -6.4, 0.7, 'stump bush'],
    [-11.3, -2.4, 0.8, 'barrel barrel crate'],
    [-11.3, 1.0, 0.75, 'log stump bush'],
    [11.25, -2.6, 0.8, 'crate crate barrel'],
    [11.25, 1.4, 0.7, 'boulder bush'],
    [-9.6, 6.4, 0.85, 'fence fence stump'],
    [-6.4, 7.3, 0.7, 'crate barrel'],
    [-1.6, 7.35, 0.7, 'slab bush'],
    [1.8, 7.35, 0.7, 'log bush'],
    [7.4, 7.3, 0.9, 'fence fence crate'],
    [10.6, 6.4, 0.75, 'barrel barrel crate'],
    [-8.2, -4.6, 0.6, 'bush bush'],
    [8.4, -4.8, 0.6, 'bush stump'],
  ]),

  // --- The camp itself (env/camp/props.js). [type, x, z, yaw, scale]
  props: Object.freeze([
    // The centre.
    ['hearth', HEARTH.x, HEARTH.z, 0.3, 1],
    ['tripod', -1.45, -1.15, 0.6, 1],
    ['bench', -3.0, -1.7, 0.62, 1],
    ['bench', 3.05, -1.55, -0.62, 1],
    ['bench', 1.7, 2.65, -0.32, 1],
    ['woodpile', -2.65, 1.95, 0.4, 1],

    // Sleeping quarters — NW and NE of the fire, doors turned toward it.
    ['tent', -4.95, -3.35, 0.34, 1.05],
    ['tent', 4.85, -3.1, -0.36, 1.0],
    // Tent 3 sits NORTH of the west road (Round D2 camp critic F1: at z 1.5
    // its rotated footprint reached z 2.11 into the road band 1.4..3.0 and,
    // with the bedroll and forge, left a 0.18 u gap for a 0.60 u body — the
    // smithy road was a dead end). campRoadsClear() in colliders.js now
    // guards every path centreline against exactly this.
    ['tent', -7.5, -0.3, 1.42, 0.92],
    ['bedroll', -3.95, -2.15, 0.5, 1],
    ['bedroll', 5.75, -1.95, -0.55, 1],
    ['bedroll', -6.25, -0.6, 1.5, 1], // beside tent 3, clear of its east wall

    // Smithy — west. Forge + anvil + rack, the "glowing item" facing the fire.
    // Forge on the road's SOUTH verge only: north face >= road edge + body.
    ['forge', -6.75, 3.95, 0.36, 1],
    ['anvil', -5.5, 3.7, 0.5, 1],
    ['rack', -4.15, 4.35, -0.12, 1],

    // Market — east. Stall shell, sacks, and the cart parked behind it.
    ['stall', 6.35, 2.5, -0.38, 1],
    ['sack', 5.2, 3.3, 0.4, 1],
    ['sack', 5.62, 3.6, -0.5, 0.85],
    ['sack', 7.4, 3.5, 0.9, 0.92],
    ['cart', 8.35, -1.95, 0.42, 1], // parked on the road's south verge — the sweep found its bed straddling the centreline
    ['sack', -3.35, 4.55, 0.2, 0.95],

    // Lit posts: two flanking the gate road, two out at the working corners.
    ['lanternpole', -2.35, -4.45, 0.5, 1],
    ['lanternpole', 2.45, -4.5, -0.5, 1],
    ['lanternpole', 7.35, 1.1, 1.0, 1],
    ['lanternpole', -8.7, -1.5, -0.7, 1],

    // Colours flown over the camp's own ground.
    ['banner', -1.6, 5.5, 0.22, 1],
    ['banner', 4.0, 5.35, -0.26, 1],

    // The gate. The camp's ONE arcane object (§19.1 camp violet-arcane family),
    // flanked by two rune stones so it stands ON the ground, not in front of a
    // wall.
    ['portal', PORTAL.x, PORTAL.z, 0, 1],
    // +-2.15 (was +-1.95): the east stone sat on the Healer's new walk line.
    ['runestone', -2.15, -6.5, 0.34, 1],
    ['runestone', 2.15, -6.5, -0.34, 1],
  ]),
});

// Nothing in the camp may sit outside the traversable rect.
export function campBoundsOk() {
  for (const [, x, z] of CAMP_SPEC.props) {
    if (Math.abs(x) > ARENA.halfW - 0.4 || Math.abs(z) > ARENA.halfD - 0.4) return false;
  }
  return true;
}
